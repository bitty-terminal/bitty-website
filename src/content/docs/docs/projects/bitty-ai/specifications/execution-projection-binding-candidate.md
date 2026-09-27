---
title: Execution-projection binding (candidate)
description: Candidate model for binding a panel or console projection to a running or retained execution - creation, cardinality, lifecycle outcomes, and the single-authority record
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 70
---

# Execution-projection binding (candidate)

> Status: **draft**. This document records a candidate direction as a
> reviewable proposal. It accepts nothing, describes no shipped behavior, and
> authorizes no compatibility promise.

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification,
accepted decision, dependency selection, release commitment, or
implementation claim. It records the candidate binding model for the Wheel
Agent Harness: what it means for a panel (or console view) to project a
running or retained execution — who may create the binding, how many may
exist, what happens across hide/show, rebinding, restart, and execution end —
and the record principle that keeps the relation queryable from both sides.

The model **extends, without restating**, existing candidate records:

- [Execution ownership R1](../architecture/execution-ownership-r1.md)
  carries the disposition this page builds on: `ExecutionContext` primary
  with optional Panel projection, and a projection that attaches later
  without recreating the execution. R1's suggested follow-ups name the
  binding lifecycle; this page records it.
- [Agent coordination architecture](../agent/agent-coordination.md) carries
  the `Agent -> ExecutionContext <- Panel` reconciliation, the lifecycle
  outcomes that touch panels, and the record principle that authoritative
  views derive from event/state records rather than independently writable
  indexes. Its open point on binding lifetime is pointed here.
- [Panel and agent workspace boundary (candidate)](panel-workspace-candidate.md)
  carries the panel identity boundary: a panel may outlive, hide, or rebind
  its visible surface without moving or duplicating the execution, and
  suspend, resume, and disposal are host operations.
- [Execution supervisor (candidate)](execution-supervisor-candidate.md)
  carries the owner/subscriber vocabulary and the two staleness kinds —
  assignment generation on the coordination side and execution generation on
  the host side — that this page composes rather than extends.
- [Wheel-to-runtime coupling (candidate)](wheel-to-runtime-coupling-candidate.md)
  carries the four-layer coupling view whose presentation layer this page
  supplies the binding vocabulary for.
- The [AI Architecture](../architecture/ai-architecture.md) carries the
  panels-as-views direction ("an agent can have UI, no UI, run headless, or
  be watched by several panels") and the identity-separation candidate
  ("one execution may be projected to a panel that did not start it").

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) remains the only accepted
IPC wire and scope contract; it is unaffected by this draft. Nothing here is
promoted to accepted status, and no implementation is described as shipped.

## Status vocabulary

| Status        | Meaning in this document                                                             |
| ------------- | ------------------------------------------------------------------------------------ |
| Accepted      | An accepted specification already requires the rule; this document only restates it. |
| Candidate     | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending | Belongs to another repository owner; recorded here as a pointer, never as content.   |

## The binding relation

A **binding** is a candidate reference relation between one execution and one
projection surface (a panel, or a console view for headless inspection):

```text
Execution (id + generation)  <- binding ->  Surface (id + generation)
```

A binding is a reference, never a copy. Execution state, output, and evidence
stay with their existing owners (the supervising backend and the evidence
store); the surface materializes what it displays through the observation
paths those owners already provide. Deleting a binding never deletes
evidence, and ending an execution never rewrites what a surface recorded.

Candidate binding fields:

| Field      | Intent                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| execution  | Execution identity with its generation, as the host tracks it                                         |
| surface    | Panel identity with its generation, or the console-view identity                                      |
| state      | `active` (live projection), `retained` (read-only post-execution inspection), or `closed`             |
| purpose    | A short label describing why the projection exists (task view, evidence review, live observation)     |
| created_by | The principal that created the binding (a user action, or a host decision following an agent request) |

The binding carries **no authority fields**. A binding is not a grant: it
never widens read scope, never implies input rights, and never substitutes
for consent. Observation of execution output continues to check the
observer's own authorization each time it materializes, on the same terms as
any other observation.

**Critical judgment:** the field list is candidate vocabulary for a relation
that existing records already presuppose; it adopts no schema, creates no
identifier, and settles no ownership. Where a binding record lives, and which
side is its authority, stays open with the identity-domain question
([OQ-061](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)).

## Cardinality

