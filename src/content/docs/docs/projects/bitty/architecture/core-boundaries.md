---
title: Core and Plugin Boundaries
description: Specifies the ownership boundary between the Bitty core and plugins, including normative P0 security gates.
category: architecture
audience: plugin-author
document_type: specification
status: accepted
website_publish: true
sidebar_order: 21
---

# Core and Plugin Boundaries

## Document status

This document is `Accepted`. The project initiator has confirmed the
small-core and plugin-extension direction, the placement of most AI and Agent
experiences in plugins, and one independent repository per plugin. The
ownership tables and P0 gates below are `Accepted` via the Plugin Platform RFC
(OQ-011/012/013), Isolation Resource RFC (OQ-014), Rich Presentation RFC
(OQ-008/015/016), CLI Contract RFC (OQ-017), IPC and Agent RFC (OQ-018), and
Lua ADRs (OQ-030/031/032); tail crates (`bitty-rich`, `bitty-ipc`,
`bitty-agent`, `bitty-lua`) are `Implemented` but not yet `Verified`.
The `bitty-lua` tail crate keeps a generic-runtime boundary today; its current
`piccolo` 0.3.3 runtime is unchanged by the accepted successor direction
(Phodopus, recorded in
[ADR 0012](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0012-phodopus-runtime.md)).
The terminal-side host-ABI
[Phodopus Host ABI (Candidate)](../specifications/phodopus-host-abi-candidate.md)
stays a draft candidate, and the deferral of `bitty-lua` implementation work
changes nothing here.
“Core” and “Plugin” in the tables indicate accepted ownership with lifecycle
`Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`
per the [risk evidence RFC](../specifications/risk-evidence-rfc.md); risk
evidence matrix remains `pending`. The adopted workspace decomposition is fixed
in
[ADR 0003](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0003-core-workspace-topology.md)
and `bitty/Cargo.toml`; current crate counts, revisions, and milestone
evidence live in
[project-state.json](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/project-state.json),
which this document links to instead of duplicating. Tail crates are
`Implemented` but not yet `Verified` and do not imply shipped or
compatibility-guaranteed behavior.

Candidate decision rules, cross-cutting evolution rules, and the pending
decision list live in [Future Boundaries](future-boundaries.md) (`draft`) and
are not part of this accepted contract. A few bounded mechanism gaps inside
the extension-API composition below are labeled inline as requiring an RFC;
they do not change any ownership table and do not weaken any normative P0
gate.

## Accepted directions

- Keep the foundational terminal lightweight and add more capabilities through
  plugins.
- Keep AI, Agent panes, and related workflows primarily in plugins rather than
  fixed Core product paths.
- Give every plugin its own independent repository.

## Accepted boundary principles

- Core manages resources, state, invariants, and mechanisms. Plugins manage
  behavior, policy, and user experience (accepted via Plugin Platform RFC
  OQ-011/012/013).
- First-party and community plugins use the same API, capabilities, and
  lifecycle, with no private channel (Governance RFC OQ-024).
- The authoritative Plugin API v1 contract text lives in the `bitty-docs`
  corpus ([Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md),
  [ADR 0009](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md)). The
  `bitty` repository owns the implementation and parity evidence; the SDK is
  generated output and development support (Plugin Platform RFC).
- The debug protocol sits inside the core boundary. DevTools and MCP consume it
  from outside that boundary (DevTools RFC OQ-019; IPC/Agent RFC OQ-018).

## Normative security constraints

The authoritative security requirements are the
[Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md), the
[Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md), and the
[Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md). This page describes only
their effect on Core and Plugin ownership:

- Protocol correctness, Terminal Truth, rendering, input encoding, the PTY, and
  security policy cannot be delegated to Lua.
- Plugins cannot enter the terminal, render, or input hot paths and cannot
  receive ambient OS authority.
- Every trust transition must pass the applicable capability, policy,
  authenticated-scope, and resource-budget gates.
- MCP and Agent access is read-only by default. Terminal output is untrusted
  observation data, not instructions.
- Installation cannot execute package code, updates cannot silently elevate
  capabilities, and third-party plugin failure must preserve a safe startup
  path.

These are `Accepted` contracts, `Implemented` but not yet `Verified`
(`Implemented` for IPC/rich/resolver headless tests). A `Verified` claim
requires independent security-auditor and P0-AC acceptance evidence per the
[risk evidence RFC](../specifications/risk-evidence-rfc.md)
(`Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`).

## Accepted Core ownership

The table describes architecture ownership. It does not claim that every
capability or protocol belongs in the first milestone. Crate presence follows
[ADR 0003](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0003-core-workspace-topology.md)
and is `Implemented` but not yet `Verified`; `bitty-package`
lifecycle and integrity model is `Accepted` (OQ-021) with signatures
still draft, `bitty-lua` `Accepted` (OQ-009/030-032), and the tail crates
(`bitty-rich` OQ-008/015/016, `bitty-ipc`/`bitty-agent` OQ-018) are
`Implemented` (proposed contracts headless) and do not expand the accepted
topology until `Verified`. Current revision and milestone evidence lives in
[project-state.json](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/project-state.json).

