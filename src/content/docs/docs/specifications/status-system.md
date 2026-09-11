---
title: Status System Specification
description: Draft Waybar-inspired composable StatusBar, Module Registry with left/center/right slots, Platform-owned SystemMetricsService, and Provider status.component composition
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: true
sidebar_order: 18
---

# Status System Specification

> Status: **draft** — Waybar module philosophy import for Bitty. This document
> is a draft contract for the StatusBar composable modules, the Status Module
> Registry with `left`/`center`/`right` slots, the Platform Core-owned
> `SystemMetricsService` for `cpu`/`memory`/`network`, and Provider
> `status.component` composition. It does not describe implemented behavior,
> does not authorize shipped, stable, or compatibility-guaranteed behavior, and
> does not weaken any normative security control. Experimental implementation
> may exist as review evidence but carries no compatibility promise beyond this
> draft. The lifecycle is `Draft -> experimental review evidence -> Accepted -> normative`.

## Purpose and scope

This specification imports the Waybar module philosophy into Bitty and defines
the draft contracts for:

- **StatusBar composable modules** — the complete module set for v1:
  `workspace`, `cwd`, `git`, `cpu`, `memory`, `network`, `battery`, and
  `clock`, plus the extension point for future Provider-contributed modules;
- **Status Module Registry with slots** — the declarative registry that binds
  module identifiers to ordered `left`/`center`/`right` slots, mirroring
  Waybar `modules-left`/`modules-center`/`modules-right`;
- **SystemMetricsService by Platform Core** — the single privileged sampler
  for `cpu`/`memory`/`network` metrics, owned by Platform Core and never by
  Lua direct `/proc` or platform-specific file reads;
- **Provider `status.component` composition** — the plugin/provider surface
  that contributes status modules as `Provider:status.component` values
  composed by the registry without breaking Terminal Truth or presentation
  ownership.

In scope: module identity, lifecycle, render contract, configuration shape,
slot layout, ordering, overflow, and failure semantics; the
`SystemMetricsService` sampling model, cadence, caching, and error handling;
the Provider composition boundary, capability gating, and isolation; the Waybar
import mapping and its Bitty adaptations; and verification gates.

Out of scope (owned elsewhere):

- VT parser, grid, cursor, mode, and damage invariants (OQ-007,
  [Terminal State RFC](terminal-state-rfc.md));
- image, rich-block, scene, zone, and structured transport contracts (OQ-008/
  OQ-015/OQ-016, [Rich Presentation RFC](rich-presentation-rfc.md));
- Plugin API v1, capability families, manifest, and event pipeline classes
  (OQ-011/OQ-012/OQ-013, [Plugin Platform RFC](plugin-platform-rfc.md));
- per-plugin budgets, queue ceilings, and adversarial isolation tests (OQ-014,
  [Isolation Resource RFC](isolation-resource-rfc.md));
- Lua runtime, standard-library subset, and module search rules (OQ-009,
  [Lua Runtime RFC](lua-runtime-rfc.md)) and configuration layering (OQ-010,
  [Configuration Model RFC](configuration-model-rfc.md));
- CLI grammar and exit codes (OQ-017) and IPC wire format (OQ-018).

## Normative sources this specification must not weaken

- [Security Overview](../security/overview.md): untrusted-by-default posture,
  invariants 3 (presentation never Terminal Truth), 4 (no hot-path execution),
  7 (bounded inputs), and the P0 resource and capability rows.
- [Threat Model](../security/threat-model.md): untrusted PTY/plugin/MCP
  content, presentation-only plugin influence, resource exhaustion (T-01),
  and terminal-to-desktop capability gates (T-13).
- [Core and Plugin Boundaries](../architecture/core-boundaries.md):
  mechanism/policy split, Terminal Truth ownership, declarative UI, and the
  two security domains (`TerminalSecurityPolicy` versus `PluginCapabilities`).
- [Architecture Overview](../architecture/overview.md): one-way DAG
  dependencies, renderer snapshot isolation, and the headless prerequisite.

Where this draft selects a threshold or mechanism, it refines those sources; it
does not move a requirement between owners and does not create a bypass.

