---
title: bitty.tasks and bitty.timers Reference
description: Host-owned task and one-shot timer capture model with RC-4 caps and typed denials
category: reference
audience: plugin-author
document_type: reference
status: draft
website_publish: true
sidebar_order: 100
---

# bitty.tasks and bitty.timers Reference

> Status: **draft**. Normative surface detail lives in the accepted
> [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md);
> executable behavior lives in the `bitty` repository
> (`crates/bitty-lua/src/host.rs`). This page states no behavior beyond what
> those sources pin.

## Purpose and scope

`bitty.tasks` and `bitty.timers` are the async-boundary surfaces for
host-owned tasks and one-shot timers (ADR 0007, LUA-OQ-9, CTX-0707). The
bridge captures each entry function, owns the small generation-owned
integer handle, and releases the cap slot on cancel; scheduling,
cooperative cancellation, resumption through the event path, and queue
budgets stay host-side. This page covers `bitty.tasks.spawn` /
`bitty.tasks.cancel` and `bitty.timers.create` / `bitty.timers.cancel`,
all four v1 functions WIRED as bridge captures mirroring each other.

## Signature

```lua
bitty.tasks.spawn(fn) -> task_id
bitty.tasks.cancel(task_id) -> boolean
bitty.timers.create(delay_ms, callback) -> timer_id
bitty.timers.cancel(timer_id) -> boolean
```

The `tasks` table in the bridge (`crates/bitty-lua/src/host.rs`,
`bitty@7da6d6f`) exposes exactly `spawn` / `cancel`; the `timers` table
exposes exactly `create` / `cancel`. A successful `spawn` stashes the
entry function and pushes a `TaskRegistration { handle, entry }` onto the
generation-scoped `RegistrationCapture`; a successful `create` stashes the
callback and pushes a `TimerRegistration { handle, delay_ms, callback }`.
Handles are dense integers from 1 allocated with checked arithmetic
(`alloc_task_handle` / `alloc_timer_handle`): `i64::MAX` is the reserved
exhaustion sentinel and is never issued.

## Params

| Param      | Type     | Rule                                                                                                                                                                                                                                                                                                           |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fn`       | function | Task entry function, stashed generation-scoped. A non-function (including a missing argument) is refused with `E_DEF_INVALID` (`host.rs`).                                                                                                                                                                     |
| `task_id`  | integer  | Handle from `bitty.tasks.spawn`. A non-integer is refused with `E_DEF_INVALID` (`host.rs`).                                                                                                                                                                                                                    |
| `delay_ms` | number   | Non-negative finite delay in milliseconds (integer or float, truncated toward zero). A negative, non-finite, or non-number delay is refused with `E_DEF_INVALID`; a delay above `REGISTRATION_MAX_TIMER_DELAY_MS` (86_400_000, one day) is refused with `E_DEF_INVALID` (`host.rs`, HOST-002 admission bound). |
| `callback` | function | Timer callback, stashed generation-scoped. A non-function is refused with `E_DEF_INVALID` (`host.rs`).                                                                                                                                                                                                         |
| `timer_id` | integer  | Handle from `bitty.timers.create`. A non-integer is refused with `E_DEF_INVALID` (`host.rs`).                                                                                                                                                                                                                  |

## Returns

- `bitty.tasks.spawn` returns the integer `task_id`; `bitty.timers.create`
  returns the integer `timer_id`. Exhausted handle space (the checked
  allocator reaches `i64::MAX`) fails the call closed instead of wrapping
  and aliasing a live handle: `E_BUDGET_TASK` for tasks, `E_DEF_LIMIT`
  for timers (`host.rs`).
- `bitty.tasks.cancel` / `bitty.timers.cancel` return a boolean: `true`
  when the handle existed and its cap slot was released, `false` for an
  unknown or already-cancelled handle (`host.rs`, `cancel_task` /
  `cancel_timer`).

## Errors

Denials arrive as catchable Lua error tables (`class` / `code` / `message`,
per `BridgeError::to_error`); match on `code`. Note the deliberate
asymmetry: task over-cap is a `budget` denial, timer over-cap is a
`validation` denial (`host.rs`).

| `code`          | `class`      | When                                                                                                                                                                                                                  |
| --------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_DEF_INVALID` | `validation` | Malformed call at the bridge: non-function entry/callback, non-integer cancel handle, non-number/negative/non-finite delay, or a delay above 86_400_000 ms (`host.rs`).                                               |
| `E_BUDGET_TASK` | `budget`     | The 65th live task: `capture.tasks.len() >= REGISTRATION_MAX_TASKS` (64, the accepted RC-4 cap per ADR 0007, LUA-OQ-9), or task handle-space exhaustion (`host.rs`). Cancel releases the slot.                        |
| `E_DEF_LIMIT`   | `validation` | The 65th captured timer: `capture.timers.len() >= REGISTRATION_MAX_TIMERS` (64, HOST-002 admission bound mirroring the queue-side precedent), or timer handle-space exhaustion (`host.rs`). Cancel releases the slot. |

