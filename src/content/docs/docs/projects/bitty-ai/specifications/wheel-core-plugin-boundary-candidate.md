---
title: Wheel core and plugin boundary (candidate)
description: Candidate Wheel core versus plugin boundary, Lua-to-Lua composition, and composition layering
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 63
---

# Wheel core and plugin boundary (candidate)

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification, accepted
decision, dependency selection, release commitment, or implementation claim.
It records the candidate direction for the Wheel core and plugin boundary: the
Core-versus-Plugin boundary table with the mechanism-versus-policy rule, model
management, UI, dashboard, tool packs, and memory as installable plugins,
Lua-to-Lua composition across a service bus and Bitty IPC with a dependency
graph, the `.wheel/` composition layer with global, project, and portable
layering, and `bitty-ai` as a possible meta package.

The recommendation is to treat every model below as a candidate input to the
draft [AI Architecture](../architecture/ai-architecture.md) and its related draft
dispositions, never as an override of the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) or the normative security corpus.
In particular, the boundary-table cell contents, the Lua API sketches, the
plugin names, the `.wheel/` file sketch, the dependency-declaration sketches,
the install command spellings, and the distribution-flavor names are **not**
accepted by this candidate design. Agent lifecycle, Agent events, and Agent
semantics in the direction are **discussion inputs only**: the accepted Agent
contract stays entirely with the RFC, which this draft references without
restating normatively. Nothing here is promoted to accepted status, and no
implementation is described as shipped.

The direction's strongest ideas are the mechanism-versus-policy rule (Core owns
mechanism, Plugins own policy, with compact timing, child-agent fan-out, and UI
shape as the three canonical policy examples), the two-layer Lua-to-Lua
composition model (same-process service calls versus cross-process IPC behind
one locality-transparent call shape), the model-gateway ignorance rule (Wheel
sees one generation interface while provider, credential, and subscription
churn stays inside a replaceable plugin), the minimal default tool set with
everything else arriving as Tool Provider plugins, and the
composition-as-distribution framing (a small Wheel kernel plus a plugin graph
resolved through `.wheel/`, with `bitty-ai` as one recommended composition
among possible flavors). Its weakest claims are the concrete Lua API
spellings, which are unreviewed interface vocabulary with no owner,
versioning, or compatibility evidence; the plugin and file names, which are
illustrative labels proposing no package, registry, or schema; the dependency
sketches, which name requirements without any resolver, version-range, lock,
or conflict semantics; and the install and flavor spellings, which propose no
command surface or release vehicle. Those are corrected below.

This synthesis references, without duplicating or modifying, the draft
[AI Architecture](../architecture/ai-architecture.md) (candidate inputs only),
[Context Management Architecture](../context/context-management.md),
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
carries the quality framing and the compiler design, and the companion
[Wheel-config and Git-model candidate design](wheel-config-and-context-git-model-candidate.md)
carries the `.wheel` configuration classes and the portable-capability split;
this draft links to both wherever decoupling touches configuration,
compilation, or storage, as design input rather than implementation. This
document creates no AIQ or OQ identifier and closes none.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Core-Plugin boundary and the mechanism rule

The retained framing treats `bitty-ai` as a distribution and assembly layer
with Wheel as its Harness kernel: Wheel owns only the minimum mechanism an
agent needs to run, and every remaining capability arrives as a Lua plugin
composition. The retained boundary keeps in Core the Agent Runtime (agent
lifecycle, state machine, tool-call loop), the Context Engine (message and
context representation, append, fork, checkpoint), the Tool Protocol (what a
tool is, parameter and result protocol, call lifecycle), the Plugin and
Service API (plugin capability registration, service discovery, dependency),
the Event Bus (agent, tool, panel, and model events), Capability and
Permission (whether an agent may call a capability), the Panel Bridge as a
minimal interface (get, create, and attach panels, with no UI ownership),
and the Model API as interface only (generation, streaming, and tool-call
abstraction). The retained boundary moves to Plugins model management
(multi-provider and subscription coverage), UI (chat, inline, floating,
command-palette forms), Dashboard (agent, task, token, context, tool, panel,
and resource state), Tool Packs (version-control, browser, syntax, language
server, database, container families), Memory (long-term, project, and user
forms), Context Strategy and Multi-Agent Strategy (both mostly plugin-side:
compaction, summarization, commander, planner, reviewer, and swarm shapes),
Observability (traces, metrics, token and cost, cache hits),
History and Persistence (log stores with export and import), the MCP and
Skills Adapter (`.agents/` ecosystem compatibility), the Policy Pack
(project rules, safety policy, resource limits), Provider Auth (OAuth, API
key, and subscription credentials), and Notification (desktop, terminal, and
webhook forms).

