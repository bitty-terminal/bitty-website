---
title: Plugin Platform RFC
description: Defines the accepted Plugin API v1 surface, capability and manifest model, and event pipeline contract for OQ-011, OQ-012, and OQ-013
category: specifications
audience: plugin-author
document_type: specification
status: accepted
website_publish: true
sidebar_order: 16
---

# Plugin Platform RFC

> Status: **accepted** on 2026-08-27 by the project initiator. This document
> defines the accepted Plugin API v1 surface, capability and manifest model,
> and event pipeline contract; it closes
> [OQ-011](../decisions/open-questions.md),
> [OQ-012](../decisions/open-questions.md), and
> [OQ-013](../decisions/open-questions.md) at the design level. It does not
> describe implemented behavior and does not authorize shipped, stable, or
> compatibility-guaranteed behavior. Experimental implementation may exist as
> review evidence but carries no compatibility promise beyond the accepted
> contract. Wave-C P1 decisions are now the accepted contract per independent
> review with security-auditor: **DropOldest is the v1 default** for UI
> observation/event systems (consumer converges to latest state);
> **DropNewest remains a documented alternative, not the default**, per
> OQ-013; three-level queue budgets PerSubscription 64 / PerPlugin 1024
> events/256 KiB / Global 8192 events/2 MiB are aligned as accepted defaults
> with `BoundedText` strict enforcement and hardened activation gates.

## Purpose and scope

The three open questions this RFC answers are:

- **OQ-011**: What is Plugin API v1 across commands, events, UI, services,
  lifecycle, and compatibility?
- **OQ-012**: What manifest, capability identifiers, grant storage, prompts,
  and revocation workflow implement the normative capability model?
- **OQ-013**: Which event phases may observe or intercept, and what batching,
  timeout, drop, and backpressure rules apply?

In scope: plugin identity and compatibility metadata, the package manifest
schema, the capability identifier space and grant lifecycle, the Plugin API v1
host surface (commands, events, UI contributions, services, settings, storage),
the plugin lifecycle and generation model, API versioning policy, and the event
pipeline classes with delivery, batching, timeout, drop, and backpressure
rules.

Out of scope (each remains owned elsewhere):

- Lua runtime/binding choice and standard-library subset (OQ-009, accepted in
  [Lua Runtime RFC](../specifications/lua-runtime-rfc.md)) and the
  configuration model (OQ-010). This RFC assumes the accepted direction of one
  isolated Lua VM per plugin and defines only the host side of the boundary.
- Per-plugin budget thresholds, instruction/memory/task enforcement mechanisms,
  reload cost models, and adversarial isolation tests (OQ-014). This RFC
  references the budgets as attribution points but sets no numbers.
- Package sources, lockfiles, integrity/signature policy, registry design, and
  install/update transactions (OQ-021, OQ-022). This RFC consumes the lockfile
  compatibility fields and defines nothing about transport.
- Rich-block, scene-primitive, and semantic-zone contracts (OQ-015). The v1 UI
  surface below deliberately exposes only a minimal primitive subset.
- Default bundled-plugin set and disabling behavior (OQ-002).

## Normative sources this specification must not weaken

- [Security Overview](../security/overview.md): untrusted-by-default posture;
  capability families; invariants 2 (third-party plugins start without
  filesystem, network, process, clipboard, runtime-control, debug, or
  protocol-registration authority), 3 (presentation, never Terminal Truth),
  4 (no hot-path execution), 8 (installation runs no package code and updates
  cannot silently add capabilities), and 10 (`bitty --safe`).
- [Threat Model](../security/threat-model.md): abuse cases T-06, T-07, T-10,
  T-12, and T-13 and the plugin-to-host data-flow controls.
- [Security Risk Register](../security/risk-register.md): R-006 through R-009,
  R-013, R-015 through R-017, and R-022.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md):
  mechanism/policy split, observation-versus-interception event distinction,
  capability-family separation, declarative UI, generation-based lifecycle,
  and the two security domains (`TerminalSecurityPolicy` versus
  `PluginCapabilities`).
- [Plugin system](../extensibility/plugin-system.md): extension levels 1-4,
  register-versus-claim semantics, qualified naming, key-binding suggestion
  precedence, and the governing boundary that plugins may alter presentation
  but must not alter terminal truth.

