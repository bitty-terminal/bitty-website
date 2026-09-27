---
title: Lua API Reference
description: Index of planned per-namespace Plugin API v1 Lua reference pages with implementation status and covering tests
category: reference
audience: plugin-author
document_type: index
status: draft
website_publish: true
sidebar_order: 10
---

# Lua API Reference

Index of the planned per-namespace Plugin API v1 Lua reference pages. Normative
detail lives in the linked contract; this index carries no duplicate normative
prose. Per-namespace pages do not exist yet; page names below are planned, not
links.

## Admission criteria

A per-namespace page is added only when it can state the accepted spelling from
the [Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md), the
host-implementation status below, and at least one covering
`crates/bitty-lua/tests/` path. No page is created for surfaces outside Plugin
API v1.

## Authority and status

This page is a draft routing index. Acceptance of the surface lives in the
[Plugin API v1 Lua Surface RFC](../plugin-api-v1-lua-surface-rfc.md) (Accepted,
ADR-0009); acceptance does not prove implementation. Implementation status
below derives from the `bitty` executable evidence at `bitty@7da6d6f`: required
`HostServices` methods in `crates/bitty-lua/src/host.rs` are `implemented`,
while methods whose trait default fails closed (`E_NOT_IMPLEMENTED`,
`E_UI_UNAVAILABLE`, `E_SPAWN_UNAVAILABLE`) are `not_implemented`. Bridge
captures with no host backend (commands, events, keymaps, tasks, timers) are
`implemented` as captures; applying them host-side remains follow-up work.

## Namespaces

| Namespace                     | v1 status         | Covering `bitty-lua` test path                                                                                                       | Page                        |
| ----------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| `bitty.commands`              | `implemented`     | `crates/bitty-lua/tests/host_bridge.rs` (`registrations_are_captured`, `captured_command_is_callable`)                               | `commands.md` (planned)     |
| `bitty.events`                | `implemented`     | `crates/bitty-lua/tests/host_bridge.rs` (`registrations_are_captured`)                                                               | `events.md` (planned)       |
| `bitty.keymaps`               | `implemented`     | `crates/bitty-lua/tests/lua_parity.rs` (WIRED bridge capture, LUA-OQ-5)                                                              | `keymaps.md` (planned)      |
| `bitty.settings`              | `implemented`     | `crates/bitty-lua/tests/host_bridge.rs` (`store_and_settings_round_trip`)                                                            | `settings.md` (planned)     |
| `bitty.store`                 | `implemented`     | `crates/bitty-lua/tests/host_bridge.rs` (`store_and_settings_round_trip`), `crates/bitty-lua/tests/store_quota.rs` (RC-11 ceilings)  | `store.md` (planned)        |
| `bitty.notify`                | `implemented`     | `crates/bitty-lua/tests/host_bridge.rs` (`FakeServices` notification seam)                                                           | `notify.md` (planned)       |
| `bitty.terminal`              | `implemented`     | `crates/bitty-lua/tests/host_bridge.rs` (`FakeServices::terminal_snapshot` seam)                                                     | `terminal.md` (planned)     |
| `bitty.tasks`, `bitty.timers` | `implemented`     | `crates/bitty-lua/tests/lua_parity.rs` (tasks WIRED capture, LUA-OQ-9), `crates/bitty-lua/tests/host_bridge.rs` (timer capture caps) | `tasks-timers.md` (planned) |
| `bitty.env`                   | `not_implemented` | `crates/bitty-lua/tests/lua_parity.rs` (`env_get_has_are_not_implemented`; grant-gated, CTX-0330)                                    | `env.md` (planned)          |
| `bitty.services`              | `not_implemented` | `crates/bitty-lua/tests/lua_parity.rs` (`services_get_provide_are_not_implemented`, LUA-OQ-8)                                        | `services.md` (planned)     |
| `bitty.ui`                    | `not_implemented` | `crates/bitty-lua/tests/ui_bridge.rs` (mount/update probes, LUA-OQ-7)                                                                | `ui.md` (planned)           |
| `bitty.process`               | `not_implemented` | `crates/bitty-lua/tests/host_bridge.rs` (`process_spawn_unavailable_by_default`; v1-OUT consent-gated extra, CTX-0445)               | none (outside v1 scope)     |
