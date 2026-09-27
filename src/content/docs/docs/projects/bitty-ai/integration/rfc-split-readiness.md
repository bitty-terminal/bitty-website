---
title: RFC-split readiness evaluation
description: Draft evaluation of which draft specifications are ready to split into narrow RFCs with evidence bars
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 43
---

# RFC-split readiness evaluation

> Status: **draft**. This document evaluates the five candidate splits
> proposed in [AI Architecture](../architecture/ai-architecture.md) under
> `Future RFC split direction` (CTX-0023 proposal boundary). It is
> evaluation only. It accepts no Request For Comments, authorizes no shipped
> behavior, closes no Artificial Intelligence Question entry, revises no
> R1 through R6 draft disposition, and proposes no new identifier. Each
> future Request For Comments reuses existing open-question identifiers and
> needs its own contract, independent review, and implementation evidence.
> Normative security and IPC obligations override any experimental adoption
> stated here.

## Purpose and scope

This evaluation covers only the five CTX-0023 candidate splits:

- Provider Contract version 1 (ModelProvider operations, capability matching, selection policy primitives).
- Context Request version 1 (token-first request, budget, artifacts, attribution, truncation).
- Runtime Identity version 1 (protocol versus runtime identity separation, run plus session plus execution handles).
- Tool Dispatch version 1 (validation before dispatch, authorization backend, outcome disclosure).
- Prompt Assembly version 1 (stable-before-dynamic layer order, assembly precedence, capability separation).

Inputs are the CTX-0023 split list in
[AI Architecture](../architecture/ai-architecture.md), the R1 through R6 draft dispositions
in [Execution ownership R1](../architecture/execution-ownership-r1.md),
[Tool transport R2](../architecture/tool-transport-r2.md),
[Context retention R3](../architecture/context-retention-r3.md),
[Code intelligence sharing R4](../architecture/code-intelligence-sharing-r4.md),
[Task lifecycle R5](../architecture/task-lifecycle-r5.md), and
[Persistence profile R6](../architecture/persistence-profile-r6.md), the narrow scope gate in
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md), the gap wording
in [AI Vertical Slice Pressure Test](../product/ai-vertical-slice-pressure-test.md), the
register in [AI Unresolved Questions](../product/ai-unresolved-questions.md), the handoff
input in [Bitty-Side Integration Input](bitty-side-integration-input.md), the
read-only mapping in
[Bitty-Side Delivery Verification](bitty-side-delivery-verification.md), the
prompt facet in [Prompt Layering Design](../context/prompt-layering-design.md), the
stable-prefix facet in
[Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md), and the
accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) as overriding authority.

No product code is introduced or described as implemented. R3, R4, R5, and R6
subject matter has no corresponding candidate in the five-way split; retention,
sharing, lifecycle, and persistence stay with their draft dispositions and are
cited here only as boundaries.

## Method and inspection points

Inspection is read-only in both implementation repositories. No file in the
`bitty-ai` implementation repository was modified for this note, and no file
in the `bitty` terminal repository was read for writing or modified.

- Documentation inspection point is `bitty-ai-docs` `main` at `7098683`
  (CTX-0024 verification merge).
- Runtime inspection point is `bitty-ai` at `f53dc2b`
  (`AI-0023` bridge identity mapping plus consent-ledger seam).
- Host-shape inspection reuses the read-only mapping in
  [Bitty-Side Delivery Verification](bitty-side-delivery-verification.md) at
  `bitty` `main` at `eef983e` (`#702`, `#703`, `#705`, `#707`, `#709`,
  `#711`).

Test counts count `#[test]` attributes in the cited files at the runtime
inspection point. Runtime tests are deterministic and std-only with
caller-supplied `now_ms`; the `FakeProvider` covers all provider paths and no
network path exists in the inspected tree.

## Runtime evidence snapshot

The runtime tree holds 75 tests, grown from 59 by the 16 bridge tests landed
in `AI-0023`. The 16 bridge tests are additive; no prior test was removed or
rewired to pass.

