---
title: Default Distribution RFC
description: Defines the accepted default plugin bundle, enabled-by-default set, and disable mechanisms for OQ-002
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 20
---

# Default Distribution RFC

> Status: **accepted** on 2026-08-29 by the project initiator. This document defines the accepted default plugin bundle, enabled-by-default set, and disable mechanisms for
> [OQ-002](../decisions/open-questions.md) at the design level; it closes [OQ-002](../decisions/open-questions.md). It does not describe implemented
> behavior, does not authorize shipped, stable, normative, or
> compatibility-guaranteed behavior, and does not weaken any normative security control. Experimental implementation may exist as review evidence but carries no
> compatibility promise beyond the accepted contract. Acceptance was per independent category-owner, docs-curator, and security-auditor review (CTX-0075) with P0 sign-off on 2026-08-29; see [P0 Review Sign-off](#p0-review-sign-off) and the
> [P0 review checklist](../reviews/p0-review-checklist.md). The lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## Purpose and scope

[OQ-002](../decisions/open-questions.md) asks: _which plugins, if any,
ship enabled by default, and how can users disable them?_ This RFC answers
that question at the distribution-mechanism level without inventing product
code.

In scope:

- distinction between "bundled" (staged artifact present in the
  distribution) and "enabled" (active generation with granted capabilities);
- composition of the default distribution: core binary, assets, and the
  staged first-party plugin set with version pins and integrity;
- the proposed enabled-by-default set for v1 and the criteria that gate
  any future addition to that set;
- disable and re-enable mechanisms through configuration layers, the managed
  manifest, CLI, profiles, workspace trust, and `bitty --safe`;
- interaction with the capability grant lifecycle, lifecycle generations,
  budgets, and performance budgets.

Out of scope (owned elsewhere):

- Plugin API surface, capability identifiers, grant storage, prompts, and
  the event pipeline (OQ-011/OQ-012/OQ-013, accepted in
  [Plugin Platform RFC](plugin-platform-rfc.md));
- per-plugin instruction, memory, task, queue, and global budget enforcement
  (OQ-014, [Isolation Resource RFC](isolation-resource-rfc.md));
- configuration pipeline, layer precedence, merge classes, and reload
  classification (OQ-010, [Configuration Model RFC](configuration-model-rfc.md));
- Lua runtime, standard-library subset, and module search rules (OQ-009,
  [Lua Runtime RFC](lua-runtime-rfc.md));
- package sources, lockfile, resolver, signature, and registry contracts
  (OQ-021/OQ-022, [Package Lifecycle RFC](package-lifecycle-rfc.md) and
  [Package management](../extensibility/package-management.md));
- CLI grammar, output schema, and exit codes (OQ-017, [CLI](../interfaces/cli.md));
- rich presentation, image, and structured-transport contracts (OQ-008/OQ-015/OQ-016,
  [Rich Presentation RFC](rich-presentation-rfc.md));
- instance selection, IPC framing, and Agent transport (OQ-018,
  [IPC and Agent RFC](ipc-agent-rfc.md)).

This RFC introduces no new trust boundary. Every transition into a
privileged operation stays behind the capability, configuration-trust, and
budget gates already normative in the security corpus, and it does not
weaken the recoverability requirement that a failed or malicious plugin
cannot prevent Bitty from starting.

## Normative sources this specification must not weaken

- [Product vision](../product/vision.md): small core, stable API, everything
  composable, extensions own the experience; core manages mechanisms, plugins
  manage policy; an official distribution may bundle first-party plugins but
  bundling does not change their status as plugins.
- [Architecture overview](../architecture/overview.md) and
  [Core and Plugin Boundaries](../architecture/core-boundaries.md):
  mechanism/policy split, declarative UI, generation-based lifecycle, rule
  that first-party and community plugins use the same API, capability, and
  lifecycle with no private channel.
- [Plugin system](../extensibility/plugin-system.md): extension levels 1-4,
  register-versus-claim, qualified naming, key-binding precedence, lazy
  triggers, and the governing boundary that plugins may alter presentation
  but must not alter terminal truth.
- [Package management](../extensibility/package-management.md) and
  [Package Lifecycle RFC](package-lifecycle-rfc.md): managed manifest,
  lockfile, package store, staged activation, transactional switch, rollback,
  and integrity chain.
- [Lua and XDG](../configuration/lua-and-xdg.md) and
  [Configuration Model RFC](configuration-model-rfc.md): layer stack
  (core defaults, system, distribution, profile, user, trusted local
  override, CLI), merge-class contract, attribution, reload classification,
  project-trust mechanics, and `bitty --safe` fallback.
- [Performance Budget RFC](performance-budget-rfc.md): PB-1 through PB-7
  budgets for the default configuration with no plugins enabled beyond the
  bundled minimum, and the rule that plugin cost is charged to plugin
  budgets (OQ-014) not to PB-2/PB-3.
- [Security overview](../security/overview.md): default posture
  (PTY, plugins, projects, IPC/MCP, packages, and reference repos are
  untrusted until a narrow grant), invariants 2 (third-party plugins start
  without sensitive authority), 3 (presentation never Terminal Truth), 4
  (no hot-path execution), 8 (installation runs no package code, updates
  cannot silently add capabilities), 9 (secret minimization), and 10
  (`bitty --safe`).
- [Threat model](../security/threat-model.md) and
  [Security risk register](../security/risk-register.md): T-06/T-07/T-08/T-12
  and R-006/R-007/R-009/R-015/R-016/R-022 as they touch bundled distribution
  composition, plugin escape, supply-chain integrity, and safe-mode
  recoverability.
- [Technology strategy](../project/technology-strategy.md): Rust core, Lua
  plugins, and toolchain pins as accepted direction.

Where this RFC picks concrete defaults or mechanics, it refines the
candidate material above; it does not move a requirement between owners or
relax a gate. If a mechanism here weakens a normative control, the
normative text wins and this RFC must be corrected.

## Terminology

| Term               | Accepted meaning                                                                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Distribution       | The shippable artifact users download: core binary, platform assets, and a pinned set of staged first-party plugin packages plus their checksums and manifest metadata.                                               |
| Bundled            | A plugin whose artifact is present in the distribution's staged store and resolvable without network fetch, but not necessarily active.                                                                               |
| Enabled            | A plugin that has been resolved, registered, and activated into a live generation with granted capabilities; it owns commands, handlers, UI nodes, tasks, and budget accounting.                                      |
| Disabled           | A plugin that remains declared/bundled/locked but has no active generation; its prior generation is disposed, handlers detached, and task/queue budgets reclaimed, while grant records and stored state are retained. |
| Bundled minimum    | The smallest enabled set used as the baseline for PB-1 through PB-7 measurement (core with no plugin active beyond what the distribution enables by default).                                                         |
| First-party plugin | A plugin maintained under `bitty-terminal` with the same API, manifest, capability, and lifecycle rules as any community plugin; no private channel.                                                                  |

## Accepted summary

1. Bundling and enabling are distinct operations. A plugin is bundled when
   its version-pinned artifact is staged in the distribution store; it is
   enabled only when configuration and the managed manifest select it for
   activation and its capability grants are present.
2. The v1 enabled-by-default set is **empty**: a fresh installation with
   no user configuration starts the core only. First-party plugins are
   bundled as ready-to-enable artifacts (tabs, statusline, palette, shell
   integration, project) but require an explicit enable that preserves the
   capability-consent and lightweight-budget guarantees.
3. Disabling is effective, attributable, and reversible through five
   coordinated surfaces: the typed configuration `plugins.<id>.enabled`
   setting, the managed manifest `enabled` flag, `bitty plugin disable`
   and `enable` commands, profile-scoped overrides, and `bitty --safe`
   which skips all non-core plugins unconditionally.
4. Distribution composition, pinning, and disable precedence are specified
   as declarative data with generation-disposal semantics; no distribution
   or workspace layer can silently force-enable a plugin the user has
   disabled, and no disable path leaks VM, handle, or queue state.

## Distribution composition (accepted)

### Artifact layout (candidate, not an implemented path)

```text
distribution/
  bitty(.exe)                          # core binary, PB-5 <= 25 MiB
  assets/                              # fonts, themes, shell-integration scripts
  plugins/
    store/
      bitty-terminal.tabs/1.0.0/
      bitty-terminal.statusline/1.0.0/
      bitty-terminal.palette/1.0.0/
      bitty-terminal.shell-integration/1.0.0/
      bitty-terminal.project/0.9.0/
    distribution.toml                  # pinned set, not a runtime manifest
    checksums.sha256
```

Rules:

1. The distribution ships **only** first-party plugin IDs under the
   `bitty-terminal.*` namespace in v1. No third-party ID is ever bundled.
   Adding a first-party ID to the distribution requires the criteria in the
   next section and a reviewed change to `distribution.toml`; removal is a
   compatible change.
2. Each bundled artifact is version-pinned (SemVer 2), checksum-recorded
   (SHA-256), and manifest-validated before staging, inheriting the
   integrity posture of [Package Lifecycle RFC](package-lifecycle-rfc.md)
   (lock, checksum, no install scripts). The staging step executes no
   plugin code.
3. The total compressed distribution (binary plus bundled artifacts and
   assets) is budgeted by PB-5: **<= 40 MiB**. Bundling a new plugin that
   would exceed PB-5 blocks the distribution change until the budget is
   renegotiated via an RFC revision.
4. Bundled presence alone creates **zero** runtime cost: no VM is created,
   no handler is registered, no queue is allocated, and no capability is
   granted until the plugin is explicitly enabled. This preserves the
   "no core runtime cost when unused" constraint from the product vision
   and keeps PB-2 (<= 80 MiB idle one window, no activity, bundled minimum)
   as a core-only measurement.
5. The distribution's pinned set is recorded in `distribution.toml` (candidate
   name) as data, not as an executable manifest. The file lists `{ id,
version, checksum, plugin-api = "^1.0", compat.bitty }` and is validated
   with the same bounded-parser discipline as `bitty-plugin.toml`.

