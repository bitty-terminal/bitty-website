---
title: Configuration options reference
description: Complete user-facing configuration inventory for the pre-0.0.21 config surface with types defaults ranges reload behavior and gaps
category: reference
audience: user
document_type: reference
status: draft
website_publish: true
sidebar_order: 30
---

# Configuration options reference

## Status and provenance

- Status: **draft**. This page is a lookup reference, not a stability
  promise. Every row is extracted from the `bitty` implementation at
  `v0.0.20` (`schema_version: 1`); the owning contracts are still
  `Proposed` under `OQ-010`, so no row is a stable or supported public
  contract yet.
- Ownership: `bitty-terminal-docs` **CTX-0059** renders this inventory; the
  `bitty` repository owns the schemas, defaults, validation, and tests it
  mirrors. When code and this page disagree, the code wins and this page
  needs a fix.
- Extraction method: `EffectiveConfig` and per-section structs in
  `bitty-config/src/types.rs`, chord/action grammar in
  `bitty-config/src/keymap.rs`, discovery bounds in
  `bitty-config/src/wheel.rs`, the Lua admission surface in
  `bitty-lua/src/config.rs`, CLI parsing in `bitty-app/src/cli.rs`, and the
  manifest reader in `bitty-runtime/src/plugin_runtime/manifest_toml.rs`
  plus `bitty-plugin-host/src/manifest.rs` and
  `bitty-plugin-host/src/capability.rs`.
- Machine-readable companion:
  [configuration-inventory.json](configuration-inventory.json) carries the
  same rows with per-option `since`, `status`, and `source` fields for
  website import. The JSON is data, not prose: it has no frontmatter and is
  regenerated from code, never hand-edited for new options.
- Honesty rule: `since` is uniformly **pre-0.0.21 (implemented-only)**.
  Nothing below has shipped as a stable contract in any release, and rows
  marked **gap** name behavior the code does not own yet instead of
  inventing it.

## How to read the tables

| Column      | Meaning                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Key path    | Lua table path in `init.lua` (or CLI flag / env var / manifest key for those surfaces).                                                                                                                                                                |
| Type        | Admitted Lua/CLI/TOML shape. Integers are exact (floats rejected); strings are case rules as noted.                                                                                                                                                    |
| Default     | Effective value when no layer declares the key. `unset` means the merge inherits a lower layer or a built-in fallback named in the row.                                                                                                                |
| Valid range | Accepted values. Anything else is rejected, never clamped or silently ignored.                                                                                                                                                                         |
| Fail-closed | What rejection does: `reject layer` (the whole file/profile layer fails, startup falls back to last-good or safe mode), `reject reload` (live reload keeps the previous plan), `exit 2` (CLI usage error), or `deny` (capability absent means denied). |
| Reload      | `live` (applied by diff-and-reconcile), `restart` (accepted, effective after next start), or `n/a` (not a reloadable setting).                                                                                                                         |

Global rules behind every row: unknown keys fail closed as undeclared
fields; out-of-range values fail closed with a source-attributed
diagnostic; the core never falls back to a silent default when validation
fails. File bounds: config file at most 64 KiB / 2048 lines / 4096 bytes
per line, at most 64 top-level keys and 32 keys per nested table, strings
at most 2048 bytes, evaluated in the Lua sandbox with plugin budgets and
no `io`/`os`.

## Locations and precedence

The user file is `$XDG_CONFIG_HOME/bitty/init.lua` (fallback
`~/.config/bitty/`; a sibling `config.lua` is accepted only when
`init.lua` is absent). Named profiles live at
`$XDG_CONFIG_HOME/bitty/profiles/<name>.lua` with single-parent `extends`
chains and cycle detection. `BITTY_CONFIG` overrides the file path and
`BITTY_PROFILE` overrides the profile name; `--config` / `--profile` win
over both.

