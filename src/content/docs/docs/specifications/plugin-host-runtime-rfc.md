---
title: Plugin Host Runtime RFC
description: Accepted contract resolving the runtime plugin host bridge, per-plugin VM lifecycle, source staging, and host-service wiring boundary for OQ-033, OQ-034, and OQ-035
category: specifications
audience: plugin-author
document_type: specification
status: accepted
website_publish: true
sidebar_order: 30
---

# Plugin Host Runtime RFC

> Status: **accepted** on 2026-09-11. The project initiator (user) ratified the
> bounded resolutions for [OQ-033](../decisions/open-questions.md) (runtime
> plugin host bridge and per-plugin VM lifecycle), OQ-034 (runtime source
> resolution and staging), and OQ-035 (host-service wiring boundary) through
> [ADR 0010](../decisions/adrs/ADR-0010-plugin-host-runtime-acceptance.md),
> including the four named numeric defaults. Acceptance records the reviewed
> contract; it does not by itself authorize shipped, stable, or
> compatibility-guaranteed behavior beyond the verification obligations below,
> and it weakens no normative security control. The lifecycle is
> Draft -> experimental review evidence -> Accepted -> normative; only
> Accepted or normative documents authorize shipped behavior.

## Purpose and scope

The `bitty` live campaign `CTX-0320` reported defect D4 (P0): the plugin host is
not wired at runtime, no plugin code loads, and a tested plugin such as
`bitty-featured.activity` cannot run in Bitty. The implementer's gap analysis
(`bitty` `CTX-0324`, commit `bbad681`) stopped rather than inventing a required
design decision, and recorded three missing accepted designs. This RFC answers
those three gaps at the design level only.

In scope:

- Gap A: where the runtime `bitty` host bridge lives, how it is embedded over
  the accepted `bitty-lua` `piccolo` seam, how host callbacks are marshalled,
  how `init.lua` registration results are captured, and how a per-plugin VM is
  created, activated, suspended, resumed, reloaded, and disposed together with
  its generation.
- Gap B: where an installed plugin's manifest and Lua module tree live at
  runtime, how the host discovers them, the atomic active-version pointer, and
  the local-path development flow.
- Gap C: the owning runtime component, the synchronous versus asynchronous and
  `Send` boundary, and the persistence path for the accepted
  `bitty.terminal.snapshot`, `bitty.notify.show`, `bitty.store.*`, and
  `bitty.settings.*` host services.

Out of scope, owned elsewhere and only referenced here:

- Plugin API v1 Lua surface spellings and signatures
  ([Plugin API v1 Lua Surface RFC](plugin-api-v1-lua-surface-rfc.md), accepted
  through [ADR 0009](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md)).
- Manifest schema, capability identifier grammar, grant lifecycle, and event
  pipeline classes, batching, and budgets
  ([Plugin Platform RFC](plugin-platform-rfc.md), accepted).
- Restricted standard library, rooted module resolution rules, diagnostics
  classes ([Lua Runtime RFC](lua-runtime-rfc.md), accepted), the `mlua` versus
  `piccolo` split and pins
  ([ADR 0005](../decisions/adrs/ADR-0005-lua-pins-and-stdlib.md)), environment
  reads ([ADR 0006](../decisions/adrs/ADR-0006-os-env-policy.md)), and the
  Config VM async boundary ([ADR 0007](../decisions/adrs/ADR-0007-async-gc.md)).
- Resource ceilings and their numbers
  ([Isolation Resource RFC](isolation-resource-rfc.md), accepted; `RC-1`..`RC-11`).
- Package integrity, signature, lock, and rollback semantics
  ([Package Lifecycle RFC](package-lifecycle-rfc.md), accepted).

This RFC selects concrete mechanisms for controls the accepted sources already
require. It moves no requirement between owners, relaxes no P0 gate, and
changes no accepted numeric ceiling. Every number introduced below is a named
constant; [ADR 0010](../decisions/adrs/ADR-0010-plugin-host-runtime-acceptance.md)
fixes the four proposed defaults, and changing one requires an RFC revision.

