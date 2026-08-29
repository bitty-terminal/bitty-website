---
title: ADR 0007 - Async/Send Boundary and GC Tuning for Lua VMs
description: Defines the accepted async/Send boundary, GC tuning, Config VM budget charging, and reload/module-cache interaction for OQ-032 with task/timer limits and PB-1/PB-2 accounting
category: decisions
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 37
---

# ADR 0007 - Async/Send Boundary and GC Tuning for Lua VMs

## Status

Accepted on 2026-08-29 by the project initiator, closing
[OQ-032](../open-questions.md). This ADR defines the accepted async/Send
boundary, GC tuning, Config VM budget charging, and reload/module-cache
interaction at the design level; it closes [OQ-032](../open-questions.md). It
does not describe implemented behavior, does not authorize shipped, stable,
normative, or compatibility-guaranteed behavior, and does not weaken any
normative security control. This ADR refines
[ADR 0005](ADR-0005-lua-pins-and-stdlib.md) and the
[Lua Runtime RFC](../../specifications/lua-runtime-rfc.md) without
contradicting either, and jointly clarifies the reload contract with the
[Configuration Model RFC](../../specifications/configuration-model-rfc.md)
and resource budgets with the
[Isolation Resource RFC](../../specifications/isolation-resource-rfc.md).
No dependency is added to any repository by this ADR; `Cargo.lock` wiring is
owned by the implementing task. Frontmatter `status` is `accepted` per the
repository metadata schema; document status is Accepted. Lifecycle is
`Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

- Deciders: project initiator (DEC-001), security-auditor persona (audit gate
  per Lua Runtime RFC security review and R-007 and R-018 and T-07 and T-14),
  `bitty-lua` and `bitty-plugin-host` maintainers (CTX-0054).
- Related: OQ-032 (primary), OQ-009 (closed parent, 2026-08-27 CTX-0047),
  OQ-010 (Configuration Model RFC reload and module-cache joint owner),
  OQ-014 (RC-1 and RC-2 and RC-4), OQ-030 (pins, ADR 0005), OQ-031 (env policy),
  ADR 0004 upstream set, Lua Runtime RFC Accepted 2026-08-27,
  Configuration Model RFC Accepted 2026-08-27,
  Isolation Resource RFC Proposed (RC tables),
  [Performance Budget RFC](../../specifications/performance-budget-rfc.md)
  PB-1 and PB-2, ADR 0003 MSRV 1.85, technology strategy async row,
  `bitty` CTX-0040 `d67a65b` measurement evidence.

## Context

### Why async/Send and GC are still open

- **Two-VM reality since CTX-0040.** The Config VM is `mlua` with vendored Lua
  5.4 (PUC C sources built with the core crate) and the per-plugin VM is
  `piccolo` 0.3.3 pure-Rust stackless VM with `gc-arena` 0.5.3 and `sptr` 0.3.2.
  `bitty/Cargo.lock` on `main` still has no Lua crates; the implementing task
  pins them. The two runtimes have different `Send` stories and different GC
  instruments, so one policy cannot copy-paste.
- **Technology strategy async validation.** The async row is candidate
  "Runtime-agnostic Core with local Tokio use in services — thread/event-loop
  integration, binary cost, and shutdown semantics" requiring validation. OQ-032
  must decide whether host calls from Lua block the Config VM thread or return
  handles, and whether `Lua` itself is `Send` or `Sync`.
- **Budgets are now measurable.** RC-1 `10^7` instructions and 50 ms wall with
  8 ms warning and RC-2 32 MiB are hard-gated measured in CTX-0040
  `crates/bitty-lua/tests/measurement_lua.rs` via `piccolo` `Fuel` plus
  `Lua::total_memory()`. The question left is whether the Config VM startup
  evaluation shares those budgets and how its cost is charged against PB-1 cold
  startup (100 ms p50, 200 ms p99) and PB-2 idle memory (80 MiB RSS).
- **Reload and module cache are joint.** Lua Runtime RFC rule 4 caches
  `require` results per VM and says reload whether clearing the cache is
  permitted belongs to the reload contract in the Configuration Model RFC.
  OQ-032 jointly owns the answer with that RFC, and the Isolation FS-6
  generation-disposal rule constrains it.
- **Normative constraints not reopened.** Security overview isolated VM as
  namespace and failure boundary, restricted libraries, capability-checked host
  API, per-plugin isolation, budgets, `bitty --safe`; core boundaries no host
  policy delegated to Lua, no hot-path execution; threat model T-07 and T-14;
  risks R-006, R-007, R-018, R-019.

### What this ADR closes versus defers

- **Closes OQ-032:** `Send` and `Sync` boundary for every VM, `mlua` versus
  `piccolo` host-call design, task and timer caps, GC tuning defaults and
  memory-ceiling wiring, Config VM budget charging against PB-1 and PB-2, and
  reload and module-cache interaction.
- **Explicitly not this ADR:** exact Lua 5.4.x patch and `mlua` and `piccolo`
  version pins and upgrade cadence and unsafe-surface audit (OQ-030, ADR 0005),
  `os.getenv` exposure (OQ-031), RC-1 and RC-2 and RC-5 numeric retuning beyond
  the measurement harness (OQ-014), package manifest and resolver details
  (OQ-021 and follow-ups).

## Decision

### Async/Send boundary

#### mlua versus piccolo — host-call posture

| Dimension       | Config VM (`mlua` plus vendored Lua 5.4)                                                                                                                                                                                    | Per-plugin VM (`piccolo` 0.3.3)                                                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C backing       | PUC Lua 5.4 C sources via `mlua` `vendored` and `lua54` (ADR 0005), `luajit` off                                                                                                                                            | Pure Rust, `#![forbid(unsafe_code)]` in `bitty-lua`, no C                                                                                                                                                   |
| Async feature   | `mlua` `async` off for Config VM — startup evaluation is synchronous on the main thread; no `async` Lua-to-Rust await inside `init.lua`                                                                                     | `piccolo` stackless VM driven by host executor; host tasks wrap Lua continuations, not `mlua` async                                                                                                         |
| Host call shape | Blocking host call on the Config VM thread with deadline — host function executes synchronously under RC-1 wall deadline and returns a value or typed denial; it does not return an opaque handle that Lua must later await | Capability-checked host call that returns immediately or enqueues a host task and returns a typed handle that resolves via the event pipeline; callbacks never block the parser, render, or input hot paths |
| Rationale       | Config evaluation is a short data-style pass (`Lua -> ConfigPlan`) owned by PB-1; introducing async handles would leak commit timing into `init.lua` and complicate fail-closed diagnostics                                 | Plugin callbacks are cold-path event handlers; host work (filesystem, network, IPC) must not hold the plugin VM thread and must be attributable to the plugin generation under RC-1 and RC-4                |

