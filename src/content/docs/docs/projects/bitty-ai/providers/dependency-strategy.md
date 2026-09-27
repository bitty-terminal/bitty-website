---
title: Dependency Strategy
description: Draft proposal for std-only runtime kernel with post-v0.1 adapter dependency boundaries
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 29
---

# Dependency Strategy

> Status: **draft**. This document records a dependency direction as a
> reviewable proposal. It accepts nothing, describes no shipped behavior, adopts
> no dependency, and authorizes no compatibility promise.
> Every adapter, crate sketch, and version number below is a post-v0.1
> proposal, not a commitment. No new dependency is adopted by this document:
> v0.1 adds zero dependencies per the
> [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md).

## Purpose and scope

**Draft relationship**: Refines the dependency implications of
[AI Architecture](../architecture/ai-architecture.md) MP-3 (Local-first default), TB-1 (MCP as
adapter), TB-3 (Validation before dispatch), TB-4 (Capability and consent per
tool), AG-4 (Least privilege at dispatch), and AG-5 (Orchestration versus
execution). It is gated by the [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
single-crate scope and defers transport, intelligence, and storage detail to
[Command and Tool Architecture](../architecture/command-tool-architecture.md),
[Agent Coordination Architecture](../agent/agent-coordination.md),
[Code Intelligence Architecture](../agent/code-intelligence.md), and
[Persistence and Evidence Architecture](../persistence/persistence-evidence.md). These are
topic relationships, not accepted authority.

## Normative sources this specification must not weaken

- [AI Architecture](../architecture/ai-architecture.md): MP-3, MP-10, TB-1,
  TB-3, TB-4, AG-4, AG-5, CP-5, PP-1, PP-2, and PP-4, plus the
  architecture-level rule that AI and Agent effects stay outside terminal Core.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounded
  framing, scope families, authentication, consent, and streaming constraints
  that every native or MCP adapter must preserve.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  external effects remain untrusted until a narrow grant, and dependency
  convenience must not create ambient authority or a bypass.
- [P0 Security Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md):
  P0-AC-021 through P0-AC-026, including mandatory typed redaction before queue
  and before write.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md): the
  single-runtime, `FakeProvider`, and zero-new-dependency scope gate that this
  proposal may elaborate but cannot override.
- [Tool transport R2](../architecture/tool-transport-r2.md): the unified
  authorization backend that native and MCP effects must continue to share.

Where this document refines a dependency, threshold, or ownership edge, it
refines those sources. If a candidate crate or mechanism weakens a normative
control, the normative text wins and this document must be corrected.

## Terminology

| Term                 | Meaning here                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kernel               | `bitty-ai-runtime` as the deterministic agent state machine over traits and domain types, without an I/O framework or third-party transport stack.                            |
| Dependency inversion | Kernel-owned domain traits and values with external protocols and I/O implemented behind adapters, so the dependency direction points from concrete adapters into the kernel. |
| Adapter              | A boundary component that owns one external protocol or service concern, including its maintenance crates, validation, redaction, and fail-closed behavior.                   |
| Candidate crate      | A named implementation observation in this draft. It is neither a version pin nor an adopted dependency.                                                                      |
| v0.1 scope gate      | The draft review boundary under the implementation profile: one runtime crate, `FakeProvider`, and zero new dependencies.                                                     |
| MSRV                 | Minimum supported Rust version. Every version comparison in this document is an open observation until re-verified for a specific adoption.                                   |
| Test transport       | A proposed deterministic transport boundary for unit tests, distinct from a production network backend.                                                                       |

The authoritative definitions of provider, Tool Bus, context budget,
authorization, execution ownership, and the v0.1 implementation scope stay
with [AI Architecture](../architecture/ai-architecture.md), the
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md), and
their owning specifications. This document links those definitions and adopts
no second contract.

## What this document does not duplicate

Each item below stays owned by its existing document; this proposal references
it and adds only the dependency-boundary facet:

- Provider registry, descriptor, consent, budget, and credential handling stay
  with [AI Architecture](../architecture/ai-architecture.md) MP-1 through MP-11, especially
  MP-3 (Local-first default) and MP-10 (API-key handling). This proposal adds
  no registry field, provider kind, or credential mechanism.
- Tool Bus validation, consent, budgets, and host-only execution stay with
  [AI Architecture](../architecture/ai-architecture.md) TB-1 (MCP as adapter) through TB-7 and
  with [Command and Tool Architecture](../architecture/command-tool-architecture.md). This
  proposal adds no ToolSpec field, authorization backend, or transport
  selection; those stay with AIQ-33, AIQ-36, and AIQ-38.
