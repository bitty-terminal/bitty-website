---
title: Repository Metadata and GitHub Baseline
description: Canonical per-class baseline for shared and per-repository metadata and .github configuration across the Bitty and CarryCtx estate
category: development
audience: contributor
document_type: policy
status: draft
website_publish: true
sidebar_order: 22
---

# Repository Metadata and GitHub Baseline

## Purpose and status

- Status: **Proposed** (frontmatter `status: draft`). Companion to
  [ADR 0011](../decisions/adrs/ADR-0011-repository-metadata-baseline.md); not
  yet accepted.
- Scope: the `bitty-terminal` estate and the CarryCtx family plus the taps.
- Authority: this guide defines the canonical target for repository-level
  metadata and `.github/` configuration. It does **not** edit workflows, mutate
  branch protection, or claim that any consumer repository has adopted the
  baseline. A consumer repository adopts the baseline only through its own
  scoped task, independent review, and green CI.

The 2026-09-11 configuration audit found the estate mostly **near-identical
rather than identical**, with divergence no document governed. This guide
cross-checks the audit against the live default branches and branch-protection
settings on 2026-09-12 and states the target per repository class. The
operational rule is: an agent may synchronize a **Tier A/B** file only as part
of an owning task, and must never "tidy" a **Tier C** file.

## Repository classes

| Class         | Repositories                                                         | Primary ecosystem | CodeQL in CI                   |
| ------------- | -------------------------------------------------------------------- | ----------------- | ------------------------------ |
| code-core     | `bitty-terminal/bitty`                                               | Rust + Bun        | rust, actions                  |
| code-plugin   | `activity`, `bitty-mcp`, `bitty-plugin-sdk`, `bitty-plugin-template` | Bun/TypeScript    | javascript-typescript, actions |
| code-devtools | `bitty-devtools`                                                     | Rust + Bun        | javascript-typescript, actions |
| docs          | `bitty-docs`                                                         | Bun/Markdown      | none (docs-only; excluded)     |
| website       | `bitty-website`                                                      | Bun/Astro         | javascript-typescript, actions |
| tap-bitty     | `bitty-terminal/homebrew-tap`, `bitty-terminal/scoop-bucket`         | package metadata  | none                           |
| tap-xuepoo    | `Xuepoo/homebrew-tap`, `Xuepoo/scoop-bucket`                         | package metadata  | none                           |
| cc-core       | `Xuepoo/carryctx`                                                    | Rust + Bun        | rust, actions                  |
| cc-docs       | `Xuepoo/carryctx-docs`                                               | Markdown          | none (no `.github/` yet)       |
| cc-website    | `Xuepoo/carryctx-website`                                            | Bun/Astro         | javascript-typescript, actions |
| cc-skills     | `Xuepoo/carryctx-skills`                                             | Python + Markdown | python, actions                |

`bitty-docs` is deliberately excluded from CodeQL. It has a Markdown/CI-only
surface; the core `bitty` repository carries the primary CodeQL corpus.

## Tier A - byte-identical files

These files must match one canonical copy. Verification is a blob-hash
comparison, not a visual diff.

