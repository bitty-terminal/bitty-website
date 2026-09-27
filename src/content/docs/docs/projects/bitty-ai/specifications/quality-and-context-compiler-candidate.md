---
title: Quality formula and context compiler (candidate)
description: Candidate quality formula, Wheel architecture, context compiler zones, cache, budgets, and observability
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 61
---

# Quality formula and context compiler (candidate)

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification, accepted
decision, dependency selection, release commitment, or implementation claim.
It records the candidate direction for a coding-agent quality formula and a
Context Compiler: quality factors, pollution, code reading, tool ergonomics,
Skill Hell, trust, prompt size, verification, state separation, compaction,
lifecycle splits, scheduling, provider separation, eval, and the closing Wheel
architecture with its top principle; and the companion Context Compiler design
of Context IR, stability zones, cache tree, stable serialization, admission
scoring, authority, content addressing, tool-result reduction, and provider
observability.

The recommendation is to treat every model below as a candidate input to the
draft [AI Architecture](../architecture/ai-architecture.md) and its related draft
dispositions, never as an override of the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) or the normative security corpus.
In particular, the quality-formula symbols, the `ContextUnit` and
`CapabilityMeta` struct sketches, the zone labels, the admission-score
formula, the authority ladder, the pass-pipeline shape, the budget numbers,
the cache-namespace fields, the `/context` display sketches, and the Wheel
module diagram are **not** accepted by this candidate design. Agent lifecycle,
Agent events, and Agent semantics in the candidate direction are **discussion inputs only**: the accepted Agent contract stays entirely with the RFC, which this
draft references without restating normatively. Nothing here is promoted to
accepted status, and no implementation is described as shipped.

The candidate direction's strongest ideas are the multiplicative quality framing (a weak
factor zeroes the product, so verification, relevance, and ergonomics deserve
engineering before window size), the pollution-first diagnosis with Context
Efficiency as the objective, the per-turn compiled-view compiler over
append-until-compact, the Cold/Warm/Hot stratification with stable-first
ordering, the correctness-over-cache-hit priority, the authority ladder that
resolves conflicts before the model sees them, content-addressed code with
staleness eviction, deterministic-then-structural reduction before any model
summarization, traceable compaction with rehydration pointers, and the
eval-from-day-one loop. Its weakest claims are the concrete numeric sketches
(55K-token tool-set anecdote, 30-to-50-tool threshold, 80-percent cache-ratio
hope, 40K-to-250K budget bands, relevance scores such as 0.93), which are
unmeasured illustrations with no fixture, replay, or product evidence; the
struct and enum sketches, which name no owner, versioning, or compatibility
contract; and the provider-behavior descriptions, which report third-party
cache semantics the task did not independently verify. Those are corrected
below.

This synthesis references, without duplicating or modifying, the draft
[AI Architecture](../architecture/ai-architecture.md) (candidate inputs only),
[Context Management Architecture](../context/context-management.md),
[Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md),
[Prompt Layering Design](../context/prompt-layering-design.md),
[Command and Tool Architecture](../architecture/command-tool-architecture.md),
[Agent Coordination Architecture](../agent/agent-coordination.md),
[Execution ownership R1](../architecture/execution-ownership-r1.md),
[Context retention R3](../architecture/context-retention-r3.md),
[Task lifecycle R5](../architecture/task-lifecycle-r5.md),
[Tool transport R2](../architecture/tool-transport-r2.md),
[Provider plugin boundary](../providers/provider-plugin-boundary.md), and
[Panel environment awareness](../interfaces/panel-environment-awareness.md). The
accepted [IPC and Agent RFC](ipc-agent-rfc.md) is unaffected by this
draft. The companion
[Wheel-config and Git-model candidate design](wheel-config-and-context-git-model-candidate.md)
carries the `.wheel` configuration split and the Git-inspired storage model;
this draft links to it wherever compression, context management, or
multi-agent design touches that model, as design input rather than
implementation. This document creates no AIQ or OQ identifier and closes
none.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Quality formula and optimization order

