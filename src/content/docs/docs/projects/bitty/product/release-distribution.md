---
title: Release Distribution Matrix and Hardening Plan
description: Canonical OS distribution support matrix and ordered packaging hardening plan under DIR-020 with the 0.0.21 timing gate
category: product
audience: maintainer
document_type: overview
status: draft
website_publish: false
sidebar_order: 22
---

# Release Distribution Matrix and Hardening Plan

## Status and provenance

- Status: **draft**. This document is the canonical home of the Bitty OS
  distribution support matrix and the ordered packaging hardening plan. It
  records **candidate** work: nothing here authorizes a release, closes an
  open question, or weakens accepted content. Normative contracts stay where
  they are accepted (platform tiers in
  [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md),
  budgets in the Performance Budget RFC, compatibility in `OQ-004` evidence).
- Ownership: bitty-terminal-docs **CTX-0012** — branch
  `ctx-0012/docs-release-distribution`. Parent direction: bitty-docs
  **CTX-0206** (issue `bitty-terminal/bitty-docs#300`,
  [DIR-020](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md)).
  The matrix is derived from the `bitty` `release.yml` / `nfpm.yaml` /
  `PKGBUILD` / `packaging/` state;
  findings are summarized inline in the matrix below. This
  is not a copy of any external analysis.
