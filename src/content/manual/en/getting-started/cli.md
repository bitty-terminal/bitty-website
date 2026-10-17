# CLI Commands & Controls

Bitty provides a unified, pure-parsing command-line toolchain for launching the terminal, inspecting runtime state, managing profiles, configuring plugins, and driving external automations.

Run `bitty --help` for the compact overview, `bitty --help -v` for all flags, or `bitty <command> --help` for per-command detail.

> [!NOTE]
> There is no `bitty help` subcommand: `bitty help` treats `help` as a program to spawn. Use `bitty --help` or `bitty -h`. (Tracked in [bitty#1900](https://github.com/bitty-terminal/bitty/issues/1900).)

## Terminal Invocation (`bitty`)

The primary binary launches the GUI window and spawns shell sessions:

```bash
bitty [OPTIONS] [PROGRAM [ARGS...]]
bitty [OPTIONS] -- PROGRAM [ARGS...]
```

### Core Startup Options

| Flag                   | Description                                                                                    |
| :--------------------- | :--------------------------------------------------------------------------------------------- |
| `--config <PATH>`      | Explicit config file path (overrides `$XDG_CONFIG_HOME/bitty/init.lua` and `BITTY_CONFIG`).    |
| `--profile <NAME>`     | Load named profile from `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua` under user config.        |
| `--theme <NAME>`       | CLI theme override for one launch (wins over config file and active profile).                  |
| `--font-family <NAME>` | CLI font-family override for one launch.                                                       |
| `--font-size <PTS>`    | CLI font-size override in points for one launch (e.g. `12.5`).                                 |
| `--opacity <FLOAT>`    | CLI window-opacity override for one launch (e.g. `0.85`).                                      |
| `--safe`               | **Safe Mode**: Disables all third-party plugins, watchers, and user config; enforces defaults. |
| `--fail-loud`          | Aborts with non-zero exit code if primary shell or startup step fails (debug posture).         |
| `--test-mode`          | Run deterministic headless E2E servo loop connected to `BITTY_SOCKET` IPC until exit.          |
| `-v, --verbose`        | Shorthand for `--log-level debug`; emits per-frame render tick statistics.                     |
| `--log-level <LEVEL>`  | Set stderr logging level (`error`, `warn`, `info`, `debug`, `trace`).                          |
| `--mascot`             | Print the Bittie mascot ASCII art to stdout and exit.                                          |
| `--no-splash`          | Suppress the first-run mascot greeting.                                                        |
| `--no-color`           | Disable ANSI coloring (also honors `NO_COLOR`).                                                |
| `--socket <PATH>`      | Control target socket (with `ctl` / `list instances`).                                         |
| `--instance <ID>`      | Control target instance (with `ctl` / `list instances`).                                       |
| `--`                   | End of flags; remaining tokens are `PROGRAM` argv.                                             |
| `-h, --help`           | Display command-line argument summary and exit.                                                |
| `-V, --version`        | Display version, target architecture, and build metadata.                                      |

### Layout & Window Options

Launch directly into specific pane configurations:

| Flag                     | Description                                                                                    |
| :----------------------- | :--------------------------------------------------------------------------------------------- |
| `--split [AXIS[:RATIO]]` | Split startup pane (`horizontal`/`h`, `vertical`/`v`, default `h`, ratio default `0.5`).       |
| `--split-ratio <FLOAT>`  | Set split ratio between 0.10 and 0.90 (e.g. `0.3`).                                            |
| `--stack`                | Request stack layout mode.                                                                     |
| `--overlay`              | Request overlay presentation mode.                                                             |
| `--layout <SPEC>`        | Raw layout specification (e.g. `"single"`, `"split:h:0.5"`, `"stack"`, `"overlay:5,5,20,10"`). |
| `--focus <TARGET>`       | Initial focus target (`"next"`, `"prev"`, `"up"`, `"down"`, `"left"`, `"right"`, or id).       |

### Headless & Test Options

| Flag          | Description                                                                           |
| :------------ | :------------------------------------------------------------------------------------ |
| `--headless`  | Run a single headless tick smoke test without creating a window and exit.             |
| `--test-mode` | Run deterministic headless E2E servo loop connected to `BITTY_SOCKET` IPC until exit. |

---

## Subcommands

Bitty ships 15 subcommands. Local verbs need no running instance; runtime verbs (`ctl`, `cmd`) target one live instance over IPC (Unix only).

### Explicit Child Launch (`bitty run`)

```bash
# Run a program as a foreground child (local, inherits stdio)
bitty run -- COMMAND [ARGS...]
```

### Runtime Control (`bitty ctl`)

Control a running instance (needs one live instance; Unix IPC only):

```bash
bitty ctl instance list
bitty ctl window list
bitty ctl "view list" | view split [--left|--right|--up|--down] | view focus v:N
bitty ctl terminal list | terminal spawn [--cwd PATH] | terminal close t:N
bitty ctl terminal send t:N TEXT | terminal text t:N
bitty ctl workspace list | workspace new | workspace close ws:N
bitty ctl workspace focus ws:N | workspace move ws:N
bitty ctl workspace rename ws:N NAME | workspace move-panel POSITION
bitty ctl config reload
```

Output shapes: `--format table|json|jsonl`. Targeting precedence: `--socket`, `--instance`, `BITTY_SOCKET`/`BITTY_INSTANCE_ID`, exactly-one-live fallback.

> [!NOTE]
> There is no panel resource in `ctl`: the current panel id is not queryable yet. `view list` reports views (`v:N` plus a `focused` marker). See [bitty#1900](https://github.com/bitty-terminal/bitty/issues/1900).

### Configuration Management (`bitty config`)

Alias: `bitty cfg`

```bash
# Print the resolved configuration file path
bitty config path

# Validate configuration syntax and schema without launching a GUI
bitty config check

# Open current configuration in $VISUAL or $EDITOR
bitty config edit
```

### Setup Wizard (`bitty init`)

An opt-in interactive configuration wizard:

```bash
# Run interactive setup wizard
bitty init

# Write sane default configuration without interactive prompts
bitty init --yes

# Overwrite existing configuration (creates .bak backup)
bitty init --force
```

### Installation Diagnostics (`bitty doctor`)

Diagnose GPU support, fonts, dependencies, and environment health:

```bash
# Display formatted diagnostic table
bitty doctor

# Output diagnostic report as JSON
bitty doctor --format json
```

### Resource Enumeration (`bitty list`)

Alias: `bitty ls`

```bash
# List available built-in and user themes
bitty list themes

# List installed plugins and activation states
bitty list plugins

# List running Bitty instances
bitty list instances
```

### State Inspection (`bitty inspect`)

Explain effective state and ownership without loading any plugin VM:

```bash
bitty inspect command core.terminal.text
bitty inspect key ctrl+shift+m
bitty inspect plugin bitty-terminal.shell-integration
bitty inspect config font.size
bitty inspect protocol kitty-graphics
```

### Developer Tools (`bitty dev`)

Headless tracing, captures, synthesis, dumps, and renderer overlays (local; some verbs need the `dev-tools` cargo feature):

```bash
bitty dev trace <startup|latency> [--iterations N]
bitty dev capture [--layout single|split|stack|overlay]
bitty dev synthesize
bitty dev dump <grid|scene|atlas> [--rows N] [--cols N]
bitty dev overlay <list|show <damage|cells|glyphs|images|layout|banner>>
```

### Plugin Management (`bitty plugin`)

Local plugin record management (no plugin VM is ever loaded):

```bash
# List recorded + installed plugins, sources, and capability grants
bitty plugin list

# Install a bundled plugin id, or a local directory package
bitty plugin install <id> [--yes]
bitty plugin install <path> [--yes]

# Remove a record (bundled: drop entry; installed: delete tree)
bitty plugin remove <id> --force

# Re-enable / disable without dropping the record
bitty plugin enable <id>
bitty plugin disable <id>

# Revoke grants (all, or one capability) without dropping the record
bitty plugin revoke <id> [--cap <capability>]

# Show one plugin's manifest plus recorded grants
bitty plugin info <id>
```

> [!NOTE]
> Remote (`git`) sources and local archives are not accepted yet: `install` takes a bundled id or an unpacked local directory. See [bitty#1901](https://github.com/bitty-terminal/bitty/issues/1901).

Capability installs prompt `Grant these capabilities? [y/N]`; `--yes` approves non-interactively. Grants bind to the exact manifest hash, so added capabilities always need fresh consent.

### Native Extension Management (`bitty extension`)

Manage out-of-process upstream extension binaries (user `$XDG_DATA_HOME/bitty/extensions/` wins over system paths; SHA-256 digest verified). `component` is a hidden deprecated alias for `extension` (same handlers, kept at least through 0.1.0) and never appears in help.

```bash
# List installed extensions and binary digests
bitty extension list

# Stage an extension from a local path only (no download)
bitty extension add /usr/local/bin/bitty-net

# Fetch one hash-verified R2 prebuilt release (explicit consent, TOFU-pinned)
bitty extension install net --version 0.0.23

# Remove a user-tier extension (never touches the system tier)
bitty extension remove net

# Print the exact pinned executable bytes (provenance on stderr)
bitty extension show-source net
```

### Direct Invocation (`bitty cmd`)

```bash
# Invoke any registry executable by qualified id (automation escape hatch)
bitty cmd core.terminal.text --format json -- '{"terminal_id": "t:4"}'
```

### Plugin Namespace (`bitty x`)

```bash
# Address an installed plugin command without alias regeneration
bitty x <publisher>.<name> <command> [args]
bitty x <id> --help
```

### Shell Completions (`bitty completion`)

Alias: `bitty comp`. Supported shells: `bash`, `zsh`, `fish`, `powershell`, `nushell` (`nu`).

```bash
# Generate shell completion script
bitty completion bash > ~/.bash_completion.d/bitty
bitty completion zsh > ~/.zfunc/_bitty
bitty completion fish > ~/.config/fish/completions/bitty.fish
```

### Shell Integration (`bitty shell-init`)

Emit prompt hooks (OSC 7 cwd + OSC 133 marks) plus completion wiring. Same shell list as `completion`.

```bash
bitty shell-init bash
```

### Version (`bitty version`)

```bash
bitty version
bitty version --format json
```
