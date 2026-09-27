---
title: Terminal compatibility matrix
description: M1/M2 terminal compatibility matrix with per-scenario evidence status, verification method, last-verified revision, and explicit coverage gaps
category: reference
audience: maintainer
document_type: reference
status: draft
website_publish: false
sidebar_order: 20
---

# Terminal compatibility matrix

## Status and provenance

- Status: **draft**. This is the maintained M1/M2 terminal compatibility
  matrix. It is evidence, not a compatibility guarantee for any release.
- Ownership: `bitty-terminal-docs` **CTX-0003** renders the matrix; the
  `bitty` repository **CTX-0404**
  ([build the M1/M2 terminal compatibility matrix](https://github.com/bitty-terminal/bitty))
  owns the machine-readable report, the corpora, and the env-gated local
  probes.
- Evidence revision: `4135803` (CTX-0404 head in `bitty`; base `706fa25`).
  Every run records its revision in the report (`BITTY_COMPAT_REVISION`); local
  rows list the revision observed in the recorded run under
  `recording/compat-local/` in the `bitty` checkout.
- Authority:
  [`compatibility-milestone-rfc.md`](../specifications/compatibility-milestone-rfc.md)
  defines the M1 protocol set. This matrix is evidence for that set and for the
  later M2→M7 hardening work; it does not change scope, accept a milestone, or
  weaken the security corpus.
- Machine-readable source of truth: `compat_report` emits `schema_version: 1`
  JSON with `areas`, `rows` (status, method, evidence), an environment probe,
  and a status summary. The table below mirrors that output.
- Honesty rule: `ci` means the check runs in `cargo test` / `just check`;
  `local` means it was verified on a developer machine at the recorded revision
  and CI does not run it. This page never claims CI coverage that does not
  exist.

## How to read the matrix

| Status    | Meaning                                                                                         | Where it runs                                 |
| --------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `ci`      | Deterministic corpus replay or named test; `compat_report` re-verifies the evidence at build.   | `just check` / `cargo test` (every CI run)    |
| `local`   | Env-gated PTY probe against an installed tool; capture replayed through the compat-lab harness. | Developer machine only, `BITTY_COMPAT_LIVE=1` |
| `partial` | Bounded parse/admission evidence exists; the full behavior is not implemented.                  | `just check` for the bounded part             |
| `gap`     | Not covered; the reason is recorded in the row.                                                 | Nothing yet; follow-up candidate              |

Areas are ordered by the CTX-0404 scope: the areas that block M2→M7 hardening
(shell, tmux, nvim, ssh, general TUI) come first, followed by Unicode/CJK/IME,
mouse, clipboard, graphics, resize/reflow, scrollback, and alternate screen.

### Coverage summary

| Status    | Rows |
| --------- | ---- |
| `ci`      | 27   |
| `local`   | 7    |
| `partial` | 1    |
| `gap`     | 6    |
| **total** | 41   |

## Matrix

Paths are relative to the `bitty` repository root. `live_compat::<scenario>`
names the env-gated scenario in
`crates/bitty-compat-lab/tests/live_compat.rs`.

| Area                 | Scenario                                                                | Status    | Last verified                        | Method and evidence                                                                                                        |
| -------------------- | ----------------------------------------------------------------------- | --------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| shell startup/exit   | zsh/fish prompt marks OSC 133 A/B/C with OSC 7 cwd and OSC 8 hyperlink  | `ci`      | `4135803`+, every run                | corpus `tests/compat/shell/corpus/02-dogfooding-shell-osc133-osc7-fish.bin`                                                |
| shell startup/exit   | command exit status OSC 133 D including non-zero and signal-style codes | `ci`      | `4135803`+, every run                | corpus `tests/compat/shell/corpus/04-shell-startup-exit.bin`                                                               |
| shell startup/exit   | interactive shell startup, echo, and clean exit over a real PTY         | `local`   | `4135803`+, 2026-09-14, bash         | `live_compat::shell` (`bash --noprofile --norc -i`, exit status 7)                                                         |
| shell startup/exit   | automatic shell-integration installation for bash/zsh/fish              | `gap`     | not verified                         | no shell-integration installer exists yet; needs an owning task                                                            |
| tmux rendering       | pane borders (U+2502), status bar SGR, and scroll regions               | `ci`      | `4135803`+, every run                | corpus `tests/compat/tui/corpus/03-dogfooding-nvim-tmux-fzf-htop-ssh.bin`                                                  |
| tmux rendering       | real tmux session render capture over a PTY                             | `local`   | `4135803`+, 2026-09-14, tmux 3.7c    | `live_compat::tmux` (private `-L` socket; server killed by the probe)                                                      |
| tmux rendering       | tmux DCS passthrough (ESC Ptmux;)                                       | `gap`     | not verified                         | DCS strings are recorded as unknown/inert; no tmux passthrough unwrap                                                      |
| nvim rendering/input | alternate-screen fullscreen, scroll region, and statusline              | `ci`      | `4135803`+, every run                | corpus `tests/compat/tui/corpus/03-dogfooding-nvim-tmux-fzf-htop-ssh.bin`                                                  |
| nvim rendering/input | truecolor and curly underline SGR (SGR 4:3) for diagnostics UI          | `ci`      | `4135803`+, every run                | corpus `tests/compat/vt/corpus/02-sgr-underline.bin`                                                                       |
| nvim rendering/input | kitty keyboard protocol (CSI u, 7727 progressive) and bracketed paste   | `ci`      | `4135803`+, every run                | corpus `tests/compat/keyboard/corpus/03-dogfooding-kitty-keyboard-bracketed.bin`                                           |
| nvim rendering/input | real nvim session render capture over a PTY                             | `local`   | `4135803`+, 2026-09-14, nvim 0.12.5  | `live_compat::nvim` (`nvim --clean`, typed text + `:qa!`)                                                                  |
| SSH                  | remote session title (OSC 0) and echo over a synthetic stream           | `ci`      | `4135803`+, every run                | corpus `tests/compat/tui/corpus/03-dogfooding-nvim-tmux-fzf-htop-ssh.bin`                                                  |
| SSH                  | real ssh transport to a remote host                                     | `gap`     | not verified                         | requires a remote endpoint; tests do not dial out                                                                          |
| general TUI          | htop/fzf alternate-screen list with 32m color bars                      | `ci`      | `4135803`+, every run                | corpus `tests/compat/tui/corpus/02-htop-fzf.bin`                                                                           |
| general TUI          | real fzf render capture over a PTY                                      | `local`   | `4135803`+, 2026-09-14, fzf          | `live_compat::fzf` (piped candidates, ESC to quit)                                                                         |
| general TUI          | real htop render capture over a PTY                                     | `local`   | `4135803`+, 2026-09-14, htop         | `live_compat::htop` (`q` to quit)                                                                                          |
| Unicode/CJK/IME      | wide CJK, emoji ZWJ, combining marks, and zero-width width invariants   | `ci`      | `4135803`+, every run                | corpus `tests/compat/unicode/corpus/09-dogfooding-ime-unicode-dpi.bin`                                                     |
| Unicode/CJK/IME      | ambiguous-width policy (single-width primary table)                     | `ci`      | `4135803`+, every run                | corpus `tests/compat/unicode/corpus/05-ambiguous.bin`                                                                      |
| Unicode/CJK/IME      | invalid UTF-8 replacement (U+FFFD) stays bounded                        | `ci`      | `4135803`+, every run                | corpus `tests/compat/unicode/corpus/07-invalid-utf8.bin`                                                                   |
| Unicode/CJK/IME      | real IME composition events on a live input method                      | `gap`     | not verified                         | requires a live input method; the lab replays bytes and cannot drive an IME                                                |
| mouse protocols      | SGR 1006 with normal/button/any-motion tracking modes                   | `ci`      | `4135803`+, every run                | corpus `tests/compat/mouse/corpus/03-dogfooding-mouse-resize-sgr.bin`                                                      |
| mouse protocols      | legacy encodings: UTF-8 1005 and urxvt 1015                             | `ci`      | `4135803`+, every run                | corpus `tests/compat/mouse/corpus/04-legacy-coordinate-encodings.bin`                                                      |
| mouse protocols      | interactive mouse click/drag/scroll in tmux and nvim                    | `gap`     | not verified                         | scripted live-app mouse interaction is not automated; manual smoke only                                                    |
| clipboard            | OSC 52 query vs write with base64 payload, bounded                      | `ci`      | `4135803`+, every run                | corpus `tests/compat/osc/corpus/03-dogfooding-osc7-8-52-title.bin`                                                         |
| clipboard            | kitty clipboard extension (OSC 5522)                                    | `partial` | `4135803`+, every run                | corpus `tests/compat/osc/corpus/04-kitty-clipboard-5522.bin` (bounded inert unknown OSC; extension not implemented)        |
| clipboard            | system clipboard sync policy (headless simulation)                      | `ci`      | `4135803`+, every run                | `crates/bitty-platform/tests/clipboard_sync.rs::headless_set_syncs_clipboard_and_primary`                                  |
| clipboard            | OS-level clipboard roundtrip on a live display                          | `gap`     | not verified                         | needs a live display/clipboard backend; `R-004` remains Open                                                               |
| graphics protocols   | kitty graphics single-chunk APC G admission (f=32 2x2 RGBA)             | `ci`      | `4135803`+, every run                | corpus `tests/compat/graphics/corpus/01-kitty-image-single.bin`                                                            |
| graphics protocols   | kitty graphics chunked reassembly (m=1/m=0, chafa shape)                | `ci`      | `4135803`+, every run                | corpus `tests/compat/graphics/corpus/02-kitty-image-chunked.bin`                                                           |
| graphics protocols   | runtime image placement and paint (headless)                            | `ci`      | `4135803`+, every run                | `crates/bitty-runtime/tests/kitty_images_present.rs::display_paints_image_pixels_topmost`                                  |
| graphics protocols   | real chafa --format=kitty capture over a PTY                            | `local`   | `4135803`+, 2026-09-14, chafa 1.18.2 | `live_compat::chafa` (generated 2x2 PNG; capture must emit a `KittyGraphics` action)                                       |
| resize/reflow        | reflow with scroll region and erase on width change                     | `ci`      | `4135803`+, every run                | corpus `tests/compat/resize/corpus/01-resize-reflow.bin`                                                                   |
| resize/reflow        | resize during alternate screen (800x600 -> 100x37 @8x16)                | `ci`      | `4135803`+, every run                | corpus `tests/compat/resize/corpus/02-dogfooding-resize-dpi-alt-screen.bin`                                                |
| resize/reflow        | SIGWINCH-driven resize over a real PTY                                  | `local`   | `4135803`+, 2026-09-14, bash         | `live_compat::resize` (80x24 -> 120x40, `stty size` assertion)                                                             |
| scrollback           | scrollback retention and viewport under 30 lines + CSI 3S               | `ci`      | `4135803`+, every run                | corpus `tests/compat/scrollback/corpus/01-scrollback-basic.bin`                                                            |
| scrollback           | alternate-screen isolation of primary scrollback (1049h/1049l)          | `ci`      | `4135803`+, every run                | corpus `tests/compat/scrollback/corpus/02-scrollback-alt-screen.bin`                                                       |
| scrollback           | runtime scrollback cap and resize retention                             | `ci`      | `4135803`+, every run                | `crates/bitty-runtime/tests/scrollback_cap.rs::configured_scrollback_cap_bounds_retained_lines`                            |
| scrollback           | scrollback search and scrollbar interaction                             | `ci`      | `4135803`+, every run                | `crates/bitty-runtime/tests/scrollback_search_selection_persistence.rs::search_finds_in_scrollback_and_live_grid_headless` |
| alternate screen     | 1049 enter/exit with cursor save and no orphan spacer                   | `ci`      | `4135803`+, every run                | corpus `tests/compat/tui/corpus/01-nvim-tmux.bin`                                                                          |
| alternate screen     | legacy 47 alternate-screen enter/exit                                   | `ci`      | `4135803`+, every run                | corpus `tests/compat/tui/corpus/02-htop-fzf.bin`                                                                           |
| alternate screen     | alternate screen with mouse/keyboard mode interaction                   | `ci`      | `4135803`+, every run                | corpus `tests/compat/mouse/corpus/03-dogfooding-mouse-resize-sgr.bin`                                                      |

## How to run

All commands run in the `bitty` repository. The deterministic leg is part of
the normal gate (`just check` runs `cargo test --workspace --all-targets`); the
focused commands below reproduce individual pieces.

### Deterministic (CI) evidence

```sh
# Full gate, including compat-lab corpora, matrix, and report tests.
just check

# Machine-readable matrix report (schema_version 1 JSON on stdout or --out).
BITTY_COMPAT_REVISION="$(git rev-parse --short HEAD)" \
  cargo run -p bitty-compat-lab --bin compat_report --locked -- \
  --out recording/compat-report.json

# Focused compat-lab suites.
cargo test -p bitty-compat-lab --locked            # harness, compat_matrix, compare, dogfooding, report
cargo run  -p bitty-compat-lab --bin collect_dumps --locked
cargo test -p bitty-compat-lab --test compare --locked -- --nocapture
```

`collect_dumps` replays every `tests/compat/*/corpus/*.bin` headlessly and
writes bounded snapshots under the evidence-area per-category dump directory. `compare`
re-checks them self-consistently and diffs the four reference backends
(`ghostty`, `kitty`, `wezterm`, `alacritty`) when per-corpus dumps exist; when
they do not, the reference column is a graceful `SKIP`, not a pass.

### Local (env-gated) evidence

These probes need the corresponding tool installed and are **not** run by CI.
Absent tools are recorded as `"status": "skipped"`; they are never reported as
verified.

```sh
# Convenience runner: report + live probes into recording/compat-local/.
scripts/compat-local.sh

# Or run the env-gated scenarios directly.
BITTY_COMPAT_LIVE=1 cargo test -p bitty-compat-lab --test live_compat --locked -- \
  --nocapture --test-threads=1
```

| Scenario | Tool         | Assertion                                                     |
| -------- | ------------ | ------------------------------------------------------------- |
| `shell`  | `bash`       | startup, echo of a marker, and exit status propagation        |
| `tmux`   | `tmux`       | attach/detach render capture on a private socket              |
| `nvim`   | `nvim`       | `--clean` render capture with typed text and `:qa!`           |
| `fzf`    | `sh` + `fzf` | full-screen candidate list render                             |
| `htop`   | `htop`       | process-table render                                          |
| `chafa`  | `chafa`      | `--format kitty` capture must emit an `APC G` graphics action |
| `resize` | `bash`       | PTY resize observed through `stty size`                       |

The recorded run on 2026-09-14 verified all seven scenarios locally with
`tmux 3.7c`, `nvim 0.12.5`, `chafa 1.18.2`, `fzf`, `htop`, `bash`, and
`OpenSSH 10.5p1` present. The raw JSON report and the live log live under
`recording/compat-local/` in the `bitty` checkout (gitignored scratch, not a
committed artifact).

## What is not covered

- **No CI job installs or runs real applications.** The `ci` rows replay
  checked-in corpora; the `local` rows ran only on the authoring machine at the
  revision above. CI must not be described as verifying tmux, nvim, ssh, chafa,
  or an IME.
- **Real SSH transport.** No test dials a remote host. The SSH rows cover
  synthetic remote-title bytes and a `gap` for a real session.
- **Real IME composition.** The lab replays bytes; it cannot drive a live input
  method. Precomposed wide/CJK width behavior is covered, composition is not.
- **Interactive app mouse.** Click/drag/scroll inside tmux or nvim is not
  scripted; only mouse mode negotiation and SGR reports are covered.
- **Protocol extensions with no implementation.** tmux DCS passthrough and the
  kitty clipboard extension (OSC 5522) are `gap`/`partial`; OSC 5522 parses as
  a bounded inert unknown OSC only.
- **OS clipboard backends.** Only the headless policy simulation runs; `R-004`
  remains Open in the
  [clipboard audit](../security/audits/clipboard-2026-09.md).
- **Reference differential columns.** Ghostty/kitty/WezTerm/Alacritty dumps are
  not pinned in CI, so the 14-surface
  [release compatibility matrix](../product/compat-matrix.md) records
  `SKIP/SKIP/SKIP/SKIP` for reference columns. Snapshot-to-snapshot
  self-consistency is gated; reference equality is not.
- **Pixel/GPU rendering.** The compat-lab is headless
  (`Parser -> TerminalAction -> State`); painting and pixel output are verified
  separately by `bitty-render` and are not part of this matrix.
- **Cross-platform local rows.** The local probes were run on Linux; the
  deterministic rows compile and run cross-platform in CI.

## Gaps and follow-ups

Each gap is recorded as a matrix row; the follow-ups below are candidates and
are not created tasks until an owner accepts them.

| Gap                                         | Proposed follow-up                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| shell-integration installer (bash/zsh/fish) | new task: install prompt-mark/OSC 7 integration and verify marks end to end       |
| tmux DCS passthrough (ESC Ptmux;)           | new task: unwrap tmux passthrough under a bounded policy                          |
| kitty clipboard extension (OSC 5522)        | new task: implement the extension or document a permanent non-goal                |
| real ssh session evidence                   | new task or manual-smoke runbook entry with a pinned remote fixture               |
| real IME composition                        | new task: platform input-layer harness outside the byte-replay lab                |
| interactive app mouse                       | new task: scripted tmux/nvim mouse interaction or a manual-smoke checklist entry  |
| OS clipboard backends (`R-004` Open)        | owned by the clipboard audit; this matrix records only the headless policy result |

No production defect was found while building this matrix; the gaps above are
unimplemented scope, not regressions.

## Related documents

- [Compatibility lab](../product/compat-lab.md) — harness, corpora layout, and
  differential method.
- [Compatibility matrix for release](../product/compat-matrix.md) — the
  14-surface release instance and its machine-readable snapshot.
- [Manual smoke](../product/manual-smoke.md) — the human checklist for
  surfaces that cannot be automated.
- [`compatibility-milestone-rfc.md`](../specifications/compatibility-milestone-rfc.md)
  — the M1 protocol set this matrix provides evidence for.

## Revision history

- `2026-09-14` CTX-0003 / `bitty` CTX-0404 — first maintained M1/M2 matrix:
  41 rows (27 `ci`, 7 `local`, 1 `partial`, 6 `gap`), machine-readable report,
  env-gated live probes, and the honest coverage/gap list above.
