---
title: Execution Host and Supervisor Boundary
description: Draft capture of the bitty/bitty-ai execution boundary, job supervision mechanisms, and the phased long-running process direction
category: development
audience: contributor
document_type: policy
status: draft
website_publish: true
sidebar_order: 18
---

# Execution Host and Supervisor Boundary

> Status: **draft**. This page is a critical capture of the Execution
> Supervisor / Job Service direction (2026-09-17). It accepts nothing, adopts
> no crate, fixes no wire protocol, and authorizes no implementation. It
> refines the implications of DIR-018 (host
> capability gateway), the identity separation tracked by OQ-061, and the
> deferred headless/daemon direction of ADR-0008 without rewriting them. The
> accepted [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md),
> the [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md),
> and the security corpus remain authoritative. `bitty-ai`-owned semantics
> (Task model, claims, mailbox, progress, retry policy) are deliberately not
> captured here; they stay owner-pending in `bitty-ai-docs`. Where the page
> references repository state, that state is a point-in-time observation, not
> a contract.

## Problem statement

Coding-agent harnesses manage background work in session-scoped ways that do
not survive the objects Bitty is building around them:

- OpenCode `pty_spawn` exposes PTY sessions with an exit notification, a ring
  buffer, and read/write/list/kill operations; the abstraction is a terminal,
  not a job.
- Codex separates a process JSON-RPC surface (start, read, write, signal,
  terminate plus output/exited/closed events) from a model-facing tool that
  yields and then polls `write_stdin`, which burns turns and lets the model
  abandon or duplicate sessions.
- Claude Code distinguishes background shell tasks from subagent tasks and
  offers a Monitor that turns output lines into events, but process jobs and
  agent tasks still mix.
- Cursor models Agent and Run separately with an event stream, a resume
  cursor, and subscriptions that can wake an agent after its turn ends, but it
  assumes a cloud agent rather than a local process manager.
- pueue is daemon-managed and terminal-independent (queue, groups,
  dependencies, pause/resume, restart, durable logs, environment snapshots),
  but it understands nothing about agents, capabilities, panels, or handoff.

The direction concludes that Bitty should not ship a stronger `pty_spawn`. It
should make the **Job / Execution a first-class object** managed by an
Execution Supervisor that is independent of Agent, Panel, and Conversation,
with a PTY as one execution backend rather than the core abstraction.

## The boundary principle

The direction fixes a responsibility split that this capture records as
direction:

| Side                 | Role                        | Owns                                                                                                                                              |
| -------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bitty`              | Execution Host / mechanisms | OS process, PTY, stdin/stdout capture, process tree, signals, timeout clocks, cancellation execution, output capture, capability enforcement      |
| `bitty-ai`           | Agent Runtime / semantics   | Task model, agent ownership, job-to-task association, claims, subscriptions, handoff, mailbox, progress notes, retry and timeout policy selection |
| `bitty` ↔ `bitty-ai` | Typed execution protocol    | Generic execution verbs and typed results; the terminal side never learns agent ontology                                                          |

The direction fixes four objects and their lifetimes:

| Object              | Meaning                                    |
| ------------------- | ------------------------------------------ |
| `Task`              | Semantic work ("fix issue #91")            |
| `Execution` / `Job` | A real OS process or process tree          |
| `Agent`             | The decision-making logical actor          |
| `Panel`             | A human observation/interaction projection |

Consequences recorded:

- A job does not belong to a panel. Closing a panel, switching panels,
  compacting a conversation, or an agent going away does not end an execution.
- An origin panel is provenance metadata ("started from here"), never
  ownership; completion notification routes to the owning agent's mailbox
  (owned on the `bitty-ai` side), not to the panel that spawned it.
- Panels observe and attach; multiple panels may observe one execution, and a
  job's owner plus subscribers is a distinct concept from "who started it".
- "Every Job may reference an Execution, but an Execution is not inherently an
  AI Job": ordinary users, Lua plugins, and non-AI features execute processes
  too, so the host-side execution subsystem stays AI-agnostic.

## Job model recorded for the host

- **Lifetime declared at spawn**: `Agent` (cancel when the owner dies), `Task`
  (continue while the task lives), `Workspace` (continue while the workspace
  lives), `Detached` (continue under the supervisor). The host executes the
  cleanup policy for the declared lifetime; the caller chooses it.
- **Kind**: `Command`, `Interactive`, `Service`, `Watch`. Service and watch
  jobs are expected not to exit, so the runtime must not treat long life as a
  hang.
- **Stdin safety default**: non-interactive jobs run with pipes and closed
  stdin by default; a PTY plus writable stdin requires an explicit
  interactive opt-in. This prevents the background-stdin hang class observed
  in other harnesses.
- **Argument execution model**: prefer `argv` over `bash -c`. Shell execution
  is opt-in for pipes, redirection, `&&`, and expansion because the direct
  form makes permission checking, command attribution, resource accounting,
  process-tree ownership, and argument redaction tractable.
- **Separated limits**: `hard_timeout`, `idle_timeout`, and `retention_ttl`
  are distinct; there is no blanket "background jobs are killed after one
  hour" rule. Deadlines are held by the supervisor because they must fire even
  when the owning agent's provider connection is gone.
- **Structured outcome, never a bare exit code**: at minimum `Success`,
  `ExitCode`, `Signaled`, `SpawnFailed`, `Cancelled`, `TimedOut`,
  `OomKilled`, `SupervisorLost`, `Unknown`. `OomKilled` is only asserted when
  the host can actually determine it (for example per-job cgroup
  `memory.events` on Linux); the cross-platform backend split is process
  groups plus pidfd on Linux, process groups plus kqueue/process wait on
  macOS, and Job Objects plus ConPTY on Windows.
- **Kill the owned process tree**, never a single PID.
- **Cancel protocol**: a typed cancel request carries the execution id, the
  execution generation, a mode (`Graceful`, `Immediate`,
  `GracefulThenKill`), and a grace period; the host owns `SIGINT`, wait,
  `SIGTERM`, wait, `SIGKILL`, process-group kill, and descendant reaping, and
  returns a typed cancel outcome including `CancelledGracefully`, `Killed`,
  `AlreadyExited`, `PermissionDenied`, `StaleGeneration`, and `Unknown`. An
  agent must never infer "I sent Ctrl+C, therefore it stopped".
- **Two generations**: an assignment generation (task/agent ownership, owned
  by `bitty-ai`) is not an execution generation (host handle, owned by
  `bitty`). A stale execution handle must be rejected by the host itself, not
  by convention in the AI layer.
- **No default retry**: retrying `terraform apply`, `git push`, a payment
  call, or a database migration can duplicate an effect. Re-execution is a
  primitive the host provides; whether to retry, and how, is policy. Unknown
  outcomes require inspection first.
- **Needs-input is a first-class state**: a job waiting on a prompt becomes
  `WaitingInput` and emits a `needs_input` event instead of hanging forever;
  secret input stays inside the sensitive-input boundary and is never
  readable by an agent.
- **Capability-scoped operations**: `observe`, `read_output`, `write_input`,
  `signal`, `cancel`, `attach`, and `transfer` are independently authorized
  per principal. An agent can see a job and not be allowed to cancel it, and
  an AI-layer bug must not be able to kill an arbitrary process: `bitty-ai`
  requests, the host authorizes and enforces.

## Result and output contract

The direction separates two layers that must not be conflated:

- **`ExecutionResult` is the authoritative host fact**: execution id, typed
  outcome, start/end timestamps, stdout/stderr references, artifact
  references, optional resource usage, and a truncation flag. `bitty` produces
  it; `bitty-ai` consumes it.
- **`JobResult` is the semantic projection** (summary, diagnostics, task
  effect, progress note) and belongs to `bitty-ai`.
- **Raw artifacts** (core dumps, test reports, coverage, logs, binaries) are
  stored and referenced by the host mechanism; their meaning for a task is
  `bitty-ai` semantics.
- **Output never floods agent context**: the supervisor keeps a bounded ring
  buffer plus an optional persisted log; what crosses into a model is a
  bounded tail plus references, with explicit tail/filter reads for more
  (`tail`, `filter="error|failed|panic"` shapes). The current bounded
  synchronous execution result surface is the predecessor of this direction,
  not its implementation.
- **Event delivery is at-least-once with stable ids**: completion events carry
  an id, are deduplicated by the consumer, and are not dropped silently. The
  states stay distinct — accepted into a mailbox, delivered to a
  live recipient, and processed/acknowledged — and retains events across an
  IPC disconnect, resuming by sequence so that work continues while the AI
  side is away.
- **Observation versus critical events**: progress, stdout, and heartbeat are
  observation events that may be coalesced, dropped oldest-first, or kept
  UI-only, and must not wake the model; completion, failure, needs-input,
  permission-required, timeout, ownership-change, and cancellation are
  critical events that are delivered reliably.
- **Three disconnect classes**: an LLM-provider outage must not touch running
  jobs; a job's own network failure is recorded as an exit code, signal,
  stderr, or timeout fact and left for the agent to interpret (no invented
  `network_error` classification); a Bitty IPC disconnect retains execution
  and events for replay after reconnect.

## Persistence and phasing

The direction keeps durability out of v0.1 (aligned with the ephemeral v0.1
boundary already recorded) and stages growth:

| Phase   | Scope                                                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 | In-memory jobs, event-driven completion, panel-independent supervision, agent mailbox delivery, process-tree cleanup; no app-restart survival |
| Phase 2 | Persistent metadata, events, and logs; restart reconciliation; `Unknown` handling; resume cursors                                             |
| Phase 3 | Detached supervisor daemon; Bitty GUI may exit; multi-day jobs survive; handoff/adoption; resource scheduling                                 |

Storage direction: metadata, subscriptions, ownership, events, and an output
index may live in a database, while output bytes live in files and large
artifacts are referenced by digest/reference; the database must never grow
with raw stdout. Phase 3 must compose with the headless/daemon deferral in
ADR-0008 rather than bypass it.

## Repository and protocol placement

- `bitty` hosts an AI-agnostic execution subsystem (crate name illustrative:
  a `bitty-execution`-shaped module with process, PTY, supervisor, outcome,
  limits, signals, output, and capability parts). It must not contain
  `AgentId`, `TaskId`, LLM, prompt, or provider symbols; at most generic
  principals, execution ids, targets, capabilities, and opaque metadata.
- `bitty-ai` owns the semantic wrapper (`Job` as an AI-side view over an
  `Execution`) including bindings, claims, subscriptions, progress, results,
  retry, and handoff.
- The IPC contract uses generic execution verbs (spawn, get, cancel, signal,
  read, subscribe, attach; `transfer` is a shape rather than one of the
  committed verbs), not `agent.job.*`: Terminal Core must not learn Agent
  ontology. The current generic bridge and bounded execution surface are the
  base this direction would extend.
- Borrowing is at the design level: pueue's supervisor states and queue
  mechanics, Cursor's event stream/resume cursor/subscription wake-up,
  OpenCode's PTY operations and exit notification, Claude Code's background
  task and Monitor split, and Codex's process event protocol are inputs; no
  external project becomes the backend.

## Panel and visibility direction

Panels are optional projections of executions, and multi-agent visibility is
capability-gated: an owner plus subscribers model with per-operation grants,
so a team lead or reviewer may observe while control stays scoped. The
console layout, attach/tail interactions, and job list are
illustrative UI direction only. The terminal side already owns the folding
direction for command output (see the semantic terminal folding direction); job
views must compose with that presentation model rather than inventing a
second folding mechanism.

## Out of scope (owner-pending)

The following belong to `bitty-ai` semantics and are not captured here: the
Task lifecycle authority, `JobBinding` between tasks and executions, agent
claims and leases, watcher/subscriber policy, mailbox delivery semantics,
`JobResult` summaries and progress notes, retry policy, timeout policy
selection, the agent-finalization Quiescence Gate (an agent
winding down must resolve its live owned jobs by wait, detach, handoff, or
cancel — enforced as a harness invariant, not a prompt reminder),
commander/reviewer orchestration, and the multi-agent role contract tracked
by OQ-057. Their owner repository records them separately.

## Open items

- The v0.1 boundary and the trigger for Phase 2 persistence are recorded but
  not scheduled; no implementation is authorized.
- OOM determination without cgroups, and the Windows/macOS process-tree
  backends, are direction with no decided mechanism.
- Output retention defaults (ring size, log retention, artifact retention)
  are undecided.
- Whether the execution subsystem becomes its own crate, and how the generic
  execution IPC verbs compose with the accepted agent IPC surface, is
  undecided.
- The job-visibility console and needs-input surfacing have no accepted
  terminal-side contract yet; folding composition is noted without duplicating
  the semantic terminal direction.
- No new open question is opened here; OQ-061 (identity domains and panel
  projection), OQ-057 (capability-enforced role contract), OQ-059 (semantic
  output compression), and OQ-065 (evidence references) remain the contract
  owners for their parts.
- Nothing here is accepted or implemented; promotion requires its own review.