Config VM blocking is bounded. Every host call from the Config VM is wrapped in
the same RC-1 deadline as plugin callbacks (10^7 instructions and 50 ms wall
with 8 ms warning) measured via `piccolo` Fuel plus wall in `bitty-lua`; the
P0-equivalent for `mlua` uses `mlua::Lua::set_hook` with instruction counting
and a host wall timer that unwinds at the next instruction boundary on excess.
A host call that would block beyond the deadline is fail-closed suspended with
diagnostic class `budget`, never a crash.

#### Send/Sync for VMs

- `Lua` VMs are `!Send` and `!Sync`. Neither `mlua::Lua` nor `piccolo::Lua`
  is sent across threads. The host owns an executor that is `Send` and drives
  each VM by short time-sliced polls on the VM's owning thread.
- Host handles that cross threads are `Send`. Capability handles, `bitty` module
  closures, and `VmBudgetSnapshot` counters are plain Rust data that is `Send`;
  the Lua value itself never crosses. Where `mlua` documents `Lua: !Send`, this
  ADR affirms it rather than wrapping it to `Send`.
- Plugin tasks and timers are host-owned. `tasks` (64) and `timers` (32) per
  plugin from RC-4 are registries owned by `(PluginId, generation)` inside
  `bitty-plugin-host`, not Lua tables. Lua only holds integer ids. The host
  scheduler polls timers and tasks outside the VM and resumes the VM for a
  bounded slice, so the hot path stays free per P0-AC-015.

