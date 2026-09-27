---
title: Phodopus Plugin Runtime (Candidate)
description: Draft candidate direction for the plugin-side Phodopus Lua runtime successor covering module resolution sandbox quotas the async bridge and the Lux binding
category: specifications
audience: plugin-author
document_type: specification
status: draft
website_publish: false
sidebar_order: 25
---

# Phodopus Plugin Runtime (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document records the plugin-ecosystem
> slice of the owner direction to adopt **Phodopus** (a sandbox-first successor
> fork of Piccolo) as the Lua runtime for the plugin VM. It authorizes no
> shipped, stable, or compatibility-guaranteed behavior, weakens no accepted
> source it cites, and makes no implementation claim. Crate names, API
> spellings, and budgets repeated here are direction, not contract. The generic
> runtime, the terminal-side host ABI, and the shared governance decision are
> recorded as owner-pending pointers, not as content of this document.

## Purpose and scope

This document freezes the recorded plugin-side direction for the Phodopus
plugin runtime so future design work starts from a stable input instead of
reconstructing the discussion. It refines, by reference only, the accepted
[Lua Runtime RFC](lua-runtime-rfc.md), the accepted
[Isolation and Resource RFC](isolation-resource-rfc.md), the accepted
[Plugin Host Runtime RFC](plugin-host-runtime-rfc.md), and the accepted
[Plugin Platform RFC](../specifications/plugin-platform-rfc.md). It changes
none of them and promotes no status.

In scope (all **Candidate** unless cited otherwise):

- PH-1: the `require` searcher chain (`phodopus-module`), the
  `PluginVfsSearcher` and `LuxPackageSearcher` bindings, and the capability
  boundary around host filesystem access.
- PH-2: hard memory quotas and Fuel budgets integrated into the runtime builder
  API (`phodopus-sandbox`) with capability-gated resource accounting.
- PH-3: native Lua pattern semantics instead of Rust `regex`, and standard
  `utf8.*` code-point handling kept distinct from terminal typography.
- PH-4: the runtime-agnostic `HostOp::Pending(handle)` suspend/resume bridge
  (`phodopus-async`) and the optional Tokio host adapter.
- PH-5: the generic-runtime versus Bitty-specific boundary, with `bitty-lua` as
  the only Bitty consumer layer.
- PH-6: the six-phase fork roadmap and the explicit `bitty-lua` implementation
  deferral.

Out of scope and owned elsewhere (pointers, not content):

- the generic VM, bytecode compiler, `gc-arena` cycle collector, stackless
  executor, and Fuel mechanism (owner-pending, the `phodopus` runtime project);
- the modular standard library, native Lua patterns, and `utf8.*` implementation
  (owner-pending, the `phodopus` runtime project);
