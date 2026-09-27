---
title: Wheel Context Runtime (Candidate)
description: Candidate runtime architecture for tiered evidence, a knowledge DAG, working-set temperature, the refinement lifecycle, and cache-aware context compilation
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 67
---

# Wheel Context Runtime (Candidate)

> Status: **draft**. This document records a candidate direction as a
> reviewable proposal. It accepts nothing, describes no shipped behavior, and
> authorizes no compatibility promise. Mechanisms marked beyond-v0.1 are
> proposals for later increments, not commitments.

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification, accepted
decision, dependency selection, release commitment, or implementation claim. It
records the candidate architecture of the Wheel Context Runtime: evidence is
stored rather than narrated, knowledge is refined rather than transcribed,
working state is tiered by temperature rather than by content type, and the
prompt is compiled per turn from that material under a cache-aware plan.

The runtime frame proposed here **extends, without restating**, two existing
candidate records:

- [Wheel context storage and reasoning management (candidate)](../specifications/wheel-context-storage-and-reasoning-candidate.md)
  carries the stored-history-versus-compiled-context inequality, the
  `ContextCommit` and three-layer storage direction, the Reasoning Record and
  Scratch Reasoning split, the why/what/where/how tool protocol, the
  `ProviderState` object, and the cache-economics analysis. This page records
  the runtime lifecycle and component frame that operationalizes those
  directions.
- [Quality formula and context compiler (candidate)](../specifications/quality-and-context-compiler-candidate.md)
  carries the quality formula, the compiler pipeline, stability zones,
  admission scoring, authority resolution, tool-result reduction, budgets, and
  cache kinds. This page adds only the tiered-evidence, refinement-economics,
  working-set, and team-sharing facets and consumes the rest.

The surrounding context documents stay in force as references, never as
duplicated content: [Context Management Architecture](context-management.md)
owns the session journal, the context view model, and the multi-level
compression pipeline; [Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md)
owns stable-prefix layering, deterministic serialization, epochs, and provider
cache-key scope; [Prompt Layering Design](prompt-layering-design.md) owns the
prompt-text layer contract; [Provider plugin boundary](../providers/provider-plugin-boundary.md)
owns the `ModelProvider` contract, routing semantics, and the secret invariant;
[Persistence profile R6](../architecture/persistence-profile-r6.md) owns the
backend profile, the artifact-bytes-by-digest rule, and the replay contract;
and the [Event-sourced agent workspace (candidate)](../specifications/event-sourced-agent-workspace-candidate.md)
owns the event log, the mailbox, and the Context GC versus structural
compaction split.

The accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) defines
the only accepted IPC wire, scope, and Agent vocabulary; it is unaffected by
this draft. Nothing here is promoted to accepted status, and no implementation
is described as shipped.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Foundational principle

The retained principle is four statements that must not be softened into
slogans:

- **The prompt is a build artifact, not the source of truth.** A prompt is
  compiled output for one request, never the durable state of an agent.
- **The transcript is an execution trace, not the memory.** A conversation log
  records what happened; it does not hold what the runtime knows.
- **Evidence is stored, events are persisted, knowledge is refined, state is
  committed, context is compiled.** Each noun has one home and one lifecycle.
- **Lossless storage, lossy materialization.** The active prompt may be a
  concise, lossy projection while the runtime retains reversible provenance
  for everything it still holds.

The invariant's scope matters. "Lossless" means the runtime's own optimization
never silently destroys stored evidence or knowledge; it does not promise
retention against consent, expiry, redaction, deletion, or budget obligations,
which always win. "Lossy" describes only what one compiled prompt chooses not
to show, never what the system forgot.

This principle restates the session-fact and context-projection inequality
owned by [Context Management Architecture](context-management.md) and the
stored-history inequality owned by
[Wheel context storage and reasoning management (candidate)](../specifications/wheel-context-storage-and-reasoning-candidate.md).
This page does not re-argue those foundations; it builds the runtime model on
them and treats the principle itself as candidate input, not as an accepted
architecture.

## Refinement versus compression

The retained reframing rejects transcript summarization as the primary context
maintenance paradigm. Continuously growing a linear conversation and then
compressing it treats the transcript as memory; the runtime direction instead
refines stored material into knowledge and materializes only what one turn
needs. "Compression" is not forbidden vocabulary, and it remains the correct
name for the multi-level pipeline owned by
[Context Management Architecture](context-management.md); it is simply not the
frame for this architecture.