| File                                    | Canonical source              | Applies to                        | Notes                                                                                                                                                                                     |
| --------------------------------------- | ----------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/snapshot-source.yml` | `bitty-terminal/bitty`        | all 8 Bitty-family repositories   | Currently already identical (blob `234859ca75`) in `bitty`, `bitty-docs`, `bitty-website`, `bitty-devtools`, `activity`, `bitty-mcp`, `bitty-plugin-sdk`, `bitty-plugin-template`.        |
| `.github/workflows/codeql.yml`          | `bitty-terminal/bitty`        | every repo with a CodeQL language | One job `analyze` named `Analyze (${{ matrix.language }})`; matrix = primary language + `actions`, each `build-mode: none`; weekly schedule; `contents: read` + `security-events: write`. |
| `.github/codeql/codeql-config.yml`      | `bitty-terminal/bitty`        | every repo with `codeql.yml`      | `queries: security-and-quality`; `paths-ignore` for `target` and `node_modules`.                                                                                                          |
| `.editorconfig`                         | `bitty-website/.editorconfig` | all repositories                  | UTF-8, LF, 2-space, final newline, trim trailing whitespace; `[*.md] trim_trailing_whitespace = false`; `[justfile] indent_size = 4`.                                                     |
| `commitlint.config.ts`                  | `bitty-terminal/bitty`        | all 8 Bitty-family repositories   | The CTX-aware parser (`[CTX-XXXX]` prefix accepted). Identical across the Bitty family today; `Xuepoo/carryctx` must adopt it.                                                            |

`bitty-docs` is an explicit exception for `codeql.yml`/`codeql-config.yml`
(removed under `CTX-0105`).

## Tier B - shared body with a per-repository parameter block

These files share one body and differ only in a clearly delimited parameter
block. The parameter block is the only region an owning task may change.

| File                                              | Parameter block                                                                                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/dependabot.yml`                          | The ecosystem entries: always `github-actions` weekly, plus the repository's own (cargo, npm, pip). Grouped; one commit-message prefix per ecosystem (`ci` for actions, `deps` for dependencies). |
| `SECURITY.md` (root; never `.github/SECURITY.md`) | Repository name and reporting scope.                                                                                                                                                              |
| `CONTRIBUTING.md` (root)                          | Repository name and the repository's quality-gate block.                                                                                                                                          |
| `lefthook.yml`                                    | Hook stages wired to the repository's `just` recipes only.                                                                                                                                        |
| `.github/ISSUE_TEMPLATE/bug_report.md`            | Repository name and reproduction hints.                                                                                                                                                           |
| `.github/ISSUE_TEMPLATE/feature_request.md`       | Repository name and scope hints.                                                                                                                                                                  |
| `.github/PULL_REQUEST_TEMPLATE.md`                | Repository name and the quality-gate checklist.                                                                                                                                                   |
| `CODEOWNERS`                                      | Per-repository owner handles. Currently absent everywhere; adoption requires owner input.                                                                                                         |
| `.github/FUNDING.yml`                             | Funding targets. Currently absent everywhere; adoption requires owner input.                                                                                                                      |

`SECURITY.md` is at repository root everywhere it exists; if a repository has
both root and `.github/SECURITY.md`, GitHub prefers `.github/` and that is a
defect to fix, not a placement choice.

## Tier C - per-repository, never mechanically synced

These files are owned by their repository. An agent must not copy them between
repositories, not even to "reduce drift".

| File                            | Reason                                                               |
| ------------------------------- | -------------------------------------------------------------------- |
| `.github/workflows/release.yml` | Cargo vs Bun/NPM release pipelines; different artifacts and secrets. |
| `.github/workflows/deploy.yml`  | Deployment target and credentials are per repository.                |
| `rust-toolchain.toml`           | Pinned per repository; see the channel rule below.                   |
| `package.json`, `bun.lock`      | Dependency graph and lockfile are per repository.                    |
| `.gitignore`                    | Build outputs differ by ecosystem.                                   |
| `AGENTS.md`                     | Repository-local agent instructions (all 12 audited copies differ).  |
| `CHANGELOG.md`                  | Independent release history.                                         |
| `README.md`                     | Independent front door.                                              |
| `justfile`                      | Owns the pinned tool versions for that repository.                   |
| `.markdownlint-cli2.jsonc`      | Per-repository lint scope.                                           |

## Required-check context naming

A required status check must name the exact producing **job `name:`** after
`${{ matrix.* }}` expansion. It must never name the workflow, the job id, or a
stale label. Consequences:

- Renaming a job `name:`, or adding/removing/renaming a matrix value, changes
  the context. Branch protection then requires a context that never appears
  (blocking `main`) or stops gating a real check (silent gap).
- GitHub stores branch protection outside the repository; a pull request cannot
  carry the update. The workflow rename and the branch-protection edit are
  therefore one atomic operator action: update protection immediately before or
  after merging the rename, then verify with the command below.
- Never require a check produced only by `push`, `schedule`, or
  `workflow_dispatch`. In this estate, `Snapshot source matches main` and all
  `release.yml`/`deploy.yml` jobs are pull-request-invisible and must stay
  unrequired.

### Current contexts and drift (evidence 2026-09-12)

14 repositories currently have branch protection; 11 of them require status
checks. Branch protection exists but no required checks on
`bitty-terminal/homebrew-tap`, `bitty-terminal/scoop-bucket`, and
`Xuepoo/carryctx-docs`. The two `Xuepoo` taps are unprotected. No repository
requires pull-request review, and `strict` is `false` everywhere.

