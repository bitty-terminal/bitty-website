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

> Status: **draft** (frontmatter `draft`) for post-1.0 AI architecture covering ModelProvider, ContextProvider, Tool Bus, and Agent layers. This document proposes the ModelProvider (`ai.model` `list_models`/`complete`/`stream`/`cancel`), ContextProvider (workspace, project, git, diagnostics, terminal) with Stable Id hierarchy Instance/Window/Workspace/View/Terminal, Context Budget 32 KiB, and semantic zones, Agent four levels (inspect/self/workspace/all), ephemeral AgentWorkspace, Rich streaming (Markdown/Diff/ToolCard), Tool Bus via MCP, and privacy-first controls. It does not describe implemented behavior, does not authorize shipped, stable, normative, or compatibility-guaranteed behavior, and does not close [OQ-018](../decisions/open-questions.md) which remains closed by [IPC and Agent RFC](ipc-agent-rfc.md) on 2026-08-29. Experimental implementation may exist as review evidence but carries no compatibility promise and does not constitute acceptance. Acceptance requires independent category-owner, docs-curator, and security-reviewer evidence. Lifecycle is `Draft -> experimental review evidence -> Accepted -> normative`.

## Purpose and scope

Bitty is an agent-friendly, not agent-centric terminal. [Product vision](../product/vision.md) and [Core and Plugin Boundaries](../architecture/core-boundaries.md) keep AI and Agent experiences outside the terminal core as optional integrations, preferentially in plugins, while [IPC and Agent RFC](ipc-agent-rfc.md) already defines the accepted bounded IPC framing, wire, auth, scopes, and bounded `AgentMessage`/`AgentObservation`/`SideQueue`/`AgentSession` contracts that close [OQ-018](../decisions/open-questions.md) at the design level.

This specification extends that baseline for post-1.0 AI work. It answers how a model, context, tool, and agent layer compose without entering the terminal, render, or input hot paths, without binding the core to a model vendor or prompt system, and without weakening the privacy, capability, or budget controls already normative.

In scope:

- **ModelProvider** (`ai.model`): provider registry, model capability negotiation, `list_models`, `complete`, `stream`, and `cancel` operations, budgets, and privacy handling.
- **ContextProvider**: discrete providers for workspace, project, git, diagnostics, and terminal snapshot sources, their Stable Id addressing, Context Budget, and semantic-zone awareness.
- **Stable Id hierarchy**: `Instance` / `Window` / `Workspace` / `View` / `Terminal` identity model and its use for selection, attribution, and consent scoping.
- **Context Budget**: 32 KiB budgeted context assembly per agent turn, with attribution, truncation, and chunking rules.
- **Semantic zones** as context boundaries derived from shell-integration OSC 7/133.
- **Agent**: four levels `inspect` / `self` / `workspace` / `all`, their capability implications, and generation-scoped ownership.
- **AgentWorkspace**: ephemeral, capability-scoped working directory and its lifecycle.
- **Rich streaming**: Markdown, Diff, and ToolCard rendering via the Rich Presentation scene, with incremental damage, selection, and accessibility.
- **Tool Bus**: MCP adapter as the tool transport, registry, validation, and consent-bound dispatch.
- **Privacy-first** posture: minimization, typed redaction, per-scope consent, and the prohibition of self-acceptance.

Out of scope (owned elsewhere):

- IPC transport, framing, peer-credential auth, per-request scope evaluation, and RC-9/RC-10 (owned by [IPC and Agent RFC](ipc-agent-rfc.md) under OQ-018).
- Rich-block, scene, image, and structured-transport renderer contracts beyond the Rich streaming integration (owned by [Rich Presentation RFC](rich-presentation-rfc.md) under OQ-008/OQ-015/OQ-016).
- Plugin API v1 namespaces, capability grammar, manifest schema, event pipeline classes, and lifecycle generations (owned by [Plugin Platform RFC](plugin-platform-rfc.md) under OQ-011/OQ-012/OQ-013).
- Per-plugin instruction, CPU, memory, queue, and task enforcement mechanics (owned by [Isolation Resource RFC](isolation-resource-rfc.md) under OQ-014).
- Lua runtime, standard-library subset, module resolution, and diagnostics (owned by [Lua Runtime RFC](lua-runtime-rfc.md) and [ADR 0005](../decisions/adrs/ADR-0005-lua-pins-and-stdlib.md), [ADR 0006](../decisions/adrs/ADR-0006-os-env-policy.md), [ADR 0007](../decisions/adrs/ADR-0007-async-gc.md)).
- Configuration pipeline, layers, and project-trust mechanics (owned by [Configuration Model RFC](configuration-model-rfc.md) under OQ-010).
- CLI grammar, command registry, and exit codes (owned by [CLI Contract RFC](cli-contract-rfc.md) under OQ-017).

This document introduces no new trust boundary. Every transition into a privileged host primitive stays behind the capability, scope, budget, and consent gates already normative in the security corpus.

## Normative sources this specification must not weaken

