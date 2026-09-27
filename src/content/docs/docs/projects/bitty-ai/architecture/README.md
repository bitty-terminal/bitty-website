---
title: Architecture
description: Index of the AI-core architecture umbrella command tool host-boundary and R1-R6 disposition documents
category: architecture
audience: mixed
document_type: index
status: draft
website_publish: false
sidebar_order: 10
---

# Architecture

Index of the AI-core architecture tree. The tree holds the umbrella
[AI Architecture](ai-architecture.md) specification, the command/tool and
Core-versus-Lua boundary designs, the R1-R6 decision dispositions, the
prototype promotion checklist, and the glossary-driven
[diagram suite](diagrams/README.md). Normative detail lives in the linked pages;
this index carries no duplicate normative prose.

## Admission criteria

A document belongs here when it defines or dispositions the AI-core
architecture: the umbrella runtime model, the command/tool and Core-versus-Lua
boundaries, one of the R1-R6 decision dispositions, or the promotion gate for
prototype work entering the AI Core. It links the accepted contract or draft it
elaborates and includes security review where capability or permission trust
boundaries are involved.

## Authority and status

Every routed page is a draft specification or disposition; draft text does not
authorize shipped, stable, normative, or compatibility-guaranteed behavior. The
accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) is the
overriding contract for IPC framing, wire, scopes, and agent messages and
overrides any conflicting direction. Status meanings and the normative
authoring policy live in the
[documentation workflow](../docs/development/documentation-workflow.md);
shared cross-project governance stays in
[bitty-docs](https://github.com/bitty-terminal/bitty-docs) and is linked, never
copied.

## Documents

| Document                                                                  | Status | Purpose                                                                                                    |
| ------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| [AI Architecture](ai-architecture.md)                                     | Draft  | Umbrella architecture for ModelProvider, ContextProvider, Tool Bus, Agent levels, and Rich streaming.      |
| [Command and tool architecture](command-tool-architecture.md)             | Draft  | Slash command registry, tool runtime separation, and the Core-versus-Lua boundary design.                  |
| [Execution ownership R1](execution-ownership-r1.md)                       | Draft  | Single-agent execution ownership between `ExecutionContext` and optional Panel projection.                 |
| [Tool transport R2](tool-transport-r2.md)                                 | Draft  | Unified authorization backend with native and MCP path selection and fail-closed denial.                   |
| [Context retention R3](context-retention-r3.md)                           | Draft  | Consent-bounded retention, deletion propagation, and recovery limits.                                      |
| [Code intelligence sharing R4](code-intelligence-sharing-r4.md)           | Draft  | Domain-keyed language-service sharing with lease and generation fencing and a reuse evidence bar.          |
| [Task lifecycle R5](task-lifecycle-r5.md)                                 | Draft  | Product Task lifecycle authority versus CarryCtx backend-or-handoff.                                       |
| [Persistence profile R6](persistence-profile-r6.md)                       | Draft  | Journal backend replay contract, projection and index as derived operations, and standalone release scope. |
| [HostBoundary trait and lint-gate design](host-boundary-trait-design.md)  | Draft  | Core-versus-Lua enforcement through a `HostBoundary` trait sketch and a fail-closed lint gate.             |
| [Prototype-to-Core promotion checklist](prototype-promotion-checklist.md) | Draft  | Hard-gate checklist for promoting workflow prototypes into the AI Core, derived from landed practice.      |

## Diagrams

The glossary-driven diagram suite lives in
[diagrams/](diagrams/README.md): the canonical node and edge inventory
(`glossary.yaml`), D2 text sources, and vector SVG exports. Each diagram node
carries its own status from its owning document; diagram content authorizes no
shipped behavior.