| Location                                    | Tests | What the tests prove                                                                |
| ------------------------------------------- | ----- | ----------------------------------------------------------------------------------- |
| `bitty-ai-runtime` `bridge.rs` unit tests   | 16    | Wire-shape `owner.name` validation plus single-agent binding plus consent seam      |
| `bitty-ai-runtime` `provider.rs` unit tests | 7     | Deterministic `FakeProvider` replay plus descriptor mediation view                  |
| `bitty-ai-runtime` `context.rs` unit tests  | 7     | Token-first budget plus dedup plus artifact externalization plus typed absence      |
| `bitty-ai-runtime` `session.rs` unit tests  | 6     | Monotonic identity issuance plus bound identity plus deny-by-default elevation      |
| `bitty-ai-runtime` `tool.rs` unit tests     | 9     | Registry bounds plus duplicate fail-closed plus schema precheck plus tier isolation |
| `bitty-ai-runtime` `stream.rs` unit tests   | 4     | Sequenced fragments plus oversized rejection plus code-point safety                 |
| `bitty-ai-runtime` `runtime_fail_closed.rs` | 15    | Turn-level cancel plus budget plus denial plus `Unknown` reconciliation             |
| `bitty-ai-slice` `vertical_slice.rs`        | 11    | End-to-end deterministic turn on generic IPC primitives with fail-closed denials    |
| Total                                       | 75    | Skeleton plus seam coverage only, no live host, no network, no durability           |

Bridge landing detail (`AI-0023`, 16 tests): 4 protocol-identity shape tests
(`protocol_id_accepts_wire_shape` plus 3 rejection classes for malformed,
over-bound, and disallowed bytes), 4 single-binding tests (bind plus
idempotent rebind plus second-distinct rejection plus fail-closed lookups),
and 8 consent-seam tests (`DenyAllConsent` denial, exact-triple grant,
per-field exact match, refresh without growth, revoke plus expiry drain,
malformed-input rejection, bounded fail-closed ledger, bridge-plus-consent
composition before a `FakeProvider` turn). The module owns only the validated
wire principal `ProtocolAgentId`, the single-agent `IdentityBridge`, and the
`ConsentLedger` seam with `DenyAllConsent` and `FakeConsentLedger`. The real
ledger, capability enforcement, and execution backend stay host-owned.

Host-shape context from the verification note: bounded snapshot (`#703`, 8
unit plus 10 integration), generic dispatch with per-tool consent (`#705`, 9
unit plus 11 integration), execution shapes with structured `Unknown` query
path (`#707`, 13 unit plus 11 integration), publishable bridge client
(`#709`, 9 unit plus 10 integration), text-first fragment ingestion (`#711`,
11 unit), and a docs-only Panel reconciliation record (`#702`). Each shape
lands with deterministic bounded tests and fail-closed denials, and each
carries an explicit gap: no live terminal binding, no real capability
backends, no unified gate order with generation plus schema plus policy plus
budget accounting, no live cancellation proofs, no consumer substitution off
the pinned revision, no typed fragments, and no executed Panel demotion.

## Provider Contract version 1

Proposal boundary: ModelProvider operations, capability matching, selection
policy primitives.

Draft sources: MP-1 (Registry ownership), MP-2 (Provider descriptor), MP-5
(`complete`), MP-7 (`cancel`), MP-10 (API-key handling), MP-11 (Failure
isolation) in [AI Architecture](../architecture/ai-architecture.md); the R1 registry-split
framing in [Execution ownership R1](../architecture/execution-ownership-r1.md); the
experimental `FakeProvider` scope in
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md).

Readiness: **stay-draft**. The skeleton proves deterministic replay behind a
test double; it does not prove provider selection, capability negotiation, or
credential handling.

Evidence bar today:

- 7 `provider.rs` unit tests: `provider_id_shape`,
  `terminal_metadata_mirrors_descriptor_only`,
  `mediation_view_derives_from_helper_registry`, `script_replays_fifo_and_leaves_remainder`,
  `exhausted_script_returns_empty_turn`, `failures_do_not_consume_script`,
  `timeout_is_deterministic`. All run behind `FakeProvider` with no network,
  no filesystem, and no secret.
- Capability surface is a subset enum (`ModelCapability` text plus streaming
  plus tool-use) mirrored from descriptor to mediation view only. No
  capability negotiation with a live backend is exercised.
