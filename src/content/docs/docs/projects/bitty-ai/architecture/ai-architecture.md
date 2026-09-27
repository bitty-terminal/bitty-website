---
title: AI Architecture
description: Draft AI architecture for ModelProvider ContextProvider Tool bus and Agent layers post 1.0
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: true
sidebar_order: 23
---

# AI Architecture

> Status: **draft** (frontmatter `draft`) for post-1.0 AI architecture covering ModelProvider, ContextProvider, Tool Bus, and Agent layers. This document proposes the ModelProvider (`ai.model` `list_models`/`complete`/`stream`/`cancel`), ContextProvider (workspace, project, git, diagnostics, terminal) with Stable Id hierarchy Instance/Window/Workspace/View/Terminal, a token-first context budget and request contract (OQ-066), and semantic zones, Agent four levels (inspect/self/workspace/all), ephemeral AgentWorkspace, Rich streaming (Markdown/Diff/ToolCard), Tool Bus via MCP, and privacy-first controls. It does not describe implemented behavior, does not authorize shipped, stable, normative, or compatibility-guaranteed behavior, and does not close [OQ-018](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) which remains closed by [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) on 2026-08-29. Experimental implementation may exist as review evidence but carries no compatibility promise and does not constitute acceptance. Acceptance requires independent category-owner, docs-curator, and security-reviewer evidence. Lifecycle is `Draft -> experimental review evidence -> Accepted -> normative`.

Candidacy in this document is declared per section: every candidate or direction section states its standing in a `Status:` line, and its heading carries a matching marker. This document is a draft and contains no accepted normative body, so candidate material is not yet consolidated into a normative form. Convergence of the candidate sections into a single closing non-normative section is therefore deferred to a future acceptance and layout decision.

## Purpose and scope

Bitty is an agent-friendly, not agent-centric terminal. [Product vision](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/product/vision.md) and [Core and Plugin Boundaries](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/core-boundaries.md) keep AI and Agent experiences outside the terminal core as optional integrations, preferentially in plugins, while [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) already defines the accepted bounded IPC framing, wire, auth, scopes, and bounded `AgentMessage`/`AgentObservation`/`SideQueue`/`AgentSession` contracts that close [OQ-018](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) at the design level.

This specification extends that baseline for post-1.0 AI work: how a model,
context, tool, and agent layer compose without entering the terminal, render,
or input hot paths, without binding the core to a model vendor or prompt
system, and without weakening the privacy, capability, or budget controls
already normative.

In scope:

- **ModelProvider** (`ai.model`): host-owned provider registry, model capability negotiation, `list_models`/`complete`/`stream`/`cancel` operations, budgets, and privacy handling.
- **ContextProvider**: workspace, project, git, diagnostics, and terminal snapshot sources, their Stable Id addressing, Context Budget, and semantic-zone awareness.
- **Stable Id hierarchy**: `Instance` / `Window` / `Workspace` / `View` / `Terminal` identity model for selection, attribution, and consent scoping.
- **Context contract**: token-first context requests and artifacts per agent turn, with attribution, truncation, chunking, provenance, and drill-down rules; the `32 KiB` byte default stays a candidate profile (OQ-066), not a core bound.
- **Semantic zones** as context boundaries derived from shell-integration OSC 7/133.
- **Agent**: four levels `inspect` / `self` / `workspace` / `all`, their capability implications, and generation-scoped ownership, plus the ephemeral capability-scoped `AgentWorkspace`.
- **Rich streaming**: Markdown, Diff, and ToolCard rendering via the Rich Presentation scene, with incremental damage, selection, and accessibility.
- **Tool Bus**: MCP adapter as the tool transport, registry, validation, and consent-bound dispatch.
- **Privacy-first** posture: minimization, typed redaction, per-scope consent, and the prohibition of self-acceptance.

Out of scope (owned elsewhere):

- IPC transport, framing, peer-credential auth, per-request scope evaluation, and RC-9/RC-10 (owned by [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) under OQ-018).
- Rich-block, scene, image, and structured-transport renderer contracts beyond the Rich streaming integration (owned by [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md) under OQ-008/OQ-015/OQ-016).
- Plugin API v1 namespaces, capability grammar, manifest schema, event pipeline classes, and lifecycle generations (owned by [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md) under OQ-011/OQ-012/OQ-013).
- Per-plugin instruction, CPU, memory, queue, and task enforcement mechanics (owned by [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/isolation-resource-rfc.md) under OQ-014).
- Lua runtime, standard-library subset, module resolution, and diagnostics (owned by [Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/lua-runtime-rfc.md) and [ADR 0005](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0005-lua-pins-and-stdlib.md), [ADR 0006](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0006-os-env-policy.md), [ADR 0007](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0007-async-gc.md)).
- Configuration pipeline, layers, and project-trust mechanics (owned by [Configuration Model RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/configuration-model-rfc.md) under OQ-010).
- CLI grammar, command registry, and exit codes (owned by [CLI Contract RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/cli-contract-rfc.md) under OQ-017).

This document introduces no new trust boundary. Every transition into a privileged host primitive stays behind the capability, scope, budget, and consent gates already normative in the security corpus.

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md): default posture that PTY, plugins, projects, IPC/MCP/Agent, packages, and reference repos are untrusted until a narrow grant, invariants 1 through 10, trust-boundary table, capability families, and the rule that deferral must not create a bypass.
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md): boundary map `PTY bytes | Lua plugin | IPC/MCP -> Bitty core`, section `MCP, Agents, and DevTools` (T-10, R-013) with untrusted-observation labeling, and section `IPC, CLI, and child processes` (T-09, R-011, R-012).
- [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md): R-011 (IPC scope escalation), R-012 (child credential leak), R-013 (confused deputy via terminal output), R-014 (secret exposure via traces).
- [P0 Security Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md): P0-AC-021 through P0-AC-026, P0-AC-013, and the verification-method conventions.
- [Core and Plugin Boundaries](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/core-boundaries.md): mechanism versus policy split, Terminal Truth ownership, declarative UI, two security domains (`TerminalSecurityPolicy` versus `PluginCapabilities`), and the rule that AI and Agent layers remain outside the core.
- [Architecture Overview](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/overview.md): the candidate data-flow invariants, the one-way DAG rule for layers, and the spine `bitty-ipc` / `bitty-agent` placement (the `bitty-agent` crate remains `Implemented` but not yet `Verified` and does not imply shipped behavior).
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md): bounded framing 256 KiB, channel caps, wire envelope v1, peer-credential auth, scope families, RC-9/RC-10, `AgentId`/`AgentMessage`/`AgentObservation`/`SideQueue`/`AgentSession`, consent ledger, and streaming chunking that this RFC reuses without redefining caps.
- [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md): `ImageStore`/`ImagePlacement`, `RichBlock`/`Scene`/`SceneNode`/`SemanticZone`/`BlockAnchor`, scene snapshot and damage contracts, and structured-transport authentication that Rich streaming rides on.
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md): manifest, capability identifiers, lifecycle generations, and the authoritative three-level queue budgets (PerSubscription 64 / PerPlugin 1024 events or 256 KiB / Global 8192 events or 2 MiB) with DropOldest default.
- [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/isolation-resource-rfc.md): budget dimensions RC-1, RC-2, RC-4, RC-5, and failure semantics FS-1 through FS-9 that bound provider and agent execution.
- [Plugin System](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/plugin-system.md) and [Rich Content](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/interfaces/rich-content.md): terminal surface versus rich surface versus overlay surface, explicit semantic source requirement, and level-2 versus level-3 presentation distinction.

Where this RFC picks a threshold or encoding, it refines those sources. It does not move a requirement between owners and, if a mechanism here weakens a normative control, the normative text wins and this RFC must be corrected.

## Terminology

| Term               | Meaning                                                                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ModelProvider      | Host-owned registry of LLM providers and models exposed via `ai.model`, with per-model capability and budget metadata.                                                                                |
| ContextProvider    | Host-owned source of bounded context for an agent turn, one of workspace, project, git, diagnostics, or terminal.                                                                                     |
| Stable Id          | Persistent, cross-restart identifier for one of Instance, Window, Workspace, View, or Terminal, used for attribution and scoping.                                                                     |
| SemanticZone       | Core-owned boundary record (prompt, input, command, output) derived from OSC 7/133, owned by terminal state and consumed by rich and context layers.                                                  |
| Context Budget     | Per-turn context ceiling resolved from the CP-5 request contract (token-first; the `32 KiB` byte default is a candidate profile) with counted truncation, provenance, and chunking to Rich streaming. |
| Agent level        | Attenuated authority tier: `inspect`, `self`, `workspace`, or `all`, each implying a distinct capability set.                                                                                         |
| AgentWorkspace     | Ephemeral, per-session working directory scoped to one `AgentId` and one generation, disposed at session close.                                                                                       |
| Rich streaming     | Incremental delivery of agent output as Markdown, Diff, or ToolCard `Scene` fragments with damage tracking.                                                                                           |
| Tool Bus           | Capability-checked dispatch surface where agent tool calls are validated, consented, and forwarded via the MCP adapter.                                                                               |
| bitty-ai           | Candidate independent AI sub-platform repository (Rust workspace plus Lua AI plugins) built only on generic Bitty primitives; not Core.                                                               |
| Bridge             | Candidate scoped-IPC process boundary between the Bitty host and the bitty-ai runtime; never an in-process native load.                                                                               |
| Pressure-test gate | Candidate architecture rule: bitty-ai must build on generic primitives, so a new Core AI-specific API demand signals a Plugin API abstraction gap.                                                    |

## Related specifications

These draft elaborations accept no new mechanisms. “Extends” describes a topic relationship, not accepted authority. The historical post-1.0 scope of this terminal-facing architecture does not decide standalone AI release requirements (local AIQ-5C).

- [Context Management Architecture](../context/context-management.md) (Draft): Session journal model, context view projection, and multi-level compression pipeline. Extends CP-5, CP-6, CP-7.
- [Command and Tool Architecture](command-tool-architecture.md) (Draft): Core versus Lua boundary, slash command registry, and tool runtime separation. Extends Tool Bus (TB-1..TB-3).
- [Agent Coordination Architecture](../agent/agent-coordination.md) (Draft): Multi-agent workspace services, supervision, teams, delegation, and panel lifecycle under AG-4 (Least privilege at dispatch) and AG-5 (Orchestration versus execution).
- [Code Intelligence Architecture](../agent/code-intelligence.md) (Draft): LSP sharing, stateful mediation, verification fingerprinting, and lint/build/test reuse. Extends agent-coordination service supervision.
- [Persistence and Evidence Architecture](../persistence/persistence-evidence.md) (Draft): Journal representation, execution evidence, projection, optional indexing and replay. Backend and standalone release scope remain unresolved.

## ModelProvider

Status: **proposed contract**. Numbered for reference; none is implemented by this RFC alone. The provider boundary — Core-owned contract versus plugin-owned integrations, transport taxonomy, aliases and routing inputs, fallback, budget and usage-accounting semantics, streaming abstraction, provider-independent errors, and the secret invariant — is owned by [Provider plugin boundary](../providers/provider-plugin-boundary.md). The mandates below stay in force at the architecture level.

### Ownership and registry

