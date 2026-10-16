# bitty.ui Reference

The `bitty.ui` module provides the declarative UI contribution surface. Plugins construct and mount declarative scene trees into host-managed slots, altering presentation while preserving terminal grid integrity.

## Design Principles

- **Declarative Only**: Lua plugins produce immutable description trees. The Rust host handles layout computation and composites directly via `wgpu`.
- **No Immediate-Mode Loops**: Lua never participates in per-frame draw loops. Updates occur reactively when state changes.
- **Strict Budgets**: Scene depth, node counts, and text allocations are strictly capped to prevent frame drops.

## Core Methods

### `bitty.ui.mount(slot, component)`

Mounts a declarative component tree into a host-managed slot.

```lua
local handle = bitty.ui.mount(slot, component)
```

- **Parameters**:
  - `slot` (`string`): The target slot name.
  - `component` (`table`): A declarative node table.
- **Returns**: `integer` — An opaque, generation-owned `block_id` handle.
- **Required Capability**: `ui.rich` in `bitty-plugin.toml`.

#### Supported Slots

| Slot Name      | Placement Status | Description                                                                       |
| :------------- | :--------------- | :-------------------------------------------------------------------------------- |
| `"top"`        | **Painted**      | Top edge chrome band.                                                             |
| `"bottom"`     | **Painted**      | Bottom edge chrome band.                                                          |
| `"statusline"` | **Painted**      | Statusline band (shares bottom edge stacking order).                              |
| `"left"`       | Stored           | Left edge band (stored in registry; painted when vertical bands activate).        |
| `"right"`      | Stored           | Right edge band (stored in registry; painted when vertical bands activate).       |
| `"tabline"`    | Reserved         | Exclusive-claim tab strip. Requires manifest claim `[lazy].claims = ["tabline"]`. |
| `"overlay"`    | Interactive      | Focusable overlay surface. Requires `ui.overlay` capability.                      |
| `"terminal"`   | Reserved         | Terminal block attached to scrollback.                                            |

### `bitty.ui.update(block_id, component)`

Replaces the scene subtree associated with an active `block_id`.

```lua
local ok = bitty.ui.update(handle, component)
```

- **Parameters**:
  - `block_id` (`integer`): Handle returned by a previous `bitty.ui.mount` call.
  - `component` (`table`): The replacement component tree.
- **Returns**: `boolean` — `true` if updated successfully; `false` if the handle is stale or owned by another generation.

## Declarative Node Vocabulary

Bitty Plugin API v1 accepts four lightweight declarative node kinds:

### 1. `Text`

A leaf node displaying styled text content.

```lua
{
  kind = "Text",
  text = "  bitty ",
  fg = "accent",          -- Theme token or hex color
  bg = "surface.2",       -- Theme background token
  bold = true,            -- Optional boolean
  on_click = {            -- Optional command trigger
    command = "my-plugin:toggle",
    args = { mode = "fast" },
  },
}
```

### 2. `Row`

A container laying out child nodes horizontally.

```lua
{
  kind = "Row",
  children = {
    { kind = "Text", text = "Branch: " },
    { kind = "Text", text = "main", fg = "accent", bold = true },
  },
}
```

### 3. `Column`

A container laying out child nodes vertically.

```lua
{
  kind = "Column",
  children = {
    { kind = "Text", text = "Line 1" },
    { kind = "Text", text = "Line 2" },
  },
}
```

### 4. `List`

A sequential list container.

```lua
{
  kind = "List",
  children = { item1, item2, item3 },
}
```

> [!NOTE]
> Heavy nodes such as `Block`, `Image`, `CodeBlock`, `Table`, and `Rule` are excluded from v1. Passing them returns error `E_UI_COMPONENT_INVALID`.

## Interactive Click Commands (`on_click`)

Nodes can bind interactive clicks. When clicked, the host dispatches the event through the Command Bus rather than invoking an arbitrary Lua closure on the rendering thread:

```lua
on_click = {
  command = "custom.my-plugin:select",
  args = { index = 1, name = "tab" },
}
```

- `command`: Command identifier string (max 64 bytes).
- `args`: Key-value scalar map (max 16 arguments, max 256 bytes per string).

## Hardware Safety Budgets

The bridge enforces deterministic ceilings before passing nodes to Rust:

- **Maximum Tree Depth**: 16 levels (`UI_MAX_DEPTH`).
- **Maximum Nodes per Block**: 2,048 nodes (`UI_MAX_NODES`).
- **Maximum Text Bytes per Block**: 256 KiB (`UI_MAX_TEXT_BYTES`).
- **Maximum Retained Blocks per Plugin**: 64 blocks (`UI_MAX_BLOCKS`).

## Overlay & Transient Input (`bitty.ui.overlay`)

For command palettes, modal dialogs, or picker interfaces that require transient keyboard input:

```lua
-- Acquire input capture (requires ui.overlay.focus capability)
local session = bitty.ui.overlay.acquire({
  title = "Quick File Switcher",
  placeholder = "Type to search...",
})

-- Update overlay content
bitty.ui.overlay.update(session, content_tree)

-- Poll for captured input events asynchronously
local events = bitty.ui.overlay.poll(session, 16)

-- Release overlay when done
bitty.ui.overlay.release(session, "submitted") -- or "cancelled"
```

## Example: Building a Live Statusline Component

```lua
-- bitty-plugin.toml requires:
-- [capabilities]
-- ui = ["ui.rich"]

local status_tree = {
  kind = "Row",
  children = {
    {
      kind = "Text",
      text = "  BITTY ",
      fg = "accent",
      bold = true,
      on_click = { command = "palette:open", args = {} },
    },
    {
      kind = "Text",
      text = " | Ready",
      fg = "surface.1",
    },
  },
}

-- Mount into statusline slot
local handle = bitty.ui.mount("statusline", status_tree)

-- Update statusline dynamically upon event
bitty.events.subscribe("terminal.state_changed", function(ev)
  status_tree.children[2].text = " | " .. ev.state
  bitty.ui.update(handle, status_tree)
end)
```
