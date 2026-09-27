---
title: Bitty-side integration input
description: Draft bitty-side handoff input assembling snapshot dispatch execution and transport requirements
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 41
---

# Bitty-side integration input

> Status: **draft**. This document is the formal handoff **input** from the
> `bitty-ai` side to the `bitty` terminal repository. It proposes requirements
> for `bitty`-owned capabilities; it records no `bitty` decision, authorizes no
> shipped behavior, closes no open question, and introduces no product code.
> Every requirement below names `bitty`-side ownership explicitly. The `bitty`
> repository decides acceptance, sequencing, and mechanism through its own
> review. Normative security and IPC obligations override any experimental
> adoption stated here.

## Purpose and scope

This input assembles three source groups:

1. Ten `bitty`-side blockers from the candidate direction, a single-author
   proposal, not an accepted decision.
2. The G-2/G-3 `bitty`-side gaps from the candidate direction, matching the
   direction preserved in
   [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md).
3. The merged R1 disposition in [Execution ownership R1](../architecture/execution-ownership-r1.md),
   the R2 transport open surface in [Tool transport R2](../architecture/tool-transport-r2.md),
   and the R5 lifecycle boundary in [Task lifecycle R5](../architecture/task-lifecycle-r5.md),
   with gap wording from [AI Vertical Slice Pressure Test](../product/ai-vertical-slice-pressure-test.md)
   and register entries from [AI Unresolved Questions](../product/ai-unresolved-questions.md).

No file in the `bitty` repository is read for writing or modified by this task;
sibling-repository facts below are cited from the candidate direction and the
pressure-test document only.

## Requirement inputs

Each item states the requested `bitty`-side capability, the owning side, a
suggested priority, and links to the R1 through R6 dispositions and the AIQ
register. Suggested priorities are input only; the `bitty` repository sets the
real priority.

### BII-01 Bounded terminal snapshot host service

Request a host-registered, zone-scoped, bounded `terminal.snapshot` handler
behind the existing `terminal.inspect` scope, returning a bounded snapshot data
object (terminal identity, generation, working directory, semantic zones,
bounded text, truncation flag, untrusted-surface marking) rather than internal
grid objects.