The load-bearing rule is kept verbatim in intent: **Wheel Core provides
mechanism, Plugins provide policy.** Core knows what a context is but never
decides when to compact; knows what an agent is but never decides when to
fan out child agents; knows what a panel is but never prescribes what chat UI
looks like. Durability follows from restraint: policy churn never forces a
Core change.

**Critical judgment:** the table is a candidate placement proposal, not an
adopted crate, package, or team split; several rows overlap dispositions
owned elsewhere (context strategy with the compiler work, multi-agent
strategy with coordination, persistence with the R-dispositions, policy with
the wheel-config-and-context-git-model classes). The stable claim is the mechanism-versus-policy rule
itself, which is the decoupling analogue of the wheel-config-and-context-git-model reference-not-copy
rule. Every row label is vocabulary proposing no interface.

## Lua-to-Lua composition in two layers

The retained correction narrows the direction's own earlier vocabulary: not all
Lua-plugin-to-Lua-plugin communication should be called IPC. Two plugins in
the same process and Lua VM should compose through a Service Registry, an
Event Bus, and a Capability API with direct calls and no serialization
round-trip; plugins separated by process or panel boundary compose through
Bitty IPC. The retained objective is one call shape that hides the
difference: a service call resolves to a direct call for a local service and
to an IPC remote call for a remote one, so a plugin never conditions its
logic on where its peer lives.

**Critical judgment:** the call spellings and service names are unreviewed
vocabulary proposing no API, and the locality-transparent routing they imply
needs its own failure, versioning, and authorization design before any
contract follows. The stable claims are the two-layer split (bus for
same-VM, IPC for cross-process) and the transparency objective, which keeps
plugin logic placement-independent.

## Dependency graph as a package graph

The retained direction lets installed plugins declare what they need: a UI
plugin requires the Wheel kernel with optional model and dashboard services,
a dashboard plugin requires Wheel with panel and event services, a model
composition fans out to per-provider plugins, and a tool composition fans
out to per-domain packs. The package-manager analogy is kept as motivation:
the installation set should resolve like a small dependency graph rather
than a flat copy list.

**Critical judgment:** the requirement spellings name no resolver, version
range, lockfile, or conflict semantics, and the tree labels are
illustrations, not a registry or packaging decision. The stable claim is
dependency honesty (plugins declare needs; the composition layer resolves
them), not any particular graph mechanics.

## Model management as an independent plugin

The retained direction promotes provider coverage from a field list to a
model gateway: one plugin family fronts commercial APIs, cloud model
platforms, aggregators, subscription harnesses, and local models, while
Wheel sees only a unified generation interface (messages, tools, and
reasoning posture in; model output out). Wheel never learns whether the
backing credential is an API key, an OAuth grant, a subscription session, or
a local endpoint. The churn rationale is kept: model ecosystems move faster
than any agent-harness core, so new models and authentication shapes should
upgrade a plugin, never the kernel.

**Critical judgment:** the interface sketch and the gateway name are
unreviewed vocabulary proposing no API or package; the provider and product
names are ecosystem illustrations the task did not verify, implying no
integration claim. Provider-side placement questions stay with
[Provider plugin boundary](../providers/provider-plugin-boundary.md). The stable
claims are the single-interface ignorance rule and the churn-containment
direction.

## UI, dashboard, tools, and memory as installable plugins

The retained UI direction separates the highest-churn, most personal layer
from the kernel: Wheel exposes agent, session, context, tool, and panel
operations over its bus, and any number of UI plugins (minimal, chat,
terminal, floating, editor-flavored, dashboard-flavored) consume them. An
agent may run headless in one panel while its UI lives in another, or one UI
may front agents across several panels, which is where the Bitty IPC
advantage applies. The retained tool direction turns whole plugins into Tool
Providers that each contribute a named capability set (version-control,
language, browser, database, container, and host-filesystem families as
illustrative examples), leaving Core with only a handful of primitive
capabilities such as process, filesystem, panel, and IPC, on which
everything else builds in the Unix small-core tradition. Dashboard and
Memory ride the same direction: resource and run-state presentation and
retained knowledge arrive as installable plugins beside Wheel rather than as
kernel weight, so a minimal installation can omit them entirely.

**Critical judgment:** the operation spellings, variant names, provider
names, capability labels, and layout diagrams are illustrations proposing no
API, package, or view. UI customization pressure is motivation, not evidence
for any particular split. The stable claims are UI independence from agent
placement, provider-shaped tool contribution, and the minimal-default
posture.

## `.wheel/` as the composition layer

The retained claim gives the project-level `.wheel/` directory a sharper job
than configuration alone: it is the composition that resolves an
installation into runtime behavior, with a single entry file plus
per-concern modules for plugins, models, tools, agents, policy, context, and
UI. Selection is declarative: a project names the plugins it wants and the
ones it refuses, and resolution composes the result. The layering rule is
kept: personal defaults live in the global Wheel configuration, the project
`.wheel/` overrides them, and `.agents/` keeps its cross-Harness portable
duties (skills, MCP material, agent definitions) so the two directories
never confuse composition with ecosystem interop.

