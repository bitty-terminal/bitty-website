---
title: Package integrity, activation, and rollback
description: Defines the accepted integrity verification chain staged activation lifecycle and safe rollback contracts for OQ-021 and OQ-022
category: specifications
audience: security-reviewer
document_type: specification
status: accepted
website_publish: true
sidebar_order: 18
---

# Package integrity, activation, and rollback

> Status: **accepted** on 2026-08-27 by the project initiator. This document
> defines the accepted integrity verification chain, staged activation lifecycle
> and safe rollback contracts; it closes
> [OQ-021](../decisions/open-questions.md) at the design level and partially
> addresses [OQ-022](../decisions/open-questions.md) with remaining
> registry and key items migrated to OQ-026 through OQ-029. It does not describe
> implemented behavior and does not authorize shipped, stable, or
> compatibility-guaranteed behavior. Experimental implementation may exist as
> review evidence but carries no compatibility promise beyond the accepted
> contract. The lifecycle and integrity model is accepted as normative for staged
> activation and rollback; real signature verification, registry service, and
> key-directory contracts remain draft under OQ-022 and OQ-026 through OQ-029.

## Document status

- Status: **accepted** on 2026-08-27 by the project initiator; this RFC defines
  the accepted integrity verification chain, staged activation lifecycle and safe
  rollback contracts and closes OQ-021. The lifecycle and integrity model is
  accepted as normative for staged activation and rollback; real signature
  verification, registry service, and key-directory contracts remain draft under
  OQ-022 and OQ-026 through OQ-029.
