---
title: Security Risk Register
description: Tracks security risks at Pre-alpha / Engineering Milestones M1-M8 (18 crates 29772a3, 32 OQs Accepted), severity, likelihood, required mitigation evidence, stages, and review cadence.
category: security
audience: security-reviewer
document_type: register
status: draft
website_publish: true
sidebar_order: 32
---

# Security Risk Register

Status: **Pre-alpha / Engineering Milestones M1-M8** (2026-09-08, `bitty` `29772a3` previous `c49ead1` baseline `de134ec`, 18 crates,
32 OQs `Accepted`, compat-lab/perf hardening and UX wave through `29772a3` plus semantic-terminal P1-P5 `Implemented`-only plus scrollbar overlay `Implemented`-only plus workspace/frameHash wave `Implemented`-only plus experimental slice `c0aadd2`/`7e3104d`/`a8735d0`).
`R-005`/`R-006`/`R-007` are `Mitigated` at `bitty` `d4d75e9`
(`5bdcdbd`/`0afc94d`/`d4d75e9`, Issues 137/#138/#139, baseline `de134ec`)
per RS-1..RS-7, `R-004` remains `Open` at `7a4ee41` (audit 2026-08-31), all others
remain `Open` because evidence is `Implemented` (IPC/rich/resolver hardening,
experimental `c0aadd2`/`7e3104d`/`a8735d0` at `a8735d0` but not yet `Verified`) per the
[risk evidence RFC](../specifications/risk-evidence-rfc.md): lifecycle is
`Draft -> Experimental Implementation -> Accepted -> Verified -> Compatible -> Release-ready`
(spec) and `Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`
(crate). Experimental code is review evidence, not `Verified`.
A risk may move to `Mitigated` only when the linked control has focused tests,
fuzz corpora, and an independent security-auditor review record with P0-AC
traceability; `Accepted` requires an explicit, time-bounded CarryCtx decision
with owner and rationale. Risk evidence matrix: [evidence-matrix.md](evidence-matrix.md)
(Phase E draft, `R-005`/`R-006`/`R-007` `Mitigated` at `d4d75e9`, `R-004`
`Open` at `7a4ee41`; lifecycle `Open -> Mitigated -> Accepted` per risk evidence
RFC). `R-004` was re-audited at `bitty` `7a4ee41` (baseline `de134ec`) per
[`docs/security/audits/clipboard-2026-09.md`](https://github.com/bitty-terminal/bitty/blob/7a4ee41/docs/security/audits/clipboard-2026-09.md)
(2026-08-31, CTX-0097) and remains **Open** with residual platform-backend,
real-window UX, and `8192`-byte bound-scope limits (see matrix row); `R-005`
at `5bdcdbd`, `R-006` at `0afc94d`, `R-007` at `d4d75e9` are **Mitigated** with
residual UX/grant/budget soak gaps (see matrix rows). FIND-0002 remediation
wave (2026-09-07, `bitty` origin `main` `1fc6294`): all 14 open ledger items
merged (`ec95c5c` PR #336 through `0cb244d` PR #364 plus `0e65f85` PR #366;
see the [evidence-matrix wave table](evidence-matrix.md#find-0002-remediation-wave-implemented-only-2026-09-07)
for the per-risk mapping). Every affected row below stays `Open`: the wave is
`Implemented`-only evidence pending auditor review per RS-1..RS-7, and no
required mitigation below is weakened.
Experimental implementations `c0aadd2` + `7e3104d` + `a8735d0` are `Implemented`
(experimental) not `Verified`/`Compatible`. Canonical snapshot:
[`project-state.json`](../project/project-state.json) (synchronized `29772a3`,
`2026-09-08`, `Pre-alpha / Engineering Milestones M1-M8`, `R-004` `Open`,
`R-005`/`R-006`/`R-007` `Mitigated`, experimental `c0aadd2`/`7e3104d`/`a8735d0`
`Implemented` not `Verified`, release `v0.0.19`) validated by `bun .github/scripts/check-state.mjs`.

Severity combines confidentiality, integrity, availability, and recoverability.
Stage is the latest stage by which the mitigation must exist; it is not a claim
that the risk can be ignored until then.

<!-- markdownlint-disable MD013 -->

| ID    | Risk                                                                                 | Severity | Likelihood | Stage | Required mitigation / exit evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | State     |
| ----- | ------------------------------------------------------------------------------------ | -------- | ---------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| R-001 | Malformed or unterminated VT sequences crash, corrupt, or hang the terminal          | Critical | High       | P0    | Bounded incremental parser; malformed/oversized tests; VT/UTF-8/OSC/DCS/APC fuzz corpus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Open      |
| R-002 | Compressed graphics or rich content causes memory/CPU exhaustion                     | Critical | High       | P0    | Pre-allocation dimensions, decoded-byte and pixel limits; aggregate image budget; decompression-bomb tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Open      |
| R-003 | Graphics or structured protocols read/delete arbitrary local files or devices        | Critical | Medium     | P0    | Deny-by-default resource loader; regular-file and approved-path checks; no protocol-directed deletion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Open      |
| R-004 | OSC 52 or paste handling leaks clipboard data or executes unintended shell input     | Critical | High       | P0    | Separate read/write policy; read consent; control-character inspection (C0 excl tab/NUL/ESC/CR/LF/C1/BiDi) with `23` `suspicious_paste` (`19` baseline at `de134ec` + `4` remediation at `7a4ee41`) + `13` `paste` unit + `CLIPBOARD_MAX_BYTES=8192` char-boundary bound and bracketed `?2004` defense-in-depth; audit at `7a4ee41` keeps **Open** due to residual platform-backend (`arboard` X11/Wayland/macOS/Windows), real-window UX, and `8192` post-acquisition bound-scope gaps (see [evidence-matrix.md](evidence-matrix.md))                                                                                 | Open      |
| R-005 | OSC 8 or rich links invoke dangerous schemes or shell interpolation                  | High     | Medium     | P0    | `bitty-platform` `url.rs` allowlist `http`/`https`/`mailto`/`file` with one-layer percent-decode, `URL_MAX_LEN 4096`, `ValidatedUrl`, file authority-free `file:///` with `..` and encoded traversal deny, `bitty-rich` `hyperlink.rs` `is_safe_hyperlink_uri` + `hyperlink_at` `checked_mul` overflow safe, `bitty-runtime` `ActivationGesture` single-use + `intercept_open_url` veto-wins + re-validate at spawn (`5bdcdbd`, Issue #137); adversarial URI corpus zero shell interpolation, 4096/1024 table bounds, crate-private `ValidatedUrl` only                                                                | Mitigated |
| R-006 | Plugin gains ambient filesystem, process, network, clipboard, or runtime authority   | Critical | High       | P0    | `bitty-plugin-host` `capability.rs` closed set `CapabilityId` 512B, controls+unicode whitespace deny, `CapabilityFamily::denied_without_grant` + `closed_identifiers`, `grant.rs` `is_granted` intersects declared+granted+hash, `manifest.rs` fs patterns control deny, `bitty-lua` `piccolo 0.3.3` restricted stdlib (`base`/`math`/`string`/`table`/`utf8`/`os.clock`/`debug.traceback`) denies `io`/`os.execute`/`package.loadlib`/bytecode per ADR-0005 (`0afc94d`, Issue #138); capability-denial matrix exhaustive, ambient-authority fuzz denied                                                               | Mitigated |
| R-007 | Plugin crash, loop, callback storm, or allocation blocks the terminal                | Critical | High       | P0    | Per-plugin `piccolo` VM `LuaVm` isolated `PluginId`+generation `forbid(unsafe_code)`, Fuel + `50 ms` wall/`8 ms` warning + `32 MiB` hard via `total_memory()`, `Host::publish`/`EventPipeline::publish` queue budgets PerSub `64` strict / PerPlugin `1024` events/`256 KiB` / Global `8192`/`2 MiB` DropOldest hard-gated, attribution `PluginId`+generation `VmBudgetSnapshot`, lifecycle `reload` transactional fail-closed `Generation overflow` + command-owner guard (`d4d75e9`, Issue #139); fault-injection suite isolates crash/loop/storm/alloc per-VM, host responsive, reclaim PB-3 15% after GC ten-cycle | Mitigated |
| R-008 | Plugin or protocol handler mutates Terminal Truth and breaks TUI/input integrity     | High     | Medium     | P0    | Core-owned canonical state; presentation-only API; high-risk protocol registration capability                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Open      |
| R-009 | User cannot recover from a broken or hostile plugin/configuration                    | Critical | Medium     | P0    | `bitty --safe`, minimal built-in config, no third-party load, targeted plugin disable tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Open      |
| R-010 | Project configuration executes when entering an untrusted clone                      | Critical | High       | P1    | Declarative format by default; Once/Always/Reject approval bound to canonical path and content hash                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Open      |
| R-011 | IPC client reads terminal data, injects input, kills processes, or changes config    | Critical | High       | P0    | Current-user endpoint/ACL, peer credentials, no default TCP, per-action scopes, negative auth tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Open      |
| R-012 | Scoped child credential leaks through environment or SSH and becomes runtime admin   | Critical | Medium     | P0    | No admin token in child environment; short-lived current-terminal scope; credential-leak tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Open      |
| R-013 | Agent treats hostile terminal output as instructions and becomes a confused deputy   | Critical | High       | P0    | Untrusted-observation labeling, read-only default, per-client consent, separation from FS/network authority                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Open      |
| R-014 | DevTools, traces, or crash reports expose secrets, input, clipboard, or environment  | Critical | High       | P1    | Inspect/trace/control scopes; typed redaction; minimal defaults; opt-in input; mode `0600`; export preview                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Open      |
| R-015 | Malicious/compromised plugin update or dependency enters the trusted runtime         | Critical | High       | P0    | Exact lock, checksum, manifest hash, no post-install, transactional activation, rollback                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Open      |
| R-016 | Plugin update silently requests broader capabilities                                 | Critical | Medium     | P1    | Capability diff blocks update; explicit review and approval; downgrade/rollback path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Open      |
| R-017 | Native in-process plugin bypasses Lua capability controls                            | Critical | Medium     | P0    | Reject `.so`/`.dll`/`.dylib` plugin payloads through P1; scoped helper/WASM design for later                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Open      |
| R-018 | Unsafe/FFI bug in PTY, graphics, font, window, or Lua adapter compromises Bitty      | Critical | Medium     | P0    | Unsafe allowed only in narrow adapters, explicit `SAFETY` rationale, lint gate, focused review/fuzzing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Open      |
| R-019 | Rust dependency is vulnerable, unmaintained, disallowed, or from an untrusted source | High     | Medium     | P0    | Locked dependencies; advisory/license/source/banned checks; update and exception policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Open      |
| R-020 | Remote-origin detection is wrong and applies a permissive local policy               | High     | Medium     | P0    | `Unknown` is restrictive; origin detection is advisory; explicit user override and tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Open      |
| R-021 | Markdown/rich rendering introduces script execution or unrestricted local resources  | Critical | Medium     | P0    | Markdown-to-constrained-AST/scene pipeline; no WebView scripts; shared resource/URI policies                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Open      |
| R-022 | Plugin package install executes attacker-controlled setup code                       | Critical | Medium     | P0    | No `postinstall` or install-time plugin execution; verify/store only; first execution after authorization                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Open      |

<!-- markdownlint-enable MD013 -->

## FIND-0002 remediation wave residuals (2026-09-07, Implemented-only)

The wave closes the code defects; it does not close the risks. Residuals per
affected row, all `Open` pending auditor review: R-001 keeps fuzz and
boundary-matrix review for the cursor/tab bound plus combining buffer; R-002
keeps decompression-bomb proof review for the headless surface cap; R-003
keeps negative-loader review for the empty-roots rejection; R-004 keeps
consent-matrix review for the OSC 52 read reply plus write decode; R-011
keeps negative-auth review for the symlink attestation; R-015/R-022 keep
tamper-suite review for the prune ceiling plus TOFU fail-closed; R-016 keeps
capability-diff review for the manifest-time closed set; R-021 keeps
AST-pipeline review for Scene-admission SCN-1..3; R-007 keeps
fault-injection review for the fuel step slice. Tooling items
(`CR-COMPAT-01`, `CR-APP-01`, `CR-UI-01`) carry no risk residual.

## Review cadence (engineering milestones)

- Review this register when a trust boundary, protocol, capability, package
  source, IPC method, or data-recording feature changes; each `Implemented`
  crate (`ipc`, `rich`, `resolver` hardening through `1835175`) must link
  headless evidence but stays `Open` until `Verified`, except
  `R-005`/`R-006`/`R-007` `Mitigated` at `d4d75e9` per RS-1..RS-7.
  `R-004` links `7a4ee41` (`de134ec` baseline) `23`+`13`+`4` tests and the
  2026-08-31 clipboard audit, and remains `Open` due to residual platform-backend,
  real-window UX, and `8192` bound-scope limits; `R-005` links `5bdcdbd`
  hyperlink allowlist + activation gate, `R-006` links `0afc94d`
  deny-by-default + restricted stdlib, `R-007` links `d4d75e9` per-plugin VM +
  budgets, each `Mitigated` with residual UX/grant/budget soak gaps.
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
  recorded; `R-005`/`R-006`/`R-007` moved `Open -> Mitigated` at `d4d75e9` per
  PR #144/#145/#146 independent review, `R-004` remains `Open` per 2026-08-31
  audit.
