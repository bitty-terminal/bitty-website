---
title: Agent Authority and Hard-Safety Boundary
description: Draft capture of the bitty/bitty-ai/Lua authority split, the four-layer policy stack, and Core-enforced hard-safety mechanisms
category: development
audience: contributor
document_type: policy
status: draft
website_publish: true
sidebar_order: 19
---

# Agent Authority and Hard-Safety Boundary

> Status: **draft**. This page is a critical capture of the Lua and agent
> authority direction (2026-09-17). It accepts nothing, adopts no crate, fixes
> no policy schema, and authorizes no
> implementation. It is the authority-boundary companion to the execution host
> and supervisor boundary capture (see the
> [Execution Host and Supervisor Boundary](execution-host-boundary.md)) and
> refines the implications of DIR-018 (host
> capability gateway), the accepted
> [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md),
> and ADR-0006/ADR-0009 without rewriting them. The security corpus
> ([overview](../security/overview.md), [threat model](../security/threat-model.md),
> [risk register](../security/risk-register.md),
> [P0 acceptance criteria](../security/p0-acceptance-criteria.md)) remains
> normative. `bitty-ai`-owned semantics (the Lua harness API surface,
> delegation budgets, subagent authority attenuation, and role/organization
> models) are deliberately not captured here; they stay owner-pending in
> `bitty-ai-docs`. Where this page references repository state, that state is
> a point-in-time observation, not a contract.

## Problem statement

A capable agent harness can be assembled mostly in Lua, but the security
boundary cannot be guaranteed by Lua. Prompt-only rules and Lua self-discipline
fail in predictable ways:

- A workflow decides to fan out and spawns a dozen subagents; nothing stops a
  buggy loop from spawning a thousand.
- A plugin bug (`for i = 1, 1000 do spawn("cargo build") end`) exhausts CPU,
  memory, disk, or VRAM and takes the machine down.
- Several agents and a human write to the same panel PTY at the same time
  (`cargo test`, `Ctrl+C`, `cd`, human typing, `rm`) and corrupt each other's
  work.
- Model-visible instructions say "never read `.env`"; a later turn runs
  `cat .env` or `open(".env").read()` anyway.
- A provider token reaches the model, the execution log, the Lua log, or panel
  history because the only rule against it was "do not print keys".
- An agent runs `sudo` because the command looked reasonable, or holds a sudo
  session (or the password) for the rest of the session.
- A Lua plugin declares `filesystem = "all"`, `root = true`,
  `max_agents = 100` and effectively grants itself those powers.

The direction concludes that Bitty should implement **agent runtime primitives**
under bitty/bitty-ai ownership and let Lua compose workflows on top, so that
unbounded swarms, malicious plugins, buggy plugins, runaway agents, and
incorrect delegation cannot cross the Core boundaries for capability, budget,
resource, secret, filesystem, privilege, execution, and lease.

## The boundary principle

The direction fixes a four-level layering and one sentence of policy:

| Layer               | Owns                                                                    | Direction                                     |
| ------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| `bitty`             | Host security ceiling: execution, PTY, filesystem, panel lease, secrets | Non-bypassable hard boundary                  |
| `bitty-ai`          | Agent, task, delegation, budget, and capability semantics               | Hard constraints of the AI layer              |
| Lua harness         | Workflow, strategy, scheduling policy, UX composition                   | May compose freely, may never widen authority |
| User/project policy | User and project configuration that further tightens the upper layers   | Narrows only, never widens                    |

> **Lua decides "how"; Lua never decides "whether it is allowed".**

The closing formulation is the same split from the other side:
agent _behavior norms_ largely belong to Lua; agent _impassable boundaries_
must never belong to Lua. The upstream deliverable is a set of primitives
(agent runtime, task, delegation, capability, budget, execution, panel lease,
context, provider, mailbox/event primitives), not a fixed "Bitty Agent
Harness": the official `bitty-ai` Lua harness is one consumer, and community
harnesses compose the same primitives.

## Rule classification: Hard Safety, Policy, Strategy

The central classification, condensed:

