---
title: TerminalRegistry and View Lifecycle Contract
description: Defines the accepted TerminalRegistry and View lifecycle contract for TerminalId vs ViewId separation, RuntimeId vs PersistentId generation, attachment detachment focus layout visibility persistence reattachment vs recreation bounded resources and failure semantics with explicit multi-window daemon exclusions
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 26
---

# TerminalRegistry and View Lifecycle Contract

> Status: **accepted** on 2026-08-31 by independent docs-reviewer per
> CTX-0117 plus **Experimental Implementation** at `bitty` `c0aadd2`/`a8735d0`
> — accepted lifecycle contract with experimental code evidence (not
> `Verified`/`Compatible`). This document defines the accepted
> TerminalRegistry and View lifecycle contract referenced by OQ-005 (core
> workspace topology, ADR 0003) and OQ-007 (terminal state); it refines those
> accepted topologies with explicit identity, generation, attachment, focus,
> layout, visibility, persistence, reattachment, bounded resources, and failure
> semantics, and does not claim shipped, stable, or compatibility-guaranteed
> behavior beyond the accepted contract and experimental `c0aadd2`/`a8735d0`.
> Experimental code at `c0aadd2` (CTX-0095 PR #148, one registry per process,
> view-rect + DPI cell metrics -> PTY `SIGWINCH`/ConPTY, debounce `64`, full
> damage) plus `a8735d0` (CTX-0098 PR #151, `Runtime::write_replies` bounded
> `4`KiB relay) is `Implemented` (experimental) not `Verified` — it provides
> reviewable evidence for the accepted spec. Accepted behavior remains the
> existing [Terminal State RFC](terminal-state-rfc.md),
> [ADR 0003 Core Workspace Topology](../decisions/adrs/ADR-0003-core-workspace-topology.md),
> [Compatibility Milestone RFC](compatibility-milestone-rfc.md),
> [Platform tiers ADR](../decisions/adrs/ADR-0002-platform-support-tiers.md),
> [Architecture Overview](../architecture/overview.md),
> [Core and Plugin Boundaries](../architecture/core-boundaries.md), and
> clipboard audit at `bitty` `7a4ee41` (CTX-0097). The lifecycle for this
> document is `Draft -> Experimental Implementation -> Accepted -> Verified
-> Compatible` (spec) and `Draft -> experimental review evidence ->
Accepted -> normative` (document); `Accepted` is recorded per CTX-0117
> independent architecture/security review (2026-08-31) with no load-bearing
> defects, and experimental code remains distinct from `Accepted` and
> `Verified`.

## Purpose and scope

The single-window vertical slice proves one terminal behind one view. Bitty
must then scale that proof to one window hosting many terminals and views
without conflating identities, leaking PTY handles, or making resize, focus, or
persistence ambiguous. This RFC defines the accepted boundary between the
registry that owns terminal lifecycle, the view that owns observation and
interaction, and the workspace that owns layout and visibility.

In scope:

- strict `TerminalId != ViewId` with `RuntimeId` versus `PersistentId` and
  per-registry generation;
- registry creation and disposal, view attachment and detachment, focus
  ownership, layout geometry, visibility, and persistence;
- reattachment versus recreation after detach, hide, or process exit;
- resize routing from view rectangle to PTY geometry, reconciled with text
  metrics and DPI;
- alternate-screen and mouse-capture ownership;
- shared observation policy for snapshots without a second mutable attachment;
- bounded resources, typed failure semantics, and explicit exclusions.

Out of scope: multi-window orchestration, daemon (`bittyd`) and remote UI,
Panel Runtime and Event Bus, per-plugin view policy, exact key-binding defaults,
exact glyph hit-testing math, and registry or package-transport mechanics whose
contracts already reference this lifecycle as an ownership source.

