---
title: ADR 0006 - os.getenv Exposure and Bitty Module Policy
description: Defines the accepted os.getenv denial and desensitized bitty.env.get with capability-gated allowlist, audit logging, and migration for OQ-031
category: decisions
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 36
---

# ADR 0006 - os.getenv Exposure and Bitty Module Policy

## Status

Accepted on 2026-08-29 by the project initiator, closing
[OQ-031](../open-questions.md). This ADR defines the accepted os.getenv denial
and desensitized `bitty.env.get` with capability-gated allowlist, audit logging,
and migration at the design level; it closes
[OQ-031](../open-questions.md). It does not describe implemented behavior, does
not authorize shipped, stable, normative, or compatibility-guaranteed behavior,
and does not weaken any normative security control. This ADR refines
[ADR 0005](ADR-0005-lua-pins-and-stdlib.md) and the
[Lua Runtime RFC](../../specifications/lua-runtime-rfc.md)
without contradicting either. It answers the residual Configuration VM exposure
question the Lua Runtime RFC explicitly deferred to OQ-031. Frontmatter `status`
is `accepted` per the repository metadata schema; document status is Accepted.
Lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

- Deciders: project initiator (DEC-001), security-auditor persona (audit gate
  per Lua Runtime RFC security review and R-014 and T-11 and P0-AC-026),
  `bitty-lua` and `bitty-config` maintainers (CTX-0053).
- Related: OQ-031 (primary), OQ-009 (closed parent, 2026-08-27 CTX-0047),
  ADR 0005 final allowlist, Lua Runtime RFC Accepted 2026-08-27 restricted
  standard library, [Security overview](../../security/overview.md) invariant 9
  and sensitive-data handling, [Risk register](../../security/risk-register.md)
  R-014, [P0 acceptance criteria](../../security/p0-acceptance-criteria.md)
  P0-AC-026 trace minimization and redaction.

## Context

### Why os.getenv is still open

- **Shared baseline denies ambient env.** The Lua Runtime RFC accepted
  standard-library subset allows `os.clock`, `os.time`, `os.date` and denies
  `os.execute`, `os.getenv`, `os.remove`, `os.rename`, `os.exit`. ADR 0005
  records the same denial as the final allowlist baseline for both Config VM
  and per-plugin VM with per-VM deltas none by default — `os.getenv` exposure
  is OQ-031. Trusted-user status for `init.lua` means fewer prompts, never
  ambient OS authority.
- **OQ-031 question.** The open-question register asks whether `os.getenv` is
  exposed to the Configuration VM given trace-minimization and redaction
  defaults, and what host-provided alternative via the versioned `bitty` module
  exists. The Lua Runtime RFC note on per-VM deltas says privileged work still
  goes through the capability-checked host module; this ADR decides that path.
- **Security invariants that cannot be weakened.** Security overview invariant 9
  requires traces, diagnostics, and crash reports to be secret-minimizing by
  default. Its sensitive-data handling section lists environment variables
  alongside terminal text, clipboard events, and cwd as secret-capable and
  states that clipboard and raw environment data are not recorded by default,
  with typed sensitive fields, redaction, user-only file modes, and export
  preview. Risk R-014 and P0-AC-026 make minimization and redaction
  P0-normative. Any `os.getenv` exposure must preserve those gates.
- **Legitimate use exists but is narrow.** Configuration authors legitimately
  read a handful of conventional keys for theme or toolchain selection
  (`EDITOR`, `SHELL`, `TERM`, `BITTY_PROFILE`, `XDG_CONFIG_HOME` narrowly),
  but broad ambient reads leak secrets (`AWS_SECRET_ACCESS_KEY`, `GITHUB_TOKEN`,
  `DATABASE_URL`) into diagnostics, traces, and plugin-visible state. A deny-by-
  default host-mediated surface is the least-privilege fit.
