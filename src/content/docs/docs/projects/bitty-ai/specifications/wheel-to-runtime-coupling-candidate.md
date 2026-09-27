---
title: Wheel-to-runtime coupling (candidate)
description: Candidate four-layer model for how a Wheel agent couples to the Bitty runtime - lifecycle, observation, action, and presentation - with the invariants that keep the coupling runtime-native rather than chat-manager-based
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 69
---

# Wheel-to-runtime coupling (candidate)

> Status: **draft**. This document records a candidate direction as a
> reviewable proposal. It accepts nothing, describes no shipped behavior, and
> authorizes no compatibility promise. Mechanisms marked beyond-v0.1 are
> proposals for later increments, not commitments.

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification,
accepted decision, dependency selection, release commitment, or
implementation claim. It records the candidate coupling model between a Wheel
agent and the Bitty terminal runtime: how an agent's existence (lifecycle),
its bounded view of the runtime (observation), its effects on the runtime
(action), and its presentation surfaces (presentation) relate to the terminal,
the compositor, and the user — and which invariants keep that coupling from
collapsing into the chat-manager model of terminal-hosted agent harnesses.

The model **extends, without restating**, existing candidate records:

- [AI Architecture](../architecture/ai-architecture.md) carries the
  comparative positioning versus existing harnesses, the Environment Context
  plane, the semantic-output compression rules (SOC-1..SOC-6), the rich
  streaming contract (RS-1..RS-6), the Agent levels (AG-1..AG-3), the shared
  model invariants (SMO-1..SMO-5), and the AgentWorkspace bounds (AW-1..AW-4).
  This page organizes the runtime-facing half of those directions into one
  coupling view.
- [IPC and Agent RFC](ipc-agent-rfc.md) (accepted) owns the only accepted
  agent vocabulary, including the bounded `AgentSession` state machine and
  its no-authority-at-creation rule. This page consumes it as the lifecycle
  anchor and changes none of it.
- [Execution ownership R1](../architecture/execution-ownership-r1.md) owns the
  single-agent execution-ownership disposition: a headless panel is
  presentation, never authority, and an agent acquires an authorized
  execution context rather than panel occupancy.
- [Agent Coordination Architecture](../agent/agent-coordination.md) owns
  leases, the single fenced interactive writer, panel-execution separation,
  the human control surface, and the quiescence direction at agent finish.
- [Panel and agent workspace boundary (candidate)](panel-workspace-candidate.md)
  carries the panel-side identity rules: hiding, moving, or rebinding an
  agent panel never moves its execution target; panel suspend, resume, and
  disposal are host operations.
- [Event-sourced agent workspace (candidate)](event-sourced-agent-workspace-candidate.md)
  carries the six-object split (Agent, Panel, Event, Context, Task, Artifact)
  and the task-as-issue takeover direction that makes work survive agent
  turnover.
- [Execution supervisor (candidate)](execution-supervisor-candidate.md)
  carries job lifetime scopes and the agent-death disposition policy.
- [Prompt Layering Design](../context/prompt-layering-design.md) owns the
  runtime-delta layer, and [Session model (candidate)](session-model-candidate.md)
  owns the session container and its recovery composition; this page reads
  both as coupling interfaces, never as duplicated content.
- [Panel environment awareness](../interfaces/panel-environment-awareness.md)
  carries the five awareness contracts for what `bitty-ai` may assume about
  panel environment.

The surrounding documents stay in force as references, never as duplicated
content: [Wheel Context Runtime (candidate)](../context/wheel-context-runtime-candidate.md)
owns evidence, temperature, and refinement; [Storage memory and export
design](../persistence/storage-memory-export-design.md) owns memory tiers,
recipes, and export scopes; [Command and Tool Architecture](../architecture/command-tool-architecture.md)
owns the command registry and the Core-versus-Lua boundary; [Tool transport
R2](../architecture/tool-transport-r2.md) owns the unified authorization
backend for tool effects; and the accepted configuration contract in the
terminal documentation corpus owns directory trust.

