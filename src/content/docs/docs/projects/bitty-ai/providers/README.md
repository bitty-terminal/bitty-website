---
title: Providers
description: Index of AI-core provider integration documents for model provider boundary multimodal inference and dependency policy
category: architecture
audience: mixed
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Providers

Index of the AI-core provider integration documents. Normative detail lives in
the linked pages; this index carries no duplicate normative prose.

## Admission criteria

A document belongs here when it defines the model-provider or tool-provider
boundary, provider plugin shape, multimodal inference surface, the contract a
provider transport adapter owes Core and the network layer, or the runtime
dependency posture that constrains provider adapters. It links the architecture
dispositions it elaborates and includes security review where credential or
transport trust boundaries are involved.

## Authority and status

Every page here is a draft proposal. Draft text does not authorize shipped,
stable, normative, or compatibility-guaranteed behavior. Status meanings and the
normative authoring policy live in the
[documentation workflow](../docs/development/documentation-workflow.md); the
accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) overrides any
conflicting direction.

## Documents

| Document                                                             | Status | Purpose                                                                      |
| -------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| [Provider plugin boundary](provider-plugin-boundary.md)              | Draft  | Core versus provider-plugin boundary for ModelProvider contract and secrets. |
| [Multimodal inference boundary](multimodal-inference-boundary.md)    | Draft  | Core multimodal extension for capability vocabulary, task envelope, assets.  |
| [Dependency Strategy](dependency-strategy.md)                        | Draft  | Std-only runtime kernel with post-v0.1 adapter dependency boundaries.        |
| [Provider transport adapter contract](transport-adapter-contract.md) | Draft  | Adapter input envelope, guarantees, and network delegation boundary.         |
