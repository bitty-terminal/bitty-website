---
title: Chrome Surface Contract (Candidate)
description: Candidate contract for the window chrome surfaces Bar rail tab strip notification area and command surface their ownership read-only rules and chrome slot admission
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 42
---

# Chrome Surface Contract (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record states the chrome-surface
> contract the candidate
> [Workspace-Native UI Runtime](ui-runtime-candidate.md) assumes (U-4) and the
> owner-pending Window Chrome RFC (U-9, item 5) would own. It authorizes no
> shipped behavior, weakens no accepted source it cites, and makes no
> implementation claim; every type name, key spelling, and slot name below is a
> candidate spelling.

## Purpose and scope

The compositor defines where panel content is tiled. Chrome is everything the
window draws that is not tiled panel content: the Bar (the StatusBar of the
draft [Status System Specification](status-system.md)), the WorkspaceRail, the
tab strip, the notification area, the command surface, and the overlay root.
Those surfaces exist today as separate directions — the Bar in a draft
specification, the rail and tab strip in candidate PW items, the overlay root in
the accepted Panel Runtime contract — and no single document states what they
share and what they must never do.

In scope: the chrome surface inventory, their common read-only rules, the
authority split between Core, user, and plugin, chrome-slot admission, the
relationship between the Bar and the rail, and the chrome-side consumption of
overlay tiers.

Out of scope and owned elsewhere: the Bar's module budget and metrics (draft
Status System); PW-4 Bar configurability and PW-8 drag-to-Bar semantics
(candidate, [Panel and Workspace Interaction](panel-workspace-interaction-candidate.md));
overlay tier composition (draft,
[Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md));
presentation-mode gating (accepted, [Workspace Compositor](workspace-compositor.md));
appearance keys (accepted,
[Lua and XDG configuration](../configuration/lua-and-xdg.md#appearance-knobs-supported-reference));
plugin chrome-slot grants (accepted v1 surface,
[Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 3 (presentation never Terminal Truth), invariant 4 (no hot-path
  execution), invariant 7 (bounded inputs).
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): panel identity,
  focus routing, the `4+1` overlay envelope, and the rule that chrome reads
  identity and declarative state and never mutates grid.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted):
  the hierarchy, `gaps_out` insetting the tiling area, Core-owned decoration,
  and the no-window-leak rule.
- [Status System Specification](status-system.md) (draft): the single
  bottom-anchored Bar, the closed set of built-in module identifiers, the
  bounded per-module text, icon, and tooltip lengths, the capped total bar
  segment count, and the module cadence and failure posture.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  (accepted): the closed v1 slot set (`terminal | top | bottom | left | right |
tabline | statusline | overlay`), the exclusive tabline declaration, and the
  `SceneNode` subset (`Text | Row | Column | List`).

## Terminology

| Term                | Meaning in this document                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome surface      | A non-tiled presentation surface owned by Core: Bar, rail, tab strip, notification area, command surface, overlay root.               |
| Chrome slot         | A bounded region of a chrome surface into which a declarative subtree may be mounted under a capability grant.                        |
| Read-only rule      | Chrome reads identity, title, focus, and order and renders declarative segments; it never mutates grid, cursor, modes, or scrollback. |
| Core-owned geometry | Chrome placement, thickness, and the decoration insets that follow from it; never set by a plugin or `LayoutProvider`.                |
| Chrome authority    | Window and shell chrome are Core plus user final, with plugin requests only; panel content is plugin-controlled within budget.        |

## Chrome surface inventory

| Surface           | Owns                                                                 | Status of its contract                                       |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Bar / StatusBar   | Workspace indicator, module segments, status diagnostics             | Draft (Status System); PW-4 extends to any edge, candidate   |
| WorkspaceRail     | Workspace list, active-workspace indication, creation target         | Candidate (PW-8 drop target; U-4 direction)                  |
| Tab strip         | Panel projections for one `Window`/`Workspace`: order, active, close | Candidate (PW-10)                                            |
| Notification area | Transient notifications and banners on the `Messages` tier           | Candidate; consumes the accepted overlay envelope            |
| Command surface   | Command palette and query surfaces on the `Palette` kind             | Candidate; consumes the accepted overlay envelope            |
| Overlay root      | The composition point where overlay layers attach                    | Accepted behavior (Panel Runtime `4+1`); naming is candidate |

## Rules

1. **Chrome is presentation, never Terminal Truth.** No chrome surface mutates
   grid, cursor, modes, scrollback, attachment, or IPC policy. This is the
   accepted invariant restated for the full chrome inventory.
2. **Chrome geometry is Core-owned.** Placement, thickness, and the resulting
   `gaps_out` inset are decided by Core; an edge change recomputes the Workspace
   tiling area before the next present and never resizes a PTY as a side effect.
3. **Chrome reads identity, not content.** A chrome surface may read
   `PanelId`, title, focus, and presentation order. It may not read terminal
   grid contents, scrollback, or another panel's buffer except through the
   bounded Event Bus or snapshot path.
4. **Chrome authority split.** Window and shell chrome are Core plus user
   final, with plugin requests only; panel chrome is Core or user final, with
   plugin requests; panel content is plugin-controlled within the host budget.
   A plugin never takes authority from the user or the safety policy.
5. **Chrome slots are admitted, bounded, and closed.** v1 admits the closed slot
   set of the accepted Lua Surface RFC. The tabline slot is an exclusive
   declaration (one declarant); status components may layer. No slot admits
   arbitrary rendering, native handles, or global coordinates.
6. **No chrome surface is a focus target.** Focus belongs to a panel, a view, or
   an overlay; a chrome surface may show the focused item but never receives
   keyboard or IME input itself. A pointer interaction on chrome routes through
   the command registry as a validated update.
7. **Chrome never enters the hot path.** No chrome segment is recomputed per
   keystroke or per PTY read; segments update on their own cadence and
   invalidation, and a revision or an active animation is the only wakeup
   source.
8. **Chrome composes with the overlay envelope.** Notifications use the
   `Messages` tier, the command surface uses `Palette`, and the overlay root
   never acquires its own modal gate; the single modal authority of the
   [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)
   applies unchanged.
9. **Chrome animation composes with the accepted animation contract.**
   Durations stay in `0..=500` ms with the closed easing set; reduced motion and
   `bitty --safe` collapse to the final committed state.
10. **The Bar and the rail are two surfaces, not one.** The rail projects
    workspaces; the Bar projects status modules and the active-workspace
    indicator. Whether the rail replaces or composes beside the Bar remains
    open (U-4); sharing configuration keys does not merge the contracts.

## Chrome-side consequences of the candidate UI runtime

- U-4's chrome keys, Panel Rule grammar, cascade, and safety-policy rank are
  **new candidate spellings** and are not defined here; this record fixes the
  surface contract they would consume.
- The candidate `WorkspaceScene` layering keeps chrome above the tiled content
  and below modal overlays; the ordering is a direction, not an accepted layer
  order.
- A panel rule may express a request about chrome (for example, hiding the
  strip); only Core plus user final applies it, and the request is auditable.

## Security review

Chrome is a presentation surface with no authority. This record adds no
capability and no host surface; it restates the accepted read-only rule for a
wider inventory and keeps chrome slots inside the accepted closed set and
budget. Two properties matter for review: a plugin gains no ability to read
another panel's content through chrome, and chrome geometry can never drive a
PTY resize. No `P0` criterion is affected; a security reviewer is required if a
future revision admits a new chrome slot family or grants chrome a modal
surface.

## Verification plan

1. A headless test asserting an edge change of the Bar recomputes the tiling
   area and issues no PTY resize.
2. A test asserting a chrome surface receiving keyboard input routes it to the
   focused panel or overlay and never consumes it itself.
3. A source-level assertion that chrome segment producers read identity or
   declarative state only, with no path to grid or scrollback.
4. A test asserting the tabline slot admits exactly one declarant and rejects a
   second with a typed error.
5. A documentation-lint assertion that no chrome surface is described as a
   tiling leaf or a panel after this record lands.

## Alternatives considered

| Alternative                                                   | Trade-off                                                                       | Disposition                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Fold chrome into the Panel Runtime RFC as a section           | One document to read; widens an accepted RFC with candidate material            | Rejected — accepted text stays stable                 |
| Leave chrome to PW-4/PW-8/PW-10 and define no shared contract | No new document; keeps three candidate items each restating the read-only rule  | Rejected — the shared rules are the gap               |
| Treat chrome as a fourth tiling primitive                     | Uniform mental model; breaks the accepted hierarchy and the no-window-leak rule | Rejected                                              |
| Make the rail the only chrome surface and drop the Bar        | Fewer surfaces; contradicts the draft Status System and PW-4                    | Rejected — replacement remains open, not decided here |

## Affected contracts

| Contract                                                                                | Effect                                                                        |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Status System Specification](status-system.md) (draft)                                 | Unchanged; its Bar becomes one instance of the chrome inventory               |
| [Panel and Workspace Interaction](panel-workspace-interaction-candidate.md) (candidate) | PW-4, PW-8, PW-10 gain a shared consumption surface; their items stay open    |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md) (candidate)                      | U-4 chrome runtime gains the contract it consumes; U-9 item 5 owns acceptance |
| [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) (draft)         | Supplies the overlay-side owner chrome consumes                               |
| [Panel Runtime RFC](panel-runtime-rfc.md) (accepted)                                    | Unchanged; chrome consumes its identity and overlay contracts                 |

