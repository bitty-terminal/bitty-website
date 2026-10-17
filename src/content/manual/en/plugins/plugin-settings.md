# Per-Plugin Config Files

Each plugin owns one optional user file. Values you put there override the plugin's shipped built-in defaults **per key**; anything you omit keeps working on defaults — a fresh install ships working, and configuration is override-only.

## File location

```text
$XDG_CONFIG_HOME/bitty/plugins/<owner>.<name>.toml
```

Fallback `~/.config/bitty/plugins/<owner>.<name>.toml`. Windows follows the same platform precedence as the main config (`%APPDATA%` / `%LOCALAPPDATA%`). The file name derives from the validated plugin id only, so a validated id can never escape the `plugins/` directory. An absent file (or an absent `plugins/` directory) is not an error.

Examples:

```text
~/.config/bitty/plugins/bitty-terminal.bar.toml
~/.config/bitty/plugins/bitty-terminal.composer.toml
```

## The TOML subset (flat keys only)

The file is parsed as data, never executed: no `include`, no `exec`, no shell, no sections, no dotted keys, no nesting.

```toml
# flat keys only
show = true                  # boolean
name_max_chars = 32          # bare integer
edge = "bottom"              # double-quoted string
modules_left = ["workspaces", "cpu"]  # single-line array of strings
```

Value rules:

- Values are booleans, bare integers, double-quoted strings, or single-line string arrays. Floats, quoted numbers, inline tables, nested arrays, and multi-line values are not in the subset: the offending key falls back to its default while the rest of the file still applies.
- Unknown keys (keys the plugin manifest never declared) change nothing: they are recorded as skipped.
- Duplicate keys, a `[section]`, a line without `=`, or a malformed key fails the **whole file** closed — the plugin keeps running on defaults. An unterminated string or array only skips that key.
- Tables are not in the v1 grammar. This is why per-module option groups (such as the bar's per-module settings) stay inert until a table/dot-path follow-up lands — see the [bar modules guide](bar-modules.md). Storing a table today mismatches the declared kind and reads as the default.
- Non-UTF-8 files fail closed; a plugin never observes mojibake it could mistake for configuration.

Size bounds fail closed before any value is trusted: at most 16 KiB and 512 lines per file, 64 keys, 512 bytes per string, 32 string items per array.

## Precedence and wrong-type fallback

Lowest precedence first:

```text
manifest shipped default < shared host source < your file
```

A wrong-typed value at any layer falls back to the next lower layer **for that key only** — garbage in, fail-to-default out, the rest of the file unaffected.

## Worked examples

Bar chassis (scalars and module lists take effect today; per-module option groups stay inert — see above):

```toml
show = true
show_single = false
name_max_chars = 32
modules_left = ["workspaces", "cpu", "memory", "battery"]
modules_right = ["clock", "pulseaudio"]
```

Composer chords (all five keys; invalid chords fall back to defaults):

```toml
newline = "enter"
submit = "ctrl+enter"
close = "escape"
external_editor = "alt+e"
open_chord = "alt+e"
```

Validate without launching a GUI:

```bash
bitty config check
```

## Values versus authority

Your config file carries **values only** — what the plugin should do. **Authority** (which capabilities the plugin may exercise) is granted separately at install time through `bitty plugin install`, after explicit consent, and can be narrowed later with `bitty plugin revoke`. A config value can never grant a capability the host did not approve: setting a backlight `step` without the control grant leaves the module read-only, and unchecking a grant hides the modules that needed it. If a setting seems ignored, check grants first (`bitty plugin list` shows granted versus requested capabilities) — then the [troubleshooting guide](../faq/troubleshooting.md).

## Next steps

- [Bar Modules User Guide](bar-modules.md) — What each module shows and its options.
- [Composer Modal Usage](composer.md) — Open chord, submit chords, and custom settings.
