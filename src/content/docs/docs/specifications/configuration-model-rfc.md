---
title: Configuration Model RFC
description: Defines the accepted configuration pipeline, layer and merge contracts, reload classes, and project-trust mechanics for OQ-010.
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 15
---

# Configuration Model RFC

## Status

Accepted on 2026-08-27 by the project initiator. This RFC defines the accepted
configuration model; it does not claim shipped, stable, or compatibility-guaranteed
behavior. Experimental implementation may exist as review evidence but carries no
compatibility promise beyond the accepted contract. It closes open question
[OQ-010](../decisions/open-questions.md) at the design level.

Accepted P1 pipeline for v1 (retained from Wave-C review evidence): Candidate A
(two-stage declarative ConfigPlan pipeline
`Lua -> ConfigPlan -> typed validation -> merge -> diff -> reconcile`) is the
accepted v1 pipeline; Candidate C (bounded imperative overlay) is deferred to a
future Plugin/runtime overlay RFC as future work. Candidate B remains the
rejected baseline. This note was candidate-winner evidence before acceptance and
is now the accepted contract.

It targets OQ-010; it depends on the runtime and module-resolution contract
accepted in the [Lua Runtime RFC](lua-runtime-rfc.md) (OQ-009), and it feeds
OQ-011/OQ-012 (plugin-facing configuration surfaces), OQ-017 (CLI grammar for
`bitty config`/`bitty paths` commands), OQ-021/OQ-022 (package manifest and lock
coexistence), and budgets PB-1/PB-2 in the
[Performance Budget RFC](performance-budget-rfc.md).

## Problem statement

OQ-010 asks: _are declarative `ConfigPlan` generation and Rust reconciliation
adopted, and how do XDG layers, profiles, merge rules, reload, and project
trust work?_ The accepted direction ([DIR-003](../decisions/index.md)) fixes
Lua as the primary configuration language; the lifecycle, layer stack, merge
rules, profiles, and trust behavior were recorded as candidate contracts in
[Lua and XDG configuration](../configuration/lua-and-xdg.md) and are now
adopted by this RFC, which defines failure semantics and reload classification.

Normative sources this specification must not weaken:

- [Security overview](../security/overview.md): user `init.lua` is trusted code
  evaluated in a Config VM toward a validated plan; system/distribution
  configuration is trusted only after source verification; project
  configuration is untrusted; `bitty --safe` must always start with minimal
  built-in configuration.
- [Threat model](../security/threat-model.md): T-08 (entering a cloned
  repository must never execute its Lua without declarative-only content or
  explicit path-and-hash consent), with risks R-009, R-010, and R-020 in the
  [risk register](../security/risk-register.md).
- [Core boundaries](../architecture/core-boundaries.md): security policy and
  canonical terminal state are core-owned; configuration can parametrize
  policy within bounds the schema declares, never bypass it.

Out of scope: which Lua VM executes the configuration (OQ-009), package
manifest/lock file formats (OQ-021/OQ-022), plugin capability grants
(OQ-012), and concrete CLI flag grammar (OQ-017).

## Pipeline candidates

### Candidate A: two-stage declarative plan with Rust reconciliation (accepted v1 pipeline)

Configuration modules evaluate to plain data; Rust owns everything after that:
schema validation, layer merge, diffing, reconciliation into live state, and
reload. The pipeline is the one sketched in the existing topic document:

```text
Lua -> ConfigPlan -> typed validation -> merge -> diff -> reconcile
```

Accepted decision: Candidate A is the accepted v1 pipeline. This selection was
recorded as the Wave-C P1 candidate winner for prototype review evidence and
is now the accepted contract.

Trade-offs:

- Pro: the whole effective configuration is inspectable and diffable before
  any effect exists — enabling offline `config check`, `config show --source`
  attribution, and deterministic conflict reporting instead of load-order
  accidents.
- Pro: evaluation is side-effect-free by construction, so a failed or hostile
  module cannot half-mutate a running terminal; recovery reduces to "keep the
  last good plan", which is exactly what R-009 needs.