## Provenance and problem statement

The accepted [Lua Runtime RFC](lua-runtime-rfc.md) fixes the single host bridge
in every VM as a versioned `bitty` module whose function surface is owned by the
respective API RFCs, and fixes rooted source-only module resolution. The
accepted [Plugin API v1 Lua Surface RFC](plugin-api-v1-lua-surface-rfc.md)
fixes the surface, the fixed `init.lua` activation entry point, and
generation-owned resources. Neither defines the bridge implementation,
callback marshalling, VM lifecycle mechanics, or `require` construction.

The draft [Plugin system](../extensibility/plugin-system.md) document records
that "exact VM creation, reuse, unload/reload lifecycle, service transport,
state migration, and cost optimizations still require validation". The accepted
[Plugin Platform RFC](plugin-platform-rfc.md) defines lifecycle and generation
semantics but leaves the runtime mechanism to the `bitty` repository. The
[Core boundaries](../architecture/core-boundaries.md) document lists the
"implementation mechanism for per-plugin VMs, asynchronous callbacks, and
resource-budget thresholds and enforcement" as a pending decision.

For source staging, the accepted
[Package Lifecycle RFC](package-lifecycle-rfc.md) describes a staged
activation transaction whose `wake` phase loads plugins in fresh VMs, but
delegates the stored tree location to the draft
[Package management](../extensibility/package-management.md) candidate layout.
For host services, the accepted surface permits `bitty.terminal.snapshot`,
`bitty.notify.show`, `bitty.store.*`, and `bitty.settings.*`, but no accepted
document assigns the owning component, the sync/async and `Send` boundary, or
the persistence path.

Evidence revisions inspected read-only while drafting (recorded as provenance,
not as implementation claims): `bitty` `bbad681` gap analysis and cited
`crates/bitty-runtime/src/runtime/plugin.rs`,
`crates/bitty-app/src/plugin.rs`, `crates/bitty-lua/src/lib.rs`,
`crates/bitty-plugin-host/Cargo.toml`; `bitty-docs` `origin/main` at the
drafting revision.

## Normative sources this proposal must not weaken

- [Security overview](../security/overview.md): untrusted-by-default posture,
  least-privilege capability families, invariants 2 (no ambient authority), 4
  (no hot-path execution), 8 (updates cannot silently add capabilities), and 10
  (`bitty --safe`).
- [Threat model](../security/threat-model.md): T-06 (VM escape via
  unrestricted libraries), T-07 (callback storms and hot-path execution), T-10
  (untrusted observation data), T-12 (manifest and source trust), and T-13
  (Terminal Truth integrity), with risks R-006, R-007, R-008, R-009, R-015,
  and R-016.
- [Core boundaries](../architecture/core-boundaries.md): mechanism versus
  policy split, observation-versus-interception, declarative UI, generation
  ownership, and the two security domains.
- [Plugin system](../extensibility/plugin-system.md): extension levels 1-4,
  register-versus-claim, and the governing boundary that plugins alter
  presentation but never Terminal Truth.
- [Isolation Resource RFC](isolation-resource-rfc.md): `IR-D2` one VM per
  plugin identity and generation, `RC-1` instruction and wall budget, `RC-2`
  memory ceiling, `RC-4` tasks and timers, `RC-5` queue budgets, and `RC-11`
  plugin store quota.
- [Plugin Platform RFC](plugin-platform-rfc.md) and
  [Plugin API v1 Lua Surface RFC](plugin-api-v1-lua-surface-rfc.md): manifest,
  grants, lifecycle, generation disposal, closed event set, and the accepted
  service surface.

## Gap A - host bridge and per-plugin VM lifecycle

### A.1 Component ownership and dependency placement

The accepted three-way authority split is preserved: policy in
`bitty-plugin-host`, mechanism in `bitty-lua`, orchestration in
`bitty-runtime`, application wiring in `bitty-app`.