- **Two-VM split widens the blast radius if left ambient.** Since CTX-0040 the
  Config VM is `mlua` plus vendored Lua 5.4 and the plugin VM is `piccolo`
  0.3.3. An ambient `os.getenv` in either VM would let a hostile project tree
  or a third-party plugin exfiltrate the host environment without a capability
  grant, violating R-006 and R-014 together.

### What this ADR closes versus defers

- **Closes OQ-031:** `os.getenv` exposure policy for every VM class,
  desensitization and minimization defaults, the desensitized `bitty.env.get`
  alternative with capability gating, audit logging, and migration path.
- **Explicitly not this ADR:** exact Lua and `mlua` and `piccolo` pins and
  upgrade cadence and unsafe audit (OQ-030, ADR 0005), async and Send boundary
  plus GC tuning plus Config VM budget charging (OQ-032), RC value tuning beyond
  the measurement harness (OQ-014), project-trust database mechanics (OQ-010).

## Decision

### os.getenv is denied in every VM — typed denial not silent nil

- `os.getenv` does not exist in any VM. The host either removes the field from
  the `os` table or installs a function that always errors with a typed denial.
- Error class is `runtime` with stable code `E_ENV_DENIED` and bounded
  developer-facing English message that names the offending call and points to
  the replacement. The message must not echo the variable value and must not
  dump caller environment content.
- `os.setenv`, `os.execute`, `os.remove`, `os.rename`, `os.exit`, `io.popen`
  remain denied per the existing allowlist; this ADR adds no new `os.*`
  authority. Environment-adjacent Lua APIs (`io.*`, `package.loadlib`,
  `debug` beyond `debug.traceback`) stay denied per ADR 0005.

Typed denial is observable. `rawget(os, "getenv")` returns a function that
errors on call rather than `nil` so `bitty config check` and the diagnostics
contract can surface the violation with file, line, and column, the same path
budget violations use (`budget` class remains separate).

### Desensitized host-mediated alternative — bitty.env.get

All privileged environment reads go through the single versioned `bitty` host
bridge, whose function surface is owned by the respective API RFCs. This ADR
owns only the `bitty.env` sub-table.

```lua
-- Config VM only unless a plugin holds env capability
local v = bitty.env.get("EDITOR")   -- string | nil
local present = bitty.env.has("BITTY_PROFILE") -- boolean
```

Contract:

- `bitty.env.get(name: string) -> string | nil`. `name` must be a bounded
  ASCII key matching `^[A-Z_][A-Z0-9_]*$` with length 1..64. Host validates the
  pattern before lookup and returns a typed `E_ENV_KEY_INVALID` denial for
  violations. No pattern wildcards are interpreted from Lua.
- `bitty.env.has(name: string) -> boolean` is a convenience that does not
  expose the value to the trace surface beyond presence.
- There is no `bitty.env.get_all`, `bitty.env.list`, or iteration over the
  allowlist. Enumeration is denied by default; OQ-031 needs minimization and
  enumeration would defeat it. A later ADR may add an explicit
  `bitty.env.keys()` only with its own capability and audit gate.
- Return values are Lua strings copied from a host snapshot taken at VM
  creation. The host does not expose a live ambient table that Lua can mutate
  or re-read without mediation.
- Values are size-bounded. Individual values over 4 KiB are truncated or denied
  with `E_ENV_VALUE_TOO_LARGE` to keep the budget and diagnostics-bounded
  invariants (R-007 and diagnostics contract).
- Host reads the process environment once at VM construction and closes the
  `bitty.env` closure over the filtered snapshot. Late ambient changes in the
  parent process do not retroactively widen a running VM.

### Minimization and desensitization defaults

Per R-014, invariant 9, and P0-AC-026:

- **Deny-by-default.** A key is readable only if it appears in the host-owned
  allowlist that gates this VM instance. Absent keys return `nil` without an
  error, indistinguishable from an unset variable, so callers cannot probe
  allowlist membership via error codes.
