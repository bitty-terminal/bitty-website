---
title: bitty.store Reference
description: L1 plugin-scoped persistent key-value store with RC-11 quota ceilings and typed denials
category: reference
audience: plugin-author
document_type: reference
status: draft
website_publish: true
sidebar_order: 30
---

# bitty.store Reference

> Status: **draft**. Normative surface detail lives in the accepted
> [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md);
> executable behavior lives in the `bitty` repository
> (`crates/bitty-lua/src/host.rs`, `crates/bitty-lua/src/store.rs`).
> This page states no behavior beyond what those sources pin.

## Purpose and scope

`bitty.store` is the L1 Control persistent key-value area scoped by plugin ID,
not by generation. Values written by generation N are committed synchronously
before N is disposed, so N+1 reads the same values; data is deleted only by
uninstall, an explicit `nil` write, or a user purge. This page covers
`bitty.store.get` / `bitty.store.set` and the RC-11 quota ceilings. Settings
(`bitty.settings`) are a separate namespace and are not covered here.

## Signature

```lua
bitty.store.get(key) -> value | nil
bitty.store.set(key, value) -> boolean
```

Host boundary (`HostServices` in `crates/bitty-lua/src/host.rs`,
`bitty@7da6d6f`):

```rust
fn store_get(&self, key: &str) -> Result<Option<LuaValue>, BridgeError>;
fn store_set(&self, key: &str, value: LuaValue) -> Result<(), BridgeError>;
```

Mutating calls travel the pre-commit timeout path
(`store_set_with_expiry`): an expired deadline fails closed with `E_TIMEOUT`
without committing.

## Params

| Param   | Type       | Rule                                                                                                                                                                                                                                                                                                                                          |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`   | string     | Key grammar `^[a-z0-9][a-z0-9._-]{0,127}$`, at most 128 UTF-8 bytes, no empty dot segments (RFC vocabulary). A non-string key is refused at the bridge with `E_STORE_KEY_INVALID`.                                                                                                                                                            |
| `value` | plain data | JSON-compatible plain data only: boolean, finite number, UTF-8 string, array, object. Depth at most 8, at most 1024 nodes, serialized value at most 8 KiB. Functions, metatables, cycles, and non-finite numbers are rejected with `E_STORE_VALUE_INVALID` (`validation` class, RFC vocabulary). `bitty.store.set(key, nil)` deletes the key. |

## Returns

- `bitty.store.get` returns the persisted value, or `nil` when the key is
  absent (`Ok(None)` at the host boundary).
- `bitty.store.set` returns `true` on success; the bridge surfaces host
  denials as catchable error tables instead of return values.

## Errors

Every host denial arrives as a catchable Lua error table with exactly three
fields, per `BridgeError::to_error` in `crates/bitty-lua/src/host.rs`:
`class`, `code`, `message`. Match on `code`, never on message text.

| `code`                                                               | `class`      | When                                                                                                                                                    |
| -------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_STORE_KEY_INVALID`                                                | `validation` | Non-string key at the bridge (`host.rs`).                                                                                                               |
| `E_STORE_VALUE_INVALID`                                              | `validation` | Non-data value: function, metatable, cycle, non-finite number (RFC vocabulary).                                                                         |
| `E_VALUE_DEPTH` / `E_VALUE_NODES` / `E_VALUE_BYTES` / `E_VALUE_TYPE` | `validation` | Bridge marshalling ceiling exceeded or non-data type at `LuaValue::from_lua` (`host.rs`).                                                               |
| `E_STORE_QUOTA`                                                      | `budget`     | An RC-11 ceiling would be exceeded; the previous persisted state is left intact with no partial write and no eviction (`store.rs`, `STORE_QUOTA_CODE`). |
| `E_TIMEOUT`                                                          | `budget`     | The call exceeded its bridge deadline; mutating calls never commit post-deadline (`host.rs`).                                                           |

Quota-denial messages carry sizes only, never untrusted key or value content
(`store.rs`, `store_quota_error`).

## Capability

None. The extension-level split of the accepted Lua surface RFC lists
`bitty.store.get` / `bitty.store.set` as L1 Control gated by
`none; quota-bounded`. Neither `bitty.store` nor `bitty.settings` grants
filesystem authority.

## Example

