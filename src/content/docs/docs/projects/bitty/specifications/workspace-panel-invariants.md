---
title: Workspace Panel Invariants (Candidate)
description: Candidate testable invariant set for Workspace View Panel Terminal Session identity ownership lifecycle focus and reload boundaries in the live single-window runtime
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 33
---

# Workspace Panel Invariants (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document freezes a first invariant
> batch for `WorkspaceId` / `ViewId` / `PanelId` / `TerminalId` / session
> identity / focus, following the M4 Workspace/Panel invariant-hardening
> recommendation summarized inline in
> [Purpose and scope](#purpose-and-scope). It is
> checked read-only against `bitty` `origin/main` revision
> `01ffdda` (2026-09-14), the merge of the linked `ctx-0405` pull request, plus
> the linked `ctx-0414` pull request (#671) that adds the inactive-close
> regression checks, and the session save/restore revision `668a461`
> (2026-09-20) cited by the F-2 row. Rules are marked **Accepted** when an
> accepted specification already requires them, **Candidate** when only a
> draft pre-study or gap analysis proposes them, and **Implementation-only**
> when only shipped code and tests define them. This document authorizes no
> shipped, stable, or compatibility-guaranteed behavior; it does not weaken
> any accepted source it cites.

## Purpose and scope

The M4 Workspace/Panel bug classes summarized here — `ViewId`
collisions, wrong session ownership, split without a shell, grid/content-frame
mismatch, focus transitions, and workspace lifecycle — are all
ownership/identity/lifecycle invariant failures rather than missing features.
This document turns the accepted and candidate contracts for those areas into
an ID'd, testable invariant set and maps every invariant to an executable
check or an explicit `uncovered — follow-up` entry.

In scope:

- identity and uniqueness rules for live workspace, view, panel, terminal, and
  session handles;
- ownership rules for PTY, grid, parser, damage, and focus;
- lifecycle rules for create, attach, detach, move, split, close, zoom,
  workspace switch, and reload/restart boundaries;
- focus rules for the active workspace;
- reload persistence boundaries as implemented today.

Out of scope: multi-window orchestration, the deferred daemon and remote UI,
cross-process session hosts, and any behavior the accepted sources exclude.
Where this document restates an accepted rule it cites the accepted document
by absolute URL and does not re-define it.

## Status vocabulary

| Status                         | Meaning in this document                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Accepted                       | An accepted specification already requires the rule; this document adds a testable wording.                                        |
| Candidate                      | Only the Panel Runtime pre-study, the UI compositor gap analysis, or this document proposes the rule; review is still open.        |
| Implementation-only            | Shipped `bitty` code and tests define the rule; no specification states it yet.                                                    |
| Implementation-only (untested) | Shipped code defines the rule but no executable check exists; used where a coverage cell can only cite source behavior.            |
| Tested                         | An executable check in `bitty` covers the invariant at revision `01ffdda` plus the linked `ctx-0405` and `ctx-0414` pull requests. |
| Uncovered — follow-up          | No executable check exists; a follow-up task is required before the invariant can be frozen as accepted.                           |

## Source contracts

| Source                                                                                                                                                                 | Status    | Used for                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------- |
| [TerminalRegistry and View Lifecycle Contract](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/terminal-registry-view-lifecycle-rfc.md) | Accepted  | terminal/view identity, attachment, focus, visibility, persistence  |
| [Terminal state and action invariants](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/terminal-state-rfc.md)                           | Accepted  | damage generation, resize invariants, deterministic replay          |
| [Workspace Compositor Specification](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/workspace-compositor.md)                           | Accepted  | `Workspace -> LayoutTree -> View` hierarchy, `ViewId != TerminalId` |
| [Panel Runtime and Event Bus Pre-Study](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-pre-study.md)                     | Candidate | `PanelId`, panel lifecycle states, focus routing, bounds            |
| [UI and Compositor Gap Analysis](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/ui-compositor-gap-analysis.md)                         | Candidate | point-in-time shipped-versus-missing compositor status              |

Accepted sources: the lifecycle RFC, the terminal state RFC, and the workspace
compositor. Candidate sources: the panel runtime pre-study and the UI
compositor gap analysis. The registry lifecycle RFC explicitly excluded Panel
Runtime, `PanelId`, and the Event Bus from its accepted scope; invariants that
depend on `PanelId` are therefore candidate until the pre-study is promoted to
an accepted RFC. OQ-058 (spatial multi-agent orchestration, panel/session
lifecycle coupling) tracks the candidate contract that depends on these
identity and ownership rules; this document does not answer OQ-058.

## Identity model as implemented

Two layers exist in `bitty` at revision `01ffdda`, and their invariants are
distinct:

1. **Live app path** — `bitty-ui` layout types plus `bitty-runtime::Runtime`.
   `ViewId` is a newtype in `bitty-ui`; the runtime owns the active
   `LayoutNode` and a vector of stashed workspace slots. Pane sessions are a
   `BTreeMap<ViewId, PaneSession>`, so the session identity is the owning
   `ViewId`. The runtime-global primary grid has a single owner leaf,
   `Runtime::primary_view()`.
2. **Experimental registry path** — `bitty-runtime::registry`
   (`TerminalRegistry`, `PanelRegistry`), the one-registry-per-process layer
   with `TerminalId`, `WorkspaceId`, `RuntimeId`, `PersistentId`, `PanelId`,
   and `Generation`. Its tests are the evidence for the accepted lifecycle
   RFC's generation and attachment rules.

There is **no `SessionId` type**. Session identity is positional at both
layers: a pane session is identified by its live `ViewId`, and a registry
terminal incarnation is identified by `RuntimeId`. If a future RFC introduces
`SessionId`, it must be a distinct newtype with no `From` bridge to
`ViewId`, `TerminalId`, `PanelId`, or `RuntimeId`, and it must follow the same
generation-retirement rule as `ViewId` and `TerminalId`.

| Handle         | Defining type                            | Allocation                                                           | Uniqueness scope (enforced)                                     |
| -------------- | ---------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| `WorkspaceId`  | `bitty-runtime` registry                 | `create_workspace` monotonic raw counter plus registry generation    | Registry-wide, retired with generation bump                     |
| `ViewId`       | `bitty-ui`                               | `Runtime::next_view_id_global` (`max` over active layout plus slots) | Active layout plus all stashed slots; retired ids may be reused |
| `PanelId`      | `bitty-ui` (type), registry (allocation) | `PanelRegistry::create_panel` monotonic raw counter plus generation  | Registry-wide, retired on dispose                               |
| `TerminalId`   | `bitty-runtime` registry                 | `create_terminal` monotonic raw counter plus registry generation     | Registry-wide, retired with generation bump                     |
| `RuntimeId`    | `bitty-runtime` registry                 | Registry at spawn, per live PTY incarnation                          | Never reused within one process                                 |
| `PersistentId` | `bitty-runtime` registry                 | Caller-supplied, bounded `[a-z0-9_-]`, `<= 64` bytes                 | Unique among live terminals per registry                        |

## Invariants

Each invariant has an ID, a testable statement, its source status, and its
coverage. `bitty` test paths are relative to the `bitty` repository root.

### Identity and uniqueness

| ID       | Invariant                                                                                                                                                                           | Status              | Coverage                                                                                                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WS-INV-1 | A `ViewId` is unique among every **live** leaf: the active layout plus every stashed workspace slot.                                                                                | Accepted, refined   | Tested — `panel_invariants.rs::randomized_layout_ops_keep_view_identity_unique`, `split_allocator_never_reuses_a_live_id`; `runtime/workspaces.rs` inline `next_view_id_global_accounts_for_inactive_slots` |
| WS-INV-2 | `WorkspaceId`, `ViewId`, `PanelId`, `TerminalId`, `RuntimeId`, and `Generation` are pairwise distinct newtypes; no `From` bridge or transmute aliases one family to another.        | Accepted            | Tested — registry `terminal_id_and_view_id_are_distinct_types`, `panel_id_distinct_and_generation_monotonic`                                                                                                |
| WS-INV-3 | At most one `View` references a given live `Terminal`, and a `View` hosts at most one content instance; a move preserves `TerminalId` and `RuntimeId` and changes only the binding. | Accepted            | Tested — registry `attach_when_already_attached_returns_error`, `move_terminal_atomic_preserves_ids`, `reattachment_vs_recreation`                                                                          |
| WS-INV-4 | A retired numeric `ViewId` is never reallocated within one runtime instance; reuse requires a generation bump so stale handles are detectable.                                      | Accepted            | **Uncovered — follow-up.** `Runtime::next_view_id_global` allocates `max(live) + 1` and does not track retired ids, so a fully retired id can be reallocated. See follow-up F-1.                            |
| WS-INV-5 | A `PanelId` is unique per registry generation; disposing a panel retires `(PanelId, Generation)`; stale-granularity calls fail closed.                                              | Candidate           | Tested — panel `lifecycle_declared_created_mounted_focused_suspended_disposed`, `stale_handle_rejected`, `generation_exhaustion_fails_closed`                                                               |
| WS-INV-6 | A workspace slot keeps a stable creation sequence (`WorkspaceSlot::seq`) across index shifts, and the workspace MRU holds each live index exactly once.                             | Implementation-only | Partially tested — `workspaces.rs` inline `new_switch_prev_next_last_update_tabline`, `switch_preserves_per_workspace_layouts`; `seq` stability is Implementation-only (untested) (follow-up F-4)           |

### Ownership

| ID        | Invariant                                                                                                                                                                                                                      | Status              | Coverage                                                                                                                                                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WS-INV-7  | Every grid has exactly one owner: a pane session is keyed by exactly one live `ViewId`; the primary grid is owned by at most one live leaf (`primary_view`), and no workspace close may leave the owner pointing at a dead id. | Accepted, refined   | Tested — `panel_invariants.rs::closing_workspace_rehomes_moved_primary_owner`, `panel_session_invariants.rs::randomized_live_ops_preserve_session_ownership_and_geometry`, `primary_owner_rehomes_only_on_close`                                                                                                                                                               |
| WS-INV-8  | A leaf paints from at most one grid source: its own pane session when present, otherwise the primary grid iff it is the primary owner, otherwise erased. No grid is painted by two leaves.                                     | Accepted            | Tested — `split_zoom_repaint.rs::sessionless_unfocused_leaf_renders_blank_not_primary`, `sessionless_primary_stays_with_owner_when_focus_moves`, `mixed_shape_never_clones_primary_into_sessionless_leaf`, `workspace_new_leaf_renders_empty_not_previous_primary`, `zoom_off_does_not_duplicate_primary_into_sessionless_leaves`, `pane_session_tile_shows_only_its_own_grid` |
| WS-INV-9  | A pane session's id is always a live leaf id; closing a leaf tears its session down; layout-only operations never kill a session. Kill-on-close is explicit and bounded.                                                       | Implementation-only | Tested — `pane_sessions.rs::close_pane_session_tears_down_child`, `panel_session_invariants.rs::zoom_hides_panes_without_killing_sessions`, randomized live sequence                                                                                                                                                                                                           |
| WS-INV-10 | Keyboard and IME input route only to the focused leaf's own writer; the primary writer is a fallback exclusively on the primary owner; a fresh workspace leaf owns its own shell.                                              | Accepted            | Tested — `pane_sessions.rs::input_routes_to_focused_pane_only`, `multipane_input_falls_back_to_buffer_without_writer`, `workspace_new_leaf_owns_its_shell_and_input_never_crosses`, `keymap_split_pane_still_owns_its_grid_and_input`                                                                                                                                          |
| WS-INV-11 | Closing a workspace tears down exactly the pane sessions owned by that workspace's leaves, never another workspace's.                                                                                                          | Implementation-only | Tested — `workspaces.rs` inline `live_close_needs_repeat_confirm_and_kills`, `idle_close_is_immediate_and_last_resets`; randomized live sequence asserts no orphaned session ids                                                                                                                                                                                               |

### Lifecycle

| ID        | Invariant                                                                                                                                                                                                                                                 | Status              | Coverage                                                                                                                                                                                                                                                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WS-INV-12 | A split allocates its new `ViewId` through the single global allocator and installs the tree atomically through `set_layout`; a refused split leaves layout, focus, and sessions unchanged.                                                               | Candidate           | Tested — `workspaces.rs` inline `next_view_id_global_is_pure_until_a_leaf_commits`; `panel_invariants.rs` randomized sequences; `panel_session_invariants.rs` live splits                                                                                                                                                                  |
| WS-INV-13 | A workspace never strands empty: the last-leaf close is refused; closing the last workspace resets to a fresh idle leaf; closing an inactive workspace preserves the active workspace's live layout and focus; creation fails closed at `MAX_WORKSPACES`. | Implementation-only | Tested — `workspaces.rs` inline `idle_close_is_immediate_and_last_resets`, `new_fails_closed_at_capacity`; `panel_invariants.rs::close_last_leaf_refuses_and_move_replaces_source_leaf`, `panel_invariants.rs::inactive_workspace_close_preserves_active_layout_focus_and_owner`; `chrome_keys.rs` inline `close_last_leaf_helper_refuses` |
| WS-INV-14 | Moving the focused leaf to another workspace preserves its `ViewId` and session; the moved id appears in exactly one slot; a single-leaf source is replaced by a fresh leaf.                                                                              | Implementation-only | Tested — `workspaces.rs` inline `move_multi_leaf_preserves_focus_and_tabline`; `panel_invariants.rs::close_last_leaf_refuses_and_move_replaces_source_leaf`; `panel_session_invariants.rs::pane_grid_follows_move_promoted_sibling`                                                                                                        |
| WS-INV-15 | Zoom is a presentation swap: it hides sibling leaves without destroying sessions, reallocating ids, or losing focus; restore returns the exact tree.                                                                                                      | Candidate           | Tested — `split_zoom_repaint.rs::zoom_on_and_off_force_full_present`, `zoom_round_trip_preserves_primary_owner_and_content`, `zoom_off_does_not_duplicate_primary_into_sessionless_leaves`; `panel_invariants.rs::zoom_round_trip_preserves_ids_and_focus`; `panel_session_invariants.rs::zoom_hides_panes_without_killing_sessions`       |
| WS-INV-16 | A workspace switch or an inactive-slot close preserves each surviving slot's stashed layout and focus; the active mirror equals the loaded slot; switching is focus-valid on every slot.                                                                  | Implementation-only | Tested — `workspaces.rs` inline `switch_preserves_per_workspace_layouts`, `new_switch_prev_next_last_update_tabline`; registry `inactive_workspace_visibility_not_rendered_but_retains_attachment`; randomized sequences scan every slot; `panel_invariants.rs::inactive_workspace_close_preserves_active_layout_focus_and_owner`          |
| WS-INV-17 | Creating a workspace applies the primary shell recipe to the fresh leaf when one exists; on spawn failure the leaf stays session-less and input is buffered, never routed to another workspace's shell.                                                   | Implementation-only | Tested — `pane_sessions.rs::workspace_new_leaf_owns_its_shell_and_input_never_crosses`; `split_zoom_repaint.rs::workspace_new_leaf_renders_empty_not_previous_primary`                                                                                                                                                                     |

### Focus

| ID        | Invariant                                                                                                                                                                                                         | Status            | Coverage                                                                                                                                                                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WS-INV-18 | Focus is zero-or-one per active workspace and is always a live member of the active layout; `set_focus` rejects non-members and leaves focus unchanged; every stashed slot's focus is a live member of that slot. | Accepted, refined | Tested — `panel_invariants.rs` randomized scan (all slots), `panel_session_invariants.rs::assert_session_ids_live`; `runtime_layout.rs::set_layout_retains_focus_when_still_present`; registry `focus_mru_survives_detach_and_destroy`                                              |
| WS-INV-19 | Removing or destroying the focused leaf re-homes focus before the edit commits; an explicit close of the primary owner re-homes the primary grid to the focused survivor; focus moves never re-home the owner.    | Accepted, refined | Tested — registry `focus_mru_survives_detach_and_destroy`, `create_view_focuses_the_new_view`; `panel_session_invariants.rs::primary_owner_rehomes_only_on_close`; `panel_invariants.rs::closing_workspace_rehomes_moved_primary_owner`; randomized live sequence (workspace close) |
| WS-INV-20 | A focus change forces a full present and never mutates a terminal grid.                                                                                                                                           | Candidate         | Tested — `pane_damage.rs::focus_change_reprocesses_every_leaf`; `split_zoom_repaint.rs::focus_moves_force_full_present`, `set_focus_change_forces_full_present`                                                                                                                     |

### Geometry and damage

| ID        | Invariant                                                                                                                                                                                                                                                                                                                                     | Status    | Coverage                                                                                                                                                                                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WS-INV-21 | Every painted content frame is non-degenerate: derived `cols`/`rows` are at least 1 and clamped to the grid maximum; zero-area rectangles never reach a PTY.                                                                                                                                                                                  | Accepted  | Tested — registry `zero_area_never_reaches_pty_and_retains_previous_geometry`, `logical_rect_to_grid_floor_and_clamp`; `present_frames` clamps per frame (Implementation-only (untested) source behavior)                                                                                                                            |
| WS-INV-22 | After any layout, container, workspace, or focus-driven reflow that changes leaf boundaries (split, close, move, switch, zoom, window resize), every visible pane session's grid and PTY winsize equal its decorated content frame. A session spawned with explicit dimensions keeps the caller-declared size until the next geometry change. | Candidate | Tested — `panel_session_invariants.rs::pane_grid_follows_resize_then_workspace_switch`, `pane_grid_follows_move_promoted_sibling`, randomized live sequence; `pane_sessions.rs::pane_grid_tracks_leaf_allocation_across_layout_changes`; `split_live_reflow.rs` suite. Defect found and fixed under `ctx-0405` (see F-5).            |
| WS-INV-23 | Per-pane damage is confined to the damaged pane: a clean pane's pixels are reused byte-identically; output produced while hidden paints on the next visible frame; focus changes are full invalidation.                                                                                                                                       | Accepted  | Tested — `pane_damage.rs::split_output_reprocesses_only_the_damaged_pane`, `focus_change_reprocesses_every_leaf`, `hidden_pane_output_paints_when_visible_again`                                                                                                                                                                     |
| WS-INV-24 | View-rectangle resize routing is debounced and revalidated: the pending queue is bounded at 64 queued rectangles, at most one resize commits per terminal per presentation tick, and zero-area rectangles never reach a PTY. A committed surface (`handle_resize`) resize bumps the damage generation.                                        | Accepted  | Tested — registry `debounce_64_coalesces_and_counts` (bounded queue, coalescing, one flush per tick) and `zero_area_never_reaches_pty_and_retains_previous_geometry`; generation bump: `resize_scrollback.rs::runtime_handle_resize_actually_resizes_state_and_is_headless`; surface/DPI resize semantics: `runtime_resize.rs` suite |

### Reload and persistence boundaries

| ID        | Invariant                                                                                                                                                                                                                  | Status              | Coverage                                                                                                                                                                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WS-INV-25 | Reload never resurrects a live PTY or `RuntimeId`. Session-scoped facts (scrollback capacity, shell recipe, pane sessions) take effect at the next session creation; a process restart always allocates fresh ids.         | Accepted, candidate | Implementation-only — `panes.rs` captures scrollback capacity at session creation; the restart half is covered by the session suite (revision `668a461`), while live reload semantics stay untested and tracked as follow-up F-2.                                                             |
| WS-INV-26 | Rehydration creates a fresh `TerminalId` and `RuntimeId` under the same `PersistentId`; a second live terminal with the same `PersistentId` is rejected; rehydrated scrollback is immutable history, never live PTY state. | Accepted            | Tested at registry scope — `reattachment_vs_recreation`, `persistent_id_validation_and_in_use`, `stale_handle_rejected_with_expected_and_found`; registry identities stay registry-scoped, while the runtime serialization side ships at `668a461` (F-2).                                     |
| WS-INV-27 | `bitty --safe` opens no background image and keeps an ephemeral, bounded registry; no persisted resource is loaded implicitly.                                                                                             | Accepted            | Tested — `background_images_present.rs::no_image_config_opens_nothing_and_presents_no_background` (no file opened, no background presented), `background_images_present.rs::validate_background_images_gate_matches_startup`; `workspace_panel.rs::safe_mode_rejects_workspace_without_panic` |

## Verification map

| Check                                                                                                                                                                                                  | Covers                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `cargo test -p bitty-runtime --test panel_invariants --locked`                                                                                                                                         | WS-INV-1, 12, 13, 14, 15, 16, 18, 19 (headless randomized + inactive-close regressions) |
| `cargo test -p bitty-runtime --test panel_session_invariants --locked`                                                                                                                                 | WS-INV-7, 9, 14, 15, 18, 19, 22 (live pane sessions)                                    |
| `cargo test -p bitty-runtime --lib --locked`                                                                                                                                                           | WS-INV-6, 11, 12, 13, 14, 16 (workspace slots)                                          |
| `cargo test -p bitty-runtime --test pane_sessions --test pane_damage --test runtime_layout --test runtime_resize --test resize_scrollback --test split_live_reflow --test split_zoom_repaint --locked` | WS-INV-8, 9, 10, 17, 20, 21, 22, 23, 24                                                 |
| `cargo test -p bitty-runtime --test background_images_present --test workspace_panel --locked`                                                                                                         | WS-INV-27                                                                               |
| Registry unit tests (`cargo test -p bitty-runtime --lib registry --locked`)                                                                                                                            | WS-INV-2, 3, 5, 16, 18, 19, 21, 24, 26                                                  |

All checks run headless. Live-session tests require a POSIX shell and a PTY on
Unix; they skip cleanly under the repository PTY gate on unsupported
platforms.

## Uncovered and follow-ups

| ID  | Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Proposed action                                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-1 | WS-INV-4 retirement: `Runtime::next_view_id_global` reuses a fully retired numeric `ViewId` once no live leaf holds it; the accepted lifecycle RFC requires a generation bump so stale handles stay detectable.                                                                                                                                                                                                                                                                                                                                                | Follow-up task: add runtime-layout retirement tracking or a per-runtime monotonic allocator, then assert stale-id rejection in a property test.                                                                  |
| F-2 | WS-INV-25/26 runtime persistence: atomic session save/restore now exists in `bitty-runtime` at revision `668a461` (2026-09-20) — versioned `SessionSnapshot` (format v1) of workspace slots, layout trees, focus, MRU order, bounded per-pane scrollback, and captured `OSC 7` cwd, written atomically and decoded fail-closed before any mutation; tested by 30 tests (22 in `crates/bitty-runtime/tests/session_save_restore.rs`, 8 inline in `crates/bitty-runtime/src/runtime/session.rs`). The registry `PersistentId` identities remain registry-scoped. | Serialization side resolved; live reload semantics for scrollback capacity stay tracked here; the persistence contract itself (restart persistence) stays Open (`RFC-OQ-9`); keep the accepted RFC's boundaries. |
| F-3 | `SessionId` is not a type; session identity is the owning `ViewId` (panes) and `RuntimeId` (registry terminals).                                                                                                                                                                                                                                                                                                                                                                                                                                               | Follow-up RFC decision before any `SessionId` type is introduced; keep pane session keying by live `ViewId` until then.                                                                                          |
| F-4 | WS-INV-6 workspace `seq` stability across index shifts has no dedicated executable check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Follow-up test in the workspace unit suite.                                                                                                                                                                      |
| F-5 | WS-INV-22 defect found and fixed under `ctx-0405`: pane grid and PTY winsize stayed at the pre-resize size after a workspace switch, and at the pre-promotion size after a workspace move promoted a sibling; the primary owner could also remain bound to the id of a leaf destroyed by a workspace close.                                                                                                                                                                                                                                                    | Fixed in the linked `bitty` pull request (`ctx-0405`); the new invariant tests are the regression guard.                                                                                                         |

| F-6 | WS-INV-13/16 defect found by the `ctx-0405` review (finding F1) and fixed under `ctx-0414` (bitty PR #671, issue #668): closing an inactive workspace reloaded the active slot from its stale stash, discarding the active workspace's live layout and focus, and with three or more workspaces silently switched the active workspace. | Fixed in the linked `bitty` `ctx-0414` pull request (PR #671); `panel_invariants.rs::inactive_workspace_close_preserves_active_layout_focus_and_owner` is the regression guard. |

## References

- [TerminalRegistry and View Lifecycle Contract](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/terminal-registry-view-lifecycle-rfc.md) — accepted identity, attachment, focus, visibility, and persistence contract.
- [Terminal state and action invariants](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/terminal-state-rfc.md) — accepted damage generation and replay contract.
- [Workspace Compositor Specification](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/workspace-compositor.md) — accepted `Workspace -> LayoutTree -> View` hierarchy and `ViewId != TerminalId`.
- [Panel Runtime and Event Bus Pre-Study](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-pre-study.md) — candidate panel lifecycle and `PanelId` contract.
- [UI and Compositor Gap Analysis](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/ui-compositor-gap-analysis.md) — candidate point-in-time implementation status.
- [Architecture Overview](../architecture/overview.md) and [Core and Plugin Boundaries](../architecture/core-boundaries.md) — ownership and boundary sources.
- M4 Workspace/Panel invariant-hardening findings (summarized inline in Purpose and scope) that produced this document.
