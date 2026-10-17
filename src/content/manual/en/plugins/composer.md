# Composer Modal Usage

The Composer (`bitty-terminal.composer`) is a modal command line: it opens an editable buffer over the terminal, submits the buffer to the focused panel as one bracketed paste, and closes. While closed the plugin touches nothing — input bytes flow to the PTY untouched. Manual open only; there is no auto-enter path.

## Opening and closing

Press the open chord (default **Alt+E**) anywhere. The modal paints a titled scene: a title row plus the input line, or an entry hint while the buffer is empty.

Close paths and what they keep:

| Action          | Default chord  | Buffer outcome                                                              |
| :-------------- | :------------- | :-------------------------------------------------------------------------- |
| Submit          | **Ctrl+Enter** | Sent to the PTY; buffer cleared on accept                                   |
| Close           | **Esc**        | Session ends; draft preserved                                               |
| Cancel command  | (palette verb) | Draft discarded                                                             |
| External editor | **Alt+E**      | Round trip on a Core-owned temp file; failed round trips preserve the draft |

An involuntary release (overlay revoked mid-session) keeps the draft and closes the session. A failed submit keeps the buffer and leaves the session open — never a half-sent line.

## Typing and submitting

Type normally, paste freely, or press the in-modal **Alt+E** to edit the buffer in your allowlisted editor (`nvim`, `vim`, `vi`) with a 120 s wait (300 s ceiling, enforced host-side). One rule governs every path — typing, paste, editor content, submit framing: over the 64 KiB cap the input is rejected with the previous buffer intact. Nothing is truncated, nothing is emitted.

Submit chords:

- A remapped **Enter submits** configuration works, including headed terminals: Return arrives as a flat CR literal and the plugin routes CR/LF through the bare Enter role, since key literals can only come from the Enter key itself.
- The default **Ctrl+Enter submits** path works through the host modifier channel on flat overlay key events. If Ctrl+Enter ever stops submitting after a host update, fall back to the explicit `bitty-terminal.composer:submit` palette verb and report it — that verb is the exact path that never depends on chord plumbing.

## Custom chords

All five chords live in your [per-plugin config file](plugin-settings.md) and re-validate on every read. A missing key, a wrong-typed value, or an invalid chord falls back to the shipped default for that key only; the rest of your file still applies.

```toml
# $XDG_CONFIG_HOME/bitty/plugins/bitty-terminal.composer.toml
newline = "enter"
submit = "ctrl+enter"
close = "escape"
external_editor = "alt+e"
open_chord = "alt+e"
```

Rules for remapping:

- In-modal roles (`newline`, `submit`, `close`, `external_editor`) must stay pairwise distinct. Submit is matched first, then close, external editor, newline, text.
- The open chord is exactly `<mod>+...+<single-char>` (any modifier order) and lives on the host keymap — it targets the `open` command while the modal is closed, so it can never shadow shell typing. The in-modal Alt+E role applies only while the modal holds capture, so the two Alt+E defaults never compete.
- Chords the plugin does not declare cannot be read: the host fails undeclared key reads closed, so only the five keys above take effect.

## When the composer stays silent

- Version or capability mismatch disables the plugin with a diagnostic and no partial activation: no commands, no keymap, no overlay. Check `bitty plugin doctor` and the [troubleshooting guide](../faq/troubleshooting.md).
- Without the submit grant the buffer is kept and the session stays open with an `unavailable:no-submit` note — your draft is never lost to a missing grant.

## Next steps

- [Per-Plugin Config Files](plugin-settings.md) — File paths, the TOML subset, and the fail-to-default rules.
- [Troubleshooting & Safe Mode](../faq/troubleshooting.md) — Activation errors and what they mean.