## Open points

- Whether the rail replaces or composes beside the Bar, and whether a hidden or
  relocated Bar behaves differently under `bitty --safe` (PW-4 Open, U-4 Open).
- The chrome key spellings, Panel Rule grammar, specificity algorithm, conflict
  diagnostics, and whether the cascade is user-visible as a resolution trace.
- Whether the notification area is a chrome surface or an overlay-tier
  consumer only; the naming and ownership are owner-pending.
- How a plugin chrome-slot grant is scoped and revoked per window versus per
  workspace (composes with `RFC-OQ-5`).
- Whether chrome surfaces are per-`Window` or per-`Workspace` for the tab strip
  and rail; PW-10 leaves it open.
- Accessibility semantics for chrome surfaces (roles, focus order exclusion,
  screen-reader announcement) are owned by the accessibility baseline record.

## Acceptance criteria

1. A reviewer confirms every rule restates or composes with an accepted source
   and adds no accepted behavior.
2. The inventory matches the documents it cites; no surface is silently added or
   dropped.
3. The record is linked from U-4, PW-4, PW-8, and PW-10 as their shared
   consumption surface.
4. Acceptance (if ever) happens through the owner-pending Window Chrome RFC,
   not by flipping this record's status.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes. The security review above records that disposition.

## References

- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted identity, focus, and
  overlay contracts chrome consumes.
- [Workspace Compositor Specification](workspace-compositor.md) — accepted
  hierarchy, decoration ownership, and no-window-leak.
- [Status System Specification](status-system.md) — draft Bar contract.
- [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md)
  — PW-4, PW-8, PW-10 candidate chrome directions.
- [Workspace-Native UI Runtime (Candidate)](ui-runtime-candidate.md) — U-4
  chrome runtime direction and U-9 convergence roadmap.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) —
  overlay tiers and modal authority.
