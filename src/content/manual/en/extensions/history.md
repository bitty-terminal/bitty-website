# history (Lua plugin)

Opt-in history keeper over the public history-read host APIs: scoped, bounded snapshot queries over transcript segments, command history, and the plugin's own KV namespace, answered with redacted, truncated, attributed results or typed denials. Never streams, never touches session snapshots.

- Plugin id: `bitty-terminal.history` · manifest version `0.0.1` (`bitty-plugin.toml:27-30`)
- Source: [github.com/bitty-terminal/history](https://github.com/bitty-terminal/history) · official registry entry
- Capabilities (`bitty-plugin.toml:42-57`): `history.transcript.read`, `history.commands.read`, `history.kv.read` (no export grant: reading never implies clipboard, file, or process export)

## Install

Lua plugins carry no CDN versions. Install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/history.git
bitty plugin enable bitty-terminal.history
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers (`bitty-plugin.toml:59-68`): commands `bitty-terminal.history:query-transcript`, `:query-commands`, `:query-kv`. No event subscriptions — one-shot queries over already-persisted state.

Calls used in `lua/history/init.lua`:

- `bitty.commands.register` — registers the three query commands (`:555-577`)
- `bitty.history[source].query` — dynamic dispatch over the `transcript` / `commands` / `kv` sources (`:486`; sources in `:70`)
- `bitty.api_version` — compat gate requiring Plugin API `^1.0` (`:522`)

Settings keys: none observed — bounds arrive per query; over-bound queries are denied by the host.

## Minimal config

No settings file is needed. Enable, then query from the palette:

```bash
bitty plugin enable bitty-terminal.history
```
