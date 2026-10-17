# Bar Modules User Guide

The Unified Bar (`bitty-terminal.bar`) renders one inset row: workspace pills plus optional system modules in three ordered groups — left, center, right — declared in your [per-plugin config file](plugin-settings.md). It follows the Waybar layout you may already know, with one host limit: the v1 API exposes no spacer node, so the three groups render left-to-right in declarative order rather than true left/center/right alignment.

## Choosing modules

```toml
# $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.bar.toml
show = true
modules_left = ["workspaces", "cpu", "memory", "battery"]
modules_center = []
modules_right = ["clock", "pulseaudio"]
```

An unknown module name, a non-list group, or a plan that resolves to nothing never hides the bar: the plan falls back to `modules_left = ["workspaces"]`. A lone workspace hides the bar unless `show_single = true`; `show = false` hides everything.

## Fail-closed behavior

Every provider-backed module hides itself — leaving the rest of the bar untouched — when its provider is absent, ungranted, stale past the horizon, revoked, or malformed. A hidden module never hides the bar, and providers send raw numbers only: thresholds and icons evaluate Lua-side, so a lost source degrades to absence, never to fabricated zeros.

Read and control never share an interface. Ungranted control degrades to read-only rendering (or a notification on click), never to an error, a retry, or an escalation.

## Module catalog

### workspaces (event-driven)

One pill per workspace (`{stable-id}:{name}`, active pill marked `*`), followed by the workspace count. Names truncate to `name_max_chars` (default `32`); the whole line is bounded to 1024 UTF-8 bytes. Clicking an inactive pill focuses that workspace; the active pill, separators, and the count suffix are not clickable. An occupied window scratchpad appends the "[scratchpad]" marker after the count and forces the bar visible even with a lone workspace.

### clock (local, no grant needed)

Renders `os.date` with a per-module `format` (default `"%H:%M"`). Refreshes on `tick_ms` (default `60000`, clamped to a `200` ms floor).

### cpu (provider `system.cpu`)

Aggregate CPU utilization polled at the 2 s provider ceiling (`tick_ms` default `2000`, `1000` ms floor). Template keys: `{total}`, `{total_pct}` (rounded integer); default format `"{total}%"`.

| Option     | Default      | Notes                                                     |
| :--------- | :----------- | :-------------------------------------------------------- |
| `format`   | `"{total}%"` | Template override                                         |
| `warning`  | `80`         | At-or-above reads `warning`; needs `warning` < `critical` |
| `critical` | `90`         | At-or-above reads `critical`                              |
| `tick_ms`  | `2000`       | Poll cadence; `1000` ms floor                             |
| `tooltip`  | none         | Detail text, e.g. `CPU 42% (8 cores)`                     |

### memory (provider `system.memory`)

Memory and swap utilization polled at the 2 s ceiling (`tick_ms` default `2000`, `1000` ms floor). Template keys: `{pct}`, `{used}`, `{total}` (GiB), plus the swap triple; default format `"{pct}%"`. `warning` (`80`) and `critical` (`90`) share the at-or-above direction of `cpu`. Default detail: `Memory 5/8 GiB (63%)`, plus swap when reported.

### battery (provider `system.battery`)

Capacity and charge state polled at the 5 s ceiling (`tick_ms` default `5000`, `1000` ms floor). Template keys: `{icon}`, `{capacity}`, `{state}`; default format `"{icon} {capacity}%"`.

| Option     | Default | Notes                                           |
| :--------- | :------ | :---------------------------------------------- |
| `warning`  | `30`    | At-or-below reads `warning` — discharging only  |
| `critical` | `15`    | At-or-below reads `critical` — discharging only |

Only a discharging battery alarms on low capacity; `full`, `charging`, `plugged`, and `unknown` render the icon with the default presentation. Icons are five ASCII buckets by capacity (`[    ]` through `[====]`) with a `+` mark while charging. Default detail: `Battery 63% discharging`, plus watts and time left when reported.

### network (provider `network`, 3 s floor)