- Owner: `bitty` side (terminal host dispatcher and IPC scope owner).
- Suggested priority: P1 (hard blocker for live terminal context).
- Links: [Execution ownership R1](../architecture/execution-ownership-r1.md) (captured target
  and generation binding); [AI Vertical Slice Pressure Test](../product/ai-vertical-slice-pressure-test.md)
  G-2; [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
  sequencing step 4; AIQ-38 (generic execution and registry ownership across
  repositories).
- Suggested evidence: deterministic bounded snapshots under generation change,
  byte ceilings, and redaction; missing-handler behavior stays fail-closed as
  in the slice test `host_without_snapshot_handler_fails_closed`.

### BII-02 Generic host tool dispatch method

Request a host-registered generic tool-dispatch method with per-tool consent
and bounded results, usable by any agent or plugin caller, so that validated
tool calls reach real `bitty` capabilities (filesystem, process, terminal,
view, configuration, plugin effects) through authenticated IPC instead of
stopping at a stub.

- Owner: `bitty` side (host dispatcher owner).
- Suggested priority: P1 (hard blocker for live tool effects).
- Links: [Tool transport R2](../architecture/tool-transport-r2.md) (unified backend and
  declared placement); [AI Vertical Slice Pressure Test](../product/ai-vertical-slice-pressure-test.md)
  G-3; AIQ-33 (unified authorization and isolation backend); AIQ-36 (native
  versus MCP tool transport and bridge placement).
- Suggested evidence: unknown-tool, missing-consent, and missing-scope denials
  against the real dispatcher, matching the slice fail-closed tests.

### BII-03 Authorization gate before every real effect

Request that every real tool effect pass one common host effect gateway in a
fixed order (schema validation, captured target and generation resolution,
scope check, consent ledger check, effect policy, budget reservation,
attributed outcome) before reaching any execution backend, so that security is
built into dispatch rather than added after it.

- Owner: `bitty` side (authorization and consent enforcement owner).
- Suggested priority: P1 (effectful tools stay blocked until this exists).
- Links: [Tool transport R2](../architecture/tool-transport-r2.md) (gate order and fail-closed
  conditions); [Context retention R3](../architecture/context-retention-r3.md) (pre-queue and
  pre-write redaction inheritance); AIQ-33; AIQ-08 (stale schemas cannot
  authorize changed effects).
- Suggested evidence: gate-order proof shared across native and MCP paths with
  one consent ledger and one budget accounting, per the R2 evidence bar.

### BII-04 Generic supervised execution backend

Request a generic `bitty`-owned supervised execution primitive behind an
`ExecutionRequest` shape (executable, arguments, working directory,
environment policy, captured target, timeout, output budget) that owns process
and PTY handles, generations, isolation, and cleanup, with optional Panel
projection attached later without recreating the execution.

- Owner: `bitty` side (process and PTY resource owner).
- Suggested priority: P1 (blocks the first real `exec` tool).
- Links: [Execution ownership R1](../architecture/execution-ownership-r1.md) (option A,
  no-shell and no-panel validity); AIQ-38; AIQ-2A (no-UI execution feature
  profile).
- Suggested evidence: headless execution without Panel or shell under an
  authorized captured target, with later Panel projection of the same
  execution, per the R1 evidence bar.

### BII-05 Structured execution outcome with Unknown reconciliation

Request that the host execution backend return the full structured outcome
disclosure classes (`Succeeded`, `Failed`, `Cancelled`, `Unknown`) with bounded
redacted evidence references, so that uncertain effects reconcile by status
inspection or user direction before retry instead of blind retry.

- Owner: `bitty` side (execution backend owner).
- Suggested priority: P1 (safe execution blocker).
- Links: [Execution ownership R1](../architecture/execution-ownership-r1.md) (cancellation
  contract); [Tool transport R2](../architecture/tool-transport-r2.md) (attributed outcomes);
  AIQ-37 (structured exec result schema); AIQ-28 (critical-message
  acknowledgement and recovery).
- Suggested evidence: cancellation races on both sides of dispatch and
  post-dispatch `Unknown` outcomes reconciled before retry, with no rollback
  claim.

### BII-06 Versioned bridge client SDK for out-of-process consumers

Request a versioned, out-of-process bridge client SDK exporting the accepted
envelope, method registry, scope, and consent types, replacing the pinned Git
revision plus dependency-exception consumption of the internal IPC crate for
stable releases, versioning, and a clean dependency boundary.

- Owner: `bitty` side (IPC crate and distribution-boundary owner).
- Suggested priority: P2 (development continues on the pinned revision; stable
  release is blocked without it).
- Links: [AI Vertical Slice Pressure Test](../product/ai-vertical-slice-pressure-test.md)
  G-1; [Tool transport R2](../architecture/tool-transport-r2.md) (terminal-boundary rule and
  bridge process model); AIQ-36; AIQ-38.
- Suggested evidence: an external consumer build with no internal-crate Git
  dependency and no dependency-exception entry.

### BII-07 Bounded rich scene-fragment transport

Request a bounded scene-fragment ingestion method with a consumable fragment
contract (for example Markdown, diff, and tool-card fragments) so that an
out-of-process producer can publish fragments without serializing internal
scene nodes directly.

- Owner: `bitty` side (rich scene owner).
- Suggested priority: P2 (user-interface integration blocker, not an agent
  runtime blocker; plain text chunks through a simple panel suffice first).
- Links: [AI Vertical Slice Pressure Test](../product/ai-vertical-slice-pressure-test.md)
  G-4; [AI Architecture](../architecture/ai-architecture.md) (RS-2 single scene path).
- Suggested evidence: fragment ingestion under chunk ceilings with validation
  failures staying fail-closed.

### BII-08 Panel capability decoupling for AI-specific surface

Request review of the existing AI-named surface in the terminal runtime Panel
code (provider, stream, model, agent context, and invoke names) against a
generic panel provider service capability and generic context scopes, demoting
AI-specific core APIs to plugin or SDK primitives, and avoiding new AI logic
in that file while the review is pending.

- Owner: `bitty` side (terminal runtime and Panel owner).
- Suggested priority: P2 (does not block the AI runtime; prevents further
  ownership drift).
- Links: [Execution ownership R1](../architecture/execution-ownership-r1.md) (BA-2 agent
  versus AI split and BA-3 bridge process model); [AI Vertical Slice Pressure Test](../product/ai-vertical-slice-pressure-test.md)
  G-5; AIQ-29 (optional Panel and execution projection bindings).
- Suggested evidence: negative evidence that no core AI-specific API beyond
  generic primitives remains on the reviewed path.

### BII-09 Parallel work split across the two tracks

Record the proposed division of labor: the `bitty-ai` track completes the
agent kernel against deterministic doubles (agent loop, session, context
levels 0 and 1, tool contracts, provider abstraction, streaming, prompt
layering, code tools), while the `bitty` track completes the host capability
gateway (items BII-01 through BII-05 first), with the two tracks meeting at
the bridge when the gateway exists.

- Owner: shared sequencing note; `bitty`-owned items stay with the `bitty`
  side, `bitty-ai`-owned items stay with the AI runtime side.
- Suggested priority: sequencing input, not a capability priority.
- Links: [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
  (in-scope runtime versus non-goals); [Task lifecycle R5](../architecture/task-lifecycle-r5.md)
  (single lifecycle authority per track; handoff fencing).
- Suggested evidence: slice suite passing unmodified against new runtime paths
  until the live-host substitution point.

### BII-10 Suggested build order for the bitty track

Propose the following `bitty`-track order as input: first the bounded
`terminal.snapshot` service (BII-01), second generic host tool dispatch with
authorization and consent (BII-02 with BII-03), third the generic execution
backend with structured outcomes (BII-04 with BII-05), fourth the bridge
client SDK (BII-06), fifth rich fragment ingestion (BII-07), sixth Panel
capability cleanup (BII-08).

- Owner: `bitty` side (ordering input only).
- Suggested priority: P1 for the first three groups, P2 for the last three,
  matching the source proposal.
- Links: [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
  sequencing; [Persistence profile R6](../architecture/persistence-profile-r6.md) (durability
  deferral stays independent of this order).
- Suggested evidence: each group lands with its linked evidence bar before the
  next group starts.

## G-2 and G-3 confirmation

The candidate direction independently confirms the two load-bearing findings: G-2 (`terminal.snapshot` host service) and G-3 (generic Tool Bus
dispatch) are the cross-repository items that must be solved on the `bitty`
side, while the remaining gaps are packaging (G-1), transport (G-4), or design
reconciliation (G-5, G-6). This input carries that confirmation into BII-01
and BII-02 above rather than restating it as a separate requirement.

## Registry-split framing from Execution ownership R1

The R1 disposition resolves the MP-1 registry ownership versus BA-2 agent
versus AI split and BA-3 bridge process model conflict as follows: provider
registry implementation and all model input and output belong in the
independent AI helper behind scoped IPC; a terminal-side registry, if
retained, validates generic service metadata and mediates authorized requests
only, holds no credentials, and is never a provider implementation. Exact
registry split and owning crates remain draft choices. This framing bounds
BII-02, BII-04, and BII-06: native placement never means AI code in the
terminal process.

- Links: [Execution ownership R1](../architecture/execution-ownership-r1.md); [Tool transport R2](../architecture/tool-transport-r2.md)
  (terminal-boundary rule); AIQ-38; AIQ-36.

## Transport open surface from Tool transport R2

The R2 disposition freezes the required-control surface (authenticated
principal, ToolSpec and schema version, caller and target authorization,
consent, budget, placed dispatch, redaction, attributed outcome) with one
backend, one consent ledger, and one budget path, while leaving the transport
mechanism open: declared per-tool placement selects the MCP path or the native
path, MCP is the default vocabulary, terminal-owned effects pass only through
the terminal host boundary, and every listed fail-closed condition denies with
a typed error and no partial state. BII-02 and BII-03 request the `bitty`-side
half of that surface; the mechanism selection itself stays open under AIQ-33,
AIQ-36, AIQ-37, AIQ-38, and AIQ-08.

- Links: [Tool transport R2](../architecture/tool-transport-r2.md); [Command and tool architecture](../architecture/command-tool-architecture.md);
  AIQ-33; AIQ-36; AIQ-37; AIQ-38; AIQ-08.

## Lifecycle boundary from Task lifecycle R5

The R5 disposition selects a single lifecycle authority: the product Task
model owns product task transitions while CarryCtx serves as governance
backend-or-handoff facet behind narrow store traits, never as a second
lifecycle owner. Handoff is explicit and versioned with generation fencing;
independent review requires a different reviewer agent and session with the
requirement plus evidence in reviewer hands and a separate approval action;
critical messages (assignment, approval, cancellation, result acknowledgement)
must never silently drop and never imply effect success. For this input, the
boundary means: this document is a versioned handoff input with explicit
requirements and evidence pointers, not a lifecycle transition in either
repository; acceptance on the `bitty` side follows that repository's own
review and remains independent from this draft.

- Links: [Task lifecycle R5](../architecture/task-lifecycle-r5.md); [Agent coordination architecture](../agent/agent-coordination.md);
  AIQ-10 with the AIQ-56 alias; AIQ-26; AIQ-28.

## Explicit non-requests

To prevent scope drift, this input explicitly does not request:

- Growth of the generic `bitty-agent` vocabulary into model input and output,
  provider handling, context assembly, or real tool execution. That crate
  stays small by design.
- Rework of the accepted IPC framing, wire envelope, scope families, consent
  ledger, or channel bounds. Those primitives are sufficient.
- `bitty`-side ownership of persistence selection, language-service sharing,
  multi-agent organization, long-term memory, browser behavior, or remote
  compaction. Those are `bitty-ai`-side or deferred matters, linked to
  [Persistence profile R6](../architecture/persistence-profile-r6.md),
  [Code intelligence sharing R4](../architecture/code-intelligence-sharing-r4.md), and
  [Context retention R3](../architecture/context-retention-r3.md) for boundary clarity only.
- A home for the AI-consent to generic-scope mapping (pressure-test G-6)
  inside the `bitty` repository. That mapping stays a `bitty-ai-docs` plus
  governance matter.

## Verification plan

Each `bitty`-side item above names its own suggested evidence. In aggregate, a
future claim that this input is satisfied should additionally show
deterministic coverage with seeded registry, consent, schema-change, budget,
generation, and backend-absence fixtures; fail-closed behavior with no partial
state for every denial class; negative evidence of no AI code in the terminal
process; and retention inheritance (consented recording, pre-queue and
pre-write redaction, user-only storage, deletion propagation, typed
unavailable disclosure) for every persisted tool or execution record.

## Open points

This document changes the status of no register entry. AIQ-33, AIQ-36, AIQ-37,
AIQ-38, AIQ-08, AIQ-29, AIQ-2A, AIQ-10 with the AIQ-56 alias, AIQ-26, and
AIQ-28 stay open under the canonical admission rule cited by
[AI Unresolved Questions](../product/ai-unresolved-questions.md). Promotion of any
identifier requires that rule.

## Acceptance criteria

- Draft owner: CTX-0022 implementer (`ai-docs-ctx0022-impl`).
- Acceptance of this input document requires independent review by the
  architecture category owner, the docs curator, and a security reviewer. It
  is not granted by this draft.
- Suggested follow-ups, each as a separately scoped task: `bitty`-side
  requirement detailing per item once the `bitty` repository accepts the
  input; structured execution result schema representation (AIQ-37);
  AI-consent to generic-scope mapping home (G-6); bridge placement and generic
  backend ownership across repositories (AIQ-36 with AIQ-38).
- This task performs no commit, push, pull request, or edit to the `bitty`
  repository. Handoff delivery beyond this document belongs to the commander.

## References

- [Execution ownership R1](../architecture/execution-ownership-r1.md) (Draft): single-agent
  execution ownership, registry-split disposition, cancellation contract.
- [Tool transport R2](../architecture/tool-transport-r2.md) (Draft): unified backend, declared
  placement, fail-closed conditions, transport open surface.
- [Task lifecycle R5](../architecture/task-lifecycle-r5.md) (Draft): lifecycle authority,
  handoff contract, independent-review and critical-message rules.
- [Context retention R3](../architecture/context-retention-r3.md) (Draft): retention and
  redaction inheritance boundary.
- [Code intelligence sharing R4](../architecture/code-intelligence-sharing-r4.md) (Draft):
  sharing boundary, cited as non-request only.
- [Persistence profile R6](../architecture/persistence-profile-r6.md) (Draft): durability
  deferral boundary, cited as non-request only.
- [AI Vertical Slice Pressure Test](../product/ai-vertical-slice-pressure-test.md)
  (Draft): G-1 through G-6 gap wording and slice evidence.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) (Draft):
  experimental scope, non-goals, and sequencing.
- [AI Architecture](../architecture/ai-architecture.md) (Draft): bridge process model, Tool
  Bus, and Rich streaming vocabulary.
- [Command and tool architecture](../architecture/command-tool-architecture.md) (Draft): Core
  versus Lua boundary and tool classification.
- [Agent coordination architecture](../agent/agent-coordination.md) (Draft): lifecycle
  and delegation vocabulary for the R5 boundary.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-33,
  AIQ-36, AIQ-37, AIQ-38, AIQ-08, AIQ-29, AIQ-2A, AIQ-10 with the AIQ-56 alias,
  AIQ-26, and AIQ-28.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounding IPC framing,
  scopes, and lifecycle contracts.
