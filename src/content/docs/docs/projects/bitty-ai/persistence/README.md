---
title: Persistence
description: Index of AI-core persistence evidence storage export and history-consumption documents
category: architecture
audience: mixed
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Persistence

Index of the AI-core persistence documents. Normative detail lives in the
linked pages; this index carries no duplicate normative prose.

## Admission criteria

A document belongs here when it defines the journal, evidence store, projection,
indexing, replay, storage and export scope, or the history-consumption boundary
for the AI core. It links the architecture dispositions it elaborates and
includes security review where retained-data or privacy trust boundaries are
involved.

## Authority and status

Every page here is a draft proposal. Draft text does not authorize shipped,
stable, normative, or compatibility-guaranteed behavior. Status meanings and the
normative authoring policy live in the
[documentation workflow](../docs/development/documentation-workflow.md); the
accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) overrides any
conflicting direction.

## Documents

| Document                                                            | Status | Purpose                                                                               |
| ------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| [Persistence and evidence architecture](persistence-evidence.md)    | Draft  | Journal, evidence, projection, indexing, and replay tradeoffs under privacy controls. |
| [Storage memory and export design](storage-memory-export-design.md) | Draft  | Per-session storage direction with catalog control plane and export scopes.           |
| [History consumption boundary](history-consumption-boundary.md)     | Draft  | Consume-not-own history boundary with scoped panel-history-style reads.               |