The lifecycle operations are distinct and should not be conflated:

| Operation            | Input                                 | Output                                                                          | Notes                                                                                    |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Refinement           | Raw evidence and persisted events     | Dense structured knowledge: findings, facts, decisions, rationales, constraints | Knowledge-producing, not text-shortening.                                                |
| Materialization      | References and structured knowledge   | Active prompt tokens for one turn                                               | The only operation that spends context; lossy by design.                                 |
| Promotion / demotion | Items in the working sets             | Items moved between Hot, Warm, and Cold                                         | Changes prompt eligibility, never storage.                                               |
| Eviction             | Items in the active working set       | Removed from the active set but still stored                                    | Not deletion; the reference keeps resolving until retention ends.                        |
| Compaction           | Legacy transcript ranges              | Summary entries bound to the active view                                        | Retained only as a fallback for transcript-shaped journals, never the primary mechanism. |
| GC                   | Unreachable or expired evidence blobs | Reclaimed storage                                                               | Storage operation; distinct from eviction and distinct from compaction.                  |

Refinement and materialization run in opposite directions but are not
inverses: refinement is semantic distillation, materialization is
representation selection. Compaction keeps the boundary rule already owned by
[Context Management Architecture](context-management.md) — it changes the
active view boundary and records metadata rather than deleting retained
history. Because this runtime stores evidence and knowledge as objects rather
than as one transcript, compaction is only needed for legacy transcript
material. GC reclaims a blob only when nothing still protected points at it;
deletion, expiry, and redaction obligations propagate first, and a reference
whose content is gone resolves to typed unavailability rather than silent
recovery.

Terminology adoption — whether the lifecycle vocabulary here replaces,
supplements, or only annotates the compression vocabulary — is an owner
decision recorded below as pending. This page adopts no threshold, trigger, or
scheduler for any operation.

## Temperature as working state

Temperature describes where an item sits in the working set; it is strictly
orthogonal to the item's semantic type. Two semantic types appear throughout
this page: **Evidence** (raw stored facts: file content, stdout, tool output,
web fetches) and **Knowledge** (derived structured artifacts: findings, facts,
decisions, rationales, constraints). Evidence can be Hot and knowledge can be
Cold; neither axis implies the other.

| Temperature | Meaning                                        | What the active prompt holds             | Example                                                   |
| ----------- | ---------------------------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| Hot         | Actively needed for the current reasoning step | A verbatim slice or an exact finding     | The function body under edit; the decision being applied. |
| Warm        | Recently active or likely needed soon          | A summary, outline, or indexed reference | An adjacent module read earlier this session.             |
| Cold        | Inactive but recoverable through provenance    | Nothing; a reference resolves on demand  | Interface documentation for a completed task.             |
| Archived    | Historical audit evidence                      | Nothing unless explicitly re-authorized  | Raw logs behind a closed finding.                         |

The combinations matter more than the labels. A critical raw code slice can
remain Hot and pinned while a stale decision demotes to Cold; a Hot finding
can point at Cold evidence; a Warm outline can stand in for Archived bytes.
`pinned` is an orthogonal boolean on any item, expressing selection priority
for the compiler. Pinning is a request, not retention authority: it cannot
override consent, expiry, deletion, or a budget ceiling, and the register's
selection-priority-versus-durable-retention question stays with its existing
tracker.

Promotion and demotion are candidate policy with open triggers and open
thresholds. This page records the axes and the orthogonality; it adopts no
temperature default, no promotion rule, and no eviction policy. The
stratification extends the Cold, Warm, and Hot direction carried by
[Quality formula and context compiler (candidate)](../specifications/quality-and-context-compiler-candidate.md)
and the Context GC versus structural compaction distinction carried by the
[Event-sourced agent workspace (candidate)](../specifications/event-sourced-agent-workspace-candidate.md);
those records keep their own vocabulary.

## Evidence system

File reads do not enter conversation history. A read produces an
`EvidenceView` describing what was read and where it came from, while the
bytes stay in a content-addressed store. An illustrative view shape
(illustrative-only; no schema is adopted):

