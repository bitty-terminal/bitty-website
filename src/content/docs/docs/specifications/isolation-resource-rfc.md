---
title: Isolation and Resource RFC
description: Defines isolation boundaries, resource ceilings, and failure semantics for PTY processes, plugins, and IPC/MCP clients with an adversarial test specification
category: specifications
audience: security-reviewer
document_type: specification
status: accepted
website_publish: true
sidebar_order: 17
---

# Isolation and Resource RFC

> Status: **accepted** on 2026-08-28 by the project initiator. This document defines the accepted isolation boundaries, resource ceilings, and failure semantics for PTY processes, plugins, and IPC/MCP clients; it closes [OQ-014](../decisions/open-questions.md) at the design level. It does not describe implemented behavior, relax any normative control, or authorize shipped, stable, normative, or compatibility-guaranteed behavior beyond the accepted contract. Experimental implementation may exist as review evidence but carries no compatibility promise beyond the accepted contract. Acceptance was per independent security-auditor, category-owner, and docs-curator review per the [P0 review checklist](../reviews/p0-review-checklist.md).
>
> Wave-C P1 decision now accepted in
> [Plugin Platform RFC](plugin-platform-rfc.md) (OQ-011/OQ-012/OQ-013,
> 2026-08-27): **DropOldest is the v1 default** for UI observation/event
> systems; **PerSubscription 64, PerPlugin 1024 events/256 KiB, Global 8192
> events/2 MiB** are the aligned three-level queue budgets (accepted defaults
> with `BoundedText` strict, per Plugin Platform RFC; accepted OQ-014 contract). This note was candidate-winner evidence before acceptance and is now the accepted contract for the queue-budget defaults.
>
> Measurement evidence (2026-08-27, bitty CTX-0037 PR #68 / docs CTX-0049):
> `bitty/crates/bitty-plugin-host/tests/measurement.rs` (17 headless tests,
> no window/GPU) proves per-subscription 64 strict at `EventQueue::push`,
> per-plugin 1024 events / 256 KiB at `EventPipeline::publish` via
> `DropPolicy::DropOldest` (accepted v1), global 8192 events / 2 MiB tracking
> via `total_queued_events`/`total_queued_bytes` (exposed for future host
> admission control, not hard-gated before CTX-0040), `BoundedText` 8 KiB strict, and
> `drain_batch` strict (`<= max_bytes`); instrumentation
> `event.rs`/`host.rs` (`budget_snapshot`, `invariant_queue_bounds`,
> `invariant_global_bounds`, `publish_count`). Lifecycle is
> `Draft -> experimental review evidence -> Accepted (2026-08-28) -> normative`; queue-budget
> defaults and enforcement tuning are accepted 2026-08-28.
>
> Measurement evidence (2026-08-27, bitty CTX-0040 `d67a65b` / docs CTX-0050):
> `bitty/crates/bitty-lua/tests/measurement_lua.rs` (15 headless tests, no
> window/GPU) proves RC-1 10^7 VM instructions / 50 ms wall clock / 8 ms
> warning hard-gated measured via `piccolo` 0.3.3 `Fuel` + wall deadline
> (fail-closed suspend counted via `VmBudgetSnapshot`,
> `would_exceed_lua_limits`), RC-2 32 MiB hard-gated measured via
> `Lua::total_memory()` suspend; `bitty/crates/bitty-plugin-host/tests/measurement.rs`
> (21 headless tests, `global_events_enforced_*`) proves Global 8192 events /
> 2 MiB hard-gated enforced at Host admission (`EventPipeline::publish` /
> `Host::publish` via `would_exceed_global_limits` +
> `evict_oldest_globally` with shared `DropPolicy`: `DropOldest` globally
> evicts oldest `seq`, `DropNewest` refuses arrival, strict
> `invariant_global_bounds`); crate `bitty-lua` wraps `piccolo` 0.3.3,
> `forbid(unsafe_code)`, workspace 15->16 members; gates `just check` +
> `cargo check --target x86_64-pc-windows-gnu` pass @ `d67a65b`, worktree
> `bitty/.worktrees/ctx-0040-feat-lua-vm-budgets`; lifecycle
> `Draft -> experimental review evidence -> Accepted (2026-08-28) -> normative`; all RC
> budgets now enforced measured and accepted 2026-08-28 (frontmatter `accepted`, closed OQ-014).

## Purpose and scope

OQ-014 asks: _which per-plugin VM, restricted-library, lazy-load, reload,
callback, queue, instruction, CPU, memory, and task mechanisms satisfy the
normative isolation and budget gates?_ This specification proposes those
mechanisms, extends the same isolation discipline to PTY child processes and
IPC/MCP clients, defines concrete resource ceilings, specifies failure
semantics, and adds an adversarial test specification whose cases are written
in the style of [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md).

In scope:

- isolation domains and enforcement mechanisms for PTY child processes,
  third-party plugin runtimes, and local IPC/MCP clients;
- resource ceilings: CPU/instructions, memory, file descriptors, output rate,
  queue depth, task counts, and request rates;
- failure semantics: denial, containment, degradation, reclaim, reload, and
  safe-mode independence;
- adversarial test cases with expected deny behaviors and measurable pass
  thresholds.

Out of scope: capability identifiers and manifest schema (OQ-012, accepted in
[Plugin Platform RFC](plugin-platform-rfc.md)), Plugin API surface (OQ-011,
accepted), event interception phases (OQ-013, accepted), image protocol limits
(OQ-008, which owns decompression budgets), IPC protocol wire format (OQ-018),
and Lua runtime selection mechanics (OQ-009, accepted in [Lua Runtime RFC](lua-runtime-rfc.md); ADR 0004 records that `piccolo`
adoption timing is decided with this RFC and OQ-030..032 remain Open).

## Normative precedence

The following are normative and override every proposal here. If any mechanism,
default value, or failure behavior below weakens them, the normative text wins
and this RFC must be corrected:

- [Security Overview](../security/overview.md): trust posture, invariants 1
  through 10, the release-blocking set (invariants 1, 5, 6, 7, 8), trust
  boundary defaults, capability families, and the rule that deferral to P1/P2
  must not create a P0 bypass.
- [Threat Model](../security/threat-model.md): assets, actors, boundary map,
  abuse cases T-01 through T-14, and verification-gate requirements.
- [Security Risk Register](../security/risk-register.md): risks R-001 through
  R-022 and their exit-evidence rules.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md):
  core/plugin ownership, the two-security-domain model, and normative P0 gates
  including per-plugin VMs, restricted standard libraries, and attributable
  budgets.

