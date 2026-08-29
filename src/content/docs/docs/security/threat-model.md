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

Status: pre-implementation security contract. Controls are requirements, not
claims about shipped behavior.

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
