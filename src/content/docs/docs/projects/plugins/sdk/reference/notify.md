---
title: bitty.notify Reference
description: L1 notification request surface with platform.notify gate and typed denials
category: reference
audience: plugin-author
document_type: reference
status: draft
website_publish: true
sidebar_order: 60
---

# bitty.notify Reference

> Status: **draft**. Normative surface detail lives in the accepted
> [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md);
> executable behavior lives in the `bitty` repository
> (`crates/bitty-lua/src/host.rs`). This page states no behavior beyond what
> those sources pin.

## Purpose and scope

`bitty.notify` is the L1 Control surface for handing a notification to the
platform for asynchronous display. Lua exposes the request only: the bridge
marshals the payload and forwards it to the host, and rendering, rate policy,
and delivery stay host-side. This page covers `bitty.notify.show`, the only
v1 function in this namespace.

## Signature

```lua
bitty.notify.show(payload) -> boolean
```

The `notify` table in the bridge (`crates/bitty-lua/src/host.rs`,
`bitty@7da6d6f`) exposes exactly one function, `show`. The call marshals
`payload` with `LuaValue::from_lua` under the default `MarshallingLimits`
and forwards it on the pre-commit timeout path
(`notify_show_with_expiry`): an expired deadline fails closed with
`E_TIMEOUT` without enqueueing. The return value is the host acceptance
boolean.

Host boundary (`HostServices` in `crates/bitty-lua/src/host.rs`):

```rust
fn notify_show(&self, payload: &LuaValue) -> Result<bool, BridgeError>;
```

## Params

`payload` is a table with the following fields (RFC vocabulary; the bridge
performs no field-shape check and validates only the marshalling ceilings
below — field rules are enforced host-side):

| `payload` field | Type   | Required | Rule                                                              |
| --------------- | ------ | -------- | ----------------------------------------------------------------- |
| `title`         | string | yes      | Bounded title text, host-rendered, never markup (RFC vocabulary). |
| `body`          | string | no       | Bounded body text (RFC vocabulary).                               |
| `urgency`       | string | no       | `"low"` \| `"normal"` \| `"critical"` (RFC vocabulary).           |

## Returns

The host acceptance boolean (`true` when the platform takes the
notification). Typed denials arrive as catchable error tables instead of
return values; a host that declines without error returns `false` under its
own rate policy.

## Errors

Denials arrive as catchable Lua error tables (`class` / `code` / `message`,
per `BridgeError::to_error`); match on `code`.

| `code`                                                               | `class`      | When                                                                                                                                     |
| -------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `E_VALUE_DEPTH` / `E_VALUE_NODES` / `E_VALUE_BYTES` / `E_VALUE_TYPE` | `validation` | Payload exceeds a bridge marshalling ceiling or carries a non-data type at `LuaValue::from_lua` (`host.rs`).                             |
| `E_CAPABILITY_DENIED`                                                | `runtime`    | The `platform.notify` grant is absent; the host backend fails the call closed before any side effect (`host.rs`, `host_bridge.rs` seam). |
| `E_TIMEOUT`                                                          | `budget`     | The call exceeded its bridge deadline; the pre-commit path never enqueues post-deadline (`host.rs`, `notify_show_with_expiry`).          |

## Capability

`platform.notify`. The extension-level split of the accepted Lua surface RFC
lists `bitty.notify.show` as L1 Control gated by `platform.notify` and
subject to host rate policy. Rate limits, batching, and display routing are
host-side and are not restated here.

## Example

Seam: `crates/bitty-lua/tests/host_bridge.rs`
(`FakeServices::notify_show`, which records the payload when
`platform_notify` is set and denies with `E_CAPABILITY_DENIED` otherwise).
No covering `bitty-lua` test exercises the granted path — the default seam
denies — so the following is illustrative, never verified:

```lua
-- Illustrative: granted-path request shape.
local ok, accepted = pcall(bitty.notify.show, { title = "Build done", urgency = "low" })
if ok and accepted then
  -- the platform took the notification
end
```

## Limits

- The bridge checks no payload fields: `title` / `body` / `urgency` shape
  and the host rate policy are enforced host-side (RFC vocabulary).
- The payload is bounded by the bridge marshalling ceilings (depth 8, 1024
  nodes, 8 KiB serialized) before the host sees it (`host.rs`,
  `MarshallingLimits`).
- An expired bridge deadline fails closed with `E_TIMEOUT` without
  enqueueing; a committed enqueue is never reported as a timeout (`host.rs`,
  pre-commit path).
- Notifications are fire-and-forget requests: v1 defines no handle, no
  query, no update, and no retraction surface.
- Granted-path delivery is pinned only by the `FakeServices` seam, not by a
  passing test; any delivery claim beyond acceptance is follow-up work.

## References

- [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md)
  (Accepted; `bitty.notify.show` spelling, `payload` schema,
  `platform.notify` gate, host rate policy)
- [Lua Reference Overview](overview.md) (error contract, capability gating,
  executability rule, L1/L2 split)
- [Lua API Reference](README.md) (route table; `notify.md` row)
- `bitty` `crates/bitty-lua/src/host.rs` (`notify` `show` bridge,
  `HostServices::notify_show` / `notify_show_with_expiry`, `E_VALUE_*`,
  `E_TIMEOUT`)
- `bitty` `crates/bitty-lua/tests/host_bridge.rs` (`FakeServices`
  notification seam; default denies with `E_CAPABILITY_DENIED`)
