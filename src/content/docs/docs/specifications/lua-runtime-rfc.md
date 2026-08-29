---
title: Lua Runtime RFC
description: Defines the accepted Lua runtime, sandbox, standard-library subset, module search rules, and diagnostics contracts for OQ-009.
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 14
---

# Lua Runtime RFC

## Status

Accepted on 2026-08-27 by the project initiator. This RFC defines the accepted
Lua runtime, sandbox construction, restricted standard-library subset, rooted
module resolution rules, diagnostics contract, source-only loading, and host
bridge for OQ-009. It closes open question
[OQ-009](../decisions/open-questions.md) at the design level; residual items
are tracked as [OQ-030](../decisions/open-questions.md),
[OQ-031](../decisions/open-questions.md), and
[OQ-032](../decisions/open-questions.md) which remain Open as follow-ups. It does
not claim shipped, stable, or compatibility-guaranteed behavior. Experimental
implementation may exist as review evidence but carries no compatibility promise
beyond the accepted contract.

[ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md) has selected
`mlua` with Lua 5.4 as the P0 baseline (`vendored` Lua 5.4 sources built with
the core crate; `piccolo` remains a watch-list candidate per the ADR). This RFC
does not re-decide the runtime choice; it specifies the sandbox, standard
library subset, module resolution, diagnostics, limits, and lifecycle contract
built on that baseline. That authority remains unchanged per the Wave-C closure
review on 2026-08-27 (CTX-0047) and independent security-auditor review.

It targets OQ-009; it feeds, but does not decide, OQ-010 (configuration model),
OQ-011/OQ-012 (Plugin API v1 and capabilities), OQ-014 (isolation and resource
budgets), and the performance budgets PB-1/PB-2/PB-3 in the
[Performance Budget RFC](performance-budget-rfc.md).

## Problem statement

OQ-009 asks: _which Lua runtime/binding, standard-library subset, module search
rules, schema, and diagnostics contract are used?_ [DIR-003](../decisions/index.md)
accepts Lua as the plugin language and primary configuration language; nothing
yet fixes which Lua implementation Bitty embeds, what its sandboxed standard
library contains, how `require` resolves inside each virtual machine, or what a
user sees when configuration fails to load.

The typed configuration schema itself is owned by the
[Configuration Model RFC](configuration-model-rfc.md) under OQ-010. This RFC
owns the machine that evaluates it.

Normative sources this specification must not weaken:

- [Security overview](../security/overview.md): an isolated Lua VM is a
  namespace and failure boundary, not an OS sandbox; the host constructs a
  restricted standard library; privileged work happens only through
  capability-checked APIs; native in-process plugins are forbidden through P0
  and P1; user `init.lua` is trusted code running in a Config VM, while every
  third-party plugin is untrusted and gets its own VM.
- [Core boundaries](../architecture/core-boundaries.md): security policy cannot
  be delegated to Lua; plugins never enter the terminal, render, or input hot
  paths.
- [Technology strategy](../project/technology-strategy.md) and [ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md): `mlua` with Lua 5.4 is the P0 baseline (`vendored` Lua 5.4 sources built with the core crate; `piccolo` remains a watch-list candidate). Required validation covering Windows/macOS/Linux/BSD builds, sandbox capability, VM cost, and async/Send requirements still applies; Lua 5.4 is preferred over LuaJIT.
- [Threat model](../security/threat-model.md): T-06 (VM escape via unrestricted
  libraries) and T-14 (unsafe/FFI defects), with risks R-006, R-007, and R-018
  in the [risk register](../security/risk-register.md).

Out of scope: plugin capability identifiers and grant workflows (OQ-012),
per-plugin budget numbers (OQ-014), the declarative plan pipeline (OQ-010), and
package manifest/lock formats (OQ-021/OQ-022).

## Candidate A: Lua 5.4 via vendored `mlua` (accepted baseline)

Embed upstream PUC Lua 5.4 as a vendored dependency of the core workspace,
bound through `mlua` compiled with the Lua 5.4 feature and without the LuaJIT
or Luau features. `vendored` means the C sources build with the core crate on
every Tier 1 platform instead of linking a system Lua.

Trade-offs:

- Pro: matches the [technology strategy](../project/technology-strategy.md)
  candidate, so review starts from the already-recorded direction rather than a
  new one.
- Pro: Lua 5.4 is a complete, documented language with stable semantics;
  integer division, generational GC modes, and `<close>`/`<const>` attributes
  are available to configuration authors.
- Pro: permissive license compatible with core distribution; small enough to
  vendor and pin, which keeps all Tier 1 builds reproducible instead of
  depending on system Lua versions.
