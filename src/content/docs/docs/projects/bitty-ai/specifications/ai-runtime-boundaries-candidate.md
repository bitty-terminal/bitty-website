---
title: AI runtime boundaries (candidate)
description: Candidate AI runtime boundaries, layering, provider and tool security, and persistence release scope
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 20
---

# AI runtime boundaries (candidate)

## Purpose and scope

This draft records AI-relevant findings from the candidate direction. The
sibling `bitty-ai` repository exists; its documentation gitlink and an
experimental vertical-slice implementation are the only implementation facts.
This is a discussion input, not an accepted contract. Historical assessments
and proposals below are not current capability evidence.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Stable boundary candidates

The candidate direction consistently proposes an independent `bitty-ai` runtime: Bitty
Terminal supplies terminal, panel, process, rendering, and transport mechanisms;
the AI runtime supplies model/context policy, agent state, tools, permissions,
and semantic events. This document must not be read as a product capability
claim.

Candidate layering is `core contracts -> model/context/tools -> runtime ->
store/protocol -> CLI`. Keep provider SDK, MCP, database, and terminal I/O out
of the lowest contracts layer. Workspace and UI ownership remain boundary
questions, not settled facts.

## Runtime and context proposals

- Prefer a deterministic, serializable, sans-I/O agent state machine with an
  external driver for model, tool, context, persistence, and client I/O.
- Treat events as first-class observations: model streaming, tool proposals and
  results, permission requests, usage, cancellation, and context changes.
- Assemble context from typed items carrying provenance/trust, sensitivity,
  freshness, priority, and token estimates; budget, deduplicate, redact, and
  compress before provider formatting.
- A code-intelligence tool family could expose project inspection, symbol/range
  reads, references, diagnostics, transactional edits, formatting, and semantic
  rename. Tree-sitter is suited to syntax; LSP to semantic operations; search
  remains a fallback. `ctxctl` and Aider RepoMap are external references, not
  dependencies or accepted interfaces.
- Batch independent tool calls and keep dependent operations serial. Tool-call
  count, model round trips, and context bytes are distinct optimization metrics.

## Providers, tools, and security

The candidate direction proposes using mature provider/MCP/ACP libraries behind Bitty-owned
traits, while preserving replaceability. These library choices are unaccepted
until license, version, API, and security review. MCP tools must pass the same
capability and permission pipeline as native or remote tools. Permission must
remain capability based, scoped, auditable, and fail closed; proposed effect
analysis refines these required controls. Sandbox and
execution mechanisms may live in Bitty while AI owns policy.

Context collection itself is an attack surface: model output, repositories,
configuration, tool results, and external references are untrusted data.
Secrets must use credential references and filtered environments rather than
being placed in prompts, logs, or durable events. Retry policy must account for
idempotency and must never blanket-wrap destructive tools.

## Persistence and release scope

The candidate direction proposes SQLite plus FTS5 and an append-only event model before
embeddings/vector memory. A first vertical slice is proposed from input through
context, streaming model, permissioned tool call, result, final answer, event
persistence, and replay. Multi-agent coordination, RAG, browser/voice/image
features, distributed execution, and semantic long-term memory are explicitly
future discussion items.

## Evidence and disagreements