### Candidate bundled set for v1 (staged, not enabled)

| Plugin ID                          | Proposed stage purpose                                                | Default               | Capability sketch (illustrative)                           |
| ---------------------------------- | --------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| `bitty-terminal.shell-integration` | OSC 7/133 semantic zones, cwd/title, fail-closed fallback when absent | bundled, **disabled** | `terminal.semantic-read` (read-only)                       |
| `bitty-terminal.tabs`              | tabline provider, tab commands, layout policy                         | bundled, disabled     | `ui.rich` or status-component slot, status `tabline` claim |
| `bitty-terminal.statusline`        | cwd, mode, git/task presentation via declarative status components    | bundled, disabled     | `terminal.semantic-read`, status-component composition     |
| `bitty-terminal.palette`           | command palette and picker UI via overlay slot                        | bundled, disabled     | `ui.overlay`                                               |
| `bitty-terminal.project`           | project discovery and session presentation                            | bundled, disabled     | `fs.read:PROJECT_GLOB` constrained                         |

This set was a **proposal** at draft time and is now the **accepted** staged set as of 2026-08-29. The owning `bitty`
crate inventory records them as the accepted bundled set without claiming shipped behavior. Every
bundled plugin passes through the identical manifest and capability model
from [Plugin Platform RFC](plugin-platform-rfc.md); there is no bundled
bypass flag and CI may not add one.

