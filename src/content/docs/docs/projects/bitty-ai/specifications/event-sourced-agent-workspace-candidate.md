---
title: Event-sourced agent workspace (candidate)
description: Candidate six-object split, agent versus task graphs, mailbox, typed merges, and task-as-issue semantics
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 65
---

# Event-sourced agent workspace (candidate)

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification, accepted
decision, dependency selection, release commitment, or implementation claim.
It records the candidate direction of Wheel as an Event-Sourced Agent Workspace:
agents act through `ExecutionContext` objects rather than panels (Agent !=
Panel; ExecutionContext != Panel), an immutable event log records facts,
context compiles from facts into a programmable versioned graph, and agents
collaborate over a communication graph with Git-like operations.

The recommendation is to treat every model below as a candidate input to the
draft [AI Architecture](../architecture/ai-architecture.md) and its related draft
dispositions, never as an override of the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) or the normative security corpus.
In particular, the six-object vocabulary, the event names, the mailbox and
bundle shapes, the merge-kind names, the primitive spellings, and the core
principle sentence are **not** accepted by this candidate design. Agent
lifecycle, Agent events, and Agent semantics in the direction are **discussion
inputs only**: the accepted Agent contract stays entirely with the RFC, which
this draft references without restating normatively. Nothing here is promoted
to accepted status, and no implementation is described as shipped.

The direction's strongest ideas are the founding inequalities (Agent is not
Panel, Panel is not Context, Context is not History, Task is not Agent), the
communication-graph versus dependency-graph split (cyclic agent
collaboration kept distinct from an acyclic task graph), the durable
per-call reason as a commit message instead of a thinking dump, the
context-share-as-first-class-object direction with lazy expansion, the typed
Knowledge, Task, and Workspace merge split, the Context GC versus structural
compaction distinction, the Task-as-Issue durable-object direction, and the
core principle that history is immutable, context is programmable, panels are
workspaces, and agents are actors. Its weakest claims are the concrete event
names, which are unreviewed vocabulary with no owner, versioning, or
compatibility evidence; the mailbox, bundle, and manifest field shapes, which
propose no adopted wire, protocol, or schema; the Git-operation mapping,
which borrows vocabulary without an enforcement or versioning owner; and the
primitive spellings, which name no accepted command surface. Those are
corrected below.

This synthesis references, without duplicating or modifying, the draft
[AI Architecture](../architecture/ai-architecture.md) (candidate inputs only),
[Agent Coordination Architecture](../agent/agent-coordination.md),
[Context Management Architecture](../context/context-management.md),
[Command and Tool Architecture](../architecture/command-tool-architecture.md),
[Execution ownership R1](../architecture/execution-ownership-r1.md),
[Context retention R3](../architecture/context-retention-r3.md),
[Task lifecycle R5](../architecture/task-lifecycle-r5.md),
[Tool transport R2](../architecture/tool-transport-r2.md),
[Provider plugin boundary](../providers/provider-plugin-boundary.md), and
[Panel environment awareness](../interfaces/panel-environment-awareness.md). The
accepted [IPC and Agent RFC](ipc-agent-rfc.md) is unaffected by this
draft. The companion
[Wheel core and plugin boundary candidate design](wheel-core-plugin-boundary-candidate.md)
carries the mechanism-versus-policy rule; the companion
[Wheel-config and Git-model candidate design](wheel-config-and-context-git-model-candidate.md)
carries the Git-inspired content-addressed context model; the companion
[Quality-formula and Context-Compiler candidate design](quality-and-context-compiler-candidate.md)
carries the compiler design; the companion
[Execution supervisor candidate design](execution-supervisor-candidate.md)
carries the supervisor, mailbox routing, and lifetime directions; the
companion
[Wheel scope candidate design](wheel-scope-and-framework-candidate.md)
carries the Coding-scope reconciliation; this draft links to each wherever
agent workspace design touches them, as design input rather than
implementation. This document creates no AIQ or OQ identifier and closes
none.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Six-object split and founding inequalities

The retained candidate vocabulary separates six objects: Agent (thinking
actor, mobile across panels), Panel (execution environment, may sit
agentless), Event (immutable fact until GC), Context (recompilable LLM
view), Task (goal and state, may span agents), and Artifact
(content-addressed outputs). The load-bearing inequalities are kept as
candidate design rules: Agent is not Panel, Panel is not Context, Context
is not History, and Task is not Agent.

