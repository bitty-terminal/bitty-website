---
title: Lua and Core safety boundary (candidate)
description: Candidate four-layer architecture, agent ceilings, attenuation, commander, secret handles, and policy stack
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 56
---

# Lua and Core safety boundary (candidate)

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification, accepted
decision, dependency selection, release commitment, or implementation claim.
It records the candidate direction for the Lua versus Core safety boundary: the
four-layer architecture with the Lua-decides-how-not-whether principle,
agent-count ceilings with authority attenuation on spawn, child-agent capability
attenuation, Commander-as-a-Lua-concept with a Core vocabulary of eight generic
primitives, the secret-handle pattern, the Hard Safety versus Harness Policy
versus Strategy classification restricted to its `bitty-ai`-owned rows, the
permission intersection model restricted to the delegation, grant, and request
intersections `bitty-ai` computes, and the User-Hygiene split.

The recommendation is to treat every model below as a candidate input to the
draft [AI Architecture](../architecture/ai-architecture.md) and its related draft
dispositions, never as an override of the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) or the normative security corpus.
In particular, the `DelegationBudget` sketch, the `agent.spawn` capability and
budget sketches, the `PrivilegeRequest` sketch, the numeric ceilings (8, 4, 3,
6, 16), the concrete permission names, and the four-layer policy stack are
**not** accepted by this candidate design. Nothing here is promoted to accepted
status, and no implementation is described as shipped.

The direction's strongest ideas are the intersection-only authority rule
(a lower layer can only shrink authority, never expand it) with the
`Capability(child) ⊆ Capability(parent)` attenuation invariant, the
Commander-as-Lua-concept vocabulary cut (Core knows only Agent, Task, Grant,
Budget, Delegation, Mailbox, Execution, and Lease), the secret-handle pattern
(secret values never enter Agent context, logs, or panels), and the
mechanism-in-Rust plus organization-model-in-Lua placement (the official
harness is one Lua composition among many, while Core primitives stay
fixed). Its weakest claims are the concrete numeric ceilings (8, 4, 3, 6, 16
and the worked effective values 3 and 4), which are illustrations with no
measurement, sizing, or product evidence; the `DelegationBudget` struct
sketch, whose fields and enforcement placement are unreviewed interface
vocabulary; the four-layer policy stack, which is a staging opinion with no
owner, milestone, or compatibility evidence; and the raw-escape-hatch
restriction note (`os.execute`, `io.open`), which names a Lua-sandbox
mechanism that has no owner, scoping rule, or review evidence. Those are
corrected below.

This synthesis references, without duplicating or modifying, the draft
[AI Architecture](../architecture/ai-architecture.md) (candidate inputs only),
[Execution ownership R1](../architecture/execution-ownership-r1.md),
[Tool transport R2](../architecture/tool-transport-r2.md),
[Provider plugin boundary](../providers/provider-plugin-boundary.md), and
[Panel environment awareness](../interfaces/panel-environment-awareness.md) (references
only). The accepted [IPC and Agent RFC](ipc-agent-rfc.md) is unaffected by
this draft. The unmerged-candidates comparison added under CTX-0047 in the AI
Architecture stays consistent with this draft; this draft references that
comparison and re-decides nothing. This document creates no AIQ or OQ
identifier and closes none.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Four-layer architecture and the Lua-decides-how principle

The retained architecture stacks four layers: the `bitty` host security,
execution, panel, filesystem, and PTY layer as the unbypassable hard
boundary; the `bitty-ai` Agent, Task, Delegation, Budget, and Capability
layer as the AI-semantics hard constraint; the Lua Harness workflow, strategy,
scheduling-policy, and UX layer as freely composable policy that cannot widen
authority; and the User and Project policy layer (`~/.config/bitty`,
`.wheel`) as further tightening within the ranges the upper layers allow. The
load-bearing sentence is kept as a principle: **Lua decides how work is done,
not whether it is permitted.**

**Critical judgment:** the layering and the principle are retained as
candidate objectives consistent with the plugin-extension-model non-inheritance direction and
the execution-supervisor enforcement-versus-coordination split; the per-layer mechanism
assignments (which enforcement lives exactly where) are proposals. The stable
claim is only the negative (Lua never self-authorizes) plus the ordering
(tighter layers compose by intersection, never by override).

## Agent-count ceilings and authority attenuation on spawn

The retained model keeps two rules. First, the effective agent count is the
intersection of ceilings: the host ceiling, the user policy, the project
policy, and the Lua request combine to the strictest value, so a Lua request
for 6 against ceilings of 8, 4, and 3 yields 3. Second, spawning follows
authority attenuation: a Commander holding a budget of 4 agents delegates
within that budget, and a child agent cannot fan out to dozens of child agents
beyond what its parent granted. The `DelegationBudget` vocabulary (maximum
children, maximum depth, maximum parallelism, token budget, cost budget,
execution budget) is retained as the `bitty-ai`-side enforcement vocabulary,
with Lua scheduling only inside the granted budget.

