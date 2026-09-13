---
title: Plugin system
description: Pre-implementation contract for plugin boundaries, isolation, composition, capabilities, and lifecycle
category: extensibility
audience: plugin-author
document_type: specification
status: draft
website_publish: true
sidebar_order: 10
---

# Plugin system

> Status: pre-implementation architecture. This document records product
> direction, not shipped behavior. Items marked **Accepted direction** constrain
> later design work. Items marked **Candidate contract** still require an ADR,
> schema review, and implementation. **Open questions** are intentionally
> unresolved.

Bitty's extension system should be broad enough to build tabs, search,
Markdown rendering, diagnostics, AI tools, and custom workflows without making
the terminal emulator's compatibility depend on plugin load order or plugin
correctness.

Core-versus-plugin ownership is authoritative in
[Core / Plugin boundaries](../architecture/core-boundaries.md). The normative
trust posture is defined by the [security overview](../../../security/overview.md).
This document specializes those contracts for extension composition and must
not weaken them.

## Design principles

Status: **candidate contract.**

The plugin architecture is guided by six properties:

- **Isolation:** a plugin cannot silently mutate another plugin's runtime.
- **Determinism:** the same configuration and lock state produce the same
  resource graph, independent of incidental load timing.
- **Ownership:** every command, event handler, UI contribution, service, timer,
  and background task has a plugin and generation owner.
- **Composability:** extension points state whether contributions compose or
  require an exclusive provider.
- **Observability:** conflicts, resource use, failures, and ownership are
  inspectable.
- **Recoverability:** a failed or malicious plugin cannot make Bitty impossible
  to start in a minimal safe mode.

The governing boundary is:

> Plugins may alter presentation, but must not alter terminal truth.

Two candidate design rules sharpen the boundary between the Lua layer and the
host:

- **Lua decides policy and composition; Rust enforces capability and
  mechanism.** Plugins choose what should happen and compose host-provided
  services; the host decides whether it may happen and how it is bounded.
- **Semantic primitives are the extension ceiling.** Plugins compose
  host-provided semantic primitives and cannot create a primitive the host
  does not define, so a missing primitive is an upstream design task rather
  than a plugin-side workaround. Core owes plugins aggregated semantic hook
  points (for example a completed-command event with exit status) instead of
  raw per-byte or per-cell callbacks.

This is an architecture direction, not a claim that the APIs described below
exist.

## Terminal truth and presentation

Status: **accepted direction.**

PTY bytes, the VT parser, terminal state, grid contents, cursor, modes,
scrollback semantics, Unicode width, input encoding, IME behavior, font
shaping, graphics-protocol decoding, render synchronization, and security
policy are core-owned invariants.

Ordinary plugins must not be placed between the PTY and VT parser, and must not
receive APIs equivalent to:

```lua
-- Deliberately unsupported examples.
terminal.grid[3][10] = "A"
terminal.cursor.x = 20
terminal.mode.alt_screen = false
```

An unrestricted raw-output transform is also outside the ordinary plugin
contract. It can split a CSI sequence, corrupt UTF-8 or graphics payloads, and
desynchronize the terminal program's model from the emulator.

Instead, plugins contribute after terminal state has been produced:

```text
PTY -> VT parser -> Terminal State -> Presentation Model -> Scene -> Renderer
                                      ^
                                      |
                                   Plugins
```

The intended composition has three surfaces:

- `TerminalSurface`: the core-owned VT grid.
- `RichSurface`: rich blocks such as Markdown, images, tables, and diagnostics.
- `OverlaySurface`: transient UI such as a command palette, completion, search,
  or developer tools.

The renderer composes these surfaces; plugins do not rewrite the underlying
grid.

See [Rich content](../interfaces/rich-content.md) for semantic zones,
structured output, and streaming Markdown.

## Extension levels

Status: **candidate contract.**

Extension capabilities should be described in levels so that permission and
stability expectations are visible:

- **Level 1, Control:** commands, events, key suggestions, configuration, and
  notifications through the ordinary plugin API.
- **Level 2, UI:** panels, overlays, status components, popups, and rich blocks
  built from constrained UI primitives.
- **Level 3, Presentation:** decorations, annotations, semantic highlighting,
  and rich replacement that preserve terminal state.
- **Level 4, Protocol extension:** registered OSC/APC and structured-output
  handlers, gated by explicit capabilities and exclusive registration.

There is intentionally no public level for mutating terminal state. Internal
debug and test hooks, if any, are not a compatibility promise.

