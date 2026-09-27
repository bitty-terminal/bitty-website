---
title: Context management architecture
description: Session journal context view model and multi-level compression pipeline for semantic context construction
category: architecture
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 31
---

# Context management architecture

## Purpose and scope

This specification defines the context management subsystem for `bitty-ai`, distinguishing immutable session history from derived context views and establishing a multi-level compression pipeline that constructs semantic context rather than post-hoc compressing accumulated text.

**Draft relationship**: [AI Architecture](../architecture/ai-architecture.md) CP-5 (Budget), CP-6 (Artifacts), CP-7 (Determinism and testability). These proposals elaborate the draft; they do not accept new mechanisms.

## Core invariant: session versus context

The foundational principle (lines 460-506) is:

> **Session is fact, Context is projection.**

The proposed data model (lines 463-501) separates:

```text
Session Journal
     │
     │ authorized redacted retained records
     ▼
Context Builder
     │
     ├── rules
     ├── skills
     ├── memory
     ├── tool state
     ├── panel state
     ├── task state
     └── history
     │
     ▼
Context Transform Pipeline
     │
     ├── deduplicate
     ├── supersede
     ├── externalize
     ├── summarize
     ├── compress-range
     ├── prune
     └── compact
     │
     ▼
Context View
     │
     ▼
Provider
```

This creates the invariant (lines 503-506):

> **Session is fact; Context is only a projection of Session.**

**Candidate clarification (session-model alignment):** the invariant reads
"session" as the named scope of the record store, not as the storage format
itself. The fact carrier is the append-ordered journal and record store,
obedient to deletion and retention; a session is the named reachable scope
over that store from which projections compile. This reading keeps the
invariant compatible with the event-sourced candidate direction (the record
log holds the facts) without reopening either. The named-scope reading,
session identity, and directory relations stay with
[Session model (candidate)](../specifications/session-model-candidate.md).

The recording suggests retaining original logs and conversation (lines 508-518). **Improve, not adopt unconditionally:** completeness is relative only to authorized, redacted records still retained under policy. A bounded in-memory session does not authorize durable recording. Disk retention requires explicit applicable consent, pre-queue/pre-write typed redaction, minimization, user-only storage and export preview; input recording is off by default and separately opt-in, while clipboard and raw environment are absent by default (P0-AC-026). Context projection never widens the reader's authority.

Deletion or expiry propagates to journal payloads, artifacts, derived summaries, indexes and caches; tombstones must not retain deleted sensitive payloads. References become typed unavailable rather than silently recovering deleted or never-recorded bytes. Replay and debugging are bounded by surviving authorized records, not a promise of full recovery. Append-only logical history is subordinate to these deletion obligations.

**Status**: This is a **proposed architectural model**, not a description of existing implementation. The separation influences session persistence, recovery, and debugging strategies.

## Multi-level compression pipeline

The source proposes (lines 522-536) a five-level progressive pipeline:

```text
Level 0   Structured Output
          ↓
Level 1   Lossless Pruning
          ↓
Level 2   Selective Compression
          ↓
Level 3   Global Compaction
          ↓
Level 4   Provider-native / Remote Compaction
```

Each level is evaluated below with source line references.

### Level 0: Structured output (lines 538-588)

The source argues (lines 538-541) this is more important than `/compact`. Do not produce garbage context in the first place.

Example: `cargo test` should not produce 20k tokens of raw log (lines 542-552). Instead, return:

```text
ToolResult {
    status = failed
    passed = 117
    failed = 3
    failures = [...]
    artifact = "panel://17/run/42"
}
```

File reading follows the same principle (lines 566-587). Agent request to understand `src/context.rs` defaults to returning:

```text
ContextManager
├── new()
├── build()
├── compact()
├── prune()
└── estimate_tokens()
```

Not 1800 lines of code. The source states (line 587) this is where `ctxctl` AST reading should be integrated into `bitty-ai`.

**Design consequence**: Tool results must be semantically structured with raw artifact references, not flat text dumps. This requires:

1. Tool result schema supporting structured data plus artifact URIs
2. Artifact store for large raw outputs (Panel logs, file contents, command streams)
3. Lazy retrieval mechanism when the agent needs full detail

**Unresolved**: What is the tool result schema? Is it typed Rust, JSON, or provider-specific? Where is structured output validated?

