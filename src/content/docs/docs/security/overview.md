---
title: Security Overview
description: Defines the normative pre-implementation security posture, trust boundaries, capability families, and P0 baseline for Bitty.
category: security
audience: mixed
document_type: policy
status: normative
website_publish: true
sidebar_order: 30
---

# Security Overview

Status: pre-implementation design contract.

This document defines the security posture that future Bitty implementations
must preserve. It does **not** claim that any control described here exists in
code today. When implementation begins, each control needs tests and review
evidence before its status may change.

## Security objective

Bitty is a terminal microkernel and extension platform. It parses bytes from
local programs, SSH peers, containers, and TUIs while mediating access to local
capabilities such as the clipboard, filesystem, processes, windows, IPC, and
developer tooling. Its default posture is therefore:

> Data and requests from PTYs, plugins, projects, IPC clients, MCP clients,
> Agents, packages, and reference repositories are untrusted until an explicit,
> narrowly scoped policy grants a capability.

Security is an architectural property, not an optional `security_enabled`
branch. Every transition into a trusted host primitive must pass through a
policy, capability, authenticated scope, or resource budget.

## Security invariants

These invariants are normative:

1. PTY output never receives general host authority.
2. Third-party plugins start without filesystem, network, process, clipboard,
   runtime-control, debug, or protocol-registration authority.
3. Plugins may alter presentation but must not alter Terminal Truth: parser
   state, grid semantics, cursor state, modes, or canonical scrollback.
4. Plugins do not execute in the terminal, render, or input hot paths.
5. IPC is local-user-only by default and every operation has an explicit scope.
6. MCP and Agent access is read-only by default; terminal content remains
   untrusted observation data, never instruction text.
7. Every untrusted input has size, time, nesting, rate, and memory limits
   appropriate to its protocol.
8. Plugin installation runs no package code, and updates cannot silently add
   capabilities.
9. Traces, diagnostics, and crash reports are secret-minimizing by default.
10. `bitty --safe` can always start with minimal built-in configuration and no
    third-party plugins.

Invariants 1, 5, 6, 7, and 8 are release-blocking security boundaries. An API
that bypasses them must not enter P0, even temporarily.

## Trust boundaries

<!-- markdownlint-disable MD013 -->

| Source or domain                        | Default trust                          | Allowed path into Bitty                                               |
| --------------------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| PTY bytes, including SSH and containers | Untrusted                              | Bounded VT parser, protocol policy, resource budget                   |
| User `init.lua`                         | Trusted user code                      | Config VM and validated `ConfigPlan`                                  |
| System or distribution configuration    | Trusted only after source verification | Explicit policy/default modules; policy cannot be overridden by users |
| Project configuration                   | Untrusted                              | Prefer declarative data; explicit path-and-hash approval              |
| Third-party plugin                      | Untrusted                              | Per-plugin VM, restricted standard library, capability host API       |
| IPC client                              | Untrusted until authenticated          | Current-user transport, peer credentials, scoped command registry     |
| MCP or Agent client                     | Untrusted automation                   | Per-client consent and least-privilege scopes                         |
| DevTools client                         | Privileged but scoped                  | Separate inspect, trace, and control scopes                           |
| Package or dependency source            | Untrusted supply chain                 | Manifest validation, lock, checksum, provenance policy                |
| OS primitives                           | Trusted computing base                 | Small, reviewed platform adapters and explicit `unsafe` boundaries    |

<!-- markdownlint-enable MD013 -->

An isolated Lua VM is a namespace and failure boundary, not an OS sandbox. The
host must construct a restricted standard library and expose privileged work
only through capability-checked APIs. Native in-process plugins are forbidden
through P0 and P1; future high-isolation extensions should use WASM or a helper
process with scoped IPC.

## Capability families

Capabilities must be granular enough that compromise of one feature does not
grant unrelated authority. Initial families include:

- terminal: semantic read, raw read, self input, all-terminal input, manage;
- UI: rich presentation, overlay, and high-risk protocol registration;
- clipboard: read and write as separate capabilities;
- filesystem: read/write with explicit path patterns;
- process and network: executable constraints and destination policy;
- runtime: inspect, configure, plugin-manage, and administrative control;
- debug: inspect, trace, and control as distinct scopes;
- platform: notifications, titles, hyperlinks, and image-file access.

An allow-all boolean is not an acceptable substitute. Official plugins obey the
same capability model as community plugins.

## P0 security baseline

The following controls are required before Bitty is considered safe for normal
use. All are currently **unimplemented**.

<!-- markdownlint-disable MD013 -->

| Area                               | P0 requirement                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| VT parsing                         | Bounds on CSI parameters and OSC/DCS/APC payloads; malformed input never panics          |
| Graphics                           | Compressed and decoded size limits, dimension limits, total image-store budget           |
| Local files requested by protocols | Deny by default; regular-file checks and explicit safe-path policy                       |
| Clipboard and paste                | Separate OSC 52 read/write policy; suspicious paste inspection and confirmation          |
| Hyperlinks                         | Parsed scheme policy and direct platform launch without shell interpolation              |
| Plugins                            | Restricted Lua libraries, per-plugin VM, least privilege, CPU/instruction/memory budgets |
| Supply chain                       | Manifest, exact lock, checksum, no install scripts, transactional activation             |
| Recovery                           | Safe mode and targeted plugin disable paths                                              |
| IPC                                | User-owned local endpoint, peer credential validation, per-action scopes, no default TCP |
| Testing                            | Fuzz targets for VT, UTF-8, OSC, DCS, APC, graphics, config, and manifests               |
| Dependencies                       | Advisory, source, license, and banned-dependency checks in CI                            |

<!-- markdownlint-enable MD013 -->

P1 adds project trust persistence, update permission diffs, authenticated
DevTools/MCP scopes, and mature rollback. P2 may add registry provenance,
revocation, WASM/helper-process isolation, and organization policy packs.
Deferring a control to P1 or P2 must not create a P0 bypass.

## Sensitive data handling

Terminal text, command history, PTY bytes, input, clipboard events, cwd,
process metadata, environment variables, and plugin state can contain secrets.
Recording input is a separate opt-in. Clipboard and raw environment data are not
recorded by default. Trace and crash-report writers must support typed sensitive
fields and redaction, create local files with user-only permissions, and expose
exactly what will be exported before any upload.

## Secure lifecycle

Security-sensitive changes require:

1. a threat-model or risk-register update;
2. explicit capability and trust-boundary review;
3. negative tests, limit tests, and fuzzing where input is attacker-controlled;
4. verification that `--safe` still works;
5. dependency and supply-chain checks;
6. reviewer and security-auditor evidence recorded in CarryCtx.

Open threats and acceptance criteria are tracked in
[threat-model.md](threat-model.md) and [risk-register.md](risk-register.md).
