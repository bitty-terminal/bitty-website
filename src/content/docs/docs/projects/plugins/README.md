---
title: Plugin documentation
description: Per-plugin documentation partition with the standard plugin page set
category: project
audience: plugin-author
document_type: index
status: draft
website_publish: false
sidebar_order: 10
---

# Plugin documentation

This tree holds per-plugin documentation for Bitty's first-party and featured
plugin candidates. Each documented plugin gets its own directory
`docs/projects/plugins/<plugin>/` with the standard page set: status, design,
schemas and contracts, and evidence and links. The reusable starting point is
[`TEMPLATE.md`](TEMPLATE.md); the normative description lives in the
[documentation workflow](../../development/documentation-workflow.md#per-plugin-documentation-page-set).

## Candidate plugins

The list below records documentation candidates from draft planning. None of
these plugins is implemented, shipped, or accepted here; the
[Plugin Roadmap](../bitty/product/plugin-roadmap.md) (draft) is the planning
source, and names, identifiers, and batches may change before any plugin
contract is accepted.

| Plugin        | Batch | Documentation status | Planning notes                                                                 |
| ------------- | ----- | -------------------- | ------------------------------------------------------------------------------ |
| activity      | First | Not started          | Privacy-first local activity timeline.                                         |
| scratchpad    | First | Not started          | Ephemeral per-directory notes.                                                 |
| peek          | First | Not started          | Hover and preview anchored to semantic zones or rich blocks.                   |
| pet           | First | Not started          | Non-blocking companion overlay.                                                |
| palette       | Later | Not started          | Command palette and picker UI (`bitty-terminal.palette`).                      |
| statusline    | Later | Not started          | Statusline composition, including workspaceline (`bitty-terminal.statusline`). |
| file-manager  | Later | Not started          | Tiled file-manager panel (`bitty-terminal.file-manager`).                      |
| git-panel     | Later | Not started          | Tiled Git panel (`bitty-terminal.git-panel`).                                  |
| browser-panel | Later | Not started          | Browser view and panel (`bitty-terminal.browser-panel`).                       |
| ai-panel      | Later | Not started          | Agent panel surface (`bitty-terminal.ai-panel`).                               |
| mail-panel    | Later | Not started          | Mail triage panel (`bitty-terminal.mail-panel`).                               |

## Creating a plugin directory

1. Copy [`TEMPLATE.md`](TEMPLATE.md) to
   `docs/projects/plugins/<plugin>/README.md` and fill in the identity, stage,
   owning repository, and links.
2. Add `design.md`, `schemas.md`, and `evidence.md` when the plugin has real
   content for each; do not create empty placeholder pages.
3. Keep the flat frontmatter schema exact; a metadata mismatch fails
   `just metadata`.
4. Link cross-project contracts from the shared directories instead of
   restating them.

## Related

- [Project documentation partition](../README.md)
- [Plugin system](../bitty/extensibility/plugin-system.md)
- [Plugin Roadmap](../bitty/product/plugin-roadmap.md) (draft)
- [Default Distribution RFC](../bitty/specifications/default-distribution-rfc.md)
