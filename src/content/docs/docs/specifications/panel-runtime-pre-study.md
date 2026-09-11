---
title: Panel Runtime and Event Bus Pre-Study
description: Research draft surveying Generic Panel Runtime and Event Bus as Panel Platform prerequisite reconciled with TerminalRegistry View and Workspace Compositor
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 27
---

# Panel Runtime and Event Bus Pre-Study

> Status: **draft** research pre-study — not **Accepted**, not **Verified**, not
> **normative**, and not **Compatible**. This document surveys a candidate Generic
> Panel Runtime and Event Bus contract as a prerequisite for a future Panel
> Platform, reconciled with the accepted
> [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)
> (CTX-0117, `6f30c2f`, Accepted plus Experimental Implementation `c0aadd2`/`a8735d0`)
> and the accepted
> [Workspace Compositor Specification](workspace-compositor.md)
> (CTX-0118, `c3a2928`, Accepted, no experimental implementation). It proposes no
> implementation, authorizes no shipped, stable, or compatibility-guaranteed
> behavior, and does not weaken any normative control in the
> [Security Overview](../security/overview.md), [Threat Model](../security/threat-model.md),
> [Isolation Resource RFC](isolation-resource-rfc.md), or [Plugin Platform RFC](plugin-platform-rfc.md).
> The lifecycle is `Draft -> experimental review evidence -> Accepted -> Verified -> Compatible`
> (spec) and `Draft -> experimental review evidence -> Accepted -> normative` (document);
> only `Accepted` or `normative` documents authorize shipped behavior. All thresholds
> below are candidate research values that require a reviewed acceptance decision
> before implementation may claim them.

## Purpose and scope

Bitty has an accepted single-owner lifecycle for terminals and views
(`TerminalRegistry` plus `Workspace -> LayoutTree -> View` with `ViewId != TerminalId`)
and an accepted tiling compositor with `H`/`V` primitives, Core-owned decoration,
and `LayoutProvider` plugins. The next platform step is whether a generic
application container called **Panel** can be hosted by that compositor without
conflating identities, leaking PTY descriptors, breaking focus routing, or
weakening capability isolation. This pre-study surveys that question so a future
Panel RFC can be scoped without re-opening accepted contracts.

In scope for this research (candidate, not normative):

- panel lifecycle (`PanelId`, creation, mount, suspend, resume, unmount, disposal,
  generation, reattachment versus recreation);
- command registry reuse for panel actions;
- overlay as presentation-only modal/palette/tooltip surface;
- focus routing among panels, views, terminals, and overlays;
- inter-panel Event Bus topic, payload, subscription, ordering, and isolation;
- capability isolation and budget attribution for panels and bus traffic.

Out of scope and owned elsewhere:

- VT parser, grid, cursor, mode, damage, and reply invariants (OQ-007,
  [Terminal State RFC](terminal-state-rfc.md));
- text segmentation, width, bidi, shaping, atlas, and DPI contracts
  ([Text and Rendering RFC](text-rendering-rfc.md), draft);
- image, scene, zone, and structured transport ([Rich Presentation RFC](rich-presentation-rfc.md));
- Platform adapter ownership, `winit`/`winit` key and pointer normalization
  ([Input and Pointer Contract](input-pointer-rfc.md), draft);
- Plugin API v1, capability grammar, manifest, and three-level queue budgets
  (OQ-011/012/013, [Plugin Platform RFC](plugin-platform-rfc.md));
- per-plugin VM, instruction, memory, task, and queue enforcement (OQ-014,
  [Isolation Resource RFC](isolation-resource-rfc.md));
- IPC wire framing, discovery, auth, and per-connection rate limits RC-9/RC-10
  ([IPC and Agent RFC](ipc-agent-rfc.md));
- daemon, session persistence, and remote UI trust boundaries
  ([ADR 0008 - Headless](../decisions/adrs/ADR-0008-headless.md), post-v1.0).

This document is the research deposit for CTX-0119 (`Priority: P2 | Area: product | Labels: docs,area:product,P2 | Milestone: v0.1.0 | RFC: OQ-014 | Task: CTX-0119`)
and does not close an open question on its own.

## Relationship to accepted sources

