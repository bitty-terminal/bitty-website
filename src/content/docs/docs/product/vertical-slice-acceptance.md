---
title: Single-Window Vertical Slice Acceptance Plan
description: Draft acceptance contract for the first real single-window terminal vertical slice scoped to one process one window one workspace one terminal with end-to-end PTY VT state render and input evidence
category: product
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 23
---

# Single-Window Vertical Slice Acceptance Plan

> Status: **draft** spec plus **Experimental Implementation** evidence —
> candidate acceptance contract for the first real single-window terminal
> vertical slice. This document defines candidate scope, end-to-end path,
> acceptance criteria, verification, platform and performance expectations,
> and explicit exclusions for review. Spec status remains `Draft` (not
> `Accepted`/`Verified`); experimental code at `bitty` `c0aadd2` (CTX-0095
> PR #148, `+1045 -87` 12 files, `winit` 0.30/`wgpu` 25.0/`crossfont` 0.9)
> plus `a8735d0` (CTX-0098 PR #151, bounded `write_replies` `4`KiB relay +
> Kitty `7727` progressive colon params) is `Experimental Implementation`
> (implemented, reviewable, not `Verified`/`Compatible`) — it does **not**
> describe shipped, stable, or compatibility-guaranteed behavior and does
> **not** close any open question. The lifecycle is
> `Draft -> Experimental Implementation -> Accepted -> Verified -> Compatible`
> (spec) and `Draft -> experimental review evidence -> Accepted -> normative`
> (document); only `Accepted` or `normative` documents authorize shipped
> behavior. Candidate sections below are explicitly marked **Candidate**;
> experimental evidence is marked **Experimental Implementation**. No OQ is
> closed by this draft; closing any OQ requires a registered decision per the
> [open-question register](../decisions/open-questions.md). This spec's
> experimental implementation was reviewed only as code evidence, not as
> spec acceptance; `Accepted` still requires independent architecture,
> security, and performance review and `just check`, `actionlint`, and
> `act -n -W .github/workflows/ci.yml` pass on the same revision.

## Purpose and scope

Bitty must prove a minimal, correct, inspectable terminal before any
composable ecosystem is admitted. This plan answers: what must a _single
real window_ that hosts a real shell demonstrate before the project treats the
terminal core as dogfoodable.

### Slice identity

- **One process**: the `bitty-app` (or `bitty` binary) process owns the slice.
  No daemon (`bittyd`), no helper process, no out-of-process renderer, no
  fallback to `bitty --safe` as the acceptance configuration (safe remains the
  recovery path, not the proof path).
- **One window**: one native window (winit 0.30) with one surface.
  Multiple windows, window management UX, or multi-window orchestration are
  out of scope.
- **One workspace**: no workspace switching, no workspace persistence, no
  workspace IPC. The window contains the slice workspace implicitly.
- **One terminal**: one PTY (Unix PTY or Windows ConPTY), one parser instance,
  one terminal state instance, one view. No splits, no tabs, no panes, no
  alternate PTY.

This scope preserves **Terminal Truth** while isolating verification risk to
the smallest real rendering and input loop. Adding a second terminal, view, or
window is a new slice with its own layout and lifecycle evidence.

### End-to-end path under test (candidate)

```text
shell (bash/zsh/fish) -> PTY (portable-pty 0.9 / ConPTY) -> VT parser (vte 0.15)
  -> Action stream -> Terminal state (grid/cursor/modes/scrollback/damage/replies)
  -> Snapshot + Damage -> text shaping/fallback/atlas (candidate from Text and Rendering RFC)
  -> wgpu 25.0 surface via winit 0.30 native window
  -> keyboard/mouse/IME (candidate from Input and Pointer Contract) -> encoder -> PTY
```

The only write into terminal state is the `Action` stream per the
[Terminal State RFC](../specifications/terminal-state-rfc.md). The renderer
consumes `Snapshot + Damage` only; no renderer, plugin, or debug consumer
reads internal grid structures. Input encoding is the only write into the PTY.
Selection, IME preedit, and clipboard are presentation or platform state until
explicitly encoded.

## Candidate vs accepted status

| Area                | Accepted fact (cite)                                                                                                                                                                                                                       | Candidate in this draft                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terminal invariants | `Action` -> state, 8 invariants, damage `generation`, deterministic replay per [Terminal State RFC](../specifications/terminal-state-rfc.md) (OQ-007)                                                                                      | Which reflow algorithm is pinned for this slice, and how its hash pins the replay corpus                                                                                                                                |
| Input families      | M1 input scope per [Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md) (OQ-004): required VT + mouse 1000/1002/1003/1006 + focus 1004 + bracketed paste 2004                                                   | Bounded encoding limits, Kitty keyboard opt-in negotiation (`CSI ? 7727`), shift-override, pixel-scroll, pinch/swipe deferred per [Input and Pointer Contract](../specifications/input-pointer-rfc.md) (CTX-0107 draft) |
| Text and rendering  | `cell.width` 1-or-2 + trailing spacer, `Snapshot + Damage -> DrawList` seam in `bitty-render`, `char_cell_width` approximation as headless evidence per [Text and Rendering RFC](../specifications/text-rendering-rfc.md) (CTX-0108 draft) | Authoritative EAW tables, UAX #29 grapheme-to-cell mapping, fallback/shaping/ligature/kerning, atlas eviction, DPI-aware metrics for this slice                                                                         |
| Platform            | Tier promises and gates per [ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md) (OQ-003)                                                                                                                                      | Exact per-platform manual evidence set and which Tier 2 platforms are exercised in this slice                                                                                                                           |
| Performance         | PB-1..PB-7 targets per [Performance Budget RFC](../specifications/performance-budget-rfc.md) (OQ-001)                                                                                                                                      | How each budget is measured for one window / one terminal and what is deferred to later slices                                                                                                                          |
| Headless            | Deferred daemon per [ADR 0008](../decisions/adrs/ADR-0008-headless.md) (OQ-020); `HeadlessRasterizer` as non-user-ready headless evidence per text-rendering draft                                                                         | Visible/headless consistency proof and deterministic headless golden corpus for this slice                                                                                                                              |

Any row whose right column is still candidate must not be cited as normative
until its acceptance decision is registered. `HeadlessRasterizer` in
`bitty-runtime` and `char_cell_width` approximation remain **non-user-ready
evidence**; they are headless test seams, not user-facing typography or
rendering.

## Normative sources this plan must not weaken

This plan refines, but does not move or relax, the following accepted
contracts (all 32 OQs `Accepted` as of 2026-08-29 per the
[open-question register](../decisions/open-questions.md) and the
[decision register](../decisions/index.md)):

- [Product Vision](../product/vision.md): small core, stable API, everything
  composable; terminal correctness and platform capability-specific boundaries
  before extension convenience; observability as first-class.
- [Architecture Overview](../architecture/overview.md) and
  [Core and Plugin Boundaries](../architecture/core-boundaries.md):
  one-way DAG; `Terminal -> Snapshot` only; Terminal/View/Layout separation;
  extension host is mechanism/policy split.
- [Performance Budget RFC](../specifications/performance-budget-rfc.md)
  (OQ-001): PB-1..PB-7 as design constraints and later hard gates.
- [ADR 0002 Platform Support Tiers](../decisions/adrs/ADR-0002-platform-support-tiers.md)
  (OQ-003): Tier 1/2/3 promises and CI guarantees.
- [ADR 0003 Core Workspace Topology](../decisions/adrs/ADR-0003-core-workspace-topology.md)
  (OQ-005) and [ADR 0004 Upstream Dependencies](../decisions/adrs/ADR-0004-upstream-dependencies.md)
  (OQ-006): 16-crate workspace, MSRV 1.85 / toolchain 1.97.1,
  `vte 0.15`, `winit 0.30`, `wgpu 25.0`, `crossfont 0.9`, `portable-pty 0.9`,
  `piccolo 0.3.3`.
- [Terminal State RFC](../specifications/terminal-state-rfc.md) (OQ-007):
  parser-to-action-to-state is the only write path; deterministic replay and
  state hashing.
- [Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md)
  (OQ-004): M1 required/allowed/denied matrix; differential and negative test
  obligations.
- [Configuration Model RFC](../specifications/configuration-model-rfc.md)
  (OQ-010), [Lua Runtime RFC](../specifications/lua-runtime-rfc.md) (OQ-009)
  plus [ADR 0005](../decisions/adrs/ADR-0005-lua-pins-and-stdlib.md) (OQ-030),
  [ADR 0006](../decisions/adrs/ADR-0006-os-env-policy.md) (OQ-031), and
  [ADR 0007](../decisions/adrs/ADR-0007-async-gc.md) (OQ-032): `ConfigPlan`,
  restricted stdlib, capability-gated `bitty.env.get`, `Send`/`Sync` boundary,
  GC tuning, budget charging.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md)
  (OQ-011/012/013), [Isolation Resource RFC](../specifications/isolation-resource-rfc.md)
  (OQ-014), [Default Distribution RFC](../specifications/default-distribution-rfc.md)
  (OQ-002), [Package Lifecycle RFC](../specifications/package-lifecycle-rfc.md)
  (OQ-021), [Package Follow-up RFC](../specifications/package-followup-rfc.md)
  (OQ-022/026-029): bundled-disabled-by-default, queue budgets
  PerSub 64 / PerPlugin 1024/256 KiB / Global 8192/2 MiB, VM budgets, signing
  deferred — this slice proves the terminal without exercising the plugin
  lifecycle beyond safe-mode equivalence.