**Critical judgment:** the object names are vocabulary proposing no type,
schema, registry, or module. The reconciliation with prior art is narrow:
the Agent versus Panel cut agrees with the Agent and Panel lifecycle
separation kept from an earlier candidate direction and the R1
ExecutionContext-primary direction; the Panel versus Context cut agrees
with the prefix-cache context panel-state-outside-the-prefix invariant; the Context versus
History cut restates the wheel-config-and-context-git-model history-versus-active-view slogan and the
context-management `/compact`-changes-the-boundary rule; the Task versus
Agent cut agrees with the execution-supervisor process-job versus agent-task separation and
the R5 single-lifecycle-authority disposition without deciding any
additional owner. The Event object is recorded as a pointer: the event-log
shape belongs to the terminal documentation owner (see the pointers
section), and this draft adopts no event vocabulary. The Artifact object is
recorded with the same restraint: content addressing is carried by the
wheel-config-and-context-git-model candidate design and the storage dispositions, and no hash, path, or
format is adopted here.

## Agent Communication Graph versus Task Dependency Graph

The retained direction keeps the communication topology apart from the
goal-ordering topology: the Agent Communication Graph is the
collaboration and communication topology (uniform Agents with per-task
roles such as leader, worker, and reviewer, never agent classes; the team
may be cyclic), while the Task Dependency Graph is the goal-ordering
topology (which should stay acyclic to avoid deadlocks). A third shape,
the Agent Work Graph, records agent work history as an acyclic DAG
(explore branches fanning out and rejoining through review into
implementation, each node naming parents); it is the history shape, not
the communication shape. Fork spawns
parallel agents inheriting context without re-seeding background; the fork
mechanics stay open with the owning task.

**Critical judgment:** the graph names propose no data structure, API, or
scheduler. The reconciliation with prior art is explicit: the
uniform-Agents-with-dynamic-roles sentence agrees with the fixed-domain
open-role composition rule kept in the wheel-scope-and-framework candidate design (one Agent
primitive, roles as configuration); the cyclic-team shape is a candidate
that must still reconcile with the R1 single-agent execution-ownership rule
(one owner per execution) and the Lua-core-safety-boundary Commander-as-Lua-concept vocabulary
cut (Core knows only generic primitives, organization lives in Lua). The
DAG discipline for task dependencies is retained as a candidate invariant
with a deadlock rationale, consistent with the R5 lifecycle disposition and
the execution-supervisor no-model-polling and subscription directions; no scheduler,
resolver, or cycle-detection contract follows. The Agent Work Graph shape
agrees with the parent-listed multi-agent history kept in the
wheel-config-and-context-git-model candidate design; the
history-versus-communication cut is what keeps a cyclic team compatible
with an acyclic record.

### Seven-graph roster (candidate)

Status: **candidate, non-normative**. The roster fixes names, nodes,
edges, and shape invariants only; it proposes no data structure, API, or
scheduler.

| Graph                     | Nodes                             | Edges                                 | Multi-parent                                      | Cycles                           |
| ------------------------- | --------------------------------- | ------------------------------------- | ------------------------------------------------- | -------------------------------- |
| Agent Communication Graph | agents                            | communication and collaboration links | yes (many peers; no parentage semantics)          | yes (team may be cyclic)         |
| Agent Work Graph          | work-history nodes naming parents | parent links                          | yes (merge nodes name several parents)            | no (acyclic history)             |
| Task Dependency Graph     | tasks and goals                   | depends-on links                      | yes (one goal may depend on several)              | no (acyclic; deadlock rationale) |
| Delegation Graph          | agent sessions in a rooted forest | parent-to-child delegation links      | no (exactly one parent per child)                 | no (acyclic)                     |
| Context Graph             | typed context objects             | content references                    | yes (many contexts share one object by reference) | no (content-addressed DAG)       |
| Evidence Graph            | evidence and provenance records   | attribution links                     | yes (one record may support several claims)       | no (acyclic)                     |
| Projection Graph          | materialized views                | derivation links to source nodes      | yes (one view may derive from several sources)    | no (acyclic)                     |

### Shared graph primitives (candidate)

Status: **candidate, non-normative**. The retained direction keeps a
small shared primitive vocabulary across the seven rostered graphs:
`NodeId`, `EdgeId`, Generation, Revision, ContentHash, and TypedRef, with
operations reachability, cycle_detection, topological_sort, ancestry,
merge_base, and generation fencing. Generation fencing retires a
superseded lineage so a replaced leader or compacted branch cannot keep
acting; the fence rule stays with the owning lifecycle disposition and no
enforcement mechanism is adopted here.

