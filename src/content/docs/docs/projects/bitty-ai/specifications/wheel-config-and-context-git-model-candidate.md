---
title: Wheel configuration and context git model (candidate)
description: Candidate Wheel agents split, configuration classes, trust, and Git-inspired context storage modes
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 62
---

# Wheel configuration and context git model (candidate)

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification, accepted
decision, dependency selection, release commitment, or implementation claim.
It records the candidate direction for `.wheel` configuration and a Git-inspired
context model: portable capabilities, eight `.wheel` function classes, the
single-entry Lua contract, the no-runtime-state rule, Lua trust, the capability
sandbox, and the final directory relationship; and the Git-inspired context
model of DAG objects, deduplication, checkpoint as commit, compaction as
snapshot, HEAD, branches, merge, cherry-pick, ref sharing, rebase, worktree
binding, refs, reflog, GC, and the store-cache split.

The recommendation is to treat every model below as a candidate input to the
draft [AI Architecture](../architecture/ai-architecture.md) and its related draft
dispositions, never as an override of the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) or the normative security corpus.
In particular, the `.wheel` Lua API sketches, the directory layouts, the
hook and permission sketches, the trust-flow wording, the `ContextObject`
enum sketch, the CLI spellings, and the storage diagram are **not** accepted
by this candidate design. Agent lifecycle, Agent events, and Agent semantics in
the candidate direction is a **discussion input only**: the accepted Agent contract stays
entirely with the RFC, which this draft references without restating
normatively. Nothing here is promoted to accepted status, and no
implementation is described as shipped.

The candidate direction's strongest ideas are the What-versus-How split (portable
capabilities declared once, Harness behavior decided per project), the
reference-not-copy rule (`.wheel` filters and constrains `.agents` exposure
rather than duplicating skills or MCP), the single-entry Lua contract with
free internal organization, the no-runtime-state rule with XDG and
git-ignored placement, the no-silent-execution trust rule with hash-pinned
re-review, the capability-sandbox posture for project Lua, the immutable
content-addressed object store with cheap branches and explicit typed merges
for context and multi-agent state, and the strict separation of semantic
context storage from provider prompt cache. Their weakest claims are the
concrete Lua API spellings, which are unreviewed interface vocabulary with
no owner, versioning, or compatibility evidence; the hook-tier and
permission sketches, which name enforcement without an enforcement owner;
and the storage paths and hash choices, which are illustrations, not adopted
layout or cryptography. Those are corrected below.

This synthesis references, without duplicating or modifying, the draft
[AI Architecture](../architecture/ai-architecture.md) (candidate inputs only),
[Context Management Architecture](../context/context-management.md),
[Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md),
[Command and Tool Architecture](../architecture/command-tool-architecture.md),
[Agent Coordination Architecture](../agent/agent-coordination.md),
[Execution ownership R1](../architecture/execution-ownership-r1.md),
[Context retention R3](../architecture/context-retention-r3.md),
[Task lifecycle R5](../architecture/task-lifecycle-r5.md),
[Tool transport R2](../architecture/tool-transport-r2.md),
[Provider plugin boundary](../providers/provider-plugin-boundary.md), and
[Panel environment awareness](../interfaces/panel-environment-awareness.md). The
accepted [IPC and Agent RFC](ipc-agent-rfc.md) is unaffected by this
draft. The companion
[Quality-formula and Context-Compiler candidate design](quality-and-context-compiler-candidate.md)
carries the quality framing and the compiler design; this draft links to it
wherever configuration or storage touches compilation, as design input
rather than implementation. This document creates no AIQ or OQ identifier
and closes none.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Owner rename decision

> The project-config directory is renamed to `.wheel/`. The direction states
> the directory-level rename only and fixes `init.lua` as the single `.wheel/`
> entry; no single-file-style filename mapping appears in the direction for the
> project-config name. Wheel reads `.agents` for skills and MCP compatibility.
> `.wheel/` owns skill toggles, rules, custom commands, and custom tools.

