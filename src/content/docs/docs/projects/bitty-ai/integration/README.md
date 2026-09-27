---
title: Integration
description: Index of AI-core bitty-side handoff integration risk and RFC-readiness documents
category: architecture
audience: mixed
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Integration

Index of the AI-core cross-repository integration documents. Normative detail
lives in the linked pages; this index carries no duplicate normative prose.

## Admission criteria

A document belongs here when it records the bitty-side handoff input, maps
bitty deliveries to verification evidence, registers cross-repository
integration risks, or evaluates draft readiness for splitting into RFCs. It
names the owning side for every requirement and grants no cross-repository
acceptance by implication.

## Authority and status

Every page here is a draft record. Draft text does not authorize shipped, stable, normative, or
compatibility-guaranteed behavior. Status meanings and the normative
authoring policy live in the
[documentation workflow](../docs/development/documentation-workflow.md);
the accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md)
overrides any conflicting direction.

## Documents

| Document                                                                | Status | Purpose                                                                            |
| ----------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| [Bitty-side integration input](bitty-side-integration-input.md)         | Draft  | Draft bitty-side handoff input assembling dispatch, execution, transport needs.    |
| [Bitty-side delivery verification](bitty-side-delivery-verification.md) | Draft  | Read-only verification mapping bitty deliveries to integration inputs.             |
| [Cross-repo integration risk register](integration-risk-register.md)    | Draft  | Handoff register of bitty-ai and bitty cross-repo integration risks.               |
| [RFC-split readiness evaluation](rfc-split-readiness.md)                | Draft  | Evaluation of which drafts are ready to split into narrow RFCs with evidence bars. |
