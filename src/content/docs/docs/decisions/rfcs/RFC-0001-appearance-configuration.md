---
title: Appearance Configuration RFC
description: Accepted focus and idle outline color, per-View appearance override, focus/idle outline width, and per-panel background-image contracts plus the remaining appearance knob proposals exposed through init.lua
category: decisions
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 45
---

# Appearance Configuration RFC

> Status: **accepted** on 2026-09-12 by the project initiator (ratification of
> the PR #212 recommended defaults; independent design review APPROVE).
> Acceptance covers the focused/idle outline color contract
> ([OQ-039](../open-questions.md)): the
> `decoration.border_color_focused` / `decoration.border_color_idle` pair, the
> `#RRGGBB` / `#RRGGBBAA` grammar, the resolution order, `live` reload, and the
> `--safe` pair. A 2026-09-12 amendment records the **per-View/per-panel
> appearance override contract** as a reviewed candidate surface
> ([OQ-041](../open-questions.md)): `views.<selector>.*` overrides, precedence,
> inheritance, live reload, fail-closed validation, and safe mode. A later
> 2026-09-12 acceptance amendment (docs `CTX-0163`) **accepts** that per-View
> override contract and the companion **focus/idle outline width contract**
> ([OQ-045](../open-questions.md)): the `views.<selector>.*` selector grammar,
> per-field resolution, per-resolved-`View` contrast, whole-reload fail-closed
> validation, and `--safe` behavior, plus the `decoration.border_width` /
> `_focused` / `_idle` triple, logical-px bounds, live reload, DPI scaling, safe
> `1`/`1`, and the AC-2 non-color cue. A third 2026-09-12 amendment adds the
> **per-panel background-image contract** as an accepted contract
> ([OQ-042](../open-questions.md)): PNG/JPEG/static-WebP formats, bounds BG-1..BG-5
> reused from the accepted image-store corpus (IMG-1..IMG-5) plus the design
> bound BG-6 and present-path bound BG-7, deny-by-default
> path roots, the `fill`/`fit`/`center`/`tile`/`stretch` fit modes, per-`View`
> override interaction, fail-closed whole-reload rejection, and `--safe`
> ignoring image contributions; the plugin-supplied-image sub-question is
> registered as [OQ-049](../open-questions.md). Acceptance is a reviewed
> contract, not implementation evidence: no product code ships and no key is
> supported until `bitty` implements it. This RFC does not accept the label
> position ([OQ-036](../open-questions.md)), base frame/margin-line color
> ([OQ-037](../open-questions.md)), background opacity/blur
> ([OQ-038](../open-questions.md)), or per-panel animation overrides
> ([OQ-043](../open-questions.md)), which remain `Open`; the accepted override
> contract explicitly reserves and rejects their `views.*` fields until those
> questions accept them. Per-surface opacity and blur therefore stay
> unsatisfied by `views.<selector>.opacity`/`blur`; only the resolved
> `window.opacity` scalar remains a usable (whole-window) value. The CTX-0163
> acceptance itself shipped no product code, but the earlier accepted OQ-039
> outline-color pair is now implemented in `bitty` PR #572 (merge commit
> `f83b1e1`, CTX-0340) and is documented in
> [Lua and XDG](../../configuration/lua-and-xdg.md). It does not weaken any
> normative control in the [Security Overview](../../security/overview.md),
> [Threat Model](../../security/threat-model.md), or the
> [Configuration Model RFC](../../specifications/configuration-model-rfc.md).
> The supported-knob entries below are implementation-derived reference read
> read-only from `bitty` `origin/main` `3eb8e0e`; the accepted amendments above
> are reviewed contracts and the remaining knobs are candidate or open.
> The accepted animation contract is
> [RFC-0002](RFC-0002-panel-animations.md). The cross-cutting extension
> architecture is reviewed in the
> [UI Extensibility Architecture](../../specifications/ui-extensibility-architecture.md)
> (candidate).

## Motivation

User direction (bitty `CTX-0335`, 2026-09-11): everything visual should be
configurable from `init.lua` — gap sizes, workspace/tab label position
(top/bottom/left/right), border or margin-line color, background opacity, and
blur amount. Some of these already ship and only need to be documented; others
need a renderer or compositor design and must not be claimed before that design
is reviewed.

This RFC separates the two: it records the already-supported surface as
reference and proposes candidate contracts plus open questions for the rest.

## Purpose and scope

In scope: the appearance portion of the `init.lua` surface, the precedence
between the two gap layers, and candidate contracts for label placement,
frame/color, per-surface opacity, and blur under the existing `ConfigPlan`
validation, layering, attribution, and reload rules.

Out of scope and owned elsewhere: the compositor geometry contract
([Workspace Compositor Specification](../../specifications/workspace-compositor.md)),
the merge/reload mechanics ([Configuration Model RFC](../../specifications/configuration-model-rfc.md)),
theme preset values and their security posture
([Security Overview](../../security/overview.md)), and any shared-memory or
platform-surface contract owned by `bitty-platform` and `bitty-render`.

## Goals and non-goals

Goals:

- one coherent, documented appearance surface with the same fail-closed,
  bounded, source-attributed behavior as the rest of `ConfigPlan`;
- explicit precedence between the cell-unit `layout.*` gaps and the pixel-unit
  `decoration.*` gaps;
- a documented reload class for every knob;
- reviewed decisions, not assumptions, for label placement, color, opacity, and
  blur before any of them ships.

Non-goals:

- no product code and no rendering change in this RFC;
- no plugin- or theme-owned mutation of Core-owned chrome;
- no free-form CSS-like styling or per-pixel control;
- no blur or transparency promise on a platform whose compositor cannot provide
  it.

## Already-supported appearance knobs (implementation reference)

