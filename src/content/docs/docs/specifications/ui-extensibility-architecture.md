---
title: UI Extensibility Architecture
description: Candidate architecture review of Bitty UI extension points ownership boundaries Lua surface and security bounds for freer per-panel appearance and plugin extensibility
category: specifications
audience: plugin-author
document_type: specification
status: draft
website_publish: true
sidebar_order: 31
---

# UI Extensibility Architecture

> Status: **draft / candidate architecture review** as of 2026-09-12. This
> document records a scoped review requested by docs `CTX-0157` (bitty
> `CTX-0343`) and does not describe implemented behavior, does not authorize
> shipped or compatibility-guaranteed behavior, and does not weaken any
> normative control in the [Security Overview](../security/overview.md),
> [Threat Model](../security/threat-model.md), or
> [Core and Plugin Boundaries](../architecture/core-boundaries.md). It compares
> Bitty with kitty, Ghostty, WezTerm, and Hyprland as read-only philosophy
> references without copying their source, configuration syntax, or wire
> format. Its prioritized changes are explicitly separated into **candidate**
> and **already accepted elsewhere**; nothing here is accepted by this
> document except where it records an acceptance that landed in RFC-0001.
> Related contracts are the per-View override layer (accepted 2026-09-12 in
> RFC-0001) and the accepted per-panel background-image contract in the
> [Appearance Configuration RFC](../decisions/rfcs/RFC-0001-appearance-configuration.md),
> plus the [Panel Extensibility Vision](../product/panel-vision.md) (Draft).

## Purpose and scope

User direction (docs `CTX-0157`, 2026-09-12): the future plugin system should be
easier and freer to extend, every panel should support independent appearance,
and Bitty should stay honest about what is accepted versus candidate. This
document answers three questions:

1. **Where are the extension points today**, and what do they permit?
2. **What should change in Bitty** to most increase plugin freedom, ordered by
   impact, with rationale and risk?
3. **Who owns what** — Core, plugin, or Lua — and what security bounds apply to
   new capabilities such as per-panel background images and plugin-supplied
   appearance?

In scope: extension-point inventory, ownership boundaries, the Lua surface,
prioritized change candidates with rationale and risk, and the security/bounds
analysis for new appearance and panel capabilities.

Out of scope and owned elsewhere:

- the accepted Plugin API v1 surface
  ([Plugin API v1 Lua Surface RFC](plugin-api-v1-lua-surface-rfc.md), accepted)
  and its manifest, capability, and event contracts
  ([Plugin Platform RFC](plugin-platform-rfc.md), accepted);
- the accepted `Workspace`/`LayoutTree` compositor and Core-owned decoration
  ([Workspace Compositor Specification](workspace-compositor.md), accepted);
- the accepted `LayoutProvider` plugin mechanism and its open trait spelling
  (same specification's open items);
- the draft Panel identity, runtime, and event bus
  ([Panel Runtime pre-study](panel-runtime-pre-study.md),
  [Panel Extensibility Vision](../product/panel-vision.md));
- the accepted focus/idle color and animation contracts
  ([RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md),
  [RFC-0002](../decisions/rfcs/RFC-0002-panel-animations.md));
- renderer and platform surface mechanics owned by `bitty-render` and
  `bitty-platform`.

## Normative sources this review must not weaken

- [Security Overview](../security/overview.md): untrusted-by-default posture,
  capability families, invariants 2 (no ambient authority), 3 (presentation,
  never Terminal Truth), 4 (no hot-path execution), 7 (bounded inputs), 8
  (updates cannot silently add capabilities), and 10 (`bitty --safe`).
- [Threat Model](../security/threat-model.md): T-01 resource exhaustion, T-02
  image expansion, T-06/T-07 plugin authority and hot paths, T-10 data flows,
  and T-13 terminal-to-desktop capability gates.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md): mechanism
  versus policy, the primitive-or-composable test, semantic API stability, and
  the two security domains.
- [Plugin system](../extensibility/plugin-system.md): extension levels 1-4,
  register-versus-claim, qualified naming, declarative UI, and the governing
  boundary that plugins alter presentation but never Terminal Truth.
