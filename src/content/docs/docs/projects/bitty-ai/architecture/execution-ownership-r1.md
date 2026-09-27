---
title: Execution ownership R1
description: Draft single-agent execution ownership decision for ExecutionContext and Panel projection
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 35
---

# Execution ownership R1

> Status: **draft**. This document records the CTX-0009 R1 draft disposition
> for single-agent execution ownership only. It proposes no accepted
> architecture, authorizes no shipped behavior, and closes no open question.
> Normative security and IPC obligations override any experimental adoption
> stated here. Multi-agent scope is frozen and deferred; see
> [Frozen multi-agent scope](#frozen-multi-agent-scope).

## Purpose and scope

This decision covers single-agent execution ownership only:

- `ExecutionContext` as primary execution record versus headless-panel-first
  ownership.
- Validity of no-shell and no-panel execution.
- Cancellation split between pre-dispatch prevention and post-dispatch
  `Unknown` reconciliation without rollback.
- Draft disposition of the MP-1 (Registry ownership) versus BA-2 (Agent versus
  AI split)/BA-3 (Bridge process model) registry conflict, preserving
  the rule that `bitty-agent` performs no model I/O.

Inputs are the single-agent sections of
[Agent coordination architecture](../agent/agent-coordination.md), the exec and Panel
material in [Command and tool architecture](command-tool-architecture.md), MP-1
(Registry ownership), BA-2 (Agent versus AI split), BA-3 (Bridge process
model), and MP-7 (`cancel`) in [AI Architecture](ai-architecture.md),
AIQ-29, AIQ-2A, and AIQ-38 in
[AI Unresolved Questions](../product/ai-unresolved-questions.md), and
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md). The accepted
[IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and the canonical security corpus linked
by [AI Architecture](ai-architecture.md) remain overriding authority.

No product code is introduced or described as implemented.

## Decision

**R1 selects option A as draft disposition: `ExecutionContext` primary with
optional Panel projection.**

The reconciled flow is:

```text
agent.exec()
  -> authorized ExecutionContext with captured target and generation
  -> supervised structured process, or PTY only when required
  -> bounded redacted execution evidence
  -> structured result

optional Panel -> projection of execution and retained evidence
```

**Option B is rejected as an ownership model.** The mandatory
`agent.exec -> Headless Panel -> PTY/process` path (via
[Command and tool architecture](command-tool-architecture.md))
is not adopted. A headless panel must not be required per agent, per execution,
or as the authority for process ownership, cleanup, or consent. Headed and
headless describe presentation only, not authority, persistence, or lifecycle.

This aligns with the existing draft reconciliation in
[Agent coordination architecture](../agent/agent-coordination.md) and
[Command and tool architecture](command-tool-architecture.md), and with the
experimental adoption row already recorded in
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md).

## Rationale

- An agent acquires an authorized execution target, not authority through panel
  occupancy. Deriving working directory, environment, or capability from the
  currently focused panel would conflate presentation with ownership.
- A structured build, test, or analysis task needs neither a shell nor a panel.
  Requiring either would force unnecessary PTY, shell, and UI surface for work
  that is fully described by a captured target and a supervised process.
- The supervising execution backend owns process and PTY handles, generations,
  and cleanup. A Panel may later project the same execution without recreating
  it, and many-to-many observation keeps independent lifetimes.
- PTY carries human-compatible terminal semantics only: stdout and stderr
  merge into a single byte stream at the PTY/kernel layer, so a terminal
  emulator cannot reliably attribute spans to streams. Structured command
  results (stdout, stderr, exit code, artifacts, task outcome) must therefore
  travel via the Execution Service, Process Supervisor, Shell Integration,
  typed outcome, or IPC — never be derived from PTY output. This is why
  execution, agent task/job state, and PTY stay separate: the PTY shows, the
  supervisor knows.
- Presentation movement (hide, show, move, detach) changes attachment only. It
  never moves the execution target, broadens context access, or manufactures
  consent.

## No-shell and no-panel validity

Both no-shell and no-panel executions are valid when authorized:

- No-shell execution covers supervised structured processes without shell
  parsing, shell history, or terminal emulation.
- No-panel execution covers background or headless work with no visible UI.
  Such an execution may later be projected by a Panel without being recreated.
- No-panel execution does not imply a persistent terminal daemon, detach and
  reattach across restarts, remote UI, or any new transport authority. Those
  broader features remain subject to the accepted headless deferral (ADR 0008)
  and trust-boundary gate cited by [Agent coordination architecture](../agent/agent-coordination.md)
  and [IPC and Agent RFC](../specifications/ipc-agent-rfc.md).
- No-UI scope for v0.1 is bounded task execution under explicit authorization,
  budgets, and evidence retention. Long-running servers, persistent services,
  and background daemons require an explicit feature-profile selection beyond
  this decision.

## Cancellation contract

Cancellation follows MP-7 (`cancel`) with an explicit dispatch boundary:

- **Pre-dispatch:** cancellation prevents any tool effect from starting.
  Incomplete streamed tool arguments and cancelled proposals are never
  dispatched and cause no effect.
- **Post-dispatch:** cancellation stops further admission and requests bounded
  cancellation of owned work. Already-started effects may have happened.
  The outcome is the actual recorded result or `Unknown`; reconcile uncertain
  effects by status inspection or user direction before retry.
