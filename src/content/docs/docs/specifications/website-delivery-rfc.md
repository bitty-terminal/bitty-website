---
title: Website Delivery RFC
description: Defines the accepted loader, synchronization mechanism, release selector, multi-version URL scheme, route mapping, and redirect manifest for the website content contract for OQ-023
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 22
---

# Website Delivery RFC

> Status: **accepted** on 2026-08-29 by the project initiator. This document defines the accepted loader, synchronization mechanism, release selector, multi-version URL scheme, route mapping, and redirect manifest that implement the
> [Website content contract](../project/website-content-contract.md) and
> its ownership split with the [Repository map](../project/repository-map.md) at the design level; it closes [OQ-023](../decisions/open-questions.md). It does not describe implemented behavior, does not authorize shipped,
> stable, normative, or compatibility-guaranteed behavior, and does not weaken any normative security control. Experimental implementation may exist as review evidence
> but carries no compatibility promise beyond the accepted contract. Acceptance was per independent category-owner, docs-curator, and
> security-auditor review (CTX-0079) with P0 sign-off on 2026-08-29; see [P0 Review Sign-off](#p0-review-sign-off) and the
> [P0 review checklist](../reviews/p0-review-checklist.md). The lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## Purpose and scope

[OQ-023](../decisions/open-questions.md) asks: _which loader or
synchronization mechanism, release selector, multi-version URL scheme, route
mapping, and redirect manifest implement the website content contract?_ Its
canonical documents today are the
[Website content contract](../project/website-content-contract.md), which fixes
ownership, pinned-input, path, and cross-repository rules but intentionally
defers theme, renderer, loader, copy mechanism, deployment target, preview
service, release selector, and multi-version URL scheme, and the
[Repository map](../project/repository-map.md), which fixes the polyrepo
topology and notes that loader, synchronization, version selection, routes, and
theme remain open. This RFC answers OQ-023 at the delivery-mechanism level
without inventing product code or claiming a shipped website.

In scope:

- Astro loader that consumes validated `bitty-docs` Markdown and its shared
  frontmatter schema, including filtering by `website_publish`;
- synchronization mechanism from a pinned immutable `bitty-docs` revision into
  `bitty-website` with reproducible evidence;
- release selector data model and presentation contract;
- multi-version URL scheme for simultaneously hosted documentation revisions;
- deterministic route mapping from source-relative identity to public route,
  including `README.md` index handling and collision policy;
- redirect manifest ownership, file placement, format, and lifecycle;
- validation, failure modes, and cross-repository delivery ordering for the
  above.

Out of scope (owned elsewhere):

- theme, component library, search index, SEO, accessibility rendering, and
  analytics (owned by `bitty-website` presentation per the contract; this RFC
  only constrains their input and routing inputs);
- product, platform, and performance contracts (OQ-001, OQ-003/OQ-004, accepted
  in [Performance Budget RFC](performance-budget-rfc.md),
  [ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md), and
  [Compatibility Milestone RFC](compatibility-milestone-rfc.md));
- crate topology and toolchain pins (OQ-005/OQ-006, [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) and [ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md));
- configuration, plugin, isolation, and rich presentation contracts
  (OQ-008 through OQ-016, accepted in their respective RFCs);
- CLI, IPC, DevTools, Headless, package, governance, and risk-evidence
  contracts (OQ-017 through OQ-022, OQ-024, OQ-025).

This RFC introduces no new trust boundary. Every transition from untrusted
Markdown or frontmatter into a rendered page or redirect stays behind the
validation, pinned-revision, and review gates already normative in the security
corpus, and it does not weaken the English-only corpus rule.

## Normative sources this specification must not weaken

- [Website content contract](../project/website-content-contract.md): ownership
  split, pinned immutable revision, `website_publish`-gated eligibility,
  source-relative identity as default, docs-owned move and deprecation
  decisions, website-owned router and redirect implementation, rejected broken
  links and route collisions, duplicated specification prohibition, Astro
  content-collections compatibility note, and cross-repository delivery
  ordering.
- [Repository map](../project/repository-map.md): polyrepo topology, umbrella
  and `bitty-plugins/` as grouping-only, seven formal repositories with
  protected `main`, `bitty-website` as Astro/Bun/Workers Static Assets shell
  without a docs consumer, and pending-decisions list that this RFC closes for
  OQ-023.
- [Documentation workflow](../development/documentation-workflow.md): English-only
  corpus, flat frontmatter schema, `title` equals H1, category/audience/type
  enums, `website_publish` and `sidebar_order` semantics, status meanings
  (`draft` does not authorize shipped behavior, lifecycle
  `Draft -> experimental review evidence -> Accepted -> normative`), change-
  trigger matrix for file moves and publishing changes, and deprecation and
  redirect requirements.
- [Security overview](../security/overview.md): default posture that all
  external input is untrusted until a narrow grant, invariants on least
  privilege and fail-closed behavior, and the rule that deferral must not
  create a bypass.
- [Threat model](../security/threat-model.md): untrusted Markdown, frontmatter,
  URLs, assets, dependencies, and build inputs as attack surface; safe-mode
  expectations where applicable.
- [Decision register](../decisions/index.md): DIR-007, DIR-010, DIR-011 as the
  accepted website-orientation directions and the candidate-queue entry for the
  publishing mechanism that this RFC occupies.
- [Documentation map](../README.md): navigation authority, language and
  metadata rules, and the principle that the maintained topic document is the
  source of truth.
- [Toolchain policy](../development/toolchain-policy.md): pinned `prettier`
  3.9.6, `markdownlint-cli2` 0.23.1, `actionlint` 1.7.12, Bun 1.4.0, Astro
  7.2.6, and the `just check` gate that this RFC must keep green.

Where this RFC picks concrete defaults, it refines the candidate material
above; it does not move a requirement between owners or relax a gate. If a
mechanism here weakens a normative control, the normative text wins and this
RFC must be corrected.

## Terminology

| Term                     | Accepted meaning                                                                                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loader                   | The `bitty-website` code that validates and loads pinned `bitty-docs` Markdown into renderable content entries (Astro content collections or a narrow equivalent), including schema validation, `website_publish` filtering, and link and language checks. |
| Pinned revision          | An immutable identifier of the consumed `bitty-docs` corpus, either a full 40-character commit SHA or an immutable release tag that resolves to a single SHA. Floating branch names such as `main` are not pins.                                           |
| Synchronization          | The reproducible copy or checkout of the pinned revision's eligible files into the website workspace or build input, plus validation and derived-asset generation, recorded with the pin in build or release evidence.                                     |
| Release selector         | The website navigation control that lets a reader choose which hosted documentation revision to view (for example `latest`, a dated minor, or an explicit tag) without redefining canonical meaning.                                                       |
| Multi-version URL scheme | The public-URL pattern that hosts more than one documentation revision at distinct routes while preserving a deterministic mapping from source identity and a stable `latest` alias.                                                                       |
| Route mapping            | The deterministic function from a source-relative path such as `docs/specifications/foo.md` to a public route such as `/docs/<version>/specifications/foo/`.                                                                                               |
| Content identity         | The source-relative path (`docs/...`) that `bitty-docs` owns and that survives across renames via redirects.                                                                                                                                               |
| Redirect manifest        | The versioned data that declares `old -> new` moves for published content, owned in intent by `bitty-docs` and implemented by `bitty-website` as router or hosting redirects.                                                                              |
| Eligible document        | A file under `docs/` with well-formed frontmatter whose `website_publish` is `true` and whose category, audience, document_type, status, and language satisfy the contract.                                                                                |
| Fail-closed validation   | Any validation failure (malformed frontmatter, CJK content, unresolved local link, unknown enum, route collision, missing pin, floating branch, or schema mismatch) rejects the build rather than publishing partial or stale content.                     |

## Accepted summary

1. **Loader is Astro content collections with a strict shared schema.** The
   primary loader is an Astro content collection that validates every document
   against a single `z.object` schema that mirrors the eight flat frontmatter
   fields and their allowed enums, enforces `title` equals H1, and filters to
   `website_publish: true` after validation. Raw Markdown is never rendered
   without passing the schema and the language gate.
2. **Synchronization is a pinned-revision copy with recorded evidence.**
   `bitty-website` stores the consumed pin in exactly one place,
   `src/content/docs-revision.json` (shape `{ revision, source, synced_at }`), and
   provides `bun run sync:docs --pin <sha|tag>` that fetches the pinned corpus
   into `src/content/docs/` via a sparse checkout or `git archive` and then
   validates it. The build refuses to render when the pin is missing, malformed,
   or points to a floating branch, and every published build records the pin in
   its release evidence so the corpus is reproducible.
3. **Release selector is data-driven and presentation-only.** A checked-in
   `src/content/versions.json` lists every hosted revision in descending
   SemVer order plus `latest` and `stable` aliases. The selector renders from
   that file, navigates by rewriting the version segment of the current route,
   preserves the trailing path and query when the same content identity exists
   in the target revision, and falls back to that revision's index otherwise.
4. **Multi-version URLs are `/docs/<version>/<path>/`.** Published docs live
   only under `/docs/<version>/...` where `<version>` is a SemVer tag without
   a leading `v` (for example `0.3.0`) or the alias `latest`. `/docs` redirects
   to `/docs/latest/`, `/` remains the marketing landing shell, and no
   unversioned docs route publishes stale content alongside versioned routes.
5. **Route mapping is deterministic and collision-checked.** The mapping is
   `docs/<category>/<file>.md -> /docs/<version>/<category>/<slug>/` with
   `README.md` mapping to the category index `/docs/<version>/<category>/`.
   Mapping is case-sensitive, preserves hierarchy, strips only the leading
   `docs/` and trailing `.md`, slugifies the final segment, and fails closed
   on any two eligible sources that would collide at the same public route.
6. **Redirect manifest splits intent from implementation.** `bitty-docs` owns
   the decision that a published identity moved and declares `{ old, new,
reason, effective_version }` in its pull request description and, where the
   move ships, in `docs/project/redirects.json`. `bitty-website` owns
   implementation: it merges the checked-in docs manifest with its own
   `src/redirects.json` into Astro `redirects` and Cloudflare `_redirects` with
   301 semantics for moves and 302 only for deprecated aliases, and validation
   rejects missing targets, loops, and collisions.

## Loader (accepted)

Status: **accepted contract** on 2026-08-29. Numbered for reference; defines the accepted loader contract.

- **LD-1 Collection location and shape.** The website declares a single Astro
  content collection, `docs`, whose entry files are the synchronized eligible
  documents under `src/content/docs/docs/**/*.md`. The collection is the only
  path by which canonical prose reaches rendering; importing Markdown from
  outside the collection or duplicating a specification verbatim in
  `bitty-website` is prohibited per the website content contract.

- **LD-2 Shared schema.** The collection schema is a single `z.object` that
  validates exactly the eight flat fields in the documentation workflow with
  no extra fields, arrays, maps, multiline values, aliases, or tags:

  ```ts
  // Candidate shape; the implementing task owns the final spelling.
  import { z } from "astro:content";
  const docsSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    category: z.enum([
      "architecture",
      "configuration",
      "decisions",
      "development",
      "examples",
      "extensibility",
      "findings",
      "how-to",
      "migrations",
      "product",
      "project",
      "provenance",
      "reference",
      "releases",
      "requirements",
      "roadmap",
      "security",
      "specifications",
      "troubleshooting",
      "tutorials",
      "user-guide",
    ]),
    audience: z.enum([
      "contributor",
      "maintainer",
      "mixed",
      "plugin-author",
      "security-reviewer",
      "user",
    ]),
    document_type: z.enum([
      "contract",
      "explanation",
      "guide",
      "index",
      "overview",
      "policy",
      "reference",
      "register",
      "research",
      "specification",
    ]),
    status: z.enum([
      "accepted",
      "archived",
      "deprecated",
      "draft",
      "normative",
      "stable",
    ]),
    website_publish: z.boolean(),
    sidebar_order: z.number().int().nonnegative(),
  });
  ```

  The loader validates `title` equals the first H1 (case and whitespace
  sensitive), `sidebar_order` is an unquoted integer, `website_publish` is an
  unquoted boolean, and no unknown keys remain. A schema mismatch fails closed.

- **LD-3 Eligibility filtering after validation.** The loader parses and validates
  every file before filtering. Only after a file passes the schema and the
  language and link checks does the loader keep entries where
  `website_publish` is `true`. Filtering before validation is a failure; a file
  that would be filtered still fails the build if its frontmatter is malformed
  or its body contains CJK.

- **LD-4 Language gate.** Any file whose body contains Han, Hiragana, Katakana,
  Hangul, Bopomofo, or full-width punctuation range `U+3000-303F` fails the
  collection validation, including inside historical source titles or examples.
  The check is delegated to the shared `bun .github/scripts/check-docs.mjs language`
  logic in `bitty-docs`, re-run at sync time, and re-validated by the loader's
  own content check before rendering.

- **LD-5 Link integrity.** The loader, together with the sync step, validates
  every relative Markdown link in the eligible corpus without network access.
  Unresolved local targets, missing fragments, and directory links without an
  index fail closed. Absolute `https://` links are allowed only to stable
  external references such as the Astro content-collections guide; they are not
  validated as link targets at build time but are allowed to remain.

- **LD-6 Non-duplication invariant.** If a file in `bitty-website` outside
  `src/content/docs/` contains a heading or paragraph that is a verbatim copy
  of a specification body, validation rejects the build. Presentation-only
  framing (navigation labels, search snippets, accessibility summaries) is
  allowed only when it references the collection entry by ID and does not fork
  the body.

- **LD-7 Fallback loader.** If Astro content collections are not used, the
  implementing task must provide a narrow equivalent that preserves LD-2
  through LD-6: a single entry point, the same eight-field schema, the same
  `website_publish`-after-validation rule, the same language and link checks,
  and the same pinned-revision input. Choosing a different loader is a
  `bitty-website` repository decision that must be reviewed in both
  repositories because the website content contract cites collections as
  compatible, not required.

## Synchronization mechanism (accepted)

- **SY-1 Pin file as single source of truth.** `bitty-website` stores the
  consumed corpus identifier in exactly one committed file:

  ```json
  // src/content/docs-revision.json — committed, not generated at build time.
  {
    "revision": "6fa53187ebd24659b09a145dec9b7f25557aa86d",
    "source": "github.com/bitty-terminal/bitty-docs",
    "synced_at": "2026-08-29T00:00:00Z"
  }
  ```

  `revision` is a full 40-character SHA or an immutable release tag.
  The file is JSON with no extra keys. A commit that changes rendered
  documentation without updating this file is a hygiene failure.

- **SY-2 Sync command.** The website provides a single command:

  ```sh
  bun run sync:docs --pin <sha|tag>
  ```

  The command fetches `bitty-docs` at the pin (sparse checkout of `docs/` or
  `git archive` against the pin), copies only the pinned tree's `docs/` into
  `src/content/docs/` after clearing stale content, runs the four
  `bitty-docs` gates (`metadata`, `language`, `links`, `hygiene` parity) on
  the copied tree, and writes the pin back to `src/content/docs-revision.json`
  with `synced_at`. Supplying a floating branch name or a short SHA fails
  closed.

- **SY-3 No floating `main`.** The Astro build imports the pin and asserts
  that `revision` resolves to a single commit reachable as a SHA. Build-time
  code such as `src/content/config.ts` or `src/lib/docsPin.ts` rejects the
  build when the pin is missing, when it names a branch, or when the copied
  tree's `git log -1 --format=%H` does not equal the pin (or, when the pin
  is a tag, does not equal the peeled tag SHA).