Status: read-only reference from `bitty` `origin/main` `3eb8e0e`. The owning
configuration contract is the
[Configuration Model RFC](../../specifications/configuration-model-rfc.md); the
shipped reference prose is [Lua and XDG](../../configuration/lua-and-xdg.md).
`decoration.content_inset` and the unified `decoration.gaps_in` default are the
`CTX-0333` amendment (`bitty` PR #562, merge commit `9031b3f`); the
focused/idle outline pair is `CTX-0340` (`bitty` PR #572, merge commit
`f83b1e1`); both are merged into `bitty` `origin/main`.

| `init.lua` key                     | Default                   | Range or values              | Reload          |
| ---------------------------------- | ------------------------- | ---------------------------- | --------------- |
| `appearance.theme` (alias `theme`) | `bitty-dark` (alias dark) | preset name or unknown       | live            |
| `font.family`                      | `JetBrainsMono Nerd Font` | non-empty, `<= 128` bytes    | live            |
| `font.size`                        | `12.0`                    | `(0, 128]`                   | live            |
| `font.line_height`                 | `1.375`                   | `[1.0, 2.0]`                 | live            |
| `font.letter_spacing`              | `2.0`                     | `[0.0, 8.0]`                 | live            |
| `window.opacity`                   | `1.0`                     | `[0.0, 1.0]`                 | live            |
| `window.padding`                   | `8`                       | `0..=64` logical px          | live            |
| `window.radius_px`                 | `0`                       | `0..=24` physical px         | live (no-op S0) |
| `layout.gaps_in`                   | `0`                       | `0..=16` cells               | live            |
| `layout.gaps_out`                  | `0`                       | `0..=16` cells               | live            |
| `decoration.gaps_in`               | `6`                       | `0..=32` logical px          | live            |
| `decoration.gaps_out`              | `6`                       | `0..=32` logical px          | live            |
| `decoration.border`                | `2`                       | `0..=8` logical px           | live            |
| `decoration.radius`                | `6`                       | `0..=16` logical px          | live            |
| `decoration.content_inset`         | `6`                       | `0..=32` logical px          | live            |
| `decoration.border_color`          | unset (theme token)       | `#RRGGBB` / `#RRGGBBAA`      | live            |
| `decoration.border_color_focused`  | `#33CCFF`                 | `#RRGGBB` / `#RRGGBBAA`      | live            |
| `decoration.border_color_idle`     | `#595959AA`               | `#RRGGBB` / `#RRGGBBAA`      | live            |
| `scrollbar.mode`                   | `hidden`                  | `hidden` / `always` / `auto` | live            |
| `scrollbar.width`                  | `8`                       | `1..=32` logical px          | live            |

Notes:

- `appearance.theme` wins over the top-level `theme` alias; an unknown preset
  falls back to the built-in default with a logged fallback (CTX-0169/CTX-0180).
  The reload class is `Live` as of the CTX-0295 reconcile test.
- `window.opacity` is **whole-window** opacity from the presentation path; it is
  not a per-surface or background-only knob (see OQ-038).
- `window.radius_px` is currently a parsed no-op (CTX-0241 S0); document it as
  a knob but do not describe a visible rounding effect.
- `decoration.*` values are validated, stored, attributed, and painted: the
  live present path ships the px decoration (`bitty` PR #519 CTX-0294, PR #533
  CTX-0311). The focused/idle outline pair resolves theme token then base
  `decoration.border_color` then the explicit pair, with AC-1/AC-2 fail-closed
  and AC-3 advisory; `bitty --safe` forces `#FFFFFF`/`#808080`.

## Requested knobs and disposition

| Requested knob                                    | Current support                           | Disposition                             |
| ------------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| Gap sizes                                         | `layout.*` (cells) + `decoration.*` (px)  | Supported; document precedence (below)  |
| Workspace/tab label position (T/B/L/R)            | None                                      | Proposal + OQ-036                       |
| Border / margin-line and focus/idle outline color | None; colors live in theme presets only   | OQ-037 proposal; OQ-039 accepted        |
| Background opacity                                | Whole-window `window.opacity` only        | Proposal + OQ-038 (render/compositor)   |
| Blur amount                                       | None                                      | Proposal + OQ-038 (render/compositor)   |
| Per-surface content inset                         | `decoration.content_inset` (all surfaces) | Follow-up from CTX-0333 (linked, below) |

## Gap sizes: supported, precedence documented

The two gap layers are distinct and must not be conflated:

- `layout.gaps_in` / `layout.gaps_out` are integer **cells** and paint as
  background-colored cell bands (CTX-0177/CTX-0240);
- `decoration.gaps_in` / `decoration.gaps_out` are logical **pixels** and are
  Core-owned frame decoration (CTX-0292/CTX-0333).

Candidate clarification (no new key): the effective gap is
`decoration.gap * DPI_scale + layout.gap_cells * cell_axis`, so the two layers
compose. With the default `layout` gaps of `0`, the effective gap is the
`decoration` value. This matches the `CTX-0333` model documented in the
[Workspace Compositor Specification](../../specifications/workspace-compositor.md).

## Label position: proposal (OQ-036)

Candidate: a bounded enum `label.position = "top" | "bottom" | "left" | "right"`,
default `"top"`, with the label bar reserved outside the content rectangle so
grid geometry and hit testing stay unchanged.

Candidate constraints for review:

- placement is per `View` type (terminal, panel, rich) and may be overridden per
  workspace; unknown values fail closed;
- `left`/`right` labels must reserve a bounded horizontal strip; text truncates
  with an ellipsis and never wraps into the terminal grid;
- label content is presentation-only and never Terminal Truth;
- label rendering must not run on the VT hot path and must respect the same
  resource ceilings as other chrome.

Open: whether labels are always-on, opt-in, or driven by the focus/zoom mode;
whether the label bar is Core-owned or theme-provided. Tracked as OQ-036.

## Border and margin-line color: proposal (OQ-037)

Candidate: extend the Core-owned decoration surface with a color knob, for
example `decoration.border_color = "#RRGGBB[AA]"`, defaulting to a theme token
so existing behavior is unchanged. The margin line uses the same color with a
theme-provided alpha.

Candidate constraints for review:

- color parsing is bounded and fail-closed; no CSS selectors, gradients, or
  images;
- the value is Core-owned chrome, not a plugin hook; a project or user layer may
  set it, matching the existing decoration merge class;
- accessibility: the renderer must keep a documented minimum contrast between
  the frame and its content, or the theme must supply a compliant default;
- unknown color spellings fail validation naming `decoration.border_color`.

Open: whether color belongs under `decoration.*`, under a broader
`appearance.*` palette, or is resolved only through theme presets. Tracked as
OQ-037. The focused/idle pair that refines this base color is OQ-039 below.

### Focus and idle outline colors: accepted (OQ-039)

Ratified 2026-09-12 (PR #212 recommended defaults; independent design review
APPROVE). User direction (bitty `CTX-0340`, m0298) asks for distinct focused and
idle panel outlines. Accepted: extend the Core-owned `decoration.*` surface with
a focus/idle color pair so each `View` frame renders a focused outline (accent)
and an idle outline (subtle) without a plugin hook. This refines the base
`decoration.border_color` proposal above instead of replacing it.

Accepted keys:

| `init.lua` key                    | Default     | Values                  | Reload |
| --------------------------------- | ----------- | ----------------------- | ------ |
| `decoration.border_color`         | unset       | `#RRGGBB` / `#RRGGBBAA` | live   |
| `decoration.border_color_focused` | `#33CCFF`   | `#RRGGBB` / `#RRGGBBAA` | live   |
| `decoration.border_color_idle`    | `#595959AA` | `#RRGGBB` / `#RRGGBBAA` | live   |

Accepted resolution order (later wins): theme token (`border.focused`,
`border.idle`) then `decoration.border_color` then the explicit
`decoration.border_color_focused` / `decoration.border_color_idle` pair. The
pair is evaluated per `View` at paint time from Core focus state; a plugin
never sets it.

Reviewer clarification (non-blocking note a): only an explicit user value for a
pair member overrides the resolved `decoration.border_color`; an unset pair
member inherits the base and never silently shadows it. A user who sets only
`decoration.border_color` keeps that color for both focus states.

Value format: canonical `#RRGGBB` or `#RRGGBBAA` (the 8-digit form is RGBA byte
order). Alpha defaults to `FF` when omitted; `#RGB` shorthand is a candidate
for review. Named colors, `rgb()`/`rgba()` function syntax, gradients, images,
and CSS selectors are rejected fail-closed with a diagnostic naming the
offending key. This is stricter than Hyprland, which also accepts `rgba()` and
legacy ARGB integers; Bitty accepts one canonical grammar so merged layers stay
byte-comparable.

Accepted constraints:

- namespacing: the pair lives under the Core-owned `decoration.*` surface with
  the existing scalar-replace, per-field attribution, and `Live` reload class;
- scope: global for all `View` borders by default; the per-`View` override table
  is accepted separately below, not part of this OQ-039 key set;
- theme interaction: a theme preset supplies the token defaults; explicit user
  keys override the preset, and `appearance.theme` reload stays
  `restart-required`;
- safe mode: `bitty --safe` ignores user and preset color values and forces an
  opaque built-in pair (`#FFFFFF` focused, `#808080` idle, alpha `FF`) that
  passes the contrast rules below;
- the base `decoration.border_color` and the pair are presentation-only chrome;
  no plugin or `LayoutProvider` may set them at runtime.

Accepted minimum-contrast rule (resolving the contrast half of OQ-039):

| Rule | Requirement                                                                                                                          | Enforcement                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| AC-1 | focused outline >= 3:1 contrast against the adjacent `Workspace` background (WCAG 2.1 SC 1.4.11 non-text contrast)                   | `ConfigPlan` rejects a violating resolved pair fail-closed                |
| AC-2 | focused outline >= 3:1 against the idle outline, or an enabled non-color focus cue (focused border thickness >= idle + 1 logical px) | `ConfigPlan` rejects a violating pair unless the non-color cue is enabled |
| AC-3 | idle outline >= 1.5:1 contrast against the background                                                                                | `bitty config check` advisory only; subtlety remains allowed              |

Reviewer note (non-blocking note c, amended 2026-09-12): AC-2 depends on a
non-color focus cue (focused border thickness >= idle + 1 logical px). That
cue is now **accepted** as the outline-width contract below
([OQ-045](../open-questions.md)); it is still not a shipped contract, so until
`bitty` implements it the pair must satisfy focused >= 3:1 against idle. The
cue is no longer an unrecorded gap: AC-2 may be satisfied either by the color
delta or by the accepted non-color cue (the width delta being the natural one),
and enforcement follows the same fail-closed rule. The width keys are
accepted-but-unshipped; this note records the design, not an implementation.

Contrast is computed on the resolved sRGB bytes with the WCAG
relative-luminance formula against the theme surface color at the configured
opacity. The `3:1` value is the WCAG AA non-text threshold; `1.5:1` is a
design-advisory floor accepted here, not a normative accessibility claim.

Resolved for OQ-039: the pair is `decoration.*`; `#RGB` shorthand is not
accepted in v1; a failing idle contrast stays advisory; and safe mode keeps a
distinct idle color (`#808080`). The OQ-039 scope note said per-View-type
overrides were "deferred to a future revision". That sub-question is now
reconciled by the accepted per-View override layer below: the _global_ pair
stays as accepted, and the separately reviewed override contract
([OQ-041](../open-questions.md)) was accepted rather than retroactively
widening OQ-039. `#RGB` shorthand remains deferred follow-up work.

## Focus and idle outline width: accepted (OQ-045)

Direction (user requirement, docs `CTX-0157` follow-up m0313/m0315, 2026-09-12):
the **focused outline width must be configurable**, and every appearance
property must be discussed in this corpus rather than left implicit. The
accepted OQ-039 pair already colors the focused and idle outlines; this section
accepts the matching **width** triple so a focused `View` can read thicker than
an idle one.

Status: **accepted** as a reviewed contract by the 2026-09-12 acceptance
amendment (docs `CTX-0163`, [OQ-045](../open-questions.md)). Acceptance records
a reviewed contract, not implementation evidence: the keys are not supported
until `bitty` implements them, and painting them depends on the same deferred
px-decoration painting as `decoration.border` (`bitty` CTX-0294). No width key
is shipped by this acceptance.

### Keys

Accepted `init.lua` surface (all logical px, matching `decoration.border`):

| Accepted key                      | Default                                                     | Values              | Reload |
| --------------------------------- | ----------------------------------------------------------- | ------------------- | ------ |
| `decoration.border_width`         | inherits `decoration.border` (current accepted default `2`) | `0..=16` logical px | live   |
| `decoration.border_width_focused` | inherits `decoration.border_width`                          | `0..=16` logical px | live   |
| `decoration.border_width_idle`    | inherits `decoration.border_width`                          | `0..=16` logical px | live   |

Accepted resolution order (later wins): the accepted `decoration.border`
value, then `decoration.border_width` (base), then the explicit
`decoration.border_width_focused` / `decoration.border_width_idle` pair. An
unset base or pair member inherits the next-less-specific value and never
silently shadows it, mirroring the accepted OQ-039 color rule. A user who sets
only `decoration.border_width` keeps that width for both focus states.

Accepted constraints:

- **Bounds are fail-closed.** Integer logical px in `0..=16`, a
  deliberately wider ceiling than the accepted `decoration.border` `0..=8`
  range because a focused outline may need to stand out from a thick idle one.
  A value outside `0..=16`, a non-integer, or an unknown key is rejected by
  `ConfigPlan` with a source-attributed diagnostic naming the offending key;
  Core never clamps silently.
- **Live reload, whole-reload fail-closed.** A valid width change is `live`
  and repaints at the next present tick with no grid damage. If any value in
  the reload fails validation, the **entire** reload is rejected: the previous
  resolved geometry stays in effect and no partial or clamped width is
  applied.
- **Safe mode.** `bitty --safe` ignores user and preset width values and forces
  a built-in pair — focused `1`, idle `1` (equal, no width cue) with the
  accepted safe colors `#FFFFFF` / `#808080` — so safe mode never relies on a
  width cue for focus and satisfies AC-2 by color instead. This matches the
  shipped `--safe` decoration invariant that forces `border = 1`. Safe mode
  never leaves an override in effect.
- **DPI scaling.** Values are integers in logical px and are scaled by the
  `Window` DPI factor only at render time, exactly like `decoration.border`;
  layout math stays in logical pixels, and a focused/idle delta of `1` logical
  px stays at least `1` logical px at any DPI. The accepted rule that the
  content rectangle is the frame inset by `border + content_inset` is
  preserved; a focused width change must not move the content grid, so the
  frame is drawn inside the `View` rectangle and the focused delta is absorbed
  by the frame, not by content reflow.
- **Per-View override interaction.** `decoration.border_width`,
  `_focused`, and `_idle` are ordinary fields in the accepted
  `views.<selector>.*` override model below: each resolves **per field per
  `View`** under the same selector tiers and order-independent precedence,
  with unknown fields failing closed. Setting only `border_width_focused` in a
  `views` entry does not reset an inherited `border_width_idle`. AC-1..AC-3
  contrast is evaluated on the resolved per-`View` color pair independently of
  width.
- **Non-color cue for AC-2.** `border_width_focused >= border_width_idle + 1`
  (integers) is the accepted non-color focus affordance the AC-2 rule
  referenced. When the resolved pair has a focused width at least
  `idle + 1` logical px, a focused/idle color pair that fails the `3:1`
  threshold may still satisfy AC-2 through the width cue; otherwise the color
  pair must meet `3:1`. The cue is resolved per `View`, so a per-View width
  override participates in that `View`'s AC-2 evaluation. This closes the
  design half of the AC-2 gap, but it is not implementation evidence: the keys
  stay accepted-but-unshipped until `bitty` ships them.
- **Reference semantics.** This mirrors Hyprland's `border_size` (base),
  `active_border` and `inactive_border` (focused/idle) distinction, adapted to
  Bitty's `View` vocabulary: Bitty keeps one Core-owned `decoration.*`
  namespace, one canonical unit (logical px), and per-field fail-closed
  resolution rather than Hyprland's per-window rule syntax.

### Interaction with OQ-039 and OQ-041

- **OQ-039 (accepted):** the accepted color pair and its AC-1..AC-3 rule are
  unchanged. The width triple only supplies the non-color cue AC-2 already
  allowed.
- **OQ-041 (accepted below):** the width fields join the override field set;
  they do not alter the selector grammar, precedence tiers, or reload rules.
- **OQ-042 (accepted):** the background-image contract accepts the image fields
  as part of the OQ-041 override field set. **OQ-043/OQ-044/OQ-049 (open):**
  per-panel animation overrides, plugin-supplied appearance generally, and
  plugin-supplied images remain separate.

## Per-View and per-panel appearance overrides: accepted (OQ-041)

Direction (user directive, bitty `CTX-0343` / docs `CTX-0157`, 2026-09-12):
every `View` (leaf) and panel surface must support **independent** appearance
properties — per-panel opacity, blur, background image, border/outline color,
and animation options — instead of one global look, so the UI is freer and
plugins can extend it. This is the appearance half of that directive; the
extension-architecture half is the
[UI Extensibility Architecture](../../specifications/ui-extensibility-architecture.md).

Status: **accepted** as a reviewed contract by the 2026-09-12 acceptance
amendment (docs `CTX-0163`, [OQ-041](../open-questions.md)). Acceptance records
a reviewed contract, not implementation evidence: no product code ships and no
`views.*` key is supported until `bitty` implements it. Acceptance reconciles
the layer with the accepted OQ-039 color pair, the accepted OQ-042
background-image contract, and the accepted OQ-045 width triple, and does not
reopen any accepted default. The override layer is **Core-owned user
configuration**; plugin-supplied appearance remains
[OQ-044](../open-questions.md)/[OQ-049](../open-questions.md).

### Selector grammar

The accepted surface is a `views` table keyed by a bounded, closed selector
grammar. Every entry overrides already-defined appearance fields:

```lua
-- Accepted contract only; not a shipped key until bitty implements it.
return {
    views = {
        ["*"] = { border_color_focused = "#33CCFF" },   -- every View
        ["terminal"] = { border_color_idle = "#595959AA" }, -- per ViewContent
        ["rich"] = { border_width_focused = 3 },
        ["browser"] = { background_fit = "fit" },
        ["ws:2"] = { border_width_idle = 1 },           -- per Workspace label
        ["view:7"] = { background_image = "~/wall/one.png" }, -- exact ViewId
    },
}
```

Accepted selector grammar (exactly one of, case-sensitive, no whitespace
inside the key):

| Selector form     | Matches                                           | Accepted value domain                               | Example    |
| ----------------- | ------------------------------------------------- | --------------------------------------------------- | ---------- |
| `"*"`             | every `View` in every `Workspace`                 | the literal `*` only                                | `["*"]`    |
| content type      | every `View` whose `ViewContent` is that type     | `empty`, `terminal`, `rich`, `browser` (closed set) | `terminal` |
| `"ws:<label>"`    | every `View` in the named `Workspace`             | `<label>` = canonical decimal `1..=16`              | `"ws:2"`   |
| `"view:<ViewId>"` | exactly one `View` by its current stable `ViewId` | `<ViewId>` = canonical decimal `1..=2^64-1`         | `"view:7"` |

Grammar rules, all fail-closed at `ConfigPlan` validation with a
source-attributed diagnostic naming the offending key; an invalid selector is
never ignored and never partially matched:

1. The selector set is closed. Any key that is not `*`, a `ViewContent` name,
   `ws:<label>`, or `view:<ViewId>` is rejected. Unknown selector forms,
   unknown content-type names, and unknown `views.*` keys are errors.
2. `ws:<label>` uses the `Workspace`'s stable user-facing label — the numeric
   identity used by `workspace_focus:<1..=16>` and `ctl workspace … ws:N`, not a
   display title. The label is bounded to `1..=16` by the accepted
   workspaces-per-`Window` ceiling in the
   [Terminal Registry and View Lifecycle RFC](../../specifications/terminal-registry-view-lifecycle-rfc.md)
   (`max_workspaces_per_window` in `[1, 16]`); `ws:0`, `ws:17`, a non-integer,
   or a leading-zero spelling is rejected. If a future Workspace-naming feature
   lands, it must not silently change this selector's meaning.
3. `view:<ViewId>` uses canonical decimal without leading zeros, bounded to the
   `u64` `ViewId` range defined in the
   [Workspace Compositor Specification](../../specifications/workspace-compositor.md).
   It matches the `View` that currently holds that `ViewId`; because `ViewId`
   numeric reuse requires a generation bump on disposal, a selector matches a
   live `View` or is inert, never a stale handle.
4. `empty` is accepted for `ViewContent` completeness (a placeholder `View`
   still has a Core frame) but is normally inert because no custom appearance
   is set for it.
5. Within one layer a Lua table has unique keys; across merged layers the
   higher-precedence layer wins per field. The `views` table adds no
   whole-table cap because the selector set is closed and each entry is a
   fixed-shape scalar table; the key set that can match a live `View` is
   bounded by the accepted `View`/`Workspace` ceilings, and the aggregate parse
   is bounded by the Config VM RC-1/RC-2 budgets and PB-1 in
   [ADR 0007](../adrs/ADR-0007-async-gc.md) and the
   [Performance Budget RFC](../../specifications/performance-budget-rfc.md).
   No new numeric ceiling is invented.

### Accepted overridable field set

Every field is optional and defaults to the resolved global value. The accepted
field set is exactly the fields whose global owner is an accepted contract:

| `views.<selector>.<field>` | Global default source                                 | Contract          |
| -------------------------- | ----------------------------------------------------- | ----------------- |
| `border_color`             | `decoration.border_color` (OQ-039 base member, unset) | accepted (OQ-039) |
| `border_color_focused`     | `decoration.border_color_focused` (`#33CCFF`)         | accepted (OQ-039) |
| `border_color_idle`        | `decoration.border_color_idle` (`#595959AA`)          | accepted (OQ-039) |
| `border_width`             | `decoration.border_width` (inherits `border`)         | accepted (OQ-045) |
| `border_width_focused`     | `decoration.border_width_focused`                     | accepted (OQ-045) |
| `border_width_idle`        | `decoration.border_width_idle`                        | accepted (OQ-045) |
| `background_image`         | `decoration.background_image` (unset)                 | accepted (OQ-042) |
| `background_fit`           | `decoration.background_fit` (`"fill"`)                | accepted (OQ-042) |

Reserved fields, rejected fail-closed until their owning question accepts them
(a reserved field present in a `views` entry rejects the whole reload; it is
never silently ignored or partially applied):

| Reserved field | Owner                          | Why reserved                                             |
| -------------- | ------------------------------ | -------------------------------------------------------- |
| `opacity`      | [OQ-038](../open-questions.md) | per-surface opacity needs a renderer/compositor contract |
| `blur`         | [OQ-038](../open-questions.md) | blur needs a compositor/shader and performance budget    |
| `animations`   | [OQ-043](../open-questions.md) | per-panel animation overrides are a separate contract    |

The reserved set is closed: an unknown field is an error, and a reserved field
is an error until the owning OQ is accepted, so this contract cannot be used to
smuggle an unaccepted knob. `border_color` resolves as the accepted OQ-039 base
member; the broader frame/margin-line color question
([OQ-037](../open-questions.md)) stays open and gains no key here. Whole-window
`window.opacity` remains the only opacity value in effect until OQ-038 accepts a
per-surface one.

Field value bounds are the global field's bounds, unchanged:
`#RRGGBB`/`#RRGGBBAA` for colors, integer logical px `0..=16` for widths, the
OQ-042 path/format/bound rules for `background_image`, and the OQ-042 fit enum
for `background_fit`. `decoration.background_image_roots` is global-only and is
**not** in the `views.*` field set, so a per-`View` entry can never widen the
approved roots.

### Precedence and inheritance

Accepted resolution order, later wins, evaluated per field per `View`:

```text
built-in safe defaults
  -> appearance.theme preset tokens
  -> global decoration.* / window.* (and, when accepted, appearance.animations.*)
  -> views["*"]
  -> views["<content-type>"]
  -> views["ws:<label>"]
  -> views["view:<ViewId>"]
```

Rules:

1. Resolution is **per field, not per table**. A later selector that sets only
   `border_width_focused` does not reset an inherited `background_image` or
   `border_color_idle`; an unset field inherits the next-less-specific resolved
   value and never silently shadows it.
2. Selector tiers are ordered `* < content-type < ws: < view:` regardless of
   declaration order in `init.lua`. A `view:` entry always beats a `ws:` entry
   for the same field, so two `init.lua` files that declare the same selectors
   in different order resolve identically. This keeps merged layers
   byte-comparable, matching the
   [Configuration Model RFC](../../specifications/configuration-model-rfc.md).
3. Within a tier at most one selector matches a given `View` (one content type,
   one workspace, one exact `ViewId`), so there is no intra-tier ambiguity and
   no last-declared-wins rule.
4. A `view:<ViewId>` selector follows the `View` across workspace moves because
   `ViewId` is stable for the `View` lifetime; a `Terminal` rebind does not
   change the `View` selector match. `ws:` selectors follow the `Workspace`.
5. The resolved value is presentation-only state on the `Workspace`/`View`
   presentation record; it never enters `bitty-term-state` and never changes
   cell geometry, hit testing, selection, or Terminal Truth.

### Per-View contrast

The accepted OQ-039 contrast rule applies to **each fully resolved per-`View`
pair**, not only the global pair:

- **AC-1** — the resolved focused outline must meet `>= 3:1` contrast against
  the adjacent `Workspace` background.
- **AC-2** — the resolved focused outline must meet `>= 3:1` against the
  resolved idle outline, **or** the resolved non-color cue must hold
  (`border_width_focused >= border_width_idle + 1` logical px, per the accepted
  OQ-045 width triple). A per-`View` width override participates in that
  `View`'s AC-2 evaluation.
- **AC-3** — the resolved idle outline `>= 1.5:1` against the background stays
  advisory only.

A resolved per-`View` pair that violates AC-1 or AC-2 is a validation failure,
not a warning. Enforcement is fail-closed at two bounded points, with no silent
fallback or clamping:

1. During a `ConfigPlan` reconcile, every `views` entry whose target set is
   currently resolvable (`*`, content-type, and any `ws:`/`view:` that matches a
   live `View`/`Workspace`) is resolved against that `View`'s background and
   checked. A violation rejects the **entire reload**; the previous committed
   appearance stays in effect.
2. A `ws:`/`view:` entry whose target does not exist yet is accepted
   structurally (grammar, field, bounds) and stays inert. When it first
   matches — `View` creation, bind, or a workspace move that brings a `View`
   under it — the resolved pair is checked before the appearance is committed.
   A violation fails that `View` creation/bind closed with a source-attributed
   diagnostic; the `View` is never composed with a violating pair, and no
   previously committed appearance is silently rewritten.

Contrast is computed on the resolved sRGB bytes with the WCAG
relative-luminance formula, exactly as the accepted OQ-039 rule specifies.
Because `views.*` can lower contrast per `View`, this rule is what makes the
override layer fail-closed rather than an accessibility bypass.

### Live reload and whole-reload fail-closed validation

The accepted override table follows the existing `ConfigPlan` rules — typed,
bounded, scalar-replace per field with source attribution, and a documented
reload class:

- A change to a value the renderer can hot-apply is `live`; the affected
  `View`s repaint at the next present tick with no grid damage.
- Adding, removing, or editing a `view:`/`ws:` selector is also `live`; it
  re-resolves the affected `View` set without recreating a `View` or
  `Terminal`. A selector that stops matching falls the affected field back to
  its inherited value.
- Removing a field is `live` and restores the inherited value.
- If **any** value in a reload fails validation, the **entire** reload is
  rejected fail-closed: the previous resolved appearance stays in effect and a
  source-attributed diagnostic names the offending key. The renderer never
  applies a partial, clamped, or silently dropped override.
- Unknown fields, reserved fields, malformed selectors, out-of-range widths,
  invalid colors, and OQ-042 image bound/path/format failures are rejected at
  `ConfigPlan` validation, not at paint time.

### Safe mode and override suppression

`bitty --safe` ignores every `views.*` entry, including `"*"`, and reads no
external configuration layer (the shipped safe-mode precedence documented in
the [CLI reference](../../interfaces/cli.md#safe-mode-configuration-precedence)).
It forces the safe global values: the opaque outline pair `#FFFFFF` focused /
`#808080` idle, `border_width`/`_focused`/`_idle` each `1`, opacity `1.0`, no
blur, and no background image. Safe mode never leaves an override in effect,
even one that would pass validation, so a hostile or invalid `views` table
cannot influence safe startup or `config check`.

### Interaction with OQ-039, OQ-042, OQ-043, and OQ-045

- **OQ-039 (accepted):** the accepted global pair and its AC-1..AC-3 rule are
  unchanged and remain the base value; the override layer only refines them per
  `View` and evaluates contrast on the resolved pair.
- **OQ-042 (accepted):** `background_image`/`background_fit` join the field set
  under the accepted image contract; `background_image_roots` stays global
  policy and cannot be widened per `View`.
- **OQ-045 (accepted):** the width triple joins the field set; per-`View` width
  supplies the AC-2 non-color cue.
- **OQ-043 (open, narrowed):** the `animations` field is reserved and rejected.
  The per-panel animation question is now narrowed to whether, and with what
  per-field precedence, an accepted `appearance.animations.*` set may be
  overridden per selector; the selector grammar and precedence tiers above are
  accepted and available for that future revision, so OQ-043 no longer needs to
  redesign the override layer. The global `appearance.animations.*` contract in
  [RFC-0002](RFC-0002-panel-animations.md) is unchanged.
- **Plugin interaction:** the override layer is Core-owned configuration. A
  plugin may not set `views.*`, `decoration.*`, or `window.*` at runtime; the
  authority question for plugin-supplied appearance is
  [OQ-044](../open-questions.md) and is not granted here.

## Background-image contract: accepted (OQ-042)

Status: **accepted** as a reviewed contract on 2026-09-12 (docs `CTX-0159`,
user directives m0309/m0313/m0318). Acceptance resolves the user-configuration
half of [OQ-042](../open-questions.md) and adds no unreviewed ceiling. Of the
numeric bounds below, BG-1..BG-5 alias the accepted image-store limits in the
[Rich Presentation RFC](../../specifications/rich-presentation-rfc.md)
(IMG-1..IMG-5); BG-6 is a design choice (one background image per `View`) and
BG-7 is inherited from present-path evidence; the remaining controls derive from
the Graphics P0 row in the
[Security Overview](../../security/overview.md), abuse case T-02 in the
[Threat Model](../../security/threat-model.md), and
[P0-AC-003/P0-AC-004](../../security/p0-acceptance-criteria.md). It is a
reviewed contract, not implementation evidence: no product code ships and no key
is supported until `bitty` implements it. Whether a plugin may supply an image
remains open and is registered as [OQ-049](../open-questions.md).

Direction: every panel (`View`) must support **independent** appearance,
including a background image (m0309); because a configuration surface is only
usable once it is documented, this contract must be explicit and bounded
(m0313); a later live test will exercise user wallpaper files and image effects
(m0318). The contract therefore fixes the key surface, the trust boundary, and
the fail-closed behavior now, and defers only the plugin-supply sub-question.

### Keys and scope

| `init.lua` key                      | Default         | Values                                                                      | Reload | Scope                                          |
| ----------------------------------- | --------------- | --------------------------------------------------------------------------- | ------ | ---------------------------------------------- |
| `decoration.background_image`       | unset           | bounded path string, `<= 4096` bytes                                        | live   | global default for every `View`                |
| `decoration.background_fit`         | `"fill"`        | `fill` / `fit` / `center` / `tile` / `stretch`                              | live   | global default for every `View`                |
| `decoration.background_image_roots` | `[]` (deny all) | bounded list of directory paths, each `<= 4096` bytes, at most `32` entries | live   | global path policy; not overridable per `View` |

Per-`View` override: `views.<selector>.background_image` and
`views.<selector>.background_fit` join the [OQ-041](#per-view-and-per-panel-appearance-overrides-accepted-oq-041)
override field set. A `views.*` entry may select a path and a fit mode but may
**not** widen the approved roots: `decoration.background_image_roots` is
global-only and is deliberately absent from the `views.*` field set, so a
per-`View` table can never grant a path the global policy denies. No host path
is compiled in; the wallpaper directory a user chooses is configuration or
environment data, never a literal in this corpus or in `bitty`.

### Supported formats

Accepted: **PNG**, **JPEG** (baseline and progressive), and **static WebP**.
Rejected fail-closed, never guessed and never silently reduced to a first frame:
SVG, GIF, AVIF, BMP, TIFF, and every animated or multi-frame container (APNG,
animated WebP, GIF). Rejecting an animated container rather than decoding its
first frame is stricter than the experimental Kitty path (which takes APNG's
first frame) because a configuration surface must not silently substitute
content; the format decision is recorded here as an OQ-042 choice, not as a
reduction of an accepted limit.

### Limits and their provenance

BG-1..BG-5 each alias an accepted `IMG-*` limit; changing one requires an
RFC revision of the source, never silent drift here. BG-6 is a design choice and
BG-7 is inherited from present-path evidence, so neither aliases an `IMG-*`
limit. All arithmetic is overflow-checked.

| ID   | Dimension                                 | Bound                                     | Reused from           |
| ---- | ----------------------------------------- | ----------------------------------------- | --------------------- |
| BG-1 | Max encoded file bytes per image          | `4 MiB`                                   | IMG-1                 |
| BG-2 | Max decoded dimensions per image          | `4096 x 4096`                             | IMG-2                 |
| BG-3 | Max decoded bytes per image               | `64 MiB` (`width x height x 4`, checked)  | IMG-3                 |
| BG-4 | Max aggregate decoded background bytes    | `256 MiB`                                 | IMG-4                 |
| BG-5 | Max decoded background images resident    | `256`                                     | IMG-5                 |
| BG-6 | Max resident background images per `View` | `1`                                       | design                |
| BG-7 | Per-frame background blit budget          | `<= 32` blits, `<= 64 MiB` padded staging | present-path evidence |

BG-4/BG-5 govern a **distinct background cache pool**; it adopts the same
numeric ceilings as the terminal `ImageStore` but does not consume the terminal
graphics IMG-4/IMG-5 budget, so a background image can never displace terminal
graphics. Both pools are charged against the presentation memory budget.

### Pre-allocation rejection and decode path

The load pipeline checks, in order and **before any pixel allocation**:

1. path syntax, canonicalization, approved-root membership, and regular-file
   resolution (path trust below);
2. encoded length `<= BG-1`;
3. image header dimensions parse and satisfy BG-2;
4. decoded byte estimate `width x height x 4` is overflow-checked and
   `<= BG-3`;
5. the container format is one of the accepted static formats and is not
   animated;
6. cache admission satisfies BG-4/BG-5/BG-6.

Exceeding any bound rejects the image with a typed diagnostic naming the key and
performs no large allocation; arithmetic is checked so a hostile header cannot
force an over-budget allocation. Decode runs **off the hot path** (Security
Overview invariant 4): during `ConfigPlan` reconcile or a bounded background
load, never in PTY parse, VT, damage-to-snapshot, or render-per-frame. The cache
is keyed by canonical path plus content identity (size and modification time, or
a content hash); a changed file re-decodes and an unchanged file is reused.
Admission evicts oldest-first, and eviction never removes the image currently
displayed by a `View` without a validated replacement.

### Path trust

Deny by default. A resolved path must be absolute or `~`-anchored, canonicalize,
lie under one of `decoration.background_image_roots`, and resolve to a regular
file. Symlinks are resolved and then re-checked against the roots; devices,
sockets, `/proc`, `/sys`, `/dev`, and non-regular files are rejected. This
reuses the normative deny-by-default resource loader, regular-file, and
approved-location policy in the [Security Overview](../../security/overview.md)
P0 row and [T-03](../../security/threat-model.md), with `platform.image-file`
remaining deny-by-default. A protocol-supplied path never authorizes deletion,
and this contract adds no delete path.

### Fit modes

| `fit`     | Semantics                                                                                    |
| --------- | -------------------------------------------------------------------------------------------- |
| `fill`    | Cover: uniform scale to cover the `View` content rect, preserve aspect ratio, crop overflow. |
| `fit`     | Contain: uniform scale to fit inside the content rect, preserve aspect ratio, letterbox.     |
| `center`  | Native pixel size, centered in the content rect, cropped or letterboxed as needed.           |
| `tile`    | Native pixel size repeated from the top-left, no scaling, clipped to the content rect.       |
| `stretch` | Non-uniform scale to exactly fill the content rect (may distort).                            |

The image paints inside the `View` content rectangle (frame inset by
`border + content_inset`) behind content, is clipped to the `View`, and is scaled
by the `Window` DPI factor from physical image pixels to device pixels. It never
changes cell geometry, hit testing, selection, scroll behavior, or Terminal
Truth (invariant 3, T-13). Alpha is composited under content through the
accepted premultiplied renderer path (`bitty` CTX-0290); per-surface background
opacity and blur remain separate under OQ-038.

### Per-View override interaction

`background_image` and `background_fit` resolve **per field per `View`** under
the OQ-041 selector tiers (`* < content-type < ws: < view:`) and order-
independent precedence. Setting only `background_fit` in a `views` entry does
not reset an inherited `background_image`, and setting only
`background_image` does not reset an inherited `background_fit`. Unknown fields,
unknown selector forms, unknown fit values, and unknown `views.*` keys fail
closed with a source-attributed diagnostic. `decoration.background_image_roots`
is global policy and is not part of the override field set.

### Fail-closed validation (never clamp silently)

Malformed or truncated image data, an unsupported or animated format, a path
outside the approved roots, a non-regular file, an over-BG-1/BG-2/BG-3 image, an
aggregate over BG-4/BG-5, an unknown `fit` value, a non-string path, or an
unknown `views.*` field rejects the **entire reload**. The previous resolved
appearance stays active and a source-attributed diagnostic names the offending
key; Core never clamps, downsizes, truncates, or silently drops one image while
applying the rest. This is the Configuration Model RFC `Rejected` reload class
([Configuration Model RFC](../../specifications/configuration-model-rfc.md))
applied to the OQ-041 override rule.

### Safe mode

`bitty --safe` ignores `decoration.background_image`, `decoration.background_fit`,
`decoration.background_image_roots`, and every `views.*` image field. It opens no
image file and decodes no image (Security Overview invariant 10). Safe mode never
leaves an image contribution in effect, even one that would pass validation.

### Plugin supply and out of scope

A plugin may not set any `decoration.*` or `views.*` background key at runtime;
`platform.image-file` stays deny-by-default with approved-location checks. The
plugin-supplied-image question is **not** resolved here and is registered as
[OQ-049](../open-questions.md). Remote or URL image sources, generated or
procedural images, gradients, and per-pixel shaders are out of scope and
rejected for this contract.

### Verification obligations (future, in `bitty`)

An implementation must provide: a format acceptance/rejection matrix; a
pre-allocation rejection test proving peak memory stays under BG-3; aggregate
eviction holding BG-4/BG-5; a path negative matrix (outside roots, symlink
escape, device/socket/procfs/sysfs/devfs, non-regular files) all denied; fit-mode
geometry and DPI tests; whole-reload fail-closed rejection; a `--safe` test
proving no file is opened and no image decoded; and clipping tests proving no
cell-geometry or Terminal-Truth change. Evidence belongs in `bitty`; this RFC
records the contract only.

### Interaction with OQ-041 and OQ-044

- **OQ-041 (accepted):** the two image fields join the override field set; the
  selector grammar, precedence tiers, reload rules, and per-`View` contrast rule
  are unchanged.
- **OQ-044 (open):** plugin-supplied appearance generally remains open; this
  contract only settles the Core-owned user-configuration path and explicitly
  withholds the plugin image path, which OQ-049 narrows.

Per-surface `opacity` and `blur` stay reserved and rejected in `views.*` until
[OQ-038](#background-opacity-and-blur-proposal-oq-038) accepts them, so the
override layer cannot enable them early.

## Background opacity and blur: proposal (OQ-038)

`window.opacity` already exposes whole-window opacity. Two harder requests
remain:

- **background opacity**: a per-surface or background-only opacity that keeps
  text opaque while the terminal/panel background is translucent. This needs a
  renderer decision on premultiplied compositing and a platform surface with a
  real alpha channel.
- **blur amount**: a bounded blur radius applied behind translucent chrome.
  This needs a compositor integration (for example a Wayland blur protocol on
  Linux, a platform-specific equivalent elsewhere) or a shader pass, plus a
  performance budget.

Candidate direction (design only, not committed):

- keep `window.opacity` as the whole-window scalar;
- add `window.background_opacity` (or a per-surface equivalent) only if the
  renderer can composite it without changing Terminal Truth;
- treat blur as platform-gated and best-effort: an unsupported platform renders
  no blur rather than failing startup; the value is still validated and bounded;
- bound blur radius (for example `0..=32` logical px) and charge it against the
  presentation performance budget (PB-1/PB-2 family).

Because both knobs cross the renderer/compositor boundary, they need an accepted
render or platform contract before any config key ships. Tracked as OQ-038.

## Follow-up from CTX-0333

The `CTX-0333` amendment applies `decoration.content_inset` uniformly to every
surface. A per-surface inset (for example a smaller inset for terminal content
than for panels) is a design decision raised by `bitty` PR #562 and recorded as
an open item in the
[Workspace Compositor Specification](../../specifications/workspace-compositor.md).
It is not part of this RFC's proposed key set until that decision is reviewed.

## Naming, layering, and reload

Candidate conventions for review:

- reuse existing namespaces: `window.*` for window/compositor properties,
  `font.*` for text, `decoration.*` for Core-owned frame chrome, `layout.*` for
  cell layout. Do not introduce a parallel `appearance.*` block for values that
  already have an owner (`appearance.theme` stays the exception).
- every new value follows the `ConfigPlan` rules: typed, bounded, fail-closed,
  scalar-replace with per-field attribution, and a documented reload class;
- values that need a platform surface or renderer pipeline change are
  `restart-required` unless the renderer can hot-apply them;
- no knob grants process authority; appearance stays presentation-only and must
  not become an ambient capability.

## Security review

- Color, opacity, and blur are presentation data, not Terminal Truth, and must
  not mutate grid, cursor, modes, or scrollback.
- Blur and translucency touch the platform compositor surface; they must use an
  existing bounded surface rather than introduce an in-process native plugin or
  an install script.
- Bounded parsing and fail-closed validation apply to every new key; a malformed
  value stops at `ConfigPlan` with a source-attributed diagnostic and never
  degrades silently to an unsafe default.
- Core owns the frame chrome; no plugin may set decoration colors, opacity,
  blur, or a background image at runtime, matching the existing decoration
  ownership rule. A per-View override is Core-owned configuration, not a plugin
  hook; the plugin-supplied appearance question is OQ-044.
- The accepted background-image contract reuses the image trust boundary:
  deny-by-default approved roots, regular-file checks, corpus-reused bounds
  BG-1..BG-5 (plus design bound BG-6 and present-path bound BG-7),
  pre-allocation rejection, off-hot-path decode, a separate background cache
  pool that cannot displace terminal graphics, whole-reload fail-closed
  rejection, and `--safe` opening no file (Security Overview Graphics/P0,
  T-02/T-03, P0-AC-003/004/005).

## Open questions

- **OQ-036** — workspace/tab label bar placement, visibility, ownership, and
  bounds. Still `Open`.
- **OQ-037** — frame/margin-line color contract, namespace, theming, and
  accessibility contrast. Still `Open`; the focused/idle pair below is its
  accepted specialization.
- **OQ-038** — per-surface background opacity and blur compositor/render
  contract, platform gating, and performance budget. Still `Open`.
- **OQ-039** — focused/idle outline color contract: namespace, value format,
  theme interaction, per-surface scope, safe mode, and the AC-1..AC-3
  minimum-contrast rule. **Accepted** 2026-09-12 (see the section above).
- **OQ-041** — per-View/per-panel appearance override contract: selector
  grammar, precedence, inheritance, live reload, fail-closed validation,
  safe-mode behavior, and per-`View` contrast enforcement. **Accepted**
  2026-09-12 (see the section above); the field set, reserved fields, and
  per-`View` contrast rule are fixed here.
- **OQ-042** — per-panel background-image contract: format, size/dimension
  limits, decode path, cache budget, tiling/scaling, path trust, and whether a
  plugin may supply an image. **Accepted** 2026-09-12 for the Core-owned
  user-configuration path (see the section above); the plugin-supply
  sub-question is narrowed into [OQ-049](../open-questions.md) and remains
  open.
- **OQ-043** — per-panel animation override contract: which transition leaves
  may be overridden per selector, precedence, reduced-motion interaction, and
  budget attribution. **Open, narrowed**: the accepted OQ-041 selector grammar,
  precedence tiers, and reload rules now cover the override mechanics; what
  remains is the animation field set and its reduced-motion/budget interaction.
- **OQ-044** — plugin-supplied appearance contract: whether and how a plugin
  may contribute appearance for its own `View`s or content under a capability,
  and the ownership boundary against Core-owned chrome. **Open**.
- **OQ-045** — focus/idle outline-width contract: defaults, `0..=16` bounds,
  per-`View` override resolution, DPI scaling, safe-mode values, and the
  non-color cue it supplies to AC-2. **Accepted** 2026-09-12 (see the section
  above).

[OQ-039](../open-questions.md), [OQ-041](../open-questions.md),
[OQ-042](../open-questions.md), and [OQ-045](../open-questions.md) are accepted
by this RFC; OQ-042's plugin-supply sub-question is registered as
[OQ-049](../open-questions.md). [OQ-036](../open-questions.md),
[OQ-037](../open-questions.md), [OQ-038](../open-questions.md),
[OQ-043](../open-questions.md), and [OQ-044](../open-questions.md) remain
`Open`. Panel open/close, focus-change, and workspace-switch animations are a
separate accepted contract in [RFC-0002](RFC-0002-panel-animations.md) (OQ-040);
they are not part of this RFC's key set. The accepted per-View override layer
and outline-width triple are part of the accepted key set here, but no accepted
key is a supported `init.lua` key until `bitty` implements it. The
background-image contract is accepted, and its `decoration.background_image*`
keys stay unimplemented until `bitty` implements them.

## Ratification note (2026-09-12)

The project initiator ratified the PR #212 recommended defaults; the independent
design review returned APPROVE. The accepted focus/idle defaults are focused
`#33CCFF` (opaque) and idle `#595959AA` (`#RRGGBB` / `#RRGGBBAA`, live reload,
safe-mode `#FFFFFF` / `#808080`); the accepted animation defaults are recorded
in [RFC-0002](RFC-0002-panel-animations.md). This RFC is `accepted`
frontmatter; [OQ-039](../open-questions.md) is closed and
[OQ-036](../open-questions.md), [OQ-037](../open-questions.md), and
[OQ-038](../open-questions.md) remain `Open`. No product code ships with this
acceptance, and no accepted key is a supported `init.lua` key until `bitty`
implements it. Acceptance was independent of implementation; the lifecycle is
`Draft -> accepted -> normative`.

### Amendment note (2026-09-12, per-View overrides)

A later 2026-09-12 amendment recorded the per-View/per-panel override layer as a
reviewed candidate (the section above) and registered
[OQ-041](../open-questions.md), [OQ-042](../open-questions.md),
[OQ-043](../open-questions.md), and [OQ-044](../open-questions.md). It did not
change the accepted OQ-039 defaults and did not make `views.*` a supported key.

### Amendment note (2026-09-12, outline width)

A second 2026-09-12 amendment recorded the focus/idle outline-width triple
(`decoration.border_width` / `_focused` / `_idle`) as a reviewed candidate,
specified the AC-2 non-color cue, and registered
[OQ-045](../open-questions.md). It did not change the accepted OQ-039 color
defaults or contrast rule and did not make any width key supported.

### Acceptance note (2026-09-12, per-View overrides and outline width)

The 2026-09-12 acceptance amendment (docs `CTX-0163`, Issue #222) **accepts**
the per-View/per-panel appearance override contract and the focus/idle
outline-width contract, closing [OQ-041](../open-questions.md) and
[OQ-045](../open-questions.md) and narrowing
[OQ-043](../open-questions.md) to its animation-specific remainder:

- the closed selector grammar `* < content-type < ws:<1..=16> < view:<ViewId>`,
  with fail-closed rejection of unknown forms, content types, and fields;
- the accepted field set `border_color`/`_focused`/`_idle`,
  `border_width`/`_focused`/`_idle`, `background_image`, and `background_fit`,
  each resolving per field per `View` under order-independent tier precedence
  over the global values;
- the reserved-but-rejected fields `opacity`, `blur`, and `animations` until
  [OQ-038](../open-questions.md) and [OQ-043](../open-questions.md) accept
  them;
- per-resolved-`View` AC-1/AC-2 enforcement with the accepted OQ-045 width cue
  and advisory AC-3;
- `Live` reload for values and match-set changes, whole-reload fail-closed
  rejection preserved, and `--safe` ignoring every `views.*` entry;
- the width triple `0..=16` logical px with the safe `1`/`1` pair.

This amendment does not change the accepted OQ-039 color defaults or contrast
rule, does not change the accepted OQ-042 image bounds, does not grant any
plugin-supplied appearance (OQ-044/OQ-049 remain open), and does not make any
key supported. Acceptance is a reviewed contract, not implementation evidence:
the keys stay accepted-but-unshipped until `bitty` implements them.

### Amendment note (2026-09-12, background images)

A third 2026-09-12 amendment accepts the per-panel background-image contract
under docs `CTX-0159` (user directives m0309/m0313/m0318), resolving the
Core-owned user-configuration half of [OQ-042](../open-questions.md): the
`decoration.background_image` / `decoration.background_fit` /
`decoration.background_image_roots` keys, PNG/JPEG/static-WebP formats, bounds
BG-1..BG-5 alias-reused from the accepted image-store corpus (IMG-1..IMG-5)
plus the design bound BG-6 and present-path bound BG-7,
deny-by-default path roots, the `fill`/`fit`/`center`/`tile`/`stretch` fit
modes, the `views.*` per-`View` override interaction, fail-closed whole-reload
rejection, and `--safe` ignoring image contributions. The plugin-supplied-image
sub-question is registered as [OQ-049](../open-questions.md). This amendment is
a reviewed contract, not implementation evidence: no image key is supported and
no product code ships until `bitty` implements them. It does not change the
accepted OQ-039 color contract or the accepted OQ-041/OQ-045 override and width
contracts.

## Compatibility and migration

No behavior changes in this RFC. When a knob is accepted, existing configs
remain valid because every proposed key is additive and defaults preserve the
current appearance; removed or renamed keys would require a migration note under
the [documentation workflow](../../development/documentation-workflow.md).

## Verification obligations (future)

An accepted appearance RFC must define, at minimum: headless tests for
fail-closed validation and bounds of every new key; geometry tests proving label
placement reserves space without changing content grids; renderer tests for
color parsing and contrast; and platform-gated blur tests that degrade
gracefully. For the accepted per-View override layer specifically: tests that
resolution is order-independent across selector tiers and across `init.lua`
declaration order, that an unknown selector form, unknown field, or reserved
field rejects the whole reload fail-closed, that `--safe` ignores every
`views.*` entry, that `ws:`/`view:` match-set changes re-resolve without
recreating a `View`, that a `view:<ViewId>` selector follows a `View` across a
workspace move, and that AC-1/AC-2 are enforced on each resolved per-`View`
pair (including the fail-closed path when an inert selector first matches). For
the accepted outline-width triple: tests for the `0..=16` bound and
whole-reload rejection, that a focused width `>= idle + 1` satisfies AC-2
without the color delta, that the content grid is unchanged by a focused width
change, and that `--safe` forces the `1`/`1` pair. Evidence belongs in `bitty`;
this RFC records the contract only.

## References

- [Configuration Model RFC](../../specifications/configuration-model-rfc.md)
- [Lua and XDG](../../configuration/lua-and-xdg.md)
- [Panel Animations and Effects RFC](RFC-0002-panel-animations.md) (OQ-040)
- [Workspace Compositor Specification](../../specifications/workspace-compositor.md)
- [Security Overview](../../security/overview.md)
- [Interfaces: Rich content](../../interfaces/rich-content.md)
- `bitty` `CTX-0333` / PR #562: unified panel gaps and `content_inset`.
- `bitty` `CTX-0335`: appearance-knobs request this RFC scopes.
- `bitty` `CTX-0343`: per-panel appearance overrides, unblocked by the accepted
  OQ-041 contract.
- `bitty` `CTX-0344`: outline-width implementation, unblocked by the accepted
  OQ-045 contract.
- `bitty` `CTX-0347`: per-`View` background image, unblocked by the accepted
  OQ-041 + OQ-042 contracts.
- Hyprland `border_size` / `active_border` / `inactive_border`: read-only
  semantics reference for the base/focused/idle width distinction.
