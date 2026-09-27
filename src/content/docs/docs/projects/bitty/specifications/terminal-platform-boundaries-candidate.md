---
title: Terminal Platform Boundaries (Candidate)
description: Draft candidate direction for terminal-side platform boundaries across the execution host security packaging and composition layers with owner-pending halves noted
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 35
---

# Terminal Platform Boundaries (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document is a design record for the
> terminal-side slice of several cross-repository directions: the part the Bitty
> terminal platform would own if the directions were ever accepted. It
> authorizes no shipped, stable, or compatibility-guaranteed behavior, weakens
> no accepted source it cites, and makes no implementation claim. Names, bounds,
> call spellings, and defaults repeated here are direction, not contract.

## Purpose and scope

Each direction below spans several owning repositories. This document freezes
only the **terminal-side** slice — the part the Bitty terminal platform would
own if the directions were ever accepted — so future design work starts from a
stable input instead of reconstructing the whole cross-repository discussion.

In scope (all **Candidate** unless cited otherwise):

- T-1: Execution Host mechanisms Bitty owns.
- T-2: host security ceiling Bitty enforces.
- T-3: terminal-projection consequences of the Wheel coding-domain scope.
- T-4: outward-request caller-identity principle as it touches the terminal.
- T-5: UI mechanism-versus-composition boundary.
- T-6: packaging and distribution direction composed with the accepted package
  lifecycle.

Out of scope and owned elsewhere (pointers, not content):

- agent, task, delegation, budget, capability-semantics, mailbox, handoff,
  retry-policy, and orchestration conclusions (accepted,
  [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md);
  direction, `bitty-ai-docs` owner);
- Lua harness, Wheel roadmap, provider, model-catalog, routing, and context
  machinery (direction, Wheel and `bitty-ai` owners);
- plugin manifest, permission-model, registry, and SDK-contract detail
  (accepted,
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md),
  [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md),
  [Package Lifecycle RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/packaging/package-lifecycle-rfc.md);
  direction, `bitty-plugins-docs` owner);
- shared governance, decision, and security corpora (linked, never copied,
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs));
- panel lifecycle, overlays, focus routing, and the Event Bus contract
  (accepted, [Panel Runtime RFC](panel-runtime-rfc.md));
- VT parser, grid, cursor, mode, damage, reply, and scrollback truth
  (accepted, [Terminal State RFC](terminal-state-rfc.md));
- Core-versus-plugin ownership and P0 gates (accepted,
  [Core and Plugin Boundaries](../architecture/core-boundaries.md)).

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## T-1 Execution Host mechanisms (Candidate)

**Candidate.** Do not build a stronger process-spawning helper; make
Job/Execution a first-class object under an Execution Supervisor that is
independent of Agent, Panel, and Conversation. Bitty owns process mechanisms
and enforcement; task semantics stay with the `bitty-ai` owner
(owner-pending, `bitty-ai-docs`).

Terminal-side conclusions:

- Fix the four-object ontology — Task (semantic work), Execution/Job (a real
  OS process tree), Agent (decision maker), Panel (human projection) — with
  jobs not belonging to panels: origins are provenance, and completion routes
  to the owning agent's mailbox, not to the origin panel. The mailbox,
  binding, claim, and handoff halves are owner-pending (`bitty-ai-docs`).
- The existing `pty_spawn`-style surface becomes one backend of the
  supervisor; a PTY is optional and a pipe process is the default. Waiting is
  the runtime's job, never the model's: execution returns a handle plus an
  automatic subscription instead of model polling. The subscription and wake-up
  semantics are owner-pending (`bitty-ai-docs`).
- Host job model (**Candidate**, illustrative spellings): spawn-time lifetime
  (`Agent` / `Task` / `Workspace` / `Detached`), kind (`Command` /
  `Interactive` / `Service` / `Watch`), stdin closed by default with explicit
  interactive-PTY opt-in, `argv`-first execution instead of shell-string
  execution, separated `hard_timeout` / `idle_timeout` / `retention_ttl`,
  retry default none, a structured outcome enum (an out-of-memory outcome only
  when actually determined), owned-process-tree kill, and a typed cancel
  protocol (`Graceful` / `Immediate` / `GracefulThenKill`, outcomes including
  a stale-generation outcome) that the host executes while the AI layer
  chooses policy.
- Capability-scoped operations (`observe`, `read_output`, `write_input`,
  `signal`, `cancel`, `attach`, `transfer`) are enforced by the host per
  principal, so an AI-layer defect cannot end an arbitrary process.
  `WaitingInput` is a first-class state inside the sensitive-input boundary.
- Two generations: assignment generation (AI-side ownership) is not execution
  generation (host handle); stale execution handles are rejected by the host
  itself.