- **SY-4 Stale-content prohibition.** A build that finds Markdown under
  `src/content/docs/` whose embedded pin comment or sidecar does not match
  `src/content/docs-revision.json` fails closed rather than publishing a mixed
  corpus. Manual edits inside `src/content/docs/` are not allowed; the
  directory is treated as a generated read-only mirror of the pin.

- **SY-5 Reproducibility evidence.** Every website deployment that publishes
  docs records the pin in its release evidence: the GitHub Release or
  deployment log cites `bitty-docs` `revision`, the `bitty-website` commit
  SHA, and the `dist/` content hash. Rebuilding `bitty-website` at the
  recorded commit and pin reproduces the same `dist/`.

- **SY-6 Cross-repository ordering.** A `bitty-docs` change that updates
  content, metadata, links, and redirect requirements merges first and records
  its SHA. The `bitty-website` change that advances the pin references that
  exact SHA in its PR description, carries `Docs-PR` and optional `Code-PR`
  trailers per the repository map, and is not merged until both repositories
  have independent review and green CI with the pin advanced only to a
  reviewed docs revision.

- **SY-7 Preview policy.** Pull-request previews may build from the candidate
  docs pin, but the preview URL must surface the pin (for example in a banner
  or HTML comment `<!-- docs-revision: <sha> -->`) and must not be promoted to
  production without a pin advance to the merged docs SHA. A preview that
  builds from an unpinned local workspace fails its link and pin gates and
  remains non-publishable.

