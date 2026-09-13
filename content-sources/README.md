# Content sources (placeholder)

This directory reserves the build-time aggregation layout for canonical Bitty
documentation. It holds no fetched content: the website currently consumes one
pinned `bitty-docs` revision, materialized under `src/content/docs/` by
`scripts/sync-docs.mjs`.

## Target sources (deferred)

The 2026-09-14 project decision names three canonical repositories, each to be
consumed from an immutable pinned revision and aggregated at build time:

- `bitty-terminal-docs` — terminal product, architecture, configuration, and
  API documentation.
- `bitty-plugins-docs` — plugin development guides and plugin API reference.
- `bitty-ai-docs` — AI subsystem documentation.

The currently pinned repository is `bitty-docs`, so the target naming above is
direction, not an implemented rename or split. Multi-source aggregation,
per-source pins, and route prefixes require an accepted decision and a scoped
task. Until then `src/content/docs-revision.json` and
`src/content/docs-manifest.json` remain the single authoritative pin and
provenance record, and `src/content/docs/` stays a generated, read-only
mirror.

## Planned layout (not implemented)

A future aggregation step is expected to materialize each pinned source in an
isolated snapshot, validate its metadata, language, links, and publication
eligibility, and merge eligible documents by source identity. Directory names,
pin files, route prefixes (`/docs/`, `/api/`, `/ai/`), and conflict rules
belong to that scoped task.

## Boundaries

- The plugin store at <https://plugins.bitty.run> is a separate Vite
  application, not a documentation source for this directory.
- Only content explicitly eligible for website publication per the canonical
  content contract may be aggregated.
- Canonical content stays English-only until an accepted cross-repository
  decision.
