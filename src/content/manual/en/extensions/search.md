# search (Lua plugin)

Scrollback search policy over the public history snapshot API: bounded scoped transcript queries with typed denials, untrusted labels, result navigation, and grant-gated export. Presentation state only — it never mutates Terminal Truth.

- Plugin id: `bitty-terminal.search` · manifest version `0.0.1` (`bitty-plugin.toml:25-28`)
- Source: [github.com/bitty-terminal/search](https://github.com/bitty-terminal/search) · official registry entry
- Capabilities (`bitty-plugin.toml:40-50`): `history.transcript.read` (export via `bitty.selection.copy` needs the separate `clipboard.write` grant and fails closed without it)

## Install

Lua plugins carry no CDN versions. Install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/search.git
bitty plugin enable bitty-terminal.search
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers (`bitty-plugin.toml:52-66`): commands `bitty-terminal.search:search`, `:next`, `:prev`, `:clear`, `:copy`. No event subscriptions — the plugin never streams.

Calls used in `lua/search/init.lua`:

- `bitty.commands.register` — registers the five verbs (`:626-675`)
- `bitty.history.transcript.query` — one bounded scoped snapshot query per `search` (`:215-237`); ops `list` / `tail` / `search`
- `bitty.selection.copy` — exports the current match (fails closed without the clipboard grant)
- `bitty.settings.get` — reads page budgets (`:569`)

Settings keys with built-in defaults (`init.lua:49-50`): `row_count` (default 10), `max_bytes` (default 4096).

## Minimal config

```toml
# ~/.config/bitty/plugins/bitty-terminal.search.toml
row_count = 10
max_bytes = 4096
```

```bash
bitty plugin enable bitty-terminal.search
bitty config check   # validate without launching a GUI
```