Nothing here is promoted to accepted status, and no implementation is
described as shipped.

## Status vocabulary

| Status        | Meaning in this document                                                             |
| ------------- | ------------------------------------------------------------------------------------ |
| Accepted      | An accepted specification already requires the rule; this document only restates it. |
| Candidate     | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending | Belongs to another repository owner; recorded here as a pointer, never as content.   |

## Positioning: the coupling thesis

The recorded comparative positioning already draws the line. Terminal-stream
CLIs run their agent loop "in a TUI or stream attached to one project
session", while the candidate Bitty contrast places agents in "panels/views
beside real PTYs" and keeps "the terminal remains a terminal and agent
surfaces are optional plugin content". The strategic line is sharper: an
existing terminal-hosted coding agent is a _coding agent inside a terminal_,
while the Bitty direction is _a terminal that natively understands agents,
tools, executions, tasks, and context_.

This page reads that direction as a structural claim about **coupling**,
not merely layout:

- In the chat-manager model, the session's identity, lifetime, and history
  are owned by one UI application surface; the agent exists inside it, and
  the surrounding system is addressed mostly as text (prompts, pasted
  output, tool strings).
- In the runtime-native model, the agent exists as a runtime object with its
  own lifecycle, addresses the runtime through typed observations and
  execution, and is presented through projections that can be added,
  removed, or multiplied without touching the agent's existence or
  authority.

The four layers below decompose that claim: **lifecycle** (when the agent
exists and what survives transitions), **observation** (what it may see),
**action** (what it may do and through which authority), and
**presentation** (how it is shown and how it asks for attention). A
cross-cutting invariant section follows, because several rules hold across
multiple layers.

**Critical judgment:** the thesis is a direction. It selects no mechanism,
no wire, and no UI. The chat surface itself is not denied — the UI corpus
records an AI chat panel direction among ordinary panel content — what
changes is that chat becomes one projection among several rather than the
system of record.

## Layer 0: Lifecycle coupling

Lifecycle is the time axis of the coupling: when an agent exists, what
happens at each state transition, and what survives when a surface or a
process goes away. The corpus records these dimensions across several
documents; this section gathers the coupling-relevant rules.

### Session states and the no-authority start

The accepted `AgentSession` is the lifecycle anchor: one `AgentId`, a
`ToolRegistry`, bounded history, and a side queue, with the deterministic
state machine `Created -> Running <-> WaitingToolResult -> Completed/Failed`.
Two rules matter for coupling:

- **A session is created without authority.** Tool dispatch is not implicit
  in the session; each tool call is separately authorized against the
  caller's scopes. Existence does not imply capability.
- **The session holds no GPU texture, window handle, or PTY file
  descriptor**, so it is headlessly testable — lifecycle is independent of
  any presentation surface by construction.

Elevation follows the agent levels: a fresh session starts at `inspect`
(read-only), and each higher level requires a separate consent grant
recorded in the consent ledger.

### Generation binding: suspend invalidates elevation

The recorded generation rule couples lifecycle to authority: agent levels
are bound to an identity plus generation, and "a suspend/dispose/reload
invalidates prior elevation; re-grant requires a fresh prompt". This is the
**suspend-invalidates-elevation** rule: an interrupted or restarted agent
does not resume with its former powers; it returns to the consent flow. The
same generation pattern fences stale handles throughout the panel contracts
— a stale handle fails closed.

### Survival domains: what continues when the agent does not

The execution supervisor records the job-side lifetime policy: spawn
declares a job's lifetime scope, and agent death follows the declared
policy — Agent-scoped jobs cancel, Task-scoped jobs continue while the task
lives, Workspace-scoped jobs continue while the workspace lives, and
Detached jobs continue under the supervisor independently. The direction's
examples are policy vocabulary, not defaults.

Three decoupling rules compose with it:

- **An agent may survive panel closure** while losing a tool stream or
  waiting for a replacement target; the transition is stated explicitly
  rather than assumed.
