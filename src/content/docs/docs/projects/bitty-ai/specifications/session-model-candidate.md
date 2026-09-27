---
title: Session model (candidate)
description: Candidate session identity and directory relations, graph-encoded session storage, interruption recovery, and the session and agent control surface
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 68
---

# Session model (candidate)

> Status: **draft**. This document records a candidate direction as a
> reviewable proposal. It accepts nothing, describes no shipped behavior, and
> authorizes no compatibility promise. Mechanisms marked beyond-v0.1 are
> proposals for later increments, not commitments.

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification,
accepted decision, dependency selection, release commitment, or
implementation claim. It records the candidate session model for the Wheel
Agent Harness: what a session is when context is a compiled projection over
stored facts, how sessions relate to directories and trust decisions, how
session and agent state is stored when the underlying topology is a graph,
how interrupted agent work is recovered without requiring manual user
intervention, and which control surface operates a session while its agents
keep running.

The model **extends, without restating**, existing candidate records:

- [Wheel context storage and reasoning management (candidate)](wheel-context-storage-and-reasoning-candidate.md)
  carries the stored-history-versus-compiled-context inequality, the
  `ContextCommit` direction, the conversation-as-DAG direction, and the
  Reasoning Record split. This page records the session identity that those
  directions presuppose.
- [Wheel configuration and context git model (candidate)](wheel-config-and-context-git-model-candidate.md)
  carries checkpoint-as-commit, branch, merge, ref sharing, worktree binding,
  reflog, GC, and the store-cache separation. This page reads those mechanisms
  as session-level operations and adds the directory-relation and trust
  facets.
- [Event-sourced agent workspace (candidate)](event-sourced-agent-workspace-candidate.md)
  carries the six-object split, the agent-versus-task graph separation, the
  mailbox, and the task-as-issue direction. This page consumes them for
  interruption recovery.
- [Execution supervisor (candidate)](execution-supervisor-candidate.md)
  carries supervision, job lifetime scopes, the outcome split, and the
  no-default-retry rule. This page consumes them at the session boundary.
- [Wheel Context Runtime (candidate)](../context/wheel-context-runtime-candidate.md)
  carries the runtime lifecycle, evidence views, temperature, and refinement.
  This page supplies the session container that runtime operates within.
- [Persistence and evidence architecture](../persistence/persistence-evidence.md)
  and [Persistence profile R6](../architecture/persistence-profile-r6.md) own
  the journal, replay contract, and the SQLite-candidate posture that the
  storage direction here defers to.

The surrounding context documents stay in force as references, never as
duplicated content: [Context Management Architecture](../context/context-management.md)
owns the session journal and the session-versus-context invariant;
[Agent Coordination Architecture](../agent/agent-coordination.md) owns agent
identity, coordination, and panel reconciliation;
[Execution ownership R1](../architecture/execution-ownership-r1.md) owns
single-agent execution ownership; [Storage memory and export design](../persistence/storage-memory-export-design.md)
owns the per-session shard direction and export scopes; and
[Command and Tool Architecture](../architecture/command-tool-architecture.md)
owns the command registry and Core-versus-Lua boundary.

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) defines the only accepted
IPC wire, scope, and Agent vocabulary; it is unaffected by this draft. Nothing
here is promoted to accepted status, and no implementation is described as
shipped.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Founding inequalities

The retained inequalities extend the existing four (`Agent` is not `Panel`,
`Panel` is not `Context`, `Context` is not `History`, `Task` is not `Agent`)
with the session cuts this model needs:

- **A Session is not a Context.** Context is a per-turn compiled projection;
  a session is the durable container that projection reads. The existing
  `Session is fact, Context is projection` invariant is preserved in meaning:
  the session names the fact scope, while the compiled context never becomes
  the source of record.