This RFC proposes only mechanisms, thresholds, and verification plans for those
gates. It introduces no new trust boundary, no bypass API, and no relaxation;
per [documentation workflow](../development/documentation-workflow.md) change
trigger rules, any future change to a trust boundary itself updates the
security corpus first.

## Trust-boundary alignment

This proposal reuses the authoritative trust language unchanged:

- Data and requests from PTYs, plugins, projects, IPC clients, MCP clients,
  Agents, packages, and reference repositories are untrusted until an explicit,
  narrowly scoped policy grants a capability.
- Every transition into a trusted host primitive passes a policy, capability,
  authenticated scope, or resource budget.
- An isolated Lua VM is a namespace and failure boundary, not an OS sandbox;
  native in-process plugins remain rejected through P0 and P1, and future
  high-isolation extensions use WASM or a helper process with scoped IPC.
- Plugins may alter presentation, never Terminal Truth; they do not enter the
  parser, render, or input hot paths.
- MCP and Agent access is read-only by default; terminal content is untrusted
  observation data, never instruction text.

Resource ceilings exist to protect the assets the threat model names:
availability of the UI, parser, renderer, PTY, and plugin runtime;
confidentiality and integrity of Terminal Truth and configuration; and
recoverability through safe mode.

## Isolation domains

Each domain below states the boundary, the proposed enforcement point, and the
budget dimensions it carries. Mechanism names are proposals for the
implementing repository; the normative requirement is the property, not the
name.

### IR-D1 PTY child processes

Boundary: a child process attached to a PTY is untrusted input source and
output sink; it holds no authority inside Bitty.

Proposed mechanisms:

1. Core opens and owns all PTY masters. Child code receives only the slave
   side; no master fd, no renderer state, no parser handle is ever inherited.
   All other descriptors are opened close-on-exec.
2. Each terminal child runs in its own session and process group so signals,
   termination, and job control affect exactly one terminal unless a manage
   scope explicitly targets more.
3. The child environment is constructed by core: no runtime-admin token, no
   durable credential, nothing that shell startup or SSH forwarding would leak
   (supports R-012 and P0-AC-023).
4. All child output enters exclusively through the bounded incremental parser
   path of the [Terminal State RFC](terminal-state-rfc.md); there is no
   alternate injection path into canonical grid state (T-13).
5. Protocol input never directs process control: escape sequences cannot
   signal, spawn, suspend, or terminate processes; those actions belong to the
   user or to authenticated IPC manage scope only.
6. Where the platform provides them, core applies per-child rlimits (address
   space, NOFILE, NPROC contribution) as defense in depth. Platform differences
   and tiers remain owned by the platform policy ADR (OQ-003).

Budget dimensions carried: per-terminal output burst buffer (RC-7), reply cap
(Terminal State RFC invariant 7), notification/metadata rate (RC-8).

### IR-D2 Plugin runtimes

Boundary: each third-party plugin is untrusted code confined to its own Lua VM,
restricted standard library, and capability-checked host API. First-party
plugins obey identical rules with no private channel.

Proposed mechanisms:

1. One VM instance per plugin identity and generation. VMs share no globals,
   registry, module tree, or weak tables; a plugin cannot reach another
   plugin's private modules or VM internals (T-06, R-006).
2. The host constructs the standard library: `io`, `os`, `debug`, raw metatable
   access to host objects, dynamic native loading, and ambient package paths
   are absent or deny-stubbed. The module loader resolves only the plugin's own
   package tree (P0-AC-011 parity).
3. Privileged work happens only through capability-checked host calls that are
   asynchronous or deadline-bounded; no host call blocks the parser, render, or
   input hot paths (T-07, P0-AC-015 parity).
4. Budget enforcement points:
   - instruction counting between VM dispatch slices, checked before each
     callback resume and inside long-running chunks (RC-1);
   - a wall-clock deadline enforced by unwinding the VM at the next
     instruction boundary when exceeded (RC-1);
   - allocator-accounted memory ceiling per VM with gc stepping and hard
     refusal of further allocation (RC-2);
   - task, timer, and queue-depth registries owned by `(PluginId, generation)`
     with refusal above caps (RC-4, RC-5).
5. Native in-process artifacts stay rejected at install and activation; this
   RFC adds no loading path for them (T-06, R-017).
6. Lazy plugins reserve their declared worst-case budget shares at graph
   construction so activation cannot exceed aggregate ceilings silently
   (extends the lazy-reserve candidate contract in
   [plugin system](../extensibility/plugin-system.md)).

