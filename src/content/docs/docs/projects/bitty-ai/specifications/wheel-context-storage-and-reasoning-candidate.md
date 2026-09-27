---
title: Wheel context storage and reasoning management (candidate)
description: Candidate stored history versus compiled context, reasoning record, context compiler, and cache economics
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 66
---

# Wheel context storage and reasoning management (candidate)

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification, accepted
decision, dependency selection, release commitment, or implementation claim.
It records the candidate direction of Wheel Context Storage and Reasoning
Management: stored history must not equal the next model prompt, reasoning is
committed as a structured record rather than raw chain-of-thought, and a
Context Compiler builds a small stable-prefix prompt while treating cache hit
rate as one optimization rather than the goal.

The recommendation is to treat every model below as a candidate input to the
draft [AI Architecture](../architecture/ai-architecture.md) and its related draft
dispositions, never as an override of the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) or the normative security corpus.
In particular, the three-layer split, the `ContextCommit` shape, the Reasoning
Record and rationale field names, the `Action`/`Intent`/`Outcome` protocol, the
Episode shape, the Context Index and Context Compiler pipeline names, the
semantic-merge rules, the `ProviderState` object, the Git-operation mapping,
and the philosophy sentence are **not** accepted by this candidate design. Agent
lifecycle, Agent events, and Agent semantics in the direction are **discussion
inputs only**: the accepted Agent contract stays entirely with the RFC, which
this draft references without restating normatively. Nothing here is promoted
to accepted status, and no implementation is described as shipped.

The direction's strongest ideas are the central inequality (stored history is not
the next prompt), the three-layer mapping of History, Semantic State, and
Working Context onto the Git object/commit/index model, the rejection of
`messages: Message[]` in favor of a `ContextCommit` whose tree carries
conversation, task, reasoning, knowledge, artifacts, environment, and agent
graph, conversation kept as a DAG rather than a forced linear array, the
Reasoning Record and rationale naming that replace raw chain-of-thought with
portable structured cognition, the Scratch-versus-committed thinking split,
the Context Compiler pipeline that decouples storage capacity from context
window, the semantic-merge rule that never concatenates chat logs, the Episode
working unit, the optional opaque ProviderState with the
portable-semantic-versus-provider-native distinction, the why/what/where/how
tool protocol with the tool `reason` field as a commit-message analogue, the
cache-economics analysis that treats cache hit rate as one objective among
several, and the guiding philosophy. Its weakest claims are the concrete field
and object names, which are unreviewed vocabulary with no owner, versioning,
or compatibility evidence; the Context Index, Context Graph, and Context
Compiler pipeline, which propose no adopted interface or storage contract; the
`Action`/`Intent`/`Outcome` protocol, which is a proposed Tool API shape and
not an accepted one; the Episode and semantic-merge shapes, which propose no
schema; and the 2026 prompt-caching figures, which are reported vendor
semantics that this task did not verify. Those are corrected below.

This synthesis references, without duplicating or modifying, the draft
[AI Architecture](../architecture/ai-architecture.md) (candidate inputs only),
[Context Management Architecture](../context/context-management.md),
[Command and Tool Architecture](../architecture/command-tool-architecture.md),
[Agent Coordination Architecture](../agent/agent-coordination.md),
[Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md),
[Prompt Layering Design](../context/prompt-layering-design.md),
[Execution ownership R1](../architecture/execution-ownership-r1.md),
[Context retention R3](../architecture/context-retention-r3.md),
[Task lifecycle R5](../architecture/task-lifecycle-r5.md),
[Tool transport R2](../architecture/tool-transport-r2.md),
[Persistence profile R6](../architecture/persistence-profile-r6.md),
[Provider plugin boundary](../providers/provider-plugin-boundary.md), and
[Panel environment awareness](../interfaces/panel-environment-awareness.md). The accepted
[IPC and Agent RFC](ipc-agent-rfc.md) is unaffected by this draft. The
companion
[Event-sourced agent workspace candidate design](event-sourced-agent-workspace-candidate.md)
carries the six-object split, the agent-versus-task graph split, the mailbox,
and the Task-as-Issue direction; the companion
[Wheel-config and Git-model candidate design](wheel-config-and-context-git-model-candidate.md)
carries the Git-inspired content-addressed context model; the companion
[Quality-formula and Context-Compiler candidate design](quality-and-context-compiler-candidate.md)
carries the compiler, zones, cache, and budget design; and the companion
[Wheel core and plugin boundary candidate design](wheel-core-plugin-boundary-candidate.md)
carries the mechanism-versus-policy rule. This draft links to each wherever
context storage, reasoning, or prompt assembly touches them, as design input
rather than implementation. This document creates no AIQ or OQ identifier and
closes none.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Stored history versus compiled context