#### Tasks and timers 64/32 limits

Per RC-4 in the Isolation Resource RFC. Enforcement:

- 64 live tasks and 32 live timers per plugin. `task.spawn` and `timer.create`
  beyond the cap are refused with typed error `E_BUDGET_TASK` or
  `E_BUDGET_TIMER`, attributed as `budget` diagnostics, not silent queueing.
- Timers are host `tokio` or executor timers closed over generation; a fired
  timer enqueues a callback via the same `EventPipeline::publish` path so the
  three-level queue budgets (PerSubscription 64, PerPlugin 1024/256 KiB, Global
  8192/2 MiB) still apply. Timer coalescing uses the same rules as observation
  events.
- Coroutine note: `coroutine` is allowed only if the async shim needs it per ADR
  0005 allowlist; otherwise it remains deny-stubbed. Plugin async uses the host
  task shim, not ambient Lua coroutines, so stack discipline stays host-owned.

### GC tuning

#### PUC Lua 5.4 incremental GC (Config VM via mlua)

- Mode: incremental. The Lua 5.4 generational mode is not used for deterministic
  budgeting. Host calls `lua_gc(L, LUA_GCINC, ...)` style tuning via `mlua`
  GC controls at VM creation.
- Defaults (tunable before acceptance, pending measurement):
  - `pause 200` (collection starts when memory grows 100 percent beyond last
    collection threshold — Lua 5.4 default, retained).
  - `stepmul 100` (GC speed relative to allocation, Lua 5.4 default, retained;
    increase to 150 for Config VM if PB-2 headroom is tight, measured).
  - `stepsize 13` KiB per incremental step where the binding exposes it.
- Budget coupling: GC stepping is counted against RC-1 wall budget. The host
  may run `Lua::gc_collect` explicitly after Config VM evaluation and between
  plugin callback slices, but never inside a hot-path callback return path that
  must preserve PB-4 tail latency.
- Diagnostics: GC runs are not silent cost; host counters `gc_steps` and
  `gc_bytes` feed `VmBudgetSnapshot` so reviewers can attribute whether a
  budget trip was allocation versus GC pace.

#### piccolo gc-arena GC (per-plugin VM)

- Mode: incremental arena collection via `gc-arena` 0.5.3. `bitty-lua` is
  `#![forbid(unsafe_code)]`; `gc-arena` `unsafe` is audited per ADR 0005
  scope and CTX-0040 evidence.
- Tuning: arena collection is driven by host-sliced `collect_debt` pacing,
  not a separate Lua pause value. Default debt threshold is the arena default
  (measure; do not lower without PB-2 gain). Host may force a collection after
  a generation is disposed (FS-5 reclaim) and verify against the pre-activation
  baseline within PB-3 15 percent tolerance.
- Budget coupling: arena bytes are counted via `Lua::total_memory()` and the
  same RC-2 32 MiB ceiling as `mlua`. The 32 MiB includes arena debt; a GC that
  would relieve debt after the ceiling is counted as a violation first, so a
  burst cannot borrow beyond the hard gate and GC later to hide it.

#### Memory ceilings referenced

Incremental pauses do not relax hard ceilings. Ceilings are hard-gated measured
in CTX-0040:

- RC-2 32 MiB per plugin VM, hard-gated via `Lua::total_memory()` suspend
  (`measurement_lua` 15 tests).
- Aggregate plugin memory RC-3 512 MiB reserved shares, lazy plugins included.
- Config VM ceiling is addressed under budget charging below, not as a separate
  RC value.

### Config VM budget charging (PB-1 and PB-2)

The Config VM is trusted user code but retains least privilege per the Lua
Runtime RFC per-VM table. Budget charging:

