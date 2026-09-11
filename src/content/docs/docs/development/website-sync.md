---
title: Website Sync Contract
description: Developer guide to the pinned docs-to-website mirror, route mapping, and parity gates
category: development
audience: contributor
document_type: guide
status: draft
website_publish: true
sidebar_order: 25
---

# Website Sync Contract

This guide translates the accepted
[Website Delivery RFC](../specifications/website-delivery-rfc.md)
and [Website content contract](../project/website-content-contract.md)
into the developer command surface. It does not invent product code,
does not authorize shipped behavior, and does not weaken the normative
English-only, metadata, or link gates.

The pipeline is owned by `bitty-website` under CarryCtx `CTX-0017` and
consumes the pinned revision. This guide records the developer command
surface and the operator procedure; the canonical prose remains in this
repository and is never hand-copied into the website.

## Source of truth

`bitty-docs` owns canonical prose, metadata, source paths, and internal
links. `bitty-website` is a static presentation shell. It must not fork,
copy-paste, or silently rewrite a specification. Any file outside
`bitty-website/src/content/docs/` that is a verbatim copy of a docs body
is a non-duplication violation (LD-6) and must be removed in favor of the
loader path.

The website consumes only a pinned immutable revision. Floating branches
such as `main` are never a publishable input.

## Pinned mirror (SY-2)

The single source of truth for the consumed corpus is
`bitty-website/src/content/docs-revision.json`:

```json
{
  "revision": "847725635893fad0fa120128aabab3918807fc0f",
  "source": "github.com/bitty-terminal/bitty-docs",
  "synced_at": "2026-08-29T14:33:51.959Z"
}
```

`revision` is a full 40-character commit SHA or an immutable tag that
resolves to a single SHA. The file has no extra keys and is committed.

Synchronization is the single command defined by SY-2:

```sh
bun run sync:docs --pin <40-char-sha-or-tag>
```

Behavior, per the RFC and `bitty-website/scripts/sync-docs.mjs`:

1. Reject a missing `--pin`, a short SHA, or a floating name such as
   `main` (SY-3) — fail closed.
2. Resolve the pin to a single commit SHA (`git rev-parse <pin>^{commit}`);
   peel a tag to its commit SHA.
3. Materialize the pinned tree in an isolated temporary clone: when a
   local `bitty-docs` checkout contains the pin (derived from
   `BITTY_DOCS_REPO_PATH`, `BITTY_WORKSPACE`, or an ancestor checkout),
   clone it locally; otherwise clone the remote derived from the pin's
   `source` field. The command never checks out, detaches, stashes, or
   otherwise mutates the shared `bitty-docs` working tree.
4. Run the canonical four parity gates (`metadata`, `language`, `links`,
   `hygiene`) on that pinned snapshot before copying anything.
5. Clear stale content and copy the pinned `docs/` tree into
   `bitty-website/src/content/docs/docs/`, including non-Markdown assets
   needed by rendered pages.
6. Regenerate the provenance manifest and write the pin back to
   `src/content/docs-revision.json`. `synced_at` advances only when the
   revision changes, so re-running the same pin is a byte-for-byte no-op
   and the command is idempotent.

Manual edits inside `src/content/docs/` are not allowed. The directory is
a generated read-only mirror of the pin (SY-4). A commit that changes
rendered documentation without updating the pin is a hygiene failure;
`bun run docs:check` fails closed when the committed mirror or manifest
diverges from the pinned revision.

## Provenance manifest

The canonical frontmatter schema is closed to exactly eight flat fields
(LD-2), so provenance is recorded in a generated manifest rather than by
adding keys that would break source parity:

```text
bitty-website/src/content/docs-manifest.json
```

The manifest names the `revision` and `source` and maps every mirrored
source-relative path to its SHA-256. The manifest key set equals the
mirrored file set, and each hash matches the bytes in
`src/content/docs/docs/`. This makes provenance (`source path + revision`)
and hand-edit detection mechanical, and keeps the mirrored Markdown
byte-identical to the pinned canonical file.

## Staleness gate (SY-4)

