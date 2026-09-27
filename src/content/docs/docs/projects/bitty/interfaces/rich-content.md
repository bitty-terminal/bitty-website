---
title: Rich content and presentation interfaces
description: Candidate contract for terminal truth, rich blocks, semantic sources, and presentation composition
category: extensibility
audience: plugin-author
document_type: specification
status: draft
website_publish: true
sidebar_order: 30
---

# Rich content and presentation interfaces

> Status: candidate architecture. This document defines an accepted boundary
> and candidate interfaces; experimental code exists for parts of the image
> intake path, but no stable or supported API or protocol is claimed, and
> nothing here is `Verified` or `Compatible`.

Bitty should support streaming Markdown and other structured output without
rewriting PTY bytes or changing the VT grid that terminal applications depend
on.

## Accepted direction: preserve terminal truth

Terminal state is the canonical result of PTY input and VT protocol handling.
Presentation interprets that truth for the user but does not change it:

```text
Terminal State -> Presentation Model -> Scene Composer -> Renderer
                         ^
                         |
                  plugin contributions
```

This preserves raw text copying, terminal compatibility, recording/replay,
scrollback semantics, cursor geometry, and mouse coordinates.

Bitty should compose three conceptual surfaces:

- `TerminalSurface`: the ordinary VT grid;
- `RichSurface`: semantic blocks such as Markdown, images, JSON, tables, diffs,
  diagnostics, math, or tool-call output;
- `OverlaySurface`: popups, completion, search, command palette, and developer
  tools.

`RichBlock`, semantic zones, decorations, overlays, scene nodes, anchors, input
routing, layout, scrolling, and damage tracking are core mechanisms. Markdown,
AI, JSON, CSV, diagnostics, notebooks, and other semantics belong in plugins.

Bounded parsing and resource policy are normative in the
[security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md). Rich-content exhaustion and local
resource access remain open risks R-002, R-003, R-005, and R-021 in the
[security risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md).

## Rich content must have an explicit semantic source

Status: **accepted direction.**

Bitty must not infer Markdown or another rich format solely from screen text.
A line beginning with `#`, for example, is not reliable evidence of Markdown.
Grid heuristics become especially unsafe in editors, pagers, multiplexers, and
full-screen TUIs.

There are three candidate semantic sources, in preferred order:

1. A plugin owns the content source directly—for example, an AI plugin receives
   a Markdown token stream and creates a rich block without passing through the
   PTY.
2. An application emits ordinary terminal output plus a separate structured
   channel.
3. A later Bitty-specific terminal protocol marks rich regions inside a PTY
   stream, with feature detection and plain-text fallback.

The first source is the simplest initial integration. The second and third need
transport and security specifications before adoption.

## Candidate presentation model

The presentation model may include:

```text
TerminalGrid
Decorations
Overlays
SemanticRegions
SemanticZones
RichBlocks
Images
Widgets
Annotations
```

A rich block needs a stable semantic anchor rather than a raw pixel location.
Candidate anchors include a scrollback/grid line or a shell-integration command
zone:

```rust
// Illustrative type shape only.
pub struct RichBlock {
    id: BlockId,
    anchor: BlockAnchor,
    content: SceneNode,
    scroll_behavior: ScrollBehavior,
}
```

Anchoring must define behavior under scrollback pruning, resize, font and DPI
changes, reflow, and block-height changes.

## Semantic zones

Status: **candidate contract.**

Shell integration such as OSC 133 can identify prompt, input, command, and
output boundaries. Core may represent those boundaries as semantic zones:

```rust
// Illustrative enum, not an implemented API.
enum SemanticZoneKind {
    Prompt,
    Input,
    Command,
    Output,
}
```

A zone may retain raw terminal content and attach command metadata,
decorations, or a rich-block anchor. A plugin can then enhance output from a
known command without reinterpreting unrelated terminal contents.

Shell integration is an enhancement, not a compatibility dependency. Prompt
tools and shells must continue to work as ordinary terminal applications when
semantic metadata is absent.

## Streaming Markdown

Status: **candidate contract.**

Markdown rendering is a plugin semantic built on core rich-content primitives.
Streaming must be incremental:

```text
token stream
  -> incremental Markdown parse
  -> AST/layout diff
  -> changed scene nodes
  -> damage region
  -> render
```

Reparsing, relayout, and redrawing the entire document for every token is not an
acceptable target architecture.

Lua may coordinate lifecycle, configuration, and view creation. A performance-
sensitive parser may eventually run in a capability-scoped helper process or
sandboxed WASM module, never as an untrusted native in-process plugin. That
split is a candidate implementation strategy, not a decided plugin ABI.

An illustrative API might look like:

````lua
-- Candidate API only.
local markdown = require("bitty.markdown")
local view = markdown.create({ streaming = true })

view:append("## Hello\n")
view:append("```rust\n")
view:append("fn main() {}\n")
````

The stable primitive should be the rich block and scene contribution, not this
exact Lua module name or method set.