**Critical judgment:** shared primitives yes, one universal `Graph`
struct no. The primitives give every graph the same identity,
addressing, and traversal vocabulary; each domain model stays
independent with its own node, edge, and invariant rules. A single
universal graph type would blur the cyclic-versus-acyclic and
single-parent-versus-multi-parent invariants the roster exists to keep
apart, so no shared struct, registry, or module follows.

## Mailbox IPC and first-class context share

The retained direction treats inter-agent messaging as actor-model mailbox
IPC: a message carries request, thread, task, and content identity plus a
context base and references, so a recipient receives the relevant context
graph rather than a bare sentence. Context sharing becomes a first-class
object through lazy bundles: the summary arrives first, and decisions,
checkpoints, and artifacts expand on demand. The bundle mechanics, field
shapes, and expansion protocol stay open.

**Critical judgment:** the mailbox and bundle names are unreviewed
vocabulary proposing no wire, event, or schema. The reconciliation with
prior art is narrow: the mailbox direction agrees with the execution-supervisor
job-to-mailbox routing and the three-outcome acceptance rule (accepted
into a mailbox, delivered to a live recipient, processed with an
acknowledged result) kept in the execution-supervisor candidate design and in R5; the
context-graph-with-the-message direction agrees with the wheel-config-and-context-git-model
ref-sharing rule (share by reference, not by copy) and the IPC-extension-boundary Capability
API unity objective without adopting any of their sketches. Delivery,
durability, auth, and redaction semantics stay with the RFC, the security
corpus, and the R2 and R5 dispositions; this draft proposes none.

## Merge, Rebase, and Diff semantics

The retained candidate operations apply Git vocabulary to the versionable
context graph only: fork and branch for parallel hypotheses, checkpoint as
commit, merge with explicit conflicts, cherry-pick for findings, rebase
with validation, diff for inspectability, stash, tag, reflog, and GC from
live roots. The non-rewriting rule is load-bearing: squash and checkpoint
compression change the active view while keeping provenance and staying
expandable; the immutable event log is never rewritten. Merges split into
three typed kinds (Knowledge, Task, and Workspace), and context diff
compares decisions, artifacts, files, facts, questions, and task state for
the dashboard.

**Critical judgment:** every operation name is vocabulary proposing no
command, API, or storage format; the wheel-config-and-context-git-model candidate design already carries the
same Git-inspired model with the same restraint, and this draft defers to
it rather than restating it. The value this record adds is the three-way
merge-kind split and the six-way diff inventory, both recorded as candidate
input: the kind split must still reconcile with the R5 lifecycle authority
(Task merges change owned state and need an owner, not just a merge
algorithm) and with the R3 consent and retention rules (a Knowledge merge
must not smuggle expired or unconsented material back into the active
view). The Rebase value is the validate-before-replay direction already
kept from the wheel-config-and-context-git-model direction; the Diff value is the inspectability rule already kept from the
wheel-config-and-context-git-model direction, extended here to the dashboard surface, which stays terminal-owned
(see the pointers section).

## Context GC versus structural compaction

The retained distinction separates two operations that must not be
confused: Context GC reclaims versioned context objects from live roots
with a grace policy, while structural compaction (the `/compact` family)
changes the active view boundary and records compaction metadata without
deleting retained history. Hot, Warm, and Cold lifetimes govern what the
model sees; persistent history follows retention and consent policy, and
the two diverge by design. Recovery or re-expansion requires the original
authorized records still to exist; retention expiry and user deletion
remain effective.

**Critical judgment:** the lifetime labels are vocabulary proposing no
policy, threshold, or scheduler. The reconciliation with prior art is
narrow: the GC direction agrees with the wheel-config-and-context-git-model rooted-collection rule kept
in the wheel-config-and-context-git-model candidate design; the compaction direction agrees with the
context-management `/compact`-changes-the-boundary rule and the prefix-cache context
structural-compaction invariant; the Hot, Warm, and Cold stratification
agrees with the quality-and-context-compiler Cold, Warm, and Hot worlds kept in the quality-and-context-compiler
companion. This draft adds no lifetime value, grace period, trigger, or
backend, and re-decides none of the open retention questions (which stay
with R3 and the AIQ register).

## Task-as-Issue and reason-as-commit-message

