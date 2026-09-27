---
title: Architecture Diagrams
description: Small glossary-driven AI architecture diagram set for overview agent graph and context compile
category: architecture
audience: contributor
document_type: index
status: draft
website_publish: false
sidebar_order: 10
---

# Architecture Diagrams

Small-scale AI architecture diagram set for `bitty-ai-docs`, mirroring the
terminal-docs glossary-driven model: one canonical
[glossary](glossary.yaml), D2 text sources, and vector SVG exports. Every
node traces to accepted or draft code or RFC; no diagram invents nodes.

## Admission criteria

A diagram belongs here when every node traces to an accepted contract, a draft
disposition, or pinned implementation evidence, and the canonical inventory in
[glossary.yaml](glossary.yaml) defines it. New diagrams are added only when the
owning specification or RFC first defines their vocabulary; no diagram may
invent nodes.

## Authority and status

- **Accepted floor:** [IPC and Agent RFC](../../specifications/ipc-agent-rfc.md)
  defines the only accepted IPC wire, scope, and Agent vocabulary. Solid
  edges to `IPC Channel` and `AgentMessage` rest on that contract.
- **Draft dispositions:** R1 single-agent execution ownership
  ([R1](../execution-ownership-r1.md)), draft mailbox
  directions ([Agent coordination](../../agent/agent-coordination.md)),
  draft single-authority Task model ([R5](../task-lifecycle-r5.md)),
  draft session-versus-context invariant
  ([Context management](../../context/context-management.md)), draft
  stable-prefix ordering
  ([Prefix-cache design](../../context/prefix-cache-context-design.md)),
  and draft structural compaction (same design, eight invariants).
- **Candidate discussion input:** the [event-sourced agent workspace
  candidate](../../specifications/event-sourced-agent-workspace-candidate.md)
  plus companions
  [quality formula and context compiler](../../specifications/quality-and-context-compiler-candidate.md),
  [wheel configuration and context git model](../../specifications/wheel-config-and-context-git-model-candidate.md),
  [wheel core and plugin boundary](../../specifications/wheel-core-plugin-boundary-candidate.md),
  [execution supervisor](../../specifications/execution-supervisor-candidate.md),
  [wheel scope and framework](../../specifications/wheel-scope-and-framework-candidate.md),
  [panel and agent workspace](../../specifications/panel-workspace-candidate.md),
  [plugin and extension model](../../specifications/plugin-extension-model-candidate.md),
  [IPC extension boundary](../../specifications/ipc-extension-boundary-candidate.md),
  and [caller attribution](../../agent/caller-attribution-design.md).
  Dashed nodes and edges are vocabulary only: no schema, wire, command,
  threshold, or release decision follows.
- **Implemented anchors:** observed in `bitty-ai` at `3623c6b3`
  (inspected 2026-09-14, experimental slice, not the complete runtime):
  `crates/bitty-ai-runtime/src/{agent,context,session,tool,bridge,prompt}.rs`
  and `crates/bitty-ai-slice/src/journal_prototype.rs`. Anchors mirror the
  draft pipeline at small scale; the single-agent, L0-plus-L1, and
  deny-by-default limits stay in force.

## Diagram inventory

| ID                   | Title                                | Level | Sources                                              | Export                                                       |
| -------------------- | ------------------------------------ | ----- | ---------------------------------------------------- | ------------------------------------------------------------ |
| `00-overview`        | AI overview and six-object split     | L0    | [d2/00-overview.d2](d2/00-overview.d2)               | [final/00-overview.svg](final/00-overview.svg)               |
| `01-agent-graph`     | Agent Graph vs Task DAG with mailbox | L1    | [d2/01-agent-graph.d2](d2/01-agent-graph.d2)         | [final/01-agent-graph.svg](final/01-agent-graph.svg)         |
| `02-context-compile` | Context compile Cold Warm Hot        | L1-L2 | [d2/02-context-compile.d2](d2/02-context-compile.d2) | [final/02-context-compile.svg](final/02-context-compile.svg) |

## Single source of truth

- Canonical inventory: [glossary.yaml](glossary.yaml) defines every node,
  edge, status, and trace. No diagram may invent nodes not defined there.
- Text sources: `d2/*.d2` are the editable graph definitions.
- Static vectors: `final/*.svg` are D2 exports committed alongside the
  sources; regenerate with `d2 architecture/diagrams/d2/<id>.d2
architecture/diagrams/final/<id>.svg`, then run `just svg`.

## Directory layout

```text
architecture/diagrams/
├── README.md               # this file — small-scale diagram index
├── glossary.yaml           # single node and edge data dictionary
├── d2/                     # editable D2 text graph sources
│   ├── 00-overview.d2
│   ├── 01-agent-graph.d2
│   └── 02-context-compile.d2
└── final/                  # vector SVG exports
    ├── 00-overview.svg
    ├── 01-agent-graph.svg
    └── 02-context-compile.svg
```

## Maintenance

When a diagram changes, update its D2 source, its SVG export, and the
glossary trace in the same change, then run `just svg` to confirm every
committed SVG is well-formed XML. Promotion of any candidate node to draft
or accepted status happens in the owning specification first, never here.
