---
title: History consumption boundary
description: Draft bitty-ai history consumption boundary derived from the candidate direction
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 48
---

# History consumption boundary

> Status: **draft**. This document records the candidate direction
> into the draft `bitty-ai`-side history consumption boundary: consume-not-own
> principle, backend-agnostic `HistoryProvider` direction, scoped
> `panel.history`-style reads, `CommandRecord` attribution with external
> history references, agent-command sink direction, Atuin MCP tool reference
> shape, and the command-history versus panel-output boundary. It proposes no
> accepted architecture, authorizes no shipped behavior, closes no Artificial
> Intelligence Question entry, introduces no new identifier, and contains no
> product code. Normative security and IPC obligations override any
> experimental adoption stated here. `bitty`-side material below is handoff
> input, not a decision: the `bitty` terminal repository decides acceptance,
> sequencing, and mechanism through its own review.

## Purpose and scope

This boundary covers only what `bitty-ai` may assume and request about
history, even before any `bitty`-side mechanism lands:

- What `bitty-ai` Core owns as contract: the consume-not-own principle and
  the seven consumption items in [Contract 1](#contract-1-consume-not-own)
  through [Contract 7](#contract-7-command-history-versus-panel-output-boundary).
- What `bitty-ai` Core does not own: event emission, scrollback retention,
  segment layout, storage and capability APIs, history modes, export
  mechanics, provider and sink and import adapters, semantic markers, and
  federated query presentation, which are `bitty`-side handoff items recorded
  in [Bitty-side handoff, not a decision](#bitty-side-handoff-not-a-decision).
- What is explicitly out of scope here: exact wire schemas, SQL schemas,
  transaction boundaries, hash-function selection, compression tuning,
  secret-store design, panel presentation, and plugin-registry mechanics.

Inputs are the candidate direction, the R1 disposition in
[Execution ownership R1](../architecture/execution-ownership-r1.md), the R2 disposition in
[Tool transport R2](../architecture/tool-transport-r2.md), the R3 disposition in
[Context retention R3](../architecture/context-retention-r3.md), PP-2 (Typed redaction) and
PP-4 (No on-disk persistence without consent) under
[Privacy-first](../architecture/ai-architecture.md#privacy-first) in
[AI Architecture](../architecture/ai-architecture.md), the draft storage direction in
[Storage memory and export design](storage-memory-export-design.md)
(CTX-0034: sessions hold references, no history duplication), the register in
[AI Unresolved Questions](../product/ai-unresolved-questions.md), the narrow scope gate
in [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md), and the
accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) as overriding
authority. This document is the English-language candidate summary, not a
translation, and it stands alone.

No product code is introduced or described as implemented. Rust, Lua, and JSON
sketches below are illustrative proposal shapes, not configuration contracts
and not implementation claims.

## Contract 1: consume-not-own

`bitty-ai` holds no panel history store. It consumes a host-provided History
API and never owns retention, indexing, or eviction of terminal history. The
source direction is:

```text
Panel Core -> Panel Events -> History API -> bitty-ai (consumer)
```

A second consumer, the history keeper (official plugin or external provider),
owns persistence. `bitty-ai` must keep working when the keeper is absent,
minimal (commands only), or replaced by another backend: history reads degrade
to unavailable references, never to local re-implementation.

**Critical judgment:** consume-not-own is a `bitty-ai`-side contract proposal,
not an accepted cross-repository interface. No History API name, version, or
transport below is stable until the `bitty` side accepts it.

## Contract 2: backend-agnostic HistoryProvider direction

The draft direction is one narrow provider interface between `bitty-ai` and
any history backend (local keeper, Atuin, SSH host, or future custom
provider). Illustrative shape from the source record (not a wire contract):

```rust
trait HistoryProvider {
    fn search(/* scoped query */) -> Vec<CommandSummary>;
    fn get(/* command id */) -> Option<CommandRecord>;
    fn output(/* command id, bounds */) -> BoundedOutput;
}
```

`bitty-ai` resolves which provider answers; it never branches on backend
internals. Provider selection, credential handling, and fan-out policy stay
host-side. Federated merging across providers, if any, is a host behavior
with per-provider attribution, not agent-side concatenation.

**Critical judgment:** the trait names and arities are proposals. The stable
claim is only the narrowness: three read operations, all scoped, all bounded,
all backend-agnostic.

## Contract 3: scoped panel.history-style reads, never SQL

Agents request history through scoped host calls, never through direct store
access. The source read shapes are illustrative only:

```text
history.list_commands(panel)
history.get_command_output(command_id)
history.search("error[E0382]")
history.tail(panel, 100)
```

Every read carries an explicit scope (panel, workspace or directory, time
window, result bound) and returns redacted, truncated, attributed records or
typed unavailability. Direct database reads, file reads of segment or index
files, and schema-dependent queries are out of scope for `bitty-ai` by
contract, even when the backend happens to be SQLite.

**Critical judgment:** this prohibition is load-bearing for R2 and the
security baseline. A history read is a tool effect: it passes the same gate
order as any tool call (see
[Consistency](#consistency-with-r1-r2-r3-and-ctx-0034-storage-design)).

## Contract 4: CommandRecord attribution and external references

The draft record carries identity, execution facts, attribution, and an
optional external reference. Illustrative shape from the source record (not a
schema contract):

```rust
struct CommandRecord {
    id: BittyId,
    panel_id: PanelId,
    workspace_id: WorkspaceId,
    command: String,
    cwd: String,
    started_at: Timestamp,
    duration: Duration,
    exit_code: Option<i32>,
    shell: String,
    actor: Actor, // User | Agent(agent_id) | Plugin(plugin_id)
    external: Option<ExternalHistoryRef>, // { provider, id }
}
```

Attribution semantics proposed for `bitty-ai` consumption:

- `actor` distinguishes user-typed, agent-executed (with the responsible
  agent identity), and plugin-issued commands. Agent filtering and audit use
  this field; its values are host-asserted, never self-asserted by the agent.
- `external` links a Bitty record to the same logical command in another
  system (for example an Atuin history entry) as a `{ provider, id }` pair.
  `bitty-ai` treats the pair as an opaque correlation handle for evidence and
  provenance, never as authorization to open the foreign store directly.
- Command facts (command text, working directory, timestamps, duration, exit
  code) are observation data: untrusted until redacted, and suitable as cited
  evidence only with their scope, redaction markers, and truncation state
  attached.

**Critical judgment:** field names, types, and the `actor` value set are
proposals. The stable claim is attribution plus opaque external linkage as
the provenance mechanism, consistent with the CTX-0034 rule that sessions
hold references rather than duplicated history.

## Contract 5: agent-executed-command sink direction

Commands the agent executes through host execution (R1 `ExecutionContext`,
not ambient shell access) may never pass through an interactive shell hook,
so they would be invisible to shell-attached history unless the host records
them. The draft sink direction is a host-owned lifecycle adapter:

```text
command_started -> history start (open entry, return handle)
command_finished -> history end --exit <code> --duration <span> <handle>
```

`bitty-ai` does not invoke the sink itself: the host emits lifecycle events
and the adapter writes to the configured external history. Agent identity
flows with the entry so later queries can filter agent-executed commands.
Sink failures are non-fatal to execution and surface as unattributed or
unlinked records, never as retried effects.

**Critical judgment:** the start/end vocabulary mirrors the Atuin agent-hook
reference in the source record; the mechanism (which plugin calls what
binary) is `bitty`-side handoff, not a `bitty-ai` decision.

## Contract 6: Atuin MCP tools as reference shape

The Atuin MCP pair (`history` lookup plus `output` retrieval) is the
reference shape for `bitty-ai` history tools: one operation finds candidate
commands, a separate bounded operation fetches output for a chosen entry. The
separation matters because output is large, sensitive, and often unnecessary:
listing stays cheap while output stays explicitly requested, scoped, and
truncated.

`bitty-ai` history tools, when defined, must preserve that split and inherit
the R2 gate order: consent grant, budget reservation, typed redaction before
queueing into context, and attributed outcomes including truncation and
Unknown. MCP transport itself stays a placement decision under R2, not a
capability grant.

**Critical judgment:** Atuin MCP is cited as prior art for tool shape only.
No MCP server, schema, or version is adopted, and no direct MCP bypass around
the unified backend is permitted.

## Contract 7: command-history versus panel-output boundary

`bitty-ai` may request two different things with different cost and
sensitivity:

| Request class      | Content                                                      | Cost and handling                                                                                                   |
| ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Structured command | Command text, working directory, timestamps, duration, exit  | Small, long-lived, indexable; always scoped queries                                                                 |
| Panel output       | Bounded output bytes plus agent and session relation context | Large, sensitive, volatile by default; explicit opt-in persistence, strict bounds, redaction, truncation disclosure |

Rules for `bitty-ai` consumption:

- Prefer structured commands for diagnosis triage ("which command failed,
  where, with what exit"); fetch output only for entries that survive
  triage, with explicit row and byte bounds.
- Treat panel output as untrusted observation data: redacted before context
  insertion, truncated with a disclosed marker, never silently expanded.
- Request agent and session relations (which agent ran what, in which
  session) as attributed metadata through the same scoped reads, not as
  ambient joins across stores.
- Never move raw output into durable `bitty-ai` storage: session records
  keep references (`CommandRecord` id plus `external` handle) per the
  CTX-0034 no-duplication rule; re-fetch through the provider when needed.

**Critical judgment:** the decoupling of command history from panel output is
the central consumption invariant. Any future proposal that merges them into
one unbounded "give me everything" read contradicts this draft.

## Consistency with R1, R2, R3, and CTX-0034 storage design

- **R1 (host owns execution).** History never authorizes execution.
  [Execution ownership R1](../architecture/execution-ownership-r1.md) keeps
  `ExecutionContext` primary with optional Panel projection; history reads
  observe past executions and must not derive working directory, environment,
  or capability from panel occupancy. Agent entry into a headed panel to
  inspect prior commands is observation, not ownership transfer.
- **R2 (unified authorization).** Every history read passes the
  [Tool transport R2](../architecture/tool-transport-r2.md) gate order: authenticated
  principal, registry and schema resolution, caller/target/generation
  authorization, per-tool capability plus consent grant, budget reservation,
  dispatch through the declared path, pre-queue typed redaction, attributed
  outcome. History tools declare MCP or native placement like any other tool;
  placement never bypasses the backend.
- **R3 floor (redaction and consent).** P0-AC-026 with PP-2 (Typed redaction)
  and PP-4 (No on-disk persistence without consent) from
  [AI Architecture](../architecture/ai-architecture.md) are mandatory and not reopened. The
  [Context retention R3](../architecture/context-retention-r3.md) floor applies verbatim:
  completeness holds only for authorized, redacted, still-retained records;
  deletion and expiry propagate; missing records surface as typed
  unavailability, never as silent gaps.
- **CTX-0034 storage design.** Sessions hold references, not duplicated
  history: [Storage memory and export design](storage-memory-export-design.md)
  keeps the global catalog to control-plane fields and content-addressed
  objects to owned artifacts. History entries, outputs, and foreign handles
  enter sessions as cited references with scope and redaction state, never as
  copied payloads.

This document reopens none of R1, R2, R3, or the CTX-0034 shard, lifecycle,
or collection directions, and contradicts none of them.

## Bitty-side handoff, not a decision

Every item below is handoff input owned by the `bitty` side. Inclusion here
records that the source proposes it; nothing here accepts, sequences, or
specifies it.

- **Core `PanelEvent` emission and fan-out**: the
  event enum sketch, PTY-to-parser-to-state-to-bus flow, and Lua subscription
  shapes. Owner: `bitty` side.
- **Volatile scrollback ownership**: in-memory row
  buffer as the Core terminal function, discarded with the panel. Owner:
  `bitty` side.
- **Append-only segment layout**: segment files,
  size-triggered seal and compress rotation, and time and size retention by
  segment deletion. Owner: `bitty` side.
- **SQLite-as-rebuilt-index option**: canonical log
  as source of truth with a regenerable query index. Owner: `bitty` side.
- **Lua storage and capability APIs**: mediated
  store and capability-scoped filesystem access instead of direct database or
  native-library access from plugins. Owner: `bitty` side.
- **History modes**: commands-only, commands plus
  bounded output, and full replay tiers with retention and compression
  policy. Owner: `bitty` side.
- **Export plugin on the History API**: metadata,
  commands, outputs, and timeline assembled into an export bundle by a
  plugin against a stable host API. Owner: `bitty` side.
- **Layering without Core database dependency**:
  Core keeps volatile state plus event and plugin-host APIs while official
  plugins own command history, output persistence, compression, retention,
  export, and search. Owner: `bitty` side.
- **Atuin provider, sink, and import mechanics**:
  provider selection, field mapping, CLI-mediated access instead of direct
  database reads, lifecycle sink calls, and the import command surface.
  Owner: `bitty` side.
- **Raw-output exclusion and external linkage**:
  keeping raw panel output out of command history with opaque cross-system
  correlation handles. Owner: `bitty` side.
- **Federated query presentation**: multi-scope
  search merged across local and external providers without copying data.
  Owner: `bitty` side.
- **Semantic marker handling (`OSC 133`, source): prompt and
  command-boundary markers as the shared command model for blocks, folding,
  navigation, export, and agent reads. Owner: `bitty` side.

## Critical judgments

- **Proposal versus contract.** Only Contracts 1 through 7 bind `bitty-ai`
  consumption direction, and only as draft. Trait shapes, record fields,
  tool names, mappings, markers, layouts, and modes from the source are
  proposals cited with line ranges, not stable interfaces.
- **Mandatory gating on every read.** Consent, redaction, and budget gates
  apply to each history call, including small command listings: no ambient
  history authority, no pre-authorized bulk export into context, no silent
  permission escalation through provider fan-out.
- **No unbounded output into context.** Output reads require explicit row
  and byte bounds with truncation and redaction disclosed in the returned
  record. Piping a full snapshot or replay stream into model context is
  rejected by this draft regardless of provider.
- **No store duplication.** `bitty-ai` session and memory stores reference
  history; they do not mirror it. Catalog-style control-plane fields may be
  cited; payloads are re-fetched through scoped provider reads while still
  retained and authorized.
- **Untrusted by default.** Command text and output may embed prompt
  injection, secrets, or malformed spans. They enter context as redacted
  observation data under the repository security baseline, never as
  instructions and never as capability grants.

## Residual risks

- The History API surface is still a source-record sketch: provider
  contracts, error taxonomy, scope vocabulary, bound defaults, and
  redaction-marker format need `bitty`-side acceptance before `bitty-ai`
  tools can be specified against them.
- Output sizing is unmeasured: the source cites external per-command and
  per-session bounds as prior art, not as verified `bitty-ai` budgets;
  context-budget integration (truncation accounting, per-reader cost) is
  unspecified.
- Cross-system correlation handles (`external` references) need lifecycle
  rules for dangling links after expiry, deletion, or provider removal,
  consistent with R3 deletion propagation.
- Federated search ranking, merging, and attribution across providers are
  host behaviors with evaluation risk; silent cross-provider fallback would
  violate the per-reader enforcement facet.

## Open points

No Artificial Intelligence Question entry is closed and no new identifier is
proposed. The facets below restate existing register scope for this boundary;
exact baseline titles are used.

| Facet in this document                                | Existing identifier (exact baseline title)                     | Relation                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| History reads gated like tool calls                   | AIQ-33 — Unified authorization/isolation backend               | Facet: history tools as effects under the unified backend  |
| Per-reader redaction and no cross-scope leakage       | AIQ-58 — Per-reader evidence sharing enforcement               | Facet: scoped reads with per-reader enforcement            |
| History tool placement (native versus MCP path)       | AIQ-36 — Native versus MCP tool transport and bridge placement | Facet: provider and MCP shape as placement, never bypass   |
| Session holds history references, lifecycle authority | AIQ-10 — Task lifecycle authority and CarryCtx backend/handoff | Facet: reference-not-copy under single lifecycle authority |

Ownership routing, milestone assignment, and global open-question status stay
with the canonical register in
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared governance
in `bitty-docs`; this table is local draft analysis only.