## Release selector (accepted)

- **RS-1 Data model.** The set of hosted revisions is declared in a single
  committed file:

  ```json
  // src/content/versions.json — ordered newest first.
  {
    "latest": "0.3.0",
    "stable": "0.2.1",
    "versions": [
      {
        "version": "0.3.0",
        "revision": "abc123...",
        "label": "latest — 2026-08-28",
        "prerelease": false
      },
      {
        "version": "0.2.1",
        "revision": "def456...",
        "label": "stable — 2026-08-21",
        "prerelease": false
      },
      {
        "version": "0.3.0-rc.1",
        "revision": "789abc...",
        "label": "0.3.0-rc.1",
        "prerelease": true
      }
    ]
  }
  ```

  `versions` is SemVer-sorted descending, `latest` points to the first entry,
  and an optional `stable` points to the latest non-prerelease. Unknown keys
  fail the build. The file is the only place that enumerates hosted revisions.

- **RS-2 Presentation contract.** The selector is a navigation control, not a
  content rewrite. It lists `versions` in the declared order, marks the
  current version as active, and compares the current public route's version
  segment against `versions` plus `latest`. Rendering the selector never copies
  specification prose.

- **RS-3 Navigation behavior.** Selecting a different version rewrites only the
  version segment of the current route (`/docs/<from>/<path>` becomes
  `/docs/<to>/<path>`) and preserves query and hash. When the same content
  identity exists in the target revision (same public route minus the version
  prefix), navigation lands on that page; otherwise the selector navigates to
  the target revision's index (`/docs/<to>/`). The fallback is never a 404
  when the target revision itself is valid.