| Responsibility                                                                       | Owning component (proposed)                                                         |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Bridge orchestration, VM creation/disposal, generation state machine, dispatch entry | `bitty-runtime` (new `plugin_runtime` module), which gains a `bitty-lua` dep        |
| VM seam: host-function injection, rooted source-only `require`, bounded execution    | `bitty-lua`                                                                         |
| Capability checks, grant intersection, registry, subscriptions, queue budgets        | `bitty-plugin-host` (unchanged; no `bitty-lua` dependency)                          |
| Startup declaration, grant insertion, dispatch/event pump wiring                     | `bitty-app`                                                                         |
| Core service handles behind capability-checked bridge functions                      | `bitty-runtime`, delegating to `bitty-term-state`, `bitty-config`, `bitty-platform` |

`bitty-plugin-host` must not gain a `bitty-lua` dependency; the policy crate
stays VM-free so that capability decisions cannot be bypassed by VM-local
state. `bitty-runtime` and `bitty-app` gain the previously missing plugin-runtime
wiring. No new workspace crate is proposed; the accepted
[ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) topology is
unchanged.

### A.2 Proposed `bitty-lua` seam extensions

The current seam exposes `LuaVm::{new, with_budgets, execute, eval_config}` and
loads only `base`/`coroutine`/`math`/`string`/`table`. The following additions
are proposed; names are working identifiers, not accepted spellings.

| Proposed seam item                      | Purpose                                                                                                     | Bound                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `LuaVm::install_host_module(spec)`      | Inject the read-only `bitty` host table and native callbacks before executing `init.lua`.                   | Recursive install; Lua assignment or metatable mutation of `bitty` fails with a `runtime` error |
| `LuaVm::with_module_root(root)`         | Source-only `require` rooted at the plugin's own module tree; no cross-tree fallback.                       | Root path canonicalized; traversal out of root is a `resolution` error; no bytecode loading     |
| `LuaVm::execute_bounded(chunk, budget)` | Run a host-controlled chunk under `RC-1`/`RC-2`; return a typed result rather than a raw VM error.          | Instruction and wall ceiling per `RC-1`; memory per `RC-2`; fail-closed suspend                 |
| `marshalling::{from_lua, to_lua}`       | Convert bounded Lua tables to and from Rust values with depth, node, and byte limits.                       | Depth and size limits align with the accepted surface limits below                              |
| Typed bridge error type (`BridgeError`) | Stable `E_*` codes for denials, quotas, resolution, and budget, marshalled to the typed diagnostic classes. | Bounded message; no echoed untrusted content beyond the quoted offending token                  |

`require` is implemented as a host resolver over the plugin module tree, not
by exposing Lua's `package`/`package.path`. The resolver caches per VM; the
reload rule clears the cache on generation disposal. `os`, `io`, `debug`
(except `debug.traceback`), `package.loadlib`, and bytecode loading remain
absent or deny-stubbed exactly as the accepted
[Lua Runtime RFC](lua-runtime-rfc.md) requires. The seam exposes no filesystem
or network function to Lua: reading the plugin's own module tree is a
host-mediated resolution step, not plugin-visible filesystem authority, and
`fs.*` remains a separate capability path with no v1 Lua entry point.

### A.3 Bridge marshalling contract

1. Every bridge call is **synchronous** within the current VM slice and must
   complete without blocking on I/O, locks, or another thread. A call that
   cannot guarantee this returns a generation-owned handle and completes
   through the accepted event or timer path.
2. Every bridge call is **deadline-bounded** by `RC-1` and cannot itself be
   re-entered. A bridge callback invoked while a bridge call is on the stack is
   rejected with a `runtime` error.
3. Arguments and results are immutable bounded copies, never live host objects.
   The marshalling limits are depth at most 8, at most 1024 nodes, and a
   serialized value at most `STORE_MAX_VALUE_BYTES` (8 KiB) for storage-shaped
   values; the accepted surface limits govern each namespace.
4. Capability checks happen in `bitty-plugin-host` before any side effect. An
   absent grant fails closed with `E_CAPABILITY_DENIED` (`runtime` class); a
   denied call never partially executes.
