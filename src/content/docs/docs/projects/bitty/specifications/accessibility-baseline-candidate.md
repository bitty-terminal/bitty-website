---
title: Accessibility Baseline (Candidate)
description: Candidate accessibility baseline for terminal and panel content covering semantics roles focus order announcement and the scene mapping required by non-terminal panels
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 45
---

# Accessibility Baseline (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. The corpus names accessibility in several
> places (the UI runtime's Level 0 mechanism list and Level 2 component duties,
> the UI extensibility layers, the Rich Content interface) but no document
> states what a Bitty surface must provide, what it must never promise, or how
> non-terminal panel content becomes readable. This record states a candidate
> baseline so the panel content path and the chrome contracts have something to
> compose with. Every type name, role name, and key spelling below is a
> candidate spelling.

## Purpose and scope

Bitty is a terminal-first application with three content families: terminal
grids, declarative scene content, and chrome surfaces. Each family has a
different relationship to assistive technology, and today no contract says
what each must expose. This record states the baseline: the required semantics
for scene and chrome content, the rule that terminal grid content is exposed as
text runs with a stated fidelity boundary, focus-order rules that keep chrome
out of the tab order, announcement rules for async state, and the requirement
that motion and theming respect the user's accessibility settings.

In scope: semantics model and required roles for scene content, the terminal
text-run boundary, focus order, announcement policy, contrast and motion
interaction, and the evidence a promotion would require.

Out of scope and owned elsewhere: the `SceneNode` schema and budgets (accepted,
[Rich Presentation RFC](rich-presentation-rfc.md)); the scene consumption path
(draft, [Panel Content Scene Path Decision](panel-content-scene-path-decision.md));
chrome surface inventory (draft,
[Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md));
motion tiers and budgets (draft,
[UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md)); theming
tokens (accepted,
[RFC-0001 appearance configuration](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 3 (presentation never Terminal Truth), invariant 4 (no hot-path
  execution), and the untrusted-content posture.
- [Terminal State RFC](terminal-state-rfc.md) (accepted): what terminal truth
  is; accessibility exposure is a projection and never a second state.
- [Rich Presentation RFC](rich-presentation-rfc.md) (accepted): the declarative
  scene model and its bounds.
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): panel identity, focus
  routing, and the rule that a plugin observes focus only on the cold path.
- [Performance Budget RFC](performance-budget-rfc.md) (accepted): no periodic
  timers and bounded per-frame work.
- [Lua and XDG configuration](../configuration/lua-and-xdg.md) (draft): the
  appearance surface, `appearance.animations.*`, and reduced motion posture.

## Terminology

| Term                 | Meaning in this document                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Semantics projection | A read-only description of a surface's structure (roles, names, states) derived for assistive technology.    |
| Text run             | A contiguous span of terminal cell content exposed as readable text, with a stated fidelity boundary.        |
| Announcement         | A one-shot assistive notification for an async state change (focus move, status update, error).              |
| Tab order            | The order assistive focus traverses interactive elements; chrome is excluded by default.                     |
| Fidelity boundary    | The stated limit of accessibility exposure for terminal content (what is and is not faithfully represented). |

## Rules

1. **Accessibility is a projection, never a second state.** Semantics is derived
   from the surface's own truth (terminal state, scene, chrome segments) and is
   never an authority, never persisted, and never consulted for routing or
   dispatch. It cannot mutate grid, cursor, modes, scrollback, attachment, or
   policy.
2. **Scene content requires a semantics mapping.** Every `SceneNode` kind that
   can appear in a presented scene maps to a role with a name, and interactive
   nodes additionally expose state and activation. A scene path without a
   semantics mapping is non-conformant; the mapping is owned by the
   [Panel Content Scene Path Decision](panel-content-scene-path-decision.md)
   requirement and defined here.
3. **Terminal content is exposed as text runs with a stated fidelity boundary.**
   The projection exposes readable text and the cursor position; it does not
   promise faithful representation of absolute cursor addressing, full SGR
   styling as a semantic structure, graphics protocols, or images. The boundary
   is stated rather than implied, so no reviewer mistakes partial exposure for
   a missing feature.
4. **Chrome is excluded from the tab order by default.** Chrome surfaces
   announce state and expose read-only structure; they are not focus targets,
   matching the rule that chrome never receives keyboard or IME input.
5. **Focus changes announce.** A focus move between panels, views, or overlays
   produces one bounded announcement naming the destination's accessible name.
   Announcements are rate-limited and coalesced; a burst of focus moves must not
   produce a burst of announcements.
6. **Async state announces once per transition.** Status, diagnostics, and
   notification changes announce on transition, not on render; no surface
   announces on a repeating cadence.
7. **Reduced motion and contrast settings are respected.** `reduced_motion`
   collapses animation to the final committed state; a high-contrast posture
   selects theme tokens that satisfy the documented contrast floor. Neither
   setting is plugin-overridable.
8. **Motion and animation never block input.** Animated content never delays
   accessibility exposure of the final state; the final state is available
   immediately, and the animation is decoration.
9. **Semantics work stays off the hot path.** Building or updating the
   projection happens on invalidation, not per keystroke or per PTY read, and
   creates no periodic timer.
10. **No new authority for plugins.** A plugin may describe its own content's
    semantics through the same declarative surface it uses for presentation; it
    cannot assert semantics about another panel, a terminal, or chrome.

## Required mappings (candidate vocabulary)

| Surface element        | Required exposure                                                        |
| ---------------------- | ------------------------------------------------------------------------ |
| Scene text node        | Role `text`, accessible name from content, truncation flagged            |
| Scene list node        | Role `list` with item count, items exposed as children                   |
| Scene table node       | Role `table` with row/column counts; headers exposed where declared      |
| Scene interactive node | Role from its declared purpose (`button`, `input`), state and activation |
| Terminal leaf          | Role `text` region named by title, text runs, cursor position            |
| Bar / rail             | Read-only structure, active item exposed, excluded from tab order        |
| Tab strip              | Role `tablist` with tabs, active tab exposed, excluded from tab order    |
| Notification           | Announcement on transition; no focus capture                             |
| Modal overlay          | Focus confined to overlay; underlying content excluded while modal       |

## Security review

Accessibility exposure is read-only and derived; it adds no capability and no
host surface. Two properties matter: the projection can never become routing
authority, and exposure of one panel's content to assistive technology must not
become a cross-panel read path for plugins (the projection is host-side and is
not published on the Event Bus). No `P0` criterion is affected; a security
reviewer is required if a future revision exposes the semantics tree through
the plugin-facing surface.

## Verification plan

1. A test asserting the semantics projection is derived, read-only, and
   produces no mutation of grid, cursor, modes, or scrollback.
2. A test asserting every presented `SceneNode` kind has a mapped role and that
   an unmapped kind fails closed at validation rather than presenting silently.
3. A test asserting chrome surfaces are absent from the tab order while their
   state is exposed.
4. A test asserting a focus-move burst coalesces into bounded announcements.
5. A test asserting `reduced_motion` collapses animation to the final state and
   that the projection of the final state is available immediately.
6. A test asserting semantics updates are invalidation-driven with no periodic
   timer.

## Alternatives considered

| Alternative                                                         | Trade-off                                                                   | Disposition                                                              |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Defer accessibility to post-1.0 entirely                            | Less scope now; the scene path would ship with no mapping obligation        | Rejected — the obligation must exist before the scene path is accepted   |
| Promise full terminal fidelity (every escape sequence as structure) | Most faithful on paper; unachievable and misleading for graphics and images | Rejected — a stated fidelity boundary is the honest contract             |
| Expose the semantics tree to plugins for decoration                 | Rich plugin possibilities; creates a cross-panel read path                  | Rejected — plugin access is a separate, reviewed decision if ever wanted |
| Fold accessibility into the chrome and scene records                | Fewer documents; both records would half-own the baseline                   | Rejected — the baseline spans terminal, scene, and chrome                |

## Affected contracts

| Contract                                                                            | Effect                                                                  |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Panel Content Scene Path Decision](panel-content-scene-path-decision.md) (draft)   | Its requirement to define a scene semantics mapping is answered here    |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) (draft) | Gains the tab-order exclusion and read-only exposure rules              |
| [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md) (draft)       | Shares the reduced-motion and no-hot-path rules                         |
| [Rich Presentation RFC](rich-presentation-rfc.md) (accepted)                        | Unchanged; its node kinds gain a required mapping                       |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md) (candidate)                  | U-1 accessibility-tree open item gains a candidate baseline; stays open |

