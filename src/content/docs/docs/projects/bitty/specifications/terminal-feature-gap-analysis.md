---
title: Terminal Feature Gap Analysis
description: Evidence-backed shipped-versus-missing review of basic terminal features against classic terminal emulators with prioritized gaps and registered open questions
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 32
---

# Terminal Feature Gap Analysis

> Status: **draft** (frontmatter `draft`), docs-only, no product code. This
> document records a point-in-time re-verification of basic terminal-emulator
> features in `bitty` against classic terminal emulators, closing the follow-up
> to the earlier CTX-0251 survey at a newer revision. Every `bitty` verdict was
> checked read-only against `bitty` origin `main`
> `b37782090aee560b86084a35eaa7d015e1c98c2b` (2026-09-13). It does not claim
> behavior beyond that revision, changes no accepted contract, and closes no
> open question. It registers new open questions
> [OQ-073 through OQ-078](../../../decisions/open-questions.md) for genuinely
> undecided items only.

## Purpose and scope

The originating directive (carrier messages m0392/m0424) asked which basic
terminal features are still missing in Bitty compared with the classic terminal
emulators kept as read-only research snapshots, for example scroll-follow,
scrollbar and scrollback behavior, image protocols, mouse reporting modes,
selection and clipboard semantics, reflow, search, OSC 8 hyperlinks, cursor
shapes, bracketed paste, focus events, and the bell.

In scope: a prioritized, evidence-backed gap list with per-row `bitty` evidence
and per-row reference citations, a reconciliation against the accepted M1
protocol set, the delta since the CTX-0251 survey, and new open questions for
undecided items. Out of scope: changing the
[Compatibility Milestone RFC](compatibility-milestone-rfc.md), the
[Input and Pointer Contract](input-pointer-rfc.md), the
[Rich Presentation RFC](rich-presentation-rfc.md), or any other accepted
contract; security ranking; product code.

Related material, not duplicated here:

