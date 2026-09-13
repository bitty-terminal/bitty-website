---
title: Research notes coverage
description: Provenance matrix mapping the twelve local research notes into the canonical documentation corpus
category: provenance
audience: contributor
document_type: research
status: stable
website_publish: false
sidebar_order: 11
---

# Research notes coverage

The local workspace keeps a numbered research-note series under
`recording/research/` (`001` through `012`, of which `001`-`009` were
distilled earlier and `010`-`012` were consolidated on 2026-09-13). The notes
are durable scratch input, not canonical documents: they are not copied into
this repository, they are not implementation evidence, and nothing in them is
normative unless a canonical document establishes it. This page is the
traceability record from each note to the documents that carry its substance.

## Interpretation rules

The same rules as the [shared-conversation
coverage](chatgpt-share-coverage.md) apply. A research note is historical
design input and provenance. When a note and the maintained corpus disagree,
the corpus wins and the note stays as evidence of the earlier direction. After
a note is fully consolidated, its file is renamed to `NNN.md.completed` in the
local scratch directory so the completion state is visible without copying the
note into Git.

## Notes matrix

| Note  | Topic                                                                                     | Deposited in                                                                                                                                                                                                     | Status                                                                                                           |
| ----- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `001` | Mechanisms in Core, policy in plugins (PTY, grid, rendering vs. statusline, tabs).        | [Core boundaries](../architecture/core-boundaries.md)                                                                                                                                                            | Recorded: the mechanism/policy boundary is the accepted architecture rule.                                       |
| `002` | Hyprland-style panels: first-class UI containers, workspaces, IDE-like composition.       | [Panel vision](../product/panel-vision.md); [Panel runtime pre-study](../specifications/panel-runtime-pre-study.md)                                                                                              | Recorded as product direction and pre-study; no normative panel contract yet.                                    |
| `003` | Historical precedents: Zellij first-class plugin panes and Emacs platformization.         | [Reference projects](../project/reference-projects.md)                                                                                                                                                           | Recorded as comparative evidence.                                                                                |
| `004` | Hermes Agent lessons: progressive skill exposure, memory cycles, tool sandboxing.         | [AI architecture](../specifications/ai-architecture.md); [Reference projects](../project/reference-projects.md)                                                                                                  | Recorded; agent direction remains candidate per the AI architecture status.                                      |
| `005` | Survey of 15+ modern terminals; WaveTerm browser-rendering exploration; routing.          | [Reference projects](../project/reference-projects.md); [Proposed delivery sequence](../product/proposed-delivery-sequence.md)                                                                                   | Recorded.                                                                                                        |
| `006` | Foot, Ghostty, and WezTerm architecture comparisons; protocol evolution.                  | [Reference projects](../project/reference-projects.md); [Terminal feature gap analysis](../specifications/terminal-feature-gap-analysis.md)                                                                      | Recorded; the gap analysis carries the current shipped/partial/missing audit.                                    |
| `007` | Starship statusline and prompt semantic integration via OSC 133 marks.                    | [Rich content](../interfaces/rich-content.md); [Rich presentation RFC](../specifications/rich-presentation-rfc.md)                                                                                               | Recorded; statusline vs. starship boundary documented in the plugin roadmap (CTX-0377).                          |
| `008` | Lua engine route: Piccolo pin, sandbox, memory budgets, hook model.                       | [ADR 0005](../decisions/adrs/ADR-0005-lua-pins-and-stdlib.md); [Lua and XDG](../configuration/lua-and-xdg.md)                                                                                                    | Recorded; ADR 0005 is accepted and the VM pin is shipped.                                                        |
| `009` | Hyprland/Niri tiling algorithms, dwindle/master layouts, Mod/Leader dispatch.             | Architecture distillation merged to `main` via `4659467` (CTX-0135; `docs(architecture): distill 009 platform direction into canonical docs`)                                                                    | Recorded; the distillation branch was merged, so the substance is canonical.                                     |
| `010` | Bitty-AI compared with harnesses; spatial multi-agent orchestration; output compression.  | [AI architecture](../specifications/ai-architecture.md) consolidated in `3fb464a` (CTX-0171); OQ-061..OQ-066 registered in the [open-question register](../decisions/open-questions.md)                          | Recorded as candidate/direction; no shipped claim.                                                               |
| `011` | CarryCtx and ctxctl as native subsystems; roles and capabilities; Lua sandbox boundary.   | [AI architecture](../specifications/ai-architecture.md); [Lua and XDG](../configuration/lua-and-xdg.md); [Plugin system](../extensibility/plugin-system.md) consolidated in `d377b72` (CTX-0172); OQ-067..OQ-070 | Recorded as candidate/direction; Lua decides policy while Rust enforces capability remains the accepted ceiling. |
| `012` | Batched file I/O and token governance; atomic multi-file patch; LSP/Lint via Mason reuse. | [AI architecture](../specifications/ai-architecture.md) consolidated in `705072f` (CTX-0173); OQ-071 registered in the [open-question register](../decisions/open-questions.md)                                  | Recorded as candidate/direction; language-service and patch mechanisms remain open questions, not commitments.   |

## Coverage rule

Every note appears exactly once above. A note can map to several canonical
documents. Future edits change the canonical document first and then update
this traceability record. New decisions belong in the [decision
register](../decisions/index.md), and unresolved work belongs in the
[open-question register](../decisions/open-questions.md).