The retained direction separates two things that must not be conflated: the
stored history (user conversation, tool calls, file operations, agent
decisions, traces, artifacts) can be persisted long-term in full, but only a
selected and compiled working set enters the model context window. Three
layers map onto Git: History and Object Store (`.git/objects`), Semantic State
(`tree + commit`), and Working Context (`index + worktree`). An agent's state
is recorded not as `messages: Message[]` but as a `ContextCommit { tree,
parents, agent, model, timestamp, summary }` whose tree carries conversation,
task state, reasoning state, knowledge, artifacts, environment, and agent
graph. Git commit semantics fit because a commit is logically a full snapshot
of cognition while physically incremental through structural sharing, so a
fork adds only refs to shared objects and long thinking no longer makes forks
heavy.

**Critical judgment:** the layer names, the `ContextCommit` shape, and the Git
mapping are unreviewed vocabulary proposing no type, schema, registry, or
module. The reconciliation with prior art is explicit: the history-versus-view
inequality restates the wheel-config-and-context-git-model candidate design's history-versus-active-view sentence,
the event-sourced-agent-workspace drafting's "Context is not History" inequality, the
[Context Management Architecture](../context/context-management.md)
`/compact`-changes-the-boundary rule, and the draft prefix-cache
[stable-before-dynamic ordering](../context/prefix-cache-context-design.md); the
`ContextCommit`-instead-of-`messages[]` direction agrees with the wheel-config-and-context-git-model
checkpoint-as-commit concept and the wheel-config-and-context-git-model content-addressed context DAG;
the three-layer split agrees with the quality-and-context-compiler `Context Compiler` framing
(Storage versus Active versus Cache) and the quality-and-context-compiler Cold/Warm/Hot
stratification. The load-bearing rule is the inequality itself; this draft
adopts no layer schema, object type, or storage format, and the
content-addressed model stays with the wheel-config-and-context-git-model candidate design. Hash choice, shard
layout, and persistence backend stay with R6 and the storage dispositions.

**Reading note (candidate, session-model alignment):** the `ContextCommit.tree`
is read as a manifest of what the snapshot contains rather than as the
literal topology of every carried dimension. Conversation, knowledge, and the
agent graph keep their graph shape carried by parents and typed references;
the tree does not force them into a folder hierarchy. The named-scope,
manifest, and graph-over-tree readings stay with
[Session model (candidate)](session-model-candidate.md).

## Conversation as a DAG, not a linear array

The retained direction stores the whole conversation while refusing to force
it into a single linear array: conversation itself may be a **DAG**, because
one user turn can branch to multiple agents. This matches the intended
agent-team graph rather than a main agent with a flat fan of child agents.

**Critical judgment:** the DAG claim proposes no node, edge, or traversal
contract. The reconciliation with prior art is narrow: the graph-conversation
direction agrees with the wheel-config-and-context-git-model candidate design's DAG-over-message-list direction and
the event-sourced-agent-workspace candidate design's agent-graph-versus-task-graph split (the cyclic
collaboration topology kept distinct from the acyclic task ordering). The
Agent-graph vocabulary and any shared-context semantics stay with the RFC and
the event-sourced-agent-workspace candidate design; this draft records the DAG direction as a candidate
invariant and adopts no branching protocol, merge algorithm, or node shape.
Whether the production shape is one conversation DAG or a conversation tree
per agent stays open.

## Reasoning Record, Scratch Reasoning, and rationale naming

