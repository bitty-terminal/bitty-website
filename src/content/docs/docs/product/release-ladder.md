---
title: Release Ladder
description: Maps the Pre-alpha / Engineering Milestones M1-M8 stage (18 crates 29772a3, 32 OQs Accepted, release v0.0.19) to the v0.1-v1.0 maturity ladder and the Implemented/Verified lifecycle
category: product
audience: maintainer
document_type: overview
status: draft
website_publish: false
sidebar_order: 21
---

# Release Ladder

## Status and provenance

- Stage: **Pre-alpha / Engineering Milestones M1-M8** as of 2026-09-08 (`bitty` `29772a3`,
  previous `c49ead1`, baseline `de134ec`, 18 crates, 32 OQs `Accepted`, release `v0.0.19`).
  Experimental implementations `c0aadd2` (CTX-0095 vertical slice, PR #148) +
  `7e3104d` (CTX-0096 dogfood, PR #149) + `a8735d0` (CTX-0098 PTY reply fix,
  PR #151) are `Implemented` (experimental) not `Verified`/`Compatible`. This
  ladder maps the accepted product, architecture, and security contracts to the
  candidate `v0.1`-`v1.0` maturity ladder in
  [Proposed Delivery Sequence](proposed-delivery-sequence.md) without weakening
  normative security controls. `R-004` clipboard evidence was re-audited at
  `bitty` `7a4ee41` (baseline `de134ec`) per
  [`docs/security/audits/clipboard-2026-09.md`](https://github.com/bitty-terminal/bitty/blob/7a4ee41/docs/security/audits/clipboard-2026-09.md)
  (2026-08-31, CTX-0097) and remains `Open` with residual platform-backend,
  real-window UX, and `8192`-byte bound-scope limits; `R-005`/`R-006`/`R-007`
  at `bitty` `d4d75e9` (`5bdcdbd`/`0afc94d`/`d4d75e9`, Issues #137/#138/#139,
  baseline `de134ec`) are `Mitigated` per RS-1..RS-7, overall
  maturity remains `Pre-alpha` (not `Verified`/`Compatible`/`Release-ready`).
  Canonical snapshot:
  [`docs/project/project-state.json`](../project/project-state.json)
  (synchronized `29772a3`, `2026-09-08`, `Pre-alpha / Engineering Milestones M1-M8`, `R-004`
  `Open`, `R-005`/`R-006`/`R-007` `Mitigated`, experimental `c0aadd2`/`7e3104d`/`a8735d0`
  `Implemented` not `Verified`, release `v0.0.19`) validated by `bun .github/scripts/check-state.mjs`.
- Lifecycle: `Draft -> Experimental Implementation -> Accepted -> Verified -> Compatible -> Release-ready`
  (spec) and `Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`
  (crate) per the [Risk Evidence RFC](../specifications/risk-evidence-rfc.md).
  All RFCs/ADRs are `Accepted` and `Implemented` (headless `Implemented` at
  `be3bdb4`, experimental `Implemented` at `a8735d0`) but remain `Implemented`
  not yet `Verified` until the evidence matrix (RS-1..RS-7,
  `unit`/`integration`/`adversarial`/`manual-audit`/`ci-gate`) is satisfied. No
  risk moves from `Open` while the matrix is `pending` except
  `R-005`/`R-006`/`R-007` moved `Open -> Mitigated` at `d4d75e9` per
  PR #144/#145/#146; `R-004` explicitly remains `Open` at `7a4ee41` (not
  `Mitigated`/`Verified`); experimental `c0aadd2`/`7e3104d`/`a8735d0` do not change risk
  state. Overall product remains not `Verified`/`Compatible`.
- Authority: the ladder is a planning companion to the maturity ladder; it does
  not authorize publication or compatibility. Closing any open question still
  requires its RFC/ADR with independent review per the
  [open-question register](../decisions/open-questions.md).
- Companion evidence: `bitty/docs/product/release-ladder.md` (draft,
  `be3bdb4`) records the crate publish order and `cargo publish --dry-run`
  verification for the workspace. This document mirrors that intent for
  `bitty-docs` navigation. For `R-004`, the companion evidence is at `7a4ee41`
  (baseline `de134ec`, audit above) and remains `Open`; for `R-005`/`R-006`/`R-007`,
  companion evidence is at `d4d75e9` (`5bdcdbd`/`0afc94d`/`d4d75e9`, Issues
  #137/#138/#139) per `project-state.json` and remains `Mitigated` (not
  `Verified`).

## Implementation state at 1835175 (post-0223)

- **Workspace**: 18 members in `bitty/Cargo.toml` (edition 2024, resolver 3,
  `rust-version` 1.85, toolchain 1.97.1): `vt`, `pty`, `platform`, `config`,
  `package`, `lua` (`piccolo` 0.3.3), `term-state`, `ui`, `render`,
  `plugin-host`, `rich`, `ipc`, `agent`, `runtime`, `app`, `core`, plus
  verification crates `compat-lab` (bounded harness re-exporting
  `tests/compat/harness.rs`) and `perf` (bench harness owner). Nine leaves/branch crates are `publish = true`, seven tail crates
  remain `publish = false` until `Verified`.
- **Releases**: `v0.0.19` (`c2aabee`, 2026-09-03) ships cross-platform `bitty`
  binaries (`bitty-<target>` dist assets plus `.sha256`, `SHA256SUMS`,
  `provenance.json`, `.deb`/`.rpm`/`.apk`/`.pkg.tar.zst`) with Homebrew, Scoop,
  and AUR (`bitty` plus `bitty-bin` prebuilt) distribution per `bitty`
  CHANGELOG; the binary artifact was renamed `bitty-app` -> `bitty` with the
  crate name unchanged. Release artifacts are distribution evidence, not
  `Verified`/`Compatible` claims.
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
- **Implemented but not yet Verified**: `rich` (ImageStore/scene OQ-008/015/016,
  Kitty chunked intake `1fc6294`), `ipc` (bounded framing 256 KiB, wire v1,
  peer-credential auth, scopes OQ-018, profiling/ctl surface through `1835175`),
  `resolver` (single-version convergence, source-class provenance H-A/H-B/H-C,
  yank/prerelease `yanked (locked)` OQ-022/026-029) with compat-lab/perf
  verification crates added after `be3bdb4`; risk register remains `Open` except `R-005`/`R-006`/`R-007`
  `Mitigated` at `d4d75e9`, matrix `Mitigated` for those three. `R-004` clipboard
  (`23` `suspicious_paste` + `13` `paste` unit + `4` remediation at
  `7a4ee41`, baseline `19` at `de134ec`) is `Implemented` but explicitly `Open`
  per the 2026-08-31 audit (residual platform backends, real-window UX,
  `8192`-byte post-acquisition bound); `R-005` hyperlink (`5bdcdbd`),
  `R-006` capability (`0afc94d`), `R-007` VM budgets (`d4d75e9`) are `Mitigated`
  with residual UX/grant/budget soak gaps per independent review.
- **Governance and Website**: Website Delivery RFC (OQ-023) loader with
  eight-field schema, pinned `src/content/docs-revision.json`, multi-version
  `/docs/<version>/<path>/` and redirect manifest; Governance RFC (OQ-024) MIT
  license, branch protections, `Docs-PR`/`Code-PR` release train — both
  `Accepted` 2026-08-29.

## Candidate maturity ladder (from proposed-delivery-sequence)

| Version | Candidate scope (maturity label, not date)                | Workspace focus at that slice                                                                                                                                                                                                           | Status at `1835175`                                                                                                                                                                                                                                                                                                               |
| ------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v0.0.x  | Architecture and protocol prototypes                      | `bitty-core` seed only                                                                                                                                                                                                                  | prototypes done; seed retained but `publish = false`                                                                                                                                                                                                                                                                              |
| v0.1    | Minimal terminal slice (shell echo, resize, backpressure) | `vt` + `pty` + `term-state` + `platform` + `config` + `render` + `ui` + `runtime` + `app` gated by [Single-Window Vertical Slice Acceptance Plan](vertical-slice-acceptance.md) (CTX-0109 draft, one process/window/workspace/terminal) | `Draft` spec at CTX-0109, `Experimental Implementation` at `c0aadd2` (CTX-0095 PR #148) + `a8735d0` (CTX-0098 PTY fix) `Implemented` not `Verified`; headless deterministic replay `be3bdb4` 808 tests plus visible `winit`/`wgpu` evidence now exists but remains not `Verified`; acceptance gated on spec + experimental review |
| v0.2    | VT and TUI compatibility work                             | `vt`/`term-state` fidelity, compatibility matrix OQ-004                                                                                                                                                                                 | Scope defined per OQ-004; `compat-lab` forming (`0e65f85`), verification pending                                                                                                                                                                                                                                                  |
| v0.3    | GPU rendering, fonts, performance, graphics               | `render` `wgpu` 25.0 `crossfont` 0.9, platform surface                                                                                                                                                                                  | `Implemented` headless, `Verified` pending                                                                                                                                                                                                                                                                                        |
| v0.4    | Lua configuration system                                  | `config` `ConfigPlan` + `lua` `piccolo` 0.3.3 RC-1/RC-2                                                                                                                                                                                 | `Accepted` and `Implemented`, not yet `Verified`                                                                                                                                                                                                                                                                                  |
| v0.5    | Plugin API                                                | `plugin-host` capability/event lifecycle OQ-011/012/013                                                                                                                                                                                 | `Accepted` and `Implemented`, not yet `Verified`                                                                                                                                                                                                                                                                                  |
| v0.6    | Plugin manager and lazy loading                           | `package` lifecycle + manager overlay                                                                                                                                                                                                   | `Accepted` lifecycle/integrity, resolver `Implemented` but signatures draft, `Verified` pending                                                                                                                                                                                                                                   |
| v0.7    | DevTools and debug protocol                               | `runtime` instrumentation seam (no dedicated `bitty-debug`)                                                                                                                                                                             | `Accepted` per DevTools RFC, `Implemented` not yet `Verified`                                                                                                                                                                                                                                                                     |
| v0.8    | Rich presentation, Markdown stress                        | `rich` blocks, scene/zone, images OQ-008/015/016                                                                                                                                                                                        | `Accepted` and `Implemented` (Kitty chunked intake `1fc6294`), not yet `Verified`                                                                                                                                                                                                                                                 |
| v0.9    | IPC, `bitty ctl`, MCP adapter                             | `ipc` + `agent` bounded framing/scopes OQ-018                                                                                                                                                                                           | `Accepted` and `Implemented` (profiling/ctl surface through `1835175`), not yet `Verified`                                                                                                                                                                                                                                        |
| v1.0    | Stabilized contracts                                      | All above under semver-compatible surfaces                                                                                                                                                                                              | requires `Verified` + `Compatible` per risk evidence RFC; not yet claimed                                                                                                                                                                                                                                                         |

`bittyd` and remote UI are post-v1.0 candidates (OQ-020 deferred per ADR 0008).

## Verification gates

- `just check` 0 issues (`fmt-check` + `markdownlint` + `links` +
  `metadata` + `language` + `agents` + `hygiene` + `state` + `actionlint`), `act -n`
  DRYRUN success for the Docs quality `ci.yml` workflow.
- `cargo check --workspace --all-targets --locked` and
  `cargo check --target x86_64-pc-windows-gnu` pass at the synchronized
  `bitty` revision per that repository's CI (last recorded here at `be3bdb4`).
- `cargo test --workspace --all-targets --locked` soak passes
  (`Implemented`); `cargo clippy -- -D warnings` 0 warnings; `cargo fmt --check` clean.
- Publish order verified via `cargo publish --dry-run` (leaves
  `publish = true` PASS, dependents correctly await index).

## Cross-reference and maintenance

- Candidate spine and early-deferral: canonical in
  [Proposed Delivery Sequence](proposed-delivery-sequence.md#candidate-build-order-spine).
- Compatibility and platform bars: [ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md),
  [Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md) (M1).
- First real single-window slice: [Single-Window Vertical Slice Acceptance Plan](vertical-slice-acceptance.md)
  (CTX-0109, draft, depends on CTX-0107/0108; one process/window/workspace/terminal,
  cursor/scrollback/resize/selection/copy-paste/nvim+tmux smoke, PB-1..PB-7, Tier 1/2);
  `Implemented` headless does not equal `Verified` visible slice — review gates still apply.
- Security gates for `v1.0`: normative in
  [Security Overview](../security/overview.md) and
  [Threat Model](../security/threat-model.md); this ladder does not weaken them.
- Maintain this file alongside `proposed-delivery-sequence.md`: when a version
  slice moves from `Implemented` to `Verified`, update the status column and
  the [risk register](../security/risk-register.md) per the risk evidence RFC;
  `Verified` requires independent security-auditor and P0-AC evidence.
