---
title: Storage memory and export design
description: Draft bitty-ai storage memory and export design derived from the candidate direction
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 47
---

# Storage memory and export design

> Status: **draft**. This document records the candidate direction
> into the draft `bitty-ai`-side storage, memory, and export design:
> per-session SQLite with a global catalog control plane, a content-addressed
> object store, an event-oriented session model, context recipes, memory tiers,
> export semantics, a Core storage API with Lua frontends, a stable interchange
> format direction, a hot/closed/archived lifecycle, mark-and-sweep collection
> direction, and the `.wheel` project-identity link. It proposes no accepted
> architecture, authorizes no shipped behavior, closes no Artificial
> Intelligence Question entry, introduces no new identifier, and contains no
> product code. Normative security and IPC obligations override any
> experimental adoption stated here. `bitty`-side material below is handoff
> input, not a decision: the `bitty` terminal repository decides acceptance,
> sequencing, and mechanism through its own review.

## Purpose and scope

This design covers only what `bitty-ai` Core owns as storage direction:

- What `bitty-ai` Core owns as proposal: the shard shape in
  [Shard design](#shard-design-catalog-per-session-store-and-objects) through
  the identity link in [Project identity link](#project-identity-link).
- What `bitty-ai` Core does not own: XDG directory placement, panel segment
  files, storage CLI verbs, and `.wheel/project.toml` ownership, which are
  `bitty`-side handoff items recorded in
  [Bitty-side handoff, not a decision](#bitty-side-handoff-not-a-decision).
- What is explicitly out of scope here: exact SQL schemas, transaction
  boundaries, hash-function selection, compression tuning, wire protocols,
  secret-store design, panel presentation, and plugin-registry mechanics.

Inputs are the candidate direction, the R6 disposition in
[Persistence profile R6](../architecture/persistence-profile-r6.md), the R3 disposition in
[Context retention R3](../architecture/context-retention-r3.md), the dimension split in
[Persistence and evidence architecture](persistence-evidence.md), PP-2 (Typed
redaction) and PP-4 (No on-disk persistence without consent) under
[Privacy-first](../architecture/ai-architecture.md#privacy-first) in
[AI Architecture](../architecture/ai-architecture.md), the narrow scope gate in
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md), the register in
[AI Unresolved Questions](../product/ai-unresolved-questions.md), and the accepted
[IPC and Agent RFC](../specifications/ipc-agent-rfc.md) as overriding authority. This document is the English-language candidate summary and
stands alone.

No product code is introduced or described as implemented. Rust, SQL, and Lua
sketches below are illustrative proposal shapes, not configuration contracts
and not implementation claims.

## Shard design: catalog, per-session store, and objects

The proposal rejects one global database holding sessions, messages, tool
calls, memory, panel history, artifacts, embeddings, and logs with unrelated
lifetimes. The draft direction instead shards storage by session:

```text
catalog.sqlite (small, control plane)
  |-- Session A session.sqlite
  |-- Session B session.sqlite
  `-- Session C session.sqlite
        |
        v
object store (tool output, files, images, attachments)
```

The global catalog records only control-plane fields:
session identifier, title, project identifier, creation and update timestamps,
status, model, provider, summary, size, pin and archive markers, and the
storage path. It never holds complete messages or tool output. The candidate
direction observes that a catalog of tens of thousands of sessions can stay in
the tens-of-megabytes range; that sizing is an unmeasured observation, not a
verified claim (see [Critical judgments](#critical-judgments)).

**Critical judgment:** the catalog-fields list and the per-session-shard shape
are proposals, not accepted contracts. SQLite itself is a draft candidate
only: R6 names SQLite as the transactional-store candidate without selecting
it as a dependency, and AIQ-51 (Schema and transaction boundaries) plus AIQ-53
(Backend and optional search index) stay open. Any catalog field that could
carry secrets (titles, summaries) inherits the R3 floor: consented,
redacted-before-write, minimized, user-only storage with export preview
(see [Consistency](#consistency-with-r3-r6-and-the-evidence-split)).

## Event-oriented session model

Each session directory holds a manifest plus one session database:

```text
sessions/2026/09/<session-id>/
  manifest.json
  session.sqlite
```

The proposed session tables are session, events, messages, agents,
tool calls, context snapshots, summaries, artifact references, object
references, panel references, and memory references. The load-bearing proposal
is the event orientation: because panel lifetime, agent lifetime, and session
lifetime are decoupled, panels, agents, and sessions are not forced into one
rigid tree. The source-record event shape carries an event identifier,
sequence number, timestamp, session identifier, optional agent and panel
identifiers, a type, a payload reference, and an optional parent event. The
source-record type vocabulary is user message, agent message, agent tool call,
agent tool result, agent context compaction, agent checkpoint, panel command,
panel working-directory change, panel process exit, artifact creation, and
memory creation.

**Critical judgment:** the table list, event fields, and type vocabulary are
proposals, not accepted contracts. They refine the ordered journal
representation dimension without selecting it: AIQ-51 stays open for the exact
representation and transaction boundaries, and the replay contract stays with
the R6 disposition (replay rebuilds supported state only, never re-executes
effects). The lifetime-decoupling observation connects to AIQ-10 (Task
lifecycle authority and CarryCtx backend/handoff) as a facet: lifecycle
authority questions stay open and are not decided here.

## Context recipes, not context copies

The proposal observes that storing a full context per turn repeats mostly
identical bytes, and instead records a context snapshot as a recipe: named
slots (system prompt, core prompt, skills, messages, summary, tool schema,
project context) holding object references and event pointers rather than
bytes. A later reader materializes the full context from the recipe plus the
object store plus session events, for debugging or for agent export. The same
composition makes decision provenance natural: which system prompt, skills,
files, summaries, and compaction boundary produced a given agent decision is
answerable from retained references.

**Critical judgment:** recipes are a proposal, not an accepted contract. A
recipe that references deleted, expired, or never-recorded bytes resolves to
typed unavailable markers under the R3 floor; a summary cannot recreate
omitted bytes or certify original tool outcomes (AIQ-57 facet, see
[Open points](#open-points)). Recipe materialization is
a read path over surviving authorized records, consistent with the R6 replay
contract, and never a permission to rerun tools.

## Memory tiers and derived indexes

The proposal separates three canonical tiers from one derived tier:

| Tier           | Proposed home                       | Holds                                                       |
| -------------- | ----------------------------------- | ----------------------------------------------------------- |
| Session memory | session database                    | Task-episodic notes, for example a failed-approach record   |
| Project memory | memory store per project identifier | Project conventions, for example language edition and stack |
| Global memory  | global memory store                 | Long-lived harness preferences across projects              |
| Derived index  | cache directory, rebuildable        | Embeddings and search indexes over canonical memory         |

The load-bearing rule is that memory is canonical data while embeddings are a
derived representation: a lost embedding index is rebuilt from memory with an
index-rebuild operation, so a multi-gigabyte derived index never joins the
backup set.

**Critical judgment:** tier names and store shapes are proposals. Cross-tier
retrieval stays under consent, freshness, and deletion propagation; every
derived copy invalidates with its source records (AIQ-55 facet). Search
indexing stays optional and off by default per R6 (AIQ-53 facet): an event
representation needs no full-text index, and each new index is another copy
that must invalidate with its source.

## Export semantics: panel, agent, session, workspace

The proposal keeps four export scopes with distinct meanings:

| Export      | Meaning                              | Proposed contents                                                                                                                                                |
| ----------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panel`     | Terminal execution history           | Commands, working-directory changes, exit codes, timestamps, scrollback                                                                                          |
| `agent`     | What one agent actually held and saw | System prompt, model and provider, context lineage, messages, tool calls and results, compaction history, skills, tool definitions, referenced panels, artifacts |
| `session`   | The logical task unit                | Member agents, panels, memories, artifacts, and the event graph                                                                                                  |
| `workspace` | Project-level scope                  | Multiple sessions plus project memory                                                                                                                            |

Panel export stays terminal-execution data; agent export is the reproducibility
record for agent behavior; session export is one level up, binding agents,
panels, memories, artifacts, and the event graph; workspace export binds
sessions with memory at project scope. Panel-only versus scrollback-inclusive
variants are frontend options, not separate scopes.

**Critical judgment:** the four scopes and their contents lists are proposals.
Every export is bounded by surviving authorized records under the R3 floor:
missing, expired, deleted, or never-recorded content is disclosed as typed
unavailable, and no export path resurrects it. Export preview stays exact
before bytes leave the host.

## Core storage API versus Lua frontends

The proposal places command and presentation in Lua plugins while snapshot,
serialization, and the storage API stay Core capabilities. Lua never opens a
session database directly; a future storage-schema upgrade must not break
every plugin. The source-record sketch routes an export command through a Core
snapshot call into the session database plus the object store, with panel,
agent, session, and workspace exports as different frontends over that one
Core surface.

**Critical judgment:** the layering direction is a proposal consistent with
AG-5 (Orchestration versus execution): Lua policy owns orchestration while the
host owns execution semantics, and loading or naming a stored record grants no
execution authority. The exact API surface, capability scoping (AG-4, Least
privilege at dispatch), and consent attachment for each frontend stay open and
need their own scoped task with security review.

## Stable interchange format direction

The proposal rejects exporting the internal database file: schema versions
would make migration painful. Instead it sketches a versioned interchange
unit bundling a manifest, an event log, referenced objects, artifacts, memory
records, and context material, compressed as one archive. The source-record
sketch names a manifest carrying the format name, format version, producer
version, session identifier, creation timestamp, and object list, with an
exporter chain from internal schema through the versioned format to a future
internal schema on import. For live databases the source notes a
consistency-snapshot mechanism rather than a raw file copy.

**Critical judgment:** the archive layout, manifest fields, format name, and
version number are proposals, not accepted contracts. The durable rule is
decoupling: the interchange format is versioned and independent of the live
storage schema, so a future schema migration does not strand old exports.
What survives a restore is bounded by surviving authorized records; restore
never resurrects deleted, expired, or never-recorded content (AIQ-57 facet).

## Hot, closed, and archived lifecycle

The proposal adds a session lifecycle to avoid the single ever-mutating
database problem:

- Active: the session database is read and written frequently, with its
  normal write-ahead state present.
- Closed: on close, pending writes are checkpointed into the main database
  and the session stops changing, which keeps older sessions stable for
  incremental backup while new sessions and objects only add files.
- Archived: long-unused sessions pack into one compressed interchange unit
  while the catalog keeps title, date, summary, project, and archive-path
  fields for later restore on open.

**Critical judgment:** the three states, their transitions, and the
checkpointing mechanics are proposals. Checkpointing and backup-friendliness
claims are unmeasured observations (see
[Critical judgments](#critical-judgments)). Any background transition,
scheduler, or sweep is explicitly not adopted here: R6 selects no background
maintenance scheduler, and lifecycle transitions run only as explicit bounded
operations or stay deferred with durability.

## Storage collection direction

The proposal asks for storage management from the first version: a
per-category usage report (sessions, objects, panel state, memory, cache,
logs), collection and maintenance verbs, and per-session archive and delete
verbs plus a doctor verb. Content addressing makes collection a reachability
problem: scan object references across sessions and memory, build the
reachable set, and remove unreferenced objects, which is the classic
mark-and-sweep shape.

**Critical judgment:** verbs, report categories, and the sweep algorithm are
proposals and `bitty`-side CLI ownership is handoff input (see
[Bitty-side handoff](#bitty-side-handoff-not-a-decision)). The mandatory rule
underneath is deletion propagation (AIQ-55 facet): deletion or expiry
invalidates journal payloads, artifact bytes, projections, indexes, caches,
and exports together, and bounded observability queries disclose truncation
and absent evidence explicitly (AIQ-5B facet). No background collector is
adopted here.

## Project identity link

The proposal links storage to project identity rather than filesystem paths:
a declarative project file carries a project identifier that enters version
control, so two machines checking out the same project resolve the same
per-project memory scope, and sibling worktrees share project memory while
keeping separate workspace state.

**Critical judgment:** the identifier field, file placement, and sharing rule
are proposals, and project-file ownership is `bitty`-side handoff input. The
identity concept connects to AIQ-10 (Task lifecycle authority and CarryCtx
backend/handoff) as a facet: identity determines which memory scope a session
binds to, but lifecycle authority itself stays open and undecided here.

## Consistency with R3, R6, and the evidence split

- R6 preserved, not reopened. The single-writer journal candidate, the
  SQLite-candidate-only posture, the representation/projection/index/replay
  separation, state-only replay with `Unknown` reconciliation, and the
  no-background-scheduler rule in
  [Persistence profile R6](../architecture/persistence-profile-r6.md) all stand unchanged.
  Every substrate named in this design (catalog database, session database,
  object files, memory stores, derived indexes) is a draft candidate awaiting
  a scoped implementation task; AIQ-51 through AIQ-5C stay open.
- R3 mandatory floor. Consent-bounded retention and deletion propagation in
  [Context retention R3](../architecture/context-retention-r3.md) are requirements, not
  options: durable records hold only authorized, redacted, still-retained
  content; PP-2 (Typed redaction) applies pre-queue and pre-write; PP-4 (No
  on-disk persistence without consent) gates every durable write; P0-AC-026
  in the P0 Security Acceptance Criteria remains overriding authority.
  Anything in the candidate direction that reads as unconditional retention is
  restated under this floor: there is no lossless, complete, or always
  recoverable promise for unredacted, unconsented, deleted, expired, or
  never-recorded bytes.
- Evidence-split preserved. Journal representation, context projection,
  execution evidence, optional index, and replay stay five distinct dimensions
  per [Persistence and evidence architecture](persistence-evidence.md). A
  context recipe is a projection recipe, not a journal; an object file is
  artifact bytes, not a projection; an export is a bounded read path, not a
  replay guarantee; and a catalog row never certifies original tool outcomes.
- Consumer inputs noted, nothing decided. `bitty-ai` implementation items
  AI-0048 and AI-0049 (owning repository `bitty-ai`, same CarryCtx task IDs)
  are recorded as consumers of this design direction. This document selects no scope, sequence, or mechanism for either item and
  grants neither acceptance nor scheduling.

## Critical judgments

- Proposals versus accepted contracts. The only accepted authorities in this
  document are the linked R3, R6, PP-2, PP-4, P0-AC-026, and IPC RFC
  obligations. Everything else (shard shape, catalog fields, event tables and
  types, recipe slots, tier homes, export contents, API sketches, archive
  layout, lifecycle transitions, collection verbs, identity fields) is a
  proposal carried from the candidate direction for review, not a contract.
- Retention restatement. Where the source record discusses keeping,
  exporting, or restoring session content without naming consent, redaction,
  or deletion, this document restates that content under the R3 floor. No
  completeness, losslessness, replay, or recovery claim in the source is
  adopted beyond surviving authorized records.
- Upstream footnotes qualified. The source footnotes cite a write-ahead
  logging overview, the XDG base-directory specification 0.8, a database
  backup API page, and a checkpoint reference page.
  These are September-2026 observations about upstream documentation
  direction, never pins on behavior, versions, or availability; mechanism
  claims built on them need their own evidence before any implementation
  task relies on them.
- Sizing and performance language qualified. Catalog-size, backup-friendliness,
  and deduplication-benefit statements from the source are unmeasured
  observations. The evidence bar in
  [Persistence profile R6](../architecture/persistence-profile-r6.md) (consent and redaction
  evidence, deletion-propagation evidence, dimension-separation evidence,
  replay evidence, and deterministic fixtures) applies unchanged to any future
  implementation of this design.

## Bitty-side handoff, not a decision

The following items from the candidate direction need owning-repository review
and are recorded here as input only:

1. XDG directory stratification (configuration, data, state, cache, and
   runtime separation with a per-kind path table)
   (owner: `bitty` side; constraint: no placement, migration, or dotfiles
   contract is adopted here).
2. Repository layout sketch under those directories (configuration files,
   catalog, dated session shards, object store, memory stores, archives,
   panel segments, search and embedding caches, sockets and locks; source) (owner: `bitty` side; constraint: no path, filename, or
   layout contract is accepted here).
3. Migration and archiving flow (configuration via dotfiles, sessions and
   memory via export and import, cache/logs/runtime excluded from migration) (owner: `bitty` side; constraint: no migration
   procedure is adopted here).
4. Project-directory rule (declarative portable project configuration only,
   no databases, history, or cache inside the project)
   (owner: `bitty` side with project-format review; constraint: no
   project-file contract is accepted here).
5. Panel history segment files (append-only compressed segments under the
   state directory with session-side panel references)
   (owner: `bitty` side; constraint: no segment format, retention, or
   reference protocol is accepted here).
6. Storage CLI verbs (usage report, collection, per-session archive and
   delete, and doctor verbs) (owner: `bitty` side
   with CLI-surface review; constraint: no verb name, flag, or output
   contract is adopted here).
7. Project-identity file ownership (project identifier field, version-control
   treatment, and per-project memory binding)
   (owner: `bitty` side; constraint: no field name, file name, or binding
   rule is accepted here).

Suggested handling: the owning repository accepts, reshapes, or rejects each
input through its own review; `bitty-ai` Core proceeds with the proposal
sections above regardless of handoff timing.

## Risks

- Catalog rows leak by summary: titles and summaries are queryable metadata
  that can carry secrets, so the catalog needs the same pre-write redaction
  and per-reader authorization as any other durable store.
- Recipes widen retention silently: a recipe referencing an object keeps that
  object reachable under mark-and-sweep, so deletion reviewers must treat
  reference removal as part of deletion, not as cleanup.
- Dedup crosses authorization scopes: identical bytes from two sessions share
  one object, so readers must be re-authorized per read and object existence
  must never disclose another session's content.
- Archives become retention bypasses: a packed interchange unit that outlives
  its deletion obligation resurrects deleted content on restore, so archives
  inherit deletion and expiry with no exception.
- Lifecycle transitions hide schedulers: close and archive sweeps that run on
  timers reintroduce the background maintenance R6 removed, so transitions
  must stay explicit and bounded.

## Open points

Duplicate-check against
[AI Unresolved Questions](../product/ai-unresolved-questions.md) finds every storage
question already tracked, so this document proposes no new AIQ identifier and
no new global open-question identifier. Each item below is a facet of an open
entry, not a closure:

- AIQ-51 (Schema and transaction boundaries) covers catalog fields,
  per-session tables, event shape, and recipe slots; representation is bounded
  above while exact schema and transaction boundaries stay open.
- AIQ-53 (Backend and optional search index) covers the SQLite-candidate-only
  posture, the object-store backend shape, and the embeddings-as-derived-cache
  rule; FTS5 stays optional and off by default.
- AIQ-55 (Deletion/expiry and derived-record invalidation) covers deletion
  propagation across catalog rows, session records, objects, recipes,
  memories, indexes, caches, exports, and archives, including the
  mark-and-sweep direction.
- AIQ-57 (Reconstruction after deletion, expiry or destructive journal
  reduction) covers recipe materialization, export contents, interchange
  restore, and archive reopening bounded by surviving records with typed
  unavailable disclosure.
- AIQ-5B (Bounded authorized observability queries) covers the catalog as a
  query surface, the per-category usage-report direction, and explicit
  truncation and absence disclosure.
- AIQ-10 (Task lifecycle authority and CarryCtx backend/handoff, with the
  AIQ-56 alias) covers session, agent, and panel lifetime decoupling and the
  project-identity scoping facet; authority itself stays open.

AIQ-51 through AIQ-5C otherwise stay open exactly as the R6 disposition
records them; this document reopens none of them.
