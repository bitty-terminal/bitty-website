---
title: Risk Evidence RFC
description: Defines the risk-to-P0-AC traceability, evidence taxonomy, artifact storage, and review gates for closing each security risk without weakening P0 controls for OQ-025
category: specifications
audience: security-reviewer
document_type: specification
status: accepted
website_publish: true
sidebar_order: 21
---

# Risk Evidence RFC

> Status: **accepted** on 2026-08-29 by the project initiator. This document defines the accepted risk-to-P0-AC traceability, evidence taxonomy, artifact storage, and review gates for closing each security risk without weakening P0 controls for
> [OQ-025](../decisions/open-questions.md) at the design level; it closes [OQ-025](../decisions/open-questions.md). It does not describe implemented
> behavior, does not authorize shipped, stable, normative, or
> compatibility-guaranteed behavior, and does not weaken any normative control. Experimental
> implementation, test logs, fuzz corpora, or CI artifacts may exist as review
> evidence but carry no compatibility promise beyond the accepted contract. Acceptance was per independent category-owner, docs-curator, and
> security-auditor review (CTX-0078) with P0 sign-off on 2026-08-29; see [P0 Review Sign-off](#p0-review-sign-off) and the
> [P0 review checklist](../reviews/p0-review-checklist.md). The lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## Purpose and scope

[OQ-025](../decisions/open-questions.md) asks: _what implementation and test
evidence closes each security risk without weakening the normative controls?_
The register states all 22 risks are Open because Bitty has no implementation
evidence yet, and that a risk may move to `Mitigated` only when its linked
control has focused tests and an independent review record, and to `Accepted`
only with an explicit, time-bounded CarryCtx decision with owner and rationale.
This RFC closes that gap by defining the closure model at the design level.

In scope:

- the risk-closure lifecycle (`Open` -> `Mitigated` -> `Accepted`) and its entry
  and exit conditions for each of R-001 through R-022;
- the traceability from each risk to its normative control(s) and to one or
  more testable criteria in
  [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md);
- the evidence taxonomy (verification methods, pass thresholds, artifact kinds,
  retention, and CarryCtx linkage) that satisfies
  [Threat Model](../security/threat-model.md) verification gates;
- review gates, roles, and sign-off for moving a risk between states;
- the relationship to stage (P0 versus P1) and to residual-risk handling.

Out of scope (owned elsewhere):

- selecting or tuning any ceiling, capability identifier, or trust boundary
  itself (owned by [Security Overview](../security/overview.md),
  [Threat Model](../security/threat-model.md), and the per-domain RFCs/ADRs
  for OQ-014, OQ-011/OQ-012/OQ-013, OQ-008/OQ-015/OQ-016, OQ-017, OQ-018,
  OQ-019, OQ-030, OQ-031, OQ-032, which set the mechanisms and numbers; this RFC
  only selects the evidence that proves them);
- the concrete test or harness implementation in `bitty` crates (owned by the
  implementing repository; this RFC defines what must be observed, not how the
  harness is spelled);
- registry, website, and cross-repository release policy (OQ-023, OQ-024).

This RFC introduces no new trust boundary, no bypass API, and no relaxation
of any P0 gate. Per
[documentation workflow](../development/documentation-workflow.md) change-trigger
rules, any future change to a trust boundary itself updates the security corpus
first; this RFC then updates its traceability.

## Normative sources this specification must not weaken

- [Security Overview](../security/overview.md): invariants 1 through 10
  (especially the five release-blocking invariants), capability families, trust
  boundary table, P0 baseline, secret-minimization posture, and the rule that
  deferral to P1 or P2 must not create a P0 bypass.
- [Threat Model](../security/threat-model.md): assets, actors, boundary map,
  principal data flows, abuse cases T-01 through T-14, and verification-gate
  requirements.
- [Security Risk Register](../security/risk-register.md): severity, likelihood,
  stage, required-mitigation column, and state rules for R-001 through R-022.
- [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md):
  testable given/when/then criteria P0-AC-001 through P0-AC-034, their source
  controls, linked risks, verification methods (`unit`, `integration`,
  `adversarial`, `manual-audit`), and pass thresholds.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) and
  [Plugin Platform RFC](plugin-platform-rfc.md),
  [Isolation Resource RFC](isolation-resource-rfc.md), and other accepted or
  proposed RFCs/ADRs that select mechanisms and ceilings: this RFC consumes their
  numbers and mechanisms but does not retune them.

Where this RFC picks concrete evidence wording or artifact paths, it refines the
candidate evidence already cited in those sources; it does not move a
requirement between owners or relax a gate. If a clause here weakens a
normative control, the normative text wins and this RFC must be corrected.

## Terminology