The supporting scope sentence is kept with it: Bitty names the terminal and
runtime platform while Wheel names the Agent Harness, so project AI-agent
behavior must not masquerade as Bitty platform configuration. The two
directories coexist durably without overlapping duties. No file was renamed
by this documentation task, and no implementation is described as shipped.

## Portable capabilities in `.agents`

The retained direction keeps `.agents/` as the ecosystem compatibility layer
that declares what capabilities a project has: skills and MCP material live
there in portable form, Wheel supports and reads that layer, and Wheel never
stuffs its own advanced Harness behavior into it. The portability argument
is kept: a project carrying its capabilities in `.agents/` keeps migration
value across Harness implementations, while `.wheel/` adds strictly
Wheel-native behavior on top for projects that opt into Wheel. The defining
questions are kept as the boundary slogan: `.agents` answers what
capabilities exist; `.wheel` answers how Wheel should behave.

**Critical judgment:** the tree sketches are illustrations, not an adopted
directory schema; no `.agents` layout is decided here. The stable claims are
the coexistence rule and the non-pollution direction (Harness-native
extensions never land in the portable layer).

## Open survey item: `.agents` project-level design

Owner direction, recorded as an open survey item rather than a claim: Wheel
must survey the `.agents` project-level directory design, taking the
Neovim-like configuration style as a reference, because that design
constrains `.wheel`. The direction's own Neovim-style point (a single fixed
entry file with free internal organization) currently
addresses `.wheel` entry shape, not `.agents` layout; whether the same
reference transfers to the `.agents` project-level design, and exactly which
constraints it imposes on `.wheel` (discovery, filtering, precedence,
namespacing), stays with the owning survey task. This candidate design decides
no schema on either side.

## Eight `.wheel` function classes

The retained classes are: capability filtering over discovered skills and
MCP (enable, disable, allow, prefer, and permission scoping, flowing from a
discovered registry through Wheel policy into a resolved set for the
compiler); context policy as high-level declarations (budgets, code
preferences, log handling, pinning, exclusion) with the explicit rule that
users describe policy rather than hand-roll per-prompt compiler algorithms;
structured rules and constraints that a policy engine enforces
deterministically (path-scoped denials, confirmation gates, change-gated
verification) instead of prompt reminders; project-defined custom commands
built in Lua; project-defined custom tools with strict provenance separation
(native, Lua, MCP, and skill-script origins stay distinguishable under one
agent-visible capability surface); structured agent definitions (model
reference, tool and skill selection, permission bounds) that let the
compiler trim per profile; verification declarations (change-gated checks,
test discovery with targeted-then-full shape, completion gates) so
done-ness is decided by evidence; and hooks across task, tool, compile, and
spawn points with explicit grading (safe, advanced, unsafe or
capability-gated) so ordinary project configuration cannot silently break
compiler invariants. The shared rationale is kept: every rule the runtimes
enforce deterministically is a rule the core prompt no longer has to carry,
which shortens the prompt and stabilizes the cached prefix.

**Critical judgment:** every Lua spelling, field name, command name, tool
URI shape, and hook name is unreviewed vocabulary proposing no API. The
stable claims are the class list as candidate coverage (filtering, policy,
rules, commands, tools, agents, verification, hooks), the policy-over-code
rule for context configuration, the provenance-separation rule for tools,
and the hook-grading requirement.

## Single-entry contract and free organization

The retained contract fixes exactly one entry point (an init file at the
`.wheel` root) while remaining directories stay ordinary modules the entry
requires; no prescribed subdirectory is mandatory. The Neovim-style
reference is kept as the organization principle: one stable contract at the
root, user freedom inside.

**Critical judgment:** the entry filename and module organization are the
candidate proposal, not an adopted schema; the open survey item above owns
any constraint flowing from the `.agents` side. The stable claim is only the
singularity (one entry, not a mandatory tree).

## No runtime state in `.wheel`

The retained rule keeps `.wheel/` commit-worthy: configuration only, never
history databases, sessions, caches, or checkpoints. Runtime data belongs in
platform state, cache, and data homes (or explicitly git-ignored project
paths that never enter the repository), so versioned intent and mutable
execution never mix.