```text
EvidenceView
├── path            file path the read resolved
├── revision        commit or revision the read resolved at
├── blob hash       content-addressed identity of the bytes
├── selector        symbol or line range the agent asked for
├── content hash    hash of the exact returned slice
└── freshness       when the view was produced and for which revision
```

Once the agent derives a finding or fact from that view, the raw slice demotes
from Hot to Warm or Cold and the active prompt keeps only the compact finding
plus an `EvidenceRef`. An illustrative reference form (illustrative-only):

```text
compiler.rs@blob:abc1234#L182-L327
```

Resolution is on demand: the compiler or a follow-up turn can re-materialize a
slice, an outline, or a semantic extract from the reference instead of holding
the bytes in every prompt. The retained direction uses the repository's Git
object database as the content-addressed store for tracked file content, and
reserves the Wheel content-addressed store for untracked files, command
stdout, LSP and MCP outputs, web fetches, and generated artifacts. Both stores
deduplicate by content hash: one blob per content, many references.

Evidence carries freshness and a staleness bar: when the recorded content hash
no longer matches the current source, the view is marked stale and barred from
Hot context rather than kept with a warning. Evidence is untrusted observation
data. A reference never widens authority: resolving it re-passes
authorization, consent, redaction, and budget checks, and content that was
deleted, expired, or never recorded resolves to typed unavailability. Git
object-database access is read-only and bounded.

This section consumes, without redefining, the referenced-not-embedded
invariant in [Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md),
the artifact externalization direction in
[Context Management Architecture](context-management.md), the
content-addressed object model of the
[Wheel configuration and context git model (candidate)](../specifications/wheel-config-and-context-git-model-candidate.md),
and the artifact-bytes-by-digest rule in
[Persistence profile R6](../architecture/persistence-profile-r6.md).

## Event-to-knowledge bridge

Reasoning reaches durable storage only through a structured rationale, not as a
chain-of-thought dump. The retained candidate vocabulary for one rationale
record is: `Why`, `What`, `Where`, `How`, `Expected`, `Observed`,
`Implication`, `Next`. The field names are candidate vocabulary proposing no
schema, format, or wire.

The bridge separates two kinds of thinking:

- **Raw reasoning** is ephemeral, provider-local, noisy, and uncommitted by
  default. It may inform the model's own next step, but it is not stored as
  history.
- **Reasoning artifacts** are the durable products: hypotheses, decisions,
  rationales, constraints, and findings. A stable conclusion crosses a
  decision boundary and becomes a committed artifact; in-progress musing is
  discarded.

The durable artifact is deliberately commit-message shaped: it explains why an
action existed, what was expected, what was observed, and what follows, so a
later agent re-reasons from structured state instead of inheriting stale
assumptions. This section extends the Reasoning Record and Scratch Reasoning
split owned by
[Wheel context storage and reasoning management (candidate)](../specifications/wheel-context-storage-and-reasoning-candidate.md)
and the per-call reason direction carried by the
[Event-sourced agent workspace (candidate)](../specifications/event-sourced-agent-workspace-candidate.md);
it does not restate their naming or lifecycle arguments.

## Provider continuation layer

Provider-native continuation state — extended-thinking blocks, continuation
handles, session identifiers, and cache breakpoints as vendors implement them
— belongs to a separate continuation layer. That state is non-canonical and
non-portable: it is meaningful only to the provider and model that produced
it. The canonical context DAG is portable and survives a provider switch: a
Claude-to-GPT switch keeps agent continuity from the canonical record alone,
while a Claude-to-Claude continuation may reuse the native state to improve
cache behavior.

The continuation layer is untrusted state. An opaque provider blob is never a
trusted channel, never a place to hide authority, and never secret-bearing;
its absence must degrade to a correct cold start from canonical context, and
Core behavior must be unchanged when it is dropped. The compiler programs one
lowering interface and provider adapters own provider-specific cache layout
and continuation handling; agent logic never branches on provider brand.

This section consumes the [Provider plugin boundary](../providers/provider-plugin-boundary.md)
contract and secret invariant, the provider qualifications in
[Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md)
(no cross-provider cache reuse; cache scope includes provider, model, and
configuration), and the provider-cache capability seam carried by
[Quality formula and context compiler (candidate)](../specifications/quality-and-context-compiler-candidate.md).

## Agent-team knowledge sharing

