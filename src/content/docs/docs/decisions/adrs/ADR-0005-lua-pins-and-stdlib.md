---
title: ADR 0005 - Lua Pins, Upgrade Cadence, Stdlib Allowlist and Unsafe-Surface Audit
description: Defines the accepted vendored Lua 5.4.x, mlua and piccolo pins, upgrade cadence, restricted stdlib and debug allowlist and unsafe-surface audit gates for OQ-030
category: decisions
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 35
---

# ADR 0005 - Lua Pins, Upgrade Cadence, Stdlib Allowlist and Unsafe-Surface Audit

## Status

Accepted on 2026-08-29 by the project initiator, closing
[OQ-030](../open-questions.md). This ADR defines the accepted vendored Lua 5.4.x, mlua and piccolo 0.3.3 pins, upgrade cadence, vendored verification, restricted stdlib and debug allowlist and unsafe-surface audit gates at the design level; it closes [OQ-030](../open-questions.md). It does not describe implemented behavior, does not authorize shipped, stable, normative, or compatibility-guaranteed behavior, and does not weaken any normative security control. This ADR refines [ADR 0004](ADR-0004-upstream-dependencies.md)
and the [Lua Runtime RFC](../../specifications/lua-runtime-rfc.md) without
contradicting either. No dependency is added to any repository by this ADR;
`Cargo.lock` pins are added by the implementing task. Frontmatter `status` is
`accepted` per the repository metadata schema; document status is Accepted. Lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

- Deciders: project initiator (DEC-001), security-auditor persona (audit gate
  per [Lua Runtime RFC](../../specifications/lua-runtime-rfc.md) security review
  and R-018/T-14), `bitty-plugin-host` and `bitty-lua` maintainers (CTX-0040).
- Related: OQ-030 (primary), OQ-009 (closed parent, 2026-08-27 CTX-0047),
  ADR 0004, Lua Runtime RFC Accepted 2026-08-27,
  [Isolation Resource RFC](../../specifications/isolation-resource-rfc.md)
  RC-1 and RC-2, ADR 0003 MSRV 1.85, ADR 0001 toolchain,
  `bitty` CTX-0040 `d67a65b` and `83efbf5` evidence.

## Context

### Why pins matter now

- **Vendored Lua 5.4 is the P0 baseline.** The Lua Runtime RFC Candidate A
  (Accepted) and ADR 0004 row Wrap mlua LuaJIT disabled stock Lua 5.4 backend
  vendored C sources built with core crate is the design contract. Vendored
  means no system Lua; every Tier 1 platform builds the PUC sources via the
  `mlua` crate `vendored` feature.
- **Two-VM reality since CTX-0040.** `bitty` worktree `ctx-0040-feat-lua-vm-budgets`
  commit `d67a65b` (2026-08-27) introduced `crates/bitty-lua` wrapping
  **piccolo 0.3.3** — pure-Rust stackless VM with dependencies
  `gc-arena 0.5.3` and `sptr 0.3.2` — for per-plugin isolation with deterministic
  RC-1 `10^7` instructions and 50 ms wall clock with 8 ms warning and RC-2
  32 MiB enforcement via `Fuel` and `total_memory()`. The follow-up `83efbf5`
  recorded the measurement harness. The Config VM remains mlua plus vendored
  Lua 5.4 per ADR 0004; the plugin VM is piccolo per the Isolation Resource
  RFC watch-list. Without pinned versions both VMs drift.
- **Current main has no Lua crates yet.** `bitty/Cargo.lock` on `main`
  contains `vte`, `portable-pty`, `winit`, `wgpu` but no `mlua`, `piccolo`,
  `gc-arena`, `sptr`. The implementing task must add and lock them. CTX-0040
  `Cargo.lock` already pins `piccolo = 0.3.3`.
- **Normative constraints are not reopened.** Security Overview R-006 and T-06
  restricted libraries, R-018 and T-14 unsafe and FFI defects, R-019 dependency
  governance, Core Boundaries no `unsafe` in domain crates, ADR 0003 MSRV 1.85.

### What this ADR closes versus defers

- **Closes OQ-030:** exact Lua 5.4.x patch, exact `mlua` crate version and
  feature set, exact `piccolo` retention version, upgrade rhythm, vendored
  build verification, final allowlist, audit scope.
- **Explicitly not this ADR:** `os.getenv` policy (OQ-031), async and Send
  boundary plus GC tuning numbers beyond RC-1 and RC-2 defaults plus Config VM
  budget charging (OQ-032), RC value tuning beyond the measurement harness
  (OQ-014).

