# bar (Lua plugin)

Consolidated workspace-bar, tabs, and statusline presentation over generic chrome insets: renders one workspace bar band (pills per workspace) and handles pill clicks by focusing the workspace.

- Plugin id: `bitty-terminal.bar` · manifest version `0.0.1` (`bitty-plugin.toml:11-14`)
- Source: [github.com/bitty-terminal/bar](https://github.com/bitty-terminal/bar) · official registry entry
- Capabilities (`bitty-plugin.toml:24-32`): `ui.rich`, `workspace.read`, `workspace.control`

## Install

Lua plugins carry no CDN versions. Install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/bar.git
bitty plugin enable bitty-terminal.bar
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers (`bitty-plugin.toml:34-46`):

- Commands: `bitty-terminal.bar:focus` (click target for inactive pills)
- Events: `workspace.created`, `workspace.closed`, `workspace.renamed`, `workspace.focused`, `workspace.changed`, `config.reloaded`

Calls used in `lua/bar/init.lua`:

- `bitty.commands.register` — registers `focus` (`:343`)
- `bitty.events.subscribe` — re-renders on workspace events (`:346-377`)
- `bitty.workspace.list` — enumerates pills (`:340`)
- `bitty.workspace.focus` — pill click target
- `bitty.ui.mount` / `bitty.ui.update` — mounts and refreshes the bar band
- `bitty.settings.get` — reads chassis settings (`:332-333`)

Settings keys with built-in defaults (`init.lua:56-61`): `show` (default true), `edge` (default `"bottom"`), `show_single` (default false), `name_max_chars`. See also the [bar modules user guide](../plugins/bar-modules.md).

## Minimal config

```toml
# ~/.config/bitty/plugins/bitty-terminal.bar.toml
show = true
edge = "bottom"
show_single = false
name_max_chars = 32
```

```bash
bitty plugin enable bitty-terminal.bar
bitty config check   # validate without launching a GUI
```