Merge precedence, low to high: `CoreDefaults (0)` < `SystemDefaults (10)`
< `SystemPolicy (20, non-overridable)` < `Distribution (30)` <
`Profile (40)` < `User (50)` < `TrustedLocal (60, project-scoped,
hash-bound consent)` < `Cli (70)`. Scalars replace, structured maps
deep-merge, keymaps merge by `context + chord` identity, plugins merge by
`id`. `bitty --safe` ignores every external layer and forces the safe
effective config (decoration `0/0/1/0/0`, opaque outline pair, animations
`0` ms, `views` dropped).

## Core options (`init.lua` top level and tables)

### `font`

| Key path              | Type   | Default                   | Valid range                          | Fail-closed                  | Reload |
| --------------------- | ------ | ------------------------- | ------------------------------------ | ---------------------------- | ------ |
| `font.family`         | string | `JetBrainsMono Nerd Font` | trimmed non-empty, at most 128 bytes | reject layer / reject reload | live   |
| `font.size`           | float  | `12.0`                    | finite, `(0, 128]`                   | reject layer / reject reload | live   |
| `font.line_height`    | float  | `1.375`                   | finite, `[1.0, 2.0]`                 | reject layer / reject reload | live   |
| `font.letter_spacing` | float  | `2.0`                     | finite, `[0.0, 8.0]`                 | reject layer / reject reload | live   |

### `window`

| Key path           | Type    | Default | Valid range                                                    | Fail-closed                  | Reload |
| ------------------ | ------- | ------- | -------------------------------------------------------------- | ---------------------------- | ------ |
| `window.opacity`   | float   | `1.0`   | finite, `[0.0, 1.0]`                                           | reject layer / reject reload | live   |
| `window.padding`   | integer | `8`     | `[0, 64]` logical px                                           | reject layer / reject reload | live   |
| `window.radius_px` | integer | `0`     | `[0, 24]` physical px (parsed no-op in S0: zero render effect) | reject layer / reject reload | live   |

### `terminal`

| Key path                           | Type    | Default                                                | Valid range                                                          | Fail-closed                  | Reload  |
| ---------------------------------- | ------- | ------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------- | ------- |
| `terminal.scrollback`              | integer | `10000`                                                | `[0, 100000]` lines                                                  | reject layer / reject reload | restart |
| `terminal.shell`                   | string  | unset (chain: `terminal.shell` > `$SHELL` > `/bin/sh`) | trimmed non-empty, at most 1024 bytes, no NUL, no control characters | reject layer / reject reload | restart |
| `terminal.scroll_lines_per_notch`  | integer | `3`                                                    | `[1, 32]`                                                            | reject layer / reject reload | restart |
| `terminal.scroll_pixels_per_notch` | integer | `16`                                                   | `[1, 256]`                                                           | reject layer / reject reload | restart |

### `selection`, `close_confirm`, `layout`, `workspace`

| Key path              | Type    | Default                                                     | Valid range                                                                                                                          | Fail-closed                  | Reload  |
| --------------------- | ------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ------- |
| `selection.auto_copy` | boolean | `false`                                                     | `true` \| `false`                                                                                                                    | reject layer / reject reload | restart |
| `close_confirm`       | string  | `when_busy`                                                 | `always` \| `when_busy` \| `never` (exact lowercase)                                                                                 | reject layer / reject reload | restart |
| `layout.gaps_in`      | integer | `0`                                                         | `[0, 16]` cells                                                                                                                      | reject layer / reject reload | restart |
| `layout.gaps_out`     | integer | `0`                                                         | `[0, 16]` cells                                                                                                                      | reject layer / reject reload | restart |
| `workspace.layout`    | string  | unset (current tree preserved via the built-in no-op tiler) | well-formed provider name (bare `dwindle` or qualified `owner.name:algorithm`); membership enforced at apply by the runtime registry | reject layer / reject reload | restart |

`close_confirm` must not be declared by project layers: a
repository-local file must not disable a data-loss guard.

### `decoration` (logical px, Core-owned)