**Critical judgment:** the directory names shown are illustrations, not an
adopted layout. The stable claim is the separation itself, which is also a
reviewability property: everything under `.wheel/` must be safe to commit
and review.

## Lua trust and the capability sandbox

The retained trust rule is absolute at first contact: cloning a project and
entering it must never silently execute project Lua, because configuration
files are executable code with supply-chain consequences. The direnv-like
flow is kept as candidate shape: first sighting surfaces an untrusted notice
with no execution, an explicit trust action records project path plus config
hash, any config change invalidates trust pending re-review, and inspection
shows requested capabilities before granting. The sandbox direction keeps
project Lua off ambient authority (no direct process, filesystem, or network
reach) behind Wheel-mediated functions, with declared project permissions
(filesystem scoping with outside-project denial, process and network flags)
so a project configuration is itself an auditable dependency.

**Critical judgment:** the command spellings, notice wording, hash mechanics,
and permission fields are unreviewed sketches needing security review; no
trust protocol is adopted. The stable claims are the no-silent-execution
rule, the hash-pinned re-review trigger, and the mediated-access posture.
Enforcement placement stays with the security corpus and the R1/R2
dispositions.

## Final layout and the load pipeline

The retained relationship loads both project layers and resolves them into
runtime behavior: `.agents` feeds capability discovery into a registry,
`.wheel` Lua configuration feeds a policy engine, a resolver combines them
into enabled skills and tools, the Context Compiler shapes the active view,
and the Agent Runtime acts on it. The closing boundary sentence is kept as
the slogan: `.agents` holds portable agent capabilities while `.wheel`
holds Wheel-native Harness behavior, so `.wheel` references, filters,
constrains, and composes what `.agents` exposes instead of re-storing skills
or MCP material.

**Critical judgment:** the layout and pipeline are candidate topology, not
adopted packaging or control flow. The stable claim is the
reference-not-copy rule, which is the configuration analogue of the
compiler's superset inequality in the companion candidate design.

## Git-inspired context model

### DAG over transcript, objects over strings

The retained shift replaces the append-only message list with a context
graph whose nodes are typed objects (artifacts, trees, checkpoints,
summaries, decisions, tasks, results), each immutable, hashed, deduplicated,
integrity-checked, and addressable. Storage and presentation separate from
the start: the graph persists everything while per-turn views are compiled.

**Critical judgment:** the enum shape, hash choice, and storage paths are
illustrations. The stable claims are immutability, content addressing, and
the graph-not-list topology. Git-design reference: object model and content
addressing are explicit design inputs for compression and context
management.

### Deduplication by hash

The retained rule stores one artifact per content hash no matter how often
an agent reads it; distinct contexts hold references, mirroring multiple
commits sharing one blob. This bounds both storage and the temptation to
re-bill identical bytes against the active view.

**Critical judgment:** no hash function or retention rule is adopted. The
stable claim is ref-sharing over re-storage. Git-design reference: content
addressing is an explicit design input for context management.

### Checkpoint as commit

The retained model makes a checkpoint the commit analogue: it binds a
context tree, one or more parents (a merge checkpoint names several), task
state, decisions, evidence, and the acting agent, so a session reads as a
checkpoint chain rather than a transcript.
HEAD names the current checkpoint, the Active Context compiles from HEAD,
phase completion advances HEAD, and a log-like view recovers the session
narrative without replaying raw history.

**Critical judgment:** the checkpoint fields and log syntax are vocabulary;
no checkpoint schema or command is adopted. The stable claim is the
chain-of-states topology with HEAD as the single current pointer.
Git-design reference: commit chaining and HEAD are explicit design inputs
for context management.

### Compaction as snapshot, not deletion

The retained rule changes what compaction means: creating a higher-level
snapshot that HEAD now sees, with history retained rather than destroyed,
mirroring that checking out a commit never deletes prior commits. This is
the storage analogue of the compiler's traceable-compaction rule in the
companion candidate design.

