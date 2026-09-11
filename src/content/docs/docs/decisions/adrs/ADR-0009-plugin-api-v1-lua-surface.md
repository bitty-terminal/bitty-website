---
title: ADR 0009 - Plugin API v1 Lua Surface Acceptance Resolution
description: Accepted decision resolving LUA-OQ-1 through LUA-OQ-12 for the Plugin API v1 Lua Surface RFC
category: decisions
audience: plugin-author
document_type: specification
status: accepted
website_publish: true
sidebar_order: 39
---

# ADR 0009 - Plugin API v1 Lua Surface Acceptance Resolution

## Status

**Accepted** on 2026-09-11 by the project initiator (user) as a wholesale
ratification of all twelve resolutions (LUA-OQ-1 through LUA-OQ-12) exactly as
proposed. The
[Plugin API v1 Lua Surface RFC](../../specifications/plugin-api-v1-lua-surface-rfc.md)
now carries frontmatter `status: accepted` and records the resolved
dispositions; the synchronized documents listed under
[Acceptance effects](#acceptance-effects) were updated in the same change. This
document selects the resolved behavior and authorizes the SDK/template and
host-bridge workstreams to derive from it, but it authorizes no implementation
by itself and does not weaken any normative security control.

- Deciders: project initiator (user), coordinated by the commander; CarryCtx
  `bitty-docs` task CTX-0144 (follow-up to CTX-0143, RFC draft merged `05ccdd9`).
- Prepared by: `ctx-0144-proposal` (scoped design subagent), session
  `01M26MCV`; Git worktree `.worktrees/ctx-0144-docs-lua-surface-decision`,
  branch `ctx-0144/docs-lua-surface-decision`.
- Related: PX-1199 / `bitty` CTX-0221 (SDK/template gates R-SDK-1..3 and
  R-TPL-1); [ADR 0005](ADR-0005-lua-pins-and-stdlib.md),
  [ADR 0006](ADR-0006-os-env-policy.md), [ADR 0007](ADR-0007-async-gc.md);
  accepted [Plugin Platform RFC](../../specifications/plugin-platform-rfc.md),
  [Lua Runtime RFC](../../specifications/lua-runtime-rfc.md),
  [CLI Contract RFC](../../specifications/cli-contract-rfc.md),
  [TerminalRegistry and View Lifecycle Contract](../../specifications/terminal-registry-view-lifecycle-rfc.md),
  [Rich Presentation RFC](../../specifications/rich-presentation-rfc.md),
  [Isolation Resource RFC](../../specifications/isolation-resource-rfc.md).
- Read-only evidence revisions: `bitty` `1ea2f66`
  (`crates/bitty-plugin-host/src/{event,registry,host,capability,manifest}.rs`,
  `crates/bitty-lua/src/lib.rs`, `crates/bitty-term-state/src/cell.rs`,
  `crates/bitty-vt/src/action.rs`); `bitty-plugin-sdk` CTX-0015 worktree
  `d2cad1f` + `07e2122`; accepted `bitty-docs` corpus at `05ccdd9`.

## Context

The Plugin API v1 Lua Surface RFC fixes the module root (`bitty`), one spelling
per concept, the closed v1 event set, the L1/L2 split, and an explicit exclusion
list. It deliberately leaves twelve `LUA-OQ-*` questions open and states that
acceptance of an affected element requires a project decision. Those questions
block `bitty-plugin-sdk` R-SDK-1 (`bitty.d.lua` LuaLS definitions), R-SDK-2
(manifest/lint), `bitty-plugin-template` R-TPL-1, the `bitty` host bridge work,
and therefore the whole CTX-0221 first-plugin batch.

This ADR is the wholesale ratification vehicle: it recommends one resolution per
question with rationale, rejected alternatives, and the downstream gates each
one blocks. The project may accept it as written, amend specific rows, or reject
individual rows; nothing here is accepted until the project says so.

Governing constraints used throughout:

- `bitty-docs` is the canonical contract corpus (this repository owns accepted
  interface decisions; `bitty`'s own `AGENTS.md` defers interface decisions to
  `bitty-docs`); the accepted RFC's verification plan already requires host
  parity, manifest agreement, negative capability tests, SDK derivation, and
  documentation synchronization on acceptance.
- Deny-by-default, no ambient authority, bounded payloads, no hot-path surface,
  and the `bitty --safe` recovery path are not open.
- Names and payloads must derive from accepted material, not from planning notes
  such as `PX-1199`'s candidate `register_panel`/`on_event`/`get_terminal_state`
  list, which the RFC already replaced with namespaced spellings.

## LUA-OQ-1: authority placement

**Decision (recommended).** Contract authority lives in the `bitty-docs` corpus:
the accepted RFC text is the normative definition of the v1 Lua surface.
Implementation authority lives in the `bitty` repository: the executable
`bitty-plugin-host`/`bitty-lua` types are the machine-checkable parity evidence
and may refine mechanics, but may not add or rename v1 identifiers without a
`bitty-docs` revision. Generation authority lives in the SDK: R-SDK-1/R-SDK-2
are derived from the accepted surface and may not invent identifiers. The
authority sentence in [Core boundaries](../../architecture/core-boundaries.md)
and the identity paragraph in the
[Plugin Platform RFC](../../specifications/plugin-platform-rfc.md) are amended
at ratification to record this three-way split instead of sole core ownership.

**Rationale.** Every accepted contract in the project lives in `bitty-docs`,
including all OQ-closing RFCs and ADRs; `bitty` is pre-implementation and its own
guide names `bitty-docs` canonical for interface decisions. The RFC is explicit
that the SDK must derive from an accepted host contract, and the accepted
verification plan already pairs docs acceptance with host parity checks. A
single normative text plus executable parity evidence keeps one source of truth.

**Rejected alternatives.** (a) Sole authority in `bitty` with the RFC as
implementation input: splits the accepted corpus across an unborn repository,
leaves R-SDK-1 without an accepted source, and contradicts the repository
ownership already in force. (b) Dual authority with independently editable
copies: forbidden by the RFC's own documentation-synchronization requirement
("no divergent copy is created").

**Blocks.** The RFC acceptance itself, R-SDK-1/R-SDK-2 derivation, and the
`bitty` host-bridge parity test.

**User ratification.** Required; it amends accepted wording in two documents.

## LUA-OQ-2: absent versus denied namespaces

**Decision (recommended).** The `bitty` root table and every v1 sub-table are
always present; a capability-gated function whose grant is absent is present and
fails closed with a typed denial (`runtime` class, stable code
`E_CAPABILITY_DENIED`, bounded message, file/line/column where available) before
any side effect. One documented exception keeps
[ADR 0006](ADR-0006-os-env-policy.md) verbatim: `bitty.env` is absent unless the
manifest declares an `env:<KEY>` capability; when declared but not granted, its
functions fail closed with the same `E_CAPABILITY_DENIED` denial and never
enumerate keys. Key-level minimization is unchanged: with a valid grant,
`bitty.env.get` for a non-allowlisted key returns `nil`, indistinguishable from
an unset variable.

**Rationale.** The typed-denial precedent is already accepted for `os.getenv`
(ADR 0006: `rawget(os, "getenv")` returns an erroring function, not `nil`, so
the diagnostics contract can name file, line, and column). A uniform table shape
makes misconfiguration observable, gives R-SDK-1/R-SDK-3 a single deny fixture
family, and adds no authority: the denial happens before any host effect and
leaks nothing not already public in the contract.

**Rejected alternatives.** (a) Uniform absence for every ungranted namespace:
produces `attempt to index a nil value` noise with no stable code, and makes
`bitty config check`-style static detection of capability misuse impossible.
(b) Present but silent (return `nil`/`false` without a diagnostic): hides
misconfiguration and weakens fail-closed observability; the accepted `os.getenv`
decision explicitly rejects the silent style for denied APIs.

**Blocks.** R-SDK-1 type shapes (`bitty.env` optional), R-SDK-3
deny-by-default conformance fixtures, and the `bitty` host denial-code table.

**User ratification.** Recommended; it records an interpretation of ADR 0006
rather than changing it.

## LUA-OQ-3: command parameter and result metadata

**Decision (recommended).** Parameter and result metadata use the bounded JSON
Schema model already accepted by the
[CLI Contract RFC](../../specifications/cli-contract-rfc.md) for registry
executables: `args_schema` and `result_schema`, depth at most 16, bounded
string fields, bounded total size (`CMD_SCHEMA_MAX_BYTES`, default 16 KiB per
schema), no remote `$ref` and no unbounded patterns. The runtime
`bitty.commands.register(def)` carries the schemas and the host validates
arguments before dispatch and results before returning them, so CLI, palette,
IPC, and Agent reuse one registry. The manifest `[lazy].commands` entry accepts
a table form in addition to the accepted string form:
`{ id = "...", args_schema = {...}, result_schema = {...} }`. When a command is
declared statically and registered at activation, the two definitions must be
equivalent after canonicalization or activation fails with a `validation`
diagnostic. The static form is how lazy help and completion work without a VM,
as the accepted lazy-load rules require.

**Rationale.** JSON Schema is already the single typed schema language across
the accepted CLI and IPC/MCP surfaces. Reusing it avoids a second schema
notation and a lossy translation layer, lets R-SDK-2 lint the same fragments the
host validates, and preserves the accepted lazy-loading property that help and
completion derive from static manifest metadata.

**Rejected alternatives.** (a) The RFC's illustrative compact Lua DSL
(`params = { name = { type, required, values } }`): a second schema language
with a translation layer and schema-drift risk, and it cannot serve CLI/IPC
without a VM. (b) Runtime-only schemas: breaks lazy help/completion and
pre-activation IPC validation. (c) Free-form Lua tables: no typed gate, no
reuse, no lint.

**Blocks.** R-SDK-1 definitions; R-SDK-2 manifest lint; the `bitty` command
registry model; CLI/palette/IPC command help. Requires a reviewed additive
extension of the accepted manifest schema at ratification.

**User ratification.** Required; manifest-schema extension.

## LUA-OQ-4: terminal snapshot schema

**Decision (recommended).** Keep `bitty.terminal.snapshot(opts) -> Snapshot`,
`scope = "semantic"` only, with these details.

- `opts = { scope = "semantic", terminal_id? = integer }`. Without
  `terminal_id` the snapshot targets the focused view's attached terminal;
  an explicit id is allowed within `terminal.semantic-read` and exists so
  consumers can answer observation events for other terminals. Terminal
  enumeration remains excluded in v1.
- Top-level fields: `version = 1`, `terminal_id`, `runtime_id`, `generation`
  (registry generation), `snapshot_generation` (damage generation), `width`,
  `height`, `rows`, `cursor`, `modes`, `title`, `zones?`. This extends the
  RFC's shape with the identity tuple already required by the accepted
  [TerminalRegistry contract](../../specifications/terminal-registry-view-lifecycle-rfc.md).
- Region: the visible viewport only, top-down. No scrollback text and no
  full-grid selection in v1; zones may reference line ranges but their text is
  not expanded outside the visible rows.
- Row and attribute encoding, aligned with the accepted `bitty-term-state`
  `Style`/`Attributes` model and `bitty-vt` `Color`/`UnderlineStyle`:

  | Field                                 | Encoding                                                                                                                                                    |
  | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `rows[i].text`                        | UTF-8 string, visible row only                                                                                                                              |
  | `rows[i].spans`                       | `{ { start, end, attrs } }`, half-open column offsets `[start, end)`                                                                                        |
  | `attrs.bold` … etc.                   | boolean flags, omitted when false (`faint`, `italic`, `blink`, `inverse`, `invisible`, `strikethrough`)                                                     |
  | `attrs.underline`                     | `"none" \| "single" \| "double" \| "curly" \| "dotted" \| "dashed"`                                                                                         |
  | `attrs.fg` / `bg` / `underline_color` | `"default"`, integer `0..=255` palette index, or `"#RRGGBB"`                                                                                                |
  | `cursor`                              | `{ row, col, visible }`                                                                                                                                     |
  | `modes`                               | bounded flags, including `alternate_screen = boolean`                                                                                                       |
  | `zones[i]`                            | `{ kind = "prompt" \| "input" \| "command" \| "output" \| "unknown", range = { start_line, end_line }, metadata? = { cwd?, host?, command?, exit_code? } }` |

- Spans carry only non-default attributes; bounded strings stay under the event
  bound. A snapshot whose serialized size exceeds the host bound
  (`SNAPSHOT_MAX_BYTES`, default 256 KiB, matching the automation chunk ceiling
  family) is rejected with `E_SNAPSHOT_TOO_LARGE` rather than truncated.
- Alternate screen: the snapshot always reflects the currently displayed grid;
  while `alternate_screen` is true zones may be absent and scrollback is never
  included. Exiting alternate screen restores the primary grid per accepted
  terminal-state rules.

**Rationale.** Every element maps to accepted evidence: the identity tuple and
`TerminalClosed`/`TerminalExited` shapes come from the accepted registry
contract, zones and semantic kinds from the accepted Rich Presentation RFC, and
the attribute/color vocabulary from the implemented core state model. Visible
region only keeps untrusted-data amplification and budgets bounded.

**Rejected alternatives.** (a) `scope = "raw"`: explicitly high-risk and
excluded from v1. (b) Full-grid or scrollback regions: larger untrusted payload
and no accepted consumer need. (c) Damage/delta snapshots in v1: deferred until
a consumer contract exists. (d) An index/fingerprint-only snapshot: no
usefulness for the first batch.

**Blocks.** R-SDK-1; the `bitty` snapshot bridge; the activity, scratchpad, and
peek plugins; IPC/MCP/Agent snapshot consistency.

**User ratification.** Confirm the visible-region default and the optional
`terminal_id` targeting; the rest is mechanical alignment.

## LUA-OQ-5: key-binding suggestions

**Decision (recommended).** Keep `bitty.keymaps.suggest(def) -> handle` as a
Lua call made during activation, not a manifest declaration.
`def = { chord = string, command = string, when? = string }` where `command`
names a command registered by the same generation and `when` must be absent or
`"global"` in v1; any other value is a registration error naming the supported
context. The chord grammar is exactly the shipped configuration grammar from
the [Configuration Model RFC](../../specifications/configuration-model-rfc.md):
trimmed, case-insensitive modifiers joined with `+` (`ctrl`, `alt`, `shift`,
`super`), named keys from the shipped vocabulary (`tab` through `f35`,
including the `ins`/`del`/`hm`/`end`/`pu`/`pd` aliases), and single-character
keys require a modifier. Identity for precedence and conflict detection is
`(when, normalized chord)`. Suggestions never override mappings; the accepted
precedence `explicit user > workspace > first-party/default > plugin` applies,
and chord conflicts produce diagnostics for user resolution rather than load
order.

**Rationale.** The config subsystem already accepts this chord grammar and
`context + chord` identity; reusing it means one keymap vocabulary and one
parser. A Lua call can validate that `command` exists in the same generation,
which a manifest declaration cannot do before activation. Suggestions remain
declarations with no forced mutation, as the accepted plugin-system contract
requires.

**Rejected alternatives.** (a) Manifest-declared `[keymaps]`: cannot reference
a runtime-registered command reliably, and creates a second source of truth.
(b) Vim-style `<C-S-h>` chord micro-syntax: diverges from the shipped config
grammar and adds a second parser. (c) Alternative namespace spellings
(`bitty.keys`, `bitty.keybindings`): no accepted basis; the corpus already uses
`keymaps`. (d) Colon methods: rejected by the RFC.

**Blocks.** R-SDK-1; the `bitty` keymap-suggestion registry; R-TPL-1 example
bindings.

**User ratification.** Confirm the v1 `when = "global"` restriction.

## LUA-OQ-6: storage semantics

**Decision (recommended).**

- Key grammar: `^[a-z0-9][a-z0-9._-]{0,127}$`, at most 128 UTF-8 bytes, no empty
  dot segments.
- Value type: JSON-compatible plain data only (boolean, finite number, UTF-8
  string, array, object), depth at most 8, at most 1024 nodes, serialized value
  at most 8 KiB (`STORE_MAX_VALUE_BYTES`). Functions, metatables, cycles, and
  non-finite numbers are rejected with `E_STORE_VALUE_INVALID` (class
  `validation`). `bitty.store.set(key, nil)` deletes the key.
- Quota: `STORE_QUOTA_BYTES` default 256 KiB persisted per plugin; overflow
  fails closed with `E_STORE_QUOTA` (class `budget`), never evicting or
  partially writing. These numbers are target contracts and require an
  Isolation Resource RFC row (proposed `RC-11`) before implementation.
- Reload and generation interaction: the store is scoped to the plugin ID, not
  to a generation. It survives suspension, reload, and generation disposal;
  writes from generation N are committed synchronously before N is disposed, so
  N+1 reads the same values. Data is deleted only by uninstall or an explicit
  user purge. Generation-owned memory, handles, tasks, and timers are still
  reclaimed per the accepted FS-5 rule; this ADR refines the Plugin Platform
  RFC's disposal sentence to say persisted store data is **not** generation
  state.
- Encoding on disk and the exact host format are implementation detail; the
  contract is the value model, bounds, and lifecycle above.

**Rationale.** Persistence is the defining property of `bitty.store`
("persisted under the platform data directory" in the accepted RFC) and the
first-batch activity and scratchpad plugins depend on it. Generation-scoped
storage would make the namespace equivalent to VM memory, so no persistence
semantics could be tested. JSON-compatible bounds keep the write path
canonicalizable, lintable, and budget-enforced.

**Rejected alternatives.** (a) Literal generation-scoped store: destroys the
plugin use cases and makes persistence untestable. (b) Unbounded Lua values:
tables can carry functions, metatables, and cycles; encoding and quota become
unbounded. (c) Opaque host blobs: no schema lint and no SDK support. (d) LRU
eviction on overflow: silent data loss conflict with attribution and
fail-closed rules.

**Blocks.** R-SDK-1; the `bitty` store bridge; activity and scratchpad;
Isolation Resource RFC `RC-11`.

**User ratification.** Required; quota numbers and the disposal-sentence
refinement touch accepted documents.

## LUA-OQ-7: UI update model

**Decision (recommended).** Keep both `bitty.ui.mount(slot, component) -> handle`
and `bitty.ui.update(handle, component) -> boolean`. The handle is an opaque,
generation-owned integer (`block_id`); `update` replaces the block's scene
subtree under the same `block_id` with an incremented version, which is exactly
the accepted `RichBlock` replacement rule, and the composer diffs the subtree.
`update` returns `false` for a stale or foreign handle and raises
`E_UI_COMPONENT_INVALID` for a component that violates the scene contract. The
v1 node vocabulary is the accepted `SceneNode` subset `Text`, `Row`, `Column`,
and `List`; status components are ordinary subtrees mounted in the
`statusline` slot, and popups are overlay-slot subtrees, not a new node kind.
`Image`, `CodeBlock`, `Table`, `Rule`, and bordered `Block` nodes are excluded
from v1.

**Rationale.** The accepted Rich Presentation RFC already defines replacement
as "same `BlockId` with an incremented version" and requires subtree diffing;
mount-only would fight that model and force full disposal on every change.
Restricting the node vocabulary keeps v1 budget-bounded and avoids pre-empting
image/table/protocol reviews.

**Rejected alternatives.** (a) Mount-only with remount-on-change: loses stable
block identity/versioning and contradicts accepted rule 2. (b) Two identity
sets (remount for some slots, update for others): more surface, no benefit.
(c) Full scene vocabulary in v1: pulls image/code/table/rule budget and
security reviews into this acceptance.

**Blocks.** R-SDK-1; the `bitty` rich-scene bridge; peek and pet overlays;
R-TPL-1 example.

**User ratification.** Confirm the reduced v1 node subset.

## LUA-OQ-8: service provider side

**Decision (recommended).**

- Provider registration: `bitty.services.provide(iface, impl) -> handle` during
  activation; `impl` is a plain table whose members are functions. The caller
  (host) validates arguments against the interface schema and returns plain
  values; no cross-VM object handles.
- Interface and schema ownership: the provider declares the interface name,
  concrete version, and bounded JSON Schema (`args_schema`/`result_schema`, per
  LUA-OQ-3 limits) in its manifest. The accepted `[services.provided]` entry
  gains a table form `{ version = "...", args_schema = {...}, result_schema = {...} }`
  alongside the accepted `"iface" = "1.0.0"` string form; only table-form
  providers are resolvable by schema-validating consumers.
- Missing provider: resolution happens before activation and fails closed with
  `E_SERVICE_RESOLUTION` (class `resolution`) by default;
  `bitty.services.get(iface, { version = ">=2.0", optional = true })` returns
  `nil` instead. Provider disappearance after activation (revocation,
  suspension, disable) makes in-flight calls fail closed with `E_SERVICE_GONE`
  (class `runtime`); no stale handle remains callable.
- Relationship to the Draft provider-ecology RFC: this ADR freezes only the
  minimal v1 consumer/provider contract. Provider ecology (pickers, status,
  context providers, side-by-side versions) stays post-1.0 and requires its own
  acceptance. Services remain excluded from the CTX-0221 first batch.

**Rationale.** The accepted Plugin Platform RFC already requires interfaces and
versions to be declared in the manifest and resolution to fail before
activation; adding bounded schemas reuses the LUA-OQ-3 schema language and
gives CLI/IPC discovery without loading a VM. Fail-closed resolution and call
semantics match the accepted deny-by-default posture.

**Rejected alternatives.** (a) Runtime-only registration with schemas passed at
`provide` time: no pre-activation resolution or discovery. (b) Colon methods
(`bitty.services:get`): explicitly rejected by the RFC. (c) Defer provider side
completely: makes `bitty.services.get` dead surface and blocks future batches.

**Blocks.** R-SDK-1; the `bitty` service registry; provider-ecology follow-up;
manifest extension at ratification.

**User ratification.** Required; manifest-schema extension and v1 inclusion.

## LUA-OQ-9: tasks and timers

**Decision (recommended).** Reconcile ADR 0007's unprefixed names to the module
root and the plural family precedent used by `commands`, `events`, `keymaps`,
and `services`:

```lua
bitty.tasks.spawn(fn) -> task_id          -- host task wrapping a Lua continuation
bitty.tasks.cancel(task_id) -> boolean
bitty.timers.create(delay_ms, callback) -> timer_id   -- one-shot in v1
bitty.timers.cancel(timer_id) -> boolean
```

Handles are small generation-owned integers, not host objects. Live limits are
the accepted RC-4 64 tasks / 32 timers; exceeding them refuses with the accepted
`E_BUDGET_TASK`/`E_BUDGET_TIMER` (`budget` class) and never queues silently.
Timer fire and task resumption deliver through the accepted event path, so the
three-level queue budgets still apply. Cancellation releases the cap slot;
task cancellation is cooperative at the next host slice (no Lua-visible abort
hook in v1). All handles from generation N are invalid after disposal and fail
closed. The bare `task.spawn` / `timer.create` spellings in ADR 0007 are treated
as internal concept labels, not Lua identifiers; the ADR receives a
reconciliation note at ratification. Repeating timers are a 1.x minor addition.

**Rationale.** The Lua Runtime RFC fixes a single `bitty` host bridge and the
RFC excludes any global function outside it, so the unprefixed ADR names cannot
ship as written. Plural namespaces match the accepted family precedent, and
integer handles match the RFC rule that every table is plain bounded data, not
a host handle.

**Rejected alternatives.** (a) Keep bare `task.spawn`/`timer.create` globals:
violates the module-root rule and risks future global collisions. (b) Singular
`bitty.task.spawn`/`bitty.timer.create`: minimal edit to ADR 0007 but
inconsistent with the plural families; acceptable only as a spelling change if
the project prefers smaller delta. (c) Defer tasks/timers to post-1.0: ADR 0007
already accepts the caps and the pet/activity plugins need timers.

**Blocks.** R-SDK-1; the `bitty` scheduler bridge; ADR 0007 reconciliation.

**User ratification.** Confirm plural spelling over singular.

## LUA-OQ-10: observation identity

**Decision (recommended).** Add bounded identity fields derived from the
accepted TerminalRegistry contract to the v1 observation payloads:

| Event                                             | Payload (recommended)                                           |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `terminal.opened`                                 | `{ terminal_id, runtime_id, generation }`                       |
| `terminal.closed`                                 | `{ terminal_id, runtime_id, reason }`                           |
| `process.exited`                                  | `{ terminal_id, runtime_id, exit_code }`                        |
| `focus.changed`                                   | `{ view_id, terminal_id? }`                                     |
| `selection.changed`                               | `{ view_id, terminal_id? }`                                     |
| `terminal.title-changed` / `terminal.cwd-changed` | existing field plus `terminal_id`, `runtime_id` for attribution |

Identifiers are Lua integers (u64 within the i64 range) and field names carry
the type distinction; a single opaque `id` field is not allowed, matching the
accepted rule that `TerminalId`, `ViewId`, and `RuntimeId` are pairwise
incompatible. `generation` lets consumers detect stale identities; `reason` and
`exit_code` come from the accepted `TerminalClosed`/`TerminalExited` shapes.

**Rationale.** Identity already exists in the accepted registry contract and is
simply not modeled in the host payloads yet. Without it, multi-terminal
consumers (activity, pet) cannot attribute events, and `process.exited`
discards an exit status the accepted registry already carries. Adding fields is
backward-compatible under the RFC rule that unknown future fields are ignored.

**Rejected alternatives.** (a) Empty payloads until a Panel/Workspace identity
RFC: blocks multi-terminal consumers and contradicts accepted registry
evidence. (b) One shared `id` field: blends `TerminalId`/`ViewId`, violating
the accepted pairwise-incompatible rule. (c) String-encoded identifiers: adds
parsing cost with no benefit because Lua 5.4 integers are 64-bit.

**Blocks.** R-SDK-1; the `bitty` event payloads; activity and pet; consistency
with the LUA-OQ-4 snapshot identity tuple.

**User ratification.** Confirm identity on the listed payloads.

## LUA-OQ-11: panel and overlay boundary

**Decision (recommended).** Keep `bitty.ui.mount("overlay", component)` in v1,
gated by `ui.overlay`, defined as presentation-only, non-focusable declarative
content: an overlay contribution never claims focus, never mutates a view or
terminal, never becomes a `PanelProvider`, and defines no panel identity or
lifecycle. Overlay count and size bounds are not fixed here; they are inherited
from the Panel RFC when accepted (the pre-study's PR-10/PR-11 values are
indicators, not accepted numbers). At ratification, add a compatibility note:
if the Panel RFC redefines overlays as focusable surfaces, the `overlay` slot
remains a content source and the panel contract owns focus and routing.

**Rationale.** The accepted slot set already includes `overlay`, and the
first-batch peek/pet plugins depend on it; the constraint set keeps it
compatible with the pre-study's "instantaneous interaction layer, never a
focusable panel" definition and pre-empts nothing in the open Panel contract.

**Rejected alternatives.** (a) Gate overlay until the Panel RFC: blocks
first-batch plugins with no security benefit. (b) Let overlay claim focus or
serve as a panel provider: pre-empts the Panel RFC and touches input routing.
(c) Remove `overlay` from v1: regresses the accepted slot set.

**Blocks.** R-SDK-1; the `bitty` slot composition; peek and pet; the future
Panel RFC compatibility note.

**User ratification.** Confirm keeping overlay in v1 under these constraints.

## LUA-OQ-12: plugin entry point

**Decision (recommended).** The entry point is a fixed `init.lua` at the plugin
package root, not a manifest-declared field. It executes synchronously at
activation in the per-plugin VM; every registration call
(`bitty.commands.register`, `bitty.events.subscribe`, `bitty.keymaps.suggest`,
`bitty.ui.mount`, `bitty.services.provide`, timer/task creation) is valid only
during that execution. After `init.lua` returns, the generation is activated
and `plugin.activated` is delivered; any later registration attempt is a
registration error. A lazy plugin runs `init.lua` in the fresh VM and then
replays the triggering command once, per the accepted lazy-load semantics.
`require` resolves only inside the package tree. Failure raises typed
`syntax`/`resolution`/`validation`/`runtime` diagnostics naming the entry file
and line, and leaves no partially activated state, consistent with the accepted
diagnostics contract.

**Rationale.** `init.lua` is already the template plan's candidate (PX-1199
R-TPL-1), matches the configuration VM convention, and needs no new manifest
schema. Confining registration to entry execution matches the RFC's
registration-window rule and the accepted activation lifecycle.