## Terminology

| Term                        | Meaning                                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StatusBar`                 | Core-owned horizontal bar that composes ordered status modules into `left`/`center`/`right` slots and renders them as presentation, never as Terminal Truth.                                      |
| `Status Module`             | Declarative unit that produces a bounded text/icon segment for the bar at a defined cadence (for example `workspace`, `cpu`, `clock`).                                                            |
| `Status Module Registry`    | Deterministic registry that maps module identifiers to slot assignments, ordering, enabled state, and per-module configuration, mirroring Waybar `modules-left`/`modules-center`/`modules-right`. |
| `SystemMetricsService`      | Platform Core-owned service that samples `cpu`/`memory`/`network` metrics through OS APIs with rate limiting and caching; the only v1 source for those three modules.                             |
| `Provider:status.component` | Plugin/Provider contribution point that supplies a status module component as a declarative value composed by the registry; providers never mutate bar state directly.                            |

## Waybar module philosophy import

This specification adopts Waybar as the explicit design precedent and maps it
to Bitty without copying Waybar implementation details:

| Waybar concept                                             | Bitty import                                                                       | Adaptation                                                                                                                                                                      |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules-left` / `modules-center` / `modules-right` arrays | `Status Module Registry` slots `left`/`center`/`right` as ordered identifier lists | Identifiers are registry keys, not free-form strings; ordering within a slot is the render order; cross-slot ordering is per slot.                                              |
| Per-module `format`, `interval`, `on-click`, `tooltip`     | Per-module typed configuration block keyed by module identifier                    | Schema-validated via `ConfigPlan`; no executable code in format strings; actions route through the command registry.                                                            |
| Composable, independent modules                            | `StatusBar` composes modules as pure presentation segments                         | Modules cannot read or mutate Terminal State, grid, or IPC policy; they read only their declared inputs (workspace state, cwd, git snapshot, metrics snapshot, battery, clock). |
| User-controlled enable/disable and slot moves              | Registry `enabled` and slot reassignment via configuration                         | Disabled modules are not instantiated and incur no sampling cost; unknown identifiers fail validation.                                                                          |
| Bar-level `height`, `position`, `layer`                    | StatusBar placement contract (bottom-anchored, presentation layer)                 | Bitty fixes placement to one bar for v1; layer/position are not user-configurable beyond enabled/ordering.                                                                      |

Rules of the import:

1. Waybar is the named philosophy source; Bitty does not embed Waybar code or
   configuration files and does not support Waybar configuration syntax.
2. Every Waybar-inspired behavior is re-expressed as a typed, validated
   registry entry; load-order or file-concatenation semantics are never a
   fallback.
3. Presentation ownership stays with Core: modules contribute declarative
   segments, the bar composes and renders them.

## Architectural placement

```text
Platform Core -> SystemMetricsService --+--> Status Module Registry --> StatusBar --> Scene snapshot --> Renderer
                                        |         ^                           |
Workspace / CWD / Git snapshot ---------+         |                           |
Battery / Clock (OS time) ---------------+         |                           |
Provider:status.component (declarative) ----------+                           |
                                                                  (damage + snapshot, never grid mutation)
```

Rules:

1. `SystemMetricsService` is the sole sampler for `cpu`, `memory`, and
   `network`. Lua code, including Provider modules, must not read `/proc`,
   `/sys`, or platform-specific metric files directly; such reads are outside
   the allowed standard-library subset and fail validation or capability checks.
2. `StatusBar` and the Registry are Core-owned; Providers contribute only
   through `Provider:status.component` declarative values validated against a
   bounded schema.
3. No status module runs on the PTY, parse, or render hot paths; sampling and
   composition occur on the presentation cold path with explicit cadence caps.

## StatusBar composable modules

### Module set for v1