- **RS-4 Prerelease policy.** Prerelease versions (SemVer with a pre-identifier)
  appear in `versions` only when the `bitty-docs` revision they pin is tagged
  as a prerelease and the `bitty-website` PR that adds them is reviewed. The
  selector may render prereleases as disabled or under a collapsed group, but
  it must not silently hide them when they are hosted.

- **RS-5 Build derivation.** The set of valid version segments accepted by the
  router is exactly the union of `["latest", "stable"]` plus every
  `versions[].version`. A route that carries a version segment outside that set
  returns 404. Adding a version to `versions.json` without advancing the pin
  for that version's docs corpus is a validation failure.

## Multi-version URL scheme (accepted)

- **MV-1 Canonical pattern.** Every published documentation page lives at:

  ```text
  /docs/<version>/<path>/
  ```

  where `<version>` is the SemVer tag without a leading `v` (for example
  `0.3.0`) or the alias `latest`, and `<path>` is the route-mapped identity
  derived from the source-relative path (see RM-1). A trailing slash is the
  canonical form; the non-slash form redirects with 301 to the slash form.

- **MV-2 Aliases.** `latest` is an alias for the `latest` entry in
  `versions.json`; `stable` is an alias for the `stable` entry when it
  differs from `latest`. Aliases resolve to the underlying versioned asset
  set and emit a `Link: <...>; rel="canonical"` header pointing to the
  alias route so search indexes converge without duplicating the corpus.
  Direct SemVer routes remain addressable even when an alias points at the
  same revision.

- **MV-3 Root and index routing.**

  ```text
  /                  -> marketing landing shell, not a docs page
  /docs              -> 301 to /docs/latest/
  /docs/<version>    -> 301 to /docs/<version>/
  /docs/<version>/   -> docs index for that revision
  /docs/latest/<path>/ -> canonical alias for the newest hosted revision
  ```

  No documentation is served at `/<path>` outside `/docs/<version>/`, and no
  unversioned docs route publishes stale content alongside versioned routes.

- **MV-4 Versioned assets and links.** Within a rendered docs page, all
  relative links and asset references are resolved relative to the versioned
  route that rendered them. A link from `/docs/0.3.0/specifications/foo/`
  to `../configuration/bar/` must resolve to `/docs/0.3.0/configuration/bar/`
  even when `bar` exists only in `0.3.0`. Cross-version links must be
  explicit absolute versioned links (`/docs/0.2.1/...`) and are reviewed as
  navigation, not as canonical prose.

- **MV-5 Hosting invariant.** Adding a new hosted version never rewrites the
  already-published assets for a prior version. Each version's rendered pages
  are built from its own pinned revision in an isolated output directory
  (`dist/docs/<version>/`) and share only the selector and shell assets.
  A build that would overwrite a prior version's output fails closed.

- **MV-6 Sitemap per version.** Each hosted version emits its own
  `sitemap.xml` at `/docs/<version>/sitemap.xml` plus a global
  `/sitemap.xml` that lists only the `latest` routes as canonical. Search
  indexing must not treat older versions as duplicates of `latest`.

## Route mapping (accepted)

- **RM-1 Deterministic mapping.** The public route for an eligible document is
  computed from its source-relative path by:

  ```text
  source: docs/<category>/<path>.md
  route:  /docs/<version>/<category>/<slug>/
  ```

  where `<category>` preserves the single path segment after `docs/`,
  `<slug>` is the filename minus `.md` (lowercased, non-alphanumerics
  collapsed to `-`, and empty segments rejected), and `<version>` is
  supplied by the multi-version scheme. Subdirectories under
  `docs/<category>/` preserve hierarchy, so
  `docs/specifications/foo/bar.md` maps to
  `/docs/<version>/specifications/foo/bar/`.

- **RM-2 Index handling.** A file named `README.md` maps to the category
  index:

  ```text
  docs/specifications/README.md -> /docs/<version>/specifications/
  docs/README.md                -> /docs/<version>/
  ```

  `docs/README.md` is the documentation map; its versioned route is the
  revision's docs index. No other file maps to the empty slug; a directory
  that lacks a `README.md` has no automatically generated index.

- **RM-3 Canonical source.** The source-relative documentation path is the
  authoritative content identity. Any public-route mapping decision must be
  deterministic, case-sensitive, and reviewed in both repositories per the
  website content contract. A route that cannot be derived from a validated
  source file is not canonical and must not be linked as documentation.

