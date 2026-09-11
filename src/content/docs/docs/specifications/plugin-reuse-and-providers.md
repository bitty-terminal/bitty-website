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
> [OQ-011](../decisions/open-questions.md),
> [OQ-012](../decisions/open-questions.md), and
> [OQ-013](../decisions/open-questions.md) as a follow-up to the accepted
> [Plugin Platform RFC](plugin-platform-rfc.md). It does not self-accept, does
> not authorize shipped, stable, or compatibility-guaranteed behavior, and
> requires independent category-owner, docs-curator, and security-reviewer
> evidence before acceptance. The lifecycle is Draft -> experimental review
> evidence -> Accepted -> normative; only Accepted or normative documents
> authorize shipped behavior. Headless note: all mechanisms apply to the
> single-process v1.0 host and remain compatible with the headless-runtime
> separation in [ADR 0008](../decisions/adrs/ADR-0008-headless.md).

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
  [Plugin Platform RFC](plugin-platform-rfc.md));
- per-plugin instruction, memory, task, and queue enforcement (OQ-014, accepted
  in [Isolation Resource RFC](isolation-resource-rfc.md));
- Lua standard-library subset, rooted `require`, and diagnostics (OQ-009,
  accepted in [Lua Runtime RFC](lua-runtime-rfc.md); pins OQ-030/OQ-031/OQ-032);
- package manifest, lockfile, and activation model (OQ-021/OQ-022,
  accepted in [Package Lifecycle RFC](package-lifecycle-rfc.md) and
  [Package Follow-up RFC](package-followup-rfc.md));
- local IPC wire, auth, and scopes (OQ-018,
  accepted in [IPC and Agent RFC](ipc-agent-rfc.md));
- headless daemon, detach/reattach, and remote UI trust boundary (OQ-020,
  deferred in [ADR 0008](../decisions/adrs/ADR-0008-headless.md) to post-1.0;
  this RFC remains single-process and daemon-agnostic).

This document refines OQ-011..013 for provider composition; it does not reopen
or weaken any accepted contract.

## Normative sources this specification must not weaken

- [Security Overview](../security/overview.md): untrusted-by-default posture;
  invariants 2, 3, 4, 5, 8, 10; least-privilege capability families;
  generation-based lifecycle; safe-mode startup without third-party plugins.
- [Threat Model](../security/threat-model.md): abuse cases T-06, T-07, T-10,
  T-12, T-13; host mediation of privileged work; no ambient authority.
- [Security Risk Register](../security/risk-register.md): R-006, R-007, R-008,
  R-009, R-013, R-015, R-016, R-017, R-022.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md):
  mechanism/policy split, declarative UI, ownership, observation versus
  interception.
- [Plugin system](../extensibility/plugin-system.md): extension levels 1 to 4,
  register versus claim, qualified naming, service boundary direction.
- [Lua Runtime RFC](lua-runtime-rfc.md): isolated VM per plugin, restricted
  standard library, rooted module resolution, source-only loading, one `bitty`
  host bridge.
- [Plugin Platform RFC](plugin-platform-rfc.md): manifest `bitty-plugin.toml`,
  capability grammar, grant per manifest hash, service `get` with version
  constraint, lazy triggers.
- [Isolation Resource RFC](isolation-resource-rfc.md): RC-1..RC-10 ceilings,
  FS-1..FS-9 failure semantics, three-level queue
  PerSubscription 64 / PerPlugin 1024 events/256 KiB / Global 8192 events/2 MiB
  with `DropOldest` default.
- [ADR 0008](../decisions/adrs/ADR-0008-headless.md): headless runtime
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
  [Plugin Platform RFC](plugin-platform-rfc.md)
  (`process.spawn:CONSTRAINT` naming an allowlisted program and argument shape
  per [plugin-platform-rfc.md:230](plugin-platform-rfc.md)); this draft
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

### Doctor

The draft proposes `bitty plugin doctor` (traceable to the CLI surface owned by
the [CLI Contract RFC](cli-contract-rfc.md) and the package evidence in the
Package Lifecycle RFC) as the verifier for this layer: it resolves each
declared tool, checks version constraints, and reports missing or mismatched
tools with remediation guidance. No package code runs during `doctor`.

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

- Provider selection follows the accepted resolver rules: declared dependency
  with version constraint, deterministic selection, conflict as activation
  error before any VM runs, lazy reservation of service provisions during graph
  construction.
- A service provider remains an ordinary plugin: it has its own VM, its own
  budgets, its own grant per manifest hash, and its own generation lifecycle.
  It does not receive ambient authority for serving a consumer.

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
  [Configuration Model RFC](configuration-model-rfc.md)); the TOML sketch is
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

Status: **proposed** post-1.0 provider set, reusing the three lower layers
before the fourth.

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
  [Technology Strategy](../project/technology-strategy.md) have no evidence
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

## References

- [Plugin Platform RFC](plugin-platform-rfc.md) (OQ-011/OQ-012/OQ-013, accepted
  2026-08-27)
- [Lua Runtime RFC](lua-runtime-rfc.md) (OQ-009, accepted 2026-08-27)
- [Isolation Resource RFC](isolation-resource-rfc.md) (OQ-014, accepted
  2026-08-28)
- [Configuration Model RFC](configuration-model-rfc.md) (OQ-010, accepted
  2026-08-27)
- [Plugin system](../extensibility/plugin-system.md) (directional candidate)
- [Security Overview](../security/overview.md), [Threat Model](../security/threat-model.md), [Risk Register](../security/risk-register.md)
- [ADR 0008](../decisions/adrs/ADR-0008-headless.md) (OQ-020, accepted
  2026-08-28)