- Authority note: the direction (matrix, order, timing gate, non-goals) is an
  accepted working direction via DIR-020. Every hardening item below is a
  **candidate implementation plan** whose execution lives in twelve `bitty`
  follow-up tasks (eleven hardening slices plus one release task); see
  [Execution](#execution). No product code, release-pipeline change, or
  release execution happens in this task.
- Companion records:
  [Release Ladder](release-ladder.md) (maturity mapping; this plan does not
  move any risk or maturity state),
  [Release Pre-Study](release-pre-study.md) (crates/binary research method),
  [Formal Release 0.0.1](formal-release-0.0.1.md) (past publish evidence, not
  a template for 0.0.21),
  [Compatibility Matrix](compat-matrix.md) (release-instance test evidence),
  [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md)
  (platform tiers; this matrix is distribution detail under those tiers, not
  a tier change),
  [DIR-019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md)
  (0.0.x versioning policy; release numbering context).

## Timing gate

- **The 0.0.21 release attempt happens ONLY after all `bitty` core parts are
  done.** This plan is preparation, not a release trigger, and must never be
  read as authorization to cut 0.0.21 early.
- Core (per the user directive) means: the Phase-A/B gateway surface, the
  wave extractions, and the bridge. The dedicated `bitty` release task states
  this gate explicitly and stays blocked until core completion is evidenced
  in the owning records.
- Rationale recorded from the note: packaging work is vertical depth
  ("each platform really correct") over horizontal breadth; shipping a
  release before the core is done would freeze packaging around an unstable
  binary.

## Support matrix

- Scope rule: **x86_64 + ARM64 only**. No 32-bit, no RISC-V. (Rust's
  `aarch64-unknown-linux-gnu` is a Tier 1 with Host Tools target, which is
  why Linux ARM64 is a first-class row rather than a stretch goal.)

| Platform          | Arch    | Artifact / package                        | Priority                       |
| ----------------- | ------- | ----------------------------------------- | ------------------------------ |
| Linux glibc       | x86_64  | binary / `.deb` / `.rpm` / `.pkg.tar.zst` | **Tier 1**                     |
| Linux glibc       | aarch64 | binary / `.deb` / `.rpm`                  | **Tier 1, add promptly**       |
| Alpine Linux musl | x86_64  | `.apk`                                    | **Tier 1/2, fix build method** |
| Alpine Linux musl | aarch64 | `.apk`                                    | Later                          |
| macOS             | aarch64 | binary → `.app` / `.dmg`                  | **Tier 1**                     |
| macOS             | x86_64  | binary → `.app` / `.dmg`                  | Tier 1/2                       |
| Windows           | x86_64  | `.exe` → installer                        | **Tier 1**                     |
| Windows           | ARM64   | `.exe`                                    | Tier 2                         |
| FreeBSD           | x86_64  | binary / package                          | Later                          |
| 32-bit / RISC-V   | —       | —                                         | Out of scope                   |

- The most urgent four (recorded as already-visible pipeline inconsistencies,
  not future optimizations): Linux ARM64 matrix entry, Alpine musl build,
  `.pkg.tar.zst` naming, and the dummy terminfo.

## Verified current truth

First-hand verification against the `bitty` checkout at the time of writing
(paths, not pasted secrets):

- `.github/workflows/release.yml` build matrix contains five entries (Linux
  x86_64 with `packagers: "deb,rpm,apk,archlinux"`, Windows x86_64/ARM64,
  macOS x86_64/ARM64) and **no `aarch64-unknown-linux-gnu` entry**, while
  dormant ARM64 logic exists (`if: matrix.target ==
'aarch64-unknown-linux-gnu'` cross-install steps,
  `gcc-aarch64-linux-gnu` / `libfontconfig1-dev:arm64` fallback deps, and
  tolerant missing-artifact handling). The cross code currently never runs.
- `nfpm.yaml` is a single shared file (`arch: amd64`, common contents,
  minimal `deb`/`rpm`/`archlinux` metadata, **no per-distro runtime
  dependency declarations**). All four Linux package formats are built from
  the same `x86_64-unknown-linux-gnu` binary, so the `.apk` currently ships
  a glibc binary on a musl distribution.
- Validation builds to an ephemeral scratch archive correctly, but the
  release step emits `--target "dist/bitty-${target}.${pkg}"`, producing
  `bitty-x86_64-unknown-linux-gnu.archlinux` instead of a pacman-installable
  name such as `bitty-0.0.21-1-x86_64.pkg.tar.zst`.
- `terminfo/bitty.terminfo` is a one-line dummy
  (`# dummy terminfo for nfpm validation`), yet `packaging/PKGBUILD` (and
  `PKGBUILD.bin`) install it to `$pkgdir/usr/share/terminfo/b/bitty`.
  `packaging/PKGBUILD` declares `depends=('fontconfig' 'freetype2')`;
  `packaging/bitty.desktop` ships `Exec=bitty`, `Icon=bitty`,
  `Terminal=false`, `Categories=System;TerminalEmulator;`. No AppStream
  metainfo file exists anywhere under `packaging/`, `nfpm.yaml`, or
  `.github/`.

## Ordered hardening plan (candidate)

Fixed order per the user directive. Each item is independently executable;
bit-by-bit acceptance lives in the owning `bitty` task.

1. **Linux ARM64 matrix entry.** Add `os: ubuntu-22.04, target:
aarch64-unknown-linux-gnu, arch: arm64, packagers: "deb,rpm"` so the
   existing cross logic actually executes. Acceptance: the ARM64 job runs
   and uploads its binary artifact on a trial workflow run.
2. **Real musl/Alpine `.apk` build.** Split Alpine off glibc: build
   `x86_64-unknown-linux-musl` for `apk`, with a native Alpine
   container/VM build preferred over Ubuntu cross-compilation (fontconfig,
   FreeType, and graphics/windowing native deps make cross-musl painful).
   Acceptance: `apk` installs on a clean Alpine container and the binary
   reports `--version`.
3. **Real `.pkg.tar.zst` naming.** Emit
   `bitty-<version>-<rel>-<arch>.pkg.tar.zst` (e.g.
   `bitty-0.0.21-1-x86_64.pkg.tar.zst`) so `sudo pacman -U bitty-*.pkg.tar.zst`
   works naturally. Acceptance: install via `pacman -U` in a clean Arch
   container.
4. **Per-distro runtime dependencies.** Split `deb` / `rpm` / `apk` / Arch
   dependency declarations (Debian `libfontconfig1` / `libfreetype6`, Arch
   `fontconfig` / `freetype2`, Fedora `fontconfig` / `freetype`, Alpine
   `fontconfig` / `freetype`) instead of growing one conditional `nfpm.yaml`;
   target layout `packaging/linux/{common,deb,rpm,alpine,arch}/`.
   Dependencies must be derived from `ldd` / `readelf -d` on the final
   binary in CI — never an impressionistic Wayland/X11/wgpu pile-on.
   Acceptance: a CI gate fails the package when declared deps diverge from
   linked libraries.
5. **Install smoke tests in clean containers.** Packaged ≠ installable ≠
   runnable: Ubuntu (`dpkg -i`), Fedora (`dnf install`), Arch (`pacman
-U`), Alpine (`apk add`) each run install → `bitty --version` → `bitty
doctor` → headless smoke. Acceptance: all four containers green on the
   release workflow.
6. **Real terminfo.** Either define `TERM=bitty` properly (real capability
   entries compiled with `tic`) or stop shipping the fake entry; the dummy
   must not enter a formal package. Acceptance: no dummy content in any
   shipped package; if `TERM=bitty` is claimed, `tic` output verifies.
7. **AppStream metainfo + fixed Linux app ID.** Ship
   `/usr/share/metainfo/<app-id>.metainfo.xml` and fix the application ID
   now (e.g. `run.bitty.Bitty`), unifying `.desktop` name, metainfo,
   Wayland `app_id`, future D-Bus name, and future Flatpak ID — renaming
   later is expensive. Acceptance: metainfo validates (`appstreamcli
validate`) and IDs agree across desktop file, metainfo, and Wayland
   `app_id`.
8. **Linux ARM64 `.deb` / `.rpm`.** Follow-up to item 1: package the ARM64
   binary for Debian- and Fedora-family distributions. Acceptance: install
   - `--version` on ARM64 runners/containers.
9. **macOS `.app` → Universal 2 → DMG.** Fuse the two existing
   `aarch64-apple-darwin` / `x86_64-apple-darwin` binaries into
   `Bitty.app`, then Universal 2, then `Bitty-<version>-universal.dmg`;
   codesign/notarize comes later. End state: ordinary users download one
   DMG, never a target-triple binary. Acceptance: DMG mounts and the app
   launches on both architectures.
10. **Windows Portable ZIP.** Ship `bitty-0.0.21-windows-x86_64.zip`
    (`bitty.exe` + LICENSE + docs) before any installer work; MSIX/MSI /
    setup.exe / winget come later. Acceptance: unzip-and-run works on a
    clean Windows runner.
11. **Deferred bucket.** Windows installer, macOS codesign/notarize,
    FreeBSD packaging, AppImage — explicitly after items 1–10.

## Explicit non-goals

Flatpak, Snap, Gentoo ebuild, Void xbps, Solus, official Nixpkgs presence,
FreeBSD ports, OpenBSD ports. `flake.nix` validation plus AUR, Homebrew, and
Scoop coverage suffice; each further format multiplies architecture ×
dependency × release maintenance cost. The longitudinal direction is to make
the existing formats correct, not to add formats.

## Binary compression

Bare target-triple binaries stay available for now but are **not** the
primary artifact long-term. Versioned bundles carry resources alongside the
binary: `bitty-<version>-<target>.tar.zst` containing `bin/bitty`,
`share/` (applications, icons, metainfo), LICENSE, README, CHANGELOG;
Windows uses `.zip`; macOS converges on the Universal DMG.

## Execution

- The eleven hardening items plus the gated 0.0.21 release task are tracked
  as twelve `bitty` CarryCtx tasks (ready, not started), created by the
  parent CTX-0206 delivery and listed in
  [DIR-020](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md).
  This document is their shared orientation; per-task acceptance criteria
  are authoritative for each slice.
- Definition of done for the whole plan: every shipped package installs and
  smokes clean per item 5, no dummy terminfo ships per item 6, IDs agree per
  item 7 — and the 0.0.21 attempt still waits on the [timing gate](#timing-gate).
