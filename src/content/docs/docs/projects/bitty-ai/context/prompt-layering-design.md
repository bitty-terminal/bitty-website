---
title: Prompt Layering Design
description: Draft proposal for a five-layer prompt contract with capability separation and stable assembly order
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 27
---

# Prompt Layering Design

> Status: **draft**. This document records a single-author candidate
> direction as a reviewable proposal. It accepts nothing, describes no shipped
> behavior, and authorizes no compatibility promise. Mechanisms marked
> beyond-v0.1 are proposals for later increments, not commitments.

## Purpose and scope

**Draft relationship**: Refines [Context Management Architecture](context-management.md)
and aligns assembly order with [Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md),
which elaborate [AI Architecture](../architecture/ai-architecture.md) CP-5 (Budget), CP-6 (Artifacts),
and CP-7 (Determinism and testability). Capability separation is constrained by
AG-4 (Least privilege at dispatch) in [AI Architecture](../architecture/ai-architecture.md) and the
Core-versus-Lua boundary in [Command and Tool Architecture](../architecture/command-tool-architecture.md).
These are topic relationships, not accepted authority.

## What this document does not duplicate

Each item below stays owned by its existing document; this proposal references
it and adds only the prompt-layering facet:

- Core-versus-Lua ownership (mechanism versus policy) stays with
  [Command and Tool Architecture](../architecture/command-tool-architecture.md). The `.wheel`
  configuration sketches and agent-profile sketches in the source are
  configuration shapes, not ownership assignments; enforcement of the split is
  tracked as AIQ-31 and promotion review as AIQ-32.
- The `.wheel/` project-configuration direction (declarative, versionable project
  intent; ordinary-setting precedence built-in to user to project to
  session/CLI within non-overridable security ceilings; a project declaration
  requests authority but never grants it) stays with
  [AI runtime boundaries (candidate)](../specifications/ai-runtime-boundaries-candidate.md),
  while the `.agents`/`.wheel` directory boundary and the Wheel-native function
  classes stay with
  [Wheel configuration and context git model (candidate)](../specifications/wheel-config-and-context-git-model-candidate.md).
  This proposal consumes that precedence and boundary and adds only prompt-text layering.
- Stable-prefix layering, deterministic serialization, epochs, and planner
  types stay with [Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md).
  This proposal aligns its assembly order with that layering and adopts no
  serializer, epoch schema, or planner type of its own (AIQ-12, AIQ-13).
- Panel and execution lifecycle semantics stay with
  [Agent Coordination Architecture](../agent/agent-coordination.md) (`Agent -> ExecutionContext <- Panel`)
  and the accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md). This proposal treats
  Panel invariants as contract content, never as a new Panel state machine.
- Skill format and versioning stay with AIQ-09; instruction snapshots and
  epochs stay with the frozen-session and instruction-epoch candidate in
  [AI Architecture](../architecture/ai-architecture.md); progressive `describe` and `resolve`
  discovery stays with its progressive-discovery candidate there.

## The five-layer model

The source proposes (lines 113-129) splitting the effective prompt into five
layers, from most stable to most dynamic:

```text
[1] Bitty Core Contract           <- stable, versioned, non-overridable
[2] User Global Instructions      <- rarely changes
[3] Project .wheel Configuration  <- stable within a session
[4] Skills / Agent Profile        <- stable within a session (single-agent v0.1)
[5] Runtime / Current Turn        <- dynamic per turn
```

**Draft disposition: adopt.** Stable content precedes dynamic content,
and each layer has a distinct owner and override rule. Layer names are
organizational; they create no new provider kinds, consent scopes, or
capability grants.

### Layer 1: Bitty Core Contract

Built in and maintained by Bitty, not configured from scratch by users
(source lines 7-52). Content is runtime semantics and invariants: what a
Workspace, Panel, Agent, Session, Tool, Plugin, and Skill are; Panel
semantics including headed versus headless presentation; independent Agent
and Panel lifetimes; tool-use principles; and the rule to use available tools
rather than inventing environment state.