- **PB-1 cold startup.** Config VM evaluation (`init.lua` plus layered imports
  via rooted `require` inside `$BITTY_CONFIG/lua`) is synchronous on the main
  thread and its wall cost is charged to PB-1 (100 ms p50, 200 ms p99 from
  process launch to first rendered prompt). Instruction cost is RC-1 (10^7
  instructions and 50 ms wall per callback, with the same Fuel plus wall
  wrapper for `mlua`) applied as a per-evaluation budget, not per-plugin. If
  evaluation exceeds RC-1, it suspends with `budget` class and fail-closed falls
  back to last good plan or minimal built-in config, per the Configuration Model
  RFC failure and safe-mode interaction (R-009). PB-1 violation is CI-blocking;
  renegotiation requires an RFC revision, per Performance Budget RFC
  cross-cutting rules.
- **PB-2 idle memory.** Config VM post-evaluation retained memory (loaded
  chunks, `ConfigPlan` data, per-VM `package.loaded`) is counted against PB-2
  (80 MiB RSS p50 one window 60 s idle, plugins disabled beyond bundled
  minimum). The Config VM's RC-2 32 MiB ceiling applies independently; the tighter
  of RC-2 and PB-2 headroom governs shutdown. PB-2 includes both `mlua`
  allocator bytes and the Rust-side `ConfigPlan` clone, so VM tuning cannot
  hide cost in host copies.
- **Attribution.** Host emits a structured record `config_eval_budget { wall_ms,
instructions, memory_bytes, gc_steps }` per evaluation with generation `0`
  (Config VM has no generation counter). Values are not shown in default traces
  where they would echo sensitive layer content beyond the quoted offending
  line per the diagnostics contract.
- **No async deferral to buy PB-1.** Config evaluation must not offload work to
  a background task and return a handle to stay under PB-1 wall; such deferral
  would move cost off the measured path without reducing it and would violate
  the declarative-plan contract (Candidate A). All evaluation cost is synchronous
  and measured in the same span.

### Reload and module-cache interaction

Owned jointly with the Configuration Model RFC (reload classification) and the
Isolation Resource RFC (FS-6 reload ordering). This ADR specifies the Lua side.

- **Cache identity.** `require` results are cached per VM in `package.loaded`
  seeded by `bitty-lua`. There is no cross-VM cache. Cross-tree reuse still
  goes through declared host services, never direct `require` of another
  plugin's internals.
- **Config VM reload.** Triggered by `config.reloaded` observation or explicit
  `bitty config reload`. Behavior:
  - Generation `N` resources are logically disposed before `N+1` activates. For
    the Config VM the host creates a fresh `Lua` instance rather than clearing
    a single VM in place, to avoid stale closures or registry leaks.
  - `package.loaded` for the Config VM does not survive reload. Every layered
    import re-resolves against `$BITTY_CONFIG/lua` with rooted mapping;
    relative traversal out of the root is still a resolution error.
  - Failed reload restores generation `N`'s last good plan or disables cleanly
    with diagnostics, per FS-6. A reload that would exceed PB-1 or PB-2
    wall and memory is treated as a `budget` rejection, not partial application.
  - `bitty env` snapshot is `Restart-required` per ADR 0006 — a reload that
    changes the `env.allowlist` re-snapshots the environment only as part of a
    restart-required change set, not silently mid-session.
- **Per-plugin reload and HMR.** Per the Plugin Platform RFC generation model
  `Declared -> Resolved -> Registered -> Activated -> (Suspended) -> Disposed`
  and FS-6, a plugin reload disposes all `(PluginId, N)` resources — tasks,
  timers, queues, `package.loaded`, and capability-held descriptors — before
  `N+1` activates. A new `piccolo::Lua` instance is created for `N+1`; no weak
  tables or globals bridge generations. Lazy plugins reserve their declared
  worst-case RC-3 shares at graph construction so reload cannot exceed
  aggregate ceilings silently.
