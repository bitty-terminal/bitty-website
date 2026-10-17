# Actions Catalog

Every keyboard-triggerable chrome action, every shipped default chord, and every `core.*` registry command in one place. This page is generated from the Bitty implementation, not from memory: the ground truth is `crates/bitty-config/src/keymap.rs` (`ChromeAction`, `DEFAULT_KEYMAPS`) and `crates/bitty-terminal/src/inspect.rs` (`CORE_COMMANDS`) at bitty `0.0.22`.

## Ground truth and verification

Bitty `0.0.22` does not ship `bitty list actions` or `bitty list keymaps`: both fail closed as unknown kinds (exit 2, `want themes|plugins|instances`). This was confirmed against a local build (`cargo build -p bitty-terminal` with `CARGO_TARGET_DIR` under `.targets/manual-catalog`, binary reports `bitty 0.0.22`):

```bash
bitty list actions --format json
# bitty list: unknown kind "actions" (want themes|plugins|instances) — exit 2

bitty list keymaps --format json
# bitty list: unknown kind "keymaps" (want themes|plugins|instances) — exit 2
```

The tables below are therefore extracted 1:1 from source and cross-checked mechanically:

- Chrome actions cover the full `ChromeAction` vocabulary (`KNOWN_ACTIONS_HINT` plus the `parse` arms): 38 rows, one per variant. Parameterized actions (`goto_split:<dir>`, `workspace_focus:<n>`, ...) are single rows with their valid ranges.
- Default chords reproduce `DEFAULT_KEYMAPS` entry for entry: 97 rows, Alt-as-Mod spelling, source order.
- `core.*` commands reproduce `CORE_COMMANDS`: 14 rows.
- Re-run procedure: from a bitty checkout at the pinned revision, extract the `(chord, action)` pairs from `DEFAULT_KEYMAPS`, the canonical spellings from `ChromeAction::canonical`, and the ids from `CORE_COMMANDS`, then assert that every extracted token appears in the matching table on this page and that the row counts are 38 / 97 / 14. Per-chord spot checks use `bitty inspect key <chord>` (e.g. `bitty inspect key alt+h` names `goto_split:left`; unbound keys such as `tab` succeed with `bound: false`).

## Chrome actions

One row per `ChromeAction` variant. "Manual-bind-only" means the action never appears in `DEFAULT_KEYMAPS`: it stays parseable and user-bindable but has no shipped chord.

