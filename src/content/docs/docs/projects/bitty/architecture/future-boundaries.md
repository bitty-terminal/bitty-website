---
title: Future Boundaries
description: Draft candidate decision rules, cross-cutting evolution rules, and pending decisions for the Bitty core and plugin boundary.
category: architecture
audience: plugin-author
document_type: specification
status: draft
website_publish: false
sidebar_order: 22
---

# Future Boundaries

This document is `draft`. It tracks candidate decision rules, cross-cutting
evolution rules, and pending decisions for the Core and Plugin boundary. It is
the evolution companion to [Core and Plugin Boundaries](core-boundaries.md)
(`accepted`): nothing here changes any accepted ownership table and nothing
here weakens any normative P0 gate. Candidate text here does not authorize
shipped, stable, or compatibility-guaranteed behavior.

Provenance: extracted from `core-boundaries.md` by CTX-0007 so that each
document carries one truthful machine-readable status.

## Candidate decision rule

To decide whether a capability belongs in Core, first ask:

> Without it, can Bitty still be a correct, secure, compatible, and presentable
> terminal emulator?

If the answer is no, the capability belongs in Core or in a Core primitive.
Then ask:

> Does it primarily define a user workflow, layout policy, or optional
> experience?

If the answer is yes, it should preferentially be a plugin.

If adopted, this rule will matter more than a permanently frozen feature list.
New requirements should pass through these two questions first.

## Candidate 009 cross-cutting rules

The following rules are candidates from the platform-architecture research
direction. They refine the candidate decision rule above; they do not change
any accepted ownership table and do not weaken any normative P0 gate.

### Primitive-or-composable test

For every new capability ask:

> Is it a Platform Primitive, or is it composable from existing primitives?

`Workspace`, `Panel`, `Focus`, `Event`, `Command`, `Service`, `Capability`,
`IPC`, and `Terminal Session` are candidate Platform Primitives. `AI`,
`Git`, file management, and similar experiences are candidate composables
that belong in plugins. A capability that fails this test as a primitive
but is proposed for Core anyway requires an explicit ADR justifying why
composition is insufficient.

### Semantic API stability rule

The Lua API exposes system semantics, never Rust implementation structure,
so that Rust may refactor freely while the Lua surface stays stable:

```lua
-- Accepted v1 semantic API spellings (ADR 0009; Plugin API v1 Lua Surface RFC).
bitty.terminal.snapshot({ scope = "semantic" })
bitty.ui.mount("statusline", component)
bitty.services.get("ai.chat", { version = ">=2.0" })
```

```lua
-- Deliberately unsupported direction: Rust internals must never be public.
terminal.grid.rows[3].cells[5].glyph
bitty.ipc.send_raw_frame(...)
bitty.renderer.draw(...)
```

Concretely: Rust owns mechanism (PTY, VT, GPU, IPC framing, concurrency,
streaming, HTTP/SSE, resource bounds, capability enforcement, terminal
state, provider protocols, lifecycle) while Lua owns policy (keymaps,
workflows, commands, panel composition, automation, plugin behavior,
prompt logic, provider preference, UX). In short: Rust makes things
possible and safe; Lua decides how they are used.

### Health signals beyond lines of code

Total lines of code must never be compared directly against minimal
terminals: Bitty carries a config runtime, Lua VM, plugin host, package
manager, workspace model, UI extension, rich content, IPC, agent
infrastructure, and security model that a bare emulator omits. Healthier
candidate signals:

- **Dependency direction**: the crate graph stays close to a DAG with no
  reverse edges from lower layers to higher ones.
- **Stable API surface growth**: the public Rust API, Lua API, IPC
  protocol, plugin manifest, and service API grow slowly; surface growth
  is more dangerous than line growth.
- **Core hot path isolation**: nothing from Lua, plugins, IPC, or AI
  enters the PTY read, VT, state, snapshot, and render path.
- **Failure containment**: each subsystem failure degrades only its owner
  (AI crash removes AI, plugin crash disables that plugin, IPC crash
  removes control) while the terminal keeps working.
- **Core-to-total ratio**: core complexity grows slowly while ecosystem
  lines grow through composition; irreducible complexity and its placement
  matter more than totals.

Related extensibility challenges that remain open as follow-up work:
dependency-conflict resolution, service disappearance semantics, and UI
composition conflicts (multiple plugins claiming panels, status areas, or
input). Dependency cycles are already rejected and lifecycle, capability,
and event-storm controls are already accepted in the
[Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md); the three
open items above still require their own RFCs.

## Candidate network boundary: Core never talks to the network

Status: **candidate direction, non-normative** (user architecture note,
bitty-docs CTX-0201 / bitty-docs#288,
[DIR-016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md)).
Nothing here changes any accepted ownership table in
[Core and Plugin Boundaries](core-boundaries.md) and nothing here weakens any
normative P0 gate. No implementation claim.

Principle: Core never talks to the network; network is a boundary capability,
not a base capability. This extends the CarryCtx local-first philosophy to the
terminal: `bitty` runs without git, curl, or network access.

- **Core (never network).** The crates that own terminal truth, state,
  rendering, configuration, and plugin hosting must never depend on the
  network. The user note names `bitty-core`, `bitty-terminal`, `bitty-render`,
  `bitty-panel`, `bitty-plugin-host`, and `bitty-config` (and by extension
  `bitty-ai-core` / `bitty-agent`). The current crate topology is fixed in
  [ADR 0003](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0003-core-workspace-topology.md);
  the direction applies to whichever crates own those mechanisms. No `reqwest`,
  no `curl`, no `git2` / libgit2 in Core.
