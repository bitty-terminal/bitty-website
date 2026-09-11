---
title: Workspace Compositor Specification
description: Defines the accepted Hyprland-inspired Workspace tiling compositor inside Window with LayoutTree H-V primitives View types Core gaps and border and LayoutProvider plugin algorithms
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 25
---

# Workspace Compositor Specification

> Status: **accepted** on 2026-08-31 by independent docs-reviewer per
> CTX-0118 — accepted Hyprland workspace tiling philosophy import for Bitty.
> This document defines the accepted contract for the Instance, Window,
> Workspace, View, Terminal identity hierarchy, the Workspace as tiling
> compositor, the `LayoutTree` with H and V primitives, View types, Core-owned
> `gaps_in`, `gaps_out`, `border`, `radius`, and the `LayoutProvider` plugin
> surface for layout algorithms including dwindle, master, and grid, plus
> drag, resize, move, and scratchpad interactions. It does not describe
> implemented behavior, does not authorize shipped, stable, or
> compatibility-guaranteed behavior beyond the accepted contract, and does not
> weaken any normative security control. No experimental implementation exists
> yet (none yet); any future experimental implementation may exist as review
> evidence but carries no compatibility promise beyond the accepted contract.
> The lifecycle is `Draft -> experimental review evidence -> Accepted ->
normative`.

## Purpose and scope

This specification imports the Hyprland workspace tiling philosophy into Bitty
and defines the accepted contracts for:

- **Identity hierarchy** — `Instance` contains `Window`s, each `Window` owns
  `Workspace`s, each `Workspace` owns one `LayoutTree` whose leaves are `View`s,
  each `View` may host at most one `Terminal` via `TerminalId`, with the
  invariant `ViewId` is not `TerminalId`;
- **Panel direction** — Panel is a candidate workspace-managed application
  container that generalizes View content; it is not a native OS `Window` or a
  PTY, and its lifecycle, Panel Runtime, and Event Bus remain future-RFC work;
- **Workspace as tiling compositor** — a `Workspace` is the tiling compositor
  inside a `Window`, directly mirroring the Hyprland import where a Hyprland
  workspace tiles windows and a Bitty `Workspace` tiles `View`s inside one
  `Window`;
- **LayoutTree H and V primitives** — the only Core layout primitives, used to
  compose the tiling;
- **View types** — `Terminal`, `Rich`, and `Browser` as the closed v1 set
  hosted by a `View`;
- **Core-owned decoration** — `gaps_in`, `gaps_out`, `border`, and `radius`
  owned by Core with validated bounds, never by plugins or layout algorithms;
- **Layout algorithms as plugin** — `dwindle`, `master`, and `grid` supplied as
  `LayoutProvider` plugins, not as Core built-ins;
- **Interactions** — drag, resize, move, and scratchpad semantics.

In scope: identity types and their ownership, Workspace composition rules,
`LayoutTree` shape and invariants, View type contracts, decoration ownership
and limits, `LayoutProvider` interface and algorithm selection, interaction
gestures and commands, Hyprland and Waybar reference handling, and verification
gates.

Out of scope (owned elsewhere):

- VT parser, grid, cursor, mode, and damage invariants (OQ-007,
  [Terminal State RFC](terminal-state-rfc.md));
- image, rich-block, scene, zone, and structured transport contracts (OQ-008,
  OQ-015, OQ-016, [Rich Presentation RFC](rich-presentation-rfc.md));
- Plugin API v1, capability families, manifest, and event pipeline classes
  (OQ-011, OQ-012, OQ-013, [Plugin Platform RFC](plugin-platform-rfc.md));
- per-plugin budgets, queue ceilings, and adversarial isolation tests (OQ-014,
  [Isolation Resource RFC](isolation-resource-rfc.md));
- Lua runtime, standard-library subset, and module search rules (OQ-009,
  [Lua Runtime RFC](lua-runtime-rfc.md)) and configuration layering (OQ-010,
  [Configuration Model RFC](configuration-model-rfc.md));
- CLI grammar and exit codes (OQ-017) and IPC wire format (OQ-018).

## Normative sources this specification must not weaken

