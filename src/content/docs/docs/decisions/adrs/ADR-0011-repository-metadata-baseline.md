---
title: ADR 0011 - Repository Metadata and GitHub Baseline
description: Proposes the canonical shared and per-repository metadata and .github baseline across the Bitty and CarryCtx repository estate
category: decisions
audience: contributor
document_type: specification
status: draft
website_publish: true
sidebar_order: 41
---

# ADR 0011 - Repository Metadata and GitHub Baseline

## Status

Proposed on 2026-09-12 by documentation task `CTX-0155`. Frontmatter `status`
is `draft`; document status is **Proposed**. This record awaits independent
review and acceptance by the project initiator. It does not authorize workflow
edits, branch-protection mutation, commit, or push in any consumer repository.

- Related:
  [Repository Metadata and GitHub Baseline](../../development/repository-metadata-baseline.md)
  (the operational guide), [ADR 0001](ADR-0001-repository-bootstrap-baseline.md)
  (first Core and website scaffold), [Governance RFC](../../specifications/governance-rfc.md)
  (OQ-024 branch protection and ownership), and
  [Toolchain and Tooling Policy](../../development/toolchain-policy.md).
- Deciders: project initiator (`DEC-001`), independent reviewer, owning teams
  for `bitty`, the plugin repositories, and the CarryCtx family.

## Context

A 2026-09-11 configuration audit found that repository metadata and `.github/`
content across the estate are mostly **near-identical rather than identical**,
with divergence that no accepted document governs:

- Required-check contexts differ per repository (`Actionlint` vs
  `Lint GitHub Actions workflows`; `Analyze (...)` vs `CodeQL Analyze (...)`;
  `bitty-devtools` uses one combined matrix context).
- A `CodeQL` required context appears alongside the advanced `codeql.yml`
  `Analyze (...)` checks in several repositories.
- `.editorconfig` exists only in `bitty-docs` and `bitty-website`, and the two
  copies differ.
- `CODEOWNERS` and `FUNDING.yml` are absent everywhere.
- `commitlint.config.ts` is identical across the Bitty family but divergent in
  `Xuepoo/carryctx`.
- The CarryCtx family pins third-party actions to mutable major tags rather
  than commit SHAs.

`ADR-0001` covers only the first Core and website scaffolds, and
`toolchain-policy.md` covers local tools rather than repository metadata or
GitHub configuration. No document states which files may be synchronized
mechanically and which must never be.

## Decision

Accept an estate-wide repository-metadata baseline with three tiers:

1. **Byte-identical files** that must match a single canonical copy, verified by
   blob hash: `snapshot-source.yml`, one `codeql.yml` plus its config,
   `.editorconfig`, and `commitlint.config.ts`.
2. **Shared body with an explicit per-repository parameter block**:
   `dependabot.yml`, `SECURITY.md`, `CONTRIBUTING.md`, `lefthook.yml`,
   pull-request and issue templates, `CODEOWNERS`, and `FUNDING.yml`.
3. **Per-repository files that are never mechanically synced**: `release.yml`,
   `deploy.yml`, `rust-toolchain.toml`, `package.json`/`bun.lock`,
   `.gitignore`, `AGENTS.md`, `CHANGELOG.md`, `README.md`, and `justfile`.

Accept these change-control rules:

- **Required-check naming.** A required status-check context must equal the
  producing workflow job `name:` exactly after matrix expansion, never the job
  id or workflow name. A rename of a required job, or a change to a matrix
  value, changes the context and therefore the branch-protection requirement.
  The branch-protection update must be performed atomically with the rename by
  the merge operator, because GitHub stores branch protection outside the
  repository and a pull request cannot carry it.
- **Never require push-only or schedule-only jobs.** A context produced only by
  `push`, `schedule`, or `workflow_dispatch` events can never satisfy a pull
  request and would block `main`. `snapshot-source.yml` and `release.yml` jobs
  are permanent examples.
- **Action pinning.** Every third-party action must be pinned to a full
  40-character commit SHA with a trailing version comment; mutable major tags
  (`@v4`) are a supply-chain defect. Dependabot must cover `github-actions` so
  the pins receive update pull requests. First-party/local actions referenced
  by path are exempt.
- **Rust channel pinning.** `rust-toolchain.toml` must pin an explicit channel
  version; `channel = "stable"` is prohibited as non-reproducible.

The operational table of canonical sources, parameter blocks, current
required-check contexts, and the rollout order lives in
[Repository Metadata and GitHub Baseline](../../development/repository-metadata-baseline.md).
This ADR records the choice; that guide records the mechanics.

## Consequences

- Shared files can be verified by hash instead of eyeballed per repository.
- Required-check drift becomes a tracked, testable property rather than an
  invisible branch-protection state.
- Action and toolchain pins become reviewable supply-chain evidence.
- Per-repository release and deploy pipelines stay independently owned.

## Deferred

This ADR does not:

- rename any workflow job or mutate any branch protection (each is a
  repository-scoped task with atomic execution);
- adopt `CODEOWNERS`/`FUNDING.yml` content, which requires owner decisions;
- change `release.yml` or `deploy.yml`, which remain per-repository;
- authorize a commit, push, release, or deployment in any consumer repository.
