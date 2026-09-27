---
title: Remote Infrastructure and Remote Client (Candidate)
description: Draft candidate direction for the terminal-platform remote infrastructure and remote client - remote frontend positioning, a four-layer panel remote protocol, semantic-first diff synchronization, transport with optional discovery and relay, unified session services, and device capability grants
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 60
---

# Remote Infrastructure and Remote Client (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document records the terminal-platform
> slice of the remote-infrastructure and remote-client direction: a remote
> session positioned as the frontend of Bitty's workspace, panel, and agent
> architecture; a layered panel remote protocol with semantic-first
> synchronization; and the shared device, transport, and service model behind it.
> The direction sits behind the accepted
> [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
> deferral and its mandatory trust-boundary gate: `OQ-020` remains closed by that
> ADR, this record does not reopen it, and nothing here satisfies or weakens the
> gate. It authorizes no shipped, stable, or compatibility-guaranteed behavior,
> weakens no accepted source it cites, and makes no implementation claim.
> Protocol spellings, service names, and bounds repeated here are direction, not
> contract.

## Purpose and scope

The remote direction spans several owners: the client application and its
renderer, the protocol between devices, the transport substrate, the device
identity and grant model, and the session services multiplexed over one
authenticated connection. This document freezes only the **terminal-platform
side** — the protocol, session, service, and transport shape as they touch the
Bitty host — so future design work starts from a stable input instead of
reconstructing the discussion.

In scope (all **Candidate** unless cited otherwise):

- RI-1: the remote client as a frontend of the workspace, panel, and agent
  architecture rather than another terminal.
- RI-2: the four-layer panel remote protocol (control, input, panel state,
  transport).
- RI-3: semantic-first rendering and sequenced diff synchronization.
- RI-4: transport posture — a swappable boundary with an MVP shape and a
  formal target.
- RI-5: one authenticated remote session multiplexing several services.
- RI-6: capability-first device grants.
- RI-7: the file service surface.
- RI-8: the two-layer notification service.
- RI-9: optional infrastructure that is never mandatory.
- RI-10: the plugin participation boundary.
- The candidate experiment sequencing and its relationship to the panel
  abstraction.

Out of scope and owned elsewhere (pointers, not content):

- the client application itself (framework, navigation, store submission — no
  repository is created or named by this record);
- the daemon and any headless hosting process, whose taxonomy, staging, and
  trust boundary are fixed by the accepted
  [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md);
- the local IPC surface, its wire format, scopes, and rate limits (accepted,
  [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md));
- plugin capability families and the sandbox contract (accepted,
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md));
- the UI runtime's tree, layout, and reconciliation rules (candidate,
  [Workspace-Native UI Runtime](ui-runtime-candidate.md)); and the attention
  aggregation ownership, which stays open in the UI and plugin corpora.

## Normative sources this specification must not weaken