**Rejected alternatives.** (a) Manifest `entry = "..."` field: new accepted
schema surface with no multi-entry need; delays R-TPL-1. (b) `main.lua` or
`plugin.lua`: divergent convention against the template plan. (c) Multiple
entry points or per-slot hook files: lifecycle surface before any need.

**Blocks.** R-SDK-1; R-TPL-1; the `bitty` activation path.

**User ratification.** Confirm the fixed file name.

## Dependency summary

| OQ        | Blocks                                                                                      |
| --------- | ------------------------------------------------------------------------------------------- |
| LUA-OQ-1  | RFC acceptance; R-SDK-1/R-SDK-2 source; core parity gate; two accepted-document amendments  |
| LUA-OQ-2  | R-SDK-1 env shapes; R-SDK-3 deny fixtures; core denial-code table                           |
| LUA-OQ-3  | R-SDK-1; R-SDK-2; core command registry; CLI/palette/IPC metadata; manifest extension       |
| LUA-OQ-4  | R-SDK-1; core snapshot bridge; activity/scratchpad/peek; IPC/MCP/Agent snapshot consistency |
| LUA-OQ-5  | R-SDK-1; core keymap registry; R-TPL-1 example                                              |
| LUA-OQ-6  | R-SDK-1; core store bridge; activity/scratchpad; Isolation RFC RC-11                        |
| LUA-OQ-7  | R-SDK-1; core rich-scene bridge; peek/pet; R-TPL-1                                          |
| LUA-OQ-8  | R-SDK-1; core service registry; provider-ecology follow-up; manifest extension              |
| LUA-OQ-9  | R-SDK-1; core scheduler bridge; ADR 0007 reconciliation                                     |
| LUA-OQ-10 | R-SDK-1; core event payloads; activity/pet; LUA-OQ-4 identity consistency                   |
| LUA-OQ-11 | R-SDK-1; core slot composition; peek/pet; Panel RFC compatibility note                      |
| LUA-OQ-12 | R-SDK-1; R-TPL-1; core activation path                                                      |

