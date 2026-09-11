---
title: Plugin API v1 Lua Surface RFC
description: Accepted contract resolving the Plugin API v1 Lua module functions payloads event names and L1/L2 split under OQ-011
category: specifications
audience: plugin-author
document_type: specification
status: accepted
website_publish: true
sidebar_order: 29
---

# Plugin API v1 Lua Surface RFC

## Status

**Accepted** on 2026-09-11 by the project initiator (user) through
[ADR 0009](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md), which
ratified all twelve `LUA-OQ-*` resolutions wholesale. This contract defines the
accepted Plugin API v1 Lua surface; it does not describe implemented behavior,
does not by itself authorize shipped or compatibility-guaranteed behavior
beyond the `1.x` stability policy below, and does not weaken any normative
security control.

The contract resolves the deferred "final spelling" left open by the
[Plugin Platform RFC](plugin-platform-rfc.md) for OQ-011 and the conflicting
candidate spellings recorded in the corpus:

| Candidate                                                        | Recorded in                                                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `bitty.commands.*`, `bitty.events.*`, `bitty.ui.*` namespaces    | [Plugin Platform RFC host namespaces](plugin-platform-rfc.md) (explicitly illustrative)                     |
| `bitty.api.register_panel/on_event/get_terminal_state`           | `bitty-docs` finding `FIND-0003` `ECO-SDK-01` (recorded in the shared checkout; not yet on `origin/main`)   |
| `register_panel/on_event/get_terminal_state` (R-SDK-1 gate list) | `bitty` CarryCtx note `PX-1199` (CTX-0221 first-plugin-batch plan, planning only)                           |
| `bitty.services:get(...)` colon-style methods                    | [Plugin Reuse and Provider Ecology RFC](plugin-reuse-and-providers.md) (Draft, post-1.0 provider follow-up) |

Evidence revisions inspected read-only during drafting: `bitty` `1ea2f66`
(local checkout; `bitty-plugin-host` and `bitty-lua` sources; the workspace was
behind `origin/main` at inspection time), `bitty-plugin-sdk` worktree CTX-0015
branch `ctx-0015/feat-manifest-lint` at `d2cad1f` (manifest/lint in review, not
accepted). The SDK produces no authoritative surface: per
[core boundaries](../architecture/core-boundaries.md) and the Plugin Platform
RFC, an SDK surface must derive from an accepted host contract.

### Authority placement (LUA-OQ-1)

Ratified in [ADR 0009](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md):
the accepted surface text is this `bitty-docs` contract. The `bitty` repository
owns the executable implementation and the machine-checkable parity evidence,
and may refine mechanics but may not add or rename v1 identifiers without a
`bitty-docs` revision. The SDK is generated from the accepted surface and may
not invent identifiers. [Core boundaries](../architecture/core-boundaries.md)
and the [Plugin Platform RFC](plugin-platform-rfc.md) record the same
three-way split. The accepted statements below remain in force:

1. [Lua Runtime RFC](lua-runtime-rfc.md) fixes the single host bridge in every
   VM as a versioned `bitty` module whose "function surface is owned by the
   respective API RFCs"; [ADR 0006](../decisions/adrs/ADR-0006-os-env-policy.md)
   already fixes `bitty.env.get` and `bitty.env.has` under that module.
2. The SDK consumes this contract; no divergent copy is created.

## Purpose and scope

In scope: the Lua module name, namespace layout, v1 function and field
spellings, function signatures, argument and payload schemas, the closed v1
event-name set with payload shapes, the L1/L2 extension-level split, and an
explicit exclusion list.

Out of scope; owned elsewhere and only referenced here:

- Manifest format, capability identifier grammar, grant lifecycle, and the event
  pipeline classes, batching, budgets, and drop policy
  ([Plugin Platform RFC](plugin-platform-rfc.md), accepted).
- VM construction, restricted standard library, rooted module resolution,
  diagnostics classes ([Lua Runtime RFC](lua-runtime-rfc.md), accepted), pins and
  allowlist ([ADR 0005](../decisions/adrs/ADR-0005-lua-pins-and-stdlib.md)),
  environment reads ([ADR 0006](../decisions/adrs/ADR-0006-os-env-policy.md)),
  async boundary and tasks/timers ([ADR 0007](../decisions/adrs/ADR-0007-async-gc.md)).
- Resource ceilings and enforcement numbers
  ([Isolation Resource RFC](isolation-resource-rfc.md), accepted).
- Scene content contract ([Rich Presentation RFC](rich-presentation-rfc.md),
  accepted).
- Panel identity, lifecycle, and providers
  ([Panel Runtime pre-study](panel-runtime-pre-study.md), Draft) and workspace
  layout ([Workspace Compositor](workspace-compositor.md), accepted without a
  `PanelId`).

## Normative sources this proposal must not weaken

- [Security overview](../security/overview.md): untrusted-by-default posture,
  capability families, invariants 2 (no ambient authority), 3 (presentation,
  never Terminal Truth), 4 (no hot-path execution), 8 (updates cannot silently
  add capabilities), and 10 (`bitty --safe`).