- Context budget, artifacts, and determinism stay with
  [AI Architecture](../architecture/ai-architecture.md) CP-5 (Budget), CP-6 (Artifacts), and
  CP-7 (Determinism and testability), elaborated by
  [Context Management Architecture](../context/context-management.md) and
  [Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md). This
  proposal adds no serializer, cache key, or budget rule (AIQ-12, AIQ-13).
- Service supervision, Panel and execution ownership, and delegation budgets
  stay with [Agent Coordination Architecture](../agent/agent-coordination.md) under
  AG-4 (Least privilege at dispatch) and AG-5 (Orchestration versus
  execution). This proposal adds no lifecycle state or supervision mechanism.
- LSP sharing, verification fingerprinting, and lint/build/test reuse stay
  with [Code Intelligence Architecture](../agent/code-intelligence.md). This proposal
  adds no broker behavior, overlay rule, or fingerprint field (AIQ-41 through
  AIQ-48).
- Journal representation, backend selection, retention, and replay semantics
  stay with [Persistence and Evidence Architecture](../persistence/persistence-evidence.md).
  This proposal selects no backend and defines no schema (AIQ-51 through
  AIQ-5C).
- The v0.1 scope gate stays with the
  [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md). Anything not
  listed there is out of scope for v0.1, not rejected.
- Open-question ownership and promotion stay with
  [AI Unresolved Questions](../product/ai-unresolved-questions.md) and the canonical OQ
  admission rule in `bitty-docs`. This proposal reuses existing identifiers
  and proposes no new identifier.

## Kernel principle: std-only runtime with dependency inversion

The deterministic agent runtime should stay dependency-free and network-free,
with third-party crates confined to boundary adapters.

**Draft disposition: adopt:**

- `bitty-ai-runtime` keeps its current shape: an agent kernel and state
  machine over traits and domain types for agents, context, providers,
  sessions, streams, and tools, not an I/O framework. It stays without an
  async runtime, HTTP client, TLS stack, MCP SDK, parser, or database in
  v0.1 and, as a working hypothesis, stays without network dependencies
  permanently.
- Dependency inversion at the provider boundary means the runtime knows a
  `ModelProvider` trait and domain tool, context, and session types, but not
  HTTP, vendor APIs, `reqwest`, `tokio`, or TLS. Transport, pooling, timeout,
  redirect, proxy, chunked-body, and SSE-framing behavior belongs to a
  provider adapter, never to the kernel.
- The same inversion applies outward: the Tool Bus knows `ToolSpec`,
  `ToolCall`, `ToolResult`, schema, authorization, and dispatch; it does not
  own MCP framing, LSP lifecycle, file walking, parsing, or storage. Each of
  those enters only through a narrow adapter behind validation,
  authorization, budget, and redaction.

This matches the existing posture that no network call exists until a
provider whose privacy class permits it is selected and the corresponding
capability is granted (MP-3 (Local-first default)), that every native and MCP
effect needs the unified authorization backend (AIQ-33), and that the v0.1
profile runs behind a `FakeProvider` with no network access in v0.1 code
paths.

## Adapter boundary map

Future third-party dependencies, if ever adopted, belong to adapters outside
the kernel. Nothing in this section is adopted now; every row is a post-v0.1
proposal gated on its own contract, OQ resolution, and implementation
evidence.

| Capability                 | Candidate crates (observations, not adoptions) | Owning adapter boundary              | v0.1 status |
| -------------------------- | ---------------------------------------------- | ------------------------------------ | ----------- |
| Deterministic agent kernel | None; standard library only                    | `bitty-ai-runtime`                   | Keep as is  |
| Serialization and wire     | `serde`, `serde_json`                          | Provider / IPC adapter / Tool Bus    | Post-v0.1   |
| Error boilerplate          | `thiserror`                                    | Each adapter / runtime crate         | Post-v0.1   |
| Async runtime              | `tokio`, `tokio-util`                          | Provider / MCP / LSP adapters only   | Post-v0.1   |
| Async streaming            | `futures-core`, `futures-util`                 | Provider streaming adapter           | Post-v0.1   |
| HTTP providers             | `reqwest`                                      | Provider adapter                     | Post-v0.1   |
| MCP client                 | `rmcp`                                         | MCP tool adapter                     | Post-v0.1   |
| Tool schema and validation | `schemars`, `jsonschema`                       | Tool registry / Tool Bus             | Post-v0.1   |
| Logging and spans          | `tracing`                                      | Runtime adapter layer                | Post-v0.1   |
| Workspace file traversal   | `ignore`                                       | Context / code tools adapter         | Post-v0.1   |
| Syntax and symbols         | `tree-sitter` plus grammar crates              | Code intelligence adapter            | Post-v0.1   |
| Language protocol          | `async-lsp`, `lsp-types`                       | Code intelligence broker             | Post-v0.1   |
| Fingerprint and cache keys | `blake3`                                       | Evidence / code intelligence adapter | Post-v0.1   |
| Diff primitives            | `similar`                                      | Diff / context / review primitives   | Post-v0.1   |
| Embedded persistence       | `rusqlite` evaluated first, if ever            | Store adapter, only if decided       | Not now     |
| Test fixtures              | `tempfile` as dev-dependency                   | Tests only                           | Post-v0.1   |

