---
title: Architecture Diagrams
description: Interactive HTML diagram suite and architectural models for Bitty — unified canvas visualizations, component inspector, layer filtering, flow stepper, and vector SVG exports
category: architecture
audience: contributor
document_type: overview
status: draft
website_publish: true
sidebar_order: 10
---

# Architecture Diagrams

This directory hosts the interactive HTML architecture diagram suite for Bitty
at **Pre-alpha / M1 Hardening** (2026-08-29, `bitty` `7a4ee41` baseline
`de134ec`, 16 crates, 32 OQs Accepted). It provides rich, interactive HTML5 canvas
models that allow contributors and architects to pan, zoom, inspect component
properties, filter layers dynamically, simulate lifecycle flows step by step, and
export vector graphics.

## Architecture Diagram Hub

The master gallery and interactive explorer is located at:

- **[Interactive Architecture Explorer Hub](interactive/index.html)** — unified
  dashboard with live search, category filters, and embedded modal view for all 13
  models.

## Diagram Inventory

| ID                       | Title                                     | Level | Format             | Direct Interactive Model                                               |
| ------------------------ | ----------------------------------------- | ----- | ------------------ | ---------------------------------------------------------------------- |
| `00-overview`            | System Overview & Trust Boundaries        | L0    | Interactive Canvas | [00-overview.html](interactive/00-overview.html)                       |
| `01-core`                | Core Workspace Topology & 16-Crate DAG    | L1    | Interactive Canvas | [01-core.html](interactive/01-core.html)                               |
| `02-plugin-platform`     | Plugin Platform, VM & Event Pipeline      | L1    | Interactive Canvas | [02-plugin-platform.html](interactive/02-plugin-platform.html)         |
| `03-panel-system`        | Workspace Compositor & Panel Architecture | L1    | Interactive Canvas | [03-panel-system.html](interactive/03-panel-system.html)               |
| `04-config-model`        | Config Pipeline & XDG Layer Stack         | L2    | Interactive Canvas | [04-config-model.html](interactive/04-config-model.html)               |
| `05-package-lifecycle`   | Package Lifecycle & Integrity Chain       | L2    | Interactive Canvas | [05-package-lifecycle.html](interactive/05-package-lifecycle.html)     |
| `06-isolation-resource`  | Isolation Domains & Resource Ceilings     | L1+L3 | Interactive Canvas | [06-isolation-resource.html](interactive/06-isolation-resource.html)   |
| `07-ipc-agent`           | IPC, Debug Protocol & MCP Architecture    | L1    | Interactive Canvas | [07-ipc-agent.html](interactive/07-ipc-agent.html)                     |
| `08-rich-presentation`   | Rich Presentation & Terminal Truth        | L1    | Interactive Canvas | [08-rich-presentation.html](interactive/08-rich-presentation.html)     |
| `startup-flow`           | Startup Sequence & Simulation             | L2    | Flow Stepper       | [startup-flow.html](interactive/startup-flow.html)                     |
| `plugin-load-flow`       | Plugin Load Sequence & Simulation         | L2    | Flow Stepper       | [plugin-load-flow.html](interactive/plugin-load-flow.html)             |
| `config-resolution-flow` | Config Resolution & Reconcile             | L2    | Flow Stepper       | [config-resolution-flow.html](interactive/config-resolution-flow.html) |
| `panel-create-flow`      | Panel & View Creation Sequence            | L2    | Flow Stepper       | [panel-create-flow.html](interactive/panel-create-flow.html)           |

## Interactive Features

Every HTML model in `interactive/` is powered by the shared diagram engine
([diagram-engine.js](interactive/js/diagram-engine.js) and
[diagram-engine.css](interactive/css/diagram-engine.css)):

1. **Pan and Zoom**: Drag background to pan; mouse wheel to zoom focused on the
   cursor. Responsive auto-fit button to re-center graph.
2. **Draggable Nodes**: Rearrange nodes and clusters interactively. Connected
   edges and arrows dynamically recalculate anchor intersections in real time.
3. **Component Inspector**: Click any node or edge to open a slide-out drawer
   displaying metadata, crate paths, architectural invariants, security rules,
   and incoming/outgoing connection links.
4. **Dynamic Layer Filtering**: Toggle visibility between Foundation, State,
   Presentation, Extension Host, Orchestration, and Security Boundaries.
5. **Flow Simulation**: For sequence and lifecycle flows, step forward and back
   through the execution order or toggle auto-play to watch animated signals
   traverse the subsystem pipeline.