Agents share knowledge references, not transcripts. Team context forms a tree:
a common base context DAG carries the mission, the task dependency graph,
architecture decisions, and shared interfaces; each agent branches privately
from that base. An agent's private working set — raw reads, scratch
observations, in-progress reasoning — stays private. Only when an agent reaches
a verified decision or finding does it publish a `Context Commit` back to the
team context DAG, where other agents can build on it.

Inter-agent messages carry lightweight references rather than payloads:
`TaskRef`, `BaseContextRef`, `KnowledgeRefs`, and `EvidenceRefs`. The
recipient's context compiler decides what to materialize, at which
representation rung, for its own role and budget. A message therefore transfers
eligibility to read, never the bytes themselves.

Publication and read are both explicit and authorized. A commit that publishes
knowledge is a deliberate act reviewed under the same consent and redaction
obligations as any other durable write; a reader's resolution of shared
references re-passes per-reader authorization, so shared material cannot smuggle
back expired, deleted, or unconsented content. This section extends the
share-by-reference direction carried by the
[Event-sourced agent workspace (candidate)](../specifications/event-sourced-agent-workspace-candidate.md)
and the mailbox routing of the
[Execution supervisor (candidate)](../specifications/execution-supervisor-candidate.md);
Agent vocabulary and any wire remain with the accepted
[IPC and Agent RFC](../specifications/ipc-agent-rfc.md). No message shape,
bundle format, or merge protocol is adopted here.

## Context compiler and cache planner

Context compilation is a multi-objective selection, not a single relevance
score. The retained candidate scoring frame is (illustrative-only; uncalibrated
and with open weights):

```text
utility = (relevance + criticality + recency + dependency + authority + evidence)
        - (token_cost + staleness + redundancy + cache_disruption)
```

The compiler chooses a representation per item from a ladder:

```text
exact -> slice -> semantic extract -> structured knowledge -> digest -> ref only -> omit
```

Each rung trades fidelity for tokens: exact bytes for a hot edit, a slice or
extract for context around a finding, structured knowledge for settled
conclusions, a digest or reference when only eligibility is needed, and
omission when the item earns nothing. Selection and representation are decided
together; the compiler never lowers a rung to save tokens when the higher rung
is required for correctness.

The compiled prompt keeps the established two-part shape: a stable shared
prefix (the runtime contract, tool schemas, capability definitions, and the
team context commit) followed by a dynamic working suffix (agent role, task,
working set, hot evidence, and recent events). This is the stable-before-dynamic
ordering owned by [Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md)
and aligned with the layer contract in [Prompt Layering Design](prompt-layering-design.md);
this page adds no serializer and no key scope of its own.

Refinement is scheduled economically rather than continuously:

```text
schedule refinement only when
expected_saved_tokens > cache_break_cost + refinement_cost
```

A refinement that rewrites part of the stable prefix invalidates the cache for
everything after it, so micro-refinements that save a few tokens while
breaking the prefix are deferred or batched. When the expected savings exceed
the cache-break cost plus the refinement cost, the refinement is worth
scheduling. The inequality is a candidate heuristic: the cost terms depend on
provider cache pricing and the saving estimate is model-dependent, so the
threshold is recorded as a direction and its validation is owner-pending.
Throughout, correctness outranks relevance, relevance outranks cache, and
cache hit rate is never the objective — the storage-and-reasoning candidate
carries that argument (see
[Wheel context storage and reasoning management (candidate)](../specifications/wheel-context-storage-and-reasoning-candidate.md)),
and this page consumes it.

## Six runtime components

The retained architecture proposes six components. The names and boundaries are
a candidate topology, not an adopted crate, package, or team split.

### Evidence Store

The Evidence Store is the content-addressed home for raw facts and their
provenance: the Git object database for tracked file content and the Wheel
content-addressed store for untracked files, stdout, LSP and MCP outputs, web
fetches, and generated artifacts. It owns blob identity, deduplication,
freshness and staleness marks, reference resolution, and GC under retention
obligations. It relates to the artifact and persistence dispositions —
[Persistence profile R6](../architecture/persistence-profile-r6.md) and the
storage material of the
[Wheel configuration and context git model (candidate)](../specifications/wheel-config-and-context-git-model-candidate.md) —
and adopts no schema or substrate here.

### Context DAG

