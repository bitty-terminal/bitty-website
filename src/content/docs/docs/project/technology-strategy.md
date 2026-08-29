---
title: Technology and Dependency Strategy
description: Separates accepted technology baselines from candidate dependencies, validation gates, platform tiers, and future ADRs.
category: project
audience: contributor
document_type: explanation
status: draft
website_publish: true
sidebar_order: 40
---

# Technology and Dependency Strategy

## Status

This document organizes the technology discussion into a decision queue. Only
the accepted baseline may constrain initialization directly. Candidate
technologies require local research, a minimal prototype, compatibility
validation, and an ADR before they can become production dependencies. A chat
recommendation alone is insufficient.

## Accepted baseline

| Domain                         | Baseline                                                   | Status                                                                                                                                                                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Core language                  | Rust, edition 2024                                         | Accepted                                                                                                                                                                                                                                                                                                     |
| Initialization                 | Minimal repository, toolchain, and CI scaffolding          | Accepted by ADR 0001; zero product functionality and concrete versions remain implementation evidence                                                                                                                                                                                                        |
| Plugin language                | Lua                                                        | Accepted                                                                                                                                                                                                                                                                                                     |
| Primary configuration language | Lua                                                        | Accepted working direction; model, layer, merge, and reload contracts accepted in [Configuration Model RFC](../specifications/configuration-model-rfc.md) (OQ-010); Lua runtime, sandbox, and diagnostics contracts accepted in [Lua Runtime RFC](../specifications/lua-runtime-rfc.md) (OQ-009, 2026-08-27) |
| Product platforms              | Linux, macOS, Windows, and BSD                             | Accepted targets; tiers and CI policy accepted in [ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md)                                                                                                                                                                                           |
| Website                        | Astro static shell with Bun and Workers Static Assets      | Accepted by ADR 0001; no docs consumer exists and presentation/integration mechanisms remain open                                                                                                                                                                                                            |
| Repositories                   | Organization polyrepo                                      | Accepted direction                                                                                                                                                                                                                                                                                           |
| AI                             | Plugin or adapter capability outside the Core product path | Accepted direction                                                                                                                                                                                                                                                                                           |
| Development management         | CarryCtx with predominantly subagent collaboration         | Accepted project process                                                                                                                                                                                                                                                                                     |

## Accepted bootstrap boundary

[ADR 0001](../decisions/adrs/ADR-0001-repository-bootstrap-baseline.md)
accepts an implementation-neutral Core Cargo workspace using Rust edition 2024,
resolver 3, stable Rust with `rustfmt` and `clippy`, `bitty-core` as a library,
`bitty-app` as a binary, `publish = false`, empty dependency tables, `just`, and
read-only format/Clippy/test/`actionlint` CI. This is a two-package bootstrap,
not the final crate graph and not product implementation.

The same ADR accepts an Astro static shell managed by Bun and deployed as
Cloudflare Workers Static Assets. The static build outputs `dist`, needs no
Astro Cloudflare adapter, and has no Worker script or canonical docs consumer.
Loader, synchronization, version selection, theme, routes, redirects, and
search remain open.

Concrete package, action, and tool versions plus lockfile results belong to the
implementation tasks that verify them. The nightly
policy, dependencies beyond the accepted first set, release profiles, license,
package publication, and release automation still require separate decisions;
the crate graph and MSRV are accepted in
[ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) and the first
upstream dependency set in
[ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md). See the
[repository bootstrap guide](../development/repository-bootstrap.md).

## Candidate dependency-governance principles

The goal is not the fewest dependencies. It is controlled core semantics,
replaceable dependencies, and the smallest possible fork count. This policy is
established in
[ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md) before
dependency selection.

| Category               | Default strategy                                                 | Examples                                                            |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| General infrastructure | Use upstream without a fork                                      | GPU abstraction, window/event loop, Lua binding, and file watching  |
| Domain components      | Use through a Bitty-owned wrapper                                | Font stack, image decoding, and PTY helpers                         |
| Core semantics         | Own directly or use only a narrow, synchronizable strategic fork | Terminal state, VT actions, Command/Event, and Plugin API           |
| Product experience     | Design in Bitty and place preferentially in plugins              | DevTools UX, lazy loading/HMR, tabs, workspaces, and AI integration |

No third-party type should become part of Bitty's stable public or internal
architecture without an abstraction boundary. Before any fork, record the
missing capability, upstream issue or pull request, patch surface, synchronization
strategy, exit conditions, and maintenance owner.

The preference order is:

1. use upstream as-is;
2. add a wrapper and platform extension;
3. decompose a composite dependency into lower-level upstream components before
   forking;
4. fork only a small boundary that owns critical semantics;
5. do not use a fork of an entire terminal model as the product foundation.

## Candidate technology matrix

