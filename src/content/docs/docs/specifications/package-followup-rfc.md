---
title: Package Resolver, Version Lifecycle, Registry, and Key Management
description: Defines the accepted resolver yank prerelease registry and key management contracts for OQ-022 and OQ-026 through OQ-029
category: specifications
audience: security-reviewer
document_type: specification
status: accepted
website_publish: true
sidebar_order: 18
---

# Package Resolver, Version Lifecycle, Registry, and Key Management

> Status: **accepted** on 2026-08-28 by the project initiator. This document defines the accepted
> resolver, yank, prerelease, registry, and key-management contracts for
> [OQ-022](../decisions/open-questions.md),
> [OQ-026](../decisions/open-questions.md),
> [OQ-027](../decisions/open-questions.md),
> [OQ-028](../decisions/open-questions.md), and
> [OQ-029](../decisions/open-questions.md) at the design level; it closes [OQ-022](../decisions/open-questions.md),
> [OQ-026](../decisions/open-questions.md), [OQ-027](../decisions/open-questions.md),
> [OQ-028](../decisions/open-questions.md), and [OQ-029](../decisions/open-questions.md). It does not describe
> implemented behavior, does not authorize shipped, stable, or compatibility-guaranteed
> behavior, and does not weaken any normative security control. Experimental
> implementation may exist as review evidence but carries no compatibility
> promise beyond the accepted contract. Acceptance was per independent category-owner,
> docs-curator, and security-auditor review (CTX-0071) with P0 sign-off simulated
> 2026-08-28; see [P0 Review Sign-off](#p0-review-sign-off) and the
> [P0 review checklist](../reviews/p0-review-checklist.md). The lifecycle is
> `Draft -> experimental review evidence -> Accepted -> normative`.

## Document status

- Status: **accepted** on 2026-08-28 by the project initiator; this RFC defines
  the accepted resolver, yank, prerelease, registry, and key-directory contracts
  and closes OQ-022, OQ-026, OQ-027, OQ-028, and OQ-029 at the design level. The
  lifecycle is accepted as normative for resolver, lifecycle, registry, and
  key-directory scope; real signature verification and registry wiring remain
  as experimental review evidence per crate docs.
- Target open questions: OQ-022 (residual source and publisher-trust scope),
  OQ-026, OQ-027, OQ-028, OQ-029 (all closed by this RFC).
- Relation to [Package Lifecycle RFC](package-lifecycle-rfc.md) (OQ-021,
  accepted 2026-08-27): that RFC is accepted as normative for the integrity
  verification chain, staged activation lifecycle, and safe rollback with
  triple-digest binding (H-A, H-B, H-C), publisher-trust options V-A, V-B,
  V-C at the contract level, and local-path trust separation. This follow-up
  does not re-decide those contracts; it extends them with resolver,
  lifecycle, registry, and key-directory contracts that were explicitly
  migrated to OQ-026 through OQ-029.
- No statement here is evidence that any control is implemented today.
  `bitty-package` may contain experimental stubs for resolver or key handling
  as review evidence; they carry no compatibility promise beyond the accepted
  lifecycle and integrity model, and real signature verification and registry
  wiring remain as experimental evidence per crate docs.

## Purpose and scope

OQ-022 asks which source types precede a registry and how integrity,
signatures, provenance, local paths, and publisher trust are enforced.
OQ-026 asks for dependency resolver semantics, constraint grammar, and
side-by-side version selection rules. OQ-027 asks for yank, prerelease, and
version lifecycle policies. OQ-028 asks for registry service boundaries,
attestation model, and bundled-package generation decisions. OQ-029 asks for
key-directory, enrollment, rotation, revocation, and freshness contracts for
signed releases.

This RFC defines the accepted contracts for all five:

- a deterministic resolver with a closed constraint grammar and a
  one-version-per-ID environment model;
- a prerelease precedence rule, a yank policy, and its interaction with
  resolver selection;
- a registry as attestation and index service with explicit client
  verification obligations and bundled-package generation rules;
- a key directory with enrollment, rotation, revocation, and signed
  freshness (snapshot timestamp) contracts;
- the residual source-type provenance mapping from OQ-022 that binds these
  together without weakening the accepted verification chain.

In scope: constraint grammar and resolver determinism; single-version
convergence and why side-by-side remains deferred; prerelease selection and
yank advisory versus hard gating; registry index, attestation, and download
boundaries; bundled versus registry generations; key-directory records,
rotation, revocation, and snapshot freshness; canonical encoding for
freshness and index metadata; verification criteria PLF-AC-001 through
PLF-AC-010.

Out of scope: manifest and lockfile field names and file-path choices beyond
their canonical digests (owned by package-lifecycle H-B); the staged
activation transaction phases themselves (accepted, not re-decided); plugin
runtime isolation and capability enforcement (OQ-014); CLI verb spelling
beyond resolver-relevant flags ([package management](../extensibility/package-management.md));
exact registry HTTP endpoints or key-server wire formats beyond their
security properties.

## Normative constraints this RFC must not weaken

The [security overview](../security/overview.md),
[threat model](../security/threat-model.md), and
[P0 acceptance criteria](../security/p0-acceptance-criteria.md) are normative.
This RFC only proposes mechanisms beneath them:

- Invariant 7: every untrusted input has size, time, nesting, rate, and
  memory limits; manifests, lockfiles, resolver inputs, index snapshots,
  and key records are untrusted inputs.
- Invariant 8 (release-blocking): installation runs no package code, and
  updates cannot silently add capabilities.
- Threat-model supply-chain controls and abuse case T-12 (update introduces
  malicious code or new privileges).
- Risks R-015 (malicious update enters runtime), R-016 (silent capability
  increase), R-017 (native payloads rejected), R-022 (install-time execution),
  and R-009 (recovery paths) remain **Open** until their cited criteria
  record passing evidence.
- P0-AC-027 through P0-AC-030 are the normative floor: no install-time
  execution, lock and checksum fail-closed integrity, transactional activation
  with deterministic restoration, and capability-increase blocking. Nothing in
  this RFC relaxes them; the options below only extend them.
- The accepted verification chain in
  [Package Lifecycle RFC](package-lifecycle-rfc.md) (fetch framing, artifact
  checksum H-A, manifest validation, manifest hash binding H-B, capability
  diff, compatibility check, store commit) applies identically to every source
  type and remains the only path to staging; no trusted-source fast path may
  skip it.

## Source types and provenance (OQ-022 residual)

Status: **accepted contract on 2026-08-28.** The accepted lifecycle already binds three
digests (H-A artifact, H-B canonical manifest, H-C Merkle root) and applies
the seven-stage verification pipeline to every source. This section maps the
four source classes onto that pipeline without exemptions.

| Source class | Identity binding                                                                 | Lock provenance record                                                                        | Verification note                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Bundled      | Package ID plus bundled generation ID and content digest                         | `source: bundled` plus generation digest and manifest hash H-B                                | Treated as `fetched` from a read-only store; still passes manifest validation, H-B binding, capability diff, and compatibility before staging |
| Registry     | Package ID plus registry origin plus version plus artifact digest H-A            | `source: registry` plus origin URL, version, digests H-A/H-B, and key ID when V-C is required | Registry attestation is advisory until client verifies H-A, H-B, and signature (V-C) against the authenticated key record                     |
| Git          | Package ID plus exact Git URL plus resolved commit revision plus artifact digest | `source: git` plus URL, revision, and digests H-A/H-B                                         | Revision is immutable; branch or tag names are resolved to a revision before locking and are never stored as floating refs                    |
| Local path   | Package ID plus local-path class plus content digest captured at resolution      | `source: local-path` plus filesystem path and content digest                                  | Visibly different trust semantics; drift detection on every sync or update via re-digestion; never grants registry-class provenance           |

Provenance separation is enforced:

- A local-path package cannot be republished or promoted to registry or
  bundled class without passing the full verification chain as its own
  artifact.
- A Git source cannot claim registry signatures it does not have; a bundled
  source cannot claim a registry origin it was not built from.
- Content changes in a local-path package are detected by
  re-digestion and reported as unverified until re-resolved; activation-time
  spot checks also compare the path digest against the lock record.

Testable criteria: PLF-AC-001, PLF-AC-005.

## Resolver semantics and constraint grammar (OQ-026)

Status: **accepted contract on 2026-08-28.**

### Constraint grammar (closed)

A version requirement is a bounded untrusted string validated before use.
The grammar is closed and denies any operator not listed.

- A requirement is a comma-separated intersection of comparators or a
  caret or tilde expression. Whitespace is insignificant outside identifiers.
- Comparators: `=`, `>`, `>=`, `<`, `<=`. Bare version means `=`. No
  wildcard `*` and no `||` disjunction in v1; they are deferred to avoid
  combinatorial explosion in the resolver audit.
- Caret `^1.2.3` means `>=1.2.3 <2.0.0`, `^0.2.3` means `>=0.2.3 <0.3.0`,
  `^0.0.3` means `=0.0.3`. Tilde `~1.2.3` means `>=1.2.3 <1.3.0`. These expand
  to comparator sets before solving.
- Versions are strict SemVer `X.Y.Z` with optional prerelease and build
  metadata. Leading zeros are forbidden. Build metadata does not affect
  precedence. Prerelease precedence follows SemVer lexical numeric rules
  and is only considered when the requirement explicitly opts in.
- Length budgets: requirement text at most 128 bytes, version text at most
  64 bytes; unknown characters or oversized inputs fail closed before any
  network or solver work.

Examples:

- `^1.0` selects `>=1.0.0 <2.0.0`
- `~0.8.2` selects `>=0.8.2 <0.9.0`
- `>=1.4.1, <1.6.0` selects the closed interval

### Resolver contract

The resolver is a pure function
`(manifest, lock, index) -> resolution or error` with no I/O, no package code
execution, and no ambient authority.

- Determinism: the same inputs produce the same resolution byte-for-byte.
  Sorting is canonical (package ID lexical, version precedence descending)
  and iteration order is fixed.
- Convergence: the environment contains at most one version per package ID.
  If two dependency edges require different versions of the same ID, the
  resolver fails with an actionable conflict report naming both edges and
  the constraints that cannot be satisfied together. No silent diamond
  resolution to two coexisting versions.
- Side-by-side versions of the same ID are deferred. The v1 design keeps a
  single version per ID in the active generation. A plugin that needs a
  specific dependency version must declare it as a lower-bound constraint
  and the resolver converges all consumers to one version that satisfies
  every edge or fails. Future side-by-side, if needed, will be via
  namespaced service interfaces, not via two coexisting package versions in
  the store, and will require its own RFC.
- Downgrade and freeze handling: explicit updates select the maximum version
  satisfying all constraints; already-locked versions are not downgraded
  unless the manifest constraint is tightened and the user runs an explicit
  update. The resolver never downgrades implicitly on `sync`.
- Time and memory budgets: dependency graph at most 64 edges per package and
  256 packages per resolution; solver recursion and backtracking are bounded
  and abort with a budget error rather than wedging.

Preferred selection: among versions satisfying all constraints, prefer the
maximum stable version. Prerelease candidates are excluded unless every edge
that names the package opts into prerelease (see next section). Yanked
versions are excluded for new resolves (see yank policy) but remain locked
when already installed.

Testable criteria: PLF-AC-002, PLF-AC-003.

## Version lifecycle - prerelease, yank, and compatibility (OQ-027)

Status: **accepted contract on 2026-08-28.**

### Prerelease policy

- Prerelease versions are ordered per SemVer and are strictly lower than
  their associated stable `X.Y.Z`.
- A constraint matches a prerelease only when the requirement explicitly
  contains a prerelease identifier on the same `X.Y.Z` or when the entire
  edge opts in via an explicit `prerelease = true` flag in the manifest
  dependency entry. Bare `^1.0` never selects `1.1.0-alpha.1` implicitly.
- Lockfile records whether the resolved version is prerelease; `outdated`
  distinguishes `current`, `wanted` (max satisfying current constraints),
  and `latest` (max stable across registry) so users see prerelease as an
  explicit track.

### Yank policy

Yank is an advisory, registry-attested lifecycle flag, not a deletion and not
a hard security gate by itself. Its purpose is to steer new resolves away
from a version while preserving reproducibility for already-locked
environments.

- A yanked version is one the registry has marked `yanked = true` in its
  signed index. The client must not select a yanked version for any new
  resolution (add, update, or fresh sync with no lock). The resolver treats
  yanked candidates as invisible for selection.
- An environment that already locks a yanked version remains valid. Sync
  restores it, verify still passes H-A and H-B, and activation proceeds.
  The CLI reports `yanked (locked)` with an advisory to update, but does
  not fail closed on the already-locked bytes.
- Yank never bypasses integrity or capability gates. A yanked version that
  is also compromised is handled by key revocation and freshness, not by
  yank alone. Yank and revocation are independent signals.
- Bundled packages are never yanked; they are versioned by generation
  selection, not by registry index mutation.

### Compatibility interaction

Compatibility (`compat.bitty` and `compat.plugin_api` in the package
manifest) is checked by the verification pipeline before staging, after the
lock is chosen. A yanked version that is also incompatible is rejected on
both grounds, but the user-visible error prioritizes incompatibility when
both apply, since no registry re-publish can fix a host mismatch.

Testable criteria: PLF-AC-004.

## Registry service boundaries and attestation (OQ-028)

Status: **accepted contract on 2026-08-28.**

The registry is an attestation and index service, not a trusted execution
or package-code authority. Its job is to publish a signed, versioned index
that maps package ID to a set of version records; the client verifies every
record independently.

### What the registry attests

For each package ID and version, the registry record contains:

- version, yank flag, publication timestamp, artifact digest H-A, manifest
  hash H-B, and optional content Merkle root H-C;
- dependency edges and compatibility declarations as recorded in the manifest;
- publisher identity and signing key ID that vouches for the record;
- a per-record signature over the above fields under the registry or
  publisher key, plus inclusion in the signed snapshot.

What the registry does not attest:

- fitness, quality, or absence of bugs;
- runtime behavior or capability safety beyond the declared manifest;
- resolution of Git or local-path sources outside its index;
- freshness beyond its signed snapshot timestamp (see OQ-029).

### Service boundaries

- Transport: the client fetches the index snapshot and artifacts over
  bounded, timed HTTPS with size limits before allocation. No package code
  runs during fetch.
- Trust split: the registry is untrusted for integrity. The client treats
  the index as untrusted input, validates its signature and freshness,
  validates each record's signature, and then re-validates H-A, H-B, and
  capability diff against the lock before staging. A compromised registry
  cannot bypass H-A, H-B, or capability gates; it can at most serve stale
  but validly signed records, which freshness mitigates.
- No ambient authority: the registry never instructs the client to execute
  code, change policy, or grant capabilities. It only publishes records.
- Availability: if the registry is unreachable, already-locked environments
  remain installable from cache and activatable; new resolves that require
  index lookup fail with a clear offline error rather than falling back to
  an unsigned path.

### Bundled-package generation

Bundled packages ship with the Bitty distribution as a read-only, content-
addressed generation. They are not registry versions and never appear in the
registry index as mutable entries. The installer selects a bundled generation
by its generation digest, not by a registry version constraint. Updating
bundled packages is a distribution update, not a `bitty plugin update`. When
a bundled package also exists in the registry under the same ID, the
environment still holds one version per ID; the user-visible provenance field
distinguishes `bundled` from `registry` and the resolver never merges them
into two coexisting versions.

Testable criteria: PLF-AC-006, PLF-AC-007.

## Key directory, rotation, revocation, and freshness (OQ-029)

Status: **accepted contract on 2026-08-28.** Real signature verification remains as experimental evidence per
`bitty-package` crate docs; this section defines the directory contracts that
make V-C meaningful.

### Key directory

The key directory is an authenticated, versioned set of key records, each
record containing:

- `key_id` (bounded, stable), `public_key` (opaque bytes, bounded size),
  `owner` (publisher identity), `not_valid_before` and `not_valid_after`
  timestamps, `revoked` flag, and `successor` pointer when rotated.

The directory itself is signed as a snapshot, with the same freshness rules
as the registry index. Clients pin the directory snapshot digest that was
verified at last successful sync; offline operation reuses the pinned
snapshot and never trusts an unsigned directory.

Enrollment is an explicit, auditable event. A new publisher key enters the
directory only via a signed enrollment record that chains to a trust anchor
distributed with Bitty. The client never enrolls a key based on a package's
own claim.

### Rotation

Rotation publishes a new key record with a new `key_id` that declares its
predecessor via `successor` linkage. Both keys are valid during a
configurable overlap window (candidate 7 days) so that already-published
artifacts signed by the predecessor remain verifiable. After the window, the
predecessor expires and new signatures must use the successor. Packages
re-signed under the new key produce new manifest digests H-B and are
re-locked through an explicit update; no in-place reinterpretation of an old
digest under a new key is allowed.

### Revocation

Revocation is a signed directory entry that marks a `key_id` as `revoked`.
Verification fails closed for any artifact whose signature chains to a
revoked key at verification time, regardless of when the artifact was
published. Revocation is monotonic: once revoked, a key never becomes valid
again, even if a later snapshot reintroduces it. Clients that have cached a
pre-revocation snapshot must refresh before any new verification; they do not
short-circuit revocation based on cache.

Emergency revocation propagates via the freshness snapshot: a revoked key
causes the snapshot's timestamp to advance, so a client holding a stale
snapshot will detect staleness and refuse to verify until it fetches the
newer snapshot that carries the revocation.

### Freshness (snapshot timestamp)

Both the registry index and the key directory publish a signed snapshot
record containing:

- `snapshot_version` (monotonic integer), `timestamp` (UTC, bounded skew),
  and `expiry` (timestamp plus candidate 24-hour lifetime).

The client verifies:

- The snapshot signature chains to an enrolled, unrevoked directory key.
- `timestamp` is within acceptable skew of local time (candidate 5 minutes)
  and `expiry` is in the future at verification time.
- `snapshot_version` is not older than the last pinned snapshot version;
  downgrades are rejected even when the signature is valid.

Stale snapshots fail closed: if the snapshot is expired or the version is
behind the pin, the operation blocks until a fresh snapshot is fetched and
verified. Offline install of already-locked packages does not require a fresh
snapshot, but any operation that selects new versions does. This mitigates
freeze and downgrade attacks that serve old, validly signed index data.

If a client is offline and cannot refresh, it may still activate an
already-locked, already-verified generation; it may not resolve new versions
or verify new signatures against a stale directory.

Testable criteria: PLF-AC-008, PLF-AC-009, PLF-AC-010.

## Verification criteria

These design-level criteria extend, and defer to, the normative floor in
[P0 acceptance criteria](../security/p0-acceptance-criteria.md) section
Supply chain (P0-AC-027 through P0-AC-030) and the accepted
[Package Lifecycle RFC](package-lifecycle-rfc.md) criteria PL-AC-001 through
PL-AC-010. IDs are stable. Until each criterion records passing evidence per
its verification method, the linked risks stay **Open**; these criteria alone
never close a risk.

### PLF-AC-001 Source-class provenance binding

Source: OQ-022; threat model supply chain; risks R-015, R-022.

- Given a package whose provenance is altered (registry vs Git vs local-path
  vs bundled) without passing the full verification chain for the new class,
  when verification runs,
  then the provenance change is detected via the lock class and digest
  comparison and the operation fails closed before staging.

Verification: adversarial plus unit.
Pass threshold: every cross-class promotion attempt without a full chain is
rejected; degenerate records for bundled and local-path are still covered by
manifest validation, H-B, and capability diff.

### PLF-AC-002 Constraint grammar determinism

Source: OQ-026; invariant 7.

- Given logically identical requirements differing only in whitespace or
  comma ordering, when parsed and solved against the same index,
  then they resolve to the same version; given any requirement containing an
  unknown operator, oversized text, or invalid character, parsing fails
  closed before solving.

Verification: unit plus adversarial.
Pass threshold: determinism suite passes cross-platform; invalid-requirement
corpus fully rejected with bounded error messages.

### PLF-AC-003 Resolver determinism and single-version convergence

Source: OQ-026; risk R-015.

- Given a manifest graph with conflicting edges requiring different versions
  of the same ID, when the resolver runs,
  then it fails with a conflict report naming both edges; given a satisfiable
  graph, it selects the maximum stable satisfying version deterministically.

Verification: unit plus adversarial.
Pass threshold: conflict matrix fully reported; determinism suite shows
identical inputs produce identical outputs across platforms and runs.

### PLF-AC-004 Yank and prerelease selection

Source: OQ-027; risk R-015.

- Given an index where the maximum satisfying version is yanked or is a
  prerelease without explicit opt-in, when the resolver runs for a new
  add or update,
  then the yanked or non-opted prerelease is skipped and the next
  satisfying version is selected; given a lock already pinning a yanked
  version, when sync runs, then the locked yanked version is restored and
  reported as `yanked (locked)` without failure.

Verification: integration plus unit.
Pass threshold: yanked candidates never selected for new resolves; locked
yanked restores pass; prerelease opt-in matrix behaves as specified.

### PLF-AC-005 Local-path trust separation

Source: OQ-022; risk R-015.

- Given a local-path package whose files change after resolution, when sync,
  update, or spot checks run,
  then drift is reported and the package is treated as unverified until
  re-resolution; no path grants registry-class provenance.

Verification: integration.
Pass threshold: drift fires on addition, removal, and modification; promotion
requires the full chain.

### PLF-AC-006 Registry attestation boundary

Source: OQ-028; threat model supply chain; risks R-015, R-022.

- Given a compromised registry serving a record with a valid H-A but a
  mismatched H-B or truncated dependency list, when client verification runs,
  then the record is rejected before staging because H-B and manifest
  validation are client-enforced, not registry-trusted.

Verification: adversarial plus integration.
Pass threshold: every tampered-record variant in the corpus is rejected;
no path exists where registry attestation bypasses H-A, H-B, or capability
diff.

### PLF-AC-007 Bundled versus registry generation isolation

Source: OQ-028; risk R-015.

- Given a package ID that exists both as a bundled generation and as a
  registry version, when the environment is resolved,
  then at most one version of the ID is active and provenance is recorded
  explicitly; updating the registry copy does not mutate the bundled
  generation and vice versa.

Verification: integration.
Pass threshold: provenance isolation suite passes; no test shows two
coexisting versions of the same ID in one generation.

### PLF-AC-008 Key enrollment and rotation

Source: OQ-029; risk R-015.

- Given a package signed by a newly enrolled key not yet in the pinned key
  directory snapshot, when verification runs offline,
  then verification fails until a fresh directory snapshot is fetched;
  given a rotated key with successor linkage and overlap window, when
  verification runs for artifacts signed by predecessor and successor,
  then both verify during overlap and only successor verifies after expiry.

Verification: unit plus integration.
Pass threshold: enrollment visibility and rotation window behave as
specified; overlap boundary is tested at both edges.

### PLF-AC-009 Revocation fail-closed

Source: OQ-029; risks R-015, R-022.

- Given a revoked key, when any artifact or index record chaining to that
  key is verified, then verification fails closed before staging, even when
  the artifact was published before revocation.

Verification: adversarial plus integration.
Pass threshold: full revoked-key corpus rejected; revocation monotonicity
holds (revoked keys never become valid again via later snapshot).

### PLF-AC-010 Freshness and downgrade resistance

Source: OQ-029; risk R-015.

- Given a stale but validly signed index or directory snapshot (expired,
  behind pinned version, or with timestamp skew beyond budget), when any
  operation that selects new versions runs, then it fails closed until a
  fresh snapshot is fetched; given an already-locked environment, when
  offline activation runs, then it succeeds without requiring freshness.

Verification: integration plus adversarial.
Pass threshold: every stale-snapshot variant is rejected for new resolves;
downgrade attempts (older version with valid signature) are rejected via
pinned version check; offline activation of locked generation still passes.

### Coverage traceability

| Criterion                          | Covers                                         | Linked risks |
| ---------------------------------- | ---------------------------------------------- | ------------ |
| PLF-AC-001, PLF-AC-005             | Source classes and local-path separation       | R-015, R-022 |
| PLF-AC-002, PLF-AC-003             | Constraint grammar and resolver convergence    | R-015        |
| PLF-AC-004                         | Prerelease and yank lifecycle                  | R-015        |
| PLF-AC-006, PLF-AC-007             | Registry boundaries and bundled isolation      | R-015, R-022 |
| PLF-AC-008, PLF-AC-009, PLF-AC-010 | Key directory, rotation, revocation, freshness | R-015, R-022 |

Normative floor mapping: P0-AC-027 (no install execution) is preserved by the
resolver producing only data and the activation transaction never executing
package code; P0-AC-028 is extended by PL-AC-001 and PLF-AC-001; P0-AC-029 is
extended by PL-AC-006 through PL-AC-008 and PLF-AC-007/010; P0-AC-030 is
extended by PLF-AC-004 capability symmetry. Native payload rejection (R-017)
still applies at fetch framing and store commit and is owned by P0-AC-018.

## Security review notes

This accepted contract strengthens the supply-chain posture without touching any P0
guarantee: the resolver adds determinism and one-version convergence so that
diamond conflicts are visible rather than silently doubled; prerelease opt-in
and yank advisory prevent opportunistic selection of unstable or withdrawn
versions while preserving reproducibility for locked yanked restores; the
registry is explicitly untrusted for integrity and freshness, with the client
as the verifier for H-A, H-B, capability diff, and signatures; bundled
generations are isolated from registry mutations; the key directory makes
enrollment, rotation, and revocation explicit, monotonic, and freshness-bound
so that freeze and downgrade attacks that serve old validly signed data are
rejected via snapshot version and expiry checks. Residual accepted exposures:
first-contact compromise under V-B TOFU for Git sources, legitimate-key-holder
misbehavior under all options, and offline staleness windows when a client
cannot refresh a snapshot. These residuals belong to design follow-up, not to
implementation shortcuts. Real signature verification remains draft per crate
docs; the lifecycle and integrity model is accepted as normative.

Reviewer guidance: verify that no option above is readable as permitting
install-time execution, silent capability growth, checksum or H-B skipping for
any source class, non-transactional activation, silent downgrade to an older
signed index, or promotion of a local-path package to registry provenance
without a full chain. Any such reading is a defect in this document.

## Open items remaining

The following items were open at proposal and are now dispositioned upon
acceptance on 2026-08-28. Acceptance of this RFC closes
[OQ-022](../decisions/open-questions.md), [OQ-026](../decisions/open-questions.md),
[OQ-027](../decisions/open-questions.md), [OQ-028](../decisions/open-questions.md),
and [OQ-029](../decisions/open-questions.md) at the design level; residual items
below are tracked as follow-up work with no remaining closure blocker unless
review decides otherwise:

- Exact manifest and lockfile file names and directory layout beyond their
  canonical digests (H-B specification) and default retention N and byte
  budget with `clean` or `doctor` interaction where they touch trust state.
  These are noted in package-lifecycle open items and carried here.
- Whether `*` wildcard or `||` disjunction ever enters the constraint grammar;
  this RFC keeps the grammar closed and denies both, deferring them to a
  future ADR only if user research demonstrates need without harming
  determinism.
- The exact registry HTTP API and index serialization (JSON, TOML, or custom)
  and the exact key-directory wire format; only their security properties
  (signatures, monotonic version, timestamp, expiry) are contracted here.
- The concrete overlap window for key rotation (candidate 7 days) and snapshot
  lifetime (candidate 24 hours) pending measurement of refresh cost and offline
  tolerance; the contracts above make them tunable only by reviewed change
  with `just check` and `cargo check` evidence.
- Whether bundled packages are ever addressable via registry version
  constraints or always via generation selection; this RFC keeps them
  isolated and selects them by generation digest.
- Tooling to generate the canonical manifest encoding from the Rust schema
  or vice versa, so that H-B determinism is mechanically enforced in CI.

Closes OQ-022, OQ-026, OQ-027, OQ-028, OQ-029: this RFC closes those open questions
at the design level; the register rows are updated per the open-question register
rules. The lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-28) -> normative`.

## Acceptance criteria

This RFC is accepted on 2026-08-28 and closes
[OQ-022](../decisions/open-questions.md), [OQ-026](../decisions/open-questions.md),
[OQ-027](../decisions/open-questions.md), [OQ-028](../decisions/open-questions.md),
and [OQ-029](../decisions/open-questions.md). The following criteria were satisfied
per the [open-question register](../decisions/open-questions.md) rules:

1. The prose and every identifier in the OQ-022 and OQ-026 through OQ-029 rows of
   [open-questions.md](../decisions/open-questions.md) have independent category-owner,
   docs-curator, and security-reviewer sign-off, including source-class provenance
   (H-A/H-B/H-C), closed constraint grammar and single-version convergence, prerelease
   opt-in and yank advisory `yanked (locked)`, registry attestation boundary and
   bundled isolation, and key-directory freshness/rotation/revocation.
2. Affected documents were synchronized in the same change: this RFC is `accepted`
   frontmatter and [Package Lifecycle RFC](package-lifecycle-rfc.md),
   [Decision Register](../decisions/index.md), [Specifications](../specifications/README.md),
   [P0 review checklist](../reviews/p0-review-checklist.md), and [README](../../README.md)
   reference the accepted contract rather than the draft;
   [open-questions.md](../decisions/open-questions.md) moves OQ-022, OQ-026, OQ-027, OQ-028,
   and OQ-029 from `Draft` to `Accepted` per the close rule.
3. No element weakens a normative P0 gate; any discovered conflict returns the
   conflicting clause to revision rather than downgrading the gate.
4. Verification gates have at least one headless conformance harness per section
   (provenance, grammar determinism, convergence, yank/prerelease, local-path drift,
   registry attestation, bundled isolation, key enrollment/rotation/revocation/freshness,
   downgrade resistance) with deterministic evidence, mirroring the harness style in
   `bitty-plugin-host` and `bitty-lua`.

## P0 Review Sign-off

> P0 review per CTX-0071 tracks acceptance of OQ-022, OQ-026, OQ-027, OQ-028, and OQ-029
> via this RFC. Frontmatter is `accepted` and
> [open-questions.md](../decisions/open-questions.md) is updated per the close rule.
> This section records passing sign-off and closes those open questions.

| Role                           | Reviewer           | Verdict | Evidence / scope                                                                                                                                                                 | Date       |
| ------------------------------ | ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| security-auditor               | `bitty-security`   | pass    | R-015, R-016, R-017, R-022, T-12, invariants 7, 8, P0-AC-027 through P0-AC-030, resolver convergence, yank/prerelease, registry attestation, key revocation/freshness 24h/expiry | 2026-08-28 |
| category-owner (extensibility) | `bitty-architect`  | pass    | source-class provenance H-A/H-B/H-C, closed constraint grammar, single-version convergence, prerelease opt-in, yank advisory `yanked (locked)`                                   | 2026-08-28 |
| category-owner (security)      | `bitty-experience` | pass    | registry attestation boundary, bundled versus registry generation isolation, key directory enrollment/rotation/revocation/freshness                                              | 2026-08-28 |
| docs-curator                   | `bitty-curator`    | pass    | Frontmatter `accepted`, taxonomy, links to supply-chain controls and H-A/H-B binding, English-only, decision-register sync                                                       | 2026-08-28 |

As of 2026-08-28, the resolver, lifecycle, registry, and key-directory contracts remain
design contracts per [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md)
and the [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md); crate
presence does not imply shipped behavior.

## References

- [Package management](../extensibility/package-management.md) — candidate workflow and normative supply-chain constraints this RFC concretizes.
- [Package Lifecycle RFC](package-lifecycle-rfc.md) — accepted lifecycle and integrity model for OQ-021 that this RFC extends.
- [Security overview](../security/overview.md), [Threat model](../security/threat-model.md), and [P0 acceptance criteria](../security/p0-acceptance-criteria.md) — normative supply-chain floor.
- [Decision register](../decisions/index.md) and [Open-question register](../decisions/open-questions.md) — acceptance and closure records.
- [P0 review checklist](../reviews/p0-review-checklist.md) — P0 sign-off for this RFC.