- Bridge composition test (`bridge_plus_consent_compose_before_fake_provider_turn`)
  proves the consent seam composes before a scripted turn, not that a real
  provider honors consent, budget, or redaction.
- R1 red line holds in prose and in skeleton shape: `bitty-agent` performs no
  model selection, no model input and output, and no API-key handling. No
  Core AI-specific API beyond generic primitives is introduced by the slice.

Gaps blocking a split:

1. Selection policy primitives are absent. No registry-backed selection,
   fallback, or cost-mark routing is implemented or tested.
2. MP-1 (Registry ownership) exact split stays a draft choice. Provider
   registry implementation belongs in the independent AI helper behind scoped
   IPC under BA-2 (Agent versus AI split) and BA-3 (Bridge process model);
   the terminal-side registry, if retained, validates generic service
   metadata only. Owning crates are undecided.
3. MP-10 (API-key handling) has no implementation evidence. User-only storage,
   allowlisted environment resolution, and typed secret redaction are
   requirements without a runtime proof.
4. No network provider path exists. OpenAI, Anthropic, Gemini, OpenRouter, and
   local-endpoint behavior are explicitly out of the v0.1 scope.

Split Request For Comments boundary draft (for a future task, not accepted here):

- In scope: `ModelProvider` operations (`list_models`, `complete`, `stream`,
  `cancel`), `ModelDescriptor` shape with bounded `provider_id` plus
  transport kind plus per-model capabilities plus context window plus cost
  marks plus privacy class, capability matching rules, selection policy
  primitives with deterministic fixtures, and the R1 red-line negative proof.
- Out of scope: registry crate ownership, credential storage mechanism,
  network adapters, cost accounting, and any terminal-side provider
  implementation.
- Required evidence before acceptance: selection-policy fixtures with seeded
  registries, capability-mismatch denials, credential-absence proofs, and
  failure-isolation proofs matching MP-11 (Failure isolation).
- Carried open questions, unchanged: AIQ-38 (Generic execution and registry
  ownership across repositories) for placement, plus provider-adjacent pricing
  and policy facets owned by governance. No new identifier is proposed.

## Context Request version 1

Proposal boundary: token-first request, budget, artifacts, attribution,
truncation.

Draft sources: CP-5 (Budget), CP-6 (Artifacts), CP-7 (Determinism and
testability) in [AI Architecture](../architecture/ai-architecture.md);
[Context management architecture](../context/context-management.md);
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) Levels 0 and 1;
the R3 retention floor in [Context retention R3](../architecture/context-retention-r3.md).

Readiness: **stay-draft**. Levels 0 and 1 behave deterministically under test;
budget authority, injection defense, and higher levels are not evidenced.

Evidence bar today:

- 7 `context.rs` unit tests: `stable_id_shape`,
  `unknown_provider_fails_closed`, `token_cap_limits_byte_budget`,
  `supersede_and_duplicate_collapse_to_newest`,
  `large_bodies_externalize_to_artifacts`,
  `truncation_prefers_low_priority_and_counts`,
  `dangling_reference_is_typed_absence`.
- Turn-level proofs in `runtime_fail_closed.rs`:
  `context_request_resolves_token_first_budget`,
  `l1_assembly_prunes_and_externalizes_inside_turn`, plus budget and
  truncation denials (`budget_exceeded_fails_before_dispatch`,
  `oversized_arguments_fail_with_no_dispatch`,
  `oversized_result_fails_after_single_dispatch`).
- Slice proofs in `vertical_slice.rs`: `context_budget_exceeded_fails_closed`
  and the deterministic end-to-end assembly path.
- Determinism follows CP-7 (Determinism and testability): seeded `now_ms`
  plus in-memory snapshots with no wall clock, filesystem, or network input.

Gaps blocking a split:

1. Only Levels 0 and 1 are implemented. Level 2 and above, `/compact`, and
   remote plus provider-native compaction are non-goals for v0.1 with no
   runtime proof.
2. AIQ-11 (Context injection-defense enforcement evidence) stays open as a
   truly blocking question for v0.1. Maintenance provably ignoring untrusted
   observations has no runtime proof.
3. The `32 KiB` byte default remains a candidate profile, not a core
   contract. Token-first resolution against model window plus per-turn token
   and cost budget has unit coverage but no live-provider calibration.