- **A Session is not a Panel.** A panel is a presentation projection of
  runtime state; a session can be observed by zero, one, or several panels
  and survives any of them. The `Panel`-becomes-`Session`-identity reading is
  rejected; the panels-as-views direction holds.
- **A Session is not an Agent.** An agent is a thinking actor with a runtime
  lifecycle; a session outlives any single agent and may host several across
  its lifetime. Work survives agent turnover through the task and session
  records, not through agent identity.
- **A Session is not a directory.** A directory root is one way to find a
  session, never what a session is. The directory relations below make the
  multiplicity explicit.
- **A Session is not a snapshot.** Snapshot vocabulary stays with
  checkpoint-as-commit and compaction-as-snapshot; a session is the named
  reachable scope over a checkpoint graph, not a frozen copy of one moment.

**Critical judgment:** the inequality list is vocabulary proposing no type,
schema, or module. The reconciliation with prior art is explicit: the
Session-versus-Context cut restates the existing
[context-management](../context/context-management.md) invariant in
container terms; the Session-versus-Panel cut agrees with the
panels-as-views direction in
[AI Architecture](../architecture/ai-architecture.md); the
Session-versus-Agent cut agrees with the task-survives-agent-turnover
direction in [Event-sourced agent workspace (candidate)](event-sourced-agent-workspace-candidate.md);
the Session-versus-directory cut agrees with the project-identity direction
in [Storage memory and export design](../persistence/storage-memory-export-design.md).
No inequality here changes the accepted RFC vocabulary.

## Session, Context, Agent, and Panel

The retained relation joins four objects that existing candidates already
separate pairwise:

```text
Session                      durable container: a named, reachable scope
  ├── Context                per-turn compiled projection (never the record)
  ├── Agent(s)               thinking actors, hosted across the session lifetime
  └── Panel(s)               presentation projections (zero, one, or several)
```

The owner-directed statement that an agent works inside a headless panel is
recorded with its layer resolved, because the corpus distinguishes two
readings:

- **Core ownership:** the [execution-ownership R1](../architecture/execution-ownership-r1.md)
  disposition selects `ExecutionContext` as primary with an optional Panel
  projection and rejects the mandatory `agent.exec -> Headless Panel -> PTY`
  path as an ownership model: a headless panel must not be required per
  agent, per execution, or as the authority for process ownership, cleanup,
  or consent. Headed and headless describe presentation only.
