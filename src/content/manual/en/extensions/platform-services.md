# platform-services (native extension)

The platform notification bridge: Linux D-Bus, macOS notification center, and Windows Toast delivery behind one fail-closed interface. It does not parse terminal output — Core parses OSC 777 and Kitty notification sequences and enforces the rate budget before handing over an already-limited `{title, body}` (`bitty-platform-services` README).

- Source checkout: `$BITTY_WORKSPACE/bitty-platform-services` ([github.com/bitty-terminal/bitty-platform-services](https://github.com/bitty-terminal/bitty-platform-services))
- Layout: multi-crate workspace (`crates/`)
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

This crate exposes no direct `bitty.*` Lua namespace. It is the delivery mechanism behind the `platform.notify` capability and the `bitty.notify.show` call Lua plugins use (see [activity](activity.md) and [wheel](wheel.md)). Plugins request `platform.notify` and call `bitty.notify.show`; Core rate-limits and this crate delivers.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
