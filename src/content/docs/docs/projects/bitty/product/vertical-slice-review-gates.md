---
title: Vertical Slice Review Gates (A1-A9)
description: Revision-locked evidence status for the single-window vertical-slice acceptance criteria A1-A9 and its five review gates, marking each item Evidenced or Open without claiming acceptance
category: product
audience: maintainer
document_type: register
status: draft
website_publish: false
sidebar_order: 24
---

# Vertical Slice Review Gates (A1-A9)

This register records the evidence status of the acceptance criteria A1-A9 and
the five review gates defined by the
[Single-Window Vertical Slice Acceptance Plan](vertical-slice-acceptance.md).
It is a working evidence record, not an acceptance verdict: the plan remains a
**Draft** specification with **Experimental Implementation** evidence, and this
page does not authorize product code or advance the plan's lifecycle.

## Purpose and scope

The acceptance plan lists nine candidate acceptance criteria (A1-A9) and five
review gates that must pass before the slice authorizes a new implementation
task. This page records, for each item, whether a revision-locked artifact
exists and whether the independent review required by the plan has happened.

Nothing here closes an open question, changes a performance budget, weakens a
security control, or promotes a draft predecessor. The plan's own status note
and the [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md)
remain authoritative for lifecycle and residual risk.

## Verdict semantics

