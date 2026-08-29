---
title: Security Risk Register
description: Tracks security risks at Pre-alpha / M1 Hardening (16 crates be3bdb4, 32 OQs Accepted), severity, likelihood, required mitigation evidence, stages, and review cadence.
category: security
audience: security-reviewer
document_type: register
status: draft
website_publish: true
sidebar_order: 32
---

# Security Risk Register

Status: **Pre-alpha / M1 Hardening** (2026-08-29, `bitty` `be3bdb4`, 16 crates,
32 OQs `Accepted`, soak ~808 headless tests). All entries remain `Open`
because evidence is `Implemented` (IPC/rich/resolver at `be3bdb4`) but not yet
`Verified` per the
[risk evidence RFC](../specifications/risk-evidence-rfc.md): lifecycle is
`Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`.
A risk may move to `Mitigated` only when the linked control has focused tests,
fuzz corpora, and an independent security-auditor review record with P0-AC
traceability; `Accepted` requires an explicit, time-bounded CarryCtx decision
with owner and rationale. Risk evidence matrix: [evidence-matrix.md](evidence-matrix.md)
(Phase E draft, all rows `Open` until `Verified`; lifecycle
`Open -> Mitigated -> Accepted` per risk evidence RFC).

Severity combines confidentiality, integrity, availability, and recoverability.
Stage is the latest stage by which the mitigation must exist; it is not a claim
that the risk can be ignored until then.

<!-- markdownlint-disable MD013 -->