| Side      | Candidate rule                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Execution | Zero to many bindings. One execution may be projected by several surfaces at once — a live view, a results view, and a console inspection may coexist — each with its own binding record and its own fencing. |
| Panel     | At most one **active primary** binding per panel at a time. A panel serves one execution as its working target; switching targets closes the old binding and creates a new one.                               |

The panel-side rule has one deliberate exclusion: **references are content,
not bindings**. A panel may display diff fragments, evidence references,
artifact links, or output excerpts taken from other executions without
holding a binding to them. Those are rendered content governed by the
observation contracts; the binding is the primary projection relation that
makes a panel "the surface of" an execution. The exclusion keeps the
cardinality rule enforceable without forbidding composite views.

The many-bindings direction answers the recorded question of whether one
execution may be projected by several panels simultaneously. The candidate
reading is yes, with independent records and independent fencing; a surface
never inherits another surface's binding state.

**Critical judgment:** the cardinality rules are this draft's vocabulary.
The stable claim they express is only that a projection relation is counted
per surface, that switching a panel's target is a replace operation rather
than an edit, and that displayed content from another execution is not that
relation.

## Creation and authorization

Three creation paths, all host-mediated:

| Path           | Direction                                                                                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User action    | The user points a panel at an execution (open a task view, inspect a running job). The host creates the binding under the user's own authority.                                           |
| Agent request  | An agent requests a decision surface; the host decides whether, where, and how it appears. An agent never opens, focuses, or rebinds panels by itself, and a request is not a permission. |
| Policy default | A Harness-level policy may define a default projection for new executions. This is Wheel policy over the host's surface model, not a Core invariant, and no default is selected here.     |

Creation checks compose with existing rules rather than adding mechanisms:
the creator's observation rights are checked when the surface materializes
output (a binding grants nothing), and generation checks apply to both sides
(a stale execution or a stale surface fails closed rather than rebinding).

## Lifecycle outcomes

The candidate outcomes table, phrased against the lifecycle events the
coordination record lists and their panel-side refinements:

| Event                                 | Binding outcome                                                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel hidden, moved, or detached      | Binding stays `active`. Presentation/attachment changes only; the execution target and authority stay fixed.                                             |
| Panel rebuilt (new generation)        | The old binding fails closed against the stale surface generation; reopening creates a fresh binding. Nothing resumes implicitly.                        |
| Panel destroyed                       | Binding becomes `closed`. The execution is unaffected and keeps running for other bindings or headless continuation.                                     |
| Execution ends                        | Binding becomes `retained`: read-only inspection of the recorded outcome and evidence. Not auto-closed — post-mortem review is a first-class use.        |
| Execution replaced (retry or new run) | The old binding closes; a replacement execution does not silently inherit bindings. A new binding is a new decision.                                     |
| Runtime restart                       | Bindings do not resurrect. Recovery may restore last-known binding metadata for inspection, but any resumption is a fresh binding at a fresh generation. |
| Agent death                           | Surviving bindings persist under surface-side policy: retained inspection stays until closed by its owner; nothing is destroyed because an agent died.   |

The last row mirrors the recorded transition in the other direction (an
agent may survive panel closure); the symmetric rule here is that a surface
may survive agent death without acquiring anything — the binding remains a
reference, and closing it remains a surface-side or user decision.

**Critical judgment:** the table is candidate direction. The stable claims
are the ones the corpus already fixes: presentation movement never moves the
execution, stale generations fail closed, and evidence survives the
participants.

## Single-authority record

Bindings must be queryable from both sides — "what projects this execution"
and "what does this surface project" — without becoming two independently
writable indexes. The candidate principle, reusing the coordination record's
own rule: derive both answers from one authoritative event/state record;
never maintain two records that can drift.

How that record is stored, and which side owns its authority, stays with the
open identity-domain question. This page records the principle and the
observable requirement only: a restart, a panel rebuild, or a crashed agent
must leave both queries answerable from the same facts, and a stale handle on
either side must fail closed.

## Attention routing intersection

One cross-topic rule belongs to this model because it presupposes a
projection to route to: an attention request from an agent — blocked work,
a consent request, a completion — should surface at the **projection the
user can actually see** (the active binding), not be broadcast to every
surface holding a binding, and not silently dropped when no surface exists
(the console or notification surface takes the request in that case). The
attention protocol's ownership and budget remain open elsewhere; this page
records only the routing target principle that a binding supplies.