- **Adapter layer (only network touchpoints).** `bitty plugin
install` / `update` / `search`, future self-update, AI provider HTTP APIs,
  and OAuth / remote / cloud live in an isolated adapter layer:
  `bitty-package` / `bitty-plugin-manager` owns package management and
  providers own their HTTP.
- **Later native HTTP.** When Git cannot serve a need, native HTTP uses
  `reqwest + rustls` (`default-features = false`), isolated in `bitty-net` /
  provider crates and feature-gated so `cargo build --no-default-features`
  stays network-free.
- **Enforcement (candidate).** A dependency-DAG architecture test rejects
  network-capable dependencies in Core crates, alongside the existing layering
  tests recorded in [Core and Plugin Boundaries](core-boundaries.md).

Plugin-source mechanics (`PluginSource` trait, system-`git` v1 sources,
registry-via-git) are canonical in
[Plugin package management](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/package-management.md)
(candidate section); this document records only the Core boundary half.

## Candidate network invariant and transport rules (029 refinement)

Status: **candidate direction, non-normative** (network-capability model, bitty-docs CTX-0202 / bitty-docs#290,
[DIR-017](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md)).
It refines the CTX-0201 network-boundary candidate
([DIR-016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md),
PR #27) by reference and records only what 029 adds: the precise invariant,
the three rules, the system-capability principle, and condensed terminal
evidence. It duplicates no CTX-0201 mechanics. Nothing here changes any
accepted ownership table in [Core and Plugin Boundaries](core-boundaries.md),
nothing here weakens any normative P0 gate, and nothing here claims
implementation.

Precise invariant: `bitty-core MUST NOT initiate Internet/network
connections.` This is explicitly not a socket ban: `AF_UNIX` IPC stays fine,
including PTY-adjacent panel, agent, daemon, and plugin-host IPC such as
`$XDG_RUNTIME_DIR/bitty.sock`. Local IPC never traverses the IP stack, so it
never violates the invariant.

Three architecture rules:

1. `bitty-core` has no network dependency.
2. `bitty-ai-core` has no network dependency.
3. Network exists only behind explicit transport/provider boundaries.

| Consumer       | Network posture                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| Core           | No HTTP/TLS; never initiates (terminal truth, state, render, config, plugin hosting)                               |
| AI Core        | No `reqwest`, TLS, HTTP, or endpoint knowledge (agent, context, tools, message, model abstraction, provider trait) |
| AI Provider    | Optional HTTP behind the provider/transport boundary                                                               |
| Lua plugin     | Optional network only through a declared capability                                                                |
| Plugin manager | External `git` only in v1                                                                                          |

Principle: Bitty prefers system capabilities over bundled implementations,
and composition over integration. Bitty owns orchestration, capability
abstraction, permission, UI, and integration; it does not reimplement the
tools below.

| Need           | System capability             |
| -------------- | ----------------------------- |
| Plugin install | `git`                         |
| Plugin HTTP    | `curl` (V1 backend)           |
| SSH            | `ssh`                         |
| File sync      | `rsync`                       |
| Opening URLs   | `xdg-open` / `open` / `start` |
| Shell          | The user's shell              |

Condensed terminal evidence (not a survey copy): minimal terminals keep the
core network-free (Alacritty, foot, GNOME Terminal / VTE); wrapper terminals
keep the core network-free while delegating network features to system tools
(Ghostty wraps system `ssh`; kitty wraps system `ssh` and fetches theme data
through kittens with cache controls, and its remote control distinguishes
Unix-domain from TCP sockets); integrated terminals move networking in-process
(WezTerm with SSH/TLS domains and HTTP clients; Contour with daemon mode and
in-process SSH). Bitty Core follows the minimal/wrapper side, not the
integrated side. Build-time network (Zig dependencies, `cargo build` from
`crates.io`) is not a runtime dependency.

Unplug property: with the cable pulled, every terminal function keeps working;
the network exists only when the user explicitly runs `bitty plugin install`,
uses an AI cloud provider, SSH, or a network-capable plugin.

Pointers: the runtime plugin HTTP capability and secrets direction are
canonical in
[Plugin system](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/plugin-system.md)
(candidate section); registry-via-git distribution and the `bitty.lock`
(source, version, revision) reproducibility record stay canonical in
[Plugin package management](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/package-management.md)
(CTX-0201 candidate section, extended by reference only); the AI
provider/transport split is an ai-docs rollout follow-up owned by the ai-docs
owners (DIR-017 records the direction; this repository records only the rules
above). Enforcement stays as recorded in the CTX-0201 candidate
(dependency-DAG test rejecting network-capable dependencies in Core crates);
this refinement adds no new mechanism.

## Pending decisions

- The minimum Command, Event, UI, and Service set for the first Plugin API
  version.
- The manifest format and dependency resolution; the current candidate is
  `bitty-plugin.toml`.
- The implementation mechanism for per-plugin VMs, asynchronous callbacks, and
  resource-budget thresholds and enforcement. The VM bridge, lifecycle, source
  staging, and host-service wiring are defined by the accepted
  [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md)
  (OQ-033/OQ-034/OQ-035, ratified through
  [ADR 0010](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0010-plugin-host-runtime-acceptance.md));
  implementation evidence remains per-crate.
- Plugin signing, source trust, installation, and update models.
- The Core network-free boundary and adapter-layer placement above
  (candidate; refines the source-trust item without changing accepted
  ownership).
- Whether the precise `MUST NOT initiate` invariant (DIR-017, refining the
  CTX-0201 wording) is accepted, and how the dependency-DAG enforcement test
  is owned.

- The default bundled-plugin set and disabling behavior.
- Observation-event batching, dropping, and backpressure semantics.
- Which user actions allow interception and the default behavior after a
  timeout.
