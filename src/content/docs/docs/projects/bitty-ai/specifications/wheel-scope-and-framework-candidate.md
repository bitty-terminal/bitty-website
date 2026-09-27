---
title: Wheel scope and framework illustration (candidate)
description: Candidate Wheel Coding scope reconciliation, provider and streaming illustrations, and packaging notes
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 64
---

# Wheel scope and framework illustration (candidate)

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification, accepted
decision, dependency selection, release commitment, or implementation claim.
It records the candidate direction for Wheel scope and framework illustration:
Wheel scoped to the Coding Agent Harness (a fixed Coding domain, open roles,
non-goals, a staged MVP, and shared primitives), public plugin contracts and
layered Lua frameworks whose model/provider, tool-schema, and streaming
conclusions are owner-pending illustrations for the AI and Wheel owners, and
Bitty plugin package management with Lux for Lua dependencies, whose AI-side
notes are narrow and mostly owner-pending.

The recommendation is to treat every model below as a candidate input to the
draft [AI Architecture](../architecture/ai-architecture.md) and its related draft
dispositions, never as an override of the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) or the normative security corpus.
In particular, the fixed-Coding-domain wording, the Non-goals text, the staged
MVP, the shared-primitive list, the service and interface sketches, the event
and field names, the manifest, lockfile, and CLI spellings, and the install
and flavor spellings are **not** accepted by this candidate design. Agent
lifecycle, Agent events, and Agent semantics in the candidate direction are **discussion
inputs only**: the accepted Agent contract stays entirely with the RFC, which
this draft references without restating normatively. Nothing here is promoted
to accepted status, and no implementation is described as shipped.

The candidate direction's strongest ideas are the fixed-Domain-open-Role composition rule
(one unified Agent primitive, roles as configuration rather than a class
explosion), the anti-premature-abstraction rule (generalize only from two real
implementations), the typed schema-backed contract direction with distinct
dependency kinds (package dependency versus service requirement), the
async-first streaming direction with explicit cancellation and lifecycle
semantics, and the host-services rule for native needs (route native
capabilities through host Rust services rather than vendored native code). Its
weakest claims are the concrete interface and call spellings, which are
unreviewed vocabulary with no owner, versioning, or compatibility evidence;
the sample event names, which must not become a competing protocol beside the
canonical event schema; the manifest, lockfile, CLI, install, and flavor
spellings, which propose no adopted schema or command surface; and the staged
MVP, which is a roadmap opinion with no milestone evidence. Those are
corrected below.

This synthesis references, without duplicating or modifying, the draft
[AI Architecture](../architecture/ai-architecture.md) (candidate inputs only, including the
CTX-0047 unmerged-candidates comparison, which is reconciled here and
re-decided nowhere),
[Provider plugin boundary](../providers/provider-plugin-boundary.md),
[Caller attribution design](../agent/caller-attribution-design.md),
[Command and Tool Architecture](../architecture/command-tool-architecture.md),
[Context Management Architecture](../context/context-management.md),
[Agent Coordination Architecture](../agent/agent-coordination.md),
[Execution ownership R1](../architecture/execution-ownership-r1.md),
[Context retention R3](../architecture/context-retention-r3.md),
[Task lifecycle R5](../architecture/task-lifecycle-r5.md),
[Tool transport R2](../architecture/tool-transport-r2.md), and
[Panel environment awareness](../interfaces/panel-environment-awareness.md). The accepted
[IPC and Agent RFC](ipc-agent-rfc.md) is unaffected by this draft. The
companion
[Wheel core and plugin boundary candidate design](wheel-core-plugin-boundary-candidate.md)
carries the mechanism-versus-policy rule, the model-gateway ignorance rule,
and the composition-as-distribution framing; the companion
[Wheel-config and Git-model candidate design](wheel-config-and-context-git-model-candidate.md)
carries the configuration classes, the reference-not-copy rule, and the trust
direction; and the companion
[Quality-formula and Context-Compiler candidate design](quality-and-context-compiler-candidate.md)
carries the quality framing and the compiler design. This draft links to each
wherever scope, contracts, or packaging touch them, as design input rather
than implementation. This document creates no AIQ or OQ identifier and closes
none.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Wheel scope reconciliation (reconcile, not re-decide)

