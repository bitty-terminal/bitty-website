---
title: Provider plugin boundary
description: Draft Core versus provider-plugin boundary for ModelProvider contract transports aliases and secrets
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 44
---

# Provider plugin boundary

> Status: **draft**. This document records the candidate direction
> into the draft `bitty-ai` Core versus provider-plugin boundary. It proposes
> no accepted architecture, authorizes no shipped behavior, closes no Artificial
> Intelligence Question entry, introduces no new identifier, and contains no
> product code. Normative security and IPC obligations override any experimental
> adoption stated here. `bitty`-side and plugin-ecosystem material below is
> handoff input, not a decision: the `bitty` terminal repository and the plugin
> ecosystem decide acceptance, sequencing, and mechanism through their own
> review.

## Purpose and scope

This boundary covers the provider and model-management surface only:

- What `bitty-ai` Core owns: the `ModelProvider` contract, model descriptors,
  the capabilities vocabulary, the provider registry protocol, selection and
  routing semantics, fallback semantics, budget and usage-accounting semantics,
  the streaming abstraction, and provider-independent errors.
- What provider plugins own: vendor HTTP integrations, local-endpoint adapters,
  subscription and CLI adapters, credential handling behind opaque handles, and
  model discovery for the providers they implement.
- What is explicitly out of scope here: the host secret store, the Model
  Manager panel, and plugin-registry mechanics, which are `bitty`-side or
  plugin-ecosystem handoff items recorded in
  [Bitty-side handoff](#bitty-side-handoff-not-a-decision).

Inputs are the candidate direction, MP-1 through MP-11 and the MPC-1/MPC-2
candidate extension in [AI Architecture](../architecture/ai-architecture.md), the
R1 disposition in [Execution ownership R1](../architecture/execution-ownership-r1.md),
the R2 disposition in [Tool transport R2](../architecture/tool-transport-r2.md),
the register in [AI Unresolved Questions](../product/ai-unresolved-questions.md),
the narrow scope gate in [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md),
the dependency posture in [Dependency Strategy](dependency-strategy.md), and the
accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) as overriding
authority. This document is self-contained.

No product code is introduced or described as implemented.

## Normative sources this specification must not weaken

- [AI Architecture](../architecture/ai-architecture.md): MP-1 through MP-11,
  MPC-1, MPC-2, and the architecture-level privacy, budget, consent, and
  dependency mandates elaborated here.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounded
  framing, scope families, consent ledger, peer authentication, and streaming
  chunking that any provider integration must not weaken.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  external providers remain untrusted until a narrow grant, and deferral must
  not create a bypass.
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  T-10 and R-013 for treating provider output as untrusted observation data.
- [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md):
  R-012 for child credential leakage and R-014 for secret exposure through
  traces.
- [P0 Security Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md):
  P0-AC-021 through P0-AC-026, including mandatory typed redaction before queue
  and before write.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md): the
  narrow v0.1 scope and no-network posture that candidate post-v0.1 surfaces
  cannot override.

Where this document refines a threshold, encoding, or ownership edge, it
refines those sources. If a mechanism stated here weakens a normative control,
the normative text wins and this document must be corrected.

## Terminology

