# Content sources

This directory documents the build-time aggregation layout for canonical Bitty
documentation. It holds no fetched content: the mirror is generated under
`src/content/docs/` by `scripts/sync-docs.mjs` and is never edited by hand.

## Implemented model: four pinned sources

`src/content/docs-revision.json` (schema 2) is the pin authority. It records one
entry per consumed source, each with the same shape:

- `bitty-docs` — canonical governance content and the revision index, mounted
  at the mirror root (`docs/` → ``).
- `bitty-terminal-docs` — mounted at `projects/bitty`.
- `bitty-plugins-docs` — mounted at `projects/plugins`.
- `bitty-ai-docs` — mounted at `projects/bitty-ai`.

Every entry carries `id` (the handle `--source` takes), `source` (the slug the
pin resolves against), `revision` (the immutable revision that source is
materialized at), `mounts` (the source-relative subtree and the mirror prefix it
lands under), `published` (the band the source's published-page count must stay
inside), and `synced_at` (when the mirror last matched the pin).

A source's mount **is** its route prefix: `projects/bitty/architecture/x.md`
publishes at `/docs/<version>/projects/bitty/architecture/x/`. No other docs
route prefix exists.

Read the pin file for the current revisions, mounts, and bands — they advance
per source and are not restated here. `src/lib/docsPins.ts` is the schema and
mount-mapping authority: the parser and `assertSourcePublishedBand` reject a
malformed pin set, an overlapping mount, a missing revision-index owner, or a
published band that no longer holds, and the unit tests assert exactly those
rejections.

## Gates and how to run them

- `just docs-sync` — re-materializes every pinned source at its committed
  revision. A second consecutive run is a byte-for-byte no-op.
- `just docs-sync --source <id> --pin <sha|tag>` — advances exactly one source.
  `--source` is required together with `--pin` while more than one source is
  pinned; the revision must be a full lowercase SHA or an immutable tag; the
  `--pin=<value>` and `--source=<value>` forms are also accepted, and a
  `PIN=<sha>` just-variable is not (it fails as an unknown argument).
- `just docs-check` — the fail-closed per-source staleness, parity, mount, and
  eligibility gate; it runs inside `just check`, so CI fails on a hand-edited
  mirror file or a source that drifts from its pin.
- `just dist` — the Astro build plus `validate:dist`, which requires the
  provenance artifact below and cross-checks it against the pin file.

## Evidence and provenance

- `src/content/docs-revision.json` — the pins (schema 2).
- `src/content/docs-manifest.json` — the provenance record written by the sync:
  per-source parity results, counts, per-file SHA-256, and the published routes.
- `dist/docs-provenance.json` — the deployed provenance artifact, written by the
  Astro build hook in `astro.config.mjs` and required non-empty by
  `scripts/validate-dist.mjs`, which also cross-checks each source's revision
  against `dist/redirects.json`'s `docs_revisions`.
- Publication policy: `src/lib/publicationPolicy.ts` owns the rule and its
  `PUBLICATION_POLICY_VERSION`; the three reviewed, shrink-only data files are
  `src/lib/publication-allow-list.json` (eligible exceptions),
  `src/lib/publication-flip-list.json` (demotions that ship a 301), and
  `src/lib/publication-withhold-list.json` (declared but ineligible pages, with
  the corpus `owner` that must fix them; these ship no route).
- Freshness: `.github/workflows/docs-freshness.yml` reports one row per pinned
  source in a single tracking issue carrying the `docs-freshness` label, and its
  `docs-freshness:v2` marker records every pin.

## Frontmatter contract

The website collection schema (`src/content.config.ts`, strict) requires
exactly eight flat fields on every mirrored page: `title`, `description`,
`category`, `audience`, `document_type`, `status`, `website_publish`,
`sidebar_order`. The corpora's metadata gate requires the same eight, so the
contract is identical on both sides. There is no `last_updated` field.

## Boundaries

- The plugin store at <https://plugins.bitty.run> is a separate Vite
  application, not a documentation source for this directory.
- Only content explicitly eligible for website publication per the canonical
  content contract may be aggregated; the publication policy above is the
  website-side expression of that rule.
- Canonical content stays English-only until an accepted cross-repository
  decision. The corpora own their frontmatter, so an ineligible page is fixed
  in the owning corpus, never by an exception here.
