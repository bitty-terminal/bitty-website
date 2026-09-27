---
title: Event-Sourced Panel Model (Candidate)
description: Draft candidate direction for headless panel separation an immutable event log structured storage decoupled folding and context GC retention on the terminal surface
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 36
---

# Event-Sourced Panel Model (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document is a design record for the
> terminal-side slice of an event-sourced agent workspace: the part the Bitty
> terminal platform would own if the direction were ever accepted. It
> authorizes no shipped, stable, or compatibility-guaranteed behavior, weakens
> no accepted source it cites, and makes no implementation claim. Names, bounds,
> event spellings, and defaults repeated here are direction, not contract.

## Purpose and scope

The event-sourced workspace direction treats agents as actors that work only in
headless panels, an immutable event log as the record of facts, context
compiled from facts into a programmable versioned graph, and agent
collaboration over a communication graph with Git-like operations. This
document freezes only the **terminal-side** slice — the part the Bitty terminal
platform would own if the direction were ever accepted — so future design work
starts from a stable input.

The six-object split (Agent, Panel, Event, Context, Task, Artifact) and its
founding inequalities (Agent is not Panel, Panel is not Context, Context is not
History, Task is not Agent) frame everything below: panels may sit agentless,
panel history is not model context, and an agent is mobile across panels rather
than bound to one. The guiding principle is carried as direction: history is
immutable, context is programmable, panels are workspaces, and agents are
actors.

In scope (all **Candidate** unless cited otherwise):

- T-1: Headed-versus-Headless panel separation, the headless-only agent rule,
  and the fork-instead-of-entering discipline.
- T-2: Panel history as an immutable Event Log, including the candidate event
  vocabulary and the per-tool-run record shape.
- T-3: Structured storage layers for the terminal surface (index versus object
  store versus interchange formats) and the terminal-owned prefix of the output
  pipeline.
- T-4: Output folding as two decoupled concepts — UI collapse versus context
  materialization — plus the running-task display and on-demand inspect
  direction.
- T-5: Context GC implications for the terminal surface (retention without
  rewriting history).

Out of scope and owned elsewhere (pointers, not content):

- agent team graph, dynamic roles, and the communication-versus-dependency
  graph split (direction, `bitty-ai-docs` owner);
- mailbox IPC, lazy ContextBundles, Knowledge versus Task versus Workspace
  merges, and context diff (direction, `bitty-ai-docs` owner);
- context manifest, context tree, context compiler, and GC operations
  (direction, `bitty-ai-docs` owner);
- Git-like primitives on versionable context (checkpoint, fork, share, diff,
  squash, merge spellings) and task-as-issue semantics (direction,
  `bitty-ai-docs` owner; terminal projection of inspect and fork-snapshot only
  is T-1 and T-4 here);
- Batch plus DAG multi-tool orchestration detail (direction, `bitty-ai-docs`
  owner; progress-UI suitability only is noted in T-4);
- panel lifecycle, overlays, focus routing, and the Event Bus contract
  (accepted, [Panel Runtime RFC](panel-runtime-rfc.md));
- VT parser, grid, cursor, mode, damage, reply, and scrollback truth
  (accepted, [Terminal State RFC](terminal-state-rfc.md));
- Core-versus-plugin ownership and P0 gates (accepted,
  [Core and Plugin Boundaries](../architecture/core-boundaries.md));
- agent transport, identity, consent, and the read-only default (accepted,
  [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md));
- shared governance, decision, and security corpora (linked, never copied,
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs)).

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## T-1 Headed-versus-Headless separation (Candidate)

**Candidate.** Agents work only in headless panels. Headed panels are
human-owned (agent read and observe only); headless panels are agent-owned
(read, write, execute); shared headless panels gate on lease or capability;
detached panels keep history only. Touching user work means forking an
execution snapshot — working directory, worktree, environment, recent commands,
outputs, context references — never typing into the user's panel.

Terminal-side conclusions:

- Agent is not Panel: an agent is a thinking actor that moves across panels,
  and a panel is an execution environment that may sit agentless. Panel
  identity, ownership, and lifecycle stay with the terminal platform under the
  accepted [Panel Runtime RFC](panel-runtime-rfc.md); agent attachment,
  detachment, and replacement stay with the AI owner (owner-pending,
  `bitty-ai-docs`).
- The fork-instead-of-entering rule is a terminal-surface guarantee: the host
  must offer a snapshot fork path so agents never need keystroke access to a
  headed panel. Snapshot contents (working directory, worktree, environment,
  recent commands, outputs, context references) are carried as an
  illustrative-only field list; the exact snapshot shape and its composition
  with the
  [Panel Environment State (Candidate)](panel-environment-state-candidate.md)
  inheritance direction are undecided.
- Tool calls detach from terminal input: agents call a Wheel tool runtime under
  policy, capability, and resource control instead of sending keystrokes to a
  PTY; keystroke injection stays a user-interaction API. The tool-runtime
  surface itself is owner-pending (`bitty-ai-docs`); the terminal side owns
  only the guarantee that agent execution never depends on driving a headed
  PTY.
- Each tool call carries a durable `reason` — a commit message stating what the
  action exists to verify, the expected outcome, and links — not a thinking
  dump; internal thinking stays ephemeral and out of long-term history. The
  `reason` field spelling and its place in the event record (T-2) are
  undecided.
- Lease and capability gating for shared headless panels composes with the
  panel write-lease direction recorded in
  [Terminal Platform Boundaries (Candidate)](terminal-platform-boundaries-candidate.md),
  which stays the authoritative terminal-side wording for lease semantics; this
  document adds no second lease definition.

## T-2 Panel history as immutable Event Log (Candidate)

**Candidate.** Panel history becomes an immutable Event Log instead of a chat
log. The candidate event vocabulary, carried with illustrative-only spellings,
is `task.created`, `agent.attached`, `tool.started`, `tool.progress`,
`tool.finished`, `artifact.created`, `decision.recorded`, `context.shared`,
`agent.message`, and `checkpoint.created`.

Terminal-side conclusions:

- Each tool run records input, reason, status, duration, and a structured
  summary plus blob references, so raw output stays out of normal model
  context. The record field list is direction, not schema; a future History RFC
  or RFC amendment settles exact fields.
- Immutability is the hard rule: Git-like operations (fork, merge, rebase,
  cherry-pick, squash, diff, stash, tag, reflog, GC analogues) apply to
  versionable context, never by rewriting the immutable event log. Squash and
  checkpoint compression keep provenance and stay expandable. The operation
  spellings and their context-graph semantics are owner-pending
  (`bitty-ai-docs`); the terminal side owns only the append-only guarantee on
  its history store.
- This direction aligns with the
  [Panel History (Candidate)](panel-history-candidate.md) append-only segmented
  log (PH-4): the past is appended, never mutated. This event vocabulary is a
  new candidate input to a future History RFC, not a replacement of PH-1
  through PH-12, and the reconciliation of the two vocabularies (panel events
  versus workspace events) is an open item below.

## T-3 Structured storage layers (Candidate)

**Candidate.** Storage is hybrid: SQLite as the index and metadata database
(queryable events, tasks, messages, relations, full-text search) plus a
content-addressed object store (hash-addressed, compressed) for outputs,
patches, and snapshots, with JSON and JSONL reserved for export, debug, and
interchange.

Terminal-side conclusions:

- The division of labor is index versus bytes: structured queries run against
  the index; outputs, patches, and snapshots live as addressed objects; export
  and debug formats stay human-readable interchange rather than stores of
  record.
- The terminal-owned prefix of the output pipeline is Raw Output, Blob Store,
  Structured Parser, and Result Summary: tens of kilobytes of logs shrink to
  tens of tokens of findings before anything reaches model context, and stable
  hashed context blocks keep prompt caching friendly. The Context Compiler and
  LLM stages, and therefore cache-planning policy, are owner-pending
  (`bitty-ai-docs`); the terminal side contributes stable references and
  summaries, not compiler decisions.