4. Retention inheritance (consented recording, pre-queue and pre-write
   redaction, user-only storage, deletion propagation, typed unavailable
   disclosure) is a prose floor from R3 with no durable-path proof, by design
   for the ephemeral v0.1.

Split Request For Comments boundary draft (for a future task, not accepted here):

- In scope: `ContextRequest` shape (`max_tokens`, `max_bytes`,
  `current_generation`), token-first resolution order, counted truncation with
  `truncated_tokens` plus `truncated_bytes` plus `truncated_providers`,
  artifact externalization with `artifact://` references, Stable Id
  attribution, and typed absence for dangling references.
- Out of scope: Level 2 and above, compaction, summarization, cross-session
  memory, retention backend, and any provider-specific budget calibration.
- Required evidence before acceptance: token-first fixtures across scripts
  and encodings, priority-ordered truncation matrices, artifact-reference
  round-trips under consent and redaction gates, and injection-defense proofs
  for AIQ-11 (Context injection-defense enforcement evidence).
- Carried open questions, unchanged: AIQ-01 (Per-request versus incremental
  context generation), AIQ-02 (Compression backend selection), AIQ-03
  (Artifact expiry and reference invalidation), AIQ-04 (Selection priority
  versus durable retention authority), AIQ-06 (Re-expansion after projection
  compaction), AIQ-07 (Cross-session memory retrieval mechanism), AIQ-11
  (Context injection-defense enforcement evidence), and AIQ-57
  (Reconstruction after deletion, expiry or destructive journal reduction).
  No new identifier is proposed.

## Runtime Identity version 1

Proposal boundary: protocol versus runtime identity separation, run plus
session plus execution handles.

Draft sources: session plus identity vocabulary in
[AI Architecture](../architecture/ai-architecture.md); the single-agent baseline in
[Execution ownership R1](../architecture/execution-ownership-r1.md); the P1 bridge module in
the runtime tree; supervision vocabulary in
[Agent coordination architecture](../agent/agent-coordination.md).

Readiness: **stay-draft**. Single-agent separation is the closest candidate
to a future split, but Panel projection, live handles, and fencing proofs are
missing.

Evidence bar today:

- 8 identity-shape and binding tests in `bridge.rs`: wire-shape acceptance
  plus 3 rejection classes, single-pair bind, idempotent rebind,
  second-distinct rejection, and fail-closed lookups. The bound mirrors the
  generic wire rule exactly (`owner.name`, one dot, lowercase segments,
  total `128` bytes or fewer, each segment `64` bytes or fewer) without
  importing the protocol type.
- 6 `session.rs` unit tests: `id_issuer_starts_at_one_and_increases_monotonically`,
  `session_preserves_bound_identity`, `fresh_session_is_inspect_active`,
  `cancel_is_idempotent_and_shared`, `elevation_denied_by_default_and_reset_by_rotation`,
  `terminal_session_rejects_elevation`.
- Execution-handle vocabulary exists as `AgentId`, `RunId`, `SessionId`, and
  `ExecutionId` with captured target and generation binding in prose, plus
  cancellation following MP-7 (`cancel`) with pre-dispatch prevention and
  post-dispatch `Unknown` reconciliation.
- Host-side execution shapes exist (`#707`) with `ExecutionRequest`,
  closed `EnvPolicy`, and stored-outcome `reconcile` plus `resolve`, but the
  module owns no socket, spawns no process, and wires no Panel projection.

Gaps blocking a split:

1. Only the single-agent binding is implemented. At most one protocol-to-
   instance pair exists; multi-agent teams, delegation graphs, and shared
   budgets stay frozen and deferred by R1 scope.
2. Panel projection is prose only. Headless execution without Panel or shell
   under an authorized captured target, with later projection of the same
   execution, has no live proof on either side.
3. Generation fencing, lease heartbeat, supervisor crash adoption, and writer
   transfer races stay open. Live cancellation races on both sides of dispatch
   against real processes are not proven.
4. BII-08 Panel decoupling is a docs-only record (`#702`). The requested
   negative evidence of no Core AI-specific API beyond generic primitives on
   the reviewed path is not yet available.

Split Request For Comments boundary draft (for a future task, not accepted here):

