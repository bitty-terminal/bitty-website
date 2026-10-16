# git-panel (Lua plugin)

Tiled panel showing git branch, status, diff, and log, driven by allowlisted `git` subprocesses with bounded output. Requires `git >= 2.30` on `PATH`, declared in the manifest (`bitty-plugin.toml:52-60`).

- Plugin id: `bitty-terminal.git-panel` · manifest version `0.1.0` (`bitty-plugin.toml:18-21`)
- Source: [github.com/bitty-terminal/git-panel](https://github.com/bitty-terminal/git-panel) · official registry entry
- Capabilities (`bitty-plugin.toml:30-56`): `panel.provider`, `panel.create`, `terminal.semantic-read`, `process.spawn:git` (only the `git` binary; only `status`, `diff`, `log`, `branch`, `show`, `rev-parse`, `ls-files`), plus a read-only `~/projects/**` filesystem scope

## Install

Lua plugins carry no CDN versions. Install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/git-panel.git
bitty plugin enable bitty-terminal.git-panel
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers (`bitty-plugin.toml:62-75`):

- Commands: `bitty-terminal.git-panel:open`, `:status`, `:diff`, `:log`, `:branch`
- Events: `terminal.cwd-changed`, `terminal.title-changed`, `focus.changed`

Calls used in `lua/git-panel/`:

- `bitty.commands.register` — registers the five commands (`init.lua:321-386`)
- `bitty.events.subscribe` — refreshes the snapshot-derived cache (`init.lua:46-49`)
- `bitty.terminal.snapshot` — read-only cwd/title observation that selects the working tree

Settings keys: none observed — the panel refreshes from terminal observation and `git` output only.

## Minimal config

No settings file is needed. Enable and open:

```bash
bitty plugin enable bitty-terminal.git-panel
```

Then invoke `bitty-terminal.git-panel:open` from the command palette inside a git checkout under `~/projects/`.