- [Security Overview](../security/overview.md): default posture that PTY, plugins, projects, IPC/MCP/Agent, packages, and reference repos are untrusted until a narrow grant, invariants 1 through 10, trust-boundary table, capability families, and the rule that deferral must not create a bypass.
- [Threat Model](../security/threat-model.md): boundary map `PTY bytes | Lua plugin | IPC/MCP -> Bitty core`, section `MCP, Agents, and DevTools` (T-10, R-013) with untrusted-observation labeling, and section `IPC, CLI, and child processes` (T-09, R-011, R-012).
- [Security Risk Register](../security/risk-register.md): R-011 (IPC scope escalation), R-012 (child credential leak), R-013 (confused deputy via terminal output), R-014 (secret exposure via traces).
- [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md): P0-AC-021 through P0-AC-026, P0-AC-013, and the verification-method conventions.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md): mechanism versus policy split, Terminal Truth ownership, declarative UI, two security domains (`TerminalSecurityPolicy` versus `PluginCapabilities`), and the rule that AI and Agent layers remain outside the core.
- [Architecture Overview](../architecture/overview.md): the candidate data-flow invariants, the one-way DAG rule for layers, and the spine `bitty-ipc` / `bitty-agent` placement (the `bitty-agent` crate remains `Implemented` but not yet `Verified` and does not imply shipped behavior).
- [IPC and Agent RFC](ipc-agent-rfc.md): bounded framing 256 KiB, channel caps, wire envelope v1, peer-credential auth, scope families, RC-9/RC-10, `AgentId`/`AgentMessage`/`AgentObservation`/`SideQueue`/`AgentSession`, consent ledger, and streaming chunking that this RFC reuses without redefining caps.
- [Rich Presentation RFC](rich-presentation-rfc.md): `ImageStore`/`ImagePlacement`, `RichBlock`/`Scene`/`SceneNode`/`SemanticZone`/`BlockAnchor`, scene snapshot and damage contracts, and structured-transport authentication that Rich streaming rides on.
- [Plugin Platform RFC](plugin-platform-rfc.md): manifest, capability identifiers, lifecycle generations, and the authoritative three-level queue budgets (PerSubscription 64 / PerPlugin 1024 events or 256 KiB / Global 8192 events or 2 MiB) with DropOldest default.
- [Isolation Resource RFC](isolation-resource-rfc.md): budget dimensions RC-1, RC-2, RC-4, RC-5, and failure semantics FS-1 through FS-9 that bound provider and agent execution.
- [Plugin System](../extensibility/plugin-system.md) and [Rich Content](../interfaces/rich-content.md): terminal surface versus rich surface versus overlay surface, explicit semantic source requirement, and level-2 versus level-3 presentation distinction.

Where this RFC picks a threshold or encoding, it refines those sources. It does not move a requirement between owners and, if a mechanism here weakens a normative control, the normative text wins and this RFC must be corrected.

## Terminology

| Term               | Meaning                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| ModelProvider      | Host-owned registry of LLM providers and models exposed via `ai.model`, with per-model capability and budget metadata.                               |
| ContextProvider    | Host-owned source of bounded context for an agent turn, one of workspace, project, git, diagnostics, or terminal.                                    |
| Stable Id          | Persistent, cross-restart identifier for one of Instance, Window, Workspace, View, or Terminal, used for attribution and scoping.                    |
| SemanticZone       | Core-owned boundary record (prompt, input, command, output) derived from OSC 7/133, owned by terminal state and consumed by rich and context layers. |
| Context Budget     | Per-turn byte ceiling for assembled context, 32 KiB in this RFC, with counted truncation and chunking to Rich streaming.                             |
| Agent level        | Attenuated authority tier: `inspect`, `self`, `workspace`, or `all`, each implying a distinct capability set.                                        |
| AgentWorkspace     | Ephemeral, per-session working directory scoped to one `AgentId` and one generation, disposed at session close.                                      |
| Rich streaming     | Incremental delivery of agent output as Markdown, Diff, or ToolCard `Scene` fragments with damage tracking.                                          |
| Tool Bus           | Capability-checked dispatch surface where agent tool calls are validated, consented, and forwarded via the MCP adapter.                              |
| bitty-ai           | Candidate independent AI sub-platform repository (Rust workspace plus Lua AI plugins) built only on generic Bitty primitives; not Core.              |
| Bridge             | Candidate scoped-IPC process boundary between the Bitty host and the bitty-ai runtime; never an in-process native load.                              |
| Pressure-test gate | Candidate architecture rule: bitty-ai must build on generic primitives, so a new Core AI-specific API demand signals a Plugin API abstraction gap.   |

## ModelProvider

Status: **proposed contract**. Numbered for reference; none is implemented by this RFC alone.

### Ownership and registry

- **MP-1 Registry ownership.** `ai.model` registry is host-owned and host-validated. Provider plugins register via `services.provided: ai.model` declaring a versioned interface; the host validates `provider_id`, `privacy_class`, and `capabilities` before registration and rejects ambient or undeclared registration. Plugins and project configuration that do not provide `ai.model` may request models but may not mutate capability metadata or bypass the registry. The registry lives in Rust (`bitty-agent` or `bitty-runtime`, owning crate deferred) and is exposed to Lua via a narrow `ai.model` host API under the same capability discipline as other privileged services.
- **MP-2 Provider descriptor.** Each provider entry records `provider_id` (bounded `owner.name`, `<= 64` bytes, `^[a-z][a-z0-9_-]*$`) — for example (non-normative) `bitty-openai`, `bitty-anthropic`, or `bitty-ollama` provider plugins — transport kind (`local`, `remote`), `models[]`, per-model `capabilities` (text, streaming, tool-use, vision), `context_window`, `cost_marks`, and `privacy_class` (`local-only`, `network-minimized`, `upload-notice`). Unrecognized fields fail closed.
- **MP-3 Local-first default.** No network call exists until the user selects a provider whose `privacy_class` permits it and the corresponding network capability (`network.connect`) is granted. A provider marked `local-only` never performs network I/O. Example providers (non-normative) include `bitty-openai`, `bitty-anthropic`, and `bitty-ollama` as `services.provided: ai.model` plugins validated by the host.

### Operations