| Area                 | Accepted fact (cite)                                                                                                                                                                                                                                               | How this research reconciles (candidate)                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topology             | One-way DAG, `Terminal -> Snapshot` only, 16-crate workspace per [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) (OQ-005)                                                                                                                        | Panel Runtime would live in `bitty-runtime`/`bitty-ui` boundary without reversing DAG edges; `bitty-vt`/`bitty-term-state`/`bitty-pty` stay dependency-free                                                                                          |
| Terminal lifecycle   | `TerminalRegistry` as single owner of PTY handles, `TerminalId != ViewId`, `RuntimeId`/`PersistentId`/`Generation`, bounded `64`/`32`/`16`, single view per terminal per [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)   | Panel proposes `PanelId` as a fourth incompatible newtype, at most one panel host per panel, no panel holds PTY fd, panel generation mirrors registry generation, reuse of resize routing `cols = floor(rect.width / cell_width)` via `LogicalRect`  |
| Workspace compositor | `Instance -> Window -> Workspace -> LayoutTree -> View` with `H`/`V` `ratio [0.1,0.9]`, Core-owned `gaps_in 4`/`gaps_out 6`/`border 2`/`radius 6`, `LayoutProvider` pure deterministic `propose` per [Workspace Compositor Specification](workspace-compositor.md) | Panel as candidate extension of `View` content (`Empty`, `Terminal(TerminalId)`, `Rich`, `Browser`, `Panel(PanelId)`) without adding a new tiling primitive; `LayoutTree` and decoration stay Core-owned; `LayoutProvider` never mutates panel state |
| Input                | Hot path `Platform -> Router -> focused View -> keymap -> encoder -> PTY` with no Lua per [Input and Pointer Contract](input-pointer-rfc.md) (draft)                                                                                                               | Focus routing for panels reuses the same router with `focused Panel` as an alternative routing target; overlay capture is presentation-only; no `input.pre-encode` plugin hook                                                                       |
| Plugin platform      | One VM per `(PluginId, generation)`, deny-by-default capabilities, observation versus interception, four interception points, `DropOldest` default per [Plugin Platform RFC](plugin-platform-rfc.md)                                                               | Panel lifecycle follows the same generation rule; panel-contributed UI is declarative; Event Bus reuses observation queues, not interception                                                                                                         |
| Isolation            | Per-subscription `64`, per-plugin `1024`/`256 KiB`, global `8192`/`2 MiB` with `DropOldest`, RC-1 `10^7`/`50 ms`/`8 ms`, RC-2 `32 MiB` per [Isolation Resource RFC](isolation-resource-rfc.md)                                                                     | Panel and bus budgets are sized to fit inside the same three-level envelope without borrowing                                                                                                                                                        |
| IPC                  | Bounded `256 KiB` frame, `512 KiB` in-flight, `64` pending, scopes per request per [IPC and Agent RFC](ipc-agent-rfc.md)                                                                                                                                           | Cross-process bus, if ever needed, would reuse the same framing and scope model, not a new TCP surface                                                                                                                                               |

Where this research selects a threshold it refines those sources; it does not move
a requirement between owners and does not create a bypass.

## Normative sources this pre-study does not weaken

- [Security Overview](../security/overview.md) (invariants 1-10, especially 3 presentation never Terminal Truth, 4 no hot-path Lua, 7 bounded inputs).
- [Threat Model](../security/threat-model.md) (T-01 parser wedge, T-06 plugin escape, T-07 starvation, T-09 IPC takeover, T-13 Terminal Truth).
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) and [Architecture Overview](../architecture/overview.md).
- [Terminal State RFC](terminal-state-rfc.md), [Rich Presentation RFC](rich-presentation-rfc.md), [Configuration Model RFC](configuration-model-rfc.md).
- [Plugin Platform RFC](plugin-platform-rfc.md) (OQ-011/012/013) and [Isolation Resource RFC](isolation-resource-rfc.md) (OQ-014).
- [IPC and Agent RFC](ipc-agent-rfc.md) (OQ-018) and [ADR 0008 Headless](../decisions/adrs/ADR-0008-headless.md).

## Terminology