Judgment: **draft disposition: adopt with three constraints.** First, the contract
must stay short (see below) and must describe semantics and rules only;
interfaces belong to tool schemas, not prose (source lines 56-111: prompt
explains semantics and rules, schema explains the interface). Second, the
contract is versioned (for example a `bitty-core-prompt` version identifier;
the source sketch `bitty-core-prompt@1` is illustrative, not an adopted
naming scheme) and a session generation pins the version it started with,
consistent with the instruction-epoch candidate. Third, ordinary users cannot
directly override it: a user instruction reading `Ignore Bitty's panel
semantics` must not make the runtime contract unreliable (source lines
638-676). Override, if ever offered, composes as Core plus user delta, never
as replacement of Core; the enforcement mechanism is open (facet of AIQ-31).

### Layer 2: User Global Instructions

User-owned preferences unrelated to the runtime itself, for example style,
tool preferences, and standing safety rules (source lines 175-203). **Draft disposition: adopt.**
This layer is fully user-editable and travels across projects. It configures
desired behavior only; it grants no capability (see below).

### Layer 3: Project `.wheel` Configuration

Project-owned intent loaded when an agent enters the project: project
instructions plus structured configuration rather than one giant Markdown file
(source lines 205-307). The directory boundary is owned by
[Wheel configuration and context git model (candidate)](../specifications/wheel-config-and-context-git-model-candidate.md):
`.agents/` carries portable ecosystem capabilities (skills and MCP material),
while `.wheel/` carries Wheel-native behavior (capability filtering over the
discovered registry, rules, custom commands, custom tools, and policy).
`.wheel` references, filters, and constrains what `.agents` exposes instead of
re-storing skills or MCP material.

Judgment: **draft disposition: adopt the configuration direction; defer to the canonical split.** The
`.wheel` tree, file names, and entry-file shape from the source are
illustrative, not an adopted schema; this layer consumes the `.agents`/`.wheel`
boundary, the single-entry contract, and the Wheel-native function classes from
the canonical config document rather than sketching a competing filesystem
tree here. Precedence follows the built-in to user to project to session/CLI
order in the AI runtime boundaries candidate, within security ceilings. An
untrusted repository manifest must never execute or self-authorize: project
trust, inspection, explicit approval, and host-enforced policy are required
before any project declaration takes effect. Manifest schema and merge
semantics need a reviewed contract (facets of AIQ-31 and AIQ-34); this draft
proposes no new identifier for them.

### Layer 4: Skills and Agent Profile

Selectable behavior packs (skills) and a per-agent profile that composes Core
plus user plus project instructions with role-specific guidance (source lines
309-364). The source sketches reviewer-style profiles with narrowed tool and
skill lists.

