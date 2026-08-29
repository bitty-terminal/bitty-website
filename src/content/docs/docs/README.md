---
title: Documentation map
description: Canonical navigation and authority rules for the Bitty documentation corpus
category: project
audience: mixed
document_type: index
status: accepted
website_publish: true
sidebar_order: 1
---

# Documentation map

This index is the entry point for Bitty's canonical design corpus. The corpus
is **Pre-alpha / M1 Hardening** (2026-08-29, `bitty` `be3bdb4` 16 crates,
32 OQs `Accepted`): it records what the project intends, what it requires,
what it is considering, what is `Implemented` (headless soak ~808 tests) but
not yet `Verified`, and what remains `Open`. Lifecycle is
`Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`
per the [risk evidence RFC](specifications/risk-evidence-rfc.md).

## Product

| Document                                                            | Purpose                                                                                                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Product vision](product/vision.md)                                 | Product intent, principles, scope, and success criteria.                                                                                                    |
| [Proposed Delivery Sequence](product/proposed-delivery-sequence.md) | Draft record of candidate build order, deferral list, version ladder, and daemon staging from historical advisor input; not a roadmap.                      |
| [Release Ladder](product/release-ladder.md)                         | Pre-alpha / M1 Hardening mapping of the v0.1-v1.0 maturity ladder to the 16-crate workspace and `Implemented`/`Verified` lifecycle (2026-08-29, `be3bdb4`). |

## User and contributor documentation

| Document                                                        | Purpose                                                                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [User guide](user-guide/README.md)                              | Honest Pre-alpha / M1 Hardening index for future installation, onboarding, daily-use, and troubleshooting guides (installation still deferred until `Verified`).    |
| [Tutorials](tutorials/README.md)                                | Future verified end-to-end learning paths; currently an explicit empty state.                                                                                       |
| [How-to guides](how-to/README.md)                               | Future focused procedures for one supported task.                                                                                                                   |
| [Troubleshooting](troubleshooting/README.md)                    | Future verified diagnosis, recovery, and escalation guidance.                                                                                                       |
| [Migrations](migrations/README.md)                              | Future tested version transitions, rollback, and compatibility guidance.                                                                                            |
| [Examples](examples/README.md)                                  | Future minimal, versioned, mechanically verified illustrations.                                                                                                     |
| [Development](development/README.md)                            | Contributor entry point and current delivery expectations.                                                                                                          |
| [Documentation workflow](development/documentation-workflow.md) | Normative taxonomy, metadata, ownership, review, synchronization, deprecation, and versioning policy.                                                               |
| [Repository bootstrap](development/repository-bootstrap.md)     | Accepted zero-functionality Core and website scaffold contract plus implementation validation gates (16 crates `be3bdb4` now `Implemented` but not yet `Verified`). |
| [Toolchain and tooling policy](development/toolchain-policy.md) | Pinned per-repository toolchains and canonical gate commands all agents must use.                                                                                   |

## Architecture and interfaces

| Document                                                  | Purpose                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Architecture overview](architecture/overview.md)         | System context, layers, data flow, and architectural status.                                                                                                                                                                                                                                                             |
| [Core boundaries](architecture/core-boundaries.md)        | Terminal Truth, hot-path ownership, extension boundaries, and P0 gates.                                                                                                                                                                                                                                                  |
| [Lua and XDG](configuration/lua-and-xdg.md)               | Accepted Lua direction and configuration model (accepted in [Configuration Model RFC](specifications/configuration-model-rfc.md)).                                                                                                                                                                                       |
| [Plugin system](extensibility/plugin-system.md)           | Extension surfaces, lifecycle, isolation, capabilities, and conflicts.                                                                                                                                                                                                                                                   |
| [Package management](extensibility/package-management.md) | Package workflow (resolver `Implemented` at `be3bdb4` but not yet `Verified`) and normative supply-chain constraints (Package Lifecycle RFC OQ-021 and Package Follow-up RFC OQ-022/026-029 `Accepted`).                                                                                                                 |
| [CLI](interfaces/cli.md)                                  | Command/action registry, CLI grammar, IPC, and automation contract (accepted CLI contract in [CLI Contract RFC](specifications/cli-contract-rfc.md) for OQ-017; accepted wire/transport contract in [IPC and Agent RFC](specifications/ipc-agent-rfc.md) for OQ-018, `Implemented` at `be3bdb4` but not yet `Verified`). |
| [Rich content](interfaces/rich-content.md)                | Structured presentation model without surrendering terminal truth (`Accepted` via Rich Presentation RFC OQ-008/015/016, `Implemented` at `be3bdb4` but not yet `Verified`).                                                                                                                                              |

## Requirements, specifications, and reference

| Document                                   | Purpose                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| [Requirements](requirements/README.md)     | Future testable outcomes and constraints independent of mechanism.           |
| [Specifications](specifications/README.md) | Future precise, versioned technical contracts with verification obligations. |
| [Reference](reference/README.md)           | Future factual lookup material derived from implementation evidence.         |

## Security

| Document                                   | Authority                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| [Security overview](security/overview.md)  | Normative security contract and capability taxonomy (Pre-alpha / M1 Hardening, `Implemented` not yet `Verified`).         |
| [Threat model](security/threat-model.md)   | Normative trust boundaries, threats, and required controls (M1 Hardening).                                                |
| [Risk register](security/risk-register.md) | Security risks and evidence-based closure criteria (all `Open` until `Verified`, matrix `pending` per Risk Evidence RFC). |

