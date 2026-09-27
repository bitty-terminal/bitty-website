---
title: Agent coordination architecture
description: Multi-agent workspace services, supervision, delegation, teams, and panel lifecycle
category: architecture
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 32
---

# Agent coordination architecture

## Purpose and scope

This specification defines agent coordination, workspace service supervision, multi-agent teams, delegation patterns, and panel lifecycle management for `bitty-ai`. The design separates agent identity from OS processes and model conversations, establishes service sharing with authorization boundaries, and defines team organization with explicit budgets and independent review.

**Draft relationship**: [AI Architecture](../architecture/ai-architecture.md) AG-4 (Least privilege at dispatch) constrains these coordination proposals; AG-5 distinguishes orchestration from execution. This document accepts no new mechanism.

## Identity and ownership

Agent identity is distinct from OS process and model conversation (source lines 41-112). A logical agent can be driven by an async state machine. The executor choice does not itself isolate faults or memory: blocking analysis needs bounded workers, and untrusted tools require host-enforced process/sandbox boundaries.

Candidate ownership separation:

| Object           | Owner and lifetime                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Agent/run        | AI runtime; reasoning state, attributed actions, and bounded cancellation tree                           |
| Execution        | Supervising execution backend; captured target, process ownership, effect outcome, and cleanup           |
| Workspace view   | Authorized content/environment identity, not a compositor tab or an ephemeral AgentWorkspace             |
| Tooling instance | Service supervisor; leased by compatible consumers, bounded by workspace/session policy                  |
| Evidence record  | Context/evidence store; retention and access independent of a live process                               |
| Panel/view       | Terminal/plugin presentation owner; refers to executions and observations without owning PTY descriptors |

`WorkspaceView` is a candidate term for a filesystem/worktree/overlay view. It must not alias the existing compositor `WorkspaceId` or `ViewId`, and must not turn ephemeral `AgentWorkspace` data into durable project state. A runtime may use opaque typed handles and resolve roots from target metadata; it should never derive execution cwd from the currently focused panel.

## Shared workspace services

### Service sharing key and authorization

A candidate compatibility key for shared services includes (source lines 156-205, 641-700):

- execution-target identity and generation;
- repository/worktree or overlay identity and canonical root identity;
- server executable/version identity, language, negotiated features and encoding;
- toolchain, relevant environment profile, initialization/configuration hashes;
- document-overlay namespace and access/isolation domain.

Do not hash raw credentials into public cache keys or logs. Use protected opaque environment identities, and treat any secret-dependent operation as unsuitable for generic reuse until its confidentiality policy is established.

Same commit, same language, or same visible workspace is insufficient. Different unsaved buffers, worktrees, containers, toolchains, or access domains need separate state unless the adapter proves isolation. A privileged server may index more files than a narrow caller may read: result filtering alone is not automatically a proof against cross-scope leakage. Prefer separate service domains when safe sharing cannot be established.

Authorize each acquisition, query, result delivery, and subscription against the current caller. Never union the capabilities of all attached agents. A lease references a service; it is not a transferable permission token.

### Supervision, pressure, and cancellation

Service states are Starting, Ready, Idle, Draining, Stopped, and Failed, with a fresh generation on restart (source lines 457-640, 742-756). Admission counts starting instances so concurrent requests cannot exceed the process budget before initialization completes. Reuse a single in-flight start for a compatible key; failure wakes every waiter with an attributed error.

Agent exit releases its handles and requests. A service stays warm only within an explicit idle/memory/process policy. Active requests and authorized long-running executions count as leases; a zero UI attachment count means nothing about safety to terminate. Expiring leases need heartbeat/reconciliation for crashed clients, not only reference counts and destructors.

Under pressure, stop admitting optional work, evict eligible idle instances, and bound restarts with backoff and a circuit breaker. Active work can be cancelled only through an explicit priority/budget policy with observable outcomes. Cancellation of one waiter must not cancel a shared operation still needed by another authorized waiter. Revocation immediately prevents new reads or effects for the revoked principal even if a service remains alive for others.

Use bounded graceful protocol shutdown followed by termination and reaping of the owned process family when needed. Track launch identity/generation and descendants using the supervising backend, not process-name matching or a stale PID alone. Never kill an editor's language server merely because its executable matches. Supervisor crash and host shutdown need an owned-process recovery plan; durable handles are not sufficient to safely adopt an arbitrary survivor.