| Repository                    | Required contexts (verbatim)                                                                                                                                                                                  | Drift to resolve                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `bitty`                       | `Quality gates`, `MSRV 1.85 check`, `Windows check and test`, `macOS ARM64 check and test`, `Linux Wayland`, `Linux X11 (xvfb)`, `Analyze (rust)`, `Supply chain (deny/audit)`, `Analyze (actions)`, `CodeQL` | None; reference implementation. `actionlint` is folded into `Quality gates`.                                |
| `bitty-docs`                  | `Docs quality`                                                                                                                                                                                                | None.                                                                                                       |
| `bitty-website`               | `Website quality`, `Analyze (actions)`, `Analyze (javascript-typescript)`, `CodeQL`                                                                                                                           | None.                                                                                                       |
| `bitty-devtools`              | `Lint GitHub Actions workflows`, `Quality gates`, `Analyze (javascript-typescript, actions)`, `CodeQL`                                                                                                        | Split the combined CodeQL job into one job per language; rename context to `Analyze (<language>)`.          |
| `activity`                    | `Quality gates`, `Lint GitHub Actions workflows`, `Analyze (actions)`, `Analyze (javascript-typescript)`, `CodeQL`                                                                                            | None.                                                                                                       |
| `bitty-mcp`                   | `Lint GitHub Actions workflows`, `Quality gates`, `CodeQL Analyze (actions)`, `CodeQL Analyze (javascript-typescript)`, `CodeQL`                                                                              | Rename the CodeQL job to `Analyze (${{ matrix.language }})`; context becomes `Analyze (<language>)`.        |
| `bitty-plugin-sdk`            | `Actionlint`, `Quality gates`, `Analyze (actions)`, `Analyze (javascript-typescript)`, `CodeQL`                                                                                                               | Rename the lint job to `Lint GitHub Actions workflows`.                                                     |
| `bitty-plugin-template`       | `Lint GitHub Actions workflows`, `Quality gates`, `Analyze (actions)`, `Analyze (javascript-typescript)`, `CodeQL`                                                                                            | None.                                                                                                       |
| `Xuepoo/carryctx`             | `Quality`, `Test`, `Actionlint`, `Analyze (rust)`                                                                                                                                                             | Rename `Actionlint` to `Lint GitHub Actions workflows`; add `Analyze (actions)` once CodeQL covers actions. |
| `bitty-terminal/homebrew-tap` | (none - protected, no required checks)                                                                                                                                                                        | Add minimal CI and the canonical required checks under a tap task.                                          |
| `bitty-terminal/scoop-bucket` | (none - protected, no required checks)                                                                                                                                                                        | Add minimal CI and the canonical required checks under a tap task.                                          |
| `Xuepoo/carryctx-docs`        | (none - protected, no required checks)                                                                                                                                                                        | Decide whether docs-only CI runs here; add the check before requiring it.                                   |
| `Xuepoo/carryctx-website`     | `verify`                                                                                                                                                                                                      | Rename to the class check name or accept as the cc-website canonical context.                               |
| `Xuepoo/carryctx-skills`      | `Checks`                                                                                                                                                                                                      | Rename to the class check name or accept as the cc-skills canonical context.                                |

`Xuepoo/homebrew-tap` and `Xuepoo/scoop-bucket` are not protected and have no
required checks.

### The `CodeQL` context is legitimate, not stale

The audit suspected the extra `CodeQL` required context was a duplicate default
CodeQL setup or a dead context. The 2026-09-12 cross-check disproves both:

- Default CodeQL setup reports `state: not-configured` in all audited
  repositories.