- **MP-4 `list_models`.** `ai.model.list_models()` returns the registry snapshot filtered to models whose capability set is compatible with the caller's granted scopes. No secret material is returned; API keys, if any, are never inline in the list.
- **MP-5 `complete`.** `ai.model.complete({ model, messages, context_refs, tools })` executes one synchronous turn. `model` must name a registry-known model, `messages` is bounded `<= 32 KiB` combined, `context_refs` enumerates Stable Ids resolved server-side, and `tools` enumerates Tool Bus names validated against the caller's Tool Bus consent. A request that would exceed the Context Budget fails at the boundary with a typed `BudgetExceeded` before provider I/O.
- **MP-6 `stream`.** `ai.model.stream({ model, messages, context_refs, tools })` returns a chunked `StreamHandle` where each chunk is a Rich streaming fragment (`Markdown`, `Diff`, or `ToolCard`) at most `256 KiB` decoded bytes, carrying `seq`/`total`/`final`, matching RC-10 chunking and the framing discipline from [IPC and Agent RFC](ipc-agent-rfc.md). Backpressure sheds oldest buffered chunks with a countable metric; there is no silent loss for request/response acknowledgement.
- **MP-7 `cancel`.** `ai.model.cancel(handle)` is idempotent and fail-closed: it abandons the provider request, drops buffered chunks, increments a cancellation metric, and leaves no partial tool dispatch. Cancellation may be invoked at any chunk boundary.
- **MP-8 Deterministic timeouts.** Every provider call carries `now_ms` from the caller and observes `DEFAULT_REQUEST_TIMEOUT_MS = 5 s`, `DEFAULT_MCP_TIMEOUT_MS = 10 s` for tool-mediated streaming, and hard ceiling `MAX_REQUEST_TIMEOUT_MS = 30 s`, checked deterministically, reusing the timeout discipline already accepted for IPC.

### Budgets, cross-RFC sharing, and redaction

- **MP-9 Budget sharing.** ModelProvider I/O is charged against the same per-client quotas as IPC/MCP: frame `256 KiB`, buffered bytes `512 KiB`, channel caps, concurrency `16`, and RC-9/RC-10. A separate model-specific ceiling is not introduced as a new RC; instead the RFC states the sharing rule so tests can assert it.
- **MP-10 API-key handling.** Provider credentials are stored in user-only storage (mode `0600`), never in `BITTY_*` environment, discovery files, trace files, or `AgentWorkspace`, are redacted by typed `SecretField` before any diagnostic, trace, or snapshot, and require a dedicated `ai.provider` consent distinct from `ai.stream` and from Tool Bus scopes. Invariant 9 and P0-AC-026 apply whole.
- **MP-11 Failure isolation.** A fault in one ModelProvider call affects only its owning session; sibling sessions, terminals, and plugin VMs remain responsive (FS-3 containment parity with [IPC and Agent RFC](ipc-agent-rfc.md) FS-IP3).

## ContextProvider

Status: **proposed contract**.

### Provider set

| Provider      | Source                                                                                     | Privacy class default  | Consumed by                                                      |
| ------------- | ------------------------------------------------------------------------------------------ | ---------------------- | ---------------------------------------------------------------- |
| `workspace`   | User workspace metadata (open paths, editor selections where available)                    | `local-only`           | agent turn context                                               |
| `project`     | Project declarative config plus trusted project manifest data, never project Lua execution | `local-only`           | context budget assembly                                          |
| `git`         | Bounded `git status`, diff stat, recent log subjects, branch name, no raw blobs by default | `local-only`           | context budget assembly                                          |
| `diagnostics` | Bounded diagnostics from `bitty-lua`, `bitty-config`, and host (`syntax`, `validation`)    | `inspect`              | context budget and trace preview                                 |
| `terminal`    | Bounded terminal snapshot or semantic-zone-scoped scrape, flagged `is_untrusted_surface`   | `untrusted` / redacted | agent observation via [IPC and Agent RFC](ipc-agent-rfc.md) path |

No other provider exists in v1. Adding a provider requires a reviewed amendment to this RFC; plugins may not implicitly register or replace host-owned providers. A future plugin may provide a versioned, capability-checked service consumed by `CodeContextProvider`, but that service does not register or replace the provider.

### Stable Id hierarchy

- **CP-1 Hierarchy.** The stable hierarchy is `Instance` (running Bitty process) -> `Window` (top-level platform window) -> `Workspace` (logical tab or workspace container) -> `View` (viewport onto a Terminal) -> `Terminal` (PTY-backed grid). Each level carries a typed Stable Id (`instance_id`, `window_id`, `workspace_id`, `view_id`, `terminal_id`) that survives restarts where the underlying platform permits, is unique within its parent, and is validated at construction (bounded `<= 64` bytes, `^[a-z0-9_-]+$`).
- **CP-2 Addressing.** Context resolution is always explicit: a request names one or more Stable Ids; no ambient `current terminal` is inferred beyond the explicit selection precedence already accepted in [IPC and Agent RFC](ipc-agent-rfc.md). Forged identifiers without the corresponding transport authentication and capability grant still fail closed at the server-side scope check.
- **CP-3 Attribution.** Every context record carries `owner` (Stable Id path), `generation`, `collected_at` (`now_ms`), and `provider` name, so enforcement, consent revocation, and traces can attribute exactly which terminal or workspace contributed which bytes.
- **CP-4 Cross-level consent.** Terminal-scoped context requires `agent.context.terminal` consent scoped to that `Terminal`; workspace-scoped assembly requires `agent.context.workspace`; cross-window or cross-instance assembly requires the target scope plus an explicit per-target grant. There is no bundled `all` grant that silently implies sibling terminals.

### Context Budget 32 KiB

- **CP-5 Budget.** Each agent turn assembles at most `32 KiB` of context bytes combined across all providers. The host computes the budget before any provider I/O leaves the machine. Excess is truncated per provider in declared priority order (diagnostics and terminal semantic-zone text truncate first, project and git last), with a counted `truncated_bytes` and `truncated_providers[]` record.
- **CP-6 Chunking.** If the assembled budget exceeds what fits in one logical message, it is delivered as RC-10 chunks (`256 KiB` ceiling, but practically the 32 KiB budget fits in one chunk; chunking is retained for forward compatibility as `seq`/`total`/`final`). A benign peer's context assembly is not blocked by a hostile peer's large request because quotas are per-client (RC-9 sharing).
- **CP-7 Determinism and testability.** Context assembly is deterministic for a given `now_ms`, provider snapshot, and Stable Id set. Headless tests supply a seeded `now_ms` and in-memory provider snapshots; no wall-clock, filesystem, or network I/O enters the `bitty-agent` budget computation.

