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
> (2026-09-13). It does not claim behavior beyond that revision, does not
> change any accepted contract, and does not close an open question. It
> registers the new open questions [OQ-050 through OQ-052](../decisions/open-questions.md)
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
- Method: symbol and line inspection of the render/runtime/config/layout and
  rich crates; verdicts are `shipped`, `implemented-only (unwired)`,
  `partial`, or `missing`.
- `implemented-only (unwired)` means the mechanism exists in a library with
  tests but is not consumed by the presentation path; it is not a shipped UI
  behavior.

## Claim status matrix

| Claim from the analysis                                                                                      | Verdict                    | Verified status at `b761c03`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel borders and active/inactive focus indication are missing                                               | Shipped (claim outdated)   | Core-owned decoration (CTX-0292, CTX-0333) draws a `View` frame with `border` (default `2` logical px), `radius` (default `6`), `gaps_in`/`gaps_out` (default `6`), and `content_inset` (default `6`) from `DecorationConfig`; the focused/idle outline pair (CTX-0340, OQ-039) and focused/idle outline widths (CTX-0344, OQ-045) resolve at present time. Evidence: `crates/bitty-config/src/types.rs` (`DecorationConfig`), `crates/bitty-ui/src/decoration.rs`, `crates/bitty-runtime/src/runtime/present.rs` (outline width/color application), `crates/bitty-app/src/config_cli.rs` (resolution into `RuntimeConfig`).                                           |
| Gaps are character cells, not pixels                                                                         | Partial (both models)      | Two coordinated surfaces exist: `layout.gaps_in`/`gaps_out` are integer **cells** with default `0` (`crates/bitty-config/src/types.rs`), and Core-owned `decoration.gaps_in`/`gaps_out` are logical **pixels** with default `6` (CTX-0333). The accepted model is `effective gap = decoration.gap * DPI_scale + layout.gap_cells * cell_axis`, so the default sibling/container gaps are the `6` logical px decoration defaults. Evidence: `crates/bitty-config/src/types.rs` (`LayoutConfig`, `DecorationConfig` docs), `crates/bitty-ui/src/decoration.rs`.                                                                                                          |
| `window.radius_px` is parsed but a no-op                                                                     | Accurate (by design)       | `window.radius_px` (physical px, `0..=24`, default `0`, CTX-0241 S0) is parsed, validated, layered, and stored on `RuntimeConfig`; the code documents it as a parsed no-op with zero render effect by design. The painted corner radius is the Core-owned `decoration.radius` (logical px, default `6`), applied to `View` frames through the rounded frame clip. Evidence: `crates/bitty-config/src/types.rs`, `crates/bitty-app/src/config_cli.rs` (S0 no-op comment), `crates/bitty-runtime/src/runtime/present.rs` (`rounded_frame_clip`, `frame.radius`).                                                                                                         |
| OSC 133 command folding needs stable row anchors                                                             | Implemented-only (unwired) | OSC 133 A/B/C/D markers are parsed into bounded semantic zones (`crates/bitty-vt/src/action.rs`, `crates/bitty-vt/src/parser/dispatch.rs`) with a `1024`-record zone log carrying `ordinal`, `kind`, and `exit_code` (`crates/bitty-term-state/src/state.rs`). `CommandBlock` and `FoldState` (CTX-0225, P1/P2 of the [Semantic Terminal RFC](semantic-terminal-rfc.md)) anchor by OSC 133 **ordinal**, explicitly without row numbers, and survive resize/reflow/scroll by design; fold state is a presentation projection, not terminal truth. Not consumed by the render path; row anchoring stays future work and is tracked as OQ-S1/S2.                          |
| A flash.nvim-style keyboard jump overlay                                                                     | Implemented-only (unwired) | `crates/bitty-rich/src/hints.rs` implements a bounded hint model (`HINT_TARGET_MAX = 256`, `HINT_LABEL_MAX_CHARS = 8`, `HintAnchor`, `HintAction::JUMP/FOCUS`, alphabetic labels, operator keys) as route step P3 (CTX-0225). It has no overlay/presentation integration; cross-panel hinting is proposal-only P6 in the [Semantic Terminal RFC](semantic-terminal-rfc.md).                                                                                                                                                                                                                                                                                            |
| Multi-line prompt plus `$EDITOR` composer                                                                    | Implemented-only (unwired) | `crates/bitty-rich/src/composer.rs` implements the command buffer (`64 KiB` cap, paste framing, newline handling) and the external-editor round trip (`EDITOR_TIMEOUT_DEFAULT = 120 s`, max `300 s`, `bitty-composer-` temp prefix) as P4/P5 (CTX-0225). The chrome action `open_composer` is keymap-parseable and its chord (`alt+e`) is consumed, but the handler only logs the request; overlay/panel presentation and input routing remain follow-ups (`crates/bitty-app/src/chrome_keys.rs`, `crates/bitty-config/src/keymap.rs`).                                                                                                                                |
| Panel is not Terminal: non-terminal panels degrade to a character grid                                       | Gap confirmed              | Typed panel content exists (`ViewContent::Panel(PanelId)`/`Browser(BrowserSurfaceId)` in `crates/bitty-ui/src/panel.rs`) with per-panel registries in `crates/bitty-runtime` (for example `ai_panel.rs`, `browser_panel.rs`, `file_manager.rs`, `git_panel.rs`, `mail_panel.rs`, `palette.rs`). The rich model (`SceneNode`, spans, tables, borders, block anchors in `crates/bitty-rich/src/scene.rs`) is bounded (`64` blocks, `2048` nodes per block, depth `32`, `2 MiB` per terminal) but is not consumed by the render pipeline at `b761c03`; panel presentation still rides the per-leaf grid snapshot path. This is the Core Scene/compositor integration gap. |
| Native tiling window forms (dwindle, niri ribbon, scratchpad, panel rules, semantic workspaces, unified Mod) | Partial                    | Shipped: Hyprland dwindle-style adaptive split axis (`crates/bitty-ui/src/layout.rs`, `split_width_multiplier` heuristic), floating overlay tiers with z-index (`Float` default, overlays clipped to the container), deterministic focus traversal, and a single-owner chrome keymap with a vim preset using `Alt` as the working modifier. Parseable but transition-gated: `Floating`/`Fullscreen`/`Scratchpad` in `PresentationMode`. Not found: niri-style scrollable ribbon, declarative panel rules (panelrule), semantic workspaces, an explicit unified `Mod` abstraction contract.                                                                             |
| Process overhead versus dogfooding                                                                           | Partial                    | The app is single-process `winit` (`crates/bitty-runtime/src/ai_panel.rs` and peers) with per-leaf shell/PTY spawning; bounded headless dogfooding smokes exist (`crates/bitty-runtime/tests/dogfooding.rs`: shell, cargo, git, nvim, tmux, ssh, `<= 8 KiB` corpus, `<= 4096` actions, `90 s` wall) and a bounded soak suite exists (`crates/bitty-runtime/tests/soak.rs`). A continuous daily-driver session with external capture is documented but not automated.                                                                                                                                                                                                   |
| Headless tests versus real-render soak                                                                       | Partial                    | The soak suite covers headless software presentation, a Unix real-PTY pump, winit event paths via owned handlers, and env-gated wgpu (`BITTY_RENDER_GPU_TESTS=1`); the Hyprland `hyprctl` + `grim` capture leg is documented as manual and is not automated (`crates/bitty-runtime/tests/soak.rs`). The remaining gap is long-duration real-render evidence on real sessions, not a missing headless harness.                                                                                                                                                                                                                                                          |

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
  [UI Extensibility Architecture](ui-extensibility-architecture.md).
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

