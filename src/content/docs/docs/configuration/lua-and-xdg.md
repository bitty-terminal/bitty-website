---
title: Lua configuration and filesystem layout
description: Pre-implementation contract for Lua configuration, XDG roots, layering, and cross-platform paths
category: configuration
audience: mixed
document_type: specification
status: draft
website_publish: true
sidebar_order: 10
---

# Lua configuration and filesystem layout

> Status: pre-implementation architecture. Lua is the accepted working
> direction for user configuration. The two-stage configuration plan, layer
> stack, merge rules, reload classification, and project-trust mechanics are
> accepted in [Configuration Model RFC](../specifications/configuration-model-rfc.md)
> (OQ-010, 2026-08-27). Platform path separation, directory contents,
> filenames, and CLI examples remain candidate contracts pending ADRs.

Bitty should offer Neovim-like flexibility—`init.lua`, modules, starter
configurations, profiles, and community distributions—while keeping resolution,
merging, validation, plugin isolation, and reload behavior deterministic.

Configuration and workspace trust requirements are normative in the
[security overview](../security/overview.md) and
[threat model](../security/threat-model.md). The layouts proposed here must not
turn a search path or project file into implicit code execution.

## Accepted direction: use the correct XDG roots

On Linux and BSD, per-user configuration starts at:

```text
$XDG_CONFIG_HOME/bitty/
```

The common default is `~/.config/bitty/`. `$XDG_CONFIG_DIRS` is the ordered set
of system configuration roots such as `/etc/xdg`; it is not the user's primary
configuration directory. User configuration has higher precedence than system
defaults, subject to non-overridable system policy.

Bitty should keep distinct categories distinct:

- **Config** — user-authored configuration and reproducibility files; normally
  `~/.config/bitty/`.
- **Data** — installed plugins, themes, and runtime resources; normally
  `~/.local/share/bitty/`.
- **State** — sessions, layouts, history, crash, and plugin state; normally
  `~/.local/state/bitty/`.
- **Cache** — disposable derived data; normally `~/.cache/bitty/`.
- **Runtime** — sockets, locks, and current-login instance data; under
  `$XDG_RUNTIME_DIR/bitty/`.

Deleting cache must not remove configuration or persistent state. Logout may
remove runtime data. Installed packages must not live in a dotfiles-oriented
configuration directory.

## Candidate user configuration tree

A minimal configuration may contain only:

```text
$XDG_CONFIG_HOME/bitty/
└── init.lua
```

An advanced configuration may use:

```text
$XDG_CONFIG_HOME/bitty/
├── init.lua
├── bitty-plugins.toml
├── bitty-plugins.lock
├── lua/
│   └── config/
│       ├── init.lua
│       ├── options.lua
│       ├── appearance.lua
│       ├── terminal.lua
│       ├── keymaps.lua
│       └── platform.lua
├── plugins/
│   ├── init.lua
│   ├── ui.lua
│   ├── navigation.lua
│   ├── sessions.lua
│   ├── development.lua
│   └── ai.lua
└── profiles/
    ├── minimal.lua
    ├── coding.lua
    └── remote.lua
```

Here `plugins/` contains plugin behavior configuration or declarative imports,
not installed plugin source. The manifest and lock names are candidates; their
package semantics are documented in
[Package management](../extensibility/package-management.md).

## Lua modules without a global runtime path

Status: **accepted direction.**

Bitty should retain the approachable user experience of `init.lua` plus `lua/`
modules.

Status: **candidate contract.**

Module resolution should avoid Neovim's ambient, first-found global
runtime-path semantics.

```text
Config VM  -> $BITTY_CONFIG/lua/
Plugin A VM -> package A module tree
Plugin B VM -> package B module tree
```

`require("config.options")` in the configuration VM resolves user config
modules. A plugin's private `require("internal")` resolves only inside that
plugin. Plugin-to-plugin use goes through declared, versioned host services.

A candidate minimal entry point is:

```lua
-- Candidate API only.
return require("config")
```

And a modular plan could look like:

```lua
-- Candidate API only: lua/config/init.lua
local bitty = require("bitty")

return bitty.config({
    terminal = require("config.terminal"),
    appearance = require("config.appearance"),
    keymaps = require("config.keymaps"),
    plugins = require("config.plugins"),
})
```

Exact module search rules and the built-in `bitty` module API remain open.

## Declarative configuration plan

Status: **candidate contract.**

Official configuration should return data rather than imperatively mutate live
objects during load:

```lua
-- Candidate schema.
return {
    font = {
        family = "JetBrains Mono",
        size = 13,
    },
    window = {
        opacity = 0.95,
        padding = 8,
    },
    terminal = {
        scrollback = 10000,
    },
}
```

The intended lifecycle is:

```text
Lua -> ConfigPlan -> typed validation -> merge -> diff -> reconcile
```

This architecture enables offline validation, effective-config inspection,
source attribution, controlled reload, and deterministic distribution/user
composition. An imperative API may exist for runtime behaviors, but it is not
the default configuration model.

Key mappings likewise should be data describing a command/action and context,
not side effects during module import.

## Layers and precedence

Status: **candidate contract.**

```text
Core defaults
  -> System defaults
  -> Distribution
  -> Profile
  -> User config
  -> Trusted local override
  -> CLI override
```

The later layer wins only according to the schema's merge policy. A candidate
precedence shorthand is:

```text
CLI > local > user > profile > distribution > system > core default
```

System policy is distinct from system defaults and may be non-overridable.
Bitty should not automatically execute arbitrary Lua found across every
`$XDG_CONFIG_DIRS` entry. A safer system layout could separate trusted defaults
and policy:

```text
/etc/xdg/bitty/
├── defaults.lua
└── policy.lua
```

Whether even these files are Lua, a restricted schema, or signed/trusted
modules is an open security decision.

