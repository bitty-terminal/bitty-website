---
title: Prototype-to-Core promotion checklist
description: Draft hard-gate checklist for promoting workflow prototypes into the AI Core, derived from landed practice
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 58
---

# Prototype-to-Core promotion checklist

> Status: **draft**. This document is a candidate checklist for owner decision
> DEC-0005 (AIQ-32 facet (a)): the hard gates a workflow prototype must pass
> before landing in the `bitty-ai` Core. It proposes no accepted process,
> authorizes no shipped behavior, closes no Artificial Intelligence Question
> entry, mints no AIQ or OQ identifier, introduces no product code, and changes
> no accepted document. The accepted
> [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and the normative security corpus
> override any statement here. Every merge anchor below is read-only survey
> evidence at `bitty-ai` `main`; no file in the `bitty-ai` repository was
> modified.

## Purpose and scope

This checklist answers the AIQ-32 facet recorded in
[AI Unresolved Questions](../product/ai-unresolved-questions.md): what
acceptance criteria a promotion-review owner applies before a prototype
becomes Core mechanism. It
covers the workflow-to-Core path only: experimental workflow code proved
outside the Core, then landed as tested mechanism inside
`crates/bitty-ai-runtime`. The sibling review facet (who reviews, how
acceptance is recorded) and the Core-versus-Lua enforcement facet stay with
AIQ-32 remainder and AIQ-31 (see the [HostBoundary trait and lint-gate
design](host-boundary-trait-design.md)); this document gates process, never
semantics.

Every gate below is derived from landed practice across AI-0076 through
AI-0097. Each gate names the precedent merges that prove it is passable, with
`bitty-ai` `main` short SHAs a reviewer can re-verify read-only.

## The gates

A promotion lands only when every gate below holds with cited evidence. A
single failing gate stops the promotion; the owner may still refuse a
promotion that passes all gates (see
[Acceptance criteria](#acceptance-criteria)).

### 1. TDD red/green evidence

The promotion task records a red test before the green run: the new test
fails against the base revision, then passes with the change. Precedent:
AI-0095 landed the fingerprint mechanism with TDD red recorded as E0432
(compile failure against the missing module) and 9/9 green in
`input_fingerprint.rs` at merge `8c5418b`; AI-0084's alias-proof test
(`embedded_marker_in_stable_text_must_not_alias_keys`, merge `2b984c4`)
pre-fails against the merged AI-0082 base by producing identical keys for
stable texts that differ past an embedded literal, with the length-aware
walk as the fix; AI-0097 landed the
minimal-envelope fallback with TDD red recorded as E0432 and 14 green tests
in `fallback_envelope.rs` at merge `97d3125`; AI-0092 recorded a red test
pre-failing against base `7f40846` before the fencing seam rule landed at
`d4d0738`. The red evidence must name the base revision and the failure mode
(compile error, assertion failure, or denial-behavior mismatch), never just
"tests were written first".

### 2. Tests-only or minimal diff

The diff is tests-only, or its production surface is the smallest change the
tests pin. Tests-only precedent: AI-0076 (`agent_turn_semantics.rs` only,
`59983d7`), AI-0078 (`cache_invalidation.rs` only, `ccb8b91`), AI-0083
(`accounting_bounds.rs` only, `a8d3422`), AI-0086 (`batch_evidence.rs` only,
`cdf831e`), AI-0093 (`subscription_bounds.rs` only, `960561b`), AI-0094
(`granularity_denial.rs` only, `5a968a7`), AI-0096 (`mcp_fail_closed.rs`
only, `e7cbe69`). Minimal-diff precedent: AI-0077 (8-line production touch
plus `result_schema_disclosure.rs`, `3f364db`), AI-0084 (length-aware
boundary walk in `cache_key.rs` plus one alias-proof test, `2b984c4`),
AI-0090 (`schema_digest` as the only production addition plus
`schema_invalidation.rs`, `a4cc1e6`), AI-0095 (new `fingerprint.rs` module
plus `input_fingerprint.rs`, `8c5418b`), AI-0097 (new `fallback.rs` module
plus `fallback_envelope.rs`, `97d3125`). A promotion that refactors
unrelated Core code to "make room" fails this gate.

### 3. Deterministic doubles, no wall clock, threads, network, or randomness

Tests run on scripted doubles with caller-supplied time: `FakeProvider` as
the deterministic model peer and `FakeToolExecutor` as the deterministic
tool peer, fixed `NOW_MS` constants (for example
`const NOW_MS: u64 = 1_700_000_000_000` in the turn-semantics and accounting
suites), and inline FNV-1a-64 hashing (never `DefaultHasher` or
`RandomState`, which are randomized per process). New hashing must mirror
the documented `cache_key.rs` precedent (offset basis
`0xcbf29ce484222325`, prime `0x0100_0000_01b3`, `wrapping_mul`). Any test
that reads the system clock, spawns a thread, touches the network or
filesystem, or samples randomness fails this gate; time and bytes are
caller-supplied inputs, stated in the module docs ("Std only. No network,
filesystem, clock, threads, or secrets").

### 4. Static assert messages

Assertion messages carry no interpolated key material, digests, or secret
shapes. Precedent: the AI-0082 merge body (`fdb37c5`) records stopping
interpolation of key material into assert messages, the CodeQL
`rust/cleartext-logging` lesson applied to test output. Messages state the
invariant ("provider variation must change the key"), never the value that
proves it. A promotion whose test output would leak key bytes, digests, or
model identifiers on failure fails this gate.

### 5. Typed errors and house style for any production surface

Any production code the promotion adds follows the Core house style:
fail-closed typed errors with `Display` plus `std::error::Error` impls,
`#[must_use]` on constructors and pure predicates, `# Errors` docs on
fallible constructors, `#![deny(unsafe_code)]` (no `unsafe` anywhere), and
std-only dependencies. Precedent: `CacheKeyError` (`cache_key.rs`,
AI-0082/AI-0084), `FingerprintError` with `MissingInput` and
`UnknownComponent` arms plus disable-on-unknown construction (`fingerprint.rs`,
AI-0095), `FallbackError` with four variants over bounded `String` fields
(`fallback.rs`, AI-0097). A promotion that returns bare strings, panics on
invalid input, or adds a dependency fails this gate.

### 6. Independent read-only review with APPROVE

A reviewer who is not the implementer inspects the diff read-only and
records APPROVE with a review note id before merge. The reviewer identity is
registered before dispatch, and the review note id is cited in the merge
evidence. Precedent: AI-0092 APPROVE (PX-0412), AI-0093 APPROVE (PX-0418),
AI-0094 APPROVE (PX-0419), AI-0095 APPROVE (PX-0420), AI-0096 APPROVE
(PX-0421), AI-0097 APPROVE (PX-0427). Self-review, implementer-written
"review notes", and post-merge review fail this gate.

### 7. Full gates green

Before merge the promotion passes the owning repository's full gate set with
zero issues: `cargo test --workspace --all-targets --locked`, `cargo fmt
--all -- --check`, `cargo clippy --workspace --all-targets --locked -- -D
warnings`, and `git diff --check`. Partial runs (a single test target, a
single crate) are progress signal, not gate evidence. A promotion with any
warning, formatting delta, or whitespace error fails this gate.

### 8. Issue and pull-request hygiene

The promotion carries a linked GitHub Issue and pull request with labels
(`feat`/`fix`/`docs`/`chore` plus priority plus `area:*`), the owning
milestone, and a `Closes #<issue>` line in the PR body; long bodies go
through a body file rather than inline text. The CarryCtx task description
carries the `Priority | Area | Labels | Milestone | RFC | Task` header and
names this checklist plus DEC-0005 as the acceptance bar (see [How to cite
this checklist](#how-to-cite-this-checklist)). A promotion with missing
labels, no milestone, no `Closes` link, or no task header fails this gate.

### 9. CI watch green, then snapshot closeout

After push, CI is watched to green before merge; merge is squash-only once
required checks pass. After merge, the commander publishes the CarryCtx
snapshot closeout: fast-forward the local `main` first, triple-verify the
refs, and confirm the snapshot manifest matches `main`. Precedent: snapshot
`ace7ec8` records `bitty-ai` `main` at `8c5418b` (AI-0095). A promotion
merged over red CI, or closed without a snapshot whose manifest matches the
merged `main`, fails this gate.

### 10. No AIQ status change unless separately authorized

Landing a promotion changes no AIQ or OQ entry by itself. Precedent: every
AI-0076 through AI-0097 merge narrowed evidence but left its register rows
at `needs-evidence` or `stay-open-narrowed`; AIQ-13 closure stayed a
separate owner-reviewed recommendation even with both key-scope merges
landed. A promotion task that claims an AIQ closure, mints an identifier,
or edits the register without a separately authorized closure task fails
this gate.

## How to cite this checklist

A promotion task cites this document plus DEC-0005 in its task description
in one paragraph: name the prototype and the Core seam it targets, state
that acceptance follows the Prototype-to-Core promotion checklist under
owner decision DEC-0005, list which gates carry pre-evidence already (red
test base, tests-only versus minimal-diff shape, review note id once
recorded), and name the separately authorized closure task if any AIQ
status change is intended (none by default). The citation points reviewers
at the gates; it never pre-claims they pass.

## Worked example: AI-0095 fingerprint chain end to end

AI-0095 (`test(cache): input-fingerprint completeness with
disable-on-unknown (#181)`) is the reference chain because every link is
pinned: the red test failed with E0432 against the base (no `fingerprint.rs`
module existed), then 9/9 tests passed in the new 295-line
`input_fingerprint.rs` over the new 177-line `fingerprint.rs` plus a
two-line `lib.rs` registration (minimal-diff, gate 2); doubles stayed
deterministic with caller-supplied inputs and inline FNV-1a-64 (gate 3);
assert messages carried no key material (gate 4); the production surface
added typed `FingerprintError` with `Display` plus `std::error::Error`,
`#[must_use]`, and `# Errors` docs under `#![deny(unsafe_code)]` (gate 5);
independent review gave APPROVE (PX-0420) by a different agent (gate 6);
full gates passed (gate 7); Issue and PR hygiene held with `Closes` (gate
8); CI watched green, PR #181 squash-merged to `bitty-ai` `main`
`8c5418b`, and snapshot `ace7ec8` closed out the task against that `main`
(gate 9); the AIQ-43 and AIQ-44 rows stayed `needs-evidence` with the merge
cited as evidence only (gate 10). A future promotion review can walk this
paragraph link by link and demand the same shape.

## Acceptance criteria

This document is a draft candidate checklist. It gates process, never
auto-accepts semantics: passing every gate is necessary but not sufficient,
and the owner may still refuse a promotion on semantic, security, or
priority grounds with no further justification owed to this text. It closes
no AIQ or OQ entry (AIQ-32 stays open, as do AIQ-31 and AIQ-33 through
AIQ-38 where referenced), and it mints no new identifier. Accepted documents
are explicitly unaffected: the [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) keeps
its normative framing, scope, lifecycle, and consent statements, and no
sibling draft disposition ([Execution ownership
R1](execution-ownership-r1.md), [Tool transport
R2](tool-transport-r2.md), [Provider plugin
boundary](../providers/provider-plugin-boundary.md), [HostBoundary trait and lint-gate
design](host-boundary-trait-design.md)) is revised by this document. The
`bitty-ai` implementation is surveyed read-only; nothing here describes that
slice as the complete proposed runtime.

## References

- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-32 and
  the AIQ-31 through AIQ-38 facets; no entry status changes here.
- [HostBoundary trait and lint-gate design](host-boundary-trait-design.md)
  (Draft): the AIQ-31 enforcement facet; review-time policy stays with
  AIQ-32 and is not claimed here.
- [Tool transport R2](tool-transport-r2.md) (Draft): unified authorization
  backend the checklist never mints policy for.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): normative IPC framing
  that overrides any statement here.