### Recorded scope statements

- **S1, fixed Domain with open Roles.** Wheel is Bitty's official Agent
  Harness plugin scoped to software engineering only. Domain is fixed to
  Coding while Role stays open (Primary, Commander, Coding, Review, Debug,
  Research) over one unified Agent primitive of role, model, tools,
  permissions, context, budget, and workspace. Roles are configuration, never
  a class explosion.
- **S2, Non-goals.** Wheel is not a personal AI assistant, not a
  general-purpose autonomous agent, not a messaging gateway, not an
  email or calendar assistant, not home automation, not a lifelong
  user-memory system, not a cron or automation daemon, and not a general
  cloud-management agent.
- **S3, separate future agent plugins.** Personal and Office agents are
  separate future plugins, never Wheel scope. A Personal Agent centers on the
  user (memory, calendar, email, browser, cloud, cron, notifications, OAuth,
  vault, multi-device sync) with lifelong user-centric memory; an Office
  Agent centers on documents, spreadsheets, slides, email, calendar, and
  approvals with stronger external side effects and a different permission
  model; Wheel keeps project-centric memory instead.
- **S4, anti-premature-abstraction.** Do not design a Universal Agent API for
  an imagined Personal Agent; generalize only from two real implementations.

### Recorded architecture candidates

- **C1, role and composition orthogonality** (`ai-architecture.md:881-906`).
  The candidate composition is Agent as Identity plus Role plus Policy plus
  Capabilities plus Model Routing plus Memory plus Workspace plus Tools plus
  Lifecycle, with role, model, capability, tool, and context policy fully
  orthogonal. Its closing sentence states that non-coding agents (research,
  operations, or personal-assistant agents) are the same composition,
  differing by role, tools, model routing, and policy values rather than by a
  separate mechanism.
- **C2, harness-family classification** (`ai-architecture.md:216-220`). The
  comparative-positioning table groups Hermes-style and OpenClaw-style systems
  as an autonomous-or-background-agent family and contrasts them with the
  candidate Bitty direction of spatial, reviewable role panels with
  per-role capability and generation-scoped consent.
- **C3, agent growth pipeline** (`ai-architecture.md:911-941`). A
  hermes-style improving agent is recorded as a host-mediated pipeline
  (observation to memory to recipe to skill to policy proposal) with proposal
  rather than mutation, no capability gain through learning, reviewable
  artifacts, and composition with the existing planes.
- **C4, unmerged layering candidates** (`ai-architecture.md:361-393`, added
  under CTX-0047). The plugin-extension-model extension-point layering and the IPC-extension-boundary Capability
  Layer are compared without merging and without accepting either; the merge
  decision is explicitly deferred pending named evidence (an owner for each
  layer, a packaging contract, a versioning and compatibility policy, and IPC
  transport maturity).

### Reconciliation

- **R1, S1 and C1 operate at different layers.** S1 scopes the Wheel
  product and plugin (what ships as Wheel); C1 describes the generality of
  the Agent composition primitive (what the formula can express). Both
  statements can hold at once: the primitive may compose non-coding agents
  while Wheel-the-product stays Coding-scoped. This draft records the
  layering and decides nothing about whether the primitive's generality ever
  becomes a supported non-coding surface.
- **R2, S3 is consistent with C1's closing clause and with C4's deferral.**
  New agent families arrive as separate future plugins and compositions,
  never as Wheel scope creep and never through a silent merge of the
  unmerged layering candidates. The C4 merge, coexistence, or drop decision
  stays deferred pending its named evidence.
- **R3, the family classifications agree.** The family classification of Hermes
  and OpenClaw as autonomous or background systems distinct from a coding
  copilot agrees with the C2 table row; this draft records the agreement and
  re-decides nothing about either family.
- **R4, C3 is compatible with S4.** The growth pipeline is host-mediated and
  capability-capped (an agent can grow but cannot grow an ungranted
  capability), which is the same restraint S4 demands: no universal trait
  with ambient powers is introduced for a hypothetical agent. Whether learned
  skills become durable project data stays undecided with its owning
  question; this draft changes nothing there.