Where this RFC picks concrete identifiers or defaults, it refines the
illustrative fragments in the sources above; it does not move any requirement
between owners or relax a gate. An RFC may select a mechanism for a normative
control; it may not downgrade the control to an optional candidate.

## Terminology

| Term           | Accepted meaning                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Host           | The Bitty extension host: the only component that executes plugin code and mediates privileged work.  |
| Plugin ID      | Owner-qualified stable identifier, `owner.name`, for example `xuepoo.markdown`.                       |
| Qualified name | Plugin-scoped resource name, `plugin-id:resource`, for example `xuepoo.markdown:toggle`.              |
| Capability     | A named, narrowly scoped authority granted to one plugin, for example `clipboard.read`.               |
| Manifest       | Static `bitty-plugin.toml` describing identity, compatibility, dependencies, resources, and requests. |
| Grant record   | Persisted user decision binding one plugin ID plus manifest hash to a set of granted capabilities.    |
| Generation     | Monotonic instance counter per plugin ID; all runtime resources are owned by one generation.          |
| Observation    | Read-only notification delivered after terminal state has been updated.                               |
| Interception   | Cold-path hook that may veto one user action before the host performs it.                             |

## Accepted summary

1. One manifest format (`bitty-plugin.toml`), parsed and validated before any
   plugin code runs, with hard size and structure limits and fuzz coverage.
2. A capability identifier grammar over the normative families, deny by
   default, no wildcards, path/scope parameters attached to the identifier,
   grants persisted per manifest hash, and revocation through both the CLI and
   the plugin manager.
3. A Plugin API v1 covering extension level 1 fully (commands, events,
   key-binding suggestions, settings, notifications), the core of level 2
   (status components, overlays, panels from declarative primitives), and
   read-only terminal semantic snapshots. Levels 3 and 4 stay outside v1.
4. An event pipeline with three classes (lifecycle, observation,
   interception), four interception points for v1, bounded per-subscriber
   queues, coalescing where the event semantics allow it, fail-open timeouts,
   and no hot-path events of any kind.

## Manifest and identity (OQ-012, part 1)

### Format options considered

| Option    | Trade-offs                                                                                                                                                                                                                         | Verdict                                                |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| TOML      | Matches the candidate fragments already in the corpus; static, declarative, no execution during parsing; comments survive round-trips; well-understood schema tooling. Loses computed values, which is the desired property here.  | **Proposed.**                                          |
| JSON      | Widely tooled, but no comments, verbose for humans, and encourages machine-only editing of a file users are asked to review during consent.                                                                                        | Rejected for the author-facing manifest.               |
| Lua table | One language across config and plugins, but a manifest must be inspectable and diffable without creating a VM; executable manifests would run attacker-controlled code during discovery, weakening the no-code-at-install posture. | Rejected; contradicts T-06/T-12 containment direction. |
| YAML      | Ergonomic but ambiguous (implicit typing, anchors), historically fuzz-hostile, and over-expressive for a security-reviewed artifact.                                                                                               | Rejected.                                              |

Status of this choice: **accepted**. The file name, key spelling, and version
grammar are now the accepted contract.

### Accepted manifest schema

```toml
# Accepted syntax; extends the illustrative fragment in
# docs/extensibility/plugin-system.md with explicit scopes and triggers.
[plugin]
id = "xuepoo.markdown"        # required; ^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$
name = "Bitty Markdown"       # required; display name
version = "0.9.0"             # required; SemVer 2
description = "Render Markdown as rich blocks."
license = "MIT"               # optional; SPDX expression

[compat]
bitty = ">=0.5,<1.0"          # application version range
plugin-api = "^1.0"           # Plugin API range; v1 line is ^1.0

[dependencies]                # optional; plugin dependencies by ID
"xuepoo.gitcore" = ">=2.0"

[services.provided]           # optional; interface name -> version
"markdown.render" = "1.0"

[capabilities]                # requested authorities; absent = none
terminal.semantic-read = true
ui.rich = true

[[capabilities.filesystem]]   # filesystem requests carry explicit patterns
access = "read"
paths = ["~/Documents/**/*.md"]

[lazy]                        # static trigger declaration; enables lazy load
commands = ["xuepoo.markdown:toggle"]
events = ["terminal.cwd-changed"]
claims = ["tabline"]
```

