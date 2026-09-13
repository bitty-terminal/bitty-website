# Bitty Website

This repository contains the static website for the Bitty project. It renders
the marketing shell plus the canonical `bitty-docs` documents whose frontmatter
sets `website_publish: true`, consumed from one pinned revision. It does not
publish product features, search, analytics, localized content, or an
unversioned routing contract.

Canonical technical documentation remains owned by `bitty-docs`; this
repository only mirrors and presents it. The authoritative mechanism,
route mapping, and operator contract live in the canonical `bitty-docs`
guide `docs/development/website-sync.md` (Website Delivery RFC, OQ-023).

## Target stack and site map (deferred)

The 2026-09-14 project decision selects Astro plus Astro Starlight for the
Bitty developer portal at <https://bitty.run>. No part of that migration is
implemented yet: this repository remains the Astro static shell and pinned
`bitty-docs` mirror described above, and Starlight adoption, UI/UX,
internationalization, themes, search, and deployment automation are deferred
to the 0.1.0 release window. The canonical Website Delivery RFC still lists a
required Starlight theme as deferred; recording the target here does not
change that contract, and the presentation decision must be accepted before
migration work starts.

Target site map (planned; not routed yet):

| Route                   | Planned purpose                                                             |
| ----------------------- | --------------------------------------------------------------------------- |
| `/`                     | Home: why Bitty, features, install                                          |
| `/docs/...`             | Getting started, configuration, keybindings, panels, IPC, Lua, architecture |
| `/api/...`              | Lua, plugin, and IPC reference                                              |
| `/plugins/`             | Entry point that links or redirects to <https://plugins.bitty.run>          |
| `/ai/`                  | AI subsystem documentation                                                  |
| `/blog/`, `/changelog/` | Announcements and release history                                           |

The plugin store is a separate Vite application at
<https://plugins.bitty.run>; it is not built, deployed, or documented from this
repository. Canonical content is planned to be aggregated at build time from
three pinned sources — `bitty-terminal-docs`, `bitty-plugins-docs`, and
`bitty-ai-docs` — while only the single pinned `bitty-docs` revision is
consumed today (see `src/content/docs-revision.json`). The source naming and
multi-source aggregation require an accepted decision before implementation.

`astro.config.mjs` records the canonical origin as
`site: "https://bitty.run"`. The domain is registered through Cloudflare;
verification and any real deployment are still pending. `i18n/` and
`content-sources/` are documented placeholders for the deferred locale layout
and source-aggregation plan; they contain guidance only.

## See the project workflow (CarryCtx)

CarryCtx is the local-first tool that records this project's tasks, decisions,
and checkpoints. Install it globally for local development (recommended):

```sh
cargo install carryctx      # Rust toolchain, or: npm i -g carryctx
```

CarryCtx engineering state (tasks, sessions, checkpoints) is not cloned. A
fresh clone restores it from the in-repo `refs/heads/carryctx-snapshots`
branch:

```sh
just workflow-import-dry   # fetch + validate the snapshot; no DB writes
just workflow-import       # initialize CarryCtx state if needed, then import
```

Then `carryctx stats` reports the restored tasks, sessions, and checkpoints.
Provenance, redaction, and `--force` behavior are covered under the
repository snapshot documentation below.

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

The aggregate check verifies formatting, Markdown linting, the docs mirror
staleness gate, TypeScript 7.0.2 with its native compiler, the Astro static
build, the expected `dist/index.html` output, Wrangler's deployment
configuration in dry-run mode, and both GitHub Actions workflows.

## Documentation sync

Never edit `src/content/docs/` by hand: it is a generated, read-only mirror of
the pinned `bitty-docs` revision. The single pin lives in
`src/content/docs-revision.json`; `src/content/docs-manifest.json` records the
per-file provenance (source path, SHA-256, revision).

Advance the mirror to a merged, reviewed `bitty-docs` commit:

```sh
just docs-sync PIN=<merged-docs-sha>   # or: bun run sync:docs --pin <sha>
just docs-check                        # fail-closed staleness gate
```

`just check` runs `docs:check`, so CI fails when the mirror or manifest drifts
from the pinned revision or was hand-edited. Canonical documentation is the
source and must be recorded continuously: a docs change is not complete until
the website pin advances in the same delivery window. See the canonical
operator note for the full procedure.

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

## Workflow snapshot restore

CarryCtx runtime state (`.git/carryctx/state.sqlite`) is never cloned. The
redacted engineering snapshot lives in this repository on branch
`refs/heads/carryctx-snapshots`, one commit per publication. The commander's
merge closeout publishes it with `just workflow-publish`; a fresh clone restores
its local CarryCtx DB from that branch:

```sh
just workflow-import-dry   # fetch + validate the snapshot; no DB writes
just workflow-import       # initialize CarryCtx state if needed, then import
```

The import fetches `refs/heads/carryctx-snapshots`, refuses to replace a
non-empty local DB without `--force` (`just workflow-import --force`), and
prints provenance (snapshot commit + source). Snapshots are redacted
publication artifacts produced by `carryctx export --publication`: CarryCtx
refuses them as merge sources, so restore always uses replace mode, and a
secret that leaked before rotation must still be rotated at the source.

## Deployment boundary

The deployment workflow is manual, restricted to the main branch, and guarded
by the production environment. Its presence is configuration only: no
deployment has been performed or verified by this bootstrap. The canonical
origin for the portal is <https://bitty.run>; domain verification through
Cloudflare is still pending, and deploy or release automation changes are
deferred to the 0.1.0 window under a scoped task.

The workflow references the approved GitHub secret names only at the deployment
step. Never place credential values in source files, command arguments, logs,
artifacts, or task records.