- Open reconciliation, decided nowhere in this document: the
  [Panel History (Candidate)](panel-history-candidate.md) freezes a narrower
  direction (no SQLite dependency in Core for history, PH-3; SQLite at most as
  a rebuildable index under the cache home, PH-5; canonical store as compressed
  segments, PH-4), while this direction assigns SQLite a wider index role
  covering tasks and messages. Both directions cannot be true of the same
  store without an owning RFC reconciling them; this document chooses neither
  and parks the conflict in the open items.

## T-4 Output folding: UI collapse versus context materialization (Candidate)

**Candidate.** Running tasks expose only status, elapsed time, and parsed
progress; full logs load on demand via inspect (tail, errors-only, ranges). UI
collapse (whether the user expands logs) and context materialization (whether
logs enter LLM context) are separate concepts that must never be coupled.

Terminal-side conclusions:

- The running-task display contract is minimal by default: status, elapsed
  time, parsed progress. Everything else is on-demand inspect with bounded
  selectors (tail, errors-only, ranges). Inspect spellings and selector bounds
  are undecided.
- The never-couple rule is the load-bearing constraint: expanding a log in the
  UI must not pull that log into model context, and materializing log content
  into context must not change what the user sees. Either coupling direction
  is a defect against this candidate, not a tuning choice.
- This composes with, and redefines nothing in, the
  [Semantic Terminal RFC](semantic-terminal-rfc.md): `CommandBlock` anchors
  (P1) gate folding (P2), fold state stays per-view presentation, expanding a
  fold loses no data, and copy, search, and agent reads operate on the unfolded
  truth. The inspect direction is a future consumer of those anchors, not a
  second folding mechanism.
- Multi-tool Batch plus DAG invocation (sequential, parallel, dependency,
  conditional, retry, timeout, cancel, each node carrying status, duration,
  reason, result, resources, dependencies) is owner-pending orchestration
  (`bitty-ai-docs`); the terminal-side note is only that per-node
  status-plus-duration suits progress UI, which is why the direction also
  suits the running-task display above.

## T-5 Context GC implications for the terminal surface (Candidate)

**Candidate.** Context GC assigns Hot, Warm, and Cold lifetimes so that model
context and persistent history diverge by design. The GC policy and its
operations are owner-pending (`bitty-ai-docs`); this section records only what
that divergence requires of the terminal surface.

Terminal-side implications:

- The event log is immutable until GC: expiry removes, it never rewrites.
  Retention handling on the terminal side must therefore be tombstone or
  segment expiry (plus provenance-preserving compression), never in-place
  edits of recorded facts.
- Model-context membership must never decide persistence: a fact leaving the
  Hot set (or any compiled view dropping it) says nothing about whether the
  terminal history store keeps it. Storage lifetimes and context lifetimes are
  governed separately, even when they share Hot, Warm, and Cold names.
- Retention defaults, lifetime thresholds, and the GC trigger surface are all
  undecided. The retention sketches in the
  [Panel History (Candidate)](panel-history-candidate.md) (illustrative-only
  age, size, and pinning bounds) are not adopted here and must not be read as
  defaults for this direction.

## Owner-pending pointers (bitty-ai-docs)

The following conclusions belong to the AI documentation owner and appear
here only so readers know exactly what was set aside:

- the agent team as a cyclic communication graph of uniform agents with dynamic
  per-task roles (leader, worker, reviewer as roles, never agent classes),
  kept distinct from the Task dependency graph, which stays a DAG;
- typed agent mailboxes (request, thread, task, content plus context base and
  references) and lazy ContextBundles (summary first, expandable decisions,
  checkpoints, artifacts);
- the context manifest (system, project, task, pinned knowledge, decisions,
  recent events, imported contexts, artifact references, open questions) with
  parent lineage, organized as a selectable tree, and the token-budgeted
  materialized view compiled from it;
- Git-operation analogues on versionable context, Knowledge versus Task versus
  Workspace merge kinds, and context diff over decisions, artifacts, files,
  facts, questions, and task state;
