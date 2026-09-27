---
title: Lua Reference Overview
description: How to read the per-namespace Lua reference error contract capability gating executability rule and level split
category: reference
audience: plugin-author
document_type: overview
status: draft
website_publish: true
sidebar_order: 20
---

# Lua Reference Overview

> Status: **draft**. This skeleton defines how the per-namespace reference
> pages indexed in the [Lua API Reference](README.md) must be read. It states
> no implemented behavior beyond what the linked contract and the cited
> `bitty` test evidence already pin.

## Purpose and scope

This overview answers: _how does a plugin author read the Lua reference, what
does a bridge denial look like, where does capability gating live, what makes
an example trustworthy, and where does the L1/L2 split apply?_ It links the
accepted [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md)
to the per-namespace pages; normative surface detail stays in that RFC, and
executable behavior stays in the `bitty` repository.

## How to read the reference

Start from the [Lua API Reference](README.md) route table: each row names one
namespace, its v1 status (`implemented` or `not_implemented`), the covering
`crates/bitty-lua/tests/` path, and the planned per-namespace page. A row
marked `not_implemented` names a namespace that is present and callable but
fails closed on every call until a follow-up wires the host backend; do not
treat its functions as usable. The `bitty.process` row is outside v1 scope and
gets no reference page.

## BridgeError contract

Every host denial arrives as a catchable Lua error table with exactly three
fields, per `BridgeError::to_error` in `crates/bitty-lua/src/host.rs`
(`bitty@7da6d6f`): `class` (one of `runtime`, `validation`, `resolution`,
`budget`), `code` (a stable `E_*` identifier such as `E_NOT_IMPLEMENTED`,
`E_CAPABILITY_DENIED`, `E_STORE_QUOTA`, `E_TIMEOUT`), and `message` (a bounded
host-authored string that never echoes untrusted content beyond the offending
token). Match on `code`, never on message text.

## Capability gating

An ungranted call fails closed with typed `E_CAPABILITY_DENIED` (class
`runtime`); `bitty.env` is additionally absent from the VM unless the manifest
declares the grant (the ADR-0006 carve-out). Grants, families, and lifecycle
belong to the capability contract: the
[Plugin Platform RFC](../../specifications/plugin-platform-rfc.md) and the
accepted Lua surface RFC sections they point to. Reference pages state which
grant each function needs and never redefine the model.

## Executability rule

Every `Example` on a per-namespace page maps to a real test path in
`crates/bitty-lua/tests/` (the covering path from the route table). An example
with no covering test is marked as illustrative prose, never as verified
behavior.

## The L1/L2 split

Control-level namespaces (`commands`, `events`, `keymaps`, `settings`,
`store`, `notify`, `env`) and the cross-cutting `services` consumer side are
L1; `ui` contributions and `terminal` snapshots are L2 (declarative slot
content and read-only observation; plugins alter presentation, never terminal
truth). The split, including the `ui.rich` / `ui.overlay` / `terminal.semantic-read`
grant mapping, is defined by the extension-level split of the accepted Lua
surface RFC; reference pages apply it, never restate it.

## Relation to existing systems

- The [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md) is
  the normative surface contract; this overview and the route table orient
  readers within it.
- The [SDK index](../README.md) routes all SDK surface contracts; the Lua
  reference is one entry there.
- The `bitty` repository owns executable behavior and parity evidence
  (`crates/bitty-lua/src/`, `crates/bitty-lua/tests/`); this corpus records
  only what that evidence pins.
- Shared cross-project governance stays in
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs) and is linked,
  never copied.

## References

- [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md)
- [Lua API Reference](README.md)
- [SDK index](../README.md)
- [Plugin Platform RFC](../../specifications/plugin-platform-rfc.md)
