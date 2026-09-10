# Bitty Website

This repository contains the minimal static website foundation for the Bitty
project. It is a pre-implementation shell: it does not publish canonical
documentation, product features, search, analytics, localized content, or a
public routing contract.

Canonical technical documentation remains owned by `bitty-docs`. A future,
separately reviewed task must define how a pinned documentation revision is
validated and presented here.

## Requirements

- Bun 1.4.0
- just
- actionlint 1.7.12

## Local checks

Install the exact dependency graph recorded in `bun.lock`:

```sh
bun install --frozen-lockfile
```

Run the same logical quality gates used by CI:

```sh
just check
```

The aggregate check verifies formatting, Markdown linting, TypeScript 7.0.2
with its native compiler, the Astro static build, the expected `dist/index.html`
output, Wrangler's deployment configuration in dry-run mode, and both GitHub
Actions workflows.

Git hooks managed by lefthook enforce Conventional Commits messages and
pre-commit formatting plus Markdown linting on staged files. Install them once
per clone with `just hooks-install`; every hook runs through a justfile target.

Astro 7.2.6 cannot currently run `astro check` with TypeScript 7 because its
language service depends on a programmatic API that the native compiler does
not yet expose. The native TypeScript check does not replace Astro's full
language-server diagnostics; the static build separately compiles the Astro
template. Upstream support is tracked in the official
[Astro TypeScript 7 compatibility discussion](https://github.com/withastro/roadmap/discussions/1321).
Restoring the full Astro diagnostics gate requires a separately reviewed task
after that support is available.

Use `just fmt` only when intentionally updating formatting. Generated build and
Wrangler dry-run output are not repository content.

## Workflow mirror restore

CarryCtx runtime state (`.git/carryctx/state.sqlite`) is never cloned. The
engineering workflow is mirrored to
[bitty-website-workflow](https://github.com/bitty-terminal/bitty-website-workflow)
as redacted ctxpack snapshots, with `LATEST` naming the newest snapshot. A
fresh clone can restore its local CarryCtx DB from that mirror:

```sh
just workflow-import-dry   # fetch + validate the LATEST snapshot; no DB writes
just workflow-import       # initialize CarryCtx state if needed, then import
```

The import validates snapshot shape, per-table row counts, and the v2 redacted
stamp before any write, refuses to replace a non-empty local DB without
`--force` (`just workflow-import --force`, or pass flags directly to
`scripts/fetch-ctxpack.sh`), and prints provenance (snapshot id + source
commit) plus restored counts. Mirror snapshots are redacted publication
artifacts: CarryCtx refuses them as merge sources, so restore always uses
replace mode, and a secret that leaked before rotation must still be rotated
at the source.

## Deployment boundary

The deployment workflow is manual, restricted to the main branch, and guarded
by the production environment. Its presence is configuration only: no
deployment has been performed or verified by this bootstrap.

The workflow references the approved GitHub secret names only at the deployment
step. Never place credential values in source files, command arguments, logs,
artifacts, or task records.