- [Workspace Compositor Specification](workspace-compositor.md): Core-owned
  decoration, pure/deterministic `LayoutProvider` proposals, and no runtime
  mutation of `gaps_in`/`gaps_out`/`border`/`radius`/`content_inset`.

This review selects no threshold that moves a requirement between owners and
creates no bypass.

## Extension-point inventory

The extension surface today is a set of accepted, bounded mechanisms. The
inventory below is implementation-derived reference from `bitty` `origin/main`
and the accepted contract documents; it claims no new behavior.

| Extension point          | Mechanism                                                              | Status                | Authority                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Commands                 | `bitty.commands.register`; qualified IDs, bounded JSON Schema          | Accepted              | [Plugin API v1](plugin-api-v1-lua-surface-rfc.md)                                                                         |
| Events                   | `bitty.events.subscribe`; closed kind set, observation/interception    | Accepted              | [Plugin Platform RFC](plugin-platform-rfc.md)                                                                             |
| Lifecycle                | generation-scoped `plugin.*` events; lazy activation                   | Accepted              | [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md)                                                                     |
| Key suggestions          | `bitty.keymaps.suggest`; user mapping wins                             | Accepted              | [Plugin API v1](plugin-api-v1-lua-surface-rfc.md)                                                                         |
| UI slots                 | `bitty.ui.mount`/`update`; closed slot set, `SceneNode` subset         | Accepted              | [Plugin API v1](plugin-api-v1-lua-surface-rfc.md)                                                                         |
| Terminal observation     | `bitty.terminal.snapshot` semantic scope only                          | Accepted              | [Plugin API v1](plugin-api-v1-lua-surface-rfc.md)                                                                         |
| Services                 | `bitty.services.get`/`provide`; versioned interfaces                   | Accepted              | [Plugin API v1](plugin-api-v1-lua-surface-rfc.md)                                                                         |
| Layout algorithms        | `LayoutProvider` pure geometry proposal                                | Accepted (trait open) | [Workspace Compositor](workspace-compositor.md)                                                                           |
| Rich/declarative content | `SceneNode`/`RichBlock` scene contract                                 | Accepted              | [Rich Presentation RFC](rich-presentation-rfc.md)                                                                         |
| Appearance configuration | `init.lua` `ConfigPlan` keys; theme presets                            | Accepted/partial      | [Configuration Model RFC](configuration-model-rfc.md), [RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md) |
| Panel background image   | `decoration.background_image` / `_fit` / `_image_roots` (contract)     | Accepted (contract)   | [RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md) (OQ-042)                                               |
| Per-View appearance      | `views.<selector>.*` override layer                                    | Accepted (contract)   | [RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md) (OQ-041)                                               |
| Outline width            | `decoration.border_width` / `_focused` / `_idle`, per-View overridable | Accepted (contract)   | [RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md) (OQ-045)                                               |
| Panel providers          | `register_panel`, `PanelId`, panel lifecycle                           | Excluded from v1      | [Plugin API v1](plugin-api-v1-lua-surface-rfc.md)                                                                         |
| Protocol registration    | OSC/APC and structured-output handlers                                 | Excluded from v1      | [Plugin API v1](plugin-api-v1-lua-surface-rfc.md)                                                                         |
| Decoration/annotation    | Level 3 presentation contributions                                     | Excluded from v1      | [Plugin system](../extensibility/plugin-system.md)                                                                        |

Two structural facts follow from the inventory:

1. The **accepted** surface is already broad at Levels 1-2 (commands, events,
   services, declarative UI, semantic observation). Plugin freedom is currently
   limited less by missing Level 1-2 verbs than by three gaps below.
2. The **excluded** surface (Level 3 presentation, Level 4 protocol, panel
   providers) is excluded for good reasons — panel identity is unresolved and
   protocol handlers are high-risk — not merely deferred for convenience.

## Reference comparison

The references below inform terminal semantics and the decoration model. Bitty
does not copy their code or configuration and does not claim equivalence.