- [Security Overview](../security/overview.md): untrusted-by-default posture,
  invariants 3 (presentation never Terminal Truth), 4 (no hot-path execution),
  7 (bounded inputs), and the P0 resource and capability rows.
- [Threat Model](../security/threat-model.md): untrusted PTY, plugin, and MCP
  content, presentation-only plugin influence, resource exhaustion (T-01), and
  terminal-to-desktop capability gates (T-13).
- [Core and Plugin Boundaries](../architecture/core-boundaries.md): mechanism
  versus policy split, Terminal Truth ownership, declarative UI, and the two
  security domains (`TerminalSecurityPolicy` versus `PluginCapabilities`).
- [Architecture Overview](../architecture/overview.md): one-way DAG
  dependencies, renderer snapshot isolation, and the headless prerequisite.

Where this draft selects a threshold or mechanism, it refines those sources; it
does not move a requirement between owners and does not create a bypass.

## Terminology

| Term             | Meaning                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Instance`       | Top-level Bitty process instance; owns one or more `Window`s and is the scope for `InstanceId`.                                            |
| `Window`         | Native OS window owned by `bitty-platform`; owns one or more `Workspace`s, exactly one of which is active. This is the only use of window. |
| `Workspace`      | Tiling compositor inside a `Window`; owns exactly one `LayoutTree` and composes `View`s via H and V splits. Mirrors a Hyprland workspace.  |
| `LayoutTree`     | Binary tiling tree whose interior nodes are `H` or `V` splits and whose leaves are `View`s.                                                |
| `View`           | Layout leaf that hosts at most one content type and has a stable `ViewId`; never conflated with `TerminalId`.                              |
| `Terminal`       | Terminal emulator instance with `TerminalId`, PTY, grid, and scrollback, hosted inside a single `View` at a time.                          |
| `ViewId`         | Stable identifier for a `View` leaf; distinct type from `TerminalId`.                                                                      |
| `TerminalId`     | Stable identifier for a `Terminal` instance; distinct type from `ViewId`, never reused for a `View`.                                       |
| `Rich`           | Rich presentation content hosted by a `View` via the `RichBlock` and scene contracts.                                                      |
| `Browser`        | Embedded browser surface hosted by a `View` under a dedicated capability.                                                                  |
| `LayoutProvider` | Plugin-supplied layout algorithm that computes split geometry for a `Workspace` without owning decoration or input.                        |

## Candidate Panel model

Panel is a candidate workspace-managed application container that generalizes
the content hosted by a `View`. A Panel is neither the native OS `Window`
owned by `bitty-platform` nor a PTY. A terminal panel may use a `TerminalId`
and PTY as backing content, but a Panel may also host non-terminal application
content. The existing `Window -> Workspace -> LayoutTree -> View` hierarchy,
distinct `ViewId` and `TerminalId` identities, H/V layout primitives, and
Core-owned decoration remain the draft compositor contract.

This is a candidate concept only. A future Panel RFC must decide whether Panel
is a typed View content binding, a replacement for LayoutTree leaves, or an
additional identity that composes with View. It must also define capability
mapping, focus and input routing, persistence, resource budgets, failure
containment, and cross-process behavior. Until that RFC is reviewed, this
specification makes no lifecycle or runtime implementation claim.

The native OS `Window` remains owned by `bitty-platform`; Panel must not expose
its handle. PTY ownership remains with terminal runtime/state. Layout geometry,
validation, and decoration remain Core-owned, and a Panel or provider must not
set `gaps_in`, `gaps_out`, `border`, or `radius`. A Panel Runtime and an
inter-Panel Event Bus are candidate future components, not contracts defined
here. Their lifecycle, event taxonomy, bounds, and host/plugin boundary belong
to that future RFC, informed by the future Panel Extensibility Vision document
(CTX-0094, pending review) and accepted [IPC and Agent RFC](ipc-agent-rfc.md).

Hyprland is a read-only philosophy reference for workspace tiling. Its
compositor windows are not Bitty Panels: Bitty `Window` means the native OS
window, while a candidate Panel is an application container inside the Bitty
workspace. Bitty does not copy Hyprland source, configuration syntax, or wire
format.

## Hyprland workspace tiling philosophy import

This specification adopts Hyprland as the explicit design precedent and maps it
to Bitty without copying Hyprland implementation details. Hyprland and Waybar
are read-only references for philosophy and interaction vocabulary; Bitty does
not embed Hyprland or Waybar code, configuration files, or configuration syntax.

| Hyprland concept                         | Bitty import                                                 | Adaptation                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hyprland workspace tiling windows        | `Workspace` tiling `View`s inside one `Window`               | A Hyprland workspace maps to a Bitty `Workspace`; a Hyprland window maps to a Bitty `View`, never to a Bitty `Window`. Window stays as the native OS window only. |
| `dwindle` `master` `grid` layouts        | `LayoutProvider` plugin algorithms `dwindle` `master` `grid` | Algorithms are plugins behind a capability, not Core built-ins; Core supplies only H and V primitives and decoration.                                             |
| `gaps_in` `gaps_out` `border` `rounding` | Core-owned `gaps_in` `gaps_out` `border` `radius`            | Owned by Core, validated via `ConfigPlan`; no plugin or `LayoutProvider` mutates these values at runtime.                                                         |
| Drag, resize, move between workspaces    | `View` drag, resize, move, and scratchpad                    | Gestures route through the command registry; `LayoutProvider` proposes geometry, Core commits it.                                                                 |
| Waybar `modules-left` `center` `right`   | Out of scope for this document                               | Waybar philosophy is owned by the Status System Specification; this document does not duplicate its registry.                                                     |

Rules of the import:

1. Hyprland and Waybar are named read-only references; no Hyprland or Waybar
   source is vendored and no Hyprland or Waybar configuration syntax is
   supported.
2. Every Hyprland-inspired behavior is re-expressed as a typed, validated
   contract; Hyprland load-order or file-concatenation semantics are never a
   fallback.
3. Presentation ownership stays with Core: `Workspace`, `LayoutTree`, and
   decoration are Core-owned; `LayoutProvider` plugins contribute only geometry
   proposals.

### No window leak

The term window appears in this specification only as `Window`, the native OS
window owned by `bitty-platform`. Inside `Workspace` tiling, the tiled unit is
always `View`, never window. Documentation, configuration keys, commands, and
code must not refer to a tiled `View` as a window, and `LayoutTree` geometry
must not expose a window handle, native surface, or OS window identifier. This
prevents the Hyprland window vocabulary from leaking into the in-Window tiling
model.

## Architectural placement

```text
Instance (InstanceId)
  +-- Window (WindowId)  [native OS window, bitty-platform]
        +-- Workspace (WorkspaceId)  [tiling compositor, active per Window]
              +-- LayoutTree { H | V | View(ViewId) }
                    +-- View (ViewId) -> content { Terminal(TerminalId) | Rich | Browser }
  +-- Window (WindowId)
        +-- Workspace (WorkspaceId)
              +-- LayoutTree
