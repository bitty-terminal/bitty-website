---
title: Plugin Roadmap
description: Draft sequencing for first-party bundled plugins and featured plugins with privacy and mechanism/policy split
category: product
audience: contributor
document_type: overview
status: draft
website_publish: false
sidebar_order: 22
---

# Plugin Roadmap

> Status: **draft** as of 2026-08-29. This document is a planning draft for
> sequencing first-party and featured plugins on top of the accepted
> [Plugin Platform RFC](../specifications/plugin-platform-rfc.md)
> (OQ-011, OQ-012, OQ-013, accepted 2026-08-27) and the
> [Default Distribution RFC](../specifications/default-distribution-rfc.md)
> (OQ-002, accepted 2026-08-29). It does not describe implemented behavior,
> does not claim any plugin is shipped, and does not authorize stable,
> normative, or compatibility-guaranteed behavior. The lifecycle is
> `Draft -> experimental review evidence -> Accepted -> normative`; acceptance
> authorizes an accepted design constraint, while implementation and release
> require separate implementation evidence and applicable verification and
> release gates.

## Purpose and scope

This roadmap answers: _which first-party plugins should validate the Plugin
API v1 boundary first, which featured plugins should follow, and what
constraints govern them?_ It links the
[Product vision](vision.md) (small core, stable API, everything composable),
[Core and Plugin Boundaries](../architecture/core-boundaries.md)
(mechanism/policy split, observation vs interception, declarative UI,
generation lifecycle), and the
[Security overview](../../../security/overview.md) trust posture to concrete plugin
sequencing.

In scope: the bundled-disabled first-party set that dogfoods Plugin API v1
(shell integration, workspace, statusline, palette, project, file manager,
git panel, browser panel, AI panel, mail panel), future dogfood
candidates such as splits and search, the featured second wave (pet, activity,
contributions to knowledge graph, peek, mirror, lock, scratchpad), their
mechanism vs policy split, capability sketches, privacy posture
(`store_command_args: false` by default), and dogfood validation signals.

Out of scope (owned elsewhere):

- Plugin API surface, manifest grammar, grant lifecycle, and event pipeline
  classes, budgets, and fail-open rules (OQ-011/OQ-012/OQ-013,
  [Plugin Platform RFC](../specifications/plugin-platform-rfc.md)).
- Bundling vs enabling distinction, distribution pinning, five disable
  surfaces, and safe-mode precedence (OQ-002,
  [Default Distribution RFC](../specifications/default-distribution-rfc.md)).
- Per-plugin instruction, memory, task, and queue budgets and their
  enforcement (OQ-014,
  [Isolation Resource RFC](../specifications/isolation-resource-rfc.md)).
- Configuration pipeline, layer precedence, and project trust
  (OQ-010, [Configuration Model RFC](../specifications/configuration-model-rfc.md)).
- Rich block, scene, semantic zone, and structured transport contracts
  (OQ-008/OQ-015/OQ-016,
  [Rich Presentation RFC](../specifications/rich-presentation-rfc.md)).
- Panel container semantics, Panel Runtime, and inter-Panel Event Bus; these
  remain candidate work described by the future Panel Extensibility Vision
  document (CTX-0094, pending review) and draft
  [Workspace Compositor](../specifications/workspace-compositor.md).

No new trust boundary is introduced. Every plugin below uses the same
capability-checked, generation-scoped, bounded-queue host as any community
plugin; there is no first-party bypass flag and CI may not add one.

## Normative sources this roadmap must not weaken

- [Product vision](vision.md): an official distribution may bundle
  first-party plugins, but bundling does not change their status as plugins;
  first-party and community plugins use the same API, permission model, and
  lifecycle so that first-party use continually validates boundary
  completeness.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md):
  mechanism/policy split, declarative UI, generation disposal, two security
  domains (`TerminalSecurityPolicy` vs `PluginCapabilities`), and the
  governing boundary that plugins may alter presentation but must not alter
  terminal truth.
- [Plugin system](../extensibility/plugin-system.md): extension levels
  1-4, register vs claim, qualified naming, key-binding precedence
  (explicit user > workspace > first-party/default > plugin suggestion),
  and the six architecture properties (isolation, determinism, ownership,
  composability, observability, recoverability).
- [Default Distribution RFC](../specifications/default-distribution-rfc.md):
  bundled-disabled by default (empty enabled set at `v1`), five disable
  surfaces with `bitty --safe` unconditional precedence, generation disposal
  and budget reclaim, and promotion criteria for any future
  enabled-by-default addition.
