---
title: Execution supervisor (candidate)
description: Candidate execution supervisor, job service object model, ownership, lifetime, timeout, and outcome boundary
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 55
---

# Execution supervisor (candidate)

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification, accepted
decision, dependency selection, release commitment, or implementation claim.
It records the candidate direction for an execution supervisor and job service:
the four-object model (Task, Execution/Job, Agent, Panel), Job independence from
Panel with mailbox routing, Owner plus Subscriber instead of single ownership,
agent-killed Job disposition through a spawn-time Lifetime, the pre-exit
quiescence check as harness mechanism rather than prompt discipline, the
long-task timeout model with the ExecutionOutcome versus TaskOutcome split, the
Job kind taxonomy, the non-interactive stdin default, supervisor-held output,
and the closing boundary table.

The recommendation is to treat every model below as a candidate input to the
draft [AI Architecture](../architecture/ai-architecture.md) and its related draft
dispositions, never as an override of the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) or the normative security corpus.
In particular, the `exec` and `job_*` tool sketches, the `execution.*` IPC
sketches, the `ExecutionResult` and `JobResult` struct sketches, the
`Lifetime`, `JobKind`, outcome, and cancel enums, the three-phase rollout,
and the proposed `execution-supervisor.md` or `background-execution-r7.md`
document are **not** accepted by this candidate design. Nothing here is promoted
to accepted status, and no implementation is described as shipped.

The direction's strongest ideas are the four-object separation with Panel as
projection only (which agrees with the R1 ExecutionContext-primary
direction), the Job-as-wrapper principle with the explicit negative (an
Execution is not inherently an AI Job), the mechanism-versus-semantics split
with two distinct generations (assignment generation on the `bitty-ai` side,
execution generation on the `bitty` side), the ExecutionOutcome versus
TaskOutcome split (a timeout is a fact below and a policy question above),
the no-default-retry rule for unknown or effectful outcomes (consistent with
R1/R5/R6), and the pre-exit quiescence gate as a harness invariant instead of
a prompt reminder. Its weakest claims are the concrete tool and wire sketches
(`exec`, `job_spawn`, `execution.spawn`, and similar), which are unreviewed
interface proposals with no ownership, versioning, or compatibility evidence;
the three-phase rollout, which is a staging opinion with no owner or
milestone evidence; cross-platform OOM attribution, which the direction itself
admits needs per-platform backends that do not exist yet; and the control
console mockup, which is a view sketch without a data-contract or
authorization analysis. Those are corrected below.

This synthesis references, without duplicating or modifying, the draft
[AI Architecture](../architecture/ai-architecture.md) (candidate inputs only),
[Execution ownership R1](../architecture/execution-ownership-r1.md),
[Tool transport R2](../architecture/tool-transport-r2.md),
[Panel environment awareness](../interfaces/panel-environment-awareness.md), and
[Provider plugin boundary](../providers/provider-plugin-boundary.md) (references only).
The accepted [IPC and Agent RFC](ipc-agent-rfc.md) is unaffected by this
draft. The IPC-extension-boundary Capability Layer versus execution-supervisor capability-enforcement split stays
consistent with the unmerged-candidates comparison added under CTX-0047 in
the AI Architecture; this draft references that comparison and re-decides
nothing. This document creates no AIQ or OQ identifier and closes none.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Core thesis: a supervisor, not a stronger spawn

The retained thesis is that Bitty should design an Execution Supervisor and
Job Service that is independent of Agent, Panel, and Conversation, rather
than a stronger `pty_spawn`. Spawning is one execution backend; the
first-class citizens are Job and Execution. The direction positions this as the
missing layer under the R1 `Agent -> ExecutionContext <- Panel` direction
and the agent-coordination lifetime separation (mailbox, lease, generation
fencing, handoff, critical message): what the execution-supervisor direction adds is how long-lived
processes and jobs are managed under the ExecutionContext.

**Critical judgment:** the thesis is retained as a candidate objective; the
opening harness anecdote is motivation, not evidence. The stable claim is
only the layering (supervision as infrastructure shared by agents, panels,
and future multi-agent, team, watcher, server, training, download, LSP,
debugger, dashboard, headless, and remote-execution work), with ownership,
packaging, and schedule entirely open.

## Harness survey as boundary context