Security controls are not optional candidates merely because their exact
mechanisms or thresholds still need an RFC. The security corpus takes
precedence over source summaries and non-security design suggestions.

## Project and technology

| Document                                                        | Purpose                                                                                                                                                        |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Repository map](project/repository-map.md)                     | Local/remote topology, repository ownership, and current initialization state (16 crates `be3bdb4`, Website Delivery OQ-023 and Governance OQ-024 `Accepted`). |
| [Technology strategy](project/technology-strategy.md)           | Accepted language/platform direction and implementation choices (16 crates, `bitty-lua` `piccolo` 0.3.3 `Accepted`).                                           |
| [Reference projects](project/reference-projects.md)             | Untrusted, read-only research snapshots and study questions.                                                                                                   |
| [Website content contract](project/website-content-contract.md) | Normative ownership and validation boundary between `bitty-docs` and `bitty-website`.                                                                          |
| [Roadmap](roadmap/README.md)                                    | Evidence-based sequencing without unsupported date or release promises.                                                                                        |
| [Releases](releases/README.md)                                  | Future immutable release notes backed by published artifacts.                                                                                                  |

## Decisions, work, and provenance

| Document                                                                                             | Purpose                                                                                    |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [Decision register](decisions/index.md)                                                              | Accepted directions, normative contracts, verified facts, and ADR/RFC queue.               |
| [Open-question register](decisions/open-questions.md)                                                | Unresolved choices with a canonical owner document and next artifact.                      |
| [Architecture decision records](decisions/adrs/README.md)                                            | Catalog and maintenance rules for durable accepted architecture decisions.                 |
| [ADR 0001 - Repository Bootstrap Baseline](decisions/adrs/ADR-0001-repository-bootstrap-baseline.md) | Accepted minimal Core and website initialization boundary without product behavior.        |
| [Requests for comments](decisions/rfcs/README.md)                                                    | Reviewable proposals and final dispositions; currently an explicit empty state.            |
| [Findings](findings/README.md)                                                                       | Durable reviewed evidence; internal and excluded from website publication.                 |
| [Shared-conversation coverage](sources/chatgpt-share-coverage.md)                                    | Traceability from both historical ChatGPT design conversations to canonical documents.     |
| [Phase A TODO](../TODO.md)                                                                           | Pre-alpha / M1 Hardening status reconciliation and hardening work (2026-08-29, `be3bdb4`). |

## Interpretation rules

Use the following lifecycle labels consistently
(`Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`):

| Label                                 | Meaning                                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Normative requirement                 | A future implementation gate. Mechanism details may remain open.                                                                                                         |
| Accepted working direction            | Current project intent; record an ADR/RFC before freezing a public contract. All 32 OQs (OQ-001..032) are `Accepted` as of 2026-08-29.                                   |
| Candidate                             | A proposal to investigate, compare, or prototype.                                                                                                                        |
| Open                                  | No decision has been made, or closure evidence is missing. Risks are `Open` until `Verified` (matrix `pending`).                                                         |
| Implemented                           | Demonstrated by code, tests, or release evidence in the owning repository (`bitty` `be3bdb4`, 16 crates, soak ~808 headless tests `Implemented` but not yet `Verified`). |
| Verified / Compatible / Release-ready | Independent security-auditor and P0-AC evidence, compatibility matrix, and release train per Governance RFC. Not yet claimed at M1 Hardening.                            |

At M1 Hardening (2026-08-29, `be3bdb4`), some product behavior is `Implemented`
(`vt`/`term-state`/`pty`/`render`/`ui`/`runtime`/`config`/`lua`/`rich`/`ipc`/`agent`/`package`) but not yet `Verified`; repository existence, remote visibility, and initialization state remain project facts, and `Verified` requires risk-evidence matrix.

## Language, metadata, and publication

English is the only canonical documentation language. CJK content, translation
trees, locale directories, and multilingual routing are not currently allowed;
internationalization is deferred until a reviewed cross-repository decision.

Every file under `docs/` carries the exact flat metadata schema defined in the
[documentation workflow](development/documentation-workflow.md). A document is
eligible for future website publication only when `website_publish` is `true`.
No website content consumer exists yet. A future independent website
integration must consume a pinned docs revision under the
[website content contract](project/website-content-contract.md) and must not own
or duplicate normative prose.

Internal workspace inventories, research snapshots, the website integration
contract, and findings use `website_publish: false`. Public-facing category
indexes remain eligible even while empty because they explicitly state the
admission gate and do not invent product behavior.

## Maintaining the corpus

1. Update the canonical topic document first.
2. Record accepted direction or decision status in the
   [decision register](decisions/index.md).
3. Add or close an entry in the
   [open-question register](decisions/open-questions.md), citing its ADR, RFC,
   test, or other evidence.
4. Preserve historical provenance in `docs/sources/` without copying a source
   wholesale or turning suggestions into facts.
5. Update this index and the root [README](../README.md) when navigation changes.
6. Treat synchronized documentation as part of delivery completion, not a
   follow-up that may be silently omitted.
