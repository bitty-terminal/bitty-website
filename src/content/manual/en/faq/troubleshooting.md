# Troubleshooting & Safe Mode

This guide provides troubleshooting procedures, diagnostic commands, and recovery strategies for Bitty.

## Emergency Safe Mode (`--safe`)

If a newly installed plugin, syntax error, or incompatible hardware state prevents Bitty from starting normally, launch in **Safe Mode**:

```bash
bitty --safe
```

### What Happens in Safe Mode

- **Plugins Disabled**: All third-party plugins are completely ignored. No Lua virtual machines are instantiated.
- **Defaults Enforced**: User `init.lua` is bypassed; Bitty starts with compiled-in fallback defaults.
- **Watchers Suspended**: Dynamic file watchers and background reload hooks are temporarily deactivated.

Safe Mode allows you to open a terminal session, locate offending configuration files, or remove broken plugins without GUI crashes.

Safe-mode CLI verbs (`bitty doctor`, `bitty config check`, `bitty plugin list`) run without any plugin VM, so diagnosis works even when a plugin is the problem. The headless parity suite pins this: safe mode is a full startup posture, not a degraded guess.

---

## Plugin Activation Errors (What They Mean)

The host validates every plugin before activation and fails closed — a rejected plugin is disabled with a diagnostic, never partially activated. Match what you see against this table:

| Symptom                                                       | Meaning                                                                                                                                                                                                                                                              | Fix                                                                                                                                            |
| :------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| Install exits `4` with a compat diagnostic                    | The plugin's `[compat] bitty` range admits no intersection with your host (e.g. a plugin floored above your release, or your release above its ceiling). Official plugins floor at `>=0.0.21,<0.1`, admitting the whole 0.0.x line; a rejection means genuine skew.  | Upgrade Bitty, or install a plugin release whose range admits your host. The ceiling is deliberately restrictive because 0.x minors may break. |
| `bitty plugin list` shows the plugin disabled after an update | Version or capability mismatch recorded at load (`disabled_reason`); the plugin registered nothing — no commands, no keymap, no overlay.                                                                                                                             | Same as above; then `bitty plugin enable <id>` to retry after upgrading.                                                                       |
| A bar module is missing but the bar renders                   | Not an error: the provider is absent, ungranted, stale, revoked, or malformed, so the module hid fail closed. Providers send raw numbers only — a lost source degrades to absence, never zeros.                                                                      | Grant the capability (`bitty plugin list` shows granted vs requested), or accept the hide on hosts without that hardware.                      |
| Clicking a bar control shows a notification instead of acting | The control grant is missing or the host denied the call (`E_NOT_PERMITTED`). The click degrades to a notification by design — it never retries or escalates.                                                                                                        | Grant the control capability at install/consent time, or keep the read-only render.                                                            |
| `E_SETTINGS_UNDECLARED` at activation                         | Plugin-author bug: the plugin read a settings key it never declared. Users cannot fix this from a config file.                                                                                                                                                       | Report it against the plugin; run `bitty --safe` to keep working meanwhile.                                                                    |
| Your per-plugin config value seems ignored                    | Either the key is unknown (recorded as skipped, changes nothing), wrong-typed (that key fell back to its default), the whole file failed closed (duplicate key or structural garbage — everything runs on defaults), or the value needs a grant you did not approve. | Run `bitty config check`, compare each key against the plugin's declared settings, and check `bitty plugin list` for granted capabilities.     |

> [!NOTE]
> **PENDING — live-activation proofs.** Per-extension live activation on headed hosts is being proven in the 0.0.23 verification campaign. A plugin that installs cleanly headless but misbehaves headed is a verify-grade report: include `bitty doctor --format json` output and the plugin id and version.

---

## Compatibility Floors

Two floors gate what runs where, and both fail closed with a diagnostic rather than a crash:

- **Plugin-to-host floor**: each manifest declares `[compat] bitty` (official plugins: `>=0.0.21,<0.1`) and `plugin-api = "^1.0"`. The host resolves the intersection at install time; no overlap means no activation, exit code `4`.
- **Package-to-distro floor**: native Linux packages declare their runtime dependencies per format (fontconfig, freetype, libgcc family) and every package is install-smoked in a clean container of its distro before release. An unrelated distro is best-effort, not supported — use the install script or build from source there.

---

## Validating Configuration Offline

Before reloading your terminal, test your Lua configuration file without launching a GUI:

```bash
bitty config check
```

- Returns exit code `0` if all syntax and schema fields are valid.
- Prints specific line numbers, column offsets, and error descriptions if parsing or validation fails.

---

## Plugin Diagnostics (`bitty plugin list` + `bitty doctor`)

When a plugin behaves unexpectedly, inspect its record and the host environment:

```bash
# Recorded plugins, sources, states, and capability grants
bitty plugin list

# One plugin's manifest plus recorded grants
bitty plugin info <id>

# Host environment health (GPU, fonts, dependencies)
bitty doctor
```

> [!NOTE]
> There is no `bitty plugin doctor` verb. Live per-VM memory, fuel, and queue-drop introspection is not exposed on the CLI.

---

## Extension & Tool-Spawn Failures

Failures in this area are fail-closed by design: nothing half-installed is left behind, and nothing untrusted is executed or printed.

- **Pin-mismatch on `bitty extension install` (exit code `4`)**: the fetched release digest differs from the recorded TOFU pin. The pin never auto-updates. Verify the release out-of-band, then re-pin explicitly with `--force`.
- **`show-source` prints nothing (exit code `4`)**: the install is missing or the executable no longer matches its pinned descriptor hash. Re-install the extension; Bitty refuses to print untrusted bytes.
- **Tool spawn refused under confinement**: on Linux, admitted tool spawns run under Landlock execute confinement; a refusal naming confinement means setup failed (e.g. pre-5.13 kernel or a container policy forbidding unprivileged restriction) and the spawn was refused rather than run unconfined. On macOS and Windows, admitted tool spawns are refused fail-closed with a confinement diagnostic until platform mechanisms land.
- **Capability denied after update**: grants bind to the exact manifest hash. Re-run `bitty plugin install` and approve the fresh consent prompt; use `bitty plugin revoke <id> --cap <capability>` to drop a single grant without removing the plugin.

---

## Log Files & Verbosity

Bitty writes structured diagnostics to disk according to platform standards:

- **Linux / BSD**: `$XDG_STATE_HOME/bitty/bitty.log` (defaults to `~/.local/state/bitty/bitty.log`)
- **macOS**: `~/Library/Logs/bitty/bitty.log`

### Increasing Log Verbosity

Set the `RUST_LOG` environment variable when running from an existing shell:

```bash
RUST_LOG=bitty=debug,bitty_runtime=trace bitty
```

---

## GPU & Rendering Fallbacks

Bitty utilizes `wgpu` to select the fastest available native graphics backend (Vulkan on Linux, Metal on macOS).

If your environment lacks hardware GPU acceleration (e.g. inside a virtual machine or software-rendered container):

```bash
# Force OpenGL backend fallback
WGPU_BACKEND=gl bitty

# Force low-power GPU adapter selection
WGPU_POWER_PREF=low bitty
```