| Term                | Accepted meaning                                                                                                                                                                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Risk state          | One of `Open`, `Mitigated`, `Accepted` per register rules. `Mitigated` means the linked P0-AC criteria for the risk have passing evidence plus independent review; `Accepted` means an explicit, time-bounded CarryCtx decision with owner, rationale, and residual risk has been accepted for risks that cannot be fully mitigated at P0. |
| P0-AC criterion     | A testable given/when/then statement from [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md) with a stable ID, source control, linked risk(s), verification method, and pass threshold.                                                                                                                              |
| Evidence artifact   | A produced, storable observation that a criterion's pass threshold held: headless test log, fuzz run summary with corpus hash, `cargo check` / `cargo audit` / `cargo vet` / CodeQL SARIF, CI run log, or manual-audit report.                                                                                                             |
| Residual risk       | The remaining sub-case of a risk whose exit evidence is only partially satisfied; tracked as the same risk ID staying Open with a residual note, per register guidance.                                                                                                                                                                    |
| Verification method | `unit`, `integration`, `adversarial` (fuzz, negative, malformed, oversized, timeout), `manual-audit` (independent reviewer evidence), and `ci-gate` (advisory/license/source/banned, lint, mode checks) as used in P0-AC conventions.                                                                                                      |
| Pass threshold      | The minimum observable outcome that closes a criterion; anything less leaves linked risks Open, per P0-AC conventions.                                                                                                                                                                                                                     |

## Accepted summary

1. Risk closure is evidence-driven and per-criterion: a risk moves toward
   `Mitigated` only when every P0-AC criterion that cites it records passing
   evidence per its verification method **and** a security-auditor review
   confirms that evidence; partial evidence leaves the risk Open with a residual
   note rather than closing it silently.
2. Every risk-to-criterion link is explicit in a single traceability matrix
   (this RFC) that cites the authoritative source area in the security corpus;
   the matrix never creates a new identifier and never reuses or renumbers a
   P0-AC ID.
3. Evidence is stored as bounded, reproducible, content-addressable artifacts
   whose hash or run URL is cited from the risk row; carry-over from design
   intent, partial tests, or documentation alone never satisfies a criterion,
   per the accepted P0-AC contract.
4. `Mitigated` and `Accepted` are distinct and gated: `Mitigated` records test
   plus review evidence; `Accepted` additionally records an explicit,
   time-bounded CarryCtx decision with owner, rationale, expiry, and residual
   risk (used only where the register explicitly contemplates acceptance with a
   residual).
5. No RFC, checker, or environment flag may bypass a P0-AC threshold; the same
   thresholds gate local `just check` and CI. This RFC provides the checklist
   that closes [OQ-025](../decisions/open-questions.md) at the design level.

## Accepted risk-closure lifecycle

Status: **accepted contract** on 2026-08-29. Numbered for reference; defines the accepted risk-closure model.
this RFC alone.

- **RS-1 States and who moves them.** The register's three states apply
  unchanged: `Open` (initial, no sufficient evidence), `Mitigated` (linked
  P0-AC criteria pass with independent review), `Accepted` (explicit
  time-bounded decision per register). The security-auditor is the only role
  that may record the review that moves a risk out of `Open`; the project
  initiator or a commander acting with security-auditor concurrence records
  `Accepted`.