## Security review

- A binding is a reference, never an authority: materializing output through
  any surface re-checks the observer's authorization, and no binding state
  substitutes for a consent record (PP-3, AG-4).
- Creation is host-mediated on all three paths: an agent request is a request,
  and "showing a decision surface is a request to the host, not permission
  for an agent to open arbitrary windows".
- Generation fencing on both sides means a stale surface or stale execution
  fails closed; implicit rebinding after a rebuild or restart is rejected.
- Retained bindings expose recorded outcome and evidence only, under the
  retention and redaction rules that already govern those records; they
  grant no new read scope to anyone.
- The routing-target rule for attention requests changes no budget or
  authorization rule; it is a placement rule, not a grant.

## Relation to existing systems

- **Execution ownership R1** (Draft): the disposition this page restates
  in vocabulary — optional projection without recreation. This page records
  no ownership change; a binding never becomes the execution's owner.
- **Agent coordination architecture** (Draft): panel model reconciliation,
  lifecycle-outcome rows, and the record principle are consumed by
  reference. Its open point on binding lifetime is pointed here; enforcement
  details stay open.
- **Panel and agent workspace boundary (candidate)** (Draft): the identity
  boundary and host-owned lifecycle are consumed by reference.
- **Execution supervisor (candidate)** (Draft): owner/subscriber vocabulary
  and dual generations are composed, not extended.
- **Wheel-to-runtime coupling (candidate)** (Draft): presentation-layer
  pointer only.
- **IPC and Agent RFC** (Accepted): unaffected; no wire, scope, or method is
  proposed here.
- **AI Architecture** (Draft): panels-as-views and identity separation are
  cited, not restated.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the model falsifiable before it constrains
`bitty-ai`.

| Campaign            | Required observation                                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reference not copy  | Closing or deleting a binding never deletes evidence, and a surface's recorded display never rewrites execution state, in reviewable tests.                                  |
| Cardinality         | Several surfaces hold independent bindings to one execution with independent fencing; a panel switching targets replaces rather than edits its binding, in reviewable tests. |
| Creation authority  | No agent-side path creates, focuses, or rebinds a projection without a host decision, and a binding grants no observer any new read scope, in reviewable tests.              |
| Generation fencing  | A rebuilt panel or a replaced execution leaves no implicit resume; stale handles fail closed on both sides, in reviewable tests.                                             |
| Retained inspection | An execution end transitions its bindings to retained read-only inspection that survives the participants' deaths, in reviewable tests.                                      |
| Single authority    | Both binding queries answer from one record across restart, panel rebuild, and agent crash, with no drifting second index, in reviewable fixtures.                           |
| Attention routing   | An attention request lands at the user-visible projection (or the console when none exists) and is never broadcast to every surface holding a binding, in reviewable tests.  |

Promotion needs independent AI architecture, coordination, terminal and
panel-owner, docs-curator, and security review. Route the binding vocabulary,
the cardinality rules, the lifecycle table, and the routing-target rule to
scoped owner tasks. This draft changes no normative contract and authorizes
no product code.

## References

- [Execution ownership R1](../architecture/execution-ownership-r1.md)
  (Draft): optional Panel projection, no-recreation attach; the disposition this page builds on.
- [Agent coordination architecture](../agent/agent-coordination.md)
  (Draft): panel reconciliation, lifecycle outcomes, record principle; its binding-lifetime open point is pointed here.
- [Panel and agent workspace boundary (candidate)](panel-workspace-candidate.md)
  (Draft): panel identity boundary and host-owned lifecycle.
- [Execution supervisor (candidate)](execution-supervisor-candidate.md)
  (Draft): owner/subscriber vocabulary and dual generations.
- [Wheel-to-runtime coupling (candidate)](wheel-to-runtime-coupling-candidate.md)
  (Draft): the four-layer coupling view; presentation layer consumes this binding vocabulary.
- [AI Architecture](../architecture/ai-architecture.md)
  (Draft): panels-as-views, identity separation and projection, generation binding.
- [IPC and Agent RFC](ipc-agent-rfc.md)
  (Accepted): the only accepted IPC wire and scope contract; unaffected here.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md)
  (Draft): AIQ-29 carrier; identity-domain ownership stays with the shared register.