| ID    | Risk                                                                                 | Severity | Likelihood | Stage | Required mitigation / exit evidence                                                                          | State |
| ----- | ------------------------------------------------------------------------------------ | -------- | ---------- | ----- | ------------------------------------------------------------------------------------------------------------ | ----- |
| R-001 | Malformed or unterminated VT sequences crash, corrupt, or hang the terminal          | Critical | High       | P0    | Bounded incremental parser; malformed/oversized tests; VT/UTF-8/OSC/DCS/APC fuzz corpus                      | Open  |
| R-002 | Compressed graphics or rich content causes memory/CPU exhaustion                     | Critical | High       | P0    | Pre-allocation dimensions, decoded-byte and pixel limits; aggregate image budget; decompression-bomb tests   | Open  |
| R-003 | Graphics or structured protocols read/delete arbitrary local files or devices        | Critical | Medium     | P0    | Deny-by-default resource loader; regular-file and approved-path checks; no protocol-directed deletion        | Open  |
| R-004 | OSC 52 or paste handling leaks clipboard data or executes unintended shell input     | Critical | High       | P0    | Separate read/write policy; read consent; control-character inspection; suspicious-paste confirmation        | Open  |
| R-005 | OSC 8 or rich links invoke dangerous schemes or shell interpolation                  | High     | Medium     | P0    | URI parser, scheme policy, user gesture, direct platform API; adversarial URI tests                          | Open  |
| R-006 | Plugin gains ambient filesystem, process, network, clipboard, or runtime authority   | Critical | High       | P0    | Restricted Lua libraries; capability host; deny-by-default manifest; capability-denial tests                 | Open  |
| R-007 | Plugin crash, loop, callback storm, or allocation blocks the terminal                | Critical | High       | P0    | Per-plugin VM/lifecycle, no hot-path work, instruction/CPU/memory/task budgets, attribution and disable path | Open  |
| R-008 | Plugin or protocol handler mutates Terminal Truth and breaks TUI/input integrity     | High     | Medium     | P0    | Core-owned canonical state; presentation-only API; high-risk protocol registration capability                | Open  |
| R-009 | User cannot recover from a broken or hostile plugin/configuration                    | Critical | Medium     | P0    | `bitty --safe`, minimal built-in config, no third-party load, targeted plugin disable tests                  | Open  |
| R-010 | Project configuration executes when entering an untrusted clone                      | Critical | High       | P1    | Declarative format by default; Once/Always/Reject approval bound to canonical path and content hash          | Open  |
| R-011 | IPC client reads terminal data, injects input, kills processes, or changes config    | Critical | High       | P0    | Current-user endpoint/ACL, peer credentials, no default TCP, per-action scopes, negative auth tests          | Open  |
| R-012 | Scoped child credential leaks through environment or SSH and becomes runtime admin   | Critical | Medium     | P0    | No admin token in child environment; short-lived current-terminal scope; credential-leak tests               | Open  |
| R-013 | Agent treats hostile terminal output as instructions and becomes a confused deputy   | Critical | High       | P0    | Untrusted-observation labeling, read-only default, per-client consent, separation from FS/network authority  | Open  |
| R-014 | DevTools, traces, or crash reports expose secrets, input, clipboard, or environment  | Critical | High       | P1    | Inspect/trace/control scopes; typed redaction; minimal defaults; opt-in input; mode `0600`; export preview   | Open  |
| R-015 | Malicious/compromised plugin update or dependency enters the trusted runtime         | Critical | High       | P0    | Exact lock, checksum, manifest hash, no post-install, transactional activation, rollback                     | Open  |
| R-016 | Plugin update silently requests broader capabilities                                 | Critical | Medium     | P1    | Capability diff blocks update; explicit review and approval; downgrade/rollback path                         | Open  |
| R-017 | Native in-process plugin bypasses Lua capability controls                            | Critical | Medium     | P0    | Reject `.so`/`.dll`/`.dylib` plugin payloads through P1; scoped helper/WASM design for later                 | Open  |
| R-018 | Unsafe/FFI bug in PTY, graphics, font, window, or Lua adapter compromises Bitty      | Critical | Medium     | P0    | Unsafe allowed only in narrow adapters, explicit `SAFETY` rationale, lint gate, focused review/fuzzing       | Open  |
| R-019 | Rust dependency is vulnerable, unmaintained, disallowed, or from an untrusted source | High     | Medium     | P0    | Locked dependencies; advisory/license/source/banned checks; update and exception policy                      | Open  |
| R-020 | Remote-origin detection is wrong and applies a permissive local policy               | High     | Medium     | P0    | `Unknown` is restrictive; origin detection is advisory; explicit user override and tests                     | Open  |
| R-021 | Markdown/rich rendering introduces script execution or unrestricted local resources  | Critical | Medium     | P0    | Markdown-to-constrained-AST/scene pipeline; no WebView scripts; shared resource/URI policies                 | Open  |
| R-022 | Plugin package install executes attacker-controlled setup code                       | Critical | Medium     | P0    | No `postinstall` or install-time plugin execution; verify/store only; first execution after authorization    | Open  |

<!-- markdownlint-enable MD013 -->

## Review cadence (M1 Hardening)

- Review this register when a trust boundary, protocol, capability, package
  source, IPC method, or data-recording feature changes; at M1 hardening each
  `Implemented` crate (`ipc`, `rich`, `resolver` at `be3bdb4`) must link soak
  headless evidence (~808 tests) but stays `Open` until `Verified`.
- Link new implementation tasks to the relevant risk IDs.
- Keep a residual risk open when only part of its exit evidence exists
  (`Implemented` without `Verified` is still `Open` per risk evidence RFC).
- Reassess likelihood after fuzzing, incident reports, dependency advisories, or
  ecosystem growth; do not lower severity merely because code is incomplete.
- Evidence matrix: [evidence-matrix.md](evidence-matrix.md) Phase E draft covers
  R-001..R-022 vs P0-AC-001..034 with implementation, test, CI, adversarial and
  audit columns; no risk moves to `Mitigated` until the per-risk checklist in
  [risk evidence RFC](../specifications/risk-evidence-rfc.md) RS-1..RS-7 is
  satisfied, `just check` plus `act -n` are green, and CarryCtx linkage is
  recorded.
