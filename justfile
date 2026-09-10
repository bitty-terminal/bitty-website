set shell := ["bash", "-euo", "pipefail", "-c"]

default: check

install:
    bun install --frozen-lockfile

fmt:
    bun run format

fmt-check:
    bun run format:check

fmt-check-files *FILES:
    test -x node_modules/.bin/prettier || { echo "dependencies missing; run 'just install' first" >&2; exit 1; }
    bunx --bun prettier --check --ignore-unknown {{FILES}}

markdownlint:
    bun run lint:md

commit-lint FILE:
    test -x node_modules/.bin/commitlint || { echo "dependencies missing; run 'just install' first" >&2; exit 1; }
    bunx --bun commitlint < "{{FILE}}"

hooks-install:
    lefthook install

typecheck:
    bun run typecheck

build:
    bun run build

dist: build
    bun run validate:dist

wrangler-dry-run: dist
    bun run wrangler:dry-run

actionlint:
    actionlint .github/workflows/*.yml

check:
    bun run check
    actionlint .github/workflows/*.yml

# Publish a ctxpack snapshot to the bitty-website-workflow mirror (commander
# merge closeout only; never a git hook). Dry run exports + validates without push.
workflow-publish *args:
    bash scripts/publish-ctxpack.sh {{args}}

workflow-publish-dry *args:
    bash scripts/publish-ctxpack.sh --dry-run {{args}}

# Restore the local CarryCtx DB from the bitty-website-workflow mirror LATEST
# snapshot (fresh-clone recipe). Refuses to replace a non-empty local DB
# without --force, e.g. `just workflow-import --force`.
workflow-import *args:
    bash scripts/fetch-ctxpack.sh {{args}}

workflow-import-dry *args:
    bash scripts/fetch-ctxpack.sh --dry-run {{args}}