Direct access to `wgpu::Device`, `wgpu::Queue`, or textures is also out of the
initial plugin boundary. The core should first expose stable scene primitives
such as text, rectangles, images, transforms, clipping, layout, opacity,
selection, and scrolling. A custom render node or WASM render extension is a
later design question.

## Runtime isolation and lifecycle

Status: **accepted direction.**

Each runtime plugin executes in its own isolated Lua VM. The host constructs a
restricted standard library, denies ambient Lua/OS authority and native module
loading, and exposes privileged work only through capability-checked APIs.
CPU/instruction, memory, task, callback-time, and queue budgets are per-plugin,
attributable, and enforceable. A plugin failure is isolated and must not crash
the host.

Status: **accepted contract; first slice shipped.**

Exact VM creation, reuse, unload/reload lifecycle, service transport, state
migration, and cost optimizations are defined by the accepted
[Plugin Host Runtime RFC](../specifications/plugin-host-runtime-rfc.md)
(OQ-033/OQ-034/OQ-035, ratified through
[ADR 0010](../../../decisions/adrs/ADR-0010-plugin-host-runtime-acceptance.md)). The
first sliced implementation shipped in bitty PR #554 merge `e51b5cc`
(CTX-0328: bridge and VM lifecycle) and PR #558 merge `064b9de` (CTX-0329:
store staging and integrity verification); hardening and the reload/update
trigger contract remain follow-ups (bitty `CTX-0330`; OQ-072). A plugin may load
its own modules but not another plugin's private module tree.

Plugin-to-plugin collaboration goes through versioned services or other
host-mediated registries:

```lua
-- Candidate API shape only.
local git = ctx.services:get("git.repository", { version = ">=2" })
```

The candidate lifecycle gives every resource a `PluginId` and plugin generation.
Reloading disposes every resource owned by generation N before activating
generation N+1. The exact failed-plugin state and rollback behavior remain part
of that lifecycle design; they may not weaken failure isolation.

Status: **candidate contract.**

- Plugin IDs are globally unique, owner-qualified identifiers such as
  `xuepoo.markdown`.
- Plugin version, compatible Bitty application version, and compatible Plugin
  API version are separate fields.
- A static package manifest describes resources and lazy triggers before the
  Lua VM is created.
- Lazy plugins reserve their declared resources during graph construction, so
  conflicts cannot appear only after an event happens.

Illustrative manifest fragments:

```toml
# Candidate syntax; no manifest schema has been finalized.
[plugin]
id = "xuepoo.markdown"
name = "Bitty Markdown"
version = "0.9.0"

[compat]
bitty = ">=0.5,<1.0"
plugin-api = "^1.2"

[capabilities]
ui.rich = true
terminal.semantic-read = true
network = false
process.spawn = false
filesystem.write = false

[lazy]
commands = ["markdown.render"]
events = ["rich.markdown"]
```

The exact file name, key spelling, version grammar, and capability identifiers
remain candidate contract details.

## Namespaces, registration, and claims

Status: **candidate contract.**

No resource may use implicit "last loaded wins" behavior. Commands and other
uniquely named resources are qualified by plugin ownership, for example:

```text
core.view.split
bitty.tabs:new
xuepoo.markdown:toggle
```

Registration and claiming are distinct concepts:

- `register` adds a composable or uniquely named contribution.
- `claim` requests an extension point that permits only one provider.

Status: **candidate contract.**

- **Event handler:** many; ordering exists only where the event defines it.
- **Command:** unique qualified ID; duplicate IDs are rejected.
- **Key binding:** one effective binding per context and chord; ambiguity is
  diagnosed for user resolution.
- **Status component:** many; core layout composes them.
- **Tabline provider:** one; requires an exclusive claim.
- **Presentation decoration:** many; declared decoration rules compose them.
- **Presentation replacement:** one per target; ambiguity is an error.
- **Protocol handler:** one per protocol or type; requires a capability-gated
  exclusive claim.
- **Service:** interface-defined multiplicity; the resolver enforces provider
  and version rules.

A priority may order a resource only where that extension point defines
ordering. It must not become a universal conflict escape hatch.

Suggested key bindings are declarations, not forced runtime mutations. The
candidate precedence is:

```text
explicit user mapping
  > workspace mapping
  > first-party/default mapping
  > plugin suggestion
```

Workspace configuration remains subject to the trust restrictions described
in [Lua and XDG configuration](../configuration/lua-and-xdg.md).

## UI and presentation composition

Status: **candidate contract.**

Plugins mount into semantic slots managed by core layout instead of drawing at
arbitrary global coordinates:

```text
terminal | top | bottom | left | right | tabline | statusline | overlay
```

Presentation contributions should distinguish at least:

