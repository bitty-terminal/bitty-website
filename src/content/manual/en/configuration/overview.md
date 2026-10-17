# Configuration Reference

Bitty reads configuration from `$XDG_CONFIG_HOME/bitty/init.lua` (defaults to `~/.config/bitty/init.lua`, with fallback to `config.lua`).

Configuration is written in pure Lua (wezterm-style data return). The file is evaluated in a sandboxed, fuel-metered environment and must return a table containing configuration options.

## Live Reconciliation & Reload Classes

Bitty classifies all configuration changes into three categories:

1. **`Live`**: Reconciled immediately on file save without restarting the process or interrupting active PTY sessions.
2. **`RestartRequired`**: Accepted and persisted into effective configuration, but takes effect on the next process startup because it sets initial runtime structures.
3. **`Rejected`**: Invalid types, out-of-range bounds, or undeclared fields fail closed, triggering a rollback to the previous active configuration with clear diagnostics.

## Complete Configuration Schema

### Window & Padding

| Field                        | Type      | Reload Class | Description                                                                                                                                                            |
| :--------------------------- | :-------- | :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `window.opacity`             | `float`   | **Live**     | Background window transparency level (`0.0..=1.0`).                                                                                                                    |
| `window.padding`             | `integer` | **Live**     | Inner window padding in logical pixels (`0..=64`).                                                                                                                     |
| `window.radius_px`           | `integer` | **Live**     | Window corner radius in physical pixels (`0..=24`).                                                                                                                    |
| `window.blur_radius`         | `integer` | **Live**     | Background blur radius in logical pixels (`0..=128`; platform support varies).                                                                                         |
| `window.background_image`    | `string`  | **Live**     | Window background image path (absolute or `~`-anchored, `<= 4096` bytes, approved roots).                                                                              |
| `window.background_fit`      | `string`  | **Live**     | Fit mode: `"fill"` (cover, default), `"fit"` (contain), `"center"`, `"tile"`, `"stretch"`.                                                                             |
| `window.background_opacity`  | `float`   | **Live**     | Image dim factor (`0.0..=1.0`, default `1.0`); orthogonal to `window.opacity`.                                                                                         |
| `window.background_position` | `string`  | **Live**     | One of `"center"` (default), `"top-left"`, `"top"`, `"top-right"`, `"left"`, `"right"`, `"bottom-left"`, `"bottom"`, `"bottom-right"`; only `fit`/`center` observe it. |

### Decoration & Borders

Core-owned view decorations operate in logical pixels:

| Field                               | Type      | Reload Class | Description                                                                      |
| :---------------------------------- | :-------- | :----------- | :------------------------------------------------------------------------------- |
| `decoration.border`                 | `integer` | **Live**     | View frame border width in logical pixels (`0..=32`, default `1`).               |
| `decoration.radius`                 | `integer` | **Live**     | View frame corner radius in logical pixels (`0..=64`, default `6`).              |
| `decoration.gaps_in`                | `integer` | **Live**     | Inner gap between sibling panels in logical pixels (`0..=128`, default `6`).     |
| `decoration.gaps_out`               | `integer` | **Live**     | Outer gap around workspace container in logical pixels (`0..=128`, default `6`). |
| `decoration.content_inset`          | `integer` | **Live**     | Inner padding between border and painted content in logical pixels (`0..=128`).  |
| `decoration.border_color`           | `string`  | **Live**     | Base outline border color (`#RRGGBB` or `#RRGGBBAA`).                            |
| `decoration.border_color_focused`   | `string`  | **Live**     | Explicit outline border color for the focused view.                              |
| `decoration.border_color_idle`      | `string`  | **Live**     | Explicit outline border color for unfocused/idle views.                          |
| `decoration.border_width`           | `integer` | **Live**     | Base outline border width in logical pixels (`0..=32`, default `1`).             |
| `decoration.border_width_focused`   | `integer` | **Live**     | Explicit outline width for focused view in logical pixels.                       |
| `decoration.border_width_idle`      | `integer` | **Live**     | Explicit outline width for idle views in logical pixels.                         |
| `decoration.background_image`       | `string`  | **Live**     | Path to global background image under approved roots.                            |
| `decoration.background_fit`         | `string`  | **Live**     | Background fit mode: `"fill"`, `"fit"`, `"center"`, `"tile"`, or `"stretch"`.    |
| `decoration.background_image_roots` | `array`   | **Live**     | Approved directory roots for background image resolution.                        |