5. The `bitty` table and its sub-tables are installed read-only. A plugin
   cannot replace, wrap, or shadow `bitty` or any v1 namespace.

### A.4 Registration capture and activation

1. The host creates the VM, installs the bridge, and executes the fixed
   `init.lua` at the package root inside one bounded activation transaction.
2. During `init.lua`, every registration call (`commands.register`,
   `events.subscribe`, `keymaps.suggest`, `ui.mount`, `services.provide`, task
   and timer creation) is recorded into a generation-scoped
   `RegistrationCapture`; it is not made observable to other plugins yet.
3. After `init.lua` returns, the host validates the capture against the
   manifest: reserved command names, declared event subscriptions, declared
   service interfaces, slot and capability grants, and `RC-4` task/timer caps.
   A mismatch is a `validation` registration error.
4. Validation success commits the capture atomically to the registries, marks
   the generation activated, and delivers `plugin.activated`. Any failure
   disposes the generation with no partial activation and releases graph
   reservations atomically.
5. Lazy plugins run `init.lua` in a fresh VM on first invocation and then
   replay the triggering command once; replay is single-shot and reentrant
   replay is rejected, per the accepted
   [Plugin Platform RFC](plugin-platform-rfc.md) lazy-load semantics.
6. `bitty --safe` never creates a third-party VM and never reads the
   third-party store tree; the safe startup path of `R-009` and invariant 10
   is preserved.

### A.5 VM lifecycle states and generation ownership

One VM instance exists per `(PluginId, generation)`. The proposed runtime
states are:

```text
Unloaded -> Loading -> Activating -> Active -> Suspended -> Disposing -> Disposed
                \-> Failed (terminal for that generation)
```

- `Suspended` retains grants, registrations (detached), and persisted store
  data; `Disposed` releases generation memory, handles, tasks, and timers.
- Reload disposes generation N before activating N+1, so N cannot observe or
  cancel N+1. Persisted `bitty.store` data is plugin-scoped and survives
  disposal until uninstall or explicit user purge, per the accepted surface.
- A `piccolo` VM is not `Send`. A VM is created, executed, suspended, and
  disposed on a single owning executor thread. Host service handles that must
  cross thread boundaries are `Send` and the VM holds only generation-local
  handles or task ids.
- Failure is contained: a bridge or callback failure suspends or disposes only
  the owning generation and never crashes the host.

### A.6 Timeouts and budgets

- Activation and every callback reuse `RC-1` (`10^7` VM instructions or 50 ms
  wall clock, whichever first; 8 ms soft warning) and `RC-2` (32 MiB
  accounted). No new budget is introduced for activation; a hung `init.lua`
  is suspended exactly like a hung callback.
- The bridge adds no unbounded host call. A proposed typed `E_TIMEOUT`
  (`budget` class) is returned when a bounded host operation hits its own
  deadline, and the plugin slice is suspended fail-closed.
- Timer and task delivery stays on the accepted event path, so `RC-4` and
  `RC-5` queue budgets continue to apply.

## Gap B - runtime source resolution and staging

### B.1 Source classes

The closed source-class set is the accepted direction from
[Package management](../extensibility/package-management.md): `bundled`,
`registry`, `git`, and `local-path`. Runtime loading in the first slice needs
`bundled` and `local-path` (development); `registry` and `git` resolution stay
with the package manager and become loadable once it emits a resolved record.
A source class never widens capability grants: grants stay bound to the
manifest hash recorded at consent.

### B.2 Proposed store layout

The runtime adopts the accepted candidate root and refines the active-version
pointer to a JSON pointer file so the atomic switch does not depend on symlink
support:

```text
$XDG_DATA_HOME/bitty/plugins/
  packages/
    <plugin-id>/
      <version>/
        bitty-plugin.toml      # bounded manifest body, stored (not only hashed)
        lua/                   # the plugin module root used by require
        assets/                # optional bounded assets
  generations/
    <generation>.json          # retained resolved lock/pointer set for rollback
  current.json                 # atomic active pointer: plugin-id -> source record
```

