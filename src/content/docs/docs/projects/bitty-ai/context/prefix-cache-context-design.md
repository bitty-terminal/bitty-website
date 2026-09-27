---
title: Prefix-Cache-Friendly Context Design
description: Draft proposal for stable-prefix layering and deterministic serialization to improve prefix-cache reuse
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 26
---

# Prefix-Cache-Friendly Context Design

> Status: **draft**. This document records a single-author candidate
> direction as a reviewable proposal. It accepts nothing, describes no shipped
> behavior, and authorizes no compatibility promise. Mechanisms marked
> beyond-v0.1 are proposals for later increments, not commitments.

## Purpose and scope

**Draft relationship**: Extends [Context Management Architecture](context-management.md),
which elaborates [AI Architecture](../architecture/ai-architecture.md) CP-5 (Budget), CP-6 (Artifacts),
CP-7 (Determinism and testability). See also AG-4 (Least privilege at dispatch)
in [AI Architecture](../architecture/ai-architecture.md) for dispatch authorization, which this
proposal does not change. These are topic relationships, not accepted authority.

## Problem statement

Prefix-cache reuse depends on the longest common token prefix across
consecutive requests. Any early-position instability (timestamps, budgets,
reordered tool schemas, rewritten history) invalidates the key-value cache for
all following tokens, even when the semantic content is unchanged. The source
argues, and this draft accepts as a working hypothesis, that context assembly
should therefore optimize three independent metrics together: context size,
prefix stability, and cache hit rate. A shorter context that rewrites an early
segment can cost more latency and inference work than a longer append-only one
(source lines 1380-1404).

This proposal does not claim measured hit-rate improvements. No benchmark,
provider trace, or runtime evidence is cited. All cache-effect statements are
design reasoning awaiting measurement.

## Stable-prefix layering

The source proposes (lines 11-30) ordering context from most stable to most
dynamic:

```text
[1] Runtime Protocol / Core System Prompt   <- most stable
[2] Stable Tool Schemas                     <- very stable
[3] Stable Loaded Skills                    <- fairly stable
[4] Project / Workspace Context             <- medium stability
[5] Conversation / Agent History            <- keeps growing
[6] Tool Results / Runtime State            <- high churn
[7] Current Turn                            <- most dynamic
```

**Draft disposition: adopt.** Stable content precedes dynamic content. Dynamic values
(current time, working directory, branch, model name, remaining budget,
terminal or panel dimensions, token usage) must not be interpolated into
layers [1]..[4]. They belong in layer [6] or [7], preferably inside a trailing
runtime-delta block, or behind an on-demand tool (`git.status()`,
`panel.inspect()`, `workspace.inspect()`) rather than embedded every turn
(source lines 33-95, 429-520).

**Draft disposition: qualify.** The exact seven-layer split is a proposal, not a contract. The
normative budget, attribution, and consent boundaries stay where
[AI Architecture](../architecture/ai-architecture.md) CP-5 (Budget) and CP-6 (Artifacts) put
them. Layer names here are organizational; they do not create new provider
kinds, Stable Id levels, or consent scopes.

## The eight design invariants

Source lines 1320-1350 propose eight invariants. Each is evaluated below as a
draft disposition: adopt, qualify, reject, or open.

### 1. Context is append-only by default

**Draft disposition: adopt.** Within one epoch, each request should extend the previous
prefix (`A B C`, then `A B C D`, then `A B C D E`) rather than rewriting
earlier segments (source lines 740-798). This is the highest-leverage property
for agent loops, where consecutive tool-call turns otherwise share almost all
of their prefix.

Constraint: append-only is a logical property of the assembled token stream
within an epoch, subordinate to deletion, expiry, revocation, and redaction
obligations. Deletion or expiry propagates to journal payloads, artifacts,
derived summaries, indexes, and caches, consistent with the session-fact
correction in [Context Management Architecture](context-management.md).
Tombstones must not retain deleted sensitive payloads.

### 2. Stable content precedes dynamic content