- [Roadmap gap register: modern terminal feature survey](../../../roadmap/now-next-later.md#gap-register-modern-terminal-feature-survey-candidate)
  (CTX-0251, six terminals at `bitty` `3f5ed24`, 2026-09-09) remains the
  cross-vendor rank of record for its snapshot. This document re-checks the
  basic-feature subset at `b377820` and adds per-row reference citations.
- [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) (CTX-0167)
  covers panel chrome, semantic blocks, hints, composer, and window forms. This
  document covers the terminal-emulation surface; where they overlap (hints,
  prompt jump) the row here cites that analysis instead of re-deriving it.
- [Compatibility Milestone RFC](compatibility-milestone-rfc.md) defines which
  protocols are M1 `Required`, `Opt-in enhancement`, `Gated opt-in`, or
  `Out of M1`; the reconciliation section below applies that contract.

## Verification basis

- Source: `bitty` origin `main` at
  `b37782090aee560b86084a35eaa7d015e1c98c2b` (2026-09-13), read-only. The
  shared checkout was not modified.
- Method: symbol, mode, parser-dispatch, keymap-action, config-type, and test
  inspection. Verdicts are `shipped`, `partial`, `implemented-only (unwired)`,
  `missing`, `refused`, or `open-question`. `implemented-only (unwired)` means
  the mechanism exists with tests but no user-reachable path consumes it; it is
  not a shipped behavior. This vocabulary matches the UI and Compositor Gap
  Analysis.
- Live compatibility context: the CTX-0372 TUI sweep (bitty `828a787`,
  `recording/ctx-0372/FINDINGS.md`) passed nvim, htop, btop, fzf, less,
  lazygit, dialog, and git-pager, with nested `tmux` the single failure; that
  failure is fixed by CTX-0375 (`3f18a5c`, primary grid follows the decorated
  content frame, guarded by `crates/bitty-runtime/tests/nested_tmux_present.rs`).
- References: read-only, untrusted snapshots under `recording/references/` as
  recorded in `recording/references/README.md`. They were inspected only; no
  vendor code was executed, imported, or copied into this repository.

| Reference | Snapshot HEAD                              | License                | Used for                                               |
| --------- | ------------------------------------------ | ---------------------- | ------------------------------------------------------ |
| kitty     | `087b8c35c455e1fa21a727916efdaf59ebdd0168` | GPL-3.0                | `docs/` protocol and feature documentation             |
| ghostty   | `8867c37c55b578b9eb4cfaba41cb9023e557176d` | MIT                    | `src/config/Config.zig`, `src/terminal/*`, `src/input` |
| wezterm   | `f93d90350075d3e42566e0557ca36e82ffdcbec1` | MIT                    | `docs/`, `config/src/config.rs`                        |
| alacritty | `ede2ac144da4dec4c075bfa803aacf3b3739bce6` | Apache-2.0 / MIT       | `docs/features.md`, `CHANGELOG.md`, `README.md`        |
| xterm     | `9489b2056ee51fa9dd6a7087483b9b8f85d6a0c4` | MIT/X11 (X Consortium) | `ctlseqs.txt` control-sequence baseline                |

## Prioritized gap list

Priority is a Basic-feature rank: `P0` = M1-required protocol present in the
accepted contract but missing or wrong in `bitty`; `P1` = table-stakes
interactive feature a daily-driver user expects; `P2` = differentiator,
deferred, or explicitly refused. Rank is not security severity and admits no
scope.

### Top 10

1. Synchronized output (DECSET 2026) is missing (P0).
2. OSC 10/11 dynamic foreground/background color set and query are missing (P0).
3. OSC 0/2 window title is parsed but never applied to the OS window (P0).
4. Scrollback search is implemented headlessly but has no user-reachable trigger (P1).
5. Keyboard selection (vi/copy mode) and word/line/block mouse selection gestures are missing (P1).
6. Kitty keyboard protocol support is partial: flag state is tracked, encoding is a subset (P1).
7. OSC 8 hyperlink click-to-open has a gate but no live consumer (P1).
8. Tabs/tab bar and multiple OS windows are missing (P1).
9. Hint/quick-select overlay is implemented-only and unwired (P1).
10. User-visible bell and desktop notifications are missing; BEL is an event only (P1).

### P0 gaps (M1-required protocol deltas)

| Gap                                    | Status  | `bitty` evidence                                                                                                                                                                                                                                                                                                                                          | Reference evidence                                                                                                                                                                                              |
| -------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Synchronized output (DECSET 2026)      | missing | No mode exists in the parser mode table (`crates/bitty-vt/src/parser/dispatch.rs:60-105`) or the `Mode` enum (`crates/bitty-vt/src/action.rs:265-300`); [Compatibility Milestone RFC](compatibility-milestone-rfc.md) line 61 marks it `Required`.                                                                                                        | ghostty `src/terminal/modes.zig:327`; wezterm `docs/escape-sequences.md:355`; alacritty `CHANGELOG.md` (“Synchronized updates now use `CSI 2026`”); kitty `docs/performance.rst:109-110` + `docs/changelog.rst` |
| OSC 10/11 dynamic color set/query      | missing | OSC dispatch handles only `0\|2`, `7`, `8`, `52`, `133` (`crates/bitty-vt/src/parser/dispatch.rs:522-597`); no color action exists in `crates/bitty-vt/src/action.rs`; [Compatibility Milestone RFC](compatibility-milestone-rfc.md) line 63 marks OSC 10/11 query + set `Required`.                                                                      | xterm `ctlseqs.txt:2115-2116`; ghostty `src/terminal/osc.zig:357-358`                                                                                                                                           |
| OSC 0/2 title applied to the OS window | partial | Title is parsed (`crates/bitty-vt/src/parser/dispatch.rs:522`) and turned into `ColdEvent::TitleChanged` (`crates/bitty-runtime/src/runtime/pty.rs:427-428`, `crates/bitty-runtime/src/queue.rs:19`), but the OS window title is theme-derived (`crates/bitty-app/src/terminal_app.rs:25`, applied at `:575`) and no consumer applies the terminal title. | xterm `ctlseqs.txt` OSC 0/2; kitty `docs/basic.rst`; wezterm `docs/escape-sequences.md`                                                                                                                         |

### P1 gaps (table stakes)

| Gap                                      | Status                         | `bitty` evidence                                                                                                                                                                                                                                                                                                                                                                                                                                         | Reference evidence                                                                                                                                                                             |
| ---------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scrollback search UI                     | implemented-only (unwired)     | Bounded search exists at state, UI, and runtime layers (`crates/bitty-term-state/src/search.rs`, `crates/bitty-ui/src/search.rs:1-31`, `crates/bitty-runtime/src/runtime/search.rs:123` and `:233`), with headless integration coverage (`crates/bitty-runtime/tests/scrollback_search_ui_integration.rs`); no `ChromeAction` variant (`crates/bitty-config/src/keymap.rs:588-700`) and no `ctl` command reach it.                                       | kitty `docs/basic.rst:28` (`search_scrollback`) + `docs/integrations.rst:341`; alacritty `docs/features.md` Search section; wezterm `docs/scrollback.md:57`; ghostty `src/terminal/search.zig` |
| Keyboard selection (vi/copy mode)        | missing                        | No copy-mode action in `ChromeAction` (`crates/bitty-config/src/keymap.rs:588-700`); no keyboard-selection module under `crates/bitty-runtime` or `crates/bitty-app`.                                                                                                                                                                                                                                                                                    | alacritty `docs/features.md` Vi Mode; wezterm `docs/copymode.md`; kitty `docs/basic.rst` scrollback/search keys                                                                                |
| Word/line/block mouse selection gestures | partial                        | `SelectionKind` has `Word`, `Line`, `Block` (`crates/bitty-ui/src/selection.rs:87-96`) and `BufferPos` persistence, but the runtime only constructs `SelectionKind::Simple` (`crates/bitty-runtime/src/runtime/selection.rs:81` and `:569`), and the platform `MouseEvent` carries no click count (`crates/bitty-platform/src/event.rs:361-367`).                                                                                                        | alacritty `docs/features.md` Selection expansion; kitty `docs/basic.rst`; wezterm `docs/features.md` xterm-style selection                                                                     |
| Kitty keyboard protocol                  | partial                        | Progressive flags are parsed and stored (`crates/bitty-vt/src/parser/dispatch.rs:82`, `crates/bitty-term-state/src/state.rs:1579-1584`, `crates/bitty-term-state/src/modes.rs:43-44`), query 7727 replies (`crates/bitty-runtime/src/queries.rs:194`), and a bounded `CSI u` subset is encoded (`crates/bitty-runtime/src/runtime/input.rs:117-165`); the platform baseline documents Kitty as deferred (`crates/bitty-platform/src/keyboard.rs:29-31`). | kitty `docs/keyboard-protocol.rst`; ghostty `src/input/kitty.zig`; alacritty `CHANGELOG.md` kitty-keyboard entries                                                                             |
| OSC 8 hyperlink click-to-open live path  | partial (gate exists, unwired) | OSC 8 is parsed (`crates/bitty-vt/src/parser/dispatch.rs:536-556`) and a click mints a single-use `ActivationGesture` (`crates/bitty-runtime/src/runtime/resize.rs:552-565`) with a validated `open_url` gate (`crates/bitty-runtime/src/runtime/plugin.rs:424`), but no live consumer calls it outside tests (`crates/bitty-runtime/tests/scrollbar.rs:445`, `:458`); the `R-005` residual real-window UX remains.                                      | kitty `docs/open_actions.rst`; wezterm `docs/hyperlinks.md`; alacritty `docs/features.md` Opening URLs with the mouse; xterm `ctlseqs.txt` OSC 8                                               |
| Tabs and tab bar                         | missing (workspaces exist)     | Workspace actions ship (`workspace_new`/`_close`/`_focus` in `crates/bitty-config/src/keymap.rs:652-700`), but there is no tab bar or tab view; `bitty-terminal.workspace` is the canonical first-party plugin (`bitty-docs/docs/projects/bitty/product/plugin-roadmap.md:184`).                                                                                                                                                                         | kitty `docs/layouts.rst` + `docs/sessions.rst`; wezterm `docs/multiplexing.md`; alacritty `README.md:104` declines tabs by design                                                              |
| Multiple OS windows                      | missing                        | Single-window slice with explicit multi-window exclusion; `ChromeAction` has no window action (`crates/bitty-config/src/keymap.rs:588-700`); the CTX-0251 register records it as a P0 survey gap (`bitty-docs/docs/roadmap/now-next-later.md:576`).                                                                                                                                                                                                      | kitty `docs/layouts.rst`; wezterm `docs/multiplexing.md` and `docs/features.md` (Multiple Windows); alacritty `docs/features.md` Multi-Window + `msg create-window`                            |
| Hints / quick-select                     | implemented-only (unwired)     | Bounded hint model in `crates/bitty-rich/src/hints.rs` with no overlay integration; recorded as `Implemented-only (unwired)` in the [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md).                                                                                                                                                                                                                                                     | alacritty `docs/features.md` Hints; kitty `docs/kittens/hints.rst`; wezterm `docs/quickselect.md`                                                                                              |
| Bell and desktop notifications           | partial                        | BEL becomes `ColdEvent::Bell` (`crates/bitty-runtime/src/runtime/pty.rs:445`, `crates/bitty-runtime/src/queue.rs:26-27`); the plugin notification queue is bounded (`crates/bitty-runtime/src/plugin_runtime/mod.rs:65-66`); no audible/visual bell and no desktop-notify path exists.                                                                                                                                                                   | ghostty `src/config/Config.zig:3240` (`bell-features`) and `:3811` (`desktop-notifications`); kitty `docs/desktop-notifications.rst`; wezterm `config/src/config.rs:850` (`audible_bell`)      |
| Legacy mouse encodings and mode 1007     | partial / missing              | Parser maps X10, 1000, 1002, 1003, 1005, 1006, 1015 (`crates/bitty-vt/src/parser/dispatch.rs:68-79`) and queries reply (`crates/bitty-runtime/src/queries.rs:181-192`), but runtime emission requires SGR (`crates/bitty-runtime/src/runtime/input.rs:521-523`; wheel `:823-826`), so X10/UTF-8/urxvt-only applications receive nothing; mode 1007 (alternate scroll) is absent from the mode table.                                                     | xterm `ctlseqs.txt:979-982` (1004 focus, 1006 SGR, 1007 alternate scroll), `:2930` (X10); alacritty `extra/man/alacritty-escapes.7.scd`; wezterm `docs/features.md` SGR mouse reporting        |
| OSC 7/133 prompt-jump UX                 | partial (parse shipped)        | OSC 7 sets `cwd_report` (`crates/bitty-term-state/src/state.rs:888`) and OSC 133 zones parse (`crates/bitty-vt/src/parser/dispatch.rs:570`); the jump UX is plugin-owned (`bitty-terminal.shell-integration`, `bitty-docs/docs/projects/bitty/product/plugin-roadmap.md:183`) and not implemented.                                                                                                                                                       | kitty `docs/shell-integration.rst`; wezterm `docs/shell-integration.md`; ghostty `src/terminal/osc` parsers                                                                                    |

### P2 gaps (differentiators, deferrals, refusals)

| Gap                                            | Status                     | `bitty` evidence                                                                                                                                                                                                                                                                         | Reference evidence                                                                                                                           |
| ---------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Session restore on launch                      | missing                    | No save/restore path in the workspace crates; proposed plugin ownership in the draft Core and Plugin Boundaries table, daemon persistence post-v1.0 per ADR 0008; CTX-0251 register row (`bitty-docs/docs/roadmap/now-next-later.md:612`).                                               | kitty `docs/sessions.rst`; wezterm `docs/multiplexing.md` (persistent domains)                                                               |
| BiDi / RTL shaping                             | missing                    | Candidate scope only: [Text and Rendering RFC](text-rendering-rfc.md) BiDi section; no bidi code in `crates/` (no `bidi` matches in terminal, render, or ui crates).                                                                                                                     | wezterm `config/src/terminal.rs:124-128` (`bidi_enabled`/`bidi_direction`)                                                                   |
| Ligatures                                      | missing, no decision       | No `ligature` matches anywhere under `crates/`; the CTX-0251 register records that if Bitty refuses ligatures it should be a recorded Bitty decision rather than inferred from absence (`bitty-docs/docs/roadmap/now-next-later.md:611`).                                                | wezterm `docs/features.md` (Ligatures, font-shaping); ghostty `src/config/Config.zig:243-248`; alacritty makes no ligature claim             |
| Accessibility API (screen reader)              | missing                    | No accessibility tree or platform adapter in `crates/`; CTX-0251 register row (`bitty-docs/docs/roadmap/now-next-later.md:599`) records the missing owning contract.                                                                                                                     | CTX-0251 survey rank only (evidence-limited); no vendor parity claim recorded here                                                           |
| Pointer shapes (OSC 22)                        | missing                    | No pointer-shape parsing in the OSC dispatch table (`crates/bitty-vt/src/parser/dispatch.rs:522-597`) and no cursor-icon platform call.                                                                                                                                                  | kitty `docs/pointer-shapes.rst`                                                                                                              |
| Text sizing protocol                           | missing                    | No text-sizing parsing or render path.                                                                                                                                                                                                                                                   | kitty `docs/text-sizing-protocol.rst`; ghostty `src/terminal/osc/parsers/kitty_text_sizing.zig`                                              |
| File transfer protocol                         | missing                    | No file-transfer protocol handling.                                                                                                                                                                                                                                                      | kitty `docs/file-transfer-protocol.rst`                                                                                                      |
| Command palette user entry                     | implemented-only (unwired) | Palette panel exists over the Panel Runtime (`crates/bitty-runtime/src/palette.rs`) and `bitty-terminal.palette` is bundled-disabled (`bitty-docs/docs/projects/bitty/specifications/default-distribution-rfc.md:200`); no keybinding reaches it.                                        | kitty `docs/kittens/command-palette.rst`; wezterm `docs/features.md` (command palette action); ghostty `src/config/Config.zig` search colors |
| Quake / hotkey window                          | missing                    | No quake/hotkey surface; CTX-0251 register P1 row (`bitty-docs/docs/roadmap/now-next-later.md:590`).                                                                                                                                                                                     | kitty `docs/kittens/quick-access-terminal.rst`                                                                                               |
| Underline style fidelity (curly/dotted/dashed) | partial                    | Styles parse and persist (`crates/bitty-term-state/src/cell.rs:52`; `UnderlineStyle` in `crates/bitty-vt`), but rendering maps `Single`, `Curly`, `Dotted`, and `Dashed` to the same single bottom strip (`crates/bitty-render/src/grid.rs:1717-1722`); `Double` paints two strips.      | kitty `docs/underlines.rst`; wezterm `docs/features.md` (underline and double-underline rendering)                                           |
| Grapheme cluster and width completeness        | partial                    | Combining buffers and canonical v3 carry per-cell combining data (`crates/bitty-term-state/src/cell.rs`, `crates/bitty-term-state/src/canonical.rs`), but width is the compact `char_cell_width` approximation; CTX-0251 register row (`bitty-docs/docs/roadmap/now-next-later.md:594`). | ghostty `src/terminal` grapheme handling + UAX #29 benchmark (`src/benchmark/GraphemeBreak.zig`)                                             |
| iTerm2 inline images; sixel                    | missing; refused           | Sixel is explicitly unsupported in `bitty inspect` (`crates/bitty-app/src/inspect.rs:815-817`); the accepted Rich Presentation RFC keeps Sixel and iTerm2 adapters unimplemented (`bitty-docs/docs/projects/bitty/specifications/rich-presentation-rfc.md:278` and `:339`).              | wezterm `docs/features.md` (iTerm2 image protocol, experimental Sixel)                                                                       |
| Terminal terminfo entry                        | partial (by design today)  | The PTY advertises `TERM=xterm-256color` and `TERM_PROGRAM=bitty` (`crates/bitty-pty/src/builder.rs:50` and `:61`); no installed `bitty` terminfo entry ships yet.                                                                                                                       | kitty ships `kitty/terminfo.py`; xterm `ctlseqs.txt` is the baseline                                                                         |

## Shipped baseline verified at `b377820`

These rows are recorded so absence elsewhere is not read as omission.

| Capability                                      | Status          | `bitty` evidence                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scroll-follow (typed input stays visible)       | shipped         | CTX-0361 `db0f7b5`; `crates/bitty-runtime/src/runtime/present.rs` window-follow logic and `crates/bitty-runtime/tests/scroll_follow.rs`.                                                                                                                                                                                   |
| Scrollbar overlay (auto/always/hidden)          | shipped         | CTX-0362 `b761c03`; defaults `auto`, width `8` logical px, bounds `1..=32` (`crates/bitty-config/src/types.rs:758-782`); `crates/bitty-runtime/tests/scrollbar.rs`.                                                                                                                                                        |
| Scrollback size and wheel speed                 | shipped         | `scrollback` `0..=100000` (`crates/bitty-config/src/types.rs:1137`), `scroll_lines_per_notch` and `scroll_pixels_per_notch` with bounds (`:1141-1146`).                                                                                                                                                                    |
| Resize reflow (primary reflows, alt truncates)  | shipped         | CTX-0266; `crates/bitty-term-state/src/state.rs:337` (`reflow_primary`), `:483`; canonical v4 wrap flags (`crates/bitty-term-state/src/canonical.rs:26-28`, `crates/bitty-term-state/src/lib.rs:42`).                                                                                                                      |
| Kitty graphics present path                     | shipped         | CTX-0247..CTX-0291; `crates/bitty-runtime/src/runtime/kitty_images.rs`, `crates/bitty-runtime/tests/kitty_images_present.rs`; real-GPU upload/blit `fdd9e28`.                                                                                                                                                              |
| Mouse tracking modes 1000/1002/1003 + SGR 1006  | shipped         | Parser `crates/bitty-vt/src/parser/dispatch.rs:68-79`; SGR button/motion encoding `crates/bitty-runtime/src/runtime/input.rs:474-475` and `:521-523`; SGR wheel 64/65 `:823-826`; Shift override documented `:485`.                                                                                                        |
| Selection and clipboard core semantics          | shipped         | Explicit copy/paste chords `ctrl+shift+c`/`ctrl+shift+v` (`crates/bitty-config/src/keymap.rs`), right-click paste and middle-click primary paste (`crates/bitty-runtime/src/runtime/input.rs:661-680`), selection persistence across scrollback (`crates/bitty-runtime/tests/scrollback_search_selection_persistence.rs`). |
| Auto-copy default off (kitty/ghostty parity)    | shipped         | CTX-0371 `ef8a191`; `DEFAULT_SELECTION_AUTO_COPY = false` (`crates/bitty-config/src/types.rs:730-738`, `:1211-1226`); opt-in path `crates/bitty-runtime/src/runtime/input.rs:637-665`.                                                                                                                                     |
| OSC 52 clipboard write gated; read denied       | shipped         | `crates/bitty-rich/src/clipboard.rs:1-8` (write gated opt-in, read out of M1).                                                                                                                                                                                                                                             |
| Suspicious/multi-line paste confirmation        | shipped         | CTX-0369 `8e2f975`; `crates/bitty-runtime/src/paste.rs`, `crates/bitty-runtime/src/runtime/selection.rs:295-318`, `crates/bitty-runtime/tests/suspicious_paste.rs`.                                                                                                                                                        |
| Bracketed paste (2004)                          | shipped         | `crates/bitty-runtime/src/paste.rs:208-215` and `:352-355`; query reply `crates/bitty-runtime/src/queries.rs:190`.                                                                                                                                                                                                         |
| Focus events (1004)                             | shipped         | `FocusEvents` mode (`crates/bitty-term-state/src/modes.rs:41`), query reply (`crates/bitty-runtime/src/queries.rs:183`), `CSI I`/`CSI O` emission on focus change (`crates/bitty-runtime/src/runtime/input.rs:958`).                                                                                                       |
| Cursor shape via DECSCUSR                       | shipped         | `CursorStyle` parsing/state (`crates/bitty-term-state/src/cursor.rs`), block/bar/underline plus blink rendering (`crates/bitty-render/src/grid.rs:479-490`).                                                                                                                                                               |
| IME preedit overlay and commit routing          | shipped         | CTX-0367 `20babf0`; bounds `IME_PREEDIT_MAX_CHARS`/`IME_COMMIT_MAX_CHARS` (`crates/bitty-runtime/src/runtime/input.rs:7-21`), `crates/bitty-runtime/tests/ime_input.rs`.                                                                                                                                                   |
| Per-glyph font fallback                         | shipped         | CTX-0163/CTX-0368 `828a787`; `crates/bitty-render/src/fallback.rs` (coverage-driven fallback plus tofu).                                                                                                                                                                                                                   |
| Per-window font zoom                            | shipped         | CTX-0263 `bc1fbba`; `increase_font_size`/`decrease_font_size`/`reset_font_size` actions (`crates/bitty-config/src/keymap.rs`), `crates/bitty-runtime/tests/font_zoom.rs`.                                                                                                                                                  |
| OSC 7 cwd and OSC 133 zones                     | shipped (parse) | `crates/bitty-vt/src/parser/dispatch.rs:529` (OSC 7) and `:570` (OSC 133); `crates/bitty-term-state/src/state.rs:888`.                                                                                                                                                                                                     |
| Workspace create/close/switch with kill-confirm | shipped         | CTX-0257/CTX-0370; `ChromeAction` workspace ops (`crates/bitty-config/src/keymap.rs:652-700`), `crates/bitty-runtime/tests/close_confirm.rs`.                                                                                                                                                                              |

## M1 protocol reconciliation

The [Compatibility Milestone RFC](compatibility-milestone-rfc.md) M1 matrix
lines 50-70 are the accepted contract. Current status at `b377820`:

| M1 area              | Contract status    | Current status      | Note                                                                                      |
| -------------------- | ------------------ | ------------------- | ----------------------------------------------------------------------------------------- |
| Character encoding   | Required           | shipped             | UTF-8 and invalid-sequence recovery verified by the VT parser evidence.                   |
| Core VT              | Required           | shipped             | ECMA-48/VT100/VT220/xterm subset with bounded parser (R-001 `Verified`).                  |
| Color                | Required           | shipped             | 16/256/truecolor SGR; SGR sub-parameters parsed.                                          |
| Screen modes         | Required           | shipped             | Alternate screen, origin, margins, scroll regions.                                        |
| Bracketed paste      | Required           | shipped             | Mode 2004 plus gated paste delivery.                                                      |
| Mouse                | Required           | partial             | SGR emission shipped; X10 legacy encoding not emitted.                                    |
| Focus events         | Required           | partial             | 1004 shipped; 1007 absent from the mode table (see evidence note below).                  |
| Synchronized updates | Required           | missing             | DECSET 2026 not parsed or implemented.                                                    |
| Cursor shape/style   | Required           | shipped             | DECSCUSR block/bar/underline plus blink.                                                  |
| Window title         | Required           | partial             | OSC 0/2 parsed; OSC 10/11 missing; parsed title not applied to the OS window.             |
| Shell integration    | Opt-in enhancement | partial             | OSC 7/133 parse; jump UX not implemented.                                                 |
| Hyperlinks           | Opt-in enhancement | partial             | OSC 8 parse and activation gate; no live consumer.                                        |
| Clipboard write      | Gated opt-in       | shipped             | OSC 52 write gated; read denied per control.                                              |
| Clipboard read       | Out of M1          | refused (by design) | Denied even when configured (`crates/bitty-rich/src/clipboard.rs`).                       |
| Modern keyboard      | Opt-in enhancement | partial             | Flag state and query tracked; `CSI u` encoding subset only.                               |
| Legacy key encoding  | Required           | shipped             | xterm modifier baseline in `bitty-platform` keyboard table.                               |
| Images               | Out of M1          | shipped (Kitty)     | Kitty graphics present path landed after M1; Sixel refused, iTerm2 adapter unimplemented. |

## Delta since the CTX-0251 survey

The CTX-0251 register captured `bitty` `3f5ed24` (2026-09-09). Movement to
`b377820` is `Implemented` not `Verified` and changes no rank by itself:

- Scroll-follow after output overflow (`db0f7b5`, CTX-0361) and default-auto
  scrollbar overlay (`b761c03`, CTX-0362).
- Selection auto-copy now defaults off for kitty/ghostty parity (`ef8a191`,
  CTX-0371), with honest LF/CR classification and paste confirmation
  (`8e2f975`, CTX-0369).
- IME preedit overlay and commit routing (`20babf0`, CTX-0367); coverage-driven
  glyph fallback plus tofu (`828a787`, CTX-0368).
- Nested-tmux blank-window defect from the CTX-0372 sweep fixed by CTX-0375
  (`3f18a5c`), with `crates/bitty-runtime/tests/nested_tmux_present.rs`.
- Kitty graphics present path completed (`0cc82de` through `fdd9e28`,
  CTX-0247..CTX-0291) and default theme preset catalog (`20cd735`, CTX-0350).
- Close confirmation for views with running jobs (`5597313`, CTX-0370).

## Registered open questions

These are the only new registrations; each is genuinely undecided and has no
existing owner row. Existing coverage is reused instead of re-registered:
session restore (ADR 0008 plus plugin roadmap), tabs/window forms
(Workspace Compositor and OQ-052), synchronized output and OSC 10/11 (already
M1 `Required`), and shell-integration jump UX (plugin roadmap).

| ID     | Question                                                                                                                                                                                                                               | Canonical document                                                             | Next artifact                                                    | State |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ----- |
| OQ-073 | Are ligatures adopted in Bitty, and if adopted through which shaping path (font feature tags, fallback interaction, bounds), or recorded as an explicit refusal like the Sixel decision?                                               | This document; [Text and Rendering RFC](text-rendering-rfc.md)                 | Acceptance decision (ADR, RFC revision, or specification update) | Open  |
| OQ-074 | What is the scrollback search UX contract (Core overlay versus plugin-owned surface, keybinding namespace, case/regex scope, interaction with selection persistence), given the bounded headless search that already exists?           | This document; [Semantic Terminal RFC](semantic-terminal-rfc.md)               | Acceptance decision (ADR, RFC revision, or specification update) | Open  |
| OQ-075 | What is the keyboard-selection (vi/copy mode) contract: ownership, keymap namespace, word/line/block semantics over the existing `Selection` model, clipboard interaction, and mouse-mode precedence?                                  | This document; [Input and Pointer Contract](input-pointer-rfc.md)              | Acceptance decision (ADR, RFC revision, or specification update) | Open  |
| OQ-076 | What is the user-visible bell and desktop-notification policy (audible/visual bell, OSC 777 or Kitty notification protocol support, capability gating, and rate limits under RC-8), and how does it compose with plugin notifications? | This document; [Isolation Resource RFC](isolation-resource-rfc.md)             | Acceptance decision (ADR, RFC revision, or specification update) | Open  |
| OQ-077 | Which remaining Kitty-family protocol extensions enter scope (pointer shapes OSC 22, text sizing, file transfer), and are the others deferred or refused with bounds?                                                                  | This document; [Rich Presentation RFC](rich-presentation-rfc.md)               | Acceptance decision (ADR, RFC revision, or specification update) | Open  |
| OQ-078 | What is the accessibility contract (API/tree choice, ownership relative to the panel Scene model and platform adapters, and v1 versus post-v1.0 scope)?                                                                                | This document; [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) | Acceptance decision (ADR, RFC revision, or specification update) | Open  |

## Evidence limits and non-claims

- **Mode 1007 row in the M1 RFC.** [Compatibility Milestone RFC](compatibility-milestone-rfc.md)
  line 60 groups `1004` and `1007` as focus events. xterm defines `1004` as
  focus reporting and `1007` as alternate scroll (`xterm/ctlseqs.txt:979-982`).
  Bitty parses neither meaning for `1007`. This document records the factual
  state without editing the accepted RFC; a scoped docs-sync task should
  reconcile the RFC row and add the alternate-scroll behavior to the input
  contract.
- **Vendor parity claims are file-cited, not exhaustive.** A vendor is cited
  only for evidence actually located in the snapshot revision; absence of a
  citation is not a claim about that vendor.
- **Alacritty ligatures.** No ligature support claim is made for the snapshot;
  no matching text was found in its documentation at `ede2ac1`.
- **Kitty graphics “verified working”** means the bounded present-path tests and
  the CTX-0247..CTX-0291 evidence chain at `b377820`; it is not a `Verified`
  lifecycle claim for the Rich Presentation RFC.
- **Reference snapshots are untrusted.** They are read-only research inputs;
  no code was executed and no text was copied into this repository.
- **CTX-0251 remains the cross-vendor rank source.** This document re-verifies
  `bitty` status and adds citations; it does not re-run the six-vendor survey.

## Maintenance

Re-verify this page whenever a `bitty` revision changes a row verdict, and
close OQ-073 through OQ-078 only through their accepted decision artifact with
the register and affected canonical documents updated in the same change. The
next natural checkpoint is the M3 usable-terminal wave named in the
[roadmap](../../../roadmap/now-next-later.md#candidate-horizon-mapping-hints-not-commitments).
