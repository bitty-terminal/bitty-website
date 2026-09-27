---
title: Plugin Contract and Manager Boundary
description: Draft capture of core-side plugin contract shapes and plugin manager boundaries
category: development
audience: contributor
document_type: policy
status: draft
website_publish: true
sidebar_order: 21
---

# Plugin Contract and Manager Boundary

> Status: **draft**. This page is a critical capture of two directions: public
> plugin contracts with layered Lua frameworks and Bitty plugin package
> management with Lux for Lua dependencies.
> It accepts nothing, adopts no SDK, fixes no manifest schema, and authorizes
> no implementation. It refines the implications of DIR-001 (small core),
> DIR-016/DIR-017 (Core network boundary), DIR-024 (dependency governance),
> DIR-026 (execution host), and DIR-027 (agent authority) without rewriting
> them. The accepted
> [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
> [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md),
> [Package Lifecycle RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/packaging/package-lifecycle-rfc.md),
> [Package Follow-up RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/packaging/package-followup-rfc.md),
> [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md),
> ADR-0005/ADR-0009/ADR-0010, and the security corpus remain authoritative.
> `bitty-plugins-docs`-owned and `bitty-ai-docs`-owned semantics are
> deliberately not captured here; they stay owner-pending. Where the page
> references repository state, that state is a point-in-time observation, not
> a contract.

## Problem statement

The two directions each resolve one conflation at the plugin boundary:

- One asks how Lua plugins in separate repositories should call each
  other. Importing another plugin's source by relative path or adjusting the
  module search path couples consumers to repository layout and implementation
  details, which undermines versioning, replacement, lazy loading, permission
  mediation, and potential process separation.
- The other asks where the Bitty plugin system ends and the Lux Lua package
  manager begins. Bitty plugins carry lifecycle, permissions, services,
  panels, UI, and compatibility concerns; plain Lua packages carry only
  sources, resolution, semver, and lockfiles. Equating the two systems merges
  two package kinds with different lifecycles and dependency graphs.

The directions conclude that cross-plugin composition runs through declared,
versioned public contracts, and that Bitty owns its plugin manager while Lux
serves only the Lua dependency layer at development and packaging time.

## The boundary principle

The directions fix two splits that this capture records as direction:

| Split           | Core side owns                                            | Other side owns                                                        |
| --------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Contract layers | Rust enforcement and mechanisms, narrow public Lua SDK    | Replaceable optional framework plugins, application and user plugins   |
| Package graphs  | Bitty plugin graph: lifecycle, permissions, services      | Lua package graph: sources, semver resolution, lockfiles (Lux tooling) |
| Time of binding | Runtime loader and service wiring, pre-resolved artifacts | Development and packaging resolution and vendoring (Lux at build time) |

Consequences recorded:

- Repositories are publication boundaries; versioned service contracts are
  architectural boundaries.
- One user-facing CLI may hide both graphs, but the implementation keeps two
  resolvers and two lock levels.
- Build-time resolution and runtime loading are separate concerns with
  separate manifests.

This page composes with, and does not restate, the two sibling captures: job
supervision and the execution host model live in the
[Execution Host and Supervisor Boundary](execution-host-boundary.md), and
capability intersection, resource enforcement, panel leases, and secret
isolation live in the
[Agent Authority and Hard-Safety Boundary](agent-authority-boundary.md).

## Publication boundaries versus architectural boundaries

The contract direction separates private composition from public composition:

- Ordinary `require()` is appropriate for private modules inside one plugin.
- Cross-plugin consumers use declared public services or mediated proxies;
  they do not reach into another repository's source tree.
- A service interface can have multiple conforming implementations. Consumers
  depend on the interface, never on the provider's repository layout or
  implementation language.

The framework-import sketches do not establish an exception
for private cross-plugin imports.

## SDK contract shapes relevant to core

The Core-relevant contract direction:

- **Typed, schema-backed contracts.** Request, response, and event shapes,
  versioning, and Lua tooling and type hints should make contracts checkable
  rather than relying on undocumented tables.
- **Small core and narrow SDK.** The SDK retains only justified, stable
  public abstractions. There is no heavy second "Lua Core", and ordinary
  plugins do not bind to raw Rust internal APIs. Frameworks evolve separately
  while public contracts insulate consumers from host internals; this is
  stated as a design aim, not an unconditional compatibility guarantee.
- **Authority and lifecycle take precedence.** Accepted security requirements
  and lifecycle schemas override the speculative service methods,
  coroutine and stream interfaces, custom event vocabulary, and sample SDK
  facility lists. Process execution, agent spawning, IPC, networking, and
  credentials appear as illustrative mechanism needs, never as
  ambient access or authorization. Framework wrappers cannot bypass host
  enforcement.
- **Async-first is a proposal, not fake synchrony.** A common service-facing
  abstraction could mediate same-runtime and cross-process calls, but local
  shortcuts must not bypass enforcement or pretend remote calls are ordinary
  synchronous calls that can block the UI or event loop. The direction proposes
  async-first calls and standardized streaming; any accepted contract must
  also explicitly define cancellation and lifecycle behavior. The
  await, promise, coroutine, callback, and stream-iteration spellings are
  discussion alternatives, not accepted SDK methods.

## Dependency declarations versus service requirements

The contract direction keeps two declaration kinds distinct, in a shape that
matters to Core because substitution and authorization cross the host boundary:

- A **package dependency** requires installation of a particular plugin.
- A **service requirement** needs a compatible provider of an interface, so
  an official, user-supplied, or other authorized provider can be substituted
  without rewriting consumers.
- A declared service requirement is not itself a permission grant. The grant
  comes from the capability pipeline recorded in the agent-authority capture
  (DIR-027), not from the declaration.

Contract schemas, version-compatibility rules, and provider
selection and substitution mechanics stay with the plugin-ecosystem owners;
this capture records only the Core-side shape above.

## Bitty-owned plugin manager

The package direction assigns ownership: Bitty implements the Plugin Manager
(lifecycle, permissions, services, compatibility) and the host-controlled Lua
resolver, plus a Service Registry for plugin wiring over the Lua runtime.
Lux is a reference and build-time backend (manifest, lockfile with integrity,
git, local, and workspace dependencies, vendoring, LuaRocks compatibility,
semver resolution), not the runtime and not an embedding ABI the host depends
on while its embedding API is pre-1.0.

The recorded layering:

```text
Bitty Plugin Manager (lifecycle, permissions, services, compatibility)
  -> host-controlled Lua Resolver (Lux at build time, host loader at runtime)
    -> Service Registry (plugin wiring over the Lua runtime)
```

Further direction recorded:

- The CLI unifies `add`, `update`, `sync`, `doctor`, `list`,
  `enable`/`disable`, `info`, and `permissions` over internal resolve,
  verify, unpack, register, and loader-configure steps. Users see one entry
  point without needing to know which resolver runs underneath.
- Two lock levels are kept: a user-side plugin lock and a build-side Lua
  lock baked into the artifact.
- Host network dependencies stay out of install and resolve paths, composing
  with the DIR-016/DIR-017 no-initiate invariant and the DIR-024 dependency
  governance. The plugin registry and index are positioned as the
  distribution point; their service boundaries, attestation, and key
  management stay with the accepted OQ-028/OQ-029 contracts.

## Manifest split

The package direction defines a Bitty-owned plugin manifest separately from the Lua
dependency manifest, with no mega-manifest across abstraction levels:

- The **Bitty manifest** covers identity, entrypoint, host and harness
  compatibility, provided and required services, plugin dependencies, and
  permissions.
- The **Lua dependency manifest** covers the Lua package layer that Lux
  resolves at build time.

Field names, file formats, and lockfile shapes are proposals awaiting owner
approval; this capture fixes only the split, not the schema. The accepted
OQ-021 manifest, lockfile, activation, and rollback contracts stay
authoritative.

## Resolver and loader boundary

The host owns the runtime module loader. Recorded direction:

- The host implements a resolver chain over the sandboxed Lua runtime:
  plugin-local, plugin dependencies, framework packages, stdlib, then
  vendored libraries. It bans native extensions and C loading rather than
  emulating a full traditional Lua runtime.
- Only a defined sandbox-compatible Lua dependency subset is admitted: pure
  Lua with no native code, no arbitrary process execution, and no dynamic
  native loading. Native dependencies are rejected at the manager level, and
  native needs (storage is the example) route through host Rust
  services.
- Plugins ship as self-contained artifacts (manifest, Lua sources, vendored
  pure-Lua dependencies, assets) with dependencies pre-resolved, favoring
  reproducibility, startup speed, security, offline install, sandboxing, and
  version consistency over on-device resolution.
- Lux is confined to development and packaging (declare, resolve, vendor,
  pack), so end-user installs need no Lux toolchain: a build-time versus
  runtime split.
- Supply-chain trust is a hard boundary: project composition files never
  auto-install or execute plugins when entering a repository. Declarations
  prompt for explicit user trust first. Installation executes no package
  code, composing with the security corpus rule that lock and checksum
  validation is required.

## Registry and index role

The direction positions the plugin registry and index as the distribution point
behind the manager, keeping host network dependencies out of the
install and resolve paths. Registry service boundaries, attestation, bundled
generation, key directory, rotation, and freshness stay with the accepted
[Package Follow-up RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/packaging/package-followup-rfc.md)
contracts for OQ-028 and OQ-029; this capture adds no registry claim.

## Out of scope (owner-pending)

Not captured here; owned by the plugin-ecosystem, SDK, terminal, AI, and
Wheel owners:

- Plugin halves (pointers to `bitty-plugins-docs`): dependency and service
  contract schemas, version compatibility, provider selection and
  substitution, dependency declarations, optional and competing framework
  composition, UI mechanism and composition boundaries, the Lua dependency
  subset detail and build-time Lux flow, packaging mechanics, and registry
  and index scope.
- AI halves (pointers to `bitty-ai-docs`): model and provider abstraction,
  normalized streaming across providers, tool schemas and registries,
  context and memory, workflows, and multi-agent orchestration. The
  model, provider, tool, streaming, and agent illustrations do not establish
  Wheel ownership of model infrastructure, accepted tool or provider
  interfaces, or a new agent lifecycle.
- Terminal halves (pointers to `bitty-terminal-docs`): UI
  mechanism-versus-composition boundaries where the terminal corpus owns
  them.

## Open items

- The v0.1 boundary for these mechanisms is not scheduled; nothing here is
  accepted or implemented and no implementation is authorized.
- Owner approval is pending for the manager and Lux split, artifact format,
  manifest fields, lockfile shapes, trust-prompt UX, registry scope,
  contract schemas and version compatibility, provider selection and
  substitution, dependency declarations, async, cancellation, and streaming
  semantics, and the framework-versus-SDK boundary.
- OQ-021 and OQ-026 through OQ-029 remain the package contract owners; the
  accepted and shipped OQ-033/OQ-034/OQ-035 mechanics stay authoritative;
  OQ-072 (reload and update triggers) stays open. No new open question is
  opened here.
- Promotion requires its own review, with independent security review where
  a trust boundary changes.