| Reference | What it demonstrates                                                                 | Bitty adaptation                                                                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| kitty     | Remote control (`kitten @`), Kittens as overlay programs, tiling layouts             | Validates a `CLI -> IPC -> control` path; Bitty keeps its own IPC/scopes and does not copy the socket protocol.                                                                                            |
| Ghostty   | Small terminal core with a clear config; platform-native rendering                   | Validates keeping Core small and mechanism-only; Bitty adds a governed plugin/workspace layer on top.                                                                                                      |
| WezTerm   | Lua config + mux (`wezterm.mux`), domains, `wezterm cli` verbs                       | Closest config/Lua precedent; Bitty's difference is declarative plugins and a per-View/panel model rather than config-only Lua.                                                                            |
| Hyprland  | Tiling workspace, `gaps_in`/`gaps_out`/`border`/`rounding`, window rules, animations | Bitty imports the philosophy: Core-owned decoration, layout providers, per-surface rules; Bitty `Window` is the OS window and `Workspace`/`View` is the tile, so Hyprland window vocabulary must not leak. |

The unique Bitty model is the identity chain
`Instance -> Window -> Workspace -> LayoutTree -> View -> content` with
`ViewId` distinct from `TerminalId`, where a panel is a `View`-hosted
application surface rather than a native OS window. Any extension design must
speak that vocabulary.

## Ownership boundaries

The authoritative split is mechanism in Core, policy in plugins, and the Lua
surface exposing system semantics rather than Rust internals.

| Concern                  | Core (Rust)                                              | Plugin (Lua)                                          | Forbidden to Lua                      |
| ------------------------ | -------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| Terminal truth           | PTY, VT, grid, cursor, modes, scrollback, input encoding | observe semantic snapshot only                        | any write to grid/cursor/modes        |
| Layout geometry          | `LayoutTree` H/V, validation, commit, decoration         | `LayoutProvider` proposes pure geometry               | decoration values, direct tree writes |
| Chrome and appearance    | frame chrome, colors, opacity, blur, override resolution | may request appearance via a future capability only   | runtime mutation of chrome keys       |
| UI composition           | slot layout, renderer, scene diffing                     | declarative `SceneNode` subtrees in a slot            | renderer/shaders/native windows       |
| Commands/events/services | registry, pipeline, scoping, budgets                     | register/subscribe/provide within generation          | load-order or cross-plugin access     |
| Capabilities             | manifest, grants, enforcement, audit                     | declare and request; fail closed without grant        | ambient filesystem/process/network    |
| Lifecycle                | per-plugin VM, generation, quotas                        | `init.lua` registration; generation-owned resources   | cross-generation handles              |
| Configuration            | `ConfigPlan` typed validation, layering, reload          | own `plugins.<owner>.<name>` settings/store namespace | global appearance/layout keys         |

The dividing line for the appearance work: **Core owns chrome; a plugin may
only ever contribute policy that Core validates and resolves.** The accepted
per-View override layer is user configuration, not a plugin hook.

## Prioritized change candidates

Ordered by expected increase in plugin freedom per unit of risk. Every item is
**candidate** unless marked accepted elsewhere; none is authorized to ship.

### P1 — Per-View/per-panel appearance overrides (accepted)

What: the `views.<selector>.*` override layer in
[RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md), resolving
global defaults to per-`View` border color, outline width, background image and
fit; per-`View` opacity, blur, and animation options remain reserved until
their owning questions accept them.

Why it increases freedom: before acceptance the only look controls were global,
so a plugin or user could not give a terminal a different frame from a rich
panel. Per-View resolution is the smallest change that makes independent looks
possible without touching terminal truth or the layout solver.

Risk: medium. Adds a resolution pass and per-`View` state to the presentation
record; must keep AC-1..AC-2 contrast per resolved pair, stay order-independent,
and remain fail-closed and `--safe`-clean. It must not become an
`is_terminal` branch in Core layout. The outline-width triple
([OQ-045](../decisions/open-questions.md)) joins the field set and supplies the
AC-2 non-color cue (`border_width_focused >= border_width_idle + 1` logical px),
so the appearance layer no longer depends on an unrecorded thickness gap.