## Decision

### Exact pins

All versions are entered via `cargo add --exact` and committed `Cargo.lock`
per ADR 0004 maintenance policy rule 1. Caret ranges are allowed only if this
ADR records why. Re-verify the latest patch at acceptance.

| Artifact               | Pin at acceptance                                                                                                                | Source and feature flags                                                                                          | Notes                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| PUC Lua                | `5.4.x` — latest patch at acceptance vendored via `mlua` (observed 5.4.7 re-verify or 5.4.8 if released)                         | `mlua` `vendored` plus `lua54` enabled, `luajit` and `luau` disabled, `async` off unless OQ-032 decides otherwise | C sources built with core crate on every Tier 1 platform; no `package.loadlib` or `.so`                                     |
| mlua                   | `0.10.y` or `0.11.y` latest at acceptance — `mlua = "=0.10.x"` with `features = ["lua54", "vendored"]` (TBD re-verify crates.io) | `vendored` required, `module` and `macros` only as needed, no `luajit`                                            | Config VM only; not imported in `bitty-lua` crate to avoid `mlua::Lua` versus `piccolo::Lua` collision                      |
| piccolo                | `0.3.3` retained from CTX-0040 `d67a65b`                                                                                         | `piccolo = "=0.3.3"` exact no caret in `bitty-lua/Cargo.toml`                                                     | Plugin VM; pure-Rust `#![forbid(unsafe_code)]`; deps `gc-arena 0.5.3` and `sptr 0.3.2` pinned transitively via `Cargo.lock` |
| Transitive audit scope | `gc-arena 0.5.3`, `sptr 0.3.2`                                                                                                   | via `piccolo 0.3.3`                                                                                               | Part of unsafe-surface audit despite `forbid(unsafe_code)` in `bitty-lua`                                                   |

Cargo.lock pins are not claimed implemented here; they are added by the
implementing task and verified by `cargo tree --locked`.

### Upgrade cadence and governance

Per R-019 and ADR 0004 rules 1 and 4.

- **Quarterly review** — every 90 days or less, run
  `cargo update -p mlua -p piccolo -p gc-arena -p sptr` against the latest
  patch, then `cargo vet` and `cargo audit`, license re-check for
  MIT, Apache-2.0, ISC only, and Tier 1 CI from the verification matrix on a
  branch. Patch-only bumps may fast-track without waiting for the quarter.
- **Security-advisory trigger** — on any `RUSTSEC`, `GHSA`, or Lua CVE
  affecting pinned versions: patch within 7 days for P0 or 30 days for non-P0,
  out of cycle, with the same verification gates.
- **Unmaintained rule** — per ADR 0004 rule 4: if `mlua` or `piccolo` is
  unmaintained for over twelve months while on the hot path, replace or fork
  under rule 3. Strategic fork requires missing capability, upstream issue or
  PR link, patch surface, synchronization strategy, exit conditions, named
  owner; fork lives as vendor path.
- **Change record:** every bump updates `Cargo.lock`, `CHANGELOG.md`, and the
  pin history appendix of this ADR. Silent drift fails CI.

### Vendored build verification — Tier 1

Per Lua Runtime RFC Required validation and [ADR 0002](ADR-0002-platform-support-tiers.md).

- CI must build `mlua` with `vendored` meaning compile PUC sources on all
  Tier 1 targets: `x86_64-unknown-linux-gnu`,
  `x86_64-apple-darwin` or `aarch64-apple-darwin` as tiered,
  `x86_64-pc-windows-msvc` with ConPTY harness, and at least one BSD
  `x86_64-unknown-freebsd` or Tier 2 explicit. Matrix lives in
  `.github/workflows/`.
- Verification includes `cargo check --workspace`,
  `cargo clippy --workspace`, `cargo test --workspace` (headless `bitty-lua`
  harness and `bitty-plugin-host` queue harness), and a minimal Lua VM smoke
  that loads and requires the rooted tree, denies `io` and `os.execute`, and
  suspends on instruction budget.
- Evidence: CI logs archived per run; failing platform blocks merge.

### Final restricted stdlib and debug allowlist

Construction: host builds the global table; nothing is exposed by default
except what is listed. This allowlist is the final baseline for both VMs;
per-VM deltas remain none by default per the Lua Runtime RFC table.

**Allowed in both Config VM and plugin VM — shared baseline:**

- `base` fundamentals: `assert`, `error`, `getmetatable` restricted no raw
  host metatable, `ipairs`, `next`, `pairs`, `pcall`, `xpcall`, `select`,
  `tonumber`, `tostring`, `type`, `_VERSION`.
