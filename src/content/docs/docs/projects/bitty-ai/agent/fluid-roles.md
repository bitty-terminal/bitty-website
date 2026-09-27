---
title: Fluid roles doctrine
description: Solo-by-default execution with Commander-led specialist teams for large tasks, fluid roles and models, and Git-style collaboration
category: architecture
audience: contributor
document_type: overview
status: draft
website_publish: false
sidebar_order: 34
---

# Fluid roles doctrine

## Purpose and scope

This overview states the working doctrine for how the chatting agent
organizes work: solo execution by default for small tasks, a
Commander-led team of specialist agents for large tasks, fluid rebinding
of roles and models by task phase, and Git-style collaboration
discipline throughout. It covers the task-shape decision rule, the
Commander and specialist seats, fluidity bounds, and collaboration
principles. Mechanism detail (budgets, leases, supervision, review
separation) lives in [Agent coordination architecture](agent-coordination.md);
this doctrine adds no new mechanism.

## Solo by default

Small tasks run solo: the chatting agent does the work directly without
spawning a team. Demo-scale work is the reference shape: one coherent
change, one verification step, bounded blast radius, reversible on
failure. Examples are answering a question, writing a demo, fixing a
typo-level defect, or drafting a single document section.

The reason is cost. Spawning specialists, reserving budgets, and running
review handoffs cost coordination latency and tokens; below a threshold
of task size that cost exceeds any parallelism or separation benefit. A
solo agent still verifies its own work with the same local gates it
would demand of a specialist, and still records progress, decisions, and
checkpoints in the durable project record.

## Team mode for large tasks

Large tasks run as a team. The reference shape is work spanning
design, implement, test, and deploy or ops: any task whose phases need
different skills, disjoint scopes, or independent verification. The
chatting agent takes the Commander, Leader, or Planner seat: it
decomposes the task, dispatches scoped specialist agents (implement,
test, ops, and others as the phases require), integrates their results,
and owns acceptance.

The seats carry fixed accountability. The Commander plans, dispatches,
and integrates, and never delegates accountability for the outcome.
Each specialist owns one disjoint scope and reports compact evidence,
not raw transcripts. Implementation, independent review, and final
acceptance stay separated: the reviewer differs from the implementer,
reads the requirement and the evidence rather than only the author's
summary, and records defects as tracked follow-up work instead of
silently fixing them.

## Fluid roles and models

Roles are hats, not identities. The same agent may plan in one phase,
implement in the next, and review in another; seats rebind as the task
moves through design, implement, test, and deploy or ops. A Commander
may do a bounded solo implementation step when dispatching would cost
more than doing, and a specialist may be promoted to lead a sub-team
for its phase when its delegation profile permits it.

Models are rebindable on the same basis: each phase uses the model that
fits its demands, such as strong reasoning for design and review and
fast execution for routine implementation. Fluidity has fixed bounds
taken from the coordination architecture. Rebinding never widens
authority: child authority stays attenuated, and a new seat or model
grants no capability the assignment did not already carry. Reviewer
independence survives rebinding: a reviewer needs separation from the
implementer in requirement and evidence, not merely a different role
label or model name. Budget attribution follows the assignment
generation, so a rebound agent cannot spend a budget its parent already
handed down.

## Git-style collaboration principles

Teamwork follows the same discipline as version control. One task owns
one scoped branch and worktree (`ctx-XXXX/<type>-<slug>`), so parallel
work never shares a writable scope. Scopes stay disjoint; a needed
change outside the assigned scope goes back to the Commander for
re-scoping rather than being taken silently. Integration happens in
small reviewed batches: independent review plus green verification
gates precede every merge, merges stay squash-based with the branch
removed, and each merge closes its issue, records a checkpoint, and
completes its task. Handoffs are explicit and attributed: ownership
changes, uncertain effects, and open risks transfer by record, never by
implication.

## Relation to existing systems

This doctrine is orientation and rationale; normative mechanism detail
stays with the specifications it links. [Agent coordination
architecture](agent-coordination.md) defines identity separation,
service supervision, delegation budgets, review separation, and panel
lifecycle, and constrains every proposal here, including its deferral
of automatic promotion from small tasks to a full organization runtime.
The accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md)
overrides any conflicting direction, and the AI architecture rules on
least privilege at dispatch and orchestration-versus-execution bound
the Commander and specialist seats.

## References

- [Agent coordination architecture](agent-coordination.md) (Draft):
  supervision, delegation, teams, review separation
- [AI Architecture](../architecture/ai-architecture.md) (Draft):
  least privilege at dispatch, orchestration versus execution
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted):
  panel lifecycle and IPC contracts
