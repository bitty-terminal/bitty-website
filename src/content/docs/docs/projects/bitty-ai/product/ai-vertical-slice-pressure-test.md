---
title: AI Vertical Slice Pressure Test
description: Experimental bitty-ai vertical slice on generic Core primitives with a mapped generic-abstraction gap list
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: true
sidebar_order: 24
---

# AI Vertical Slice Pressure Test

> Status: **draft** plus **experimental implementation** evidence. This
> document records a single experimental `bitty-ai` vertical slice built only on
> generic Core primitives, and the gaps that slice exposed. It does **not**
> describe shipped, stable, or compatibility-guaranteed behavior, does **not**
> authorize any AI-specific Core API, and does **not** close
> [OQ-066](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md),
> [OQ-080](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md),
> or [OQ-081](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
> The lifecycle is `Draft -> experimental review evidence -> Accepted ->
normative`. Architecture claims remain governed by
> [AI Architecture](../architecture/ai-architecture.md) and
> [IPC and Agent RFC](../specifications/ipc-agent-rfc.md).

## Purpose and scope

The `BA-6` pressure-test gate in [AI Architecture](../architecture/ai-architecture.md) requires
`bitty-ai` to be realizable from generic primitives without Core changes, and
treats every newly demanded Core AI-specific API as evidence of a missing
Plugin API abstraction. `bitty` CTX-0407 (017 recommendation 6) asked for one
real vertical slice on Panel, IPC, Tool Bus, and Rich primitives to test that
claim in code rather than in prose.

This document answers three questions:

1. What did the slice actually build, and on which primitives?
2. Which gaps did it expose, each mapped to a proposed **generic** abstraction?
3. What remains unimplemented, stated without over-claiming?

In scope: ModelProvider, ContextProvider, Tool Bus, and Rich streaming at the
smallest size that still exercises a real end-to-end turn, plus the generic host
boundary. Out of scope: any live host integration, provider network path, model
selection, agent levels, consent UX, or Core change.

## Experimental implementation

The evidence is the experimental `bitty-ai-slice` crate:
<https://github.com/bitty-terminal/bitty-ai/pull/7> on branch
`ctx-0407/feat-ai-vertical-slice` at commit `8960cd2` (CarryCtx `AI-0005`,
cross-repository link `bitty` CTX-0407).

The slice reuses the **real** generic IPC primitive `bitty-ipc` through a
pinned Git revision (`3c9cfea`) rather than re-implementing it. It never links
Core's in-process `bitty-agent` or `bitty-runtime`; the only host boundary is a
generic `IpcBridge`/`HostPeer` seam.

### Primitive reuse map

| Slice element          | Generic primitive reused                                                                           | Accepted source                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Host request/response  | `bitty_ipc::channel::{IpcRequest, IpcResponse, IpcEndpoint}`, `DEFAULT_REQUEST_TIMEOUT_MS`         | [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) 256 KiB framing, channel caps |
| Wire validation        | `bitty_ipc::wire::{validate_request_envelope, validate_response_envelope, WIRE_VERSION}`           | [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) envelope v1                   |
| Method + scope         | `bitty_ipc::scope::{validate_method_name, required_scope_for_method, authorize_method, ScopeSet}`  | [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) scope families                |
| Per-client consent     | `bitty_ipc::scope::ConsentLedger` with deterministic `now_ms`                                      | [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) consent ledger                |
| Terminal context read  | wire method `terminal.snapshot` -> scope `terminal.inspect`, result labeled `is_untrusted_surface` | [AI Architecture](../architecture/ai-architecture.md) `CP-9`/`CP-10`                  |
| Tool transport         | `bitty_ipc::mcp::{McpClientStub, McpClientConfig, McpResponse}` (`tools/call`)                     | [AI Architecture](../architecture/ai-architecture.md) `TB-1`                          |
| Streaming bound        | `bitty_ipc::wire::{validate_chunk, CHUNK_CEILING}` (RC-10)                                         | [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) RC-10                         |
| Supply-chain admission | `cargo-deny` `allow-git` for the pinned `bitty` source                                             | `bitty-ai` `deny.toml`                                                                |

### End-to-end slice flow

```text
prompt
  -> DeterministicLocalProvider   local, scripted turn; no network, no secret
  -> IpcTerminalContext           `terminal.snapshot` under `terminal.inspect`
                                  (+ per-client ConsentLedger grant)
  -> HostToolBus                  read-only-by-default registry, `tools/call`
                                  through the MCP client stub
  -> PanelStreamSink              Markdown + ToolCard fragments, one dirty
                                  block per chunk, RC-10 validated
```

Every operation takes a caller-supplied `now_ms`; there is no wall-clock,
thread, async runtime, or OS handle. The test host is a deterministic loopback
peer, explicitly a **test double**, not a claim about live data.

## Verification and evidence

`cargo test -p bitty-ai-slice` (10 tests, all passing) proves:

- `end_to_end_loop_is_deterministic` — two runs are byte-equal; context,
  tool result, and chunk `seq`/`total`/`final` are asserted.
- fail-closed: `unknown_host_method_fails_closed`, `missing_consent_fails_closed`,
  `missing_scope_fails_closed`, `host_without_snapshot_handler_fails_closed`,
  `unknown_tool_fails_closed_before_dispatch`, `write_tool_is_denied_by_default`,
  `tool_call_limit_is_enforced`, `oversized_stream_chunk_fails_closed`,
  `context_budget_exceeded_fails_closed`.

Local gates on the same revision: `just check` green; `cargo check --workspace
--all-targets --locked` green; `cargo +1.85 check --workspace --all-targets
--locked` green (MSRV); `cargo check --target x86_64-pc-windows-gnu --workspace
--all-targets --locked` green; `cargo deny check` reports `advisories ok, bans
ok, licenses ok, sources ok`; `act -n -W .github/workflows/ci.yml` green.
Remote CI and independent review are still required before any acceptance.

## Findings and gaps

Each gap is mapped to a **generic** abstraction. None of these is a request to
grant AI an AI-specific Core API; where Core surface is implicated, the proposed
primitive is generic and shared.

| ID  | Gap                                                                                                                                                                                                                                               | Proposed generic abstraction                                                                                                                                        | Owning corpus                                  | Severity |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------- |
| G-1 | The generic IPC primitive is not externally consumable: `bitty-ipc` is `publish = false`, and `bitty-ai` needed a pinned Git revision plus a `cargo-deny` `allow-git` exception.                                                                  | A versioned, out-of-process **bridge client SDK** (`bitty-bridge` / `bitty-ipc-client`) exporting the accepted envelope, method registry, scope, and consent types. | `bitty` + `bitty-terminal-docs`                | P2       |
| G-2 | The generic method registry knows `terminal.snapshot` -> `terminal.inspect`, but no host dispatcher registers a bounded `terminal.snapshot` handler and there is no generic panel-context read service.                                           | A host-registered, zone-scoped bounded **`terminal.snapshot` / panel-context read service** over IPC.                                                               | `bitty` + `bitty-terminal-docs`                | P1       |
| G-3 | There is no generic host method for Tool Bus dispatch. `bitty-ipc` provides the MCP client transport/correlation stub, but host-side registration and consent-bound dispatch (`TB-4`) are absent.                                                 | A host-registered **tool-dispatch method** with per-tool consent and bounded results, generic across agents and plugins.                                            | `bitty` + `bitty-terminal-docs`                | P1       |
| G-4 | Core `bitty-rich` `Scene`/`RichBlock` are not consumable out of process, and there is no bounded scene-fragment ingestion method, so an external producer cannot compose the single scene path (`RS-2`).                                          | A bounded **rich scene-fragment transport** with a consumable fragment contract for out-of-process producers.                                                       | `bitty` (`bitty-rich`) + `bitty-terminal-docs` | P2       |
| G-5 | Core already carries AI-named surface in `bitty-runtime/src/ai_panel.rs` (`ai.provider`, `ai.stream`, `ai.model`, `panel.provider`, `agent.context.terminal`, `mcp.invoke:`), which predates this pressure test and deserves review under `BA-6`. | Review those names against a generic **`panel.provider` service capability** and generic context scopes; demote any AI-specific Core API to a plugin/SDK primitive. | `bitty` + `bitty-docs` governance              | P2       |
| G-6 | The AI consent vocabulary (`ai.provider`, `ai.stream`, `ai.model`, `agent.context.*`) is not in the generic 13-scope `bitty_ipc::scope::Scope` registry, and the mapping from AI consent to generic scope has no documented home.                 | Document the **AI-consent -> generic-scope mapping**, or add generic context scopes where reuse is insufficient.                                                    | `bitty-ai-docs` + `bitty-docs`                 | P2       |

### Interpretation

G-2 and G-3 are the load-bearing findings: the slice could not read live
terminal/panel context or dispatch a tool against a real host because the generic
host methods do not exist yet. Both are generic services, not AI features, so
the pressure test's answer to its own question is "no AI-specific Core API is
required in principle, but two generic host services plus a consumable bridge
SDK are prerequisites." G-1 is a packaging prerequisite for any out-of-process
consumer; G-4 is a Rich-transport prerequisite; G-5 and G-6 are design
reconciliations of surface that already exists.

## What remains unimplemented

- No live Bitty host integration; the host peer is a deterministic test double.
- No provider network path, model registry, capability negotiation, credential,
  or secret handling.
- No agent levels, AgentWorkspace, consent UX, or session lifecycle.
- No real `Scene`/`RichBlock` composition; only fragment kinds and RC-10 chunk
  validation.
- No Core change. Any Core-side gap above remains a proposal, not an edit.
- No closure of OQ-066, OQ-080, or OQ-081.

## Relationship to open questions

- OQ-066 (context budget model): the slice exercises a candidate `32 KiB`-class
  budget (`CP-5`) and a caller byte ceiling. The `32 KiB` default is a
  candidate profile under OQ-066, not an accepted core bound; the slice does
  not decide token-first profiles.
- OQ-080 (provider wire adapters and presets): the slice uses only a
  deterministic local provider; it decides no wire protocol or preset location.
- OQ-081 (distribution boundary): the slice assumes an out-of-process consumer
  and shows the bridge-consumability gap (G-1) that the boundary decision must
  resolve.

## Maintenance

- When any gap above is resolved, update this document and link the resolving
  task/branch; do not silently promote the slice to shipped behavior.
- Keep the primitive reuse map aligned with [IPC and Agent RFC](../specifications/ipc-agent-rfc.md)
  and [AI Architecture](../architecture/ai-architecture.md); divergence is a defect.
- The slice is evidence, not a contract. A future accepted pressure-test
  procedure should cite this document as the first recorded instance.

## References

- [AI Architecture](../architecture/ai-architecture.md) — ModelProvider, ContextProvider, Tool
  Bus, Rich streaming, `BA-6` pressure-test gate, `CP-5`/`CP-9`/`CP-10`,
  `TB-1`..`TB-7`, `RS-1`..`RS-5`.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) — bounded framing, wire envelope v1,
  scope families, consent ledger, RC-9/RC-10, MCP adapter.
- [Open-Question Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  — OQ-066, OQ-080, OQ-081 (shared governance in `bitty-docs`).
- [Core and Plugin Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/architecture/core-boundaries.md)
  — mechanism versus policy and the rule that AI stays outside Core.
- Experimental implementation:
  <https://github.com/bitty-terminal/bitty-ai/pull/7> (`bitty-ai` branch
  `ctx-0407/feat-ai-vertical-slice`, commit `8960cd2`, CarryCtx `AI-0005`,
  cross-repository link `bitty` CTX-0407).