- Pro: `mlua` supports constructing a sandboxed environment (whitelisted
  globals, removed loaders) and exposes Rust-side hooks for memory limits,
  instruction hooks, and error capture — the primitives the normative
  restricted-library and budget controls need.
- Con: slower than LuaJIT on compute-heavy Lua code; acceptable if
  configuration evaluation stays data-oriented (see the
  [Configuration Model RFC](configuration-model-rfc.md)) and plugin hot-path
  work remains forbidden by the core boundary.
- Con: `mlua` is third-party glue containing `unsafe` FFI; adopting it imports
  that surface, so acceptance requires an unsafe-surface audit feeding the
  R-018/T-14 exit evidence, plus a pinning policy for upgrades.
- Con: binding-layer API churn between `mlua` releases couples core upgrades to
  an external release cadence; the vendored pin and a recorded upgrade test are
  the mitigation.

## Candidate B: LuaJIT via `mlua`

Embed LuaJIT 2.1 through the same binding layer, keeping everything else from
Candidate A.

Trade-offs:

- Pro: substantially faster Lua execution and a mature FFI, which some plugin
  authors would exploit for performance.
- Con: diverges from the recorded direction ("Lua 5.4 rather than LuaJIT");
  LuaJIT implements the Lua 5.1 language plus extensions, so configuration
  documentation, starter configs, and community material would target a
  different language dialect than the ecosystem's current default.
- Con: platform matrix risk — LuaJIT support across the Tier 1 set (notably
  some BSD/arm64 combinations and Windows toolchains) needs dedicated CI
  evidence that does not exist today.
- Con: the built-in FFI library directly conflicts with the normative
  restricted-standard-library control (R-006/T-06): it must be compiled out or
  stripped at build time, which forfeits most of its performance advantage and
  creates a bypass-class risk if any future flag re-enables it.
- Con: maintenance bus factor of a single implementation stream with slow
  release cadence.

Review should record this candidate as rejected unless new evidence shows
Lua-5.4-class runtimes cannot meet a measured workload budget.

## Candidate C: vendored Lua 5.4 with a Bitty-owned thin binding

Vendor the same PUC Lua 5.4 sources but write the Rust binding directly over
the C API instead of adopting `mlua`.

Trade-offs:

- Pro: smallest third-party trust footprint; no external binding upgrade cycle;
  total control over exactly which C API entry points are reachable.
- Con: maximizes Bitty-owned `unsafe` FFI — precisely the defect class T-14 and
  R-018 gate on — and pushes ref-counting, error handling, and stack discipline
  bugs into first-party code that must be written, fuzzed, and reviewed from
  scratch.
- Con: slower delivery of the Plugin API surface (OQ-011) because every host
  function needs hand-written marshalling that `mlua` partially provides.
- Review note: this candidate is the fallback if the Candidate A audit rejects
  `mlua`; it should not be chosen preemptively without that failure evidence.

## Accepted standard-library subset

Status: **accepted baseline**, identical construction mechanics for every VM
class; per-class deltas below are the only differences review may tune.

Removed or denied in all VMs:

- `os.execute`, `io.popen`, and any process/spawn primitive;
- `io.*` file access except host-provided handles (no implicit filesystem
  authority anywhere, including the Config VM);
- dynamic library loading (`package.loadlib`, native `.so`/`.dll` modules);
- `package.searchers` entries that touch the filesystem outside the VM's
  rooted module tree;
- raw `load`/`loadstring` of bytecode (source-only loading), closing the
  binary-chunk escape class;
- `debug` library except an allowlisted subset (`debug.traceback`) needed for
  diagnostics, with `debug.sethook`, `debug.getupvalue`, and friends removed.

Retained pure-computation base: `string`, `table`, `math`, `utf8`, basic
`os.time`/`os.clock`/`os.date`, and `select`/`next`/`pcall`/`xpcall`-class
fundamentals. These are deterministic, side-effect-free, and sufficient for
declarative configuration authoring.

Per-VM deltas:

| VM class            | Additional authority beyond the shared baseline                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuration VM    | None by default. Trusted-user status means fewer prompts, never ambient OS authority; privileged work still goes through the capability-checked host module.                  |
| System/distribution | Same as the Configuration VM; trust comes from source verification per the [security overview](../security/overview.md), not from extra built-ins.                            |
| Per-plugin VM       | Only the capability-granted host services defined by the plugin contract ([plugin system](../extensibility/plugin-system.md)); details and budgets remain with OQ-012/OQ-014. |

The single host bridge in every VM is a versioned `bitty` module; its function
surface is owned by the respective API RFCs and is out of scope here.

## Accepted module search rules