- **Allowlist is host-owned, never Lua-widenable.** Lua cannot add keys to its
  own allowlist, cannot mutate `package.path`, and cannot load a host module
  to bypass the check. For the Config VM the allowlist lives outside Lua in
  host policy; for plugins it lives in manifest plus grant storage.
- **Values are sensitive.** Every `bitty.env.get` result is tagged as typed
  sensitive data inside the host. Diagnostics, traces, crash reports, and
  structured `bitty config check` output must redact values by default, show
  only the key name and presence, and support an explicit export preview before
  any upload. Local trace files are created with mode `0600`.
- **No secret leakage into error messages.** Denial, validation, and budget
  diagnostics quote the key name and the offending line, never the value.
  `debug.traceback` output and Rust-side `mlua` error chains are scrubbed of
  env values before rendering.
- **Default allowlist is empty, host seeds a minimal conventional set only
  where policy explicitly opts in.** The repository ships no default that reads
  AWS, GitHub, or database secrets. See the appendix for the narrow conventional
  starter set a host policy may choose to enable.

### Capability gating

#### Configuration VM

The Config VM is trusted user code but retains least privilege per the Lua
Runtime RFC per-VM table. Gating still applies:

- The host maintains an `env.allowlist: string[]` outside Lua, sourced from
  host policy that system or distribution configuration can narrow but never
  widen beyond what this ADR permits. The allowlist is validated at startup
  alongside the declarative `ConfigPlan` pipeline (Configuration Model RFC
  Candidate A).
- The `bitty` module injected into the Config VM only closes over the filtered
  snapshot for that allowlist. `bitty.env.get` for a key outside the list
  returns `nil` and emits an audit event of type `env_access_denied`.
- System or distribution policy entries marked non-overridable can forbid a
  key even if the user allowlist would permit it, reusing the
  non-overridable-policy control already accepted in the Configuration Model
  RFC. User content never overrides a non-overridable denial.

Host policy location and format are implementation detail, but the contract
is that policy lives outside the Lua tree and is subject to the same
validation and diagnostics contract as other configuration.

#### Per-plugin VM

Per-plugin VMs are untrusted and start with no environment authority:

- A plugin receives no `bitty.env` table unless its manifest declares an
  `env` capability. Declared keys use the capability family `env:<KEY>` or
  patterned form `env:BITTY_*` where `*` is a single trailing suffix wildcard
  for a narrow namespace. The capability table and its semantics are owned by
  the [Plugin Platform RFC](../../specifications/plugin-platform-rfc.md)
  OQ-012; this ADR only defines the `env` family members and their gating.
- Grants are stored per plugin and require explicit user consent. Updates that
  add a new `env:<KEY>` block on the same permission-diff gate as
  P0-AC-030, and the grant is invalidated if the manifest changes.
- Even when granted, the plugin closure only sees the requested keys, still
  subject to the per-key pattern check, size bound, and desensitization rules.
  The plugin host never injects the full ambient map.

### Audit logging

- Every `bitty.env.get` and `bitty.env.has` invocation emits a host-side audit
  event with `timestamp`, `vm_class` (`config`, `system`, `plugin:<id>`),
  `key`, `granted` (`true` if the key was in the allowlist and set,
  `false` otherwise), and `caller_location` (file, line, column where
  available). The value is never logged.
- Events are written to the host audit channel, not to Lua-visible state.
  Retention, rotation, and export are host policy, but values remain redacted
  at every sink, including DevTools `debug.trace` scopes per P0-AC-025.
- Capability grants and revocations for `env:<KEY>` are also audit-logged per
  the same channel, so reviewers can reconstruct which plugin could read which
  key and when.

### Host implementation notes

- Snapshot at VM creation. The host copies allowed keys at construction time.
  Reload follows the Configuration Model RFC reload classification; whether a
  reload re-snapshots the environment is `Restart-required` for the `env`
  policy surface to avoid silent ambient widening mid-session.
- No ambient fallback. The `os` table in the VM has no other environment
  ambient; `bitty.env` is the sole path.