Status: **shipped defaults** for the precedence order and the CLI/env
override mechanics below (read-only from `bitty` `origin/main`,
`crates/bitty-config/src/file.rs` and `crates/bitty-app/src/main.rs`,
CTX-0169/CTX-0180). The settled order is `CLI > file > profile >
defaults`: explicit CLI appearance flags win over the user file
(`init.lua`), which wins over the named profile, which wins over core
defaults. `BITTY_CONFIG` (explicit path) and `BITTY_PROFILE` (profile
name) sit between CLI flags and probed files — CLI wins over env. A
missing explicit `--config`/`BITTY_CONFIG` path, or a
requested-but-missing profile, fails closed instead of falling back.

Status: **shipped safe-mode override** (`bitty` `20519bc`, CTX-0346).
`bitty --safe` short-circuits the entire layer stack above: it selects the
built-in safe effective configuration and reads no external layer, so
`--config`/`BITTY_CONFIG`, profiles, system/distribution layers, and CLI
appearance overrides are all ignored. Every field is attributed to Core
defaults, decoration is forced to `0/0/1/0/0`, and the focused/idle outline
pair to the opaque `#FFFFFF`/`#808080` built-ins. See the safe-mode precedence
table in the [CLI reference](../interfaces/cli.md#safe-mode-configuration-precedence)
and [RFC-0001](../decisions/rfcs/RFC-0001-appearance-configuration.md) (OQ-039).

## Merge semantics

Status: **candidate contract.**

Configuration layers must not rely on arbitrary Lua table concatenation or
load order. Each typed schema field defines how it merges.

Status: **candidate rules.**

- A scalar is replaced by the later layer.
- A structured map uses schema-guided deep merge.
- A plugin set merges by globally unique plugin ID.
- Key mappings merge or resolve by context plus chord.
- A generic list declares replace, append, or merge-by-ID behavior; it never
  concatenates implicitly.

Source metadata should survive merge so that `config show --source` and
developer tools can explain every effective value and conflict.

## Profiles

Status: **shipped defaults** for profile selection, naming, and layering
(read-only from `bitty` `origin/main`,
`crates/bitty-config/src/file.rs`, CTX-0169, issue #271);
**candidate** for multi-parent `extends`.

Shipped mechanics:

- Named profiles live at `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua`.
- Selection is `--profile NAME`, else `BITTY_PROFILE`; a missing, empty, or
  whitespace-only value means no profile.
- Names allow `[A-Za-z0-9_-]` only (no paths, no extensions) and at most 64
  bytes; anything else fails closed. System-wide `XDG_CONFIG_DIRS` is never
  consulted for profiles.
- The profile plan layers UNDER the user file (`init.lua` still wins) and
  under CLI appearance flags (`CLI > file > profile > defaults`, settled in
  [Layers and precedence](#layers-and-precedence)).
- A requested-but-missing or invalid profile fails closed (exit 2); a bare
  launch with no profile request keeps working.

Candidate (unchanged): profile composition via single-parent `extends` chains
with cycle detection; multiple inheritance remains open.

Profiles compose focused changes rather than duplicate an entire config. A
coding profile, for example, may extend a default profile, add development
plugins, and increase scrollback:

```lua
-- Candidate schema: profiles/coding.lua
return {
    extends = "default",
    plugins = {
        { import = "plugins.git" },
        { import = "plugins.development" },
    },
    terminal = {
        scrollback = 50000,
    },
}
```

A candidate launch form is `bitty --profile coding`; its placement in the CLI
grammar remains open.

The shipped launch form is `bitty --profile coding` (or `BITTY_PROFILE=coding`)
as specified above; the grammar-ownership question is closed by that shipment
and only multi-parent `extends` stays open.

## Shipped CLI overrides, setup wizard, and logging defaults

Status: **shipped defaults** (read-only from `bitty` `origin/main`,
`crates/bitty-app/src/main.rs`, CTX-0149/CTX-0180/CTX-0190). These are
reported here as shipped status; they change no normative contract above.

- CLI appearance overrides (CTX-0180): `--theme NAME`, `--font-family NAME`,
  `--font-size PTS`, and `--opacity FLOAT` apply to one launch. They form a
  single `Cli` layer plan over the file and profile values; sibling fields
  keep file values. `--font-size` and `--opacity` are parsed as raw text and
  validated at merge time — invalid values fail closed (exit 2), never
  warn-ignored. Since CTX-0290, `--opacity` below `1.0` scales pixel alpha
  through the shipped premultiplied renderer path; when the surface cannot
  composite premultiplied the window stays opaque (fail-closed).
- Explicit config path: `--config PATH` wins verbatim; else `BITTY_CONFIG`;
  else the XDG default is probed (`$XDG_CONFIG_HOME/bitty/init.lua`,
  fallback `~/.config/bitty/init.lua`, then the `config.lua` alias).
  `bitty config path|check|edit` locates, validates with per-key source
  attribution (`cli/file/profile/default`), and opens the file in
  `$VISUAL`/`$EDITOR` (`vi` fallback).
- Setup wizard (CTX-0149, issue #243): `bitty init [--yes] [--force]` is the
  opt-in first-run writer. `--yes` skips prompts and writes sane defaults
  (a `theme = "dark"` starter with commented gaps, keymap, and selection
  examples); `--force` overwrites an existing file after copying it to
  `<file>.lua.bak` (overwriting any older backup). Without `--force`, an
  existing file is an error, never a silent overwrite. A program literally
  named `init` must be invoked as `bitty -- init ...`. `--yes`/`--force`
  are init-only and ignored by normal startup.
- Quiet logging (CTX-0190): the default stderr level is `Warn` — warnings,
  errors, plus unconditional key user-facing lines (paste confirm/cancel,
  startup summary); per-frame `bitty tick` stats sit at `Debug`/`Trace` and
  stay silent by default. `-v`/`--verbose` (also `BITTY_VERBOSE=1`) selects
  `Debug`; `--log-level error|warn|info|debug|trace|verbose` selects
  directly (`verbose` maps to `Debug`). Precedence is `--log-level`, then
  `--verbose`/`-v`/`BITTY_VERBOSE=1`, then `BITTY_LOG`, then `RUST_LOG`
  (both accept bare levels and `RUST_LOG`-style filters, most verbose wins,
  `BITTY_LOG` preferred), then the quiet default.

Open: whether the CLI appearance flag set grows (for example spacing or
padding flags); the wizard prompt UX and starter-content evolution; and the
exact tick-line format, which remains a diagnostic, not a stable interface.

## Scrollbar overlay (shipped defaults)

Status: **shipped defaults** (read-only from `bitty` `origin/main`,
commit `c49ead1`, CTX-0181, closes `bitty` #281; merged to `bitty`
origin `main`, verified read-only via `merge-base --is-ancestor`).
This section reports the shipped contract only. It changes no normative
contract above and weakens no security control.

Shipped modes (`scrollbar.mode`, default `"hidden"`):

- `"hidden"` — never painted; zero pixels, zero geometry delta, so existing
  layouts stay geometry-neutral.
- `"always"` — overlay thumb painted whenever scrollback exists.
- `"auto"` — thumb revealed on mouse proximity, hover, or drag only.

Shipped geometry: the thumb is painted in the present layer, never into
grid truth. Its geometry derives from scrollback length plus viewport
offset; thumb width is logical pixels scaled by the live DPI factor (like
`window.padding`), default `8`, range `1`–`32` (wider values fail closed).
Engagement (proximity, hover, drag) reuses the existing mouse path, and
drag scrolls through `View::scroll_by`. Hit-testing accounts for panel gaps
(CTX-0177) and padding (CTX-0223); releases over the thumb skip hyperlink
activation.

Shipped config contract:

```lua
-- Shipped schema (CTX-0181, bitty #405).
return {
    scrollbar = { mode = "auto", width = 8 },
}
```

The `scrollbar` table deep-merges while `scrollbar.mode` and
`scrollbar.width` are scalar-replace with per-field source attribution
(`cli`/`file`/`profile`/`default`); system policy may pin either field as
non-overridable. Unknown modes and out-of-range widths fail closed (exit
2), never warn-ignored. Open: exact proximity radius, hover timing, and
whether a CLI flag set grows to cover `scrollbar.*`.

## Shipped layout gaps (panel gaps reference)

Status: **shipped defaults** (read-only from `bitty` `origin/main`,
commit `abde197`, CTX-0240, `bitty` #415; merged to `bitty` origin
`main`, verified read-only via `merge-base --is-ancestor`). This section
is the reference for the shipped gap contract; the merge-class
instantiation stays in the [Configuration Model RFC](../specifications/configuration-model-rfc.md).
It changes no normative contract above and weakens no security control.

Shipped contract (`layout.gaps_in` / `layout.gaps_out`, cells):

- Both fields are `0..=16` cells, default `0` (edge-to-edge tiling).
  Larger values fail closed like every other config bound (threat T-01);
  one cell is about `10`px wide at the default `10x22` cell.
- The solver is content-agnostic: panel leaves flow through the same
  `layout_with_gaps` path as terminal leaves (CTX-0177 algebra reuse).
- Split siblings exclude the `gaps_in` bands, which are painted with the
  theme background every damaged frame; `Gaps::ZERO` is bit-identical to
  legacy tiling.
- Stack (workspace) leaves share the container bounds, so `gaps_in`
  between them is meaningless: a stack gets the `gaps_out` inset only,
  with zero inner gap.

Shipped config contract:

```lua
-- Shipped schema (CTX-0240, bitty #415).
return {
    layout = { gaps_in = 2, gaps_out = 1 },
}
```

Absent `layout` tables (or absent keys within them) mean "this layer says
nothing" and inherit silently. There are no per-panel-type gap overrides.
Open: whether a CLI flag set grows to cover `layout.*`.

## Shipped workspace decoration (Core-owned px reference)

Status: **shipped** — the `6/6/2/6/6` geometry plus `content_inset`, the live
present-path px painting, and the focused/idle outline colors (read-only from
`bitty` `origin/main`, verified read-only via `merge-base --is-ancestor`). This
section is the reference for the shipped decoration surface; the accepted
normative contract is the
[Workspace Compositor Specification](../specifications/workspace-compositor.md)
section "Core-owned gaps, border, radius, and content inset" (accepted
CTX-0118; the CTX-0333 amendment unified the sibling gap to `6` and added
`content_inset`), and the merge-class instantiation stays in the
[Configuration Model RFC](../specifications/configuration-model-rfc.md). It
changes no normative contract above and weakens no security control.

Shipped revisions: `bitty` PR #487 (merge commit `485fbfd`, CTX-0292) shipped
the first config surface; `bitty` PR #562 (merge commit `9031b3f`, CTX-0333)
shipped the unified `6/6/2/6/6` set and `content_inset`; `bitty` PR #519 (merge
commit `638ef81`, CTX-0294) shipped the live present-path px painting and
`bitty` PR #533 (merge commit `3d08d8e`, CTX-0311) added the SDF rounded
fills; `bitty` PR #572 (merge commit `f83b1e1`, CTX-0340) shipped the
focused/idle outline colors.

Shipped contract (`decoration.*`, logical pixels):

| Field                      | Default | Valid range | Owner |
| -------------------------- | ------- | ----------- | ----- |
| `decoration.gaps_in`       | `6` px  | `0..=32` px | Core  |
| `decoration.gaps_out`      | `6` px  | `0..=32` px | Core  |
| `decoration.border`        | `2` px  | `0..=8` px  | Core  |
| `decoration.radius`        | `6` px  | `0..=16` px | Core  |
| `decoration.content_inset` | `6` px  | `0..=32` px | Core  |

Shipped outline colors (CTX-0340, RFC-0001 OQ-039):

| Field                             | Default     | Valid values            | Reload |
| --------------------------------- | ----------- | ----------------------- | ------ |
| `decoration.border_color`         | unset       | `#RRGGBB` / `#RRGGBBAA` | live   |
| `decoration.border_color_focused` | `#33CCFF`   | `#RRGGBB` / `#RRGGBBAA` | live   |
| `decoration.border_color_idle`    | `#595959AA` | `#RRGGBB` / `#RRGGBBAA` | live   |

`decoration.border_color` is the base for both focus states; the two explicit
members override it per state. Resolution order (later wins) is theme token
(`border.focused` / `border.idle`, supplied by the selected preset) then
`decoration.border_color` then the explicit `border_color_focused` /
`border_color_idle` pair. Only an explicitly set pair member overrides the
resolved base; an unset member inherits it and never silently shadows it. The
canonical grammar is `#RRGGBB` or `#RRGGBBAA` (8-digit form is RGBA byte
order); alpha defaults to `FF` when omitted, and `#RGB` shorthand, named
colors, `rgb()`/`rgba()`, gradients, and images are rejected fail-closed with a
diagnostic naming the offending key.

Contrast is enforced on the resolved pair over the preset background
(WCAG 2.1 relative luminance): **AC-1** focused outline >= 3:1 against the
background and **AC-2** focused >= 3:1 against idle are fail-closed at
`ConfigPlan` (AC-2 applies only when the two resolved colors differ, since a
base-only config claims no color-only focus distinction); **AC-3** idle >= 1.5:1
against the background is an advisory reported by `bitty config check` and never
rejects a config. `bitty --safe` ignores user and preset color values and forces
the opaque built-in pair `#FFFFFF` focused / `#808080` idle (alpha `FF`).

The defaults above are the shipped `CTX-0333` set (`6/6/2/6/6` +
`content_inset`), matching the accepted
[Workspace Compositor Specification](../specifications/workspace-compositor.md)
"Core-owned gaps, border, radius, and content inset" contract. The `CTX-0292`
merge commit `485fbfd` shipped the pre-CTX-0333 `4/6/2/6` set without
`content_inset`; the unified `6/6/2/6/6` set and `content_inset` shipped with
`bitty` PR #562 (merge commit `9031b3f`) and are in `bitty` `origin/main`.

- Core owns the surface: the five fields are validated through `ConfigPlan`,
  never proposed by a `LayoutProvider`, and never carried by a `View`, so no
  plugin mutation path exists (accepted contract rules 1-4).
- Unknown keys and out-of-range values fail closed with a source-attributed
  diagnostic; Core never falls back to a silent default when validation
  fails.
- `decoration` deep-merges as a table while each field is scalar-replace
  with per-field source attribution; project layers may set the surface
  because it is presentation-only chrome with no process authority (like the
  scrollbar), and the fields reload `Live`.
- The Core solver is total, deterministic, and saturating: `gaps_out`
  insets the workspace area, `gaps_in` reserves the band between siblings,
  `border` insets each View's content rect, and `radius` is carried as clip
  metadata. Values are logical pixels scaled by the Window DPI factor only
  at render time; an out-of-range live update is rejected fail-closed.
- The shipped live present path paints the px decoration (fractional-cell View
  frames plus the SDF rounded-fill/radius primitive, `bitty` PR #519 CTX-0294
  and PR #533 CTX-0311), so the values are visible behavior, not only carried
  intent.
- `bitty --safe` forces `gaps_in = 0`, `gaps_out = 0`, `border = 1`,
  `radius = 0`, `content_inset = 0` (`0/0/1/0/0`) regardless of user
  configuration (accepted contract rule 6).

Canonical config contract (shipped `CTX-0333` set):

```lua
-- Canonical schema (shipped; CTX-0333, bitty PR #562, in bitty origin/main).
return {
    decoration = { gaps_in = 6, gaps_out = 6, border = 2, radius = 6, content_inset = 6 },
}
```

The `CTX-0292` merge commit `485fbfd` shipped `gaps_in = 4, gaps_out = 6,
border = 2, radius = 6` without `content_inset`; the canonical `6/6/2/6/6` set
and `content_inset` shipped with `bitty` PR #562.

Absent `decoration` tables (or absent keys within them) mean "this layer
says nothing" and inherit silently.

The px decoration is painted on the live present path (`bitty` PR #519
`638ef81`, CTX-0294, plus the CTX-0311 SDF rounded fills in PR #533
`3d08d8e`): `gaps_out` insets the workspace area, `gaps_in` reserves the band
between siblings, `border` insets each View's content rect, and `radius` clips
the frame. The values are validated, stored, attributed, and rendered.

### Decoration px versus layout cells

Two similarly named gap surfaces exist and must not be conflated:

| Surface                           | Unit                 | Default   | Range    | Status                                                         |
| --------------------------------- | -------------------- | --------- | -------- | -------------------------------------------------------------- |
| `layout.gaps_in` / `gaps_out`     | cells (`10x22` each) | `0` / `0` | `0..=16` | shipped; painted by the single-window path (CTX-0177/CTX-0240) |
| `decoration.gaps_in` / `gaps_out` | logical px           | `6` / `6` | `0..=32` | shipped; painted by the live present path (bitty PR #562/#519) |

Also distinct: `decoration.radius` (View frame corner radius, logical px)
versus `window.radius_px` (window corner radius, physical px, S0 parsed no-op,
CTX-0241).

Open: whether a CLI flag set grows to cover `decoration.*`.

## Appearance knobs (supported reference)

Status: **implementation reference** read-only from `bitty` `origin/main`
`3eb8e0e` (the outline and animation rows below were introduced by `f83b1e1`
CTX-0340 and `3c5878e` CTX-0341; the decoration rows by `9031b3f` CTX-0333).
This is the lookup table for the appearance knobs `init.lua` already accepts;
the merge/reload mechanics stay in the
[Configuration Model RFC](../specifications/configuration-model-rfc.md). The
accepted focus/idle outline color contract is the
[Appearance Configuration RFC](../decisions/rfcs/RFC-0001-appearance-configuration.md)
(accepted; OQ-039 focused/idle outline colors closed 2026-09-12 and shipped in
`f83b1e1`; OQ-036 label position, OQ-037 frame color, and OQ-038 opacity and
blur remain `Open`). The accepted animation contract is the
[Panel Animations and Effects RFC](../decisions/rfcs/RFC-0002-panel-animations.md)
(accepted; OQ-040 closed 2026-09-12 and shipped in `3c5878e` CTX-0341).

| Key                         | Default                        | Range or values                    |
| --------------------------- | ------------------------------ | ---------------------------------- |
| `appearance.theme`          | `bitty-dark` (alias `dark`)    | preset name; unknown falls back    |
| `theme` (alias)             | unset                          | `appearance.theme` wins            |
| `font.family`               | `JetBrainsMono Nerd Font`      | non-empty, `<= 128` bytes          |
| `font.size`                 | `12.0`                         | `(0, 128]`                         |
| `font.line_height`          | `1.375`                        | `[1.0, 2.0]`                       |
| `font.letter_spacing`       | `2.0`                          | `[0.0, 8.0]`                       |
| `window.opacity`            | `1.0`                          | `[0.0, 1.0]` whole window          |
| `window.padding`            | `8`                            | `0..=64` logical px                |
| `window.radius_px`          | `0`                            | `0..=24` physical px (no-op S0)    |
| `layout.gaps_in`/`gaps_out` | `0`/`0`                        | `0..=16` cells                     |
| `decoration.*`              | see decoration reference above | logical px                         |
| `scrollbar.mode`/`width`    | `hidden`/`8`                   | `hidden`/`always`/`auto`, `1..=32` |

The built-in preset names, aliases, and dark/light categories are listed in the
[theme preset catalog](themes.md); the full 30-preset catalog resolves today.
`appearance.theme` matches a name or alias case-insensitively with surrounding
whitespace trimmed; an unknown name falls back to the default preset and logs a
warning to stderr instead of failing the process.

- The gap layers compose: effective gap =
  `decoration.gap * DPI_scale + layout.gap_cells * cell_axis` (CTX-0333).
- `window.opacity` is whole-window, not per-surface or background-only; a
  per-surface or background-only knob and blur remain design-only (OQ-038).
- Label position (OQ-036) and frame/margin-line color (OQ-037) have no config
  key yet; do not document them as supported.
- Focused/idle outline colors (OQ-039) shipped with `bitty` PR #572 (merge
  commit `f83b1e1`, CTX-0340). Panel animations (OQ-040) shipped with `bitty`
  PR #580 (merge commit `3c5878e`, CTX-0341). The shipped contract values are:

  | Shipped key                            | Default     | Values / bound                                       | Reload |
  | -------------------------------------- | ----------- | ---------------------------------------------------- | ------ |
  | `decoration.border_color`              | unset       | `#RRGGBB` / `#RRGGBBAA`                              | live   |
  | `decoration.border_color_focused`      | `#33CCFF`   | `#RRGGBB` / `#RRGGBBAA`                              | live   |
  | `decoration.border_color_idle`         | `#595959AA` | `#RRGGBB` / `#RRGGBBAA`                              | live   |
  | `appearance.animations.enabled`        | `true`      | boolean                                              | live   |
  | `appearance.animations.reduced_motion` | `"auto"`    | `auto` / `always` / `never`                          | live   |
  | `appearance.animations.duration_ms.*`  | see below   | per transition, integer `0..=500` ms                 | live   |
  | `appearance.animations.easing.*`       | see below   | `linear`/`ease_in`/`ease_out`/`ease_in_out`/`spring` | live   |

  `duration_ms` and `easing` are per-transition tables over the closed set
  `open`, `close`, `focus`, `workspace`. Shipped defaults:

  ```lua
  duration_ms = { open = 150, close = 120, focus = 100, workspace = 200 }
  easing = {
      open = "ease_out",
      close = "ease_in",
      focus = "ease_in_out",
      workspace = "ease_in_out",
  }
  ```

  `spring` is accepted but reserved: its
  parameters are deferred, so it resolves to `ease_in_out` until a follow-up
  RFC defines them. Durations and easing spellings fail closed with a
  source-attributed diagnostic; `enabled = false`, `reduced_motion = "always"`,
  and `bitty --safe` all collapse every duration to `0` ms while committing the
  final state instantly. Animations are renderer-side presentation chrome: they
  never interpolate grid, cursor, scrollback, or Terminal Truth, and a
  workspace transition fades Core-owned chrome only (no grid interpolation).
  This slice performs no platform reduced-motion query, so `auto` treats an
  absent signal as "animate".

- Per-View/per-panel appearance overrides (`views.<selector>.*`) and the
  focus/idle outline width (`decoration.border_width` / `_focused` / `_idle`)
  are **accepted contracts** but **not supported yet** (OQ-041 and OQ-045
  resolved 2026-09-12, docs CTX-0163;
  [Appearance Configuration RFC](../decisions/rfcs/RFC-0001-appearance-configuration.md)).
  The accepted selector grammar is `*` < content type
  (`empty`/`terminal`/`rich`/`browser`) < `ws:<1..=16>` < `view:<ViewId>`,
  resolved per field per `View`; the accepted `views.*` field set is
  `border_color`/`_focused`/`_idle`, `border_width`/`_focused`/`_idle`, and
  `background_image`/`background_fit`; `opacity`, `blur`, and `animations` are
  reserved and rejected until OQ-038/OQ-043 accept them. A fatal
  `views.<selector>` field or selector rejects the whole reload; `--safe`
  ignores every `views.*` entry. No `views.*` key or `decoration.border_width*`
  key is supported; do not document one as working. `background_image_roots`
  remains global-only and cannot be widened per `View`.
- Per-panel animation overrides are **candidate and narrowed** (OQ-043;
  [UI Extensibility Architecture](../specifications/ui-extensibility-architecture.md)):
  the accepted OQ-041 layer fixes the override mechanics, so only the animation
  field set and its reduced-motion/budget interaction remain. The global
  `appearance.animations.*` contract is unchanged.
- Plugin-supplied appearance (OQ-044) and plugin-supplied images (OQ-049) remain
  **open**; the override layer is Core-owned user configuration and grants no
  plugin authority.
- The per-panel background-image contract
  (`decoration.background_image` / `decoration.background_fit` /
  `decoration.background_image_roots`) is **accepted as a contract** but **not
  supported yet** (OQ-042 resolved 2026-09-12;
  [Appearance Configuration RFC](../decisions/rfcs/RFC-0001-appearance-configuration.md)).
  The accepted formats are PNG/JPEG/static WebP with bounds BG-1..BG-5 reused from
  the image-store corpus (IMG-1..IMG-5; BG-6 is a design bound, BG-7 a
  present-path bound), deny-by-default approved roots, fit modes
  `fill`/`fit`/`center`/`tile`/`stretch`, fail-closed whole-reload rejection,
  and `--safe` ignoring image contributions. Do not document the keys as
  working until `bitty` ships them; a `views.*` entry may not widen the
  approved roots, and plugin-supplied images remain open (OQ-049).

## Shipped keymaps and Mod key

Status: **shipped defaults** (read-only from `bitty` `origin/main`, CTX-0236,
CTX-0257, CTX-0258, CTX-0259, CTX-0262, CTX-0263, CTX-0264, CTX-0265; merged
to `bitty` origin `main` at commits `2a5e451`, `227ca3a`, `6e662a2`,
`1ea2f66`, `8b987a0`, `bc1fbba`, `11d9bec`, `c8faa52`, all verified read-only
via `merge-base --is-ancestor`). This section is the shipped reference for the
keybinding surface; the merge-class instantiation stays in the
[Configuration Model RFC](../specifications/configuration-model-rfc.md), and
the input-side dispatch evidence stays in the
[Input and Pointer Contract](../specifications/input-pointer-rfc.md).

Shipped schema:

```lua
-- Shipped schema (CTX-0236/CTX-0257).
return {
    mod_key = "alt", -- "alt" (default; opt/option) or "super" (meta/cmd/win)
    keymaps = {
        { chord = "alt+h", action = "goto_split:left", context = "global" },
    },
}
```

- `mod_key` is scalar-replace with per-field source attribution. `"alt"` keeps
  the canonical map byte-identical; `"super"` rebinds every `alt`-bearing
  default (including the `ctrl+shift+alt+h/j/k/l` resize variant) to Super.
  `ctrl`/`shift` and unknown values fail closed; explicit `keymaps` entries
  keep their exact spelling and overlay by `context + chord` identity.
- `keymaps` is set-by-identifier: a user entry with the same `context + chord`
  replaces the shipped entry, anything else appends. The shipped set is
  79 entries, all context `global`; unknown chords, actions, or contexts
  fail closed, and single-character keys require at least one modifier.
- Shipped groups (canonical Alt spelling): workspace `alt+n` / `alt+1..9` /
  `alt+-` / `alt+=` / `alt+tab` / `alt+w` (CTX-0257, DEC-0034) plus
  `shift+alt+1..9` move-to-workspace (CTX-0259); spatial focus
  `alt+h/j/k/l`, `alt+arrows`, `ctrl+alt+arrows`; split
  `shift+alt+h/j/k/l`, `shift+alt+arrows`; resize `shift+ctrl+h/j/k/l`,
  `shift+ctrl+arrows`, `ctrl+shift+alt+h/j/k/l`, `ctrl+shift+alt+arrows`
  (CTX-0258/CTX-0262); page `alt+u`/`alt+i`; zoom
  `alt+z`/`alt+m`/`alt+f`; focus cycle `ctrl+tab`/`ctrl+shift+tab`; clipboard
  `ctrl+shift+c`/`ctrl+shift+v`; per-window font size
  `ctrl+=`/`ctrl+plus`/`ctrl+-`/`ctrl+0` with shifted spellings (CTX-0263);
  help popup backtick chord plus `alt+?` spellings (CTX-0265).
- Named keys are bindable beyond letters and digits: `tab`, `enter`,
  `escape`, `space`, `backspace`, `delete`/`del`, `insert`/`ins`, `home`/`hm`,
  `end`, `pageup`/`pgup`/`pu`, `pagedown`/`pgdn`/`pd`, arrows, and `f1..f35`
  (CTX-0264; short aliases canonicalize to the long names).
- Single-owner consumption: a chord that matches a bound keymap is consumed by
  its action and never reaches the PTY; unbound keys (plain `Tab`, arrows,
  letters, digits) always reach the shell. Workspace close never kills
  silently: a live workspace arms a pending confirm (repeat the chord to
  confirm, `Esc` cancels) and idle workspaces close immediately. The help
  popup (CTX-0265) is a presentation-only overlay generated from the live
  registry on every show; it is informational, not modal, so unbound keys
  still reach the shell while it is visible.

Open: whether the shipped set grows CLI flags or a command-palette surface;
the candidate Leader sequences and flash-style jump remain unimplemented
candidates in the [Input and Pointer Contract](../specifications/input-pointer-rfc.md).

## Reload classification (shipped schema inventory)

Status: **implementation reference** read-only from `bitty` `origin/main` at
`828a787` (verified read-only via `merge-base --is-ancestor`). The accepted
framework is the
[Configuration Model RFC](../specifications/configuration-model-rfc.md)
"Reload classification" section (OQ-010). Classification is declared by the
schema in `bitty` `crates/bitty-config/src/reload.rs` (`classify_field`), never
inferred at runtime, and reload reuses the startup validation and merge path.
This section is the per-field inventory the RFC defers; it changes no normative
contract and weakens no security control.

| Class             | Meaning                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| Live-reconcilable | Applied by diff-and-reconcile to running instances without restart           |
| Restart-required  | Accepted and persisted, effective after the next process start               |
| Rejected          | Validation failure; the previous good plan stays active, diagnostics emitted |

Shipped leaf inventory:

| Key                                                                                          | Class    | `bitty --safe`       |
| -------------------------------------------------------------------------------------------- | -------- | -------------------- |
| `font.family`, `font.size`, `font.line_height`, `font.letter_spacing`                        | live     | built-in default     |
| `window.opacity`, `window.padding`, `window.radius_px`                                       | live     | built-in default     |
| `decoration.gaps_in`, `decoration.gaps_out`                                                  | live     | `0`, `0`             |
| `decoration.border`, `decoration.radius`, `decoration.content_inset`                         | live     | `1`, `0`, `0`        |
| `decoration.border_color`                                                                    | live     | unset                |
| `decoration.border_color_focused`, `decoration.border_color_idle`                            | live     | `#FFFFFF`, `#808080` |
| `decoration.border_width`, `decoration.border_width_focused`, `decoration.border_width_idle` | live     | `1`, `1`, `1`        |
| `appearance.theme`                                                                           | live     | built-in default     |
| `appearance.animations.enabled`, `appearance.animations.reduced_motion`                      | live     | built-in default     |
| `appearance.animations.duration_ms.*`                                                        | live     | `0` ms               |
| `appearance.animations.easing.*`                                                             | live     | built-in default     |
| `mod_key`, `keymaps`                                                                         | live     | built-in default     |
| `terminal.scrollback`, `terminal.shell`                                                      | restart  | built-in default     |
| `terminal.scroll_lines_per_notch`, `terminal.scroll_pixels_per_notch`                        | restart  | built-in default     |
| `selection.auto_copy`                                                                        | restart  | built-in default     |
| `layout.gaps_in`, `layout.gaps_out`                                                          | restart  | built-in default     |
| `scrollbar.mode`, `scrollbar.width`                                                          | restart  | built-in default     |
| `mouse.focus_follows_mouse`, `mouse.focus_follows_mouse_delay_ms`                            | restart  | built-in default     |
| `plugins[].id`, `plugins[].enabled`                                                          | restart  | built-in default     |
| unknown or undeclared key                                                                    | rejected | n/a                  |

- `duration_ms` and `easing` are per-transition tables over the closed set
  `open`, `close`, `focus`, `workspace`; `.*` abbreviates the four leaves.
- The `bitty --safe` column records the pinned value where `--safe` forces one.
  "built-in default" means the key is not force-pinned beyond normal core
  defaults, but every external layer is skipped entirely (`fallback_builtin`,
  R-009), so the built-in default is the value in effect.
- Restart-required keys are accepted and persisted but need the next process
  start: `terminal.shell` and `terminal.scrollback` are spawn-time state, and
  `selection.auto_copy`, `layout.gaps_in`/`gaps_out`, `scrollbar.*`, and
  `mouse.*` are adopted into the runtime configuration once at startup.
- **Activation status.** "Live-reconcilable" is the declared class; the runtime
  hot-swap activation path is not wired yet. `bitty ctl config reload` validates
  the file and reports its path with `"hot_swap":"follow-up"`, and
  `reconcile_live` has no production caller. The runtime live-adopt setters
  (`set_decoration`, `set_outline`, `set_animations`) exist for the presentation
  subset, but nothing drives them from the reload diff yet.
- Unknown and undeclared keys are rejected by validation; the previous good
  plan stays active (`should_retain_previous`).

## Starters and distributions

Status: **accepted direction.**

Bitty core remains minimal. Starter configurations and distributions use the
same public configuration and plugin contracts available to the community;
official distributions do not receive hidden core branches.

Candidate initial experiences are:

- `minimal`: one small `init.lua`;
- `starter`: a commented modular scaffold comparable to `kickstart.nvim`;
- a later official distribution containing ordinary plugins for workspace,
  statusline, search, sessions, command palette, and sensible key mappings.

Distributions should layer under user overrides rather than require users to
fork and continually merge a copied configuration:

```lua
-- Candidate API only.
local distro = require("bitty.distro")

return distro.extend("bitty-terminal/starter", {
    font = { family = "Maple Mono" },
    plugins = {
        { "xuepoo/bitty-markdown" },
    },
})
```

The distribution mechanism, source, trust model, and multiple-extends behavior
are unresolved. Neovim legacy directories such as `after/`, `ftplugin/`, and
`autoload/` should not be copied without a Bitty-specific requirement.

## Local project configuration

Status: **accepted direction.**

Bitty must never execute an unfamiliar project's Lua merely because the user
entered its directory. Project configuration, if introduced, needs explicit
workspace trust and should expose a restricted declarative schema.

Status: **candidate behavior.**

A `.bitty.lua` could request a profile or environment values. On first use,
Bitty asks the user to trust it once, trust it persistently, or reject it.
Process execution and unrestricted host APIs remain unavailable to local
configuration. This feature is deferred until the trust model is designed.

Status: **candidate direction.**

A project could also carry a declarative `.bitty/` project definition (for
example `project.toml`, `agents/`, `workflows/`, `prompts/`, `policies/`,
`tools/`, and `skills/`), portable and safe to commit to Git because it holds
definitions only. Dynamic runtime state — current task, agent sessions,
execution logs, token statistics, runtime locks, overlays, and any database —
must never live in `.bitty/`; it belongs to repository-local or user runtime
state so the project tree stays clean.

`.agents/` is a compatibility adapter rather than a second source of truth,
and candidate project discovery resolves in one order:

```text
.bitty/          native project definition (highest fidelity)
.agents/         compatibility adapter for existing agent conventions
AGENTS.md etc.   contextual conventions, never configuration authority
```

Candidate rules: `.bitty/` wins where both exist, a conflict is reported
rather than merged silently, and the declarative-data-only rule for project
content is unchanged. The directory name, schema, trust mechanics, and adapter
scope are undecided; tracked as
[OQ-068](../decisions/open-questions.md).

## Data, state, cache, and runtime layouts

Status: **candidate layouts.**

```text
$XDG_DATA_HOME/bitty/
├── plugins/
├── themes/
└── runtime/

$XDG_STATE_HOME/bitty/
├── sessions/
├── layouts/
├── history/
├── crash/
└── plugin-state/

$XDG_CACHE_HOME/bitty/
├── fonts/
├── glyphs/
├── plugins/
├── shaders/
└── registry/

$XDG_RUNTIME_DIR/bitty/
├── instances/
├── sockets/
└── locks/
```

Installed themes belong in data; a user's own theme source may live in config.
No theme-file loading path is implemented yet: the 30 built-in presets are
compiled into the binary and selected through `appearance.theme`, while
custom/user themes are unsupported. The reserved `themes/` directory above is
inert, so treat it as a candidate layout only. See the
[theme preset catalog](themes.md) for the shipped presets and the open
questions on custom themes and category selection. Cache is rebuildable.
Runtime sockets and locks belong to the login session, while sessions and
layouts intended to survive restart belong in state.

## Cross-platform paths

Status: **candidate contract.**

XDG names must not leak into portable plugin APIs. Core resolves a semantic path
set:

```rust
// Candidate type shape.
struct BittyDirs {
    config: PathBuf,
    data: PathBuf,
    state: PathBuf,
    cache: PathBuf,
    runtime: PathBuf,
}
```

Linux/BSD can use XDG; macOS and Windows should use a documented native mapping
with an explicitly designed XDG-compatibility option if desired. Plugins query
semantic host paths rather than concatenate `HOME` with `/.config/bitty`.

Candidate discovery commands include:

```sh
bitty paths
bitty config path
bitty config check
bitty config show --source
bitty config diff
```

These commands are further described in [CLI](../interfaces/cli.md).

## Open questions

- What exact Lua version/runtime and standard libraries are available in the
  configuration VM?
- What are the module search rules and trusted-module boundaries?
- What is the final typed configuration schema and source-location model?
- Two-stage `ConfigPlan` and Rust validate/diff/reconcile pipeline is accepted in [Configuration Model RFC](../specifications/configuration-model-rfc.md) (OQ-010, 2026-08-27); remaining per-field and tooling details are follow-up work.
- Are system defaults and policy expressed in Lua or a restricted data format?
- Which layer types may be non-overridable, and how are policy errors reported?
- What are the final list, keymap, and plugin merge semantics?
- Reload classification is the accepted framework with a shipped per-field
  inventory (see [Reload classification](#reload-classification-shipped-schema-inventory));
  the canonical table still moves to the
  [Configuration Model RFC](../specifications/configuration-model-rfc.md)
  once the schema stabilizes.
- What are the native macOS and Windows directory mappings?
- What is the trust database location and invalidation rule for local project
  configuration?
- What is the `.bitty/` project-definition directory contract (layout, schema,
  Git-tracked versus runtime-state split, and trust), and how does `.agents/`
  compatibility resolve against it without becoming a competing source of
  truth? ([OQ-068](../decisions/open-questions.md))
- Which remaining appearance knobs beyond the shipped set (workspace/tab label
  position, frame and margin-line color, per-surface background opacity, blur)
  are adopted, and under what render/compositor contract?
  (OQ-036/OQ-037/OQ-038;
  [Appearance Configuration RFC](../decisions/rfcs/RFC-0001-appearance-configuration.md);
  OQ-039 focused/idle outline colors is accepted and shipped.)
- Which panel transitions animate, with what bounded durations/easings and
  reduced-motion behavior? ([OQ-040](../decisions/open-questions.md);
  [Panel Animations and Effects RFC](../decisions/rfcs/RFC-0002-panel-animations.md);
  accepted and shipped in `bitty` `3c5878e`; `appearance.animations.*` is a
  supported `init.lua` key.)
- The per-View/per-panel appearance override contract (selector grammar,
  precedence, inheritance, reload, fail-closed validation, safe mode, and
  per-View contrast) and the focus/idle outline-width contract are accepted
  ([OQ-041/OQ-045](../decisions/open-questions.md), resolved 2026-09-12, docs
  CTX-0163;
  [Appearance Configuration RFC](../decisions/rfcs/RFC-0001-appearance-configuration.md)).
  What remains open is the per-panel animation override field set
  ([OQ-043](../decisions/open-questions.md), narrowed) and plugin-supplied
  appearance ([OQ-044](../decisions/open-questions.md)), with plugin-supplied
  images under [OQ-049](../decisions/open-questions.md);
  [UI Extensibility Architecture](../specifications/ui-extensibility-architecture.md).
  Accepted-but-unshipped, not a supported `init.lua` key yet.
- The per-panel background-image contract is accepted
  ([OQ-042](../decisions/open-questions.md), resolved 2026-09-12); the
  plugin-supplied-image path remains open as
  [OQ-049](../decisions/open-questions.md), and no image key is supported yet.
- What are the final manifest/lock names, and how do they coexist with Lua
  plugin specifications or distribution imports?
