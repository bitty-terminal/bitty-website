---
title: Threat Model
description: Defines Bitty assets, threat actors, trust boundaries, principal data flows, abuse cases, and required verification gates.
category: security
audience: security-reviewer
document_type: policy
status: normative
website_publish: true
sidebar_order: 31
---

# Threat Model

Status: pre-alpha security contract. Controls are requirements; mechanism
evidence exists in the `bitty` workspace but nothing is `Verified`, and no
statement here claims shipped, stable, or supported behavior.

## Scope

This model covers the future Bitty core, VT and graphics protocols, renderer
interfaces, PTY integration, Lua configuration and plugins, package management,
local IPC and remote control, MCP/Agent access, DevTools, traces, and platform
adapters. It covers local, SSH, container, and unknown terminal origins.

Registry operations, network-exposed daemons, WASM plugins, and enterprise
policy distribution remain future design areas, but their trust transitions
must not be precluded by P0 APIs.

## Assets

- integrity of Terminal Truth, input routing, and displayed presentation;
- confidentiality of terminal content, clipboard, filesystem, credentials,
  command history, environment data, and traces;
- availability of the UI, parser, renderer, PTY, and plugin runtime;
- integrity of configuration, plugin manifests, lockfiles, installed packages,
  and updates;
- authority exposed by process creation, network access, IPC, DevTools, and
  Agent operations;
- recoverability through safe mode, rollback, and deterministic state.

## Threat actors and failure sources

- a remote SSH host or container emitting crafted terminal sequences;
- a local process with access to the PTY or a same-user IPC endpoint;
- a malicious, compromised, abandoned, or typo-squatted plugin;
- a repository containing hostile project configuration or prompt injection;
- an over-privileged or compromised MCP/Agent/DevTools client;
- a compromised registry, publisher account, dependency, or build artifact;
- a buggy plugin or parser causing resource exhaustion without malicious intent;
- unsafe/FFI defects in platform, font, graphics, PTY, or Lua boundaries.

## Boundary map

```text
                          untrusted world
                                 |
          +----------------------+----------------------+
          |                      |                      |
       PTY bytes             Lua plugin           IPC / MCP
          |                      |                      |
    protocol limits        restricted VM          authentication
          |                 capabilities              scopes
          |                      |                      |
          +----------------------+----------------------+
                                 |
                             Bitty core
                                 |
                      reviewed host primitives
                                 |
              PTY / FS / GPU / clipboard / process
```

The origin `Unknown` uses the restrictive policy. Detection that a shell is
remote is advisory only and must never be the sole security boundary.