| Action                                 | Behavior                                                                                                                                                                       | Default chord(s)                                                                                                                                                                                                                                                                                                     | Manual-bind-only           |
| :------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------- |
| `goto_split:<left\|right\|up\|down>`   | Move focus spatially to the neighboring pane.                                                                                                                                  | `alt+h`, `alt+j`, `alt+k`, `alt+l`, `alt+left`, `alt+down`, `alt+up`, `alt+right`, `ctrl+alt+left`, `ctrl+alt+down`, `ctrl+alt+up`, `ctrl+alt+right`                                                                                                                                                                 | No                         |
| `new_split:<left\|right\|up\|down>`    | Split the focused pane in a fixed direction.                                                                                                                                   | `shift+alt+h`, `shift+alt+j`, `shift+alt+k`, `shift+alt+l`, `shift+alt+left`, `shift+alt+down`, `shift+alt+up`, `shift+alt+right`                                                                                                                                                                                    | No                         |
| `new_panel`                            | Open a new panel with adaptive dwindle axis (wide splits side-by-side, tall stacks), placed new-second with focus following it.                                                | `alt+n`                                                                                                                                                                                                                                                                                                              | No                         |
| `resize_split:<left\|right\|up\|down>` | Nudge the enclosing split ratio by one `layout.resize_step` step.                                                                                                              | `shift+ctrl+h`, `shift+ctrl+j`, `shift+ctrl+k`, `shift+ctrl+l`, `shift+ctrl+left`, `shift+ctrl+down`, `shift+ctrl+up`, `shift+ctrl+right`, `ctrl+shift+alt+h`, `ctrl+shift+alt+j`, `ctrl+shift+alt+k`, `ctrl+shift+alt+l`, `ctrl+shift+alt+left`, `ctrl+shift+alt+down`, `ctrl+shift+alt+up`, `ctrl+shift+alt+right` | No                         |
| `close_view`                           | Close the focused pane (aliases `close_surface`, `close_panel`, `exit_panel`). Honors `close_confirm`: first press arms, repeat confirms, `Esc` cancels.                       | `alt+d`, `alt+q`                                                                                                                                                                                                                                                                                                     | No                         |
| `toggle_zoom`                          | Toggle single-pane zoom (aliases `toggle_split_zoom`, `suspend_panel`, `detach_panel`).                                                                                        | `alt+m`, `alt+f`, `alt+z`                                                                                                                                                                                                                                                                                            | No                         |
| `toggle_help`                          | Toggle the floating help overlay listing every bound shortcut (alias `show_help`; rows generated from the live registry).                                                      | ``alt+` ``, `alt+?`, `alt+shift+?`, `alt+shift+/`                                                                                                                                                                                                                                                                    | No                         |
| `focus_next`                           | Focus the next pane in depth-first order.                                                                                                                                      | `ctrl+tab`                                                                                                                                                                                                                                                                                                           | No                         |
| `focus_prev`                           | Focus the previous pane in depth-first order.                                                                                                                                  | `ctrl+shift+tab`                                                                                                                                                                                                                                                                                                     | No                         |
| `focus:<1..=256>`                      | Focus a numeric view id. Retired from the defaults (workspace numbers won the `Alt` slot); stays parseable for explicit binds.                                                 | —                                                                                                                                                                                                                                                                                                                    | Yes (intentional)          |
| `copy_to_clipboard`                    | Copy the current selection to the system clipboard (no selection warns, layout untouched).                                                                                     | `ctrl+shift+c`                                                                                                                                                                                                                                                                                                       | No                         |
| `paste_from_clipboard`                 | Paste the system clipboard through the suspicious-paste confirmation gate.                                                                                                     | `ctrl+shift+v`                                                                                                                                                                                                                                                                                                       | No                         |
| `scroll_page_up`                       | Scroll the focused pane up by one viewport page.                                                                                                                               | `alt+i`                                                                                                                                                                                                                                                                                                              | No                         |
| `scroll_page_down`                     | Scroll the focused pane down by one viewport page.                                                                                                                             | `alt+u`                                                                                                                                                                                                                                                                                                              | No                         |
| `increase_font_size`                   | Grow the per-window font size one step (aliases `zoom_in`, `font_zoom_in`).                                                                                                    | `ctrl+equal`, `ctrl+plus`, `ctrl+shift+equal`, `ctrl+shift+plus`                                                                                                                                                                                                                                                     | No                         |
| `decrease_font_size`                   | Shrink the per-window font size one step (aliases `zoom_out`, `font_zoom_out`).                                                                                                | `ctrl+minus`, `ctrl+shift+minus`                                                                                                                                                                                                                                                                                     | No                         |
| `reset_font_size`                      | Reset the per-window font size to the startup value (aliases `zoom_reset`, `font_zoom_reset`).                                                                                 | `ctrl+0`                                                                                                                                                                                                                                                                                                             | No                         |
| `open_composer`                        | Open the Command Composer (submit writes one frame to the focused PTY).                                                                                                        | —                                                                                                                                                                                                                                                                                                                    | Yes (intentional)          |
| `fold_toggle`                          | Flip the latest command block's fold state (alias `toggle_fold`).                                                                                                              | —                                                                                                                                                                                                                                                                                                                    | Yes (intentional)          |
| `fold_expand`                          | Ensure the latest command block is unfolded, idempotent (alias `expand_fold`).                                                                                                 | —                                                                                                                                                                                                                                                                                                                    | Yes (intentional)          |
| `fold_collapse`                        | Ensure the latest command block is folded, idempotent (alias `collapse_fold`).                                                                                                 | —                                                                                                                                                                                                                                                                                                                    | Yes (intentional)          |
| `workspace_new`                        | Create a fresh workspace and switch to it.                                                                                                                                     | `alt+t`                                                                                                                                                                                                                                                                                                              | No                         |
| `workspace_close`                      | Close the active workspace (live sessions arm a kill-confirm; repeat confirms, `Esc` cancels).                                                                                 | `alt+w`                                                                                                                                                                                                                                                                                                              | No                         |
| `workspace_prev`                       | Switch to the previous workspace.                                                                                                                                              | `alt+-`                                                                                                                                                                                                                                                                                                              | No                         |
| `workspace_next`                       | Switch to the next workspace.                                                                                                                                                  | `alt+=`                                                                                                                                                                                                                                                                                                              | No                         |
| `workspace_last`                       | Switch to the last-used workspace (MRU order; no-op with one workspace).                                                                                                       | `alt+tab`                                                                                                                                                                                                                                                                                                            | No                         |
| `workspace_next_occupied`              | Switch to the next occupied workspace rightward, wrapping (aliases `workspace_cycle_next`, `workspace_cycle_next_occupied`).                                                   | `alt+[`                                                                                                                                                                                                                                                                                                              | No                         |
| `workspace_prev_occupied`              | Switch to the previous occupied workspace leftward, wrapping (aliases `workspace_cycle_prev`, `workspace_cycle_prev_occupied`).                                                | `alt+]`                                                                                                                                                                                                                                                                                                              | No                         |
| `workspace_focus:<1..=16>`             | Jump to workspace N (unknown indices warn, state untouched).                                                                                                                   | `alt+1`, `alt+2`, `alt+3`, `alt+4`, `alt+5`, `alt+6`, `alt+7`, `alt+8`, `alt+9` (`10..=16` unbound)                                                                                                                                                                                                                  | Partial (`10..=16` manual) |
| `workspace_move:<1..=16>`              | Move the focused window to workspace N (alias `workspace_move_window`).                                                                                                        | `shift+alt+1`, `shift+alt+2`, `shift+alt+3`, `shift+alt+4`, `shift+alt+5`, `shift+alt+6`, `shift+alt+7`, `shift+alt+8`, `shift+alt+9` (`10..=16` unbound)                                                                                                                                                            | Partial (`10..=16` manual) |
| `workspace_swap:<1..=16>`              | Swap the current workspace with workspace N (moves there when the target is empty).                                                                                            | `ctrl+shift+alt+1`, `ctrl+shift+alt+2`, `ctrl+shift+alt+3`, `ctrl+shift+alt+4`, `ctrl+shift+alt+5`, `ctrl+shift+alt+6`, `ctrl+shift+alt+7`, `ctrl+shift+alt+8`, `ctrl+shift+alt+9` (`10..=16` unbound)                                                                                                               | Partial (`10..=16` manual) |
| `jump_to_prompt:prev`                  | Jump the focused viewport to the previous shell prompt (aliases `jump_to_prompt_prev`, `prompt_prev`).                                                                         | `shift+alt+pageup`                                                                                                                                                                                                                                                                                                   | No                         |
| `jump_to_prompt:next`                  | Jump the focused viewport to the next shell prompt (aliases `jump_to_prompt_next`, `prompt_next`).                                                                             | `shift+alt+pagedown`                                                                                                                                                                                                                                                                                                 | No                         |
| `select_command_output`                | Select exactly the last command's output (alias `select_output`).                                                                                                              | `alt+o`                                                                                                                                                                                                                                                                                                              | No                         |
| `toggle_palette`                       | Toggle the command palette overlay (aliases `open_palette`, `palette_toggle`). Bundled-disabled until the panel host lands; a bound chord is consumed as inert with a warning. | —                                                                                                                                                                                                                                                                                                                    | Yes (intentional)          |
| `toggle_floating`                      | Toggle the focused panel between tiled and floating (alias `floating_toggle`).                                                                                                 | `alt+a`                                                                                                                                                                                                                                                                                                              | No                         |
| `toggle_pinned`                        | Toggle the focused panel's pinned (sticky-float) state (alias `pinned_toggle`).                                                                                                | —                                                                                                                                                                                                                                                                                                                    | Yes (intentional)          |
| `command:<owner:command>`              | Invoke one registered plugin command with empty args (aliases `invoke_command`, `run_command`). Commands with required args refuse the chord loudly.                           | —                                                                                                                                                                                                                                                                                                                    | Yes (intentional)          |

## `core.*` registry commands

The static core command surface (`CORE_COMMANDS` in `inspect.rs`): 11 `ctl` executables plus 3 `list` executables. Inspect any entry with `bitty inspect command <id>` (dot and colon forms are equivalent, e.g. `bitty inspect command core.terminal.text`); invoke the escape hatch with `bitty cmd <qualified-id> [-- <args-json>]` (well-formed ids without a live dispatch target fail closed naming the `bitty ctl ...` sugar form where one exists).

| Command                   | Class     | Summary                                                           |
| :------------------------ | :-------- | :---------------------------------------------------------------- |
| **`core.instance.list`**  | `local`   | List live instances via socket discovery (no content fetch).      |
| **`core.window.list`**    | `runtime` | List windows of the selected instance.                            |
| **`core.view.list`**      | `runtime` | List views of the selected instance.                              |
| **`core.terminal.list`**  | `runtime` | List terminals of the selected instance.                          |
| **`core.terminal.spawn`** | `runtime` | Spawn a terminal (explicit elevation).                            |
| **`core.terminal.close`** | `runtime` | Close a terminal by id (explicit elevation).                      |
| **`core.terminal.send`**  | `runtime` | Send input text to the focused terminal (untrusted bytes).        |
| **`core.terminal.text`**  | `runtime` | Read terminal text (untrusted observation data).                  |
| **`core.view.split`**     | `runtime` | Split the focused view in a direction.                            |
| **`core.view.focus`**     | `runtime` | Focus a view by id.                                               |
| **`core.config.reload`**  | `runtime` | Reload configuration in the live instance (explicit elevation).   |
| **`core.list.themes`**    | `local`   | Enumerate built-in theme presets (local).                         |
| **`core.list.plugins`**   | `local`   | Enumerate the static bundled plugin catalog (local, no VM).       |
| **`core.list.instances`** | `runtime` | Enumerate live instances via socket discovery (no content fetch). |

Bundled plugin commands (same source as `bitty list plugins`) are looked up the same way via `bitty inspect command <publisher.name:command>`. The shell-integration bundle declares no commands, so the plugin-command list is currently empty; workspace verbs live in Core as `bitty ctl workspace`.

## Default keymap

The shipped map is the canonical Alt-as-Mod spelling: plain `Tab`, bare arrows, letters, and digits stay unbound so they reach the shell. 97 entries, source order:

| Default chord          | Action                    |
| :--------------------- | :------------------------ |
| `alt+h`                | `goto_split:left`         |
| `alt+j`                | `goto_split:down`         |
| `alt+k`                | `goto_split:up`           |
| `alt+l`                | `goto_split:right`        |
| `alt+left`             | `goto_split:left`         |
| `alt+down`             | `goto_split:down`         |
| `alt+up`               | `goto_split:up`           |
| `alt+right`            | `goto_split:right`        |
| `alt+1`                | `workspace_focus:1`       |
| `alt+2`                | `workspace_focus:2`       |
| `alt+3`                | `workspace_focus:3`       |
| `alt+4`                | `workspace_focus:4`       |
| `alt+5`                | `workspace_focus:5`       |
| `alt+6`                | `workspace_focus:6`       |
| `alt+7`                | `workspace_focus:7`       |
| `alt+8`                | `workspace_focus:8`       |
| `alt+9`                | `workspace_focus:9`       |
| `shift+alt+1`          | `workspace_move:1`        |
| `shift+alt+2`          | `workspace_move:2`        |
| `shift+alt+3`          | `workspace_move:3`        |
| `shift+alt+4`          | `workspace_move:4`        |
| `shift+alt+5`          | `workspace_move:5`        |
| `shift+alt+6`          | `workspace_move:6`        |
| `shift+alt+7`          | `workspace_move:7`        |
| `shift+alt+8`          | `workspace_move:8`        |
| `shift+alt+9`          | `workspace_move:9`        |
| `ctrl+shift+alt+1`     | `workspace_swap:1`        |
| `ctrl+shift+alt+2`     | `workspace_swap:2`        |
| `ctrl+shift+alt+3`     | `workspace_swap:3`        |
| `ctrl+shift+alt+4`     | `workspace_swap:4`        |
| `ctrl+shift+alt+5`     | `workspace_swap:5`        |
| `ctrl+shift+alt+6`     | `workspace_swap:6`        |
| `ctrl+shift+alt+7`     | `workspace_swap:7`        |
| `ctrl+shift+alt+8`     | `workspace_swap:8`        |
| `ctrl+shift+alt+9`     | `workspace_swap:9`        |
| `alt+u`                | `scroll_page_down`        |
| `alt+i`                | `scroll_page_up`          |
| `ctrl+alt+left`        | `goto_split:left`         |
| `ctrl+alt+right`       | `goto_split:right`        |
| `ctrl+alt+up`          | `goto_split:up`           |
| `ctrl+alt+down`        | `goto_split:down`         |
| `ctrl+tab`             | `focus_next`              |
| `ctrl+shift+tab`       | `focus_prev`              |
| `shift+alt+h`          | `new_split:left`          |
| `shift+alt+j`          | `new_split:down`          |
| `shift+alt+k`          | `new_split:up`            |
| `shift+alt+l`          | `new_split:right`         |
| `shift+alt+left`       | `new_split:left`          |
| `shift+alt+down`       | `new_split:down`          |
| `shift+alt+up`         | `new_split:up`            |
| `shift+alt+right`      | `new_split:right`         |
| `shift+ctrl+h`         | `resize_split:left`       |
| `shift+ctrl+j`         | `resize_split:down`       |
| `shift+ctrl+k`         | `resize_split:up`         |
| `shift+ctrl+l`         | `resize_split:right`      |
| `shift+ctrl+left`      | `resize_split:left`       |
| `shift+ctrl+down`      | `resize_split:down`       |
| `shift+ctrl+up`        | `resize_split:up`         |
| `shift+ctrl+right`     | `resize_split:right`      |
| `ctrl+shift+alt+h`     | `resize_split:left`       |
| `ctrl+shift+alt+j`     | `resize_split:down`       |
| `ctrl+shift+alt+k`     | `resize_split:up`         |
| `ctrl+shift+alt+l`     | `resize_split:right`      |
| `ctrl+shift+alt+left`  | `resize_split:left`       |
| `ctrl+shift+alt+down`  | `resize_split:down`       |
| `ctrl+shift+alt+up`    | `resize_split:up`         |
| `ctrl+shift+alt+right` | `resize_split:right`      |
| `alt+d`                | `close_view`              |
| `alt+q`                | `close_view`              |
| `alt+w`                | `workspace_close`         |
| `alt+m`                | `toggle_zoom`             |
| `alt+f`                | `toggle_zoom`             |
| `ctrl+shift+c`         | `copy_to_clipboard`       |
| `ctrl+shift+v`         | `paste_from_clipboard`    |
| `alt+z`                | `toggle_zoom`             |
| `alt+n`                | `new_panel`               |
| `alt+a`                | `toggle_floating`         |
| `alt+t`                | `workspace_new`           |
| `alt+-`                | `workspace_prev`          |
| `alt+=`                | `workspace_next`          |
| `alt+tab`              | `workspace_last`          |
| `alt+[`                | `workspace_next_occupied` |
| `alt+]`                | `workspace_prev_occupied` |
| `ctrl+equal`           | `increase_font_size`      |
| `ctrl+plus`            | `increase_font_size`      |
| `ctrl+shift+equal`     | `increase_font_size`      |
| `ctrl+shift+plus`      | `increase_font_size`      |
| `ctrl+minus`           | `decrease_font_size`      |
| `ctrl+shift+minus`     | `decrease_font_size`      |
| `ctrl+0`               | `reset_font_size`         |
| ``alt+` ``             | `toggle_help`             |
| `alt+?`                | `toggle_help`             |
| `alt+shift+?`          | `toggle_help`             |
| `alt+shift+/`          | `toggle_help`             |
| `shift+alt+pageup`     | `jump_to_prompt:prev`     |
| `shift+alt+pagedown`   | `jump_to_prompt:next`     |
| `alt+o`                | `select_command_output`   |

