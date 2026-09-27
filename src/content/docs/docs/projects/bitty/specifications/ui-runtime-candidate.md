---
title: Workspace-Native UI Runtime (Candidate)
description: Draft candidate direction for a retained declarative UiTree over wgpu the Workspace Scene View Panel Activity hierarchy Window Chrome Runtime command equivalence Core-owned motion UI budgets and the Beacon core targeting engine
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 38
---

# Workspace-Native UI Runtime (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document is a design record for the
> terminal-side slice of a Workspace-native application UI runtime direction:
> the part the Bitty terminal platform would own if the direction were ever
> reviewed and accepted. It authorizes no shipped, stable, or
> compatibility-guaranteed behavior, weakens no accepted source it cites, and
> makes no implementation claim. Type names, layer spellings, cascade levels,
> budget categories, and call shapes repeated here are direction, not contract.
> As direction only, this record supersedes the candidate Panel model of the
> accepted [Workspace Compositor Specification](workspace-compositor.md); the
> accepted compositor and [Panel Runtime RFC](panel-runtime-rfc.md) contracts
> remain authoritative for their subject matter until a reviewed amendment
> says otherwise.

## Purpose and scope

This document freezes the recorded Workspace-native UI runtime direction so
future design work starts from a stable input instead of reconstructing the
discussion. The direction positions Bitty as a programmable workspace and
terminal-centered application shell: a retained declarative UI tree rendered
by the Rust compositor over `wgpu`, a four-layer spatial and identity model,
a Window Chrome Runtime with typed Panel Rules, gesture transactions with
command ontological equivalence, Core-owned motion and UI resource budgets,
orthogonal panel state axes with declarative rehydration, and a terminal-side
Beacon core engine for workspace-wide semantic targeting.

It refines, by reference only, the accepted
[Workspace Compositor Specification](workspace-compositor.md) interactions and
identity hierarchy, the accepted [Panel Runtime RFC](panel-runtime-rfc.md)
lifecycle, presentation, and command contracts, the draft
[Status System Specification](status-system.md) bar model, the draft
[Input and Pointer Contract](input-pointer-rfc.md) gesture and Leader surface,
the candidate
[Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md)
gesture semantics, and the draft
[UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) window-form
directions. It changes none of them.

In scope (all **Candidate** unless cited otherwise):

- U-1: the Workspace-native application UI runtime and the retained declarative
  `UiTree` rendered over `wgpu`.
- U-2: the spatial and identity model — `Workspace` (`WorkspaceScene`) →
  `View` → `Panel` → `Activity`.
- U-3: the five-level UI architecture from Rust mechanisms to applications.
- U-4: the Window Chrome Runtime and typed Panel Rules with the `ResolvedStyle`
  cascade.
- U-5: the panel gesture transaction and command ontological equivalence.
- U-6: Core-owned motion and the three-tier resource budget.
- U-7: orthogonal panel state axes and declarative rehydration.
- U-8: the Beacon core engine on the terminal side.
- U-9: the owner-pending five-RFC convergence roadmap.

Out of scope and owned elsewhere (pointers, not content):

- VT parser, grid, cursor, mode, damage, reply, and scrollback truth (accepted,
  [Terminal State RFC](terminal-state-rfc.md));
- rich block, scene, zone, and structured transport detail (accepted,
  [Rich Presentation RFC](rich-presentation-rfc.md));
- plugin manifest, capability grammar, standard Lua library shapes, and
  package lifecycle (accepted,
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md),
  [Package Lifecycle RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/packaging/package-lifecycle-rfc.md));
- per-plugin execution, memory, and queue ceilings (accepted,
  [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md));
- panel lifecycle, overlays, focus routing, and the Event Bus contract
  (accepted, [Panel Runtime RFC](panel-runtime-rfc.md));
- the StatusBar module registry, sampling, and Provider composition (draft,
  [Status System Specification](status-system.md); U-4 records only the chrome
  direction);
- the Lua standard UI library, `bitty-ui-core`, domain components, applications,
  `ActivityStack`, `PanelProvider`, the attention-request protocol, and the
  plugin-side Beacon specification (direction, `bitty-plugins-docs` owner);
- the drag, resize, cross-workspace move, and drag-to-Bar candidates
  (candidate,
  [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md);
  U-5 extends them by reference);
- unified `Mod` scope and panel-rule scope (open,
  [OQ-052](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md));
  Lua capability dimensions and API version (open,
  [OQ-056](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md));