## Enabled-by-default set and promotion criteria (accepted)

### v1 enabled-by-default set: empty

Accepted v1 value: **no plugin is enabled by default** on a fresh
installation with no user configuration. The terminal starts with:

- core-owned PTY, parser, grid, selection, input, platform, and renderer;
- no plugin VM, no tabline provider, no statusline, no palette, and no
  workspace plugin active;
- the same surface that `bitty --safe` produces, making safe-mode
  behavior the default rather than a special case.

Rationale:

- Predictable lightweight budgets. PB-1 (<= 100 ms p50 cold start),
  PB-2 (<= 80 MiB idle one window), and PB-7 (<= 1% CPU idle) can be
  measured without plugin-load variance or hidden startup work.
- Least privilege by default. Invariant 2 holds trivially at first boot;
  the first capability grant is an explicit user action with the
  permission-diff UX from the platform RFC (R-016).
- Single-mechanism validation. The same enable path that activates a
  community plugin activates a bundled one, so first-party use
  continually validates the completeness of the extension boundary as
  required by the vision.

This choice does not prevent a user from enabling any subset in one
command after first boot, and it does not prevent a future RFC from
moving a plugin into an enabled-by-default set once the criteria below
are met.

### Criteria for any future enabled-by-default addition

A plugin may become enabled by default only after **all** of the
following are satisfied in a reviewed follow-up change:

1. Lightweight budget proof. With the plugin enabled, a one-window idle
   measurement remains within PB-1/PB-2/PB-7 and a representative
   8-tab/4-hour session remains within PB-3, measured on the reference
   harness once it exists. Cost is charged to the plugin generation's
   budgets (RC-1/RC-2/RC-4/RC-5 per [Isolation Resource RFC](isolation-resource-rfc.md))
   and is visible in `bitty plugin doctor`.
2. Capability minimality. The plugin requests only the families it needs
   (for example `terminal.semantic-read` and status-component slots for a
   statusline), contains no `terminal.input.all`, `terminal.raw-read`,
   `ui.protocol-register`, `process.spawn`, `network.*`, or
   `runtime.*` authority, and its manifest validates without unknown
   identifiers. No allow-all permission substitutes for the
   target/effect separation.
3. Failure isolation proof. With the plugin enabled and then fault-injected
   (looping handler, allocating, veto-spamming), `bitty --safe` still
   reaches a usable terminal and the plugin's generation is disposed
   without affecting sibling state (R-007/R-009 parity).
4. Hot-path exclusion proof. Fuzz and property tests show the plugin
   registers no parser, render, or input hot-path callback and that its
   callbacks are observation-class only.
5. Explicit disable preservation. Adding the plugin does not remove the
   user's ability to disable it persistently with one command and without
   editing distribution-owned files.
6. Independent security and docs-curator sign-off on the above evidence.

Until all six are met, the plugin remains bundled-disabled.

## Disable and re-enable mechanisms (accepted)

Five surfaces coordinate through one precedence rule. No surface can
silently force-enable a plugin the user has disabled.

### Precedence (highest wins)

```text
bitty --safe
  > explicit user disable (config or managed manifest or CLI)
  > profile/workspace disable
  > distribution default
  > core default (disable)
```

Every value carries source attribution (which file, which layer) so that
`bitty config show --source` and `bitty plugin list --verbose` can answer
"why is this plugin off?" as required by the configuration model.

### 1. Typed configuration (`init.lua` -> ConfigPlan)

The typed configuration owns a `plugins` subtree:

```lua
-- Candidate shape; schema lives in the core repository.
plugins = {
  ["bitty-terminal.tabs"] = { enabled = false },
  ["xuepoo.markdown"] = { enabled = true },
  disabled = { "bitty-terminal.statusline" } -- alternative additive list
}
```

Accepted rules:

- The schema field `plugins.<id>.enabled` is a scalar-replace merge with
  default `false` for every ID not explicitly enabled. Distribution-layer
  defaults may suggest `true` for a future enabled-by-default plugin, but
  user-layer `false` replaces it.
- Project-scoped configuration is **declarative-data-only** and may **narrow**
  the enabled set (disable) but may never enable a plugin the user-level
  configuration has disabled. Workspace enablement requires user trust and
  the path-and-hash consent from the configuration model (T-08).
- Disabling via configuration disposes the prior generation before the config
  transaction commits; a failed config evaluation retains the last good plan
  (R-009).

### 2. Managed manifest (`bitty-plugins.toml` style)

The package manager's desired-state manifest records per-plugin wanted
state independently of configuration, so CLI and GUI operate on one model:

```toml
# Candidate syntax; extends the package-management candidate.
[plugins."bitty-terminal.tabs"]
version = "^1.0"
enabled = false

[plugins."bitty-terminal.statusline"]
version = "^1.0"
enabled = false
```

Rules:

- `enabled` is a first-class field alongside `version` and `source`. Absent
  means disabled for the v1 distribution (consistent with the empty default).
- Changing `enabled` triggers the same staged activation lifecycle as any
  package change: resolve, validate graph, verify compatibility and
  integrity, require permission-diff for capability increases, commit lock
  state, then atomically switch the active package set. No package code
  runs during the switch; VM creation happens only in the host activation
  step that follows.
- The lockfile records the resolved `enabled` set, the artifact checksum,
  and the manifest hash so that `sync` reproduces exactly the same
  enable/disabled set on another machine.

### 3. CLI

