set shell := ["bash", "-euo", "pipefail", "-c"]

default: check

lefthook_version := "2.1.10"

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
    bunx --bun lefthook@{{lefthook_version}} install

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