| Term            | Candidate meaning                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Panel`         | Generic workspace-managed application container hosted inside a `Window` via the compositor; not an OS window, not a PTY                         |
| `PanelId`       | Stable handle for a panel instance; distinct newtype from `ViewId` and `TerminalId`, never compared or transmuted                                |
| `PanelType`     | Closed v1 candidate set contributed by a `PanelProvider` (for example `terminal`, `rich`, `browser`, `helper`, `canvas`), validated via manifest |
| `PanelRuntime`  | Core-owned host that creates, mounts, suspends, resumes, and disposes panels, validates `PanelId` plus generation, and mediates bus traffic      |
| `PanelProvider` | Plugin-supplied factory that declares one or more `PanelType` values; requires `panel.provider` capability                                       |
| `EventTopic`    | Qualified `owner.name:topic` identifier for inter-panel messages, for example `xuepoo.git:branch-changed`                                        |
| `Overlay`       | Ephemeral presentation surface (palette, modal, tooltip, candidate picker) owned by the compositor, not a tiling leaf                            |
| `Focus`         | Which `View` or `Panel` inside the active `Workspace` of the active `Window` owns keyboard, IME preedit, and wheel routing                       |

## Principles (candidate)

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

## Survey scope

### Panel lifecycle (candidate research)

#### Lifecycle model

Candidate state machine for one `PanelId` (Core-owned, host-mediated, not a
plugin-implemented `render` trait):

```text
Declared -> Created -> Mounted -> Focused -> Suspended -> Disposed
                         ^                      |
                         +--- resume  <---------+
Mount is attach to a View; suspend is becoming invisible (inactive workspace,
scratchpad hidden, zero-area, overlay occluded) without destroying attachment.
A panel never renders from inside the VT damage path.
```

Rules under research:

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

#### Ownership and surface model (candidate)

Illustrative shape only; final spelling belongs to `bitty-runtime` and `bitty-ui`:

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

Candidate `Panel != Pty` invariant: `Panel` is a surface identity; `TerminalPanel`
wraps a `TerminalId` and PTY, but `CanvasPanel`, `FilePanel`, `GraphPanel`, and
`HelperProcessPanel` do not require a PTY. The compositor and focus layers
operate on `PanelId`/`ViewId`, never on `is_terminal` branching.

Candidate placement under research (all preserve the accepted hierarchy
`Instance -> Window -> Workspace -> LayoutTree -> View`):

- Option A — Panel as typed `View` content: `ViewContent::Panel(PanelId)` as a
  fifth variant beside `Empty | Terminal | Rich | Browser`. Smallest change;
  `ViewId` remains the tiling leaf identity.
- Option B — Panel replaces `View` as `LayoutTree` leaf: `LayoutTree` leaves
  become `PanelId` directly. Larger churn; stronger typing for non-terminal
  surfaces but breaks the accepted `ViewId` generation history.
- Option C — Panel composes beside `View`: a separate `Panel` identity that
  attaches to a `View` side-car (`ViewId -> PanelId` map outside `ViewContent`).
  Preserves `View` while allowing panel metadata without widening `ViewContent`.

Current research preference is Option A (typed `View` content) because it reuses
the accepted `ViewId` generation, focus MRU, visibility, and scratchpad
semantics with the least ownership churn; a future Panel RFC must decide and
must state the migration of `ViewId` versus `PanelId` naming explicitly.

### Command registry (candidate research)

The command registry remains Core-owned and generation-aware per the accepted
[Plugin Platform RFC](plugin-platform-rfc.md) and
[CLI Contract RFC](../specifications/cli-contract-rfc.md) direction:

1. Panels contribute commands as qualified names `owner.name:command`, for
   example `xuepoo.git:open`. Registration is manifest-declared and validated
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

### Presentation modes (candidate research)

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

Rules under research:

1. A provider suggests a mode (`preferred_mode`) at creation, but user panel
   rules decide: match on plugin, role, or panel id to set mode, size,
   anchor, and focusability, in the spirit of window-manager window rules.
   Rule precedence and schema belong to a future Panel RFC.
2. Mode transitions route through the command registry as validated
   `LayoutTree` or compositor updates; no transition mutates terminal state
   or bypasses capability checks.
3. A non-focusable mode (for example a pet panel with `focusable = false`)
   never receives keyboard, IME, or wheel events under the focus routing
   below, but may still subscribe to observation bus topics.

### Layout options and workspace persistence (candidate research)

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
   belong to a future RFC; no persistence is claimed here.

### Overlay (candidate research)

Overlay is a presentation-only ephemeral surface owned by the compositor:

1. Types under research: command palette, modal dialog, tooltip, IME candidate
   picker, notification toast, and panel-owned `ui.overlay` surfaces.
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

### Focus routing (candidate research)

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

### Event Bus (candidate research)

The bus is a host-mediated, typed, bounded decoupling surface between panels,
workspaces, and plugins. It is not a direct panel reference, not a renderer
channel, and not an IPC TCP surface.

#### Topic and payload model (candidate)

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
bitty.bus.emit("xuepoo.files:file.open", { path = "/home/user/main.rs" })

bitty.bus.on("xuepoo.files:file.open", function(event)
  bitty.commands.invoke("xuepoo.editor:open", event.path)
end)
```