`current.json` is replaced by write-temp-then-rename, matching the accepted
staged-activation "observable all-or-nothing" contract. The implementation may
retain numbered generations per the accepted `S2` staging recommendation; the
runtime only requires the atomic pointer.

### B.3 Discovery and integrity, fail closed

1. On startup the runtime reads the managed desired state and
   `current.json`, then loads the manifest body from `packages/`.
2. It re-verifies `manifest_hash` and `content_digest` against the resolved
   record before creating a VM. A missing entry, mismatched hash, or mismatched
   digest is a typed `NotFound` or integrity failure; the plugin does not load
   and the host never falls back silently to a different version or to bundled
   content.
3. The store tree is untrusted input. Paths are canonicalized; a path that
   escapes the plugin root through traversal or symlink is a `resolution`
   error. Native artifacts (`.so`, `.dll`, `.dylib`, `.node`) in the module
   tree are rejected at activation and are never loaded, preserving the
   native-in-process-plugin prohibition.
4. Loading is read-only. The runtime never fetches from the network during
   startup and never mutates the store tree.

### B.4 Runtime source record

The shipped `PluginRecord` stores only `{source, manifest_hash, enabled,
granted}` and cannot locate a non-bundled tree. The runtime needs a resolved
locator. The proposed record adds, per plugin:

| Field            | Meaning                                                        |
| ---------------- | -------------------------------------------------------------- |
| `source_class`   | `bundled`, `registry`, `git`, or `local-path`                  |
| `plugin_id`      | Owner-qualified stable identity                                |
| `version`        | Resolved plugin version                                        |
| `root`           | Store-relative path to the manifest and module tree            |
| `manifest_hash`  | Consent-bound manifest hash; grants remain bound to it         |
| `content_digest` | Digest of the installed tree for integrity and drift detection |
| `enabled`        | Desired load state                                             |
| `granted`        | Granted capability identifiers                                 |

This record is runtime state, not a new wire format; the package manager owns
writing it as part of the accepted activation transaction.

### B.5 Local-path development flow

A local-path package keeps visibly different trust semantics and is never
treated as verified:

1. Resolution records the canonical absolute development path and a content
   digest captured at resolution time, with `source_class = local-path`.
2. The runtime loads read-only from that recorded path; it never follows a
   changed path or a new symlink target silently.
3. `sync` and `update` re-digest the content; drift between disk content and
   the recorded digest marks the plugin unverified until it is re-resolved.
4. A local-path package cannot claim registry or signature provenance, cannot
   be promoted to a verified class without passing the full verification
   chain, and is displayed as a development source.
5. The same native-artifact rejection, path canonicalization, and size bounds
   apply as for installed packages.

### B.6 Proposed bounds

All values are named constants fixed by
[ADR 0010](../decisions/adrs/ADR-0010-plugin-host-runtime-acceptance.md);
changing one requires an RFC revision rather than silent drift.

| Constant                        | Proposed default | Applies to                                         |
| ------------------------------- | ---------------- | -------------------------------------------------- |
| `PLUGIN_MANIFEST_MAX_BYTES`     | 256 KiB          | Stored manifest body per package                   |
| `PLUGIN_MODULE_MAX_FILES`       | 4096             | Files in one module tree                           |
| `PLUGIN_MODULE_TREE_MAX_BYTES`  | 16 MiB           | Aggregate module tree per package                  |
| `PLUGIN_MODULE_PATH_MAX_BYTES`  | 1024             | Canonical module path length                       |
| `PLUGIN_ACTIVATION_DEADLINE_MS` | `RC-1` (50 ms)   | Activation wall deadline, reusing the accepted cap |

## Gap C - host-service wiring boundary

### C.1 Ownership, mode, and persistence

