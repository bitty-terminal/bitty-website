---
title: Repository and Local Workspace Map
description: Records the accepted polyrepo topology, current repository initialization state, planned responsibilities, and local routing rules.
category: project
audience: contributor
document_type: reference
status: draft
website_publish: false
sidebar_order: 91
---

# Repository and Local Workspace Map

## Topology principles

Bitty has accepted an organization-level polyrepo. ADR 0001 accepts a minimal
Core Cargo workspace for initialization; the expanded crate graph is now
**Pre-alpha / M1 Hardening** at 16 crates (`be3bdb4`) with lifecycle
`Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`
(see Status below):

- The top-level `bitty-terminal/` directory is a local umbrella workspace, not
  a Git repository.
- Product repositories are independent. Run Git and CarryCtx commands inside
  the target child repository.
- The `bitty/` workspace is spine-complete (sixteen members in
  `bitty/Cargo.toml` as of 2026-08-29 `be3bdb4`): `bitty-vt`, `bitty-term-state`,
  `bitty-pty`, `bitty-platform`, `bitty-config`, `bitty-render`, `bitty-ui`,
  `bitty-plugin-host`, `bitty-runtime`, `bitty-package`, `bitty-lua`,
  `bitty-rich`, `bitty-ipc`, `bitty-agent`, plus `bitty-app` and the retained
  `bitty-core` seed. The accepted ten-crate topology is fixed in
  [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md);
  `bitty-package` lifecycle and integrity model is accepted
  ([Package Lifecycle RFC](../specifications/package-lifecycle-rfc.md), OQ-021,
  2026-08-27) with real signature verification remaining draft per crate docs,
  and the tail crates (`bitty-rich` OQ-008/015/016, `bitty-ipc`/`bitty-agent`
  OQ-018, `bitty-lua` OQ-009/030-032) are `Implemented` (headless tests ~808)
  but not yet `Verified`; `Website Delivery` (OQ-023) and `Governance` (OQ-024)
  are `Accepted` 2026-08-29.
- `bitty-plugins/` is only a local grouping directory, not a Git repository.
  Each child directory will be an independent plugin repository.
- Documentation belongs to `bitty-docs`. A future website consumer must use
  validated canonical Markdown rather than maintain duplicate specifications;
  no consumer exists yet.

Directory existence, completed Git initialization, and completed remote creation
are three distinct states. This document defines target boundaries and does not
describe an empty directory as an initialized repository.

## Local workspace

```text
bitty-terminal/                     # local umbrella, not a Git repo
├── .agents/                        # workspace-level agent skills/instructions
├── .trash/                         # recoverable removal target
├── tmp/
│   └── references/                 # persistent local research clones
├── AGENTS.md                       # cross-repository operating contract
│
├── bitty/                          # independent repo: Rust core workspace
├── bitty-docs/                     # independent repo: canonical knowledge
├── bitty-website/                  # independent repo: Astro public website
├── bitty-devtools/                 # independent repo: debug UI/client
├── bitty-mcp/                      # independent repo: MCP adapter
│
└── bitty-plugins/                  # local grouping only, never parent Git repo
    ├── bitty-plugin-sdk/           # independent repo
    ├── bitty-plugin-template/      # independent repo
    └── <plugin-name>/              # one independent repo per plugin
```

`tmp/` is inside the workspace and holds temporary material that must survive
restarts. Do not place project research assets in the system `/tmp`. Prefer
moving deleted or retired files into `.trash/`, where a human can review them
before final cleanup.

## Current initialization state

As of 2026-08-26, all seven public remotes under `github.com/bitty-terminal`
have been pushed with an initial snapshot commit, and each repository's
`main` branch is protected on GitHub: squash-only merging with required status
checks matching that repository's CI job names.

| Local directory                        | Public remote                                             | Current state                                           | Required `main` status checks                    |
| -------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| `bitty/`                               | `https://github.com/bitty-terminal/bitty`                 | Initial snapshot pushed; `main` protected (squash-only) | `Quality gates`                                  |
| `bitty-docs/`                          | `https://github.com/bitty-terminal/bitty-docs`            | Initial snapshot pushed; `main` protected (squash-only) | `Docs quality`                                   |
| `bitty-website/`                       | `https://github.com/bitty-terminal/bitty-website`         | Initial snapshot pushed; `main` protected (squash-only) | `Website quality`                                |
| `bitty-devtools/`                      | `https://github.com/bitty-terminal/bitty-devtools`        | Initial snapshot pushed; `main` protected (squash-only) | `Lint GitHub Actions workflows`, `Quality gates` |
| `bitty-mcp/`                           | `https://github.com/bitty-terminal/bitty-mcp`             | Initial snapshot pushed; `main` protected (squash-only) | `Lint GitHub Actions workflows`, `Quality gates` |
| `bitty-plugins/bitty-plugin-sdk/`      | `https://github.com/bitty-terminal/bitty-plugin-sdk`      | Initial snapshot pushed; `main` protected (squash-only) | `Actionlint`, `Quality gates`                    |
| `bitty-plugins/bitty-plugin-template/` | `https://github.com/bitty-terminal/bitty-plugin-template` | Initial snapshot pushed; `main` protected (squash-only) | `Lint GitHub Actions workflows`, `Quality gates` |