The retained candidate direction refuses to store AI thinking as raw
chain-of-thought token text. Instead it defines a Wheel-controlled
**Reasoning Record**: goal, observations, assumptions, hypotheses, decisions,
rejected alternatives, uncertainties, next actions, and evidence — a
portable object independent of provider, model, session, machine, and branch.
Two kinds of thinking are distinguished: **Scratch Reasoning** (very
short-lived, ephemeral, by default not committed) and the committed
**Reasoning Record** (long-term). A stable conclusion becomes a record;
in-progress musing is discarded. The durable form is named **rationale** (or
intent), not `reasoning`, to avoid implying full chain-of-thought, with the
lifecycle: ephemeral internal reasoning, then a decision boundary, then a
structured Rationale (Why, What, Where, How, Expected, Observed, So-what,
Next), then the context object store. The direction's illustration is that a
~300-token structured rationale replaces ~15k tokens of raw thinking, so the
next model re-reasons from structured state instead of inheriting stale
assumptions, reducing **reasoning inertia**.

**Critical judgment:** the field list and the naming decision are vocabulary
proposing no schema, format, or storage contract; the ~300-versus-~15k figure
is an illustration, not a measurement. The reconciliation with prior art is
explicit: the discard-scratch/commit-conclusion split agrees with the quality-and-context-compiler
thought-state split and the discardable-transcript rule; the
per-call-rationale direction tightens the execution-supervisor tool-run record (input, reason,
status, duration, summary plus blob references) and the event-sourced-agent-workspace candidate design's
per-call reason as a durable, commit-message-shaped rationale with internal
thinking ephemeral; the reasoning-namespace placement agrees with the quality-and-context-compiler
cache section that keeps reasoning and tool-choice state in a named
namespace. The naming choice (`rationale`/`intent` versus `reasoning`) stays
open with the owner, as does whether the structured record replaces or
supplements the provider's native reasoning. No field, type, or wire is
adopted here.

## Context Compiler, Context Index, semantic merge, Episode, and ProviderState

The retained candidate direction generates context through a **Context
Compiler**: Object Store, then Context Graph, then Context Compiler, then
Prompt, then LLM. Storage capacity and context-window size are fully
decoupled — a multi-GB context repository yields a tens-of-kilobyte prompt,
exactly as a Git repository's size is unrelated to `git status` output. The
Git mapping is adopted as a design frame: Object DB to context object store,
Blob to message/output/artifact, Tree to context tree, Commit to context
commit, HEAD to agent current context, Branch to context branch, Tag to
milestone, Index to prompt staging area, Worktree to agent live runtime,
Reflog to context history, Stash to suspended context, Merge to context merge,
Cherry-pick to import reasoning/task/result, Rebase to rebuild on new context,
GC to context compaction, and Clone to context migration. The **Context
Index** is the staging area: it declares which objects enter the next
inference, showing staged goal, task, reasoning, and files versus excluded
messages and traces. **Merge is semantic, not textual**: merging two agents
concatenates no chat logs; it produces a merge commit with parents, records
conflicting conclusions, the chosen resolution, the reason, and preserved
evidence. An **Episode** is the working unit: trigger, then events
(action/observation/reasoning/decision), then an optional outcome and
reasoning record — users see message-level turns while Wheel stores
episode-level structure, making agent debugging tractable. Provider-native
reasoning state (reasoning IDs, encrypted state, continuation or cache
handles) is stored as an optional opaque `ProviderState` object that Core
never depends on: portable semantic context (ReasoningRecord, Decision,
Observation, Task, Message) keeps a GPT-to-Claude continuation possible while
a GPT-to-GPT continuation may reuse native state.

