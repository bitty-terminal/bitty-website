---
title: Release Ladder v0.1-v1.0
description: Draft v0.1-v1.0 release ladder and crate publish order for the bitty workspace linking CTX-0043 publish prep and the candidate version ladder from proposed-delivery-sequence
category: development
audience: maintainer
document_type: research
status: draft
website_publish: false
sidebar_order: 41
---

<!-- markdownlint-disable MD025 -->

# Release Ladder v0.1-v1.0

## Status and provenance

- Status: **draft**. This ladder is a planning companion to the candidate
  version-maturity ladder recorded in
  [`proposed-delivery-sequence.md`](../product/proposed-delivery-sequence.md)
  (source: second historical ChatGPT share
  `6a8dae4b-2aec-83ea-9174-03abc1f81531`; English rendering, not reproduced).
  Nothing here is accepted direction, a roadmap commitment, or authorization
  to publish — it is a reviewable proposal awaiting independent review.
- Ownership: bitty CTX-0044 (updated CTX-0049, CTX-0050). Companion
  implementation is bitty CTX-0043 `chore(crate): prepare workspace for crates.io v0.1.0`
  — branch `ctx-0043/chore-crate-publish`, PR #74 — which set
  `workspace.package.version 0.0.0 -> 0.1.0`, added
  `description`/`license`/`repository`/`keywords`/`categories` workspace
  metadata, and set per-crate `publish` flags plus `description` and
  versioned `path` deps for publishable crates. CTX-0049
  `chore(version): adjust workspace to 0.0.1 (earliest)` adjusts the
  earliest publish to `0.0.1` and defers `0.1.0` until plugins etc. are
  more complete (see Workspace version mapping).
- Authority: if an ADR/RFC accepts part of this ladder, update that artifact
  and this record together. No open question is closed here.