| Term                        | Meaning here                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core                        | The `bitty-ai` component that owns provider abstraction, registration, selection, fallback, budget, accounting, streaming, and provider-independent error policy.                                 |
| Provider plugin             | An adapter that implements one provider or transport family behind the Core-owned boundary and registers through the host-validated registry protocol.                                            |
| Frozen v0.1 surface         | The exact `ModelProvider`, `ModelDescriptor`, turn-request, and error surface described in [v0.1 interface freeze](#v01-interface-freeze-ai-0135); candidate fields are not part of this surface. |
| Candidate post-v0.1 surface | The proposed descriptor, registry, taxonomy, routing, streaming, and adapter extensions in this draft. It adopts no field, type, mechanism, owner, or implementation authorization.               |
| Provider-independent error  | A typed `ProviderError` outcome whose meaning does not expose a vendor status or message. Free-form reason fields remain only partially provider-independent until mapped.                        |
| Credential handle           | An opaque host-controlled reference consumed by an adapter. Raw credential bytes cross only the authorized host adapter edge and never reach models, agents, plugins, diagnostics, or storage.    |
| Privacy class               | The Core-owned `local-only`, `network-minimized`, or `upload-notice` classification used as a hard routing constraint.                                                                            |
| Transport kind              | A proposed Core-declared adapter class: `HttpApi`, `LocalEndpoint`, `CliHarness`, `ManagedAccount`, or `Router`. It grants no capability by itself.                                               |

Authoritative definitions for the frozen provider surface, privacy class,
capability vocabulary, context budget, and network delegation remain with
[AI Architecture](../architecture/ai-architecture.md) and
[Provider transport adapter contract](transport-adapter-contract.md). This
document links those definitions and adds no second implementation authority.

## Core-owned surface

Core owns the abstraction and the policy; it performs no vendor integration
and holds no credentials. Each item below restates the candidate direction proposal
against its existing contract anchor; nothing here widens Core authority.

- `ModelProvider` interface (MP-1, MP-4 through MP-7). Core defines the
  operations `list_models`, `capabilities`, `complete`, `stream`, and `cancel`
  with bounded inputs, deterministic timeouts (MP-8), and typed outcomes.
  Vendor endpoint construction, request signing, and retry behavior live in
  provider adapters behind this interface.
- `ModelDescriptor` (MP-2). Core defines the descriptor shape: `provider_id`
  (bounded `owner.name`), transport kind, `models[]`, per-model capabilities,
  `context_window`, `cost_marks`, and `privacy_class` (`local-only`,
  `network-minimized`, `upload-notice`). Unrecognized fields fail closed.
- Capabilities vocabulary (MP-2, MP-4). The capability names (for example text,
  streaming, tool use, vision) are a Core-owned closed vocabulary validated at
  registration. Adapters declare capabilities; they never extend the
  vocabulary unilaterally.
- Selection and routing semantics. Core defines how a request resolves to a
  concrete model from aliases and routing inputs (see
  [Model aliases and routing inputs](#model-aliases-and-routing-inputs));
  adapters expose the facts routing needs and never override the policy.
- Fallback semantics. Core defines ordered fallback across candidate models,
  including what counts as a retryable provider failure versus a terminal
  outcome; adapters report typed failures and never silently substitute a
  different model.
- Budget and usage-accounting semantics (MP-5, MP-9). Requests fail at the
  boundary with typed `BudgetExceeded` before provider I/O, and provider I/O
  is charged against the same per-client quotas as IPC and MCP traffic.
  Adapters report usage; Core owns the ledger semantics.
- Streaming abstraction (MP-6). Core defines chunked `StreamHandle` framing
  (`seq`/`total`/`final`, byte ceilings, backpressure with countable shed);
  adapters produce fragments in that shape.
- Provider-independent errors. The current `ProviderError` variants are
  Core-owned and transport-neutral where their payloads are structured.
  `Transport`, `Auth`, and `Unknown` carry unbounded free-form `String`
  reasons in `ProviderError`; `AgentError::from(ProviderError)` bounds the
  provider and reason strings to at most 512 printable ASCII bytes during
  conversion. That conversion removes control characters and bounds length,
  but it does not canonicalize vendor meaning or redact secrets. An adapter
  must map vendor status and message data into the existing typed variants
  and bounded, non-secret reason categories. The frozen surface has no
  `Cancelled` variant, and cancellation remains an agent-session outcome.
  Vendor status codes are mapped at the adapter edge and never propagate raw
  to agents or journals.
- Provider registry protocol (MP-1). The host validates `provider_id`,
  `privacy_class`, and `capabilities` before registration and rejects ambient
  or undeclared registration. The exact registry split and owning crates
  remain draft choices under the R1 disposition; this document grants no
  permission to implement either location.

A conforming Core therefore ships with zero vendor dependencies: protocol,
agent runtime, context engine, tool bus, and routing only. That posture
matches the accepted dependency direction in
[Dependency Strategy](dependency-strategy.md), where provider, tool-bus, MCP,
code, and store adapters sit outside the std-only runtime.

## v0.1 interface freeze (AI-0135)

The sibling `bitty-ai` runtime defines the `ModelProvider` v0.1 interface
contract. This section mirrors that freeze identically in substance; the fuller
candidate surface elsewhere in this document (notably [Core-owned
surface](#core-owned-surface)) stays proposal, not v0.1 contract. Where the two
differ, this section governs v0.1 and the candidate surface governs beyond
v0.1.

**Frozen v0.1 trait surface.** The trait surface is exactly `provider_id`
(identity accessor, validated at construction) plus `list_models` /
`complete` (registry snapshot / one synchronous turn) plus the
test-observability pair `scripted_turns_remaining` / `complete_calls`.

**Deferred as trait operations.** `capabilities` (capability matching lives
in selection over descriptor snapshots, never by name alone), `stream`
(chunked `seq`/`total`/`final` streaming lives in the runtime streaming
layer, observed at chunk boundaries), and `cancel` (cancellation lives on the
agent session, idempotent and terminal-state preserving per MP-7) are
explicitly deferred past v0.1 as trait operations.

**Frozen v0.1 descriptor shape.** The descriptor is exactly `name` (as
referenced by the turn-request model field) plus `capabilities`. Deferred
past v0.1 is the full MP-2 shape: `provider_id` (bounded `owner.name`),
transport kind, `context_window`, `cost_marks`, `privacy_class`
(`local-only` / `network-minimized` / `upload-notice`), and unknown-field
fail-closed. Routing metadata that exists today (`provider_id`,
`context_window_tokens`, cost weights) lives on the selection-layer model
registration, not on this descriptor, and bridging stays host-side.

**Deferred closed-vocabulary enforcement.** The spec vocabulary is
text/streaming/tool-use/vision; the code enum additionally carries
`ImageInput` / `AudioInput` / `AudioOutput` / `VideoInput` (routing
vocabulary only, never advertised, selection fails closed when required) and
`Reasoning` (MP-2 routing bit only). No host-side closed-vocabulary rejection
is pinned for v0.1.

**Spec-to-code capability mapping.** `Text` covers `text`, `Streaming` covers
`streaming`, `ToolUse` covers `tool-use`, `ImageInput` narrows `vision` to
image input; audio/video/reasoning have no spec counterpart.

**Deferred sampling-matrix pinning.** The turn request carries the full
validated MP-5 sampling contract while the slice `LocalProvider` maps only
`temperature` / `top_p` / `frequency_penalty` / `presence_penalty` / `seed` /
`max_tokens` / `stop` and refuses `top_k` / `repetition_penalty` / `min_p` /
`response_format` / `reasoning` with `UnsupportedSampling` before I/O.

**LocalProvider promotion bar.** Out of slice; all required before any
promotion: the trait gains `capabilities` / `stream` (`StreamHandle`
`seq`/`total`/`final` framing) / `cancel` (MP-7 idempotent) as trait
operations; the descriptor gains `provider_id` (bounded `owner.name`),
transport kind, `context_window`, `cost_marks`, `privacy_class`
(`local-only`) with unknown-field fail-closed; the sampling matrix is pinned
to mapped (`temperature`, `top_p`, `frequency_penalty`, `presence_penalty`,
`seed`, `max_tokens`, `stop`) versus refused (`top_k`,
`repetition_penalty`, `min_p`, `response_format`, `reasoning`) with no silent
defaulting; advertised capabilities match the backend (no `Streaming` /
`ToolUse` claim without support).

## Transport taxonomy proposal

The candidate direction proposes distinguishing API providers from
subscription and CLI-backed access, because a consumer subscription, a CLI
account, and API billing are different systems. Treating a subscription as a
source of API keys (for example extracting session tokens to impersonate an
official client) is rejected: it is unstable and raises terms-of-service and
security concerns.

The proposed transport kinds are `HttpApi`, `LocalEndpoint`, `CliHarness`,
`ManagedAccount`, and `Router`. All five are proposal only:

- `HttpApi` covers keyed vendor HTTP APIs and OpenAI-compatible endpoints,
  configured with a base URL and a credential reference, never an inline key.
- `LocalEndpoint` covers loopback servers (for example an Ollama-style
  daemon), including the `local-only` privacy class that never performs
  network I/O (MP-3).
- `CliHarness` covers adapters that shell out to an official CLI the user
  installed and authenticated independently. The adapter invokes only
  supported CLI commands; it never scrapes credentials out of the CLI's
  session state.
- `ManagedAccount` covers account-based access exclusively through an
  officially supported account or CLI integration surface. If no supported
  surface exists, the provider is not offered through this kind.
- `Router` covers multi-upstream gateways (for example OpenRouter-style
  aggregators), which are one provider entry with their own descriptor,
  capabilities, and accounting, not a bypass around routing policy.

For the candidate post-v0.1 registry and descriptor surface, Core sees provider
identity, a model name, transport kind, and declared capabilities (MP-2); it
never knows how an adapter builds an endpoint, signs a request, or resolves an
account. The frozen v0.1 `TurnRequest` instead carries the field `model` and
does not carry transport kind or `model_id`. The input envelope such an adapter
receives and the guarantees it owes back are specified in
[Provider transport adapter contract](transport-adapter-contract.md). Whether
the user authenticates with an API key, OAuth flow, subscription, or CLI login
is an adapter-internal matter behind the registry protocol, subject to the
secret invariant in [Secret invariant](#secret-invariant).

## Two-level plugin model

The candidate direction proposes two plugin levels instead of one monolithic
model manager containing every provider. Both levels are
`bitty`-side or plugin-ecosystem concerns; they appear here as handoff input,
not as `bitty-ai` decisions.

- Level 1: a Model Manager UI and configuration plugin (candidate direction
  sketch: a `models` plugin) responsible for provider administration, model
  listing, default-model selection, fallback order, model aliases, auth-state
  display, quota and usage display, latency and pricing display, context-window
  display, capabilities display, endpoint display, and routing-policy
  configuration. It administers but does not itself implement network
  protocols.
- Level 2: independent provider adapter plugins (candidate direction sketch:
  one plugin per vendor or transport, for example OpenAI, Anthropic, Google,
  OpenRouter, Ollama, OpenAI-compatible, Codex-style CLI, Claude-Code-style
  CLI, plus community adapters), each registering through the Core-owned
  registry protocol. New adapters arrive without Core modification.

The manager-panel sketch in the candidate direction (keyboard shortcut, provider
status list, role-model slots such as default, fast, planning, and background
models, ordered fallback chains) is illustrative interface ideation from a
candidate discussion, not an accepted panel design. Panel ownership, shortcut
allocation, and presentation belong to the `bitty` terminal repository; the
plugin API surface belongs to the plugin ecosystem. Neither is decided here.

## Model aliases and routing inputs

Agents address semantic aliases, not vendor model strings. A draft alias
shape from the candidate direction (illustrative, not a configuration contract):

```toml
[models]
default = "smart"

[model_alias.smart]
candidates = ["anthropic/claude-...", "openai/gpt-..."]
```

The agent declares a need (for example `need = reasoning`); the Core-owned
selection policy resolves the actual model. Proposed routing inputs are
capability match, cost, latency, privacy class, context window, subscription
availability, rate limits, and current quota. Capability match and privacy
class are hard constraints (a request that cannot be satisfied fail-closed
rather than silently downgraded); cost, latency, window, and quota are
soft preferences inside the consent and budget envelope (AIQ-02, AIQ-13,
AIQ-24). Alias-to-candidate mappings are configuration, never capability
grants: resolving to a model still requires the applicable `ai.provider`
consent and network grant (MP-10, MP-3).

## Secret invariant

> **A model can use credentials; a model must never see credentials.**

This invariant is the non-negotiable security core of the boundary:

- Configuration references credentials (`credential = "secret://..."` style
  references); a literal key value in configuration fails validation (MPC-2).
- Real credentials live in the host secret store and reach adapters as opaque
  handles resolved on the Rust host side. The Model Manager UI knows only
  `configured = true`; agents, prompts, Lua, plugins, diagnostics, and traces
  never receive the value (MP-10, MPC-2).
- Provider credentials require a dedicated `ai.provider` consent distinct
  from streaming and Tool Bus scopes, are redacted by typed `SecretField`
  before any diagnostic, trace, or snapshot, and never appear in environment
  passthrough, discovery files, trace files, or agent workspaces (MP-10,
  Invariant 9, P0-AC-026). The runtime's `SecretField` emits the fixed
  `[redacted secret]` marker unconditionally, `is_absent_from` gates and
  `scrub_from` scrubs before queue or write, and the `ai.provider` grant
  satisfies its exact triple only — see
  [AI Unresolved Questions](../product/ai-unresolved-questions.md) AIQ-5A.
  Mandatory pre-queue/pre-write enforcement timing and the marker/invalidation
  mechanism stay open there.
- Typed redaction applies pre-queue and pre-write (PP-2, P0-AC-026, AIQ-5A),
  and no secret-bearing record persists without explicit applicable consent
  (PP-4).

The host secret store itself is `bitty`-side infrastructure and out of scope
for this document; it is recorded as a handoff item below. The unresolved
credential-storage tiers stay with their existing trackers; this document
reopens none of them.

## Core versus plugin boundary

| Capability                  | Core            | Plugin                          | Notes                                   |
| --------------------------- | --------------- | ------------------------------- | --------------------------------------- |
| `ModelProvider` interface   | Yes             | Implements                      | MP-1, MP-4 through MP-7                 |
| `ModelDescriptor` shape     | Yes             | Declares entries                | MP-2, fail-closed on unknown fields     |
| Capabilities vocabulary     | Yes             | Declares subset                 | Closed vocabulary, host-validated       |
| Selection/routing semantics | Yes             | Exposes routing facts           | Aliases resolve in Core                 |
| Budget/accounting semantics | Yes             | Reports usage                   | MP-5, MP-9, typed `BudgetExceeded`      |
| Fallback semantics          | Yes             | Reports typed failures          | No silent substitution                  |
| Streaming abstraction       | Yes             | Produces fragments              | MP-6 framing and backpressure           |
| Provider-independent errors | Yes             | Maps at the edge                | No raw vendor codes past the adapter    |
| Provider registry protocol  | Yes             | Registers through it            | MP-1, no ambient registration           |
| Vendor HTTP integrations    |                 | Yes                             | One adapter per vendor or family        |
| Local-endpoint adapters     |                 | Yes                             | Honors `local-only`, MP-3               |
| OAuth implementation        |                 | Yes                             | Behind opaque handles only              |
| Subscription/CLI adapters   |                 | Yes                             | Supported surfaces only, never scraping |
| Aggregator/router adapters  |                 | Yes                             | One registry entry, own accounting      |
| Custom endpoints            |                 | Yes                             | OpenAI-compatible shape, MPC-1          |
| Model Manager panel and UI  |                 | Handoff                         | `bitty`-side, undecided here            |
| Credential storage          |                 |                                 | Host infrastructure, `bitty`-side       |
| Provider secret resolution  | Host-controlled | Adapter consumes opaque handles | MP-10, MPC-2                            |

In short: model-system abstraction and policy belong to `bitty-ai` Core;
concrete provider integrations and management UI belong to plugins. Model
management as a whole is therefore not "all plugin": the contract, registry,
and policy stay in Core.

## Consistency with existing dispositions

- R1 red line preserved. The R1 disposition in
  [Execution ownership R1](../architecture/execution-ownership-r1.md) keeps the rule that
  `bitty-agent` performs no model selection and no model I/O. Nothing in this
  boundary moves provider implementation, model selection, LLM I/O, or API
  keys into terminal Core; provider registry implementation and I/O belong in
  the independent AI helper behind scoped IPC (AIQ-38).
- R2 unified authorization backend preserved. The R2 disposition in
  [Tool transport R2](../architecture/tool-transport-r2.md) keeps one common authorization
  backend fronting every tool effect with MCP as the default vocabulary
  transport. Provider adapters are not a second authorization path: model
  calls still require caller, target, generation, capability, consent, budget,
  and redaction gates in a common order, and transport kinds here never grant
  authority.
- MP-10 API-key handling not reopened. Storage, redaction, consent
  separation, and the `ai.provider` scope stay exactly as specified in
  [AI Architecture](../architecture/ai-architecture.md); the MPC-2 reference-not-value rule
  extends MP-10 without changing it.
- P0-AC-026, PP-2, and PP-4 mandatory. Pre-queue and pre-write typed
  redaction and consented recording remain required controls; no open
  mechanism in this document defers them.

## Bitty-side handoff, not a decision

The following items from the candidate direction need owning-repository review
and are recorded here as input only:

1. Host secret store with opaque credential handles (owner: `bitty` side;
   constraint: adapters consume handles, never values, per MP-10/MPC-2).
2. Model Manager panel and configuration surface, including provider status,
   role-model slots, fallback ordering, and alias editing (owner: `bitty`
   side for panel and presentation; plugin ecosystem for the manager-plugin
   API surface).
3. Plugin-registry mechanics for discovering, installing, and updating
   provider adapters (owner: plugin ecosystem; constraint: registration stays
   host-validated per MP-1).

Suggested handling: each owning repository accepts, reshapes, or rejects
these inputs through its own review; `bitty-ai` Core proceeds with contract,
registry, routing, fallback, budget, and error semantics regardless of
handoff timing.

## Risks

- Subscription and CLI adapters depend on vendor-supported surfaces that can
  change without notice; each such adapter needs an explicit supportability
  statement and a fail-closed degradation path, or it should not ship.
- A closed capabilities vocabulary needs a versioned extension process, or
  adapters will smuggle semantics through unrecognized fields that fail
  closed today and break tomorrow.
- Alias configuration that looks like routing policy can drift into
  capability grants; reviewers must keep alias resolution behind consent and
  budget gates.

## Security review

- **Credential authority.** A model can use credentials; a model must never
  see credentials. Configuration carries references, the host secret store
  holds values, and only the authorized host adapter edge may resolve a value
  for adapter use. A raw value crossing any model, agent, plugin, diagnostic,
  trace, snapshot, journal, discovery file, child environment, or
  `BITTY_*` variable is a release-blocking defect.
- **Redaction timing.** Typed `SecretField` redaction applies before queue and
  before write. The fixed marker, absence checks, and scrub behavior do not
  waive that timing, and AIQ-5A keeps its existing partial disposition. No
  secret-bearing record persists without explicit applicable consent.
- **Provider output and errors.** Provider output is untrusted observation
  data, never an instruction. Vendor statuses and messages are mapped at the
  adapter edge into the existing provider-independent error surface; raw vendor
  text does not propagate to agents or journals. The current free-form reasons
  remain subject to the conversion bound stated in
  [Core-owned surface](#core-owned-surface).
- **Capability and isolation.** A provider, transport kind, first-party label,
  or "trusted" label grants no ambient filesystem, process, or network
  authority and no automatic sandbox, isolation, or capability exemption. The
  applicable validation, caller, target, consent, budget, and redaction gates
  remain in their established order while AIQ-33 and AIQ-38 stay open.
- **Registry and routing.** Registration remains host-validated, unknown fields
  fail closed, aliases are configuration rather than grants, and capability
  and privacy class remain hard routing constraints. An adapter cannot extend
  the capability vocabulary or widen consent through registration metadata.
- **Handoff is not authority.** Host secret storage, Model Manager presentation,
  and plugin-registry mechanics remain with their owning repositories. Their
  unresolved implementation does not authorize this document or a provider
  adapter to bypass a security control.

No clause in this candidate boundary weakens the normative security corpus.
Any conflict returns the document to `NEEDS-FIX` until the normative source or
the conflicting mechanism is corrected.

## Verification plan

Review verifies the frozen-versus-candidate boundary and treats every
post-v0.1 mechanism as an acceptance bar, not as evidence that it exists.

- Frozen-interface evidence identifies the exact v0.1 trait operations,
  descriptor fields, turn-request model field, sampling behavior, and
  `ProviderError` variants, including the absence of a cancellation variant.
- Error-mapping evidence starts with the unbounded `String` payloads in the
  current `ProviderError`, exercises the 512-byte printable-ASCII conversion
  bound, and shows vendor statuses and messages mapped into existing typed
  variants without raw propagation to agents or journals.
- Credential evidence uses sentinel values to prove that configuration,
  models, agents, plugins, diagnostics, traces, snapshots, journals, discovery
  files, and child environments never receive raw credential bytes.
- Redaction evidence exercises both pre-queue and pre-write paths and verifies
  that the fixed marker, absence checks, and scrub behavior cannot be disabled
  by an adapter.
- Registration evidence rejects undeclared providers, unknown descriptor
  fields, out-of-vocabulary capabilities, and ambient grants before an adapter
  can serve a model.
- Routing evidence proves capability match and privacy class remain hard
  constraints, while cost, latency, context-window, and quota inputs remain
  preferences inside consent and budget.
- Isolation evidence proves provider identity, transport kind, and first-party
  status grant no filesystem, process, or network capability exemption while
  AIQ-33 and AIQ-38 remain open.
- Handoff evidence records owner-side review for host secret storage, Model
  Manager presentation, and plugin-registry mechanics without treating this
  document as acceptance by any owning repository.

## Alternatives considered

- **Put vendor integrations in Core.** Rejected: it couples the kernel to
  vendor protocols, credentials, and transport dependencies and gives every
  dependent the resulting dependency tree. Core owns the contract and policy;
  adapters own concrete integrations.
- **Use one monolithic model manager for every provider function.** Rejected
  as the candidate direction: administration and concrete provider adapters
  have different authority and lifecycle boundaries. The two-level plugin model
  remains a draft, and its owning repositories still decide acceptance.
- **Represent a consumer subscription as API keys.** Rejected: extracting or
  impersonating a client session is unstable and creates terms-of-service and
  security exposure. Subscription or CLI access uses only a supported surface.
- **Pass raw provider messages toward the edge.** Rejected: vendor status and
  message data would become an accidental protocol and could leak secrets.
  Adapters map into the existing typed variants and bounded, non-secret
  categories.
- **Treat alias configuration as capability policy.** Rejected: aliases select
  among candidates but never grant consent, network access, or capabilities.
  Core still applies the hard constraints and the authorized preference order.
- **Choose host secret-store, panel, or registry mechanics here.** Rejected:
  those choices belong to their owning repositories. This document records
  constraints and handoff input without granting authority.

## Affected contracts

- [AI Architecture](../architecture/ai-architecture.md) (Draft): MP-1 through
  MP-11, MPC-1, MPC-2, and the cited privacy, budget, consent, streaming, and
  dependency mandates are elaborated but not changed.
- [Provider transport adapter contract](transport-adapter-contract.md)
  (Draft): the frozen provider surface, host-only credential edge,
  provider-independent error mapping, and adapter/network responsibilities are
  synchronized with this boundary.
- [Dependency Strategy](dependency-strategy.md) (Draft): the std-only kernel,
  dependency inversion, and provider-adapter placement remain unchanged; no
  crate or version is adopted.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
  (Draft): the exact frozen interface and zero-network v0.1 posture remain in
  force.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounded
  framing, authentication, scopes, consent, and streaming constraints remain
  controlling.
- [Execution ownership R1](../architecture/execution-ownership-r1.md) and
  [Tool transport R2](../architecture/tool-transport-r2.md) (Draft): the
  no-model-I/O rule and unified authorization backend remain unchanged.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft):
  AIQ-02, AIQ-13, AIQ-24, AIQ-33, AIQ-36, AIQ-38, and AIQ-5A retain their
  current entries and dispositions.

## Open points

Duplicate-check against
[AI Unresolved Questions](../product/ai-unresolved-questions.md) finds every boundary
question already tracked, so this document proposes no new AIQ identifier and
no new global open-question identifier:

- AIQ-02 (routing within provider consent and budget) covers routing-policy
  mechanics.
- AIQ-13 (provider-scoped prefix-cache key and routing scope) covers
  provider-scoped routing effects.
- AIQ-24 (atomic ancestor and global budget reservation) covers delegation
  budget accounting providers report into.
- AIQ-33 (unified authorization and isolation backend) covers the gate model
  adapters sit behind.
- AIQ-36 (native versus MCP tool transport and bridge placement) covers
  transport-path placement questions.
- AIQ-38 (generic execution and registry ownership across repositories)
  covers the cross-repository registry split, including the no-model-I/O rule.
- AIQ-5A (typed redaction markers and invalidation mechanism) covers the
  redaction machinery the secret invariant depends on.

Credential-storage tiers remain with their existing trackers referenced by
[AI Architecture](../architecture/ai-architecture.md); management-UI design and plugin-registry
mechanics belong to the owning repositories and are not AIQ entries.

## Acceptance criteria

This draft passes document-level review only when all of the following are
true:

- The exact frozen v0.1 surface remains separate from every candidate post-v0.1
  field, operation, taxonomy, and registry mechanism.
- The error statement says that `Transport`, `Auth`, and `Unknown` hold
  unbounded free-form strings in `ProviderError`, that conversion to
  `AgentError` applies the 512-byte printable-ASCII bound, and that conversion
  does not canonicalize vendor meaning or redact secrets.
- The Core-versus-plugin table, secret invariant, transport taxonomy, alias
  constraints, and handoff list retain their existing force without granting
  implementation or ownership authority.
- AIQ-02, AIQ-13, AIQ-24, AIQ-33, AIQ-36, AIQ-38, and AIQ-5A retain their
  register entries; this document introduces no identifier, owner assignment,
  milestone, or implementation authorization.
- Every changed canonical file is self-contained and contains no archive
  label, implementation line range, revision fingerprint, or
  implementation-location reference.
- `just check`, `just fmt`, `just links`, `just metadata`, and `just language`
  pass, and independent architecture, security, and documentation review
  records no blocking finding.

## P0 Review Sign-off

No P0 sign-off is claimed by this draft. Before any reliance, the security
reviewer must verify the credential edge, pre-queue and pre-write redaction,
provider-output handling, error conversion, and absence of an isolation or
capability exemption. The architecture reviewer must verify the frozen versus
candidate surface, Core/plugin ownership split, and adapter handoff boundary.
The documentation reviewer must verify self-containment, metadata, AIQ
cross-references, and links. Passing repository gates does not constitute those
sign-offs.

## References

- [AI Architecture](../architecture/ai-architecture.md) (Draft): MP-1 through
  MP-11, MPC-1, MPC-2, and the architecture-level mandates cited by this
  boundary.
- [Provider transport adapter contract](transport-adapter-contract.md)
  (Draft): exact frozen provider fields, bounded error-conversion behavior,
  credential handling, adapter guarantees, and network delegation.
- [Dependency Strategy](dependency-strategy.md) (Draft): std-only kernel,
  dependency inversion, and provider-adapter placement.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
  (Draft): frozen implementation scope and no-network posture.
- [Execution ownership R1](../architecture/execution-ownership-r1.md) and
  [Tool transport R2](../architecture/tool-transport-r2.md) (Draft):
  cross-repository execution ownership and unified authorization constraints.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounded
  IPC, authentication, scope, consent, and streaming controls.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft):
  AIQ-02, AIQ-13, AIQ-24, AIQ-33, AIQ-36, AIQ-38, and AIQ-5A with their
  existing dispositions.