Linux cgroup resource accounting is a deferred backend candidate (source lines 552-584), not a cross-platform guarantee or authorization mechanism. Controller availability, delegation, child escape, OOM attribution, and platform-specific containment need separate evidence. If a required isolation limit cannot be enforced, refuse that execution profile rather than silently running it unrestricted.

## Teams, delegation, and organization graphs

Retain explicit task ownership, independent review, scoped delegation, budgets, and compact reporting (source lines 773-1434). The proposed organization structure uses typed relations rather than a mandatory hierarchy:

- A task has one accountable owner at a time, a versioned assignment, scoped implementers, reviewers, consulted participants, and subscribers. RACI is useful metadata; it does not create capabilities or approval authority.
- Keep the delegation/authority lineage acyclic and single-parent for budget attribution. Task dependencies are a separately validated DAG. Review and consultation links can form a general graph without becoming authority edges.
- A lead can request a child only when its granted delegation profile permits it. Child authority is attenuated, never inherited wholesale or increased by depth, team membership, model choice, or role title. Earlier restrictive reviewer/implementer profiles remain the default; recursive leaders require an explicitly reviewed profile.
- Reserve global and ancestor token/cost, active-agent, process, queue, and deadline budgets atomically before admitting children. Reconcile unused reservations on exit. A parent handing a budget to a child cannot spend it again. A bounded depth and direct-report limit need measurements, not arbitrary defaults.
- On leader failure, fence the old assignment generation, reconcile outstanding work and uncertain effects, and hand off accountable ownership explicitly. A replacement leader must not duplicate every child or retry unknown effects.
- Separate implementation, independent review, and final acceptance. Identical model families or shared artifacts do not constitute independence on their own; the reviewer needs the requirement and evidence, not only the author's summary. A manager may inspect evidence when needed; banning all deep reading would weaken review.

Structured design reviews should contain proposal, evidence, dissent, verdict, and action items with bounded rounds and a decision owner. Avoid recursive agent chatter. Machine-verifiable status changes need no LLM call. Completed temporary teams release resources; retained decisions/artifacts follow consent, retention, and provenance rules rather than becoming permanent global memory.

Defer automatic promotion from a small task into an "AI Organization Runtime." First compare a single agent and a coordinator with a small bounded worker set against a hierarchical design on completion quality, coordination latency, duplicate work, cost, and recovery.

**Single-hop whole-batch admission evidence (experimental, single-hop budget facet only):** the sibling `bitty-ai` runtime admits each provider round's tool calls as one batch against the remaining logical-turn allowance (`ToolBus::precheck` against `min(configured_limit, MAX_TOOL_CALLS_PER_TURN) - calls_this_turn` with FS-AI1 transactional denial: over-allowance batches refused whole, nothing dispatched); merged in `bitty-ai` `d71fc30` (AI-0108). Atomic multi-party reservation and measured depth/fan-out bounds stay open — see [AI Unresolved Questions](../product/ai-unresolved-questions.md). This describes sibling behavior only as read.

## Context compilation and progressive disclosure

Context is a selected working set plus references, state, memory, and artifacts, distinct from the complete transcript (source lines 1436-1805, 2155-2400). The proposed six layers are selection categories, not six competing stores:

| Source layer    | Reconciliation with existing context design                                                  |
| --------------- | -------------------------------------------------------------------------------------------- |
| Identity        | Small role/instruction snapshot; effective capabilities remain host state, not prompt claims |
| Mission         | Bounded objective and constraints relevant to the current task                               |
| Workspace       | Authorized target/view, source revision, tool availability, and bounded map                  |
| Task            | Assignment generation, acceptance criteria, dependencies, evidence pointers                  |
| Working set     | Actual provider input assembled for one turn under the resolved token/byte budgets           |
| Episodic memory | Opt-in retained observations and approved knowledge; retrieved only as needed                |

Use the existing environment/knowledge/temporal planes and instruction epochs instead of inventing a second authority model. Runtime custody of context does not erase per-agent ownership, access, or deletion rules. A context graph is an index over records; the dependency subgraph may be acyclic while consultation and evidence references need cycle detection and bounded traversal. A relational store with typed edges is a simpler initial alternative to a dedicated graph database.