- **RM-4 Collision policy.** If two distinct eligible sources would map to
  the same public route (for example `docs/foo/Bar.md` and `docs/foo/bar.md`
  on a case-insensitive check, or two files that slugify to the same value),
  validation rejects the build. The fix belongs in `bitty-docs` by renaming
  the source and declaring a redirect (see RD-1), not by patching the mapper.

- **RM-5 Extension and suffix handling.** Only `.md` files are routable.
  Query strings and fragments are not part of the route mapping input; a
  route that carries a fragment is validated against the anchor table of the
  target document, and a missing fragment fails closed.

- **RM-6 Review surface.** The mapping function lives in exactly one module
  in `bitty-website`, for example `src/lib/docsRoutes.ts`, with a unit test
  that asserts the table in RM-1 and RM-2 against fixtures and a negative
  test that asserts a deliberate collision is rejected. The module is the
  only place that derives a docs public route; callers must not reimplement
  the mapping ad hoc.

## Redirect manifest (accepted)

- **RD-1 Intent ownership.** `bitty-docs` owns the decision that a published
  content identity moved or was deprecated. Every pull request that renames,
  moves, or removes a file with `website_publish: true` must declare:

  ```text
  Old identity: docs/specifications/foo.md
  New identity: docs/specifications/bar.md
  Reason: reorganize OQ-023 delivery contract
  Effective version: 0.3.0
  Redirect: 301
  Replacement guidance: see bar.md introduction
  ```

  A move without that declaration fails review even when the build would
  otherwise pass.

- **RD-2 Manifest file in `bitty-docs`.** When the move ships, its
  declaration is also recorded in a committed, versioned manifest:

  ```json
  // docs/project/redirects.json — owned by bitty-docs, consumed by bitty-website.
  [
    {
      "old": "/docs/specifications/foo/",
      "new": "/docs/specifications/bar/",
      "status": 301,
      "reason": "reorganize OQ-023 delivery contract",
      "effective_version": "0.3.0"
    }
  ]
  ```

  `old` and `new` are public-route prefixes without the version segment; the
  website expands them per hosted version at build time. `status` is 301 for
  moves and 302 only for deprecated aliases that still serve the old path. The
  file is an array with no extra keys, sorted by `old`.

- **RD-3 Implementation ownership.** `bitty-website` owns router
  configuration and redirect implementation. It merges its committed
  `src/redirects.json` (which may carry website-only navigation redirects that
  never redefine canonical meaning) with the docs-owned
  `docs/project/redirects.json` consumed at sync time, and emits:

  - Astro `redirects` in `astro.config.mjs` for server-aware routing;
  - a `dist/_redirects` or `dist/_headers` file consumed by Cloudflare Workers
    Static Assets for 301 semantics at the edge.

  The build fails closed when the two sources declare conflicting targets for
  the same `old`.

- **RD-4 Validation.** Website validation rejects:

  - any `old` that does not resolve to a previously published route for any
    hosted version;
  - any `new` that does not resolve to a currently published route for the
    same version;
  - loops (`old` transitively resolves to itself) or chains longer than one
    hop;
  - duplicate `old` entries;
  - wildcard patterns, regex captures, or external destinations (all redirects
    are exact-path prefixes within `/docs/<version>/`).

- **RD-5 Deprecation lifecycle.** A `deprecated` document remains available at
  its canonical route during its documented transition period and also serves
  from its prior identity via a 301. After the removal condition fires, the
  prior identity remains a 301 for at least one additional minor, and only
  then may become a 404 with migration guidance. Deletion without a reviewed
  redirect is prohibited for published material.

- **RD-6 Redirect evidence.** The rendered deployment records the effective
  redirect table (expanded per version) as a build artifact, for example
  `dist/redirects.json`, so a reviewer can diff the redirect change alongside
  the content pin. Website-only navigation or landing pages may link to
  canonical content but cannot add a redirect that redefines the contract.

## Cross-repository delivery

Changes that affect both repositories use linked GitHub Issues or pull
requests per the website content contract:

1. The `bitty-docs` change updates content, metadata, links, redirect
   requirements, and any `docs/project/redirects.json` entry and passes
   repository checks. Its PR description carries the `old -> new` table and
   `effective_version` when the change moves published content.
2. The `bitty-website` change references the exact docs revision it consumes
   in `src/content/docs-revision.json` and implements presentation, routing,
   or redirect changes. Its PR description cites `Docs-PR: <url>` and the
   pinned SHA, and names ordering constraints.
3. Each pull request links the other and carries `Docs-PR`, optional
   `Code-PR`, and associated `RFC: Website Delivery RFC OQ-023` / `CarryCtx:
CTX-XXXX` trailers as the shared fields from the repository map.
4. Independent review and CI pass in both repositories before any publish
   (the website build's pin must equal the reviewed docs SHA, and the website
   build must be green with the new pin).
5. The website revision pin is advanced only to a reviewed docs revision;
   advancing the pin to an unreviewed or floating `main` fails the build and
   review.

A content change is not done when the website would publish stale or
duplicated contracts. A website integration is not done when it bypasses the
metadata, language, link, revision-pin, publication, route-collision, or
redirect gates.

## Security alignment and traceability

