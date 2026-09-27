---
title: Runtime
description: Index of the plugin host runtime Lua execution and isolation and resource contracts
category: specifications
audience: contributor
document_type: index
status: accepted
website_publish: true
sidebar_order: 11
---

# Runtime

Index of the plugin-ecosystem runtime contracts. Normative detail lives in the
linked pages; this index carries no duplicate normative prose.

## Admission criteria

A runtime contract defines boundaries, inputs, outputs, invariants, errors,
resource limits, compatibility, lifecycle, recovery, and verification for the
runtime it governs. New pages are added only when real content exists; empty
placeholder pages are avoided.

## Authority and status

The table's status column governs each page: the accepted pages are reviewed
contracts for their declared scope, while the draft candidate page records
direction only and authorizes no shipped, stable, or compatibility-guaranteed
behavior. Acceptance records a reviewed contract and does not prove
implementation. Shared cross-project governance stays in
[bitty-docs](https://github.com/bitty-terminal/bitty-docs) and is linked, never
copied.

## Contracts

| Document                                                                             | Status   | Purpose                                                                                                              |
| ------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------- |
| [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md)                                | Accepted | Runtime host bridge, per-plugin VM lifecycle, and host services.                                                     |
| [Lua Runtime RFC](lua-runtime-rfc.md)                                                | Accepted | Lua runtime, sandbox, standard-library subset, and module search rules.                                              |
| [Isolation and Resource RFC](isolation-resource-rfc.md)                              | Accepted | Isolation boundaries, resource ceilings, and failure semantics.                                                      |
| [Phodopus Plugin Runtime (Candidate)](phodopus-runtime-candidate.md)                 | Draft    | Candidate plugin-side Phodopus successor-runtime direction; no accepted interface.                                   |
| [Capability Architecture Doctrine (Candidate)](capability-architecture-candidate.md) | Draft    | Candidate capability doctrine: provider identity, sandbox formula, shared services, quotas, lifecycle, lazy loading. |
