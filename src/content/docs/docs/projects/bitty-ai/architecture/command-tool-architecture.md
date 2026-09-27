---
title: Command and tool architecture
description: Slash command registry tool runtime separation and Core versus Lua boundary design
category: architecture
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 30
---

# Command and tool architecture

## Purpose and scope

This specification defines the architectural separation between slash commands, tool runtime, and Lua workflow orchestration in `bitty-ai`. The design distinguishes control-plane operations from data-plane tools and establishes clear Core versus Lua boundaries to prevent feature accumulation in Rust while enabling community extensibility.

**Draft relationship**: [AI Architecture](ai-architecture.md) Tool Bus (TB-1..TB-3). This elaboration selects no new transport or accepted mechanism.

## Core principle: mechanism versus policy

The foundational design constraint is:

> **Core implements mechanism; Lua implements policy and workflow.**

This principle appears in source lines 1278-1295 and governs all boundary decisions. Rust provides primitives; Lua decides how primitives compose into user experience. The separation mirrors Neovim's architecture (source lines 72-89) where core provides `buffer`, `window`, `extmark`, `LSP client`, and Tree-sitter, while Lua plugins deliver `telescope`, `lazy.nvim`, `flash.nvim`, and `dap-ui`.

## Three-layer distinction

The source distinguishes three layers (lines 4-10):

1. **Command** is the control plane: `/compact`, `/model`, `/context`, `/review`
2. **Tool** is the agent data plane: `read`, `edit`, `bash`, `lsp`, `task`
3. **Skill / Workflow** is composable behavior: review, plan, release, debug