### Provider adapter

When real providers arrive, their adapter should use maintained transport and
protocol crates instead of hand-implementing TCP, HTTP, HTTP/2, TLS, chunked
bodies, SSE, proxying, pooling, timeouts, and redirects. A candidate provider
adapter owns `tokio` plus `reqwest` (with `futures-core` / `futures-util` for
streaming and `tracing` for spans) behind the `ModelProvider` trait, starting
as one consolidated provider crate with per-protocol modules and splitting per
vendor only if lifecycles and release cadences genuinely diverge. Provider
kinds remain transport adapters, never capability grants: remote kinds still
require the accepted network grant and provider consent, and a `local-only`
provider performs no network I/O (MP-3 (Local-first default); MP-10 (API-key
handling)). The consumer-side contract an adapter owes Core, and the split
between adapter-owned protocol concerns and network-owned transport policy, are
specified in
[Provider transport adapter contract](transport-adapter-contract.md).

### Tool Bus adapter

The proposed Tool Bus adapter derives tool argument types into JSON Schema
with `schemars` and validates model-produced JSON arguments with `jsonschema`,
so hand-written field checks do not become the validation story. **Draft
disposition: adopt with the existing order preserved:** size bound, then schema
validation per TB-3 (Validation before dispatch), then typed deserialization,
then permission and effect classification per TB-4 (Capability and consent per
tool), then dispatch. Validation never widens authority, and dispatch stays under
AG-4 (Least privilege at dispatch) with the unified backend from AIQ-33.

### MCP adapter

The proposed MCP adapter avoids re-implementing initialization, capability
negotiation, tools, resources, prompts, notifications, tasks, subscriptions,
transports, JSON-RPC correlation, and version negotiation. It points at the
official Rust MCP SDK as the future client behind an `McpToolAdapter` beside a
`NativeToolAdapter` under the Tool Bus. MCP stays an adapter, not an internal
protocol, per TB-1 (MCP as adapter); every MCP-mediated effect still passes the
same schema, caller and target authorization, consent, budget, redaction, and
outcome rules as native tools. Transport selection and backend ownership stay
open under AIQ-36 with generic execution ownership under AIQ-38.

### Code intelligence adapter

The proposed code-intelligence adapter avoids re-implementing recursive directory
walking with ignore semantics, syntax parsing, and the LSP lifecycle. It points
at `ignore` for workspace scanning, `tree-sitter` plus grammars for outlines
and symbols feeding progressive disclosure, `async-lsp` plus `lsp-types` for
protocol types and framing if a broker is built, and `blake3` for fingerprints
and cache keys. Bitty-owned work stays at the broker, authorization, sharing,
snapshot, and progressive-disclosure layer; protocol, parsing, and traversal
stay with maintained crates. LSP detail (initialize through shutdown, overlays,
restarts, generations) and reuse eligibility stay with [Code Intelligence
Architecture](../agent/code-intelligence.md) and AIQ-41 through AIQ-48.

### Store adapter

The store direction requires restraint while representation, backend, and
durable-recovery scope remain undecided: no `sqlx`, `rusqlite`, `sled`/`redb`,
or `RocksDB` enters now. If a local single-process SQLite profile with WAL is
selected, `rusqlite` is evaluated before a full async SQL framework because the
shape is an embedded database with a controlled schema, not a database
abstraction layer. Backend, schema, retention, and replay-contract choices stay
with AIQ-51 through AIQ-5C, and any durable recording stays under PP-4 (No
on-disk persistence without consent) with PP-2 (Typed redaction).

## Provider and transport separation

This section records only the `bitty-ai` and network-relevant half of the
proposal. Every `bitty`-side row (terminal core, Lua plugin gateway, weather
plugin, and Plugin Manager external git) remains out of scope; this section
decides only the `bitty-ai` side. The direction names no crate versions, and
its provider names, transport kinds, and endpoint shapes are illustrative, never
pins or approvals.