| Rule                                      | Class                    | Implementation location                   |
| ----------------------------------------- | ------------------------ | ----------------------------------------- |
| Maximum agent count                       | Hard ceiling plus policy | `bitty-ai` ceiling, Lua strategy below it |
| Maximum subagent depth                    | Hard ceiling             | `bitty-ai`                                |
| How many agents a task needs (2/3/5)      | Strategy                 | Lua                                       |
| RAM / CPU limits                          | Hard safety              | `bitty`                                   |
| GPU / VRAM budget                         | Hard or resource policy  | `bitty` plus resource backend             |
| Disk free-space guard                     | Hard safety              | `bitty`                                   |
| Task token/cost budget                    | Hard budget              | `bitty-ai`                                |
| Agent scheduling order                    | Workflow                 | Lua                                       |
| Panel writer exclusivity                  | Hard safety              | `bitty`                                   |
| Prefer independent panels per worker      | Workflow                 | Lua                                       |
| `.env` read prohibition                   | Authorization            | `bitty`                                   |
| Secret handles                            | Security mechanism       | `bitty`                                   |
| Whether a project may read a special file | User/project policy      | Configuration                             |
| Root escalation                           | Authorization            | `bitty`                                   |
| Automatic retry policy                    | Workflow                 | Lua                                       |
| Parallel review or not                    | Workflow                 | Lua                                       |
| Task delegation                           | AI semantics plus policy | `bitty-ai` + Lua                          |

The three labels are cumulative: Hard Safety is unbreakable, Policy is
composable by Lua inside the hard boundaries, and Strategy is selectable by
agents. Anything in the Hard Safety row is enforced by the host mechanism, not
by convention in the AI layer.

## Four-layer policy stack

The direction fixes a four-layer stack whose layers **intersect**: the effective
value is the most restrictive result, never an override.

```text
┌─────────────────────────────────────┐
│ Lua harness policy                  │  team shape / workflow / strategy
├─────────────────────────────────────┤
│ Project policy (.wheel)             │  allowed paths / task constraints
├─────────────────────────────────────┤
│ User policy                         │  max agents / root / network / etc.
├─────────────────────────────────────┤
│ Host security ceiling               │  capability / sandbox / resources
└─────────────────────────────────────┘
```

Examples recorded: with host `max_agents = 16`, user `6`, project `4`, and a
Lua request of `8`, the effective value is `4`; with host root
`~/Projects/**`, user `~/Projects/bitty/**`, project `repository/**`, task
`src/**`, and worker `src/parser/**`, the effective path grant is
`src/parser/**`. A lower layer can only narrow.

This composes with the existing configuration layer stack and
non-overridable-policy control in the
[Configuration Model RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/configuration-model-rfc.md):
policy entries marked non-overridable cannot be widened by user configuration,
and the effective-authority evaluation must use declared precedence, never
load order.

## Capability intersection and self-grant prohibition

A Lua declaration is a **request**, never a grant. The model:

```text
EffectiveCapability =
    Host Ceiling
  ∩ User Policy
  ∩ Project Policy
  ∩ Parent Delegation
  ∩ Task Grant
  ∩ Agent Request
```

Consequences recorded:

- A plugin or workflow writing `bitty.agent.spawn({ filesystem = "all",
root = true, max_agents = 100 })` does not receive those powers; the
  capability engine evaluates the request against every layer and returns the
  effective (narrower or empty) grant, or a typed denial.
- `Capability(child) ⊆ Capability(parent)`: a worker cannot widen authority
  back to the whole project after a commander received only `project/src/**`.
- The acceptance gate is a request → capability engine → user/project/host
  policy → effective capability pipeline that every privileged Lua call
  enters, not per-API ad-hoc checks.