## Ratification checklist

Ratified wholesale on 2026-09-11 by the project initiator (user): every row
below was checked with no per-row exceptions.

- [x] Ratify LUA-OQ-1 contract/implementation/generation authority split and the
      `bitty-docs`-canonical wording.
- [x] Ratify LUA-OQ-2 typed-denial stubs with the `bitty.env` absence carve-out.
- [x] Ratify LUA-OQ-3 JSON Schema metadata and the manifest `[lazy].commands`
      table extension.
- [x] Ratify LUA-OQ-4 snapshot fields, visible-region default, and optional
      `terminal_id` targeting.
- [x] Ratify LUA-OQ-5 chord grammar reuse and the v1 `when = "global"`
      constraint.
- [x] Ratify LUA-OQ-6 store value model, 256 KiB quota / 8 KiB value defaults,
      persistence across generations, and the Isolation RFC `RC-11` amendment.
- [x] Ratify LUA-OQ-7 `ui.mount` + `ui.update` and the reduced v1 node subset.
- [x] Ratify LUA-OQ-8 provider contract and the manifest `[services.provided]`
      table extension.
- [x] Ratify LUA-OQ-9 `bitty.tasks.*` / `bitty.timers.*` spelling and the
      ADR 0007 reconciliation.
- [x] Ratify LUA-OQ-10 identity payloads and the title/cwd attribution addition.
- [x] Ratify LUA-OQ-11 overlay retention with the non-focusable constraint and
      Panel RFC compatibility note.
