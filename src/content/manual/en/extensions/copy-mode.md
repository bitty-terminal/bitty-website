# copy-mode (Lua plugin)

Modal visual-selection policy over the public history snapshot API: one bounded transcript query, then anchor/cursor selection over the cached page with grant-gated yank. Presentation state only — it never mutates Terminal Truth.

- Plugin id: `bitty-terminal.copy-mode` · manifest version `0.0.1` (`bitty-plugin.toml:25-28`)
- Source: [github.com/bitty-terminal/copy-mode](https://github.com/bitty-terminal/copy-mode) · official registry entry
- Capabilities (`bitty-plugin.toml:40-54`): `history.transcript.read`, `clipboard.write`

## Install

Lua plugins carry no CDN versions. Install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/copy-mode.git
bitty plugin enable bitty-terminal.copy-mode
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers (`bitty-plugin.toml:55-72`): commands `bitty-terminal.copy-mode:open`, `:move`, `:anchor`, `:yank`, `:close`. No event subscriptions — the plugin never streams.

Calls used in `lua/copy-mode/init.lua`:

- `bitty.commands.register` — registers the five selection verbs (`:722-772`)
- `bitty.history.transcript.query` — one bounded scoped snapshot query per `open` (`:258-280`); ops `list` / `tail` / `search`
- `bitty.selection.copy` — exports the selected span behind the clipboard grant
- `bitty.settings.get` — reads page budgets (`:661`)

Settings keys with built-in defaults (`init.lua:64-65`): `row_count` (default 10), `max_bytes` (default 4096).

## Minimal config

```toml
# ~/.config/bitty/plugins/bitty-terminal.copy-mode.toml
row_count = 10
max_bytes = 4096
```

```bash
bitty plugin enable bitty-terminal.copy-mode
bitty config check   # validate without launching a GUI
```