### Level 1: Lossless pruning (lines 590-636)

This level requires no LLM (line 593). Examples:

- **Duplicate tool calls**: `read foo.rs v1` then `read foo.rs v2`—keep only the most recent (lines 597-602).
- **Old error pruning**: After 4-5 rounds of `cargo test error input`, retain only `exit 101 / 3 failures / artifact://...` (lines 604-617).

The source observes (lines 619-620, citing [5]) OpenCode DCP already performs duplicate tool call removal and old error pruning. oh-my-pi's `shake` goes further by externalizing large tool results and fenced blocks into `artifact://` references (lines 621-622, citing [6]).

The source argues (lines 624-636) Bitty naturally supports this via URI schemes:

```text
panel://
file://
artifact://
task://
agent://
git://
```

Context contains references; retained authorized content may be retrieved on demand. Missing, expired or deleted content is explicitly unavailable.

**Design consequence**: Core must provide:

1. Artifact store with stable URIs and garbage collection policy
2. Deduplication logic detecting superseded tool calls
3. Pruning policy identifying ephemeral or stale entries

**Unresolved**: Who determines pruning policy—Core heuristics, Lua configuration, or per-tool metadata? What is the artifact retention policy? When does `panel://17/run/42` expire?

### Level 2: Selective compression (lines 638-714)

This level compresses specific conversation ranges without touching active work. Inspired by OpenCode DCP (lines 641-654, citing [5]):

```text
Authorized retained history unchanged by projection
       │
       ▼
Generate Context View for this LLM turn
       │
       ├─ remove duplicate tools
       ├─ remove old errors
       ├─ compress range
       ├─ compress message
       └─ preserve protected content
```

DCP explicitly does not modify original session history; it generates a compressed view before sending to the LLM. Compression can target a range or specific messages (lines 454, citing [5]).

Example scenario (lines 647-683): Turns 1-30 implemented and debugged the parser. Current work is Renderer. Compress turns 1-30 into:

```text
Completed: parser implementation

Key decisions:
- recursive descent parser
- Span uses byte offsets
- error recovery uses synchronization tokens

Files:
- src/parser.rs
- src/span.rs

Tests:
- 47 parser tests passing
```

Turns 31-45 (Renderer work) remain uncompressed (lines 680-684).

The source proposes (lines 686-714) exposing Core primitives:

```rust
compress_range(...)
compress_task(...)
compress_branch(...)
compress_tool_results(...)
```

Lua plugins implement DCP-like policies using these primitives.

**Design consequence**: Context engine must support:

1. Range-based compression targeting specific turn spans
2. Task-based compression leveraging CarryCtx task boundaries
3. Protection markers for content that must not be compressed (user requirements, current goal, plan, active task)
4. Summarization backend (local model, provider-native, or remote service)

**Unresolved**: What triggers selective compression—token threshold, manual command, or continuous background process? Who decides what is "completed work" versus "active context"?

### Level 3: Global compaction (lines 716-778)

This is the traditional `/compact` emergency operation. The source argues (lines 719-727, citing [6]) oh-my-pi treats compaction as a first-class session entry type:

```rust
CompactionEntry {
    id,
    range,
    summary,
    tokens_before,
    tokens_after,
    backend,
    preserved_artifacts,
}
```

Proposed session journal structure (lines 729-767):

```text
Session Journal

0 User
1 Assistant
2 Tool
3 Tool
4 User
5 Assistant
6 Tool
7 COMPACTION
8 User
9 Assistant
```

When generating the context view, send:

```text
System
CompactionSummary
Entry 4+
```

The recording keeps entries 0-3 in the database (line 768); this draft permits that only while recording consent and retention policy allow it.

The source emphasizes (lines 770-777):

> `/compact` is: changing the active Context boundary, not: deleting history.

**Proposed consequence**: `/compact` shifts the projection boundary and records compaction metadata in bounded session state, durably only with recording consent. Projection compaction does not itself delete retained journal entries. Recovery or re-expansion requires the original authorized records still to exist; retention expiry and user deletion remain effective.

**Unresolved**: Can a compaction be undone? What happens when a subsequent turn needs context from the compacted range—does it retrieve from the summary or re-read the original journal?

### Level 4: Provider-native and remote compaction (lines 780-860)