### `mod_key`: Super remap rule

One setting rebinds the whole chrome map. `mod_key` accepts only `"alt"` (default) or `"super"`; `ctrl`/`shift` fail closed because they would steal shell typing and shadow the fixed chords below.

```lua
return {
  mod_key = "super", -- default "alt": every alt-bearing default becomes super (alt+h -> super+h)
}
```

With `mod_key = "super"`, every default chord carrying `alt` is rebound through the `alt` slot (`alt+h` becomes `super+h`, `shift+alt+h` becomes `shift+super+h`, `ctrl+alt+left` becomes `ctrl+super+left`). Chords without `alt` pass through unchanged. Explicit user `keymaps` entries keep their exact spelling and overlay by `context + chord` identity (same identity replaces the default, anything else appends), so a mod flip never rewrites user intent.

### Reservation rules: single-owner and fixed chords

- Single-owner: a key event that exactly matches one bound chord is consumed by that chrome action and never reaches the PTY; an unbound key always goes to the shell. Matching is exact chord equality only — no fuzzy or prefix matching (a Leader chord never fuzzy-matches either).
- Fixed chords: the mod-independent defaults have no `alt` slot and pass a Super flip through untouched: `ctrl+tab` / `ctrl+shift+tab` cycling, `shift+ctrl` (plus `shift+ctrl+arrows`) resizing, `ctrl+shift+c` / `ctrl+shift+v` copy/paste, and the `ctrl`-held font-zoom chords. Pure `shift+alt` stays creation (`new_split`): it cannot also resize, and `shift+alt+arrows` create splits while `shift+ctrl+arrows` resize, which is why prompt jumps use the free page keys.
- One chord has exactly one owner. Digits stay free under this rule (`shift+alt+h/j/k/l` remain creation while `shift+alt+1..=9` move windows).
- Only the `global` context exists today; any other context fails closed. Bare-modifier keys can never be a chord key, and a single-character key requires at least one modifier so a binding can never silently steal shell typing.

