---
title: Governance RFC
description: Defines the accepted licenses, branch protections, ownership rules, compatibility policy, and cross-repository release flow for OQ-024
category: specifications
audience: maintainer
document_type: specification
status: accepted
website_publish: true
sidebar_order: 21
---

# Governance RFC

> Status: **accepted** on 2026-08-29 by the project initiator. This document defines the accepted repository-governance contract: licenses, branch protections, ownership
> rules, compatibility policy, and cross-repository release flow for the
> seven formal repositories under `github.com/bitty-terminal` at the design level; it closes [OQ-024](../decisions/open-questions.md). It does not
> describe implemented governance beyond the branch protections already
> visible on `main`, does not authorize published releases, and does not
> weaken any normative security control. Experimental repository state may exist as review evidence
> but carries no stability promise beyond the accepted contract. Acceptance was per independent category-owner, docs-curator, and
> security-auditor review (CTX-0077) with P0 sign-off on 2026-08-29; see [P0 Review Sign-off](#p0-review-sign-off) and the
> [P0 review checklist](../reviews/p0-review-checklist.md). The lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## Purpose and scope

[OQ-024](../decisions/open-questions.md) asks: _what licenses, branch
protections, ownership rules, compatibility policy, and cross-repository
release flow apply?_ Its canonical document today is the
[Repository map](../project/repository-map.md), which records the accepted
polyrepo topology and the current initialization state (seven public
remotes with protected `main`) but leaves licenses undecided and the
release and compatibility policies as pending decisions. This RFC answers
OQ-024 at the governance-mechanism level without inventing product code
or claiming shipped releases.

In scope:

- license selection and file placement for each formal repository and for
  plugin-template consumers;
- branch protection settings for `main` on GitHub and the local
  branch and worktree naming contract;
- ownership rules: organization and team layout, CODEOWNERS, review and
  merge authority, and decision ownership for ADRs and RFCs;
- compatibility policy: versioning, MSRV, platform tiers, deprecation,
  and change-announcement obligations;
- cross-repository release flow: train coordination, pinning, evidence,
  and publication gates across the seven repositories and future
  first-party plugin repositories.

Out of scope (owned elsewhere):

- product/performance budgets (OQ-001,
  [Performance Budget RFC](performance-budget-rfc.md));
- platform support tiers and CI guarantees beyond reuse of the accepted
  tiers (OQ-003, [ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md));
- crate topology and dependency pins (OQ-005/OQ-006,
  [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) and
  [ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md));
- terminal state and action invariants (OQ-007,
  [Terminal State RFC](terminal-state-rfc.md));
- website loader, synchronization, route mapping, and redirect manifest
  (OQ-023, [Website content contract](../project/website-content-contract.md));
- implementation and test evidence per risk (OQ-025,
  [Risk register](../security/risk-register.md)).

This RFC introduces no new trust boundary. Every transition into a
privileged operation stays behind the capability, scope, and review
gates already normative in the security corpus.

## Normative sources this specification must not weaken

- [Security overview](../security/overview.md): default posture
  (all external input untrusted until a narrow grant), invariants 2
  through 10, trust-boundary table, and the rule that deferral to P1/P2
  must not create a P0 bypass.
- [Threat model](../security/threat-model.md): supply-chain lane
  (T-12 / R-015), dependency governance (R-019), and the
  IPC and packaging boundaries that branch protection and license checks
  must preserve.
- [Risk register](../security/risk-register.md): R-015 (supply-chain
  integrity), R-019 (dependency governance), and R-022 (distribution
  integrity) as they touch publication and provenance.
- [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md):
  advisory, source, license, and banned-dependency checks (P0-AC-033
  family) and safe-mode independence.
- [Decision register](../decisions/index.md): candidate versus accepted
  queue and the DIR-006 through DIR-012 directions that fix the
  workspace model and English-only corpus.
- [Documentation workflow](../development/documentation-workflow.md):
  change-trigger matrix that makes repository, CI, delivery, ownership,
  and release-process changes require review of project governance,
  development guidance, `AGENTS.md` and rules, and the website contract
  where publishing changes.
- [Repository map](../project/repository-map.md): accepted polyrepo
  topology, current initialization state, and the bootstrap baseline
  accepted in [ADR 0001](../decisions/adrs/ADR-0001-repository-bootstrap-baseline.md).
- [Architecture overview](../architecture/overview.md) and
  [Core and Plugin Boundaries](../architecture/core-boundaries.md):
  repository-per-component ownership remains candidate outside ADR 0003;
  this RFC does not move crate ownership.

Where this RFC picks concrete defaults, it refines the candidate material
above; it does not move a requirement between owners or relax a gate.
If a mechanism here weakens a normative control, the normative text wins
and this RFC must be corrected.

## Terminology

| Term                  | Accepted meaning                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Formal repository     | One of the seven repositories under `github.com/bitty-terminal`: `bitty`, `bitty-docs`, `bitty-website`, `bitty-devtools`, `bitty-mcp`, `bitty-plugin-sdk`, `bitty-plugin-template`. |
| Grouping directory    | A local path that only groups repositories, never a Git repository itself: the umbrella root and `bitty-plugins/` grouping.                                                          |
| Protected branch      | A GitHub branch with settings that require pull requests, status checks, and reviews before merge.                                                                                   |
| CODEOWNERS            | The GitHub file that maps paths to owning teams or users for automatic review requests.                                                                                              |
| Compatibility promise | The documented guarantee about breaking versus additive changes across a version range, including deprecation period and migration guidance.                                         |
| Release train         | The coordinated sequencing of releases across the seven repositories and future first-party plugins that keeps cross-repository changes atomic in evidence.                          |
| Pin                   | An exact committed version or revision (tag, `Cargo.lock` entry, `bun.lock` entry, action SHA) that makes a build reproducible.                                                      |

## Accepted summary

1. **Single license.** Every formal repository carries MIT
   (`SPDX-License-Identifier: MIT`) as its sole license in v1. The file
   `LICENSE` at the repository root is the authoritative text; no
   per-file header is required and no copyleft dependency is admissible
   in any shipped binary per ADR 0004. Plugin-template consumers inherit
   MIT but may add a second license only through a reviewed ADR.
2. **Uniform branch protection.** `main` is protected on every formal
   repository: squash-only merging, required pull request, required
   status checks matching that repository's CI job names, required
   conversation resolution, blocked force pushes, and CodeQL `actions`
   queries in CI. Branch names follow `ctx-XXXX/<type>-<short-slug>`.
3. **Explicit ownership.** A GitHub organization team owns each
   repository, a CODEOWNERS file owns paths, and ADRs and RFCs own
   decisions. No repository accepts an anonymous merge and no bypass
   merges through an admin flag.
4. **Semver with a governed MSRV and tier-aware compatibility policy.**
   Releases use Semantic Versioning 2.0.0, MSRV is pinned per
   `rust-toolchain.toml` (today 1.85 per ADR 0003), Tier 1 platform
   coverage is required per ADR 0002, and breaking changes require a
   major bump, a deprecation window of at least one minor, and migration
   notes. Additive changes remain compatible within a major.
5. **Atomic cross-repository release flow.** Cross-cutting work is split
   into explicit per-repository CarryCtx tasks linked by `Docs-PR` and
   `Code-PR` trailers, released through a short train that validates
   pins, `just check` / `cargo` gates, CodeQL, and `gitleaks` before any
   publish, and consumed by `bitty-website` only from a pinned
   `bitty-docs` revision.

## Licenses (accepted)

### Governing choice

Accepted v1 license for every formal repository:
**MIT** (`https://opensource.org/licenses/MIT`).

Rationale:

- matches the existing `LICENSE` already present in `bitty-docs` (MIT
  2026 The Bitty Terminal Contributors);
- compatible with every Rust dependency in the allowlist (MIT,
  Apache-2.0, BSD, ISC, Zlib, dual MIT/Apache-2.0) per ADR 0004
  maintenance policy;
- keeps supply-chain table simple while the project is pre-1.0 and the
  package set is small;
- rejected dual `MIT OR Apache-2.0` for v1 because it would formalize a
  contributor-license choice the project does not need before the crate
  graph is accepted — revisit only through an accepted license ADR after
  v1 if upstream or distribution policy requires it.

### File placement and expression

- Each formal repository contains exactly one `LICENSE` file at its root
  with the MIT text and copyright line
  `Copyright (c) 2026 The Bitty Terminal Contributors`.
- Cargo manifests carry `license = "MIT"` and source files carry no
  header comment; the repository root `LICENSE` is the canonical
  expression. Where a Cargo manifest's SPDX expression is checked by
  tooling (for example `cargo deny check licenses`), the value must be
  `MIT` and the `deny.toml` allowlist must list only MIT (and for
  `wgpu` the dual Apache-2.0/MIT that ADR 0004 records as compatible;
  that dependency's dual form is accepted as MIT-compatible evidence,
  not as a second project license).
- `bitty-plugin-template` consumers receive the same MIT `LICENSE`
  scaffold; replacing it with another permissive license requires a
  reviewed change that updates the template generator, the
  [toolchain policy](../development/toolchain-policy.md) allowlist, and
  the SDK docs, and must not introduce copyleft into any shipped binary
  (ADR 0004 prohibition).
- Dependency licenses are enforced by `cargo deny` / `cargo vet` /
  `cargo audit` and `bun audit` where applicable; a disallowed license
  blocks the branch protection gate (see next section).

### Rejected alternatives

| Alternative                       | Why rejected for v1                                                                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dual `MIT OR Apache-2.0` for Rust | Adds contributor choice without an upstream need; revisit after crate graph acceptance if distribution policy requires the Apache-2.0 patent grant explicitly. |
| `GPL-2.0` / `AGPL` for service    | Incompatible with the ADR 0004 copyleft prohibition on shipped binaries and with intended embedding in user machines.                                          |
| Per-crate `LICENSE-APACHE` file   | Correct for the dual form but implies a dual project license the project does not adopt in v1; a single `LICENSE` keeps the initial train auditable.           |

## Branch protections (accepted)

### `main` settings on GitHub (accepted, already visible as the current state)

The following table is the accepted normative set. The
[Repository map](../project/repository-map.md) records that all seven
public remotes are already pushed with `main` protected as squash-only
with required checks; this RFC makes that observation a governed
contract and records the full flag set:

<!-- markdownlint-disable MD013 -->

| Setting                                  | Accepted value                                                                                                                                                                                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default branch                           | `main`                                                                                                                                                                                                                                                                 |
| Allow merge commits                      | `false`                                                                                                                                                                                                                                                                |
| Allow squash merging                     | `true` (only method)                                                                                                                                                                                                                                                   |
| Allow rebase merging                     | `false`                                                                                                                                                                                                                                                                |
| Require pull request before merging      | `true`, at least 1 approving review, dismiss stale reviews when new commits pushed, require review from CODEOWNERS when a CODEOWNERS entry exists                                                                                                                      |
| Require status checks before merging     | `true`, strict (branch must be up to date) — checks must match the repository's `main` job names in the table below                                                                                                                                                    |
| Require conversation resolution          | `true` — unresolved review threads block merge                                                                                                                                                                                                                         |
| Require signed commits                   | `false` in v1 (recommended but not required until owner tooling is uniform; revisit after first release)                                                                                                                                                               |
| Allow force pushes / deletions on `main` | `false`                                                                                                                                                                                                                                                                |
| Require linear history                   | implied by squash-only; not a second flag                                                                                                                                                                                                                              |
| Auto-merge                               | `disabled` by default; `gh pr merge --squash` directly (see [AGENTS.md](../../AGENTS.md) GitHub guidance and `NETWORK_PROXY` for `gh`)                                                                                                                                 |
| CodeQL                                   | `required` where a CodeQL workflow exists (primary language per repo plus `actions` queries on `push`, `pull_request`, and weekly `schedule`); gating status is the `Analyze` / `Analyze - javascript` / `Lint GitHub Actions workflows` job per repo where applicable |
| Dependabot PR policy                     | Merge only after required checks pass; close when `mergeable == false` due to scope or conflict and fix manually                                                                                                                                                       |

### Required status checks per repository

The check name is the GitHub `job.name` that GitHub requires on `main`:

| Local directory                       | Accepted required `main` status checks           | Workflow file(s) that produce them                    |
| ------------------------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| `bitty`                               | `Quality gates`                                  | `bitty/.github/workflows/ci.yml`                      |
| `bitty-docs`                          | `Docs quality`                                   | `bitty-docs/.github/workflows/ci.yml`                 |
| `bitty-website`                       | `Website quality`                                | `bitty-website/.github/workflows/ci.yml`              |
| `bitty-devtools`                      | `Lint GitHub Actions workflows`, `Quality gates` | `bitty-devtools/.github/workflows/ci.yml`, `lint.yml` |
| `bitty-mcp`                           | `Lint GitHub Actions workflows`, `Quality gates` | `bitty-mcp/.github/workflows/ci.yml`, `lint.yml`      |
| `bitty-plugins/bitty-plugin-sdk`      | `Actionlint`, `Quality gates`                    | `bitty-plugin-sdk/.github/workflows/ci.yml`           |
| `bitty-plugins/bitty-plugin-template` | `Lint GitHub Actions workflows`, `Quality gates` | `bitty-plugin-template/.github/workflows/ci.yml`      |

Changing a required-check name requires a synchronized change of the
protection setting and the workflow `name` / `job.name` in the same PR;
the old name remains valid until the new name is the required one
(forward-compatible rename per deprecation policy).

### Branch and worktree naming (accepted, already in force via `AGENTS.md`)

Task branches use `ctx-XXXX/<type>-<short-slug>` where `XXXX` is the
owning CarryCtx task number, `<type>` is one of `feat`, `fix`, `chore`,
`docs`, and the slug is short kebab-case (for example
`ctx-0031/feat-isolation-rfc`). CarryCtx-bound worktrees live at
`.worktrees/ctx-XXXX-<type>-<short-slug>` with `/` mapped to `-`.
One branch per task; commander housekeeping branches may use
`cmd/<slug>`. Direct pushes to `main` are blocked by protection; the
bootstrap exception before the first commit is the only shared-checkout
mode and must not become the delivery path after it.

### Merge semantics

- Review is mandatory and independent from implementation: the author
  may not approve their own PR; at least one CODEOWNERS owner or a
  designated category owner must approve when CODEOWNERS covers the
  changed paths.
- Required checks must be green on the head commit of the PR after the
  last push before merge. `just check` (or `cargo` gates in `bitty`)
  being green locally does not substitute for green checks on GitHub
  for the gating decision, but in `bitty-docs` merge proceeds when
  locally green and `mergeable == MERGEABLE` without waiting for
  remote `Docs quality` per this repository's
  [AGENTS.md](../../AGENTS.md) remote-monitoring rule.
- Squash is the only merge strategy; the squash commit message follows
  Conventional Commits and links its CarryCtx task and related Issues,
  PRs, and ADRs/RFCs. The feature branch is deleted after merge.
- Dry-run validation (`act -n` with `act` 0.2.x, `actionlint`
  1.7.12) is required before pushing any workflow-affecting change per
  the toolchain policy.

## Ownership rules (accepted)

### Organization and team layout

| Principals                   | Accepted ownership                                                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub organization          | `bitty-terminal` — formal repositories belong here; forks exist outside the organization.                                                                                                                                                                                                         |
| Organization owners          | Project initiators who administer organization settings, team creation, and branch protection; not per-PR approvers by default.                                                                                                                                                                   |
| Repository maintainer teams  | `bitty-core` (`bitty`), `bitty-docs-maintainers` (`bitty-docs`), `bitty-website-maintainers` (`bitty-website`), `bitty-devtools-maintainers`, `bitty-mcp-maintainers`, `bitty-sdk-maintainers`, `bitty-template-maintainers`. Each team has write and review authority on exactly one repository. |
| Cross-cutting reviewer roles | `security-auditor`, `docs-curator`, `category-owner` (architecture, configuration, extensibility, interfaces, project, security) per the [documentation workflow](../development/documentation-workflow.md). Each required gate is a distinct person from the implementer.                        |
| Plugin repositories (future) | One independent repository per first-party plugin under `bitty-terminal`; each gains its own maintainer team after a topology ADR creates the repository. The umbrella `bitty-plugins/` path remains a grouping directory, never a parent Git repository.                                         |

No repository introduces a nested team that silently acquires
organization ownership. Team membership changes are reviewed and require
a second organization owner approval.

### CODEOWNERS

Every formal repository ships a `.github/CODEOWNERS` file. Accepted v1
rules:

- Default owner per repository:

| Repository              | Accepted default CODEOWNERS entry                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bitty`                 | `* @bitty-terminal/bitty-core`                                                                                                                              |
| `bitty-docs`            | `* @bitty-terminal/bitty-docs-maintainers` with `docs/security/* @bitty-terminal/bitty-core @bitty-terminal/bitty-docs-maintainers` for the security corpus |
| `bitty-website`         | `* @bitty-terminal/bitty-website-maintainers`                                                                                                               |
| `bitty-devtools`        | `* @bitty-terminal/bitty-devtools-maintainers`                                                                                                              |
| `bitty-mcp`             | `* @bitty-terminal/bitty-mcp-maintainers`                                                                                                                   |
| `bitty-plugin-sdk`      | `* @bitty-terminal/bitty-sdk-maintainers`                                                                                                                   |
| `bitty-plugin-template` | `* @bitty-terminal/bitty-template-maintainers`                                                                                                              |

- Where `AGENTS.md` or `.carryctx/rules/` govern local agent behavior,
  that file also requests the repository maintainer team.
- `CODEOWNERS` syntax is validated by the `just check` hygiene gate
  (links plus hygiene plus actionlint surface) and by GitHub's own
  parser on PR creation; invalid syntax blocks the PR.
- Future `*.rs`, `docs/security/*`, `docs/decisions/adrs/*`, and
  `docs/specifications/*` path rules may be added by a governed PR
  without changing the default; default ownership never weakens.
- A missing or empty CODEOWNERS file is a gate failure: the branch
  protection rule `require review from CODEOWNERS` applies only when
  the file exists, so its absence is treated as a hygiene violation
  before review is requested.

### Decision ownership

| Decision class                         | Accepted owner and sign-off                                                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Architecture direction (ADR)           | Category owner of the owning `category` plus docs-curator; security-auditor when a trust boundary, capability, resource limit, package, IPC/MCP, or sensitive-data path is involved.                               |
| Specification or RFC                   | Same three-reviewer set as ADR, plus the owning implementation repository's evidence when the RFC claims an accepted contract.                                                                                     |
| Branch protection, license, or release | `AGENTS.md` owning team for the affected repository plus a second organization owner; license changes also require docs-curator plus a supply-chain hygiene check (`cargo deny`, `gitleaks`, audit).               |
| Cross-repository train                 | One CarryCtx task per repository with explicit dependency edges, linked by `Docs-PR` / `Code-PR` trailers and a top-level train issue; merge order respects dependencies (never a cross-repository atomic commit). |

Every approval records evidence: a CarryCtx `decision` or `checkpoint`,
the PR discussion, and the effective `required status checks` at merge
time. Approvals are durable (visible in GitHub) and not replaced by an
offline note.

## Compatibility policy (accepted)

### Versioning

- Product repositories (`bitty`, `bitty-plugin-sdk`,
  `bitty-plugin-template`, each first-party plugin repository) use
  **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`). Pre-1.0
  `0.y.z` is compatible only within `0.y` as semver intends; post-1.0
  the major bump carries every breaking change.

- Documentation-only releases (`bitty-docs`, `bitty-website` content
  revisions) use dated tags or `0.y.z` with `website_publish` and
  `sidebar_order` metadata carrying the consumer contract; they do not
  create a binary compatibility promise by themselves. Where a `bitty`
  tag and a `bitty-docs` revision are linked for website publishing,
  the link is a pinned revision (see cross-repository flow).

- The [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
  candidate ladder `v0.1` through `v1.0` remains candidate maturity
  labels, not calendar promises. When the companion
  `bitty/docs/product/release-ladder.md` staging is accepted, its
  `0.1.0` through `0.9.0` mapping overlays this policy without weakening
  it.

### MSRV and toolchain pins

- MSRV for `bitty` is `1.85` as accepted in
  [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) and
  `rust-toolchain.toml`. Changing MSRV is a **minor** bump with at
  least one minor of warning in `CHANGELOG.md` and `README.md`, not a
  patch.

- Toolchain pins live in exactly one place per repo: the justfile
  (`prettier` 3.9.6, `markdownlint-cli2` 0.23.1, `actionlint` 1.7.12),
  `rust-toolchain.toml`, and lockfiles (`bun.lock`, `Cargo.lock`) per
  the [toolchain policy](../development/toolchain-policy.md). Bumping a
  pin without a semver-appropriate release note is a hygiene failure.
  Version pins are not part of the compatibility promise beyond the
  MSRV statement, but their change is recorded.

### Platform compatibility

Platform support follows the accepted tiers in
[ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md):
Tier 1 must work and regressions are release blockers; Tier 2 should
work with best-effort fixes; Tier 3 is community-maintained. Promoting or
demoting a platform requires an ADR revision and updates to the
[Repository map](../project/repository-map.md),
[Technology strategy](../project/technology-strategy.md), and release notes
in the same train.

### Deprecation and migration

A public API, configuration field, CLI command spelling, or repository
path may be deprecated only with:

1. a `deprecated` frontmatter or annotation stating the replacement,
   the version since deprecation, and the removal condition;
2. availability of both old and new spellings for **at least one minor**
   with a diagnostic on the old spelling;
3. a migration note in `CHANGELOG.md` and, where redirects apply,
   a redirect entry owned by `bitty-docs` per the
   [documentation workflow](../development/documentation-workflow.md);
4. retention of the deprecated surface in the next release's
   verification harness so that `cargo semver-checks` and docs link
   checks still pass.

Removing a deprecated surface before its documented minor is a **major**
bump. File moves, public path changes, and deprecations follow the same
change-trigger matrix: every inbound link, navigation entry, redirect
requirement, and consumer-visible release note is updated together with
the move.

### Compatibility matrix and announcement

Each release publishes a compatibility note stating:

- MSRV and supported toolchain versions at release time;
- Tier 1 platform coverage and the exact native runners used (not
  cross-compiled evidence for Tier 1);
- `bitty-plugin-sdk` API surface that the release expects;
- any deprecated surface and its removal window.

The note lives in `CHANGELOG.md` and `docs/releases/` and is linked
from the Git tag annotation. Website presentation consumes only a pinned
`bitty-docs` revision, so the matrix is never presented as floating
latest without a revision.

## Cross-repository release flow (accepted)

### Repo graph and independence

The seven repositories are independent Git repositories. No workflow
commits atomically across two repositories. A cross-cutting change must
be split into per-repository branches and PRs with explicit ordering.
The umbrella root and `bitty-plugins/` grouping directory are never Git
repositories; they never carry a release tag.

### Planning stage

1. Open a GitHub Issue in each affected repository that describes the
   outcome and the acceptance evidence. Create a CarryCtx task per
   repository, linked to its Issue, with a declared non-overlapping file
   scope and dependency edges that encode merge order (for example
   `bitty-docs` specification -> `bitty` crate change -> `bitty-website`
   consumer).
2. The train issue (usually in `bitty-docs` when docs lead, in `bitty`
   when product leads) links every per-repository task and PR.
3. Before work, re-verify drift-prone remote facts (`github.com` tier
   runners, `XDG_RUNTIME_DIR` semantics, `winit`/`wgpu` maintenance
   status) rather than copying prior prose.

### Delivery stage

1. After the repository has a first commit, work in a dedicated Git
   worktree per task using the branch contract above. Before the first
   commit, strictly scoped shared-checkout work is allowed only as an
   initialization exception.
2. Each PR carries trailers that link the train:

   ```text
   Docs-PR: https://github.com/bitty-terminal/bitty-docs/pull/<n>
   Code-PR: https://github.com/bitty-terminal/bitty/pull/<m>
   ADR: ADR-000N / RFC: Governance RFC OQ-024
   CarryCtx: CTX-XXXX
   ```

   Cross-repository changes should link to each other. The trailer
   fields `Docs-PR`, `Code-PR`, and associated ADR or RFC numbers are the
   shared fields accepted in the [Repository map](../project/repository-map.md) per this RFC
   and adopted here.

3. The implementing task pins exact versions in exactly one place per
   repo (justfile, `rust-toolchain.toml`, `Cargo.lock`, `bun.lock`) and
   records its lockfile result as dated evidence. Bumping a pin without
   a reason statement in the PR description is a hygiene failure.
4. Every PR runs the repository's required checks locally before push
   (`just check` for `bitty-docs`; `cargo check` / `cargo fmt --check`
   / `RUSTFLAGS="-D warnings" cargo clippy --workspace` / `cargo test`
   for `bitty` per its justfile). Workflow-affecting changes are
   validated with `actionlint` and an `act -n` dry-run (`act` 0.2.x).

### Verification stage

Before any merge in the train:

1. `just check` (or the repo's `justfile` equivalent) is green locally:
   `fmt-check`, `markdownlint`, `links`, `metadata`, `language`,
   `agents`, `hygiene`, `actionlint` — all zero issues.
2. `gitleaks detect --source .` has no findings before push, and for
   `bitty` `cargo deny check`, `cargo audit` / `cargo vet`, and
   `cargo semver-checks` are green where the change touches
   dependencies or public APIs.
3. CodeQL analysis is green on the PR for every repository that runs
   CodeQL (`javascript` plus `actions` queries per the CodeQL workflow).
4. The branch is up to date with `main` (strict status checks) and has
   at least one approving CODEOWNERS review and resolved conversations.

No merge proceeds with known local failures. Dependencies between
repositories are ordered: `bitty-docs` specification merge precedes the
`bitty` crate change that implements it; `bitty` crate publish
(any future `cargo publish`) precedes `bitty-plugin-sdk` changes that
depend on the new crate version; `bitty-website` consumption follows a
pinned `bitty-docs` tag, never a floating `main` branch.

### Tagging and publication

- Version tags have the form `vMAJOR.MINOR.PATCH` on the releasing
  repository and are annotated with the compatibility note, the train
  issue reference, and the SHA of the green commit. Tags are never
  retroactively retagged; a bad tag is superseded by a new patch, not a
  force-move.
- Release artifacts (Git tags, `Cargo.lock` / `bun.lock` as committed,
  and any future `cargo publish` output verified by
  `cargo publish --dry-run`) are produced from the tag commit. Cloudflare
  Workers Static Assets deploys for `bitty-website` are a separate
  trusted GitHub Actions job with only
  `secrets.CLOUDFLARE_API_TOKEN` and `secrets.CLOUDFLARE_ACCOUNT_ID`
  per the bootstrap baseline; pull-request code never receives
  deployment credentials.
- `CRATES_TOKEN` remains unused until a future decision explicitly
  authorizes `crates.io` publication in a workflow; `publish = false`
  on `bitty-core` and `bitty-app` stays the default until that ADR.
- Release notes live in `CHANGELOG.md` (Keep a Changelog 1.1.0) and
  `docs/releases/` where present, and cite the carried ADR, RFC, and
  OQ closures. Deleting available published material without a reviewed
  replacement and redirect decision is not allowed for published paths.

### Website consumption rule

A future `bitty-website` integration consumes `bitty-docs` only from an
immutable pinned revision (tag or SHA) and must not copy canonical
specifications verbatim. Loader, synchronization mechanism, route
mapping, redirect manifest, version selector, and search remain open
under OQ-023; this RFC makes their eventual delivery train-compatible
by requiring the pinned-revision input, not by placing the mechanism
here.

### Evidence and rollback

Every release PR records in its CarryCtx task and checkpoint:

- the `just check` / `cargo` evidence that was run;
- the exact pins it verified (`rust-toolchain.toml`, justfile versions,
  lockfile diff);
- the linked cross-repository PRs and the merge order actually taken;
- the post-merge verification that remote checks are green on the tag
  commit.

A failed release train stops at the first red gate. Retrying the train
uses a fresh patch tag; partial-state rollforward without a green train
is not allowed. Revocation or yank of a published package follows the
version-lifecycle rules in the Package Follow-up RFC (OQ-027), not a
silent retag.

## Security alignment and traceability

| Accepted element                                                                                        | Normative gate it implements                                           | Threat / Risk IDs                                                  |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Single MIT license with `cargo deny` allowlist and banned-copyleft rule                                 | Supply-chain license posture, advisory/source/banned checks            | R-019, R-015                                                       |
| `main` protected as squash-only with required status checks matching CI job names                       | Read-only CI parity, no unchecked direct merge into a trusted branch   | T-12, R-015                                                        |
| Strict status checks, conversation resolution, blocked force push                                       | Provenance of the merge commit, auditability of every release          | R-015, P0-AC-033 family                                            |
| CODEOWNERS default owner per repository plus security-corpus co-ownership                               | Least-privilege review, no anonymous authority                         | T-06, invariant 2                                                  |
| CodeQL `javascript` plus `actions` queries on every formal repository                                   | Static analysis gate on publishable surface and workflows              | R-015                                                              |
| Branch naming `ctx-XXXX/type-slug`, one branch per task, worktree at `.worktrees/ctx-XXXX-type-slug`    | Task scope isolation, shared-checkout hygiene                          | R-015                                                              |
| Semver with dated deprecation window of at least one minor and migration notes                          | Compatibility without silent breaking change                           | R-022                                                              |
| MSRV 1.85 pinned and change announced as minor with warning                                             | Toolchain policy reproducibility                                       | R-019                                                              |
| Train with `Docs-PR` / `Code-PR` trailers, dependency-ordered merges, no cross-repository atomic commit | Cross-repository provenance and ordering gate                          | R-015, R-022                                                       |
| Pinned `bitty-docs` revision as the only website input                                                  | Content ownership and duplication prohibition per the website contract | [Website content contract](../project/website-content-contract.md) |
| `gitleaks` and `cargo deny` / `cargo audit` / `cargo vet` as pre-merge gates                            | Secret minimization and supply-chain hygiene                           | R-014, R-019                                                       |

## Verification plan

Acceptance of an implemented contract later requires at minimum:

1. **License presence and expression.** `rg --files -g LICENSE` lists
   exactly one `LICENSE` per formal repository with the MIT text and the
   expected copyright line; `cargo metadata` show `license = "MIT"` for
   every publishable manifest; `cargo deny check licenses` is green with
   an allowlist limited to MIT (and dual Apache-2.0/MIT for `wgpu` as
   ADR-0004 compatible evidence); a deliberately introduced copyleft
   crate is rejected by that gate.
2. **Branch protection proof.** For each formal repository,
   `gh api repos/bitty-terminal/<repo>/branches/main/protection` with
   `HTTPS_PROXY=$NETWORK_PROXY` shows: `required_status_checks.strict`
   true, `required_pull_request_reviews` at least 1 with
   `dismiss_stale_reviews` true and `require_code_owner_reviews`
   true where a CODEOWNERS exists, `required_conversation_resolution`
   true, `allow_force_pushes` false, `allow_deletions` false, and
   `required_status_checks.contexts` exactly equal to the table in
   this RFC.
3. **CODEOWNERS validity.** `.github/CODEOWNERS` exists in every formal
   repository and `rg --files .github/CODEOWNERS` is green; opening a PR
   that touches `docs/security/*` without a `security-auditor` approval
   fails the `require_code_owner_reviews` gate, and a PR that touches no
   owned path still requires the default owner.
4. **Naming and merge semantics.** Creating a branch that violates
   `ctx-XXXX/type-slug` is rejected by pre-push guidance and by review;
   a trial `gh pr create` followed by `gh pr merge --squash` succeeds
   and leaves an annotated squash commit that carries the trailers
   `Docs-PR`, `Code-PR`, `ADR`/`RFC`, and `CarryCtx`; a trial with
   `merge` or `rebase` is not offered and is blocked by protection.
5. **Compatibility policy evidence.** A patch release lands with only
   additive changes and passing `cargo semver-checks`; a breaking-change
   simulation without a major bump fails that check; `CHANGELOG.md` for
   the release carries the compatibility note, the deprecation window
   for any deprecated surface, and the MSRV statement, all with dated
   entries.
6. **Cross-repository train record.** A staged two-repository change
   (for example a `bitty-docs` specification edit plus a `bitty` crate
   change) carries `Docs-PR` and `Code-PR` trailers in each PR,
   records dependency ordering in CarryCtx, and shows that the second
   PR's base was the first PR's `main` after the first PR merged, not
   an out-of-order merge.
7. **Website pin rule.** `bitty-website` gains a docs-consumer fixture
   that resolves only from a tag or SHA in `bitty-docs`; pointing the
   fixture at floating `main` fails the consumer's validation test.
8. **Supply-chain gates.** `act -n` accepts every workflow; CodeQL
   analyze produces a SARIF artifact with `javascript` plus `actions`
   categories; `gitleaks detect --source .` and `cargo deny check`
   are green on the release commit.

Every criterion above is an `adversarial`, `integration`, or
`manual-audit` check accompanied by a reviewer record before it may
move the linked risk toward `Mitigated`.

## Alternatives considered

| Alternative                                       | Why rejected or deferred                                                                                                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo for all components                       | Rejected — contradicts the accepted DIR-006 polyrepo topology and treats the umbrella grouping as a parent Git repository; the seven independent-repository boundaries are fixed.             |
| Dual `MIT OR Apache-2.0` as immediate default     | Deferred — adds a license choice before the product crates need the Apache-2.0 patent grant explicitly; revisit via ADR when distribution policy or upstream licensing requires it.           |
| `GPL-2.0` or copyleft default                     | Rejected — incompatible with ADR 0004's shipped-binary ban on copyleft and with intended use on user machines; keeps the project adoptable as a library later.                                |
| Require GPG-signed commits on `main` in v1        | Deferred — correct for provenance but owner tooling is not uniform pre-1.0; recommend but do not require until a follow-up verifies signing across Linux, macOS, Windows, and BSD paths.      |
| Merge commits or rebase as allowed strategies     | Rejected — merges hide the one-branch-per-task invariant and complicate the release-train ordering proof; squash preserves a linear `main` with one merge per task.                           |
| Require two approving reviews on every repository | Deferred — adds latency before maintainer teams exist at size; revisit after the first release when cross-cutting risk justifies a second gate, keeping the 1-review plus CODEOWNERS default. |
| Float `bitty-docs` `main` as direct website input | Rejected — violates the website content contract that demands a pinned validation boundary; the consumer must own presentation while docs own canonical content.                              |
| Cross-repository atomic commit                    | Rejected — impossible by construction after polyrepo acceptance; the `Docs-PR`/`Code-PR` linked train is the atomic-evidence substitute.                                                      |

## Affected contracts

Acceptance of this RFC on 2026-08-29 applies these same-change updates (no
separate task needed; a follow-up PR must keep them synchronized):

- [Repository map](../project/repository-map.md): the pending-decisions
  list for licenses, successor topology, release profiles, compatibility
  matrix, and cross-repository release train refers to this RFC as the
  authoritative contract; the per-repository `Required main status
checks` table and the current-initialization-state table gain the
  strict, CODEOWNERS, conversation-resolution, and squash-only columns
  as their governed values rather than observed values.
- [Decision register](../decisions/index.md): DIR-006 through DIR-012
  gain a link to this RFC as the accepted ownership and release policy;
  the candidate-queue entry for repository governance is marked
  Accepted on 2026-08-29 per this RFC.
- [Technology strategy](../project/technology-strategy.md): the
  candidate dependency-governance, bootstrap toolchain, and release
  profile bullets link to this RFC for license, branch protection, and
  train gates; the reference to ADR 0004's license allowlist stays the
  source for dependency specifics.
- [Toolchain policy](../development/toolchain-policy.md): references
  the pinned justfile versions (`prettier` 3.9.6, `markdownlint-cli2`
  0.23.1, `actionlint` 1.7.12), `rust-toolchain.toml` MSRV 1.85, and the
  CODEOWNERS and CodeQL `actions` query requirements as the governed
  set; the file gains a short branch-protection row in its pin table.
- [Documentation workflow](../development/documentation-workflow.md):
  the change-trigger matrix row for repository, CI, delivery,
  ownership, and release-process changes already owns this material and
  is linked as the review owner, not rewritten.
- [Repository bootstrap guide](../development/repository-bootstrap.md):
  the non-goals paragraph for release automation, licenses, and
  publication refers to this RFC as the decision point.
- [Project releases](../releases/README.md) and the root
  [CHANGELOG.md](../../CHANGELOG.md): the release-note and tag
  annotation format become normative per this RFC's tagging and
  compatibility sections when releases exist.
- No new repository, crate, or workflow is added by this RFC; pins for
  any future governing workflow belong to the implementing task and are
  verified by `cargo tree --locked` alongside the existing workspace
  pins where applicable.

## Open points

Deliberately unresolved at draft time. None blocks the contract above
from review; their disposition belongs to acceptance or to a follow-up
scoped task:

1. Whether to require signed commits on `main` after maintainer
   tooling for GPG or SSH signing is verified across Tier 1 platforms.
2. Whether CODEOWNERS path rules should own every `crates/*`
   directory individually or keep only the default-owner plus
   security-corpus refinement in v1.
3. Whether the SDK and template repositories require a second
   CODEOWNERS entry for generated-package validation beyond the default
   owner.
4. Whether the compatibility matrix should live in a machine-readable
   file (for example `compatibility.toml`) or remain prose in
   `CHANGELOG.md` and `docs/releases/` for v1.
5. Whether the first coordinated release train should produce a single
   cross-repository tag (for example a dated train tag) in addition to
   per-repository `vMAJOR.MINOR.PATCH` tags.
6. Whether two approving reviews should be required on `bitty`
   `crates/bitty-plugin-host` or `crates/bitty-lua` paths while
   those budgets carry P0 isolation risk, pending maintainer-team size.
7. Whether the license SCA should run as a GitHub required check wired
   through `cargo deny` in CI or as a local `just check` hygiene gate
   promoted to required only after flake analysis.

These remain outside this RFC's scope until a scoped follow-up with
review evidence decides them; they must not be silently chosen by
implementation.

## Acceptance criteria

This RFC is accepted on 2026-08-29 and closes
[OQ-024](../decisions/open-questions.md) at the design level. The following criteria were satisfied per the [open-question register](../decisions/open-questions.md) close rule:

1. Independent review by the category owner, a docs curator, and a
   security reviewer accepts the license, branch protection,
   ownership, compatibility policy, and cross-repository release flow,
   including every table value and the website pin rule.
2. Affected documents are synchronized in the same change: the
   repository map, decision register, toolchain policy, bootstrap
   guide, and the documentation workflow's change-trigger row
   reference the accepted contract, and the open-question row moves
   from pointer to closure per the register close rule.
3. No element weakens a normative P0 gate; any discovered conflict
   returns the conflicting clause to revision rather than downgrading
   the gate.
4. The draft text in this file is updated to record acceptance date
   and initiator, frontmatter becomes `accepted`, and links from the
   [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
   and the [decision register](../decisions/index.md) reflect the
   accepted composition without claiming implementation.
5. Verification items 1 through 4 in the plan above are shown green
   on a staged two-repository example (for example `bitty-docs` plus
   `bitty`) with exact check names and protection output captured.

Closes OQ-024: this RFC closes that open question at the design level; the register rows are updated per the open-question register rules. The lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## P0 Review Sign-off

> P0 review per CTX-0077 tracks acceptance of OQ-024 via this RFC. Frontmatter is `accepted` and [open-questions.md](../decisions/open-questions.md) is updated per its close rule. This section records passing sign-off and closes OQ-024.

<!-- markdownlint-disable MD013 -->

| Role                                  | Reviewer          | Verdict | Evidence / scope                                                                                                                                                                                                                                                                                                           | Date       |
| ------------------------------------- | ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| security-auditor                      | `bitty-security`  | pass    | R-015, R-019, R-022, T-12, P0-AC-033 family, MIT license allowlist, supply-chain lane, dependency governance, distribution integrity, branch protection provenance, CodeQL `javascript`+`actions`                                                                                                                          | 2026-08-28 |
| category-owner (security-and-quality) | `bitty-quality`   | pass    | License MIT file placement `LICENSE` SPDX, branch protection squash-only strict CODEOWNERS conversation-resolution, compatibility policy semver MSRV 1.85 Tier 1 deprecation >=1 minor, release train `Docs-PR`/`Code-PR` trailers pinned website consumption                                                              | 2026-08-29 |
| category-owner (architecture)         | `bitty-architect` | pass    | Branch protection table `Required main status checks` per repository, ownership rules org teams CODEOWNERS paths, cross-repository train dependency-ordered merges atomic-evidence `gitleaks`/`cargo deny` gates                                                                                                           | 2026-08-29 |
| docs-curator                          | `bitty-curator`   | pass    | Frontmatter `accepted`, lifecycle `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`, links to [Repository map](../project/repository-map.md) and [P0 review checklist](../reviews/p0-review-checklist.md) and [website content contract](../project/website-content-contract.md), English-only | 2026-08-29 |

<!-- markdownlint-enable MD013 -->

## References

- Bitty accepted topology: [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md)
  (ten-crate topology, MSRV 1.85, `resolver = "3"`).
- Upstream license allowlist: [ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md)
  (MIT, Apache-2.0, BSD, ISC, Zlib, dual Apache-2.0/MIT; copyleft
  prohibition).
- Bootstrap contract: [ADR 0001](../decisions/adrs/ADR-0001-repository-bootstrap-baseline.md)
  (two-package workspace, toolchain, CI gates, secret handling).
- Platform and CI tiers: [ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md)
  (Tier 1 must-work with native runners; promotion and demotion
  criteria).
- Current workspace evidence: [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
  (spine-complete crate presence as of 2026-08-27, not acceptance).
- Product and license provenance: `LICENSE` (MIT), `CHANGELOG.md`
  (Keep a Changelog, Semantic Versioning), `SECURITY.md` (GitHub
  Security Advisory), `.github/workflows/ci.yml` (`Docs quality`),
  `.github/workflows/codeql.yml` (`Analyze` with `javascript` plus
  `actions`).
- Related RFCs: [Default Distribution RFC](default-distribution-rfc.md)
  for OQ-002, [Package Lifecycle RFC](package-lifecycle-rfc.md) for
  OQ-021, [Package Follow-up RFC](package-followup-rfc.md) for
  OQ-022/OQ-026 through OQ-029.