- [Rich Presentation RFC](../specifications/rich-presentation-rfc.md)
  (OQ-008/015/016), [CLI Contract RFC](../specifications/cli-contract-rfc.md)
  (OQ-017), [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (OQ-018),
  [DevTools RFC](../specifications/devtools-rfc.md) (OQ-019),
  [ADR 0008 Headless](../decisions/adrs/ADR-0008-headless.md) (OQ-020),
  [Governance RFC](../specifications/governance-rfc.md) (OQ-024),
  [Website Delivery RFC](../specifications/website-delivery-rfc.md) (OQ-023),
  [Risk Evidence RFC](../specifications/risk-evidence-rfc.md) (OQ-025):
  none are exercised as shipped behavior in this slice; rich/image/IPC/agent
  remain `Implemented` but not `Verified` at `be3bdb4`.
- [Security Overview](../security/overview.md),
  [Threat Model](../security/threat-model.md),
  [Risk Register](../security/risk-register.md),
  [P0 Acceptance Criteria](../security/p0-acceptance-criteria.md),
  [Evidence Matrix](../security/evidence-matrix.md):
  invariant 3 (presentation never truth), invariant 4 (no hot-path plugin),
  invariant 7 (bounded inputs), T-01/T-02/T-03/T-13 and P0-AC-001..034 gating;
  `R-004` re-audited at `bitty 7a4ee41` remains `Open`.
- Draft dependencies per task ordering: [Input and Pointer Contract](../specifications/input-pointer-rfc.md)
  (CTX-0107, draft) and [Text and Rendering RFC](../specifications/text-rendering-rfc.md)
  (CTX-0108, draft) are explicitly candidate predecessors; this plan does not
  promote either to accepted and carries their bounded-payload and
  non-user-ready disclaimers.
- [Technology Strategy](../project/technology-strategy.md),
  [Repository Map](../project/repository-map.md),
  [Documentation Workflow](../development/documentation-workflow.md):
  any threshold or behavior selected here is an attribution within those
  parents, never a bypass.

Where this draft selects a threshold, it is a candidate synthesis; it does
not reassign an owner, does not downgrade a P0 gate to P1, and does not create
an ambient-authority or unbounded-parsing exception.

## Architecture and ownership (candidate slice)

### Component map for one window / one terminal

| Layer             | Owning crate or adapter (candidate)                                                                          | Slice requirement                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Shell + PTY       | `bitty-pty` (`portable-pty 0.9`) + ConPTY adapter                                                            | Spawn, resize, signal, backpressure, bounded reply buffer; one PTY only                                                  |
| VT parser         | `bitty-vt` (`vte 0.15` wrapped)                                                                              | Bounded incremental parse per T-01; total `Action` per byte stream; no I/O                                               |
| Terminal state    | `bitty-term-state`                                                                                           | Grid/cursor/modes/scrollback/damage/replies; validator for 8 invariants                                                  |
| Text metrics      | `bitty-term-state::cell::char_cell_width` (approximation seam) + future authoritative EAW tables (candidate) | UAX #11 width, UAX #29 segmentation candidate, zero-width combining; single cell-width function per text-rendering draft |
| Rendering         | `bitty-render` (`crossfont 0.9`, `wgpu 25.0`)                                                                | `Snapshot + Damage -> DrawList -> Surface::present`; `GlyphCache`/`AtlasLayout` candidate bounds; damage-only present    |
| Window + platform | `bitty-platform` (`winit 0.30`)                                                                              | Native window, DPI, monitors, focus, raw input, presentation-time hook                                                   |
| Input router      | `bitty-platform` + `bitty-runtime` router                                                                    | `Platform -> Router -> Keymap -> Encoder -> PTY`; platform divergence absorbed at adapter edge                           |

`bitty-config`, `bitty-plugin-host`, `bitty-lua`, `bitty-package`,
`bitty-rich`, `bitty-ipc`, `bitty-agent` are present in the workspace but
do not contribute active behavior to this slice beyond `bitty --safe`
equivalence (no third-party plugins, empty enabled set per Default
Distribution RFC). No Lua enters the output or input hot paths.

### Dependency rule

All crate edges follow [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md)
rule 3: `Terminal -> Snapshot`, renderer never reads private grid, lower
layers never depend on higher layers. Snapshot is the only cross-domain
contract.

## Acceptance criteria (candidate, all must hold)

### A1. End-to-end PTY loop

- A shell spawned by the single PTY echoes typed input and exits with the
  shell's status. `echo hello` or `printf` round-trips through
  `Shell -> PTY -> VT -> state -> snapshot -> present -> input -> PTY`.
- Bounded reply buffer: DCS/OSC replies are bounded, drop-on-excess with a
  flag, never blocking the PTY reader. Evidence: bounded-buffer unit test +
  manual `infocmp` or `tput` query that generates a reply.
- No panic on malformed/unterminated CSI/OSC/DCS/APC of bounded size per
  T-01; recovery is deterministic per the Terminal State RFC decoder policy
  (`U+FFFD` one cell).

### A2. Cursor

- Cursor shape, style, and visibility follow `DECSCUSR` and `DECTCEM` via the
  `Action::CursorStyle`/`Action::CursorVisibility` path. Cursor blinks only
  when enabled; no blink when focus is lost (platform focus gate).
- Cursor integrity invariant holds after every action batch: cursor points at
  a leading cell, never the trailing spacer of a wide cell; movement onto a
  wide char follows the single documented rule from the Terminal State RFC.
  Verified by invariant validator in debug and by corpus replay.
- Cursor tracks insert/delete, scroll region, and alternate-screen swap:
  entry saves and exit restores the primary-screen cursor/mode set per mode
  consistency.

### A3. Scrollback

- Scrollback monotonicity: lines enter scrollback only via scroll-under-region
  operations; pruning drops oldest first; scrollback contents are immutable
  once written (Terminal State RFC invariant 4).
- Size is bounded and deterministic for this slice: visible grid plus
  scrollback history bounded by configured limit (candidate default: total
  lines bounded by `history_limit` with explicit `unbounded = false` guard;
  growth beyond the limit truncates oldest, never unbounded allocation). The
  exact limit is configurable but must be stated in the manual evidence for
  this slice.
- Scroll interaction: Shift+wheel or Shift+PgUp/PgDn scrolls scrollback when
  not in alternate screen; application-mode mouse (1002) does not leak
  scrollback into the application's coordinate space.

### A4. Resize to PTY

- Native window resize recomputes grid geometry (columns x rows) from
  cell metrics, applies `SIGWINCH` (Unix) or `ConPTY` resize, and records a
  single reflow with full-grid damage. The reflow algorithm is singular for
  this slice (candidate: reflow via wrap-preserving line rewrap with no
  hidden rewrap branch; exact algorithm to be pinned before acceptance).
- Resize preserves cursor integrity and geometry invariants across every
  tested size in the matrix (see Verification below). Resize events are
  `Env(resize)` frames in the replay recording, part of the determinism
  declaration.
- Reply-bounded resize: concurrent resize + burst output does not wedge the
  PTY writer and respects the `portable-pty` / ConPTY backpressure contract.

### A5. Selection

- Selection is **presentation-layer** state over grid cells, not terminal
  state. It is addressable by viewport coordinates, survives no mutation to
  `Terminal` invariants, and clears on demand or on alternate-screen entry
  as specified per view.
- Selection modes: character-stream and line-block per the Input and Pointer
  draft (word/line double/triple is candidate fidelity inside this slice;
  exact hit granularity is presentation-only and must be documented as
  candidate). Wide cells select as one logical cell (no half-wide selections).
- Shift override: holding Shift while dragging bypasses application mouse
  capture (when mouse mode 1000/1002/1003 is active) to force selection,
  per the Input draft. Mouse capture itself is alternate-screen only.

### A6. Copy and paste

- Copy uses bounded text: selected grid text is extracted as bounded
  `BoundedText` (clipboard write path uses platform clipboard primitive;
  bounded before allocation per invariant 7). No unbounded concat.
- Paste uses `CLIPBOARD_MAX_BYTES=8192` char-boundary bound already audited
  at `7a4ee41` (CTX-0097) plus bracketed paste `CSI ? 2004 h` as defense in
  depth when the application has enabled it. PASTE payload exceeding the bound
  is truncated at a char boundary with telemetry, never expanded.
- Clipboard policy per [P0-AC-007/008](../security/p0-acceptance-criteria.md)
  and audit `7a4ee41`: OSC 52 read denied in this slice (M1), OSC 52 write
  gated and platform-limited; residual gaps (platform backends
  `arboard` X11/Wayland/macOS/Windows, real-window UX, 8192 post-acquisition
  bound scope) remain documented as `R-004 Open` and are not claimed fixed by
  this slice.
- Copy/paste are distinct host operations from selection; no plugin or agent
  observes raw clipboard bytes except via the same bounded, consented host
  primitive.

### A7. Shell coverage

- Default shell on each Tier 1 platform renders a usable prompt, accepts
  command entry, displays output, and restores the prompt on `clear`/`reset`.
  Candidate shell set for this slice: `bash` (Linux), `zsh` (macOS),
  `PowerShell` or `bash` on Windows via ConPTY, with one Tier 1 shell
  exercised per PR matrix and all three exercised in release evidence.
- Shell integration markers `OSC 133` (prompt) and `OSC 7` (cwd) are parsed as
  `OscPromptMark` / `OscCwd` actions that produce semantic-zone events (cold
  path), not grid mutation; unknown OSCs are `OscUnknown` (inert, telemetry).
  No shell integration feature is required to be visible in this slice.

### A8. nvim and tmux smoke

- `nvim` smoke: launch `nvim` inside the single terminal, observe alternate
  screen entry, cursor visibility/styles, bracketed paste, focus events
  (1004), and mouse SGR (1006) when enabled by the application. Clean exit
  restores primary screen and cursor. No `nvim` key binding is required to be
  remapped by Bitty.
- `tmux` smoke: launch `tmux` inside the single terminal, observe 256-color
  SGR, alternate screen, and status line repaint after resize. Detach/attach
  is inside `tmux`, not Bitty daemon lifecycle (deferred per ADR 0008).
- Both smokes are **manual evidence** with recordings (see Verification);
  they are not hard compatibility gates and do not extend M1 scope.

### A9. Visible vs headless consistency

- The same `VT -> Action -> state -> snapshot` determinism applies to both
  visible rendering and headless execution. A headless run of the same byte
  stream + `Env` sequence hashes identically to the visible run's state hash
  (`StateHash` canonical little-endian per Terminal State RFC), even though
  pixel output differs.
- `HeadlessRasterizer` (per text-rendering draft) is permitted only as a
  deterministic, side-effect-free stand-in for atlas/raster measurement; it is
  not user-facing rendering and must not be cited as visual evidence.
- Damage correctness: the union of per-batch damage equals a full-redraw diff
  of consecutive snapshots, verified headless; replay tooling ignores damage
  (performance-only).

## Platform scope (candidate, per ADR 0002)

| Tier                                                       | Platforms in this slice                                                     | Promise for this slice                                                                                                                                                                                                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Supported (must work; regression is a release blocker) | Linux x86_64 Wayland + X11, Windows x86_64 10 1809+ ConPTY, macOS ARM64 13+ | Every A1..A9 exercised; `cargo check --workspace --all-targets --locked` and `cargo check --target x86_64-pc-windows-gnu` equivalent via platform matrix; manual visible evidence on at least one Tier 1 platform, headless evidence on all three in CI |
| 2 — Best-effort (should work, not gated per PR)            | Linux ARM64, macOS x86_64 13+, FreeBSD x86_64                               | Headless state-hash parity only in this slice; visible launch is informational and does not gate the slice, but gaps are triaged within one cycle per ADR 0002 rule 2                                                                                   |
| 3 — Community                                              | NetBSD/OpenBSD, other arches                                                | Out of scope for this slice                                                                                                                                                                                                                             |

- No platform gain is claimed until native-runner evidence exists per ADR
  0002 CI guarantee policy. Cross-compilation never substitutes for native
  evidence in Tier 1.
- Every platform row that advertises a window or clipboard capability notes its
  residual `R-004` gap per audit `7a4ee41` (platform clipboard backend, real
  window UX, 8192 post-acquisition bound).

## Performance budgets (candidate, per PB-1..PB-7)

Measurements for this slice apply with **one process / one window / one
terminal / default scrollback / bundled-disabled plugins / warm OS cache**,
unless stated. Plugin budgets (RC-1..RC-10) are not exercised in this slice
beyond safe-mode equivalence; plugin cost is charged against plugin budgets,
not PB-2/PB-3, per the Performance Budget RFC cross-cutting rule.

| Budget                                                                                         | Slice reading                                                                                            | Measurement in this slice                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PB-1 Cold startup** `<=100 ms p50 / <=200 ms p99` launch to first prompt frame               | Applies to the single window launch with local shell                                                     | `hyperfine` median/p99 over >=50 launches, warm cache, recorded per Tier 1 platform once a real `bitty-app` link exists; lower-confidence until the first real link, but architecture must be lazy-load compatible |
| **PB-2 Idle memory** `<=80 MB RSS p50` one window 60 s idle                                    | Hard target for this slice with default scrollback, no activity, plugins disabled beyond bundled minimum | `RSS` sampled after 60 s idle, one window, `procs` or `ps` on each Tier 1; atlas `<=16 MiB + 4 MiB` large tier and cache `<=2048` entries are candidate sub-budgets                                                |
| **PB-3 Typical session + growth** `<=250 MB RSS` 8 tabs 4 h + 15% reclaim after close/GC       | 8-tab 250 MB clause is **out of scope** for this one-terminal slice; the reclaim clause is in scope      | Single-terminal 4 h mixed session (typing, `ls`, `cat`, scrollback) must satisfy the 15%-of-baseline reclaim after forced close+GC; 8-tab scenario deferred to a later slice and noted as gap                      |
| **PB-4 Input latency** `<=8 ms p50 / <=15 ms p99` key-to-screen                                | Applies directly: keystroke through encoder->PTY->parser->state->snapshot->present                       | Key-to-photon on Wayland or frame-present timestamp on all Tier 1, 60 Hz min; plugins out of hot path validated by the invariant that no Lua await/promise enters `Platform->Router->Encoder`                      |
| **PB-5 Package size** `<=25 MB` binary stripped per Tier 1 / `<=40 MB` compressed distribution | Lower-confidence inference anchor (Rust GUI app size). In-scope as a non-gated measurement               | Record stripped `bitty-app` and distribution tarball sizes per Tier 1; revisit after first real link; does not gate this slice but is reported as info                                                             |
| **PB-6 Throughput floor** `>=40 MB/s` parse-and-render single-core on slowest Tier 1           | Applies to synthetic corpus `vt` parse + `term-state` apply + `render` snapshot (not plugin work)        | Fixed synthetic corpus, single core, Tier 1 slowest runner; Alacritty 54 MB/s / WezTerm 48.5 MB/s references inform the floor, not the goal                                                                        |
| **PB-7 Idle CPU** `<=1% avg` 10 min one idle window + zero periodic wakeups                    | Applies; frame-on-demand is the mechanism                                                                | 10 min idle capture with no PTY output/animation/timers: `<=1% CPU`, zero wakeups attributable to Bitty; any timer is attributable and must be declared                                                            |

Budget violations are treated as failing tests: fix, renegotiate via an
updated accepted RFC/ADR, or document a time-boxed exception. Silent drift
is not allowed. Measurement harnesses and corpora must be defined in the
implementing `bitty` repository before any budget becomes a hard gate; until
then these numbers are design constraints.

## Explicit exclusions (candidate, not in this slice)

This slice explicitly defers the following regardless of dependency
availability. Listing them here prevents scope creep and aligns with the
source early-deferral list in the
[Proposed Delivery Sequence](../product/proposed-delivery-sequence.md):

| Excluded                                                                                                                                | Why deferred                                                                                                             | Owns the future contract                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Panel ecosystem (Panel, Panel Runtime, inter-Panel Event Bus, workspace compositor layout `H/V`/`LayoutTree`, Core decoration policies) | Panel generalizes `View` beyond one terminal; requires its own RFC/ADR per panel-vision                                  | [Panel Extensibility Vision](../product/panel-vision.md) + [Workspace Compositor](../specifications/workspace-compositor.md) (both Draft)                                                                          |
| Browser surface, AI/Agent experience, MCP adapter, Agent harness                                                                        | Agent-friendly not agent-centric; plugin-hosted per vision; no model/vendor binding in core                              | [AI Architecture](../specifications/ai-architecture.md) (Draft, post-1.0 per vision non-goals) + [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted, but `Implemented` not `Verified` at `be3bdb4`) |
| `bittyd` daemon, detach/reattach, remote UI, session persistence, multiplexer ownership                                                 | Deferred to post-v1.0 per [ADR 0008](../decisions/adrs/ADR-0008-headless.md) with mandatory trust-boundary analysis gate | ADR 0008 + [Threat Model](../security/threat-model.md) invariants 5/6                                                                                                                                              |
| Marketplace / plugin store / theme marketplace / SSH manager / fancy tabs/chrome / markdown rendering                                   | Early builds would destabilize foundations per proposed-delivery-sequence deferral list                                  | [Plugin Platform RFC](../specifications/plugin-platform-rfc.md), [Package Lifecycle RFC](../specifications/package-lifecycle-rfc.md), [Default Distribution RFC](../specifications/default-distribution-rfc.md)    |
| Multi-window, multi-terminal, splits, tabs, workspaces, overlays                                                                        | Requires layout/lifecycle beyond one window; owned by future compositor/panel slice                                      | [Core and Plugin Boundaries](../architecture/core-boundaries.md) + [Workspace Compositor](../specifications/workspace-compositor.md)                                                                               |
| Image protocols (Kitty Graphics, Sixel, iTerm2 inline), rich blocks/scenes/zones beyond action plumbing                                 | Image storage/placement is outside M1; deferred to rich slice                                                            | [Rich Presentation RFC](../specifications/rich-presentation-rfc.md) (Accepted) but not exercised here beyond `OscUnknown` recording                                                                                |
| Third-party plugin activation beyond safe-mode equivalence                                                                              | This slice proves core without attributable plugin budgets                                                               | Plugin platform + isolation RFCs                                                                                                                                                                                   |

Any proposal to pull an excluded item into this slice requires a new scoped
ADR or RFC; it must not enter via an edit to this document alone and must
address the owning RFC's acceptance gates.

## Dependencies and ordering

- This plan **depends on** [Input and Pointer Contract](../specifications/input-pointer-rfc.md)
  (CTX-0107) and [Text and Rendering RFC](../specifications/text-rendering-rfc.md)
  (CTX-0108) as candidate predecessors. Completion of this plan does not
  accept either predecessor; both remain draft until their own accepted
  decisions are registered.
- This plan **blocks** no product code directly; it gates the first
  implementation slice behind documented review. Downstream slices that depend
  on this plan are carried as next tasks under CTX-0110 (TerminalRegistry/View
  lifecycle) and CTX-0111 (doc synchronization) via the proposed delivery
  graph.
- Cross-dependency note: this slice is positionable at `v0.1` in the
  [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md) spine
  `PTY -> VT -> Grid -> Font -> GPU -> Correct Terminal -> Config` and as the
  `v0.1` row in the [Release Ladder](../product/release-ladder.md) candidate
  maturity ladder, but ladder placement alone does not authorize implementation.
- CTX-0111 is expected to reconcile this plan into the
  [Roadmap: Now / Next / Later](../roadmap/now-next-later.md) horizon and
  [`TODO.md`](../../TODO.md) sequencing; that reconciliation belongs to
  CTX-0111, not to a side edit here, and is recorded as a follow-up dependency.
- Cross-repo implementation link (CTX-0116, 2026-08-31, experimental):
  `bitty` `CTX-0095` `c0aadd2` `feat(runtime): implement real single-window vertical slice`
  (PR #148, `+1045 -87`) plus `CTX-0098` `a8735d0` `fix(runtime): close PTY reply loop and Kitty progressive params`
  (PR #151, `+408`, `Runtime::write_replies` bounded `4`KiB, `pty_reply` tests, `7727:1:2:5 -> 19`)
  are `Implemented` (experimental) — code exists as reviewable evidence at
  `bitty` `c0aadd2`/`a8735d0` but remains not `Accepted`/`Verified`/`Compatible`.
  `CTX-0096` `7e3104d` dogfood is separate experimental plugin evidence. This
  link is informational only; it does not claim `Verified`, `Compatible`, or
  `Release-ready` status for this draft, does not close any OQ, and does not
  authorize bypass of the review gates above. Candidate vs experimental vs
  accepted vs implemented vs verified remains distinct until independent review
  and evidence are recorded per `Draft -> Experimental Implementation -> Accepted -> Verified`.
- CTX-0116 reconciled this plan into [Roadmap: Now / Next / Later](../roadmap/now-next-later.md)
  and [`TODO.md`](../../TODO.md) as experimental evidence; spec remains `Draft`.

## Verification and evidence (candidate)

### Manual evidence (required for this slice)

For each Tier 1 platform where a visible run is claimed:

1. Screen recording or screenshot sequence showing: prompt launch, typing +
   echo, cursor blink/visibility, selection drag, copy/paste round-trip,
   window resize that resizes the PTY grid, scrollback scroll, `nvim` smoke,
   `tmux` smoke, and alternate-screen restoration. Each recording is stored
   under `recordings/` per workspace hygiene and referenced from the evidence
   PR description.
2. A `VT-SLICE-{{platform}}-{{date}}.md` note recording grid size, shell,
   font, DPI scale, and the `clipboard-{{platform}}` limitation paragraph
   (residual `R-004` backend) plus the truncated-paste telemetry on the
   `8192`-byte case.
3. No secrets in recordings: clipboard, environment, or trace exports are
   redacted or synthetic per the trace-minimization invariant.

Manual evidence alone does not prove determinism; it is paired with headless
mechanized proof below.

### Headless and deterministic proof (required)

1. **State hash corpus**: a pinned synthetic corpus of PTY byte streams +
   `Env(resize)` frames replays identically on visible and headless runs.
   `StateHash` byte-for-byte identical across Linux/Windows/macOS per the
   Terminal State RFC serialization rule.
2. **Damage proof**: union of per-batch damage equals full-redraw diff on the
   same corpus.
3. **Fuzz invariant hold**: parser + `Action` applier harness holds all 8
   state invariants, bounded allocations, and no-panic on VT/UTF-8/OSC/DCS/APC
   corpus with recorded `SHA256SUMS` retained as `fuzz/corpora/vt`.
4. **Differential oracle**: reference-oracle run (vttest subset + captured
   Ghostty/kitty/WezTerm sessions) with known-divergence ledger; differential
   failures are triaged bug-or-choice explicitly.

### Replay and diagnostics (candidate)

- Recording format is `header + framed chunks` (`Input(bytes)` or
  `Env(event)`) containing only raw PTY bytes + explicit environment inputs as
  in the Terminal State RFC. No actions are recorded; old recordings remain
  replayable after parser changes, and expected hashes pin baselines.
- `Env` captures: `resize`, user-initiated reset, clipboard consent outcome,
  and any future nondeterminism source. Silent nondeterminism in the action
  path is a conformance violation.
- A slice-local diagnostic command (candidate name `bitty --dump-state` or
  `bitty debug snapshot` behind the DevTools RFC scope) emits `Snapshot +
Damage` for offline inspection. Its scope and schema remain owned by the
  [DevTools RFC](../specifications/devtools-rfc.md) and
  [Threat Model](../security/threat-model.md) debug-instrumentation
  permissions; it does not expose GPU/PTY internals.

### Platform and budget evidence

- `just check` green on the same revision that claims the slice: `fmt-check` +
  `markdownlint` + `links` + `metadata` + `language` + `agents` + `hygiene` +
  `state` + `actionlint 1.7.12`, plus `act -n -W .github/workflows/ci.yml`
  dry-run for Docs quality.
- `cargo check --workspace --all-targets --locked` and
  `cargo check --target x86_64-pc-windows-gnu` green for the implementing
  `bitty` revision that witnesses this slice (recorded in evidence-matrix line
  for this slice, not in this docs revision).
- PB-1/PB-2/PB-4/PB-6/PB-7 measurements recorded per Tier 1 platform once the
  first real `bitty-app` link exists; PB-3 reclaim over 4 h single-terminal
  soak and PB-5 sizes reported as informational.

### Review gates (block implementation until passed)

The slice is **not authorized** for product code until all hold:

1. **Architecture review** — slice scope, single-window ownership, dependency
   diagram, damage/replay contract, and crate edges reviewed by the
   architecture category owner.
2. **Security review** — bounded parsing (T-01), terminal truth ownership
   (T-13/invariant 3), no hot-path plugin invariant, clipboard `8192` bound
   and bracketed paste, bounded IPC/MCP budget non-interference, and trace
   minimization reviewed by the security reviewer against P0-AC-001/002/007/008
   and R-001/R-004.
3. **Performance review** — PB-1/PB-2/PB-4/PB-6/PB-7 attribution and
   frame-on-demand vs periodic-wakeup distinction reviewed by the performance
   owner; deferred PB-3 eight-tab and PB-5 noted as informational.
4. **Docs-curator review** — draft vs accepted lineage, ADR/RFC reconciliation,
   no shipped/stable/compatibility claim, language/hygiene, and navigation sync
   (`docs/README.md`, `TODO.md`, roadmap) reviewed.
5. Local gates on the same revision: `just check` 0 issues, `actionlint -color`
   0, `act -n -W .github/workflows/ci.yml` dry-run success, `git diff --check`
   clean, no `TODO`/`FIXME` or generated artifacts.

Only after (1)-(5) are recorded as approvals on the implementing PR and as
CarryCtx checkpoint may a new implementation task be opened that cites this plan
as its accepted design constraint.

## Risks and residual gaps (candidate disclosure)

- `R-004` remains `Open` at `7a4ee41` per the
  [Risk Register](../security/risk-register.md) and [Evidence Matrix](../security/evidence-matrix.md);
  platform clipboard backends (arboard X11/Wayland/macOS/Windows), real-window
  UX, and the `8192`-byte post-acquisition bound scope are residual and are
  not claimed fixed by this slice.
- Reflow algorithm exactness, authoritative EAW/zwj/vs tables, fallback chain
  and shaping backends, pinch/swipe mappings, and suite of reference terminals
  for differential testing are all explicitly deferred to post-acceptance
  follow-up tasks; until then the approximation seam `char_cell_width` and the
  draft input/text contracts carry the documented lower fidelity.
- PB-5 is lower-confidence by construction; PB-3 eight-tab measurement is
  deferred; neither gates this slice.
- No third-party plugin is granted additional authority in this slice; every
  future plugin still passes capability and budget gates per R-006/R-007.

## Maintenance and mapping

- Keep this document, the [Input and Pointer Contract](../specifications/input-pointer-rfc.md),
  and the [Text and Rendering RFC](../specifications/text-rendering-rfc.md)
  in sync; divergence is a defect. When an input or text detail moves from
  draft to accepted, update its accepted source and link the acceptance
  decision here — do not silently promote candidate prose.
- When the slice moves from `Draft` to `Accepted` to `Implemented` to
  `Verified`, update its status and the linked [Risk Register](../security/risk-register.md)
  evidence note per the [Risk Evidence RFC](../specifications/risk-evidence-rfc.md);
  `Verified` requires independent `security-auditor` and P0-AC evidence. The
  update belongs in a dedicated CarryCtx task for that slice, not as a side
  edit to another task's worktree.
- Keep every link local and repository-portable; no local filesystem link
  appears in workspace roots or any `AGENTS.md`. Validate with `just links`
  and `just metadata` before any PR.
- English-only per the [Documentation Workflow](../development/documentation-workflow.md);
  flat frontmatter with no arrays or maps; repository hygiene via `just check`.
- Canonical sync for the broader program remains
  [`docs/project/project-state.json`](../project/project-state.json)
  validated by `bun .github/scripts/check-state.mjs` (synchronized `a8735d0`,
  chain `d4d75e9 -> c0aadd2 -> 7e3104d -> a8735d0`, `R-004` `Open`, `R-005`/`R-006`/`R-007`
  `Mitigated`, experimental not `Verified`); `c0aadd2`/`a8735d0` were added via
  CTX-0116 synchronized state task (not via this slice doc alone); spec
  lifecycle is `Draft -> Experimental Implementation -> Accepted -> Verified`.

## References

- [Product Vision](../product/vision.md) — positioning and non-goals.
- [Architecture Overview](../architecture/overview.md) — layers and execution domains.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) — ownership and hot-path invariants.
- [Performance Budget RFC](../specifications/performance-budget-rfc.md) — PB-1..PB-7 targets (OQ-001).
- [ADR 0002 Platform Support Tiers](../decisions/adrs/ADR-0002-platform-support-tiers.md) — Tier 1/2/3 (OQ-003).
- [ADR 0003 Core Workspace Topology](../decisions/adrs/ADR-0003-core-workspace-topology.md) — 16-crate DAG (OQ-005).
- [ADR 0004 Upstream Dependencies](../decisions/adrs/ADR-0004-upstream-dependencies.md) — `vte`, `winit`, `wgpu`, `crossfont`, `portable-pty` (OQ-006).
- [ADR 0008 Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](../decisions/adrs/ADR-0008-headless.md) — daemon deferred to post-v1.0 (OQ-020).
- [Terminal State RFC](../specifications/terminal-state-rfc.md) — 8 invariants, replay, damage, state hash (OQ-007).
- [Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md) — M1 protocol matrix (OQ-004).
- [Input and Pointer Contract](../specifications/input-pointer-rfc.md) — keyboard/mouse/wheel/IME/bounded encoding (CTX-0107 draft).
- [Text and Rendering RFC](../specifications/text-rendering-rfc.md) — segmentation/width/bidi/shaping/atlas/DPI (CTX-0108 draft).
- [Security Overview](../security/overview.md), [Threat Model](../security/threat-model.md), [Risk Register](../security/risk-register.md), [P0 Acceptance Criteria](../security/p0-acceptance-criteria.md), [Evidence Matrix](../security/evidence-matrix.md) — normative P0 gates.
- [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md) — candidate spine `PTY -> VT -> Grid -> Font -> GPU -> Correct Terminal -> Config` and early-deferral list.
- [Release Ladder](../product/release-ladder.md) — `v0.1` minimal terminal slice mapping.
- [Now / Next / Later](../roadmap/now-next-later.md) — candidate horizon that will carry the slice sequencing once CTX-0111 reconciles it.
- [Documentation Workflow](../development/documentation-workflow.md) — lifecycle `Draft -> experimental review evidence -> Accepted -> normative`.
- [Open-Question Register](../decisions/open-questions.md) — 32 OQs `Accepted` as of 2026-08-29.
- [Decision Register](../decisions/index.md) — accepted foundation artifacts.
