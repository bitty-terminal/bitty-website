---
title: Project continuity (candidate)
description: Candidate continuity model for project-scoped knowledge and work continuation, with synthesis and rebase derivation, a Git-style lifecycle over derived artifacts, and a bounded session bootstrap
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 32
---

# Project continuity (candidate)

> Status: **draft**. This document records a candidate direction as a
> reviewable proposal. It accepts nothing, describes no shipped behavior, and
> authorizes no compatibility promise. Mechanisms marked beyond-v0.1 are
> proposals for later increments, not commitments.

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification,
accepted decision, dependency selection, release commitment, or
implementation claim. It records the candidate project-continuity model for
the Wheel Agent Harness: how the standing rules, tools, document style, and
workflow conventions a project accumulates become reusable artifacts, how a
later session picks them up without the user restating them, how continuity is
derived from structured records instead of a hand-maintained document, and
which authority boundaries keep continuity from granting capability.

The model **extends, without restating**, existing candidate records:

- [Context Management Architecture](context-management.md) carries the
  session-versus-context invariant, the session journal, and the skills
  registry direction (`SkillRegistry`, the candidate skill directories, and
  real workflows as Skills). This page records how skill-shaped knowledge
  becomes project-scoped continuity.
- The [Wheel Context Runtime (candidate)](wheel-context-runtime-candidate.md)
  carries the runtime lifecycle, evidence views, temperature, and refinement.
  This page consumes the knowledge-refinement tier as one of its derivation
  sources.
- The [session model (candidate)](../specifications/session-model-candidate.md)
  carries the session as a named reachable scope, cross-root introduction by
  reference, and the store-the-graph/project-the-tree rule. This page reads
  those mechanisms as the continuity substrate.
- [Wheel configuration and context git model (candidate)](../specifications/wheel-config-and-context-git-model-candidate.md)
  carries checkpoint-as-commit, branch, merge, ref sharing, and semantic
  rebase. This page applies those mechanisms to continuity artifacts.
- [Prompt Layering Design](prompt-layering-design.md) owns the five-layer
  prompt contract: project continuity lands in its project and skills layers.
- [Storage memory and export design](../persistence/storage-memory-export-design.md)
  owns the memory tiers, the recipe-not-copy rule, and the project-identity
  direction that scope continuity below paths.

The surrounding context documents stay in force as references, never as
duplicated content: [AI Architecture](../architecture/ai-architecture.md) owns
the growth pipeline, discovery, and context planes; [Agent Coordination
Architecture](../agent/agent-coordination.md) owns agent identity and
coordination; [Command and Tool Architecture](../architecture/command-tool-architecture.md)
owns the command registry and Core-versus-Lua boundary; [Task lifecycle
R5](../architecture/task-lifecycle-r5.md) and [Persistence profile
R6](../architecture/persistence-profile-r6.md) own lifecycle authority and the
store profile; and the accepted configuration contract in the terminal
documentation corpus owns directory trust.

The accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) defines
the only accepted IPC wire, scope, and Agent vocabulary; it is unaffected by
this draft. Nothing here is promoted to accepted status, and no implementation
is described as shipped.

## Status vocabulary

| Status        | Meaning in this document                                                             |
| ------------- | ------------------------------------------------------------------------------------ |
| Accepted      | An accepted specification already requires the rule; this document only restates it. |
| Candidate     | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending | Belongs to another repository owner; recorded here as a pointer, never as content.   |

## Why a hand-maintained handoff record fails

The owner direction records the motivating failure: cross-agent handoff
records that are written and maintained by hand are effective short-term and
decay long-term. The corpus already contains both halves of that observation.

The cross-session handoff precedent exists: the
[handoff records directory](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/README.md)
in the canonical governance corpus is an accepted index that gives
ownership-change handoffs a tracked home, created when a CarryCtx task changes
owner before completion. Its content is manual prose — the maintenance model
the owner direction records as effective short-term and decaying long-term.

The structured alternative also exists: storage records are canonical, and
derived representations are rebuildable. The storage design separates
canonical memory from a derived index that is never backed up because it is
rebuilt from its source; the recipe direction records a context snapshot as
named slots holding references rather than bytes, which is what makes
decision provenance answerable. A continuity artifact that is **projected from
retained records** rather than **authored by hand** inherits both properties:
it can be regenerated, and every statement in it can be traced to the session
or evidence that produced it.

**Design consequence:** continuity is a projection, not a document. The three
sub-problems separate cleanly:

