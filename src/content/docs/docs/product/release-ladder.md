---
title: Release Ladder
description: Maps the Pre-alpha / M1 Hardening stage (16 crates be3bdb4, 32 OQs Accepted, soak ~808 tests) to the v0.1-v1.0 maturity ladder and the Implemented/Verified lifecycle
category: product
audience: maintainer
document_type: overview
status: draft
website_publish: false
sidebar_order: 21
---

# Release Ladder

## Status and provenance

- Stage: **Pre-alpha / M1 Hardening** as of 2026-08-29 (`bitty` `be3bdb4`,
  16 crates, 32 OQs `Accepted` per CTX-0083, soak ~808 headless tests).
  This ladder maps the accepted product, architecture, and security contracts
  to the candidate `v0.1`-`v1.0` maturity ladder in
  [Proposed Delivery Sequence](proposed-delivery-sequence.md) without weakening
  normative security controls.
- Lifecycle: `Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`
  per the [Risk Evidence RFC](../specifications/risk-evidence-rfc.md). All
  RFCs/ADRs are `Accepted` and `Implemented` (headless `Implemented` at
  `be3bdb4`) but remain `Implemented` not yet `Verified` until the evidence
  matrix (RS-1..RS-7, `unit`/`integration`/`adversarial`/`manual-audit`/`ci-gate`)
  is satisfied. No risk moves from `Open` while the matrix is `pending`.
- Authority: the ladder is a planning companion to the maturity ladder; it does
  not authorize publication or compatibility. Closing any open question still
  requires its RFC/ADR with independent review per the
  [open-question register](../decisions/open-questions.md).
- Companion evidence: `bitty/docs/product/release-ladder.md` (draft,
  `be3bdb4`) records the crate publish order and `cargo publish --dry-run`
  verification for the workspace. This document mirrors that intent for
  `bitty-docs` navigation.

## Implementation state at M1 Hardening (be3bdb4)

- **Workspace**: 16 members in `bitty/Cargo.toml` (edition 2024, resolver 3,
  `rust-version` 1.85, toolchain 1.97.1): `vt`, `pty`, `platform`, `config`,
  `package`, `lua` (`piccolo` 0.3.3), `term-state`, `ui`, `render`,
  `plugin-host`, `rich`, `ipc`, `agent`, `runtime`, `app`, `core` (seed to be
  retired). Nine leaves/branch crates are `publish = true`, seven tail crates
  remain `publish = false` until `Verified`.
- **Accepted**: 32 OQs (OQ-001..032) via 17 RFCs and 8 ADRs as of 2026-08-29:
  Performance Budget (OQ-001), Platform Support Tiers (OQ-003), Compatibility
  Milestone (OQ-004 M1), Core Workspace Topology (OQ-005), Upstream Dependencies
  (OQ-006), Terminal State (OQ-007), Lua Runtime (OQ-009), Configuration Model
  (OQ-010), Plugin Platform (OQ-011/012/013), Isolation Resource (OQ-014),
  Rich Presentation (OQ-008/015/016), CLI Contract (OQ-017), IPC and Agent
  (OQ-018), DevTools (OQ-019), Headless Deferred (OQ-020 ADR 0008), Package
  Lifecycle (OQ-021), Package Follow-up (OQ-022/026-029), Website Delivery
  (OQ-023), Governance (OQ-024), Risk Evidence (OQ-025), Lua Pins (OQ-030),
  os.getenv Policy (OQ-031), Async/GC Tuning (OQ-032).
- **Implemented but not yet Verified**: `rich` (ImageStore/scene OQ-008/015/016),
  `ipc` (bounded framing 256 KiB, wire v1, peer-credential auth, scopes OQ-018),
  `resolver` (single-version convergence, source-class provenance H-A/H-B/H-C,
  yank/prerelease `yanked (locked)` OQ-022/026-029) at `be3bdb4` with soak
  ~808 headless tests; risk register remains `Open` with matrix `pending`.
- **Governance and Website**: Website Delivery RFC (OQ-023) loader with
  eight-field schema, pinned `src/content/docs-revision.json`, multi-version
  `/docs/<version>/<path>/` and redirect manifest; Governance RFC (OQ-024) MIT
  license, branch protections, `Docs-PR`/`Code-PR` release train — both
  `Accepted` 2026-08-29.