Deferred, explicitly not decided here: owner approval of the Coding-only
scope and the Non-goals text; whether the staged MVP becomes the Wheel
roadmap; whether the C4 candidates merge, coexist, or one is dropped. The
The destination routing stands: the scope plus Non-goals block belongs to the
Wheel repository's own documents under a Wheel-owner task, and the
user-centric memory and daemon-lifecycle requirements belong to a future
personal-agent plugin repository that does not exist yet.

## Staged Wheel MVP as roadmap input

The retained direction stages Wheel from a single Primary Coding Agent with
panel, worktree, process, LSP, and task awareness, through a Primary plus
delegated child Agents with resource budgets, permissions, typed results, progress notes,
and task and worktree binding, to a Commander that plans, assigns, monitors,
reviews, and merges. Each stage narrows the same fixed Coding domain rather
than widening it.

**Critical judgment:** the staging is retained as a roadmap opinion, not an
adopted plan; whether stages 1 through 3 become the Wheel roadmap is an open
owner item. The stage vocabulary (budgets, permissions, typed results,
progress notes, bindings) proposes no schema and stays consistent with the
Lua-core-safety-boundary attenuation direction and the R1 and R5 dispositions, which this draft
references instead of restating.

## Shared primitives and anti-premature-abstraction

The retained direction lets Wheel plus separate future personal and office
agent plugins share Bitty Agent Primitives (agent, session, job, and task
identity; Agent runtime and context; tool and tool registry; permission and
capability; resource budget; agent event, handle, and lifecycle; provider;
context store and artifact; job and job result) plus Bitty-native panel,
workspace, PTY, process, IPC, worktree, and LSP surfaces.

**Critical judgment:** the list is retained as vocabulary proposing no crate,
package, team split, or API. The load-bearing rule is S4: no Universal Agent
API is designed for an imagined second agent; shared extraction waits for two
real implementations. Owner approval of the split and the extraction timing
stays with the Wheel and future-plugin owners.

## Model, tool, and streaming illustrations as owner-pending (AI slice)

### Provider abstraction as illustration

The retained illustration fronts model access behind one replaceable provider
abstraction so that provider, credential, and subscription churn stays inside
a replaceable plugin while callers see a stable generation surface. This
matches the model-gateway ignorance direction already carried by the
companion [Wheel core and plugin boundary candidate design](wheel-core-plugin-boundary-candidate.md) and the
Router transport plus two-level plugin model in
[Provider plugin boundary](../providers/provider-plugin-boundary.md); this draft adds
no interface and duplicates neither.

**Critical judgment:** the illustration does not establish Wheel ownership of
model infrastructure and proposes no accepted tool or provider interface. The
provider and product names in the direction are unverified ecosystem
illustrations implying no integration claim. Provider selection,
substitution, and credential mechanics stay with the provider-boundary owner.

### Tool schemas and registries as illustration

The retained direction makes contracts checkable through explicit request,
response, and event shapes with versioning and tooling hints, lets one
service interface admit multiple conforming implementations, and discovers
user-defined tools through public registration rather than source location.
Consumers depend on the declared contract, never on the provider's repository
layout or implementation language.

**Critical judgment:** no schema, registry, or discovery mechanism is adopted
here. A declared service requirement is not a permission grant: tool
authorization and transport placement stay with
[Command and Tool Architecture](../architecture/command-tool-architecture.md) and
[Tool transport R2](../architecture/tool-transport-r2.md), and the permission
non-inheritance direction from the plugin-extension-model candidate design still applies. The
deterministic tool-schema direction stays consistent with the prefix-cache
design's determinism requirement, which this draft references instead of
restating.

### Streaming normalization as illustration

The retained direction proposes async-first calls with standardized streaming
across providers, where local shortcuts must neither bypass enforcement nor
pretend remote calls are ordinary synchronous calls that can block the UI or
event loop.

**Critical judgment:** the await, promise, coroutine, callback, and
stream-iteration spellings are alternatives under discussion, not accepted
SDK methods or evidence of runtime support. Provider stream normalization
must reconcile with the owning canonical event schema (the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) and the Rich streaming fragments in
the draft architecture) rather than installing the sample event names as a
competing protocol. Cancellation and lifecycle behavior must be defined
explicitly in any accepted contract; both stay open with the owning tasks.

