---
title: ADR 0001 - Repository Bootstrap Baseline
description: Accepts minimal implementation-neutral Core and website initialization contracts
category: decisions
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 31
---

# ADR 0001 - Repository Bootstrap Baseline

## Status

Accepted on 2026-08-25 by documentation task `CTX-0009`.

This decision authorizes later repository-scoped implementation tasks to create
the described scaffolding. It does not claim that either scaffold exists, that
a product feature is implemented, or that deployment has occurred.

## Context

The public repositories are still unborn. The project needs a minimal,
reviewable foundation before product code, dependency selection, or website
content integration begins. The foundation must establish formatting, static
analysis, tests, and workflow validation without silently deciding the final
architecture or publication model.

The bootstrap intentionally separates two concerns:

- `bitty` needs a zero-functionality Cargo workspace that can exercise the
  accepted Rust 2024 toolchain and read-only CI gates.
- `bitty-website` needs a static Astro shell and an authenticated deployment
  path for static assets, while canonical documentation consumption remains
  unimplemented and undecided at the mechanism level.

## Decision

### Core repository baseline

The first `bitty` scaffold must contain a minimal Cargo workspace with:

- Rust edition 2024 and Cargo resolver version 3;
- the stable Rust channel with `rustfmt` and `clippy` components;
- one `bitty-core` library package and one `bitty-app` binary package;
- `publish = false` for both packages;
- no dependency entries and therefore no accepted crate edge at bootstrap;
- a `just` entry point for the accepted repository checks; and
- GitHub Actions CI that runs formatting checks, Clippy, tests, and `actionlint`
  without rewriting repository files.

The binary and library are compilation targets only. They must not expose a
terminal UI, CLI contract, parser, renderer, configuration runtime, plugin
runtime, IPC surface, or other product behavior.

The implementation task pins the exact stable toolchain, action versions,
package versions, and generated lockfile state that it verifies. Those pins are
reproducibility evidence for that revision, not permanent versions mandated by
this ADR.

### Website repository baseline

The first `bitty-website` scaffold must use:

- Astro as a static site generator;
- Bun for package installation and repository scripts;
- Astro static output in `dist`;
- Cloudflare Workers Static Assets as the deployment target; and
- Wrangler through GitHub Actions for an authorized deployment.

The static shell has no `bitty-docs` consumer. It must not copy canonical
documentation or imply that navigation, search, theme, public routes, redirects,
version selection, or documentation synchronization are implemented.

Astro static output needs no Cloudflare adapter and this baseline adds no Worker
script. A future server-rendered feature, Cloudflare adapter, runtime binding, or
Worker entry point requires a separate reviewed decision.

As with Core, the website implementation task selects and locks the exact Astro,
Bun, Wrangler, action, and transitive package versions it validates. This ADR
does not freeze drifting ecosystem versions.

## CI, CD, and credentials

Core CI is read-only with respect to source files. Its accepted logical gates
are equivalent to:

1. `cargo fmt --all -- --check`;
2. Clippy across the workspace and all targets with warnings denied;
3. tests across the workspace; and
4. `actionlint` over GitHub Actions workflows.

Website pull-request CI builds the static shell without deployment credentials
and verifies that the build output and deployment configuration agree on
`dist`. Deployment is a separate trusted GitHub Actions job and must never run
with secrets for untrusted pull-request code.

The deployment workflow may reference only these Cloudflare credential names:

- `secrets.CLOUDFLARE_API_TOKEN`;
- `secrets.CLOUDFLARE_ACCOUNT_ID`.

No document, source file, log, command argument, or task record may contain or
attempt to read their values. The API token must be scoped to the minimum
account and Workers permissions required for deployment.

`CRATES_TOKEN` is reserved for a future, explicitly approved crates.io
publication workflow. The bootstrap does not reference, read, validate, or use
it, and `publish = false` prevents accidental package publication.

## Deferred decisions

This ADR does not accept:

- the final Cargo crate graph or an application-to-library dependency edge;
- an MSRV, nightly policy, production dependency, or third-party crate;
- release profiles, product feature flags, licenses, package publication, or
  release automation;
- the parser, renderer, platform, configuration, plugin, DevTools, MCP, package,
  or distribution implementation stacks;
- a documentation adapter, loader, synchronization mechanism, version selector,
  theme, route map, redirect mechanism, or search implementation; or
- server rendering, a Cloudflare adapter, a Worker script, runtime bindings, or
  dynamic website behavior.

These items require their own repository-scoped task and any ADR, RFC, security
review, or compatibility evidence required by the canonical decision queue.

## Consequences

- Initialization can establish repeatable checks before product implementation.
- The two Core packages do not pre-judge the final architecture; later accepted
  boundaries may add, split, connect, or rename crates through another ADR.
- The website can prove a static build and deployment path without claiming a
  documentation consumer or choosing presentation policy.
- Package and action pins remain reviewable implementation evidence instead of
  becoming stale prose requirements.
- Deployment credentials stay outside the repository and outside documentation.

## Validation basis

External guidance was reviewed on 2026-08-25. Re-check these sources when the
implementation task pins versions or changes deployment behavior:

- [Cloudflare Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
  recommends Workers Static Assets for new projects and states that a purely
  static site needs no Worker script.
- [Astro Cloudflare integration](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
  states that a static Astro site needs no adapter.
- [Astro configuration reference](https://docs.astro.build/en/reference/configuration-reference/#outdir)
  records `dist` as the default `outDir`.
- [Cloudflare static-assets configuration](https://developers.cloudflare.com/workers/static-assets/binding/)
  defines the Wrangler asset-directory boundary.
- [Cloudflare GitHub Actions guidance](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
  documents Wrangler authentication using a scoped API token and account ID.
- [GitHub Actions secrets guidance](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
  documents secret-context references and cautions against exposing values.
- [Astro content collections](https://docs.astro.build/en/guides/content-collections/)
  and [Astro Markdown](https://docs.astro.build/en/guides/markdown-content/)
  remain compatibility evidence for a future validated docs consumer, not a
  selected loader or implemented integration.