```

Rules:

1. `Instance` owns `Window`s; `Window` owns `Workspace`s; `Workspace` owns
   exactly one `LayoutTree`; `LayoutTree` leaves are `View`s; a `View` hosts at
   most one content instance.
2. `Terminal` lifecycle is owned by `bitty-runtime` and `bitty-term-state`; a
   `Terminal` is hosted by at most one `View` at a time, and moving a
   `Terminal` between `View`s preserves `TerminalId` while changing `ViewId`.
3. No `View`, `LayoutTree`, or `LayoutProvider` holds a PTY file descriptor,
   GPU object, or native window handle.

## Identity hierarchy and ViewId distinct from TerminalId

### Hierarchy

| Level       | Identifier    | Owner                    | Contains                                |
| ----------- | ------------- | ------------------------ | --------------------------------------- |
| `Instance`  | `InstanceId`  | process                  | one or more `Window`s                   |
| `Window`    | `WindowId`    | `bitty-platform`         | one or more `Workspace`s                |
| `Workspace` | `WorkspaceId` | `Workspace` compositor   | one `LayoutTree`                        |
| `View`      | `ViewId`      | `LayoutTree` leaf        | at most one `Terminal`/`Rich`/`Browser` |
| `Terminal`  | `TerminalId`  | `bitty-term-state`/`pty` | PTY, grid, scrollback                   |

Invariants:

1. Every identifier is a distinct newtype; `ViewId` and `TerminalId` are
   incompatible types and never compared, compared as integers, or transmuted.
2. Creating a `View` allocates a fresh `ViewId`; destroying it retires the
   `ViewId` without reallocating it within the same `Instance` generation.
3. Creating a `Terminal` allocates a fresh `TerminalId`; closing it retires the
   `TerminalId`; a `View` that previously hosted it retains its `ViewId`.
4. At most one `View` references a given `TerminalId` at any time; the mapping
   `TerminalId -> ViewId` is at most one-to-one and is tracked by Core.
5. Rebinding a `Terminal` to a different `View` is a move, not a copy; the
   `Terminal` state, scrollback, and PTY remain single-owned.

Illustrative shapes only; final spelling belongs to `bitty-runtime` and
`bitty-ui`:

```rust
// Illustrative shapes only; not an implemented API.
struct InstanceId(u64);
struct WindowId(u64);
struct WorkspaceId(u64);
struct ViewId(u64);
struct TerminalId(u64);