- It targets OQ-021 (closed) and OQ-022 (partially addressed); residual items
  are migrated to new open questions OQ-026, OQ-027, OQ-028, and OQ-029
  (see [Open items remaining under OQ-021/OQ-022](#open-items-remaining-under-oq-021oq-022)). Until those are resolved, the new
  questions remain Open.
- Every mechanism below is an **accepted contract for the lifecycle and
  integrity scope**; no statement here is evidence that any control is
  implemented today. Experimental `bitty-package` may exist as review evidence
  but carries no compatibility promise beyond the accepted contract. Real
  signature verification and key-directory wiring remain draft per crate docs.

## Purpose and scope

OQ-021 asks: _what are the package manifest, lockfile, version, resolver,
validation, transactional activation, rollback, and retained-environment
contracts?_ OQ-022 asks: _which source types precede a registry, and how are
integrity, signatures, provenance, local paths, and publisher trust enforced?_

This RFC answers the integrity, activation, and rollback portions of both
questions with accepted contracts, their security properties, and testable
verification criteria: one verification chain applied to every source type, a
comparison of publisher-trust models (trust-on-first-use versus signed
releases), a staged activation lifecycle separated from installation, and
rollback over retained environments.

In scope: manifest and lockfile hashing schemes; the verification pipeline;
publisher-trust options and staged adoption at the contract level;
local-path development packages; the activation transaction and its phases;
retained-environment bounds; full and per-plugin rollback; failure and crash
semantics.

Out of scope: constraint grammar, prerelease/yanked policy, and side-by-side
dependency versions (remaining OQ-021 items now [OQ-026](../decisions/open-questions.md) and [OQ-027](../decisions/open-questions.md)); registry service design,
key-directory infrastructure, and revocation details (remaining OQ-022 items
now [OQ-028](../decisions/open-questions.md) and [OQ-029](../decisions/open-questions.md));
plugin runtime isolation and capability enforcement (OQ-014); CLI verb
spelling ([package management](../extensibility/package-management.md)).

## Normative constraints this RFC must not weaken

The [security overview](../security/overview.md),
[threat model](../security/threat-model.md), and
[P0 acceptance criteria](../security/p0-acceptance-criteria.md) are normative.
This RFC only defines mechanisms beneath them:

- Invariant 7: every untrusted input has size, time, nesting, rate, and memory
  limits; manifests, lockfiles, and package metadata are untrusted inputs.
- Invariant 8 (release-blocking): installation runs no package code, and
  updates cannot silently add capabilities.
- Threat-model supply-chain controls and abuse case T-12 (update introduces
  malicious code or new privileges); T-06 context for what a compromised
  package must never reach.
- Risks R-015 (malicious update enters runtime), R-016 (silent capability
  increase), R-017 (native payloads rejected), R-022 (install-time execution),
  and R-009 (recovery paths) remain **Open** until their cited criteria record
  passing evidence.
- P0-AC-027 through P0-AC-030 are the normative floor: no install-time
  execution, lock/checksum fail-closed integrity, transactional activation
  with deterministic restoration, and capability-increase blocking. Nothing in
  this RFC relaxes them; the options below only extend them.

## Lifecycle overview

Status: **accepted contract.**

A package moves through six states. Each transition is a named gate; failing a
gate fails closed and leaves the previous state unchanged.

```text
discovered -> fetched -> verified -> staged -> activated -> retained
                                       |          |
                            (approval gate)  (activation txn)
                                                  |
                                           restored (rollback)
```

- _Discovered_: a source declares an ID/version; nothing is trusted yet.
- _Fetched_: bytes land in a quarantine area; no execution, no plugin VM
  contact, and no parsing beyond framing and budget enforcement.
- _Verified_: every integrity check below passes against the lock record, and
  declared capabilities pass the approval gate.
- _Staged_: verified content sits in the package store as a complete
  generation that is not yet active.
- _Activated_: one atomic switch makes the staged generation the environment
  the plugin host loads from. This is the earliest step at which any package
  code can execute, and it happens only after all earlier gates.
- _Retained_: superseded generations stay available for rollback up to a
  bounded count, then are pruned.

Installation (`add`, `update`, `sync`) spans discovery through staging and
executes zero package code. Activation is a separate transaction owned by the
package-manager service, never re-implemented by CLI adapters or performed by
the plugin host.

## Integrity verification chain

### Verification pipeline

Status: **accepted contract.** The chain is ordered; each stage consumes the
output of the previous one and none may be skipped for any source type.
Bundled and local-path sources use degenerate records rather than exemptions:

1. **Fetch framing**: transfer-size and time budgets apply before and during
   download; oversized or stalled transfers abort into quarantine cleanup.
2. **Artifact checksum**: the fetched artifact digest is compared against the
   lockfile record; mismatch fails closed (normative floor P0-AC-028).
3. **Manifest validation**: schema, field, and limit validation of the
   manifest as untrusted data; bounded identifiers, bounded capability lists,
   bounded dependency graphs, unknown-field rejection.
4. **Manifest hash binding**: the validated manifest is hashed again in
   canonical form and compared to the lock record, binding the _semantics_
   that were approved, not merely the transport bytes.
5. **Capability diff**: requested capabilities are diffed against the
   installed version granted set; any increase blocks until explicit approval
   (normative floor P0-AC-030, risk R-016).
6. **Compatibility check**: declared Plugin API and Bitty compatibility must
   include the running host, or the operation fails before staging.
7. **Store commit**: verified content is written into the package store under
   its content digests; the new lock resolution is persisted only after the
   store commit succeeds.

The chain runs identically for install and update. No trusted-source fast path
skips stages 3 through 5.

### Manifest hashing schemes

Status: **accepted options with a recommended combination.** The lockfile
binds three distinct digests so that transport corruption, semantic
reinterpretation, and partial content tampering are independently detectable.

| Option | Scheme                                                                        | Detects                                                                         | Weaknesses                                                                                                                                |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| H-A    | Whole-artifact digest (SHA-256 class) over fetched bytes                      | Any byte change in transit or at rest                                           | Reformatting invalidates pins even when semantics are identical                                                                           |
| H-B    | Canonical-form manifest digest over a fully specified canonical serialization | Any semantic change: fields, values, capability sets, dependency edges          | A canonicalization bug becomes a forgery or false-mismatch vector; the canonical encoding must be specified and frozen per format version |
| H-C    | Per-file Merkle tree over package contents, root recorded in the lock         | Any file addition, removal, or modification; enables lazy per-file verification | More bookkeeping; root rotates on any content change                                                                                      |

Security properties of the recommended combination (H-A plus H-B now, H-C
when the content-addressed store lands):

- H-A alone cannot distinguish "same package, reformatted" from "different
  package". H-B closes that gap and gives the approval gate a stable object:
  a capability grant survives cosmetic repackaging but not a capability-list
  edit.
- H-B depends on canonicalization correctness; therefore the canonical form is
  versioned, and changing it forces re-recording of lock digests through an
  explicit migration, never in-place reinterpretation.
- H-C roots make the store self-verifying: activation spot checks and audit
  commands can prove store contents against the lock without trusting
  filesystem metadata.

Testable criteria: PL-AC-001, PL-AC-002.

### Publisher trust options

Status: **accepted staged options; P0 floor unchanged; real signature verification remains draft per crate docs.** Checksums prove that
what was fetched matches what was locked; they do not prove who published it.
Three trust models close that gap at increasing infrastructure cost.

| Option | Mechanism                                                                                                              | Detects                                                                                            | Does not detect                                                                                         | Stage fit                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| V-A    | Exact lock pinning plus checksums (floor)                                                                              | Substitution of different content than previously locked                                           | First-install compromise; hostile publisher from the start                                              | P0, normative                                                    |
| V-B    | Trust-on-first-use per publisher identity or source                                                                    | Publisher key or source change after first pin (account takeover, hijacked repository)             | Anything at first contact: typo-squats, initial MITM, malicious first release                           | P1 candidate for Git sources and a future registry               |
| V-C    | Signed releases: publisher signatures over manifest and artifact digests, verified against an authenticated key record | Forged or tampered artifacts and manifests regardless of channel; supports revocation and rotation | Misbehavior by the legitimate key holder; freeze/downgrade attacks unless freshness data is also signed | P2 candidate alongside a registry, per security-overview staging |

Properties and hazards:

- V-B's entire value is the pin record. A pin change must therefore be a loud
  security event with explicit re-approval, never a silent update. Pins bind
  the strongest available identity: a publisher public key where one exists,
  otherwise the exact source URL plus resolved revision.
- V-B is vulnerable at first contact by construction. It must not be presented
  to users as authentication; interface text and documentation must state what
  it does and does not prove.
- V-C subsumes V-B for signed sources: a key change becomes a visible rotation
  instead of a trust break. It inherits key-management obligations
  (enrollment, rotation, revocation, local key protection) which remain open
  design work under OQ-022.
- Neither V-B nor V-C relaxes V-A: every source, signed or not, still records
  exact lock data and passes the full verification chain.
- Freeze and downgrade attacks (serving an old, validly pinned release) are
  partially mitigated by explicit user-initiated updates and version
  constraints; complete mitigation needs signed freshness metadata and is an
  open item, not silently accepted.

### Local-path development packages

Status: **accepted contract.** Local paths exist for development; they need
visibly different trust semantics, not exemptions:

- A local-path package is recorded in the lock with a distinct source class
  and a content digest captured at resolution time; it never claims registry
  or signature provenance it cannot have.
- Content changes are detected on every sync/update by re-digestion; drift
  between disk content and lock record is reported as unverified until
  re-resolved.
- A local-path package cannot be republished or promoted to a verified class
  without passing the full verification chain as its own artifact.

Testable criterion: PL-AC-005.

## Staged activation lifecycle

### Activation phases

Status: **accepted contract.** Activation is one transaction with named
phases; every phase has a defined failure action, and failure anywhere before
`commit` leaves the active environment untouched:

| Phase     | Action                                                                    | On failure                                            |
| --------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| preflight | Re-verify generation digests against the lock; check host compatibility   | Abort; staged generation marked unusable              |
| quiesce   | Ensure no plugin VM from the affected set is executing mid-callback       | Abort; retry with backoff, then surface error         |
| commit    | Atomically switch the active-environment pointer to the staged generation | Abort; pointer unchanged                              |
| wake      | Load plugins per desired state in fresh VMs                               | Automatic restore of prior generation pointer; reload |
| confirm   | Health window elapses without crash-loop or budget storms                 | Offer or apply automatic restore per policy           |

The atomic switch target depends on platform rename semantics; the contract
requires observable all-or-nothing behavior, not a specific syscall.

Testable criteria: PL-AC-006, PL-AC-007.

### Staging mechanics options

Status: **accepted options.** Two candidate mechanisms implement the switch:

| Option | Mechanism                                                                                                                     | Security and reliability properties                                                                             | Costs                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| S1     | Directory swap: build the new tree beside the old, then atomically replace the `current` pointer (rename or symlink flip)     | Single atomic step; crash between store write and switch leaves old environment active; simple audit story      | Whole-tree rebuild per change unless deduplicated; brief window where both trees exist                      |
| S2     | Retained generations: each activation creates a numbered generation of lock plus store links; activation selects a generation | Rollback equals selecting an older generation; history is inspectable; deduplication natural via shared digests | Generation metadata becomes attack surface and must be covered by integrity checks; pruning policy required |

Recommendation: S2 built on S1's atomic pointer switch — generations for
history and rollback, one atomic selection step for the switch itself. Both
candidates satisfy the normative floor; the recommendation is about rollback
ergonomics, not security necessity.

## Safe rollback semantics

### Retained environments

Status: **accepted contract.**

- Each successful activation records an immutable generation entry: full lock
  resolution, generation root digest, capability grant snapshot, activation
  time, and the previous generation ID.
- Retention keeps the current plus the previous N generations (candidate N = 2) bounded by count and total bytes; pruning never removes the current
  generation and is skipped when it would leave zero rollback targets.
- Generation entries are covered by the same integrity discipline as
  lockfiles: a tampered or unparseable generation is quarantined and reported,
  never activated.

Testable criteria: PL-AC-008, PL-AC-009.

### Rollback operations

Status: **accepted contract.**

- Full rollback selects a retained generation and performs the same staged
  activation transaction in reverse; rollback executes no package code either.
- Per-plugin rollback restores one plugin to its previously retained version;
  targeted disable ([P0-AC-020](../security/p0-acceptance-criteria.md), risk
  R-009) remains the surgical path when no prior version exists.
- Capability gates apply symmetrically: rolling forward again to a
  higher-capability version requires the same approval diff as any update;
  rollback never silently reintroduces broader authority.
- Safe mode (`bitty --safe`) is independent of package state and must start
  even when every generation is corrupt; rollback tooling is unavailable in
  safe mode's minimal environment only in the sense that nothing third-party
  loads there at all (normative floor P0-AC-019).

Testable criteria: PL-AC-010.

## Verification criteria

These design-level criteria extend, and defer to, the normative floor in
[P0 acceptance criteria](../security/p0-acceptance-criteria.md) section
"Supply chain" (P0-AC-027 through P0-AC-030). IDs are stable. Until each
criterion records passing evidence per its verification method, the linked
risks stay **Open**; these criteria alone never close a risk.

### PL-AC-001 Multi-digest lock binding

Extends P0-AC-028. Sources: T-12; risks R-015, R-022.

- Given a package whose artifact bytes, canonical manifest form, dependency
  edges, or recorded compatibility differ from the lock record,
  when any verification-pipeline stage runs,
  then each tampered dimension is independently detected and the operation
  fails closed before staging.

Verification: adversarial (independent tamper matrix) + unit.
Pass threshold: every dimension tampered alone is rejected; no combination
passes validation.

### PL-AC-002 Canonical manifest determinism

Source: H-B scheme properties; T-12; risk R-015.

- Given logically identical manifests differing only in formatting, field
  order, comments, or whitespace,
  when canonical digests are computed on any supported platform,
  then digests match byte-for-byte; and given any semantic edit including a
  single capability addition, digests differ.

Verification: unit + adversarial.
Pass threshold: cross-platform determinism suite passes; semantic-edit
differential suite shows zero collisions.

### PL-AC-003 Trust-pin change enforcement

Source: V-B option; T-12; risk R-015.

- Given a previously installed package whose publisher identity or source now
  resolves to a different key, URL, or revision lineage than the recorded pin,
  when install or update runs,
  then the operation blocks and proceeds only after an explicit,
  user-visible re-approval that names the changed identity.

Verification: integration + adversarial.
Pass threshold: pin-change tests block silently-updated identities; approval
flow records the old and new identity in the decision surface.

### PL-AC-004 Signature verification fail-closed

Source: V-C option; T-12; risks R-015, R-022.

- Given an unsigned artifact, a signature over different bytes, an unknown
  signing key, or a revoked key, for a source configured to require
  signatures,
  when the verification pipeline runs,
  then every case is rejected before staging and none reaches the store.

Verification: adversarial + unit.
Pass threshold: negative-signature corpus fully rejected; validly signed
content from a rotated-but-trusted key still verifies per the key record.

### PL-AC-005 Local-path trust separation

Source: OQ-022 local-path requirement; T-12; risk R-015.

- Given a local-path package whose files change after resolution,
  when sync, update, or activation-time spot checks run,
  then the drift is reported and the package is treated as unverified until
  re-resolution, and no code path grants it registry-class provenance.

Verification: integration.
Pass threshold: drift detection fires on file addition, removal, and
modification; promotion requires the full verification chain.

### PL-AC-006 Atomic staged switch

Extends P0-AC-029. Sources: activation transaction; T-12; risk R-015.

- Given induced process death, power loss simulation, or filesystem error at
  any point during the commit phase,
  when the system restarts or recovers,
  then exactly one complete generation is active: either the previous or the
  new one, never a mixed tree.

Verification: integration (crash/fault injection).
Pass threshold: fault matrix across the commit phase shows zero mixed-state
observations after recovery.

### PL-AC-007 Activation failure restore

Extends P0-AC-029. Source: T-12; risks R-007, R-015.

- Given a plugin that crashes, loops, or exceeds budgets during the wake or
  confirm phase,
  when activation health checks fire,
  then the previous generation is restored automatically within the defined
  window and the failing package is reported with attribution.

Verification: integration (fault injection).
Pass threshold: induced failures in wake and confirm restore the prior
generation; host remains responsive throughout.

### PL-AC-008 Deterministic rollback

Extends P0-AC-029. Source: T-12; risk R-015.

- Given a completed activation followed by rollback to generation G,
  when the restored environment is inspected,
  then its lock resolution and store contents match generation G's recorded
  digests exactly.

Verification: integration.
Pass threshold: digest comparison proves bit-level restoration for the full
rollback matrix, including multi-plugin environments.

### PL-AC-009 Retention bounds

Source: retained-environment contract; R-009 context.

- Given more than N retained generations plus configured byte limits,
  when pruning runs,
  then oldest generations beyond the bound are removed, the current
  generation is never removed, and pruning results are reported.

Verification: integration.
Pass threshold: bound enforced under sustained updates; attempted activation
of a pruned generation fails with a clear error rather than partial state.

### PL-AC-010 Symmetric capability gates on rollback

Sources: invariant 8; T-12; risk R-016.

- Given rollback followed by a return to the higher-capability version,
  when the return is performed,
  then it requires the same explicit permission-diff approval as the original
  update, and no operation path reintroduces broader capability silently.

Verification: integration + adversarial.
Pass threshold: redo-after-rollback without approval is denied on every
attempted path, including sync and lockfile replay.

### Coverage traceability

| Criterion      | Covers                              | Linked risks    |
| -------------- | ----------------------------------- | --------------- |
| PL-AC-001..002 | Integrity chain, hashing schemes    | R-015, R-022    |
| PL-AC-003..004 | Publisher trust options             | R-015, R-022    |
| PL-AC-005      | Local-path packages                 | R-015           |
| PL-AC-006..008 | Staged activation and rollback      | R-015, R-007    |
| PL-AC-009      | Retention and pruning               | R-009 (context) |
| PL-AC-010      | Capability symmetry across rollback | R-016           |

Normative floor mapping: P0-AC-027 (no install execution) is preserved by the
lifecycle split and not restated here; P0-AC-028 is extended by PL-AC-001;
P0-AC-029 is extended by PL-AC-006 through PL-AC-008; P0-AC-030 is extended by
PL-AC-010. Native payload rejection (R-017) applies at fetch framing and store
commit and is owned by P0-AC-018.

## Security review notes

This accepted contract strengthens the supply-chain posture without touching any
P0 guarantee: the verification chain adds semantic binding (H-B) and store
self-verification (H-C) above the checksum floor; TOFU pins and signatures add
publisher assurance in later stages while leaving first-contact risk
explicitly stated rather than hidden; the activation lifecycle makes
transactional restoration concrete and fault-testable; retention bounds keep
recovery available (R-009) while capping storage abuse. Residual accepted
exposures: first-contact compromise under V-B, legitimate-key-holder
misbehavior under all options, and freeze/downgrade windows pending signed
freshness metadata. These residuals belong to OQ-022 follow-up design, not to
implementation shortcuts. Real signature verification remains draft per crate
docs; the lifecycle and integrity model is accepted as normative.

Reviewer guidance: verify that no option above is readable as permitting
install-time execution, silent capability growth, checksum skipping for any
source class, or non-transactional activation. Any such reading is a defect in
this document.

## Open items remaining under OQ-021/OQ-022

The following items were open at proposal and are now dispositioned upon
acceptance on 2026-08-27. Acceptance of this RFC closes
[OQ-021](../decisions/open-questions.md) at the design level; residual items
below are tracked as follow-up work with no remaining OQ-021 closure blocker
unless review decides otherwise:

- Resolved by this RFC upon acceptance (closes OQ-021): integrity
  verification chain (fetch framing, artifact checksum, manifest validation,
  manifest hash binding, capability diff, compatibility check, store commit),
  hashing schemes H-A/H-B/H-C, publisher trust options V-A/V-B/V-C at the
  contract level, local-path development package semantics, staged activation
  lifecycle and atomic switch, retained environments, and safe rollback
  semantics. These are Accepted design as of 2026-08-27.
- Migrated to [OQ-026](../decisions/open-questions.md) (Dependency resolver
  and constraint grammar): constraint grammar, side-by-side dependency
  versions, and resolver selection semantics.
- Migrated to [OQ-027](../decisions/open-questions.md) (Version lifecycle:
  yank, prerelease, and side-by-side policy): yanked-version policy,
  prerelease precedence, and interaction with constraint resolution.
- Migrated to [OQ-028](../decisions/open-questions.md) (Registry service and
  attestation): registry service boundaries (what the registry attests versus
  what the client verifies) and whether bundled packages ship inside the
  generation model or outside it.
- Migrated to [OQ-029](../decisions/open-questions.md) (Key directory,
  revocation, rotation, and freshness): key enrollment, rotation, revocation,
  key-directory infrastructure, freshness/snapshot timestamps for V-C, and
  whether Git-source publishers can practically sign; plus exact manifest and
  lockfile format versions and their canonical encodings (H-B specification)
  and default N for retained generations and the byte budget with
  `clean`/`doctor` interaction where they touch trust state.

Closes OQ-021: this RFC closes OQ-021 at the design level; the register row is
updated per the open-question register rules. OQ-022 content is addressed by the
integrity and trust contracts above; any remaining OQ-022-specific registry or
freshness scope lives under OQ-028/OQ-029 and remains Open.