The retained candidate direction models a Task as an Issue-like durable
object with status, owner, collaborators, dependencies, context,
artifacts, progress, and blockers, claimable by any replacement agent so
that work survives agent turnover. The dashboard direction (ask, inspect,
pause, cancel, fork, message, handoff, diff, merge, with no subagent type
exposed) is recorded as terminal-owned surface vocabulary, not as an
accepted view: the operation names propose no command or wire. The
per-call reason is retained as durable rationale in the shape of a commit
message (what the action exists to verify, the expected outcome, and
links), while internal thinking stays ephemeral and out of long-term
history.

**Critical judgment:** the Task-field list and the dashboard-operation
list are illustrations proposing no schema, command, or view. The
reconciliation with prior art is explicit: the Task-as-Issue direction
agrees with the execution-supervisor Job-as-wrapper principle and the R5 single-authority
disposition (claimable-by-replacement needs the R5 ownership split,
fencing, and handoff contract, which this draft does not restate); the
reason-as-commit-message direction tightens the execution-supervisor tool-run record
(input, reason, status, duration, summary plus blob references) into a
rationale-first convention without adopting any field or format. The R5
independent-review criteria and critical-message acknowledgement rules
override any handoff or claim sketch below.

## Core principle

The retained candidate principle has four clauses: history is immutable
(the event log records facts and is never rewritten); context is
programmable (the model prompt is a compiled, versioned, budget-checked
materialized view over the fact graph); panels are workspaces (execution
space with identity and lifecycle, distinct from both the actor and the
view); agents are actors (mobile behavior units collaborating over
mailboxes with dynamic per-task roles). The Batch plus DAG multi-tool
shape, the output pipeline (raw output to blob store to structured parser
to result summary to context compiler), and the running-task status
discipline (status, elapsed time, and parsed progress with full logs on
demand) are recorded as compatible context for the compiler and tool
dispositions, not as adopted contracts.

**Critical judgment:** the principle is a slogan proposing no
architecture, packaging, or team split. Its reconciliation with prior art
is cumulative: immutability restates the wheel-config-and-context-git-model and R6 append-ordered journal
rules; programmability restates the quality-and-context-compiler compiler-as-view direction and
the prefix-cache context stable-first layering; panels-as-workspaces restates the panel-workspace
Panel-as-host boundary with the R1 projection-only rule; agents-as-actors
restates the execution-supervisor and Lua-core-safety-boundary placement (mechanism in the runtime, organization
in Lua) with the RFC as the only accepted vocabulary. The direction's
headless-panel framing is **reconciled** to the model kept in
[Agent Coordination Architecture](../agent/agent-coordination.md): `Agent !=
Panel`, `ExecutionContext != Panel`, a Panel projects or interacts with an
`ExecutionContext`, and headed versus headless is a presentation property,
never authority or persistence. That an Agent defaults to creating a
headless Panel is **Wheel policy**, not a Core invariant, and no mechanism
requires an Agent to exist inside a Panel of any kind. The terminal-owned
half stays a pointer (see below): headed panels stay human-owned and agent
touch means forking an execution snapshot, never typing into the user's
panel.

## Owner-pending pointers

The rows below route conclusions this candidate design does not cover. They are
pointers with inline summaries, not links and not decisions.

