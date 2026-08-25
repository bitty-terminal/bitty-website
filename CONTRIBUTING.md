# Contributing

Thank you for considering a contribution. This repository is in a
pre-implementation, documentation-first phase: governance and toolchain
scaffolding are being established before any website implementation work.

Read [AGENTS.md](AGENTS.md) first. It defines the repository scope, delivery
lifecycle, content rules, and security expectations that every contribution
must follow.

## Prerequisites

- Bun 1.4.0 — JavaScript runtime and package manager (`bun`, never `npm` or `yarn`)
- `just` — command runner; all quality gates run through the repository justfile
- Wrangler (pinned via devDependencies) — used by local dry-run checks only
- `actionlint` — GitHub Actions workflow validation

## Setup

```bash
just install
just hooks-install
```

`hooks-install` registers the lefthook-managed Git hooks. The pre-commit hook
checks formatting and lints Markdown on staged files; the commit-msg hook
validates Conventional Commits. Both run through justfile targets, so no tool
is invoked directly and every version pin stays in its single declared place.

## Development loop

All checks go through the justfile:

```bash
just check   # format + Markdown lint + typecheck + build + dist validation + wrangler dry-run + actionlint
just fmt     # write formatting fixes
just build   # static production build into dist/
```

Do not invoke formatters, linters, or package managers directly; the justfile
owns the pinned versions.

## Committing

Use Conventional Commits:

```text
feat(nav): add skip-to-content link
fix(seo): correct canonical URL generation
docs(readme): clarify local quality gates
chore(deps): pin prettier to 3.9.6
```

Commit subjects stay in English and describe observable changes.

## Delivery lifecycle

Changes follow the standard lifecycle:

1. GitHub Issue stating outcome, acceptance criteria, risks, and documentation impact.
2. CarryCtx task with team, required role, dependencies, scopes, and owner.
3. Branch (and isolated worktree once the repository has its first commit).
4. Focused commits traceable to the Issue and task.
5. Pull request naming verification evidence and documentation effects.
6. Independent review plus required CI.
7. Merge only after cross-repository changes are ready in the correct order.

Implementers stop at review; a separate reviewer verifies evidence before
merge. Commits, pushes, deployments, and publication require explicit task
authority.

## Quality gates

`just check` is the merge gate. Changes remain incomplete while affected
canonical documentation (primarily in `bitty-docs`) is stale. Never describe
planned website behavior, routes, integrations, builds, or deployment as
available without current evidence.