Disposition: **accepted** 2026-09-12 under docs `CTX-0163`, closing
[OQ-041](../decisions/open-questions.md) and OQ-045 in
[RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md). Acceptance
is a reviewed contract, not implementation evidence: no `views.*` key is
supported until `bitty` implements it (bitty `CTX-0343`/`CTX-0344`/`CTX-0347`).
The selector grammar, accepted and reserved field sets, per-field precedence,
per-`View` contrast rule, `Live` reload with whole-reload fail-closed
validation, and `--safe` behavior are fixed in RFC-0001; this document does not
restate them.

### P2 — Stable panel identity and a panel provider contract (candidate)

What: resolve the Panel-vs-`View` identity question and define a bounded panel
provider surface (register a panel type, mount content, declare a preferred
presentation mode) behind a capability.

Why it increases freedom: it is the single largest gap. Until a plugin can
create a first-class panel, most "app" plugins are forced into status/overlay
slots. The [Panel Extensibility Vision](../product/panel-vision.md) and
[Panel Runtime pre-study](panel-runtime-pre-study.md) already frame this.

Risk: high. Panel identity, focus routing, input, lifecycle, budgets, and the
event bus are all unresolved; [Workspace Compositor](workspace-compositor.md)
deliberately introduces no `PanelId`. A rushed contract would freeze the wrong
identity model.

Disposition: candidate; blocked on the future Panel RFC. Do not invent
`PanelId` here.

### P3 — Plugin-supplied appearance under a capability (candidate)

What: let a plugin declare appearance contributions for panels it owns (for
example a background image or accent color for its own rich panel), subject to
Core validation and a capability.

Why it increases freedom: distinguishes "Core chrome is untouchable" from
"a plugin may theme its own content". It unlocks branded panels and per-plugin
visual identity without granting Core chrome control.

Risk: medium-high. Opens a path for untrusted presentation input (image decode,
path access, cache pressure) and a privilege-escalation surface if the
contribution can escape the plugin's own `View`s. Requires the (now accepted)
P1 override layer and the accepted P5 image contract first.

Disposition: candidate; tracked as
[OQ-044](../decisions/open-questions.md), with the plugin-image path narrowed to
[OQ-049](../decisions/open-questions.md). Core-owned chrome (`gaps_*`,
`border`, global focus/idle colors) stays off-limits regardless.

### P4 — Per-panel animation overrides (candidate, narrowed)

What: allow the accepted `views.<selector>` layer to override transition
durations and easing per panel, bounded by the accepted RFC-0002 grammar.

Why it increases freedom: a plugin panel may want a different open/close feel
than a terminal, and a user may want to disable motion on one surface.

Risk: low-medium. RFC-0002 already bounds durations and forbids loops; the main
cost is budget attribution and proving frame-on-demand still holds with mixed
per-surface durations.

Disposition: candidate; tracked as
[OQ-043](../decisions/open-questions.md), **narrowed** by the accepted OQ-041
contract: the selector grammar, per-field precedence tiers, reserved-field
rejection, reload, and safe-mode rules are fixed there, so this candidate now
only needs to define the animation field set and its reduced-motion/budget
interaction. The `views.<selector>.animations` field stays reserved and
rejected until OQ-043 accepts it.

### P5 — Background-image contract (accepted)

What: a bounded per-panel background image — format, size, decode, cache, fit,
and path trust.

Why it increases freedom: a concrete, popular per-panel customization and a
useful test of the appearance-contribution pipeline.

Risk: high. Crosses the image/file trust boundary (T-01, T-02,
`platform.image-file`); unbounded decode or filesystem access would be a P0
defect. The accepted contract mitigates this by reusing the accepted image-store
ceilings (IMG-1..IMG-5) for BG-1..BG-5 (BG-6 is a design bound and BG-7 a
present-path bound), denying paths by default, and
rejecting malformed input with a whole-reload failure.

