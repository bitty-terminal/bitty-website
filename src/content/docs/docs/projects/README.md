---
title: Project documentation
description: Per-project documentation partition separated from shared cross-project governance
category: project
audience: mixed
document_type: index
status: accepted
website_publish: false
sidebar_order: 10
---

# Project documentation

This tree holds per-project documentation for the Bitty ecosystem. It
separates project-specific material from the shared cross-project governance
that stays in the repository top-level directories. The partition was approved
on 2026-09-13 and is recorded in the
[documentation workflow](../development/documentation-workflow.md#repository-layout-and-routing).

## Project partitions

| Project  | Directory                       | Scope                                                                             | Stage                                                                 |
| -------- | ------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Bitty    | [bitty/](bitty/README.md)       | Terminal platform: core, VT, PTY, UI, configuration, plugin host, IPC, packaging. | Active; terminal-platform docs migrated here in Phase 2.              |
| Bitty AI | [bitty-ai/](bitty-ai/README.md) | Independent AI-core project: runtime, providers, and context.                     | Placeholder; content lands as the AI-core project produces it.        |
| Plugins  | [plugins/](plugins/README.md)   | Per-plugin documentation for first-party and featured plugin candidates.          | Skeleton plus a [page template](plugins/TEMPLATE.md); no content yet. |

## What stays shared

Cross-project material remains in the existing top-level directories:
`decisions/` (ADRs and the global open-question register), `security/`,
`development/`, `sources/`, `findings/`, `reviews/`, `handoff/`, `project/`
(shared project-state and technology governance), `roadmap/`, and `releases/`.

## Routing rules

1. New project-specific documents go under `docs/projects/<project>/`.
2. Cross-project contracts, registers, policies, and the security corpus stay
   in the shared top-level directories; project pages link to them instead of
   copying them.
3. Open-question and ADR/RFC numbering stay global; the single
   [open-question register](../decisions/open-questions.md) owns every OQ.
4. Each plugin gets `docs/projects/plugins/<plugin>/` with the standard page
   set (status, design, schemas and contracts, evidence and links).

`docs/project/` (singular) is not part of this partition: it remains the
shared project-state and technology-governance area.

## Current stage

Phase 1 created this partition and its index pages. Phase 2 (CTX-0185)
migrated the existing terminal-platform documents into
[`bitty/`](bitty/README.md) with rewritten links and preserved publication
status. Later phases land `bitty-ai/` and per-plugin content.
