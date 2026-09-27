---
title: AI Surface Accepted Record
description: Accepted subset of the AI-named Core surface reconciliation restated from accepted Panel IPC ownership and budget contracts
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 34
---

# AI Surface Accepted Record

> Status: **accepted record**. This document canonicalizes only the
> **accepted subset** of the bitty draft candidate record
> [ai-surface-reconciliation.md](https://github.com/bitty-terminal/bitty/blob/main/specifications/ai-surface-reconciliation.md)
> (CTX-0423, bitty issue #700, bitty PR #702) into the owning terminal-platform
> specifications, per that record's own follow-up item. It restates accepted
> contracts and records value mirrors; it authorizes no new Core API, changes
> no wire name, removes no Core API, and weakens no accepted contract. Every
> candidate verdict, demotion change `D-1`..`D-6`, and follow-up `F-1`..`F-4`
> in the bitty record stays a proposal in that record and is referenced here
> by absolute URL only, never copied as accepted. Acceptance records a
> reviewed contract; it does not prove implementation, and evidence rules in
> each cited document still apply.

## Purpose and scope

The bitty pressure-test gap `G-5` asked whether each AI-named Core item in
`ai_panel.rs` is covered by a generic primitive before any AI-specific Core
API is granted. The bitty record answers with 17 keep/demote verdicts. This
record moves only the keep verdicts that rest on already-accepted contracts;
everything that needs a follow-up task, an open draft row, or an open
question stays outside this accepted text.

In scope (accepted subset moved here):

- the generic `panel.*` closed family as used by the AI panel;
- the generic command-registry placement of the panel command set;
- the generic tiling-layout reuse through `LayoutNode` primitives;
- the public Panel Runtime creation path and the thin `AgentId` alias;
- the `32 KiB` context-budget value reuse with `OQ-066` left open;
- the IPC framing value mirrors for the MCP helpers.

Out of scope (candidate, referenced by URL only):

- every demotion change `D-1`..`D-6` and its follow-up tasks `F-1`..`F-4`;
- every demote or rehome verdict on `agent.*`, `ai.*`, workspace, memory, and
  provider/stream/model authority;
- the draft consent-to-scope rows and the open per-model budget profiles;
- the planned generic read, dispatch, execution, bridge, and fragment
  services owned by sibling tasks.

Where this record restates an accepted rule it cites the accepted document
and does not re-define it. Cross-project contracts are linked by absolute
URL, never copied.

## Source contracts

| Source                                                                                                                                          | Status                     | Used for                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [Panel Runtime RFC](panel-runtime-rfc.md)                                                                                                       | Accepted                   | closed `panel.*` family, single-owner placement, command registry, layout primitives, creation lifecycle      |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)                                  | Accepted (`OQ-018` closed) | 13-scope registry, per-request evaluation, ledgered consent, IPC framing bounds                               |
| [Decision register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md) (`DIR-018` parallel-delivery direction)     | Accepted                   | ownership split and no-new-AI-logic guard                                                                     |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) (`OQ-066` context-budget row) | Open                       | `32 KiB` default stays open; per-model profiles undecided                                                     |
| [Core and Plugin Boundaries](../architecture/core-boundaries.md)                                                                                | Accepted                   | ownership tables cited, never redefined here                                                                  |
| [ai-surface-reconciliation.md](https://github.com/bitty-terminal/bitty/blob/main/specifications/ai-surface-reconciliation.md) (bitty, CTX-0423) | Draft candidate            | provenance for the full 17-verdict table and `D-1`..`D-6` / `F-1`..`F-4`; candidate text is not accepted here |

## Accepted subset

Each row below restates an already-accepted contract as it applies to the AI
panel surface. No row adds a Core API, a capability family, a scope, a wire
name, or a bound.

| #   | Accepted statement                                                                                                                                                               | Authority                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| A-1 | The AI panel uses the closed generic `panel.*` family (`panel.provider`, `panel.create`, and related focus/overlay handling) and invents no capability family.                   | [Panel Runtime RFC](panel-runtime-rfc.md), capability-isolation and placement sections                                                       |
| A-2 | The five qualified `bitty-terminal.ai-panel:*` panel commands live under the generic command registry as panel actions; a command grants no authority by itself.                 | [Panel Runtime RFC](panel-runtime-rfc.md), command-registry section                                                                          |
| A-3 | AI-panel tiling reuses the generic `LayoutNode` `H`/`V` primitives with Core-owned decoration; no new tiling primitive is introduced.                                            | [Panel Runtime RFC](panel-runtime-rfc.md) with [Workspace Compositor Specification](workspace-compositor.md)                                 |
| A-4 | AI-panel creation follows the public Panel Runtime creation path (create then mount with typed errors); its capability list follows rows A-1 through A-7 as those stand.         | [Panel Runtime RFC](panel-runtime-rfc.md), lifecycle and placement sections                                                                  |
| A-5 | Agent identity validation stays a thin bounded `owner.name` alias over the small `bitty-agent` `AgentId` vocabulary, which the accepted direction already records as sufficient. | [Decision register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md) (`DIR-018` already-sufficient list)      |
| A-6 | The `32 KiB` per-turn context-budget value is reused as-is; this record accepts no new default and closes nothing. `OQ-066` per-model budget profiles stay open.                 | [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) (`OQ-066` row, open)       |
| A-7 | The MCP framing helper values mirror the accepted IPC transport bounds (`256 KiB` frame, `512 KiB` in-flight); the planned generic dispatch owns them when it lands.             | [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (`OQ-018`, RC-9/RC-10 quotas) |

Confidence: rows A-1 through A-5 rest on the accepted Panel Runtime, IPC,
and `DIR-018` contracts; rows A-6 and A-7 are value mirrors with the
`OQ-066` open question and the planned-dispatch ownership explicitly
preserved.

## Ownership restatement (accepted, unchanged)

- Panel lifecycle is owned by the panel runtime, layout and decoration by the
  workspace, and terminals and PTY descriptors by the registry; no panel
  holds a PTY descriptor. This rule is stated in the
  [Panel Runtime RFC](panel-runtime-rfc.md) and the
  [Core and Plugin Boundaries](../architecture/core-boundaries.md) tables and
  is cited here, not redefined.
- The `DIR-018` split is restated by citation only: Bitty owns Panel,
  Execution, IPC, snapshots, capabilities, rich projection, and process/PTY;
  `bitty-ai` owns Provider, Agent, Session, projection, memory,
  orchestration, and selection. See the
  [decision register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md).
  This record moves authority toward that split and moves no requirement
  between owners.

## Candidate fence (referenced, not accepted)

The following content is **candidate** and lives only in the bitty draft
record linked below. It is named here so a reader can find it; no wording
below accepts, revises, or duplicates it.

- Demotion changes `D-1` (terminal context to a generic bounded read grant),
  `D-2` (workspace assembly behind agent-layer grants, no new Core scope),
  `D-3` (memory persistence consent and type with agent-layer ownership),
  `D-4` (`mcp.invoke` shape re-documented as Tool Bus vocabulary with
  re-export), `D-5` (provider, stream, and model authority removal from
  Core), and `D-6` (freeze on new `ai.*` / `agent.*` surface until the
  generic alternative is filed and rejected): see the specified-demotion
  section of
  [ai-surface-reconciliation.md](https://github.com/bitty-terminal/bitty/blob/main/specifications/ai-surface-reconciliation.md).
- Demote, rehome, and cosmetic verdicts on `agent.context.terminal`,
  `agent.context.workspace`, `agent.memory:persist`, the `mcp.invoke:`
  ownership prefix, `ai.provider`, `ai.stream`, `ai.model`,
  `AgentMemoryEntry`, `AgentWorkspaceFile`, and the `AI_PANEL_` Rust symbol
  prefix: see the per-item reconciliation table of the same bitty record.
- Follow-up implementation tasks `F-1` (generic bounded context-read
  service), `F-2` (agent-layer workspace and memory consent with type
  extraction), `F-3` (provider registry, selection, I/O, and streaming
  consent in `bitty-ai`), and `F-4` (cosmetic prefix clean-up and helper
  re-export): see the follow-ups section of the same bitty record.
- Draft consent-to-scope mapping rows (proven terminal-read row; open
  workspace and memory rows): see the draft
  [RFC-0003](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0003-ai-consent-scope-mapping.md)
  in shared governance. This record cites its confidence rows and keeps the
  Core-surface review separate, as that RFC requires.
- Planned generic services (snapshot handler, tool dispatch,
  ExecutionContext, bridge SDK, rich fragments): owned by sibling tasks
  `CTX-0419` through `CTX-0422` and the parallel `CTX-0420` dispatcher
  workstream. This record specifies no dispatcher behavior, handler, or
  method.
- Canonicalization provenance: bitty issue
  [#700](https://github.com/bitty-terminal/bitty/issues/700) and bitty PR
  [#702](https://github.com/bitty-terminal/bitty/pull/702)
  (`CTX-0423`, gap `G-5`).

## Explicit non-acceptance

- No Core code, capability string, gate helper, bound, command, type, scope,
  or wire name is added, changed, or removed by this record.
- No new AI logic in Core is proposed or authorized; the `DIR-018` no-new-AI-logic
  guard stands as cited.
- The `32 KiB` default is not revised and `OQ-066` is not closed.
- The accepted [Panel Runtime RFC](panel-runtime-rfc.md) closed family,
  single-owner rules, and normative security controls are not weakened; no
  bypass, ambient authority, or allow-all capability is proposed.
- The accepted [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  ownership tables are untouched by this record.

## References

- Bitty draft candidate record (provenance, not accepted here):
  [ai-surface-reconciliation.md](https://github.com/bitty-terminal/bitty/blob/main/specifications/ai-surface-reconciliation.md)
- Accepted panel contract:
  [Panel Runtime RFC](panel-runtime-rfc.md)
- Accepted IPC contract (`OQ-018` closed):
  [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
- Accepted parallel-delivery direction:
  [decision register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md)
  (`DIR-018`)
- Open budget question (stays open):
  [open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  (`OQ-066`)
- Draft consent mapping (stays separate):
  [RFC-0003](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0003-ai-consent-scope-mapping.md)
- Reconciliation issue and delivery pull request:
  [bitty#700](https://github.com/bitty-terminal/bitty/issues/700),
  [bitty#702](https://github.com/bitty-terminal/bitty/pull/702)