Disposition: **accepted** 2026-09-12 under docs `CTX-0159` for the Core-owned
user-configuration path; see the accepted OQ-042 section in the
[Appearance Configuration RFC](../decisions/rfcs/RFC-0001-appearance-configuration.md).
It reuses the accepted image limits and the deny-by-default file policy. The
plugin-supplied-image sub-question remains open as
[OQ-049](../decisions/open-questions.md), so P3 stays candidate. No key is
supported until `bitty` implements it.

### Already accepted elsewhere (do not re-litigate here)

- Plugin API v1 Level 1 plus minimal Level 2
  ([Plugin API v1](plugin-api-v1-lua-surface-rfc.md)): commands, events,
  services, slots, semantic snapshot.
- `LayoutProvider` as a plugin with pure, deterministic proposals
  ([Workspace Compositor](workspace-compositor.md)).
- Bounded panel animations and accepted focus/idle colors
  ([RFC-0002](../decisions/rfcs/RFC-0002-panel-animations.md),
  [RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md)).
- The Core-owned per-panel background-image contract for user configuration
  ([RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md), OQ-042);
  plugin-supplied images remain open as OQ-049.
- The per-View/per-panel appearance override contract and the focus/idle
  outline-width triple
  ([RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md), OQ-041
  and OQ-045, accepted 2026-09-12; docs `CTX-0163`). The field set, selector
  grammar, precedence, per-`View` contrast, reload, and safe-mode rules are
  fixed there and are not re-litigated here.

## Lua surface

Candidate direction for the appearance and panel work, consistent with the
accepted `bitty` module root (ADR 0009) and the semantic-API rule. None of the
following is a supported key today.

```lua
-- Accepted user-configuration contract only; not shipped until bitty
-- implements it. The accepted field set is border color/width and background
-- image/fit; opacity/blur/animations are reserved until OQ-038/OQ-043 accept.
return {
    views = {
        ["terminal"] = { border_color_focused = "#33CCFF" },
        ["view:7"] = { background_image = "~/wall/one.png" },
    },
}

-- Candidate only; a plugin contributes appearance for its own content.
-- Requires a capability and Core validation, including image bounds.
bitty.ui.appearance(handle, {
    background = { kind = "solid", color = "#101014" },
})
```

Rules the surface must keep:

1. It exposes system semantics, not Rust structures: no renderer, pipeline,
   texture, or grid-object handles.
2. A plugin function that mutates appearance is capability-gated and fails
   closed with a typed denial before any side effect.
3. It cannot set global `views.*`, `decoration.*`, or `window.*`; a plugin may
   only contribute for content it owns.
4. It is presentation-only and never enters the terminal/render/input hot path.

## Security and bounds

New appearance capabilities are presentation data, but background images and
plugin contributions add untrusted input. Required bounds:

| Concern                     | Required control                                                                                                                       | Source                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Background image decode     | Reuse accepted compressed/decoded size, dimension, and image-store budget limits; reject before allocation (accepted BG-1..BG-3, BG-7) | [Security Overview](../security/overview.md) Graphics; T-02        |
| Image path access           | Deny by default; regular-file and approved-root policy; no ambient filesystem authority (accepted `background_image_roots`)            | [Security Overview](../security/overview.md) P0                    |
| Per-panel cache             | Bounded per-`View`/aggregate cache (accepted BG-4..BG-6); fail closed on overflow; never displaces terminal `ImageStore`               | T-01                                                               |
| Plugin appearance authority | Capability-gated, scoped to the plugin's own content, validated by Core; no Core chrome mutation                                       | [Core boundaries](../architecture/core-boundaries.md)              |
| Hot path                    | No appearance resolution in PTY parse, VT, damage-to-snapshot, or render-per-frame path                                                | invariant 4                                                        |
| Fail closed                 | Malformed selector, field, color, or image metadata rejects the reload; never clamps silently                                          | [Configuration Model RFC](configuration-model-rfc.md)              |
| Safe mode                   | `bitty --safe` ignores all overrides and image contributions                                                                           | invariant 10                                                       |
| Contrast                    | Per-resolved-pair AC-1/AC-2 enforcement; idle advisory AC-3                                                                            | [RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md) |

The extension architecture should not add a fourth security domain: it reuses
the accepted `PluginCapabilities` model. Any new capability identifier is a
closed-grammar addition requiring its own reviewed contract.