```text
knowledge gap     the project's standing rules, tools, style, and workflow
                  are stable across sessions but are restated per session
work-state gap    what a prior session decided, built, and left open
maintenance gap   any hand-written bridge document decays; the artifact
                  set must be regenerable and attributable
```

**Critical judgment:** this does not adopt a projection mechanism, an artifact
schema, or a generation schedule. The stable claim is the direction: continuity
artifacts are derived, attributed, and reviewable rather than hand-maintained.

## Continuity artifact classes

Continuity content has three distinct stability classes; collapsing them into
one artifact class reintroduces the maintenance failure.

| Class               | Holds                                                                        | Stability                                 | Owner layer                                    |
| ------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| Durable knowledge   | Standing rules, conventions, document style, workflow procedures, tool usage | Stable across sessions; changes by review | Project tier, skill-shaped                     |
| Continuation refs   | Recent checkpoints, open task references, unresolved questions and decisions | Changes every working session             | Session scope; refs over the stored graph      |
| Derivation metadata | Source sessions, evidence pointers, revision, approval state                 | Written once per artifact revision        | Storage catalog, alongside the artifact record |

Durable knowledge is skill-shaped because the corpus already gives procedures
that home: the growth pipeline maps a reusable procedure to a skill, and the
skills registry direction names `SkillRegistry` as the AI-runtime primitive
with workflows such as review, release, debug, and refactor as Skills rather
than built-in commands. What this candidate adds is the **project scope**:
the same shape that serves a user-level skill also serves a project's standing
conventions, and project identity — not a filesystem path — selects which
artifacts a session sees, consistent with the storage direction that sibling
worktrees share project memory while keeping separate workspace state.

Continuation refs are deliberately **not** knowledge: they are references over
the stored graph, materialized on read, so a project's continuity set costs
refs rather than tokens and never duplicates session records. This is the same
mechanism the session model already names for cross-root introduction, and the
same economics the git model names for agent sharing.

Derivation metadata is what makes the set auditable rather than a second
opaque prompt blob: which sessions, which evidence, and which approval
produced a given artifact revision.

**Critical judgment:** the three class names, their tier homes, and their
field sets are this draft's vocabulary, not an accepted schema. The stable
claims are the separation itself and the projection direction.

## Derivation paths: synthesis and rebase

Continuity artifacts are produced by two paths, both recorded as owner
direction.

**Synthesis** derives durable knowledge from structured session records:
chronological or retrieval-based summarization across a project's prior
sessions, producing or updating an artifact as a proposal. The corpus shape
for this is the growth pipeline's observation-to-memory-to-recipe-to-skill
progression with its proposal rules: an agent may propose, the host validates
and versions, and an agent never edits its own security policy, capability
set, or role authority. Synthesis executes as a **Wheel-layer role or
orchestration** — organized like the skill-shaped workflows above, under the
same role, capability, and sandbox enforcement as any other tool invocation —
and not as a new Core mechanism.

**Rebase** carries a new session forward from prior structured state: extract
the post-divergence decisions and artifacts, check each against the new base,
replay what still holds, and mark what went stale. The git model already
retains this procedure as an explicit design input (semantic rebase over
extracted decisions and artifacts with stale-artifact marking where hashes
moved); the session model already reads those mechanisms as session-level
operations.
Applied to continuity, a rebase is how a project's artifact set tracks
external change — a dependency bump, a schema decision, a style revision —
without a rewrite: replay what survives, mark what does not, and let the
stale marks drive review.

The two paths compose with the recorded inequality that sharing carries
references rather than histories and absorbs conclusions rather than
transcripts: synthesis reads the stored graph; it does not paste transcripts
into artifacts, and a rebase compares extracted decisions rather than
replaying conversations.

**Critical judgment:** neither the synthesis pipeline nor the rebase procedure
is adopted here, and the growth pipeline's own open question — whether a
learned skill persists as durable project data or session-scoped state —
stays open with its owning question. This page proposes the artifact classes
each path feeds; it decides no schedule, no trigger, and no approval surface.

## A Git-style lifecycle over derived artifacts

The owner direction is explicit that the Git-inspired model is valuable here
precisely for branching, versioning, and rollback. Applied to continuity
artifacts, the retained mechanisms are:

- **Revision history.** Every artifact revision is attributed and inspectable;
  a bad update is recoverable through the recorded history rather than manual
  reconstruction. This is the git model's reflog rationale applied at project
  scope.
- **Branching.** A proposed change to a standing convention — a new document
  style, a changed workflow — can be prepared and reviewed before it becomes
  the active artifact, then merged or discarded.
