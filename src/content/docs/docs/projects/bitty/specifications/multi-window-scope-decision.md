---
title: Multi-Window Scope Decision
description: Draft decision record for the M1-30 multi-window question - recommend deferral past the single-window v1 slice with Instance-to-Window admission gates, without refusing multi-window
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 56
---

# Multi-Window Scope Decision

> Status: **draft decision record** — a recorded recommendation, not an
> accepted contract. It addresses the M1-30 question (backlog item `M1-30`,
> [bitty#1156](https://github.com/bitty-terminal/bitty/issues/1156)) and the
> window-form question `OQ-052`, which stays **Open**. It changes no accepted
> document, closes no open question, and weakens no normative security
> control. The accepted
> [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
> row for `OQ-052`, the accepted
> [Workspace Compositor Specification](workspace-compositor.md)
> `Instance -> Window` hierarchy, and the
> [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) row remain
> authoritative. `OQ-052` closes only through an owner-accepted decision
> artifact, never through this record alone.

## Purpose

This record answers the M1-30 question — whether `Instance -> Window`
multi-window enters v1 — at the recommendation level, and states the exact
path that would close the M1-30 slice of `OQ-052`. It exists so the
single-window limit reads as an explicit sequencing decision rather than an
unexamined gap.

In scope: the v1 boundary for OS windows (one versus many per `Instance`)
and the admission gates for a future multi-window slice. Out of scope:
in-window composition (workspaces, splits, tabs — separate records and
`OQ-052` slices); the `Instance`/`Window` identity definitions themselves,
which the accepted compositor already fixes; per-platform window plumbing
details, which belong to a future implementation task.

## Source identity

| Source                                                                                                            | Role                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) | `OQ-052` owner-pending; the closure authority for this question                                                                    |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                 | P0 row "Multiple OS windows": `missing`; single-window slice with explicit exclusion                                               |
| [Roadmap gap register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/roadmap/now-next-later.md)     | P0 gap: Core mechanism is the compositor `Instance -> Window` hierarchy plus `bitty-platform` ownership                            |
| [Workspace Compositor Specification](workspace-compositor.md)                                                     | Accepted: `Instance` owns `Window`s; `Window` is the only use of window; tiling lives inside a `Window`                            |
| [Single-Window Vertical Slice](../product/vertical-slice-acceptance.md)                                           | Candidate slice: one process, one window; "Multiple windows, window management UX, or multi-window orchestration are out of scope" |

Implementation evidence, read-only from `bitty` `972818d`
(2026-09-22):

- Single-window slice ships: one native window per process
  (`crates/bitty-app/src/main.rs`, `crates/bitty-app/src/terminal_app.rs`
  single-window slice comments); no window-creation action exists in the
  keymap vocabulary.
- Post-slice workspace ops are in-app workspace switching, not OS windows.
- All six surveyed references support multiple OS windows (Alacritty via
  `msg create-window`); Bitty is the outlier, which is why this record
  defers rather than refuses.

## Disposition

### Decision space

1. **Multi-window in v1.** Build `Instance -> Window` fan-out (window
   creation, per-window event loops, cross-window focus/close lifecycle)
   inside the v1 milestone.
2. **Defer past the single-window v1 slice (recommended).** Ship v1 as one
   process, one window; admit multi-window as a later slice with its own
   layout and lifecycle evidence. No refusal.
3. **Refuse multi-window.** Record single-window as the permanent Bitty
   stance.

### Recommended disposition

**Recommend option 2: deferral with admission gates, not refusal.** The
accepted compositor already models `Instance` owning many `Window`s, so the
contract anticipates fan-out; what is missing is the implementation and its
evidence, which the v1 slice deliberately excludes to isolate verification
risk. Option 1 would fold per-window lifecycles, cross-window focus, and
platform window plumbing into the milestone whose whole point is the
smallest real loop. Option 3 contradicts both the accepted hierarchy and
every surveyed reference; nothing in Bitty's stance requires it.

### Rationale

1. **The slice contract is explicit.** The vertical-slice acceptance plan
   excludes multi-window by name and states that "adding a second terminal,
   view, or window is a new slice with its own layout and lifecycle
   evidence." Deferral obeys that contract; v1 admission would break it.
2. **The contract already anticipates fan-out.** `Instance owns Windows`
   is accepted text, so deferral discards no design and re-plans nothing —
   it sequences an already-modeled hierarchy.
3. **Deferral is the majority-compatible posture.** All six references ship
   multiple windows; recording a deferral (with gates) keeps Bitty aligned
   with table stakes while protecting v1 verification focus.
4. **No v1 gate needs a second window.** The M1 correctness gates (protocol
   deltas, goldens, fuzz, shell coverage) are all single-window provable.

### What changes if admitted

- **As recommended (deferral):** no runtime change. The authoritative
  resolution is an owner-accepted decision artifact that records the
  post-slice sequencing, keeps the `Instance -> Window` hierarchy as the
  fan-out contract, and closes the M1-30 slice of `OQ-052` per the path
  below. The [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)
  row would move from `missing` to `missing; deferred past the v1 slice`.
- **If admitted later:** a new scoped slice task lands window creation,
  per-window event-loop and surface lifecycle, cross-window focus and
  close semantics (including PTY teardown per window), single-`Instance`
  shared state rules, and layout/lifecycle evidence per window — with its
  own acceptance record before any `Verified` claim. Admission needs the
  gates below, not convenience.

### Admission gates

1. The single-window slice is accepted first; multi-window never re-litigates
   v1 scope.
2. `bitty-platform` window ownership extends to N windows with an explicit
   per-window surface/close lifecycle and no shared-mutable-state aliasing.
3. Cross-window focus, close-with-running-PTY policy, and crash-of-one-window
   isolation are specified and tested headless before live claims.
4. Performance budgets (PB-4 input latency, PB-7 idle) hold with two windows
   open, not just one.

### Security and bounds

- Each window is a separate trust surface for window-system input (focus,
  clipboard, drag-and-drop); fan-out must not alias input or clipboard
  state across windows without an explicit, reviewed rule.
- A closing window must tear down its PTYs and surfaces deterministically;
  no orphaned PTY or GPU surface survives its window.
- This record opens no window path and no capability; it is a scope
  statement only.

## Verification backlog

- The recommended disposition does not close M1-30 on its own: the issue
  stays open (Related, not Closed) until the owner-accepted artifact lands,
  reviewed by the architecture category owner per the
  [documentation workflow](../docs/development/documentation-workflow.md).
- Any future admission starts from a new scoped slice task meeting the four
  gates above, with its own acceptance record — not from this record.