- Pro: layers, profiles, and distributions compose as data with declared merge
  semantics, making distribution composition (an accepted direction) testable
  without executing third-party code at compose time.
- Con: expressiveness ceiling — values must resolve to data at evaluation
  time; genuinely dynamic behavior needs a separate runtime path (this is why
  Candidate C was considered and is now deferred).
- Con: dual representation cost: the typed Rust schema and the documented Lua
  shape can drift; one of them must be generated or cross-checked in CI, and
  this RFC leaves that tooling choice open.
- Con: migration friction for authors expecting imperative mutation idioms
  from other editors; starter configurations and diagnostics must teach the
  data style.

### Candidate B: imperative live configuration

Configuration runs against live settings objects at load time (the model
familiar from other editors): each statement mutates running state, reload
re-executes the entry point.

Trade-offs:

- Pro: maximal authoring flexibility and the simplest mental model during a
  single load; no plan/validation indirection.
- Con: errors mid-file leave partially applied state; validation collapses
  into execution timing; there is no meaningful diff or source attribution
  without extra bookkeeping the model does not naturally produce.
- Con: layering becomes execution order — system defaults, distributions, and
  user overrides race by load sequence rather than declared precedence,
  weakening the non-overridable-policy control the security baseline requires.
- Con: reload means blind re-execution against mutated state, so R-009
  recovery guarantees get much harder to prove.
- Review note: rejected unless review accepts the recovery and attribution
  costs; recorded here because it is the incumbent idiom users know.

### Candidate C: hybrid — declarative plan plus bounded imperative overlay (deferred to Plugin/runtime overlay RFC)

Candidate A for all static configuration, plus a narrow runtime API through
which scripts may adjust presentation-level settings on events after startup.

Deferred decision: Candidate C is deferred to a future Plugin/runtime overlay
RFC as future work and is not part of v1. The overlay direction remains a
candidate for later review; v1 adopts Candidate A only. This deferral was
recorded as the Wave-C P1 decision and is retained upon acceptance.

Trade-offs:

- Pro: preserves every Candidate A guarantee for loading, merging, inspection,
  and recovery while acknowledging that some behaviors (event-driven tweaks)
  are awkward as pure data.
- Pro: matches the existing topic document's note that an imperative API may
  exist for runtime behaviors without being the configuration model.