- **MP-1 Registry ownership.** `ai.model` registry is host-owned and host-validated. Provider plugins register via `services.provided: ai.model` declaring a versioned interface; the host validates `provider_id`, `privacy_class`, and `capabilities` before registration and rejects ambient or undeclared registration. Plugins and project configuration that do not provide `ai.model` may request models but may not mutate capability metadata or bypass the registry. Registry implementation and provider I/O belong in the independent AI helper, never in terminal Core, with Lua reaching them only through a narrow `ai.model` host API under the same capability discipline as other privileged services; the exact registry split and owning crates remain draft choices under the R1 disposition.
- **MP-2 Provider descriptor.** Each provider entry records `provider_id` (bounded `owner.name`, `<= 64` bytes, `^[a-z][a-z0-9_-]*$`), transport kind (`local`, `remote`), `models[]`, per-model `capabilities` (text, streaming, tool-use, vision), `context_window`, `cost_marks`, and `privacy_class` (`local-only`, `network-minimized`, `upload-notice`). Unrecognized fields fail closed; descriptor entries are declared by provider plugins and validated by the host. The descriptor shape is owned by [Provider plugin boundary](../providers/provider-plugin-boundary.md#core-owned-surface).
- **MP-3 Local-first default.** No network call exists until the user selects a provider whose `privacy_class` permits it and the corresponding network capability (`network.connect`) is granted. A provider marked `local-only` never performs network I/O.

### Operations

Operation semantics are owned by [Provider plugin boundary](../providers/provider-plugin-boundary.md#core-owned-surface); the mandates below stay in force.

- **MP-4 `list_models`.** `ai.model.list_models()` returns the registry snapshot filtered to models compatible with the caller's granted scopes; no secret material is returned and API keys are never inline.
- **MP-5 `complete`.** `ai.model.complete({ model, messages, context_refs, tools })` executes one synchronous turn; `model` must name a registry-known model, `messages` is bounded by the resolved CP-5 context budget (the `32 KiB` candidate default), `context_refs` enumerates Stable Ids resolved server-side, and `tools` enumerates Tool Bus names validated against caller consent; a request that would exceed the budget fails at the boundary with a typed `BudgetExceeded` before provider I/O.
- **MP-6 `stream`.** `ai.model.stream({ model, messages, context_refs, tools })` returns a chunked `StreamHandle` of Rich streaming fragments (`Markdown`, `Diff`, `ToolCard`) at most `256 KiB` decoded bytes under RC-10 chunking with `seq`/`total`/`final`; backpressure sheds oldest buffered chunks with a countable metric, and request/response acknowledgement has no silent loss.
- **MP-7 `cancel`.** Proposed `ai.model.cancel(handle)` is idempotent: abandon the provider request, drop buffered chunks, count cancellation, and prevent further dispatch; cancellation may be requested at any chunk boundary. Pre-dispatch, incomplete streamed tool arguments and cancelled proposals cause no tool effect; post-dispatch, request cancellation of owned execution but report completed effects or `Unknown` and reconcile before retry — cancellation cannot roll back already-started effects, and one waiter's cancellation never stops shared work needed by another authorized waiter.
- **MP-8 Deterministic timeouts.** Every provider call carries caller `now_ms` and observes `DEFAULT_REQUEST_TIMEOUT_MS = 5 s`, `DEFAULT_MCP_TIMEOUT_MS = 10 s` for tool-mediated streaming, and hard ceiling `MAX_REQUEST_TIMEOUT_MS = 30 s`.

### Budgets, cross-RFC sharing, and redaction

- **MP-9 Budget sharing.** ModelProvider I/O is charged against the same per-client quotas as IPC/MCP: frame `256 KiB`, buffered bytes `512 KiB`, channel caps, concurrency `16`, and RC-9/RC-10; no separate model-specific RC is introduced.
- **MP-10 API-key handling.** Provider credentials are stored in user-only storage (mode `0600`), never in `BITTY_*` environment, discovery files, trace files, or `AgentWorkspace`; they are redacted by typed `SecretField` before any diagnostic, trace, or snapshot and require a dedicated `ai.provider` consent distinct from `ai.stream` and Tool Bus scopes. Invariant 9 and P0-AC-026 apply whole; the secret invariant is owned by [Provider plugin boundary](../providers/provider-plugin-boundary.md#secret-invariant).
- **MP-11 Failure isolation.** A fault in one ModelProvider call affects only its owning session; sibling sessions, terminals, and plugin VMs remain responsive (FS-3 containment parity with [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) FS-IP3).

### Provider configuration and credential references (candidate)

Status: **candidate, non-normative**. This subsection extends MP-10 without changing it. The configuration shape and transport kinds are architecture-level candidate statements below; the secret invariant and transport taxonomy are owned by [Provider plugin boundary](../providers/provider-plugin-boundary.md), whose Model Manager and configuration surface remains an owner-pending `bitty`-side handoff item ([Bitty-side handoff](../providers/provider-plugin-boundary.md#bitty-side-handoff-not-a-decision)), not a settled owner. Unresolved parts stay tracked as [OQ-054, OQ-055](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md), and the storage tiers are recorded in the [Plugin Roadmap](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/product/plugin-roadmap.md) secrets direction. Mandates that stay in force:

- **MPC-1 Provider entries.** Candidate configuration shape: `ai.providers.<id>.kind = openai_compatible | anthropic | ollama`, each with an optional `base_url`, `models[]`, and privacy class; `openai_compatible` covers self-hosted and local servers, `ollama` is the local-only default, and `anthropic` is a remote provider. Provider kinds are transport adapters, never capability grants: a remote kind still requires the accepted `network.connect` grant and `ai.provider` consent, and a `local-only` provider performs no network I/O (MP-3).
- **MPC-2 Credential references, never inline keys.** Providers declare `api_key_env` (host-allowlisted environment variable name) or `api_key_cmd` (argv whose stdout is the secret) rather than inline keys; a literal key value fails validation, resolution is host-side, and Lua, plugins, diagnostics, and traces never receive the value (MP-10, ADR 0006).
- **MPC-3 Resolution order and project overrides.** Explicit user or CLI selection wins over profile configuration, which wins over project-level selection; a project may select among already-granted providers and models but may not introduce a credential reference, raise a `privacy_class`, or enable an unconsented provider, and violations fail closed with a source-attributed diagnostic.
- **MPC-4 No implementation claim.** No provider configuration, keyring, or `secrets.env` path is implemented today; `bitty-agent` owns no LLM I/O and no API-key handling, and `bitty-config` has no provider schema. Candidate host kernels for the credential side landed in `bitty` CTX-0711/#1304 (in `origin/main` at `c01f538`, read-only inspection): `crates/bitty-plugin-host/src/credential_ref.rs` (candidate `api_key_env` vs `api_key_cmd` semantics, OQ-054, reference data only — no resolution) and `secret_tiers.rs` (candidate storage-tier descriptors, OQ-055, no I/O). They are Implemented-only evidence: OQ-054/OQ-055 stay open.
- **MPC-5 Wire protocols and provider presets (candidate; provider-ownership clause superseded).** Vendor HTTP, local-endpoint, subscription/CLI, and aggregator/router adapters, model discovery, and OAuth belong to provider plugins; Core owns the contract, descriptors, capabilities vocabulary, registry protocol, selection and routing, fallback, budget accounting, streaming abstraction, and provider-independent errors (the Core-owned surface is itemized in [Provider plugin boundary](../providers/provider-plugin-boundary.md#core-owned-surface)). Architecture mandates retained here: transport, connection pooling, timeout, redirect, proxy, chunked bodies, and SSE framing belong to a provider adapter, never to the std-only runtime kernel ([Dependency Strategy](../providers/dependency-strategy.md#kernel-principle-std-only-runtime-with-dependency-inversion)); ordered fallback policy is Core-owned with request-level retry in the adapter; credential resolution happens behind opaque handles (MP-10/MPC-2); the CP-5 budget gates every request before provider I/O; and every tool effect, native or MCP, passes the unified authorization backend's caller/target/consent/schema validation ([Tool transport R2](tool-transport-r2.md#unified-authorization-backend)). Kept from this entry (no owning document yet): the candidate wire shapes `openai_compatible` (`POST /v1/chat/completions`, covering OpenAI, OpenRouter, DeepSeek, Groq, Ollama, vLLM, and compatible local gateways), `anthropic_messages` (`POST /v1/messages`), and `gemini_content` (`POST /v1beta/models/{model}:generateContent` and `:streamGenerateContent`) remain candidate protocols a provider adapter may implement, and Core must not accumulate vendor-specific branches. Provider presets are declarative Lua data (`ai.register_provider(id, entry)`), so renames, base-URL changes, custom headers, and private gateways never require a Rust rebuild; presets cannot widen consent or capability, and Lua owns presets, Agent roles, prompt assembly, conversation trees, slash commands, and card UI. Tracked as [OQ-080](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
- **MPC-6 `bitty-ai` distribution boundary (candidate).** `bitty-ai` is an independently installed and versioned plugin and repository (Rust workspace plus a Lua front end), not a bundled Core feature; Core keeps only the neutral `bitty-agent` protocol skeleton and the `bitty-mcp` adapter so users who prefer external harnesses (for example Claude Code, Hermes Agent, or others) pay no AI weight or supply-chain surface and can still run `bitty-ai` standalone or headless (archival note 2026-09-14: `bitty-mcp` was archived and its MCP tool-surface functionality is covered by `bitty-ai`; the adapter boundary needs re-evaluation under OQ-081), and installing the plugin yields the full experience through the same manifest, capability, and lazy-trigger path as any other plugin. The candidate official `bitty-ai-providers` preset plugin (MPC-5) ships the common provider entries without widening consent or capability. Tracked as [OQ-081](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

## ContextProvider

Status: **proposed contract**.

### Provider set

| Provider      | Source                                                                                     | Privacy class default  | Consumed by                                                                        |
| ------------- | ------------------------------------------------------------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------- |
| `workspace`   | User workspace metadata (open paths, editor selections where available)                    | `local-only`           | agent turn context                                                                 |
| `project`     | Project declarative config plus trusted project manifest data, never project Lua execution | `local-only`           | context budget assembly                                                            |
| `git`         | Bounded `git status`, diff stat, recent log subjects, branch name, no raw blobs by default | `local-only`           | context budget assembly                                                            |
| `diagnostics` | Bounded diagnostics from `bitty-lua`, `bitty-config`, and host (`syntax`, `validation`)    | `inspect`              | context budget and trace preview                                                   |
| `terminal`    | Bounded terminal snapshot or semantic-zone-scoped scrape, flagged `is_untrusted_surface`   | `untrusted` / redacted | agent observation via [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) path |

No other provider exists in v1. Adding a provider requires a reviewed amendment to this RFC; plugins may not implicitly register or replace host-owned providers. A future plugin may provide a versioned, capability-checked service consumed by `CodeContextProvider`, but that service does not register or replace the provider.

### Stable Id hierarchy

- **CP-1 Hierarchy.** The stable hierarchy is `Instance` (running Bitty process) -> `Window` (top-level platform window) -> `Workspace` (logical tab or workspace container) -> `View` (viewport onto a Terminal) -> `Terminal` (PTY-backed grid). Each level carries a typed Stable Id (`instance_id`, `window_id`, `workspace_id`, `view_id`, `terminal_id`) that survives restarts where the underlying platform permits, is unique within its parent, and is validated at construction (bounded `<= 64` bytes, `^[a-z0-9_-]+$`).
- **CP-2 Addressing.** Context resolution is always explicit: a request names one or more Stable Ids; no ambient `current terminal` is inferred beyond the explicit selection precedence already accepted in [IPC and Agent RFC](../specifications/ipc-agent-rfc.md). Forged identifiers without the corresponding transport authentication and capability grant still fail closed at the server-side scope check.
- **CP-3 Attribution.** Every context record carries `owner` (Stable Id path), `generation`, `collected_at` (`now_ms`), and `provider` name, so enforcement, consent revocation, and traces can attribute exactly which terminal or workspace contributed which bytes.
- **CP-4 Cross-level consent.** Terminal-scoped context requires `agent.context.terminal` consent scoped to that `Terminal`; workspace-scoped assembly requires `agent.context.workspace`; cross-window or cross-instance assembly requires the target scope plus an explicit per-target grant. There is no bundled `all` grant that silently implies sibling terminals.

### Context budget and request contract

The context subsystem — session journal, context view projection, multi-level
compression pipeline, and retention policy — is owned by
[Context management architecture](../context/context-management.md) and
[Context retention R3](context-retention-r3.md); stable-prefix ordering and
epoch boundaries are owned by
[Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md);
the Context Request v1 split boundary, including the request shape and counted
truncation fields, is owned by
[RFC-split readiness](../integration/rfc-split-readiness.md#context-request-version-1).

- **CP-5 Budget.** Context is bounded token-first. The caller states `ContextRequest { max_tokens: Option<u32>, max_bytes: Option<u64>, current_generation: u64 }`; the host resolves it against the model context window, the per-turn token and cost budget, freshness, and each record's priority before any provider I/O leaves the machine. Byte counts alone are not a sound universal bound (equal byte budgets differ widely in tokens across scripts, code, JSON, and base64), so the `32 KiB` default remains a candidate profile under OQ-066 rather than a core contract. Excess truncates per provider in declared priority order (diagnostics and terminal semantic-zone text first, project and git last), with counted `truncated_tokens`/`truncated_bytes` and `truncated_providers[]`. Assembly binds to `current_generation` (`AG-2`) and fails closed before any artifact-store mutation: duplicate turn-scoped record ids raise `ContextError::DuplicateRecordId` and any record generation other than `current_generation` raises `ContextError::StaleGeneration`, so rotated-out context never leaks into a new turn.
- **CP-6 Artifacts.** Providers return `ContextArtifact { summary, structured metadata, references, chunks, provenance }`; a caller may drill down with `expand(context_id, section)` under the same consent, budget, attribution, and untrusted-surface rules rather than receiving an unbounded dump by default. Delivery stays RC-10 chunked (`256 KiB` ceiling) as `seq`/`total`/`final`, and per-client quotas (RC-9 sharing) keep a hostile peer's large request from blocking a benign peer's assembly.
- **CP-7 Determinism and testability.** Context assembly is deterministic for a given `now_ms`, provider snapshot, and Stable Id set; headless tests supply a seeded `now_ms` and in-memory provider snapshots, and no wall-clock, filesystem, or network I/O enters the `bitty-agent` budget computation.
- **CP-5 request-field disposition (after `AI-0061`).** The experimental `bitty-ai` slice at merge `f3223dd` narrowed `ContextRequest` to `max_tokens`, `max_bytes`, and `current_generation`, removing the former request fields `priority: ContextPriority` and `detail: DetailLevel`; truncation order now reads each record's own `priority` on `ContextRecord` (untrusted records clamp to at most `ContextPriority::Normal`), and `DetailLevel` is retained only as reserved CP-5 vocabulary for a planned retrieval-depth signal that has no assembly reader. This is review evidence, not acceptance: it accepts no mechanism, leaves the `32 KiB` candidate profile (OQ-066) unchanged, and whether the removed request fields return to the accepted shape remains a draft choice. The split boundary and evidence bar for this shape are owned by [RFC-split readiness](../integration/rfc-split-readiness.md#context-request-version-1).

### Semantic zones

Zone records (`SemanticZone`, `BlockAnchor`, `line_id` anchoring) are owned by the accepted [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md) under OQ-007; the architecture mandates below stay in force.

- **CP-8 Zone source.** Semantic zones are the authoritative terminal-state boundaries produced by the terminal state machine, derived from OSC 7 (cwd) / OSC 133 (prompt/input/command/output) marks. The ContextProvider does not parse PTY bytes to invent zones; it consumes the core-owned `SemanticZone` records.
- **CP-9 Zone-scoped context.** Terminal context may be requested as `zone: Prompt | Input | Command | Output` with an optional `line_id` range; the provider returns only bytes within that zone, truncated at zone boundaries, so a model never receives unbounded scrollback as an implicit default. Full-scrollback or alternate-screen scraping is denied unless the caller holds an explicit `terminal.inspect` plus a per-generation `terminal.raw` elevation and an attributed consent record.
- **CP-10 Rendering separation.** Zone-scoped text is delivered as bounded `TerminalSnapshot` or `TerminalOutput` with `is_untrusted_surface = true` per [IPC and Agent RFC](../specifications/ipc-agent-rfc.md), preserving the untrusted-observation labeling and T-10/R-013 defenses; the host policy enforces that this data never mixes into instruction or policy channels, and string-sniffing inside the agent crate is not relied upon.
- **CP-11 Command store, not render residency.** Command blocks, stdout/stderr text, OSC 133 metadata, timestamps, exit status, and zone records are core-owned semantic state held in CPU or persistent storage; the GPU holds only visible glyph caches, atlases, vertex buffers, and render surfaces and is never the state store. Terminal context is served from a bounded command-store API (`terminal.commands.list/get/output/summary/errors`) under the same consent and budgets, which is the intended agent surface instead of scraping a whole buffer or a render target.

## Agent

Status: **proposed contract**.

### Four levels

Levels are attenuated authority tiers. Each higher tier includes the lower tiers' read authorities but requires a separate consent grant for its write surface. There is no bundled `all` upgrade that bypasses per-tier consent.

| Level       | Authority (least to most)                                                                                                                                                                                      | Typical caller         | Example effects permitted                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| `inspect`   | Read workspace, project, git, diagnostics, and zone-scoped terminal snapshots; list models and list tools                                                                                                      | any agent              | viewing context, calling `list_models`, listing tool specs                       |
| `self`      | `inspect` plus ephemeral `AgentWorkspace` read and write, `complete`/`stream`/`cancel` on granted models                                                                                                       | single-session agent   | editing only its own `AgentWorkspace` files, driving a proof or scratch task     |
| `workspace` | `self` plus read and write within the current `Workspace` working directory, through capability-checked host APIs                                                                                              | workspace-scoped agent | editing project files within the current workspace, running workspace tools      |
| `all`       | `workspace` plus cross-workspace and cross-window actions through separate per-target consent and distinct scopes; `terminal.input.all` / `terminal.manage` remain separate scopes requiring their own consent | privileged operator    | acting across workspaces, modifying distribution or global policy (still scoped) |

Rules:

- **AG-1 Default.** A fresh `(UID, AgentId)` session starts at `inspect` only, matching the read-only Agent default already accepted in [IPC and Agent RFC](../specifications/ipc-agent-rfc.md). Elevation to `self`, `workspace`, or `all` each requires a separate per-client consent grant recorded in the consent ledger.
- **AG-2 Generation binding.** Agent levels are bound to `(PluginId, generation)` or `(AgentId, generation)` per [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md) generations. A suspend/dispose/reload invalidates prior elevation; re-grant requires a fresh prompt.
- **AG-3 No ambient trust.** Level checks are server-side on every request from the authenticated identity. A client that inserts a `level` field cannot escalate; the server ignores it and evaluates the real consent ledger.
- **AG-4 Least privilege at dispatch.** Each `ToolCall` is authorized against both the caller's Agent level and the tool's required scope. A `workspace` level does not imply `terminal.input.all` / `terminal.manage`, `debug.control`, `config.modify`, `plugin.manage`, or `process.spawn`; `terminal.input.all` / `terminal.manage` remain separate scopes requiring their own consent grant. Those each require their own scope plus consent.
- **AG-5 Orchestration versus execution.** Lua policy owns orchestration: model choice, strategy, tool list, and turn limits. The host owns execution semantics: cancellation, timeouts, token and cost accounting, tool-permission enforcement, concurrency, backpressure, retry, streaming lifecycle, resource quotas, audit logging, and the execution state machine. A plugin loop that repeatedly drives generation cannot escape host control.

**See also**: [Agent Coordination Architecture](../agent/agent-coordination.md) for multi-agent teams, delegation patterns, and evidence-based coordination.

### AgentWorkspace

- **AW-1 Ephemerality.** Each `AgentSession` that holds `self` or above receives one `AgentWorkspace`, an ephemeral per-session directory created on demand, isolated to that `(AgentId, generation)`, and removed at session `Completed`/`Failed`/`Canceled` or on explicit `dispose`; no other session, plugin, or generation can address it.
- **AW-2 Scoping.** The workspace is addressable only through narrowly scoped host APIs (`workspace.read`, `workspace.write`, `workspace.list`) that validate the target path stays within the ephemeral root; absolute paths, directory traversal, and sibling-workspace access fail closed with `Denied/ScopeViolation`, and the path never appears in `BITTY_*` environment, discovery files, or traces unless redacted.
- **AW-3 Budget and isolation.** An `AgentWorkspace` obeys the same isolation philosophy as per-plugin isolation: bounded size (`256 KiB` default per workspace, evict oldest with attributed drop), no ambient filesystem authority, and FS-3 containment — a fault or exhaustion affects only the owning session.
- **AW-4 Safe-mode.** `bitty --safe` starts with no `AgentWorkspace`, no third-party provider, and no tool dispatch, matching P0 invariant 10 and FS-IP6 parity.

## Rich streaming

Status: **proposed contract**.

Streaming delivers incremental agent output into the presentation model without inventing a second rendering path; it reuses the scene contracts already accepted in [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md), which owns fragment-to-scene composition, snapshot, damage, indexing, and accessibility semantics. The architecture mandates stay:

- **RS-1 Fragment kinds.** Each streamed chunk carries one fragment kind: `Markdown` (versioned block, selectable, searchable), `Diff` (unified diff with bounded per-hunk text, anchored to a `BlockAnchor`), or `ToolCard` (typed tool-result card with bounded title, status, and key-value rows). `Markdown` is the default; `Diff` and `ToolCard` are used only when semantic anchoring is available.
- **RS-2 Scene integration.** Every fragment maps to a `RichBlock` and `Scene` subtree owned by `bitty-rich` and consumed by `bitty-render`, with composition, snapshot, damage tracking, semantic indexing, and the accessibility tree exactly as accepted; no fork of those contracts.
- **RS-3 Incremental damage.** Streaming emits `Scene` damage per chunk, at most one `RichBlock` dirty per chunk, so renderer work scales with changed content; no chunk triggers a full scene recompute.
- **RS-4 Selection, search, and a11y.** Fragments remain selectable, searchable, and accessible once composited, matching the Rich Presentation guarantees for every `RichBlock`; anchoring uses `SemanticZone` line ids where available.
- **RS-5 Chunking and attribution.** Chunks obey RC-10 (`256 KiB` decoded bytes, `seq`/`total`/`final`); reordering or loss is detectable via `seq`, and budget accounting attributes every chunk to its `(AgentId, StreamHandle, generation)`.
- **RS-6 No hot-path execution.** Rich streaming never runs synchronously inside the parser, render, or input hot paths; it is a cold-path composition that posts damage, preserving P0-AC-015 and invariant 4.

## Comparative positioning versus existing agent harnesses (direction, non-normative)

Status: **direction, non-normative**. This section records the comparative positioning from the originating analysis (message m0481). External products are grouped and summarized at a high level from public product behavior; they are not audited or benchmarked here, and no claim is made about their internals. The Bitty column lists candidate differentiators to validate, not shipped capabilities.

| Family                          | Examples                                   | Working shape                                                                                          | Candidate Bitty contrast                                                                                                     |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Terminal-stream CLIs            | Claude Code, Codex CLI, OpenCode, pi-agent | Agent loop runs in a TUI or stream attached to one project session; tools execute in the same terminal | Agents live in panels/views beside real PTYs; the terminal remains a terminal and agent surfaces are optional plugin content |
| IDE-embedded assistants         | GitHub Copilot, Cursor, Kiro               | Agent is bound to an editor surface and its file/selection model                                       | Bitty is terminal- and compositor-native; there is no editor host dependency                                                 |
| Autonomous or background agents | Hermes Agent, OpenClaw                     | Long-running processes act without a spatial, reviewable session surface                               | Bitty direction is spatial and reviewable: role panels, per-role capability, generation-scoped consent                       |
| Closed cloud terminals          | Warp                                       | Block abstraction, split panes, account-coupled routing; implementation is proprietary and cloud-bound | Bitty keeps Terminal Truth local, tiles in-process, and treats model providers as replaceable plugins                        |

Candidate Bitty differentiators, each needing its own evidence before any claim:

- **Spatial multi-agent orchestration** — durable roles as panels connected by a bounded IPC event bus (below), instead of one transcript per task.
- **Local-first posture** — no network call exists until a provider and grant permit it (MP-3); the terminal core has no account coupling.
- **Terminal Truth is non-invasive** — observation and projection surfaces (semantic zones, rich blocks, hints, folds) consume committed state and never write it; only `Action` values write terminal state.
- **Native tiling** — a working dwindle-style split baseline plus floating overlays, with scratchpad and ribbon directions tracked separately in the [UI and Compositor Gap Analysis](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/ui-compositor-gap-analysis.md).
- **Open provider and tool surfaces** — `ai.model` registry, open provider kinds, and MCP as an adapter rather than an internal protocol.

The strategic framing is a candidate one-line identity: an existing
terminal-hosted coding agent is a _coding agent inside a terminal_, while the
Bitty direction is _a terminal that natively understands agents, tools,
executions, tasks, and context_. Candidate attributes to validate are
execution-aware, context-efficient, spatially observable,
capability-controlled, human-interruptible, multi-agent native, and
evidence-preserving. No token-reduction percentage is an accepted target: the
recorded `ctxctl` measurements are tool-level observations, and a full-pipeline
claim needs a benchmark before any number is used. The unifying candidate
principle is **give the model the minimum sufficient context while preserving a
path back to complete evidence** ([OQ-059](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md), [OQ-062](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md),
[OQ-065](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)).

**Candidate coupling reading (scope note):** the differentiators above are read
as a structural claim about how an agent couples to the runtime — lifecycle,
observation, action, and presentation — in
[Wheel-to-runtime coupling (candidate)](../specifications/wheel-to-runtime-coupling-candidate.md);
that page gathers these directions into one coupling view and adds no
differentiator here.

### Warp comparison dimensions (candidate)

Status: **direction, non-normative**. The closed-cloud-terminal row above is
expanded here into the dimensions that matter to this draft. The Warp
description follows the public-product observation recorded in the
[Reference Project Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/reference-projects.md)
(from [Warp documentation](https://docs.warp.dev/); no local snapshot, not
audited) and makes no claim about its internals.

| Dimension         | Warp (public product behavior)                                                  | Candidate Bitty direction                                                                                |
| ----------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Product shape     | Terminal plus a built-in IDE surface set: agent, file tree, editor, LSP, review | Small terminal core plus capability-gated plugin surfaces; agent experiences are plugin content          |
| Execution model   | Block abstraction with split panes                                              | Core-owned OSC 133 semantic zones over Terminal Truth; block-like views are projections                  |
| Extension surface | Built-in surfaces, not a third-party panel/application API in the observation   | Generic Plugin API, Panel Runtime, and capability contracts; first-party and community share one surface |
| State and account | Product-managed state with account-coupled routing                              | Local-first: Terminal Truth stays local, no account coupling, providers replaceable (MP-3)               |
| Agent integration | Built-in agent mode                                                             | Host-owned `ai.model` registry, Tool Bus, per-role capability, frozen session snapshots                  |
| Multi-agent shape | Not a public contract in the observation                                        | Spatial role panels over the IPC event bus as a candidate (SMO-1..SMO-4)                                 |
| Evidence path     | Internal product behavior                                                       | Candidate evidence and provenance direction (OQ-065)                                                     |

Honesty boundary: `bitty-agent` is a draft crate with no LLM I/O, no provider transport, and no API-key handling; `crates/bitty-runtime/src/ai_panel.rs` is bounded registry/context evidence, not a working agent. Nothing in this section is a shipped differentiator today.

## Platform stack: Bitty, bitty-ai, and CarryCtx (candidate)

Status: **direction, non-normative**. The candidate platform separates three
concerns: CarryCtx as the durable lifecycle layer, `bitty-ai` as the agent
runtime layer, and Bitty as the spatial execution and presentation layer.

```text
CarryCtx  (durable lifecycle layer)
  task graph, dependencies, scopes, sessions, worktrees, checkpoints, handoffs
        | bounded task/checkpoint projection (CLI or MCP-style adapter)
bitty-ai  (agent runtime layer)
  providers, context assembly, tool loop, delegation, budget and evidence records
        | scoped IPC event bus and capability checks (Bitty host)
Bitty terminal  (execution and presentation layer)
  PTY and semantic zones, compositor panels, focus, human input, rich presentation
```

Three candidate rules extend
[CarryCtx as the durable task layer](#carryctx-as-the-durable-task-layer-candidate)
without changing it:

- The stack is an architecture picture, not a dependency chain: `bitty-ai` must
  run standalone (for example headless) with no CarryCtx installation.
- CarryCtx integration is a candidate backend behind narrow store traits
  (`TaskStore`, `MemoryStore`, `WorkspaceProvider`, `CheckpointStore`) with
  in-memory, file, and CarryCtx implementations; Bitty + CarryCtx is the
  fullest experience, not a required one.
- The state projection flows inward only: task and checkpoint data inform
  context; nothing in the stack grants capability or self-accepts a review.
  Tracked as [OQ-060](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### Native agent services and tool projection (candidate)

Status: **direction, non-normative**. This extends the platform stack above:
CarryCtx and `ctxctl` are design references that validated useful abstractions
(durable tasks, dependency gating, scoped worktrees, context slicing,
evidence), not runtime dependencies Bitty should shell out to. A candidate
decomposition keeps each concern an in-process service rather than a CLI
wrapper — Task Service (create, assign, depend, block/unblock, complete, ready
query), Agent Service (spawn, stop, delegate, message, inspect), Workspace
Service (worktree, snapshot, overlay, isolation), Context Service (repository
index, symbol index, memory, checkpoints), and Evidence Store (command
execution, diff, diagnostics, agent artifacts). The agent-facing tools are
projections of these services (`task.create`, `task.ready`, `agent.delegate`,
`workspace.diff`, `context.symbol`, `exec.run`, and similar), and a CLI
surface is a second projection over the same Rust service core; the AI must
not call the CLI to reach a service, and the CLI does not own behavior the
service lacks. Candidate rules:

- **NAS-1 One service core, several projections.** Tool exposure and CLI exposure are thin, capability-checked projections of the same services, so behavior, attribution, and bounds cannot drift between them. A CLI-only feature the tool surface cannot reach, or a tool-only path that bypasses the CLI contract, is a design defect rather than a differentiator.
- **NAS-2 Process boundaries exist for isolation, not for capability.** An external helper process is chosen when a trust boundary or fault containment requires it (per the bridge direction below), never merely to reuse a CLI; the model-facing task surface remains in-process and typed.
- **NAS-3 External managers remain integration targets.** A CarryCtx or `ctxctl` adapter stays a candidate backend behind the store traits above ([OQ-060](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)), so projects already using them can project their state in while the native services remain usable without any external installation.

No native task, agent, workspace, context, or evidence service exists today;
`bitty-agent` remains a bounded message and tool-description crate with no LLM
I/O, and the `ctxctl` measurements remain tool-level observations. Task
lifecycle authority is owned by [Task lifecycle R5](task-lifecycle-r5.md);
cross-repository handoff scope is owned by
[bitty-side integration input](../integration/bitty-side-integration-input.md).
Tracked as
[OQ-067](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

## Candidate runtime contracts (candidate)

Status: **candidate, non-normative, post-v1.0**. The following contracts
organize possible future Agent Runtime work. They are design candidates, not
implementation claims, API commitments, or new authority. They must not be
read as closing an open question, creating a daemon, or changing the accepted
IPC, plugin, isolation, CLI, or security contracts above. Any adopted version
must receive its own review and verification evidence.

### Extension-point layering and Capability Layer as unmerged candidates (candidate)

Status: **candidate, non-normative**. Two unmerged layering candidates stay
candidate inputs with the merge decision explicitly deferred: the
[plugin and extension model candidate](../specifications/plugin-extension-model-candidate.md)
(typed extension points, manifest-declared host dependence resolved at install
time, permission non-inheritance, per-domain versioned service APIs; its
native-versus-framework split stays its weakest claim) and the
[IPC extension boundary candidate](../specifications/ipc-extension-boundary-candidate.md)
(`bitty-ai` as an out-of-process daemon on the IPC side of Core, a Capability
Layer with Lua, IPC, and CLI frontends over one capability model, IPC-native
permission enforcement, and Agent/Panel lifecycle separation over IPC). Both
stack native primitives at the bottom, a framework or host-plugin middle, and
extension plugins on top; capabilities are mediated between layers rather than
inherited, an extension attaches only through a declared, reviewable seam, and
its relationship to a powerful host confers no capability by itself. Method,
event, manifest, and capability names in both designs are discussion
vocabulary, not accepted schemas or protocols.

Settling whether the two layerings merge, coexist, or one is dropped needs
named evidence: an owner for each layer, a packaging contract, a versioning
and compatibility policy, and IPC transport maturity sufficient to carry the
Capability Layer enforcement claims. The accepted
[IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and
[provider plugin boundary](../providers/provider-plugin-boundary.md) are unaffected by this
comparison.

### Progressive discovery

The candidate `DiscoveryProvider` gives the Agent a bounded index before it
loads content. A conceptual shape is `list()`, `describe(id)`, `resolve(id)`,
and `load(id, fragment)`, with every result bounded, attributed, and filtered
by policy before it reaches a model. The same pattern may serve a
`ToolCatalog`, `SkillCatalog`, `ContextCatalog`, `MemoryCatalog`,
`DocumentationCatalog`, and MCP catalog:

```text
discover -> describe -> explicitly resolve -> load a bounded fragment
```

Discovery must not execute a plugin, project instruction, script, or package.
It may enumerate declared metadata, but activation and privileged reads remain
host-mediated. A candidate `SkillProvider` could expose user, project,
plugin-provided, or remote skills as metadata first, then load `SKILL.md` and
selected `references/`, `templates/`, `examples/`, or `assets/` on demand.
Generated or self-improving skills are not a core behavior; a future plugin
would need separate `skill.propose` and `skill.write` consent.

### Context planes and memory temperature

Status: **candidate, non-normative**. The `ContextProvider` candidate set
classifies into three separate planes, whose retention, selection, and
retrieval mechanics are owned by
[Context management architecture](../context/context-management.md) and
[storage, memory, and export design](../persistence/storage-memory-export-design.md):

| Plane               | Candidate contents                                                                       | Owner distinction                                                          |
| ------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Environment Context | terminal, workspace, git, diagnostics, and execution-target observations                 | `ContextProvider`; current bounded state                                   |
| Knowledge Context   | skills, project instructions, `AGENTS.md`, documentation, and declared provider metadata | `SkillProvider`/instruction or documentation providers; selected knowledge |
| Temporal Context    | current working memory, conversation history, and prior-session search                   | `MemoryProvider` and history provider; time-indexed state                  |

`ContextProvider` is not `MemoryProvider`, and neither is `SkillProvider`;
their records, consent, freshness, redaction, and storage policies remain
distinct even when a `ContextEngine` assembles them for one turn. Small,
curated **hot memory** is explicitly approved, bounded, and stable for a
session, while complete conversation history remains searchable in a durable
store and is retrieved only when requested by the task and permitted by
policy; history search is not an excuse to inject an unbounded transcript.

### Frozen sessions and instruction epochs

Status: **candidate, non-normative**. At session creation, a future
`AgentSessionSnapshot` may freeze the selected `model`, `execution_profile`,
instruction sources and hashes, approved memory, skill metadata, and workspace
context. A session generation consumes that snapshot rather than silently
rebuilding its system prefix after every write; changes to memory,
configuration, skills, or project instructions take effect at a later
generation by default. A candidate `InstructionEpoch` identifies the
instruction snapshot used by each turn, including source hashes, so replay,
audit, debugging, and evaluation can establish what rules were visible at that
time; explicit invalidation may begin a new generation but must not mutate an
already-started turn. This preserves prompt-cache stability while remaining
subordinate to host policy, consent revocation, and emergency shutdown: a
security revocation is not deferred merely to preserve a cache. Epoch
boundaries and stable-prefix ordering are owned by
[Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md);
prompt layer composition is owned by
[Prompt Layering Design](../context/prompt-layering-design.md).

### Context engine and recovery

Status: **candidate, non-normative**. The candidate `ContextEngine` owns
model-context lifecycle rather than durable conversation storage, with
conceptual operations `observe_usage`, `should_compact`, `compact`, and
`recover`. Compaction is not deletion: it may produce a bounded summary and
identifier-preserving digest while retaining paths, revisions, error strings,
user messages, and a `RecoveryPointer` into the historical store, and the
pointer is a retrieval reference, not permission to read history. Candidate
engines may include summarization, provider-native compaction, lossless
retrieval, RAG, or a CarryCtx adapter. Storage and active context must remain
separate so compaction cannot rewrite the source of record and a storage
failure cannot produce unbounded model input, and provider-native features are
selected only after capability negotiation and host policy checks. The
session/context separation, compression pipeline, and compaction boundaries
are owned by
[Context management architecture](../context/context-management.md); durable
journal, replay, and backend selection by
[Persistence and evidence architecture](../persistence/persistence-evidence.md)
and [Persistence profile R6](persistence-profile-r6.md).

The `CP-5` budget resolves token-first; the `32 KiB` byte default remains a
candidate profile (OQ-066). A candidate refinement parameterizes the budget
per model profile (small-context through future long-context models) while
keeping that default, and attaches per-item metadata — source, freshness,
priority, token cost, trust, and hash — so assembly, ranking, and truncation
stay deterministic and attributable at any budget. Whether a model profile may
select a different budget from the accepted default is undecided and tracked
as [OQ-066](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md); nothing in this paragraph weakens
`CP-5` until an amendment accepts it.

### Fresh child sessions and Delegation Graph

Status: **candidate, non-normative**. Delegation may create a fresh child
`AgentSession` with only an explicit goal, bounded context, selected project
instructions, and a separately scoped workspace or terminal. The child
trajectory does not enter the parent conversation implicitly; a bounded result
summary is the explicit handoff. The candidate invariant is:

```text
ChildAuthority ⊆ ParentAuthority
ChildAuthority = ParentAuthority ∩ RequestedAuthority - DelegationForbidden
```

Child sessions must not inherit authority merely because the parent has it:
memory writes, outbound messaging, scheduling, clarification, or further
delegation may be forbidden by the child profile even when the parent can
request them, and every child still receives server-side scope checks, bounded
resources, independent cancellation, and the accepted isolation failure
semantics. A Delegation Graph candidate records `AgentSession`, `parent_id`,
`root_id`, generation, role, state, capabilities, workspace, terminal IDs,
turns, actions, tool calls, and background processes as a rooted forest:
each child names exactly one parent, delegation edges are single-parent
and acyclic, and a panel or CLI tree renders the forest without making
presentation authoritative; attribution answers which
agent and turn initiated an action and does not grant that agent authority.
Delegation attenuation and review ownership are owned by
[Agent coordination architecture](../agent/agent-coordination.md#teams-delegation-and-organization-graphs),
whose single-parent acyclic delegation-lineage rule this candidate follows.

### Execution profiles, targets, and provider negotiation

Status: **candidate, non-normative**. An `ExecutionProfile` may select model
roles such as `planner`, `executor`, `reviewer`, `summarizer`, `router`,
`vision`, or `approval-reviewer`, rather than assuming one model per Agent.
Routing may consider quality, cost, latency, context length, availability,
privacy, and local/remote policy; selection and routing inputs are owned by
[Provider plugin boundary](../providers/provider-plugin-boundary.md#model-aliases-and-routing-inputs).

Providers advertise a typed `ModelCapabilities` descriptor, for example
streaming, tool calls, reasoning state, native compaction, programmatic tools,
child-agent delegation, and vision. The host selects a provider-native path
when its capabilities and policy permit it, otherwise a reviewed host/plugin
fallback, and otherwise returns unsupported. Model names must not be security
or feature switches. `ExecutionTarget` unifies local, SSH, container, and
sandbox backends behind one target identity shared by Terminal, Agent, file,
Git, and process surfaces; the target grants no access — filesystem, network,
process, environment, credential, CPU, memory, disk, process-count, wall-time,
PTY, and device dimensions remain separately bounded, SSH credentials and
scope tokens follow the existing child-environment and P0-AC-023 rules, and
the post-v1.0 deferral and trust-boundary gate in [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
remain authoritative. Single-agent execution ownership (`ExecutionContext`
primary, optional Panel projection) and its cancellation contract are owned by
[Execution ownership R1](execution-ownership-r1.md).

### Tool Bus programmatic calls and availability

Status: **candidate, non-normative**. The Tool Bus may expose bounded
programmatic calls from an isolated `AgentWorkspace` or helper process. A
small program could call several tools through IPC and return an aggregate,
reducing transcript expansion, but the program receives no unrestricted
filesystem or network authority: each call still traverses the host Tool Bus,
schema validation, authenticated IPC, capability and consent checks, quotas,
and untrusted-observation labeling.

The candidate model-visible tool set is an intersection, not a registry dump:

```text
Registered
∩ EnvironmentAvailable
∩ CapabilityGranted
∩ ExecutionProfileAllows
∩ AgentLevelAllows
```

Availability is session/target-specific and may be false when a declared
backend or binary is absent. Capability and availability remain separate
facts. Programmatic calls cannot add tools, enlarge a scope, or turn a failed
availability check into a provider hint. Regex or command-pattern detection
may provide risk signals, but never replaces structured capability, scope,
consent, policy, and resource enforcement. Native-versus-MCP dispatch
placement belongs to [Tool transport R2](tool-transport-r2.md); Core-versus-Lua
tool ownership belongs to
[Command and tool architecture](command-tool-architecture.md).

### Tool-call batching and round-trip economy (candidate)

Status: **candidate, non-normative**. This records a batching direction for
the tool loop: the number of tool calls and the number of model API round
trips are different units, and independent calls can share one assistant
turn. It extends **Tool Bus programmatic calls and availability** above and
does not change `TB-6` or any other accepted cap.

- **BTR-1 One turn may carry a bounded batch.** A single assistant message may carry several `ToolCall` values; the batch may execute concurrently, and results are reinserted in call order so the transcript stays deterministic, with the result sequence (`Assistant(tool_calls)` -> `Tool` -> `Tool` -> ...) consumed by one follow-up model request. Batching reduces round trips, not enforcement: every call still passes registry validation, capability, consent, quota, and untrusted-observation labeling, and the batch remains bounded by `TB-6` (`8` tool calls per assistant turn); whether that bound is the right batch bound is part of the tracked question.
- **BTR-2 Some round trips are unavoidable.** Data-dependent calls are serial, interactive or consent-bearing tools (for example clarification) are forced serial, provider and API-mode parallel-tool-call support differs, and a model that emits one tool call per turn degrades to serial; even a fully independent batch still needs one request to consume its results, so N files cost at least two round trips.
- **BTR-3 Round-trip economy is a request-cost model, not a token model.** Every model request re-sends the conversation, so input tokens accumulate across turns; prompt caching mitigates but does not remove that cost, and cache stability stays subordinate to host policy and revocation. Batching lowers latency and request cost, not the tokens a result contributes to context, which remain governed by `CP-5` and `SOC-1`..`SOC-6`.
- **BTR-4 Choose the mechanism by call shape.** Independent calls with no data dependency belong in one turn; a mechanical loop over N files belongs in a bounded programmatic call (the section above) so only the aggregate returns to context; one logical edit spanning several files belongs in one transactional multi-file edit (the `ChangeSet`/overlay direction below), not N sequential writes; exploration and judgment stay with direct calls or a delegated fresh child session (Delegation Graph), where the parent receives a bounded summary while the child's calls still count in the total.
- **BTR-5 Provenance is a single-harness observation.** The originating analysis measured a local Hermes `state.db` snapshot (roughly 29,900 tool calls across roughly 22,400 assistant messages, about one in five carrying a parallel batch, largest observed batch thirty reads, roughly 7,600 round trips avoided versus strictly serial calls). This is one harness's local observation, not a benchmark; parallel emission is model- and provider-dependent, one legacy session in the same snapshot was entirely serial, and no Bitty batching mechanism exists today.

Tracked as [OQ-071](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### Changes, outcomes, and restore boundaries

Agent file mutations may be represented by a candidate `ChangeSet` containing
an ID, Agent and turn attribution, base revision, bounded file changes, and
review/apply/checkpoint state. A host-owned **Change Journal** may provide the
source of record, with Git as an adapter rather than a required persistence
model. Applying a ChangeSet remains a distinct, consented operation.

Workspace state and conversation state are separate restore domains. A future
interface may offer `Restore Workspace`, `Restore Conversation`, or `Restore
Both`; an ambiguous single `Undo` must not silently roll back both. User edits
and external changes require conflict detection and attribution.

`ExecutionOutcome` should treat `Succeeded`, `Failed`, `Cancelled`, and
`Unknown` as distinct. A lost response after a side effect is `Unknown`, not
failure. A `ToolSpec` may declare read-only, idempotent-write, external-side-
effect, or irreversible-side-effect class, together with an idempotency key
and retry policy. Read-only work may retry safely; idempotent work retries
only with a stable key; uncertain or irreversible work requires status
reconciliation or user direction and is never silently retried.

### Transactional edit and workspace overlay (candidate)

Status: **candidate, non-normative**. This extends the `ChangeSet`/Change
Journal candidate above with transaction and overlay semantics.

- **Base revision pinning.** A candidate edit names the base revision or hash
  it was computed against (for example `expected_hash` per file). A target
  that no longer matches fails closed instead of applying a stale
  `find`/`replace`.
- **Apply as a transaction.** Candidate flow is `APPLY -> VALIDATE -> COMMIT`,
  all-or-nothing: apply in memory, validate parse, format, and diagnostics,
  then commit, so one mismatched target aborts the whole edit set and the
  workspace is never left half-modified.
- **Workspace overlay.** An agent may work on a snapshot or overlay namespace
  (`overlay://<task>`-style) rather than the live workspace; verification runs
  against the overlay, then the change is merged or discarded. A Tester can
  validate an Implementer's overlay before merge, which composes with Git
  worktrees and CarryCtx tasks without being coupled to either: overlay names
  are presentation-scoped handles, not new authority.
- **No silent merge.** Merge, discard, and conflict decisions remain explicit
  and attributed; the accepted restore-domain separation (workspace versus
  conversation) still applies.

Tracked as [OQ-064](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### Hook authority and observation labeling

Future Agent-runtime lifecycle hooks may cover session, turn, instruction,
context, model, tool, approval, child-session, workspace, compaction, and MCP
events. These are outside Plugin API v1 and must not be exposed to plugins or
Lua without a separate reviewed Plugin Platform amendment. Plugin API v1
retains exactly the accepted four interception points:
`intercept.command-dispatch`, `intercept.terminal-spawn`, `intercept.paste`,
and `intercept.open-url`. Their authority must be explicit and ordered:

| Tier         | Effect                                                          |
| ------------ | --------------------------------------------------------------- |
| Observation  | observe only; cannot affect execution                           |
| Advisory     | provide a suggestion to Agent or policy                         |
| Interception | veto or constrain one action; cannot grant authority            |
| Host Policy  | authoritative capability, scope, consent, and resource decision |

This invariant is non-negotiable for any future hook surface: a plugin or Lua
hook may veto, but cannot grant `network.connect`, widen a target, or bypass
the Capability Engine. Terminal output, tool results, plugin data, and other
attacker-controlled content remain `is_untrusted_surface` observations. No
provider, hook, or context concatenator may upgrade an observation into an
instruction or policy channel, including text such as “ignore previous
instructions”.

### Code context and verification services

Status: **candidate, non-normative**. A candidate `CodeContextProvider` would
expose semantic repository context such as symbols, references, imports,
diagnostics, changed files, and a repository map instead of reading every
source file; its implementation may use a compiler, LSP, tree-sitter, language
service, analyzer, or a future versioned capability-checked plugin service
consumed by the provider. The `CodeContextProvider` itself remains host-owned:
a plugin cannot implicitly register or replace it. The AI layer consumes one
bounded, attributed contract, read-only by default, and source text never
becomes trusted.

A candidate `ai.verifier` service could expose project-defined checks and
bounded results, such as format, lint, test, or type-check commands. The
project or plugin defines policy; the host still authorizes execution and
applies target and isolation limits. A verification result is evidence, not an
automatic approval or permission grant. Neither service claims implementation
in Bitty today. Language-service mediation, verification fingerprinting,
result reuse, and bounded scheduling are owned by
[Code intelligence architecture](../agent/code-intelligence.md); the
progressive-reading and repository-index mandates below stay in force.

### Progressive code reading and repository index (candidate)

Status: **candidate, non-normative**. Reading is a ladder, not a prohibition:
the model starts with the smallest useful view and may always zoom out to the
full file, which remains the escape hatch.

```text
repo_overview -> search -> outline / project map -> symbol
              -> definition / references -> source slice -> full file
```

Language-service mediation, the semantic tool surface, verification
fingerprinting, and result reuse are owned by
[Code intelligence architecture](../agent/code-intelligence.md); the
repository-index layer separation and language-service discovery mandates
below stay in force here:

- Syntax-derived records (tree-sitter style) tolerate incomplete code and never claim semantic truth; semantic records come from a language service, and inferred records carry an explicit origin and confidence signal.
- A `repo_overview`-style projection covers manifests, toolchain and build files, CI workflows, tests and examples, migrations, and documentation layout — a bounded map, not a filesystem dump.
- Text search stays first-class; AST/symbol navigation complements it instead of replacing it.
- Language-service integration is adapter-based (explicit project configuration, then `PATH`/toolchain, then editor-managed adapters such as a Mason-style adapter, then Nix and custom adapters) behind one `LanguageServerDiscovery` contract; `bitty-ai` must not depend on a specific editor, and language tools stay user-provisioned — a missing server degrades to plain search instead of blocking a project, and nothing is silently provisioned.
- Read tools (definition, references, publish-diagnostics, formatting, bounded code actions) remain bounded, attributed, and read-only by default; any write routes through the transactional edit direction below, none replaces accepted build or test verification, presenting their results as first-class attributed UI (a diagnostics or evidence view) is a candidate native advantage, and every read result enters the context budget like any other provider — reading more never bypasses capability or consent.

Tracked as [OQ-062](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md); language-service
discovery and diagnostics are tracked as
[OQ-063](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### Spatial multi-agent orchestration (candidate)

Status: **candidate, non-normative**. A candidate topology maps durable roles
to spatial panels instead of a single transcript: Commander, Implementer,
Tester, and Reviewer panels, each backed by one `AgentSession` presented as
`ViewContent::Panel(PanelId)`; the panel is a view of a session, never the
session itself, and closing or hiding it does not complete, cancel, or
elevate its session unless an explicit lifecycle operation says so.
Panel/execution reconciliation, leases, supervision, delegation graphs,
routing, and envelope delivery are owned by
[Agent coordination architecture](../agent/agent-coordination.md); the
architecture mandates stay:

- **SMO-1 Event bus, not shared memory.** Bounded typed events ride the accepted IPC event bus (framing, per-queue budgets, `DropOldest`) and carry `(AgentId, generation, kind)` so a reload or disposal invalidates stale events.
- **SMO-2 Presentation is not authority.** Focus, z-order, and panel visibility never grant capability; server-side scope checks evaluate the authenticated identity (AG-3).
- **SMO-3 Routing fails closed.** Dispatch, result handoff, review request, and checkpoint notice are candidate event kinds; routing is declarative data, and a missing or stale route fails closed rather than falling back to an ambient recipient.
- **SMO-4 Existing substrate.** The candidate reuses Delegation Graph attribution, `bitty-ipc` scopes, and the Panel Runtime identity/generation contract; no daemon or second registry, and no implementation exists today.
- **SMO-5 Panels are views over IPC endpoints.** Every runtime object (agent, task, workspace, tool, process, model, panel) is a candidate addressable IPC endpoint with a panel as one possible projection (`view(endpoint)`); an agent can have UI, no UI, run headless, or be watched by several panels without a panel becoming the session identity.
- **SMO-6 Humans join the same bounded surface.** A human reviewer is a first-class participant (`ApprovalRequest` toward a human-facing projection, Allow/Deny back), not a private side channel; decisions are attributed and audited, and approval remains an explicit consented action (CRE-1, SMO-2).
- Tracked as [OQ-058](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### Agent identity separation and projection (candidate)

Status: **candidate, non-normative**. A panel is a projection of agent runtime
state, never the agent itself. The identity domains stay separate:
`AgentId` (runtime instance, may own no UI), `TaskId` (durable task identity),
`RunId` (one logical run), `ExecutionId` (one dispatch inside a run),
`PanelId` (presentation container), and `WorkspaceId` (worktree identity the
run is scoped to). An agent may have zero panels, one panel, or several views;
it may run headless and be observed through a CLI; one execution may be
projected to a panel that did not start it; and presentation focus and
visibility remain non-authoritative (SMO-2). Identity ownership, panel
binding, and lifecycle outcomes are owned by
[Agent coordination architecture](../agent/agent-coordination.md#identity-and-ownership).
Tracked as [OQ-061](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### Multi-agent message envelope and delivery (candidate)

Status: **candidate, non-normative**. The real multi-agent difficulty is
delivery semantics, not adjacency. Candidate envelope fields extend the SMO-3
routing candidates — `AgentMessage { message_id, sender, recipient, task_id,
parent_run_id, kind, payload, deadline, priority }` — with candidate kinds
`DelegationRequest`, `DelegationResult`, `Observation`, `ApprovalRequest`,
`ToolResult`, `Cancellation`, and `StatusUpdate`, and delivery rules of
bounded payloads under the accepted framing, `message_id`-based deduplication,
deadline and expiry handling, cancellation, and fail-closed routing to a dead
or unregistered recipient. Envelope, mailbox, acknowledgement, and recovery
mechanics are owned by
[Agent coordination architecture](../agent/agent-coordination.md#messages-ipc-and-recovery).
Tracked within [OQ-058](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### Capability-enforced roles and child-agent dispatch (candidate)

Status: **candidate, non-normative**. Roles are candidate capability sets
enforced at the IPC/capability layer and the Tool Bus, never by prompt text;
today `Role` in `bitty-agent` is only a chat-message role, and no role
capability map exists. This candidate keeps the Wheel vocabulary of Agents in
role relations (Agent, AgentRole, AgentRelation, Delegation, Caller,
Coordinator, Reviewer, Worker) and treats "subagent" as historical,
external-harness terminology, not a distinct Wheel type or Core concept.

| Candidate role | Candidate authority                                                            | Explicitly denied by default                            |
| -------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Commander      | Read task/plan state, dispatch child agents, manage role panels, read terminal | File writes, terminal input, credential reads           |
| Implementer    | Read/write inside the scoped worktree or target, allowlisted build/test spawns | Dispatch, network, credential reads                     |
| Tester         | Run allowlisted test commands, read terminal and `git diff`                    | Source writes outside the test scope, dispatch          |
| Reviewer       | `terminal.read` plus `git.diff_read` only                                      | Workspace writes, process spawns, dispatch, credentials |

- **CRE-1 Tightest example.** The Reviewer is deliberately the narrowest profile: it reads terminal observations and diffs and can produce a verdict, but it cannot edit, spawn, or delegate. A verdict is data; approval remains a separate, consented action.
- **CRE-2 Per-role prompts are data.** A role's system prompt and instruction sources are frozen in the session snapshot and identified by the `InstructionEpoch` (see above); editing or replacing a prompt never changes the capability set, and the two are resolved independently.
- **CRE-3 Dispatch inherits downward.** Creating a child agent uses the `Fresh child sessions and Delegation Graph` invariant `ChildAuthority subset of ParentAuthority`, further limited by the role profile; a role can never grant a child what the parent lacks. Budget reservation, attenuation, and review separation are owned by [Agent coordination architecture](../agent/agent-coordination.md#teams-delegation-and-organization-graphs).
- **CRE-4 Enforcement points.** Candidate checks live in the IPC scope evaluation, Tool Bus validation, capability grants, and resource budgets already accepted; no new bypass or prompt-only gate is introduced.
- **CRE-5 Tool capability versus execution sandbox capability (candidate).** Tool-level grants are not sufficient by themselves: a role that never receives `fs.write` can still rewrite files through an allowed `process.spawn` (a shell one-liner, an in-place edit command, or an interpreter) unless the execution sandbox constrains what spawned processes may touch. The role contract therefore needs two coordinated layers — the tool capability set and an execution sandbox profile (filesystem read-only or deny, network deny, restricted process family, filtered environment); a role is a policy template and an agent is a runtime instance, so several agents can share one role without sharing state. The sandbox layer is part of the enforcement scope tracked as [OQ-057](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
- Tracked as [OQ-057](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md). Candidate role kernels landed in `bitty` CTX-0711/#1304 (`crates/bitty-plugin-host/src/roles.rs`, in `origin/main` at `c01f538`: Commander/Implementer/Tester/Reviewer as pure data, nothing wired into a live path) — Implemented-only evidence; the enforcement points, including the execution-sandbox layer, stay open.

### Role, model, and capability orthogonality (candidate)

Status: **candidate, non-normative**. The role table above binds authority, not
the model. The follow-up analysis proposes keeping role, model, capability,
tool, and context policy fully orthogonal, so an agent composition is:

```text
Agent = Identity + Role + Policy + Capabilities + Model Routing
      + Memory + Workspace + Tools + Lifecycle
```

Candidate model direction:

- A `models` registry is declared separately from agents (`fast`,
  `reasoning`, `code`, and private local profiles, and similar), so the same
  role can run on a different model without changing its authority. Prompt and
  capability resolution stay independent (CRE-2).
- **Within-agent model routing.** A single agent may route phases to different
  models: status summarization to a fast model, architecture reading to a
  reasoning model, patch generation to a coding model, and sensitive local
  data to a local model. Candidate routing rules are declarative policy data
  evaluated by the host; routing selects a model, never an authority tier.
- **Non-coding agents are the same composition.** Research, operations, or
  personal-assistant agents differ by role, tools, model routing, and policy
  values, not by a separate mechanism; this is what can make the agent surface
  broader than a coding agent without widening Core.

Model availability, routing execution, and per-purpose model binding are
undecided; tracked as [OQ-069](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### Agent growth pipeline and proposal approval (candidate)

Status: **candidate, non-normative**. A hermes-agent-style agent that improves
over time is recorded as a host-mediated pipeline, not self-modification:

```text
Observation            -> Memory
Repeated solution      -> Recipe
Reusable procedure     -> Skill
Stable behavior change -> Policy / agent-profile proposal
```

- **GR-1 Proposal, not mutation.** An agent may propose a skill, recipe, or
  policy/profile change; the Bitty policy engine validates, versions, and
  installs it or rejects it. An agent never edits its own security policy,
  capability set, or role authority.
- **GR-2 No capability gain through learning.** The invariant: an agent can
  grow, but it cannot grow a capability the host did not grant. A learned
  skill runs under the same role, capability, and sandbox enforcement as any
  other tool invocation, and a proposal that needs new authority returns to
  the consent flow.
- **GR-3 Artifacts are reviewable data.** Memory, recipes, skills, and profile
  proposals are versioned, attributed, and inspectable before activation, so
  growth is auditable rather than hidden in an opaque prompt blob.
- **GR-4 Growth composes with the existing planes.** Memories and skills map to
  the context planes and Tool Bus contracts above; they are not a second
  context channel and do not bypass PP-1 or the CP-5 budget.

Whether a learned skill becomes durable project data or session-scoped state,
and which approval surface versions it, is undecided; tracked as
[OQ-070](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### Semantic output compression for agent context (candidate)

Status: **candidate, non-normative**. Candidate rules for compressing command
output into agent context using OSC 133 zones and exit codes; the command-record
side is owned by
[Agent coordination architecture](../agent/agent-coordination.md#context-compilation-and-progressive-disclosure).

- **SOC-1 Zone addressing first.** A command contribution is addressed by its semantic zone region (`Prompt`/`Input`/`Output`) plus the recorded exit code, not by scraping arbitrary terminal text; this depends on [OQ-050](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/ui-compositor-gap-analysis.md), and until it is decided no row-level compression claim is possible.
- **SOC-2 Success path is a summary.** Exit `0` contributes the command text, exit code, line count, and a bounded summary, never the full build or test log by default; the full output stays retrievable through an explicit resolve step.
- **SOC-3 Failure path is error-first.** A non-zero exit contributes the exit code, deterministically extracted error lines (the error pattern set is policy data, not model inference), and a bounded window around each error; unrelated output is omitted unless the caller resolves it.
- **SOC-4 One budget.** Every compressed contribution counts against the CP-5 context budget with per-block attribution and counted truncation; error lines and exit codes are dropped last.
- **SOC-5 Untrusted labeling is preserved.** Compressed text remains `is_untrusted_surface = true` observation; compression may not launder terminal output into instruction or policy channels (T-10/R-013).
- **SOC-6 Off the hot path.** Compression runs in the cold path on committed state snapshots and never in the parser or render path.
- Tracked as [OQ-059](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### Semantic execution results and progressive disclosure (candidate)

Status: **candidate, non-normative**. This extends the SOC-1..SOC-6
compression rules with the result shape and the retrieval path, correcting one
framing: the compression is **not lossless** — exit `0` can still carry
warnings, deprecated-API notices, ignored or skipped tests, flaky-test
notices, resource warnings, and unexpected stderr, so those survive at the
diagnostics level rather than being discarded with the noisiest output. A
candidate `ExecutionResult` record, produced off the hot path, carries status,
exit code, duration, a bounded summary, diagnostics, warnings, artifact
references, stdout/stderr references, truncation state, and the parser or
adapter that produced it; the agent sees a small disclosure ladder and can
always resolve downward by reference:

```text
L0  semantic summary (status, counts, duration, reference)
L1  diagnostics and important output (warnings, errors, ignored tests)
L2  selected raw output (bounded range over a stream reference)
L3  complete raw log (explicit resolve, bounded, attributed)
```

Two candidate rules make the ladder reliable: **structured first** — prefer
machine-readable output (compiler JSON diagnostics, test-framework machine
formats, linter JSON) over regex scraping of human text, normalized by
per-tool adapters (for example `cargo`/`rustc`, `pytest`, `eslint`, `tsc`, and
a generic shell adapter) into typed `Diagnostic` records with severity, file, line, code, and message, with regex as a fallback rather than the contract; and **cheap before expensive** — parser,
formatter, and language-service diagnostics are fast feedback while a real
build or test run is verification, so the pipeline escalates from edit,
parser, formatter, and language-service diagnostics through fast lint and
targeted tests to a full build or test run and never treats a diagnostic as a
passed verification ([OQ-063](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)).
Retrieval by reference re-reads committed output under the same scoping and
untrusted labeling as SOC-5. Tracked as
[OQ-059](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### CarryCtx as the durable task layer (candidate)

Status: **candidate, non-normative**. CarryCtx is a local-first durable
task/worktree/checkpoint manager treated as the durable record for multi-agent
work, not as an authority surface. Lifecycle authority — the product Task model
versus the CarryCtx governance backend-or-handoff facet, including the
independent-review and critical-message rules — is owned by
[Task lifecycle R5](task-lifecycle-r5.md). The mandates below stay in force
here:

- **DCT-1 Bounded task context.** A role may read a bounded projection of its
  task (title, scope, dependencies, latest checkpoint) through a
  ContextProvider-style provider; the projection counts against the CP-5
  budget like any other context.
- **DCT-2 Checkpoints as recovery pointers.** Checkpoints are candidate
  `RecoveryPointer` targets for the `ContextEngine` (already named there as a
  possible CarryCtx adapter) and are not context that is injected by default.
- **DCT-3 Worktree mapping.** One task maps to one branch/worktree; the
  worktree is the candidate target root for an Implementer `AgentWorkspace`
  and never widens filesystem authority beyond the granted scope.
- **DCT-4 No authority transfer.** CarryCtx state is local data with no
  network path in the integration; it can request work but cannot grant
  capability, bypass consent, or self-accept a review. Task completion remains
  an independent human/commander decision.
- Tracked as [OQ-060](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### Evidence and provenance (candidate)

Status: **candidate, non-normative**. An agent claim should be traceable to
the evidence that produced it: an execution handle plus stream and range plus
exit code, a file revision or commit, or a language-service provider,
workspace revision, and query. The recorded shape is a reference
(`run -> tool execution -> stdout blob -> exit code -> commit`), consistent
with the `RecoveryPointer` model: a reference is retrievable, not permission
to read. Verification results remain evidence, never approval; a reviewer
approves separately, and the UI direction is an evidence view that opens from
an answer to the raw command,
source, or diff; evidence carries the same untrusted-observation labeling as
its source and enters any context budget as an attributed item; and debug,
audit, replay, and human review are the primary consumers of the same
reference graph. Evidence storage, projection, and replay are owned by
[Persistence and evidence architecture](../persistence/persistence-evidence.md).
Tracked as [OQ-065](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

### Candidate build sequence (candidate)

Status: **candidate, non-normative**. The originating analysis recommends
earning the single-agent loop before multiplying it: semantic execution
results, then repository index and progressive reading, then transactional
editing, then the context engine, then a single-agent runtime, then
capability and sandbox hardening, then multi-agent delegation, and spatial
panel UX last. The rationale is direct: if one agent cannot read, edit, and
verify well, ten agents only work inefficiently in parallel. This is
sequencing advice for a future `bitty-ai` staging decision, not a roadmap
commitment.

## Tool Bus

Status: **proposed contract**.

The Tool Bus is the host-owned dispatch surface where agent tool calls are validated, consented, and forwarded. The MCP adapter is the transport; the exact `ToolSpec`/`ToolCall` bounds and the host-side dispatch separation are owned by the [IPC and Agent RFC](../specifications/ipc-agent-rfc.md#agent-bounded-messages), transport and authorization-backend selection by [Tool transport R2](tool-transport-r2.md), and Core-versus-Lua tool ownership by [Command and tool architecture](command-tool-architecture.md). The mandates below stay in force:

- **TB-1 MCP as adapter.** MCP remains an adapter, not an internal protocol, per [Architecture Overview](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/overview.md) and [IPC and Agent RFC](../specifications/ipc-agent-rfc.md); it translates `ToolCall` values into MCP operations and labels every terminal-content-bearing response as untrusted observation (P0-AC-024, T-10).
- **TB-2 ToolSpec registry.** `ToolSpec` declares `name`, `description`, and JSON Schema bounded exactly as accepted for `bitty-agent` tool vocabulary, with at most `32` specs per session.
- **TB-3 Validation before dispatch.** Every `ToolCall` is validated against the registry before any host dispatch (unknown tool fails closed), and `arguments` are schema-validated at the accepted `16 KiB` bound with a whole-request typed failure and no partial state.
- **TB-4 Capability and consent per tool.** Each tool declares a required capability (for example `workspace.write`, `git.read`, `diagnostics.read`, `terminal.inspect`) and an optional per-tool privacy gate. Using a tool requires both its declared capability and a separate per-client consent grant ledgered as `who, agent_id, tool_name, granted_at, expires_at, granted_by`; possession of `ai.model.stream` implies no tool authority.
- **TB-5 No silent tool expansion.** A plugin or model package update that advertises a new tool blocks activation and requires the permission-diff flow (R-016 parity); system and distribution policy pin maxima and cannot be weakened by user configuration.
- **TB-6 Budgets and backpressure.** Dispatch reuses RC-9/RC-10 sharing: at most `8` tool calls per assistant turn, each result `<= 16 KiB`, per-connection rate and concurrency caps, drop-oldest observation streams with counted metrics, and RC-10 chunking for long outputs.
- **TB-7 Host execution only.** The `bitty-agent` crate never executes a tool (`ToolRegistry::stub_invoke` is test-only); real execution happens in the host/runtime that mediates capability-checked dispatch, rate limits, per-client scopes, consent prompts, and audit, with compile-time boundary enforcement as directed by [HostBoundary trait and lint-gate design](host-boundary-trait-design.md).

**See also**: [Command and Tool Architecture](command-tool-architecture.md) for the Core versus Lua boundary, slash command registry, and tool runtime separation; [Tool transport R2](tool-transport-r2.md) for the unified authorization backend and transport selection; [HostBoundary trait and lint-gate design](host-boundary-trait-design.md) for compile-time boundary enforcement.

### Command risk classification and syntax-level audit (candidate)

Status: **candidate, non-normative**. This extends Tool Bus validation (TB-3)
and consent (TB-4) with the command-side risk model recorded from the local
the candidate direction`; the note is provenance, not evidence. It changes no
accepted TB rule, adds no capability, and claims no implementation. Tracked as
[OQ-087](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md); the terminal-side interlock is
specified in the [IPC and Agent RFC](../specifications/ipc-agent-rfc.md#candidate-sensitive-input-interlock-and-interaction-policy-oq-086)
candidate sensitive-input interlock ([OQ-086](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)).

- **CRA-1 Risk tiers.** Every agent-initiated command is classified before
  dispatch: read-only inspection proceeds under the caller's existing scopes;
  ordinary local development commands proceed under the accepted scope;
  state-resetting commands (working state checkout/reset, temporary-file
  removal, signalling a known child) notify and are audited; destructive or
  network-egress commands (recursive force deletion of broad roots, filesystem
  creation, raw block-device writes, pipe-to-interpreter, privilege
  escalation) block pending explicit consent.
- **CRA-2 Syntax-level inspection.** Classification uses a structural parse of
  the command (a shell-AST-class parser, tree-sitter style), not string
  blacklists, so quoting, escaping, pipelines, command substitution, and
  simple encodings cannot hide the actual operation. A decoded or constructed
  command is resolved before classification whenever a decoding step is
  statically visible.
- **CRA-3 Hard-deny classes.** Candidate hard-deny classes: piping fetched or
  decoded content into a shell interpreter; privilege escalation; writes to
  system configuration or user credential directories; recursive force
  deletion of broad roots; and raw block-device writes. A hard-deny hit blocks
  the dispatch and routes to the consent surface instead of executing.
- **CRA-4 Consent, not authority.** Releasing a blocked command requires an
  explicit human decision recorded in the consent ledger (PP-3); approval is
  per-command and time-bounded, never a blanket escalation, and it cannot
  widen the client's scopes. The deny classes are policy data with a
  conservative default, not a replacement for least privilege.
- **CRA-5 Evidence.** Candidate acceptance evidence: an adversarial corpus of
  obfuscated destructive commands (encoding, substitution, pipelines) must be
  classified correctly, benign look-alike commands must not be blocked, and
  denial and consent outcomes must be attributed. Until then the tiers and
  deny classes are design candidates.

### Tool Bus scrubbing implementation evidence (bitty #370)

Status: **experimental review evidence only.** The milestone merged in `bitty`
`a2d127b` (CTX-0216, PR #370, `crates/bitty-agent/src/tool.rs`); the full API
record is owned by the
[IPC and Agent RFC](../specifications/ipc-agent-rfc.md#credential-scrubbing-implementation-evidence-bitty-370)
section of the same name. For this architecture it demonstrates that PP-2
redaction is implementable at the tool boundary (the `bitty-agent` half of
P0-AC-026 parity; `Debug` redacts by design, and the typed `SecretField`
markers remain the accepted target), that scrubbed views respect the accepted
TB-3/TB-6 `16 KiB` caps, and that TB-7 separation holds (redaction lives in
`bitty-agent`, which still never executes a tool and performs no model,
window, or GPU I/O). Explicit non-claims: redaction is a textual boundary, not
a guarantee for unrecognized secret shapes; consent, capability checks, the
audit ledger, and `SecretField` typing are not implemented by this milestone;
no `Verified`/`Compatible` claim is made, it does not promote this draft
beyond `draft`, and it does not satisfy TB-4 or TB-7 (capability, consent, and
audit remain deferred to the host).

## Privacy-first

Status: **proposed contract**. Privacy is a property, not a mode flag.

- **PP-1 Minimization.** Context assembly defaults to the smallest zone-scoped, budget-bound set that satisfies the declared tool schemas. Full file, full repository, or full scrollback access requires explicit elevation and an audit record. Ambient collection is denied.
- **PP-2 Typed redaction.** Every record, trace, snapshot, and diagnostic that may carry secrets carries typed `SecretField` markers (API keys, clipboard, environment, raw input). Redaction applies before queuing, not after, and is verified by negative tests that seeded secrets never appear in default `inspect` or unlabeled `trace` outputs (P0-AC-026 parity).
- **PP-3 Consent ledger.** All privacy-relevant grants — provider network use, API-key use, context provider elevation, tool use, and `workspace`/`all` levels — record `who, agent_id, scope or tool, Stable Id set, granted_at, expires_at, granted_by` and are visible via `bitty ctl inspect consent` (candidate). Grants are per-client, per-instance, bounded in time, and revokable immediately with auditable receipt.
- **PP-4 No on-disk persistence without consent.** Agent turns, tool results, and context snapshots that received elevation are not recorded to disk by the host without explicit `debug.trace` or workspace-write consent. Consent authorizes recording only subject to mandatory typed sensitive-field redaction under P0-AC-026; it never permits unredacted traces. Storage is user-only (mode `0600`) and the redacted write path is previewable before export, matching the trace-minimization and export-preview rules already accepted. Raw export requires a separate future policy and cannot weaken P0-AC-026.
- **PP-5 Child and environment isolation.** No provider credential, elevated scope, durable token, or unredacted context is ever written to child process environments, `BITTY_*` variables, discovery files, or CLI output without an explicit scope and redaction check. A child process spawned inside a terminal may receive at most a short-lived, current-terminal scope token over a dedicated fd, never via environment (R-012, P0-AC-023 parity).
- **PP-6 Revocation semantics.** Revoking any grant detaches affected handlers at the next dispatch boundary, cancels in-flight streams at the next chunk boundary, disposes ephemeral `AgentWorkspace` state that was reached only via that grant, and records an auditable `Revoked` event. Re-grant requires a fresh prompt; history overflow never silently re-enables a revoked scope.

## Failure semantics

Numbered for reference; none is implemented by this RFC alone.

- **FS-AI1 Transactional denial.** A refused auth, scope, level, budget, or validation failure leaves no partial state: no allocation beyond the bounded frame, no queue entry, no tool dispatch, and no `AgentWorkspace` mutation. Denial is total with a typed `AgentError` or `IpcError`.
- **FS-AI2 Shed newest, drop oldest.** Concurrent-connection and rate-limit excess shed newest first; context and observation streams drop oldest with counted metrics, preserving the latest state.
- **FS-AI3 Containment.** A fault affects only the owning `AgentSession`, `StreamHandle`, or `AgentWorkspace` generation. The host process, sibling sessions, terminals, and plugin VMs remain responsive and unaffected.
- **FS-AI4 Attribution.** Every enforcement action emits a structured record: authenticated client id, `AgentId`, `generation`, `StreamHandle` when applicable, Stable Id set, budget dimension, observed value, limit, and action taken. Unattributed enforcement is a conformance bug.
- **FS-AI5 No ambient leak.** No provider credential, durable elevated scope, or unredacted context is ever written to child environment, `BITTY_*` variables, discovery files, or traces (R-012, R-014, P0-AC-026).
- **FS-AI6 Safe-mode independence.** Every path above preserves `bitty --safe` startup with minimal built-in configuration, zero third-party providers, and zero pending agent state; verified after any AI-sensitive change (P0-AC-019 parity).
- **FS-AI7 Fail-closed framing.** If any bounding, redaction, or consent machinery cannot start or is detected disabled, the service refuses to serve rather than serving unbounded or unredacted.

## Sub-platform staging (proposed)

Status: **proposed contract**. How the AI stack is staged as an independent
sub-platform without becoming Core. Numbered for reference; none is
implemented by this RFC alone. Cross-repository handoff scope and verification
are owned by [bitty-side integration input](../integration/bitty-side-integration-input.md)
and [bitty-side delivery verification](../integration/bitty-side-delivery-verification.md);
the registry split disposition is owned by
[Execution ownership R1](execution-ownership-r1.md#mp-1-registry-ownership-versus-ba-2-agent-versus-ai-split-and-ba-3-bridge-process-model-disposition).

- **BA-1 Independent repository.** `bitty-ai` is staged as an independent repository under `github.com/bitty-terminal` holding the AI runtime, providers, streaming, context, tools, bridge, and Lua-facing AI services; AI plugins (`ai-chat`, `ai-shell`, `ai-explain`, `ai-git`, `ai-context`) are ordinary plugins on `bitty-ai` services through the accepted manifest `dependencies` and `services.provided` mechanics of the [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md), never private channels.
- **BA-2 Agent versus AI split.** `bitty-agent` (in Core) owns how Bitty describes, communicates with, and authorizes an agent and passes observations and tool calls, but never model selection, LLM I/O, or API-key handling; `bitty-ai` owns provider abstraction, streaming, context assembly, and the tool loop, and the two meet only at IPC and service boundaries.
- **BA-3 Bridge process model.** The Bitty host never loads `bitty-ai` via `dlopen`: a `bitty-ai-host` helper owns providers, streaming, context, and tools behind scoped IPC, consistent with the prohibition on native in-process plugins and the helper staging in the [Plugin Reuse RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-reuse-and-providers.md); Lua plugins see only composed AI services, never raw provider sockets.
- **BA-4 Rust workspace layout (candidate).** `bitty-ai` is staged as a Rust workspace of narrow crates (core data model, provider abstraction, runtime, context, tools, bridge, host composition) plus one directory per model provider; crate names and trait spellings are illustrative until a `bitty-ai` repository task pins them, and the std-only runtime posture is owned by [Dependency Strategy](../providers/dependency-strategy.md).
- **BA-5 Lua composes, Rust enables.** Lua AI plugins orchestrate (`ai.session`, `ai.context.collect` with explicit terminal/cwd/git selection and token budget, `ai.tools.register`), while Rust owns mechanism (HTTP/SSE streaming, retries, timeouts, resource bounds, capability enforcement, terminal state, provider protocols); Lua receives semantic primitives (`workspace.focus`, `terminal.snapshot`, `service.require`, `ai.chat`), never Rust internals, so the Lua surface stays stable across Rust refactors, and the Core-versus-Lua split is owned by [Command and tool architecture](command-tool-architecture.md).
- **BA-6 Pressure-test gate.** `bitty-ai` must be realizable from generic primitives (Plugin API, services, IPC, UI primitives, capabilities) without Core changes; each newly demanded Core AI-specific API is evidence of a Plugin API abstraction gap to fix at the primitive level, not a feature request to grant. This gate is a reviewer rule, not an automated check.

### Draft registry and transport reconciliation

MP-1's earlier `bitty-agent`/`bitty-runtime` registry-location alternatives
conflict with BA-2/BA-3 if interpreted as placing provider implementation,
model selection, LLM I/O, or API keys in terminal Core. Preserve BA-2/BA-3:
the terminal-side registry validates generic service metadata and mediates
authorized requests, while provider registry implementation and I/O belong in
the independent AI helper; the exact registry split and owning crates remain
draft choices. [Execution ownership R1](execution-ownership-r1.md#mp-1-registry-ownership-versus-ba-2-agent-versus-ai-split-and-ba-3-bridge-process-model-disposition)
owns this disposition.

Similarly TB-1's MCP transport proposal and the direct-spool rejection do not
settle the later native-tool proposal: [Command/tool reconciliation](command-tool-architecture.md#tool-runtime-what-belongs-in-core)
keeps native and MCP paths under the same schema, caller/target
authorization, consent, budget, redaction, and outcome rules, bypass spools
remain rejected, and transport selection and generic backend ownership remain
open (local AIQ-36/AIQ-38) with [Tool transport R2](tool-transport-r2.md)
owning the unified authorization backend. Native implementation is not
authority for AI code in the terminal process; `ExecutionContext` may exist
without a Panel or shell, and a Panel is an optional projection.

### Sub-platform verification (proposed)

- Given the staged `bitty-ai` services, an AI chat turn, a shell-error explainer driven by `terminal.command-finished`, and a Git review flow combining `ai.chat` with `vcs.diff` are all expressible through service composition with no Core AI concept and no in-process native load. Verification: `integration` with provider stubs plus a negative suite asserting no Core AI-specific API exists beyond the generic primitives.

## Future RFC split direction (proposal, no acceptance)

This umbrella document stays draft; [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
is the current narrow scope gate. When freezing becomes necessary, split narrow
contracts out of this umbrella instead of accepting this document as a whole.
Candidate splits only, each requiring its own independent review and evidence
before any acceptance:

- Provider Contract v1 (ModelProvider operations, capability matching, selection policy primitives).
- Context Request v1 (token-first request, budget, artifacts, attribution, truncation).
- Runtime Identity v1 (protocol versus runtime identity separation, run, session, and execution handles).
- Tool Dispatch v1 (validation before dispatch, authorization backend, outcome disclosure).
- Prompt Assembly v1 (stable-before-dynamic layer order, assembly precedence, capability separation).

This list proposes split boundaries only. It accepts no mechanism, closes no
open question, revises no R1-R6 draft disposition, and proposes no new
identifier; each future RFC reuses existing open-question identifiers and needs
its own contract, review, and implementation evidence.

## AI workspace composition (candidate)

Status: **candidate, non-normative**. This records the user's workspace-platform
analysis: an AI workspace built on Bitty panels and the inter-panel event bus
is a native workspace platform rather than a TUI redrawn inside one grid.
Panel lifecycle, leases, and delivery semantics are owned by
[Agent coordination architecture](../agent/agent-coordination.md#panels-executions-leases-and-human-control);
terminal-side panel contracts stay in the terminal platform documentation.
The mandates below stay in force:

- A terminal panel, an agent panel, and a side inspector compose as sibling Panels under the compositor (see [Panel Vision](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/product/panel-vision.md)); the inspector presents MCP tools and call counts, active skills and prompts, the TODO tree, and the context budget meter (CP-5), and agent output streams as Scene nodes per the [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md), with Markdown never re-interpreted inside the terminal grid (Terminal Truth preserved).
- Terminal `OSC 133` semantic zones drive `terminal.command-finished` events carrying exit code and zone range; the agent panel subscribes and pulls bounded zone text through the existing context-provider path. Presentation stays non-authoritative; delivery semantics remain the bounded panel-runtime contract (see [Panel Runtime Pre-Study](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-pre-study.md)).
- Prompt architecture, context compaction, and tool-call recovery loops from existing harnesses are inputs to the Lua policy layer; their TUI shells are not reused.
- Multi-agent routing remains [OQ-058](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md); window forms and the unified `Mod` contract remain [OQ-052](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md); plugin-supplied presentation stays capability-gated per the Panel Runtime pre-study.

## Workspace-anchored multi-agent runtime: panels as leased workstations (candidate)

Status: **candidate, non-normative**. Recorded from the user's
"company / floor / workstation" model for multi-agent work (2026-09-13). It
refines the spatial orchestration question in
[OQ-058](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) and composes with the AI workspace
composition above. Technically this is a workspace-anchored (spatially
anchored) multi-agent runtime: agent context is anchored in a persistent
execution environment rather than only in conversation memory, and humans and
agents share that environment state instead of relaying tokens. Lease and
access-mode mechanics, panel lifecycle outcomes, and human-control rules are
owned by
[Agent coordination architecture](../agent/agent-coordination.md#leases-and-access-modes);
the mandates below stay in force:

- A running Bitty process is a workspace for a team, each Workspace is a floor, and each Panel is a workstation with a stable id, a human-readable title or description, and a lease state (`Idle` or `Occupied(agent-id)`), reusing the accepted Stable Id hierarchy (`Instance -> Window -> Workspace -> View -> Terminal`) instead of inventing a parallel one. An agent acquires a panel for a bounded period and releases it; a second agent or the human can take over an idle panel, and presentation stays non-authoritative.
- The underlying model is `Agent --owns/observes--> ExecutionContext {TerminalExecution, BrowserExecution, TaskExecution, ToolExecution} <--presents/interacts-- Panel`: one agent may hold many panels, one panel may present several executions, and a background agent may hold no panel; lease and roaming vocabulary stays a UX metaphor, never the core agent ontology.
- Suspension preserves the panel's PTY and presentation generation state so a later participant resumes from the visible scene; collapsed or hidden output stays in the terminal, and a consuming agent requests only bounded semantic-zone summaries through the existing context-provider path rather than copying full buffers. A human on the same canvas can take over or hand work back under the same lease vocabulary.
- The panel lease, description, and handoff contract is tracked as [OQ-083](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md); role panels, event kinds, and lifecycle coupling remain [OQ-058](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md); the execution model and identifier relationships are tracked as [OQ-084](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md). No lease, description, roaming, or handoff mechanism is implemented today. Candidate identity kernels landed in `bitty` CTX-0711/#1304 (`crates/bitty-plugin-host/src/identity.rs`, in `origin/main` at `c01f538`: Instance/Workspace/Panel and related entity names as data, conferring no authority) — Implemented-only evidence; OQ-084 stays open.

## Security alignment and traceability

| Draft element                                                      | Normative gate it refines                                     | Threat / Risk IDs             |
| ------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------- |
| ModelProvider `ai.model` registry and scopes                       | P0-AC-024, P0-AC-026, invariant 6, private transport auth     | T-10, R-013, R-014            |
| ContextProvider and Stable Id hierarchy                            | Dispatcher scoping, per-client attribution                    | T-09, R-011                   |
| Context budget and request contract (CP-5/CP-6) and RC-10 chunking | Bounded inputs, invariant 7, RC-9/RC-10                       | T-01                          |
| Semantic zones as provider boundary                                | Terminal Truth preservation, presentation-only rule           | T-02, R-008                   |
| Agent four levels with per-level consent                           | Least privilege, no ambient authority, invariant 5/6          | T-09, T-10, R-011, R-013      |
| AgentWorkspace ephemerality and scoping                            | Per-plugin isolation, containment FS-3, capability-checked FS | R-006, R-007                  |
| Rich streaming via `bitty-rich` scene                              | Presentation never Terminal Truth, no hot-path execution      | invariant 3/4, T-05           |
| Tool Bus MCP adapter and host-only execution                       | Confused-deputy defense, untrusted labeling, P0-AC-024        | T-10, R-013                   |
| Privacy-first and No self-accept                                   | Necessity of independent review lifecycle                     | R-014, Documentation workflow |

No draft element weakens a normative P0 gate. Any discovered conflict returns the conflicting clause to revision rather than downgrading the gate.

## Verification plan

All criteria are **proposed** and become acceptance gates only when the implementation phase implements them.

### ModelProvider operations

- Given any registry content and caller scopes, `list_models` reflects exactly the granted models, `complete` respects the Context Budget before I/O, and `stream` obeys RC-10 chunking and `seq`/`total` invariants. Cancellation before dispatch starts no effects; after dispatch it prevents new admission and reports completed or Unknown effects for reconciliation without a rollback claim. Verification: `unit` + `adversarial` with registry/scope matrix, budget-exceeded corpus, concurrent-stream sweep, and cancellation races on both sides of dispatch.

### ContextProvider and Stable Ids

- Given workspace/project/git/diagnostics/terminal fixtures across Instance/Window/Workspace/View/Terminal, context assembly at the CP-5 budget respects the Stable Id set, zone-scoped terminal requests return only the declared zone bytes, and attribution carries the full Stable Id path and generation. Forged Stable Ids without transport auth gain no authority. Verification: `integration` + `adversarial` (hierarchy enumeration, forged-id probes, cross-workspace grant matrix).

### Context Budget and semantic zones

- Given maximal provider outputs and overflow, truncation honors declared priority, emits counted `truncated_bytes` and `truncated_providers[]`, and never exceeds the resolved CP-5 budget delivered; zone-scoped terminal scrapes never silently expand to full scrollback. Verification: `unit` with budget-boundary sweep and zone-scoped snapshot matrix.

### Agent levels

- Given authenticated sessions at each level, every out-of-tier action (for example `inspect` attempting `workspace.write` or `self` attempting cross-workspace `all`) is denied server-side regardless of client-asserted level, replay, or batching. Verification: `adversarial` full level x action matrix plus mutated-level corpus.

### AgentWorkspace ephemerality

- Given sessions with and without `self` and above, `AgentWorkspace` is created only at `self` or above, scoped to `(AgentId, generation)` with traversal denied, and removed at `Completed`/`Failed`/`Canceled`/`dispose` with no sibling leakage. Verification: `integration` with filesystem-namespace assertions and lifecycle storm.

### Rich streaming verification

- Given streaming `Markdown`/`Diff`/`ToolCard` turns, each chunk is at most `256 KiB`, carries correct `seq`/`total`/`final`, posts exactly one dirty `RichBlock`, remains selectable/searchable/accessible after composition, and never blocks a hot path within the PB-4 tail budget. Verification: `unit` + `integration` + `adversarial` (chunk-size sweep, damage assertions, accessibility and search-index checks, latency probes during stream).

### Tool Bus MCP verification

- Given registered and unregistered tools, validation closes before dispatch, per-tool consent is required, silent tool expansion after update is blocked by the permission-diff flow, and rate/concurrency caps match RC-9. Verification: `unit` + `adversarial` (unknown-tool corpus, argument-schema violation suite, consent matrix, update-diff probe, rate and concurrency sweep).

### Privacy-first verification

- Given seeded secrets across provider credentials, clipboard, environment, and terminal text, typed `SecretField` redaction removes them before queueing, mode `0600` is asserted on files, and export preview equals actual export byte-for-byte, while elevation grants are per-client and revokable with immediate detachment and auditable receipt. Verification: `unit` + `manual-audit` with secret corpuses, permission and preview assertions, and revocation-lifecycle suite.

## Alternatives considered

| Alternative                                              | Why rejected or deferred                                                                                                                                                                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core-owned model client with ambient network authority   | Binds the terminal core to a vendor and widens the network attack surface beyond per-provider consent. The host-owned registry with per-provider `privacy_class` and `network.connect` consent preserves the plugin boundary. |
| Implicit context gathering from working directory        | Would send unbounded files by default and bypass minimization and CP-5 budgeting. Explicit Stable Id addressing plus provider enumeration keeps collection intentional and auditable.                                         |
| Bundled `all` level for agents                           | Violates least privilege by silently granting cross-workspace and cross-window authority when only local assistance was intended. Separate per-target grants keep elevation narrow and revokable.                             |
| AgentWorkspace as persistent project subdirectory        | Creates durable ambient state and widens traversal risk. The ephemeral per-session directory disposed at session close limits the blast radius and keeps the project tree the system of record.                               |
| Bypassing Rich Presentation for agent output             | Would fork the renderer and lose selection, search, accessibility, and damage guarantees. Rich streaming through `bitty-rich` `Scene` composition reuses the single scene path and its contracts.                             |
| Widening Tool Bus to direct process or filesystem spools | Direct host spools bypass MCP's narrow, auditable tool schema. Keeping execution host-mediated while MCP carries the vocabulary maintains the capability and consent separation.                                              |
| Publishing agent turns to disk without consent           | Contradicts minimization and invariant 9. Disk writes require explicit `debug.trace` or workspace consent, remain user-only `0600`, and stay previewable before export.                                                       |

## Open items

These are out of this draft and remain tracked as follow-up work; they must not be silently chosen by implementation.

**Phase-2 extraction backlog (CTX-0090 phase 1).** This document was slimmed
into an architecture spine by replacing copied mechanism detail with normative
summaries and routes to owning topic documents. The sections below keep detail
here only because no dedicated owning document exists yet; each is scheduled
for a future phase-2 extraction and must not be deleted before its owner lands:

- Candidate runtime contracts without an owner: progressive discovery, context planes and memory temperature, frozen sessions and instruction epochs, fresh child sessions and Delegation Graph, execution profiles/targets/provider negotiation, Tool Bus programmatic calls, tool-call batching, changes/outcomes/restore boundaries, transactional edit and workspace overlay, hook authority and observation labeling, agent growth pipeline, semantic output compression, semantic execution results, evidence and provenance, and the candidate build sequence.
- AI workspace composition and the workspace-anchored multi-agent runtime candidates, which still mix panel/lease detail owned by [Agent coordination architecture](../agent/agent-coordination.md) with terminal-platform presentation contracts outside this repository.
- Sub-platform staging (BA-1..BA-6), including the BA-4 crate layout and BA-6 pressure-test gate, pending the `bitty-ai` staging decision and the R1/R2 dispositions.
- Tool Bus command risk classification (CRA-1..CRA-5) and the scrubbing evidence summary, pending a dedicated tool-transport or command-audit document.
- Rich streaming, whose `bitty-rich` scene contracts live in the terminal-platform repository and may later move there entirely.

- Whether the `ai.model` registry stores per-model token or cost accounting locally and how that accounting charges against PB-1/PB-2.
- Whether `AgentWorkspace` receives an explicit size or time quota beyond the bounded default and how eviction interacts with long-running diff streams.
- Whether semantic-zone context may include synthesized `RichBlock` text that was produced by another plugin or only raw terminal zone bytes.
- Whether the Tool Bus gains a streaming tool-result subscription or remains strictly request-response with RC-10 chunking.
- How instance/window/workspace/view/terminal Stable Ids surface across multi-session hosts when windows migrate between instances.
- Whether the `all` level requires an OS-level authorization primitive on certain platforms beyond the Bitty consent ledger.
- Retention and audit-log lifetime for agent turns, tool results, and elevated context (remains an open item; no normative retention period is set by this draft).
- Whether `bitty-ai` repository creation, the BA-4 crate layout, and the BA-6 pressure-test gate enter acceptance with this RFC or as a separate `bitty-ai` staging decision.

The 2026-09-13 consolidation records register these cross-document questions
(all tracked in the [open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)):
OQ-054/OQ-055 (provider credentials), OQ-057 (role capability mapping and
enforcement), OQ-058 (spatial panel topology and event routing), OQ-059
(semantic output compression and budget interaction), OQ-060 (CarryCtx
durable-task integration), OQ-061 (agent identity separation), OQ-062
(progressive code reading and repository index) with OQ-063 (language-service
integration extended with user-provisioned tools and fast-feedback
diagnostics), OQ-064 (transactional edit and workspace overlay), OQ-065
(evidence and provenance), OQ-066 (context budget profiles), OQ-067 (native
agent services and tool projection), OQ-068 (the renamed `.wheel/` project
directory), OQ-069 (role/model/capability orthogonality), OQ-070 (agent growth
pipeline), OQ-071 (tool-call batching), OQ-084 (Panel/Execution separation and
core ontology), and OQ-085 (sandbox trust-level model). They also add the
platform-stack picture, the CarryCtx-as-optional-backend caveat, the Warp
comparison dimensions, the build sequence, the token-first context contract
extending OQ-066, and the Lua-orchestration boundary; provider-convention
refinements live in
[Plugin reuse and providers](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-reuse-and-providers.md)
and the RichSurface refinement in the
[Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md).
None of these additions changes the draft status of this document or the
accepted contracts it cites.

These are not blockers for this draft; they will be decided in a follow-up Agent or Tool Bus amendment with independent review.

## Acceptance criteria

This RFC is **draft**. It does not self-accept and does not close an open question beyond its linkage to [OQ-018](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md). The lifecycle is `Draft -> experimental review evidence -> Accepted -> normative`; only `Accepted` or `normative` documents authorize shipped, stable, or compatibility-guaranteed behavior. Draft text carries no compatibility promise and does not form public reference.

Acceptance will require:

1. Independent review by the security-reviewer, a category-owner for `architecture` or `agent`, and the docs-curator accepts the ModelProvider (`list_models`/`complete`/`stream`/`cancel`), ContextProvider providers and the token-first context-budget contract, Stable Id hierarchy, semantic-zone integration, four Agent levels with per-level consent, ephemeral AgentWorkspace, Rich streaming (Markdown/Diff/ToolCard), Tool Bus MCP, and privacy-first controls without weakening any normative P0 gate.
2. The same change synchronizes the open-question register only if an open question for AI architecture exists; this draft does not move OQ-018 from `Accepted` and instead records its reuse of the OQ-018 contracts.
3. The specifications index records this document as `Draft` until independent review moves its frontmatter to `accepted`.
4. Verification criteria above have headless or integration evidence before any claim of shipped behavior.

## References

- Bitty topic evidence this RFC extends: [Product vision](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/product/vision.md), [Architecture Overview](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/overview.md), [Core and Plugin Boundaries](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/core-boundaries.md), [Plugin System](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/plugin-system.md), [Rich Content](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/interfaces/rich-content.md), [CLI](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/interfaces/cli.md), [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md), [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md), [P0 Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md), [Technology Strategy](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/technology-strategy.md).
- Prior RFCs this RFC composes with: [IPC and Agent RFC](../specifications/ipc-agent-rfc.md), [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md), [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md), [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/isolation-resource-rfc.md), [Configuration Model RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/configuration-model-rfc.md), [CLI Contract RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/cli-contract-rfc.md), [DevTools RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/devtools-rfc.md).
- Related deferred direction: [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) keeps headless daemon and remote UI work post-v1.0; [Reference Project Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/reference-projects.md) defines how local snapshots are used as untrusted research evidence. The panel vision is not yet present on this branch, so no link is asserted here.
