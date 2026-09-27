---
title: Task lifecycle R5
description: Draft lifecycle authority for product Task model versus CarryCtx backend and handoff
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 37
---

# Task lifecycle R5

> Status: **draft**. This document records the CTX-0013 R5 draft disposition
> for product Task lifecycle authority versus CarryCtx backend and handoff
> only. It proposes no accepted architecture, authorizes no shipped behavior,
> and closes no open question. Normative security and IPC obligations override
> any experimental adoption stated here. Backend, replay-contract, and
> release-scope choices are frozen and deferred; see
> [Frozen and deferred scope](#frozen-and-deferred-scope).

## Purpose and scope

This decision covers lifecycle authority only:

- One lifecycle authority for product Task integration: who owns product task
  transitions, and what CarryCtx owns instead.
- CarryCtx as governance backend-or-handoff facet: durable record, bounded
  projection, worktree mapping, checkpoint reference, and explicit handoff.
  No second ownership, no overlap, no substitution.
- Independent-review evidence criteria (AIQ-26): what counts as independent
  acceptance and what never does.
- Critical-message acknowledgement and recovery (AIQ-28): which messages must
  never silently drop and what acknowledgement never implies.

Inputs are the teams, delegation, and messages sections of
[Agent coordination architecture](../agent/agent-coordination.md), the CarryCtx,
platform-stack, and native-service sections of
[AI Architecture](ai-architecture.md), AIQ-10, AIQ-26, and AIQ-28 with the
AIQ-56 alias of AIQ-10 in
[AI Unresolved Questions](../product/ai-unresolved-questions.md), and the R1 and R3
baselines in [Execution ownership R1](execution-ownership-r1.md) and
[Context retention R3](context-retention-r3.md). The persistence facet
(AIQs-56 and related design dimensions) in
[Persistence and evidence architecture](../persistence/persistence-evidence.md) and the
experimental scope and non-goals in
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) are inputs, not
conclusions: this decision selects no backend, no replay contract, and no
release scope. The accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and the
canonical security corpus linked by [AI Architecture](ai-architecture.md)
remain overriding authority, including P0-AC-026.

No product code is introduced or described as implemented. No native task,
agent, workspace, context, or evidence service exists today; candidate
service decompositions cited below stay non-normative until a scoped
implementation task lands them.

## Decision

**R5 selects single lifecycle authority as draft disposition: the product
Task model owns product task lifecycle transitions; CarryCtx serves as
governance backend-or-handoff facet behind narrow store traits, never as a
second lifecycle owner.**

The reconciled rule is:

```text
product Task model (sole authority)
  create, assign, depend, block/unblock, complete, ready query
  -> delegation admission, budget attribution, execution binding
  -> independent review acceptance as separate human/commander decision

CarryCtx (governance backend-or-handoff facet)
  durable record + bounded inward projection + worktree mapping
  + checkpoint references + explicit handoff
  -> never transitions product state, never admits delegation,
     never grants capability, never self-accepts a review
```

**Dual ownership is rejected as a lifecycle model.** A product task and its
CarryCtx projection must never be two writable authorities for the same
transition. A CarryCtx record must not become product authority by default,
and a product service must not rewrite governance history. Projection flows
inward only: task and checkpoint data inform context; nothing in the stack
grants capability or self-accepts a review.

AIQ-56 is the persistence facet of AIQ-10, not a separate lifecycle owner.
This one disposition covers both identifiers together.

## Rationale

- One transition needs one writer. Two authorities for create, assign,
  depend, block, complete, or ready query would produce divergent states with
  no arbiter. A single product authority keeps attribution, budgets, and
  review acceptance unambiguous.
- CarryCtx already proved the useful abstractions (durable tasks, dependency
  gating, scoped worktrees, context slicing, evidence) as design references.
  Reusing the pattern does not require shelling out to the tool or installing
  it: the product stays runnable standalone while projects already using
  CarryCtx can project their state in.