6. **Vector Export**: One-click export to high-resolution PNG or clean vector SVG.
7. **Zero Network Dependence**: Fully functional offline without external CDN
   access or third-party canvas libraries.

## Single Source of Truth

- Canonical inventory: [glossary.yaml](glossary.yaml) — defines every node,
  boundary, edge, shape, and level. No diagram may invent nodes not defined in
  the glossary.
- Data models: [interactive/js/diagrams-data.js](interactive/js/diagrams-data.js)
  encodes the structured graph definitions, invariants, and descriptions
  synchronized with the architecture corpus.
- Legacy text sources (`d2/*.d2`, `mermaid/*.mmd`) remain preserved in the
  repository for reference and text-based diffing.
- Static vector previews in `final/*.svg` carry clickable banners linking
  directly to the corresponding interactive HTML visualization.

## Directory Layout

```text
docs/architecture/
├── README.md                 # this file — interactive architecture index
├── glossary.yaml             # single node and edge data dictionary
├── overview.md               # system context, invariants, data flows
├── core-boundaries.md        # core vs plugin ownership and P0 gates
├── interactive/              # interactive HTML visualization suite
│   ├── index.html            # architecture diagram explorer hub
│   ├── 00-overview.html      # L0 system overview
│   ├── 01-core.html          # L1 core crate DAG
│   ├── 02-plugin-platform.html # L1 plugin platform
│   ├── 03-panel-system.html  # L1 workspace compositor
│   ├── 04-config-model.html  # L2 config pipeline
│   ├── 05-package-lifecycle.html # L2 package lifecycle
│   ├── 06-isolation-resource.html # L1 isolation & L3 ceilings
│   ├── 07-ipc-agent.html     # L1 IPC & MCP agent
│   ├── 08-rich-presentation.html # L1 rich presentation
│   ├── startup-flow.html     # L2 startup stepper
│   ├── plugin-load-flow.html # L2 plugin load stepper
│   ├── config-resolution-flow.html # L2 config resolution stepper
│   ├── panel-create-flow.html # L2 panel create stepper
│   ├── css/
│   │   └── diagram-engine.css # dark/light themes & controls
│   └── js/
│       ├── diagram-engine.js # canvas engine with drag/zoom/inspector
│       └── diagrams-data.js  # canonical graph models
├── final/                    # vector SVG previews with interactive links
│   ├── README.md             # SVG preview provenance and links
│   └── *.svg                 # vector exports linking to interactive HTML
├── d2/                       # legacy D2 text graph sources
└── mermaid/                  # legacy Mermaid flow sources
```

## Accuracy and Governance

Nodes and edges strictly adhere to:

- Crate graph and dependency DAG from
  [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) and
  `bitty/Cargo.toml` (16 crates `be3bdb4`, 18 members with harness at
  `7a4ee41`) — see [01-core.html](interactive/01-core.html).
- Overall model, invariants, and data flows from [Architecture
  Overview](overview.md) — see [00-overview.html](interactive/00-overview.html).
- Ownership and P0 gates from [Core and Plugin Boundaries](core-boundaries.md).
- Plugin API, manifest, and DropOldest queue budgets from
  [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) — see
  [02-plugin-platform.html](interactive/02-plugin-platform.html).
- Panel hierarchy and decoration ownership from
  [Workspace Compositor](../specifications/workspace-compositor.md) — see
  [03-panel-system.html](interactive/03-panel-system.html).
- Configuration pipeline from
  [Configuration Model RFC](../specifications/configuration-model-rfc.md) — see
  [04-config-model.html](interactive/04-config-model.html).
- Lifecycle and integrity chain from
  [Package Lifecycle RFC](../specifications/package-lifecycle-rfc.md) — see
  [05-package-lifecycle.html](interactive/05-package-lifecycle.html).
- Domains and ceilings RC-1..RC-11 from
  [Isolation and Resource RFC](../specifications/isolation-resource-rfc.md) — see
  [06-isolation-resource.html](interactive/06-isolation-resource.html).
- IPC protocol and MCP tool definitions from
  [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) — see
  [07-ipc-agent.html](interactive/07-ipc-agent.html).
- Rich presentation overlays and Terminal Truth separation from
  [Rich Presentation RFC](../specifications/rich-presentation-rfc.md) — see
  [08-rich-presentation.html](interactive/08-rich-presentation.html).