| Module      | Input source                                       | Cadence                                             | Failure posture                                                         |
| ----------- | -------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| `workspace` | Window/workspace model (layout/view identifiers)   | Event-driven (workspace change)                     | Shows `—` on unknown, never blocks bar                                  |
| `cwd`       | Active terminal cwd via OSC 7 / shell integration  | Event-driven (cwd change)                           | Truncates to bounded display length; elides middle on overflow          |
| `git`       | Git snapshot for cwd (branch, dirty, ahead/behind) | Debounced poll ≤ 1 Hz, capped by repository watcher | Stale snapshot reused; errors render as branch-only without dirty state |
| `cpu`       | `SystemMetricsService`                             | Sample interval ≥ 1000 ms (default 2000 ms)         | Last sample held; error renders `cpu: —`                                |
| `memory`    | `SystemMetricsService`                             | Sample interval ≥ 1000 ms (default 2000 ms)         | Last sample held; error renders `mem: —`                                |
| `network`   | `SystemMetricsService`                             | Sample interval ≥ 1000 ms (default 2000 ms)         | Last sample held; error renders `net: —`                                |
| `battery`   | Platform Core battery API                          | Event + poll ≥ 30 s                                 | Hidden when no battery; `—` on permission denial                        |
| `clock`     | OS time, locale-aware formatting                   | Tick aligned to next second/minute per format       | Never fails; falls back to ISO fallback on format error                 |

All modules satisfy:

1. **Bounded output**: rendered segment length, tooltip length, and icon set
   are capped; truncation is explicit and never panics.
2. **No Terminal Truth mutation**: modules never write grid, cursor, modes,
   scrollback, or replies; they read only their declared snapshot.
3. **Deterministic ordering**: within a slot, render order equals registry
   declaration order; cross-slot layout is `left` then `center` then `right`.

### Module contracts (illustrative shapes)

```rust
// Illustrative shapes only; not an implemented API.
enum StatusModuleId {
    Workspace, Cwd, Git, Cpu, Memory, Network, Battery, Clock,
    Provider(QualifiedName), // owner.name:component
}

struct ModuleSegment {
    id: StatusModuleId,
    text: BoundedString<64>,
    icon: Option<BoundedString<16>>,
    tooltip: Option<BoundedString<128>>,
    priority: u8, // overflow tie-breaker
}

trait StatusModule {
    fn id(&self) -> StatusModuleId;
    fn interval_ms(&self) -> Option<u32>; // None = event-driven
    fn render(&self, snapshot: &ModuleSnapshot) -> ModuleSegment;
}
```

`ModuleSnapshot` is a read-only view containing only the fields the module
declares. Providers receive the same bounded snapshot type; there is no
ambient `os` or `io` access inside `render`.

## Status Module Registry and slots

### Registry model

The Registry is the single source of truth for bar composition:

```text
ConfigPlan -> validation -> Registry { left: Vec<ModuleId>, center: Vec<ModuleId>, right: Vec<ModuleId>, modules: Map<ModuleId, ModuleConfig> }
```

Properties:

1. **Deterministic Waybar mapping**: configuration declares
   `status.modules.left`, `status.modules.center`, and
   `status.modules.right` as ordered arrays of module identifiers, directly
   mirroring Waybar `modules-left`/`modules-center`/`modules-right`. The
   runtime does not reorder within a slot.
2. **Closed identifier set for v1**: the eight built-in identifiers above
   plus `Provider:status.component` qualified names Matching
   `owner.name:component` where `owner.name` is a valid Plugin ID; unknown
   bare identifiers fail validation with a diagnostic pointing at the source
   location.
3. **Per-module configuration**: each identifier maps to one typed
   `ModuleConfig` block (for example `clock.format`, `cpu.format`,
   `git.show_dirty`). Undeclared fields fail validation; no stringly-typed
   executable format expressions are evaluated.
4. **Enabled semantics**: omitting an identifier from all three slot arrays
   disables it; listing it in more than one slot is a validation error
   (unique membership). Empty slot arrays are valid and collapse the slot.
5. **Ordering and overflow**: slots render left-to-right in the order
   declared; when bar width is insufficient, lower-priority modules truncate
   first, then hide, with `clock` and `workspace` defaulting to highest
   priority. Overflow never pushes content outside the bar bounds.

### Example configuration shape (illustrative)

