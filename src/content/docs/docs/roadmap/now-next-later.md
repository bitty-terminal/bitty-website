---
title: Now / Next / Later
description: Planning horizon for Verified VT and rich hardening, candidate plugin, IPC, and post-v1.0 sequencing, plus the candidate CTX-0251 terminal feature survey gap register without date promises
category: roadmap
audience: mixed
document_type: overview
status: draft
website_publish: false
sidebar_order: 11
---

# Now / Next / Later

> Status: **draft planning horizon** as of 2026-09-08. This document is a
> roadmap communication, not shipped behavior or a release promise. It links
> accepted requirements, dependencies, owners, success evidence, and an explicit
> confidence and horizon per the [Roadmap index](README.md) admission criteria.
> It does not self-accept any requirement, does not weaken any normative
> security control, and does not authorize website publication. Website
> publication remains gated on a pinned immutable `bitty-docs` revision per the
> [Website Delivery RFC](../specifications/website-delivery-rfc.md). Current
> snapshot is `bitty` `29772a3` (previous `c49ead1`, baseline `de134ec`,
> 18 crates, release `v0.0.19`) at **Pre-alpha / Engineering Milestones M1-M8**;
> the retired `a8735d0` / 16-crate / M1 baseline no longer describes the head.

## Admission criteria mapping

Per the [Roadmap index](README.md), a roadmap item links accepted
requirements, dependencies, owner, success evidence, and an explicit confidence
or planning horizon. This document satisfies that bar without introducing a
date promise:

| Admission requirement  | Where satisfied here                                                                                          | Evidence or link                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accepted requirements  | Now cites Verified R-001 and R-002 with RS lifecycle; Next cites P0 Accepted risks; Later cites ladder slices | [Security Evidence Matrix](../security/evidence-matrix.md), [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md), [Security Risk Register](../security/risk-register.md) |
| Dependencies           | Per-section dependency lists anchored to ladder spine and threat posture                                      | [Release Ladder](../product/release-ladder.md), [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md), [Risk Evidence RFC](../specifications/risk-evidence-rfc.md)          |
| Owner                  | Per-horizon owner table below; roadmap ownership is docs curation with security review                        | [Documentation workflow](../development/documentation-workflow.md)                                                                                                                           |
| Success evidence       | Per-item RS-gated criteria with bitty commit and harness citations                                            | Evidence matrix Phase E, p0-acceptance P0-AC-001..P0-AC-034, risk-evidence RFC RS-1..RS-7                                                                                                    |
| Confidence and horizon | Explicit confidence per horizon; horizon is maturity-gated, not calendared                                    | This section and [Release Ladder](../product/release-ladder.md)                                                                                                                              |

No item below promises a date, a release tag, or website availability. Website
content remains not published from this document (`website_publish: false`);
any future publication must advance the pinned revision in `bitty-website` per
the Website Delivery RFC and must not render this planning file until its
status moves out of draft via independent review.

## Horizon model and authority

The candidate horizons and sequencing topics below are noncanonical assessment
topics: they are unaccepted, are not product commitments, are not implementation
claims, and are not entries in the OQ register.

### Strategy sequence

The current maturity label is **Pre-alpha / Engineering Milestones M1-M8**
(see the milestone table below). Headless test
soak and crate or contract presence are evidence for hardening work, not proof
of a released or independently verified terminal product. Once the applicable
design and security gates are satisfied, the roadmap should shift emphasis from
architecture-first to dogfooding-first. The candidate build sequence is:

1. Terminal Truth: PTY, VT parser, and terminal state.
2. Real renderer, font handling, keyboard input, and IME.
3. A usable terminal exercised with shells, nvim, and tmux.
4. View, Layout, and generic Panel composition, including focus and routing.
5. Plugin API dogfood using first-party plugins through the public boundary.
6. Rich presentation, IPC, Agent, optional browser integration, and the wider
   ecosystem.

This sequence is a planning priority, not a release commitment. It does not
supersede the release ladder, accepted RFCs, ADR 0008's post-v1.0 headless
daemon deferral, or any security evidence gate.

### Engineering milestones M1-M8

One label can no longer describe the workspace, so the snapshot carries an
explicit milestone frame with honest per-milestone statuses (all verified
read-only against `bitty` origin `main` at `29772a3`; subsystem detail lives
in [`project-state.json`](../project/project-state.json)):

| Milestone               | Status                    | Honest reading                                                                                 |
| ----------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| M1 Terminal Truth       | Implemented, hardening    | PTY/VT/state/render/window path exists; correctness hardening continues; not `Verified`        |
| M2 Correct Terminal     | Hardening                 | VT fixes landing, compat-lab forming with regenerated baselines; not `Verified`                |
| M3 Usable Terminal      | In progress               | Config productizing, UX wave (`window.padding`/`opacity`, cursor hue, `smart_split`); not done |
| M4 Workspace/Panel      | Early implementation      | `PanelRuntime` code plus async workers exist; Panel Runtime spec still Draft pre-study         |
| M5 Plugin Ecosystem     | Infrastructure only       | Host dogfood experimental; plugin SDK is a separate repository and unverified here             |
| M6 Rich/IPC/Agent       | Hardening, infrastructure | Kitty chunked intake, IPC profiling/ctl surface, agent scrubbing; linked risks unchanged       |
| M7 Stable Compatibility | Not started               | Compat-lab is forming toward it; no compatibility claim                                        |
| M8 Public Beta          | Not started               | No release-readiness claim; overall product not `Verified`/`Compatible`/`Release-ready`        |

No milestone status moves a risk, weakens a control, or implies `Verified`.
Risk states stay `R-004` `Open` and `R-005`/`R-006`/`R-007` `Mitigated` until
the Risk Evidence RFC checklist plus auditor review says otherwise.

### Anchor: release ladder and candidate spine

