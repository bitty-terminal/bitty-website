# Getting Started with Plugins

Bitty provides a secure, event-driven Lua extension runtime built upon a stackless, fuel-metered Lua interpreter (Phodopus). All plugins operate in isolated sandboxes with zero-VM lazy loading, strict memory ceilings, and fine-grained capability gates.

## Plugin Structure

A Bitty plugin lives in an isolated directory and contains a manifest file alongside pure Lua source files:

```text
my-plugin/
├── bitty-plugin.toml   # Canonical manifest: metadata, capabilities, lazy triggers
└── lua/
    ├── init.lua        # Entry point executed upon activation
    └── helper.lua      # Private modules loaded via rooted require("helper")
```

## The Plugin Manifest (`bitty-plugin.toml`)

Every plugin must define a `bitty-plugin.toml` manifest at its root:

```toml
[plugin]
id = "custom.my-plugin"
name = "My Custom Plugin"
version = "0.1.0"
description = "A productivity tool for Bitty terminal"

[compat]
bitty = ">=0.1.0,<1.0.0"
plugin-api = "^1.0"

[capabilities]
platform.notify = true
ui = ["ui.rich"]

[lazy]
commands = ["my-plugin:open"]
events = ["terminal.opened"]
```

### Manifest Tables Explained

- **`[plugin]`**: Unique reverse-DNS identifier (`id`), human-readable name, semver version, and description.
- **`[compat]`**: Compatibility boundaries for the Bitty host binary and the Plugin API contract.
- **`[capabilities]`**: Explicit permissions requested by the plugin. Untrusted plugins receive zero ambient authority; undeclared operations fail closed.
- **`[lazy]`**: Triggers that instruct Bitty when to create the plugin's Lua VM:
  - `commands`: Commands registered directly into the Command Palette without loading Lua code.
  - `events`: System lifecycle events that awaken the plugin.
  - `claims`: Exclusive claims to reserved slots (e.g. `claims = ["tabline"]`).

## The Lazy Loading Lifecycle

Bitty enforces a three-state lifecycle to prevent resource bloat:

$$\text{Installed} \longrightarrow \text{Loaded} \longrightarrow \text{Active}$$

1. **Installed**: The plugin manifest is parsed and validated into the host registry. Zero Lua VMs exist, consuming 0 bytes of memory.
2. **Loaded**: A lazy trigger fires (e.g. user invokes a command or an event triggers). The host instantiates a dedicated Phodopus VM and runs `lua/init.lua`.
3. **Active**: The plugin is responding to events or rendering mounted UI blocks. When idle, plugins transition to suspended states to preserve CPU and battery.

## Developing & Testing Locally

Install your local plugin during development using the CLI:

```bash
# Install a local directory as a plugin package
bitty plugin install ./my-plugin

# List recorded plugins and their capability grants
bitty plugin list
```

## Next Steps

- [Capabilities & Sandboxing](capabilities-and-sandbox.md) — Learn about security boundaries, resource quotas, and capability families.
- [Native Component Boundary](upstream-components.md) — Understand how upstream prebuilt extensions share native infrastructure across plugins.
- [Lua API Reference](../api/overview.md) — Explore the sandboxed `bitty.*` API surface.