### Context, memory, workflow, and multi-agent pointers

Context and memory composition, workflow layering, and multi-agent
orchestration appear in the direction only as illustrations of reusable
framework layers above a narrow SDK. This draft records them as pointers:
context assembly and retention stay with
[Context Management Architecture](../context/context-management.md) and
[Context retention R3](../architecture/context-retention-r3.md); coordination stays with
[Agent Coordination Architecture](../agent/agent-coordination.md); lifecycle stays
with [Task lifecycle R5](../architecture/task-lifecycle-r5.md). No agent lifecycle is
established here.

### Layering and authority guardrails

The retained guardrails are: ordinary `require` is for private modules inside
one plugin while cross-plugin consumers use declared public services or
mediated proxies; repositories are publication boundaries and versioned
service contracts are architectural boundaries; the stack runs from Rust
enforcement and mechanisms through a narrow public Lua SDK to replaceable
optional framework plugins and finally application plugins; and accepted
security requirements plus lifecycle schemas override the speculative
service methods, coroutine and stream interfaces, custom event vocabulary,
and SDK facility lists. Framework wrappers cannot bypass host enforcement,
and process execution, agent spawning, IPC, networking, and credentials are
illustrative mechanism needs, never ambient access.

## Packaging AI-side notes

- **Native needs route through host services.** The sandbox admits only a
  defined pure-Lua dependency subset with no native code, no arbitrary
  process execution, and no dynamic native loading; native needs (storage is
  the named example) route through host Rust services. This draft records
  the rule as a pointer to the storage and service dispositions and adopts
  no subset definition, loader, or service contract.
- **Build-time versus runtime split.** Lux is confined to development and
  packaging (declare, resolve, vendor, pack) so end-user installs need no
  Lux toolchain and artifacts ship pre-resolved. Reproducibility, startup
  speed, security, offline install, sandboxing, and version consistency are
  recorded as aims, not as adopted artifact or lockfile formats.
- **Trust-prompt boundary.** Project composition declarations never
  auto-install or execute plugins on repository entry; declarations prompt
  for explicit user trust first. This draft records the boundary as
  consistent with the wheel-config-and-context-git-model no-silent-execution trust direction and adopts
  no prompt UX.
- **Two graphs behind one CLI.** The Bitty plugin graph (Bitty-managed) and
  the Lua package graph (Lux-resolved) stay distinct behind unified
  user-facing commands, with a user-side plugin lock plus a build-side Lua
  lock baked into the artifact. No manifest field, lockfile shape, or
  command spelling is adopted here.

Everything else in the candidate direction (manager ownership, manifest and permission
model, resolver and loader boundaries, the Lua subset definition, the
build-time Lux flow, registry and index scope) routes to the core, plugin,
SDK, and packaging owners as owner-pending pointers below.

## Owner-pending pointers

The rows below route conclusions this candidate design does not cover. They are
pointers with inline summaries, not links and not decisions.