### Semantic zones

- **CP-8 Zone source.** Semantic zones are the authoritative terminal-state boundaries already accepted in [Rich Presentation RFC](rich-presentation-rfc.md) and produced by the terminal state machine under OQ-007, derived from OSC 7 (cwd) / OSC 133 (prompt/input/command/output) marks, each with `line_id` anchoring and ordering. The ContextProvider does not parse PTY bytes to invent zones; it consumes the core-owned `SemanticZone` records derived from OSC 7 (cwd) / OSC 133 (prompt/input/command/output) marks.
- **CP-9 Zone-scoped context.** Terminal context may be requested as `zone: Prompt | Input | Command | Output` with optional `line_id` range. The provider returns only bytes within that zone, truncated at zone boundaries, so a model never receives unbounded scrollback as an implicit default. Full-scrollback or alternate-screen scraping is denied unless the caller holds an explicit `terminal.inspect` plus a per-generation `terminal.raw` elevation and an attributed consent record.
- **CP-10 Rendering separation.** Zone-scoped text is delivered as bounded `TerminalSnapshot` or `TerminalOutput` with `is_untrusted_surface = true` per [IPC and Agent RFC](ipc-agent-rfc.md), preserving the untrusted-observation labeling and T-10/R-013 defenses. The host policy enforces that this data never mixes into instruction or policy channels; string-sniffing inside the agent crate is not relied upon.

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

- **AG-1 Default.** A fresh `(UID, AgentId)` session starts at `inspect` only, matching the read-only Agent default already accepted in [IPC and Agent RFC](ipc-agent-rfc.md). Elevation to `self`, `workspace`, or `all` each requires a separate per-client consent grant recorded in the consent ledger.
- **AG-2 Generation binding.** Agent levels are bound to `(PluginId, generation)` or `(AgentId, generation)` per [Plugin Platform RFC](plugin-platform-rfc.md) generations. A suspend/dispose/reload invalidates prior elevation; re-grant requires a fresh prompt.
- **AG-3 No ambient trust.** Level checks are server-side on every request from the authenticated identity. A client that inserts a `level` field cannot escalate; the server ignores it and evaluates the real consent ledger.
- **AG-4 Least privilege at dispatch.** Each `ToolCall` is authorized against both the caller's Agent level and the tool's required scope. A `workspace` level does not imply `terminal.input.all` / `terminal.manage`, `debug.control`, `config.modify`, `plugin.manage`, or `process.spawn`; `terminal.input.all` / `terminal.manage` remain separate scopes requiring their own consent grant. Those each require their own scope plus consent.

### AgentWorkspace

- **AW-1 Ephemerality.** Each `AgentSession` that holds `self` or above receives one `AgentWorkspace`, an ephemeral per-session directory that is created on demand, isolated to that `(AgentId, generation)`, and removed at session `Completed`/`Failed`/`Canceled` or on explicit `dispose`. No other session, plugin, or generation can address it.
- **AW-2 Scoping.** The workspace is addressable only through narrowly scoped host APIs (`workspace.read`, `workspace.write`, `workspace.list`) that validate the target path stays within the ephemeral root. Absolute paths, directory traversal, and sibling-workspace access fail closed with `Denied/ScopeViolation`. The path never appears in `BITTY_*` environment, discovery files, or traces unless redacted.
- **AW-3 Budget and isolation.** An `AgentWorkspace` obeys the same isolation philosophy as per-plugin isolation: bounded size (`256 KiB` default per workspace, evict oldest with attributed drop), no ambient filesystem authority, and FS-3 containment — a fault or exhaustion affects only the owning session.
- **AW-4 Safe-mode.** `bitty --safe` starts with no `AgentWorkspace`, no third-party provider, and no tool dispatch, matching P0 invariant 10 and FS-IP6 parity.

## Rich streaming

Status: **proposed contract**.

Streaming delivers incremental agent output into the presentation model without inventing a second rendering path. It reuses the scene contracts already accepted in [Rich Presentation RFC](rich-presentation-rfc.md).

- **RS-1 Fragment kinds.** Each streamed chunk carries one fragment kind: `Markdown` (versioned block, selectable, searchable via the Rich Presentation contracts), `Diff` (unified diff with bounded per-hunk text, anchored to a `BlockAnchor`), or `ToolCard` (typed tool-result card with bounded title, status, and key-value rows). `Markdown` is the default; `Diff` and `ToolCard` are used only when semantic anchoring is available.
- **RS-2 Scene integration.** Every fragment maps to a `RichBlock` and `Scene` subtree owned by `bitty-rich` and consumed by `bitty-render`. Composition, snapshot, damage tracking, semantic indexing, and the accessibility tree remain exactly as accepted; this RFC introduces no fork of those contracts.
- **RS-3 Incremental damage.** Streaming emits `Scene` damage per chunk, at most one `RichBlock` dirty per chunk, so the renderer work scales with changed content, not with total history. No chunk triggers a full scene recompute.
- **RS-4 Selection, search, and a11y.** `Markdown`, `Diff`, and `ToolCard` fragments remain selectable, searchable (via the search index), and accessible (via the accessibility tree) once composited, matching the Rich Presentation guarantees for every `RichBlock`. Anchoring uses `SemanticZone` line ids where available.
- **RS-5 Chunking and attribution.** Chunks obey RC-10 (`256 KiB` decoded bytes, `seq`/`total`/`final`). Each streamed logical turn is decomposed into these chunks; reordering or loss is detectable via `seq`. Budget accounting attributes every chunk to its `(AgentId, StreamHandle, generation)`.
- **RS-6 No hot-path execution.** Rich streaming never runs inside the parser, render, or input hot paths synchronously. It is a cold-path composition that posts damage, preserving P0-AC-015 and invariant 4.

