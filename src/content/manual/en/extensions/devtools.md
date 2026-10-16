# devtools (Lua plugin)

Read-only inspection and event tracing of the plugin runtime: lifecycle rows, command/event registrations, own grants, and bounded event traces surfaced as notification summaries.

- Plugin id: `bitty-featured.devtools` · manifest version `0.1.0` (`bitty-plugin.toml:12-15`)
- Source: [github.com/bitty-terminal/devtools](https://github.com/bitty-terminal/devtools) · independent repo, **not yet in the official registry**
- Capabilities (`bitty-plugin.toml:25-40`): `debug.inspect`, `debug.trace`, `platform.notify` (no `debug.control`, no `ui.*`: runtime state is never mutated)

## Install

Lua plugins carry no CDN versions, and this one has no registry entry yet. Install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/devtools.git
bitty plugin enable bitty-featured.devtools
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers (`bitty-plugin.toml:42-69`):

- Commands: `bitty-featured.devtools:plugins`, `:commands`, `:events`, `:grants`, `:trace-start`, `:trace-stop`, `:trace-dump`
- Trace-only event kinds (visible to a trace while Active; the plugin subscribes to none): `terminal.opened`, `terminal.closed`, `terminal.title-changed`, `terminal.cwd-changed`, `terminal.bell`, `focus.changed`, `selection.changed`, `process.exited`, `config.reloaded`

Calls used in `lua/devtools/`:

- `bitty.commands.register` — registers the seven commands (`init.lua:86-184`)
- `bitty.debug.inspect` — lifecycle rows, registrations, own grants (`init.lua`)
- `bitty.debug.trace` / `bitty.debug.trace_get` — bounded event traces (`trace.lua:53`, `init.lua`)
- `bitty.notify.show` — renders the bounded text summaries

Settings keys: none observed.

## Minimal config

No settings file is needed. Enable, then inspect:

```bash
bitty plugin enable bitty-featured.devtools
```

Then invoke `bitty-featured.devtools:plugins` from the command palette.
