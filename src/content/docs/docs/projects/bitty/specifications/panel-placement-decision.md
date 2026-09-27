---
title: Panel Placement Decision
description: Draft decision record reconciling the three candidate Panel placement options into one recorded direction with identity migration, focus routing, and persistence consequences
category: specifications
audience: maintainer
document_type: specification
status: draft
website_publish: true
sidebar_order: 40
---

# Panel Placement Decision

> Status: **draft** decision record resolving [`RFC-OQ-3`](panel-runtime-rfc.md#open-questions).
> The accepted [Panel Runtime RFC](panel-runtime-rfc.md) deliberately left Panel
> placement undecided between three options; the candidate
> [Workspace-Native UI Runtime](ui-runtime-candidate.md) leans toward a refined
> Option C without deciding it. This document records the direction that
> reconciles the three options, states what each accepted contract keeps owning,
> and names exactly what a successor acceptance must flip. It does not itself
> accept the contract, promotes nothing to **Verified** or **Compatible**, and
> changes no accepted text; acceptance requires an amendment to the Panel
> Runtime RFC or a successor RFC with independent review.

## Purpose and scope

The accepted Panel Runtime RFC states that it "does **not** decide placement"
and that "Option A is the implementation shape observed today and the research
preference of the [Workspace Compositor Specification](workspace-compositor.md)
candidate Panel model, but that model stays candidate until placement is
accepted; the choice and any `ViewId` versus `PanelId` migration is
[`RFC-OQ-3`](panel-runtime-rfc.md#open-questions)."

That undecided state now blocks more than one workstream: the
[UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) records
"Panel content beyond the character grid" as its second prioritized gap and
needs to know whether panel content rides a `View` leaf or a compositor
sub-surface; the candidate [Panel and Workspace Interaction](panel-workspace-interaction-candidate.md)
PW-5/PW-10 identity persistence and tab-strip directions both assume a stable
visible panel identity distinct from the internal attachment point; and every
`ViewContent::Panel(PanelId)` call site in `bitty` is written against Option A
while the direction prefers Option C.

In scope: the three placement options, the recommended direction, the identity
and migration consequences, focus and input routing consequences, persistence
consequences, the interaction with the accepted `ViewId != TerminalId`
invariant, and the acceptance criteria that would close `RFC-OQ-3`.

Out of scope and owned elsewhere: the Panel Runtime lifecycle, command registry,
overlay, focus, and Event Bus contracts (accepted,
[Panel Runtime RFC](panel-runtime-rfc.md)); the `Workspace -> LayoutTree -> View`
hierarchy, `H`/`V` primitives, and Core-owned decoration (accepted,
[Workspace Compositor Specification](workspace-compositor.md)); the retained
`UiTree`, `WorkspaceScene` layering, and chrome runtime direction (candidate,
[Workspace-Native UI Runtime](ui-runtime-candidate.md)); the non-terminal panel
content path (open, [OQ-051](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  untrusted-by-default posture, invariant 3 (presentation never Terminal Truth),
  invariant 4 (no hot-path execution), and invariant 7 (bounded inputs).
- [Core and Plugin Boundaries](../architecture/core-boundaries.md): the
  mechanism-versus-policy split, Terminal Truth ownership, the declarative UI
  boundary, and the two security domains.
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): `PanelId != ViewId !=
TerminalId`, the `Declared -> Created -> Mounted -> Focused -> Suspended ->
Disposed` lifecycle, `(PanelId, Generation)` addressing with `StaleHandle`
  rejection, focus routing, and the `4+1` overlay envelope.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted): the
  `Instance -> Window -> Workspace -> LayoutTree -> View` hierarchy, the
  no-window-leak rule, Core-owned decoration, and interaction atomicity.
- [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)
  (accepted): `TerminalId != ViewId`, attachment and detachment semantics,
  and `move_terminal` atomicity.

## Terminology

| Term         | Meaning in this document                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `View`       | The `LayoutTree` leaf and internal compositor attachment point with a stable `ViewId`; never conflated with `TerminalId`.                         |
| `Panel`      | The workspace-managed application container and visible application identity with a stable `PanelId`, per the accepted Panel Runtime RFC.         |
| `Activity`   | The unit of navigation and content inside a Panel, managed by an `ActivityStack`; candidate direction only.                                       |
| `Option A`   | Panel as typed `View` content: `ViewContent::Panel(PanelId)` as a fifth variant beside `Empty`, `Terminal`, `Rich`, `Browser`.                    |
| `Option B`   | Panel replaces `View` as the `LayoutTree` leaf, so tree leaves are `PanelId` directly.                                                            |
| `Option C`   | Panel composes beside `View` as a side-car identity, with the `ViewId -> PanelId` binding tracked outside `ViewContent`.                          |
| `Attachment` | The compositor-internal binding between an identity and a concrete layout slot; moving an identity re-parents the attachment, never the identity. |

## The three candidate options and their recorded dispositions

The accepted RFC lists three options verbatim. Their recorded trade-offs are:

| Option   | Shape                                                                    | Recorded trade-off in the accepted RFC                                                             |
| -------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Option A | `ViewContent::Panel(PanelId)` — smallest change; `ViewId` stays the leaf | Preserves generation history; keeps Panel subordinate to `View` in the type system                 |
| Option B | `PanelId` becomes the leaf directly                                      | Strongest typing for non-terminal surfaces, but breaks the accepted `ViewId` generation history    |
| Option C | Panel composes beside `View` as a side-car binding                       | Preserves `View` while allowing panel metadata without widening `ViewContent`; needs a binding map |

The accepted RFC's own alternative table already **rejects Option B** in
substance: "Panel as `LayoutTree` leaf replacing `View` — strongly typed panel
tiling but breaks `ViewId` history and forces `View` churn — Rejected; Option A
(typed `View` content) preserves generation history unless `RFC-OQ-3` decides
otherwise."

## Direction

**Direction (candidate, awaiting acceptance): a refined Option C.** Panel
becomes the user- and plugin-visible application identity, while `View` remains
the internal compositor attachment and compositing primitive.

The recorded direction is deliberately neither pure Option A nor full Option C:

1. **Panel is the application and session identity** (`PanelId`). It survives a
   move across workspaces, a presentation-mode change, and a tab reorder. Its
   PTY, `TerminalId`, and Lua VM survive with it, matching the accepted move
   semantics that "a move is not a copy and state stays single-owned."
2. **`View` remains the internal attachment point** (`ViewId`). It stays the
   `LayoutTree` leaf the accepted compositor defines, keeps its allocation and
   retirement rules, and is **hidden from end users and from plugin Lua APIs** —
   it is never a user-facing target.
3. **The binding is explicit and directional.** A panel is mounted onto a view;
   the mapping is at most one-to-one in the accepted sense (`PanelId` binds to
   an empty `ViewId`), and a move re-parents the binding while preserving both
   identities.
4. **`ViewContent` keeps a `Panel` variant during the transition.** The current
   `ViewContent::Panel(PanelId)` shape is retained as the transitional encoding
   of the same binding rather than being reverted or widened. A future
   amendment may re-express it as the side-car map once the Workspace Scene and
   Panel & Activity RFCs land (U-9); no `ViewId` naming change is performed in
   the transition.
5. **No `ViewId` migration churn.** Adopting this direction changes no existing
   `ViewId` allocation, retirement, or generation rule, and no function accepts
   a `PanelId` where a `ViewId` is expected or the reverse.

The direction is Option C in _identity terms_ (Panel is visible, `View` is
internal) and Option A in _encoding terms_ (the binding rides the existing
`ViewContent` variant until a successor RFC re-expresses it). That split is the
reason this record exists: the two halves have different acceptance owners and
different migration risk.

### Why not the other two

- **Rejected: Option B.** It would demote every existing `LayoutTree` leaf to a
  panel, force the `ViewId` generation history the accepted compositor and the
  [Workspace Panel Invariants](workspace-panel-invariants.md) rely on
  (`WS-INV-1`, `WS-INV-4`, `WS-INV-12`, `WS-INV-15`) to be re-derived, and put a
  plugin-visible identity into the internal tiling structure — widening the
  surface that must stay stable without buying typing that a side-car binding
  does not already give.
- **Insufficient: Option A alone.** It keeps Panel subordinate to `View` in the
  type system, which contradicts the recorded product direction that Panel is
  the visible application identity and `View` is hidden. Encoding alone should
  not decide visibility, and today's call sites are the reason this record keeps
  the A encoding — not a reason to keep the A semantics.

## Consequences

### Identity and naming

- `PanelId`, `ViewId`, `TerminalId`, `RuntimeId`, and `PersistentId` remain
  pairwise-incompatible newtypes with no `From` bridge; this direction adds no
  alias and no integer comparison between them.
- A panel keeps its `PanelId` across a move, a presentation-mode change, and a
  suspend/resume cycle. A tab is a projection of a panel, so reordering tabs
  changes presentation order only and never renames or reorders an identity.
- A `View` may outlive the panel mounted on it and may host a different panel
  afterwards; the reverse is not true — a panel without an attachment is
  suspended, not destroyed.

### Focus and input routing

- Focus routing is unchanged in shape: `Platform -> Router -> focused
View/Panel -> keymap/overlay -> encoder -> PTY (if terminal-backed)`, with
  exactly zero or one focused target per active workspace and MRU re-homing on
  detach or destroy.
- The visible focus target is a `PanelId`; the internal hit-testing rectangle
  remains a `View` rectangle. A focus change still forces a full present and
  never mutates a terminal grid.
- `InputTarget::Panel` remains the routed target when a panel is focused; the
  accepted `route_input(panel_focus, view_focus)` precedence (panel wins over
  view) is retained.

### Persistence

- Workspace save and restore persists the visible identity (panel) and its
  attachment; a restored panel receives a fresh attachment and, for a
  terminal-backed panel, a fresh `TerminalId`/`RuntimeId` under the same
  `PersistentId`, per the accepted rehydration rule.
- The `ViewId` is **not** a persisted contract; persistence that depends on a
  retired numeric `ViewId` reallocation would depend on the open `WS-INV-4`
  retirement gap ([follow-up F-1](workspace-panel-invariants.md#uncovered-and-follow-ups)),
  which this direction does not close.

### Security

- Placement changes no capability, budget, or trust boundary. A panel still
  holds no PTY descriptor, GPU object, or native window handle; the binding map
  is Core-owned presentation state.
- Panel visibility never becomes authority: a visible panel gains no capability
  a suspended one lacks, and moving a panel across workspaces grants nothing.

## Security review

Placement is presentation architecture, not a trust boundary. The direction
adds no capability, no host authority, and no hot-path execution; it preserves
the accepted "a panel holds no PTY descriptor, GPU object, or native window
handle" rule and the invariant that presentation never becomes Terminal Truth.
No `P0` acceptance criterion is affected. A security reviewer is still required
if the acceptance wave re-expresses the binding as a new map that crosses the
plugin boundary, because that would change which identity a plugin may name.

## Verification plan

Conformance with this direction requires, at minimum:

1. An `RFC-OQ-3` acceptance record (amendment or successor RFC) naming the
   chosen option and stating the encoding explicitly.
2. Updated implementation-status rows in [panel-runtime-rfc.md](panel-runtime-rfc.md)
   and the [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md)
   reflecting the same revision.
3. Headless tests asserting: a panel keeps `PanelId` across a workspace move and
   a presentation-mode change; a `View` can host a different panel after the
   first is disposed; a stale `(PanelId, Generation)` call fails closed before
   any grid or PTY access.
4. A persistence test asserting a restored panel receives a fresh
   `TerminalId`/`RuntimeId` under a stable `PersistentId` without depending on
   `ViewId` numeric reuse.

## Alternatives considered

| Alternative                                             | Trade-off                                                                                      | Disposition                                                                        |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Record Option A only, leave identity semantics alone    | Smallest change, no migration; keeps the visible-identity question open indefinitely           | Rejected as insufficient — it leaves the gap the workstreams are blocked on        |
| Record full Option C including the encoding change      | Cleanest end state; forces a `ViewContent` migration and touches every current call site       | Deferred to the successor RFC; encoding change is not required to unblock the work |
| Record Option B                                         | Strongest typing; breaks `ViewId` generation history and the accepted invariants               | Rejected, consistent with the accepted RFC's own alternative table                 |
| Leave placement undecided and unblock via `OQ-051` only | Avoids the identity decision; leaves tab identity, persistence, and chrome targeting ambiguous | Rejected — `OQ-051` is about the content path, not identity                        |

## Affected contracts

| Contract                                                                                | Effect                                                                                        |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [Panel Runtime RFC](panel-runtime-rfc.md)                                               | Closes `RFC-OQ-3` on acceptance; placement section gains the decided option                   |
| [Workspace Compositor Specification](workspace-compositor.md)                           | Candidate Panel model section aligns to the decided identity split; accepted text unchanged   |
| [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md) | Unchanged; `View` keeps its leaf and attachment role                                          |
| [Workspace Panel Invariants](workspace-panel-invariants.md)                             | `WS-INV-*` rows keep their statuses; `WS-INV-4` (F-1) stays open and is not relied upon       |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md) (candidate)                      | U-2's refined-Option-C lean becomes the recorded direction; U-9 successor RFCs own acceptance |
| [Panel and Workspace Interaction](panel-workspace-interaction-candidate.md)             | PW-5 and PW-10 gain a stable identity precondition; their own items stay open                 |

## Open points

- The exact side-car binding representation once U-9's Workspace Scene and Panel
  & Activity RFCs land, and whether `ViewContent::Panel` is retired then or kept
  as the canonical encoding.
- Whether `View` survives as a distinct identity or becomes an anonymous
  attachment slot; this record keeps it distinct but does not foreclose the
  question the candidate UI runtime raises.
- How far `Activity` identity is user-visible, and how the `ActivityStack`
  composes with the accepted focus MRU.
- The persistence format and the composition of panel identity with `PersistentId`
  rehydration, owned by PW-5 and `RFC-OQ-9`.
- The `WS-INV-4` retirement gap remains open; no rule here depends on numeric
  `ViewId` reuse.

## Acceptance criteria

This record is complete when:

1. It is reviewed and linked from the Panel Runtime RFC's `RFC-OQ-3` row and
   from the candidate UI runtime U-2 reconciliation table.
2. The direction is either accepted through an RFC amendment (closing
   `RFC-OQ-3`) or explicitly retained as a candidate with the blocking
   workstreams named.
3. The affected-contracts table matches the actual edits made in the same wave.

## P0 Review Sign-off

Not applicable: this record changes no security boundary, capability, resource
ceiling, or trust decision, and it weakens no normative source it cites. The
security review below records that disposition.

## References

- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted panel identity,
  lifecycle, focus, command, overlay, and Event Bus contract; source of
  `RFC-OQ-3`.
- [Workspace Compositor Specification](workspace-compositor.md) — accepted
  hierarchy, `LayoutTree` primitives, Core-owned decoration, and interaction
  atomicity.
- [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)
  — accepted `ViewId != TerminalId`, attachment, and move semantics.
- [Workspace Panel Invariants](workspace-panel-invariants.md) — the `WS-INV-*`
  invariant set and its uncovered follow-ups.
- [Workspace-Native UI Runtime](ui-runtime-candidate.md) — candidate four-layer
  spatial and identity model, and the U-9 convergence roadmap.
- [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) — prioritized
  gap list and the "Panel content beyond the character grid" item.
- [Panel and Workspace Interaction](panel-workspace-interaction-candidate.md) —
  candidate PW-5 stable identity and PW-10 tab-strip directions.