The source observes (lines 782-795, citing [6] [7]) oh-my-pi uses multiple compaction backends (`remote`, `snapcompact`, `handoff`, `shake`, `soft`) with capability-based fallback, and OpenAI provides `/responses/compact` provider-native API.

Proposed design (lines 797-859): Core provides a `CompactionBackend` trait:

```rust
trait CompactionBackend {
    fn supports(&self, provider: &Provider) -> bool;

    async fn compact(
        &self,
        input: CompactInput
    ) -> Result<CompactOutput>;
}
```

Context policy configures fallback order:

```text
ContextPolicy

method_order = [
    "provider-native",
    "fast-model",
    "local-model",
    "semantic",
]
```

Example routing (lines 833-851):

- Claude → Anthropic native compaction (if available)
- OpenAI → `/responses/compact` API
- OpenRouter model → cheap remote summarizer
- Local model → Ollama summarizer

User invoking `/compact` does not specify backend; the policy decides (lines 853-859).

**Design consequence**: Context engine must:

1. Define `CompactionBackend` trait with typed input/output
2. Support multiple registered backends with capability detection
3. Provide fallback mechanism when preferred backend is unavailable
4. Handle backend-specific token accounting and cost implications

**Unresolved**: What is the `CompactInput` / `CompactOutput` schema? Does the backend receive raw session messages or pre-transformed text? How are provider-specific token limits and context window constraints communicated to the backend?

## Continuous maintenance versus emergency compaction

The source proposes (lines 862-912) two parallel strategies:

### Continuous maintenance (lines 870-895)

Gradually reduce context through:

- Deduplication
- Stale output pruning
- Artifact externalization
- Selective compression

Context trends (lines 883-893):

```text
180k
 ↓
160k
 ↓
155k
 ↓
148k
```

Avoids sawtooth pattern (lines 897-907):

```text
180k
190k
198k
  ↓
/compact
  ↓
30k
```

The source argues (line 910-912) continuous maintenance preserves model continuity better than emergency compaction.

**Design consequence**: Context engine runs background maintenance:

1. Detect duplicate tool calls after each turn
2. Prune ephemeral entries (old failed commands, superseded reads)
3. Externalize large outputs to artifact store
4. Apply selective compression to completed task ranges

**Unresolved**: What is the trigger cadence—after every turn, every N turns, or token threshold? Does background maintenance block the next user message, or is it asynchronous?

### Emergency / boundary compaction (lines 874-881)

Triggered by:

- Manual `/compact` command
- Token threshold approach
- Context window overflow
- Provider compaction API invocation

**Design consequence**: Emergency compaction uses the Level 3 or Level 4 pipeline and records a `CompactionEntry` in the session journal.

## Context item retention policy

The source proposes (lines 914-965) tagging context items with lifetime metadata:

```text
ContextItem
├── id
├── type
├── tokens
├── source
├── artifact
├── importance
├── lifetime
└── retention
```

Retention levels (lines 932-939):

- `pinned`: User requirement, current goal, plan, current task
- `recent`: Recent file reads, recent command output
- `normal`: Old successful test results
- `ephemeral`: Old duplicated grep, old failed command input

Lua API (lines 958-964):

```lua
context.pin("architecture-decision")
context.protect(tool_result)
context.compress(task)
```

**Proposed consequence**: Context items carry selection priorities. `pinned` and protection markers cannot override consent, redaction, expiry, deletion or resource ceilings. Durable retention policy is distinct from context-window priority and remains host-enforced even when Lua proposes selection policy.

**Slice-harness evidence (experimental, store facet only):** the sibling `bitty-ai` `ArtifactStore` enforces generation-exact expiry (`store(bytes, generation)`, `resolve(reference, current_generation)`, typed `ArtifactExpired` for out-of-generation and `ArtifactUnavailable` for dangling or invalidated references) plus explicit `invalidate` with derived-record fail-closed propagation and inert inline summaries; merged in `bitty-ai` `e4ad1d5` (AI-0124) and `543e7d2` (AI-0125). Durable retention authority, host deletion timing, and cross-store cache and index propagation stay open — see [AI Unresolved Questions](../product/ai-unresolved-questions.md). This describes sibling behavior only as read.

**Unresolved**: Who assigns retention levels—tool implementations, Core heuristics, or agent instructions? Can the model influence retention through tool calls, or is it strictly managed by Core policy?

