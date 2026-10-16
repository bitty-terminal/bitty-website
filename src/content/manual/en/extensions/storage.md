# storage (native extension)

Bounded isolated storage mechanics: the KV ceilings and filesystem-backed store that Core's persistence APIs are ported from (`bitty-storage` README; `src/kv.rs`, `src/ceiling.rs`).

- Source checkout: `$BITTY_WORKSPACE/bitty-storage` ([github.com/bitty-terminal/bitty-storage](https://github.com/bitty-terminal/bitty-storage))
- Crate: `bitty-storage` (library, `src/lib.rs`)
- Maturity: active extension library; pending independent verification.

## Install status

> Unpublished — verified 2026-10-16 (CDN `extensions/` probes return 404; see the [catalog overview](overview.md)). There is no version to pass to `extension install`.

Track the source checkout above. Once a prebuilt ships, installation follows the standard shape:

```bash
bitty extension list   # confirm what is staged today (empty table, exit 0)
# Later, when published:
# bitty extension install <name> --version X.Y.Z
```

## Lua / host surface

This crate exposes no Lua namespace of its own, but it documents the backend Lua plugins already use: KV ceilings "mirror the `bitty.store` filesystem backend" (`src/ceiling.rs:4`), and `src/kv.rs:3` is ported from the Core `bitty.store` backend (bounded key grammar). The [activity](activity.md) plugin persists its aggregates through `bitty.store`. Plugin authors use Core's `bitty.store` / history-KV APIs; this crate is the mechanics behind them.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