The Context DAG is the graph of structured knowledge: tasks, decisions,
findings, rationales, constraints, and the references that bind them to
evidence. It has a shared team base and per-agent branches, and verified
knowledge is published to it as a `Context Commit`. It relates to the context
DAG and `ContextCommit` direction owned by
[Wheel context storage and reasoning management (candidate)](../specifications/wheel-context-storage-and-reasoning-candidate.md)
and to the Git-inspired object model of the
[Wheel configuration and context git model (candidate)](../specifications/wheel-config-and-context-git-model-candidate.md);
the event log behind it remains with the
[Event-sourced agent workspace (candidate)](../specifications/event-sourced-agent-workspace-candidate.md)
and its terminal-owned shape.

### Working Set Manager

The Working Set Manager owns temperature: it promotes, demotes, pins, and
evicts items across Hot, Warm, Cold, and Archived, and it produces the working
set an agent's compiler draws from. It relates to the Cold/Warm/Hot
stratification of
[Quality formula and context compiler (candidate)](../specifications/quality-and-context-compiler-candidate.md)
and the Context GC versus structural compaction split of the
[Event-sourced agent workspace (candidate)](../specifications/event-sourced-agent-workspace-candidate.md),
while retention authority stays with the persistence and retention
dispositions. This page adopts no eviction policy or threshold.

### Refinement Engine

The Refinement Engine distills raw evidence and persisted events into dense
knowledge. It prefers deterministic and structural reduction first and
reserves model-backed semantic refinement for genuinely unstructured material,
following the reduction order carried by
[Quality formula and context compiler (candidate)](../specifications/quality-and-context-compiler-candidate.md),
and it schedules work against the refinement threshold above. It produces the
Reasoning Record shape owned by
[Wheel context storage and reasoning management (candidate)](../specifications/wheel-context-storage-and-reasoning-candidate.md)
without redefining it.

### Context Compiler

The Context Compiler resolves the active working context for one role, task,
and token budget: it retrieves, resolves authority conflicts, deduplicates,
ranks by the utility frame, selects a representation rung per item, and emits
the intermediate form that provider lowering consumes. It relates to the
compiler pipeline, zones, and admission scoring of
[Quality formula and context compiler (candidate)](../specifications/quality-and-context-compiler-candidate.md),
the serialization and prefix rules of
[Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md), and
the prompt-text layer contract of [Prompt Layering Design](prompt-layering-design.md);
this page adopts no IR field, pass, or budget.

### Cache Planner and Provider Lowering

The Cache Planner arranges the stable shared prefix and the dynamic working
suffix, schedules refinements against cache-break economics, and hands the
result to provider lowering. Provider lowering maps the intermediate form to a
provider's cache layout and manages the provider continuation layer above.
It relates to the cache kinds and capability seam of
[Quality formula and context compiler (candidate)](../specifications/quality-and-context-compiler-candidate.md),
the provider qualifications of
[Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md), and the
[Provider plugin boundary](../providers/provider-plugin-boundary.md), which
owns the adapter contract.

## v0.1 scope boundary

Consistent with the L0 plus L1 scope in
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) and with
the stable-before-dynamic, structured-output, and lossless-pruning material
already in scope there:

- The evidence views, temperature tiers, refinement engine, compiler
  economics, team context DAG, and provider continuation layer in this page are
  **beyond-v0.1 proposals**, not commitments. Each needs its own reviewed
  contract and evidence before any implementation claim.
- Nothing in this page changes the v0.1 profile, promotes a mechanism to
  accepted status, or authorizes product code.

## Security review

This candidate must not contradict P0-AC-026, PP-2 (typed redaction), or PP-4
(no on-disk persistence without consent):

- PP-2 requires typed redaction before queuing and before writing. The
  evidence system, the knowledge DAG, and the team context DAG change nothing:
  redaction applies before any byte or reference enters a durable record, and
  no store, view, or shared reference may carry secret material.
- PP-4 governs every durable element this architecture implies: evidence
  blobs, knowledge artifacts, context commits, working-set state, and
  continuation state. An in-memory tiering or refinement does not authorize
  durable recording; consent authorizes recording only with mandatory typed
  redaction, user-only storage, and export preview.
- Evidence, refs, knowledge artifacts, provider continuation state, and
  inter-agent references are untrusted data. Holding or forwarding a reference
  grants no authority: resolution re-passes authorization, consent, redaction,
  and budget checks per reader, and expired or deleted content resolves to
  typed unavailability rather than silent recovery.
