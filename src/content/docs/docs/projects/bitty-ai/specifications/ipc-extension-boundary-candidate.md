---
title: IPC extension boundary (candidate)
description: Candidate IPC second extension boundary, out-of-process agent runtime, capability API, and permission model
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 53
---

# IPC extension boundary (candidate)

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification, accepted
decision, dependency selection, release commitment, or implementation claim.
It records the candidate direction for IPC as a second extension boundary: IPC
as the second extension boundary, the out-of-process `bitty-ai` shape (agent
runtime, MCP, memory, context management), the `bitty-ai` daemon with
network-dependency independence, the `agent.spawn` / `agent.send` /
`agent.cancel` sketches, Agent/Panel lifecycle separation, `agent.*` events
as discussion inputs, unified Lua/IPC semantics with the Capability API
proposal, IPC-native permissions, and the closing three-layer placement.

The recommendation is to treat every model below as a candidate input to the
draft [AI Architecture](../architecture/ai-architecture.md) and its related draft
dispositions, never as an override of the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) or the normative security corpus.
In particular, the `agent.*` method and event names, the Capability API, the
permission-manifest sketch, and the three-layer model are **not** accepted by
this candidate design. Agent lifecycle, Agent events, and Agent semantics in the
candidate direction are **discussion inputs only**: the accepted Agent contract stays
entirely with the RFC, which this draft references without restating
normatively. Nothing here is promoted to accepted status, and no
implementation is described as shipped.

The direction's strongest ideas are the out-of-process `bitty-ai` daemon with
Core ignorant of providers (which agrees with the network-dependency
independence direction), the Agent/Panel lifecycle separation carried over
IPC (which agrees with the projection-only panel direction), the Capability
API unity (Lua, IPC, and CLI as frontends of one capability model, consistent
with the mediation rule kept from the plugin-extension-model candidate), and
IPC-native capability permissions (consistent with the unified authorization
backend direction and the non-inheritance principle kept from the
plugin-extension-model candidate). Its weakest claims are the concrete method
and event names (`agent.spawn`, `panel.create`, `agent.status.changed`, and
similar), which are unreviewed interface sketches with no ownership,
versioning, or compatibility evidence; the three-layer model, which is product
positioning without packaging or process-boundary evidence; and the "terminal
platform" reframing, which is motivation, not architecture. Those are
corrected below.

This synthesis references, without duplicating or modifying, the draft
[AI Architecture](../architecture/ai-architecture.md) (candidate inputs only),
[Provider plugin boundary](../providers/provider-plugin-boundary.md),
[Panel environment awareness](../interfaces/panel-environment-awareness.md),
[Execution ownership R1](../architecture/execution-ownership-r1.md), and
[Tool transport R2](../architecture/tool-transport-r2.md). The accepted
[IPC and Agent RFC](ipc-agent-rfc.md) is unaffected by this draft. This
document creates no AIQ or OQ identifier and closes none.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## IPC as the second extension boundary

The retained model places two extension boundaries under Core: the
in-process Lua API on one side and the IPC boundary on the other, with
`bitty-ai`, external plugins, and other Bitty instances on the IPC side
while lightweight plugins stay in-process. Out-of-process plugins may use
any language (the direction lists Rust, Python, Go, TypeScript, Java, and
Shell) and need not follow the Lua runtime. The direction frames this as moving
from an extensible terminal to a terminal platform with a unified control
protocol.

**Critical judgment:** the boundary drawing is retained as a candidate
objective; the "terminal platform" reframing is product motivation, not
architecture. The stable claim is only the separation itself (in-process Lua
for lightweight extension, IPC for out-of-process participants), with the
exact capability set on each side undecided and owned by the terminal,
plugin, and AI repositories jointly. The language list is illustrative
freedom, not a supported-language promise.

## Heavyweight plugin shape: the bitty-ai daemon

The retained direction is that `bitty-ai` is the canonical heavyweight
plugin: provider handling, agent runtime, MCP, embedding, memory, storage,
networking, and context management do not belong in Core, and Core stays
ignorant of providers (OpenAI, Anthropic, MCP, and similar are named only as
examples of what Core must not know). The direction's agreement point is kept:
the earlier direction that `bitty-ai` network dependencies stay independent
fits the IPC split exactly, because the daemon carries HTTP, TLS, SDK, and
storage dependencies that Core never takes on.

**Critical judgment:** the component list is discussion vocabulary for what
makes a plugin "heavyweight," not an accepted `bitty-ai` decomposition; the
authoritative decomposition stays with the draft AI Architecture and its
dispositions. The `agent.*` and `panel.*` method sketches are unreviewed
interface proposals recorded as discussion inputs only: they propose no wire
method and change nothing in the accepted RFC. The stable claims are the
daemon direction and Core's provider ignorance, which reinforce the
minimal-base principle kept from the plugin-extension-model candidate (a bare
install carries no AI machinery until the user opts in).

