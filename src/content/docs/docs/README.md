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
is **Pre-alpha / Engineering Milestones M1-M8** (2026-09-08, `bitty` `29772a3`
previous `c49ead1` baseline `de134ec`, 18 crates,
32 OQs `Accepted`; `R-004` clipboard re-audited at `bitty` `7a4ee41` baseline
`de134ec` per
[`docs/security/audits/clipboard-2026-09.md`](https://github.com/bitty-terminal/bitty/blob/7a4ee41/docs/security/audits/clipboard-2026-09.md)
(2026-08-31, CTX-0097) and remains `Open`; `R-005`/`R-006`/`R-007` at `bitty`
`d4d75e9` baseline `de134ec` (`5bdcdbd`/`0afc94d`/`d4d75e9`,
Issues #137/#138/#139) are `Mitigated` per RS-1..RS-7; experimental
implementations `c0aadd2` (vertical slice, CTX-0095) + `7e3104d` (dogfood,
CTX-0096) + `a8735d0` (PTY fix, CTX-0098) are `Implemented` (experimental) not
`Verified`/`Compatible`/`Release-ready`, overall not `Verified`): it records
what the project intends, what it requires, what it is considering, what is
`Implemented` (compat-lab/perf hardening and UX wave through `29772a3` plus semantic-terminal P1-P5 `Implemented`-only plus scrollbar overlay `Implemented`-only plus workspace rename, panel gaps, `mod_key`, font `1.375`/`2.0`, `radius_px` S0, `frameHash` digest, and V1-V3 gates `Implemented`-only plus experimental single-window slice)
but not yet `Verified`, and what remains `Open`/`Mitigated` (including `R-004`
with residual platform-backend, real-window UX, and `8192`-byte bound-scope
limits) and `Experimental Implementation` (reviewable code at `a8735d0`). Lifecycle is
`Draft -> Experimental Implementation -> Accepted -> Verified -> Compatible -> Release-ready`
(spec) and `Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`
(crate) per the [risk evidence RFC](specifications/risk-evidence-rfc.md).
Canonical snapshot: [`project-state.json`](project/project-state.json)
(synchronized `29772a3`, `2026-09-08`, `Pre-alpha / Engineering Milestones M1-M8`, `R-004`
`Open`, `R-005`/`R-006`/`R-007` `Mitigated`, experimental `c0aadd2`/`7e3104d`/`a8735d0`
`Implemented` not `Verified`, release `v0.0.19`) validated by `bun .github/scripts/check-state.mjs`.

## Product

| Document                                                                                               | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Product vision](product/vision.md)                                                                    | Product intent, principles, scope, and success criteria.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| [Panel Extensibility Vision](product/panel-vision.md)                                                  | Draft vision for Panel as a programmable terminal workspace container; candidate direction only.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| [Proposed Delivery Sequence](product/proposed-delivery-sequence.md)                                    | Draft record of candidate build order, deferral list, version ladder, and daemon staging from historical advisor input; not a roadmap.                                                                                                                                                                                                                                                                                                                                                                                     |
| [Release Ladder](product/release-ladder.md)                                                            | Pre-alpha / Engineering Milestones M1-M8 mapping of the v0.1-v1.0 maturity ladder to the 18-crate workspace and `Implemented`/`Verified` lifecycle (2026-09-08, `29772a3`).                                                                                                                                                                                                                                                                                                                                                |
| [Single-Window Vertical Slice Acceptance Plan](product/vertical-slice-acceptance.md)                   | Draft spec (CTX-0109) plus Experimental Implementation (CTX-0095 `c0aadd2` + CTX-0098 `a8735d0`, `Implemented` not `Verified`, PR #148/#151, bounded PTY reply loop, Kitty 7727 colon params): one process/window/workspace/terminal, end-to-end PTY/VT/state/render/input path, platform and PB-1..PB-7 expectations, and explicit exclusions; spec remains `Draft` until accepted.                                                                                                                                       |
| [TerminalRegistry and View Lifecycle Contract](specifications/terminal-registry-view-lifecycle-rfc.md) | Accepted spec (CTX-0117) plus Experimental Implementation (part of `c0aadd2`/`a8735d0`, `Implemented` not `Verified`, view-rect + DPI -> PTY resize, bounded `write_replies`): ownership of TerminalId vs ViewId separation, RuntimeId/PersistentId, generation, view attachment/detachment, focus, layout, visibility, persistence, reattachment vs recreation, bounded resources, and failure semantics with explicit multi-window and daemon exclusions; spec is `Accepted` (not `Verified`/`Compatible`) per CTX-0117. |
| [Workspace Compositor Specification](specifications/workspace-compositor.md)                           | Accepted spec (CTX-0118; experimental single-window slice shipped, live px decoration painting deferred to CTX-0294): Hyprland-inspired tiling compositor H/V `LayoutTree`, View types `Terminal`/`Rich`/`Browser`, Core-owned `gaps_in`/`gaps_out`/`border`/`radius`, `LayoutProvider` `dwindle`/`master`/`grid`, and drag/resize/move/scratchpad with deterministic layout, bounded resources, and `ViewId`/`TerminalId` separation; spec is `Accepted` (not `Verified`/`Compatible`) per CTX-0118.                      |
| [Panel Runtime and Event Bus Pre-Study](specifications/panel-runtime-pre-study.md)                     | Draft research pre-study (CTX-0119, `Draft` not `Accepted`/`Verified`, no experimental implementation): surveys Generic Panel Runtime and Event Bus as Panel Platform prerequisite — panel lifecycle, command registry, overlay, focus routing, event bus, and capability isolation — reconciled with TerminalRegistry/View `6f30c2f` and Workspace Compositor `c3a2928`; bounded PR-1..PR-12, typed failure, explicit exclusions; candidate only for future Panel RFC.                                                    |
| [Browser and Agent Panel Integration Pre-Study](specifications/browser-agent-pre-study.md)             | Draft research pre-study (CTX-0120, `Draft` not `Accepted`/`Verified`, no experimental implementation): surveys Browser WebView via Panel Runtime, MCP via Tool Bus, Agent memory, and capability isolation with first-party plugin matrix — reconciled with Panel Runtime `9032d1e` / requested `05e8803` and Project plugin `bitty-terminal.project`; bounded BA-1..BA-12, typed failure, explicit exclusions; candidate only for future Browser and Agent RFC.                                                          |

## User and contributor documentation

| Document                                                        | Purpose                                                                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [User guide](user-guide/README.md)                              | Honest Pre-alpha index for future installation, onboarding, daily-use, and troubleshooting guides (installation still deferred until `Verified`).                   |
| [Tutorials](tutorials/README.md)                                | Future verified end-to-end learning paths; currently an explicit empty state.                                                                                       |
| [How-to guides](how-to/README.md)                               | Future focused procedures for one supported task.                                                                                                                   |
| [Troubleshooting](troubleshooting/README.md)                    | Future verified diagnosis, recovery, and escalation guidance.                                                                                                       |
| [Migrations](migrations/README.md)                              | Future tested version transitions, rollback, and compatibility guidance.                                                                                            |
| [Examples](examples/README.md)                                  | Future minimal, versioned, mechanically verified illustrations.                                                                                                     |
| [Development](development/README.md)                            | Contributor entry point and current delivery expectations.                                                                                                          |
| [Documentation workflow](development/documentation-workflow.md) | Normative taxonomy, metadata, ownership, review, synchronization, deprecation, and versioning policy.                                                               |
| [Repository bootstrap](development/repository-bootstrap.md)     | Accepted zero-functionality Core and website scaffold contract plus implementation validation gates (18 crates `29772a3` now `Implemented` but not yet `Verified`). |
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

| Document                                   | Authority                                                                                                                                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Security overview](security/overview.md)  | Normative security contract and capability taxonomy (Pre-alpha, `Implemented` not yet `Verified`).                                                                                                        |
| [Threat model](security/threat-model.md)   | Normative trust boundaries, threats, and required controls (engineering milestones).                                                                                                                      |
| [Risk register](security/risk-register.md) | Security risks and evidence-based closure criteria (`R-005`/`R-006`/`R-007` `Mitigated` at `d4d75e9`, `R-004` `Open` at `7a4ee41`, others `Open` until `Verified`, matrix Phase E per Risk Evidence RFC). |

Security controls are not optional candidates merely because their exact
mechanisms or thresholds still need an RFC. The security corpus takes
precedence over source summaries and non-security design suggestions.

## Project and technology

| Document                                                        | Purpose                                                                                                                                                        |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Repository map](project/repository-map.md)                     | Local/remote topology, repository ownership, and current initialization state (18 crates `29772a3`, Website Delivery OQ-023 and Governance OQ-024 `Accepted`). |
| [Technology strategy](project/technology-strategy.md)           | Accepted language/platform direction and implementation choices (18 crates, `bitty-lua` `piccolo` 0.3.3 `Accepted`).                                           |
| [Reference projects](project/reference-projects.md)             | Untrusted, read-only research snapshots and study questions.                                                                                                   |
| [Website content contract](project/website-content-contract.md) | Normative ownership and validation boundary between `bitty-docs` and `bitty-website`.                                                                          |
| [Roadmap](roadmap/README.md)                                    | Evidence-based sequencing without unsupported date or release promises.                                                                                        |
| [Releases](releases/README.md)                                  | Future immutable release notes backed by published artifacts.                                                                                                  |

