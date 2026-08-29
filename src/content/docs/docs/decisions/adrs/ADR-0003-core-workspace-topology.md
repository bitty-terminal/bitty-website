---
title: ADR 0003 - Core Workspace Topology
description: Defines the Cargo workspace crate graph, dependency edges, and MSRV that preserve the microkernel core boundaries
category: decisions
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 33
---

# ADR 0003 - Core Workspace Topology

## Status

Accepted on 2026-08-26 by the project initiator, closing open question
[OQ-005](../open-questions.md). The accepted topology is the ten-crate
graph below. As of 2026-08-29 (`bitty` `be3bdb4`, 16 crates, soak ~808 tests)
the `bitty` workspace additionally contains `bitty-package` with lifecycle and
integrity model accepted
([Package Lifecycle RFC](../../specifications/package-lifecycle-rfc.md),
OQ-021, 2026-08-27), `bitty-lua` accepted
([Lua Runtime RFC](../../specifications/lua-runtime-rfc.md), OQ-009, plus
ADR-0005/0006/0007 OQ-030/031/032, 2026-08-29), and tail crates (`bitty-rich`
OQ-008/015/016, `bitty-ipc`/`bitty-agent` OQ-018) `Implemented` (headless
`Implemented` at `be3bdb4`) ahead of `Verified`; they remain governed by
their RFCs with lifecycle
`Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`,
while `bitty-package` real signature verification remains draft per crate docs.
See the implementation note after the table.

## Context

[ADR 0001](ADR-0001-repository-bootstrap-baseline.md) accepted an
implementation-neutral two-package workspace and explicitly deferred the final
Cargo crate graph and MSRV. The
[Architecture Overview](../../architecture/overview.md) requires a one-way DAG
in which lower layers know nothing about higher layers, and
[Core and Plugin Boundaries](../../architecture/core-boundaries.md) fixes the
normative rule that protocol correctness, Terminal Truth, rendering, input
encoding, the PTY, and security policy cannot be delegated to Lua or plugins.
The project needs a concrete crate decomposition that makes those boundaries
mechanically enforceable by Cargo rather than by review discipline alone.

## Decision

### Crate graph

The `bitty` repository adopts a single Cargo workspace (edition 2024,
resolver 3, `publish = false`) with the following member crates:

| Crate               | Role                                                                                     | Depends on (workspace crates)                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `bitty-vt`          | Byte-stream VT parser producing semantic `TerminalAction` values; no state, no I/O       | none                                                                                                           |
| `bitty-term-state`  | Terminal Truth: grid, cursor, modes, scrollback, damage, replies, image store/placement  | `bitty-vt`                                                                                                     |
| `bitty-pty`         | PTY/ConPTY process lifecycle, resize, signals, I/O backpressure                          | none                                                                                                           |
| `bitty-platform`    | Window/event loop adapter, clipboard primitives, DPI, monitors, notification primitives  | none                                                                                                           |
| `bitty-config`      | Typed runtime configuration, validation, migration, reload/reconcile; `ConfigPlan` model | none                                                                                                           |
| `bitty-render`      | Render snapshots from damage, glyph cache, renderer abstraction, software fallback       | `bitty-term-state`, `bitty-platform`                                                                           |
| `bitty-ui`          | View, `LayoutNode`, split/stack/overlay/focus/resize, selection primitives               | `bitty-term-state`                                                                                             |
| `bitty-plugin-host` | Command/Event/Capability registry, plugin lifecycle, per-plugin VM hosting, budgets      | `bitty-term-state`, `bitty-config`, `bitty-package`                                                            |
| `bitty-runtime`     | Runtime orchestration: command/event/service/lifecycle wiring, cold-path event queue     | `bitty-vt`, `bitty-term-state`, `bitty-pty`, `bitty-render`, `bitty-platform`, `bitty-ui`, `bitty-plugin-host` |
| `bitty-package`     | Package manifest, lockfile, integrity chain, lifecycle states, publisher trust           | none                                                                                                           |
| `bitty-rich`        | Rich presentation helpers, image placeholders, hyperlink and shell-integration models    | `bitty-term-state`, `bitty-vt`                                                                                 |
| `bitty-ipc`         | Bounded IPC/MCP framing, channels, and stdio transport stub                              | none                                                                                                           |
| `bitty-agent`       | Bounded Agent identity, messages, tool vocabulary, observation side queue                | none                                                                                                           |
| `bitty-app`         | Binary entry point; argument handling, startup, safe-mode selection                      | `bitty-runtime`, `bitty-platform`                                                                              |
| `bitty-core`        | Bootstrap seed library retained for migration; to be retired                             | none                                                                                                           |

Implementation note (2026-08-29 `be3bdb4`): the workspace resolves to sixteen
members (`bitty-core` plus fifteen active crates: `vt`, `pty`, `platform`,
`config`, `package`, `lua`, `term-state`, `ui`, `render`, `plugin-host`,
`rich`, `ipc`, `agent`, `runtime`, `app`) as pinned in `bitty/Cargo.toml` and
`Cargo.lock`. `bitty-package` implements the tail of the candidate build-order
spine (`Proposed Delivery Sequence`) with lifecycle and integrity model accepted
([Package Lifecycle RFC](../../specifications/package-lifecycle-rfc.md),
OQ-021, 2026-08-27), `bitty-lua` (`piccolo` 0.3.3) accepted (OQ-009/030-032,
2026-08-29), and `bitty-rich`, `bitty-ipc`, `bitty-agent` as `Implemented`
(headless `Implemented` at `be3bdb4`, soak ~808 tests, `forbid(unsafe_code)`).
`bitty-package` real signature verification, registry, and key-directory
contracts remain draft per crate docs and OQ-022/OQ-026 through OQ-029;
`bitty-rich` the rich-content interfaces (OQ-008/015/016, now `Accepted` via
Rich Presentation RFC 2026-08-28, `Implemented` not yet `Verified`),
`bitty-ipc` the IPC/MCP boundary (OQ-018, `Accepted` 2026-08-29, `Implemented`
not yet `Verified`), and `bitty-agent` the Agent core (OQ-018/OQ-019,
`Accepted`/`Implemented` not yet `Verified`) are `Implemented` headless.
They are not yet wired into `Verified` hot paths and do not expand the
`Verified` topology until the risk evidence matrix is satisfied; a future
revision of this ADR or a successor ADR will decide final placement per
lifecycle `Specified -> Accepted -> Implemented -> Verified`.