| Bridge function              | Owning component (proposed)                                                | Mode                                                                        | Persistence                                                 |
| ---------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `bitty.terminal.snapshot`    | Core terminal state and registry, exposed through a runtime provider trait | Synchronous bounded read of committed state; no live core object escapes    | None; response only                                         |
| `bitty.notify.show`          | Platform notification primitive (`bitty-platform`) via the runtime         | Asynchronous hand-off; returns whether the notification was accepted        | None; rate-governed by `RC-8`                               |
| `bitty.store.get` / `set`    | `bitty-plugin-host` plugin store (quota `RC-11`)                           | Synchronous bounded read/write; `set` commits atomically before return      | `$XDG_DATA_HOME/bitty/plugins-state/<plugin-id>/store.json` |
| `bitty.settings.get` / `set` | `bitty-config` typed settings under `plugins.<owner>.<name>`               | Synchronous bounded read; `set` routes through configuration reconciliation | `$XDG_CONFIG_HOME/bitty/` via the configuration subsystem   |

Paths are derived from the platform XDG path provider, never hardcoded, and are
distinct per concern: package tree, plugin persistent state, configuration, and
cache. The plugin store is separate from the package tree so uninstall,
rollback, and purge have independent semantics.

### C.2 Sync versus async and `Send` contract

1. Bridge functions are synchronous and non-blocking. A function that cannot
   complete within its bound returns a generation-owned handle or task id and
   completes later through the accepted event or timer path; it never blocks
   the VM thread.
2. The VM is `!Send` and confined to one executor thread. Cross-thread services
   expose `Send` handles; a service result crossing back into the VM is
   marshalled into a bounded value before use.
3. No bridge function runs on the parser, render, or input hot path. Snapshot
   reads committed terminal state on the cold path; notifications and settings
   writes are queued or reconciled rather than executed inline.
4. `bitty.terminal.snapshot` is bounded by `SNAPSHOT_MAX_BYTES` (256 KiB) and
   fails with `E_SNAPSHOT_TOO_LARGE` rather than truncating.

### C.3 Persistence ownership

- The plugin store (`bitty.store`) is owned by `bitty-plugin-host`, which
  enforces the `RC-11` quota and atomic-write rule and survives suspension,
  reload, and generation disposal.
- Typed settings (`bitty.settings`) are owned by `bitty-config`; the accepted
  Configuration Model RFC owns merge, reload, and namespace semantics.
- Neither namespace grants filesystem authority. Writes are bounded, atomic,
  and fail closed; there is no partial write and no eviction.

### C.4 Fail-closed error contract

| Condition                          | Result                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Capability absent or not granted   | `E_CAPABILITY_DENIED` (`runtime`), before any side effect                    |
| Store value invalid or too deep    | `E_STORE_VALUE_INVALID` (`validation`), no write                             |
| Store quota exceeded               | `E_STORE_QUOTA` (`budget`), no eviction and no partial write                 |
| Snapshot exceeds byte ceiling      | `E_SNAPSHOT_TOO_LARGE` (`budget`), no truncated response                     |
| Bounded host operation times out   | `E_TIMEOUT` (`budget`), plugin slice suspended fail-closed                   |
| Service provider absent            | typed resolution error before activation (`E_SERVICE_RESOLUTION`)            |
| Bridge re-entry or invalid capture | `runtime`/`validation` diagnostic, generation disposed without partial state |

## Candidate - reload/update triggers and queue drain (OQ-072)

Status: **candidate, not ratified** (bitty `CTX-0373`; registered as
[OQ-072](../decisions/open-questions.md)). The accepted reload mechanics stay
authoritative; this section does not revise an accepted contract and makes no
implementation claim. It bounds what the accepted corpus leaves open after
OQ-033/OQ-034/OQ-035:

- **Trigger surfaces.** Reload applies only on an explicit host action: a
  `bitty plugin reload <id>` CLI/IPC request under the `plugin.manage` scope
  with elevation, or the package manager's activation `wake` phase after a
  committed update transaction. A plugin cannot request its own reload, and no
  plugin-visible configuration widens the trigger set. The accepted
  `runtime.plugin-manage` high-risk capability stays consent-gated.