The retained model writes agent quality as a product of Model, Context, ACI
and Tools, Verification, and Harness: a near-zero factor zeroes the whole,
so a strong model with no verification, unusable tools, polluted context, or
a coercive Harness still fails. The worked consequences are kept: no tests
invite confident-but-wrong implementations; brittle tools burn turns on
schema errors; garbage context hides the real constraints; a rigid system
prompt forces capable models around long detours. The ten-item engineering
order is retained as a resourcing opinion under a strong-model assumption:
verification loop first, then context relevance, ACI and tool ergonomics,
Harness policy and prompt posture, repository legibility, state and
compaction, skill and MCP discovery quality, orchestration, security and
provenance, and finally the model ceiling, which reasserts itself on hard
reasoning and novel architecture.

**Critical judgment:** the multiplication is a framing device, not a measured
model; the order is an author opinion that shifts by task, not a benchmark
ranking. The stable claims are the bottleneck argument (Harness-side factors
routinely dominate once models are capable) and the falsifiability hook
below: any adoption must name which factor it moves and how the Eval section
measures it. The Harness-philosophy corollary (small core prompt, small
active tool and skill sets, small high-signal context, rich discoverable
environment, strong verification, durable structured state) is retained as
the design slogan that the rest of the candidate design cashes out.

## Context pollution and the efficiency objective

The retained diagnosis is that low signal-to-noise ratio, not raw length, is
the first-order context problem: stale logs, full build outputs, resolved
stacks, unrelated file dumps, abandoned diffs and hypotheses, full MCP tool
schemas, overlapping skill descriptions, duplicated instructions, and whole
child-agent transcripts are all formerly-useful content billed against every
future inference. The objective is therefore Context Efficiency
(task-relevant information over total active tokens): a smaller high-signal
context routinely beats a larger diluted one on cost, latency, and
goal-adherence. The cargo-test illustration is kept as the canonical
reduction (thousands of raw lines compile to counts, named failures, and
relevant diagnostics, with the raw log retained in storage and re-fetchable
on demand). The companion direction adds the priority guardrail that this candidate design
adopts: correctness outranks relevance, relevance outranks cache hit, and
cache hit outranks token cost, so stale content is never retained merely to
protect a hit rate.

**Critical judgment:** the efficiency ratio is a design compass, not a
metered claim; no measurement in the candidate direction establishes any threshold. The
stable claims are the lifecycle sentence (once-useful does not mean
next-turn-needed) and the reduction pattern (structured result in Hot
context, raw artifact behind a pointer). Cross-cutting Git-design reference
(owner direction): where this reduction and eviction design touches
compression, it should take the companion Git-model material (content
addressing, immutable objects, GC and packfile discipline) as design input;
see the companion
[Wheel-config and Git-model candidate design](wheel-config-and-context-git-model-candidate.md),
not an implementation.

## Code reading as a Code Intelligence Layer

The retained direction replaces whole-file dumping with staged cognition:
repository tree, module map, symbol map, references and callers, relevant
region, exact source, and whole-file reads only rarely. The direction's
supporting citations (a viewer showing on the order of one hundred lines,
concise search matches over match-plus-wide-context, repo-map topology
before deep reads) are kept as discussion-reported observations, not as
verified findings. The ctxctl-style level sketch (tree, symbol index,
signature and docs, relevant function, local surroundings, whole file) is
kept as compatible prior art already inside this project's practice.

**Critical judgment:** the level list is vocabulary, not an adopted API; the
cited viewer sizes are anecdote without a reproduced fixture. The stable
claim is the ordering principle (topology before locality, locality before
totality) plus on-demand expansion behind references, which the Context
Pointer section below makes addressable.

## Tool ergonomics: expose intent, hide plumbing