```lua
-- Illustrative only; authoritative schema lives with ConfigPlan.
return {
  status = {
    modules = {
      left = { "workspace", "cwd", "git" },
      center = { "clock" },
      right = { "cpu", "memory", "network", "battery" },
    },
    modules_config = {
      clock = { format = "%H:%M", tooltip = true },
      cpu = { format = "{usage}%", interval_ms = 2000 },
      git = { show_dirty = true, show_ahead_behind = false },
    },
  },
}
```

Validation obligations: the schema rejects non-array slot values, duplicate
identifiers across slots, intervals below the per-module floor, and format
strings exceeding bounded length or containing disallowed directives.

## SystemMetricsService by Platform Core

### Ownership and non-goals

`SystemMetricsService` is owned by Platform Core (`bitty-platform` boundary)
and is the only v1 mechanism that produces `cpu`, `memory`, and `network`
values for status modules.

Non-goals and prohibitions:

1. Lua code, including Provider status modules, must not read `/proc`,
   `/sys/class`, `/proc/net`, or equivalent platform files directly. Such
   access is outside the Lua standard-library allowlist and the file-access
   capability family; attempts are denied at the capability check and never
   reach the filesystem.
2. No per-module ad-hoc sampling: `cpu`, `memory`, and `network` modules
   share one service instance; adding a second sampler is a schema and
   architecture violation, not a configuration option.
3. The service never exposes raw file descriptors, shell commands, or
   ambient process handles to Lua.

### Sampling model

| Metric    | Source abstraction                  | Sampling                                                     | Caching                                                       |
| --------- | ----------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| `cpu`     | OS CPU usage API (platform adapter) | Periodic, ≥ 1000 ms, default 2000 ms                         | Last sample cached; concurrent callers share the cached value |
| `memory`  | OS memory usage API                 | Periodic, ≥ 1000 ms, default 2000 ms                         | Same                                                          |
| `network` | OS network counters API             | Periodic, ≥ 1000 ms, default 2000 ms, delta computed in Rust | Same; unavailable interfaces report `—` without error spam    |

Guarantees:

1. **Rate limiting**: the service enforces the per-metric floor regardless of
   how many modules or Providers request the metric; bursty configuration
   cannot drive tighter polling.
2. **Bounded cost**: sampling is O(1) per tick, off the hot path, with no
   per-byte PTY cost; failures do not allocate unbounded retry state.
3. **Error isolation**: a failure in one metric does not poison the others;
   each metric has an independent `Ok(cached) | Err(held)` state and renders
   as `—` for that segment only.
4. **Testability**: the platform adapter is injectable for headless tests;
   host tests assert that Lua `/proc` reads are denied while the service
   remains the sole success path.

## Provider status.component composition

### Composition contract

`Provider:status.component` is the extension point for Provider-contributed
status modules, composed by the Registry as values, not as code hooks:

1. A provider declares a `status.component` contribution in its manifest and
   supplies a declarative component descriptor validated against the
   `StatusComponent` schema (identifier, display name, interval hint,
   bounded format, and tooltip). The descriptor never carries executable Lua
   inside the format — presentation logic lives in the provider's normal
   event handling, which produces a new descriptor value on change.
2. The Registry treats provider modules identically to built-ins for slot
   assignment, ordering, and overflow, except that their identifiers are
   qualified (`owner.name:component`) and their lifecycle follows the
   provider lifecycle (unload removes the segment without bar teardown).
3. Capability gating: a provider needs no extra capability to contribute a
   status component that renders from its own state; if the component needs
   privileged data (for example network-adjacent enrichment), the provider
   must hold the relevant capability and still reads metrics only through
   `SystemMetricsService`, never via direct file or network access.

### Lifecycle and failure semantics

1. **Generation-based lifecycle**: provider components track the provider
   generation; reload or unload swaps the segment atomically at the next
   composition tick without tearing the bar.
2. **Validation**: unknown qualified identifiers, duplicate component names
   within a provider, or schema violations fail at plan validation with a
   diagnostic that names the provider and component.
3. **Isolation**: a panicking or budget-exceeded provider cannot crash the
   bar; its segment renders as `—` or is hidden per priority, and the
   isolation budgets in the [Isolation Resource RFC](isolation-resource-rfc.md)
   remain the enforcement mechanism.
