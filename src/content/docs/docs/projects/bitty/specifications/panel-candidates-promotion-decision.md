---
title: Panel Candidates Promotion Decision
description: Draft promotion disposition for the five panel candidate specs - per-candidate owner lanes acceptance gates and the scheduled owner-review rule before any implementation claim
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 53
---

# Panel Candidates Promotion Decision

> Status: **draft promotion disposition** — a recorded recommendation for
> backlog item `DOC-09`
> ([bitty#1123](https://github.com/bitty-terminal/bitty/issues/1123)), not an
> accepted contract. It keeps all five panel candidate specifications at
> `draft`, assigns each a recommended owner lane and acceptance gates, and
> states the scheduled owner-review rule that must run before any of them
> carries an implementation claim. It changes no accepted document, closes no
> open question, grants no capability, weakens no normative security control,
> and makes no implementation claim.

## Purpose

Five panel specifications sit unowned at `status: draft` with no
implementation claims: Panel Environment State, Workspace Panel Invariants,
Panel History, Panel and Workspace Interaction, and the Event-Sourced Panel
Model. Without a promotion disposition, each risks either silent drift or an
implementation claim with no owner to defend it. This record narrows `DOC-09`
to a per-candidate disposition — keep at draft, route to an owner lane, gate
acceptance — so a future owner review starts from a stable input.

In scope: the keep-draft disposition for all five, the recommended owner lane
and acceptance gates per candidate, and the owner-review scheduling rule. Out
of scope: the candidate content itself (linked, not restated); the accepted
[Panel Runtime RFC](panel-runtime-rfc.md) and
[Workspace Compositor Specification](workspace-compositor.md) they compose
with; product milestones and delivery sequence.

## Source identity

| Candidate                                                                   | Scope in one line                                                                                         | Status verified at HEAD                    |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [Panel Environment State](panel-environment-state-candidate.md)             | Four-layer env model, prompt-time sync, `ShellState` unification, no-persist default, exported-only fence | `draft`, direction-only, no implementation |
| [Workspace Panel Invariants](workspace-panel-invariants.md)                 | `WS-INV-*` identity/ownership/lifecycle/focus invariant register                                          | `draft`, no implementation claim           |
| [Panel History](panel-history-candidate.md)                                 | Core/plugin split, append-only store, Atuin boundary, agent consumption                                   | `draft`, design record only                |
| [Panel and Workspace Interaction](panel-workspace-interaction-candidate.md) | Mod-drag movement, floating, Bar configurability, stable identity, drag-to-Bar, Lua surface               | `draft`, no implementation                 |
| [Event-Sourced Panel Model](event-sourced-panel-model-candidate.md)         | Headless panel separation, immutable event log, decoupled folding, context GC                             | `draft`, no implementation                 |

Backlog item `DOC-09`
([bitty#1123](https://github.com/bitty-terminal/bitty/issues/1123)) names the
first three files and the "five candidate specs" scope; the remaining two are
the sibling panel candidates in the same unowned state, included here so the
disposition covers the family. Sub-issue of the docs-sync epic
([bitty#978](https://github.com/bitty-terminal/bitty/issues/978)).

## Disposition

### Common rule for all five

**Keep at `draft`; no implementation claim without a scheduled owner review.**
Promotion of any candidate requires: (a) an owning task that schedules the
review, (b) restatement of the kept rules in the accepting RFC or amendment
— citation by implication is insufficient, (c) security-auditor review where
the candidate carries deferred security review, and (d) retirement by
archiving with the successor named, never deletion.

### Per-candidate owner lanes and gates

| Candidate                       | Recommended owner lane                                           | Promotes through                                                       | Acceptance gates                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Panel Environment State         | Panel & Activity RFC author                                      | A Panel-environment RFC or Panel Runtime family amendment              | Bounded values, error taxonomy, budgets, verification mapping to P0-AC-023/024/026; `persist_env` allowlist decided with consent/audit/redaction; ai-docs agent-view rollout stays ai-docs-owned |
| Workspace Panel Invariants      | Panel Runtime owner (amendments) + Panel & Activity RFC author   | Successor that owns each row's source; the register may stay permanent | Every `WS-INV-*` row mapped to an executable check or an explicit `uncovered — follow-up`; the `WS-INV-4` retirement gap and `RFC-OQ-9` ownership claimed                                        |
| Panel History                   | Panel & Activity RFC author (persistence state)                  | Panel persistence/state contract                                       | Core/plugin split fixed; store bounds and retention decided; `/export panel` shape and the `bitty-ai` consumption boundary fixed without moving history ownership to `bitty-ai`                  |
| Panel and Workspace Interaction | Workspace Scene RFC + Window Chrome RFC authors (already routed) | Its roadmap successors                                                 | Gesture/command equivalence restated by the Scene RFC; PW-4/PW-8/PW-10 bar surfaces restated by the chrome RFC; in-flight UX batches stay provisional until then                                 |
| Event-Sourced Panel Model       | Panel & Activity RFC author                                      | Terminal platform direction record or the Panel & Activity RFC         | Event-log bounds, retention/GC policy, and folding semantics fixed; storage never weakens the no-record-by-default rule                                                                          |

### Suggested review order

1. **Workspace Panel Invariants first.** It is the only register of the five;
   several rows already restate accepted rules, so absorbing them is the
   cheapest acceptance gesture and unblocks the invariant-hardening line.
2. **Panel and Workspace Interaction second.** Its PW rows feed UX batches
   already in flight; confirming the routing keeps that work provisional in
   the right direction.
3. **Panel Environment State and Panel History third.** Both are larger design
   inputs with cross-repository edges (ai-docs rollout, `bitty-ai`
   consumption); they need their consumers at the table.
4. **Event-Sourced Panel Model last.** It is the furthest-reaching platform
   direction and composes with whatever the first three decide.

This order is a **suggestion, not a schedule**; the owning tasks sequence the
reviews.

## Alternatives considered

| Alternative                                       | Trade-off                                                                  | Disposition                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| Promote one or more now without an owner          | Fast; an accepted contract with nobody to defend its open items            | Rejected — acceptance without ownership           |
| Merge the five into one panel mega-RFC            | Single gesture; unreviewable size and mixed owners                         | Rejected — matches the successor-RFC direction    |
| Archive all five as stale                         | Clean tree; discards frozen design inputs future work needs                | Rejected — they are inputs, not drift             |
| Claim implementation coverage from existing tests | Some invariant checks exist as review evidence; evidence is not acceptance | Rejected — `Implemented-only` is never `Verified` |

## Security review

This record moves no trust boundary. On promotion, each candidate's deferred
security review must be performed, not inherited: environment snapshots carry
secret-minimization and no-record-by-default obligations; history storage
carries retention, consent, and redaction obligations; the event log carries
bounded-retention obligations. No successor may accept a candidate rule whose
security review was deferred without performing that review. No `P0`
criterion is affected by this record.

## Verification backlog

- Each candidate stays `status: draft` with its candidate banner until the
  accepting change lands; a silent banner removal is a defect, not a
  promotion.
- The accepting change must restate kept rules and name this disposition or
  the roadmap row it overturns.
- Test files written as review evidence for candidate rules must stay labeled
  `Implemented-only` until the owning accepted contract claims them.

## Open points

- Owner assignment for all five candidates is pending; this record recommends
  lanes, not names.
- Whether the invariants register is eventually absorbed or remains permanent.
- The `persist_env` session-persistence allowlist (deferred until a
  session-persistence design requires it).
- Agent-view field shapes and the env-snapshot handle lifecycle (ai-docs
  rollout, not decided here).

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes. The security review above records that disposition.

## References

- [UI Convergence Roadmap](ui-convergence-roadmap.md) — successor routing for
  the interaction and scene-bound candidates.
- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted panel contract the
  invariants and history candidates compose with.
- [Workspace Compositor Specification](workspace-compositor.md) — accepted
  hierarchy and interaction atomicity.
- [U-9 Five-RFC Convergence Note](u9-convergence-note.md) — the convergence
  record whose successors own these promotions.