- **Development watcher.** Automatic reload is limited to opted-in `local-path`
  sources. The watcher pins the canonical module root recorded at resolution
  (B.5) and never follows a changed path or symlink target; events outside the
  recorded root are ignored and reported. Events are debounced and coalesced
  into at most one in-flight reload per plugin; the request is enqueued to the
  cold-path control queue and applied between ticks on the runtime owner
  thread, never on the parser, render, or input hot path. Installed
  (`registry`/`git`) sources reload only through the package manager's
  transactional `wake`, and `bundled` sources are not hot-swapped. A failed
  watcher-triggered reload leaves the plugin cleanly disabled per FS-6 with a
  diagnostic; it never retries in a loop.
- **Teardown versus state preservation.** Teardown-and-rebuild is the accepted
  model (A.5, FS-6): generation N is disposed before N+1 activates. Only
  `bitty.store` state survives (plugin-scoped, ADR 0009); in-memory generation
  state is not migrated and no in-memory handoff is proposed for v1.
- **Capability re-check.** Reload re-verifies `manifest_hash` and
  `content_digest` before creating a VM (B.3), keeps grants bound to the
  manifest hash, carries narrowed sets forward, and blocks capability-adding
  replacements pending permission-diff consent (R-016). No bypass path is
  added for development sources.
- **Failure and rollback.** The host prefers restoring generation N when the
  prior generation snapshot is still retained, and otherwise disables the
  plugin cleanly (FS-6); no mixed-generation authority, no partially activated
  state, and no silent fallback to a different revision or bundled content.
- **Queue drain at disposal.** Disposal drops generation N's queued events and
  its subscriptions; queued events are never replayed into N+1, N+1 starts
  with empty queues, and drop/eviction counters stay attributed to N. The
  accepted overflow policy is unchanged (`DropOldest` v1 default, per-queue
  FIFO, RC-5 budgets), and no new drain or replay policy is introduced.
- **Non-goals (v1).** In-memory state migration or serialization across
  generations; zero-downtime side-by-side generations (A/B swaps); native
  plugins; reload of Core chrome or configuration keys through this path;
  plugin-provided watchers or reload authority; automatic hot-update of
  installed third-party plugins without the accepted update/consent flow.

## Threat and fail-closed alignment

| Proposed element                                                | Gate it preserves                                         | Threat/risk IDs |
| --------------------------------------------------------------- | --------------------------------------------------------- | --------------- |
| Policy crate stays VM-free; capability check before side effect | No ambient authority; no VM-local bypass of grants        | T-06, R-006     |
| One VM per identity and generation; thread confinement          | Plugin isolation; no cross-plugin VM or module reach      | T-06, R-006     |
| Rooted source-only `require`; native artifacts rejected         | Restricted library and no native in-process plugins       | T-06, R-017     |
| `RC-1`/`RC-2` on activation and callbacks; `E_TIMEOUT`          | No unbounded plugin execution; no hot-path blocking       | T-07, R-007     |
| Read-only bounded host calls; immutable copies                  | Untrusted-input treatment; observation is not instruction | T-10, R-013     |
| Store quota, atomic writes, no partial state                    | Bounded persistence; no silent escalation through state   | T-12, R-015     |
| `--safe` skips third-party VMs and store reads                  | Recovery and safe startup path                            | R-009           |
| Manifest-hash-bound grants; staging pointer is not authority    | Updates cannot silently add capability                    | T-12, R-016     |

## Verification and acceptance obligations

Acceptance of this RFC does not satisfy any of the following. They are the
acceptance gates for the implementing repositories:

1. Seam tests: host-module injection is read-only; `require` denies traversal,
   bytecode, native artifacts, and cross-tree loads; bounded execution
   suspends on `RC-1`/`RC-2`.
2. Lifecycle tests: `Unloaded -> Active -> Suspended -> Disposed` transitions;
   reload disposes generation N before N+1; no partial state on activation
   failure; `--safe` creates no third-party VM.
3. Staging tests: pointer switch is atomic; missing or mismatched manifest hash
   or content digest is fail-closed; local-path drift is reported unverified;
   native artifacts are rejected.
4. Host-service tests: absent grants produce typed denials; store quota and
   value bounds hold; store survives generation disposal; snapshot ceiling
   rejects rather than truncates; no bridge call blocks the VM thread.
