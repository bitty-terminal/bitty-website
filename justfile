set shell := ["bash", "-euo", "pipefail", "-c"]

default: check

install:
    bun install --frozen-lockfile

# Fresh worktrees do not carry node_modules (gitignored). Without local deps,
# `bunx` silently provisions a foreign astro whose tsconfig resolver fails
# with a misleading `Tsconfig not found` error, so fail fast with the fix.
[private]
ensure-deps:
    test -x node_modules/.bin/astro || { echo "dependencies missing; run 'just install' first" >&2; exit 1; }

fmt:
    bun run format

fmt-check:
    bun run format:check

fmt-check-files *FILES:
    command -v prettier >/dev/null || { echo "prettier missing; install it globally" >&2; exit 1; }
    prettier --check --ignore-unknown {{FILES}}

markdownlint:
    bun run lint:md

# Advance the pinned bitty-docs mirror and regenerate the provenance manifest (SY-2).
docs-sync PIN:
    bun run sync:docs --pin {{PIN}}

# Fail closed when the committed mirror is stale vs the pinned revision (SY-4).
docs-check:
    bun run docs:check

commit-lint FILE:
    command -v commitlint >/dev/null || { echo "commitlint missing; install it globally" >&2; exit 1; }
    commitlint < "{{FILE}}"

hooks-install:
    lefthook install

typecheck: ensure-deps
    bun run typecheck

build: ensure-deps
    bun run build

dist: build
    bun run validate:dist

wrangler-dry-run: dist
    bun run wrangler:dry-run

actionlint:
    actionlint .github/workflows/*.yml

check: ensure-deps
    bun run check
    actionlint .github/workflows/*.yml

# Publish a redacted CarryCtx snapshot inside this repo (commander merge
# closeout only; never a git hook). `carryctx export --publication` redacts the
# bundle, stamps manifest.redacted, and commits one snapshot to the fixed ref
# `refs/heads/carryctx-snapshots`; the target pushes that branch only when the
# local ref advanced (native carryctx commits one snapshot per export, so a
# re-run publishes again rather than no-opping). Canonical closeout runs from
# the primary checkout on branch main
# (`cd "$BITTY_WORKSPACE/bitty-website" && just workflow-publish`); a detached
# or feature worktree records that branch as the snapshot source. Dry run
# validates the export and writes neither the ref nor the remote.
workflow-publish *args:
    bash scripts/workflow-publish.sh {{args}}

workflow-publish-dry *args:
    bash scripts/workflow-publish.sh --dry-run {{args}}

# Restore the local CarryCtx DB from the in-repo snapshot branch
# `refs/heads/carryctx-snapshots` (fresh-clone recipe). Refuses to replace a
# non-empty local DB without --force, e.g. `just workflow-import --force`.
workflow-import *args:
    bash scripts/workflow-import.sh {{args}}

workflow-import-dry *args:
    bash scripts/workflow-import.sh --dry-run {{args}}