- [x] Ratify LUA-OQ-12 fixed `init.lua` entry point.

## Acceptance effects

Ratification performed all of the following in one change on 2026-09-11; no
divergent copy is created:

1. This ADR: document status Proposed to Accepted (frontmatter `status: draft`
   to `accepted`), retaining the resolution text as the record.
2. [Plugin API v1 Lua Surface RFC](../../specifications/plugin-api-v1-lua-surface-rfc.md):
   frontmatter `status: draft` to `accepted`; the Open questions section
   replaced by the resolved dispositions pointing here; payload tables,
   function signatures, and the manifest references updated to the resolutions
   above.
3. [Plugin Platform RFC](../../specifications/plugin-platform-rfc.md):
   the "final spelling belongs to the core repository" identity paragraph
   amended per LUA-OQ-1; the host-namespace block reconciled to the accepted
   spellings; the manifest schema extended per LUA-OQ-3 and LUA-OQ-8; the
   disposal sentence refined per LUA-OQ-6.
4. [Core boundaries](../../architecture/core-boundaries.md): authority sentence
   amended per LUA-OQ-1; the candidate semantic API examples aligned to the
   accepted spellings.
5. [ADR 0007](ADR-0007-async-gc.md): reconciliation note for the LUA-OQ-9
   spellings; [ADR 0006](ADR-0006-os-env-policy.md): note recording the LUA-OQ-2
   denial-stub interpretation.