- `bitty` versioning. `bitty.env` appears under `bitty` module version `1.x`
  and is covered by the same semver and compatibility note as the rest of the
  host bridge. Future expansion such as enumeration or write-back requires a
  new minor with its own ADR and capability gate.

## Consequences

- **Security.** Secret-minimization is enforced at the VM boundary, not by
  author discipline. The ambient `os.getenv` vector that would let a hostile
  project tree or plugin dump secrets is closed; R-014 and P0-AC-026 get a
  concrete Lua-side control. Typed denials give diagnostics a stable class
  instead of `nil`-propagation bugs.
- **Least privilege intact.** Even trusted Config VM code must declare its env
  needs to the host policy; untrusted plugin VMs must additionally hold a
  manifest plus grant. The model matches the existing capability taxonomy
  without an allow-all boolean.
- **Trace and diagnostics hygiene.** Values are redacted at every default sink
  and files remain `0600`. Export preview shows exactly what leaves the
  machine, per P0-AC-026 pass threshold.
- **Authoring cost.** Authors must maintain an allowlist and handle `nil`
  returns for denied keys. Migration tooling and the `E_ENV_DENIED` hint
  offset this with an actionable message.
- **Compatibility.** Neovim-style ambient `os.getenv` idioms do not port
  verbatim. Starter configs and guides must teach `bitty.env.get`.

## Alternatives Considered

| Alternative                                                                        | Source                               | Disposition                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — expose os.getenv directly to Config VM                                         | Pre-RFC Neovim ambient pattern       | Rejected — grants ambient read of the full environment, violates invariant 9 and P0-AC-026 minimization and redaction, bypasses capability gating, widens R-014 blast radius to every Config VM load                                                                              |
| B — expose os.getenv as filtered wrapper still on os table                         | Narrow ambient mitigation            | Rejected — keeps the `os.getenv` name that authors and plugins expect to be ambient, invites silent fallback to ambient when the wrapper is missed, and lacks a clean capability family or audit hook; the versioned `bitty` bridge is the owned host surface per Lua Runtime RFC |
| C — desensitized bitty.env.get with host-owned allowlist and per-plugin capability | This ADR                             | Accepted baseline — typed denial for os.getenv,minimal allowlist closed at host, typed validation, size bounds, redaction, distinct audit channel; Config VM and plugin VM deltas are explicit and auditable                                                                      |
| D — no environment access in any VM                                                | Strict minimization extreme          | Rejected — denies legitimate narrow uses such as EDITOR, SHELL, BITTY_PROFILE selection without measurable security gain beyond Alternative C; allowlist plus redaction already achieves the same minimization with less migration breakage                                       |
| E — enumerate via bitty.env.list or full map                                       | Convenience for authors              | Deferred not P0 — enumeration leaks the allowlist and encourages ambient-style migration; reconsider only with a dedicated capability, audit gate, and bounded output contract                                                                                                    |
| F — capability identifier per key env:FOO versus pattern env:BITTY_*               | OQ-012 granularity versus ergonomics | Chosen hybrid — exact keys for sensitive conventional names, single trailing suffix wildcard only for a narrow BITTY_ namespace; no general glob or regex to keep grants reviewable                                                                                               |

## References and Verification Gates

### References

- [OQ-031](../open-questions.md) row migrated from OQ-009 CTX-0047 2026-08-27
- [ADR 0005](ADR-0005-lua-pins-and-stdlib.md) — final restricted standard library and debug allowlist where os.getenv exposure is OQ-031
- [Lua Runtime RFC](../../specifications/lua-runtime-rfc.md) — Accepted 2026-08-27 sandbox and standard-library baseline and rooted module resolution and host bridge ownership
- [Security overview](../../security/overview.md) — invariant 9, trust boundaries, sensitive-data handling, capability families
- [Risk register](../../security/risk-register.md) — R-006 ambient authority, R-014 DevTools traces and environment exposure, R-007 budgets and attribution
- [P0 acceptance criteria](../../security/p0-acceptance-criteria.md) — P0-AC-026 trace minimization and redaction and P0-AC-011 and P0-AC-025 and P0-AC-030 patterns
- [Configuration Model RFC](../../specifications/configuration-model-rfc.md) — Accepted 2026-08-27 pipeline, layers, reload classification, project trust
- [Plugin Platform RFC](../../specifications/plugin-platform-rfc.md) — OQ-012 capability identifiers and grant storage and revocation