The kernel-no-network rule, the consolidated provider-adapter map, and the
MSRV decision points above establish the dependency boundary. This section
adds four-layer provider/transport layering with an `HttpTransport` sketch and
test transports, a feature-flag isolation sketch, shared transport with separate
permission models, a unified internal model protocol as future direction, and
draft dispositions for three no-network rules. Everything below is a post-v0.1
proposal, not a commitment. The v0.1 posture is restated, not weakened: v0.1
runs behind a `FakeProvider` with no network access in v0.1 code paths per the
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md).

### Agent to transport layering as direction

The proposed four-layer shape keeps the agent from calling an HTTP client
directly:

```text
Agent
  ↓
Model abstraction
  ↓
Provider
  ↓
Transport
```

Not every provider needs the public internet. Illustrative transport kinds
include hosted APIs over HTTPS, local HTTP or process endpoints, and embedded
or mock providers with no network at all. No endpoint URL, port, or protocol
version is adopted by this section.

The proposal sketches two async provider traits, `Provider` with `complete` and
`LanguageModel` with `stream`. Both sketches are future direction only. The
current runtime keeps its synchronous provider-turn shape (`ProviderTurn` and
`Fragment` in the experimental slice, with `FakeProvider` and no network in
v0.1); no async runtime, HTTP client, or TLS stack enters `bitty-ai-runtime`
now. Any async adoption needs its own reviewed contract, OQ resolution, and
implementation evidence, consistent with the split-only-on-real-boundary
sequencing.

The illustrative crate-boundary shape names a core runtime, agent, tools,
context, provider API, per-vendor provider crates, and an HTTP transport
crate. It is future direction, not a plan. The current single-crate scope is
`bitty-ai-runtime`; the anti-pattern remains a direct or transitive
`bitty-ai-runtime` dependency on `reqwest`, because every dependent would then
inherit the HTTP/TLS tree. Per-vendor splits happen only on genuinely divergent
lifecycles, release cadences, or feature sets.

### HttpTransport split and test transports

The proposed split separates vendor logic from HTTP mechanics so an
`OpenAiProvider` owns protocol mapping while an `HttpTransport` abstraction owns
bytes on the wire, with `ReqwestTransport`, `CurlTransport`, `MockTransport`,
`ProxyTransport`, and `RecordedTransport` as future backends. **Draft
disposition: adopt as test-value direction, post-v0.1 only:**

```rust
trait HttpTransport {
    async fn request(
        &self,
        request: HttpRequest,
    ) -> Result<HttpResponse>;
}

struct OpenAiProvider<T: HttpTransport> {
    transport: T,
}
```

Unit tests would then drive `Agent` through `OpenAIProvider` over a
`MockHttpTransport` or `RecordedTransport` without reaching a vendor
endpoint. No transport trait, backend, or vendor crate is adopted now; each
needs its own contract, redaction evidence under PP-2 (Typed redaction),
and fail-closed tests showing no ambient filesystem, process, or network
authority leaks past MP-3 (Local-first default) and AG-4 (Least privilege
at dispatch).

### Feature-flag isolation sketch as direction

The proposed feature-flag layout could use names such as
`provider-openai`, `provider-anthropic`, and `http-native`, so a local-only
build can include agent, tools, context, and a local provider without a
public-internet client. A future Unix-socket or subprocess path could omit the
HTTP client entirely. This is direction only: no feature names, crate names,
or default-feature choices are adopted, and the sketch does not authorize
removing or adding any dependency. Any future flag layout must preserve the
v0.1 zero-new-dependency gate until its own increment explicitly adopts an
adapter.

### Shared transport implementation, separate permission models

The proposal considers sharing the transport implementation between plugin HTTP
and AI providers while keeping their permission models separate: a plugin HTTP
gateway with a permission layer (permission check, host allowlist, sandbox,
rate limit, user consent) beside a provider path for Bitty's own component.
Only the `bitty-ai` half is in scope here. The `bitty`-side rows — weather
plugin over `bitty.http`, the Lua plugin HTTP gateway, the `bitty-http-core`
naming, and Plugin Manager external git — belong to the terminal-docs and
plugins-docs tracks and remain out of scope; nothing here decides them.

