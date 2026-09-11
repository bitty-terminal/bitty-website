---
title: DevTools RFC
description: Defines the accepted instrumentation, event pipeline, and debug protocol contract for the plugin runtime and DevTools boundary
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 19
---

# DevTools RFC

> Status: **accepted** on 2026-08-28 by the project initiator. This document defines the accepted
> instrumentation, observability event pipeline, and versioned debug protocol for
> the plugin runtime and the DevTools boundary; it closes [OQ-019](../decisions/open-questions.md)
> at the design level. It does not describe implemented behavior, does not authorize
> shipped, stable, or compatibility-guaranteed behavior, and does not weaken any
> normative security control. Experimental implementation may exist as review evidence
> but carries no compatibility promise beyond the accepted contract. Acceptance was
> per independent category-owner, docs-curator, and security-auditor review (CTX-0053)
> with P0 sign-off simulated 2026-08-28; see [P0 Review Sign-off](#p0-review-sign-off)
> and the [P0 review checklist](../reviews/p0-review-checklist.md). The lifecycle is
> `Draft -> experimental review evidence -> Accepted -> normative`.
>
> Amendment A1 (Implemented-only, CTX-0124 design plus `bitty` CTX-0183,
> CTX-0188, CTX-0189): this RFC additionally documents a
> versioned test-automation scope (`bitty.debug/synthesizeInput`,
> `bitty.debug/captureFrame`) and a live-profiling scope (RSS, CPU,
> frame-time, GPU stats), coordinated with the
> [Performance Budget RFC](performance-budget-rfc.md) (OQ-001) and motivated by
> finding `ECO-DEV-04` (automated GUI test driver and input synthesis).
> Everything under [Test-automation scope](#test-automation-scope-implemented-only-amendment-a1)
> and [Live-profiling scope](#live-profiling-scope-implemented-only-amendment-a1) is
> Implemented-only evidence, not accepted contract: it authorizes no additional
> implementation beyond the merged `bitty` commits cited below,
> weakens no normative control, and records the implementation half of `bitty`
> CTX-0183 (verify harness, PR #328), CTX-0188 (frame capture plus input
> synthesis IPC, PR #332), and CTX-0189 (process memory, CPU, and frame
> profiling over IPC, PR #334) without moving acceptance. Admission of the
> keystroke-injection surface still requires category-owner plus
> security-auditor review before acceptance; see the admission gate below.
>
> Amendment A2 (Implemented-only, `bitty` CTX-0244 plus CTX-0242): this RFC
> additionally documents the `bitty.debug/frameHash` digest method (SHA-256
> over canonical frame bytes, new `FrameDigest` automation family, 120 s
> TTL cap, 2 digests/s, local-only, raw pixel channel deferred) and the
> V1-V3 panel-live visual gates built on frame-digest equality. Everything
> under [Frame digest method and panel-live gates](#frame-digest-method-and-panel-live-gates-implemented-only-amendment-a2)
> is Implemented-only evidence, not accepted contract: it authorizes no
> additional implementation beyond the merged `bitty` commits cited below,
> weakens no normative control (P0-AC-026 unchanged), and records the
> implementation half of `bitty` CTX-0244 (frameHash digest, PR #421) and
> CTX-0242 (V1-V3 harness gates, PR #423) without moving acceptance.

## Purpose and scope

[OQ-019](../decisions/open-questions.md) asks: _when do DevTools, record/replay,
debug protocol, and MCP adapter enter the roadmap?_ The sequencing half remains
owned by product governance and the
[Proposed Delivery Sequence](../product/proposed-delivery-sequence.md).
This RFC answers the contract half that earlier documents left open as a
candidate: what the runtime instruments, how observability events flow, and what
versioned debug interface exposes plugin-runtime state to DevTools, CLI, and MCP
consumers.

In scope:

- instrumentation points owned by the core runtime for plugin lifecycle,
  configuration evaluation, isolation budgets, and the plugin event pipeline;
- the observability event pipeline that carries those signals out of the hot
  paths;
- the debug protocol surface for the plugin runtime: sessions, methods, versioning,
  scopes, and error shape;
- transport, authentication, and scope rules for local DevTools consumers;
- privacy and redaction defaults for traces, snapshots, and recordings;
- the relationship to record/replay and to the MCP adapter.

Out of scope (owned elsewhere):

- plugin capability identifiers and manifest schema (OQ-012, accepted in
  [Plugin Platform RFC](plugin-platform-rfc.md));
- Plugin API v1 namespaces and lifecycle generations (OQ-011, accepted in
  [Plugin Platform RFC](plugin-platform-rfc.md));
- event phases, drop policy, and three-level queue budgets (OQ-013, accepted
  in [Plugin Platform RFC](plugin-platform-rfc.md); values tuned in
  [Isolation Resource RFC](isolation-resource-rfc.md));
- Lua runtime, standard-library subset, module resolution, and diagnostics
  (OQ-009, accepted in [Lua Runtime RFC](lua-runtime-rfc.md); follow-ups
  OQ-030, OQ-031, OQ-032);
- IPC wire format and per-action scopes for `bitty ctl` (OQ-018);
- image, rich-block, and structured-transport contracts (OQ-008, OQ-015, OQ-016);
- the headless daemon and remote UI question (OQ-020).

This RFC introduces no new trust boundary. Every transition into a privileged
operation stays behind the capability, scope, and budget gates already normative
in the security corpus.

## Normative sources this specification must not weaken

- [Security Overview](../security/overview.md): default posture
  (PTY, plugins, projects, IPC/MCP/Agent, packages, and reference repos are
  untrusted until a narrow grant); invariants 2, 3, 4, 6, 9, 10; trust
  boundaries for IPC/MCP, DevTools, and packages; capability families;
  P0 baseline including plugin limits, safe-mode recovery, and fuzz/testing
  rows.
- [Threat Model](../security/threat-model.md): assets, actors, boundary map,
  principal data flows, abuse cases T-06, T-07, T-09, T-10, T-11, and
  T-14, and the MCP/Agents/DevTools lane that labels terminal output
  untrusted observation data and distinguishes `debug.inspect`,
  `debug.trace`, and `debug.control`.
- [Security Risk Register](../security/risk-register.md): R-006, R-007,
  R-011, R-013, R-014, and R-018 as they touch the plugin runtime and
  observability surfaces.
- [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md):
  P0-AC-013 through P0-AC-016, P0-AC-021 through P0-AC-026, P0-AC-033,
  and the verification-method conventions.
- [Architecture Overview](../architecture/overview.md): the candidate
  instrumentation-to-protocol-to-consumers diagram
  (`internal instrumentation -> versioned debug protocol -> DevTools / CLI / MCP`)
  and the invariant that the debug protocol belongs inside the core boundary
  while DevTools and MCP are outside it.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md):
  core/plugin ownership split, reliability row (traces, record/replay hooks,
  debug instrumentation), and the rule that plugins and DevTools do not hold
  GPU objects, window handles, PTY file descriptors, or internal Rust handles.
- [Plugin Platform RFC](plugin-platform-rfc.md): manifest, capability
  model, lifecycle generations, and the authoritative event-pipeline section
  for delivery, ordering, and drop policy that this RFC references but does
  not duplicate.
- [Lua Runtime RFC](lua-runtime-rfc.md) and
  [Isolation Resource RFC](isolation-resource-rfc.md): VM construction,
  diagnostics classes, and the budget dimensions (RC-1, RC-2, RC-4, RC-5)
  whose counters this RFC exposes as observable state.

Where this RFC picks concrete defaults or encodings, it refines the candidate
material above; it does not move a requirement between owners or relax a gate.
If a mechanism here weakens a normative control, the normative text wins and
this RFC must be corrected.

## Terminology

| Term                | Accepted meaning                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Instrumentation     | Host-owned counters, timers, and trace points that observe runtime behavior without changing it.                                            |
| Observability event | Bounded, typed record emitted on the cold path for lifecycle, budget, queue, or diagnostic state, consumed only through the debug protocol. |
| Debug session       | Authenticated, scoped connection between a consumer (DevTools, CLI, MCP) and the core runtime for one instance.                             |
| Debug scope         | Named authority (`debug.inspect`, `debug.trace`, `debug.control`) granted separately from connection; connection alone grants none.         |
| Trace               | Time-ordered recording of instrumentation events and optional input markers, written to user-only storage with redaction.                   |
| Record/replay       | Deterministic capture of terminal inputs and protocol payloads that can reproduce a session without re-executing plugins.                   |
| Consumer            | DevTools UI, `bitty dev` / `bitty inspect` CLI surface, or MCP adapter that consumes the debug protocol; not a transport.                   |

## Accepted summary

1. Instrumentation is host-owned, bounded, and disabled-by-default for
   sensitive dimensions; plugins and project configuration cannot register
   instrumentation or mutate counters.
2. An observability event pipeline carries instrumentation records out of
   hot paths through per-consumer bounded queues with coalescing,
   batching, and counted drops; it references the single authoritative
   drop policy in [Plugin Platform RFC](plugin-platform-rfc.md) rather
   than refixing it.
3. A versioned, JSON-framed debug protocol exposes the plugin runtime
   (VMs, generations, handlers, queues, budgets, diagnostics) under the
   three debug scopes; the protocol belongs inside the core boundary and
   both DevTools and the MCP adapter are protocol consumers.
4. Record/replay is a staged capability built on the same instrumentation
   hooks but remains opt-in and local-only in v1; the MCP adapter is a
   thin, read-only translation over the debug protocol, not a second
   internal protocol.

## Instrumentation (accepted)

### Principles

1. Host-owned. Only Rust host code emits instrumentation. Lua code,
   whether `init.lua` or a plugin, receives no API to emit, forge, or
   suppress instrumentation events. The plugin host is the sole producer.
2. Cold-path only. Instrumentation never runs on the parser, render, or
   input hot paths synchronously. Hot-path facets expose only pre-aggregated
   counters sampled on the cold path, consistent with
   [Core and Plugin Boundaries](../architecture/core-boundaries.md) and
   P0-AC-015.
3. Bounded and attributable. Every record has a bounded size, a monotonic
   sequence, an owner (`PluginId` plus generation, terminal id, or
   authenticated client id), and a budget-dimension label where applicable.
   Unattributed instrumentation is a conformance bug.
4. Minimizing by default. Traces, snapshots, and recordings exclude raw
   input, clipboard content, environment bytes, and unbounded terminal
   text unless the session holds the explicit capability and the user
   has opted in, preserving the sensitive-data handling posture.
5. Fail-closed. If the instrumentation subsystem cannot start or detects
   that enforcement machinery is disabled, the runtime refuses to load
   plugins that require that machinery rather than running unbounded
   (FS-7 parity with [Isolation Resource RFC](isolation-resource-rfc.md)).

### Instrumentation points

| Point             | Source                                                                  | Emits                                                                                                                            | Privacy class                         |
| ----------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Config load       | Config VM (`bitty-config`)                                              | Diagnostic class (`syntax`, `resolution`, `validation`, `runtime`, `budget`), file, line, column, bounded message                | `inspect`                             |
| Plugin lifecycle  | Host lifecycle manager                                                  | Declared, Resolved, Registered, Activated, Suspended, Disposed plus generation id and cause                                      | `inspect`                             |
| Handler violation | Event pipeline and callback executor                                    | Owner, event type, soft-limit breach, timeout, error kind, generation                                                            | `inspect`                             |
| Budget state      | `bitty-lua` `VmBudgetSnapshot` and `bitty-plugin-host` `BudgetSnapshot` | RC-1 instruction and wall-clock counters, RC-2 memory, RC-4 task and timer counts, RC-5 queue depths                             | `inspect`                             |
| Queue accounting  | `EventQueue::push` and `EventPipeline::publish`                         | Per-subscription depth, per-plugin aggregate events and bytes, global aggregate events and bytes, drop count per queue           | `inspect`                             |
| Batch and drain   | `drain_batch`                                                           | Batch size events and bytes, coalesced count, batch boundary marker                                                              | `inspect`                             |
| Snapshot          | `bitty.terminal.snapshot` and host terminal state                       | Bounded semantic snapshot metadata (cursor, mode flags, semantic-zone count) with truncated text previews, never full scrollback | `inspect` with redaction              |
| Trace stream      | Observability pipeline                                                  | Time-ordered batch of instrumentation records plus wall-clock timestamp                                                          | `trace` (opt-in for sensitive fields) |
| Control action    | Debug protocol executor                                                 | `debug.control` invocations with authenticated caller, target, and result                                                        | `control` (audited)                   |

No point emits raw PTY bytes, raw clipboard bytes, or full environment
maps. Where terminal content appears (for example snapshot previews), the
emitter truncates to at most 8 KiB per record and applies the typed redaction
rules from P0-AC-026 before the record enters the observability queue.

### Budgets and cost model

Instrumentation itself consumes budgets:

- per-queue event text is bounded by `EVENT_MAX_BYTES` 8 KiB
  (`BoundedText` strict parity with [Plugin Platform RFC](plugin-platform-rfc.md));
- per-wakeup batching obeys 32 events or 8 KiB aggregate;
- per-consumer queues follow the three-level family accepted for the
  plugin event pipeline but are enforced separately for observability
  consumers so that DevTools backpressure cannot stall plugin delivery:
  PerSubscription 64, PerPlugin 1024 events or 256 KiB, Global 8192
  events or 2 MiB as accepted defaults referencing the same
  `DropPolicy` (DropOldest default, DropNewest alternative).
- long-lived traces are chunked at 256 KiB and spooled to user-only
  files (mode `0600`) rather than held in memory, matching the
  IPC and MCP response chunking already accepted for RC-10.

## Observability event pipeline (accepted)

This pipeline is distinct from the plugin event pipeline that delivers
`terminal.*` and `intercept.*` events to plugins. It reuses the same
design vocabulary but owns its own queues and budgets so that isolation
can be asserted independently.

### Delivery, ordering, and coalescing

1. Each authenticated debug session owns one bounded FIFO queue per
   subscription type (lifecycle, budget, queue-accounting, diagnostics).
   Producers never block on an observability subscriber; backpressure
   isolates at the queue boundary.
2. Coalescing merges successive budget and queue-depth records from the
   same owner into the latest value when the queue holds undelivered
   copies. Non-coalescable records (lifecycle transitions, handler
   violations, budget hard-gate suspensions) preserve one-by-one delivery
   up to the queue bound.
3. Drops follow the single authoritative statement in
   [Plugin Platform RFC](plugin-platform-rfc.md#delivery-ordering-batching-and-coalescing)
   rather than critiquing it: the observability pipeline references
   DropOldest as the accepted v1 default (consumer converges to latest
   state) and documents DropNewest as the alternative, with per-queue
   counted attribution and no silent loss, surfaced through `bitty
plugin doctor` and `bitty dev doctor`.
4. Ordering is FIFO within one subscription queue; no ordering is
   promised across queues, across plugins, or between observability
   delivery and unrelated user actions. Where composition needs order
   (for example a snapshot followed by its owning generation), the
   protocol includes an explicit sequence marker rather than relying on
   incidental timing.
5. Batching is bounded: at most 32 records or 8 KiB per wakeup,
   whichever is smaller, so one burst cannot turn into a single
   oversized callback. Tuning belongs with the budget owners in
   [Isolation Resource RFC](isolation-resource-rfc.md).

### Publisher and drain

```text
host emitter (plugin host, bitty-lua, bitty-config, terminal state)
        |
        v
observability publisher (bounded, non-blocking, counted)
        |
        v
per-session bounded queue (FIFO, coalescing, DropPolicy)
        |
        v
drain_batch (<= 32 records or 8 KiB) -> debug protocol framing
```

The publisher is synchronous at the emission site but bounded and
non-blocking: if the queue is full, the drop policy applies and the drop
counter increments atomically. The drain side runs on the cold path
scheduler and never holds the parser, render, or input domain locks.

## Debug protocol (accepted)

### Boundary and ownership

The debug protocol belongs inside the core boundary as required by
[Architecture Overview](../architecture/overview.md) and
[Core and Plugin Boundaries](../architecture/core-boundaries.md).
DevTools UI, the `bitty dev` / `bitty inspect` CLI surfaces, and the MCP
adapter are protocol consumers, not protocol owners. The protocol does not
link application-private types; it exchanges versioned, schema-validated
JSON records over a bounded framing.

### Versioning and framing

- Wire format: newline-delimited JSON (JSONL) over the IPC transport
  already required by the threat model (Unix socket under
  `$XDG_RUNTIME_DIR/bitty` mode `0600` or Windows named pipe with
  current-user ACL). No TCP listener is enabled by default, preserving
  P0-AC-021.
- Message shape:

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "bitty.debug/listPlugins",
  "params": { "generation": null },
  "version": "1.0"
}
```

- Responses carry `result` or `error`:

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": { "plugins": [] },
  "version": "1.0"
}
```

- Errors are typed: `category` (`usage`, `capability`, `scope`, `budget`,
  `generation`, `transport`), stable `code`, bounded `message`, and
  optional `details` that never echo unbounded untrusted bytes.
- Version negotiation: clients send `version: "1.0"` and the server
  replies with the effective version. Minor versions are additive-only;
  removing or narrowing an existing method requires a major version and
  a reviewed migration note in this RFC.
- Payload limits: inbound method frames at most 1 MiB; outbound streams
  are chunked at 256 KiB with explicit continuation frames.

### Scopes

A session begins with zero debug scopes. Separate consent grants each
scope, and no scope is implied by connection or by holding another scope.
This preserves P0-AC-025 and the threat-model partition for DevTools:

| Scope           | Accepted v1 authority                                                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `debug.inspect` | Read lifecycle, registrations, manifests, active queues, budget snapshots, coalesced queue depths, and redacted semantic previews. No trace collection and no VM control.                          |
| `debug.trace`   | `inspect` plus time-ordered instrumentation batches, structured traces, and opt-in input markers where minimization and typed redaction already apply. Creates user-only trace files.              |
| `debug.control` | `inspect` plus VM suspend, resume, handler detachment, and generation-disposal requests for diagnosis; each invocation is audited with caller identity. Cannot bypass a capability or budget gate. |

All capability identifiers and scope checks are server-side; clients never
assert scope. The request succeeds only when the authenticated caller
holds both the capability and the debug scope. `debug.control` actions
affect only the owning plugin generation and never sibling plugins or
unrelated terminals, matching FS-3 containment.

### Plugin-runtime methods (accepted v1)

Methods are grouped by concern. Parameters and results are bounded and
schema-validated; unknown fields fail closed.

| Method                          | Scope     | Accepted params                                                                  | Accepted result                                                                                                 |
| ------------------------------- | --------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `bitty.debug/listPlugins`       | `inspect` | optional `generation` filter                                                     | Array of `{ id, version, generation, state, manifestHash, capabilities }`                                       |
| `bitty.debug/getPlugin`         | `inspect` | `pluginId`                                                                       | Manifest, declared triggers, resolved graph edge, current generation state                                      |
| `bitty.debug/listSubscriptions` | `inspect` | `pluginId`                                                                       | Array of `{ eventType, queueDepth, queuedBytes, dropCount, policy }`                                            |
| `bitty.debug/getBudgets`        | `inspect` | `pluginId`, `generation`                                                         | `VmBudgetSnapshot` plus RC-1, RC-2, RC-4, RC-5 counters, `would_exceed_lua_limits` verdict                      |
| `bitty.debug/getQueueSnapshot`  | `inspect` | `pluginId`                                                                       | PerSubscription, PerPlugin, and Global aggregates, `invariant_queue_bounds` / `invariant_global_bounds` verdict |
| `bitty.debug/getSnapshot`       | `inspect` | `terminalId`, `scope: "semantic"`                                                | Bounded semantic snapshot with truncated previews, mode flags, semantic-zone metadata, redaction marker         |
| `bitty.debug/listHandles`       | `inspect` | `pluginId`                                                                       | Host-object handles held by the VM, their capability owners, and reference counts                               |
| `bitty.debug/streamEvents`      | `trace`   | `types[]`, `batch: { maxEvents, maxBytes }`                                      | Chunked observability batches with sequence and drop-count headers                                              |
| `bitty.debug/startTrace`        | `trace`   | `{ durationMs?, maxBytes?, includeInput: false }` plus redaction policy election | Trace id, spool path, chunk size, wall-clock start                                                              |
| `bitty.debug/stopTrace`         | `trace`   | `traceId`                                                                        | Byte count, drop count, preview list, export-size estimate                                                      |
| `bitty.debug/fetchTraceChunk`   | `trace`   | `traceId`, `offset`                                                              | At most 256 KiB chunk with continuation flag and byte-accurate preview                                          |
| `bitty.debug/suspendHandler`    | `control` | `pluginId`, `handlerId`, `cause`                                                 | Generation state after detach, reactivation requirement                                                         |
| `bitty.debug/resumePlugin`      | `control` | `pluginId`, `generation`                                                         | New generation id or typed rejection if the budget or capability gate still fails                               |
| `bitty.debug/disposeGeneration` | `control` | `pluginId`, `generation`                                                         | Disposal receipt with reclaimed task, timer, queue, and handle counts                                           |

All methods respect generation ownership: resources are addressed as
`(PluginId, generation)`, consistent with [Plugin Platform RFC](plugin-platform-rfc.md)
lifecycle generations. Methods that touch terminal state (for example
`getSnapshot`) inherit the `terminal.*` capability checks on top of the
debug scope so that DevTools cannot expand its authority through a debug
method.

### Relation to `bitty dev` CLI

The [CLI](../interfaces/cli.md) candidate namespace maps onto the same
methods:

| CLI candidate                               | Protocol method                       |
| ------------------------------------------- | ------------------------------------- |
| `bitty dev plugins list --format json`      | `bitty.debug/listPlugins`             |
| `bitty dev trace start --max-bytes 1048576` | `bitty.debug/startTrace`              |
| `bitty dev trace stop <id>`                 | `bitty.debug/stopTrace`               |
| `bitty inspect plugin <id>`                 | `bitty.debug/getPlugin`               |
| `bitty doctor` / `bitty plugin doctor`      | Budget and queue snapshots aggregated |

CLI consumers authenticate and authorize through the same per-session
scopes as a graphical DevTools client; the command adapter never widens
a scope.

## Test-automation scope (Implemented-only, Amendment A1)

> Status: Implemented-only. This section documents `bitty` CTX-0183 (PR #328,
> commit `b795f90`, headless verify harness) and CTX-0188 (PR #332, commit
> `144ee1c`, `synthesizeInput` plus `captureFrame`) as merged implementation
> evidence and carries no acceptance, no compatibility promise, and no Verified
> claim. It must not weaken any normative control listed under
> [Normative sources this specification must not weaken](#normative-sources-this-specification-must-not-weaken);
> where it conflicts with one, the normative text wins.

GUI integration tests currently rely on manual execution or software-rendering
dumps (finding `ECO-DEV-04`: automated GUI test driver and input synthesis).
This scope lets an automated end-to-end harness drive one terminal and assert
on its rendered frame without manual interaction, under explicit, revocable,
per-session authority.

The headless verify harness is implemented in `bitty` CTX-0183 (PR #328,
commit `b795f90`, `crates/bitty-ipc/tests/devtools_verify.rs`): state asserts
over the IPC socket as Implementation evidence only. It creates no new method,
scope, transport, or budget and moves no acceptance; the bearer, redaction,
and rate rules below still govern the two automation methods.

### Versioning

The two methods below are implemented in `bitty` CTX-0188 (PR #332) as
protocol version `1.1` surface (Implemented-only, not Accepted or Verified):
purely additive over the accepted v1.0 surface, with no change to any existing
method, scope, bound, or error shape. Unknown-field fail-closed, payload
limits (1 MiB inbound, 256 KiB outbound chunks), and the major-version rule
for removals all continue to apply.

### Methods

| Method                        | Required scope and bearer                                           | Implemented params                                                                                     | Implemented result                                                                              |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `bitty.debug/synthesizeInput` | `debug.control` plus per-session automation bearer for one terminal | `terminalId`, `events[]` (at most 64 entries: bounded key, mouse, or paste-text events), `originLabel` | Receipt `{ accepted, rejected, syntheticSeq }` with per-event attribution                       |
| `bitty.debug/captureFrame`    | `debug.trace` plus per-session automation bearer for one terminal   | `terminalId`, `format: "semantic"` (default) or `"pixels"`, optional viewport cap                      | Bounded frame record (geometry, frame sequence, truncated redacted preview), chunked at 256 KiB |

### Semantics

1. `synthesizeInput` delivers events into the addressed terminal's input path
   as synthetic-origin input. It executes no command directly, passes no PTY
   file descriptor, and addresses exactly one `terminalId` per call; wildcard
   or multi-terminal targeting fails closed with a typed `usage` error.
2. Pasted text travels through the same paste inspection as local pastes
   (T-04 parity): scheme execution, shell interpolation, and clipboard
   exfiltration paths stay closed regardless of synthetic origin.
3. Every accepted synthetic event carries an indelible synthetic-origin
   marker visible to input-marker traces, so a recording can always
   distinguish harness input from user input.
4. `captureFrame` in `semantic` format returns the same bounded, redacted
   content class as `getSnapshot` (geometry, mode flags, semantic-zone
   metadata, truncated text previews at most 8 KiB per record). `pixels`
   format additionally requires per-call explicit opt-in, is masked over
   sensitive regions by default, is capped to the addressed viewport, and
   each call is audited with caller identity.
5. Both methods inherit the terminal capability checks of the addressed
   terminal on top of the debug scope, exactly as `getSnapshot` does, so
   automation cannot expand its authority through a debug method.

### Automation bearer scoping

The automation bearer is a server-side, per-session sub-grant bound to one
triple of (debug session, `terminalId`, method family) with a short expiry
(implemented default 10 minutes per `bitty` CTX-0188, never exceeding the
owning session lifetime):

1. Issuance requires explicit local-user consent on the owning authenticated
   session (a DevTools UI gesture or a `bitty dev` confirmation prompt).
   There is no issuance path from flags, environment variables, configuration
   files, or child-process inheritance (P0-AC-023 parity).
2. The bearer is never persisted to disk, never exported to another session,
   and never widened: a `synthesizeInput` bearer cannot capture frames, a
   bearer for one terminal cannot address another, and expiry or session end
   revokes it immediately.
3. The MCP adapter never holds an automation bearer under its read-only
   default; agent-driven input or capture needs separate per-client elevation
   and consent per the threat-model MCP lane (T-10 parity).
4. Revocation reuses the accepted session-consent lifecycle: explicit revoke
   calls, `bitty plugin revoke` parity, and host-side detachment with an
   auditable receipt.

### Redaction defaults

Typed redaction (P0-AC-026 parity) applies before any frame or marker enters
a queue: seeded secrets, clipboard bytes, and environment bytes never appear
in default outputs; input markers stay opt-in; spool files keep mode `0600`;
export preview equals actual export byte-for-byte. Every `captureFrame`
response is labeled untrusted observation data, exactly like other
terminal-content responses (T-10 parity).

### Rate and budget bounds

Transport bounds stay at RC-9 parity (100 req/s sustained, 2x burst for one
second, 1 MiB inbound frames, 16 concurrent connections per endpoint with
newest-first shedding). On top of them, each automation method carries its
own implemented per-session ceiling per `bitty` CTX-0188 (`synthesizeInput`:
at most 64 events per call and 10 calls per second sustained; `captureFrame`:
at most 10 frames per second sustained). Both methods draw from the same per-consumer
observability queues and batching (32 records or 8 KiB per wakeup), overruns
shed with typed `budget` errors and counted drops, and automation load must
not breach the PB-4 tail-latency or PB-7 idle-resource budgets defined in the
[Performance Budget RFC](performance-budget-rfc.md).

### Abuse-case coverage for keystroke injection

| Abuse case                                               | Required defense in this scope                                                              | Source       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------ |
| Pasted payload reaches a shell or dangerous scheme       | Paste inspector applies to synthetic pastes; text-only, no interpolation                    | T-04         |
| Same-user or remote process takes over IPC               | Peer-credential checks, per-session bearer bound to one terminal, no ambient credential     | T-09         |
| Agent drives the terminal through harness input          | MCP default holds no bearer; separate per-client elevation, consent, and audit              | T-10         |
| Frame capture exfiltrates credentials                    | Redaction defaults, sensitive-region masking, opt-in pixels, user-only storage              | T-11         |
| Runaway harness floods input or capture                  | Per-method rate ceilings, RC-9 shedding, counted drops, revocable bearer                    | R-007, R-011 |
| Synthetic input widens a scope or bypasses a budget gate | Capability-plus-scope intersection on every call; no bypass flag, variable, or build switch | R-006, R-011 |

### CLI and MCP staging (proposed; protocol methods Implemented-only)

Candidate CLI mappings (no CLI implementation claimed; the two protocol
methods above are Implemented-only in `bitty` CTX-0188 while CLI verbs stay
out of scope per that commit):

| CLI candidate (proposed)                               | Protocol method               |
| ------------------------------------------------------ | ----------------------------- |
| `bitty dev synthesize --terminal <id> --events <file>` | `bitty.debug/synthesizeInput` |
| `bitty dev capture --terminal <id> --format semantic`  | `bitty.debug/captureFrame`    |

The MCP adapter must not expose either method under its v1 read-only
default; post-v1 exposure belongs to a separately reviewed elevation model
and is an explicit non-goal of this amendment.

### Admission gate

Acceptance of this scope, and in particular of the keystroke-injection
surface, requires all of the following before any `Accepted` marker moves:

1. Category-owner (architecture/IPC) plus security-auditor review with a
   recorded P0 delta for T-04, T-09, T-10, and T-11.
2. Green verification items covering the bearer matrix (absent, expired,
   wrong-session, wrong-terminal bearers all fail closed), rate-cap
   shedding order, frame redaction with preview-equals-export, and the
   no-bypass audit extended to bearer issuance.
3. Proof that sustained automation load at the implemented ceilings breaches
   neither PB-4 tail latency nor PB-7 idle budgets.

## Live-profiling scope (Implemented-only, Amendment A1)

> Status: Implemented-only. This section documents `bitty` CTX-0189 (PR #334,
> commit `7dbe4e2`, `getProcessStats`/`getFrameStats` plus
> `streamProcessStats`/`streamFrameStats`) as merged implementation evidence
> and carries no acceptance, no compatibility promise, and no Verified claim.
> Metric definitions and measurement conditions are reused verbatim
> from the [Performance Budget RFC](performance-budget-rfc.md) (OQ-001);
> this scope adds no new budget and changes no number.

### Surface

Live profiling is read-only observation of process and rendering health,
exposed through the same versioned debug protocol and per-consumer
observability queues; it creates no new queue family and no new transport:

| Implemented method               | Required scope  | Implemented content (numeric aggregates only)                                                                    |
| -------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `bitty.debug/getProcessStats`    | `debug.inspect` | RSS, average CPU over a bounded window, task and timer counts, using the PB-2, PB-3, and PB-7 conditions         |
| `bitty.debug/getFrameStats`      | `debug.inspect` | Frame-time p50/p99, presented-fps, missed-present count, GPU memory where the renderer exposes it, backend label |
| `bitty.debug/streamProcessStats` | `debug.trace`   | Sampled subscription (`process-stats`) over the accepted `streamEvents` batching and chunking                    |
| `bitty.debug/streamFrameStats`   | `debug.trace`   | Sampled subscription (`frame-stats`) over the accepted `streamEvents` batching and chunking                      |

Point-in-time getters serve DevTools inspection; the two streaming
subscriptions serve live views. Both reuse the accepted batching (32 records
or 8 KiB per wakeup), 256 KiB chunking, and counted-drop semantics.

### Sampling-versus-tracing posture

Sampling is the only profiling posture in this scope:

1. The profiler reads pre-aggregated counters on the cold path at a sampled
   cadence with an implemented interval floor of 100 ms per `bitty` CTX-0189;
   successive samples from the same owner coalesce latest-wins, consistent with
   the accepted coalescing rule.
2. No profiler code runs synchronously on the parser, render, or input hot
   paths, preserving the cold-path-only instrumentation principle and the
   PB-4 tail-latency budget.
3. Per-frame event tracing and any sub-100 ms cadence are explicitly
   deferred: admission needs a future amendment with PB-4 and PB-7
   neutrality proof under tracing load.

### Privacy and redaction

Profiling records carry zero terminal bytes: no PTY output, no clipboard
content, no environment maps, no frame text. Renderer-supplied label strings
are bounded (at most 256 characters per the RFC candidate bound enforced by
the `bitty` CTX-0189 implementation), never echo terminal content,
and are labeled untrusted observation data. Spooled exports, if any, follow
the accepted trace-file rules (user-only storage, mode `0600`,
preview-equals-export).

### Explicit non-goals

This scope is not a system-wide profiler, attributes no process outside
Bitty, intercepts no GPU API, establishes no always-on telemetry, aggregates
nothing across sessions, sets no battery metric, changes no Performance
Budget number or release gate, streams no profiling state over the v1 MCP
adapter, and admits no per-frame tracing posture. Battery metrics and
platform-tier relaxations stay owned by OQ-001 open items and OQ-003.

### Verification (open; acceptance still required)

Beyond the accepted verification plan, acceptance of both Amendment A1 scopes
still requires at minimum (implementation is merged; acceptance is open):

1. Bearer matrix: absent, expired, wrong-session, and wrong-terminal bearers
   fail closed with typed `scope` errors and zero partial state for both
   automation methods.
2. Rate-cap shedding: sustained load above each implemented per-method ceiling
   sheds with typed `budget` errors, counted drops stay byte-accurate, and
   benign concurrent sessions are unaffected.
3. Frame redaction: seeded secrets, clipboard bytes, environment bytes, and
   unopted input markers never appear in `captureFrame` output; `0600`
   mode asserted on spool files; export preview equals actual export
   byte-for-byte.
4. Profiling neutrality: sampling at the interval floor breaches neither the
   PB-4 tail-latency budget nor the PB-7 idle-resource budget; hot-path
   latency probes show no profiler callback registration.
5. No-bypass audit extended: no flag, variable, configuration key, or debug
   build switch issues, persists, or widens an automation bearer.

## Frame digest method and panel-live gates (Implemented-only, Amendment A2)

> Status: Implemented-only. This section documents `bitty` CTX-0244 (PR
> #421, commit `3f5ed24`, `bitty.debug/frameHash` digest method) and
> CTX-0242 (PR #423, commit `29772a3`, V1-V3 panel-live visual gates) as
> merged implementation evidence and carries no acceptance, no
> compatibility promise, and no Verified claim. It must not weaken any
> normative control listed under
> [Normative sources this specification must not weaken](#normative-sources-this-specification-must-not-weaken);
> where it conflicts with one, the normative text wins. P0-AC-026 is
> unchanged: digests are uninvertible, carry no text, and cannot leak
> clipboard or environment bytes, so the redaction boundary does not move.

The V1-V3 gates ask an equality question — does the frame the IPC path
observed equal the frame the present path produced — not a transport
question. A collision-resistant digest over canonical frame bytes answers
equality in 32 bytes with zero pixel bytes on the wire.

### Digest method

| Implemented method      | Required scope and bearer                                                       | Implemented content                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `bitty.debug/frameHash` | `debug.trace` plus per-session `FrameDigest` automation bearer for one terminal | Hex SHA-256 digest (`algo: "sha256-v1"`) over canonical `BFH1` header plus `headless_rgba`, with frame sequence |

1. Canonical bytes are the `BFH1` magic plus big-endian width, height,
   and frame sequence followed by the raw premultiplied RGBA bytes. The
   hash is std-only SHA-256 (no new dependency), pinned against the NIST
   `"abc"` vector plus fixed canonical-frame vectors so the algorithm can
   never silently drift; any future layout change bumps `sha256-v1` with a
   dual-verify migration.
2. Issuance reuses the CTX-0188 consent minter with no new scope and no
   widening: the new `AutomationFamily::FrameDigest` bearer can never
   satisfy a `Capture` check. Its TTL cap is 120 s (2 minutes, strictly
   below the 10-minute automation cap), and its rate ceiling is 2
   digests/s per bearer (overruns shed with typed `budget` /
   `RateLimited` errors).
3. Transport stays local-attested only; unattributed or out-of-scope
   calls fail closed with `ScopeDenied`. Every attributable call —
   granted and denied — appends one `digest` audit entry (caller
   identity, frame sequence, served digest) to the bounded log (64
   entries, drop-oldest).
4. No raw pixel channel exists: pixel bytes never cross IPC under any
   grant. That option stays deferred; admitting it needs a separate
   review, not an extension of this amendment.

### V1-V3 panel-live gates

Implemented in `bitty` CTX-0242 as headless digest-equality gates
(`crates/bitty-runtime/tests/panel_live_framehash.rs`), all
Implemented-only evidence, not Verified:

- V1 gap-diff plus rerun: the gapped digest differs from the no-gap
  baseline for the same frame, and a rerun digest matches.
- V2 focus-change plus restore: moving focus changes the digest, and
  switching back restores it.
- V3 workspace-alias parity: the `workspace` canonical path and the
  `tabs` shim produce equal digests.
- A real-Unix-socket `frameHash` round-trip proves the served digest
  equals the present-path digest with zero pixel bytes. The live-grant
  ws4 ceremony stays local-manual (ignore-gated).

Acceptance of this amendment needs the Amendment A1 admission gate plus
frame-digest specifics: the 120 s TTL and 2/s ceiling stay adequate under
harness load, the digest audit stays byte-accurate under contention, and
no pixel channel ships without its own reviewed amendment.

## Transport, authentication, and session lifecycle (accepted)

1. DevTools connections use the existing IPC transport: current-user
   Unix socket under `$XDG_RUNTIME_DIR/bitty` mode `0600` or Windows
   named pipe with current-user ACL; peer credentials are validated at
   connect and re-checked per privileged action (P0-AC-021, P0-AC-022
   parity).
2. No ambient credential: child processes and the DevTools transport
   never carry a durable administrator token or a token that survives
   shell startup or SSH environment forwarding (P0-AC-023).
3. Concurrent connections are bounded (accepted default 16 per
   endpoint) and excess connections are shed newest-first; payload and
   request-rate limits follow RC-9 (100 req/s sustained, 2x burst for
   one second, 1 MiB per frame, DM).
4. Session consent is per-client, least-privilege, and revocable:
   `bitty plugin revoke` and the plugin-manager action remove debug
   grants, and the host detaches affected handlers at the next dispatch
   boundary with an auditable receipt.

> Implementation note (Implemented-only, CTX-0127): Windows instance
> discovery over named pipes is implemented in `bitty` CTX-0196 (PR #330,
> commit `8af138e`, registry-dir scan plus live pipe-namespace enumeration
> with Unix exit-code parity). The accepted transport contract above is
> unchanged; this note claims no Verified status.

## Record/replay and MCP adapter (accepted staging)

### Record/replay

Record/replay is staged rather than promised for v1:

- v1 scope: deterministic capture hooks for parser inputs, semantic
  actions, configuration diagnostics, and lifecycle transitions are
  present but disabled by default; enabling them requires a `debug.trace`
  session and writes redacted recordings to user-only storage with
  explicit opt-in for input markers.
- Replay runs only inside the headless harness and the test suite, not
  as an automatic in-application re-execution path that could bypass
  capability or budget gates.
- Full session record/replay with PTY output and renderer-snapshot
  correlation is deferred past v1 and tracked as a follow-up item to
  this RFC; its admission must link the normative sensitivity and
  transport controls it relies on.

### MCP adapter

MCP remains an adapter, not an internal protocol, as required by
[Architecture Overview](../architecture/overview.md):

- the adapter translates MCP operations into versioned debug-protocol
  calls and labels every terminal-content-bearing response as untrusted
  observation data, preserving P0-AC-024 and T-10;
- default MCP authority stays read-only (list, inspect, snapshot
  preview, budget and queue reading); sending input, spawning a
  process, installing a plugin, or writing configuration requires
  separate per-client elevation, and the adapter never combines
  a read-only MCP scope with filesystem or network authority
  automatically;
- the adapter reuses the per-connection framing, chunking, and rate
  limits of the debug transport.

## Security alignment and traceability

| Accepted element                                                        | Normative gate it implements                                          | Threat / Risk IDs        |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------ |
| Debug protocol inside core boundary; DevTools/MCP outside it            | Architecture invariant that prevents application-private type linkage | T-14, R-018              |
| Host-owned instrumentation, no Lua-authored events                      | Plugin escape and hot-path exclusion                                  | T-06, T-07, R-006, R-007 |
| Bounded emitters, non-blocking publisher, per-consumer queues           | Invariant 4 (no hot-path execution), invariant 7 (bounded inputs)     | T-07, R-007              |
| Drop policy references single authoritative statement                   | OQ-013 accepted DropOldest default                                    | R-007                    |
| `debug.inspect` / `trace` / `control` distinct, ungranted by connection | Threat model MCP/Agents/DevTools lane, per-action scopes              | T-09, R-011, R-014       |
| Minimization, typed redaction, opt-in input, 0600 files, export preview | Sensitive-data handling, invariant 9                                  | T-11, R-014              |
| Untrusted-observation labeling on all terminal-content responses        | Agent confused-deputy defense                                         | T-10, R-013              |
| Transactional audit for `debug.control` actions                         | FS-4 attribution, containment FS-3                                    | R-007                    |
| No bypass API, no environment-variable weakening                        | No silent weakening (FS-9)                                            | R-006, R-007, R-011      |
| Safe-mode independence preserved                                        | Invariant 10, `bitty --safe`                                          | R-009                    |

## Verification plan

Acceptance of an implemented contract later requires at minimum:

1. Scope matrix: connection alone grants none of `debug.inspect`,
   `debug.trace`, or `debug.control`; each matrix cell has a negative
   test (P0-AC-025 parity).
2. Capability-plus-scope intersection: a DevTools call that would read
   terminal raw text fails when either `terminal.raw-read` or
   `debug.inspect` is missing; no debug scope enlarges a plugin's
   capability.
3. Transport checks: Unix socket mode `0600`, Windows current-user ACL,
   peer-credential validation at connect and per privileged action, no
   default TCP listener, foreign-user connect denied, same-user
   endpoint tampering detected, concurrent-connection shedding order
   proven (P0-AC-021, AT-IR-011, AT-IR-012 parity).
4. Instrumentation determinism: repeated runs against a fixture
   (hostile Lua chunk, budget-failing plugin, queue-flooding plugin)
   produce identical attributed record counts and identical
   `BudgetSnapshot` counters within one scheduling quantum.
5. Hot-path isolation: latency probes on the parser, render, and input
   paths show that observability drains do not breach PB-4 tail
   budgets while a trace is active; long-running fuzz of the JSONL
   framing shows no hot-path callback registration.
6. Framing and limits: payload-size, fragmented-frame, deep-nesting,
   duplicate-key, oversized-field, and truncated-payload suites all
   fail closed with typed errors and zero partial state.
7. Queue-budget property tests: per-session observability queues never
   exceed their cap, producers never block, coalescing matches declared
   semantics, drop attribution is byte-accurate, and both
   `DropOldest` and `DropNewest` behaviors can be exercised under the
   harness parameter.
8. Redaction tests: seeded secrets, clipboard bytes, environment bytes,
   and input markers never appear in default `inspect` or unlabeled
   `trace` outputs; `0600` mode asserted on trace files; export
   preview equals actual export byte-for-byte (P0-AC-026 parity).
9. Safe-mode and recovery: boot with hostile third-party plugins while
   a debug session is active still reaches a usable terminal via
   `bitty --safe` with zero third-party plugins loaded and zero
   pending instrumentation leaks across restart.
10. No-bypass audit: no feature flag, environment variable, or debug
    build switch suppresses a budget, scope, or redaction check;
    exhaustive search of the option surface proves the negative.

Every criterion above is an `adversarial` or `integration` check
accompanied by a `manual-audit` record from a security reviewer before
it may move the linked risk toward `Mitigated`.

## Open points

Deliberately unresolved at acceptance time. None blocks this accepted contract; each will
require a follow-up decision:

1. Exact default trace duration and maximum byte budgets for v1 versus
   tiered profiles for heavy diagnostics.
2. Whether trace export includes an encrypted-at-rest option on
   platforms with OS keychain support, and its key-enrollment flow.
3. Where `bitty dev` versus `bitty inspect` draws its command boundary
   (the plugin host already reserves `plugin doctor` for budgets;
   overlay and renderer-dev commands belong outside the debug protocol).
4. Whether the MCP adapter exposes streaming trace chunk subscriptions
   or remains request-response only for v1.
5. Alternate-screen and overlay interaction: what `getSnapshot` preview
   contains while a full-screen TUI owns the viewport.
6. Whether the Configuration VM receives a distinct budget profile for
   `bitty config check` traces and how its cost charges against PB-1
   and PB-2.
7. Exact retention, rotation, and garbage-collection policy for trace
   files under the platform data and state directories.
8. Presentation for multi-session hosts: how `instance`, `window`, `view`,
   and `terminal` identifiers surface in the debug protocol when more
   than one graphical session exists.
9. (Amendment A1, Implemented-only, acceptance open) Automation bearer
   issuance UX and TTL default: how consent is presented and whether the
   implemented 10 minutes remains the right expiry.
10. (Amendment A1, Implemented-only, acceptance open) `pixels`-format
    retention, rotation, and garbage collection alongside the accepted
    trace-file policy in item 7.
11. (Amendment A1, Implemented-only, acceptance open) Admission criteria for
    a future per-frame tracing posture, including its PB-4 and PB-7 neutrality
    proof.
12. (Amendment A1, Implemented-only, acceptance open) Whether `captureFrame`
    or profiling streams ever join a post-v1 MCP elevation model, and under
    which consent shape.
13. (Amendment A2, Implemented-only, acceptance open) Whether the
    `FrameDigest` bearer TTL cap (120 s) and rate ceiling (2 digests/s)
    stay adequate under harness load, and whether a raw pixel channel is
    ever admitted (deferred; needs its own reviewed amendment, never an
    extension of A2).

## Acceptance criteria

This RFC is accepted on 2026-08-28 and closes [OQ-019](../decisions/open-questions.md).
The following criteria were satisfied per the [open-question register](../decisions/open-questions.md)
rules:

1. The prose and every identifier in the OQ-019 row of
   [open-questions.md](../decisions/open-questions.md) have independent
   category-owner, docs-curator, and security-reviewer sign-off, including
   every scope boundary and the record/replay staging.
2. Affected documents were synchronized in the same change: the DevTools
   candidates in [Architecture Overview](../architecture/overview.md),
   [Core and Plugin Boundaries](../architecture/core-boundaries.md),
   [CLI](../interfaces/cli.md), and the delivery sequence reference
   the accepted contract, and the open-question row moves from pointer
   to closure per the register close rule.
3. No element weakens a normative P0 gate; any discovered conflict
   returns the conflicting clause to revision rather than downgrading
   the gate.
4. The draft text in this file is updated to record acceptance date
   and initiator, frontmatter is `accepted`, and links from
   [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
   and the [decision register](../decisions/index.md) reflect the
   accepted protocol version without claiming implementation.

## P0 Review Sign-off

> P0 review per CTX-0053 tracks acceptance of OQ-019 via this RFC. Frontmatter is `accepted` and
> [open-questions.md](../decisions/open-questions.md) is updated per its close
> rule. This section records passing sign-off and closes OQ-019.

| Role                          | Reviewer          | Verdict | Evidence / scope                                                                                                                                                                                                 | Date       |
| ----------------------------- | ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| security-auditor              | `bitty-security`  | pass    | R-014, T-11, P0-AC-025/P0-AC-026, `debug.inspect`/`trace`/`control` scopes, redaction, `0600` mode, export preview equals actual export                                                                          | 2026-08-28 |
| category-owner (architecture) | `bitty-architect` | pass    | Instrumentation points, observability event pipeline, per-consumer bounded queues, `DropOldest` default, coalescing and `drain_batch` bounds                                                                     | 2026-08-28 |
| category-owner (quality)      | `bitty-quality`   | pass    | Versioned debug protocol, scope separation, generation ownership, framing and chunking, verification plan                                                                                                        | 2026-08-28 |
| docs-curator                  | `bitty-curator`   | pass    | Frontmatter `accepted`, taxonomy, links to [Architecture Overview](../architecture/overview.md) and [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md), English-only, decision-register sync | 2026-08-28 |

As of 2026-08-28, instrumentation and the debug protocol remain design contracts
per [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) and the
[Proposed Delivery Sequence](../product/proposed-delivery-sequence.md); crate
presence does not imply shipped behavior.