### Font & Shaping

| Field                    | Type     | Reload Class        | Description                                                                       |
| :----------------------- | :------- | :------------------ | :-------------------------------------------------------------------------------- |
| `font.family`            | `string` | **Live**            | Primary font family name used for terminal text rendering.                        |
| `font.size`              | `float`  | **Live**            | Font point size (`0.0 < size <= 128.0`).                                          |
| `font.line_height`       | `float`  | **Live**            | Line height multiplier relative to font size (`1.0..=2.0`).                       |
| `font.letter_spacing`    | `float`  | **Live**            | Additional letter spacing delta in pixels (`0.0..=8.0`).                          |
| `font.fallback`          | `array`  | **RestartRequired** | User-ordered fallback font family names tried before platform defaults.           |
| `font.features`          | `array`  | **RestartRequired** | Raw OpenType feature overrides applied at shaping time (e.g. `{"calt", "ss01"}`). |
| `font.disable_ligatures` | `string` | **RestartRequired** | Programming-ligature policy: `"never"`, `"cursor"`, or `"always"`.                |

### Terminal Behavior & Selection

| Field                              | Type      | Reload Class        | Description                                                                               |
| :--------------------------------- | :-------- | :------------------ | :---------------------------------------------------------------------------------------- |
| `terminal.scrollback`              | `integer` | **RestartRequired** | Maximum scrollback buffer lines (`0..=100000`, default `10000`).                          |
| `terminal.shell`                   | `string`  | **RestartRequired** | Preferred default shell executable path (`argv[0]`).                                      |
| `terminal.scroll_lines_per_notch`  | `integer` | **RestartRequired** | Lines scrolled per wheel notch (`1..=32`, default `3`).                                   |
| `terminal.scroll_pixels_per_notch` | `integer` | **RestartRequired** | Smooth-scroll pixels per wheel notch (`1..=256`, default `16`).                           |
| `terminal.cursor_style`            | `string`  | **RestartRequired** | Initial cursor shape (`"default"`, `"blinking_block"`, `"steady_block"`, `"steady_bar"`). |
| `terminal.bell`                    | `string`  | **RestartRequired** | Bell alert behavior (`"off"`, `"visual"`, `"audible"`, `"both"`).                         |
| `selection.auto_copy`              | `boolean` | **RestartRequired** | Whether selecting text automatically copies to the system clipboard (default `false`).    |
| `close_confirm`                    | `string`  | **RestartRequired** | View close safety confirmation: `"always"`, `"when_busy"` (default), or `"never"`.        |

### Layout & Workspaces

| Field                | Type      | Reload Class        | Description                                                                                                     |
| :------------------- | :-------- | :------------------ | :-------------------------------------------------------------------------------------------------------------- |
| `layout.gaps_in`     | `integer` | **RestartRequired** | Inner gap between sibling panes in character cells (`0` = edge-to-edge).                                        |
| `layout.gaps_out`    | `integer` | **RestartRequired** | Outer gap between container edges and panes in character cells.                                                 |
| `layout.resize_step` | `float`   | **Live**            | Tiled split-ratio delta per resize keypress (`0.01..=0.5`, default `0.05`).                                     |
| `workspace.layout`   | `string`  | **RestartRequired** | Default layout provider for new workspaces (e.g. `"dwindle"`, `"bsp"`).                                         |
| `workspace.show_bar` | `boolean` | **Live**            | Whether the workspace status bar is displayed (reserved Core input consumed by extensions).                     |
| `workspace.bar.edge` | `string`  | **Live**            | Edge placement of the workspace status bar (`"top"` or `"bottom"`, default `"bottom"`, consumed by extensions). |

### Appearance, Themes & Animations