| Accepted element                                                                | Normative gate it implements                                              | Threat / Risk IDs                                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Astro content collection with exact eight-field schema and `title == H1` check  | Metadata, taxonomy, and English-only gates                                | R-014, language policy, P0-AC-033 family                                |
| `website_publish`-after-validation filtering                                    | Publication eligibility without hiding malformed content                  | Website content contract pinned-input rule                              |
| Language gate (no CJK) and non-duplication invariant                            | English-only corpus, no forked specifications                             | Documentation workflow language policy                                  |
| Link integrity without network, fail-closed on unresolved or collided routes    | Broken-link and route-collision rejection                                 | Website content contract paths, links, and redirects section            |
| Single `src/content/docs-revision.json` pin file plus `sync:docs --pin`         | Pinned immutable revision, reproducible corpus, stale-content prohibition | Website content contract pinned-input, repository map delivery boundary |
| No floating `main`, stale-mirror rejection, `synced_at` evidence                | Reproducibility and freshness, no unpinned moving branch                  | Supply-chain provenance, R-015                                          |
| `src/content/versions.json` as the only hosted-revision enumeration             | Version selection ownership, no hidden deployments                        | Release policy, R-022                                                   |
| `/docs/<version>/<path>/` canonical pattern with `latest` and `stable` aliases  | Multi-version URL scheme, `latest` pointer, no unversioned stale route    | Website content contract deferred-decision closure for OQ-023           |
| Deterministic `docs/<category>/<file>.md -> /docs/<version>/<category>/<slug>/` | Source-relative identity as default, case-sensitive collocated routing    | Website content contract paths, links, and redirects                    |
| `README.md` to category index, no auto-index for missing `README.md`            | Navigation completeness without invented behavior                         | Documentation map, documentation workflow                               |
| Collision rejection as build failure                                            | Route-collision validation                                                | Website content contract                                                |
| `docs/project/redirects.json` intent plus `src/redirects.json` implementation   | Split ownership of redirect intent versus router implementation           | Documentation workflow deprecation, website content contract            |
| Validation rejecting loops, chains, missing targets, wildcards                  | Safe redirect without open-redirect or masking                            | R-015, R-022, threat-model untrusted URLs                               |
| `dist/redirects.json` per-deployment evidence and per-version output isolation  | Auditability, no overwrite of prior versioned assets                      | R-015, R-022                                                            |
| `Docs-PR` / `CarryCtx` trailers and ordered merges                              | Cross-repository atomicity evidence in lieu of a single commit            | Repository map CarryCtx routing                                         |

## Verification plan

Acceptance of an implemented contract later requires at minimum:

1. **Schema and language proof.** Introduce a file with an extra frontmatter
   key or a CJK character into `src/content/docs/` and run `bun run build`;
   the build fails with an actionable message that names the file, line, and
   violated rule. A valid corpus with `website_publish: false` entries builds
   while those entries remain unpublished and absent from the emitted
   `dist/docs/<version>/` tree.
2. **Link and collision proof.** Add a relative link to a non-existent
   `../foo/missing.md` target and confirm the sync and Astro build fail with
   the unresolved destination. Add two files whose slugs would collide under
   RM-1 and confirm the mapper test and the build both fail on the collision
   before any asset is emitted.
3. **Pin validation proof.** Set `src/content/docs-revision.json` to an
   invalid SHA, a short SHA, or `"main"` and confirm the build fails closed
   with the pin rule rather than rendering stale content from
   `src/content/docs/`. Manually edit a file inside `src/content/docs/`
   without updating the pin and confirm the stale-mirror check fails the
   build.
4. **Sync command proof.** Run `bun run sync:docs --pin <sha>` for a known tag
   and confirm the workspace now contains that tag's `docs/` at the committed
   pin, `metadata`, `language`, and `links` parity checks pass on the copied
   tree, and `src/content/docs-revision.json` was rewritten with that pin and
   a fresh `synced_at`. A second run without `--pin` leaves the pin unchanged
   and re-validates rather than floating.
5. **Versioned route proof.** Build with `src/content/versions.json`
   containing two hosted versions and visit `/docs`, `/docs/latest/`,
   `/docs/0.3.0/specifications/website-delivery-rfc/`, and
   `/docs/0.2.1/specifications/website-delivery-rfc/`; the first redirects
   via 301 to `/docs/latest/`, the versioned routes serve isolated
   `dist/docs/<version>/` assets, shared assets are not versioned, and a
   probe for an unhosted version such as `/docs/9.9.9/...` returns 404.
   Inspect `sitemap.xml` to confirm only `latest` routes are canonical.
6. **Selector navigation proof.** Drive the release selector from a page that
   exists in both versions and from a page that exists only in one version;
   the first preserves the trailing path across the version rewrite, the
   second falls back to the target revision's index with the version segment
   correctly rewritten, and no double-decode or open-redirect occurs.
7. **Redirect manifest proof.** Introduce a move of a published document in a
   docs PR that declares `old -> new` with `effective_version`, add the
   corresponding entry to `docs/project/redirects.json`, advance the website
   pin to that docs SHA, and confirm the emitted `dist/_redirects` carries
   exactly one 301 for the old path per hosted version at or after the
   effective version, that pre-effective versions remain without the redirect,
   that `dist/redirects.json` records the expanded table, and that a visit to
   the old route returns 301 with `Location` equal to the new versioned route
   for that version. Confirm a duplicate `old` or a loop is rejected at
   validation time.
8. **Cross-repository delivery proof.** Stage a two-PR example
   (`bitty-docs` spec edit plus `bitty-website` pin advance) that carries
   `Docs-PR` and `CarryCtx: CTX-0065` trailers, verify the website PR base is
   the docs `main` after the docs PR merged, capture `just check` green
   (0 issues, 92+ files) and `act -n` DRYRUN success (syntax-only) evidence
   in each, and confirm the website deployment log records the pinned SHA so
   the build is reproducible from the logged commit.

Every criterion above is an `integration` or `manual-audit` check accompanied
by a reviewer record before it may move the linked risk toward `Mitigated` for
publishing infrastructure. No environment flag may bypass a gate; the same
checks gate local `just check` and CI.

## Alternatives considered