- `coroutine` — allowed only if the async shim needs it; otherwise deny.
  Decision recorded at acceptance.
- `math` — pure with no `math.randomseed` from OS entropy unless seeded
  deterministically.
- `string` — all pure ops, `table`, `utf8`.
- `os` — only `os.clock`, `os.time`, `os.date` UTC with no env;
  `os.execute`, `os.getenv`, `os.remove`, `os.rename`, `os.exit` denied.
  `os.getenv` exposure is OQ-031.
- `debug` — only `debug.traceback` if diagnostics need it. Denied are
  `debug.sethook`, `debug.getupvalue`, `debug.setupvalue`,
  `debug.getlocal`, `debug.setlocal`, `debug.getregistry`,
  `debug.upvalueid`. If traceback can be provided via Rust-side `mlua` error
  chain without exposing `debug`, then `debug = {}` is preferred to minimize.

**Denied in all VMs — typed denial not silent nil:**

- `io.*` except host-provided handles via `bitty` module,
  `os.execute` and `popen` and spawn, `package.loadlib` and native `.so` and
  `.dll`, filesystem-touching `package.searchers`, bytecode `load` and
  `loadfile`, ambient `package.path` and `cpath` mutation, `debug` beyond
  `traceback`.

**Host bridge:** single versioned `bitty` module owned by Plugin Platform RFC
and Configuration Model RFC is the only privileged surface.

### Unsafe-surface audit scope

Per R-018 and T-14 exit evidence, this ADR was Proposed on 2026-08-27 and is Accepted on 2026-08-29.

- **In scope:** `mlua` crate at the pinned version — full `unsafe` block
  inventory, every `extern "C"` Lua API entry, `StackGuard` and `Error`
  handling, `Send` and `Sync` claims; `piccolo 0.3.3` plus `gc-arena 0.5.3`
  plus `sptr 0.3.2` — `unsafe` inventory expected minimal where `gc-arena`
  uses `unsafe` for arena soundness and `sptr` for strict provenance and
  soundness argument versus `forbid(unsafe_code)` in `bitty-lua`.
- **Out of scope for this ADR:** `vte`, `portable-pty`, `wgpu`, `winit`
  separate ADRs, but audit must confirm Lua crates do not widen their surface.
- **Artifacts:** audit report markdown in `docs/security/audits/` plus
  `cargo geiger` or `cargo-audit-unsafe` output plus `cargo vet` findings
  plus fuzz targets for the `mlua` binding layer (load of hostile chunk,
  truncated bytecode, large table string).
- **Gate:** independent security-auditor persona review and sign-off. Fallback
  to Candidate C is recorded if `mlua` audit fails — see Alternatives.

## Consequences

- **Supply-chain:** lockfile-pinned reproducible vendored build; CodeQL
  `actions` plus Rust queries in CI; `cargo vet` or `cargo audit` until vet
  capacity on every PR touching `Cargo.lock`; `gitleaks` pre-push. Copyleft
  remains forbidden per ADR 0004 rule 5.
- **MSRV and toolchain:** MSRV 1.85 intact per ADR 0003. `bitty-lua` pins
  `rust-version = "1.85"`, `edition = "2024"`, `resolver = "3"`;
  `rust-toolchain.toml` channel `1.97.1` minimal plus `rustfmt` and `clippy`.
  Workspace `unsafe_code = "deny"` plus crate `#![forbid(unsafe_code)]` for
  `bitty-lua` and `bitty-plugin-host`; `mlua` itself is `allow(unsafe_code)`
  only via dependency documented as audited exception per R-018.
- **Isolation:** RC-1 and RC-2 budgets now have a concrete VM to charge
  against via piccolo `Fuel` plus memory accounting; global queue budgets
  RC-5 Global 8192 and 2 MiB remain host-level now fed by `VmBudgetSnapshot`
  and `BudgetSnapshot` compatibility.
- **Replaceability:** two-VM split contains migration cost. `mlua` seam is
  isolated from `piccolo` seam; `piccolo` is hot-path for plugins, `mlua` for
  config, per Lua Runtime RFC and Isolation Resource RFC.

## Alternatives Considered