## Customization

Override or extend the map from `$XDG_CONFIG_HOME/bitty/init.lua` (falls back to `config.lua`). Entries are `Live`: they reconcile on file save without interrupting PTY sessions.

```lua
return {
  mod_key = "alt",
  keymaps = {
    -- Replace a default: same context + chord identity wins over the shipped entry.
    { chord = "alt+h", action = "goto_split:left", context = "global" },
    -- Append a manual-bind-only action on a free chord.
    { chord = "alt+e", action = "open_composer", context = "global" },
    -- Parameterized actions and plugin invocation bind the same way.
    { chord = "alt+g", action = "workspace_focus:10", context = "global" },
    { chord = "ctrl+alt+p", action = "command:bitty-featured.devtools:plugins", context = "global" },
  },
}
```

Chord grammar: `<mod>+...+<key>`, case-insensitive, any modifier order. Modifiers are `ctrl`/`control`, `alt`/`opt`/`option`, `shift`, `super`/`meta`/`cmd`/`command`/`win`/`windows`. The key is one named key (`tab`, `enter`, `escape`, `space`, `backspace`, `delete`/`del`, `insert`/`ins`, `home`/`hm`, `end`, `pageup`/`pgup`/`pu`, `pagedown`/`pgdn`/`pd`, `up`, `down`, `left`, `right`, `f1`..`f35`) or one single ASCII character (which requires at least one modifier). See `Chord::parse` in `bitty-config/src/keymap.rs` for the authoritative grammar; unknown tokens fail closed with the known-action list.