**Draft disposition: adopt.** This is the layering rule above. Concretely: build the static system
prompt once per epoch (`build_static_system_prompt()`), and move per-turn
values (budgets, clocks, counts, dimensions) to a trailing turn-context block
or to addressable tools (source lines 800-868). Token-budget text is the
sharpest example: a changing `tokens left` counter on line 10 of the system
prompt invalidates the whole prefix every turn.

### 3. Tool and skill serialization is deterministic

**Draft disposition: adopt as requirement on any future cache claim; mechanism open.** The source correctly observes (lines 98-260) that `HashMap` iteration
order, JSON key order, whitespace, newlines, section order, path
normalization, and number formatting all change the token stream without
changing semantics. A canonical encoding (fixed tool order, fixed field order,
fixed section order, normalized paths) is therefore a prerequisite for stable
prefixes.

**Draft disposition: open.** Who owns the canonical serializer, what its exact byte-level rules are,
and how conformance is tested. The source proposes a `ContextSerializer` and a
`Canonical Context Encoding` protocol (lines 200-260). This draft records the
direction without adopting that type name or encoding as a contract. Proposed
tracking: AIQ-12.

### 4. Dynamic runtime state is referenced, not embedded, whenever possible

**Draft disposition: adopt**, consistent with CP-6 (Artifacts). The source principle
(source lines 509-520) is that context is not a database: panel state, agent
lists, environment, full `git status`, and large outputs should be
addressable references (`panel://`, `artifact://`, task-scoped URIs with typed
unavailability) rather than inline dumps. This reduces tokens and avoids stale
state at the same time.

Constraint: references never widen authority. Drill-down resolves under the
same consent, budget, attribution, and untrusted-surface rules as
[AI Architecture](../architecture/ai-architecture.md) CP-6 (Artifacts). Panel state stays
outside the agent prefix unless explicitly requested (source lines 1079-1120).

### 5. Context mutation creates an explicit epoch boundary

**Draft disposition: adopt; epoch type open.** The source proposes treating
`/compact`, registry changes, skill changes, and model switches as
`epoch++` events followed by one cold prefill, after which the new prefix is
stable again (lines 684-738). Explicit invalidation is preferable to silent
drift because it makes cache behavior debuggable.

