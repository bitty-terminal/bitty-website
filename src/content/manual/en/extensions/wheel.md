# wheel (Lua plugin)

Wheel — the official Agent Harness plugin (mascot: Bittie the hamster). Pre-implementation scaffold: a single `hello` command proving the install → enable → notify path.

- Plugin id: `bitty-terminal.wheel` · manifest version `0.0.1` (`bitty-plugin.toml:11-14`)
- Source: [github.com/bitty-terminal/wheel](https://github.com/bitty-terminal/wheel) · official registry entry (nested under `bitty-ai`, AI jurisdiction)
- Capabilities (`bitty-plugin.toml:25-30`): `platform.notify`

## Install

Lua plugins carry no CDN versions. Install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/wheel.git
bitty plugin enable bitty-terminal.wheel
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers (`bitty-plugin.toml:32-35`): command `bitty-terminal.wheel:hello`. No events, no settings.

Calls used in `lua/wheel/init.lua`:

- `bitty.commands.register` — registers `hello` (`:24`)
- `bitty.notify.show` — shows `Hello from bitty-terminal.wheel.` (`:29-31`)

## Minimal config

No settings file exists. Enable and run:

```bash
bitty plugin enable bitty-terminal.wheel
```

Then invoke `bitty-terminal.wheel:hello` from the command palette.
