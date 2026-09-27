---
title: UI Motion and Budget (Candidate)
description: Candidate motion tree key spellings and UI GPU budget categories composing the accepted animation contract with the frame-on-demand and display-list directions
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 46
---

# UI Motion and Budget (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record states the candidate motion
> tree, its key spellings, and the UI/GPU budget categories that the candidate
> [Workspace-Native UI Runtime](ui-runtime-candidate.md) assumes (U-6) and the
> owner-pending UI Runtime RFC (U-9, item 1) would own. It authorizes no shipped
> behavior, weakens no accepted animation or resource control, and makes no
> implementation claim. Every key and category name is a candidate spelling.

## Purpose and scope

The accepted animation contract already fixes the hard parts: durations in
`0..=500` ms, a closed easing enum, `enabled = false`, reduced-motion collapse,
`bitty --safe` collapsing to the final committed state, and a prohibition on
interpolating terminal content, cursor, selection, and scrollback. What has no
contract today is the **motion tree** (which surfaces have motion at all, and
under which keys) and the **UI/GPU budget** (node count, texture memory, blur
area, draw calls) that bounded canvas and panel visualizations must fit inside.

In scope: the motion tree and its leaves, the candidate key spellings, the
relationship to the accepted animation contract, UI/GPU budget categories and
attribution, frame-on-demand and display-list rules, and the failure posture.

Out of scope and owned elsewhere: the accepted duration range, easing enum,
reduced-motion semantics, and `--safe` collapse (accepted,
[Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md));
frame budget and no-periodic-timer rules (accepted,
[Performance Budget RFC](performance-budget-rfc.md)); resource ceilings for
plugin-hosted work (accepted, Lua Runtime and Isolation Resource contracts);
accessibility's reduced-motion interaction (draft,
[Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md)).

## Normative sources this specification must not weaken

- [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md)
  (accepted): `0..=500` ms durations, closed easing set, `enabled = false`,
  reduced motion, `--safe` final-state collapse, and the interpolation
  prohibition.
- [Performance Budget RFC](performance-budget-rfc.md) (accepted): frame budget,
  frame-on-demand, and the no-periodic-timer rule.
- [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)
  (accepted): plugin resource ceilings the UI budget must not widen.
- [Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md)
  (accepted): host admission and bounded host requests.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 4 (no hot-path execution) and invariant 7 (bounded inputs).

## Terminology

| Term            | Meaning in this document                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| Motion tree     | The candidate set of surfaces that may animate, and their key spellings.                                |
| Motion leaf     | One animatable transition (for example a panel move) with a duration, easing, and enable flag.          |
| Budget category | A bounded accounting dimension: node count, texture memory, blur surface area, draw calls.              |
| Display list    | A bounded data description submitted at low frequency that the Rust compositor renders at refresh rate. |
| Frame-on-demand | The rule that no frame is produced without a revision or an active animation.                           |

## Candidate motion tree

| Leaf                      | Transition it describes                 | Notes                                                              |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| `motion.panel.move`       | A panel changing position in the layout | Composes with PW-3 move direction; geometry only                   |
| `motion.panel.resize`     | A panel changing size                   | Geometry only                                                      |
| `motion.panel.open`       | A panel appearing in a layout slot      | Never interpolates content; the content is committed first         |
| `motion.panel.close`      | A panel leaving a layout slot           | Teardown follows the accepted lifecycle; motion is decoration only |
| `motion.float.toggle`     | A leaf toggling floating presentation   | Composes with the gated presentation-mode transitions              |
| `motion.workspace.switch` | A workspace becoming active             | Chrome and content commit first; the transition is decoration      |
| `motion.bar.reveal`       | A chrome surface revealing or hiding    | Composes with PW-4 direction; chrome motion only                   |

Rules for the tree:

1. **The tree is closed in the candidate direction.** A motion leaf exists only
   if listed above; a plugin may not introduce a motion leaf. This mirrors the
   closed easing enum of the accepted contract.
2. **Every leaf composes with the accepted contract.** Duration range, easing
   set, `enabled = false`, reduced motion, and `--safe` final-state collapse
   apply per leaf; a leaf may not widen any of them.
3. **Content is committed before motion.** Motion never delays the committed
   state: the layout, the content, and the focus are already final when an
   animation starts, so an interrupted or disabled animation shows the same
   state as a completed one.
4. **Interpolation stays out of prohibited domains.** No leaf interpolates
   terminal content, cursor, selection, or scrollback, per the accepted
   prohibition.
5. **One animation per surface property.** Two leaves may not animate the same
   property of the same surface simultaneously; a second request replaces or is
   rejected, never blends.

## Budget categories (candidate)