| Alternative                                                  | Why rejected or deferred                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `git submodule` tracking `bitty-docs` at `src/content/docs`  | Deferred — submodules pin a SHA and surface the pin in `..gitmodules`, but their update workflow is error-prone under shared checkouts and CI, and they complicate the `website_publish`-after-validation rule without a narrow sync script that already satisfies SY-2. |
| `git subtree` mirroring `docs/`                              | Deferred — subtree preserves history but couples the website tree to docs paths beyond the pinned `docs/` and complicates the single pin file in SY-1; a read-only copy with a recorded pin is more explicit for reproducibility.                                        |
| Floating `bitty-docs` `main` as direct website input         | Rejected — violates the website content contract that demands a pinned validation boundary; the consumer must own presentation while docs own canonical content, and floating branches bypass the review and reproducibility gates.                                      |
| Single unversioned `/docs/<path>/` route for all revisions   | Rejected — hosts stale content alongside fresh content with no deterministic way to reference a prior revision, and it contradicts the ADR-owned requirement to host historical versions via a versioned scheme.                                                         |
| Query-string versioning (`/docs/<path>?v=0.3.0`)             | Rejected — fragments the route table, cannot be cased for Workers Static Assets `_redirects` as a prefix mount, and prevents per-version `sitemap.xml` isolation at `dist/docs/<version>/`.                                                                              |
| `docs/<category>/<file>.md` directly to `/docs/<file>/` flat | Rejected — collapses categories, guarantees collisions, and breaks the documentation map's category routing.                                                                                                                                                             |
| Regex or glob redirects in `docs/project/redirects.json`     | Rejected — pattern redirects invite open-redirect and masking bugs; exact-path prefixes are auditable and the per-version expansion already handles versioned prefixes without patterns.                                                                                 |
| Astro Starlight as the required theme                        | Deferred — Starlight is a compatible theme but this RFC fixes only loader, pin, routes, and redirects; the theme, search, and sidebar rendering remain a separate `bitty-website` presentation decision reviewed after the delivery contract is accepted.                |
| `bitty-website` copying specifications verbatim              | Rejected — duplicated specifications are non-authoritative per the contract and must be removed in favor of consuming the source document through the loader.                                                                                                            |
| `website_publish` before validation                          | Rejected — filtering before parsing would hide malformed frontmatter or CJK violations in unpublished drafts; SY-2 runs gates on the entire copied tree and only then filters to eligible entries for rendering.                                                         |

## Affected contracts

Acceptance of this RFC on 2026-08-29 applies these same-change updates (no separate task
needed; a follow-up PR must keep them synchronized):

- [Repository map](../project/repository-map.md): the pending-decisions list
  for the synchronization and versioning approach from docs to the website
  refers to this RFC as the authoritative contract; the documentation-and-
  website relationship paragraph notes that an Astro content-collection loader
  with a pinned SHA in `src/content/docs-revision.json`, a deterministic
  `/docs/<version>/<path>/` scheme, and a split redirect manifest now close
  OQ-023.
- [Website content contract](../project/website-content-contract.md): the
  deferred-decisions paragraph gains a link to this RFC as the chosen loader,
  copy mechanism, deployment inputs, preview rule, release selector, and
  multi-version URL scheme, while retaining the Astro collections
  compatibility note as the validated option.
- [Decision register](../decisions/index.md): DIR-007 and DIR-011 gain a link
  to this RFC as the accepted delivery contract; the candidate-queue entry
  for the publishing mechanism is marked Accepted with frontmatter `accepted`
  and a pointer to OQ-023 closure.
- [Documentation workflow](../development/documentation-workflow.md): the
  change-trigger matrix row for file moves already owns redirect
  requirements and is linked as the review owner, not rewritten; the
  deprecation and versioning section gains a link to this RFC's
  `/docs/<version>/<path>/` and 301 rules.
- [Documentation map](../README.md): the project-and-technology table's
  website-content-contract row gains a link to this RFC as the delivery
  contract, analogous to neighboring RFC links.
- [Toolchain policy](../development/toolchain-policy.md): no new toolchain
  pin is introduced; the sync command `bun run sync:docs` and its single
  `docs-revision.json` pin file are documented as the governed mechanism
  alongside existing pins.
- [Project releases](../releases/README.md) and the root
  [CHANGELOG.md](../../CHANGELOG.md): no release notes are added by this
  RFC; website pins are advanced only as part of a future website-repository
  change that cites this contract.
- No new repository, crate, or workflow is added by this RFC; pins for any
  future website governing workflow belong to the implementing website task
  and are verified by `bun.lock` alongside the existing Astro 7.2.6 and
  Bun 1.4.0 pins.

## Open points

The following items were open at proposal and are now dispositioned upon acceptance on 2026-08-29. Acceptance of this RFC closes [OQ-023](../decisions/open-questions.md) at the design level; residual items below are tracked as follow-up work with no remaining closure blocker unless review decides otherwise:

1. Whether the `sync:docs` fetch should use `git archive --remote` against
   the pin versus a local `bitty-docs` checkout next to the umbrella
   workspace, including caching and offline verification for reproducible
   builds.
2. Whether Astro Starlight should be adopted as the presentation theme or a
   narrower custom layout should be kept, pending a `bitty-website` review of
   bundle cost, search integration, and sidebar rendering against this RFC's
   loader and `sidebar_order`.
3. Whether search should be provided by an Astro-native index over the
   versioned collection or by an external search service, and how the index
   is partitioned per hosted version.
4. Whether the selector's `stable` pointer should be a distinct hosted route
   set for long-term compatibility or merely an alias for `latest` in v1
   before the first stable tag exists.
5. Whether Cloudflare Workers Static Assets `_redirects` alone satisfies RD-3
   or whether a small Workers wrapper is needed to serve per-version
   `_redirects` with 301 and `Link: canonical` headers while preserving
   `dist/` determinism.
6. Whether `src/content/versions.json` should carry an optional `eol` field
   for hosted revisions that are still served but removed from the selector
   default, and what its deprecation window should be.
7. Whether the documentation map's hosted-revision list and the website
   selector should be generated from a single `versions.json` source of
   truth in `bitty-docs` rather than maintained only in `bitty-website`,
   and how its update crosses the cross-repository ordering in SY-6.

