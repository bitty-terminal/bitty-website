---
title: Agent
description: Index of AI-core agent coordination code-intelligence attribution and host-boundary documents
category: architecture
audience: mixed
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Agent

Index of the AI-core agent documents. Normative detail lives in the linked
pages; this index carries no duplicate normative prose.

## Admission criteria

A document belongs here when it defines agent coordination, supervision,
delegation, code-intelligence mediation, caller attribution, audited
version-control access, or the Core-versus-Lua host boundary for agent
execution. It links the architecture dispositions it elaborates and includes
security review where capability or permission trust boundaries are involved.

## Authority and status

Every page here is a draft proposal. Draft text does not authorize shipped,
stable, normative, or compatibility-guaranteed behavior. Status meanings and the
normative authoring policy live in the
[documentation workflow](../docs/development/documentation-workflow.md); the
accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) overrides any
conflicting direction.

## Documents

| Document                                                             | Status | Purpose                                                                              |
| -------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| [Agent coordination architecture](agent-coordination.md)             | Draft  | Workspace services, supervision, delegation, teams, and panel lifecycle.             |
| [Fluid roles doctrine](fluid-roles.md)                               | Draft  | Solo-by-default execution, Commander-led teams, fluid roles and models.              |
| [Code intelligence architecture](code-intelligence.md)               | Draft  | LSP sharing, stateful mediation, lint/build/test reuse, verification fingerprinting. |
| [Caller attribution design](caller-attribution-design.md)            | Draft  | Candidate caller-attribution field and LLM-plugin boundary.                          |
| [Audited git wrapper API design](git-wrapper-api-design.md)          | Draft  | Candidate API shape for audited version-control access behind a scoped wrapper.      |
| [Fragment pre-split and reassembly rule](fragment-pre-split-rule.md) | Draft  | Implemented slice-layer fragment pre-split and reassembly mapping rule.              |
