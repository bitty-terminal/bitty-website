# palette (Lua plugin)

Command palette and picker UI over the focusable overlay slot: acquires the overlay with a presentation hint (`title`, `placeholder`), paints the filtered entries, and releases on done. Declarative primitives only.

- Plugin id: `bitty-terminal.palette` · manifest version `0.0.1` (`bitty-plugin.toml:11-14`)
- Source: [github.com/bitty-terminal/palette](https://github.com/bitty-terminal/palette) · official registry entry
- Capabilities (`bitty-plugin.toml:33-49`): `ui.overlay.focus` (single coupled grant)

## Install

Lua plugins carry no CDN versions. Install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/palette.git
bitty plugin enable bitty-terminal.palette
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers (`bitty-plugin.toml:51-56`):

- Commands: `bitty-terminal.palette:toggle`
- Events: `focus.changed`, `overlay.released`

Calls used in `lua/palette/`:

- `bitty.commands.register` — registers `toggle` (`init.lua:143-172`)
- `bitty.events.subscribe` — observes focus/overlay transitions (`init.lua:74`)
- `bitty.ui.overlay.acquire` / `bitty.ui.overlay.update` — single Core-owned switch mounts the surface and paints content
- `bitty.settings.get` — reads `entries` (`init.lua:52`) and `query` (`init.lua:60`)

Settings keys (file `~/.config/bitty/plugins/bitty-terminal.palette.toml`): `entries`, `query`. Absent keys fall back to built-in defaults; see [per-plugin config files](../plugins/plugin-settings.md).

## Minimal config

```toml
# ~/.config/bitty/plugins/bitty-terminal.palette.toml
query = ""
```

```bash
bitty plugin enable bitty-terminal.palette
bitty config check   # validate without launching a GUI
```