- Two-layer result contract: Bitty produces the authoritative execution result
  (typed outcome, timestamps, stdout/stderr and artifact references, resource
  usage, truncation); the AI layer produces the semantic job result (summary,
  diagnostics, task effect, progress note). Artifacts are stored and
  referenced by the host mechanism and interpreted by the AI layer.
- Output handling: bounded ring buffer plus optional persisted logs plus
  file-held artifacts; only bounded tails and references enter model context,
  with explicit tail/filter reads; metadata and an output index may live in
  SQLite, never raw stdout.
- Event delivery: observation events (stdout, progress, heartbeat) may be
  coalesced, dropped oldest-first, or kept UI-only and must never wake the
  model; critical events (completed, failed, needs-input, permission-required,
  timeout, ownership-changed, cancelled) are delivered reliably at-least-once
  with stable ids and dedupe; accepted/delivered/acknowledged stay distinct;
  IPC disconnects retain events and resume by sequence.
- Three disconnect classes stay separate: provider outage (never touches
  jobs), a job's own network failure (record exit code, signal, stderr,
  timeout — never invent a synthetic network error), and Bitty IPC disconnect
  (execution continues, events replay).
- Persistence is staged and stays out of v0.1: Phase 1 is an in-memory
  supervisor with event-driven completion and no restart survival; Phase 2
  adds persistent metadata/events/logs plus reconciliation and resume cursors;
  Phase 3 is a detached supervisor daemon (multi-day jobs, handoff/adoption,
  scheduling).
- Repository placement (**Candidate**): Bitty gets an AI-agnostic execution
  subsystem with no agent, task, or model symbols — generic principals, ids,
  targets, capabilities, and opaque metadata — joined to the AI layer by
  generic `execution.*` IPC verbs (spawn, get, cancel, signal, read,
  subscribe, attach) that Terminal Core can own without agent ontology. Every
  job may reference an execution, but an execution is not inherently an AI
  job.
- Multi-agent visibility (**Candidate**, illustrative UI direction): owner plus
  subscribers with per-operation grants; Panel projection, attach/tail
  interactions, and a control console are illustrative only. Needs-input
  surfacing and output folding compose with the terminal presentation
  contracts ([Terminal State RFC](terminal-state-rfc.md),
  [Panel Runtime RFC](panel-runtime-rfc.md)) rather than redefining them. A
  dedicated execution-supervisor RFC/spec and a canonical boundary table are
  proposed instead of scattering the design; that RFC does not exist yet.