- GC, eviction, and compaction honor deletion and expiry; "lossless storage"
  never overrides R3 deletion propagation. Minimization still prefers the
  smallest budget-bound set, and cache friendliness never justifies sending
  more context than the task needs.

No clause here weakens the normative security corpus linked from
[AI Architecture](../architecture/ai-architecture.md).

## Owner-pending pointers

The rows below route conclusions this candidate does not cover. They are
pointers with inline summaries, not links and not decisions.

| Topic                                                                                                                                    | Owning destination                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Formal adoption of the lifecycle terminology (refinement, materialization, promotion, eviction versus compression and compaction)        | AI runtime and governance documentation owners; owner approval pending                                        |
| Validation of the refinement threshold heuristic against provider cache pricing                                                          | AI runtime and security owners; owner approval pending                                                        |
| Relationship to the draft prefix-cache design: this page records the runtime frame while serialization, epochs, and key scope stay there | Context and persistence owners; owner approval pending; no silent supersession                                |
| Evidence Store and Context DAG schemas; Working Set Manager policy; refinement trigger cadence                                           | AI runtime owners; schema, policy, and cadence stay open                                                      |
| Provider continuation state contract and its lifecycle across model switches                                                             | Provider and AI runtime owners; owner approval pending                                                        |
| Terminal-side inputs: headless panel event logs as evidence, Git object-database integration, and terminal snapshot caching              | [Terminal documentation owner](https://github.com/bitty-terminal/bitty-terminal-docs); owner approval pending |

## Relation to existing systems

The candidate records referenced above are design inputs only. This page does
not restate the stored-history inequality, the `ContextCommit` shape, the
Reasoning Record vocabulary, the why/what/where/how protocol, the
`ProviderState` object, or the cache-economics analysis owned by
[Wheel context storage and reasoning management (candidate)](../specifications/wheel-context-storage-and-reasoning-candidate.md);
nor does it restate the compiler pipeline, zones, admission scoring, authority
ladder, reduction passes, budgets, or cache kinds owned by
[Quality formula and context compiler (candidate)](../specifications/quality-and-context-compiler-candidate.md).
It adds the runtime lifecycle, temperature, evidence-view, continuation, and
team-sharing facets and consumes those records everywhere the two overlap.

Canonical serialization and stable-prefix ordering, and provider-scoped
cache-key scope, are already closed as adopted-draft dispositions in
[AI Unresolved Questions](../product/ai-unresolved-questions.md)
(AIQ-12 and AIQ-13); this page consumes those outcomes, whose design
prerequisites are the [Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md)
and [Prompt Layering Design](prompt-layering-design.md) directions, and reopens
neither.
Overlapping open choices — artifact expiry and reference invalidation,
selection priority versus retention authority, background scheduling, and
re-expansion after projection compaction — stay with their existing register
entries and the persistence and retention dispositions. This draft creates no
AIQ or OQ identifier and closes none.

Context assembly, budget, retention, and compaction questions stay with
[Context Management Architecture](context-management.md),
[Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md),
[Context retention R3](../architecture/context-retention-r3.md), and the
persistence dispositions; prompt-text layering stays with
[Prompt Layering Design](prompt-layering-design.md); provider questions stay
with [Provider plugin boundary](../providers/provider-plugin-boundary.md);
execution, panel, and event-log questions stay with
[Execution ownership R1](../architecture/execution-ownership-r1.md) and the
[Event-sourced agent workspace (candidate)](../specifications/event-sourced-agent-workspace-candidate.md);
and storage and replay questions stay with
[Persistence profile R6](../architecture/persistence-profile-r6.md). Each is
referenced, never duplicated or modified.

The accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) defines
the only accepted IPC wire, scope, and Agent vocabulary. Every sketch name in
this candidate (component names, tier names, view and reference fields,
lifecycle operation names, and message reference names) is a discussion
sketch: this draft records it as input and proposes no file schema, API,
command, tool, event, or wire format. Where the sketches overlap RFC-owned
ground — Agent lifecycle, Agent events, Agent semantics, and scopes — the RFC
wins without further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed redaction,
consented recording, secret minimization) override every discussion example
throughout this document. Stored evidence, knowledge artifacts, provider
continuation state, and shared references are untrusted data; committing or
forwarding them grants no authority. This document creates or closes no AIQ or
OQ identifier; open questions stay with
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the runtime direction falsifiable before it
constrains `bitty-ai`.

