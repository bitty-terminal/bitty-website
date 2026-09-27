---
title: ADR 0013 - Core Ontology and Identity Model
description: Accepts the ten-concept core ontology with ID relations and the Panel/Execution and Restore/Persistence separations for OQ-084
category: decisions
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 43
---

# ADR 0013 - Core Ontology and Identity Model

## Status

Accepted on 2026-09-23 by the project initiator as an owner decision. This ADR
records the core ontology and identity model at the design level in response to
the adopt-all ruling over the `bitty` owner decision packet (merged as
`bitty` #1300, task `CTX-0704`); it does not describe implemented behavior,
does not authorize shipped, stable, normative, or compatibility-guaranteed
behavior, and does not weaken any normative security control. It closes
[OQ-084](../open-questions.md) and gives the dependent identity-family
questions stable terms to build on. Frontmatter `status` is `accepted` per the
repository metadata schema; document status is Accepted. Lifecycle is
`Draft -> owner review -> Accepted (2026-09-23) -> normative`.

- Deciders: project initiator (owner decision, 2026-09-23).
- Related: OQ-084 as the open-question row it closes; OQ-058 (spatial
  orchestration), OQ-061 (agent identity domains and projection), and OQ-083
  (panel lease and handoff) as the dependent questions that reuse its terms;
  the [Panel Runtime and Event Bus
  Pre-Study](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-pre-study.md)
  (draft); DIR-026 (execution host and supervisor boundary); DIR-027 (agent
  authority and hard-safety boundary).

## Context

Identity confusion is the root blocker for the identity family: without agreed
names for the things being identified, the spatial orchestration contract
(OQ-058), the agent identity separation and projection model (OQ-061), and the
panel lease contract (OQ-083) cannot be written precisely. The candidate
ten-concept ontology was recorded from the 2026-09-13 review, with the
Panel/Execution separation and the Restore/Persistence separation named as the
two most immediate refinements. The owner ruling of 2026-09-23 adopts the
ontology together with both separations.

## Decision

### Adopt the ten-concept ontology

The following ten concepts are the accepted vocabulary for Bitty's core
identity model. Each row fixes what the concept is and which lifecycle,
persistence, and permission questions attach to it; no mechanism, schema, or
implementation is selected here.

| Concept          | Definition                                                                                                                                                 | Lifecycle owner                                                         | Persistence                                                              | Permission relevance                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Instance         | One running Bitty application process on a host.                                                                                                           | The OS process; ends with it.                                           | None beyond what its workspaces persist.                                 | Execution host ceiling (DIR-027 L0).                                  |
| Workspace        | A named collection of panels sharing layout and working context.                                                                                           | Created, renamed, and closed by the user or an authorized agent action. | Layout restore data only (see Restore/Persistence separation).           | Workspace-scoped policy narrowing.                                    |
| Panel            | A visible work surface (workstation slot) that presents content and accepts input. Presentation is non-authoritative: a panel never confers authority.     | Core panel lifecycle; volatile content dies with the panel.             | None by itself; persistence is explicit and separate.                    | Panel write-lease (one generation-fenced interactive writer, OQ-083). |
| Surface          | The render or compositor target a panel projects onto.                                                                                                     | Follows the panel projection.                                           | None.                                                                    | Presentation budget attribution.                                      |
| ExecutionContext | The context in which commands and processes run on behalf of an owner: working directory, environment view, and capability grant snapshot.                 | Created per execution or session scope; ends with it.                   | Only tails and references enter agent context; full logs are bounded.    | Capability intersection evaluated here (DIR-027).                     |
| Terminal         | The PTY-backed emulation state (Terminal Truth) with deterministic replay.                                                                                 | Follows the PTY session.                                                | Scrollback is volatile; persistent history is a separate plugin concern. | Input/output capability domains.                                      |
| Session          | An attachable continuity scope: detach and reattach without losing the underlying execution.                                                               | Session-grained per the headless ADR.                                   | Bounded persistence per ADR 0008.                                        | Reattach authentication and scope separation.                         |
| Resource         | A bounded, capability-governed asset (file handle, socket, GPU budget, image cache entry).                                                                 | Owner-defined; bounded by ceilings.                                     | Only where an explicit contract allows it.                               | Per-level capability-domain matrix (OQ-085).                          |
| Service          | A long-lived provider of a capability to panels, agents, or plugins.                                                                                       | Provider lifecycle.                                                     | Provider-owned, never implicit.                                          | Service-requirement versus permission distinction.                    |
| Agent            | The actor identity on whose behalf work is done. Panels may project agent runtime state, but an agent may have no panel, several views, or a headless run. | Agent lifecycle in `bitty-ai`.                                          | Agent memory and growth rules (OQ-070).                                  | Role-authority map (OQ-057).                                          |

### Adopt the ID relations

The accepted stable identifiers and their relations are:

| Identifier           | Identifies                                              | Scoped under                                  | Relations                                                                                                        |
| -------------------- | ------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `WorkspaceId`        | A workspace.                                            | Instance.                                     | Owns panels; referenced by restore data.                                                                         |
| `PanelId`            | A panel (workstation slot).                             | Workspace.                                    | Projects execution state; carries the write-lease generation.                                                    |
| `ExecutionContextId` | An execution context.                                   | Owning agent or task scope.                   | Never owned by a panel; origin panel is provenance only.                                                         |
| `ResourceId`         | A bounded resource.                                     | Issuing service or execution context.         | Bound to capability grants; never ambient.                                                                       |
| `AgentId`            | An agent actor.                                         | Instance.                                     | Distinct from task, run, execution, panel, and workspace ids (OQ-061 stays open for the full domain mapping).    |
| `GenerationId`       | A fencing generation for reloads, leases, and handoffs. | The fenced object (panel, plugin VM, writer). | Old generations are rejected after handoff; composes with the accepted reload mechanics (teardown N before N+1). |

No other identifier is an accepted Stable Id today: `RunId` and `ExecutionId`
remain undecided under OQ-061, and panel visibility must never become
authority.

### Adopt the Panel/Execution separation

Panels never own executions. An execution belongs to its owning agent or task
scope; the origin panel is provenance, completion routes to the owning agent
mailbox, and panels attach to and observe executions they did not start. This
is the same boundary recorded in DIR-026 (jobs do not belong to panels) and is
what lets one execution project to zero, one, or several panels, including
headless runs.

### Adopt the Restore/Persistence separation

Restoring a layout or session view is distinct from persisting state. Restore
re-derives volatile structure from explicit, bounded, consented persistence;
persistence never happens as a side effect of restore, and no secret, history,
or environment value is written to disk implicitly. Restart re-derives from
the OS, configuration, project data, and shell state unless an explicit
opt-in persistence contract exists.

## Consequences

- OQ-058, OQ-061, and OQ-083 gain stable terms: orchestration topology,
  identity-domain mapping, and lease contracts can now name the same things.
- `bitty` #1093 closes into this ADR; implementation tasks build typed
  contracts (schemas, IPC verbs, store layouts) against this vocabulary.
- The separations constrain future contracts: any execution contract must keep
  panel provenance non-authoritative, and any restore contract must keep
  persistence explicit and consented.
- This ADR authorizes no code, changes no accepted pins or ceilings, and
  weakens no security control.

## Alternatives considered

| Alternative                                            | Disposition                                                                                                                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leave terms ad-hoc per RFC                             | Rejected — identity confusion is the root blocker for OQ-058/061/083; unshared vocabulary keeps every dependent contract imprecise                                          |
| Merge Panel and Execution into one identity            | Rejected — breaks the headless, multi-view, and projected-execution cases: an agent may have no panel, several views, or an execution projected to a panel it did not start |
| Merge restore and persistence into one mechanism       | Rejected — implicit writes risk persisting secrets, history, and environment data without consent; restore must re-derive, persistence must be explicit                     |
| Defer the ontology until the Panel Runtime is accepted | Rejected — the Panel Runtime acceptance itself needs stable identity terms; deferral blocks the whole identity family                                                       |

## Affected contracts

- OQ-084: the register row records this ADR as the closing evidence.
- OQ-058, OQ-061, OQ-083: dependent rows reuse the ontology terms; their
  contracts remain to be written and are not closed by this ADR.
- [Panel Runtime and Event Bus
  Pre-Study](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-pre-study.md):
  remains draft; its acceptance must use these terms.
- DIR-026 and DIR-027: the execution-host boundary and the authority boundary
  stay authoritative and compose with the two separations.
- [Decision register](../index.md) and [ADR index](README.md): route to this
  ADR.

## Open points

- Typed field, schema, and wire definitions for each concept and identifier
  are implementation follow-ups; this ADR fixes vocabulary, not types.
- `GenerationId` fencing mechanics (rejection rules, handoff protocol) need a
  contract before use.
- The full agent identity-domain mapping (`AgentId` versus `TaskId`,
  `RunId`, `ExecutionId`) stays open under OQ-061.
- Service and Resource capability binding against the OQ-085 per-level domain
  matrix is a follow-up in the security corpus.
- No implementation is claimed; verification is future contract acceptance
  plus the existing gates.

## References

- Owner decision packet: `bitty` `specifications/oq-owner-decision-packet.md`
  (merged as `bitty` #1300, task `CTX-0704`; source of the adopt-all ruling of
  2026-09-23). Refs `bitty-terminal/bitty#1093` (closed into this ADR by the
  owning team, not by this document).
- [Open-question register](../open-questions.md) (OQ-084, OQ-058, OQ-061,
  OQ-083)
- [Panel Runtime and Event Bus
  Pre-Study](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-pre-study.md)
- [Execution Host and Supervisor
  Boundary](../../development/execution-host-boundary.md) (DIR-026)
- [Agent Authority and Hard-Safety
  Boundary](../../development/agent-authority-boundary.md) (DIR-027)
- [ADR 0008 - Headless Daemon, Detach/Reattach and Remote UI Trust
  Boundary](ADR-0008-headless.md) (session-grained detach/reattach, bounded
  persistence)
