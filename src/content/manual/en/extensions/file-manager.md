# file-manager (Lua plugin)

File manager listing, navigation, and preview with terminal observation only and a bounded 8 KiB payload. The single requested capability gates the read-only cwd/title observation the listing cache refreshes from.

- Plugin id: `bitty-terminal.file-manager` · manifest version `0.1.0` (`bitty-plugin.toml:11-14`)
- Source: [github.com/bitty-terminal/file-manager](https://github.com/bitty-terminal/file-manager) · official registry entry
- Capabilities (`bitty-plugin.toml:23-36`): `terminal.semantic-read`

## Install

Lua plugins carry no CDN versions. Install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/file-manager.git
bitty plugin enable bitty-terminal.file-manager
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers (`bitty-plugin.toml:37-54`):

- Commands: `bitty-terminal.file-manager:open`, `:preview`, `:rename`
- Events: `terminal.cwd-changed`, `terminal.title-changed`, `focus.changed`

Calls used in `lua/file-manager/`:

- `bitty.commands.register` — registers the three commands (`init.lua:214-252`)
- `bitty.events.subscribe` — refreshes the snapshot-derived cache (`init.lua:49-52`)
- `bitty.terminal.snapshot` — read-only cwd/title observation
- `bitty.ui.mount` / `bitty.ui.register_panel` — presents the listing surface
- `bitty.settings.get` — reads `entries` (`init.lua:116`) and `root` (`init.lua:130`)

Settings keys (file `~/.config/bitty/plugins/bitty-terminal.file-manager.toml`): `entries`, `root`. Absent keys fall back to built-in defaults; see [per-plugin config files](../plugins/plugin-settings.md).

## Minimal config

```toml
# ~/.config/bitty/plugins/bitty-terminal.file-manager.toml
root = "~/projects"
```

```bash
bitty plugin enable bitty-terminal.file-manager
bitty config check   # validate without launching a GUI
```