Claude Code explicitly separates built-in commands controlling session state from complex multi-step commands recommended as Skills (source lines 11-12, citing [1]). OpenCode similarly treats `/compact` as built-in behavior while custom workflows like `/review` can be prompt templates with a child-agent flag (source lines 11-12, citing [2]). Where the cited harnesses say "subagent", this document records historical, external-harness terminology; the Wheel vocabulary is defined with the capability-enforced roles candidate in [AI Architecture](ai-architecture.md#capability-enforced-roles-and-child-agent-dispatch-candidate).

**Implementation consequence**: Bitty must not conflate command surface with tool invocation. A command may invoke Core primitives or orchestrate Lua workflows. A tool is a capability the model directly calls.

## Proposed architectural stack

Source lines 26-46 propose:

```text
                Slash Command Registry
                        │
         ┌──────────────┴──────────────┐
         │                             │
  Runtime Operations              Lua Workflows
    /compact                        /review
    /model                          /plan
    /clear                          /loop
    /fork                           /goal
         │                             │
         └──────────────┬──────────────┘
                        ▼
                 bitty-ai-core
                        │
    Session / Context / Tools / Agent / MCP
                        │
                        ▼
                   Bitty Core
               Panel / PTY / FS / UI
```

This is a **proposal** for Bitty, not a description of existing implementation. The source argues (lines 14-23) that this boundary prevents the pattern where every command becomes a Rust feature, contrasting it with a hypothetical anti-pattern where `/compact`, `/review`, `/plan`, `/loop` all live in Rust.

## Layer ownership proposal

Source lines 52-60 propose three distinct cores:

| Layer           | Responsibility                                                                     | Implementation |
| --------------- | ---------------------------------------------------------------------------------- | -------------- |
| `bitty-core`    | Panel, PTY, process, workspace, render, plugin host, logging                       | Rust           |
| `bitty-ai-core` | Agent loop, Session, Context, Tool runtime, Provider, MCP, permissions, Delegation | Rust           |
| `bitty-ai`      | `/review`, `/plan`, `/loop`, UI, default workflow                                  | Lua            |

The source argues (lines 61-70) that Bitty itself is not an AI Terminal but provides AI primitives. `bitty-ai-core` is an Agent Kernel; Lua decides how primitives compose into experience. This boundary allows `bitty-ai-core` to remain a mechanism layer (lines 92-112) offering `Agent`, `Context`, `Session`, `Tool`, `MCP`, `LSP`, `AST`, `Task`, while Lua plugins deliver `review`, `plan`, `loop`, `DCP`, `memory`, `statusline`, `agent-dashboard`.

**Disposition: improve.** The table preserves the recording's conceptual names, not a repository/crate assignment. Here **AI runtime Core** means reviewed Rust mechanisms owned by the independent `bitty-ai` runtime/helper, outside the terminal process. **Terminal Core** owns terminal state, PTY/process targets, generic host capabilities and presentation. BA-2/BA-3 keep `bitty-agent` free of model selection, model I/O and API keys; providers and context/tool loops remain in the separate AI helper. No native AI code is loaded into the terminal to implement this proposal. Exact generic execution-backend ownership and standalone composition need cross-repository review.

## Command classification and primitive mapping

Source lines 116-141 classify existing harness commands by their underlying primitive:

| Command             | Recommended attribution           | Core primitive       |
| ------------------- | --------------------------------- | -------------------- |
| `/compact`          | Hybrid: Lua command + Rust engine | `Context.compact()`  |
| `/context`          | Lua UI                            | `Context.inspect()`  |
| `/goal`             | Lua                               | pinned/session state |
| `/skills`           | Lua UI                            | `SkillRegistry`      |
| `/mcp`              | Lua UI                            | `McpManager`         |
| `/plugins`          | Lua UI                            | Plugin Registry      |
| `/review`           | Lua Skill / Workflow              | agent + diff + tools |
| `/plan`             | Lua Skill / Workflow              | delegation / mode    |
| `/task`             | Lua UI / Workflow                 | Task graph           |
| `/loop`             | Lua orchestrator                  | scheduler/events     |
| `/settings`         | Lua UI                            | config API           |
| `/statusline`       | Lua UI                            | observability API    |
| `/model`            | Hybrid                            | Provider runtime     |
| `/permissions`      | Hybrid                            | Permission Engine    |
| `/clear`            | thin built-in                     | Session              |
| `/new`              | thin built-in                     | Session              |
| `/fork`             | thin built-in                     | Session DAG          |
| `/resume`           | thin built-in                     | Session store        |
| `/undo` / `/rewind` | thin built-in                     | checkpoint/session   |
| `/help`             | Lua                               | CommandRegistry      |

**Owner-directed candidate additions (2026-09-20, unreviewed sketch):** the
owner direction separates session switching from session resumption and adds
an independent agent-control family, recorded here as candidate rows for
owner review. They propose no accepted registry entry:

| Command (illustrative-only)       | Recommended attribution   | Core primitive        |
| --------------------------------- | ------------------------- | --------------------- |
| `/session` (list, switch, new)    | thin built-in             | Session store         |
| agent control (pause/stop/resume) | thin built-in via CLI/IPC | supervisor primitives |
| `/resume`                         | deliberately undesigned   | -                     |

The recording table above lists `/resume` as a session-store command;
that earlier attribution is superseded by this direction. The direction
records that `/session` switches the active session while
previously running agents keep running, that `/resume` should not be defined
as a synonym of `/session` (it stays undesigned until given a distinct
meaning), and that interrupting or restarting agents belongs to its own
command family rather than to session switching. Candidate semantics stay
with [Session model (candidate)](../specifications/session-model-candidate.md);
no command spelling, flag, or registry entry is proposed here.

**Key insight** (lines 143-150): `/compact` is not a Lua algorithm; it is Lua calling a Rust Context primitive. But `/review` does not require Core to understand "Code Review"; it can be a Lua workflow (example lines 152-164) that spawns an agent with a skill, git diff, and workspace context.

The source argues (lines 165-176) this enables community extension without touching Rust: `/review/security`, `/review/performance`, `/review/api`, `/review/rust` become Lua plugins. This justifies the `bitty-plugins` design mentioned in the broader Bitty workspace model.

## What must not enter Core

Source lines 181-240 argue that `/plan`, `/review`, `/goal` must not become Core features. The example contrasts `/compact`, which changes `Session → Context representation`, with `/review`, which is a multi-step workflow: collect diff, load review instructions, run agent, dispatch child agents, render result (lines 188-217).

Core should provide:

```text
session
context
task
agent
tool
diff
git?
skill
artifact
```

Core should **not** provide (lines 235-258):

```rust
PlanModeManager
CodeReviewManager
LoopModeManager
```

The rationale is preventing `bitty-ai-core` from becoming a giant harness over years of feature accumulation (line 260).

**Draft interpretation**: This is a design recommendation. Performance evidence may justify reviewed AI runtime mechanism changes, but never relocation of AI into the terminal or bypass of normative security boundaries.

## Tool runtime: what belongs in Core

Source lines 264-295 propose the opposite boundary for tools. The argument is that tools the model calls—the agent data plane—should be built-in Core capabilities where feasible. The source observes oh-my-pi provides extensive built-in tools: `read`, `write`, `edit`, `ast_grep`, `ast_edit`, `grep`, `glob`, `bash`, `lsp`, `debug`, `task`, `todo`, `browser`, `web_search` (lines 267-269, citing [4]).

Proposed tool classification (lines 271-295), with `Core` meaning AI runtime mechanism ownership rather than ambient access or mandatory terminal-process placement:

| Tool                   | Recommended attribution |
| ---------------------- | ----------------------- |
| `read`                 | Core                    |
| `write`                | Core                    |
| `edit`                 | Core                    |
| `grep`                 | Core                    |
| `glob`                 | Core                    |
| `symbols` / AST read   | **Core**                |
| `ast_query`            | Core                    |
| `exec`                 | **Core**                |
| `lsp`                  | **Core**                |
| `task` / `spawn_agent` | Core                    |
| `ask_user`             | Core                    |
| `skill`                | Core                    |
| MCP tool bridge        | Core                    |
| Git high-level tool    | official plugin         |
| GitHub                 | MCP/plugin              |
| Browser                | optional plugin         |
| Web Search             | optional plugin         |
| Computer Use           | optional plugin         |
| Jira/Slack/Notion      | MCP                     |
| Memory backend         | plugin/backend          |
| Review                 | not Tool, is Workflow   |
| Plan                   | not Tool, is Workflow   |

The source emphasizes (lines 297-313) that Tree-sitter, AST, LSP, and structured code reading must be first-class `bitty-ai-core` capabilities because they define the fundamental way agents obtain code information, not a specific workflow.

**Disposition: unresolved native/MCP transport choice.** The source favors native tools while AI Architecture TB-1 currently proposes MCP transport and rejects direct process/filesystem spools. Native implementation is not a bypass channel: both native and MCP calls require the same authenticated principal, captured target/generation, schema/effect validation, least-privilege scopes, current consent, budgets, redaction and attributed outcomes. Terminal-owned effects stay behind its host boundary. AI runtime local tools, if selected, need an equivalent reviewed execution backend; a filename or spool never authorizes an effect. Selecting native dispatch versus MCP routing remains AIQ-36/AIQ-38, not an accepted change here.

## Exec and Panel integration advantage

Source lines 315-414 propose that `exec` in Bitty should leverage native Panel infrastructure, offering a structural advantage over traditional harnesses. Traditional harness flow (lines 320-329):

```text
bash tool
   ↓
spawn process
   ↓
stdout
   ↓
tool result
```

The recording's mandatory Headless Panel flow (lines 332-342) is **rejected as an ownership model**. The reconciled candidate is:

```text
agent.exec()
    ↓
authorized ExecutionContext / captured target
    ↓
supervised structured process, or PTY when required
    ↓
bounded redacted execution evidence
    ↓
structured result

optional Panel → projection of execution/evidence
```

Improve the source's lines 347-413: an agent acquires an authorized execution target, not ownership through panel occupancy. A structured build needs neither shell nor panel. The supervising backend owns process/PTY handles and cleanup; a Panel may later display its state. Results carry bounded summaries, failures, truncation and evidence references. A reference permits retrieval only after reader authorization and only while redacted records remain retained. Durable logs require recording consent; a Panel Timeline is not an unconditional raw-log archive.

**Structured exec-outcome evidence (experimental, runtime/slice-side outcome vocabulary only):** the sibling `bitty-ai` runtime records every dispatch as `ToolExecution` (`ToolStatus::{Success, Failed, Denied, Refused, Unknown}` with admission-only `Refused { cause: ToolError }` separated from executor-after-contact `Denied`, plus `ResultDisposition::{Accepted, Rejected}` and normalized typed `ToolError`) with counted truncation accounting, and the slice asserts shared `ExecutionResult` / `Unknown` / truncation semantics on both hosts; merged in `bitty-ai` `3f364db` (AI-0077), `201cfe9` (AI-0109), `01919b8` (AI-0112). The wire/IPC schema with the terminal side stays open — see [AI Unresolved Questions](../product/ai-unresolved-questions.md). This describes sibling behavior only as read.

The source argues (lines 376-414) this is stronger than traditional `bash` Tool because it naturally integrates with the Panel lifecycle design where Panel lifetime is independent of Agent lifetime, already discussed in broader Bitty architecture.

**Status**: Optional projection is a draft integration with the accepted Panel lifecycle, not a replacement state machine. [Agent coordination](../agent/agent-coordination.md#panel-model-reconciliation) retains `Agent -> ExecutionContext <- Panel`; no-panel execution does not imply a persistent terminal daemon or new transport authority.

Cancellation before dispatch prevents any tool effect from starting, and incomplete streamed tool arguments are never dispatched. Cancellation after dispatch stops further admission and requests bounded cancellation of owned work; already-started effects may have happened. Report actual outcomes or `Unknown` and reconcile before retry, rather than promising rollback or exactly-once effects. Cancellation of one waiter does not cancel shared execution still required by another authorized waiter (AI Architecture MP-7 and agent-coordination supervision).

## Design rationale summary

The source's core argument (synthesized from lines 4-260, 1278-1295, 1299-1357) is that Bitty's competitive differentiation is not slash command count—those will homogenize across harnesses—but rather a foundational architectural choice:

> **Traditional harnesses**: Continuously produce text → Context too large → Compress text.
>
> **Bitty opportunity**: From the start, do not equate the raw world with Context.

The recording's source separation (lines 1318-1356) motivates a temporary semantic projection. Reconciled command evidence belongs to an authorized execution store, optionally shown by a Panel; filesystem reads, code structure, tasks and artifacts remain scoped sources with independent retention. No source is automatically copied in full or persisted.

This abstraction unifies Panel, headless agent workspace, Tree-sitter, LSP sharing, log folding, and Agent Dashboard into a coherent system where context management is not post-hoc compression but deliberate semantic construction.

The mechanism/policy split ensures `bitty-ai-core` remains a stable, reviewable kernel while community workflows and product features iterate in Lua without Rust churn.

## Verification plan

This specification records the candidate direction and comparative harness observations. It does **not** describe implemented Bitty behavior. Verification requires:

- Accepted architectural decision records in `bitty-docs` for Core/Lua separation
- `bitty-ai-core` Rust trait definitions for `Context`, `Session`, `Tool`, `Agent`, `MCP`
- Lua API reference for command registration, agent spawning, and primitive invocation
- Cross-repository IPC contract between `bitty-core` and `bitty-ai-core`

Read-only inspection on 2026-09-14 found `bitty-ai` at `3623c6b3ce33e97c1c493109ec6356219d0c9722`: `crates/bitty-ai-slice/src/session.rs:68-136` contains provider completion, conditional bounded context, optional tool dispatch and fragment emission. This experimental slice does not establish the complete proposed command registry, context-first continuation, store/replay or supervised execution architecture. See [current evidence](../specifications/ai-runtime-boundaries-candidate.md#current-bitty-ai-evidence).

## Open points

1. **Core vs. Lua boundary enforcement**: How is the mechanism/policy separation validated at build time or reviewed at PR time? Is there a linting rule, a trait boundary, or manual review?

2. **Performance escape hatch**: If a Lua workflow (`/review`, `/plan`, `/loop`) proves too slow or cannot meet a security gate, what is the process for promoting it to Core? Does that promotion require an RFC and security review?

3. **Tool security enforcement mechanism**: Which reviewed backend enforces the already-required per-action capability, target, consent, isolation and budget checks for native and MCP tools? Core implementation grants callers no direct filesystem/process/network authority. Security Overview invariants 1-10 and P0-AC-021 through P0-AC-026 remain mandatory; implementation evidence requires independent security review.

4. **Plugin ecosystem contract**: How do Lua plugins register commands into the Slash Command Registry? What versioning and compatibility guarantees exist? Where is the plugin API specified?

5. **Git primitive placement**: The table (lines 287) lists "Git high-level tool" as "official plugin" but does not specify which Git operations are Core primitives versus plugin wrappers. Does Core provide raw `git` exec access, libgit2 bindings, or a structured Git API?

6. **MCP tool bridge scope**: The table lists "MCP tool bridge" as Core. Does this mean Core translates MCP JSON-RPC into Bitty tool calls, or does it mean Core provides the MCP client runtime and Lua registers MCP tools into the Tool Bus?

7. **`exec` structured result contract**: What schema defines the "structured result" returned by `agent.exec()`? Is it a Rust type, a JSON shape, or a provider-specific envelope? Where is it specified?

8. **Cross-repository boundary**: `bitty-core` and `bitty-ai-core` are proposed as distinct layers, but `bitty-terminal-docs` and `bitty-ai-docs` are separate documentation repositories. Who owns the IPC contract between them? Is there a single authoritative specification, or do both repositories maintain synchronized views?

### Follow-up work

1. Independent review of this specification against existing `ai-architecture.md`.
2. Cross-reference with `bitty-terminal-docs` Panel specifications and IPC contracts.
3. Resolve unresolved questions through targeted RFCs or open-question register entries.
4. Update `docs/README.md` navigation if this specification is accepted.
5. Synchronize with context management specification (source lines 416-1358 and reference definitions 1360-1367).

## References

- [AI Architecture](ai-architecture.md) (Draft): overlapping scope; reconciliation required
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): Panel lifecycle and IPC contracts