The retained rule is that agent tools are redesigned for model cognition,
not wrapped one-to-one from internal APIs: narrow schemas with clear
optionality, defaults, and descriptions beat wide plumbing-exposing surfaces
whose parameter interactions invite repeated schema-error retries. The
MCP-count material is kept with its reported shape (tens of tools cited as
the region where selection accuracy degrades; one vendor combination cited
near 55K tokens of definitions) strictly as unverified discussion figures,
with the architectural consequence retained: registry plus discovery plus
ranking plus temporary activation, not connect-equals-expose-everything. The
The quality-and-context-compiler activation material adds the cache-aware loading strategies (static,
deferred-native, harness dispatch, cache branch) with a small static core
(such as search, inspect, edit, run, context inspection, and task update)
and deferred capabilities for rare integrations, plus the explicit refusal
of a single universal JSON dispatcher: one static schema would cache well
but cost call accuracy, so correctness still outranks cache.

**Critical judgment:** every tool name, count, and threshold in these ranges
is illustration; no schema, catalog, or loading strategy is adopted. The
stable claims are the design rule (expose intent, hide plumbing), the
activation shape (small static core, need-driven remainder), and the
tiebreak role of cache (prefer the cached candidate only among
near-equal-value options).

## Capability discipline: Skill Hell, Resolver, and trust

The retained analysis accepts progressive disclosure (name plus description
always loaded, body on trigger, references and scripts on demand) as correct
but insufficient: it bounds per-skill residence without bounding a large
overlapping discovery space. The four collision modes are kept as the
working definition of Skill Hell: discovery collision (near-identical
triggers force guess-or-load-all), instruction duplication (the same
guidance enters context repeatedly), instruction conflict (contradictory
directives with no arbiter), and trigger amplification (one activation
cascades into more loads). The proposed engineering answer is a Skill
Resolver: registry-time overlap, trigger, instruction, trust, footprint, and
provenance analysis feeding task-time deduplication, ranking, and activation
of one or two candidates with overlap warnings. The trust material adds the
metadata direction (source, trust tier, permissions, token cost,
side-effects, network and executability flags), the tier sketch (built-in,
signed official, user-local, third-party and bundle downloads as
untrusted), and the per-part policy inside a skill (reading text allowed,
executing scripts and network gated, sensitive paths denied or prompted).

**Critical judgment:** the resolver is a candidate subsystem, not an adopted
algorithm; overlap scores and tier assignments are vocabulary. The scan
figures cited in the direction (fractions of a public skill corpus with issues,
counts of confirmed payloads) describe that study's corpus only and are not
ecosystem prevalence claims. The stable claims are the Hell decomposition
(useful for measurement), the resolver placement (deduplicate before the
model, not through the model), and the no-implicit-trust rule (installation
never implies executability). Enforcement placement and schema stay with
[Tool transport R2](../architecture/tool-transport-r2.md) and the normative security
corpus.

## Small prompt and need-driven discovery

The retained posture keeps the core prompt to environment facts, principles,
constraints, and invariants while leaving tactics to the model: no mandatory
skill-inspection, MCP-consideration, or fixed step sequences per task. The
reported vendor turn (a large instruction file judged a failure for crowding
context, going stale, and hiding priorities, replaced by a short index over
progressively disclosed docs) is kept as discussion-reported experience,
not verified evidence. The discovery rule is kept with its slogan:
capabilities are discoverable on need (native reasoning first, discovery
only on insufficiency), never obligatory per turn; skills cover
project-specific unknowns, not general coding ability the model already
has. The thin-global plus project-delta layering (few global skills,
project-scoped additions only) is kept as compatible practice.

**Critical judgment:** the prompt sketch lines are illustration, not adopted
text; the vendor anecdote proves nothing about any threshold. The stable
claims are the ceiling argument (prompts should shrink as models strengthen,
bounded above by the brittle-workflow versus vague-constraint middle) and
the obligation inversion (usage follows demonstrated need, never inventory).