**Critical judgment:** the pipeline stage names, the Context Index, the
Episode shape, the merge rules, and the `ProviderState` object are unreviewed
vocabulary proposing no interface, schema, or storage contract. The
reconciliation with prior art is explicit: the
compiler-as-materialized-view direction agrees with the quality-and-context-compiler compiler and
its never-direct dataflow, and the storage-window decoupling restates the quality-and-context-compiler
budget decoupling and the wheel-config-and-context-git-model content-addressed model (both kept, not
restated, in their companions); the Context Index staging direction agrees
with the Git Index mapping already carried by the wheel-config-and-context-git-model candidate design, and its
staged-versus-excluded inventory overlaps the prefix-cache context prefix-cache
stable-prefix layering and the quality-and-context-compiler admission and authority sections; the
semantic-merge rule agrees with the wheel-config-and-context-git-model merge paragraph and the event-sourced-agent-workspace
companion's typed merge kinds, and the direction's own non-concatenation rule is
recorded as the load-bearing part; the Episode direction agrees with the execution-supervisor
partition classes and the session-journal direction in
[Context Management Architecture](../context/context-management.md); the ProviderState
split agrees with the [Provider plugin boundary](../providers/provider-plugin-boundary.md),
the quality-and-context-compiler provider-cache capability seam, and the prefix-cache context provider qualifications.
An opaque provider blob is untrusted state under the security baseline; this
draft proposes no merge algorithm, conflict schema, episode schema, staging
format, or provider-state contract, and the memory-tier and storage-layout
choices stay with the wheel-config-and-context-git-model candidate design and R6.

## The why/what/where/how tool protocol

The retained candidate direction makes why/what/where/how a **tool-call
standard protocol**: `Action { intent, call }`, where `Intent { why, what,
where, how, expected }` and `Outcome { observed, evidence, changed,
implication, next }`. This is far richer than `{ tool, args }` and yields a
machine-readable engineering log; the tool `reason` field plays the role of a
Git commit message (what changed and why).

**Critical judgment:** the protocol is a proposed Tool API shape, not an
accepted one; the field names propose no schema, wire, or tool contract. The
reconciliation with prior art is explicit: the intent-first direction agrees
with the quality-and-context-compiler expose-intent rule and its tools-versus-APIs
intent-hiding critique, and it tightens the execution-supervisor tool-run record and the event-sourced-agent-workspace
companion's reason-as-commit-message direction without adopting any field;
tool shape, placement, and transport stay with
[Command and Tool Architecture](../architecture/command-tool-architecture.md) and
[Tool transport R2](../architecture/tool-transport-r2.md), and any protocol becoming the
accepted Tool API is an owner decision recorded as open. This draft adopts no
action, intent, outcome, or reason field and proposes no command surface.

## Cache hit rate is not task quality

The retained direction states that **cache hit rate is not task quality**.
Optimization is a multi-objective function — task success, context relevance,
latency, token cost, cache reuse, and information preservation — never
`maximize(cache_hit_rate)`. Actively shrinking unrelated context (raising
cache miss while lowering token count and noise) can be the correct behavior;
the guiding objective is `minimize(required_context)` while
`preserving(required_information)`, with `maximize(cache_reuse)` as a second
layer. The direction reports 2026 prompt-caching economics: input is billed per
token split into uncached (1x), cache read (commonly 0.1x), and cache write
(Anthropic approximately 1.25x at 5-minute TTL and 2x at 1-hour; OpenAI
usually no write surcharge; Gemini implicit approximately 10 percent plus
explicit per-hour storage); caching is **prefix-exact**, not semantic, so
stable material must lead and mutable material must trail or everything after
the first differing token is billed uncached, and cache discounts only input
processing while output and context-window or TPM occupancy are unaffected.
The resulting prompt shape is `Stable Prefix` (core prompt, tool schemas,
project rules, stable knowledge) plus `Structured State` (goal, task,
decisions, rationale, key observations) plus `Dynamic Tail` (recent messages,
latest tool results, current request). Telemetry should report context
efficiency (input tokens, cached tokens, cache hit percentage, selected and
excluded objects, compressed percentage, relevance estimate) rather than
cache hit alone.