The retained grounding points are: pueue's daemon-held tasks that survive
terminal close, with groups, dependencies, pause, resume, restart, wait,
durable logs, environment snapshots, and callbacks; OpenCode's exit
notification as proof that event-driven delivery beats polling loops;
Codex's process protocol (start, read, write, signal, terminate with output,
exited, and closed events) with the warning that model-side polling
regresses into round-trip and token waste; Claude's separation of process
jobs from agent tasks with Monitor-style event delivery; and Cursor's
Agent-versus-Run split with resumable event streams and subscriptions, which
the direction adopts as the target shape (agents do not wait on jobs; agents
subscribe to jobs).

**Critical judgment:** study leads, not findings. The external references
are unverified discussion citations, and the per-harness deficiency claims
are author opinion. The stable claims are the waiting principle (waiting is
the runtime's work, not the model's) and the subscription direction; no
harness is selected as a backend, and pueue in particular is
borrow-design-not-backend per the direction and the inspection above.

## Four-object model

The retained ontology fixes four distinct objects: Task as semantic work
(such as fixing an issue), Execution/Job as a real OS process or process
tree, Agent as the deciding and working logical subject, and Panel as the
human observation and interaction projection. Panels observe jobs; agents own
and subscribe to them; conversations compact and agents relocate without the
job necessarily stopping. The direction claims this matches the existing
identity separation already defined for agents, executions, workspaces,
services, evidence, and panels.

**Critical judgment:** the separation is retained as a candidate objective
consistent with R1; the invariance claims (job continues across panel loss,
agent switch, compaction, and even agent absence) are author proposals
conditioned on the Lifetime policy below, not guarantees. Lifetime scoping
decides each case.

## Job independence from Panel and mailbox routing

The retained rule is that a Job does not belong to a Panel: creation may
record an origin panel ("started here") plus observers for UI purposes, but
completion routes to the Agent mailbox and then to the live Agent session,
never back to the origin panel. An agent that moved panels still receives
its own job completions.

**Critical judgment:** the routing direction is retained as a candidate
objective; the mailbox, session-delivery, and observer-list mechanics are
undecided and stay with the owning tasks. The stable claim is only the
negative (origin panel is not the owner) plus the delivery target (the
agent, not the panel).

## Owner plus Subscriber instead of single ownership

The retained model gives each Job one Owner and any number of Subscribers
(the owning agent, a team lead, a reviewer, the human UI), with observation
rights separated from control rights: visibility into a job never implies
the right to kill it. The direction proposes reusing the existing lease
principle (coexisting read leases, a single fenced interactive writer with
generation-fenced transfer).

**Critical judgment:** the ownership shape is retained as a candidate input;
the permission vocabulary is unreviewed and enforcement placement stays with
the multi-agent security split below (`bitty` enforcement, `bitty-ai`
coordination). No permission is adopted here.

## Agent-killed disposition through Lifetime

The retained direction is that spawn declares the Job's lifetime scope, and
agent death follows the declared policy: Agent-scoped jobs cancel, Task-
scoped jobs continue while the task lives, Workspace-scoped jobs continue
while the workspace lives, and Detached jobs continue under the supervisor
independently. The direction's examples (a test run as Task-scoped, a dev
server as Workspace-scoped, model training as Detached, a one-shot shell
command as Agent-scoped) are illustrations of the policy vocabulary, not
defaults.

**Critical judgment:** the explicit-policy direction is retained as a
candidate; the variant names, the example bindings, and any Detached
durability beyond process life are proposals. Detached jobs that outlive the
application need the persistence and daemon work that the v0.1 boundary
below explicitly defers.

## Pre-exit check as mechanism, not prompt discipline

The retained rule is that an agent preparing to finish must pass a harness
quiescence gate: with no live owned jobs it may finish, and with live jobs
it must explicitly choose wait, detach, handoff, or cancel per job before
finishing normally. Forced stops fall back to the Lifetime policy. The
candidate direction's explicit point is kept: this must be a harness invariant, never a
system-prompt reminder to "remember to check background tasks."

**Critical judgment:** the invariant direction is retained as a candidate
objective consistent with R5 handoff and acknowledgement rules; the gate
mechanics, choice vocabulary, and forced-stop semantics are undecided and
need owning-task design plus security review before any enforcement claim.

## Long-task timeout model and the outcome split