- **Panel suspend and resume are host operations**; `bitty-ai` holds
  references, and stale handles fail closed. Suspending a panel is
  "becoming invisible without destroying attachment" — presentation and
  existence are separate variables.
- **A panel may sit agentless** and an agent may relocate across panels: the
  six-object split keeps Agent and Panel as separate identities.

### Death, quiescence, and takeover

The recorded rules for agent finish form a small protocol:

- **Pre-exit quiescence gate**: an agent with live owned jobs cannot finish
  normally without an explicit per-job disposition, enforced by the harness
  rather than by prompting.
- **Critical completions survive disconnect**, and `Unknown` outcomes are
  reconciled by inspection, never by assumption; there is no default retry
  for effectful or `Unknown` work.
- **Work survives agent turnover**: a Task is modeled as an Issue-like
  durable object claimable by any replacement agent, so recovery is a role,
  not a special agent class.

**Critical judgment:** the state machine and no-authority-at-creation rule
are accepted (IPC RFC); every other rule in this section is recorded
candidate direction, and the identity-domain question (`AgentId`, `TaskId`,
`RunId`, `ExecutionId`, `PanelId`, `WorkspaceId`) stays open with its
register entry. This section creates no identifier and adopts no schema.

### The lifecycle decoupling table

The coupling point of this layer is a table of independence statements,
each sourced:

| Transition                        | What it must never do                                                                                     | Source posture |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| Panel hidden, moved, detached     | Change presentation/attachment only; execution target and authority stay fixed                            | Candidate      |
| Panel closed                      | Not unload its parent plugin; the agent survives with an explicit transition                              | Candidate      |
| Agent suspended/disposed/reloaded | Not resume with prior elevation; re-grant requires a fresh prompt                                         | Candidate      |
| Agent death                       | Execute the declared lifetime policy per job; never silently kill or silently continue                    | Candidate      |
| Session restart                   | Not replay queued commands into a changed shell; reconcile pending actions                                | Candidate      |
| Task takeover                     | Pass the retry and fencing gates first; never invalidate a live writer without generation-fenced transfer | Candidate      |

## Layer 1: Observation coupling

Observation is what the agent may see of the runtime. The corpus records two
channels and one hard rule.

### The bounded environment view

The Environment Context plane covers "terminal, workspace, git, diagnostics,
and execution-target observations" as current bounded state, and the prompt
layering records a runtime-delta layer carrying per-turn facts (working
directory, branch, task, turn instruction) as a trailing block. The
panel-environment-awareness contracts add the interface discipline: a
sanitized Agent View only, a Use-versus-Read boundary, env-handle semantics,
no persistence by default, and exported-only scope. Secret material is out
of scope by construction.

### Semantic consumption, not screen scraping

The semantic-output compression rules make the observation channel typed:
a command contribution is addressed by its semantic zone region plus the
recorded exit code, "not by scraping arbitrary terminal text"; exit `0`
contributes a bounded summary with the full output retrievable through an
explicit resolve step, and a non-zero exit contributes the exit code,
deterministically extracted error lines, and a bounded window around each
error. Every compressed contribution counts against the context budget with
per-block attribution, stays labeled as untrusted observation, and is
produced off the hot path.

**The no-scrape rule for this page:** the agent reads execution records and
semantic zones; it does not reconstruct state by reading rendered cells. A
future implementation that scrapes the screen has left this design.

### On-demand evidence resolution

The evidence direction keeps storage lossless and materialization lossy:
full output and artifacts stay addressable in the evidence store, and a
bounded summary in context carries a reference back to the complete record.
Delivery is chunked and sequenced, and reordering or loss is detectable.
This is the operational shape of the recorded principle: give the model the
minimum sufficient context while preserving a path back to complete
evidence.

**Critical judgment:** zones depend on the semantic-terminal question staying
as recorded, and the exact evidence-view schema stays open with its owning
records. This page records the no-scrape direction and the channel
separation; it adopts no schema.

## Layer 2: Action coupling

