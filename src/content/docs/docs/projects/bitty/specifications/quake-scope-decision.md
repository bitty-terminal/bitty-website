---
title: Quake Hotkey Scope Decision
description: Draft decision record for the M1-32 quake/hotkey-window question - recommend deferral to plugin-owned policy over the Core window mechanism, with the scoped ADR/RFC path
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 54
---

# Quake Hotkey Scope Decision

> Status: **draft decision record** — a recorded recommendation, not an
> accepted contract. It addresses the M1-32 question (backlog item `M1-32`,
> [bitty#1158](https://github.com/bitty-terminal/bitty/issues/1158)) and the
> window-form question `OQ-052`, which stays **Open**. It changes no accepted
> document, closes no open question, and weakens no normative security
> control. The accepted
> [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
> row for `OQ-052`, the candidate
> [Panel and Workspace Interaction](panel-workspace-interaction-candidate.md)
> direction, and the
> [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) row remain
> authoritative. `OQ-052` closes only through an owner-accepted decision
> artifact, never through this record alone.

## Purpose

This record answers the M1-32 question — whether a Quake-style hotkey window
is Core or plugin-owned — at the recommendation level, and states the exact
path that would close the M1-32 slice of `OQ-052`. It exists so the absence
of quake code is a recorded Bitty position rather than an inference from
missing matches.

In scope: ownership of the drop-down hotkey window experience (global hotkey,
slide-in presentation, show/hide policy) and which Core mechanism it builds
on. Out of scope: the unified `Mod` contract, ribbon/panel-rules/semantic
workspaces (the rest of `OQ-052`); global-hotkey platform plumbing; the
single-window slice contract, which this record cites and does not redefine.

## Source identity

| Source                                                                                                            | Role                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) | `OQ-052` owner-pending; the closure authority for this question                                          |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                 | P1 row "Quake / hotkey window": `missing`; registers the now-next-later P1 direction                     |
| [Roadmap gap register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/roadmap/now-next-later.md)     | P1 row: plugin-owned window and presentation policy over the Core window mechanism; needs scoped ADR/RFC |
| [Workspace Compositor Specification](workspace-compositor.md)                                                     | Accepted `Instance -> Window` hierarchy; the Core window mechanism a quake policy would build on         |
| [Single-Window Vertical Slice](../product/vertical-slice-acceptance.md)                                           | Candidate slice: one process, one window; window management UX out of scope                              |
| [Core and Plugin Boundaries](../architecture/core-boundaries.md)                                                  | Draft M1 Hardening table: quake proposed as plugin policy over Core mechanisms                           |

Implementation evidence, read-only from `bitty` `972818d`
(2026-09-22):

- No `quake`, `QuakeMode`, or hotkey-window matches anywhere under `crates/`.
  No global-hotkey registration, slide-in geometry, or drop-down visibility
  state exists.
- The app is a single-window slice: one native window per process
  (`crates/bitty-app/src/terminal_app.rs`, single-window slice comments);
  no window-creation action exists in the keymap vocabulary.
- Kitty precedent is a kitten (`quick-access-terminal`), i.e. policy outside
  the terminal core — consistent with the deferred direction below.

## Disposition

### Decision space

1. **Core-owned quake window.** Core registers a global hotkey, owns the
   drop-down presentation, and manages show/hide policy.
2. **Plugin-owned quake policy over the Core window mechanism (deferred).**
   Core exposes window show/hide/focus primitives; a plugin owns the hotkey
   binding, slide-in presentation, and toggle policy. No M1 work.
3. **Refuse quake.** Record that Bitty will never support a hotkey window.

### Recommended disposition

**Recommend option 2: defer to plugin-owned policy, with no M1 work and no
refusal.** The now-next-later P1 row already assigns this exact ownership,
and Core owns no global-hotkey or drop-down primitive today; adopting
option 1 would pull platform hotkey plumbing, focus-stealing policy, and
compositor-specific geometry into Core for a P1 differentiator. Option 3
overreaches: Kitty ships this as a kitten and no Bitty stance demands a
refusal — absence of demand defers, it does not refuse.

### Rationale

1. **The ownership answer already exists in draft.** The roadmap P1 row and
   the draft Core/Plugin Boundaries M1 Hardening table both place quake on
   the plugin side of the seam. This record confirms that direction at M1
   scope; it does not invent it.
2. **Core has no mechanism to hang policy on yet.** A plugin-owned quake
   needs window show/hide/focus primitives from `bitty-platform`, which do
   not exist in the single-window slice. Deferral is honest about that
   ordering: mechanism first, policy later.
3. **Global hotkeys are platform surface, not terminal truth.** Registration,
   focus stealing, and slide-in animation differ per OS/compositor and carry
   no terminal-state invariant; Core ownership would import that variance
   for no correctness gain.
4. **Deferral keeps the demand gate.** If drop-down usage demand appears, the
   admission path below bounds the work without revisiting ownership.

### What changes if adopted

- **As recommended (deferral):** no runtime change. The authoritative
  resolution is an owner-accepted decision artifact (scoped ADR or RFC) that
  records plugin ownership, names the Core window primitives the policy
  needs, and closes the M1-32 slice of `OQ-052` per the path below. The
  [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) row would
  move from `missing` to `missing; deferred to plugin policy`.
- **If instead Core-owned:** the same owner-accepted artifact pins the
  hotkey registration surface, the focus/show/hide primitives, per-platform
  behavior, and the security review for global input interception before any
  implementation task lands code.

### Security and bounds

- Global-hotkey registration intercepts user input at OS scope; any future
  admission needs a focused security review (input interception, focus
  stealing, Wayland protocol constraints) before implementation.
- A quake policy never touches terminal state: it shows/hides a window
  around an ordinary terminal instance. Presentation never rewrites
  terminal truth.
- This record opens no input path and no capability; it is a scope statement
  only.

## Verification backlog

- The recommended disposition does not close M1-32 on its own: the issue
  stays open (Related, not Closed) until the owner-accepted scoped ADR/RFC
  lands. The authoritative resolution of the M1-32 slice of `OQ-052`
  requires that artifact, reviewed by the architecture category owner per
  the [documentation workflow](../docs/development/documentation-workflow.md).
- Any future admission starts from a new scoped task citing demonstrated
  demand, the Core window primitives it consumes, and the security review
  above — not from this record.