## Verification Runtime as a first-class citizen

The retained model makes verification Harness capability rather than prompt
reminder: every action carries an expected outcome, a verification step, and
evidence that gates the state transition. The language-chain illustrations
(edit to format to diagnostics to targeted to broader tests to diff review)
and the project-adapter direction (manifest files implying the right
verifier family, so agents never rediscover lint, test, or typecheck
commands) are kept as candidate behavior. The primacy claim (verification
first in the optimization order) is kept as the resourcing opinion that
justifies building this runtime before further capability inventory.

**Critical judgment:** no verifier, chain, or inference rule is adopted; the
stable claim is the gating shape (done-ness is decided by evidence, not by
model self-report) plus the adapter placement (project facts imply
verification, prompts do not re-derive it).

## Structured state, lifecycle hygiene, and advanced compaction

The retained split refuses to treat the transcript as task state: goals,
status, inspected and modified files, decisions, open questions, and
verification state persist structurally while conversation stays
discardable. Compaction therefore becomes lifecycle hygiene (decisions and
evidence promoted to state and artifacts, ephemera dropped) rather than a
single threshold-triggered summarization, with repeated summarization
explicitly distrusted for information loss. The companion direction contributes the four
operating modes (continuous reduction at ingestion, continuous eviction of
re-fetchable content, checkpoint compaction at phase boundaries, emergency
compaction only near budget exhaustion), the traceability rule (a summary is
a compressed view plus evidence pointers with rehydration, never a
replacement), and the Context Pointer mechanism (addressable artifacts the
model inspects on demand instead of receiving bulk payloads up front).

**Critical judgment:** the state sketch fields are vocabulary; no retention,
schema, or compaction trigger is adopted. The stable claims are the
separation (state survives, transcript need not), the hygiene cadence
(cleanup at phase completion, not only at budget pressure), and the
provenance rule (every surviving summary names its evidence). Cross-cutting
Git-design reference (owner direction): checkpoint and reflog-style recovery
for this state should take the companion Git-model material as design input;
see the companion
[Wheel-config and Git-model candidate design](wheel-config-and-context-git-model-candidate.md).

## Wheel decomposition and top principle

The retained decomposition places a deterministic Bitty Core (workspace,
panel, PTY, process, filesystem, environment, IPC, events, permissions,
resource accounting) under a stable API, with Wheel above composing agent
loop, planner, model routing, memory, skills and MCP, context compilation,
capability resolution, verification, multi-agent scheduling, policy, and
evaluation. Core knows neither model brands nor agent roles; Wheel owns all
of that composition, so a rewritten agent architecture need not disturb
Core. The compiler sketch is kept as the central metaphor: raw sources enter
(normalize, classify, resolve, retrieve, compress, budget, cache-plan,
provider-lower) and a per-turn Active Context leaves, with Wheel Knowledge
always a strict superset of what the model sees. Of the seven proposed
modules, the direction nominates Context Compiler and Verification Runtime as
the two worth the deepest investment. The closing top principle is kept as
the author-proposed architecture sentence: at every step the agent should
see only the minimum high-quality information needed for the current
decision, with reliable feedback on every consequential action.

**Critical judgment:** the module boxes and arrows are a candidate topology,
not an adopted decomposition; no module boundary here implies any crate,
package, or team split. The stable claims are the ignorance rule (Core
never branches on providers or roles), the superset inequality (stored
knowledge exceeds shown context by design), and the investment ordering
(compiler and verification before inventory).

## Panel and Agent separation, scheduling, and provider routing

