---
title: L1 Install Model and Plugin Capability Declarations (Candidate)
description: Candidate L1 install shape with plugin capability network allow and limit declarations for network and AI upstream dependencies
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 63
---

# L1 Install Model and Plugin Capability Declarations (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document records the
> terminal-platform slice of two follow-ups to the accepted plugin
> contract and the candidate network direction: the L1 install model
> for network and AI extensions, and the plugin manifest capability
> declarations for network and AI upstream dependencies — list-form
> network entries in the accepted `[capabilities]` table, scoped by
> per-capability `[network]` allow tables, plus a `[limits]` table
> with default tiers. It authorizes no shipped, stable, or
> compatibility-guaranteed behavior, weakens no accepted source it
> cites, and makes no implementation claim beyond the explicitly
> labeled built-versus-not-built record below. Command spellings,
> package names, manifest keys, and error shapes repeated here are
> candidate direction, not contract. The `[network]` and `[limits]`
> tables do not exist yet. This document is a contract amendment
> candidate to the OQ-012 follow-up; it changes nothing until the
> owning plugin corpus accepts it.

## Purpose and scope

The candidate network direction fixes the crate split, the unified
runtime and policy core, and the consumer order, but it does not say
how a user installs those pieces or how a plugin declares that it
needs them. Without that answer, a plugin that needs network access
or AI assistance has no portable way to state its dependency, and a
user has no predictable install, diagnose, and upgrade path that
survives the move from an embedded backend to an out-of-process
sidecar.

In scope (all **Candidate** unless cited otherwise):

- LI-1: the single-binary install model with default-off features.
- LI-2: the distribution package split used now.
- LI-3: the extension commands and the doctor surface.
- LI-4: the sidecar phase later with IPC discovery and stable user
  commands across both phases.
- LI-5: the `bitty-ai` install shape (feature-first, service-later).
- RQ-1: the `[capabilities]` network list plus `[network]`
  allow-table shape, with the client-versus-listen,
  HTTP-versus-TCP, and named-host-versus-arbitrary-host
  distinctions.
- RQ-2: the `[limits]` table with the four default tiers.
- RQ-3: install-time resolution extending the accepted v1 `[compat]`
  behavior, plus load-time re-check.
- RQ-4: feature-subset matching with fail-closed actionable errors.
- RQ-5: consent-gated auto-install with pinned source and hash and no
  silent downloads.
- RQ-6: offline cached-resolution behavior.

Out of scope and owned elsewhere (pointers, not content):

- the API and implementation crate internals, feature list detail,
  and consumer order (candidate,
  [bitty-network Shared Network Crates](bitty-network-candidate.md));
- the plugin manifest, permission model, and registry detail beyond
  the capability-declaration half (accepted,
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md);
  direction, `bitty-plugins-docs` owner);
- quota enforcement, plugin lifecycle, and lazy-loading execution
  mechanics (candidate direction owned by a `bitty-plugins-docs`
  record; this note declares what a plugin needs, never how the host
  schedules or enforces it at runtime);
- the Lua surface spelling beyond the declaration keys named here
  (accepted,
  [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md);
  direction, `bitty-plugins-docs` owner);
- the package lifecycle, signature, and store mechanics (accepted,
  [Package Lifecycle RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/packaging/package-lifecycle-rfc.md);
  direction, `bitty-plugins-docs` owner);
- the AI provider implementations and runtime internals (direction,
  `bitty-ai` and `bitty-ai-docs` owners);
- the remote trust boundary and daemon taxonomy (accepted,
  [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md));
- shared governance, decision, and security corpora (linked, never
  copied,
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs)).

## Normative sources this specification must not weaken

- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  (accepted): Core manages resources, state, invariants, and
  mechanisms; plugins manage behavior, policy, and user experience.
  L1 extensions are host-side mechanism; composition stays policy.
- [CLI Contract RFC](cli-contract-rfc.md) (accepted): the stable
  top-level command tree, the `bitty doctor` recovery and diagnostics
  entry point including safe-mode behavior, and the exit-code suite.
  This note adds candidate `ext` subcommands and candidate doctor
  categories; it changes no accepted spelling or exit code.