## Panel as a public abstraction

The retained direction is that Panel becomes a public abstraction external
programs operate through protocol rather than internal structs, with tiled,
floating, and headless panels behind one Panel Manager. The AI entry is
positional only: AI appears as one panel kind among others, which is
consistent with the boundary context kept from the plugin-extension-model
candidate (AI as hosted content under projection-only panels).

**Critical judgment:** every operation and message shape in this range is a
proposal, not a protocol. The stable claim is the abstraction direction
(external parties address panels through capability-checked protocol, never
through Core internals); the operation set, message envelope, and
authorization checks are undecided and, where they touch IPC ground, already
owned by the accepted RFC.

## Agent/Panel lifecycle separation over IPC

The retained direction is that an Agent is not bound to one panel: Agent A
can work through one headless panel, leave it, and enter another while both
panels continue to exist, addressing panels by list, inspect, attach,
detach, input, and output operations rather than by holding Core panel
references. The direction's cleanness judgment (this model is cleaner than
embedding the Agent in terminal core) is recorded as author opinion
supporting the out-of-process direction.

**Critical judgment:** Agent lifecycle is RFC-owned ground, and this section
is read strictly as a discussion input: it proposes no lifecycle state
machine, no ownership contract, and no wire method. The operation sketches
are unreviewed vocabulary. The stable claim is only the separation
direction, which agrees with the R1 projection-only consequence (panels as
host-owned views an agent works through, not objects an agent owns) without
restating it.

## Plugin-to-plugin communication and agent events

The retained direction is that IPC is a bus, not just a plugin-to-Core
channel: plugins publish and subscribe to one shared event semantics from
both Lua (`bitty.on`) and external processes (`subscribe`). The
`bitty-ai`-relevant example is `agent.status.changed` flowing to a
dashboard-style consumer; the surrounding examples (branch changes,
command completion, panel and workspace events) are `bitty`-side bus
content recorded here only as context for the shared-semantics proposal.

**Critical judgment:** every event name in this range, including all
`agent.*` names, is a discussion input, not an accepted event. The accepted
Agent observation and event vocabulary stays with the RFC, which this draft
does not restate. The stable claim is the bus direction (one shared event
semantics across Lua and IPC frontends); the event catalog, delivery
guarantees, filtering, and authorization are entirely open and, for
agent-bearing events, require security review as observation-data interfaces
before any adoption.

## Unified Lua/IPC semantics and the Capability API

The retained direction is semantic unity: Lua plugins, IPC clients, and the
CLI control surface should be frontends of one capability model rather than
three independent systems, so a capability is defined once and bound per
frontend. The direction's capability sketches (panel, workspace, terminal,
command, notification operations) are illustrative vocabulary for that
model, and the `panel.create` triple example (Lua call, IPC message, CLI
invocation) states the intent, not a schema.

**Critical judgment:** the Capability API is a candidate model, not an
accepted contract: it names no owner, no versioning policy, and no
enforcement mechanism, and it must not be read as the accepted scope or
method registry, which stays with the RFC. The stable claim is the unity
objective, which is compatible with the mediation rule kept from the
plugin-extension-model candidate (extensions attach through declared,
reviewable seams); whether the IPC-extension-boundary capability model and the
plugin-extension-model extension-point model are the same mechanism is
undecided and stays with the owning tasks.

## IPC as a natural permission system

The retained direction is that the IPC boundary carries permissions
naturally: a plugin authenticates, receives capability-scoped rights, and
Core admits or denies each operation (including `agent.control`) against
those rights, with a human-readable permission display for review. The
candidate direction's judgment that this boundary is easier to hold than
exposing a whole in-process API is recorded as supporting opinion for
capability attenuation at the IPC layer.

**Critical judgment:** the manifest fields, token shape, check semantics,
and display format are unreviewed sketches, not a permission schema. They
align with, and do not relax, the normative least-privilege and fail-closed
obligations and the non-inheritance principle kept from the
plugin-extension-model candidate (relationship to a powerful host confers no
capability; each sensitive right is an explicit grant). The stable claim is
the placement direction (permissions enforced at the IPC boundary behind a
unified authorization backend per R2); the vocabulary, grant mechanics,
attenuation rules, and
audit consequences are open and need security review before any enforcement
claim.

## The Lua-versus-IPC split's direct Agent consequence

