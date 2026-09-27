---
title: Overlay Ownership and Composition Reconciliation
description: Records the three-owner overlay boundary, the OverlayTier and OverlayKind composition rules, and the single modal authority that the terminal corpus did not previously state
category: specifications
audience: maintainer
document_type: specification
status: draft
website_publish: true
sidebar_order: 41
---

# Overlay Ownership and Composition Reconciliation

> Status: **draft**. This record closes a documentation gap, not an
> implementation one: `bitty-ui` carries an accepted three-owner overlay
> decision in code (`CTX-0482` / `bitty` #763) and a typed `OverlayTier`
> paint-order model, while the terminal corpus describes only the accepted
> `4+1` envelope in the [Panel Runtime RFC](panel-runtime-rfc.md#overlay-41).
> The composition rules between tiers and kinds, and the single modal
> authority, were recorded in code comments and tests but not in any canonical
> document. This record states them in the corpus, composed with the accepted
> contracts, so the upcoming RFCs do not re-derive them. It accepts nothing,
> promotes nothing to **Verified** or **Compatible**, and changes no accepted
> text.

## Purpose and scope

Three overlay-shaped mechanisms exist in the workspace today. They are
frequently conflated in review because all three are called "overlay", yet
each owns exactly one concern and they never share state:

1. **Geometry** — `LayoutNode::Overlay` and `OverlayTier` own base-plus-overlay
   bounds and paint-tier order. Never modal, never keyboard-owning, never
   mutated by the overlay manager.
2. **Presentation stacking and modal exclusivity** — `OverlayManager` owns the
   `4+1` envelope (`OverlayKind`, bounded text, `modal_active`). It is the
   single modal authority for panel overlays.
3. **Requested per-leaf display mode** — `PresentationMode` owns the requested
   display mode of one leaf (`Tiled`, `Floating`, `Fullscreen`, `Scratchpad`)
   and maps to a tier only as a presentation annotation.

In scope: the ownership boundary between the three, the `OverlayTier` and
`OverlayKind` vocabularies and their composition rules, the single modal
authority chain, bounds, and the rule that a new overlay feature extends one of
these owners rather than adding a fourth system or a parallel modal gate.

Out of scope and owned elsewhere: the accepted `4+1` envelope, overlay focus
behavior, and the rule that overlay geometry derives from the `Window` logical
area rather than a panel rect (accepted,
[Panel Runtime RFC](panel-runtime-rfc.md#overlay-41)); presentation-mode
transition gating and the `Tiled`-only live state (accepted,
[Workspace Compositor](workspace-compositor.md)); the chrome surfaces that
consume overlays for notifications and global surfaces (candidate,
[Chrome Surface Contract](chrome-surface-contract-candidate.md)); the IME
candidate picker as an input concern (draft,
[Input and Pointer Contract](input-pointer-rfc.md)).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 3 (presentation never Terminal Truth), invariant 4 (no hot-path
  execution), and invariant 7 (bounded inputs).
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): the `4+1` envelope
  (at most one modal overlay per `Window`, `OverlayBusy` on a second request,
  non-modal bounded by `max_overlays_per_window`), overlay focus ownership
  until dismissal, and the rule that an overlay never mutates grid, scrollback,
  or attachment.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted):
  `OverlayTier` paint-order contract (`Editor < Float < Popup < Messages`),
  stable ordering, and the rule that decoration geometry stays Core-owned.
- [Performance Budget RFC](performance-budget-rfc.md) (accepted): overlay work
  never creates a periodic timer and composes within the existing frame budget.
- [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md)
  (accepted): durations in `0..=500` ms, closed easing set, reduced motion, and
  `bitty --safe` collapsing to the final committed state; overlay animation is
  not exempt.

## Terminology

| Term            | Meaning in this document                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Overlay tier    | A paint-order band: `Editor` (0), `Float` (1), `Popup` (2), `Messages` (3); same-tier overlays resolve by construction order. |
| Overlay kind    | A semantic class: `Modal`, `NonModal`, `Tooltip`, `Palette`; the kind carries modal exclusivity, not paint order.             |
| Modal authority | The single boolean source that a capture predicate reads to decide whether keys are captured; exactly one per `Window`.       |
| Geometry owner  | `LayoutNode::Overlay`; composes bounds and tier order, holds no modal state.                                                  |
| Stacking owner  | `OverlayManager`; holds the live overlay set, enforces `4+1`, and publishes the modal bit.                                    |
| Envelope        | The bound "at most one modal plus a bounded non-modal count" applied per `Window`.                                            |

## The three owners

### Geometry (`LayoutNode::Overlay`, `OverlayTier`, `OverlayLayer`)

- Owns base node plus overlay node bounds and the paint tier of each layer.
- `OverlayTier` derives `Ord` with `Editor < Float < Popup < Messages`, exposes
  `BOTTOM`/`TOP` constants, and defaults to `Float` for un-tiered legacy
  overlays so old single-overlay output stays byte-identical.
- `overlay_stack` stable-sorts layers by tier, so paint order is deterministic
  regardless of input order; overlays on the same tier resolve by construction
  order (the later-constructed paints above), and hand-nested `Overlay` trees
  keep legacy depth-first order with tiers as annotation only.
- Never modal, never keyboard-owning, never mutated by the stacking owner.

### Stacking and modal exclusivity (`OverlayManager`)

- Owns the live overlay set for one `Window`, the `OverlayKind` of each entry,
  the `4+1` envelope, and the single modal authority bit.
- `OverlayKind` is `Modal`, `NonModal`, `Tooltip`, or `Palette`. A second modal
  request while a modal is active fails with `OverlayBusy` and leaves the first
  in place; non-modal entries are bounded by `max_overlays_per_window`.
- Bounded text: the implementation truncates overlay text at a character
  boundary at 128 chars (`MAX_OVERLAY_TEXT_LEN`) and tooltips at 256 chars
  (`MAX_OVERLAY_TOOLTIP_LEN`), setting a `truncated` flag rather than failing.
- `modal_active` is the **single modal authority for panel overlays**: the
  integration feeds it to `bitty_runtime::Runtime::set_overlay_modal_active`,
  whose bit the app's one capture predicate reads. The manager never paints grid
  truth.

### Requested display mode (`PresentationMode`)

- Owns the requested display mode of a leaf and nothing else. `Floating` and
  `Scratchpad` map to `OverlayTier::Float` as a presentation annotation; the
  mapping is not a stacking decision.
- Transitions stay gated per the accepted compositor; only `Tiled` is live, so
  every cross-mode transition remains a follow-up.
- Never stacks, paints, or captures keys.

## Composition rules

1. **Kind decides exclusivity; tier decides paint order.** The two axes are
   orthogonal: a `Modal` on `Float` paints below a `Messages` banner while still
   owning the modal bit. A feature that needs a new paint band adds a tier; a
   feature that needs a new exclusivity rule adds a kind.
2. **One modal authority per `Window`.** No second modal gate may be introduced:
   capture predicates read the runtime bit published from `modal_active`, never
   a parallel flag owned by an app layer, a panel, or a plugin.
3. **Geometry never changes truth.** Tier order and bounds are presentation;
   neither the tier model nor the manager may mutate grid, cursor, modes,
   scrollback, or `View` attachment, and neither re-enters the
   `LogicalRect -> PTY` resize path.
4. **Deterministic paint order.** For a given set of overlays, paint order is a
   pure function of `(tier, construction order)`; a rendering pass that depends
   on input insertion order is non-conforming.
5. **Bounded by construction.** Text and tooltip lengths, the modal count, and
   the non-modal count are validated at admission; truncation is reported, not
   silent.
6. **Extension rule.** A new overlay feature must extend exactly one of the
   three owners. Adding a fourth overlay system or a parallel modal gate is
   non-conforming and is the failure this reconciliation exists to prevent.
7. **Animation composes with the accepted animation contract.** Overlay
   entrance and exit obey the accepted duration range, easing set, reduced
   motion, and `--safe` collapse; they never interpolate terminal content,
   cursor, selection, or scrollback.

## Chrome and content consumption

- Notification surfaces consume the `Messages` tier; command surfaces consume
  `Palette`; tooltips consume `Tooltip`; panel-owned `ui.overlay` surfaces are
  `NonModal` unless the Panel Runtime contract grants modal scope to the
  specific surface.
- The chrome direction is recorded separately in
  [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md);
  this record fixes only the overlay-side ownership boundary it consumes.

## Security review

Overlay is presentation architecture. This record adds no capability, no host
authority, and no hot-path work; it restates bounded inputs that already exist
(`OverlayBusy`, `max_overlays_per_window`, 128/256-char truncation) and forbids
a parallel modal gate, which is a hardening rule rather than a new surface. A
plugin gains no capture authority: it requests an overlay and the Core stacking
owner decides admission and publishes the bit. No `P0` criterion is affected;
a security reviewer is required only if a future revision grants a plugin-owned
surface modal exclusivity.

## Verification plan

1. A headless test asserting a second modal request returns `OverlayBusy` and
   leaves the first modal's bounds, text, and kind unchanged.
2. A headless test asserting `overlay_stack` output depends only on
   `(tier, construction order)` — same set, two insertion orders, identical
   result.
3. A test asserting overlay text and tooltip truncation happen at a character
   boundary with `truncated` set, and that neither exceeds the bound.
4. A test asserting exactly one capture predicate reads the modal bit and that
   no second modal gate exists (a source-level assertion over the capture path).
5. A documentation-lint assertion that the corpus contains no second definition
   of overlay ownership after this record lands.

## Alternatives considered

| Alternative                                                  | Trade-off                                                                | Disposition                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Leave the rules in code comments only                        | Zero documentation churn; keeps three RFCs re-deriving the same boundary | Rejected — this is the gap being closed                             |
| Split into three documents, one per owner                    | One owner per page; duplicates the composition section three times       | Rejected — composition is the shared surface                        |
| Define a fourth "unified overlay system"                     | Single nominal owner; would rewrite accepted tier and envelope semantics | Rejected — contradicts the `4+1` envelope and the extension rule    |
| Record only the tier table without the modal authority chain | Smaller change; leaves the capture path undocumented                     | Rejected — the authority chain is the part reviewers conflate today |

## Affected contracts

| Contract                                                                                                                                               | Effect                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [Panel Runtime RFC](panel-runtime-rfc.md) (accepted)                                                                                                   | Unchanged; its `4+1` envelope is restated as consumed, not redefined            |
| [Workspace Compositor](workspace-compositor.md) (accepted)                                                                                             | Unchanged; `OverlayTier` paint-order contract is restated as consumed           |
| [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md) (accepted) | Unchanged; overlay animation composes with it                                   |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)                                                                            | Gains the overlay-side owner it consumes for notifications and global surfaces  |
| [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) (draft)                                                                                | Gains a row recording that the three-owner boundary is now documented, not open |

## Open points

- Whether `Tooltip` and `Palette` need distinct tiers or remain kinds on
  `Popup`; today they are kinds and `Popup` is tier-free of them.
- Whether the non-modal count bound is per `Window` or per `Workspace`; the
  accepted envelope states per `Window` and this record does not widen it.
- Whether a plugin-owned overlay may ever reach `Modal`; the accepted grant
  model (`panel.overlay` under `RFC-OQ-5`) still decides that.
- Whether the chrome rail and the notification area share one tier or two; owned
  by the owner-pending Window Chrome RFC (U-9).
- Whether `Scratchpad`'s `Float` mapping survives the gated presentation-mode
  work; owned by the compositor follow-up.

## Acceptance criteria

1. A reviewer confirms the three-owner boundary matches the code-level decision
   `CTX-0482` / `bitty` #763 without widening it.
2. The composition rules are linked from the Panel Runtime RFC's overlay
   section and from the chrome candidate's consumption note.
3. No second definition of overlay ownership or modal authority exists anywhere
   in the corpus.
4. The tier and kind tables are stated as vocabulary, not as new acceptance;
   acceptance of any change to them requires an RFC amendment.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes. The security review above records that disposition.

## References

- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted `4+1` envelope, overlay
  focus, and the presentation-only rule.
- [Workspace Compositor Specification](workspace-compositor.md) — accepted
  `OverlayTier` paint-order contract and decoration ownership.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  the chrome surfaces that consume overlay tiers.
- [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) — gap rows
  this record updates.
- [Performance Budget RFC](performance-budget-rfc.md) — frame-budget context
  overlays compose within.
