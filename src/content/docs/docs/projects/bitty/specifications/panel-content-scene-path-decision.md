---
title: Panel Content Scene Path Decision
description: Candidate resolution of OQ-051 covering the non-terminal panel content path, the compositor sub-surface boundary, Scene ownership, and the retirement of the per-leaf grid snapshot
category: specifications
audience: maintainer
document_type: specification
status: draft
website_publish: true
sidebar_order: 43
---

# Panel Content Scene Path Decision

> Status: **draft** decision record resolving
> [OQ-051](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
> The [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) records
> the gap as **confirmed** — "Panel is not Terminal: non-terminal panels
> degrade to a character grid" — because the bounded `SceneNode` model is not
> consumed by the render pipeline and panel content rides the per-leaf grid
> snapshot path. This record states the candidate direction that closes the
> gap, names what each accepted contract keeps owning, and lists what a
> successor acceptance must decide. It accepts nothing, promotes nothing to
> **Verified** or **Compatible**, and changes no accepted text.

## Purpose and scope

A panel that is not a terminal currently has no way to present its content
except by degrading into a character grid. The mechanism side is largely
present: a bounded declarative scene model with `SceneNode` values, spans,
tables, borders, and block anchors; a typed `ViewContent::Panel(PanelId)` leaf;
per-panel registries; and a validated `4+1` overlay envelope. What is missing is
the **consumption path** — the contract that says how a declarative scene
reaches the renderer, who owns it, and what happens to the grid snapshot.

In scope: the candidate content path, its owner, the `ViewContent` boundary it
composes with, the bounded budgets it must respect, the relationship to the
terminal grid path, and the migration posture for the existing grid snapshot.

Out of scope and owned elsewhere: panel placement and identity (draft,
[Panel Placement Decision](panel-placement-decision.md)); the `SceneNode` schema
and budgets (accepted, [Rich Presentation RFC](rich-presentation-rfc.md)); the
retained `UiTree` direction and layer model (candidate,
[Workspace-Native UI Runtime](ui-runtime-candidate.md)); overlay composition
(draft, [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md));
the chrome surfaces (draft, [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md));
accessibility semantics (draft, [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md)).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 3 (presentation never Terminal Truth), invariant 4 (no hot-path
  execution), invariant 7 (bounded inputs), and the untrusted-by-default
  posture for plugin-produced content.
- [Rich Presentation RFC](rich-presentation-rfc.md) (accepted): the `SceneNode`
  contract, the accepted scene limits (SCN-1..SCN-5: 2048 nodes per block,
  depth 32, 256 KiB text per block, 2 MiB aggregated rich bytes per terminal,
  64 blocks per terminal), and the rule that rich presentation never becomes
  Terminal Truth.
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): panel identity, the
  lifecycle, focus routing, the command registry, and the `4+1` envelope.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted):
  the hierarchy, Core-owned decoration, and interaction atomicity.
- [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)
  (accepted): `ViewId != TerminalId`, attachment semantics, and the rule that a
  leaf's content type never changes the identity rules.
- [Performance Budget RFC](performance-budget-rfc.md) (accepted): frame budget
  and the no-periodic-timer rule.

## Terminology

| Term                  | Meaning in this document                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Scene path            | The consumption contract by which a declarative scene reaches the renderer outside the character grid.           |
| Grid snapshot path    | The current per-leaf path where a leaf's content is composited as a character grid and presented as a bitmap.    |
| Scene owner           | The component that validates, bounds, and submits a scene for a leaf; candidate direction: Core, not the plugin. |
| Terminal-backed panel | A panel whose content is a PTY-backed terminal grid; unaffected by this decision.                                |
| Rich panel            | A panel whose content is a declarative scene (lists, tables, text blocks, images, canvas).                       |

## The recorded gap

The gap analysis records, at `bitty` head `2a26480`:

- `ViewContent::Panel(PanelId)` and `ViewContent::Browser(BrowserSurfaceId)`
  exist as typed content variants.
- The rich model is bounded but **not consumed** by the render pipeline: no
  `SceneNode` reference exists in `bitty-render`, `bitty-runtime`, or
  `bitty-app`.