```rust
// Illustrative type, not implemented API.
enum PresentationContribution {
    Decoration(/* ... */),
    Annotation(/* ... */),
    Replacement(/* ... */),
    Overlay(/* ... */),
}
```

Decorations can often compose; replacements generally require one chosen
provider. The resolver should reject ambiguity or apply an explicit user
preference, never incidental plugin load order.

## Dependencies and services

Status: **accepted direction.**

Dependencies must be explicit. Plugins do not import another plugin's private
Lua implementation. A service dependency states an interface and compatible
version; failure to select a compatible provider is a resolver error before
runtime activation.

Package resolution, locking, install/update transactions, and source types are
covered by [Package management](package-management.md). The package manager and
runtime host are separate components with different responsibilities.

## Capabilities and security

Status: **accepted direction.**

Host access is granted by capability, with least privilege as the default.
Sensitive examples include:

- terminal semantic read access;
- rich UI creation;
- network access;
- process spawning;
- filesystem read/write;
- runtime-control or protocol registration.

Installing or enabling third-party code must expose requested capabilities.
The capability layer restricts host APIs; it must not be described as a
complete sandbox until platform-level containment has been designed and
verified. Native in-process plugins are outside the accepted security model.

Raw PTY access, protocol handling, terminal input injection, and runtime
management warrant separate high-risk permissions. Remote-control capability
boundaries must be shared with the CLI and IPC model described in
[CLI](../interfaces/cli.md).

## Performance and observability

Status: **accepted direction.**

Plugins must stay out of parser, renderer, and input hot paths. Event callbacks,
startup time, memory, background tasks, and event counts should still have
explicit budgets and be attributable to an owner.

Status: **candidate contract.**

Developer tools and `bitty plugin doctor` should surface:

- registered and claimed resources;
- key, UI-slot, service, dependency, and presentation conflicts;
- event-handler latency and startup cost;
- memory use and unbounded task warnings;
- plugin state, generation, last event, and last error;
- capability grants and compatibility status.

Specific warning thresholds such as an 8 ms event callback or 100 ms startup
are measurement candidates, not accepted budgets.

## Shell and TUI compatibility

Status: **candidate contract.**

Starship, Oh My Posh, Powerlevel10k, and similar tools are shell-prompt
producers. Their Unicode and ANSI/VT output should work without a Bitty-specific
plugin. Bitty owns terminal appearance; prompt tools own prompt appearance;
terminal plugins own declared extensions. None owns the others.

A terminal statusline (for example the bundled `bitty-terminal.statusline`) is
terminal-owned chrome in a terminal UI slot, a waybar-class bar; it is not a
shell prompt. A starship-class prompt is produced and rendered by the shell
inside the terminal grid. The two surfaces therefore do not substitute for one
another, and the terminal-side obligation is to render prompt output faithfully
(see the checklist below). Whether the statusline may later present
starship-class information is tracked as
[OQ-079](../../../decisions/open-questions.md), not decided here.

Shell integration must observe or chain shell lifecycle hooks instead of
overwriting `PROMPT_COMMAND` or another shell's equivalent. It should primarily
emit semantic metadata such as OSC 7 or OSC 133 and must not assume Bash, Unix,
or a particular prompt tool.

Full-screen TUIs are a particularly sensitive boundary. In alternate-screen
mode, rich presentation transforms should default off unless proven safe.
Overlays remain viable because they do not change grid geometry or the TUI's
cursor and mouse coordinate assumptions.

Compatibility coverage should eventually combine shells and prompt tools with
Unicode, Nerd Font glyphs, emoji, CJK paths, true color, multiline/right/
transient prompts, resizing, and long working directories. This is a test-plan
direction, not a statement of current coverage.

### Terminal-side checklist for starship-class prompts

The requirements below are what Bitty must provide so starship-class prompts
render correctly; they are not requirements on the prompt tools. Implementation
status is a scoped snapshot, not an M1 completion claim: **Shipped** means
named `bitty` implementation evidence exists, **Candidate** means the direction
or contract is recorded without dedicated acceptance evidence, **Open** means
no contract or implementation. Every Shipped row still owes the cross-platform
evidence and independent sign-off the
[Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md)
requires before milestone M1 can be declared complete.

