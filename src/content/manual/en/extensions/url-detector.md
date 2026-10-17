# url-detector (native extension)

A pure-algorithm plaintext URL detector over `&str`: a hand-rolled scanner with no I/O, backing link detection without pulling a regex engine or network code into Core (`bitty-url-detector` README).

- Source checkout: `$BITTY_WORKSPACE/bitty-url-detector` ([github.com/bitty-terminal/bitty-url-detector](https://github.com/bitty-terminal/bitty-url-detector))
- Layout: multi-crate workspace (`crates/`), plus `benches/` and `fuzz/` targets
- Maturity: active extension library for bitty#1760.

## Install status

> Unpublished — verified 2026-10-16 (CDN `extensions/` probes return 404; see the [catalog overview](overview.md)). There is no version to pass to `extension install`.

Track the source checkout above. Once a prebuilt ships, installation follows the standard shape:

```bash
bitty extension list   # confirm what is staged today (empty table, exit 0)
# Later, when published:
# bitty extension install <name> --version X.Y.Z
```

## Lua / host surface

This crate exposes no direct `bitty.*` Lua namespace. It is Core-consumed mechanism: the scanner runs inside Core's link-detection path and plugins consume the detected links through the public selection/terminal APIs. Lua plugins never call it directly.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
