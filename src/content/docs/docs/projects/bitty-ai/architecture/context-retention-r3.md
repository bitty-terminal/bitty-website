---
title: Context retention R3
description: Draft retention semantics for consent deletion propagation and recovery limits
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 36
---

# Context retention R3

> Status: **draft**. This document records the CTX-0010 R3 draft disposition
> for context retention semantics only. It proposes no accepted
> architecture, authorizes no shipped behavior, and closes no open question.
> Normative security and IPC obligations override any experimental adoption
> stated here. Backend, replay-mechanics, and release-scope choices are frozen
> and deferred; see [Frozen and deferred scope](#frozen-and-deferred-scope).

## Purpose and scope

This decision covers retention semantics only:

- Completeness holds only for authorized, redacted, still-retained records.
  There is no unconditional lossless promise.
- Bounded in-memory session versus consented durable recording.
- Input recording opt-in, minimization, user-only storage, and export preview.
- Deletion and expiry propagation to journal payloads, artifacts, derived
  summaries, indexes, and caches.
- Typed unavailable references and bounded recovery, replay, and debugging.

Inputs are the retention-relevant sections of
[Context management architecture](../context/context-management.md), the privacy boundary
in [Persistence and evidence architecture](../persistence/persistence-evidence.md),
[AI Architecture](ai-architecture.md) PP-2 (Typed redaction) and PP-4 (No
on-disk persistence without consent) under
[Privacy-first](ai-architecture.md#privacy-first), AIQ-01 through AIQ-11 and
AIQ-57 in [AI Unresolved Questions](../product/ai-unresolved-questions.md), and
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md). The accepted
[IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and the canonical security corpus linked
by [AI Architecture](ai-architecture.md) remain overriding authority,
including P0-AC-026.

P0-AC-026 and PP-2/PP-4 pre-queue and pre-write redaction are mandatory and
are not reopened by this draft. The CTX-0008 retention wording reconciled in
[Context management architecture](../context/context-management.md) and
[Persistence and evidence architecture](../persistence/persistence-evidence.md) is the floor;
this decision never retreats to unconditional lossless retention.

No product code is introduced or described as implemented.

## Decision

**R3 selects consent-bounded retention as draft disposition: retain only what
is authorized, redacted, and still retained; delete everywhere on expiry or
request; disclose the rest as unavailable.**

The reconciled contract is:

```text
bounded in-memory session (default, no durability promise)
  -> explicit applicable consent + pre-queue/pre-write redaction
  -> minimized user-only durable records with export preview
  -> derived projections, summaries, indexes, caches (invalidated on deletion)
  -> typed unavailable for missing, expired, deleted, or never-recorded bytes
```

**Unconditional lossless retention is rejected as a retention model.** No
completeness, losslessness, replay, or recovery claim covers unredacted
secrets, unconsented disk writes, deleted or expired records, never-recorded
input, clipboard or raw environment by default, or bytes outside the surviving
authorized set.

Per-feature draft contract:

| Feature                                   | Draft retention disposition                                                                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bounded in-memory session                 | Default working state with no durability promise. It never authorizes durable recording and never substitutes for consent.                                                    |
| Consented durable journal                 | Durable only with explicit applicable consent, after mandatory pre-queue and pre-write typed redaction, minimized, user-only (`0600`), with exact export preview.             |
| Input recording                           | Off by default and separately opt-in. Clipboard and raw environment are absent by default. Consent never authorizes unredacted secrets.                                       |
| Context projections and compaction        | Derived views only. Compaction shifts the projection boundary; it neither deletes retained journal entries itself nor widens any reader's authority.                          |
| Execution evidence and artifacts          | Bounded redacted outcome metadata plus artifact references. Shared only under reader re-authorization with freshness validation, disclosing `reused` versus `executed now`.   |
| Indexes, caches, and cross-turn summaries | Derived state with no independent retention. Deletion or expiry invalidates every derived copy, including search indexes, schema caches, memory summaries, and re-expansions. |
| Export, replay, and debugging             | Bounded by surviving authorized records. Missing content is disclosed as typed unavailable; backups and replay never resurrect deleted, expired, or never-recorded content.   |

## Rationale

- A bounded session that happens to exist in memory is not permission to keep
  it on disk. Durability needs its own explicit consent because disk writes
  outlive the turn, the process, and the original authorization context.
- Redaction before queueing and before writing is the only placement that
  keeps secrets out of queues, traces, snapshots, and exports at once.
  After-the-fact scrubbing cannot retract copies already fanned out to
  derived stores.
- Minimization, user-only storage, and export preview bound the blast radius:
  less recorded, visible only to the owning user, and inspectable before it
  leaves the host.
- Input, clipboard, and raw environment are the highest-risk sources, so they
  default to absent and require their own opt-in rather than inheriting a
  general recording consent.
- Treating projections, summaries, indexes, and caches as derived state with
  no independent retention keeps one deletion obligation instead of one per
  store. Otherwise every new cache silently becomes a retention bypass.
- Typed unavailable references make absence explicit to readers and models.
  Silent recovery, best-effort reconstruction, or fictitious bytes would turn
  a privacy deletion into a correctness-looking lie.

## Consent and recording contract

The draft consent and recording rules are:

1. Durable recording requires explicit applicable consent for the records in
   question. A bounded in-memory session, a feature flag, or a general
   product opt-in is not recording consent.
2. PP-2 typed redaction applies pre-queue and pre-write. Records that cannot
   be redacted to policy are not queued and not written.
3. Recording is minimized to what the declared feature needs. Full
   conversation, full file reads, full scrollback, clipboard, and raw
   environment are never default capture.
4. Input recording is off by default and separately opt-in, independent of
   durable journal consent.
5. Durable stores are user-only (mode `0600`). Provider credentials never
   enter durable context stores, and consent never permits unredacted traces.
6. The redacted write path is previewable before export. Raw export requires
   a separate future policy and cannot weaken P0-AC-026.
7. Consent is scoped and revocable. Revocation stops further durable capture
   under that grant; already-retained records remain governed by deletion
   and expiry, not by retroactive re-authorization.

## Deletion propagation contract

The draft deletion and expiry rules are:

1. Deletion or expiry propagates to journal payloads, execution evidence,
   derived summaries, indexes, caches, and referenced artifacts. Partial
   propagation is non-conformance with this disposition.
2. Tombstones preserve only permitted absence metadata. They never retain
   deleted sensitive payloads.
3. Search indexes, schema caches, memory summaries, compaction summaries, and
   re-expansion caches are invalidated with the source records. A cache hit
   after deletion is a defect, not a performance feature.
4. Logical append-only history is subordinate to deletion. Immutability of
   ordering never justifies retaining deleted content.
5. Backups, snapshots, and exports inherit the same deletion obligation
   within their stated bounds. No backup or export path resurrects deleted,
   expired, or never-recorded content.
6. The exact propagation and reconstruction protocol stays open (see AIQ-55
   and AIQ-5A). The propagation obligation itself is not optional pending
   that protocol choice.

## Recovery and replay limits

Recovery, replay, and debugging under this disposition are bounded:

- Reconstruction draws only on surviving authorized records. A summary cannot
  recreate omitted bytes or certify original tool outcomes.
- Projection-only compaction does not itself destroy originals, but only
  surviving originals are re-expandable. Retention expiry and user deletion
  remain effective after compaction.
- State replay and effect re-execution are separate operations. Replay
  rebuilds supported state; it never silently re-executes effects, and
  effects require current grants.
- Unknown outcomes are reconciled by state inspection or user direction
  before retry, without rollback or exactly-once claims.
- References to missing, expired, deleted, or never-recorded content resolve
  to typed unavailable markers with an explicit reason, never to silently
  recovered bytes.

## Frozen and deferred scope

Per the CTX-0010 task scope, the following are frozen and excluded from this
decision:

- Durable backend and schema selection (SQLite, structured files,
  append-oriented log, or hybrid) and transaction boundaries.
- Optional search indexing (including whether FTS5 or another index is
  useful) beyond the invalidation obligation stated above.
- Replay mechanics: which states are reconstructible and what evidence
  distinguishes replay from effect re-execution.
- Standalone AI persistence and release profile, including whether any
  ephemeral v0.1 profile or post-1.0 durability is selected.
- Typed redaction marker representation and invalidation protocol; only the
  pre-queue and pre-write timing requirement is fixed.
- Bounded observability query surface and performance evidence.
- CarryCtx lifecycle ownership and any backend-or-handoff integration facet.
- Per-reader evidence-sharing enforcement mechanism across authorization
  scopes.
- Unknown-effect reconciliation and retry-eligibility protocol.

Pointers:

- Backend, index-option, replay-contract, and release-profile proposals stay
  in [Persistence and evidence architecture](../persistence/persistence-evidence.md).
- Release-scope sequencing stays in
  [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md).
- Persistence-scope follow-up returns as CTX-0014 (R6), which depends on this
  R3 disposition and is not decided here.

## Verification plan

A future implementation claiming this disposition must show, at minimum:

- Durable writes occur only under explicit applicable consent, after
  pre-queue and pre-write typed redaction, with minimized user-only (`0600`)
  storage and exact export preview.
- Negative evidence that seeded secrets never appear in default inspection,
  unlabeled traces, queues, snapshots, or exports, and that unconsented disk
  recording is absent.
- Input recording off by default with separate opt-in evidence, and
  clipboard plus raw environment absent by default.
- Deletion and expiry propagation evidence across journal payloads,
  artifacts, derived summaries, indexes, and caches, with tombstones holding
  only permitted absence metadata.
- Typed unavailable disclosure for missing, expired, deleted, or
  never-recorded references, with no silent recovery path.
- Re-expansion, replay, and debugging bounded by surviving authorized
  records, with replay distinguished from effect re-execution and Unknown
  outcomes reconciled before retry.
- Deterministic coverage with seeded consent, redaction, deletion, and
  expiry fixtures, plus fail-closed behavior when consent, redaction, or
  budget machinery is unavailable.

## Open points

This document changes the status of no register entry:

- AIQ-01 (per-request versus incremental context generation) stays a design
  choice. View cadence does not alter retention authority.
- AIQ-02 (compression backend selection) stays a design choice within
  provider consent and budget.
- AIQ-03 (artifact expiry and reference invalidation) stays a prerequisite.
  Retained artifacts must honor deletion and bounds.
- AIQ-04 (selection priority versus durable retention authority) stays a
  prerequisite. Pinning and protection markers cannot override consent,
  redaction, expiry, deletion, or resource ceilings.
- AIQ-05 (background maintenance scheduling and consistency) stays a design
  choice preserving bounded responsive admission.
- AIQ-06 (re-expansion after projection compaction) stays a design choice.
  Only surviving authorized originals are recoverable.
- AIQ-07 (cross-session memory retrieval mechanism) stays a prerequisite
  under consent, freshness, and deletion propagation.
- AIQ-08 (MCP schema cache invalidation) stays a prerequisite. Stale schemas
  cannot authorize changed effects.
- AIQ-09 (skill format, versioning, and ecosystem compatibility) stays a
  design choice. Loading declarations grant no execution authority.
- AIQ-10 (task lifecycle authority and CarryCtx backend or handoff) stays a
  design choice with AIQ-56 as its persistence alias.
- AIQ-11 (context injection-defense enforcement evidence) stays a
  prerequisite. Untrusted observations cannot control maintenance policy.
- AIQ-57 (reconstruction after deletion, expiry, or destructive journal
  reduction) stays a prerequisite. Missing evidence must be disclosed as
  typed unavailable.

Promotion of any of these identifiers requires the canonical admission rule
cited by [AI Unresolved Questions](../product/ai-unresolved-questions.md).

## Acceptance criteria

- Draft owner: CTX-0010 implementer (`ai-docs-ctx0010-impl`).
- Acceptance requires independent review by the architecture category owner,
  the docs curator, and a security reviewer, plus linkage of any promoted
  open question under the canonical rule. It is not granted by this draft.
- Suggested follow-ups, each as a separately scoped task: deletion and GC
  propagation protocol with typed redaction markers, per-feature consent
  scope modeling, unavailable-reference disclosure format, and the deferred
  R6 backend, replay-contract, and release-profile selection.

## References

- [Context management architecture](../context/context-management.md) (Draft):
  session-versus-projection invariant and the CTX-0008 retention floor.
- [Persistence and evidence architecture](../persistence/persistence-evidence.md) (Draft):
  privacy and retention boundary, design dimensions, and AIQ-51 through
  AIQ-5C.
- [AI Architecture](ai-architecture.md) (Draft): PP-2 (Typed redaction),
  PP-4 (No on-disk persistence without consent), and the normative security
  corpus linkage.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-01
  through AIQ-11 and AIQ-57.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) (Draft):
  experimental scope, non-goals, and required-control sequencing.
- [Execution ownership R1](execution-ownership-r1.md) (Draft): decision
  pattern reference only; its single-agent execution conclusions are not
  reused here.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounding IPC framing,
  scopes, and lifecycle contracts.