## Candidate runtime contracts

Status: **candidate, non-normative, post-v1.0**. The following contracts
organize possible future Agent Runtime work. They are design candidates, not
implementation claims, API commitments, or new authority. They must not be
read as closing an open question, creating a daemon, or changing the accepted
IPC, plugin, isolation, CLI, or security contracts above. Any adopted version
must receive its own review and verification evidence.

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

The existing `ContextProvider` candidate set can be classified into three
separate planes:

| Plane               | Candidate contents                                                                       | Owner distinction                                                          |
| ------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Environment Context | terminal, workspace, git, diagnostics, and execution-target observations                 | `ContextProvider`; current bounded state                                   |
| Knowledge Context   | skills, project instructions, `AGENTS.md`, documentation, and declared provider metadata | `SkillProvider`/instruction or documentation providers; selected knowledge |
| Temporal Context    | current working memory, conversation history, and prior-session search                   | `MemoryProvider` and history provider; time-indexed state                  |

`ContextProvider` is not `MemoryProvider`, and neither is `SkillProvider`.
Their records, consent, freshness, redaction, and storage policies remain
distinct even when a `ContextEngine` assembles them for one turn. A candidate
memory model separates small, curated **hot memory** from **cold history**:
hot memory is explicitly approved, bounded, and stable for a session; complete
conversation history remains searchable in a durable store and is retrieved
only when requested by the task and permitted by policy. History search is not
an excuse to inject an unbounded transcript.

### Frozen sessions and instruction epochs

At session creation, a future `AgentSessionSnapshot` may freeze the selected
`model`, `execution_profile`, instruction sources and hashes, approved memory,
skill metadata, and workspace context. A session generation consumes that
snapshot rather than silently rebuilding its system prefix after every write.
Changes to memory, configuration, skills, or project instructions would take
effect at a later generation by default. A candidate `InstructionEpoch`
identifies the instruction snapshot used by each turn, including source hashes,
so replay, audit, debugging, and evaluation can establish what rules were
visible at that time. Explicit invalidation may begin a new generation, but
must not mutate an already-started turn.

This preserves prompt-cache stability observed in the Hermes snapshot while
remaining subordinate to host policy, consent revocation, and emergency
shutdown. A security revocation is not deferred merely to preserve a cache.

### Context engine and recovery

The candidate `ContextEngine` owns model-context lifecycle rather than durable
conversation storage. Its conceptual operations are `observe_usage`,
`should_compact`, `compact`, and `recover`. Compaction is not deletion: it may
produce a bounded summary and identifier-preserving digest while retaining
paths, revisions, error strings, user messages, and a `RecoveryPointer` into
the historical store. The pointer is a retrieval reference, not permission to
read history.

```text
durable conversation store -> ContextEngine -> active model context
                                      \-> RecoveryPointer -> bounded retrieval
```

Candidate engines may include summarization, provider-native compaction,
lossless retrieval, RAG, or a CarryCtx adapter. Storage and active context
must remain separate so a compaction strategy cannot rewrite the source of
record, and a storage failure cannot produce unbounded model input. Provider
native features are selected only after capability negotiation and host
policy checks.

### Fresh child sessions and AgentTree

Delegation may create a fresh child `AgentSession` with only an explicit goal,
bounded context, selected project instructions, and a separately scoped
workspace or terminal. The child trajectory does not enter the parent
conversation implicitly; a bounded result summary is the explicit handoff.
The candidate invariant is:

```text
ChildAuthority ⊆ ParentAuthority
ChildAuthority = ParentAuthority ∩ RequestedAuthority - DelegationForbidden
```

Child sessions must not inherit authority merely because the parent has it.
For example, memory writes, outbound messaging, scheduling, clarification,
or further delegation may be forbidden by the child profile even when the
parent can request them. Every child still receives server-side scope checks,
bounded resources, independent cancellation, and the accepted isolation
failure semantics.

An `AgentTree` candidate attributes `AgentSession`, `parent_id`, `root_id`,
generation, role, state, capabilities, workspace, terminal IDs, turns,
actions, tool calls, and background processes. This supports a panel or CLI
tree without making presentation authoritative. Attribution answers which
agent and turn initiated an action; it does not grant that agent authority.

### Execution profiles, targets, and provider negotiation

An `ExecutionProfile` may select model roles such as `planner`, `executor`,
`reviewer`, `summarizer`, `router`, `vision`, or `approval-reviewer`, rather
than assuming one model per Agent. Routing may consider quality, cost,
latency, context length, availability, privacy, and local/remote policy.

Providers would advertise a typed `ModelCapabilities` descriptor, for example
streaming, tool calls, reasoning state, native compaction, programmatic tools,
subagents, and vision. The host selects a provider-native path when its
capabilities and policy permit it, otherwise a reviewed host/plugin fallback,
and otherwise returns unsupported. Model names must not be security or feature
switches.

An `ExecutionTarget` may eventually unify local, SSH, container, and sandbox
backends behind one target identity shared by Terminal, Agent, file, Git, and
process surfaces. The target does not grant access: filesystem, network,
process, environment, credential, CPU, memory, disk, process-count, wall-time,
PTY, and device dimensions remain separately bounded. SSH credentials and
scope tokens follow the existing child-environment and P0-AC-023 rules. This
is a target abstraction, not a headless-daemon or remote-UI commitment; the
post-v1.0 deferral and trust-boundary gate in [ADR 0008](../decisions/adrs/ADR-0008-headless.md)
remain authoritative.

### Tool Bus programmatic calls and availability