| Field                                  | Type      | Reload Class | Description                                                                   |
| :------------------------------------- | :-------- | :----------- | :---------------------------------------------------------------------------- |
| `appearance.theme`                     | `string`  | **Live**     | Built-in theme name (e.g. `catppuccin-mocha`, `tokyo-night`, `gruvbox-dark`). |
| `appearance.colors`                    | `table`   | **Live**     | Custom inline palette definition (chrome tokens + 16 ANSI colors).            |
| `appearance.animations.enabled`        | `boolean` | **Live**     | Master switch for presentation transitions and animations.                    |
| `appearance.animations.reduced_motion` | `string`  | **Live**     | Reduced-motion accessibility mode (`"never"`, `"always"`, `"system"`).        |

### Input, Keymaps & Leader

| Field               | Type      | Reload Class | Description                                                                       |
| :------------------ | :-------- | :----------- | :-------------------------------------------------------------------------------- |
| `input.leader`      | `string`  | **Live**     | Canonical Leader chord prefix (e.g. `"ctrl+b"`, `"ctrl+space"`).                  |
| `input.timeout_len` | `integer` | **Live**     | Canonical Leader pending-window timeout in milliseconds (`100..=60000`).          |
| `leader_key`        | `string`  | **Live**     | Legacy top-level alias for `input.leader`.                                        |
| `leader_timeout_ms` | `integer` | **Live**     | Legacy top-level alias for `input.timeout_len`.                                   |
| `hints_enabled`     | `boolean` | **Live**     | Whether interactive leader chord hint overlays are enabled.                       |
| `mod_key`           | `string`  | **Live**     | Modifier key for shipped chrome keybindings (`"alt"` or `"super"`).               |
| `keymaps`           | `array`   | **Live**     | User keybinding overrides and chord registrations (`chord`, `action`, `context`). |

### Scrollbar, Mouse & Session

| Field                                | Type      | Reload Class        | Description                                                             |
| :----------------------------------- | :-------- | :------------------ | :---------------------------------------------------------------------- |
| `scrollbar.mode`                     | `string`  | **RestartRequired** | Scrollbar display mode (`"auto"`, `"always"`, `"hidden"`).              |
| `scrollbar.width`                    | `integer` | **RestartRequired** | Scrollbar thumb width in logical pixels.                                |
| `mouse.focus_follows_mouse`          | `boolean` | **RestartRequired** | Whether pane focus automatically follows cursor movement.               |
| `mouse.focus_follows_mouse_delay_ms` | `integer` | **RestartRequired** | Dwell time in milliseconds before hover focus activates.                |
| `session.restore_on_startup`         | `boolean` | **RestartRequired** | Whether to restore previous workspaces and session on startup.          |
| `plugins`                            | `array`   | **RestartRequired** | Explicit plugin declarations (`{ id = "owner/name", enabled = true }`). |

## Example `init.lua`

Here is a comprehensive, production-ready `init.lua`:

```lua
return {
  window = {
    opacity = 0.95,
    padding = 8,
    radius_px = 6,
  },
  decoration = {
    border = 1,
    radius = 6,
    gaps_in = 6,
    gaps_out = 6,
    content_inset = 6,
    border_color = "#313244",
    border_color_focused = "#89b4fa",
  },
  font = {
    family = "JetBrains Mono",
    size = 13.0,
    line_height = 1.15,
    letter_spacing = 0.0,
    disable_ligatures = "never",
  },
  terminal = {
    scrollback = 10000,
    scroll_lines_per_notch = 3,
    scroll_pixels_per_notch = 16,
    cursor_style = "steady_bar",
    bell = "visual",
  },
  selection = {
    auto_copy = false,
  },
  close_confirm = "when_busy",
  layout = {
    gaps_in = 0,
    gaps_out = 0,
    resize_step = 0.05,
  },
  workspace = {
    layout = "dwindle",
    -- The following keys are reserved Core inputs consumed by extensions
    -- (Bitty Core draws no native bar):
    show_bar = true,
    bar = {
      edge = "bottom",
    },
  },
  appearance = {
    theme = "tokyo-night",
  },
  input = {
    leader = "ctrl+space",
    timeout_len = 1000,
  },
  hints_enabled = true,
  mod_key = "alt",
  scrollbar = {
    mode = "auto",
    width = 8,
  },
  mouse = {
    focus_follows_mouse = false,
    focus_follows_mouse_delay_ms = 150,
  },
  keymaps = {
    {
      chord = "ctrl+p",
      action = "palette:toggle",
      context = "global",
    },
  },
}
```
