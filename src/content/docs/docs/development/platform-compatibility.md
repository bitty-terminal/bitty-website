---
title: Platform Compatibility and Dependency Governance
description: Draft capture of the cross-platform dependency and release-compatibility direction
category: development
audience: contributor
document_type: policy
status: draft
website_publish: true
sidebar_order: 16
---

# Platform Compatibility and Dependency Governance

> Status: **draft**. This page is a critical capture of the cross-platform
> dependency and release-compatibility direction. It accepts nothing, adopts no
> dependency, changes no release process, and authorizes no compatibility
> promise. It refines the implications of
> [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md),
> [ADR 0004](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0004-upstream-dependencies.md),
> and decision-register directions DIR-016/DIR-017 (Core network boundary) and
> DIR-020 (release distribution). Those documents remain authoritative; this
> capture never weakens them. Where it references repository state, that state
> is a point-in-time observation, not a contract.

## Source, build, and runtime dependencies

The capture separates three meanings of "reusing a dependency" that must not be
conflated:

1. **Source/download reuse** — Cargo's resolver selects one crate version per
   compatible requirement and downloads it once for the whole graph. Two crates
   declaring the same `reqwest` version already share it.
2. **Build-artifact reuse** — consistent feature sets let Cargo compile a
   dependency once for several dependents; inconsistent features or duplicate
   major versions force separate builds.
3. **Final-binary reuse** — what is actually linked into the shipped artifact.

Consequences recorded:

- A wrapper crate created only to "deduplicate" a dependency is unnecessary;
  the resolver already does dependency graph resolution. A shared crate such as
  a future `bitty-net` is justified only when shared network **policy** is
  needed (proxy, TLS policy, timeout, retry, auth, offline mode, telemetry),
  never for deduplication.
- Duplicate transitive versions in `Cargo.lock` (for example `bitflags`,
  `core-foundation`, `windows-sys`, `zune-*`) are normal in a large
  GUI/GPU/terminal dependency graph and must not be force-unified to make
  `cargo tree --duplicates` empty. Attention belongs to Bitty's own direct
  dependencies and why they disagree.

## Dependency governance direction

The workspace already concentrates external dependencies in clearly owned
crates at the time of writing; with `bitty-ai` entering, the direction proposes
writing that ownership down as policy:

| Policy                   | Direction                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Core dependency budget   | Do not add dependencies that are not required, especially on terminal, render, event-loop, and PTY paths.                        |
| Feature locality         | AI dependencies stay in `bitty-ai`, Lua in the plugin host, network only in crates that genuinely need it, images in image code. |
| Workspace dependency set | Manage shared versions and feature policy in `[workspace.dependencies]` instead of per-crate copies.                             |

Two supporting directions:

- **Core network-free invariant.** Core (terminal, VT, render, platform, PTY,
  IPC, Lua) must never gain a network dependency because of AI, cloud, or
  registry features. This refines, without rewriting, the accepted DIR-016/
  DIR-017 no-initiate boundary.
- **Dependency island for `bitty-ai`.** HTTP, TLS, async runtime, JSON, SSE,
  MCP, and provider dependencies may enter `bitty-ai` (and later dedicated
  crates such as a policy-level network crate, sync, or registry) and must not
  sink into terminal crates through `bitty-runtime`.

### Candidate dependency firewall

The direction proposes an explicit layer model so a review can recognize a
boundary violation from a dependency diff alone:

| Layer | Crates                                                     | Allowed                                      |
| ----- | ---------------------------------------------------------- | -------------------------------------------- |
| L0    | `bitty-core`, `bitty-vt`, `bitty-ipc`, `bitty-package`     | No GUI, GPU, network, or AI dependencies     |
| L1    | `bitty-term-state`, `bitty-ui`, `bitty-config`             | Domain dependencies; no network or AI        |
| L2    | `bitty-platform`, `bitty-render`, `bitty-pty`, `bitty-lua` | One external subsystem each                  |
| L3    | `bitty-runtime`, `bitty-plugin-host`, `bitty-rich`         | Composition and orchestration                |
| L4    | `bitty-ai`, `bitty-app`                                    | High-level capabilities and composition root |

### Immediate actions recorded

1. Add `[workspace.dependencies]`, starting with `winit` and `pollster`;
   extend to `serde`/`tokio`/`tracing` as they spread.
2. Check whether `bitty-app -> bitty-perf` is a real production edge or an
   instrumentation-ownership accident, and drop it in the latter case.
3. Remove the `bitty-term-state` <-> `bitty-ui` dev-dependency cycle long term
   by moving composition tests to a higher layer.
4. Establish the `bitty-ai` dependency island before network and async
   dependencies arrive.