- In scope: wire principal validation (`owner.name` shape and bounds),
  runtime-local `AgentInstanceId` issuance, single-agent `IdentityBridge`
  binding rules with idempotent rebind and distinct-binding denial,
  `RunId` plus `SessionId` plus `ExecutionId` handle semantics, captured
  target and generation binding, and the MP-7 (`cancel`) split between
  pre-dispatch prevention and post-dispatch `Unknown` reconciliation.
- Out of scope: multi-agent organization, Panel implementation, process and
  PTY ownership, lease timing, crash adoption, and registry crate ownership.
- Required evidence before acceptance: headless execution without Panel or
  shell with later projection of the same execution, cancellation races on
  both sides of dispatch, shared-execution proofs where one waiter canceling
  never stops work still required by another authorized waiter, and negative
  evidence that `bitty-agent` performs no model selection, no model input and
  output, and no API-key handling.
- Carried open questions, unchanged: AIQ-29 (Optional Panel and execution
  projection bindings), AIQ-2A (No-UI execution feature profile), AIQ-38
  (Generic execution and registry ownership across repositories), AIQ-23
  (Lease heartbeat and crash reconciliation), AIQ-2B (Supervisor crash
  recovery and adoption), and AIQ-2C (Interactive writer fencing). No new
  identifier is proposed.

## Tool Dispatch version 1

Proposal boundary: validation before dispatch, authorization backend, outcome
disclosure.

Draft sources: TB-1 (MCP as adapter), TB-2 (ToolSpec registry), TB-3
(Validation before dispatch), TB-4 (Capability and consent per tool), TB-6
(Budgets and backpressure) in [AI Architecture](../architecture/ai-architecture.md); the
unified-backend disposition in [Tool transport R2](../architecture/tool-transport-r2.md); the
cancellation contract in [Execution ownership R1](../architecture/execution-ownership-r1.md);
FS-AI1 (fail whole with no partial state) and FS-AI7 (refuse rather than
serve unbounded or unredacted) failure semantics.

Readiness: **stay-draft**. Validation-before-dispatch plus fail-closed denial
is the best-tested runtime surface, but the unified backend mechanism itself
remains an open selection.

Evidence bar today:

- 9 `tool.rs` unit tests: `tool_name_shape`, `registry_bound_is_fail_closed`,
  `duplicate_registration_is_fail_closed`,
  `duplicate_reports_even_when_registry_is_full`,
  `register_revalidates_specs_built_without_new`,
  `legacy_dotted_tool_call_fails_as_invalid_name`,
  `precheck_over_limit_leaves_no_partial_state`, `missing_authorizer_denies`,
  `inspect_tier_cannot_reach_mutating_tools`.
- Turn-level denial proofs in `runtime_fail_closed.rs` (15 tests), including
  unknown-tool denial, deny-by-default without authorizer, oversized argument
  and result denials, burst denial before any dispatch, legacy dotted-name
  denial, budget denial before dispatch, and `Unknown` handling without
  session failure.
- Slice denial proofs in `vertical_slice.rs` (11 tests), including unknown
  tool, write-tool denied by default, call-limit enforcement, oversized chunk
  handling, ceiling enforcement, and missing-consent plus missing-scope
  denials.
- Gate-order shape is implemented as a draft disposition: authenticated
  principal, ToolSpec plus schema version resolution, caller plus target plus
  generation authorization, per-tool capability plus consent grant check,
  budget reservation, placed dispatch, typed redaction, attributed outcome.

Gaps blocking a split:

1. AIQ-33 (Unified authorization and isolation backend) stays open as a
   prerequisite. The required-control surface is frozen as draft disposition;
   the backend mechanism itself remains an open selection with no live proof.
2. AIQ-36 (Native versus MCP tool transport and bridge placement) stays open.
   MCP remains the default vocabulary in prose, but no MCP path is proven and
   no real capability backend (filesystem, process, terminal, view,
   configuration, plugin effects) is wired.
3. BII-03 verification finds the host prefix missing schema-version checks,
   captured-generation resolution, effect policy beyond the `allow_effects`
   boolean, and budget reservation or accounting. A single shared ledger and
   a single shared budget path across native and MCP paths with a shared
   gate-order proof are not shown.