Candidate compilation pipeline:

1. Capture task/run, instruction epoch, caller policy, target snapshot, provider profile, and current budget. Preserve explicit user requirements and unresolved blockers before optional retrieval.
2. Discover authorized references and resolve bounded fragments. A ContextRef carries source/owner, target generation, revision or content hash, selector, trust/sensitivity, freshness, and retention state. A URI-shaped string is not a filesystem/network capability and cannot trigger arbitrary scheme loading.
3. Recheck access, redact, deduplicate by identity and compatible provenance, rank by task relevance, and select under the budget. Missing/deleted/expired references produce typed absence; `latest` must resolve to an immutable identity before use. Never silently substitute another revision.
4. Build a deterministic bundle for captured inputs, carrying included and omitted IDs, truncation, errors, and source references. Reserve room for tools, provider formatting, output, and model-specific overhead. Distinguish token estimates from billed usage.
5. Apply mandatory policy and size checks after optional summarization and before provider I/O. Failure of redaction or budgeting fails closed; an optional ranker failure can use a bounded policy-safe fallback, never the raw history.

Reference-first communication reduces copying, not necessarily provider input: the model ultimately needs resolved content. Count retrieval, ranking, summarization calls, cache misses, and all agents' usage when evaluating cost. Stable context ordering helps caching only when it does not delay revocation or hide a changed input.

Use progressive code reads (map, outline, symbol, original range, expanded file) and command records (summary, structured diagnostics, bounded raw ranges). Compression is lossy: preserve failures, warnings, skipped tests, unknown exit state, truncation, and the evidence route. The controlling rule is minimum sufficient, authorized, attributed context, not a ban on useful raw evidence. Terminal text and agent summaries of it remain untrusted observations.

Retention is bounded and consented; durable task/evidence metadata is distinct from ephemeral scratch and raw logs. Archive references can outlive a panel only while their records remain retained. Deletion needs tombstones and invalidation of derived summaries/caches according to policy; do not promise eternal replay or restore secrets from an archived environment.

## Messages, IPC, and recovery

Retain typed request/result/finding/review/blocker/notification messages and reference payloads (source lines 1806-1937, 2257-2400). Reuse the accepted local transport and bounds; an in-process channel does not remove caller checks. Workspace and global routing are logical scopes, not a new globally privileged socket, registry, or default TCP service.

Candidate coordination envelopes add message ID, authenticated sender and recipient generation, task/assignment version, correlation/causation ID, kind, bounded payload/reference list, deadline, and delivery state. Sender claims are validated at admission; spoofed `from` or `Decision` text cannot authorize an effect. Recipient context expansion reauthorizes every referenced item rather than inheriting the sender's read scope.

Distinguish three outcomes: accepted into a mailbox, delivered to a live recipient, and processed with an acknowledged result. None means that a tool effect succeeded. Loss-tolerant progress observations can coalesce or drop with counters. Task assignments, approvals, cancellation, and result acknowledgements must not silently disappear under observation-stream DropOldest rules. Refuse new requests or backpressure within accepted caps and expose the refusal.

If durable delivery is later selected, use bounded retention, deduplication, an outbox/inbox or equivalent transactional record, expiry, and explicit reconciliation. Do not claim exactly-once effects: a crash after execution but before acknowledgement leaves an Unknown outcome that needs status inspection or user direction. Retries use stable IDs and payload conflict checks; ordering is per task/recipient where needed, not a global total-order promise. Dead or stale routes fail closed. Backpressure never silently escalates into spawning another agent.

Keep communication records separate from the model transcript. Automatic context enrichment is bounded retrieval, not unconditional injection of every related graph node. Cross-workspace inspection requires explicit target grants; movement of a UI surface neither moves executions nor broadens context access.

## Panels, executions, leases, and human control

### Panel model reconciliation

The source first calls a Panel a projection (lines 1938-2154) and later calls it an owner of cwd, environment, I/O, and history (lines 2402-2490). Prefer the existing architecture's **Agent -> ExecutionContext <- Panel** model. A panel can project an execution's state/history but does not own PTY descriptors or become an execution merely because it has no visible UI.