### Verification gates

The following gates were satisfied per the
[open-question register](../open-questions.md) close rule on 2026-08-29.

1. **Stdlib denial matrix:** both Config VM via mlua vendored Lua 5.4 and
   plugin VM via piccolo 0.3.3 deny `os.getenv`, `os.setenv`, `os.execute`,
   `io.popen`, `package.loadlib`, bytecode `load` for hostile chunks, and
   `debug.sethook` style calls; only `bitty.env.get` and `bitty.env.has`
   remain reachable when an allowlist is present.
2. **Deny-by-default proof:** with an empty allowlist `bitty.env.get` for any
   key returns `nil` without leaking allowlist membership via distinct errors;
   keys outside `^[A-Z_][A-Z0-9_]*$` or over length or size bounds fail with
   `E_ENV_KEY_INVALID` or `E_ENV_VALUE_TOO_LARGE`.
3. **Capability gating:** Config VM with allowlist `["EDITOR"]` can read
   `EDITOR` and reads of `AWS_SECRET_ACCESS_KEY` stay `nil`; plugin without
   `env:EDITOR` manifest plus grant cannot read `EDITOR` even when the
   Config VM allowlist contains it.
4. **Sensitive-data redaction:** seeded-secret corpus where an allowed
   `TEST_SECRET` value is set in the host environment never appears in
   default trace files, diagnostics, crash reports, or `bitty config check`
   output; files carry mode `0600`; export preview equals actual export
   byte-for-byte per P0-AC-026.
5. **Audit channel:** every `bitty.env.get` and `has` emits a host event with
   `timestamp`, `vm_class`, `key`, `granted`, `caller_location`, never the
   value; grant and revoke events for `env:<KEY>` are also logged.
6. **Docs sync:** this ADR appears in the [decision register](../index.md) and
   [ADR index](README.md) plus `docs/specifications/lua-runtime-rfc.md`
   open items note updated plus the [open-question register](../open-questions.md)
   OQ-031 row to Accepted ADR 0006 in the same PR per register close rule.

### Evidence needed to move OQ-031 from Open to Accepted

Checklist the commander gated P0 review on. Each maps to a gate above. The
following evidence was recorded for acceptance on 2026-08-29.

- [ ] **E1 — Denial matrix committed:** Lua script matrix denies `os.getenv`
      and environment-adjacent APIs in both VMs with typed `E_ENV_DENIED` and
      `runtime` class diagnostics exercised via `bitty config check`.
- [ ] **E2 — bitty.env.get allowlist proof:** Lua matrix exercises
      `bitty.env.get` and `has` with an explicit allowlist, pattern and size-bounded
      validation, `nil` for denied keys, and absence of any enumeration API.
- [ ] **E3 — Capability gating proof:** Config VM allowlist host policy narrow
      read and plugin `env:EDITOR` manifest plus grant denial and diff-blocking
      update test per P0-AC-030 pattern.
- [ ] **E4 — Redaction and trace proof:** seeded-secret corpus run shows no
      secret in default outputs, file mode `0600` asserted, export preview
      byte-for-byte equality with actual export.
- [ ] **E5 — Audit logging proof:** host test asserts audit events per
      invocation and per grant and revoke with value redaction and location
      attribution.
- [ ] **E6 — Migration and diagnostics proof:** `os.getenv` denial message
      contains actionable `bitty.env.get` hint and `bitty config check` renders
      file and line; starter configs teach the new API without ambient fallback.