- **Definition versus runtime separation.** Definitions are portable and
  belong with the project's declarative tree; runtime state — active
  revisions, staleness marks, usage statistics, and any index — belongs to
  runtime storage and never enters the project definition tree.
- **Ref sharing.** A session selects continuity artifacts by reference, so
  introducing a project's continuity set costs refs, not copies.

**Critical judgment:** this page adopts no branch, merge, or conflict schema;
the stable claims are revision-attributed history, pre-activation review, the
definition-versus-runtime split, and ref-cost selection. The `.wheel/`-family
directory contract is owned by its recorded open question and is not settled
here.

## Session bootstrap

The owner direction fixes the default behavior: **ask once on first
introduction, then follow project policy; never inject silently.** The
bootstrap separates into four bounded steps.

1. **Discovery is metadata-first.** A session may enumerate a project's
   declared continuity artifacts as bounded, attributed metadata without
   executing anything — the discovery direction already requires that
   discovery never executes a plugin, project instruction, script, or
   package, and that activation stays host-mediated.
2. **Trust gates activation, not enumeration.** An untrusted project can be
   listed; selecting and activating its artifacts requires the trust the
   accepted configuration contract defines. The first introduction asks once
   (introduce, always introduce for this project, or decline); later sessions
   follow the recorded project choice.
3. **Loading is bounded and counted.** Activated artifacts enter the context
   as project-tier and knowledge content under the prompt-layering contract,
   count against the context budget like any other content, and stay stable
   within a session so the stable-prefix ordering holds; a change to an
   artifact lands at a later generation rather than mutating a running turn.
4. **Work-state introduction is explicit or policy-gated.** Continuation refs
   follow the recorded rule that a checkpoint is a recovery pointer and not
   context injected by default; a session introduces them by policy or by an
   explicit resolve, and the introduction is a bounded projection.

**Critical judgment:** the four-step shape is this draft's vocabulary. The
stable claims are metadata-first discovery, trust-gated activation with
ask-once default, counted and generation-stable loading, and no silent
injection of work state. The concrete prompt, database, and expiry mechanics
for directory trust stay with their owning question.

## Security review

Continuity artifacts are a high-leverage path — a later session may treat
them as its standing instructions — so every recorded restraint applies.

- **Loading grants no execution authority.** The corpus already states that
  loading declarations grant no execution authority, and the growth pipeline's
  invariant that an agent cannot grow an ungranted capability applies to every
  derived artifact: a synthesized skill runs under the same role, capability,
  and sandbox enforcement as any other tool invocation, and a proposal that
  would need new authority returns to the consent flow.
- **Proposal, not mutation.** Synthesis and rebase produce proposals; the
  policy engine validates, versions, and installs or rejects. Continuity
  artifacts never self-activate, and an agent never edits its own policy,
  capability set, or role authority through a continuity path.
- **Artifacts are untrusted data.** Reading, forwarding, or claiming a
  continuity artifact grants no authority; every resolution re-passes
  authorization, consent, redaction, and budget checks, consistent with the
  session model's treatment of records and refs.
- **Project scope is a boundary, not a hierarchy.** Continuity selects by
  project identity; it is not a channel for widening a session's authority,
  and cross-project introduction follows the same consent and trust gates as
  any other introduction.
- **Retention and deletion propagate.** Derived artifacts and their indexes
  invalidate with their source records under the recorded consent, freshness,
  and deletion-propagation rules; a dropped source leaves a typed unavailable
  marker, never a resurrected artifact.

**Critical judgment:** no clause here weakens the normative security corpus
linked from [AI Architecture](../architecture/ai-architecture.md), and the
accepted obligations (least privilege, per-action scopes, fail-closed
permission, typed redaction, consented recording, secret minimization)
override every example in this document.

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered
models are candidate inputs only; the artifact class names, tier homes, field
sets, bootstrap steps, and operation names proposed here are **not** accepted
by this candidate design and must not be read as product, crate, package,
protocol, file-schema, command, or release decisions.

