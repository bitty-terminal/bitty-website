---
title: bitty.events Reference
description: L1 event subscription capture model with closed v1 name set admission caps and typed denials
category: reference
audience: plugin-author
document_type: reference
status: draft
website_publish: true
sidebar_order: 50
---

# bitty.events Reference

> Status: **draft**. Normative surface detail lives in the accepted
> [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md);
> executable behavior lives in the `bitty` repository
> (`crates/bitty-lua/src/host.rs`). This page states no behavior beyond what
> those sources pin.

## Purpose and scope

`bitty.events` is the L1 Control surface for observing plugin lifecycle and
terminal observation events, including interception handlers that veto or
approve host actions. Lua exposes subscription only: the bridge captures each
subscription during `init.lua` activation, and host-side application
(declaration checks, delivery, coalescing, drop policy) is follow-up work.
This page covers `bitty.events.subscribe` and the capture model. There is no
`bitty.events.emit` Lua entry point in v1; emission and delivery are host-side,
not Lua calls.

## Signature

```lua
bitty.events.subscribe(name, handler) -> handle
```

The `events` table in the bridge (`crates/bitty-lua/src/host.rs`,
`bitty@7da6d6f`) exposes exactly one function, `subscribe`. A successful call
pushes an `EventSubscription { kind, handler }` onto the generation-scoped
`RegistrationCapture` in subscription order; the RFC-declared `handle` is
host-side identity and has no Lua-visible form yet.

## Params

| Param     | Type     | Rule                                                                                                                                                                                                                                                                                                                                                                                      |
| --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`    | string   | Must be one of the closed v1 names in Limits below and must be declared for the plugin; subscribing to an undeclared type is a registration error. Bridge admission: `1..=REGISTRATION_MAX_EVENT_KIND_BYTES` (128) bytes, else `E_DEF_INVALID`. A non-string kind is refused with `E_DEF_INVALID`.                                                                                        |
| `handler` | function | `function(event)` where `event = { kind = string, sequence = integer, payload = table }`; payloads are immutable copies, never live core objects. A non-function handler is refused with `E_DEF_INVALID`. Observation and lifecycle handlers: the return value is ignored. Interception handlers: return `false` to veto, anything else to approve; rewriting content is not expressible. |

Identity fields are Lua integers (`terminal_id`, `runtime_id`, `generation`,
`view_id`, `exit_code`); `reason` and `exit_code` come from the accepted
`TerminalClosed` / `TerminalExited` shapes (RFC, LUA-OQ-10).

## Returns

The RFC declares `-> handle`. The current bridge capture returns nil on
success (the call pushes onto `RegistrationCapture.events` and replaces the
stack with unit); stable handle identity is host-side follow-up work. Do not
treat the return value as a usable handle.

## Errors

Denials arrive as catchable Lua error tables (`class` / `code` / `message`,
per `BridgeError::to_error`); match on `code`.

| `code`             | `class`      | When                                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_DEF_INVALID`    | `validation` | Malformed subscription at the bridge: non-string kind, non-function handler, or a kind outside `1..=128` bytes (`host.rs`).                                                                                                                                                                                                                                     |
| `E_DEF_LIMIT`      | `validation` | The 257th subscription: `capture.events.len() >= REGISTRATION_MAX_EVENTS` (256, matching the policy-layer manifest ceiling `MAX_EVENT_TYPES = 256`) (`host.rs`).                                                                                                                                                                                                |
| Registration error | `validation` | Subscription after `init.lua` returns; an undeclared event type; an unknown event name (unknown future names are registration errors, not implicit subscriptions); a duplicate subscription. Undeclared-kind and duplicate rejection additionally stay in the runtime validator, which sees the full capture plus the manifest (`host.rs` bridge comment; RFC). |

## Capability

None. The extension-level split of the accepted Lua surface RFC lists
`bitty.events.subscribe` (lifecycle and observation) as L1 Control gated by
`none; payload access stays bounded`. Coalescing, queue bounds, drop policy,
batching, and failure policy belong to the accepted Plugin Platform RFC event
pipeline and are not restated here.

## Example

Verified against `crates/bitty-lua/tests/host_bridge.rs`
(`registrations_are_captured`):

```lua
bitty.events.subscribe("terminal.opened", function() end)
bitty.events.subscribe("terminal.closed", function() end)
-- host observes capture.events[1].kind == "terminal.opened"
-- and capture.events[2].kind == "terminal.closed"
```

