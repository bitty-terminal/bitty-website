---
title: Specifications
description: Index of the accepted AI-core contract and the draft candidate design records
category: specifications
audience: mixed
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Specifications

Index of the AI-core specifications tree. This tree retains the accepted
contract and the draft candidate design records; the draft technical contracts
also live in topic trees. Normative detail lives in the linked pages; this index
carries no duplicate normative prose. Draft text does not authorize shipped,
stable, or compatibility-guaranteed behavior.

## Admission criteria

A document belongs here when it is an accepted versioned contract or a draft
candidate design record that keeps its own status and qualifiers. Draft
technical contracts and dispositions also live in the topic trees routed below.

## Authority and status

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) is the overriding authority
for IPC framing, wire, scopes, and agent messages. A candidate design record is
a design input, not a contract: it preserves candidate directions and
observations and never becomes a decision or an implementation claim by
implication. Shared cross-project governance stays in
[bitty-docs](https://github.com/bitty-terminal/bitty-docs) and is linked, never
copied. Implementation claims require evidence from the owning code repository.

## Accepted contract

| Document                              | Status   | Purpose                                                                 |
| ------------------------------------- | -------- | ----------------------------------------------------------------------- |
| [IPC and Agent RFC](ipc-agent-rfc.md) | Accepted | Bounded IPC framing, wire, auth, scopes, and agent messages for OQ-018. |

## Draft topic trees

Draft technical contracts and dispositions were distributed from this tree into
topic trees; each tree's index routes its documents and restates no status.

| Tree            | Index                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture/` | [Architecture index](../architecture/README.md) — the [AI Architecture](../architecture/ai-architecture.md) specification, the R1-R6 draft dispositions, and the diagram suite. |
| `context/`      | [Context index](../context/README.md).                                                                                                                                          |
| `providers/`    | [Providers index](../providers/README.md).                                                                                                                                      |
| `agent/`        | [Agent index](../agent/README.md).                                                                                                                                              |
| `persistence/`  | [Persistence index](../persistence/README.md).                                                                                                                                  |
| `interfaces/`   | [Interfaces index](../interfaces/README.md).                                                                                                                                    |
| `integration/`  | [Integration index](../integration/README.md).                                                                                                                                  |
| `product/`      | [Product index](../product/README.md).                                                                                                                                          |

## Candidate design records

Draft candidate design records for the AI-core sub-platform. Each carries its
own `status` and candidate qualifiers; none is accepted.

| Candidate design                                                                                               | Status | Purpose                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| [AI runtime boundaries (candidate)](ai-runtime-boundaries-candidate.md)                                        | Draft  | Candidate runtime boundaries, layering, provider and tool security, and persistence release scope.                            |
| [Shared workspace services and agent coordination (candidate)](shared-workspace-services-candidate.md)         | Draft  | Tooling reuse, teams, context messaging, and panel lifecycle synthesis.                                                       |
| [Panel and agent workspace boundary (candidate)](panel-workspace-candidate.md)                                 | Draft  | Panel topics, AI workspace object model, and agent workspace sequencing.                                                      |
| [Plugin and extension model (candidate)](plugin-extension-model-candidate.md)                                  | Draft  | Extension model, host plugin registries, manifest, permissions, and layer split.                                              |
| [IPC extension boundary (candidate)](ipc-extension-boundary-candidate.md)                                      | Draft  | IPC second extension boundary, out-of-process agent runtime, and capability permissions.                                      |
| [Execution supervisor (candidate)](execution-supervisor-candidate.md)                                          | Draft  | Execution supervisor, job service object model, lifetime, timeout, and outcome boundary.                                      |
| [Lua and Core safety boundary (candidate)](lua-core-safety-boundary-candidate.md)                              | Draft  | Four-layer architecture, budgets, attenuation, commander, and secret-handle policy stack.                                     |
| [Quality formula and context compiler (candidate)](quality-and-context-compiler-candidate.md)                  | Draft  | Quality formula, Wheel architecture, context compiler zones, cache, and budgets.                                              |
| [Wheel configuration and context git model (candidate)](wheel-config-and-context-git-model-candidate.md)       | Draft  | Wheel agents split, configuration classes, trust, and Git-inspired context storage modes.                                     |
| [Wheel core and plugin boundary (candidate)](wheel-core-plugin-boundary-candidate.md)                          | Draft  | Wheel core versus plugin boundary, Lua-to-Lua composition, and layering.                                                      |
| [Wheel scope and framework illustration (candidate)](wheel-scope-and-framework-candidate.md)                   | Draft  | Wheel Coding scope, provider and streaming illustrations, and packaging notes.                                                |
| [Event-sourced agent workspace (candidate)](event-sourced-agent-workspace-candidate.md)                        | Draft  | Six-object split, agent versus task graphs, mailbox, typed merges, and task-as-issue.                                         |
| [Wheel context storage and reasoning management (candidate)](wheel-context-storage-and-reasoning-candidate.md) | Draft  | Stored history versus compiled context, reasoning record, context compiler, and cache economics.                              |
| [Session model (candidate)](session-model-candidate.md)                                                        | Draft  | Session identity, directory relations, graph storage, interruption recovery, and the control surface.                         |
| [Wheel-to-runtime coupling (candidate)](wheel-to-runtime-coupling-candidate.md)                                | Draft  | Four-layer lifecycle, observation, action, and presentation coupling between a Wheel agent and the runtime.                   |
| [Execution-projection binding (candidate)](execution-projection-binding-candidate.md)                          | Draft  | Binding a panel or console projection to a running or retained execution; creation, cardinality, lifecycle, single authority. |
