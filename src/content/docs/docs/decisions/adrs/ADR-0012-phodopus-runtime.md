---
title: ADR 0012 - Phodopus Runtime as the Lua Successor Path
description: Records the owner decision to move Bitty's Lua path from the Piccolo watch-list candidate to Phodopus, an independent sandbox-first successor runtime forked from kyren/piccolo
category: decisions
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 42
---

# ADR 0012 - Phodopus Runtime as the Lua Successor Path

## Status

Accepted on 2026-09-20 by the project initiator as an owner decision. This ADR
records the successor runtime direction for Bitty's Lua path at the design
level; it does not describe implemented behavior, does not authorize shipped,
stable, normative, or compatibility-guaranteed behavior, and does not weaken
any normative security control. It refines
[ADR 0004](ADR-0004-upstream-dependencies.md) and
[ADR 0005](ADR-0005-lua-pins-and-stdlib.md) without rewriting their accepted
history, and it refines the
[Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md)
without contradicting it. No dependency is added to any repository by this ADR;
`Cargo.lock` wiring and any crate extraction are owned by the implementing
tasks. Frontmatter `status` is `accepted` per the repository metadata schema;
document status is Accepted. Lifecycle is
`Draft -> experimental review evidence -> Accepted (2026-09-20) -> normative`.

- Deciders: project initiator (owner decision, 2026-09-20), security-auditor
  persona (sandbox, resource-limit, and supply-chain scope per
  [Security Overview](../../security/overview.md) and R-006, R-007, R-018,
  R-019), `bitty-lua` and `bitty-plugin-host` maintainers.
- Related: [ADR 0004](ADR-0004-upstream-dependencies.md) (upstream dependency
  set; the `Lua: mlua vs piccolo` row is refined here),
  [ADR 0005](ADR-0005-lua-pins-and-stdlib.md) (Lua pins, stdlib allowlist,
  unsafe-surface audit; its `piccolo` retention is given a successor
  direction), [ADR 0007](ADR-0007-async-gc.md) (async/Send boundary and GC
  tuning), [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)
  (RC-1, RC-2, FS-1..FS-9), [Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md)
  (sandbox stdlib baseline, module search, diagnostics), and OQ-030 as the
  open-question row it amends.

## Context

### Why the runtime question reopened

[ADR 0004](ADR-0004-upstream-dependencies.md) accepted wrapping `mlua` over
stock Lua 5.4 for the configuration VM and placed `piccolo` (~0.3.x) on a
watch-list as a possible per-plugin VM. [ADR 0005](ADR-0005-lua-pins-and-stdlib.md)
then accepted exact pins, a restricted stdlib and debug allowlist, and an
unsafe-surface audit that retained `piccolo 0.3.3` for the plugin VM, and
[ADR 0007](ADR-0007-async-gc.md) recorded a two-VM split with `mlua` for the
configuration VM and `piccolo` for the plugin VM. Under that split the
`bitty-lua` seam wraps `piccolo` as the per-plugin isolation engine.

Piccolo's core is technically sound: a stackless VM, `gc-arena` memory safety,
roughly 35 µs cold start, and an instruction `Fuel` mechanism. What upstream
does not provide is a complete Lua runtime. As an incomplete micro-engine,
Piccolo upstream lacks `require` and module loading, `string.format`, Lua
pattern matching (`find`, `match`, `gsub`), `utf8.*`, `debug.traceback`, real
asynchronous I/O, and hard memory-allocation quotas. These are not peripheral
niceties: module loading, patterns, formatting, UTF-8, tracebacks, async
suspension, and hard memory ceilings are exactly the capabilities a sandboxed
plugin VM must expose under the accepted security and isolation contracts.

