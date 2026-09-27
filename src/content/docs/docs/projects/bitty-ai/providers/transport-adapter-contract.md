---
title: Provider transport adapter contract
description: Draft consumer-side contract for a provider transport adapter covering its input envelope guarantees and network delegation
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 46
---

# Provider transport adapter contract

> Status: **draft**. This document records the `bitty-ai` side of the
> provider transport adapter contract: what Core passes to an adapter, what an
> adapter guarantees back, which network behaviors are delegated to the
> network layer rather than reimplemented, and which concerns stay with the
> adapter. It proposes no accepted architecture, adopts no dependency, no
> crate, no trait, and no numeric limit, authorizes no shipped behavior, and
> closes no new architecture decision. AIQ-02 is dispositioned in the
> unresolved questions register; AIQ-33 and AIQ-36 stay open. No product code is
> introduced or described as implemented. The normative security and IPC obligations linked from
> [AI Architecture](../architecture/ai-architecture.md) override any
> experimental adoption stated here.

## Purpose and scope

In the proposed post-v0.1 architecture, a provider transport adapter is the
only AI-core component that may initiate network I/O, and the network layer is
the only component that may execute that I/O. This document states the frozen
v0.1 `ModelProvider` surface, keeps a separate proposal for any later adapter
envelope, and defines the obligations that apply once the network layer exists:

- The frozen v0.1 provider request and descriptor fields, including the fields
  that are absent from the current surface.
- A separately labeled post-v0.1 envelope proposal, including host-resolved
  credential handling that does not widen secret authority (MP-10, MPC-2).
- The guarantees a future adapter owes Core: deterministic timeouts (MP-8),
  provider-independent error kinds, no future provider I/O before the applicable
  CP-5 context-budget check, and no vendor-specific branching inside Core.
- The delegation boundary with the network layer, so that redirect
  re-authorization, proxy precedence, TLS policy, and transfer budgets are
  consumed rather than reimplemented.
- The concerns that remain adapter-owned: connection pooling, chunked bodies,
  and SSE framing.

The governing constraint is the kernel principle recorded in
[Dependency Strategy](dependency-strategy.md#kernel-principle-std-only-runtime-with-dependency-inversion):
`bitty-ai-runtime` stays a std-only agent kernel and state machine over traits
and domain types, with no HTTP client, TLS stack, async runtime, or network
dependency. The v0.1 expression of that principle — no network access in v0.1
code paths, with a `FakeProvider` covering all tests — stays as stated in the
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md).
The architecture-level mandates that keep transport, pooling, timeout,
redirect, proxy, chunked bodies, and SSE framing out of the kernel stay in
force under MPC-5 in
[AI Architecture](../architecture/ai-architecture.md). This document does not
weaken either.

Inputs are MP-1 through MP-11 and MPC-1, MPC-2, and MPC-5 in
[AI Architecture](../architecture/ai-architecture.md); CP-5 in the same
document; the Core-owned surface, transport taxonomy, and secret invariant in
[Provider plugin boundary](provider-plugin-boundary.md); the kernel principle,
adapter boundary map, and provider-and-transport separation in
[Dependency Strategy](dependency-strategy.md); the unified authorization
backend in [Tool transport R2](../architecture/tool-transport-r2.md); and the
register in [AI Unresolved Questions](../product/ai-unresolved-questions.md).

Out of scope here, and unchanged by this document: the network layer's own
contract and its numeric policy values, the host secret store, the Model
Manager panel, plugin-registry mechanics, and every decision owned by the
terminal and plugin-ecosystem tracks. Where this document needs a decision
that belongs to another owner, it names the owner and stops.

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  default posture that external providers are untrusted until a narrow grant,
  invariants 1 through 10, and the rule that deferral must not create a
  bypass.
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  T-10 and R-013 for untrusted-observation labeling of provider output.
- [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md):
  R-012 for child credential leak and R-014 for secret exposure via traces.
- [P0 Security Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md):
  P0-AC-021 through P0-AC-026 whole, including mandatory typed redaction
  before queue and before write.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounded
  framing, scope families, consent ledger, and streaming chunking that
  provider I/O shares under MP-9.
- [Core and Plugin Boundaries](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/core-boundaries.md):
  the rule that AI and Agent layers remain outside the core.

Where this document refines a threshold or an encoding for the adapter edge, it
refines those sources. If a mechanism stated here weakens a normative control,
the normative text wins and this document must be corrected.

## Terminology

