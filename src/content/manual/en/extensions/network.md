# network (native extension)

The shared, optional network runtime: connection pooling, DNS, TLS, and the wire framing that Lua plugins share instead of each vendoring their own stack. Core links no network code; this crate is the single place network mechanism lives (`bitty-network` README).

- Source checkout: `$BITTY_WORKSPACE/bitty-network` ([github.com/bitty-terminal/bitty-network](https://github.com/bitty-terminal/bitty-network))
- Crates: `bitty-network-api`, `bitty-network-core`, `bitty-network-dns`, `bitty-network-tls`, `bitty-network-wire`, `bitty-network-lua`, `bitty-net`
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

`bitty-network-lua` registers a `bitty.network` table in the plugin VM (`crates/bitty-network-lua/src/lib.rs:159`, `register_network_module`):

- `bitty.network.echo` — round-trip probe used by the crate's own tests (`src/callback.rs:16`)
- `bitty.network.info` — runtime metadata query (`src/callback.rs:48`)

Callers need the corresponding network capability grant; without it the host denies the call fail-closed.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
