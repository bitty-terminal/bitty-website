# bitty.commands & bitty.keymaps

The command and keymap subsystem coordinates user actions, Command Palette entries, and keyboard shortcuts across Bitty while preserving user sovereignty over keybindings.

## Commands (`bitty.commands`)

Commands represent named actions that can be triggered by keymaps, UI click handlers, or the interactive Command Palette.

### Registering Commands

```lua
bitty.commands.register({
  id = "my-plugin:format-buffer",
  title = "Format Active Buffer",
  description = "Runs the configured formatter on the current active view",
  run = function(args)
    -- Execute action logic
    bitty.notify.show({
      title = "Formatter",
      body = "Buffer formatted successfully",
    })
  end,
})
```

- **Parameters**: Table with `id` (`string`, max 128 bytes), `title` (`string`, max 128 bytes), optional `description` (`string`, max 1024 bytes), and `run` (`function`).
- **Quota**: Up to 128 registered commands per plugin generation (`REGISTRATION_MAX_COMMANDS`).
- **Lazy Manifest Declaration**: In `bitty-plugin.toml`, declare `commands = ["my-plugin:format-buffer"]` under `[lazy]`. The command appears in the Command Palette immediately upon startup without initializing the plugin's Lua VM. The VM loads on demand when the command is first invoked.

## Keymap Suggestions (`bitty.keymaps`)

In Bitty, user configuration retains ultimate authority over keyboard bindings. Plugins **never** hijack or directly bind key shortcuts without user control.

### Suggesting Default Keymaps

Plugins offer keybinding suggestions via `bitty.keymaps.suggest`:

```lua
-- Suggest a global key chord
local handle = bitty.keymaps.suggest({
  chord = "ctrl+shift+k",
  command = "my-plugin:format-buffer",
  when = "global",
})
```

- **`chord`**: Chord string specifying modifier and key combinations (e.g. `"ctrl+shift+k"`, `"alt+p"`).
- **`command`**: The target command ID to trigger.
- **`when`**: Execution scope (default `"global"`).

### Leader Prefix Suggestions

Plugins can suggest chords using the user-configured Leader prefix:

```lua
-- Suggest Leader followed by 'f' then 'b'
bitty.keymaps.suggest({
  chord = "leader f b",
  command = "my-plugin:format-buffer",
  when = "global",
})
```

Using `"leader <key>"` automatically resolves against the user's configured `input.leader` (or `leader_key`) without hardcoding specific modifiers.

### User Keybinding Configuration (`init.lua`)

Users bind or override key chords directly in `$XDG_CONFIG_HOME/bitty/init.lua`:

```lua
return {
  keymaps = {
    {
      chord = "ctrl+shift+k",
      action = "my-plugin:format-buffer",
      context = "global",
    },
    {
      chord = "ctrl+p",
      action = "palette:toggle",
      context = "global",
    },
  },
}
```

## Events (`bitty.events`)

Subscribe to terminal lifecycle and environment events using `bitty.events.subscribe`:

```lua
bitty.events.subscribe("focus.changed", function(event)
  if event.focused then
    -- Panel gained focus
  else
    -- Panel lost focus
  end
end)
```

- **Parameters**: `kind` (`string`, 1..=128 bytes) and `handler` (`function`).
- **Quota**: Up to 256 event subscriptions per plugin generation (`REGISTRATION_MAX_EVENTS`).

### Standard Events

The host admits a closed set of event kinds; subscribing to an unknown kind withholds the payload fail-closed:

| Event Name                 | Description                                                                                                         |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| `"terminal.opened"`        | A terminal session opened.                                                                                          |
| `"terminal.closed"`        | A terminal session closed.                                                                                          |
| `"terminal.title-changed"` | A terminal title changed.                                                                                           |
| `"terminal.cwd-changed"`   | A terminal working directory changed.                                                                               |
| `"terminal.bell"`          | Terminal bell alert triggered.                                                                                      |
| `"focus.changed"`          | Pane or window focus gained/lost.                                                                                   |
| `"selection.changed"`      | The terminal selection changed.                                                                                     |
| `"process.exited"`         | A supervised child process exited.                                                                                  |
| `"config.reloaded"`        | The effective configuration was reloaded.                                                                           |
| `"plugin.activated"`       | A plugin generation was activated.                                                                                  |
| `"plugin.suspended"`       | A plugin generation was suspended.                                                                                  |
| `"plugin.disposed"`        | A plugin generation was disposed.                                                                                   |
| `"handler.violation"`      | A plugin handler violated its budget or contract.                                                                   |
| `"intercept.*"`            | Gated interception hooks (`command-dispatch`, `terminal-spawn`, `paste`, `open-url`) — payloads redacted per grant. |