## Capability

None stated. Handles are generation-owned (`(PluginId, generation)`,
disposed with it); timer fire and task resumption deliver through the
accepted event path, so the three-level queue budgets still apply (RFC,
LUA-OQ-9).

## Example

Verified against `crates/bitty-lua/tests/lua_parity.rs`
(`tasks_spawn_cancel_round_trip`; cancel releases the slot and the kept
entry stays callable):

```lua
local h1 = bitty.tasks.spawn(function() return true end)
local h2 = bitty.tasks.spawn(function() return false end)
local cancelled = bitty.tasks.cancel(h1) -- true
local again = bitty.tasks.cancel(h1) -- false
-- host observes one captured task (handle h2) whose entry is callable
```

Verified against `crates/bitty-lua/tests/host_bridge.rs`
(`timer_count_delay_and_handle_exhaustion_capped_at_bridge`; dense
1-based handles, 65th create refused with `E_DEF_LIMIT`, over-day delay
refused with `E_DEF_INVALID`):

```lua
local id = bitty.timers.create(10, function() end)
-- host observes capture.timers with handle == id and delay_ms == 10
```

`bitty.timers.cancel` has no covering Lua test: its bridge path
(`cancel_timer` slot release returning a boolean) is pinned only by
`host.rs`. Any timer-cancel example is illustrative, never verified.
Over-cap and handle-exhaustion behavior for both families is pinned by
`tasks_spawn_enforces_64_cap_with_budget_code`,
`task_handle_allocation_is_checked_not_wrapping`,
`timer_count_delay_and_handle_exhaustion_capped_at_bridge`, and
`timer_handle_allocation_is_checked_not_wrapping`.

## Limits

- At most `REGISTRATION_MAX_TASKS` (64) live tasks per generation; the
  65th spawn fails closed with `E_BUDGET_TASK` and never queues silently
  (`host.rs`, accepted RC-4 cap per ADR 0007, LUA-OQ-9).
- At most `REGISTRATION_MAX_TIMERS` (64) captured timers per generation;
  the 65th create fails closed with `E_DEF_LIMIT` (`host.rs`, HOST-002
  admission bound). The RFC records the RC-4 live-timer cap (32 per
  plugin, ADR 0007) enforced host-side; the bridge capture bound above is
  the enforcement the bridge itself performs.
- Timer delay is at most `REGISTRATION_MAX_TIMER_DELAY_MS` (86_400_000 ms,
  one day); larger delays fail closed with `E_DEF_INVALID` (`host.rs`).
- Cancellation releases the cap slot so a later spawn/create can proceed
  (`tasks_spawn_enforces_64_cap_with_budget_code`). Task cancellation is
  cooperative at the next host slice with no Lua-visible abort hook in v1
  (RFC).
- All handles from generation N are invalid after disposal and fail
  closed; handle allocation never wraps (`i64::MAX` reserved sentinel).
- Timers are one-shot in v1; repeating timers are a `1.x` minor addition
  (RFC, LUA-OQ-9).
- Timer fire and task resumption deliver through the accepted event path,
  so the three-level queue budgets still apply (RFC).

## References

- [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md)
  (Accepted; task/timer spellings, RC-4 caps, one-shot timers,
  cooperative cancellation, event-path delivery, LUA-OQ-9)
- [Lua Reference Overview](overview.md) (error contract, capability gating,
  executability rule, L1/L2 split)
- [Lua API Reference](README.md) (route table; `tasks-timers.md` row)
- `bitty` `crates/bitty-lua/src/host.rs` (`tasks` `spawn` / `cancel` and
  `timers` `create` / `cancel` captures, `TaskRegistration` /
  `TimerRegistration`, `RegistrationCapture::alloc_*_handle` /
  `cancel_*`, `REGISTRATION_MAX_TASKS`, `REGISTRATION_MAX_TIMERS`,
  `REGISTRATION_MAX_TIMER_DELAY_MS`, `E_BUDGET_TASK` / `E_DEF_LIMIT` /
  `E_DEF_INVALID`)
- `bitty` `crates/bitty-lua/tests/lua_parity.rs`
  (`tasks_spawn_cancel_round_trip`, `tasks_spawn_rejects_malformed`,
  `tasks_spawn_enforces_64_cap_with_budget_code`,
  `task_handle_allocation_is_checked_not_wrapping`)
- `bitty` `crates/bitty-lua/tests/host_bridge.rs`
  (`timer_count_delay_and_handle_exhaustion_capped_at_bridge`,
  `timer_handle_allocation_is_checked_not_wrapping`)