4. AIQ-37 (Structured exec result schema) stays open. Disclosure classes
   (`Succeeded`, `Failed`, `Cancelled`, `Unknown`) and the
   reconcile-before-retry rule are inherited; representation is not selected.
   AIQ-08 (MCP schema cache invalidation) stays open for stale-schema denial.

Split Request For Comments boundary draft (for a future task, not accepted here):

- In scope: TB-2 (ToolSpec registry) bounds (name, description, JSON Schema,
  per-session spec cap), TB-3 (Validation before dispatch) with whole-failure
  and no-partial-state rule, declared per-tool placement (`mcp` or `native`
  with named reviewed backend and recorded reason), the ordered gate set
  shared by both paths, the 10 fail-closed denial classes from R2, and the
  attributed-outcome disclosure classes with reconcile-before-retry.
- Out of scope: backend mechanism selection, bridge placement and generic
  backend ownership, MCP adapter implementation, exec result schema
  representation, and Core versus Lua split enforcement.
- Required evidence before acceptance: shared ledger plus shared budget
  accounting across both paths, negative direct-spool proofs, placement
  proofs for every registry entry, fail-closed proofs for each numbered R2
  condition including stale schema and revoked-between-check-and-dispatch
  grants, terminal-boundary proofs with no AI code in the terminal process,
  cancellation races on both paths, and retention-inheritance proofs for tool
  records.
- Carried open questions, unchanged: AIQ-33 (Unified authorization and
  isolation backend), AIQ-36 (Native versus MCP tool transport and bridge
  placement), AIQ-37 (Structured exec result schema), AIQ-38 (Generic
  execution and registry ownership across repositories), and AIQ-08 (MCP
  schema cache invalidation). No new identifier is proposed.

## Prompt Assembly version 1

Proposal boundary: stable-before-dynamic layer order, assembly precedence,
capability separation.

Draft sources: [Prompt Layering Design](../context/prompt-layering-design.md);
[Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md);
AG-4 (Least privilege at dispatch) in [AI Architecture](../architecture/ai-architecture.md);
the Core-versus-Lua boundary in
[Command and tool architecture](../architecture/command-tool-architecture.md).

Readiness: **stay-draft**. This candidate is the farthest from a split, with
illustrative sketches only and zero runtime tests.

Evidence bar today:

- No prompt assembly module exists in `bitty-ai-runtime`. The only
  prompt-adjacent code is a `prompt` string parameter passed into the agent
  turn plus a session helper comment about a fresh prompt. Zero `#[test]`
  attributes cover prompt layering, assembly order, or capability separation.
- Design direction exists in prose: five prompt layers (Core Contract, User,
  Project `.wheel`, Skills and Agent profile, Runtime and Turn) assembled
  stable-before-dynamic, aligned with the seven stable-prefix layers (Runtime
  Protocol and Core System Prompt, Stable Tool Schemas, Stable Loaded Skills,
  Project and Workspace Context, Conversation and Agent History, Tool Results
  and Runtime State, Current Turn), with prompt text never granting capability
  under AG-4 (Least privilege at dispatch) and profiles staying single-agent
  for v0.1.
- Harness-budget material from the candidate direction is preserved as
  order-of-magnitude observations only, with verification limits stated in
  the design document. No benchmark, provider trace, or runtime measurement
  is cited.
- Stable-prefix claims are design reasoning awaiting measurement. No
  hit-rate improvement is claimed or measured.

Gaps blocking a split:

1. No serializer is adopted. AIQ-12 (Canonical serialization and
   stable-prefix ordering) stays open; deterministic encoding is a
   prerequisite for any prefix-cache claim.
2. No key scope is adopted. AIQ-13 (Provider-scoped prefix-cache key and
   routing scope) stays open; implicit versus explicit caching, no
   cross-provider reuse, and retention disclosure are undecided.
3. Enforcement of the Core and Lua split stays open under AIQ-31
   (Trait, lint, and review enforcement of Core and Lua split) with promotion
   review under AIQ-32 (Workflow-to-AI-Core promotion review) and
   registration under AIQ-34 (Command registration API and versioning).
   Manifest and profile sketches are configuration shapes, not ownership
   assignments.
