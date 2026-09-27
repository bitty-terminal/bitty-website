---
title: Code intelligence sharing R4
description: Draft sharing disposition for domain-keyed LSP broker isolation and reuse evidence bar
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 39
---

# Code intelligence sharing R4

> Status: **draft**. This document records the CTX-0012 R4 draft disposition
> for code-intelligence sharing only. It proposes no accepted
> architecture, authorizes no shipped behavior, and closes no open question.
> Normative security and IPC obligations override any experimental adoption
> stated here. Single-agent execution ownership stays with R1, transport
> and authorization stays with R2, retention semantics stays with R3, and
> multi-agent organization scope is frozen and deferred; see
> [Frozen and deferred scope](#frozen-and-deferred-scope).

## Purpose and scope

This decision covers code-intelligence sharing only:

- Domain-keyed language-service sharing: when one language-service instance
  may serve more than one consumer, and when it must not.
- Lease fencing and generation fencing for shared broker instances, inherited
  from the service supervision model.
- Complete input fingerprints for verification reuse, per-reader
  re-authorization before delivery, and the separation between a cached PASS
  and an independent approval.
- The equivalence and isolation bar that effectful coalescing must clear;
  coalescing stays disabled until that bar is met.

Inputs are [Code intelligence architecture](../agent/code-intelligence.md), the shared
workspace service supervision model in
[Agent coordination architecture](../agent/agent-coordination.md), AIQ-21, AIQ-22,
and AIQ-41 through AIQ-48 in
[AI Unresolved Questions](../product/ai-unresolved-questions.md), the R1 baseline in
[Execution ownership R1](execution-ownership-r1.md), the R2 baseline in
[Tool transport R2](tool-transport-r2.md), the R3 baseline in
[Context retention R3](context-retention-r3.md), the review separation rule
in [Task lifecycle R5](task-lifecycle-r5.md), and
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md). The accepted
[IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and the canonical security corpus linked
by [AI Architecture](ai-architecture.md) remain overriding authority.

No product code is introduced or described as implemented.

## Decision

**R4 selects domain-keyed exclusive sharing as draft disposition: one
language-service instance serves only consumers inside a single proven
isolation domain; every acquisition, query, result delivery, and diagnostic
subscription is authorized against the current caller; verification reuse
requires a complete input fingerprint plus per-reader re-authorization and
freshness validation; a cached PASS never supplies an independent approval;
and effectful coalescing stays disabled unless equivalence plus isolation is
proven for every waiter.**

The reconciled rules are:

```text
compatible domain key + per-caller authorization + lease + generation
  -> shared broker instance (read-only analysis surface only)
  -> semantic result with identity, freshness, and confidence metadata
  -> per-reader re-authorization + reuse-policy validation before delivery
  -> disclosed as reused from execution, never as executed now

incompatible domain, unproven isolation, or incomplete fingerprint
  -> separate service domains (no sharing), or unsupported
```

**Cross-scope sharing on filtering alone is rejected as a sharing model.**
When a privileged language server indexes files beyond a narrow caller's
read scope, post-query result filtering is not a non-disclosure proof. The
disposition is then separate service domains, not a shared instance with a
filter. Sharing without a proven isolation mechanism is excluded, not
degraded.

**Effectful coalescing by default is rejected as a reuse model.** Joining an
in-flight build, test, or other effectful execution, or skipping a new
execution because a cache entry exists, requires proven input equivalence
and proven waiter isolation with an independent grant for every waiter. Until
that evidence exists, each authorized request runs separately or returns
unsupported.

## Rationale

- A language server is stateful: open documents, overlays, configuration,
  toolchain identity, and indexed file scope all shape its answers. Two
  callers who merely share a commit hash or a visible workspace do not
  necessarily share that state. The domain key makes the sharing precondition
  explicit instead of assumed.
- Authorization attaches to the caller, not to the server. A lease
  references a service instance; it never transfers the original caller's
  capability to a later waiter. Unioning the capabilities of all attached
  consumers would turn the broadest reader into every reader's authority.
- A cache entry records that an execution happened, not that the current
  reader may see it or that its inputs still hold. Fingerprint completeness,
  reader re-authorization, and freshness validation each answer a different
  question, so none of them substitutes for the others.
- Reuse and approval answer different questions as well. A stored PASS says
  what one execution observed; an approval says an independent reviewer
  accepted evidence under the review criteria. Counting one as the other
  collapses the R5 separation between evidence and acceptance.
- Effectful work can mutate files, consume budgets, and contact services.
  Merging two such executions without proven equivalence risks attributing
  one caller's side effects to another caller's authorization. Disabled
  by default is the only fail-closed posture until equivalence and
  isolation are both demonstrated.

## Domain-keyed sharing contract

The draft sharing key for a language-service instance contains, at minimum:

1. Execution-target identity and generation, inherited from the R1 baseline.
2. Repository, worktree, or overlay identity with canonical root identity.
3. Server executable and version identity, language, negotiated features,
   and encoding.
4. Toolchain, relevant environment profile, and initialization and
   configuration hashes, referenced through protected opaque identities,
   never through raw credentials in keys or logs.
5. Document-overlay namespace and access and isolation domain.

The draft matching rules are:

1. Same commit, same language, or same visible workspace is insufficient
   for sharing. Different unsaved buffers, worktrees, containers,
   toolchains, or access domains require separate service state unless the
   adapter proves isolation for the exact difference.
2. Any key component that changes after the instance started but before all
   waiters are satisfied invalidates sharing for the affected waiters. The
   broker either admits them to a matching instance or returns unsupported;
   it never serves them from the stale instance.
3. Secret-dependent operations are unsuitable for generic reuse until their
   confidentiality policy is established. Raw credentials never enter cache
   keys, fingerprints, or logs.
4. A privileged server that indexes files beyond a narrow caller's read
   scope shares with that caller only under a proven non-disclosure
   mechanism. Post-query filtering alone is not that proof. When no such
   proof exists, the callers use separate service domains.

## Lease and generation fencing

Shared broker instances follow the supervision model from
[Agent coordination architecture](../agent/agent-coordination.md), which this
decision inherits without restating as a new mechanism:

- Service states are Starting, Ready, Idle, Draining, Stopped, and Failed,
  with a fresh generation on every restart. A restart invalidates
  outstanding request generations; only authorized document state is
  rehydrated.
- A candidate lease binds principal and run, target and execution with
  generation, purpose, permitted operations, expiry, and assignment
  version. Several read leases can coexist. A lease references a service;
  it is not a transferable permission token.
- The outgoing writer generation is fenced before a new writer is admitted
  for any single-writer resource, including the authoritative overlay for
  one document URI. Conflicting edits to one URI require a single
  authoritative overlay or separate service state.
- Revocation prevents new requests, reads, and effects for the revoked
  principal at the next dispatch boundary, even while the instance remains
  alive for other authorized consumers.
- Cancellation of one waiter never cancels shared work still required by
  another authorized waiter. Shared pressure handling stops admitting
  optional work, evicts eligible idle instances, and bounds restarts with
  backoff, without attributing one principal's cancellation to another's
  execution.
- Launch identity, generation, and descendants are tracked through the
  supervising backend. Supervisor crash and host shutdown reconcile through
  status inspection; durable handles never authorize adopting an arbitrary
  survivor, and uncertain effects are never retried silently.

Lease heartbeat intervals, crash reconciliation timing, supervisor adoption
rules, and writer transfer races stay open under AIQ-23, AIQ-2B, and AIQ-2C
and are not selected here.

## Language-service broker isolation contract

The broker is the only protocol client: it owns initialization, document
open, change, and close ordering, versioned overlays, request correlation
with bounded timeout and cancellation propagation, bounded notifications,
and shutdown. Consumers never write directly into a shared server stream.

The draft broker rules are:

1. The broker authorizes each acquisition, each query, each result delivery,
   and each diagnostic subscription against the current caller under the
   R2 unified authorization backend. Capabilities of attached consumers are
   never unioned.
2. The broker serves only the semantic tool surface defined in
   [Code intelligence architecture](../agent/code-intelligence.md): definitions,
   references, document and workspace symbols, hover, and bounded
   diagnostics. Arbitrary model-generated language-server calls are not
   admitted.
3. Every result carries source identity, snapshot and document version,
   method and provider, freshness, confidence, and truncation state.
   Syntax fallback is labeled as fallback and never claims semantic
   equivalence. Unknown freshness stays visible.
4. Formatting, rename, code actions, server-command execution, and
   server-initiated edits return effectful proposals, never immediate
   edits. Proposals apply only through the permission and expected-revision
   ChangeSet path. Starting an analysis server can execute project build
   logic, so tool availability never authorizes process creation, project
   code execution, or network access on its own.
5. Diagnostic subscriptions are bounded, attributed, and prioritized with
   an explicit rate limit. Under pressure the broker sheds optional
   diagnostic load with counters rather than silently dropping
   task-critical messages.

## Verification fingerprint and reuse contract

The `WorkspaceRevision = HEAD plus dirty hashes plus configuration` sketch
is incomplete as a reuse identity. A verification fingerprint additionally
requires, at minimum:

1. Relevant untracked and generated files, submodule state, deletions, and
   symlink identities with target policy.
2. Unsaved overlay identity and generation for the requesting view.
3. Tool executable and version, exact argument vector, working directory
   and target selection.
4. Dependency resolution and lockfile state and the applicable environment
   profile and isolation policy.
5. An input manifest stating what was included and what could not be
   captured. Clock, network, randomness, external-service, and
   machine-dependent tests are non-cacheable by default unless a reviewed
   adapter constrains those inputs.

The draft eligibility sequence for any reuse is:

1. Validate caller, target, tool, effect class, budgets, and current
   consent under the R2 gate order.
2. Resolve a bounded input manifest and reuse policy. Unknown inputs
   disable generic caching and in-flight merging of effectful work.
3. Store an immutable result with execution identifier, fingerprint,
   tool and adapter version, status, exit code, timestamps, completeness,
   and evidence references.
4. Re-authorize the reader and validate freshness and reuse policy before
   delivery. Report `reused from execution` distinctly from
   `executed now`, with the source execution identifier.
5. Honor R3 deletion propagation: deletion or expiry invalidates every
   derived copy, and missing content resolves to typed unavailable rather
   than to a stale cache hit.

Sharing a language server, joining an in-flight check, reading an existing
result, and skipping a new execution because a cache entry is eligible are
four distinct operations with distinct correctness and consent rules. A
cache hit is not an authorization grant for the original command; reading
an already authorized, redacted result need not rerun it.

## Per-reader authorization and approval separation

The draft reader rules are:

1. Every waiter and every reader holds its own grant. The first caller's
   grant never authorizes later waiters, and the original execution's
   authorization never authorizes a different reader's delivery.
2. Delivery checks the reader's current scope, current consent, and the
   entry's freshness and reuse policy at delivery time, not only at
   execution time.
3. Per-request attribution is retained: one physical run is never counted
   as several independent executions.
4. A cached PASS never supplies an independent approval. Under the R5
   review criteria, acceptance requires a reviewer who differs from the
   implementer as agent and session, with the requirement and the evidence
   in reviewer hands and a separate approval action. A stored PASS is
   evidence input to that review, never the review itself. Self-review,
   shared PASS, self-report, and partial checks never constitute
   acceptance.
5. Independent review may reuse evidence but retains the option and the
   requirement to request a fresh run. No reuse policy removes that option.

The enforcement mechanism for per-reader evidence sharing across
authorization scopes stays open under AIQ-58 and is not selected here; the
re-authorization obligation above holds regardless of mechanism.

## Effectful coalescing rule

Effectful coalescing covers joining an in-flight effectful execution and
skipping a new effectful execution because of an eligible entry. Both stay
disabled unless all of the following are proven for the exact requests
being merged:

1. Input equivalence: complete fingerprints match under the contract
   above, with no unknown inputs and no partial-fingerprint reuse.
2. Isolation: the shared target directories, caches, and services are
   serialized or isolated so neither waiter's effects corrupt the other's
   inputs or attribution, and distinct tool kinds such as `build`,
   `check`, `test`, and `clippy` are never treated as interchangeable.
3. Independent grants: every waiter passes the R2 gate order on its own
   authority, including target, consent, and budget reservation, with
   independent waiter cancellation that never cancels work still required
   by another authorized waiter.

If equivalence cannot be proved, the broker queues a separate authorized
execution or returns unsupported. Deduplication remains an optimization
subordinate to correctness, never an unconditional requirement.

## Frozen and deferred scope

Per the CTX-0012 task scope, the following are frozen and excluded from
this decision:

- Single-agent execution ownership: `ExecutionContext` primary with
  optional Panel projection, no-shell and no-panel validity, cancellation
  split, and the MP-1 versus BA-2 and BA-3 registry disposition stay with
  [Execution ownership R1](execution-ownership-r1.md) and are not reopened
  here.
- Unified authorization backend, per-tool path placement, and fail-closed
  dispatch stay with [Tool transport R2](tool-transport-r2.md) and are not
  reopened here. This decision adds broker and reuse rules behind that
  backend; it selects no new backend mechanism.
- Consent-bounded retention, deletion propagation, and recovery limits
  stay with [Context retention R3](context-retention-r3.md) and are not
  reopened here. Reuse records inherit those obligations.
- Product Task lifecycle authority, independent-review roles, and
  critical-message acknowledgement stay with
  [Task lifecycle R5](task-lifecycle-r5.md). Only the cached-PASS
  separation rule is inherited; lifecycle conclusions are not reused here.
- Multi-agent organization: manager and reviewer agents, teams, delegation
  graphs, cross-agent messaging, shared budgets, and multi-agent review
  separation stay frozen and deferred. This decision covers broker
  instance-sharing mechanics between authorized consumers, not team or
  delegation authority.
- Durable backend, replay contract, release profile, structured exec
  result schema representation, warm-service tuning, diagnostic rate
  values, and fingerprint manifest encoding: unchanged by this decision.

Pointers:

- Execution ownership, cancellation, and Panel projection stay in
  [Execution ownership R1](execution-ownership-r1.md).
- Authorization backend, path placement, and fail-closed denial stay in
  [Tool transport R2](tool-transport-r2.md).
- Consent, deletion propagation, and recovery limits stay in
  [Context retention R3](context-retention-r3.md).
- Lifecycle authority and review acceptance roles stay in
  [Task lifecycle R5](task-lifecycle-r5.md).
- Team, delegation, budget, message, lease-lifecycle, and Panel proposals
  stay in [Agent coordination architecture](../agent/agent-coordination.md).
- Backend, index-option, replay-contract, and release-profile proposals
  stay in [Persistence and evidence architecture](../persistence/persistence-evidence.md).
- Release-scope sequencing stays in
  [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md).

## Verification plan

A future implementation claiming this disposition must show, at minimum:

- Domain-key evidence that instances are shared only within matching
  isolation domains, with negative evidence that differing overlays,
  worktrees, toolchains, or access domains yield separate service state,
  and that a mid-flight key change stops sharing for affected waiters
  rather than serving stale state.
- Non-disclosure evidence for any privileged-server sharing across read
  scopes, or negative evidence that such sharing is refused in favor of
  separate domains. A filter-only configuration presented as isolation
  fails this bar.
- Lease and generation evidence: per-caller authorization on acquisition,
  query, delivery, and subscription; no unioned capabilities; fenced
  writer transfer with the old generation invalidated first; revocation
  blocking new dispatches for the revoked principal while others continue;
  one waiter's cancellation never stopping work still required by another
  authorized waiter.
- Fingerprint evidence that reuse keys carry the complete fields above
  with an explicit included-versus-uncaptured manifest, and that unknown
  inputs disable generic caching and effectful merging rather than
  producing a marked PASS.
- Reader evidence that every delivery re-authorizes the reader and
  validates freshness and reuse policy at delivery time, discloses
  `reused from execution` with the source execution identifier, honors
  deletion propagation with typed unavailable disclosure, and never
  counts one physical run as several executions.
- Approval-separation evidence that a cached PASS is never accepted as
  review approval, with negative evidence that self-review, shared PASS,
  self-report, and partial checks never count as acceptance.
- Coalescing evidence that effectful merging runs only with proven input
  equivalence, proven target isolation, and independent per-waiter grants
  and budgets, and that unprovable cases run separately or return
  unsupported with no partial state.
- Deterministic coverage with seeded domain, overlay-conflict,
  fingerprint-gap, scope-narrowing, revocation, and cancellation fixtures,
  plus fail-closed behavior when authorization, redaction, budget, or
  isolation machinery is unavailable.

## Open points

This document changes the status of no register entry:

- AIQ-21 (service compatibility-key validation and invalidation) stays a
  prerequisite. The domain-key contract above is draft disposition; the
  runtime validation and invalidation mechanism remains open.
- AIQ-22 (cross-scope service non-disclosure mechanism) stays a
  prerequisite, with AIQ-42 as its stable alias. Filtering alone is not
  proof; isolation must be proven or sharing is excluded.
- AIQ-41 (document overlay coordination) stays a prerequisite.
  Conflicting buffers cannot silently share semantic state; the single
  authoritative overlay or separate-state rule is draft disposition, and
  the coordination mechanism remains open.
- AIQ-43 (incomplete fingerprint handling) stays a prerequisite. Unknown
  inputs disable generic reuse and coalescing of effectful work; whether
  a partial-fingerprint execution may proceed marked or must refuse stays
  open.
- AIQ-44 (cache invalidation granularity) stays a prerequisite. Stale
  inputs cannot produce a falsely current PASS; the granularity mechanism
  remains open.
- AIQ-45 (effectful coalescing equivalence and isolation mechanism) stays
  a prerequisite. Every waiter needs its own grant; coalescing stays
  disabled until equivalence plus isolation is proven.
- AIQ-46 (syntax fallback disclosure format) stays a prerequisite.
  Fallback must stay distinguishable from semantic evidence; the exact
  disclosure format remains open.
- AIQ-47 (diagnostic rate limits and prioritization) stays a prerequisite.
  Subscriptions must be bounded and attributed; the rate values and
  priority order remain open.
- AIQ-48 (warm-service and restart policy) stays a design choice. Bounded
  supervisor policy applies within the isolation limits above.

Adjacent identifiers are unchanged: AIQ-23, AIQ-2B, and AIQ-2C keep lease,
supervision, and writer-fencing mechanics open; AIQ-58 keeps the
per-reader evidence-sharing enforcement mechanism open; AIQ-59 keeps
unknown-effect reconciliation open. Promotion of any identifier requires
the canonical admission rule cited by
[AI Unresolved Questions](../product/ai-unresolved-questions.md).

## Acceptance criteria

- Draft owner: CTX-0012 implementer (`ai-docs-ctx0012-impl`).
- Acceptance requires independent review by the architecture category
  owner, the docs curator, and a security reviewer, plus linkage of any
  promoted open question under the canonical rule. It is not granted by
  this draft.
- Suggested follow-ups, each as a separately scoped task: compatibility-key
  runtime validation and invalidation mechanism (AIQ-21), cross-scope
  non-disclosure proof or domain-separation profile (AIQ-22 with AIQ-42),
  overlay coordination mechanism (AIQ-41), fingerprint manifest schema and
  partial-fingerprint policy (AIQ-43), invalidation granularity (AIQ-44),
  effectful coalescing proof protocol (AIQ-45), and per-reader evidence
  enforcement mechanism (AIQ-58).

## References

- [Code intelligence architecture](../agent/code-intelligence.md) (Draft): broker
  responsibilities, semantic tool surface, verification fingerprinting,
  and eligibility sequence refined here.
- [Agent coordination architecture](../agent/agent-coordination.md) (Draft): shared
  workspace service supervision, compatibility key, lease and generation
  fencing, and pressure and cancellation vocabulary.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-21,
  AIQ-22 with the AIQ-42 alias, AIQ-41 through AIQ-48, with AIQ-23,
  AIQ-2B, AIQ-2C, AIQ-58, and AIQ-59 as adjacent open facets.
- [Execution ownership R1](execution-ownership-r1.md) (Draft): decision
  pattern reference and single-agent execution baseline.
- [Context retention R3](context-retention-r3.md) (Draft): decision
  pattern reference and consent-bounded retention baseline.
- [Tool transport R2](tool-transport-r2.md) (Draft): decision pattern
  reference and unified authorization backend baseline.
- [Task lifecycle R5](task-lifecycle-r5.md) (Draft): review separation
  reference for the cached-PASS rule; its lifecycle conclusions are not
  reused here.
- [AI Architecture](ai-architecture.md) (Draft): agent levels (AG-3, AG-4),
  Tool Bus, privacy-first controls (PP-2 through PP-4), and failure
  semantics (FS-AI1, FS-AI7).
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) (Draft):
  experimental scope, non-goals, and required-control sequencing.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounding IPC framing,
  scopes, and lifecycle contracts.
