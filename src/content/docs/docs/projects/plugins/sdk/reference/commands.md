---
title: bitty.commands Reference
description: L1 command registration capture model with definition schema admission caps and typed denials
category: reference
audience: plugin-author
document_type: reference
status: draft
website_publish: true
sidebar_order: 40
---

# bitty.commands Reference

> Status: **draft**. Normative surface detail lives in the accepted
> [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md);
> executable behavior lives in the `bitty` repository
> (`crates/bitty-lua/src/host.rs`). This page states no behavior beyond what
> those sources pin.

## Purpose and scope

`bitty.commands` is the L1 Control surface for declaring plugin commands that
the host registry (CLI, palette, IPC, Agent) can dispatch. Lua exposes
registration only: the bridge captures each definition during `init.lua`
activation, and host-side application (validation against the manifest,
duplicate-name rejection, dispatch of `run`) is follow-up work. This page
covers `bitty.commands.register` and the capture model. There is no
`bitty.commands.invoke` Lua entry point in v1; invocation is host dispatch of
a captured `run` callback, not a Lua call.

## Signature

```lua
bitty.commands.register(def) -> handle
```

The `commands` table in the bridge (`crates/bitty-lua/src/host.rs`,
`bitty@7da6d6f`) exposes exactly one function, `register`. A successful call
pushes a `CommandRegistration { id, title, description, run }` onto the
generation-scoped `RegistrationCapture` in registration order; the RFC-declared
`handle` is host-side identity and has no Lua-visible form yet.

## Params

`def` is a table with the following fields (RFC vocabulary; the bridge
enforces the `id` / `title` / `description` / `run` shape below):

| `def` field     | Type     | Required | Rule                                                                                                                                                                                                                                                                                                                                  |
| --------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | string   | yes      | Plugin-local command segment, `^[a-z][a-z0-9-]{0,63}$`; the host qualifies it to `<plugin-id>:<id>`. Bridge admission: at most `REGISTRATION_MAX_ID_BYTES` (128) bytes, else `E_DEF_INVALID`.                                                                                                                                         |
| `title`         | string   | yes      | Bounded display text, host-rendered, never markup. Bridge admission: at most `REGISTRATION_MAX_TITLE_BYTES` (128) bytes, else `E_DEF_INVALID`.                                                                                                                                                                                        |
| `description`   | string   | no       | Bounded display text, defaults to empty. Bridge admission: at most `REGISTRATION_MAX_DESCRIPTION_BYTES` (1024) bytes, else `E_DEF_INVALID`.                                                                                                                                                                                           |
| `args_schema`   | table    | no       | Bounded JSON Schema (CLI Contract RFC model): depth at most 16, flag `additionalProperties` explicit, total size at most `CMD_SCHEMA_MAX_BYTES` (default 16 KiB per schema). RFC vocabulary; enforced host-side, not at the bridge.                                                                                                   |
| `result_schema` | table    | no       | Bounded JSON Schema with the same limits, declaring the result shape for CLI, palette, IPC, and Agent reuse. RFC vocabulary; enforced host-side, not at the bridge.                                                                                                                                                                   |
| `run`           | function | yes      | `function(args) -> result`; `args` is a validated plain table and `result` is validated before it is returned. The bridge stashes the function; the host validates arguments before dispatch and results before returning them. A non-function `run`, a non-table `def`, or a missing `id` / `title` is refused with `E_DEF_INVALID`. |

## Returns

The RFC declares `-> handle`. The current bridge capture returns nil on
success (the call pushes onto `RegistrationCapture.commands` and replaces the
stack with unit); stable handle identity is host-side follow-up work. Do not
treat the return value as a usable handle.

## Errors

Denials arrive as catchable Lua error tables (`class` / `code` / `message`,
per `BridgeError::to_error`); match on `code`.

