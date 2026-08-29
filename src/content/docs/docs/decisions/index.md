---
title: Decision register
description: Canonical register of accepted directions, normative contracts, verified facts, and candidate decisions
category: decisions
audience: maintainer
document_type: register
status: accepted
website_publish: true
sidebar_order: 10
---

# Decision register

## Purpose

This register separates accepted direction from candidate design and verified
project facts. It is a navigation layer, not a substitute for future ADRs or
RFCs. No row claims product implementation.

Status vocabulary follows the [documentation map](../README.md). Historical
provenance is recorded in the
[shared-conversation coverage](../sources/chatgpt-share-coverage.md), while
unresolved choices are tracked in the
[open-question register](open-questions.md).

## Accepted working directions

| ID      | Direction                                                                                                                                                                    | Basis                                                          | Canonical document                                                                                                       | Contract still needed                                                                                                                                                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DIR-001 | Keep a small terminal core and move optional behavior behind governed extension surfaces.                                                                                    | Product intent and maintained architecture                     | [Product vision](../product/vision.md); [core boundaries](../architecture/core-boundaries.md)                            | Accepted in [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (OQ-011/OQ-012/OQ-013)                                                                               |
| DIR-002 | Use Rust 2024 for the core implementation.                                                                                                                                   | Explicit project direction                                     | [Technology strategy](../project/technology-strategy.md)                                                                 | Toolchain maintenance policy; MSRV is accepted in [ADR 0003](adrs/ADR-0003-core-workspace-topology.md)                                                                           |
| DIR-003 | Use Lua for plugins and as the main configuration language.                                                                                                                  | Explicit user direction in source turns 3 and 15               | [Technology strategy](../project/technology-strategy.md); [Lua and XDG](../configuration/lua-and-xdg.md)                 | Accepted in [Configuration Model RFC](../specifications/configuration-model-rfc.md) (OQ-010) and [Lua Runtime RFC](../specifications/lua-runtime-rfc.md) (OQ-009)                |
| DIR-004 | Target Linux, macOS, Windows, and BSD without assuming identical support on day one.                                                                                         | Explicit product direction                                     | [Product vision](../product/vision.md); [technology strategy](../project/technology-strategy.md)                         | None; tiers and CI policy accepted in [ADR 0002](adrs/ADR-0002-platform-support-tiers.md)                                                                                        |
| DIR-005 | Keep AI/Agent functionality outside the terminal core as optional plugin or adapter integrations.                                                                            | Explicit boundary requested by the user                        | [Core boundaries](../architecture/core-boundaries.md)                                                                    | Integration/capability RFC                                                                                                                                                       |
| DIR-006 | Organize formal components as independent Git repositories under `github.com/bitty-terminal`; keep umbrella/grouping directories non-Git.                                    | Explicit organization direction and current workspace evidence | [Repository map](../project/repository-map.md)                                                                           | Cross-repository release policy                                                                                                                                                  |
| DIR-007 | Keep `bitty-docs` canonical and use an Astro-based `bitty-website` as the future presentation site.                                                                          | Explicit repository direction                                  | [Repository map](../project/repository-map.md)                                                                           | Docs-to-site sync/versioning ADR                                                                                                                                                 |
| DIR-008 | Give SDK, template, and future first-party plugins independent repository/lifecycle boundaries.                                                                              | Explicit plugin repository direction                           | [Repository map](../project/repository-map.md)                                                                           | Ownership and compatibility policy                                                                                                                                               |
| DIR-009 | Use CarryCtx and subagent-oriented delivery, with scoped work and durable progress/checkpoints.                                                                              | Explicit project workflow direction                            | [Repository map](../project/repository-map.md)                                                                           | Per-repository initialization after first commit                                                                                                                                 |
| DIR-010 | Use English as the only canonical documentation language for the current corpus; defer i18n, translation, and locale routing.                                                | Explicit documentation-foundation direction                    | [Decision register](index.md)                                                                                            | Future localization ADR if this is reopened                                                                                                                                      |
| DIR-011 | Treat validated `bitty-docs` Markdown and its metadata as the canonical content source for the future website; no sync exists yet.                                           | Explicit documentation-foundation direction                    | [Website content contract](../project/website-content-contract.md); [open questions](open-questions.md)                  | Publishing mechanism and routing ADR                                                                                                                                             |
| DIR-012 | Bootstrap Core as a dependency-free two-package Rust 2024 workspace and the website as an Astro/Bun Workers Static Assets shell without product behavior or a docs consumer. | [ADR 0001](adrs/ADR-0001-repository-bootstrap-baseline.md)     | [Technology strategy](../project/technology-strategy.md); [repository bootstrap](../development/repository-bootstrap.md) | Website content mechanisms; crate graph and dependencies accepted in [ADR 0003](adrs/ADR-0003-core-workspace-topology.md) and [ADR 0004](adrs/ADR-0004-upstream-dependencies.md) |

“Accepted working direction” means the project may plan against the direction;
it does not freeze public API details or prove implementation.

## Accepted foundation artifacts

The following reviewed artifacts were accepted on 2026-08-26, 2026-08-27, 2026-08-28, and 2026-08-29 by the
project initiator. Each closes the open-question entry it names; acceptance
records a reviewed contract, not implementation evidence:

| Artifact                                                                                                                | Closes                                 | Status   |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------- |
| [Performance Budget RFC](../specifications/performance-budget-rfc.md)                                                   | OQ-001                                 | Accepted |
| [ADR 0002 - Platform Support Tiers](adrs/ADR-0002-platform-support-tiers.md)                                            | OQ-003                                 | Accepted |
| [Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md)                                         | OQ-004                                 | Accepted |
| [ADR 0003 - Core Workspace Topology](adrs/ADR-0003-core-workspace-topology.md)                                          | OQ-005                                 | Accepted |
| [ADR 0004 - Upstream Dependency Set](adrs/ADR-0004-upstream-dependencies.md)                                            | OQ-006                                 | Accepted |
| [Terminal State RFC](../specifications/terminal-state-rfc.md)                                                           | OQ-007                                 | Accepted |
| [Configuration Model RFC](../specifications/configuration-model-rfc.md)                                                 | OQ-010                                 | Accepted |
| [Plugin Platform RFC](../specifications/plugin-platform-rfc.md)                                                         | OQ-011, OQ-012, OQ-013                 | Accepted |
| [Package Lifecycle RFC](../specifications/package-lifecycle-rfc.md)                                                     | OQ-021                                 | Accepted |
| [Lua Runtime RFC](../specifications/lua-runtime-rfc.md)                                                                 | OQ-009                                 | Accepted |
| [Rich Presentation RFC](../specifications/rich-presentation-rfc.md)                                                     | OQ-008, OQ-015, OQ-016                 | Accepted |
| [Isolation Resource RFC](../specifications/isolation-resource-rfc.md)                                                   | OQ-014                                 | Accepted |
| [CLI Contract RFC](../specifications/cli-contract-rfc.md)                                                               | OQ-017                                 | Accepted |
| [Package Follow-up RFC](../specifications/package-followup-rfc.md)                                                      | OQ-022, OQ-026, OQ-027, OQ-028, OQ-029 | Accepted |
| [DevTools RFC](../specifications/devtools-rfc.md)                                                                       | OQ-019                                 | Accepted |
| [Default Distribution RFC](../specifications/default-distribution-rfc.md)                                               | OQ-002                                 | Accepted |
| [IPC and Agent RFC](../specifications/ipc-agent-rfc.md)                                                                 | OQ-018                                 | Accepted |
| [Governance RFC](../specifications/governance-rfc.md)                                                                   | OQ-024                                 | Accepted |
| [Website Delivery RFC](../specifications/website-delivery-rfc.md)                                                       | OQ-023                                 | Accepted |
| [Risk Evidence RFC](../specifications/risk-evidence-rfc.md)                                                             | OQ-025                                 | Accepted |
| [ADR 0005 - Lua Pins, Upgrade Cadence, Stdlib Allowlist and Unsafe-Surface Audit](adrs/ADR-0005-lua-pins-and-stdlib.md) | OQ-030                                 | Accepted |
| [ADR 0006 - os.getenv Exposure and Bitty Module Policy](adrs/ADR-0006-os-env-policy.md)                                 | OQ-031                                 | Accepted |
| [ADR 0007 - Async/Send Boundary and GC Tuning for Lua VMs](adrs/ADR-0007-async-gc.md)                                   | OQ-032                                 | Accepted |

## Normative pre-implementation contracts

| Contract                                                                                                    | Authority                                                                          | Status                                                                               |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Trust boundaries, capability families, fail-closed behavior, isolation, budgets, and safe-mode expectations | [Security overview](../security/overview.md)                                       | Normative P0 gates; not implemented                                                  |
| Threats and required controls for PTY, plugins, configuration, IPC/MCP, DevTools, packages, and resources   | [Threat model](../security/threat-model.md)                                        | Normative P0 gates; not implemented                                                  |
| Terminal Truth and restrictions on extension ownership of raw terminal state                                | [Core boundaries](../architecture/core-boundaries.md), under the security contract | Normative boundary; API mechanism open                                               |
| Security risk closure                                                                                       | [Risk register](../security/risk-register.md)                                      | Open until cited evidence satisfies each exit condition                              |
| Testable given/when/then criteria for every normative P0 control, with verification methods and thresholds  | [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md)           | Normative test contract; criteria unsatisfied until evidence records passing results |

An RFC may select a mechanism or threshold for a normative control; it may not
silently downgrade the control to an optional candidate.

## Verified project facts

These facts are observations of repository state, not architecture decisions or
product implementation evidence:

- Seven public remote repositories currently exist under
  [`bitty-terminal`](https://github.com/bitty-terminal): `bitty`, `bitty-docs`,
  `bitty-website`, `bitty-devtools`, `bitty-mcp`, `bitty-plugin-sdk`, and
  `bitty-plugin-template`.
- At the time of the repository inventory, those remotes had no commits.
- The local umbrella root and `bitty-plugins/` are routing/grouping directories,
  not Git repositories. SDK and template children are independent repositories.

Current topology and observation dates belong in the
[repository map](../project/repository-map.md); re-verify drift-prone remote
facts before relying on them operationally.

## Candidate decision queue

The following proposals have not been accepted merely because they appeared in
the historical conversation:

- Plugin API v1, capability/manifest model, and event phases. (Accepted:
  [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) — Plugin API
  v1, capability/manifest model, and event pipeline for OQ-011/OQ-012/OQ-013;
  UI/scene primitives and hot-reload mechanics remain follow-up work.)
- Rich blocks, semantic zones, structured transports, and TUI transformation. (Accepted: [Rich presentation RFC](../specifications/rich-presentation-rfc.md) — image/rich-block/scene/zone and structured transport for [OQ-008](open-questions.md)/[OQ-015](open-questions.md)/[OQ-016](open-questions.md); frontmatter `accepted` on 2026-08-28.)
- Unified action registry, CLI grammar, IPC contract, and MCP/DevTools protocol. (Accepted: [CLI Contract RFC](../specifications/cli-contract-rfc.md) — top-level commands, dynamic `bitty x` namespace, action and output schemas, aliases, and exit codes 0 through 8 for [OQ-017](open-questions.md); frontmatter `accepted` on 2026-08-28.)
- Package manifest/lock formats, resolver, registry, and update UX.
  (Accepted: [Package lifecycle RFC](../specifications/package-lifecycle-rfc.md)
  — lifecycle and integrity model for OQ-021; Draft:
  [Package Follow-up RFC](../specifications/package-followup-rfc.md) —
  resolver (OQ-026), version lifecycle (OQ-027), registry (OQ-028), and key
  directory (OQ-029), pending category-owner, docs-curator, and security
  review.)
- Headless daemon, detach/reattach, and remote UI architecture. (Accepted: [ADR 0008](adrs/ADR-0008-headless.md) — deferred to post-v1.0, headless-runtime/daemon/remote taxonomy, session-grained detach/reattach, bounded persistence, contained failure, and trust-boundary analysis gate for [OQ-020](open-questions.md); frontmatter `accepted` on 2026-08-28.)
- Isolation resource ceilings and failure semantics. (Accepted: [Isolation Resource RFC](../specifications/isolation-resource-rfc.md) — accepted 2026-08-28 for OQ-014, `Accepted` with frontmatter `accepted`; isolation domains IR-D1..D3, resource ceilings RC-1..RC-10 (three-level queue PerSub 64 / PerPlugin 1024 events/256 KiB / Global 8192 events/2 MiB hard-gated, RC-1 10^7/50 ms/8 ms, RC-2 32 MiB), failure semantics FS-1..FS-9, and adversarial AT-IR-001..015; measurement evidence 2026-08-27 via bitty CTX-0037 PR #68 (17/21 headless `measurement.rs`, 15 headless `measurement_lua.rs` @ `d67a65b`, worktree `ctx-0040/feat-lua-vm-budgets`, gates `just check` + `cargo check --target x86_64-pc-windows-gnu` pass) as reviewed evidence; lifecycle `Draft -> experimental review evidence -> Accepted (2026-08-28) -> normative`.)
- Local instance selection, IPC/MCP transport, framing, scopes, and Agent bounded messages. (Accepted: [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) — bounded 256 KiB framing, versioned wire, peer-credential auth, scope families, rate limits RC-9/RC-10, Agent bounded messages, consent and streaming for [OQ-018](open-questions.md); frontmatter `accepted` on 2026-08-29.)
- Lua pins, upgrade cadence, stdlib allowlist and unsafe-surface audit. (Accepted: [ADR 0005](adrs/ADR-0005-lua-pins-and-stdlib.md) — exact Lua 5.4.x, mlua, piccolo 0.3.3 pins, vendored verification, allowlist, and unsafe-surface audit gates for [OQ-030](open-questions.md); frontmatter `accepted` on 2026-08-29.)
- os.getenv exposure, desensitization, and bitty module policy. (Accepted: [ADR 0006](adrs/ADR-0006-os-env-policy.md) — os.getenv denial, desensitized bitty.env.get with capability-gated allowlist, audit logging, and migration for [OQ-031](open-questions.md); frontmatter `accepted` on 2026-08-29.)
- Async/Send boundary, GC tuning, Config VM budget charging, and reload/module-cache interaction. (Accepted: [ADR 0007](adrs/ADR-0007-async-gc.md) — `Send`/`Sync` boundary (mlua vs piccolo, tasks 64/timers 32), GC tuning (incremental pause/step, budget), Config VM charging against PB-1 and PB-2, and per-VM module-cache reload interaction for [OQ-032](open-questions.md); frontmatter `accepted` on 2026-08-29.)
- DevTools instrumentation, event pipeline, and debug protocol for the plugin
  runtime. (Accepted: [DevTools RFC](../specifications/devtools-rfc.md) —
  instrumentation, observability event pipeline, and versioned debug protocol with
  `debug.inspect`/`trace`/`control` scopes for [OQ-019](open-questions.md); frontmatter `accepted` on 2026-08-28.)
- Default distribution, bundled-plugin set, and disable mechanism. (Accepted: [Default Distribution RFC](../specifications/default-distribution-rfc.md) — bundled-disabled-by-default distribution, empty v1 enabled set, five disable surfaces (config, managed manifest, CLI, profile, `--safe`) and promotion criteria for [OQ-002](open-questions.md); frontmatter `accepted` on 2026-08-29.)
- Repository governance: licenses, branch protections, ownership, compatibility policy, and cross-repository release flow. (Accepted: [Governance RFC](../specifications/governance-rfc.md) — MIT license, squash-only `main` with required checks and CODEOWNERS, semver with MSRV 1.85 and Tier 1 platform policy, and dependency-ordered release train with `Docs-PR`/`Code-PR` trailers for [OQ-024](open-questions.md); frontmatter `accepted` on 2026-08-29.)
- Website delivery: loader, synchronization, release selector, multi-version URL scheme, route mapping, and redirect manifest. (Accepted: [Website Delivery RFC](../specifications/website-delivery-rfc.md) — Astro content-collection loader with eight-field schema and `title == H1` check, pinned `src/content/docs-revision.json` with `sync:docs --pin` copy and stale-mirror rejection, `src/content/versions.json` selector with `latest`/`stable` aliases, `/docs/<version>/<path>/` multi-version scheme with per-version `dist` isolation and 301 canonical redirects, deterministic `docs/<category>/<file>.md -> /docs/<version>/<category>/<slug>/` mapping with collision gate, and split redirect manifest `docs/project/redirects.json` intent plus `src/redirects.json` implementation for [OQ-023](open-questions.md); frontmatter `accepted` on 2026-08-29.)
- Risk evidence and P0 closure. (Accepted: [Risk Evidence RFC](../specifications/risk-evidence-rfc.md) —
  risk-to-P0-AC traceability, evidence taxonomy, artifact storage, and
  review gates for closing risks without weakening controls for
  [OQ-025](open-questions.md); frontmatter `accepted` on 2026-08-29.)

Each candidate is represented by an item in the
[open-question register](open-questions.md). Acceptance requires an ADR, RFC,
or other reviewable artifact named there.