The retained model separates three clocks: a hard timeout, an idle timeout,
and a retention TTL, set per workflow (training with no hard or idle limit
and a multi-day retention, tests with a tens-of-minutes hard limit,
downloads with a long hard limit plus a short idle limit, servers with no
hard limit and a service kind). Deadlines must be held by the Execution
Supervisor so they survive agent disconnection. The load-bearing split is
kept: a timeout is recorded below as `ExecutionOutcome::TimedOut` (a fact),
while what it means above (task failed, blocked, paused, retried, or normal
policy termination) is a `bitty-ai` policy decision, never a folding of
timeout into generic failure.

**Critical judgment:** the clock separation and the outcome split are the
strongest timing claims and are retained as candidate inputs; the limit
values, struct shape, and per-kind bindings are unreviewed sketches. No
default timeout policy is adopted: a uniform background kill rule is
explicitly rejected.

## Job kind taxonomy

The retained direction is that Jobs carry a kind so the runtime holds the
right expectation: long-lived Watch and Service jobs are normal, not stuck.
The examples are illustrations of the vocabulary, not a kind registry.

**Critical judgment:** a candidate heuristic, not a taxonomy decision. Kind
names, semantics, and any scheduling or limit consequences per kind are
open; kinds must not silently widen authority or change enforcement.

## Non-interactive stdin default

The retained rule is that non-interactive Jobs default to no TTY and closed
stdin (pipes for standard output and error), with PTY and writable stdin
only for explicitly interactive Jobs. The direction presents this as both a
hang-avoidance and a safety default.

**Critical judgment:** the default-closed direction is retained as a
candidate consistent with least privilege; the exact spawn-options shape is
undecided. Unexpected prompts in background tasks should surface as failure
or an input-needed event (below), never as a silent permanent hang.

## Supervisor-held output, not context stuffing

The retained model keeps execution output with the supervisor (a bounded
ring buffer plus an optional persisted log) and delivers only a bounded
completion summary (identifier, exit code, line count, tail, evidence
reference) to the agent, which then explicitly reads tails or filtered
slices on demand. Full logs are never pushed into agent context by default.

**Critical judgment:** the retention-and-reference direction is retained as
a candidate consistent with R6 file-held artifact bytes; buffer bounds, log
placement, filter vocabulary, and retention policy are entirely open and
stay with the owning tasks.

## Completion as a Critical Message

The retained rule routes job completion through the existing critical-message
machinery: accepted into the mailbox, delivered to a live recipient, and
processed with acknowledgement stay three distinct outcomes; delivery is
at-least-once with stable event identifiers and idempotent handling rather
than exactly-once; and a crash between an effect and its acknowledgement
yields Unknown, never a fabricated result. The direction explicitly presents
this as reuse of R5/R6, not a new mechanism.

**Critical judgment:** retained as a consistency note, not a new contract.
All critical-message semantics stay owned by R5; this draft adds only the
consequence that job completion events belong on the critical path while
progress observations do not.

## Three network-partition classes

The retained distinction is threefold. Provider disconnection must not
disturb running jobs: the supervisor continues and the agent finds
completions in its mailbox on recovery, which is the point of an
independent supervisor. Job-network failure must not be invented by the
supervisor: unless the OS or tool reports it, the record is exit code,
signal, standard error, and timeout for the agent to interpret. IPC
disconnection between executor and AI runtime must retain events for
cursor-based resume on reconnect.

**Critical judgment:** the partition taxonomy is retained as a candidate
input; the resume-cursor mechanics, mailbox durability across the outage,
and any retry that follows are undecided. No network-error inference by the
supervisor is adopted.

## Structured OOM and crash outcomes

The retained direction is that abnormal endings get structured outcomes
(success, exit code, signal, spawn failure, cancellation, timeout, OOM,
supervisor loss, unknown) instead of a bare exit code, with OOM recorded
only when positively determined. Platform backends differ (process groups
with pidfd and optional cgroup v2 on Linux, process groups with wait
primitives on macOS, Job Objects with ConPTY on Windows), and cancelling a
job must terminate the owned process tree, never a single PID.

**Critical judgment:** the structure direction is retained as a candidate;
the enum shape is an unreviewed sketch and OOM attribution currently has no
backend evidence (the direction itself notes the cgroup path is a deferred
candidate that must not be presented as a cross-platform guarantee).
Killing by process-tree rather than PID is consistent with existing
supervision guidance.

## No-default retry