## Decisions, work, and provenance

| Document                                                                                             | Purpose                                                                                |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [Decision register](decisions/index.md)                                                              | Accepted directions, normative contracts, verified facts, and ADR/RFC queue.           |
| [Open-question register](decisions/open-questions.md)                                                | Unresolved choices with a canonical owner document and next artifact.                  |
| [Architecture decision records](decisions/adrs/README.md)                                            | Catalog and maintenance rules for durable accepted architecture decisions.             |
| [ADR 0001 - Repository Bootstrap Baseline](decisions/adrs/ADR-0001-repository-bootstrap-baseline.md) | Accepted minimal Core and website initialization boundary without product behavior.    |
| [Requests for comments](decisions/rfcs/README.md)                                                    | Reviewable proposals and final dispositions; currently an explicit empty state.        |
| [Findings](findings/README.md)                                                                       | Durable reviewed evidence; internal and excluded from website publication.             |
| [Shared-conversation coverage](sources/chatgpt-share-coverage.md)                                    | Traceability from both historical ChatGPT design conversations to canonical documents. |
| [Phase A TODO](../TODO.md)                                                                           | Pre-alpha status reconciliation and hardening work (2026-09-08, `29772a3`).            |

## Interpretation rules

Use the following lifecycle labels consistently
(`Draft -> Experimental Implementation -> Accepted -> Verified -> Compatible -> Release-ready`
spec, `Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`
crate):