| Topic                                                                                                               | Owning destination                                                               |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Headed versus headless panel ownership; shared-panel lease and capability gating; detached-panel history            | Terminal documentation owner; owner approval pending                             |
| Fork-an-execution-snapshot rule for touching user work (cwd, worktree, environment, commands, outputs)              | Terminal documentation owner; owner approval pending                             |
| Immutable event-log vocabulary and shape (task, agent, tool, artifact, decision, share, message, checkpoint events) | Terminal documentation owner; owner approval pending; event names stay RFC-owned |
| Tool-call detachment from terminal input; Wheel tool runtime under policy, capability, and resource control         | Terminal and runtime owners jointly; owner approval pending                      |
| Batch plus DAG multi-tool shape (sequence, parallel, dependency, conditional, retry, timeout, cancel)               | Tool and runtime owners; mechanics, fields, and policies stay open               |
| Running-task status discipline; UI collapse decoupled from context materialization                                  | Terminal documentation owner (dashboard and views)                               |
| Output pipeline stage placement (blob store, structured parser, result summary)                                     | Compiler and storage owners; stage contracts stay open                           |
| Hybrid storage layout (SQLite index plus content-addressed object store; JSON and JSONL for interchange)            | Storage and terminal owners; schema, paths, and formats stay open                |
| Dashboard mechanics (company-console view; ask, inspect, pause, cancel, fork, message, handoff, diff)               | Terminal documentation owner; operation names are vocabulary only                |
| Headless-only Agent wording in the terminal-side event-sourced panel candidate                                      | Terminal documentation owner; owner approval pending; companion fix owed         |

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered models are
candidate inputs only; the six-object vocabulary, the event names, the
mailbox and bundle shapes, the manifest shape, the Git-operation mapping,
the storage split, and the primitive spellings proposed in the direction are
**not** accepted by this candidate design and must not be read as product,
crate, package, protocol, file-schema, command, or release decisions.
Context assembly, budget, retention, and compaction questions stay with
[Context Management Architecture](../context/context-management.md),
[Context retention R3](../architecture/context-retention-r3.md), and the quality-and-context-compiler
companion; execution and panel-lifetime questions stay with
[Execution ownership R1](../architecture/execution-ownership-r1.md),
[Panel environment awareness](../interfaces/panel-environment-awareness.md), and the
execution-supervisor candidate design; tool shape and transport placement stay with
[Command and Tool Architecture](../architecture/command-tool-architecture.md) and
[Tool transport R2](../architecture/tool-transport-r2.md); provider questions stay with
[Provider plugin boundary](../providers/provider-plugin-boundary.md); coordination,
supervision, and task questions stay with
[Agent Coordination Architecture](../agent/agent-coordination.md) and
[Task lifecycle R5](../architecture/task-lifecycle-r5.md); storage and export questions
stay with the wheel-config-and-context-git-model candidate design and the storage dispositions; each is
referenced, never duplicated or modified.

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) defines the only
accepted IPC wire, scope, and Agent vocabulary. Every sketch name in the
candidate direction (object names, event names, mailbox and bundle fields, manifest
fields, operation spellings, primitive spellings) is a discussion sketch:
this draft records it as input and proposes no file schema, API, command,
tool, event, or wire format. Where the direction's sketches overlap RFC-owned
ground (Agent lifecycle, Agent events, Agent semantics, scopes), the RFC
wins without further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed
redaction, consented recording, secret minimization) override every
discussion example throughout this document. The collaboration and merge sketches are
conceptual vocabulary, not an adopted authorization or distribution
contract. This draft creates or closes no AIQ or OQ identifier; open
questions stay with
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the design falsifiable before any agent
workspace proposal constrains `bitty-ai`.

| Campaign            | Required observation                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Object split        | Six named objects appear in a reviewable design with no conflation (an agent relocates panels, a panel sits agentless, a view recompiles without touching history, a task survives agent turnover), in reviewable tests. |
| Graph split         | A cyclic agent team completes a scoped task while its task dependencies stay acyclic with no deadlock, and a role change needs no agent-class change, in reviewable tests.                                               |
| Mailbox and share   | A recipient completes a follow-up from a mailbox message plus its context bundle alone, with lazy expansion covering decisions, checkpoints, and artifacts, in reviewable tests.                                         |
| Typed merge         | Knowledge, Task, and Workspace merges resolve the same conflict differently with explicit conflicts and no silent concatenation, in reviewable tests.                                                                    |
| Diff                | A context diff across checkpoints names exactly the changed decisions, artifacts, files, facts, questions, and task state with no silent omission, in reviewable tests.                                                  |
| GC discipline       | A rooted collection reclaims only unreachable context with a grace period while a compacted episode stays restorable from history, in reviewable tests.                                                                  |
| Task durability     | A replacement agent claims an Issue-like task and completes it from the recorded state with no private handoff, in reviewable tests.                                                                                     |
| Reason durability   | A later reviewer reconstructs why a tool ran from its recorded reason alone (verified outcome, expected result, links) with no thinking-dump access, in reviewable tests.                                                |
| Principle adherence | History shows no rewrite across checkpoint, squash, and merge operations while the active view recompiles under budget, in reviewable tests.                                                                             |
| Boundary integrity  | A panel, storage, dashboard, or tool-runtime change ships with no `bitty-ai` contract change, and an AI-side change ships with no terminal contract change, in reviewable tests.                                         |

Promotion needs independent AI architecture, context-management,
coordination, terminal-owner, docs-curator, and security review. Route
object vocabulary, graph enforcement, mailbox and bundle contracts, merge
kinds and rules, diff shape, GC policy, task schema, reason fields,
primitive spellings, pipeline stage contracts, and storage layout to scoped
owner tasks. This draft changes no normative contract and authorizes no
product code.