5. Independent review by the category owner, docs curator, and a security
   reviewer, then project-initiator ADR ratification of OQ-033, OQ-034, and
   OQ-035 (the contract ratification is satisfied by
   [ADR 0010](../decisions/adrs/ADR-0010-plugin-host-runtime-acceptance.md) on
   2026-09-11).
6. Documentation synchronization: this RFC, the
   [open-question register](../decisions/open-questions.md), the
   [decision register](../decisions/index.md), the
   [specifications index](README.md), the
   [Plugin system](../extensibility/plugin-system.md) validation note, and the
   [Core boundaries](../architecture/core-boundaries.md) pending-decision
   pointer move together.

## Ratified resolutions

The project initiator (user) ratified the following through
[ADR 0010](../decisions/adrs/ADR-0010-plugin-host-runtime-acceptance.md) on
2026-09-11; the registered OQ rows are now Accepted:

1. OQ-033: adopted the `bitty-runtime` orchestration placement, the `bitty-lua`
   seam extensions, the synchronous non-blocking marshalling contract, and the
   `RC-1`-reused activation deadline.
2. OQ-034: adopted the refined store layout and `current.json` atomic pointer,
   the extended runtime source record, and the local-path development flow;
   this resolves the store-layout dependency previously delegated to the draft
   [Package management](../extensibility/package-management.md) candidate
   layout.
3. OQ-035: adopted the host-service ownership and persistence table, the
   synchronous non-blocking and `Send` contract, and the fail-closed error
   contract.
4. Numeric defaults `PLUGIN_MANIFEST_MAX_BYTES` (256 KiB),
   `PLUGIN_MODULE_MAX_FILES` (4096), `PLUGIN_MODULE_TREE_MAX_BYTES` (16 MiB),
   and `PLUGIN_MODULE_PATH_MAX_BYTES` (1024) are fixed as named constants.

## References

- [Open-question register](../decisions/open-questions.md) - OQ-033, OQ-034,
  OQ-035 (Accepted); OQ-072 (Open: reload/update triggers and queue drain).
- [Decision register](../decisions/index.md) - candidate queue (accepted
  entry).
- [ADR 0010](../decisions/adrs/ADR-0010-plugin-host-runtime-acceptance.md) -
  project-initiator ratification of OQ-033, OQ-034, and OQ-035 and the four
  numeric defaults.
- [Plugin Platform RFC](plugin-platform-rfc.md) - accepted manifest,
  capabilities, lifecycle, generations, event pipeline.
- [Plugin API v1 Lua Surface RFC](plugin-api-v1-lua-surface-rfc.md) - accepted
  v1 surface, `init.lua` entry point, store quota, snapshot schema.
- [ADR 0009](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md) -
  accepted Lua surface resolutions and authority split.
- [Lua Runtime RFC](lua-runtime-rfc.md) - accepted sandbox, module resolution,
  diagnostics, host bridge ownership.
- [Isolation Resource RFC](isolation-resource-rfc.md) - `IR-D2`, `RC-1`,
  `RC-2`, `RC-4`, `RC-5`, `RC-11`.
- [Package Lifecycle RFC](package-lifecycle-rfc.md) - staged activation,
  local-path development semantics, rollback.
- [Package management](../extensibility/package-management.md) - source model
  and candidate store layout.
- [Plugin system](../extensibility/plugin-system.md) - runtime isolation and
  lifecycle validation note.
- [Core boundaries](../architecture/core-boundaries.md) - ownership, authority,
  and pending decisions.
- [Security overview](../security/overview.md) and
  [Threat model](../security/threat-model.md) - normative gates.
- [Configuration Model RFC](configuration-model-rfc.md) - typed settings
  ownership for `bitty.settings`.
- [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md) -
  terminal identity tuple used by `bitty.terminal.snapshot`.
- `bitty` `CTX-0324` (commit `bbad681`) - D4/P0 gap analysis that identified
  Gap A, Gap B, and Gap C.