Candidate verbs (consistent with the package-management candidate and the
[CLI](../interfaces/cli.md) separation of qualified `bitty x` commands):

```sh
bitty plugin list --verbose        # shows bundled, enabled, disabled, source layer, generation
bitty plugin enable  bitty-terminal.tabs
bitty plugin disable bitty-terminal.tabs
bitty plugin disable --all         # disables every non-core plugin
bitty plugin doctor                # queue/budget/capability/generation view
bitty --safe                       # transient safe session, no persistent change
```

Rules:

- `enable` and `disable` are idempotent, transactional, and auditable. They
  update the managed manifest and configuration state and report the
  previous and new `enabled` values with source attribution.
- `disable` disposes all `(PluginId, generation)` resources owned by the
  plugin — commands, event handlers, timers, tasks, UI nodes, store handles —
  before reporting success. Re-enable creates a new generation.
- `disable` always succeeds even when the plugin's VM is wedged; the host
  detaches handlers at the next dispatch boundary and observes the same
  fail-open and containment properties as the event pipeline.

### 4. Profiles and workspace overrides

- Profile composition (`extends`) may carry a `plugins` stanza; profile
  disable narrows the effective set for that profile only and never widens
  it beyond the user-level enabled set.
- Workspace-local disable (declarative-only, behind path-and-hash trust)
  narrows further for that working directory but cannot silently enable a
  user-disabled plugin.

### 5. Safe mode (`bitty --safe`)

`bitty --safe` is the unconditional, user-invocable recovery path for
invalid aliases, broken colors or fonts, protocol-induced unusability, and
hostile third-party plugins as noted in [Configuration Model RFC](configuration-model-rfc.md).

1. It starts the minimal built-in configuration with **zero** non-core
   plugins, regardless of the enabled set recorded on disk.
2. It creates no plugin VM, grants no third-party capability, and allocates
   no plugin queue, so PB-1/PB-2 remain core-only even under duress.
3. It does not mutate the persisted `enabled` set; on the next normal
   launch the prior enabled/disabled set is restored.
4. It is always available: no configuration or plugin can remove the
   `--safe` flag or alias it away.

## Lifecycle, capability, and resource effects (accepted)

- **Generation disposal.** Disabling disposes every resource owned by
  `(PluginId, generation)` before acknowledging success. A stale generation
  cannot observe or cancel its successor except through host-mediated handoff
  of persisted state, matching [Plugin Platform RFC](plugin-platform-rfc.md).
- **Capability grants.** Grants are bound to `(PluginId, manifest hash)` and
  survive disable. Re-enable re-prompts only when the manifest hash has
  changed and new capabilities are requested; otherwise the existing grant
  record is reused. Revocation (`bitty plugin revoke`) is orthogonal and
  takes effect at the next dispatch boundary.
- **Service and claim release.** Disabling releases reserved commands, event
  subscriptions, claims (`tabline`, protocol handlers), and service
  provisions atomically with generation disposal, so the resolver can admit
  a replacement provider exactly once.
- **Budget reclaim.** Disabling reclaims instruction, memory, task, timer,
  and queue budgets (RC-1, RC-2, RC-4, RC-5) and their attribution. Post-
  disable RSS after forced GC must return within 15% of the pre-enable
  baseline (PB-3 reclaim criterion). No disabled plugin holds a queue or
  timer across disable.
- **Lazy plugins.** A lazy plugin that was never activated has no VM and
  disabling it only releases its graph reservations.
- **Updates.** Bundled plugin updates ship with the distribution and are
  pinned; they do not auto-enable a disabled plugin. A capability-increasing
  bundled update that would affect an enabled plugin blocks pending explicit
  approval (R-016).

## Performance and budget alignment (accepted)

- The bundled minimum is the empty enabled set. Distribution-disabled
  plugins do not affect PB-1 through PB-7; the budgets remain core-only and
  defensible by the reference-harness methodology in
  [Performance Budget RFC](performance-budget-rfc.md).
- Any proposal to move a plugin to enabled-by-default carries the budget
  proof from the criteria above; without that proof the proposal fails the
  RFC even if other criteria pass.