| Domain                | Current candidate                                               | Required validation before adoption                                                                                                                                                                                                                                                                |
| --------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lua runtime           | Lua 5.4 plus vendored `mlua`                                    | Sandbox, restricted-library, and diagnostics contracts accepted in [Lua Runtime RFC](../specifications/lua-runtime-rfc.md) (OQ-009, 2026-08-27); exact pins, audit, and GC/budget tuning remain Open under OQ-030, OQ-031, OQ-032                                                                  |
| Primary configuration | `init.lua` to declarative `ConfigPlan`                          | Accepted: schema, merge, reload, and project-trust contracts defined in [Configuration Model RFC](../specifications/configuration-model-rfc.md) (OQ-010); Lua runtime, sandbox, and diagnostics contracts accepted in [Lua Runtime RFC](../specifications/lua-runtime-rfc.md) (OQ-009, 2026-08-27) |
| Window/input          | `winit` behind `bitty-platform`                                 | Wayland/X11 IME, macOS title bar, Win32 input/DPI, and BSD builds                                                                                                                                                                                                                                  |
| GPU                   | `wgpu` behind the render API                                    | Backend coverage, startup/memory, glyph and image workloads, and driver fallback                                                                                                                                                                                                                   |
| Software rendering    | `softbuffer` or a Bitty-owned backend                           | Snapshot consistency, CI/headless use, remote desktop, and performance floor                                                                                                                                                                                                                       |
| VT parser             | Alacritty `vte` upstream or a narrow fork                       | APC/Kitty Graphics, synchronization cost, throughput, fuzzing, and protocol coverage                                                                                                                                                                                                               |
| Terminal state        | Bitty-owned implementation                                      | xterm/VT compatibility corpus, scrollback, Unicode, damage, and reference oracle                                                                                                                                                                                                                   |
| Unix PTY              | `nix` plus a thin Bitty abstraction                             | Linux/macOS/BSD differences, signals, resize, and child lifecycle                                                                                                                                                                                                                                  |
| Windows PTY           | Direct ConPTY backend                                           | UTF-8/VT pipes, deadlock/backpressure, resize, and process tree                                                                                                                                                                                                                                    |
| Font                  | `cosmic-text` wrapper, descending layer by layer if necessary   | Cell-constrained shaping, ligatures, fallback, emoji, and Nerd Font overflow                                                                                                                                                                                                                       |
| File watch            | `notify`                                                        | Rename/write storms, atomic saves, and cross-platform debounce                                                                                                                                                                                                                                     |
| CPU tracing           | `tracing` plus a Tracy/Puffin adapter                           | Release overhead and stable event schema                                                                                                                                                                                                                                                           |
| GPU profiling         | `wgpu-profiler`                                                 | Timestamp support, Chrome traces, and backend coverage                                                                                                                                                                                                                                             |
| IPC                   | Unix socket plus Windows named pipe with a Bitty-owned protocol | Versioning, authentication, discovery, multi-client behavior, and backpressure                                                                                                                                                                                                                     |
| Async                 | Runtime-agnostic Core with local Tokio use in services          | Thread/event-loop integration, binary cost, and shutdown semantics                                                                                                                                                                                                                                 |

Versions cannot be pinned directly from the early discussion. Each ADR should
use the official documentation, maintenance status, and a local prototype as
they exist at decision time.

## Configuration and plugin runtime

### Accepted

- Plugins use Lua.
- Primary configuration uses Lua; configuration pipeline, layer stack, merge
  rules, reload classification, and project-trust mechanics are accepted in
  [Configuration Model RFC](../specifications/configuration-model-rfc.md)
  (OQ-010, 2026-08-27). Whether to retain a static auxiliary entry point and
  the bounded overlay API remain deferred to follow-up RFCs.
- Lua configuration produces a declarative `ConfigPlan` for Rust validation,
  diff, and reconciliation (accepted per OQ-010).

### Normative security baseline

The following requirements come from the
[Security Overview](../security/overview.md), not from dependency suggestions in
the chat:

- Plugins cannot enter the terminal, render, or input hot paths.
- Plugins request resources and services only through a Host API constrained by
  capabilities and resource budgets.
- P0 uses restricted Lua libraries and a per-plugin VM with CPU, instruction,
  and memory limits.
- A safe startup path that loads no third-party plugins is mandatory.

### Candidates

- Lua 5.4 rather than LuaJIT.
- The configuration VM and plugin VMs are separate.
- The concrete per-plugin VM implementation, creation cost, and VM lifecycle for
  lazy plugins.
- A plugin-generation model that implements complete HMR rather than only
  clearing `package.loaded`.
- A TOML plugin manifest so permissions and dependencies resolve before Lua
  executes.

Using the same language for configuration syntax and plugins does not imply the
same lifecycle. In the accepted model, configuration produces only a typed
`ConfigPlan`; Rust performs validation, diffing, and reconciliation. Plugin
VMs persist to respond to cold-path events.

## Candidate compatibility path

Protocol priority for milestone M1 is accepted in the
[Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md).
The research suggestions below are retained as background:

- **Foundation**: UTF-8, common VT100/VT220/ECMA-48/xterm behavior, 256/true
  color, alternate screen, paste, mouse, focus, and synchronized updates.