Normative sources this RFC must not weaken are listed in
[Normative sources this specification does not weaken](#normative-sources-this-specification-does-not-weaken).
Where this specification selects a threshold it refines those sources; it does
not move a requirement between owners and does not create a bypass.

## Relationship to accepted sources

| Area                | Accepted fact (cite)                                                                                                                                                                                                    | Accepted by this specification                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topology            | 16-crate DAG, `Terminal -> Snapshot` only, MSRV 1.85 per [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) (OQ-005)                                                                                     | Placement of `TerminalRegistry` in `bitty-runtime` versus `bitty-ui` and exact trait spelling remain illustrative (see open items)                                              |
| Terminal invariants | `Action` is sole write into state, 8 invariants, `generation` damage, deterministic replay per [Terminal State RFC](terminal-state-rfc.md) (OQ-007)                                                                     | Registry generation pinning is accepted by this specification; which reflow algorithm is pinned remains the one chosen by the accepted text-rendering decision (see open items) |
| View identity       | `ViewId` distinct from `TerminalId`, at most one view per `TerminalId`, move preserves `TerminalId` per [Workspace Compositor](workspace-compositor.md) (draft)                                                         | `RuntimeId` and `PersistentId` separation, per-registry generation, and reattachment versus recreation rules are accepted by this specification                                 |
| Input               | M1 mouse modes, focus, bracketed paste per [Compatibility Milestone RFC](compatibility-milestone-rfc.md); bounded encoding, Kitty opt-in, shift override per [Input and Pointer Contract](input-pointer-rfc.md) (draft) | Which view owns focus and mouse capture when a terminal is detached, and how Kitty negotiation follows the terminal not the view, are accepted by this specification            |
| Text                | `cell.width` 1-or-2 plus trailing spacer, `Snapshot + Damage -> DrawList` seam per [Text and Rendering RFC](text-rendering-rfc.md) (draft)                                                                              | DPI-aware cell metrics that drive view-to-PTY resize and atlas ownership per view are accepted by this specification                                                            |
| Slice scope         | One process, one window, one workspace, one terminal end-to-end path per [Single-Window Vertical Slice Acceptance Plan](../product/vertical-slice-acceptance.md) (CTX-0109 draft)                                       | Generalization to one window with N terminals and views under one registry without multi-window or daemon is accepted by this specification                                     |

Any row whose right column was candidate in the draft is now accepted by this
specification per CTX-0117 (2026-08-31). `HeadlessRasterizer` and
`char_cell_width` approximation remain non-user-ready evidence per the
text-rendering draft until that draft is accepted.

## Normative sources this specification does not weaken

- [ADR 0003 Core Workspace Topology](../decisions/adrs/ADR-0003-core-workspace-topology.md) (OQ-005): one-way DAG; `bitty-vt`, `bitty-term-state`, `bitty-pty` never depend on UI, platform, plugin-host, config, runtime, or app; `bitty-render` reads only snapshots.
- [Terminal State RFC](terminal-state-rfc.md) (OQ-007): parser to `Action` to state is the only write path; 8 grid and mode invariants; damage `generation`; bounded reply buffer; deterministic replay and state hash.
- [Compatibility Milestone RFC](compatibility-milestone-rfc.md) (OQ-004): M1 required and allowed VT subset; M1 mouse, focus, and bracketed paste matrix; graceful ignore outside the subset.
- [ADR 0002 Platform Support Tiers](../decisions/adrs/ADR-0002-platform-support-tiers.md) (OQ-003): Tier 1 Linux x86_64 Wayland and X11, Windows x86_64 ConPTY, macOS ARM64 13+; Tier 2 Linux ARM64, macOS x86_64, FreeBSD x86_64.
- [ADR 0008 Headless](../decisions/adrs/ADR-0008-headless.md) (OQ-020): daemon and remote UI deferred post-v1.0; headless evidence does not equal accepted daemon.
- [Architecture Overview](../architecture/overview.md) and [Core and Plugin Boundaries](../architecture/core-boundaries.md): mechanism versus policy split; Terminal Truth owned by `bitty-term-state`; View and Layout are Core mechanisms; plugins never enter terminal, render, or input hot paths.
- [Rich Presentation RFC](rich-presentation-rfc.md) (OQ-008/015/016): `Image != Cell`; `ImageStore` and `ImagePlacement` are outside the cell lattice and enter snapshots only as placement metadata; scene and zone composition owns presentation.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (OQ-011/012/013), [Isolation Resource RFC](../specifications/isolation-resource-rfc.md) (OQ-014), [Configuration Model RFC](../specifications/configuration-model-rfc.md) (OQ-010): queue budgets PerSub 64, PerPlugin 1024 events and 256 KiB, Global 8192 events and 2 MiB, DropOldest v1 default, `BoundedText`, capability-checked host APIs, `ConfigPlan` validation.
- [Input and Pointer Contract](input-pointer-rfc.md) (CTX-0107 draft, candidate): typed `InputEvent`, router `Platform -> Router -> Keymap -> Encoder -> PTY`, platform divergence at adapter edge, capture and shift override, IME preedit as presentation.
- [Text and Rendering RFC](text-rendering-rfc.md) (CTX-0108 draft, candidate): UAX #29 and UAX #11 contracts, width function, DPI scaling, atlas and cache, IME overlay as ephemeral presentation.
- [Single-Window Vertical Slice Acceptance Plan](../product/vertical-slice-acceptance.md) (CTX-0109 draft, candidate): one process, one window, one workspace, one terminal end-to-end path and explicit exclusions.
- [Workspace Compositor Specification](workspace-compositor.md) (draft, candidate): `Instance -> Window -> Workspace -> LayoutTree -> View` hierarchy, `ViewId != TerminalId`, H and V primitives, Core-owned `gaps_in`, `gaps_out`, `border`, `radius`, `LayoutProvider` as plugin.
- [Security Overview](../security/overview.md), [Threat Model](../security/threat-model.md) (T-01, T-04, T-06, T-07, T-13), [Risk Register](../security/risk-register.md) (R-004, R-006, R-007, R-008), [P0 Acceptance Criteria](../security/p0-acceptance-criteria.md) (P0-AC-001..034): bounded inputs, no hot-path plugin execution, separate terminal and plugin security domains, authenticated privileged interfaces.

Where this specification selects a threshold or mechanism it refines those
sources; it does not move a requirement between owners and does not create a
bypass.

## Terminology

| Term               | Meaning                                                                                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TerminalRegistry` | Core-owned table that creates, tracks, and disposes `Terminal` instances and their PTY handles inside one `Instance`. Exactly one registry per process in this contract; per-window registries are excluded.                     |
| `Terminal`         | Emulator instance owning PTY master, grid, cursor, modes, scrollback, damage generation, reply buffer, charset and tab state, and image store references. Addressed by `TerminalId`, `RuntimeId`, and optionally `PersistentId`. |
| `TerminalId`       | Stable handle for a `Terminal` within one registry generation. Distinct newtype from `ViewId`, never compared or transmuted.                                                                                                     |
| `ViewId`           | Stable handle for a `View` leaf in a `LayoutTree`. Distinct newtype from `TerminalId`.                                                                                                                                           |
| `RuntimeId`        | Ephemeral identifier bound to a live PTY process incarnation. Changes on every recreation. Used for disambiguating stale events.                                                                                                 |
| `PersistentId`     | Optional stable identifier for a terminal that survives restarts when persistence is enabled. Not required for the single-window slice. Opaque string, validated and bounded.                                                    |
| `Generation`       | Monotonic `u64` per registry that increments on every `TerminalId` allocation and on every registry disposal. Combined with `TerminalId` it makes stale handles detectable.                                                      |
| `Attachment`       | Binding `ViewId -> TerminalId` that makes one view the unique interactive observer for one terminal. At most one view per terminal.                                                                                              |
| `Focus`            | Which `ViewId` inside the active `Workspace` owns keyboard, IME preedit, and wheel routing. Focus is per window, not global.                                                                                                     |
| `Visibility`       | Whether a `View` rectangle is composited. Invisible covers inactive workspace, scratchpad hidden, zero-area, and occluded by overlay but not destroyed.                                                                          |
| `Reattachment`     | Moving the same `TerminalId` and `RuntimeId` to a different `ViewId` without losing grid, scrollback, or PTY.                                                                                                                    |
| `Recreation`       | Allocating a fresh `TerminalId` and `RuntimeId` after the previous terminal exited or was explicitly closed.                                                                                                                     |

## Principles

1. Identity hygiene is load-bearing. `TerminalId`, `ViewId`, `RuntimeId`, and `PersistentId` are pairwise incompatible newtypes; no integer alias, no `as u64` bridge, no cross-type comparison.
2. Ownership is single and explicit. The registry owns `Terminal` lifecycle and PTY descriptors; the workspace owns `View` lifecycle and layout; a terminal is attached to at most one view at a time.
3. The hot path stays single-owner. `PTY -> VT -> Action -> Terminal state -> Snapshot + Damage -> Renderer` and `Input -> Encoder -> PTY` never pass through a registry lookup that Lua or a plugin can block.
4. Geometry flows one way. View rectangle plus cell metrics decide PTY size; PTY size never decides view rectangle except via a validated resize that Core commits.
5. Persistence never resurrects a live PTY. A `PersistentId` may rehydrate scrollback and configuration, but a new `RuntimeId` is required for a new process.
6. Every allocation is bounded before it happens. Counts, byte sizes, and string lengths are validated against `ConfigPlan` and fail with a typed error, never with unbounded growth or panic.
7. Failure is fail-closed and typed. A failed create, attach, resize, or reattachment returns an explicit error, emits a diagnostic, and leaves the previous valid state intact.

## Identity: TerminalId versus ViewId, RuntimeId, PersistentId, generation

### Strict separation

```rust
// Illustrative shapes only; not an implemented API.
struct TerminalId(u64);
struct ViewId(u64);
struct RuntimeId(u64);
struct PersistentId(BoundedString<64>);
struct Generation(u64);
```

Rules:

1. `TerminalId` and `ViewId` are distinct types. No function accepts one where the other is expected. A typed test asserts `ViewId(1)` does not equal `TerminalId(1)` at the type level and that no transmute or `From` bridge exists.
2. A `Terminal` is created with a fresh `(TerminalId, RuntimeId, Generation)`. `TerminalId` identifies the slot; `RuntimeId` identifies the live incarnation; `Generation` distinguishes reuse of the same numeric `TerminalId` after disposal.
3. A `View` is created with a fresh `(ViewId, Generation)`. `ViewId` numeric reuse after disposal requires a generation bump so stale `ViewId` handles are detectable.
4. `PersistentId` is optional, bounded to `<= 64` UTF-8 bytes, charset `[a-z0-9_-]`, and assigned only via `ConfigPlan` or an explicit `registry.create` option. It is never inferred from a shell title or OSC sequence and never accepted from PTY output. When absent the terminal is ephemeral.
5. Handles travel as `(id, generation)` pairs on every cross-component call. A call with a stale generation is rejected with `StaleHandle` before any PTY or grid access.

### Registry generation

- The registry holds a monotonic `registry_generation: u64` that starts at `1` per process and increments on every successful `TerminalId` allocation and on every registry disposal. Per-terminal `created_generation` is the registry value at allocation.
- The pair `(TerminalId, created_generation)` is the stable key for diagnostics and replay. Logging that prints only the numeric id without generation is a hygiene violation.
- Generation `u64::MAX` is never allocated; reaching `MAX - 1024` makes the next allocation fail with `GenerationExhausted` and requires a process restart. Wrapping is forbidden.

### Ownership of handles

| Handle         | Allocator                    | Owner after allocation              | Reusable                                                                             |
| -------------- | ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| `TerminalId`   | `TerminalRegistry`           | Registry                            | Only after disposal with generation bump                                             |
| `RuntimeId`    | Registry at spawn            | Registry and bound `Terminal`       | Never reused within same process                                                     |
| `PersistentId` | Caller via `ConfigPlan`      | Registry index, unique per registry | Reusable only after the previous terminal with that `PersistentId` is fully disposed |
| `ViewId`       | `Workspace` via `LayoutTree` | Workspace                           | Only after leaf removal with generation bump                                         |
| `Generation`   | Registry and Workspace       | Respective owner                    | Monotonic, never reused                                                              |

## TerminalRegistry lifecycle

### Creation

- One `TerminalRegistry` is created during `bitty-runtime` startup, after `ConfigPlan` validation and before any `View` is created. `ConfigPlan` validation rejects `0` for `max_terminals` before the registry is created; registry creation itself is synchronous and fails only with `ResourceExhausted` on PTY or platform allocation failure.
- The registry captures `ConfigPlan` limits `max_terminals`, `max_scrollback_lines`, and `max_views_per_workspace` at creation. Live reload that would lower a limit below current usage is rejected; raising a limit takes effect at the next creation attempt.
- The registry registers its metrics `registry.terminals.active`, `registry.terminals.total_created`, `registry.generations`, and `registry.rejected` as bounded counters. Unknown metric names are a bug.

### Disposal

- Registry disposal closes every live PTY with `SIGHUP` on Unix and `TerminateProcess` via ConPTY on Windows, drains reply buffers, drops `ImageStore` references for that terminal, and emits `TerminalClosed { terminal_id, runtime_id, reason }` once per terminal as a cold-path event. No grid is mutated after `TerminalClosed`.
- Disposal increments the registry generation, retires every `TerminalId`, and clears the `PersistentId` index. A disposed registry never services another call; callers receive `RegistryDisposed`.
- `bitty --safe` disposes the user registry and replaces it with an ephemeral registry whose limits are the safe defaults regardless of user configuration. The safe registry retains the same handle types and generation rules.

### Generation as stale-handle guard

- Every registry read validates `(id, generation)` before returning a reference. A stale read returns `StaleHandle { expected_generation, found_generation }` with a diagnostic.
- Snapshots embed `(TerminalId, RuntimeId, generation, snapshot_generation)` where `snapshot_generation` is the terminal damage generation from the [Terminal State RFC](terminal-state-rfc.md). Renderers and debug consumers that present a snapshot must not assume the terminal is still attached to the same view.

### Bounded resources

| Resource                    | Ceiling                                                                | Validation point             | Failure                                          |
| --------------------------- | ---------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------ |
| Live terminals per registry | `max_terminals` in `[1, 64]`, default `16`                             | `registry.create`            | `TooManyTerminals`                               |
| Views per workspace         | `max_views_per_workspace` in `[1, 32]`, default `16`                   | `workspace.create_view`      | `TooManyViews`                                   |
| Workspaces per window       | `max_workspaces_per_window` in `[1, 16]`, default `8`                  | `window.create_workspace`    | `TooManyWorkspaces`                              |
| TerminalId numeric space    | `u64` without reuse in same generation                                 | Allocation                   | `GenerationExhausted` before wrap                |
| PersistentId length         | `<= 64` bytes, UTF-8, charset `[a-z0-9_-]`                             | Creation                     | `InvalidPersistentId`                            |
| Reply buffer per terminal   | Bounded per terminal state RFC, drop-on-excess with flag               | PTY writer                   | Drop and set flag, never block                   |
| Scrollback                  | `max_scrollback_lines * columns * cell_bytes` bounded via `ConfigPlan` | Terminal creation and reflow | Truncate oldest, never unbounded growth          |
| Snapshot queue per terminal | At most one pending snapshot plus damage coalescing                    | Render tick                  | Coalesce damage, never queue unbounded snapshots |

All ceilings are validated in `ConfigPlan`; out-of-range values fail
validation with a source-attributed diagnostic. No ceiling is silently
clamped.

## View lifecycle: attachment, detachment, focus, layout, visibility, persistence

### Attachment and detachment

| Operation                                        | Behavior                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `attach(view_id, terminal_id)`                   | Binds `ViewId` to `TerminalId`. Requires `ViewId` exists and is not already attached, `TerminalId` exists and is not already attached elsewhere, and neither handle is stale. On success the view rectangle is measured, cell metrics are applied, and the terminal is resized via the resize path below. Emits cold-path `ViewAttached`. |
| `detach(view_id)`                                | Unbinds the view from its terminal, preserving both `ViewId` and `TerminalId`. The detached terminal retains its PTY, grid, scrollback, and `RuntimeId` but has no interactive view until reattached. The view becomes `Empty` and renders as a placeholder. Emits `ViewDetached`.                                                        |
| `move_terminal(terminal_id, from_view, to_view)` | Atomic reattachment: validates both views and the terminal, detaches from source and attaches to destination in one commit. On validation failure neither view changes. Preserves `TerminalId` and `RuntimeId`.                                                                                                                           |
| `replace(view_id, new_terminal_id)`              | Swap where the view previously held `old_terminal_id`. Old terminal becomes detached, not destroyed.                                                                                                                                                                                                                                      |

Rules:

1. At most one `View` references a given `TerminalId` at any time. The registry enforces this with a `terminal_to_view: Map<TerminalId, ViewId>` plus generation check. Attempting a second attachment returns `AlreadyAttached`.
2. Attachment does not copy grid or scrollback. The terminal remains single-owned by the registry; the view holds only the host binding and presentation state such as selection and viewport offset.
3. No view, `LayoutTree`, or `LayoutProvider` holds a PTY file descriptor, GPU object, or window handle. Those remain with the registry and `bitty-pty`.
4. Detaching the focused view clears focus ownership before the unbind commits; see focus below.

### Focus

Focus is per window and owned by the workspace that is active in that window:

1. Exactly zero or one `ViewId` per active workspace is focused. Zero occurs only when the window is unfocused, the workspace is empty, or the focused view was just detached. The window regains focus by focusing the most-recently-focused view per MRU order inside that workspace.
2. Focus follows the routing rule in the [Input and Pointer Contract](input-pointer-rfc.md): `Platform -> Router -> focused View -> keymap -> encoder -> PTY of the attached terminal`. Keyboard, IME preedit, and wheel routing all read the same focused `ViewId`. Mouse events use hit testing against view rectangles; keyboard and IME use focus regardless of pointer position.
3. Changing focus emits a cold-path `FocusChanged { window_id, workspace_id, old_view, new_view }` and synthesizes focus-report bytes `CSI I` and `CSI O` only when the newly focused terminal has enabled focus reporting `1004`. No focus change mutates terminal grid.
4. Detaching the focused view moves focus to the next view in MRU order inside the same workspace before the detach commits. Destroying the focused view does the same. If the workspace has no other view focus becomes `None` and keyboard input is dropped with a `no_focus` counter rather than routed to a stale terminal.
5. Focus is not a capability. A plugin that requests `terminal.input` still routes through the focused view; it cannot address a background view without an explicit capability.

### Layout

Layout is owned by the [Workspace Compositor](workspace-compositor.md) and its `LayoutTree` of H and V splits:

1. The workspace composes `LayoutTree` into `View` rectangles, then Core applies `gaps_in`, `gaps_out`, `border`, and `radius`. The registry never participates in rectangle math.
2. The only input the registry receives from layout is a validated `LogicalRect` per attached view at presentation tick or on explicit `view.resized` notification. The registry converts that rect to PTY geometry via the resize routing below and commits it as a terminal resize.
3. The number of workspaces per window and views per workspace is bounded per the table above. A `LayoutProvider` proposal that would exceed a bound is rejected and the previous tree is retained.

### Visibility

| Visibility state   | Meaning                                                                | Render and input effect                                                                                |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Visible            | View rectangle in the active workspace with non-zero area              | Snapshot is rendered; view participates in hit testing and may hold focus                              |
| Inactive workspace | View belongs to a workspace that is not the active one for its window  | Retains `ViewId`, attachment, and terminal; no render cost; not hit-testable; cannot hold window focus |
| Scratchpad hidden  | View moved to the per-window hidden workspace via `scratchpad.toggle`  | Same as inactive; `ViewId` and attachment survive the toggle per workspace-compositor draft            |
| Zero-area          | Layout produced a zero-width or zero-height rectangle after decoration | Treated as invisible; no PTY resize is issued; previous geometry is retained                           |
| Overlay occluded   | View is covered by a modal overlay                                     | Visible flag stays true but overlay owns input until dismissed; underlying view is not focused         |

Rules:

1. Visibility is a presentation property; it never mutates terminal grid, scrollback, or `RuntimeId`. A hidden view's terminal continues to receive PTY output and advance its damage generation.
2. A terminal whose view is invisible and whose layout area is zero retains its last committed size. No resize to `0 x 0` is ever forwarded to `bitty-pty` or the PTY.
3. Becoming visible again re-measures the view rectangle and re-enters the resize path; becoming invisible does not destroy the attachment.

### Persistence

Persistence distinguishes three scopes:

| Scope      | What persists                                                               | Mechanism                                                                                                                        |
| ---------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Session    | `ViewId`, `LayoutTree`, attachment map, focus MRU, workspace set per window | `ConfigPlan` workspace snapshot, bounded and validated; no PTY handles persisted                                                 |
| Scrollback | Grid and scrollback contents for terminals with `PersistentId`              | Rehydrated as grid snapshot at next creation, capped by `max_scrollback_lines`; PTY history before rehydration is not fabricated |
| Process    | Live PTY, `RuntimeId`, reply buffer, alternate-screen state                 | Never persisted. A new process always allocates a fresh `RuntimeId` even when `PersistentId` is reused                           |

Rules:

1. Enabling persistence requires `persistence.enabled = true` in `ConfigPlan` plus an explicit per-terminal `persistent_id` at creation. Absent `PersistentId` the terminal is ephemeral and its scrollback is dropped on disposal.
2. Rehydration on next launch creates a fresh `TerminalId` and `RuntimeId` with the same `PersistentId`. The rehydrated terminal starts with the persisted scrollback as immutable history and a fresh empty visible grid. Replayed PTY output from the previous session is not synthesized.
3. `PersistentId` reuse within one live registry requires the previous terminal with that id to be fully disposed. Attempting to create a second live terminal with the same `PersistentId` returns `PersistentIdInUse`.

## Resize routing: view rectangle to PTY geometry

Reconciled with the [Text and Rendering RFC](text-rendering-rfc.md) and [Terminal State RFC](terminal-state-rfc.md):

1. The workspace produces a `LogicalRect` per attached view in logical pixels. The registry converts it to `(cols, rows)` using the DPI-aware cell metrics `cell_width` and `cell_height` from the text contract. Calculation is `cols = floor(rect.width / cell_width)`, `rows = floor(rect.height / cell_height)`, clamped to `[1, 1024]` each and then to configured `max_cols` and `max_rows`. Division by zero is impossible because `cell_width` and `cell_height` are validated positive integers at startup.
2. The computed `(cols, rows)` is the only size forwarded to `bitty-pty` as `SIGWINCH` on Unix and `ConPTY` resize on Windows. The PTY size is never taken from window size directly and never bypasses the view rectangle.
3. Resize is synchronous at the registry and debounced at the presentation edge: at most one resize per presentation tick per terminal; intermediate rectangles inside the same tick are coalesced to the latest rect. A resize storm beyond `64` queued rects per tick drops the oldest with a `resize_coalesced` counter.
4. Every committed resize increments the terminal damage generation with full-grid damage plus affected scrollback reflow range, per the terminal-state damage model. The reflow algorithm is singular for this contract and is the one pinned by whichever text-rendering decision accepts it; this specification does not introduce a second reflow branch.
5. Cursor integrity and geometry invariants from the terminal state RFC are revalidated after the resize before any snapshot is published. Violation is a bug that returns `ResizeInvariantViolation` and leaves the previous size committed.

## Alternate-screen and mouse-capture ownership

Reconciled with the [Input and Pointer Contract](input-pointer-rfc.md) and [Terminal State RFC](terminal-state-rfc.md):

1. Alternate-screen state is terminal state (`DECSET 1049` and related). Entering alternate screen saves the primary-screen cursor, style, and mode set; exiting restores them. The registry does not duplicate this state per view.
2. Mouse capture (modes `1000`, `1002`, `1003`, `1006`) is terminal state per terminal, but its effect is per attached view. A mouse event is captured and encoded to PTY only when the terminal of the focused or hit-tested view has enabled a mouse mode and the view is visible. Inactive or hidden views never capture.
3. Shift override is unconditional: holding Shift on a mouse press, drag, or release bypasses capture for that event and routes it to the selection path for the hit-tested view, per the input draft. The registry does not arbitrate Shift; the router does, then notifies the registry of the selection outcome only as presentation state.
4. On alternate-screen exit all queued but not yet encoded captured events are re-evaluated as uncaptured before encoding. Already encoded bytes remain in the PTY buffer; they are not recalled.

## Shared observation policy

1. Mutable attachment is exclusive: at most one `View` is attached to a given `TerminalId` at any time, enforced by the registry. This preserves the single-owner hot path and the damage-generation ordering.
2. Shared observation is read-only and runs through the snapshot path only. A second view may present the same terminal's `Snapshot + Damage` when an explicit `observe` capability is granted, but it holds no encoder handle to that terminal and its input always routes to its own attached terminal or is dropped.
3. The slice in the [Single-Window Vertical Slice Acceptance Plan](../product/vertical-slice-acceptance.md) uses neither shared attachment nor shared observation. One view observes one terminal via its attachment. Shared read-only observation is a future extension that requires its own capability, budget, and isolation review and is not authorized by this specification.
4. Plugins observe committed effects through the bounded cold-path event queue only. No plugin reads grid internals, holds a `TerminalId` handle without a capability, or bypasses the snapshot.

## Reattachment versus recreation

| Situation                                            | Required behavior                                                                                                                                                                                                                                                | Preserved                                                                                  | New                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `detach(view)`                                       | View becomes empty, terminal stays live with same `TerminalId` and `RuntimeId`, no PTY close                                                                                                                                                                     | `TerminalId`, `RuntimeId`, grid, scrollback, modes, cursor, reply buffer, generation       | Nothing                                           |
| `attach(view, terminal)` where terminal was detached | Rebind same `TerminalId` to new view, re-measure rectangle, resize PTY, preserve history                                                                                                                                                                         | Same `TerminalId` and `RuntimeId`                                                          | New `ViewId` binding, possibly new geometry       |
| `move_terminal`                                      | Atomic detach and attach as one commit                                                                                                                                                                                                                           | `TerminalId`, `RuntimeId`                                                                  | New `ViewId` binding                              |
| Terminal process exits                               | Registry emits `TerminalExited { terminal_id, runtime_id, exit_code }`, retains `TerminalId` until explicitly closed, view stays attached but input is dropped and status is surfaced; `PersistentId` scrollback remains available for rehydration if configured | `TerminalId` handle for inspection, scrollback, exit reason                                | No new `RuntimeId` until recreation               |
| `registry.close(terminal_id)`                        | Destroys the PTY, clears the attachment if any, retires the `TerminalId` with a generation bump; `PersistentId` index entry is cleared                                                                                                                           | Nothing live; persisted scrollback retained only if `PersistentId` and persistence enabled | New `TerminalId` and `RuntimeId` on next create   |
| Rehydration from persistence                         | Creates a new terminal with same `PersistentId` after previous one was closed                                                                                                                                                                                    | `PersistentId`, persisted scrollback as immutable history                                  | Fresh `TerminalId`, fresh `RuntimeId`, fresh grid |

Rules:

1. Reattachment is always preferred to recreation when the terminal is still live. Recreation is required only after `TerminalExited` and `close`, or when the caller explicitly requests a fresh terminal.
2. `PersistentId` never causes a live `RuntimeId` to be resurrected. The PTY process is always fresh.
3. A stale `(TerminalId, generation)` handle that refers to a closed terminal returns `StaleHandle`; a call that supplies the current generation but the terminal has exited returns `TerminalExited`.

## Failure semantics

All operations return a typed `RegistryError` or `ViewError` and leave the previous valid state intact. No operation panics and no operation partially commits.

| Error                 | When                                                                           | Diagnostic                                 | Recovery                                                                            |
| --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `TooManyTerminals`    | `registry.create` would exceed `max_terminals`                                 | `max_terminals` and current count          | Close an unused terminal or raise the limit via `ConfigPlan`                        |
| `TooManyViews`        | `workspace.create_view` would exceed `max_views_per_workspace`                 | Bound and current count                    | Close a view or raise the bound                                                     |
| `AlreadyAttached`     | Terminal already attached to a different view                                  | `terminal_id`, `current_view`, generations | Detach first or use `move_terminal`                                                 |
| `ViewAlreadyAttached` | View already hosts a terminal                                                  | `view_id`, `existing_terminal_id`          | Detach the view first or use `replace`                                              |
| `StaleHandle`         | Generation mismatch                                                            | Expected and found generations, both ids   | Re-resolve the handle from the registry or workspace                                |
| `RegistryDisposed`    | Operation on a disposed registry                                               | Registry generation                        | Create a new registry via process restart; no reuse                                 |
| `TerminalExited`      | Input or resize addressed to an exited terminal                                | `exit_code`, `runtime_id`                  | Collect scrollback, then `close` and optionally recreate                            |
| `PersistentIdInUse`   | Second live terminal with same `PersistentId`                                  | `persistent_id`                            | Close the existing terminal first                                                   |
| `InvalidPersistentId` | Charset, length, or UTF-8 violation                                            | Offending bytes and bound                  | Supply a valid id per the charset above                                             |
| `InvalidGeometry`     | View rect is zero-area or would map outside `[1, 1024]` after clamping         | Rect, cell metrics, computed cols and rows | Layout must produce a non-zero rect; no `0 x 0` PTY                                 |
| `GenerationExhausted` | Registry generation within `1024` of `u64::MAX`                                | Current generation                         | Restart the process; no wrap                                                        |
| `ResourceExhausted`   | PTY spawn or platform surface allocation failed                                | Platform error, no PTY fd leaked           | Retry or report; registry remains valid                                             |
| `IncompatibleMode`    | Kitty `CSI ? 7727` or mouse `1002` state inconsistent with requested operation | Mode set, terminal id                      | Re-negotiate via the PTY; no silent fallback beyond legacy encoding per input draft |

Every error increments a bounded diagnostic counter `registry.errors.<variant>` and is available via the debug protocol. Error strings and counters are bounded and never echo unbounded PTY content.

## Explicit exclusions (not authorized)

The following remain explicitly out of scope for this contract and are not
authorized as shipped, stable, or compatibility-guaranteed behavior by this
accepted specification. Each requires its own RFC or ADR with independent
architecture, security, and performance review before it can be claimed.

| Excluded                                               | Why deferred                                                                                                                                                    | What this specification does instead                                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Multi-window                                           | Window is the native OS object owned by `bitty-platform`; orchestrating many windows adds focus, DPI, and platform lifetime questions not owned by the registry | One `Instance` owns one `Window` for the vertical slice; one registry per process; one window per registry in this contract |
| Daemon `bittyd` and session persistence across reboots | OQ-020 deferred daemon post-v1.0 per [ADR 0008](../decisions/adrs/ADR-0008-headless.md); daemon trust boundary and lifecycle not reviewed here                  | Process-scoped registry only; persistence is scrollback rehydration via `PersistentId`, not daemon attach                   |
| Remote UI                                              | Cross-host transport and authentication add a new trust boundary not evaluated here                                                                             | No remote wire format, no remote capability mapping, no network port                                                        |
| Panel Runtime and inter-Panel Event Bus                | Panel as a workspace-managed application container and its runtime and bus remain future-RFC work per the workspace-compositor and panel-vision drafts          | View content stays `Terminal`, `Rich`, `Browser`, or `Empty`; no `PanelId`, no Event Bus topic, no runtime scheduler        |
| Global menu or system tray as registry owner           | Not part of the terminal lifecycle                                                                                                                              | Owned elsewhere if proposed                                                                                                 |
| Live migration of a PTY between processes              | Requires daemon and cross-process fd transfer                                                                                                                   | Move is between views in the same window only                                                                               |

Claiming any excluded behavior by citing this specification is a
documentation hygiene violation. Cross-document references must preserve the
deferred status.

## Security review

This specification creates no ambient file, network, or process capability
for Lua and no bypass of existing P0 gates.

1. PTY file descriptors, GPU objects, and window handles remain with `bitty-pty`, `bitty-render`, and `bitty-platform`; no view, `LayoutTree`, or registry caller receives them.
2. `PersistentId` is caller-supplied via `ConfigPlan` and validated; PTY output never sets or mutates it. This prevents a remote shell from claiming a persistent identity via an escape sequence.
3. Focus, mouse capture, and resize routing are Core-owned mechanisms; no plugin mutates them without a capability and no `LayoutProvider` sets decoration or PTY size directly.
4. Bounded resources are validated before allocation; exceeding a ceiling returns a typed error and never grows heap without bound, preserving invariant 7.
5. The separate terminal and plugin security domains from the core boundaries are preserved. A terminal requesting a resource via an escape sequence and a plugin requesting the same resource via a host API traverse different policies and produce distinct audit events.

## Verification

1. **Metadata and link gates**: `just check` must pass with zero markdownlint, link, metadata, language, agents, and hygiene issues for this document and its index entries, and `act -n -W .github/workflows/ci.yml` must report workflow dry-run success.
2. **Identity invariant tests** (acceptance gates):
   - `TerminalId`, `ViewId`, `RuntimeId`, `PersistentId`, and `Generation` are distinct types; no API accepts one where another is expected; stale generation is rejected with `StaleHandle`.
   - Creating and destroying a terminal retires its `TerminalId` without reuse in the same generation; creating and destroying a view retires its `ViewId` similarly; a terminal moved between views preserves `TerminalId` and `RuntimeId` and changes only `ViewId`.
3. **Registry tests**:
   - `registry.create` beyond `max_terminals` returns `TooManyTerminals`; `PersistentId` charset and length violations return `InvalidPersistentId`; duplicate live `PersistentId` returns `PersistentIdInUse`; reaching `u64::MAX - 1024` returns `GenerationExhausted`.
   - Disposal closes every live PTY, retires every handle, clears the `PersistentId` index, and makes every further call return `RegistryDisposed`.
4. **View lifecycle tests**:
   - `attach` when either side is already attached returns `AlreadyAttached` or `ViewAlreadyAttached`; `move_terminal` is atomic and leaves both views unchanged on failure; `detach` preserves `TerminalId` and `RuntimeId`.
   - Focus MRU survives detach and destroy of the focused view; input with no focused view is dropped with a `no_focus` counter; inactive or scratched views do not capture mouse, `0 x 0` rect never reaches the PTY.
5. **Resize routing tests**:
   - View rectangle plus DPI-aware cell metrics decide cols and rows; zero-area rect, clamped out-of-range geometry, and debounce coalescing at `64` rects per tick are covered; every committed resize revalidates cursor integrity and geometry invariants.
6. **Alternate-screen and capture tests**:
   - Alternate-screen entry saves and exit restores primary cursor and modes; mouse capture is per terminal but effective only for visible attached views; Shift override routes to selection regardless of capture.
7. **Reattachment versus recreation tests**:
   - Detached terminal survives with same ids; reattached terminal retains history; exited terminal reports `TerminalExited`; `close` retires the id and a subsequent create with the same `PersistentId` rehydrates scrollback but allocates fresh `TerminalId` and `RuntimeId`.
8. **Headless composition tests**: workspace view rectangles, registry lifecycle, focus, and resize routing each have headless tests without a window or GPU, asserting rectangle equivalence and atomicity.

## Open items remaining under this accepted specification

- Exact `TerminalRegistry` trait spelling, error taxonomy, and crate placement beyond the illustrative sketches above.
- Whether `PersistentId` participates in `ConfigPlan` live reload or requires registry recreation, and whether rehydrated scrollback is limited to the configured `max_scrollback_lines` or a narrower bound.
- Whether `RuntimeId` is exposed to the debug protocol and IPC scopes, and which scope may read it.
- Final defaults for `max_terminals`, `max_views_per_workspace`, and `max_workspaces_per_window` after UX review with the compositor.
- Whether shared read-only observation via snapshots requires a dedicated capability and queue budget beyond the existing cold-path queue PerSub 64, PerPlugin 1024 events and 256 KiB, Global 8192 events and 2 MiB.
- Whether zero-area visibility retains a placeholder snapshot or nothing at all for accessibility.
- Concrete headless test harness placement for registry, generation, and reattachment.
- Whether `LayoutProvider` selection and workspace persistence interact with `PersistentId` or remain orthogonal.
- How `bitty --safe` ephemeral registry limits interact with a user `ConfigPlan` that declares `PersistentId` entries.

This specification refines OQ-005 and OQ-007 at the lifecycle level per
CTX-0117; it does not open a new OQ and does not claim `Verified` or
`Compatible` status. Remaining open items above require follow-up RFCs or
tasks per the [documentation workflow](../development/documentation-workflow.md)
and [open-question register](../decisions/open-questions.md).

## References

- [ADR 0003 Core Workspace Topology](../decisions/adrs/ADR-0003-core-workspace-topology.md) — one-way DAG, MSRV 1.85, crate graph.
- [Terminal State RFC](terminal-state-rfc.md) — `Action` stream, 8 invariants, damage `generation`, deterministic replay, bounded replies.
- [Compatibility Milestone RFC](compatibility-milestone-rfc.md) — M1 required and allowed VT, mouse, focus, bracketed paste matrix.
- [ADR 0002 Platform Support Tiers](../decisions/adrs/ADR-0002-platform-support-tiers.md) — Tier 1 and Tier 2 promises.
- [ADR 0008 Headless](../decisions/adrs/ADR-0008-headless.md) — daemon and remote UI deferred post-v1.0.
- [Input and Pointer Contract](input-pointer-rfc.md) — candidate bounded keyboard, mouse, wheel, gesture, IME, selection, encoder, focus and capture ownership.
- [Text and Rendering RFC](text-rendering-rfc.md) — candidate UAX #29, UAX #11, fallback, shaping, emoji, atlas, DPI, IME overlay.
- [Single-Window Vertical Slice Acceptance Plan](../product/vertical-slice-acceptance.md) — candidate one process, one window, one workspace, one terminal acceptance.
- [Workspace Compositor Specification](workspace-compositor.md) — draft `Instance -> Window -> Workspace -> LayoutTree -> View`, `ViewId != TerminalId`, H and V, Core-owned decoration, `LayoutProvider`.
- [Architecture Overview](../architecture/overview.md) and [Core and Plugin Boundaries](../architecture/core-boundaries.md) — ownership and hot-path isolation.
- [Configuration Model RFC](../specifications/configuration-model-rfc.md) — `ConfigPlan` validation and reload.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) and [Isolation Resource RFC](../specifications/isolation-resource-rfc.md) — capability families, queue budgets, `BoundedText`, isolation ceilings.
- [Security Overview](../security/overview.md), [Threat Model](../security/threat-model.md), [Risk Register](../security/risk-register.md), [P0 Acceptance Criteria](../security/p0-acceptance-criteria.md) — normative security baseline.
- [Performance Budget RFC](../specifications/performance-budget-rfc.md) — PB-1..PB-7, input latency `<= 8 ms p50` and `<= 15 ms p99`, plugin hot-path exclusion.
- Hyprland: dynamic tiling Wayland compositor with workspaces, `dwindle`, `master`, and decoration model `gaps_in`, `gaps_out`, `border`, `rounding`.