**Draft disposition: open.** The exact `ContextEpoch` schema (`system_version`, `toolset_version`,
`skillset_version`, `project_context_version`, `summary_version` in the
source) is a proposal, not an adopted type. Epochs are beyond-v0.1 (see
[v0.1 scope](#v01-scope-boundary) below).

### 6. Tool, skill, and plugin registry changes are versioned

**Draft disposition: adopt; snapshot type open.** The source proposes an
immutable `ToolRegistrySnapshot { version, tools, digest }` held constant for
a whole session and bumped only by explicit enable, disable, or add operations
(lines 344-426). The same treatment applies to session skills: a fixed core
skill set plus an explicitly versioned session skill set, never per-turn
reselection (lines 264-342). Per-turn MCP re-enumeration with rephrased
descriptions is the failure mode this rule prevents.

**Draft disposition: open.** Snapshot representation, digest algorithm, and where versioning lives
(runtime versus host). The source sketch is illustrative. This rule refines
but does not replace the MCP schema invalidation question already tracked as
AIQ-08.

### 7. Compaction is a structural operation, not silent mutation

**Draft disposition: adopt**, consistent with the existing Level 2 and Level 3 analysis in
[Context Management Architecture](context-management.md). The source argument
(lines 523-682) is that editing an early segment (for example at 5K of 100K
tokens) invalidates the following 95K of cache, so apparently small local
edits are globally expensive. Compaction should therefore compress the
newest compressible segment or open a new epoch with a checkpoint summary,
rather than repeatedly rewriting early history.

Consequence: continuous background rewriting of retained history is
discouraged as a cache strategy. What the source calls immutable segments
(`Core`, `Summary A`, `Summary B`, `Recent`) followed by a new segment maps
onto the existing proposal that `/compact` moves the projection boundary and
records compaction metadata, without deleting retained journal entries except
through the governed deletion path.

### 8. Cache locality is part of scheduling

**Draft disposition: qualify.** Within the scope of this repository, the acceptable reading
is: context assembly order, registry versioning, and epoch discipline should
consider cache locality alongside budget and freshness. Broader readings about
inference-cluster routing are qualified in the provider section below:

- Cross-provider key-value reuse is not possible. Different providers and
  models use different weights, tokenizers, and sampling stacks; identical
  text does not imply reusable cache entries across them.
- Implicit automatic prefix caching and explicit prompt-caching breakpoints
  are different provider mechanisms with different rules (minimum prefix
  lengths, breakpoint placement, pricing). This draft assumes neither and
  prescribes no breakpoint syntax.
- Session-affinity or sticky routing (same worker for all turns of a session)
  is a self-hosted inference-cluster concern (for example `vLLM` or `SGLang`
  deployments). It has no meaning for third-party API providers and creates
  no requirement on the v0.1 runtime.

Proposed tracking for the key-scope question: AIQ-13.

## Deterministic serialization and content addressing

The source proposes canonical ordering for tools grouped by domain
(filesystem, search, process, LSP, git, panel, agent), fixed schema field
order, and content-addressed blocks (`ContextBlock { kind, content, hash }`)
with per-section hashes so unchanged sections skip re-serialization (lines
146-260, 938-1026).

Judgment:

- **Draft disposition: adopt.** Without deterministic serialization, all other
  prefix work is void.
- Record the block-hash sketch as an optimization proposal, not a contract.
  Local content hashes can avoid redundant serialization work, but they are
  not prefix-cache keys; the cache key is a property of the provider-side
  token prefix, scoped per provider and model (see below).
- **Draft disposition: reject.** Any reading in which a content hash substitutes for consent,
  redaction, or budget accounting. Identical bytes from different owners or
  generations are not interchangeable.

## Registry snapshots and project snapshots

Tool, skill, MCP, and plugin listings should be session-pinned snapshots with
explicit versions, as described under invariants 5 and 6. Repository context
(project maps, outlines, symbols) follows the same pattern: hold an immutable
project snapshot, append per-turn deltas (`src/foo.rs changed`) to the
trailing turn block, and refresh the snapshot only on an explicit refresh
operation (source lines 870-936). The source compares this to snapshot plus
write-ahead log and to Git-like base plus append-only commits (lines 938-986).

All snapshot types are beyond-v0.1 proposals. They must compose with the
existing artifact and retention questions (AIQ-03, AIQ-04) and must not weaken
consent or deletion propagation.

## Epochs, history, and the Context Planner

The source proposes a `ContextEpoch` record, an append-only history within
each epoch, and a `ContextPlan` / `Context Planner` structure separating
stable prefix, semi-stable prefix, history, runtime delta, and current turn,
with the planner owning ordering, canonicalization, compaction, cache
affinity, and token budget (lines 684-738, 1225-1290).

Judgment: record as a beyond-v0.1 structural proposal. The planner overlaps
with the existing `ContextBuilder` and transform-pipeline direction in
[Context Management Architecture](context-management.md) and with the
multi-agent and panel-ownership questions already tracked (AIQ-10, AIQ-29).
This draft does not select a planner type, a module path, or an owner (Core
versus Lua); orchestration-versus-execution ownership stays with AG-5, and
dispatch authorization stays with AG-4 (Least privilege at dispatch).

Multi-agent shared prefixes (one stable prefix fanning out to per-agent
histories, source lines 1029-1076) are likewise a future hypothesis. Sharing
a prefix across agents is permissible only within identical provider, model,
tokenizer, and consent scope, and only when per-reader authority enforcement
permits it. Cross-agent cache sharing is not a v0.1 goal.

## Cache observability

The source proposes `/context` output showing per-section tokens, prefix
stability percentages, last invalidation, and estimated reusable prefix
(lines 1269-1318), plus a panel sketch carried over from the earlier context
record. This draft accepts observability as a useful debugging direction and
records two constraints:

- Estimates must be labeled as estimates. The client cannot observe the
  provider-side cache directly; reusable-prefix percentages are computed from
  local prefix stability, not from provider cache telemetry, unless a
  provider exposes such telemetry through a documented interface.
- Observability must not leak secrets, exceed budget, or widen authority.
  Token accounting by category is the acceptable core; interactive
  compress, drop, pin, and inspect operations remain proposals subject to
  AIQ-04 (selection priority versus durable retention authority) and the
  privacy controls below.

## Provider qualifications

The following qualifications are adopted as critical judgment over source
lines 1124-1223:

1. Cache scope always includes provider identity. A usable cache key is at
   least `(provider, model, model revision, tokenizer and runtime
configuration, prefix)`. Model routing that switches providers or models
   mid-session abandons the cache even when the text is identical.
2. No cross-provider key-value reuse. This is a correctness boundary, not a
   tuning parameter.
3. Implicit prefix caching versus explicit prompt caching differ by provider.
   This specification does not standardize breakpoint placement, minimum
   lengths, or pricing behavior, and it treats all provider-specific numbers
   as unverified.
4. Sticky and session-affinity routing applies only to self-hosted inference
   fleets where the deployer controls routing. It is out of scope for v0.1
   and creates no client-visible contract.
5. Panel, terminal, and workspace state referenced from context resolves
   server-side under existing consent and budget rules. The context layer
   does not invent its own panel-addressing authority.

## v0.1 scope boundary

Consistent with [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
(L0+L1 scope):

- In scope for v0.1 discussion: stable-before-dynamic ordering discipline,
  deterministic assembly for a given snapshot, structured tool results with
  artifact externalization, lossless dedup and supersede handling.
- Slice-harness evidence (experimental, not shipped runtime): the sibling
  `bitty-ai` pressure-test harness (`bitty-ai-slice`, AI-0121..AI-0130, merged
  as PRs #237..#254) demonstrates the snapshot-to-cache chain end to end —
  host-side `ProjectSnapshot` ingestion with digest verification, monotonic
  refresh ledger, generation-scoped artifact expiry plus explicit
  invalidation with deletion propagation, digest-pinned PROJECT prompt layer,
  multi-turn session-key hits on tail-only change with miss on refresh, and a
  composed session script. The runtime crate itself is unchanged (std-only);
  all new machinery lives host-side. Planner, epoch, and content-addressed
  proposals below remain beyond-v0.1.
- Beyond-v0.1 proposals (not commitments): Context Planner, `ContextEpoch`
  types, versioned registry and skill snapshots, content-addressed blocks,
  Level 2 and above compression, provider routing and affinity, multi-agent
  shared prefixes, and cache-observability UI. Project snapshots with deltas
  move from proposal to slice-harness evidence (see above); a shipped-runtime
  contract still needs its own review. Each remaining item needs its own
  reviewed contract and evidence before any implementation claim.

## Runtime evidence

Read-only inspection of the sibling `bitty-ai` runtime skeleton found no
implementation of this proposal in the runtime crate itself. Specifically, as
inspected:

- `crates/bitty-ai-runtime/src/context.rs` implements L0 structured output
  and L1 lossless pruning (dedup, supersede, externalization) with
  deterministic assembly for a given provider snapshot and request. It
  defines no canonical text serializer, no stable-prefix layer order, no
  epoch type, no planner, and no content-addressed block scheme.
- `crates/bitty-ai-runtime/src/tool.rs` keeps `ToolRegistry` in registration
  order with no canonical ordering, no version counter, no digest, and no
  snapshot type.
- `crates/bitty-ai-runtime/src/provider.rs` exposes a registry snapshot seam
  with caller-scope filtering deferred to the host; it defines no
  prefix-cache key scope and no routing or affinity behavior.

Slice-harness evidence (experimental, host-side only): the sibling
`bitty-ai-slice` pressure-test harness (not a shipped component) composes the
snapshot-to-cache chain end to end across AI-0121..AI-0130 (merged as sibling
PRs #237..#254): standalone `psnap` analyzer output ingested with SHA-256
verification, monotonic `RefreshLedger` issuance, generation-scoped artifact
expiry plus explicit invalidation with derived-record propagation,
digest-pinned PROJECT prompt layer feeding `CacheKey`, scripted multi-turn
hit/miss evidence, and one composed session script (666 sibling tests green
at merge). This is evidence for the host-side pattern, not an adoption of the
planner, epoch, or content-addressed proposals above, and it describes sibling
behavior only as read — this repository was not modified as part of those
inspections beyond this section.

Conclusion: the prefix-cache design in this document is not implemented in
the shipped runtime. The skeleton's deterministic assembly plus the
slice-harness chain are compatible starting points, not evidence for the
remaining proposals. No claim here describes sibling behavior beyond what was
read.

## Security review

This proposal must not contradict P0-AC-026, PP-2, or PP-4:

- [AI Architecture](../architecture/ai-architecture.md#privacy-first) PP-2 (Typed redaction)
  requires redaction before queuing. Stable prefixes do not change this:
  redaction applies before any byte enters the prefix, and negative tests
  must still show seeded secrets absent from default outputs.
- PP-4 (No on-disk persistence without consent) governs all snapshots,
  registries, epochs, digests, and planner state that would persist agent
  turns, tool results, or context snapshots to disk. An in-memory stable
  prefix does not authorize durable recording. Consent authorizes recording
  only with mandatory typed redaction, user-only storage, and export preview.
- Minimization (PP-1) still prefers the smallest budget-bound set. Cache
  friendliness never justifies sending more context than the task needs.

Provider-side cache retention is a privacy consideration recorded here as an
open question, not a bypass: when a provider retains prompt prefixes to serve
its cache, redacted-before-send remains the client control, and retention
behavior of third-party caches is outside this repository's authority.
Whether cache-retention windows affect provider selection or disclosure is
tracked as part of AIQ-13. No clause in this document weakens the normative
security corpus linked from [AI Architecture](../architecture/ai-architecture.md).

## Verification plan

This specification records the candidate direction plus critical
judgment. It is not implementation evidence. Acceptance requires independent
review, and any future implementation requires:

- A byte-level canonical serialization contract with conformance tests
  (ordering, key order, whitespace, section order, path normalization).
- Prefix-stability measurement on replayed agent-loop traces showing that
  consecutive requests share the claimed prefix under the stated layering.
- Provider-scoped cache-key documentation with the implicit-versus-explicit
  behavior of each supported provider stated as verified or unknown.
- Privacy evidence that redaction-before-queue, minimization, and
  consent-gated recording hold under the stable-prefix and snapshot
  discipline.
- Runtime code and tests in the owning implementation repository; no promise
  here implies that code exists.

## Open points

1. Who owns canonical serialization, and what is its byte-level contract?
   (Proposed AIQ-12.)
2. What exactly scopes a prefix-cache key per provider, and does cache
   retention affect provider selection or disclosure? (Proposed AIQ-13.)
3. What defines an epoch boundary, and what is the epoch record schema?
   Overlaps AIQ-06 (re-expansion after projection compaction); a separate
   identifier is not proposed until the schema stabilizes.
4. Where does planner logic live (Core versus Lua), and how does it compose
   with the existing builder and pipeline direction? Overlaps AIQ-10 and
   AIQ-29; no new identifier proposed.
5. When do project snapshots refresh, and who authorizes the refresh?
   Facet of AIQ-03 and AIQ-04; no new identifier proposed.
6. Can compaction be undone from surviving authorized originals, and what is
   disclosed when originals are gone? Tracked as AIQ-06 with its AIQ-57
   persistence facet.
7. Risk: optimizing for cache reuse could encourage larger prefixes. Budget
   (CP-5), minimization (PP-1), and consent scopes remain the binding
   constraints; cache metrics are secondary.
8. Risk: local stability estimates may be mistaken for provider cache truth.
   Observability output must label estimates as estimates.

## References

- [AI Architecture](../architecture/ai-architecture.md) (Draft): CP-5 (Budget), CP-6 (Artifacts),
  CP-7 (Determinism and testability), AG-4 (Least privilege at dispatch).
- [Context Management Architecture](context-management.md) (Draft): session
  journal, projection, and multi-level pipeline this proposal refines for
  prefix stability.
- [Prompt Layering Design](prompt-layering-design.md) (Draft): prompt-text
  layering whose stable-before-dynamic assembly order aligns with this design.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) (Draft):
  L0+L1 scope gate marking Planner, epoch, and L2+ material as later
  proposals.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-12 and
  AIQ-13 proposed in [Open points](#open-points); all other overlapping choices
  reuse existing identifiers.
