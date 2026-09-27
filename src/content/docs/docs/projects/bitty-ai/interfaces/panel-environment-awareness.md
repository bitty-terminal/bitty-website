---
title: Panel environment awareness
description: Draft bitty-ai awareness note for panel environment contracts from the candidate direction
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 46
---

# Panel environment awareness

> Status: **draft**. This document records the candidate direction
> into the draft `bitty-ai`-facing awareness note: sanitized Agent View,
> Use-versus-Read boundary, env-handle semantics, no-persistence default, and
> exported-only scope. It proposes no accepted architecture, authorizes no
> shipped behavior, closes no Artificial Intelligence Question entry,
> introduces no new identifier, and contains no product code. Normative
> security and IPC obligations override any experimental adoption stated here.
> `bitty`-side mechanism material below is handoff input, not a decision: the
> `bitty` terminal repository decides acceptance, sequencing, and mechanism
> through its own review.

## Purpose and scope

This awareness note covers only what `bitty-ai` must assume about panel
environment, even before any `bitty`-side mechanism lands:

- What `bitty-ai` Core owns as contract: the five awareness items in
  [Contract 1](#contract-1-sanitized-agent-view-only) through
  [Contract 5](#contract-5-exported-only-scope).
- What `bitty-ai` Core does not own: four-layer environment composition,
  shell-sync collection, `ShellState` unification, and new-panel default
  semantics, which are `bitty`-side handoff items recorded in
  [Bitty-side handoff, not a decision](#bitty-side-handoff-not-a-decision).
- What is explicitly out of scope here: secret-store design, panel
  presentation, plugin-registry mechanics, per-shell integration scripts,
  and wire protocols.

Inputs are the candidate direction, PP-2 (Typed redaction)
and PP-4 (No on-disk persistence without consent) under
[Privacy-first](../architecture/ai-architecture.md#privacy-first) in
[AI Architecture](../architecture/ai-architecture.md), the R1 disposition in
[Execution ownership R1](../architecture/execution-ownership-r1.md), the R2 disposition in
[Tool transport R2](../architecture/tool-transport-r2.md), the R3 disposition in
[Context retention R3](../architecture/context-retention-r3.md), the R6 disposition in
[Persistence profile R6](../architecture/persistence-profile-r6.md), the register in
[AI Unresolved Questions](../product/ai-unresolved-questions.md), the narrow scope gate
in [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md), and the
accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) as overriding authority. This document is the English-language candidate summary and
stands alone.

No product code is introduced or described as implemented.

## Contract 1: sanitized Agent View only

The agent-facing view of panel environment is always sanitized. `bitty-ai`
must assume an Execution View with full values exists only on the
`bitty`-side host, while the Agent View carries names plus presence markers
and never values for secret-bearing entries. Illustrative shape from the
source record (not a wire contract):

```json
{
  "panel_id": 3,
  "cwd": "~/Projects/bitty",
  "environment": {
    "VIRTUAL_ENV": "~/.venv",
    "RUST_LOG": "debug",
    "OPENAI_API_KEY": {
      "present": true,
      "secret": true
    }
  }
}
```

An agent therefore learns that a panel holds a credential without learning
the credential itself. Any broader disclosure needs its own reviewed
contract; this note grants none.

Connects to, without reopening: PP-2 (Typed redaction) and P0-AC-026 in
[AI Architecture](../architecture/ai-architecture.md#privacy-first) stay mandatory; typed
`SecretField` redaction applies pre-queue and pre-write, and the secret
invariant in
[Provider plugin boundary](../providers/provider-plugin-boundary.md#secret-invariant)
applies unchanged to environment-derived secrets.

## Contract 2: Use-versus-Read boundary

An agent may use panel environment to execute without reading it. The
proposed flow is `agent execute(panel, command)` against `bitty` Core, which
combines panel environment, credentials, and working directory into the child
process; the model never receives the values as observation data. Execution
capability and disclosure are separate grants: permission to run in an
environment never implies permission to inspect its secrets.

Connects to, without reopening: the R1 red line in
[Execution ownership R1](../architecture/execution-ownership-r1.md) (no model selection or
model I/O in terminal Core; execution belongs to the authorized
`ExecutionContext` behind scoped IPC) and the R2 unified authorization
backend in [Tool transport R2](../architecture/tool-transport-r2.md) (one common gate order
for every effect; transport never grants authority).

## Contract 3: env-handle semantics

When an agent clones or spawns from a panel, `bitty-ai` must assume
handle semantics: the agent names an `EnvSnapshot` identifier while byte
movement stays inside `bitty` Core. The source-record sketch is
`Panel #3` with `EnvSnapshot #81` cloned into a headless panel, where the
agent records only `env_snapshot_id = 81` and Core delivers the bytes. Handle
identity, lifetime, invalidation, and consent attachment are `bitty`-side
decisions; `bitty-ai` treats the handle as opaque and never dereferences it
into model context.

Connects to, without reopening: BA-2 (Agent versus AI split) and BA-3 (Bridge
process model) in [AI Architecture](../architecture/ai-architecture.md), the bridge
identity and consent seam in the accepted
[IPC and Agent RFC](../specifications/ipc-agent-rfc.md), and the declared-placement rule in
[Tool transport R2](../architecture/tool-transport-r2.md). Loading or naming a snapshot
grants no execution authority.

## Contract 4: no persistence by default

Panel environment inheritance never implies durability. `bitty-ai` must
assume the default is no on-disk persistence: inherited use in the live panel,
in newly spawned panels, and in headless clones is in-scope discussion, while
restart recovery, session files, and logs store nothing by default because
snapshots may carry secrets. Restart environment comes from OS environment
plus `bitty` configuration plus project configuration plus shell rc, never
from a prior panel dump. If persistence ever ships, it is an explicit
allowlist (source-record sketch: `RUST_LOG`, `NODE_ENV`, `VIRTUAL_ENV`),
never a full dump by default.

Connects to, without reopening: the R3 consent-bounded retention disposition
in [Context retention R3](../architecture/context-retention-r3.md) and the R6 backend and
release-profile disposition in
[Persistence profile R6](../architecture/persistence-profile-r6.md), under PP-4 (No on-disk
persistence without consent) and P0-AC-026 in
[AI Architecture](../architecture/ai-architecture.md#privacy-first).

## Contract 5: exported-only scope

`Bitty Panel Environment` means exported process environment only. Shell-local
variables without export, aliases, shell functions, shell options, history,
completion state, and prompt internals are out of scope for the first phase.
Agents must not depend on them, and `bitty-ai` must not promise their
propagation, inspection, or fidelity across spawn. The source record notes
that faithful full-shell cloning needs per-state recovery strategy and is
explicitly deferred; this note defers it too.

Connects to, without reopening: the capability boundary in
[Command and tool architecture](../architecture/command-tool-architecture.md) and the
projection-only rule in
[Execution ownership R1](../architecture/execution-ownership-r1.md) (presentation movement
never moves execution targets or widens authority).

## Consistency with existing dispositions

- R1 red line preserved. Nothing here moves provider implementation, model
  selection, generation I/O, or keys into terminal Core; environment bytes
  stay host-mediated under the `ExecutionContext` model in
  [Execution ownership R1](../architecture/execution-ownership-r1.md).
- R2 unified authorization backend preserved. Environment use, snapshot
  reference, polling, and retrieval are effects behind the same R2 gate order
  (caller, target, generation, capability, consent, budget, redaction,
  attributed outcome) in [Tool transport R2](../architecture/tool-transport-r2.md).
- PP-2, PP-4, and P0-AC-026 mandatory. Pre-queue and pre-write typed redaction
  and consented recording remain required controls for environment views,
  handles, job records, and progress events; no open mechanism in this
  document defers them.
- R3 retention and R6 deferral preserved. No durability, replay, or release
  promise in this note changes the R3 baseline in
  [Context retention R3](../architecture/context-retention-r3.md) or the R6 baseline in
  [Persistence profile R6](../architecture/persistence-profile-r6.md).
- MP-10 handling not reopened. Storage, redaction, consent separation, and
  the `ai.provider` scope stay exactly as specified in
  [AI Architecture](../architecture/ai-architecture.md); environment-derived secrets inherit
  the same opaque-handle rule as provider credentials.

## Bitty-side handoff, not a decision

The following items from the candidate direction need owning-repository review
and are recorded here as input only:

1. Four-layer environment composition (`ProcessEnv`, `ConfigEnv`,
   `LaunchEnv`, `RuntimeEnv` with ordered inheritance)
   (owner: `bitty` side; constraint: composition and override order stay
   host-defined).
2. Shell-sync collection helper (`bitty __shell-sync` as a shell child
   inheriting exported environment at prompt time, with `std::env::vars_os`
   collection and prompt-cadence;
   rejected alternatives: command parsing at and
   `/proc/<pid>/environ` at) (owner: `bitty` side;
   constraint: no parser-based or proc-based collection contract is adopted
   here).
3. `ShellState` unification (`cwd`, `env`, command, prompt, shell, remote as
   one state with `PanelEnvSnapshot` revisioning
   and core sketch, including snapshot-versus-diff note at) (owner: `bitty` side; constraint: no store shape or
   revision protocol is accepted here).
4. New-panel default semantics (`new` inherits, `clean` resets to base,
   `spawn --env` overrides) (owner: `bitty` side
   with plugin-ecosystem review for the Lua surface; constraint: naming and
   defaults undecided here).

Suggested handling: each owning repository accepts, reshapes, or rejects
these inputs through its own review; `bitty-ai` Core proceeds with the five
awareness contracts regardless of handoff timing.

## Risks

- A presence marker is still an oracle: enumerating which secrets exist can
  guide targeted exfiltration attempts, so handle and inspect surfaces need
  the same R2 gates as execution.
- Handle confusion across revisions can bind execution to a stale snapshot;
  reviewers must keep snapshot identity, revision, and consent attachment
  unambiguous at the `bitty`-side seam.
- An allowlist that grows key by key becomes a full dump by drift;
  persistence reviewers must keep the default at no-persistence and justify
  every addition.
- Agents that assume shell-local state will break silently on clean or
  foreign-shell panels; documentation and errors must keep the
  exported-only boundary explicit.

## Open points

Duplicate-check against
[AI Unresolved Questions](../product/ai-unresolved-questions.md) finds every awareness
question already tracked, so this document proposes no new AIQ identifier and
no new global open-question identifier:

- AIQ-5A (Typed redaction markers and invalidation mechanism) covers the
  redaction machinery the sanitized view depends on.
- AIQ-33 (Unified authorization/isolation backend) covers the gate model
  environment use and handle dereference sit behind.
- AIQ-38 (Generic execution and registry ownership across repositories)
  covers the cross-repository handle and execution split, including the
  no-model-I/O rule.
- AIQ-36 (Native versus MCP tool transport and bridge placement) covers
  transport-path placement for environment-mediated effects.
- AIQ-10 (Task lifecycle authority and CarryCtx backend/handoff, with the
  AIQ-56 alias) covers spawn and clone lifecycle authority for handle-based
  panel creation.
- AIQ-29 (Optional Panel/execution projection bindings) covers projection of
  environment-backed execution without moving targets or manufacturing
  consent.
- AIQ-54 (Cross-store retention policy authority) covers who constrains any
  future allowlist persistence.
- AIQ-55 (Deletion/expiry and derived-record invalidation) covers consistent
  removal of persisted environment payloads and derived records.
- AIQ-57 (Reconstruction after deletion, expiry or destructive journal
  reduction) covers disclosure of missing environment evidence after expiry.

Credential-storage tiers, panel presentation, per-shell collector scripts,
and plugin-registry mechanics belong to the owning repositories or future
scoped tasks and are not AIQ entries.
