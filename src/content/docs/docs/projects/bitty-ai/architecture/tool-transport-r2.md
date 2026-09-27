---
title: Tool transport R2
description: Draft transport disposition for unified auth backend with native and MCP path selection
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 38
---

# Tool transport R2

> Status: **draft**. This document records the CTX-0011 R2 draft disposition
> for tool transport path selection only. It proposes no accepted
> architecture, authorizes no shipped behavior, and closes no open question.
> Normative security and IPC obligations override any experimental adoption
> stated here. Single-agent execution ownership stays with R1, retention
> semantics stay with R3, and multi-agent scope is frozen and deferred; see
> [Frozen and deferred scope](#frozen-and-deferred-scope).

## Purpose and scope

This decision covers transport path selection only:

- One unified authorization backend fronting every tool effect, whether the
  effect travels the native path or the MCP path.
- How the dispatch path is chosen per tool, and which declarations that
  choice requires.
- Fail-closed conditions: the exact circumstances under which dispatch is
  denied rather than attempted through either path.

Inputs are the tool-runtime section of
[Command and tool architecture](command-tool-architecture.md), the Tool Bus
(TB-1 through TB-7), privacy-first controls (PP-2 through PP-4), and failure
semantics (FS-AI1, FS-AI7) in [AI Architecture](ai-architecture.md), AIQ-33,
AIQ-36, AIQ-37, and AIQ-38 in
[AI Unresolved Questions](../product/ai-unresolved-questions.md), the R1 baseline in
[Execution ownership R1](execution-ownership-r1.md), the R3 baseline in
[Context retention R3](context-retention-r3.md), and
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md). The accepted
[IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and the canonical security corpus linked
by [AI Architecture](ai-architecture.md) remain overriding authority,
including P0-AC-021 through P0-AC-026.

No product code is introduced or described as implemented.

## Decision

**R2 selects unified backend with declared per-tool placement as draft
disposition: one common authorization backend gates every tool effect, and
each ToolSpec registry entry declares whether its effects travel the MCP
path or the native path. The path carries the effect; it never grants the
authority.**

The reconciled gate order is identical for both paths:

```text
authenticated principal
  -> ToolSpec + schema version resolution (TB-2, TB-3)
  -> caller, target, and generation authorization (AG-3, AG-4)
  -> per-tool capability + consent grant check (TB-4, PP-3)
  -> budget reservation (TB-6, RC-9/RC-10)
  -> dispatch through the declared path (MCP adapter or native backend)
  -> pre-queue and pre-write typed redaction (PP-2, P0-AC-026)
  -> attributed outcome (Succeeded, Failed, Cancelled, or Unknown)
```

MCP remains the default vocabulary transport (TB-1): a new tool is expected
to travel the MCP path unless its registry entry records an explicit native
placement with a reviewed backend. Native dispatch is a placement behind the
same backend, never a bypass around it.

**Direct process or filesystem spools are rejected as transport.** A
filename, spool directory, or unwatched queue never authorizes an effect and
never substitutes for schema validation, caller and target authorization,
consent, budgets, redaction, or attributed outcomes. This preserves the
existing direct-spool rejection in [AI Architecture](ai-architecture.md) and
[Command and tool architecture](command-tool-architecture.md).

**Dual backends are rejected as an authorization model.** Native and MCP
effects must never be gated by two divergent rule sets with separate
consent ledgers, budget accounting, or redaction timing. One backend, one
consent ledger, one budget reservation path, one redaction timing rule; the
paths differ only after every gate has passed.

## Rationale

- Authority must not depend on which wire an effect happens to travel. Two
  rule sets for the same logical effect would let a caller shop for the more
  permissive path, which is a confused-deputy shape regardless of which path
  is nominally stricter.
- MCP as the default vocabulary keeps one narrow, auditable tool schema
  (TB-2, TB-3) while the ecosystem, remote tools, and user-provided servers
  keep working without native reimplementation. Native placement stays
  available where a reviewed backend already mediates the effect, such as
  supervised execution or terminal-owned state behind its host boundary.
- Declared per-tool placement makes the transport choice reviewable at
  registration time instead of debatable at dispatch time. Reviewers see
  which path each tool takes, which backend mediates it, and why MCP was
  insufficient, before any effect flows.
- Fail-closed defaults keep every gap — unknown tool, stale schema, missing
  grant, exhausted budget, disabled machinery — on the denial side, so an
  incomplete configuration cannot silently become an open one.

## Unified authorization backend

The frozen required-control surface for every native and MCP effect is:

1. Authenticated principal with server-side evaluation (AG-3). Client
   assertions about level, scope, or consent are ignored; the server
   evaluates the real consent ledger.
2. ToolSpec resolution against the bounded registry (TB-2): known name,
   bounded description, bounded JSON Schema, within the per-session spec
   cap. Unknown tools fail closed before dispatch (TB-3).
3. Argument schema validation before any host dispatch (TB-3). An arguments
   violation fails whole with a typed error and no partial state
   (FS-AI1).
4. Captured target and generation binding from the R1 baseline: the
   authorized execution target travels with the call, and stale-generation
   writers are fenced before a new writer is admitted.
5. Least-privilege scope plus per-tool consent (TB-4, AG-4): the tool's
   required capability and a separate per-client tool consent grant,
   ledgered with identity, agent, tool name, grant time, expiry, and
   granter (PP-3). Model-streaming authority never implies tool authority.
6. No silent tool expansion (TB-5): a new or changed tool advertisement
   blocks on the permission-diff flow; system and distribution maxima
   cannot be weakened by user configuration.
7. Budget reservation before dispatch (TB-6): per-turn call count, per-call
   result size, and the shared RC-9/RC-10 channel caps. A request that
   would exceed budget fails at the boundary with a typed error before
   provider or tool I/O.
8. Typed redaction pre-queue and pre-write (PP-2, P0-AC-026). Records that
   cannot be redacted to policy are not queued and not written; consent
   never permits unredacted traces.
9. No on-disk persistence without explicit applicable consent (PP-4),
   user-only storage, and export preview, inherited from the R3 baseline.
10. Attributed outcomes with the R1 disclosure classes: `Succeeded`,
    `Failed`, `Cancelled`, or `Unknown`. Uncertain effects are reconciled
    by status inspection or user direction before retry, without rollback
    or exactly-once claims.

## Path selection contract

The draft path selection rules are:

1. Every ToolSpec registry entry declares an explicit `placement`: `mcp`
   or `native`, plus for terminal-owned effects the mediating host target
   behind the terminal host boundary.
2. MCP is the default expectation for new tools. A `native` declaration
   requires a recorded placement reason and a named reviewed backend that
   mediates the effect; a bare performance preference is not a placement
   reason.
3. Terminal-owned effects (filesystem, process, PTY, clipboard, network,
   IPC, debug, or runtime control beyond the AI helper) travel only
   through the terminal host boundary via scoped IPC or the bridge process
   model (BA-3). Native placement never means AI code in the terminal
   process and never loads AI implementation into the terminal to reach
   the effect.
4. AI-helper-local effects under a `native` declaration travel only
   through the equivalent reviewed execution backend named in the entry.
   The backend enforces the same per-action capability, target, consent,
   isolation, and budget checks as the MCP adapter path.
5. Placement is resolved at registration and re-validated when the entry
   changes. A changed ToolSpec, schema, capability, or backend binding is
   a new reviewable declaration; the previous grant never carries over
   silently (TB-5 parity, AIQ-08 parity for schema freshness).
6. Capability and availability remain separate facts. A declared backend
   that is absent, incompatible, or unreachable makes the tool unavailable
   for the session; unavailability never widens scope, never falls through
   to the other path, and never surfaces as a provider hint.
7. Lua composition (commands, skills, workflows) selects tools, never
   paths. A Lua caller cannot override a registry entry's placement, and
   loading a skill or prompt template grants no execution authority.

## Fail-closed conditions

Dispatch is denied, with a typed error and no partial state, when any of
the following holds. Denial is total (FS-AI1): no allocation beyond the
bounded frame, no queue entry, no tool dispatch, and no workspace mutation.

1. The tool name is unknown to the session registry, or the entry is
   missing its placement declaration.
2. Arguments fail schema validation against the currently registered
   schema version, or the call references a stale schema after the entry
   changed. Stale schemas cannot authorize changed effects.
3. The required capability is absent, or the per-tool consent grant is
   missing, expired, revoked, or scoped to a different target.
4. The captured target or generation is missing, invalid, incompatible,
   or fenced by a newer writer.
5. The budget reservation fails: per-turn call count, result size, or
   channel caps would be exceeded.
6. Redaction machinery is unavailable, or the record cannot be redacted to
   policy. Unredactable content is not queued and not written.
7. The declared backend or bridge target is absent, incompatible, or
   unreachable, or the placement names no reviewed backend at all.
8. Any bounding, redaction, consent, or budget machinery cannot start or
   is detected disabled. The service refuses to serve rather than serving
   unbounded or unredacted (FS-AI7).
9. The effect is terminal-owned but the request does not pass the
   terminal host boundary through scoped IPC or the bridge process model.
10. Revocation lands before dispatch: the grant is detached at the next
    dispatch boundary and the call is denied even if admission checks ran
    moments earlier.

Cancellation follows the R1 contract on both paths: pre-dispatch
cancellation prevents the effect from starting; post-dispatch cancellation
stops further admission, requests bounded cancellation of owned work, and
reports actual or `Unknown` outcomes for reconciliation.

## Frozen and deferred scope

Per the CTX-0011 task scope, the following are frozen and excluded from
this decision:

- Single-agent execution ownership: `ExecutionContext` primary with
  optional Panel projection, no-shell and no-panel validity, and the
  MP-1 versus BA-2/BA-3 registry disposition stay with
  [Execution ownership R1](execution-ownership-r1.md) and are not reopened
  here.
- Multi-agent organization: manager and reviewer agents, teams, delegation
  graphs, cross-agent messaging, shared budgets, and multi-agent review
  separation stay frozen and deferred.
- Structured exec result schema representation (AIQ-37): only the outcome
  disclosure classes and reconciliation rule are inherited; the schema
  shape itself is not selected here.
- Generic execution and registry ownership across repositories (AIQ-38):
  BA-2 and BA-3 are preserved; exact owning crates and the registry split
  stay draft choices elsewhere.
- Durable backend, replay contract, and release profile: retention
  obligations stay with [Context retention R3](context-retention-r3.md);
  backend selection is not decided here.
- Core versus Lua split enforcement, command registration API, Git
  primitive placement, provider selection, and distribution boundary:
  unchanged by this decision.

Pointers:

- Execution ownership, cancellation, and Panel projection stay in
  [Execution ownership R1](execution-ownership-r1.md).
- Consent, deletion propagation, and recovery limits stay in
  [Context retention R3](context-retention-r3.md).
- Core versus Lua boundary, command registry, and tool classification
  stay in [Command and tool architecture](command-tool-architecture.md).
- Release-scope sequencing stays in
  [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md).

## Verification plan

A future implementation claiming this disposition must show, at minimum:

- Gate-order evidence that native and MCP calls traverse the identical
  ordered gate set — principal, ToolSpec and schema version, caller and
  target authorization, consent, budget, placed dispatch, redaction,
  attributed outcome — with shared ledger and budget accounting across
  both paths.
- Negative evidence that no direct-spool channel exists: a filename,
  spool directory, or unwatched queue alone authorizes nothing, and
  probing each suspected bypass yields a typed denial.
- Placement evidence that every registry entry carries an explicit
  declaration, that `native` entries name a reviewed backend with a
  recorded reason, and that an undeclared or backend-less entry is
  denied rather than default-routed.
- Fail-closed evidence for each numbered condition above, including stale
  schema after entry change, revoked-between-check-and-dispatch grants,
  absent backends, and disabled redaction or budget machinery, each
  leaving no partial state.
- Terminal-boundary evidence that terminal-owned effects pass only
  through scoped IPC or the bridge process model, with negative evidence
  of no AI code in the terminal process (BA-2 and BA-3 parity).
- Cancellation races on both paths: pre-dispatch starts no effect, and
  post-dispatch reports actual or `Unknown` outcomes with reconciliation
  before retry and no rollback claim.
- Retention inheritance evidence that tool records honor consented
  recording, pre-queue and pre-write redaction, user-only storage,
  deletion propagation, and typed unavailable disclosure.
- Deterministic coverage with seeded registry, consent, schema-change,
  budget, and backend-absence fixtures.

## Open points

This document changes the status of no register entry:

- AIQ-33 (unified authorization and isolation backend) stays a
  prerequisite. The required-control surface above is frozen as draft
  disposition; the backend mechanism itself remains an open selection.
- AIQ-36 (native versus MCP tool transport and bridge placement) stays a
  prerequisite. The declared-placement disposition selects a draft
  direction without closing the transport or bridge question.
- AIQ-37 (structured exec result schema) stays a prerequisite. Only the
  disclosure classes (`Succeeded`, `Failed`, `Cancelled`, `Unknown`) and
  the reconcile-before-retry rule are inherited; representation is open.
- AIQ-38 (generic execution and registry ownership across repositories)
  stays a prerequisite. BA-2 and BA-3 are preserved; the exact split
  needs review.
- AIQ-08 (MCP schema cache invalidation) stays a prerequisite, cited for
  the stale-schema denial rule. Stale schemas cannot authorize changed
  effects under either path.

Promotion of any of these identifiers requires the canonical admission
rule cited by [AI Unresolved Questions](../product/ai-unresolved-questions.md).

## Acceptance criteria

- Draft owner: CTX-0011 implementer (`ai-docs-ctx0011-impl`).
- Acceptance requires independent review by the architecture category
  owner, the docs curator, and a security reviewer, plus linkage of any
  promoted open question under the canonical rule. It is not granted by
  this draft.
- Suggested follow-ups, each as a separately scoped task: unified backend
  mechanism selection (AIQ-33), bridge placement and generic backend
  ownership (AIQ-36 with AIQ-38), structured exec result schema
  representation (AIQ-37), and per-tool placement review checklist for
  the registry.

## References

- [Command and tool architecture](command-tool-architecture.md) (Draft):
  Core versus Lua boundary, tool classification, and native versus MCP
  transport status.
- [AI Architecture](ai-architecture.md) (Draft): Tool Bus (TB-1 through
  TB-7), privacy-first controls (PP-2 through PP-4), failure semantics
  (FS-AI1, FS-AI7), agent levels (AG-3, AG-4), bridge process model
  (BA-2, BA-3), and the existing spool and registry reconciliation.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-33,
  AIQ-36, AIQ-37, AIQ-38, and AIQ-08.
- [Execution ownership R1](execution-ownership-r1.md) (Draft): decision
  pattern reference and single-agent execution baseline.
- [Context retention R3](context-retention-r3.md) (Draft): decision
  pattern reference and consent-bounded retention baseline.
- [Task lifecycle R5](task-lifecycle-r5.md) (Draft): decision pattern
  reference only; its lifecycle conclusions are not reused here.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) (Draft):
  experimental scope, non-goals, and required-control sequencing.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): bounding IPC framing,
  scopes, and lifecycle contracts.
