# agent (native extension)

The host-neutral AI agent protocol vocabulary: bounded messages, tool-call stubs, read-only observations, and bounded coordination queues. No LLM I/O, no network, no window/GPU coupling (`bitty-agent` README).

- Source checkout: `$BITTY_WORKSPACE/bitty-agent` ([github.com/bitty-terminal/bitty-agent](https://github.com/bitty-terminal/bitty-agent))
- Crates: `bitty-agent-api`, `bitty-agent`
- Maturity: accepted contract, implementation not yet verified — do not treat its behavior as shipped.

## Install status

> Unpublished — verified 2026-10-16 (CDN `extensions/` probes return 404; see the [catalog overview](overview.md)). There is no version to pass to `extension install`.

Track the source checkout above. Once a prebuilt ships, installation follows the standard shape:

```bash
bitty extension list   # confirm what is staged today (empty table, exit 0)
# Later, when published:
# bitty extension install <name> --version X.Y.Z
```

## Lua / host surface

This crate exposes no direct `bitty.*` Lua namespace. It defines the protocol types (the `bitty.agent-1` protocol marker) that Core and AI plugins use to exchange bounded agent messages. Lua plugins such as `wheel` consume the agent flow through Core-mediated APIs, never this crate directly.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
