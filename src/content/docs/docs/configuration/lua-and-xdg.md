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

Status: **candidate contract.**

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

## Starters and distributions

Status: **accepted direction.**

Bitty core remains minimal. Starter configurations and distributions use the
same public configuration and plugin contracts available to the community;
official distributions do not receive hidden core branches.

Candidate initial experiences are:

- `minimal`: one small `init.lua`;
- `starter`: a commented modular scaffold comparable to `kickstart.nvim`;
- a later official distribution containing ordinary plugins for tabs,
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