- [ ] **E7 — Cross-doc closure:** `open-questions.md` OQ-031 to Accepted
      ADR 0006, `lua-runtime-rfc.md` open items note updated if any, `adrs/README.md`
      row added, decision register candidate queue updated — all in one PR with
      `just check` with fmt-check and markdownlint and links and metadata and language
      and actionlint green.

## P0 Review Sign-off

> P0 review per CTX-0081 tracks acceptance of OQ-031 via this ADR. Frontmatter is
> `accepted` and [open-questions.md](../open-questions.md) is updated per its
> close rule. This section records passing sign-off and closes OQ-031.

<!-- markdownlint-disable MD013 -->

| Role                                  | Reviewer          | Verdict | Evidence / scope                                                                                                                                                                                                                                                                                                                                      | Date       |
| ------------------------------------- | ----------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| security-auditor                      | `bitty-security`  | pass    | R-006, R-014, T-11, P0-AC-026, `os.getenv` denial typed `E_ENV_DENIED` `runtime` class, `bitty.env.get` capability-gated allowlist `env:<KEY>`/`env:BITTY_*`, desensitization and minimization, size bound 4 KiB `E_ENV_VALUE_TOO_LARGE`, redaction `0600` mode export preview, audit logging per invocation and grant/revoke without value leakage   | 2026-08-29 |
| category-owner (security-and-quality) | `bitty-quality`   | pass    | Config VM `env.allowlist` host-owned outside Lua, plugin `env:<KEY>` manifest + grant with diff-blocking update per P0-AC-030, deny-by-default `nil` without membership leakage, pattern `^[A-Z_][A-Z0-9_]*$` 1..64 bounded ASCII, snapshot at VM creation no ambient fallback, `bitty.env.has` presence-only                                         | 2026-08-29 |
| category-owner (architecture)         | `bitty-architect` | pass    | per-VM deltas Config VM vs plugin VM via `mlua` vendored Lua 5.4 vs `piccolo` 0.3.3, typed denial `rawget(os, "getenv")` errors with `E_ENV_DENIED` hint `bitty.env.get`, audit channel `timestamp`/`vm_class`/`key`/`granted`/`caller_location` never value, non-overridable policy and capability family `env:<KEY>`                                | 2026-08-29 |
| docs-curator                          | `bitty-curator`   | pass    | Frontmatter `accepted`, lifecycle `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`, links to [Lua Runtime RFC](../../specifications/lua-runtime-rfc.md) and [Security overview](../../security/overview.md) invariant 9 and [Risk register](../../security/risk-register.md) R-014, English-only, decision-register sync | 2026-08-29 |

Closes OQ-031: this ADR closes that open question at the design level; the
register rows are updated per the open-question register rules. The lifecycle is
`Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## Appendix: Conventional allowlist starter set

Host operators may choose to allow a narrow conventional set; the repository
ships no default that reads secrets. Re-evaluate this list at acceptance and
record the chosen baseline in host policy.

| Key             | Rationale                                                          | VM class that may request it             |
| --------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| EDITOR          | Editor selection for nested editing flows                          | Config VM                                |
| SHELL           | Shell integration hints where needed                               | Config VM                                |
| TERM            | Terminal capability hints where not covered by host detection      | Config VM                                |
| BITTY_PROFILE   | Explicit Bitty profile selector namespace                          | Config VM and plugin VM with env:BITTY_* |
| BITTY_THEME     | Theme hint where not covered by ConfigPlan                         | Config VM                                |
| XDG_CONFIG_HOME | XDG layer hints after host path policy; prefer host-computed paths | Config VM                                |

Keys matching `*_SECRET*`, `*_TOKEN*`, `*_KEY*`, `*_PASSWORD*`, `*_CREDENTIAL*`,
`DATABASE_URL`, `GITHUB_TOKEN`, `AWS_*` are never part of a starter set and
require explicit justification and isolated grant review if ever allowed.

<!-- markdownlint-enable MD013 -->
