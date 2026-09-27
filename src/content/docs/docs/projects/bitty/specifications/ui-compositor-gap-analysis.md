---
title: UI and Compositor Gap Analysis
description: Verified shipped-versus-missing review of panel chrome gaps semantic blocks hints composer and panel content with native tiling window-form directions
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 29
---

# UI and Compositor Gap Analysis

> Status: **draft** (frontmatter `draft`), docs-only, direction not
> implementation. This document records a point-in-time gap analysis of the
> UI/compositor surface plus candidate native tiling window-form directions.
> Every shipped/missing verdict was checked read-only against `bitty`
> origin `main` revision `b761c0320977051383673ee4e8a4b26c35f57d05`
> (2026-09-13); stale rows were re-verified at
> `2a264808fcf4df9b2a14e13011631b3733544e13` (2026-09-19, CTX-0043) and carry
> the newer commit or file evidence where it moved. The CW-adjacent rows
> (folding, jump overlay, composer, panel content) were re-checked at
> `c01f538addc5edadc813351e3060a5642dbd40b9` (2026-09-23, CTX-0056) and carry
> the CTX-0700/#1296 present-derivation evidence. It does not claim behavior
> beyond those revisions, does not
> change any accepted contract, and does not close an open question. It
> registers the new open questions [OQ-050 through OQ-052](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
> and cites the existing doc-local items OQ-S1 through OQ-S7 in the
> [Semantic Terminal RFC](semantic-terminal-rfc.md) instead of duplicating
> them.

## Purpose and scope

The originating analysis (carrier messages m0467/m0468/m0470/m0471) listed ten
candidate UI/compositor gaps: panel borders and focus indication, gap units,
window radius, OSC 133 command folding with stable row anchors, a
flash.nvim-style jump overlay, a multi-line prompt with `$EDITOR` composition,
the Panel-is-not-Terminal content gap, native tiling window forms, the
dogfooding-versus-headless tradeoff, and the real-render soak gap.

This document re-validates each claim against the current `bitty` code before
recording it, per the docs rule that no unverified claim becomes canonical
text. Several claims describe an older snapshot and are already shipped; the
honest status is recorded per claim below. In scope: the verified status
matrix, the native window-form direction, and a prioritized gap list. Out of
scope: changing the accepted
[Workspace Compositor Specification](workspace-compositor.md), the
[Semantic Terminal RFC](semantic-terminal-rfc.md), or any renderer contract;
those remain authoritative for their subject matter.

## Verification basis

- Source: `bitty` origin `main` at `b761c03` (fetched and archived read-only;
  the shared checkout was not modified).
- Re-verification: stale rows were checked again at `bitty` origin `main`
  `2a26480` (2026-09-19, CTX-0043). The matrix rows marked
  "re-checked at `2a26480`" and the prioritized gaps cite file evidence read
  at that revision; the search/copy/multi-click movement is recorded in the
  prioritized gaps (`8ea5f86`, `e154324`, `d89fa19`) with the sibling
  [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md). Rows
  without movement keep the `b761c03` evidence.
- Re-verification (CTX-0056): the folding, jump-overlay, composer, and panel
  rows were checked again at `bitty` origin `main`
  `c01f538addc5edadc813351e3060a5642dbd40b9` (2026-09-23, read-only) for
  movement under `bitty` CTX-0700/#1296. Verdicts are unchanged (present
  derivation only; no render-pipeline or user-path consumption); the refined
  evidence is recorded per row.
- Method: symbol and line inspection of the render/runtime/config/layout and
  rich crates; verdicts are `shipped`, `implemented-only (unwired)`,
  `partial`, or `missing`.
- `implemented-only (unwired)` means the mechanism exists in a library with
  tests but is not consumed by the presentation path; it is not a shipped UI
  behavior.

## Claim status matrix

