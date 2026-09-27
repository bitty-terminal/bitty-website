---
title: bitty.terminal Reference
description: L2 read-only terminal snapshot observation with semantic scope and typed denials
category: reference
audience: plugin-author
document_type: reference
status: draft
website_publish: true
sidebar_order: 70
---

# bitty.terminal Reference

> Status: **draft**. Normative surface detail lives in the accepted
> [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md);
> executable behavior lives in the `bitty` repository
> (`crates/bitty-lua/src/host.rs`). This page states no behavior beyond what
> those sources pin.

## Purpose and scope

`bitty.terminal` is the L2 observation surface for reading a bounded,
committed terminal snapshot. Snapshots are read-only observation: plugins
alter presentation, never terminal truth, and there is no write path to
grid, cursor, modes, or scrollback in v1. This page covers
`bitty.terminal.snapshot`, the only v1 function in this namespace.

## Signature

```lua
bitty.terminal.snapshot(opts) -> Snapshot
```

The `terminal` table in the bridge (`crates/bitty-lua/src/host.rs`,
`bitty@7da6d6f`) exposes exactly one function, `snapshot`. The call
requires an options table carrying a string `scope`, forwards the scope on
the bounded read path to `HostServices::terminal_snapshot`, and returns
whatever snapshot value the host provides; the bridge enforces no snapshot
shape.

Host boundary (`HostServices` in `crates/bitty-lua/src/host.rs`):

```rust
fn terminal_snapshot(&self, scope: &str) -> Result<LuaValue, BridgeError>;
```

## Params

| Param              | Type    | Rule                                                                                                                                                                                                                                                                           |
| ------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `opts`             | table   | Required at the bridge: a missing or non-table argument is refused with `E_SNAPSHOT_SCOPE_UNSUPPORTED` (`host.rs`). The RFC-declared optional `scope` with a `"semantic"` default is not implemented at the bridge — pass `{ scope = "semantic" }` explicitly.                 |
| `opts.scope`       | string  | Required at the bridge: a missing or non-string scope is refused with `E_SNAPSHOT_SCOPE_UNSUPPORTED` (`host.rs`). `"semantic"` is the only accepted v1 scope; any other explicit scope is rejected host-side (RFC vocabulary; `FakeServices` seam rejects with the same code). |
| `opts.terminal_id` | integer | RFC vocabulary only: the bridge reads nothing but `scope` and forwards only the scope string, so an explicit id has no bridge effect and terminal selection stays host-side. Without it the snapshot targets the focused view's attached terminal (RFC).                       |

## Returns

The host-provided snapshot value (RFC shape: `version`, `terminal_id`,
`runtime_id`, `generation`, `snapshot_generation`, `width`, `height`,
`rows`, `cursor`, `modes`, `title`, and optional `zones`; row text with
half-open attribute spans, cursor position, mode flags, and semantic-zone
metadata). Shape conformance is host-side; the bridge returns the value
uninspected.

## Errors

Denials arrive as catchable Lua error tables (`class` / `code` / `message`,
per `BridgeError::to_error`); match on `code`.

| `code`                         | `class`      | When                                                                                                                                                                                         |
| ------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_SNAPSHOT_SCOPE_UNSUPPORTED` | `validation` | Missing or non-table `opts`, or a non-string `scope`, at the bridge (`host.rs`); a non-`"semantic"` scope at the host backend (RFC vocabulary; `FakeServices` seam).                         |
| `E_CAPABILITY_DENIED`          | `runtime`    | The `terminal.semantic-read` grant is absent (`host.rs`, `host_bridge.rs` seam).                                                                                                             |
| `E_SNAPSHOT_TOO_LARGE`         | —            | RFC vocabulary, enforced host-side: a snapshot whose serialized size exceeds `SNAPSHOT_MAX_BYTES` (256 KiB) is rejected rather than truncated. No `bitty-lua` bridge code carries this code. |
| `E_TIMEOUT`                    | `budget`     | The call exceeded its bridge read deadline (`host.rs`, bounded path).                                                                                                                        |

## Capability

`terminal.semantic-read`. The extension-level split of the accepted Lua
surface RFC lists `bitty.terminal.snapshot` (`scope? = "semantic"`,
default) as L2 observation gated by `terminal.semantic-read`. A raw scope
would require `terminal.raw-read` and is explicitly high-risk and excluded
from v1. Terminal enumeration remains excluded: an explicit `terminal_id`
is allowed within the grant so consumers can answer observation events for
other terminals.

## Example

Verified against `crates/bitty-lua/tests/host_bridge.rs`
(`capability_absent_fails_closed`, denial path with the default seam):

```lua
local ok, err = pcall(bitty.terminal.snapshot, { scope = "semantic" })
-- with no terminal.semantic-read grant: ok == false
-- (the seam fails closed with E_CAPABILITY_DENIED; host.rs BridgeError::capability_denied)
```

The granted path is pinned only by the `FakeServices::terminal_snapshot`
seam (which returns a `{ version = 1, zones = {} }` table when
`terminal_read` is set and the scope is `"semantic"`); no passing test
exercises it. The following is illustrative, never verified:

```lua
-- Illustrative: granted-path snapshot shape.
local snap = bitty.terminal.snapshot({ scope = "semantic" })
-- snap.version == 1; snap.rows[i] == { text = "...", spans = { ... } }
```

## Limits

- The region is the visible viewport only, top-down; no scrollback text and
  no full-grid selection in v1 (RFC).
- A snapshot whose serialized size exceeds `SNAPSHOT_MAX_BYTES` (default
  256 KiB, `host.rs`) is rejected with `E_SNAPSHOT_TOO_LARGE` rather than
  truncated (RFC vocabulary, host-side).
- There is no write path to grid, cursor, modes, or scrollback in v1 (RFC).
- While `alternate_screen` is true, zones may be absent and scrollback is
  never included; exiting alternate screen restores the primary grid (RFC).
- Snapshots served to automation surfaces carry the
  untrusted-observation-data label (RFC).
- Coverage is seam-only for the granted path: only the denial shape has a
  passing test (`capability_absent_fails_closed`); snapshot content claims
  rest on the `FakeServices` seam and the RFC shape, never on verified
  delivery.

## References

- [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md)
  (Accepted; `bitty.terminal.snapshot` spelling, `opts` schema, snapshot
  shape, `terminal.semantic-read` gate, LUA-OQ-4)
- [Lua Reference Overview](overview.md) (error contract, capability gating,
  executability rule, L1/L2 split)
- [Lua API Reference](README.md) (route table; `terminal.md` row;
  read-only observation)
- `bitty` `crates/bitty-lua/src/host.rs` (`terminal` `snapshot` bridge,
  `HostServices::terminal_snapshot`, `E_SNAPSHOT_SCOPE_UNSUPPORTED`,
  `SNAPSHOT_MAX_BYTES`)
- `bitty` `crates/bitty-lua/tests/host_bridge.rs`
  (`FakeServices::terminal_snapshot` seam, `capability_absent_fails_closed`)