## Open questions and follow-ups

- [OQ-041](../decisions/open-questions.md): per-View/per-panel appearance
  override contract (selector grammar, precedence, reload, safe mode).
  **Accepted** 2026-09-12 under docs `CTX-0163`; see RFC-0001.
- [OQ-042](../decisions/open-questions.md): per-panel background-image contract
  (format, limits, decode, cache, fit, path trust). **Accepted** 2026-09-12 for
  the Core-owned user-configuration path; plugin supply narrowed to OQ-049.
- [OQ-049](../decisions/open-questions.md): whether and how a plugin may supply
  a per-panel background image under a capability.
- [OQ-043](../decisions/open-questions.md): per-panel animation override
  contract. **Narrowed** by the accepted OQ-041 contract to the animation field
  set and its reduced-motion/budget interaction.
- [OQ-044](../decisions/open-questions.md): plugin-supplied appearance contract
  and the ownership boundary against Core chrome.
- [OQ-045](../decisions/open-questions.md): focus/idle outline-width contract
  (defaults, `0..=16` bounds, per-View override resolution, DPI scaling,
  safe mode, and the AC-2 non-color cue). **Accepted** 2026-09-12 under docs
  `CTX-0163`; see RFC-0001.
- Whether a bounded panel-provider surface belongs in Plugin API `1.x` or a new
  major version, and how it reconciles with the unresolved Panel identity
  question.
- Whether UI composition conflicts (multiple plugins claiming a slot) need a
  resolver contract beyond the accepted `register`/`claim` rules.

## Verification obligations (future)

An accepted revision of this document must define: host-parity checks for every
new Lua identifier; negative capability tests proving denied appearance
mutations and `--safe` ignore overrides; parser/validation tests for selector
and color grammar; image bound and path-policy tests; contrast tests per
resolved pair; and budget tests proving appearance resolution stays out of the
hot path. The accepted OQ-041/OQ-045 contracts add, in `bitty`: order-independent
selector resolution across tiers and declaration orders, whole-reload
fail-closed rejection for unknown/reserved fields and out-of-range values,
`ws:`/`view:` match-set re-resolution without `View` recreation, per-resolved-
`View` AC-1/AC-2 enforcement including the first-match path of an inert
selector, the `0..=16` width bound and `--safe` `1`/`1` pair, and proof that a
focused width change does not move the content grid. Evidence belongs in
`bitty`; this document records direction only.

## References

- [Appearance Configuration RFC](../decisions/rfcs/RFC-0001-appearance-configuration.md)
  (OQ-039, OQ-041, OQ-042, and OQ-045 accepted; OQ-036/OQ-037/OQ-038 remain
  open; OQ-043 narrowed; OQ-044 and OQ-049 remain open).
- [Panel Animations and Effects RFC](../decisions/rfcs/RFC-0002-panel-animations.md)
  (OQ-040 accepted).
- [Workspace Compositor Specification](workspace-compositor.md).
- [Plugin API v1 Lua Surface RFC](plugin-api-v1-lua-surface-rfc.md).
- [Plugin Platform RFC](plugin-platform-rfc.md).
- [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md).
- [Rich Presentation RFC](rich-presentation-rfc.md).
- [Configuration Model RFC](configuration-model-rfc.md).
- [Panel Runtime and Event Bus Pre-Study](panel-runtime-pre-study.md).
- [Panel Extensibility Vision](../product/panel-vision.md).
- [Core and Plugin Boundaries](../architecture/core-boundaries.md).
- [Security Overview](../security/overview.md) and
  [Threat Model](../security/threat-model.md).
- [Documentation workflow](../development/documentation-workflow.md).
- kitty, Ghostty, WezTerm, and Hyprland: read-only philosophy references for
  terminal control, small-core rendering, Lua/mux, and tiling decoration.
  Bitty embeds none of their code and accepts none of their configuration
  syntax.
- docs `CTX-0157` / bitty `CTX-0343`: per-panel independent appearance and
  extensibility-architecture directive this review scopes.