- shared governance, decision, security, and roadmap corpora (linked, never
  copied, [bitty-docs](https://github.com/bitty-terminal/bitty-docs)).

Hyprland, Waybar, and other tiling-window-manager and terminal-emulator
projects are **read-only philosophy references** here, exactly as in the
accepted [Workspace Compositor Specification](workspace-compositor.md):
no source, configuration syntax, or wire format is copied, supported, or
executed. Every direction below is re-expressed as a typed, validated Bitty
contract candidate, and the accepted no-window-leak rule stays in force —
inside a `Workspace` the unit is a `View`/Panel, `Window` names only the native
OS window owned by `bitty-platform`, and no geometry, command, or Lua value
exposes a window handle, native surface, or OS window identifier
([No window leak](workspace-compositor.md#no-window-leak)).

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the recorded design direction only; no review has accepted it.           |
| Owner-pending     | Belongs to an owner decision or another document owner; recorded as a pointer.       |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## U-1 Workspace-native application UI runtime (Candidate)

**Candidate.** Bitty is a programmable workspace and terminal-centered
application shell — not merely a terminal emulator with UI widgets. Application
UI is a retained declarative tree (`UiTree`) rendered by the Rust compositor
over `wgpu`. Lua emits a `UiTree` only on state change, semantic action, timer,
or service event; Rust reconciles tree diffs, computes layout, performs
hit-testing, updates the accessibility tree, and generates paint lists. Lua
never runs a per-frame `draw(frame)` loop.

Terminal-side conclusions:

- The accepted [Declarative UI boundary](../architecture/core-boundaries.md#declarative-ui)
  already requires plugins to submit declarative descriptions and forbids
  Lua-created shaders, pipelines, glyphs, or native windows. This direction
  names the retained-tree model that generalizes that boundary from status
  areas, popups, and overlays to full application surfaces; it stays inside the
  accepted boundary and weakens none of it.
- Accepted invariants hold unchanged: presentation is never Terminal Truth,
  plugins stay off the hot paths, and inputs are bounded
  ([Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)).
  A `UiTree` revision is presentation data; it cannot mutate grid, cursor,
  modes, or scrollback.
- Rust owns the mechanisms: layout, text shaping, image decode, scroll physics,
  `TextInput`/IME, the focus engine, hit-testing, animation interpolation, the
  accessibility tree, and GPU pipelines.
- OS-native platform APIs are reserved for window chrome, IME, clipboard,
  drag-and-drop, accessibility, file pickers, notifications, and system menus.
  They are not a second UI toolkit, and Lua gets no ambient platform authority
  through them.
- Frame-on-demand is part of the model: a `UiTree` revision schedules paint
  only when something changed (U-6).

**Open.** The `UiTree` node schema and revision/identity rules for diffing, the
reconciliation and invalidation model, the accessibility tree mapping, and
whether the retained tree subsumes the accepted Rich `Scene`/`SceneNode` model
or composes beside it are undecided. The first tree specification belongs to
the owner-pending UI Runtime RFC (U-9). No accepted contract is changed here.

## U-2 Spatial and identity model (Candidate)

**Candidate.** The spatial and identity hierarchy has four layers:

1. **`Workspace`** — a `WorkspaceScene` that owns named spatial layers —
   `tiled_layer`, `floating_layer`, `pinned_layer`, `popover_layer`,
   `overlay_layer` — plus a `scratchpad`. The tiled layer corresponds to the
   accepted `LayoutTree` composition; the other layers generalize the accepted
   float, overlay, and hidden-workspace behaviors.
2. **`View`** — the internal compositor presentation attachment point
   (`LayoutTree<ViewId>` leaf or Z-stack entry). `View` is an internal
   compositor primitive: it is hidden from end users and from plugin Lua APIs
   and is never a user-facing target.
3. **`Panel`** — the application and session identity (`PanelId`). The
   accepted inequality `PanelId != ViewId != TerminalId` holds. Moving a panel
   across workspaces updates only its presentation attachment; its PTY,
   `TerminalId`, `PanelId`, and its Lua VM survive the move.
4. **`Activity`** — the unit of navigation and content within a `Panel`,
   managed by an `ActivityStack` that supports push/pop navigation (for
   example Overview → Container Detail → Logs).

Terminal-side conclusions, composed with the accepted contracts:

- **`RFC-OQ-3` reconciliation.** The direction leans toward a refined
  Option C of the accepted [Panel Runtime RFC](panel-runtime-rfc.md): Panel
  composes beside `View` as the user- and plugin-visible application identity,
  while `View` remains the internal attachment and compositing primitive.
  `ViewId` generation history is not migrated, no `ViewId` naming change is
  performed, and no function accepts one identity where another is expected.
  The placement decision remains [`RFC-OQ-3`](panel-runtime-rfc.md#open-questions);
  this document decides nothing. The candidate direction that reconciles the
  three options — including the split between identity semantics and the
  transitional `ViewContent` encoding — is recorded in the
  [Panel Placement Decision](panel-placement-decision.md).
- **Reconciliation with the accepted compositor.** The accepted
  `Instance -> Window -> Workspace -> LayoutTree -> View` hierarchy, its
  identity invariants, Core-owned decoration, and interaction atomicity remain
  authoritative
  ([Identity hierarchy](workspace-compositor.md#identity-hierarchy-and-viewid-distinct-from-terminalid),
  [Interactions](workspace-compositor.md#interactions-drag-resize-move-scratchpad)).
  As direction only, this record supersedes the compositor's candidate Panel
  model ([Candidate Panel model](workspace-compositor.md#candidate-panel-model)):
  the `WorkspaceScene` generalizes the accepted `Workspace`, and `Panel`
  becomes the visible application identity rather than a candidate typed
  `ViewContent` variant. A future Workspace Scene RFC and Panel & Activity RFC
  (U-9) must carry the amendment; this page edits no accepted text.
- **No window leak.** No layer, command, or Lua value exposes a window handle,
  native surface, or OS window identifier; the accepted rule stands.
- **Identity preservation.** Moving a panel re-parents its presentation
  attachment only; the accepted `View`/`Terminal` move semantics — a move is
  not a copy and state stays single-owned — extend to Panel moves unchanged.

**Open.** Whether `View` survives as a distinct identity or becomes an
anonymous attachment slot; the layer set and its z-order contract; whether
`scratchpad` becomes a scene layer or stays the accepted special hidden
`Workspace` per `Window`; how the `ActivityStack` composes with accepted focus
routing, panel lifecycle, and persistence; and how far `Activity` identity is
user-visible. The plugin-side halves (`ActivityStack`, `PanelProvider`) belong
to the plugin ecosystem owner.

## U-3 Five-level UI architecture (Candidate)

**Candidate.** Bitty UI is organized in five levels:

| Level | Name                | Contents                                                                                                                                                   |
| ----- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Rust mechanisms     | Layout, text shaping, image decode, scroll physics, `TextInput`/IME, focus engine, hit-testing, animation interpolation, accessibility tree, GPU pipelines |
| 1     | Lua primitives      | `Box`, `Text`, `Image`, `ScrollView`, `VirtualList`, `TextInput`, `Canvas`, `Terminal`, `Overlay`                                                          |
| 2     | Standard components | `bitty-ui-core` library — `Button`, `Card`, `List`, `Sidebar`, `Tabs`, `Toolbar`, `Dialog`, `Tooltip`, `Menu`, `Table`, `Tree`, `CommandPalette`           |
| 3     | Domain components   | `WorkspaceSidebar`, `GitBranchList`, `DockerContainerCard`, `AgentStatusCard`, `FileTree`, `ChatMessage`, `ModelSelector`                                  |
| 4     | Applications        | Docker plugin, Wheel AI UI, Git plugin, btop-like monitor, file manager, full editor                                                                       |

The composition rule is **minimal primitives plus massive composition**, not an
HTML element set. HTML carries document semantics, SEO, forms, and backward
compatibility, which is why it grew a hundred-plus elements; Bitty sheds that
baggage. Examples:

- `Button` is not a required Rust class; it composes as
  `Box + Text + Focus + pointer interaction + keyboard activation + Style +`
  accessibility role.
- `Card` is pure composition: `Box + background + border + padding + header +`
  content.
- `Sidebar` is a layout pattern (`Column + VirtualList + action buttons`), not
  a specialized runtime element.

**Complex widgets are a Rust mechanism with a Lua appearance.** Virtualization,
scroll physics, grapheme and IME handling, and large-dataset viewports cannot
be left to Lua: `VirtualList` instantiates only the visible rows in the
viewport and Rust owns the scroll model, while Lua defines per-item appearance
and action dispatch; `TextInput` composes with the host IME path; `Canvas`
takes bounded display lists (U-6). Theming is also Lua-side: spacing, radius,
and color tokens live in Lua theme tables consumed by standard components, so
users and plugins can swap styling libraries without touching Core. Third-party
design frameworks are pure Lua Level-2 libraries running inside the plugin VM.

Accessibility semantics remain disciplined: visual styling is free, but
interactive semantics are not. Standard Lua components bind appropriate
accessibility roles, keyboard activation (Enter/Space), focus management,
disabled states, and accessible names.

Terminal-side conclusions, composed with the accepted contracts:

- Level 0 is Core-owned per the accepted
  [Core ownership](../architecture/core-boundaries.md) table.
- Level 1 primitives that require Rust mechanisms (virtualization, IME, the
  terminal surface, GPU-backed canvas) cannot be reimplemented in Lua and must
  stay host-mediated. The `Terminal` primitive is a presentation attachment
  over an accepted `TerminalId`; it never grants PTY ownership or terminal
  management authority to Lua.
- Levels 2-4, the `bitty-ui-core` library, and third-party frameworks are
  plugin-ecosystem scope and are recorded here only as direction.

**Open.** The governance, versioning, and distribution of `bitty-ui-core`
(bundled versus packaged); the exact primitive set; which primitives are
host-provided versus library-composed; the theme token schema; and the
accessibility contract Level 1 primitives must expose to satisfy the Level 2
components. No package, API, or repository is created by this direction.

## U-4 Window Chrome Runtime and Panel Rules (Candidate)

**Candidate.** Window chrome is elevated into a `WindowChromeRuntime` with
named surfaces:

- **`WorkspaceRail`** — a permanent dock (candidate vertical placement) that
  lists workspaces, acts as the primary drop target for panel dragging, and
  carries the workspace-creation `+` target.
- **`StatusBar`** — the composable status surface; the draft
  [Status System Specification](status-system.md) remains its module registry
  contract.
- **`OverlayRoot`** — the host-owned root for transient overlays such as the
  command palette, which-key help, and jump labels.
- **`NotificationArea`** — the notification and attention-badge surface.
- **`CommandSurface`** — the command palette and command entry surface.

**Typed Panel Rules.** Declarative rules assign placement, presentation, size
constraints, and appearance to a stable panel identity with explicit priority,
specificity, and source precedence. Conflicts produce diagnostics instead of
order-dependent ambiguity. Rules are presentation-only and never grant
capability. Panel-rule scope remains owner-pending
([OQ-052](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)).

**`ResolvedStyle` cascade** (highest precedence first):

1. safety policy;
2. user panel rule;
3. workspace rule;
4. user theme;
5. plugin preference;
6. plugin content theme;
7. framework default.

**Authority scopes.** Window/shell chrome is Core plus user final, with plugin
requests only; panel chrome is Core/user final with plugin requests; panel
content is plugin controlled within the host budget. A plugin can influence
only through its declared request surfaces and never takes authority from the
user or the safety policy.

Terminal-side conclusions, composed with the accepted contracts:

- Chrome surfaces are presentation, never Terminal Truth: they read stable
  identity and declarative state and never mutate grid, cursor, modes, or
  scrollback.
- The Bar contract today is the draft Status System's single bottom-anchored
  bar; extended edge placement, colors, hiding, and animation are candidate
  in [PW-4](panel-workspace-interaction-candidate.md). The rail drop-target
  and `+` creation target extend the candidate
  [PW-8 drag-to-Bar semantics](panel-workspace-interaction-candidate.md) as
  direction, not as a new accepted contract.
- Decoration geometry (`gaps_in`, `gaps_out`, `border`, `radius`,
  `content_inset`) remains Core-owned and is never set by a panel rule,
  plugin, or layout provider.
- User appearance keys compose with the accepted appearance surface
  ([Lua and XDG configuration](../configuration/lua-and-xdg.md#appearance-knobs-supported-reference));
  the chrome keys and Panel Rule grammar are new candidate spellings, not
  defined here.

**Open.** Chrome runtime ownership and scope (the owner-pending Window Chrome
RFC, U-9); whether the rail replaces or composes beside the Bar; the Panel Rule
grammar, specificity algorithm, and conflict diagnostics; whether the cascade
is user-visible as a resolution trace; how the safety policy rank is expressed
and how `bitty --safe` intersects the cascade; and the plugin chrome-slot
contract.

## U-5 Gesture transactions and command equivalence (Candidate)

**Candidate.** `Mod`+left-drag lifts the focused panel into a gesture
transaction: interactive drop targets appear (split region, float position,
rail item, new-workspace target), the transaction previews its outcome, and it
commits atomically or rolls back — `Esc` cancels and restores the prior
presentation. Every mouse gesture maps 1:1 to keyboard shortcuts, Command
Palette entries, CLI invocations, IPC messages, and Agent actions through one
Command Registry.

Terminal-side conclusions, composed with the accepted contracts:

- The drag mechanics compose with the candidate
  [PW-1](panel-workspace-interaction-candidate.md) movement and sizing,
  [PW-7](panel-workspace-interaction-candidate.md) cross-workspace moves, and
  [PW-8](panel-workspace-interaction-candidate.md) drag-to-Bar semantics. Those
  sections define the current candidate gesture detail; the transaction and
  drop-target model extends them by reference and does not duplicate them.
- Atomicity mirrors the accepted compositor rule that source and destination
  are validated before either commits and a failed validation leaves layout,
  focus, and sessions unchanged
  ([Interactions](workspace-compositor.md#interactions-drag-resize-move-scratchpad)).
  The gesture transaction adds an explicit preview stage and a rollback stage
  to that rule; a cancelled transaction commits nothing.
- The accepted
  [Command registry](panel-runtime-rfc.md#command-registry) is the single
  dispatch surface: a committed gesture produces a command, and no gesture
  writes layout state directly. The CLI and IPC exposures reuse the accepted
  [CLI Contract RFC](cli-contract-rfc.md) and
  [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  contracts; Agent-facing invocations keep the accepted read-only default and
  per-request scope evaluation.
- The unified `Mod` spelling, remapping surface, and conflict diagnostics
  remain owner-pending under
  [OQ-052](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md);
  no default is named here.

**Open.** Drop-target hit zones and priority; preview/ghost affordances and
their animation; transaction scope (per gesture, per panel, or per workspace);
keyboard equivalents for rail and new-workspace drops (including undo); the
mechanical shape of the 1:1 equivalence check (for example a conformance test
asserting every gesture resolves to a registered command); and how the
transaction model composes with the accepted every-interaction-is-undoable
rule.

## U-6 Core-owned motion and resource budgets (Candidate)

**Candidate.** Motion is Core-owned: Lua sets target state; Rust interpolates.
Settings inherit through the motion hierarchy
`motion.default` → `motion.panel` → `motion.panel.open` /
`motion.panel.move` / `motion.panel.close`. Support for `reduced_motion` is
mandatory, and rendering is frame-on-demand: with no animation and no state
change there is zero wakeup.

The resource budget has three tiers:

1. **Lua Fuel** — the per-plugin Lua bytecode execution budget;
2. **Host API admission** — bounded host request and queue admission;
3. **UI/GPU resource budget (candidate)** — node count, texture memory, blur
   surface area, and draw calls.

**Bounded Canvas display lists.** Visualizations do not run drawing loops in
Lua. Lua submits bounded display lists or scene commands at low frequency
(for example 1 Hz), while the Rust compositor renders smooth transitions at
the display refresh rate (for example 144 Hz). A display list is data, not
code, and its size is bounded by the host budget.

Terminal-side conclusions, composed with the accepted contracts:

- Tiers 1 and 2 restate accepted resource controls (the accepted Lua Runtime,
  Plugin Platform, and Isolation Resource contracts); the UI/GPU tier is a
  candidate addition and must not weaken any accepted ceiling. It fails closed
  by refusing admission or degrading an effect, never by silently corrupting
  accepted state.
- The accepted animation contract
  ([Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md),
  OQ-040) already fixes durations in `0..=500` ms, a closed easing enum,
  `enabled = false`, reduced motion, and `bitty --safe` collapsing to the
  final committed state, and forbids interpolating terminal content, cursor,
  selection, and scrollback. The motion tree, its key spellings, and the
  move/resize/float-toggle leaves
  ([PW-3](panel-workspace-interaction-candidate.md)) are candidate additions
  to that accepted set.
- Animations never enter the VT parser or the damage-to-snapshot path and
  never block input routing, PTY reads, or the damage-to-present path
  (accepted invariant: no hot-path execution).
- Frame-on-demand composes with the accepted
  [Performance Budget RFC](performance-budget-rfc.md) and creates no periodic
  timer; a `UiTree` revision or an active animation is the only wakeup source.

**Open.** UI/GPU budget category bounds and attribution (per window, panel,
plugin, or surface); admission refusal versus graceful degradation; whether
GPU budget accounting is per-frame or per-surface; whether the UI budget is a
hard ceiling or a diagnostic; motion key spellings and defaults; the source of
`reduced_motion` (OS setting versus configuration); and the display-list
command set and its bounds.

## U-7 Panel state axes and declarative rehydration (Candidate)

**Candidate.** Panel state decomposes into orthogonal axes:

| Axis         | Meaning                                                               |
| ------------ | --------------------------------------------------------------------- |
| Lifecycle    | Registry state and generation of the panel identity                   |
| Presentation | Tiled, floating, fullscreen, or scratchpad placement                  |
| Visibility   | Rendered or hidden without teardown                                   |
| Focus        | Keyboard/input focus ownership                                        |
| Attention    | A background request for user notice without focus theft              |
| Interaction  | Transient gesture/transaction state (U-5)                             |
| Activity     | The current navigation/content position in the panel's activity stack |

Closing a panel does not unload its parent plugin. Background plugins request
attention badges (`NotificationArea`, U-4) instead of stealing focus. Startup
rehydrates declaratively: fresh Lua VMs plus declarative state re-application,
never deserialization of raw VM heaps.

Terminal-side conclusions, composed with the accepted contracts:

- Lifecycle (`Declared -> Created -> Mounted -> Focused -> Suspended ->
Disposed`, `PanelId` generation, stale-handle rejection) and presentation
  modes are accepted in the [Panel Runtime RFC](panel-runtime-rfc.md);
  visibility and focus follow the accepted focus routing. Attention,
  interaction, and activity are candidate axes.
- "Close does not unload the plugin" composes with the accepted separation
  between panel lifecycle and plugin lifecycle: plugin generation reload and
  unload are plugin-host concerns and are not a side effect of closing a
  panel. The attention-request protocol itself belongs to the plugin
  ecosystem owner.
- Declarative rehydration is the recorded direction for the open workspace
  save-and-restore question
  ([`RFC-OQ-9`](panel-runtime-rfc.md#open-questions)) and for the accepted
  terminal rehydration rule that a fresh `TerminalId`/`RuntimeId` is created
  under a stable `PersistentId`; it settles neither. Fresh-VM startup composes
  with the accepted per-plugin VM and generation lifecycle.
- The candidate [PW-5](panel-workspace-interaction-candidate.md) identity
  persistence direction is the sibling record for panel and workspace
  identity across restart; this section records the runtime state model only.

**Open.** Whether attention is a plugin counter or a host service; whether the
seven axes are the final set and which are user-visible; exactly what persists
(layout, identities, presentation modes, sizes, activity routes) and in what
format; rehydration ordering, failure behavior, and version migration; whether
closing a panel may ever unload its plugin by configuration; and how activity
state composes with the accepted focus MRU.

## U-8 Beacon core engine on the terminal side (Candidate)

**Candidate.** Beacon is elevated from a jump plugin to a workspace-wide
semantic and spatial targeting framework whose generic core mechanisms live in
the terminal platform. Mouse locates objects by screen coordinates through
`Hit Test -> TargetRef`; keyboard locates objects through Beacon labels via
`Target Registry -> TargetRef`. Both dispatch uniformly as
`Action(TargetRef) -> Command Registry`: Beacon resolves **what** to target,
never **how** to execute it.

Core mechanisms (terminal side):

- **`TargetRef` generation-based semantic handles.** Targets are lightweight
  semantic references — for example `PanelRef(PanelId, Gen)`, `WorkspaceRef`,
  `CommandBlockRef`, `UiNodeRef`, `LinkRef` — never raw UI-tree nodes, memory
  pointers, or compositor handles. Targets are ephemeral snapshots collected
  when a session enters; if the underlying entity disappears or re-renders,
  generation validation fails closed with `StaleTarget` and the session
  cancels or recollects cleanly. The compositor-internal `ViewId` is excluded
  from user-facing targets.
- **Target registry snapshots on session entry.** Collection is a cold-path
  snapshot; there is no per-frame polling loop in the compositor, and plugin
  providers collect through the same cold path.
- **`LabelAllocator` in Rust.** Single-character labels use home-row priority;
  two-character labels appear only on overflow; allocation is spatial — left
  half of the surface maps to left-hand keys, right half to right-hand keys,
  or a 3×3 quadrant split. The allocation algorithm lives in Rust; label
  character sets and strategies (`home-row`, `spatial`, `compact`) are Lua
  policies.
- **A single batched `BeaconAnnotationLayer`** in the `WorkspaceScene`. Labels
  do not spawn individual panels or OS overlays; the layer is submitted in one
  GPU pass alongside selection and IME underline layers.
- **Command Registry dispatch bridge.** Selecting a target dispatches a typed
  command ID to the accepted
  [Command registry](panel-runtime-rfc.md#command-registry); Beacon never
  implements actions such as `panel:close()` internally.
- **`CommandBlockProvider` as one provider among many.** Provider tiers are
  Core providers (panels, workspaces, command blocks, focusable UI controls,
  links, rich blocks), plugin providers (domain entities), and derived
  providers (composite or contextually filtered sets); the semantic terminal
  becomes one provider.
- **Mediator-only security.** Registering a target grants no capability:
  dispatch executes under the target owner's capability boundaries, and Beacon
  observes only public target metadata (`id`, `label`, `anchor`, `actions`),
  never private plugin state, prompts, or secrets.

**Decoupling from the Semantic Terminal RFC's P7 scope.** This direction
removes Beacon from the Semantic Terminal RFC's P7 sub-feature scope
([P7 candidate](semantic-terminal-rfc.md#p7-bitty-beacon-spatial-action-engine-candidate));
that subsection remains candidate text until an owner-pending reconciliation
retires or rewrites it, and this page edits nothing there. The plugin-side
Beacon specification — the key language, which-key integration, scopes,
filters, theme badges, and provider composition — belongs to the plugin
ecosystem documentation owner
([bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs)).

Terminal-side conclusions, composed with the existing corpus:

- The implemented-only P3 hint model is the current evidence base: a bounded
  target model (`256` targets, `8`-character labels) with no presentation
  integration yet, per the
  [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md). The core
  engine direction generalizes that model without changing its
  implemented-only status.
- The Leader namespace that Beacon sessions consume and the which-key/flash
  discoverability direction stay with the draft
  [Input and Pointer Contract](input-pointer-rfc.md); the cross-platform
  Leader strategy is tracked as OQ-088 and the spatial action engine as
  OQ-089.
- Annotation layers obey the accepted bounded overlay rules, are
  presentation-only, and never mutate Terminal Truth or grant capability.

**Open.** Core mechanism naming (`TargetEngine`/`AnnotationEngine` versus
`BeaconCore`); the `TargetRef` variant set and generation scheme; snapshot
bounds and refresh triggers; label policy schema and overflow behavior; the
provider registration API and capability implications; the session state
machine; and how the P7 candidate text is retired from the Semantic Terminal
RFC.

## U-9 Owner-pending convergence roadmap (Candidate, owner-pending)

**Candidate, owner-pending.** Future UI specifications converge into five
RFCs; this document creates none of them:

1. **UI Runtime RFC** — `UiTree`, layout, widget primitives, input and
   hit-testing, accessibility, diffing, and the UI budget.
2. **Workspace Scene RFC** — tiled, floating, pinned, fullscreen, scratchpad,
   popover, and overlay layers.
3. **Panel & Activity RFC** — Panel/View relations, `ActivityStack`,
   `PanelProvider`, lifecycle, and persistence state.
4. **Panel Rules & Styling RFC** — rules, size constraints, appearance,
   themes, and precedence.
5. **Window Chrome RFC** — `WorkspaceRail`, `StatusBar`, plugin chrome slots,
   notifications, and global overlays.

The recorded intent to retire or archive
[Panel Extensibility Vision](../product/panel-vision.md#document-status) in
favor of a Vision v2 is **owner-pending**: this document neither edits nor
supersedes that page, and no replacement vision exists yet.

## Reconciliation with accepted contracts

| Contract                                                                                                    | Reconciliation                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Workspace Compositor Specification](workspace-compositor.md) (Accepted)                                    | Hierarchy, identity invariants, decoration ownership, interaction atomicity, and no-window-leak stay authoritative. The 4-layer model generalizes `Workspace` into `WorkspaceScene` and demotes `View` to an internal attachment; it supersedes the candidate Panel model as direction only. No accepted text is edited and no open item is closed. |
| [Panel Runtime RFC](panel-runtime-rfc.md) (Accepted)                                                        | Panel identity/generation, presentation modes, focus routing, command registry, and capability isolation stay authoritative. Activity, attention, and interaction axes are candidate additions; [`RFC-OQ-3`](panel-runtime-rfc.md#open-questions) and [`RFC-OQ-9`](panel-runtime-rfc.md#open-questions) remain open.                                |
| [Status System Specification](status-system.md) (Draft)                                                     | The bar contract stays as drafted; the chrome runtime direction composes with [PW-4](panel-workspace-interaction-candidate.md) or a successor Bar RFC and changes nothing today.                                                                                                                                                                    |
| [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md)                     | Extended by reference: U-4 and U-5 build on PW-1, PW-3, PW-4, PW-5, PW-7, and PW-8; gesture detail is not duplicated here.                                                                                                                                                                                                                          |
| [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) (Draft)                                     | Gap verdicts and OQ-050..OQ-052 remain as recorded; this page records design directions, not new verdicts.                                                                                                                                                                                                                                          |
| [Input and Pointer Contract](input-pointer-rfc.md) (Draft)                                                  | Leader, chord consumption, and dispatch priority stay as drafted; Beacon sessions consume that namespace. OQ-088/OQ-089 remain open.                                                                                                                                                                                                                |
| [Semantic Terminal RFC](semantic-terminal-rfc.md) (Draft)                                                   | P1-P5 stay Implemented-only; P7 stays candidate until an owner-pending reconciliation decouples Beacon into the U-8 core engine plus the plugin-side specification.                                                                                                                                                                                 |
| [Product Vision](../product/vision.md) and [Panel Extensibility Vision](../product/panel-vision.md) (Draft) | The Vision v2 retirement direction (U-9) is owner-pending; neither page is edited here.                                                                                                                                                                                                                                                             |

## Owner-pending pointers

- Unified `Mod` and native window-form scope — modifier spelling, remapping,
  conflict diagnostics, panel rules, and semantic workspaces:
  [OQ-052](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
- Lua capability API — capability dimensions, scopes, and API version for the
  UI runtime and chrome surfaces:
  [OQ-056](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
- Leader strategy and Beacon engine — OQ-088 and OQ-089:
  [open questions register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
- Panel/Workspace lifecycle coupling — tracked with the candidate invariant
  set and
  [OQ-058](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
- Plugin ecosystem halves — Lua UI standard library, `bitty-ui-core`, domain
  components, applications, `ActivityStack`, `PanelProvider`, the
  attention-request protocol, and the plugin-side Beacon specification:
  [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs).
- Governance halves — the five-RFC convergence roadmap and the Vision v2
  retirement decision:
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs).

## Relation to existing systems

| Direction                      | Status                                                                                                          | Owning document                                                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U-1 retained `UiTree`          | Candidate generalizing the accepted Declarative UI boundary; tree schema and reconciliation Open                | [Core and Plugin Boundaries](../architecture/core-boundaries.md) (Accepted), owner-pending UI Runtime RFC (U-9)                                                                                                        |
| U-2 spatial/identity model     | Candidate; `RFC-OQ-3` placement Open; accepted compositor and panel contracts unchanged                         | [Workspace Compositor](workspace-compositor.md) (Accepted), [Panel Runtime RFC](panel-runtime-rfc.md) (Accepted), [Panel Placement Decision](panel-placement-decision.md) (Draft)                                      |
| U-3 five-level architecture    | Candidate; Level 0 mechanism ownership Accepted, Levels 1-4 split owner-pending                                 | [Core and Plugin Boundaries](../architecture/core-boundaries.md) (Accepted), [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs) (owner-pending)                                                |
| U-4 chrome runtime and rules   | Candidate; Bar surface remains the draft Status System contract; rail drops extend PW-8 direction               | [Status System Specification](status-system.md) (Draft), [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md)                                                                       |
| U-5 gesture transaction        | Candidate extending PW-1/PW-7/PW-8 and the accepted interaction atomicity; `Mod` spelling Open (OQ-052)         | [Workspace Compositor](workspace-compositor.md) (Accepted), [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md)                                                                    |
| U-6 motion and budgets         | Tiers 1-2 restate Accepted controls; motion tree, UI/GPU tier, and display lists Candidate                      | [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md) (Accepted), [Performance Budget RFC](performance-budget-rfc.md) (Accepted) |
| U-7 state axes and rehydration | Lifecycle/presentation/focus Accepted; attention, interaction, activity, and rehydration Candidate (`RFC-OQ-9`) | [Panel Runtime RFC](panel-runtime-rfc.md) (Accepted), [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md)                                                                          |
| U-8 Beacon core engine         | Candidate; generic Rust mechanisms terminal-side, plugin-side specification owner-pending; P7 decoupling Open   | [Semantic Terminal RFC](semantic-terminal-rfc.md) (Draft), [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs) (owner-pending)                                                                  |
| U-9 convergence roadmap        | Owner-pending; no RFC or vision page is created or edited here                                                  | [bitty-docs](https://github.com/bitty-terminal/bitty-docs) (owner-pending)                                                                                                                                             |

## Open items (not global open questions)

None of these is a global `OQ`: this document proposes no new contract boundary
and blocks no current-milestone gate, so under the
[open-question admission rule](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/documentation-workflow.md#open-question-admission)
they stay parked here until one qualifies. A future UI Runtime RFC, Workspace
Scene RFC, Panel & Activity RFC, Panel Rules & Styling RFC, Window Chrome RFC,
or Beacon reconciliation settles them:

- owner review of each Candidate slice (U-1 through U-9), reconciled against
  the accepted compositor, panel-runtime, input, animation, and security
  contracts rather than copied as normative APIs;
- the `UiTree` schema, diffing identities, reconciliation model, and its
  relationship to the accepted Rich `Scene`/`SceneNode` model (U-1);
- whether `View` survives as a distinct identity, the scene layer set and
  z-order, scratchpad placement, and activity composition with focus and
  persistence (U-2), with `RFC-OQ-3` as the placement decision;
- the `bitty-ui-core` governance, primitive set, theme token schema, and
  accessibility contract (U-3);
- chrome runtime ownership, rail-versus-Bar composition, Panel Rule grammar
  and diagnostics, cascade tracing, and `--safe` interaction (U-4);
- drop-target zones, preview and rollback detail, transaction scope, keyboard
  equivalents, and mechanical gesture-to-command equivalence checking (U-5);
- motion key spellings, `reduced_motion` source, UI/GPU budget bounds,
  failure posture, and display-list bounds (U-6);
- attention ownership, the final state-axis set, persistence content and
  format, and rehydration ordering and migration (U-7), with `RFC-OQ-9` as
  the persistence decision;
- Beacon core naming, `TargetRef` scheme, snapshot bounds, label policy,
  provider API, session state machine, and P7 retirement (U-8);
- the five-RFC convergence schedule and the Vision v2 retirement decision
  (U-9), both owner-pending in `bitty-docs`.

## References

- [Workspace Compositor Specification](workspace-compositor.md) — accepted
  tiling, identity, decoration, interaction, and no-window-leak contract.
- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted panel lifecycle,
  `PanelId` identity, presentation modes, command registry, and focus routing.
- [Terminal State RFC](terminal-state-rfc.md) — accepted Terminal Truth and
  scrollback contract.
- [Rich Presentation RFC](rich-presentation-rfc.md) — accepted `Scene`/
  `SceneNode`, block anchor, and semantic-zone contracts.
- [Performance Budget RFC](performance-budget-rfc.md) — accepted hot-path and
  budget rules.
- [CLI Contract RFC](cli-contract-rfc.md) — accepted CLI grammar for command
  equivalence.
- [Status System Specification](status-system.md) — draft StatusBar and module
  registry contract.
- [Input and Pointer Contract](input-pointer-rfc.md) — draft Leader, chord,
  and dispatch priority contract.
- [Semantic Terminal RFC](semantic-terminal-rfc.md) — draft P1-P5
  implemented-only slices and the candidate P7 Beacon subsection.
- [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md) —
  candidate gesture, Bar, identity, and persistence directions.
- [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) — point-in-time
  gap verdicts and window-form directions.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) — accepted
  mechanism-versus-policy, declarative UI, and capability split.
- [Lua and XDG configuration](../configuration/lua-and-xdg.md) — shipped
  keymap, appearance, and animation reference.
- [Panel Extensibility Vision](../product/panel-vision.md) — draft Panel
  direction with an owner-pending retirement.
- [Product Vision](../product/vision.md) — accepted product direction.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  and [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) —
  untrusted-by-default posture and hot-path invariants.
- [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md)
  and [Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md) —
  accepted animation and appearance contracts.
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md),
  and [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md) —
  accepted plugin, Lua, and resource ceilings.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) —
  accepted IPC scopes and agent read-only default.
- [Open questions register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) —
  OQ-052, OQ-056, OQ-058, OQ-088, and OQ-089 owner-pending decisions.