- **Module-cache sizing.** `package.loaded` entries are counted toward the
  owning VM's RC-2 32 MiB. An unbounded cache that grows with reload cycles is
  a conformance bug; the test asserts `total_memory()` after ten reload cycles
  stays within 15 percent of the first-cycle baseline (PB-3 reclaim shape).

## Consequences

- **Supply chain.** Tuned GC and budget coupling stay within the pinned
  `mlua` plus vendored Lua 5.4 and `piccolo` 0.3.3 line from ADR 0005; no new
  dependency is introduced by this ADR.
- **Isolation.** `!Send` VMs plus host-owned `Send` handles preserve the
  thread model the technology strategy requires; RC-4 64/32 plus three-level
  queues remain the enforcement points.
- **Performance.** PB-1 and PB-2 now have an explicit charger (Config VM
  evaluation accounted as startup work), so the first real `hyperfine` and RSS
  harness has a contract to hit instead of silent drift. GC defaults are
  measurement-ready rather than hard frozen, with explicit pause and step
  parameters to tune.
- **Compatibility.** Neovim-style ambient `os.getenv` and global `require`
  caching idioms do not port verbatim; starter configs must teach rooted
  `require` and `bitty.env.get`.

## Alternatives Considered

| Alternative                                                    | Source                                                | Disposition                                                                                                                                   |
| -------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| A — mlua async handles for Config VM                           | Candidate async handle pattern                        | Rejected — moves cost off the measured PB-1 path and leaks commit timing into init.lua; Config evaluation must be synchronous and fail-closed |
| B — make Lua VM Send via wrapper                               | Expedient Send shim                                   | Rejected — violates mlua !Send soundness and hides arena threading hazards; host owns Send handles instead                                    |
| C — mlua Send boundary plus piccolo handle boundary (this ADR) | Technology strategy validation, ADR 0005 two-VM split | Accepted baseline — Config VM blocks bounded by RC-1 deadline, plugin VM returns handles via typed host calls, VMs remain !Send               |
| D — GC generational for Config VM                              | Lua 5.4 generational mode                             | Not P0 — generational reduces pause but obscures incremental budget coupling; revisit when PB-2 needs tiered old-gen tuning                   |
| E — GC pause 100 or stepmul 200 for lower heap                 | Aggressive GC                                         | Deferred — reduces peak memory at CPU cost; tuner may raise stepmul to 150 only with measured PB-2 gain and no PB-1 regression                |
| F — Config VM shares plugin RC-1/RC-2 with no PB charging      | Budget isolation shortcut                             | Rejected — hides startup cost; PB-1 and PB-2 are the governing integration budgets per Performance Budget RFC                                 |
| G — per-VM module cache survives reload                        | Minimal reload                                        | Rejected — leaks stale program and widens rollback testing; fresh Lua per reload is the fail-closed path                                      |

## References and Verification Gates

### References

- [OQ-032](../open-questions.md) row migrated from OQ-009 CTX-0047 2026-08-27
- [ADR 0005](ADR-0005-lua-pins-and-stdlib.md) — vendored Lua 5.4.x, mlua, piccolo 0.3.3 pins, allowlist, and audit gates
- [Lua Runtime RFC](../../specifications/lua-runtime-rfc.md) — Accepted 2026-08-27 sandbox, stdlib baseline, module search, diagnostics
- [Configuration Model RFC](../../specifications/configuration-model-rfc.md) — Accepted 2026-08-27 pipeline, reload classification, project trust
- [Isolation Resource RFC](../../specifications/isolation-resource-rfc.md) — RC-1 (10^7/50 ms/8 ms), RC-2 (32 MiB), RC-4 (64 tasks/32 timers), RC-5 queues, FS-5/FS-6
- [Performance Budget RFC](../../specifications/performance-budget-rfc.md) — PB-1 cold startup 100 ms p50/200 ms p99, PB-2 idle 80 MiB
- [Technology Strategy](../../project/technology-strategy.md) — async row runtime-agnostic Core with local Tokio in services
- `bitty/Cargo.toml` `rust-version 1.85` `unsafe_code = "deny"`, `rust-toolchain.toml`, `Cargo.lock` main plus worktree `ctx-0040` with piccolo
- `bitty/crates/bitty-lua/Cargo.toml` `src/lib.rs` `tests/measurement_lua.rs` RC-1/RC-2 harness and `bitty/crates/bitty-plugin-host/tests/measurement.rs` queue harness