Retain many-to-many observation and independent lifetimes; reject mandatory one-headless-panel-per-agent. A structured build tool or manager may need no panel and no shell. A background execution may be shown later without being recreated. Headed/headless describes presentation, not authority or persistence. The host's accepted lifecycle vocabulary remains unchanged; Created/Active/Idle/Archived/Destroyed is a proposed execution/history policy, not a replacement Panel Runtime state machine.

No-UI agent execution is distinct from a terminal daemon surviving GUI exit, detach/reattach across restarts, or remote UI. Those broader features remain subject to the accepted ADR 0008 deferral and trust-boundary gate linked by the existing architecture.

### Leases and access modes

The source's observe/assist/control ladder (lines 2705-2835) can be UX profiles over capabilities, but `control` cannot bundle input, spawning, interruption, cwd/environment modification, closure, and filesystem writes. Each effect needs its actual scope and consent. Observation itself is bounded: it does not grant raw environment, all history, input capture, or sibling logs.

Reject automatic headless control (lines 2773-2804). A fresh agent remains read-only. A separately approved task profile may permit particular actions in its execution target, whether or not it has a visible panel. Hiding a panel cannot manufacture consent or lock the human out of oversight.

A candidate lease binds principal/run, target/execution and generation, purpose, permitted operations, expiry, and assignment version. Several read leases can coexist. Interactive input has one fenced writer; transfer invalidates the old writer generation before the new writer is admitted. Human takeover revokes or pauses automated input and reconciles pending actions instead of interleaving keystrokes or replaying queued commands into a newly changed shell. Closing or archiving needs lifecycle authority and a check for other leases and active work; holding any lease is not ownership of the whole resource.

The sensitive-input interlock in the IPC RFC remains a candidate, not an implemented defense. Observation or grant possession must never be used to claim that secret-input automation is already safe.

### Lifecycle outcomes

| Event                            | Recommended outcome                                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Panel hidden, moved, or detached | Change presentation/attachment only; execution target and authority stay fixed                                                         |
| Agent finishes or fails          | Release its leases; cancel its owned transient work or explicitly hand off an authorized retained execution; unrelated work continues  |
| Execution exits                  | Record actual outcome and bounded evidence; attached agent may continue with another execution                                         |
| Last lease expires               | Evaluate supervised idle policy; do not infer a long-running server is safe to destroy from UI absence                                 |
| User requests closure            | Resolve exact resource/generation and impact; perform separately authorized lifecycle action; report evidence-retention outcome        |
| Archive requested                | Quiesce or explicitly stop owned execution, record outcome, then retain policy-approved evidence; archive is not a live shell snapshot |
| Runtime restarts                 | Recover authorized metadata and reconcile uncertain executions; stale handles/grants do not resurrect processes or effects             |

Reject the source's absolute "any node exits without affecting another" (lines 3312-3359). Identity lifetimes are independent, but cancellation, revocation, process failure, and resource disposal necessarily propagate bounded effects. An agent may survive panel closure while losing a tool stream or waiting for a replacement target. State that transition explicitly.

### User assistance and control console

For "why did my command fail?", resolve the explicitly selected terminal and command under read consent, obtain bounded redacted diagnostics and references, and preserve unknown exit/boundary state when shell integration is absent. Analysis does not automatically rerun the command. Proposed remedies are separate from dispatch, and any execution uses a captured target, current authorization, and its own evidence record.

Logical attachment, visible presence, presentation, and focus are distinct. Background attachment should not steal focus. Notifications are bounded and policy-controlled; showing a decision surface is a request to the host, not permission for an agent to open arbitrary windows. Users should be able to inspect or stop agent work through their authorized control surface even when execution is headless; automation resumes only through an explicit handback.

Retain the proposed console's organization/task/agent/panel/resource views, bidirectional attachment indexes, purpose labels, and correlated timelines (lines 3059-3377). Derive them from authoritative event/state records, not two independently writable indexes. Show target, assignment generation, actual execution state, reused versus fresh evidence, queue/dropped-event counts, CPU/memory attribution, estimated/billed tokens, blockers, and consent requests. Progress percentages need a defined denominator; unknown progress is preferable to fabricated precision. Kill/reassign/archive/message/focus UI actions pass the same authorization and generation checks as any other client.

## Design rationale summary