The Tool Bus may expose bounded programmatic calls from an isolated
`AgentWorkspace` or helper process. A small program could call several tools
through IPC and return an aggregate, reducing transcript expansion, but the
program receives no unrestricted filesystem or network authority. Each call
still traverses the host Tool Bus, schema validation, authenticated IPC,
capability and consent checks, quotas, and untrusted-observation labeling.

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
consent, policy, and resource enforcement.

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

A candidate `CodeContextProvider` would expose semantic repository context
such as symbols, references, imports, diagnostics, changed files, and a
repository map instead of reading every source file. Its implementation may
use a compiler, LSP, tree-sitter, language service, analyzer, or a future
versioned capability-checked plugin service consumed by the provider. The
`CodeContextProvider` itself remains host-owned: a plugin cannot implicitly
register or replace it. The AI layer should consume one bounded, attributed
contract. It remains read-only by default and does not make source text
trusted.

A candidate `ai.verifier` service could expose project-defined checks and
bounded results, such as format, lint, test, or type-check commands. The
project or plugin defines policy; the host still authorizes execution and
applies target and isolation limits. A verification result is evidence, not an
automatic approval or permission grant. Neither service claims implementation
in Bitty today.

## Tool Bus

Status: **proposed contract**.

The Tool Bus is the host-owned dispatch surface where agent tool calls are validated, consented, and forwarded. The MCP adapter is the transport.

- **TB-1 MCP as adapter.** MCP remains an adapter, not an internal protocol, per [Architecture Overview](../architecture/overview.md) and [IPC and Agent RFC](ipc-agent-rfc.md). The adapter translates `ToolCall` values into MCP operations and labels every terminal-content-bearing response as untrusted observation, preserving P0-AC-024 and T-10.
- **TB-2 ToolSpec registry.** `ToolSpec` declares `name` (`<= 64` bytes, `^[a-z][a-z0-9_]*$` within the owner namespace), `description` (`<= 512` bytes), and JSON Schema (`<= 16 KiB`), bounded as already accepted for `bitty-agent` tool vocabulary. The registry is a bounded map of at most `32` specs per session.
- **TB-3 Validation before dispatch.** Every `ToolCall` is validated against the registry before any host dispatch (unknown tool fails closed). `arguments` (`<= 16 KiB` JSON) are schema-validated; an arguments violation fails whole with a typed error and no partial state.
- **TB-4 Capability and consent per tool.** Each tool declares a required capability (for example `workspace.write`, `git.read`, `diagnostics.read`, `terminal.inspect`) and an optional per-tool privacy gate. Possession of `ai.model.stream` does not imply any tool authority. Using a tool requires both the capability and a separate per-client tool consent grant, ledgered as `who, agent_id, tool_name, granted_at, expires_at, granted_by`.
- **TB-5 No silent tool expansion.** When a plugin or model package updates and advertises a new tool, activation blocks and requires the permission-diff flow (R-016 parity). System and distribution policy pin maxima and cannot be weakened by user configuration.
- **TB-6 Budgets and backpressure.** Tool Bus dispatch reuses RC-9/RC-10 sharing: at most `8` tool calls per assistant turn, each result `<= 16 KiB`, per-connection rate and concurrency caps apply, and observation streams drop oldest with counted metrics. Long tool outputs are chunked at RC-10.
- **TB-7 Host execution only.** The `bitty-agent` crate never executes a tool. `ToolRegistry::stub_invoke` exists only for deterministic tests. Real execution happens in the host/runtime that mediates capability-checked dispatch, rate limits, per-client scopes, consent prompts, and audit — matching the separation already accepted for `bitty-agent`.

### Tool Bus scrubbing implementation evidence (bitty #370)

