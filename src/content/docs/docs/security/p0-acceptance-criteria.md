---
title: P0 Security Acceptance Criteria
description: Testable given/when/then acceptance criteria for every normative P0 security control, with verification methods and pass thresholds.
category: security
audience: security-reviewer
document_type: specification
status: normative
website_publish: true
sidebar_order: 33
---

# P0 Security Acceptance Criteria

Status: **normative**, accepted 2026-08-26 by the project initiator. This
document remains a pre-implementation test contract: no criterion may be marked
satisfied until a separate security-auditor persona review confirms recorded,
passing evidence per its verification method.

Every criterion below converts a normative P0 control from
[security overview](overview.md), [threat model](threat-model.md), and
[plugin system](../extensibility/plugin-system.md) into an individually
testable statement. Until each criterion has recorded passing evidence per its
verification method, all linked risks in the
[risk register](risk-register.md) remain **Open**. No criterion is satisfied by
design intent, partial tests, or documentation alone.

## Conventions

- IDs are stable; never reuse or renumber.
- Each criterion cites its source control(s) and linked risk(s).
- Verification methods are `unit`, `integration`, `adversarial` (fuzz,
  negative, malformed, oversized, timeout), and `manual-audit`
  (independent reviewer evidence).
- Pass thresholds state the minimum observable outcome that closes the
  criterion; anything less leaves linked risks open.
- A criterion that cannot be fully verified without human judgment still
  requires recorded, reproducible artifacts (command output, logs) in CarryCtx.

## Parser and resource limits

### P0-AC-001 Bounded VT parser

Source: overview invariant 7, baseline "VT parsing"; threat model "PTY to
terminal state"; abuse T-01. Risks: R-001.

- Given a PTY stream containing CSI parameters at and beyond numeric/parameter-
  count bounds and OSC/DCS/APC payloads at length limits,
  when the parser processes the stream incrementally,
  then no sequence exceeds declared CSI ranges, parameter counts, or string
  payload lengths, and processing completes within the parser time budget.

Verification: adversarial (limit-boundary suite) + unit.
Pass threshold: zero panics/hangs across the full boundary matrix; every limit
asserted by a named test.

### P0-AC-002 Malformed input recovery

Source: threat model "PTY to terminal state"; T-01. Risk: R-001.

- Given invalid UTF-8, truncated escape sequences, unterminated OSC/DCS/APC
  strings, and random byte corpora,
  when fed to the parser as a continuous stream,
  then the parser enters a defined recoverable state and continues parsing.

Verification: adversarial (VT/UTF-8/OSC/DCS/APC fuzz targets).
Pass threshold: long-running fuzz campaign with zero crashes, hangs, or
memory-safety findings; corpus retained in-repo.

### P0-AC-003 Graphics decompression limits

Source: baseline "Graphics"; T-02. Risk: R-002.

- Given a compressed graphics payload whose decoded size, pixel dimensions, or
  aggregate image-store contribution would exceed budgets,
  when Bitty evaluates it before allocation,
  then the payload is rejected before any large allocation occurs.

Verification: adversarial + unit.
Pass threshold: decompression-bomb tests prove rejection happens
pre-allocation (peak memory stays under the declared budget).

### P0-AC-004 Aggregate image-store budget

Source: baseline "Graphics"; invariant 7. Risk: R-002.

- Given repeated valid images accumulating toward the total image-store budget,
  when new images are requested,
  then oldest/excess content is evicted or refused and total stored bytes stay
  within budget.

Verification: integration.
Pass threshold: sustained-load test holds the budget invariant with bounded
memory growth.

## Local resources, clipboard, links

### P0-AC-005 Deny-by-default local file loading

Source: baseline "Local files requested by protocols"; T-03. Risk: R-003.

- Given a protocol-supplied path (graphics file transport, rich-content
  resource) pointing outside approved locations, or to a device, socket,
  `/proc`, `/sys`, or `/dev` entry,
  when Bitty resolves it,
  then access is denied unless an explicit safe-path policy and regular-file
  check pass.