Link plus measured bandwidth (`wifi 8.0K/4.0K`); unmeasured rates are omitted, never zero-filled. The ESSID renders only when the separately-granted `network.essid` sub-interface resolves (`wifi 8.0K/4.0K (Home)`); otherwise that key is absent and the rest is unaffected. Never clickable. Options: `format` (`{link}`, `{down}`, `{up}`, `{essid}`), `tick_ms` (at or above 3 s), `tooltip`.

### bluetooth (provider `bluetooth`, 5 s floor)

Radio state plus bonded-device counts (`bt on (1/2)`). Read-only by default; the device list rides the detail notification. With `toggle = true` and the `bluetooth.control` grant, click flips radio power via `set_power` only. Options: `format` (`{status}`, `{connected}`, `{total}`, `{powered}`), `tick_ms` (at or above 5 s), `tooltip`, `toggle`.

### backlight (provider `backlight`, 5 s floor)

Brightness (`75%`). Click steps by `step` percent points (default `10`) via `set_step` only. A denied attempt reports `E_NOT_PERMITTED` and degrades to a notification — it never retries, never escalates, never setuids. Without the control grant the module is read-only. Options: `format` (`{pct}`), `tick_ms` (at or above 5 s), `tooltip`, `step` (`-100..100`).

### idle (provider `idle`, 5 s floor)

Inhibit state (`inhibit:on` / `inhibit:off`; glyphs stay config-side via `on_text` / `off_text`). Click flips inhibition via `set` only while that grant holds; a denied toggle degrades to a notification. Options: `tick_ms` (at or above 5 s), `tooltip`, `on_text`, `off_text`.

### pulseaudio (provider `audio.state`, 2 s floor)

Volume, mute, and port with icon selection Lua-side. Click toggles mute and the mouse wheel steps the volume through `audio.control` (bounded steps, coalesced host-side). Read-only text when the control grant is missing; hidden when the state monitor is absent.

| Option           | Default | Notes                                                        |
| :--------------- | :------ | :----------------------------------------------------------- |
| `format`         | none    | Template override: `{icon}`, `{volume}`, `{port}`, `{muted}` |
| `show_port`      | `true`  | Append the truncated port to the text                        |
| `port_max_chars` | `16`    | Port display width, `1..64`                                  |
| `tick_ms`        | `2000`  | State poll cadence, `200` ms floor                           |

### spectrum (provider `audio.spectrum`, 4 fps)

The cava-lite meter: block glyphs in a text row from at most 32 spectrum buckets (`buckets` default `8`, range `1..32`; `tick_ms` default `250`, `200` ms floor). Falloff smoothing and peak-hold run Lua-side; `paused = true` freezes the last row. Hidden until a live spectrum source lands host-side — the meter hides rather than fabricates, so on hosts whose audio monitor exposes no level taps you simply see no meter.

## Per-module options: honest limits

Per-module option collections (one named group per module: `clock`, `cpu`, `memory`, `battery`, `network`, `bluetooth`, `backlight`, `idle`, `pulseaudio`, `spectrum`, `workspaces`) are declared in the manifest, but the v1 settings contract has no table or dot-path form: option groups currently read as module defaults, so user-supplied per-module options stay **inert** until a table/dot-path settings follow-up lands host- and SDK-side. No plugin change is needed when it does. Chassis scalars (`show`, `edge`, `show_single`, `name_max_chars`) and the three module lists work today.

## Known host gaps (not plugin bugs)

- The host parses `on_click` into the scene but does not yet route band clicks to the bound command, so module clicks do nothing on a live host.
- Band painting ignores `fg`, `bg`, and `bold`. The active workspace pill stays identifiable through the `*` mark.
- Plugin bands overlay the edge content row instead of reflowing the grid, and an empty (hidden) band still takes a stacking index.
- Activation is lazy: the plugin activates on its first declared event or command, so `show_single = true` takes effect after the first workspace event.
- While Core still draws its own workspaceline, set `workspace.show_bar = false` to avoid two bars.

## Next steps

- [Per-Plugin Config Files](plugin-settings.md) — File paths, the TOML subset, and the fail-to-default rules.
- [Troubleshooting & Safe Mode](../faq/troubleshooting.md) — What hidden modules and activation errors mean.