#### Queue, batching, ordering, and drop (candidate)

Reuses the accepted three-level envelope from OQ-014:

| Level                | Candidate default for bus traffic                                                                                                                                                   | Enforcement point                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| PerSubscription      | `64` events per `(PanelId, topic)` or `(PluginId, topic)` queue, strict FIFO at `EventQueue::push`                                                                                  | Bus subscription queue               |
| PerPanel / PerPlugin | `1024` events / `256 KiB` aggregate per panel or plugin, enforced at bus publish with `DropOldest` (v1 default)                                                                     | PanelRuntime / EventPipeline publish |
| Global               | `8192` events / `2 MiB` aggregate across all bus traffic, hard-gated at host admission via `would_exceed_global_limits` + `evict_oldest_globally`, strict `invariant_global_bounds` | Host admission                       |

Rules under research:

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

#### Capability isolation for the bus (candidate)

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
   cross-process transport RFC; the v1 research scope is single-process,
   single-window only. Bridging to IPC framing reuses the accepted `256 KiB`
   frame, `512 KiB` in-flight, depth `32`, RC-9/RC-10 quotas, and per-request
   scope evaluation without creating a new TCP surface.

### Capability isolation (candidate research)

1. Closed families: panel capabilities would close under a dedicated
   `panel.*` family proposed as `panel.provider`, `panel.create`,
   `panel.focus`, `panel.overlay`. Plugins cannot invent families; a `PanelType`
   contributed without the matching `panel.*` grant fails at registration.
2. `LayoutProvider` retains `layout.provider`, `Browser` retains `browser.embed`,
   `Rich` retains `ui.rich`, and `ui.overlay` gates palette/modal surfaces;
   `panel.*` does not subsume those gates and does not grant them implicitly.
3. Official and bundled panels pass through the identical capability model; no
   private channel and no first-party bypass.
4. Bus topics reuse the topic-declared capability rule above: subscribing to
   `xuepoo.git:branch-changed` needs at least a workspace-observation scope,
   while subscribing to a topic that carries clipboard or raw-terminal bytes
   needs that specific family; capability checks are synchronous and
   transactional (leave no partial state on denial).
5. Per-panel resource dimensions are owned by `(PanelId, generation)` with
   attribution and observable accounting; per-plugin dimensions remain
   `(PluginId, generation)` per OQ-014.

## Architectural placement (candidate)

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

Rules under research:

1. `PanelRuntime` owns panel creation, mount, suspend, resume, and disposal and
   holds no PTY fd, GPU object, or OS handle; those remain with `bitty-pty`,
   `bitty-render`, and `bitty-platform`.
2. `Workspace` owns `LayoutTree` composition and decoration; `PanelRuntime`
   never mutates `gaps_in`/`gaps_out`/`border`/`radius` and never holds a
   mutable `Workspace` handle inside `PanelProvider::propose`.
3. `LayoutProvider::propose` remains a pure function of `WorkspaceSnapshot`,
   `ViewId` set, and `LogicalRect`; a panel proposal that carries decoration
   or mutates layout outside the tree is rejected.
4. The bus is in-process first; cross-process routing, if ever adopted, would
   go through the accepted IPC transport with peer-credential auth and per-request
   scope evaluation, not through a new ambient channel.

## Identity: PanelId distinct (candidate)

```rust
// Illustrative shapes only; not an implemented API.
struct PanelId(u64);
struct ViewId(u64);
struct TerminalId(u64);
struct Generation(u64);
struct EventTopic(BoundedString<64>);
```