- Durability is not authority. A durable record that happens to persist task
  state is not permission to transition, admit, grant, or accept. Keeping the
  record behind narrow store traits preserves the standalone path and the
  consent, budget, and review gates.
- Presentation and persistence are not ownership either. A worktree that hosts
  implementation, a checkpoint that names a recovery point, or a projection
  that informs context changes neither the transition authority nor any
  reader's capability.

## Ownership split

| Concern                  | Product Task model owns                                                                         | CarryCtx owns as facet                                                                              | Non-overlap rule                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Lifecycle transitions    | `create`, `assign`, `depend`, `block`/`unblock`, `complete`, ready query                        | Durable recording and bounded projection of recorded transitions                                    | Only the product authority writes product transitions; the facet never transitions product state on its own            |
| Delegation admission     | Admits a child only when the granted delegation profile permits it, with attenuated scope       | Records the assignment generation and scope for governance                                          | A record of an assignment is not admission; depth, fan-out, and profile checks stay with the authority                 |
| Budgets                  | Atomic reservation, attribution, and reconciliation of token, cost, agent, and deadline budgets | Durable bookkeeping view of reservations where projected                                            | A parent handing budget to a child cannot spend it again; the facet never spends or double-books                       |
| Execution binding        | Binds execution to task under captured target and generation                                    | Worktree mapping as candidate target root for an implementer workspace                              | The mapping never widens filesystem authority beyond the granted scope                                                 |
| Task context             | Bounded projection of title, scope, dependencies, and latest checkpoint into context            | Source durable data for that projection                                                             | The projection counts against the context budget like any other context and is never injected by default               |
| Checkpoints and recovery | Recovery semantics: what a checkpoint authorizes on resume                                      | Checkpoint records as candidate recovery-pointer targets                                            | A pointer names a retained record; it neither resurrects processes nor re-executes effects                             |
| Review acceptance        | Acceptance stays an independent human or commander decision on evidence                         | Records evidence, verdicts, and action items for governance                                         | CarryCtx state is local data: it can request work but cannot grant capability, bypass consent, or self-accept a review |
| Governance history       | Nothing: the product never rewrites development coordination history                            | Its own coordination record: tasks, dependencies, scopes, sessions, progress, checkpoints, handoffs | Each history has one writer; handoff transfers accountability explicitly instead of merging two truths                 |

Supporting constraints inherited from inputs:

- R1 baseline from [Execution ownership R1](execution-ownership-r1.md):
  presentation never moves execution targets; a Panel projects execution
  without owning it.
- R3 baseline from [Context retention R3](context-retention-r3.md):
  lifecycle records hold only authorized, redacted, still-retained content;
  deletion and expiry propagate to journal payloads, evidence, derived
  summaries, indexes, and caches; missing content resolves to typed
  unavailable, never to silent recovery.
- PP-2 typed redaction pre-queue and pre-write, PP-4 no on-disk persistence
  without consent, and P0-AC-026 are mandatory and are not reopened by this
  draft.

## Handoff contract

Handoff moves accountability between owners without creating a second
authority. The draft contract is:

1. Handoff is explicit and versioned: outgoing assignment generation, scope,
   dependencies, latest checkpoint, known blockers, and evidence pointers
   travel together; RACI-style metadata never creates capability or approval
   authority.
2. The outgoing generation is fenced before the incoming owner is admitted.
   Outstanding work and uncertain effects are reconciled first; a replacement
   owner must not duplicate every child or retry unknown effects.
3. Child authority stays attenuated and single-parent for budget attribution.
   Task dependencies remain a separately validated DAG; review and
   consultation links never become authority edges.
4. Task and checkpoint data cross the boundary as a bounded projection only.
   Recipient expansion reauthorizes every referenced item rather than
   inheriting the sender's read scope.
5. Handoff records follow consent, retention, and provenance rules. Retained
   decisions and artifacts never become permanent global memory by
   implication.

## Independent-review evidence criteria

AIQ-26 stays open, but its evidence bar is fixed as draft disposition.
Acceptance requires all of the following; anything less is not acceptance:

1. The reviewer differs from the implementer as agent and session. Identical
   model families, shared code bases, shared training data, or shared
   artifacts do not constitute independence on their own.
2. The reviewer receives the requirement and the evidence, not only the
   author's summary. The reviewer inspects the diff, the authoritative
   contract, synchronized documentation, edge cases, and reproducible CI
   evidence before verdict.
3. Approval is a separate reviewer action. Verification results remain
   evidence, never approval. A cached PASS is never independent approval.
   Self-review, shared PASS, self-report, and partial checks never constitute
   acceptance.
4. Implementation, independent review, and final acceptance stay separate
   roles. A manager or commander may inspect evidence when needed; inspection
   alone is not review, and review alone is not final acceptance.
5. Task completion remains an independent human or commander decision recorded
   against the evidence above.

## Critical-message acknowledgement and recovery

AIQ-28 stays open, but its acknowledgement rule is fixed as draft
disposition. Three outcomes stay distinct: accepted into a mailbox, delivered
to a live recipient, and processed with an acknowledged result. None of them
means that a tool effect succeeded.

1. Task assignments, approvals, cancellation, and result acknowledgements are
   critical messages. They must not silently disappear under
   observation-stream drop policies. Loss-tolerant progress observations may
   coalesce or drop with counters; critical messages must not.
2. Bounded capacity is handled by refusing new requests or backpressure
   within accepted caps with an exposed refusal. Backpressure never silently
   escalates into spawning another agent.
3. Every critical message carries a stable identifier with deduplication,
   expiry, and explicit reconciliation. Retries reuse stable identifiers with
   payload conflict checks. Ordering is per task and recipient where needed,
   never a global total-order promise.
4. A crash between an effect and its acknowledgement leaves an `Unknown`
   outcome. Reconcile by status inspection or user direction before retry.
   Replay rebuilds supported state; it never silently re-executes effects,
   and effects require current grants. Exactly-once effects are never
   claimed.
5. Dead or stale routes fail closed. Cancellation before dispatch prevents
   effects from starting; cancellation after dispatch stops further admission
   and reports actual or `Unknown` outcomes without promising rollback.

## Frozen and deferred scope

Per the CTX-0013 task scope, the following are frozen and excluded from this
decision:

- Durable backend and schema selection (SQLite, structured files,
  append-oriented log, or hybrid), store-trait shaping (`TaskStore`,
  `MemoryStore`, `WorkspaceProvider`, `CheckpointStore`), and transaction
  boundaries.
- Optional search indexing beyond the inherited invalidation obligation.
- Replay mechanics: which states are reconstructible and what evidence
  distinguishes replay from effect re-execution.
- Standalone AI persistence and release profile, including whether any
  ephemeral v0.1 profile or post-1.0 durability is selected.
- Multi-agent organization runtime, automatic promotion from small tasks,
  measured depth and fan-out bounds, and atomic multi-level budget protocols.
- Service compatibility-key validation, lease heartbeat and fencing, context
  graph traversal bounds, and supervisor crash adoption.
- Panel-to-execution binding lifetime and no-UI feature-profile selection
  beyond the bounded-task R1 scope.
- Provider, transport, registry-split, and tool-schema selections.
- CarryCtx lifecycle ownership beyond the backend-or-handoff facet decided
  here.

Pointers:

- Backend, index-option, replay-contract, and release-profile proposals stay
  in [Persistence and evidence architecture](../persistence/persistence-evidence.md).
- Release-scope sequencing stays in
  [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md), whose
  non-goals (multi-agent organization and teams, task organization graph,
  persistent evidence database, agent dashboard) are unchanged by this
  decision.
- Native-service decomposition, process-boundary, and external-manager
  adapter proposals stay in [AI Architecture](ai-architecture.md).
- Team, delegation, budget, message, lease, and Panel proposals stay in
  [Agent coordination architecture](../agent/agent-coordination.md).
- Persistence-scope follow-up returns as CTX-0014 (R6), which depends on R3
  and this R5 disposition and is not decided here.

## Verification plan