Accepted validation rules:

1. The manifest is parsed by the package manager and the host independently
   with the same schema and version; both reject unknown keys, duplicate keys,
   out-of-range lengths, and invalid identifiers before any dependency
   resolution or VM creation.
2. Hard limits (accepted, tunable only by a reviewed change): manifest size
   <= 256 KiB; at most 128 declared commands, 256 subscribed event types, 32
   filesystem patterns per access kind, 16 provided services, and 8 plugin
   dependencies; total pattern text <= 8 KiB.
3. Every string field is bounded and treated as untrusted display data; names
   and descriptions are rendered with host-owned components and never
   interpreted as markup or executed (same treatment as title/notification
   strings in the threat model).
4. `capabilities` may only contain identifiers from the grammar below; an
   unknown identifier fails validation instead of being ignored, so forward
   compatibility is explicit rather than accidental escalation.
5. Manifests are attacker-controlled input (a cloned repository, a typo-squatted
   package, or a compromised update can supply one). Schema parsers therefore
   get fuzz targets alongside VT/config parsers per the P0 testing row of the
   [security overview](../security/overview.md).

Dependency resolution evaluates the full graph before activation: cycles are
rejected, incompatible constraints are resolver errors, and lazy plugins
reserve their declared commands, event subscriptions, claims, and service
provisions during graph construction so conflicts cannot appear first at
event time. This adopts the determinism and ownership properties from the
[plugin system](../../docs/extensibility/plugin-system.md) contract.

### Identity and compatibility

- Plugin IDs are globally unique and owner-qualified; the owner segment binds
  the ID to a publisher namespace, and the package layer (not this RFC) verifies
  that binding per source type.
- `plugin.version`, `compat.bitty`, and `compat.plugin-api` are three separate
  fields. A plugin compatible with one Bitty build is not thereby compatible
  with every Plugin API of that build.