The trust levels, secret tiers, credential references, agent roles, and
panel lease below are accepted requirements, defined in full under
[Adopted trust and authorization models](#adopted-trust-and-authorization-models).
They narrow authority only and change no current boundary, policy, or P0
gate except by narrowing it.

## Adopted trust and authorization models

Status: accepted by owner ruling 2026-09-23; see [OQ-085, OQ-055, OQ-054,
OQ-057, and OQ-083](../decisions/open-questions.md). These models are
normative requirements on future enforcement points. Mechanisms exist in
the `bitty` workspace but nothing here is `Verified`, and no statement
claims shipped, stable, or supported behavior. Every model below narrows
authority only: none grants it, each check fails closed, and diagnostics
name levels, families, roles, or holders only — never values, prompts, or
payloads.

### Trust levels and capability-domain admission (OQ-085, SEC-21)

Plugin, helper, and tool boundaries sit at one of five trust levels —
0 Core, 1 bundled Lua, 2 third-party Lua, 3 native sidecar, 4 external
tools/MCP/network — where a lower number is more trusted. Ordering is
structural only and never grants authority. Each level admits a fixed set
of capability domains:

| Level | Boundary          | Admitted domains                                                                                             |
| ----- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| L0    | Core              | filesystem, network, process, clipboard, environment, credentials, terminal input, terminal output, IPC, GPU |
| L1    | Bundled Lua       | filesystem, network, process, clipboard, environment, terminal input, terminal output, IPC                   |
| L2    | Third-party Lua   | filesystem, clipboard, environment, terminal output, IPC                                                     |
| L3    | Native sidecar    | filesystem, terminal output, IPC                                                                             |
| L4    | External tool/MCP | none by default — acts only through an explicit per-invocation grant                                         |

Admission is enforced at the effective-authorization boundary before the
grant intersection: a capability family mapped to a domain the level does
not admit is denied fail-closed. Families the matrix does not cover pass
through to their grants, so the matrix never invents authority the
accepted capability grammar does not already name. Unknown levels or
domains deny rather than default. Native sidecars here are out-of-process
helpers; native in-process plugins stay rejected through P0 and P1.

### Secret-storage tiers (OQ-055, SEC-22)

Secrets live in exactly one of four tiers, with policy that only tightens
as sensitivity rises. Every tier requires consent, an audit entry, and
redaction everywhere:

| Tier          | Store                                                               | Consent          | Audit | Redact | Extra                       |
| ------------- | ------------------------------------------------------------------- | ---------------- | ----- | ------ | --------------------------- |
| `host-env`    | Host-consumed environment                                           | Allowlisted read | Yes   | Yes    | Baseline per ADR-0006       |
| `config-file` | `$XDG_CONFIG_HOME/bitty/secrets.env`, mode `0600`                   | Explicit grant   | Yes   | Yes    | —                           |
| `os-keyring`  | OS keyring                                                          | Explicit grant   | Yes   | Yes    | Backend undecided           |
| `command-ref` | External command reference, naming only, never executed by the gate | Explicit grant   | Yes   | Yes    | Subprocess-output isolation |

The tier gate is enforced at secret resolution with names-only audit on
denial. Keyring backend choice, command execution and output handling,
and rotation stay open.

### Credential references (OQ-054, SEC-23)

Provider credentials are named by at most one of `api_key_env` (one
environment variable) or `api_key_cmd` (one program plus arguments,
naming only — the gate never reads the environment and never executes).
Both set is a conflict that denies fail-closed; neither set resolves to
no credential. References carry names, never values, so there is nothing
to redact. A project layer may only narrow credentials — keep the
identical reference or remove it — never widen them by changing the
source, renaming the variable or program, or adding a reference where the
base has none. The provider schema and config surface stay open.

### Role contract for multi-agent work (OQ-057, SEC-25)

Agents act under one of four roles — Commander, Implementer, Tester,
Reviewer — checked at four enforcement points: context read, tool call,
delegation, and sandboxed execution. Authority narrows down the table:

| Role        | May act at                                               | Sandbox restrictions                                               |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| Commander   | Context read, tool call, delegation, sandboxed execution | None beyond grants                                                 |
| Implementer | Context read, tool call, sandboxed execution             | No network; sealed environment                                     |
| Tester      | Context read, sandboxed execution                        | No filesystem write, network, or child process; sealed environment |
| Reviewer    | Context read only                                        | No filesystem write, network, or child process; sealed environment |

The role gate runs before the grant intersection: a role acting outside
its mapped points denies fail-closed. Roles never grant authority,
prompts never confer capability, and delegation only narrows through the
accepted intersection. Shell-write closure through the execution sandbox
stays open.

### Panel lease write hook (OQ-083, SEC-26)

A panel is a workstation with a stable id, a human-readable
title/description, a lease state of `Idle` or `Occupied(holder)`, and
acquire/release/handoff events. Panel write surfaces gate on the lease:
only the current occupant may write; acquiring an occupied panel fails,
and releasing or handing off requires the current holder. The lease is a
UX metaphor, never the agent ontology, and presentation stays
non-authoritative: the lease records who may drive a panel, never what is
true. The bounded lease term, clock, and bus routing stay open.

## Principal data flows and controls

### PTY to terminal state

Arbitrary bytes pass through an incremental VT parser into typed semantic
actions. CSI numeric ranges and parameter counts, OSC/DCS/APC lengths, string
lengths, nesting, notification rate, synchronized-update buffering, scrollback,
and total cell memory all require hard limits. Invalid UTF-8 and unterminated
sequences must be recoverable parser states, not panics.

Graphics adds decoded pixel, dimension, compressed payload, and aggregate store
limits to prevent decompression bombs. File and shared-memory transports are
capability requests: the default is deny; allowed paths must resolve to regular
files under approved locations. Devices, sockets, `/proc`, `/sys`, and `/dev`
are rejected. A protocol-supplied path never authorizes deletion.

### Terminal protocols to desktop capabilities

OSC 52 clipboard read and write are separate decisions; reads require explicit
consent under the normal policy. Paste inspection detects C0 controls, NUL,
escape, carriage return, embedded newline, and suspicious Unicode controls.
Bracketed paste is defense in depth, not a complete boundary.

> Platform residual (CTX-0184, `bitty` #283, closed): while Bitty is alive
> and focused on Hyprland 0.56.2, primary-selection reads fail — including
> healthy pure-CLI `wl-copy --primary` staging that succeeds with Bitty
> closed. Root cause is focus-gated primary delivery, compositor-side; no
> Bitty mechanism was found (same-PID A/B reversal), so no Bitty fix is
> indicated and the upstream report draft stays unfiled by owner decision.
> This residual does not weaken T-04: consent, paste inspection, and the
> restrictive remote/unknown policy are unchanged.

OSC 8 links pass through URI parsing, scheme policy, and a user gesture. The
platform opens an approved URI without shell construction or interpolation.
Titles, notifications, cwd, hostnames, and command metadata are bounded,
untrusted strings and are never expanded or executed.

Rich Markdown becomes a constrained AST and scene representation, not HTML in a
WebView. Script execution is forbidden. Local resources requested by rich or
custom protocols use the same policy-controlled loader as graphics.

### Plugin to host

Each plugin has its own Lua VM, namespace, lifecycle owner, and resource budget.
The standard library excludes `io`, `os`, `debug`, native loading, and ambient
package paths. Filesystem, process, network, terminal, clipboard, UI, protocol,
runtime, and debug operations use a capability-checking host API.

Protocol registration is high risk because any PTY peer could invoke the
handler. It requires an explicit capability and exclusive registration.
Plugins receive presentation primitives, not raw GPU objects, terminal state
mutation, or synchronous hot-path callbacks. CPU/instruction, memory, task,
callback-time, and queue budgets are attributable and observable.

### Configuration and workspace trust

User `init.lua` is trusted user code. That trust does not extend to plugins,
distributions, system search paths, or project files. System policy has a known
source and cannot be weakened by user configuration.

Project configuration is declarative by default. If project Lua is ever
supported, first use asks for Once, Always, or Reject while showing canonical
path and content hash. A content change invalidates approval. Project config
does not receive process, network, filesystem-write, or runtime-admin authority.

### IPC, CLI, and child processes

On Unix-like systems, IPC uses a current-user endpoint under
`$XDG_RUNTIME_DIR/bitty`, mode `0600`, with peer credential validation. Windows
uses a named pipe with a current-user ACL. No TCP listener is enabled by
default.

Inspect, input, manage, configure, plugin-manage, process-spawn, and debug are
different scopes. Reading terminal text never implies permission to inject
input or terminate a process. A child process may receive a short-lived,
current-terminal scope, never a runtime administrator token. Credentials must
not be placed where shell startup or SSH environment forwarding leaks them.

### MCP, Agents, and DevTools

MCP defaults to operations such as listing terminals, reading snapshots,
examining render statistics, and inspecting effective configuration. Sending
input, spawning a process, installing a plugin, or writing configuration needs
separate, per-client elevation and consent.

Terminal output can contain prompt injection. Every API response labels it as
untrusted observation data. It must not be mixed into instruction or policy
channels, and the terminal reader cannot automatically combine its data with
filesystem and network authority.

DevTools distinguishes `debug.inspect`, `debug.trace`, and `debug.control`.
Connection alone grants none of them. Trace collection minimizes data by
default, redacts typed sensitive fields, keeps input recording opt-in, and
creates user-only files.

### Agent automation and credential prompts (candidate)

A candidate defense model for agent-driven interactive input is registered as
[OQ-086](../decisions/open-questions.md) and specified in the
[IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md#candidate-sensitive-input-interlock-and-interaction-policy-oq-086)
candidate sensitive-input interlock; the command-side audit is specified by the
[AI Architecture](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/architecture/ai-architecture.md) candidate command risk
classification ([OQ-087](../decisions/open-questions.md)). It composes with
the normative rules above and does not replace them:

- sensitive-input detection uses kernel PTY state (no-echo) rather than output
  text patterns, because prompts are locale-dependent, false-positive prone,
  and spoofable by hostile output;
- an interaction class decides whether automation is allowed at all: secret
  input stays human-only, destructive confirmations require an explicit human
  decision, and only safe interactive prompts may be auto-answered under the
  agent's own granted input scope;
- while the target PTY is in no-echo mode, agent input dispatch fails closed
  regardless of grant, and no-echo input never enters grid, scrollback,
  snapshots, traces, or agent observations;
- candidate acceptance evidence must prove both directions (no-echo programs
  enter the interlock; echo-on and spoofed prompts do not) before the model
  moves beyond candidate.

This candidate adds no capability and weakens no P0 gate: T-10, T-11, R-013,
and R-014 keep their current required defenses until a reviewed acceptance
decision replaces or extends them.

### Plugin and dependency supply chain

Installation performs download, manifest validation, checksum/provenance
verification, and content-addressed storage without running plugin code or
post-install scripts. Exact source, revision, dependencies, API compatibility,
manifest hash, and checksum are recorded in the lockfile.

Activation is transactional. Failure retains the old environment; rollback is
available. New capabilities block automatic update and require a permission
diff plus approval. Official packages receive no sandbox bypass. Native
in-process plugin artifacts are rejected through P0 and P1.

## Abuse cases and required defenses

<!-- markdownlint-disable MD013 -->

| ID   | Abuse case                                                    | Required defense                                                               |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| T-01 | Crafted OSC/APC/DCS crashes or wedges Bitty                   | Bounded parser, timeout/budget, fuzzing, panic-free recovery                   |
| T-02 | Tiny compressed image expands to huge allocation              | Decoded-size and pixel limits before allocation                                |
| T-03 | Graphics/rich protocol reads a local secret path              | Deny-by-default resource loader, regular-file and safe-path policy             |
| T-04 | Remote output reads clipboard or injects dangerous paste      | Separate consent, paste inspector, restrictive remote/unknown policy           |
| T-05 | Malicious link reaches a shell or dangerous scheme            | URI parser, scheme allowlist, user gesture, no shell interpolation             |
| T-06 | Plugin executes commands or escapes its VM                    | Restricted libraries, capability host, no native in-process plugin             |
| T-07 | Plugin starves the hot path or memory                         | No hot-path callbacks, budgets, attribution, disable/recovery                  |
| T-08 | Entering a cloned repository executes project Lua             | Declarative config or path-and-hash workspace consent                          |
| T-09 | Same-user/remote process takes over runtime IPC               | Local ACL, peer credentials, least-privilege action scopes                     |
| T-10 | Agent follows instructions printed by hostile terminal output | Untrusted-data labeling, read-only default, separated authorities              |
| T-11 | Trace or crash report leaks credentials                       | Default minimization, redaction, opt-in input, user-only files                 |
| T-12 | Update introduces malicious code or new privileges            | Locks, checksums, no install scripts, permission diff, transaction/rollback    |
| T-13 | Plugin changes canonical grid semantics                       | Terminal Truth is core-owned; presentation-only plugin contract                |
| T-14 | Unsafe/FFI defect compromises the process                     | Narrow unsafe budget, safety comments, review, fuzzing, process isolation path |

<!-- markdownlint-enable MD013 -->

## Verification gates

Before a security boundary can be marked implemented, evidence must cover:

- positive, negative, malformed, oversized, and timeout cases;
- platform-specific transport permissions and peer identity;
- property/fuzz tests for attacker-controlled parsers and manifests;
- capability denial and permission-elevation behavior;
- secret-redaction tests and explicit export review;
- plugin failure, transactional rollback, and safe-mode startup;
- dependency advisory/source policy checks;
- review by a separate security-auditor persona.

Residual risks and stage ownership are tracked in
[risk-register.md](risk-register.md).