| `code`                   | `class`      | When                                                                                                                                                                                                                                                 |
| ------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_DEF_INVALID`          | `validation` | Malformed definition at the bridge: non-table `def`, missing or non-string `id` / `title`, non-function `run`, or a field exceeding its byte cap (`host.rs`). `E_DEF_INVALID` marks malformed fields; `E_DEF_LIMIT` marks quota-shaped rejections.   |
| `E_DEF_LIMIT`            | `validation` | The 129th registration: `capture.commands.len() >= REGISTRATION_MAX_COMMANDS` (128, matching the policy-layer manifest ceiling `MAX_COMMANDS = 128) (`host.rs`).                                                                                     |
| Registration error       | `validation` | Registration attempted after `init.lua` returns; the qualified name was not reserved through the manifest (`[lazy].commands`); the static manifest form and the activation registration disagree after canonicalization (RFC, LUA-OQ-12 / LUA-OQ-3). |
| Duplicate qualified name | —            | Rejected at graph construction, never shadowed (RFC). Duplicate-`id` rejection stays in the runtime validator, which sees the full capture plus the manifest (`host.rs` bridge comment).                                                             |

## Capability

None. The extension-level split of the accepted Lua surface RFC lists
`bitty.commands.register` as L1 Control gated by
`none (commands are core-registered behavior)`. The qualified name must
already be reserved through the manifest (`[lazy].commands`, table form
`{ id = "...", args_schema = {...}, result_schema = {...} }` accepted
alongside the string form); the static form is how lazy help and completion
work without a VM.

## Example

Verified against `crates/bitty-lua/tests/host_bridge.rs`. Registration is
captured during activation (`registrations_are_captured`):

```lua
bitty.commands.register({
  id = "summary",
  title = "S",
  run = function() return "ok" end,
})
-- host observes capture.commands[1].id == "summary"
```

A captured `run` is callable host-side with validated args
(`captured_command_is_callable`):

```lua
bitty.commands.register({
  id = "echo",
  title = "E",
  run = function(args) return args.who .. "!" end,
})
-- host dispatches run({ who = "bitty" }) and receives "bitty!"
```

Host dispatch plumbing (palette/CLI/IPC wiring of the captured registry) has
no covering `bitty-lua` test and remains follow-up work; any such example
would be illustrative, never verified.

## Limits

- At most `REGISTRATION_MAX_COMMANDS` (128) captured commands per `init.lua`;
  the 129th fails closed with `E_DEF_LIMIT` before any unbounded growth
  (`host.rs`, HOST-002 admission bound).
- Field byte caps at the bridge: `id` 128, `title` 128, `description` 1024
  (`REGISTRATION_MAX_ID_BYTES`, `REGISTRATION_MAX_TITLE_BYTES`,
  `REGISTRATION_MAX_DESCRIPTION_BYTES`, mirroring the policy-layer
  qualified-name, display-name, and description ceilings).
- Registration calls are valid only while the plugin generation is
  activating; after `init.lua` returns, the generation is activated and any
  later registration attempt is a registration error (RFC, LUA-OQ-12).
- Commands are generation-scoped captures owned by `(PluginId, generation)`
  and disposed with it; applying them (manifest agreement, conflict
  detection, dispatch) stays host-side and is follow-up work (RFC; route
  table in [Lua API Reference](README.md)).
- `args_schema` / `result_schema` equivalence between the static manifest
  form and the activation registration is checked after canonicalization;
  mismatch fails activation with a `validation` diagnostic (RFC, LUA-OQ-3).

## References

- [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md)
  (Accepted; `bitty.commands.register` spelling, `def` schema,
  `[lazy].commands` reservation, qualified naming, LUA-OQ-3, LUA-OQ-12)
- [Lua Reference Overview](overview.md) (error contract, capability gating,
  executability rule, L1/L2 split)
- [Lua API Reference](README.md) (route table; `commands.md` row; capture
  versus host-side apply)
- `bitty` `crates/bitty-lua/src/host.rs` (`commands` `register` capture,
  `CommandRegistration`, `RegistrationCapture`, `REGISTRATION_MAX_COMMANDS`,
  `REGISTRATION_MAX_ID_BYTES`, `REGISTRATION_MAX_TITLE_BYTES`,
  `REGISTRATION_MAX_DESCRIPTION_BYTES`, `E_DEF_INVALID` / `E_DEF_LIMIT`)
- `bitty` `crates/bitty-lua/tests/host_bridge.rs`
  (`registrations_are_captured`, `captured_command_is_callable`)