Neither the umbrella root nor `bitty-plugins/` is initialized as a Git
repository. This is an intentional routing and grouping boundary, not an
omission.

## Repository responsibilities

| Repository or directory | Planned responsibility                                                                 | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bitty`                 | Rust runtime and application                                                           | Spine-complete workspace (sixteen members) accepted in ADR 0003 for ten crates plus `bitty-package` lifecycle/integrity model accepted (OQ-021, 2026-08-27) plus `bitty-lua` (OQ-009/030-032) and tail crates `bitty-rich` (OQ-008/015/016), `bitty-ipc`/`bitty-agent` (OQ-018) `Implemented` at `be3bdb4` (soak ~808 headless tests) but not yet `Verified`; signatures still draft; Plugin API `Accepted` via Plugin Platform RFC; debug protocol `Accepted` via DevTools RFC |
| `bitty-docs`            | Vision, requirements, architecture, ADRs, RFCs, roadmap, and research                  | Accepted authoritative documentation repository                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `bitty-website`         | Astro static shell and future presentation consumer of canonical `bitty-docs` Markdown | Astro, Bun, and Workers Static Assets bootstrap accepted; loader, synchronization, version selection, routes, and redirect manifest `Accepted` via Website Delivery RFC (OQ-023, 2026-08-29); theme/search remain open                                                                                                                                                                                                                                                          |
| `bitty-devtools`        | Human debugging client                                                                 | Repository created; debug-protocol model is a candidate                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `bitty-mcp`             | Agent and MCP adapter                                                                  | Repository created; internal-protocol boundary is a candidate                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `bitty-plugin-sdk`      | Lua helpers, LuaLS types, mock host, and test tools                                    | Independent repository accepted; exact responsibilities are candidates                                                                                                                                                                                                                                                                                                                                                                                                          |
| `bitty-plugin-template` | Plugin scaffold, CI, and manifest examples                                             | Independent repository accepted; format is a candidate                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Each plugin repository  | One optional user experience or integration                                            | Independent-repository model accepted; public API constraints are candidates                                                                                                                                                                                                                                                                                                                                                                                                    |

## Accepted repository bootstrap baseline

[ADR 0001](../decisions/adrs/ADR-0001-repository-bootstrap-baseline.md)
accepts only the following initialization boundaries:

- `bitty` starts as a Rust 2024 Cargo workspace using resolver 3, stable Rust
  with `rustfmt` and `clippy`, a non-publishable `bitty-core` library, a
  non-publishable `bitty-app` binary, empty dependency tables, `just`, and
  read-only format/Clippy/test/`actionlint` CI.
- `bitty-website` starts as an Astro static shell managed by Bun. It builds to
  `dist` and uses Cloudflare Workers Static Assets with no Astro Cloudflare
  adapter and no Worker script.
- The website deployment workflow references only
  `secrets.CLOUDFLARE_API_TOKEN` and
  `secrets.CLOUDFLARE_ACCOUNT_ID`. It never stores or reads their values in this
  documentation repository.
- `CRATES_TOKEN` remains unused until a future decision explicitly authorizes
  crates.io publication.

Neither scaffold is implemented by the ADR or this map. Exact package, action,
and tool versions plus lockfiles are fixed and verified by later
repository-scoped implementation tasks. See the
[repository bootstrap guide](../development/repository-bootstrap.md).

## Workspace structure (Pre-alpha / M1 Hardening, 16 crates `be3bdb4`)

The workspace is spine-complete as of 2026-08-29 (`be3bdb4`). The accepted
topology is
[ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md); the
structure below is what `bitty/Cargo.toml` currently resolves to. Presence is
`Implemented` (soak ~808 headless tests) but only `Verified` after P0-AC
evidence; lifecycle is
`Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`
per the
[risk evidence RFC](../specifications/risk-evidence-rfc.md). Presence does
not imply `Verified`: `bitty-package` lifecycle and integrity model is
`Accepted` (OQ-021, 2026-08-27) with signatures still draft, `bitty-lua`
accepted (OQ-009/030-032, 2026-08-29), and `bitty-rich`/`bitty-ipc`/`bitty-agent`
are `Implemented` (headless `Implemented`, not yet `Verified`):

```text
bitty/
├── Cargo.toml            # sixteen members, edition 2024, resolver 3, rust-version 1.85
├── Cargo.lock
├── rust-toolchain.toml   # channel 1.97.1, components rustfmt+clippy
├── justfile
├── crates/
│   ├── bitty-agent/       # Implemented: bounded Agent messages/side queue (std-only)
│   ├── bitty-app/         # binary: runtime+platform composition root
│   ├── bitty-config/      # typed ConfigPlan, validation, migration (std-only)
│   ├── bitty-core/        # seed to be retired
│   ├── bitty-ipc/         # Implemented: bounded framing/channels/stdio stub (std-only)
│   ├── bitty-lua/         # Implemented: piccolo 0.3.3 deterministic VM budgets RC-1/RC-2
│   ├── bitty-package/     # lifecycle/integrity accepted (OQ-021, 2026-08-27); signatures draft (std-only)
│   ├── bitty-platform/    # winit 0.30, raw-window-handle =0.6.2
│   ├── bitty-plugin-host/ # registry/capability/lifecycle (+ bitty-package edge)
│   ├── bitty-pty/         # portable-pty 0.9 wrapper
│   ├── bitty-rich/        # Implemented: rich presentation helpers (vt+term-state)
│   ├── bitty-vt/          # vte 0.15 parser -> TerminalAction
│   ├── bitty-term-state/  # Terminal Truth + damage + image store
│   ├── bitty-render/      # wgpu 25.0, crossfont 0.9, snapshot-only
│   ├── bitty-runtime/     # orchestration (vt/term-state/pty/render/platform/ui/plugin-host)
│   └── bitty-ui/          # view/layout/focus/selection primitives
├── runtime/
│   ├── lua/
│   ├── terminfo/
│   └── assets/
├── tests/
├── benches/
├── fuzz/
└── tools/xtask/
```

The earlier candidate expansion list that included `bitty-terminal`,
`bitty-input`, `bitty-font`, `bitty-image`, `bitty-lua`,
`bitty-plugin-api`, `bitty-debug-protocol`, and `bitty-test-support` was the
discussion sketch before ADR 0003; those names are not crates today.
Crate boundaries still follow architecture boundaries, not source-file
boundaries. `Cell`, `Grid`, and `Cursor` remain internal modules of
`bitty-term-state` rather than many small crates.

## Plugin repository model

Every official and community plugin uses an independent Git repository as its
distribution unit. First-party plugins must also dogfood the public API.

Candidate plugin-repository structure:

```text
bitty-tabs/
├── bitty-plugin.toml
├── README.md
├── LICENSE
├── lua/
│   └── bitty-tabs/
│       └── init.lua
├── tests/
└── .github/workflows/ci.yml
```

TOML is the candidate plugin-manifest format because the host must complete
discovery, version, dependency, capability, and lazy-trigger checks before
executing Lua. The accepted use of Lua for primary configuration does not
conflict with the candidate use of TOML for plugin metadata.

## Documentation and website publishing relationship

```text
bitty-docs validated canonical Markdown (16 crates, 32 OQs Accepted)
                 |
                 | pinned consumption via Website Delivery RFC OQ-023
                 | (sync:docs --pin, src/content/docs-revision.json)
                 v
