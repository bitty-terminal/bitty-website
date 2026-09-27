---
title: UI/UX Invariant Set (Candidate)
description: Candidate cross-cutting UX invariants for panel chrome overlay and interaction surfaces with their status and coverage evidence
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: true
sidebar_order: 47
---

# UI/UX Invariant Set (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. The draft
> [Workspace Panel Invariants](workspace-panel-invariants.md) (per-row statuses,
> several accepted) cover identity, ownership, lifecycle, and session behavior
> at the compositor level. This
> record states the **UX-level** invariants that the panel, chrome, overlay, and
> interaction records each assume but no single document collects: properties a
> user can observe and a test can assert. It accepts nothing, weakens no
> accepted invariant, and makes no implementation claim.

## Purpose and scope

Several candidate and accepted records state user-observable rules in passing:
chrome never mutates grid (Panel Runtime), presentation never becomes truth
(Core and Plugin Boundaries), the tree never contains a window handle (Workspace
Compositor), a non-focused panel never receives input (Panel Runtime), focus
re-homes before detach commits (Workspace Panel Invariants), and an overlay
never resizes a PTY (Panel Runtime). Each is real, each is scattered, and none
is testable as a set. This record collects them into a candidate invariant set
with identifiers, so each can be asserted, and so new UI work has a checklist
rather than a search task.

In scope: the invariant identifiers, their statements, their source, and their
current evidence status; the coverage and follow-up discipline inherited from
the draft `WS-INV-*` register; and the rule that these are observable UX
properties, not implementation details.

Out of scope and owned elsewhere: compositor-level identity and lifecycle
invariants (`WS-INV-*`, draft with per-row statuses,
[Workspace Panel Invariants](workspace-panel-invariants.md)); overlay
composition (draft,
[Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)); chrome
surfaces (draft, [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md));
motion (draft, [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md));
accessibility (draft, [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md)).

## Normative sources this specification must not weaken

- [Workspace Panel Invariants](workspace-panel-invariants.md) (candidate): the
  `WS-INV-*` set, its status vocabulary, and its uncovered-follow-up discipline.
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): presentation-only
  overlay, focus routing, no-focus counter, and the no-hot-path rule.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted):
  hierarchy, no-window-leak, Core-owned decoration, interaction atomicity.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) (accepted):
  Terminal Truth ownership and the declarative UI boundary.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariants 3 and 4.
- [Performance Budget RFC](performance-budget-rfc.md) (accepted): frame-on-demand
  and no periodic timer.

## Status vocabulary

| Status                | Meaning                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| Accepted              | The rule is stated by an accepted source; this record restates it and adds no force.                  |
| Candidate             | The rule is a candidate direction with no accepted source; it binds nothing until accepted.           |
| Covered               | An executable check exists (headless test, source assertion, or evidence artifact) and is named.      |
| Uncovered — follow-up | No executable check exists; a follow-up task is required before the invariant can freeze as accepted. |

## The invariant set

| ID        | Invariant                                                                                                                                                                         | Source                                                                    | Status                         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------ |
| UX-INV-1  | No presentation surface mutates Terminal Truth (grid, cursor, modes, scrollback).                                                                                                 | Core and Plugin Boundaries (accepted)                                     | Accepted — Covered             |
| UX-INV-2  | A chrome surface never receives keyboard or IME input and never becomes a focus target.                                                                                           | Panel Runtime RFC (accepted), chrome candidate                            | Accepted — Covered             |
| UX-INV-3  | An overlay never resizes a PTY and never re-enters the `LogicalRect -> PTY` path.                                                                                                 | Panel Runtime RFC (accepted)                                              | Accepted — Covered             |
| UX-INV-4  | A non-focused panel never receives keyboard, IME, or wheel events; observation runs only through the bounded bus or snapshot path.                                                | Panel Runtime RFC (accepted)                                              | Accepted — Covered             |
| UX-INV-5  | Focus re-homes to the next MRU target in the same workspace _before_ a detach or destroy commits; with no target, focus is `None` and the `no_focus` counter increments.          | Panel Runtime RFC (accepted); WS-INV-19 (row accepted, refined)           | Accepted — Covered             |
| UX-INV-6  | A layout or move interaction is all-or-nothing: on validation failure both source and destination remain unchanged and a diagnostic is emitted.                                   | Workspace Compositor (accepted)                                           | Accepted — Covered             |
| UX-INV-7  | No UI surface leaks an OS window handle: the `LayoutTree` carries no window identity and no Lua value exposes one.                                                                | Workspace Compositor (accepted)                                           | Accepted — Covered             |
| UX-INV-8  | A gesture mutates layout only through the command registry as a validated update; no direct pointer write exists.                                                                 | Workspace Compositor (accepted)                                           | Accepted — Covered             |
| UX-INV-9  | A tab is a projection of a panel: reordering tabs never renames or reorders an identity.                                                                                          | Panel Placement Decision (draft)                                          | Candidate — Uncovered (F-UX-1) |
| UX-INV-10 | Exactly one modal authority exists per `Window`; a second modal request fails with `OverlayBusy` and leaves the first unchanged.                                                  | Overlay Ownership Reconciliation (draft)                                  | Candidate — Uncovered (F-UX-2) |
| UX-INV-11 | Overlay paint order is a pure function of `(tier, construction order)`; no pass depends on insertion order.                                                                       | Overlay Ownership Reconciliation (draft)                                  | Candidate — Uncovered (F-UX-2) |
| UX-INV-12 | Motion never delays the committed state: layout, content, and focus are final before an animation starts, so disabled, interrupted, and completed animations show the same state. | UI Motion and Budget (draft)                                              | Candidate — Uncovered (F-UX-3) |
| UX-INV-13 | Motion never interpolates terminal content, cursor, selection, or scrollback.                                                                                                     | RFC-0002 (accepted)                                                       | Accepted — Uncovered (F-UX-3)  |
| UX-INV-14 | No chrome segment is recomputed per keystroke or per PTY read; a revision or an active animation is the only wakeup source for chrome.                                            | Chrome Surface Contract (draft)                                           | Candidate — Uncovered (F-UX-4) |
| UX-INV-15 | A scene-backed leaf presents through the Scene path or the grid snapshot path, never both, and its accessibility projection is derived and read-only.                             | Panel Content Scene Path Decision (draft), Accessibility Baseline (draft) | Candidate — Uncovered (F-UX-5) |
| UX-INV-16 | Budget overflow fails closed: admission refusal or reported degradation, never silent substitution or partial application.                                                        | UI Motion and Budget (draft)                                              | Candidate — Uncovered (F-UX-3) |
| UX-INV-17 | Session restore rehydrates layout, attachment, focus, and scrollback before the first frame; no incremental plugin-side rebuild and no flash.                                     | TerminalRegistry and View Lifecycle Contract (accepted)                   | Accepted — Covered             |
| UX-INV-18 | Every `SceneNode` kind presented has a mapped accessibility role; an unmapped kind fails closed at validation.                                                                    | Accessibility Baseline (draft)                                            | Candidate — Uncovered (F-UX-5) |