| Key path                            | Type             | Default                                               | Valid range                                                                                                               | Fail-closed                  | Reload |
| ----------------------------------- | ---------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------ |
| `decoration.gaps_in`                | integer          | `6`                                                   | `[0, 32]`                                                                                                                 | reject layer / reject reload | live   |
| `decoration.gaps_out`               | integer          | `6`                                                   | `[0, 32]`                                                                                                                 | reject layer / reject reload | live   |
| `decoration.border`                 | integer          | `2`                                                   | `[0, 8]`                                                                                                                  | reject layer / reject reload | live   |
| `decoration.radius`                 | integer          | `6`                                                   | `[0, 16]`                                                                                                                 | reject layer / reject reload | live   |
| `decoration.content_inset`          | integer          | `6`                                                   | `[0, 32]`                                                                                                                 | reject layer / reject reload | live   |
| `decoration.border_color`           | string           | unset (theme `border.focused` / `border.idle` tokens) | `#RRGGBB` \| `#RRGGBBAA`, no names/shorthands                                                                             | reject layer / reject reload | live   |
| `decoration.border_color_focused`   | string           | unset (inherits resolved base)                        | `#RRGGBB` \| `#RRGGBBAA`                                                                                                  | reject layer / reject reload | live   |
| `decoration.border_color_idle`      | string           | unset (inherits resolved base)                        | `#RRGGBB` \| `#RRGGBBAA`                                                                                                  | reject layer / reject reload | live   |
| `decoration.border_width`           | integer          | unset (inherits `decoration.border`)                  | `[0, 16]`                                                                                                                 | reject layer / reject reload | live   |
| `decoration.border_width_focused`   | integer          | unset (inherits resolved base)                        | `[0, 16]`                                                                                                                 | reject layer / reject reload | live   |
| `decoration.border_width_idle`      | integer          | unset (inherits resolved base)                        | `[0, 16]`                                                                                                                 | reject layer / reject reload | live   |
| `decoration.background_image`       | string           | unset (no image)                                      | absolute or `~`-anchored path, non-empty, at most 4096 bytes, no NUL; root trust, format, and decode belong to the loader | reject layer / reject reload | live   |
| `decoration.background_fit`         | string           | `fill`                                                | `fill` \| `fit` \| `center` \| `tile` \| `stretch` (exact, case-sensitive)                                                | reject layer / reject reload | live   |
| `decoration.background_image_roots` | array of strings | unset / empty (denies every path)                     | at most 32 entries, each absolute or `~`-anchored, at most 4096 bytes, no NUL                                             | reject layer / reject reload | live   |

Resolution order for outlines is theme tokens, then `border_color` /
`border_width` base, then the explicit focused/idle pair; only an
explicit member overrides. Contrast contract on the resolved pair:
focused at least `3:1` against the background (enforced), focused at
least `3:1` against idle unless the width cue
(`border_width_focused >= border_width_idle + 1`) is present (enforced),
idle at least `1.5:1` against the background (advisory, reported by
`bitty config check`).

### `views.<selector>.<field>` (per-View overrides)

Selectors: `*` (every View), a content name (`empty` \| `terminal` \|
`rich` \| `browser`), `ws:<1..=16>` (canonical decimal, no leading
zeros), or `view:<ViewId>` (`1..=2^64-1`). Selector keys are at most 64
bytes. Tiers resolve wildcard < content < workspace < view,
independently of declaration order. Default: no entries. Every entry is
dropped under safe mode.

| Field                  | Type    | Default                             | Valid range                                        | Fail-closed                  | Reload |
| ---------------------- | ------- | ----------------------------------- | -------------------------------------------------- | ---------------------------- | ------ |
| `border_color`         | string  | unset (inherit)                     | `#RRGGBB` \| `#RRGGBBAA`                           | reject layer / reject reload | live   |
| `border_color_focused` | string  | unset (inherit)                     | `#RRGGBB` \| `#RRGGBBAA`                           | reject layer / reject reload | live   |
| `border_color_idle`    | string  | unset (inherit)                     | `#RRGGBB` \| `#RRGGBBAA`                           | reject layer / reject reload | live   |
| `border_width`         | integer | unset (inherit)                     | `[0, 16]`                                          | reject layer / reject reload | live   |
| `border_width_focused` | integer | unset (inherit)                     | `[0, 16]`                                          | reject layer / reject reload | live   |
| `border_width_idle`    | integer | unset (inherit)                     | `[0, 16]`                                          | reject layer / reject reload | live   |
| `background_image`     | string  | unset (inherit)                     | same path syntax as `decoration.background_image`  | reject layer / reject reload | live   |
| `background_fit`       | string  | unset (inherit, `fill` at the root) | `fill` \| `fit` \| `center` \| `tile` \| `stretch` | reject layer / reject reload | live   |