Security requirements retain the authority of the
[normative sources](../architecture/ai-architecture.md#normative-sources-this-specification-must-not-weaken).
The proposed runtime design cannot relax read-only defaults, consent, project
trust, resource budgets, secret minimization, or host-side enforcement.
The candidate direction's fixed context-byte limit is not a new global
limit: the current [context contract](../architecture/ai-architecture.md#purpose-and-scope)
is token-first, with the byte default a candidate profile. Neither the proposed
v0.1 schedule nor the terminal-facing architecture's historical post-1.0 scope
decides the standalone AI release profile. Persistence/replay requirements remain
unresolved; neither an ephemeral v0.1 nor a post-1.0 persistence deferral is
selected here.

### Current Bitty AI evidence

The experimental slice is real, not an empty scaffold: at the inspected
revision its session code implements a provider call, conditional bounded
context collection, tool dispatch, and fragment emission. It does not prove the
proposed context-before-provider, tool-result/model-continuation, or
SQLite/replay runtime. The
[pressure-test specification](../product/ai-vertical-slice-pressure-test.md)
records the slice's deterministic local provider and loopback host limitations.
The sibling `bitty-ai` repository also carries a documentation gitlink pinned to
a revision of this repository; the mount was verified read-only at inspection
time.

Claims about current crates, versions, vulnerabilities, protocol maturity, local
database measurements, and repository implementation status require source-level
verification before becoming normative. The directions disagree on whether
provider transport should be a small set of hand-written protocols or an adapter
over a multi-provider library, and whether orchestration belongs in Rust or Lua.
Preserve both options for an explicit decision; do not infer a decision from
repetition.

## Additional candidate coverage

The candidate direction proposes a **Rust kernel / Lua userspace** boundary: Rust owns
correctness, storage, process and network mechanisms, enforcement, IPC,
secrets, token accounting, and context/tool primitives; Lua composes harnesses,
prompts, workflows, hooks, routing, and context strategy. This is a proposal,
not a decision. A harness is composition policy, while an agent is a runtime
configuration/workflow; neither should weaken Rust enforcement.

The direction proposes the project-config directory as declarative,
versionable project intent and policy. The discussion originally used a
provisional name; the current name `.wheel/` is a later owner decision and is
used throughout. Proposed ordinary-setting precedence, from lowest to highest, is
**built-in → user → project → session/CLI**; later layers
override earlier ones only within non-overridable security ceilings. System or
distribution security policy, host limits, and capability/consent requirements
cannot be relaxed by any layer. A project declaration requests authority; it
does not grant it. Merge semantics and session-versus-CLI conflicts still need
a reviewed contract. Runtime state belongs in machine-local data storage,
with XDG data/state/cache separation rather than literal paths. An untrusted
repository `init.lua` or MCP declaration must never execute automatically:
project trust, capability sandboxing, inspection, explicit approval, and
Rust-enforced policy are required. Configuration declares a server or secret
reference; it does not contain implementation or secret material.

Skills describe how to perform work, tools perform capabilities, and MCP
crosses a process boundary. Their configuration, implementation, and trust
models must remain distinct. Native local primitives, Lua composition, and
external MCP services are proposed categories, not an accepted API.
Project-local skills may carry reviewed guidance, scripts, and templates;
global/project shadowing and explicit `builtin:`, `user:`, and `project:`
namespaces are candidate composition rules. Project MCP server source may be
versioned alongside its declaration, but building or starting it is a separate
permissioned effect. The proposed Project Agent Manifest ties together agents,
harnesses, prompts, skills, tools, context sources and policies; its schema and
cross-repository ownership are not settled.

The direction recommends tightening `cargo-deny` dependency policy (including
wildcards, default features, and documented informational advisory exceptions),
but this is an unaccepted security-hardening candidate. The proposed
cancellation tree is session → turn → model/tool/context child operations,
supporting cascade cancellation, bounded channels, and backpressure.

Tracing, OpenTelemetry, and GenAI semantic telemetry for model calls, tools,
context, latency, tokens, and cost are proposed observability work, not current
capability. Edit transactions should validate expected hashes, reject stale or
overlapping edits, apply atomically in memory, run permission and syntax
checks, and return compact verification results. The proposed post-edit
pipeline is parse → format → LSP diagnostics → lint → build/check → targeted
tests.

The staged code-intelligence roadmap is: syntax/project map,
inspection/search/read/graph, multi-file edits, and compact verification;
then LSP definitions, references, implementations, diagnostics, rename, and
code actions; later typed pipelines, persistent indexing, SCIP, and semantic
impact analysis. Earlier sections explore batching and pipelines without
settling their release stage. These are proposals, not implemented features.

Project maps could rank dependency neighborhoods under a token budget, then
read several original-source symbol/range slices with deduplication. Proposed
search modes are text, symbol, structural, and semantic. LSP, formatter,
linter, and build providers remain distinct capabilities; first discover and
configure user-installed tools, deferring a Mason-like installer. Evaluate
reuse of `ctx-symbol` / `ctx-exec` libraries rather than copying their source
or requiring the CLI subprocess, but API/license suitability remains open.
Typed local pipelines are proposed instead of arbitrary-code execution as an
initial batching mechanism, with permissions and budgets on every node.

The candidate direction's native/embodied workspace vision remains speculative: semantic IDs and
command-completion events could connect bounded observations, reveal/focus
suggestions, panel leases, preserved work, and human handoffs. Rendering,
PTY ownership, and physical session restore remain terminal mechanisms;
agent/task/run identity and consent must not be inferred from panel occupancy.

Candidate libraries named by the candidate direction include `genai`, `rig-core`,
`rmcp`, ACP Rust SDKs, `async-lsp`, Tree-sitter, `ast-grep`, `rusqlite`,
`tracing`, OpenTelemetry, `backon`, `secrecy`, `keyring`, and `tiktoken-rs`.
The same direction additionally names `tokio`, `tokio-util::CancellationToken`,
`futures`, `serde` / `serde_json`, `schemars`, `jsonschema`, `reqwest` /
`rustls`, and `cap-std`. Candidate test libraries are **`insta`** for event
snapshots, **`wiremock`** for provider contract mocks, and **`proptest`** for
parser, budget, and stream properties. These complement offline
fake providers/tools and adversarial permission/cancellation/replay tests;
mock success alone does not establish live-provider or sandbox correctness.
Token estimation should be provider-specific and distinguish estimates from
billed usage. Curated memory and searchable session history are separate;
`rusqlite` with a database worker is an initial candidate, SQLx a later
concurrency alternative, and embeddings are deferred.
They are evaluation recommendations only; no dependency, version, license, or
security decision is accepted here.

## Maturity and governance coverage

The maturity direction describes M1 Terminal Truth and M2 Correct Terminal as implemented
or hardening assessments, M3 Usable Terminal as progressing, M4 Workspace/
Panel and M5 Plugin Ecosystem as early/immature runtime areas, M6 Rich/IPC/
Agent as partly implemented with AI design ahead of implementation, and M7
Stable Compatibility and M8 Public Beta as not started. These are dated
directional assessments, not this repository's implementation status. Its
verification-first recommendation is to prioritize compatibility evidence,
ownership/lifecycle invariants, plugin validation, and a narrow AI vertical
slice over expanding design.

The governance direction also flags stale project-state snapshots and an open-question register
that should admit new questions only when they block a milestone or respond to
implementation evidence; future ideas should remain candidate notes.
Its inventory separates agent role, model choice and capability; identifies
task/run/execution identity, workspace overlays and evidence provenance; and
raises CarryCtx backend boundaries and agent growth. These remain distinct
design topics in the existing architecture, not capabilities supplied by this
candidate design's proposed event loop or by the experimental slice.

## Open items

1. Which contracts belong in `bitty-ai` versus a future shared platform crate?
2. Is the initial provider substrate an adapter over an existing library or
   narrowly owned protocol implementations?
3. What is the minimum stable ACP/IPC surface and who owns transport?
4. Which code-intelligence operations are safe read-only defaults, and what
   approval model governs edits, formatting, tests, and remote execution?
5. What event schema, retention/redaction policy, and replay guarantees are
   required for v0.1?
6. Which findings block the next milestone rather than remaining candidate notes?