`bun run docs:check` (also `just docs-check`) materializes the pinned
revision read from `src/content/docs-revision.json`, re-runs the parity
gates on the pinned snapshot, and compares the committed mirror and
manifest byte-for-byte against it. It exits non-zero with an actionable
file list when:

- the pin is missing, malformed, a short SHA, or a floating branch;
- a mirrored file was hand-edited or removed;
- a file added to the pinned revision is missing from the mirror;
- a file added under `src/content/docs/docs/` does not exist at the pin;
- the manifest key set, hashes, `revision`, or `source` disagree with the
  committed mirror or the pin.

The website build runs this gate before `astro build`, so CI fails on
stale content instead of publishing a mixed corpus.

## Pin validation (SY-3)

The Astro build imports the pin and fails closed when:

- the pin file is missing or malformed;
- the pin names a floating branch;
- the copied tree does not match the pin (or the peeled tag SHA).

Stale-content detection (SY-4) runs as `bun run docs:check` before the
build and compares the committed mirror and manifest against the pinned
revision. Preview builds may render a candidate pin but must surface it
(for example `<!-- docs-revision: <sha> -->`) and must not be promoted to
production without advancing the pin to the merged docs SHA.

## Publication filtering (LD-3)

The loader validates every file before filtering. Only after a file
passes the eight-field frontmatter schema, the `title == H1` check, and
the language and link checks does the loader keep entries where
`website_publish: true`. Filtering before validation is a failure — a
file with `website_publish: false` still fails the build when its
frontmatter is malformed or its body contains CJK. The schema is the
single `z.object` in `bitty-website/src/content.config.ts` (LD-2) that
mirrors [Documentation workflow](documentation-workflow.md).

## Route mapping (RM-1..RM-4)

The deterministic mapping is:

```text
source: docs/<category>/<path>.md
route:  /docs/<version>/<category>/<slug>/
```

- `README.md` maps to the category index
  `docs/<category>/README.md -> /docs/<version>/<category>/` and
  `docs/README.md -> /docs/<version>/` (RM-2).
- The category is the single segment after `docs/`; subdirectories
  preserve hierarchy (`docs/specifications/foo/bar.md` maps to
  `/docs/<version>/specifications/foo/bar/`).
- Only `.md` files are routable; only the final segment is slugified
  (lowercased, non-alphanumerics collapsed to `-`); hierarchy is
  otherwise preserved case-sensitively (RM-1).
- Source-relative path is the authoritative content identity (RM-3).
- If two distinct eligible sources would map to the same public route,
  validation rejects the build. The fix belongs in `bitty-docs` by
  renaming the source and declaring a redirect, not by patching the
  mapper (RM-4).

The function lives in exactly one module,
`bitty-website/src/lib/docsRoutes.ts` (RM-6), with collision fixtures
and a negative collision test.

## Version selector (RS-3)

The selector is presentation-only and data-driven from
`bitty-website/src/content/versions.json` (RS-1):

```json
{
  "latest": "0.1.0",
  "stable": "0.1.0",
  "versions": [
    {
      "version": "0.1.0",
      "revision": "847725635893fad0fa120128aabab3918807fc0f",
      "label": "latest — 2026-08-29T12:50:39Z",
      "prerelease": false
    }
  ]
}
```

Navigation rewrites only the version segment
`/docs/<from>/<path>` to `/docs/<to>/<path>` (RS-3), preserving query
and hash. When the same content identity exists in the target revision,
navigation lands there; otherwise it falls back to the target revision's
index `/docs/<to>/`. The router accepts only version segments that are
`latest`, `stable`, or a listed `versions[].version` (RS-5).

## Redirects (RD-3/RD-4)

Intent lives in `bitty-docs/docs/project/redirects.json` (RD-2);
implementation lives in `bitty-website/src/redirects.json` (RD-3).
At build time the website merges both and emits Astro `redirects` plus
`dist/_redirects` for Cloudflare Workers Static Assets.

- `old` and `new` are exact `/docs/` prefixes ending with `/`, without
  the version segment; the website expands them per hosted version.
- `status` is `301` for moves and `302` only for deprecated aliases.
- Validation rejects (RD-4): an `old` with no previously published
  target, a `new` with no currently published target, loops, chains
  longer than one hop, duplicate `old` entries, wildcard or regex
  patterns, and external destinations.