| Requirement                                                   | Status           | Evidence and remaining gap                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| True color (24-bit SGR)                                       | Shipped          | 16/256/truecolor SGR is M1-required; `COLORTERM=truecolor` session default shipped (bitty CTX-0165, commit `8529b6b`, PR #272).                                                                                                                                                                                                                                      |
| Nerd Font and Powerline glyph fallback                        | Shipped          | Coverage-driven font fallback plus tofu for uncovered scalars (bitty CTX-0368, commit `828a787`, PR #612); tall powerline/Nerd glyph clipping fix (bitty CTX-0237, commit `308687d`, PR #413); documented monospace/Nerd fallback chain (bitty CTX-0157, commit `eb6fd43`, PR #296). Glyph coverage depends on installed fonts; there is no per-codepoint guarantee. |
| Wide and CJK cells                                            | Shipped          | Unicode/IME corpora with a width model (bitty CTX-0079, commit `26087d3`, PR #117); wide-aware reflow on narrow (bitty CTX-0266, commit `1330c31`, PR #441).                                                                                                                                                                                                         |
| Emoji and ZWJ sequences                                       | Candidate        | Emoji-ZWJ corpus cases exist (bitty CTX-0079); color-emoji bitmap rendering is deferred (bitty `DEC-0053`, monochrome alpha flatten via atlas), and platform emoji-tail font enumeration is not shipped.                                                                                                                                                             |
| Cursor placement and wrapping around multi-line/right prompts | Open             | Recorded here as a test-plan direction only; no dedicated acceptance evidence for cursor position or wrap behavior around multi-line/right prompts.                                                                                                                                                                                                                  |
| OSC 7/OSC 133 shell integration and prompt marks              | Shipped (opt-in) | First-party `bitty-terminal.shell-integration` plugin shipped (bitty CTX-0103, commit `34eae1c`, PR #161); `shell_prompt_marks` compat corpus (bitty CTX-0074, commit `22f7eee`, PR #111). The Compatibility Milestone RFC keeps OSC 7/133 an opt-in enhancement, never required, and forbids prompt-text heuristics.                                                |
| Prompt redraw performance                                     | Candidate        | General PB-1..PB-7 budgets and the `bitty-perf` latency harness exist; no prompt-redraw-specific benchmark or budget is recorded.                                                                                                                                                                                                                                    |
| Bracketed paste (mode 2004)                                   | Shipped          | M1-required; suspicious-paste inspection (bitty CTX-0091, commit `de134ec`, PR #136); visible multi-line paste confirmation (bitty CTX-0186, commit `826b1b5`, PR #290); honest LF/CR classification and discoverable paste confirm (bitty CTX-0369, commit `8e2f975`, PR #608).                                                                                     |
| Cursor shape/style (DECSCUSR)                                 | Shipped          | DECSCUSR cursor shapes (bitty CTX-0162, commit `6c7cf3e`, PR #293).                                                                                                                                                                                                                                                                                                  |

## Plugin author rules

Status: **accepted direction.**

Plugin authors must not:

- depend on plugin load order or overwrite another plugin's resources;
- inspect or mutate another plugin VM or configuration;
- modify terminal state, parse raw PTY bytes without a special capability, or
  access GPU internals directly;
- perform synchronous heavy work on terminal hot paths or start unbounded
  background work;
- assume Bash, Unix, a hard-coded `~/.config` path, one-cell glyph widths, or a
  one-to-one relationship between Unicode scalar values and cells;
- perform expensive network work during setup or depend on undocumented host
  APIs.

Cross-platform process creation and paths should use semantic host APIs so that
argument escaping, path resolution, and Windows/Unix differences stay in core.

## Risk ownership

The authoritative [security risk register](../../../security/risk-register.md) tracks
plugin authority, hot-path denial, Terminal Truth integrity, recovery, supply
chain, capability changes, native artifacts, and rich-content resource risks as
R-006 through R-009, R-015 through R-017, and R-021 through R-022.

This document additionally identifies ecosystem compatibility risks that need
future engineering plans: namespace collision, load-order dependence,
dependency and service-version conflicts, exclusive presentation or protocol
claims, stale resources after reload, Plugin API breakage, and cross-shell or
cross-platform assumptions. These remain open until their candidate contracts
receive ADRs and acceptance evidence.

## Open questions

- Which extension levels and scene primitives are stable enough for Plugin API
  version 1?
- Is one Lua VM per plugin sufficient isolation, or do some plugin classes need
  WASM or process isolation?
- What are the exact capability identifiers and grant persistence rules?
- Which presentation contributions compose, and how are decoration ordering and
  replacement ownership represented?
- What is the supported service-version model: one provider version, multiple
  side-by-side versions, or interface-specific policy?
- What restrictions apply in alternate-screen mode?
- What constitutes safe-mode startup, and which first-party components remain
  active?
- Which integrity guarantees—checksums, signatures, transparency, registry
  review—are required at each ecosystem stage?