The skill surface — format, versioning, and ecosystem compatibility — stays
with its recorded open question; this page proposes no skill schema and
restates no directory layout. The growth pipeline's approval, review,
versioning, and storage rules stay with their owning question, including the
undecided question of whether learned skills persist as project data or
session-scoped state. Memory tiers, recipes, and project identity stay with
[Storage memory and export design](../persistence/storage-memory-export-design.md);
prompt layering and assembly order stay with [Prompt Layering Design](prompt-layering-design.md);
discovery, planes, and temperature stay with [AI Architecture](../architecture/ai-architecture.md)
and the [Wheel Context Runtime (candidate)](wheel-context-runtime-candidate.md);
session identity, refs, and cross-root introduction stay with the [session
model (candidate)](../specifications/session-model-candidate.md); checkpoint,
branch, merge, and rebase mechanics stay with the [Wheel configuration and
context git model (candidate)](../specifications/wheel-config-and-context-git-model-candidate.md);
task and worktree integration stay with [Task lifecycle
R5](../architecture/task-lifecycle-r5.md) and the CarryCtx boundary question;
the `.wheel/` project-directory contract stays with its owning question. The
handoff records index in the canonical governance corpus remains the manual
precedent this direction complements rather than replaces. Each is
referenced, never duplicated or modified.

The accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) defines
the only accepted IPC wire, scope, and Agent vocabulary. Where the sketches
here overlap RFC-owned ground, the RFC wins without further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed redaction,
consented recording, secret minimization) override every discussion example
throughout this document. Continuity artifacts, their metadata, and their
introductions are untrusted data paths: reading, forwarding, or claiming them
grants no authority; every resolution re-passes authorization, consent,
redaction, and budget checks. This draft creates or closes no AIQ or OQ
identifier; open questions stay with [AI Unresolved Questions](../product/ai-unresolved-questions.md)
and shared governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the continuity model falsifiable before it
constrains `bitty-ai`.

| Campaign             | Required observation                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project scope        | Sibling worktrees of one project see one continuity set while a foreign project sees none, in reviewable tests.                                                     |
| Ask-once             | First introduction prompts exactly once; a recorded policy governs later sessions; no path injects continuity without a recorded choice, in reviewable tests.       |
| No silent injection  | A session with no continuity policy starts with no work-state content and the absence is observable, in reviewable tests.                                           |
| Synthesis provenance | Every synthesized artifact names the sessions and evidence it was derived from and is reproducible from those sources, in reviewable tests.                         |
| Rebase staleness     | A rebase against a moved base replays surviving decisions, marks stale ones, and never silently rewrites an artifact, in reviewable tests.                          |
| Revision recovery    | A bad artifact update is recoverable through recorded history, and each revision is attributed, in reviewable fixtures.                                             |
| Definition split     | Runtime state (active revision, staleness, index) never appears in the project definition tree, and definitions never depend on runtime paths, in reviewable tests. |
| Authority floor      | A synthesized artifact that requires new authority refuses activation and returns to consent; loading changes no capability, in reviewable security tests.          |
| Deletion propagation | Dropping a source session invalidates its derived artifacts and indexes with typed unavailable markers and no resurrection path, in reviewable fixtures.            |
| Budget honesty       | Introduced continuity content counts against the context budget with per-block attribution, and generation stability holds, in reviewable tests.                    |

Promotion needs independent AI architecture, context-management,
coordination, persistence, terminal-owner, docs-curator, and security review.
Route the artifact vocabulary, tier homes, derivation paths, bootstrap steps,
and operation names to scoped owner tasks. This draft changes no normative
contract and authorizes no product code.

## References

- [Context Management Architecture](context-management.md)
  (Draft): session journal, projection, compression pipeline, and the skills registry direction; extended with project scope.
- [Prompt Layering Design](prompt-layering-design.md)
  (Draft): five-layer prompt contract and stable-before-dynamic assembly; the landing layer for loaded continuity content.
- [Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md)
  (Draft): stable-prefix layering, serialization, and epochs; consumed for generation-stable loading.
- [Wheel Context Runtime (Candidate)](wheel-context-runtime-candidate.md)
  (Draft): runtime lifecycle, evidence, temperature, refinement; consumed as a derivation source.
- [Storage memory and export design](../persistence/storage-memory-export-design.md)
  (Draft): memory tiers, context recipes, and project identity; extended with continuity artifact classes.
- [Wheel configuration and context git model (candidate)](../specifications/wheel-config-and-context-git-model-candidate.md)
  (Draft): checkpoint, branch, merge, refs, semantic rebase; consumed as the artifact lifecycle.
- [Session model (candidate)](../specifications/session-model-candidate.md)
  (Draft): named reachable scope, cross-root introduction, store-the-graph/project-the-tree; consumed as the continuity substrate.
- [AI Architecture](../architecture/ai-architecture.md)
  (Draft): discovery, growth pipeline, context planes; the owning home of the proposal rules this page consumes.
- [Agent Coordination Architecture](../agent/agent-coordination.md)
  (Draft): coordination, leases, panel reconciliation.