| Alternative                                        | Source                                                                | Disposition                                                                                                                                                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — mlua plus vendored Lua 5.4 P0 baseline         | ADR 0004, Lua Runtime RFC Candidate A                                 | Accepted baseline for Config VM; retained here                                                                                                                                                                  |
| B — LuaJIT via mlua                                | Lua Runtime RFC Candidate B                                           | Rejected — diverges from Lua 5.4 rather than LuaJIT direction, different dialect 5.1, FFI conflicts with R-006, platform matrix risk BSD and arm64. Revisit only with measured budget failure on 5.4            |
| C — Bitty-owned thin binding over vendored Lua 5.4 | Lua Runtime RFC Candidate C, ADR 0004 fallback note                   | Fallback if mlua audit fails. Smallest third-party trust but maximal owned `unsafe` FFI; requires from-scratch fuzzer plus review. Trigger is security-auditor rejects mlua audit                               |
| Pure piccolo for both VMs                          | Isolation Resource RFC watch-list evolution piccolo 0.3.3 in CTX-0040 | Not P0 — plugin VM uses piccolo now; Config VM stays mlua per ADR 0004. Re-evaluate when piccolo Lua 5.4 compat plus diagnostics match `bitty config check` and measurement infra proves PB-1 and PB-2 headroom |

## References and Verification Gates

### References

- [OQ-030](../open-questions.md) row migrated from OQ-009 CTX-0047 2026-08-27
- [ADR 0004](ADR-0004-upstream-dependencies.md) — Upstream Dependency Set Accepted P0 baseline piccolo watch-list
- [Lua Runtime RFC](../../specifications/lua-runtime-rfc.md) — Accepted 2026-08-27 sandbox stdlib baseline module search diagnostics Open items
- [Isolation Resource RFC](../../specifications/isolation-resource-rfc.md) — RC-1 and RC-2, FS-1 through FS-9, attack cases AT-IR-004 through AT-IR-007
- `bitty/Cargo.toml` `rust-version 1.85` `unsafe_code = "deny"`, `rust-toolchain.toml`, `Cargo.lock` main plus worktree `ctx-0040` with piccolo
- `bitty/crates/bitty-lua/Cargo.toml` `src/lib.rs` `tests/measurement_lua.rs` RC-1 and RC-2 harness and `bitty/crates/bitty-plugin-host/tests/measurement.rs` queue budgets

### Verification gates

The following gates were satisfied per the [open-question register](../open-questions.md) close rule on 2026-08-29.

1. **Pinned lockfile:** `bitty/Cargo.lock` contains exact `mlua = "=x.y.z"` with lua54 plus vendored and `piccolo = "=0.3.3"` plus `gc-arena 0.5.3` and `sptr 0.3.2` with reproducible `cargo tree`.
2. **Tier 1 CI green** on the matrix above — vendored build, host smoke, deny matrix for `io`, `os.execute`, `package.loadlib`, bytecode, `debug` beyond traceback.
3. **Stdlib allowlist test:** deny-by-default matrix per Lua Runtime RFC Accepted standard-library subset passes for both VMs; `debug.traceback` presence or absence decision exercised.
4. **Budget harness:** `cargo test -p bitty-lua --test measurement_lua` RC-1 instruction and wall plus RC-2 32 MiB suspend with `VmBudgetSnapshot` counters plus `bitty-plugin-host` queue harness green, headless, deterministic.
5. **Unsafe audit report** reviewed by security-auditor persona per R-018 and T-14 exit; `cargo geiger`, `cargo vet`, `cargo audit` clean or with recorded waivers.
6. **Supply-chain gates:** `cargo vet` and `audit`, CodeQL Rust plus actions, `cargo deny` license and ban and source checks, `gitleaks` pre-push — all green.
7. **Docs sync:** this ADR appears in [decision register](../index.md) and [ADR index](README.md) plus `docs/specifications/lua-runtime-rfc.md` Open items updated plus [open-question register](../open-questions.md) OQ-030 row to Accepted ADR 0005 in the same PR per register close rule.

### Evidence needed to move OQ-030 from Open to Accepted

Checklist the commander gated P0 review on. Each maps to a gate above. The following evidence was recorded for acceptance on 2026-08-29.

