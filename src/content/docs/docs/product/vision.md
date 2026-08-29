---
title: Bitty Product Vision
description: Defines the accepted product direction, candidate principles, initial goals, non-goals, and open questions for Bitty.
category: product
audience: mixed
document_type: overview
status: accepted
website_publish: true
sidebar_order: 10
---

# Bitty Product Vision

## Document status

- Phase: directional baseline before product development begins
- Implementation status: product implementation has not started; this document
  does not claim that any capability is available
- Source: the [first eight rounds of discussion between the project initiator and
  the architecture advisor](https://chatgpt.com/share/6a8d7652-9de0-83e9-9a6b-bdc54ff2f7d6),
  reorganized into a maintainable form
- Review rule: changing an accepted direction requires an ADR or an explicit
  project decision; candidate approaches must not be cited as implementation
  commitments

This document uses three status labels:

- **Accepted direction**: the project initiator has explicitly proposed or
  selected it, so current planning must treat it as a constraint.
- **Candidate approach**: a recommended path from the discussion that still
  requires research, a prototype, an RFC, or an ADR.
- **Open question**: an area that does not yet have a sufficiently concrete
  design or acceptance criteria.

## One-sentence positioning

Bitty aims to be a small, programmable, cross-platform terminal platform. Its
core retains only the mechanisms required for a correct terminal, while plugins
compose most of the user experience and workflows.

Four statements summarize this design direction:

> Small core. Stable API. Everything composable. Extensions own the experience.

This is a project goal. It does not imply that a working terminal, stable API,
or plugin ecosystem exists today.

## Accepted directions

### Small core, plugin extensions

The accepted product direction is a lightweight foundation extended by plugins.
Starting a shell, displaying the terminal, scrolling, selection, copy and paste,
fonts, colors, and basic input are the candidate minimum set discussed so far.
Tabs, workspaces, status lines, project management, SSH management, and AI
assistants are candidate plugin experiences. The final default set still
requires requirements validation.

A small core does not mean that everything is a plugin. The discussion
recommends keeping correctness-critical capabilities such as VT parsing,
terminal state, the PTY, rendering, fonts, input encoding, security boundaries,
and the plugin host in the core. The exact list still requires an architecture
decision.

### Rust core, Lua plugins

The terminal core will use Rust. Plugin extensions and the primary configuration
language will use Lua to keep the extension barrier low and provide a plugin
development experience similar to Neovim.

The configuration evaluation model (declarative `ConfigPlan` pipeline with Rust
reconciliation) is accepted in
[Configuration Model RFC](../specifications/configuration-model-rfc.md)
(OQ-010, 2026-08-27). Whether to retain a static auxiliary entry point, which
Lua version and binding to use, and plugin VM isolation details still require
formal decisions. See the
[Technology and Dependency Strategy](../project/technology-strategy.md).

### Cross-platform is a product goal

Target platforms include Linux, macOS, Windows, and BSD. Windows is not an
afterthought; the platform boundary must model differences between Unix PTYs and
Windows ConPTY explicitly.

Being a target platform does not imply equal maturity on day one. Support tiers,
CI coverage, and fallback strategies are defined in
[ADR 0002 - Platform Support Tiers](../decisions/adrs/ADR-0002-platform-support-tiers.md).

### Agent-friendly, not Agent-centric

An accepted product constraint is that AI and Agent capabilities extend Bitty
through plugins rather than becoming the fixed center of the core product.
Structured state, commands, events, a debug protocol, replayable recordings, and
automation entry points are candidate architecture elements that support this
constraint.

The core must not bind itself to a model vendor, prompt system, or AI workflow.
AI assistants, Agent panes, CarryCtx integrations, and MCP clients should exist
as plugins or adapters and must not add core runtime cost when unused.

### Documentation first, with clear repository boundaries

The independent `bitty-docs` repository maintains architecture, requirements,
technical direction, RFCs, ADRs, and research records. The core, website,
developer tools, and plugins each have clear repository boundaries. The current
priority is documentation and engineering foundations; product code comes
later.

## Candidate product layers

| Layer               | Product role              | Responsibility                                                                         |
| ------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| Terminal runtime    | Reusable terminal runtime | PTY, VT, state, rendering, input, platform mechanisms, and stable extension boundaries |
| `bitty` application | Minimal terminal emulator | Startup, lifecycle, and the minimum usable default experience                          |
| Bitty ecosystem     | Composable ecosystem      | Official and community plugins, DevTools, MCP adapters, the website, and tools         |

An official distribution may bundle first-party plugins, but bundling does not
change their status as plugins. First-party and community plugins should use the
same API, permission model, and lifecycle so that first-party use continually
validates the completeness of the extension boundary.

## Candidate product principles

The following principles align with the accepted directions, but still require
RFCs or ADRs before they become formal constraints.

### Core manages mechanisms, plugins manage policy

The core manages resources, state, invariants, and foundational mechanisms.
Plugins manage behavioral policy and user experience. For example, the core can
provide split and layout primitives, while plugins decide tab presentation,
split key bindings, layout policy, and session persistence.

### Lua must not enter performance hot paths

The path from PTY output through terminal state, damage, and the renderer must
remain within a controlled native execution domain. Plugins may observe results
through side-channel events, but they cannot intercept every byte, cell, or
glyph.

### Compatibility and security precede extension convenience

A terminal processes untrusted byte streams from local and remote processes.
Protocol parsing, resource limits, clipboard operations, images, URLs,
notifications, and process capabilities require explicit security policies.
Plugin flexibility cannot bypass those boundaries.

### Observability is a first-class capability

The terminal, VT, PTY, renderer, fonts, images, input, plugins, and
configuration should all be inspectable through a stable debugging model.
DevTools, the CLI, and MCP should reuse the same debug protocol instead of
reading internal objects independently.

### Reference implementations support learning and validation

Projects such as Ghostty, Neovim, kitty, and WezTerm provide research snapshots
and sources for differential validation. Learning from them does not mean
copying their architecture, locking in their dependencies, or inheriting their
compatibility commitments.

## Candidate initial goals

The following goals are not yet scheduled on a formal roadmap.

- Define a testable terminal state model with replaceable frontends.
- Give Terminal, View, and Layout independent lifecycles.
- Establish extension contracts for Command, Event, Capability, and declarative
  UI.
- Support plugin-driven workflows without putting Lua in a hot path.
- Define explicit platform boundaries and support tiers for Linux, macOS,
  Windows, and BSD.
- Give recording, replay, inspection, and performance diagnostics an
  architectural place from the beginning.
- Make documentation, decisions, and implementation traceable across independent
  repositories.

## Non-goals

- Do not build a Warp-style AI product experience into the first phase.
- Do not turn every terminal protocol or operating-system capability into a Lua
  plugin.
- Do not rewrite all infrastructure merely to reduce the dependency count.
- Do not let third-party crate types leak into Bitty's stable API merely to
  produce a window quickly.
- Do not fork a large upstream project without benchmarks, compatibility tests,
  and a maintenance plan.
- Do not commit at the current documentation phase to `bittyd`, remote
  multi-client support, or a plugin registry.

## Experience vision

On default startup, users should get a fast, reliable terminal with predictable
resource use. After installing or enabling plugins, the same core can compose
into a development environment with tabs, splits, a status line, sessions,
projects, SSH, Git, or AI workflows.

Disabling a plugin should also remove its capability and resident resource cost.
Lazy loading, reclaimable lifecycles, and diagnosability are important parts of
this vision, but their exact designs still require RFCs.

## Open questions

- Which first-party plugins should the minimal distribution bundle by default?
- What are the startup-time, idle-memory, input-latency, and package-size targets
  for lightweight operation? (Accepted: [Performance Budget RFC](../specifications/performance-budget-rfc.md).)
- Should Bitty retain a static auxiliary entry point in addition to the primary
  Lua configuration? Configuration pipeline, layers, merge, reload, and
  project-trust mechanics are defined in
  [Configuration Model RFC](../specifications/configuration-model-rfc.md)
  (Accepted, OQ-010, 2026-08-27); static auxiliary entry point and overlay
  mechanics remain follow-up work.
- Which platforms belong in Tier 1, Tier 2, and Tier 3, and what is the explicit
  BSD scope? (Accepted: [ADR 0002 - Platform Support Tiers](../decisions/adrs/ADR-0002-platform-support-tiers.md).)
- Which VT, keyboard, image, and shell-integration protocols must the first
  compatibility milestone cover? (First-milestone set accepted:
  [Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md);
  image handling remains open.)
- Should DevTools and the debug protocol enter the first milestone, or follow
  stabilization of the terminal state model?
- Do a headless runtime, `bittyd`, detach and attach, and a remote UI belong on
  the long-term product roadmap?

See the [Architecture Overview](../architecture/overview.md) and
[Core and Plugin Boundaries](../architecture/core-boundaries.md) for the
corresponding boundaries.