Status: **experimental review evidence only.** The milestone merged in `bitty`
`a2d127b` (CTX-0216, PR #370, `crates/bitty-agent/src/tool.rs`); the full API
record is in the
[IPC and Agent RFC](ipc-agent-rfc.md#credential-scrubbing-implementation-evidence-bitty-370).
It does not promote this draft beyond `draft`, does not implement the runtime
Tool Bus, and does not satisfy TB-4 or TB-7 (capability, consent, and audit
remain deferred to the host).

What it demonstrates for this architecture:

1. **PP-2 redaction is implementable at the tool boundary.** Stored
   `ToolCall::arguments` and `ToolResult::content` remain raw for dispatch, but
   every log/IPC view passes through key- and pattern-based redaction
   (`[redacted]` for sensitive keys; PEM/JWT/token-prefix scanning for
   unstructured text), with `Debug` redacting by design. This is the
   `bitty-agent` half of P0-AC-026 parity; the typed `SecretField` markers
   required by PP-2 remain the accepted target.
2. **TB-3/TB-6 bounds hold.** Scrubbed views respect the already-accepted
   `16 KiB` argument/result caps, so redaction does not widen bounded
   `AgentMessage` framing.
3. **TB-7 separation is preserved.** Redaction lives in `bitty-agent`; the
   crate still never executes a tool and performs no model, window, or GPU I/O.

Explicit non-claims: redaction is a textual boundary, not a guarantee for
unrecognized secret shapes; consent, capability checks, the audit ledger, and
`SecretField` typing are not implemented by this milestone; no
`Verified`/`Compatible` claim is made.

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

## Security alignment and traceability

| Draft element                                | Normative gate it refines                                     | Threat / Risk IDs             |
| -------------------------------------------- | ------------------------------------------------------------- | ----------------------------- |
| ModelProvider `ai.model` registry and scopes | P0-AC-024, P0-AC-026, invariant 6, private transport auth     | T-10, R-013, R-014            |
| ContextProvider and Stable Id hierarchy      | Dispatcher scoping, per-client attribution                    | T-09, R-011                   |
| Context Budget 32 KiB and RC-10 chunking     | Bounded inputs, invariant 7, RC-9/RC-10                       | T-01                          |
| Semantic zones as provider boundary          | Terminal Truth preservation, presentation-only rule           | T-02, R-008                   |
| Agent four levels with per-level consent     | Least privilege, no ambient authority, invariant 5/6          | T-09, T-10, R-011, R-013      |
| AgentWorkspace ephemerality and scoping      | Per-plugin isolation, containment FS-3, capability-checked FS | R-006, R-007                  |
| Rich streaming via `bitty-rich` scene        | Presentation never Terminal Truth, no hot-path execution      | invariant 3/4, T-05           |
| Tool Bus MCP adapter and host-only execution | Confused-deputy defense, untrusted labeling, P0-AC-024        | T-10, R-013                   |
| Privacy-first and No self-accept             | Necessity of independent review lifecycle                     | R-014, Documentation workflow |

No draft element weakens a normative P0 gate. Any discovered conflict returns the conflicting clause to revision rather than downgrading the gate.

## Verification

All criteria are **proposed** and become acceptance gates only when the implementation phase implements them.

### ModelProvider operations

- Given any registry content and caller scopes, `list_models` reflects exactly the granted models, `complete` respects the Context Budget before I/O, `stream` obeys RC-10 chunking and `seq`/`total` invariants, and `cancel` leaves no partial dispatch. Verification: `unit` + `adversarial` with registry and scope matrix, budget-exceeded corpus, and concurrent-stream sweep.

### ContextProvider and Stable Ids

- Given workspace/project/git/diagnostics/terminal fixtures across Instance/Window/Workspace/View/Terminal, context assembly at `32 KiB` respects the Stable Id set, zone-scoped terminal requests return only the declared zone bytes, and attribution carries the full Stable Id path and generation. Forged Stable Ids without transport auth gain no authority. Verification: `integration` + `adversarial` (hierarchy enumeration, forged-id probes, cross-workspace grant matrix).

### Context Budget and semantic zones

- Given maximal provider outputs and overflow, truncation honors declared priority, emits counted `truncated_bytes` and `truncated_providers[]`, and never exceeds `32 KiB` delivered; zone-scoped terminal scrapes never silently expand to full scrollback. Verification: `unit` with budget-boundary sweep and zone-scoped snapshot matrix.

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

## Sub-platform staging (proposed)

Status: **proposed contract**. How the AI stack is staged as an independent
sub-platform without becoming Core. Numbered for reference; none is
implemented by this RFC alone.

- **BA-1 Independent repository.** `bitty-ai` is staged as an independent
  repository under `github.com/bitty-terminal`, holding the AI runtime,
  providers, streaming, context, tools, bridge, and Lua-facing AI services.
  AI plugins (`ai-chat`, `ai-shell`, `ai-explain`, `ai-git`, `ai-context`)
  are ordinary plugins that build on `bitty-ai` services through the
  accepted manifest `dependencies` plus `services.provided` mechanics from
  the [Plugin Platform RFC](plugin-platform-rfc.md), never on private
  channels.
- **BA-2 Agent versus AI split.** `bitty-agent` (in Core) owns how Bitty
  describes an agent, communicates with it, authorizes it, and passes
  observations and tool calls; it never performs model selection, LLM I/O,
  or API-key handling. `bitty-ai` owns provider abstraction, streaming,
  context assembly, and the tool loop. The two meet only at IPC and service
  boundaries.
- **BA-3 Bridge process model.** The Bitty host never loads `bitty-ai` via
  `dlopen` into the main process. A `bitty-ai-host` helper owns providers,
  streaming, context, and tools behind scoped IPC, consistent with the
  prohibition on native in-process plugins and the out-of-process helper
  staging in the [Plugin Reuse RFC](plugin-reuse-and-providers.md). Lua
  plugins see only the composed AI services, never raw provider sockets.
- **BA-4 Rust workspace layout (candidate).** `bitty-ai` is staged as a Rust
  workspace with narrow crates — core data model (`ModelId`, `Message`,
  `ToolCall`, `StreamEvent`), provider abstraction (`complete`/`stream`/
  `capabilities`), runtime (streaming, cancellation, timeout, retry, rate
  limiting, backpressure), context (collectors, filters, budgets,
  snapshots), tools (schema, call, permission), bridge (IPC/service
  mapping), and host composition — plus one directory per model provider
  (OpenAI, Anthropic, Ollama, OpenAI-compatible). Crate names and trait
  spellings are illustrative until a `bitty-ai` repository task pins them.
- **BA-5 Lua composes, Rust enables.** Lua AI plugins orchestrate
  (`ai.session`, `ai.context.collect` with explicit terminal/cwd/git
  selection and token budget, `ai.tools.register`), while Rust owns
  mechanism: HTTP/SSE streaming, retries, timeouts, resource bounds,
  capability enforcement, terminal state, and provider protocols. Lua is
  offered semantic primitives (`workspace.focus`, `terminal.snapshot`,
  `service.require`, `ai.chat`), never Rust internals (raw IPC frames,
  channels, grid cells, renderer calls), so Rust may refactor freely while
  the Lua surface stays stable.
- **BA-6 Pressure-test gate.** `bitty-ai` is the architecture pressure test
  for the Plugin API: it must be realizable from generic primitives
  (Plugin API, services, IPC, UI primitives, capabilities) without Core
  changes. Each newly demanded Core AI-specific API is treated as evidence
  of a Plugin API abstraction gap to fix at the primitive level, not as a
  feature request to grant. This gate is a reviewer rule, not an automated
  check.

### Sub-platform verification (proposed)

- Given the staged `bitty-ai` services, an AI chat turn, a shell-error
  explainer driven by `terminal.command-finished`, and a Git review flow
  combining `ai.chat` with `vcs.diff` are all expressible through service
  composition with no Core AI concept and no in-process native load.
  Verification: `integration` with provider stubs plus a negative suite
  asserting no Core AI-specific API exists beyond the generic primitives.

## Alternatives considered

| Alternative                                              | Why rejected or deferred                                                                                                                                                                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core-owned model client with ambient network authority   | Binds the terminal core to a vendor and widens the network attack surface beyond per-provider consent. The host-owned registry with per-provider `privacy_class` and `network.connect` consent preserves the plugin boundary. |
| Implicit context gathering from working directory        | Would send unbounded files by default and bypass minimization and 32 KiB budgeting. Explicit Stable Id addressing plus provider enumeration keeps collection intentional and auditable.                                       |
| Bundled `all` level for agents                           | Violates least privilege by silently granting cross-workspace and cross-window authority when only local assistance was intended. Separate per-target grants keep elevation narrow and revokable.                             |
| AgentWorkspace as persistent project subdirectory        | Creates durable ambient state and widens traversal risk. The ephemeral per-session directory disposed at session close limits the blast radius and keeps the project tree the system of record.                               |
| Bypassing Rich Presentation for agent output             | Would fork the renderer and lose selection, search, accessibility, and damage guarantees. Rich streaming through `bitty-rich` `Scene` composition reuses the single scene path and its contracts.                             |
| Widening Tool Bus to direct process or filesystem spools | Direct host spools bypass MCP's narrow, auditable tool schema. Keeping execution host-mediated while MCP carries the vocabulary maintains the capability and consent separation.                                              |
| Publishing agent turns to disk without consent           | Contradicts minimization and invariant 9. Disk writes require explicit `debug.trace` or workspace consent, remain user-only `0600`, and stay previewable before export.                                                       |

## Open questions that remain after this RFC

These are out of this draft and remain tracked as follow-up work; they must not be silently chosen by implementation.

- Whether the `ai.model` registry stores per-model token or cost accounting locally and how that accounting charges against PB-1/PB-2.
- Whether `AgentWorkspace` receives an explicit size or time quota beyond the bounded default and how eviction interacts with long-running diff streams.
- Whether semantic-zone context may include synthesized `RichBlock` text that was produced by another plugin or only raw terminal zone bytes.
- Whether the Tool Bus gains a streaming tool-result subscription or remains strictly request-response with RC-10 chunking.
- How instance/window/workspace/view/terminal Stable Ids surface across multi-session hosts when windows migrate between instances.
- Whether the `all` level requires an OS-level authorization primitive on certain platforms beyond the Bitty consent ledger.
- Retention and audit-log lifetime for agent turns, tool results, and elevated context (remains an open item; no normative retention period is set by this draft).
- Whether `bitty-ai` repository creation, the BA-4 crate layout, and the BA-6 pressure-test gate enter acceptance with this RFC or as a separate `bitty-ai` staging decision.

These are not blockers for this draft; they will be decided in a follow-up Agent or Tool Bus amendment with independent review.

## Acceptance criteria and lifecycle

This RFC is **draft**. It does not self-accept and does not close an open question beyond its linkage to [OQ-018](../decisions/open-questions.md). The lifecycle is `Draft -> experimental review evidence -> Accepted -> normative`; only `Accepted` or `normative` documents authorize shipped, stable, or compatibility-guaranteed behavior. Draft text carries no compatibility promise and does not form public reference.

Acceptance will require:

1. Independent review by the security-reviewer, a category-owner for `architecture` or `agent`, and the docs-curator accepts the ModelProvider (`list_models`/`complete`/`stream`/`cancel`), ContextProvider providers and 32 KiB budget, Stable Id hierarchy, semantic-zone integration, four Agent levels with per-level consent, ephemeral AgentWorkspace, Rich streaming (Markdown/Diff/ToolCard), Tool Bus MCP, and privacy-first controls without weakening any normative P0 gate.
2. The same change synchronizes the open-question register only if an open question for AI architecture exists; this draft does not move OQ-018 from `Accepted` and instead records its reuse of the OQ-018 contracts.
3. The specifications index records this document as `Draft` until independent review moves its frontmatter to `accepted`.
4. Verification criteria above have headless or integration evidence before any claim of shipped behavior.

## References

- Bitty topic evidence this RFC extends: [Product vision](../product/vision.md), [Architecture Overview](../architecture/overview.md), [Core and Plugin Boundaries](../architecture/core-boundaries.md), [Plugin System](../extensibility/plugin-system.md), [Rich Content](../interfaces/rich-content.md), [CLI](../interfaces/cli.md), [Security Overview](../security/overview.md), [Threat Model](../security/threat-model.md), [P0 Acceptance Criteria](../security/p0-acceptance-criteria.md), [Technology Strategy](../project/technology-strategy.md).
- Prior RFCs this RFC composes with: [IPC and Agent RFC](ipc-agent-rfc.md), [Rich Presentation RFC](rich-presentation-rfc.md), [Plugin Platform RFC](plugin-platform-rfc.md), [Isolation Resource RFC](isolation-resource-rfc.md), [Configuration Model RFC](configuration-model-rfc.md), [CLI Contract RFC](cli-contract-rfc.md), [DevTools RFC](devtools-rfc.md).
- Related deferred direction: [ADR 0008](../decisions/adrs/ADR-0008-headless.md) keeps headless daemon and remote UI work post-v1.0; [Reference Project Register](../project/reference-projects.md) defines how local snapshots are used as untrusted research evidence. The panel vision is not yet present on this branch, so no link is asserted here.
- Provenance, non-normative: `tmp/research/chatgpt-2026-08-30-3.md` (research snapshot read 2026-08-30) supplied the candidate runtime directions; the local Hermes Agent snapshot at revision `dce2ecb8a9428aedf69e959bd15d7a9fa15eae01` (MIT) supplied corroborating observations from `README.md`, `AGENTS.md`, `agent/context_engine.py`, `agent/memory_provider.py`, `agent/memory_manager.py`, `hermes_state_search.py`, and `hermes_state_portability.py`. These sources are not Bitty dependencies or authority.
