---
title: Tabs Scope Decision
description: Draft decision record for the M1-31 tabs/tab-bar question - recommend deferral to plugin policy over Core workspace primitives without reviving the deprecated bitty-terminal.tabs surface
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 55
---

# Tabs Scope Decision

> Status: **draft decision record** — a recorded recommendation, not an
> accepted contract. It addresses the M1-31 question (backlog item `M1-31`,
> [bitty#1157](https://github.com/bitty-terminal/bitty/issues/1157)) and the
> window-form question `OQ-052`, which stays **Open**. It changes no accepted
> document, closes no open question, and weakens no normative security
> control. The accepted
> [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
> row for `OQ-052`, the candidate
> [Chrome Surface Contract](chrome-surface-contract-candidate.md) `PW-10`
> item, and the
> [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) row remain
> authoritative. `OQ-052` closes only through an owner-accepted decision
> artifact, never through this record alone.

## Purpose

This record answers the M1-31 question — Core chrome versus declarative
surface for tabs — at the recommendation level, and states the exact path
that would close the M1-31 slice of `OQ-052`. It exists so the absence of a
tab bar is a recorded Bitty position rather than an inference from missing
matches.

In scope: who owns the tab strip experience and which Core primitives it
consumes. Out of scope: the workspace switcher that already ships; the
`PW-10` tab-strip contract itself (owned by the chrome-surface candidate);
the unified `Mod` contract and remaining `OQ-052` window forms; the
single-window slice contract, cited not redefined. This record must not
revive the deprecated `bitty-terminal.tabs` surface in any form.

## Source identity

| Source                                                                                                            | Role                                                                                               |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) | `OQ-052` owner-pending; the closure authority for this question                                    |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                 | P1 row "Tabs and tab bar": `missing (workspaces exist)`; registers `PW-10`                         |
| [Roadmap gap register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/roadmap/now-next-later.md)     | P1 row: plugin policy over Core primitives; layout stays with the compositor                       |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)                                       | `PW-10` tab-strip candidate: panel projections for one `Window`/`Workspace` (order, active, close) |
| [Workspace Compositor Specification](workspace-compositor.md)                                                     | Accepted `Window -> Workspace -> LayoutTree -> View` hierarchy; layout stays with the compositor   |
| [Single-Window Vertical Slice](../product/vertical-slice-acceptance.md)                                           | Candidate slice: no tabs, no splits, no panes                                                      |

Implementation evidence, read-only from `bitty` `972818d`
(2026-09-22):

- Workspace actions ship (`workspace_new`/`_close`/`_focus` in
  `crates/bitty-config/src/keymap.rs`, runtime
  `crates/bitty-runtime/src/runtime/workspaces.rs`), but there is no tab bar
  and no tab view.
- The deprecated `tabs` module is an alias of `workspace` only
  (`crates/bitty-runtime/src/tabs.rs`: `#[deprecated]` shims delegating to
  the canonical `workspace` names; removal >= v0.2.0; new code must use
  `crate::workspace`).
- Alacritty precedent declines tabs by design; Kitty and WezTerm own
  tab/multiplex surfaces outside any plugin model Bitty accepts.

## Disposition

### Decision space

1. **Core tab chrome.** Core paints and owns a tab bar over workspaces.
2. **Plugin tab policy over Core workspace primitives (deferred).** A
   plugin owns the tab strip UX and consumes workspace order/focus/close
   primitives plus the `PW-10` shared surface; Core keeps workspace
   primitives and compositor layout only. No M1 work.
3. **Revive `bitty-terminal.tabs`.** Rejected outright below.

### Recommended disposition

**Recommend option 2: defer to plugin tab policy, with no M1 work.**
Workspaces already provide the grouping primitive a tab strip needs; what is
missing is the strip UX and its shared contract (`PW-10`, still candidate),
not Core grouping. Core-owned chrome would hard-code one tab metaphor into
the compositor that `OQ-052` has not settled. Option 3 is rejected: the
`tabs` alias exists only as a compat shim with a dated removal, and any new
surface must go through the `PW-10`/plugin-platform path, never a revival.

### Rationale

1. **The grouping primitive already ships.** `workspace_new`/`_close`/`_focus`
   plus the workspaceline overlay cover grouping and switching; the gap is
   strictly the strip presentation, which is policy, not mechanism.
2. **Layout stays with the compositor.** The roadmap P1 row and the accepted
   Workspace Compositor both keep layout in Core-as-mechanism; a Core tab bar
   would fuse one policy into that mechanism before `OQ-052` settles window
   forms.
3. **The contract slot already exists.** `PW-10` names the tab strip as a
   shared consumption surface; the missing piece is its acceptance, not a
   new Core widget. Deferral points at that slot instead of duplicating it.
4. **No demand evidence for M1 tabs.** The single-window slice explicitly
   excludes tabs; nothing in the M1 gates requires them.

### What changes if adopted

- **As recommended (deferral):** no runtime change, and the deprecated
  `tabs` alias continues to its >= v0.2.0 removal untouched. The
  authoritative resolution is an owner-accepted decision artifact that
  records plugin ownership, accepts (or supersedes) the `PW-10` tab-strip
  surface, and closes the M1-31 slice of `OQ-052` per the path below. The
  [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) row would
  move from `missing (workspaces exist)` to `missing; deferred to plugin
policy over workspace primitives`.
- **If instead Core-owned:** the same owner-accepted artifact pins the tab
  model (workspaces? views? terminals?), the strip's place in chrome
  ownership, and keyboard-addressability before any implementation task
  lands code.

### Security and bounds

- A tab strip is presentation over workspace primitives: order, active, and
  close projections. It never reorders terminal state and never crosses the
  plugin isolation boundary beyond the `PW-10` read/projection surface.
- Tab close must route through the existing workspace-close lifecycle
  (including PTY teardown and save-on-close policy), never a parallel path.
- This record opens no surface and no capability; it is a scope statement
  only.

## Verification backlog

- The recommended disposition does not close M1-31 on its own: the issue
  stays open (Related, not Closed) until the owner-accepted artifact lands,
  reviewed by the architecture category owner per the
  [documentation workflow](../docs/development/documentation-workflow.md).
  `PW-10` acceptance (or an explicit superseding surface) is part of that
  artifact, not of this record.
- Any future admission starts from a new scoped task citing demonstrated
  demand and the accepted `PW-10` (or successor) surface — never from a
  revival of the deprecated `bitty-terminal.tabs` names, which stay on
  their dated removal path.
