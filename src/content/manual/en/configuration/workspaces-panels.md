# Workspaces & Panels

Bitty organizes your window environment through a composable container hierarchy separating workspace layout from individual panel presentation.

## Hierarchy & Concepts

```text
Window
└── Workspaces (Virtual Desktops / Tabs)
    ├── Chrome Insets / Slot (visual bar rendered by an extension, never by Core)
    └── Panels (Containers)
        ├── Presentation Mode: Tiled, Floating, or Overlay
        └── View: Shell process / PTY session or native UI widget
```

### Workspaces

A **Workspace** is an independent virtual desktop. Each workspace manages its own layout tree:

- Switching workspaces changes the visible pane arrangement without suspending or interrupting background shell jobs.
- The default tiling algorithm is configured via `workspace.layout` (e.g. `"dwindle"`, `"bsp"`).
- **Workspace Bar Separation**: In accordance with Bitty's microkernel architecture, Bitty Core draws no visual workspace bar itself. Visual presentation is provided by an extension. Configuration keys `workspace.show_bar` and `workspace.bar.edge` (default `"bottom"`, or `"top"`) are reserved Core inputs consumed by extensions.

### Panels & Layout Spacing

A **Panel** is a workspace-managed container. Panels decouple window management from raw terminal sessions:

- **Panel ID != View ID != Terminal ID**: A panel holds a view, but its presentation mode can change dynamically.
- **Tiled Mode**: Panels participate in binary tree directional tiling (horizontal and vertical splits).
- **Cell Gaps**: Tiled pane spacing in character cells is controlled by `layout.gaps_in` (inner gap between sibling panes) and `layout.gaps_out` (outer container margin).
- **Resize Granularity**: Interactive split resizing applies `layout.resize_step` (split-ratio delta, default `0.05`).
- **Floating Mode**: A panel detaches from the tiling tree to float above active terminals, retaining its dimensions, position, and focus state.
- **Overlay Mode**: Transient focusable surfaces (such as the Command Palette or picker dialogs) appear centered and capture keyboard input until dismissed.

## Managing Workspaces and Panels

Panels and workspaces can be controlled through default shortcut keys or programmatically via the Lua API:

- Use shortcuts to create, split, and navigate panels.
- For complete Lua automation functions (such as creating panels, toggling floating modes, or switching workspaces), see the [bitty.panel & bitty.workspace API Reference](../api/panel-workspace.md).
