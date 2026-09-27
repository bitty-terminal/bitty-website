---
title: U-9 Five-RFC Convergence Note
description: Draft convergence record for the owner-pending U-9 five-RFC program - corrected source premise adopted routing per-successor entry state and what closes UX-34
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 51
---

# U-9 Five-RFC Convergence Note

> Status: **draft convergence record** — a recorded disposition for backlog
> item `UX-34`
> ([bitty#1041](https://github.com/bitty-terminal/bitty/issues/1041)), not an
> accepted contract. It corrects the issue's stale source premise, adopts the
> existing routing document as the convergence authority, and states the
> per-successor entry state for the five RFCs the U-9 direction names. It
> creates no RFC, accepts nothing, closes no open question, grants no
> capability, weakens no normative security control, and makes no
> implementation claim.

## Purpose

The U-9 direction in the candidate
[Workspace-Native UI Runtime](ui-runtime-candidate.md) says future UI
specifications converge into five RFCs — UI Runtime, Workspace Scene, Panel
& Activity, Panel Rules & Styling, and Window Chrome — and creates none of
them. Backlog item `UX-34` tracks the docs half of that convergence. Since
the item was filed, the routing half landed
([UI Convergence Roadmap](ui-convergence-roadmap.md), CTX-0046), so this note
exists to record what converged, what the issue premise gets wrong, and what
authoring work stays open — not to re-route what the roadmap already routes.

In scope: the corrected source premise, the adopted routing authority, the
entry state of each of the five successor RFCs, and the close criteria for
`UX-34`. Out of scope: the content of any successor RFC (unwritten, owned by
its future author); the candidate records themselves (linked, not restated);
product milestones and their delivery sequence
([Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)).

## Source identity

| Source                                                                                   | Role                                                                                                                                                      |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md), U-9                              | The five-RFC convergence direction this note records; still candidate, owner-pending                                                                      |
| [UI Convergence Roadmap](ui-convergence-roadmap.md)                                      | The routing authority this note adopts: scope, inputs, blockers, retirement per successor                                                                 |
| Backlog item `UX-34` ([bitty#1041](https://github.com/bitty-terminal/bitty/issues/1041)) | The convergence-docs item this note dispositions; sub-issue of the UI/UX candidate epic ([bitty#972](https://github.com/bitty-terminal/bitty/issues/972)) |
| `origin/ctx-0042` branch premise in the issue                                            | Stale: the UI-runtime candidate merged to `main` (docs PR #82, refined in #90); no unmerged `ctx-0042` branch carries it                                  |

## Corrected premise

1. **The candidate exists on `main`.** `specifications/ui-runtime-candidate.md`
   merged through docs PR #82 and was refined in #90. There is no unmerged
   `origin/ctx-0042` branch holding the U-9 material; work starts from `main`.
2. **The routing exists.** `specifications/ui-convergence-roadmap.md` (CTX-0046,
   docs PR #90, scrolling-layout routing added in #98) maps each successor to
   its scope, candidate inputs, blocking items, and retirement conditions.
3. **The RFCs do not exist.** All five successors are unwritten and
   owner-pending. That authoring gap — not routing — is what stays open under
   `UX-34`.

## Convergence disposition

**Adopt the roadmap as the convergence authority and author the five
successors against it.** No new routing document is needed. Each successor
starts from its roadmap row and must restate — not cite by implication — the
candidate rules it keeps, closing its blocking items or recording why a
blocker no longer applies.

### Per-successor entry state

| #   | Successor RFC             | Entry state                                                                                                 | First decision the author must take                                   |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | UI Runtime RFC            | Unwritten; inputs are U-1/U-3/U-6 plus the accessibility, motion-budget, and regression-evidence candidates | `UiTree` node schema and reconciliation rules                         |
| 2   | Workspace Scene RFC       | Unwritten; blocked on the `RFC-OQ-3` placement acceptance                                                   | Whether non-terminal content rides a composed layer or a sub-surface  |
| 3   | Panel & Activity RFC      | Unwritten; smallest acceptance gesture may be a Panel Runtime RFC amendment                                 | Amendment versus new document, and `RFC-OQ-1` first-slice panel types |
| 4   | Panel Rules & Styling RFC | Unwritten; needs the token inventory and chrome contract first                                              | `OQ-052` panel-rule grammar, specificity, and diagnostics             |
| 5   | Window Chrome RFC         | Unwritten; composes all of the above, last by design                                                        | The rail-versus-Bar product question and notification ownership       |

The ordering rationale (Panel & Activity first, Window Chrome last) is
direction, not schedule; the product sequence owns milestones and no
successor is authorized by this note.

### What closes UX-34

`UX-34` closes as a docs item when this note plus the adopted roadmap answer
the convergence question: the five RFCs are named, routed, and gated, with
per-successor entry states recorded. Successor authoring itself is tracked
under the epic ([bitty#972](https://github.com/bitty-terminal/bitty/issues/972)),
not under `UX-34`; an unwritten RFC is not a reopened convergence question.

## Security review

This note creates no surface and grants no capability; it routes documents.
Each successor inherits the security review its candidate inputs already
carry, and no successor may accept a candidate rule whose security review was
deferred without performing that review. No `P0` criterion is affected.

## Verification backlog

- A review check that each successor, when authored, cites this note's entry
  state and either closes its roadmap blockers or records why not.
- A check that the roadmap is updated in the same change as any new candidate
  UI record, so this note's premise does not go stale again.
- The `WS-INV-4` retirement gap and `RFC-OQ-9` ownership question stay open in
  the roadmap until a successor claims them.

## Open points

- Whether the roadmap stays a candidate document or becomes a planning
  register in the product sequence (inherited from the roadmap).
- Whether the Panel & Activity RFC lands as a Panel Runtime amendment or a new
  document (inherited from the roadmap).
- Which successor owns the `WS-INV-4` retirement gap and `RFC-OQ-9`.
- Owner assignment for all five successors is pending; this note recommends no
  names.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes. The security review above records that disposition.

## References

- [Workspace-Native UI Runtime (Candidate)](ui-runtime-candidate.md) — U-1..U-9
  directions and the five-RFC convergence direction.
- [UI Convergence Roadmap](ui-convergence-roadmap.md) — the adopted routing
  authority: scope, inputs, blockers, retirement, ordering.
- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted panel contract a
  successor may amend.
- [Workspace Compositor Specification](workspace-compositor.md) — accepted
  hierarchy, decoration ownership, interaction atomicity.