**Critical judgment:** the efficiency figures and vendor pricing are reported
semantics that this task did not verify and must not be adopted as defaults;
the prompt shape and telemetry fields are vocabulary proposing no serializer,
budget, metric, or command. The reconciliation with prior art is explicit:
the correctness-before-cache ordering agrees with the quality-and-context-compiler
correctness-first guardrail and the prefix-cache context invariant set, and the
maximize-cache-last rule agrees with the quality-and-context-compiler prioritized optimization
order; the stable-prefix, structured-state, dynamic-tail shape restates the
[Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md)
stable-before-dynamic layering and the quality-and-context-compiler stability zones and
inverse-volatility placement, and it is consistent with
[Prompt Layering Design](../context/prompt-layering-design.md); the prefix-exactness and
provider-cost caveats agree with the prefix-cache context provider qualifications and the quality-and-context-compiler
provider-cache capability seam. Whether context-efficiency metrics are
defined and surfaced stays open with the context and observability owners,
and this draft adopts no threshold, metric schema, or provider pricing.

## Core philosophy

The retained candidate principle is: **Persist events, commit knowledge,
compile context** — Wheel does not need to remember every sentence an agent
thought, only why it acted, what it did, what it found, and what cognition
that changed, making Wheel an LLM-native versioned execution and cognition
runtime rather than a chat-session manager.

**Critical judgment:** the sentence is a slogan proposing no architecture,
packaging, or team split. Its reconciliation with prior art is cumulative:
persist-events restates the event-sourced-agent-workspace candidate design's immutable-history and the wheel-config-and-context-git-model direction
append-ordered journal rules; commit-knowledge restates the quality-and-context-compiler
promotion-to-state direction and the Reasoning Record candidate above;
compile-context restates the quality-and-context-compiler compiler-as-view direction, the prefix-cache context
stable-prefix design, and the wheel-config-and-context-git-model history-versus-active-view inequality. The
principle is recorded as candidate input only and authorizes no product code.

## Owner-pending pointers

The rows below route conclusions this candidate design does not cover. They are
pointers with inline summaries, not links and not decisions.

| Topic                                                                                                          | Owning destination                                                                |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Terminal-side surfaces: panel history versus compiled context, fork of execution snapshots, and the event log  | Terminal documentation owner; owner approval pending                              |
| Owner approval of the storage-layout split, the Reasoning Record schema, and the why/what/where/how protocol   | AI and Tool API owners jointly; owner approval pending                            |
| Naming decision (`rationale`/`intent` versus `reasoning`); structured action protocol as the accepted Tool API | AI and Tool API owners jointly; naming and API shape stay open                    |
| Context Index and Context Compiler interaction with draft prefix-cache design and R2/R3/R6 dispositions        | Context, retention, and persistence owners; metrics definition and surfacing open |
| Capture bookkeeping for the storage-layout split; split-owner capture stays partial                            | Storage and docs owners; no capture claim asserted beyond this draft              |

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered models are
candidate inputs only; the three-layer split, the `ContextCommit` shape, the
Reasoning Record and rationale fields, the `Action`/`Intent`/`Outcome`
protocol, the Episode shape, the Context Index, Context Graph, and Context
Compiler pipeline names, the semantic-merge rules, the `ProviderState` object,
the Git-operation mapping, and the philosophy sentence proposed in the direction
are **not** accepted by this candidate design and must not be read as product,
crate, package, protocol, file-schema, command, or release decisions.
Context assembly, ordering, budget, retention, and compaction questions stay
with [Context Management Architecture](../context/context-management.md),
[Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md),
[Prompt Layering Design](../context/prompt-layering-design.md),
[Context retention R3](../architecture/context-retention-r3.md), and the quality-and-context-compiler candidate design;
execution and panel-lifetime questions stay with
[Execution ownership R1](../architecture/execution-ownership-r1.md),
[Panel environment awareness](../interfaces/panel-environment-awareness.md), and the event-sourced-agent-workspace
companion; tool shape, intent fields, and transport placement stay with
[Command and Tool Architecture](../architecture/command-tool-architecture.md) and
[Tool transport R2](../architecture/tool-transport-r2.md); coordination, supervision, and
task questions stay with
[Agent Coordination Architecture](../agent/agent-coordination.md) and
[Task lifecycle R5](../architecture/task-lifecycle-r5.md); provider questions stay with
[Provider plugin boundary](../providers/provider-plugin-boundary.md); storage and export
questions stay with the wheel-config-and-context-git-model candidate design, [Persistence profile R6](../architecture/persistence-profile-r6.md),
and the storage dispositions; each is referenced, never duplicated or
modified.

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) defines the only
accepted IPC wire, scope, and Agent vocabulary. Every sketch name in the
candidate direction (object names, layer names, struct fields, tool-protocol fields,
pipeline stage names, merge rules, and operation spellings) is a discussion
sketch: this draft records it as input and proposes no file schema, API,
command, tool, event, or wire format. Where the direction's sketches overlap
RFC-owned ground (Agent lifecycle, Agent events, Agent semantics, scopes), the
RFC wins without further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed
redaction, consented recording, secret minimization) override every
discussion example throughout this document. Stored traces, reasoning records, artifacts, and
provider-native state are untrusted data: committing them to long-term
storage does not grant authority, and an opaque `ProviderState` blob must
not become a trusted channel or a secret-bearing object. The semantic-merge
sketch is conceptual vocabulary, not an adopted authorization or
distribution contract. This draft creates or closes no AIQ or OQ identifier;
open questions stay with
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the design falsifiable before any context
storage or reasoning proposal constrains `bitty-ai`.

