---
title: Plugin UI Slot Inventory (Candidate)
description: Candidate slot inventory for plugin UI contributions with per-slot bounds exclusivity and conflict resolution composing the accepted v1 slot set and the terminal chrome contract
category: extensibility
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 28
---

# Plugin UI Slot Inventory (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. The accepted
> [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md) fixes
> the closed slot set, the `SceneNode` subset, the handle model, and the L2
> capability gate (`ui.rich`; `ui.overlay` for the overlay slot). What it does
> not fix is the **per-slot
> inventory**: what each slot is for, its bounds, how many contributors it
> admits, and how a conflict resolves. The
> [Plugin Roadmap](../product/plugin-roadmap.md) records slot inventory and
> conflict resolution as the first candidate capability dimension of
> [OQ-056](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
> This record answers that dimension. It accepts nothing, changes no accepted
> slot, and makes no implementation claim.

## Purpose and scope

A plugin contributes UI by mounting a declarative subtree into one of eight
accepted slots. Until now, only one exclusivity rule was stated (`tabline` is an
exclusive claim; status components compose), and the rest was implicit: how many
overlay contributors fit, what bounds each slot carries, what happens when two
plugins claim one slot, and which surfaces own placement. That ambiguity is a
real integration risk — composition behavior would be discovered by experiment
instead of by contract.

In scope: the per-slot inventory (purpose, contributor multiplicity, bounds,
required capability), the conflict-resolution rules, the relationship between
plugin slots and the terminal chrome surfaces, the interaction with the accepted
handle/generation model, and what a plugin must never assume about a slot.

Out of scope and owned elsewhere: the closed slot set, the `SceneNode` subset,
handle semantics, and `ui.rich`/`ui.overlay` gating (accepted, Plugin API v1 Lua
Surface RFC); host layout, decoration, and chrome geometry (terminal-side, the
terminal chrome surface contract); panel identity, lifecycle, and focus (Panel
Runtime RFC); the `register_panel`/`PanelProvider` exclusion (accepted v1
surface); token names (terminal-side theme token contract).

## Normative sources this specification must not weaken

- [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md)
  (accepted): the closed slot set
  (`terminal | top | bottom | left | right | tabline | statusline | overlay`),
  the v1 `SceneNode` restriction (`Text | Row | Column | List`), the opaque
  generation-owned `block_id` handle, `ui.rich`/`ui.overlay` requirements, the
  exclusive `tabline` claim, composing status components, and the rule that
  host layout owns placement and decoration.
- [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md)
  (accepted): the `RichBlock` replacement rule and the accepted scene limits
  (SCN-1..SCN-5: 2048 nodes per block, depth 32, 256 KiB text per block, 2 MiB
  aggregated rich bytes per terminal, 64 blocks per terminal).
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (accepted):
  manifest capabilities, deny-by-default grants, lazy triggers, and the
  three-level queue budgets.
- [Isolation Resource RFC](../runtime/isolation-resource-rfc.md) (accepted):
  per-plugin resource ceilings a slot contribution may not widen.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 3 (presentation never Terminal Truth), invariant 4 (no hot-path
  execution), and invariant 7 (bounded inputs).
- [Plugin Ecosystem Model](../architecture/plugin-ecosystem-model.md) (draft):
  `Document != View != Panel` and the plugin-versus-Core ownership split.

## Terminology

| Term         | Meaning in this document                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| Slot         | A named region of a host surface into which a plugin may mount a declarative subtree; the accepted set is closed. |
| Contributor  | One mounted subtree in a slot, addressed by its opaque `block_id` handle.                                         |
| Multiplicity | How many contributors a slot admits: exclusive (one), composing (bounded), or layered (bounded, ordered).         |
| Conflict     | A second claimant for an exclusive slot, or a claim that would exceed a composing or layered slot's bound.        |
| Host surface | The Core-rendered surface that owns a slot's placement, decoration, and geometry.                                 |

## Slot inventory

The accepted slot set is closed at eight slots. This inventory adds purpose,
multiplicity, and bounds; it does not add or rename a slot.

| Slot         | Purpose                                              | Multiplicity                 | Required capability      | Bounds                                                                                            |
| ------------ | ---------------------------------------------------- | ---------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `terminal`   | Content composed with a terminal leaf's presentation | Composing, bounded           | `ui.rich`                | Composes with the leaf; never replaces grid, cursor, or scrollback presentation                   |
| `top`        | A strip along the top edge of the window area        | Composing, bounded           | `ui.rich`                | One row-band; host layout owns thickness and placement                                            |
| `bottom`     | A strip along the bottom edge of the window area     | Composing, bounded           | `ui.rich`                | One row-band; the Bar/StatusBar region consumes this slot where configured                        |
| `left`       | A strip along the left edge                          | Composing, bounded           | `ui.rich`                | One column-band; reserved for the rail direction where configured                                 |
| `right`      | A strip along the right edge                         | Composing, bounded           | `ui.rich`                | One column-band                                                                                   |
| `tabline`    | The tab strip surface                                | **Exclusive**                | `ui.rich`                | One declarant; a second claim is a conflict                                                       |
| `statusline` | Status components composed in the Bar                | Composing, bounded           | `ui.rich`                | Capped total segment count with bounded per-module lengths, per the terminal-side status contract |
| `overlay`    | Presentation-only, non-focusable declarative popups  | Layered, bounded and ordered | `ui.rich` + `ui.overlay` | Bounded text; never focusable; never mutates a view or terminal                                   |

Rules for the inventory:

1. **The set is closed and the names are accepted.** This inventory adds no
   slot and changes no spelling; a new slot family requires an RFC revision of
   the accepted surface.
2. **Every contribution is a bounded scene block.** A mounted subtree is a
   `RichBlock` and respects the accepted scene limits (SCN-1..SCN-5: 2048 nodes,
   depth 32, and 256 KiB per block, with the aggregated ceilings where the host
   surface holds blocks for a terminal); no slot exempts a contribution from the
   per-block bounds.
3. **Bounds are per contributor unless stated otherwise.** A composing slot's
   bound is an aggregate; contributions beyond it fail closed rather than
   crowding out an existing contributor.
4. **The `ui.rich` gate covers every slot.** The accepted L2 UI gate requires
   `ui.rich` for `bitty.ui.mount`/`bitty.ui.update` contributions regardless of
   slot, and the `overlay` slot additionally requires `ui.overlay`; a plugin
   without the required grant is denied at mount, not at first render.
5. **Placement stays host-owned.** A plugin never learns or sets absolute
   coordinates, thickness, or decoration; the accepted rule that host layout
   owns placement and decoration applies to all eight slots.
6. **No slot is a focus target.** Nothing mounted through `bitty.ui.mount`
   receives keyboard or IME input; the `overlay` slot is explicitly
   non-focusable and the panel contract owns any future focusable surface.

## Conflict resolution

1. **Exclusive slots reject the second claimant.** A second `tabline` claim
   fails with a typed denial naming the current declarant; the incumbent is
   untouched and the newcomer is not partially mounted.
2. **Composing slots admit contributors in a deterministic declared order.**
   Contributions compose in a declared order — the specific tie-break (manifest
   order, mount order, or a declared priority) is an open point (see Open
   points), and whatever tie-break is chosen, composition is a pure function of
   declaration, never of render timing. The aggregate bound is enforced at
   admission: a claim that would exceed the bound fails closed with a typed
   error.
3. **Layered slots order deterministically.** Overlay contributions carry a
   declared relative order; the tie-break for equal declarations is the same
   open point as composing slots. Paint order is a pure function of the
   declared order, never of render timing.
4. **A denied contribution changes nothing.** A conflict or bound violation
   leaves the slot's existing contributors byte-identical and reports a
   diagnostic naming the slot, the claimant, and the reason.
5. **Conflicts are never resolved by silent replacement.** A later contribution
   never displaces an earlier one. An earlier contribution leaves a slot only
   when its owner releases its handle (the candidate addition in rule 6) or
   when its generation ends, which is the accepted disposition.
6. **Reclaiming is explicit.** Accepted v1 exposes `bitty.ui.mount` and
   `bitty.ui.update` only; a handle is generation-owned and disposed with its
   generation, so an existing contribution normally leaves a slot when its
   owner's generation ends. This record proposes one candidate addition: a
   contributor may release its own handle explicitly. Unmounting another
   plugin's handle is not authorized by any v1 capability and is not proposed
   here.

## Relation to host surfaces

- The terminal-side chrome contract owns the host surfaces that render these
  slots (Bar, rail, tab strip, notification area). This record owns only the
  plugin-facing admission side: which slot exists, who may claim it, and how a
  conflict resolves.
- The terminal slot composes with a terminal leaf's presentation and can never
  replace grid presentation, cursor, or scrollback — the accepted invariant that
  presentation never becomes Terminal Truth.
- The `statusline` slot's module budget is the terminal-side status contract's
  budget; this record does not widen it.
- The overlay slot consumes the terminal-side overlay tiers through the host
  surface; a plugin never selects a tier or a modal kind, and the single modal
  authority stays Core-owned.
- Host layout may relocate or hide a host surface; this record states that a
  plugin's contribution survives as a content source and the plugin is not
  asked to re-mount it. The accepted surface states the corresponding
  disposition for the overlay slot: if the Panel RFC redefines overlays as
  focusable surfaces, the slot remains a content source and the panel contract
  owns focus and routing (the accepted LUA-OQ-11 disposition).

## Security review

Slot contributions are untrusted declarative content admitted by the host. The
properties that matter: every contribution is bounded (block budget, per-block
bounds, slot aggregate), admission is deny-by-default through manifest grants,
a contribution cannot widen a resource ceiling, no slot can mutate Terminal
Truth or receive input, and conflict handling never silently replaces an
existing contributor. A plugin gains no renderer handle, GPU object, native
window, or global coordinate through any slot. No `P0` criterion is affected; a
security reviewer is required if a future revision makes a slot focusable or
admits a new node kind into a slot.

## Verification plan

1. A test asserting a second `tabline` claim is denied with a typed error and
   leaves the incumbent untouched.
2. A test asserting a composing-slot claim that exceeds the aggregate bound is
   denied and leaves existing contributors unchanged.
3. A test asserting layered overlay paint order is a pure function of declared
   order across two mount sequences.
4. A test asserting every mounted contribution consumes exactly one block and
   that an over-budget mount fails closed.
5. A test asserting a contribution in any slot mutates no grid, cursor, mode, or
   scrollback, and receives no keyboard or IME input.
6. A test asserting a mount without the required capability is denied at mount
   time, not deferred to render.

## Alternatives considered

| Alternative                                               | Trade-off                                                                  | Disposition                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| Leave composition implicit and discover it in integration | No document; every conflict becomes an incident                            | Rejected — this is the gap OQ-056 names     |
| Let a later contributor replace an earlier one            | Simplifies "last wins" mental model; silently drops user-visible content   | Rejected — explicit reclamation is required |
| Make `tabline` composing like the others                  | Uniform rule; breaks the accepted exclusive claim                          | Rejected — accepted exclusivity stands      |
| Give slots per-plugin absolute geometry                   | Maximal layout freedom; contradicts host-owned placement and invites leaks | Rejected                                    |
| Add new slots for panel chrome now                        | Convenient; the accepted set is closed until an RFC revision               | Rejected                                    |

## Affected contracts

| Contract                                                                                  | Effect                                                           |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md) (accepted)       | Unchanged; its closed set gains documented per-slot behavior     |
| [Plugin Roadmap](../product/plugin-roadmap.md) (draft)                                    | Its OQ-056 dimension 1 gains a candidate answer                  |
| [Lua UI Component Model (Candidate)](lua-ui-component-model-candidate.md) (candidate)     | Its component library mounts through these slots; bounds compose |
| [UI Extensibility Architecture](../architecture/ui-extensibility-architecture.md) (draft) | Its layer model gains the admission side it assumed              |
| Terminal-side chrome surface contract (draft, bitty-terminal-docs)                        | Supplies the host surfaces this record's slots render into       |

