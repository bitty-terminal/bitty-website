# activity (Lua plugin)

Privacy-first local activity timeline: aggregates semantic terminal snapshots into local per-day counts, durations, and cwd summaries, and surfaces them as a notification. Command arguments are never stored (`bitty-plugin.toml:67`, `store_command_args` defaults to false).

- Plugin id: `bitty-featured.activity` · manifest version `0.0.1` (`bitty-plugin.toml:12-15`)
- Source: [github.com/bitty-terminal/activity](https://github.com/bitty-terminal/activity) · official registry entry
- Capabilities (`bitty-plugin.toml:25-36`): `terminal.semantic-read`, `platform.notify`

## Install

Lua plugins carry no CDN versions. Install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/activity.git
bitty plugin enable bitty-featured.activity
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers (`bitty-plugin.toml:38-51`):

- Commands: `bitty-featured.activity:summary`, `bitty-featured.activity:clear`
- Events: `terminal.opened`, `terminal.closed`, `terminal.cwd-changed`, `process.exited`, `plugin.suspended`, `plugin.disposed`

Calls used in `lua/activity/`:

- `bitty.commands.register` — registers `summary` / `clear` (`init.lua:197,212`)
- `bitty.events.subscribe` — drives aggregate updates and flush-on-suspend (`init.lua:223-307`)
- `bitty.terminal.snapshot` — read-only cwd/title observation for aggregates
- `bitty.notify.show` — renders the summary text
- `bitty.store` — persists aggregates across generations (`init.lua:71`)
- `bitty.settings.get` — reads `store_command_args` (`init.lua:67`) and `retention_days` (`init.lua:68-71`, default `aggregate.DEFAULT_RETENTION_DAYS = 7` in `aggregate.lua:20`)

Settings keys (file `~/.config/bitty/plugins/bitty-featured.activity.toml`): `store_command_args` (boolean, default false), `retention_days` (number, default 7).

## Minimal config

```toml
# ~/.config/bitty/plugins/bitty-featured.activity.toml
store_command_args = false
retention_days = 7
```

```bash
bitty plugin enable bitty-featured.activity
bitty config check   # validate without launching a GUI
```