Status: **accepted**, implementing the accepted direction in
[Lua and XDG configuration](../configuration/lua-and-xdg.md) that avoids
Neovim-style ambient global runtime paths.

1. Each VM resolves `require` only inside its own rooted tree: the
   configuration VM resolves against `$BITTY_CONFIG/lua/`; each plugin VM
   resolves against that plugin's installed module tree. There is no fallback
   chain across trees.
2. Module identity is the dotted name mapped onto the root; relative path
   traversal out of the root is a resolution error, not a silent miss.
3. `package.path`/`package.cpath` mutation is ignored by the loader (the
   variables may exist read-only for compatibility introspection).
4. Resolution results are cached per VM; reload behavior (whether clearing the
   cache is permitted and when) belongs to the reload contract in the
   [Configuration Model RFC](configuration-model-rfc.md).
5. Cross-tree reuse goes through declared host services, never direct
   `require` of another plugin's internals, matching the existing plugin
   boundary.

## Accepted diagnostics contract

1. Every configuration/plugin load error surfaces as a structured diagnostic:
   severity, stable error class (`syntax`, `resolution`, `validation`,
   `runtime`, `budget`), source location (file, line, column where the runtime
   can supply it), and a bounded message.
2. Errors are collected, not fail-fast-silent: the loader reports all syntax
   and resolution errors it can find before handing a valid plan onward, and a
   failed load never leaves a half-applied state (fail-closed to the previous
   good configuration or, on first start, to the minimal built-in
   configuration required by the recovery invariant `bitty --safe`
   depends on — see R-009).
3. Diagnostics render in the terminal UI and are exposed to CLI validation
   (`bitty config check`) so editors and CI consume the same output; the exact
   command grammar remains owned by the [CLI](../interfaces/cli.md) contract.
4. Message strings are developer-facing English, size-bounded, and must not
   echo untrusted file content beyond the quoted offending line.
5. Budget violations (instruction/memory ceilings from OQ-014 mechanics applied
   during evaluation) abort evaluation with the `budget` class and are treated
   as ordinary diagnostics, never as crashes.

## Security review notes

This accepted contract strengthens, and nowhere relaxes, the P0 posture: the
restricted-library construction answers R-006/T-06 for both VM classes;
bytecode-loading denial closes a known escape vector; source-only loading and
rooted resolution bound what a hostile project or plugin tree can influence
before trust decisions (T-08 context); the diagnostics fail-closed rule
protects R-009 recovery. Acceptance of any binding choice must ship the
unsafe-surface audit and fuzz targets for the binding layer as R-018/T-14 exit
evidence, reviewed by a security-auditor persona before implementation starts.

## Open items remaining under OQ-009

The following items were open at proposal and are now dispositioned upon
acceptance on 2026-08-27. Acceptance of this RFC closes
[OQ-009](../decisions/open-questions.md) at the design level; residual items
below are tracked as follow-up work with no remaining OQ-009 closure blocker:

- Resolved by this RFC upon acceptance (closes OQ-009): sandbox construction and
  restricted standard-library subset, rooted module resolution rules, diagnostics
  contract, source-only loading, and the `bitty` host bridge ownership; these
  are Accepted design as of 2026-08-27.
- Migrated to tracked follow-up OQs (remain Open as separate questions, not as
  OQ-009 closure blockers):
  - [OQ-030](../decisions/open-questions.md): exact Lua 5.4.x pin and `mlua`
    version pin, upgrade cadence coordinated with dependency governance (R-019),
    unsafe-surface audit of the pinned `mlua` version (or fallback to
    Candidate C recorded as ADR alongside the technology strategy), and final
    restricted standard-library and `debug` allowlist contents.
  - [OQ-031](../decisions/open-questions.md): whether `os.getenv` is exposed to
    the Configuration VM given trace-minimization defaults, and host-provided
    alternative via the versioned `bitty` module.
  - [OQ-032](../decisions/open-questions.md): async/Send boundary for host calls
    blocking the config VM thread versus returning handles (technology strategy
    validation), whether the Configuration VM receives instruction/memory budgets
    during startup evaluation and how cost is charged against PB-1/PB-2, GC
    tuning defaults and hard memory ceiling numbers pending measurement
    infrastructure, and reload interaction with per-VM module caches (owned
    jointly with the [Configuration Model RFC](configuration-model-rfc.md)).

Closes OQ-009: this RFC closes OQ-009 at the design level; residual items above
have been migrated to OQ-030, OQ-031, and OQ-032 and are tracked separately
as Open follow-ups. Acceptance was per independent security-auditor review of the
sandbox, restricted-library, and source-only loading controls; the frontmatter is
`accepted` and the open-question register row is updated per its close rule.