**Critical judgment:** the intersection rule and the attenuation invariant
are retained as candidate inputs; every number in the direction (8, 4, 3, 6, 16
and the effective values 3 and 4) is an illustration with no sizing evidence,
and the struct shape is an unreviewed sketch. The stable claims are
shrink-only composition and runtime (not Lua) enforcement of spawn budgets.

## Child-agent capability attenuation

The retained rule forbids permission copying down the spawn tree: each child
receives a subset of its parent's capability, narrowing filesystem scope
(repository to `src/parser/**` to read-only `src/parser/**`), execution
scope (build and test to parser tests to tests only), and agent budget (4 to
1 to 0). Lua workflows may name profiles (such as a readonly reviewer), but
the actual attenuation is performed by the `bitty-ai` authority engine, never
by the spawning parent's promise.

**Critical judgment:** the subset invariant is retained as a candidate
consistent with the plugin-extension-model permission non-inheritance principle; the profile
names, scope syntax, and budget values are illustrations. The stable claim is
that attenuation is enforced above Lua, so a compromised or buggy parent
cannot widen its children.

## Commander as a Lua concept

The retained cut keeps role vocabulary (Commander, Planner, Researcher,
Reviewer, Debugger, Architect, and any future team shape such as flat swarm,
manager-worker, planner-executor-reviewer, debate, MapReduce, pair
programming, or RACI) entirely in Lua, while Core knows only eight generic
primitives: Agent, Task, Grant, Budget, Delegation, Mailbox, Execution, and
Lease. New team shapes compose in Lua without Core changes, and the official
harness is one Lua composition among many.

**Critical judgment:** the vocabulary cut is retained as a candidate input
consistent with the execution-supervisor agnosticism rule (no agent or task ontology in the
host); the primitive list is discussion vocabulary, not an adopted Core API,
and the team-shape list is illustration. The stable claim is only that
organization models live above the mechanism layer.

## Secret-handle pattern

The retained pattern keeps secret values out of Agent context, execution
logs, Lua logs, and panel history. The agent holds only an opaque handle
(such as a secret URI); the host credential store injects the value into the
child process environment at spawn time. This replaces prompt-discipline
rules ("do not print the key") with a mechanism the model cannot bypass by
accident or instruction.

**Critical judgment:** the handle direction is retained as a candidate
consistent with the normative secret-minimization obligations; the URI shape,
store placement, and injection mechanics are undecided and need security
review. The stable claim is the negative (raw values in Agent-visible state
are rejected) plus the injection point (host to process environment, never
through Agent context).

## Hard Safety versus Harness Policy versus Strategy

Only the `bitty-ai`-owned rows are retained; the `bitty`-owned and config
rows are recorded as exclusions below. The retained rows are: the maximum
agent count as a hard ceiling composed with policy (`bitty-ai` plus Lua); the
maximum child-agent depth as a hard ceiling (`bitty-ai`); the task token and cost
budget as a hard budget (`bitty-ai`); and task delegation as AI semantics
plus policy (`bitty-ai` plus Lua). Above the hard rows sit composable policy
and, above that, agent-selectable strategy: hard safety cannot be broken,
policy composes in Lua, and strategy chooses within policy.

**Critical judgment:** the three-way classification is retained as a
candidate framing; the row assignments to `bitty-ai` are the retained
content, while the table's remaining rows and the layering sentences are
boundary context. No row here adopts an enforcement mechanism or a numeric
default.

## Permission intersection model

Only the `bitty-ai` intersections are retained: a Lua plugin's spawn request
is a request, never a grant, and the effective capability is the intersection
of the host ceiling, user policy, project policy, parent delegation, task
grant, and agent request, where each lower layer can only narrow authority.
The illustration is kept: user scope `project/**` narrowed by a Commander to
`project/src/**` cannot be re-widened to `project/**` by a Worker request.
The four-layer stack (Lua Harness policy, Project policy, User policy, Host
Security ceiling) is retained as the composition order for that intersection,
with priority meaning strictest-wins rather than lower-overrides-upper.

**Critical judgment:** the shrink-only rule is among the strongest claims
and is retained as a candidate consistent with the plugin-extension-model non-inheritance
principle; the six-factor formula and the stack diagram are framing, not an
adopted authorization algorithm. Enforcement placement for the host, user,
and project factors stays with their owners; `bitty-ai` computes only the
delegation, grant, and request intersections.

## User-Hygiene split

The retained split separates technically preventable cases, which the system
must handle (sudo requests need confirmation, `.env` reads are denied,
suspected token output is redacted, oversized worker fan-out is denied), from
user-only hygiene, which the system cannot fully control (a user pasting a
password directly into input that the agent has already received). For the
second class the system still mitigates with warnings, redaction, no
persistence, and no logging, and may show do-not-paste hints for passwords,
private keys, API keys, and recovery codes, but system safety must never
depend on the user being security-aware.

