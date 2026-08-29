---
title: Website content contract
description: Normative boundary between canonical Bitty documentation and website presentation
category: project
audience: contributor
document_type: contract
status: normative
website_publish: false
sidebar_order: 50
---

# Website content contract

This contract defines how the independent `bitty-website` repository consumes
canonical documentation from `bitty-docs`. It defines content ownership and
validation, not a website theme, deployment platform, or synchronization
implementation.

## Ownership boundary

`bitty-docs` owns:

- canonical documentation prose, metadata, source paths, and internal links;
- the metadata schema and English-only language policy;
- document status, publication eligibility, content identity, deprecation, and
  redirect requirements;
- reviewed changes to architecture, security, reference, user, developer, and
  governance contracts.

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

Every website build that publishes canonical docs must identify an immutable
`bitty-docs` revision, such as a full commit SHA or immutable release tag. It
must not publish from an unpinned moving branch. The pinned revision is recorded
in website build or release evidence so the published corpus is reproducible.

Only files under `docs/` with `website_publish: true` are eligible for
publication. A consumer must parse and validate all required frontmatter before
filtering or rendering; malformed metadata, CJK content, unresolved local links,
or an unknown enum fails closed.

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
- `bitty-docs` owns internal link targets and the decision that a published
  content identity moves or is deprecated.
- `bitty-website` owns router configuration and redirect implementation.
- A move of published content declares the old identity, new identity,
  replacement guidance, and redirect requirement in the docs pull request.
- Website validation must reject broken published links and route collisions.
- Website-only navigation or landing pages may link to canonical content but
  cannot redefine its contract.

## Cross-repository delivery

Changes that affect both repositories use linked GitHub Issues or pull requests:

1. The `bitty-docs` change updates content, metadata, links, and redirect
   requirements and passes repository checks.
2. The `bitty-website` change references the exact docs revision it consumes
   and implements presentation or routing changes.
3. Each pull request links the other and names ordering constraints.
4. Independent review and CI pass in both repositories before publication.
5. The website revision pin is advanced only to a reviewed docs revision.

A content change is not done when the website would publish stale or duplicated
contracts. A website integration is not done when it bypasses the metadata,
language, link, revision-pin, or publication gates.

## Deferred decisions

This contract intentionally does not choose a theme, renderer, loader, content
copy mechanism, deployment target, preview service, release selector, or
multi-version URL scheme. Internationalization, locale directories,
translations, and multilingual routing are also deferred until an explicit
cross-repository decision defines ownership and synchronization.