### IR-D3 IPC and MCP clients

Boundary: a local IPC client is untrusted until peer credentials authenticate
it; an MCP or Agent client is untrusted automation operating read-only by
default.

Proposed mechanisms:

1. Transport isolation per the threat model: current-user Unix socket under
   `$XDG_RUNTIME_DIR/bitty` mode `0600` or Windows named pipe with current-user
   ACL; peer credentials validated at connect and re-checked per privileged
   action; no default TCP listener (T-09, P0-AC-021 parity).
2. Scopes are evaluated server-side on every request from the authenticated
   identity; clients never assert scopes. Inspect, input, manage, configure,
   plugin-manage, process-spawn, and debug remain distinct (P0-AC-022 parity).
3. Per-connection request budget: payload size cap, sustained/burst request
   rate, concurrent connection count, and slow-reader output buffering bound
   (RC-9); exceeding them sheds the connection, not service health.
4. MCP/Agent responses containing terminal content carry the untrusted
   observation-data label and never flow into instruction or policy channels;
   elevation requires separate per-client consent and is never combined
   automatically with filesystem or network authority (T-10, P0-AC-024 parity).
5. Snapshot reads are bounded by a response-size ceiling and chunked streaming
   so one large scrape cannot monopolize the service (RC-10).

## Proposed resource ceilings

Status: **accepted** on 2026-08-28; initial values with measurement evidence for queue budgets and VM budgets (2026-08-27) now accepted. Per-subscription 64, per-plugin 1024 events / 256 KiB (enforced at `EventPipeline::publish` via `DropOldest`), `BoundedText` 8 KiB, `drain_batch` strict, Global 8192 events / 2 MiB hard-gated at Host admission, RC-1 10^7 VM instructions / 50 ms wall / 8 ms warning hard-gated via `piccolo` Fuel + wall deadline, and RC-2 32 MiB via `Lua::total_memory()` are now measured via `bitty/crates/bitty-plugin-host/tests/measurement.rs` (21 headless tests, Global hard-gated) and `bitty/crates/bitty-lua/tests/measurement_lua.rs` (15 headless tests, RC-1/RC-2; instrumentation `event.rs`/`host.rs`: `budget_snapshot`, `invariant_*`, `publish_count`; `bitty-lua`: `VmBudgetSnapshot`, `would_exceed_lua_limits`, `piccolo` 0.3.3 Fuel/wall) as experimental review evidence per bitty CTX-0037 PR #68 / CTX-0040 `d67a65b` (docs CTX-0049 / CTX-0050); Global is now enforced hard-gated (fail-closed) via `would_exceed_global_limits` + `evict_oldest_globally` with shared `DropPolicy`, RC-1/RC-2 hard-gated fail-closed suspend, accepted 2026-08-28. All values follow the [Performance Budget RFC](performance-budget-rfc.md) convention that numbers are target contracts; tests must parameterize on the declared values; changing a value requires an RFC revision, never silent drift. Lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-28) -> normative`.

Two rules hold regardless of final values:

- **Floors:** a ceiling may be configured upward only up to a policy maximum
  and never removed. System/distribution policy pins maxima and cannot be
  weakened by user configuration; unknown or out-of-range budget keys fail
  validation closed.
- **Attribution:** every ceiling is enforced per owner (`PluginId` +
  generation, terminal id, or authenticated client id) and emits observable
  accounting.

