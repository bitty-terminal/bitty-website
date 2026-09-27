---
title: Bitty-side delivery verification
description: Draft read-only verification mapping bitty main deliveries to BII inputs without acceptance decision
category: specifications
audience: contributor
document_type: explanation
status: draft
website_publish: false
sidebar_order: 42
---

# Bitty-side delivery verification

> Status: **draft**. This note records read-only verification of `bitty`
> `main` against the [Bitty-Side Integration Input](bitty-side-integration-input.md)
> (BII-01 through BII-10, with the G-2 and G-3 items). It describes what
> was delivered and what remains missing. It grants no acceptance, sets no
> `bitty`-side priority, closes no open question, and changes the status of
> no AIQ entry. Acceptance, sequencing, and mechanism decisions stay with
> the `bitty` repository through its own review. No file in the `bitty`
> repository was read for writing or modified for this note; no file in the
> `bitty-ai` implementation repository was modified either.

## Purpose and scope

Inspection point is `bitty` `main` at `2cbb1fb` (read-only), covering twelve
landed pull requests in merge order: the six items verified at `eef983e`
plus a six-item window:

- `327064f` docs reconciliation (#702).
- `9bbc1a6` bounded `terminal.snapshot` service (#703).
- `50b32ec` host tool dispatch with per-tool consent (#705).
- `cf3ac8b` generic execution backend with structured outcome (#707).
- `a61c291` publishable bridge client boundary (#709).
- `eef983e` bounded scene-fragment ingestion transport (#711).
- `9830edb` bounded consent-gated `process.spawn` surface (#717).
- `64e1709` host `[tools.*]` fail-closed enforcement (#716).
- `e84da34` bundled git-panel removal from the catalog (#713).
- `1007ba8` config-format hygiene (#719).
- `789b6b2` crate README map (#721).
- `2cbb1fb` Phase-A live host binding (#723).

Local `git log --oneline -1` in the `bitty` checkout reads `eef983e`
(stale, behind `origin/main`); the six window commits above were verified
read-only at the pinned `2cbb1fb` revision without fetch or checkout
mutation. `origin/main` additionally resolves to `65aac5c` (#725), which is
outside this inspection point and is not covered here. `2cbb1fb` stays the
full-verification point of this note; the window addendum before the
Conclusion appends read-only `2cbb1fb..db283e6` coverage without
re-verifying earlier sections.

Method per item was first-hand source read (`outline`, then targeted
`symbol` or narrow `read`), integration and unit test enumeration, and a
read-only comparison against the `bitty-ai` slice consumer
(`bitty-ai/crates/bitty-ai-slice`, pinned `bitty-ipc` git revision
`2cbb1fbed82814c157359b71dd8efbb4be0c36e7`). Line numbers below refer to
`bitty` `main` at the inspection point. Test counts count `#[test]`
attributes in the cited files.

## Window delta `eef983e..789b6b2`

The window touches no `bitty-ipc` service source: `git diff --stat
eef983e..789b6b2 -- crates/bitty-ipc` shows only the added
`crates/bitty-ipc/README.md` map. Service line counts and evidence-bar
anchors are unchanged at `789b6b2` (`snapshot.rs` 710 lines with the
`terminal.snapshot` mapping under `terminal.inspect` in `scope.rs:383`;
`tool_dispatch.rs` 894 lines; `execution.rs` 1531 lines; `bridge.rs` 401
lines with `publish = true` at `Cargo.toml:11`; `rich_fragment.rs` 494
lines; `scope.rs` still registers no fragment wire method). Per-commit
disposition follows, one sentence each.

- #717 (`9830edb`): the new `plugin_runtime/spawn.rs` consent-gated
  real-process surface reuses `ExecutionService`, `ExecutionResult`, scope,
  and consent types but modifies no `bitty-ipc` gateway file, so BII-01
  through BII-05 Delivered and Gap claims are unchanged.
- #716 (`64e1709`): the new `plugin-host/tools.rs` pure-validation
  allowlist for Layer-2 manifest `[tools.git]` modifies no IPC dispatch or
  authorization file, so BII-02 and BII-03 Delivered and Gap claims are
  unchanged.
- #713 (`e84da34`): the bundled git-panel catalog removal deletes
  `runtime/git_panel.rs` with no Core API change and no `ai_panel.rs` change,
  so it is not AI-specific demotion and BII-08 Delivered and Gap claims are
  unchanged.
- #719 (`1007ba8`): config-format hygiene only, touching no capability,
  gateway, Panel, or IPC file, so no BII-01 through BII-10 claim changes.
- #721 (`789b6b2`): crate README maps only, including the `bitty-ipc` crate
  map with no versioning or consumption change, so BII-06 Delivered is
  unchanged and only the consumer-pin reference below moves.

BII-09 and BII-10 ordering observations still hold: the window work runs
outside the gateway groups without reordering them.

## Window delta `789b6b2..2cbb1fb`

The window is a single commit, `2cbb1fb` (#723, parent `789b6b2`),
verified first-hand at the pinned revision without fetch or checkout
mutation. `git diff --stat 789b6b2..2cbb1fb` shows 11 files with 1765
insertions: the new `crates/bitty-ipc/src/host_bridge.rs` (749 lines) plus
`crates/bitty-ipc/src/lib.rs` export, the new
`crates/bitty-rich/src/projection.rs` (389 lines) plus `lib.rs` export and
`Cargo.toml` edge, the new `crates/bitty-runtime/src/host_bridge.rs` (464
lines) plus `lib.rs` export, and the `plugin_runtime/spawn.rs` production
authorizer wiring with its `services.rs` comment and `spawn_surface.rs`
test update. Existing gateway files are byte-identical in this window
(`git diff 789b6b2..2cbb1fb -- crates/bitty-ipc/src/scope.rs
crates/bitty-ipc/src/snapshot.rs crates/bitty-ipc/src/tool_dispatch.rs
crates/bitty-ipc/src/execution.rs crates/bitty-ipc/src/rich_fragment.rs
crates/bitty-ipc/src/bridge.rs` is empty), so prior evidence-bar anchors
hold at `2cbb1fb` (`snapshot.rs` 710 lines with the `terminal.snapshot`
mapping under `terminal.inspect` in `scope.rs:383`; `tool_dispatch.rs` 894
lines; `execution.rs` 1531 lines; `bridge.rs` 401 lines with `publish =
true` at `Cargo.toml:11`; `rich_fragment.rs` 494 lines; `scope.rs` still
registers no fragment wire method).

- #723 (`2cbb1fb`): the `bitty-ipc` live-bridge half (bounded live store,
  live snapshot and read-only inspect providers, `HostCaller` bind), the
  `bitty-rich` text-first fragment-to-`RichBlock` projection, the
  `bitty-runtime` live-read helpers, and the Layer-2 production spawn
  authorizer wiring. Per-BII disposition is recorded in the BII-01 through
  BII-07 sections below; BII-08 Delivered and Gap claims are unchanged.

BII-09 and BII-10 ordering observations still hold: the window work binds
the landed gateway groups to live host state without reordering them.

## BII-01 Bounded terminal snapshot host service

Request: host-registered, zone-scoped, bounded `terminal.snapshot` handler
behind the existing `terminal.inspect` scope, returning a bounded snapshot
data object rather than internal grid objects.

Delivered by #703 (`9bbc1a6`): `crates/bitty-ipc/src/snapshot.rs` (710
lines) plus `crates/bitty-ipc/tests/snapshot_service.rs` (244 lines).
Evidence bar: `SNAPSHOT_METHOD` (`snapshot.rs:64`), `DetailLevel`
(`snapshot.rs:93`), `SnapshotRequest` (`snapshot.rs:235`),
`SnapshotData` (`snapshot.rs:317`), `TerminalSnapshot`
(`snapshot.rs:338`), `SnapshotService` (`snapshot.rs:470`), `dispatch`
(`snapshot.rs:548`). Scope mapping reuses the generic registry
(`terminal.snapshot` under `terminal.inspect` in `scope.rs:383`). Tests: 8
unit plus 10 integration, including missing-handler fail-closed
(`host_without_snapshot_handler_fails_closed`), missing-scope denial,
unknown-method denial, terminal mismatch denial, bounded budgets, zone
narrowing, char-boundary truncation, and untrusted-surface labeling.

Gap: the service shape is unchanged at `2cbb1fb`, and the live-binding
IPC half is now delivered by #723 (`2cbb1fb`):
`crates/bitty-ipc/src/host_bridge.rs` (749 lines) adds a bounded live
store (`MAX_LIVE_SNAPSHOTS` at `host_bridge.rs:90`, `live_snapshot_store`
at `host_bridge.rs:104`, `publish_live_snapshot` at `host_bridge.rs:119`)
with a live provider (`live_snapshot_provider` at `host_bridge.rs:142`,
`live_snapshot_count` at `host_bridge.rs:158`), served through the
unchanged `SnapshotService::dispatch` path with the provider-echo match.
Tests: 13 unit tests in `host_bridge.rs`, including publish-serves-through
dispatch, miss-is-`NotFound`, bad-grammar rejection, fail-closed capacity,
and truncation flagging. The `bitty-runtime` half
(`crates/bitty-runtime/src/host_bridge.rs`, 464 lines) adds committed-state
read helpers (`live_snapshot_data` at `host_bridge.rs:101`,
`publish_live_snapshot` at `host_bridge.rs:137`,
`live_snapshot_service` at `host_bridge.rs:143`; 7 unit tests), but
`git grep` at `2cbb1fb` shows no production publish call-site outside
those tests and no socket or transport wiring. Deterministic snapshots
under live generation change in production, redaction, and live transport
therefore remain sequel host wiring.

## BII-02 Generic host tool dispatch method

Request: host-registered generic tool-dispatch method with per-tool consent
and bounded results, usable by any agent or plugin caller through
authenticated IPC.

Delivered by #705 (`50b32ec`): `crates/bitty-ipc/src/tool_dispatch.rs`
(894 lines) plus `crates/bitty-ipc/tests/tool_dispatch_service.rs` (350
lines). Evidence bar: `ToolSpec` (`tool_dispatch.rs:197`), `ToolRequest`
(`tool_dispatch.rs:271`), `ToolOutput` with `ToolExecution`
(`tool_dispatch.rs:346`, `tool_dispatch.rs:393`), `ToolDispatchService`
(`tool_dispatch.rs:491`), `dispatch` (`tool_dispatch.rs:564`). Dispatch
denies unknown tools, missing scopes, missing or expired consent, and
effect tools without explicit `allow_effects`, and bounds names, schemas,
arguments, results, targets, and client identity. Tests: 9 unit plus 11
integration, including unknown-tool, missing-scope, missing-consent, and
missing-handler denials, effect opt-in paths, oversized argument and result
denials, target mismatch denial, and shared per-client scope consent
(`consent_is_shared_per_client_scope_not_per_tool`).

Gap: generic providers are still caller-supplied test doubles, and no MCP
path is proven. For the read-only inspect slice only, #723 (`2cbb1fb`)
delivers live providers through the unchanged dispatch prefix:
`INSPECT_TEXT_TOOL` (`host_bridge.rs:93`) with `inspect_text_spec`
(`host_bridge.rs:196`) and `inspect_text_provider` (`host_bridge.rs:255`),
`INSPECT_STATUS_TOOL` (`host_bridge.rs:96`) with `inspect_status_spec`
(`host_bridge.rs:212`) and `inspect_status_provider`
(`host_bridge.rs:287`), registered by `register_live_inspect_tools`
(`host_bridge.rs:324`) behind the existing scope, consent, and effect
gates. The `bitty-runtime` helper `live_tool_service`
(`runtime/host_bridge.rs:154`) registers exactly those two read-only
tools; effect tools stay deny-by-default (`NotFound`). Live tool effects
beyond read-only inspect remain sequel work.

## BII-03 Authorization gate before every real effect

Request: every real tool effect passes one common host effect gateway in a
fixed order (schema validation, captured target and generation resolution,
scope check, consent ledger check, effect policy, budget reservation,
attributed outcome).

Partially delivered by #705 (`50b32ec`) as a fixed dispatch prefix:
request validation, client identity bounds, registry lookup, scope check,
explicit effect opt-in, consent ledger check, provider call, captured
target match, output validation, and attributed outcome
(`tool_dispatch.rs:564`). Tests prove each denial class leaves no partial
state.

Gap: the inspected order has no schema-version check, no captured
generation resolution, no effect policy beyond the `allow_effects`
boolean, and no budget reservation or accounting. The consent type
(`ConsentLedger`) is reused across modules, but a single shared ledger and
a single shared budget path across native and MCP paths with a shared
gate-order proof are not shown. The trust-binding choke point is now
delivered IPC-side by #723 (`2cbb1fb`): `HostCaller`
(`host_bridge.rs:350`) with `bind` (`host_bridge.rs:369`) requires an
already-attested `VerifiedPeer`, shape-checks the `client_id` against 64
bytes, and carries only server-evaluated scopes plus the server clock, so
scope smuggling and clock rewinding fail by construction at that site.
UID-to-`client_id` allocation on the socket accept boundary and per-tool
consent granularity remain sequel work as documented in the module.
Effectful tools therefore remain gated by shape, scope, opt-in, and
consent only.

## BII-04 Generic supervised execution backend

Request: generic `bitty`-owned supervised execution primitive behind an
`ExecutionRequest` shape that owns process and PTY handles, generations,
isolation, and cleanup, with optional Panel projection attached later.

Delivered by #707 (`cf3ac8b`) as shapes plus a headless service:
`crates/bitty-ipc/src/execution.rs` (1531 lines) plus
`crates/bitty-ipc/tests/execution_service.rs` (343 lines). Evidence bar:
`ExecutionRequest` (`execution.rs:444`), `EnvPolicy`
(`execution.rs:359`), `ExecutionService` (`execution.rs:980`),
`dispatch` (`execution.rs:1047`), `EXECUTION_SCOPE` as `process.spawn`
(`execution.rs:155`). The request carries executable, arguments, working
directory, environment policy, captured target, timeout, output budget,
and explicit effect opt-in. Bounds reuse accepted contracts and the
environment policy is closed (`Isolated` or `Explicit` with no ambient
inheritance). Tests: 13 unit plus 11 integration, including scope,
consent, opt-in, budget, target mismatch, and closed environment proofs.

Gap: the `bitty-ipc` module header still states it owns no socket, spawns
no process, performs no I/O, and depends on no workspace crate beyond
`bitty-ipc` itself. There is no PTY or process handle ownership, no
isolation or cleanup wiring, and no Panel projection wiring. Executable
allowlist enforcement is now wired on the Layer-2 spawn path by #723
(`2cbb1fb`): `HostToolsAuthorizer` (`spawn.rs:422`) with `authorize`
(`spawn.rs:429`) validates `(tool, args)` against the accepted
`[tools.git]` predicates, `git_spawn_backend` (`spawn.rs:1008`) closes
over `HostToolsAuthorizer` (`spawn.rs:1014`) with activation wiring
(`plugin_runtime/mod.rs:639`), and `DenyAllAuthorizer` (`spawn.rs:390`)
remains as the fail-closed baseline for tests. The generic allowlisted
execution helper `authorized_execution_provider`
(`runtime/host_bridge.rs:182`) routes through that authorizer plus the
real-process runner, but `git grep` at `2cbb1fb` shows it is referenced
only by its own tests, with no production `ExecutionService` dispatch
wiring. Headless execution without Panel or shell therefore remains the
default provider shape outside the Layer-2 spawn path.

## BII-05 Structured execution outcome with Unknown reconciliation

Request: host execution backend returns the full structured outcome
disclosure classes (`Succeeded`, `Failed`, `Cancelled`, `Unknown`) with
bounded redacted evidence references, reconciled by status inspection or
user direction before retry.

Delivered by #707 (`cf3ac8b`) as outcome types plus a query path:
`ExecutionStatus` (`execution.rs:161`), `EffectState`
(`execution.rs:220`), `RawExecutionOutput` with `Unknown` agreement
validation, `ExecutionResult` (`execution.rs:781`), and stored-outcome
`reconcile` plus `resolve` on `ExecutionService`. The `Unknown` agreement
(status and effect state agree on `Unknown`, and `Unknown` carries no exit
code) is enforced fail-closed, same-id re-dispatch is rejected, and there
is deliberately no retry primitive. Tests: `unknown_agreement_is_enforced`
(unit) and `unknown_reconciles_through_the_query_path_never_blind_retries`
plus `resolve_preserves_attribution` (integration).

Gap: cancellation races on both sides of live dispatch and post-dispatch
`Unknown` outcomes against real processes are not proven; reconciliation
is still a stored-outcome query, exercised over headless doubles and over
the test-only `authorized_execution_provider`
(`runtime/host_bridge.rs:182`). The Layer-2 success table now carries
`execution_id` (`spawn.rs:861`) as the attribution handle for explicit
host reconcile (`spawn.rs:1005`). No rollback is claimed, which matches
the BII request.

## BII-06 Versioned bridge client SDK for out-of-process consumers

Request: versioned, out-of-process bridge client SDK exporting the
accepted envelope, method registry, scope, and consent types, replacing
pinned Git revision plus dependency-exception consumption for stable
releases.

Delivered by #709 (`a61c291`) as a publishable boundary:
`crates/bitty-ipc/Cargo.toml` sets `publish = true` (line 11) and
`crates/bitty-ipc/src/bridge.rs` (401 lines) plus
`crates/bitty-ipc/tests/bridge_client.rs` (165 lines) add `BridgeClient`
(`bridge.rs:98`) with `call` (`bridge.rs:193`), `take_request`,
`answer`, `take_response`, and expiry draining. The client composes the
client-side dispatch prefix (routing, authorization, consent, budget,
envelope, attribution, outcome) with bounded params
(`MAX_BRIDGE_PARAMS_BYTES`, `bridge.rs:81`) and bounded client identity.
Tests: 9 unit plus 10 integration, including unknown-method, scope,
consent, expiry, params-bound, correlation, and no-partial-state proofs.

Gap: the crate version follows the workspace version rather than an
independent SDK versioning proof, and no external consumer build without
an internal-crate Git dependency is shown in the inspected repositories.
Read-only comparison shows `bitty-ai` now pins `bitty-ipc` by Git revision
(`bitty-ai-slice/Cargo.toml:18`, rev
`2cbb1fbed82814c157359b71dd8efbb4be0c36e7`) with the prior consumption
shape: AI-0039 verified `64e1709..2cbb1fb` additive for `bitty-ipc`
shapes, and AI-0040 wires that pin's live snapshot and inspect providers
into `LiveBittyHost` as mapping proof only. Stable-release substitution
therefore remains sequel consumer work.

## BII-07 Bounded rich scene-fragment transport

Request: bounded scene-fragment ingestion method with a consumable
fragment contract (for example Markdown, diff, and tool-card fragments).

Delivered by #711 (`eef983e`) as a text-chunks-first transport:
`crates/bitty-ipc/src/rich_fragment.rs` (494 lines) with `FragmentData`
(`rich_fragment.rs:95`), `RichFragment` (`rich_fragment.rs:116`), and
`FragmentIngestService` (`rich_fragment.rs:205`) with `ingest`
(`rich_fragment.rs:252`) and `drain_bounded`. The dedup key is
(`terminal_id`, `generation`, `seq`), text is bounded per fragment at the
grid-text bound with char-boundary truncation, queue depth is bounded, and
duplicates are rejected before capacity. Fragments reuse the snapshot zone
vocabulary and are always labeled untrusted. Tests: 11 unit tests with no
separate integration file, covering budgets, truncation, NUL rejection,
grammar rejection, duplicate-before-capacity, capacity, generation-scoped
sequence sharing, trust labeling, over-ceiling DTO rejection, and FIFO
drain.

Gap: the transport contract still carries text plus zone only; there is
no Markdown, diff, or tool-card typed fragment. The text-first projection
is now delivered as a pure helper by #723 (`2cbb1fb`):
`crates/bitty-rich/src/projection.rs` (389 lines) with `ProjectedBlock`
(`projection.rs:54`), `ProjectionError` (`projection.rs:73`), and
`project_fragments` (`projection.rs:168`), joining one generation's
fragments in `seq` order into a single-text-span `RichBlock`
(`SceneNode::Text` at `projection.rs:221`, `BlockAnchor::Zone` at
`projection.rs:228`) with over-budget fail-closed at 256 KiB
(`projection.rs:206`). Tests: 11 unit tests, covering order
normalization, mixed terminal and generation denial, duplicate denial,
gap tolerance, truncation propagation, budget denial, and untrusted
labeling. No wire method is registered (`scope.rs:383` still lists only
the terminal methods; `rich_fragment.rs` is byte-identical in this
window), and `git grep` at `2cbb1fb` shows no production render
call-site for the projection outside its own export and tests.
Authorization, consent, and provider-echo checks for a future serving
method are absent by design.

## Panel capability decoupling for AI-specific surface

Request BII-08 asks review of the existing AI-named surface in the
terminal runtime Panel code against a generic panel provider service
capability, demoting AI-specific core APIs to plugin or SDK primitives.

Delivered by #702 (`327064f`) as a candidate design record only:
`specifications/ai-surface-reconciliation.md` (277 lines) inventories the
`ai_panel.rs` surface, maps 17 items to Keep or Demote verdicts with
specified follow-up changes D-1 through D-6 and F-1 through F-4, and
records the shipped, accepted, draft, open, and candidate ledger. The
record explicitly authorizes no implementation and edits no Core API.

Gap: the task is docs-only, so every AI-specific Core API remains in
place and the requested negative evidence (no core AI-specific API beyond
generic primitives on the reviewed path) is not yet available. Demotion
work is specified but not executed.

## BII-09 Parallel work split across the two tracks

BII-09 records the proposed division of labor: the `bitty-ai` track
completes the agent kernel against deterministic doubles while the
`bitty` track completes the host capability gateway (BII-01 through
BII-05 first), meeting at the bridge when the gateway exists.

Observed: the `bitty` side landed the gateway shapes in the proposed
grouping (snapshot, then dispatch with consent, then execution with
structured outcomes), followed by the bridge boundary, the fragment
transport, and the live-binding half with the text-first projection and
the production spawn authorizer (#723), with the Panel review as a
docs-only record. The `bitty-ai` slice comparison now pins `bitty-ipc`
at `2cbb1fb` (AI-0039) and serves the same `BittyHost` trait through both
`FakeHost` (deterministic scripted path) and `LiveBittyHost` wired to the
live snapshot provider plus the live read-only inspect tools (AI-0040,
mapping proof through the real dispatch paths with published `SnapshotData`
fixtures, no socket, process, PTY, or transport claim). This note makes no
claim about track completeness on either side.

## BII-10 Suggested build order for the bitty track

BII-10 proposes the `bitty`-track order: bounded `terminal.snapshot`
(BII-01), generic dispatch with authorization and consent (BII-02 with
BII-03), execution backend with structured outcomes (BII-04 with BII-05),
bridge client SDK (BII-06), fragment ingestion (BII-07), Panel cleanup
(BII-08).

Observed: `bitty` `main` follows that group order for code items
(#703, #705, #707, #709, #711, #723), with the Panel reconciliation record
(#702) landed first as docs-only input rather than last as code cleanup.
Each code group landed with its linked evidence bar of bounded validation
and fail-closed tests. Whether the order satisfies the `bitty`
repository is for that repository to decide.

## G-2 and G-3 confirmation

G-2 (`terminal.snapshot` host service) maps to BII-01 and is
addressed in shape by #703 as a bounded service under `terminal.inspect`,
with the live-binding IPC half added by #723 as a bounded store plus live
providers. G-3 (generic Tool Bus dispatch) maps to BII-02 with BII-03
and is addressed in shape by #705 as generic dispatch with per-tool
consent, with live read-only inspect providers plus the `HostCaller` bind
added by #723. The remaining G-1 through G-6 gaps stay where the BII input puts them:
packaging (G-1) is addressed in shape by the publishable bridge boundary
(#709) without consumer substitution proof, transport (G-4) is addressed
in shape by text-first fragments (#711) plus the text-first projection
(#723) without typed fragments or render wiring, and design reconciliation
items stay candidate docs (#702).

## Explicit non-requests and open-question disposition

This verification changes the status of no register entry. AIQ-33,
AIQ-36, AIQ-37, AIQ-38, AIQ-08, AIQ-29, AIQ-2A, AIQ-10 with the AIQ-56
alias, AIQ-26, and AIQ-28 stay open under the canonical admission rule
cited by [AI Unresolved Questions](../product/ai-unresolved-questions.md). The
[Execution ownership R1](../architecture/execution-ownership-r1.md) registry-split
framing, the [Tool transport R2](../architecture/tool-transport-r2.md) open surface, and
the [Task lifecycle R5](../architecture/task-lifecycle-r5.md) lifecycle boundary are
unchanged; this note is a versioned observation input, not a lifecycle
transition in either repository.

## Window addendum `2cbb1fb..db283e6` (read-only git inspection, no fetch or checkout mutation)

Verified read-only at the local `bitty` checkout: `git rev-list --count
2cbb1fb..db283e6` reads 41, and `git log --format='%h %s'
2cbb1fb..db283e6` lists the wave in order: `65aac5c` bundled-manager
removal (#725), `e890527` tool-test fixture allowlist (#727), `e29b3bb`
publish-snapshot trailer hardening (#729), `9507ed4` compat-range re-check
(#731), `3152c12` tmp quarantine GC (#732), `237ad83` not-yet-shipped
markers (#733), `3375439` Cell zerowidth (#734), `b9ea7b6`
`agent.context.terminal` migration (#736), `0b416f2` render batching
(#737), `a266b2a` session save/restore (#738), `d89fa19` multi-click
selection (#739), `9c63750` palette/OSC 4 (#740), `e154324` keyboard copy
mode (#741), `8ea5f86` search overlay (#742), `96ba205` `damage_since`
bound (#766), `1eb6aa8` V-C stub removal (#768), `1ccdb1b` Lua sandbox caps
(#769), `db87412` package compat eval (#770), `018e205` bg cache identity
(#771), `b76c4b1` fs predicates (#772), `3716ec4` devtools peer verify
(#773), `cb0a5ae` config validation (#774), `be6e63c` forwarder-thread join
(#775), `87c1766` channel/bridge robustness (#776), `ae8f4ba`
erase/resize/reflow (#777), `0b40400` spawn timeout/waker (#778), `4cc6b2d`
CLI layout fail-closed (#779), `997fc11` panic/log hygiene (#780),
`ef9a88e` Esc scoping (#784), `a998456` fill-run merge (#785), `1d4cd18`
platform gaps (#786), `51ae300` wire negotiation (#787), `d1faecd`
startup/snapshots/zoom (#788), `5dec410` present-phase split (#782),
`b52e918` VT parser hardening (#783), `443d4dd` modal capture (#789), `1e66caf`
`present_golden` re-record (#795), `852847e` composer allowlist (#801),
`37b7f87` `file:` hyperlink reject (#805), `0d71be8` ImageStore admission
(#803), `db283e6` plugin spawn env deny (#806). Endpoints resolve to
`2cbb1fbed82814c157359b71dd8efbb4be0c36e7` and
`db283e6bba9aa6a468c96b6b71cf04a7161a689e`. The wave is defect and
security hardening plus UI features; three movements below are
AI-adjacent, and the rest touch no BII gap file.

Three AI-adjacent movements, each re-verified with `git log` and
`git show --stat` in this window:

- `b9ea7b6` (#736, `crates/bitty-runtime/src/ai_panel.rs`, 449
  insertions, 5 deletions): agent terminal-context reads migrate onto the
  generic bounded snapshot read service. `agent.context.terminal` becomes
  a `#[deprecated(since = "0.1.0")]` alias (removal at or after v0.2.0);
  the canonical path is `AI_PANEL_TERMINAL_SNAPSHOT_METHOD`
  (`terminal.snapshot`) with a ledgered `terminal.inspect` grant via
  `AiPanelIntegration::resolve_terminal_context`, plus scope and consent
  gate helpers, a deprecation-warning helper, and fail-closed denial
  tests. `git log b9ea7b6..db283e6 -- crates/bitty-runtime/src/ai_panel.rs`
  is empty, so the movement is unchanged at `db283e6`. This is
  BII-08-adjacent demotion-in-progress, not executed demotion: the old
  string still compiles and stored grants keep exact-match behavior
  during the compat window, so the requested negative evidence (no core
  AI-specific API beyond generic primitives on the reviewed path) is
  still absent. The Panel section Gap claim below is unchanged.
- `51ae300` (#787, `crates/bitty-ipc/src/wire.rs` plus
  `crates/bitty-agent/src/message.rs`): `wire.rs` adds
  `SUPPORTED_WIRE_VERSIONS` and `negotiate_wire_version` (highest mutual
  version, fail-closed `VersionMismatch` on no overlap), and `message.rs`
  adds the `ContentTrust` provenance label (`Untrusted` default,
  host-asserted `Trusted` only through `AgentMessage::new_trusted`,
  `Tool`-role messages can never be trusted, and
  `is_untrusted_content` now reflects the label). `git log
51ae300..db283e6 -- crates/bitty-ipc/src/wire.rs
crates/bitty-agent/src/message.rs` is empty, so both landings are
  unchanged at `db283e6`. BII-06 Delivered and Gap claims are unchanged:
  negotiation is envelope plumbing with no version bump and no SDK
  versioning or consumer substitution proof, and the trust label is an
  agent-crate provenance marker with no gateway or consent change.
- `87c1766` (#776, `crates/bitty-ipc/src/bridge.rs`,
  `crates/bitty-ipc/src/channel.rs`, `crates/bitty-ipc/src/limits.rs`):
  bridge and channel robustness (unknown-id answers buffer nothing under
  flood, double delivery buffers nothing twice, queued-request timeout
  reaping via `retain`). Generic transport hardening, not a BII transport
  decision: no method, scope, consent, or provider change, so BII-01
  through BII-07 Delivered and Gap claims are unchanged.

Zero-touch confirmations in this window (`git log 2cbb1fb..db283e6 --
<path>` per path, all read-only):

| Path                                                                   | Window result                                                                                                                                                                                         |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crates/bitty-ipc/src/host_bridge.rs`                                  | Empty: untouched.                                                                                                                                                                                     |
| `crates/bitty-runtime/src/host_bridge.rs`                              | Empty: untouched.                                                                                                                                                                                     |
| `crates/bitty-ipc/src/snapshot.rs`                                     | Empty: untouched.                                                                                                                                                                                     |
| `crates/bitty-ipc/src/rich_fragment.rs`                                | Empty: untouched.                                                                                                                                                                                     |
| `crates/bitty-ipc/src/mcp.rs`                                          | Empty: untouched.                                                                                                                                                                                     |
| `crates/bitty-rich/src/projection.rs`                                  | Empty: untouched.                                                                                                                                                                                     |
| `crates/bitty-agent/src/tool.rs`                                       | One commit only: `e890527` (#727), whose `tool.rs` hunk adds a test-module comment allowlisting synthetic scrubber fixtures (plus `.gitleaks.toml`); `git show --stat` confirms no production change. |
| `crates/bitty-ipc/src/wire.rs` and `crates/bitty-agent/src/message.rs` | One commit only: `51ae300` (#787) as described above; unchanged since.                                                                                                                                |
| `crates/bitty-runtime/src/ai_panel.rs`                                 | One commit only: `b9ea7b6` (#736) as described above; unchanged since.                                                                                                                                |

(The `*host_bridge*` filename glob also matches
`crates/bitty-lua/tests/host_bridge.rs`, touched once by `1ccdb1b` (#769)
as a Lua sandbox regression probe; neither production host-bridge module
is touched.)

Conclusion restated unchanged: still missing for a live-host claim are
production publish call-sites and live terminal and process or PTY wiring
with transport, real capability backends beyond read-only inspect, unified
gate order with generation, schema, policy, and budget accounting, live
cancellation and acknowledgement-loss proofs, consumer substitution off
the pinned revision, typed rich fragments with render wiring and a
serving wire method, and executed Panel demotion with negative-evidence
code proof. This addendum grants no acceptance, sets no `bitty`-side
priority, closes no open question, and changes the status of no AIQ
entry; `bitty`-side decisions stay with the `bitty` repository through
its own review.

## Window addendum `db283e6..cfeffa2` (read-only git inspection; fetch only, no checkout mutation)

Verified read-only at the local `bitty` checkout after an object-only
`git fetch` (no checkout, reset, or working-tree mutation):
`git rev-list --count db283e6..cfeffa2` reads 6, and
`git log --format='%h %s' db283e6..cfeffa2` lists, oldest first, `3e1dfb3`
PTY lifecycle and reader/writer semantics (#781), `6b5d4ad` changelog
record of the wave (#791), `317d4b4` hyperlink O(1) lookup and hashed id
space (#807), `7993786` headless latency work-floor gate (#809), `6a9ee85`
filesystem overbroad-pattern close (#800), and `cfeffa2` checked caret and
tilde bounds (#794). Endpoints resolve to
`db283e6bba9aa6a468c96b6b71cf04a7161a689e` and
`cfeffa2d8e1387029850940af2b64877dbfbe25f`. The window is the wave tail
plus follow-ups: the last wave fix (#781), the wave changelog record
(#791), and four follow-ups from wave review findings
(#794, #800, #807, #809). No file under `crates/bitty-ipc/` is touched
(`git log db283e6..cfeffa2 -- crates/bitty-ipc` is empty), so every
BII-01 through BII-10 Delivered and Gap claim and every prior evidence-bar
anchor holds at `cfeffa2` by identity.

Three movements reach AI-side verification surfaces: PTY and host-call
deadline semantics (#781), the execution/latency evidence gate (#809), and
the BII-07 crate boundary row (#807). None changes a BII claim. Per-item
disposition follows.

- `3e1dfb3` (#781, `crates/bitty-pty/src/{pty,reader,writer}.rs`,
  `crates/bitty-lua/src/host.rs` with `crates/bitty-lua/tests/host_bridge.rs`,
  and `crates/bitty-runtime/src/runtime/{pty,panes}.rs` plus PTY test
  suites; 541 insertions, 88 deletions): PTY lifecycle and reader/writer
  semantics in `bitty-pty` (489/585/111 lines at `cfeffa2`), with two
  contract-relevant changes and call-site updates. `Drop for Pty` kills and
  reaps through a bounded `wait_timeout` (`DROP_REAP_TIMEOUT`, 5 s,
  `pty.rs:34`; reap at `pty.rs:486`) instead of blocking indefinitely, and
  a child that outlives the bound is left to the kernel as documented;
  `PtyReader::spawn` is fallible and `Pty::take_reader` (`pty.rs:151`)
  claims the reader only on success; the reader distinguishes clean EOF
  from pump failure with `PtyRecv::{Chunk,Empty,Eof,Error}`
  (`reader.rs:146`), `recv_timeout` (`reader.rs:244`) returning `Ok(None)`
  versus `Err(RecvTimeoutError::Disconnected)`, `recv` returning
  `io::Result<Option<Vec<u8>>>`, and `pump_error()` (`reader.rs:284`)
  exposing an owned failure record; the writer implements the
  newline-plus-`^D` drop-EOT sequence; and the PTY-master
  `EIO`-after-slave-close condition maps to clean EOF on every Unix target
  (Windows unchanged). In `bitty-lua`, the cheap-call bridge guard splits
  into `bounded` (`host.rs:553`, read-only calls keep the post-delivery
  deadline check) and `bounded_mutation` (`host.rs:587`, pre-call check
  only, used by `store.set` at `host.rs:930` and `notify.show` at
  `host.rs:993`), so a committed mutating effect is delivered instead of
  being discarded as `E_TIMEOUT`. BII-04 and BII-05 claims are unchanged:
  these semantics live in the `bitty-pty` host primitive and the Lua
  bridge, not in the `bitty-ipc` execution service, which is byte-identical
  in this window and still owns no process or PTY handle.
- `7993786` (#809, `crates/bitty-perf/src/latency.rs` 949 lines plus
  `benches/latency_real.rs`): the headless latency budget gate moves off
  deschedule-prone shipped percentiles onto the noise-robust work floor
  (`min_work_ms < HEADLESS_WORK_FLOOR_CEILING_MS`, `latency.rs:78`, PB-4
  p50 8 ms x `HEADLESS_SHARED_RUNNER_FACTOR` 4 at `latency.rs:61` = 32 ms),
  keeps a documented work-tail pathology guard
  (`HEADLESS_WORK_TAIL_CEILING_MS`, `latency.rs:84`, 15 ms x
  `HEADLESS_SHARED_RUNNER_TAIL_FACTOR` 8 at `latency.rs:73` = 120 ms), and
  reduces wall clock to a single liveness bound. Exact PB-4 verdicts stay
  pinned deterministically by `pb4_work_budget_classification_is_exact`
  (`latency.rs:784`), and the noise-discrimination probe
  `headless_work_budget_discriminates_scheduler_noise_from_work`
  (`latency.rs:668`) injects controlled stalls through
  `measure_latency_with_hook` (`latency.rs:294`) and `NoiseSite`
  (`latency.rs:267`). `bitty-perf` is a `publish = false` bench-harness
  crate consumed by `bitty-app` dev tracing and benches; it owns no
  production execution path and no IPC surface, so BII-04 and BII-05
  claims are unchanged.
- `317d4b4` (#807, `crates/bitty-term-state/src/state.rs`,
  `crates/bitty-term-state/src/state/hash.rs`,
  `crates/bitty-term-state/src/canonical.rs`,
  `crates/bitty-term-state/src/lib.rs` plus tests,
  `crates/bitty-rich/src/lib.rs`):
  `State::hyperlink_entry` (`state.rs:751`) returns to O(1) front-id
  arithmetic over the FIFO window (`checked_sub`/`get` with a defensive id
  check) instead of a linear scan of up to `HYPERLINK_TABLE_MAX` 1024
  entries (`state.rs:58`); the u32-wrap behavior is documented as id reuse
  after a full table clear; and `next_hyperlink_id` joins the canonical
  state hash with `CANONICAL_HASH_VERSION` bumped 5 -> 6
  (`canonical.rs:35`). Inside `bitty-rich` only the crate-level bounds row
  changed (oldest evicted, evicted ids fail closed, new links keep
  working); `crates/bitty-rich/src/projection.rs` is byte-identical, so
  BII-07 Delivered and Gap claims are unchanged.

The remaining items touch no BII gap file:

- `6b5d4ad` (#791): `CHANGELOG.md` only (169 insertions), recording the
  merged wave; no code, capability, or IPC file changes.
- `6a9ee85` (#800): `crates/bitty-plugin-host/src/manifest.rs` only; the
  filesystem capability predicate now requires a literal first child under
  a `~` root and normalizes separators and ASCII case, closing the
  overbroad home and `.`/empty-segment bypasses found in wave review. This
  is plugin manifest validation on the capability-request path, not the IPC
  gateway, so BII-01 through BII-10 claims are unchanged.
- `cfeffa2` (#794): `crates/bitty-package/src/requirement.rs` replaces the
  unchecked caret/tilde upper-bound increment with `checked_add` and a
  clean `PackageError` for unrepresentable bounds, with shorthand
  regression coverage in `bitty-package`,
  `bitty-plugin-host/src/registry.rs`, and the
  `bitty-runtime/src/plugin_runtime/package.rs` test module (test-only
  hunk). Package constraint evaluation, not the IPC gateway; DEC-0008
  keeps zero-padded comparator spellings, and no BII claim changes.

Zero-touch confirmations in this window (`git log db283e6..cfeffa2 -- <path>`
per path, all read-only):

| Path                                                 | Window result                                                                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `crates/bitty-ipc/` (whole crate)                    | Empty: no file touched, covering `wire.rs`, `channel.rs`, `bridge.rs`, `execution.rs`, `tool_dispatch.rs`, `snapshot.rs`, `rich_fragment.rs`, `host_bridge.rs`, `scope.rs`, `mcp.rs`, and `limits.rs`. |
| `crates/bitty-agent/src/message.rs`                  | Empty: the `ContentTrust` label is unchanged at `cfeffa2`; BII-06 Delivered and Gap claims hold.                                                                                                       |
| `crates/bitty-runtime/src/ai_panel.rs`               | Empty: no further movement on the #736 deprecation alias; the BII-08 Gap claim is unchanged.                                                                                                           |
| `crates/bitty-runtime/src/plugin_runtime/spawn.rs`   | Empty: the Layer-2 production spawn authorizer wiring is unchanged; the BII-04 Gap wording holds.                                                                                                      |
| `crates/bitty-runtime/src/host_bridge.rs`            | Empty: the committed-state read helpers are unchanged.                                                                                                                                                 |
| `crates/bitty-rich/src/projection.rs`                | Empty: the text-first fragment projection helper is unchanged.                                                                                                                                         |
| `crates/bitty-runtime/src/plugin_runtime/package.rs` | One commit only: `cfeffa2` (#794), whose hunk is inside `mod tests` (two `evaluate_compat` cases), with no production change.                                                                          |
| `crates/bitty-lua/tests/host_bridge.rs`              | One commit only: `3e1dfb3` (#781), test additions for the deadline semantics above.                                                                                                                    |

RFC synchronization check: the
[IPC and Agent Protocol RFC](../specifications/ipc-agent-rfc.md) Versioning section (wire
version `1` as the only version, discovery and `hello` advertisement) is
untouched by this window: neither `crates/bitty-ipc/src/wire.rs` nor
`crates/bitty-agent/src/message.rs` changes, so no RFC edit accompanies
this addendum and the #787 negotiation landing from the prior window
remains envelope plumbing with no wire version bump.

Conclusion restated unchanged: still missing for a live-host claim are
production publish call-sites and live terminal and process or PTY wiring
with transport, real capability backends beyond read-only inspect, unified
gate order with generation, schema, policy, and budget accounting, live
cancellation and acknowledgement-loss proofs, consumer substitution off
the pinned revision, typed rich fragments with render wiring and a
serving wire method, and executed Panel demotion with negative-evidence
code proof. This addendum grants no acceptance, sets no `bitty`-side
priority, closes no open question, and changes the status of no AIQ
entry; `bitty`-side decisions stay with the `bitty` repository through
its own review.

## Conclusion: what was delivered and what remains missing

Delivered in shape on `bitty` `main`: bounded snapshot, generic dispatch
with per-tool consent, execution shapes with a structured `Unknown`
query path, a publishable bridge client, text-first fragment ingestion,
and a candidate Panel reconciliation record, each with deterministic
bounded tests and fail-closed denials. The `789b6b2..2cbb1fb` window adds
the live-binding IPC half (bounded live store with live snapshot and
read-only inspect providers plus `HostCaller` bind), the text-first
fragment-to-`RichBlock` projection helper, the `bitty-runtime`
committed-state read helpers, and the Layer-2 production spawn
authorizer wiring with `DenyAll` retained as the baseline.

Still missing for a live-host claim: production publish call-sites and
live terminal and process or PTY wiring with transport, real capability
backends beyond read-only inspect, unified gate order with generation,
schema, policy, and budget accounting, live cancellation and
acknowledgement-loss proofs, consumer substitution off the pinned
revision, typed rich fragments with render wiring and a serving wire
method, and executed Panel demotion with negative-evidence code proof. No
acceptance decision for the `bitty` repository is made here; follow-up
scope belongs to the commander and the owning repositories.

## References

- [Bitty-Side Integration Input](bitty-side-integration-input.md) (Draft):
  BII-01 through BII-10 with G-2 and G-3 confirmation.
- [Execution ownership R1](../architecture/execution-ownership-r1.md) (Draft): execution
  ownership and registry-split framing.
- [Tool transport R2](../architecture/tool-transport-r2.md) (Draft): unified backend and
  transport open surface.
- [Task lifecycle R5](../architecture/task-lifecycle-r5.md) (Draft): lifecycle authority
  and handoff fencing.
- [AI Vertical Slice Pressure Test](../product/ai-vertical-slice-pressure-test.md)
  (Draft): gap wording and slice evidence.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): open
  register entries, unchanged by this note.
- [AI Architecture](../architecture/ai-architecture.md) (Draft): bridge process model and
  scene path.