Handler delivery (the host invoking a captured handler with an `event`
envelope) has no covering `bitty-lua` test and remains follow-up work. The
following is illustrative, never verified:

```lua
-- Illustrative: shape of a delivered observation event.
bitty.events.subscribe("terminal.opened", function(event)
  -- event.kind == "terminal.opened"
  -- event.payload == { terminal_id = ..., runtime_id = ..., generation = ... }
end)
```

## Limits

- At most `REGISTRATION_MAX_EVENTS` (256) captured subscriptions per
  `init.lua`; the 257th fails closed with `E_DEF_LIMIT` before any unbounded
  growth (`host.rs`, HOST-002 admission bound).
- Event kinds are `1..=128` bytes (`REGISTRATION_MAX_EVENT_KIND_BYTES`,
  mirroring the manifest `lazy.events` bounds).
- The closed v1 name set is exactly the `EventKind` closed set in
  `bitty-plugin-host/src/event.rs` (`EventKind::parse` / `as_str`
  round-trip); no byte-received, cell-changed, damage, or glyph-rendered
  hot-path names exist in v1:

| Kind                         | Class        | Lua payload                                                                       |
| ---------------------------- | ------------ | --------------------------------------------------------------------------------- |
| `plugin.activated`           | Lifecycle    | `{}` (owning plugin only)                                                         |
| `plugin.suspended`           | Lifecycle    | `{}` (owning plugin only)                                                         |
| `plugin.disposed`            | Lifecycle    | `{}` (owning plugin only)                                                         |
| `handler.violation`          | Lifecycle    | `{}` (owning plugin only; diagnostic detail stays host-side)                      |
| `terminal.opened`            | Observation  | `{ terminal_id, runtime_id, generation }`                                         |
| `terminal.closed`            | Observation  | `{ terminal_id, runtime_id, reason }`                                             |
| `terminal.title-changed`     | Observation  | `{ title = string, terminal_id, runtime_id }`                                     |
| `terminal.cwd-changed`       | Observation  | `{ cwd = string, terminal_id, runtime_id }`                                       |
| `terminal.bell`              | Observation  | `{}` (coalescable; collapses to the latest value)                                 |
| `focus.changed`              | Observation  | `{ view_id, terminal_id? }` (coalescable)                                         |
| `selection.changed`          | Observation  | `{ view_id, terminal_id? }` (coalescable; no selection text in v1)                |
| `process.exited`             | Observation  | `{ terminal_id, runtime_id, exit_code }`                                          |
| `config.reloaded`            | Observation  | `{}`                                                                              |
| `intercept.command-dispatch` | Interception | `{ action, origin, preview }` (bounded sanitized metadata; veto/approve only)     |
| `intercept.terminal-spawn`   | Interception | `{ action, origin, preview }`                                                     |
| `intercept.paste`            | Interception | `{ action, origin, preview }` (never carries paste text without `clipboard.read`) |
| `intercept.open-url`         | Interception | `{ action, origin, preview }`                                                     |

- Subscription calls are valid only while the plugin generation is
  activating; after `init.lua` returns, any later subscription attempt is a
  registration error (RFC, LUA-OQ-12).
- Observation handlers receive a bounded copy and never receive live core
  objects; host-side `ModeChanged` and `Damage` side-queue variants have no
  `EventKind` counterpart and are not expressible in v1 (RFC).
- Unknown future fields in payload tables are ignored, not errors, except on
  payload-less kinds (whose v1 shape declares no fields), which reject any
  key (RFC compatibility policy).

## References

- [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md)
  (Accepted; `bitty.events.subscribe` spelling, closed name set and payload
  shapes, interception veto/approve, LUA-OQ-10, LUA-OQ-12)
- [Lua Reference Overview](overview.md) (error contract, capability gating,
  executability rule, L1/L2 split)
- [Lua API Reference](README.md) (route table; `events.md` row; capture
  versus host-side apply)
- [Plugin Platform RFC](../../specifications/plugin-platform-rfc.md) (event
  pipeline: coalescing, queue bounds, drop policy, batching)
- `bitty` `crates/bitty-lua/src/host.rs` (`events` `subscribe` capture,
  `EventSubscription`, `RegistrationCapture`, `REGISTRATION_MAX_EVENTS`,
  `REGISTRATION_MAX_EVENT_KIND_BYTES`, `E_DEF_INVALID` / `E_DEF_LIMIT`)
- `bitty` `crates/bitty-lua/tests/host_bridge.rs`
  (`registrations_are_captured`)
