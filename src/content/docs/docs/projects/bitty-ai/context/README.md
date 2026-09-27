---
title: Context
description: Index of AI-core context assembly budget provenance retention and prompt-layering documents
category: architecture
audience: mixed
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Context

Index of the AI-core context subsystem documents. Normative detail lives in the
linked pages; this index carries no duplicate normative prose.

## Admission criteria

A document belongs here when it defines context assembly, budget, provenance,
retention, stable-prefix ordering, or prompt layering for the AI core. It links
the architecture dispositions it elaborates and includes security review where
trust boundaries are involved.

## Authority and status

Every page here is a draft proposal. Draft text does not authorize shipped,
stable, normative, or compatibility-guaranteed behavior. Status meanings and the
normative authoring policy live in the
[documentation workflow](../docs/development/documentation-workflow.md); the
accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) overrides any
conflicting direction.

## Documents

| Document                                                                | Status | Purpose                                                                                                    |
| ----------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| [Context management architecture](context-management.md)                | Draft  | Session journal, context view model, and multi-level compression pipeline.                                 |
| [Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md)  | Draft  | Stable-prefix layering and deterministic serialization for prefix-cache reuse.                             |
| [Prompt Layering Design](prompt-layering-design.md)                     | Draft  | Five-layer prompt contract with capability separation and stable assembly order.                           |
| [Wheel Context Runtime (Candidate)](wheel-context-runtime-candidate.md) | Draft  | Tiered evidence, knowledge DAG, working-set temperature, and refinement lifecycle (candidate).             |
| [Project continuity (candidate)](project-continuity-candidate.md)       | Draft  | Continuity artifact classes, synthesis and rebase derivation, and a bounded session bootstrap (candidate). |