Verification: adversarial + unit.
Pass threshold: negative tests cover devices, sockets, procfs/sysfs/devfs,
symlink escapes, and non-regular files — all denied by default.

### P0-AC-006 No protocol-directed deletion

Source: threat model "PTY to terminal state". Risk: R-003.

- Given any protocol payload requesting deletion of a path,
  when processed,
  then no filesystem deletion occurs through any protocol-driven code path.

Verification: adversarial.
Pass threshold: exhaustive API-surface audit plus tests showing zero delete
operations reachable from protocol input.

### P0-AC-007 Separate OSC 52 read/write policy

Source: baseline "Clipboard and paste"; T-04. Risk: R-004.

- Given remote/untrusted terminal output issuing OSC 52 read versus write,
  when handled,
  then reads require explicit consent and reads/writes are independently
  grantable and deniable capabilities.

Verification: integration + unit.
Pass threshold: untrusted-origin OSC 52 read denied without consent while
write follows its own policy; both tested.

### P0-AC-008 Suspicious paste inspection

Source: baseline "Clipboard and paste"; T-04. Risk: R-004.

- Given pasted text containing C0 controls, NUL, ESC, CR, embedded newline, or
  suspicious Unicode controls,
  when a paste enters the input pipeline,
  then it is flagged for inspection and requires confirmation before delivery;
  bracketed paste remains defense in depth only.

Verification: unit + integration.
Pass threshold: each suspicious class triggers inspection; confirmation gate
proven bypass-resistant in tests (no silent delivery path).

### P0-AC-009 Hyperlink scheme policy and direct launch

Source: baseline "Hyperlinks"; T-05. Risk: R-005.

- Given OSC 8 URIs including dangerous schemes, shell metacharacters, and
  encoding tricks,
  when activated by user gesture,
  then only policy-approved schemes launch via the platform API directly, with
  no shell construction or interpolation anywhere in the path.

Verification: adversarial (URI fuzzing) + unit.
Pass threshold: scheme allowlist enforced; adversarial URI corpus shows no
shell invocation and no dangerous-scheme execution.

### P0-AC-010 Rich rendering constrained AST, no scripts

Source: threat model "Terminal protocols to desktop capabilities". Risk:
R-021.

- Given hostile Markdown/rich input embedding scripts, HTML, or local-resource
  references,
  when rendered,
  then it becomes a constrained AST/scene representation with no WebView script
  execution and resources loaded only through the shared policy-controlled
  loader.

Verification: adversarial + manual-audit.
Pass threshold: no script-execution vector found; renderer pipeline review
confirms AST-only path; local-resource tests reuse P0-AC-005 policy.

## Plugins

### P0-AC-011 Restricted plugin standard library

Source: threat model "Plugin to host"; baseline "Plugins"; T-06. Risks:
R-006, R-017.

- Given a third-party plugin attempting `io`, `os`, `debug`, native module
  loading, ambient package paths, or another plugin's private modules,
  when executed in its VM,
  then every attempt fails with an explicit denial.

Verification: unit + adversarial.
Pass threshold: enumerated deny-list tests all fail closed; no ambient
authority reachable from the restricted stdlib.

### P0-AC-012 Capability-checked host API, least privilege

Source: plugin system "Capabilities and security" (accepted direction);
baseline capability families; T-06. Risk: R-006.

- Given plugins exercising filesystem, process, network, terminal, clipboard,
  UI, protocol, runtime, and debug operations without granted capabilities,
  when calls reach the host API,
  then each is denied unless a specific granular capability was granted; no
  allow-all boolean exists; official plugins obey identical rules.

Verification: integration + adversarial (capability-denial suite).
Pass threshold: every family denies by default; official-plugin parity proven
by running the same denial suite against an official plugin.

### P0-AC-013 Per-plugin VM isolation and failure containment

Source: plugin system "Runtime isolation and lifecycle" (accepted direction);
T-06/T-07. Risks: R-006, R-007.

- Given a plugin that crashes, loops, storms callbacks, or allocates
  unboundedly,
  when its budgets are exceeded or it errors,
  then only that plugin's VM/lifecycle is affected and the host survives.