4. Skill format stays open under AIQ-09 (Skill format, versioning, and
   ecosystem compatibility). Loading declarations grants no execution
   authority, and a narrowed tool list is a request the dispatcher may deny.
5. Panel projection questions stay with AIQ-29 (Optional Panel and execution
   projection bindings). Prompt text carries Panel invariants as contract
   content, never as a new Panel state machine.

Split Request For Comments boundary draft (for a future task, not accepted here):

- In scope: five prompt layers with stable-before-dynamic assembly order,
  precedence rules within non-overridable security ceilings, capability
  separation stating that prompt text never grants authority, single-agent
  profile scope for v0.1, and alignment with the stable-prefix layering order.
- Out of scope: serializer selection, epoch schema, planner types, Level 2
  and above compaction, `.wheel` manifest ownership, skill format, command
  registration API, and any cache-hit-rate guarantee.
- Required evidence before acceptance: conformance tests pinning layer order
  with fixtures for dynamic-value placement (time, working directory, branch,
  model name, remaining budget, dimensions, token usage), negative tests
  proving prompt text cannot widen capability, and measured prefix-cache
  observations once AIQ-12 (Canonical serialization and stable-prefix
  ordering) is selected.
- Carried open questions, unchanged: AIQ-09 (Skill format, versioning, and
  ecosystem compatibility), AIQ-12 (Canonical serialization and
  stable-prefix ordering), AIQ-13 (Provider-scoped prefix-cache key and
  routing scope), AIQ-29 (Optional Panel and execution projection bindings),
  AIQ-31 (Trait, lint, and review enforcement of Core and Lua split), AIQ-33
  (Unified authorization and isolation backend), and AIQ-34 (Command
  registration API and versioning). No new identifier is proposed.

## Cross-cutting readiness summary

| Candidate            | Readiness  | Closest evidence                             | Load-bearing gap                                                     |
| -------------------- | ---------- | -------------------------------------------- | -------------------------------------------------------------------- |
| Provider Contract v1 | Stay-draft | 7 `FakeProvider` replay tests                | Selection policy plus credential handling absent, AIQ-38 open        |
| Context Request v1   | Stay-draft | 7 unit plus turn-level L0 and L1 proofs      | AIQ-11 blocking, L2 and above absent, byte default is candidate only |
| Runtime Identity v1  | Stay-draft | 8 bridge plus 6 session tests, closest split | No Panel projection wiring, fencing plus crash proofs absent         |
| Tool Dispatch v1     | Stay-draft | 9 unit plus 15 turn plus 11 slice denials    | AIQ-33 mechanism open, MCP path absent, BII-03 gaps                  |
| Prompt Assembly v1   | Stay-draft | Zero runtime tests, prose direction only     | AIQ-12 plus AIQ-13 open, no measurement, illustrative sketches only  |

No candidate is ready to split into a narrow Request For Comments in this
increment. Runtime Identity version 1 is the closest because its
single-agent wire separation is fully tested at the seam, followed by Tool
Dispatch version 1 because its denial surface is the best-tested runtime
behavior. Context Request version 1 follows with Levels 0 and 1 proven but
blocking questions open. Provider Contract version 1 and Prompt Assembly
version 1 trail because selection plus credentials and serialization plus
measurement respectively have no runtime proof at all.

## Open points

This evaluation changes the status of no register entry. The following stay
open under the canonical admission rule cited by
[AI Unresolved Questions](../product/ai-unresolved-questions.md):

- R1 scope: AIQ-29 (Optional Panel and execution projection bindings), AIQ-2A
  (No-UI execution feature profile), AIQ-38 (Generic execution and registry
  ownership across repositories).
- R2 scope: AIQ-33 (Unified authorization and isolation backend), AIQ-36
  (Native versus MCP tool transport and bridge placement), AIQ-37
  (Structured exec result schema), AIQ-38 (Generic execution and registry
  ownership across repositories), AIQ-08 (MCP schema cache invalidation).
- R3 scope: AIQ-01 (Per-request versus incremental context generation)
  through AIQ-11 (Context injection-defense enforcement evidence) and AIQ-57
  (Reconstruction after deletion, expiry or destructive journal reduction).