| Claim from the analysis                                                                                      | Verdict                    | Verified status (`b761c03`; refreshed rows cite `2a26480` evidence)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel borders and active/inactive focus indication are missing                                               | Shipped (claim outdated)   | Core-owned decoration (CTX-0292, CTX-0333) draws a `View` frame with `border` (default `2` logical px), `radius` (default `6`), `gaps_in`/`gaps_out` (default `6`), and `content_inset` (default `6`) from `DecorationConfig`; the focused/idle outline pair (CTX-0340, OQ-039) and focused/idle outline widths (CTX-0344, OQ-045) resolve at present time. Evidence (re-checked at `2a26480`): `crates/bitty-config/src/types.rs:60-75` (defaults), `:2063-2107` (`DecorationConfig`), `:2192` (`resolve_outline`), `crates/bitty-ui/src/decoration.rs:355-370` (DPI-scaled resolution), `crates/bitty-runtime/src/runtime/present.rs:514-565` (outline width/color and rounded frame clip), `crates/bitty-app/src/config_cli.rs` (resolution into `RuntimeConfig`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Gaps are character cells, not pixels                                                                         | Partial (both models)      | Two coordinated surfaces exist: `layout.gaps_in`/`gaps_out` are integer **cells** with default `0` (`crates/bitty-config/src/types.rs:43-46`, `:1982-1991`), and Core-owned `decoration.gaps_in`/`gaps_out` are logical **pixels** with default `6` (CTX-0333; `crates/bitty-config/src/types.rs:60-63`). The accepted model is `effective gap = decoration.gap * DPI_scale + layout.gap_cells * cell_axis`, so the default sibling/container gaps are the `6` logical px decoration defaults. Evidence (re-checked at `2a26480`): `crates/bitty-config/src/types.rs` (`LayoutConfig`, `DecorationConfig` docs), `crates/bitty-ui/src/decoration.rs:355-370`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `window.radius_px` is parsed but a no-op                                                                     | Accurate (by design)       | `window.radius_px` (physical px, `0..=24`, default `0`, CTX-0241 S0) is parsed, validated, layered, and stored on `RuntimeConfig`; the code documents it as a parsed no-op with zero render effect by design. The painted corner radius is the Core-owned `decoration.radius` (logical px, default `6`), applied to `View` frames through the rounded frame clip. Evidence (re-checked at `2a26480`): `crates/bitty-config/src/types.rs:1426-1432`, `crates/bitty-app/src/config_cli.rs:1132-1166` (S0 no-op comment), `crates/bitty-runtime/src/runtime/present.rs:556-565` (`rounded_frame_clip`, `frame.radius`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| OSC 133 command folding needs stable row anchors                                                             | Implemented-only (unwired) | OSC 133 A/B/C/D markers are parsed into bounded semantic zones (`crates/bitty-vt/src/action.rs`, `crates/bitty-vt/src/parser/dispatch.rs:742`) with a `1024`-record zone log carrying `ordinal`, `kind`, and `exit_code` (`crates/bitty-term-state/src/state.rs:62`, `:92`). `CommandBlock` and `FoldState` (CTX-0225, P1/P2 of the [Semantic Terminal RFC](semantic-terminal-rfc.md)) anchor by OSC 133 **ordinal**, explicitly without row numbers, and survive resize/reflow/scroll by design; fold state is a presentation projection, not terminal truth. Not consumed by the `bitty-render` pipeline at `c01f538`; since CTX-0700/#1296 the `bitty-runtime` present-derivation layer owns live fold state (`FoldState`/`fold_present` via `crates/bitty-runtime/src/cw_present.rs`, `runtime/cw_live.rs`, `crates/bitty-runtime/tests/cw_integrate.rs`) — present planning, not render consumption. Row anchoring stays future work and is tracked as OQ-S1/S2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| A flash.nvim-style keyboard jump overlay                                                                     | Implemented-only (unwired) | `crates/bitty-rich/src/hints.rs` implements a bounded hint model (`HINT_TARGET_MAX = 256`, `HINT_LABEL_MAX_CHARS = 8`, `HintAnchor`, `HintAction::JUMP/FOCUS`, alphabetic labels, operator keys) as route step P3 (CTX-0225). It has no user-facing overlay integration; the module wiring-status note and `hints_wiring_status_is_future_not_silent` (`crates/bitty-rich/src/hints.rs:85-93`, `:1846`, commit `237ad83`) still stand at `c01f538`. Refined at `c01f538` (CTX-0056): `bitty-runtime` consumes the model for present derivation only (one `CwHintEngine` in `crates/bitty-runtime/src/cw_present.rs` / `runtime/cw_live.rs`, CTX-0700/#1296); cross-panel hinting stays proposal-only P6 in the [Semantic Terminal RFC](semantic-terminal-rfc.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Multi-line prompt plus `$EDITOR` composer                                                                    | Implemented-only (unwired) | `crates/bitty-rich/src/composer.rs` implements the command buffer (`64 KiB` cap, paste framing, newline handling) and the external-editor round trip (`EDITOR_TIMEOUT_DEFAULT = 120 s`, max `300 s`, `bitty-composer-` temp prefix, `EDITOR_ALLOWLIST` of bare `nvim`/`vim`/`vi`) as P4/P5 (CTX-0225). The chrome action `open_composer` remains keymap-parseable but never a default and the handler stays inert with a loud warning at `c01f538` (`crates/bitty-app/src/chrome_keys.rs:767-773`, `:3315`, `crates/bitty-config/src/keymap.rs:1800-1812`; still `#647`). Refined at `c01f538` (CTX-0056): `Runtime` now owns a composer overlay session for present derivation (`cw_composer_open`/`close`/`is_open`, route/feed/present in `crates/bitty-runtime/src/runtime/cw_live.rs`, CTX-0700/#1296) — session state exists, while the user-facing chrome path plus editor spawn stay unwired.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Panel is not Terminal: non-terminal panels degrade to a character grid                                       | Gap confirmed              | Typed panel content exists (`ViewContent::Panel(PanelId)`/`Browser(BrowserSurfaceId)` in `crates/bitty-ui/src/panel.rs:184-190`) with per-panel registries in `crates/bitty-runtime` (`registry/panel.rs:962`/`:1062` create/mount; `browser_panel.rs` stays; `palette.rs` stays a Core Panel Runtime/theme bridge helper, not the first-party palette package; `statusline.rs` now renders through the status registry and creates panels via the host facade, CTX-0700/#1296, but remains a Core-side helper, not an independent-plugin surface). The ai-panel and mail-panel experiences moved to the in-tree staging crate `bitty-panels` (`crates/bitty-panels/src/{ai_panel,mail_panel}.rs`, commit `74361aa`), and the bundled git-panel/file-manager implementations were removed with their catalog entries (`e84da34`, `65aac5c`). The rich model (`SceneNode`, spans, tables, borders, block anchors in `crates/bitty-rich/src/scene.rs:148`, `:238`) is bounded (`SCENE_MAX_BLOCKS_PER_TERMINAL = 64`, `SCENE_MAX_NODES_PER_BLOCK = 2048`, `SCENE_MAX_DEPTH = 32`, `SCENE_MAX_RICH_BYTES_PER_TERMINAL = 2 MiB`; `crates/bitty-rich/src/scene.rs:24-36`) but is still not consumed by the `bitty-render`/`bitty-app` render pipeline at `c01f538` (no `SceneNode` reference in `bitty-render` or `bitty-app`; since CTX-0700/#1296 `bitty-runtime` consumes `Scene` blocks into the present paint plan only — `consume_scene_present`/`ScenePresent`, `crates/bitty-runtime/src/cw_present.rs:540-548`, CW-06); panel presentation still rides the per-leaf grid snapshot path. This is the Core Scene/compositor integration gap. |
| Native tiling window forms (dwindle, niri ribbon, scratchpad, panel rules, semantic workspaces, unified Mod) | Partial                    | Shipped: Hyprland dwindle-style adaptive split axis (`crates/bitty-ui/src/layout.rs:163-174` `split_width_multiplier` heuristic), floating overlay tiers with z-index (`crates/bitty-ui/src/layout.rs:42-63`, `Float` default, overlays clipped to the container), deterministic focus traversal (`crates/bitty-runtime/src/runtime/layout_focus.rs:911`), and a single-owner chrome keymap with a vim preset using `Alt` as the working modifier (`crates/bitty-config/src/keymap.rs`). Parseable but transition-gated: `Floating`/`Fullscreen`/`Scratchpad` parse yet `PresentationMode::can_transition` allows identity only (`crates/bitty-ui/src/presentation.rs:121-123`), and `ScratchpadHidden` stays a computed registry `Visibility` state (`crates/bitty-runtime/src/registry.rs:263`). Not found at `2a26480`: niri-style scrollable ribbon, declarative panel rules (panelrule), semantic workspaces, an explicit unified `Mod` abstraction contract.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Process overhead versus dogfooding                                                                           | Partial                    | The app is single-process `winit` (per-leaf shell/PTY spawning; the first-party ai/mail panel experiences now live in the in-tree `bitty-panels` staging crate after `74361aa`, `crates/bitty-panels/src/lib.rs:24-38`); bounded headless dogfooding smokes exist (`crates/bitty-runtime/tests/dogfooding.rs`: shell, cargo, git, nvim, tmux, ssh, `<= 8 KiB` corpus, `<= 4096` actions, `90 s` wall) and a bounded soak suite exists (`crates/bitty-runtime/tests/soak.rs`). A continuous daily-driver session with external capture is documented but not automated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Headless tests versus real-render soak                                                                       | Partial                    | The soak suite covers headless software presentation, a Unix real-PTY pump, winit event paths via owned handlers, and env-gated wgpu (`BITTY_RENDER_GPU_TESTS=1`); the Hyprland `hyprctl` + `grim` capture leg is documented as manual and is not automated (`crates/bitty-runtime/tests/soak.rs`). The remaining gap is long-duration real-render evidence on real sessions, not a missing headless harness.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Native tiling window-form directions

Status: **candidate, non-normative**. These directions extend the accepted
[Workspace Compositor Specification](workspace-compositor.md) without
changing it; its open items and `LayoutProvider` candidate remain
authoritative for layout-algorithm ownership.

- **Dwindle (shipped baseline, extend).** The adaptive H/V split heuristic is
  the working tiling model. Candidate extension: expose split-bias and
  spiral/alternating variants through the `LayoutProvider` contract instead of
  hard-coding a second algorithm in Core.
- **Niri-style ribbon (candidate, post-v1.0).** A horizontally scrollable
  column strip is a different interaction model from a fixed BSP tree: columns
  keep their width, focus scrolls the strip, and new views append. Candidate
  only; it needs a bounded viewport model, focus semantics against
  `FocusDirection`, and a decision on whether it is a `LayoutProvider`
  algorithm or a new workspace mode.
- **Scratchpad and floating (partial).** `Floating`/`Fullscreen`/`Scratchpad`
  are parseable presentation modes; the accepted open item already asks
  whether scratchpad history is a stack or a single hidden slot. Candidate
  ordering: one hidden slot per window first, then a bounded stack.
- **Panel rules (candidate).** Declarative rules that assign placement,
  float/scratchpad behavior, and size hints to a panel identity (for example
  `panel:bitty-terminal.git-panel`). Rules must resolve against stable panel
  identity, stay presentation-only, and never grant capability. Depends on the
  Panel Runtime identity question in
  [UI Extensibility Architecture](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/architecture/ui-extensibility-architecture.md).
- **Semantic workspaces (candidate).** Workspaces that are named or grouped by
  semantic context (project, cwd, task) rather than only an ordinal. This is a
  product direction with no contract today; it would reuse `Workspace`/`View`
  identity and shell-integration `OSC 7` cwd observations, never terminal row
  data.
- **Unified Mod (partial, contract candidate).** The single-owner chrome keymap
  already gives one authoritative binding table with accepted precedence
  (explicit user > workspace > first-party/default > plugin suggestion). A
  unified `Mod` contract would name the modifier layer, its remapping
  surface, and conflict diagnostics across chrome keys, hints, and composer
  chords so the same chord cannot mean different things in two modes.

## Prioritized gaps

1. **Wire the remaining implemented-only semantic interactions (P1
   post-slice).** Fold toggle/expand/collapse, hint jump/focus, and the
   composer overlay exist as bounded libraries; the presentation and
   input-routing integration is the gap. Scrollback search, keyboard copy
   mode, and multi-click selection moved out of this gap at `2a26480` (Core
   chrome/input slices `8ea5f86`, `e154324`, `d89fa19`; see the
   [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)).
   Row anchoring decisions stay with OQ-S1/S2 and the new OQ-050.
2. **Panel content beyond the character grid (P2).** Decide whether
   non-terminal panels get a compositor sub-surface/Scene path and how it
   composes with the existing `SceneNode` model and `ViewContent::Panel`
   before more panel content is built. Tracked as OQ-051.
3. **Native window-form decisions (P2).** Niri ribbon, panel rules, semantic
   workspaces, and the unified `Mod` contract need scope decisions
   (v1 versus post-1.0) and an owner; recorded as OQ-052.
4. **Real-render evidence (P3).** Automate or schedule long-duration
   real-render soak evidence to complement the bounded headless suite; this is
   an evidence-process item, not a contract question.

## Open questions touched

- [OQ-050](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md): stable scrollback-line identity for
  semantic command-block anchors and fold-state persistence (summary; detail
  stays in OQ-S1/S2).
- [OQ-051](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md): panel content beyond the terminal
  character grid (SceneGraph/sub-surface path) and its ownership versus Rich
  Presentation and the Panel Runtime.
- [OQ-052](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md): native window-form scope
  (niri ribbon, panel rules, semantic workspaces, unified `Mod`).
- Existing: OQ-S1 through OQ-S7 in the
  [Semantic Terminal RFC](semantic-terminal-rfc.md), OQ-043/OQ-044/OQ-049 in
  [UI Extensibility Architecture](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/architecture/ui-extensibility-architecture.md).

## References

- [Workspace Compositor Specification](workspace-compositor.md): accepted
  tiling, decoration, and `LayoutProvider` contract.
- [Semantic Terminal RFC](semantic-terminal-rfc.md): P1-P5 implemented-only
  semantic interactions and P6 proposal.
- [Rich Presentation RFC](rich-presentation-rfc.md): `Scene`/`SceneNode`,
  `BlockAnchor`, and semantic-zone contracts.
- [Panel Runtime and Event Bus Pre-Study](panel-runtime-pre-study.md): panel
  lifecycle and bus candidates.
- [UI Extensibility Architecture](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/architecture/ui-extensibility-architecture.md):
  per-View appearance, panel identity, and plugin appearance candidates.
- [Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md):
  accepted OQ-039/OQ-041/OQ-045 contracts cited above.
- [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md):
  accepted OQ-040 animations.
