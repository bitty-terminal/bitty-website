---
title: bitty.process Reference
description: Consent-gated process spawn extra outside v1 scope with typed denials
category: reference
audience: plugin-author
document_type: reference
status: draft
website_publish: true
sidebar_order: 140
---

# bitty.process Reference

> Status: **draft**. This namespace is outside Plugin API v1 scope: there
> is no normative RFC signature for it. Executable behavior lives in the
> `bitty` repository (`crates/bitty-lua/src/host.rs`, `bitty@7da6d6f`).
> This page states no behavior beyond what that evidence pins.

## Purpose and scope

`bitty.process` is the consent-gated spawn extra for host-mediated child
execution. It is v1-OUT: the `bitty` route table carries it with no page
("none (outside v1 scope)") ([Lua API Reference](README.md)), and the
parity pin keeps it serving as the consent-gated CTX-0445 extra while
stating it is outside the accepted Plugin API v1 guarantee
(`process_spawn_stays_available_but_outside_v1` in
`crates/bitty-lua/tests/lua_parity.rs`). The default host wires no spawn
surface, so every call fails closed
(`crates/bitty-lua/src/host.rs`, `bitty@7da6d6f`). Do not treat it as v1
behavior.

## Signature

There are no implemented Lua entry points in this namespace under v1, and
there is no accepted RFC spelling to cite. The `HostServices` trait
default fails closed with `E_SPAWN_UNAVAILABLE`
(`crates/bitty-lua/src/host.rs`, `bitty@7da6d6f`) — `process_spawn` at
`host.rs:586` (`"host has no process.spawn surface"`, class `runtime`).
The host boundary takes only an argv array; argument validation and the
spawn result shape are host-side, not bridge vocabulary (`host.rs`
`process_spawn` docs).

## Params

The following describes the expected bounds only, as derived from the Rust
side — not callable v1 behavior. The bridge accepts at most 64 argv
entries (`SPAWN_LUA_MAX_ARGS`, `host.rs:72-74`) of at most 4096 bytes each
(`SPAWN_LUA_MAX_ARG_BYTES`, `host.rs:76-78`)
(`crates/bitty-lua/src/host.rs`, `bitty@7da6d6f`). The spawn bridge
deadline defaults to 5 s (`SPAWN_TIMEOUT_MS`, `host.rs:55-64`) with a 30 s
maximum enforced by killing and reaping the child (`SPAWN_TIMEOUT_MAX_MS`,
`host.rs:66-70; CTX-0445). Lua supplies only the argv array; the caller's
grant decides what is reachable (`host.rs` `process_spawn` docs).

## Returns

The following describes the expected shape only, as derived from the Rust
test seam — not a v1 contract. The seam result observed in
`crates/bitty-lua/tests/host_bridge.rs` (`SpawnServices::process_spawn`)
is a table carrying `output`, `stderr`, `truncated`, `exit_code`, and an
`untrusted` observation-data flag. Shape conformance is host-side; the
bridge delivers whatever the host provides within contract, and a spawn
past contract fails closed with `E_TIMEOUT` and no result delivered
(`crates/bitty-lua/src/host.rs` spawn timeout docs, `bitty@7da6d6f`).

## Errors

Denials arrive as catchable Lua error tables (`class` / `code` / `message`,
per `BridgeError::to_error` in `crates/bitty-lua/src/host.rs`,
`bitty@7da6d6f`); match on `code`.

| `code`                | `class`   | When                                                                                                                                                                                                                                                                           |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `E_SPAWN_UNAVAILABLE` | `runtime` | Every call on the default host: no `process.spawn` surface is wired (`host.rs:586`; pinned by `process_spawn_unavailable_by_default` in `crates/bitty-lua/tests/host_bridge.rs` and `process_spawn_stays_available_but_outside_v1` in `crates/bitty-lua/tests/lua_parity.rs`). |
| `E_CAPABILITY_DENIED` | `runtime` | Expected gate vocabulary at a wired host: the seam denies this way when its gate is set (`SpawnServices` with `deny` in `crates/bitty-lua/tests/host_bridge.rs`, denying `process.spawn:git`).                                                                                 |
| `E_TIMEOUT`           | `budget`  | Expected budget vocabulary: a spawn past contract fails closed with no result delivered, and the host kills and reaps the child (`host.rs` spawn timeout docs; `process_spawn_with_expiry` at `host.rs:601`).                                                                  |

## Capability

`CapabilityFamily::Process` (`crates/bitty-plugin-host/src/capability.rs`,
`Process` variant; closed identifier `process.spawn`). Spawn is a
supervised long-running call whose grant decides reachability
(`crates/bitty-lua/src/host.rs` `process_spawn` docs, `bitty@7da6d6f`).
Grants, families, and lifecycle belong to the capability contract and are
never redefined here ([Lua Reference Overview](overview.md)).

## Example

Denial shape, verified against `crates/bitty-lua/tests/host_bridge.rs`
(`process_spawn_unavailable_by_default`, default seam with no spawn
surface):

```lua
local ok, err = pcall(bitty.process.spawn, { "status", "--porcelain" })
-- ok == false; err.code == "E_SPAWN_UNAVAILABLE"
-- (the default HostServices::process_spawn fails closed; host.rs:586)
```

The bounded-table granted path exists only behind the `SpawnServices`
test seam (`process_spawn_serves_bounded_table`); no passing test exercises
a wired host backend.

## Limits

- Not implemented and outside v1: this namespace has no accepted
  signature, and every statement above about bounds, results, and gates
  describes the expected shape only. All of it is subject to change.
- Spawns carry the untrusted-observation-data label (seam vocabulary in
  `crates/bitty-lua/tests/host_bridge.rs`); automation consumers must
  treat output as untrusted.
- The bridge timeout path never delivers a past-contract result, and the
  host owns killing and reaping the child on timeout (`host.rs`
  `process_spawn_with_expiry` docs).
- Out of scope (no source): allowlist contents, per-tool limits, working
  directory, environment inheritance, streaming, signaling, and any
  normative v1 guarantee.

## References

- [Lua Reference Overview](overview.md) (error contract, capability gating,
  executability rule, L1/L2 split)
- [Lua API Reference](README.md) (route table; `process` row, "none
  (outside v1 scope)")
- `bitty` `crates/bitty-lua/src/host.rs` (`process_spawn` default at
  `host.rs:586`; `process_spawn_with_expiry` at `host.rs:601`;
  `SPAWN_TIMEOUT_MS` at `host.rs:55-64`; `SPAWN_TIMEOUT_MAX_MS` at
  `host.rs:66-70`; `SPAWN_LUA_MAX_ARGS` at `host.rs:72-74`;
  `SPAWN_LUA_MAX_ARG_BYTES` at `host.rs:76-78`)
- `bitty` `crates/bitty-plugin-host/src/capability.rs`
  (`CapabilityFamily::Process`; `process.spawn` closed identifier)
- `bitty` `crates/bitty-lua/tests/host_bridge.rs`
  (`process_spawn_unavailable_by_default`,
  `process_spawn_serves_bounded_table`)
- `bitty` `crates/bitty-lua/tests/lua_parity.rs`
  (`process_spawn_stays_available_but_outside_v1`)