Action is what the agent may do to the runtime. The governing separation is
recorded: an agent acquires an authorized execution target, not ownership
through panel occupancy, and "a structured build needs neither shell nor
panel". Headed and headless describe presentation only, not authority,
persistence, or lifecycle.

### Execution, not typing

An agent effect on the runtime is an **execution**: an authorized execution
context, a supervised process, evidence, and a result. The supervising
backend owns process and PTY handles and cleanup; a panel may later display
the state. This is the sense in which the Wheel agent is runtime-native: its
"keystrokes" are executions with targets, authorization, and evidence, not
simulated input into a terminal view.

### Terminal-relation tiers

The corpus supports three tiers of terminal relation, at three postures;
the third is split across repositories:

| Tier | Relation                                         | Posture                                                                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | The agent's own execution environment            | Recorded: authorized execution target plus supervised process; the standard path.                                                                                                                                                                                          |
| B    | A shared terminal observed by several consumers  | Candidate: compatible read leases coexist; every acquisition is authorized against the current caller; leases bound by workspace/session policy.                                                                                                                           |
| C    | A terminal the user is actively interacting with | Split: the terminal side records the single-fenced-writer direction; the Wheel side records the candidate request, decision, commit, and return flow ([shared workspace services candidate](shared-workspace-services-candidate.md)); writer-transfer mechanics stay open. |

The tier-C direction that exists is precise about the failure modes to
avoid: interactive input has one fenced writer, "transfer invalidates the old
writer generation before the new writer is admitted", and human takeover
"revokes or pauses automated input and reconciles pending actions instead of
interleaving keystrokes or replaying queued commands into a newly changed
shell". A fresh agent also remains read-only by default: a separately
approved task profile may permit actions in its execution target, but "hiding a panel cannot manufacture consent".

### One-shot dispatch and handback

Composing the rules gives the candidate semantics for tier C: an agent
contribution to a user-interactive terminal is a **one-shot dispatch with
evidence and an explicit return**, not a stream of injected keystrokes.
Alternation between human and agent input is explicitly rejected
("interleaving keystrokes"), and automation resumes only through an explicit
handback after human takeover. The request, decision, commit, and return flow is
recorded in the [shared workspace
services candidate](shared-workspace-services-candidate.md); the writer-transfer
mechanics stay with their open question (interactive writer fencing), and this page
proposes no wire.

**Critical judgment:** the tier table, the one-shot reading, and the
handback composition are this draft's vocabulary. The stable claims are:
effects are executions; leases never union capabilities across consumers; a
single fenced writer guards interactive input; no silent takeover in either
direction.

## Layer 3: Presentation coupling

Presentation is how the agent is shown and how it asks to be shown.
The recorded direction is bidirectional projection with one-sided authority.

### Dual projection

- **Runtime to panels**: every runtime object (agent, task, workspace, tool,
  process, model, panel) is a candidate addressable endpoint with a panel as
  one possible projection; "an agent can have UI, no UI, run headless, or be
  watched by several panels without a panel becoming the session identity".
  Agent output reaches surfaces through the rich streaming contract
  (Markdown, Diff, ToolCard fragments into the accepted scene contracts),
  and the console direction records the aggregate views: organization,
  task, agent, panel, and resource views with attachment indexes, purpose
  labels, and correlated timelines derived from authoritative records.
- **Runtime to agent**: committed terminal events (for example command
  finished) are observation inputs; completion delivery names the agent
  rather than any panel, and redelivery after reconnect deduplicates on
  stable identifiers.

### Attention as request, never preemption

The panel state model records an attention axis in exactly these terms: "a
background request for user notice without focus theft". Background
surfaces request attention badges instead of stealing focus; showing a
decision surface is "a request to the host, not permission for an agent to
open arbitrary windows"; and the agent cannot open, focus, or close panels
directly. For this page, the coupling rule is: **blocked work, consent
requests, and completions surface as attention requests on host terms** —
the agent's need never materializes as a focus grab or an unsolicited
window.