The retained rule is that retry defaults to none: re-running is safe for
some commands and destructive for charges, deletions, applies, pushes, and
migrations, so automatic retry needs either an explicit idempotency
declaration or explicit user or agent approval, and Unknown outcomes require
inspection before any retry. The direction presents this as preservation of the
existing R1/R5/R6 stance.

**Critical judgment:** retained as a consistency note with a load-bearing
consequence: no background runner may weaken the existing retry and Unknown
rules. Idempotency vocabulary, approval mechanics, and backoff policy are
open.

## Progress events must not wake the model

The retained rule separates Observation events (standard output, progress,
resource usage, heartbeats), which may coalesce, drop oldest with counters,
or stay UI-only, from Critical events (completion, failure, input need,
permission need, timeout, ownership change, cancellation), which require
reliable delivery. Progress must never cost the model a reasoning turn.

**Critical judgment:** retained as a consistency note with R5; the event
taxonomy, coalescing counters, and delivery mechanics are undecided. The
stable claim is only the split and the no-wake direction.

## Input-needed as a first-class event

The retained direction is that a job blocked on input surfaces an explicit
event with a prompt hint rather than hanging, while secrets stay behind the
existing sensitive-input boundary (the agent must not read user input). For
background tasks with closed stdin, an unexpected prompt becomes failure or
WaitingInput, not a stall.

**Critical judgment:** a candidate input-need direction, not an event
contract. State names, prompt-hint shape, and secret-handling mechanics are
open and need security review; nothing here relaxes the normative
redirection and minimization obligations.

## Persistence split

The retained split keeps metadata, events, subscriptions, ownership, and
output indexes in SQLite, log bytes on the filesystem, larger outputs behind
artifact references, and a bounded ring buffer in memory, so standard output
can never inflate the database to tens of gigabytes. The direction presents
this as consistent with the R6 journal plus file-held artifact bytes
direction.

**Critical judgment:** retained as a consistency note; all of it is
post-v0.1 scoping under the R6 ephemeral v0.1 and the boundary below. Store
choice, schema, index shape, and retention policy are entirely open.

## v0.1 scope boundary

The carried boundary is that job-submission plumbing is out of v0.1: no new
commands, tools, events, or wire formats ship in v0.1, and durability
(durable journal, persistent evidence store, crash adoption, detached
long-lived jobs, a supervisor daemon) stays post-v0.1 under the R6
ephemeral-v0.1 profile. The direction's three phases (in-memory supervisor with
event-driven completion, panel independence, mailbox delivery, and
process-tree cleanup; then persistent metadata with restart reconciliation,
Unknown handling, and resume cursors; then a detached daemon with multi-day
survival, handoff, adoption, and scheduling) are retained as the author's
staging opinion, not a schedule: phases have no owner, milestone, or
acceptance evidence. The proposal to promote this material to a dedicated
supervisor document is recorded as an author proposal; this task creates no
such document and adopts no such plan.

**Critical judgment:** the boundary is the load-bearing scope claim of this
draft. Phase 1 items are proposals for post-v0.1 scoping like everything
else here, and none of them constrains the v0.1 profile.

## Typed result contract as two layers

The retained rule is that AI-generated summary and OS execution result must
not be one object. The `bitty` side produces the authoritative
`ExecutionResult` (identifier, outcome, timestamps, output and error
references, artifact references, resource usage, truncation flag) with facts
only the process supervisor can know (exit code, process tree, signal, OOM
determination, timeout). The `bitty-ai` side produces the semantic
`JobResult` (execution reference, structured summary, diagnostics, task
effect, progress note), whose credibility is explicitly lower than the
execution fact. Artifacts split the same way: storage, digest, and retention
references are generic host mechanism, while what an artifact means for a
task is `bitty-ai` semantics. The UI consequence is kept as illustration:
failure shows the factual outcome with the agent summary and evidence links
side by side, never a bare summary sentence.

**Critical judgment:** the two-layer split is among the strongest claims
and is retained as a candidate input; both struct shapes are unreviewed
sketches. The stable claims are the anti-conflation rule and the
credibility ordering (fact above interpretation).

## Multi-agent security split and dual generations

