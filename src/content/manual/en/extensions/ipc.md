# ipc (native extension)

The generic out-of-process IPC bridge: bounded framing, peer-credential auth, and scope-based consent for DevTools and MCP protocols. General infrastructure for DevTools, headless, sandbox, panel extensions, and AI plugins (`bitty-ipc` README).

- Source checkout: `$BITTY_WORKSPACE/bitty-ipc` ([github.com/bitty-terminal/bitty-ipc](https://github.com/bitty-terminal/bitty-ipc))
- Crates: `bitty-ipc-api`, `bitty-ipc-core`, `bitty-ipc-auth`, `bitty-ipc-devtools`, `bitty-ipc-mcp`
- Maturity: extracted from Bitty Core, pre-1.0 (`0.0.1`); not published to crates.io.

## Install status

> Unpublished — verified 2026-10-16 (CDN `extensions/` probes return 404; see the [catalog overview](overview.md)). There is no version to pass to `extension install`.

Track the source checkout above. Once a prebuilt ships, installation follows the standard shape:

```bash
bitty extension list   # confirm what is staged today (empty table, exit 0)
# Later, when published:
# bitty extension install <name> --version X.Y.Z
```

## Lua / host surface

This crate exposes no direct `bitty.*` Lua namespace. It is Core-consumed mechanism: the `bitty-ipc-devtools` crate implements the DevTools method surface (`crates/bitty-ipc-devtools/src/devtools/`, e.g. `captureFrame`, `createWorkspace` in `automation_ops.rs`) and the MCP adapter (`mcp_adapter.rs`), which Core drives on the plugin's behalf behind capability grants. Lua plugins observe only the public Plugin API v1 surface, never this bridge directly.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
