# execution (native extension)

The execution supervisor: job lifetime, cancellation, process resources, and recovery behind the accepted W-132 contract. Core retains PTY/process authority; this crate owns supervision mechanics (`bitty-execution` README; `src/supervisor.rs`, `src/command_risk.rs`).

- Source checkout: `$BITTY_WORKSPACE/bitty-execution` ([github.com/bitty-terminal/bitty-execution](https://github.com/bitty-terminal/bitty-execution))
- Crate: `bitty-execution` (library, `src/lib.rs`)
- Maturity: landed and independently verified; single `0.0.1` library crate.

## Install status

> Unpublished — verified 2026-10-16 (CDN `extensions/` probes return 404; see the [catalog overview](overview.md)). There is no version to pass to `extension install`.

Track the source checkout above. Once a prebuilt ships, installation follows the standard shape:

```bash
bitty extension list   # confirm what is staged today (empty table, exit 0)
# Later, when published:
# bitty extension install <name> --version X.Y.Z
```

## Lua / host surface

This crate exposes no direct `bitty.*` Lua namespace. It is Core-consumed mechanism: supervision, cancellation, cgroup/OOM handling (`src/cgroup.rs`, `src/oom.rs`), and output retention (`src/output.rs`, `src/retention.rs`) run behind Core's process APIs. Lua plugins never call it directly.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