The user-side complement is recorded too: users can inspect or stop agent
work through their authorized control surface even when execution is
headless, and each control action (kill, reassign, archive, message, focus)
passes the same authorization and generation checks as any other client.

**Agent-side mapping (candidate).** The three recorded sources compose into
one primitive. Blocked work is the input-needed event direction: "a job
blocked on input surfaces an explicit event with a prompt hint rather than
hanging". A consent need is the released-command direction: "Releasing a
blocked command requires an explicit human decision recorded in the consent
ledger". A completion is a Critical event — "completion, failure, input
need, permission need, timeout, ownership change, cancellation" — which
"require reliable delivery". The candidate mapping disciplines every such
request:

- **An evidence reference is required.** A request carries the execution or
  task record that motivates it, so it reads as a reviewable reference, not
  as an assertion that some work seems important.
- **No re-raise before resolution.** While a request awaits the user, it is
  not repeated; this composes with the bounded, never-escalating direction
  already recorded for background surfaces.
- **The decision returns.** A user decision (focus, approve, dismiss) flows
  back as an observable event, composing with the recorded direction that a
  human participant is first-class, not a private side channel.
- **Attention is never consent.** Focusing or dismissing a request approves
  nothing: the consent-ledger entry, the risk release, and every scope check
  remain their own explicit acts.

The routing target is the projection, not the execution: a request lands at
the surface holding the active binding, or at the console or notification
surface when none exists — never broadcast to every surface holding a
binding ([Execution-projection binding (candidate)](execution-projection-binding-candidate.md)).
Aggregation ownership — whether the counter behind these requests is a
plugin-side facility or a host service — stays open with its corpora; this
page records the Wheel-side mapping only.

### Projection never touches identity

Two composition rules keep the projection safe: focus, z-order, and
visibility never grant capability ("presentation is not authority"), and
hiding, moving, or rebinding an agent panel never moves its execution
target, duplicates its session, or widens its authority.

The binding relation itself — what it means for a surface to project an
execution, how many may, and how the relation survives rebuilds and restarts —
is recorded in [Execution-projection binding (candidate)](execution-projection-binding-candidate.md).

**Critical judgment:** the attention protocol ownership (plugin counter
versus host service) is explicitly open in the UI corpus, as are the final
state-axis set and persistence content. This page reads those as open and
records only the request-never-preempt direction and the agent-side mapping
above.

### Remote frontend (candidate)

The presentation layer extends over the remote direction without changing its
rules: a device on the network is another surface that projects panels, never
a second runtime. The terminal documentation corpus's candidate
remote-infrastructure record owns that direction's transport, session,
device-grant, and protocol content; this page records only the agent-facing
consequence.

- **The dashboard is a projection, not a runtime.** A Wheel dashboard on a
  remote device renders agent state, task progress, and control affordances
  as the remote projection of the same agent panels the local console
  projects. The device runs no model and hosts no agent: a command sent from
  it routes to the host and to its agents, composing with the recorded
  positioning that the remote client is a frontend of the workspace, panel,
  and agent architecture rather than a second terminal.
- **Attention and consent keep their recorded shape.** An attention request
  raised for a remote surface obeys the same discipline as any other
  surface — evidence reference, no re-raise, decision returns — and a
  decision made on the remote device is the same explicit act: focusing or
  dismissing on a phone approves nothing, and the consent-ledger entry
  remains its own act.
- **Projection still touches no identity.** Reaching an agent panel through a
  remote session neither moves an execution target nor widens authority, and
  a device grant neither widens agent authority nor converts into one.

Whether a remote device may hold an active binding for an agent panel or only
mirror an existing one, and how remote attention requests interleave with
local ones under the never-preempt rule, stay open with the remote record and
the binding record.

## Cross-cutting invariants

These compose the four layers; each is sourced and each is falsifiable:

| Invariant                     | Statement                                                                                                       | Layers |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ |
| No focus theft                | Agent notice is an attention request on host terms; never a focus grab or an unsolicited window.                | 3      |
| No target movement            | Presentation changes never move execution targets, duplicate sessions, or widen authority.                      | 3, 2   |
| No screen scraping            | Observation reads execution records and semantic zones; never rendered cells.                                   | 1      |
| No interleaved writers        | Interactive input has one fenced writer; transfer invalidates the old generation; takeover reconciles.          | 2, 0   |
| Suspend invalidates elevation | Suspend/dispose/reload returns authority to zero; re-grant requires a fresh prompt.                             | 0      |
| Death follows declared policy | Job lifetime scope is declared at spawn and executed on agent death; no silent kill or silent continuation.     | 0, 2   |
| Existence is not authority    | A created session, a hidden panel, and a visible surface all grant nothing; consent is separate and per action. | 0, 3   |

## Security review

This candidate must not contradict the normative security corpus, P0
invariants, or the accepted IPC contract:

- Every coupling path in this document is authorization-bearing: observation
  reads, executions, writer transfer, takeover, and control actions all
  re-pass least-privilege checks against the current caller and generation.
- Untrusted labeling survives every layer: terminal output, evidence, and
  attention payloads are untrusted observation and cannot become instruction
  or policy channels; compression never launders terminal output.
- Presentation stays outside authority: no focus, visibility, or panel
  state grants capability; hiding a surface cannot manufacture consent or
  lock the human out of oversight.
- Secret material stays minimized: environment awareness is sanitized and
  exported-only; durable recording requires consent, and no coupling path
  creates an ambient credential or a raw-log archive by default.
- The no-scrape rule reduces attack surface: the agent never depends on
  rendered content, so renderer-level confusion cannot steer agent behavior
  through observation.

No clause here weakens the normative security corpus linked from
[AI Architecture](../architecture/ai-architecture.md).

## Relation to existing systems

The draft layered models are candidate inputs only; the four-layer
vocabulary, the tier table, the invariant set, and the operation names
proposed here are **not** accepted by this candidate design and must not be
read as product, crate, package, protocol, file-schema, command, or release
decisions.

Lifecycle semantics stay with their owners: the accepted `AgentSession`
contract and its state machine stay with the [IPC and Agent RFC](ipc-agent-rfc.md);
agent levels and generation binding stay with [AI Architecture](../architecture/ai-architecture.md);
panel lifecycle states stay with the accepted panel contract in the terminal
documentation corpus; job lifetime scopes stay with [Execution supervisor
(candidate)](execution-supervisor-candidate.md); task durability and takeover
stay with [Event-sourced agent workspace (candidate)](event-sourced-agent-workspace-candidate.md)
and [Task lifecycle R5](../architecture/task-lifecycle-r5.md). Observation
channels stay with [Prompt Layering Design](../context/prompt-layering-design.md),
the context retention dispositions, and the [Wheel Context Runtime
(candidate)](../context/wheel-context-runtime-candidate.md); action ownership
stays with [Execution ownership R1](../architecture/execution-ownership-r1.md),
[Tool transport R2](../architecture/tool-transport-r2.md), and [Agent
Coordination Architecture](../agent/agent-coordination.md); presentation
stays with the terminal documentation corpus (panel runtime, UI runtime,
attention axis) and [Panel and agent workspace boundary (candidate)](panel-workspace-candidate.md).
The session container and recovery composition stay with [Session model
(candidate)](session-model-candidate.md). Each is referenced, never
duplicated or modified.

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) defines the only accepted
IPC wire, scope, and Agent vocabulary. Where the sketches here overlap
RFC-owned ground, the RFC wins without further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed
redaction, consented recording, secret minimization) override every
discussion example throughout this document. Coupling surfaces — attention
requests, console views, evidence references, and control actions — are
untrusted data paths: reading, forwarding, or claiming them grants no
authority; every resolution re-passes authorization, consent, redaction, and
budget checks. This draft creates or closes no AIQ or OQ identifier; open
questions stay with [AI Unresolved Questions](../product/ai-unresolved-questions.md)
and shared governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the coupling model falsifiable before it
constrains `bitty-ai`.