Rules under research:

1. `PanelId`, `ViewId`, `TerminalId`, `RuntimeId`, `PersistentId`, and
   `Generation` are distinct types; no function accepts one where another is
   expected and no `From` bridge exists.
2. A `PanelId` is created with a fresh `(PanelId, Generation)`. Numeric reuse
   after disposal requires a generation bump so stale `(PanelId, generation)`
   handles are detectable.
3. Handles travel as `(id, generation)` pairs on every cross-component call; a
   call with a stale generation is rejected with `StaleHandle` before any
   state access, mirroring the registry and view rule.

## Bounded resources (candidate research defaults)

All ceilings are candidate defaults parameterized for harness coverage. Changing
a value requires a reviewed RFC revision, never silent drift. Floors are
enforced; unknown or out-of-range budget keys fail validation closed per the
isolation `ceiling-is-upward-only` and attribution rules. Values are chosen to
fit inside the accepted three-level envelope (PerSub `64`, PerPlugin `1024`/`256 KiB`,
Global `8192`/`2 MiB`, `BoundedText` `8 KiB`, `drain_batch` `32`/`8 KiB`, RC-1/RC-2)
without introducing a new global budget family.

| ID    | Dimension                         | Candidate default                                    | Applies to             | Validation point                      | Failure                                                     |
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
  ceilings so a future implementation tests bus traffic with the same harness as
  plugin events; no new budget family is introduced.
- Aggregate plugin plus panel bus traffic shares the same global `8192`/`2 MiB`
  envelope; a panel burst that would exceed it is the same global-limit event
  as a plugin burst, not a second independent ceiling.
- Panel surface memory beyond queues (helper handles, canvas bitmaps) is
  accounted under RC-2 `32 MiB` per backing VM or helper budget and RC-3 `512 MiB`
  aggregate; this research does not introduce a new heap ceiling.

## Failure semantics (candidate)

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

Containment and attribution rules under research:

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

The following remain explicitly out of scope for this research and are not
authorized as shipped, stable, or compatibility-guaranteed behavior by this
draft. Each requires its own RFC or ADR with independent architecture, security,
and performance review before it can be claimed.

| Excluded                                                                                       | Why deferred                                                                                                                                          | What this research does instead                                                                                                     |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Daemon `bittyd` and session persistence across reboots                                         | Post-v1.0 per [ADR 0008](../decisions/adrs/ADR-0008-headless.md); trust boundary not reviewed here                                                    | Process-scoped runtime only; persistence is at most `PersistentId` scrollback rehydration per terminal rules                        |
| Remote UI and cross-host transport                                                             | New trust boundary with cross-machine auth (`mTLS` or SSH tunnel) not evaluated                                                                       | No remote wire format, no network port, no remote capability mapping                                                                |
| Multi-window as global server                                                                  | Window stays native OS object per [Workspace Compositor](workspace-compositor.md); orchestrating many windows adds focus, DPI, and lifetime questions | One `Instance` owns `Window`s; panel work is single-window first; cross-window topics deferred                                      |
| WASM or helper-process strong isolation for panels                                             | Native in-process plugins remain rejected per [Threat Model](../security/threat-model.md); WASM/helper design needs its own RFC                       | In-process Lua VM isolation per OQ-014 remains the only in-process boundary; helper-process reuse is candidate only via IPC framing |
| Browser embed per-window process budget beyond isolation ceilings                              | `browser.embed` is high-risk capability plus `Browser` view type already requires dedicated isolation                                                 | Panels that need a browser surface reuse `browser.embed` gate and existing RC-3 aggregate; no new process-budget ceiling here       |
| Panel distribution preset or marketplace ownership (`bitty-dev`, `LazyBitty`, `awesome-bitty`) | Owned by [Default Distribution RFC](../specifications/default-distribution-rfc.md) and future panel distribution RFC                                  | Research notes presets as configuration composition, not as a new bundled-enabled set                                               |
| New global file, network, or process ambient for Lua                                           | Violates [Security Overview](../security/overview.md) invariant 2                                                                                     | Panels obtain those only via explicit `fs.*`/`network.*`/`process.spawn:CONSTRAINT` capabilities                                    |
| New hot-path `input.pre-encode` interception point                                             | Would put Lua on the hot path per [Input and Pointer Contract](input-pointer-rfc.md)                                                                  | Panels observe via commands and `focus.changed` observation only                                                                    |