6. [Isolation Resource RFC](../../specifications/isolation-resource-rfc.md):
   `RC-11` store quota row added from the ratified LUA-OQ-6 numbers.
7. [Specifications index](../../specifications/README.md),
   [decision register](../index.md), and
   [ADR index](README.md): RFC moved from Draft to Accepted; ADR 0009 added.
8. CarryCtx CTX-0144 records the ratification decision; SDK/template tasks for
   R-SDK-1/R-SDK-2/R-SDK-3/R-TPL-1 and the `bitty` host-bridge work are
   unblocked but still require their own scoped tasks. No code is authorized by
   this ADR.

## Out of scope

This ADR is design-only. It adds no capability, changes no budget, ships no
code, and does not authorize implementation. Panel providers, presentation
replacement, protocol registration, raw terminal access, interception
rewriting, MCP/Agent/AI Lua entry points, and provider ecology remain excluded
or deferred exactly as the RFC's exclusion list states.

## References

- [Plugin API v1 Lua Surface RFC](../../specifications/plugin-api-v1-lua-surface-rfc.md)
  (accepted 2026-09-11, CTX-0143/CTX-0144; draft `05ccdd9`) — resolved
  surface, and the resolutions recorded by this ADR.
- [Plugin Platform RFC](../../specifications/plugin-platform-rfc.md) — accepted
  manifest, capabilities, namespaces, lifecycle, event pipeline.