## MCP schema lazy loading

The source identifies (lines 1022-1074) a context cost problem:

```text
50 MCP servers
× 20 tools
× JSON schema
```

Tool schemas consume significant context (lines 1027-1034). Claude Code implements MCP Tool Search: load only summary at startup, fetch full schema on demand (lines 1035, citing [1]).

Proposed Bitty design (lines 1037-1074):

1. MCP Registry at startup shows:

   ```text
   github: repository and PR operations
   postgres: database queries
   ```

2. Agent determines need: `tool.search("github pull request")`

3. Expose full schemas:

   ```text
   github.create_pr schema
   github.list_prs schema
   ```

Avoid sending 300 tool schemas every turn (lines 1071-1074).

**Design consequence**: MCP integration must support:

1. Summary-level tool discovery
2. On-demand schema loading when agent selects a tool domain
3. Schema caching for active tools
4. Schema eviction when tools are no longer referenced

**Unresolved**: What is the schema loading trigger—explicit tool search, first invocation attempt, or predictive prefetch? How does schema caching interact with context budget?

## Context observability UI

The source proposes (lines 970-1020) a Bitty Panel for context inspection:

```text
┌──────────────── Context ────────────────┐
│ Model               GPT-5.6             │
│ Context             93k / 256k          │
│                                         │
│ System              8.3k   ███          │
│ Skills              5.1k   ██           │
│ Conversation       31.4k   ███████      │
│ File reads         14.8k   ████         │
│ Tool results       18.1k   █████        │
│ MCP schemas         6.2k   ██           │
│ Memory              4.0k   █            │
│ Plan                2.1k                │
│                                         │
│ Recoverable         34.1k               │
│ Compressible        21.8k               │
│ Pinned              13.4k               │
└─────────────────────────────────────────┘
```

Interactive actions (lines 1011-1018):

- `c` → compress
- `d` → drop
- `p` → pin
- `o` → inspect

The source argues (lines 1019-1020) this fits Bitty's Panel philosophy better than text-only `/context` output.

**Design consequence**: Context engine exposes:

1. Token accounting by category (system, skills, conversation, file reads, tool results, MCP schemas, memory, plan)
2. Categorization of compressible, recoverable, and pinned content
3. Interactive compression, dropping, pinning, and inspection operations

**Unresolved**: Does this UI live in `bitty-core` (native Panel), `bitty-ai-core` (context domain), or `bitty-ai` Lua (policy layer)? Cross-reference Panel specifications in `bitty-terminal-docs`.

## Skills registry integration

Source lines 1076-1114 argue Skills should be a Core registry with discovery, parse, resolve, load, unload, and invoke operations (lines 1080-1087), not a Core workflow implementation.

Directory compatibility proposal (lines 1089-1101, citing [8]):

```text
.wheel/skills/
~/.config/bitty/skills/

.agents/skills/
.claude/skills/
```

OpenCode already supports `.opencode/skills`, `.claude/skills`, `.agents/skills` for ecosystem compatibility (lines 1100-1101).

Real workflows like `/review`, `/release`, `/debug`, `/refactor` are Skills (lines 1103-1113), not built-in commands.

**Design consequence**: `bitty-ai-core` provides `SkillRegistry` primitive; Lua plugins or MCP servers supply skill implementations.

**Unresolved**: What is the Skill format—Markdown with frontmatter, YAML, or structured JSON? How are Skills versioned and updated? Cross-reference OpenCode and Claude Code skill formats for compatibility.

**Candidate scope note (project continuity):** the registry shape above serves
skills that Lua plugins or MCP servers supply; the same shape carries a
project's standing conventions when continuity artifacts are project-scoped.
That project-scope reading, its derivation paths, and its bootstrap gates stay
with [Project continuity (candidate)](project-continuity-candidate.md); this
section keeps the registry primitive unchanged.

## Loop and orchestration

Source lines 1116-1170 argue `/loop` is a Lua-only feature. Example (lines 1121-1130):

```text
/loop fix tests until pass
```

Implemented as (lines 1127-1130):

```lua
while not test_passed() do
    agent.run(...)
end
```

Core provides primitives (lines 1132-1143): `agent.run()`, `task.spawn()`, `event.subscribe()`, `exec()`, `cancel()`, `timeout()`.