| Verdict     | Meaning                                                                                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Evidenced` | A revision-locked artifact in this corpus or in the `bitty` implementation repository directly demonstrates the item at the cited revision. This is implementation or test evidence, **not** an acceptance verdict.                                      |
| `Open`      | No located revision-locked artifact demonstrates the item, or the independent review, visible evidence, or per-platform evidence required by the plan has not happened. The owner path is named so the remaining work can be dispatched as scoped tasks. |

`Evidenced` never means `Accepted` or `Verified`. The plan's lifecycle is
`Draft -> Experimental Implementation -> Accepted -> Verified`; only an
independent review recorded as an approval on the implementing pull request
advances it past the current `Experimental Implementation` stage. Every A1-A9
row below therefore remains subject to the review gates in the next section.

## Review gates

The plan requires five gates before product code is authorized. No independent
architecture, security, performance, or docs-curator review of this slice
exists in the corpus, so those four gates are `Open`. This record supplies the
navigation and status synchronization that the docs-curator gate needs, but it
is authored by the implementation task and cannot substitute for an
independent docs-curator verdict.

| Gate                   | Requirement                                                                                                                                                                                                     | Verdict     | Evidence and reason                                                                                                                                                                                                                                                                                                                 | Owner path if open                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1. Architecture review | Slice scope, single-window ownership, dependency diagram, damage/replay contract, and crate edges                                                                                                               | `Open`      | The registry and view lifecycle contract was accepted separately at `bitty` `c0aadd2`/`a8735d0`, but no architecture category-owner review of this plan's scope, dependency rule, or damage/replay contract is recorded.                                                                                                            | Architecture category owner for the terminal-platform corpus.         |
| 2. Security review     | Bounded parsing (T-01), terminal-truth ownership (T-13), no hot-path plugin, clipboard `8192` bound + bracketed paste, bounded IPC/MCP budget, trace minimization against P0-AC-001/002/007/008 and R-001/R-004 | `Open`      | Component-level audits exist: R-001 bounded-parser audit authorizes entry to `Mitigated` at `bitty` `433f681`; the clipboard audit (R-004) remains `Open` at `bitty` `de134ec` with platform-backend, real-window UX, and post-acquisition bound limits. No whole-slice security review records the combined verdict.               | Security reviewer against the canonical `bitty-docs` security corpus. |
| 3. Performance review  | PB-1/PB-2/PB-4/PB-6/PB-7 attribution and frame-on-demand vs periodic-wakeup distinction; PB-3 eight-tab and PB-5 noted as informational                                                                         | `Open`      | The real-window performance evidence is implementer instrumentation at `bitty` `c0aadd2+` (headless CI fallback; the real-window gate is skipped without `BITTY_PERF_REAL_WINDOW=1`). No independent performance-owner review records a verdict, and the headless PB-1 total sits above the accepted budget on the CI runner class. | Performance owner.                                                    |
| 4. Docs-curator review | Draft vs accepted lineage, ADR/RFC reconciliation, no shipped/stable/compatibility claim, language and hygiene, navigation sync                                                                                 | `Open`      | No docs-curator verdict for this plan is recorded. This record and the accompanying index/register synchronization are the draft-vs-accepted lineage and navigation evidence the gate reviews, but an independent curator verdict has not happened.                                                                                 | Docs curator for the terminal-platform corpus.                        |
| 5. Local gates         | `just check` 0 issues, `actionlint` 0, `act -n` dry-run success, `git diff --check` clean, no `TODO`/`FIXME` or generated artifacts                                                                             | `Evidenced` | Reproduced on this record's docs revision; see [Local gate evidence](#local-gate-evidence). This gate is revision-locked to the docs change and does not carry over to the implementing revision.                                                                                                                                   | —                                                                     |

## Acceptance criteria A1-A9

The plan's A1-A9 are candidate acceptance criteria, not review gates. Each row
records whether a revision-locked artifact demonstrates the criterion; the
review verdicts above still govern authorization.

| Gate | Criterion                                                                                                                                                  | Verdict     | Revision                                | Evidence artifact                                                                                                                                                                                                                                                                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | End-to-end PTY loop: shell echo and exit status; bounded reply buffer; no panic on malformed bounded CSI/OSC/DCS/APC                                       | `Evidenced` | `bitty` `4135803`, `a8735d0`, `433f681` | Shell startup/exit corpora and `tests/compat/shell/corpus/*` with `live_compat::shell` (`bash --noprofile --norc -i`, exit status 7); `Runtime::write_replies` bounded `4` KiB relay at `a8735d0`; R-001 bounded-parser audit authorizing `Mitigated`. Visible run not independently reviewed.                                                                                     |
| A2   | Cursor: `DECSCUSR`/`DECTCEM` shape and visibility, blink only when enabled and not on focus loss, wide-cell integrity, alt-screen cursor save/restore      | `Open`      | `bitty` `4135803` (partial)             | Partial: alternate-screen `1049` enter/exit cursor-save corpus and `State::check_invariants` in `tests/compat/tui/corpus/01-nvim-tmux.bin`. Missing: `DECSCUSR`/`DECTCEM`, blink-on-focus, and wide-cell movement evidence.                                                                                                                                                        |
| A3   | Scrollback: monotonic, bounded, immutable-once-written, deterministic limit, alternate-screen isolation, viewport scroll interaction                       | `Evidenced` | `bitty` `4135803`                       | `tests/compat/scrollback/corpus/01-scrollback-basic.bin` and `02-scrollback-alt-screen.bin` (`ci`); `crates/bitty-runtime/tests/scrollback_cap.rs::configured_scrollback_cap_bounds_retained_lines`; `scrollback_search_selection_persistence.rs::search_finds_in_scrollback_and_live_grid_headless`. The per-slice configured limit statement in manual evidence remains pending. |
| A4   | Resize to PTY: grid geometry recompute, `SIGWINCH`/ConPTY resize, single reflow with full damage, cursor and geometry invariants, backpressure             | `Evidenced` | `bitty` `4135803`, `c0aadd2`            | `tests/compat/resize/corpus/01-resize-reflow.bin` and `02-dogfooding-resize-dpi-alt-screen.bin` (`ci`); `live_compat::resize` (80x24 to 120x40, `stty size` assertion, `local`); view-rect and DPI cell metrics to `SIGWINCH`/ConPTY with debounce `64` and full damage at `c0aadd2`. The exact reflow algorithm is not yet pinned before acceptance.                              |
| A5   | Selection: presentation-layer state, character-stream and line-block modes, wide cells as one logical cell, shift override over application mouse          | `Open`      | `bitty` `4135803` (partial)             | Partial: `scrollback_search_selection_persistence.rs` covers search and live-grid selection persistence (`ci`). Missing: presentation-layer ownership proof, character-stream and line-block modes, wide-cell selection, and shift override; interactive mouse drag remains a `gap` row in the compatibility matrix.                                                               |
| A6   | Copy and paste: bounded `BoundedText` copy, `CLIPBOARD_MAX_BYTES=8192` paste bound, bracketed paste defense in depth, OSC 52 policy, `R-004` residuals     | `Open`      | `bitty` `de134ec`                       | Independent clipboard audit (R-004, CTX-0097) at `de134ec` covers suspicious-paste inspection, the `8192` bound, and OSC 52 read/write gating; it explicitly does not authorize `Open -> Mitigated` and leaves platform backends, real-window UX, and the post-acquisition bound scope unclosed. `R-004` remains `Open`.                                                           |
| A7   | Shell coverage: default shell per Tier 1 platform; `OSC 133`/`OSC 7` parsed as cold-path actions, no grid mutation for unknown OSCs                        | `Open`      | `bitty` `4135803` (partial)             | Partial: shell startup/exit and `OSC 133`/`OSC 7`/`OSC 8` corpora (`ci`) plus `live_compat::shell` (bash, `local`). Missing: macOS `zsh` and Windows `ConPTY` shell evidence per Tier 1, and the shell-integration installer remains a `gap` row.                                                                                                                                  |
| A8   | nvim and tmux smoke: alt-screen entry/exit, cursor, bracketed paste, focus and mouse SGR, 256-color and repaint after resize, with recordings              | `Open`      | `bitty` `4135803`                       | Headless corpora `tests/compat/tui/corpus/01-nvim-tmux.bin` and `03-dogfooding-nvim-tmux-fzf-htop-ssh.bin` (`ci`) plus `live_compat::nvim` and `live_compat::tmux` (`local`). The visible manual recordings the plan requires are not committed, so the manual-evidence half of A8 is unfulfilled.                                                                                 |
| A9   | Visible vs headless consistency: identical `StateHash` for the same byte stream and `Env` sequence, headless-only `HeadlessRasterizer`, damage-union proof | `Open`      | `bitty` `c0aadd2+`, `4135803` (partial) | Partial: headless determinism and state-hash corpora at `4135803`; real-window performance instrumentation at `c0aadd2+` reports `Unavailable` phases on headless CI. Missing: a same-revision visible-versus-headless identical-`StateHash` run and the damage-union-equals-full-redraw proof.                                                                                    |

## Local gate evidence

Reproduced on the docs revision produced by CTX-0047, based on `4ab9010`:

| Gate step        | Command                                                  | Result                                                                                                                                 |
| ---------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Full local gate  | `just check`                                             | exit `0`; validated 105 Markdown files; format, markdownlint, links, metadata, language, agents, hygiene, SVG, and actionlint all pass |
| Workflow lint    | `actionlint -color -shellcheck= .github/workflows/*.yml` | exit `0`; no findings                                                                                                                  |
| Workflow dry-run | `act -n -W .github/workflows/ci.yml`                     | exit `0`; `Docs quality` job succeeded                                                                                                 |
| Whitespace       | `git diff --check`                                       | exit `0`; clean                                                                                                                        |

The local gate is revision-locked to the docs change; it does not transfer to
the `bitty` implementation revision that eventually witnesses the slice, which
must reproduce its own `cargo check` and CI gates.

## Consequence and remaining work

The four independent review gates (architecture, security, performance,
docs-curator) are `Open`. This record therefore does **not** authorize the slice
as an accepted design constraint and does not close issue
`bitty-terminal/bitty#1155`. The slice remains a `Draft` specification with
`Experimental Implementation` evidence.

Remaining work, by owner:

- **Architecture category owner** — review slice scope, single-window
  ownership, the dependency rule, and the damage/replay contract.
- **Security reviewer** — review the combined slice against P0-AC-001/002/007/008
  and R-001/R-004; a reviewed remediation revision for `R-004` is still required
  before that risk can move.
- **Performance owner** — review PB-1/PB-2/PB-4/PB-6/PB-7 attribution and the
  frame-on-demand invariant; pin reference hardware before budgets become hard
  gates.
- **Docs curator** — review the draft-versus-accepted lineage and this record's
  navigation and status synchronization.
- **Implementing repository** — reproduce `cargo check --workspace
--all-targets --locked` and the platform matrix on the witnessing revision,
  and record the manual and visible evidence that A2, A5, A7, A8, and A9 still
  lack.

Only after the five gates are recorded as approvals on the implementing pull
request and as a CarryCtx checkpoint may a new implementation task cite the
acceptance plan as its accepted design constraint.

## Revision history

- `2026-09-20` CTX-0047 — first gate-evidence record: A1-A9 status, the five
  review gates, and local gate evidence at docs base `4ab9010`.

## References

- [Single-Window Vertical Slice Acceptance Plan](vertical-slice-acceptance.md)
  — the acceptance criteria and review gates this record assesses.
- [VT Parser Security Audit — 2026-09 (R-001)](../security/audits/vt-parser-2026-09.md)
  — bounded-parser review behind A1.
- [Clipboard Security Audit - 2026-09 (R-004)](../security/audits/clipboard-2026-09.md)
  — clipboard review behind A6, still `Open`.
- [Terminal compatibility matrix](../reference/compatibility-matrix.md) — the
  `ci`/`local`/`partial`/`gap` rows cited by A3, A4, A5, A7, and A8.
- [Real-Window Performance Evidence (CTX-0100)](perf-evidence.md) — the
  instrumentation cited by A9 and the performance gate.
- [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  [P0 Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md),
  and [Evidence Matrix](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/evidence-matrix.md)
  — the normative security gates the security review applies.