- [Lua Runtime RFC](../../specifications/lua-runtime-rfc.md) — accepted host
  bridge, diagnostics classes, module resolution.
- [Core boundaries](../../architecture/core-boundaries.md) — ownership and
  authority statements.
- [ADR 0006](ADR-0006-os-env-policy.md), [ADR 0007](ADR-0007-async-gc.md) —
  accepted environment and async contracts.
- [CLI Contract RFC](../../specifications/cli-contract-rfc.md) — accepted typed
  executable registry and JSON Schema limits.
- [TerminalRegistry and View Lifecycle Contract](../../specifications/terminal-registry-view-lifecycle-rfc.md)
  — accepted identity tuple, `TerminalClosed`/`TerminalExited`, generation
  rules.
- [Rich Presentation RFC](../../specifications/rich-presentation-rfc.md) —
  accepted `RichBlock`, `SceneNode`, and semantic-zone contracts.
- [Isolation Resource RFC](../../specifications/isolation-resource-rfc.md) —
  accepted RC-1..RC-10 ceilings and reclaim rules.
- [Configuration Model RFC](../../specifications/configuration-model-rfc.md) —
  shipped `keymaps` grammar and merge classes.
- [Panel Runtime and Event Bus Pre-Study](../../specifications/panel-runtime-pre-study.md)
  — draft overlay definition and bounds indicators.
- [Plugin Reuse and Provider Ecology RFC](../../specifications/plugin-reuse-and-providers.md)
  — draft post-1.0 provider direction.
- `bitty` `1ea2f66` host crates; `bitty-plugin-sdk` CTX-0015 `d2cad1f` +
  `07e2122`; PX-1199 (`bitty` CTX-0221) gates R-SDK-1..3 and R-TPL-1.