## Candidate maturity ladder (from proposed-delivery-sequence)

| Version | Candidate scope (maturity label, not date)                | Workspace focus at that slice                                                                      | M1 Hardening status                                                                             |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| v0.0.x  | Architecture and protocol prototypes                      | `bitty-core` seed only                                                                             | prototypes done; seed retained but `publish = false`                                            |
| v0.1    | Minimal terminal slice (shell echo, resize, backpressure) | `vt` + `pty` + `term-state` + `platform` + `config` + `render` + `ui` + `runtime` + `app` headless | `Implemented` at `be3bdb4` (headless deterministic replay, 808 tests) but not yet `Verified`    |
| v0.2    | VT and TUI compatibility work                             | `vt`/`term-state` fidelity, compatibility matrix OQ-004                                            | M1 scope defined, verification pending                                                          |
| v0.3    | GPU rendering, fonts, performance, graphics               | `render` `wgpu` 25.0 `crossfont` 0.9, platform surface                                             | `Implemented` headless, `Verified` pending                                                      |
| v0.4    | Lua configuration system                                  | `config` `ConfigPlan` + `lua` `piccolo` 0.3.3 RC-1/RC-2                                            | `Accepted` and `Implemented`, not yet `Verified`                                                |
| v0.5    | Plugin API                                                | `plugin-host` capability/event lifecycle OQ-011/012/013                                            | `Accepted` and `Implemented`, not yet `Verified`                                                |
| v0.6    | Plugin manager and lazy loading                           | `package` lifecycle + manager overlay                                                              | `Accepted` lifecycle/integrity, resolver `Implemented` but signatures draft, `Verified` pending |
| v0.7    | DevTools and debug protocol                               | `runtime` instrumentation seam (no dedicated `bitty-debug`)                                        | `Accepted` per DevTools RFC, `Implemented` not yet `Verified`                                   |
| v0.8    | Rich presentation, Markdown stress                        | `rich` blocks, scene/zone, images OQ-008/015/016                                                   | `Accepted` and `Implemented` at `be3bdb4`, not yet `Verified`                                   |
| v0.9    | IPC, `bitty ctl`, MCP adapter                             | `ipc` + `agent` bounded framing/scopes OQ-018                                                      | `Accepted` and `Implemented` at `be3bdb4` (256 KiB framing, peer creds), not yet `Verified`     |
| v1.0    | Stabilized contracts                                      | All above under semver-compatible surfaces                                                         | requires `Verified` + `Compatible` per risk evidence RFC; not yet claimed                       |

`bittyd` and remote UI are post-v1.0 candidates (OQ-020 deferred per ADR 0008).

## Verification gates (M1 Hardening)

- `just check` 93->94 files 0 issues (`fmt-check` + `markdownlint` + `links` +
  `metadata` + `language` + `agents` + `hygiene` + `actionlint`), `act -n`
  DRYRUN success for `ci.yml` and `codeql.yml`.
- `cargo check --workspace --all-targets --locked` and
  `cargo check --target x86_64-pc-windows-gnu` pass at `be3bdb4`.
- `cargo test --workspace --all-targets --locked` soak ~808 headless tests pass
  (`Implemented`); `cargo clippy -- -D warnings` 0 warnings; `cargo fmt --check` clean.
- Publish order verified via `cargo publish --dry-run` at `be3bdb4` (leaves
  `publish = true` PASS, dependents correctly await index).

## Cross-reference and maintenance

- Candidate spine and early-deferral: canonical in
  [Proposed Delivery Sequence](proposed-delivery-sequence.md#candidate-build-order-spine).
- Compatibility and platform bars: [ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md),
  [Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md) (M1).
- Security gates for `v1.0`: normative in
  [Security Overview](../security/overview.md) and
  [Threat Model](../security/threat-model.md); this ladder does not weaken them.
- Maintain this file alongside `proposed-delivery-sequence.md`: when a version
  slice moves from `Implemented` to `Verified`, update the status column and
  the [risk register](../security/risk-register.md) per the risk evidence RFC;
  `Verified` requires independent security-auditor and P0-AC evidence.