| Campaign            | Required observation                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| History separation  | A turn persists far more than it sends and the compiled prompt excludes stored traces and reasoning while the task still succeeds, in reviewable tests.                                                      |
| State as commit     | A fork of agent state adds refs to shared objects without copying the full reasoning history, and the state reconstructs from tree, parents, and metadata alone, in reviewable tests.                        |
| Conversation DAG    | One user turn branching to multiple agents round-trips without flattening into a single linear transcript and without losing any branch, in reviewable tests.                                                |
| Reasoning record    | A later agent reconstructs why a decision was made from the committed rationale alone (goal, decisions, rejected alternatives, evidence) with no chain-of-thought access, in reviewable tests.               |
| Scratch discipline  | Ephemeral scratch reasoning is discarded by default and only a stable conclusion becomes a committed record, in reviewable tests.                                                                            |
| Compiler decoupling | A large stored history compiles to a small ordered prompt under budget with storage size and prompt size varying independently, in reviewable tests.                                                         |
| Index staging       | The staging area names exactly the included objects and excludes the rest, and the compiled prompt matches the declared staging without silent inclusion, in reviewable tests.                               |
| Semantic merge      | Two agents' contexts merge with explicit conflicts, a recorded resolution, a stated reason, and preserved evidence, and never by textual concatenation, in reviewable tests.                                 |
| Episode structure   | A debugging view reconstructs trigger, events, outcome, and reasoning record for an episode while the user-facing view stays message-level, in reviewable tests.                                             |
| Provider state      | A GPT-to-Claude continuation succeeds using portable semantic context alone after the provider-native state is dropped, and Core behavior is unchanged when the opaque state is absent, in reviewable tests. |
| Tool protocol       | A later reviewer reconstructs why a tool ran and what it changed from the recorded intent and outcome alone, with no thinking-dump access, in reviewable tests.                                              |
| Cache discipline    | Shrinking unrelated context raises cache miss while improving task success and lowering token count, and stable material leads with mutable material trailing in every compiled prompt, in reviewable tests. |
| Principle adherence | History is persisted without rewrite, reasoning is committed as structured knowledge, and the active prompt is compiled under budget across a full task, in reviewable tests.                                |
| Boundary integrity  | A terminal, storage, dashboard, or tool-runtime change ships with no `bitty-ai` contract change, and an AI-side change ships with no terminal contract change, in reviewable tests.                          |

Promotion needs independent AI architecture, context-management, tool,
persistence, terminal-owner, docs-curator, and security review. Route the
layer and object vocabulary, the `ContextCommit` shape, the Reasoning Record
and rationale schema, the `Action`/`Intent`/`Outcome` protocol, the Episode
model, the Context Index and Context Compiler stage contracts, the
semantic-merge rules, the `ProviderState` contract, and the
context-efficiency metrics to scoped owner tasks. This draft changes no
normative contract and authorizes no product code.
