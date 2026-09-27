---
title: bitty.ui Reference
description: Not-implemented L2 declarative UI contribution surface with slot gates and typed denials
category: reference
audience: plugin-author
document_type: reference
status: draft
website_publish: true
sidebar_order: 130
---

# bitty.ui Reference

> Status: **draft**. Normative surface detail lives in the accepted
> [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md);
> executable behavior lives in the `bitty` repository
> (`crates/bitty-lua/src/host.rs`, `bitty@7da6d6f`). This page states no
> behavior beyond what those sources pin.

## Purpose and scope

`bitty.ui` is the accepted L2 surface for declarative slot contributions:
plugins mount scene subtrees into host-owned slots and update them by
handle, altering presentation but never terminal truth (RFC "UI
contributions (L2)"). Its current status is `not_implemented`: the `bitty`
route table marks it `not_implemented` ([Lua API Reference](README.md)),
and the default host fails every call closed with `E_UI_UNAVAILABLE` until
a mount path lands (`crates/bitty-lua/src/host.rs`, `bitty@7da6d6f`). Do
not treat its functions as usable.

## Signature

There are no implemented Lua entry points in this namespace. The accepted
RFC vocabulary names `bitty.ui.mount` / `bitty.ui.update` (RFC "UI
contributions (L2)"), but neither is callable behavior: the `HostServices`
trait defaults fail closed with `E_UI_UNAVAILABLE`
(`crates/bitty-lua/src/host.rs`, `bitty@7da6d6f`) — `ui_mount` at
`host.rs:627` (`"host has no ui.mount surface"`) and `ui_update` at
`host.rs:659` (`"host has no ui.update surface"`), both class `runtime`. A
host without a mount path can never gain ambient authority from the
always-present `bitty.ui` namespace (`host.rs` `ui_mount` docs, LUA-OQ-2).

## Params

The following describes the expected contract shapes only, as derived from
the Rust side — not callable behavior. The slot is an accepted closed set
(`terminal | top | bottom | left | right | tabline | statusline | overlay`)
(RFC "UI contributions (L2)"). The component is a declarative node table
restricted for v1 to the `Text`, `Row`, `Column`, and `List` nodes (RFC "UI
contributions (L2)"). The bridge validates the `slot`/`component` pair
against the accepted v1 contract before the host call
(`crates/bitty-lua/src/host.rs` `ui_mount` docs, `bitty@7da6d6f`). The
update handle is an opaque, generation-owned integer (`block_id`) (RFC "UI
contributions (L2)" and `host.rs` `ui_mount` docs).

## Returns

The following describes the expected contract shapes only, as derived from
the Rust side — not callable behavior. A mount returns the opaque,
generation-owned `block_id` handle
(`crates/bitty-lua/src/host.rs` `ui_mount` docs, `bitty@7da6d6f`). An
update replaces the block's scene subtree under the same `block_id` with
an incremented version and returns a boolean: `false` for a stale or
foreign handle (RFC "UI contributions (L2)"; `host.rs` `ui_update` docs).

## Errors

Denials arrive as catchable Lua error tables (`class` / `code` / `message`,
per `BridgeError::to_error` in `crates/bitty-lua/src/host.rs`,
`bitty@7da6d6f`); match on `code`.

| `code`                   | `class`   | When                                                                                                                                                                                                                               |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_UI_UNAVAILABLE`       | `runtime` | Every call on the default host: no mount path is wired (`host.rs:627`, `host.rs:659`; pinned by `host_without_ui_surface_fails_closed` in `crates/bitty-lua/tests/ui_bridge.rs`).                                                  |
| `E_UI_COMPONENT_INVALID` | —         | Expected bridge vocabulary: a component that violates the scene contract, checked before the host call (`host.rs` `ui_update` docs; RFC "UI contributions (L2)", LUA-OQ-7).                                                        |
| `E_CAPABILITY_DENIED`    | `runtime` | Expected gate vocabulary: the `ui.rich` (or `ui.overlay` for the `overlay` slot) grant is absent (`host.rs` `ui_mount` docs; pinned at the seam by `capability_denial_propagates_typed` in `crates/bitty-lua/tests/ui_bridge.rs`). |
| `E_TIMEOUT`              | `budget`  | Expected pre-commit vocabulary: mounting and update commit through the check-then-act expiry path, so an expired call fails closed without mutating (`host.rs` `ui_mount_with_expiry` / `ui_update_with_expiry` docs).             |

## Capability

`CapabilityFamily::Ui` (`crates/bitty-plugin-host/src/capability.rs`,
`Ui` variant; closed identifiers `ui.rich`, `ui.overlay`,
`ui.protocol-register`). The expected gate is `ui.rich`, with `ui.overlay`
additionally required for the `overlay` slot and an exclusive claim for
`tabline` (`crates/bitty-lua/src/host.rs` `ui_mount` docs,
`bitty@7da6d6f`; RFC "UI contributions (L2)"). The `overlay` slot is
presentation-only, non-focusable declarative content (RFC "UI
contributions (L2)", LUA-OQ-11). Grants, families, and lifecycle belong to
the capability contract and are never redefined here
([Lua Reference Overview](overview.md)).

## Example

Denial shape, verified against `crates/bitty-lua/tests/ui_bridge.rs`
(`host_without_ui_surface_fails_closed`, bare seam with no ui surface):

```lua
local ok, err = pcall(bitty.ui.mount, "statusline", { kind = "Text", text = "x" })
-- ok == false; err.code == "E_UI_UNAVAILABLE"
-- (the default HostServices::ui_mount fails closed; host.rs:627)
```

The validated mount/update round trip exists only behind the
`UiServices` test seam (`mount_and_update_round_trip_validated_scene`);
no passing test exercises a wired host backend.

## Limits

- Not implemented: this namespace has no callable signatures, and every
  statement above about params, returns, gates, and errors describes the
  expected contract only. All of it is subject to change when a mount path
  lands.
- There are no global coordinates, shaders, pipelines, glyph injection,
  native windows, or renderer handles (RFC "UI contributions (L2)").
- `Image`, `CodeBlock`, `Table`, `Rule`, and bordered `Block` nodes are
  excluded from v1 (RFC "UI contributions (L2)").
- Status components are ordinary subtrees mounted in the `statusline`
  slot, and popups are overlay-slot subtrees, not a new node kind (RFC "UI
  contributions (L2)").
- Out of scope (no source): focus behavior, panel routing, and any
  composer behavior beyond the internal scene-diff step.

## References

- [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md)
  (Accepted; "UI contributions (L2)" spellings, slot set, v1 node set,
  `block_id` versioning, `ui.rich` / `ui.overlay` gates, LUA-OQ-7,
  LUA-OQ-11)
- [Lua Reference Overview](overview.md) (error contract, capability gating,
  executability rule, L1/L2 split)
- [Lua API Reference](README.md) (route table; `ui.md` row,
  `not_implemented`)
- `bitty` `crates/bitty-lua/src/host.rs` (`ui_mount` default at
  `host.rs:627`; `ui_update` default at `host.rs:659`;
  `ui_mount_with_expiry` / `ui_update_with_expiry` pre-commit docs)
- `bitty` `crates/bitty-plugin-host/src/capability.rs`
  (`CapabilityFamily::Ui`; `ui.rich`, `ui.overlay`,
  `ui.protocol-register` closed identifiers)
- `bitty` `crates/bitty-lua/tests/ui_bridge.rs`
  (`host_without_ui_surface_fails_closed`,
  `probe_bitty_ui_namespace_is_present`,
  `mount_and_update_round_trip_validated_scene`,
  `capability_denial_propagates_typed`)