- R4 scope: AIQ-21 (Service compatibility-key validation and invalidation),
  AIQ-22 (Cross-scope service non-disclosure mechanism) with the AIQ-42
  alias, AIQ-41 (Document overlay coordination) through AIQ-48
  (Warm-service and restart policy), with AIQ-23, AIQ-2B, AIQ-2C, AIQ-58, and
  AIQ-59 as adjacent open facets.
- R5 scope: AIQ-10 (Task lifecycle authority and CarryCtx backend and
  handoff) with the AIQ-56 alias, AIQ-26 (Independent review evidence
  criteria), AIQ-28 (Critical-message acknowledgement and recovery).
- R6 scope: AIQ-51 (Schema and transaction boundaries) through AIQ-5C
  (Standalone AI persistence and release profile).
- Prompt scope: AIQ-09 (Skill format, versioning, and ecosystem
  compatibility), AIQ-12 (Canonical serialization and stable-prefix
  ordering), AIQ-13 (Provider-scoped prefix-cache key and routing scope),
  AIQ-29 (Optional Panel and execution projection bindings), AIQ-31 (Trait,
  lint, and review enforcement of Core and Lua split), AIQ-33 (Unified
  authorization and isolation backend), AIQ-34 (Command registration API and
  versioning).

The R1 through R6 draft dispositions are referenced as boundaries only and
are not revised by this document. The CTX-0023 split list is referenced as
proposal boundary only and is not promoted by this document.

## Acceptance criteria

- Draft owner: CTX-0025 implementer (`ai-docs-ctx0025-impl`).
- Acceptance of any future split Request For Comments requires its own scoped
  task with independent review by the architecture category owner, the docs
  curator, and a security reviewer, plus linkage of any promoted open
  question under the canonical rule. It is not granted by this draft.
- Suggested follow-ups, each as a separately scoped task: narrow identity-seam
  hardening toward a future Runtime Identity version 1 split once Panel
  projection and fencing proofs exist; shared gate-order proof toward a
  future Tool Dispatch version 1 split once AIQ-33 and AIQ-36 mechanisms are
  selected; injection-defense proofs toward a future Context Request version
  1 split once AIQ-11 is evidenced; selection-policy plus credential-absence
  proofs toward a future Provider Contract version 1 split; serializer
  selection plus measurement toward a future Prompt Assembly version 1 split.
  Durability, sharing, lifecycle, and release scope stay with R3 through R6
  and are not split candidates here.

## References

- [AI Architecture](../architecture/ai-architecture.md) (Draft): umbrella with the CTX-0023
  five-way split proposal, ModelProvider, ContextProvider, Tool Bus, Agent
  levels, and Rich streaming vocabulary.
- [Execution ownership R1](../architecture/execution-ownership-r1.md) (Draft): single-agent
  execution baseline and registry-split framing.
- [Tool transport R2](../architecture/tool-transport-r2.md) (Draft): unified-backend draft
  disposition and fail-closed evidence bar.
- [Context retention R3](../architecture/context-retention-r3.md) (Draft): consent-bounded
  retention floor inherited by context and tool records.
- [Code intelligence sharing R4](../architecture/code-intelligence-sharing-r4.md) (Draft):
  sharing boundary, cited as non-candidate only.
- [Task lifecycle R5](../architecture/task-lifecycle-r5.md) (Draft): lifecycle authority
  boundary, cited as non-candidate only.
- [Persistence profile R6](../architecture/persistence-profile-r6.md) (Draft): durability
  deferral boundary, cited as non-candidate only.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) (Draft):
  experimental scope, non-goals, and blocking questions.
- [AI Vertical Slice Pressure Test](../product/ai-vertical-slice-pressure-test.md)
  (Draft): gap wording and slice evidence.
- [Bitty-Side Integration Input](bitty-side-integration-input.md) (Draft):
  BII-01 through BII-10 with G-2 and G-3 confirmation.
- [Bitty-Side Delivery Verification](bitty-side-delivery-verification.md)
  (Draft): read-only host-shape mapping with gaps.
- [Prompt Layering Design](../context/prompt-layering-design.md) (Draft): five-layer
  prompt direction with capability separation.
- [Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md)
  (Draft): stable-prefix layering with measurement deferred.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): open
  register entries, unchanged by this note.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounding IPC framing,
  scopes, and lifecycle contracts.