- the terminal-side `bitty-lua` Host ABI boundary, the async host trampoline,
  and the terminal width surface (owner-pending,
  [bitty-terminal-docs](https://github.com/bitty-terminal/bitty-terminal-docs);
  a terminal-side candidate is in flight);
- the governance decision that supersedes the Piccolo watch-list clause and
  records the successor runtime (owner-pending,
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs)); see
  [Owner-pending pointers](#owner-pending-pointers);
- plugin manifest, capability grammar, and the accepted package lifecycle,
  including the release-blocking installation-executes-no-code rule (accepted,
  [Package integrity, activation, and rollback](../packaging/package-lifecycle-rfc.md)
  Invariant 8). The pre-implementation
  [Plugin package management](../extensibility/package-management.md) page is
  `status: draft` and is not cited as an accepted owner anywhere on this page.

The accepted contract is unchanged by this direction: the configuration VM
remains `mlua` over vendored Lua 5.4 and the plugin VM remains `piccolo 0.3.3`
until an implementing task migrates `bitty-lua`. `bitty-lua` implementation work
is deferred until Phodopus is usable; this page schedules nothing and migrates
nothing.

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  untrusted-by-default posture, capability families, the isolated-VM
  namespace-and-failure-boundary rule, the restricted standard library, and the
  rule that privileged work happens only through capability-checked APIs.
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
  and [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md):
  T-06/T-07 and T-14 with R-006, R-007, R-018, and R-019.
- [Lua Runtime RFC](lua-runtime-rfc.md) (accepted): the sandbox construction,
  restricted standard-library subset, rooted module search rules,
  source-only loading, and diagnostics contract for the plugin VM.
- [Isolation and Resource RFC](isolation-resource-rfc.md) (accepted): the
  per-plugin isolation domain, RC-1 instruction and wall-clock budget, RC-2
  memory ceiling, RC-11 store quota, and the FS-1..FS-9 failure semantics.
- [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) (accepted): the host
  bridge and per-plugin VM lifecycle, the component-ownership placement, and the
  synchronous non-blocking `Send` contract for host services.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (accepted):
  the capability model, grants, commands, events, and lifecycle generations that
  any runtime binding must pass through.
- [Plugin system](../extensibility/plugin-system.md) (draft): candidate
  direction for per-plugin isolated VMs, no cross-plugin private imports, and
  versioned host-mediated services; the accepted isolation and capability
  owners are the [Lua Runtime RFC](lua-runtime-rfc.md), the
  [Isolation and Resource RFC](isolation-resource-rfc.md), and the
  [Plugin Platform RFC](../specifications/plugin-platform-rfc.md).

This page moves no requirement between owners, adds no capability identifier,
and downgrades no P0 gate. If any mechanism here contradicts a normative source,
the normative text wins.

## Terminology

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted document already decides the point; this page only links or restates it. |
| Candidate         | Proposed direction that no review has accepted.                                      |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Open              | A question left unresolved until an owning contract decides it.                      |
| Illustrative-only | A sketch whose spelling or bounds are explicitly undecided.                          |

Names such as `phodopus-module`, `phodopus-sandbox`, `phodopus-async`,
`PluginVfsSearcher`, `LuxPackageSearcher`, and `HostOp::Pending(handle)` are
**Illustrative-only** direction for the intended crate and API shape; they bind
no crate, module, or symbol until an owning contract accepts them.

## PH-1 Module resolution and the searcher chain (Candidate)

**Candidate.** In the plugin VM, `require("mod")` resolves through a pluggable
searcher chain rather than an ambient global path:

1. preloaded modules already registered in the VM;
2. embedded modules shipped with the runtime or the plugin artifact;
3. a virtual-filesystem (VFS) searcher rooted in the plugin's own module tree;
4. a host resolver reached only through a capability-checked host service.

Bitty binds the VFS searcher (a plugin-tree resolver) and the Lux package
searcher (vendored pure-Lua dependencies) under its capability model, so a
plugin cannot traverse the host filesystem arbitrarily: every searcher above the
VFS layer yields to a capability check, and an unadmitted path is a resolution
error rather than a silent miss.

Composed with the accepted contracts:

- The accepted rooted module-search rules stay authoritative
  ([Lua Runtime RFC](lua-runtime-rfc.md#accepted-module-search-rules)): each VM
  resolves only inside its own tree, there is no cross-tree fallback chain,
  `package.path`/`package.cpath` mutation is ignored, and resolution is cached
  per VM.
- Runtime source staging and discovery remain the accepted host-runtime
  contract ([Plugin Host Runtime RFC](plugin-host-runtime-rfc.md)), not a
  searcher responsibility.
- The package-graph direction — vendored, pre-resolved, sandbox-compatible
  pure-Lua dependencies — is recorded in
  [Plugin contract direction (candidate)](../specifications/plugin-contract-direction.md)
  and remains Candidate; the searcher chain must not become an on-device
  resolver for native or unpinned code.

**Open.** The exact searcher ordering and registration surface; the VFS root
shape and its mapping from the accepted rooted module tree; how the Lux package
searcher resolves and pins vendored dependencies; the diagnostics emitted for a
capability-denied resolution; and the interaction between per-VM resolution
caching and the accepted reload contract.

## PH-2 Hard sandbox quotas and Fuel (Candidate)

**Candidate.** Hard resource limits are integrated into the runtime builder API
rather than bolted on later, for example:

```rust
let runtime = Runtime::builder()
    .memory_limit(16 * MiB)
    .fuel_limit(100_000)
    .build()?;
```

Memory quotas, Fuel budgets, cancellation, and resource accounting are part of
the runtime contract and are capability-gated per owner, so accounting is
attributable to a plugin identity and generation.

Composed with the accepted contracts:

- The accepted ceilings stay authoritative
  ([Isolation and Resource RFC](isolation-resource-rfc.md)): RC-1 (10^7 VM
  instructions / 50 ms wall / 8 ms warning) and RC-2 (32 MiB accounted per
  plugin VM) are the contract; a builder default is a mechanism, not a new
  ceiling. The example values above are illustrative and are not the accepted
  RC values.
- Accounting must reconcile with the existing `VmBudgetSnapshot`-style
  instrumentation and fail closed under FS-1..FS-9; a budget that cannot be
  enforced is treated as absent authority and denied.
- The plugin store quota (RC-11) and its error classes stay owned by the
  accepted Isolation and Resource RFC and the
  [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md).

**Open.** How builder defaults map onto the accepted RC-1/RC-2 values and
policy floors; the per-phase budget split (activation versus steady-state
callbacks); how cancellation composes with the accepted failure semantics; and
the final hard-quota API surface before it can be reviewed against RC-1, RC-2,
and RC-11.

## PH-3 Native Lua patterns and Unicode separation (Candidate)

**Candidate.** The runtime implements authentic Lua pattern semantics
(`find`, `match`, `gmatch`, `gsub`) and must never map `string.match` onto the
Rust `regex` crate, which would silently substitute different matching
semantics. The upstream community work for patterns is adapted rather than
re-derived. Standard `utf8.*` operates on Unicode code points and stays distinct
from terminal typography.

Composed with the accepted contracts:

- The accepted retained standard library keeps `string`, `table`, `math`, and
  `utf8` as the pure-computation base
  ([Lua Runtime RFC](lua-runtime-rfc.md#accepted-standard-library-subset)); this
  direction fills in the missing pattern and formatting behavior without adding
  authority.
- Terminal cell width, grapheme segmentation (UAX #29), and East Asian Width
  (UAX #11) are terminal-side concerns and are never runtime semantics; a plugin
  that needs display width requests it through a terminal host surface, not
  through `utf8.*`. That terminal-side surface is owner-pending.
- Malformed patterns and oversized pattern inputs must obey the accepted
  bounded-input and diagnostics rules; a pattern engine is a parser and carries
  its own limits.

**Open.** The completeness bar for pattern behavior against the reference Lua
implementation; capture and replacement semantics; pattern-engine resource
bounds and error diagnostics; and whether any character-class or locale
behavior beyond plain code points belongs in the runtime at all.

## PH-4 Runtime-agnostic async bridge (Candidate)

**Candidate.** Asynchronous host operations cross the VM boundary as a typed
suspension descriptor, for example `HostOp::Pending(handle)`, replacing a
NOOP-waker path that cannot drive an external future. The host adapter — Tokio,
another scheduler, or Bitty's own loop — owns future polling, wakeup, and
coroutine resume. The VM core mandates no specific async runtime; an optional
Tokio adapter is one host choice among others.

Composed with the accepted contracts:

- The accepted host-service wiring boundary and its synchronous non-blocking
  `Send` contract stay authoritative
  ([Plugin Host Runtime RFC](plugin-host-runtime-rfc.md)); this direction
  composes with it and does not restate or amend it.
- Pending handles are bounded and cancellable under the accepted budget model; a
  host operation fails closed under the accepted timeouts rather than blocking
  the terminal or the plugin VM.
- No async mechanism enters the terminal hot paths; the accepted hot-path
  isolation and no-plugin-in-hot-path rules remain in force.

**Open.** The `HostOp` variant set and handle representation; the cancellation,
ordering, and re-entrancy semantics of resume; the bounded pending-queue size
and timeout attribution; and how the bridge composes with the accepted `Send`
boundary without weakening it.

## PH-5 Generic-runtime boundary versus the `bitty-lua` Host ABI (Candidate)

**Candidate.** The generic `phodopus-*` crates stay Bitty-agnostic. Two hard
boundaries apply:

- no `bitty.ui`, `bitty.panel`, `bitty.fs`, or `bitty.command` knowledge inside
  the VM core or its standard library;
- no hard Tokio (or other async-runtime) dependency in the VM core.

The `bitty-lua` Host ABI is the only Bitty-specific consumer layer and mounts
strictly on top of the generic runtime as an unprivileged consumer.

Composed with the accepted contracts:

- Component ownership and the `bitty-lua` seam placement remain the accepted
  contract ([Plugin Host Runtime RFC](plugin-host-runtime-rfc.md)); this
  direction adds no Bitty type to the runtime and no runtime type to Bitty's
  stable contracts.
- Host surfaces remain capability-checked and versioned
  ([Plugin Platform RFC](../specifications/plugin-platform-rfc.md)); the ABI
  layer is the sole place that maps runtime operations onto granted
  capabilities.
- A Bitty-agnostic core is what keeps the accepted RC ceilings attributable and
  the runtime independently auditable.

**Open.** The exact crate split and crate names; the host-seam module boundary
between `bitty-lua` and the generic runtime; and the licensing, vendoring, and
dependency-governance policy for adopting the runtime, which belongs to the
owner-pending governance decision.

## PH-6 Six-phase roadmap and `bitty-lua` deferral (Candidate)

**Candidate.** The path to Bitty integration is a six-phase roadmap:

1. fork with preserved history, attribution, and an upstream-tracking remote;
2. absorb mature upstream community contributions (formatting, patterns, UTF-8,
   stack diagnostics);
3. build the module resolver and the remaining standard-library gaps;
4. hard memory quotas, Fuel policy, and capability sandboxing;
5. generic async bridge with an optional host adapter;
6. Bitty integration through the `bitty-lua` Host ABI.

Phases are dependency-ordered: a later phase presumes the earlier capability and
its review gates. The plugin-side consequence is a **deferral**:
`bitty-lua` implementation work waits until the generic runtime is usable. Until
then the accepted `mlua`/Lua 5.4 configuration contract and the accepted
`piccolo 0.3.3` plugin-VM pin remain unchanged and accurate; no runtime swap is
claimed or scheduled, and no crate is removed or re-pinned.

**Open.** The phase-to-milestone mapping; the readiness gate that ends the
deferral; the migration and parity evidence required before any runtime swap at
the `bitty-lua` seam; and the upstream absorption policy (which upstream changes
are taken, adapted, or superseded).

## Security review

| Concern                    | Required control                                                                                                              | Source                                                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Host filesystem traversal  | `require` reaches the host only through a capability-checked resolver; an unadmitted path is a resolution error.              | This document (Candidate); [Lua Runtime RFC](lua-runtime-rfc.md); [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md). |
| Memory exhaustion          | RC-2 accounted ceiling per VM with gc stepping and hard refusal; builder quotas are mechanisms under the accepted ceiling.    | [Isolation and Resource RFC](isolation-resource-rfc.md) (Accepted, T-07/R-007).                                                                                          |
| Infinite-loop denial       | RC-1 Fuel and wall-clock deadline with fail-closed suspend; no unbounded callback executes.                                   | [Isolation and Resource RFC](isolation-resource-rfc.md) (Accepted).                                                                                                      |
| Pattern-engine DoS         | Patterns are a parser with bounded input and bounded backtracking cost; oversized or malformed patterns fail closed.          | This document (Candidate); [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md).                                         |
| Semantic substitution      | Rust `regex` is rejected for Lua pattern semantics; no silent behavior change is introduced by a dependency.                  | This document (Candidate).                                                                                                                                               |
| Async re-entrancy          | Pending handles are bounded and cancellable; resume never re-enters the VM outside a scheduler boundary.                      | This document (Candidate); [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) (Accepted `Send` contract).                                                             |
| Bitty coupling in the core | No Bitty API and no hard async-runtime dependency in the runtime core; `bitty-lua` is the only consumer.                      | This document (Candidate); [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) (Accepted ownership).                                                                   |
| Capability bypass          | No searcher, quota, or async mechanism adds a path around the accepted capability model or its grants.                        | [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (Accepted).                                                                                              |
| Supply chain               | Fork licensing, attribution, and dependency governance are owner-pending; adoption must satisfy R-019 and the dependency ADR. | This document (Owner-pending); [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md).                                   |

This section records direction; acceptance requires independent security
reviewer evidence and a full traceability table against the shared corpus.

## Verification plan

An accepted revision would need at least:

1. Metadata and link gates: `just check` with zero markdownlint, link,
   metadata, language, agents, and hygiene issues.
2. Module tests: the searcher chain order is deterministic; an unadmitted path
   fails with a resolution diagnostic; `package.path` mutation is ignored; no
   cross-tree fallback exists.
3. Searcher security tests: a plugin cannot reach outside its rooted tree
   through any searcher; a capability-denied resolution produces no partial
   state.
4. Sandbox tests: RC-1 Fuel and wall-clock deadline terminate an unbounded
   callback; RC-2 refuses allocation at the accounted ceiling and triggers the
   accepted escalation ladder.
5. Pattern tests: `find`/`match`/`gmatch`/`gsub` conform to reference Lua
   pattern semantics; a Rust-`regex`-style alternative is absent; malformed and
   oversized patterns fail closed.
6. Unicode tests: `utf8.*` operates on code points only; no width, grapheme, or
   East Asian Width behavior is exposed through the runtime.
7. Async tests: a suspended operation resumes correctly through the bridge;
   cancellation is bounded; the VM core builds with no async-runtime
   dependency; the optional adapter is the only place a scheduler is bound.
8. Boundary tests: the generic runtime builds with no Bitty API; `bitty-lua` is
   the only crate that binds Bitty types; the accepted `Send` contract holds.
9. Deferral guard: current `mlua`/Lua 5.4 and `piccolo 0.3.3` pins remain
   accurate until a migration task changes them with parity evidence.

Evidence belongs to the owning implementation repositories; this page records
direction only.

## Alternatives considered

| Alternative                                        | Trade-off                                                                                                      | Disposition                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Keep the Piccolo watch-list candidate as-is        | No new artifact, but upstream lacks `require`, patterns, `utf8.*`, tracebacks, async, and hard quotas.         | Rejected; the plugin VM cannot meet the accepted contracts on that base.                  |
| In-tree vendor patch series over Piccolo           | No new repository, but becomes an unmaintainable divergent patch with no independent review surface.           | Rejected; an independent successor fork with an upstream-tracking remote is chosen.       |
| Ambient `package.path`/`LUA_PATH` resolution       | Familiar Lua authoring, but grants filesystem-shaped authority and breaks per-VM rooted resolution.            | Rejected; a capability-checked searcher chain over a rooted VFS is chosen.                |
| Map `string.match` onto the Rust `regex` crate     | Less code, but silently substitutes different matching semantics for Lua patterns.                             | Rejected; authentic Lua pattern semantics are adapted instead.                            |
| Bind the VM core to Tokio or another async runtime | Simplest host integration, but couples the runtime to one scheduler and blocks embedded and test use.          | Rejected; a runtime-agnostic typed suspension bridge with an optional adapter is chosen.  |
| Put Bitty APIs directly in the runtime             | Fewer layers, but makes the runtime Bitty-specific and un-auditable as a general-purpose engine.               | Rejected; the generic runtime stays Bitty-agnostic and `bitty-lua` is the only consumer.  |
| Implement `bitty-lua` migration immediately        | Earlier integration, but targets an unusable runtime and changes an accepted contract without parity evidence. | Rejected; implementation is deferred until Phodopus is usable and parity evidence exists. |
| Conflate `utf8.*` with terminal width              | One helper surface, but mixes code points with cell width, graphemes, and East Asian Width.                    | Rejected; `utf8.*` stays code-point based and terminal typography stays terminal-side.    |

## Affected contracts

Each direction below refines or composes with an owning document; the mark
records whether that owning point is Accepted, Candidate, or Open today.

| Direction                                   | Mark      | Owning document and disposition                                                                                                                                                                                                                                            |
| ------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PH-1 module resolution and searcher chain   | Candidate | [Lua Runtime RFC](lua-runtime-rfc.md) (Accepted rooted search rules), [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) (Accepted source staging), [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (Accepted capability model); searcher surface Open. |
| PH-2 hard sandbox quotas and Fuel           | Candidate | [Isolation and Resource RFC](isolation-resource-rfc.md) (Accepted RC-1, RC-2, RC-11, FS-1..FS-9); builder-to-ceiling mapping Open.                                                                                                                                         |
| PH-3 native patterns and Unicode separation | Candidate | [Lua Runtime RFC](lua-runtime-rfc.md) (Accepted standard-library subset); terminal typography owner-pending to [bitty-terminal-docs](https://github.com/bitty-terminal/bitty-terminal-docs).                                                                               |
| PH-4 runtime-agnostic async bridge          | Candidate | [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) (Accepted `Send` and host-service contract); `HostOp` semantics Open.                                                                                                                                                |
| PH-5 generic boundary versus `bitty-lua`    | Candidate | [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) (Accepted component ownership), [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (Accepted capability model); crate split Open.                                                                       |
| PH-6 six-phase roadmap and deferral         | Candidate | [Lua Runtime RFC](lua-runtime-rfc.md) (Accepted, unchanged); governance decision owner-pending to [bitty-docs](https://github.com/bitty-terminal/bitty-docs); phase-to-milestone mapping Open.                                                                             |

The accepted contracts this page refines are not edited here; where a mark is
Accepted, the owning document wins over any wording on this page.

## Owner-pending pointers

The following directions belong to other owners and are pointers only, not
decisions of this corpus.

| Theme                                                                   | Owner and disposition                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical Phodopus runtime documentation                                | [phodopus](https://github.com/bitty-terminal/phodopus); the runtime's own architecture and specification corpus lives at <https://github.com/bitty-terminal/phodopus/tree/main/docs> (VM model, sandbox/Fuel, modular stdlib, module resolver, async trampoline, and roadmap). This Bitty-side page records only the dependency relationship and integration boundary, never a copy of that content. |
| Governance decision superseding the Piccolo watch-list clause           | [bitty-docs](https://github.com/bitty-terminal/bitty-docs); tracked by [bitty-docs issue 359](https://github.com/bitty-terminal/bitty-docs/issues/359) (intended record `docs/decisions/adrs/ADR-0012-phodopus-runtime.md`); not yet merged.                                                                                                                                                         |
| Terminal-side `bitty-lua` Host ABI, async trampoline, and width surface | [bitty-terminal-docs](https://github.com/bitty-terminal/bitty-terminal-docs); tracked by [bitty-terminal-docs issue 85](https://github.com/bitty-terminal/bitty-terminal-docs/issues/85) (intended record `specifications/phodopus-host-abi-candidate.md`); not yet merged.                                                                                                                          |
| Generic runtime project, crates, and licensing                          | [phodopus](https://github.com/bitty-terminal/phodopus); the runtime project owns its own crate split, CI, release, and security review.                                                                                                                                                                                                                                                              |
| Shared governance, security corpus, and dependency ADRs                 | [bitty-docs](https://github.com/bitty-terminal/bitty-docs); linked, never copied.                                                                                                                                                                                                                                                                                                                    |

## Open points

These are **candidate open items, not accepted open questions**. Each must be
decided in the owning contract before any direction here becomes contract:

1. Owner review of the Phodopus successor direction and its plugin-runtime
   consequences (PH-1..PH-6).
2. The searcher-chain ordering, VFS root shape, and the Lux package searcher's
   resolution and pinning rules (PH-1).
3. The builder-to-ceiling mapping for RC-1/RC-2, the per-phase budget split, and
   the final hard-quota API surface (PH-2).
4. The Lua pattern completeness bar, replacement semantics, and pattern-engine
   resource bounds (PH-3).
5. The `HostOp` variant set and handle representation, cancellation and
   re-entrancy semantics, and bounded pending-queue attribution (PH-4).
6. The crate split, host-seam module boundary, and licensing and vendoring
   policy for adopting the runtime (PH-5).
7. The phase-to-milestone mapping, the readiness gate that ends the `bitty-lua`
   deferral, and the migration and parity evidence required before a swap
   (PH-6).
8. Registry entries OQ-009, OQ-014, and OQ-021 as the accepted contracts this
   direction refines; any promotion or new open question belongs to the owning
   governance register, not to this page.

## Acceptance criteria

An accepted version of this direction would need:

1. Independent review by the plugin-ecosystem category owner, a docs curator,
   and a security reviewer, with runtime-owner and terminal-side-owner
   coordination for every mechanism.
2. The owner-pending governance decision in place before any clause here is
   promoted; this page asserts no supersession of the accepted ADRs.
3. A searcher and module-resolution contract that composes with the accepted
   rooted search rules and adds no ambient filesystem authority.
4. A quota and Fuel API reconciled with the accepted RC-1, RC-2, and RC-11
   ceilings and the FS-1..FS-9 failure semantics, with attribution evidence.
5. An async contract that composes with the accepted `Send` boundary and keeps
   every mechanism off the terminal hot paths.
6. A pattern and Unicode contract that preserves authentic Lua semantics and
   keeps terminal typography terminal-side.
7. A generic-runtime boundary that keeps Bitty types out of the runtime core and
   `bitty-lua` as the only consumer.
8. The `bitty-lua` deferral explicitly preserved, with the accepted `mlua`/Lua
   5.4 and `piccolo 0.3.3` contract unchanged until migration evidence lands.
9. No weakening of any normative security control; every high-risk identifier
   receives independent security review.

## P0 Review Sign-off

Not signed. This document is a **draft candidate**: it records direction for
future review and records no accepted contract. P0 review and sign-off apply
only when the direction is proposed for acceptance in an owning contract, with
runtime-owner and terminal-side-owner coordination for mechanisms and the host
ABI boundary.

## References

- [Lua Runtime RFC](lua-runtime-rfc.md) — accepted Lua runtime, sandbox,
  standard-library subset, and module search rules.
- [Isolation and Resource RFC](isolation-resource-rfc.md) — accepted isolation
  boundaries, RC ceilings, and failure semantics.
- [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) — accepted host bridge,
  VM lifecycle, and host-service `Send` contract.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) — accepted
  manifest, capability, command, event, and lifecycle contract.
- [Plugin contract direction (candidate)](../specifications/plugin-contract-direction.md) —
  candidate framework layering, Lux tooling, and artifact direction.
- [Package integrity, activation, and rollback](../packaging/package-lifecycle-rfc.md)
  — accepted package integrity, staged activation, and rollback contract
  (Invariant 8: installation runs no package code).
- [Plugin system](../extensibility/plugin-system.md) — draft plugin boundaries,
  isolation, and composition (candidate direction only).
- [Plugin package management](../extensibility/package-management.md) — draft
  pre-implementation packaging, sources, updates, and trust (not an accepted
  owner).
- [bitty-docs](https://github.com/bitty-terminal/bitty-docs) — shared
  governance, ADRs, security corpus, and the open-question register.
- [bitty-terminal-docs](https://github.com/bitty-terminal/bitty-terminal-docs) —
  terminal-platform host ABI, typography, and text-domain contracts.
- [Phodopus](https://github.com/bitty-terminal/phodopus) — the successor runtime
  project; its canonical architecture and specification corpus is the
  [Phodopus documentation tree](https://github.com/bitty-terminal/phodopus/tree/main/docs),
  the authoritative source for the VM model, sandbox/Fuel, modular stdlib,
  module resolver, async trampoline, and roadmap. This page records only the
  Bitty-side dependency relationship and integration boundary.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  and [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) —
  normative posture and abuse cases.