## Open points

- The numeric aggregate bound per composing slot and how it is attributed across
  plugins.
- Whether declaration order is manifest order, mount order, or a declared
  priority, and whether a user may reorder contributions.
- Whether the `terminal` slot's composition may host anything beyond a bounded
  band (for example a sidebar-like column) or stays a single band.
- Whether a denied conflicting claim is surfaced to the user or only to the
  claimant's diagnostics.
- The remaining OQ-056 dimensions (presentation projection, workspace policies,
  events and automation, cross-plugin service bus) — untouched here.
- Whether any future slot family (panel chrome) lands here or in the terminal
  chrome RFC.

## Acceptance criteria

1. A reviewer confirms the inventory adds no slot and changes no accepted
   spelling, bound, or capability requirement.
2. Every rule composes with the accepted handle, budget, and grant model.
3. Conflict behavior is stated as fail-closed and non-replacing.
4. Acceptance happens through the Plugin Platform RFC's successor or an
   OQ-056 capability-dimension review, not by flipping this record's status.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes; the rules tighten admission rather than widen it. The security
review above records that disposition.

## References

- [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md) —
  accepted slot set, node subset, handle model, capability gating.
- [Plugin Roadmap](../product/plugin-roadmap.md) — OQ-056 candidate capability
  dimensions.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) — manifest
  capabilities and grants.
- [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md)
  — `RichBlock` bounds and replacement rule.
- [Lua UI Component Model (Candidate)](lua-ui-component-model-candidate.md) —
  component library composition.
- [Plugin Ecosystem Model](../architecture/plugin-ecosystem-model.md) —
  ownership split and `Document != View != Panel`.