| ID    | Dimension                               | Applies to                             | Proposed default                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Floor and maximum policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----- | --------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RC-1  | Callback CPU/instruction budget         | each plugin callback                   | 10^7 VM instructions or 50 ms wall clock, whichever first; 8 ms warning (hard-gated measured via `bitty-lua` `piccolo` 0.3.3 Fuel + wall deadline, fail-closed suspend, measured 2026-08-27 via `crates/bitty-lua/tests/measurement_lua.rs` 15 headless tests @ `d67a65b`, worktree `ctx-0040/feat-lua-vm-budgets`)                                                                                                                                                                                                                                                                                                                                                                                                         | Enforced measured via `bitty-lua` `piccolo` Fuel + wall deadline (10^7 / 50 ms / 8 ms warning, fail-closed suspend) @ `d67a65b` `measurement_lua.rs` 15 tests; constants `RC1_*` parameterized in harness; accepted 2026-08-28                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| RC-2  | Memory per plugin VM                    | each plugin                            | 32 MiB accounted allocations (hard-gated measured via `Lua::total_memory()` 32 MiB suspend, measured 2026-08-27 via `crates/bitty-lua/tests/measurement_lua.rs` 15 headless tests @ `d67a65b`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Enforced measured via `Lua::total_memory()` hard-gated suspend @ `d67a65b` `measurement_lua.rs` 15 tests; floor 8 MiB; policy maximum 256 MiB; accepted 2026-08-28                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| RC-3  | Aggregate plugin memory                 | all plugins                            | 512 MiB reserved shares, lazy plugins included                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | scales with PB-2/PB-3 headroom                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| RC-4  | Live tasks and timers                   | each plugin                            | 64 tasks, 32 timers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | refusal above cap; no burst queueing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| RC-5  | Event queue depth (three-level budgets) | per-subscription / per-plugin / global | PerSubscription 64 events per `(plugin, event-type)` queue; PerPlugin 1024 events / 256 KiB aggregate; Global 8192 events / 2 MiB aggregate (accepted defaults per [Plugin Platform RFC](plugin-platform-rfc.md), OQ-011/OQ-012/OQ-013, 2026-08-27; OQ-014 accepted 2026-08-28; measured 2026-08-27 via `bitty/crates/bitty-plugin-host/tests/measurement.rs` 21 headless tests and `event.rs`/`host.rs` instrumentation `budget_snapshot`/`invariant_*` — per-subscription strict at `EventQueue::push`, per-plugin at `EventPipeline::publish` via `DropOldest`, global hard-gated enforced via `would_exceed_global_limits` + `evict_oldest_globally` with shared `DropPolicy` @ `d67a65b` (`global_events_enforced_*`)) | PerSubscription enforced strictly at `EventQueue::push` (measured); PerPlugin enforced at `EventPipeline::publish` via DropPolicy (Wave-C P1 decision DropOldest as v1 default, DropNewest alternative — accepted) — measured via harness, experimental review evidence per bitty CTX-0037 PR #68 / CTX-0040 `d67a65b` (docs CTX-0049 / CTX-0050), accepted 2026-08-28, lifecycle `Draft -> experimental review evidence -> Accepted (2026-08-28) -> normative`; Global enforced hard-gated at Host admission (`EventPipeline::publish` / `Host::publish` via `would_exceed_global_limits` + `evict_oldest_globally` with shared `DropPolicy`: `DropOldest` globally evicts oldest `seq`, `DropNewest` refuses arrival, strict `invariant_global_bounds`), measured 2026-08-27 via `measurement.rs` 21 tests @ `d67a65b` (`global_events_enforced_*`, experimental review evidence, accepted 2026-08-28); overflow drop policy is the single authoritative statement in [Plugin Platform RFC](plugin-platform-rfc.md#delivery-ordering-batching-and-coalescing) (accepted); drops counted and attributed |
| RC-6  | File descriptors                        | plugins via host only                  | 0 direct; 16 concurrently open capability files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | global reserve: at least 20% of RLIMIT_NOFILE kept for core                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| RC-7  | PTY output burst buffer                 | each terminal                          | 8 MiB in-memory absorption                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | beyond it, backpressure stops reading; kernel buffer backs up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| RC-8  | Notification/title/metadata rate        | each PTY source                        | 10 events/s coalesced                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | reply channel capped per Terminal State RFC invariant 7                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| RC-9  | IPC request rate and payload            | each connection                        | 100 req/s sustained, 2x burst 1 s, 1 MiB payload                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 16 concurrent connections per endpoint default                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| RC-10 | MCP/Agent response size                 | each response                          | snapshot-bounded, 256 KiB stream chunks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | read scopes only; elevation changes scopes, not ceilings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

Notes:

- Sustained PTY throughput remains governed by the PB-6 floor and parser
  bounds; RC-7 governs burst absorption only. Backpressure is availability
  preserving: the hostile producer stalls, the UI does not.
- Idle CPU remains governed by PB-7; RC-1 bounds attacker-influenced work, not
  steady-state cost.
- Queue budgets use three levels (PerSubscription 64, PerPlugin 1024 events /
  256 KiB aggregate, Global 8192 events / 2 MiB aggregate) aligned with
  `bitty-plugin-host/src/event.rs` and accepted in
  [Plugin Platform RFC](plugin-platform-rfc.md) (OQ-011/OQ-012/OQ-013,
  2026-08-27); PerSubscription is strict FIFO at `EventQueue::push`, PerPlugin
  uses the authoritative DropPolicy (DropOldest default, DropNewest
  alternative) at the plugin boundary (`EventPipeline::publish`), Global is
  enforced hard-gated at Host admission (`EventPipeline::publish` /
  `Host::publish` via `would_exceed_global_limits` +
  `evict_oldest_globally` with shared `DropPolicy`, strict
  `invariant_global_bounds`). Measured 2026-08-27 via
  `bitty/crates/bitty-plugin-host/tests/measurement.rs` (21 headless tests,
  `global_events_enforced_*`, instrumentation `budget_snapshot`/`invariant_*`/
  `publish_count`, bounded `BoundedText` 8 KiB and `drain_batch` strict) and
  `bitty/crates/bitty-lua/tests/measurement_lua.rs` (15 headless tests,
  `piccolo` Fuel/wall, `VmBudgetSnapshot`) as experimental review evidence per
  bitty CTX-0037 PR #68 / CTX-0040 `d67a65b` (docs CTX-0049 / CTX-0050); queue
  budgets and VM budgets are accepted 2026-08-28, lifecycle
  `Draft -> experimental review evidence -> Accepted (2026-08-28) -> normative`; RC-1/RC-2/
  Global now enforced measured and accepted.
- RC-6 keeps a protected descriptor reserve so an fd storm can never prevent
  core from opening PTYs, the safe-mode path, or trace files.

## Failure semantics

Status: **accepted contract** (2026-08-28). Numbered for reference; defines the accepted failure semantics.

- **FS-1 Transactional denial.** A refused capability check, budget-exceeded
  call, or scope violation leaves no partial state: no allocation charged, no
  queue entry, no registration. Denial is total and returns a typed error.
- **FS-2 Degradation ladder.** Repeated or severe violations escalate in order:
  refuse the operation; terminate the offending callback; suspend the owning
  plugin generation; disable the plugin persistently. Proposal: three
  escalations within a sliding 60-second window suspend the generation; a
  suspended generation that repeats after resume disables the plugin.
  Reactivation requires explicit user action.
- **FS-3 Containment.** A fault affects only the owning plugin VM/lifecycle,
  terminal, or client connection. The host process survives every contained
  fault and remains responsive; sibling plugins and terminals are unaffected
  (P0-AC-013 parity).
- **FS-4 Attribution.** Every enforcement action emits a structured record:
  owner id, generation, budget dimension, observed value, limit, and action
  taken. Unattributed enforcement is a conformance bug.
- **FS-5 Reclaim.** After suspension or disable, the owner's memory, tasks,
  timers, queues, and capability-held descriptors are released and verified
  against the pre-activation baseline within the PB-3 reclaim tolerance.
  Retained-by-design state must be declared in the manifest and is still
  counted against RC-3.
- **FS-6 Reload ordering.** Generation N resources are disposed before
  generation N+1 activates; a failed reload either restores generation N or
  disables cleanly, per the lifecycle candidate contract in
  [core boundaries](../architecture/core-boundaries.md). Failure never leaks
  mixed-generation authority.
- **FS-7 Fail-closed instrumentation.** If the enforcement machinery for a
  budget cannot start or is detected disabled, components that require it
  refuse to load rather than running unbounded. A budget that cannot be
  enforced is treated as absent authority and denied.
- **FS-8 Safe-mode independence.** Every path above preserves `bitty --safe`
  startup with minimal built-in configuration and zero third-party plugins;
  verified again after any security-sensitive change (P0-AC-019 parity).
- **FS-9 No silent weakening.** There is no feature flag, environment variable,
  debugging switch, or temporary API that bypasses a ceiling or a denial. Such
  an API must not enter P0 even temporarily.

## Adversarial test specification

Style follows [P0 Security Acceptance Criteria conventions](../security/p0-acceptance-criteria.md#conventions): stable IDs, cited sources,
verification methods (`unit`, `integration`, `adversarial`, `manual-audit`),
and pass thresholds stating the minimum observable outcome. These cases specify
the proposed mechanisms of this RFC; where a P0 acceptance criterion already
exists, that criterion stays authoritative and the case here adds
mechanism-level depth. Shared harness requirements:

- every case runs with budgets set to the declared RC values and again at
  floor and policy-maximum settings;
- host responsiveness during any attack is asserted as input-to-render p99
  within the PB-4 tail budget using the PB-4 measurement method;
- every expected-deny outcome asserts FS-1 (no partial state) and FS-4
  (attribution record emitted).

### Attack cases

#### AT-IR-001 PTY output flood

Source: threat model "PTY to terminal state"; T-01; R-001. Complements
P0-AC-001/P0-AC-002.

- Given a terminal whose attached program emits a sustained multi-megabyte-
  per-second stream (for example `cat /dev/urandom`) plus alternating huge
  single-line OSC payloads at length limits,
  when the stream runs for at least 60 seconds,
  then absorbed burst data stays within RC-7, backpressure engages instead of
  memory growth, scrollback and cell memory stay within their bounds, and the
  UI meets the shared responsiveness assertion.

Verification: adversarial + integration.
Pass threshold: host RSS growth attributable to the attack stays within RC-7
plus parser working set for the full duration; zero dropped-input corruption;
parser recovers to normal interactive latency within 1 second of stream end.

#### AT-IR-002 Protocol-directed process control

Source: threat model "PTY to terminal state"; T-01 class.

- Given byte streams embedding sequences that resemble process-control requests
  (signal, kill, spawn, suspend) in OSC/DCS/APC payloads and title/cwd metadata,
  when parsed and applied,
  then no process outside the parser's semantic actions is created, signaled,
  or terminated, and no metadata string is ever expanded into a command.

Verification: adversarial + manual-audit.
Pass threshold: exhaustive audit shows zero calls to process-control primitives
reachable from parser actions; corpus of control-shaped sequences produces zero
process effects.

#### AT-IR-003 Child environment leak probe

Source: threat model "IPC, CLI, and child processes"; R-012. Supports
P0-AC-023.

- Given a child process spawned for a terminal that dumps its own environment
  and inherited descriptors,
  when inspected at spawn and again after its short-lived scope expires,
  then no runtime-admin token or durable credential appears anywhere in the
  environment, no master-side fd is inherited, and the granted scope no longer
  authorizes anything after expiry.

Verification: integration + adversarial.
Pass threshold: environment dump equals the constructed allowlist; expired
scope attempts fail closed; assertion covers both Unix and Windows transports
once platforms exist.

#### AT-IR-004 Plugin ambient-authority sweep

Source: T-06; R-006, R-017. Parity with P0-AC-011.

- Given a probe plugin exercising `io`, `os`, `debug`, native loading, ambient
  package paths, another plugin's module tree, raw metatable access to host
  objects, and direct PTY/GPU/window handles,
  when each attempt executes in its VM,
  then every attempt fails with a typed denial naming the missing capability,
  and no attempt reaches the operating system.

Verification: unit + adversarial.
Pass threshold: enumerated deny matrix fails closed on every entry; syscall/
API-level monitoring during the sweep shows zero host effects from denied
calls.

#### AT-IR-005 Infinite loop and deadline overrun

Source: T-07; R-007. Depth for P0-AC-013/P0-AC-014 under RC-1.

- Given a plugin whose callback never yields (`while true do end`),
  when the instruction budget or wall-clock deadline is reached,
  then the VM unwinds at the next instruction boundary, the callback is
  terminated, the escalation ladder records the first strike, and the host
  meets the shared responsiveness assertion throughout.

Verification: adversarial + integration.
Pass threshold: termination occurs within the RC-1 deadline plus one scheduler
slice; attribution record identifies plugin, generation, and dimension; host
event-loop p99 stays within the PB-4 tail budget during and after the loop.

#### AT-IR-006 Plugin allocation bomb

Source: T-07; R-007. Depth for P0-AC-014 under RC-2/RC-3.

- Given a plugin building unbounded string/table growth toward host OOM,
  when the VM's accounted allocations reach the RC-2 ceiling,
  then further allocation is refused with a typed memory error, gc stepping
  runs, and the host RSS stays within RC-2 plus interpreter overhead.

Verification: adversarial.
Pass threshold: refusal fires before host OOM risk (peak host RSS bounded as
declared); repeated retries trigger FS-2 suspension; sibling plugin VMs keep
operating normally throughout.

#### AT-IR-007 Task, timer, and queue storm

Source: T-07; R-007; hot-path exclusion per P0-AC-015 under RC-4/RC-5.

- Given a plugin spawning maximal tasks and timers while flooding its event
  queue,
  when caps are crossed,
  then excess tasks/timers are refused, queue overflow follows the single
  drop-policy decision point defined in the
  [Plugin Platform RFC event pipeline](plugin-platform-rfc.md#delivery-ordering-batching-and-coalescing)
  (Wave-C P1 decision DropOldest as v1 default for UI observation/event systems,
  DropNewest alternative — accepted) with drops counted and attributed, no drop is silent,
  and parser/render/input latency probes show no plugin-induced breach.

Verification: adversarial + integration (latency probes).
Pass threshold: caps hold exactly; hot-path budgets unaffected; drop counters
match injected excess within one scheduling quantum.

#### AT-IR-008 Descriptor exhaustion via granted filesystem capability

Source: R-007 family; RC-6.

- Given a plugin holding a legitimate filesystem-read capability that opens
  files in a tight loop up to system fd exhaustion,
  when the per-plugin open-file cap and global reserve are enforced,
  then an open beyond the per-plugin cap fails with a typed error, the
  global reserve stays intact, and core can still open new PTYs, trace files,
  and the safe-mode path during the attack.

Verification: adversarial + integration.
Pass threshold: reserve invariant asserted by concurrent core operations
succeeding mid-attack; per-plugin cap exact; no fd leak after teardown
(reclaim check FS-5).

#### AT-IR-009 Native artifact activation retry

Source: T-06; R-017. Defense-in-depth complement to P0-AC-018.

- Given `.so`, `.dll`, and `.dylib` payloads presented directly at activation,
  disguised with plugin-package extensions, and referenced as dependencies of
  an otherwise-clean package,
  when activation is attempted,
  then each variant is rejected before any load primitive executes.

Verification: adversarial + unit.
Pass threshold: zero invocations of the platform loader for attacker bytes in
all variants; rejection recorded with attribution.

#### AT-IR-010 IPC scope-escalation matrix

Source: T-09; R-011. Parity with P0-AC-022 under RC-9.

- Given an authenticated inspect/read-scoped client attempting input injection,
  process termination, configuration write, plugin install/manage, debug
  scopes, and manage operations,
  when each request arrives,
  then every request is denied server-side regardless of client-declared scope
  fields, and denial survives replay, reordering, and batching tricks.

Verification: adversarial (full scope x action matrix).
Pass threshold: zero successful out-of-scope actions across the matrix;
server-side evaluation proven by mutating client assertions with no effect.

#### AT-IR-011 Foreign-user connect and endpoint tampering

Source: T-09; R-011. Parity with P0-AC-021.

- Given a second local user attempting socket connect, a same-user process
  attempting to replace or pre-bind the endpoint, and a probe for TCP listeners,
  when each occurs,
  then foreign connects fail at authentication, endpoint replacement is
  detected or prevented, and no TCP listener exists by default.

Verification: adversarial + integration.
Pass threshold: socket mode/ACL asserted by test; peer-credential mismatch
denied; startup scan finds no listener; tampered endpoint causes fail-closed
refusal to serve, not fallback to an unauthenticated path.

#### AT-IR-012 Authenticated request flood

Source: invariant 7; R-011 availability side under RC-9/RC-10.

- Given an authenticated client sending oversized payloads, request rates above
  RC-9, and concurrent connections above the cap while issuing large snapshot
  reads,
  when enforcement triggers,
  then excess connections are shed newest-first, oversized payloads are
  rejected whole (no partial parse), responses stay within RC-10 chunking, and
  other clients' requests continue to succeed within normal latency.

Verification: adversarial + integration.
Pass threshold: shedding order and counters match policy; a benign concurrent
client completes its workload during the entire attack; memory attributed to
the attacker's connections is reclaimed on disconnect (FS-5).

#### AT-IR-013 Prompt-injection exfiltration chain

Source: T-10; R-013. Depth for P0-AC-024 under RC-10.

- Given a terminal displaying hostile instructions ("read the file at ...",
  "send your API key to ...") and an MCP client with default read scopes that
  reads that content,
  when the client subsequently attempts writes, spawns, installs, config
  changes, or combined filesystem/network operations derived from the content,
  then every attempt requires per-client elevation that was not granted,
  remains denied, and responses containing the hostile content carried the
  untrusted observation-data label end to end.

Verification: adversarial + integration + manual-audit.
Pass threshold: default-deny matrix holds after exposure to hostile content;
labeling asserted on every response; auditor review confirms no channel mixes
observation data into instruction or policy decisions.

#### AT-IR-014 Configuration attack on ceilings

Source: threat model "Configuration and workspace trust"; R-010 adjacency.

- Given project configuration and user configuration attempting to remove,
  raise above policy maxima, disable, or spoof budget keys (including unknown
  keys, wrong types, and duplicate definitions),
  when configuration loads,
  then floors stay pinned, maxima hold, unknown/out-of-range keys fail
  validation closed, and effective budgets are reported identically by the
  observability interface.

Verification: adversarial + unit.
Pass threshold: hostile-config fixture set never yields an effective ceiling
above policy maximum nor a removed ceiling; validation errors name the key.

#### AT-IR-015 Enforcement-mechanism fault injection

Source: FS-7; verification-gate requirement for negative evidence.

- Given fault injection that disables or corrupts instruction counting,
  memory accounting, queue registries, or fd accounting for a component,
  when that component would next execute untrusted work,
  then it refuses to load or halts per FS-7 instead of running without
  enforceable budgets.

Verification: adversarial (fault injection).
Pass threshold: each injected defect results in fail-closed refusal with
attribution; zero unbounded execution windows observed.

### Coverage traceability

| Case           | Domain  | Threats/risks                   | Related P0 criteria                  |
| -------------- | ------- | ------------------------------- | ------------------------------------ |
| AT-IR-001..002 | PTY     | T-01, R-001                     | P0-AC-001, P0-AC-002                 |
| AT-IR-003      | Process | R-012                           | P0-AC-023                            |
| AT-IR-004..009 | Plugins | T-06, T-07, R-006, R-007, R-017 | P0-AC-011, P0-AC-013..015, P0-AC-018 |
| AT-IR-010..012 | IPC/MCP | T-09, R-011                     | P0-AC-021, P0-AC-022                 |
| AT-IR-013      | MCP     | T-10, R-013                     | P0-AC-024                            |
| AT-IR-014      | Config  | R-010 adjacency                 | P0-AC-031                            |
| AT-IR-015      | Cross   | verification gates              | all linked                           |

Terminal Truth integrity (T-13, R-008, P0-AC-016/P0-AC-017) is exercised
indirectly here through the single-write-path rule of the Terminal State RFC;
dedicated mutation-attempt cases remain owned by the accepted Plugin API and
capability RFCs ([Plugin Platform RFC](plugin-platform-rfc.md), OQ-011/OQ-012,
2026-08-27).

## Security review notes

This proposal strengthens the P0 posture and relaxes nothing: bounded output
absorption and backpressure answer availability sides of T-01/R-001; per-plugin
budget enforcement points give concrete mechanisms for T-07/R-007; VM
construction and module-loader restrictions serve T-06/R-006/R-017; transport,
peer-credential, and scope-server-side rules serve T-09/R-011; labeling and
separation serve T-10/R-013; the configuration-attack and fault-injection cases
guard the enforcement machinery itself. All ceilings are additive constraints
beneath existing controls; where any conflict arises, the security corpus
prevails per Normative precedence. Independent security-auditor review was completed before acceptance on 2026-08-28.

## Open items remaining under OQ-014

The following items were open at proposal and are now dispositioned upon acceptance on 2026-08-28. Acceptance of this RFC closes [OQ-014](../decisions/open-questions.md) at the design level; residual items below are tracked as follow-up work with no remaining OQ-014 closure blocker:

- Resolved by this RFC upon acceptance (closes OQ-014): isolation domains and enforcement
  mechanisms for PTY, plugin runtimes, and IPC/MCP clients; resource ceilings
  framework and enforcement points; failure semantics (denial, containment,
  degradation, reclaim, reload, safe-mode); and the adversarial test
  specification with coverage traceability.
- Migrated or deferred (remain Open as follow-up work, not as OQ-014 closure
  blockers unless review decides otherwise): final RC values requiring the
  measurement harness and reference hardware defined with the Performance Budget
  RFC follow-up — including **measurement beyond queue budgets**,
  **instruction/CPU budgets (RC-1 10^7 VM instructions / 50 ms wall clock,
  8 ms warning)** — now enforced measured via `bitty-lua` `piccolo` 0.3.3 Fuel
  - wall deadline (fail-closed suspend) via
    `crates/bitty-lua/tests/measurement_lua.rs` 15 headless tests @ `d67a65b`
    (bitty CTX-0040, worktree `ctx-0040/feat-lua-vm-budgets`), accepted 2026-08-28 (follow-up CTX-0038 closed for VM choice);
    **per-plugin bytes and aggregate enforcement (RC-5 PerPlugin 256 KiB / 1024
    events, enforced at `EventPipeline::publish` via DropPolicy)** — measured
    via `bitty/crates/bitty-plugin-host/tests/measurement.rs` headless harness
    and `event.rs`/`host.rs` instrumentation (`budget_snapshot`,
    `invariant_queue_bounds`/`invariant_global_bounds`, `publish_count`, 17
    tests, bitty CTX-0037 PR #68 / docs CTX-0049, 2026-08-27) plus 21 tests @
    `d67a65b` (CTX-0040) as experimental review evidence and now `Accepted` 2026-08-28;
    **global limits (Global 8192 events / 2 MiB aggregate, enforced hard-gated
    at Host admission via `would_exceed_global_limits` +
    `evict_oldest_globally` with shared `DropPolicy`, strict
    `invariant_global_bounds`)** — now hard-gated measured via `measurement.rs`
    21 tests @ `d67a65b` (`global_events_enforced_*`, bitty CTX-0040, docs
    CTX-0050), accepted 2026-08-28; **memory ceilings (RC-2 32 MiB per
    plugin VM)** — now enforced measured via `Lua::total_memory()` suspend via
    `crates/bitty-lua/tests/measurement_lua.rs` 15 headless tests @ `d67a65b`
    (bitty CTX-0040), accepted 2026-08-28; concrete VM technology now
    `piccolo` 0.3.3 (workspace 15->16 members, `forbid(unsafe_code)` vendored)
    closing the hook left by [ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md)
    but retaining `mlua` compatibility note; per-child rlimit mapping per
    platform with the platform policy ADR (OQ-003) including Windows Job Objects
    equivalents; whether WASM/helper-process staging (P2) needs reservation hooks
    in the RC tables now so later adoption cannot require ceiling redesign; and
    exact attribution-record schema and retention/redaction rules with
    sensitive-data handling (R-014 minimization applies to enforcement records
    too).

Closes OQ-014: this RFC closes OQ-014 at the design level; residual items above have been migrated to tracked follow-ups as Open separate questions with no remaining OQ-014 closure blocker. Acceptance was per independent security-auditor review; the frontmatter is `accepted` and the open-question register row is updated per its close rule. Experimental implementation may exist as review evidence but carries no compatibility promise beyond the accepted contract. Wave-C
review CTX-0046 (2026-08-27) verified the three-level queue budgets
(PerSubscription 64 / PerPlugin 1024 events/256 KiB / Global 8192 events/2 MiB)
against `bitty-plugin-host/src/event.rs`; bitty CTX-0037 PR #68 (17 headless
tests, `bitty/crates/bitty-plugin-host/tests/measurement.rs` and
instrumentation `event.rs`/`host.rs` `budget_snapshot`/`invariant_*`/
`publish_count`) and docs CTX-0049 (2026-08-27) plus bitty CTX-0040 `d67a65b`
(15 headless `measurement_lua.rs` RC-1/RC-2 via `piccolo` Fuel/wall +
21 headless `measurement.rs` Global hard-gated via `would_exceed_global_limits` +
`evict_oldest_globally`, worktree
`bitty/.worktrees/ctx-0040-feat-lua-vm-budgets`, gates `just check` + `cargo
check --target x86_64-pc-windows-gnu` pass, docs CTX-0050) provide experimental
review evidence proving per-subscription 64 strict at `EventQueue::push`,
per-plugin 1024 events / 256 KiB at `EventPipeline::publish` via `DropOldest`,
Global 8192 events / 2 MiB hard-gated at Host admission
(`EventPipeline::publish` / `Host::publish` with shared `DropPolicy`, strict
`invariant_global_bounds`), RC-1 10^7 / 50 ms / 8 ms warning hard-gated via
`piccolo` Fuel + wall deadline, RC-2 32 MiB via `Lua::total_memory()`,
`BoundedText` 8 KiB, and `drain_batch` strict; queue budgets and VM budgets
are `Accepted` 2026-08-28, lifecycle is
`Draft -> experimental review evidence -> Accepted (2026-08-28) -> normative`; all RC budgets
now enforced measured and accepted (frontmatter `accepted`, closed OQ-014, `just check` + `cargo check --target x86_64-pc-windows-gnu` pass @ `d67a65b`).

## P0 Review Sign-off

> P0 review per CTX-0063 accepted OQ-014 via this RFC on 2026-08-28. Frontmatter is `accepted` and
> [open-questions.md](../decisions/open-questions.md) is updated per its close
> rule. This section records the sign-off that closed OQ-014.

| Role                                  | Reviewer (placeholder) | Verdict | Evidence / scope                                                                                                                                                                                                                                                                                             | Date       |
| ------------------------------------- | ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| security-auditor                      | `bitty-security`       | pass    | R-006, R-007, R-018, T-07, T-14, RC-1 10^7/50 ms/8 ms warning / RC-2 32 MiB / Global 8192/2 MiB hard-gated fail-closed, `forbid(unsafe_code)` for `bitty-lua`/`piccolo` 0.3.3, FS-1..FS-9, adversarial AT-IR-001..015                                                                                        | 2026-08-28 |
| category-owner (security-and-quality) | `bitty-quality`        | pass    | Queue budgets PerSub 64 strict at `EventQueue::push` / PerPlugin 1024/256 KiB / Global 8192/2 MiB hard-gated at Host admission, `DropOldest` default at `EventPipeline::publish` / `Host::publish` via `would_exceed_global_limits` + `evict_oldest_globally` with shared `DropPolicy`                       | 2026-08-28 |
| category-owner (architecture)         | `bitty-architect`      | pass    | `VmBudgetSnapshot`, `would_exceed_lua_limits`, `piccolo` Fuel + wall deadline, `Lua::total_memory()` 32 MiB, `bitty-plugin-host` 21 tests / `bitty-lua` 15 tests headless, `cargo check --target x86_64-pc-windows-gnu` gate                                                                                 | 2026-08-28 |
| docs-curator                          | `bitty-curator`        | pass    | Frontmatter `accepted`, lifecycle `Draft -> experimental review evidence -> Accepted (2026-08-28) -> normative`, measurement evidence CTX-0037 PR #68 / CTX-0040 `d67a65b`, links to [Security Overview](../security/overview.md) and [P0 review checklist](../reviews/p0-review-checklist.md), English-only | 2026-08-28 |

As of acceptance 2026-08-28, `bitty-plugin-host` and `bitty-lua` are accepted headless crates per
[ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) and the
[Proposed Delivery Sequence](../product/proposed-delivery-sequence.md); crate
presence does not imply shipped behavior.