| Label                                 | Meaning                                                                                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Normative requirement                 | A future implementation gate. Mechanism details may remain open.                                                                                                                                                                                                               |
| Accepted working direction            | Current project intent; record an ADR/RFC before freezing a public contract. All 32 OQs (OQ-001..032) are `Accepted` as of 2026-08-29.                                                                                                                                         |
| Candidate / Draft                     | A proposal to investigate, compare, or prototype. Spec remains `Draft` until reviewed `Accepted`; 7 `Draft` specs remain (see `specifications/README.md` prioritization).                                                                                                      |
| Experimental Implementation           | Code exists at `c0aadd2`/`7e3104d`/`a8735d0` (`Implemented` experimental, not `Verified`): single-window slice, PTY reply loop, dogfood plugins — reviewable evidence distinct from `Draft` (no code) and `Accepted`.                                                          |
| Open                                  | No decision has been made, or closure evidence is missing. Risks are `Open` until `Verified` (matrix `pending`); `R-004` remains `Open` at `7a4ee41`, `R-005`/`R-006`/`R-007` are `Mitigated` at `d4d75e9`.                                                                    |
| Implemented                           | Demonstrated by code, tests, or release evidence in the owning repository (`bitty` `29772a3`, 18 crates, compat-lab/perf hardening plus scrollbar overlay plus workspace/frameHash wave plus experimental `c0aadd2`/`7e3104d`/`a8735d0` `Implemented` but not yet `Verified`). |
| Verified / Compatible / Release-ready | Independent security-auditor and P0-AC evidence, compatibility matrix, and release train per Governance RFC. Not yet claimed; experimental code does not imply `Verified`.                                                                                                     |

At the 2026-09-08 snapshot (`29772a3`, baseline `de134ec` previous `c49ead1`),
some product behavior is `Implemented` (`vt`/`term-state`/`pty`/`render`/`ui`/`runtime`/`config`/`lua`/`rich`/`ipc`/`agent`/`package`/`compat-lab`/`perf` plus experimental
`c0aadd2`/`7e3104d`/`a8735d0`) but not yet `Verified`; repository existence, remote visibility, and initialization state remain project facts, and `Verified`
requires risk-evidence matrix. `R-004` clipboard was re-audited at `bitty` `7a4ee41`
(baseline `de134ec`) with `23` `suspicious_paste` + `13` `paste` unit + `4`
remediation tests and remains `Open` (not `Mitigated`/`Verified`) due to residual
platform-backend, real-window UX, and `8192`-byte bound-scope limits; `R-005`/`R-006`/`R-007`
at `bitty` `d4d75e9` (`5bdcdbd`/`0afc94d`/`d4d75e9`, Issues #137/#138/#139) are `Mitigated`
per RS-1..RS-7; experimental implementations `c0aadd2`/`7e3104d`/`a8735d0` are `Implemented` not
`Verified`/`Compatible`, overall product remains not `Verified`/`Compatible`/`Release-ready`.

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
