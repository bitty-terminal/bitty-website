---
title: Plugin Reuse and Provider Ecology RFC
description: Draft post-1.0 reuse principle Lua is glue with four layers and provider ecology for OQ-011 OQ-012 OQ-013
category: specifications
audience: plugin-author
document_type: specification
status: draft
website_publish: true
sidebar_order: 24
---

# Plugin Reuse and Provider Ecology RFC

> Status: **draft** (post-1.0 only). This document proposes the reuse principle
> "Lua is glue" with four explicit layers and a provider ecology for
> [OQ-011](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md),
> [OQ-012](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md), and
> [OQ-013](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) as a follow-up to the accepted
> [Plugin Platform RFC](../specifications/plugin-platform-rfc.md). It does not self-accept, does
> not authorize shipped, stable, or compatibility-guaranteed behavior, and
> requires independent category-owner, docs-curator, and security-reviewer
> evidence before acceptance. The lifecycle is Draft -> experimental review
> evidence -> Accepted -> normative; only Accepted or normative documents
> authorize shipped behavior. Headless note: all mechanisms apply to the
> single-process v1.0 host and remain compatible with the headless-runtime
> separation in [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md).

## Purpose and scope

This RFC answers the post-1.0 reuse question left open alongside the accepted
Plugin Platform RFC (OQ-011, OQ-012, OQ-013, 2026-08-27): _how should plugins
reuse existing system capabilities and compose providers without embedding
third-party crate bloat into the core?_

In scope:

- the normative reuse principle "Lua is glue" and its four layers;
- what each layer may and may not depend on, and which capability or manifest
  declaration gates it;
- the provider ecology for pickers, status, and context, with a host-owned
  fuzzy service (nucleo/skim) rather than per-plugin crates;
- the manifest declarations for system tools and native helper processes;
- the reuse table "Reuse below, compose above" and the Terminal versus Project
  search separation;
- the no-embed rule for third-party crates and the post-1.0 native-helper
  staging.

Out of scope (owned elsewhere):

- Plugin API v1 surface, capability families, and event pipeline classes and
  budgets (OQ-011/OQ-012/OQ-013, accepted in
  [Plugin Platform RFC](../specifications/plugin-platform-rfc.md));
- per-plugin instruction, memory, task, and queue enforcement (OQ-014, accepted
  in [Isolation Resource RFC](../runtime/isolation-resource-rfc.md));
- Lua standard-library subset, rooted `require`, and diagnostics (OQ-009,
  accepted in [Lua Runtime RFC](../runtime/lua-runtime-rfc.md); pins OQ-030/OQ-031/OQ-032);
- package manifest, lockfile, and activation model (OQ-021/OQ-022,
  accepted in [Package Lifecycle RFC](package-lifecycle-rfc.md) and
  [Package Follow-up RFC](package-followup-rfc.md));
- local IPC wire, auth, and scopes (OQ-018,
  accepted in [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md));
- headless daemon, detach/reattach, and remote UI trust boundary (OQ-020,
  deferred in [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) to post-1.0;
  this RFC remains single-process and daemon-agnostic).

This document refines OQ-011..013 for provider composition; it does not reopen
or weaken any accepted contract.

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md): untrusted-by-default posture;
  invariants 2, 3, 4, 5, 8, 10; least-privilege capability families;
  generation-based lifecycle; safe-mode startup without third-party plugins.
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md): abuse cases T-06, T-07, T-10,
  T-12, T-13; host mediation of privileged work; no ambient authority.
- [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md): R-006, R-007, R-008,
  R-009, R-013, R-015, R-016, R-017, R-022.
- [Core and Plugin Boundaries](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/core-boundaries.md):
  mechanism/policy split, declarative UI, ownership, observation versus
  interception.
- [Plugin system](../extensibility/plugin-system.md): extension levels 1 to 4,
  register versus claim, qualified naming, service boundary direction.
- [Lua Runtime RFC](../runtime/lua-runtime-rfc.md): isolated VM per plugin, restricted
  standard library, rooted module resolution, source-only loading, one `bitty`
  host bridge.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md): manifest `bitty-plugin.toml`,
  capability grammar, grant per manifest hash, service `get` with version
  constraint, lazy triggers.
- [Isolation Resource RFC](../runtime/isolation-resource-rfc.md): RC-1..RC-10 ceilings,
  FS-1..FS-9 failure semantics, three-level queue
  PerSubscription 64 / PerPlugin 1024 events/256 KiB / Global 8192 events/2 MiB
  with `DropOldest` default.
- [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md): headless runtime
  separation as prerequisite, no daemon in v1.0.

Where this RFC picks manifest keys or defaults it refines the above sources;
it does not move a requirement between owners or downgrade a P0 gate. If any
mechanism here contradicts a normative source the normative text wins.

## Principle: Lua is glue

"Lua is glue" means plugin Lua composes capabilities that already exist on the
system, in the host, or in peer plugins before it invents new native code.
Composition happens above a reused base; reuse happens below a composed
surface. The four layers below make that ordering explicit so a reviewer can
check, for any plugin, which layer it belongs to and which declaration gates
that layer.

Consequences:

- Pure Lua is the default; it has no external dependency beyond the plugin
  tree.
- System CLIs are reused before any crate is embedded.
- Peer-plugin services are reused before any new helper process is introduced.
- A native helper process is the last resort and must be declared, per-platform
  pinned, and post-1.0.

## Layer 1 Pure Lua

Status: **proposed** as the draft default layer.

- Module resolution is the rooted rule from the Lua Runtime RFC: each plugin VM
  resolves `require` only inside its own installed tree; relative traversal out
  of the root is a resolution error; `package.path`/`package.cpath` mutation is
  ignored by the loader.
