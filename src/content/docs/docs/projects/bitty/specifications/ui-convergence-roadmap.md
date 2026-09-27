---
title: UI Convergence Roadmap
description: Candidate convergence plan for the five owner-pending UI RFCs naming each successor scope its inputs its blocking open items and the retirement criteria for candidate records
category: specifications
audience: maintainer
document_type: specification
status: draft
website_publish: true
sidebar_order: 50
---

# UI Convergence Roadmap

> Status: **draft**. The candidate
> [Workspace-Native UI Runtime](ui-runtime-candidate.md) records (U-9) that
> "future UI specifications converge into five RFCs" and creates none of them.
> Since then several candidate records landed that each feed one of those five
> RFCs. This roadmap states, for each successor RFC: its scope, the records it
> consumes, the open items that block it, and the retirement condition for the
> candidate records it supersedes. It creates no RFC, accepts nothing, and makes
> no implementation claim; it is a routing document.

## Purpose and scope

The UI corpus now contains a large set of candidate records. Without a
convergence plan, each successor RFC would have to rediscover which records
belong to it, which open items still block it, and which records it retires.
This roadmap is the routing layer: it maps candidate material to successor
owners and states what each owner must decide.

In scope: the five successor RFCs, their scope and inputs, the blocking open
items, the retirement conditions for candidate records, and the ordering
rationale.

Out of scope and owned elsewhere: the content of each candidate record
(linked, not restated); the accepted contracts they compose with; the product
milestones and their delivery sequence
([Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)); the
global open-question register
([Open Questions](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)).

## Normative sources this specification must not weaken

- [Workspace-Native UI Runtime](ui-runtime-candidate.md) (candidate): the U-9
  five-RFC direction this roadmap elaborates.
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): panel identity,
  lifecycle, presentation modes, focus, command registry, overlay, and the
  `RFC-OQ-*` items a successor must close.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted):
  hierarchy, decoration ownership, interaction atomicity.
- [Workspace Panel Invariants](workspace-panel-invariants.md) (candidate): the
  `WS-INV-*` register, including the open `WS-INV-4` follow-up.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) (accepted):
  mechanism-versus-policy split and the declarative UI boundary.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariants 3 and 4.

## Terminology

| Term            | Meaning in this document                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| Successor RFC   | An acceptance owner that absorbs one or more candidate records; one of the five named in this roadmap.         |
| Candidate input | A draft record routed to a successor; it binds nothing until the successor restates and accepts its rules.     |
| Blocking item   | An open question or follow-up a successor must close before it consumes the candidate rules that depend on it. |
| Retirement      | Archiving a candidate record once a successor names and restates the rules it keeps; never deletion.           |

## The five successor RFCs

| #   | Successor RFC             | Scope                                                                                              | Candidate inputs it consumes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | UI Runtime RFC            | `UiTree`, layout, widget primitives, input and hit-testing, accessibility, diffing, UI budget      | U-1 retained `UiTree`; U-3 five-level architecture; U-6 motion and budget; [Accessibility Baseline](accessibility-baseline-candidate.md); [UI Motion and Budget](ui-motion-and-budget-candidate.md); [Visual and Behavioral Regression Evidence](visual-regression-evidence-candidate.md)                                                                                                                                                                                                                                               |
| 2   | Workspace Scene RFC       | tiled, floating, pinned, fullscreen, scratchpad, popover, overlay layers; layout algorithm options | U-2 spatial model; [Panel Placement Decision](panel-placement-decision.md); [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md); the compositor's gated presentation modes; the candidate scrolling layout (preferred width with `min_width`/`max_width` bounds, navigate by focus and scroll), recorded in [Panel Vision](../product/panel-vision.md), the [Panel Runtime RFC](panel-runtime-rfc.md) layout options, and the [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) niri-ribbon direction |
| 3   | Panel & Activity RFC      | Panel/View relations, `ActivityStack`, `PanelProvider`, lifecycle, persistence state               | U-2 identity split; [Panel Placement Decision](panel-placement-decision.md); [Panel Content Scene Path Decision](panel-content-scene-path-decision.md); `RFC-OQ-1`..`RFC-OQ-9`                                                                                                                                                                                                                                                                                                                                                          |
| 4   | Panel Rules & Styling RFC | rules, size constraints, appearance, themes, precedence                                            | [Theme Token Contract](theme-token-contract-candidate.md); [Chrome Surface Contract](chrome-surface-contract-candidate.md); PW-4/PW-8 candidate surfaces; `OQ-052` panel-rule half                                                                                                                                                                                                                                                                                                                                                      |
| 5   | Window Chrome RFC         | `WorkspaceRail`, `StatusBar`, plugin chrome slots, notifications, global overlays                  | [Chrome Surface Contract](chrome-surface-contract-candidate.md); the draft [Status System](status-system.md); PW-4/PW-8/PW-10; U-4                                                                                                                                                                                                                                                                                                                                                                                                      |