**Critical judgment:** no snapshot schema or retention bound is adopted. The
stable claim is view-change-without-history-loss. Git-design reference:
snapshot discipline is an explicit design input for compression.

### Branches for hypotheses, merges for synthesis

The retained model treats child-agent exploration as cheap branches (shared
parent, no transcript copying, per-branch deltas) and multi-agent synthesis
as merge with first-class conflicts: contradictory hypotheses surface as
structured pending conflicts rather than being quietly summarized into a
vague consensus. Cherry-picking carries a single finding plus evidence into
another context, which is the mechanism behind child-agent isolation: parents
absorb conclusions, never transcripts.

**Critical judgment:** no branch, merge, or conflict schema is adopted. The
stable claims are delta-only branching, explicit-merge synthesis, and
finding-level cherry-picking. Git-design reference: DAG merge is an explicit
design input for multi-agent design.

### Sharing refs, rebasing stale work

The retained rules are that agents share references rather than histories
(expand only what is needed, so sharing costs refs instead of tokens) and
that long-running branches rebase semantically: extract post-divergence
decisions and artifacts, check each against the new base, revalidate, replay
what still holds, and mark stale-artifact conflicts where hashes moved.

**Critical judgment:** no ref-exchange protocol or rebase procedure is
adopted. The stable claims are ref-cost sharing and validate-before-replay.
Git-design reference: ref sharing and rebase semantics are explicit design
inputs for multi-agent design.

### Worktree binding and the ref namespace

The retained direction binds the three isolations together (context branch,
filesystem worktree, execution panel per agent) so parallel agents never
share a working tree, and names task and agent state through a ref-like
namespace instead of scattering it across relational tables over joins. The
object store plus refs is kept as sufficient expressive machinery for much
of agent state.

**Critical judgment:** the ref spellings and binding shape are vocabulary;
no namespace or lifecycle machine is adopted, and lifecycle authority stays
with the RFC and R1/R5. Git-design reference: refs and worktree binding are
explicit design inputs for multi-agent design.

### Reflog recovery, GC, and packfile

The retained mechanisms are: every HEAD move stays recoverable through a
reflog (bad compacts, switches, merges, and task updates are inspectable and
restorable); unreachable artifacts, abandoned branches, and temporary logs
collect after a grace period by traversing from live roots instead of
growing a store without bound; small objects start loose and pack in
background with delta compression for near-duplicate snapshots; and all
three compiler caches key off content hashes (plus parser, compiler, prompt,
and model versions where relevant) so reuse and invalidation stay exact.

**Critical judgment:** no GC policy, pack format, key shape, or command
spelling is adopted. The stable claims are recoverability-by-default,
rooted collection with a grace period, and hash-exact cache identity.
Git-design reference: GC and packfile discipline are explicit design inputs
for compression and context management.

### Store-cache separation and the checkout compiler

The retained separation keeps the content-addressed context DAG (semantic
storage) strictly apart from the provider prompt cache (serialized prefix):
store hashes stabilize the compiler's input, which makes provider caching
easier without ever equating the two. The compiler itself is kept as the
checkout analogue: from objects plus refs plus DAG it produces the Active
Context View, which is the operational form of the per-turn compiled view in
the companion candidate design.

**Critical judgment:** no store schema or compiler control flow is adopted;
the pass list here defers to the companion twelve-pass pipeline. The stable
claims are the two-layer split (semantic store below, provider cache above),
the checkout metaphor (HEAD in, view out), and the no-graph-database
position: the store stays an append-only journal plus a content-addressed
object store plus refs plus indexes plus materialized projections, and a
graph database is out of scope. Graph queries (reachability, ancestry,
merge_base) run over the indexes and projections, never over a dedicated
graph store; no journal schema, index format, or projection contract is
adopted.

### Multi-agent DAG and the vocabulary decision

