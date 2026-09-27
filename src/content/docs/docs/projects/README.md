---
title: Project documentation
description: Routing index for project documentation mounted as root submodules from the three project documentation repositories
category: project
audience: mixed
document_type: index
status: accepted
website_publish: false
sidebar_order: 10
---

# Project documentation

This page routes to project documentation that previously lived under
`docs/projects/`. Project content now lives in three independent repositories
and is mounted at the `bitty-docs` repository root as Git submodules pinned to
each repository's merged `main`:

| Submodule         | Repository                                                                   | Scope                                                                                                                  | Code-repository mount |
| ----------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `bitty-terminal/` | [bitty-terminal-docs](https://github.com/bitty-terminal/bitty-terminal-docs) | Terminal platform: architecture, specifications, interfaces, product, user guide, and the rest of the terminal corpus. | `bitty/docs`          |
| `bitty-ai/`       | [bitty-ai-docs](https://github.com/bitty-terminal/bitty-ai-docs)             | Independent AI core: AI architecture, IPC and Agent RFC, Browser and Agent panel pre-study.                            | `bitty-ai/docs`       |
| `bitty-plugins/`  | [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs)   | Plugin platform, SDK, lifecycle, package, isolation, and per-plugin pages.                                             | `bitty-plugins/docs`  |

## What stays shared

Cross-project material remains in the shared top-level directories of this
repository: `decisions/` (ADRs and the global open-question register),
`security/`, `development/`, `sources/`, `findings/`, `reviews/`, `handoff/`,
`project/` (shared project-state and technology governance), `roadmap/`, and
`releases/`. `docs/project/` (singular) is not part of this partition.

## Routing rules

1. New project-specific documents go to the owning project documentation
   repository; this repository keeps shared governance only.
2. Cross-project contracts, registers, policies, and the security corpus stay
   in the shared top-level directories; project pages link to them instead of
   copying them.
3. Open-question and ADR/RFC numbering stay global; the single
   [open-question register](../decisions/open-questions.md) owns every OQ.
4. Each plugin uses the standard page set (status, design, schemas and
   contracts, evidence and links) under `docs/plugins/<plugin>/` in
   `bitty-plugins-docs`, starting from the
   [plugin documentation template](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/docs/plugins/TEMPLATE.md).

## Canonical cross-repository pointers

Two documentation requests are owned by the project documentation
repositories above, so this repository records pointers instead of copies:

- XDG/Windows directory topology and credential storage tiers are owned by
  [Lua and XDG](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/configuration/lua-and-xdg.md)
  in `bitty-terminal-docs`: the config/data/state/cache/runtime/bin mapping
  table, the OS keyring and `0600` headless-store credential tiers, and the
  os.getenv/Config-VM policy cross-reference to
  [ADR 0006](../decisions/adrs/ADR-0006-os-env-policy.md). The `BittyDirs`
  abstraction, the native macOS/Windows mappings, and the credential tiers
  are candidate contracts and unimplemented; only the configuration-root
  probe is shipped. No in-repo page duplicates this material.
- Lua-glue external-CLI integration patterns and bat/glow rendering status
  are owned by the [Plugin Reuse and Providers draft](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/packaging/plugin-reuse-and-providers.md)
  in `bitty-plugins-docs`: manifest-declared tools with `doctor`
  diagnostics, the host-managed async runner with tree kill on unload, the
  provider pattern, and native PTY hosting with the `terminal.spawn` flow;
  truecolor and emoji width shipped, ZWJ shaping and BiDi unsupported, and
  the Markdown/highlighting/shaping crates named as candidates with no
  adoption implied. No in-repo page duplicates this material.

## Working with the submodules

```sh
git submodule update --init            # materialize the three project trees
git submodule update --remote <path>   # intentionally bump one pointer
```

Content changes are made in the owning repository through its own Issue,
CarryCtx task, branch, review, and CI; the aggregator then bumps the submodule
pointer in a scoped review. The full procedure is normative in the
[documentation workflow](../development/documentation-workflow.md#submodule-pointer-updates).