- **Horizon anchor:** [Release Ladder](../product/release-ladder.md) stage
  **Pre-alpha / Engineering Milestones M1-M8** at `bitty` `29772a3` (`18 crates`, `32 OQs`
  `Accepted`, release `v0.0.19`, compat-lab/perf hardening and UX wave through
  `29772a3` plus semantic-terminal P1-P5 `Implemented`-only plus scrollbar overlay
  `Implemented`-only plus workspace rename, panel gaps, `mod_key`, font
  `1.375`/`2.0`, `radius_px` S0, `frameHash` digest, and V1-V3 gates
  `Implemented`-only plus experimental
  `c0aadd2`/`7e3104d`/`a8735d0` chain `d4d75e9 -> c0aadd2 -> 7e3104d -> a8735d0`,
  baseline `de134ec` previous `c49ead1`) mapped to the candidate `v0.1` through
  `v1.0` maturity ladder. The ladder does not weaken any normative control in
  the [Security overview](../security/overview.md) or
  [Threat model](../security/threat-model.md). `R-004` was re-audited at
  `bitty` `7a4ee41` (baseline `de134ec`) per
  [`docs/security/audits/clipboard-2026-09.md`](https://github.com/bitty-terminal/bitty/blob/7a4ee41/docs/security/audits/clipboard-2026-09.md)
  (CTX-0097, 2026-08-31) and remains `Open` (see `Next` `R-004`); `R-005`/`R-006`/`R-007`
  remain `Mitigated` at `d4d75e9`; experimental `c0aadd2`/`7e3104d`/`a8735d0`
  are `Implemented` not `Verified`; overall maturity remains `Pre-alpha`.
- **Lifecycle:** `Draft -> Experimental Implementation -> Accepted -> Verified -> Compatible -> Release-ready`
  (spec) and `Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`
  (crate) per the [Risk Evidence RFC](../specifications/risk-evidence-rfc.md) RS-1
  through RS-7. All RFCs and ADRs that underpin the risks below are `Accepted`
  and `Implemented` (headless `Implemented` at `be3bdb4`, experimental `Implemented`
  at `a8735d0` via `c0aadd2`/`7e3104d`/`a8735d0`) but remain `Implemented` not yet
  `Verified` until the matrix (RS-1..RS-7, `unit`/`integration`/`adversarial`/`manual-audit`/`ci-gate`)
  is satisfied. Experimental implementation is reviewable evidence, not `Verified`
  closure. No risk moves from `Open` while the matrix is pending except where
  this document records `Verified`/`Mitigated` closure with cited auditor
  evidence. `R-004` is explicitly not `Verified` or `Mitigated`; the 2026-08-31
  audit keeps it `Open`; experimental slice does not change risk state.
- **Candidate spine:** [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
  candidate build-order spine `PTY -> VT -> Grid -> Font -> GPU -> Correct
Terminal -> Config -> Command/Event -> Plugin Runtime -> Plugin Manager ->
DevTools -> Rich Presentation -> IPC -> Agent` and version ladder `v0.1`
  through `v1.0` with trust-boundary notes including `bittyd` after `v1.0`.
  Status is **draft research record** retained from the second historical
  ChatGPT conversation
  [6a8dae4b-2aec-83ea-9174-03abc1f81531](https://chatgpt.com/share/6a8dae4b-2aec-83ea-9174-03abc1f81531)
  per [Shared-conversation coverage](../sources/chatgpt-share-coverage.md).
  Nothing in that record is accepted direction or a roadmap commitment until
  an RFC or ADR accepts it with independent review.
- **Authority:** CarryCtx tasks are the execution record; requirements and
  specifications remain the authority for what completion means. This roadmap
  communicates sequencing and intent only.

### What Verified means here

This document uses the RFC lifecycle verbatim. `Verified` for a risk means
every linked P0-AC criterion for that risk has passing evidence per its
verification method (`unit`/`integration`/`adversarial`/`manual-audit`/`ci-gate`)
plus an independent security-auditor review that moves the risk from `Open`
per RS-2 and the `Entry to Mitigated` checklist (RS-1..RS-8) in the Risk
Evidence RFC. `Verified` in this roadmap does not imply `Compatible` or
`Release-ready`; those remain separate gates per the release ladder.

### Bitty-docs scope note

This repository is `bitty-docs` only. Product-code claims are limited to what
`bitty` `main` already contains (`8c41f1e` for VT and `8e6c8a9` for rich, both
merged after `be3bdb4`, `7a4ee41`/`de134ec` for clipboard `R-004` which
remains `Open` per the 2026-08-31 audit, `d4d75e9`/`de134ec`/`7e3104d` for
`R-005`/`R-006`/`R-007` at `5bdcdbd`/`0afc94d`/`d4d75e9` which are `Mitigated`,
and `c0aadd2`/`7e3104d`/`a8735d0` chain for experimental slice/dogfood/PTY fix
which are `Implemented` (experimental) not `Verified`, plus the post-0189
`bitty` origin `main` `7dbe4e2` chain (`b795f90` PR #328 verify harness,
`8af138e` PR #330 Windows instance discovery, `144ee1c` PR #332 frame
capture plus input synthesis, `7dbe4e2` PR #334 live profiling) which is
`Implemented` not `Verified`, plus the FIND-0002 remediation wave through
`bitty` origin `main` `1fc6294` (`ec95c5c` PR #336 through `0cb244d` PR #364
plus `0e65f85` PR #366, all `Implemented` not `Verified`; see the
[FIND-0002 ledger](../findings/FIND-0002-comprehensive-code-review-ledger.md)),
plus Amendment A1 (`bitty-docs` PR #145, `CTX-0124` design, implemented in
`bitty` `b795f90`/`144ee1c`/`7dbe4e2`, Implemented-only, acceptance open,
not Accepted or Verified).
This document does not
claim any additional `bitty` implementation beyond those commits and does not
describe future `bitty` code as already implemented, `Verified`, `Compatible`,
or `Release-ready`; `R-004` remains `Open`, `R-005`/`R-006`/`R-007` are
`Mitigated` (not `Verified`), experimental `c0aadd2`/`7e3104d`/`a8735d0` are not
`Accepted`/`Verified`, post-0189 `7dbe4e2` chain is not `Verified`, the
FIND-0002 wave through `1fc6294` is not `Verified`, and
Amendment A1 authorizes no additional implementation beyond the merged
`b795f90`/`144ee1c`/`7dbe4e2` commits and moves no acceptance. Post-`1fc6294`
`bitty` origin `main` advanced to `1835175` (previous `e8a7b76`): OTP-gated
clipboard reads `63b01db`, Kitty chunked intake `1fc6294`, agent credential
scrubbing `a2d127b`, overlay z-index tiers `42d244e`, async panel workers
`d04886a`, cursor hue `e8a7b76`, `window.padding`/`opacity` wiring `1835175`
— all `Implemented` not `Verified`, none moving any risk or acceptance.
Post-`1835175` `bitty` origin `main` advanced to `7048139` (previous
`1835175`): semantic-terminal P1-P2 `4ccb771`, P3 `064486b`, P4-P5
`ab1f7ab`, sRGB-decode upload colors `b4b4e30`, splitView D1 axis fix
`77bd6c5`, split/zoom full present `5a535ee`, paste chord fix `88c0ead`,
runtime module split `61b655f`, chrome-key extract `3384903`, DA per-pane
pump `7048139`, ctl denial surfacing `99f5b1d` — all `Implemented` not
`Verified`, none moving any risk or acceptance. Post-`7048139` `bitty`
origin `main` advanced to `c49ead1` (previous `7048139`): scrollbar overlay
`c49ead1` (CTX-0181, `bitty` #405, closes #281; hidden/always/auto, width
`1`-`32` default `8`, fail-closed) — `Implemented` not `Verified`, moving
no risk or acceptance. Post-`c49ead1` `bitty` origin `main` advanced to
`29772a3` (previous `c49ead1`): configurable leader/`mod_key` `2a5e451`
(CTX-0236, `bitty` #411; top-level scalar, default `alt`, `super` allowed,
`ctrl`/`shift` rejected fail-closed), measured font defaults `308687d`
(CTX-0237, `bitty` #413; `line_height 1.375`, `letter_spacing 2.0`, live
cell `10x22`), workspace rename alias plus panel gaps `abde197` (CTX-0240,
`bitty` #415; canonical `bitty-terminal.workspace`, `tabs` shim deprecated
with removal at or after `v0.2.0`, `layout.gaps_in`/`gaps_out` `0..=16`
cells with stack inset-only), scrolled-viewport snap on input `884fd30`
(CTX-0243, `bitty` #419), `window.radius_px` S0 parsed no-op `84aa580`
(CTX-0241, `bitty` #417; `0..=24` default `0`, zero render effect),
`frameHash` digest method `3f5ed24` (CTX-0244, `bitty` #421), and V1-V3
panel-live visual gates `29772a3` (CTX-0242, `bitty` #423) — all
`Implemented` not `Verified`, none moving any risk or acceptance; see the
[Panel Extensibility Vision](../product/panel-vision.md) rename note and
the [DevTools RFC](../specifications/devtools-rfc.md) Amendment A2.

The [CTX-0251 gap register](#gap-register-modern-terminal-feature-survey-candidate)
cites further post-`29772a3` `bitty` origin `main` commits as survey-gap status
only (`0cc82de`, `bd15d94`, `227ca3a`, `3d45924`, `bc1fbba`, `6d4aa2f`,
`18c333a`, `8b987a0`, `5afb8a2`, `fdd9e28`); each is `Implemented` not
`Verified`, and none moves a risk, acceptance, milestone, crate count, release
label, or the overall `Pre-alpha` maturity stated above.

## Now — Verified and Mitigated hardening with attributable evidence

Confidence: **high** for the five items below because each has a merged `bitty`
commit with independent security-auditor and docs-curator review, full matrix
evidence, and retained corpora (R-001/R-002 `Verified`, R-005/R-006/R-007 `Mitigated`).
Experimental slice `c0aadd2`/`7e3104d`/`a8735d0` is separate `Experimental Implementation`
not counted here. Horizon: **current maturity slice** already on `bitty` `main`
(`29772a3` head, `de134ec` baseline `c49ead1` previous);
docs planning reflects it, it does not promise beyond it, overall product not
`Verified`/`Compatible`/`Release-ready`; experimental code is review evidence only.

### Now-1: R-001 Bounded VT parser — Verified

- **Requirement:** Bounded incremental VT parser with CSI `u16` saturation,
  parameter-count caps, `BoundedString` and `BoundedBytes`, OSC/DCS/APC
  truncation at bound, deterministic incremental chunking, and resynchronization
  on malformed UTF-8 and truncated sequences. Threat T-01, severity Critical.
- **P0 criteria:** [P0-AC-001](../security/p0-acceptance-criteria.md#parser-and-resource-limits)
  Bounded VT parser and [P0-AC-002](../security/p0-acceptance-criteria.md#parser-and-resource-limits)
  Malformed input recovery.
- **Risk and evidence:** [R-001](../security/risk-register.md) via
  [Evidence Matrix R-001](../security/evidence-matrix.md) Phase E row
  `Implemented at be3bdb4, Verified at 8c41f1e` with implementation
  `bitty-vt` `parser.rs` plus `bounded.rs`, test and adversarial evidence
  below, CI `cargo check` and `cargo clippy -D warnings` and `just check`
  green, and `manual-audit` security-auditor review `docs/security/audits/vt-parser-2026-xx.md`.
- **Verified evidence (`bitty` CTX-0088):** squash `8c41f1e` PR `#130`
  `feat(vt): verify bounded parser and fuzz closure for R-001 (R-001 Verified)`
  (`84 files +11027 -641`, `57 lib` tests plus `1 harness` `fuzz/corpora/vt`
  corpus determinism test plus `5 replay` corpora, fuzz `fuzz/corpora/vt`
  `30 bins` plus `SHA256SUMS`). The commit citation is the observable artifact
  that satisfies RS-2 entry to Mitigated (now Verified) for R-001; the evidence
  matrix records the per-criterion mapping and the CarryCtx decision that
  accepted the move.
- **Dependencies:** [Terminal State RFC](../specifications/terminal-state-rfc.md)
  and [Performance Budget RFC](../specifications/performance-budget-rfc.md)
  accepted limits; no weakening of parser invariants.
- **Owner:** `security-auditor` for the Mitigated review that moves R-001,
  `architecture` category-owner for parser correctness, `docs-curator` for
  taxonomy and links.
- **Success evidence:** `R-001` is `Verified` only because every P0-AC-001 and
  P0-AC-002 pass threshold is observed: boundary matrix at and beyond CSI/OSC
  limits with zero panics or hangs, `pseudo_random_byte_soup_is_panic_free_and_deterministic`
  fuzz with long-running corpus retained under `fuzz/corpora/vt`, and `vte`
  `0.15` behind owned `TerminalAction` with no I/O. No normative control is
  weakened.

### Now-2: R-002 Rich and graphics decompression budgets — Verified

- **Requirement:** Pre-allocation rejection of decompression bombs and
  aggregate image-store budgeting per [Rich Presentation RFC](../specifications/rich-presentation-rfc.md)
  IMG-1..IMG-9 (`4 MiB` compressed, `4096x4096` decoded, `64 MiB` per image
  `width*height*4`, `256 MiB` total store, `256` images, `64` frames, `128`
  placements). Threat T-02, severity Critical.
- **P0 criteria:** [P0-AC-003](../security/p0-acceptance-criteria.md#parser-and-resource-limits)
  Graphics decompression limits and [P0-AC-004](../security/p0-acceptance-criteria.md#parser-and-resource-limits)
  Aggregate image-store budget.
- **Risk and evidence:** [R-002](../security/risk-register.md) via
  [Evidence Matrix R-002](../security/evidence-matrix.md) Phase E row
  `Implemented at be3bdb4, Verified at 8e6c8a9` with implementation
  `bitty-rich` `image.rs` IMG-1..IMG-9, `ImageStore::insert` validates
  IMG-1..IMG-7 before allocation and FIFO evicts oldest on `total_bytes` and
  `count` overflow.
- **Verified evidence (`bitty` CTX-0089):** squash `8e6c8a9` PR `#132`
  `feat(rich): verify bounded ImageStore for R-002 (IMG-1..IMG-9)`
  (`93 headless` tests in `bitty-rich` admission and eviction: `compressed_too_large`,
  `dimensions_too_large`, `decoded_too_large`, `animation_too_large`,
  placement admission IMG-8, plus sustained-load budget invariant; fuzz
  `fuzz/corpora/rich` `20 bins` plus `SHA256SUMS`). The matrix cites the
  decompression-bomb pre-allocation proof that peak memory stays under `64 MiB`
  per image and `256 MiB` aggregate.
- **Dependencies:** Rich Presentation RFC image contract and Isolation Resource
  RFC budget ceilings; Config and Plugin Platform RFCs remain `Accepted`.
- **Owner:** `security-auditor` for the Mitigated review that moves R-002,
  `architecture` and `extensibility` category-owners, `docs-curator` for
  frontmatter and links.
- **Success evidence:** `R-002` is `Verified` because pre-allocation rejection
  and aggregate eviction hold with zero partial state and zero panics, and the
  pending auditor report `rich-presentation` review confirms IMG-1..IMG-9 vs
  P0-AC-003 and P0-AC-004. No weakening of P0 graphics controls.

### Now-3: R-005 Hyperlink allowlist and activation gate — Mitigated

- **Requirement:** Hyperlink `http`/`https`/`mailto`/`file` allowlist with single-layer percent-decode, `URL_MAX_LEN 4096`, shell metacharacter deny, `ValidatedUrl` only opener input, `is_safe_hyperlink_uri` + `checked_mul` overflow guard, `ActivationGesture` single-use mint only on safe URI plus `intercept_open_url` veto-wins and re-validate at spawn (native `gio open`/`explorer`/`open`, no shell). Threat T-05, severity High.
- **P0 criteria:** [P0-AC-009](../security/p0-acceptance-criteria.md#local-resources-clipboard-links) Hyperlink scheme policy and direct launch.
- **Risk and evidence:** [R-005](../security/risk-register.md) via [Evidence Matrix R-005](../security/evidence-matrix.md) Phase E row `Mitigated at 5bdcdbd` (PR #144, Issue #137) with implementation `bitty-platform` `url.rs` + `bitty-rich` `hyperlink.rs` + `bitty-runtime` activation gate, test and adversarial evidence below, CI `cargo clippy -D warnings` and `just check` green, independent review APPROVE.
- **Mitigated evidence (`bitty` CTX-0092):** squash `5bdcdbd` PR #144 `feat(rich): verify hyperlink allowlist and activation gate for R-005` (`8 files +816 -11`, `crates/bitty-platform/src/url.rs` 317 new, `crates/bitty-rich/src/hyperlink.rs` `is_safe_hyperlink_uri` + `hyperlink_at` overflow guard, `crates/bitty-runtime/src/runtime.rs` `ActivationGesture`+`intercept_open_url` gate, adversarial `javascript`/`%3B`/`$HOME` corpus denied, `https`/`mailto`/`file:///` accepted). RS-1..RS-7 evidenced per PR independent review.
- **Dependencies:** [Rich Presentation RFC](../specifications/rich-presentation-rfc.md) hyperlink transport, [Platform Support Tiers](../decisions/adrs/ADR-0002-platform-support-tiers.md) native handler policy, ladder `v0.8` rich slice.
- **Owner:** `security-auditor` for the Mitigated review that moves R-005, `extensibility` category-owner, `docs-curator` for links.
- **Success evidence:** `R-005` is `Mitigated` because allowlist denies dangerous schemes/encodings/shell chars with one-layer decode and `file:///` authority-free check, activation requires single-use gesture + veto-wins intercept + re-validate at spawn with no shell interpolation, and `hyperlink_at` overflow guard proves no panic; residual real-window UX and `FileUrlActivation` distinct gate remain pending but do not block `Mitigated`.

### Now-4: R-006 Capability deny-by-default and restricted stdlib — Mitigated

- **Requirement:** Closed capability set with deny-by-default, hash + declared intersection, controls/unicode whitespace deny, and `piccolo 0.3.3` restricted stdlib (`base`/`math`/`string`/`table`/`utf8`/`os.clock`/`debug.traceback`) denying `io`/`os.execute`/`package.loadlib`/bytecode per ADR-0005. Threat T-06, severity Critical.
- **P0 criteria:** [P0-AC-011](../security/p0-acceptance-criteria.md#plugins) Restricted stdlib, [P0-AC-012](../security/p0-acceptance-criteria.md#plugins) Capability-checked host API, [P0-AC-013](../security/p0-acceptance-criteria.md#plugins) Per-plugin VM isolation and failure containment.
- **Risk and evidence:** [R-006](../security/risk-register.md) via [Evidence Matrix R-006](../security/evidence-matrix.md) Phase E row `Mitigated at 0afc94d` (PR #145, Issue #138) with implementation `bitty-plugin-host` `capability.rs`/`grant.rs`/`manifest.rs` + `bitty-lua` `piccolo` restricted stdlib, CI and independent review APPROVE.
- **Mitigated evidence (`bitty` CTX-0092):** squash `0afc94d` PR #145 `feat(plugin): verify capability deny-by-default and restricted stdlib for R-006` (`6 files +197 -17`, `capability.rs` `denied_without_grant` + `closed_identifiers` + `protocol.register`, `grant.rs` declared+granted+hash intersection, `manifest.rs` fs pattern control deny, `lib.rs` `restricted_stdlib_denies_ambient_io` test `io==nil`). RS-1..RS-7 evidenced.
- **Dependencies:** [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (OQ-011/012/013), [Lua Runtime RFC](../specifications/lua-runtime-rfc.md) (OQ-009), ladder `v0.4` Lua and `v0.5` Plugin API.
- **Owner:** `security-auditor` for the Mitigated review, `extensibility` and `architecture` owners, `docs-curator` for frontmatter.
- **Success evidence:** `R-006` is `Mitigated` because every family is closed and denied without grant, every capability-denial family suite passes plus ambient-authority fuzz (`io`, `os`, `debug`, native load) all denied, hash + declared intersection denies `clipboard.read` absent in manifest; `121 tests ok` (`cargo test -p bitty-plugin-host -p bitty-lua -p bitty-runtime --lib`) proves deny-by-default; residual grant UX hardening pending.

### Now-5: R-007 Per-plugin VM isolation and attributable budgets — Mitigated

- **Requirement:** Per-plugin `piccolo` VM isolated `PluginId`+generation `forbid(unsafe_code)`, Fuel + `50 ms` wall/`8 ms` warning + `32 MiB` hard via `total_memory()`, queue budgets PerSub `64` strict / PerPlugin `1024` events/`256 KiB` / Global `8192`/`2 MiB` `DropOldest` hard-gated, attribution `PluginId`+generation, and transactional `reload` with `Generation overflow` and command-owner guard. Threat T-07, severity Critical.
- **P0 criteria:** [P0-AC-013](../security/p0-acceptance-criteria.md#plugins), [P0-AC-014](../security/p0-acceptance-criteria.md#plugins) Budgets attributable, [P0-AC-015](../security/p0-acceptance-criteria.md#plugins) Plugins out of hot paths.
- **Risk and evidence:** [R-007](../security/risk-register.md) via [Evidence Matrix R-007](../security/evidence-matrix.md) Phase E row `Mitigated at d4d75e9` (PR #146, Issue #139) with implementation `bitty-lua` Fuel + `bitty-plugin-host` queue budgets + attribution, measurement suites, fault-injection proof, independent review CONDITIONAL APPROVE.
- **Mitigated evidence (`bitty` CTX-0092):** squash `d4d75e9` PR #146 `feat(plugin): verify per-plugin VM isolation and attributable budgets for R-007` (`2 files +344 -13`, `host.rs` queue isolation + `registry.rs` transactional reload `checked_add` overflow guard), headless measurement `21` + `15` tests at `d67a65b`, `reload_*` + `measurement` suites.
- **Dependencies:** [Isolation Resource RFC](../specifications/isolation-resource-rfc.md) RC-1..RC-5 and FS-1..FS-9 (OQ-014 Accepted 2026-08-28), ladder `v0.5`/`v0.7`.
- **Owner:** `security-auditor` for the Mitigated review that moves R-007, `architecture` and `extensibility` owners, `docs-curator` for docs sync.
- **Success evidence:** `R-007` is `Mitigated` because Fuel/wall/memory and queue budgets are hard-gated at `Host::publish`/`EventPipeline::publish` with `DropOldest` and attribution `PluginId`+generation, fault-injection proves crash/loop/storm/alloc each isolated to owning VM with host responsive, reclaim PB-3 `15%` after GC ten-cycle `total_memory()` observably fires, and transactional reload preserves old generation on hash/safe-mode/overflow deny; overall product remains not `Verified` until other P0 rows move.

### Now guardrails

- All five Now items preserve all five release-blocking invariants cited in the
  [Release Ladder](../product/release-ladder.md) and do not downgrade any
  normative control in the security corpus. The headless `Implemented` soak at
  `be3bdb4` (`~808` tests, `cargo test --workspace --all-targets --locked`
  `904` tests including non-headless at `904` in the matrix trunk) plus
  experimental `c0aadd2`/`7e3104d`/`a8735d0` are cited as the baseline that the
  two Verified plus three Mitigated commits extend; experimental code is
  review evidence, not `Verified`; only the matrix row plus auditor review
  moves a risk.
- This roadmap records those bitty commits as evidence; it does not claim any
  bitty code beyond `8c41f1e`, `8e6c8a9`, `5bdcdbd`, `0afc94d`, `d4d75e9` plus
  experimental `c0aadd2`/`7e3104d`/`a8735d0` is implemented (experimental not
  `Verified`), and overall product remains not `Verified`/`Compatible`/`Release-ready`.

## Next — Candidate plugin and IPC hardening

Confidence: **medium to low** — Accepted and Implemented mechanisms exist at
`be3bdb4` but `R-005`/`R-006`/`R-007` have moved `Open -> Mitigated` at `d4d75e9` per RS-1..RS-7 (see Now-3/4/5); remaining rows remain [Open](../security/risk-register.md)
until that checklist plus independent review is recorded. Horizon: **next
maturity slices** on the ladder (`v0.4` Lua through `v0.7` DevTools, plus
`v0.5`/`v0.6` plugin/manager and `v0.9` IPC/Agent groundwork); ordering follows
the Proposed Delivery Sequence candidate spine but remains draft and must not
be cited as a date promise. Overall product remains not `Verified`/`Compatible`/`Release-ready`.

Each Next item links its risk-register row, its P0-AC set, and the
measurement and hardening that would be required to move that risk toward
Verified. None weakens the control it cites.

| ID    | Risk and normative control (no weakening)                                                                                | Linked P0-AC                                                                                                                                                                                                                                                                     | Current ladder and matrix state at `be3bdb4` plus Verified baseline                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Dependencies                                                                                                                                                                                                                                                                                                                | What would move it toward Verified                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-003 | [R-003](../security/risk-register.md) Graphics or structured protocols read or delete arbitrary local files              | [P0-AC-005](../security/p0-acceptance-criteria.md#local-resources-clipboard-links) Deny-by-default loader, [P0-AC-006](../security/p0-acceptance-criteria.md#local-resources-clipboard-links) No protocol-directed deletion                                                      | [Evidence Matrix R-003](../security/evidence-matrix.md): `bitty-rich` `image.rs` deny-by-default loader plus `bitty-pty` and `bitty-platform` regular-file and approved-path checks; `Open` pending auditor `resource-loader-2026-xx`                                                                                                                                                                                                                                                                                  | Rich Presentation RFC image contract, Isolation Resource RFC deny loader, ladder `v0.8` rich slice                                                                                                                                                                                                                          | Negative class matrix denying devices, sockets, `/proc`, `/sys`, `/dev`, symlink escapes, non-regular files; exhaustive grep proving zero protocol-reachable delete primitives                                                                                                                                                                                                                                                                                                                                                                                                                              |
| R-004 | [R-004](../security/risk-register.md) OSC 52 or paste handling leaks clipboard                                           | [P0-AC-007](../security/p0-acceptance-criteria.md#local-resources-clipboard-links) Separate read/write policy, [P0-AC-008](../security/p0-acceptance-criteria.md#local-resources-clipboard-links) Suspicious paste inspection                                                    | [Evidence Matrix R-004](../security/evidence-matrix.md): `bitty` `7a4ee41` (baseline `de134ec`) `23` `suspicious_paste` (`19` baseline + `4` remediation) + `13` `paste` unit + `CLIPBOARD_MAX_BYTES=8192` char-boundary + `osc_clipboard_read/write` deny-by-default; audit [`clipboard-2026-09.md`](https://github.com/bitty-terminal/bitty/blob/7a4ee41/docs/security/audits/clipboard-2026-09.md) (CTX-0097) keeps **Open** due to residual platform backends, real-window UX, `8192` post-acquisition bound-scope | Terminal State RFC OSC 52 handling, platform clipboard isolation, ladder `v0.2` VT/TUI slice                                                                                                                                                                                                                                | `osc_clipboard_*` + `headless_clipboard_roundtrip_is_deterministic` + `23` `suspicious_paste` / `13` `paste` unit / `4` remediation (`public_paste_text_api_is_also_gated`, `string_paste_apis_bound_oversized_*`, `sequential_suspicious_requests_preserve_first_pending_paste`) + `selection_clipboard` OSC gate; adversarial C0/NUL/ESC/CR/LF/C1/BiDi each triggers inspection with no silent delivery; bracketed `?2004` defense-in-depth only after confirm; residual Open: `arboard` backends not validated, windowed UX not proven, `8192` bound is retained/inspection bound not strict peak-memory |
| R-005 | [R-005](../security/risk-register.md) OSC 8 or rich links invoke dangerous schemes                                       | [P0-AC-009](../security/p0-acceptance-criteria.md#local-resources-clipboard-links) Hyperlink scheme policy and direct launch                                                                                                                                                     | [Evidence Matrix R-005](../security/evidence-matrix.md): `bitty` `d4d75e9` (`5bdcdbd` PR #144, Issue #137) `bitty-platform` `url.rs` `ValidatedUrl` + `bitty-rich` `hyperlink.rs` `is_safe_hyperlink_uri` + `bitty-runtime` `ActivationGesture` single-use; `Mitigated` at `d4d75e9` per RS-1..RS-7 (adversarial `javascript`/`%3B` corpus denied, `https`/`file:///` allowlist, no shell interpolation)                                                                                                               | Rich Presentation RFC hyperlink transport, platform URL policy, ladder `v0.8`                                                                                                                                                                                                                                               | `Mitigated` at `d4d75e9` — see Now-3: adversarial URI corpus each denied `InvalidUrl`, `ValidatedUrl` only opener input, `ActivationGesture` + veto-wins intercept + re-validate at spawn, `hyperlink_at` `checked_mul` overflow guard; residual real-window UX pending                                                                                                                                                                                                                                                                                                                                     |
| R-006 | [R-006](../security/risk-register.md) Plugin gains ambient filesystem, process, network, clipboard, or runtime authority | [P0-AC-011](../security/p0-acceptance-criteria.md#plugins) Restricted stdlib, [P0-AC-012](../security/p0-acceptance-criteria.md#plugins) Capability-checked host API, [P0-AC-013](../security/p0-acceptance-criteria.md#plugins) Per-plugin VM isolation and failure containment | [Evidence Matrix R-006](../security/evidence-matrix.md): `bitty` `d4d75e9` (`0afc94d` PR #145, Issue #138) `bitty-plugin-host` closed set + `grant.rs` declared+granted+hash + `bitty-lua` restricted stdlib; `Mitigated` at `d4d75e9` per RS-1..RS-7 (`121 tests ok`, ambient `io`/`os`/`package` denied)                                                                                                                                                                                                             | Plugin Platform RFC ([OQ-011](../decisions/open-questions.md), [OQ-012](../decisions/open-questions.md), [OQ-013](../decisions/open-questions.md)), Lua Runtime RFC ([OQ-009](../decisions/open-questions.md)), Configuration Model RFC ([OQ-010](../decisions/open-questions.md)), ladder `v0.4` Lua and `v0.5` Plugin API | `Mitigated` at `d4d75e9` — see Now-4: every family closed + denied without grant, `121 tests ok`, ambient-authority fuzz denied, wildcard/unknown/controls rejected; residual grant UX hardening pending                                                                                                                                                                                                                                                                                                                                                                                                    |
| R-007 | [R-007](../security/risk-register.md) Plugin crash, loop, callback storm, or allocation blocks the terminal              | [P0-AC-013](../security/p0-acceptance-criteria.md#plugins), [P0-AC-014](../security/p0-acceptance-criteria.md#plugins) Budgets attributable, [P0-AC-015](../security/p0-acceptance-criteria.md#plugins) Plugins out of hot paths                                                 | [Evidence Matrix R-007](../security/evidence-matrix.md): `bitty` `d4d75e9` (`d4d75e9` PR #146, Issue #139) Fuel + wall deadline + `32 MiB` hard + queue budgets PerSub `64`/PerPlugin `1024`/`256 KiB`/Global `8192`/`2 MiB` `DropOldest` + attribution `PluginId`+generation + transactional `reload`; `Mitigated` at `d4d75e9` per RS-1..RS-7                                                                                                                                                                        | [Isolation Resource RFC](../specifications/isolation-resource-rfc.md) RC-1 through RC-5 and FS-1 through FS-9 ([OQ-014](../decisions/open-questions.md) Accepted 2026-08-28), ladder `v0.5`/`v0.7`                                                                                                                          | `Mitigated` at `d4d75e9` — see Now-5: fault-injection crash/loop/storm/alloc each isolated, host responsive, reclaim PB-3 `15%` after GC ten-cycle, `reload` transactional overflow guard                                                                                                                                                                                                                                                                                                                                                                                                                   |

**Common Next gates before any Next risk moves:** full `adversarial` corpus
with zero panics or hangs and corpus retained in `fuzz/corpora/` or as
accounted for in the bitty commits, `unit` plus `integration` green for the
linked P0-AC set, `ci-gate` `just check` `94` to `95` files `0 issues` plus
`cargo clippy -D warnings` plus CodeQL `rust` plus `actions` plus `actionlint`
`1.7.12` plus `act -n` DRYRUN for the Docs quality `ci.yml`, `manual-audit`
reviewer-signed report under `docs/security/audits/` with CarryCtx decision,
and safe-mode re-verification that intersects [R-007](../security/risk-register.md)
and related recovery rows. No Next row moves on mechanism presence alone.

**Dependency and sequencing note:** the Proposed Delivery Sequence spine order
(PTY, VT, Grid, Font, GPU, Config, Command/Event, Plugin Runtime, Plugin
Manager, DevTools, Rich, IPC, Agent) places rich presentation before IPC and
Agent as a candidate ordering. The two Now items were explicitly Verified out
of spine order because bounded parsing and image-store budgeting are P0
invariants with isolated evidence; Next respects spine order for the remaining
hardening but still treats that order as a draft candidate, not as accepted
direction.

## Later — Candidate maturity and post-v1.0 horizons

Confidence: **low** — these are maturity labels from the ladder, not
commitments. Horizon: **later maturity slices** `v0.8` through `v1.0` plus
explicit post-v1.0 deferral. No dates, no publish promise, no
self-acceptance. Each slice requires its own RFC or ADR acceptance with
independent review before it can be admitted as more than a candidate.

### Later-1: v0.8 Rich presentation, Markdown stress, and shell integration

- **Ladder slice:** [Release Ladder v0.8](../product/release-ladder.md#candidate-maturity-ladder-from-proposed-delivery-sequence)
  Rich presentation, Markdown stress. Workspace focus `rich` blocks,
  `scene` and `zone`, images per [OQ-008](../decisions/open-questions.md),
  [OQ-015](../decisions/open-questions.md), [OQ-016](../decisions/open-questions.md).
  M1 Hardening status `Accepted and Implemented at be3bdb4, R-002 now
Verified at 8e6c8a9` (the slice itself remains `Implemented` not yet
  `Compatible` per RS-7; the Rich Presentation RFC closed those three OQs at
  the design level on 2026-08-28 but does not authorize shipped behavior).
- **Candidate scope:** Markdown-to-constrained-AST and `Scene` pipeline
  without `WebView` scripts, `hyperlink.rs` plus `image.rs` shared deny-by-default
  loader reuse, `RichCanvas` bounded `SceneItem` count plus `Selection` zone
  clipping. Security row [R-021](../security/risk-register.md) via
  [P0-AC-010](../security/p0-acceptance-criteria.md#plugins) remains `Open`
  pending `rich-constrained-ast-2026-xx` auditor review.
- **Dependencies:** Now-2 budgets, [Rich Presentation RFC](../specifications/rich-presentation-rfc.md),
  [Architecture overview](../architecture/overview.md) Terminal/View/Layout
  separation, and the Proposed Delivery Sequence spine ordering rich before IPC.
- **What would promote the slice:** a dedicated `v0.8` hardening task that
  satisfies the Rich Presentation RFC verification plan (image, placement,
  RichBlock versioning, semantic zones, selection and export and
  accessibility, structured transport, Markdown streaming property tests)
  plus the Risk Evidence RFC entry checklist for R-021.

### Later-2: v0.9 IPC, `bitty ctl`, MCP adapter, and stabilization

- **Ladder slice:** [Release Ladder v0.9](../product/release-ladder.md#candidate-maturity-ladder-from-proposed-delivery-sequence)
  IPC, `bitty ctl`, MCP adapter. Workspace focus `ipc` plus `agent` bounded
  framing and scopes per [OQ-018](../decisions/open-questions.md). M1 Hardening
  status `Accepted and Implemented at be3bdb4` (`256 KiB` framing, peer
  credentials), not yet `Verified`.
- **Candidate scope:** `transport.rs` Unix `$XDG_RUNTIME_DIR/bitty` `0600`
  or Windows named pipe current-user ACL, `auth.rs` `SO_PEERCRED` or
  `LOCAL_PEERCRED` same-user-only validation, `frame.rs` `256 KiB` bound
  before allocation, `scope.rs` `Scope` closed set with per-action
  `authorize_method`, read-only default `McpDefault`, and per-client consent
  for `terminal.input`, `process.spawn`, `plugin.manage`, and `config.modify`.
  Each maps to [R-011](../security/risk-register.md) through
  [R-014](../security/risk-register.md) via
  [P0-AC-021](../security/p0-acceptance-criteria.md#ipc-mcp-agents) through
  [P0-AC-026](../security/p0-acceptance-criteria.md#sensitive-data-handling) and remains
  `Open` at `be3bdb4` per the [Evidence Matrix R-011 through R-014](../security/evidence-matrix.md).
  Post-0189 `Implemented`-only additions at `bitty` `7dbe4e2` (`b795f90` PR
  #328 verify harness, `8af138e` PR #330 Windows named-pipe discovery,
  `144ee1c` PR #332 `synthesizeInput`/`captureFrame`, `7dbe4e2` PR #334
  profiling getters and streams; Amendment A1 `bitty-docs` PR #145 design
  plus `bitty` CTX-0183/CTX-0188/CTX-0189 implementation, Implemented-only,
  acceptance open) plus the FIND-0002 remediation wave through `bitty`
  `1fc6294` (`ec95c5c` PR #336 through `0cb244d` PR #364 plus `0e65f85` PR
  #366 baseline regen plus `fd8a71a` PR #354 singular `recording/`
  comparator fix plus `2f69725` PR #372 CI test-heavy timeouts 15m to 30m,
  all `Implemented` not `Verified`; see the
  [FIND-0002 ledger](../findings/FIND-0002-comprehensive-code-review-ledger.md))
  do not move `R-014`; `R-014` stays `Open` and
  `R-022` stays `Open` (new `Implemented`-only prune/TOFU evidence, no
  auditor review).
- **Dependencies:** Isolation budgets (R-007 Mitigated at `d4d75e9`), DevTools RFC scoping
  ([OQ-019](../decisions/open-questions.md) `Accepted` 2026-08-28), and the
  IPC and Agent RFC contract; candidate spine places IPC and Agent after
  DevTools and rich.
- **What would promote the slice:** a `v0.9` hardening wave that closes
  [R-011](../security/risk-register.md) (`ipc-peer-cred-scope-2026-xx`),
  [R-012](../security/risk-register.md) (`child-scope-leak-2026-xx`),
  [R-013](../security/risk-register.md) (`mcp-confused-deputy-2026-xx`), and
  [R-014](../security/risk-register.md) (`devtools-redaction-2026-xx` and
  `trace-minimization-2026-xx`) with scope-matrix and credential-leak
  adversarial suites and the `0600` mode plus `preview == export`
  byte-accuracy proof.

### Later-3: v1.0 Stabilized contracts

- **Ladder slice:** [Release Ladder v1.0](../product/release-ladder.md#candidate-maturity-ladder-from-proposed-delivery-sequence)
  Stabilized contracts: all surfaces above under semver-compatible surfaces.
  Requires `Verified` plus `Compatible` per the Risk Evidence RFC; not yet
  claimed at `be3bdb4` or at `8e6c8a9`. The candidate `v1.0` criteria from the
  [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
  table (platforms Tier `1` Linux, Windows, and macOS plus Tier `2` BSD per
  [ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md), five-shell
  coverage per [OQ-004](../decisions/open-questions.md) and the
  [Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md),
  and stable versioned surfaces) remain proposals within that draft record.
- **Dependencies:** all Next hardening plus Later-1 and Later-2; the
  [Security overview](../security/overview.md) release gates and the
  [Threat model](../security/threat-model.md) verification gates. No weakening
  between now and this horizon.
- **What would promote the slice:** the release ladder verification gates at
  M1 Hardening (`just check` `93` through `94` files `0 issues`, `act -n`
  DRYRUN for the Docs quality `ci.yml`, `cargo check --workspace --all-targets --locked`
  and `cargo check --target x86_64-pc-windows-gnu` at each Verified bitty
  commit) plus per-risk Verified closure for every `P0` row before any claim
  of stabilization.

### Later-4: Post-v1.0 deferred horizon

- **Deferred items:** `bittyd` and remote UI are **post-v1.0** candidates per
  [ADR 0008](../decisions/adrs/ADR-0008-headless.md), which closes
  [OQ-020](../decisions/open-questions.md) by deferring the daemon to post-v1.0
  and gating any future daemon or remote work on a mandatory trust-boundary
  analysis against the [Threat model](../security/threat-model.md) and
  [Security overview](../security/overview.md) invariants 5 and 6 (local-user-only
  IPC, read-only MCP default, terminal content as untrusted observation data).
  The [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
  candidate spine records the same positioning; the current Phase 3.5 through
  Phase 10 route items remain recorded per [Shared-conversation coverage](../sources/chatgpt-share-coverage.md) as provenance, not as admitted roadmap.
- **What deferral means here:** `Later` records this deferred horizon so that
  sequencing is honest about what is not in scope for `v0.8` through `v1.0`.
  Proposing any of these items before `v1.0` requires a new scoped ADR or RFC,
  not an edit to this roadmap horizon, and must address the ADR 0008 trust-
  boundary gate and its dependencies on [OQ-018](../decisions/open-questions.md)
  IPC and [OQ-014](../decisions/open-questions.md) isolation acceptance.
- **Candidates carried without date:** project-level candidates that the
  proposed-delivery-sequence source and domain RFCs retain as deferred include
  daemon-scoped `bittyd` ownership and lifecycle, remote frontend, plugin
  registry and marketplace surface, SSH manager, theme marketplace, AI-first
  product surface, and fancy window chrome. Listing them here does not admit
  them as scope.

### Later-5: Post-v1.0 Panel ecosystem and distributions

- **Candidate direction:** the future Panel Extensibility Vision document
  (CTX-0094, pending review) proposes Panel as a workspace-managed application
  container generalizing `View` content. Panel is not the native OS `Window` and
  is not a PTY. The
  [Workspace Compositor](../specifications/workspace-compositor.md) remains
  `Draft`; its H/V `LayoutTree`, Core decoration, validation, and security
  boundaries are not accepted or changed by this roadmap.
- **Candidate scope:** after v1.0, a future Panel RFC may define Panel
  providers, a Panel Runtime, and an inter-Panel Event Bus, followed by
  capability-checked providers for terminal, files, Git, Markdown, logs,
  browser, or AI workflows. The accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md)
  supplies the bounded, authenticated, scoped IPC baseline; it does not define
  Panel lifecycle or implementation.
- **Distribution candidates:** `bitty-minimal`, `bitty-dev`, `bitty-cloud`,
  and `bitty-social` may become explicit post-v1.0 presets over the accepted
  [Default Distribution RFC](../specifications/default-distribution-rfc.md).
  Presets remain optional bundles, preserve safe-mode and disable precedence,
  and do not imply enabled-by-default plugins.
- **Horizon and evidence:** no date, release promise, or website publication is
  implied. Admission requires a reviewed Panel RFC or ADR, independent
  security and architecture review, bounded lifecycle and Event Bus evidence,
  and distribution verification under the existing risk and compatibility
  gates.

## Gap register: modern terminal feature survey (candidate)

> Candidate triage only. `P0`/`P1`/`P2` in this register are survey ranks
> (table stakes / majority-have / differentiator), not security `P0-AC` gates
> and not accepted scope. No row is accepted, scheduled, or implemented by
> this document. Admission for any row still requires a scoped CarryCtx task
> plus its owning RFC or ADR; every `bitty` citation below is `Implemented`
> not `Verified`.

**Provenance.** `bitty` `CTX-0251` surveyed six modern terminals (Ghostty,
WezTerm, Kitty, Alacritty, Windows Terminal, iTerm2) read-only against `bitty`
`main` `3f5ed24` on 2026-09-09. Reference clones and revision notes remain
scratch-only under `bitty` `recording/references/` and `bitty`
`recording/ctx-0251/`; they are untrusted, were never executed, and no vendor
documentation is copied into this repository. Survey cells marked unknown are
honest evidence gaps; rows marked **evidence-limited** (accessibility, IME,
font-zoom cross-vendor rank, file-watcher reload) need one more source pass
before their rank is treated as fixed. Post-survey `bitty` movement is
recorded below only as `Implemented` status; it does not update the snapshot,
milestone frame, or maturity stated above.

**Overall finding.** The survey found near-parity on VT plumbing (truecolor,
SGR state, cursor styles, mouse reporting with SGR, bracketed paste, OSC 52
gating, OSC 7/8/133 parsing, title, terminfo, and CJK-aware selection) but
missing end-user table stakes: windows, tabs, scrollback search, copy mode,
hints, palette, zoom, notifications, profiles, session restore,
accessibility, and IME. The draft
[Core and Plugin Boundaries](../architecture/core-boundaries.md) M1 Hardening
table proposes plugin policy ownership for several of these experiences
(tabs, search, sessions, shell enhancement, quake, palette) over Core
mechanisms; that table is draft, ships and admits no plugin, and the
underlying mechanisms remain candidate work below.

### P0 — table-stakes survey gaps

| Gap                              | Survey state at `3f5ed24`                                                                                          | Bitty status and candidate owner                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multiple OS windows              | Absent; no `NewWindow` action. All six references support multiple OS windows (Alacritty via `msg create-window`). | Core mechanism: [Workspace Compositor](../specifications/workspace-compositor.md) `Instance -> Window` hierarchy and `bitty-platform` window ownership. The [Single-Window Vertical Slice](../product/vertical-slice-acceptance.md) explicitly excludes multi-window. Post-survey workspace ops (`bitty` #433 `227ca3a`, CTX-0257) are in-app workspace switching, not OS windows. |
| OSC 8 hyperlink click-to-open UX | Absent UX; OSC 8 parsed (`OscHyperlink`) only. All six references open hyperlinks.                                 | Tracked as the `R-005` residual real-window activation UX in Now-3 and the `R-005` Next row; no separate task owns the UX yet.                                                                                                                                                                                                                                                     |

### P1 — majority-have survey gaps

| Gap                                                   | Survey state at `3f5ed24`                                                   | Movement since survey (`Implemented` only)                                                                                                                      | Candidate home                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tabs + tab bar                                        | Absent; `Stack` layout is tab-like only.                                    | None. `227ca3a` (#433, CTX-0257) adds workspace ops and a workspaceline overlay, not a tab bar.                                                                 | Plugin policy over Core primitives per [Core and Plugin Boundaries](../architecture/core-boundaries.md) and `bitty-terminal.tabs` in the [plugin roadmap](../product/plugin-roadmap.md); layout stays with the compositor.                                                                                                |
| Find in scrollback                                    | Absent; no search action.                                                   | None.                                                                                                                                                           | Plugin-owned search UX over a controlled snapshot per Core and Plugin Boundaries; future dogfood candidate in the plugin roadmap. Needs a bounded search contract first.                                                                                                                                                  |
| Kitty keyboard protocol                               | Absent.                                                                     | None.                                                                                                                                                           | Core input mechanism: [Input and Pointer Contract](../specifications/input-pointer-rfc.md) (Draft) opt-in negotiation; [Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md) keeps it a progressive enhancement rather than M1-required.                                                        |
| Vi / copy mode                                        | Absent; mouse selection exists.                                             | None.                                                                                                                                                           | Selection and input contract; keyboard selection mode is unowned.                                                                                                                                                                                                                                                         |
| Hints / quick-select                                  | Absent.                                                                     | None.                                                                                                                                                           | [Semantic Terminal RFC](../specifications/semantic-terminal-rfc.md) hints unit (draft) covers semantic targets; no mouse quick-select UX contract.                                                                                                                                                                        |
| Shell-integration prompt-jump UX                      | OSC 133/7 parsed; jump UX unverified.                                       | None.                                                                                                                                                           | Plugin-owned shell enhancement over semantic zones per Core and Plugin Boundaries and `bitty-terminal.shell-integration` in the plugin roadmap, gated on the Semantic Terminal RFC.                                                                                                                                       |
| Synchronized output (DEC 2026)                        | Absent.                                                                     | None.                                                                                                                                                           | Core renderer protocol in scope of the Input and Pointer Contract.                                                                                                                                                                                                                                                        |
| Quake / hotkey window                                 | Absent.                                                                     | None.                                                                                                                                                           | Plugin-owned window and presentation policy over the Core window mechanism per Core and Plugin Boundaries; needs a scoped ADR or RFC.                                                                                                                                                                                     |
| Command palette                                       | Absent; opt-in Command Composer only.                                       | None.                                                                                                                                                           | Plugin-owned palette and picker over overlay primitives per Core and Plugin Boundaries; `bitty-terminal.palette` is bundled disabled in the [Default Distribution RFC](../specifications/default-distribution-rfc.md), with overlay types in the [Panel Runtime Pre-Study](../specifications/panel-runtime-pre-study.md). |
| Theme gallery + switching                             | Few built-in presets only.                                                  | None.                                                                                                                                                           | No owning gallery contract; the theme marketplace remains deferred in Later-4.                                                                                                                                                                                                                                            |
| Per-codepoint font fallback                           | Absent (crossfont only).                                                    | None.                                                                                                                                                           | [Text and Rendering RFC](../specifications/text-rendering-rfc.md) (Draft) font discovery and coverage-driven fallback candidate scope.                                                                                                                                                                                    |
| Grapheme-cluster measurement                          | Unverified; `char_cell_width` approximation.                                | None.                                                                                                                                                           | Text and Rendering RFC UAX #29 grapheme-to-cell replacement; excluded from the vertical slice today.                                                                                                                                                                                                                      |
| Kitty graphics present path                           | Work in progress (CTX-0248 at survey).                                      | Landed `0cc82de` (#425), `bd15d94` (#427), and follow-ups `3d45924` (#465), `6d4aa2f` (#463), `18c333a` (#467), `fdd9e28` (#505); `Implemented` not `Verified`. | [Rich Presentation RFC](../specifications/rich-presentation-rfc.md); already in flight, do not re-plan.                                                                                                                                                                                                                   |
| User-facing scriptability (window, tab, pane control) | Devtools socket only; consent-gated.                                        | `bitty ctl` workspace verbs landed `227ca3a` (#433, scope-gated `view.manage` / `terminal.manage`) and `8b987a0` (#457); `Implemented` not `Verified`.          | [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and [DevTools RFC](../specifications/devtools-rfc.md); Later-2 `v0.9`.                                                                                                                                                                                            |
| Font-size zoom                                        | Absent at survey; cross-vendor rank **evidence-limited**.                   | Per-window font zoom landed `bc1fbba` (#439, CTX-0263); `Implemented` not `Verified`.                                                                           | Input and configuration surface; the cross-vendor rank still needs its source pass.                                                                                                                                                                                                                                       |
| Live config reload (file watcher)                     | Reload module exists; watcher unverified; **evidence-limited**.             | `5afb8a2` (#490, CTX-0295) adds reload knob-effect tests; watcher evidence remains unproven.                                                                    | [Configuration Model RFC](../specifications/configuration-model-rfc.md) `Live` reload semantics.                                                                                                                                                                                                                          |
| Screen-reader / accessibility API                     | Absent; only Windows Terminal verified in the survey; **evidence-limited**. | None.                                                                                                                                                           | No owning contract; the `Scene` accessibility-tree consumer in the Rich Presentation RFC is the nearest candidate and needs a scoped study.                                                                                                                                                                               |
| IME / CJK input pipeline                              | Draft-only; **evidence-limited**.                                           | None.                                                                                                                                                           | Input and Pointer Contract plus Text and Rendering RFC IME overlay; the vertical slice carries IME only as a candidate input and keeps preedit in presentation state until encoded.                                                                                                                                       |

### P2 — differentiators, precedents, and explicit refusals

Deliberate refusals and vendor precedents are recorded explicitly so absence
is never read as a decision:

| Capability                      | Bitty stance                                                                                                                                                                                                                | Precedent handling                                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Sixel graphics                  | Explicit unsupported in `inspect`/`doctor`; conscious scope choice.                                                                                                                                                         | Matches Alacritty and Ghostty shipping no sixel; keep explicit and revisit only with demand evidence and a scoped task.                 |
| Broadcast input to panes        | Input path states never broadcast.                                                                                                                                                                                          | Kitty and Windows Terminal support broadcast input; the Bitty refusal stays deliberate.                                                 |
| Ligatures                       | Absent; no Bitty decision recorded.                                                                                                                                                                                         | Alacritty refuses ligatures as an explicit non-goal; if Bitty refuses, record it as a Bitty decision rather than infer it from absence. |
| Session restore on launch       | Absent; saving and restoring are proposed plugin ownership in the draft Core and Plugin Boundaries table, while daemon-backed session persistence remains post-v1.0 per [ADR 0008](../decisions/adrs/ADR-0008-headless.md). | Ghostty explicitly does not restore; Kitty offers startup sessions.                                                                     |
| Tab bar and GUI settings editor | Absent; file-only configuration plus the in-app workspace model.                                                                                                                                                            | Alacritty declines tabs by design; Alacritty, Kitty, and Ghostty stay file-only. These are precedents, not Bitty refusals.              |

Remaining P2 differentiators (consider, do not chase without demand):

| Differentiator                                                                                                                                                                   | Survey state                                            | Candidate home                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Images beyond Kitty (iTerm2 inline, file transfer, icat-style tooling)                                                                                                           | Absent; sixel refused.                                  | Rich Presentation RFC keeps non-Kitty adapters unimplemented; admission needs protocol and demand work.                                                                                                              |
| Profiles + auto-switching                                                                                                                                                        | Absent; config-source label only.                       | No owning contract; the panel vision aggregates profiles, layouts, and themes config sets.                                                                                                                           |
| Remote mux / tmux integration and serial targets                                                                                                                                 | Absent.                                                 | Remote and daemon ownership deferred post-v1.0 per ADR 0008; serial targets unowned.                                                                                                                                 |
| Desktop notifications on bell or activity                                                                                                                                        | BEL inert; event queued, no notify path.                | Platform notification primitives exist per Core and Plugin Boundaries and Isolation Resource RFC RC-8 bounds notification rate; no desktop-notify contract yet.                                                      |
| Bidi / RTL shaping                                                                                                                                                               | Absent.                                                 | Text and Rendering RFC bidi-reordered present candidate scope.                                                                                                                                                       |
| Custom / pixel shaders and gradient pipelines                                                                                                                                    | Opacity only.                                           | Rich presentation and renderer horizon; unowned beyond opacity.                                                                                                                                                      |
| Per-panel background images                                                                                                                                                      | Accepted contract, not implemented.                     | [RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md) OQ-042 (accepts PNG/JPEG/static-WebP, reused image-store bounds, fit modes, fail-closed validation); plugin-supplied images remain open (OQ-049). |
| Scrollback pipe or export to pager or command                                                                                                                                    | Absent.                                                 | Rich export and overlay contract; unowned.                                                                                                                                                                           |
| iTerm2-only delights (instant replay, paste history, triggers, badges, annotations, per-line timestamps, password manager, captured output, coprocesses) and in-terminal AI chat | Absent; agent crates exist with no terminal-surface UX. | Provenance-only list; the AI surface stays deferred by the product vision non-goals and the panel horizon.                                                                                                           |

### Candidate horizon mapping (hints, not commitments)

| Gap group                                                                  | Existing owner contract                                                                                                         | Horizon hint                                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Window and layout: multi-window, tabs, quake, workspaces                   | Workspace Compositor (`Instance -> Window -> Workspace -> LayoutTree -> View`) plus the Core and Plugin Boundaries policy table | After the single-window slice; layout is explicitly excluded from it |
| Input and composition: kitty keyboard, copy mode, IME, synchronized output | Input and Pointer Contract; Text and Rendering RFC                                                                              | M3 usable-terminal wave (strategy sequence steps 2 and 3)            |
| Text shaping and width: fallback, graphemes, bidi, zoom                    | Text and Rendering RFC                                                                                                          | M3 and `v0.3` renderer slice                                         |
| Search, hints, prompt jump, composer                                       | Semantic Terminal RFC; Rich Presentation RFC search and overlay contracts                                                       | M3/M4 overlay and semantic wave                                      |
| Palette, themes, profiles                                                  | Plugin roadmap providers; Default Distribution RFC; Panel Runtime Pre-Study                                                     | Plugin and overlay horizon                                           |
| Scriptability and control                                                  | IPC and Agent RFC; DevTools RFC                                                                                                 | Later-2 `v0.9`                                                       |
| Accessibility and desktop notifications                                    | None assigned                                                                                                                   | Needs a scoped study before any horizon                              |
| Graphics present path                                                      | Rich Presentation RFC                                                                                                           | `v0.8` rich slice (Kitty lineage in flight)                          |

**What would admit a row.** A scoped CarryCtx task, the owning RFC or ADR
accepted with independent review, a named owner, success evidence mapped to
the [Risk Evidence RFC](../specifications/risk-evidence-rfc.md) taxonomy where
security-relevant, and an explicit confidence level. Until then every row in
this register is candidate; no edit here admits scope, authorizes code, or
moves a milestone.

## Dependencies, owners, and confidence

| Horizon                 | Owner (accountable)                                                                                               | Reviewers required before status moves                                                                                      | Dependencies                                                                              | Confidence                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Now (R-001, R-002)      | `security-auditor` plus `docs-curator` (bitty side: `bitty-security` passed 8c41f1e and 8e6c8a9)                  | `security-auditor` plus `docs-curator` plus category-owner per P0 review checklist                                          | Terminal State RFC, Rich Presentation RFC, Performance Budget RFC, Isolation Resource RFC | High — merged on `main`, harness and corpus retained                     |
| Next (R-003..R-004)     | `security-auditor` plus `extensibility` and `architecture` owners for RFC mechanism; `docs-curator` for docs sync | Same checklist plus per-risk auditor report                                                                                 | R-002 budgets, plugin platform and isolation budgets, VT and rich loader contracts        | Medium to low — Accepted and Implemented, not yet Verified               |
| Later `v0.8`/`v0.9`     | `extensibility` plus `architecture` plus `security-auditor`                                                       | Independent review per owning RFC and the Risk Evidence RFC                                                                 | Now plus Next; ladder spine order taken as candidate                                      | Low — maturity label, behavior still draft                               |
| Later `v1.0`            | Project initiator plus `security-auditor`                                                                         | All `P0` rows Verified plus `Compatible` plus Governance RFC release train                                                  | Entire ladder up to `v0.9`                                                                | Low — not claimable until every `P0` row is Verified                     |
| Post-v1.0               | Future daemon and remote ADR owners                                                                               | ADR 0008 trust-boundary gate plus threat-model co-ownership                                                                 | IPC plus isolation plus layered scopes, explicitly deferred                               | Informational — not in horizon scope                                     |
| Post-v1.0 Panel         | Future Panel RFC and distribution owners                                                                          | Panel RFC/ADR plus security, architecture, and distribution review                                                          | Workspace Compositor Draft, Panel Vision, IPC RFC, Default Distribution RFC               | Low — candidate direction only                                           |
| Gap register (CTX-0251) | `docs-curator` for the register; per-row owning RFC or ADR owners once assigned                                   | Independent product and architecture review before any rank becomes accepted scope; security review for trust-boundary rows | Survey provenance (scratch-only) plus the owning contract named per row                   | Low — survey triage only; evidence-limited rows need another source pass |

No horizon has a date. CarryCtx tasks remain the execution record; this
document is sequencing only.

## Success evidence and evidence anchors

Every success claim below maps to the taxonomy in the [Risk Evidence RFC](../specifications/risk-evidence-rfc.md)
(`unit`/`integration`/`adversarial`/`manual-audit`/`ci-gate`) and to a row in
the [Evidence Matrix](../security/evidence-matrix.md). The matrix is the Phase
E companion to the [Risk register](../security/risk-register.md) and the
[P0 acceptance criteria](../security/p0-acceptance-criteria.md); the register
is `Open` until all linked P0-AC pass per their verification method and the
auditor records `Mitigated` (risk state) and the crate moves from
`Implemented` to `Verified` (maturity). `Accepted` additionally requires a
time-bounded CarryCtx decision.

| Horizon claim        | How it is proven without weakening controls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Now `R-001 Verified` | `bitty-vt` `48` parser tests plus `5` `tests/replay.rs` corpora plus soak `bitty-runtime` replay determinism; VT/UTF-8/OSC/DCS/APC corpus `pseudo_random_byte_soup_is_panic_free_and_deterministic` plus boundary matrix at and beyond CSI/OSC limits; corpus retained as `fuzz/corpora/vt` `30 bins` `SHA256SUMS`; `cargo check --workspace --all-targets --locked` and `cargo test -p bitty-vt` and `just check` `94` files `0 issues` and `cargo clippy -D warnings` and Docs quality `ci.yml` dry-run; auditor report `vt-parser-2026-xx` |
| Now `R-002 Verified` | `bitty-rich` `93` tests headless plus `ImageStore` integration; sustained-load budget invariant bounded growth; decompression-bomb pre-allocation rejection proving peak under `64 MiB` per image and `256 MiB` aggregate; `cargo test -p bitty-rich` plus `cargo check --target x86_64-pc-windows-gnu`; auditor review of IMG-1..IMG-9 vs P0-AC-003 and P0-AC-004; `fuzz/corpora/rich` `20 bins` `SHA256SUMS`                                                                                                                                |
| Next moves           | As above per risk: negative class matrices (loader, scheme, scope), budget-dimension trigger tests with correct attribution (`PluginId` plus generation), fault-injection suites, and reviewer-signed `docs/security/audits/` reports; `just check` plus `act -n` green on the same revision that claims the move; reopening on any regression per RS-5                                                                                                                                                                                       |
| Later maturity       | Candidate `v0.8`/`v0.9`/`v1.0` slices move only when their owning RFCs and risk rows satisfy the same entry checklist; website publication and compatibility claims remain separate gates per the Website Delivery RFC and Governance RFC                                                                                                                                                                                                                                                                                                     |

The evidence-matrix header `State` stays `Open` until the auditor records the
review that moves a risk; presence of `bitty-vt`, `bitty-rich` `ImageStore`,
`bitty-ipc` `256 KiB` framing with peer credentials, or `bitty-lua` `piccolo`
at `be3bdb4` is `Implemented` evidence, not `Verified` closure.

## Non-goals and what this document does not promise

- No calendar dates, no release train commitment, and no website publication
  promise for any version tag. Version strings are maturity labels per the
  [Release Ladder](../product/release-ladder.md) candidate ladder, not dates.
- No weakening of any normative control in the [Security overview](../security/overview.md),
  [Threat model](../security/threat-model.md), or [P0 acceptance criteria](../security/p0-acceptance-criteria.md).
  Listing a control here as a P0 gate does not relax its threshold.
- No bypass of the [Risk Evidence RFC](../specifications/risk-evidence-rfc.md)
  review gates, including the three-independent-review rule and the
  safe-mode invariance RS-7 (`bitty --safe` with minimal built-in config and
  zero third-party plugins).
- No claim that `bitty` implements Later candidates such as `bittyd`, remote
  UI, AI features, plugin store, fancy chrome, markdown-rich enhancements
  beyond IMG limits, SSH manager, or theme marketplace. Those remain deferred
  per [ADR 0008](../decisions/adrs/ADR-0008-headless.md) or per the
  [Product vision](../product/vision.md) non-goals and the
  [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
  candidate early-deferral list, both strictly larger than the documented
  non-goals.
- No self-acceptance: this document is `draft` per the
  [Documentation workflow](../development/documentation-workflow.md) lifecycle
  `Draft -> experimental review evidence -> Accepted -> normative` and can move
  out of draft only via independent review with `just check` green.
- No rejection by silence: deliberate refusals stay explicit in the
  [CTX-0251 gap register](#gap-register-modern-terminal-feature-survey-candidate)
  (sixel and broadcast input are Bitty stances; ligature, session-restore, tab,
  and file-only GUI precedents come from reference terminals). A capability is
  admitted, refused, or deferred only through a scoped RFC or ADR, never by
  absence from this roadmap.

## Maintenance and mapping

- Review stale assumptions regularly, preserve material scope changes, and link
  completed outcomes to release evidence per the
  [Roadmap index](README.md) naming and maintenance rule.
- When a Later slice moves from `Implemented` to `Verified`, update its status
  in the [Release Ladder](../product/release-ladder.md) and the linked
  [Risk register](../security/risk-register.md) row per the Risk Evidence RFC;
  `Verified` requires independent `security-auditor` and P0-AC evidence. The
  update belongs in a dedicated CarryCtx task for that slice, not as a
  side edit to this horizon.
- The first real single-window slice is gated by the
  [Single-Window Vertical Slice Acceptance Plan](../product/vertical-slice-acceptance.md)
  (CTX-0109, draft, depends on CTX-0107/0108; one process/window/workspace/terminal,
  cursor/scrollback/resize/selection/copy-paste, PB-1..PB-7, Tier 1/2, explicit
  exclusions). Until its independent review passes, no implementation slice may
  claim `v0.1` progress; CTX-0111 owns the follow-up synchronization of this
  horizon and [`TODO.md`](../../TODO.md). Cross-repo informational link
  (CTX-0111, 2026-08-31): `bitty` `CTX-0095`
  `Implement real single-window terminal vertical slice` is `in_progress` in
  the `bitty` repository; this roadmap does not claim implementation,
  verification, or compatibility — candidate status remains until independent
  review and evidence.
- Keep every link in this document local and repository-portable; no local
  filesystem link appears in the root `README.md` or in any `AGENTS.md`.
  Validate with `just links` and `just metadata` before any PR.
- The [Shared-conversation coverage](../sources/chatgpt-share-coverage.md)
  route-item matrix and the [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
  `6a8dae4b` spine remain provenance for the sequencing narrative here; the
  [Roadmap index](README.md) admits sequencing only via the criteria satisfied
  above, so no provenance citation is accepted direction by implication.
- Carries the same language and hygiene gates as every `docs/**/*.md` file:
  English-only per the documentation workflow, flat frontmatter with no arrays
  or maps, and repository hygiene validated via `just check`.
- Refresh the
  [CTX-0251 gap register](#gap-register-modern-terminal-feature-survey-candidate)
  when a surveyed capability lands, a row gains an owning RFC or ADR, or a
  superseding survey is reviewed; record the revision and keep survey evidence
  scratch-only and untrusted. Register edits move no horizon, milestone, risk,
  or acceptance.

## References

- [Roadmap index](README.md) — admission criteria and authority.
- [Release Ladder](../product/release-ladder.md) — Pre-alpha / Engineering Milestones M1-M8 `29772a3` to `v0.1`..`v1.0`.
- [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md) — candidate spine and ladders, draft research record from [6a8dae4b-2aec-83ea-9174-03abc1f81531](https://chatgpt.com/share/6a8dae4b-2aec-83ea-9174-03abc1f81531).
- [Shared-conversation coverage](../sources/chatgpt-share-coverage.md) — provenance matrices for both historical conversations.
- [Security Risk Register](../security/risk-register.md) — R-001..R-022, severity and stage.
- [Security Evidence Matrix](../security/evidence-matrix.md) — Phase E `R-001`..`R-022` vs `P0-AC-001`..`P0-AC-034` with implementation, test, CI, adversarial, and audit columns.
- [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md) — `P0-AC-001`..`P0-AC-034` testable given/when/then criteria.
- [Risk Evidence RFC](../specifications/risk-evidence-rfc.md) — RS-1..RS-7 lifecycle, traceability, and entry checklist for `OQ-025`.
- [Security overview](../security/overview.md) and [Threat model](../security/threat-model.md) — normative controls that this roadmap must not weaken.
- [Website Delivery RFC](../specifications/website-delivery-rfc.md) — pinned `src/content/docs-revision.json` and `/docs/<version>/<path>/` for website publication; this roadmap is not published via that path while `website_publish: false`.
- [Documentation workflow](../development/documentation-workflow.md) — flat frontmatter schema, `title` equals H1, English-only, and lifecycle rules.
- [ADR 0008 - Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](../decisions/adrs/ADR-0008-headless.md) — post-v1.0 deferral for `bittyd` and remote UI ([OQ-020](../decisions/open-questions.md)).
- [Single-Window Vertical Slice Acceptance Plan](../product/vertical-slice-acceptance.md) — candidate acceptance contract for the first real one-window terminal slice (CTX-0109, draft, depends on CTX-0107/0108; PB-1..PB-7, Tier 1/2, explicit exclusions; no code authorized until review gates).
- CTX-0251 terminal feature survey — scratch-only read-only survey of six modern terminals against `bitty` `3f5ed24` (2026-09-09), with reference clones and revision notes under `bitty` `recording/references/` and survey evidence under `bitty` `recording/ctx-0251/`; untrusted, never executed, not copied into this repository, and superseded only by a reviewed successor survey. The [gap register](#gap-register-modern-terminal-feature-survey-candidate) above is the canonical summary.