Existing accepted mechanics this direction composes with (it does not replace
them): the closed capability families and deny-by-default posture in the
[security overview](../security/overview.md), the plugin capability grammar
and grant intersection in the
[Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
(the `bitty-plugin-host` grant check already intersects declared, granted, and
hash, tracked as R-006 in the [risk register](../security/risk-register.md)),
and the host tool-dispatch consent gate delivered by CTX-0421. What this
direction adds is the _multi-layer intersection for agent-spawned work_ (user,
project, parent delegation, task grant) and the explicit no-self-grant rule at
the agent-spawn surface.

## Resource enforcement for execution jobs

Declared resource requests are policy input; enforcement is host mechanism:

```text
Lua request (cpu / memory / gpu_memory / disk)
  ↓
bitty-ai resource and budget policy
  ↓
bitty execution supervisor
  ↓
OS enforcement
```

Recorded platform direction: Linux `cgroup v2`, `RLIMIT`, process groups, GPU
observation/backend budgets, filesystem quota or a free-space guard; Windows
Job Objects; the macOS equivalent mechanisms. A runaway spawn loop must
receive typed failures — `ResourceLimitExceeded`, `ExecutionBudgetExhausted`,
`ConcurrencyLimitReached` — from Core, instead of taking the machine down.

This direction extends the execution host and supervisor boundary capture
(see the [Execution Host and Supervisor Boundary](execution-host-boundary.md)):
its job model
already separates `hard_timeout`, `idle_timeout`, and `retention_ttl`, asserts
`OomKilled` only when the host can determine it, and keeps resource usage as an
`ExecutionResult` field. Resource _enforcement_ (memory/CPU/disk/GPU ceilings
and the concurrency ceiling) is the part this direction adds; token/cost budgets
and delegation fan-out remain `bitty-ai` semantics.

## Panel write-lease

"Please do not fight over panels" is not a control. The direction defines a Core
lease on a panel (illustrative shape):

```text
Panel P7
  read leases:        Agent A, Agent B, Human
  interactive writer: Agent A generation=12
```

A write attempt by B (`panel.write(P7)`) is denied by Core with a typed reason
("interactive writer lease belongs to Agent A"), and a handoff is a
generation-fenced transfer (`handoff P7 A -> B`, generation 12 fenced,
generation 13 assigned to B). This prevents the corruption pattern of
two agents and a human writing to one PTY concurrently.

Division of labor: **discipline is expressed by Lua; mutual exclusion is
guaranteed by Core.** Lua decides that each worker should prefer its own
execution, acquire an interactive panel only when needed, and release it
promptly. Existing building blocks this composes with: `(PanelId, generation)`
handle rules and `StaleHandle` in the
[Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md),
the focused-writer routing in
[workspace panel invariants](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/workspace-panel-invariants.md)
(WS-INV-10), and the agent↔panel lease coupling noted in the
[Panel Environment State candidate](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-environment-state-candidate.md).
The lease contract itself is owned by OQ-083 (open) with the AI Architecture
in `bitty-ai-docs`; this capture records only the Core mechanism direction.

## Secret isolation

The direction fixes the invariant **use ≠ read** for credentials: an agent may
execute with a credential while never receiving its value.

```text
Agent context:   credential_handle = secret://github/default
execution.spawn: credential_handles = [github]
Host:            resolves the handle, injects GITHUB_TOKEN into the child
                 process environment
Never visible:   agent context, execution logs, Lua logs, panel history,
                 traces, diagnostics
```

Rules recorded: the secret value lives in the host credential store; the
handle is opaque; resolution happens on the Rust host side at spawn time; and
logs, panel history, and diagnostics must not be able to obtain the value.
This is stronger than instructing the model not to print keys.

Existing accepted or drafted pieces this composes with: ADR-0006 (host-mediated,
allowlisted, desensitized environment reads with typed denials and audit
events), the security corpus redaction and no-record defaults
([overview](../security/overview.md), P0-AC-026), the panel-environment
Agent View and env-snapshot handle direction in
`bitty-terminal-docs`, and the `credential = "secret://..."` reference-not-value
rule plus the MP-10/MPC-2 secret invariant in the
[Provider Plugin Boundary](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/providers/provider-plugin-boundary.md),
which records the host secret store as a `bitty`-side handoff item. This
capture records only the host-side mechanism direction; provider consent
semantics remain with `bitty-ai`.

## Hard-safety authorization points

**Sensitive paths.** "Never read `.env`" must not be a prompt rule. The
direction requires a real authorization layer in the filesystem path, default-deny for
sensitive locations such as `.env` and `.env.*` variants, `~/.ssh/**`,
`~/.gnupg/**`, `~/.aws/credentials`, token stores, and browser credential
stores, with an explicit user-consent escape rather than silent access.
Because names alone are insufficient (`secret.txt`, `credentials.json`,
`prod-config.yaml` can all carry secrets), the direction proposes composing
`FilesystemScope` + `SensitivePathPolicy` + secret detection/redaction, so a
request returns deny, consent prompt, or a redacted result. Lua plugins must
not be able to bypass this check. This composes with threat T-03 (deny-by-default
resource loader and safe-path policy) and the plugin `fs` capability patterns
in the [security overview](../security/overview.md) and
[Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md);
it adds the content-detection layer and the default sensitive-path set.

**Privilege escalation.** Default is denial: an agent running
`sudo pacman -S ...` is not executed because the model judged it reasonable.
The direction proposes a typed request (`reason`, `command`, `target`) through
host policy to explicit user approval and then **one scoped privileged
execution**. There is no permanent sudo session and the agent never knows the
sudo password. Bitty provides the elevation _mechanism_; whether elevation is
allowed at all is user/project policy.

## Controlled requests, not raw capabilities

The Lua surface should be declarations and requests
(`agent.spawn`, `execution.run`, `panel.acquire`, `fs.read`), each entering the
same authorization path — not raw escape hatches (`os.execute`, `io.open`).
The acceptance criterion is that even a pathological harness
(`while true do agent.spawn(...) end`) produces a stream of
`BudgetExceeded`/`ConcurrencyLimitReached` responses instead of a broken
machine.

This direction is already accepted for the plugin VM: ADR-0005 and ADR-0009
fix the restricted standard library (no `io`, `os.execute`, `loadlib`, or
bytecode) and the capability-checked host API, and the completed CTX-0464 wave
closed the Lua sandbox cap and budget-enforcement gaps. What remains is the
_harness_ surface on top of it, which is `bitty-ai`-owned.

## Out of scope (owner-pending)

Not captured here; owned by `bitty-ai-docs` / the Lua harness work:

- the `agent.spawn`/team/composition Lua API surface and its UX;
- `DelegationBudget` (children, depth, parallelism, token, cost, execution)
  enforcement and recursive-span limits;
- subagent authority attenuation as a runtime guarantee — the
  [Agent Coordination](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/agent/agent-coordination.md)
  direction is draft and owner-pending: it states child authority is
  attenuated, never inherited wholesale, and the draft R5 task-lifecycle
  admission rules keep depth, fan-out, and profile checks with the authority
  while the bounds stay open;
- role and organization models (Commander/Planner/Researcher/Reviewer and
  team shapes such as manager-worker, debate, MapReduce, pair programming);
- the user-hygiene split (what the system cannot technically prevent, such as
  a user pasting a password into chat, stays warning/redaction/no-persist UX).

## Open items

- The v0.1 boundary for these mechanisms is not scheduled; the
  hard-safety set is a direction, not a milestone commitment.
- OQ-057 (capability-enforced role contract, including the execution-sandbox
  layer), OQ-061 (identity domains and panel projection), and OQ-083 (panel
  lease, description, and handoff) remain the contract owners for their parts;
  OQ-058 remains the spatial multi-agent orchestration owner. No new open
  question is opened here.
- Resource-enforcement backends (cgroup v2, Job Objects, macOS mechanisms,
  GPU budgets, free-space guards) and their cross-platform claim boundaries
  are undecided.
- The sensitive-path default set and the secret-detection heuristics need a
  security review before promotion; they must not weaken the existing
  capability and redaction controls.
- Whether the four-layer policy stack becomes a configuration schema
  (composing with the Configuration Model RFC) or stays a runtime evaluation
  is undecided.
- Nothing here is accepted or implemented; promotion requires its own review
  and independent security review where a trust boundary changes.
