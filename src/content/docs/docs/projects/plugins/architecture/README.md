---
title: Architecture
description: Index of the plugin-ecosystem architecture model IPC boundary UI extensibility contracts and diagram suite
category: architecture
audience: plugin-author
document_type: index
status: accepted
website_publish: true
sidebar_order: 15
---

# Architecture

Index of the plugin-ecosystem architecture contracts and their diagram suite.
Normative detail lives in the linked pages; this index carries no duplicate
normative prose.

## Admission criteria

An architecture contract defines extension boundaries, ownership, composition,
and mechanism/policy splits for the plugin ecosystem. New pages are added only
when real content exists; empty placeholder pages are avoided.

## Authority and status

All three pages are draft, candidate design input that authorizes no
shipped behavior. Accepted boundaries they reconcile against live in the
[runtime](../runtime/README.md), [sdk](../sdk/README.md), and
[packaging](../packaging/README.md) trees and in the accepted
[Plugin Platform RFC](../specifications/plugin-platform-rfc.md). Shared
cross-project governance stays in
[bitty-docs](https://github.com/bitty-terminal/bitty-docs) and is linked, never
copied.

## Contracts

| Document                                                          | Status | Purpose                                                         |
| ----------------------------------------------------------------- | ------ | --------------------------------------------------------------- |
| [Plugin Ecosystem Model](plugin-ecosystem-model.md)               | Draft  | Candidate plugin taxonomy and Panel-as-host direction.          |
| [Plugin IPC Boundary](plugin-ipc-boundary.md)                     | Draft  | Candidate out-of-process boundary and unified capability model. |
| [UI Extensibility Architecture](ui-extensibility-architecture.md) | Draft  | UI extension points, ownership boundaries, and Lua surface.     |

## Diagrams

The glossary-driven diagram suite lives in
[diagrams/](diagrams/README.md): the canonical node and edge inventory plus
Mermaid sources and vector exports. Each diagram node carries its own status;
diagram content authorizes no shipped behavior.