Plugins never bind keys directly: they suggest via `bitty.keymaps.suggest` and the user keeps authority. See [bitty.commands & bitty.keymaps](../api/commands-keymaps.md) for `suggest`, Leader-prefix suggestions, and the `init.lua` binding reference.

```lua
-- Manual-bind-only example: opt in to the Command Composer on alt+e.
-- Suggested chord; alt+e is free in the shipped map.
return {
  keymaps = {
    { chord = "alt+e", action = "open_composer", context = "global" },
  },
}
```

## Actions with no default binding

Every unbound action below is intentional per the implementation (each is documented "manual bind only, never in `DEFAULT_KEYMAPS`" or equivalent at its definition site). There are no true gaps, so no bitty issues were filed.

| Action                                                                        | Why unbound                                                                                                                       |
| :---------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| `focus:<1..=256>`                                                             | Intentional: `alt+1..=9` now jump workspaces (CTX-0257); pane-number jump stays available via explicit bind and `ctl view focus`. |
| `open_composer`                                                               | Intentional: keeps a fresh config byte-identical until the user opts in (suggested chord `alt+e`).                                |
| `fold_toggle`, `fold_expand`, `fold_collapse`                                 | Intentional: same byte-identical discipline (suggested chord `alt+z` for `fold_toggle`).                                          |
| `toggle_palette`                                                              | Intentional: palette stays bundled-disabled until the panel host lands (suggested chord `ctrl+shift+p`, free in the shipped map). |
| `toggle_pinned`                                                               | Intentional: same byte-identical discipline (suggested chord `alt+p`).                                                            |
| `command:<owner:command>`                                                     | Intentional: invocation targets are user- and plugin-specific (example chord `ctrl+alt+p`).                                       |
| `workspace_focus:10..=16`, `workspace_move:10..=16`, `workspace_swap:10..=16` | Intentional: single-chord digits only cover `1..=9`; higher indices are user-bindable (e.g. `alt+g` for `workspace_focus:10`).    |