- Relationship: the [Roadmap index](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/roadmap/README.md)
  admits items only with accepted requirements, dependencies, owners, and
  success evidence. This draft does not satisfy that bar and must not be cited
  as a dated release promise. The
  [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
  remains the provenance record; this ladder overlays a concrete **crate
  publish order** and **version mapping** without weakening normative
  security controls.

## Version ladder v0.1-v1.0 (candidate mapping)

The candidate ladder from `proposed-delivery-sequence.md` is retained verbatim
for traceability, now mapped to workspace crates and gate evidence. Version
numbers are **architecture-maturity labels**, not calendar promises.

| Version | Candidate scope (from proposed-delivery-sequence)          | Workspace crate focus for that slice                                                                                                                                          | Gate sketch                                                                                            |
| ------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| v0.0.x  | Architecture and protocol prototypes                       | `bitty-core` seed only; `publish = false`                                                                                                                                     | prototype                                                                                              |
| v0.1    | A shell runs correctly in a minimal terminal slice         | Minimal Correct Terminal: `vt` + `pty` + `term-state` + `platform` + `config` + `render` + `ui` + `runtime` + `app`; `package`/`lua` leaves ready but not wired into hot path | shell echo + resize + backpressure headless tests; `cargo check`; `cargo publish --dry-run` leaf batch |
| v0.2    | VT and TUI compatibility work                              | `bitty-vt`/`bitty-term-state` parser-to-action-to-state fidelity, compatibility matrix (OQ-004)                                                                               | differential tests, fuzz, Neovim/tmux TUI corpora                                                      |
| v0.3    | GPU rendering, fonts, performance, graphics protocols      | `bitty-render` (`wgpu 26.0`, `crossfont 0.9`) + `bitty-platform` `SurfaceTarget` seam; `sw-fallback` opt-in                                                                   | render snapshot tests, GPU present path headless, perf budget PB-1/PB-2                                |
| v0.4    | Lua configuration system                                   | `bitty-config` (`ConfigPlan`) + `bitty-lua` (`piccolo 0.3.3` RC-1/RC-2)                                                                                                       | config merge/reload/trust tests; Lua Fuel/wall + 32 MiB measurement                                    |
| v0.5    | Plugin API                                                 | `bitty-plugin-host` capability/event lifecycle (OQ-011/012/013)                                                                                                               | capability grant/revocation, bounded `EventQueue` tests                                                |
| v0.6    | Plugin manager and lazy loading                            | `bitty-package` lifecycle + manager overlay on host                                                                                                                           | activation/rollback, lazy-load budgets                                                                 |
| v0.7    | DevTools and the debug protocol                            | `bitty-runtime` instrumentation seam (no dedicated `bitty-debug` yet)                                                                                                         | debug protocol versioned surface + inspector                                                           |
| v0.8    | Rich presentation, Markdown stress, shell integration      | `bitty-rich` (OQ-008/015/016) rich blocks, hyperlinks, images                                                                                                                 | rich-block scene/zone tests, image limit/budget tests                                                  |
| v0.9    | IPC, `bitty ctl`, MCP adapter, and stabilization           | `bitty-ipc` + `bitty-agent` bounded framing/scopes (OQ-018)                                                                                                                   | framed 256 KiB, peer-credential auth, rate-limit RC-9/RC-10                                            |
| v1.0    | Stabilized plugin, configuration, command, debug contracts | All above under semver-compatible surfaces; Tier 1 platforms per ADR-0002                                                                                                     | compatibility matrix + security P0 gates + versioned APIs v1                                           |

Non-goals and daemon staging remain as in
`proposed-delivery-sequence.md`: `bittyd` and remote UI are **post-v1.0**
candidates (OQ-020), not part of this ladder.

### v0.2 compatibility lab (Phase C scaffold) — CTX-0074

Phase C scaffolds `tests/compat/{vt,osc,keyboard,mouse,resize,unicode,shell,tui}/` with
placeholder corpora and headless bounded harness (`tests/compat/harness.rs`,
`#![forbid(unsafe_code)]`, `MAX_CORPUS_BYTES = 8 KiB`, `MAX_ACTIONS = 4096`)
referencing `vttest` (menus 1–12), Ghostty/kitty/WezTerm differential (offline
grid-dump snapshot diff, not pixel), and existing `bitty-vt` tests
(`crates/bitty-vt/tests/replay.rs` fixtures `shell_session`/`escape_storm`/
`fullscreen_app`/`osc_sweep` plus `crates/bitty-vt/seeds/*.bin` 14 seeds).
Lab is headless (`Parser -> TerminalAction -> State` only), bounded,
`forbid(unsafe)`, no window/GPU leak (grep `tests/compat` for `winit`/`wgpu`/
`Window`/`Surface` must be 0). Detailed runbook and corpora plan live in
[`compat-lab.md`](../product/compat-lab.md). This scaffold does not close OQ-004 nor
accept the `v0.2` slice; it provides the reviewable layout for follow-up real
pinned `vttest` captures and reference dumps in the evidence area.

## Workspace version mapping

- `workspace.package.version = "0.0.1"` (CTX-0049; was `"0.1.0"` in
  CTX-0043). The earliest publish slice (minimal Correct Terminal,
  `v0.1` ladder row) publishes at `0.0.1` when that slice lands;
  `0.1.0` is deferred until plugins etc. are more complete (see Group 4
  tail). Earlier tags remain `0.0.x` prototypes before `0.0.1` with
  `publish = false` at the workspace root.
- Per-crate `version.workspace = true` inherits `0.0.1`; publishable crates
  additionally pin internal `path` edges with `version = "0.0.1"` so
  `cargo publish` requires the dependency already on crates.io at `^0.0.1`.
  Draft crates keep `publish = false` but still carry `description`/`license`
  /`repository` for consistency and are **not** published at `0.0.1`.
- Future increments follow semver within the ladder: `0.0.2`/`0.0.x` for
  `0.0.1` patches, `0.1.0` for the deferred plugin-complete slice,
  `0.2.0` for VT/TUI, `0.3.0` for GPU, etc., with patch bumps for fixes.
  The `1.0` bump requires stabilization gates per
  [v1.0 criteria in proposed-delivery-sequence](../product/proposed-delivery-sequence.md#candidate-v10-criteria).
- At the `0.0.20` release (CTX-0331) the workspace version moved
  `0.0.1 -> 0.0.20`, the first post-`0.0.1` Cargo/packaging bump (tags
  `v0.0.2`-`v0.0.19` were released without moving it). The change touched
  `Cargo.toml`, `Cargo.lock`, internal `path` `version` pins, `PKGBUILD*`,
  `nfpm.yaml`, and the `flake.nix` fallback; `scripts/check-release-version.sh`
  now keeps the workspace version aligned with the release tag. No crates.io
  publish is implied: `release.yml` builds and publishes GitHub Release
  binaries/packages only.

## Crate inventory (nineteen members as of 2026-09-16)

Sixteen members at CTX-0043 (`bitty/Cargo.toml`, head `7b215a2` / `3bfe386`
base); nineteen members on `bitty` `origin/main` at `e8dc9e5` (2026-09-16).
The three later additions are `bitty-compat-lab` (CTX-0078), `bitty-perf`
(CTX-0076), and `bitty-test-support` (CTX-0267), all workspace harnesses with
`publish = false`. Rows below record the current roster and direct normal
workspace dependencies; dev-only edges are named in the role text. Two rows
differ from the CTX-0043 record: `bitty-ipc` was promoted to `publish = true`
(CTX-0419, `#709`) and `bitty-config` gained a `bitty-lua` edge (CTX-0148).
`bitty-compat-lab`, `bitty-perf`, and `bitty-test-support` are not yet covered
by
[ADR 0003](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0003-core-workspace-topology.md).

| Crate                | Publish | Workspace deps                                                                                                 | Role                                                                                                                                                                                                                      |
| -------------------- | ------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bitty-vt`           | true    | none                                                                                                           | VT parser -> `TerminalAction` (`vte 0.15`)                                                                                                                                                                                |
| `bitty-pty`          | true    | none                                                                                                           | PTY lifecycle/backpressure (`portable-pty 0.9`); dev-only `bitty-test-support` edge                                                                                                                                       |
| `bitty-platform`     | true    | none                                                                                                           | winit 0.30 + `raw-window-handle 0.6.2` SurfaceTarget                                                                                                                                                                      |
| `bitty-config`       | true    | `bitty-lua`                                                                                                    | `ConfigPlan` typed pipeline; the `bitty-lua` path edge (CTX-0148) has no `version` pin yet                                                                                                                                |
| `bitty-package`      | true    | none                                                                                                           | manifest/lockfile/integrity/lifecycle (OQ-021 accepted; signatures draft)                                                                                                                                                 |
| `bitty-lua`          | true    | none                                                                                                           | `piccolo 0.3.3` deterministic VM budgets RC-1/RC-2                                                                                                                                                                        |
| `bitty-term-state`   | true    | `bitty-vt`                                                                                                     | Terminal Truth grid/damage/snapshot                                                                                                                                                                                       |
| `bitty-ui`           | true    | `bitty-term-state`                                                                                             | View/LayoutNode primitives                                                                                                                                                                                                |
| `bitty-render`       | true    | `bitty-term-state`, `bitty-platform`, `bitty-config`                                                           | wgpu 26.0 + crossfont 0.9 snapshot pipeline; theme presets from `bitty-config` (CTX-0147)                                                                                                                                 |
| `bitty-ipc`          | true    | none                                                                                                           | Generic out-of-process IPC bridge boundary: bounded framing/channels, wire envelope, scopes and consent, peer-credential auth, DevTools JSON-RPC, snapshot and execution services (OQ-018 accepted; promoted in CTX-0419) |
| `bitty-plugin-host`  | false   | `bitty-term-state`, `bitty-config`, `bitty-package`                                                            | Plugin registry/capability/event queue (draft, OQ-014)                                                                                                                                                                    |
| `bitty-rich`         | false   | `bitty-term-state`, `bitty-vt`, `bitty-platform`, `bitty-ipc`                                                  | Rich presentation helpers (draft, OQ-015/016); Kitty decode/placement and the image store shipped                                                                                                                         |
| `bitty-agent`        | false   | none                                                                                                           | Bounded Agent stub (draft, OQ-018/019)                                                                                                                                                                                    |
| `bitty-runtime`      | false   | `vt`, `term-state`, `pty`, `render`, `platform`, `ui`, `lua`, `plugin-host`, `agent`, `ipc`, `package`, `rich` | Orchestration (cold-path queue); twelve-edge fan-in (was seven at CTX-0043)                                                                                                                                               |
| `bitty-app`          | false   | `config`, `ipc`, `perf`, `platform`, `plugin-host`, `runtime`, `render`, `term-state`                          | Thin binary composition root                                                                                                                                                                                              |
| `bitty-core`         | false   | none                                                                                                           | Bootstrap seed to be retired                                                                                                                                                                                              |
| `bitty-compat-lab`   | false   | `bitty-vt`, `bitty-term-state` (dev: `bitty-pty`)                                                              | Headless bounded `vttest`/differential compat harness (CTX-0078; added after CTX-0043)                                                                                                                                    |
| `bitty-perf`         | false   | `vt`, `term-state`, `render`, `platform`, `pty`, `runtime`, `config`, `ui`                                     | Performance baseline bench harness (CTX-0076; added after CTX-0043)                                                                                                                                                       |
| `bitty-test-support` | false   | none                                                                                                           | Shared test-harness helpers, live-PTY gating (CTX-0267; added after CTX-0043)                                                                                                                                             |

Ten members set `publish = true` (the nine CTX-0043 publishable crates plus
`bitty-ipc`); nine remain `publish = false` until their RFC is accepted and
they are wired into the publishable set in dependency order. The `0.0.1`
crates.io publish (CTX-0116) covered the original nine-crate Groups 1-3 set
(`vt`, `pty`, `platform`, `config`, `package`, `lua`, `term-state`, `ui`,
`render`); `bitty-config`'s later `bitty-lua` edge (no `version` pin yet) must
be resolved before that crate can publish again.

> `bitty-core` scaffold note: `crates/bitty-core/src/lib.rs` is a one-line
> scaffold (`Compilation target for the pre-implementation Bitty workspace`,
> verified at `bitty` `06bc1f4`). Do not mistake the member-list row above for
> a functional crate; it is a bootstrap seed to be retired, never published.

## Concrete publish order (leaf -> core -> branch -> tail)

The order is forced by the DAG in
[ADR 0003](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0003-core-workspace-topology.md)
and the `version = "0.0.1"` pins (CTX-0043 at `0.1.0`, adjusted to `0.0.1`
in CTX-0049). Publish groups are
sequential; within a group crates are unordered (independent).

### Group 1 — Leaves (`publish = true`, no workspace deps)

Current leaves: `bitty-vt`, `bitty-pty`, `bitty-platform`, `bitty-package`,
`bitty-lua`, and `bitty-ipc`. `bitty-ipc` carries no workspace dependency and
was promoted to `publish = true` in CTX-0419, taking the leaf slot that
`bitty-config` vacated when CTX-0148 added its `bitty-lua` edge.

No internal path dependency; each can be `cargo publish --dry-run` verified
independently. CTX-0043 dry-run evidence (leaf set at that time):

- `bitty-vt` — `cargo publish --dry-run --allow-dirty` Packaging+Verifying PASS
- `bitty-pty` — PASS
- `bitty-platform` — PASS (headless tests under `gui-tests` feature gated)
- `bitty-config` — PASS (leaf at CTX-0043; now Group 2)
- `bitty-package` — PASS
- `bitty-lua` — PASS (`piccolo 0.3.3`)

`bitty-ipc` has no CTX-0043 dry-run record; its publishability is the
CTX-0419 promotion.

Publish these first, in any order, waiting for crates.io index propagation
between groups.

### Group 2 — Terminal truth and Lua-dependent config

- `bitty-term-state` — depends only on `bitty-vt = "0.0.20"`. Publish after
  `vt` is on crates.io. CTX-0043 dry-run correctly reported missing index
  for this ordering reason (metadata valid, `version` pin present).
- `bitty-config` — depends on `bitty-lua` (CTX-0148 path edge without a
  `version` pin; the pin is a prerequisite for publishing). Publish after
  `lua` is on crates.io.

### Group 3 — Presentation branch (parallel after Group 2)

- `bitty-ui` — depends on `bitty-term-state = "0.0.20"` — publish after Group 2.
- `bitty-render` — depends on `bitty-term-state = "0.0.20"`,
  `bitty-platform = "0.0.20"`, and `bitty-config = "0.0.20"` (CTX-0147
  theme-preset edge; pinned since the edge was added, bumped with the
  workspace at CTX-0331) — publish after Groups 1+2. Dev-edge `bitty-vt` is
  `dev-dependencies` only and does not impose publish ordering beyond
  `term-state`/`platform`/`config`.

`ui` and `render` have no edge between them and may publish concurrently once
their prerequisites are indexed. Together with Groups 1-2 they constitute the
earliest shell publish slice (ladder `v0.1` row) as published at `0.0.1` by
CTX-0116: `vt`, `pty`, `platform`, `config`, `package`, `lua`, `term-state`,
`ui`, `render`. (`config`/`package`/`lua` were included at `0.0.1` for
completeness though not on the hot path of the minimal shell; `0.1.0` is
deferred until plugins etc. are more complete. `bitty-ipc` was not part of the
`0.0.1` publish.)

### Group 4 — Later draft tail (`publish = false` today)

Deferred past `0.0.1` (and `0.1.0` deferred until plugins etc. are more
complete) until RFC acceptance and explicit wiring into the graph. All retain
`publish = false` with `description`/`license`/`repository` for consistency;
none is `cargo publish`ed at `0.0.1`:

- `bitty-plugin-host` — draft; depends on `term-state`, `config`, `package`.
  Publish only after Groups 1-3 are at the target version and OQ-014 is
  accepted; otherwise cycle/gate risk.
- `bitty-rich` — draft rich-content sibling of `term-state` (OQ-008/015/016);
  now also consumes `bitty-platform` and `bitty-ipc`.
- `bitty-agent` — draft bounded stub (OQ-018/019); later `0.9` slice.
- `bitty-runtime` — orchestrator fan-in; publishes only when its twelve
  dependencies are already published at the same version line. Kept
  `publish = false` at `0.0.1` — the `v0.1` row shell is validated via
  headless
  integration tests in the workspace, not via a crates.io `runtime` release.
- `bitty-app` — binary; never published (`publish = false`).
- `bitty-core` — seed to be retired; never published.

Workspace harnesses (added after CTX-0043; all `publish = false` and never
`cargo publish`ed):

- `bitty-compat-lab` (CTX-0078) — headless bounded `vttest`/differential
  compat harness; depends on `bitty-vt` and `bitty-term-state`, with
  `bitty-pty` as a dev-only edge.
- `bitty-perf` (CTX-0076; real-window measurement upgrade in CTX-0100) —
  performance baseline bench owner; depends on `vt`, `term-state`, `render`,
  `platform`, `pty`, `runtime`, `config`, and `ui`.
- `bitty-test-support` (CTX-0267) — shared test-harness helpers for live-PTY
  gating; no workspace dependency; consumed as a dev edge by `pty`, `rich`,
  `runtime`, and `app`.

Future revision of this ladder will promote the draft tail crates (not the
workspace harnesses) to `publish = true` in DAG order (host before runtime,
runtime before app if ever published) and align with the
`v0.5`/`v0.6`/`v0.8`/`v0.9` slices.

### Verification gates (from CTX-0043)

- `cargo check --workspace --all-targets --locked` PASS (CTX-0043 head).
- `cargo publish --dry-run --allow-dirty` per crate: six leaves PASS;
  dependent crates correctly fail on missing index (expected) with valid
  metadata and `version` pin. This confirms ordering, not metadata defects.
- `just check` equivalent: `cargo fmt --check` PASS,
  `cargo clippy --workspace --all-targets --locked -- -D warnings` PASS,
  `cargo test --workspace --all-targets --locked` PASS,
  `actionlint` PASS, `markdownlint` PASS.

### v0.1 slice evidence (CTX-0050 — `ctx-0050/feat-minimal-terminal`) — implemented, draft

CTX-0050 implements the `v0.1` row — Minimal Correct Terminal
(`vt` + `pty` + `term-state` + `platform` + `config` + `render` + `ui` + `runtime` + `app`;
`package`/`lua` leaves ready but not on the hot path per CTX-0049) — as a
**headless, deterministic, bounded** slice. Status remains **draft** until
independent review; this section records evidence, not acceptance.

- **Shell echo (headless, deterministic replay):**
  `crates/bitty-runtime/tests/v01_minimal_terminal.rs::v01_shell_echo_headless_and_deterministic_replay`
  feeds the same synthetic shell byte stream (`"bitty"` + SGR + OSC title + BEL)
  as one chunk, byte-by-byte, and split mid-escape; each path yields identical
  `Snapshot` text/generation/title and identical `PresentStats` fills/glyphs and
  bit-identical `headless_rgba`. The stream exercises
  `PTY bytes -> VT Parser -> TerminalAction -> State -> Snapshot + Damage -> GridRenderer -> Surface::headless_present`
  without window, GPU, or filesystem. Existing
  `bitty-vt` replay tests (`parser::tests::action_stream_identical_across_chunkings`,
  `tests/replay.rs` fixtures `shell_session`, `escape_storm`) and
  `bitty-runtime::tests::handle_pty_bytes_flow_reaches_render`
  provide the parser/state leg of the same contract.
- **Resize (headless, honest):**
  `v01_resize_headless_reconfigures_surface_and_reflows_layout_deterministically`
  proves `Runtime::handle_resize(PhysicalSize::new(800, 600))` recomputes the
  logical grid from `RuntimeConfig::grid_from_pixels` (800×600 → 100×37 cells at
  8×16), reconfigures the `Surface::headless` extent, reflows `LayoutNode` leaf
  allocations (horizontal split 100 → 50+50), and forces a full redraw; a
  zero-sized resize is correctly skipped per
  `bitty_platform::map_resize_to_surface_extent` (minimized/occluded contract).
  Covered also by `bitty-runtime::tests::handle_resize_reconfigures_surface_and_keeps_grid_pending_full_redraw`,
  `zero_resize_is_skipped_honestly`, `handle_resize_updates_container_and_reflows`
  and `bitty-app` `handle_resize` path via `PlatformEvent`.
- **Backpressure (bounded, no growth):**
  `v01_backpressure_bounded_no_growth` asserts the hard bound
  `MAX_BUFFERED_BYTES = READ_CHUNK_SIZE (8 KiB) × CHANNEL_CAPACITY_CHUNKS (16) = 128 KiB`
  and drives the runtime's bounded queues headlessly:
  `ColdQueue` capacity 2 with 5 title OSCs → `len == 2`, `dropped >= 3`;
  `PluginHost` side queue capacity 2 with 5 titles → `len == 2`, `dropped == 3`,
  `DropOldest` keeps the newest two. The PTY pump invariant
  (`bitty-pty::reader::tests::pump_respects_channel_bound_with_idle_consumer`:
  blocked `send` → channel at `CAPACITY + 1` chunks max → kernel PTY buffer → child
  blocks, no loss, no growth) is the same contract the runtime inherits via `bitty-pty`.
  No unbounded allocation path exists on the hot PTY → VT → State leg.
- **Deterministic replay (extra):** byte-identity across 1-byte and mid-escape splits
  above, plus layout determinism (`layout_allocations` identical across two runtimes
  with same tree+container) proven in `v01_resize_*` and in existing
  `deterministic_layout_same_tree_same_container`, `tick_with_split_composites_both_leaves_headlessly`
  (renders split/stack/overlay deterministically via `HeadlessRasterizer`).
- **Gates on this branch:**
  `cargo check --workspace --all-targets --locked` PASS,
  `cargo check --target x86_64-pc-windows-gnu --workspace --all-targets --locked` PASS,
  `cargo test --workspace --all-targets --locked` **708 passed, 0 failed** (704 prior + 4 new v0.1 proofs),
  `cargo clippy --workspace --all-targets --locked -- -D warnings` 0 warnings,
  `cargo fmt --all -- --check` clean,
  `just check` (fmt-check + clippy + test + actionlint + markdownlint) **0 issues**,
  `actionlint` 0, `markdownlint` 0.
- **App headless smoke:** `bitty-app::run_headless_smoke` and
  `headless_smoke_is_total_without_display_or_gpu` feed synthetic bytes,
  tick via `Surface::headless_present`, and prove the same `bitty-runtime` path
  from the binary composition root (`--headless` / `BITTY_HEADLESS=1` /
  display-unavailable fallback), including split/stack/overlay layout proofs
  deterministically.

No open question is closed by this branch; `v0.1` remains candidate until an
ADR/RFC with independent review accepts the slice. The next `0.0.2` patch line
and deferred `0.1.0` gating remain as described in Workspace version mapping.

## Cross-reference and maintenance

- Candidate spine and early-deferral list: canonical in
  [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md#candidate-build-order-spine).
- Compatibility and platform bars: [ADR-0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md),
  [Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md).
- Security gates for `v1.0` (parser limits, VM isolation, capabilities,
  paste protection, OSC policy, fuzz, package lock): normative in
  [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) and
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md);
  this ladder does not weaken them.
- Maintain this file alongside `proposed-delivery-sequence.md`: when a
  version slice is accepted via ADR/RFC, bump `workspace.package.version`,
  flip tail `publish` flags in DAG order, and add `version = "x.y.z"` pins
  on the newly publishable edges (CTX-0043 pattern).

## Acceptance note (for proposed-delivery-sequence)

This ladder overlays the candidate build-order spine with a concrete
publishing sequence without accepting it. `proposed-delivery-sequence.md`
retains provenance and candidate status; this file adds the implementable
earliest slice at `0.0.1` (deferring `0.1.0` until plugins etc. are more
complete) and the forward ordering for `0.2`-`1.0`. Closing any
register item still requires its RFC/ADR with independent review per the
[open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
Updated 2026-08-27 via CTX-0044 (`ctx-0044/docs-release-ladder`) on top of
CTX-0043 `7b215a2`; updated 2026-08-28 via CTX-0049
(`ctx-0049/chore-version-0-0-1`) adjusting earliest to `0.0.1` and deferring
`0.1.0`; updated 2026-08-28 via CTX-0050 (`ctx-0050/feat-minimal-terminal`)
adding headless `v0.1` slice evidence (shell echo deterministic replay,
resize, backpressure bounded, 708 tests, `just check` 0 issues) and a new
`crates/bitty-runtime/tests/v01_minimal_terminal.rs` integration suite;
updated 2026-08-29 via CTX-0074 (`ctx-0074/chore-compat-lab`) scaffolding
`tests/compat/{vt,osc,keyboard,mouse,resize,unicode,shell,tui}/` headless
bounded `forbid(unsafe)` harness referencing `vttest` / Ghostty/kitty/WezTerm
differential / `crates/bitty-vt/tests/replay.rs` and adding
`docs/product/compat-lab.md`; updated 2026-09-16 via CTX-0022
(`ctx-0022/docs-crate-inventory-status`) extending the inventory to the
nineteen-member workspace (`bitty` `origin/main` `e8dc9e5`), adding the
CTX-0076/CTX-0078/CTX-0267 harness crates to Group 4, moving `bitty-config`
behind `bitty-lua` (CTX-0148), promoting `bitty-ipc` to the Group 1 leaves
(CTX-0419), and refreshing dependency edges — still `status: draft`.
