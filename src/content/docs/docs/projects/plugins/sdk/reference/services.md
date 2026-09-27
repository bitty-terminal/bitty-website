---
title: bitty.services Reference
description: Not-implemented cross-cutting service consumer and provider surface with typed denials
category: reference
audience: plugin-author
document_type: reference
status: draft
website_publish: true
sidebar_order: 120
---

# bitty.services Reference

> Status: **draft**. Normative surface detail lives in the accepted
> [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md);
> executable behavior lives in the `bitty` repository
> (`crates/bitty-lua/src/host.rs`, `bitty@7da6d6f`). This page states no
> behavior beyond what those sources pin.

## Purpose and scope

`bitty.services` is the accepted cross-cutting surface for resolving a
provided service (consumer side) and declaring one (provider side),
freezing only the minimal v1 consumer/provider contract (RFC "Services";
LUA-OQ-8). Its current status is `not_implemented`: the `bitty` route
table marks it `not_implemented` ([Lua API Reference](README.md)), and
every call fails closed until a service backend lands
(`crates/bitty-lua/src/host.rs`, `bitty@7da6d6f`). Do not treat its
functions as usable.

## Signature

There are no implemented Lua entry points in this namespace. The accepted
RFC vocabulary names `bitty.services.get` / `bitty.services.provide` (RFC
"Services"), but neither is callable behavior: the `HostServices` trait
defaults fail closed with `E_NOT_IMPLEMENTED`
(`crates/bitty-lua/src/host.rs`, `bitty@7da6d6f`) — `service_provide_check`
at `host.rs:691`
(`Err(BridgeError::not_implemented("bitty.services.provide"))`),
`service_resolve` at `host.rs:710` and `service_call` at `host.rs:732`
(both `Err(BridgeError::not_implemented("bitty.services.get"))`), all
constructed by `BridgeError::not_implemented` at `host.rs:444`.

## Params

The following describes the expected contract shapes only, as derived from
the Rust side — not callable behavior. The consumer takes an interface
name plus an options table carrying a version requirement (`opts.version`
in the accepted version-requirement grammar) and an optional flag
(`opts.optional`), mirrored in the trait as `req: Option<&str>` and
`optional: bool` (`crates/bitty-lua/src/host.rs` `service_resolve` docs,
`bitty@7da6d6f`; RFC "Services"). The provider side takes an interface
name and an `impl` table whose members are functions, with the interface
name, concrete version, and bounded JSON Schema
(`args_schema`/`result_schema`) declared in the manifest
`[services.provided]` entry (RFC "Services").

## Returns

The following describes the expected contract shapes only, as derived from
the Rust side — not callable behavior. Resolution hands the consumer a
snapshot route, not a live reference: the bridge builds one callable
closure per resolved route
(`crates/bitty-lua/src/host.rs` `ServiceRoute` docs, `bitty@7da6d6f`).
With `optional = true`, an unresolvable interface returns `Ok(None)` (Lua
`nil`) instead of an error (`crates/bitty-lua/src/host.rs`
`service_resolve` docs; RFC "Services"). Results are values rather than
cross-VM handles (RFC "Services").

## Errors

Denials arrive as catchable Lua error tables (`class` / `code` / `message`,
per `BridgeError::to_error` in `crates/bitty-lua/src/host.rs`,
`bitty@7da6d6f`); match on `code`.

| `code`                 | `class`      | When                                                                                                                                                                                                       |
| ---------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_NOT_IMPLEMENTED`    | `runtime`    | Every call on the default host: no service backend is wired (`host.rs:691`, `host.rs:710`, `host.rs:732`; pinned by `services_get_provide_are_not_implemented` in `crates/bitty-lua/tests/lua_parity.rs`). |
| `E_SERVICE_RESOLUTION` | `resolution` | Expected host-side vocabulary: the provider is selected before activation or resolution fails closed (RFC "Services"; the runtime overrides the default with manifest-checked directory resolution).       |
| `E_SERVICE_GONE`       | `runtime`    | Expected host-side vocabulary: provider disappearance after activation makes in-flight calls fail closed; no stale handle stays callable (RFC "Services"; `service_call` docs).                            |
| `E_SERVICE_INVALID`    | —            | Expected host-side vocabulary: schema violation on generation-checked cross-VM invocation (`service_call` docs).                                                                                           |

## Capability

None on the consumer side. The RFC extension-level split lists the
consumer side as gated by none, with provider grants staying with the
callee (RFC extension table), and the callee executes with its own grants
(RFC "Services"). No single `CapabilityFamily` member
(`crates/bitty-plugin-host/src/capability.rs`, which defines no services
family) gates the consumer call; grants, families, and lifecycle belong to
the capability contract and are never redefined here
([Lua Reference Overview](overview.md)).

## Example

Denial shape, verified against `crates/bitty-lua/tests/lua_parity.rs`
(`services_get_provide_are_not_implemented`, default seam with no service
backend):

```lua
local ok, err = pcall(bitty.services.get, "iface", {})
-- ok == false; err.code == "E_NOT_IMPLEMENTED"; err.class == "runtime"
-- (the default HostServices::service_resolve fails closed; host.rs:710)
```

The manifest-checked directory resolution and cross-VM invocation paths
exist only as trait-doc vocabulary for the runtime override; no passing
test exercises a wired backend.

## Limits

- Not implemented: this namespace has no callable signatures, and every
  statement above about params, returns, and errors describes the expected
  contract only. All of it is subject to change when a service backend
  lands.
- A republished replacement never hijacks a live handle, and a stale
  generation fails closed (`service_call` docs) — expected vocabulary, not
  pinned behavior.
- Only table-form `[services.provided]` entries are resolvable by
  schema-validating consumers (RFC "Services").
- Provider ecology beyond this minimal contract is explicitly deferred
  (RFC "Services").
- Out of scope (no source): resolution ordering, caching, retry, timeouts,
  and any concrete interface names or schemas.

## References

- [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md)
  (Accepted; "Services" spellings, `opts` schema, `E_SERVICE_RESOLUTION` /
  `E_SERVICE_GONE` vocabulary, LUA-OQ-8, deferred provider ecology)
- [Lua Reference Overview](overview.md) (error contract, capability gating,
  executability rule, L1/L2 split)
- [Lua API Reference](README.md) (route table; `services.md` row,
  `not_implemented`)
- `bitty` `crates/bitty-lua/src/host.rs` (`BridgeError::not_implemented`
  at `host.rs:444`; `service_provide_check` default at `host.rs:691`;
  `service_resolve` default at `host.rs:710`; `service_call` default at
  `host.rs:732`; `ServiceRoute` snapshot docs)
- `bitty` `crates/bitty-lua/tests/lua_parity.rs`
  (`services_get_provide_are_not_implemented`,
  `not_implemented_constructor_shape`)