On the `bitty-ai` side, a provider path labeled "trusted" receives no ambient
authority and no automatic sandbox, isolation, or capability exemption. It
still requires the applicable gates: MP-3 (Local-first default) for the network
grant, MP-10 (API-key handling) for credential references with typed
redaction, TB-3 (Validation before dispatch) and TB-4 (Capability and consent
per tool) at the Tool Bus, AG-4 (Least privilege at dispatch) at dispatch, and
PP-2 (Typed redaction) with PP-4 (No on-disk persistence without consent) for
any diagnostic, trace, or recorded transport payload. Until AIQ-33 and AIQ-38
resolve placement and enforcement, a network-capable adapter remains inside the
selected isolation domain and explicit capability envelope. Sharing a transport
implementation must never share or widen consent scope.

### Unified internal model protocol as future direction

The proposed Bitty-internal protocol keeps vendor framing inside the adapter:
providers differ in authentication, streaming protocol, tool-calling format,
reasoning fields, usage accounting, and cache metadata. Illustrative provider
families include hosted APIs, local `llama.cpp` and Ollama endpoints, and
enterprise gateways. Each vendor stream (SSE, HTTP chunks, or vendor-specific
events) would be consumed inside the provider adapter and re-emitted as a
uniform event stream over a uniform request shape, such as:

```rust
struct ModelRequest {
    messages: Vec<Message>,
    tools: Vec<ToolDefinition>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
}
```

```rust
enum ModelEvent {
    TextDelta(String),
    ReasoningDelta(String),
    ToolCallStart { /* ... */ },
    ToolCallDelta { /* ... */ },
    ToolCallEnd { /* ... */ },
    Usage(Usage),
    Finished,
}
```

Recorded as future direction only. The current sync provider-turn shape
stays; these async request/event sketches are not adopted, add no
`ModelRequest` or `ModelEvent` type, and decide no streaming, tool-schema,
or accounting semantics. Canonical serialization, stable-prefix ordering,
cache-key, and routing-scope rules stay with AIQ-12 and AIQ-13; provider
transport and bridge placement stay with AIQ-36 with generic execution
ownership under AIQ-38; per-action authorization stays with AIQ-33. No new
identifier is proposed: each facet reuses its existing OQ.

### Draft dispositions for three no-network rules

These three dependency rules are recorded as draft dispositions. The
`bitty`-side row remains out of scope; only the `bitty-ai` row is a
dependency-boundary statement:

> 1. `bitty-core` has no network dependency.
> 2. `bitty-ai-runtime` has no network dependency.
> 3. Network exists only behind explicit transport/provider boundaries.

Dispositions:

1. `bitty-core` has no network dependency: `bitty`-side, out of scope.
   Terminal-docs owns it; recorded here only as a dependency of the
   layering, not decided.
2. `bitty-ai-runtime` has no network dependency: proposal rationale
   consistent with the Kernel principle and the v0.1 `FakeProvider`
   no-network posture, not a new normative requirement. The runtime remains a
   single crate until a real dependency boundary requires a separately reviewed
   split.
3. Network exists only behind explicit transport/provider boundaries:
   proposal rationale consistent with dependency inversion and the adapter
   boundary map, not a new normative requirement. Enforcement still flows
   through the existing controls: MP-3 (Local-first default), MP-10
   (API-key handling), TB-3 (Validation before dispatch), TB-4
   (Capability and consent per tool), AG-4 (Least privilege at dispatch),
   PP-2 (Typed redaction), and PP-4 (No on-disk persistence without
   consent), which this section does not weaken.

The expanded matrix distinguishes terminal core without HTTP/TLS, the AI runtime
without HTTP/TLS, an AI provider with optional HTTP, a Lua plugin with optional
network capability, and Plugin Manager with external git. The AI-runtime row
restates the v0.1 posture as proposal rationale, the AI-provider row is a
post-v0.1 proposal, and the terminal, plugin, and manager rows are out of scope
here.

## MSRV decision points are open, not actions

The workspace baseline is Rust `1.85` for both `bitty` and `bitty-ai`. The
following version observations are illustrative and require verification before
any adoption; this document bumps nothing and pins nothing.