Verification: adversarial + integration.
Pass threshold: fault-injection suite shows isolation; host process remains
responsive after every injected fault.

### P0-AC-014 Plugin resource budgets attributable

Source: plugin system "Runtime isolation"; baseline "Plugins". Risk: R-007.

- Given plugins consuming CPU/instructions, memory, tasks, callback time, and
  queue depth,
  when usage crosses per-plugin budgets,
  then enforcement fires and attribution reports identify the owning plugin.

Verification: integration.
Pass threshold: each budget dimension has a trigger test with observed
enforcement and correct owner attribution.

### P0-AC-015 Plugins out of hot paths

Source: plugin system "Performance and observability" and author rules
(accepted directions); T-07. Risk: R-007.

- Given the parser, render, and input hot paths,
  when any plugin callback runs,
  then no plugin executes synchronously on those paths and no raw GPU objects
  or Terminal Truth mutation APIs are exposed.

Verification: manual-audit + integration (latency probes).
Pass threshold: architecture audit confirms no hot-path callback registration;
latency tests show plugin load does not breach hot-path budgets.

### P0-AC-016 Terminal Truth core-owned

Source: overview invariant 3; plugin system governing boundary (accepted
direction); T-13. Risk: R-008.

- Given any plugin or ordinary extension surface,
  when inspected,
  then parser state, grid semantics, cursor, modes, and canonical scrollback
  are mutable only by core; presentation contributions compose on surfaces
  above terminal state.

Verification: manual-audit + unit.
Pass threshold: API surface review finds no plugin-reachable mutation path for
core-owned state; attempted mutations via exposed APIs fail.

### P0-AC-017 Protocol registration gated and exclusive

Source: plugin system "Extension levels" Level 4 and claims table; threat model
"Plugin to host". Risk: R-008.

- Given a plugin requesting protocol-handler registration without the explicit
  high-risk capability, or a second claimant on an already-claimed protocol,
  when registration is attempted,
  then the first is denied and the second fails as an exclusive-claim error.

Verification: unit + integration.
Pass threshold: both negative cases tested; no implicit last-loaded-wins
registration path exists.

### P0-AC-018 Native in-process plugins rejected

Source: overview trust boundaries; threat model supply chain; T-06. Risk:
R-017.

- Given plugin payloads that are `.so`, `.dll`, or `.dylib` artifacts,
  when presented for install or activation,
  then they are rejected through P0 and P1.

Verification: adversarial + unit.
Pass threshold: each artifact type rejected at install and activation; no
native-loading code path reachable from plugin packages.

## Recovery

### P0-AC-019 Safe mode always available

Source: overview invariant 10, baseline "Recovery"; secure-lifecycle step 4;
T-12 context. Risk: R-009.

- Given any configuration, installed plugin, or prior crash state,
  when `bitty --safe` starts,
  then it starts successfully with minimal built-in configuration and zero
  third-party plugins loaded.

Verification: integration + adversarial (hostile-config/plugin fixtures).
Pass threshold: safe-mode startup succeeds against the full hostile-fixture
set; verified again on every security-sensitive change.

### P0-AC-020 Targeted plugin disable

Source: baseline "Recovery". Risk: R-009.

- Given a broken or hostile plugin identified by ID,
  when the targeted disable path is used,
  then exactly that plugin is disabled and other plugins and user data are
  preserved.

Verification: integration.
Pass threshold: disable test proves surgical effect and persistence across
restarts.

## IPC, MCP, agents

### P0-AC-021 Local-user IPC endpoint with peer credentials

Source: overview invariant 5, baseline "IPC"; threat model "IPC, CLI, and
child processes"; T-09. Risk: R-011.

- Given the Unix endpoint under `$XDG_RUNTIME_DIR/bitty` (mode `0600`) or the
  Windows named pipe with current-user ACL,
  when a peer connects,
  then peer credentials are validated, same-user-only access is enforced, and
  no TCP listener exists by default.

Verification: integration + adversarial (negative auth tests).
Pass threshold: foreign-user connection denied; socket mode and ACL asserted
by test; startup scan shows no default TCP listener.