**Critical judgment:** the file sketch is **illustrative, not an adopted
schema**: no filename, module split, field name, or disable semantic is
decided here. The single-entry contract and the reference-not-copy rule
already live as candidate directions in the companion
[Wheel-config and Git-model candidate design](wheel-config-and-context-git-model-candidate.md),
which this draft references instead of restating. The stable claims are the
composition role itself and the non-confusion rule between `.wheel/` and
`.agents/`.

## Global, project, and portable layering

The candidate layering keeps three scopes distinct: a global Wheel home
(`~/.config/wheel` at ) carries personal defaults, the
project `.wheel/` overrides them per repository, and `.agents/` stays
portable across harness implementations.
Owner direction (design-only, outside the Wheel decoupling direction except for the global
home itself) extends this into an explicit filesystem layout: global
configuration under the Wheel config home, mutable global material under the
platform data, state, and cache homes, and project-local runtime material
under a version-control-internal path that never enters the repository. That
extension is consistent with, and defers to, the wheel-config-and-context-git-model no-runtime-state
candidate rule that `.wheel/` itself stays commit-worthy: configuration is
reviewable, runtime data is not. The tildes and variable names are portable
placeholders, not adopted paths.

**Critical judgment:** no directory name, environment variable, or precedence
edge beyond the direction's global-overridden-by-project sentence is adopted;
the extended layout is a design input awaiting its owning task. The stable
claim is scope separation (personal versus project versus portable versus
runtime), not any path.

## `bitty-ai` as a meta package

The retained reframing demotes `bitty-ai` from a large plugin to an official
plugin distribution: a curated composition over the Wheel kernel plus model,
tool, UI, dashboard, context, memory, multi-agent, and observability
plugins. A minimal install yields only the harness; the recommended install
yields the curated set; later flavors (minimal, coding, research, full as
illustrative names) would differ only in composition, never in kernel code.
The closing thesis is kept as author opinion: the differentiator is not an
agent harness with plugin support but an agent harness composed of plugins,
summarized by the direction's formula of Runtime, Agent Kernel, Distribution,
Capability, Composition, Ecosystem Interop, and Glue.

**Critical judgment:** the tree, the install spellings, and the flavor names
are discussion direction proposing no package manager surface, registry,
release vehicle, or team boundary. The stable claim is the
distribution-over-monolith direction, which keeps every future capability
(plugin-shaped by default) from re-inflating the kernel.

## Owner addenda (design-only, outside the Wheel decoupling direction)

The three directions below come from the owning task description, not from
the candidate direction. Each is recorded here as owner direction for a future
scoped task:
design input only, proposing no schema, command, permission model, or
shipped behavior.

### Plugin ecosystem and scaffolding

Owner direction: the Wheel plugin ecosystem should converge on standard call
interfaces so independently authored plugins compose without pairwise
adaptation, and project scaffolding (`wheel init` with an in-harness `/init`
equivalent) should generate `.wheel/` starter templates shaped as plain
data-style tables that need no prior Lua knowledge. The candidate material
this builds on is limited to the Tool Provider contribution pattern and the
unified service-call objective above; the interface standard and the
scaffolding itself appear nowhere in the direction.

### `.wheel/` constraint surface

Owner direction: `.wheel/` should expose an explicit constraint surface for
projects, covering workspace-external access flags, tool, MCP, and skill
allowlists, compression and model configuration, tool and command denylists,
paths hidden from the agent, per-edit allow and deny rules, and per-prompt
versus unattended permission modes. This extends the wheel-config-and-context-git-model configuration
classes (filtering, policy, rules, verification, hooks) into an enumerated
surface; the enumeration itself is owner direction, and no field, flag, or
mode is adopted here. The per-prompt versus yolo (unattended) permission
modes are owner vocabulary for the two ends of the approval spectrum, not an
adopted mode contract. Enforcement placement and authorization semantics stay
with the security corpus and the R1 and R2 dispositions.

### Global configuration, data, cache, and runtime layout

Owner direction: the global and project-local filesystem split should be
made explicit as configuration under the Wheel config home
(`~/.config/wheel`, the candidate global home at ),
mutable material under the platform data, state, and cache homes
(`XDG_DATA_HOME`, `XDG_STATE_HOME`, `XDG_CACHE_HOME`), and project-local
runtime under a version-control-internal path (`.git/wheel`). Only the
global-home-versus-project precedence sentence is candidate direction (see the
layering section above); the data, state, cache, and runtime placements and
every precedence edge between them are design input for the owning task,
consistent with the commit-worthy-configuration direction. The tildes and
variable names are portable placeholders, not adopted paths.