The retained topology models agent work as a DAG — the Agent Work Graph,
an acyclic work-history shape (explore branches fanning out and rejoining
through review into implementation, each node naming parents) — rather
than a strict manager tree, because real agent dependencies cross. It is
not the communication topology: who talks to whom lives in the Agent
Communication Graph, which may be cyclic. The two shapes, with five more,
are rostered apart with their nodes, edges, and shape invariants in the
[event-sourced agent workspace candidate design](event-sourced-agent-workspace-candidate.md#agent-communication-graph-versus-task-dependency-graph).
The vocabulary decision is kept: user-facing terms stay
domain-familiar (checkpoint, branch, merge, rebase, gc, ref, HEAD,
worktree) while storage-level Git terms are not cargo-culted onto users
(checkpoint not commit, artifact not blob, context not tree), with the
programmer familiarity argument recorded as motivation, not evidence.

**Critical judgment:** the CLI spellings are illustration proposing no
surface; the DAG shape is candidate topology. The stable claims are
parent-listed multi-agent history and the two-level naming rule.

### Context diff and typed merge

The retained instruments are a context diff that shows what changed between
checkpoints per content type (added root cause, new decisions, code-context
swaps, diagnostic flips, unchanged skills and tools) so compaction loss is
inspectable, and a typed merge that never concatenates text: decisions merge
with semantic conflict detection, task state with structured merge,
artifacts with union plus version resolution, code through version control
itself, diagnostics latest-valid-first, and summaries with provenance
preserved. The storage diagram (refs over task, agent, and checkpoint
names; HEAD over the DAG; DAG over content-addressed loose and packed
objects; store feeding compiler feeding provider) and the closing
philosophy (full history plus current snapshot plus efficient references;
full session history kept distinct from Active Model Context) are kept as
the candidate architecture and its slogan.

**Critical judgment:** the diff format, merge rules, diagram boxes, and
slogan are proposals, not contracts; nodes stay typed so the architecture
keeps its advantage over markdown-string merging. Git-design reference:
typed DAG merge is an explicit design input for multi-agent design and
compression.

## Wheel modes

Owner direction, recorded as design-only with no implementation claim:
Wheel operates in three modes. Headless mode runs agents without visible
panels (grounded in the lifecycle-independence material:
and the per-agent headless binding sketch at ). The
Panel-versus-Agent lifecycle split keeps panels and agents as independent
entities joined by association (attach, spawn-headless, release, reattach),
grounded in the same ranges with lifecycle authority staying RFC-owned.
One-shot chat, the single-question-and-answer non-Agent form, is recorded
here as an owner-directed Wheel mode alongside the two source-grounded
modes; its details stay with the owning task and it proposes no interface,
no lifecycle machine, and no shipped behavior.

## Provider observability as a design pointer

Owner direction, recorded as a design pointer with explicitly no
`bitty-ai` code change in this task: the provider side should expose cost,
cache-hit, input, context, and timing signals for future plugins, with
git-style traceability (`git log --stat` and `git blame` as the UX
reference) as the interaction model for attributing cost and cache behavior
to decisions over time. A future `AI-XXXX` task implements this against a
real HTTP or Router adapter; that task owns the endpoint, field, metric,
and view contract. No name or format sketched anywhere in the candidate direction is
adopted here. This pointer complements, and does not duplicate, the
compiler-side observability direction (statusline, context, cache, why, and
trace views) carried in the companion
[Quality-formula and Context-Compiler candidate design](quality-and-context-compiler-candidate.md#provider-observability-as-a-design-pointer).

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered models are
candidate inputs only; the `.wheel` class list, the Lua contract, the trust
flow, the object model, the ref namespace, and the storage diagram proposed
in the candidate direction are **not** accepted by this candidate design and must not be read
as crate, package, protocol, file-schema, or release decisions. Context
assembly, budget, and retention questions stay with
[Context Management Architecture](../context/context-management.md),
[Prefix-Cache-Friendly Context Design](../context/prefix-cache-context-design.md),
and [Context retention R3](../architecture/context-retention-r3.md); tool shape and
transport placement stay with
[Command and Tool Architecture](../architecture/command-tool-architecture.md) and
[Tool transport R2](../architecture/tool-transport-r2.md); provider questions stay with
[Provider plugin boundary](../providers/provider-plugin-boundary.md); execution and
environment questions stay with [Execution ownership R1](../architecture/execution-ownership-r1.md)
and [Panel environment awareness](../interfaces/panel-environment-awareness.md);
coordination and persistence questions stay with
[Agent Coordination Architecture](../agent/agent-coordination.md),
[Task lifecycle R5](../architecture/task-lifecycle-r5.md), and the persistence
dispositions. Each is referenced, never duplicated or modified.

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) defines the only
accepted IPC wire, scope, and Agent vocabulary. Every sketch name in the
candidate direction (Lua function spellings, hook names, command names, agent-profile
fields, permission names, ref spellings, CLI spellings) is a discussion
sketch: this draft records it as input and proposes no file schema, API,
command, tool, event, or wire format. Where the direction's sketches overlap
RFC-owned ground (Agent lifecycle, Agent events, Agent semantics, scopes),
the RFC wins without further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed redaction,
consented recording, secret minimization) override every discussion example
throughout this document. The Lua trust and sandbox sketches are conceptual vocabulary, not an
adopted authorization contract. This draft creates or closes no AIQ or OQ
identifier; open questions stay with
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the design falsifiable before any
configuration or storage proposal constrains `bitty-ai`.

