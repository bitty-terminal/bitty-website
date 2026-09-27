---
title: Panel Runtime RFC
description: Accepted contract for the generic Panel container and host-mediated Event Bus reconciled with TerminalRegistry View and the Workspace Compositor
category: specifications
audience: maintainer
document_type: specification
status: accepted
website_publish: true
sidebar_order: 28
---

# Panel Runtime RFC

> Status: **accepted** on 2026-09-14 under docs `CTX-0181`
> (`bitty-terminal/bitty-terminal-docs` issue #14), promoting the
> [Panel Runtime and Event Bus Pre-Study](panel-runtime-pre-study.md)
> (CTX-0119, OQ-014 panel-platform follow-up) from research draft to an accepted
> contract. Acceptance records a reviewed contract; it does not describe
> implemented behavior, does not promote anything to **Verified** or
> **Compatible**, and does not resolve the pre-study's open questions, which
> remain tracked as [`RFC-OQ-1`](#open-questions) through
> [`RFC-OQ-9`](#open-questions). This RFC does not weaken any normative control
> in the [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
> [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
> [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md),
> or [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md).
> The lifecycle is `Draft -> experimental review evidence -> Accepted ->
Verified -> Compatible` (spec) and `Draft -> experimental review evidence ->
Accepted -> normative` (document); only `Accepted` or `normative` documents
> authorize shipped behavior. The pre-study is retained as historical research
> provenance and is superseded by this RFC.

## Purpose and scope

Bitty has an accepted single-owner lifecycle for terminals and views
(`TerminalRegistry` plus `Workspace -> LayoutTree -> View` with
`ViewId != TerminalId`) and an accepted tiling compositor with `H`/`V`
primitives, Core-owned decoration, and `LayoutProvider` plugins. This RFC is
the accepted contract for a generic application container called **Panel** that
the compositor can host without conflating identities, leaking PTY descriptors,
breaking focus routing, or weakening capability isolation, together with the
host-mediated inter-Panel **Event Bus**.

This document is a promotion, not a redesign: it re-states the pre-study's
candidate contract as an accepted one, keeps the same bounded values and
exclusions, and leaves every item the pre-study did not decide explicitly open
(see [Open questions](#open-questions)).

In scope:

- panel lifecycle (`PanelId`, creation, mount, suspend, resume, unmount,
  disposal, generation, reattachment versus recreation);
- command registry reuse for panel actions;
- overlay as a presentation-only modal, palette, or tooltip surface;
- focus routing among panels, views, terminals, and overlays;
- inter-panel Event Bus topic, payload, subscription, ordering, and isolation;
- capability isolation and budget attribution for panels and bus traffic.

Out of scope and owned elsewhere:

- VT parser, grid, cursor, mode, damage, and reply invariants (OQ-007,
  [Terminal State RFC](terminal-state-rfc.md));
- text segmentation, width, bidi, shaping, atlas, and DPI contracts
  ([Text and Rendering RFC](text-rendering-rfc.md), draft);
- image, scene, zone, and structured transport
  ([Rich Presentation RFC](rich-presentation-rfc.md));
- Platform adapter ownership and `winit` key and pointer normalization
  ([Input and Pointer Contract](input-pointer-rfc.md), draft);
- Plugin API v1, capability grammar, manifest, and three-level queue budgets
  (OQ-011/012/013, [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md));
- per-plugin VM, instruction, memory, task, and queue enforcement (OQ-014,
  [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md));
- IPC wire framing, discovery, auth, and per-connection rate limits RC-9/RC-10
  ([IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md));
- daemon, session persistence, and remote UI trust boundaries
  ([ADR 0008 - Headless](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md), post-v1.0).

## Relationship to accepted sources

| Area                 | Accepted fact (cite)                                                                                                                                                                                                                                                                 | How this RFC reconciles (accepted)                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topology             | One-way DAG, `Terminal -> Snapshot` only, 16-crate workspace per [ADR 0003](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0003-core-workspace-topology.md) (OQ-005)                                                                                 | Panel Runtime lives at the `bitty-runtime`/`bitty-ui` boundary without reversing DAG edges; `bitty-vt`/`bitty-term-state`/`bitty-pty` stay dependency-free                                                                                            |
| Terminal lifecycle   | `TerminalRegistry` as single owner of PTY handles, `TerminalId != ViewId`, `RuntimeId`/`PersistentId`/`Generation`, bounded `64`/`32`/`16`, single view per terminal per [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)                     | Panel uses `PanelId` as a fourth incompatible newtype, at most one panel host per panel, no panel holds a PTY fd, panel generation mirrors registry generation, and reuse of resize routing `cols = floor(rect.width / cell_width)` via `LogicalRect` |
| Workspace compositor | `Instance -> Window -> Workspace -> LayoutTree -> View` with `H`/`V` `ratio [0.1,0.9]`, Core-owned `gaps_in 6`/`gaps_out 6`/`border 2`/`radius 6`/`content_inset 6`, `LayoutProvider` pure deterministic `propose` per [Workspace Compositor Specification](workspace-compositor.md) | Panel extends `View` content (`Empty`, `Terminal(TerminalId)`, `Rich`, `Browser`, `Panel(PanelId)`) without adding a new tiling primitive; `LayoutTree` and decoration stay Core-owned; `LayoutProvider` never mutates panel state                    |
| Input                | Hot path `Platform -> Router -> focused View -> keymap -> encoder -> PTY` with no Lua per [Input and Pointer Contract](input-pointer-rfc.md) (draft)                                                                                                                                 | Focus routing for panels reuses the same router with `focused Panel` as an alternative routing target; overlay capture is presentation-only; no `input.pre-encode` plugin hook                                                                        |
| Plugin platform      | One VM per `(PluginId, generation)`, deny-by-default capabilities, observation versus interception, four interception points, `DropOldest` default per [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)   | Panel lifecycle follows the same generation rule; panel-contributed UI is declarative; the Event Bus reuses observation queues, not interception                                                                                                      |
| Isolation            | Per-subscription `64`, per-plugin `1024`/`256 KiB`, global `8192`/`2 MiB` with `DropOldest`, RC-1 `10^7`/`50 ms`/`8 ms`, RC-2 `32 MiB` per [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)                | Panel and bus budgets are sized to fit inside the same three-level envelope without borrowing                                                                                                                                                         |
| IPC                  | Bounded `256 KiB` frame, `512 KiB` in-flight, `64` pending, scopes per request per [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)                                                                                    | Cross-process bus, if ever needed, reuses the same framing and scope model, not a new TCP surface                                                                                                                                                     |

Where this RFC selects a threshold it refines those sources; it does not move a
requirement between owners and does not create a bypass.

## Normative sources this RFC does not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) (invariants 1-10, especially 3 presentation never Terminal Truth, 4 no hot-path Lua, 7 bounded inputs).
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) (T-01 parser wedge, T-06 plugin escape, T-07 starvation, T-09 IPC takeover, T-13 Terminal Truth).
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) and [Architecture Overview](../architecture/overview.md).
- [Terminal State RFC](terminal-state-rfc.md), [Rich Presentation RFC](rich-presentation-rfc.md), [Configuration Model RFC](configuration-model-rfc.md).
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md) (OQ-011/012/013) and [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md) (OQ-014).
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (OQ-018) and [ADR 0008 Headless](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md).

## Terminology

| Term            | Accepted meaning                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Panel`         | Generic workspace-managed application container hosted inside a `Window` via the compositor; not an OS window, not a PTY                    |
| `PanelId`       | Stable handle for a panel instance; distinct newtype from `ViewId` and `TerminalId`, never compared or transmuted                           |
| `PanelType`     | Closed v1 set contributed by a `PanelProvider` (for example `terminal`, `rich`, `browser`, `helper`, `canvas`), validated via manifest      |
| `PanelRuntime`  | Core-owned host that creates, mounts, suspends, resumes, and disposes panels, validates `PanelId` plus generation, and mediates bus traffic |
| `PanelProvider` | Plugin-supplied factory that declares one or more `PanelType` values; requires the `panel.provider` capability                              |
| `EventTopic`    | Qualified `owner.name:topic` identifier for inter-panel messages, for example `example.git:branch-changed`                                  |
| `Overlay`       | Ephemeral presentation surface (palette, modal, tooltip, candidate picker) owned by the compositor, not a tiling leaf                       |
| `Focus`         | Which `View` or `Panel` inside the active `Workspace` of the active `Window` owns keyboard, IME preedit, and wheel routing                  |

## Principles

1. `PanelId`, `ViewId`, `TerminalId`, `RuntimeId`, and `PersistentId` are pairwise
   incompatible newtypes; no integer alias and no cross-type comparison.
2. Ownership is single and explicit: the panel runtime owns panel lifecycle,
   the workspace owns layout and decoration, the registry owns terminals and PTY
   descriptors; no `View`, `LayoutTree`, `Panel`, or `LayoutProvider` holds a PTY
   file descriptor, GPU object, or OS window handle.
3. The hot path stays single-owner: `Platform -> Router -> focused View/Panel -> keymap/overlay -> encoder -> PTY`
   never blocks on a panel, a provider, or Lua.
4. Geometry flows one way: `LayoutTree` plus Core decoration produce `LogicalRect`
   per `View`; a terminal-backed panel converts that rect to PTY size via
   `cols = floor(rect.width / cell_width)`, `rows = floor(rect.height / cell_height)`
   clamped to `[1,1024]`; PTY size never decides view rectangle except via a
   validated commit.
5. Presentation never becomes Terminal Truth: panel surfaces, overlays, and bus
   payloads are presentation or coordination data and never mutate grid, cursor,
   modes, scrollback, or reply buffers except through the existing `Action` or
   scope-checked host path.
6. Every allocation is bounded before it happens: panel counts, topic counts,
   payload bytes, queue depths, and overlay counts are validated against
   `ConfigPlan` and fail with a typed error, never with unbounded growth or panic.
7. Failure is fail-closed and typed: a failed create, mount, resize, emit, or
   subscription leaves the previous valid state intact and increments a bounded
   diagnostic counter.

## Panel lifecycle

### Lifecycle model

Accepted state machine for one `PanelId` (Core-owned, host-mediated, not a
plugin-implemented `render` trait):

```text
Declared -> Created -> Mounted -> Focused -> Suspended -> Disposed
                         ^                      |
                         +--- resume  <---------+
Mount is attach to a View; suspend is becoming invisible (inactive workspace,
scratchpad hidden, zero-area, overlay occluded) without destroying attachment.
A panel never renders from inside the VT damage path.
```

Rules:

1. `PanelRuntime::create(type, options)` validates `PanelType` against the
   provider manifest, validates `max_panels_per_workspace`, allocates a fresh
   `(PanelId, Generation)`, and returns it without mounting. Validation is
   synchronous and fails with `TooManyPanels` or `UnknownPanelType` before
   any allocation is charged.
2. Mounting binds `PanelId` to a `ViewId` that is empty. Mount is the only
   way a view hosts a panel; a view with `Terminal(TerminalId)` must be
   detached before the same view can host a panel, preserving the single-owner
   mapping `PanelId -> ViewId` at most one-to-one.
3. Panels are addressed as `(PanelId, generation)` on every cross-component
   call; a stale generation returns `StaleHandle` before any grid or PTY access.
4. `PersistentId` semantics for panels, if ever adopted, must follow the
   terminal rule: scrollback persistence may rehydrate content, but a new
   `RuntimeId` is required for a new backing process; a remote shell must never
   set `PersistentId` via PTY output.
5. Generation exhaustion mirrors the registry: reaching `u64::MAX - 1024` makes
   the next panel allocation fail with `GenerationExhausted` and requires a
   process restart; wrapping is forbidden.

### Ownership and surface model

Illustrative shape only; final spelling belongs to `bitty-runtime` and
`bitty-ui`:

```rust
// Illustrative shapes only; not an implemented API.
struct PanelId(u64);
struct ViewId(u64);
struct TerminalId(u64);
struct Generation(u64);

enum PanelContent {
    Terminal(TerminalId),
    Rich(RichBlockId),
    Browser(BrowserSurfaceId),
    Helper(HelperHandle),
    Canvas(CanvasSurfaceId),
}
```

Accepted `Panel != Pty` invariant: `Panel` is a surface identity;
`TerminalPanel` wraps a `TerminalId` and PTY, but `CanvasPanel`, `FilePanel`,
`GraphPanel`, and `HelperProcessPanel` do not require a PTY. The compositor and
focus layers operate on `PanelId`/`ViewId`, never on `is_terminal` branching.

### Placement

All placement options preserve the accepted hierarchy
`Instance -> Window -> Workspace -> LayoutTree -> View`:

- Option A — Panel as typed `View` content: `ViewContent::Panel(PanelId)` as a
  fifth variant beside `Empty | Terminal | Rich | Browser`. Smallest change;
  `ViewId` remains the tiling leaf identity.
- Option B — Panel replaces `View` as `LayoutTree` leaf: `LayoutTree` leaves
  become `PanelId` directly. Larger churn; stronger typing for non-terminal
  surfaces but breaks the accepted `ViewId` generation history.
- Option C — Panel composes beside `View`: a separate `Panel` identity that
  attaches to a `View` side-car (`ViewId -> PanelId` map outside `ViewContent`).
  Preserves `View` while allowing panel metadata without widening `ViewContent`.

This RFC does **not** decide placement. Option A is the implementation shape
observed today and the research preference of the
[Workspace Compositor Specification](workspace-compositor.md) candidate Panel
model, but that model stays candidate until placement is accepted; the choice
and any `ViewId` versus `PanelId` migration is [`RFC-OQ-3`](#open-questions).
The [Panel Placement Decision](panel-placement-decision.md) records the
candidate direction that reconciles the three options — Panel as the visible
application identity, `View` as the internal attachment point, and
`ViewContent::Panel` retained as the transitional encoding — for review under
`CTX-0046`; it does not accept the contract or change any text above.

## Command registry

The command registry remains Core-owned and generation-aware per the accepted
[Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
and [CLI Contract RFC](cli-contract-rfc.md) direction:

1. Panels contribute commands as qualified names `owner.name:command`, for
   example `example.git:open`. Registration is manifest-declared and validated
   at graph construction; duplicates across providers are rejected, not shadowed.
2. Command dispatch is the only way a panel exposes invocable behavior; there
   is no direct hook into the compositor or terminal hot path.
3. Key-binding suggestions remain suggestions; the Rust keymap registry owns
   precedence (user > workspace > first-party > plugin suggestion) and chord
   conflict diagnostics.
4. Panel commands are dispatched through the existing `command.execute`
   interception point with its fail-open and veto-win semantics; no new
   interception point is introduced for commands.
5. Panel process or network actions reuse `process.spawn:CONSTRAINT` and
   `network.connect:DESTINATION` with destination policy; a panel command that
   needs them must hold the same capability as any other plugin command.

## Presentation modes

Mode is a runtime property of a panel, not a static panel kind. One `PanelId`
may move between modes (tiled to floating to fullscreen and back) without
recreation, and every mode shares identity, surface, focus, input, lifecycle,
and visibility handling while differing in layout strategy:

1. `tiled` is the default state: long-lived terminal, AI, Git, and file
   surfaces composed by the `LayoutTree`. Stable, predictable,
   keyboard-friendly, and persistable.
2. `floating` panels (help, settings, quick AI, pets, small tools) are real
   panels with lifecycle, focus, move, and resize; they never participate in
   tiled geometry.
3. `overlay` is an instantaneous interaction layer (command palette, flash
   jump, which-key, completion, search), never a focusable panel; overlay
   and floating must not be conflated even though both draw above tiles.
4. `fullscreen` temporarily maximizes one surface within its workspace.
5. `scratchpad` hides a tool per `Window` and recalls it with one binding,
   reusing the accepted `scratchpad.toggle` semantics from the
   [Workspace Compositor](workspace-compositor.md).
6. `pinned` fixes a panel to a workspace edge across layout changes.
7. `popover` attaches a small panel to one UI element.

Rules:

1. A provider suggests a mode (`preferred_mode`) at creation, but user panel
   rules decide: match on plugin, role, or panel id to set mode, size,
   anchor, and focusability, in the spirit of window-manager window rules.
   Rule precedence and schema remain [`RFC-OQ-9`](#open-questions).
2. Mode transitions route through the command registry as validated
   `LayoutTree` or compositor updates; no transition mutates terminal state
   or bypasses capability checks.
3. A non-focusable mode (for example a pet panel with `focusable = false`)
   never receives keyboard, IME, or wheel events under the focus routing
   below, but may still subscribe to observation bus topics.

## Layout options and workspace persistence

1. A scrolling layout option (in the spirit of niri) keeps each surface at
   a preferred width with `min_width`/`max_width` bounds and navigates by
   focus and scroll instead of shrinking every tile. It would arrive as a
   `LayoutProvider` proposal under the accepted compositor contract, with
   no Core primitive change.
2. Deterministic layout (tree plus workspace state determines every
   rectangle) makes workspace save and restore expressible as data: a named
   workspace serializes its `LayoutTree`, `ViewId` set, panel attachments,
   and modes, and restores them through the same validated commit path as
   live layout. Persistence format, versioning, and PTY reattachment rules
   remain [`RFC-OQ-9`](#open-questions); no persistence is claimed here.

## Overlay (4+1)

Overlay is a presentation-only ephemeral surface owned by the compositor:

1. Types under this contract: command palette, modal dialog, tooltip, IME
   candidate picker, notification toast, and panel-owned `ui.overlay` surfaces.
2. An overlay never mutates `Terminal` grid, scrollback, or `View` attachment;
   it is a declarative value with bounded text and bounds, composed after
   `LayoutTree` rectangle math.
3. At most one modal overlay per `Window` is active; a second request returns
   `OverlayBusy` and leaves the first in place. Non-modal overlays are bounded
   by `max_overlays_per_window`.
4. While an overlay is active the underlying view or panel retains its
   `ViewId`/`PanelId` but does not hold focus; focus belongs to the overlay
   until dismissal, then restores to the MRU view or panel per focus routing.
5. Overlay geometry is derived from the `Window` logical area, not from a
   panel rect; it never re-enters the `LogicalRect -> PTY` resize path and
   therefore never resizes a PTY via overlay bounds.

## Focus routing

Focus routing reuses the accepted TerminalRegistry focus model and the input
router contract:

1. Scope: focus is per `Window` and per active `Workspace` inside that window.
   Exactly zero or one `ViewId` or `PanelId` per active workspace is focused;
   zero occurs only when the window is unfocused, the workspace is empty, or
   the focused view or panel was just hidden or detached. The window regains
   focus by focusing the MRU view or panel in that workspace.
2. Routing: `Platform -> Router -> focused View/Panel -> keymap/overlay -> encoder -> PTY (if terminal-backed)`.
   Keyboard, IME preedit, and wheel routing read the same focused identifier;
   mouse hit testing uses `View` rectangles; keyboard and IME use focus
   regardless of pointer position.
3. Panel-backed terminals share the same terminal focus rule: a terminal that
   has enabled focus reporting `1004` receives synthesized `CSI I`/`CSI O` only
   when its hosting panel becomes newly focused, and no focus change mutates grid.
4. Detaching or hiding the focused view or panel moves focus to the next entry
   in MRU order inside the same workspace before the detach commits; destroying
   the focused entry does the same. If the workspace has no other target, focus
   becomes `None` and keyboard input increments a `no_focus` counter rather than
   routing to a stale target.
5. A non-focused panel never receives keyboard, IME, or wheel events; side-channel
   observation of a panel's content runs only through the bounded Event Bus or
   snapshot path, not through background focus.
6. The hot path remains Lua-free: no panel, provider, or bus subscriber is
   consulted per keystroke. Plugins observe focus changes only via the
   cold-path `focus.changed` observation event with its existing queue budgets.

## Event Bus

The bus is a host-mediated, typed, bounded decoupling surface between panels,
workspaces, and plugins. It is not a direct panel reference, not a renderer
channel, and not an IPC TCP surface.

### Topic and payload model

1. Topics are qualified `owner.name:topic` strings matching
   `^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*:[a-z][a-z0-9_.-]*$`, bounded to `<= 64`
   bytes, validated at declaration and at publish. Bare `file.open` without
   an owner prefix is invalid and fails with `UnknownTopic`.
2. Topics are manifest-declared: a provider or panel subscribes only to topics
   it listed in its manifest (`events` or `bus_topics`). Subscribing to an
   undeclared topic is a registration error, identical to the Plugin Platform
   `events.subscribe` rule.
3. Payloads are immutable JSON-compatible values plus binary-safe bytes, bounded
   to `EVENT_MAX_BYTES = 8 KiB` (`BoundedText` strict), batch-capped to `32`
   events or `8 KiB` aggregate per wakeup, whichever is smaller. Oversize
   payloads are rejected with `PayloadTooLarge` before any queue entry is made.
4. Payloads carry no ambient authority: a topic that signals `file.open` carries
   a validated path, not a pre-authorized file descriptor; a `cwd-changed`
   notification carries bounded display data, not a host handle.
5. `PanelRuntime` is the only producer that can emit Core-owned topics such as
   `bitty.panel:mounted` or `bitty.panel:focused`; a non-Core topic that
   impersonates `bitty.*` fails validation.

Illustrative shape only:

```lua
-- Candidate shape only; not an implemented API.
-- Manifest-declared topics; payloads are typed, bounded, immutable.
bitty.bus.emit("example.files:file.open", { path = "src/main.rs" })

bitty.bus.on("example.files:file.open", function(event)
  bitty.commands.invoke("example.editor:open", event.path)
end)
```

### Queue, batching, ordering, and drop

Reuses the accepted three-level envelope from OQ-014:

| Level                | Accepted default for bus traffic                                                                                                                                                    | Enforcement point                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| PerSubscription      | `64` events per `(PanelId, topic)` or `(PluginId, topic)` queue, strict FIFO at `EventQueue::push`                                                                                  | Bus subscription queue               |
| PerPanel / PerPlugin | `1024` events / `256 KiB` aggregate per panel or plugin, enforced at bus publish with `DropOldest` (v1 default)                                                                     | PanelRuntime / EventPipeline publish |
| Global               | `8192` events / `2 MiB` aggregate across all bus traffic, hard-gated at host admission via `would_exceed_global_limits` + `evict_oldest_globally`, strict `invariant_global_bounds` | Host admission                       |

Rules:

1. Coalescing: topics declared coalescable (`file.open` latest-wins, `cwd-changed`,
   focus, selection) collapse to the latest value when the queue holds undelivered
   copies; non-coalescable topics (`panel.created`, `panel.closed`, `bell`)
   preserve one-by-one FIFO delivery up to the bound.
2. Ordering: FIFO within one queue, no ordering across panels or topics, no
   ordering between observation delivery and unrelated user actions.
3. Drop policy: the panel bus reuses the single authoritative choice from the
   accepted pipeline: `DropOldest` as the v1 default (consumer converges to
   latest state) with `DropNewest` as a documented alternative; both count drops
   per queue, attribute to the owning panel or plugin, and report via
   `bitty plugin doctor` diagnostics. Silent loss is not permitted.
4. No hot-path bus: `byte-received`, `cell-changed`, `damage`, and per-frame
   render events are not expressible as bus topics, preserving T-07 callback-storm
   exclusion at the type level.

### Capability isolation for the bus

1. Emitting on a topic requires the emitter's manifest to have declared that
   topic as produced, and the subscriber's manifest to have declared it as
   consumed. Undeclared produce/consume is denied with `UndisclosedTopic`.
2. High-value topics (for example `terminal.raw-read`, `clipboard.read`,
   `process.spawn`-adjacent signals) inherit the same high-risk consent surface
   as their capability family; a bus topic that carries raw PTY bytes or
   clipboard content must be flagged high-risk and cannot be granted implicitly.
3. Bus access is scope-separated per client principal: the pair
   `(authenticated UID, AgentId)` or `(PluginId, generation)` or
   `(PanelId, generation)` has its own ledger; a scope granted to an Agent does
   not augment a plugin's bus subscription and vice versa.
4. A bus topic never escapes a Window without an explicit cross-window or
   cross-process transport RFC; the v1 scope is single-process, single-window
   only. Bridging to IPC framing reuses the accepted `256 KiB` frame, `512 KiB`
   in-flight, depth `32`, RC-9/RC-10 quotas, and per-request scope evaluation
   without creating a new TCP surface.

## Capability isolation

1. Closed families: panel capabilities close under a dedicated `panel.*` family
   `panel.provider`, `panel.create`, `panel.focus`, `panel.overlay`. Plugins
   cannot invent families; a `PanelType` contributed without the matching
   `panel.*` grant fails at registration.
2. `LayoutProvider` retains `layout.provider`, `Browser` retains `browser.embed`,
   `Rich` retains `ui.rich`, and `ui.overlay` gates palette/modal surfaces;
   `panel.*` does not subsume those gates and does not grant them implicitly.
3. Official and bundled panels pass through the identical capability model; no
   private channel and no first-party bypass.
4. Bus topics reuse the topic-declared capability rule above: subscribing to
   `example.git:branch-changed` needs at least a workspace-observation scope,
   while subscribing to a topic that carries clipboard or raw-terminal bytes
   needs that specific family; capability checks are synchronous and
   transactional (leave no partial state on denial).
5. Per-panel resource dimensions are owned by `(PanelId, generation)` with
   attribution and observable accounting; per-plugin dimensions remain
   `(PluginId, generation)` per OQ-014.

## Architectural placement

```text
Instance (InstanceId)
  +-- Window (WindowId)  [native OS window, bitty-platform]
        +-- Workspace (WorkspaceId)  [tiling compositor, active per Window]
              +-- LayoutTree { H | V | View(ViewId) }  [Core-owned, H/V only]
                    +-- View (ViewId) -> content { Terminal(TerminalId) | Rich | Browser | Panel(PanelId) }
                    +-- Overlay (per Window, not a LayoutTree leaf, bounded)
        +-- PanelRuntime (per Window, host-mediated)
              +-- panels: Map<PanelId, Panel>
              +-- topics: Set<EventTopic>
              +-- EventBus: Host-admission, three-level queues, DropOldest
              +-- Command contributions: qualified names, manifest-declared
```

Rules:

1. `PanelRuntime` owns panel creation, mount, suspend, resume, and disposal and
   holds no PTY fd, GPU object, or OS handle; those remain with `bitty-pty`,
   `bitty-render`, and `bitty-platform`.
2. `Workspace` owns `LayoutTree` composition and decoration; `PanelRuntime`
   never mutates `gaps_in`/`gaps_out`/`border`/`radius` and never holds a
   mutable `Workspace` handle inside `PanelProvider::propose`.
3. `LayoutProvider::propose` remains a pure function of `WorkspaceSnapshot`,
   `ViewId` set, and `LogicalRect`; a panel proposal that carries decoration
   or mutates layout outside the tree is rejected.
4. The bus is in-process first; cross-process routing, if ever adopted, goes
   through the accepted IPC transport with peer-credential auth and per-request
   scope evaluation, not through a new ambient channel.

The `Panel(PanelId)` content variant shown above is the current implementation
shape (see [Implementation status](#implementation-status)); placing it in the
accepted hierarchy is still [`RFC-OQ-3`](#open-questions). The accepted
`ViewId` generation, focus, visibility, and scratchpad semantics apply to a
panel host unchanged. The candidate resolution of that open question is
recorded in the [Panel Placement Decision](panel-placement-decision.md).

## Identity: PanelId distinct

```rust
// Illustrative shapes only; not an implemented API.
struct PanelId(u64);
struct ViewId(u64);
struct TerminalId(u64);
struct Generation(u64);
struct EventTopic(BoundedString<64>);
```

Rules:

1. `PanelId`, `ViewId`, `TerminalId`, `RuntimeId`, `PersistentId`, and
   `Generation` are distinct types; no function accepts one where another is
   expected and no `From` bridge exists.
2. A `PanelId` is created with a fresh `(PanelId, Generation)`. Numeric reuse
   after disposal requires a generation bump so stale `(PanelId, generation)`
   handles are detectable.
3. Handles travel as `(id, generation)` pairs on every cross-component call; a
   call with a stale generation is rejected with `StaleHandle` before any
   state access, mirroring the registry and view rule.

## Bounded resources

All ceilings are accepted defaults parameterized for harness coverage. Changing
a value requires a reviewed RFC revision, never silent drift. Floors are
enforced; unknown or out-of-range budget keys fail validation closed per the
isolation `ceiling-is-upward-only` and attribution rules. Values are chosen to
fit inside the accepted three-level envelope (PerSub `64`, PerPlugin `1024`/`256 KiB`,
Global `8192`/`2 MiB`, `BoundedText` `8 KiB`, `drain_batch` `32`/`8 KiB`, RC-1/RC-2)
without introducing a new global budget family.

| ID    | Dimension                         | Accepted default                                     | Applies to             | Validation point                      | Failure                                                     |
| ----- | --------------------------------- | ---------------------------------------------------- | ---------------------- | ------------------------------------- | ----------------------------------------------------------- |
| PR-1  | Panels per workspace              | `[1, 32]`, default `16`                              | per workspace          | `PanelRuntime::create` + `ConfigPlan` | `TooManyPanels`                                             |
| PR-2  | Panels per window                 | `[1, 64]`, default `32` aggregate                    | per window             | admission before mount                | `TooManyPanels`                                             |
| PR-3  | Event topics total                | `<= 256` distinct topics per process                 | process                | manifest validation                   | `TooManyTopics`                                             |
| PR-4  | Subscriptions per panel or plugin | `<= 32` topics                                       | per panel or plugin    | registration                          | `TooManySubscriptions`                                      |
| PR-5  | Event payload                     | `<= 8 KiB` per event (`BoundedText` strict)          | per publish            | host admission                        | `PayloadTooLarge`                                           |
| PR-6  | Batch per wakeup                  | `<= 32` events or `<= 8 KiB` aggregate, smaller wins | per queue drain        | `drain_batch` strict                  | Coalesce or drop oldest per drop policy                     |
| PR-7  | Per-subscription queue            | `64` events strict FIFO at `EventQueue::push`        | per `(PanelId, topic)` | enqueue                               | `DropOldest` or `DropNewest` per policy, counted            |
| PR-8  | Per-panel or per-plugin queue     | `1024` events / `256 KiB` at publish                 | per panel or plugin    | `EventPipeline::publish`              | same drop policy, attributed                                |
| PR-9  | Global bus queue                  | `8192` events / `2 MiB` hard-gated at host admission | global                 | `would_exceed_global_limits`          | oldest evicted or refused, `invariant_global_bounds` strict |
| PR-10 | Overlay count per window          | `<= 4` active overlays plus `1` modal                | per window             | compositor commit                     | `OverlayBusy` / `TooManyOverlays`                           |
| PR-11 | Overlay text and tooltip          | `<= 128` chars text, `<= 256` tooltip, bounded       | per overlay            | composition                           | Truncate with `truncated` flag                              |
| PR-12 | Command contributions per panel   | `<= 32` commands per panel type                      | per type               | manifest validation                   | `TooManyCommands`                                           |

Notes:

- PR-7/PR-8/PR-9 intentionally mirror the accepted `PerSubscription`/`PerPlugin`/`Global`
  ceilings so an implementation tests bus traffic with the same harness as
  plugin events; no new budget family is introduced.
- Aggregate plugin plus panel bus traffic shares the same global `8192`/`2 MiB`
  envelope; a panel burst that would exceed it is the same global-limit event
  as a plugin burst, not a second independent ceiling.
- Panel surface memory beyond queues (helper handles, canvas bitmaps) is
  accounted under RC-2 `32 MiB` per backing VM or helper budget and RC-3 `512 MiB`
  aggregate; this RFC does not introduce a new heap ceiling.

## Failure semantics

All operations return a typed panel or bus error and leave the previous valid
state intact. No operation panics and no operation partially commits.

| Error                  | When                                        | Diagnostic                               | Recovery                                          |
| ---------------------- | ------------------------------------------- | ---------------------------------------- | ------------------------------------------------- |
| `TooManyPanels`        | `create` would exceed PR-1 or PR-2          | bound and current count                  | Close a panel or raise the bound via `ConfigPlan` |
| `TooManyTopics`        | Manifest declares more than PR-3 topics     | count and bound                          | Remove or merge topics                            |
| `TooManySubscriptions` | Panel or plugin would exceed PR-4           | panel or plugin id, count                | Unsubscribe or split the consumer                 |
| `PayloadTooLarge`      | `emit` payload exceeds PR-5 or depth `32`   | bytes, depth                             | Truncate or chunk the producer                    |
| `UnknownPanelType`     | `PanelType` not in provider manifest        | type string, provider id                 | Register the provider first                       |
| `UnknownTopic`         | Topic string fails grammar or not declared  | topic string, grammar                    | Declare the topic in the manifest                 |
| `UndisclosedTopic`     | Produce or consume not declared             | topic, direction                         | Add the topic to the produce or consume list      |
| `AlreadyMounted`       | `ViewId` already hosts a panel or terminal  | `view_id`, existing content              | Detach first or use `replace`                     |
| `PanelAlreadyMounted`  | `PanelId` already mounted elsewhere         | `panel_id`, current view                 | Detach or move atomically                         |
| `StaleHandle`          | Generation mismatch                         | expected and found generations, both ids | Re-resolve the handle                             |
| `OverlayBusy`          | Modal already active                        | window id                                | Dismiss the active modal first                    |
| `TooManyOverlays`      | Would exceed PR-10                          | count and bound                          | Close a non-modal overlay                         |
| `GenerationExhausted`  | Within `1024` of `u64::MAX`                 | current generation                       | Restart the process; no wrap                      |
| `ResourceExhausted`    | Backing helper or surface allocation failed | platform error, no fd leaked             | Retry or report; runtime remains valid            |
| `CapabilityDenied`     | Missing `panel.*` or topic capability       | owning id, required capability           | Grant the capability or narrow the request        |

Every error increments a bounded diagnostic counter `panel.errors.<variant>` or
`bus.errors.<variant>` and is available via the debug protocol. Error strings
and counters are bounded and never echo unbounded panel or bus payloads.

Containment and attribution rules:

- FS-P1 Transactional denial: a refused capability, budget, or scope leaves no
  partial state — no allocation charged, no queue entry, no registration.
- FS-P2 Containment: a fault affects only the owning `PanelId` or `PluginId`
  generation; the host process survives and sibling panels and terminals stay
  responsive.
- FS-P3 Attribution: every enforcement action emits owner, generation, dimension,
  observed value, limit, and action. Unattributed enforcement is a bug.
- FS-P4 Reclaim: after panel disposal, panel-owned queues, tasks, timers, and
  handles are released and verified against the pre-creation baseline within the
  PB-3 reclaim tolerance; retained-by-design state is declared in the manifest.
- FS-P5 Fail-closed machinery: if the budget or bus machinery cannot start or is
  detected disabled, panels that require it refuse to load rather than running
  unbounded.

## Explicit exclusions (not authorized)

The following remain explicitly out of scope and are not authorized as shipped,
stable, or compatibility-guaranteed behavior by this RFC. Each requires its own
RFC or ADR with independent architecture, security, and performance review
before it can be claimed.

| Excluded                                                                                       | Why deferred                                                                                                                                                                             | What this RFC does instead                                                                                                          |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Daemon `bittyd` and session persistence across reboots                                         | Post-v1.0 per [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md); trust boundary not reviewed here                              | Process-scoped runtime only; persistence is at most `PersistentId` scrollback rehydration per terminal rules                        |
| Remote UI and cross-host transport                                                             | New trust boundary with cross-machine auth (`mTLS` or SSH tunnel) not evaluated                                                                                                          | No remote wire format, no network port, no remote capability mapping                                                                |
| Multi-window as global server                                                                  | Window stays native OS object per [Workspace Compositor](workspace-compositor.md); orchestrating many windows adds focus, DPI, and lifetime questions                                    | One `Instance` owns `Window`s; panel work is single-window first; cross-window topics deferred                                      |
| WASM or helper-process strong isolation for panels                                             | Native in-process plugins remain rejected per [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md); WASM/helper design needs its own RFC | In-process Lua VM isolation per OQ-014 remains the only in-process boundary; helper-process reuse is candidate only via IPC framing |
| Browser embed per-window process budget beyond isolation ceilings                              | `browser.embed` is high-risk capability plus `Browser` view type already requires dedicated isolation                                                                                    | Panels that need a browser surface reuse `browser.embed` gate and existing RC-3 aggregate; no new process-budget ceiling here       |
| Panel distribution preset or marketplace ownership (`bitty-dev`, `LazyBitty`, `awesome-bitty`) | Owned by [Default Distribution RFC](default-distribution-rfc.md) and future panel distribution RFC                                                                                       | Presets are configuration composition, not a new bundled-enabled set                                                                |
| New global file, network, or process ambient for Lua                                           | Violates [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) invariant 2                                                               | Panels obtain those only via explicit `fs.*`/`network.*`/`process.spawn:CONSTRAINT` capabilities                                    |
| New hot-path `input.pre-encode` interception point                                             | Would put Lua on the hot path per [Input and Pointer Contract](input-pointer-rfc.md)                                                                                                     | Panels observe via commands and `focus.changed` observation only                                                                    |

Claiming any excluded behavior by citing this RFC is a documentation hygiene
violation. Cross-document references must preserve the deferred status.

## Security review

This RFC creates no ambient authority and does not weaken any P0 gate:

1. PTY file descriptors, GPU objects, and OS window handles remain with
   `bitty-pty`, `bitty-render`, and `bitty-platform`; no view, panel,
   `LayoutTree`, `PanelProvider`, or bus subscriber receives them.
2. `PanelId`, `ViewId`, and `TerminalId` remain distinct newtypes; a confused-deputy
   where a `Terminal` operation is misdirected at a `Panel` is prevented at the
   type level and by generation checks.
3. Decoration (`gaps_in`, `gaps_out`, `border`, `radius`) is validated in
   `ConfigPlan` and owned by the compositor; no provider or panel sets it at
   runtime and any bus payload that carries it is rejected.
4. Bus topics cannot grant capabilities: a topic that signals an action does not
   imply the scope to perform that action; the host validates capability per
   subscriber action, not per message receipt.
5. The existing IPC framing bounds, current-user transport, peer-credential
   checks, per-request scope evaluation, and RC-9/RC-10 quotas remain the
   security baseline for any future cross-process bus; this RFC does not
   introduce a TCP listener or an ambient bearer token.
6. Host responsiveness during panel or bus bursts is bounded by the same invariant
   used for isolation: input-to-render p99 within the PB-4 tail budget while
   under burst.

All controls above are accepted contract but remain unverified until the
implementing tasks deliver focused tests, fuzz corpora, and independent
security-auditor review per
[P0 Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md) and the
[Risk Evidence RFC](risk-evidence-rfc.md).

## Reconciliation with TerminalRegistry View and Workspace Compositor

Accepted contracts remain authoritative; this RFC sits on them without
revising them:

- **Hierarchy**: `Instance -> Window -> Workspace -> LayoutTree -> View` stays
  authoritative per [Workspace Compositor](workspace-compositor.md). Panel is a
  candidate `ViewContent` variant, not a second tiling primitive. The
  compositor's candidate Panel model and the `ViewContent` spelling remain
  candidate until placement is accepted ([`RFC-OQ-3`](#open-questions)); this
  RFC does not rewrite the compositor. See the
  [Panel Placement Decision](panel-placement-decision.md) for the candidate
  direction.
- **Identity**: `ViewId != TerminalId` is authoritative per both accepted
  contracts. This RFC adds `PanelId != ViewId != TerminalId` and reuses the
  same generation and `StaleHandle` rules; no migration of `ViewId` naming is
  performed here.
- **Focus**: focus MRU per workspace, `View focused: bool`, and the rule
  `Platform -> Router -> focused View -> keymap -> encoder -> PTY` are
  authoritative per [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md).
  This RFC routes `focused Panel` as an alternative target with identical MRU
  and `no_focus` counter semantics.
- **Resize**: `LogicalRect` per attached view validated by Core, then
  `cols = floor(rect.width / cell_width)`, `rows = floor(rect.height / cell_height)`
  clamped to `[1,1024]`, debounce `64`, full-grid damage plus generation are
  authoritative. Terminal-backed panels reuse that exact rect plus cell-metric
  path and debounce with `resize_coalesced` counting; non-terminal panels
  produce no PTY resize at all.
- **Visibility**: inactive workspace, scratchpad hidden, zero-area, and overlay
  occluded semantics per the registry and compositor stay authoritative. A panel
  whose view is invisible retains its `PanelId` and attachment but incurs no
  render cost and cannot hold window focus, identical to the terminal view rule.
- **Layout and decoration**: `H`/`V` `ratio [0.1,0.9]`, `gaps_in`/`gaps_out`/`border`/`radius`
  Core-owned with safe-mode `0`/`0`/`1`/`0` are authoritative.
  `PanelProvider::propose` stays pure, deterministic, and bounded, and any
  proposal carrying decoration is rejected.
- **Bounded resources**: `max_terminals 64`/`max_views 32`/`max_workspaces 16`
  with `ConfigPlan` validation are authoritative. This RFC adds
  `max_panels_per_workspace 32` and `max_panels_per_window 64` as sibling ceilings
  that fit inside the same validation and do not silently clamp.
- **Exclusions**: daemon, remote UI, and live PTY migration remain deferred per
  [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) and per the explicit
  exclusion tables of both accepted contracts; this RFC preserves those
  deferrals and introduces no cross-process or cross-window panel transfer.

The candidate [Workspace Panel Invariants](workspace-panel-invariants.md) (OQ-058)
remain candidate at their recorded per-invariant statuses. This RFC accepts the
panel-runtime contract they depend on; it does not by itself upgrade those
invariant statuses and does not answer OQ-058, whose workspace/session lifecycle
coupling is still open.

No accepted requirement is moved between owners and no bypass is introduced.

## Implementation status

Acceptance of this RFC does not describe implemented behavior. The following is
the current point-in-time implementation status, recorded here so the accepted
contract is not confused with shipped, verified, or compatibility-guaranteed
behavior. None of it promotes any claim to **Verified** or **Compatible**.

| Surface                          | Status (revision cited per row)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry-layer panel identities  | Experimental `bitty-runtime::registry` `PanelRegistry` with `PanelId` (a `bitty-ui` type), monotonic generation, stale-handle rejection, generation exhaustion, and the `Declared -> Created -> Mounted -> Focused -> Suspended -> Disposed` lifecycle, tested headlessly in `bitty` at revision `01ffdda` (2026-09-14) per the candidate [Workspace Panel Invariants](workspace-panel-invariants.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Named host type                  | No struct, trait, enum, or module named `PanelRuntime` exists in `bitty` `origin/main` at `e8dc9e5` (2026-09-16); the name is this RFC's host abstraction, and spellings such as `PanelRuntime::create` describe the accepted contract, not current code. Current orchestration is `PanelRegistry` in `crates/bitty-runtime/src/registry/panel.rs` (`create_panel`, `mount_panel`, `focus_panel`, `suspend_panel`, `resume_panel`, `dispose_panel`), which re-exports the `bitty-ui` panel types                                                                                                                                                                                                                                                                                                                                                           |
| Live app path panel content      | `ViewContent::Panel(PanelId)` and per-panel registries exist in `crates/bitty-ui/src/panel.rs` and `crates/bitty-runtime` at `b761c03` per the [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md); placement is not accepted ([`RFC-OQ-3`](#open-questions))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Bundled-disabled Panel consumers | Five Panel Runtime consumers (`shell-integration`, `workspace`, `palette`, `statusline`, `project`) are bundled-disabled via the public `PanelRegistry` and `PluginHost` paths at `5c885f2`, exercising the three-level queue `64`/`1024`/`8192`, `8 KiB` payload, `32`/`8 KiB` batch, and `DropOldest`, per the draft [Plugin Matrix](../product/plugin-matrix.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Presentation modes and overlays  | `PresentationMode` on `View` carries only `Tiled` as live; `Floating`, `Fullscreen`, and `Scratchpad` parse but transitions are gated. `OverlayTier` ordering exists as an opt-in `bitty-ui` primitive, and multi-tier stacking is not consumed by the app present path, per the [Workspace Compositor](workspace-compositor.md) shipped slice at `1f31435`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Event Bus                        | Bounded in-process `PanelEventBus` queues exist inside the bundled-disabled `workspace`/`statusline` consumers at `5c885f2`; cross-process routing, the v1 topic taxonomy, and the capability ledger are not implemented and remain [`RFC-OQ-4`/`RFC-OQ-5`](#open-questions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Workspace save and restore       | Atomic session save/restore exists in `bitty-runtime` at revision `668a461` (2026-09-20): a versioned `SessionSnapshot` (format v1) captures workspace slots, layout trees, focus, MRU order, and bounded per-pane scrollback plus captured `OSC 7` cwd, encoded to one session file under the XDG state root and written atomically (temp plus rename); restore validates the whole file before any mutation and fails closed to a clean start, and safe mode never reads it. Tested headlessly by the session suite in `bitty` (30 tests: 22 in `crates/bitty-runtime/tests/session_save_restore.rs` plus 8 inline in `crates/bitty-runtime/src/runtime/session.rs`) per the candidate [Workspace Panel Invariants](workspace-panel-invariants.md) F-2; the persistence contract itself (restart persistence) stays Open ([`RFC-OQ-9`](#open-questions)) |
| Excluded surfaces                | No daemon, remote UI, multi-window global server, WASM/helper panel isolation, or hot-path `input.pre-encode` interception is implemented or authorized                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

The Point-in-time revisions above are cited from draft or candidate documents;
they are evidence of what exists, not a conformance claim against this RFC.
Where this RFC and a draft implementation-status document disagree, this RFC's
accepted contract governs and the status document is stale.

### Recorded direction — Panel, Activity, and the ActivityStack

Recorded for traceability as a Panel, Activity, and the Native UI Boundary
direction (2026-09-16). This is a captured design conclusion, not an
accepted amendment to this RFC: none of it is implemented in `bitty`, none of
the [open questions](#open-questions) is resolved, and no `Implemented`,
`Verified`, or `Compatible` status is claimed.

- **`Panel is not Activity`.** An activity stack (push/pop) keeps a host's
  session alive across presented-content changes while `TerminalRegistry`
  remains the sole owner of terminal (PTY) lifecycle; `Document`, `View`, and
  `Panel` stay distinct concepts.
- **Presentation modes are runtime properties**, not panel types: one
  `PanelId` can move between the modes this RFC defines (for example `tiled`,
  `floating`, `fullscreen`, `scratchpad`) without changing identity or
  lifecycle.
- **Activities generalize panel content**: `Terminal`, `Rich`, `Browser`,
  `Helper`, and `Canvas` become activities hosted by a panel, and the host
  (`PanelRuntime` in contract terms; `PanelRegistry` today) keeps the
  create/mount/suspend/resume/dispose lifecycle.
- **Object-model direction**: `Window > Workspace > Panel > Presentation/Activity`,
  backed by UI Runtime, Application Runtime, and Lua Runtime layers, with Rust
  owning primitives and Lua holding state and policy.
- **Destination note**: the plugin-side direction is captured in
  `plugin-ecosystem-model.md` in `bitty-plugins-docs`; this subsection records
  the terminal-core direction. Adopting the activity stack requires a future
  RFC amendment or successor document; the panel-provider contract remains
  open, and the candidate [Panel Extensibility Vision](../product/panel-vision.md)
  is the related draft direction.

## Alternatives considered

| Alternative                                                              | Trade-off                                                                       | Disposition                                                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Panel as `LayoutTree` leaf replacing `View`                              | Strongly typed panel tiling but breaks `ViewId` history and forces `View` churn | Rejected; Option A (typed `View` content) preserves generation history unless [`RFC-OQ-3`](#open-questions) decides otherwise |
| Panel implements `render`/`handle_event` hot trait directly              | Maximal panel control but puts Lua on hot path and breaks invariant 4           | Rejected; panels are declarative values composed by Core                                                                      |
| Event Bus as direct panel references (`panel_a -> panel_b` object share) | Lowest latency but creates ambient authority and confused deputies              | Rejected; bus is host-mediated with qualified topics and scopes                                                               |
| Global unbounded bus (one queue, no backpressure)                        | Simplest but allows one burst to starve the host                                | Rejected; three-level envelopes with `DropOldest` default are required                                                        |
| WASM/helper-process per panel in v1                                      | Stronger isolation but large toolchain and transport cost                       | Deferred; OQ-014 per-VM isolation remains the v1 boundary, helper reuse is candidate via IPC framing                          |

## Verification plan

An implementation may claim conformance only when the following evidence
exists; none is satisfied by this RFC alone:

1. Metadata and link gates: `just check` with zero markdownlint, link, metadata,
   language, agents, and hygiene issues plus `act -n -W .github/workflows/ci.yml`
   dry-run success.
2. Identity invariant tests: `PanelId`, `ViewId`, `TerminalId`, `RuntimeId`,
   `PersistentId`, and `Generation` are distinct types; stale `(id, generation)`
   is rejected with `StaleHandle`; moving a panel between views preserves
   `PanelId` and changes only `ViewId`.
3. Lifecycle tests: `create` beyond `max_panels_per_workspace` returns
   `TooManyPanels`; unknown `PanelType` returns `UnknownPanelType`; hide versus
   destroy preserves or retires the `PanelId` per spec; disposal clears the
   attachment and makes every further call return `RegistryDisposed`-analog.
4. Focus tests: MRU ordering, overlay capture, `no_focus` counter, and the
   rule that a hidden view's panel never receives keyboard or wheel.
5. Layout tests: `H`/`V` only, `ratio` bounds, decoration rejection at
   `ConfigPlan` and at `PanelProvider` proposal admission, `--safe` decoration
   defaults regardless of user config.
6. Overlay tests: modal exclusivity, non-modal bound `TooManyOverlays`, focus
   restore on dismiss, geometry never reaching the `LogicalRect -> PTY` path.
7. Bus tests: topic grammar and manifest-declared produce/consume, `BoundedText`
   `8 KiB` and `32`/`8 KiB` batch strict, per-subscription `64` strict at
   `EventQueue::push`, per-panel or per-plugin `1024`/`256 KiB` at publish, global
   `8192`/`2 MiB` hard-gated strict `invariant_global_bounds`, `DropOldest`
   counting and attribution, coalescing for latest-wins topics, fail-open
   isolation of one subscriber fault.
8. Headless composition tests without window or GPU for registry, `LayoutTree`
   ratio validation, and bus queue behavior; full deterministic replay harness.
9. Security review of capability denial, bus topic isolation, no PTY or GPU
   handle reachability, and `bitty --safe` with all third-party panels skipped.

## Open questions

This RFC does not resolve the pre-study's open questions; they remain open and
are renumbered away from the pre-study as `RFC-OQ-1` through `RFC-OQ-9`
(pre-study open questions 1 through 9). Pending any of these, no implementation
may claim the affected contract; none is a global open-question register entry
until it is admitted there.

| ID         | Open question                                                                                                                                                                                                                                                                                       | Pre-study item |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `RFC-OQ-1` | Which panel types belong in the first implemented slice: `terminal` only, or `terminal` plus `rich` and one additional type such as `helper` or `canvas`?                                                                                                                                           | 1              |
| `RFC-OQ-2` | Exact `PanelProvider` trait spelling and error taxonomy beyond the illustrative sketch.                                                                                                                                                                                                             | 2              |
| `RFC-OQ-3` | Whether Panel becomes typed `View` content (Option A, the current implementation shape), replaces `View` as leaf, or composes as a side-car, and the `ViewId` versus `PanelId` migration this implies. Candidate direction recorded in the [Panel Placement Decision](panel-placement-decision.md). | 3              |
| `RFC-OQ-4` | Exact bus topic taxonomy for v1 (panel lifecycle, focus, file, git, AI, helper-process) and whether cross-window topics route through IPC or an in-process bus first.                                                                                                                               | 4              |
| `RFC-OQ-5` | Capability mapping for each panel type, especially `panel.overlay` and any new `panel.*` family versus reuse of `ui.*`.                                                                                                                                                                             | 5              |
| `RFC-OQ-6` | Distribution ownership: which first-party panels, if any, ship enabled and how they relate to the [Default Distribution RFC](default-distribution-rfc.md).                                                                                                                                          | 6              |
| `RFC-OQ-7` | Whether primitive priority (`Panel`, `Workspace`, `Layout`, `Command`, `Keybinding`, `Event`, `Capability`, `Service`, `Widget`, `Plugin`) becomes a formal versioning policy.                                                                                                                      | 7              |
| `RFC-OQ-8` | Whether `Browser` panels require an extra per-window process budget beyond the existing `RC-3` aggregate.                                                                                                                                                                                           | 8              |
| `RFC-OQ-9` | Whether the seven presentation modes, `preferred_mode` plus Panel Rules precedence, the scrolling-layout option, and workspace save/restore enter a Panel RFC together or as separate follow-ups.                                                                                                   | 9              |

## References

- [Panel Runtime and Event Bus Pre-Study](panel-runtime-pre-study.md) (CTX-0119, research provenance; superseded by this RFC)
- [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md) (CTX-0117, Accepted, `6f30c2f`)
- [Workspace Compositor Specification](workspace-compositor.md) (CTX-0118, Accepted, `c3a2928`)
- [Workspace Panel Invariants (Candidate)](workspace-panel-invariants.md) (OQ-058, candidate)
- [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) (draft)
- [Plugin Matrix](../product/plugin-matrix.md) (draft, point-in-time implementation status)
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md) (OQ-011/012/013)
- [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md) (OQ-014, RC-1..RC-10, FS-1..FS-9)
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (OQ-018, RC-9/RC-10, scopes, framing)
- [Configuration Model RFC](configuration-model-rfc.md) (OQ-010)
- [Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md) (OQ-009) plus ADR 0005/0006/0007 (OQ-030/031/032)
- [Panel Extensibility Vision](../product/panel-vision.md) (draft precedents only)
- [Architecture Overview](../architecture/overview.md), [Core and Plugin Boundaries](../architecture/core-boundaries.md)
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md), [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md), [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md)
- [ADR 0003 - Core Workspace Topology](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0003-core-workspace-topology.md), [ADR 0008 - Headless](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