## Coverage and follow-ups

| Follow-up | Invariants           | Required evidence                                                                                                                            |
| --------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| F-UX-1    | UX-INV-9             | A tab-reorder test asserting identity and content stability across reorder.                                                                  |
| F-UX-2    | UX-INV-10, UX-INV-11 | Headless overlay tests: modal exclusivity with unchanged first overlay; tier-order determinism under two insertion orders.                   |
| F-UX-3    | UX-INV-12, -13, -16  | Motion tests: final-state equality across disabled/interrupted/completed; interpolation prohibition; budget refusal with intact prior state. |
| F-UX-4    | UX-INV-14            | A chrome cadence test asserting no per-keystroke segment recomputation and no periodic timer.                                                |
| F-UX-5    | UX-INV-15, UX-INV-18 | A scene-path test asserting single-path presentation and a semantics mapping for every presented node kind.                                  |

An invariant may only move from `Uncovered` to `Covered` with a named,
reviewable check. An invariant with no check may not be frozen as accepted; the
discipline is inherited from the draft `WS-INV-*` register.

## Security review

This record adds no capability and no host surface; it collects observable
properties, several of which are hardening rules (no window handle leak, no
direct pointer write, no cross-panel input, fail-closed budgets). No `P0`
criterion is affected. A security reviewer is required for any future invariant
that grants a plugin-observable surface.

## Verification plan

1. Every `Covered` row names its check; a documentation-lint assertion rejects a
   `Covered` row without a named check.
2. Every `Uncovered` row links to a follow-up in the coverage table; a lint
   assertion rejects an orphan.
3. Each follow-up lists the test it requires; the tests land in the same
   milestone as the surface they guard.
4. The set is linked from each source record it restates, so a reader of one
   record sees the collected set.

## Alternatives considered

| Alternative                                   | Trade-off                                                                   | Disposition                                            |
| --------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| Extend `WS-INV-*` instead of a new set        | One register; mixes compositor identity invariants with UX-observable rules | Rejected — different owners and different review paths |
| Leave invariants in their source records      | No new document; every UI review re-searches the corpus for rules           | Rejected — this is the gap                             |
| State invariants as prose with no identifiers | Cheaper to write; not referenceable from tests, PRs, or follow-ups          | Rejected — identifiers are what make them assertable   |
| Freeze all rows as accepted immediately       | No follow-up work; would claim coverage that does not exist                 | Rejected — the status column exists to be honest       |

## Affected contracts

| Contract                                                                            | Effect                                                                     |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [Workspace Panel Invariants](workspace-panel-invariants.md) (candidate)             | Unchanged; this set composes with `WS-INV-*` and does not restate its rows |
| [Panel Runtime RFC](panel-runtime-rfc.md) (accepted)                                | Unchanged; its observable rules gain stable identifiers in the UX set      |
| [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) (draft)     | Supplies UX-INV-10/11                                                      |
| [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md) (draft)       | Supplies UX-INV-12/16                                                      |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) (draft) | Supplies UX-INV-14                                                         |
| [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) (draft)   | Supplies UX-INV-18                                                         |

## Open points

- Whether the UX set eventually merges into the `WS-INV-*` register or stays a
  separate register.
- The exact check form for source-level assertions (which are not headless
  tests) and whether they count as `Covered`.
- Whether invariant status is per milestone or per release.
- Which follow-ups belong to the vertical slice and which to post-slice work.
- Whether a plugin-facing subset (for example UX-INV-2, UX-INV-4) is published
  as a plugin contract.

## Acceptance criteria

1. Every row's source link resolves and the source actually states the rule.
2. No row contradicts an accepted invariant or widens an accepted rule.
3. The coverage table has no orphan follow-up and no `Covered` row without a
   named check.
4. Acceptance of a row happens by accepting its source record; this register
   itself may remain a candidate register indefinitely.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes. The security review above records that disposition.

## References

- [Workspace Panel Invariants](workspace-panel-invariants.md) — compositor-level
  invariant register and follow-up discipline.
- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted overlay, focus, and
  hot-path rules.
- [Workspace Compositor Specification](workspace-compositor.md) — accepted
  hierarchy, no-window-leak, and atomicity.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) —
  modal authority and tier determinism.
- [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md) — motion
  and budget failure posture.
- [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) —
  semantics mapping requirement.