Roughly 29 relevant upstream pull requests exist that would supply much of this
surface — for example `string.format` (#128), Lua pattern matching (#129),
`utf8` (#110), backtraces (#121), and diagnostics (#130 and #135) — but
upstream governance and merge throughput have stalled, so the capabilities
Bitty needs cannot be assumed to land upstream on any useful schedule.

### Why a fork rather than vendored patches

An in-tree vendor patch series would accumulate into an unmaintainable "monster
patch": divergent local edits to a foreign engine, no independent review
surface, and no clean way to absorb upstream work. The owner decision is to
fork Piccolo into an independent, reusable open-source runtime with its own
identity. The fork preserves MIT/CC0 attribution and the upstream commit
history, and it carries an upstream-tracking remote so later upstream work can
be reviewed and absorbed rather than merged blindly.

## Decision

### Adopt Phodopus as the successor runtime

Bitty's Lua path moves from the Piccolo watch-list candidate to **Phodopus**,
an independent sandbox-first successor runtime forked from `kyren/piccolo`.
Phodopus is a standalone runtime with its own identity rather than a Bitty
internal; Bitty consumes it through the same `bitty-lua` host seam that wraps
the plugin VM today. The runtime is MIT/CC0 licensed, retains upstream commit
history, and tracks a configured upstream remote.

Observation at authoring time: the public repository
`bitty-terminal/phodopus` exists with a `main` branch, dual MIT and CC0-1.0
license files, and a forked Piccolo commit history. The runtime remains an
early successor under construction; this ADR records the direction, not a
shipped runtime, and no crate extraction or migration is claimed here.

### Preserve attribution and upstream lineage

- The fork preserves the upstream MIT/CC0 licensing and copyright notices
  alongside the Bitty-terminal contributors.
- The fork retains the upstream commit history rather than squashing it, so
  provenance remains auditable.
- An upstream-tracking remote is configured so upstream pull requests and
  commits remain reviewable for absorption.

### Strict boundary: generic runtime versus Bitty Host ABI

Phodopus stays a generic, host-agnostic Lua runtime. Two hard boundaries apply:

- No Bitty-specific APIs in the runtime. Bitty's `bitty-lua` Host ABI
  (`bitty.ui`, `bitty.panel`, `bitty.fs`, `bitty.command`) sits strictly on top
  as an ordinary consumer; it is never part of the runtime.
- No hard Tokio dependency in the VM core. The runtime must not require a
  specific async runtime to build or run.

Proposed modular crates keep the runtime decomposable instead of a monolith:

| Crate              | Responsibility                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `phodopus-core`    | VM, bytecode compiler, `gc-arena` integration, coroutines, Fuel, and the executor                   |
| `phodopus-stdlib`  | Standard library, including authentic Lua patterns and formatting, UTF-8, strings, tables, and math |
| `phodopus-module`  | `require`, searcher chains, virtual filesystem resolution, and `package.loaded`                     |
| `phodopus-debug`   | Stack traces, source locations, and debugger hooks                                                  |
| `phodopus-sandbox` | Hard memory quotas, Fuel budgets, cancellation, and resource accounting                             |
| `phodopus-async`   | Runtime-agnostic suspend/resume bridge between the VM and a host scheduler                          |

`phodopus-sandbox` and `phodopus-async` are the seams Bitty's host integration
depends on; their contracts are the ones the security and isolation corpus must
review before adoption.

### Runtime-agnostic async

Piccolo's `async_callback.rs` uses a NOOP waker and panics if a future is
awaited, which is unusable for host-driven asynchronous work. Phodopus yields a
typed suspension descriptor, `HostOp::Pending(handle)`, out of the VM. The host
adapter — Tokio, async-std, or another scheduler — drives the future and
resumes the coroutine through the runtime-agnostic bridge. The VM core depends
on no specific async runtime; the optional Tokio adapter is one host choice
among others.

### Patterns and Unicode separation

The runtime rejects mapping `string.match` onto the Rust `regex` crate, which
would silently substitute different semantics. Instead it adapts the upstream
Lua-pattern pull request (#129) for authentic Lua pattern semantics (`find`,
`match`, `gmatch`, `gsub`).
Standard `utf8.*` operates on Unicode code points and stays distinct from
terminal typography: terminal cell width, grapheme segmentation, and East Asian
Width remain terminal-side concerns (`bitty.text.width`), never runtime
semantics.

### First-class sandboxing

Sandbox limits are integrated into the runtime builder API rather than bolted on
later, for example:

```rust
let runtime = Runtime::builder()
    .memory_limit(16 * MiB)
    .fuel_limit(100_000)
    .build()?;
```

Hard memory quotas, Fuel budgets, cancellation, and resource accounting are
part of the runtime contract, composing with the accepted RC-1 and RC-2
ceilings and the FS-1..FS-9 failure semantics.

### Six-phase roadmap

1. Phase 0 — fork, attribution, and upstream-tracking remote.
2. Phase 1 — absorb mature upstream pull requests.
3. Phase 2 — `package`/`require` and the remaining stdlib gaps.
4. Phase 3 — hard memory quotas, Fuel, and capability sandboxing.
5. Phase 4 — generic async bridge plus an optional Tokio adapter.
6. Phase 5 — integrate into Bitty Core through `bitty-lua`.

Phases are ordered by dependency: later phases presume the earlier capability
and its review gates.

### Deferral of `bitty-lua` implementation work

Implementation work in `bitty-lua` is deferred until Phodopus is usable. Today's
accepted contract is unchanged: the configuration VM remains `mlua` over
vendored Lua 5.4 and the plugin VM remains `piccolo 0.3.3` per
[ADR 0004](ADR-0004-upstream-dependencies.md),
[ADR 0005](ADR-0005-lua-pins-and-stdlib.md), and
[ADR 0007](ADR-0007-async-gc.md). This ADR selects the successor direction; it
does not migrate code, change current pins, or reopen the accepted allowlist.

## Consequences

- The plugin VM gains a maintained home for the capabilities upstream Piccolo
  lacks, without an unbounded vendor patch series.
- Runtime improvements become independently reusable and reviewable, and can
  flow back toward upstream rather than living only inside Bitty.
- The fork adds a new maintained artifact to the estate: an owning repository,
  its own CI, release, security review, and dependency-governance obligations
  under [ADR 0004](ADR-0004-upstream-dependencies.md) rule 3 and R-019.
- Bitty's dependency surface for Lua shifts from `piccolo` toward Phodopus
  crates over time; until integration lands, the accepted `mlua`/`piccolo`
  configuration is unchanged and no crate is removed.
- The host-ABI boundary keeps `bitty-lua` replaceable: the runtime can evolve
  behind the seam without leaking runtime types into Bitty's stable contracts.
- The hard-quota and async-bridge seams are now design-level review surfaces for
  the security and isolation corpus before integration.

## Alternatives considered

| Alternative                                    | Disposition                                                                                                                                                                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the Piccolo watch-list candidate as-is    | Rejected — upstream lacks `require`, `string.format`, Lua patterns, `utf8.*`, `debug.traceback`, real async I/O, and hard memory quotas, and merge throughput has stalled; the plugin VM cannot meet the accepted contracts on this base |
| Apply an in-tree vendor patch series           | Rejected — becomes an unmaintainable "monster patch" with no independent review surface and no clean upstream synchronization                                                                                                            |
| Remain on `mlua` plus vendored Lua 5.4         | Retained for the configuration VM — the accepted `mlua`/Lua 5.4 baseline stays in force; it does not resolve the per-plugin memory-accounting and hard-quota goals that motivated the successor runtime                                  |
| Map `string.match` onto the Rust `regex` crate | Rejected — silently substitutes different matching semantics for Lua patterns; authentic Lua pattern semantics are adopted instead                                                                                                       |
| Adopt a third-party async runtime in the core  | Rejected — binds the runtime to one scheduler; a runtime-agnostic typed suspension bridge with an optional adapter is chosen instead                                                                                                     |
| WASM-based isolation                           | Not selected — remains the alternative isolation path recorded in [ADR 0004](ADR-0004-upstream-dependencies.md) consequences; it does not address the missing Lua runtime capabilities                                                   |

## Affected contracts

- [ADR 0004](ADR-0004-upstream-dependencies.md): the `Lua: mlua vs piccolo` row
  and its consequence/open-question lines gain a supersession/refinement pointer
  to this ADR; the accepted `mlua` decision and maintenance policy are
  unchanged.
- [ADR 0005](ADR-0005-lua-pins-and-stdlib.md): the `piccolo` pin table and
  upgrade/unmaintained rules gain a successor-direction pointer; the accepted
  pins and allowlist are unchanged and must stay accurate.
- OQ-030: the register row names Phodopus as the successor path with the
  current `mlua`/Lua 5.4 and `piccolo 0.3.3` contract preserved.
- [Technology and Dependency Strategy](../../project/technology-strategy.md),
  the [decision register](../index.md), and the [ADR index](README.md) route to
  this ADR.
- The accepted security and isolation controls (R-006, R-007, R-018, R-019,
  RC-1, RC-2, FS-1..FS-9) are unchanged and are not weakened; Phodopus
  integration must satisfy them and pass the existing verification gates.

## Open points

- Phodopus crate extraction, versioning, and release cadence are owned by the
  implementing tasks; no crate is published or pinned by this ADR.
- The `HostOp::Pending(handle)` suspension contract, cancellation semantics, and
  the optional Tokio adapter's boundary require security and architecture review
  before integration.
- The `phodopus-sandbox` hard-quota API must be reconciled with the accepted
  RC-1, RC-2, and RC-11 ceilings and with `VmBudgetSnapshot` accounting.
- The timing and sequencing of `bitty-lua` migration remain deferred until the
  runtime is usable; the current `mlua`/`piccolo` configuration stays in force.
- Upstream absorption policy — which upstream pull requests are taken, adapted,
  or superseded — is a Phase 1 review decision.

## References

- [ADR 0004 - Upstream Dependency Set](ADR-0004-upstream-dependencies.md)
- [ADR 0005 - Lua Pins, Upgrade Cadence, Stdlib Allowlist and Unsafe-Surface Audit](ADR-0005-lua-pins-and-stdlib.md)
- [ADR 0007 - Async/Send Boundary and GC Tuning for Lua VMs](ADR-0007-async-gc.md)
- [Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md)
- [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)
- [Technology and Dependency Strategy](../../project/technology-strategy.md)
- [Open-questions register](../open-questions.md) (OQ-030)
- `bitty-terminal/phodopus` — public successor runtime repository (observation
  at authoring time: exists, `main` branch, MIT/CC0-1.0, forked Piccolo history)
- `kyren/piccolo` — upstream project from which Phodopus is forked (CC0-1.0)
