---
title: Caller attribution design
description: Draft candidate caller-attribution field and LLM-plugin boundary derived from the candidate direction
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 60
---

# Caller attribution design

> Status: **draft**. This document records the candidate direction (both halves: caller
> attribution and the LLM-plugin boundary) as a draft candidate design. It proposes no accepted architecture, authorizes no shipped
> behavior, closes no Artificial Intelligence Question entry, mints no AIQ or
> OQ identifier, introduces no product code, and changes no accepted document.
> The accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and the normative security
> corpus override any statement here. Every source anchor below is read-only
> survey evidence at `bitty-ai` `main` `97d3125`; no file in the `bitty-ai`
> repository was modified.

## Purpose and scope

This design captures two halves of the candidate direction as one draft:

1. Caller attribution for provider calls: an optional caller-identity field
   on the turn-request contract so usage can be attributed to the calling
   application at the request layer, following the observed OpenRouter Apps
   mechanism.
2. The LLM-provider layer split: a Wheel-manages-Agent versus
   plugin-manages-Provider boundary, reconciled against (not re-deciding) the
   existing two-level plugin model in
   [Provider plugin boundary](../providers/provider-plugin-boundary.md).

Inputs are the candidate direction, the draft [Provider plugin
boundary](../providers/provider-plugin-boundary.md) (the `Router` transport at `:130-132`,
the two-level plugin model at `:141-166`, the secret invariant at `:194`), and
the accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) as overriding authority.
Wheel/app-level default identity (for example a Wheel `Referer`/`Title`) is
decided with the Wheel MVP, not here.

No product code is introduced or described as implemented.

## Observed mechanism: caller-declared attribution

The candidate direction's first half observes how a gateway-side Apps ranking
works, using OpenRouter model pages as the concrete example. The mechanism is
caller-declared attribution, not gateway scanning:

- Each request may carry caller-identity headers: `HTTP-Referer` as the
  unique application id (for example a product URL), `X-OpenRouter-Title`
  (older form `X-Title`) as the display name, `X-OpenRouter-Categories` as
  the application category, and `X-OpenRouter-App-Visibility: hidden` to opt
  out of the public ranking.
- The gateway aggregates per model and application: which model, which app
  (merged by `Referer`, with near-duplicate URLs merged into one entry), how
  many prompt plus completion tokens, bucketed by UTC natural day in real
  time.
- Calls without `Referer` never enter the ranking; they remain unattributed
  or private traffic. Hidden apps and requests marked private are likewise
  excluded. The published figure (the record cites 62.6B tokens in-window) is
  attributed public-app traffic, not global model usage.
- Token counts come from upstream tokenizers, so figures across vendors are
  order-of-magnitude signals, not precision comparisons. Agent-shaped traffic
  further amplifies token counts because context is replayed across turns.
- Listed applications (the record names Hermes Agent, Claude Code, Cline,
  and ZCode) are harness or agent products whose clients self-report identity
  by default; many unrelated users behind one client aggregate under one app
  entry.

Three common misreadings are explicitly rejected: the gateway does not
intrude into applications (apps volunteer identity in request headers); the
ranking is not total usage (direct vendor connections, header-less calls, and
hidden traffic are absent); token height is not a quality or popularity
verdict.

The owner requirement recorded in the candidate direction is that this attribution must
enter future design, otherwise callers cannot know where usage was spent.

## Code survey (read-only evidence at `bitty-ai` `main` `97d3125`)

### `TurnRequest` carries no caller identity

`crates/bitty-ai-runtime/src/provider.rs:411-430` defines `TurnRequest` with
exactly these fields:

| Field          | Anchor                | Carries caller identity |
| -------------- | --------------------- | ----------------------- |
| `model`        | `provider.rs:413`     | No                      |
| `messages`     | `provider.rs:415`     | No                      |
| `context_refs` | `provider.rs:417`     | No                      |
| `tools`        | `provider.rs:419`     | No                      |
| `budget_bytes` | `provider.rs:422`     | No                      |
| `timeout_ms`   | `provider.rs:424`     | No                      |
| `now_ms`       | `provider.rs:426`     | No                      |
| `sampling`     | `provider.rs:427-429` | No                      |

The `sampling` doc comment (`provider.rs:427-429`) is the closest existing
precedent for the proposed semantics: `None` means undeclared and flows
through untouched, never defaulted, never hashed into keys.

### The only HTTP emitter sends no identity headers