### P0-AC-022 Per-action IPC scopes

Source: overview invariant 5; threat model "IPC, CLI, and child processes";
T-09. Risk: R-011.

- Given an authenticated IPC client granted only inspect/read scope,
  when it attempts input injection, process termination, configuration change,
  plugin management, or debug operations,
  then each attempt is denied; reading terminal text never implies broader
  authority.

Verification: adversarial (scope-matrix tests).
Pass threshold: full scope × action matrix shows denial outside grants;
elevation requires separate consent.

### P0-AC-023 Child process scope limitation

Source: threat model "IPC, CLI, and child processes". Risk: R-012.

- Given Bitty spawning a child process,
  when the child environment and inherited scopes are inspected,
  then it holds only a short-lived current-terminal scope, never a runtime
  administrator token, and no credential appears where shell startup or SSH
  forwarding leaks it.

Verification: integration + adversarial (credential-leak tests).
Pass threshold: child-environment dump tests show no admin token or durable
credential; scope expires as specified.

### P0-AC-024 MCP/Agent read-only default with untrusted labeling

Source: overview invariant 6; threat model "MCP, Agents, and DevTools"; T-10.
Risk: R-013.

- Given an MCP/Agent client without elevation,
  when it operates,
  then only read-style operations succeed; every response containing terminal
  content labels it untrusted observation data; sending input, spawning
  processes, installing plugins, or writing configuration requires per-client
  consent and cannot be combined automatically with filesystem/network
  authority.

Verification: integration + manual-audit.
Pass threshold: default-deny matrix passes; labeling asserted in API responses
and confirmed by auditor review of the instruction/data channel separation.

### P0-AC-025 DevTools scopes distinct and ungranted by connection

Source: threat model "MCP, Agents, and DevTools". Risk: R-014.

- Given a DevTools client that has merely connected,
  when it attempts `debug.inspect`, `debug.trace`, or `debug.control`,
  then each is denied until separately granted.

Verification: integration.
Pass threshold: three-scope matrix shows connection alone grants none.

## Sensitive data handling

### P0-AC-026 Trace minimization and redaction

Source: overview "Sensitive data handling", invariant 9; T-11. Risk: R-014
(P1 stage for DevTools breadth; minimization/redaction itself is P0 normative).

- Given traces, diagnostics, and crash reports generated during normal use,
  when written locally,
  then typed sensitive fields are redacted, input recording is off by default
  and opt-in, clipboard and raw environment data are absent by default, files
  carry user-only permissions, and export previews show exactly what will be
  uploaded.

Verification: unit + adversarial (secret-injection tests).
Pass threshold: seeded-secret corpus never appears in default outputs; file
mode `0600` asserted; export preview equals actual export byte-for-byte.

## Supply chain

### P0-AC-027 Install executes no package code

Source: overview invariant 8, baseline "Supply chain"; threat model supply
chain; T-12. Risks: R-015, R-022.

- Given a package install (including a malicious manifest declaring
  post-install hooks),
  when installation proceeds,
  then download, manifest validation, checksum/provenance verification, and
  content-addressed storage complete with zero package-supplied code executed;
  first execution happens only after authorization.

Verification: adversarial + unit.
Pass threshold: instrumented install proves no plugin/script invocation;
hostile-manifest fixtures with hooks execute nothing.

### P0-AC-028 Lock and checksum integrity

Source: baseline "Supply chain". Risk: R-015.

- Given a package whose bytes, manifest hash, source, revision, dependencies,
  or API compatibility differ from the lockfile record,
  when install/update validation runs,
  then the operation fails closed.

Verification: adversarial (tamper tests).
Pass threshold: every tampered dimension independently detected and rejected;
lockfile records all required fields.

### P0-AC-029 Transactional activation and rollback

Source: baseline "Supply chain" and overview invariant 8; T-12. Risk: R-015.

- Given activation that fails mid-way, or a completed activation followed by
  rollback,
  when either occurs,
  then the prior working environment is retained/restored deterministically.