More structured example (lines 1145-1158):

```lua
ai.loop({
    until_ = function(state)
        return state.tests_passed
    end,

    max = 5,

    step = function()
        agent.run("Fix the remaining failing tests")
    end
})
```

Community can create (lines 1160-1169): `/loop`, `/autofix`, `/watch`, `/verify`, `/benchmark` without Rust changes.

**Design consequence**: Core provides agent orchestration primitives; Lua composes them into loop constructs. No `LoopModeManager` in Core.

## Task model placement

Source lines 1172-1221 propose Task data model belongs in Core (lines 1179-1191):

```text
Task
├── id
├── parent
├── state
├── owner_agent
├── workspace
├── panel
├── dependencies
├── result
└── artifacts
```

Rationale (lines 1193-1201): Task involves Agent lifecycle, Panel lifecycle, child-agent orchestration, Dashboard, and Persistence—all Core concerns.

But `/task` UI and interaction remain Lua (lines 1203-1209).

Proposed Agent Dashboard (lines 1211-1220):

```text
Agent                 Task             Panel

Planner     ───────► architecture      #17
Coder A     ───────► parser            #21
Coder B     ───────► renderer          #24
Reviewer    ───────► review            #31
```

This connects Agent/Panel decoupling discussed elsewhere (line 1221-1222).

**Design consequence**: `bitty-ai-core` provides Task graph primitives; Lua provides `/task` command and Dashboard UI.

**Unresolved**: How does the Task model integrate with CarryCtx? Is CarryCtx a persistence backend for Task, or are they parallel systems? (Forward reference pending reconciliation with CarryCtx integration specification.)

## Statusline observability

Source lines 1223-1270 argue `/statusline` is Lua. Core exposes (lines 1228-1240):

```text
agent.state
model
tokens
context_usage
task
branch
workspace
panel
cost
tool_calls
```

Lua formats output (lines 1242-1255):

```lua
statusline.register("ai", function(ctx)
    return string.format(
        "%s · %s · %.0f%% · %s",
        ctx.model,
        ctx.agent,
        ctx.context.percent,
        ctx.task.name
    )
end)
```

Users customize format (lines 1257-1267) without Core changes.

**Design consequence**: Core provides observability data; Lua renders statusline. No hardcoded statusline format in Core.

## Comparative positioning: semantic context construction

The source's synthesis (lines 1299-1357) argues Bitty's competitive advantage is not command feature parity but foundational architecture:

Traditional harness pattern (lines 1336-1338):

> Continuously produce text → Context too large → Compress text.

Bitty opportunity (lines 1340-1343):

> **From the start, do not equate the raw world with Context.**

Context sources (lines 1345-1353):

- Command output → Panel Store
- Files → Filesystem
- Structure → Tree-sitter/LSP
- Agent work → Task Graph
- Long content → Artifact Store

Context is a **temporary semantic projection** of these true states (line 1354).

The source argues (lines 1355-1357, citing [5]) this abstraction unifies Panel, headless agent workspace, Tree-sitter, LSP sharing, log folding, and Agent Dashboard.

**Normative interpretation**: This is the **design vision** justifying the Session/Context separation, structured output, and multi-level pipeline. It is not a technical requirement but a guiding principle for implementation trade-offs.

## Proposed module boundaries

Source lines 1358 proposes `bitty-ai` Rust modules:

```text
runtime
session
context
tools
agent
task
skill
mcp
provider
artifact
lua-api
```

Lua plugins (lines 1358):

```text
review
plan
loop
goal
context-ui
mcp-ui
statusline
```

**Status**: This is a **proposed internal architecture**, not a public API contract.

## Design rationale summary

The Session/Context separation enables:

1. **Retained session evidence**: Debugging, recovery and reconstruction over authorized redacted records that still exist, independent of projection-window size.
2. **Deliberate context construction**: Context is built semantically, not accumulated accidentally.
3. **Multi-level optimization**: Structured output, lossless pruning, selective compression, global compaction, and provider-native backends compose without conflict.
4. **Artifact externalization**: Large outputs stored separately and retrieved on demand reduce context bloat.
5. **Continuous maintenance**: Gradual context reduction preserves model continuity better than periodic emergency compaction.
6. **Provider flexibility**: Backend abstraction allows provider-native compaction, remote services, and local models without Core rewrites.
7. **Policy in Lua**: Lua proposes compression/selection preferences and UI; host enforcement preserves mandatory privacy, retention and budget limits.