Claiming any excluded behavior by citing this pre-study is a documentation
hygiene violation. Cross-document references must preserve the deferred status.

## Security review (candidate research)

This research creates no ambient authority and does not weaken any P0 gate:

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
   security baseline for any future cross-process bus; this research does not
   introduce a TCP listener or an ambient bearer token.
6. Host responsiveness during panel or bus bursts is bounded by the same invariant
   used for isolation: input-to-render p99 within the PB-4 tail budget while
   under burst.

All controls above are candidate until the implementing tasks deliver focused
tests, fuzz corpora, and independent security-auditor review per
[P0 Acceptance Criteria](../security/p0-acceptance-criteria.md) and the
[Risk Evidence RFC](../specifications/risk-evidence-rfc.md).

## Reconciliation with TerminalRegistry/View and Workspace Compositor

Accepted contracts remain authoritative; this research proposes how a future
Panel RFC would sit on them without revising them:

- **Hierarchy**: `Instance -> Window -> Workspace -> LayoutTree -> View` stays
  authoritative per [Workspace Compositor](workspace-compositor.md). Panel is a
  candidate `ViewContent` variant, not a second tiling primitive. Without an
  accepted Panel RFC, `ViewContent` stays closed to `Empty | Terminal | Rich | Browser`
  and no `PanelId` exists in the hierarchy.
- **Identity**: `ViewId != TerminalId` is authoritative per both accepted
  contracts. The research adds `PanelId != ViewId != TerminalId` and reuses the
  same generation and `StaleHandle` rules; no migration of `ViewId` naming is
  performed by this pre-study.
- **Focus**: focus MRU per workspace, `View focused: bool`, and the rule
  `Platform -> Router -> focused View -> keymap -> encoder -> PTY` are
  authoritative per [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md).
  The research proposes that the router read `focused Panel` as an alternative
  target with identical MRU and `no_focus` counter semantics; no focus behavior
  is changed before its own RFC.
- **Resize**: `LogicalRect` per attached view validated by Core, then
  `cols = floor(rect.width / cell_width)`, `rows = floor(rect.height / cell_height)`
  clamped to `[1,1024]`, debounce `64`, full-grid damage plus generation are
  authoritative. The research proposes that terminal-backed panels reuse that
  exact rect plus cell-metric path and debounce with `resize_coalesced` counting;
  non-terminal panels produce no PTY resize at all.
- **Visibility**: inactive workspace, scratchpad hidden, zero-area, and overlay
  occluded semantics per the registry and compositor stay authoritative. The
  research proposes that a panel whose view is invisible retains its `PanelId`
  and attachment but incurs no render cost and cannot hold window focus, identical
  to the terminal view rule.
- **Layout and decoration**: `H`/`V` `ratio [0.1,0.9]`, `gaps_in`/`gaps_out`/`border`/`radius`
  Core-owned with safe-mode `0`/`0`/`1`/`0` are authoritative. The research
  proposes that `PanelProvider::propose` stays pure, deterministic, and bounded
  and that any proposal carrying decoration is rejected.
- **Bounded resources**: `max_terminals 64`/`max_views 32`/`max_workspaces 16`
  with `ConfigPlan` validation are authoritative. The research proposes
  `max_panels_per_workspace 32` and `max_panels_per_window 64` as sibling ceilings
  that fit inside the same validation and do not silently clamp.
- **Exclusions**: daemon, remote UI, and live PTY migration remain deferred per
  [ADR 0008](../decisions/adrs/ADR-0008-headless.md) and per the explicit
  exclusion tables of both accepted contracts; this research preserves those
  deferrals and introduces no cross-process or cross-window panel transfer.

No accepted requirement is moved between owners and no bypass is introduced.

## Alternatives considered