A future implementation claiming this disposition must show, at minimum:

- Product task transitions admitted only by the product authority, with a
  CarryCtx projection that records without transitioning, granting,
  admitting, or accepting on its own.
- Standalone operation with no CarryCtx installation, plus a CarryCtx
  adapter path behind narrow store traits that projects the same state in
  without changing transition, budget, or acceptance behavior.
- One-service-core evidence that tool and CLI surfaces are thin,
  capability-checked projections of the same services with no drift between
  them, and no CLI-shell-out path from the model-facing task surface.
- Independent-review evidence with a different reviewer agent and session
  from the implementer, requirement plus evidence in reviewer hands,
  separate approval action, and negative evidence that self-review, shared
  PASS, cached PASS, self-report, and partial checks never count as
  acceptance.
- Critical-message evidence that assignments, approvals, cancellation, and
  result acknowledgements survive observation-stream pressure, refuse with
  explicit backpressure at capacity, deduplicate on stable identifiers, and
  reconcile `Unknown` outcomes by inspection or user direction with no
  exactly-once claim.
- Retention inheritance evidence that lifecycle records honor consented
  recording, pre-queue and pre-write redaction, user-only storage, deletion
  propagation, and typed unavailable disclosure.
- Deterministic coverage with seeded lifecycle fixtures (duplicate delivery,
  crash between effect and acknowledgement, stale generation takeover,
  capacity refusal) and fail-closed behavior when authorization, redaction,
  budget, or routing machinery is unavailable.

## Open points

This document changes the status of no register entry:

- AIQ-10 (task lifecycle authority and CarryCtx backend or handoff) stays a
  design choice, with AIQ-56 as its persistence alias covering the
  backend-or-handoff facet. The alias is not a separate lifecycle owner.
- AIQ-26 (independent review evidence criteria) stays a prerequisite.
  Acceptance cannot derive from self-review or shared PASS under the
  [Independent-review evidence criteria](#independent-review-evidence-criteria).
- AIQ-28 (critical-message acknowledgement and recovery) stays a
  prerequisite. Assignment, approval, cancellation, and result
  acknowledgement cannot silently drop or imply effect success under the
  rules above.

Promotion of any of these identifiers requires the canonical admission rule
cited by [AI Unresolved Questions](../product/ai-unresolved-questions.md). The
CarryCtx durable-task integration boundary is additionally tracked as a
cross-repository question in the shared governance corpus; this repository
links that register instead of copying it.

## Acceptance criteria

- Draft owner: CTX-0013 implementer (`ai-docs-ctx0013-impl`).
- Acceptance requires independent review by the architecture category owner,
  the docs curator, and a security reviewer, plus linkage of any promoted
  open question under the canonical rule. It is not granted by this draft.
- Suggested follow-ups, each as a separately scoped task: native Task
  Service transition and ready-query contract, store-trait and CarryCtx
  adapter boundary, handoff generation-fencing protocol, and the deferred R6
  backend, replay-contract, and release-profile selection.

## References

- [Agent coordination architecture](../agent/agent-coordination.md) (Draft): teams,
  delegation, budgets, messages, and Panel reconciliation vocabulary.
- [AI Architecture](ai-architecture.md) (Draft): platform stack, CarryCtx as
  durable task layer (DCT-1 through DCT-4), native agent services (NAS-1
  through NAS-3), and the existing CarryCtx and evidence reconciliation.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-10 with
  the AIQ-56 alias, AIQ-26, and AIQ-28.
- [Persistence and evidence architecture](../persistence/persistence-evidence.md) (Draft):
  design dimensions and AIQ-51 through AIQ-5C, used as input only.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) (Draft):
  experimental scope, non-goals, and required-control sequencing, used as
  input only.
- [Execution ownership R1](execution-ownership-r1.md) (Draft): decision
  pattern reference and single-agent execution baseline.
- [Context retention R3](context-retention-r3.md) (Draft): decision pattern
  reference and consent-bounded retention baseline.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounding IPC framing,
  scopes, and lifecycle contracts.
