---
title: Specifications
description: Versioned technical contracts for Bitty components interfaces formats and behavior
category: specifications
audience: contributor
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Specifications

The following standalone specifications are accepted. Acceptance records a
reviewed contract; it does not prove implementation, and evidence rules in each
document still apply:

| Specification                                                 | Closes                                 | Status   |
| ------------------------------------------------------------- | -------------------------------------- | -------- |
| [Performance Budget RFC](performance-budget-rfc.md)           | OQ-001                                 | Accepted |
| [Compatibility Milestone RFC](compatibility-milestone-rfc.md) | OQ-004                                 | Accepted |
| [Terminal State RFC](terminal-state-rfc.md)                   | OQ-007                                 | Accepted |
| [Configuration Model RFC](configuration-model-rfc.md)         | OQ-010                                 | Accepted |
| [Plugin Platform RFC](plugin-platform-rfc.md)                 | OQ-011, OQ-012, OQ-013                 | Accepted |
| [Package Lifecycle RFC](package-lifecycle-rfc.md)             | OQ-021                                 | Accepted |
| [Lua Runtime RFC](lua-runtime-rfc.md)                         | OQ-009                                 | Accepted |
| [Rich Presentation RFC](rich-presentation-rfc.md)             | OQ-008, OQ-015, OQ-016                 | Accepted |
| [Isolation Resource RFC](isolation-resource-rfc.md)           | OQ-014                                 | Accepted |
| [CLI Contract RFC](cli-contract-rfc.md)                       | OQ-017                                 | Accepted |
| [Package Follow-up RFC](package-followup-rfc.md)              | OQ-022, OQ-026, OQ-027, OQ-028, OQ-029 | Accepted |
| [DevTools RFC](devtools-rfc.md)                               | OQ-019                                 | Accepted |
| [Default Distribution RFC](default-distribution-rfc.md)       | OQ-002                                 | Accepted |
| [IPC and Agent RFC](ipc-agent-rfc.md)                         | OQ-018                                 | Accepted |
| [Governance RFC](governance-rfc.md)                           | OQ-024                                 | Accepted |
| [Website Delivery RFC](website-delivery-rfc.md)               | OQ-023                                 | Accepted |
| [Risk Evidence RFC](risk-evidence-rfc.md)                     | OQ-025                                 | Accepted |

Naming note: current entries use RFC-style filenames; renaming accepted
specifications to `SPEC-NNNN-short-title.md` follows the policy below and is
applied only together with an update of all inbound links.

Review note (2026-08-29): the Configuration Model RFC targeting OQ-010,
the Plugin Platform RFC targeting OQ-011/OQ-012/OQ-013, the Package Lifecycle RFC
targeting OQ-021, the Lua Runtime RFC targeting OQ-009, the Rich Presentation RFC targeting OQ-008/OQ-015/OQ-016, the Isolation Resource RFC targeting OQ-014, the CLI Contract RFC targeting OQ-017, the Package Follow-up RFC targeting OQ-022, OQ-026, OQ-027, OQ-028, OQ-029, the DevTools RFC targeting OQ-019, the Default Distribution RFC targeting OQ-002, the IPC and Agent RFC targeting OQ-018, the Governance RFC targeting OQ-024, the Website Delivery RFC targeting OQ-023, and the Risk Evidence RFC targeting OQ-025 are `Accepted` with
frontmatter `accepted` since 2026-08-29; no remaining `Draft` specification remains as of 2026-08-29. Further `Proposed` material is limited to ADR 0005 (OQ-030), ADR 0006 (OQ-031), and ADR 0007 (OQ-032) as tracked in the [ADR index](../decisions/adrs/README.md) and requires independent category-owner, docs-curator, and security-reviewer evidence before acceptance; crate presence of
`bitty-config`, `bitty-plugin-host`, `bitty-rich`, `bitty-ipc`, and
`bitty-agent` does not self-accept any draft beyond the accepted IPC and Agent RFC, and `bitty-package` lifecycle and
integrity model is accepted while real signature verification remains draft per
crate docs. The twenty accepted artifacts (Performance Budget RFC OQ-001, ADR-0002
OQ-003, Compatibility Milestone RFC OQ-004, ADR-0003 OQ-005, ADR-0004 OQ-006,
Terminal State RFC OQ-007, Configuration Model RFC OQ-010, Plugin Platform RFC
OQ-011/OQ-012/OQ-013, Package Lifecycle RFC OQ-021, Lua Runtime RFC OQ-009, Rich Presentation RFC OQ-008/OQ-015/OQ-016, Isolation Resource RFC OQ-014, CLI Contract RFC OQ-017, Package Follow-up RFC OQ-022, OQ-026, OQ-027, OQ-028, OQ-029, DevTools RFC OQ-019, Default Distribution RFC OQ-002, IPC and Agent RFC OQ-018, Governance RFC OQ-024, Website Delivery RFC OQ-023, Risk Evidence RFC OQ-025)
remain `Accepted` as recorded in the [decision register](../decisions/index.md).

## Admission criteria

A specification defines boundaries, inputs, outputs, invariants, errors,
resource limits, compatibility, lifecycle, recovery, and verification. It links
the requirements and decisions it implements and includes security review where
trust boundaries are involved.

## Authority and status

A `normative` specification governs its declared version and scope. Draft text
does not authorize shipped, stable, normative, or compatibility-guaranteed
behavior and does not form public reference; experimental implementation may
exist as review evidence but carries no compatibility promise and does not
constitute acceptance. User/reference claims still require implementation and
conformance evidence. The lifecycle is Draft -> experimental review evidence ->
Accepted -> normative; only Accepted or normative documents authorize shipped
behavior.

## Naming and maintenance

Use `SPEC-NNNN-short-title.md`. Keep identifiers and version history stable,
record breaking changes explicitly, and update requirements, risks, reference,
and migration guidance in the same delivery.
