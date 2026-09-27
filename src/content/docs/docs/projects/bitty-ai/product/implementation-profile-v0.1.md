---
title: v0.1 Implementation Profile
description: Minimal experimental scope for the first bitty-ai runtime increment
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 25
---

# v0.1 Implementation Profile

## Purpose and scope

This profile selects a minimal experimental scope so implementation can start
before the full architecture is decided. It accepts nothing: every mechanism
below is adopted **experimentally** and stays revisable by implementation
evidence. Anything not listed here is out of scope for v0.1, not rejected.

## v0.1 in scope

- Single `bitty-ai-runtime` crate with modules for provider, context, session,
  tool, agent loop, and streaming. No five-crate split yet; the
  `bitty-ai-core` name is avoided because it collides with Bitty Core, and
  `bitty-ai-core` remains a conceptual layer, not a crate assignment.
- Deterministic runtime behind a `FakeProvider` (the slice's
  `DeterministicLocalProvider` pattern). No network model providers
  (OpenAI, Anthropic, Gemini, OpenRouter) and no remote endpoints yet; a local
  endpoint (Ollama or OpenAI-compatible) comes after the interfaces stabilize.
- Single-agent loop only: `AgentId`, `RunId`, `SessionId`, `ExecutionId`,
  `AgentLoop`, `cancel()`, tool dispatch, context assembly, streaming.
- Context Levels 0 and 1 only: structured results, artifact externalization
  (`artifact://`), dedup/supersede, lossless pruning, progressive code reading
  (outline/symbols first). No Level 2/3/4, no `/compact` yet.
- Generic Bitty IPC bridge as the only host interface.
- `bitty-ai-slice` kept permanently as the end-to-end pressure test:
  a complete AI turn must keep passing on generic Bitty primitives.

## v0.1 non-goals

Multi-agent organization and teams, manager/reviewer agents, organization
graphs, service sharing, cross-agent mailbox, multi-agent budgets,
hierarchical delegation, long-term and cross-session memory, browser agent,
remote and provider-native compaction, persistent evidence database, LSP
service sharing, agent dashboard, task organization graph.

## Experimentally adopted contracts

| Contract                                                                  | Source                                                                | Adoption mode                                   |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| ExecutionContext primary, Panel as optional projection                    | CTX-0009 R1 option A (cf. agent-coordination.md Panel reconciliation) | Experimental; R1 decision (CTX-0009) may revise |
| Common authorization for every native/MCP effect                          | command-tool-architecture.md AIQ-33                                   | Required control, mechanism open                |
| Pre-queue/pre-write redaction, consented recording (P0-AC-026, PP-2/PP-4) | Security corpus                                                       | Required control, not reopened                  |
| Session is fact, context is projection; L0+L1 only                        | context-management.md                                                 | Experimental subset                             |
| Replay reconstructs state only, never re-executes effects                 | persistence-evidence.md                                               | Required semantic                               |
| Cached PASS is not independent approval                                   | code-intelligence.md                                                  | Required semantic                               |

## Sequencing

1. This draft profile reviewed; acceptance as the v0.1 scope gate remains pending.
2. `bitty-ai-runtime` skeleton plus migration of stable slice primitives.
3. L0+L1 context behaviors behind the slice acceptance suite.
4. Cross-repository G-2/G-3 (`terminal.snapshot`, generic tool dispatch)
   resolved on the `bitty` side and wired through the bridge.
5. Local provider endpoint; remote providers only after interface stability.

## Verification plan

Experimental implementation evidence exists on the implementation track
(runtime skeleton); this profile remains draft with acceptance pending.
Promises above are scope selections, not implementation claims. Normative
security and IPC obligations override any experimental adoption stated here.

## Open points

### Truly blocking questions for v0.1

Only these block the first increment; every other register item is deferred,
not deleted:

- AIQ-33: unified authorization/isolation backend must exist before any tool
  dispatch slice lands.
- AIQ-11: context maintenance must provably ignore untrusted observations
  before L1 pruning ships.
- AIQ-37: exec results must disclose failures, truncation, and `Unknown`
  outcomes in a structured schema.
- AIQ-24/AIQ-25: delegation and spending need atomic budgets and measured
  depth/fan-out bounds before the loop admits more than one hop.

### What remains open

Full R1–R6 decisions (CTX-0009..CTX-0014), the five-crate split, release
numbering, and everything under non-goals. This profile narrows what gets
built first; it does not settle the architecture.

## Acceptance criteria

- `bitty-ai-runtime` skeleton compiles under the repository gates
  (`just check`, clippy `-D warnings`, locked tests).
- The existing `bitty-ai-slice` suite passes unmodified against the new
  runtime paths, plus new fail-closed tests for cancellation, budget, and
  `Unknown` reconciliation.
- No network access in v0.1 code paths; `FakeProvider` covers all tests.
- Every v0.1 behavior traces to a row in the table above or a listed
  blocking question.