| Crate         | Observed version | Fit against workspace `1.85` | Open decision, not an action                                                                                                                             |
| ------------- | ---------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reqwest`     | `0.13.5`         | Fits the current baseline    | No MSRV decision needed for the provider path on this point alone; adoption still needs its own contract and OQ resolution                               |
| `rmcp`        | `3.x`            | Above the current baseline   | Keep `1.85` and pin a compatible SDK, raise the project MSRV at the MCP stage, or isolate the MCP adapter at a higher MSRV                               |
| `tree-sitter` | `0.27.0`         | Above the current baseline   | Do not raise the whole workspace for one parser now; revisit as an MSRV decision when code intelligence lands, or when the toolchain has moved naturally |

The three-way MCP framing (stay on `1.85`, raise the project, or isolate the
adapter) and the tree-sitter deferral remain open choices faceted to existing
transport and intelligence questions (see below), not a new crate, version pin,
or toolchain decision.

## Split only on a real dependency boundary

The v0.1 single-`bitty-ai-runtime` shape exists to stabilize interfaces first;
crates split along dependency boundaries only when a real external dependency
arrives. An illustrative six-crate shape covering runtime, provider, tool-bus,
MCP, code, and store concerns is a future direction, not an implementation plan.
Premature vendor-per-crate splits and speculative workspace layouts are
rejected: consolidate providers first, then split only on genuinely divergent
lifecycles, release cadences, or feature sets.

## The three closing principles

These three dependency principles are recorded as proposal rationale only, not
as normative requirements:

> `bitty-ai-runtime` stays free of network dependencies for as long as
> possible, ideally long-term near std-only.
>
> HTTP, MCP, LSP, and database access are adapters; they do not enter the
> agent kernel.
>
> Reuse maintained crates for commodity infrastructure (protocols, parsers,
> HTTP/TLS, JSON Schema, LSP, file traversal); reserve Bitty-owned design for
> agent lifecycle, context projection, tool authorization, execution and
> panel integration, and evidence semantics.

## Identity naming is bridge input, not a docs decision

The naming issue is that `bitty-agent::AgentId` as an `owner.name` protocol
principal and `bitty-ai-runtime` numeric `AgentId` alongside `RunId`,
`SessionId`, and `ExecutionId` share a name with different meanings: external
protocol identity versus runtime-local logical handle. Possible future names
include `AgentPrincipalId` versus `AgentInstanceId`, or `ProtocolAgentId`
versus `RuntimeAgentId`, together with a bridge mapping from protocol identity
through authorization into runtime identity and its run, session, and execution
handles.

Judgment: record the options and the bridge sketch as an implementation input.
This document adopts no rename, assigns no identifier, and decides no mapping.
The `bitty-agent` protocol-identity side belongs to the `bitty` repository and
is out of scope here; any change there needs its own reviewed contract in the
owning repository.

## Illustrative version observations

The versions below are observations for discussion, not pins, approvals, or
recommendations. They must be re-verified before any future decision.

| Crate         | Observed version | Status here                              |
| ------------- | ---------------- | ---------------------------------------- |
| `reqwest`     | `0.13.5`         | Fits `1.85`; not adopted                 |
| `rmcp`        | `3.x`            | Needs `1.88`; decision open, not adopted |
| `schemars`    | `1.2.2`          | Derive direction noted; not adopted      |
| `ignore`      | `0.4.33`         | Walker direction noted; not adopted      |
| `tree-sitter` | `0.27.0`         | Needs `1.90`; decision open, not adopted |
| MCP protocol  | `2026-07-28`     | SDK support claim; not verified here     |

`jsonschema`, `tokio`, `tokio-util`, `futures-core`, `futures-util`,
`tracing`, `async-lsp`, `lsp-types`, `blake3`, `similar`, `rusqlite`, and
`tempfile` are named without versions and carry no version observation here.

## v0.1 scope boundary

Consistent with the [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
(single `bitty-ai-runtime`, `FakeProvider`, L0+L1, single-agent scope):

- In scope for v0.1 discussion: the std-only kernel direction, the
  dependency-inversion rule, the adapter boundary map as a planning aid, the
  split-only-on-real-boundary sequencing, and the identity-naming bridge
  input.
- Beyond-v0.1 proposals (not commitments): every adapter crate named above,
  including provider networking, MCP client support, schema validation
  crates, file traversal, parsers and grammars, LSP broker dependencies,
  fingerprint and diff crates, any store backend, and any MSRV bump. Network
  access, persistence, and LSP-backed intelligence are not in v0.1; each
  needs its own reviewed contract, OQ resolution, and evidence before any
  implementation claim.

This document adds zero dependencies to v0.1. The `Cargo.toml` std-only
posture stays until a later increment explicitly adopts an adapter.

## Runtime evidence

No implementation of this proposal is claimed. The version and protocol
observations in this document are not implementation evidence and must be
re-verified before adoption. Any future implementation requires the v0.1
authorization backend (AIQ-33), redaction evidence under P0-AC-026, and code
with tests in the owning implementation repository; no sentence here implies
that code exists.

## Security review

This proposal must not contradict P0-AC-026 ([P0 Security Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)),
PP-2 (Typed redaction), or PP-4 (No on-disk persistence without consent):

- PP-2 (Typed redaction) requires redaction before queuing. Adapter choice
  changes nothing: no provider, MCP, LSP, file-walker, parser, or store
  payload may carry inline secrets into diagnostics, traces, snapshots, or
  child environments, and configuration declares credential references, never
  values (MP-10 (API-key handling)).
- PP-4 (No on-disk persistence without consent) governs every cache, index,
  fingerprint store, and snapshot any adapter implies. A faster prefix cache,
  a shared LSP result, or a persistent evidence sketch never authorizes
  durable recording on its own.
- Minimization (PP-1, where referenced by the architecture) still prefers the
  smallest budget-bound set. Dependency convenience never justifies sending
  more context than the task needs or widening any consent scope.
- Least privilege stays at dispatch per AG-4 (Least privilege at dispatch):
  adding an SDK must not add ambient filesystem, process, or network
  authority, and any new tool surface passes the unified backend from AIQ-33.

No clause here weakens the normative security corpus linked from
[AI Architecture](../architecture/ai-architecture.md). P0 trust boundaries stay release
blockers.

## Verification plan

This specification records the candidate direction plus critical
judgment. It is not implementation evidence. Acceptance requires independent
review, and any future adapter adoption requires:

- A reviewed contract showing the adapter sits outside the kernel, passes
  validation, authorization, budget, and redaction at the boundary, and adds
  no ambient authority, with fail-closed tests.
- Re-verified version, MSRV, and protocol observations with lockfile evidence,
  not reliance on the illustrative table above.
- Privacy evidence that redaction-before-queue, minimization, and
  consent-gated recording hold with the adapter enabled.
- Runtime code and tests in the owning implementation repository; no promise
  here implies that code exists.

## Alternatives considered

- **Keep HTTP and transport dependencies in the runtime kernel.** Rejected:
  every dependent would inherit the async, HTTP, and TLS tree, and the kernel
  would cease to be a deterministic std-only state machine.
- **Hand-implement commodity protocols.** Rejected as the candidate direction:
  maintained protocol, parser, schema, and transport crates stay behind
  adapters, while Bitty-owned design remains focused on agent lifecycle,
  context, authorization, execution, and evidence semantics.
- **Split one crate per vendor immediately.** Rejected: premature splits create
  speculative layouts. Consolidate providers first and split only when
  lifecycles, release cadences, or feature sets genuinely diverge.
- **Share transport code by also sharing permission.** Rejected: a common
  implementation can serve separate policy domains, but transport kind or
  provider identity never supplies consent, capability, isolation, or budget.
- **Adopt async provider and streaming traits now.** Deferred: the sketches
  remain post-v0.1 direction and require their own contract, question
  resolution, implementation evidence, and security review.
- **Choose a local store backend now.** Deferred: representation, durability,
  schema, retention, replay, and MSRV remain with the persistence decisions.
  Dependency observations do not select a backend.

## Affected contracts

- [AI Architecture](../architecture/ai-architecture.md) (Draft): MP-3, MP-10,
  TB-1, TB-3, TB-4, AG-4, AG-5, CP-5, PP-1, PP-2, and PP-4 are elaborated but
  not changed.
- [Provider transport adapter contract](transport-adapter-contract.md)
  (Draft): the std-only kernel and adapter/network division remain consistent;
  no request field, transport mechanism, or numeric policy is adopted here.
- [Provider plugin boundary](provider-plugin-boundary.md) (Draft): Core keeps
  provider policy while adapters own external integrations and opaque host
  credential consumption.
- [Command and Tool Architecture](../architecture/command-tool-architecture.md)
  and [Tool transport R2](../architecture/tool-transport-r2.md) (Draft): Tool
  Bus validation, native/MCP selection, and unified authorization remain
  authoritative for their surfaces.
- [Agent Coordination Architecture](../agent/agent-coordination.md) and
  [Code Intelligence Architecture](../agent/code-intelligence.md) (Draft):
  execution ownership, LSP, parsing, fingerprinting, and reuse boundaries are
  unchanged.
- [Persistence and Evidence Architecture](../persistence/persistence-evidence.md)
  (Draft): representation, backend, retention, and replay choices remain open.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
  (Draft): the single-runtime, `FakeProvider`, and zero-new-dependency gate
  remains in force.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft):
  every cited AIQ retains its current entry; this document creates no new
  identifier.

## Open points

All choices below reuse existing identifiers; no new identifier is proposed.
The MSRV and adapter-timing questions are facets of existing transport,
intelligence, persistence, and serialization items, not independent questions.
Version observations create no new OQ.

1. Which MSRV path covers MCP adoption: project-wide bump, adapter
   isolation, or a compatible SDK generation? (Facet of AIQ-36.)
2. Which MSRV path covers parser adoption when code intelligence lands?
   (Facet of the code-intelligence prerequisites AIQ-41 through AIQ-48.)
3. Which store backend, if any, survives the persistence-profile decision,
   and what MSRV and indexing consequences follow? (Facet of AIQ-53 with
   scope AIQ-5C.)
4. Which reviewed backend enforces per-action capability, target, consent,
   isolation, and budget for every native and MCP effect once adapters
   exist? (AIQ-33; execution ownership AIQ-38.)
5. How are MCP schema staleness, cache invalidation, and changed-effect
   authorization handled once an SDK is in play? (Facet of AIQ-08 with
   AIQ-36.)
6. What are the canonical serialization, stable-prefix ordering, cache-key,
   and routing-scope rules that adapters must reuse rather than reinvent?
   (AIQ-12, AIQ-13.)
7. Risk: an adapter SDK pulls ambient authority (filesystem, process,
   network) into the runtime. Mitigation: keep adapters behind TB-3
   (Validation before dispatch), TB-4 (Capability and consent per tool), and
   AG-4 (Least privilege at dispatch) with fail-closed tests.
8. Risk: supply-chain breadth grows unchecked once adapters land.
   Mitigation: split only on a real dependency boundary, prefer the smallest
   maintained surface that covers the protocol, and record each adoption with
   its own review and lockfile evidence.

## Acceptance criteria

This draft passes document-level review only when all of the following are
true:

- The v0.1 single-runtime, `FakeProvider`, and zero-new-dependency gate remains
  explicit and no candidate crate, version, feature, or backend is described as
  adopted.
- The kernel-principle, adapter-boundary, provider/transport, split, identity,
  MSRV, version, and closing-principle statements retain their proposal-only
  standing and introduce no bypass or ambient authority.
- Version, MSRV, and protocol observations are labeled for re-verification and
  are not used as implementation evidence.
- Security review preserves pre-queue and pre-write redaction, consented
  recording, minimization, validation, authorization, and fail-closed
  behavior.
- AIQ-08, AIQ-12, AIQ-13, AIQ-33, AIQ-36, AIQ-38, AIQ-41 through AIQ-48, and
  AIQ-51 through AIQ-5C retain their register entries; this document
  introduces no identifier, owner assignment, milestone, or implementation
  authorization.
- Every changed canonical file is self-contained and contains no archive
  label, implementation line range, revision fingerprint, or
  implementation-location reference.
- `just check`, `just fmt`, `just links`, `just metadata`, and `just language`
  pass, and independent architecture, security, and documentation review
  records no blocking finding.

## P0 Review Sign-off

No P0 sign-off is claimed by this draft. Before any reliance, the security
reviewer must verify that no adapter dependency adds ambient authority or
weakens validation, consent, budget, redaction, minimization, or fail-closed
behavior. The architecture reviewer must verify the dependency direction,
crate-split boundary, and consistency with provider and Tool Bus contracts. The
documentation reviewer must verify proposal labels, self-containment,
cross-references, version framing, and links. Passing repository gates does not
constitute those sign-offs.

## References

- [AI Architecture](../architecture/ai-architecture.md) (Draft): MP-3 (Local-first default),
  MP-10 (API-key handling), TB-1 (MCP as adapter), TB-3 (Validation before
  dispatch), TB-4 (Capability and consent per tool), AG-4 (Least privilege at
  dispatch), AG-5 (Orchestration versus execution), CP-5 (Budget), PP-2
  (Typed redaction), PP-4 (No on-disk persistence without consent).
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) (Draft):
  single-crate zero-new-dependency scope gate marking every adapter in this
  proposal as post-v0.1.
- [Command and Tool Architecture](../architecture/command-tool-architecture.md) (Draft):
  Core-versus-Lua boundary and AIQ-33, AIQ-36, AIQ-38.
- [Agent Coordination Architecture](../agent/agent-coordination.md) (Draft):
  supervision and execution ownership under AG-4 and AG-5.
- [Code Intelligence Architecture](../agent/code-intelligence.md) (Draft): broker,
  fingerprint, and reuse prerequisites AIQ-41 through AIQ-48.
- [Persistence and Evidence Architecture](../persistence/persistence-evidence.md) (Draft):
  representation, backend, retention, and replay prerequisites AIQ-51 through
  AIQ-5C.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-08,
  AIQ-12, AIQ-13, AIQ-33, AIQ-36, AIQ-38, AIQ-41 through AIQ-48,
  AIQ-51 through AIQ-5C reused; no new identifier proposed.