| Topic                                                                                   | Owning destination                                                                   |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Wheel scope plus the Non-goals block into the Wheel repository documents                | Wheel owner task; owner approval pending                                             |
| User-centric and lifelong-memory plus daemon-lifecycle requirements                     | Future personal-agent plugin repository, which does not exist yet; no task tracks it |
| Shared-primitive extraction timing                                                      | Wheel plus future-plugin owners; deferred until a second real implementation exists  |
| Host enforcement and SDK boundaries                                                     | Core and SDK documentation owners                                                    |
| Dependency and service contracts plus optional framework composition                    | Plugin documentation owners                                                          |
| UI mechanism versus composition boundaries                                              | Terminal documentation owner                                                         |
| Plugin-manager ownership, manifest and permission model, resolver and loader boundaries | Core and plugin documentation owners                                                 |
| Lua subset definition and build-time Lux flow                                           | SDK and packaging owners                                                             |
| Registry and index role                                                                 | Plugin-ecosystem owners                                                              |
| Artifact format, manifest fields, lockfile shapes, trust-prompt UX, registry scope      | Owner approval pending in each owning repo                                           |

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered models are
candidate inputs only; the fixed-domain wording, the Non-goals text, the
staged MVP, the primitive list, the interface and call sketches, the event and
field names, and the manifest, lockfile, CLI, install, and flavor spellings
proposed in the candidate direction are **not** accepted by this candidate design and must not
be read as product, crate, package, protocol, file-schema, command, or release
decisions. Provider questions stay with
[Provider plugin boundary](../providers/provider-plugin-boundary.md) and
[Caller attribution design](../agent/caller-attribution-design.md); tool shape and
transport placement stay with
[Command and Tool Architecture](../architecture/command-tool-architecture.md) and
[Tool transport R2](../architecture/tool-transport-r2.md); context assembly, budget, and
retention questions stay with
[Context Management Architecture](../context/context-management.md) and
[Context retention R3](../architecture/context-retention-r3.md); coordination and
persistence questions stay with
[Agent Coordination Architecture](../agent/agent-coordination.md) and
[Task lifecycle R5](../architecture/task-lifecycle-r5.md); execution and environment
questions stay with [Execution ownership R1](../architecture/execution-ownership-r1.md)
and [Panel environment awareness](../interfaces/panel-environment-awareness.md); each is
referenced, never duplicated or modified.

The accepted [IPC and Agent RFC](ipc-agent-rfc.md) defines the only
accepted IPC wire, scope, and Agent vocabulary. Every sketch name in the
candidate direction (service names, interface spellings, event names, field names, file
names, command spellings, flavor names) is a discussion sketch: this draft
records it as input and proposes no file schema, API, command, tool, event,
or wire format. Where the direction's sketches overlap RFC-owned ground (Agent
lifecycle, Agent events, Agent semantics, scopes), the RFC wins without
further argument.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed redaction,
consented recording, secret minimization) override every discussion example
throughout this document. The composition sketches are conceptual vocabulary, not an adopted
authorization or distribution contract. This draft creates or closes no AIQ or
OQ identifier; open questions stay with
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the design falsifiable before any scope,
contract, or packaging proposal constrains `bitty-ai`.

| Campaign                 | Required observation                                                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scope reconciliation     | A non-coding agent composition ships outside Wheel with no Wheel change, while Wheel itself refuses a non-coding task at its declared boundary, in reviewable tests.                                                                                   |
| Non-goals adoption       | The Non-goals text lands in the Wheel repository documents through a Wheel-owner decision with owner approval recorded, not through this draft.                                                                                                        |
| Staged MVP               | Each MVP stage demonstrates its declared awareness and binding (panel, worktree, process, LSP, task; then budgets, permissions, typed results, notes; then plan, assign, monitor, review, merge) in reviewable tests before the next stage is claimed. |
| No premature abstraction | A second real agent implementation reuses a primitive without changing Wheel, and no Universal Agent trait exists before that evidence, in review.                                                                                                     |
| Contract honesty         | A cross-plugin consumer uses a declared versioned contract with no source-path import, and an undeclared peer is refused at resolution time, in reviewable tests.                                                                                      |
| Provider ignorance       | A provider credential shape changes with no caller-visible difference and no Wheel change, in reviewable tests.                                                                                                                                        |
| Streaming parity         | One call shape serves same-runtime and cross-process peers with explicit cancellation and lifecycle behavior and no UI-thread blocking, in reviewable tests.                                                                                           |
| Event-schema unity       | Provider stream normalization reconciles with the canonical event schema with no competing event vocabulary, in review.                                                                                                                                |
| Host-services rule       | A storage need is served through a host service with no native code in the plugin artifact, in reviewable tests.                                                                                                                                       |
| Trust boundary           | A repository entry with plugin declarations prompts for explicit trust before any install or execution, in reviewable tests.                                                                                                                           |

Promotion needs independent AI architecture, provider-boundary,
context-management, terminal and plugin-owner, Wheel-owner, packaging-owner,
docs-curator, and security review. Route scope text, roadmap order,
primitive extraction, contract schemas, provider selection and substitution,
async and streaming semantics, framework-versus-SDK boundaries, manifest and
lockfile shapes, trust-prompt UX, and registry scope to scoped owner tasks.
This draft changes no normative contract and authorizes no product code.