- Con: two surfaces to document and test; the boundary rule ("overlay writes
  never feed back into merged plan values and never touch security-relevant
  fields") must be enforced and fuzz-covered, otherwise Candidate B's problems
  leak back in.
- Con: scope creep risk: each new overlay capability reopens the question of
  which fields are presentation-only.

Candidate A is the accepted v1 pipeline and Candidate C is deferred; Candidate B
remains the rejected baseline. Review of the future overlay RFC will decide
whether any bounded overlay enters after v1.

## Layers, merge, and attribution

Status: **accepted contract** defining the layer stack and precedence in
[Lua and XDG configuration](../configuration/lua-and-xdg.md) (core defaults →
system → distribution → profile → user → trusted local override → CLI), with
the following contract obligations; the authoritative enumeration stays in that
document and this RFC binds its semantics:

1. Every schema field declares exactly one merge class (scalar replace,
   schema-guided deep merge, set-by-identifier, or explicit list policy);
   undeclared fields fail validation rather than merging implicitly.
2. Merge conflicts are computed, reported with both sources' file locations,
   and resolved only by declared precedence — never silently by load order.
3. Source attribution survives merging so every effective value answers
   "which file, which layer"; this is a hard requirement for `config show
--source` being truthful (CLI surface owned by OQ-017).
4. System policy entries marked non-overridable reject overriding plans at
   validation with a dedicated diagnostic class; they are distinct from system
   defaults, per the trust table in the [security overview](../security/overview.md).
5. Profile composition (`extends`) resolves single-parent chains with cycle
   detection; multiple inheritance remains an open item.

## Reload classification

Status: **accepted framework**, with the per-field table deferred until an
implementation inventory exists.

Every schema change from a reloaded plan lands in exactly one class:

| Class             | Meaning                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| Live-reconcilable | Applied by diff-and-reconcile to running instances without restart         |
| Restart-required  | Accepted and persisted, but effective after the next process start         |
| Rejected          | Validation failure; previous good plan remains active, diagnostics emitted |

Contract obligations: the classification is declared by the schema (never
inferred at runtime); a reload containing any restart-required change reports
that fact up front; reload reuses the same validation/merge path as startup so
no divergent second parser exists. Whether module caches clear between reloads
is shared with the module-resolution rules in the
[Lua Runtime RFC](lua-runtime-rfc.md) (OQ-009, accepted 2026-08-27; GC/budget tuning remains Open under OQ-032).

## Project trust

Status: **accepted mechanics**, implementing the normative T-08 defense, not
reopening it.

1. Project configuration is declarative-data-only; project-scope Lua execution
   is not a configuration-model feature. If a `.bitty.lua`-style file is ever
   honored, its content is data validated against a restricted project schema.
2. Consent is bound to canonical path plus content hash; any content change
   invalidates prior approval (normative already — this RFC inherits it).
3. Consent lifecycle per untrusted project config: ask once, ask
   always-on-entry, or deny, with deny as the default when origin detection is
   not positively local (R-020's restrictive `Unknown` rule).
4. Open mechanics left to follow-up: trust database location and format,
   invalidation on directory rename/move, expiry or review cadence for stored
   grants, and the exact prompt UX. None of these may weaken the hash binding.

## Failure and safe-mode interaction

On first start with missing or broken configuration, Bitty proceeds with the
minimal built-in configuration and reports diagnostics; on later failures it
retains the last good plan. `bitty --safe` remains an unconditional override
that skips all external configuration and plugins regardless of configuration
health (R-009). These behaviors are obligations of the accepted pipeline;
Candidate B would have to reprove them if ever reconsidered.

## Security review notes

The declarative-plan direction strengthens the P0 posture: side-effect-free
evaluation keeps project and distribution content inert until trust decisions
land (T-08/R-010); last-good-plan retention and the built-in fallback give
R-009 a testable recovery path; attribution and conflict reporting make silent
policy override visible instead of deniable. Any future overlay API (deferred
Candidate C) must ship negative tests proving overlay writes cannot reach
security-relevant or policy-owned fields, if that overlay RFC is later accepted.
No control here downgrades the normative baseline; thresholds and enforcement
evidence remain with the security corpus.

## Open items remaining under OQ-010

The following items were open at proposal and are now dispositioned upon
acceptance on 2026-08-27. Acceptance of this RFC closes OQ-010 at the design
level; residual items below are tracked as follow-up work with no remaining
OQ-010 closure blocker unless review decides otherwise:

- Resolved by this RFC upon acceptance: adoption of the declarative plan with
  Rust reconciliation (Candidate A accepted for v1, with Candidate C explicitly
  deferred to a future Plugin/runtime overlay RFC), layer stack and precedence,
  merge-class contract and attribution, reload classification framework, failure
  and safe-mode interaction, and project-trust mechanics for declarative-only
  project configuration with hash-bound consent.
- Migrated or deferred (remain open as follow-up work): Plugin/runtime overlay
  RFC defining whether any bounded imperative overlay exists after v1 (Candidate
  C future work), schema ownership tooling for typed Rust schema and Lua shape
  sync, authoritative home for the enumerated field list and merge-class table
  once the schema stabilizes, per field reload classification and minimum
  restart-required set, trust database location/grant expiry/review/rename
  invalidation/prompt UX for project configuration, multiple-parent profile
  inheritance if adopted, coexistence rules between the configuration tree and
  package manifest/lock names (deferred to OQ-021/OQ-022), and native
  macOS/Windows directory mappings feeding the semantic path set (owned by
  platform follow-ups).

Closes OQ-010: this RFC closes OQ-010 at the design level; the register row is
updated per the open-question register rules. Candidate A is the accepted v1
pipeline and Candidate C is deferred, retained from the Wave-C P1 winner note
without remaining OQ-010 scope.