- Panel presentation therefore still rides the per-leaf grid snapshot path.

That combination is why non-terminal panels currently degrade: they have typed
identity and bounded content, but no declared route to the frame.

## Direction

**Direction (candidate, awaiting acceptance): a Core-owned Scene path composed
per leaf, with the grid snapshot path retained for terminal-backed content.**

1. **Every leaf presents through one of two named paths.** A leaf's presenter is
   selected by its content variant: terminal-backed content and
   browser surfaces keep the grid snapshot path; scene-backed panel content
   presents through the Scene path. No leaf presents through both, and no third
   path may be added without an RFC.
2. **The Scene path is Core-owned.** The plugin or panel produces a bounded
   declarative scene; Core validates it against the accepted budgets, resolves
   it against the theme tokens it owns, and submits a paint list. A plugin never
   receives a renderer handle, a GPU object, a display list handle, or a
   submission queue.
3. **The Scene path is not a compositor sub-surface.** The direction is a
   **composed layer inside the leaf's rectangle**, not a separate OS surface or
   window: geometry stays inside the leaf rect the compositor already computed,
   so the no-window-leak rule and the accepted `LogicalRect -> PTY` rule hold
   unchanged. A sub-surface (a distinct GPU surface with its own lifetime) is
   **not** adopted in this direction; it is the alternative that would break the
   single-present-queue property.
4. **Presentation is not truth.** A scene is presentation state. It never
   mutates grid, cursor, modes, scrollback, attachment, or IPC policy, and it
   never becomes an authority a panel can be addressed by.
5. **Budgets are the accepted bounds, unchanged.** A scene per block is bounded
   by the accepted node, depth, and byte ceilings; scenes per leaf and per
   terminal stay within the accepted block budget. Overflow fails closed: the
   scene is rejected or truncated with a reported flag, never silently
   substituted.
6. **Frame-on-demand.** A scene revision or an active animation is the only
   wakeup source; the Scene path creates no periodic timer and adds no
   per-keystroke work.
7. **Migration is additive.** The grid snapshot path is retained, not removed.
   A leaf that presents a scene is not a terminal-backed leaf; the transition
   does not rewrite any `ViewId`, `TerminalId`, or `PanelId` rule.

### Composition with panel placement

The [Panel Placement Decision](panel-placement-decision.md) keeps `View` as the
internal attachment point and Panel as the visible identity. The Scene path
attaches to the **leaf rect** (the `View` rectangle), which is exactly the rect
the compositor computes and hit-tests. That keeps hit-testing, focus, and
decoration owned by the accepted contracts.

## Consequences

### Rendering and compositing

- The renderer gains one named entry point for scene-backed leaves and one for
  grid-backed leaves; the present path composes both into the same frame under
  the same decoration and tier rules.
- Scene content and grid content never interleave inside one leaf's rectangle:
  a leaf is one content kind at a time. A mixed leaf (a terminal inside a rich
  layout) is expressed by a scene node that hosts a terminal region, which is a
  scene-schema question owned by the Rich Presentation RFC, not by this record.

### Budgets and attribution

- Scene cost attribution is per leaf and per window, composing with the UI/GPU
  budget category direction in
  [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md); this
  record adds no new category and no new ceiling.

### Accessibility

- Scene-backed content needs a semantics mapping so assistive technology can
  read it. This record fixes the requirement and defers the mapping to the
  [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md);
  a scene path with no semantics mapping is not conformant.

### Evidence

- Closing this gap requires render-path evidence, not just library tests: a
  headless frame assertion that a scene-backed leaf produces pixels without
  touching the grid snapshot path.

## Security review

The Scene path widens the surface where plugin-produced content reaches the
frame, so the review is substantive rather than ceremonial:

- **No new authority.** The path grants no renderer handle, GPU object, native
  window, display-list handle, or submission queue; Core validates and submits.
- **Bounded by construction.** Accepted node/depth/byte budgets apply unchanged;
  admission failure is typed and reported.
- **No hot-path execution.** Validation and submission happen off the input,
  PTY-read, and damage-to-present hot paths.
- **Presentation stays non-authoritative.** A scene cannot address a terminal,
  alter a mode, or become a capability.
