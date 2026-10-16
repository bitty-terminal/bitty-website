# observability (native extension)

The read-only observation seam for the terminal runtime and plugin ecosystem: the debug and trace implementation side of observability. It holds no authority (`bitty-observability` README).

- Source checkout: `$BITTY_WORKSPACE/bitty-observability` ([github.com/bitty-terminal/bitty-observability](https://github.com/bitty-terminal/bitty-observability))
- Crates: `bitty-observability-api`, `bitty-observability-core`, `bitty-observability`
- Maturity: active L1 Rust Core Extension library; no packed component binary yet.

## Install status

> Unpublished — verified 2026-10-16 (CDN `extensions/` probes return 404; see the [catalog overview](overview.md)). There is no version to pass to `extension install`.

Track the source checkout above. Once a prebuilt ships, installation follows the standard shape:

```bash
bitty extension list   # confirm what is staged today (empty table, exit 0)
# Later, when published:
# bitty extension install <name> --version X.Y.Z
```

## Lua / host surface

This crate exposes no direct `bitty.*` Lua namespace. It backs the read-only inspection APIs Core offers to granted plugins — the `bitty.debug.inspect` / `bitty.debug.trace` / `bitty.debug.trace_get` calls consumed by the [devtools](devtools.md) plugin (`debug/describe` redaction and capture classification live in `crates/bitty-observability-core/src/`). A plugin observes only what Core permits; this crate never grants authority.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