Reserved fields `opacity`, `blur`, and `animations` are rejected until
their owning open question accepts them; unknown fields fail closed.

### `scrollbar`, `mouse`

| Key path                             | Type    | Default | Valid range                                      | Fail-closed                  | Reload  |
| ------------------------------------ | ------- | ------- | ------------------------------------------------ | ---------------------------- | ------- |
| `scrollbar.mode`                     | string  | `auto`  | `hidden` \| `always` \| `auto` (exact lowercase) | reject layer / reject reload | restart |
| `scrollbar.width`                    | integer | `8`     | `[1, 32]` logical px                             | reject layer / reject reload | restart |
| `mouse.focus_follows_mouse`          | boolean | `false` | `true` \| `false`                                | reject layer / reject reload | restart |
| `mouse.focus_follows_mouse_delay_ms` | integer | `0`     | `[0, 2000]` ms                                   | reject layer / reject reload | restart |

### `appearance` (theme, custom palette, animations)

| Key path                                        | Type                | Default               | Valid range                                                                                                                                                         | Fail-closed                  | Reload |
| ----------------------------------------------- | ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------ |
| `appearance.theme` (or top-level `theme` alias) | string              | `bitty-dark`          | known preset name or alias (trimmed, at most 64 bytes); unknown names fall back to the default with a log line                                                      | never fails (fallback)       | live   |
| `appearance.colors.background`                  | string              | unset (preset value)  | `#RRGGBB` exactly (no alpha, no shorthand, no names); the `colors` table must be complete (4 chrome colors plus exactly 16 `ansi` entries) or the layer is rejected | reject layer / reject reload | live   |
| `appearance.colors.foreground`                  | string              | unset (preset value)  | `#RRGGBB` exactly                                                                                                                                                   | reject layer / reject reload | live   |
| `appearance.colors.cursor`                      | string              | unset (preset value)  | `#RRGGBB` exactly                                                                                                                                                   | reject layer / reject reload | live   |
| `appearance.colors.selection`                   | string              | unset (preset value)  | `#RRGGBB` exactly                                                                                                                                                   | reject layer / reject reload | live   |
| `appearance.colors.ansi`                        | array of 16 strings | unset (preset values) | exactly 16 `#RRGGBB` entries                                                                                                                                        | reject layer / reject reload | live   |
| `appearance.animations.enabled`                 | boolean             | `true`                | `true` \| `false` (`false` equals `0` ms)                                                                                                                           | reject layer / reject reload | live   |
| `appearance.animations.reduced_motion`          | string              | `auto`                | `auto` \| `always` \| `never`                                                                                                                                       | reject layer / reject reload | live   |
| `appearance.animations.duration_ms.open`        | integer             | `150`                 | `[0, 500]` ms                                                                                                                                                       | reject layer / reject reload | live   |
| `appearance.animations.duration_ms.close`       | integer             | `120`                 | `[0, 500]` ms                                                                                                                                                       | reject layer / reject reload | live   |
| `appearance.animations.duration_ms.focus`       | integer             | `100`                 | `[0, 500]` ms                                                                                                                                                       | reject layer / reject reload | live   |
| `appearance.animations.duration_ms.workspace`   | integer             | `200`                 | `[0, 500]` ms                                                                                                                                                       | reject layer / reject reload | live   |
| `appearance.animations.easing.open`             | string              | `ease_out`            | `linear` \| `ease_in` \| `ease_out` \| `ease_in_out` \| `spring` (`spring` resolves to `ease_in_out`; parameters deferred)                                          | reject layer / reject reload | live   |
| `appearance.animations.easing.close`            | string              | `ease_in`             | same enum                                                                                                                                                           | reject layer / reject reload | live   |
| `appearance.animations.easing.focus`            | string              | `ease_in_out`         | same enum                                                                                                                                                           | reject layer / reject reload | live   |
| `appearance.animations.easing.workspace`        | string              | `ease_in_out`         | same enum                                                                                                                                                           | reject layer / reject reload | live   |

