---
title: Theme presets
description: Shipped built-in theme preset catalog with dark and light categories, selection keys, aliases, provenance, and open questions
category: configuration
audience: user
document_type: reference
status: stable
website_publish: true
sidebar_order: 11
---

# Theme presets

> Status: **shipped catalog.** All 30 built-in presets below (20 dark, 10
> light) resolve in `bitty` today. The catalog is compiled into the binary in
> `bitty` `crates/bitty-config/src/theme.rs` and belongs to `bitty` CarryCtx
> task `CTX-0350` (PR #578, merge commit `20cd735`; the AC-2 outline-contrast
> correction shipped in PR #586, merge commit `a7d9e6a`). The names, aliases,
> dark/light categories, source URLs, and exact palette values are pinned by
> fail-closed catalog tests in `bitty`, so this page is reference data, not a
> provisional target. Only built-in presets exist: there is still no theme file
> loading, and custom/user themes remain unsupported and open (OQ-047). The
> owning configuration contract remains the
> [Configuration Model RFC](../specifications/configuration-model-rfc.md) and
> the accepted [Appearance Configuration RFC](../decisions/rfcs/RFC-0001-appearance-configuration.md)
> (OQ-039); the catalog adds documented data, not new configuration semantics.

Bitty resolves terminal colors from a **built-in preset registry**. A preset is
a fixed set of window background, foreground, cursor, selection, focused/idle
outline tokens, and the 16 ANSI colors. The registry is compiled into the
binary (`bitty` `crates/bitty-config/src/theme.rs`); there is no theme file
loading today. `bitty list themes` enumerates the shipped catalog.

## Selecting a theme

A theme is selected by **name**, not by category or file path. The canonical
key is the `appearance.theme` scalar in `init.lua`:

```lua
-- Canonical key.
return {
    appearance = {
        theme = "tokyo-night",
    },
}
```

A top-level `theme` alias is also accepted. `appearance.theme` wins when both
are present:

```lua
-- Alias form; appearance.theme takes precedence over this key.
return {
    theme = "dark",
}
```

Accepted identifiers:

- **`appearance.theme = "<name>"`** — canonical selection key. Matching is
  case-insensitive and surrounding whitespace is trimmed.
- **`theme = "<name>"`** — top-level alias for `appearance.theme`. It loses to
  `appearance.theme` when both are set.
- **`dark`** — convenience alias for the default preset `bitty-dark`.

Resolution rules (shipped behavior):

| Input                            | Result                                                |
| -------------------------------- | ----------------------------------------------------- |
| `appearance.theme` unset / empty | designed default preset `bitty-dark`                  |
| known name or alias              | that preset's exact values                            |
| unknown name                     | fall back to `bitty-dark` and log a warning to stderr |

`appearance.theme` is declared reload class `Live` in the config layer
(CTX-0295), so a valid change is diffed and reconciled in the effective
configuration rather than rejected as restart-required; the running-app
theme/font hot-swap path is still a tracked follow-up. Unknown names never fail
the process; they fall back to the default with a visible warning, so a typo is
not silent. A `#RRGGBB`/`#RRGGBBAA` color value is never accepted here — only a
preset name or alias.

## Built-in preset catalog (shipped)

Names follow lowercase kebab-case and separate a family from a tone or variant
(for example `gruvbox-dark`). Aliases are alternate spellings resolved by
`normalize_theme_name` (trim + lowercase) and are registry-owned, not
user-extensible.

### Dark presets (20)

| Preset                 | Aliases                         | Note                                               |
| ---------------------- | ------------------------------- | -------------------------------------------------- |
| `bitty-dark`           | `dark`                          | Designed in-house default; dark-first indigo-gray. |
| `tokyo-night`          | `tokyonight`                    | Tokyo Night classic; blue/violet night palette.    |
| `tokyo-night-storm`    | `tokyonight-storm`              | Darker, higher-contrast Tokyo Night variant.       |
| `catppuccin-mocha`     | `catppuccin`                    | Darkest Catppuccin flavor.                         |
| `catppuccin-macchiato` | —                               | Mid-dark Catppuccin flavor.                        |
| `catppuccin-frappe`    | —                               | Softest dark Catppuccin flavor.                    |
| `dracula`              | —                               | High-contrast purple/pink dark scheme.             |
| `nord`                 | —                               | Cool arctic blue-gray dark scheme.                 |
| `gruvbox-dark`         | `gruvbox`                       | Retro warm earth tones on dark.                    |
| `solarized-dark`       | `solarized`                     | Precision low-contrast dark palette.               |
| `one-dark`             | `onedark`                       | Atom One dark scheme.                              |
| `ayu-dark`             | `ayu`                           | Warm amber-on-dark scheme.                         |
| `ayu-mirage`           | —                               | Muted blue-gray Ayu variant.                       |
| `kanagawa-wave`        | `kanagawa`                      | Ink-and-sumi Japanese-influenced dark scheme.      |
| `rose-pine`            | `rosepine`, `rose-pine-main`    | Muted rose/pine dark scheme.                       |
| `rose-pine-moon`       | `rosepine-moon`                 | Cooler, dimmer Rosé Pine variant.                  |
| `everforest-dark`      | `everforest`                    | Comfortable green-gray dark scheme.                |
| `monokai`              | `monokai-classic`               | Classic Monokai warm dark scheme (single preset).  |
| `night-owl`            | `nightowl`                      | Deep navy dark scheme for low-light use.           |
| `github-dark`          | `github`, `github-dark-default` | GitHub's default dark UI palette.                  |

### Light presets (10)

| Preset             | Aliases                | Note                                  |
| ------------------ | ---------------------- | ------------------------------------- |
| `tokyo-night-day`  | `tokyonight-day`       | Light counterpart of Tokyo Night.     |
| `catppuccin-latte` | —                      | Light Catppuccin flavor.              |
| `gruvbox-light`    | —                      | Warm earth tones on light.            |
| `solarized-light`  | —                      | Precision low-contrast light palette. |
| `one-light`        | `onelight`             | Atom One light scheme.                |
| `ayu-light`        | —                      | Light Ayu variant.                    |
| `kanagawa-lotus`   | —                      | Light Kanagawa variant.               |
| `rose-pine-dawn`   | `rosepine-dawn`        | Light Rosé Pine variant.              |
| `everforest-light` | —                      | Green-gray light scheme.              |
| `github-light`     | `github-light-default` | GitHub's default light UI palette.    |

There is no `night-owl-light`, `tokyo-night-moon`, `tokyo-night-light`, or
`kanagawa` light preset: the shipped light set is exactly the ten names above.
The **Dark** and **Light** headings are the registry's `ThemeCategory`
metadata. Whether a category is itself selectable is an open question; see
[open questions](#status-and-open-questions). Selection stays by name today.

## Provenance

Every preset is derived from an upstream project and is attributed in the
registry. Bitty reproduces each palette faithfully from its upstream export and
owns the values it writes; where a canonical Alacritty/kitty export exists it
is preferred, otherwise the MIT-licensed `iTerm2-Color-Schemes` export of that
project is used and the owning project is still the `source`. No non-permissive
palette is included, and no value is invented to fill a gap.

| Family      | Upstream project                                                                       | License           | Presets                                               |
| ----------- | -------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------- |
| Bitty       | In-tree (`bitty-terminal/bitty`, `crates/bitty-config`)                                | MIT OR Apache-2.0 | `bitty-dark`                                          |
| Tokyo Night | <https://github.com/folke/tokyonight.nvim>                                             | Apache-2.0        | `tokyo-night`, `tokyo-night-storm`, `tokyo-night-day` |
| Catppuccin  | <https://github.com/catppuccin/alacritty>                                              | MIT               | `catppuccin-mocha`, `-macchiato`, `-frappe`, `-latte` |
| Dracula     | <https://github.com/dracula/alacritty>                                                 | MIT               | `dracula`                                             |
| Nord        | <https://github.com/nordtheme/nord>                                                    | MIT               | `nord`                                                |
| Gruvbox     | <https://github.com/morhetz/gruvbox>                                                   | MIT               | `gruvbox-dark`, `gruvbox-light`                       |
| Solarized   | <https://github.com/altercation/solarized>                                             | MIT               | `solarized-dark`, `solarized-light`                   |
| One         | <https://github.com/atom/one-dark-syntax> / <https://github.com/atom/one-light-syntax> | MIT               | `one-dark`, `one-light`                               |
| Ayu         | <https://github.com/ayu-theme/ayu-colors>                                              | MIT               | `ayu-dark`, `ayu-mirage`, `ayu-light`                 |
| Kanagawa    | <https://github.com/rebelot/kanagawa.nvim>                                             | MIT               | `kanagawa-wave`, `kanagawa-lotus`                     |
| Rosé Pine   | <https://github.com/rose-pine/rose-pine-theme>                                         | MIT               | `rose-pine`, `rose-pine-moon`, `rose-pine-dawn`       |
| Everforest  | <https://github.com/sainnhe/everforest>                                                | MIT               | `everforest-dark`, `everforest-light`                 |
| Monokai     | <https://github.com/mbadolato/iTerm2-Color-Schemes>                                    | MIT               | `monokai`                                             |
| Night Owl   | <https://github.com/sdras/night-owl-vscode-theme>                                      | MIT               | `night-owl`                                           |
| GitHub      | <https://github.com/primer/github-vscode-theme>                                        | MIT               | `github-dark`, `github-light`                         |

`MIT` and `Apache-2.0` are the SPDX identifiers reported by each upstream
repository at the time of writing. License text is not bundled; only names and
attribution are recorded. The catalog is additive: adding a family requires its
source URL and license here and in the registry.

## Custom and third-party themes

Custom and user-supplied themes are **not supported**. There is no theme file
format, no `$XDG_DATA_HOME/bitty/themes/` or `$XDG_CONFIG_HOME/bitty/themes/`
loading path, and no plugin theme contribution contract today. The `themes/`
directory is reserved in the [XDG data layout](lua-and-xdg.md#data-state-cache-and-runtime-layouts)
but is inert. Selecting an unknown name falls back to `bitty-dark`; it does not
load a file.

Whether user themes, a file schema, or plugin-supplied themes enter scope is an
open question; see below. Do not document or rely on a custom-theme path until
a reviewed contract defines its schema, load path, and trust model.

## Status and open questions

This catalog is a reference for shipped data. It ratifies no configuration
semantics beyond the accepted
[Appearance Configuration RFC](../decisions/rfcs/RFC-0001-appearance-configuration.md)
and its `appearance.theme` / `theme` alias contract. The following are genuine
open questions and are registered rather than decided in this page:

- **OQ-046 — category selection.** Is a preset's `Dark`/`Light` category
  exposed as a selectable or queryable config surface, or is it non-selectable
  documentation metadata only?
- **OQ-047 — custom themes.** Are user-authored or third-party theme files
  supported, and if so what is the schema, load path, and trust model?
- **OQ-048 — automatic light/dark switching.** Is following the OS appearance
  or a schedule in scope, and which key or mechanism owns it?

See the [open-question register](../decisions/open-questions.md) for the
authoritative state. The catalog is `stable` reference data because the shipped
preset set is pinned by `bitty` catalog tests; the open questions above are
about additional surfaces, not about the shipped set.