The split between the Lua boundary and the IPC boundary carries one direct
Agent consequence. The retained placement rule for `bitty-ai` is that AI sits
on the IPC side because it has an independent lifecycle, may crash, carries
complex dependencies, may use other languages, needs network or database
access, and is invoked at coarse granularity. This is consistent with the
daemon direction and the heavyweight plugin shape above; it adds the explicit
negative (that AI does not belong in-process) to the positive daemon claim.

**Critical judgment:** a placement heuristic, not a decision procedure. New
AI-adjacent work that is fine-grained, latency-sensitive, or UI-coupled would
need its own placement review rather than inheriting the IPC side by default.

## Closing three-layer model and bitty-ai placement

The retained candidate placement puts `bitty-ai` (with MCP and Agent) on
the IPC side of Core, beside services in other languages, while themes and
UI plugins stay on the Lua side; above both sits the Capability Layer
consumed by Lua, IPC, and CLI frontends alike. The direction's punchline is
kept as a modeling claim: IPC should be designed as a capability protocol
stating what the outside world may do to Bitty, so that later `bitty-ai`,
headless-panel, marketplace, DevTools, and remote-control work shares one
infrastructure instead of inventing a channel per feature.

**Critical judgment:** this is candidate-only relative to the plugin-extension-model layering,
and the two must not be merged silently. The plugin-extension-model candidate says
`Native Primitive -> Framework Plugin -> Extension Plugin` with a proposed
`bitty-ai-runtime` versus `bitty-ai` split; the IPC-extension-boundary candidate says
Core with Lua and IPC APIs under a Capability Layer of three frontends.
Both are unaccepted, both lack ownership, packaging, versioning, and
process-boundary evidence, and neither overrides the other or the accepted
RFC. Their compatible direction (domain capability mediated through
declared, reviewable seams, never ambient) is retained; the choice between,
or synthesis of, the two layerings stays with the draft AI Architecture and
its related dispositions. The capability list is discussion vocabulary, not
an accepted scope catalog, and the downstream motivations are scheduling
context, not a roadmap.

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered models are
candidate inputs only; the three-layer model and the Capability Layer
proposed in the direction are **not** accepted by this candidate design and must
not be read as crate, package, protocol, or release decisions. Provider
contract and transport questions stay with the draft
[Provider plugin boundary](../providers/provider-plugin-boundary.md); execution and
environment questions stay with [Execution ownership R1](../architecture/execution-ownership-r1.md)
and [Panel environment awareness](../interfaces/panel-environment-awareness.md); tool
authorization and transport placement stay with
[Tool transport R2](../architecture/tool-transport-r2.md). Each is referenced, never
duplicated or modified.

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) defines the only
accepted IPC wire, scope, and Agent vocabulary. Every `agent.*` and
`panel.*` name in the direction (`agent.spawn`, `agent.send`, `agent.cancel`,
`panel.create`, `agent.status.changed`, `agent.started`, `agent.finished`,
and similar) is a discussion sketch: this draft records it as input and
proposes no wire method, event name, or CLI surface. Where the direction's
sketches overlap RFC-owned ground (Agent lifecycle, Agent events, Agent
semantics, scopes, CLI control), the RFC wins without further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed redaction,
consented recording, secret minimization) override every discussion example
throughout this document. The direction's method names, event names, manifest fields, permission
display, and capability list are conceptual vocabulary, not additions to any
accepted registry, schema, or protocol. This draft creates or closes no AIQ
or OQ identifier; open questions stay with
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the design falsifiable before any IPC-value
proposal constrains `bitty-ai`.

| Campaign             | Required observation                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daemon direction     | A `bitty-ai` capability ships out-of-process with Core carrying no provider, network, or storage dependency for it; bare installs stay AI-free.       |
| Provider ignorance   | Core handles an Agent-class request knowing only generic capability checks, with no provider-named branch in Core code or configuration.              |
| Lifecycle separation | An Agent works through successive panels without owning any panel object, and panel lifetime is independent of Agent attachment in reviewable tests.  |
| Bus semantics        | A Lua consumer and an external subscriber observe the same event with one shared semantics description; neither receives capability by subscribing.   |
| Capability unity     | One capability definition serves Lua, IPC, and CLI frontends with per-frontend bindings; no capability exists in only one frontend by accident.       |
| Boundary permission  | An IPC plugin exercises exactly its granted capabilities with explicit `agent.control`-class denial by default; grants attenuate and audit.           |
| Layer-split evidence | Any future Capability Layer or three-layer adoption names an owner, a packaging and compatibility contract, and a process boundary before code ships. |

Promotion needs independent AI architecture, provider-boundary, terminal and
plugin-owner, docs-curator, and security review. Route capability vocabulary, event catalog, manifest format, permission mechanics, and the
layer-model ownership and compatibility contract to scoped owner tasks.
This draft changes no normative contract and authorizes no product code.
