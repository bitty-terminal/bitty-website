---
title: Final Architecture Diagrams
description: Vector SVG exports and interactive HTML integration for Bitty architecture models
category: architecture
audience: contributor
document_type: overview
status: draft
website_publish: true
sidebar_order: 11
---

# Final Architecture Diagrams

This directory holds the vector SVG exports for every architecture diagram under
`docs/architecture/`. Each SVG is a maintained export synchronized with the
canonical architecture models and features an embedded interactive link pointing
directly to its rich, operable HTML canvas equivalent under
`docs/architecture/interactive/`.

- Interactive suite: [`../interactive/index.html`](../interactive/index.html).
- Canonical source of truth: [`../glossary.yaml`](../glossary.yaml) — the
  authoritative node, boundary, and edge inventory.
- Derived and synchronized data: the structured graph definitions in
  [`../interactive/js/diagrams-data.js`](../interactive/js/diagrams-data.js) and
  these SVG exports.
- Levels: L0 overview, L1 subsystem, L2 flow, L3 relation.

## Inventory and Interactive Destinations

| SVG Target                   | Interactive Canvas Model                                                                   | Level | Description                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ----- | ---------------------------------------------- |
| `00-overview.svg`            | [`../interactive/00-overview.html`](../interactive/00-overview.html)                       | L0    | System overview & trust boundaries (IR-D1..D3) |
| `01-core.svg`                | [`../interactive/01-core.html`](../interactive/01-core.html)                               | L1    | Core 16-crate DAG across 5 layers              |
| `02-plugin-platform.svg`     | [`../interactive/02-plugin-platform.html`](../interactive/02-plugin-platform.html)         | L1    | Plugin platform, Piccolo VM, and queues        |
| `03-panel-system.svg`        | [`../interactive/03-panel-system.html`](../interactive/03-panel-system.html)               | L1    | Window, Workspace, LayoutTree, and Views       |
| `04-config-model.svg`        | [`../interactive/04-config-model.html`](../interactive/04-config-model.html)               | L2    | Config pipeline and XDG layers                 |
| `05-package-lifecycle.svg`   | [`../interactive/05-package-lifecycle.html`](../interactive/05-package-lifecycle.html)     | L2    | Package lifecycle & 7-step integrity chain     |
| `06-isolation-resource.svg`  | [`../interactive/06-isolation-resource.html`](../interactive/06-isolation-resource.html)   | L1+L3 | Isolation domains & RC-1..10 ceilings          |
| `07-ipc-agent.svg`           | [`../interactive/07-ipc-agent.html`](../interactive/07-ipc-agent.html)                     | L1    | IPC sockets, devtools synthesis, MCP server    |
| `08-rich-presentation.svg`   | [`../interactive/08-rich-presentation.html`](../interactive/08-rich-presentation.html)     | L1    | Terminal truth grid & rich media overlays      |
| `startup-flow.svg`           | [`../interactive/startup-flow.html`](../interactive/startup-flow.html)                     | L2    | Startup sequence & flow stepper                |
| `plugin-load-flow.svg`       | [`../interactive/plugin-load-flow.html`](../interactive/plugin-load-flow.html)             | L2    | Plugin load sequence & flow stepper            |
| `config-resolution-flow.svg` | [`../interactive/config-resolution-flow.html`](../interactive/config-resolution-flow.html) | L2    | Config resolution & hot-reconcile stepper      |
| `panel-create-flow.svg`      | [`../interactive/panel-create-flow.html`](../interactive/panel-create-flow.html)           | L2    | Panel & view creation sequence stepper         |

## Embedding in Documentation

In Markdown documentation, link or embed the diagrams using either the vector
SVG preview or directly link to the interactive HTML visualization:

```markdown
<!-- Link directly to the interactive HTML visualization -->

[Explore L0 System Overview (Interactive)](../interactive/00-overview.html)

<!-- Or embed the vector SVG with fallback and clickable interactive banner -->

[![L0 System Overview](final/00-overview.svg)](interactive/00-overview.html)
```

## Maintenance

The SVGs are maintained vector exports committed alongside the synchronized
data model in
[`../interactive/js/diagrams-data.js`](../interactive/js/diagrams-data.js). This
repository does not ship an SVG generator: when a diagram changes, update its
SVG export and the corresponding interactive model in the same change, then run
`just svg` to confirm every committed SVG is well-formed XML.