Judgment: **draft disposition: qualify by scope.** Per the CTX-0009 rescope (single-agent execution
ownership only) and the [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
single-agent gate, profiles in v0.1 are single-agent only. Multi-agent profile
sets (coding, reviewer, debugger, researcher, planner teams, delegation
graphs) are beyond-v0.1 proposals, not commitments; they compose with
[Agent Coordination Architecture](../agent/agent-coordination.md) only after the v0.1
scope decision. Skill loading declarations grant no execution authority
(AIQ-09). A narrowed tool list in a profile is a request the dispatcher may
deny further, never a grant the dispatcher must honor (see
[Contract is not Configuration is not Capability](#contract-is-not-configuration-is-not-capability)).

### Layer 5: Runtime and Current Turn

Per-turn facts (working directory, branch, task, turn instruction) assembled
as a trailing runtime-delta block plus the current turn (source lines 583-636).
**Draft disposition: adopt.** Dynamic values must not be interpolated into layers
[1]..[4]; they belong in the trailing block, consistent with the
stable-before-dynamic rule in the prefix-cache design. The `ContextPlan`
struct sketch (`core, user, project, agent, history, runtime, current`) and
provider-adapter rendering sketch are illustrative: no struct, module path,
or owner (Core versus Lua) is adopted here. Assembly composition is Lua policy
over Core mechanism per the MPC-5 candidate in
[AI Architecture](../architecture/ai-architecture.md) ("Lua owns ... prompt assembly");
orchestration-versus-execution ownership stays with AG-5 and dispatch
authorization with AG-4.

## Contract is not Configuration is not Capability

The source's central distinction (lines 366-426, 679-703):

```text
Contract       Configuration        Capability
What Bitty is  How the user wants   What can actually be done
Panel/Agent    Project rules        Tool Registry
semantics      Agent profile        Permissions / runtime policy
```

**Draft disposition: adopt as proposal with one hard enforcement rule:**

> **A prompt never grants a capability.**

A profile or instruction reading `You can access the network` must not by
itself produce a network tool. Capabilities come only from the capability
registry, tool registry, plugin permissions, and runtime policy evaluated at
dispatch. The source example is proposed as required behavior (**draft disposition: adopt**): if the prompt
says an agent may inspect panels but the runtime denies `panel.close`, an
attempt to close a panel fails closed at the dispatcher. This matches the
existing rule that roles are enforced at the IPC and capability layer and the
Tool Bus, never by prompt text, and the v0.1 gate that every native and MCP
effect needs a unified authorization backend (AIQ-33). Prompt text describes
what should be done; the dispatcher decides what can be done.

Consequence for layering: narrowing is advisory, widening is impossible.
Any layer may request less authority than granted; no layer may obtain more
than granted. Silent permission escalation through prompt wording is a defect,
not a feature.

## Short stable core plus on-demand introspection

The source argues (lines 428-524) the Core Contract should stay small,
roughly 1-3K tokens, covering runtime semantics, tool-use principles,
security invariants, and agent behavior, with details fetched on demand
instead of front-loaded: a `runtime.describe()` sketch returning runtime
capabilities, a `runtime.describe("panel")` sketch for detail, and a
`help.topic("panel")` or skill-load sketch for deep knowledge.

Judgment: **draft disposition: adopt the size-and-direction reasoning; every sketched API
name stays unaccepted.** No `runtime.describe`, `help.topic`, or catalog
function name is adopted here. The direction maps onto two existing
candidates: progressive discovery (`discover -> describe -> explicitly
resolve -> load a bounded fragment`, with discovery never executing plugins
or project content) and the Knowledge Context plane in
[AI Architecture](../architecture/ai-architecture.md). Any future introspection surface must
resolve under the same consent, budget, attribution, and untrusted-surface
rules as any other tool, and drill-down must never widen authority or leak
material the caller may not read. Token-size figures from the source are
illustrative, never adopted defaults.

## Harness budget evidence

Order-of-magnitude observations derived from the candidate direction (survey of
harness core-prompt token budgets), offered as evidence for the short-core
direction above. Nothing here is a measurement, a benchmark, or a decision:
the Bitty `~1K` core target below stays a proposal, and no figure in this
section is an adopted default.

### Verification limits (read first)

- Upstream harness figures are second-hand observations, never measured
  facts. Claude Code figures derive from the third-party
  reverse-engineering tracker `Piebald-AI/claude-code-system-prompts`
  (500+ conditional fragments); Codex per-model figures derive from the
  unofficial mirror `kekmodel/codex-system-prompts` reading the
  `openai/codex` model-registry `base_instructions`; OpenCode template sizes
  (`default.txt` 8.33 KB, `anthropic.txt` 8.02 KB) were read on the OpenCode
  **fork** `anomalyco/opencode` (`dev` branch), not the official OpenCode
  repository, and converted with the rough English-prose heuristic
  `8 KB ~= 2K tokens`.
- Cross-model token comparison is order-of-magnitude only. Tokenizers differ
  across model families, and the source notes that `tiktoken`-based counts
  commonly underestimate Claude-family tokens.
- Every figure distinguishes Core/Base Prompt from assembled first-request
  cost (`Core + Tool Schemas + Runtime Context + Project Instructions +
Skills/MCP + Conversation`). A small core does not imply a small assembled
  request: one user report on the OpenCode fork tracker describes about 68K
  tokens before the first user message under roughly 100 skills plus 50+
  tools with orchestration instructions, which illustrates catalog bloat,
  not a measured OpenCode core size.
- Kiro stays unknown. No reliable public core-prompt token count was found;
  the source explicitly refuses to invent one, and so does this document. A
  third-party adapter cap of 4096 tokens is an adapter limit, not evidence
  of Kiro core size.

### Observed harness budgets

| Harness     | Core / Base Prompt (observed order of magnitude) | Assembled first-request shape (observed) | Note                                             |
| ----------- | -----------------------------------------------: | ---------------------------------------: | ------------------------------------------------ |
| Pi          |                                          ~0.5-1K |                                   ~1-3K+ | Minimal public system prompt; four default tools |
| OpenCode    |       ~2-3K (some model-specific prompts ~3-4K+) |                                  ~4-10K+ | Provider-specific templates selected per model   |
| Codex       |                        ~2.5-4.5K, model-specific |                                   ~4-8K+ | Per-model `base_instructions` (see spread below) |
| Claude Code |                                       ~3-5K core |                        ~10-15K assembled | Conditional fragments plus large tool notes      |
| Kiro CLI    |                                          Unknown |                                  Unknown | Layered context confirmed; no reliable count     |

Codex per-model observations from the unofficial mirror, under the same
caveats as above: 2,551 (GPT-5.3-Codex), 2,639 (GPT-5.4-mini), 2,991
(GPT-5.4), 4,429 (GPT-5.5), 4,570 (GPT-5.2), 4,371 (fallback). The spread
itself is the finding: a harness prompt need not be model-agnostic, since a
model with stronger agent and tool-use training needs less repeated
behavioral instruction.

### Bitty core target and budget sketch (proposal, not a decision)

The source proposes a Bitty Core Prompt of about 700-1,500 tokens with a
working target of about 1K: closer to Pi than to Claude Code, with extra
room for Bitty runtime semantics (Workspace, Panel, Agent, Session, Task,
Process, Plugin, Skill) and invariants such as independent Agent and Panel
lifetimes and the rule to inspect runtime state through tools rather than
assume it. This range sits inside the 1-3K short-core direction above and
narrows it; it remains a proposal, not an adopted budget.

Illustrative budget sketch from the source, still a proposal:

| Part                                 | Proposed tokens |
| ------------------------------------ | --------------: |
| Bitty identity plus Runtime Contract |         300-500 |
| Agent / Panel / Workspace semantics  |         250-400 |
| Tool-use generic rules               |         150-250 |
| Safety / permission / state rules    |         150-250 |
| Output / interaction rules           |         100-200 |
| **Core subtotal (proposed)**         |  **~800-1,300** |
| Tool schemas                         |     1,000-2,500 |
| Runtime environment                  |         100-300 |
| `.wheel` project instructions        |        Variable |
| Active skills                        |        Variable |

A freshly started Bitty coding agent would therefore aim to reach the first
user prompt at roughly 2.5-5K assembled tokens under ordinary project
content, before oversized manifests, skill catalogs, or MCP surfaces. Core
stays semantic and terse (tens of tokens for Panel essentials, for example);
interfaces live in tool schemas and deep knowledge loads on demand through
introspection or skills, consistent with the progressive-discovery direction
above.

Guiding principle from the source, recorded here as proposal rationale only:

> **Core teaches semantics, Tools expose capabilities, Skills teach
> workflows.**

A thin harness core keeps the runtime contract reviewable; capability
breadth comes from schemas and skills that load lazily. This is also the
cache-alignment closing: the roughly 1K Runtime Contract can stay immutable
within a version and sit at the very front of the context, ahead of User,
`.wheel`, Agent-profile, append-only history, and the trailing runtime
delta, which is exactly the stable-before-dynamic assembly order the next
section adopts.

## Assembly order aligned with prefix-cache design

The source's assembly sketch (lines 583-636, 705-717):

```text
[BITTY CORE] Bitty runtime contract...        <- almost never changes
[USER] User global instructions...            <- rarely changes
[PROJECT] .wheel/instructions.md...           <- stable in session
[AGENT] Agent profile...                      <- stable in session
[SESSION] Current task...                     <- append-only history
[RUNTIME DELTA] cwd / branch / dynamic facts  <- dynamic
[CURRENT TURN] Turn instruction               <- most dynamic
```

**Draft disposition: adopt as consistent** with the prefix-cache layer order (stable tool
schemas and loaded skills sit with layers [2]..[4]; conversation history
grows append-only; tool results and runtime state stay trailing). This
proposal adds no serialization rule of its own: deterministic encoding,
canonical ordering, and cache-key scope stay with the prefix-cache design
(AIQ-12, AIQ-13), and no cross-provider cache reuse is implied. Whether the
assembled layers travel as one system message or as structured provider
blocks is a provider-adapter decision, not a contract here.

## Panel invariants as contract content

The source requires (lines 526-580) that Panel characteristics be runtime
contract: Agent lifetime is independent of Panel lifetime; headed panels are
user-visible presentation while headless panels may serve as agent working
areas; agents may enter, leave, and hand over panels.

**Draft disposition: adopt as contract content** with the existing reconciliation retained: the
`Agent -> ExecutionContext <- Panel` model in
[Agent Coordination Architecture](../agent/agent-coordination.md) governs. Headed
versus headless describes presentation, not authority or persistence.
No-panel and no-shell execution validity, optional Panel projection, lease
discipline, and the deferred broader features (persistent daemons, detach
and reattach across restarts, remote UI) stay exactly where agent
coordination and the IPC RFC put them (AIQ-29, AIQ-2A). This document defines
no Panel lifecycle states and no execution state machine.

## Mutability summary

Adapted from the source table (lines 638-654) with scope qualifications:

| Layer                  | User modifiable        | Note                                                  |
| ---------------------- | ---------------------- | ----------------------------------------------------- |
| Bitty Runtime Contract | No direct override     | Versioned; session-pinned; enforcement mechanism open |
| Bitty default behavior | Yes, as configuration  | Within security ceilings; requests, never grants      |
| User instructions      | Yes                    | Preferences only; no capability effect                |
| Project instructions   | Yes                    | Untrusted until reviewed; never self-authorizing      |
| Agent profile          | Yes, single-agent v0.1 | Multi-agent sets are beyond-v0.1 proposals            |
| Skills                 | Yes                    | Loading grants no execution authority (AIQ-09)        |
| MCP and plugins        | Yes                    | Same authorization pipeline as native tools (AIQ-33)  |
| Tool permissions       | Yes, narrowed only     | Subject to policy; prompt cannot widen (see above)    |
| Runtime facts          | No                     | Supplied by the runtime per turn                      |

## v0.1 scope boundary

Consistent with [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md)
(L0+L1, single-agent scope):

- In scope for v0.1 discussion: the five-layer organization, the
  prompt-never-grants-capability enforcement rule, stable-before-dynamic
  assembly discipline, and single-agent profiles.
- Beyond-v0.1 proposals (not commitments): multi-agent profile sets and
  delegation, `.wheel` configuration schema and merge semantics, introspection
  API surface, pinned core-version identifiers, registry snapshots, planner
  and epoch types, and any observability UI. Each needs its own reviewed
  contract and evidence before any implementation claim.

## Runtime evidence

No implementation of this proposal is claimed. The source cites no runtime,
test, or measurement evidence. The sibling `bitty-ai` repository was not
inspected for this task (out of scope: this task must not touch the
`bitty-ai` repository), so no statement here describes sibling behavior.
Any future implementation requires the v0.1 authorization backend (AIQ-33),
redaction evidence under P0-AC-026, and code with tests in the owning
implementation repository; no sentence here implies that code exists.

## Security review

This proposal must not contradict P0-AC-026 ([P0 Security Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)),
PP-2 (Typed redaction), or PP-4 (No on-disk persistence without consent):

- PP-2 (Typed redaction) requires redaction before queuing. Layer assembly
  changes nothing: redaction applies before any byte enters any layer, and no
  layer (user, project, skill, or profile) may carry secret material such as
  credential values. Configuration declares references, never inline secrets.
- PP-4 (No on-disk persistence without consent) governs every snapshot the
  layering implies: pinned core versions, instruction snapshots, assembled
  prefixes, and introspection caches. A stable in-memory prefix does not
  authorize durable recording. Consent authorizes recording only with
  mandatory typed redaction, user-only storage, and export preview.
- Minimization still prefers the smallest budget-bound set. Layer completeness
  never justifies sending more context than the task needs, and cache
  friendliness never overrides consent scopes.

No clause here weakens the normative security corpus linked from
[AI Architecture](../architecture/ai-architecture.md).

## Verification plan

This specification records the candidate direction plus critical
judgment. It is not implementation evidence. Acceptance requires independent
review, and any future implementation requires:

- A reviewed enforcement mechanism showing prompt text cannot widen authority,
  with fail-closed tests for prompt-claimed capabilities.
- A byte-level assembly contract (layer order, conflict precedence, version
  pins) with conformance tests, reusing the canonical serializer once AIQ-12
  is decided.
- Privacy evidence that redaction-before-queue, minimization, and
  consent-gated recording hold under layering, pinning, and introspection.
- Runtime code and tests in the owning implementation repository; no promise
  here implies that code exists.

## Open points

All choices below reuse existing identifiers; no new identifier is proposed.
Duplicate-check outcome: prompt-text merge semantics are a facet of AIQ-31
(enforcement of the Core/Lua split) composed with AIQ-34 (registration and
versioning of contributed surfaces); core-version pinning is a facet of the
instruction-epoch candidate with serialization prerequisites in AIQ-12;
introspection surface is a facet of progressive discovery with key-scope
questions in AIQ-13; profile narrowing is bounded by AIQ-33; Panel projection
questions stay with AIQ-29.

1. What mechanism enforces Core non-overridability at assembly time: a
   structural assembler that refuses Core replacement, a lint or trait
   boundary, or review-time policy? (Facet of AIQ-31.)
2. What are the exact merge semantics when User, Project, and Agent layers
   conflict on the same instruction: order of precedence, conflict
   diagnostics, and session-versus-CLI precedence? (Facet of AIQ-31 with
   AIQ-34.)
3. What identifies a pinned Core Contract version, and where is the pin
   recorded for replay and audit? (Instruction-epoch facet; encoding
   prerequisite AIQ-12.)
4. What is the bounded introspection surface (catalog, describe, resolve,
   load), and what consent, budget, and attribution rules bound each step?
   (Progressive-discovery facet; key-scope AIQ-13.)
5. Which skill and profile shapes are valid, and how are they versioned for
   ecosystem compatibility? (AIQ-09.)
6. Risk: layering could be read as permission layering. Restate: layers
   organize text; only the dispatcher grants effects. Any profile text that
   appears to widen authority must fail closed.
7. Risk: a stable Core could accumulate content until it is no longer short.
   Additions to Layer 1 need the same review bar as any contract change, with
   minimization as the binding constraint.

## References

- [AI Architecture](../architecture/ai-architecture.md) (Draft): CP-5 (Budget), CP-6 (Artifacts),
  CP-7 (Determinism and testability), AG-4 (Least privilege at dispatch),
  AG-5 (Orchestration versus execution), MPC-5 (prompt-assembly ownership
  candidate), progressive discovery and instruction-epoch candidates,
  PP-2 (Typed redaction), PP-4 (No on-disk persistence without consent).
- [Context Management Architecture](context-management.md) (Draft): session
  journal, projection, and multi-level pipeline this proposal layers text over.
- [Prefix-Cache-Friendly Context Design](prefix-cache-context-design.md) (Draft):
  stable-prefix ordering and deterministic serialization this assembly aligns with.
- [Command and Tool Architecture](../architecture/command-tool-architecture.md) (Draft):
  Core-versus-Lua boundary and AIQ-31 through AIQ-38.
- [Agent Coordination Architecture](../agent/agent-coordination.md) (Draft):
  `Agent -> ExecutionContext <- Panel` reconciliation and AIQ-29.
- [v0.1 Implementation Profile](../product/implementation-profile-v0.1.md) (Draft):
  L0+L1 single-agent scope gate marking multi-agent and manifest material as
  later proposals.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-09,
  AIQ-12, AIQ-13, AIQ-29, AIQ-31, AIQ-33, AIQ-34 reused; no new identifier proposed.
- [AI runtime boundaries (candidate)](../specifications/ai-runtime-boundaries-candidate.md)
  (Draft): `.wheel` project-configuration direction and precedence coverage consumed here.
- [Wheel configuration and context git model (candidate)](../specifications/wheel-config-and-context-git-model-candidate.md)
  (Draft): canonical `.agents`/`.wheel` directory boundary and Wheel-native
  function classes consumed by Layer 3.