Dependency rules:

1. The graph is a strict DAG. No cycles, including dev-dependency cycles.
2. `bitty-vt`, `bitty-term-state`, and `bitty-pty` must not depend on the UI,
   platform, plugin host, config, runtime, or app crates.
3. `bitty-render` reads only render snapshots derived from terminal damage; it
   must not reach into `bitty-term-state` private structures. Snapshot types
   live in `bitty-term-state` public API for this purpose.
4. `bitty-plugin-host` never holds GPU objects, window handles, PTY file
   descriptors, or internal Rust hot-path objects; it observes terminal events
   through the bounded side queue defined in the Architecture Overview.
5. `bitty-app` is a thin composition root. All behavior lives in libraries so
   integration tests can drive the runtime without spawning the binary.
6. Third-party crates may enter `bitty-vt`, `bitty-term-state`, and
   `bitty-plugin-host` only through the wrapper boundaries decided in
   [ADR 0004](ADR-0004-upstream-dependencies.md); no third-party type becomes
   part of these crates' public API.

Enforcement: CI runs `cargo modules graph` (or an equivalent
`cargo metadata`-based check) in advisory mode at first, then as a hard gate
once edges stabilize. `unsafe_code = "deny"` remains workspace-wide; any
platform-level `unsafe` lives behind reviewed adapters per the Security
Overview trust-boundary table.

### Relationship to existing crates

The bootstrap `bitty-core` library is retained as the seed of this graph:
its contents migrate into `bitty-vt`, `bitty-term-state`, and `bitty-pty` as
the first implementation milestones land, after which `bitty-core` is retired.
The migration order itself is implementation work and not decided here.

As of 2026-08-29 the workspace is spine-complete in crate presence (16
crates `be3bdb4`): `bitty-vt`, `bitty-term-state`, `bitty-pty`,
`bitty-platform`, `bitty-config`, `bitty-render`, `bitty-ui`,
`bitty-plugin-host`, `bitty-runtime`, `bitty-package`, `bitty-lua`,
`bitty-rich`, `bitty-ipc`, `bitty-agent`, plus `bitty-app` and the retained
`bitty-core` seed. Presence is `Implemented` (soak ~808 headless tests) but not
yet `Verified`; lifecycle and integrity model is `Accepted` for `bitty-package`
(OQ-021, 2026-08-27) and `bitty-lua` (OQ-009/030-032, 2026-08-29) with signatures
still draft; the tail three (`bitty-rich`, `bitty-ipc`, `bitty-agent`) are
`Implemented` (headless) `Accepted` via Rich Presentation RFC (OQ-008/015/016)
and IPC/Agent RFC (OQ-018) but remain `Implemented` not yet `Verified` per risk
evidence matrix pending.

### MSRV

- MSRV: Rust **1.85**, the release that stabilized edition 2024, matching the
  accepted edition baseline. The workspace sets `rust-version = "1.85"`.
- Policy: MSRV may rise only when a required fix or dependency demands it, is
  recorded in a revision of this ADR or its successor, and stays at least one
  full stable cycle behind current stable to leave headroom for contributors.
- CI additionally builds on current stable to allow edition/tooling adoption
  experiments without moving MSRV.

## Consequences

- Boundary violations become build failures instead of review findings once the
  gate activates; the cost is more crates and more explicit re-exports.
- Parser/state separation gives independent fuzzing and differential testing
  targets (`bitty-vt` has no I/O, so replay corpora need no PTY).
- The split defers renderer/GPU decisions: swapping wgpu/skia/software
  strategies (ADR 0004) touches only `bitty-render` and `bitty-platform`.
- Retiring `bitty-core` later creates a small, deliberate churn point that
  ADR 0001 already anticipated by calling it a bootstrap target.

## Open questions

- Exact placement of debug instrumentation and the debug protocol crate
  (inside `bitty-runtime` versus a dedicated `bitty-debug`) follows OQ-013.
- Image decoding placement inside `bitty-term-state` versus a `bitty-image`
  sibling follows OQ-008's image RFC; the current `bitty-rich` draft is a
  headless presentation sibling and not a final placement decision.
- Input-domain placement (keyboard/mouse encoding, IME, focus, paste, and the
  keymap registry) behind the `bitty-platform` event adapter versus in a
  dedicated input crate is open; no register question owns it yet, so this
  graph assigns nothing here.
- Text-domain placement (UTF-8, graphemes, cell width, combining marks,
  fallback, shaping, and emoji) inside `bitty-term-state` versus a dedicated
  text sibling follows the text RFC named in
  [ADR 0004](ADR-0004-upstream-dependencies.md).
- Final dependency wiring for `bitty-package` (lifecycle accepted, signatures
  draft) and the draft tail crates (`bitty-rich`, `bitty-ipc`, `bitty-agent`)
  and whether they remain standalone or merge into runtime/host siblings awaits
  the follow-up RFCs and a successor topology ADR.