- Vendoring inside the plugin tree is permitted: a plugin may ship pure-Lua
  dependencies (for example `lpeg`, `fun`, `inspect`-class helpers) under its
  own namespace. Vendored code is tracked as plugin-owned file content and
  remains subject to the same per-plugin budgets and diagnostics as first-party
  plugin code.
- No system CLI, no peer service, and no helper process is required to satisfy
  this layer. No capability beyond the already-granted host bridge is implied
  by vendoring alone.
- Examples: pure-Lua parsers for frontmatter, command builders for the host
  command bus, state machines for UI composition.

## Layer 2 System CLI

Status: **proposed**; requires an explicit capability and manifest declaration.
The `[tools.git]` slice is **accepted (v1)**; see
[Accepted `[tools.git]` contract (v1)](#accepted-toolsgit-contract-v1).

Reuse the tools already on the user's system before embedding their
functionality into Bitty.

### Reused tools

This layer explicitly endorses reuse of the user's installed command-line tools
for their existing strengths, for example `rg` for text search, `fd` for file
enumeration, `git` for version control, and `bat` for preview. The list is
illustrative; the mechanism is general.

### Capability and process boundary

- System CLI reuse requires capability `process.spawn` narrowed by a declared
  allowlist, not an ambient spawn authority. The capability identifier grammar
  and grant binding per manifest hash are owned by the
  [Plugin Platform RFC](../specifications/plugin-platform-rfc.md)
  (`process.spawn:CONSTRAINT` naming an allowlisted program and argument shape
  per [plugin-platform-rfc.md:230](../specifications/plugin-platform-rfc.md)); this draft
  proposes the constraint spelling `process.spawn:rg(...)` where `rg` maps to
  the manifest-declared `[tools.rg]` entry and `(...)` is the `args` shape
  from that entry, so a grant can be reasoned as one tool at a time and is
  bound to the manifest hash.
- CLI execution goes through the host-provided spawn surface only, never
  through `os.execute`, `io.popen`, or a Lua-loaded native module; those remain
  denied by the Lua Runtime restricted library.
- Spawn is bounded by the isolation budgets: child processes count toward the
  requesting plugin generation, are attributed to that generation, and are
  subject to timeout, output caps, and failure containment per the isolation
  contract.

### Manifest `tools` declaration

```toml
[tools.rg]
required = false
version = ">=13"
args = ["--no-config"]

[tools.fd]
required = false

[tools.git]
required = true
version = ">=2.30"
```

Proposed rules:

- `required = true` means activation fails closed with a diagnostic when the
  tool is missing or its version does not satisfy the constraint; `required =
false` means the plugin degrades and remains activatable with reduced
  functionality.
- All tool declarations are static, validated before VM creation, and included
  in the manifest hash for grant binding; raising a tool from optional to
  required is a capability increase whose grant must be re-confirmed.
- The host validates tool availability without executing attacker-controlled
  manifests, and the package manager and the host validate the same shape.

### Accepted `[tools.git]` contract (v1)

Status: **accepted** (CTX-0425,
`bitty-terminal/bitty#687` / `bitty-terminal/bitty#690`; risky-flag sync
CTX-0008 folding CTX-0444 `64e1709` / `bitty-terminal/bitty#716`). This
subsection is the canonical record for the `[tools.git]` slice. The rest of
this RFC stays draft: only the declaration, allowlist, bounds, and
verification plan below are accepted, so an independent git-panel can declare
`[tools.git]` and spawn only the allowlisted `git` binary with bounded
output. It gates the git-panel split (CTX-0400). OQ-013 is accepted (Plugin
Platform RFC); OQ-053 is accepted and closed (Bundled-Plugin Split Decision,
2026-09-14; git-panel already split: catalog entry removed and independent
package plus registry entry published, with panel presentation still deferred
pending the panel-provider contract). The
`process.spawn:CONSTRAINT` grammar is owned by the accepted [Plugin Platform
RFC](../specifications/plugin-platform-rfc.md). The CTX-0008 sync only folds already-enforced
denials into the record; it adds no acceptance beyond what
`is_allowed_git_args` enforces.

#### Accepted `[tools.git]` declaration (versioned)

```toml
[tools.git]
required = true
version = ">=2.30"
```

`git` must be present and satisfy the version constraint, otherwise activation
fails closed with a diagnostic. The entry is static, validated before VM
creation, included in the manifest hash for grant binding, and raising
`required` from `false` to `true` is a capability increase whose grant must be
re-confirmed. Manifest-side evidence is historical: the declared
`process.spawn:git` capability was carried by `git_panel_manifest` in
`crates/bitty-plugin-host/src/bundled.rs` before the split removed it
(`bitty` PR #713, `CTX-0400`, 2026-09-15); the current manifest owner is the
independent `bitty-terminal/git-panel` package, and the current dispatch
enforcement owner is the `HostToolsAuthorizer` in
`crates/bitty-runtime/src/plugin_runtime/spawn.rs`, which enforces the
dispatch-time tool/verb contract only — install-time tools validation,
executable discovery, and full grant binding stay owned by the install and
activation path (follow-up work under `CTX-0400`, not part of this
acceptance);
a general `[tools.*]` manifest-table validator in `bitty-package` is future
work under CTX-0400, not part of this acceptance.

#### Accepted `process.spawn:git` allowlist

- Capability string is exactly `process.spawn:git`: closed `process.spawn`
  family plus the `:git` parameter. Any other executable is denied; the
  canonical dispatch-time spawn check is `is_tool_spawn_allowed`
  (`is_accepted_tool` git-only plus `is_valid_tool_name`) in
  [tools.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-plugin-host/src/tools.rs)
  with no I/O, enforced at dispatch by the `HostToolsAuthorizer` in
  `crates/bitty-runtime/src/plugin_runtime/spawn.rs`. The removed bundled
  panel capability check `GitIntegration::is_process_spawn_git_allowed`
  (formerly in the deleted
  [git_panel.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-runtime/src/git_panel.rs),
  removed `bitty` PR #713, `CTX-0400`) is historical implementation evidence
  only; dispatch enforcement does not prove install-time tools validation,
  executable discovery, or full grant binding. Use the independent
  `bitty-terminal/git-panel` package for current manifest ownership.
- Spawn goes through the host-provided surface only, never through
  `os.execute`, `io.popen`, or a Lua-loaded native module (denied by the Lua
  Runtime restricted library). Outputs are piped to panel UI, never raw PTY
  injection.
- Read-only verbs only: `status`, `diff`, `log`, `branch`, `show`,
  `rev-parse`, `ls-files` (`GIT_ALLOWED_SUBCOMMANDS` in `tools.rs`; the
  identical list formerly mirrored in the removed bundled
  [git_panel.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-runtime/src/git_panel.rs)
  is historical implementation evidence, recorded before `bitty` PR #713,
  `CTX-0400`).
  Write verbs (`commit`, `push`, `reset`, mutating `checkout`, etc.) are
  absent; staging or commit UX needs explicit user action plus a broader grant.
- `is_allowed_git_args` in `tools.rs` (canonical, `64e1709`) fails closed on:
  empty args, more than `MAX_GIT_ARGS` (`32`) args, any empty arg or arg
  longer than `MAX_GIT_ARG_BYTES` (`256`), total args over
  `MAX_GIT_TOTAL_BYTES` (`8 KiB`), null/control characters, denied shell
  metacharacters (`;` `&` `|` backtick `$` `(` `)` `<` `>` backslash `"` `'`),
  a non-allowlisted first-arg subcommand, verb-smuggling flags (exact
  `--upload-pack`, `--receive-pack`, `--exec`, plus the `--upload-pack=` /
  `--receive-pack=` / `--exec=` contained forms), config override (exact
  `-c`; `--cached` / `--color` stay allowed), repo-escape and env-config
  prefixes (`--git-dir`, `--work-tree`, `--config-env`), file-write and
  external-driver prefixes (`--output`, `--ext-diff`, `--textconv`;
  `--no-ext-diff` / `--no-textconv` stay allowed), and verb-aware `branch`
  pinning only for `branch` (exact `-d` / `-D` / `-m` / `-M` / `-c` / `-C` /
  `-f` / `-u` / `-t` plus deprecated exact `--set-upstream`; prefixes
  `--delete` / `--move` / `--copy` / `--rename` / `--force` /
  `--set-upstream-to` / `--unset-upstream` / `--track` /
  `--edit-description`; bundled single-dash clusters containing `d` / `D` /
  `m` / `M` / `c` / `C` / `f` / `u` / `t`; bare `branch <name>` creation
  denied unless explicit `--list` / `-l` forces list mode, where the
  positional is a display pattern). `-m` stays allowed for `log` / `show`;
  `--no-track` stays allowed.

#### Accepted bounded-output rules

- Panel observation payloads are bounded by `GIT_PANEL_PAYLOAD_MAX_BYTES`
  (`8 KiB` = `BUS_EVENT_MAX_BYTES`, bus admission boundary PR-5); status and
  branch listings sort then truncate deterministically after dedup, while
  commit listings preserve `git log` reverse-chronological order and truncate
  after dedup (a display-only hash-sorted view exists separately and is never
  used for ingestion).
- `GIT_PANEL_MAX_ENTRIES` (`128`) status entries, `GIT_PANEL_MAX_COMMITS`
  (`64`) commits, `GIT_PANEL_MAX_BRANCHES` (`32`) branches (the single branch
  bound for ingestion and presentation).
- `GIT_PANEL_MAX_NAME_CHARS` (`128` = `MAX_OVERLAY_TEXT_LEN`) per branch/file
  name, `GIT_PANEL_MAX_COMMIT_MESSAGE_CHARS` (`256` =
  `MAX_OVERLAY_TOOLTIP_LEN`) per commit message, `GIT_PANEL_MAX_PATH_BYTES`
  (`4096`) per path.
- Queues `64`/`1024`/`2 MiB`/`8192` with `DropOldest` and counted per-queue
  attribution (PR-1..PR-12); child processes count toward the requesting
  generation (RC-1/RC-2 attribution); `is_untrusted_surface = true` for
  reflected terminal bytes.

Allowlist values above are enforced by
[tools.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-plugin-host/src/tools.rs)
(`GIT_ALLOWED_SUBCOMMANDS`, `MAX_GIT_ARGS`, `MAX_GIT_ARG_BYTES`,
`MAX_GIT_TOTAL_BYTES`, `is_allowed_git_args`, `is_tool_spawn_allowed`);
panel bounds below were copied from the removed bundled
[git_panel.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-runtime/src/git_panel.rs)
(`GIT_PANEL_MAX_*`, `GIT_PANEL_PROCESS_SPAWN_GIT`, before `bitty` PR #713,
`CTX-0400`); those modules are historical implementation evidence, not the contract.

#### Verification plan

Historical implementation evidence (recorded before the split removed the
bundled owners in `bitty` PR #713, `CTX-0400`):

- `crates/bitty-runtime/tests/git_panel.rs`:
  `git_panel_via_public_plugin_host_path` (granted set carries
  `process.spawn:git`), `git_panel_fs_isolation_via_capability_id_and_helper_and_git_allowlist`
  (allowlist admits `git` verbs and denies `rg`/bare `process.spawn`,
  manifest hash deterministic with `panel.*` plus `process.spawn:git`),
  `git_panel_helpers_pure_bounded_and_tiled_deterministic` (listing and
  truncation bounds), `git_panel_subscribe_publish_drain_bounded_drop_oldest`
  and `runtime_side_queue_drop_oldest_for_observations` (bounded
  `DropOldest`), `git_panel_via_panel_runtime_public_path_bounded`
  (Panel Runtime path stays bounded),
  `safe_mode_rejects_git_panel_without_panic` (safe-mode startup),
  `git_panel_has_no_private_channel_parity_with_third_party` (no
  first-party bypass), `git_panel_is_headless_and_forbid_unsafe_single_process_winit`,
  `git_panel_command_registry_bounded_and_overlay_focus_mru`,
  `git_panel_reactive_via_eventbus_no_hot_path`,
  `git_panel_tiled_reuses_layout_hv_deterministically`.

- `crates/bitty-runtime/tests/bundled_dogfood_runtime.rs` and
  `crates/bitty-plugin-host/tests/bundled_dogfood.rs` (git-panel dogfoods the
  public plugin API surface with manifest, capability, and lifecycle checks).
- Gates: `just check` (fmt, clippy `-D warnings`, tests, scratch-paths,
  pty-gate, actionlint, markdownlint) plus `cargo test --workspace
--all-targets --locked`, the Windows `cargo check`, and an `act -n`
  workflow dry-run.

### Doctor

The draft proposes `bitty plugin doctor` (traceable to the CLI surface owned by
the [CLI Contract RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/cli-contract-rfc.md) and the package evidence in the
Package Lifecycle RFC) as the verifier for this layer: it resolves each
declared tool, checks version constraints, and reports missing or mismatched
tools with remediation guidance. No package code runs during `doctor`
(consistent with the host rule that diagnostics never load third-party plugin
VMs). The `plugin doctor` name is reserved for budget, queue, and generation
diagnostics; its tool-verification output is the Layer 2 half of that surface.

### Host-managed async process runner

Status: **proposed**. The denial half is accepted and shipped; the runner
below is a candidate design in this draft.

- Lua never blocks on a child process. The accepted Lua Runtime restricted
  library retains only `os.time`/`os.clock`/`os.date`; `os.execute`,
  `io.popen`, and Lua-loaded native modules remain denied, so there is no
  blocking popen path for plugin code to reach. CLI execution uses the
  host-provided spawn surface only (per the capability boundary above).
- The draft runner is host-managed and asynchronous: a spawn request returns
  without suspending the plugin VM, completion arrives as a bounded event, and
  every child counts toward the requesting plugin generation with explicit
  timeout, output-cap, and failure-containment budgets from the isolation
  contract. Exact timeout and byte numbers stay owned by the isolation
  enforcement track (OQ-014); this draft sets the mechanism, not the numbers.
- Tree kill on unload is proposed: when a plugin generation tears down
  (disable, update, or unload), the host terminates that generation's live
  children as a tree before releasing the generation, and reports the outcome
  through the `plugin doctor` diagnostics. The kill ordering, signal grace,
  and orphan-reaping semantics are open items below, not accepted behavior.

## Layer 3 Plugin Service

Status: **proposed**; reuses peer-plugin capabilities already admitted by the
platform.

- A plugin reuses another plugin's capability through the host service registry,
  not through a direct `require` of the peer's private tree. The registry is
  the accepted collaboration boundary from the Plugin system and Plugin
  Platform RFC.
- Example designated in this RFC: `git-core`. A `git-core` provider exposes a
  versioned interface such as `git.repository` or `git.status`; consumers such
  as a file-tree plugin or a status-line plugin depend on that interface:

```lua
-- Proposed host service boundary; capability and version remain platform-owned.
local git = bitty.services:get("git.repository", { version = ">=2.0" })
local branch = git.branch(cwd)
```

- Service results evolve by size and shape rather than one absolute rule: small
  values pass by structured clone, large immutable resources return a
  `ResourceId`, streams return a bounded channel, and privileged objects return
  an opaque host-managed capability handle the plugin cannot dereference
  (`git:diff_stream()` returns `OpaqueHandle<GitDiffStream>`). Raw native
  handles are never exposed to plugins; the host mediates every capability.
- Provider selection follows the accepted resolver rules: declared dependency
  with version constraint, deterministic selection, conflict as activation
  error before any VM runs, lazy reservation of service provisions during graph
  construction.
- A service provider remains an ordinary plugin: it has its own VM, its own
  budgets, its own grant per manifest hash, and its own generation lifecycle.
  It does not receive ambient authority for serving a consumer.

### Cross-package contracts (candidate)

Status: **candidate proposal**; no new manifest keys or Lua methods are accepted
here. This direction separates a repository's publication boundary from a
package's private modules and its public service/capability contracts. A
consumer should not need the provider's checkout location, private
implementation layout, or concrete package name when a declared interface
suffices.

The accepted baseline already distinguishes rooted, source-only in-package
`require` from cross-plugin services: the
[Lua Runtime RFC](../runtime/lua-runtime-rfc.md) and
[Plugin Host Runtime RFC A.2/A.3](../runtime/plugin-host-runtime-rfc.md#a2-proposed-bitty-lua-seam-extensions)
permit no filesystem imports across packages, path traversal, package-path
extension, shared module cache, or direct peer-VM access. Packaging a dependency
does not turn its private modules into a public API.

This direction's typed SDK proposal builds on the accepted
[Services contract](../sdk/plugin-api-v1-lua-surface-rfc.md#services): declared interface
name/version and bounded argument/result schemas, with host-selected providers.
Typed annotations and editor hints would help authors, but never replace runtime
schema validation. Candidate versioned adapters would translate a provider's
internal representation into the public contract, keeping provider refactors
private; adapter packaging, compatibility negotiation, supported version ranges,
and migration/conformance tests require an owning contract before adoption.
A provider's local implementation table accepted by `provide` is not a raw table
shared with callers: arguments/results cross VM boundaries as bounded values,
not functions, mutable shared tables, or live objects.

This direction explicitly distinguishes **installation dependency** (this
package must be installed) from **service requirement** (some eligible provider
must supply a versioned interface). The accepted `[dependencies]` and
`[services.provided]` manifest fields remain authoritative in the
[Plugin Platform RFC](../specifications/plugin-platform-rfc.md); the proposed
`requires`, `plugin_dependencies`, `service_dependencies`, and
`services.required` variants are alternatives, not valid new schema. Likewise
`ctx.services.require`, `optional`, and the `interface@major` sketches are not
accepted API spellings. The v1 `bitty.services.get(iface, opts)`
optional/version behavior remains the reference. An independent
service-requirement declaration, its relation to the package resolver, and
provider multiplicity remain open design work, not a promise of automatic
provider installation.

Provider selection, activation order, lazy reservations, conflicts, revocation,
and generation teardown stay host-controlled. A declared dependency is no grant;
callee grants do not become caller authority. The accepted `E_SERVICE_RESOLUTION`
and `E_SERVICE_GONE` behavior stays intact, including optional absence and
invalidating disappeared providers. Replaceability does not mean silently
switching a live call to a different provider. Rebinding and any broader
selection policy need explicit lifecycle and permission review.

Proposed local/remote adapters, async-first calls, cancellation, and streams are
recorded separately in
[Plugin IPC Boundary local/remote service proxies](../architecture/plugin-ipc-boundary.md#local-and-remote-service-proxies-candidate).
Domain-specific model/tool/agent API sketches remain
[owner-pending](../architecture/plugin-ecosystem-model.md#97-four-layer-coverage-and-owner-handoff),
not implementations or newly accepted services in this RFC.

## Layer 4 Native Helper Process (post-1.0)

Status: **proposed** and **deferred to v2 (post-1.0)**, does not authorize
implementation in v1.0.

Native helpers address the residual set explicitly named here: Tree-sitter
parsing, SQLite-backed indexing, and FFmpeg-backed media work. These are
representative heavy native workloads that must not be embedded as in-process
crates before the post-1.0 boundary.

### Why deferred

- Bitty's v1.0 spine is single-process with no `bittyd` and no remote surface;
  introducing native compilation, per-platform matrices, and supply-chain width
  before stabilization reopens P0 budget and supply-chain gates prematurely.
- The workspace isolation, budget, and headless-runtime separation gates for
  helpers have no measured evidence yet; the candidate mechanisms below must be
  reviewed after those gates exist.

### Constraints when the layer exists

- Helpers are **per-platform declared artifacts**, not source the user compiles:
  each helper is a single `id` with per-platform `path` and `sha256` under
  `helpers.<target>`. Manifest spelling below is a proposed sketch (draft) and
  remains owned by the package and configuration model
  ([Package Lifecycle RFC](package-lifecycle-rfc.md),
  [Package Follow-up RFC](package-followup-rfc.md),
  [Configuration Model RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/configuration-model-rfc.md)); the TOML sketch is
  not an accepted schema:

```toml
[[helpers]]
id = "bitty-treesitter"

[helpers.linux-x86_64]
path = "bin/bitty-treesitter-linux-x86_64"
sha256 = "3a7d8f..."

[helpers.macos-aarch64]
path = "bin/bitty-treesitter-macos-aarch64"
sha256 = "9f1c2a..."
```

- Every `sha` is verified before execution; digest mismatch fails closed with a
  diagnostic and no helper run.
- Helpers are **out-of-process** helpers communicating over stdio or a
  host-owned local channel, never `dlopen` or in-process native module loads
  into the Bitty host; this preserves the Lua Runtime's native-module denial
  and keeps failure containment at the generation boundary.
- The helpers named in this section (Tree-sitter, SQLite, FFmpeg) are bounded
  to the semantics above: a Tree-sitter helper parses and returns bounded
  highlights, a SQLite helper serves bounded queries against a plugin-owned
  database, a FFmpeg helper decodes or thumbnails within explicit byte and
  duration caps. None mutates terminal truth or receives GPU, window, PTY, or
  host-Rust handles.

## Provider ecology

Status: **proposed** post-1.0 provider conventions. The three below are the
first UI and AI conventions layered over the general host Service Protocol,
not the final abstraction set: Provider is a convention above the Service
Broker, not a broker limitation, and future Command, Completion, Tool, Panel,
Action, Decoration, Notification, and Search providers follow the same broker,
capability, and budget rules.

### Roles

| Provider          | Role                                                                    | Host mediation                                            |
| ----------------- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| `PickerProvider`  | Ordered item source for the command palette or any picker surface       | Claimed slot with one effective provider per invocation   |
| `StatusProvider`  | Composable fragment for the statusline or tabline composition           | Many compose via host-owned layout; no ambient placement  |
| `ContextProvider` | Snapshot of relevant project or buffer context exposed to host features | Read-only context via host bridge; bounded size and scope |

ContextProviders feed the host feature that consumes them; they do not
themselves drive side effects or spawn work.

### Picker and fuzzy host service

- Fuzzy matching is a **host service** that plugins consume, not a crate each
  plugin embeds. The host may realize the service with a native helper or with
  a reused system CLI; per-plugin in-process crates such as `nucleo` or `skim`
  embedded individually are rejected as the normal path.

```lua
-- Proposed host-owned fuzzy service; implementation may be helper or CLI reuse.
local fuzzy = bitty.services:get("fuzzy", { version = "^1" })
local ranked = fuzzy.match({ query = q, items = items, limit = 100 })
```

- The service boundary requires explicit budget: input items, item bytes, result
  limit, and response bytes are bounded and attributable to the caller
  generation. Spurious embedded crate bloat that bypasses those bounds is a
  conformance violation.
- A PickerProvider produces items; the host fuzzy service ranks them. A plugin
  that wants custom ranking composes by supplying a scorer through the service,
  not by replacing the host pipeline.

### Search and picker provider pattern

Status: **proposed** convention over Layers 2 and 3. The three roles are
fixed: the CLI produces data, Bitty renders the overlay, and the host ranks.

- A search or picker plugin shells out to a Layer 2 system CLI (`rg`, `fd`)
  for data production and returns bounded item lists; it never embeds its own
  matcher crate and never draws its own floating surface.
- Bitty owns the overlay: the command palette or picker surface, its input
  routing, and its layout are host-rendered from the provider's items, so one
  keybinding, theme, and accessibility story covers every provider.
- The host fuzzy service performs the ranking behind the `fuzzy` boundary
  above (realized with a native helper or a reused system CLI; per-plugin
  in-process `nucleo`/`skim` embeds are rejected as the normal path). Exact
  input-item, item-byte, result-limit, and response-byte numbers are open
  items, attributable per caller generation when set.

### Native PTY hosting for session tools

Status: **proposed**; the `terminal.spawn` host flow below is partly shipped,
the plugin-facing projection is a candidate in this draft.

- Session tools (`ssh`, `docker`, and their class: interactive remote or
  container sessions a pipe cannot serve) run in host-owned PTYs, never in a
  plugin-owned pseudoterminal. The host spawns the session command directly
  as an argv vector with no shell and no interpolation, and the plugin never
  receives a PTY, GPU, window, or host-Rust handle for the session.
- The `terminal.spawn` flow is: plugin request (proposed Lua projection)
  -> host `core.terminal.spawn` method under the `terminal.manage` scope
  (shipped control-plane shape) -> `intercept.terminal-spawn` plugin event
  for policy observers (shipped event kind) -> host PTY spawn with
  `TERM=xterm-256color` and `COLORTERM=truecolor` defaults -> session output
  stays on the terminal-truth side while the plugin sees only bounded,
  read-only presentation data (for example the existing `terminal.snapshot`
  bridge). Veto, audit, and safe-mode semantics follow the accepted event
  and scope contracts; the Lua request shape and its capability grant are
  open items below.

### Model-provider direction (candidate)

Status: **candidate, non-normative.** Candidate design input; the plugin-side
conclusions only. The
AI-side boundary is recorded in the sibling
[Provider Plugin Boundary](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/provider-plugin-boundary.md)
draft; that page owns the core/provider-cut detail and this subsection records
only what it means for this corpus.

- Core keeps the provider contract, model description, capability vocabulary,
  registry, selection routing, fallback, and usage semantics; vendor
  integration, authentication, subscription adaptation, model discovery, and
  the management UI live in plugins, with the management UI separated from
  adapters. The AI core ships with zero vendor dependencies; model and
  provider plugins install on demand.
- Subscription-style supply is expressed through transport abstractions such as
  CLI wrappers (Layer 2 shape), without unofficial token workarounds.
- Agents declare only capability needs through semantic aliases; routing policy
  selects the actual model.
- Credentials resolve on the host side and reach plugins only as opaque handles
  from the host keystore, invisible in plaintext to both the management UI and
  agents. This subsection does not restate the secret tiers; the candidate
  storage shapes live in the
  [Secrets and credential handling direction](../product/plugin-roadmap.md#secrets-and-credential-handling-direction-candidate),
  and the accepted environment baseline stays in ADR 0006.
- Acceptance path: an RFC-level provider-interface contract (versioned
  capability identifiers, grant shape, registry and routing rules) with
  category-owner, docs-curator, and security-reviewer evidence per the
  [Acceptance and lifecycle](#acceptance-and-lifecycle) section below; none of
  the interface names above are accepted until that lands.

### History-provider direction (candidate)

Status: **candidate, non-normative.** Candidate design input; the plugin-side
conclusions only.
The AI-side consumption boundary is recorded in the sibling
[History Consumption Boundary](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/history-consumption-boundary.md)
draft; that page owns the agent-read contract detail and this subsection
records only what it means for this corpus.

- Core keeps only the volatile scrollback buffer, pane lifecycles, and a
  structured event bus, without taking a database dependency for history.
  Event classes, budgets, and fail-open rules stay owned by the accepted
  [Plugin Platform RFC](../specifications/plugin-platform-rfc.md); this direction adds no event
  contract.
- Durable history is an official plugin, not core: command records are stored
  separately from raw output, the latter in append-only compressed segments,
  and databases serve only as rebuildable query indexes, never as the source
  of truth.
- Plugins reach sandboxed directories through controlled storage capabilities
  instead of connecting to databases directly. Plugin API v1 defines no Lua
  entry point for `fs.*` (see
  [Not in Plugin API v1](../sdk/plugin-api-v1-lua-surface-rfc.md#not-in-plugin-api-v1)),
  so the storage-capability shape is future contract work, not a v1 grant.
- History offers command, output, and full-replay tiers with a lightweight
  default; agents consume only the unified history interface without owning
  history, and exports build on host query capabilities.
- External history tools act as command-history providers and sinks, while pane
  output and agent linkage stay on the terminal side; the terminal natively
  understands semantic-prompt markers, unifying the command-block and
  output-boundary model.
- Acceptance path: a versioned history-provider interface plus the
  storage-capability contract above, with category-owner, docs-curator, and
  security-reviewer evidence per the
  [Acceptance and lifecycle](#acceptance-and-lifecycle) section below; the
  segment layout, tier shapes, and provider/sink protocol stay candidate
  until that lands.

All provider registrations remain declarative, host-composed, and subject to the
register-versus-claim rule: pickers and context providers are per-invocation
sources; status fragments compose where the layout defines composition; any
exclusive slot with a second claimant is an activation error, not last-wins.

## Reuse below / compose above matrix

"Reuse below" means the lower layer reuses what already exists; "compose above"
means the upper layer composes declared providers.

| Need                            | Prefer below (reuse)                                                   | Compose above (if reuse insufficient)                    | Notes                                         |
| ------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| File enumeration or text search | System CLI layer (`fd`, `rg`) via `tools.*`                            | Peer service only if CLI unavailable and justified       | System CLI reuse avoids crate bloat           |
| Version-control state           | Plugin Service `git-core` provider                                     | Native helper only if a new parser is measured-necessary | git-core is the designated service reuse path |
| Syntax highlighting or parsing  | Tree-sitter helper (layer 4, post-1.0) only when pure Lua insufficient | No embedded parser crate in Bitty core before v2         | Helper is per-platform pinned artifact        |
| Indexed search or history       | SQLite helper (layer 4, post-1.0)                                      | No bundled SQLite crate before v2                        | Out-of-process, bounded queries               |
| Media thumbnail or transcode    | FFmpeg helper (layer 4, post-1.0)                                      | No bundled FFmpeg crate before v2                        | Bounded decode, stdio transport, no dlopen    |
| Picker or fuzzy ranking         | Host fuzzy service (`nucleo`/`skim` behind helper/CLI)                 | Plugin supply of scorer via service, not replacement     | Per-plugin crate embed rejected               |
| Statusline or tabline fragments | Host layout composing `StatusProvider`s                                | Service registry, not direct plugin require              | Many compose, one claim where exclusive       |
| Context for host features       | `ContextProvider` snapshots via host bridge                            | Service composition                                      | Read-only, bounded                            |

The draft rule for reviewers is: a plugin that would add a native dependency to
Bitty's workspace must instead show why no combination of layers 1 to 3
satisfies the need with measured data, and, if it proceeds to layer 4, that its
artifact digest and per-platform declarations meet the constraints above.

## Terminal versus Project search separation

This RFC requires a consistent separation reviewed alongside the isolation
payload caps.

- **Terminal search** is a host feature that searches the terminal surface
  (grid, scrollback, semantic zones, and bounded RichBlock text) as governed
  by the terminal state and rich presentation contracts. It does not enumerate
  the filesystem to satisfy a query.
- **Project search** is a plugin feature that searches the project (files on
  the filesystem, repository state, or indexed metadata) and must go through
  the four-layer ordering: pure-Lua path first, then system CLI tools (`rg`,
  `fd`), then a peer search service if one exists, and only then a post-1.0
  helper. Project search inherits whatever capability and manifest declaration
  its layer requires; terminal search inherits none beyond the host's own
  surface access.

Blurring the two searches into one unbounded "find anything anywhere" surface
is rejected: it bypasses capability scoping, payload caps, and the reuse
ordering this RFC exists to enforce.

## No embed third-party crate bloat

This RFC makes explicit and bounded what the accepted corpus already implies:

- Bitty's workspace does not grow with a new third-party crate per plugin and
  per helper before v2. The headless-runtime separation (Terminal, PTY, and the
  plugin host free of `bitty-platform` GPU or window objects) remains separable
  for tests and CI, but that separability must not become a crate-bloat vector.
- Per-plugin native crates (`tree-sitter` parsing crates, `rusqlite`, `ffmpeg`
  bindings, `nucleo`/`skim` matching crates embedded per plugin) are rejected
  as the normal composition path. The host owns one realization of each heavy
  primitive (fuzzy, parsing, indexing, media) behind a declared, bounded
  service or helper, and plugins consume that one.
- Publish gating remains the package contract: before `v1.0.0`, publishing is
  draft and gated; any proposal to broaden the workspace crate set for v2
  requires a reviewed RFC that shows bounded budgets, per-platform evidence,
  and supply-chain review, not incidental first-use demand.

## Headless and bounded execution

- Bounded: every host-mediated path in this RFC (CLI spawn, service call,
  helper invocation, fuzzy match, context snapshot) carries explicit input,
  output, and duration budgets that are attributable per generation and
  enforceable before the call starts. Error paths fail closed to the last
  generation's state without leaving partial resources.
- Headless: all mechanisms remain available under the headless-runtime
  separation where Terminal, PTY, and the plugin host have no dependency on a
  window or GPU. No window/GPU object leaks to a plugin or helper, and no path
  assumes a viewer is attached, consistent with ADR 0008.
- Draft tails remain draft: crates named `bitty-rich`, `bitty-ipc`, or
  `bitty-agent` in the
  [Technology Strategy](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/technology-strategy.md) have no evidence
  weight for acceptance beyond their already accepted RFCs, and no crate
  presence in this draft self-proves a layer exists.

## Security review notes

This draft strengthens rather than relaxes the P0 posture:

- Restricted Lua denies remain the base for every layer; any privileged work
  from layers 2 to 4 is host-mediated and capability-checked, not ambient.
- Manifests, including `tools` and `helpers` entries, are attacker-controlled
  static input parsed before any VM or process starts; parsers get hard size
  bounds and fuzz targets alongside other protocol parsers per the security
  gate.
- Digest verification, per-platform pinning, and out-of-process helpers (no
  `dlopen`) close the in-process native-escape class that the Lua Runtime and
  Plugin Platform RFCs already deny.
- CLI and helper outputs are bounded, sanitized presentation data before they
  reach any UI surface; terminal truth remains core-owned and plugin
  contributions stay on the presentation side of the pipeline.

A security-auditor review of the capability scoping (especially
`process.spawn:CONSTRAINT`), helper digest verification, and bounded-framing
rules is required before this draft can advance beyond Draft.

## Rendering status and candidate crate direction (candidate)

Status: **candidate direction, non-normative.** No crate below is adopted.
Shipped, unsupported, and candidate claims are labelled per claim.

- Shipped: 24-bit truecolor (direct-color `SGR 38;2`/`48;2` parsing with
  `COLORTERM=truecolor` PTY defaults) plus bold, italic, and underline; tools
  such as `bat` and `glow` render within those limits, and `bat` decorations
  degrade to grid output.
- Shipped: emoji and CJK cell width via the single `char_cell_width`
  implementation (wide scalars occupy two cells; combining marks, variation
  selectors, and ZWJ arrive as zero-width scalars stored on the preceding
  cell's bounded buffer). Width is supported; shaping is not.
- Not supported: complex ZWJ shaping and BiDi reordering. Shaping sits
  outside the renderer seam by design (deferred to the text RFC per
  ADR-0004); the width and ZWJ/IME-adjacent contract is the
  [Text Compatibility](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/text-compatibility.md)
  draft (CTX-0079, still draft), and the reorder contract is the
  [Text and Rendering RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/text-rendering-rfc.md)
  BiDi section (specified, not shipped). In-grid interactivity is likewise
  unsupported.
- Candidate direction: Markdown parsing and typography belong in a Lua plugin
  or upper panel, while Core keeps the GPU primitive seam. Plugins compose
  widget-level `RichSurface` values (Text, RichText, CodeBlock, Image, Stack,
  Grid, ScrollView, Button, Input, Canvas) that lower into the accepted
  declarative `SceneNode` model; plugins never receive raw scene or GPU
  objects, so the renderer can be layered and rewritten without freezing the
  plugin API. Markdown churn therefore never recompiles the core, and shelling
  out to `glow`/`bat` never grows click-to-expand or form interaction.
- Candidate crates (named only; absent from the workspace dependency set, so
  no adoption is implied): `pulldown-cmark` or `termimad` for Markdown,
  `syntect` or a tree-sitter helper process for highlighting, `unicode-bidi`
  for display-layer reordering, and `rustybuzz` for shaping.
- This composes with the [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md)
  (OQ-008/OQ-015/OQ-016); adoption requires its own RFC and does not advance by
  this draft's acceptance.

## Acceptance and lifecycle

- This RFC targets OQ-011, OQ-012, and OQ-013 as a provider-ecology follow-up;
  it does not close those OQs by existence, and it does not move their closed
  status on the open-question register until independent review closes it.
- Acceptance requires independent category-owner, docs-curator, and
  security-reviewer evidence plus at least one experimental consumer (for
  example `git-core` serving a consumer plugin and one system-CLI tool reuse
  with `doctor` verification) that remains labelled experimental until the
  lifecycle step `Accepted -> normative` is recorded.
- Compatible acceptance may select a subset of layers (pure Lua plus system CLI
  plus service) with layer 4 explicitly still deferred, provided that deferral
  is recorded as the normative decision until the v2 helper ADR closes it.

## Open items for post-1.0 elaboration

- Final manifest spelling and schema ownership for `tools` and `helpers`,
  aligned with the Package Lifecycle lockfile and the Configuration Model; the
  TOML sketches here are proposed syntax, not an accepted schema.
- Exact capability identifier grammar for `process.spawn:*` and for any helper
  execution class; the Platform RFC owns the identifier space.
- Version on the provider interfaces (`PickerProvider`, `StatusProvider`,
  `ContextProvider`, `fuzzy`, `git.repository`) and their metadata or filtering
  protocol; stable provider contracts remain behind a capability-gated host
  service definition rather than an ad-hoc Lua convention.
- Measurement artifacts for helper budgets, startup cost, and telemetry
  retention after the isolation measurement tracks `CTX-0040` and `CTX-0050` are
  extended to tools and helpers.
- Async runner kill semantics: signal grace period, ordering across a
  generation's process tree, orphan reaping, and the exact `plugin doctor`
  report shape for killed-versus-reaped children.
- Lua projection of `terminal.spawn`: request shape, capability grant, and
  per-session budget binding over the shipped `core.terminal.spawn` method,
  `terminal.manage` scope, and `intercept.terminal-spawn` event.
- Fuzzy-service budget numbers: input-item, item-byte, result-limit, and
  response-byte caps per caller generation.
- Model-provider acceptance: versioned provider-interface contract
  (capability identifiers, grant shape, registry and routing rules) plus the
  opaque-credential-handle contract composed with the Secrets direction; no
  interface name above is accepted before that.
- History-provider acceptance: versioned history-provider interface plus
  the storage-capability contract (sandboxed-directory access shape,
  segment/index relationship, command/output/replay tier shapes, external
  provider/sink protocol); durable history stays an official-plugin candidate,
  never a core database dependency.

## References

- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (OQ-011/OQ-012/OQ-013, accepted
  2026-08-27)
- [Lua Runtime RFC](../runtime/lua-runtime-rfc.md) (OQ-009, accepted 2026-08-27)
- [Isolation Resource RFC](../runtime/isolation-resource-rfc.md) (OQ-014, accepted
  2026-08-28)
- [Configuration Model RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/configuration-model-rfc.md) (OQ-010, accepted
  2026-08-27)
- [Plugin system](../extensibility/plugin-system.md) (directional candidate)
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md), [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md), [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md)
- [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (OQ-020, accepted
  2026-08-28)