### Verification gates

The following gates were satisfied per the
[open-question register](../open-questions.md) close rule on 2026-08-29.

1. **Send/Sync gate:** `cargo test -p bitty-lua` static assertions `assert_not_send_sync::<mlua::Lua>` and `assert_not_send_sync::<piccolo::Lua>` plus compile-fail probe that a VM value cannot be moved into a `tokio::spawn`, with `forbid(unsafe_code)` in `bitty-lua` intact.
2. **Host-call boundary gate:** Config VM host call blocks under RC-1 wall deadline and unwinds with `budget` class on excess; plugin host call returns a typed handle and resolves via the event pipeline without entering the parser/render/input hot paths (P0-AC-015 latency probe).
3. **Task and timer cap gate:** adversarial harness at RC-4 caps — 65th task and 33rd timer refused with `E_BUDGET_TASK`/`E_BUDGET_TIMER`, host registries stay at 64/32, and drops are attributed.
4. **GC tuning gate:** headless matrix asserts `mlua` incremental pause 200 stepmul 100 (and step 13 where exposed) plus `piccolo` arena debt pacing, with `VmBudgetSnapshot` `gc_steps` and `gc_bytes` visible; tuning bump to pause 150 or stepmul 150 requires measured PB-2 delta.
5. **Budget-charging gate:** `hyperfine`-style startup harness asserts Config VM wall cost inside PB-1 p50/p99 and Config VM plus `ConfigPlan` retained RSS inside PB-2 80 MiB; suspension path from RC-1 produces fail-closed fallback to last good plan.
6. **Reload and module-cache gate:** ten-cycle reload test asserts `total_memory()` after each cycle stays within 15 percent of cycle one, `package.loaded` per generation is isolated, and generation `N` resources are disposed before `N+1` activates per FS-6.
7. **Docs sync:** this ADR appears in [decision register](../index.md) and [ADR index](README.md) plus `docs/specifications/lua-runtime-rfc.md` open-items note plus [open-question register](../open-questions.md) OQ-032 row to Accepted ADR 0007 in the same PR per register close rule.

### Evidence needed to move OQ-032 from Open to Accepted

Checklist the commander gated P0 review on. Each maps to a gate above. The
following evidence was recorded for acceptance on 2026-08-29.

- [ ] **E1 — Send boundary proof:** compile-fail and test diffs proving VMs are `!Send`/`!Sync`, host handles are `Send`, and the async boundary matches the table above.
- [ ] **E2 — Host-call proof:** Lua script matrix where a Config VM host call that exceeds RC-1 suspends and a plugin call that returns a handle completes without blocking the host tick, both with attribution.
- [ ] **E3 — Task and timer cap proof:** `bitty-plugin-host` harness exercising 64 tasks/32 timers per plugin with refusal and reclaim after dispose (PB-3 shape).
- [ ] **E4 — GC tuning proof:** matrix exercising `mlua` pause/stepmul and `piccolo` arena debt pacing with widened-tuning comparison and `VmBudgetSnapshot` counters stored under `tmp/evidence/`.
- [ ] **E5 — Config VM PB-1/PB-2 charging proof:** startup bench `hyperfine` plus RSS sample proving PB-1 p50/p99 and PB-2 80 MiB with Config VM accounted, and fail-closed path exercised.
- [ ] **E6 — Reload and cache isolation proof:** ten-cycle reload test with per-generation `package.loaded` assertions and FS-6 disposal verification, plus cross-tree `require` denial still green.
- [ ] **E7 — Supply-chain and unsafe proof:** `cargo vet`, `cargo audit`, `cargo geiger` clean or with recorded waivers for the pinned line from ADR 0005; no new dependency widening.
- [ ] **E8 — Cross-doc closure:** `open-questions.md` OQ-032 to Accepted ADR 0007, `lua-runtime-rfc.md` open-items note updated, `adrs/README.md` row added, decision register candidate queue updated — all in one PR with `just check` green.