| Campaign         | Required observation                                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rename           | Project configuration under the new name resolves while portable capabilities keep working across Harness implementations, with no behavior change in reviewable tests. |
| Split            | A Harness-native extension ships without touching the portable layer, and a portable skill migrates Harness implementations without edits, in reviewable tests.         |
| Survey           | The `.agents` project-level survey names the constraints on `.wheel` with the configuration reference evaluated and a schema decision recorded by the owning task.      |
| Filtering        | A disabled skill or MCP stays out of discovery, activation, and context while an enabled one resolves identically, in reviewable tests.                                 |
| Policy           | A declared context policy changes compiled output identically to its hand-rolled equivalent without per-prompt user code, in reviewable tests.                          |
| Rules            | A denied path, a gated confirmation, and a change-triggered check all hold without any prompt reminder present, in reviewable tests.                                    |
| Tools            | A same-named tool from two provenances resolves with distinguishable identity and correctly scoped permission, in reviewable tests.                                     |
| Verification     | A completion gate rejects a plausible-but-wrong change the model self-reported as done, in reviewable tests.                                                            |
| Trust            | A changed project configuration re-prompts for trust before any execution, and an untrusted clone executes nothing silently, in reviewable tests.                       |
| Sandbox          | Project Lua attempting ambient process, filesystem, or network reach is denied through mediation, in reviewable tests.                                                  |
| Objects          | Repeated identical reads store once and serve by reference with integrity intact, in reviewable fixtures.                                                               |
| Checkpoint       | Phase completion advances HEAD with parent linkage intact, and history replays from the chain without transcript dependence, in reviewable tests.                       |
| Compaction       | A compacted episode leaves the active view while remaining restorable from history, with diff showing exactly what left, in reviewable tests.                           |
| Merge            | Contradictory agent hypotheses surface as structured pending conflicts rather than silent consensus, in reviewable tests.                                               |
| GC               | Abandoned branches and temporary artifacts collect after the grace period while pinned roots survive, in reviewable storage fixtures.                                   |
| Modes            | Headless, split-lifecycle, and one-shot forms each complete a scoped task without implying the others' machinery, in reviewable tests.                                  |
| Provider pointer | A future adapter task demonstrates cost, cache-hit, input, context, and timing signals flowing to a plugin surface with git-style attribution, with no Core change.     |

Promotion needs independent AI architecture, context-management, terminal
and plugin-owner, docs-curator, and security review. Route Lua spellings,
schemas, hook tiers, permission fields, trust wording, ref spellings, CLI
spellings, storage paths, hash choices, merge rules, diff formats, mode
details, and the provider-signal contract to scoped owner tasks. This draft
changes no normative contract and authorizes no product code.