- **RS-2 Entry to `Mitigated`.** For a risk ID, every P0-AC criterion whose
  `Linked risks` column cites that ID must simultaneously satisfy the
  [Entry to Mitigated checklist](#entry-to-mitigated-checklist). Linking is
  by ID, not by prose match. A risk that cites no P0-AC criterion is a
  conformance bug in this RFC.
- **RS-3 No partial closure.** If any linked criterion fails, times out, hangs,
  panics, or lacks a reproducible artifact, the risk stays `Open`. The row
  gains a residual note naming the failing dimension; the register keeps the
  likelihood and severity unchanged until fuzzing, incident, or advisory data
  justifies reassessment per the register review cadence.
- **RS-4 Entry to `Accepted`.** `Accepted` requires `Mitigated` plus a
  `CarryCtx decision` record with `owner`, `rationale`, `time-bounded window`,
  and `residual risk` that is itself tracked as an Open follow-up. Acceptance
  never weakens a normative P0 control; a control change requires the owning
  security document to change first.
- **RS-5 Reopening.** Any of the following reopens a `Mitigated` or `Accepted`
  risk to `Open` without a new decision: regression in a linked P0-AC suite,
  new fuzz finding or dependency advisory affecting the linked area, or a
  mechanism change in an owning RFC/ADR that invalidates the cited evidence
  hash or run.
- **RS-6 Stage is a deadline, not a deferral.** The register `Stage` column
  (P0 versus P1) is the latest stage by which mitigation must exist; it does
  not authorize ignoring the risk until that stage. This RFC maps both P0 and
  P1 risks so that P1 closure plans are visible at draft time.
- **RS-7 Safe-mode invariance.** Every path above preserves `bitty --safe`
  startup with minimal built-in configuration and zero third-party plugins;
  recovered evidence re-proves it after any security-sensitive change per
  P0-AC-019 and [Isolation Resource RFC](isolation-resource-rfc.md) FS-8.

## Traceability: risk to P0-AC

This table is the single authoritative traceability for [OQ-025](../decisions/open-questions.md).
It restates the coverage in
[P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md#coverage-traceability)
with the additional register columns required for closure gating. A risk with no
row here is a defect in this RFC; a P0-AC ID that appears in no row is unused
evidence and must be linked or removed via an RFC revision, never silently
ignored.

| Risk  | Summary (register title)                         | Stage | Normative control area                   | Linked P0-AC criteria           | Canonical mechanism document                                                                                       |
| ----- | ------------------------------------------------ | ----- | ---------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| R-001 | Malformed VT sequences crash/hang                | P0    | VT parsing, bounded incremental parser   | P0-AC-001, P0-AC-002            | [Terminal State RFC](terminal-state-rfc.md), parser limits                                                         |
| R-002 | Compressed graphics exhaustion                   | P0    | Graphics, decoded-size and pixel limits  | P0-AC-003, P0-AC-004            | [Rich Presentation RFC](rich-presentation-rfc.md) IMG-1..IMG-7                                                     |
| R-003 | Graphics/rich reads/deletes arbitrary files      | P0    | Local files, deny-by-default loader      | P0-AC-005, P0-AC-006            | [Rich Presentation RFC](rich-presentation-rfc.md), [Isolation Resource RFC](isolation-resource-rfc.md) deny loader |
| R-004 | OSC 52 clipboard leak or paste injection         | P0    | Clipboard and paste                      | P0-AC-007, P0-AC-008            | [Threat Model](../security/threat-model.md) T-04                                                                   |
| R-005 | OSC 8 / rich links invoke dangerous schemes      | P0    | Hyperlinks                               | P0-AC-009                       | [Rich Presentation RFC](rich-presentation-rfc.md) transport policy                                                 |
| R-006 | Plugin gains ambient authority                   | P0    | Plugins, restricted stdlib, capabilities | P0-AC-011, P0-AC-012, P0-AC-013 | [Plugin Platform RFC](plugin-platform-rfc.md), [Lua Runtime RFC](lua-runtime-rfc.md)                               |
| R-007 | Plugin crash/loop/storm blocks terminal          | P0    | Plugins, budgets, hot-path exclusion     | P0-AC-013, P0-AC-014, P0-AC-015 | [Isolation Resource RFC](isolation-resource-rfc.md) RC-1..RC-5                                                     |
| R-008 | Plugin mutates Terminal Truth                    | P0    | Core-owned state, presentation-only API  | P0-AC-016, P0-AC-017            | [Core Boundaries](../architecture/core-boundaries.md), [Plugin Platform RFC](plugin-platform-rfc.md)               |
| R-009 | Cannot recover from broken plugin/config         | P0    | Recovery, safe mode                      | P0-AC-019, P0-AC-020            | [Default Distribution RFC](default-distribution-rfc.md), [Configuration Model RFC](configuration-model-rfc.md)     |
| R-010 | Project config executes in untrusted clone       | P1    | Configuration and workspace trust        | P0-AC-031                       | [Configuration Model RFC](configuration-model-rfc.md)                                                              |
| R-011 | IPC client reads/inject/kills/changes config     | P0    | IPC, local-user auth, scopes             | P0-AC-021, P0-AC-022            | [IPC and Agent RFC](ipc-agent-rfc.md)                                                                              |
| R-012 | Child credential leaks via env/SSH               | P0    | Child scope limitation                   | P0-AC-023                       | [IPC and Agent RFC](ipc-agent-rfc.md), [Isolation Resource RFC](isolation-resource-rfc.md) IR-D1                   |
| R-013 | Agent confused deputy via terminal output        | P0    | MCP/Agent read-only, untrusted labeling  | P0-AC-024                       | [IPC and Agent RFC](ipc-agent-rfc.md), [DevTools RFC](devtools-rfc.md)                                             |
| R-014 | DevTools/traces expose secrets                   | P1    | Traces, DevTools scopes, redaction       | P0-AC-025, P0-AC-026            | [DevTools RFC](devtools-rfc.md)                                                                                    |
| R-015 | Malicious update enters runtime                  | P0    | Supply chain integrity                   | P0-AC-027, P0-AC-028, P0-AC-029 | [Package Lifecycle RFC](package-lifecycle-rfc.md)                                                                  |
| R-016 | Update silently adds capabilities                | P1    | Capability diff blocks update            | P0-AC-030                       | [Plugin Platform RFC](plugin-platform-rfc.md), [Package Lifecycle RFC](package-lifecycle-rfc.md)                   |
| R-017 | Native plugin bypasses Lua controls              | P0    | Native-plugin rejection                  | P0-AC-018                       | [Plugin Platform RFC](plugin-platform-rfc.md)                                                                      |
| R-018 | Unsafe/FFI bug compromises Bitty                 | P0    | Unsafe discipline                        | P0-AC-033                       | ADR-0005 ([ADR 0005](../decisions/adrs/ADR-0005-lua-pins-and-stdlib.md))                                           |
| R-019 | Vulnerable or disallowed Rust dependency         | P0    | Dependency hygiene                       | P0-AC-034                       | ADR-0004 ([ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md))                                         |
| R-020 | Remote-origin detection wrong, policy permissive | P0    | Origin policy                            | P0-AC-032                       | [Threat Model](../security/threat-model.md) `Unknown` restrictive                                                  |
| R-021 | Rich rendering introduces script/local-resource  | P0    | Markdown constrained AST, no scripts     | P0-AC-010                       | [Rich Presentation RFC](rich-presentation-rfc.md)                                                                  |
| R-022 | Package install executes setup code              | P0    | Supply chain, no install scripts         | P0-AC-027                       | [Package Lifecycle RFC](package-lifecycle-rfc.md)                                                                  |

Notes:

- R-002 maps to both decompression and aggregate-store criteria; keeping them
  distinct prevents a single pass from silently covering the other.
- R-003 uses both the resource-loader criterion and the no-deletion criterion;
  exhaustiveness of the delete-surface (`grep` for protocol-reachable delete
  primitives) is part of P0-AC-006 and is cited here.
- R-014 is P1-stage but its minimization and redaction criteria are P0-normative
  per the P0-AC note; DevTools-scope breadth remains P1-stage and is tracked as
  residual if only minimization is proven. The same split applies to R-010 and
  R-016 where the P0-normative subset blocks release.
- R-006 and R-007 share P0-AC-013; isolation is the co-gate for both ambient
  authority and availability. R-006 is not Mitigated by capability tests alone
  without the isolation containment proof.

## Evidence taxonomy

### Verification methods and what they produce

Methods reuse the exact vocabulary from
[P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md#conventions)
so that the workflow and CI do not introduce an alternate taxonomy. Each method
produces one or more artifact kinds; every artifact that moves a criterion
toward satisfied must be referenced with a retrievable hash or run URL.

| Method         | What it proves                                                                                                        | Canonical artifact kinds                                                                                                           | Retention                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `unit`         | Boundary, allowlist, or deny-list holds for one component in isolation                                                | `cargo test -p <crate> --lib` log, headless test stdout with `--nocapture`, fixture corpus hash                                    | Keep per CI run; re-run on every change to the owning crate                                                   |
| `integration`  | Cross-component property such as end-to-end queue-budget enforcement or safe-mode startup with hostile fixtures       | Headless integration-test log (`cargo test --test measurement`), `just check` log, startup-success log with hostile-fixture set    | Keep per PR; retain the log that the register row cites                                                       |
| `adversarial`  | Malformed, oversized, fuzz, timeout, scope-escalation, and tamper cases fail closed with no partial state             | Fuzz-run summary (engine, duration, corpus hash, crash count), adversarial-suite log with input-byte count, timeout-deadline trace | Corpus retained in repo under `fuzz/corpora/` or per-crate `corpus/`; run summary retained per Cargo fuzz job |
| `manual-audit` | Human judgment where a control cannot be proven by a test alone (labelling, API-surface, redaction, scope separation) | Reviewer-signed markdown report under `docs/security/audits/` or CarryCtx progress note with command output and log excerpts       | Keep as versioned doc; updated only via a reviewed PR                                                         |
| `ci-gate`      | Hygiene that must hold on every run (advisory, source, license, bans, lint, modes)                                    | `cargo audit` / `cargo vet` / `cargo deny` logs, `actionlint` output, `gitleaks` report, `stat` / permission assertion log         | Keep per CI run; gating is fail-closed (blocks merge)                                                         |

Conventions:

- IDs are stable; never reuse or renumber a P0-AC ID to close a different risk.
- Each criterion cites its source control(s) and linked risk(s) in its heading;
  those citations are the traceability edge, not a duplicate table edit.
- Pass thresholds are literal: "zero panics across the boundary matrix" means
  every named limit has a test that asserts it; anything less leaves the linked
  risk Open.
- A criterion that needs human judgment still requires a recorded, reproducible
  artifact (command output, log, SARIF, corpus hash) in CarryCtx; a reviewer
  note alone without an artifact never satisfies a criterion.

### Artifact storage and CarryCtx linkage

Artifacts are stored where they are auditable without spreading the source of
truth:

- Local headless and integration logs stay in the workspace under
  `tmp/evidence/<risk>/<criterion>/` when durable scratch is needed; CI logs
  remain the authoritative copy and are cited by run URL.
- Fuzz corpora are committed under the owning crate's fuzz target directory
  or under `fuzz/corpora/`; the register row cites the corpora by path plus
  the commit that introduced them.
- CI-gate evidence (advisory, vet, deny, CodeQL SARIF) is uploaded as a
  workflow artifact and cited by workflow run URL.
- Manual-audit reports are committed under `docs/security/audits/` and
  referenced from the risk row via a relative link and the register close
  rule revision.
- CarryCtx is the durable cross-session record: the progress note that claims a
  criterion satisfied must include the exact command that produced the artifact,
  the artifact path or URL, and the hash or run number; a checkpoint preserves
  the state for review handoff.

A risk row may cite multiple artifacts; the citation must make clear which
artifact satisfies which criterion, not merely that "tests exist."

### Entry to Mitigated checklist

A risk may move to `Mitigated` only when all of the following hold for the
risk's linked P0-AC set identified in the traceability table above. The list
uses P0-AC-001..P0-AC-034 identifiers; it does not restate the criteria prose.

1. **Unit and integration.** For each linked P0-AC that requires `unit` or
   `integration`: the headless harness passes on the declared harness command
   (`cargo test -p <crate> --test measurement`, `cargo test --workspace`
   headless subset, or the documented `just check` sub-gate), with zero
   panics, zero hangs, and attributed enforcement.
2. **Adversarial.** For each linked P0-AC with an `adversarial` clause: the
   corpus-driven suite passes — boundary matrix fully covered, fuzz campaign
   has the required duration or input count with zero crashes/hangs/memory-
   safety findings, and the corpus is retained in-repo. Adversarial corpora
   cover at least the dimensions named in the linked abuse case (for example
   VT/UTF-8/OSC/DCS/APC for R-001, decompression-bomb for R-002, URI-fuzz for
   R-005, capability-denial matrix for R-006).
3. **Negative and limit coverage.** Where a criterion requires negative tests
   (deny-by-default loader, scheme allowlist, scope matrix, device/socket/
   procfs/sysfs/devfs, symlink escapes, non-regular files): every negative
   class has an explicit test that asserts denial and asserts that no partial
   state was created (FS-1 parity where applicable).
4. **Budget and attribution checks.** Where a criterion covers a budget
   dimension (for example RC-1, RC-2, RC-5 global per
   [Isolation Resource RFC](isolation-resource-rfc.md)): enforcement fires at
   the declared ceiling, attribution identifies the correct owner
   (`PluginId`+generation, terminal id, or authenticated client id), and the
   dedicated reclaim or attribution invariant holds after enforcement.
5. **CI gates green.** `just check` (fmt-check, markdownlint, links, metadata,
   language, agents, hygiene, actionlint) is green locally, and
   `cargo vet` / `cargo audit` / `cargo deny` plus CodeQL Rust and actions
   queries are green in CI where the owning crate exists. A lint or audit
   gate may not be skipped to close a risk.
6. **Secret and scope handling where cited.** Where the linked criterion
   requires typed redaction, `0600` file mode, export-preview equivalence, or
   scope separation (P0-AC-024, P0-AC-025, P0-AC-026, P0-AC-031, P0-AC-032):
   seeded-secret tests and mode/preview assertions pass with byte-accurate
   comparisons.
7. **Manual-audit record.** Every risk that touches `manual-audit` (at least
   P0-AC-010, P0-AC-021 through P0-AC-026, P0-AC-033, P0-AC-034) has a reviewer-
   signed artifact that confirms the control prose was checked against the
   implementation surface; the register row cites that report and the CarryCtx
   decision that accepted it.
8. **Safe-mode re-verified.** Any risk whose linked P0-AC set intersects safe
   mode (R-009 directly, indirectly R-007, R-015, R-022): the hostile-fixture
   safe-mode startup proof has been re-run on the same revision that closes
   the risk.

If any item fails, the risk stays `Open` with a residual note that names the
failing P0-AC and dimension. A follow-up task is created for the residual
rather than silently accepting around it.

## Accepted risk-register delta

Status: **accepted change to the register on acceptance of this RFC on 2026-08-29.** The
register delta described here applies
atomically with the status flip that closes
[OQ-025](../decisions/open-questions.md) on acceptance. The delta is now the accepted contract; the register header status reflects the traceability and gates acceptance.

| Register change                              | Accepted disposition                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Required mitigation / exit evidence` column | Each row keeps its one-line mitigation text as the short contract and gains a trailing citation of the closing P0-AC IDs from the traceability table above plus a link to the evidence-artifact location (for example `P0-AC-011/012/013 via bitty-plugin-host deny suite, bitty-lua measurement_lua.rs, audit bitty-lua-2026-xx`). The citation is added only when the artifact exists; adding it early is a documentation bug. |
| `State` column                               | Stays `Open` in this accepted contract. On acceptance on 2026-08-29 the column does not auto-flip; it flips per risk only when the Entry to Mitigated checklist for that risk has been satisfied and the reviewer evidence recorded per [Review gates](#review-gates-and-roles).                                                                                                                                                 |
| New `Evidence` annotation                    | Each row, after its mitigation cell, carries a parenthetical `Evidence: <P0-AC ids> / <artifact path or run URL> / <reviewer>` or `Evidence: — (residual: <failing dimension>)` while Open. The annotation is prose inside the cell, not a new column, to avoid churn of the normative table shape.                                                                                                                              |
| `Status:` header                             | The banner line "Status: initial pre-implementation register." is replaced on acceptance of this RFC by "Status: traceability and evidence gates accepted via [Risk Evidence RFC](../specifications/risk-evidence-rfc.md) on DATE; each row remains Open until its evidence plus audit is recorded." No risk moves without the per-risk checklist above.                                                                         |

Existing rows for R-001 through R-022 are otherwise unchanged; no risk is added
or removed by this RFC. A new risk requires its own ADR or RFC that updates the
register first.

## Review gates and roles

Per [documentation workflow](../development/documentation-workflow.md) and
[security overview](../security/overview.md), every candidate that touches a
trust boundary, capability, resource limit, package, IPC/MCP surface, or
sensitive-data path requires three independent reviews. This RFC is no
exception, and the risk-closure path adds explicit verification owners:

- **security-auditor** — owns register and P0-AC alignment; must confirm that
  this RFC does not weaken any normative P0 control, that the traceability
  matrix is complete, and that each risk's linked P0-AC set covers the
  relevant abuse case (T-01..T-14). The only role that may record the review
  that moves a risk out of `Open` for the security-reviewer audience.
- **category-owner** — owns correctness of the mechanism for the owning domain;
  the mapping is: risk R-001..R-005 and R-021 to `architecture` plus
  `security-and-quality`; R-006..R-009 and R-017 to `extensibility` plus
  `security-and-quality`; R-010 to `configuration`; R-011..R-014 to
  `security-and-quality` plus `architecture` (IPC/MCP/Agent/DevTools);
  R-015/R-016/R-022 to `extensibility` plus `security-and-quality` (supply
  chain); R-018/R-019 to `security-and-quality` plus `architecture`; R-020 to
  `architecture`.
- **docs-curator** — owns taxonomy, frontmatter, links, English-only gates,
  and the atomic synchronization of the register, P0-AC document, decision
  register, and this RFC on acceptance.

Acceptance of the implemented contract later additionally requires:

1. `just check` green (0 issues) — fmt-check (Prettier 3.9.6),
   markdownlint-cli2 (0.23.1), links, metadata, language, agents, hygiene,
   actionlint (1.7.12).
2. Security-auditor confirmation that no normative control in the overview,
   threat model, or P0-AC was weakened; any discovered weakening returns the
   offending clause to revision rather than downgrading the gate.
3. Threat-model completeness and per-risk adversarial or negative evidence
   for any new trust-boundary, capability, or rate-limit (the owning RFC/ADR
   supplies that evidence; this RFC cites it).
4. Verification plan cites concrete evidence (headless tests, measurement
   harnesses, fuzz corpora, or `cargo check` gates) and the register links
   that evidence; no link is by prose alone.
5. Atomic update of [decision register](../decisions/index.md), the
   [specifications index](../specifications/README.md) or
   [ADR index](../decisions/adrs/README.md), and
   [open-question register](../decisions/open-questions.md) with the status
   flip, per the close rule; CarryCtx decision and checkpoint recorded.

Crate presence (`bitty-plugin-host`, `bitty-lua`, `bitty-rich`, `bitty-ipc`,
`bitty-agent`, `bitty-package`) does not constitute evidence until its harness
is cited and green.

## Verification plan (accepted staging of OQ-025 closure)

Closure of [OQ-025](../decisions/open-questions.md) at the design level
requires the lifecycle above to be exercisable on at least one risk without
claiming that any risk is already Mitigated by design acceptance. The plan stages the
later implementation evidence with OQ-025 closed at the design level:

- **Stage 1 — design-accepted traceability.** This RFC accepted; the
  traceability matrix above, the evidence taxonomy, and the Entry to Mitigated
  checklist are the accepted contract. No risk row flips yet. The open-question
  row moves from pointer to closure per the register close rule.
- **Stage 2 — first-risk demonstration.** At least one P0 risk demonstrates the
  full chain in a companion `bitty` PR that is cited but not required for
  design acceptance (candidate: R-001 via a VT fuzz harness plus P0-AC-001/002
  boundary logs, or R-007 via RC-1/RC-2 hard-gated `bitty-lua` and queue-budget
  harnesses plus P0-AC-013/014/015 attribution logs). The demonstration stores
  the artifact, records the CarryCtx decision, and shows the register row
  moving to `Mitigated` with the cited artifact; it does not prove that all
  risks are mitigated.
- **Stage 3 — residual-risk audit.** The register's residual-risk and
  likelihood-reassessment cadence are exercised: at least one risk is
  intentionally left `Open` with a residual note (for example a P1-stage
  DevTools breadth item), a follow-up task is created for the residual, and
  the weekly patrol compresses the closed section without losing the link
  between risk, criterion, artifact, and decision.

Until each criterion has recorded passing evidence per its verification method,
all linked risks remain `Open` — the P0-AC document's own acceptance sentence
is not overridden by this RFC.

## Alternatives considered

| Alternative                                                       | Why rejected or deferred                                                                                                                                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weaken a P0 control to make a risk "closable" without evidence    | Violates the normative precedence rule that implementation deficits do not downgrade the security contract; a control that cannot be proven stays Open and blocks release.             |
| Auto-flip risks to Mitigated when a harness exists in `bitty`     | Breaks the independent-review requirement; crate presence does not self-accept (cf. [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) and the review checklist).       |
| New evidence taxonomy distinct from P0-AC methods                 | Would diverge from the accepted test contract and require a second mapping table; reusing `unit`/`integration`/`adversarial`/`manual-audit`/`ci-gate` keeps a single gated vocabulary. |
| Per-risk new columns or a separate evidence register              | Splits the source of truth; the register plus this RFC's traceability plus CarryCtx decisions keep one authoritative closure point with stable IDs.                                    |
| Time-bounded auto-acceptance for P1 risks                         | Contradicts the register rule that `Accepted` requires an explicit decision with owner and rationale; P1 stage is a deadline, not an automatic acceptance.                             |
| Store evidence only as CarryCtx state without committed artifacts | Loses reproducibility across checkouts; committed corpus hashes or CI run URLs plus a CarryCtx note that cites them give both durability and auditability.                             |

## Affected contracts

Acceptance of this RFC on 2026-08-29 applies these same-change updates (no separate task
needed; a follow-up PR must keep them synchronized):

- [Open-question register](../decisions/open-questions.md): the OQ-025 row
  moves from `Draft: [Risk Evidence RFC](../specifications/risk-evidence-rfc.md)
(2026-08-28)` to `Accepted: [Risk Evidence RFC](../specifications/risk-evidence-rfc.md)`
  and the [decision register](../decisions/index.md) records the accepted risk-
  closure contract; the register close rule is satisfied atomically with the
  frontmatter flip of this RFC.
- [Security Risk Register](../security/risk-register.md): header status gains
  the traceability-and-gates acceptance note and each row gains its `Evidence:`
  annotation per the delta above; no row flips to `Mitigated` or `Accepted`
  without the per-risk checklist and the cited artifact.
- [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md):
  gains a forward link to this RFC as the evidence-storage and review-gate
  companion for P0-AC-001..P0-AC-034; the normative criteria prose, IDs, and
  thresholds are otherwise unchanged by this RFC.
- [Decision register](../decisions/index.md): a candidate-queue entry for the
  risk-evidence contract becomes `Accepted` and the normative-contracts table
  links the register and P0-AC to this RFC as their evidence companion.
- [Specifications index](../specifications/README.md) and this file: this file
  flipped from `draft` to `accepted` on 2026-08-29 with acceptance date and initiator; the
  index reflects that flip without claiming implementation.
- A manual-audit report committed under `docs/security/audits/` is referenced
  from the risk row when `manual-audit` evidence is required; the report
  itself is the artifact, not a claim in this RFC.

No new repository, crate, or workflow is added by this RFC; pins for any
future evidence harness belong to the implementing `bitty` task and are
verified by `cargo tree --locked` alongside the existing workspace pins.

## Open points

Deliberately unresolved at draft time; none blocks the contract above from
review, and none weakens a normative gate. Disposition belongs to acceptance
or to a follow-up scoped task:

1. Exact directory layout for non-CI artifacts under `tmp/evidence/` versus
   `docs/security/audits/` for corpus- and SARIF-adjacent files that should be
   committed versus ephemeral.
2. Whether the fuzz duration for VT/URI/manifest corpora is expressed as a
   wall-clock budget or an input-count budget for CI reproducibility, and the
   dedicated `fuzz` CI job timeout that enforces it.
3. Whether residual-risk follow-up tasks are one per residual dimension or one
   per risk ID, and how the weekly patrol compresses them without losing the
   risk-to-task edge.
4. Whether the weekly `cargo vet` / `cargo audit` gating for dependency-risk
   closure (R-019) records its evidence as a workflow artifact hash or as a
   committed `cargo vet` findings file.
5. Whether the first-risk demonstration in Stage 2 should be R-001, R-007, or
   R-011, and which harness the P0 review wave uses as its exemplar.
6. Exact redaction and export-preview assertion helper shared between
   P0-AC-026 and the DevTools redaction suites so that both reuse the same
   secret-injection corpus.
7. Whether the register's likelihood reassessment after fuzzing or advisories
   records its rationale as a register-row note or as a standalone decision
   entry, and which review role approves a likelihood change.
8. Whether `Mitigated` risks need a periodic re-attestation heartbeat before
   they are treated as stale, and its interval.

## Acceptance criteria

This RFC is accepted on 2026-08-29 and closes
[OQ-025](../decisions/open-questions.md) at the design level. The following criteria were satisfied per the [open-question register](../decisions/open-questions.md) close rule:

1. Independent review by the category owner, a docs curator, and a security
   reviewer accepts the traceability matrix, the risk-closure lifecycle, the
   evidence taxonomy, and every risk-to-criterion mapping, with explicit
   confirmation that no P0 gate is weakened.
2. Affected documents are synchronized in the same change: the security-risk
   and P0-AC citations in [Security Risk Register](../security/risk-register.md)
   and [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md),
   the OQ-025 row in [open-question register](../decisions/open-questions.md),
   and the candidate entry in [decision register](../decisions/index.md)
   reference the accepted contract, and the open-question row moves from
   pointer to closure per the register close rule.
3. No element weakens a normative P0 gate; any discovered conflict returns the
   conflicting clause to revision rather than downgrading the gate.
4. The draft text in this file was updated to record acceptance date and
   initiator, frontmatter becomes `accepted`, and links from
   [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md) and
   the [decision register](../decisions/index.md) reflect the accepted
   evidence contract without claiming implementation. Any per-risk move to
   `Mitigated` or `Accepted` beyond the design-level closure happens only via
   a separate, evidence-cited follow-up that satisfies the Entry to Mitigated
   checklist.

Closes OQ-025: this RFC closes that open question at the design level; the register rows are updated per the open-question register rules. The lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## P0 Review Sign-off

> P0 review per CTX-0078 tracks acceptance of OQ-025 via this RFC. Frontmatter is `accepted` and [open-questions.md](../decisions/open-questions.md) is updated per its close rule. This section records passing sign-off and closes OQ-025.

<!-- markdownlint-disable MD013 -->

| Role                                  | Reviewer          | Verdict | Evidence / scope                                                                                                                                                                                                                                                                   | Date       |
| ------------------------------------- | ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| security-auditor                      | `bitty-security`  | pass    | R-001..R-022 traceability to P0-AC-001..034, register State rules, evidence taxonomy `unit`/`integration`/`adversarial`/`manual-audit`/`ci-gate`, safe-mode invariance, no weakening of overview invariants 1..10                                                                  | 2026-08-28 |
| category-owner (security-and-quality) | `bitty-quality`   | pass    | Risk-closure lifecycle RS-1..RS-7, entry checklist 1..8, traceability table, per-risk delta, verification staging, no P0 gate weakening                                                                                                                                            | 2026-08-29 |
| category-owner (architecture)         | `bitty-architect` | pass    | Traceability R-001..R-022 to P0-AC, normative controls, evidence taxonomy artifact storage CarryCtx linkage, stage deadline vs deferral, safe-mode invariance                                                                                                                      | 2026-08-29 |
| docs-curator                          | `bitty-curator`   | pass    | Frontmatter `accepted`, lifecycle `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`, links to [Risk register](../security/risk-register.md), [P0-AC](../security/p0-acceptance-criteria.md), [Threat model](../security/threat-model.md), English-only | 2026-08-29 |

<!-- markdownlint-enable MD013 -->

<!-- markdownlint-disable MD013 -->

As of 2026-08-29, the register and P0-AC remain the normative contracts with the traceability and evidence gates now accepted; crate
presence alone (including any headless measurement harness in `bitty`) does not
imply that a risk is mitigated, per
[ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md).

<!-- markdownlint-enable MD013 -->

## References

- Bitty accepted security corpus: [Security Overview](../security/overview.md),
  [Threat Model](../security/threat-model.md),
  [Risk Register](../security/risk-register.md),
  [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md).
- Mechanism RFCs/ADRs that supply the mechanisms and ceilings this RFC cites:
  [Terminal State RFC](terminal-state-rfc.md),
  [Rich Presentation RFC](rich-presentation-rfc.md),
  [Isolation Resource RFC](isolation-resource-rfc.md) (RC-1..RC-10, FS-1..FS-9),
  [Plugin Platform RFC](plugin-platform-rfc.md),
  [Configuration Model RFC](configuration-model-rfc.md),
  [Default Distribution RFC](default-distribution-rfc.md),
  [IPC and Agent RFC](ipc-agent-rfc.md),
  [DevTools RFC](devtools-rfc.md),
  [Lua Runtime RFC](lua-runtime-rfc.md),
  ADR 0004 and ADR 0005 for dependency and Lua pins.
- Review gate definitions:
  [P0 Review Checklist](../reviews/p0-review-checklist.md) and
  [documentation workflow](../development/documentation-workflow.md) for status
  and lifecycle vocabulary.
