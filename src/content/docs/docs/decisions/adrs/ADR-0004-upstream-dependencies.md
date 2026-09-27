---
title: ADR 0004 - Upstream Dependency Set
description: Records adopt, wrap, or fork decisions for candidate upstream libraries with maintenance policy and supply-chain constraints
category: decisions
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 34
---

# ADR 0004 - Upstream Dependency Set

## Status

Accepted on 2026-08-26 by the project initiator, closing open question
[OQ-006](../open-questions.md). Version numbers cited are
observation evidence at authoring time; the implementing task pins exact
versions in a lockfile. No dependency is added to any repository by this ADR.

Amended on 2026-09-16 (CTX-0214, bitty#835 review follow-up): the rule-5
license policy is restated by the dated amendment in the Decision section
below. The accepted text is preserved and the deviation is recorded
explicitly rather than rewritten.

## Context

[ADR 0001](ADR-0001-repository-bootstrap-baseline.md) left every dependency
table empty. The [Technology and Dependency Strategy](../../project/technology-strategy.md)
fixes the preference order — use upstream, then wrap, then decompose or
narrowly fork — and requires that no third-party type becomes part of Bitty's
stable public or internal architecture without an abstraction boundary. The
[Security Overview](../../security/overview.md) treats package sources as
untrusted supply chains requiring manifest validation, lock, checksum, and
provenance policy, and requires bounded parsing for every untrusted input.
This ADR applies that governance to the first candidate library set.

## Decision

### Maintenance policy (applies to all rows)

1. Every dependency enters through `cargo add` with an explicit semver range,
   is locked by committed `Cargo.lock`, and is audited by `cargo vet` (or
   `cargo audit` until vet review capacity exists) in CI.
2. Domain components are consumed only via Bitty-owned wrapper crates; core
   semantics crates depend on no third-party public type.
3. A strategic fork requires, before creation: the missing capability, the
   upstream issue or PR link, patch surface, synchronization strategy, exit
   conditions, and a named maintenance owner. Forks live as vendored paths in
   the workspace (`vendor/`), never as silent patches.
4. Any dependency that becomes unmaintained for over twelve months while on a
   hot path must be replaced or forked under rule 3.
5. Licenses must be MIT, Apache-2.0, BSD, ISC, Zlib, or dual Apache-2.0/MIT;
   copyleft (GPL/AGPL/MPL/EUPL) dependencies are prohibited anywhere in the
   dependency graph of shipped binaries. Each row below records its check. As
   amended on 2026-09-16, the canonical allowlist and the single per-crate
   `MPL-2.0` exception are recorded in [License policy amendment
   (2026-09-16)](#license-policy-amendment-2026-09-16); the copyleft
   prohibition stands everywhere outside that named exception.

### License policy amendment (2026-09-16)

Rule 5's original text stands as accepted history; this dated amendment is the
explicit deviation record. The source of truth is the merged `bitty` gate
(`deny.toml` plus the `Supply chain (deny/audit)` job in
`.github/workflows/ci.yml`; bitty#835 / CTX-0505, merge commit `d4b091e`),
which runs `cargo deny check` 0.20.2 and `cargo audit` 0.22.2.

Canonical license allowlist, exactly as implemented in `deny.toml`
(`[licenses].allow`, confidence threshold `0.8`; workspace-private crates are
skipped by `[licenses.private].ignore`):

- Rule-5 core set: MIT, Apache-2.0, Apache-2.0 WITH LLVM-exception,
  BSD-3-Clause, BSD-2-Clause, ISC, Zlib.
- Additional permissive licenses required by unavoidable transitive
  dependencies: Unicode-3.0 (`unicode-ident`), CC0-1.0 (`hexf-parse` via
  `naga`), BSL-1.0 (`clipboard-win` and `error-code` via `arboard` on
  Windows).
- `Apache-2.0 WITH LLVM-exception` is the LLVM exception variant offered
  alongside plain Apache-2.0/MIT by `linux-raw-sys`, `rustix`, `wasi`,
  `wasip2`, and `wit-bindgen`; only permissive alternatives are relied on.
- The list is kept to licenses actually encountered; allowed-but-unused
  entries are pruned (bitty#835 removed `CDLA-Permissive-2.0` and
  `Unicode-DFS-2016` for this reason).

MPL-2.0 exception (the rule-5 deviation):

- The only copyleft node in the shipped dependency graph is `dwrote` 0.11.5,
  used by `crossfont` for the Windows-only DirectWrite backend; it has no
  permissive alternative today. `deny.toml` scopes `MPL-2.0` per crate
  (`exceptions = [{ allow = ["MPL-2.0"], crate = "dwrote" }]`) instead of a
  blanket allowance, so the prohibition stays enforced everywhere else.
- Revisit trigger: remove the exception when `crossfont` drops `dwrote` or a
  permissive replacement exists. Any other copyleft node requires a new dated
  revision of this ADR, never an extension of this exception.

Advisory-ignore policy (mirrors the same CI job):

- `RUSTSEC-2026-0192` (`ttf-parser`, unmaintained, winit/Metal paths) and
  `RUSTSEC-2024-0436` (`paste`, unmaintained) are enumerated as ignores in
  both `deny.toml` (`[advisories].ignore`) and the `cargo audit --ignore`
  step until upstream replacements land, composing with rule 4.
- Ignore entries are visible enumerations, not standing waivers: they are
  re-checked as part of rule-4 maintenance and removed when a replacement
  lands.

Gate status: `cargo audit` remains the active advisory gate under rule 1
until `cargo vet` review capacity exists; `cargo deny` plus `cargo audit` is
the implemented supply-chain gate today.

### Decisions per candidate

| Candidate                                                   | Decision                                                                                                                                              | License check                                                                                                                                                         | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VT parsing: `vte` vs `alacritty_terminal` vs `wezterm-term` | **Adopt `vte`** (alacritty/vte, ~0.15.x) inside `bitty-vt` behind the crate's own API; reject `alacritty_terminal` and `wezterm-term` wholesale       | Apache-2.0 — compatible                                                                                                                                               | Terminal state machines are Core semantics (strategy table: own directly). `vte` provides only a state-machine table + `Perform` trait, which maps exactly onto the parser→`TerminalAction` split in the Architecture Overview. `alacritty_terminal` and `wezterm-term` bundle grid/state/replay opinions that would contaminate Terminal Truth ownership and are hard to partially adopt. If `vte` proves insufficient, escalate to a narrow synchronizable fork of its tables only.                                                                                        |
| PTY: `portable-pty`                                         | **Wrap** (wezterm/wezterm `portable-pty`, ~0.9.x) behind `bitty-pty`; do not expose its types                                                         | MIT — compatible                                                                                                                                                      | Cross-platform Unix/ConPTY handling is domain infrastructure where upstream reuse beats reimplementation, but process lifecycle, backpressure, and security limits are Bitty-owned invariants, hence wrapper not raw adoption. Fallback if unmaintained: extract to owned fork under rule 3.                                                                                                                                                                                                                                                                                 |
| Windowing/input: `winit`, `crossterm`                       | **Adopt `winit`** (~0.30.x) inside `bitty-platform`; **do not adopt `crossterm`** as a runtime input path                                             | Apache-2.0 — both compatible                                                                                                                                          | `winit` is the maintained cross-platform window/event-loop baseline matching GPU rendering. `crossterm`'s alternate-screen model conflicts with owning a full renderer and terminal emulation; it may be used in dev tooling/tests only, never in shipped binaries.                                                                                                                                                                                                                                                                                                          |
| Rendering/fonts: `wgpu` vs `skia-safe` vs `crossfont`       | **Adopt `wgpu`** (~25.x line) in `bitty-render`; **wrap `crossfont`** for rasterization behind the glyph cache; **reject `skia-safe`**                | wgpu Apache-2.0/MIT dual; skia-safe MIT but binds Skia (BSD-style with ICU components); crossfont Apache-2.0/MIT — all license-compatible; rejection is architectural | `wgpu` gives Vulkan/Metal/DX12/GL abstraction without a C++ monolith; Skia adds a large C++ supply chain and text-stack opinions Bitty does not need. `crossfont` stays wrapped because font discovery/rasterization policy (fallback, shaping hooks) is Core presentation semantics. Shaping (HarfBuzz binding) is deferred to the text RFC and enters only behind the same wrapper.                                                                                                                                                                                        |
| Lua: `mlua` vs `piccolo`                                    | **Wrap `mlua`** (LuaJIT disabled; stock Lua 5.4 backend initially) inside `bitty-plugin-host`; **track `piccolo`** (~0.3.x) as a watch-list candidate | mlua MIT — compatible; piccolo MIT — compatible                                                                                                                       | Config and plugin VMs need mature bindings plus sandboxing primitives now; `piccolo`'s pure-Rust stackless VM is attractive for memory accounting/gc-arena isolation but still experimental, so it cannot be the P0 runtime. Re-evaluate piccolo at the plugin-isolation RFC (OQ-014); migration cost is contained because Lua enters only behind the host wrapper. Refined 2026-09-20: the plugin-VM successor path is now Phodopus, a sandbox-first fork of `piccolo`, per [ADR 0012](ADR-0012-phodopus-runtime.md); the accepted `mlua` wrap decision above is unchanged. |

All versions above were verified against crates.io/GitHub at authoring time;
the implementing task re-verifies and pins exact versions.

## Consequences

- Hot-path semantics stay Bitty-owned; third-party code concentrates in
  `bitty-vt` internals, `bitty-platform`, `bitty-render`, and wrapper layers,
  keeping the replaceability goal of the technology strategy.
- Supply-chain surface is bounded to a short allowlist; anything outside these
  rows needs its own ADR revision.
- The 2026-09-16 amendment binds the ADR to the shipped gate: `deny.toml` is
  the implementation source of truth, the amendment enumerates the canonical
  allowlist, the single per-crate `MPL-2.0` exception, and the ignored
  informational advisories. Any new license or ignore requires a dated
  revision of this ADR rather than a silent allowlist edit.
- `skia-safe` and `crossterm` rejections can be revisited cheaply since neither
  enters any crate today.
- The `mlua` choice creates a future migration consideration toward `piccolo`
  or WASM-based isolation; this risk is recorded rather than resolved here. As
  refined on 2026-09-20, the `piccolo` successor direction is
  [ADR 0012](ADR-0012-phodopus-runtime.md) (Phodopus); WASM-based isolation
  remains an alternative.

## Open questions

- Shaping/font fallback stack details follow the text RFC (see OQ-007 scope).
- `piccolo` adoption timing is decided with OQ-014 isolation mechanisms.
  Refined on 2026-09-20: the successor runtime direction is
  [ADR 0012](ADR-0012-phodopus-runtime.md), with `bitty-lua` migration deferred
  until Phodopus is usable.