- Cancellation never promises rollback or exactly-once effects.
- Cancellation of one waiter never cancels shared execution still required by
  another authorized waiter.
- Structured exec results must disclose failures, truncation, and `Unknown`
  outcomes with evidence references; a reference permits retrieval only after
  reader authorization and only while redacted records remain retained.

## MP-1 (Registry ownership) versus BA-2 (Agent versus AI split) and BA-3 (Bridge process model) disposition

**Red line preserved: `bitty-agent` performs no model selection, no model I/O,
and no API-key handling.**

MP-1 describes a host-owned and host-validated `ai.model` registry with
deferred owning-crate alternatives. Read literally as placing provider
implementation, model selection, LLM I/O, or API keys inside terminal Core,
those alternatives conflict with BA-2 and BA-3. This decision resolves the
conflict as draft disposition:

- BA-2 (Agent versus AI split) and BA-3 (Bridge process model) win on placement. Provider registry implementation and all
  model I/O belong in the independent AI helper behind scoped IPC, consistent
  with the bridge process model. The terminal side never loads AI code into
  the main process.
- A terminal-side registry, if retained, validates generic service metadata
  and mediates authorized requests only. It is not a provider implementation
  and holds no credentials.
- Exact registry split and owning crates remain draft choices. This section
  grants no permission to implement either contradictory location.
- Transport selection between native tools and MCP routing stays open under
  AIQ-36 and AIQ-38. Neither path bypasses the common authorization,
  target and generation binding, schema and effect validation, consent,
  budgets, redaction, and attributed outcomes required for every effect.

## Frozen multi-agent scope

Per the CTX-0009 task scope and the v0.1 non-goals in
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md), the following
are frozen and excluded from this decision:

- Manager and reviewer agents, teams, and organization graphs.
- Service sharing and LSP broker reuse beyond single-agent bounds.
- Cross-agent mailbox, messaging durability choices, and routing.
- Multi-agent budgets, hierarchical delegation, depth and fan-out policy.
- Independent-review separation criteria for multi-agent acceptance.

Pointers:

- Team, delegation, budget, and organization-graph proposals stay in
  [Agent coordination architecture](../agent/agent-coordination.md).
- v0.1 exclusion and sequencing stay in
  [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md).
- Multi-agent scope returns only after single-agent primitives prove stable.

## Verification plan

A future implementation claiming this disposition must show, at minimum:

- Headless execution without a Panel or shell under an authorized captured
  target and generation, with Panel projection attached later without
  recreating the execution.
- Cancellation races on both sides of dispatch: pre-dispatch starts no effect;
  post-dispatch reports actual or `Unknown` outcomes with reconciliation
  before retry and no rollback claim.
- Shared-execution evidence that one waiter's cancellation does not stop work
  still required by another authorized waiter.
- Structured exec results disclosing failures, truncation, and `Unknown`
  outcomes with bounded redacted evidence.
- Negative evidence that no structured result is derived from PTY output:
  exit codes, stream separation, and artifacts arrive via the supervised
  backend's typed outcome path, consistent with the single-stream limit
  above (a sibling conformance point: `bitty-agent`'s `AgentObservation`
  queue carries `ProcessExited { code }` without stream bytes and never
  places PTY descriptors in the queue).
- Negative evidence that `bitty-agent` performs no model selection, model I/O,
  or API-key handling, and that no Core AI-specific API exists beyond generic
  primitives.
- Deterministic headless coverage with seeded inputs and fail-closed budget,
  consent, and redaction checks.

## Open points

This document changes the status of no register entry:

- AIQ-29 (optional Panel and execution projection bindings) stays a design
  choice. Presentation movement cannot move execution targets.
- AIQ-2A (no-UI execution feature profile) stays a scope choice. Bounded work
  versus persistent services needs explicit profile selection.
- AIQ-38 (generic execution and registry ownership across repositories) stays
  a prerequisite. BA-2 and BA-3 are preserved; the exact split needs review.

Promotion of any of these identifiers requires the canonical admission rule
cited by [AI Unresolved Questions](../product/ai-unresolved-questions.md).

## Acceptance criteria

- Draft owner: CTX-0009 implementer (`ai-docs-ctx0009-impl`).
- Acceptance requires independent review by the architecture category owner,
  the docs curator, and a security reviewer, plus linkage of any promoted
  open question under the canonical rule. It is not granted by this draft.
- Suggested follow-ups, each as a separately scoped task: structured exec
  result schema, generic execution-backend ownership across repositories,
  no-UI feature-profile selection, and Panel-to-execution binding lifecycle.

## References

- [Agent coordination architecture](../agent/agent-coordination.md) (Draft):
  single-agent Panel reconciliation and supervision vocabulary.
- [Command and tool architecture](command-tool-architecture.md) (Draft):
  exec and Panel integration and native versus MCP transport status.
- [AI Architecture](ai-architecture.md) (Draft): MP-1 (Registry ownership),
  MP-7 (`cancel`), BA-2 (Agent versus AI split), BA-3 (Bridge process model),
  and the existing registry and transport reconciliation.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-29,
  AIQ-2A, AIQ-36, AIQ-37, and AIQ-38.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) (Draft):
  experimental scope, non-goals, and blocking questions.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounding IPC framing,
  scopes, and lifecycle contracts.