| Domain               | Core mechanisms and invariants                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Process and terminal | PTY/ConPTY, process lifecycle, resize, signals, and I/O backpressure                                 |
| VT and state         | Parser, semantic actions, grid, cursor, modes, scrollback, damage, and replies                       |
| Text                 | UTF-8, graphemes, cell width, combining marks, fallback, bidi, shaping, and emoji                    |
| Protocols            | CSI/OSC/DCS/APC parsing, security limits, and compatible semantics for selected protocols            |
| Images               | Protocol adapters, `ImageStore`, `ImagePlacement`, resource limits, and scrolling/stacking semantics |
| Input                | Keyboard/mouse encoding, IME, focus, paste, and the keymap registry                                  |
| Presentation         | Scene/render snapshots, damage, renderer, glyph cache, and the software-fallback interface           |
| UI primitives        | View, `LayoutNode`, split, stack, overlay, focus, resize, and selection primitives                   |
| Platform             | Windows, clipboard primitives, DPI, monitors, notification primitives, and the open-URL gate         |
| Extension host       | Command, Event, Capability, plugin lifecycle, API version, and lazy triggers                         |
| Configuration        | Typed runtime configuration, validation, migration, and reload/reconcile semantics                   |
| Reliability          | Error isolation, resource quotas, traces, record/replay hooks, and debug instrumentation             |

Kitty Graphics, Sixel, iTerm2 images, Kitty keyboard, and OSC 7/8/52/133 belong
to the “if supported, Core must implement it correctly” category. The protocol
roadmap still determines their priorities.

Current implementation status (2026-09-16, `bitty` `origin/main` `e8dc9e5`):
the Kitty Graphics path is the only image protocol implemented end to end
(APC `G` intake, bounded PNG/RGB/RGBA decode, and placement in `bitty-rich`;
texture upload and blit in the `bitty-render` present path driven by
`bitty-runtime`); Sixel and iTerm2 inline images have no parser or decode
path, and `ImageSource::Sixel`/`ImageSource::Iterm2` are data-model variants
only. See the [Rich Presentation RFC](../specifications/rich-presentation-rfc.md)
decode/placement evidence and its recorded deviations.

## Accepted Plugin ownership

| Optional experience   | Policy owned by the plugin                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Tabs                  | Tab commands, tab line, ordering, key bindings, and closing policy                                     |
| Splits                | When to split, default direction, layout policy, and key bindings; the split primitive remains in Core |
| Search                | Search UI, navigation, and history policy using a controlled Terminal snapshot                         |
| Status line           | Presentation of cwd, modes, Git, tasks, and similar state                                              |
| Sessions / Workspaces | Saving, restoring, naming, and organizing user workflows                                               |
| SSH manager           | Host management and connection UX; PTY and transport security mechanisms remain in Core or a Service   |
| Shell enhancement     | Optional UX for prompt marks, jump-to-prompt, and command regions                                      |
| Project / Git         | Project discovery, status presentation, and command composition                                        |
| Quick/Quake terminal  | Window and presentation policy                                                                         |
| AI / Agent            | Provider integration, Agent panes, status, tasks, and context UX                                       |
| MCP client            | Consumption of external MCP services; the MCP adapter for Bitty debug is a separate tool               |
| Palette / picker      | Command palette, file picker, and optional UI                                                          |

The default distribution may bundle some of these plugins, but it cannot grant
first-party plugins additional authority through private APIs.

## Mechanism and policy examples

| Scenario          | Core mechanism                                       | Plugin policy                                               |
| ----------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| Split             | Create, close, resize, and focus `LayoutNode` values | Key bindings, direction, balancing policy, and tab/split UX |
| Notifications     | Platform notification primitive and security gate    | Which events notify, message text, and silence rules        |
| Clipboard         | Platform read/write primitives and OSC 52 policy     | History, formatting, and interaction UI                     |
| Shell integration | OSC 7/133 parser and semantic zones                  | Prompt navigation, status line, and command-history UX      |
| Images            | Protocol parsing, placement, and quotas              | Image browser, previews, and operation UI                   |
| Commands          | Registry, dispatch, permissions, and results         | Concrete workflows and composed commands                    |

## Extension API composition

### Command

The keyboard, menus, command palette, CLI, IPC, and plugins should trigger
behavior through the same Command Registry. Plugins register commands instead of
modifying internal managers.

Command lazy loading is a candidate approach. An unloaded plugin can first
register a command-to-loader mapping. The first invocation creates the plugin
runtime, completes registration, and then replays the command. Failure,
reentrancy, and cancellation semantics require an RFC.