Agent coordination separates logical agent identity from OS processes and model conversations, enabling async state machines while preserving fault isolation through explicit boundaries. Shared workspace services reduce duplicate work through authorization-checked leases rather than ambient access. Multi-agent teams use explicit delegation budgets, independent review, and bounded hierarchies to avoid uncontrolled recursion and cost escalation. Panel-execution separation preserves many-to-many observation without conflating presentation with ownership or authority.

## Verification plan

This specification records the candidate direction through its critical synthesis and separately attributed comparative observations. It does **not** establish implementation of these coordination proposals. Verification requires:

- Accepted architectural decision records in `bitty-docs` for agent/process separation and service supervision
- `bitty-ai-core` Rust implementation of service supervisor, lease manager, team coordinator
- Service compatibility key schema and validation implementation
- Lease heartbeat, fencing, and recovery implementation
- Team budget reservation and reconciliation implementation
- Panel-execution projection implementation
- Control console UI implementation
- Performance evidence showing shared services reduce duplicate work without cross-scope leakage

## Open points

1. **Service compatibility key validation**: How is the compatibility key validated at runtime? What happens when components (toolchain, config, overlays) change after a service is started but before all waiters are satisfied?

2. **Cross-scope result filtering**: When a privileged language server indexes files beyond a narrow caller's read scope, what filtering mechanism prevents cross-scope leakage? Is filtering at result delivery sufficient, or does it require separate service domains?

3. **Lease heartbeat and reconciliation**: What is the heartbeat interval and timeout policy for lease reconciliation? How are crashed clients detected and their leases released?

4. **Budget reservation atomicity**: How are multi-level budget reservations (global, ancestor, child) made atomic across concurrent requests? What happens when a parent fails after reserving but before handing the budget to a child?

5. **Team depth and fan-out limits**: What are the measured bounds for delegation depth and direct-report limits? How are these enforced—statically at task creation or dynamically at child spawn?

6. **Independent review criteria**: What defines "independent review" when multiple agents share model families, code bases, or training data? Is there a minimum separation requirement?

7. **Context graph cycle detection**: How are cycles detected and bounded in the context reference graph when consultation and evidence references form a general graph? What is the traversal depth limit?

8. **Message delivery guarantees**: Are durable delivery, exactly-once semantics, and outbox/inbox patterns required for all message types, or only for critical coordination (assignments, approvals, cancellation)?

9. **Panel-execution binding lifetime**: When a panel projects an execution, how is the binding lifecycle managed across panel hide/show, workspace changes, and runtime restarts? Can one execution be projected by multiple panels simultaneously? The candidate binding model — creation, cardinality, lifecycle outcomes, and the single-authority record — is recorded in [Execution-projection binding (candidate)](../specifications/execution-projection-binding-candidate.md); enforcement details stay open.

10. **Headless execution scope**: What is the scope boundary for "no-UI agent execution"? Does it permit background build/test daemons, long-running servers, or persistent services, or is it limited to bounded task execution?

11. **Service state recovery after supervisor crash**: How does the supervisor recover service state after its own crash? Can it adopt surviving child processes, or must it restart all services?

12. **Lease writer fencing**: How is the "one fenced writer" for interactive input enforced across runtime restarts and concurrent takeover attempts? What prevents race conditions during writer transfer? The Wheel-side flow for requesting, deciding, committing, and returning the role in a user-interactive terminal is recorded in [Shared workspace services and agent coordination (candidate)](../specifications/shared-workspace-services-candidate.md#interactive-writer-proposals-user-interactive-terminal); the enforcement questions above stay open.

### Follow-up work

1. Independent review of this specification against existing AI architecture.
2. Resolve unresolved questions through targeted RFCs or open-question register entries.
3. Define service compatibility key schema and validation rules.
4. Specify lease lifecycle, heartbeat, and fencing mechanisms.
5. Define team budget reservation and reconciliation protocol.
6. Update `docs/README.md` navigation if this specification is accepted.
7. Cross-reference with IPC and Agent RFC for panel lifecycle contracts.

## References

- [AI Architecture](../architecture/ai-architecture.md) (Draft): overlapping scope; reconciliation required
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): Panel lifecycle and IPC contracts
- [Code Intelligence Architecture](code-intelligence.md) (Draft): companion specification for LSP sharing