- [Default Distribution RFC](default-distribution-rfc.md) (accepted):
  the default plugin bundle, the enabled-by-default set, and the
  disable mechanisms. The L1 default-off posture below composes with
  that bundle; it does not reopen the default set.
- [Panel Runtime RFC](panel-runtime-rfc.md) (`Accepted`): the panel
  lifecycle contract; this note adds no lifecycle rule.
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
  (accepted, `bitty-plugins-docs`): the v1 manifest `[compat]`
  ranges resolved by the host at install time and the
  `[capabilities]` table with deny-by-default dotted keys (for
  example `platform.notify=true`) and no allow-all. The list-form
  network entries plus the new `[network]` and `[limits]` tables
  below extend that contract as candidate only.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  (accepted, `bitty-ai-docs`): local-surface concepts the sidecar
  discovery posture composes with.
- [ADR 0008 — Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  (accepted): any remote use of an L1 extension sits behind that
  gate; this record does not reopen it.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  and [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md)
  (normative): least-privilege capability families, sensitive-data
  handling, and the P0 gates. The security corpus co-owns any future
  trust-boundary change.
- [Open-question register, OQ-012](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  (accepted contract, follow-up open): the plugin manifest and
  permission-model question. This document is a candidate amendment
  to that follow-up; the question stays in its current state until
  the owning corpus accepts a successor.

## Terminology

| Term                   | Meaning in this document                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| L0 Core                | The minimal stable core with no network and no AI runtime.                                                       |
| L1 extension           | A host-side Rust capability (network, AI, and their peers) installed alongside or behind the core.               |
| L2 plugin              | A Lua plugin carrying behavior, policy, and user experience; never a network or AI implementation.               |
| Feature                | A compile-time option of an L1 crate; every network and AI feature defaults to off.                              |
| Distribution package   | An operating-system or installer unit (as distinct from a compile feature or a plugin package).                  |
| Sidecar                | An optional out-of-process L1 service (`networkd`, `ai-service` as candidate names) reached over IPC.            |
| IPC discovery          | The host finding a running sidecar over the accepted local IPC surface, with authentication owned by successors. |
| Capability declaration | A plugin's declared L1 need: a list-form entry in `[capabilities]` plus its per-capability allow table.          |
| Network allow table    | The `[network]` table scoping a declared network entry to named hosts (and, where admitted, ports).              |
| Limit tier             | One of `tiny`, `normal`, `heavy`, `system`: the default resource budget a plugin runs under.                     |
| Install-time resolve   | Checking a plugin's capability declarations against the installed L1 set when the plugin is installed.           |
| Load-time re-check     | Repeating that check on every plugin load, because the L1 set may have changed since install.                    |
| Fail-closed            | Refusing to load or serve the plugin when declarations are unmet, with an actionable error.                      |
| Consent-gated install  | Offering to fetch a missing L1 package only with explicit user consent, never silently.                          |
| Cached resolution      | Reusing the last successful resolution record while offline instead of fetching.                                 |

Command spellings (`bitty ext list`, `bitty ext install`,
`bitty doctor`), sidecar names (`networkd`, `ai-service`), package
names, manifest keys, and error shapes below are
illustrative-only candidate spelling.

## LI-1 Single binary with default-off features (Candidate)

**Candidate.** The default install is one `bitty` binary whose L1
features all default to off. A user who installs the base package
gets the network-free L0 core with no socket, TLS, or AI runtime
code enabled by default. Enabling a feature never changes default
behavior for users who did not ask for it, and the default stays
offline.

**Candidate.** Compile features and distribution packages are
different axes. Features decide what the binary can do; packages
decide what the user receives. The same binary shape may be shipped
with different feature sets per package (see LI-2), but no default
package enables an L1 feature implicitly.

## LI-2 Distribution package split now (Candidate)

**Candidate.** The present-tense split is at the package layer, not
the process layer: the base `bitty` package carries the L0 core, and
separate distribution packages carry the L1 extensions (network
support, AI support, and their peers as they arrive). A user adds L1
capability by installing an additional package through the normal
system channel, not by rebuilding from source and not by accepting a
background download.

**Candidate.** Package names, archive layouts, and repository
channels are owned by the distribution successors and are not fixed
here. What this direction fixes is the invariant: installing or
removing an L1 package never renames the user-facing commands (see
LI-3) and never migrates user data.

## LI-3 Extension commands and doctor (Candidate)

**Candidate.** The user manages L1 extensions through a stable
command family, illustrative spelling:

- `bitty ext list` shows which L1 extensions are installed, which
  version and feature set each carries, and whether each was resolved
  from package install or sidecar discovery.
- `bitty ext install <name>` resolves the named extension through
  the system channel with explicit consent (see RQ-5 for the plugin
  side of the same consent rule).
- `bitty doctor` gains L1 categories: it reports the installed L1
  set, the active backend per extension (embedded or sidecar),
  version and feature mismatches against installed plugins, and stale
  cached resolutions (see RQ-6). Doctor output stays diagnostic; it
  never mutates the L1 set.

**Candidate.** These spellings are stable across the embedded and
sidecar phases: the same commands report an embedded backend today
and a discovered sidecar tomorrow, so user documentation and scripts
do not branch on deployment shape.

## LI-4 Sidecars later with IPC discovery (Candidate)

**Candidate.** Moving an L1 implementation out of process is a later
deployment change, not a user-facing break. A future `networkd` and
a future `ai-service` expose the same capability already offered by
the embedded backend, and the host finds them through IPC discovery
over the accepted local surface. Consumers — including
already-shipped plugins — observe no API change across the move,
matching the Service Bridge posture of the parent network
direction.

**Candidate.** Discovery never weakens authentication: the IPC
shape, credential handling, and sandboxing of any sidecar belong to
a deployment successor with security-corpus review, and no sidecar
is implicitly trusted because it is local. A missing, unreachable,
or unauthenticated sidecar resolves exactly like a missing package:
fail-closed with an actionable error (see RQ-4).

## LI-5 bitty-ai install shape (Candidate)

**Candidate.** The AI extension follows the same two-phase shape as
the network extension: feature-first, service-later. In the first
phase, AI capability (provider access through the L1 network path,
local runtime behavior owned by the AI corpus) ships as default-off
features of the host-side extension surface. In the later phase, an
`ai-service` sidecar may move that implementation out of process
behind unchanged consumer-facing behavior.

**Candidate.** The AI runtime holds no network stack of its own at
either phase: it consumes the L1 network extension through the same
API and capability path as every other consumer, preserving the
core-not-equal-network-not-equal-AI boundary of the parent
direction.

## RQ-1 Capability list plus network allow tables (Candidate)

**Candidate.** A plugin declares L1 needs in the accepted
`[capabilities]` table, not in a separate requirement table. The
v1 dotted-key shape stays for the families it already covers (for
example `platform.notify=true`); this amendment adds list-form
network entries to the same table, each scoped by a per-capability
`[network]` allow table. An absent network entry means the plugin
needs no network.

**Candidate.** Illustrative shape only (entry vocabulary, allow
grammar, and port rules are undecided):

```toml
[capabilities]
network = ["http", "websocket"]

[network]
allow = ["api.open-meteo.com"]
```

A weather-class plugin declares client HTTP only, scoped to its
single host. A remote-class plugin declares the wider verbs it
actually needs, still scoped:

```toml
[capabilities]
network = ["quic", "listen"]
```

**Candidate.** Three distinctions are load-bearing and must survive
into the successor: being a network client is not permission to
listen; holding HTTP capability is not permission for raw TCP; and
being allowed to reach a named host is not permission to reach an
arbitrary host. A grant of `["http"]` with
`allow = ["api.open-meteo.com"]` permits client HTTP to that host
only — no listening socket, no raw TCP, no other host.

**Candidate.** Declarations are additive and deny-by-default: a
plugin gets exactly the capability it declares and the host grants,
and nothing else. There is no wildcard that grants all present and
future L1 capability. Host-version compatibility stays in the
accepted `[compat]` table and is not duplicated here; AI value
detail belongs to the AI corpus with the plugin corpus, not to this
note.

## RQ-2 Limits table with default tiers (Candidate)

**Candidate.** A new `[limits]` table bounds what a plugin may
consume: illustrative keys include `memory`, `tasks`, and
`network_connections`, with exact keys and units owned by the
successor. Four default tiers — `tiny`, `normal`, `heavy`,
`system` — cover the common cases, and a plugin may omit the table
entirely to run under the default tier for its install class:

```toml
[limits]
tier = "normal"
```

**Candidate.** The tier bounds (what each tier means in bytes,
tasks, and connections) and the default-tier mapping belong to the
successor. Quota accounting, lifecycle, and lazy-loading execution
mechanics are explicitly not here: they belong to the owning
`bitty-plugins-docs` direction (see Open points), which this note
feeds with declarations only.

## RQ-3 Install-time resolve plus load-time re-check (Candidate)

**Candidate.** Resolution happens twice. At install time, the host
resolves capability declarations against the installed L1 set,
extending the accepted v1 `[compat]` install-time behavior (where
`bitty` and `plugin-api` ranges are already resolved by the host):
a plugin whose declarations are unmet does not install as usable.
At load time, the host re-checks the same declarations on every
load, because the L1 set may have changed since install (package
removed, sidecar stopped, host upgraded).

**Candidate.** The install-time check is advisory-because-explicit:
it produces the same fail-closed error shape as the load-time check
(see RQ-4) and offers the same consent-gated remedy (see RQ-5), but
it never silently fetches the missing extension to make the install
succeed.

## RQ-4 Feature-subset matching and fail-closed errors (Candidate)

**Candidate.** Network matching is subset matching on two axes: the
installed L1 backend satisfies the plugin when its enabled verbs
are a superset of the plugin's declared network list, and the
requested target falls inside the `[network]` allow list. Extra
installed verbs never hurt; a missing verb or an off-allow-list
host always fails. An AI declaration satisfies only when the AI
extension is installed and admitted for the plugin's context.

**Candidate.** Every mismatch fails closed with an actionable error
that names the missing item, the plugin that needs it, and the exact
remedy command or consent prompt. Illustrative error shape only:

- `missing L1 verb: plugin <name> needs <verb>; installed
set is <set>; run <remedy> or grant the prompted install`.
- `host not allowed: plugin <name> requested <host>; allow
list is <list>; widen the declaration or use an admitted host`.
- `AI extension not installed: plugin <name> declares
AI capability; install the AI extension or remove the plugin`.

**Candidate.** A failed check blocks exactly the plugin that
declares the unmet need. It never disables unrelated plugins,
never falls back to ambient network or ambient AI access, and never
downgrades the declaration to a warning.

## RQ-5 Consent-gated auto-install (Candidate)

**Candidate.** When resolution fails, the host may offer to install
the missing L1 package, but only behind explicit user consent. No
path — install-time, load-time, doctor, or background — performs a
silent download. The prompt names the package, its pinned source,
its content hash, and what capability the grant enables; declining
leaves the plugin unloaded with the RQ-4 error retained.

**Candidate.** Any fetched L1 package resolves from a pinned source
with a pinned content hash verified before activation, following the
accepted package integrity posture. An unverifiable payload is
treated as a failed resolution, not as a retryable warning. The
pinning detail (hash algorithm, signature policy, mirror rules)
belongs to the package successor, not this note.

## RQ-6 Offline cached-resolution behavior (Candidate)

**Candidate.** Offline-first is the default posture. When the host
cannot reach the extension channel, it reuses the last successful
cached resolution record: already-installed plugins whose
declarations were satisfied keep loading against the installed L1
set, and the host performs no background fetch and emits no silent
retry storm. A plugin install or L1 change that needs fresh
resolution while offline fails closed with a typed offline error
that distinguishes "unmet declaration" from "cannot check right
now", and `bitty doctor` reports the cached record and its staleness.

**Candidate.** The cache stores resolution inputs (declared tables,
installed L1 versions and features, host version, sidecar presence)
so a stale hit is detectable. A cache entry never grants capability
the installed set no longer provides: if the L1 set changed while
offline in a way the host can observe locally (package removed,
sidecar unreachable), the load-time re-check still fails closed
without network access.

## Built versus not built

Verified 2026-09-23 against the owning workspaces and the accepted
plugin contract. `Implemented` below means the item exists in the
cited owner; nothing below is `Verified`, and nothing authorizes
shipped or compatibility-guaranteed behavior.

| #   | Claim                                                                                        | State            | Evidence                                                                                              |
| --- | -------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | The network crates live in an independent repository under a defined owner                   | Implemented-only | `bitty-network` holds `bitty-network-api` plus `bitty-network`; owner `bitty-core`; transplant merged |
| 2   | The `bitty-ai` workspace is a library-only skeleton with no service binary                   | Implemented-only | runtime and slice crates only, standard library only, no binary and no provider network use           |
| 3   | The v1 manifest resolves `[compat]` ranges at install time                                   | Accepted         | accepted plugin contract: host-resolved `bitty` plus `plugin-api` ranges                              |
| 4   | The v1 manifest enforces dotted-key `[capabilities]` deny-by-default with no allow-all       | Accepted         | accepted plugin contract: every grant explicit, no wildcard                                           |
| 5   | List-form network entries or `[network]` and `[limits]` tables exist                         | NOT built        | no network list entries, no host allow tables, and no limit tiers exist in the accepted contract      |
| 6   | A single `bitty` binary with default-off L1 features ships                                   | NOT built        | no L1 feature set or default-off install model exists in the terminal implementation                  |
| 7   | A distribution package split for L1 extensions exists                                        | NOT built        | no separate network or AI distribution packages                                                       |
| 8   | Stable `ext list` and `ext install` commands exist                                           | NOT built        | no `ext` command family; only the accepted `doctor` diagnostics entry point exists                    |
| 9   | L1-aware `doctor` categories exist                                                           | NOT built        | accepted `doctor` covers its current diagnostics; no L1 set, backend, or stale-cache categories       |
| 10  | A `networkd` or `ai-service` sidecar with IPC discovery exists                               | NOT built        | no sidecar process, no discovery wiring; the embedded-to-sidecar move is direction only               |
| 11  | Install-time declaration resolution with load-time re-check exists                           | NOT built        | no declaration resolver at install or load; only the accepted `[compat]` check runs                   |
| 12  | Consent-gated auto-install with pinned source and hash, and offline cached resolution, exist | NOT built        | no consent prompt, no pinned fetch, no resolution cache, no typed offline error                       |

Rows 5–12 are the gap this candidate exists to name. Any future RFC
that claims to close a row must cite implementation evidence in the
owning repository; this note alone closes nothing.

## Security review

This note designs no install code and no resolver code; it grants no
capability, moves no trust boundary, and changes no P0 gate. The
security-sensitive content is the shape of the future gates:
deny-by-default capability grants with no wildcard, verb-subset plus
allow-list matching that never widens silently (client is not
listen, HTTP is not raw TCP, a named host is not any host),
fail-closed load behavior that never falls back to ambient access,
consent-gated fetching with pinned source and verified hash and no
silent downloads, offline behavior that reuses a detectable cached
record instead of retry-storming, sidecar discovery that inherits
IPC authentication instead of trusting locality, limit tiers that
bound memory, tasks, and connections by default, and audit entries
tying each grant to the plugin, declaration, and L1 version that
satisfied it. A future implementation RFC will need its own security
review covering the manifest parser hardening, allow-list grammar
and port rules, the consent record shape and retention, credential
handling for authenticated extension channels, timeout and retry
ceilings, cache integrity and redaction, and the sidecar IPC
authentication and sandboxing; that review is an acceptance gate for
the successor, not for this note.

## Verification plan

1. `just check` green (format, markdownlint, links, metadata,
   language, agents, hygiene, svg, actionlint) — the Docs quality
   workflow is the merge gate for this docs-only repository.
2. Built-versus-not-built rows re-checked at review time: the
   independent network repository and its two crates with the merged
   transplant, the library-only AI skeleton with no binary, and the
   accepted manifest holding `[compat]` plus dotted-key
   `[capabilities]` with no `[network]` or `[limits]` tables. Any
   drift becomes a revision of the table, never a silent claim.
3. Independent reviewer confirms candidate status is unmistakable,
   the LI and RQ items are stated as direction rather than contract,
   command spellings and manifest keys read as illustrative-only, no
   normative wording leaked in, no research-process reference leaked
   in, and cross-links point at canonical documents rather than
   duplicating them.
4. The document is registered in the Specifications index draft
   table.

## Alternatives considered

- **One install unit with everything enabled.** Rejected: it breaks
  the network-free L0 invariant, forces every user to carry socket,
  TLS, and AI code, and widens the default attack surface for users
  who never enable an L1 consumer. The default stays offline with
  default-off features.
- **Rebuild-from-source as the extension path.** Rejected: source
  builds are a contributor workflow, not a user install model. Users
  add capability through distribution packages and stable commands.
- **Sidecars now with a daemon protocol in this note.** Rejected:
  endpoint identity, discovery, relay, and the daemon IPC are all
  undecided direction, and specifying them here would promise what
  no review has accepted. Embedded backend first with the same user
  commands covers the first consumers.
- **Network as another dotted key.** Rejected: dotted booleans
  cannot express verb subsets or per-host scoping. List-form entries
  plus separate allow tables keep subset matching and host scoping
  auditable, while the existing dotted keys keep their shape.
- **Duplicating host compatibility into the new tables.** Rejected:
  version compatibility and upstream-dependency presence fail
  differently and remedy differently. Host compatibility stays in
  the accepted `[compat]` table; the new tables declare L1 needs
  only.
- **Silent auto-install of missing L1 packages.** Rejected:
  unattended fetching violates least privilege and makes offline and
  metered behavior unpredictable. Every fetch waits for explicit
  consent with pinned source and hash.
- **Warning instead of fail-closed on mismatch.** Rejected: a
  warning that still loads the plugin is an ambient grant by
  another name. Unmet declarations block exactly the declaring
  plugin.
- **Live re-resolution while offline.** Rejected: offline checks
  cannot reach the extension channel, so they must reuse the cached
  record and report staleness rather than fail open or retry in the
  background.
- **Specifying quota, lifecycle, or lazy-loading here.** Rejected:
  execution mechanics belong to the owning `bitty-plugins-docs`
  direction; this note declares needs and never schedules or
  enforces them.
- **Defining the full manifest amendment here.** Rejected: the verb
  vocabulary, allow-list grammar with port rules, tier bounds,
  consent-record detail, cache format, and sidecar protocol belong
  to successor RFCs with implementation evidence and
  security-corpus review. This note fixes only the install and
  declaration shape those documents assume.

## Affected contracts

None changed. This candidate is a contract amendment candidate to
the OQ-012 follow-up: it proposes list-form network entries in
`[capabilities]` plus new `[network]` and `[limits]` tables with
install-time plus load-time resolution behavior against the accepted
[Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
composes with the candidate
[bitty-network Shared Network Crates](bitty-network-candidate.md)
BN-1 through BN-8 as its parent direction, and restates without
altering the accepted [CLI Contract RFC](cli-contract-rfc.md),
[Default Distribution RFC](default-distribution-rfc.md),
[Panel Runtime RFC](panel-runtime-rfc.md), and
[ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md).
Acceptance of a successor RFC would reference this note; it would
not retroactively normativize it.

## Open points

1. The exact declaration key shapes and value syntax (verb
   vocabulary, allow-list grammar with port rules, AI value detail)
   — owned by the manifest successor with the plugin corpus, not
   decided here.
2. The limit tier bounds (what `tiny`, `normal`, `heavy`, and
   `system` mean in bytes, tasks, and connections) and the
   default-tier mapping — owned by the `bitty-plugins-docs`
   direction, not decided here.
3. Quota enforcement, plugin lifecycle, and lazy-loading mechanics
   — owned by the `bitty-plugins-docs` candidate; this note only
   declares needs, not decided here.
4. The distribution package names, archive layouts, and repository
   channels — owned by the distribution successor, not decided here.
5. The `ext` command surface detail and the `doctor` category codes
   — owned by the CLI successor, not decided here.
6. The sidecar IPC shape, authentication, and admission bar for ever
   building `networkd` or `ai-service` — owned by the deployment
   successor with security-corpus review, not decided here.
7. The consent-record shape, pin and hash algorithms, and audit
   retention and redaction policy — owned by the package successor
   with security-reviewer sign-off.
8. The resolution-cache format, integrity protection, and staleness
   bounds — owned by the resolver successor, not decided here.

## Acceptance criteria

1. The document is `draft` candidate status with no normative,
   shipped, stable, or compatibility-guaranteed wording, and states
   it is a contract amendment candidate to the OQ-012 follow-up.
2. LI-1 states the single-binary default-off install model with the
   offline default.
3. LI-2 states the distribution package split used now without
   fixing package names as contract.
4. LI-3 states the `ext list`, `ext install`, and `doctor` surface
   as illustrative-only stable spelling.
5. LI-4 states the later sidecar phase with IPC discovery and stable
   user commands across phases.
6. LI-5 states the `bitty-ai` feature-first, service-later shape
   with no AI-owned network stack.
7. RQ-1 states list-form network entries in `[capabilities]` plus
   `[network]` allow tables with the client-versus-listen,
   HTTP-versus-TCP, and named-host-versus-arbitrary-host
   distinctions, as illustrative-only shape with no wildcard.
8. RQ-2 states the `[limits]` table with the four default tiers,
   omissible, with enforcement owned elsewhere.
9. RQ-3 states install-time resolution extending the accepted v1
   `[compat]` behavior plus load-time re-check.
10. RQ-4 states verb-subset plus allow-list matching with fail-closed
    actionable errors scoped to the declaring plugin.
11. RQ-5 states consent-gated auto-install with pinned source and
    hash and no silent downloads.
12. RQ-6 states offline cached-resolution with a typed offline error
    and stale-cache doctor reporting.
13. The built-versus-not-built table is present, matches the verified
    2026-09-23 record (independent network repository, library-only
    AI skeleton, accepted dotted-key `[capabilities]` with no
    `[network]` or `[limits]` tables), and claims nothing beyond
    `Implemented`-only or `Accepted` where cited.
14. `just check` passes; the document is registered in the
    Specifications index draft table.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling,
or trust decision changes. The security review above records that
disposition, including the deny-by-default, fail-closed,
consent-gated, pinned-fetch, offline-cache, sidecar-authentication,
limit-tier, and audit questions flagged for the successor RFCs.
Those successors will require owner and security-reviewer sign-off
before acceptance.

## References

- [bitty-network Shared Network Crates (Candidate)](bitty-network-candidate.md)
  (`Draft`) — parent direction: the split crates, unified runtime
  and policy, and BN-1 through BN-8 consumer order this note builds
  on.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  (`Accepted`) — ownership tables, the small-core rule, and P0
  gates.
- [CLI Contract RFC](cli-contract-rfc.md) (`Accepted`) — stable
  command tree, `doctor` recovery entry point, and exit-code suite.
- [Default Distribution RFC](default-distribution-rfc.md)
  (`Accepted`) — default bundle and disable mechanisms the L1
  default-off posture composes with.
- [Panel Runtime RFC](panel-runtime-rfc.md) (`Accepted`) — panel
  lifecycle contract this note must not weaken.
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
  (`Accepted`, `bitty-plugins-docs`) — v1 manifest `[compat]` and
  dotted-key `[capabilities]` contract this candidate amends.
- [Package Lifecycle RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/packaging/package-lifecycle-rfc.md)
  (`Accepted`, `bitty-plugins-docs`) — package integrity posture the
  pinned fetch composes with.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  (`Accepted`, `bitty-ai-docs`) — local-surface concepts the sidecar
  discovery posture composes with.
- [Open-question register, OQ-012](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  (`bitty-docs`) — the manifest and permission-model question this
  note follows up as candidate.
- [ADR 0008 — Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  (`Accepted`, `bitty-docs`) — the remote trust-boundary gate L1
  remote use sits behind.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md)
  (`bitty-docs`) — normative security sources.