`LocalProvider::http_round_trip`
(`crates/bitty-ai-slice/src/local_provider.rs:611-683`) builds exactly one
request head (`local_provider.rs:652-658`): `Host`, `Content-Type`,
`Content-Length`, and `Connection`, plus optional `Authorization: Bearer`
(`local_provider.rs:660-663`). No `Referer`, no title, no caller identifier
of any kind travels with the request.

### Cost controls are internal units, not attribution

`agent.rs:976-987` defines `round_usage`: provider-reported usage when
either count is non-zero, else a deterministic byte-based estimate, feeding
the per-turn cost fuse. `selection.rs:747-756` defines `estimate_cost`: a
pure weighted sum (with the zero-weight-counts-as-one rule) used for
routing estimates and the selection cost-ceiling filter, performing no I/O
and authorizing nothing. Both answer "how much did this round cost against
the ceiling", never "which application spent these tokens".

### The Router transport has no identity rule

The closest specification anchor is the `Router` transport in [Provider
plugin boundary](../providers/provider-plugin-boundary.md) (`:130-132`): a multi-upstream
gateway is one provider entry with its own descriptor, capabilities, and
accounting. That covers the gateway as a provider, but states no
caller-identity declaration or transit rule: nothing declares which
application a request belongs to, and no adapter has a field to transit.

## Proposed caller-attribution field (candidate sketch)

The block below is an illustrative design sketch, not product code. It must
not be copied into a crate as an implementation; it exists so reviewers can
judge the shape before any task is scoped. Field names and bounds are
placeholders.

```rust
// Illustrative sketch only: candidate caller-attribution shape, not product code.
// Optional identity a caller declares about itself; adapters translate it
// into whatever headers the gateway expects (for example HTTP-Referer /
// X-Title on an OpenRouter-style router). Absent means explicitly
// unattributed: local or private traffic that must stay distinguishable
// from declared identity, mirroring the `sampling: None` precedent
// (`provider.rs:427-429`).
pub struct CallerAttribution {
    // Application id; the merge key the gateway aggregates on.
    // Bounded, printable ASCII only, validated fail-closed.
    pub app_id: String,
    // Optional display name shown in gateway-side rankings.
    pub title: Option<String>,
    // Optional category (for example cli-agent, ide-extension).
    pub category: Option<String>,
}
```

Concretely, the record proposes adding an optional field of this shape on
`TurnRequest` (app id plus optional title and category). Adapters translate
it into gateway headers when emitting real HTTP; `LocalEndpoint` (loopback)
needs no wiring because it never leaves the machine. Real `HttpApi` or
`Router` adapters (the transport taxonomy in [Provider plugin
boundary](../providers/provider-plugin-boundary.md), `:115-132`) wire the field when such
an adapter is actually built: no code is written for imagined gateways.

Four boundaries constrain the proposal, each resting on an existing
principle:

1. Identity is not credential. The secret invariant in [Provider plugin
   boundary](../providers/provider-plugin-boundary.md) (`:194`) applies unchanged:
   attribution travels in request headers, never in prompts and never in
   context; before reaching any typed surface it is bounded and scrubbed,
   following the `bound_reason` precedent (`bridge.rs:119`, 512-byte
   scrub-aware bound).
2. Declaration-only, no settlement. Tokenization and pricing are gateway and
   upstream business. Core guarantees only that what was declared transited
   and is auditable; it never re-prices, re-tokenizes, or certifies gateway
   figures.
3. Absent means explicitly unattributed. Following the `sampling: None`
   "undeclared flows through untouched" rule, a missing field is local or
   private traffic: never forged, never defaulted, and always
   distinguishable from declared identity, or aggregation data goes stale.
4. Excluded from cache keys and routing, wired per adapter. Like sampling
   (`provider.rs:406-410`: participates in `PartialEq` but never in cache
   keys, which cover provider route plus canonical bytes only), the identity
   field must not enter cache keys or routing inputs. Each adapter wires it
   only where the transport supports it.

Implementation timing stays deferred: an `AI-XXXX` implementation task is
proposed only when a real HTTP or Router adapter lands.

## LLM-plugin boundary (candidate split)

The record's second half proposes the LLM-provider layer as its own Model
Infrastructure plugin, separate from Wheel. The split, stated as a candidate
direction to be decided by the owning review, is:

> Wheel manages Agent, never Provider. The LLM plugin manages Provider,
> Auth, Model, Thinking, Routing, and Catalog, never Agent.

Wheel would then see only a unified Model (id, capabilities, thinking
levels); agents bind model plus thinking plus fallback plus budget while
authentication mechanics (API key, OAuth, subscription, cloud credentials,
local endpoints) stay hidden behind the boundary. The resulting layering is:

```text
Bitty Core
|  (plugin runtime, IPC, Secure Secret Store, permission, streaming)
v
Official LLM Plugin
|  (Provider Registry, Auth, Model Registry, Discovery, Metadata,
|   Thinking Normalization, Request/Response Normalization,
|   Routing/Fallback, Usage/Quota, Model Profiles)
v
Model API
|       |          |
v       v          v
Wheel   Future     Other
        Agents     Plugins
```

Candidate plugin scope, all unaccepted: a Provider Registry; Authentication
as an Auth Strategy (`api_key`, `oauth`, `subscription_oauth`,
`aws_credentials`, `google_adc`, `bearer`, `none`); a Model Catalog with
discovery and sync (the record cites models.dev, the oh-my-pi catalog and
discovery, and the OmniRoute provider reference as references); Protocol
Adapters; Model Normalization (unified reasoning levels with clamp and
fallback, provider-versus-model separation so the same weights behind
different endpoints differ in endpoint, auth, quota, and price); Routing
(fallback, alias, preference); and Usage (token, quota, rate, cost).

Three positions from the record need quoting because they carry the security
and product weight of the split:

- Auth Strategy admits officially allowed or stable flows only: no cookie
  harvesting, no credential scraping out of other CLIs, no simulated web
  requests, no reversed private endpoints. Subscription adapters must be
  replaceable (the record cites the Google AI Pro and Ultra migration to the
  Antigravity product line as the cautionary case), never a foundation Wheel
  assumes.
- A unified Model Capability plus Model Profiles (the record sketches
  `@fast`, `@cheap`, `@smart`, `@deep`, `@vision`, `@coding`, following the
  oh-my-pi model-roles precedent) lets agent files stay unchanged when
  providers are swapped: only the profile changes. Wheel keeps only the thin
  layer (`agent.model`, `agent.thinking`, `agent.model_fallback`,
  `agent.model_budget`, and task-to-model policy).
- The Secure Secret Store belongs to Core (opaque handles, never per-plugin
  plaintext token files) so every plugin reuses one secrets permission
  system. Lua owns the control plane first; heavy machinery (SSE, OAuth
  callbacks, HTTP/2, retry, proxy, TLS, refresh, streaming JSON,
  concurrency) may sink to a native provider ABI later. The product boundary
  is what matters, not which language implements the machinery.

Reconciliation against the existing two-level plugin model ([Provider plugin
boundary](../providers/provider-plugin-boundary.md), `:141-166`: a Model Manager UI and
configuration plugin at Level 1, independent provider adapter plugins at
Level 2) is explicitly out of scope for this draft: this document neither
re-decides that model nor merges into it. Whether the LLM plugin proposed
here maps onto, extends, or reshapes those two levels is an owner decision
with its own review; both texts stay candidate until then. The split should
nevertheless be decided before the Wheel MVP writes its first
vendor-specific provider or subscription OAuth integration, or later
extraction will be painful.

Anti-premature-abstraction applies throughout, shared with the companion
wheel-scope-and-framework candidate direction: no universal agent API for imagined agents, no provider machinery
for imagined gateways. The record's rule is to generalize from two real
implementations.

## Acceptance criteria

This document is a draft candidate design. It is unaccepted, it closes no
AIQ or OQ entry, and it mints no new identifier: no AIQ entry, no OQ entry,
and no `DEC-XXXX` owner decision is created here. The `AI-XXXX`
implementation placeholder names a future task slot only; it opens when a
real HTTP or Router adapter lands, not before.

Accepted documents are explicitly unaffected: the [IPC and Agent
RFC](../specifications/ipc-agent-rfc.md) keeps its normative framing, scope, lifecycle, and
consent statements, and no sibling draft disposition ([Provider plugin
boundary](../providers/provider-plugin-boundary.md) included) is revised by this
document. The `bitty-ai` implementation at `97d3125` is surveyed read-only;
nothing here describes that slice as the complete proposed runtime.

Open choices that stay with the owner: the attribution field shape; the
Wheel public-application identity string; whether unattributed calls stay
allowed by default; approval of the LLM-plugin split; and the Model Profile
vocabulary.

## References

- [Provider plugin boundary](../providers/provider-plugin-boundary.md) (Draft): the
  `Router` transport (`:130-132`), the two-level plugin model (`:141-166`),
  the transport taxonomy (`:115-132`), and the secret invariant (`:194`)
  this draft builds on without revising.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): no entry
  status changes here; duplicate AIQ or OQ identifiers are proposed nowhere
  in this document.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): normative IPC framing
  that overrides any statement here.
