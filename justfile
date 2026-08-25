set shell := ["bash", "-euo", "pipefail", "-c"]

default: check

install:
    bun install --frozen-lockfile

fmt:
    bun run format

fmt-check:
    bun run format:check

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
