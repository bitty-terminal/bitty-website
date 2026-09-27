---
title: HostBoundary trait and lint-gate design
description: Draft candidate design for Core versus Lua enforcement through a HostBoundary trait sketch and a fail-closed lint gate
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 57
---

# HostBoundary trait and lint-gate design

> Status: **draft**. This document is a candidate design for owner decision
> DEC-0004 (AIQ-31 facets (a) and (b)): enforcement of the Core versus Lua
> split through a Rust `HostBoundary` trait plus a lint gate. It proposes no
> accepted architecture, authorizes no shipped behavior, closes no Artificial
> Intelligence Question entry, mints no AIQ or OQ identifier, introduces no
> product code, and changes no accepted document. The accepted
> [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and the normative security corpus
> override any statement here. Every call-site anchor below is read-only
> survey evidence at `bitty-ai` `main` `97d3125`; no file in the `bitty-ai`
> repository was modified.

## Purpose and scope

This design answers two of the AIQ-31 facets recorded in
[AI Unresolved Questions](../product/ai-unresolved-questions.md): (a) a
trait-level enforcement point for the Core versus Lua split, and (b) a
lint-level gate that rejects direct cross-layer references. Review-time policy
(the remaining review facet) is out of scope here.

Inputs are the draft [Command and Tool
Architecture](command-tool-architecture.md) (Core implements mechanism, Lua
implements policy and workflow), the draft [Provider plugin
boundary](../providers/provider-plugin-boundary.md) (Core owns the contract, plugins own
integration), the draft [Tool transport
R2](tool-transport-r2.md) (unified authorization backend with fail-closed
denial), the Lua-versus-Core candidate design in the
[Lua and Core safety boundary candidate](../specifications/lua-core-safety-boundary-candidate.md)
(mechanism in Rust, Lua decides how, never whether), and the readiness note in [RFC-split
readiness](../integration/rfc-split-readiness.md) that Core/Lua enforcement stays open under
AIQ-31.

## Call-site inventory (prospective)

The survey below names the seams where host or plugin calls cross or will
cross once a Lua/plugin-loading layer exists. Line anchors are at
`bitty-ai` `main` `97d3125`.

### No Lua or plugin-loading code exists yet

`rg -il 'lua|plugin' crates/bitty-ai-runtime/src/` over the inspected
`bitty-ai` checkout (at `main` `97d3125`) returns only three files —
`agent.rs`, `bridge.rs`, `selection.rs` — and every hit is an incidental
substring: `evaluated`/`evaluation` in `bridge.rs` (`:17`, `:474`, `:536`) and
in `agent.rs` (`:873`), plus the prose line "model plugins own integration
only" in `selection.rs` (`:4`). A stricter whole-word search for loader-shaped
symbols (`mlua`, `wasmtime`, `rlua`, `libloading`, `dlopen`, `dylib`,
`cdylib`, `load_plugin`, `register_plugin`, `lua_state`, `lua_State`) across
`crates/bitty-ai-runtime/src/` and `crates/bitty-ai-slice/src/` returns no
match. There is no Lua runtime binding, no dynamic-library loader, and no
plugin registry in either crate. The inventory below is therefore prospective:
it names the Core-side seams a future host layer must traverse, not calls a
Lua layer makes today.

### Seam 1: extension-point declarations (`extension.rs`, AI-0079)

`crates/bitty-ai-runtime/src/extension.rs` (`366` lines) declares the
extension seam as data only: `ExtensionPoint` (`:61`), `Manifest` (`:95`),
and eight declaration-only point traits — `ModelPoint` (`:110`),
`ToolPoint` (`:121`), `ContextPoint` (`:130`), `MemoryPoint` (`:140`),
`CompactorPoint` (`:149`), `AgentPoint` (`:158`), `CommandPoint` (`:167`),
and `UiPoint` (`:176`) — landed in `bitty-ai` `7b76c27` (AI-0079). The module
header states there is no registry, no resolution algorithm, no versioning
logic, and no permission grant; every trait method is required, there are no
supertraits between the point traits, and there are no blanket impls, so a
probe implementing one point satisfies no other point's bound.

Host-crossing candidate: whatever future registry resolves a `Manifest` into
attached capabilities, and whatever future loader instantiates a point
implementation, must cross the boundary through an explicit host call. The
point traits themselves stay declarations; they never become the crossing
mechanism.

### Seam 2: ToolBus, registry, and spec surface (`tool.rs`, AI-0090)

`crates/bitty-ai-runtime/src/tool.rs` (`1107` lines) owns the vocabulary and
dispatch surface a Lua tool layer would eventually reach for:
`ToolRegistry` with `register`/`lookup` (`:275-347`, `register` at `:301`),
`ToolSpec` with constructor and `schema_digest` (`:201-273`), `ToolBus` with
`new`/`with_authorizer`/`precheck`/`dispatch` (`:578-760`), `ToolAuthorizer`
and `DenyAllAuthorizer` (`:390-409`), and `ToolExecutor` with
`FakeToolExecutor` (`:495-551`). Stale-schema denial was proved in
`bitty-ai` `a4cc1e6` (AI-0090).

Host-crossing candidates: a future Lua `register_tool` or tool-call path must
resolve to `ToolRegistry::register` (with schema-digest invalidation) for
registration and to `ToolBus::precheck` plus `ToolBus::dispatch` (never
directly to a `ToolExecutor`) for execution. Direct construction of
`ToolSpec` from untrusted input bypasses validation and is a lint target.

### Seam 3: provider and selection surface (`provider.rs`, `selection.rs`, AI-0085)

`crates/bitty-ai-runtime/src/provider.rs` (`1051` lines) defines the
`ModelProvider` trait (`:768`: `provider_id`, `list_models`, `complete`,
plus test-observability accessors) with `FakeProvider` (`:801`) as the
deterministic test double, and the sampling contract `SamplingParams` (`:373`)
on `TurnRequest` (`:411`) validated pre-I/O (`validate_sampling`, `:677`;
`check_sampling` ahead of `:768`), landed in `bitty-ai` `f0c1c5e` (AI-0085).
`crates/bitty-ai-runtime/src/selection.rs` (`1562` lines) owns the Core-side
registry, capability-subset matching, alias resolution, ordered fallback, and
typed-error policy over `ProviderRegistry`: `register` (`:402`),
`register_alias` (`:464`), `lookup` (`:519`), `resolve_alias` (`:538`),
`select` (`:570`).

Host-crossing candidates: a future Lua model-selection or provider-call path
must resolve through `ProviderRegistry::select` (never by model-name string
alone) and then through exactly one `ModelProvider::complete` call with
pre-I/O sampling validation. Constructing provider calls that skip
`validate_sampling` or bypass `select` is a lint target.

### Seam 4: cache-key, fingerprint, fencing, and fallback primitives

- `cache_key.rs` (`268` lines): `CacheKey` (`:129`, constructor `:154`),
  `CacheScope` (`:56`), `CacheKeyError` (`:77`); provider-scoped key
  mechanism landed in `bitty-ai` `fdb37c5` (AI-0082). A future Lua
  cache-control or prefix-management path must construct keys only through
  the validated constructor with explicit scope; ad-hoc key strings are a
  lint target.
- `fingerprint.rs` (`177` lines): `InputFingerprint` (`:68`, constructors
  `:85`/`:110`, reuse check `:140`); completeness with disable-on-unknown
  landed in `bitty-ai` `8c5418b` (AI-0095). A future Lua caching or reuse
  path must reuse only through `allows_reuse`; comparing raw digests or
  skipping the unknown-disable is a lint target.
- `fencing.rs` (`228` lines): `WriterLease` (`:62`), `WriterRefusal`
  (`:77`), and the pure predicate `check_writer` (`:142`); interactive
  writer fencing landed in `bitty-ai` `d4d0738` (AI-0092). A future Lua
  write path must present a lease through `check_writer` before issuing a
  write; lease-free writes are a lint target.
- `fallback.rs` (`364` lines): `FallbackEnvelope` (`:121`, constructor
  `:138`, `to_bytes` `:183`, `from_bytes` `:211`) and the scrubbing
  constructor `fallback_for` (`:340`); the minimal-envelope syntax fallback
  landed in `bitty-ai` `97d3125` (AI-0097). A future Lua disclosure or
  degraded-output path must build envelopes through `fallback_for`; direct
  `FallbackEnvelope` literal construction with unscrubbed text is a lint
  target.

## Proposed `HostBoundary` trait shape (illustrative sketch)

The block below is an illustrative design sketch, not product code. It must
not be copied into a crate as an implementation; it exists so reviewers can
judge the shape before any migration task is scoped. Names, bounds, and
error types are placeholders.

```rust
// Illustrative sketch only: candidate HostBoundary shape, not product code.
// Every cross-layer call in the inventory above would traverse this trait;
// Core internals keep calling each other directly.
pub trait HostBoundary {
    type Error;

    // Registration side: plugin and Lua declarations enter only here.
    fn register_tool(&mut self, spec: ToolSpecCandidate) -> Result<ToolName, Self::Error>;
    fn register_alias(&mut self, alias: AliasCandidate) -> Result<(), Self::Error>;

    // Execution side: selection, provider turn, tool dispatch, writes.
    fn select_model(&self, request: &SelectRequestView) -> Result<SelectedModelView, Self::Error>;
    fn complete_turn(&mut self, request: &TurnRequestView) -> Result<TurnOutcomeView, Self::Error>;
    fn dispatch_tool(&mut self, call: &ToolCallView, auth: &AuthProof) -> Result<ToolOutcomeView, Self::Error>;
    fn checked_write(&mut self, lease: &LeaseProof, bytes: &[u8]) -> Result<(), Self::Error>;

    // Cache and disclosure side: keys, fingerprints, fallback envelopes.
    fn cache_key(&self, scope: &CacheScopeView, region: &[u8]) -> Result<CacheKeyView, Self::Error>;
    fn check_reuse(&self, stored: &FingerprintView, candidate: &FingerprintView) -> bool;
    fn fallback(&self, unreadable: &[u8]) -> Result<FallbackView, Self::Error>;
}
```

Why compile-time enforcement beats convention: a trait bound is checked on
every build, while a "call the right function" convention is checked only by
reading the diff. Once the lint gate (below) forbids direct references to
the Core items, the only way for host or plugin code to compile is to go
through an implementor of this trait, so a future Lua binding crate can hold
a `&dyn HostBoundary` (or a generic `H: HostBoundary`) and the compiler
rejects any path that bypasses it. The existing seams already point this
way: `ToolBus` denies by default without an authorizer, `select` fails
closed on name-only resolution, and `check_writer` refuses stale leases, so
the trait composes fail-closed primitives behind one choke point instead of
inventing new policy.

What the trait does not cover:

- Data-format agreement. The trait fixes who may call, not what bytes mean:
  schema shape, serialization, and stable-prefix ordering stay with AIQ-12
  and the registry digest rule (AI-0090).
- Host policy. Budgets, consent scope evaluation, capability grants, and
  redaction stay with the R2 unified authorization backend, MP-10, and the
  security corpus; the trait carries an `AuthProof`, it never mints one.
- Transport and presentation. Wire framing, Panel projection, and rendering
  stay with the accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and AIQ-29;
  the trait returns outcome views, never pixels or wire bytes.
- Loader mechanics. How Lua code is loaded, sandboxed, versioned, or
  reloaded is a separate loader design; this trait only constrains what the
  loaded code may reach once running.

## Lint-gate rule specification

The gate is a fail-closed textual check over the host and plugin binding
surface: any direct reference to a Core-owned item outside the Core crate
fails the build. It applies to host-side and plugin-side binding crates, not
to Core internals (the `bitty-ai-runtime` crate itself) and not to this
documentation repository.

Banned reference patterns (concrete `rg` patterns, run from the `bitty-ai`
repository root against host/plugin binding paths only):

- `rg -n 'use\s+bitty_ai_runtime::(tool|provider|selection|cache_key|fingerprint|fencing|fallback)::' <binding-paths>`
  catches direct imports of the seven inventoried Core modules.
- `rg -n 'bitty_ai_runtime::(tool::(ToolRegistry|ToolBus|ToolSpec|ToolExecutor)|provider::(ModelProvider|FakeProvider)|selection::ProviderRegistry|cache_key::CacheKey|fingerprint::InputFingerprint|fencing::(check_writer|WriterLease)|fallback::(FallbackEnvelope|fallback_for))' <binding-paths>`
  catches fully qualified uses that dodge the import form.
- `rg -n 'impl\s+(ToolExecutor|ToolAuthorizer|ModelProvider)\s+for' <binding-paths>`
  catches out-of-Core implementations of the Core seam traits; new seam
  implementations land in Core or in a reviewed adapter crate named by the
  gate allowlist, never ad hoc in a plugin.
- `rg -n 'unsafe\s*\{' <binding-paths>` catches unsafe blocks in binding
  code; any exception needs an explicit allowlist entry with a safety note.

Allowlist: exact file paths with a one-line justification each, reviewed with
the design. Test doubles inside Core (`FakeProvider`, `FakeToolExecutor`)
are Core-owned and never referenced from binding paths.

Where the gate lives (`just` recipe plus CI step sketch, both illustrative):

```sh
# Illustrative sketch: a future bitty-ai just recipe for the lint gate.
# Fails closed: any hit exits nonzero and fails the build.
just host-boundary-lint:
    #!/usr/bin/env bash
    set -euo pipefail
    rg -n 'use\s+bitty_ai_runtime::(tool|provider|selection|cache_key|fingerprint|fencing|fallback)::' crates/bitty-ai-host crates/bitty-ai-lua --glob '!allowlisted.rs'
    test "${PIPESTATUS[0]}" -eq 1  # rg exits 1 on no match: no hit means pass
```

```yaml
# Illustrative sketch: a future CI step in the bitty-ai repository.
# Not a change to this repository's CI.
- name: Host-boundary lint gate
  run: just host-boundary-lint
```

Fail-closed behavior: the gate exits nonzero on any banned hit, on any `rg`
invocation error (missing path, bad pattern), and on any unlisted binding
crate directory (new host/plugin crates must be added to the scanned paths
explicitly, so silence never means skipped). A passing gate proves only that
no banned textual reference exists; it does not prove semantic confinement,
which stays with review and the trait bound.

## Migration plan

1. Land the lint gate first. It is cheap (textual patterns, no refactor),
   immediate (runs on the current tree with zero hits expected, since no
   binding crates exist yet), and ratchets: every future host or Lua binding
   crate is born inside the gate.
2. Accept this design through review (DEC-0004). No trait migration starts
   before acceptance; the sketch above must survive review unchanged in
   intent or be revised here first.
3. Migrate per call site after acceptance, one scoped task per seam
   (extension registry, ToolBus path, provider/selection path, cache and
   disclosure primitives). Each migration task wires its seam through the
   accepted trait, extends the gate patterns if new bypass spellings appear,
   and closes no AIQ entry by itself.
4. Revisit the review facet separately. Trait plus lint cover mechanism;
   human review policy for promotions and new seams stays with AIQ-32 and
   AIQ-34 and is not claimed here.

## Acceptance criteria

This document is a draft candidate design. It is unaccepted, it closes no
AIQ or OQ entry (AIQ-31 stays open, as do AIQ-32 through AIQ-38 where
referenced), and it mints no new identifier. The accepted
[IPC and Agent RFC](../specifications/ipc-agent-rfc.md) is unaffected: no normative framing,
scope, lifecycle, or consent statement here overrides it. Sibling draft
dispositions ([Execution ownership R1](execution-ownership-r1.md), [Tool
transport R2](tool-transport-r2.md), [Provider plugin
boundary](../providers/provider-plugin-boundary.md)) are referenced as inputs only and
are unrevised by this document. The `bitty-ai` implementation at `97d3125`
is surveyed read-only; nothing here describes that slice as the complete
proposed runtime.

## References

- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-31 and
  the AIQ-32 through AIQ-38 facets; no entry status changes here.
- [Command and Tool Architecture](command-tool-architecture.md) (Draft):
  Core-mechanism versus Lua-policy placement.
- [Tool transport R2](tool-transport-r2.md) (Draft): unified authorization
  backend and fail-closed denial the trait composes.
- [Provider plugin boundary](../providers/provider-plugin-boundary.md) (Draft): Core owns
  the contract, plugins own integration.
- [Lua and Core safety boundary (candidate)](../specifications/lua-core-safety-boundary-candidate.md) (Draft):
  mechanism-in-Rust plus Lua-decides-how direction.
- [RFC-split readiness](../integration/rfc-split-readiness.md) (Draft): AIQ-31 stays open;
  no split promoted here.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): normative IPC framing
  that overrides any statement here.
