---
title: Development
description: Contributor entry point for the documentation-first Bitty project
category: development
audience: contributor
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Development

Bitty is currently documentation-first and pre-implementation. Contributor work
focuses on reviewed contracts, project initialization, security gates, and
reproducible delivery practices. This page does not claim that a product build
or test workflow exists.

## Start here

1. Read the workspace and repository `AGENTS.md` files.
2. Read the [documentation workflow](documentation-workflow.md) and the
   [toolchain and tooling policy](toolchain-policy.md) — run only the pinned,
   canonical commands it defines (bun, never npm/npx/yarn; gates via just).
3. Enter the repository that owns the intended change and load its CarryCtx
   task, team, rules, and persona.
4. Confirm dependencies and a non-overlapping scope before editing.
5. Follow the [docs-first TODO](../../TODO.md) and the owning contract document.

## Project context

- [Repository map](../project/repository-map.md) describes independent
  repository boundaries and current initialization state.
- [Technology strategy](../project/technology-strategy.md) separates accepted
  language/platform direction from candidate tools.
- [Reference projects](../project/reference-projects.md) records untrusted,
  read-only research snapshots.
- [Security overview](../security/overview.md), [threat model](../security/threat-model.md),
  and [risk register](../security/risk-register.md) define the security review
  baseline.
- [Decision register](../decisions/index.md) and
  [open-question register](../decisions/open-questions.md) prevent proposals
  from silently becoming contracts.

## Delivery expectation

The normal lifecycle is Issue, scoped CarryCtx task, branch/worktree, commit,
pull request, independent review plus CI, merge, then task closure and a final
checkpoint. Before the first repository commit, worktrees and PRs are not yet
available; shared-checkout work is allowed only with explicit disjoint scopes
and no commit or push unless authorized.

Documentation synchronization is part of the definition of done for every
change that affects public behavior, architecture, security, interfaces,
operations, compatibility, deprecation, or release notes.