- **Metadata and security**: OSC 0/2, OSC 7, OSC 8, OSC 52, and OSC 133.
- **Modern input**: Kitty keyboard protocol.
- **Images**: Kitty Graphics, Sixel, and iTerm2 images; benchmarks and use cases
  determine the order.
- **Shells**: bash, zsh, fish, PowerShell, cmd, nushell, and other shells must
  operate normally without shell integration. OSC 7/133 and injected scripts
  are enhancements only.

The implementation must not infer shell state by parsing prompt text. Shell
integration scripts should be independent and optional, and should transmit
cwd, prompt, and command zones through escape sequences or structured events.

## Candidate platform and CI tiers

The initial platform support tiers and Tier 1 CI gates are accepted in
[ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md). The original
discussion recommendation is retained below:

| Tier   | Candidate platforms                           | Candidate gates                                          |
| ------ | --------------------------------------------- | -------------------------------------------------------- |
| Tier 1 | Linux x86_64, Windows x86_64, and macOS ARM64 | Build, unit, integration, and lint on every pull request |
| Tier 2 | Linux ARM64, macOS x86_64, and FreeBSD x86_64 | Build and Core tests at merge time or on a schedule      |
| Tier 3 | NetBSD, OpenBSD, and other architectures      | Best effort                                              |

Linux Wayland/X11 coverage, minimum platform versions, BSD CI availability, and
the GPU/backend fallback rule are defined in
[ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md); the exact
Windows ConPTY floor is pinned by the implementing platform task.

## Bootstrap and candidate toolchain

The accepted Core bootstrap uses `just` as a single entry point for stable
`rustfmt`, Clippy, workspace tests, `actionlint`, and an aggregate read-only
check. The implementation task pins the concrete tool and action versions it
verifies.

Additional tools remain candidates until an owning task validates and adopts
them:

- **Additional formatting and static checks**: `typos`, `taplo`, and
  `cargo-machete`.
- **Testing and coverage**: `cargo-nextest`, `cargo-llvm-cov`, and snapshot
  testing.
- **Supply chain**: `cargo-deny`, `cargo-audit`, and
  `cargo-semver-checks`.
- **Robustness**: `cargo-fuzz`, with emphasis on VT, OSC/DCS/APC, images, and
  UTF-8.
- **Performance**: Criterion or Divan, `tracing`, Tracy/Puffin, and GPU
  timestamps and traces.
- **Release**: GitHub Actions with `cargo-dist` as a candidate.
- **Development scaffolding**: `xtask` as a candidate for generating protocol
  tables, SDKs, terminfo, fixtures, and similar assets.

Before adoption, verify each tool's maintenance status, cross-platform support,
execution time, and caching strategy. Do not accumulate tools first and invent a
process afterward.

## DevTools and Agent tooling direction

`bitty-devtools` is a strong candidate subproject positioned as a terminal
semantics debugger, not a replacement for GPU capture tools. Candidate panels
include terminal/grid, VT, PTY, renderer/damage, font/glyph, image placement,
input, plugins, shell, configuration, and performance.

Low-level GPU problems continue to use specialist tools such as RenderDoc, Xcode
Metal tools, Chrome trace, and Tracy/Puffin. Bitty DevTools explains the
Bitty-owned semantic model.

`bitty-mcp` should be an adapter for the debug and command protocol. Core knows
only the structured protocol; it does not know MCP, model providers, prompts, or
tokens.

## Local development environment

The primary development machine currently uses CachyOS, Hyprland, and Ghostty.
It can provide Wayland-first local feedback, but the implementation cannot work
only in that combination. CI, dedicated machines, or reproducible experiments
must fill coverage for X11, Windows, macOS, and BSD.

Podman is an optional isolation tool for untrusted input, release builds,
dependency and system-library matrices, or reproductions that need a clean
environment. Ordinary editing and fast local tests do not require a container.

Persistent temporary project material belongs in the workspace `tmp/`, and
reference repositories belong in `tmp/references/`. See the
[Reference Project Register](reference-projects.md) for the concrete research
snapshots.

## ADRs and RFCs to establish

- Accepted: [ADR 0001](../decisions/adrs/ADR-0001-repository-bootstrap-baseline.md)
  defines the minimal Rust 2024 Core and static website bootstrap.
- Follow-up ADR: nightly policy, release profiles, license, publication, and
  toolchain maintenance policy. Crate graph and MSRV are accepted in
  [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md).
- ADR: Lua version, binding, and primary configuration language.
- ADR: window abstraction and `winit`.
- ADR: render API, `wgpu`, and software fallback.
- ADR/RFC: choosing upstream, a fork, or an owned VT parser.
- Accepted: [Terminal State RFC](../specifications/terminal-state-rfc.md)
  defines the Terminal State and VT Action model.
- RFC: Image and Placement model and protocol priority.
- RFC: Command, Event, Capability, and declarative UI.
- RFC: plugin manifest, lazy loading, VM isolation, and HMR.
- RFC: debug protocol, record/replay, and MCP adapter.
- Accepted: [ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md)
  defines platform support tiers and the CI matrix.