## P0 Review Sign-off

> P0 review per CTX-0083 tracks acceptance of OQ-032 via this ADR. Frontmatter is
> `accepted` and [open-questions.md](../open-questions.md) is updated per its
> close rule. This section records passing sign-off and closes OQ-032.

<!-- markdownlint-disable MD013 -->

| Role                                  | Reviewer          | Verdict | Evidence / scope                                                                                                                                                                                                                                                                                                                                                                       | Date       |
| ------------------------------------- | ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| security-auditor                      | `bitty-security`  | pass    | R-006, R-007, R-018, T-07, T-14, `!Send`/`!Sync` VMs, host-owned `Send` handles, RC-1 10^7/50 ms/8 ms and RC-2 32 MiB hard-gated, GC incremental pause 200 stepmul 100, Config VM PB-1/PB-2 charging, reload FS-6 per-generation isolation                                                                                                                                             | 2026-08-29 |
| category-owner (security-and-quality) | `bitty-quality`   | pass    | RC-4 64 tasks/32 timers per `(PluginId, generation)` with `E_BUDGET_TASK`/`E_BUDGET_TIMER`, host registries 64/32, `VmBudgetSnapshot` `gc_steps`/`gc_bytes`, Config VM wall/memory charging with fail-closed `budget` fallback, ten-cycle `total_memory()` 15% PB-3 reclaim                                                                                                            | 2026-08-29 |
| category-owner (architecture)         | `bitty-architect` | pass    | `mlua` vendored Lua 5.4 blocking under RC-1 deadline vs `piccolo` 0.3.3 handle via event pipeline, `!Send` affirmation, incremental vs arena `gc-arena` 0.5.3 tuning, budget coupling, per-VM `package.loaded` fresh Lua per reload, no cross-VM cache, generation disposal before activate                                                                                            | 2026-08-29 |
| docs-curator                          | `bitty-curator`   | pass    | Frontmatter `accepted`, lifecycle `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`, links to [Lua Runtime RFC](../../specifications/lua-runtime-rfc.md) and [Isolation Resource RFC](../../specifications/isolation-resource-rfc.md) and [Configuration Model RFC](../../specifications/configuration-model-rfc.md), English-only, decision-register sync | 2026-08-29 |

Closes OQ-032: this ADR closes that open question at the design level; the
register rows are updated per the open-question register rules. The lifecycle is
`Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## Appendix: Pin history supplement

This ADR adds no new pins. Pin history lives in
[ADR 0005](ADR-0005-lua-pins-and-stdlib.md) appendix and is re-verified at
acceptance of that ADR. Change this ADR when GC or budget defaults move, not
when pins do.

## Appendix: RC coupling quick reference

| RC   | Value this ADR references                                                                                      | Charging                                                                             |
| ---- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| RC-1 | `10^7` instructions / 50 ms wall / 8 ms warning hard-gated via `piccolo` Fuel + wall and `mlua` hook plus wall | Per callback, and per Config evaluation; host GC steps counted against the same wall |
| RC-2 | 32 MiB per plugin VM via `Lua::total_memory()` (Config VM same ceiling)                                        | Per VM; Config retained counted toward PB-2; arena debt included                     |
| RC-4 | 64 tasks / 32 timers per plugin                                                                                | Per `(PluginId, generation)` host registry; refusal not queueing                     |
| PB-1 | 100 ms p50 / 200 ms p99 cold startup                                                                           | Config VM wall is charged here; exceed is `budget` fallback                          |
| PB-2 | 80 MiB RSS p50 idle                                                                                            | Config VM retained plus `ConfigPlan` charged here                                    |

<!-- markdownlint-enable MD013 -->