Safe mode and `reduced_motion = "always"` (or `auto` with a platform
reduced-motion signal) force `0` ms. There is no theme-file path: `colors`
is inline only.

### `mod_key`, `leader_key`, `leader_timeout_ms`, `keymaps`, `plugins`

| Key path            | Type                                  | Default                                                  | Valid range                                                                                                                                                                                                                                                                                                           | Fail-closed                  | Reload  |
| ------------------- | ------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------- |
| `mod_key`           | string                                | `alt`                                                    | `alt` (`opt`/`option`) \| `super` (`meta`/`cmd`/`command`/`win`/`windows`), trimmed, case-insensitive, at most 32 bytes; `ctrl`/`shift` rejected (they would steal shell typing)                                                                                                                                      | reject layer / reject reload | live    |
| `leader_key`        | string                                | unset (`alt+space`; `ctrl+space` on Windows)             | shared chord grammar (see keymap rules)                                                                                                                                                                                                                                                                               | reject layer / reject reload | live    |
| `leader_timeout_ms` | integer                               | unset (`1000`)                                           | `[100, 60000]` ms                                                                                                                                                                                                                                                                                                     | reject layer / reject reload | live    |
| `keymaps[]`         | array of `{ chord, action, context }` | 81 shipped bindings (Alt-as-Mod map; see defaults below) | chord at most 64 bytes (`<mod>+...+<key>`, single-character keys need a modifier; named keys may stand alone), action at most 64 bytes from the closed catalog, `context` must be `global`; at most 1024 entries; merge by `context + chord`                                                                          | reject layer / reject reload | live    |
| `plugins[]`         | gap                                   | empty                                                    | **No Lua declaration path exists**: a top-level `plugins` key is rejected as undeclared ([bitty#1325](https://github.com/bitty-terminal/bitty/issues/1325)). `PluginSpec { id, enabled }` exists in the effective config (id at most 128 bytes, merge by id, at most 1024 entries) but no file layer can populate it. | reject layer (as undeclared) | restart |

`schema_version` current is `1` (absent assumes `0` and migrates; newer
than `1` is rejected). Profile `extends` is a single-parent chain with
cycle detection; multiple inheritance is open.

## Keymap rules, action catalog, and shipped defaults

Chord grammar: `<mod>+...+<key>`, mods `ctrl`/`control`,
`alt`/`opt`/`option`, `shift`, `super`/`meta`/`cmd`/`win`
(case-insensitive, any order); one key: a named key (`tab`, `enter`,
`escape`, `space`, `backspace`, `delete`, `insert`, `home`, `end`,
`pageup`, `pagedown`, `up`, `down`, `left`, `right`, `f1`..`f35`) or one
ASCII character. A bound chord is consumed by chrome and never reaches
the PTY; unbound keys always go to the shell.

Bindable actions: `goto_split:<left|right|up|down>`,
`new_split:<left|right|up|down>`, `resize_split:<left|right|up|down>`,
`close_view`, `toggle_zoom`, `focus_next`, `focus_prev`,
`focus:<1..=256>`, `copy_to_clipboard`, `paste_from_clipboard`,
`scroll_page_up`, `scroll_page_down`, `increase_font_size`,
`decrease_font_size`, `reset_font_size`, `toggle_help`,
`open_composer` (manual bind only), `fold_toggle` / `fold_expand` /
`fold_collapse` (manual bind only), `workspace_new`,
`workspace_close`, `workspace_prev`, `workspace_next`,
`workspace_last`, `workspace_focus:<1..=16>`,
`workspace_move:<1..=16>`, `enter_copy_mode`, `open_search`. The last
two are shipped defaults missing from the code module docs
([bitty#1327](https://github.com/bitty-terminal/bitty/issues/1327)).

Shipped defaults (81 bindings, Alt spelling; `mod_key = "super"`
rebinds every `alt`-bearing chord, `alt`-free chords pass through):

- Navigate: `alt+h/j/k/l` and `alt+arrows`, `ctrl+alt+arrows`;
  `ctrl+tab` / `ctrl+shift+tab` cycle focus.
- Workspaces: `alt+n` new, `alt+w` close (kill-confirm),
  `alt+-` / `alt+=` previous/next, `alt+tab` last-used, `alt+1..9`
  jump, `shift+alt+1..9` move window.
- Splits: `shift+alt+h/j/k/l` and `shift+alt+arrows` create;
  `shift+ctrl+h/j/k/l` (+arrows) and `ctrl+shift+alt+h/j/k/l`
  (+arrows) resize.
- Zoom/scroll/clipboard: `alt+z` / `alt+m` / `alt+f` zoom,
  `alt+u` / `alt+i` page up/down, `ctrl+shift+c` / `ctrl+shift+v`
  copy/paste.
- Font zoom: `ctrl+equal` / `ctrl+plus` (+shifted spellings) larger,
  `ctrl+minus` (+shifted) smaller, `ctrl+0` reset.
- Help: ``alt+` ``, `alt+?`, `alt+shift+?`, `alt+shift+/`.
- Overlays: `ctrl+shift+space` copy mode, `ctrl+shift+f` search.

## Theme presets

30 built-in presets selected by `appearance.theme` (or the top-level
`theme` alias), with per-preset Bitty-owned outline tokens derived so
the contrast contract holds. Aliases are accepted alternate spellings.

| Preset                 | Alias(es)                       | Category |
| ---------------------- | ------------------------------- | -------- |
| `bitty-dark` (default) | `dark`                          | Dark     |
| `tokyo-night`          | `tokyonight`                    | Dark     |
| `tokyo-night-storm`    | `tokyonight-storm`              | Dark     |
| `tokyo-night-day`      | `tokyonight-day`                | Light    |
| `catppuccin-mocha`     | `catppuccin`                    | Dark     |
| `catppuccin-macchiato` | —                               | Dark     |
| `catppuccin-frappe`    | —                               | Dark     |
| `catppuccin-latte`     | —                               | Light    |
| `dracula`              | —                               | Dark     |
| `nord`                 | —                               | Dark     |
| `gruvbox-dark`         | `gruvbox`                       | Dark     |
| `gruvbox-light`        | —                               | Light    |
| `solarized-dark`       | `solarized`                     | Dark     |
| `solarized-light`      | —                               | Light    |
| `one-dark`             | `onedark`                       | Dark     |
| `one-light`            | `onelight`                      | Light    |
| `ayu-dark`             | `ayu`                           | Dark     |
| `ayu-mirage`           | —                               | Dark     |
| `ayu-light`            | —                               | Light    |
| `kanagawa-wave`        | `kanagawa`                      | Dark     |
| `kanagawa-lotus`       | —                               | Light    |
| `rose-pine`            | `rosepine`, `rose-pine-main`    | Dark     |
| `rose-pine-moon`       | `rosepine-moon`                 | Dark     |
| `rose-pine-dawn`       | `rosepine-dawn`                 | Light    |
| `everforest-dark`      | `everforest`                    | Dark     |
| `everforest-light`     | —                               | Light    |
| `monokai`              | `monokai-classic`               | Dark     |
| `night-owl`            | `nightowl`                      | Dark     |
| `github-dark`          | `github`, `github-dark-default` | Dark     |
| `github-light`         | `github-light-default`          | Light    |

## Plugin manifest keys (`bitty-plugin.toml`)

Manifest ceiling 256 KiB, UTF-8, duplicate keys rejected. Unknown
sections, sub-tables, and numeric values fail closed.

| Key path                             | Type                      | Required                          | Valid range                                                                                                                                                            | Fail-closed     |
| ------------------------------------ | ------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `[plugin] id`                        | string                    | yes                               | owner-qualified, at most 128 bytes                                                                                                                                     | reject manifest |
| `[plugin] name`                      | string                    | yes                               | non-empty, at most 128 bytes, no NUL/ESC                                                                                                                               | reject manifest |
| `[plugin] version`                   | string                    | yes                               | SemVer 2                                                                                                                                                               | reject manifest |
| `[plugin] description`               | string                    | no                                | at most 1024 bytes, no NUL/ESC                                                                                                                                         | reject manifest |
| `[plugin] license`                   | string                    | no                                | non-empty when present, at most 256 bytes (SPDX)                                                                                                                       | reject manifest |
| `[compat] bitty`                     | string                    | no                                | version-range syntax                                                                                                                                                   | reject manifest |
| `[compat] plugin-api`                | string                    | no                                | version-range syntax                                                                                                                                                   | reject manifest |
| `[capabilities] <id>`                | boolean                   | no                                | closed capability ids only (see families below); `true` requests, `false` is ignored; filesystem authority must use `[[capabilities.filesystem]]`, never a boolean key | reject manifest |
| `[[capabilities.filesystem]] access` | string                    | yes (per entry)                   | `read` \| `write`                                                                                                                                                      | reject manifest |
| `[[capabilities.filesystem]] paths`  | array of strings          | yes (per entry)                   | at most 32 patterns per kind, 8 KiB total pattern text                                                                                                                 | reject manifest |
| `[lazy] commands`                    | array of strings          | no                                | at most 128 qualified names                                                                                                                                            | reject manifest |
| `[lazy] events`                      | array of strings          | no                                | at most 256 event types, 1..128 bytes each, no NUL/space                                                                                                               | reject manifest |
| `[lazy] claims`                      | array of strings          | no                                | 1..64 bytes each                                                                                                                                                       | reject manifest |
| `[tools.git] required`               | boolean                   | yes (when the section is present) | `true` \| `false` (raising to `true` changes the manifest hash and re-confirms grants)                                                                                 | reject manifest |
| `[tools.git] version`                | string                    | yes (when the section is present) | version-requirement syntax, at most 128 bytes                                                                                                                          | reject manifest |
| dependencies / services              | gap in this reader subset | —                                 | full manifest model additionally bounds dependencies (at most 8) and provided/required services (at most 16 each, dot-separated interface names)                       | reject manifest |

There are no `[network]` and no `[limits]` manifest sections: network
authority is requested through capability ids, and bounds are
host constants, not manifest keys
([bitty#1326](https://github.com/bitty-terminal/bitty/issues/1326)).

Capability families (deny-by-default; absent means denied; no wildcards;
unknown identifiers rejected): `terminal` (`terminal.semantic-read`,
`terminal.raw-read`, `terminal.input.self`, `terminal.input.all`,
`terminal.manage`), `ui` (`ui.rich`, `ui.overlay`,
`ui.protocol-register`), `clipboard` (`clipboard.read`,
`clipboard.write`), `env` (`env.read`), `fs` (`fs.read`, `fs.write`,
always with a `:path-glob` parameter via `[[capabilities.filesystem]]`),
`process` (`process.spawn`), `network` (`network.connect`, scoped
`:host` forms), `runtime` (`runtime.inspect`, `runtime.configure`,
`runtime.plugin-manage`), `debug` (`debug.inspect`, `debug.trace`,
`debug.control`), `platform` (`platform.notify`, `platform.open-url`,
`platform.image-file`), `protocol` (`protocol.register`), `panel`
(`panel.provider`, `panel.create`, `panel.focus`, `panel.overlay`),
`browser` (`browser.embed`, `browser.navigation`, `browser.file-url`,
`browser.storage`), `layout` (`layout.provider`), `agent`
(`agent.context.terminal`, `agent.context.workspace`, `agent.memory`),
`mcp` (`mcp.invoke`), `ai` (`ai.provider`, `ai.stream`, `ai.model`).

## CLI flags

Global startup flags: `--headless`, `--test-mode` (deterministic
headless servo; takes precedence over `--headless`), `--safe`,
`--fail-loud` (failed startup steps fatal instead of fail-soft),
`--split [h|horizontal|v|vertical[:ratio]]` (bare `--split` means
horizontal), `--split-ratio <float>`, `--stack`, `--overlay`,
`--layout <single|split:h[:ratio]|stack[:n]|overlay[:x,y,w,h]>`,
`--focus <next|prev|up|down|left|right|<id>>`,
`--config <path>`, `--profile <name>`, `--theme <name>`,
`--font-family <name>`, `--font-size <points>` (raw, fail-closed at
merge), `--opacity <value>` (raw, fail-closed at merge),
`--log-level <error|warn|info|debug|trace>`, `-v` / `--verbose`
(shorthand for debug-level ticks), `--` (rest is program argv verbatim),
`-h` / `--help`, `-V` / `--version`. Unknown pre-`--` dash-flags and bad
`--split` / `--split-ratio` / `--log-level` / `--layout` / `--focus`
values exit `2`; missing `--config` / `--profile` / `--theme` /
`--font-family` / `--font-size` / `--opacity` values warn-ignored.

Subcommands: `config <path|check|edit>`, `init [--yes] [--force]
[--scrollback <lines>] [--close-confirm <always|when_busy|never>]
[--gaps-in <px>] [--gaps-out <px>] [--border <px>] [--radius <px>]`
(init-only; validated fail-closed at dispatch), `doctor
[--format <table|json|jsonl>] [--no-color]`, `run -- COMMAND...`,
`ctl` (with `--socket` / `--instance`, before or after the word),
`list|ls <kind> [--format <table|json|jsonl>] [--socket] [--instance]
[--no-color]`, `inspect <target> <value> [--format] [--no-color]`,
`dev`, `plugin`. Subcommand positionals outside the grammar fail closed
at dispatch.

## Environment variables

| Variable              | Role                                                            | Values                         |
| --------------------- | --------------------------------------------------------------- | ------------------------------ |
| `BITTY_CONFIG`        | Config file path override (below `--config`, above XDG default) | file path                      |
| `BITTY_PROFILE`       | Profile name override (below `--profile`)                       | profile name                   |
| `BITTY_SOCKET`        | IPC socket surface used by test-mode and `ctl`                  | socket path                    |
| `BITTY_VERBOSE`       | Tick stats on (`1`/`true`); shorthand for debug level           | `1`, `true` (case-insensitive) |
| `BITTY_HEADLESS`      | Single headless tick smoke (`1`/`true`)                         | `1`, `true` (case-insensitive) |
| `BITTY_LOG`           | Explicit stderr log level override                              | level name                     |
| `$SHELL`              | Shell fallback when `terminal.shell` is unset                   | executable path                |
| `$VISUAL` / `$EDITOR` | Editor for `bitty config edit` (`$VISUAL` first)                | executable                     |
| `NO_COLOR`            | Disables ANSI coloring in table output when set                 | presence                       |
| `XDG_CONFIG_HOME`     | Config root (above `%APPDATA%` above `$HOME/.config`)           | directory                      |

Plugin-side environment access is capability-gated (`env.read`,
deny-by-default), not ambient.

## Project definitions (gap)

`.wheel/project.toml` discovery exists (nearest `.wheel/project.toml`
wins within 32 ancestor levels; `.agents/` is the compatibility
fallback and never shadows an ancestor `.wheel/`), but nothing reads,
parses, or validates the file, so there are no `project.toml` options
to inventory yet
([bitty#1326](https://github.com/bitty-terminal/bitty/issues/1326)).

## References

- [Lua configuration and filesystem layout](../configuration/lua-and-xdg.md):
  the configuration design contract this reference mirrors.
- [Theme presets](../configuration/themes.md): the theme catalog design
  contract.
- [Terminal compatibility matrix](compatibility-matrix.md): sibling draft
  reference page and its honesty rules.
- Machine inventory:
  [configuration-inventory.json](configuration-inventory.json).
