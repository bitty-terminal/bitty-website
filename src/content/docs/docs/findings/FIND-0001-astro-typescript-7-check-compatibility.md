---
title: Finding 0001 - Astro and TypeScript 7 Check Compatibility
description: Records the verified full Astro diagnostics gap with the required TypeScript 7 toolchain
category: findings
audience: contributor
document_type: register
status: accepted
website_publish: false
sidebar_order: 11
---

# Finding 0001 - Astro and TypeScript 7 Check Compatibility

## Finding status

`FIND-0001` is an open compatibility finding observed on 2026-08-25 during
`bitty-website` task `CTX-0002`. The observation was independently reviewed in
that repository. This document preserves evidence and disposition; it does not
change [ADR 0001](../decisions/adrs/ADR-0001-repository-bootstrap-baseline.md)
or claim that full Astro diagnostics are available.

| Field              | Value                                                                               |
| ------------------ | ----------------------------------------------------------------------------------- |
| Scope              | `bitty-website` local full Astro diagnostics                                        |
| Evidence date      | 2026-08-25                                                                          |
| Source task        | Independently reviewed and completed `bitty-website/CTX-0002`                       |
| Documentation task | `bitty-docs/CTX-0010`                                                               |
| Affected contract  | [Repository Bootstrap](../development/repository-bootstrap.md) diagnostics evidence |
| Severity           | Moderate for development assurance; not a demonstrated runtime defect               |
| Impact             | Full language-server diagnostics for `.astro` files are unavailable                 |
| Owner              | `bitty-website` toolchain and quality maintainers                                   |
| Disposition        | Retain TypeScript 7, remove the incompatible unused package, and track restoration  |
| Status             | Open until the follow-up acceptance criteria are satisfied                          |

There is no originating GitHub Issue or source revision: the website repository
was unborn and the independently reviewed scaffold remained uncommitted.

## Affected versions

The reproducible experiment used this exact tool set:

| Tool or package  | Version | Role and disposition                                    |
| ---------------- | ------- | ------------------------------------------------------- |
| Bun              | 1.4.0   | Package manager and task runner                         |
| Astro            | 7.2.6   | Static site generator and `astro check` command         |
| TypeScript       | 7.0.2   | Required native compiler; retained                      |
| `@astrojs/check` | 0.9.10  | Attempted for diagnostics, then removed as incompatible |

The versions are dated repository evidence, not permanent compatibility
requirements. The final bootstrap lockfile does not contain `@astrojs/check`.

## Reproduction and observed result

Before removing `@astrojs/check`, the package script was:

```text
typecheck: ASTRO_TELEMETRY_DISABLED=1 astro check
```

The exact task invocation was:

```sh
bun run typecheck
```

With the versions above, Bun 1.4.0 printed the child command, Astro 7.2.6
generated types and began diagnostics, and the Astro language server reported
that the loaded TypeScript 7.0.2 compiler did not expose the required
programmatic API. The script exited with status `1` before full Astro
language-server diagnostics could complete.

The error means the TypeScript 7 native CLI can type-check supported TypeScript
inputs, but the programmatic language-service surface needed to analyze
embedded Astro files is not yet available. Astro tracks this limitation in its
official
[TypeScript 7 compatibility discussion](https://github.com/withastro/roadmap/discussions/1321).

## Retained checks and evidence boundary

After removing the incompatible and otherwise unused package, the final
repository gates run:

```sh
tsc --noEmit --project tsconfig.json
ASTRO_TELEMETRY_DISABLED=1 astro build
```

Both commands passed locally with TypeScript 7.0.2 and Astro 7.2.6. The native
TypeScript command checks the TypeScript inputs covered by its project, while
the Astro build separately compiles the static Astro template. Together they
are useful bootstrap evidence, but they are not equivalent to `astro check` and
do not provide its full `.astro` language-server diagnostics.

Neither result proves deployed runtime behavior, a successful Cloudflare
deployment, public routing, a custom domain, or GitHub CI execution. No
deployment was performed as part of the bootstrap or this finding. The finding
does not establish that a configured runtime or deployment is either functional
or broken.

## Disposition

The project keeps the user-required latest baseline of TypeScript 7.0.2 and Bun
1.4.0 and does not downgrade TypeScript to satisfy the older diagnostics
package. `@astrojs/check` 0.9.10 was removed because an unused incompatible
package would imply a gate that the repository cannot execute. Native
`tsc --noEmit` and `astro build` remain separate required gates, and this
finding makes the missing diagnostic coverage explicit.

## Follow-up trigger and acceptance

The `bitty-website` toolchain owner must reopen diagnostics integration when an
official Astro release supports the stable TypeScript 7 programmatic API, or
when a later toolchain update otherwise changes this compatibility boundary.

Resolution requires all of the following evidence in a separately scoped task:

1. review the current official Astro and TypeScript compatibility guidance;
2. add an exact compatible `@astrojs/check` version through the frozen lockfile;
3. restore `astro check` to local aggregate checks and read-only CI;
4. show that the command exits successfully with the retained TypeScript 7
   baseline and that a reviewed negative fixture exercises `.astro` diagnostics;
5. keep native TypeScript and static-build gates passing; and
6. update this finding and the
   [repository bootstrap guide](../development/repository-bootstrap.md) with
   the reviewed revision evidence.