## Blocking open items per successor

| Successor                 | Blocking items                                                                                                                                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI Runtime RFC            | `UiTree` node schema and reconciliation rules (U-1 Open); accessibility role vocabulary; UI/GPU budget bounds; `OQ-056` capability dimensions                                                                                                                                             |
| Workspace Scene RFC       | `RFC-OQ-3` placement acceptance; non-modal overlay bound scope; whether `View` remains a distinct identity; whether the scrolling layout is a `LayoutProvider` algorithm or a new workspace mode, its bounded viewport model, and its focus semantics against `FocusDirection` (`OQ-052`) |
| Panel & Activity RFC      | `RFC-OQ-1` first-slice panel types; `RFC-OQ-2` `PanelProvider` spelling; `RFC-OQ-9` presentation-mode and persistence grouping; `WS-INV-4` (F-1) retirement rule                                                                                                                          |
| Panel Rules & Styling RFC | `OQ-052` panel-rule grammar, specificity, and diagnostics; token inventory completion; contrast degradation rule                                                                                                                                                                          |
| Window Chrome RFC         | Rail-versus-Bar question; `OQ-052` unified `Mod` (`OQ-088` adjacency); notification ownership; plugin chrome-slot grant scope (`RFC-OQ-5`)                                                                                                                                                |

## Ordering rationale

1. **Panel & Activity RFC first.** Placement (`RFC-OQ-3`) blocks the Scene path,
   tab identity, persistence, and chrome targeting; the
   [Panel Placement Decision](panel-placement-decision.md) supplies the candidate
   direction and the smallest acceptance gesture is an amendment to the accepted
   Panel Runtime RFC.
2. **Workspace Scene RFC second.** It consumes the placement decision and the
   overlay reconciliation, and it decides whether non-terminal content rides a
   composed layer (the candidate direction) or a sub-surface.
3. **UI Runtime RFC third.** It owns the mechanism layer both of the above depend
   on; it is the largest and the last to be unambiguous.
4. **Panel Rules & Styling RFC fourth.** It requires the token inventory and the
   chrome contract, both of which are cheaper once the scene and chrome surfaces
   are fixed.
5. **Window Chrome RFC last.** It composes everything above and its rail question
   is a product decision as much as a contract one.

This order is a **direction, not a schedule**; the product sequence owns
milestones and no successor RFC is authorized by this document.

## Retirement conditions

| Candidate record                                                                     | Retires when                                                                                  |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [Panel Placement Decision](panel-placement-decision.md)                              | A successor RFC (or Panel Runtime amendment) states placement and encoding                    |
| [Panel Content Scene Path Decision](panel-content-scene-path-decision.md)            | The Workspace Scene RFC fixes the content path                                                |
| [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)              | The Workspace Scene RFC absorbs the three-owner boundary                                      |
| [Chrome Surface Contract](chrome-surface-contract-candidate.md)                      | The Window Chrome RFC accepts the surface contract                                            |
| [Theme Token Contract](theme-token-contract-candidate.md)                            | The Panel Rules & Styling RFC accepts the token namespace                                     |
| [Unified Mod Contract](unified-mod-contract-candidate.md)                            | The input contract or its successor absorbs `Mod` resolution                                  |
| [Accessibility Baseline](accessibility-baseline-candidate.md)                        | The UI Runtime RFC accepts the semantics baseline                                             |
| [UI Motion and Budget](ui-motion-and-budget-candidate.md)                            | The UI Runtime RFC accepts the motion tree and categories                                     |
| [UI/UX Invariant Set](ui-ux-invariant-set-candidate.md)                              | Its rows are absorbed by the successor that owns each row's source, or it stays as a register |
| [Visual and Behavioral Regression Evidence](visual-regression-evidence-candidate.md) | The DevTools successor or the UI Runtime RFC accepts the artifact contract                    |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md)                               | All five successors exist and the vision retirement question is decided                       |