- **Wheel policy:** that an agent _defaults to_ creating a headless panel as
  its working container is a Harness-level convention, not a Core invariant.
  The event-sourced candidate records exactly this split, and the
  panels-as-views direction ("an agent can have UI, no UI, run headless, or
  be watched by several panels without a panel becoming the session
  identity") supports the container reading at the policy layer.

The candidate therefore records the owner direction as **Wheel policy over
the R1 ownership model**: agents normally work through headless panels that
the Harness creates for them, those panels are conveniences of the Harness
layer, and no Core contract requires a panel for an agent to exist, execute,
or persist. A session's identity never derives from panel occupancy.

**Critical judgment:** this section reconciles an owner direction with an
existing disposition; it adopts no ownership change, no panel contract, and
no lifecycle state machine. Any proposal that would make panel occupancy
authoritative must reopen R1 through its owner, not through this draft.

## Session as a named reachable scope

The retained reading treats a session as a **named reachable subgraph** over
the checkpoint DAG: a ref-like name (illustrative-only) resolves to a
checkpoint, and the reachable object set from that checkpoint is the session
scope. The operations below are graph operations the Git-model candidate
already defines; this page assigns them session semantics:

| Operation (illustrative naming) | Session semantics                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| Fork                            | Start an alternative line of work from a checkpoint; both lines stay reachable.           |
| Branch per hypothesis           | Cheap exploration sharing the parent's objects, no transcript copying.                    |
| Merge / typed merge             | Synthesize parallel lines; contradictions surface as structured conflicts, not consensus. |
| Cherry-pick                     | Carry one finding plus its evidence into another session scope.                           |
| Archive                         | Mark a session scope inactive while its objects stay reachable until retention ends.      |
| GC                              | Collect objects unreachable from **GC roots**: active session refs and open task refs.    |

Two consequences are load-bearing:

- **GC roots become definable.** The Git-model candidate directs collection
  "from live roots" without naming them; this model names session refs plus
  task refs as the root set, so a session that is still resumable keeps its
  scope reachable and an abandoned experiment collects after the grace
  period.
- **Resumability is reachability.** Resuming a session is resolving its ref
  and recompiling context from the reachable set — not replaying a
  transcript, and not restoring a process. What a resume authorizes is a
  read of retained records plus a new compilation; it is never permission to
  re-execute effects, which stays with the R6 replay contract.

**Critical judgment:** the ref spellings, root set, and operation names are
candidate vocabulary proposing no namespace, schema, or command. The stable
claims are the named-scope reading, the root definition, and the
read-never-re-execute bound. Lifecycle authority for sessions, agents, and
panels stays with the RFC and the R1/R5 dispositions.

## Compilation and runtime faces

A session has three faces in the corpus vocabulary, and the candidate model
keeps them explicitly layered rather than conflated:

- **Storage face: the named reachable scope** (previous section). Refs,
  checkpoints, and reachability are the durable side.
- **Compilation face: the generation boundary.** The candidate frozen-session
  direction already proposes that a session records an immutable snapshot
  (model, execution profile, instruction sources and hashes, approved memory,
  skill metadata, workspace context) at creation, that a generation consumes
  that snapshot rather than silently rebuilding its system prefix after every
  write, and that an instruction-epoch identifier records which instruction
  snapshot each turn saw. The candidate reading adds only the session-level
  consequence: the generation boundary is where the stable prefix is pinned,
  so changes to memory, configuration, or instructions take effect at a later
  generation by default, and an explicit invalidation begins a new generation
  without mutating an already-started turn.
- **Runtime face: the bounded conversation.** The accepted IPC vocabulary's
  `AgentSession` owns one agent identity, a tool registry, and a bounded
  history (bounded by count and bytes). The candidate reading places that
  bounded history as the _hot_ working record of one runtime conversation,
  with the durable session scope as the backstop: when the bounded history
  turns over, the records remain resolvable through the storage face rather
  than being lost, subject to retention.

The cache boundary this implies is already an adopted-draft disposition, not
an open question: the provider-scoped prefix-cache keying with its
session/turn/round scope variants is closed as an adopted draft, and its
load-bearing property — a session-scoped key never equals a turn-scoped key
over the same bytes — is exactly the generation boundary this model pins.
Epoch boundaries and stable-prefix ordering stay owned by the prefix-cache
design; prompt layer composition stays owned by the prompt-layering design;
this page records the session-level reading and reopens neither.

**Critical judgment:** the frozen-session snapshot, epoch identifier, and
generation rules are candidate, non-normative vocabulary; the runtime
`AgentSession` bounds are accepted and restated, not extended. What stays
open is the exact snapshot representation, where versioning lives, and the
generation lifecycle details, which remain with their existing owners.

## Directory relations and trust

The retained direction separates three facts that existing designs keep
distinct but do not yet connect:

1. **Many sessions per root.** A directory root is a discovery context, not
   a session key: one project directory accumulates many session records over
   time, and a session list is scoped by root for presentation, never by
   identity.
2. **A session is not bound to one root.** A workspace may introduce history
   from another root by reference (the ref-sharing and cherry-pick mechanisms
   above), so work that began elsewhere joins the current session scope
   without copying its records. Project identity, not filesystem path, is
   the durable anchor, consistent with the
   [storage design](../persistence/storage-memory-export-design.md) project-identity
   direction.
3. **Trust is execution permission; resume is history access.** The accepted
   configuration contract already binds project trust to canonical path plus
   content hash, with any content change invalidating prior approval. This
   model adds only the separation: trusting a root authorizes execution
   there; resuming a session authorizes reading its retained records. Either
   can exist without the other — a user may resume history in a root they do
   not execute in, and may trust a root while starting fresh work in it.

The first-contact flow combines these as a policy (illustrative-only):

```text
open root -> trust decision (accepted mechanics: path + content hash)
          -> if trusted and session refs exist: offer resume
          -> resume reads the retained scope; execution stays separately gated
```

**Critical judgment:** the session-list scoping, cross-root reference
mechanics, and flow sketch are candidate policy proposing no storage field,
command, or prompt wording. Trust mechanics remain the accepted
configuration contract; this page restates none of its obligations and
weakens none of them.

## Storage shape: a relational schema encoding a graph

The retained storage direction reconciles two existing positions that point
in different directions on paper:

- The [git-model candidate](wheel-config-and-context-git-model-candidate.md)
  keeps the object store plus refs as "sufficient expressive machinery for
  much of agent state" and prefers a ref-like namespace over "scattering
  agent state across relational tables over joins".
- The [storage design](../persistence/storage-memory-export-design.md)
  proposes per-session SQLite shards with a catalog control plane and an
  event-oriented model, with SQLite itself a draft candidate under R6 and
  AIQ-51/AIQ-53 open.

The candidate reading that reconciles them: **the relational schema encodes
the graph instead of joining it back together.** Typed nodes (sessions,
checkpoints, messages, tasks, findings, evidences, artifacts) and typed edges
(parent, mentions, derives-from, supersedes, contradicts, supports) live in
few tables; a "tree over joins" objection applies to reconstructing
hierarchies from scattered rows, not to storing edges directly. The physical
substrate stays a draft candidate (SQLite is the R6 draft candidate, with a
local single-process WAL profile as its candidate deployment shape per the
dependency strategy; a single-writer-per-store rule holds), the bytes stay content-addressed outside
the schema, and refs remain named query shortcuts over the same graph.

The derived tier stays rebuildable and out of the backup set: embeddings and
full-text indexes are derived representations over canonical records, off by
default (consistent with the AIQ-53 posture), and invalidate with their
source.

**Critical judgment:** table shapes, edge vocabulary, backend selection, and
sharding mechanics are proposals; R6's representation/projection/index/replay
separation and the no-background-scheduler rule are preserved, not reopened.
The stable claim is the encoding principle (typed nodes plus typed edges,
bytes by content address, derived indexes rebuildable) and its compatibility
with both cited positions.

## Store the graph, project the tree

The retained rule names the topology discipline this model has been implying:

> **Store the graph, project the tree:** the durable record keeps the graph
> (storage, causality, provenance, collaboration); trees, chains, and
> linearizations are projections for presentation, attribution, and
> authority.

Applied to the existing corpus, the rule predicts where each shape belongs:

| Layer                             | Topology                    | Carrier                                   |
| --------------------------------- | --------------------------- | ----------------------------------------- |
| Causality and references          | Graph (acyclic for effects) | Checkpoint parents, typed edges           |
| Collaboration                     | Graph (cycles allowed)      | Agent graph over the mailbox              |
| Task ordering                     | DAG (acyclic for deadlocks) | Task dependency graph                     |
| Attribution and authority lineage | Single-parent chain         | Delegation lineage, budget attribution    |
| Presentation and journals         | Linearized view             | Session list, timeline, reflog-style logs |

Two readings follow for existing vocabulary:

- **A `ContextCommit` tree is a snapshot manifest.** Reading the
  `ContextCommit.tree` as the literal topology of every dimension would
  force conversation, knowledge, and the agent graph into a folder shape
  that at least three candidate records already refuse. The candidate
  reading keeps the tree as a manifest of what the snapshot contains, with
  each dimension's topology carried by parents and typed edges.
- **A linear journal is a view.** The Session Journal's ordered entries
  remain the append-ordered record demanded by R6; the linear numbering is
  its presentation order. Where one turn branches to several agents, entry
  parents carry the real topology and the linear reading is a projection.

**Critical judgment:** the rule is a candidate principle proposing no
schema, API, or migration; the two readings are reconciliation notes that
change no accepted contract. Where a reading conflicts with an owner
decision, the owner decision wins.

## Agent supervision and interruption recovery

The retained direction addresses what happens when an agent stops making
progress — provider rate limiting, network partition, process death, or a
wedged turn — without requiring the user to intervene manually. The pieces
already exist as separate candidates; this section composes them into a
recovery path:

1. **Supervision is independent of the agent.** The execution supervisor
   continues while its caller is disconnected, and job completion lands in
   the agent's mailbox for recovery — the acknowledged point of an
   independent supervisor. Job lifetime scopes (agent, task, workspace,
   detached) declare what survives agent death.
2. **Work is claimable.** Task-as-issue makes a task a durable object that
   any replacement agent can claim, so work survives agent turnover with no
   private handoff.
3. **Recovery is a role, not a special agent type.** The candidate policy
   records that a supervising, peer, or delegated recovery agent may inspect
   an interrupted run's recorded state (task, checkpoints, outcomes,
   mailbox) and restart or resume it under the same rules as any other
   claimant. No new agent class is required; organization lives in Lua, per
   the Core-versus-Lua boundary.