| Campaign                  | Required observation                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence demotion         | A file read leaves the active prompt after a finding is derived, and the finding plus its reference answers the same question with the raw bytes still resolvable, in reviewable tests. |
| Refinement economics      | A refinement that would rewrite the shared prefix is deferred while expected savings stay below the cache-break cost, and proceeds once they exceed it, in reviewable tests.            |
| Temperature orthogonality | Hot evidence and Cold knowledge coexist in one working set; a pinned slice stays Hot across refreshes while a stale decision demotes, in reviewable tests.                              |
| Provenance                | Every materialized claim identifies a reference that resolves to stored bytes at the recorded revision, with typed unavailability when the content is gone, in reviewable tests.        |
| Rationale bridge          | A later agent reconstructs why an action ran from the structured rationale alone, with no raw thinking access, in reviewable tests.                                                     |
| Provider continuity       | A provider-to-provider continuation succeeds from the canonical context DAG alone after the opaque continuation state is dropped, in reviewable tests.                                  |
| Team sharing              | Two agents complete a follow-up from references and a context commit alone without transcript exchange, and neither private working set leaks, in reviewable tests.                     |
| Lossless and lossy        | Refinement, eviction, and compaction never destroy stored evidence or knowledge except through governed deletion, and every compiled prompt is a lossy projection over intact storage.  |
| GC and retention          | GC reclaims only unreachable or expired blobs; an evicted item stays retrievable until retention ends; deletion and expiry propagate to references, in reviewable tests.                |
| Boundary integrity        | A terminal panel, storage, or dashboard change ships with no `bitty-ai` contract change, and an AI-side change ships with no terminal contract change, in reviewable tests.             |

Promotion needs independent AI architecture, context-management, provider,
persistence, terminal-owner, docs-curator, and security review. Route the
lifecycle terminology, component boundaries, view and reference shapes,
temperature policy, refinement threshold, continuation contract, and team
sharing protocol to scoped owner tasks. This draft changes no normative
contract and authorizes no product code.

## References

- [Wheel context storage and reasoning management (candidate)](../specifications/wheel-context-storage-and-reasoning-candidate.md)
  (Draft): stored history versus compiled context, reasoning record, and cache
  economics; extended, never duplicated.
- [Quality formula and context compiler (candidate)](../specifications/quality-and-context-compiler-candidate.md)
  (Draft): compiler pipeline, zones, admission scoring, budgets, and cache
  kinds; extended, never duplicated.
- [Context Management Architecture](context-management.md) (Draft): session
  journal, projection, and multi-level pipeline that own the compression
  vocabulary.
- [Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md)
  (Draft): stable-prefix layering, deterministic serialization, epochs, and
  provider cache-key scope (AIQ-12, AIQ-13).
- [Prompt Layering Design](prompt-layering-design.md) (Draft): prompt-text
  layer contract and stable-before-dynamic assembly.
- [Provider plugin boundary](../providers/provider-plugin-boundary.md) (Draft):
  `ModelProvider` contract, routing, and the secret invariant.
- [Persistence profile R6](../architecture/persistence-profile-r6.md) (Draft):
  backend profile, artifact bytes by digest, and replay contract.
- [Event-sourced agent workspace (candidate)](../specifications/event-sourced-agent-workspace-candidate.md)
  (Draft): event log, mailbox, and Context GC versus structural compaction.
- [Wheel configuration and context git model (candidate)](../specifications/wheel-config-and-context-git-model-candidate.md)
  (Draft): content-addressed object model and context DAG direction.
- [Execution supervisor (candidate)](../specifications/execution-supervisor-candidate.md)
  (Draft): mailbox routing and durable per-call reason.
- [Context retention R3](../architecture/context-retention-r3.md) (Draft):
  consent-bounded retention and deletion propagation.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
  (Draft): L0 plus L1 scope gate marking this architecture as beyond-v0.1.
- [AI Architecture](../architecture/ai-architecture.md) (Draft): budget,
  artifact, and determinism anchors and the security corpus linkage.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft):
  existing register entries reused; no new identifier proposed.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): the only
  accepted IPC wire, scope, and Agent vocabulary.