| Alternative                                                              | Trade-off                                                                       | Research disposition                                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Panel as `LayoutTree` leaf replacing `View`                              | Strongly typed panel tiling but breaks `ViewId` history and forces `View` churn | Rejected for this research; Option A (typed `View` content) preserves generation history             |
| Panel implements `render`/`handle_event` hot trait directly              | Maximal panel control but puts Lua on hot path and breaks invariant 4           | Rejected; panels are declarative values composed by Core                                             |
| Event Bus as direct panel references (`panel_a -> panel_b` object share) | Lowest latency but creates ambient authority and confused deputies              | Rejected; bus is host-mediated with qualified topics and scopes                                      |
| Global unbounded bus (one queue, no backpressure)                        | Simplest but allows one burst to starve the host                                | Rejected; three-level envelopes with `DropOldest` default are required                               |
| WASM/helper-process per panel in v1                                      | Stronger isolation but large toolchain and transport cost                       | Deferred; OQ-014 per-VM isolation remains the v1 boundary, helper reuse is candidate via IPC framing |

## Verification plan (candidate research gates)

Acceptance of a future implemented Panel Runtime and Event Bus contract would
require, at minimum (none is satisfied by this pre-study alone):

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

## Open questions (research follow-ups)

These require an RFC or ADR before any implementation may claim them:

1. Which panel types belong in a first RFC: `terminal` only, or `terminal` plus
   `rich` and one additional type such as `helper` or `canvas`?
2. Exact `PanelProvider` trait spelling and error taxonomy beyond the
   illustrative sketch.
3. Whether Panel becomes typed `View` content (research preference Option A),
   replaces `View` as leaf, or composes as a side-car.
4. Exact bus topic taxonomy for v1 (panel lifecycle, focus, file, git, AI,
   helper-process) and whether cross-window topics route through IPC or an
   in-process bus first.
5. Capability mapping for each panel type, especially `panel.overlay` and any
   new `panel.*` family versus reuse of `ui.*`.
6. Distribution ownership: which first-party panels, if any, ship enabled and
   how they relate to the [Default Distribution RFC](../specifications/default-distribution-rfc.md).
7. Whether primitive priority (`Panel`, `Workspace`, `Layout`, `Command`,
   `Keybinding`, `Event`, `Capability`, `Service`, `Widget`, `Plugin`) becomes
   a formal versioning policy.
8. Whether `Browser` panels require an extra per-window process budget beyond
   the existing `RC-3` aggregate.
9. Whether the seven presentation modes, `preferred_mode` plus Panel Rules
   precedence, the scrolling-layout option, and workspace save/restore enter
   a Panel RFC together or as separate follow-ups.

## Synchronization notes

This pre-study does not close an open question on its own, does not track to a
new OQ until recorded in the [Open-question register](../decisions/open-questions.md),
and does not change the machine-readable
[`project-state.json`](../project/project-state.json) or any `Verified`/`Compatible`
claim. Future acceptance would update the
[Specifications index](README.md) accepted versus draft tables, the
[Documentation map](../README.md) product table, the root
[TODO.md](../../TODO.md), the decision register, and the snapshot under the same
change. The document remains **Draft** (not `Accepted`/`Verified`) with no
experimental implementation; code at `c0aadd2`/`7e3104d`/`a8735d0` remains
`Implemented` (experimental, not `Verified`) and does not imply bus or panel
support.

## References

- [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md) (CTX-0117, Accepted, `6f30c2f`)
- [Workspace Compositor Specification](workspace-compositor.md) (CTX-0118, Accepted, `c3a2928`)
- [Plugin Platform RFC](plugin-platform-rfc.md) (OQ-011/012/013)
- [Isolation Resource RFC](isolation-resource-rfc.md) (OQ-014, RC-1..RC-10, FS-1..FS-9)
- [IPC and Agent RFC](ipc-agent-rfc.md) (OQ-018, RC-9/RC-10, scopes, framing)
- [Configuration Model RFC](configuration-model-rfc.md) (OQ-010)
- [Lua Runtime RFC](lua-runtime-rfc.md) (OQ-009) plus ADR 0005/0006/0007 (OQ-030/031/032)
- [Panel Extensibility Vision](../product/panel-vision.md) (draft precedents only)
- [Architecture Overview](../architecture/overview.md), [Core and Plugin Boundaries](../architecture/core-boundaries.md)
- [Security Overview](../security/overview.md), [Threat Model](../security/threat-model.md), [Risk Register](../security/risk-register.md)
- [ADR 0003 - Core Workspace Topology](../decisions/adrs/ADR-0003-core-workspace-topology.md), [ADR 0008 - Headless](../decisions/adrs/ADR-0008-headless.md)