- Per-plugin budgets remain owned by [Isolation Resource RFC](isolation-resource-rfc.md)
  (RC-1 10^7 instr / 50 ms / 8 ms warning, RC-2 32 MiB, RC-4 tasks 64 /
  timers 32, RC-5 three-level queues). This RFC consumes those numbers for
  disable-reclaim verification but does not retune them.

## Security alignment and traceability

| Accepted element                                                                    | Normative gate it implements                                               | Threat / Risk IDs        |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| Bundled-disabled by default; enabling requires explicit user action and grant       | Least privilege (invariant 2), no private channel, permission-diff (R-016) | T-06, R-006, R-016       |
| Every plugin through the same capability-checked manifest and grant lifecycle       | Deny-by-default, no wildcard, grant bound to manifest hash                 | T-06, T-12, R-006, R-015 |
| Distribution manifest staged without executing package code; checksum verification  | No install scripts; staged activation (invariants 7, 8)                    | T-12, R-015              |
| Five disable surfaces with safe-mode unconditional skip and user-disable precedence | Safe startup path (invariants 9, 10; R-009), containment (FS-3)            | T-07, R-007, R-009       |
| Generation disposal on disable; handler detachment at dispatch boundary             | Failure isolation, reclamation, attribution (FS-4)                         | R-007                    |
| No hot-path callbacks; observation-class only for candidate bundled plugins         | No hot-path execution (invariant 4)                                        | T-07, R-007              |
| Secret minimization and typed redaction in disable/enable diagnostics               | Secret-minimizing traces (invariant 9)                                     | R-014                    |
| Distribution composition inside PB-5 (<= 40 MiB)                                    | Lightweight budgets, verifiable distribution                               | PB-5, R-022              |

## Verification plan

Acceptance of an implemented contract later requires at minimum:

1. **Empty-default proof.** On a fresh data directory with no user config,
   `bitty plugin list --verbose` shows every bundled ID as bundled/disabled
   and no plugin VM exists; cold-start and idle measurements satisfy PB-1
   through PB-7 on the reference harness.
2. **Enable/disable matrix.** Every disable surface (config, managed manifest,
   CLI, profile, workspace, `--safe`) is exercised against every candidate
   bundled plugin, and the effective `enabled` set matches the precedence
   table with correct source attribution and deterministic conflict reporting
   rather than load-order shadowing.
3. **Generation-disposal completeness.** After disable, enumeration shows zero
   live commands, handlers, timers, tasks, UI nodes, and queue entries for
   `(PluginId, generation)`; a host-object handle leak test and a
   generation-id monotonicity test both pass.
4. **Budget reclaim.** Enable then disable each candidate bundled plugin in a
   loop; RC-1/RC-2/RC-4/RC-5 counters return to baseline and the PB-3 15%
   reclaim criterion holds after forced GC. Measurement uses the
   `bitty-lua` and `bitty-plugin-host` instrumentation evidence style from
   the isolation RFC.
5. **Capability orthogonality.** An enabled bundled plugin without a granted
   capability is denied at the host boundary; disabling retains the grant
   record, and revocation survives re-enable; a manifest change with added
   capabilities blocks activation pending permission-diff approval (R-016
   parity).
6. **Safe-mode independence.** With every bundled plugin enabled and then
   fault-injected (looping, allocating, veto-spamming), `bitty --safe`
   still reaches a usable terminal with zero third-party VMs and no
   instrumentation leak across restart (R-009 parity).
7. **Distribution integrity.** A distribution staged with a tampered checksum
   or incompatible `compat.bitty` / `plugin-api` range is rejected whole
   before any activation; no partial state is committed (FS-1).
8. **Workspace-narrowing only.** A workspace declarative config that attempts
   to enable a user-disabled bundled plugin has no effect; disable-only is
   proven across rename/move with hash invalidation per the configuration
   model.
9. **Idempotent CLI.** Repeated `disable` and `enable` cycles produce
   identical deterministic outcomes and identical audit records within one
   scheduling quantum; `disable --all` disposes every non-core generation.

Every criterion above is an `adversarial` or `integration` check accompanied
by a `manual-audit` record from a security reviewer before it may move the
linked risk toward `Mitigated`.

## Alternatives considered

