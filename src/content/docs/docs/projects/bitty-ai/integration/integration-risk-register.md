---
title: Cross-repo integration risk register
description: Draft handoff register of eight bitty-ai and bitty cross-repo integration risks from review-07
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 49
---

# Cross-repo integration risk register

> Status: **draft**. This register is a handoff **request** from the `bitty-ai`
> side that records eight cross-repository integration risks. It is not a
> `bitty` decision: it grants no `bitty`-side acceptance, sets no `bitty`-side
> priority or sequencing, closes no open question, opens no new identifier, and
> changes no product code. Each entry names the side that owns the decision as
> an input only; the `bitty` repository decides through its own review. The
> normative security and IPC obligations in the accepted
> [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and the governance corpus override any
> suggestion here.

## Purpose

The risks were assembled from a read-only review of the integration surfaces
between `bitty-ai` and the bitty main repository (eight integration risks, with
test gaps used as context). Code cited below was inspected as evidence only and
never executed.

The [Bitty-Side Integration Input](bitty-side-integration-input.md) remains the
authoritative handoff of `bitty`-side capability requirements (BII-01 through
BII-10); the [Bitty-Side Delivery Verification](bitty-side-delivery-verification.md)
remains the authoritative read-only verification of delivered `bitty` items.
This register adds only the cross-repository integration-risk view and does not
repeat or amend their normative wording.

## Source identity

Evidence anchors name a revision and a file line at that revision. Two source
revisions are used:

- `bitty-ai@1bc2456` - local `bitty-ai` `main` head inspected for this register.
- `bitty-ipc@2cbb1fb` - the pinned `bitty-ipc` git revision in
  `bitty-ai@1bc2456 crates/bitty-ai-slice/Cargo.toml:18`, part of the `bitty`
  repository.
- `bitty@main@06bc1f4` - local `bitty` `main` head inspected for this register.

## Disposition

This register changes the status of no register entry. AIQ-33, AIQ-36, AIQ-37,
AIQ-38, AIQ-08, and AIQ-29 stay open under the canonical admission rule cited by
[AI Unresolved Questions](../product/ai-unresolved-questions.md); this register references
them and creates none.

This register explicitly does not:

- record, imply, or request a `bitty`-side acceptance, priority, sequencing, or
  mechanism decision;
- restate the normative IPC, consent, transport, or lifecycle text; those stay
  in [IPC and Agent RFC](../specifications/ipc-agent-rfc.md), [Tool transport R2](../architecture/tool-transport-r2.md),
  and the linked handoff documents;
- close, reopen, or create any AIQ or OQ identifier;
- change any product code or modify any file in the `bitty` or `bitty-ai`
  repositories.

## Verification backlog

These are bitty-ai-side `CarryCtx` tasks already scheduled against the same
review campaign. Each was observed at status `ready` (not started) at
inspection; none is claimed done, and none substitutes for the cross-repo
contracts below.

- AI-0065 - define the `ProtocolAgentId` to `client_id` binding rule: covers the
  identity half of risks 4 and 2.
- AI-0066 - pre-split streamed fragments for the 16 KiB transport ceiling:
  covers risk 3.
- AI-0067 - detect `bitty-ipc` pin drift against the mirrored `FakeHost`:
  covers risk 1.
- AI-0068 - triage the gitleaks false positive and add a reproducible
  secret-scan gate: a bitty-ai-side hygiene follow-up from the same campaign,
  not a cross-repo contract item.

## Reading this register

Each risk states four things:

- **Evidence anchor** - the inspected source location at the named revision.
- **Decision owner** - which side owns the decision; a joint owner means both
  sides must agree and neither has decided yet.
- **Required cross-repo contract** - the shared contract that must exist before
  either side can claim the risk resolved.
- **Acceptance evidence** - what must be shown, across both sides, before any
  implementation claim is supportable.

The register records risk and required evidence. It resolves nothing.

## Summary

| #   | Risk                                                 | Decision owner                                                        |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | IPC revision pinning and hand-mirrored host drift    | `bitty-ai` owns the pin and mirror; `bitty` owns invalidating changes |
| 2   | Dual consent models without a single mapping table   | Joint: `bitty` owns typed scopes and ledger                           |
| 3   | Streaming triple-ceiling mismatch                    | Joint: `bitty` owns wire and ingest ceilings                          |
| 4   | `ProtocolAgentId` to `client_id` binding undefined   | Joint: `bitty` owns `client_id` keys and bound                        |
| 5   | Synchronous loopback versus real-transport semantics | `bitty` owns real-transport semantics                                 |
| 6   | Process-global live-store tenancy and isolation      | `bitty` owns the live store                                           |
| 7   | Tool-name and vocabulary break                       | Joint: `bitty` owns legacy vocabulary                                 |
| 8   | `Unknown` execution-semantics clock consensus        | Joint: `bitty` owns the host clock                                    |

## 1. IPC revision pinning and hand-mirrored host drift

**Evidence anchor.** `bitty-ai@1bc2456 crates/bitty-ai-slice/Cargo.toml:18`
pins `bitty-ipc` at git rev `2cbb1fb...`. `crates/bitty-ai-slice/src/fake_host.rs:14-32`
declares a read-only hand-mirrored replica of the merged `bitty` shapes and
records that the `64e1709..2cbb1fb` window was additive. The mirrored dispatch
steps live at `fake_host.rs:368`, `:407`, `:491`, `:646`, `:662`; the shared
assertions that would surface drift live only in
`crates/bitty-ai-slice/tests/host_conformance.rs:1-19`. No pin-bump or drift
recipe exists in the `bitty-ai` justfile. At inspection, `crates/bitty-ipc` is
byte-identical between the pin and `bitty@main@06bc1f4`, so no drift has landed
yet; the risk is the missing follow-bump signal, not an observed break.

**Decision owner.** `bitty-ai` owns the pin, the mirrored double, and any
bump-follow mechanism. `bitty` owns the changes that would invalidate the
mirror.

**Required cross-repo contract.** A documented drift-detection and bump
procedure, plus a stated compatibility guarantee for the mirrored shapes and
the `host_conformance` suite as the drift gate.

**Acceptance evidence.** `host_conformance` passing against a bumped pin, and a
reproducible, idempotent drift signal that fires when the pin lags `bitty`
`main`, with a documented bump checklist. Scheduled `bitty-ai` work: AI-0067.

## 2. Dual consent models without a single mapping table

**Evidence anchor.** The runtime consent seam is an opaque string triple in
`bitty-ai@1bc2456 crates/bitty-ai-runtime/src/bridge.rs`: `ConsentQuery` at
`:465`, the `ConsentLedger` trait at `:496`, `FakeConsentLedger` at `:543`, and
`MAX_CONSENT_GRANTS = 64` at `:87`; the module documents that "the typed scope
enum lives host-side" at `:92`. The host ledger is typed in `bitty-ipc@2cbb1fb
crates/bitty-ipc/src/scope.rs`: `ConsentLedger` at `:477`, `MAX_GRANTS = 64` at
`:484`, and `is_granted(client_id, scope, now_ms)` at `:506`. The slice imports
the typed scope vocabulary and method-to-scope mapping at `fake_host.rs:78` and
exercises it at `crates/bitty-ai-slice/tests/fragment_mapping.rs:48`, `:450-461`.
The shared capacity `64` is a convention with no type-level linkage, and the
string-to-enum mapping is scattered rather than defined in one table.

**Decision owner.** Joint. `bitty` owns the canonical `Scope` vocabulary and
the typed ledger; `bitty-ai` owns the runtime wire-scope strings and must map
them.

**Required cross-repo contract.** One authoritative mapping table from runtime
scope strings (`workspace.read`, `terminal.inspect`) to `bitty-ipc` `Scope`
values, one shared source for the length bound and the capacity convention, and
a cross-reference between the two sides' rejection codes.

**Acceptance evidence.** A cross-repo test proving each runtime scope maps to
exactly one `Scope` or fails closed, a single-source proof for the bound and
capacity, and a documented rejection-code cross-reference for a mismatch.
Related existing question: AIQ-33. Scheduled `bitty-ai` work: AI-0065 covers
the identity half only.

## 3. Streaming triple-ceiling mismatch

**Evidence anchor.** Three ceilings disagree. The runtime rejects at
`bitty-ai@1bc2456 crates/bitty-ai-runtime/src/stream.rs:31`
(`MAX_FRAGMENT_BYTES`, 64 KiB) with an aggregate `MAX_STREAM_CHUNK_BYTES`
(256 KiB) at `:28`; the wire rejects at `bitty-ipc@2cbb1fb
crates/bitty-ipc/src/wire.rs:331` (`CHUNK_CEILING`, 256 KiB); ingest truncates
at `crates/bitty-ipc/src/rich_fragment.rs:80`
(`MAX_FRAGMENT_TEXT_BYTES`, 16 KiB, sourced from
`crates/bitty-ipc/src/devtools.rs:188`) with a char-boundary cut and a
`truncated` flag (`rich_fragment.rs:30-36`, `:104-128`). The mapping test proves
that a full 64 KiB runtime fragment truncates to 16 KiB
(`crates/bitty-ai-slice/tests/fragment_mapping.rs:210-224`) and that no `rich.*`
serving method is registered (`fragment_mapping.rs:444-461`).

**Decision owner.** Joint. `bitty` owns the wire and ingest ceilings and any
serving-method registration; `bitty-ai` owns the runtime bound and the mapping
or pre-split.

**Required cross-repo contract.** One documented fragment-size chain with an
explicit split-or-truncate rule at the runtime/transport boundary, with
deterministic ordering and a continuation or water-mark convention, or an
accepted statement that truncation is intended. Related existing question:
AIQ-29; related handoff item: BII-07.

**Acceptance evidence.** A joint test feeding a 64 KiB runtime fragment through
the real mapping into the real `FragmentIngestService`, asserting either no
silent byte loss (split) or a documented truncation, with the `vertical_slice`
and `fragment_mapping` assertions updated together. Scheduled `bitty-ai` work:
AI-0066.

## 4. ProtocolAgentId to client_id binding undefined

**Evidence anchor.** The runtime identity model is `ProtocolAgentId` at
`bitty-ai@1bc2456 crates/bitty-ai-runtime/src/bridge.rs:301` and `IdentityBridge`
at `:363`, whose binding is `Option<(ProtocolAgentId, AgentInstanceId)>` at
`:364` with `resolve_protocol` at `:446`; it binds a protocol principal to an
instance, not to a `client_id`. The host keys consent and execution by
`client_id` at `bitty-ipc@2cbb1fb crates/bitty-ipc/src/tool_dispatch.rs:397` and
`crates/bitty-ipc/src/execution.rs:1062`, and the slice passes
`self.client_id.clone()` through at `crates/bitty-ai-slice/src/live_host.rs:316`,
`:389`, `:411`. The length bounds are defined independently but currently equal:
`MAX_TOOL_CLIENT_ID_BYTES` (`tool_dispatch.rs:130`), `MAX_EXEC_CLIENT_ID_BYTES`
(`execution.rs:149`), and `auth::MAX_SCOPED_ID_BYTES`
(`crates/bitty-ipc/src/auth.rs:52`, `64` bytes).

**Decision owner.** Joint. `bitty-ai` owns the protocol identity and the bridge;
`bitty` owns the `client_id` keys and the length bound.

**Required cross-repo contract.** A deterministic binding rule from a bound
`ProtocolAgentId` to a `client_id` (or rejection of unbound callers), and one
authoritative length-bound source shared across `tool_dispatch`, `execution`,
and `bridge`. Related existing questions: AIQ-36, AIQ-38.

**Acceptance evidence.** A test rejecting an unbound or over-long identity
before any consent or execution call, and a single-source proof for the length
bound. Scheduled `bitty-ai` work: AI-0065.

## 5. Synchronous loopback versus real-transport semantics

**Evidence anchor.** The slice `IpcBridge::call` relies on the synchronous
loopback endpoint for correlation at `bitty-ai@1bc2456
crates/bitty-ai-slice/src/bridge.rs:113-165`, with `pending_count` at `:97-100`;
the timeout constant is the host's `DEFAULT_REQUEST_TIMEOUT_MS` at
`bitty-ipc@2cbb1fb crates/bitty-ipc/src/channel.rs:44`. `FakeHost` uses a
per-instance scripted FIFO and returns a typed `NotFound`
(`crates/bitty-ai-slice/src/fake_host.rs:390`, `:431`, `:464`, `:554`, `:598`,
`:610`), while `LiveBittyHost` calls real services and also returns a typed
`NotFound` (`crates/bitty-ai-slice/src/live_host.rs:577`, `:824`, `:837`).
Real-deployment socket or channel backpressure, timeouts, and wording variation
are not exercised, and the review warns against matching on error wording
rather than type.

**Decision owner.** `bitty` owns real-transport semantics (backpressure,
timeout, correlation, error taxonomy). `bitty-ai` consumes them and must match
on type only.

**Required cross-repo contract.** A stated real-transport contract covering
backpressure signalling, timeout and expiry behavior, correlation, and a typed
error taxonomy that the loopback double preserves. Related existing question:
AIQ-36.

**Acceptance evidence.** A transport test exercising backpressure, timeout, and
unmatched-correlation denial with type-based assertions, plus a conformance
rule that both hosts return the same typed error class for a missing handler.

## 6. Process-global live-store tenancy and isolation

**Evidence anchor.** The upstream live store is process-global at
`bitty-ipc@2cbb1fb crates/bitty-ipc/src/host_bridge.rs:104-106`
(`OnceLock<Mutex<BTreeMap>>`), with `MAX_LIVE_SNAPSHOTS` tied to
`channel::MAX_PENDING_REQUESTS` at `:90` and full-store publication rejected at
`:126`. The slice serializes its tests around that global with a module-local
lock and reserved terminal ids at `bitty-ai@1bc2456
crates/bitty-ai-slice/src/live_host.rs:95-101`, `:601`, `:627`. Reusing the
global table for product multi-tenancy would make the full-rejection semantics
a quota-contention behavior across terminals.

**Decision owner.** `bitty` owns the live store and any product multi-tenancy.
`bitty-ai` mirrors and consumes it.

**Required cross-repo contract.** Tenancy and isolation semantics (namespaces,
per-tenant quotas, cleanup) or an explicit single-tenant exclusion with a
fail-closed guard. Related existing questions: AIQ-36, AIQ-38.

**Acceptance evidence.** A concurrent multi-tenant isolation test proving no
cross-terminal interference, or an accepted single-tenant statement backed by a
fail-closed guard.

## 7. Tool-name and vocabulary break

**Evidence anchor.** The runtime `TB-2` grammar `^[a-z][a-z0-9_]*$` is enforced
by `validate_tool_name` at `bitty-ai@1bc2456 crates/bitty-ai-runtime/src/tool.rs:170-182`
and applied in `authorize_call` at `:607-614`. The slice records renames forced
by that grammar from dotted legacy names at
`crates/bitty-ai-slice/src/harness.rs:10-19` and
`crates/bitty-ai-slice/tests/vertical_slice.rs:11-20`. A name rejected inside
`run_turn` fails the whole turn after model output at
`crates/bitty-ai-runtime/src/agent.rs:648-657` (dispatch error path) because
`ToolError::UnknownTool` is returned at `tool.rs:612`.

**Decision owner.** Joint. `bitty` owns legacy dotted vocabulary in docs and
configs and the tool registry it serves; `bitty-ai` owns the `TB-2` grammar and
the rejection codes.

**Required cross-repo contract.** An explicit vocabulary-mapping rule
(dotted legacy names to `TB-2` names) with a rejection-code cross-reference, so
a name mismatch is an attributable single-call failure rather than a whole-turn
failure.

**Acceptance evidence.** A cross-repo vocabulary test showing a dotted legacy
name maps or fails with a cross-referenced rejection code, plus a documented
mapping table.

## 8. Unknown execution-semantics clock consensus

**Evidence anchor.** Both sides agree `Unknown` is never blind-retried, as
recorded at `bitty-ipc@2cbb1fb crates/bitty-ipc/src/execution.rs:19-30` and
`:752-768` and in the runtime `ReconcileStatus::Pending` at
`bitty-ai@1bc2456 crates/bitty-ai-runtime/src/reconcile.rs:100`. The runtime
documents a caller-advanced retry schedule but issues every retry at the same
`now_ms` and discards the computed `_next_retry_ms` at
`crates/bitty-ai-runtime/src/agent.rs:855-899`, `:927-929`. Host consent and
expiry judgments depend on caller-supplied time at `bitty-ipc@2cbb1fb
crates/bitty-ipc/src/scope.rs:506` and
`crates/bitty-ipc/src/execution.rs:1095`. If the host advances its clock while
the runtime freezes `now_ms`, retries can be rejected host-side as expired while
the runtime still treats them as retryable `Pending`, forming a livelock.

**Decision owner.** Joint. `bitty` owns the host clock and the consent and
expiry judgments; `bitty-ai` owns the retry schedule.

**Required cross-repo contract.** An agreement on who advances the clock, by
how much, and against which bound, shared by both sides. Related existing
questions: AIQ-28, AIQ-37.

**Acceptance evidence.** A joint test with an advanced clock proving retries are
not rejected as expired while the runtime reports `Pending`, plus a documented
clock-advance formula. Related `bitty-ai` work: AI-0063 documents the runtime
side of the schedule but not the cross-repo agreement.

## References

- [Bitty-Side Integration Input](bitty-side-integration-input.md) (Draft):
  BII-01 through BII-10 `bitty`-side requirement handoff.
- [Bitty-Side Delivery Verification](bitty-side-delivery-verification.md)
  (Draft): read-only verification of delivered `bitty` items.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounding IPC framing,
  scopes, and lifecycle contracts.
- [Tool transport R2](../architecture/tool-transport-r2.md) (Draft): unified authorization
  backend, declared placement, and transport open surface.
- [Execution ownership R1](../architecture/execution-ownership-r1.md) (Draft): execution
  ownership and registry-split framing.
- [Task lifecycle R5](../architecture/task-lifecycle-r5.md) (Draft): lifecycle authority and
  handoff fencing.
- [AI Architecture](../architecture/ai-architecture.md) (Draft): bridge process model, Tool
  Bus, and Rich streaming vocabulary.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): open register
  entries, unchanged by this register.