enum ViewContent {
    Empty,
    Terminal(TerminalId),
    Rich(RichBlockId),
    Browser(BrowserSurfaceId),
}

struct View {
    id: ViewId,
    content: ViewContent,
    focused: bool,
}
```

## Workspace as tiling compositor

A `Workspace` is the tiling compositor for one `Window`. It directly mirrors
the Hyprland philosophy where a Hyprland workspace tiles windows; a Bitty
`Workspace` tiles `View`s inside one `Window`.

Properties:

1. Exactly one `Workspace` per `Window` is active and rendered; inactive
   `Workspace`s retain their `LayoutTree` and `View` set without render cost.
2. Switching the active `Workspace` is O(1) pointer swap at the `Window` level;
   no `Terminal` is torn down or recreated.
3. Each `Workspace` composes its `LayoutTree` deterministically from the tree
   plus Core decoration; `LayoutProvider` proposes splits and sizes, Core
   validates and commits.
4. `Workspace` state is presentation only; it never mutates `Terminal` grid,
   cursor, modes, or scrollback. Terminal Truth remains owned by
   `bitty-term-state`.
5. The number of `Workspace`s per `Window` and `View`s per `Workspace` is
   bounded via `ConfigPlan` validation; exceeding a bound is a typed error with
   a diagnostic, never a panic.

## LayoutTree with H and V primitives

`LayoutTree` is a binary tiling tree. It is the sole Core layout primitive.

```text
LayoutTree := View(ViewId) | H { left: LayoutTree, right: LayoutTree, ratio: f32 } | V { top: LayoutTree, bottom: LayoutTree, ratio: f32 }
```

Rules:

1. Interior nodes are only `H` (horizontal split, left and right) or `V`
   (vertical split, top and bottom). No other split kind exists in Core.
2. `ratio` is the fraction allocated to the first child in `[0.1, 0.9]`,
   validated at construction and on every resize; out-of-range values are
   rejected, not clamped silently.
3. The tree is always well-formed: every `ViewId` appears at most once, every
   leaf is a `View`, and the tree contains at least one leaf.
4. Resizing a split adjusts only the `ratio` on the targeted `H` or `V` node;
   it never reorders siblings or moves `View`s between branches except via
   explicit move operations.
5. Rendering walks the tree once to produce `View` rectangles, then applies
   Core decoration (`gaps_in`, `gaps_out`, `border`, `radius`) without mutating
   the tree.
6. `LayoutProvider` algorithms may propose a new `LayoutTree` shape, but Core
   validates that the result contains exactly the same `ViewId` set plus any
   explicitly created or removed `View`s authorized by the operation.

Example composition:

```text
Window [gaps_out]
  Workspace
    H ratio=0.6
      +-- V ratio=0.5 { View(a) , View(b) }   [gaps_in between a and b]
      +-- View(c)                              [gaps_in between left and c]