5. Add CI dependency governance: `cargo tree --duplicates` as an observation
   (never a zero-duplicates gate) plus `cargo-deny` for licenses, advisories,
   and bans.

## Compatibility layers and responsibility split

The capture distinguishes source portability (one API across platforms, largely
solved by winit/wgpu), binary portability (what release engineering must
deliver), and runtime compatibility (OS, driver, distribution, and support
policy). It proposes a three-layer compatibility model with an explicit owner
per layer:

| Layer           | Values                                                                     | Owner        |
| --------------- | -------------------------------------------------------------------------- | ------------ |
| Architecture    | `x86_64`, `aarch64`                                                        | Release CI   |
| OS / ABI        | Linux GNU, Linux musl, Windows MSVC, macOS Darwin                          | Release CI   |
| Runtime backend | Window: Wayland, X11, Win32, AppKit; GPU: Vulkan, DX12, Metal, GL fallback | winit / wgpu |

Bitty itself remains responsible for what neither dependency can provide:
minimum Windows/macOS/Linux versions, minimum glibc, musl support, GPU driver
baseline, software fallback policy, fontconfig/FreeType packaging, package
runtime dependencies, release matrix, code signing and notarization, and
real-machine testing of Wayland/X11 and Vulkan/Metal/DX12 paths.

### Release pipeline observations

Three concrete defects were observed in the release pipeline, all
consistent with DIR-020 items 1, 2, and 4, and therefore tracked by the
existing DIR-020 execution tasks rather than newly opened:

1. The release matrix has no `aarch64-unknown-linux-gnu` entry although
   conditionals and tooling for that target exist, so the ARM64 logic never
   runs.
2. The Alpine `.apk` is built by repackaging the glibc binary; Alpine uses
   musl, so this needs a separate musl/Alpine build.
3. `nfpm.yaml` declares no runtime dependencies (`fontconfig`, `freetype`),
   unlike the Arch `PKGBUILD`, so package installs do not guarantee them.

## Platform difference funnel

The direction endorses a funnel shape: features see a platform-neutral API, and
the platform boundary lives in `bitty-platform` (winit), `bitty-render`
(wgpu), and `bitty-pty` (portable-pty). Direction:

- 90% or more of Bitty code must not know which OS it runs on; `#[cfg(...)]`
  stays confined to boundary crates and a few native integration points.
- Abstract common semantics instead of flattening differences. The existing
  `bitty-pty` split (shared contract with `unix.rs`/`windows.rs`, `None` where
  a platform lacks a concept) is the example to follow for PTY, agent
  process control, clipboard, notifications, window effects, global shortcuts,
  and credential storage.
- Wayland policy (compositor owns placement, no global coordinates) can make
  floating panels, popups, drag, always-on-top, and window positioning behave
  differently from X11; Hyprland success is not cross-platform evidence.

## IME and font staging

IME and fonts are recorded as small-API, deep-platform areas. The proposed
four-stage path avoids two large cross-platform crates at once:

1. **Wrapper** — keep `bitty-platform` over winit IME and `bitty-render` over
   `crossfont`, with Bitty-owned types.
2. **Compatibility layer** — add `bitty-platform::text_input` and a
   `bitty-font` abstraction for real defects (fallback, metrics, cache policy)
   before publishing anything.
3. **Conformance suite** — the test asset is the product at this stage: dead
   keys, Pinyin, Kana/Kanji, Hangul, compose, candidate window, cursor
   positioning, selection, and focus loss across Wayland/X11/Windows/macOS
   environments.
4. **Extract a standalone crate** only once the layer no longer depends on
   terminal-specific assumptions.

Upstream-first is recorded as the default: a winit Wayland text-input defect is
reported and fixed upstream rather than forked, and a new abstraction is
justified only when winit's abstraction cannot express a needed capability.
Core should know only semantic types (`Preedit`, `Commit`, `CursorRect`,
`FontFace`, `GlyphRun`, `CellMetrics`, `RasterizedGlyph`, `Capabilities`) and
never Fcitx/IBus/TSF/IMM32/CoreText/fontconfig/text-input protocol names.

## Open items

- Minimum glibc baseline and minimum Windows/macOS versions are undecided.
- GPU baseline, driver support policy, and software-fallback policy are
  undecided.
- The trigger condition for a shared network-policy crate (`bitty-net`) is
  recorded (shared policy, not duplication) but no such crate is approved.
- IME/font compatibility-layer and extraction timing is undecided.
- The dependency-firewall enforcement mechanism (for example a CI
  dependency-DAG check) is not chosen.
- Per-format ARM64 package suitability is unverified.
- Nothing here is accepted or implemented; promotion requires its own review.