| Category          | What it bounds                                       | Attribution direction                           |
| ----------------- | ---------------------------------------------------- | ----------------------------------------------- |
| Node count        | Presented scene nodes per leaf and per window        | Per leaf, aggregated per window                 |
| Texture memory    | Decoded image and atlas memory held for presentation | Per window, with per-panel attribution          |
| Blur surface area | Total blurred area per frame                         | Per frame, attributed to the requesting surface |
| Draw calls        | Submission count per frame                           | Per frame, aggregated per window                |

Rules:

1. **No category widens an accepted ceiling.** The UI/GPU categories compose
   with the accepted resource controls and may only be tighter.
2. **Failure closes.** Exceeding a category refuses admission or degrades the
   effect (for example, dropping blur) with a reported reason; it never
   corrupts accepted state, never silently substitutes content, and never
   partially applies a layout change.
3. **Display lists are data.** A canvas or visualization submits bounded
   display lists at low frequency; the compositor renders at refresh rate. A
   display list is bounded by the categories above and carries no code.
4. **Frame-on-demand is preserved.** No category introduces a periodic timer;
   a revision or an active animation remains the only wakeup source.
5. **Attribution is auditable.** Every category reports which surface consumed
   it, so a budget failure names its cause rather than failing opaquely.

## Security review

The motion tree and budget categories add no capability and no host surface;
they tighten rather than widen controls. The properties that matter: display
lists are data with bounded size (no code path), budget failure fails closed,
and no animation path executes plugin code on a per-frame basis. No `P0`
criterion is affected; a security reviewer is required if a future revision
lets a plugin submit a display list without host validation or introduce a
motion leaf.

## Verification plan

1. A test asserting each motion leaf clamps to `0..=500` ms, accepts only the
   closed easing set, and collapses to the final state when disabled or under
   reduced motion or `--safe`.
2. A test asserting no motion leaf interpolates terminal content, cursor,
   selection, or scrollback.
3. A test asserting a budget category overflow fails closed with a reported
   reason and leaves the previous accepted state intact.
4. A test asserting a display list over its bound is refused and that no
   periodic timer is created by the canvas path.
5. A test asserting attribution names the consuming surface for each category.

## Alternatives considered

| Alternative                                                 | Trade-off                                                                    | Disposition                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Open the motion tree to plugins                             | Rich plugin animation; unbounded motion surface and per-frame plugin work    | Rejected — the tree stays closed in the candidate direction |
| Per-frame GPU accounting only                               | Simpler instrumentation; no per-surface attribution so failures are opaque   | Rejected — attribution is required for diagnosable failure  |
| Make budgets advisory rather than enforced                  | No admission failures; budgets would drift silently                          | Rejected — fail-closed is the accepted posture              |
| Reuse the accepted animation contract without a motion tree | No new document; leaves which surfaces animate undocumented and inconsistent | Rejected — the tree is the gap                              |

## Affected contracts

| Contract                                                                                                                                               | Effect                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md) (accepted) | Unchanged; the motion tree composes with it                           |
| [Performance Budget RFC](performance-budget-rfc.md) (accepted)                                                                                         | Unchanged; UI/GPU categories sit inside its frame budget              |
| [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md) (candidate)                                                    | PW-3 gains a motion tree to reference instead of inventing spellings  |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md) (candidate)                                                                                     | U-6 motion and budget open items gain a candidate baseline; stay open |
| [UI Extensibility Architecture](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/architecture/ui-extensibility-architecture.md) (draft)  | Level 0 animation mechanism and Level 2 duties compose with the tree  |
| [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) (draft)                                                                      | Shares reduced-motion and immediate-final-state rules                 |

## Open points

- The exact numeric bounds per category and their defaults.
- Whether category bounds are per window, per workspace, or per plugin
  instance, and how a plugin's share is attributed.
- Whether admission refusal or graceful degradation is the default posture per
  category (blur degradation is the candidate example).
- Whether the motion tree is user-extensible through configuration (a user
  choosing durations from the accepted range is compatible; adding new leaves is
  not).
- The display-list schema and its maximum size.
- Whether workspace switching motion composes with chrome reveal or is
  independent.

## Acceptance criteria

1. A reviewer confirms every rule composes with the accepted animation and
   performance contracts and widens no ceiling.
2. The motion tree is stated as closed, with the extension rule explicit.
3. Category attribution is required, not optional.
4. Acceptance happens through the owner-pending UI Runtime RFC (U-9, item 1),
   not by flipping this record's status.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes; the categories are tighter than the accepted controls. The
security review above records that disposition.

## References

- [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md)
  — accepted animation contract.
- [Performance Budget RFC](performance-budget-rfc.md) — frame budget and
  frame-on-demand.
- [Workspace-Native UI Runtime (Candidate)](ui-runtime-candidate.md) — U-6
  direction this record elaborates.
- [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md)
  — PW-3 animation direction.
- [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) —
  reduced motion and final-state availability.