Retirement means the candidate record is archived with its successor named, not
deleted; the accepted successor restates the rules it keeps.

## Security review

This roadmap creates no surface and grants no capability; it routes documents.
The properties that matter: each successor inherits the security review its
candidate inputs already carry, and no successor may accept a candidate rule
whose security review was deferred without performing that review. No `P0`
criterion is affected.

## Verification plan

1. A documentation-lint assertion that every candidate record in the retirement
   table is reachable from exactly one successor row above.
2. A review check that each successor's blocking items are still open at the
   time the successor starts, so a stale blocker is corrected rather than
   inherited.
3. A check that the roadmap is updated in the same change as any new candidate
   UI record, so it does not drift.

## Alternatives considered

| Alternative                                   | Trade-off                                                           | Disposition                                   |
| --------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| Let each successor discover its inputs        | No routing document; repeated corpus sweeps per RFC                 | Rejected — this is the gap                    |
| One mega-RFC covering all five scopes         | Single acceptance gesture; unreviewable size and mixed owners       | Rejected — matches the U-9 five-RFC direction |
| Schedule the successors with dated milestones | Appears decisive; product sequence owns milestones, not this corpus | Rejected — direction only, no schedule        |
| Delete candidate records once superseded      | Clean tree; loses the provenance of how a rule was reached          | Rejected — archive with the successor named   |

## Affected contracts

| Contract                                                                          | Effect                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md) (candidate)                | Its U-9 roadmap gains the concrete input map; stays candidate |
| [Panel Placement Decision](panel-placement-decision.md) (draft)                   | Gains a named successor owner                                 |
| [Panel Content Scene Path Decision](panel-content-scene-path-decision.md) (draft) | Gains a named successor owner                                 |
| [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) (draft)   | Gains a named successor owner                                 |
| [Chrome Surface Contract](chrome-surface-contract-candidate.md) (draft)           | Gains a named successor owner                                 |
| [Theme Token Contract](theme-token-contract-candidate.md) (draft)                 | Gains a named successor owner                                 |
| [Unified Mod Contract](unified-mod-contract-candidate.md) (draft)                 | Gains a named successor owner                                 |

## Open points

- Whether the roadmap stays a candidate document or becomes a planning register
  in the product sequence.
- Whether the Panel & Activity RFC lands as an amendment to the accepted Panel
  Runtime RFC or as a new document.
- Which successor owns the `WS-INV-4` retirement gap and `RFC-OQ-9`.
- Whether the UI/UX invariant set is eventually absorbed or remains a permanent
  register.
- The retirement handling for the candidate `panel-vision.md` replacement
  (Vision v2), which the UI runtime records as owner-pending.

## Acceptance criteria

1. Every candidate UI record in scope is routed to exactly one successor or
   explicitly marked as staying a register.
2. Every successor's blocking list names open items that are still open.
3. The ordering rationale states direction without implying a schedule.
4. The roadmap is reviewed whenever a new candidate UI record lands.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes. The security review above records that disposition.

## References

- [Workspace-Native UI Runtime (Candidate)](ui-runtime-candidate.md) — U-1..U-9
  directions and the five-RFC convergence note.
- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted panel contract and its
  open items.
- [Panel Placement Decision](panel-placement-decision.md) — placement direction
  blocking three successors.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) —
  overlay boundary for the Scene RFC.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  chrome surfaces for the chrome RFC.
- [Theme Token Contract (Candidate)](theme-token-contract-candidate.md) — token
  namespace for the styling RFC.