- Open items carried forward: the v0.1 boundary versus the Phase 2 trigger;
  out-of-memory determination without control groups plus Windows/macOS
  process-tree backends; output and artifact retention defaults; execution
  subsystem crate shape; reconciliation of the generic execution IPC verbs
  with the accepted agent surface; terminal-side job-visibility and
  needs-input contracts. Contract owners stay open:
  [OQ-061, OQ-057, OQ-059, and OQ-065](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

Owner split: the `bitty-ai`-owned semantics (task model, binding, claims,
mailbox, semantic result, retry policy, orchestration) are owner-pending in
`bitty-ai-docs`; the terminal-owned mechanism halves stay with the Bitty
platform owner.

## T-2 Host security ceiling (Candidate)

**Candidate.** The agent's Lua layer decides how to do something, but never
whether it is allowed to: the impassable boundaries — capability
intersection, resource limits, panel write-lease, secret isolation, and
privilege/path authorization — live in Core. The AI-semantics hard
constraints (agent, task, delegation, budget, capability) are owner-pending
(`bitty-ai-docs`).

Terminal-side conclusions:

- Four-layer policy stack (Host Security Ceiling / User Policy / Project
  Policy / Lua Harness Policy) with intersection semantics: the effective
  value is always the most restrictive (host 16, user 6, project 4, Lua
  requests 8 yields 4), and path grants narrow the same way. A Lua
  declaration is always a request and never self-grants.
- Resource enforcement for jobs is Core mechanism: the chain from Lua request
  through AI-side resource/budget policy to the execution supervisor must end
  in OS enforcement (control groups, resource limits, process groups, GPU
  observation/budget, filesystem quota or free-space guard; the platform
  equivalents on Windows and macOS) with typed failures — never a crashed
  machine. Budget values and enforcement thresholds are undecided.
- Panels get a Core lease: several read leases and one interactive writer
  identified by principal plus generation; a non-holder write is denied with
  the lease reason, and handoff fences the old generation and assigns a new
  one. Discipline is expressed by Lua; mutual exclusion is guaranteed by Core.
  Contract owner:
  [OQ-083](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
- Secret isolation uses opaque handles: the host credential store resolves the
  value and injects it into the child process environment only; agent context,
  execution logs, Lua logs, and panel history never receive the value. Use is
  not read.
- Privilege is denied by default: a privilege request carrying reason,
  command, and target passes host policy to explicit user approval and then
  allows exactly one scoped privileged execution — no permanent elevated
  session, and the agent never learns the credential.
- Filesystem authorization must not rely on filenames: default-deny sensitive
  locations plus scope plus sensitive-path policy plus content-based secret
  detection/redaction, with user consent instead of silent access, and no Lua
  bypass.
- The Lua API surface should be controlled requests (spawn-agent,
  run-execution, acquire-panel, read-file shapes), each entering one
  authorization path, rather than raw capabilities (shell-execute, file-open
  shapes); a pathological harness loop then receives budget errors repeatedly
  instead of taking the machine down. Call and error names are undecided.
- Mechanism in Rust, organization model in Lua: Core knows Agent, Task, Grant,
  Budget, Delegation, Mailbox, Execution, and Lease — never
  Commander/Planner/Reviewer team shapes, which are Lua concepts that update
  no Core.
- User-layer rules split into what the system can technically prevent (deny,
  confirmation, redaction, ceilings) and user hygiene the system cannot
  control (for example a user pasting a secret into chat), where the system
  only warns, redacts, avoids persisting, and avoids logging.
- Contract owners stay open:
  [OQ-057, OQ-061, OQ-083, and OQ-058](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md);
  this document opens no new question. Whether the four-layer stack becomes a
  configuration schema or stays a runtime evaluation is undecided, as is the
  v0.1 boundary for the hard-safety set.

Owner split: the Bitty-side mechanisms stay with the Bitty platform owner; the
AI-semantics hard constraints (agent, task, delegation, budget, capability)
are owner-pending (`bitty-ai-docs`).

## T-3 Wheel coding-domain scope, terminal projection only (Candidate)

**Candidate.** Wheel is the official agent-harness surface scoped to software
engineering: the task domain stays fixed on coding while roles vary inside it
over one unified agent primitive (identity plus role, model, tools,
permissions, context, budget, workspace) — roles are configuration, never a
class explosion. Personal agents, office agents, and always-on autonomous
agents are separate future surfaces, never Wheel scope.

Terminal-side relevance only:

- Agent panels project into surfaces Bitty already owns — Panel, Workspace,
  PTY, Process, IPC, Worktree, LSP — per the accepted contracts
  ([Panel Runtime RFC](panel-runtime-rfc.md),
  [Terminal State RFC](terminal-state-rfc.md),
  [Core and Plugin Boundaries](../architecture/core-boundaries.md)). Nothing
  in the coding-domain scope changes those contracts.
- The non-goals direction (not a personal assistant, not a general-purpose
  autonomous agent, not a messaging gateway, not an email/calendar assistant,
  not home automation, not a lifelong user-memory system, not a
  cron/automation daemon, not a general cloud-management agent) is recorded
  here only so terminal design does not reserve Core surface for those
  futures; the binding scope text belongs to the Wheel owner.
- The staged harness MVP (single primary coding agent in a Bitty Panel, then
  primary plus subagents, then a planning commander) and the
  generalize-only-from-two-real-implementations rule are Wheel-owner
  direction, recorded here as pointers.

This document creates no agent or question identifier; reconciliation against
the `bitty-ai-docs` agent-architecture directions belongs to the AI owner.

## T-4 Outward-request caller identity principle (Candidate)

**Candidate.** Gateway-side usage attribution is caller-declared (request
headers aggregated per model and application), not gateway scanning — so any
Bitty surface that issues outward model requests must declare caller identity
at the request layer. Absent identity means explicitly unattributed
(local/private) traffic, never forged or defaulted identity.

Terminal-side relevance only:

- The principle constrains future terminal panels that issue outward requests
  (for example a Wheel agent panel): whatever identity the accepted AI-side
  contract defines must be carried at the request layer, and unattributed
  calls must stay possible for local/private use. No terminal-side mechanism
  is decided here.
- Everything else is owner-pending and recorded as pointers: the
  request-field shape, adapter wiring, cache-key and routing exclusion, the
  Wheel-versus-model-infrastructure plugin split, authentication strategies,
  model catalog and discovery, model normalization and profiles, usage
  accounting, and the Core-owned secret store (`bitty-ai-docs` and
  `bitty-plugins-docs` owners). No terminal panel identity string is chosen
  here.

This document creates no agent or question identifier.

## T-5 UI mechanism-versus-composition boundary (Candidate)

**Candidate.** Four layers: Rust enforcement and mechanisms, then a narrow
public Lua SDK, then replaceable optional framework plugins, then
application/user plugins. Rust is suited to performance-sensitive,
platform-specific, correctness-critical mechanisms such as rendering, font
shaping, input/IME, scheduling, and resource lifecycles. Lua composes
widgets, layouts, themes, dashboards, workflows, and user-facing policy
within enforced authority boundaries.

Terminal-side conclusions, composed with the accepted
[Core and Plugin Boundaries](../architecture/core-boundaries.md):

- Ordinary `require()` is appropriate for private modules inside one plugin.
  Cross-plugin consumers use declared public services or mediated proxies,
  never reach into another repository's source. Repositories are publication
  boundaries; versioned service contracts are architectural boundaries.
- Contracts are typed and schema-backed — explicit request, response, and
  event shapes with versioning — so conformance is checkable rather than
  resting on undocumented tables. A service interface may have multiple
  conforming implementations; consumers do not depend on provider layout or
  implementation language.
- Package dependencies (installation of a particular plugin) and service
  requirements (a compatible provider of an interface) are distinct
  declarations, so an official, user-supplied, or otherwise authorized
  provider can substitute without rewriting consumers. A declared service
  requirement is not itself a permission grant.
- Location transparency is a proposal, not fake synchrony: a common
  service-facing abstraction may mediate same-runtime and cross-process
  calls, but local shortcuts must not bypass enforcement or pretend remote
  calls are ordinary synchronous calls that can block the UI/event loop.
  Async-first calls with explicit cancellation and lifecycle behavior are the
  direction; the await/promise/coroutine/callback/stream-iteration spellings
  are alternatives in discussion, never accepted SDK methods.
- Keep the SDK small: only justified, stable public abstractions; no heavy
  second Lua Core; no binding of ordinary plugins to raw internal APIs.
  Frameworks evolve separately while public contracts insulate consumers from
  host-internal change — a design aim, not an unconditional compatibility
  guarantee.
- UI components and higher-level composition live in independently versioned,
  optional, competing framework plugins rather than a mandatory official UI
  framework. The reactive, immediate-mode, terminal, canvas, and
  dashboard-oriented approaches are illustrative alternatives, never approved
  packages, APIs, or a roadmap.
- Authority and lifecycle take precedence: accepted security requirements and
  lifecycle schemas override speculative service methods,
  coroutine/stream interfaces, custom event vocabulary, and facility lists.
  Process execution, agent spawning, IPC, networking, and credentials are
  illustrative mechanism needs, never ambient access or authorization, and
  framework wrappers cannot bypass host enforcement.

Model/provider abstraction, normalized provider streaming, tool schemas and
registries, context/memory, workflows, and multi-agent orchestration
illustrations belong to the Wheel and AI owners and establish no terminal
contract here.

## T-6 Packaging and distribution direction (Candidate)

**Candidate.** Bitty owns its plugin package manager (lifecycle, permissions,
services, compatibility) while the Lua dependency tool serves only the Lua
dependency layer at development and packaging time, producing self-contained
installable plugin artifacts.

Terminal-side conclusions, composed with the accepted
[Package Lifecycle RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/packaging/package-lifecycle-rfc.md)
(OQ-021):

- Keep two graphs behind one CLI: the Bitty plugin graph (managed by Bitty)
  and the Lua package graph (resolved with Lua-dependency tooling); users see
  unified install/update/remove/list commands without knowing which resolver
  runs underneath.
- Confine the Lua-dependency tool to development and packaging (declare,
  resolve, vendor, pack) so end-user installs need no such toolchain — a
  build-time versus runtime split — and take no hard runtime dependency on any
  pre-1.0 embedding API.
- The host owns the runtime module loader: a resolver chain (plugin-local,
  plugin dependencies, framework packages, standard library, vendored
  libraries) over the sandboxed Lua runtime, banning native extensions and
  native-code loading rather than emulating a full traditional Lua runtime.
- Ship self-contained plugin artifacts (manifest, Lua sources, vendored
  pure-Lua dependencies, assets) with dependencies pre-resolved, favoring
  reproducibility, startup speed, security, offline install, sandboxing, and
  version consistency over on-device resolution.
- Admit only a defined sandbox-compatible Lua dependency subset (pure Lua, no
  native code, no arbitrary process execution or dynamic native loading);
  reject native dependencies at the manager level and route native needs such
  as storage through host Rust services.
- Never let project composition files auto-install or execute plugins on
  entering a repository: declarations prompt for explicit user trust first.
  This matches the trust-on-first-use direction (owner-pending).
- Manager/lockfile/manifest shapes, artifact format, trust-prompt UX, and
  registry scope are owner-pending (`bitty-plugins-docs` owner); the registry
  and index role belongs to the plugin-ecosystem owners.

## Open items

- Owner acceptance of each Candidate slice (T-1 through T-6) through the
  owning RFC or specification track; until then none of this text authorizes
  behavior.
- Terminal-side job-visibility and needs-input contracts (T-1) need an owning
  design task before any panel surface is specified.
