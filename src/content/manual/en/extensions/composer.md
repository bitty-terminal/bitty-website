# composer (Lua plugin)

Editable command-line policy over the public overlay, submit, and editor host APIs: a modal buffer with chord routing, bounded paste, and an external-editor round trip. Presentation state only — it never mutates Terminal Truth.

- Plugin id: `bitty-terminal.composer` · manifest version `0.0.1` (`bitty-plugin.toml:16-19`)
- Source: [github.com/bitty-terminal/composer](https://github.com/bitty-terminal/composer) · official registry entry
- Capabilities (`bitty-plugin.toml:34-45`): `ui.overlay.focus`, `terminal.input.submit`, `process.editor`

## Install

Lua plugins carry no CDN versions. Install from the repository, then enable:

```bash
bitty plugin install https://github.com/bitty-terminal/composer.git
bitty plugin enable bitty-terminal.composer
bitty plugin list   # confirm state and grants
```

## Lua API surface

Declared triggers (`bitty-plugin.toml:47-66`):

- Commands: `bitty-terminal.composer:open`, `:submit`, `:cancel`, `:close`, `:editor`
- Events: `overlay.released`, `focus.changed`

Calls used in `lua/composer/init.lua`:

- `bitty.commands.register` — registers the five session verbs (`:1055-1151`)
- `bitty.events.subscribe` — observes overlay/focus transitions (`:459-620`)
- `bitty.ui.overlay.*` — acquires, updates, and releases the modal surface
- `bitty.terminal.submit` — bounded buffer submission through the Core paste pipeline
- `bitty.process.editor.start` — allowlisted external-editor round trip on a Core-owned temp file
- `bitty.keymaps.suggest` — advertises the open chord
- `bitty.settings.get` — reads chord settings (`:1007`)

Settings keys with built-in defaults (`init.lua:48-61`): `newline` (`enter`), `submit` (`ctrl+enter`), `close` (`escape`), `external_editor` (`alt+e`), `open_chord` (`alt+e`). See also [Composer Modal Usage](../plugins/composer.md).

## Minimal config

```toml
# ~/.config/bitty/plugins/bitty-terminal.composer.toml
newline = "enter"
submit = "ctrl+enter"
close = "escape"
external_editor = "alt+e"
open_chord = "alt+e"
```

```bash
bitty plugin enable bitty-terminal.composer
bitty config check   # validate without launching a GUI
```