The retained directions are: Wheel reads structured terminal truth (panel,
process, environment, command lifecycle) instead of re-deriving it through
shell text parsing; Agent, Panel, Process, Workspace, Task, and Session are
independent entities joined by association, so agents attach, spawn
headless, release, and reattach while panels outlive any single agent; and
spawning is a scheduled, budgeted primitive weighed against coordination
cost rather than a model impulse, with child agents returning structured
conclusions plus evidence and confidence while transcripts stay in storage.
Providers are kept out of the agent architecture behind a capability profile
(window, reasoning levels, tool calling, structured output, vision, caching,
pricing, latency) with agents holding only a model reference. The Eval
direction (task success, unnecessary and failed tool calls, tokens per turn,
duplication, skill precision, retries, compactions, spawns, wall time, and
cost, compared across versions by a repeatable command) is kept as the
long-term competitiveness claim: Harness changes must move meters, not
impressions.

**Critical judgment:** every entity, field, metric, and command spelling is
vocabulary; no lifecycle machine, scheduler policy, profile schema, or eval
harness is adopted. The stable claims are the negative identities (Agent is
not Process, Panel, or Workspace), the cost inequality (parallel gain must
exceed coordination cost), and the routing indifference (agent code never
branches on provider brand). Wheel modes pointer (owner direction): headless
operation and the Panel-versus-Agent lifecycle split are recorded as Wheel
modes alongside one-shot single-question non-Agent chat; the headless and
split material is grounded in the material above and in the companion direction, while the
one-shot form is owner direction recorded as design-only in the companion
[Wheel-config and Git-model candidate design](wheel-config-and-context-git-model-candidate.md#wheel-modes),
which carries no implementation claim.

## Context IR and content-layout separation

The retained design makes the compiler emit a Context Intermediate
Representation rather than a prompt string: each unit carries identity,
kind, source, content, priority, relevance, authority, trust, freshness,
lifetime, token estimate, cacheability, stability, content hash,
dependencies, and provenance. The worked sketches (a symbol-scoped code unit
with stability-until-file-changes, a test-result unit with task-phase
lifetime bound to a panel event source) are kept as illustrations of the
field semantics. Content is separated from arrangement so that provider
backends (one per vendor family) own prefix order, cache markers, and key
semantics while the agent runtime stays brand-agnostic.

**Critical judgment:** the struct is an unreviewed sketch proposing no type,
module, or contract; every field value shown is illustration. The stable
claims are the IR-first pipeline (rank, budget, and plan over units, never
over raw strings) and the backend seam (provider specifics live behind one
interface the compiler programs, not inside agent logic).

## Stability zones and the cache tree

The retained stratification orders context by volatility: provider and model
contract as the most stable layer, then Wheel Core, project context, task
state, working set, and current turn as the most dynamic. Each zone's
examples are kept (core prompt and invariants; project instructions and
conventions; goal, constraints, decisions, modified and open items; symbols,
diagnostics, and diffs; latest user message and fresh tool results) with
their stated lifetimes (version-scale, checkout-scale, tens-of-turns,
per-turn). The cache tree follows the same layering (core, then project,
then task checkpoint, then dynamic suffix) with a chained-hash sketch so a
working-set change invalidates only the suffix while a project change
invalidates everything below it, mirroring prefix-cache behavior.

**Critical judgment:** zone boundaries and hash mechanics are candidate
design, not adopted versioning; the direction's zone count wording and the
sketch differ cosmetically and neither is normative. The stable claims are
the ordering (volatility increases down the stack) and the invalidation
direction (a change invalidates its layer and below, never above).
Cross-cutting Git-design reference (owner direction): the chained,
content-derived layering should take the companion object-model material
(content addressing, immutable layers) as design input.

## Serialization stability and dynamic placement

The retained rule is that the compiler owns a canonical serializer: stable
tool ordering, stable property order and whitespace and enum forms, and
fixed section order, because nondeterminism as small as key order or a
leading timestamp can collapse prefix reuse. Dynamic content (time, request
identifiers, temporary paths, live status, budgets-as-text) is banished from
the stable prefix into trailing snapshots, task state, and runtime sections,
following the position rule that volatility belongs late and stability
belongs early.

**Critical judgment:** no serializer, ordering, or section list is adopted;
the hazard examples are illustrations of a real failure class. The stable
claims are the ownership (one canonical serializer gates every prompt byte)
and the placement inequality (prompt position tracks inverse volatility).

## Admission scoring and authority resolution

The retained scoring treats relevance, importance, freshness, and authority
multiplicatively against noise and token-cost penalties, with cache affinity
as a deliberately small additive tiebreak: among near-equal candidates the
cached one wins, but cache never selects content. The authority ladder
(system policy, current user instruction, explicit project rules, task
decisions, retrieved documentation, old summaries, model-generated notes) is
kept with its conflict rule: on contradiction the higher-authority item
survives and the lower is evicted before the model ever arbitrates.

**Critical judgment:** the formula is a thinking tool, not a calibrated
model; weights, scales, and the tiebreak constant are all open. The stable
claims are the tiebreak ceiling (cache affinity stays epsilon-small) and the
pre-resolution rule (the compiler settles authority conflicts; the model
does not receive both sides as a judgment call).

## Content-addressed code and deduplication

The retained rule binds every code unit to path, symbol, range, file hash,
and optional revision: on mismatch the unit flips STALE and is barred from
Hot context, defeating the classic failure of reasoning from a
three-turns-ago file version. Duplicated guidance across instructions,
skills, docs, and notes is merged into one derived unit (such as a single
project formatting invariant) that keeps its full source list, cutting
semantic duplication while preserving auditability through a
value-plus-sources shape.

**Critical judgment:** the artifact shape and merge behavior are candidate
design; no hash function, key, or store is adopted. The stable claims are
the staleness bar (hash mismatch excludes, never warns-and-keeps) and the
provenance retention (merges name every source). Cross-cutting Git-design
reference (owner direction): artifact identity and dedupe should take the
companion content-addressed object material as design input.

## Tool-result reduction pipeline

The retained pipeline reduces tool output in three levels before the model
pays attention: deterministic scrubbing without any model call (escape
sequences, progress rendering, repetition, timestamps), structural parsing
without any model call (build and test output to counts plus named failures
plus diagnostics, typecheck output to located errors, diffs to file counts
before hunks), and model-backed semantic compaction reserved for genuinely
unstructured material (long discussions, exploration, large documents,
research results).

**Critical judgment:** no parser, schema, or threshold is adopted; the token
counts shown are illustrations. The stable claim is the level order
(deterministic first, structural second, model-backed last) with model calls
as the scarce last resort.

## Pass pipeline, budgets, and quotas

The retained pipeline runs ingestion, normalization, classification,
staleness check, candidate retrieval, authority resolution, deduplication,
reduction, relevance ranking, token budgeting, cache planning, and provider
lowering, with post-request telemetry (effectiveness, hit outcome, tool
success) feeding the next turn. Budgets are deliberately decoupled from the
model window (soft active target, hard active cap, emergency limit, with
small-start growth tuned by evaluation rather than hardcoded bands), and the
active budget is split into Pinned (instructions, intent, invariants,
safety), Flexible (code, docs, diagnostics, conversation, tools competing
for the remainder), and Reserve (room for the next tool result, model
output, and reasoning, so reads can never starve the turn's own work).

**Critical judgment:** the pass list is a candidate pipeline, not an adopted
control flow; every number attached to budgets is illustration. The stable
claims are the feedback closure (telemetry revises future compiles) and the
reserve invariant (a turn always holds room for its own output).

## Cache kinds, stable prefix, and provider capability

The retained taxonomy keeps four distinct caches: provider prompt and KV
cache (latency and cost), artifact cache (parses, indexes, maps, summaries
keyed by content hash), retrieval cache (query results keyed by revision,
query semantics, and index version), and compaction cache (event ranges
already compacted to a checkpoint, reused while inputs are unchanged).
Prefix stability is kept as the provider-cache lever (stable core, tools,
and project layers up front so later dynamic layers miss narrowly rather
than globally), with tool activation handled by deferred strategies so a
newly discovered tool does not rewrite the cached prefix. Provider cache
differences are abstracted behind a capability record (mode, prefix basis,
breakpoint count, explicit and implicit support, prewarm, TTLs,
invalidation rules) maintained by each provider plugin, and cache identity
further includes provider, model, protocol, reasoning profile, toolset, and
prompt versions, with explicit compiler versioning so a one-line prompt
change explains its own invalidation instead of surfacing as a mystery hit
drop.

**Critical judgment:** every struct field, key shape, and hit-rate figure is
unreviewed illustration; no cache contract or namespace is adopted. The
stable claims are the four-way split (one cache story per concern, never a
single boolean), the prefix discipline (stable-first ordering), and the
capability seam (the compiler knows capabilities, never brands).

## Provider observability as a design pointer

The retained direction gives the compiler strong observability: a compact
statusline (active tokens against budget, cache share, hot, stable, and
dynamic splits), an inspectable context breakdown (per-layer token
attribution from core prompt through current turn), a cache view
(attributable reusable prefix, cached bytes, hit rate, miss causes), a
why-view (per-unit relevance, referencing diagnostic, containing symbol,
source revision), and a per-compile trace (added, reduced, evicted, and
hit-marked units with reasons) so a bad turn is debuggable as what the model
saw, why each unit was chosen, what was compacted away, and why the cache
missed.

Provider observability (owner direction): the provider side should expose
cost, cache-hit, input, context, and timing signals for future plugins, with
git-style traceability (`git log --stat` and `git blame` as the UX
reference) as the interaction model for attributing context cost and cache
behavior to decisions over time. This is explicitly a design pointer
recorded here: **no `bitty-ai` code change happens in this task**, and a
future `AI-XXXX` task implements it against a real HTTP or Router adapter.
No endpoint, field, metric name, or display in the direction sketches is
adopted; the sketches stay discussion vocabulary for that future task.

**Critical judgment:** the display contents, field names, and trace syntax
are illustrations, not accepted views; the stable claim is the debuggability
bar (every admission, eviction, reduction, and miss is attributable after
the fact).

## Worked example and subsystem split

The retained walkthrough shows the intended steady state: a bug task
compiles to a small stable-plus-task-plus-just-in-time first view; search
returns symbols rather than transcripts; edits flip old code versions STALE
on hash change; a multi-thousand-token test log persists in the event store
while Hot context keeps on the order of a hundred structured tokens behind
a pointer; raw generated information grows into the hundreds of thousands
while Hot context holds steady in the tens of thousands with most of the
provider request served from cached prefix. The five-subsystem split (store
with events, artifacts, and checkpoints; index with code, docs, and
semantic; compiler with retrieval, ranking, dedup, reduction, budgeting, and
authority; cache with artifact, retrieval, compaction, and provider; backend
with one vendor module each) is kept as the candidate module map, with the
load-bearing dataflow that full session state never reaches the model
directly but only through the compiler's retrieve, reduce, and cache-plan
passes into IR and then a provider backend.

**Critical judgment:** the walkthrough numbers are narrative illustration,
not measured evidence; the module paths are a candidate layout, not adopted
packaging. The stable claims are the steady-state inequality (stored
knowledge grows while Active Context stays small and high-signal) and the
anti-decay thesis (session length must enrich storage, never dirty the
view). The closing architectural sentence is kept as author opinion: the
Harness manages a growing session knowledge graph and compiles per-turn
views, with threshold compaction demoted to one optimization pass among
many.

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered models are
candidate inputs only; the quality formula, the seven-module Wheel sketch,
the Context IR shape, the zone model, the pipeline, and the five-subsystem
split proposed in the candidate direction are **not** accepted by this candidate design and
must not be read as crate, package, protocol, or release decisions. Context
assembly, budget, and retention questions stay with
[Context Management Architecture](../context/context-management.md),
[Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md),
and [Context retention R3](../architecture/context-retention-r3.md); prompt-text layering
stays with [Prompt Layering Design](../context/prompt-layering-design.md); tool shape
and transport placement stay with
[Command and Tool Architecture](../architecture/command-tool-architecture.md) and
[Tool transport R2](../architecture/tool-transport-r2.md); provider questions stay with
[Provider plugin boundary](../providers/provider-plugin-boundary.md); execution and
environment questions stay with [Execution ownership R1](../architecture/execution-ownership-r1.md)
and [Panel environment awareness](../interfaces/panel-environment-awareness.md);
coordination and persistence questions stay with
[Agent Coordination Architecture](../agent/agent-coordination.md),
[Task lifecycle R5](../architecture/task-lifecycle-r5.md), and the persistence
dispositions. Each is referenced, never duplicated or modified.

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) defines the only
accepted IPC wire, scope, and Agent vocabulary. Every sketch name in the
candidate direction (tool names such as `code.search` or `capability.call`, hook names,
command names, struct and enum names, metric names, CLI spellings such as
`wheel eval` or `wheel context log`) is a discussion sketch: this draft
records it as input and proposes no command, tool, event, wire format, or
CLI surface. Where the direction's sketches overlap RFC-owned ground (Agent
lifecycle, Agent events, Agent semantics, scopes), the RFC wins without
further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed redaction,
consented recording, secret minimization) override every discussion example
throughout this document. Capability metadata, trust levels, permission sets, and verification
gates in the candidate direction are conceptual vocabulary, not additions to any accepted
registry, schema, or protocol. This draft creates or closes no AIQ or OQ
identifier; open questions stay with
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the design falsifiable before any
quality-formula or compiler proposal constrains `bitty-ai`.