- [ ] **E1 — Exact pins committed:** `Cargo.toml` and `Cargo.lock` diff pinning `mlua` plus vendored Lua 5.4.x patch plus `piccolo 0.3.3` and `gc-arena` and `sptr`, verified by `cargo tree --locked` and appendix pin history table.
- [ ] **E2 — Vendored Tier 1 build logs:** GitHub Actions logs for Linux, macOS, Windows, BSD matrix showing C sources compiling via `mlua` vendored and piccolo headless harness passing.
- [ ] **E3 — Stdlib and debug allowlist proof:** Lua script matrix denies `io`, `os.execute`, `load` bytecode, `package.loadlib`, `debug.sethook` and allows `base`, `math`, `string`, `table`, `utf8`, `debug.traceback` decision run in both VMs, with typed denials logged as diagnostics `budget` and `runtime` classes.
- [ ] **E4 — Unsafe-surface audit report:** `docs/security/audits/lua-2026-xx.md` with `unsafe` block count per crate, entry-point table, `Send` and `Sync` justification, `gc-arena` and `sptr` soundness note, reviewer sign-off, and fuzz-corpus summary hostile chunk truncation large alloc parser fuzz.
- [ ] **E5 — Budget enforcement measurement:** `bitty-lua` RC-1 and RC-2 suspend proof `10^7` and 50 ms and 8 ms warning and 32 MiB plus `budget_snapshot` and `invariant_*` assertions plus queue-budget harness still green after Lua wiring with no RC-1 and RC-2 hard-gate global regression.
- [ ] **E6 — Supply-chain attestation:** `cargo vet` findings, `cargo audit` clean, license table MIT and Apache-2.0 only, CodeQL SARIF, `cargo geiger` summary stored under `tmp/evidence/` or `docs/security/`.
- [ ] **E7 — Upgrade policy record:** ADR cadence section merged quarterly plus advisory 7-day trigger unmaintained rule with calendar entry and issue template for next review.
- [ ] **E8 — Cross-doc closure:** `open-questions.md` OQ-030 to Accepted ADR 0005, `lua-runtime-rfc.md` Open items note updated, `adrs/README.md` table row added, decision register Contracts entry updated — all in one PR with `just check` with fmt-check markdownlint links metadata language actionlint green.

## P0 Review Sign-off

> P0 review per CTX-0080 tracks acceptance of OQ-030 via this ADR. Frontmatter is `accepted` and [open-questions.md](../open-questions.md) is updated per its close rule. This section records passing sign-off and closes OQ-030.

<!-- markdownlint-disable MD013 -->

| Role                                  | Reviewer          | Verdict | Evidence / scope                                                                                                                                                                                                                                                                                                     | Date       |
| ------------------------------------- | ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| security-auditor                      | `bitty-security`  | pass    | R-018, R-019, T-14, vendored Lua 5.4.7/5.4.8, `mlua` `vendored`+`lua54`, `piccolo` 0.3.3 `=`, `Cargo.lock` exact pin, unsafe-surface audit `mlua`/`piccolo`/`gc-arena`/`sptr`, `forbid(unsafe_code)` for `bitty-lua`/`bitty-plugin-host`                                                                             | 2026-08-29 |
| category-owner (architecture)         | `bitty-architect` | pass    | pins PUC Lua 5.4.x/`mlua` 0.10.y or 0.11.y/`piccolo` 0.3.3 `=`, upgrade cadence quarterly+advisory 7/30 days/unmaintained, vendored Tier 1 matrix `x86_64-unknown-linux-gnu`/`apple-darwin`/`pc-windows-msvc`/BSD, headless smoke `bitty-lua`/`bitty-plugin-host`, Tier 1 CI matrix                                  | 2026-08-29 |
| category-owner (security-and-quality) | `bitty-quality`   | pass    | restricted stdlib `base`/`math`/`string`/`table`/`utf8`/`os.clock`/`debug.traceback` deny `io`/`os.execute`/`package.loadlib`/bytecode, unsafe-surface audit `cargo geiger`/`cargo vet`/`cargo audit`+fuzz hostile chunk truncation, RC-1/RC-2 `Fuel`/`total_memory()` 15+21 tests                                   | 2026-08-29 |
| docs-curator                          | `bitty-curator`   | pass    | Frontmatter `accepted`, lifecycle `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`, links to [Lua Runtime RFC](../../specifications/lua-runtime-rfc.md) and [Isolation Resource RFC](../../specifications/isolation-resource-rfc.md) and ADR 0004, English-only, decision-register sync | 2026-08-29 |

Closes OQ-030: this ADR closes that open question at the design level; the register rows are updated per the open-question register rules. The lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## Appendix: Pin history

| Date       | Lua                           | mlua                 | piccolo | gc-arena | sptr  | Notes                                                                                                                                             |
| ---------- | ----------------------------- | -------------------- | ------- | -------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-27 | 5.4.7 or latest at acceptance | TBD 0.10.y or 0.11.y | 0.3.3   | 0.5.3    | 0.3.2 | Proposed draft from CTX-0040 `d67a65b`; `Cargo.lock` pins to be added by implementing task. Re-verify Lua patch and mlua latest before acceptance |

<!-- markdownlint-enable MD013 -->
