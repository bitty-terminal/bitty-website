---
title: Persistence profile R6
description: Draft persistence profile for backend replay contract and standalone release scope
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 40
---

# Persistence profile R6

> Status: **draft**. This document records the CTX-0014 R6 draft disposition
> for persistence backend profile, replay contract, and standalone release
> scope only. It proposes no accepted architecture, authorizes no shipped
> behavior, and closes no open question. Normative security and IPC
> obligations override any experimental adoption stated here. Retention
> semantics stay with R3, lifecycle authority stays with R5, and every
> register entry below stays open; see
> [Frozen and deferred scope](#frozen-and-deferred-scope) and
> [Open points](#open-points).

## Purpose and scope

This decision covers persistence profile only:

- Representation, projection, index, and replay as four distinct dimensions
  with separate draft dispositions. Full-text search (FTS5) is optional and
  off by default.
- Execution evidence as an independent store facet: evidence records need
  not be a subset of a conversation event log.
- Replay contract: which states are reconstructed, what evidence
  distinguishes replay from effect re-execution, and how `Unknown`
  outcomes are reconciled.
- Standalone AI persistence and release profile (AIQ-5C): whether the
  v0.1 profile is ephemeral and when durable state ships. Neither
  ephemeral v0.1 nor post-1.0 deferral was pre-decided; this document
  decides the profile below with owner and reason.
- Removal of unsupported scheduling: no background maintenance scheduler
  is selected here.

Inputs are the design dimensions, privacy boundary, and AIQ-51 through
AIQ-5C in
[Persistence and evidence architecture](../persistence/persistence-evidence.md), the R3
baseline in [Context retention R3](context-retention-r3.md), the R5
disposition in [Task lifecycle R5](task-lifecycle-r5.md) (including the
AIQ-56 persistence alias of AIQ-10), the R2 gate order in
[Tool transport R2](tool-transport-r2.md), the R4 reuse bar in
[Code intelligence sharing R4](code-intelligence-sharing-r4.md), and the
experimental scope and non-goals in
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md). The
accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and the canonical security
corpus linked by [AI Architecture](ai-architecture.md) remain overriding
authority, including P0-AC-026.

No product code is introduced or described as implemented. No durable
journal, evidence store, index, or replay implementation exists today;
every substrate named below is a draft direction awaiting a scoped
implementation task with independent security review.

## Decision

**R6 selects a durable-capable profile with an ephemeral v0.1 as draft
disposition: one append-ordered journal over a transactional store with
file-held artifact bytes; projection, index, and replay as separate
derived operations; replay rebuilds supported state only and never
re-executes effects; v0.1 ships no durable store; durability lands as a
scoped post-v0.1 feature with the owner and evidence bar named
below.**

The reconciled rule is:

```text
authorized, redacted, still-retained records (R3 floor)
  -> append-ordered journal (single writer, transactional store)
  -> artifact bytes in structured user-only files, referenced by digest
  -> derived projection (working set) + optional index (off by default)
  -> replay reads retained records into supported state; no tool dispatch
  -> Unknown outcomes reconciled by inspection or user direction
  -> v0.1: bounded in-memory session only; durable scope deferred with owner
```

**Conflation of the four dimensions is rejected as a persistence
model.** A journal representation is not a projection, a projection is
not an index, and none of the three is a replay guarantee. An event log
does not imply full-text search; a summary does not certify original
tool outcomes; and a replayed state does not authorize a re-executed
effect.

**Silent effect re-execution is rejected as replay.** Rebuilding state
from retained records and dispatching a tool effect are separate
operations with separate grants. Exactly-once effects are never
claimed.

## Rationale

- One deletion obligation needs one invalidation order. A transactional
  store holding the ordered journal lets journal payloads and derived
  references invalidate atomically, which is the only store shape that
  directly serves the R3 propagation rule (payloads, evidence, derived
  summaries, indexes, caches, referenced artifacts). Structured files
  hold large artifact bytes outside the database so the journal stays
  bounded and queryable while bytes stay addressable by digest.
- A single writer removes multi-writer arbitration from the durable
  path. Concurrent session writers would need fencing and generation
  discipline that no scoped task has yet designed or evidenced; the
  draft therefore admits exactly one journal writer per store and
  leaves concurrent topologies deferred.
- Keeping projection, index, and replay distinct preserves the R3
  invariant that derived state carries no independent retention. Each
  derived operation revalidates consent, redaction, authorization, and
  freshness against surviving records instead of inheriting the
  journal's authority at write time.
- FTS5 stays optional because search is not storage. An event
  representation replays without any full-text index, and every index
  is a deletion-propagation liability: each new index is another copy
  that must invalidate with its source records. Optional, off by
  default, and scoped to retained redacted fields is the only index
  posture consistent with the R3 floor.
- Evidence independence follows from reader authorization. Verification
  results and execution metadata are shared only under per-reader
  re-authorization with freshness validation (R4 parity); tying that
  sharing surface to conversation-log shape would either leak broader
  authority through log references or force the log to carry fields it
  was never consented to hold.
- Ephemeral v0.1 follows from the blocking order. The v0.1 profile
  already lists the persistent evidence database as a non-goal and
  names AIQ-33 (unified authorization backend), AIQ-11 (maintenance
  ignores untrusted observations), and AIQ-37 (structured exec result
  schema) as truly blocking. Shipping durability before its gates
  exist would put redaction, consent, and deletion machinery on disk
  without the controls that make disk writes legitimate.

## Backend profile

The draft durable substrate, for post-v0.1 scoping only, is:

| Dimension              | Draft disposition                                                                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journal representation | Ordered, append-oriented entries in a transactional store (SQLite is the draft candidate). Single writer per store. Logical append order never overrides deletion.                                                                                             |
| Artifact bytes         | Structured user-only (`0600`) files referenced by digest from journal entries. Bytes inherit the referencing record's consent, retention, and deletion obligations.                                                                                            |
| Context projection     | Derived working set or summary built from surviving authorized sources. Compaction shifts the projection boundary; it neither deletes journal entries nor widens read authority.                                                                               |
| Search index           | Optional and off by default. FTS5 or another index only over retained redacted fields; deletion or expiry of a source record invalidates every derived index entry.                                                                                            |
| Execution evidence     | Independent record facet (identity, input fingerprint, tool and adapter version, outcome, timestamps, completeness, retained references). May live beside the journal, referenced by events, or held separately; it is not required to be an event-log subset. |
| Background scheduling  | None selected. No maintenance, compaction, or garbage-collection scheduler is adopted here; see [Removed scheduling](#removed-scheduling).                                                                                                                     |

Substrate notes:

1. SQLite is a draft candidate, not a selected dependency. The
   disposition needs transactional invalidation, ordered reads, and
   bounded storage; any substrate meeting that bar with evidence may
   still be proposed by the scoped implementation task.
2. Schema shape and transaction boundaries (AIQ-51) stay open. Only
   the obligations are fixed: minimized redacted writes, user-only
   storage, export preview, atomic invalidation with derived copies,
   and bounded size with explicit truncation.
3. Cross-store policy authority (AIQ-54) stays host-constrained: host
   limits bound user and tool preferences; no store negotiates its
   own retention ceiling.
4. Typed redaction marker representation (AIQ-5A) stays open. Only the
   R3 timing requirement (pre-queue and pre-write, P0-AC-026) is
   fixed; the marker format and invalidation protocol need their own
   scoped task.
5. Bounded observability queries (AIQ-5B) stay open beyond the rule
   that queries disclose truncation and absent evidence explicitly.

Supporting constraints inherited from inputs:

- R3 baseline from [Context retention R3](context-retention-r3.md):
  durable records hold only authorized, redacted, still-retained
  content; deletion and expiry propagate everywhere; missing content
  resolves to typed unavailable, never to silent recovery.
- R5 baseline from [Task lifecycle R5](task-lifecycle-r5.md): the
  durable record never transitions product state, never grants
  capability, and never self-accepts a review. Checkpoint pointers
  name retained records; they neither resurrect processes nor
  re-execute effects.
- R2 gate order from [Tool transport R2](tool-transport-r2.md):
  every effect passes the unified authorization backend with
  pre-queue and pre-write typed redaction before any durable write.
- R4 reuse bar from
  [Code intelligence sharing R4](code-intelligence-sharing-r4.md):
  cached results disclose `reused from execution` versus `executed
now`; a cached PASS never supplies independent approval.
- PP-2 typed redaction pre-queue and pre-write, PP-4 no on-disk
  persistence without consent, and P0-AC-026 are mandatory and are
  not reopened by this draft.

## Replay contract

AIQ-52 stays open, but its contract is fixed as draft disposition.
Replay is a read path over surviving authorized records:

1. Replay reconstructs supported state only. Supported state is the
   session, projection, and evidence views rebuildable from retained
   ordered records plus referenced artifact bytes that are still
   retained.
2. Replay never dispatches a tool effect, silently or otherwise. A
   replayed step that originally produced an effect yields the
   recorded attributed outcome (`Succeeded`, `Failed`, `Cancelled`,
   or `Unknown`), never a fresh execution.
3. Replay output is marked as replayed. Consumers can distinguish a
   reconstructed state from a live execution, including which
   records are missing and disclosed as typed unavailable.
4. Effects after replay require current grants. Resuming work from a
   replayed state re-enters the R2 gate order (authorization,
   consent, budget, redaction) with no inherited authority from the
   original run.
5. Reconstruction after deletion, expiry, or destructive journal
   reduction (AIQ-57) is bounded by surviving records. A summary
   cannot recreate omitted bytes or certify original tool outcomes;
   only surviving originals are re-expandable.
6. Per-reader evidence sharing (AIQ-58) applies inside replay:
   replayed evidence is re-authorized per reader with freshness
   validation before delivery, and cache references never leak
   broader authority.

## Unknown-effect reconciliation

AIQ-59 stays open, but its reconciliation rule is fixed as draft
disposition:

1. A crash between an effect and its acknowledgement leaves an
   `Unknown` outcome. Durable intent recorded before the effect is
   an observation, not proof that the effect ran exactly once.
2. Reconcile by state inspection or user direction before retry.
   Retry eligibility is decided per effect against current state,
   not granted by the log's existence.
3. Cancellation before dispatch prevents effects from starting;
   cancellation after dispatch cannot promise reversal. Recovery
   reports actual or `Unknown` outcomes without rollback claims.
4. Replay of a journal containing `Unknown` outcomes preserves the
   `Unknown` marking. Replay never resolves uncertainty into a
   fictitious success or failure.

## Removed scheduling

No background maintenance scheduling is selected by this decision.
Concretely:

1. The candidate eligibility sequence and scheduling analysis
   carried in
   [Persistence and evidence architecture](../persistence/persistence-evidence.md)
   remain an unadopted proposal. They are not part of the selected
   profile and authorize no scheduler, timer, or background worker.
2. Compaction, expiry sweeps, and derived-record garbage collection
   run only as explicit bounded operations admitted through the
   same authorization, budget, and redaction gates as any other
   work, or stay deferred with the durability scope below.
3. Background maintenance scheduling and consistency (AIQ-05) stays
   a design choice owned by future scoping. Bounded responsive
   admission is preserved: no maintenance path may starve
   interactive work or exceed its budget.

## Release profile and AIQ-5C disposition

AIQ-5C (standalone AI persistence and release profile) stays open as
a register entry, but its profile is decided as draft disposition:

| Profile phase | Draft disposition                                                                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v0.1          | Ephemeral. Bounded in-memory session only with no durability promise. No durable journal, evidence store, index, or replay ships in v0.1. This confirms the `persistent evidence database` non-goal in [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md). |
| Post-v0.1     | Durable scope deferred with owner and reason (below). Durability lands only after the v0.1 blocking controls (AIQ-33, AIQ-11, AIQ-37) and the R3 deletion-propagation evidence bar are met. No post-1.0 milestone is prescribed.                                                 |

Deferral owner and reason:

- Owner: the architecture category owner, via a separately scoped
  implementation task for the durable store. This R6 draft only
  bounds that task; it does not staff, schedule, or pre-approve it.
- Reason: durability without its gates is a liability. Consent
  ledgering, pre-queue and pre-write redaction, per-reader
  authorization, deletion propagation across derived copies, and
  crash reconciliation must exist with evidence before records
  persist beyond the process. The v0.1 blocking questions name
  exactly those gates.
- No prescription beyond the gate: this document sets no version
  number, date, or milestone for durability because release
  numbering itself remains open in the v0.1 profile. Claiming a
  post-1.0 landing without a release decision would be an
  unfounded prescription, so the disposition names the entry
  condition (gates plus evidence) instead of a calendar.

## Frozen and deferred scope

Per the CTX-0014 task scope, the following are frozen and excluded
from this decision:

- Exact store schema, transaction boundaries, and substrate
  dependency selection beyond the draft candidate named above.
- Optional index mechanism selection beyond the optional and
  off-by-default posture.
- Typed redaction marker representation and invalidation protocol
  beyond the fixed pre-queue and pre-write timing.
- Bounded observability query surface, latency and storage
  measurement, and garbage-collection behavior evidence.
- Background maintenance scheduling mechanism beyond the removal
  recorded above.
- Per-reader evidence-sharing enforcement mechanism across
  authorization scopes.
- Unknown-effect retry-eligibility protocol beyond the
  reconcile-before-retry rule.
- Single-agent execution ownership (R1), unified authorization and
  path selection (R2), retention semantics (R3), sharing and reuse
  (R4), and lifecycle authority (R5), all inherited unchanged.
- Release numbering and milestone assignment beyond the
  gate-conditioned deferral above.

Pointers:

- Journal, evidence, projection, index, and replay proposals stay in
  [Persistence and evidence architecture](../persistence/persistence-evidence.md),
  used as input only.
- Retention obligations stay in
  [Context retention R3](context-retention-r3.md).
- Lifecycle backend-or-handoff facet stays in
  [Task lifecycle R5](task-lifecycle-r5.md).
- Release-scope sequencing stays in
  [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md),
  whose non-goals are confirmed, not altered, by this decision.

## Verification plan

A future implementation claiming this disposition must show, at
minimum:

- Journal evidence that durable writes occur only under explicit
  applicable consent after pre-queue and pre-write typed redaction,
  minimized, user-only (`0600`), with exact export preview, and
  that unconsented disk recording is absent.
- Deletion propagation evidence across journal payloads, artifact
  bytes, projections, indexes, caches, and exports, with tombstones
  holding only permitted absence metadata and no backup or replay
  path resurrecting deleted, expired, or never-recorded content.
- Dimension-separation evidence that projection, index, and replay
  each revalidate against surviving records: an index miss after
  deletion, a projection that cannot widen read authority, and a
  replay that performs no tool dispatch.
- Replay evidence that reconstructed state is marked as replayed,
  that missing records surface as typed unavailable with reasons,
  that replayed effects yield recorded outcomes rather than fresh
  executions, and that resumed work re-passes the full
  authorization gate order.
- Unknown-reconciliation evidence with seeded crash fixtures
  between effect and acknowledgement: `Unknown` preserved through
  replay, reconciled by inspection or user direction, retried only
  when eligible, with no exactly-once claim.
- Negative scheduling evidence: no background maintenance worker
  runs without an explicit bounded admission; probing for timer or
  sweep behavior yields nothing outside admitted operations.
- Release-gate evidence that the v0.1 tree contains no durable
  store path, and that durability work starts only after the
  AIQ-33, AIQ-11, and AIQ-37 gates plus the R3 propagation bar
  are evidenced.
- Deterministic coverage with seeded consent, redaction, deletion,
  expiry, crash, and budget fixtures, plus fail-closed behavior
  when consent, redaction, authorization, or budget machinery is
  unavailable.

## Open points

This document changes the status of no register entry. Promotion of
any identifier requires the canonical admission rule cited by
[AI Unresolved Questions](../product/ai-unresolved-questions.md):

- AIQ-51 (schema and transaction boundaries) stays a design choice.
  Representation is bounded above; the exact schema is not selected.
- AIQ-52 (state reconstruction versus effect re-execution contract)
  stays a prerequisite. The no-silent-re-execution rule and
  replay marking are fixed as draft disposition; the reconstructible
  state set is not closed.
- AIQ-53 (backend and optional search index) stays a design choice.
  FTS5 is confirmed optional and off by default; the substrate
  candidate is not a dependency decision.
- AIQ-54 (cross-store retention policy authority) stays a
  prerequisite. Host limits constrain user and tool preferences.
- AIQ-55 (deletion, expiry, and derived-record invalidation) stays
  a prerequisite. The propagation obligation is inherited from R3;
  the protocol stays open.
- AIQ-56 (alias of AIQ-10: CarryCtx persistence integration) stays
  a design choice with the R5 backend-or-handoff facet. The alias
  is not a separate persistence owner.
- AIQ-57 (reconstruction after deletion, expiry, or destructive
  journal reduction) stays a prerequisite. Missing evidence is
  disclosed as typed unavailable.
- AIQ-58 (per-reader evidence sharing enforcement) stays a
  prerequisite. Cache references cannot leak broader authority.
- AIQ-59 (Unknown effect reconciliation and retry eligibility)
  stays a prerequisite. The event log alone grants neither
  exactly-once nor safe retry.
- AIQ-5A (typed redaction markers and invalidation mechanism)
  stays a prerequisite. The pre-queue and pre-write timing is
  fixed; representation is not.
- AIQ-5B (bounded authorized observability queries) stays a design
  choice. Query needs and performance evidence remain to be shown.
- AIQ-5C (standalone AI persistence and release profile) stays a
  scope entry. The ephemeral-v0.1 plus gate-conditioned deferral
  disposition above selects a draft direction without prescribing
  a release.

AIQ-10/56 and AIQ-22/42 alias mappings are retained unchanged.

## Acceptance criteria

- Draft owner: CTX-0014 implementer (`ai-docs-ctx0014-impl`).
- Acceptance requires independent review by the architecture
  category owner, the docs curator, and a security reviewer, plus
  linkage of any promoted open question under the canonical rule.
  It is not granted by this draft.
- Suggested follow-ups, each as a separately scoped task: store
  schema and transaction-boundary design (AIQ-51), typed redaction
  marker representation (AIQ-5A), deletion and garbage-collection
  propagation protocol (AIQ-55), bounded observability query
  surface (AIQ-5B), Unknown-effect retry-eligibility protocol
  (AIQ-59), and the deferred post-v0.1 durability implementation
  behind the gates named above.

## References

- [Persistence and evidence architecture](../persistence/persistence-evidence.md)
  (Draft): design dimensions and AIQ-51 through AIQ-5C, used as
  input only.
- [Context retention R3](context-retention-r3.md) (Draft): decision
  pattern reference and consent-bounded retention baseline.
- [Task lifecycle R5](task-lifecycle-r5.md) (Draft): decision
  pattern reference and backend-or-handoff baseline.
- [Tool transport R2](tool-transport-r2.md) (Draft): unified
  authorization backend and gate order.
- [Code intelligence sharing R4](code-intelligence-sharing-r4.md)
  (Draft): reuse disclosure and cached-PASS separation.
- [Execution ownership R1](execution-ownership-r1.md) (Draft):
  decision pattern reference only.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft):
  AIQ-51 through AIQ-5C.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
  (Draft): experimental scope, non-goals, and required-control
  sequencing.
- [AI Architecture](ai-architecture.md) (Draft): platform stack,
  privacy-first controls, and the security corpus linkage.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounding IPC
  framing, scopes, and lifecycle contracts.
