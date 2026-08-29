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
   dependency graph of shipped binaries. Each row below records its check.

### Decisions per candidate

| Candidate                                                   | Decision                                                                                                                                              | License check                                                                                                                                                         | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VT parsing: `vte` vs `alacritty_terminal` vs `wezterm-term` | **Adopt `vte`** (alacritty/vte, ~0.15.x) inside `bitty-vt` behind the crate's own API; reject `alacritty_terminal` and `wezterm-term` wholesale       | Apache-2.0 — compatible                                                                                                                                               | Terminal state machines are Core semantics (strategy table: own directly). `vte` provides only a state-machine table + `Perform` trait, which maps exactly onto the parser→`TerminalAction` split in the Architecture Overview. `alacritty_terminal` and `wezterm-term` bundle grid/state/replay opinions that would contaminate Terminal Truth ownership and are hard to partially adopt. If `vte` proves insufficient, escalate to a narrow synchronizable fork of its tables only. |
| PTY: `portable-pty`                                         | **Wrap** (wezterm/wezterm `portable-pty`, ~0.9.x) behind `bitty-pty`; do not expose its types                                                         | MIT — compatible                                                                                                                                                      | Cross-platform Unix/ConPTY handling is domain infrastructure where upstream reuse beats reimplementation, but process lifecycle, backpressure, and security limits are Bitty-owned invariants, hence wrapper not raw adoption. Fallback if unmaintained: extract to owned fork under rule 3.                                                                                                                                                                                          |
| Windowing/input: `winit`, `crossterm`                       | **Adopt `winit`** (~0.30.x) inside `bitty-platform`; **do not adopt `crossterm`** as a runtime input path                                             | Apache-2.0 — both compatible                                                                                                                                          | `winit` is the maintained cross-platform window/event-loop baseline matching GPU rendering. `crossterm`'s alternate-screen model conflicts with owning a full renderer and terminal emulation; it may be used in dev tooling/tests only, never in shipped binaries.                                                                                                                                                                                                                   |
| Rendering/fonts: `wgpu` vs `skia-safe` vs `crossfont`       | **Adopt `wgpu`** (~25.x line) in `bitty-render`; **wrap `crossfont`** for rasterization behind the glyph cache; **reject `skia-safe`**                | wgpu Apache-2.0/MIT dual; skia-safe MIT but binds Skia (BSD-style with ICU components); crossfont Apache-2.0/MIT — all license-compatible; rejection is architectural | `wgpu` gives Vulkan/Metal/DX12/GL abstraction without a C++ monolith; Skia adds a large C++ supply chain and text-stack opinions Bitty does not need. `crossfont` stays wrapped because font discovery/rasterization policy (fallback, shaping hooks) is Core presentation semantics. Shaping (HarfBuzz binding) is deferred to the text RFC and enters only behind the same wrapper.                                                                                                 |
| Lua: `mlua` vs `piccolo`                                    | **Wrap `mlua`** (LuaJIT disabled; stock Lua 5.4 backend initially) inside `bitty-plugin-host`; **track `piccolo`** (~0.3.x) as a watch-list candidate | mlua MIT — compatible; piccolo MIT — compatible                                                                                                                       | Config and plugin VMs need mature bindings plus sandboxing primitives now; `piccolo`'s pure-Rust stackless VM is attractive for memory accounting/gc-arena isolation but still experimental, so it cannot be the P0 runtime. Re-evaluate piccolo at the plugin-isolation RFC (OQ-014); migration cost is contained because Lua enters only behind the host wrapper.                                                                                                                   |

All versions above were verified against crates.io/GitHub at authoring time;
the implementing task re-verifies and pins exact versions.

## Consequences

- Hot-path semantics stay Bitty-owned; third-party code concentrates in
  `bitty-vt` internals, `bitty-platform`, `bitty-render`, and wrapper layers,
  keeping the replaceability goal of the technology strategy.
- Supply-chain surface is bounded to a short allowlist; anything outside these
  rows needs its own ADR revision.
- `skia-safe` and `crossterm` rejections can be revisited cheaply since neither
  enters any crate today.
- The `mlua` choice creates a future migration consideration toward `piccolo`
  or WASM-based isolation; this risk is recorded rather than resolved here.

## Open questions

- Shaping/font fallback stack details follow the text RFC (see OQ-007 scope).
- `piccolo` adoption timing is decided with OQ-014 isolation mechanisms.