- A security reviewer is **required** before acceptance, because this decision
  selects where untrusted declarative content enters the paint path. The
  `P0` criteria that require bounded inputs and a single trust boundary are the
  ones to re-verify.

## Verification plan

1. A headless test asserting a scene-backed leaf presents pixels while no grid
   snapshot is produced for that leaf.
2. A test asserting budget overflow (nodes, depth, bytes) fails closed with a
   typed error and leaves the previous frame's state intact.
3. A test asserting a scene never mutates grid, cursor, modes, or scrollback
   (a property assertion over the scene-to-paint path).
4. A test asserting the Scene path introduces no periodic timer; a scene
   revision or animation is the only wakeup.
5. Render evidence for a representative rich panel (list plus table plus text)
   captured in the record before any status promotion.

## Alternatives considered

| Alternative                                               | Trade-off                                                                                  | Disposition                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Compositor sub-surface per panel (a distinct GPU surface) | Isolated lifetime and clean damage; breaks single-present-queue and no-window-leak posture | **Rejected** for this direction; recorded as the alternative it is not       |
| Keep grid-degradation and document it as a limitation     | No work; leaves the confirmed gap and caps the panel vision                                | Rejected — the gap is confirmed and blocking panel content                   |
| Terminal-only panels in v1, scene path post-1.0           | Smaller scope; defers every rich panel and the panel vision                                | Rejected as the resolution of OQ-051; acceptable only as a scheduling choice |
| Scene path owned by the plugin host rather than Core      | Less Core code; puts untrusted content closer to the frame                                 | Rejected — Core ownership is the trust boundary                              |

## Affected contracts

| Contract                                                                          | Effect                                                                                       |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) (draft)           | The "Panel is not Terminal" row gains the candidate resolution; verdict stays until evidence |
| [Rich Presentation RFC](rich-presentation-rfc.md) (accepted)                      | Unchanged; its budgets and `SceneNode` contract become the consumed input                    |
| [Panel Runtime RFC](panel-runtime-rfc.md) (accepted)                              | Unchanged; a panel's content is presented, not redefined                                     |
| [Panel Placement Decision](panel-placement-decision.md) (draft)                   | Supplies the leaf rect and identity split the Scene path attaches to                         |
| [Workspace Compositor](workspace-compositor.md) (accepted)                        | Unchanged; decoration, hit-testing, and atomicity apply to scene-backed leaves unchanged     |
| [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) (draft) | Gains the requirement to define a scene semantics mapping                                    |
| [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md) (draft)     | Gains scene cost as an attributed category within existing ceilings                          |

## Open points

- Whether a leaf may ever host a scene **and** a terminal grid simultaneously;
  if yes, the scene schema (not this record) must define the hosting node.
- Whether the grid snapshot path is eventually retired for scene-backed leaves
  or kept alongside as a fallback under `bitty --safe`.
- The exact Core type that owns scene validation and submission, and its name.
- How scene-backed content interacts with the damage model when only part of a
  scene changes (full-scene repaint versus a bounded invalidation rectangle).
- Whether browser surfaces eventually adopt the Scene path or keep their own
  presenter; the browser panel direction is owned elsewhere.
- The semantics mapping required for accessibility, and its performance budget.

## Acceptance criteria

1. A reviewer confirms the direction is stated as a candidate resolution and
   that no accepted text was edited.
2. The gap-analysis row links to this record, and the record links back.
3. The verification plan names render-path evidence, not only library tests.
4. A security reviewer signs the "no new authority, bounded input, single
   submitter" properties before any acceptance.

## P0 Review Sign-off

**Required before acceptance.** This decision selects where untrusted
declarative content enters the paint path; the review must confirm the four
security properties above and that no `P0` acceptance criterion is weakened.
Recorded as `P0`-adjacent, not yet signed.

## References

- [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) — confirmed
  gap rows and the prioritized list this decision addresses.
- [Rich Presentation RFC](rich-presentation-rfc.md) — `SceneNode` contract and
  budgets.
- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted panel contract.
- [Panel Placement Decision](panel-placement-decision.md) — leaf rect and
  identity split.
- [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) —
  semantics mapping requirement.
- [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md) — cost
  attribution categories.