- [Security overview](../../../security/overview.md) and
  [Threat model](../../../security/threat-model.md): invariants 2, 3, 4, 8, 9, 10,
  PTY and package inputs as untrusted, secret-minimizing traces, and the
  requirement that MCP and Agent access is read-only with terminal content
  as untrusted observation data.

Where this roadmap picks concrete plugin sets or defaults, it refines the
candidate material above; it does not move a requirement between owners or
relax a gate.

## Guiding principles

1. **Mechanism vs policy split is authoritative.** Core owns mechanisms and
   invariants (PTY/ConPTY, VT parser, grid and damage, layout primitives
   `LayoutNode`, scene/render snapshots, `ImageStore`, semantic zones from
   OSC 7/133, command and event registries, capability and budget gates).
   Plugins own policy and experience (when to split, tab presentation,
   search UX, palette filtering, status composition, which command arguments
   to retain). See
   [Core and Plugin Boundaries](../architecture/core-boundaries.md#mechanism-and-policy-examples)
   and [Product vision](vision.md#core-manages-mechanisms-plugins-manage-policy).
2. **First-party dogfoods the public boundary.** Bundled plugins are
   `bitty-terminal.*` under the same `bitty-plugin.toml`, capability
   grammar, grant lifecycle, and generation model as any community plugin.
   If a bundled plugin needs a private API, the boundary is incomplete and
   the plugin must not ship until the API is promoted via an RFC.
3. **Bundled does not mean enabled.** Per the Default Distribution RFC, the
   `v1` enabled set is empty: a fresh install with no user configuration
   starts core only, identical to `bitty --safe`. First-party plugins are
   staged as ready-to-enable artifacts; enabling is an explicit user action
   with capability consent and the permission-diff gate (R-016) for
   capability-increasing updates.
4. **Privacy by default for activity.** The activity plugin defaults to
   `store_command_args: false`. No raw command lines, no argument text, and
   no derived secrets are persisted without an explicit opt-in. See the
   `Privacy-first activity: store_command_args: false` subsection below
   and the secret-minimizing invariant 9.
5. **Featured plugins are install-time, not distribution-time.** Pet,
   activity, contributions to knowledge graph, peek, mirror, lock, and
   scratchpad are not bundled. They are installed via the package manager
   from the same integrity chain (manifest validation, lock, checksum, no
   install scripts) and activated through the same staged lifecycle.

6. **First-party proves the public contract.** First-party plugins use the same
   public API, manifest format, capability grants, and lifecycle as community
   plugins. A private API is evidence of an incomplete boundary, not a reason
   to add an exception. Their role is to dogfood the boundary after a usable
   terminal exists, not to pull application policy into Core.
7. **Mechanisms are not applications.** Core provides terminal truth, layout and
   panel primitives, routing, bounded events, and policy gates; plugins choose
   workflows and presentation. Users pay only for what they use: bundling a
   disabled plugin adds no active VM, queue, handler, or resident application
   cost, and enabling it charges the plugin's attributable budgets.

## First-party wave: bundled, disabled, dogfooding Plugin API v1

Candidate target: `v0.1.0` maturity slice per
[Proposed Delivery Sequence](proposed-delivery-sequence.md) and
[Release Ladder](release-ladder.md) (maturity label, not a date promise);
acceptance still requires the RFC-linked verification gates below.

Distribution presence follows the Default Distribution RFC staged-store model
(candidate layout `distribution/plugins/store/bitty-terminal.<name>/<version>/`
with `distribution.toml` and `checksums.sha256`, PB-5 `<= 40 MiB` cap).
Bundled presence alone creates zero VM, queue, or handler cost until
explicitly enabled.

The canonical v1 catalog is `all_bundled_manifests()` in
`crates/bitty-plugin-host/src/bundled.rs` (`bitty` revision `b761c03`): ten
bundled-disabled manifests built from the same public `PluginManifest` types a
third-party `bitty-plugin.toml` uses, with no private channel. The table below
is synced to that catalog. `bitty-terminal.workspace` is canonical and
`bitty-terminal.tabs` remains a deprecated alias (removal `>= v0.2.0`). The
first-party runtime implementations that exercise these manifests live in
`crates/bitty-runtime` as review evidence; manifest presence is not shipped
plugin behavior.

Synchronization note: the accepted
[Default Distribution RFC](../specifications/default-distribution-rfc.md) bundled list
was revised on 2026-09-13 (CTX-0170) to the ten-plugin code catalog and the
`workspace` rename, retaining the earlier five-plugin set as history in that
RFC's
[superseded set](../specifications/default-distribution-rfc.md#superseded-bundled-set-2026-08-29).
This roadmap and the RFC now describe the same catalog. Point-in-time
citations in the pre-studies (for example
[Browser and Agent Panel Integration Pre-Study](../specifications/browser-agent-pre-study.md))
stay as committed-snapshot references.

| Plugin ID                          | Policy owned by the plugin                                                                                             | Core mechanism relied on                                                             | Capability sketch (illustrative)                                                                                                                                | Dogfood validation signal                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `bitty-terminal.shell-integration` | OSC 7/133 semantic zones, cwd and title propagation, prompt and command-region marks, fail-closed fallback when absent | VT parser OSC 7/133 derivation, semantic zones, `ImageStore` anchor fallback         | `terminal.semantic-read` read-only                                                                                                                              | Zones consumed by search, statusline, and peek without plugin-side VT parsing; absence degrades gracefully                          |
| `bitty-terminal.workspace`         | Workspace commands, workspaceline presentation, ordering, key bindings, and closing policy                             | `LayoutNode` and split primitives, workspaceline exclusive claim, status composition | `ui.rich` or status-component slot plus `workspaceline` claim                                                                                                   | Exclusive claim validated: duplicate claim rejected, not last-wins; close policy observable via `bitty plugin doctor`               |
| `bitty-terminal.statusline`        | Presentation of cwd, mode, Git and task state, status component composition policy                                     | Statusline slot composition, semantic snapshot, zone metadata from shell integration | `terminal.semantic-read`, status-component composition                                                                                                          | Composition validated: many providers compose, ordering explicit, no ambient capability via composition                             |
| `bitty-terminal.palette`           | Command palette and picker UI, fuzzy filtering, preview presentation                                                   | Command registry, overlay slot, declarative list and text primitives                 | `ui.overlay`                                                                                                                                                    | Validates palette as overlay composition using declarative primitives only, no shader or native window path                         |
| `bitty-terminal.project`           | Project discovery and session presentation                                                                             | Constrained project discovery and session metadata                                   | `fs.read:PROJECT_GLOB` constrained                                                                                                                              | Validates project-scoped discovery and session presentation without widening trust or filesystem authority                          |
| `bitty-terminal.file-manager`      | Tiled Panel file manager with constrained `fs.read` and optional `fs.write`                                            | Panel Runtime, `ViewContent::Panel(PanelId)`, semantic snapshot                      | `panel.provider`, `panel.create`, `terminal.semantic-read`, `fs.read:~/projects/**`, optional `fs.write:~/projects/**`                                          | Validates a P1 tiled panel with path-scoped grants and bounded `8 KiB`/`32`/`64` payloads                                           |
| `bitty-terminal.git-panel`         | Tiled Panel git branch/status/diff/log presentation                                                                    | Panel Runtime plus allowlisted `process.spawn:git` under manifest `[tools.git]`      | `process.spawn:git` allowlisted, `panel.provider`, `panel.create`, `terminal.semantic-read`                                                                     | Validates CLI reuse (Layer 2) against an allowlisted binary with bounded output under `[tools.git]` argv                            |
| `bitty-terminal.browser-panel`     | View `Browser(BrowserSurfaceId)` plus tiled Panel placement and navigation policy                                      | Browser surface contracts plus Panel Runtime                                         | `browser.embed`, `browser.navigation`, `browser.file-url`, `browser.storage`, `network.connect:...:443`                                                         | Validates Browser view plus Panel composition with a default `https` allowlist and bounded BA-1..BA-3 surfaces                      |
| `bitty-terminal.ai-panel`          | Agent panel surface: chat, tool invocation, memory and consent presentation with an ephemeral workspace                | Panel Runtime, MCP tool bus, `AgentId` context budget contract                       | `ai.provider`, `ai.stream`, `ai.model`, `agent.context.terminal`, `agent.context.workspace`, `agent.memory:persist`, `mcp.invoke:read_file`, `mcp.invoke:fetch` | Validates agent surfaces on generic primitives, and the CP-5 per-turn context contract, and bounded memory without core AI coupling |
| `bitty-terminal.mail-panel`        | Mail triage panel: list, read, search, and send policy through MCP and explicit network endpoints                      | Panel Runtime, MCP adapter, `network.connect` host:port allowlist, scoped `fs`       | `mcp.invoke:mail.list/read/search/send`, `network.connect:imap.example.com:993`, `network.connect:smtp.example.com:465`, `fs.read`/`fs.write:~/mail/**`         | Validates a P3 panel that needs explicit endpoint grants and remains disabled on a fresh install without consent                    |

Accepted rules for this wave:

- Each plugin declares its capabilities in `bitty-plugin.toml` using the
  closed grammar from the Plugin Platform RFC; unknown identifiers fail
  validation, no wildcards, no allow-all.
- Key bindings are suggestions resolved by the accepted precedence
  (explicit user > workspace > first-party/default > plugin suggestion);
  chord conflicts are diagnosed for user resolution, never shadowed.
- All handlers are observation-class only; no parser, render, or input
  hot path is entered, per invariant 4 and the Platform RFC hot-path
  exclusion.
- Every plugin supports lazy triggers (`commands`, `events`, `claims`) so
  help and completion derive from static manifest metadata without a VM,
  per the lazy loading and replay contract.
- Disable reclaims every `(PluginId, generation)` resource and returns
  RC-1/RC-2/RC-4/RC-5 counters toward baseline before reporting success,
  matching the Distribution RFC generation-disposal and PB-3 15% reclaim
  criterion.

## Statusline and shell-prompt boundary

The bundled `bitty-terminal.statusline` is terminal-owned chrome: a
waybar/Hyprland-class status surface that occupies a terminal UI slot (the
statusline/workspaceline slot) and presents terminal and workspace state such
as cwd, mode, Git and task state from the semantic snapshot. It is not a shell
prompt.

Starship, Oh My Posh, Powerlevel10k, and similar tools are shell-prompt
producers: the shell renders their Unicode/ANSI output inside the terminal
grid as ordinary VT content. The surfaces are distinct and have different
owners, so "statusline replaces starship" is not the accepted relationship.
Bitty's obligation toward starship-class prompts is faithful rendering, not
substitution; the terminal-side compatibility checklist for those prompts is
maintained in
[Shell and TUI compatibility](../extensibility/plugin-system.md#shell-and-tui-compatibility).

The recorded user direction (2026-09-13, bitty `CTX-0377`) is that the
statusline is a good design that _may eventually_ carry starship-class
information, while starship-class prompts still require perfect terminal
compatibility. Whether the statusline should absorb prompt-class presentation
is undecided and is tracked as
[OQ-079](../../../decisions/open-questions.md); this roadmap records the possibility
without converging the two surfaces.

## Independent-plugin migration direction (candidate)

Status: **candidate, non-normative**. Bundled-disabled and independent are
distribution states, not privilege tiers: an independent first-party plugin
goes through the same manifest validation, deny-by-default capability consent,
permission-diff gate, lazy triggers, and `bitty --safe` skip as any third-party
plugin, with no private channel.

The candidate direction is to publish the complex first-party plugins as
**independently versioned first-party packages** instead of shipping their
manifests inside the binary catalog, so each can update on its own cadence and
so the public Plugin API is pressure-tested by real consumers:

| Candidate for independence                  | Rationale                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------- |
| `bitty-terminal.statusline` (workspaceline) | Presentation policy evolves fastest; users may prefer alternatives or compose their own |
| `bitty-terminal.palette`                    | Picker UX and fuzzy behavior benefit from independent iteration                         |
| `bitty-terminal.file-manager`               | Panel UX surface with filesystem grants that should stay separately consensual          |
| `bitty-terminal.git-panel`                  | Wraps an external tool/toolchain that drifts independently                              |
| `bitty-terminal.browser-panel`              | Heavy optional surface with its own backend and platform risks                          |
| `bitty-terminal.ai-panel`                   | AI provider/model churn outpaces terminal releases                                      |
| `bitty-terminal.mail-panel`                 | Niche optional surface with explicit network endpoint grants                            |

Candidate invariants if this migration is accepted:

- Plugin IDs, capability identifiers, and grant records do not change with the
  move; a migrated plugin keeps its `bitty-terminal.*` identity.
- Shell integration and the workspace core remain bundled because other
  plugins and core surfaces consume their observations and claims; whether any
  other plugin must remain bundled is part of OQ-053.
- The accepted package lifecycle (signature/provenance, lockfile, atomic
  activation, rollback) governs independent distribution; the bundled catalog
  shrinks rather than gaining a second distribution mechanism.
- Fresh-install behavior stays staged-and-disabled; migration must not turn
  "previously bundled" into "implicitly enabled".

Tracked as [OQ-053](../../../decisions/open-questions.md).

### Bundled-plugin suitability rules (candidate)

Status: **candidate, non-normative**; extends the migration candidates above
and stays subject to OQ-053.

Decision rule for where a bundled plugin's work belongs:

- **Pure Lua** when the work is presentation plus CLI or service glue:
  bounded, low-frequency, owns no layout or geometry, and parses no VT input
  stream at input rate. This covers statusline, palette, project,
  file-manager, git-panel, and mail-panel.
- **Core** when the plugin owns layout lifecycle or persistence
  (workspace/tabs: session restore and panel geometry are Core mechanisms),
  parses terminal bytes at input rate (shell-integration: OSC 7/133 parsing
  must stay in the Rust parser and term-state; plugins are read-only
  observers), or needs native GPU, process, or platform integration
  (browser-panel, and future video).
- **Hybrid** when a Core mechanism feeds a Lua policy (ai-panel: Core owns
  bounded snapshots, semantic-zone context, and MCP transport; Lua owns chat
  UI, history, and commands).

The parity rules above are unchanged: migration shrinks the bundled catalog
without granting capabilities or enabling anything implicitly.

### Streaming statusline components (candidate)

Status: **candidate, non-normative**.

- **Low-frequency components** (music metadata from MPD) should be
  event-driven: an async `mpc idle player` subscription wakes only on change
  and pushes one event-bus update to the statusline fragment, so idle cost is
  zero.
- **High-frequency components** (an audio spectrum from cava at 30-60 Hz
  through a raw FIFO) must not be treated as ordinary statusline text
  recomputation. Either the host exposes an isolated streaming component with
  per-cell damage isolation (only the cells it owns are dirtied), or the user
  runs the native tool in a normal split view, which needs no plugin work and
  uses the full GPU path.
- **Open parts.** Streaming-component registration and slot claims, the
  per-cell damage budget and coalescing, the drop policy under backpressure,
  and lifecycle (stop when hidden or when the producer exits) are undecided.
  Tracked as [OQ-082](../../../decisions/open-questions.md).

## Secrets and credential handling direction (candidate)

Status: **candidate, non-normative**, except where it restates
[ADR 0006](../../../decisions/adrs/ADR-0006-os-env-policy.md), which is accepted and
authoritative.

Accepted baseline that this direction must not weaken:

- `os.getenv` is denied in every Lua VM with a typed denial, not a silent
  `nil`; the only read path is the host-mediated `bitty.env.get` filtered
  snapshot, and per-plugin reads require a declared `env:<KEY>` (or
  `env:BITTY_*` patterned) capability plus user consent and audit.
- The Lua host constructs its standard library without `io`, `debug`, or
  package ambient authority, so plugins cannot read or write `.env` files
  through Lua, and cannot mutate the host environment.
- Environment-derived values are typed sensitive data: diagnostics and traces
  quote the key and presence, never the value, and audit events record
  `timestamp`, `vm_class`, `key`, `granted`, and `caller_location` without the
  value.

Candidate secret-storage tiers (none implemented today; each needs its own
review and consent contract):

| Tier                        | Shape                                                                                             | Candidate use                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Host-consumed environment   | The Rust host reads an allowlisted variable and never exposes it to Lua                           | CI and developer shells that already export   |
| `secrets.env` (mode `0600`) | `$XDG_CONFIG_HOME/bitty/secrets.env`, host-parsed, never Lua-readable, values redacted in outputs | Local API keys without an OS keyring          |
| OS keyring                  | Platform credential store (for example Secret Service, Keychain, Credential Manager)              | Desktop default when available                |
| Command references          | `pass show <path>` / `op read <ref>` style argv executed by the host after consent, stdout only   | Users who already manage secrets in a manager |

Candidate rules for any tier: values resolve on the Rust side only; Lua and
plugins receive redacted handles or nothing; the consent ledger records which
`(PluginId, generation)` or `(AgentId, generation)` requested which key and
when; a failed or absent resolution is fail-closed, never an empty-string
fallback; and `.env` files are never read or written by Bitty on behalf of
Lua. Tracked as OQ-054 and OQ-055.

## Plugin capability dimensions (candidate)

Status: **candidate, non-normative**; accepted baselines are noted where they
exist.

The plugin platform already accepts manifest capabilities, deny-by-default
grants, lazy triggers, the three-level queue budgets, and provided/required
services. Five capability dimensions are candidates for explicit contracts as
the first-party wave grows:

1. **Semantic UI slots** — status components, overlay slots, and exclusive
   claims exist in the accepted surface. Candidate extension: a documented slot
   inventory with per-slot bounds and conflict resolution so overlay/status
   composition stops being implicit.
2. **Presentation projection** — plugins may observe semantic zones and
   propose projections (fold state, hints, summaries) but never mutate
   Terminal Truth. Candidate contract: a projection API that returns bounded
   presentation data and cannot write state; relates to OQ-050 and OQ-051.
3. **Workspace policies** — workspace/tab ordering, naming, and close policy
   are first-party plugin policy today. Candidate contract: which workspace
   policies are plugin-declarable and which remain Core-owned.
4. **Events and automation** — observation-class events plus lazy command
   triggers are accepted. Candidate contract: whether any bounded
   automation action class (not just observation) is grantable, and how
   action-class plugins stay out of the hot path.
5. **Cross-plugin service bus** — provided/required services and versions are
   accepted. Candidate contract: multiplicity, version negotiation, and
   failure isolation rules for services with multiple consumers; the
   contributions/knowledge-graph open question is a concrete case.

Tracked as [OQ-056](../../../decisions/open-questions.md); it does not re-litigate
OQ-044/OQ-049 (appearance) or the accepted Plugin Platform RFC surface.

## Featured wave: install-time plugins that exercise the boundary

Featured plugins are not part of the distribution. They are the second wave
that proves the boundary is complete for the experiences the Product vision
places in plugins.

| Plugin                           | Experience                                                                                                                                      | Core surface exercised                                                                                                                                  | Why second wave                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| pet                              | Delightful companion overlay that reacts to terminal activity without blocking input                                                            | Overlay slot, declarative animation primitives, observation events (`terminal.bell`, `focus.changed`, `process.exited`), `bitty.store` quota            | Exercises long-lived overlay composition and attributable idle budgets without an enabled-by-default claim     |
| activity                         | Privacy-first local activity timeline: command count, cwd and duration aggregates, no argument capture by default (`store_command_args: false`) | Observation events (`terminal.cwd-changed`, `terminal.title-changed`, `process.exited`), shell-integration zones, `bitty.store` bounded key-value state | Validates privacy defaults and secret-minimizing local persistence distinct from telemetry                     |
| contributions to knowledge graph | Turns a contributions view into an incrementally built local knowledge graph (files, commits, docs links) using explicit user scope             | `fs.read:PATTERN` with path globs, `terminal.semantic-read` for link detection, service provision (`knowledge.query` interface)                         | Exercises the service-version contract and path-scoped `fs` grants with real consumer/provider multiplicity    |
| peek                             | Hover and preview of file, symbol, or commit context anchored to a semantic zone or rich block without entering grid geometry                   | Rich blocks and `BlockAnchor`, semantic zones, overlay slot, `terminal.semantic-read`                                                                   | Validates anchor and zone composition; enforces alternate-screen default-off rule for rich presentation        |
| mirror                           | Reflects a view of one terminal's committed state into another view for review, driven by bounded semantic snapshots                            | `terminal.semantic-read` snapshots, scene composition, non-blocking observability pipeline                                                              | Exercises snapshot versioning and the bounded, non-blocking publisher contract without raw-byte streaming      |
| lock                             | Session lock and re-authentication policy UX, scoped to the window or workspace                                                                 | Overlay slot, command interception cold path (`intercept.command-dispatch` veto), generation lifecycle                                                  | Exercises the four-point interception set and fail-open timeout; content rewriting excluded in v1              |
| scratchpad                       | Ephemeral per-directory notes anchored to cwd or session, persisted only in plugin quota                                                        | `terminal.semantic-read` for cwd, `bitty.store` quota, status-component presentation                                                                    | Validates quota-bounded storage and generation-scoped ownership; filesystem beyond quota requires `fs.*` grant |

Featured plugins reuse the same mechanism vs policy split: core provides
snapshots, zones, blocks, overlays, intercept veto points, and budget gates;
each featured plugin decides filtering, ranking, retention, and presentation
policy within its declared capabilities.

## Post-v1.0 Panel ecosystem candidates

The future Panel Extensibility Vision document (CTX-0094, pending review)
describes Panel as a candidate workspace-managed application container that
generalizes View content. It is not an OS Window or a PTY. A future Panel RFC
must define the
Panel lifecycle, Panel Runtime, and inter-Panel Event Bus before any provider
or ecosystem surface can be treated as an implementation target.

Accordingly, the following are post-v1.0 candidates with no date or publication
promise:

- Panel providers for terminal, files, Git, Markdown, browser, logs, and AI
  workflows, using the same capability, lifecycle, and resource controls as
  other plugins.
- Optional WebView, native-hosted declarative UI, and CLI adapter paths,
  subject to the capability and isolation review required by the [IPC and
  Agent RFC](../specifications/ipc-agent-rfc.md).
- Distribution presets such as `bitty-minimal`, `bitty-dev`, `bitty-cloud`,
  and `bitty-social`, plus community layouts and plugin collections. Presets
  must remain explicit bundles over the accepted [Default Distribution RFC](../specifications/default-distribution-rfc.md)
  mechanism and must not imply enabled-by-default plugins.

This list records ecosystem direction only. It does not add a Panel API,
distribution manifest, runtime, Event Bus, or implementation claim.

### Privacy-first activity: `store_command_args: false`

- **Default:** `plugins.bitty-featured.activity.store_command_args = false`.
  The plugin records only: timestamp (coarse), cwd hash or redacted path
  per path policy, exit status class, duration bucket, and command name
  hash where needed for local aggregation. Raw argument vectors, piped
  content, clipboard, and environment are not stored. This follows the
  secret-minimizing requirement (invariant 9) and the privacy default in
  this roadmap.
- **Opt-in:** Setting `store_command_args = true` is an explicit per-user
  (not per-workspace) opt-in, stored as a typed setting under
  `plugins.bitty-featured.activity.*`, with consent re-presented as a
  distinct severity decision. Workspace or cloned-repository configuration
  may not widen this to `true` (narrowing only, per the Distribution RFC
  and Configuration Model RFC project-trust rule, T-08).
- **Redaction and limits:** Any stored text is bounded (`BoundedText`
  discipline, `8 KiB` per payload, aggregate `256 KiB` per plugin per
  RC-5), typed as sensitive where applicable, and subject to user-only
  file permissions and retention limits (candidate: 7 days default, user
  configurable, truncate-oldest on overflow). No network exfiltration,
  no ambient clipboard read, and no blended telemetry; the plugin is
  local-observation only.
- **Transparency:** `bitty plugin doctor` and an activity-specific status
  component surface active retention, stored-field list, and quota use;
  `bitty debug/trace` redaction policy applies to exported traces.

The same mechanism vs policy split applies here: core owns the bounded
storage, trace redaction, and capability gate; the activity plugin owns the
retention and aggregation policy within those mechanisms.

## Capability and security notes

- Every plugin above passes through the identical deny-by-default
  capability model (no wildcards, path and destination parameters attached
  to identifiers). Official and featured plugins have no private channel.
- High-risk identifiers (`terminal.input.all`, `terminal.raw-read`,
  `ui.protocol-register`, `debug.control`, `runtime.plugin-manage`) are
  not requested by any first-party or featured plugin in `v1` and, where
  relevant, cannot be granted implicitly by workspace configuration or by
  service indirection.
- Installing or updating any featured plugin runs no package code; the
  staging step executes only manifest validation, compatibility checks, and
  checksum verification, per invariant 8 and R-015/R-016. Capability-
  increasing updates block pending permission-diff approval.
- `bitty --safe` always reaches a usable terminal with zero third-party
  VMs, regardless of which bundled or featured plugins are enabled
  (invariant 10, R-009).

## Performance and budget alignment

- Bundled-disabled plugins do not affect PB-1 (`<= 100 ms` p50 cold
  start), PB-2 (`<= 80 MiB` idle one window), PB-7 (`<= 1%` CPU idle),
  or the distribution cap PB-5 (`<= 40 MiB`). Budgets are core-only until
  a plugin is explicitly enabled, per the Distribution RFC.
- Any proposal to move a first-party plugin to enabled-by-default carries
  the six promotion criteria from the Distribution RFC (lightweight budget
  proof, capability minimality, failure isolation, hot-path exclusion,
  explicit disable preservation, independent security and docs-curator
  sign-off).
- Per-plugin costs once enabled are charged to RC-1 through RC-5
  (instructions and wall clock, memory, tasks and timers, three-level
  queues) with attribution and `bitty plugin doctor` visibility; queue
  overflow follows the DropOldest default (consumer converges to latest
  state) with counted and reported drops, per the Platform RFC OQ-013
  contract.

## Dogfood validation signals

First-party plugins must validate that the extension boundary is complete
without private APIs. Minimum signals before a bundled plugin is considered
`Implemented` for its slice:

- Manifest and capability round-trip: static graph construction rejects
  duplicate qualified names, unknown capabilities, and undeclared event
  subscriptions; lazy help and completion work without a VM.
- Register vs claim semantics: `workspace` workspaceline claim exclusivity
  (legacy `tabline` alias included) and `statusline` composition both behave
  as specified, with diagnostics instead of load-order shadowing.
- Observation-only verification: fuzz and property tests show no parser,
  render, or input hot-path callback registration for any first-party
  plugin.
- Generation and disable completeness: enabling then disabling reclaims all
  `(PluginId, generation)` resources and RC-5 queues before success is
  reported; `disable --all` disposes every non-core generation.
- Safe-mode parity: with every bundled plugin enabled and fault-injected
  (looping handler, allocating, veto-spamming), `bitty --safe` still
  reaches a usable terminal with zero third-party VMs.

Featured plugins add: service resolution with version selection, path-
scoped `fs` grants resolved against real paths with symlink and device
rejection, bounded activity retention with `store_command_args: false` as
the verified default, and interception fail-open under injected hangs
(`lock`) with veto-wins determinism.

## Verification plan

Acceptance of an implemented slice later requires at minimum, reusing the
verification plan alongside the
[Plugin Platform RFC](../specifications/plugin-platform-rfc.md#verification-plan)
and
[Default Distribution RFC](../specifications/default-distribution-rfc.md#verification-plan):

1. Conformance and negative-capability tests per host namespace, hosted by
   the staged first-party set.
2. Interception fail-open and veto-wins property tests for the `lock`
   contribution.
3. Search bounded-snapshot correctness and scrollback-anchor stability
   across resize.
4. Activity privacy tests: default `store_command_args: false` is the
   persisted and effective value, workspace config cannot widen it, and
   stored fields respect bounds, redaction, and retention.
5. `bitty plugin doctor` attribution: every queue drop, budget suspension,
   and grant is attributed and surfaced, with deterministic conflict
   reporting.
6. Distribution integrity: tampered checksum or incompatible
   `compat.bitty` and `plugin-api` ranges reject the distribution whole
   before activation.

## Open questions (not silently chosen)

1. Exact `distribution.toml` name and staged-store layout (candidate
   `plugins/store/` vs content-addressed store, pending the distribution
   follow-up).
2. Whether a distribution preset (for example `bitty plugin preset enable
minimal-ui`) should compose a named group of bundled plugins atomically
   or remain strictly per-plugin.
3. Pet animation primitive scope: which declarative primitives (transform,
   opacity, clipping) are stable for the first animation pass vs deferred
   to level 3 presentation work.
4. Contributions to knowledge-graph service multiplicity: one selected
   provider per workspace vs multiple side-by-side versions per interface;
   resolver policy for `knowledge.query`.
5. Peek and mirror payload bounds while alternate-screen is active
   (what a snapshot contains when a full-screen TUI owns the grid).
6. Lock interception scope growth: whether `intercept.open-url` belongs in
   the lock policy or stays separate for link-policy UX.
7. Activity retention and aggregation tuning: default window, bucket
   granularity, and whether coarse cwd hashing or explicit path allow
   lists are canonical for the v1 activity schema.
8. Whether configuration scripts (`init.lua`) and runtime plugins converge
   on this exact capability profile or a restricted profile of it
   (corpus-kept open; this roadmap does not force user-trusted code into
   the third-party grant flow).

## Future topics to assess and candidate risks

These are noncanonical assessment topics: they are unaccepted, are not product
commitments, are not implementation claims, and are not entries in the OQ
register.

1. PTY canonical geometry when multiple Views present one Terminal: ownership of
   logical terminal size, viewport size, and the controlling View; resize and
   replay behavior must be settled before multi-View dogfood.
2. Input routing across global commands, the focused Panel/component, terminal
   encoding, and UI actions, including keyboard, mouse, paste, and IME events.
3. How Rich surfaces preserve terminal row, column, cursor, scrollback,
   selection, anchor, accessibility, and alternate-screen assumptions without
   changing Terminal Truth.
4. Which platform backend capabilities remain separate (window, PTY, font,
   clipboard, and IME) rather than being hidden behind a God abstraction.
5. Whether a browser Panel requires an optional isolated backend or remains
   deferred; its process, network, memory, lifecycle, and trust risks require
   the existing open-question and security-review mechanism before selection.

## References

- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) for
  OQ-011/OQ-012/OQ-013 (accepted 2026-08-27).
- [Default Distribution RFC](../specifications/default-distribution-rfc.md)
  for OQ-002 (accepted 2026-08-29).
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) for the
  mechanism/policy split and boundary principles.
- [Product vision](vision.md) for small core, stable API, and everything
  composable.
- [Security overview](../../../security/overview.md) for invariants 2, 3, 4, 8,
  9, and 10 and the P0 baseline.
- [Plugin system](../extensibility/plugin-system.md) for extension levels,
  register vs claim, and plugin author rules.
- [Proposed Delivery Sequence](proposed-delivery-sequence.md) and
  [Release Ladder](release-ladder.md) for maturity and verification
  framing (`be3bdb4`, 16 crates, `Implemented` not yet `Verified`).