1. **Wire the implemented-only semantic interactions (P1 post-slice).** Fold
   toggle/expand/collapse, hint jump/focus, and the composer overlay exist as
   bounded libraries; the presentation and input-routing integration is the
   gap. Row anchoring decisions stay with OQ-S1/S2 and the new OQ-050.
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

- [OQ-050](../decisions/open-questions.md): stable scrollback-line identity for
  semantic command-block anchors and fold-state persistence (summary; detail
  stays in OQ-S1/S2).
- [OQ-051](../decisions/open-questions.md): panel content beyond the terminal
  character grid (SceneGraph/sub-surface path) and its ownership versus Rich
  Presentation and the Panel Runtime.
- [OQ-052](../decisions/open-questions.md): native window-form scope
  (niri ribbon, panel rules, semantic workspaces, unified `Mod`).
- Existing: OQ-S1 through OQ-S7 in the
  [Semantic Terminal RFC](semantic-terminal-rfc.md), OQ-043/OQ-044/OQ-049 in
  [UI Extensibility Architecture](ui-extensibility-architecture.md).

## References

- [Workspace Compositor Specification](workspace-compositor.md): accepted
  tiling, decoration, and `LayoutProvider` contract.
- [Semantic Terminal RFC](semantic-terminal-rfc.md): P1-P5 implemented-only
  semantic interactions and P6 proposal.
- [Rich Presentation RFC](rich-presentation-rfc.md): `Scene`/`SceneNode`,
  `BlockAnchor`, and semantic-zone contracts.
- [Panel Runtime and Event Bus Pre-Study](panel-runtime-pre-study.md): panel
  lifecycle and bus candidates.
- [UI Extensibility Architecture](ui-extensibility-architecture.md):
  per-View appearance, panel identity, and plugin appearance candidates.
- [Appearance Configuration RFC](../decisions/rfcs/RFC-0001-appearance-configuration.md):
  accepted OQ-039/OQ-041/OQ-045 contracts cited above.
- [Panel Animations and Effects RFC](../decisions/rfcs/RFC-0002-panel-animations.md):
  accepted OQ-040 animations.