These were outside this RFC's scope at draft and remain tracked as follow-up work; they are not silently chosen by implementation.

## Acceptance criteria

This RFC is accepted on 2026-08-29 and closes
[OQ-023](../decisions/open-questions.md) at the design level. The following criteria were satisfied per the [open-question register](../decisions/open-questions.md) close rule:

1. Independent review by the category owner, a docs curator, and a
   security reviewer accepted the loader, synchronization mechanism,
   release selector, multi-version URL scheme, route mapping, and
   redirect manifest, including every table value and the split
   ownership in RD-1 through RD-3, without weakening any normative P0
   gate.
2. Affected registers were synchronized in the same change: the
   repository map, website content contract, decision register,
   specifications index, and open-question row moved from pointer to
   closure per the register close rule, and the documentation workflow
   and map reference the accepted contract without claiming
   implementation.
3. No element weakens a normative control; any discovered conflict
   returns the conflicting clause to revision rather than downgrading
   the gate, and the English-only, frontmatter, link, and route-
   collision gates remain fail-closed in both repositories.
4. The draft text in this file was updated to record acceptance date
   and initiator, frontmatter became `accepted`, and links from the
   [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
   and the [Decision register](../decisions/index.md) reflect the
   accepted delivery contract without claiming a shipped website.
5. Verification items 1 through 3 in the plan above were shown green on
   a staged example that advances the website pin to the accepted
   revision (for example a locally staged website worktree that builds
   with the new pin): `just check` is green in both repositories
   (`fmt-check`, `markdownlint`, `links`, `metadata`, `language`,
   `agents`, `hygiene`, `actionlint` 0 issues) and the website build
   records the pin in its evidence. Full cross-repository redirect and
   multi-version hosting evidence is accepted as follow-up P1 when the
   website repository implements the route and edge configuration, but
   design acceptance itself requires the loader, pin, and deterministic
   route mapping to be validated.

Closes OQ-023: this RFC closes that open question at the design level; the register rows are updated per the open-question register rules. The lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## References

- Accepted polyrepo and bootstrap: [ADR 0001](../decisions/adrs/ADR-0001-repository-bootstrap-baseline.md)
  (bootstrap boundary, Astro shell, Bun, Workers Static Assets shell,
  no docs consumer).
- Accepted topology: [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md)
  (ten-crate topology, MSRV 1.85, resolver 3).
- Upstream allowlist: [ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md)
  (license and upstream maintenance posture).
- Platform and CI tiers: [ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md)
  (Tier 1 must-work with native runners).
- Current workspace evidence: [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
  (spine-complete crate presence as of 2026-08-27, not acceptance;
  website remains shell without loader).
- Website validation capability: [Astro content collections guide](https://docs.astro.build/en/guides/content-collections/)
  (collections can load Markdown with a shared schema) and
  [Astro Markdown guide](https://docs.astro.build/en/guides/markdown-content/)
  (frontmatter available to queries and components) as cited by the
  website content contract.
- Related RFCs: [Governance RFC](governance-rfc.md) for OQ-024,
  [Risk Evidence RFC](risk-evidence-rfc.md) for OQ-025, and
  [Default Distribution RFC](default-distribution-rfc.md) for OQ-002
  (illustrate the same Draft -> Accepted -> normative lifecycle and
  no-self-accept rule).
- Toolchain and workflow: [Toolchain policy](../development/toolchain-policy.md)
  (pinned `prettier` 3.9.6, `markdownlint-cli2` 0.23.1, `actionlint`
  1.7.12) and [Documentation workflow](../development/documentation-workflow.md)
  (status meanings, lifecycle, and change-trigger matrix).

## P0 Review Sign-off

> P0 review per CTX-0079 tracks acceptance of OQ-023 via this RFC. Frontmatter is `accepted` and [open-questions.md](../decisions/open-questions.md) is updated per its close rule. This section records passing sign-off and closes OQ-023.

<!-- markdownlint-disable MD013 -->

| Role                                  | Reviewer          | Verdict | Evidence / scope                                                                                                                                                                                                                                                                                                                                                                                            | Date       |
| ------------------------------------- | ----------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| security-auditor                      | `bitty-security`  | pass    | Loader schema eight-field `title==H1` `website_publish`-after-validation, pinned `src/content/docs-revision.json` `sync:docs --pin` stale-mirror rejection, no floating `main`, language/CJK, link/collision, redirect validation loops wildcards 302 vs 301, R-015 R-022 threat-model                                                                                                                      | 2026-08-29 |
| category-owner (architecture)         | `bitty-architect` | pass    | Astro content collections `z.object` eight fields `title==H1`, sync pin `src/content/docs-revision.json` with `bun run sync:docs --pin` stale-content prohibition, multi-version `/docs/<version>/<path>/` with `latest`/`stable` and per-version `dist` isolation, deterministic route mapping `docs/<category>/<file>.md -> /docs/<version>/<category>/<slug>/` with `README.md` index and collision gate | 2026-08-29 |
| category-owner (security-and-quality) | `bitty-quality`   | pass    | Release selector `src/content/versions.json` data-driven `latest`/`stable` and navigation rewrite preserving path, route mapping case-sensitive slugify, redirect manifest split intent `docs/project/redirects.json` plus `src/redirects.json` 301/302, validation rejecting loops chains missing targets, cross-repository `Docs-PR`/`Code-PR` ordering, `just check` 93 files 0 issues                   | 2026-08-29 |
| docs-curator                          | `bitty-curator`   | pass    | Frontmatter `accepted`, lifecycle `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`, links to [Repository map](../project/repository-map.md), [Website content contract](../project/website-content-contract.md), [Documentation workflow](../development/documentation-workflow.md), English-only                                                                              | 2026-08-29 |

<!-- markdownlint-enable MD013 -->
