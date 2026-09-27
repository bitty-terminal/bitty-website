---
title: Website content contract
description: Normative ownership and validation boundary between bitty-docs and bitty-website
category: project
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 20
---

# Website content contract

This contract defines how the independent `bitty-website` repository consumes
canonical documentation from the Bitty documentation corpus: the shared
governance corpus in `bitty-docs` and the project documentation repositories
mounted there as submodules. It defines content ownership and validation, not
a website theme, deployment platform, or synchronization implementation.

## Ownership boundary

`bitty-docs` owns:

- the shared governance prose, metadata, source paths, and internal links;
- the metadata schema and English-only language policy;
- document status, publication eligibility, content identity, deprecation, and
  redirect requirements for shared governance documents;
- reviewed changes to architecture, security, reference, user, developer, and
  governance contracts;
- the root submodule pointers that record the consumed project documentation
  revision.

Each project documentation repository (`bitty-terminal-docs`, `bitty-ai-docs`,
`bitty-plugins-docs`) owns its project prose, metadata, source paths, internal
links, and move or deprecation decisions under the same workflow.

`bitty-website` owns:

- presentation components, navigation rendering, search, accessibility, SEO,
  routing implementation, builds, deployment, and operational monitoring;
- validation that the consumed revision satisfies this contract;
- implementation of required redirects without changing canonical meaning.

The website may add presentation-only framing but must not copy, fork, or
silently rewrite normative documentation bodies. A duplicated specification in
`bitty-website` is non-authoritative and must be removed in favor of consuming
the source document.

## Pinned input

Every website build that publishes canonical docs must identify immutable
revisions for `bitty-docs` and for each consumed project documentation
submodule (the aggregator's recorded gitlinks), such as full commit SHAs or
immutable release tags. It must not publish from an unpinned moving branch.
The pinned revisions are recorded in website build or release evidence so the
published corpus is reproducible.

Only documents with `website_publish: true` are eligible for publication. A
consumer must parse and validate all required frontmatter before filtering or
rendering; malformed metadata, CJK content, unresolved local links, or an
unknown enum fails closed.

The [Astro content collections guide](https://docs.astro.build/en/guides/content-collections/)
documents that collections can load Markdown with a shared schema for
validation and type safety. The
[Astro Markdown guide](https://docs.astro.build/en/guides/markdown-content/)
documents that YAML frontmatter is available to collection queries and
components. These capabilities establish compatibility with this contract;
they do not require a particular loader, collection layout, theme, or sync
mechanism in `bitty-website`.

## Paths, links, and redirects

- A source-relative documentation path is the default content identity. Any
  public-route mapping must be deterministic and reviewed in both repositories.
- Each documentation repository owns its internal link targets and the decision
  that a published content identity moves or is deprecated; `bitty-docs` owns
  the submodule pointer record for project content.
- `bitty-website` owns router configuration and redirect implementation.
- A move of published content declares the old identity, new identity,
  replacement guidance, and redirect requirement in the docs pull request.
- Website validation must reject broken published links and route collisions.
- Website-only navigation or landing pages may link to canonical content but
  cannot redefine its contract.

## Cross-repository delivery

Changes that affect both repositories use linked GitHub Issues or pull requests:

1. The owning documentation repository updates content, metadata, and links
   and passes its repository checks; a project content change is then recorded
   by bumping the submodule pointer in `bitty-docs`.
2. The `bitty-website` change references the exact `bitty-docs` revision and
   submodule revisions it consumes and implements presentation or routing
   changes.
3. Each pull request links the other and names ordering constraints.
4. Independent review and CI pass in both repositories before publication.
5. The website revision pin is advanced only to a reviewed docs revision.

A content change is not done when the website would publish stale or duplicated
contracts. A website integration is not done when it bypasses the metadata,
language, link, revision-pin, or publication gates.

## Content policy and deferred surfaces

The website is docs-first: canonical documentation is the first and currently
only committed website content, and every published page is sourced from this
corpus — the shared governance documents in `bitty-docs` and the pinned
project documentation submodules — through the revision pin and synchronization
pipeline accepted in the
[Website Delivery RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/website-delivery-rfc.md).
Content is never authored in `bitty-website`, and a website page must not
become a second source of truth for canonical documentation. Website work is
currently deprioritized.

The following page classes are deferred and are not website content today;
each requires a scoped task and its owning decision artifact before any
content is written:

- plugin marketplace and plugin registry browsing surfaces;
- a plugin catalog of discovery, listing, or comparison pages for plugins;
- a theme gallery or theme marketplace;
- landing or marketing pages outside presentation of canonical documentation.

The deferral follows recorded sequencing rather than creating a new decision.
The [roadmap](../roadmap/now-next-later.md#later-4-post-v10-deferred-horizon)
carries the plugin registry and marketplace surface and the theme marketplace
as Later-4 candidates, and the
[Proposed Delivery Sequence](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/product/proposed-delivery-sequence.md)
records the plugin store or marketplace distribution surface and the theme
marketplace in its candidate early-deferral list.

## Deferred decisions

This contract intentionally does not choose a theme, renderer, loader, content
copy mechanism, deployment target, preview service, release selector, or
multi-version URL scheme. Internationalization, locale directories,
translations, and multilingual routing are also deferred until an explicit
cross-repository decision defines ownership and synchronization.