4. **The safety rules gate every restart.** No-default retry: automatic
   retry needs an explicit idempotency declaration or explicit approval, and
   `Unknown` outcomes require inspection before retry. Writer fencing: a
   takeover or restart must invalidate stale writers before new input, and
   generation-bound state must not resurrect. Explicit handback: automation
   resumes only through a recorded handoff, never through silent
   resumption.
5. **Stopping is bounded.** Interrupting all agents is a session-level
   control action (below), not a signal to an individual process; it
   resolves each owned job through its lifetime scope and records outcomes.

What the candidate explicitly does **not** claim: no watchdog runs by
default, no background scheduler is adopted (R6), no supervisor infers
network failure it was not told about, and no recovery action executes
effects a user has not authorized under the rules above.

**Critical judgment:** the composition is candidate policy proposing no
scheduler, daemon, or mechanism; every cited primitive stays owned by its
existing record. The user-intervention statement is recorded as a goal —
recovery should not _require_ manual insertion — not as an implemented
behavior.

## Control surface

The retained control direction separates operations that other harnesses
often conflate:

| Operation (illustrative-only)       | Semantics                                                                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/session` (list, switch, new)      | Session switching: the previous session's agents **keep running**; switching is a view change.                                                                       |
| `/resume`                           | Deliberately undesigned in this candidate; if a distinct meaning is chosen later, it resumes a stored session scope as history access, never as effect re-execution. |
| Agent control (pause, resume, stop) | Per-agent or session-wide actions over the supervisor primitives; owned by the control surface, not by session switching.                                            |
| `/fork`                             | Session-scope fork (graph operation above), distinct from agent spawning.                                                                                            |

Two placement rules follow the corpus:

- **CLI-first, panels as projections.** Every control operation is first a
  CLI or IPC operation over the same endpoints; interactive panels and the
  native-UI workspace are projections of those operations, not their only
  entry. This matches the programmable-workspace direction and the
  panels-as-views direction, and keeps the control surface scriptable by
  agents and humans alike.
- **Switching never implies stopping.** Because agents run under the
  supervisor and panels are projections, closing a view, switching a
  session, or detaching a panel changes presentation only. Stopping work is
  always an explicit stop action resolved through lifetime scopes.

**Critical judgment:** the command spellings, operation list, and
CLI-versus-panel placement are candidate vocabulary proposing no command,
registry entry, or wire method. The command registry's Core-versus-Lua
placement stays with [Command and Tool Architecture](../architecture/command-tool-architecture.md);
the accepted IPC contract is unaffected.

## Security review

This candidate must not contradict P0-AC-026, PP-2 (typed redaction), or
PP-4 (no on-disk persistence without consent):

- Session records, refs, directory relations, and cross-root introductions
  are durable elements under PP-4: consent authorizes recording only with
  mandatory typed redaction, user-only storage, and export preview. An
  in-memory session scope does not authorize durable recording.
- Trust decisions remain the accepted configuration contract's mechanics
  (canonical path plus content hash, deny by default when origin is not
  positively local); this page adds no prompt, database, or expiry rule and
  weakens none of the accepted obligations.
- Recovery actions are effectful paths: they pass the same authorization,
  consent, idempotency, and writer-fencing checks as any other dispatch,
  and no recovery role gains authority its caller lacks.
- GC, archive, and collection honor deletion and expiry; reachability never
  overrides R3 deletion propagation, and unreachable is not deleted until
  retention ends.

No clause here weakens the normative security corpus linked from
[AI Architecture](../architecture/ai-architecture.md).

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered
models are candidate inputs only; the session vocabulary, ref spellings,
root set, table-shape, edge set, recovery roles, and operation names
proposed here are **not** accepted by this candidate design and must not be
read as product, crate, package, protocol, file-schema, command, or release
decisions.

Context assembly, ordering, budget, retention, and compaction questions stay
with [Context Management Architecture](../context/context-management.md),
[Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md),
[Prompt Layering Design](../context/prompt-layering-design.md),
[Context retention R3](../architecture/context-retention-r3.md), and the
[Wheel Context Runtime (candidate)](../context/wheel-context-runtime-candidate.md);
storage, export, and backend selection stay with
[Persistence profile R6](../architecture/persistence-profile-r6.md) and
[Storage memory and export design](../persistence/storage-memory-export-design.md);
execution ownership stays with [Execution ownership R1](../architecture/execution-ownership-r1.md);
coordination, supervision, and task lifecycle stay with
[Agent Coordination Architecture](../agent/agent-coordination.md) and
[Task lifecycle R5](../architecture/task-lifecycle-r5.md); command placement
stays with [Command and Tool Architecture](../architecture/command-tool-architecture.md);
trust mechanics stay with the accepted configuration contract in the
terminal documentation corpus. Each is referenced, never duplicated or
modified. The `SessionId` type question stays with its
[existing tracker](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/workspace-panel-invariants.md)
in the terminal documentation corpus; this draft introduces no identifier.
Related open questions stay open in the shared register: the session
and directory identity ontology ([OQ-084](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)),
panel and session lifecycle coupling ([OQ-058](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)),
the CarryCtx boundary ([OQ-060](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)),
and the `.wheel/` directory and trust contract ([OQ-068](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md));
this draft closes none.

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) defines the only accepted
IPC wire, scope, and Agent vocabulary. Where the sketches here overlap
RFC-owned ground (Agent lifecycle, Agent events, Agent semantics, scopes),
the RFC wins without further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed
redaction, consented recording, secret minimization) override every
discussion example throughout this document. Session records, refs, and
recovery actions are untrusted data paths: reading, forwarding, or claiming
them grants no authority; every resolution re-passes authorization,
consent, redaction, and budget checks. This draft creates or closes no AIQ
or OQ identifier; open questions stay with
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the session model falsifiable before it
constrains `bitty-ai`.

| Campaign            | Required observation                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multiplicity        | One root accumulates several sessions; listing scopes by root never merges identities, in reviewable tests.                                                                                             |
| Cross-root          | A session introduces history from another root by reference and completes a follow-up with no copied records, in reviewable tests.                                                                      |
| Trust separation    | Resume succeeds in a root whose execution stays untrusted, and trust grants execution with no session access, in reviewable tests.                                                                      |
| Graph storage       | Typed edges answer provenance and conflict queries directly; a lost derived index rebuilds from canonical records, in reviewable fixtures.                                                              |
| Root set            | GC keeps resumable sessions and open task refs reachable, and collects abandoned experiments after the grace period, in reviewable storage fixtures.                                                    |
| Journal projection  | A branched turn's parents reconstruct its topology while the linear reading stays a presentation projection, in reviewable tests.                                                                       |
| Recovery claim      | A replacement agent claims an interrupted task, passes the retry and fencing gates, and completes it from recorded state with no manual step, in reviewable tests.                                      |
| No-default retry    | A recovery restart refuses without idempotency or explicit approval, and `Unknown` outcomes force inspection first, in reviewable tests.                                                                |
| Switch versus stop  | Session switching leaves running agents running, and stopping requires an explicit stop action resolved through lifetime scopes, in reviewable tests.                                                   |
| Generation boundary | A memory or instruction change lands at a later generation without mutating an already-started turn, and a bounded runtime history resolves its turnover through the stored scope, in reviewable tests. |
| CLI-first           | Every control operation completes headless with no panel open, and the panel surface reproduces it as a projection, in reviewable tests.                                                                |

Promotion needs independent AI architecture, context-management,
coordination, persistence, terminal-owner, docs-curator, and security
review. Route the session vocabulary, ref and root set, table and edge
shapes, recovery roles, and operation names to scoped owner tasks. This
draft changes no normative contract and authorizes no product code.

## References

- [Wheel context storage and reasoning management (candidate)](wheel-context-storage-and-reasoning-candidate.md)
  (Draft): stored history versus compiled context, `ContextCommit`, conversation DAG; extended, never duplicated.
- [Wheel configuration and context git model (candidate)](wheel-config-and-context-git-model-candidate.md)
  (Draft): checkpoint, branch, merge, refs, worktree, reflog, GC, store-cache split; consumed as session operations.
- [Event-sourced agent workspace (candidate)](event-sourced-agent-workspace-candidate.md)
  (Draft): six objects, graphs, mailbox, task-as-issue; consumed for recovery.
- [Execution supervisor (candidate)](execution-supervisor-candidate.md)
  (Draft): supervision, lifetime scopes, outcome split, no-default retry; consumed at the session boundary.
- [Wheel Context Runtime (Candidate)](../context/wheel-context-runtime-candidate.md)
  (Draft): runtime lifecycle, evidence, temperature, refinement; extended with the session container.
- [Context Management Architecture](../context/context-management.md)
  (Draft): session journal, projection, compression pipeline.
- [Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md)
  (Draft): stable-prefix layering, serialization, epochs, and provider cache-key scope.
- [Prompt Layering Design](../context/prompt-layering-design.md)
  (Draft): prompt-text layer contract and stable-before-dynamic assembly.
- [Agent Coordination Architecture](../agent/agent-coordination.md)
  (Draft): coordination, leases, panel reconciliation.
- [Execution ownership R1](../architecture/execution-ownership-r1.md)
  (Draft): `ExecutionContext` primary, optional Panel projection.
- [Task lifecycle R5](../architecture/task-lifecycle-r5.md)
  (Draft): lifecycle authority, handoff, critical messages.
- [Persistence profile R6](../architecture/persistence-profile-r6.md)
  (Draft): backend profile, replay contract, no background scheduler.
- [Storage memory and export design](../persistence/storage-memory-export-design.md)
  (Draft): per-session shards, catalog, project identity, export scopes.
- [Command and Tool Architecture](../architecture/command-tool-architecture.md)
  (Draft): command registry, Core-versus-Lua boundary.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md)
  (Draft): existing register entries reused; no new identifier proposed.
- [IPC and Agent RFC](ipc-agent-rfc.md) (Accepted): the only accepted IPC wire, scope, and Agent vocabulary.
