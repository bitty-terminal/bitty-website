---
title: Specifications
description: Index of accepted and draft plugin-ecosystem technical contracts with their open-question scope and status
category: specifications
audience: contributor
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Specifications

This register indexes the versioned technical contracts that govern the Bitty
plugin ecosystem. Acceptance records a reviewed contract; it does not prove
implementation, and each document's own evidence rules still apply. Draft work
is listed separately and does not authorize shipped, stable, normative, or
compatibility-guaranteed behavior.

Contracts that belong to a narrower theme live in their own topic tree; this
register routes to those tree indexes instead of duplicating their route
tables.

## Accepted specifications

| Specification                                                                        | Closes                 | Status   |
| ------------------------------------------------------------------------------------ | ---------------------- | -------- |
| [Plugin Platform RFC](plugin-platform-rfc.md)                                        | OQ-011, OQ-012, OQ-013 | Accepted |
| [Plugin Manifest and Capability Grammar Authority](manifest-capability-authority.md) | #95, #96               | Accepted |

## Draft specifications

| Specification                                                                     | Scope                                                                                                                     | Status |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| [Plugin contract direction (candidate)](plugin-contract-direction.md)             | Candidate plugin-side public-contract, framework-layering, and artifact direction; no accepted interface.                 | Draft  |
| [Beacon Targeting Framework (Candidate)](beacon-targeting-framework-candidate.md) | Candidate workspace-wide spatial and semantic targeting framework; no accepted provider or dispatch API.                  | Draft  |
| [SDK build plan proposal (Phase 0)](sdk-build-plan-proposal.md)                   | Candidate Phase 0 SDK build direction: freezable surface, churning scope, layouts, and sequencing; no accepted interface. | Draft  |

Research-type pages preserve candidate direction and observations authored in
this repository; they never become a decision or an implementation claim by
implication.

## Contracts by topic tree

The remaining plugin-ecosystem contracts are grouped by theme. Each tree index
carries its own status table and admission rule.

| Tree                                      | Contracts                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [Runtime](../runtime/README.md)           | Plugin Host Runtime RFC, Lua Runtime RFC, Isolation and Resource RFC (all accepted).                       |
| [SDK](../sdk/README.md)                   | Plugin API v1 Lua Surface RFC (accepted).                                                                  |
| [Packaging](../packaging/README.md)       | Package Lifecycle RFC and Package Follow-up RFC (accepted), Plugin Reuse and Provider Ecology RFC (draft). |
| [Architecture](../architecture/README.md) | Plugin Ecosystem Model, Plugin IPC Boundary, UI Extensibility Architecture (all draft).                    |

## Admission criteria

A specification defines boundaries, inputs, outputs, invariants, errors,
resource limits, compatibility, lifecycle, recovery, and verification. It links
the requirements and decisions it implements and includes security review where
trust boundaries are involved. New pages are added only when real content
exists; empty placeholder specifications are avoided.

## Authority and status

A `normative` specification governs its declared version and scope. Draft text
does not authorize shipped, stable, normative, or compatibility-guaranteed
behavior and does not form public reference. The lifecycle is
`Draft -> experimental review evidence -> Accepted -> normative`; only
`Accepted` or `normative` documents authorize shipped behavior. Shared
cross-project decisions and open questions live in
[bitty-docs](https://github.com/bitty-terminal/bitty-docs) and are linked,
never copied.