### Event

Events must distinguish at least:

- **Observation events**: read-only notifications such as Terminal creation or
  closure, cwd or title changes, bells, focus, selection, process exit, and
  configuration reload.
- **Interception events**: events that can affect a user action, such as command
  execution, Terminal spawning, paste, and opening a URL.

Interception events must be rare, have timeout and failure policies, and exist
only on cold paths. Fine-grained hot-path events such as byte received, cell
changed, and glyph rendered cannot be exposed to Lua.

### Capability

Plugins cannot directly receive the filesystem, sockets, processes, clipboard,
PTY file descriptors, GPU objects, or window handles. They request capabilities
through host services. Before executing a plugin, its manifest completes
discovery, version checks, dependency resolution, and permission evaluation.

The [Capability families in the Security
Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md#capability-families) are normative. The Core
and Plugin boundary must distinguish at least:

- Terminal semantic read, raw read, self input, all-terminal input, and manage;
- UI rich presentation, overlay, and high-risk protocol registration;
- clipboard read and write;
- filesystem read and write constrained by explicit path patterns;
- fine-grained process, network, runtime, debug, and platform scopes.

Concrete identifiers, default permissions, the user authorization UX, and the
audit format still require an RFC. A generic write or allow-all permission that
does not distinguish target and effect cannot replace the required separation.

### Declarative UI

Plugins should submit declarative descriptions for text, rows, columns, lists,
popups, overlays, and status areas. They cannot create shaders, pipelines,
glyphs, or native windows directly. This keeps the renderer backend replaceable
and prevents the Plugin API from freezing the GPU implementation.

### Lifecycle

The candidate lifecycle model gives every plugin an owner and a generation.
Reload first cancels the old generation's commands, events, timers, tasks, and
UI, then loads a new generation. On failure, it should restore the previous
state or isolate the failure explicitly.

A separate Lua VM for every plugin, a restricted standard library, and
attributable resource budgets are normative P0 gates. They are `Implemented`
but not yet `Verified` until independent P0-AC audit per
[risk evidence RFC](../specifications/risk-evidence-rfc.md); queue budgets
follow the accepted Plugin Platform contract. VM creation cost, generation
reload, cross-plugin services, state migration, and budget-enforcement
mechanisms remain pending `Verified`. Current implementation evidence lives in
[project-state.json](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/project-state.json).

## Two security domains

The authoritative security contract requires separate models for Terminal
protocols and Plugin capabilities:

```text
remote/local process -> escape sequence -> TerminalSecurityPolicy -> local resource
Lua plugin           -> host API        -> PluginCapabilities     -> local resource
```

For example, a remote shell requesting the clipboard through OSC 52 and a Lua
plugin invoking the clipboard service have different origins, trust
relationships, and audit events. A single boolean switch cannot cover both merely
because they ultimately access the same clipboard.

The following controls are normative P0 gates, not optional research items:

- Clipboard reads and writes use separate policies. Under the normal policy, an
  OSC 52 read requires explicit consent.
- Protocol and image input has hard limits for payload, decoded pixels,
  dimensions, time, and aggregate storage.
- Image-file and shared-memory access is denied by default and passes through a
  controlled regular-file and path policy.
- Plugins use per-plugin VMs, restricted standard libraries, and budgets for CPU,
  instructions, memory, tasks, callbacks, and queues.
- Cross-boundary requests for URLs, notifications, filesystems, processes,
  networks, runtime, and debug carry an origin and a fine-grained capability.

RFCs decide thresholds, enforcement mechanisms, platform differences, and user
interaction only. Whether configuration scripts and runtime plugins share a
capability model remains open, but that decision cannot weaken the P0 gates
above.

## Boundary acceptance (lifecycle `Specified -> Accepted -> Implemented -> Verified`)

- Architecture tests inspect the crate dependency DAG and prevent lower layers
  from depending on higher layers (`Implemented`, pending `Verified`).
- The parser, Terminal state, and image decoder receive fuzzing as
  untrusted-input surfaces (headless soak `Implemented`, `Verified` pending).
- Recorded corpora and reference implementations support differential and replay
  tests (`Implemented`).
- The renderer consumes only a public snapshot or model and does not read
  Terminal private structures (`Implemented` via `bitty-render` snapshot).
- First-party plugins use only the public SDK. CI cannot allow a feature flag to
  bypass a capability (Governance RFC OQ-024).
- Debug consumers read state only through a versioned protocol and do not link
  application-private types (`Accepted` DevTools RFC OQ-019; `Implemented` but not yet `Verified`).

## Candidate evolution

Candidate decision rules, cross-cutting evolution rules, health signals, and
the pending decision list are tracked in [Future Boundaries](future-boundaries.md)
(`draft`). They refine this accepted contract without changing any ownership
table and without weakening any normative P0 gate.