Verified against `crates/bitty-lua/tests/host_bridge.rs`
(`store_and_settings_round_trip`):

```lua
bitty.store.set("k", { a = 1, b = "two" })
local value = bitty.store.get("k")
bitty.store.set("flag", bitty.settings.get("retention_days"))
-- value.a == 1; the host observes store["flag"] == 7
```

Quota-boundary behavior below is pinned at the Rust level by
`crates/bitty-lua/tests/store_quota.rs`, not by a Lua snippet; there is no
verified Lua quota-denial example. The following is illustrative, never
verified:

```lua
-- Illustrative: over-quota writes fail closed; match on err.code.
local ok, err = pcall(bitty.store.set, "big", huge_string)
if not ok and err.code == "E_STORE_QUOTA" then
  bitty.store.set("big", nil) -- free quota explicitly; nothing is evicted
end
```

## Limits

RC-11 ceilings from `crates/bitty-lua/src/store.rs`
(`STORE_MAX_TOTAL_BYTES`, `STORE_MAX_VALUE_BYTES`, `STORE_MAX_DEPTH`,
`STORE_MAX_NODES`, `STORE_QUOTA_CODE`):

| Dimension                                                                                                                                  | Bound   | Covering `store_quota.rs` tests                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Persisted bytes total per plugin                                                                                                           | 256 KiB | `total_exactly_256kib_accepted`, `total_one_entry_over_denied_without_eviction`, `overwrite_denied_leaves_previous_value_intact` |
| Bytes per value (string payload; the top-level key counts toward the total, never toward this ceiling)                                     | 8 KiB   | `per_value_exactly_8kib_accepted`, `per_value_one_byte_over_denied_without_state_change`                                         |
| Depth per value (scalars and empty tables are 0; 8 nested tables accepted, 9 refused)                                                      | 8       | `depth_exactly_8_accepted_9_denied`                                                                                              |
| Nodes persisted total, keys included (single-value trees carry an odd node count, so the even 1024 total is reachable only across entries) | 1024    | `nodes_total_exactly_1024_accepted`, `nodes_one_entry_over_denied_without_state_change`                                          |

Further limits:

- Every denial is atomic: a refused write leaves the previous entry untouched
  (`overwrite_denied_leaves_previous_value_intact`,
  `per_value_one_byte_over_denied_without_state_change`).
- Setting a key to `nil` deletes it, always succeeds, and frees quota
  (`nil_set_deletes_and_frees_quota`); `remove` returns the previous value
  (`remove_returns_previous_value`). An empty store reports zero bytes, zero
  nodes, and `None` for missing keys (`empty_store_and_missing_key`).
- The bridge marshals `store.set` arguments under the default
  `MarshallingLimits` (depth 8, 1024 nodes, 8 KiB) before the store backend
  re-validates defence-in-depth and additionally owns the 256 KiB persisted
  total the bridge cannot see (`store.rs` accounting section).
- Entry size is `key.len()` plus value string-payload bytes; scalars other
  than strings contribute zero, and structural bulk is bounded by the node
  ceiling instead (`store.rs`, `value_bytes`).
- There is no expiry, no LRU, and no other eviction path by construction; the
  module performs no I/O, and durability reduces to the host keeping the
  owning `PluginStore` alive across generations (`store.rs`).

## References

- [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md)
  (Accepted; `bitty.store.get` / `bitty.store.set` spellings, key grammar,
  value bounds, `E_STORE_VALUE_INVALID`, `E_STORE_QUOTA`, RC-11)
- [Lua Reference Overview](overview.md) (error contract, capability gating,
  executability rule, L1/L2 split)
- [Lua API Reference](README.md) (route table; `store.md` row)
- `bitty` `crates/bitty-lua/src/host.rs` (`HostServices::store_get` /
  `store_set` / `store_set_with_expiry`, `E_STORE_KEY_INVALID`,
  `E_VALUE_*`, `BridgeError::to_error`, `MarshallingLimits`)
- `bitty` `crates/bitty-lua/src/store.rs` (RC-11 constants, accounting,
  atomicity, no-eviction construction)
- `bitty` `crates/bitty-lua/tests/host_bridge.rs`
  (`store_and_settings_round_trip`)
- `bitty` `crates/bitty-lua/tests/store_quota.rs` (RC-11 exact-boundary and
  denial-atomicity coverage)