| Alternative                                                              | Why rejected or deferred                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ship `tabs` plus `statusline` enabled by default                         | Gains immediate out-of-box familiarity, but adds startup-time, memory, and capability-surface variance before the budget harness exists; defers the explicit-consent moment and complicates PB-1/PB-2 baselines. Revisit only through the promotion criteria. |
| Bundle nothing and fetch on first enable                                 | Minimizes distribution size, but makes first-enable network-dependent and breaks offline reproducibility and the "staged without network fetch" expectation; retained as deferred for minimal-install variants, not the default distribution.                 |
| `bitty --safe` as a persistent toggle that rewrites config               | Would conflate transient recovery with persistent preference and risk persisting a broken state; rejected — safe mode is explicitly transient and never mutates the stored `enabled` set.                                                                     |
| Single `enabled=false` comment in `init.lua` as the only disable surface | Fragile and undiscoverable; file edits race with CLI/manifest updates and lack attribution. Rejected — disables must be reachable from config, manifest, and CLI with consistent precedence.                                                                  |
| Allow workspace/project config to enable user-disabled plugins           | Violates the narrowing-only posture for untrusted workspace content (T-08) and would let a cloned repository silently widen authority. Rejected.                                                                                                              |
| Use `bitty plugin install` to mean enable for bundled plugins            | Blurs the "which packages are present?" versus "which are active?" boundary from package management; rejected — `enable`/`disable` own activation while `add`/`remove` own desired-state presence, as in the package RFC.                                     |

## Affected contracts

Acceptance of this RFC on 2026-08-29 applies these same-change updates (no separate
task needed; a follow-up PR must keep them synchronized):

- [Product vision](../product/vision.md): the distribution note ("An official
  distribution may bundle first-party plugins") links to this RFC as the
  authoritative bundled/enabled composition and disable mechanism; the open
  question bullet for the minimal distribution bundle moves from candidate to
  accepted.
- [Plugin system](../extensibility/plugin-system.md): the candidate fragment
  for bundled capabilities and the safe-mode open point reference this RFC
  as the accepted disable, precedence, and bundled-minimum contract.
- [Package management](../extensibility/package-management.md): the candidate
  `enabled` field and `enable`/`disable` versus `add`/`remove` semantics
  become the accepted disable mechanism alongside configuration; source model
  (bundled packages) links to the staging and checksum rules.
- [Lua and XDG](../configuration/lua-and-xdg.md) and
  [Configuration Model RFC](configuration-model-rfc.md): the layer stack and
  merge-class table gain the `plugins.<id>.enabled` field and the
  narrowing-only workspace rule as the accepted disable surface.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) and
  [Security overview](../security/overview.md): the distribution/bundling
  note and the `bitty --safe` invariant gain the empty-default and five-
  surface disable mechanism as their P0 implementation path (still requiring
  evidence before closure of P0 acceptance criteria).
- [Performance Budget RFC](performance-budget-rfc.md): the "bundled minimum"
  baseline is adopted as the empty enabled set for PB-1 through PB-7.
- [CLI](../interfaces/cli.md): the runtime-control and plugin-enable
  sections become normative per this RFC's method set and precedence table.
- [Isolation Resource RFC](isolation-resource-rfc.md) and
  [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md):
  the crate-presence note remains `draft` tail until evidence lands; the
  overview's draft-tail note gains the distribution composition link.

No new repository, crate, or workflow is added by this RFC; pins for any
future distribution build belong to the implementing task and are verified
by `cargo tree --locked` alongside the existing workspace pins.

## Open points

The following items were open at proposal and are now dispositioned upon acceptance on 2026-08-29. Acceptance of this RFC closes [OQ-002](../decisions/open-questions.md) at the design level; residual items below are tracked as follow-up work with no remaining closure blocker unless review decides otherwise:

1. Exact `distribution.toml` file name and directory layout for staged
   artifacts; candidate `plugins/store/` versus content-addressed store.
2. Whether a "distribution preset" (e.g. `bitty plugin preset enable
minimal-ui`) should compose a named group of bundled plugins atomically
   or whether composition stays strictly per-plugin.
3. Whether the first-enable consent UX for a bundled plugin differs from a
   community plugin, beyond the shared distinct severity for high-risk IDs.
4. Distribution signing and provenance display in the consent UI, pending
   the supply-chain RFC (OQ-022); the consent screen currently assumes
   source verification happened upstream.
