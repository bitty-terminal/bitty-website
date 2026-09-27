---
title: Plugin IPC Boundary
description: Candidate out-of-process plugin boundary and candidate local remote service proxies
category: specifications
audience: plugin-author
document_type: specification
status: draft
website_publish: true
sidebar_order: 42
---

# Plugin IPC Boundary

> Status: **draft**, candidate design input recording the plugin-relevant
> consequences of an out-of-process plugin boundary. This page proposes IPC as a
> **second extension boundary** alongside the in-process Lua plugin API. It is
> **not** an accepted contract, an RFC, or an implementation claim.

Accepted baselines already exist for the local IPC wire, auth, and scopes in
the [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
(OQ-018, accepted 2026-08-29). That RFC's candidate addendum already covers the
overlapping workspace-automation and prior-art rationale, so this page records
only the plugin-facing consequences and cites the accepted document instead of
restating its wire contract. Where a statement aligns with an accepted
document, this page links it — relative for documents in this corpus, absolute
for sibling repositories; every other conclusion below is a **candidate
proposal or observation**. The local/remote service proxies section adds the candidate
service-proxy direction; it does not change any accepted local IPC or plugin-runtime contract.

## Purpose and scope

- This page records candidate design direction for an out-of-process plugin
  boundary, reconciled against the accepted contracts linked inline.
- The candidate direction treats IPC and the in-process Lua API as distinct
  concerns; this page records the conclusions in English.
- The framing is that the Lua plugin API and an IPC boundary **solve
  different problems and do not replace each other**.
- The open points list the decisions still required before any conclusion here
  could become contract.

## The second extension boundary: out-of-process plugins

Candidate proposal: plugins need not run inside the Bitty process.
Over a local socket boundary they could be written in any language (Rust,
Python, Go, TypeScript, Java, and Shell are illustrative) without adopting the
Lua runtime. The candidate consequence is a positioning shift from
"Lua-extensible terminal" to "terminal platform with a unified control
protocol" — a candidate framing, not an accepted product claim. Any external
process is still untrusted until an explicit scoped policy grants it
capabilities, per the accepted trust-boundary language in the
[IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md).

The candidate direction draws the suitability line explicitly:

| Surface                     | Candidate fit                                                                                                                   | Candidate reasons                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| In-process Lua plugin       | keybinding, theme, render hook, UI decoration, statusline, layout behavior, small commands, event handlers                      | low latency, high call frequency, tight UI/Core coupling                                                               |
| Out-of-process (IPC) plugin | AI, Git daemon, language tooling, indexer, sync, database, network service, large computation, external application integration | independent lifecycle, may crash, complex dependencies, other languages, network/database use, coarse call granularity |

Alignment: the accepted
[Isolation and Resource RFC](../runtime/isolation-resource-rfc.md) already names "a helper
process with scoped IPC" as a high-isolation extension direction, and the draft
[Plugin Reuse and Provider Ecology RFC](../packaging/plugin-reuse-and-providers.md) Layer 4
defines declared, digest-pinned native helper processes over stdio or a
host-owned local channel (post-1.0). This direction is broader than Layer 4:
it makes arbitrary external processes plugin participants rather than
manifest-declared helpers. Accepting that needs a process lifecycle and
supervision contract first, which no current document defines (candidate).

## Core minimization: heavy plugins as separate processes

Candidate proposal: heavy surfaces — provider, agent runtime, MCP,
embedding, memory, SQLite, network, and context management — should not be
embedded into Core. A separate `bitty-ai` daemon would keep Core from growing
HTTP, TLS, SQLite, AI SDK, embedding, and MCP dependencies; a sketch has Core
knowing only coarse verbs such as `agent.spawn`, `agent.send`,
`agent.cancel`, `panel.attach`, `panel.output`, and `panel.close`. The same
direction keeps `bitty-ai`'s network dependency independent of Core.

The candidate verbs are illustrative method names, not an accepted registry.
The dependency-minimization direction matches the "no embed third-party crate
bloat" rule and helper-process staging stated in the draft
[Plugin Reuse and Provider Ecology RFC](../packaging/plugin-reuse-and-providers.md), and the
isolation direction in the accepted
[Isolation and Resource RFC](../runtime/isolation-resource-rfc.md); the daemon split
itself remains a proposal.

## Panel and Agent as public protocol surfaces

Candidate proposal: a public Panel protocol (`panel.create`,
`panel.write`, `panel.focus`, `panel.move`, `panel.resize`, `panel.close`) would
let plugins operate Panels without touching internal Rust structs, with CLI and
JSON forms and a `Plugin -> Bitty IPC Protocol -> Panel Manager` layering.

The driving example is that **Agent and Panel lifecycles are not
bound**: an Agent attaches to a headless Panel, leaves it, and later attaches to
another, using verbs such as `panel.list`, `panel.inspect`, `panel.attach`,
`panel.detach`, `panel.send_input`, and `panel.read_output` instead of a
`&mut Panel` handle.

These Panel method names are **candidate and unaccepted**. Panel semantics are
owned by the accepted Panel Runtime RFC in the sibling `bitty-terminal-docs`
repository, whose provider and ecosystem surface remains open (`RFC-OQ-1`
through `RFC-OQ-9`), and the Panel-as-host direction is already recorded in the
[Plugin Ecosystem Model](plugin-ecosystem-model.md) Panel and activity section.
This page records only the IPC consequence: a public protocol is the mechanism
that would keep plugin and Agent integrations off internal types.

## Plugin-to-plugin communication and the event bus

Candidate proposal: the IPC surface need not be only plugin to
Core; an event bus could carry plugin-to-plugin events. Candidate examples are
`git.branch.changed` to a statusline plugin, `command.completed` from a panel
history plugin to an AI plugin, and `agent.status.changed` from `bitty-ai` to a
dashboard plugin. The candidate event taxonomy
includes panel created/closed/focused, command started/finished, cwd and
environment changes, agent started/finished, and workspace changes. The
candidate intent is that in-process Lua subscribers
(`bitty.on(...)`) and external subscribers (`subscribe(...)`) share one event
semantics.

The accepted [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) already defines the
in-host event pipeline with classes, budgets, and fail-open rules;
cross-process subscription scope, delivery guarantees, backpressure, and
authorization for the candidate bus are not defined by any accepted document
and would have to reuse the accepted IPC rate-limit and budget contracts rather
than relax them (candidate, open item 4).

## One capability model, three frontends

Candidate proposal: the Lua API, an IPC binding, and a
CLI control surface should be three frontends of one capability model rather
than three parallel systems. Candidate capability names include
`panel.list`, `panel.create`, `panel.focus`, `panel.close`, `workspace.list`,
`workspace.switch`, `terminal.send_input`, `terminal.read_history`,
`command.run`, and `notification.send`, with the same
action expressed as a Lua call, a JSON request, and a CLI command. A candidate
"Bitty Capability Protocol" naming for the
capability layer has an illustrative domain list: Panel, Workspace, Terminal,
Command, Agent, Plugin, Notification, Event, Clipboard, and History.

Alignment: the accepted corpus already routes registries so CLI, palette, IPC,
and Agents reuse one surface (see the [Plugin Platform RFC](../specifications/plugin-platform-rfc.md)
and the [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md),
which declares `result_schema` for CLI, palette, IPC, and Agent reuse). The
unaccepted addition is an external-process binding that consumes the same
capability registry; the method names and domains above are candidate
vocabulary only.

## Capability tokens and permission display (unaccepted)

Candidate proposal: an external plugin would authenticate to the
IPC server and receive a capability token; Core would evaluate per-capability
allow/deny, and a `bitty plugin permissions <id>` command could display granted
and denied capabilities. A candidate manifest shape is:

```toml
[permissions]
panel.read = true
panel.create = true
terminal.input = false
filesystem.read = false
network = false
agent.control = false
```

This sketch is **unaccepted and diverges from the accepted capability
grammar**: the accepted model uses closed, owner-qualified identifiers with
parameters (for example `terminal.semantic-read`, `process.spawn:git`),
deny-by-default grants bound to plugin identity and manifest hash, and no
wildcards ([Plugin Platform RFC](../specifications/plugin-platform-rfc.md);
[Isolation and Resource RFC](../runtime/isolation-resource-rfc.md)). The boolean
`[permissions]` table must not be read as schema, and a future plugin process
would receive scoped grants, never ambient authority; mapping a capability
token to the accepted IPC scopes and plugin grants is an open item (open item
3). The security argument — a scoped protocol boundary is easier to
defend than exposing the whole Lua Core API to third parties — is consistent
with the accepted deny-by-default posture.

## Failure isolation, supervision, and debugging

Candidate proposal: an out-of-process plugin that crashes must not
take down Bitty; the direction poses restart, disable, and log-surfacing
options rather than defining a policy. Alignment: resource isolation and failure
semantics for IPC/MCP clients are accepted in the
[Isolation and Resource RFC](../runtime/isolation-resource-rfc.md), but no accepted
document defines a plugin-process supervisor, restart policy, or reconnection
semantics (candidate, open item 2).

Candidate inspection surfaces such as
`bitty msg panel list`, `bitty msg tree`, and `bitty msg events` would expose
panel ownership, workspace hierarchy, and an event trace; they are valued
for a future DevTools. Accepted baseline: the
[IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
normatively defines instance discovery and selection, including the
`bitty ctl instance list` command; the broader `bitty msg`/`bittyctl` method
surface is marked candidate in that RFC's candidate CLI-dispatch section, so
the `bitty msg panel list`/`tree`/`events` shapes here are candidate only.

## Controlling a running instance and multi-instance addressing

Candidate proposal: a `bittyctl`-style client would be a thin IPC
client, not a second implementation of Bitty features, mirroring `hyprctl` for
a running compositor. Accepted baseline: the
[IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
defines instance discovery and selection for exactly this use; `BITTY_SOCKET`
and instance identifiers stay advisory and never credentials.

A further candidate: several running instances would expose one
socket each under the user runtime directory, and an address chain
`instance -> workspace -> panel` would let plugins or Agents target a specific
surface, sketched as a `bitty://instance/<n>/workspace/<n>/panel/<n>`
form. Multi-window and daemon modes remain deferred by
[ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
in the shared governance corpus, and the URI form is a candidate illustration,
not an accepted grammar (open item 5).

## Candidate three-layer extension model

Candidate proposal: Core plus a Lua plugin API and an IPC API, with
a capability layer above exposing Lua, socket, and CLI frontends. This is
compatible with the "runtime flat, semantics layered" principle recorded in the
[Plugin Ecosystem Model](plugin-ecosystem-model.md)
the platform-versus-extension section: the IPC peers are still flat runtime peers managed through one
plugin model, not nested runtimes. The combined three-layer framing is
**candidate design input**, not an accepted architecture.

## Local and remote service proxies (candidate)

Status: **candidate proposal, not accepted or implemented**. This direction
proposes location-transparent public services: the consumer uses one interface
while the host selects a local plugin, another process or panel, a daemon, or a
Rust-backed provider. This is an interface-design goal, not a claim that these
routes exist or that a panel is a process/isolation boundary. Generic contract
and dependency distinctions live in
[Cross-package contracts](../packaging/plugin-reuse-and-providers.md#cross-package-contracts-candidate).

### Accepted local baseline versus proposed transport

A direct local-function-call shortcut must not be imported literally.
The accepted [Isolation RFC IR-D2](../runtime/isolation-resource-rfc.md#ir-d2-plugin-runtimes)
keeps one VM per plugin identity/generation with no shared globals or module
trees; [Host Runtime A.3](../runtime/plugin-host-runtime-rfc.md#a3-bridge-marshalling-contract)
requires bounded copied arguments/results, non-reentrant bridge calls, and
capability checks before effects. Local v1 calls may be synchronous within a
bounded, non-blocking VM slice. That is not a raw shared Lua table, a direct
peer implementation reference, or permission to bypass marshalling for speed.

This direction recommends async-first semantics for services that may cross
IPC, so a remote operation never masquerades as an immediate call that blocks
the UI. This does **not** replace the accepted local contract with a new
promise/await API. Existing [Host Runtime C.2](../runtime/plugin-host-runtime-rfc.md#c2-sync-versus-async-and-send-contract)
keeps the VM thread-confined and uses the admitted completion paths for work
that cannot finish synchronously. Proposed `await`, `then_`, `coroutine.await`,
and streaming-loop sketches are unaccepted pseudocode, not executable examples.

### Open proxy, cancellation, and streaming contracts

Before adopting the proposal, plugin/service owners and the IPC/AI owner need
reviewed contracts for the following; these are candidate follow-ups, not new
numbered OQs or an accepted wire protocol:

- A versioned proxy/adapter mapping from the public schema to each admitted
  transport, including serialization, payload budgets, typed errors, provider
  identity and generation, and conformance between local and remote behavior.
- Async completion and explicit cancellation: deadline propagation, ownership
  of in-flight work, cancellation acknowledgement and completion races, teardown
  on revocation/disable, and rejection of late results from stale generations.
  These are questions exposed by the proposal, not defined `cancel` methods.
- Stream framing and bounded backpressure: ordering, chunk schema/version,
  capacity, overflow, finish/error behavior, consumer abandonment and resource
  reclamation. Uniform streaming is the proposed direction; exact limits and
  delivery guarantees remain unaccepted. The model-specific normalized event
  vocabulary belongs to the AI/Wheel owner, not this transport proposal.
- Provider loss/reconnect and any retries: no silent replay of side effects or
  stale-handle resurrection. Local service failure rules remain the baseline;
  transport-specific semantics require explicit review.
- Authentication, per-action scope, grant composition, and endpoint/lifecycle
  ownership. A service requirement grants neither an IPC connection nor network
  access. The accepted local-user IPC boundary and deferred daemon/remote-UI
  gates cited above remain intact; this proposal adds no ambient IPC or default
  network listener.

The proposed minimal service/event authoring facade is a usability goal only;
its registration, required/optional lookup, event emit/on names, and domain
identifiers do not extend the accepted service or event inventory. The AI/Wheel
owner-pending direction is tracked in
[Plugin Ecosystem Model owner handoff section](plugin-ecosystem-model.md#97-four-layer-coverage-and-owner-handoff).

## Affected contracts

| Theme                                          | Existing document                                                                                                                                                                  | Relationship                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Lua versus out-of-process plugin suitability   | [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md), [Plugin Reuse and Provider Ecology RFC](../packaging/plugin-reuse-and-providers.md)                            | Aligns with the accepted helper-process direction; broader IPC plugin participants are candidate     |
| Core minimization and `bitty-ai` daemon split  | [Plugin Reuse and Provider Ecology RFC](../packaging/plugin-reuse-and-providers.md)                                                                                                | Aligns with the draft no-embed rule and Layer 4 staging; the daemon split is candidate               |
| Panel/Agent protocol surface                   | [Plugin Ecosystem Model](plugin-ecosystem-model.md) Panel and activity section, sibling Panel Runtime RFC                                                                          | Extends; Panel ownership and provider surface stay with the sibling contract                         |
| Plugin-to-plugin event bus                     | [Plugin Platform RFC](../specifications/plugin-platform-rfc.md)                                                                                                                    | Extends the accepted event pipeline to cross-process subscribers; candidate                          |
| Unified capability model and method vocabulary | [Plugin Platform RFC](../specifications/plugin-platform-rfc.md), [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md)                                          | Aligns on one registry for CLI/palette/IPC/Agent reuse; the external binding and names are candidate |
| Capability tokens and `[permissions]` sketch   | [Plugin Platform RFC](../specifications/plugin-platform-rfc.md), [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md)                                                | Diverges from the accepted capability grammar; must be reconciled, not added in parallel             |
| Crash isolation and supervision                | [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md), [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) | Aligns on untrusted-client boundaries; supervisor semantics are unaddressed                          |
| Control CLI and multi-instance addressing      | [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)                                                                     | Aligns with accepted instance selection; `bittyctl` verbs and `bitty://` addressing are candidate    |
| Three-layer extension framing                  | [Plugin Ecosystem Model](plugin-ecosystem-model.md) Platform-versus-extension section                                                                                              | Consistent with "runtime flat, semantics layered"; combined framing is candidate                     |

## Open points

These are **candidate open items, not accepted open questions**. Each must be
decided in the owning contract before any conclusion here becomes contract:

1. Ownership of the capability/method vocabulary: which repository owns a
   shared method registry across Lua, IPC, and CLI, and how names are versioned.
2. Plugin-process lifecycle and supervision: launch, restart, disable, log
   surfacing, reconnection, and crash containment semantics for out-of-process
   plugins.
3. Capability-token mapping: how a token maps to the accepted IPC scopes and
   per-plugin grants without creating a parallel permission system.
4. Cross-process event bus semantics: subscription authorization, delivery
   guarantees, backpressure, and interaction with the accepted event pipeline
   budgets.
5. Multi-instance addressing grammar: whether any `bitty://`-style address is
   adopted, and how it relates to accepted instance selection and the deferred
   daemon mode.
6. Panel protocol ownership: how candidate Panel verbs interoperate with the
   sibling Panel Runtime RFC open questions (`RFC-OQ-1` through `RFC-OQ-9`)
   without splitting ownership.
7. Whether external processes are a distinct plugin class in the manifest and
   package model or a transport option of the existing plugin model.