4. **No direct mutation**: providers never receive a mutable `StatusBar`
   handle; they emit new declarative values and the bar recomposes.

### Illustrative provider shape

```lua
-- Illustrative provider contribution; not an implemented API.
return {
  id = "xuepoo.example",
  status_components = {
    {
      name = "build",
      format = "build:{state}",
      interval_ms = 5000,
      tooltip = "Current build state",
    },
  },
}
```

The host validates the descriptor, registers `xuepoo.example:build` as a
registry identifier, and allows slot placement like
`right = { "cpu", "xuepoo.example:build", "clock" }`.

## Configuration and lifecycle

1. Status configuration lives under `status.modules` and
   `status.modules_config` in `ConfigPlan`; it participates in the same
   layer merge, conflict reporting, and source attribution as other
   configuration, per the [Configuration Model RFC](configuration-model-rfc.md).
2. Reload classification: slot reassignment and per-module format changes are
   live-reconcilable; adding a previously unknown Provider component is
   restart-allowed but not rejected, with diagnostics pointing at the
   provider lifecycle.
3. `bitty --safe` starts with the minimal built-in bar (`workspace` +
   `clock` only) regardless of user configuration, matching the safe-mode
   posture in the configuration model.

## Resource limits and security review

1. **Bounded bar cost**: total bar segment count (built-ins plus provider
   components) is capped; exceeding the cap is a validation error. Per-module
   text/tooltip/icon lengths are bounded as above; no module may allocate
   unbounded strings or unbounded icon sets.
2. **Sampling budget**: `SystemMetricsService` enforces the interval floors;
   configuration cannot request sub-second polling for `cpu`/`memory`/`network`.
3. **P0 preservation**: this draft creates no ambient file, network, or
   process capability for Lua; `/proc` and equivalent reads remain denied, and
   `SystemMetricsService` is the only metric path. Presentation remains
   isolated from Terminal Truth; no status module observes or intercepts
   terminal input or mutates grid state.
4. **No hot-path execution**: status composition never runs inside the
   VT parser or damage-to-snapshot path; budget overruns in a provider
   component are contained by the isolation ceilings.

## Verification

1. **Metadata and link gates**: `just check` must pass with zero
   markdownlint, link, metadata, language, agents, and hygiene issues for
   this document and its index entry.
2. **Negative tests** (draft acceptance gates):
   - Lua direct `/proc` or `/sys` read for `cpu`/`memory`/`network`
     is denied; only `SystemMetricsService` supplies those metrics.
   - Unknown bare module identifiers and duplicate slot membership fail
     `ConfigPlan` validation with source-attributed diagnostics.
   - Provider `status.component` with an invalid qualified name or schema
     violation is rejected; a budget-exceeded provider renders `—` without
     crashing the bar.
3. **Headless composition tests**: registry slot ordering, overflow priority,
   and empty-slot collapse are asserted without a window or GPU.
4. **Security review**: security-reviewer sign-off that no new ambient
   authority, unbounded parsing, or Terminal Truth mutation is introduced.

## Open items remaining under this draft

- Exact `StatusComponent` schema fields and their bounded lengths beyond the
  illustrative set above.
- Final per-module default intervals and overflow priorities after UX review.
- Whether `network` reports per-interface or aggregate in v1 and its display
  format for multiple interfaces.
- Provider component capability mapping for enriched metrics beyond the
  three privileged metrics.
- Concrete headless test harness placement for registry and
  `SystemMetricsService` adapter injection.

This draft does not close an open question on its own; it will track to the
owning status-system question once that question is recorded in the
[open-question register](../decisions/open-questions.md) or close directly as
a standalone specification per the [documentation workflow](../development/documentation-workflow.md).

## References

- Waybar: highly customizable Wayland bar with composable modules and
  `modules-left`/`modules-center`/`modules-right` slot composition.
- [Configuration Model RFC](configuration-model-rfc.md)
- [Plugin Platform RFC](plugin-platform-rfc.md)
- [Isolation Resource RFC](isolation-resource-rfc.md)
- [Lua Runtime RFC](lua-runtime-rfc.md)