- [ADR 0008 — Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  (accepted): remote UI is a strictly larger trust surface than a local daemon,
  is never implicit in a daemon acceptance, requires its own trust-boundary ADR
  with network authentication stronger than an ambient bearer token, and must
  consume a bounded snapshot or damage stream rather than raw PTY bytes. The
  daemon is deferred to post-v1.0. Nothing in this record alters that
  disposition; every RI item below is candidate direction _behind_ that gate.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  (accepted): the local surface stays the only default one — no TCP listener by
  default, bounded framing, peer-credential auth, least-privilege scopes, and
  rate limits. The RI-2 control layer shares concepts with that surface; it
  redefines nothing, publishes no method, and grants no authority, and
  possession of a remote handle grants no authority beyond its explicit grant.
- [Future Boundaries](../architecture/future-boundaries.md) (Draft; recorded
  network-boundary sections are candidate direction): the recorded Core network
  boundary — Core never initiates network connections and
  network exists only behind explicit transport or provider boundaries. The
  remote direction adds a new explicit transport boundary; it does not place
  network dependencies in the terminal core crates or the AI core crates, and
  it does not weaken that invariant.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) (accepted):
  the mechanism-versus-policy split, Terminal Truth ownership, and the
  declarative UI boundary. The remote transport and session are host-side
  mechanism; composition stays policy.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  and [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
  (normative): least-privilege capability families, sensitive-data handling,
  and the P0 gates. Per the ADR 0008 ownership note, the security corpus is a
  co-owner of any future remote trust-boundary change.
- [Workspace-Native UI Runtime](ui-runtime-candidate.md) (candidate): the
  retained-tree UI direction this record's serializable constraint composes
  with; reconciliation is owned by the UI Runtime successor RFC, not here.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the recorded direction only; no review has accepted it.                  |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## RI-1 Remote frontend positioning (Candidate)

**Candidate.** The remote client is the remote frontend of the workspace, panel,
and agent architecture — not another terminal emulator. PTY processes, shells,
agents, and plugins stay on the host Bitty; the device presents panel state and
sends input and control. The device runs no model: a command sent from the
device routes to the host and to its agents.

Terminal-side conclusions:

- The positioning composes with the accepted ADR 0008 taxonomy: this is the
  "Remote UI" category — a frontend that renders a Terminal's snapshot on a
  machine different from the daemon host, via a network transport — and inherits its
  gate rather than arguing around it.
- The candidate form factor notes that a tablet configuration (workspace
  sidebar, panel area, custom key bar, hardware keyboard and trackpad) may be
  the highest-value shape; the phone shape is a single panel with a custom key
  bar. Form factor is a client concern.
- The panel-first argument is the reason the remote session is defined over
  panels and workspace state rather than over a terminal byte stream (RI-3).

**Open.** Owner approval of the positioning; whether the client is a separate
product surface with its own release cadence.

## RI-2 Panel remote protocol, four layers (Candidate)

**Candidate.** The protocol is layered so a panel of any kind can travel to a
device:

| Layer       | Content                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Control     | open / close / focus / move; workspace, panel, and agent lists (with agent status); attach / detach / resize; subscribe / unsubscribe |
| Input       | key / text / mouse / touch                                                                                                            |
| Panel state | grid / UI tree / cursor and the rest of the synchronized state                                                                        |
| Transport   | the byte-and-stream substrate (RI-4)                                                                                                  |

Terminal-side conclusions:

- The protocol is not raw stream forwarding: `send(stdout bytes)` is the wrong
  primitive because a Bitty panel is far more than a shell (it may host a
  plugin's declarative UI, an agent surface, or rich content), so the panel
  state layer carries semantics the byte stream does not.
- The control layer is candidate direction that composes with the accepted
  local IPC direction without restating it: the accepted RFC places remote TCP
  and headless-daemon detach/reattach design out of scope, and its candidate
  method spellings are explicitly not accepted compatibility promises. The
  shared material stays conceptual (listing, focus, splitting, and event
  subscription as a direction); the accepted RFC owns its wire, this
  record publishes no remote method, and the control layer adds no authority to
  any surface.

**Open.** The reconciliation of the control layer with the accepted IPC method
surface; the exact capability a device needs per control verb; the interaction
of subscription with the accepted event-bus contracts.

## RI-3 Semantic-first rendering and diff synchronization (Candidate)

**Candidate.** Bitty knows what its state means — cells, cursor, images, UI
trees, panels — so the remote path sends structured state and diffs instead of
encoding everything to pixels first. Rendering modes, in preference order:

| Panel kind                         | Remote carrier           | Client side   |
| ---------------------------------- | ------------------------ | ------------- |
| Terminal                           | cell/grid diff           | local render  |
| Bitty UI (plugin panels)           | UI-tree diff             | local rebuild |
| Image / rich media                 | asset plus metadata      | local render  |
| Renderer that cannot be structured | frame/video pixel stream | fallback only |

Terminal-side conclusions:

- A terminal panel's first connection is a full `PanelSnapshot` (cells, cursor,
  scrollback position, title, cwd); afterwards the host sends sequenced
  `PanelDiff` operations (update cells, move cursor, scroll, set title). A
  reconnect resumes from the last acknowledged sequence or requests a fresh
  snapshot — the same snapshot-and-damage posture the accepted ADR 0008
  requires of a remote UI, applied at panel granularity.
- A plugin panel travels as a declarative UI-tree diff and the client rebuilds
  it locally; the same semantic UI may lay out differently per device. This
  gives the UI direction a new candidate constraint: the UI tree should be
  **serializable and remoteable**, not only renderable. Reconciliation with the
  retained-tree direction belongs to the UI Runtime successor RFC
  ([UI Convergence Roadmap](ui-convergence-roadmap.md), successor 1), not to
  this record.
- Pixel streaming is the fallback for renderers that cannot be structured, not
  the default. The accepted rule that a remote UI consumes a bounded
  snapshot/damage stream rather than raw PTY bytes is preserved; a pixel
  fallback is a bounded artifact stream, never PTY passthrough.

**Open.** Diff encoding and sequencing bounds; scrollback-window semantics on
the device; whether assets are pushed, fetched, or both; the exact serializable
tree schema (owner: UI Runtime RFC).

## RI-4 Transport posture (Candidate)

**Candidate.** The transport is a swappable boundary: the protocol is defined
above it, so the substrate can change without protocol change.

- **MVP shape: WebSocket over TLS.** Universal client and Rust support, easy
  debugging and proxying, and sufficient for the first experiments — not
  because it is the final answer.
- **Formal target: a public-key-identified P2P QUIC substrate** (the `iroh`
  direction: endpoints identified and authenticated by public key,
  relay-assisted connection establishment, NAT traversal, and relay fallback
  where the relay forwards encrypted data only). This is recorded as the
  direction to study and validate first, because it is the part that is hardest
  to build correctly from scratch.
- **Topology borrowed, abstraction not.** RustDesk's self-hosted topology
  (rendezvous/signaling plus relay fallback, direct connection preferred) is the
  recorded reference for _connection topology only_; its screen-streaming
  abstraction is explicitly not the model. Bitty does not build its own
  rendezvous/relay pair as a first move; the candidate is to treat the QUIC
  substrate as the network layer and design the Bitty protocol, services, and
  capability layer above it.
- **Multiplexing matters.** QUIC's independent streams map naturally onto the
  concurrent payloads one device connection carries (control, several panels,
  file transfer up and down, agent events, notifications), so a large transfer
  stream does not add latency to a panel stream. Under a single TCP/WebSocket
  byte stream, that multiplexing and QoS behavior would have to be rebuilt
  manually — one recorded reason the formal target differs from the MVP.
- Transport stays panel-agnostic: it knows connect, listen, relay, disconnect,
  reconnect, streams, and network migration, and it knows nothing about what a
  panel is.

**Open.** Which substrate the first experiment validates; the protocol mapping
over each substrate (framing, stream classes); migration semantics when the
direct/relay path changes mid-session.

## RI-5 One session, many services (Candidate)

**Candidate.** The unit of connection is a **remote session**, not an HTTP
endpoint and not a panel. After authentication, one session multiplexes
services: panel, filesystem, agent, workspace, notification, clipboard, and
plugin. Requests are addressed RPC-style (service plus method plus parameters),
so adding a capability never changes the transport.

Terminal-side conclusions:

- Panel is the first consumer, not the whole product; the same device identity,
  connection, permission, transport, relay, and event system serves every other
  service.
- The service split keeps the panel service from accreting unrelated
  responsibilities (files, notifications), which is what keeps the protocol
  testable per service.

**Open.** The service inventory freeze; versioning of the service surface; how
service events compose with the accepted event-bus contracts; the relationship
between remote session identity and the open identity-domain questions of the
governance corpus (pointer only).

## RI-6 Capability-first device grants (Candidate)

**Candidate.** A device receives explicit capability sets, granted on first
connection and revocable at any time — not a boolean "trusted". Candidate grant
dimensions: panel read / input / create / kill; workspace read; scoped
filesystem read and write; agent read / command; clipboard read / write;
notification subscribe. Sensitive locations — key stores, credential stores,
and secret stores — are denied from day one, and grant scope is expressed as
path-scoped or resource-scoped allowances rather than a blanket root.

Terminal-side conclusions:

- This is remote-control infrastructure for a computer, so the security
  boundary is designed first, before the convenient version of any mechanism.
- The model composes with, and does not replace, the accepted capability
  families of the Plugin Platform RFC and the IPC RFC: a device grant is an
  additional least-privilege surface, and no accepted capability check is
  weakened. Device grants do not transit into plugin authority, and plugin
  grants do not widen device grants.
- The first-connection flow is a consent surface (the device requests; the user
  grants; the grant is inspectable and revocable), consistent with the
  established consent-ledger posture.

**Open.** The grant identifier vocabulary; persistence and revocation UX;
the consent surface's ownership; how grants compose with the security corpus's
sensitive-data rules; the full trust-boundary analysis per the ADR 0008 gate.

## RI-7 File service (Candidate)

**Candidate.** A native, capability-scoped file service under the same grant
model as every other service: stat, read directory, offset-based read, and
offset-based write. File Browser is studied for product and API ideas only — it
is recorded as archived upstream with unresolved security issues, so it is
neither embedded nor built upon — and the surface itself is small enough for
the host to own.

Terminal-side conclusions:

- The service is mechanism, not policy: paths arrive already narrowed by the
  device grant; there is no "remote device can read `/`" mode.
- The file service does not create a second filesystem authority; it reads and
  writes through the host's existing filesystem boundary under its own scope
  checks.
- Offset-based read/write is the recorded shape because it supports resumable,
  chunked transfer over the stream substrate without inventing a second
  transfer protocol.

**Open.** The chunk and concurrency bounds; preview and edit extensions;
whether directory change notifications ride the notification service.

## RI-8 Notification service, two layers (Candidate)

**Candidate.** Notification delivery splits by reachability — the same two-layer
split that ntfy documents:

- **Online devices** receive events directly over the remote session.
- **Offline devices** require the platform push gateways (APNs for Apple
  platforms, FCM for Android), reached through a push gateway component of the
  optional infrastructure (RI-9).

The Bitty event bus feeds the notification service, which serves both the
remote client and plugins. An illustrative notification carries what completed,
a pointer back to the producing panel or agent, and actions such as "open
panel" or "ask agent" — the remote client is a projection, so a notification
never carries the work itself.

Terminal-side conclusions:

- The two-layer split is recorded because a device that is killed by its
  platform cannot be reached over the session; a single-layer design would
  silently drop exactly the notifications that matter when the user is away.
- The notification service does not answer the attention-aggregation question
  that stays open in the UI and plugin corpora; it is a delivery channel, not
  the aggregation owner.

**Open.** Push gateway ownership under the optional-infrastructure rule (RI-9);
event filtering and quiet-hours policy; how notification identity dedupes
across the online/offline transition.

## RI-9 Optional infrastructure, never mandatory (Candidate)

**Candidate.** Discovery, relay, and push gateway are optional infrastructure.
The recorded deployment postures must all work: an official service, self-host,
LAN-only, and VPN-only (for example Tailscale). Core never depends on any Bitty
Cloud: the terminal functions with the infrastructure absent.

Terminal-side conclusions:

- On a LAN, no server is required: local discovery (mDNS-class) and QR pairing
  connect the device directly. Rendezvous and relay enter only for NAT-ed
  internet paths where a direct connection cannot be established.
- Pairing is recorded as a first-class UX surface: the host shows a pairing
  code (illustratively a QR code with a short expiry and the device name), the
  device scans, verifies the device key, and pairs; the device list then shows
  known devices with platform and online state.
- This composes with the accepted Core network boundary: the optional services
  live behind the explicit transport boundary, never inside the core crates.

**Open.** Whether any official service is offered at all; the self-host story's
ownership; the discovery protocol; how pairing keys are stored and rotated.

## RI-10 Plugin participation boundary (Candidate)

**Candidate.** Network implementation belongs to the Rust host side; selected
capabilities are exposed to Lua. A plugin never builds transport, identity, or
traversal; it consumes host surfaces such as a send-notification call or a
publish-event call (both illustrative spellings). Below those calls the plugin
is unaware of QUIC, relay, push gateways, NAT traversal, and TLS.

Terminal-side conclusions:

- This restates the accepted mechanism-versus-policy split: Rust owns the
  mechanism, Lua owns policy and composition, and the remote capability surface
  composes with the recorded plugin network-capability direction rather than
  replacing it.
- Remote availability never silently widens plugin authority: a plugin's
  ability to publish a remote event is a host-mediated capability under the
  plugin's own grant, exactly as its other host calls are.

**Open.** The Lua surface names and payload shapes; which remote surfaces are
plugin-visible at all; consent requirements per surface.

## Candidate experiment sequencing (Candidate)

**Candidate.** The recorded experiment order is transport first, because it is
the part hardest to build and easiest to validate:

1. **Transport** — validate the QUIC substrate class (identity, NAT traversal,
   relay fallback, network migration) with no Bitty protocol above it.
2. **Panel** — snapshot, diff, input, and reconnect for one terminal panel over
   the MVP transport, rendered by a client built on a GPU canvas.
3. **Files** — list, read, write, and chunked transfer under a device grant.
4. **Notify** — later, composing RI-8.

The panel experiment is recorded as more than a client demo: it is the
acceptance test of the panel abstraction. If a panel can be rebuilt, controlled,
and migrated on a different device, the panel has become a first-class compute
and interaction entity rather than a region inside one window.

**Open.** Where the experiment harness lives; the protocol-versioning story for
experiments; whether any of the four becomes a product surface.

## Relation to existing systems

| Direction                     | Status                                                                      | Owning document                                                                                                                                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RI-1 positioning              | Candidate composing with the accepted daemon/remote taxonomy                | [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (Accepted), [Architecture Overview](../architecture/overview.md) (Draft)                                                                      |
| RI-2 protocol layering        | Candidate; shares concepts with the accepted local IPC, publishes no method | [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (Accepted)                                                                                                                                 |
| RI-3 semantic synchronization | Candidate; adds a serializable-tree constraint                              | [Workspace-Native UI Runtime](ui-runtime-candidate.md) (candidate), [UI Convergence Roadmap](ui-convergence-roadmap.md) (Draft)                                                                                                                           |
| RI-4 transport                | Candidate; new explicit transport boundary                                  | [Future Boundaries](../architecture/future-boundaries.md) (Draft; candidate network-boundary sections), [Performance Budget RFC](performance-budget-rfc.md) (Accepted hot paths)                                                                          |
| RI-5 session services         | Candidate; no accepted event-bus or IPC text changed                        | [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (Accepted)                                                                                                                                 |
| RI-6 device grants            | Candidate; composes with the accepted capability families                   | [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md) (Accepted), [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) (normative) |
| RI-8 notification             | Candidate; delivery channel only, aggregation ownership stays open          | [Workspace-Native UI Runtime](ui-runtime-candidate.md) (attention Open item), plugin-corpus aggregation direction (owner-pending)                                                                                                                         |
| RI-10 plugin participation    | Candidate restating the accepted mechanism/policy split                     | [Core and Plugin Boundaries](../architecture/core-boundaries.md) (Accepted), [Plugin system](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/plugin-system.md) (Draft)                                                       |

## Security review

This record changes no accepted security boundary and grants no capability: it
is a direction statement whose entire trust analysis is deferred to the gate
the accepted [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
already requires — network authentication (mTLS with pinned CA or SSH-tunnel
trust, not ambient bearer token in the `BITTY_*` environment that R-012 forbids),
encryption in transit, replay resistance, a separate consent ledger for
`(remote identity, AgentId)`, explicit scope separation for remote versus local
clients, and a network-exposed fuzz and property corpus for the framing wire
meeting the same "oversized header sheds with no allocation of claimed size" bar
as the local framing property. Per that ADR, the
security corpus
([Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
[Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md))
is a co-owner of any future remote trust-boundary change.

Properties this record itself must not violate, and therefore states: no
accepted P0 criterion is weakened; the local IPC surface stays the only
default one with no TCP listener; the terminal core and AI core crates gain no
network dependency; the device-grant model is least-privilege and revocable;
sensitive stores stay denied by default; and a plugin gains no authority from
remote availability. A future acceptance requires security-reviewer sign-off
in addition to the architecture owners.

## Verification plan

Conformance with this direction requires, at minimum:

1. A trust-boundary record satisfying the ADR 0008 gate before any adoption;
   experiment prototypes inside the workspace are evidence, not adoption.
2. A protocol specification stating the four layers, frame bounds, subscription
   semantics, and reconnect behavior before any wire claim.
3. A device-grant model recording identifiers, persistence, revocation, and
   consent flow, reviewed by the security corpus.
4. Sibling-corpus captures (plugin participation, notification, governance
   questions) recorded by their owning repositories, not asserted here.
5. Experiment evidence recorded as implementation status only once it exists,
   with its exact revision.

## Alternatives considered

| Alternative                                   | Trade-off                                                                                                          | Disposition                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Another terminal emulator on the device       | Familiar shape; loses panel and workspace semantics and duplicates the terminal                                    | Rejected — the panel-first architecture is the point (RI-1)                         |
| Flutter for the client                        | Strong canvas; introduces a second application ecosystem beside Rust and TypeScript                                | Rejected as direction — no recorded reason to add it                                |
| Tauri Mobile (WebView) as the panel surface   | Reuses Rust core plus web UI; WebView is a poor first fit for a terminal grid, IME, and high-frequency panel diffs | Recorded as suitable for companion tooling, not the first choice for panel surfaces |
| Raw PTY byte forwarding to the device         | Simplest stream; reintroduces unbounded parsing at the viewer and loses panel semantics                            | Rejected — conflicts with the ADR 0008 rendering-protocol rule                      |
| Pixel/video streaming as the primary protocol | Works for any renderer; wastes the semantics Bitty already has and loses local text fidelity                       | Rejected as primary; retained as the bounded fallback (RI-3)                        |
| Self-built rendezvous and relay pair          | Full control; the hardest infrastructure to get right and the least differentiated                                 | Deferred — prefer the QUIC substrate; borrow topology, not abstraction (RI-4)       |
| File Browser as an embedded dependency        | Fast start; archived upstream with unresolved security issues                                                      | Rejected — product/API reference only (RI-7)                                        |
| Mandatory cloud for relay and push            | Simplest operations; contradicts the Core-never-depends posture and the offline property                           | Rejected — optional infrastructure only (RI-9)                                      |

## Affected contracts

| Contract                                                                                                                  | Effect                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (accepted)    | Unchanged; remains the acceptance gate; this record supplies candidate direction only                   |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (accepted) | Unchanged; no method, scope, or framing change; concept sharing only                                    |
| [Architecture Overview](../architecture/overview.md) (draft)                                                              | The candidate long-term evolution section gains a pointer to this record                                |
| [Specifications register](README.md)                                                                                      | Gains a Draft-table row                                                                                 |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md) (candidate)                                                        | Unchanged in this wave; the constraint is recorded here only and routes to the UI Runtime successor RFC |
| Open-question register (governance)                                                                                       | No entry opened, closed, or reopened; `OQ-020` remains closed by ADR 0008                               |
| Sibling corpora (plugin, AI, governance slices)                                                                           | Owner-pending; recorded here as pointers only                                                           |

## Open points

None of these is a global `OQ`: this record proposes no new contract boundary
and blocks no current-milestone gate, so they stay parked here until one
qualifies.

- Owner approval of the positioning, the four-layer protocol, the transport
  target, and the unified-infrastructure scope.
- Whether the direction enters the corpora as per-corpus candidate records or
  as a cross-corpus ADR/RFC; the client application repository is not created
  or named by this record.
- Experiment sequencing (transport first) and where the harness lives.
- Device grant vocabulary, persistence, revocation UX, and the consent surface.
- Control-layer reconciliation with the accepted IPC method surface.
- The serializable-tree constraint's composition with the retained-tree
  direction (owner: UI Runtime successor RFC).
- Push-gateway ownership under the optional-infrastructure rule.
- Whether remote rendering eventually reuses a shared Rust renderer or stays
  client-native-first.

## Acceptance criteria

This record is complete when:

1. It is reviewed and linked from the [Specifications register](README.md) and
   the Architecture Overview long-term evolution section.
2. Adoption, if pursued, is argued through a future ADR or RFC satisfying the
   accepted ADR 0008 trust-boundary gate; this record satisfies none of that
   gate and claims none of it.
3. The affected-contracts table matches the edits made in the same wave; no
   accepted document's text is changed.

## P0 Review Sign-off

Not applicable in this wave: no accepted security boundary, capability,
resource ceiling, or trust decision changes, and no normative source cited
above is weakened. The security review section records that any future
acceptance is trust-boundary-bearing and requires security-reviewer sign-off
before adoption.

## References

- [ADR 0008 — Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  — accepted deferral, taxonomy, and trust-boundary gate for `OQ-020`.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  — accepted local IPC framing, scopes, auth, and agent messages.
- [Workspace-Native UI Runtime](ui-runtime-candidate.md) — candidate UI runtime
  model, panel state axes, and the U-9 successor routing.
- [UI Convergence Roadmap](ui-convergence-roadmap.md) — successor ownership for
  the UI tree and runtime direction.
- [Architecture Overview](../architecture/overview.md) — candidate long-term
  evolution including the daemon and remote UI bullets.
- [Future Boundaries](../architecture/future-boundaries.md) — recorded Core
  network boundary and explicit transport boundaries.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) — accepted
  mechanism-versus-policy split and Terminal Truth ownership.
- [Plugin system](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/plugin-system.md)
  — candidate plugin network capability and secrets direction.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  and [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
  — normative trust boundaries and P0 gates.
- [bitty-docs](https://github.com/bitty-terminal/bitty-docs) — shared
  governance, ADRs, and the open-question register.
