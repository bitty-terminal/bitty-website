---
title: bitty.keymaps Reference
description: L1 key-binding suggestion capture model with admission caps and typed denials
category: reference
audience: plugin-author
document_type: reference
status: draft
website_publish: true
sidebar_order: 90
---

# bitty.keymaps Reference

> Status: **draft**. Normative surface detail lives in the accepted
> [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md);
> executable behavior lives in the `bitty` repository
> (`crates/bitty-lua/src/host.rs`). This page states no behavior beyond what
> those sources pin.

## Purpose and scope

`bitty.keymaps` is the L1 Control surface for suggesting key bindings that
invoke the plugin's own commands. Suggestions never override user or
workspace mappings: the bridge captures each suggestion during `init.lua`
activation, and chord-grammar validation, precedence, and conflict
diagnostics are applied host-side after activation. This page covers
`bitty.keymaps.suggest` (WIRED bridge capture, LUA-OQ-5, CTX-0707), the
only v1 function in this namespace.

## Signature

```lua
bitty.keymaps.suggest(def) -> handle
```

The `keymaps` table in the bridge (`crates/bitty-lua/src/host.rs`,
`bitty@7da6d6f`) exposes exactly one function, `suggest`. A successful
call pushes a `KeymapSuggestion { chord, command, when }` onto the
generation-scoped `RegistrationCapture` in suggestion order and returns
the dense 1-based capture index as the handle. There is no removal
surface, so the index is stable within the generation.

## Params

`def` is a table with the following fields (RFC vocabulary; the bridge
checks shape only — the shipped chord grammar itself is validated
host-side at application time, LUA-OQ-5):

| `def` field | Type   | Required | Rule                                                                                                                                                                                          |
| ----------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chord`     | string | yes      | Non-empty bounded chord string (bridge: `required_string`, at most `REGISTRATION_MAX_KEYMAP_CHORD_BYTES`, 128 bytes, else `E_DEF_INVALID`).                                                   |
| `command`   | string | yes      | Non-empty bounded command name for a command registered by the same generation (bridge: `required_string`, at most `REGISTRATION_MAX_KEYMAP_COMMAND_BYTES`, 128 bytes, else `E_DEF_INVALID`). |
| `when`      | string | no       | Absent normalizes to `"global"`; an explicit `"global"` is accepted; any other value is refused at the bridge with `E_DEF_INVALID` (RFC: a registration error naming the supported context).  |

A non-table `def` is refused with `E_DEF_INVALID`.

## Returns

The integer handle: the 1-based position of the suggestion in the
generation capture (`capture.keymaps.len()` after pushing). Host-side
application (precedence, conflict diagnostics) is follow-up work; the
handle carries no host meaning yet.

## Errors

Denials arrive as catchable Lua error tables (`class` / `code` / `message`,
per `BridgeError::to_error`); match on `code`.

| `code`             | `class`      | When                                                                                                                                                                                                     |
| ------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_DEF_INVALID`    | `validation` | Malformed suggestion at the bridge: non-table `def`, missing or empty `chord` / `command`, a field exceeding its 128-byte cap, or a `when` other than absent / `"global"` (`host.rs`).                   |
| `E_DEF_LIMIT`      | `validation` | The 129th suggestion: `capture.keymaps.len() >= REGISTRATION_MAX_KEYMAP_SUGGESTIONS` (128, mirroring `REGISTRATION_MAX_COMMANDS`) (`host.rs`).                                                           |
| Registration error | `validation` | Suggestion after `init.lua` returns; a `command` not registered by the same generation; a non-`"global"` context (RFC, LUA-OQ-5 / LUA-OQ-12 — the bridge implements the `when` case as `E_DEF_INVALID`). |

## Capability

None. The extension-level split of the accepted Lua surface RFC lists
`bitty.keymaps.suggest` as L1 Control gated by `none (suggestion only)`.
The accepted precedence (`user > workspace > first-party/default > plugin
suggestion`) applies host-side, and chord conflicts produce diagnostics
for user resolution rather than following load order (RFC, LUA-OQ-5).

## Example

Verified against `crates/bitty-lua/tests/lua_parity.rs`
(`keymaps_suggest_captures_with_global_default`; absent `when`
normalizes to `"global"`):

```lua
local h1 = bitty.keymaps.suggest({ chord = "ctrl+k", command = "palette:open" })
local h2 = bitty.keymaps.suggest({ chord = "ctrl+s", command = "palette:save", when = "global" })
-- host observes capture.keymaps[1] == { chord = "ctrl+k", command = "palette:open", when = "global" }
-- and capture.keymaps[2].when == "global"
```

Malformed shapes (`keymaps_suggest_rejects_malformed`) and the 129th
suggestion (`keymaps_suggest_enforces_cap_at_bridge`, `E_DEF_LIMIT`) are
pinned by the same file. Applying suggestions (precedence, conflict
diagnostics) has no covering `bitty-lua` test and remains follow-up work;
any such example would be illustrative, never verified.

## Limits

- At most `REGISTRATION_MAX_KEYMAP_SUGGESTIONS` (128) captured suggestions
  per `init.lua`; the 129th fails closed with `E_DEF_LIMIT` (`host.rs`,
  CTX-0707 admission bound).
- Field byte caps at the bridge: `chord` 128, `command` 128
  (`REGISTRATION_MAX_KEYMAP_CHORD_BYTES`,
  `REGISTRATION_MAX_KEYMAP_COMMAND_BYTES`).
- `when` must be absent or `"global"` in v1; any other value is refused
  (RFC, LUA-OQ-5).
- The shipped chord grammar (trimmed case-insensitive modifiers joined
  with `+`, named keys from the shipped vocabulary, single-character keys
  requiring a modifier) is validated host-side at application, never at
  the bridge (RFC, LUA-OQ-5).
- Identity for precedence and conflict detection is `(when, normalized
chord)` (RFC).
- Suggestion calls are valid only while the plugin generation is
  activating; after `init.lua` returns, any later suggestion attempt is a
  registration error (RFC, LUA-OQ-12).
- Suggestions are generation-scoped captures owned by `(PluginId,
generation)` and disposed with it.

## References

- [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md)
  (Accepted; `bitty.keymaps.suggest` spelling, `def` schema, chord
  grammar, precedence, LUA-OQ-5, LUA-OQ-12)
- [Lua Reference Overview](overview.md) (error contract, capability gating,
  executability rule, L1/L2 split)
- [Lua API Reference](README.md) (route table; `keymaps.md` row; capture
  versus host-side apply)
- `bitty` `crates/bitty-lua/src/host.rs` (`keymaps` `suggest` capture,
  `KeymapSuggestion`, `RegistrationCapture`,
  `REGISTRATION_MAX_KEYMAP_SUGGESTIONS`,
  `REGISTRATION_MAX_KEYMAP_CHORD_BYTES`,
  `REGISTRATION_MAX_KEYMAP_COMMAND_BYTES`, `E_DEF_INVALID` / `E_DEF_LIMIT`)
- `bitty` `crates/bitty-lua/tests/lua_parity.rs`
  (`keymaps_suggest_captures_with_global_default`,
  `keymaps_suggest_rejects_malformed`,
  `keymaps_suggest_enforces_cap_at_bridge`)
