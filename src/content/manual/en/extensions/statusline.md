# statusline (Lua plugin)

Cwd, mode, git, and task presentation via status-component composition: recomposes declarative components whenever a reactive terminal event fires.

- Plugin id: `bitty-terminal.statusline` · manifest version `0.0.1` (`bitty-plugin.toml:11-14`)
- Source: [github.com/bitty-terminal/statusline](https://github.com/bitty-terminal/statusline) · independent repo, **not yet in the official registry**
- Capabilities (`bitty-plugin.toml:23-33`): `terminal.semantic-read`, `ui.rich`

## Install

Lua plugins carry no CDN versions, and this one has no registry entry yet. Install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/statusline.git
bitty plugin enable bitty-terminal.statusline
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers (`bitty-plugin.toml:34-43`): no commands — the manifest-declared observation events activate and drive recomposition: `terminal.cwd-changed`, `terminal.title-changed`, `focus.changed`, `terminal.opened`.

Calls used in `lua/statusline/`:

- `bitty.events.subscribe` — subscribes the reactive event set (`init.lua:76-94`)
- `bitty.terminal.snapshot` — read-only committed-state observation
- `bitty.ui.mount` / `bitty.ui.update` — mounts and refreshes the statusline slot
- `bitty.settings.get` — reads presentation settings via the `M.SETTINGS` map (`init.lua:32-39,42-68`): `separator`, `show_cwd`, `show_title`, `show_exit`, `max_components`, `component_max_chars`

Settings keys (file `~/.config/bitty/plugins/bitty-terminal.statusline.toml`): `separator`, `show_cwd`, `show_title`, `show_exit`, `max_components`, `component_max_chars`. Absent keys fall back to built-in defaults; see [per-plugin config files](../plugins/plugin-settings.md).

## Minimal config

```toml
# ~/.config/bitty/plugins/bitty-terminal.statusline.toml
separator = " | "
show_cwd = true
show_title = true
```

```bash
bitty plugin enable bitty-terminal.statusline
bitty config check   # validate without launching a GUI
```