- [Threat model](../security/threat-model.md): T-06, T-07, T-10, T-12, T-13 and
  the plugin-to-host data-flow controls.
- [Core boundaries](../architecture/core-boundaries.md): mechanism/policy split,
  observation-versus-interception, declarative UI, generation ownership, and the
  two security domains.
- [Plugin system](../extensibility/plugin-system.md): extension levels 1-4,
  register-versus-claim, qualified naming, key-binding precedence, and the
  governing boundary that plugins alter presentation but never Terminal Truth.
- [Plugin Platform RFC](plugin-platform-rfc.md): accepted manifest, capability
  identifiers, v1 surface coverage, namespace rules, and event pipeline.

This RFC selects spellings for controls the sources already accept. It moves no
requirement between owners and relaxes no gate.

## Resolution

The surface adopts the accepted `bitty` module root and one spelling per
concept. Options were compared against the accepted sources and the Rust
`bitty-plugin-host` evidence (`crates/bitty-plugin-host/src/{event,registry,host,capability,manifest}.rs`),
which is the only exact, machine-checkable representation today.

| Option                                                        | Disposition     | Rationale                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module root `bitty`, namespaced functions                     | **Adopted**     | Accepted by [Lua Runtime RFC](lua-runtime-rfc.md) ("the single host bridge in every VM is a versioned `bitty` module") and already used by accepted `bitty.env.get`/`bitty.env.has` in [ADR 0006](../decisions/adrs/ADR-0006-os-env-policy.md). The Plugin Platform RFC namespace rules give each namespace an accepted contract.                                                            |
| Module root `bitty.api.*`                                     | Rejected        | Adds an unaccepted nesting level with no contract behind it; conflicts with the accepted `bitty.env.*` shape; would force one concept to have two spellings. Only source is a finding recommendation that itself cites no accepted spelling.                                                                                                                                                 |
| Flat `bitty.register_command`/`on_event`/`get_terminal_state` | Rejected        | Accepted material uses namespaced shapes (`bitty.commands.register`, `bitty.events.subscribe`, `bitty.terminal.snapshot`); flat verbs consume the global module namespace, collide with future accepted additions (`bitty.env`), and lose the per-namespace capability mapping.                                                                                                              |
| `register_panel` for a panel provider                         | Rejected for v1 | Panel identity and lifecycle are not accepted: [Workspace Compositor](workspace-compositor.md) explicitly introduces no `PanelId`, and the [Panel pre-study](panel-runtime-pre-study.md) leaves the provider contract and `panel.*` mapping open. Panel providers are post-v1.0 per the [plugin roadmap](../product/plugin-roadmap.md#post-v10-panel-ecosystem-candidates) pending that RFC. |
| Colon-style methods `bitty.services:get(...)`                 | Rejected for v1 | Accepted material uses dot calls with explicit option tables; colon methods imply Lua object/self semantics that the host-owned value-return contract does not require. Provider ecology remains Draft post-1.0.                                                                                                                                                                             |

`register_panel`/`on_event`/`get_terminal_state` reappear in this surface as
`bitty.ui.mount`, `bitty.events.subscribe`, and `bitty.terminal.snapshot`
respectively; the L2 coverage those names targeted is preserved without
pre-empting the panel contract.

## Module, loading, and versioning

1. `bitty` is a host-owned table injected into every VM (configuration, system,
   and per-plugin) at construction; it is not loaded through `require`, because
   rooted module resolution never reaches host internals.
2. The table and its sub-tables are read-only from Lua. Assignment or raw
   metatable mutation fails with a typed `runtime` diagnostic. No plugin may
   replace, wrap, or shadow `bitty`.
3. `bitty.api_version` is a SemVer 2 string identifying the host bridge line,
   initially `1.0.0`; minor versions are additive only and removing or narrowing
   a function requires a major version, matching the accepted
   `compat.plugin-api = "^1.0"` policy in the Plugin Platform RFC.
4. There is no `bitty.api` alias, no global function outside `bitty`, and no
   second spelling for any v1 concept.
5. The `bitty` root table and every v1 sub-table are always present. A
   capability-gated function whose grant is absent is present and fails closed
   with a typed denial (`runtime` class, stable code `E_CAPABILITY_DENIED`,
   bounded message, file/line/column where available) before any side effect,
   consistent with [ADR 0006](../decisions/adrs/ADR-0006-os-env-policy.md). The
   one carve-out is `bitty.env`: absent unless the manifest declares an
   `env:<KEY>` capability, as
   [LUA-OQ-2 in ADR 0009](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md#lua-oq-2-absent-versus-denied-namespaces)
   records.

### Activation entry point (LUA-OQ-12)

The entry point is a fixed `init.lua` at the plugin package root, not a
manifest-declared field. It executes synchronously at activation in the
per-plugin VM; every registration call (`bitty.commands.register`,
`bitty.events.subscribe`, `bitty.keymaps.suggest`, `bitty.ui.mount`,
`bitty.services.provide`, timer and task creation) is valid only during that
execution. After `init.lua` returns, the generation is activated and
`plugin.activated` is delivered; any later registration attempt is a
registration error. A lazy plugin runs `init.lua` in the fresh VM and then
replays the triggering command once, per the accepted lazy-load semantics.
`require` resolves only inside the package tree. Failure raises typed
`syntax`/`resolution`/`validation`/`runtime` diagnostics naming the entry file
and line, and leaves no partially activated state.

## Extension-level split

The accepted [extension levels](../extensibility/plugin-system.md) name Level 1
Control, Level 2 UI, Level 3 Presentation, and Level 4 Protocol. Plugin API v1
covers Level 1 fully, a minimal Level 2, and read-only terminal semantics; it
excludes Levels 3 and 4.

| Level               | v1 status | Surface element                                                       | Capability gate                              |
| ------------------- | --------- | --------------------------------------------------------------------- | -------------------------------------------- |
| L1 Control          | Included  | `bitty.commands.register`                                             | none (commands are core-registered behavior) |
| L1 Control          | Included  | `bitty.events.subscribe` (lifecycle and observation)                  | none; payload access stays bounded           |
| L1 Control          | Included  | `bitty.keymaps.suggest`                                               | none (suggestion only)                       |
| L1 Control          | Included  | `bitty.settings.get` / `bitty.settings.set`                           | none; plugin-owned namespace                 |
| L1 Control          | Included  | `bitty.store.get` / `bitty.store.set`                                 | none; quota-bounded                          |
| L1 Control          | Included  | `bitty.notify.show`                                                   | `platform.notify`                            |
| L1 Control          | Included  | `bitty.env.get` / `bitty.env.has` (already accepted in ADR 0006)      | `env:<KEY>` for plugins                      |
| Cross-cutting       | Included  | `bitty.services.get` (consumer side)                                  | none; provider grants stay with the callee   |
| L2 UI               | Included  | `bitty.ui.mount` / `bitty.ui.update` (declarative slot contributions) | `ui.rich`; `ui.overlay` for the overlay slot |
| L2 UI / observation | Included  | `bitty.terminal.snapshot` (`scope = "semantic"` only)                 | `terminal.semantic-read`                     |
| L3 Presentation     | Excluded  | decorations, annotations, highlighting, replacement                   | —                                            |
| L4 Protocol         | Excluded  | OSC/APC and structured-output handler registration                    | —                                            |

Interception handlers are part of L1 event subscription but deliver only the
bounded metadata below; they are not a separate level.

## Function surface (accepted spellings)

Signatures use Lua notation. `?` marks optional fields; every table is a plain,
bounded data table, never a host object handle. All registration calls are valid
only while the plugin generation is activating; after activation returns,
further registration is a registration error. Spawned resources are owned by
`(PluginId, generation)` and disposed with it.

### Commands

```lua
bitty.commands.register(def) -> handle
```

| `def` field     | Type     | Required | Rule                                                                                                                                                                                                                                                                             |
| --------------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | string   | yes      | Plugin-local command segment, `^[a-z][a-z0-9-]{0,63}$`; host qualifies to `<plugin-id>:<id>`                                                                                                                                                                                     |
| `title`         | string   | yes      | Bounded display text, host-rendered, never markup                                                                                                                                                                                                                                |
| `description`   | string   | no       | Bounded display text                                                                                                                                                                                                                                                             |
| `args_schema`   | table    | no       | Bounded JSON Schema (CLI Contract RFC model): depth at most 16, bounded string fields, flag `additionalProperties` explicit; total size at most `CMD_SCHEMA_MAX_BYTES` (default 16 KiB per schema, fixed by [ADR 0009](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md)) |
| `result_schema` | table    | no       | Bounded JSON Schema with the same limits, declaring the result shape for CLI, palette, IPC, and Agent reuse                                                                                                                                                                      |
| `run`           | function | yes      | `function(args) -> result`; `args` is a validated plain table and `result` is validated before it is returned                                                                                                                                                                    |

The qualified name must already be reserved through the manifest
(`[lazy].commands`), and duplicate qualified names across plugins are rejected
at graph construction, not shadowed. The host validates arguments before
dispatch and results before returning them, so CLI, palette, IPC, and Agent
reuse one registry. The manifest `[lazy].commands` entry accepts a table form in
addition to the string form: `{ id = "...", args_schema = {...}, result_schema = {...} }`.
When a command is declared statically and registered at activation, the two
definitions must be equivalent after canonicalization or activation fails with a
`validation` diagnostic; the static form is how lazy help and completion work
without a VM ([LUA-OQ-3](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md#lua-oq-3-command-parameter-and-result-metadata)).

### Events

```lua
bitty.events.subscribe(name, handler) -> handle
```

- `name` must be one of the closed v1 names in
  [Event names and payloads](#event-names-and-payloads) and must be declared for
  the plugin; subscribing to an undeclared type is a registration error.
- `handler` is `function(event)` where
  `event = { kind = string, sequence = integer, payload = table }`; payloads are
  immutable copies, not live core objects.
- Observation and lifecycle handlers: the return value is ignored.
- Interception handlers: return `false` to veto, anything else to approve.
  Rewriting content is not expressible.
- Coalescing, queue bounds, drop policy, batching, and failure policy are the
  accepted [Plugin Platform RFC pipeline](plugin-platform-rfc.md#event-pipeline-oq-013)
  and are not restated here.

### Key-binding suggestions

```lua
bitty.keymaps.suggest(def) -> handle
```

`def = { chord = string, command = string, when? = string }` where `command`
names a command registered by the same generation and `when` must be absent or
`"global"` in v1; any other value is a registration error naming the supported
context. The chord grammar is exactly the shipped configuration grammar from the
[Configuration Model RFC](configuration-model-rfc.md): trimmed, case-insensitive
modifiers joined with `+` (`ctrl`, `alt`, `shift`, `super`), named keys from the
shipped vocabulary (`tab` through `f35`, including the `ins`/`del`/`hm`/`end`/`pu`/`pd`
aliases), and single-character keys require a modifier. Identity for precedence
and conflict detection is `(when, normalized chord)`. Suggestions never override
user or workspace mappings; the accepted precedence
(`user > workspace > first-party/default > plugin suggestion`) applies, and
chord conflicts produce diagnostics for user resolution rather than load order
([LUA-OQ-5](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md#lua-oq-5-key-binding-suggestions)).

### Settings and storage

```lua
bitty.settings.get(key) -> value
bitty.settings.set(key, value) -> boolean
bitty.store.get(key) -> value | nil
bitty.store.set(key, value) -> boolean
```

- Settings keys are dot paths relative to `plugins.<owner>.<name>`; plugins
  cannot read or write outside their own namespace. Typed schema declaration,
  merge, and reload semantics are owned by the
  [Configuration Model RFC](configuration-model-rfc.md) (OQ-010).
- Storage is the quota-bounded key-value area scoped by plugin ID (not by
  generation) and persisted under the platform data directory:
  - Key grammar `^[a-z0-9][a-z0-9._-]{0,127}$`, at most 128 UTF-8 bytes, no
    empty dot segments.
  - Value type: JSON-compatible plain data only (boolean, finite number, UTF-8
    string, array, object), depth at most 8, at most 1024 nodes, serialized
    value at most 8 KiB (`STORE_MAX_VALUE_BYTES`); functions, metatables,
    cycles, and non-finite numbers are rejected with `E_STORE_VALUE_INVALID`
    (`validation` class). `bitty.store.set(key, nil)` deletes the key.
  - Quota: `STORE_QUOTA_BYTES` default 256 KiB persisted per plugin; overflow
    fails closed with `E_STORE_QUOTA` (`budget` class), never evicting or
    partially writing. The numbers are recorded as `RC-11` in the
    [Isolation Resource RFC](isolation-resource-rfc.md).
  - Persistence: the store survives suspension, reload, and generation
    disposal; writes from generation N are committed synchronously before N is
    disposed, so N+1 reads the same values. Data is deleted only by uninstall
    or an explicit user purge. Persisted store data is not generation state;
    generation-owned memory, handles, tasks, and timers are still reclaimed
    ([LUA-OQ-6](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md#lua-oq-6-storage-semantics)).
- Neither namespace grants filesystem authority; `fs.*` grants remain a
  separate capability path that v1 does not define a Lua entry point for.

### Notifications and environment

```lua
bitty.notify.show(payload) -> boolean
bitty.env.get(name) -> string | nil
bitty.env.has(name) -> boolean
```

`payload = { title = string, body? = string, urgency? = "low"|"normal"|"critical" }`,
gated by `platform.notify` and subject to host rate policy. The `bitty.env.*`
contract is accepted in [ADR 0006](../decisions/adrs/ADR-0006-os-env-policy.md)
and is referenced, not redefined. Per
[LUA-OQ-2](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md#lua-oq-2-absent-versus-denied-namespaces),
`bitty.env` is absent from the VM unless the manifest declares an `env:<KEY>`
capability; when declared but not granted, its functions fail closed with
`E_CAPABILITY_DENIED` and never enumerate keys. Key-level minimization is
unchanged: with a valid grant, `bitty.env.get` for a non-allowlisted key
returns `nil`, indistinguishable from an unset variable.

### UI contributions (L2)

```lua
bitty.ui.mount(slot, component) -> handle
bitty.ui.update(handle, component) -> boolean
```

- `slot` is the accepted closed set:
  `terminal | top | bottom | left | right | tabline | statusline | overlay`.
- `component` is a declarative node table shaped by the accepted
  [`SceneNode` contract](rich-presentation-rfc.md), restricted for v1 to the
  `Text`, `Row`, `Column`, and `List` nodes. Status components are ordinary
  subtrees mounted in the `statusline` slot, and popups are overlay-slot
  subtrees, not a new node kind. `Image`, `CodeBlock`, `Table`, `Rule`, and
  bordered `Block` nodes are excluded from v1.
- The handle is an opaque, generation-owned integer (`block_id`);
  `bitty.ui.update` replaces the block's scene subtree under the same
  `block_id` with an incremented version, which is exactly the accepted
  `RichBlock` replacement rule, and the composer diffs the subtree. `update`
  returns `false` for a stale or foreign handle and raises
  `E_UI_COMPONENT_INVALID` for a component that violates the scene contract
  ([LUA-OQ-7](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md#lua-oq-7-ui-update-model)).
- Rich content requires `ui.rich`; the `overlay` slot requires `ui.overlay`.
  The `overlay` slot is presentation-only, non-focusable declarative content: it
  never claims focus, never mutates a view or terminal, and never becomes a
  `PanelProvider`. If the Panel RFC redefines overlays as focusable surfaces,
  the slot remains a content source and the panel contract owns focus and
  routing ([LUA-OQ-11](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md#lua-oq-11-panel-and-overlay-boundary)).
  There are no global coordinates, shaders, pipelines, glyph injection, native
  windows, or renderer handles.
- `tabline` is an exclusive claim; status components compose. Host layout owns
  placement and decoration.

### Terminal snapshot (L2, read-only)

```lua
bitty.terminal.snapshot(opts) -> Snapshot
```

`opts = { scope = "semantic", terminal_id? = integer }` is the only v1 scope
and requires `terminal.semantic-read`. `scope = "raw"` is rejected in v1; it
would require `terminal.raw-read` and is explicitly high-risk. Without
`terminal_id` the snapshot targets the focused view's attached terminal; an
explicit id is allowed within `terminal.semantic-read` so consumers can answer
observation events for other terminals. Terminal enumeration remains excluded
in v1.

Top-level shape, aligned with the versioned
[terminal snapshot contract](terminal-state-rfc.md) and the accepted semantic
projection (visible text with attributes, cursor, modes, semantic zones):

| Field                 | Type    | Meaning                                                                       |
| --------------------- | ------- | ----------------------------------------------------------------------------- |
| `version`             | integer | Snapshot contract version, `1`                                                |
| `terminal_id`         | integer | Registry `TerminalId` of the snapshotted terminal                             |
| `runtime_id`          | integer | Registry `RuntimeId` paired with the terminal                                 |
| `generation`          | integer | Registry generation the identity tuple was allocated in                       |
| `snapshot_generation` | integer | Terminal damage generation the snapshot reflects                              |
| `width`               | integer | Grid columns in the snapshot region                                           |
| `height`              | integer | Grid rows in the snapshot region                                              |
| `rows`                | array   | `{ text = string, spans = { { start, end, attrs } } }` visible rows, top-down |
| `cursor`              | table   | `{ row, col, visible }`                                                       |
| `modes`               | table   | Mode flags, including `alternate_screen = boolean`                            |
| `title`               | string  | Bounded title text                                                            |
| `zones`               | array?  | Semantic-zone metadata derived from OSC 7/133 state                           |

Row and attribute encoding is aligned with the accepted `bitty-term-state`
`Style`/`Attributes` model and `bitty-vt` `Color`/`UnderlineStyle`:

- `rows[i].text` is the visible row only; `rows[i].spans` carries half-open
  column offsets `[start, end)` with only non-default attributes.
- `attrs.underline` is
  `"none" | "single" | "double" | "curly" | "dotted" | "dashed"`; boolean flags
  (`bold`, `faint`, `italic`, `blink`, `inverse`, `invisible`,
  `strikethrough`) are omitted when false.
- `attrs.fg` / `bg` / `underline_color` are `"default"`, integer `0..=255`
  palette index, or `"#RRGGBB"`.
- `zones[i]` is
  `{ kind = "prompt" | "input" | "command" | "output" | "unknown", range = { start_line, end_line }, metadata? = { cwd?, host?, command?, exit_code? } }`;
  zone text is not expanded outside the visible rows.

The region is the visible viewport only, top-down; no scrollback text and no
full-grid selection in v1. A snapshot whose serialized size exceeds
`SNAPSHOT_MAX_BYTES` (default 256 KiB) is rejected with `E_SNAPSHOT_TOO_LARGE`
rather than truncated. The snapshot always reflects the currently displayed
grid; while `alternate_screen` is true zones may be absent and scrollback is
never included, and exiting alternate screen restores the primary grid per
accepted terminal-state rules. Snapshots served to automation surfaces carry the
untrusted-observation-data label; there is no write path to grid, cursor, modes,
or scrollback in v1
([LUA-OQ-4](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md#lua-oq-4-terminal-snapshot-schema)).

### Services

```lua
bitty.services.get(iface, opts) -> service | nil
bitty.services.provide(iface, impl) -> handle
```

- Consumer side: `opts = { version = ">=2.0", optional? = boolean }` uses the
  accepted version-requirement grammar. The provider is selected before
  activation or resolution fails closed with `E_SERVICE_RESOLUTION`
  (`resolution` class); with `optional = true` a missing provider returns `nil`
  instead. The callee executes with its own grants, arguments are validated
  against the interface schema, and results are values rather than cross-VM
  handles.
- Provider side: `provide` is valid during activation; `impl` is a plain table
  whose members are functions. The provider declares the interface name,
  concrete version, and bounded JSON Schema (`args_schema`/`result_schema`, per
  the command limits above) in its manifest. The accepted
  `[services.provided]` entry gains a table form
  `{ version = "...", args_schema = {...}, result_schema = {...} }` alongside
  the accepted `"iface" = "1.0.0"` string form; only table-form providers are
  resolvable by schema-validating consumers.
- Provider disappearance after activation (revocation, suspension, disable)
  makes in-flight calls fail closed with `E_SERVICE_GONE` (`runtime` class); no
  stale handle remains callable.
- This freezes only the minimal v1 consumer/provider contract. Provider ecology
  (pickers, status, context providers, side-by-side versions) stays post-1.0
  under the Draft [provider-ecology RFC](plugin-reuse-and-providers.md)
  ([LUA-OQ-8](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md#lua-oq-8-service-provider-side)).

### Tasks and timers

```lua
bitty.tasks.spawn(fn) -> task_id
bitty.tasks.cancel(task_id) -> boolean
bitty.timers.create(delay_ms, callback) -> timer_id
bitty.timers.cancel(timer_id) -> boolean
```

Host-owned tasks and timers are accepted with RC-4 caps (64 tasks / 32 timers
per plugin) in [ADR 0007](../decisions/adrs/ADR-0007-async-gc.md); handles are
small generation-owned integers, not host objects. Exceeding a live cap refuses
with `E_BUDGET_TASK`/`E_BUDGET_TIMER` (`budget` class) and never queues
silently. Timer fire and task resumption deliver through the accepted event
path, so the three-level queue budgets still apply. Cancellation releases the
cap slot; task cancellation is cooperative at the next host slice (no
Lua-visible abort hook in v1); all handles from generation N are invalid after
disposal and fail closed. Timers are one-shot in v1; repeating timers are a
`1.x` minor addition. The bare `task.spawn` / `timer.create` spellings in
ADR 0007 are internal concept labels, not Lua identifiers, and ADR 0007 carries
the reconciliation note
([LUA-OQ-9](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md#lua-oq-9-tasks-and-timers)).

## Event names and payloads

The closed v1 name set is exactly the `EventKind` closed set implemented in
`bitty-plugin-host/src/event.rs`; `EventKind::parse` and `as_str` round-trip
these strings. The envelope is
`{ kind = string, sequence = integer, payload = table }`.

| Kind                         | Class        | Lua payload                                   | Notes                                                 |
| ---------------------------- | ------------ | --------------------------------------------- | ----------------------------------------------------- |
| `plugin.activated`           | Lifecycle    | `{}`                                          | Delivered to the owning plugin only                   |
| `plugin.suspended`           | Lifecycle    | `{}`                                          | Owning plugin only                                    |
| `plugin.disposed`            | Lifecycle    | `{}`                                          | Owning plugin only                                    |
| `handler.violation`          | Lifecycle    | `{}`                                          | Owning plugin only; diagnostic detail stays host-side |
| `terminal.opened`            | Observation  | `{ terminal_id, runtime_id, generation }`     | Identity tuple from the registry contract             |
| `terminal.closed`            | Observation  | `{ terminal_id, runtime_id, reason }`         | `reason` from the accepted `TerminalClosed` shape     |
| `terminal.title-changed`     | Observation  | `{ title = string, terminal_id, runtime_id }` | Bounded (`EVENT_MAX_BYTES`); identity for attribution |
| `terminal.cwd-changed`       | Observation  | `{ cwd = string, terminal_id, runtime_id }`   | Bounded; treat as sensitive-capable display data      |
| `terminal.bell`              | Observation  | `{}`                                          | Coalescable events collapse to the latest value       |
| `focus.changed`              | Observation  | `{ view_id, terminal_id? }`                   | Coalescable; identity added for attribution           |
| `selection.changed`          | Observation  | `{ view_id, terminal_id? }`                   | Coalescable; no selection text in v1                  |
| `process.exited`             | Observation  | `{ terminal_id, runtime_id, exit_code }`      | Exit status from the accepted `TerminalExited` shape  |
| `config.reloaded`            | Observation  | `{}`                                          | —                                                     |
| `intercept.command-dispatch` | Interception | `{ action, origin, preview }`                 | Bounded sanitized metadata; veto/approve only         |
| `intercept.terminal-spawn`   | Interception | `{ action, origin, preview }`                 | Bounded sanitized metadata                            |
| `intercept.paste`            | Interception | `{ action, origin, preview }`                 | Never carries paste text without `clipboard.read`     |
| `intercept.open-url`         | Interception | `{ action, origin, preview }`                 | Bounded sanitized metadata                            |

Identity fields are Lua integers (u64 within the i64 range); field names carry
the type distinction, so a single opaque `id` field is not used, matching the
accepted rule that `TerminalId`, `ViewId`, and `RuntimeId` are pairwise
incompatible. `generation` lets consumers detect stale identities; `reason` and
`exit_code` come from the accepted `TerminalClosed`/`TerminalExited` shapes
([LUA-OQ-10](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md#lua-oq-10-observation-identity)).

Observation handlers receive a bounded copy; they never receive live core
objects. `bitty-plugin-host::HostObservation` also has host-side
`ModeChanged` and `Damage` side-queue variants with no `EventKind` counterpart;
they stay host-internal and are not expressible in the v1 Lua vocabulary, which
is consistent with the accepted no-hot-path-events rule.

## Not in Plugin API v1

1. **Terminal Truth writes.** No grid, cursor, mode, scrollback, or reply
   mutation; no raw output transform.
2. **Raw and input authority.** No `terminal.raw-read`, `terminal.input.self`,
   `terminal.input.all`, `terminal.manage`, or input injection surface.
3. **Hot-path events.** No byte-received, cell-changed, damage, glyph-rendered,
   or per-frame event names.
4. **Level 3 presentation.** No decorations, annotations, semantic
   highlighting, or presentation replacement.
5. **Level 4 protocol registration.** No OSC/APC or structured-output handler
   registration, and no use of `ui.protocol-register`.
6. **Panel providers.** No `register_panel`, `PanelId`, `PanelProvider`, or
   panel lifecycle; panel providers wait for the Panel RFC. `bitty.ui.mount`
   contributes declarative slot content only.
7. **Browser, Agent, MCP, and AI surfaces.** Capability families exist in the
   host crate evidence, but v1 defines no Lua entry points for them.
8. **Interception rewriting.** Veto or approve only.
9. **Ambient privileged services.** No filesystem, process, network, clipboard,
   runtime, or debug call surface in this RFC; capability identifiers exist,
   but their Lua entry points are separate host-service contracts.
10. **Aliases.** No `bitty.api` alias, no flat-verb aliases, and no colon-method
    variants.
11. **Rust internals.** No `bitty.ipc.*`, `bitty.renderer.*`, grid-object
    access, or cross-plugin `require`.

## Compatibility policy

- The module root `bitty`, the namespace names, and the v1 event-name set are
  stable within `1.x`; additions are minor versions.
- Removing or narrowing a function, changing an argument schema incompatibly,
  or removing an event name requires a major version and migration notes.
- The manifest `compat.plugin-api` range is the compatibility gate; the runtime
  `bitty.api_version` and the manifest range must agree at activation.
- Unknown future fields in payload tables are ignored, not errors; unknown
  event names are registration errors, not implicit subscriptions.

## Security alignment and traceability

| Contract element                                              | Gate it preserves                                                   | Threat/risk IDs          |
| ------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------ |
| Read-only `bitty` table; typed denials                        | No ambient authority; capability checks cannot be bypassed from Lua | T-06, R-006              |
| Capability-gated `ui.*`, `terminal.snapshot`, `notify`, env   | Deny-by-default capability families; presentation-not-truth         | T-06, T-13, R-006, R-008 |
| No `raw` snapshot scope; no output transform                  | Terminal Truth core-owned; raw read stays high-risk                 | T-13, R-008              |
| Closed event set; no hot-path names                           | No plugin code on parser/render/input hot paths                     | T-07, R-007              |
| Bounded immutable payloads; bounded previews                  | Untrusted-input treatment; no clipboard text without consent        | T-04, T-10, R-004, R-013 |
| Generation-owned handles; registration confined to activation | Fail-closed reload/disposal; no cross-generation state bridge       | R-007, R-009             |
| Declarative UI primitives only                                | Renderer stays replaceable; no GPU/native handles in Lua            | T-13, R-021              |

## Verification plan

Ratification was recorded on 2026-09-11 by the project initiator (user) through
[ADR 0009](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md). The
obligations below remain the acceptance gates for the implementing repositories
and are not satisfied by this documentation change alone:

1. **Host parity:** every v1 function maps to an existing or explicitly
   scheduled `bitty-plugin-host` operation, and every event name round-trips
   through `EventKind::parse`/`as_str` in the implementation repository.
2. **Manifest agreement:** undeclared event subscriptions and unreserved
   command names are rejected; duplicate qualified names are rejected at graph
   construction.
3. **Negative capability tests:** absent grants produce typed denials, raw
   snapshot scope is rejected, and panel/provider registration is absent.
4. **SDK derivation:** R-SDK-1 `bitty.d.lua` and R-SDK-2 lint are generated from
   this surface after acceptance and may not invent identifiers; template
   R-TPL-1 uses only L1/L2 elements.
5. **Independent review:** category owner, docs curator, and a security reviewer
   accept the surface, the exclusions, and every high-risk boundary.
6. **Documentation synchronization:** the
   [Plugin Platform RFC](plugin-platform-rfc.md) host-namespace section,
   [core boundaries](../architecture/core-boundaries.md) authority statement,
   the [specifications index](README.md), the
   [decision register](../decisions/index.md), the
   [ADR index](../decisions/adrs/README.md),
   [ADR 0006](../decisions/adrs/ADR-0006-os-env-policy.md),
   [ADR 0007](../decisions/adrs/ADR-0007-async-gc.md), the
   [Isolation Resource RFC](isolation-resource-rfc.md), and the CarryCtx task
   record were updated in the same ratification change; no divergent copy is
   created.

## Resolved questions (ADR 0009)

All twelve questions were ratified wholesale on 2026-09-11. The decision,
rationale, and rejected alternatives for each row are recorded in
[ADR 0009](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md); the
dispositions are:

| OQ        | Disposition                                                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LUA-OQ-1  | Contract authority in `bitty-docs`; `bitty` owns implementation/parity; SDK generated; core-boundaries and plugin-platform authority wording amended.           |
| LUA-OQ-2  | `bitty` shape always present; ungranted calls fail closed with typed `E_CAPABILITY_DENIED`; `bitty.env` absent unless declared (ADR 0006 carve-out).            |
| LUA-OQ-3  | Bounded JSON Schema `args_schema`/`result_schema`; runtime-authoritative plus optional static manifest table form for lazy help.                                |
| LUA-OQ-4  | Semantic snapshot of the visible viewport with registry identity tuple, accepted `Style`/`Color` encoding, semantic zones, and alt-screen flag.                 |
| LUA-OQ-5  | `bitty.keymaps.suggest` reuses the shipped config chord grammar and `(when, chord)` identity; `when` is `"global"` in v1.                                       |
| LUA-OQ-6  | JSON-compatible bounded values; 256 KiB/plugin and 8 KiB/value defaults; store persists across generations; Isolation RFC `RC-11`.                              |
| LUA-OQ-7  | `bitty.ui.mount` + `bitty.ui.update` with stable `block_id` versioning; v1 nodes `Text`/`Row`/`Column`/`List` only.                                             |
| LUA-OQ-8  | `bitty.services.provide`; provider manifest declares bounded interface schema; missing provider fails before activation (`E_SERVICE_RESOLUTION`, optional nil). |
| LUA-OQ-9  | `bitty.tasks.spawn`/`bitty.tasks.cancel`, `bitty.timers.create`/`bitty.timers.cancel`; integer handles; RC-4 caps; ADR 0007 reconciliation.                     |
| LUA-OQ-10 | Bounded `terminal_id`/`runtime_id`/`generation`/`view_id`/`exit_code`/`reason` identity fields derived from the accepted registry contract.                     |
| LUA-OQ-11 | The `overlay` slot stays non-focusable presentation content; Panel RFC compatibility note recorded.                                                             |
| LUA-OQ-12 | Fixed `init.lua` at the package root, executed at activation; registration only during that window; lazy replay per accepted semantics.                         |

## References

- [ADR 0009](../decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md) — accepted
  resolutions for LUA-OQ-1 through LUA-OQ-12, ratified 2026-09-11.
- [Plugin Platform RFC](plugin-platform-rfc.md) — accepted manifest,
  capabilities, namespace rules, event pipeline.
- [Lua Runtime RFC](lua-runtime-rfc.md) — accepted `bitty` host bridge, sandbox,
  module resolution, diagnostics.
- [Core boundaries](../architecture/core-boundaries.md) — ownership and
  authority statement.
- [Plugin system](../extensibility/plugin-system.md) — extension levels,
  register-versus-claim, key-binding precedence.
- [Rich Presentation RFC](rich-presentation-rfc.md) — accepted `SceneNode` and
  `RichBlock` contracts.
- [Isolation Resource RFC](isolation-resource-rfc.md) — RC budgets and queue
  ceilings.
- [Workspace Compositor](workspace-compositor.md) and
  [Panel Runtime pre-study](panel-runtime-pre-study.md) — panel identity and
  provider deferral.
- [ADR 0005](../decisions/adrs/ADR-0005-lua-pins-and-stdlib.md),
  [ADR 0006](../decisions/adrs/ADR-0006-os-env-policy.md),
  [ADR 0007](../decisions/adrs/ADR-0007-async-gc.md) — accepted runtime,
  environment, and async contracts.
- `FIND-0003` `ECO-SDK-01` (bitty-docs finding recorded in the shared
  checkout; not yet committed to `origin/main` at draft time) — candidate
  spelling and SDK readiness gap.
- `bitty` `1ea2f66` — `crates/bitty-plugin-host/src/event.rs` (closed
  `EventKind`/`EventPayload`), `registry.rs`, `host.rs`, `capability.rs`,
  `manifest.rs`; `crates/bitty-lua/src/lib.rs` (VM budgets, no host bridge).
- `bitty-plugin-sdk` CTX-0015 `d2cad1f` — manifest/lint work in review, evidence
  only.