```

## View types

`View` is the host for exactly one content type in v1. The set is closed.

| View type  | Content source                         | Capability gate        | Notes                                                                                               |
| ---------- | -------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| `Terminal` | `TerminalId` hosted via terminal state | none for basic hosting | PTY, grid, and scrollback remain owned by `bitty-term-state`; `View` holds only the host binding.   |
| `Rich`     | `RichBlock` scene via `bitty-rich`     | `ui.rich`              | Declarative `SceneNode` content composed by `bitty-rich`; no View-held GPU objects.                 |
| `Browser`  | Browser surface via embedder           | `browser.embed`        | Dedicated high-risk capability; embedder owns process isolation; View owns only the surface handle. |

Rules:

1. A `View` with `Empty` content renders as a placeholder and never claims a
   `TerminalId`.
2. Changing a `View` from `Terminal` to `Rich` or `Browser` detaches the
   previous content without destroying the `ViewId`; the `TerminalId` survives
   and may be rebound to another `View`.
3. `Rich` and `Browser` content is bounded under the same scene and resource
   ceilings as the [Rich Presentation RFC](rich-presentation-rfc.md).
4. View type is explicit in `ConfigPlan` and in the command that creates the
   `View`; no implicit promotion from `Terminal` to `Rich` occurs.

## Core-owned gaps, border, and radius

`gaps_in`, `gaps_out`, `border`, and `radius` are Core-owned decoration. They
are validated in `ConfigPlan` and applied by `Workspace` composition, never by
`LayoutProvider` plugins or `View` content.

| Property   | Meaning                                                   | Accepted default | Valid range | Owner |
| ---------- | --------------------------------------------------------- | ---------------- | ----------- | ----- |
| `gaps_in`  | Gap between adjacent `View`s inside one `Workspace`       | 4 px             | 0 to 32 px  | Core  |
| `gaps_out` | Gap between the `Workspace` tiling area and `Window` edge | 6 px             | 0 to 32 px  | Core  |
| `border`   | Border thickness drawn around each `View`                 | 2 px             | 0 to 8 px   | Core  |
| `radius`   | Corner radius for `View` frames                           | 6 px             | 0 to 16 px  | Core  |

Rules:

1. Values are integers in logical pixels, scaled by the `Window` DPI factor
   only at render time; layout math stays in logical pixels.
2. Unknown decoration keys or out-of-range values fail `ConfigPlan` validation
   with a source-attributed diagnostic; Core never falls back to a silent
   default when validation fails.
3. `LayoutProvider` proposals must not include decoration values; any proposal
   that carries `gaps_in`, `gaps_out`, `border`, or `radius` is rejected.
4. Decoration is applied after `LayoutTree` rectangle computation: `gaps_out`
   insets the `Workspace` area, `gaps_in` splits the remainder between
   siblings, `border` is drawn inside the `View` rectangle, `radius` clips the
   frame without affecting hit testing beyond the clipped bounds.
5. `bitty --safe` starts with `gaps_in = 0`, `gaps_out = 0`, `border = 1`,
   `radius = 0` regardless of user configuration.

## Shipped slice (implementation evidence)

Status: **experimental implementation evidence.** The single-window slice in
`bitty` `origin/main` (`1f31435`, verified read-only via
`merge-base --is-ancestor`) implements a bounded subset of this accepted
contract. It does not promote this specification beyond `Accepted`, does not
close its open items, and does not claim `Verified`/`Compatible`; the full
compositor above remains the target. Entries 1-4 record the single-window
compositor slice; entries 5-6 record `bitty-ui` presentation primitives merged
later. All cited commits are ancestors of `origin/main`, verified read-only via
`merge-base --is-ancestor`.

What merged, exactly:

1. **Core-owned decoration config surface** (`bitty` #487 `485fbfd`,
   CTX-0292): `decoration.gaps_in`/`gaps_out`/`border`/`radius` in logical px
   with the defaults and ranges in the table above, fail-closed `ConfigPlan`
   validation, scalar-replace per-field attribution, `Live` reload, and
   `bitty --safe` forcing `0/0/1/0`. The Core solver is carried
   (`layout_with_decoration`, `decorated_allocations`, `set_decoration`).
   Bounds and reload coverage: `bitty` #490 `5afb8a2` (CTX-0295).
2. **Workspace operations entry** (`bitty` #433 `227ca3a`, CTX-0257, DEC-0034):
   runtime-owned workspace slots with MRU order (capacity `16`), a pure
   workspaceline overlay string, and a presented overlay banner. Keys:
   `Alt+N` new, `Alt+1..9` focus, `Alt+-`/`Alt+=` previous/next, `Alt+Tab`
   last-used, `Alt+W` close. Close never kills silently: a live workspace
   arms a pending confirm, repeating the chord confirms, `Esc` cancels, and
   idle workspaces close immediately. `bitty ctl workspace list` rides
   `view.inspect`; `workspace new|focus|move` ride `view.manage`;
   `workspace close ws:N` requires the elevated `terminal.manage` scope
   because it kills live sessions.
3. **Move focused window across workspaces** (`bitty` #457 `8b987a0`,
   CTX-0259): `Mod+Shift+Number` and `ctl workspace move ws:N` reparent the
   focused leaf with its pane session untouched; same-workspace is a no-op
   and unknown targets fail closed with state untouched.
4. **Per-leaf presentation mode field** (`bitty` #449 `83847c6`, CTX-0276):
   `PresentationMode` on `View` unifies the zoom/overlay/visibility
   special-cases toward one field. Only `Tiled` is live; `Floating`,
   `Fullscreen`, and `Scratchpad` parse but every cross-mode transition is
   gated (follow-up), so existing zoom/overlay behavior stays byte-identical.
5. **Overlay z-index tiers** (`bitty` #368 `42d244e`, CTX-0217, closes
   `bitty` #367): `OverlayTier` derives `Ord` with
   `Editor < Float < Popup < Messages` (`BOTTOM`/`TOP` constants),
   `OverlayLayer` pairs a tier with a node and bounds, `overlay_tiered` carries
   an explicit tier, `overlay_stack` stable-sorts layers by tier so paint order
   is deterministic regardless of input order, and `overlay_tier` reads an
   overlay node's tier. The legacy `overlay` constructor keeps `Float` as its
   default and its single-overlay output byte-identical. The `bitty-ui`
   presentation layer reuses `OverlayTier::Float` for overlay-like
   `PresentationMode`s, but multi-tier stacking through
   `overlay_tiered`/`overlay_stack` is not yet consumed by the app present path.
6. **Adaptive dwindle `smart_split` orientation** (`bitty` #358 `75f8637`,
   CTX-0209, closes `bitty` #357): `LayoutNode::smart_split` and
   `smart_split_with_multiplier` choose the axis from the container aspect
   ratio with the Hyprland heuristic
   `splitTop = height * width_multiplier > width` (`smart_split_axis`): wide
   containers split side-by-side, tall containers stack, square ties break
   side-by-side, and non-finite or non-positive multipliers fall back to
   `1.0`. The constructors delegate to the explicit `split` path, whose API and
   geometry are unchanged, and the heuristic is unit-tested. This is an opt-in
   `bitty-ui` constructor, not the `LayoutProvider` dwindle plugin promised
   above, and the app split path still chooses an explicit axis.

Explicit non-claims: live present-path painting of px decoration is
**deferred** (`bitty` CTX-0294 on the CTX-0238g stage-2 renderer lane; the
single-window path still paints the cell-unit `layout.*` gaps), and the
`LayoutProvider` plugin algorithms, drag/resize interactions, and scratchpad
retention in this specification are not implemented in the slice. The
`smart_split` constructor and the overlay tiers above are opt-in `bitty-ui`
primitives recorded as evidence, not live compositor wiring.

## Layout algorithms as plugin via LayoutProvider

Layout algorithms are not Core built-ins. Core provides only `H` and `V`
primitives and decoration; `dwindle`, `master`, and `grid` are supplied by
`LayoutProvider` plugins.

### Provider contract

```rust
// Illustrative shapes only; not an implemented API.
trait LayoutProvider {
    fn id(&self) -> ProviderId;
    fn name(&self) -> BoundedString<32>; // dwindle | master | grid | ...
    fn propose(
        &self,
        workspace: &WorkspaceSnapshot,
        views: &[ViewId],
        area: LogicalRect,
    ) -> Result<LayoutTree, LayoutError>;
}
```

Properties:

1. **Capability gate**: registering a `LayoutProvider` requires
   `layout.provider` capability; the built-in no-op tiler that preserves the
   current `LayoutTree` needs no capability.
2. **Pure proposal**: `propose` is a pure function of the snapshot, view set,
   and available area; it holds no mutable `Workspace` handle and performs no
   filesystem, network, or PTY access.
3. **Deterministic**: same `WorkspaceSnapshot` and view set yields the same
   `LayoutTree`; nondeterminism inside a provider is a conformance violation.
4. **Bounded cost**: `propose` runs on the presentation cold path with an
   instruction and time budget enforced by the isolation ceilings; over-budget
   proposals are rejected and the previous tree is retained.
5. **Validation**: Core validates every returned `LayoutTree` for well-formedness,
   view set consistency, and `ratio` bounds before committing; invalid proposals
   are rejected with an attributed diagnostic.

### Algorithm mapping

| Algorithm | Hyprland precedent | Bitty behavior as LayoutProvider                                                                               |
| --------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `dwindle` | Hyprland dwindle   | Recursive H and V splits that spiral inward; direction alternates per depth; respects `gaps_in` only via Core. |
| `master`  | Hyprland master    | One master `View` on the left at a fixed ratio with remaining `View`s stacked vertically on the right.         |
| `grid`    | Hyprland grid      | Views arranged in a near-square grid using only `H` and `V` splits; empty cells render as empty `View`s.       |

Additional providers may be registered under qualified names
`owner.name:algorithm`; bare names `dwindle`, `master`, and `grid` are reserved
for the canonical providers. Unknown provider names fail validation.

### Selection

- The active provider for a `Workspace` is declared in `ConfigPlan` as
  `workspace.layout = "dwindle"` or a qualified provider name.
- Changing the active provider recomposes the `Workspace` at the next
  presentation tick; no `View` or `Terminal` is recreated.
- Each `Workspace` may use a different provider; the choice is per-workspace,
  not global.

## Interactions — drag, resize, move, scratchpad

All interactions route through the command registry and produce a validated
`LayoutTree` update; no interaction mutates the tree by direct pointer writes.

| Interaction  | Gesture or command                            | Effect                                                                                                                                  |
| ------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `drag`       | Pointer drag on `View` border or decoration   | Initiates a `View` move; drop target is a `View` edge or `Workspace`; Core re-parents the leaf in the tree.                             |
| `resize`     | Drag split handle between `View`s             | Adjusts the targeted `H` or `V` `ratio` within `[0.1, 0.9]`; never reorders leaves.                                                     |
| `move`       | `workspace.move_view` command or drag to edge | Moves a `View` to another `Workspace` in the same `Window`; source and destination trees are validated atomically.                      |
| `scratchpad` | `scratchpad.toggle` command                   | Moves a `View` to or from a special hidden `Workspace` per `Window`; hidden views incur no render cost and retain `ViewId` and content. |

Rules:

1. Drag and resize never run inside the VT parser or damage-to-snapshot path;
   they are presentation interactions with explicit hit testing against
   decoration-inclusive `View` rectangles.
2. Cross-workspace moves are atomic: both source and destination `LayoutTree`s
   are validated before either is committed; on validation failure both remain
   unchanged and a diagnostic is emitted.
3. Scratchpad is per `Window`, not per `Instance`; a scratched `View` is hidden
   but not destroyed, and `TerminalId` bindings survive the toggle.
4. Every interaction is undoable via the same command surface that the
   configuration and IPC layers use; no interaction relies on an ambient
   platform-specific shortcut alone.

## Hyprland and Waybar reference handling

Hyprland and Waybar are read-only philosophy references in this specification.

1. No Hyprland or Waybar source code, configuration snippet, or wire format is
   copied into Bitty, `bitty-config`, or any crate.
2. `ConfigPlan` keys use Bitty naming (`workspace.layout`, `gaps_in`,
   `gaps_out`, `border`, `radius`); Hyprland key spellings such as
   `general:gaps_in` are not accepted and fail validation with a diagnostic
   that points at the Bitty key.
3. Documentation may cite Hyprland and Waybar by name as precedents, but must
   not claim Bitty embeds or executes Hyprland or Waybar.

## Security review

This specification creates no ambient file, network, or process capability for
Lua and no bypass of the existing P0 gates.

1. `LayoutProvider` requires `layout.provider` capability; `Browser` requires
   `browser.embed`; `Rich` requires `ui.rich`. No provider widens its own
   capability without an explicit grant.
2. Decoration values are validated before use; no provider or `View` content may
   set `gaps_in`, `gaps_out`, `border`, or `radius` at runtime.
3. `ViewId` distinct from `TerminalId` prevents confused-deputy moves where a
   `Terminal` operation is misdirected at a `View` and vice versa.
4. Presentation ownership remains isolated: `Workspace` and `LayoutTree` never
   mutate `Terminal` state, and no plugin holds a PTY descriptor or GPU object.

## Verification

1. **Metadata and link gates**: `just check` must pass with zero markdownlint,
   link, metadata, language, agents, and hygiene issues for this document and
   its index entry, and `act -n` must report workflow dry-run success.
2. **Identity invariant tests** (acceptance gates):
   - `ViewId` and `TerminalId` are distinct types; a typed test asserts
     `ViewId(1) != TerminalId(1)` at the type level and that no API accepts one
     where the other is expected.
   - Moving a `Terminal` between `View`s preserves `TerminalId` and changes only
     `ViewId`; at most one `View` references a given `TerminalId`.
3. **LayoutTree tests**:
   - `H` and `V` are the only interior kinds; property tests assert every
     constructed tree round-trips through serialization and validation.
   - `ratio` outside `[0.1, 0.9]` is rejected; resize that would violate the
     range is rejected without tree mutation.
4. **Decoration tests**:
   - `gaps_in`, `gaps_out`, `border`, `radius` out of range or unknown keys fail
     `ConfigPlan` validation; `LayoutProvider` proposals that carry decoration
     are rejected.
   - `--safe` inverts to the safe decoration defaults regardless of user config.
5. **Provider tests**:
   - `dwindle`, `master`, and `grid` providers each produce well-formed trees for
     1 to 16 `View`s; invalid trees are rejected and the previous tree is
     retained.
   - Unregistered provider names fail validation; budget overruns in `propose`
     are contained by isolation ceilings.
6. **Interaction tests**:
   - Drag, resize, move, and scratchpad each have headless composition tests
     without a window or GPU, asserting rectangle equivalence and atomicity of
     cross-workspace moves.

## Open items remaining under this accepted specification

- Exact `LayoutProvider` trait spelling and error taxonomy beyond the
  illustrative sketch above.
- Whether Panel becomes typed `View` content, replaces `View` as a `LayoutTree`
  leaf, or composes as a separate identity; no `PanelId` is introduced here.
- Panel lifecycle ownership and the boundaries, capabilities, budgets, and
  failure semantics of a future Panel Runtime.
- Event Bus topic, payload, subscription, ordering, and cross-process semantics;
  accepted IPC framing and scopes remain the security baseline.
- Final `Workspace` limit defaults such as maximum `Workspace`s per `Window` and
  `View`s per `Workspace` after UX review.
- Whether `Browser` `View`s require an additional per-`Window` process budget
  beyond the existing isolation ceilings.
- Whether scratchpad history retains a stack or a single hidden slot per
  `Window` in v1.
- Concrete headless test harness placement for `Workspace` and `LayoutTree`
  composition.
- Whether `LayoutProvider` selection participates in `ConfigPlan` live reload
  or requires a `Workspace` recreation.

This specification is accepted as a standalone contract per CTX-0118; it
does not close an open question on its own beyond its standalone acceptance and
does not claim `Verified` or `Compatible` status. Remaining open items above
require follow-up RFCs or tasks per the
[documentation workflow](../development/documentation-workflow.md) and
[open-question register](../decisions/open-questions.md).

## References

- Hyprland: dynamic tiling Wayland compositor with workspaces, `dwindle`,
  `master`, and decoration model `gaps_in`, `gaps_out`, `border`, `rounding`.
- Waybar: highly customizable Wayland bar with composable modules and
  `modules-left`, `modules-center`, `modules-right` slot composition.
- [Configuration Model RFC](configuration-model-rfc.md)
- [Plugin Platform RFC](plugin-platform-rfc.md)
- [Isolation Resource RFC](isolation-resource-rfc.md)
- [Rich Presentation RFC](rich-presentation-rfc.md)
- [Lua Runtime RFC](lua-runtime-rfc.md)