The retained split is that `bitty` performs final capability enforcement
while `bitty-ai` owns coordination: the AI side decides logically (owner,
reviewer, subscriber, handoff) but every sensitive operation crosses into
the host as an authorized, versioned request (principal, execution,
operation, generation) that the host admits or denies, because a bare AI-side
check would let one AI bug kill any process. Enforcement-side capabilities
(observe, read output, write input, signal, cancel, attach, transfer) are
independent. Claim and ownership semantics (claims, assignments, stale-agent
detection, lead reassignment, task and reviewer binding) stay AI-side. The
load-bearing distinction is two staleness kinds with two generations: agent
claim staleness (lost heartbeat, expired lease, commander-decided handoff)
is `bitty-ai` coordination with an assignment generation, while execution
handle staleness (an identifier rebuilt at a newer generation) is host
detection with an execution generation that the host must reject.

**Critical judgment:** the enforcement-versus-coordination split is retained
as a candidate consistent with the IPC-extension-boundary permission direction and the
CTX-0047 comparison (capability enforcement at the boundary, coordination
above it); the capability names, claim shapes, and request envelope are
unreviewed sketches. This section re-decides nothing about the Capability
Layer.

## Cancel and timeout: mechanism below, policy above

The retained cut is that `bitty-ai` decides whether a cancel is appropriate
(task policy, team ownership, whether another agent still needs the job)
while `bitty` executes it (signal escalation with grace periods, process-group
termination, descendant reaping) and reports a structured cancel outcome, so
the AI side never infers "it stopped because I sent Ctrl+C." Timeout clocks
follow the same cut with supervisor-held deadlines on one side and
workflow-chosen policies on the other. The binding context is kept: task,
agent, execution, dependency, claim, handoff, and progress-note semantics
are AI-side orchestration the terminal never needs to understand, while
worktree and working-directory targets arrive as references the host
resolves, authorizes, captures, and executes (never a raw path the core
blindly runs).

**Critical judgment:** the cut is retained as a candidate input; the cancel
modes, grace periods, outcome names, and binding shapes are unreviewed
sketches. The stable claims are host-executed termination with reported
(never assumed) outcomes and host-resolved execution targets.

## Boundary table

| Capability                                          | `bitty`                             | `bitty-ai`                              |
| --------------------------------------------------- | ----------------------------------- | --------------------------------------- |
| Process spawn                                       | Owns                                | Requests                                |
| PTY                                                 | Owns                                | Uses                                    |
| Standard output and error capture                   | Owns                                | Consumes                                |
| Process tree                                        | Owns                                | Views the authorized projection         |
| Working directory, environment, and worktree target | Resolves, validates, and captures   | Selects the target                      |
| Execution identifier and generation                 | Owns                                | References                              |
| Task identifier                                     | Semantically blind                  | Owns                                    |
| Job-to-Task binding                                 | Opaque metadata or reference only   | Owns                                    |
| Job-to-Agent ownership                              | Capability principal                | Owns the coordination semantics         |
| Claim and handoff                                   | Enforcement primitive               | Owns the policy                         |
| Subscription                                        | Event mechanism                     | Subscription policy                     |
| Read and kill permissions                           | Final enforcement                   | Decides and requests scope              |
| Graceful cancel                                     | Executes                            | Selects the policy                      |
| Timeout clock                                       | Executes                            | Sets the policy                         |
| Process-tree termination                            | Owns                                | Requests                                |
| Exit, signal, and OOM                               | Authoritative fact                  | Interprets                              |
| Raw artifacts and evidence                          | Produces and references (mechanism) | Interprets and associates with the task |
| Summary                                             | Produces no AI semantics            | Owns                                    |
| Progress note                                       | Does not interpret                  | Owns                                    |
| Retry                                               | Provides the re-execution primitive | Decides whether to retry                |
| Stale execution                                     | Detects                             | Responds                                |
| Stale agent claim                                   | Not responsible for Agent semantics | Detects and coordinates                 |
| Task completion                                     | Not responsible                     | Owns                                    |

## Repository placement, the wrapper principle, and the worked example

The retained placement keeps the host execution subsystem AI-agnostic
(process, PTY, supervisor, outcome, limits, signals, output, capability
with generic principal, execution, target, capability, and opaque-metadata
identifiers only) and the AI-side job layer semantic (task, agent, team,
assignment, execution, and workspace references). The architecture sentence
is kept verbatim as a principle: **every Job may reference an Execution,
but an Execution is not inherently an AI Job**, because ordinary users, Lua
plugins, and terminal features execute processes too (a user-started test
run is an Execution without necessarily being a `bitty-ai` Job). The shared
IPC names generic execution semantics rather than agent ontology, consistent
with the existing command-tool boundary that keeps AI-specific semantics
out of the terminal process. The worked example is retained as the binding
illustration: Task T128 (fix a parser bug) owned by Agent A in workspace W5
binds to Job J31, which spawns Execution E77 at generation 3 through
target-resolving IPC; the exit event (outcome with output references) flows
back through J31 to T128 as a progress note while T128 stays in progress;
throughout, the host knows only an authorized principal and its
capabilities, never what T128 means or which agent role A plays.