## Verification plan

This specification records the candidate direction and comparative harness analysis. It does **not** describe implemented Bitty behavior. Verification requires:

- Accepted architectural decision records in `bitty-docs` for Session/Context separation
- `bitty-ai-core` Rust implementation of `Session`, `Context`, `ContextBuilder`, `CompactionBackend`
- Artifact store implementation with URI scheme and GC policy
- Lua API reference for context inspection, compression, and retention control
- Performance evidence showing continuous maintenance avoids emergency compaction

Read-only inspection on 2026-09-14 found `bitty-ai` at `3623c6b3ce33e97c1c493109ec6356219d0c9722`: `crates/bitty-ai-slice/src/session.rs:68-136` calls provider completion before conditional bounded context collection, optional tool dispatch and fragment emission. That experimental slice does not establish the proposed context-first continuation, journal/store or replay runtime. See [current evidence](../specifications/ai-runtime-boundaries-candidate.md#current-bitty-ai-evidence).

## Open points

1. **Context view generation cadence**: Is the context view generated once per LLM request, or cached and incrementally updated?

   **Slice-harness evidence (experimental, snapshot-stream facet only):** the sibling `bitty-ai` snapshot stream pins one digest-verified snapshot per session, re-collects per-turn deltas at the current generation, and rotates the pin on explicit host-authorized refresh (`RefreshLedger` monotonic issuance with retired chain, `StaleGeneration` fail-closed on stale pins); the stable snapshot head warms the `Session` prefix-cache key while only the turn tail varies, and a refresh misses the retired key. Merged in `bitty-ai` `e3bcfe2` (AI-0123), `8427008` (AI-0126), `f70d3ac` (AI-0127), `7de59d9` (AI-0128), `a809896` (AI-0129), `3858700` (AI-0130). Full incrementality and background maintenance stay open — see [AI Unresolved Questions](../product/ai-unresolved-questions.md). This describes sibling behavior only as read.

2. **Compression backend selection**: Who chooses the compression backend—user configuration, agent instruction, or Core heuristics based on provider capabilities?

3. **Artifact garbage collection**: When do `panel://`, `artifact://`, `file://` references expire? Is there a reference-counting GC, time-based expiry, or manual cleanup?

4. **Retention policy assignment**: Who assigns `pinned` / `recent` / `normal` / `ephemeral` retention—tool implementations, agent directives, or Core policy?

5. **Background maintenance performance**: Does continuous context maintenance block message processing, or run asynchronously with eventual consistency?

6. **Compaction reversibility**: Can a global compaction be undone if subsequent turns need context from the compacted range?

7. **Cross-session context**: How does the context view incorporate memory, user preferences, or cross-session facts stored outside the current session journal?

8. **MCP schema cache invalidation**: When an MCP server updates, how is the cached schema invalidated and refreshed?

9. **Skill format and compatibility**: What is the canonical Skill format? Is ecosystem compatibility (Claude Code, OpenCode, Agents skills) a requirement or aspiration?

10. **Task/CarryCtx integration**: Is the Task model independent of CarryCtx, or does CarryCtx provide Task persistence? Who owns task lifecycle—Core or CarryCtx?

11. **Security boundaries in context construction**: Can a malicious tool result inject instructions that manipulate context pruning, compression, or retention? Where is the trust boundary? Cross-reference Security Overview invariants 1-10, P0-AC-021 through P0-AC-026, and R-011/R-012/R-013 for existing baseline constraints; resolution requires security-reviewer evidence.

### Follow-up work

1. Independent review of this specification against existing `ai-architecture.md`.
2. Resolve unresolved questions through targeted RFCs or open-question register entries.
3. Define `CompactionBackend` trait and `ContextItem` schema in implementation specifications.
4. Specify artifact URI scheme and garbage collection policy.
5. Update `docs/README.md` navigation if this specification is accepted.
6. Synchronize with command/tool architecture specification (see companion synthesis of source lines 1-415).

## References

- [AI Architecture](../architecture/ai-architecture.md) (Draft): overlapping scope; reconciliation required
- [Command and tool architecture](../architecture/command-tool-architecture.md) (Draft): companion specification
