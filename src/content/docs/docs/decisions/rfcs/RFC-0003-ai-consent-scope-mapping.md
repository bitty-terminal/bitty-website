---
title: AI Consent to Generic Scope Mapping RFC
description: Draft mapping from the AI consent vocabulary to the generic 13-scope IPC registry with uncovered terms and adoption path
category: decisions
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 47
---

# AI Consent to Generic Scope Mapping RFC

> Status: **draft** proposed on 2026-09-14 under CarryCtx task CTX-0190
> ([issue #282](https://github.com/bitty-terminal/bitty-docs/issues/282)).
> This document closes CTX-0407 gap G-6 by giving the AI-consent to
> generic-scope mapping a documented home. It is a proposal: it closes no open
> question, authorizes no shipped behavior, and makes no compatibility promise.
> Acceptance requires explicit review plus adoption by the canonical owners
> (the AI architecture and IPC agent RFC in `bitty-ai-docs`, the Core scope
> registry in `bitty`).

## Problem

The `bitty-ai` vertical-slice pressure test
([bitty-ai PR #7](https://github.com/bitty-terminal/bitty-ai/pull/7), merged
as `3623c6b`) showed that an AI turn can run on generic Core primitives, but
surfaced six gaps recorded in the companion specification
([bitty-ai-docs PR #4](https://github.com/bitty-terminal/bitty-ai-docs/pull/4)).
Gap G-6 states the problem this RFC answers:

> The AI consent vocabulary (`ai.provider`, `ai.stream`, `ai.model`,
> `agent.context.*`) is not in the generic 13-scope `bitty_ipc::scope::Scope`
> registry, and the mapping from AI consent to generic scope has no documented
> home.

Concretely, two vocabularies exist with no authoritative bridge between them:

- The generic IPC scope registry: 13 scopes, none AI-named, enforced
  server-side on every request (`bitty/crates/bitty-ipc/src/scope.rs`).
- The AI consent vocabulary: ModelProvider operations, agent context levels,
  memory persistence, and per-tool invocation, defined partly as capability
  constants in Core (`bitty/crates/bitty-runtime/src/ai_panel.rs`) and partly
  as draft architecture in `bitty-ai-docs`
  ([ai-architecture](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/architecture/ai-architecture.md)).

## Goals

- Give gap G-6 a documented home in shared governance (`bitty-docs`), naming
  for every AI consent term the generic scope or mechanism that covers it.
- Keep statuses honest: distinguish shipped generic machinery from draft AI
  vocabulary and from the mapping proposal itself.
- Name the uncovered terms explicitly, with candidate resolutions, instead of
  silently stretching a generic scope to cover them.
- Define the adoption path: what must happen in `bitty-ai-docs` and `bitty`
  for this draft to become an accepted contract.

## Non-goals

- No new scope is added to the generic registry by this document; adding a
  scope requires a Core RFC revision (scope names are wire-versioned).
- No AI vocabulary term is renamed, demoted, or removed here; the G-5 review
  of AI-named Core surface (`bitty` + `bitty-docs` governance) stays separate.
- No shipped, stable, normative, or compatibility-guaranteed behavior is
  claimed for any AI turn, provider, or consent flow.
- No open question is closed; [OQ-066](../open-questions.md) stays open.

## Sources and their standing

| Source                                                                                                                     | Standing  | What it contributes                                                              |
| -------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------- |
| `bitty/crates/bitty-ipc/src/scope.rs` (`Scope`, `ScopeSet`, `ConsentLedger`, `required_scope_for_method`)                  | Shipped   | The 13 generic scopes, method-to-scope resolution, per-client consent ledgering  |
| `bitty/crates/bitty-runtime/src/ai_panel.rs` (capability constants, `create_ai_panel`)                                     | Shipped   | The AI-named capability strings that already exist in Core (G-5 surface)         |
| `bitty-ai` slice (`crates/bitty-ai-slice/src/bridge.rs`, `tests/vertical_slice.rs`)                                        | Evidence  | Proof that an AI turn runs on generic scopes + ledgered consent, failing closed  |
| [AI architecture](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/architecture/ai-architecture.md)               | Draft     | ModelProvider, ContextProvider, Tool Bus, agent levels, budgets (post-1.0)       |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)             | Canonical | Wire envelope, method registry, scope families, consent ledger, chunking (RC-10) |
| [Pressure-test spec](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/product/ai-vertical-slice-pressure-test.md) | Draft     | Gap list G-1..G-6, the reuse table this mapping extends                          |

## The generic registry (shipped)

The v1 registry holds exactly 13 scopes in six families. Scope names are
wire-stable: changing a name requires an RFC revision.

| Family     | Scopes                                                  |
| ---------- | ------------------------------------------------------- |
| `terminal` | `terminal.inspect`, `terminal.input`, `terminal.manage` |
| `view`     | `view.inspect`, `view.manage`                           |
| `config`   | `config.inspect`, `config.modify`                       |
| `plugin`   | `plugin.inspect`, `plugin.manage`                       |
| `process`  | `process.spawn`                                         |
| `debug`    | `debug.inspect`, `debug.trace`, `debug.control`         |

Three shipped mechanisms compose authorization, and the pressure-test slice
exercises all three:

- `required_scope_for_method` resolves each wire method to its scope; for
  example `terminal.snapshot` resolves to `terminal.inspect`, exactly the read
  the slice's `ContextProvider` performs.
- `authorize_method` denies with `Denied/ScopeViolation` when the caller lacks
  the scope; the slice's `missing_scope_fails_closed` test pins this.
- `ConsentLedger` records per-client, per-scope, time-bounded grants checked
  on top of scopes; the slice's `IpcBridge` requires an active grant before
  every context read, and `missing_consent_fails_closed` pins the denial.

## The AI consent vocabulary (draft, plus shipped Core constants)

| Term                                   | Home                                                                        | Standing                                 |
| -------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------- |
| `ai.provider`, `ai.stream`, `ai.model` | `ai_panel.rs` constants; draft ModelProvider (`MP-1`..`MP-10`)              | Shipped strings, draft semantics         |
| `agent.context.terminal`               | `ai_panel.rs` constant; draft `CP-4` terminal-scoped consent                | Shipped string, draft semantics          |
| `agent.context.workspace`              | `ai_panel.rs` constant; draft `CP-4` workspace-scoped consent               | Shipped string, draft semantics          |
| `agent.memory:persist`                 | `ai_panel.rs` constant; draft opt-in memory persistence                     | Shipped string, draft semantics          |
| `mcp.invoke:TOOL` (per-tool)           | `ai_panel.rs` prefix constant; draft `TB-4` per-tool capability and consent | Shipped shape, draft semantics           |
| `panel.provider`, `panel.create`       | `ai_panel.rs` constants; panel runtime contract in `bitty-terminal-docs`    | Shipped strings, owned elsewhere         |
| `network.connect`                      | Draft `MP-3`/`MPC-1` remote-provider gate                                   | Draft vocabulary, no generic counterpart |

## Proposed mapping

Confidence marks: **proven** means the pressure-test slice demonstrates the
row end to end; **proposed** means the row follows from the cited contract but
has no executable evidence yet; **open** means no generic scope covers the
term and the row points at candidate resolutions instead of a mapping.

| AI consent term                   | Generic scope or mechanism                                | Confidence | Basis                                                                                          |
| --------------------------------- | --------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| Terminal context read             | `terminal.inspect` via `terminal.snapshot` + ledger grant | Proven     | `required_scope_for_method("terminal.snapshot")`; slice `bridge.rs` + `missing_*_fails_closed` |
| `agent.context.terminal`          | `terminal.inspect` + per-terminal ledger grant            | Proposed   | Draft `CP-4` scoping matches the slice's per-client grant model; no cross-terminal bundling    |
| Streamed fragments                | No scope; RC-10 `validate_chunk` (256 KiB) wire bound     | Proven     | Slice `stream.rs`; chunking is framing discipline, not authority                               |
| `ai.provider` (list/registry)     | `config.inspect` for listing only                         | Proposed   | Registry snapshot filtered to granted scopes (draft `MP-4`); secrets never inline              |
| `ai.stream` / `ai.model`          | Provider-local consent + `network.connect` when remote    | Proposed   | Draft `MP-3` local-first default; `MP-10` dedicated credential consent                         |
| `mcp.invoke:TOOL`                 | Per-tool ledgered consent (`who, agent_id, tool, grants`) | Proposed   | Draft `TB-4`; transport is the generic `bitty_ipc::mcp` stub, host dispatch is gap G-3         |
| `panel.provider` / `panel.create` | `view.manage`                                             | Proposed   | Panel creation composes views; needs confirmation by the panel-runtime owner                   |
| `agent.context.workspace`         | No covering generic scope                                 | Open       | No `workspace.*` family in the 13; see candidates below                                        |
| `agent.memory:persist`            | No covering generic scope                                 | Open       | Opt-in user-data persistence is neither config nor plugin state; see candidates below          |

The mapping's central claim is deliberately narrow: **context reads and consent
ledgering already have generic homes; model-registry, workspace-context, and
memory-persistence authority do not.** Everything in the `Open` rows, and the
`Proposed` rows until reviewed, must be treated as undecided.

## Open terms and candidate resolutions

- **`agent.context.workspace`.** Candidates: (a) a new generic `workspace.*`
  scope family owned by Core, which requires an IPC RFC revision and a wire
  compatibility plan; (b) per-target `terminal.inspect`-style grants composed
  at the agent layer with no new Core scope, keeping Core AI-free per
  [DIR-005](../index.md). This RFC leans toward (b) until Core shows a
  workspace primitive that needs first-class scope protection, because (a)
  bakes an AI-shaped family into the wire.
- **`agent.memory:persist`.** Candidates: (a) a dedicated generic user-data
  scope; (b) agent-layer opt-in persistence outside IPC scopes entirely, gated
  by explicit user consent with `0600` storage and `SecretField` redaction as
  the draft architecture already requires. Same lean as above: persistence is
  an agent-layer concern until proven otherwise.
- **Model-registry authority.** Listing fits `config.inspect`; executing a
  turn (`complete`/`stream`) is provider consent plus, for remote providers,
  `network.connect`. If Core ever enforces provider selection server-side, a
  generic provider-registry scope becomes a new-RFC matter, not a silent
  extension of `config.*`.

## Alternatives considered

- **Add AI-named scopes to the generic registry** (`ai.provider` as scope
  14, and so on). Rejected in draft: it wires AI vocabulary into the Core
  contract and contradicts the DIR-005 direction of keeping AI outside the
  terminal core.
- **Declare full coverage ("every AI term already maps")**. Rejected:
  workspace context and memory persistence demonstrably have no generic home,
  and claiming otherwise would hide the exact gaps G-6 was raised to expose.
- **Host the mapping only in `bitty-ai-docs`.** Viable for the canonical
  text, and adoption there is still required (see below), but the mapping
  constrains Core scope evolution too, so shared governance needs its own
  reviewable copy. This RFC is that copy; it references rather than forks the
  canonical definitions.

## Security and compatibility impact

- Least privilege is preserved: every proven or proposed row resolves to the
  narrowest existing scope, and ledgered consent stays per-client, per-scope,
  and time-bounded. No row grants ambient authority, and `all`-style bundled
  grants remain forbidden (draft `CP-4`).
- The `Open` rows are fail-closed by construction: with no mapped scope there
  is nothing to grant, so implementations must deny workspace-context and
  memory-persistence authority until a covering contract is accepted.
- Compatibility: this draft changes no wire name, no scope, and no ledger
  behavior. Any future new scope family requires its own RFC revision with a
  migration plan, since scope names are wire-versioned.

## Rollout and adoption

1. Review this draft in `bitty-docs` (this task's PR; no merge claims beyond
   draft status).
2. Propose adoption text to `bitty-ai-docs`: a mapping section in the IPC
   agent RFC and a consent-scope appendix in the AI architecture, owned by the
   active ai-docs workstream (coordination note: worktrees `ctx-0003` through
   `ctx-0007` were active when this draft was written; do not collide with
   them, land adoption through their owners).
3. Confirm or correct the two `Proposed` rows owned elsewhere: `view.manage`
   for panel creation with the panel-runtime owner, and `config.inspect` for
   registry listing with the AI-architecture owner.
4. Resolve the `Open` rows through the candidate resolutions above; if a new
   generic scope family wins, it goes through a Core IPC RFC revision, not
   through this document's acceptance.
5. Only then flip this RFC toward acceptance, with the adoption evidence
   linked here.

## Unresolved questions

- Does per-target grant composition (candidate (b) for workspace context)
  satisfy the draft `CP-4` cross-window consent rule without a Core scope?
- Is `config.inspect` the right listing scope for the model registry, or does
  registry listing need its own read gate once providers carry cost/budget
  metadata (draft `MP-4` open question)?
- Who owns the `network.connect` capability name: Core capability registry or
  AI-layer vocabulary?

## Acceptance evidence

This RFC flips from draft to accepted when all of the following are linked
here: independent reviewer APPROVE on the mapping table; ai-docs adoption
(IPC agent RFC mapping section + AI architecture appendix, or a documented
rejection with reasons); panel-runtime owner confirmation of the
`panel.provider`/`panel.create` row; and a disposition (accepted alternative
or new-RFC pointer) for each `Open` row. Acceptance still authorizes no
implementation: it records the reviewed mapping, not shipped behavior.

## References

- CTX-0407 gap G-6 via the
  [pressure-test specification](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/product/ai-vertical-slice-pressure-test.md)
  (companion to bitty-ai PR #7).
- Generic registry: `Scope::all` (13 scopes), `Scope::as_str`,
  `required_scope_for_method`, `authorize_method`, `ConsentLedger` in
  `bitty/crates/bitty-ipc/src/scope.rs`.
- AI capability constants: `AI_PANEL_CAPABILITY_*` and `create_ai_panel` in
  `bitty/crates/bitty-runtime/src/ai_panel.rs`.
- Slice evidence: `IpcBridge` consent gating in
  `bitty-ai/crates/bitty-ai-slice/src/bridge.rs`; determinism and
  fail-closed tests in `bitty-ai/crates/bitty-ai-slice/tests/vertical_slice.rs`.
- [OQ-066](../open-questions.md) (context-budget model; stays open).
- DIR-005 (AI outside the terminal core) in the
  [decision register](../index.md).