- tasks as Issue-like durable objects (status, owner, collaborators,
  dependencies, context, artifacts, progress, blockers) claimable by any
  replacement agent, and the company-console dashboard remainder (ask, pause,
  cancel, fork, message, handoff, diff, merge) beyond the T-4 inspect
  projection owned here.

Accepted transport, identity, and consent rules for any of the above stay with
the [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md);
direction-level context and orchestration design stays with the AI owner.

## Relation to existing systems

| System                                                                                                                                      | Relation                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Panel Runtime RFC](panel-runtime-rfc.md) (Accepted)                                                                                        | Panel identity, lifecycle, generation, and capability isolation; agent attachment and headless execution add nothing here.                                                         |
| [Terminal State RFC](terminal-state-rfc.md) (Accepted)                                                                                      | Scrollback truth and monotonicity; the Event Log is a separate persistent record and never replaces or mutates Core scrollback.                                                    |
| [Core and Plugin Boundaries](../architecture/core-boundaries.md) (Accepted)                                                                 | Small-core direction; history persistence and agent behavior stay outside Core.                                                                                                    |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (Accepted)                   | Agent read-only default; terminal output as observation data; transport, identity, and consent for the owner-pending halves.                                                       |
| [Semantic Terminal RFC](semantic-terminal-rfc.md) (Draft)                                                                                   | `CommandBlock` anchors gate folding; fold state stays per-view presentation; T-4 inspect is a future consumer of those anchors.                                                    |
| [Panel History (Candidate)](panel-history-candidate.md) (Draft)                                                                             | PH-4 append-only direction aligns with T-2; PH-3 and PH-5 storage bounds conflict with the T-3 SQLite index role and await owner reconciliation; vocabulary merge is an open item. |
| [Panel Environment State (Candidate)](panel-environment-state-candidate.md) (Draft)                                                         | Live environment ownership stays with `ShellState`; the T-1 fork snapshot references it and decides no new environment contract.                                                   |
| [Workspace Panel Invariants (Candidate)](workspace-panel-invariants.md) (Draft)                                                             | `PanelId` and ownership wording the T-1 snapshot discipline reuses by reference.                                                                                                   |
| [Terminal Platform Boundaries (Candidate)](terminal-platform-boundaries-candidate.md) (Draft)                                               | Panel write-lease semantics stay defined there; execution-supervisor, host-ceiling, and UI-boundary slices are siblings, not inputs.                                               |
| [AI Architecture](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/architecture/ai-architecture.md) (Draft, `bitty-ai-docs` owner) | Owner-pending destination for the agent-graph, mailbox, context-compiler, and orchestration pointers above.                                                                        |

## Open items (not global open questions)

None of these is a global `OQ`: this document proposes no new contract boundary
and blocks no current-milestone gate, so under the
[open-question admission rule](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/documentation-workflow.md#open-question-admission)
they stay parked here until one qualifies. A future History RFC, storage RFC,
or RFC amendment settles them:

- owner approval of each Candidate slice (T-1 through T-5), reconciled against
  the accepted terminal, agent-authority, service, and lifecycle contracts
  rather than copied as normative APIs;
- the candidate event vocabulary spelling and the per-tool-run record fields
  (including the `reason` shape), reconciled with the Panel History PH-1
  through PH-12 vocabulary;
- the storage-layer reconciliation between the T-3 SQLite index role and the
  Panel History PH-3 and PH-5 bounds (no SQLite in Core; index rebuildable
  under the cache home);
- whether the proposed primitive spellings (checkpoint, fork, share, diff,
  squash, merge) become the accepted vocabulary, and how the
  communication-versus-dependency graph split is enforced (AI owner);
- the inspect selector spellings and bounds (tail, errors-only, ranges) and
  the running-task display contract that owns them;
- GC lifetimes, thresholds, and triggers, and the terminal retention defaults
  that compose with them without adopting model-context policy;
- the fork-snapshot field list and its composition with Panel Environment
  State inheritance and ShellState ownership.