**Critical judgment:** the split is retained as a candidate consistent with
the normative minimization and redaction obligations; the example bindings
(which case gets confirmation versus deny versus redact) are illustrations,
and the hint list is a UI proposal. The stable claim is the ordering (system
guarantees first, user education only for what the system cannot control).

## Controlled-request Lua API direction

The retained direction shapes every Lua harness call (`agent.spawn`,
`execution.run`, `panel.acquire`, `fs.read`) as a controlled request through
one authorization path, never as a raw capability: a runaway or malicious
harness loop meets `BudgetExceeded` denials instead of exhausting the machine.
The primitives list (Agent, Task, Delegation, Capability, Budget, Execution,
Panel lease, Context, Provider, Mailbox and event primitives) is retained as
the mechanism surface Core must provide so that any harness composition,
official or community, stays inside capability, budget, resource, secret,
filesystem, privilege, execution, and lease boundaries. The closing sentence
is kept as a principle: **agent behavior norms largely belong to Lua, while
agent hard boundaries must never belong to Lua.**

**Critical judgment:** the controlled-request direction is retained as a
candidate; the call shapes, budget fields, error names, and primitive list
are unreviewed vocabulary proposing no wire or API. The raw-escape-hatch
restriction is the weakest claim here (no sandbox owner, scoping rule, or
review evidence) and is recorded as a proposal needing its own task.

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered models are
candidate inputs only; the four-layer policy stack, the `DelegationBudget`
shape, the numeric ceilings, and the spawn capability vocabulary proposed in
the direction are **not** accepted by this candidate design and must not be read as
crate, package, protocol, or release decisions. Delegation semantics,
child-agent attenuation, and task token and cost budgets stay with the draft
architecture and its coordination dispositions; execution enforcement stays
with [Execution ownership R1](../architecture/execution-ownership-r1.md); tool
authorization and transport placement stay with
[Tool transport R2](../architecture/tool-transport-r2.md); provider questions stay with
[Provider plugin boundary](../providers/provider-plugin-boundary.md); panel environment
semantics stay with
[Panel environment awareness](../interfaces/panel-environment-awareness.md). Each is
referenced, never duplicated or modified.

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) defines the only
accepted IPC wire, scope, and Agent vocabulary. Every name in the direction
(`DelegationBudget`, `max_children`, `max_depth`, `max_parallel`,
`token_budget`, `cost_budget`, `execution_budget`, `agent.spawn`,
`execution.spawn`, `execution.run`, `panel.acquire`, `fs.read`,
`PrivilegeRequest`, `BudgetExceeded`, `ResourceLimitExceeded`,
`ExecutionBudgetExhausted`, `ConcurrencyLimitReached`, and similar) is a
discussion sketch: this draft records it as input and proposes no command,
tool, event, or wire format. Where the direction's sketches overlap RFC-owned
ground (Agent lifecycle, Agent events, Agent semantics, scopes), the RFC wins
without further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed redaction,
consented recording, secret minimization) override every discussion example
throughout this document. The direction's capability names (filesystem, exec, agents), path
patterns, permission examples, and console-style ceilings are conceptual
vocabulary, not additions to any accepted registry, schema, or protocol. This
draft creates or closes no AIQ or OQ identifier; open questions stay with
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the design falsifiable before any
safety-boundary proposal constrains `bitty-ai`.

| Campaign              | Required observation                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intersection rule     | A Lua request exceeding any host, user, project, delegation, or grant ceiling is denied, and no lower layer re-widens authority in reviewable tests.                   |
| Spawn attenuation     | A child agent cannot exceed its parent delegation budget in count, depth, parallelism, tokens, cost, or execution, enforced by the runtime rather than by Lua promise. |
| Child-agent narrowing | Each spawned generation holds a subset of its parent capability, with filesystem, execution, and agent factors all narrowing or equal in reviewable tests.             |
| Role vocabulary       | A new team shape ships in Lua with no Core change, and Core code and identifiers carry no role ontology in review.                                                     |
| Secret handles        | A secreted workflow completes with no raw secret value in Agent context, execution logs, Lua logs, or panel history in reviewable tests.                               |
| Budget ceilings       | Agent-count, depth, token, and cost ceilings hold under a spawn loop, surfacing budget denials instead of machine exhaustion.                                          |
| Boundary enforcement  | An AI-side bug or compromised agent cannot exceed its granted delegation capabilities, because the runtime enforces every sensitive spawn independently.               |
| Hygiene ordering      | A technically preventable violation is blocked or redacted by the system, while a pasted user secret triggers warning, redaction, no-persist, and no-log mitigations.  |

Promotion needs independent AI architecture, execution-owner, terminal and
plugin-owner, docs-curator, and security review. Route budget values, struct
and envelope shapes, call and error names, scope syntax, profile names, stack
ownership and milestones, and the Lua-sandbox restriction to scoped owner
tasks. This draft changes no normative contract and authorizes no product
code.