| Term                                | Meaning here                                                                                                                                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frozen v0.1 provider request        | The exact `TurnRequest` passed to `ModelProvider::complete` today: `model`, `messages`, `context_refs`, `tools`, `budget_bytes`, `timeout_ms`, `now_ms`, and optional `sampling`. No credential or transport field crosses this call.                                    |
| Post-v0.1 adapter-envelope proposal | A separately proposed, versioned extension for a network-capable adapter. It is not the frozen Rust surface and adopts no field or type by implication.                                                                                                                  |
| Credential handle                   | A proposed opaque reference across configuration, Core, plugin, and agent surfaces under the secret invariant in [Provider plugin boundary](provider-plugin-boundary.md#secret-invariant). The frozen provider request contains no such value.                           |
| Transport kind                      | The proposed Core-owned descriptor-declared class of access (`HttpApi`, `LocalEndpoint`, `CliHarness`, `ManagedAccount`, `Router`) in [Provider plugin boundary](provider-plugin-boundary.md#transport-taxonomy-proposal). The frozen descriptor has no transport field. |
| Network layer                       | The `bitty-network` extension: a light contract layer for request/response types, capability definitions, and service traits, plus a default-off implementation behind it. The adapter initiates I/O through this layer; the layer executes it.                          |
| Delegated behavior                  | A network behavior the adapter initiates through the network layer and must never implement, reimplement, or bypass locally.                                                                                                                                             |
| Adapter concern                     | A behavior that stays with the adapter because it is per-provider protocol semantics, not transport policy.                                                                                                                                                              |

The authoritative definitions of `ModelProvider`, `ModelDescriptor`, privacy
class, the capabilities vocabulary, the context budget, and the error kinds
stay with [AI Architecture](../architecture/ai-architecture.md) and
[Provider plugin boundary](provider-plugin-boundary.md). This document links
them and adds no second definition.

## Frozen v0.1 request and post-v0.1 envelope proposal

The v0.1 runtime is offline and has no provider transport adapter. Its
`ModelProvider` implementation is `FakeProvider`, so the frozen request and the
post-v0.1 proposal must not be described as the same envelope.

### Exact frozen v0.1 surface

`ModelProvider` exposes a `provider_id` identity accessor, `list_models`, and
`complete`. `ModelDescriptor` contains exactly `name` and `capabilities`.
`complete` receives one `TurnRequest` with these fields:

| Field          | Frozen v0.1 meaning                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| `model`        | The requested model name. The field is `model`, not `model_id`.                                                 |
| `messages`     | Bounded conversation messages assembled by the agent.                                                           |
| `context_refs` | Stable Id references already selected by the context layer.                                                     |
| `tools`        | Tool Bus names supplied for the turn.                                                                           |
| `budget_bytes` | The effective per-turn byte bound, not a reservation, reservation proof, or cross-delegation accounting object. |
| `timeout_ms`   | The caller-supplied duration bound for the provider call.                                                       |
| `now_ms`       | The caller-supplied timestamp used instead of reading a wall clock.                                             |
| `sampling`     | An optional declared sampling contract; `None` means undeclared.                                                |

The request has no `provider_id` or `model_id` field, transport kind,
descriptor context window, cost mark, privacy class, authorization-grant
evidence, credential reference, credential handle, `SecretField`, or budget
reservation. The provider's own `provider_id()` accessor and host-side model
registration metadata are not fields on `TurnRequest`.

`FakeProvider::complete` checks the hard timeout ceiling, validates sampling,
checks whether `request.model` exists in its descriptor list, and then compares
`request.total_message_bytes()` with `request.budget_bytes`. The unknown-model
and budget checks therefore happen after entry into the provider method. The
method performs no network I/O, so the current placement is compatible with the
zero-network v0.1 posture but is not evidence of a pre-entry gate.

### Post-v0.1 proposal, not a frozen interface

A future network-capable adapter may require additional routing facts, an
opaque credential reference at the host boundary, or new descriptor fields.
Those changes require a separately reviewed, versioned interface change; this
draft does not add them to the frozen Rust surface.

- Provider identity remains a property of the provider or host registration,
  not a proposed `TurnRequest` field named `provider_id`.
- The model request field remains `model`; this document does not rename it to
  `model_id`.
- Transport kind, context window, cost marks, privacy class, and the full
  `local-only` rule are proposed descriptor or registration facts, not frozen
  `ModelDescriptor` fields.
- A future secret-store integration may resolve a configuration reference on
  the Rust host side and present an opaque handle at the adapter boundary. The
  frozen provider request carries no credential value or handle. The current
  `SecretField` is a raw-value container, and its sole named
  `expose_for_adapter` path is reserved for the authorized host adapter edge.
- `budget_bytes` carries a context-budget bound only. It is not evidence for
  AIQ-24's open atomic ancestor/global delegation-reservation facets, and this
  document proposes no reservation mechanism.
- A future adapter must reject an unknown model and an over-budget request
  before initiating provider I/O. Whether those checks run in Core before
  method entry or at the start of a provider method is an implementation choice
  for the future interface; the frozen `FakeProvider` places both checks inside
  `complete`.

### Bounded request and credential obligations

- Messages, context references, and tool names remain the bounded request
  selected by the current agent and context layers. A future adapter does not
  collect context, re-truncate it, or widen the set; truncation counts and
  selection records stay with the context layer.
- A future network-capable provider validates the optional sampling contract
  before its first I/O. A field the backend does not support is refused with a
  typed outcome, never silently defaulted (the deferred sampling-matrix
  disposition in
  [Provider plugin boundary](provider-plugin-boundary.md#v01-interface-freeze-ai-0135)).
- `now_ms` and `timeout_ms` are the current timing inputs. A future adapter
  derives the whole-call deadline from those values without reading a wall
  clock in the kernel.
- Credential substitution is permitted only at the explicitly authorized host
  adapter edge. That edge may call `expose_for_adapter` solely to construct
  outgoing authentication material and must not retain the returned bytes in
  pool keys, errors, diagnostics, traces, journals, snapshots, caches, child
  environments, `BITTY_*` variables, discovery files, or agent-visible context.
- The network layer never reads the host secret store, resolves a credential
  reference, chooses a credential, or retains secret material. It may execute
  the already-authorized request after the adapter initiates it, subject to its
  own bounded, redacted transport contract. Network execution is not credential
  resolution.

### What no future envelope may carry

- A raw secret value or decrypted token outside the authorized host adapter
  edge, or a credential file path whose read would grant provider authority.
- Ambient filesystem, process, or network authority. A provider adapter is not
  a second authorization path; it does not widen caller, target, capability,
  consent, or budget scope (R2, AG-4).
- Vendor negotiation state. Endpoint construction, request signing, and
  account resolution are adapter-internal and never round-trip through Core.
- A model instruction derived from provider output. Provider output is
  untrusted observation data (T-10, R-013), never policy.

## Guarantees an adapter owes Core

### Deterministic timeouts

- For a future network-capable adapter, the deadline derived by Core governs
  the entire adapter call, covering connection, negotiation, redirects, and
  body reading, not only the first response byte.
- The frozen v0.1 implementation exports `DEFAULT_REQUEST_TIMEOUT_MS = 5 s`,
  `DEFAULT_TOOL_STREAM_TIMEOUT_MS = 10 s`, and
  `MAX_REQUEST_TIMEOUT_MS = 30 s`. These are implementation names and values,
  not new limits adopted here. The current `FakeProvider` checks the hard
  ceiling and scripted latency; it has no socket operation to bound.
- The kernel remains wall-clock-free, so a future deadline decision uses
  `now_ms` and `timeout_ms` from `TurnRequest` (CP-7).
- Request-level retry inside a future adapter stays inside the same deadline; a
  retry may not extend it, and a retry count is never unbounded.
- Deadline expiry maps to `Timeout` or `TimeoutTooLarge` with numeric
  attribution, never to a vendor code or transport-specific string (FS-AI4).
- Any additional per-stream or per-chunk idle bound is required by this
  contract but is not pinned here; a numeric value requires the same review as
  the MP-8 profile and no new number is adopted by this document.

### Provider-independent errors

The frozen v0.1 `ProviderError` surface has the following variants and has no
`Cancelled` variant:

| Variant               | Frozen payload                                 | Provider independence today                                                        |
| --------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `UnknownModel`        | `name`                                         | Typed kind; the requested model name remains data.                                 |
| `BudgetExceeded`      | `limit`, `actual`                              | Structured numeric outcome.                                                        |
| `Timeout`             | `timeout_ms`, `latency_ms`                     | Structured numeric outcome.                                                        |
| `TimeoutTooLarge`     | `max`, `actual`                                | Structured numeric outcome.                                                        |
| `InvalidProviderId`   | `id`                                           | Typed kind; the rejected identifier remains data.                                  |
| `Transport`           | `provider`, free-form `reason`                 | Partially independent: the kind is typed, but the reason can remain vendor-shaped. |
| `Auth`                | `provider`, free-form `reason`                 | Partially independent: the kind is typed, but the reason can remain vendor-shaped. |
| `RateLimited`         | `provider`, optional `retry_after_ms`          | Typed and transport-neutral apart from provider identity.                          |
| `CapabilityMismatch`  | `provider`, `model`, `missing` capability list | Typed and transport-neutral apart from provider and model identity.                |
| `ModelUnavailable`    | `provider`, `model`                            | Typed and transport-neutral apart from provider and model identity.                |
| `Unknown`             | `provider`, free-form `reason`                 | Partially independent: the kind is typed, but the reason can remain vendor-shaped. |
| `InvalidSampling`     | No value                                       | Static, provider-independent outcome.                                              |
| `UnsupportedSampling` | Static backend field label                     | Typed and provider-independent; the label must never echo caller input.            |

`AgentError::from(ProviderError)` bounds the `provider` and `reason` strings in
`Transport`, `Auth`, and `Unknown` to at most 512 printable ASCII bytes, and it
also bounds the provider string in `RateLimited`. That conversion removes
control characters and bounds length, but it neither canonicalizes vendor
meaning nor performs secret redaction. Those three reason-bearing variants are
therefore only partially provider-independent today. A future adapter must map
vendor statuses and messages to the existing typed variants and use bounded,
non-secret reason categories; this document proposes no additional error
variant.

Cancellation is not a `ProviderError`. The frozen agent checks session
cancellation before dispatch and between rounds and returns its cancellation
outcome outside the provider error surface. The frozen `ModelProvider` trait
has no `cancel` operation, so this document does not claim an in-flight
cancellation mapping that the code does not define.

- Retryable versus terminal classification remains a Core-owned vocabulary
  decision because Core owns ordered fallback semantics. An adapter never
  invents a local taxonomy or silently substitutes a different model.
- `Unknown` means the effect may have happened but was not confirmed. It is
  reconciled before retry (MP-7); an adapter never reports unobserved success
  or claims rollback of an effect that already occurred.
- A fault in one future adapter call affects only its owning session or stream
  (MP-11, FS-AI3). Sibling sessions, terminals, and plugin virtual machines
  stay responsive.
- The frozen streaming module has two distinct bounds:
  `MAX_STREAM_CHUNK_BYTES = 256 KiB` is the aggregate transport ceiling, while
  `MAX_FRAGMENT_BYTES = 64 KiB` is the tighter runtime fragment ceiling and
  fires first. The `ModelProvider::stream` operation remains deferred. When a
  future adapter streams, it preserves `seq`/`total`/`final`, both ceilings, and
  countable drop-oldest backpressure without silent loss; it does not treat the
  256 KiB aggregate ceiling as permission to emit a fragment larger than 64 KiB.

### Context-budget check before provider I/O

- In frozen v0.1, the agent resolves one effective byte bound, uses it for
  context assembly, and copies it into `TurnRequest.budget_bytes`.
  `FakeProvider::complete` then compares the request's message bytes with that
  bound and returns `BudgetExceeded` when they exceed it. This check is inside
  the provider method, not before method entry, and the offline provider starts
  no I/O.
- A future network-capable adapter must complete the applicable authorization,
  consent, and context-budget checks before it initiates provider I/O. This is
  an ordering obligation for the first network operation, not a requirement for
  a generic reservation object or for checks to occur before method entry.
- `budget_bytes` is a CP-5 context bound. AIQ-24 concerns atomic ancestor and
  global reservation across concurrent delegation; its open facets are a
  separate question, and this document neither closes nor selects a mechanism
  for them.
- Provider I/O consumption is charged against the same per-client quotas as IPC
  and MCP traffic, with no separate model-specific budget (MP-9). A future
  adapter reports usage; Core owns ledger semantics.
- A future adapter-declared limit may only tighten an effective bound. It may
  never raise a caller, transport, or network limit, and the effective bound is
  the tighter value.

### No vendor branching inside Core

- Adding a vendor shape must not require a Rust change in Core. A new provider
  is a new adapter plus declarative preset data; a base-URL change, a rename, a
  custom header, or a private gateway stays data (MPC-5).
- A Core condition that matches a provider name, an endpoint shape, or a
  vendor wire format is a conformance defect, not a feature. A future Core may
  branch on Core-owned vocabulary only: transport kind, declared capabilities,
  privacy class, and the error and outcome kinds.
- Core never accumulates per-vendor defaults, status-code tables, or
  retry tables. Those are adapter data, and the shared policy that constrains
  them is the one enumerated in this document.

## Network behavior delegated to the network layer

The adapter is a client of the network layer, not a second network stack. A
future adapter initiates network I/O by issuing an authorized request through
the network layer's contract surface; the network layer executes destination
resolution, socket, TLS, HTTP, and WebSocket operations. The adapter never
depends on the network implementation crate directly, and the kernel depends on
neither. The network runtime is default-off, so a network-capable adapter must
never be part of a default build.

Nothing below is decided here; each row records that the behavior is owned by
the network layer and consumed by the adapter, so that integration is a
matter of wiring to a published contract rather than a second design. The
issue tag on each row names the network-layer delivery it depends on, as
recorded in
[Precondition: network-layer delivery](#precondition-network-layer-delivery).

| Behavior                                                                                                                      | Owner                        | Adapter obligation                                                                                                              | Not in the adapter                                                             | Precondition                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Redirect following, per-hop re-authorization against the capability, hop limit, cross-origin sensitive-header strip or denial | Network                      | Declare the destination once and pass the request through; treat any surfaced redirect as a policy outcome, not a hint to retry | No redirect follower, no hop counting, no header-preservation rule             | #37                                                                          |
| Proxy resolution precedence and proxy authentication, including refusing to dial an HTTPS proxy as plaintext                  | Network                      | Express its proxy requirement; accept the resolved policy                                                                       | No proxy stack, no environment reading of proxy secrets, no plaintext fallback | #38                                                                          |
| TLS verification, supported protocol and cipher posture, certificate handling, and typed failure behavior                     | `bitty-network` TLS contract | Initiate requests only through the enforced posture                                                                             | No TLS bypass, no verification override, no adapter-selected trust store       | A reviewed `bitty-network` TLS policy contract; #37 and #38 do not define it |
| Transfer budgets for declared and chunked bodies, aggregate limits, and WebSocket frame and message limits                    | Network                      | Request its bound and honor the enforced ceiling                                                                                | No unbounded buffering, no self-selected larger limit                          | #37, #38                                                                     |
| Connection deadline preservation across receive, send, and close                                                              | Network                      | Rely on the enforced per-connection deadlines when pacing reads, writes, and close                                              | No deadline extension, no idle-hold of a connection                            | #38                                                                          |
| Destination resolution: DNS, resolution deadline, and resolver cancellation                                                   | Network                      | Consume the resolved destination and its failure                                                                                | No resolver, no address cache, no deadline re-implementation                   | #39                                                                          |
| Tunnel and protocol framing details: CONNECT leftover handling and bounded subprotocol offers                                 | Network                      | Use only the offered, bounded surface                                                                                           | No hand-rolled tunnel, no unbounded protocol offer                             | #39                                                                          |
| Diagnostic hygiene: redaction of headers, bodies, userinfo, and control-bearing hosts, with safe correlation data retained    | Network                      | Add typed `SecretField` redaction to its own records (PP-2)                                                                     | No raw request or response dump in an error string                             | #39                                                                          |

Issue numbers in the last column refer only to the work named by those issues
in the `bitty-network` repository. Issues #37 and #38 do not define general TLS
verification, protocol, cipher, or certificate policy; the network repository's
TLS contract owns that policy. The current sealed TLS marker exposes no policy
type for an adapter to consume. A network-capable provider therefore has an
additional TLS-policy precondition beyond those issues, and no adapter-selected
verification override is proposed.

### Anti-growth rule

The delegation table is a ceiling, not a starting point. If the adapter needs
a behavior the network contract does not offer, the correct response is a
change request to the network owner, not a local implementation. An adapter
that grows its own redirect follower, proxy stack, TLS bypass, resolver, or
unbounded buffer is out of contract by construction, and a review finding of
such code is a defect regardless of the feature it enables.

### Policy precedence

Effective behavior is the intersection of the network layer's enforced policy
and the adapter's declared requirement. The adapter may narrow — one
endpoint, one protocol, one smaller ceiling — and may never widen. A request
the network layer refuses is reported as a typed outcome to Core; the adapter
does not route around the refusal with a second path, and a refused
destination never becomes a reason to try a different provider inside the
adapter (Core owns fallback order).

### Destination and privacy class

A `local-only` provider performs no network I/O at all (MP-3), including no
loopback HTTP call. A loopback destination is a destination the network layer
evaluates under its own policy, not a private shortcut the adapter may assume;
an adapter that treats loopback as an exemption from network policy is out of
contract.

## Concerns that remain with the adapter

### Connection pooling

Pooling and reuse are per-provider concerns because they depend on endpoint,
protocol, and credential scope, so they stay with the adapter. The adapter
owns a bounded pool with idle eviction, keyed so that a connection is never
reused across credential scopes, provider identities, or privacy classes, and
never across a revoked grant. Pooling must not retain a body, a header, or a
resolved credential value, and a cancelled call must not leave a pooled entry
holding request state.

### Chunked bodies

Reading a provider's chunked body incrementally, and stopping at the
enforced bound instead of materializing the whole response, is an adapter
concern; the bound itself is a network-layer budget. The adapter may
accumulate only up to the effective ceiling, must report a typed failure when
the ceiling is reached, and must never treat a truncated body as a complete
turn.

### SSE framing

Parsing server-sent event framing — event and data field lines, comment
lines, vendor stop sentinels, and per-event payload limits — and translating
vendor event types into the Core-owned stream shape is an adapter concern.
The adapter preserves `seq`/`total`/`final`, the 64 KiB runtime-fragment
ceiling, and countable shedding on what it emits. The network transport
enforces the separate 256 KiB aggregate transport ceiling; the adapter does not
set or bypass that transport limit.

### The line between the two layers

Framing is the adapter's; limits are the network layer's; policy is the
network layer's; protocol semantics are the adapter's. Endpoint construction
from a descriptor base URL, request and response mapping for a vendor shape,
request signing, request-level retry inside one deadline, model discovery for
the providers an adapter implements, and account flows behind opaque handles
are adapter concerns, per the Core-versus-plugin boundary in
[Provider plugin boundary](provider-plugin-boundary.md#core-versus-plugin-boundary)
and the transport taxonomy recorded there.

## Precondition: network-layer delivery

A network-capable provider transport adapter depends on the shared `bitty-network`
extension. The core network foundation contracts and security architectures
have been delivered in the `bitty-network` repository:

| Issue / Decision                  | Title                                                                          | Delivered interface and contract                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `bitty-terminal/bitty-network#37` | Re-authorize redirects and enforce HTTP response budgets                       | Redirect re-authorization per-hop against capability; body budget via `Request.max_body_bytes`                 |
| `bitty-terminal/bitty-network#38` | Bound WebSocket messages and preserve proxy/deadline safety                    | Proxy precedence, refusing plaintext for TLS endpoints, connection deadline pacing                             |
| `bitty-terminal/bitty-network#39` | Harden CONNECT, DNS, subprotocol, and diagnostic boundaries                    | DNS resolution deadlines, tunnel framing, diagnostic hygiene with redacting Debug and Display                  |
| `bitty-terminal/bitty-network#25` | Authenticated proxy credentials, canonical origin normalization, scoped leases | `CanonicalOrigin`, `ProxyCredentialProvider`, `ScopeRegistry`, `AuthorizationLease` with dual-origin binding   |
| `bitty-terminal/bitty-network#28` | OAuth credential flow architecture and security boundary                       | Proactive refresh, exclusive pool invalidation via `ScopeRegistry::invalidate_origin`, opaque bearer redaction |

The delivered `bitty-network-api` crate provides the stable consumer interface:

- `bitty_network_api::Request`: carries method, destination URL string, headers,
  body, optional transfer ceiling `max_body_bytes`, and deadline `timeout_ms`.
  `TurnRequest.budget_bytes` maps directly to `max_body_bytes`.
- `bitty_network_api::Response`: typed status, response headers, and body bytes
  bounded by the requested budget.
- `bitty_network_api::NetworkError`: typed error variants (`Offline`, `Timeout`,
  `Cancelled`, `BadStatus`, etc.) with fail-closed offline semantics and
  non-leaking Display and Debug representations.
- `bitty_network::ScopeRegistry` and `AuthorizationLease`: thread-safe connection
  pool scoping by `(proxy_origin, destination_origin, credential_id, generation, scope_epoch)`,
  supporting proactive invalidation and lease draining upon OAuth token refresh
  or grant revocation.

The host-only credential exposure edge injects bearer tokens
(`Authorization: Bearer <secret>`) strictly at the adapter boundary via
`SecretField::expose_for_adapter()` under `ai.provider` consent before handing
off the request to the network executor. The network layer cannot resolve or
retain credentials.

## Explicit non-claims

- No provider transport adapter or vendor integration described here exists in
  `bitty-ai`. The separate network repository's transport work does not make an
  AI provider adapter implemented, and no sentence here implies otherwise.
- No dependency, crate, trait, feature name, or version is adopted. The
  `HttpTransport` and provider-trait sketches in
  [Dependency Strategy](dependency-strategy.md#httptransport-split-and-test-transports)
  remain future direction; this document states obligations, not Rust types.
- No numeric timeout, transfer limit, hop count, pool size, or policy value is
  adopted or changed.
- No AIQ entry is closed, narrowed, or promoted, and no new identifier is
  proposed. Open-question ownership and promotion stay with
  [AI Unresolved Questions](../product/ai-unresolved-questions.md).
- No owner, milestone, or delivery commitment is set. The registry split, the
  secret store, the Model Manager panel, and plugin-registry mechanics stay
  with their owning repositories as handoff input.
- The v0.1 posture is restated, not changed: no network access in v0.1 code
  paths, with a `FakeProvider` covering all tests.

## Security review

- **Credentials.** Credential material remains opaque across configuration,
  Core, plugins, models, agents, diagnostics, and storage under MP-10 and
  MPC-2. The frozen `SecretField` may reveal raw bytes only through
  `expose_for_adapter` at the authorized host adapter edge. The network layer
  never performs host-side resolution or substitution. A raw value outside
  that edge, or any value reaching a child environment, a `BITTY_*` variable,
  a discovery file, a trace, a journal, or an agent workspace, is a
  release-blocking defect (PP-2, PP-5, FS-AI5, Invariant 9, P0-AC-026).
- **Redaction timing.** Typed `SecretField` redaction applies before queue and
  before write, in the adapter as much as in the kernel. The container-level
  redaction facet is `Closed(partial)` in the register under AIQ-5A, whose
  timing and marker/invalidation facets stay open there; this document neither
  reopens nor extends that disposition.
- **No ambient authority.** Consuming the network layer adds no filesystem,
  process, or network authority to the kernel or to any plugin virtual machine.
  A network-capable adapter stays behind the same caller, target, capability,
  consent, and budget gates as any other effect (AG-4, R2).
- **Minimization and isolation.** A future adapter sends only the
  budget-resolved request. Adding a dependency never justifies sending more
  context than the task needs (PP-1). First-party or "trusted" provider status
  grants no ambient authority and no sandbox, isolation, or capability
  exemption. Until AIQ-33 and AIQ-38 resolve the unified enforcement and
  placement choices, a network-capable adapter must remain inside the
  isolation domain and explicit capability envelope selected by those
  decisions.
- **Untrusted output.** Provider output is observation data, never an
  instruction (T-10, R-013). A prompt fragment arriving over the adapter is
  labeled by the existing pipeline, not by adapter-local string inspection.
- **Fail closed.** If bounding, redaction, or consent machinery cannot start
  or is detected disabled, the adapter refuses to serve rather than serving
  unbounded or unredacted (FS-AI7, FS-AI1).
- **No TLS or policy bypass.** Any adapter-side attempt to relax network
  policy, verify nothing, follow a redirect unchecked, or buffer without a
  bound weakens a P0 trust boundary and returns `NEEDS-FIX` at review.

## Verification plan

Review verifies the frozen v0.1 statements against the owning implementation
and treats the future-adapter items as acceptance bars, not as evidence that a
network adapter exists.

- Frozen-surface evidence: tests or generated API documentation show
  `ModelDescriptor` contains only `name` and `capabilities`, and `TurnRequest`
  contains exactly the eight fields listed above. Tests show `FakeProvider`
  checks timeout, sampling, model membership, and message bytes inside
  `complete` without network I/O.
- Future-envelope evidence: a versioned interface review shows every added
  field and its authority, with no silent `model_id`, transport, descriptor,
  grant, credential, or reservation field added to the frozen request.
- Credential evidence: seeded sentinel tests prove raw bytes are exposed only
  at the host adapter edge, never retained in errors, diagnostics, traces,
  journals, pool keys, snapshots, or child environments, and that the network
  layer performs no secret-store lookup or credential substitution.
- Deadline evidence: connect, negotiation, redirect, and body-read phases are
  each bounded by the caller deadline, retries cannot extend it, and the frozen
  hard ceiling is never exceeded.
- Error-mapping evidence: a table covers every frozen `ProviderError` variant,
  records that cancellation has no provider variant, and demonstrates bounded
  non-secret reasons for `Transport`, `Auth`, and `Unknown` without changing
  their current free-form type.
- Budget evidence: traces show the agent derives one effective
  `budget_bytes`, the offline provider checks it inside `complete`, and a
  future network adapter produces `BudgetExceeded` before its first socket. No
  trace depends on a reservation object or decides AIQ-24.
- Delegation evidence: static review shows the adapter initiates requests but
  implements no redirect follower, proxy stack, TLS policy, resolver, or
  unbounded buffer. Fixtures show the network layer executes or refuses the
  request and the adapter cannot route around a refusal.
- TLS evidence: the `bitty-network` contract publishes peer verification,
  protocol and cipher posture, certificate handling, and typed failures.
  Issues #37 and #38 alone do not satisfy this precondition.
- Isolation evidence: a network-capable test path cannot obtain filesystem,
  process, or network capability merely from first-party or "trusted" status,
  and remains inside the isolation domain selected through AIQ-33 and AIQ-38.
- Kernel evidence: a dependency graph shows the kernel reaches neither the
  network contract nor its implementation, directly or transitively, and a
  default build contains no network backend.
- No-branching evidence: registering and calling a second provider shape
  requires no vendor branch in Core, and static search finds no provider-name
  or vendor-wire-format condition there.
- Containment evidence: a failing future adapter call leaves sibling sessions,
  terminals, and plugin virtual machines responsive (MP-11, FS-AI3), while
  safe startup still works with no provider configured (FS-AI6).
- Determinism evidence: seeded `now_ms`, in-memory descriptor snapshots, and a
  mock or recorded network client drive a future turn with no wall-clock,
  filesystem, or network I/O in the kernel (CP-7).

## Alternatives considered

- **Let the adapter own its HTTP stack.** Rejected: it duplicates network
  policy in a second place, creates two TLS postures, and puts transfer
  budgets and redirect rules outside the layer that already enforces them
  fail-closed. The dependency direction in
  [Dependency Strategy](dependency-strategy.md) also argues against
  hand-implementing TCP, HTTP, TLS, chunked bodies, SSE, proxying, pooling,
  timeouts, and redirects.
- **Move transport into the kernel.** Rejected: it violates the kernel
  principle and makes every dependent inherit the HTTP and TLS tree. The
  dependency-inversion rule stands.
- **Put the adapter in a separate process behind an IPC boundary.** Considered
  and not selected here. It adds a process boundary that the network layer
  already provides as a contract boundary, and its placement interacts with
  execution ownership, which is open under AIQ-38. This document does not
  settle it.
- **Branch on vendor identity inside Core.** Rejected explicitly by MPC-5: it
  would make Core a second registry and turn every new vendor into a Rust
  change.
- **Let the adapter own proxy selection from its configuration.** Rejected:
  proxy precedence and proxy authentication, including the refusal to treat an
  HTTPS proxy as plaintext, are network-layer policy; a per-adapter
  configuration would create divergent proxy postures.

## Affected contracts

- [AI Architecture](../architecture/ai-architecture.md) (Draft): MP-1 through
  MP-11, MPC-1, MPC-2, MPC-5, and CP-5 are elaborated here, not changed.
  MP-8 timeouts, MP-9 quota sharing, MP-10 credential handling, MP-11
  containment, CP-5 pre-I/O budget, CP-7 determinism, PP-1 through PP-6,
  FS-AI1 through FS-AI7, and MPC-5's retained transport mandates all keep their
  current force.
- [Provider plugin boundary](provider-plugin-boundary.md) (Draft): the
  Core-owned surface, the transport taxonomy, the Core-versus-plugin table, the
  secret invariant, and the bitty-side handoff list are unchanged; this
  document is the consumer-side elaboration of the transport row.
- [Dependency Strategy](dependency-strategy.md) (Draft): the kernel principle,
  the adapter boundary map, the provider-and-transport separation, and the
  post-v0.1 adapter status are unchanged; no dependency is adopted.
- [Tool transport R2](../architecture/tool-transport-r2.md) (Draft): the
  unified authorization backend is a precondition for adapter entry, not a
  choice this document makes.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
  (Draft): unchanged; the zero-network v0.1 posture and the
  single-`bitty-ai-runtime` scope gate stand.
- The `bitty-network` contract: consumed, not defined. This document creates
  no obligation for that repository and changes no value it owns.

## Open points

This document closes no register entry and proposes no new identifier:

- **AIQ-33 (unified authorization and isolation backend) stays open.** The
  adapter must sit behind the unified backend for every effect it triggers, but
  the backend mechanism is an unselected open choice. Nothing here narrows it.
- **AIQ-36 (native versus MCP tool transport and bridge placement) stays
  open.** This document governs the provider transport path only and decides
  nothing about tool-transport placement or bridge placement.
- AIQ-5A (typed redaction markers and invalidation mechanism) keeps its
  existing `Closed(partial)` disposition. Credential opacity across
  non-adapter surfaces and the named host-edge exposure path are stated here;
  the timing and marker/invalidation facets stay where the register put them.
- AIQ-38 (generic execution and registry ownership across repositories) stays
  open: the registry split and placement that decide where an adapter is
  registered and isolated remain undecided.
- **AIQ-02 (compression backend selection) is Closed (adopted-draft).**
  L2+ selective compression summarization routes through the host-provided
  `Summarizer` trait (`bitty_ai_runtime::compression::Summarizer`) with full
  dependency inversion. When model-backed summarization is selected, it routes
  through `ModelProvider::complete` within user consent (`ai.provider`), bounded
  by `budget_bytes`, delegating transport to `bitty-network` via the transport
  adapter contract. Untrusted sources preserve untrusted provenance with zero
  priority escalation.
- AIQ-13 (provider-scoped cache key and routing scope) keeps its register entry.
  AIQ-24's open atomic ancestor/global delegation-reservation facets also stay
  open and are distinct from the CP-5 context bound in `budget_bytes`. This
  document selects no cross-delegation reservation mechanism.
- Numeric transfer limits, redirect policy, and proxy precedence remain owned
  by the `bitty-network` contract. Its TLS contract must also define
  verification, protocol, cipher, certificate, and failure policy; this
  document proposes no override path.
- Host secret-store representation and revocation remain outside this
  document. Credential substitution is fixed at the authorized host adapter
  edge; the network layer is excluded from resolution and substitution.
- Open risk: an adapter quietly becomes a second HTTP stack. Mitigation: the
  anti-growth rule, static review, and delegation evidence in the verification
  plan.
- Open risk: first-party provider status is mistaken for an isolation
  exemption. Mitigation: explicit capability and isolation evidence while
  AIQ-33 and AIQ-38 remain open.

## Acceptance criteria

This draft passes document-level review only when all of the following are
true:

- The exact frozen `ModelDescriptor` and `TurnRequest` fields match the v0.1
  implementation, every absent field is named, and no post-v0.1 proposal is
  described as frozen.
- The document states that `FakeProvider::complete` checks unknown model and
  message-byte budget inside the provider method, while the no-I/O obligation
  applies before a future network adapter initiates I/O.
- The error section covers every frozen `ProviderError` variant, states that no
  cancellation variant exists, and identifies the still-free-form reasons in
  `Transport`, `Auth`, and `Unknown` without claiming they are normalized.
- Credential resolution and substitution are limited to the authorized host
  adapter edge; the network layer cannot resolve or retain credentials.
- No first-party or "trusted" label grants an isolation, sandbox, filesystem,
  process, or network capability exemption while AIQ-33 and AIQ-38 remain open.
- TLS policy is named as a separate `bitty-network` precondition, issues #37
  and #38 are not cited as its definition, and no bypass or override is
  proposed.
- AIQ-5A is spelled canonically; AIQ-24 is kept distinct from CP-5; AIQ-33,
  AIQ-36, and AIQ-38 remain open; no identifier, owner assignment, milestone,
  or implementation authorization is introduced.
- Every changed canonical file is self-contained: it contains no implementation
  line range, revision fingerprint, or historical navigation label.
- `just check`, `just fmt`, `just links`, `just metadata`, and `just language`
  pass, and independent architecture, docs-curator, and security review records
  no blocking finding.

## P0 Review Sign-off

No P0 sign-off is claimed by this document. Before any reliance, the security
reviewer must verify the frozen-versus-proposed boundary, the host-only
credential edge, the absence of an isolation exemption, the actual error
surface, and the separate TLS-policy precondition. The architecture category
owner must verify the adapter/network initiation-and-execution boundary, and the
docs curator must verify self-containment, taxonomy, metadata, and links.
Repository gate success and this draft do not constitute those sign-offs.

## References

- [AI Architecture](../architecture/ai-architecture.md) (Draft): MP-1 through
  MP-11, MPC-1 through MPC-6, CP-5, CP-7, PP-1 through PP-6, and FS-AI1
  through FS-AI7.
- [Provider plugin boundary](provider-plugin-boundary.md) (Draft): Core-owned
  surface, transport taxonomy, Core-versus-plugin boundary, secret invariant,
  v0.1 interface freeze, and bitty-side handoff.
- [Dependency Strategy](dependency-strategy.md) (Draft): kernel principle,
  adapter boundary map, provider-and-transport separation, and the
  `HttpTransport` sketch as future direction.
- [Tool transport R2](../architecture/tool-transport-r2.md) (Draft): unified
  authorization backend and path-selection contract as the adapter's
  precondition.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft):
  AIQ-02 (Closed, adopted-draft), AIQ-5A, AIQ-13, AIQ-24, AIQ-33, AIQ-36, and
  AIQ-38.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
  (Draft): single-crate scope and the no-network v0.1 posture.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounded
  framing, scopes, consent ledger, and streaming chunking.
- `bitty-network` Issues 25, 28, 37, 38, and 39: the delivery contracts
  recorded in [Precondition: network-layer delivery](#precondition-network-layer-delivery).