## Provider observability as a design pointer

Owner direction, recorded as a design pointer with explicitly no `bitty-ai`
code change in this task: the provider side should expose cost, cache-hit,
input, context, and timing signals for future plugins, with the
Observability-plugin half of the boundary table above as the owning
destination. A future `AI-XXXX` task implements this against a real HTTP or
Router adapter; that task owns the endpoint, field, metric, and view
contract. No name or format sketched anywhere in the direction is adopted here.
This pointer complements, and does not duplicate, the compiler-side
observability direction (statusline, context, cache, why, and trace views)
carried in the companion
[Quality-formula and Context-Compiler candidate design](quality-and-context-compiler-candidate.md#provider-observability-as-a-design-pointer).

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered models are
candidate inputs only; the boundary-table placement, the Lua call shapes,
the plugin names, the `.wheel/` file sketch, the dependency declarations,
the install spellings, and the distribution tree proposed in the direction are
**not** accepted by this candidate design and must not be read as crate,
package, protocol, file-schema, or release decisions. Context assembly,
budget, and retention questions stay with
[Context Management Architecture](../context/context-management.md) and
[Context retention R3](../architecture/context-retention-r3.md); tool shape and transport
placement stay with
[Command and Tool Architecture](../architecture/command-tool-architecture.md) and
[Tool transport R2](../architecture/tool-transport-r2.md); provider questions stay with
[Provider plugin boundary](../providers/provider-plugin-boundary.md); execution and
environment questions stay with [Execution ownership R1](../architecture/execution-ownership-r1.md)
and [Panel environment awareness](../interfaces/panel-environment-awareness.md);
coordination and persistence questions stay with
[Agent Coordination Architecture](../agent/agent-coordination.md) and
[Task lifecycle R5](../architecture/task-lifecycle-r5.md). Configuration-class, trust,
and storage questions stay with the companion
[Wheel-config and Git-model candidate design](wheel-config-and-context-git-model-candidate.md);
each is referenced, never duplicated or modified.

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) defines the only
accepted IPC wire, scope, and Agent vocabulary. Every sketch name in the
candidate direction (Lua function spellings, service names, plugin names, file names,
field names, command spellings, flavor names) is a discussion sketch: this
draft records it as input and proposes no file schema, API, command, tool,
event, or wire format. Where the direction's sketches overlap RFC-owned ground
(Agent lifecycle, Agent events, Agent semantics, scopes), the RFC wins
without further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed redaction,
consented recording, secret minimization) override every discussion example
throughout this document. The plugin-composition sketches are conceptual vocabulary, not an
adopted authorization or distribution contract. This draft creates or closes
no AIQ or OQ identifier; open questions stay with
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the design falsifiable before any decoupling
proposal constrains `bitty-ai`.

| Campaign           | Required observation                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boundary           | A policy change (compact timing, fan-out count, UI shape) ships without touching Core, and a Core change ships without migrating plugins, in reviewable tests.      |
| Composition layers | A same-VM plugin pair composes without serialization while a cross-process pair reaches the same result through IPC behind one call shape, in reviewable tests.     |
| Dependency honesty | An undeclared peer is refused at resolution time with a reviewable error rather than failing mid-run, in reviewable tests.                                          |
| Gateway ignorance  | A provider credential shape changes (key to grant to subscription) with no Wheel change and no caller-visible difference, in reviewable tests.                      |
| UI independence    | An agent completes a scoped task headless while its UI renders from another panel, with no agent-side UI dependency, in reviewable tests.                           |
| Tool providers     | A contributed tool resolves with distinguishable provider identity and correctly scoped permission, in reviewable tests.                                            |
| Composition layer  | A project enabling one plugin and disabling another resolves to exactly that set with no ambient leakage, in reviewable tests.                                      |
| Layer precedence   | Project composition overrides personal defaults while portable capabilities migrate harnesses untouched, in reviewable tests.                                       |
| Distribution       | A minimal install runs the harness while the recommended composition adds exactly the curated set, with flavors differing only in composition, in reviewable tests. |
| Permission modes   | A per-edit denial holds in per-prompt mode and the unattended mode boundary is explicit and auditable, in reviewable tests.                                         |
| Provider pointer   | A future adapter task demonstrates cost, cache-hit, input, context, and timing signals flowing to a plugin surface with git-style attribution, with no Core change. |

Promotion needs independent AI architecture, context-management, terminal
and plugin-owner, docs-curator, and security review. Route boundary
placement, call shapes, plugin names, file sketches, dependency semantics,
install spellings, flavor contents, constraint fields, permission modes, and
the provider-signal contract to scoped owner tasks. This draft changes no
normative contract and authorizes no product code.