| Campaign         | Required observation                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality product  | A Harness change that zeroes one factor (verification, relevance, ergonomics) is shown to move task success in replayed-trace evaluation before any window claim.   |
| Efficiency       | A reduced high-signal context beats a larger diluted one on success, latency, and cost for the same task family in reviewable fixtures.                             |
| Pollution        | A named pollution class is removed from Hot context with its raw artifact retained and re-fetchable, and success does not regress in reviewable tests.              |
| Tool ergonomics  | A narrowed schema or renamed parameter reduces call-failure and retry rates in logged tool telemetry before any catalog change.                                     |
| Discovery        | A Resolver change improves skill precision (fewer wrong activations, fewer total loads) without regressing success in reviewable evaluation.                        |
| Trust            | An untrusted skill or MCP exercises exactly its grant, with script execution and sensitive reads gated or denied in reviewable tests.                               |
| Verification     | A completion gate rejects a plausible-but-wrong change that the model self-reported as done, in reviewable tests.                                                   |
| State hygiene    | Phase-boundary cleanup preserves decisions and evidence while dropping ephemera, with rehydration succeeding from pointers in reviewable tests.                     |
| Cache discipline | A stale unit is excluded on hash mismatch, and a relevance eviction is never vetoed to protect a hit rate, in reviewable tests.                                     |
| Budgets          | Turns hold Pinned guarantees and Reserve room under adversarial reads, with soft, hard, and emergency behavior observable in reviewable tests.                      |
| Observability    | A bad turn is attributable to admissions, evictions, reductions, and miss causes from trace and views alone, without model self-report.                             |
| Provider pointer | A future adapter task demonstrates cost, cache-hit, input, context, and timing signals flowing to a plugin surface with git-style attribution, with no Core change. |

Promotion needs independent AI architecture, context-management, terminal
and plugin-owner, docs-curator, and security review. Route struct shapes,
formulas, zone cuts, pipeline order, budget bands, namespace fields, metric
names, display formats, and the provider-signal contract to scoped owner
tasks. This draft changes no normative contract and authorizes no product
code.
