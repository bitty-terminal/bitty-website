---
title: bitty.settings Reference
description: L1 plugin-namespaced settings read with typed key denials and no host write method
category: reference
audience: plugin-author
document_type: reference
status: draft
website_publish: true
sidebar_order: 80
---

# bitty.settings Reference

> Status: **draft**. Normative surface detail lives in the accepted
> [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md);
> executable behavior lives in the `bitty` repository
> (`crates/bitty-lua/src/host.rs`). This page states no behavior beyond what
> those sources pin.

## Purpose and scope

`bitty.settings` is the L1 Control read surface for a plugin's own
namespaced settings. Keys are dot paths relative to
`plugins.<owner>.<name>`; a plugin cannot read outside its own namespace.
This page covers `bitty.settings.get`, the only implemented function in
this namespace. The RFC-declared `bitty.settings.set` has no
`HostServices` method and no bridge entry (verified by grep over
`crates/bitty-lua/src/host.rs`, `bitty@7da6d6f`): the write path is RFC
vocabulary only, not callable behavior.

## Signature

```lua
bitty.settings.get(key) -> value
```

The `settings` table in the bridge (`crates/bitty-lua/src/host.rs`,
`bitty@7da6d6f`) exposes exactly one function, `get`. The call requires a
string key, delegates on the bounded read path to
`HostServices::settings_get`, and returns the value — or nil when the key
is absent.

Host boundary (`HostServices` in `crates/bitty-lua/src/host.rs`):

```rust
fn settings_get(&self, key: &str) -> Result<Option<LuaValue>, BridgeError>;
```

There is no `settings_set` method on the trait and no `"set"` entry on the
bridge `settings` table; only `bitty.store` exposes a `set` entry.

## Params

| Param | Type   | Rule                                                                                                                                                                                                             |
| ----- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key` | string | Dot path relative to the plugin's own `plugins.<owner>.<name>` namespace (RFC vocabulary). A non-string key is refused at the bridge with `E_SETTINGS_KEY_INVALID`. Namespace confinement is enforced host-side. |

## Returns

- `bitty.settings.get` returns the typed setting value when present.
- It returns `nil` when the key is absent (`Ok(None)` at the host
  boundary).

## Errors

Denials arrive as catchable Lua error tables (`class` / `code` / `message`,
per `BridgeError::to_error`); match on `code`.

| `code`                   | `class`      | When                                                                                                                                            |
| ------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_SETTINGS_KEY_INVALID` | `validation` | Non-string key at the bridge (`host.rs`; the message is a static string carrying no key content).                                               |
| `E_TIMEOUT`              | `budget`     | The call exceeded its bridge read deadline (`host.rs`, bounded path; pinned by `host_call_deadline_returns_typed_timeout` in `host_bridge.rs`). |

## Capability

None. The extension-level split of the accepted Lua surface RFC lists
`bitty.settings.get` / `bitty.settings.set` as L1 Control gated by
`none; plugin-owned namespace`. Neither `bitty.settings` nor `bitty.store`
grants filesystem authority.

## Example

Verified against `crates/bitty-lua/tests/host_bridge.rs`
(`store_and_settings_round_trip`, with `retention_days = 7` in the
`FakeServices` settings map):

```lua
local retention = bitty.settings.get("retention_days")
bitty.store.set("flag", retention)
-- retention == 7; the host observes store["flag"] == 7
```

## Limits

- Read-only at the bridge: `bitty.settings.set` is not exposed and has no
  host backend. Setting namespaced values from Lua is follow-up work, not
  callable behavior; do not treat the RFC signature as implemented.
- An absent key returns `nil`; the bridge distinguishes no reason beyond
  `Ok(None)` versus a value.
- Typed schema declaration, merge, and reload semantics are owned by the
  Configuration Model RFC (OQ-010) and are not restated here (RFC).
- Settings access never leaves the plugin's own namespace; cross-plugin or
  core settings reads are outside v1 (RFC).

## References

- [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md)
  (Accepted; `bitty.settings.get` / `bitty.settings.set` spellings,
  plugin-owned namespace, OQ-010 schema ownership)
- [Lua Reference Overview](overview.md) (error contract, capability gating,
  executability rule, L1/L2 split)
- [Lua API Reference](README.md) (route table; `settings.md` row)
- `bitty` `crates/bitty-lua/src/host.rs` (`settings` `get` bridge,
  `HostServices::settings_get`, `E_SETTINGS_KEY_INVALID`; no
  `settings_set` method, no `"set"` bridge entry)
- `bitty` `crates/bitty-lua/tests/host_bridge.rs`
  (`store_and_settings_round_trip`, `host_call_deadline_returns_typed_timeout`)
