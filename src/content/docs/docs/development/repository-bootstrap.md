---
title: Repository Bootstrap
description: Implementation and verification contract for the first Core and website scaffolds
category: development
audience: contributor
document_type: guide
status: accepted
website_publish: true
sidebar_order: 30
---

# Repository Bootstrap

## Purpose and status

This guide translates
[ADR 0001](../decisions/adrs/ADR-0001-repository-bootstrap-baseline.md) into
implementation acceptance checks. The ADR is accepted. Product-repository
tasks have created and locally validated both scaffolds, but this documentation
task does not create product files or supply commit, CI, release, or deployment
evidence.

Each product repository needs its own CarryCtx task, exact file scopes,
independent review, and CI evidence. This guide does not authorize a commit,
push, deployment, package publication, or product feature.

## Local implementation evidence

On 2026-08-25, Core task `bitty/CTX-0002` and website task
`bitty-website/CTX-0002` completed after independent local review. Both
repositories were still unborn and their scaffold files were uncommitted. The
evidence establishes local working-tree validation only:

| Repository      | Locally validated evidence                                                                                  | Evidence not established                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `bitty`         | Rust 1.97.1; exact two-package dependency-free workspace; format, Clippy, tests, `actionlint`, and metadata | Commit, GitHub CI, release, publication, or product behavior  |
| `bitty-website` | Bun 1.4.0 frozen install; native TypeScript check; static Astro build; `dist` and Wrangler dry-run gates    | Full Astro diagnostics, GitHub CI, deployment, or public site |

The website's missing full language-server diagnostics are tracked in
[FIND-0001](../findings/FIND-0001-astro-typescript-7-check-compatibility.md).
Native `tsc --noEmit` and `astro build` passed, but they are not equivalent to
`astro check`. No bootstrap task read credential values or performed a real
deployment.

## Core scaffold

The `bitty` implementation task must create only the accepted minimum:

| Area         | Required result                                                                |
| ------------ | ------------------------------------------------------------------------------ |
| Workspace    | Cargo workspace with `resolver = "3"`                                          |
| Language     | Both packages declare Rust edition 2024                                        |
| Toolchain    | A pinned stable channel with `rustfmt` and `clippy`                            |
| Library      | `bitty-core` library with `publish = false`                                    |
| Binary       | `bitty-app` binary with `publish = false`                                      |
| Dependencies | Both package dependency tables remain empty                                    |
| Commands     | `just` wraps format check, Clippy, tests, `actionlint`, and an aggregate check |
| CI           | GitHub Actions runs the same read-only logical gates                           |

The targets may contain only the minimum source needed to compile and test the
scaffold. Do not add terminal behavior, a user-facing command contract, runtime
dependencies, architecture layers, or placeholder APIs that imply a future
design decision.

The implementation pull request records the exact Rust channel, action/tool
versions, and lockfile result it verified on that revision. Do not copy those
drifting pins back into this long-lived contract unless a later ADR makes one a
compatibility promise.

## Website scaffold

The `bitty-website` implementation task must create only:

- an Astro static shell managed with Bun;
- a reproducible Bun lockfile using the versions selected by that task;
- a static build whose output is `dist`;
- Workers Static Assets configuration pointing at `dist` with no Worker script;
- pull-request CI that installs from the lockfile and builds without deployment
  credentials; and
- a trusted Wrangler deployment job that references only the approved GitHub
  Actions secrets.

The approved secret references are
`secrets.CLOUDFLARE_API_TOKEN` and
`secrets.CLOUDFLARE_ACCOUNT_ID`. Never inspect, print, persist, echo, transform,
or pass their values through command-line arguments. Prefer environment or
action inputs and a least-privilege, account-scoped API token.

`CRATES_TOKEN` remains unused and must not appear in either bootstrap workflow.
It is reserved for a future task that explicitly accepts crates.io publication.

No documentation checkout, adapter, loader, content collection, copied Markdown,
theme, search, route mapping, redirect, or multi-version behavior is admissible
in this scaffold. The website content contract remains the authority for a
future consumer.

## Required validation

### Core implementation evidence

The Core task must show that:

1. the pinned stable toolchain installs with `rustfmt` and `clippy`;
2. `cargo fmt --all -- --check` exits successfully without modifying files;
3. Clippy checks the full workspace and all targets with warnings denied;
4. workspace tests pass;
5. `actionlint` accepts every workflow;
6. the `just` aggregate invokes the same logical gates as CI;
7. both packages are non-publishable and contain no dependency entries; and
8. the diff contains no product behavior or unapproved architecture edge.

### Website implementation evidence

The website task must show that:

1. lockfile installation evidence is staged:
   - **Completed locally:** the generated repository lockfile supports a frozen
     Bun install in the unborn working tree; and
   - **Required after the first commit:** GitHub CI repeats the frozen install
     from the committed lockfile;
2. the Astro static build succeeds and produces `dist`;
3. Wrangler static-assets configuration consumes `dist` without a Worker
   script, runtime binding, or Astro Cloudflare adapter;
4. pull-request CI builds without Cloudflare secrets and cannot deploy;
5. the trusted CD job references only the two approved Cloudflare secret names;
6. no workflow exposes secret values and the token scope is reviewed;
7. `actionlint` and repository format/lint checks pass; and
8. the shell contains no canonical docs consumer or invented product behavior.

Documentation and dry validation come before any real deployment. A successful
build does not prove a successful deployment, route, custom domain, or docs
integration.

## Security gates

- Pin third-party actions to immutable revisions and package versions in the
  implementation pull request; review provenance and generated lockfiles.
- Give workflows the minimum GitHub permissions. Pull-request jobs are
  read-only and receive no deployment credentials.
- Never execute deployment from untrusted pull-request code or expose secrets
  to forks, logs, artifacts, caches, or previews.
- Keep Core free of dependencies so supply-chain, license, and capability
  choices remain explicit future decisions.
- Treat generated website output as public. It must contain no environment
  values, credentials, local paths, or unpublished canonical content.
- Record action, tool, and package versions as dated implementation evidence;
  re-verify official guidance rather than assuming this document freezes them.

## Non-goals

The bootstrap does not decide or implement the final crate graph, MSRV,
dependencies, release profile, license, publication, release automation,
terminal functionality, DevTools, MCP, plugin packaging, docs loader, adapter,
theme, search, routes, redirects, content synchronization, or versioned website.

## Review record

The external baseline was validated against official Astro, Cloudflare, and
GitHub Actions documentation on 2026-08-25. The ADR contains the source list.
Implementation tasks must re-check it when selecting concrete versions or
changing any deployment boundary.