**Critical judgment:** placement and principle retained as candidate inputs;
crate, module, and file sketches are proposals with no packaging evidence,
and the IPC names are discussion vocabulary that proposes no wire method.
The stable claims are the agnosticism rule (no agent or task ontology in
the host) and the wrapper principle.

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered models are
candidate inputs only; the Execution Supervisor, the three-phase rollout,
and the proposed supervisor document are **not** accepted by this
candidate design and must not be read as crate, package, protocol, or release
decisions. Execution and environment questions stay with
[Execution ownership R1](../architecture/execution-ownership-r1.md) and
[Panel environment awareness](../interfaces/panel-environment-awareness.md); tool
authorization and transport placement stay with
[Tool transport R2](../architecture/tool-transport-r2.md); provider questions stay with
[Provider plugin boundary](../providers/provider-plugin-boundary.md). Each is
referenced, never duplicated or modified.

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) defines the only
accepted IPC wire, scope, and Agent vocabulary. Every method, event, struct,
and enum name in the direction (`exec`, `job_spawn`, `job_get`, `job_read`,
`execution.spawn`, `execution.exited`, `ExecutionResult`, `JobResult`,
`ExecutionOutcome`, `Lifetime`, `JobKind`, `CancelMode`, and similar) is a
discussion sketch: this draft records it as input and proposes no command,
tool, event, or wire format, consistent with the v0.1 scope boundary above.
Where the direction's sketches overlap RFC-owned ground (Agent lifecycle, Agent
events, Agent semantics, scopes), the RFC wins without further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed redaction,
consented recording, secret minimization) override every discussion example
throughout this document. The direction's permission names (`execution.observe`,
`execution.read_output`, `execution.signal`, `execution.cancel`, and
similar), operation lists, and console fields are conceptual vocabulary, not
additions to any accepted registry, schema, or protocol. This draft creates
or closes no AIQ or OQ identifier; open questions stay with
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the design falsifiable before any supervisor
proposal constrains `bitty-ai`.

| Campaign             | Required observation                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Object separation    | A job completes to its agent's mailbox after its origin panel closes and after the agent switches panels, with panel lifetime independent of job lifetime in reviewable tests. |
| Mailbox routing      | Completion delivery names the agent rather than any panel, and redelivery after reconnect deduplicates on stable event identifiers.                                            |
| Lifetime policy      | Each declared lifetime scope behaves as specified on agent death, with forced stops falling back to the declared policy in reviewable tests.                                   |
| Quiescence gate      | An agent with live owned jobs cannot finish normally without an explicit per-job disposition, enforced by the harness rather than by prompting.                                |
| Timeout split        | A timed-out execution records a timeout fact below while task disposition above varies by policy, with no folding into generic failure.                                        |
| Closed stdin         | A non-interactive job never blocks forever on standard input, and interactive capability requires an explicit grant.                                                           |
| Output discipline    | A multi-thousand-line job delivers a bounded completion with an evidence reference, and full output enters context only through an explicit, authorized read.                  |
| Critical completion  | Completion, failure, input-need, and cancellation events survive agent disconnect and reconcile Unknown outcomes by inspection, never by assumption.                           |
| Retry discipline     | An effectful or Unknown-outcome job is never retried without an explicit idempotency declaration or approval, in reviewable tests.                                             |
| Boundary enforcement | An AI-side bug or compromised agent cannot exceed its granted execution capabilities, because the host enforces every sensitive operation independently.                       |
| Wrapper principle    | A non-AI execution exists without any AI Job wrapper, and host code and identifiers carry no agent or task ontology in review.                                                 |

Promotion needs independent AI architecture, execution-owner, terminal and
plugin-owner, docs-curator, and security review. Route tool and method
names, event catalog, struct and enum shapes, limit values, kind taxonomy,
console views, phase ownership and milestones, and the supervisor-document
proposal to scoped owner tasks. This draft changes no normative contract
and authorizes no product code.