5. Whether `disabled = ["id"]` additive list versus per-ID `enabled = false`
   scalar is the canonical user-facing shape, or whether both remain.
6. Telemetry or first-run hint that a bundled plugin is available but
   disabled, without becoming a nag or a second-class grant prompt.
7. Version drift policy for bundled plugins between distribution releases
   versus user-pinned versions in the managed manifest.

These were outside this RFC's scope at draft and remain tracked as follow-up work; they are not silently chosen by implementation.

## Acceptance criteria

This RFC is accepted on 2026-08-29 and closes [OQ-002](../decisions/open-questions.md) at the design level. The following criteria were satisfied per the [open-question register](../decisions/open-questions.md) close rule:

1. Independent review by the category owner, a docs curator, and a security reviewer accepted the bundled/disabled distinction, the empty v1 enabled-by-default set, the five disable surfaces with safe-mode precedence, and the distribution pinning and budget rules.
2. Affected registers were synchronized in the same change: [open-questions.md](../decisions/open-questions.md), [decision register](../decisions/index.md), [specifications README](../specifications/README.md), and [P0 review checklist](../reviews/p0-review-checklist.md) moved OQ-002 from `Draft` to `Accepted` per the close rule; product vision, core boundaries, plugin system, package management, and configuration model candidates now reference the accepted contract.
3. No element weakens a normative P0 gate; any discovered conflict returns the conflicting clause to revision rather than downgrading the gate.
4. Draft text in this file was updated to record acceptance date and initiator, frontmatter became `accepted`, and links from [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md) and the [decision register](../decisions/index.md) reflect the accepted composition without claiming implementation.

Closes OQ-002: this RFC closes that open question at the design level; the register rows are updated per the open-question register rules. The lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## P0 Review Sign-off

> P0 review per CTX-0075 tracks acceptance of OQ-002 via this RFC. Frontmatter is `accepted` and [open-questions.md](../decisions/open-questions.md) is updated per its close rule. This section records passing sign-off and closes OQ-002.

| Role                           | Reviewer           | Verdict | Evidence / scope                                                                                                                                                                                                   | Date       |
| ------------------------------ | ------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| security-auditor               | `bitty-security`   | pass    | R-006, R-007, R-009, R-016, R-022, T-06, T-07, T-12, invariants 2, 8, 10, P0-AC-006 through P0-AC-010, PB-5 40 MiB, bundled-disabled-by-default, generation disposal, safe-mode recoverability, no private channel | 2026-08-29 |
| category-owner (product)       | `bitty-architect`  | pass    | distribution composition, artifact layout, pinning and checksums, empty enabled set, promotion criteria including lightweight budgets and capability minimality, PB-5 cap                                          | 2026-08-29 |
| category-owner (extensibility) | `bitty-experience` | pass    | five disable surfaces precedence, managed manifest `enabled` versus `add`/`remove`, generation disposal and budget reclaim RC-1/RC-2/RC-4/RC-5, workspace-narrowing only and safe-mode precedence                  | 2026-08-29 |
| docs-curator                   | `bitty-curator`    | pass    | Frontmatter `accepted`, taxonomy, links to [Product vision](../product/vision.md) and [Plugin system](../extensibility/plugin-system.md), English-only, decision-register sync                                     | 2026-08-29 |

As of 2026-08-29, the distribution, disable, and budget contracts remain design contracts per [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) and the [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md); crate presence does not imply shipped behavior.

## References

- Bitty crate evidence: `crates/bitty-config` (typed ConfigPlan and layer
  merge), `crates/bitty-plugin-host` (generation, registry, budget snapshot),
  `crates/bitty-package` (staged activation) — all accepted model crates whose
  call sites this RFC reuses without retuning.
- Distribution budgets: [Performance Budget RFC](performance-budget-rfc.md)
  PB-1 through PB-7 and PB-5 40 MiB distribution cap.
- Related RFCs: [Plugin Platform RFC](plugin-platform-rfc.md) for OQ-011/
  OQ-012/OQ-013, [Configuration Model RFC](configuration-model-rfc.md) for
  OQ-010, [Isolation Resource RFC](isolation-resource-rfc.md) for OQ-014
  budgets, [Package Lifecycle RFC](package-lifecycle-rfc.md) for OQ-021.