## Open points

- The exact role vocabulary and whether it follows an existing platform
  convention by name or by mapping table.
- Whether terminal text runs include styling as an attribute or only text.
- The announcement rate limit and coalescing window.
- The contrast floor value and whether it is a theme-token contract or a
  validation rule.
- How assistive technology attaches on each Tier 1 platform and whether the
  projection is a tree, a stream, or a platform adapter.
- Whether a screen-reader-driven mode (for example, a text-first focus
  traversal inside a terminal leaf) enters scope, and at which milestone.

## Acceptance criteria

1. A reviewer confirms the baseline is stated as a candidate and that every rule
   composes with an accepted source.
2. The scene mapping requirement is linked from the scene path decision.
3. The fidelity boundary is stated explicitly, not implied.
4. Acceptance happens through the owner-pending UI Runtime RFC (U-9, item 1),
   not by flipping this record's status.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes. The security review above records that disposition.

## References

- [Panel Content Scene Path Decision](panel-content-scene-path-decision.md) —
  scene consumption path and its accessibility requirement.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  chrome inventory and focus rules.
- [Rich Presentation RFC](rich-presentation-rfc.md) — scene node kinds.
- [Workspace-Native UI Runtime (Candidate)](ui-runtime-candidate.md) — Level 0
  accessibility tree mechanism and Level 2 component duties.
- [UI Extensibility Architecture](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/architecture/ui-extensibility-architecture.md)
  — plugin-side layer context.
