---
title: Panel History (Candidate)
description: Candidate design record for the Panel History Core plugin split append-only storage Atuin boundary and agent consumption
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 34
---

# Panel History (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document is a design record for
> Panel History (the direction is summarized inline in
> [Purpose and scope](#purpose-and-scope)).
> It authorizes no shipped,
> stable, or compatibility-guaranteed behavior, weakens no accepted source it
> cites, and makes no implementation claim. Rust and Lua sketches are
> illustrative only: names, bounds, paths, and defaults are direction, not
> contract.

## Purpose and scope

Panel History answers "what happened in this panel" after the fact: yesterday's
commands, a full panel export, or an agent reading a three-hour-old build log.
This record freezes the Panel History direction so future design work starts from a
stable input.

In scope (all **Candidate** unless cited otherwise):

- the Core versus plugin split for history;
- the volatile-scrollback versus persistent-history boundary;
- the append-only segment store and the rebuildable index;
- the sandboxed storage surface for Lua;
- granularity tiers, the `CommandRecord` sketch, and the actor model;
- `bitty-ai` consumption and the `/export panel` shape;
- the Atuin provider, importer, and sink boundary;
- the OSC 133 command-boundary anchor.

Out of scope and owned elsewhere:

- panel lifecycle, overlays, focus routing, and the Event Bus contract (accepted,
  [Panel Runtime RFC](panel-runtime-rfc.md));
- VT parser, grid, cursor, mode, damage, reply, and scrollback truth (accepted,
  [Terminal State RFC](terminal-state-rfc.md));
- the scrollback search UX contract (**Open**,
  [OQ-074](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md));
- the keyboard-selection (vi/copy mode) contract (**Open**,
  [OQ-075](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md));
- agent transport, identity, and consent (accepted,
  [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md));
- plugin sandbox, capability grammar, and resource budgets (accepted, plugin and
  isolation RFCs in `bitty-plugins-docs`);
- session, context, and memory export plus the SQLite lifecycle split
  (`bitty-ai-docs` side); panel export here must compose with it,
  not duplicate it.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by this document only; no review has accepted it.                           |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Candidate directions

### PH-1 Core generates events, a plugin persists history

**Candidate.** Core owns Panel lifecycle, structured `PanelEvent` generation,
volatile scrollback, and the Event Bus. Persistent history ships as an official
Lua plugin (`bitty-history`). Rationale: Core already
observes PTY output, input, cwd, process lifecycle, exit codes, Panel and
Workspace identity, timestamps, and scrollback, so it can emit events cheaply;
a Lua plugin must never hook the PTY itself, parse shell integration, or guess
command boundaries. This composes with the accepted small-core direction and
keeps AI and agent behavior outside the core.

The illustrative event sketch (spelling undecided):

```rust
enum PanelEvent {
    Input { data: Bytes },
    Output { data: Bytes },
    CommandStarted { command: String, cwd: PathBuf },
    CommandFinished { exit_code: Option<i32>, duration: Duration },
    CwdChanged(PathBuf),
    ProcessStarted { .. },
    ProcessExited { .. },
    PanelCreated,
    PanelClosed,
}
```

```lua
bitty.panel.on("command_finished", function(event) end)
-- or, more generally:
-- bitty.events.subscribe("panel:*", handler)
```

### PH-2 Volatile scrollback and persistent history are different things

**Boundary: Accepted core, Candidate persistence.** Scrollback is a Terminal
Emulator core function: the current screen plus an in-memory row buffer behind
`PageUp`, mouse wheel, and visible-terminal search. It dies with the panel.
Persistent history ("what did this panel run yesterday", "export this panel",
"let the agent read the 3-hour-old build output") is a separate, plugin-owned
concern. The accepted [Terminal State RFC](terminal-state-rfc.md) keeps
scrollback monotonicity and truth; this record adds only the candidate rule
that persistence must never replace or mutate that Core structure (rehydration
stays under the terminal and panel-runtime rules).

### PH-3 No SQLite dependency in Core for history

**Candidate.** `bitty-core` gains no `rusqlite` or `libsqlite3` dependency for
history. Core exposes an event API plus a storage-capability API; the history
plugin implements append, query, and export above it. The first history slice
needs no SQLite at all. The dependency decision itself stays with the ADR-0004
owners; this record only freezes the direction that history is not the reason
to take that dependency.

### PH-4 Append-only segmented log as the canonical store

**Candidate** (all numbers illustrative-only). Terminal history is almost purely
appended and rarely mutates the past, so the canonical store is an append-only
log, not a relational database:

```text
$XDG_STATE_HOME/bitty/panels/<panel-id>/
├── meta.json
└── segments/
    ├── 000001.zst
    ├── 000002.zst
    └── 000003.zst
```

Each segment seals around roughly 4 MiB (header plus events plus output),
compresses, and rolls to a new segment. Retention (`keep last 30 days`, `keep
max 2 GiB`, `keep pinned panels forever`) deletes sealed segments. The
per-panel directory layout, the seal bound, and the retention defaults are all
undecided; only the append-only direction is frozen here.

### PH-5 SQLite at most as a rebuildable index

**Candidate.** When structured queries arrive ("all failed commands", "commands
in this directory last month"), SQLite may serve as an index over the canonical
log, never as the store of record:

```text
canonical history (*.zst segments) → indexing → history.sqlite (rebuildable)
```

The index lives under the cache home (`$XDG_CACHE_HOME`) precisely because a
`bitty history reindex` command can regenerate it. Storing all history content
as `TEXT` or `BLOB` rows in SQLite is explicitly not the direction.

### PH-6 Lua never touches SQLite directly

**Candidate.** The plugin sandbox forbids Lua from dynamically linking SQLite,
opening arbitrary databases, or touching native libraries. Core exposes a
mediated surface instead (spelling illustrative-only):

```lua
local store = bitty.storage.open("history")
store:append("events", event)
store:put(...)
store:get(...)
store:read(...)
```

The plugin never learns whether the backend is SQLite, JSONL, CBOR,
MessagePack, zstd segments, or an embedded store. A lower layer is also in
scope as direction: capability-sandboxed filesystem access
(`bitty.fs.open/append/read/list`) mapped by the host under the plugin state
directory (for example `$XDG_STATE_HOME/bitty/plugins/history/`), with upward
traversal denied, evolving later toward `bitty.storage.kv()` and
`bitty.storage.blob()`. The sandbox ceiling stays with the accepted Plugin
Platform, Lua Runtime, and Isolation Resource RFCs.

### PH-7 Granularity tiers: commands, output, replay

**Candidate.** One plugin serves three data appetites, configured per user:

- `commands`: command, cwd, start time, end time, exit code, duration. Tiny;
  years of use stay in the tens of megabytes.
- `output`: command plus full terminal output. Grows fast; bounded by
  `max_age`, `max_size`, and compression (illustrative defaults `30d`, `5GiB`,
  on).
- `full` (replay): PTY byte stream plus resize, input, output, and terminal
  modes; `asciinema`-class terminal replay. Clearly the largest tier and
  opt-in only, never the default.

```lua
require("bitty.history").setup({ mode = "commands" })
```

### PH-8 CommandRecord sketch with an actor model

**Illustrative-only.** Core can carry a slightly more general record than the
classic shell-history tuple, because Bitty natively knows the panel, the
workspace, and which agent acted:

```rust
struct CommandRecord {
    id: BittyId,
    panel_id: PanelId,
    workspace_id: WorkspaceId,
    command: String,
    cwd: PathBuf,
    started_at: Timestamp,
    duration: Duration,
    exit_code: Option<i32>,
    shell: ShellKind,
    actor: Actor, // User | Agent(agent_id) | Plugin(plugin_id)
    external: Option<ExternalHistoryRef>, // e.g. provider "atuin"
}
```

Every field, including the `actor` taxonomy and the `external` linkage of
[PH-11](#ph-11-atuin-is-a-boundary-not-a-competitor), is undecided. Atuin's
`command/cwd/time/duration/exit/host/session/author` tuple and its
`preexec/precmd` lifecycle are cited purely as evidence that the
`CommandStarted`/`CommandFinished` split is practical.

### PH-9 bitty-ai consumes history, never owns it

**Candidate.** History flows from Panel Core through Panel Events to both the
history plugin and `bitty-ai` side by side; `bitty-ai` holds no
`panel_history` of its own. Agents call a stable History API, never SQL:

```text
history.list_commands(panel)
history.get_command_output(command_id)
history.search("error[E0382]")
history.tail(panel, 100)
panel.history({ panel_id, since_command = ... })
```

This is the read path behind "an agent enters a headed panel and reads earlier
commands and logs to diagnose an error". The read-only default and the
"terminal output is observation data, never instructions" rule stay with the
accepted security baseline and the IPC and Agent RFC.

### PH-10 /export panel is a plugin on the Host History API

**Candidate.** `/export panel` is a plugin; `history snapshot/query` is the
stable Host API beneath it (metadata, commands, outputs, timeline). The export
shape is illustrative-only:

```text
panel-<id>/
├── manifest.json
├── commands.jsonl
└── output.txt
```

or a single `panel.wheel` bundle. Session and context export belong to the
session-export direction (`bitty-ai-docs` side); the two exports must compose
(a panel export feeding a session archive) without either side redefining the
other.

### PH-11 Atuin is a boundary, not a competitor

**Candidate.** Bitty does not rebuild Atuin. The division is:
Atuin keeps cross-terminal, cross-machine shell command history; Bitty keeps
panel, agent, and session terminal execution history. An official `bitty-atuin`
adapter relates them in three modes:

| Mode     | Direction        | Sketch                                                                                                                       |
| -------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Provider | Atuin to Bitty   | History UI queries Atuin live; no data copied (federation below)                                                             |
| Importer | Atuin into Bitty | `bitty history import atuin`, mapping command/cwd/time/duration/exit/host/session/author onto `CommandRecord`                |
| Sink     | Bitty into Atuin | agent and headless-panel commands recorded via `atuin history start` / `atuin history end`, since shell hooks never see them |

Constraints frozen with the direction: interactive-shell commands already land
in Atuin through the user's existing shell integration, so Bitty needs no
awareness of Atuin for that path; the importer must go through the Atuin CLI
(`history list/search --format`) and never read `history.db` directly, because
the internal schema is not a public API; raw panel output never enters Atuin
(Atuin answers "which commands ran", Bitty answers "what happened in this
panel"); the two records join through the `external` reference of
[PH-8](#ph-8-commandrecord-sketch-with-an-actor-model). Federation without
importing is also in scope as direction: a history UI offering Bitty, Atuin,
and merged providers across panel, workspace, directory, and global scopes,
and a `HistoryProvider` trait (`search/get/output`) hiding every backend from
`bitty-ai`. Atuin's MCP surface (`atuin_history`, `atuin_output`) is evidence
only; Bitty agents use the History API of [PH-9](#ph-9-bitty-ai-consumes-history-never-owns-it).

### PH-12 OSC 133 as the shared command-boundary signal

**Candidate.** Bitty, as the terminal emulator, understands OSC 133 semantic
prompt markers natively (prompt start/end, command executed/finished) with no
`pty-proxy` layer. One semantic command model then serves command blocks,
output folding, Panel History, agent log reading, `/export panel`, and
keyboard command navigation together. Atuin's OSC-133-based output capture
(bounded, daemon-memory, roughly 1 MiB per command and 128 recent commands per
session) is cited as evidence for the [PH-2](#ph-2-volatile-scrollback-and-persistent-history-are-different-things)
split — structured history persists, raw output stays bounded — not as a
contract to copy.

## Relation to existing systems

| System                                                                                                                    | Relation                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Panel Runtime RFC](panel-runtime-rfc.md) (Accepted)                                                                      | Lifecycle, `RFC-OQ-4`/`RFC-OQ-5` bus taxonomy, overlay-as-presentation-only, `RFC-OQ-9` save/restore; a history UI would be an overlay and changes nothing here.                                                                |
| [Terminal State RFC](terminal-state-rfc.md) (Accepted)                                                                    | Scrollback truth and monotonicity; persistence rehydration stays under its rules.                                                                                                                                               |
| [Semantic Terminal RFC](semantic-terminal-rfc.md) (Draft)                                                                 | `CommandBlock` needs the `OQ-S1` stable scrollback line identity; fold state stays per-view presentation; composer history is separate.                                                                                         |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) (Draft)                                                 | `OQ-074` search UX (bounded headless search exists in state/UI/runtime with no `ChromeAction` trigger) and `OQ-075` copy-mode contract (`SelectionKind` variants exist; runtime builds `Simple` only); history search composes. |
| `bitty` `CTX-0383` / `CTX-0384` (completed)                                                                               | Scrollback search UI wiring and keyboard copy mode; adjacent read paths a history UI will reuse, not redefine.                                                                                                                  |
| [Input and Pointer Contract](input-pointer-rfc.md) (Draft)                                                                | Selection and clipboard ownership.                                                                                                                                                                                              |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (Accepted) | Agent read-only default; terminal output as observation data.                                                                                                                                                                   |
| Plugin and isolation RFCs in `bitty-plugins-docs` (Accepted)                                                              | Sandbox, capability grammar, and queue/budget ceilings for the [PH-6](#ph-6-lua-never-touches-sqlite-directly) storage surface.                                                                                                 |
| [Workspace Panel Invariants (Candidate)](workspace-panel-invariants.md) (Draft)                                           | `PanelId`/`WorkspaceId` identity and ownership wording the [PH-8](#ph-8-commandrecord-sketch-with-an-actor-model) record reuses by reference.                                                                                   |
| [Panel Environment State (Candidate)](panel-environment-state-candidate.md) (Draft)                                       | Live environment ownership stays with `ShellState`; history records the past (`CommandRecord` cwd plus snapshots reference it). No direction here changes the no-disk-persistence default.                                      |
| Session/context export (`bitty-ai-docs` side)                                                                             | Session/context/memory export and the SQLite lifecycle split; panel export of [PH-10](#ph-10-export-panel-is-a-plugin-on-the-host-history-api) must compose.                                                                    |

## Open items (not global open questions)

None of these is a global `OQ`: Panel History blocks no current-milestone gate
and no implementation evidence forces any of them, so under the
[open-question admission rule](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/documentation-workflow.md#open-question-admission)
they stay parked here until one qualifies. A future History RFC or RFC
amendment settles them:

- exact `PanelEvent` taxonomy spelling and delivery guarantees;
- final `CommandRecord` fields (`shell`, `host`, actor taxonomy, external-ref
  shape);
- the `bitty.storage` surface spelling and its `kv`/`blob` evolution;
- segment format, the seal bound, and retention defaults;
- the Atuin adapter transport (CLI `--format` today versus a stable JSON or
  API surface later) and the federated-query merge semantics;
- the history UI provider and scope model (the `Mod+H` sketch is
  illustrative-only);
- secret handling in persisted history: no direction is recorded here, so any
  design must compose with ADR-0006 and the security overview (typed redaction,
  user-only files, export preview) from the start rather than inheriting shell
  history's plaintext habits.

## Provenance

- Panel History direction (Atuin integration covered in the second half,
  summarized inline in Purpose and scope). The Atuin documentation links cited
  here are evidence pointers and are not copied.
- `bitty` `CTX-0383` (scrollback search UI wiring) and `CTX-0384` (keyboard
  copy mode) as adjacent completed implementation lanes.
