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

The aggregate check verifies formatting, TypeScript 7.0.2 with its native
compiler, the Astro static build, the expected `dist/index.html` output,
Wrangler's deployment configuration in dry-run mode, and both GitHub Actions
workflows.

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

## Deployment boundary

The deployment workflow is manual, restricted to the main branch, and guarded
by the production environment. Its presence is configuration only: no
deployment has been performed or verified by this bootstrap.

The workflow references the approved GitHub secret names only at the deployment
step. Never place credential values in source files, command arguments, logs,
artifacts, or task records.
