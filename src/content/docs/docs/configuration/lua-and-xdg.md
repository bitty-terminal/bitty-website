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

Status: **shipped config surface, live painting deferred** (read-only from
`bitty` `origin/main`, PR `bitty` #487 merge commit `485fbfd`, CTX-0292,
closes `bitty` #486; merged to `bitty` origin `main`, verified read-only via
`merge-base --is-ancestor`). This section is the reference for the shipped
decoration surface; the accepted normative contract is the
[Workspace Compositor Specification](../specifications/workspace-compositor.md)
section "Core-owned gaps, border, and radius" (accepted CTX-0118), and the
merge-class instantiation stays in the
[Configuration Model RFC](../specifications/configuration-model-rfc.md). It
changes no normative contract above and weakens no security control.

Shipped contract (`decoration.*`, logical pixels):

| Field                 | Default | Valid range | Owner |
| --------------------- | ------- | ----------- | ----- |
| `decoration.gaps_in`  | `4` px  | `0..=32` px | Core  |
| `decoration.gaps_out` | `6` px  | `0..=32` px | Core  |
| `decoration.border`   | `2` px  | `0..=8` px  | Core  |
| `decoration.radius`   | `6` px  | `0..=16` px | Core  |

- Core owns the surface: the four fields are validated through `ConfigPlan`,
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
- `bitty --safe` forces `gaps_in = 0`, `gaps_out = 0`, `border = 1`,
  `radius = 0` (`0/0/1/0`) regardless of user configuration (accepted
  contract rule 5).

Shipped config contract:

```lua
-- Shipped schema (CTX-0292, bitty #487).
return {
    decoration = { gaps_in = 4, gaps_out = 6, border = 2, radius = 6 },
}
```

Absent `decoration` tables (or absent keys within them) mean "this layer
says nothing" and inherit silently.

Status honesty: live present-path painting of px decoration is **deferred**.
The shipped single-window present path still paints the cell-unit
`layout.gaps_in` / `layout.gaps_out` gaps; px decoration needs fractional-cell
View frames plus a renderer radius primitive, tracked as `bitty` CTX-0294 on
the CTX-0238g stage-2 renderer radius lane. Until that lands, `decoration.*`
values are validated, stored, attributed, and carried, but must not be
described as a visible change.

### Decoration px versus layout cells

Two similarly named gap surfaces exist and must not be conflated:

| Surface                           | Unit                 | Default   | Range    | Status                                                         |
| --------------------------------- | -------------------- | --------- | -------- | -------------------------------------------------------------- |
| `layout.gaps_in` / `gaps_out`     | cells (`10x22` each) | `0` / `0` | `0..=16` | shipped; painted by the single-window path (CTX-0177/CTX-0240) |
| `decoration.gaps_in` / `gaps_out` | logical px           | `4` / `6` | `0..=32` | shipped config surface; live painting deferred (CTX-0292)      |

Also distinct: `decoration.radius` (View frame corner radius, logical px)
versus `window.radius_px` (window corner radius, physical px, S0 parsed no-op,
CTX-0241).

Open: whether a CLI flag set grows to cover `decoration.*`; the CTX-0294 /
CTX-0238g stage-2 delivery owns the actual visual behavior.

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
Cache is rebuildable. Runtime sockets and locks belong to the login session,
while sessions and layouts intended to survive restart belong in state.

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
- How is reload classified into live-reconcilable versus restart-required
  changes?
- What are the native macOS and Windows directory mappings?
- What is the trust database location and invalidation rule for local project
  configuration?
- What are the final manifest/lock names, and how do they coexist with Lua
  plugin specifications or distribution imports?
