# Lua API Reference

Bitty exposes a sandboxed runtime environment via the global, read-only `bitty` namespace in Lua.

## API Architecture & Extension Levels

The API is structured into two distinct operational levels:

```text
Global bitty Namespace
├── L1 Control & State
│   ├── bitty.commands        # Register contextual commands
│   ├── bitty.events          # Subscribe to runtime events
│   ├── bitty.keymaps         # Suggest default keyboard chords
│   ├── bitty.panel           # Control pane lifecycle and presentation
│   ├── bitty.workspace       # Query and arrange workspaces
│   ├── bitty.notify          # Display system notifications
│   ├── bitty.store           # Generation-isolated key-value storage
│   ├── bitty.settings        # Read/write user configuration
│   ├── bitty.timers          # High-resolution asynchronous timers
│   ├── bitty.tasks           # Asynchronous task runner
│   └── bitty.services        # Cross-plugin service provider bus (peer-provided only)
└── L2 Presentation & UI
    └── bitty.ui              # Declarative UI scene tree, slots & overlays
```

- **L1 Control Level**: Manages state, handles actions, coordinates commands, and reacts to events. Alters behavior without touching the rendering pipeline.
- **L2 Presentation Level**: Mounts declarative UI scene subtrees into host-managed slots. Alters appearance, never terminal stream truth.

## Version Discovery

Inspect the running Plugin API contract version at runtime:

```lua
local api_version = bitty.api_version
print("Running Bitty Plugin API: " .. tostring(api_version))
```

## Error Handling Model (`BridgeError`)

Every denial or fault across the host bridge arrives as a catchable Lua error table with three structured fields:

```text
{
  class   = "runtime" | "validation" | "resolution" | "budget",
  code    = "E_CAPABILITY_DENIED" | "E_TIMEOUT" | "E_UI_UNAVAILABLE" | ...,
  message = "Human-readable description from host"
}
```

### Idiomatic Error Handling

Always match on `err.code` rather than parsing error message strings:

```lua
local ok, err = pcall(function()
  return bitty.ui.mount("statusline", {
    kind = "Text",
    text = "Status text",
  })
end)

if not ok then
  if type(err) == "table" then
    if err.code == "E_CAPABILITY_DENIED" then
      print("Error: Missing ui.rich capability in bitty-plugin.toml")
    elseif err.code == "E_UI_UNAVAILABLE" then
      print("Error: The requested slot is unavailable in this host build")
    else
      print(string.format("[%s] %s: %s", err.class, err.code, err.message))
    end
  else
    print("Fatal error: " .. tostring(err))
  end
end
```

## Reference Modules

Explore the dedicated reference pages for specific modules:

- [bitty.ui Reference](ui.md) — Declarative scene trees, slots, overlays, and targeting frameworks.
- [bitty.commands & bitty.keymaps Reference](commands-keymaps.md) — Command registration and keyboard chord management.
- [bitty.panel & bitty.workspace Reference](panel-workspace.md) — Panel modes, layout manipulation, and workspace navigation.
- [bitty.services, Notify & State Reference](services-notify.md) — Service discovery, desktop notifications, storage, and timers.
- [Core System APIs Reference](system.md) — Terminal snapshots, settings reflection, sandboxed environment, filesystem, and tasks.