Verification: integration (fault injection).
Pass threshold: induced failures at each activation phase restore the old
environment; rollback reproduces prior state.

### P0-AC-030 Capability increases block update

Source: overview invariant 8; risk register R-016 pattern applied at P0 for
silent additions. Risk: R-016.

- Given an update whose manifest requests capabilities absent from the
  installed version,
  when the update is applied automatically,
  then it blocks pending an explicit permission diff and approval.

Verification: integration.
Pass threshold: capability-diff test blocks auto-update; approval flow gates
activation.

## Configuration trust and origin policy

### P0-AC-031 Project configuration declarative by default

Source: threat model "Configuration and workspace trust"; T-08. Risk: R-010
(P1 for consent UX; the P0-normative portion — declarative default, no
process/network/fs-write/runtime-admin authority — is normative now).

- Given project configuration in an untrusted clone,
  when Bitty loads it,
  then it is treated as declarative data receiving no process, network,
  filesystem-write, or runtime-admin authority, and any project-Lua support
  requires Once/Always/Reject consent bound to canonical path plus content
  hash, invalidated on change.

Verification: integration + manual-audit.
Pass threshold: authority-denial tests pass for project config; consent flow
(hash binding, invalidation) reviewed and tested if present.

### P0-AC-032 Restrictive unknown-origin policy

Source: threat model boundary map ("Unknown uses the restrictive policy").
Risk: R-020.

- Given origin detection that is wrong or unavailable,
  when policy is selected,
  then `Unknown` yields the restrictive policy; detection remains advisory and
  never the sole boundary; only an explicit user override relaxes it.

Verification: adversarial (spoofed/advisory-signal tests).
Pass threshold: forced misclassification tests always fall back to
restrictive policy.

## Platform and dependency hygiene

### P0-AC-033 Unsafe/FFI discipline

Source: threat model actors/failure sources; T-14. Risk: R-018.

- Given `unsafe` code in PTY, graphics, font, window, or Lua adapters,
  when audited,
  then unsafe is confined to narrow reviewed adapters, each block carries an
  explicit `SAFETY` rationale, a lint gate enforces this, and focused
  fuzzing covers the boundary.

Verification: manual-audit + adversarial.
Pass threshold: CI lint gate rejects undocumented unsafe; audit inventory
matches adapter allowlist; boundary fuzzers run clean.

### P0-AC-034 Dependency policy checks

Source: baseline "Dependencies". Risk: R-019.

- Given the locked dependency set,
  when CI runs,
  then advisory, source, license, and banned-dependency checks execute and
  failures block the build; exceptions require a documented, time-bounded
  policy decision.

Verification: integration (CI).
Pass threshold: checks present and gating; seeded vulnerable/banned
dependency is caught; exception workflow documented.

## Coverage traceability

| Criterion      | Source area                   | Linked risks               |
| -------------- | ----------------------------- | -------------------------- |
| P0-AC-001..002 | VT parsing                    | R-001                      |
| P0-AC-003..004 | Graphics                      | R-002                      |
| P0-AC-005..006 | Local files / protocols       | R-003                      |
| P0-AC-007..008 | Clipboard and paste           | R-004                      |
| P0-AC-009      | Hyperlinks                    | R-005                      |
| P0-AC-010      | Rich rendering                | R-021                      |
| P0-AC-011..018 | Plugins                       | R-006, R-007, R-008, R-017 |
| P0-AC-019..020 | Recovery                      | R-009                      |
| P0-AC-021..025 | IPC / MCP / Agents / DevTools | R-011, R-012, R-013, R-014 |
| P0-AC-026      | Sensitive data                | R-014 (P0-normative part)  |
| P0-AC-027..030 | Supply chain                  | R-015, R-016, R-022        |
| P0-AC-031..032 | Config trust / origin         | R-010, R-020               |
| P0-AC-033..034 | Platform / dependencies       | R-018, R-019               |

All 22 register entries are linked. R-001 through R-022 remain **Open** until
their cited criteria record passing evidence plus independent security-auditor
review; no partial evidence closes a risk.
