---
title: Remote Infrastructure Boundary
description: Draft capture of the trust-boundary gate, the optional-infrastructure rule, and the push-gateway ownership for the remote client direction
category: development
audience: contributor
document_type: policy
status: draft
website_publish: true
sidebar_order: 23
---

# Remote Infrastructure Boundary

> Status: **draft**. This page is a critical capture of the cross-cutting
> governance content of the remote client direction (2026-09-21). It accepts
> nothing, selects no transport, fixes no service, and authorizes no
> implementation. It reads the accepted
> [ADR 0008](../decisions/adrs/ADR-0008-headless.md) remote-transition gate,
> the [security overview](../security/overview.md), the
> [threat model](../security/threat-model.md), and the
> [risk register](../security/risk-register.md) as the standing contract, and
> records only what the terminal, plugin, and AI corpora do not own. The
> terminal platform corpus owns the client positioning, the panel remote
> protocol, the transport posture, the device-grant model, and the service
> surfaces; the plugin corpus owns the plugin consumption boundary; the AI
> corpus owns the agent-side projection. Those halves stay owner-pending and
> are deliberately not captured here.

## Problem statement

The remote client direction — a network device presenting workspace, panel,
and agent surfaces rather than a second terminal — resolves one question at
the governance layer: who owns the trust boundary and the optional services
it depends on.

Two conflations drive the direction's cross-cutting risk:

- Treating the transport as an implementation detail. A remote frontend adds
  an untrusted network leg to a process that the accepted architecture keeps
  network-free. That is a trust-boundary change, not a transport choice, and
  the accepted headless ADR already records it as a separate, strictly later
  gate.
- Treating a hosted service as part of the product. Discovery, relay, and
  push delivery are conveniences. If any of them becomes required, the
  network-free core invariant and the offline guarantee both fail.

The direction concludes that the remote transition stays behind the accepted
gate, and that every infrastructure component stays optional.

## The boundary principle

- **The trust boundary is designed first.** The direction states that the
  remote system is remote-control infrastructure for a computer, so the
  security boundary is not a later hardening pass. The accepted
  [ADR 0008](../decisions/adrs/ADR-0008-headless.md) remote-transition gate is
  the contract that governs it.
- **Capability first, never a boolean.** A device holds explicit capability
  sets granted on first connection and revocable at any time, not a
  "trusted" flag. Sensitive locations — key, credential, and secret stores —
  are denied from the first day.
- **Infrastructure is optional.** Core never depends on a Bitty-hosted
  service. Official service, self-hosting, LAN-only, and VPN-only are all
  recorded as postures that must work.

## Trust boundary

The remote transition adds the leg remote untrusted network to gateway to
host process. The accepted [ADR 0008](../decisions/adrs/ADR-0008-headless.md)
records what the future remote decision must demonstrate; this page restates
it as the gate, not as a design:

- network authentication at least as strong as mutually authenticated
  transport with a pinned certificate authority or SSH-tunnel trust, never an
  ambient bearer token in the environment that the risk register forbids;
- encryption in transit, and replay resistance;
- a separate consent ledger for the remote identity paired with the agent
  identity, distinct from local approvals;
- explicit scope separation for remote versus local clients, so a scope
  granted locally never widens to remote methods silently (no silent scope
  expansion, and a capability diff plus approval before automatic
  activation);
- a network-exposed fuzz and property corpus for the framing wire meeting the
  same oversized-header shedding bar as the local framing property.

The security corpus remains co-owner of any change to this boundary. A
promotion of the remote direction cannot update a trust boundary on its own.

## Optional infrastructure

Discovery, relay, and push gateway are recorded as optional infrastructure,
never mandatory. Four deployment postures must all work, and the terminal
must keep functioning with the infrastructure absent:

- **Official service** — a project-operated discovery, relay, and push
  endpoint, available but never a dependency.
- **Self-host** — the same three roles operated by a user or an
  organization.
- **LAN-only** — no server at all: local discovery and pairing connect the
  device directly on a local network.
- **VPN-only** — a private overlay network carries the session; nothing
  Bitty-operated is involved.

Rendezvous and relay enter only for paths across a network address
translation where a direct connection cannot be established. This composes
with the recorded core network boundary: the optional services live behind
the explicit transport boundary, never inside the core.

## Push-gateway ownership

Notification delivery is recorded in two layers, and the split carries a
governance consequence:

- **Online devices** receive events directly over the remote session. This
  layer is Bitty-owned.
- **Offline devices** need the platform push gateways — Apple Push
  Notification service on Apple platforms, Firebase Cloud Messaging on
  Android. This layer is platform-owned: background delivery on mobile
  platforms routes through infrastructure the platform, not Bitty,
  operates.

The two-layer split is the same one an HTTP-based pub/sub notification
service (for example [ntfy](https://ntfy.sh)) documents; on Android, true
background delivery requires the platform messaging path unless a foreground
service is running. Bitty's notification service therefore owns the event
and the online path, and depends on the platform gateways for the offline
path, without owning them.

## Out of scope (owner-pending)

Not captured here; owned by the terminal platform, plugin, and AI corpora:

- Terminal platform halves (pointers to the terminal documentation corpus):
  the remote client positioning and form factors, the four-layer panel remote
  protocol, semantic-first rendering and diff synchronization, the transport
  posture and its swappable boundary, the device-grant capability
  dimensions, the file service surface, the notification service layering,
  and the candidate experiment sequencing.
- Plugin halves (pointers to the plugin documentation corpus): the plugin
  consumption boundary for remote surfaces.
- AI halves (pointers to the AI documentation corpus): the agent-side
  projection, the remote frontend mapping of the dashboard surfaces, and the
  attention and consent composition on a remote surface.

## Open items

- Whether any official service is offered at all, and who owns the
  self-hosting story, stays open; the direction records only that the
  infrastructure must remain optional.
- The discovery protocol, and how pairing keys are stored and rotated, stay
  open.
- Push-gateway ownership under the optional-infrastructure rule stays open:
  the platform gateways are named, but whether Bitty operates any endpoint in
  front of them is undecided.
- Promotion requires its own decision record, with independent security
  review, because the remote transition changes a trust boundary. No open
  question is opened here; the accepted headless ADR remains the gate owner.