- Plugin API v1 is identified as `1.x` with SemVer: minor versions are additive
  only; removing or narrowing an existing surface requires a major version.
  The authoritative definition lives in the core repository and the SDK is
  generated output, per
  [core boundaries](../architecture/core-boundaries.md#extension-api-composition).

## Capability model (OQ-012, part 2)

### Identifier grammar and families

Accepted grammar: `family.resource[.scope]`, lowercase, dot-separated, with an
optional parameterized form `family.resource:parameter` for path and destination
constraints. Identifiers are closed symbols; plugins cannot invent families.

| Family      | Accepted v1 identifiers                                                                                       | Normative source restriction                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `terminal`  | `terminal.semantic-read`, `terminal.raw-read`, `terminal.input.self`, `terminal.input.all`, `terminal.manage` | Raw read and manage are high-risk; never bundled with presentation. |
| `ui`        | `ui.rich`, `ui.overlay`, `ui.protocol-register`                                                               | `ui.protocol-register` is the high-risk protocol-registration gate. |
| `clipboard` | `clipboard.read`, `clipboard.write`                                                                           | Reads and writes are separate decisions; reads need consent UX.     |
| `fs`        | `fs.read:PATTERN`, `fs.write:PATTERN` with explicit path globs                                                | Patterns resolve against real paths; symlinks and devices rejected. |
| `process`   | `process.spawn:CONSTRAINT` naming an allowlisted program and argument shape                                   | No unconstrained spawn; child scope rules follow the threat model.  |
| `network`   | `network.connect:DESTINATION` naming host/port or scheme policy                                               | Destination policy is mandatory; no ambient sockets.                |
| `runtime`   | `runtime.inspect`, `runtime.configure`, `runtime.plugin-manage`                                               | Administrative runtime control is not offered to plugins in v1.     |
| `debug`     | `debug.inspect`, `debug.trace`, `debug.control`                                                               | Three distinct scopes; connection alone grants none.                |
| `platform`  | `platform.notify`, `platform.open-url`, `platform.image-file`                                                 | Image-file access is deny-by-default with approved-location checks. |

Rules:

1. Deny by default. Absent from the grant set means denied; there is no
   allow-all identifier and no family-wide wildcard. This is the corpus rule
   that a generic write or allow-all permission cannot replace target/effect
   separation, made concrete.
2. Official and bundled plugins pass through the identical model; there is no
   private channel and no first-party bypass flag, and CI may not add one.
3. `terminal.input.all`, `terminal.raw-read`, `ui.protocol-register`,
   `debug.control`, and `runtime.plugin-manage` are flagged high-risk: consent
   UI must present them distinctly, and they cannot be granted implicitly by
   workspace configuration or by another plugin's service call. Authority
   follows the requesting plugin, never the calling context.
4. MCP and Agent clients interact with plugins only through the same host
   services, and their default remains read-only per the IPC/MCP contract
   (T-10, R-013). A plugin command invoked by an Agent runs with the plugin's
   grants AND the client's scopes; the intersection applies, and elevation
   requires separate per-client consent.
5. Native in-process plugins remain forbidden (R-017); the capability model
   assumes the restricted-VM runtime and confers nothing on native payloads.

### Grant lifecycle

| Stage       | Accepted behavior                                                                                                                                                                                                                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request     | The manifest declares requested identifiers. Undeclared authority cannot be exercised even if a stale grant record exists.                                                                                                                                                                                                                                     |
| Consent     | First activation prompts once per capability group with: plugin ID, version, the recorded source origin (source verification strength is owned by package integrity and provenance per OQ-022 and is not claimed at consent time), the canonical manifest path and hash, a plain-language effect statement, and the exact scope parameter (for example paths). |
| Persistence | Grants persist as a signed-format-free, user-owned record under the configuration state directory: plugin ID, manifest hash, granted set, decision timestamps, and origin. Content-addressed to the manifest hash.                                                                                                                                             |
| Update      | Any manifest change recomputes the hash. Added capabilities block automatic update and require a permission-diff approval (R-016); unchanged or narrowed sets carry grants forward silently.                                                                                                                                                                   |
| Revocation  | `bitty plugin revoke <id> [<capability>]` and the equivalent plugin-manager action remove grants immediately; the host detaches affected handlers at the next dispatch boundary and reports what was revoked.                                                                                                                                                  |
| Re-grant    | A revoked plugin re-prompts on next activation; a denied decision persists as a denial record so hostile packages cannot re-prompt in a loop.                                                                                                                                                                                                                  |
| Workspace   | Project/workspace configuration may narrow grants but may never add any (system policy cannot be weakened by user configuration, and workspace trust is weaker than user consent).                                                                                                                                                                             |

Prompt-UX constraints (accepted): one dialog per capability family group,
never a single accept-all toggle; high-risk identifiers render with distinct
severity and cannot be pre-checked; the dialog is reachable again from the
plugin manager; consent screens show capability identifiers verbatim so that
review tools and documentation can reference the same symbols.

Options considered for grant storage: (a) inline in the managed manifest
(rejected: mixes desired state with audited decisions, breaks dotfile
portability of intent versus consent), (b) per-capability OS keychain entries
(rejected: poor diffability and no atomic view of one plugin's authority),
(c) a dedicated grant record bound to the manifest hash (accepted: auditable,
diffable, revocation-friendly, and consistent with the path-and-hash approval
pattern the corpus already accepts for project configuration).

## Plugin API v1 surface (OQ-011)

### Surface options considered

| Option                                                              | Trade-offs                                                                                                                                                                                                                      | Verdict                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| A. Minimal kernel: commands plus observation events only            | Smallest review surface and fastest to stabilize, but tabs/status-line-class plugins cannot ship without UI, so the first real ecosystem wave would be blocked or fork private patterns.                                        | Rejected.                                 |
| B. Level 1 plus minimal Level 2 and read-only terminal (accepted)   | Covers the candidate plugin ownership table (tabs, status line, palette, search-style consumers) with declarative UI only; keeps renderer replaceable; defers the two highest-risk areas (presentation replacement, protocols). | **Accepted.**                             |
| C. Full levels 1-4 including presentation replacement and protocols | Maximizes early capability, but level 3 composition rules and level 4 protocol handling are exactly where Terminal Truth and PTY-peer-reachable attack surface live (T-07, T-13, R-008); premature freezing risks a broken v2.  | Rejected v1; revisit as `2.x` candidates. |

### Host namespaces

Illustrative shapes only; final spelling belongs to the core repository and the
generated SDK:

```lua
-- Candidate API shape; nothing here is implemented.
bitty.commands.register(def)          -- composable/unique command registration
bitty.events.subscribe(name, handler) -- manifest-declared event types only
bitty.ui.mount(slot, component)       -- declarative primitives, semantic slots
bitty.services.get(iface, {version = ">=2"})
bitty.terminal.snapshot({scope = "semantic"})  -- read-only, capability-checked
bitty.settings.get/set(schema_path)   -- typed settings owned by plugins.<id>
bitty.store.get/set(key, value)       -- small quota'd key-value state
bitty.notify.show(payload)            -- via platform.notify
```

Accepted v1 rules per namespace:

1. **Commands.** Registration uses qualified names (`xuepoo.markdown:toggle`);
   duplicates (including collisions across plugins) are rejected at graph
   construction, not shadowed. Commands declare parameter schemas and result
   types so CLI, palette, IPC, and Agents reuse one registry, honoring the
   one-executable-registry direction in
   [CLI](../interfaces/cli.md#extension-commands). Commands are the only way a
   plugin contributes invocable behavior; there is no direct hook into internal
   managers.
2. **Key bindings.** Suggestions only, resolved with the accepted precedence:
   explicit user mapping > workspace mapping > first-party/default mapping >
   plugin suggestion. Chord conflicts produce diagnostics for user resolution.
3. **Events.** Subscriptions must match manifest-declared types; subscribing to
   an undeclared type is a registration error. Handlers receive immutable
   event payloads (bounded, redaction-aware) and never live core objects.
4. **UI.** Contributions mount into semantic slots
   (`terminal | top | bottom | left | right | tabline | statusline | overlay`)
   using declarative primitives: text, styled spans, rows/columns, lists,
   popups, and status components in v1. No shaders, pipelines, glyph
   injection, native windows, or global-coordinate drawing. Tabline providers
   are an exclusive claim; status components compose.
5. **Services.** Provider interfaces and versions are declared in the manifest;
   resolution selects a compatible provider or fails before activation. A
   service call crosses a trust boundary: the callee executes with its own
   grants, arguments are validated against the interface schema, and results
   are values, not object handles into another plugin's VM.
6. **Settings.** Plugins read and write only `plugins.<owner>.<name>.*`
   through the typed configuration system (OQ-010 owns merge/reload semantics);
   there is no direct filesystem configuration access in v1.
7. **Storage.** `bitty.store` is a quota-bounded key-value area scoped by
   plugin ID and generation, persisted under the platform data directory.
   Filesystem access beyond this requires explicit `fs.*` grants.

### Terminal access in v1

Read-only semantic snapshots (`terminal.semantic-read`) return bounded,
versioned structures: visible-region text with attributes, cursor position,
mode flags, and semantic-zone metadata derived from OSC 7/133 state. Raw byte
and cell-array access requires `terminal.raw-read`, flagged high-risk. There is
no v1 write path to grid, cursor, modes, or scrollback; the deliberately
unsupported examples in
[plugin system](../extensibility/plugin-system.md#terminal-truth-and-presentation)
stay unsupported. Snapshot responses served to automation surfaces (MCP, Agent)
carry the untrusted-observation-data label required by T-10.

### Lazy loading and replay

Adopting the candidate approach in
[core boundaries](../architecture/core-boundaries.md#command), with the
semantics that document leaves to this RFC:

1. An unloaded lazy plugin registers only a command-to-loader mapping from its
   manifest; help and completion derive from static manifest metadata without a
   VM, matching the CLI contract.
2. First invocation creates the VM, completes activation (including event
   subscriptions and claims), then replays the triggering command once.
3. Failure during activation rejects the invocation with a diagnostic naming
   the plugin; no partially activated state is observable, and the graph
   reservations made at construction time are released or retained atomically.
4. Replay is single-shot: a replayed command that itself triggers the same
   loader is rejected as reentrant. Cancellation of the triggering action
   before replay disposes the created generation.

### Lifecycle and generations

```text
Declared -> Resolved -> Registered -> Activated -> (Suspended) -> Disposed
                                     ^                          |
                                     +------ reload: gen N+1 <--+
```

- Every resource (command, handler, timer, task, UI node, store handle) is
  owned by `(PluginId, generation)`.
- Reload disposes all generation N resources before activating N+1; the old
  generation cannot observe or cancel N+1 except through host-mediated
  handoff of persisted state.
- Handler errors are attributed and isolated: first violations log, sustained
  violations (count/threshold mechanics belong to OQ-014) suspend the handler
  and surface in `bitty plugin doctor`; the host never crashes with the plugin.
- Safe startup: `bitty --safe` skips all third-party plugins and restores the
  minimal built-in configuration (invariant 10, R-009). Plugin absence can
  never prevent boot.
- Suspension (user- or policy-initiated) detaches handlers and releases CPU
  tasks while retaining grants and stored state; disposal releases both.

## Event pipeline (OQ-013)

### Classes and phases

| Class        | Examples (v1 set)                                                                                                                                                                  | Phase relative to state                            | May affect outcome |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------ |
| Lifecycle    | `plugin.activated`, `plugin.suspended`, `plugin.disposed`, `handler.violation`                                                                                                     | Host-internal, delivered to the owning plugin only | No                 |
| Observation  | `terminal.opened`, `terminal.closed`, `terminal.title-changed`, `terminal.cwd-changed`, `terminal.bell`, `focus.changed`, `selection.changed`, `process.exited`, `config.reloaded` | After terminal/configuration state is updated      | No                 |
| Interception | `intercept.command-dispatch`, `intercept.terminal-spawn`, `intercept.paste`, `intercept.open-url`                                                                                  | Before the host performs the user action           | Veto only          |

Accepted rules:

1. The v1 interception set is exactly the four actions above, matching the
   candidate list in
   [core boundaries](../architecture/core-boundaries.md#event). Adding an
   interception point requires a reviewed change; it is never a plugin-visible
   configuration option.
2. Interceptors may **veto or approve**, and nothing else, in v1. Content
   rewriting (modifying paste text or URLs) is excluded because it converges
   toward input injection and OSC-content manipulation; it would need its own
   threat-model entry and consent design.
3. Interception handlers receive bounded metadata (action type, origin,
   sanitized previews), not full payloads. A paste interceptor without
   `clipboard.read` gets length and classification flags, not the text itself;
   this preserves the separate clipboard-consent decision (T-04, R-004).
4. There are no hot-path events. Byte-received, cell-changed, damage,
   glyph-rendered, and similar per-frame/per-byte signals are not expressible
   in the v1 event vocabulary, closing the T-07 callback-storm vector at the
   type level rather than by policy.
5. Semantic-zone and rich-output events (if added) derive from committed
   terminal state and inherit observation-class delivery; they never re-enter
   the parser path.

### Delivery, ordering, batching, and coalescing

1. Each `(plugin, event-type)` subscription gets one bounded, FIFO queue owned
   by the host executor. Producers never block on a subscriber (backpressure
   isolates at the queue boundary, never in the emitting path).
2. Coalescing: events declared coalescable (title/cwd/focus/selection changes)
   collapse to the latest value when the queue holds undelivered copies.
   Non-coalescable events (opened/closed/exited/bell) preserve one-by-one
   delivery up to the queue bound.
3. Queue overflow when a queue is full is a single shared decision point owned
   by [OQ-013](../decisions/open-questions.md); this section is its one
   authoritative statement, and other documents must reference it. Wave-C P1
   decision now accepted: **DropOldest is the v1 default** for UI observation/event
   systems because the consumer converges to latest state (aligned with
   coalescing); **DropNewest remains a documented alternative, not the default.**
   Two policies described:

   - **DropOldest (v1 default):** evict the oldest queued event. Newest signals
     survive, so consumers converge on current state (aligned with coalescing),
     but a sustained burst can discard every early event, losing burst history.
   - **DropNewest (alternative):** refuse each arrival at an already-full queue.
     Already-queued events keep uninterrupted FIFO delivery, but a sustained
     flood starves exactly the newest signals, leaving the consumer behind.

   Under the v1 default DropOldest (and under the DropNewest alternative) drops
   are counted per queue, attributed to the owning plugin, and reported
   cumulatively through `bitty plugin doctor`; silent loss is not permitted, and
   sustained dropping is a diagnosable budget signal feeding the OQ-014
   enforcement work. Runtime default DropOldest is the accepted v1 default
   per OQ-013.

4. Ordering guarantees are deliberately weak: FIFO within one queue, no
   ordering across plugins, and no ordering between observation delivery and
   unrelated user actions. Where an extension point composes (status
   components), declared order rules apply instead of incidental timing.
5. Batch size is bounded (accepted default <= 32 events or 8 KiB of aggregate
   payload per wakeup, whichever is smaller) so one slow consumer cannot turn
   a burst into one oversized callback; batch tuning belongs with OQ-014
   budgets.
6. Three-level queue budgets (accepted, OQ-014, aligned with
   `bitty-plugin-host/src/event.rs` and the
   [Isolation Resource RFC](isolation-resource-rfc.md#proposed-resource-ceilings)
   RC-5 family): **PerSubscription 64 events** per `(plugin, event-type)` queue
   (strict FIFO bound in `EventQueue::push`); **PerPlugin 1024 events / 256 KiB**
   aggregate across all queues of one plugin (enforced at
   `EventPipeline::publish` with the same DropPolicy at the plugin boundary;
   accepted, P0 review required for enforcement tuning); **Global 8192 events / 2 MiB** aggregate
   across all plugins (accepted open item for host admission control; not yet
   hard-gated, exposed via `total_queued_events`/`total_queued_bytes` and
   `bitty plugin doctor`). Per-event payloads are bounded by 8 KiB
   (`EVENT_MAX_BYTES`) and batches by 32 events or 8 KiB per wakeup, both
   enforced via `BoundedText` strict.

### Timeouts and failure policy

| Situation                              | Accepted default                                                                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observation handler exceeds soft limit | Marked late; counted; delivery continues. Soft-limit number is an OQ-014 budget (the 8 ms figure in the plugin corpus is the working candidate).                |
| Interception handler timeout           | **Fail-open:** the host proceeds with the user action without the plugin, records a violation, and disables that handler after repeated violations in a window. |
| Interception handler error             | Treated as abstention: action proceeds; error attributed to the plugin.                                                                                         |
| Multiple interceptors on one action    | All registered handlers run; a single veto vetoes; results are deterministic (veto wins) regardless of handler order.                                           |
| Reentrancy                             | A handler whose action would trigger another interception on the same thread is rejected outright; nested interception is not defined behavior.                 |
| Queue overflow during interception     | Interception is not queued; it runs synchronously at the action point under the hard timeout, which is why the class stays cold-path and rare.                  |

Fail-open is the safe default for availability: a hostile or hung plugin must
not be able to hold paste, URL opening, or command dispatch hostage (the
availability half of T-07). The integrity direction is unchanged: the veto
capability itself is ordinary registered authority, attributable and
revocable.

## Security alignment and traceability

| Accepted element                                           | Normative gate it implements                                                                    | Threat/risk IDs          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------ |
| Deny-by-default capability grammar, no wildcards           | Security overview invariants 2 and capability families; two-domain split (`PluginCapabilities`) | T-06, R-006              |
| Manifest validated before code; fuzz targets; size limits  | P0 testing row; untrusted-input treatment for manifests                                         | T-06, T-12, R-015        |
| Grant record bound to manifest hash; update diff blocks    | Invariant 8 (updates cannot silently add capabilities)                                          | T-12, R-015, R-016       |
| High-risk identifiers with distinct consent                | Raw read/manage/protocol-registration separation in capability families                         | T-06, T-13, R-006, R-008 |
| Read-only semantic snapshots; labeled observation data     | MCP/Agent read-only default; untrusted-observation labeling                                     | T-10, R-013              |
| No grid/cursor/mode write APIs in v1                       | Terminal Truth is core-owned; presentation-only contract                                        | T-13, R-008              |
| No hot-path events; bounded queues; fail-open interception | Invariant 4 (no hot-path execution); budgets/attribution direction                              | T-07, R-007              |
| Exclusive claims for protocol handlers behind capability   | High-risk protocol registration gate                                                            | T-06, R-008, R-017       |
| Generation disposal and safe-mode skip                     | Recoverability; `bitty --safe`                                                                  | R-007, R-009             |
| No native payloads recognized by the platform model        | Native in-process plugin prohibition through P0/P1                                              | R-017                    |
| Service calls cross a validated trust boundary             | No ambient authority via composition; authority stays with the requesting plugin                | T-06, R-006              |

Rich rendering itself (Markdown-to-constrained-AST, no scripts) remains
governed by the rich-content and structured-transport questions (OQ-015/OQ-016,
R-021); this RFC only ensures plugin-contributed UI uses the same declarative,
non-HTML primitives.

## Verification plan

Acceptance of the implemented contract later requires, at minimum:

1. Conformance tests per host namespace: registration rejection cases
   (duplicate qualified names, undeclared event subscriptions, unknown
   capability identifiers), lazy-load replay, replay reentrancy rejection, and
   generation disposal completeness.
2. Negative capability tests: every family denies by default; revocation takes
   effect at the next dispatch boundary; high-risk identifiers cannot be
   granted through workspace configuration or service indirection.
3. Manifest fuzzing: structure-aware fuzz corpus for the TOML schema covering
   oversized, malformed, duplicate-key, and deep-nesting inputs with
   panic-free recovery.
4. Event-pipeline property tests: queue bounds never exceeded, producers never
   blocked, coalescing correctness, drop accounting accuracy, interception
   fail-open under injected hangs, veto-wins determinism.
5. Safe-mode and recovery tests: boot with hostile third-party plugins
   installed (looping, allocating, veto-spamming) still reaches a usable
   terminal via `bitty --safe`.
6. Update-permission tests: capability-increasing updates block pending
   approval; narrowed updates carry grants; revocation survives update.

Mechanisms and numeric budgets for instruction/memory/task enforcement are
owned by OQ-014 and are prerequisites for shipping, not for accepting this
contract.

## Open points

Deliberately unresolved at acceptance time. The following remain Open as
follow-up work and do not block closure of OQ-011/OQ-012/OQ-013, which are
closed at the design level on 2026-08-27. Acceptance recorded per independent
review with security-auditor; residual items are tracked below:

1. Exact soft/hard timeout milliseconds and remaining queue tuning (accepted
   defaults above are the accepted contract, including three-level budgets
   PerSubscription 64 / PerPlugin 1024 events/256 KiB / Global 8192 events/2 MiB
   aligned with `bitty-plugin-host/src/event.rs`; OQ-014 owns runtime
   enforcement tuning).
2. Whether presentation replacement (level 3) and protocol registration
   (level 4) enter as `1.x` additions or wait for `2.0`, and the decoration
   composition/ordering representation.
3. Side-by-side service version policy: one selected provider versus multiple
   concurrent versions per interface.
4. Alternate-screen restrictions on observation payloads (what a snapshot
   contains while a full-screen TUI owns the grid).
5. Exact safe-mode component set: which first-party plugins, if any, remain
   active under `--safe` (OQ-002).
6. Signing and provenance display in the consent UI, pending the supply-chain
   RFC (OQ-022); the consent screen currently assumes source verification
   happened upstream.
7. Notification-rate and title-event rate limits as host policy versus
   capability parameters.
8. Whether configuration scripts (init.lua) and runtime plugins converge on
   this exact capability model or a restricted profile of it; the corpus keeps
   this open, and this RFC does not force user-trusted code into the
   third-party grant flow.
9. Drop policy follow-up: Wave-C P1 decision DropOldest as the v1 default
   is now the accepted contract for UI observation/event systems (consumer
   converges to latest state); DropNewest remains a documented alternative.
   Runtime default DropOldest is the accepted v1 default per OQ-013; resource
   budgets elsewhere reference the single authoritative statement in
   [Delivery, ordering, batching, and coalescing](#delivery-ordering-batching-and-coalescing)
   instead of fixing a policy of their own.

## Acceptance criteria

This RFC is accepted on 2026-08-27 and closes OQ-011, OQ-012, and OQ-013. The
following criteria were satisfied per the
[open-question register](../decisions/open-questions.md) rules:

1. Independent review by the category owner, a docs curator, and a security
   reviewer accepted the contract, including every high-risk identifier and the
   interception set.
2. Affected documents were synchronized in the same change: the capability
   examples and pending-decision notes in
   [core boundaries](../architecture/core-boundaries.md) and
   [plugin system](../extensibility/plugin-system.md) reference the accepted
   identifiers, and the open-question rows moved from pointer to closure.
3. No element weakens a normative P0 gate; any discovered conflict returns the
   conflicting clause to revision rather than downgrading the gate.