- `CodeQL` is a real check run produced by the `github-advanced-security` app
  on `pull_request` events ("No new alerts in code changed by this pull
  request"). It appears on pull requests in `bitty`, `bitty-website`,
  `Xuepoo/carryctx`, and elsewhere, independent of the `codeql.yml` job checks.

Rule: treat `CodeQL` as the code-scanning result check, distinct from the
`Analyze (<language>)` build jobs. Keep it required where code scanning is
enabled. Do **not** remove it as "stale", and do **not** conflate it with the
default-setup toggle. If a repository disables code scanning, remove the
context in the same change.

## Action pinning policy

- Every third-party `uses:` must be a full 40-character commit SHA with a
  trailing version comment, for example
  `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`.
- Mutable major tags (`@v4`) are prohibited. The Bitty family complies; the
  CarryCtx family does not and is the tracked security defect.
- Local or first-party actions referenced by path (`./.github/actions/...`) are
  exempt from SHA pinning.
- `dependabot.yml` must include the `github-actions` ecosystem so SHA pins
  receive update pull requests. A pin without an update path rots silently.

Known CarryCtx-family unpinned actions (subject to the pinning task):
`actions/checkout@v7`, `actions-rust-lang/setup-rust-toolchain@v2`,
`DavidAnson/markdownlint-cli2-action@v24`, `actions/upload-artifact@v7`,
`actions/download-artifact@v8`, `github/codeql-action/{init,analyze}@v4`,
`oven-sh/setup-bun@v2`, `lycheeverse/lychee-action@v2`,
`actions/setup-python@v5`, and `softprops/action-gh-release@v3`.

### Rust channel anti-pattern

`rust-toolchain.toml` must pin an explicit channel (for example
`channel = "1.97.1"`). `channel = "stable"` (currently used by
`Xuepoo/carryctx`) is prohibited: it makes builds non-reproducible and lets the
toolchain drift without a reviewed change. Do not let a CI
`setup-rust-toolchain` action override the file; the file is the single source
of truth for the channel.

## Rollout order and atomicity

1. **Accept this baseline** (this guide and
   [ADR 0011](../decisions/adrs/ADR-0011-repository-metadata-baseline.md)).
2. **Low-risk metadata** per repository: `.editorconfig`, `SECURITY.md`,
   `CONTRIBUTING.md`, `CODEOWNERS`/`FUNDING.yml`, issue and pull-request
   templates, `dependabot.yml`, `commitlint.config.ts`, `lefthook.yml`. None of
   these change a required-check context, so they can land as ordinary pull
   requests.
3. **Workflow normalization** per class: unify `codeql.yml` and its config, and
   unify the actionlint job name. **Any required-check rename is atomic with a
   branch-protection update** (see below). This step carries the real risk.
4. **CarryCtx-family action pinning** (security defect), cross-repository.
5. **Taps**: add minimal CI, then add required checks in a second task.
6. **`release.yml` and `deploy.yml`** only under dedicated tasks. They are
   excluded from every synchronization step above.

### Atomicity warnings

- **Branch protection is not in the repository.** A workflow-rename pull
  request cannot update it. Before merging a required-check rename, add the new
  context to branch protection; after merge, remove the old one. Doing both at
  once risks blocking `main`; doing neither leaves a silent gate gap. With
  `strict: false` everywhere, a stale required context can persist unnoticed
  until a pull request is blocked.
- **The expected renames are exactly:** `bitty-mcp`
  `CodeQL Analyze (...) -> Analyze (...)`;
  `bitty-devtools` combined `Analyze (javascript-typescript, actions)` -> two
  per-language jobs; `bitty-plugin-sdk` `Actionlint -> Lint GitHub Actions
workflows`; `Xuepoo/carryctx` `Actionlint -> Lint GitHub Actions workflows`.
- **Do not require pull-request-invisible jobs.** Verify a candidate context
  appears on a recent pull request before adding it to branch protection.
- **`release.yml`/`deploy.yml` are excluded.** Their job names and triggers are
  out of scope for this baseline.

## Verification commands

Required-check read-back (replace the repository):

```bash
HTTPS_PROXY="$NETWORK_PROXY" gh api \
  repos/bitty-terminal/bitty/branches/main/protection/required_status_checks \
  --jq '{strict, contexts}'
```

Byte-identical file check (replace `bitty` with the repository under audit):

```bash
git ls-tree refs/remotes/origin/main \
  .github/workflows/snapshot-source.yml .github/workflows/codeql.yml \
  .github/codeql/codeql-config.yml .editorconfig commitlint.config.ts
```

A Tier A file is synchronized only when its blob hash equals the canonical
source. A different hash is drift, not a style preference.

## Follow-ups

CarryCtx's dependency graph is project-local, so cross-repository follow-ups
are recorded here as text:

- `bitty` core: adopt/confirm this baseline and update its own required-check
  names only if it renames a job.
- `bitty-plugin-sdk`: rename `Actionlint` and update branch protection.
- `bitty-devtools`, `bitty-mcp`: split/normalize the CodeQL context and update
  branch protection atomically.
- `Xuepoo/carryctx` family: SHA-pin actions, pin the Rust channel, adopt the
  CTX-aware `commitlint.config.ts`, and give `carryctx-docs` a `.github/`
  baseline.
- Taps: add minimal CI and required checks.
- Each follow-up becomes its own issue, branch, and pull request in the owning
  repository; this document authorizes none of them.

## References

- [Decision register](../decisions/index.md) - accepted directions and the ADR
  queue.
- [ADR 0011 - Repository Metadata and GitHub Baseline](../decisions/adrs/ADR-0011-repository-metadata-baseline.md)
- [ADR 0001 - Repository Bootstrap Baseline](../decisions/adrs/ADR-0001-repository-bootstrap-baseline.md)
- [Governance RFC](../specifications/governance-rfc.md) - OQ-024 license,
  branch protection, ownership, and release train.
- [Toolchain and Tooling Policy](toolchain-policy.md) - pinned local tools and
  canonical gate commands.
- [Repository Bootstrap](repository-bootstrap.md) - first Core and website
  scaffold contract.