bitty-website presentation and publishing (loader accepted)
```

The accepted boundary makes `bitty-docs` the canonical content owner and
`bitty-website` its presentation consumer with an accepted loader
([Website Delivery RFC](../specifications/website-delivery-rfc.md), OQ-023,
2026-08-29, `Governance RFC` OQ-024 for branch protections and release train).
ADR 0001 accepts the Astro static shell, Bun, and Cloudflare Workers Static
Assets deployment. Public-route mapping and redirects are accepted per OQ-023;
theme, search, and whether to use Starlight remain open website-repository
decisions.

Cross-repository architecture changes cannot be committed atomically, so code
and documentation pull requests should link to each other. Before implementation
begins, the project should define shared fields such as `Docs-PR`, `Code-PR`,
and associated ADR or RFC numbers.

## CarryCtx routing

CarryCtx stores state per Git repository; no implicit umbrella-wide shared
database exists. Therefore:

- Before modifying `bitty-docs`, enter `bitty-docs/` and use that repository's
  `.carryctx`.
- Before modifying `bitty` or a plugin, enter the corresponding initialized
  Git repository.
- Split cross-repository work into explicit tasks and record dependencies or
  external links between them.
- The non-Git `bitty-plugins/` grouping directory cannot be a CarryCtx project
  root.

## Pending decisions (M1 Hardening)

- Creation order for later official plugin repositories; seven repositories are
  already public with protected `main` branches; licenses accepted as MIT per
  Governance RFC OQ-024 (2026-08-29).
- Verification of `bitty-package` (lifecycle accepted, signatures draft) and
  the implemented tail crates (`bitty-rich` OQ-008/015/016, `bitty-ipc`/
  `bitty-agent` OQ-018, `bitty-lua` OQ-009/030-032 at `be3bdb4` soak ~808
  headless tests) from `Implemented` to `Verified` per risk evidence RFC
  OQ-025 (evidence matrix pending), plus successor topology ADR when needed,
  release profiles, package publication, and release automation beyond ADR 0003.
- The concrete theme/search approach for the website (loader, sync pin,
  version selection, routes, redirects accepted per OQ-023).
- Whether `bitty-devtools` and `bitty-mcp` begin implementation before the
  Core milestone (debug protocol accepted per DevTools RFC OQ-019).
- The first set of official plugin repositories and their ownership.
- The cross-repository release train, compatibility matrix, and change
  announcement process (train accepted per Governance RFC OQ-024,
  `Docs-PR`/`Code-PR` ordering).
- When a plugin registry becomes necessary; Git repositories are sufficient by
  default for the first phase.

See the [Reference Project Register](reference-projects.md) for reproducible
reference snapshots.