| Campaign               | Required observation                                                                                                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lifecycle independence | An agent survives panel closure with an explicit recorded transition while its execution target stays fixed, in reviewable tests.                                                                                                                                               |
| Suspend return-to-zero | A suspended agent loses elevation, and resumption requires a fresh consent grant; a stale handle fails closed, in reviewable tests.                                                                                                                                             |
| Tier-C handback        | Human takeover revokes or pauses automated input, pending actions reconcile instead of interleaving, and automation resumes only through an explicit handback, in reviewable tests.                                                                                             |
| One-shot dispatch      | An agent contribution to a user-interactive terminal completes as a dispatched execution with evidence and return, with no injected keystroke stream, in reviewable tests.                                                                                                      |
| No-scrape observation  | Agent context resolves from execution records and semantic zones alone, with no rendered-cell dependency, in reviewable tests.                                                                                                                                                  |
| Attention as request   | Blocked and consent-needing states surface as attention requests; no coupling path steals focus or opens a surface without a host decision, in reviewable tests.                                                                                                                |
| Attention mapping      | Every agent-side source (blocked work, consent need, completion) surfaces through one bounded request carrying an evidence reference; no re-raise before resolution; the decision returns as an observable event; attention never substitutes for consent, in reviewable tests. |
| Invariant floor        | Each cross-cutting invariant fails closed under its own adversarial fixture, in reviewable security tests.                                                                                                                                                                      |
| Headless parity        | Every coupling operation completes with no panel open, and the panel surface reproduces it as a projection, in reviewable tests.                                                                                                                                                |
| Remote frontend        | A remote device projects agent panels through the same presentation rules: no device-hosted model or agent runtime, attention requests and decisions keep the recorded discipline, and the device grant widens no authority, in reviewable tests.                               |

Promotion needs independent AI architecture, coordination, context-management,
persistence, terminal-owner, docs-curator, and security review. Route the
four-layer vocabulary, the tier table, the invariant set, and the operation
names to scoped owner tasks. This draft changes no normative contract and
authorizes no product code.

## References

- [AI Architecture](../architecture/ai-architecture.md)
  (Draft): comparative positioning, Environment Context, SOC compression, rich streaming, agent levels, shared model invariants; organized here into the coupling view.
- [IPC and Agent RFC](ipc-agent-rfc.md)
  (Accepted): `AgentSession`, scopes, authorization; the lifecycle anchor, restated only.
- [Execution ownership R1](../architecture/execution-ownership-r1.md)
  (Draft): execution ownership, headless as presentation; consumed for the action layer.
- [Agent Coordination Architecture](../agent/agent-coordination.md)
  (Draft): leases, the single fenced writer, panel-execution separation, control surface; consumed for actions and presentation.
- [Shared workspace services and agent coordination (candidate)](shared-workspace-services-candidate.md)
  (Draft): the Wheel-side writer-proposal flow for a user-interactive terminal; consumed for tier C.
- [Panel and agent workspace boundary (candidate)](panel-workspace-candidate.md)
  (Draft): panel identity rules, host-mediated surfacing; consumed for presentation.
- [Event-sourced agent workspace (candidate)](event-sourced-agent-workspace-candidate.md)
  (Draft): six objects, task-as-issue; consumed for lifecycle survival.
- [Execution supervisor (candidate)](execution-supervisor-candidate.md)
  (Draft): lifetime scopes, outcome split, no-default retry; consumed for death disposition and the input-needed attention source.
- [Session model (candidate)](session-model-candidate.md)
  (Draft): session container, recovery composition; extended with the coupling view.
- [Wheel Context Runtime (Candidate)](../context/wheel-context-runtime-candidate.md)
  (Draft): evidence, temperature, refinement; consumed for observation.
- [Prompt Layering Design](../context/prompt-layering-design.md)
  (Draft): runtime-delta layer; consumed for observation.
- [Panel environment awareness](../interfaces/panel-environment-awareness.md)
  (Draft): sanitized view, use-versus-read, env handles; consumed for observation discipline.