- The expanded per-version table is emitted as a build artifact
  (`dist/redirects.json`) for review (RD-6).

A rename or removal of a file with `website_publish: true` must declare
`Old identity`, `New identity`, `Reason`, `Effective version`,
`Redirect`, and replacement guidance in the docs pull request (RD-1).

## Parity gates (`check-docs.mjs`)

The sync command re-runs the canonical four gates on the pinned snapshot
so the mirror cannot drift from the source:

- `metadata` — eight flat frontmatter fields, `title == H1`,
  category/audience/document_type/status enums, unquoted boolean and
  integer checks;
- `language` — no Han, Hiragana, Katakana, Hangul, Bopomofo, or
  `U+3000-303F` range;
- `links` — unresolved local targets, missing fragments, or directory
  links without an index fail closed without network access;
- `hygiene` — no generated, temporary, database, or editor artifacts
  inside the mirrored tree.

The website build separately runs its own `just check` (format, lint,
typecheck, static build, Wrangler dry-run) and the same source-of-truth
rule applies: filtering by `website_publish` never hides a malformed
file.

## Static site and reproducibility

The website is static (`astro build` to `dist/`, Workers Static Assets).
There is no server-side docs fetch at request time. Every published page
is traceable to exactly one `bitty-docs` SHA via
`src/content/docs-revision.json`, `src/content/docs-manifest.json`, and
`src/content/versions.json`; rebuilding the website at the recorded
commit and pin reproduces the same `dist/`. Until public domains are
registered, the placeholder origin is `bitty.xuepoo.xyz` and no
deployment has been performed or verified — the deployment workflow
remains configuration only.

## Operator: refreshing documentation into the website

The canonical corpus stays in `bitty-docs`; the website is a pinned,
generated mirror. To publish a docs change:

1. Merge the `bitty-docs` change (content, metadata, links, and
   `docs/project/redirects.json` when a published identity moves) after
   its `just check` is green, and record the merged commit SHA.
2. In a `bitty-website` worktree, advance the pin and regenerate the
   mirror:

   ```sh
   just docs-sync PIN=<merged-docs-sha>
   # equivalent: bun run sync:docs --pin <merged-docs-sha>
   ```

3. Verify the mirror is current and reproducible:

   ```sh
   just docs-check
   just check
   ```

4. Commit the regenerated `src/content/docs/`,
   `src/content/docs-manifest.json`, and the advanced
   `src/content/docs-revision.json` in one change, and open the website
   pull request linked to the docs pull request and the owning CarryCtx
   task.

Never hand-edit `src/content/docs/` or `src/content/docs-manifest.json`;
the next `docs:check` catches it. A mirrored copy is never the source.

## Continuous recording rule

Canonical documentation is recorded continuously, not retroactively:
every merged `bitty-docs` change that alters publishable content leaves
the website pin one revision behind until the website pin-advance change
merges. The website must be re-pinned as part of the same delivery
window, and `docs:check` fails CI while the mirror and pin disagree. If
the docs change and the website pin advance cannot ship together, the
docs task stays open or carries a blocking dependency on the website
task; the website never publishes a stale or duplicated contract.

The deterministic `docs:check` gate is the release blocker. A scheduled
cross-repository freshness check that compares the pin against the
`bitty-docs` default branch remains follow-up work and is not claimed
here.

## Cross-repository ordering

1. The `bitty-docs` change updates content, metadata, links, and
   `docs/project/redirects.json` when a published identity moves, and
   passes `just check`.
2. The `bitty-website` change advances the pin to that exact docs SHA
   via `bun run sync:docs --pin <sha>`, implements presentation or
   routing changes, and passes `just check` with the new pin.
3. Each pull request links the other (`Docs-PR`, optional `Code-PR`,
   `RFC: Website Delivery RFC OQ-023`, `CarryCtx: CTX-XXXX`) and names
   ordering constraints.
4. Independent review and CI pass in both repositories before any
   publish.

A content change is not done when the website would publish stale or
duplicated contracts. A website integration is not done when it bypasses
the metadata, language, link, revision-pin, publication,
route-collision, or redirect gates.