## Candidate structured-output channel

An application may keep normal terminal output on the PTY while sending typed
rich events over a separate channel:

```json
{
  "type": "markdown",
  "stream": "abc123",
  "data": "## Hello"
}
```

The conceptual flow is:

```text
Application -> PTY -----------------> TerminalSurface
            -> Structured transport -> handler registry -> RichSurface
```

Possible user-facing adapters include commands such as:

```sh
# Candidate grammar only.
my-command | bitty render markdown
bitty emit markdown README.md
```

Transport, framing, ordering, backpressure, authentication, and lifecycle are
open. These examples reserve no CLI namespace today.

## Candidate PTY protocol extension

A Bitty-specific OSC or APC protocol could mark a rich stream when no side
channel is available:

```text
OSC bitty;begin;markdown;id=123 ST
# Hello
OSC bitty;end;id=123 ST
```

This is a later-stage candidate only. It requires:

- capability discovery or negotiation;
- unambiguous framing and size limits;
- sanitization and permissions;
- behavior through SSH, tmux, and nested terminals;
- a useful plain-text fallback when unsupported.

An environment hint such as `BITTY=1` is not sufficient by itself to secure or
fully negotiate such a protocol.

## Composition and conflicts

Decorations, annotations, replacements, and overlays have different
composition rules. Several decorations may coexist; two plugins that request
exclusive replacement of the same region create a conflict that must be
diagnosed or resolved by explicit policy.

Presentation must not rely on the last plugin loaded. Ownership, conflict
handling, alternate-screen restrictions, and safe overlays are specified in
[Plugin system](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/plugin-system.md).

## Developer tools direction

A future rich-block inspector should expose, at minimum:

- block type and owner plugin/generation;
- semantic anchor and scroll behavior;
- current dimensions and layout nodes;
- semantic AST where provided by the plugin;
- render-node count, update cost, and last damage region;
- source zone/stream and active presentation conflicts.

This is an observability requirement for planning, not an implemented DevTools
feature.

## Implementation evidence (Kitty intake through present path)

Status: **experimental review evidence.** `bitty` `1fc6294` (CTX-0214,
PR #376, `crates/bitty-rich/src/kitty.rs`) merged an intake-only Kitty
graphics milestone: chunked `m=` transmissions assemble their exact bytes
under fail-closed admission (update: `bitty` #771, CTX-0467, unifies the
chunked per-transmission cap with the 4 KiB single-shot cap and replaces
chunked eviction with `Oversize`/`LedgerFull` failure), the single-shot path
keeps its historical truncation and is the only path that evicts by bounded
FIFO under a 320,000,000-byte (`320 * 1000 * 1000`, decimal)
stored-plus-in-flight ledger, and no decode, placement, animation, or
renderer coupling is included. The full intake semantics, bounds, and
deferred-rendering boundary are recorded in the
[Rich Presentation RFC](../specifications/rich-presentation-rfc.md).

Further merged milestones now extend that path beyond intake: bounded payload
decode for PNG/RGB/RGBA with fail-closed limits (`CTX-0247`), `APC G` parser
wiring and base64 unwrap (`CTX-0255`/`CTX-0256`), cursor-anchored placement
with CPU composite and per-pane origin binding (`CTX-0248`/`CTX-0254`), and
real-GPU texture upload and blit (`CTX-0291`), with live `chafa` kitty-format
pixel evidence. The exact pipeline, bounds, deviations, and deferred pieces
are recorded in the [Rich Presentation RFC](../specifications/rich-presentation-rfc.md)
decode/placement evidence subsections. This document otherwise remains a
candidate contract: nothing here becomes a stable or supported API by virtue
of those experimental milestones, and Sixel, iTerm2 inline images, animation,
and the structured transports below remain unimplemented.

Current model boundary (2026-09-16, `bitty` `origin/main` `e8dc9e5`):
`RichBlock` and `SceneNode` (`crates/bitty-rich/src/scene.rs`), plus the
fragment-to-`RichBlock` projection (`crates/bitty-rich/src/projection.rs`),
exist only as headless in-memory models in `bitty-rich`. No scene graph
reaches the grid or the GPU present path; `bitty-render` consumes cell
snapshots from `bitty-term-state` and drives the Kitty image texture upload
and blit path, and it has no `bitty-rich` dependency edge. The composition
described in this document therefore remains a design target rather than
wired behavior.

## Open questions

- What is the first stable `RichBlock` and `SceneNode` contract?
- Are rich blocks inline with scrollback, adjacent to command zones, or hosted
  in a parallel document model?
- How do selection, copy-as-raw-text, accessibility, search, and export operate
  across terminal and rich surfaces?
- Which anchor survives terminal reflow and scrollback truncation best?
- What backpressure and cancellation semantics apply to streaming blocks?
- Which structured transport should be attempted first?
- How are rich sources authenticated, especially over SSH or nested sessions?
- What transforms, if any, remain enabled for an alternate-screen TUI?
