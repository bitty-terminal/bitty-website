---
title: Visual and Behavioral Regression Evidence (Candidate)
description: Candidate definition of visual and behavioral regression evidence for UI surfaces covering frame evidence scopes comparison rules and the promotion gates that consume it
category: specifications
audience: maintainer
document_type: specification
status: draft
website_publish: false
sidebar_order: 48
---

# Visual and Behavioral Regression Evidence (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. The corpus states repeatedly that a UI
> surface is not proven until frame or behavioral evidence exists, but no
> document defines what that evidence **is**: what is compared, at which scope,
> under which tolerances, and which promotions consume it. This record states a
> candidate definition so UI work has one evidence contract instead of ad-hoc
> captures. It accepts nothing and makes no implementation claim.

## Purpose and scope

Evidence discipline exists in several places: the gap analysis marks rows
`implemented-only (unwired)` rather than shipped; the acceptance ladder is
`Draft -> Experimental Implementation -> Accepted -> Verified -> Compatible`;
the release mechanics describe snapshot and soak practice; and the UI runtime
direction requires a headless-rasterizer path. What is missing is the
definition of an evidence artifact for UI surfaces: its scope, its storage, its
comparison rule, and the promotion gate it feeds.

In scope: the evidence artifact definition, scopes (leaf, workspace, window),
the comparison and tolerance rule, the relationship to headless and live
evidence, redaction and storage posture, and the gates that consume the
artifact.

Out of scope and owned elsewhere: the acceptance vocabulary and ladder (accepted
documentation workflow); DevTools trace, record/replay, and the debug protocol
(accepted, [DevTools RFC](devtools-rfc.md)); snapshot-source CI behavior
(repository policy); the text-rendering rasterizer's readiness
([Text and Rendering RFC](text-rendering-rfc.md)); performance budgets (accepted,
[Performance Budget RFC](performance-budget-rfc.md)).

## Normative sources this specification must not weaken

- [DevTools RFC](devtools-rfc.md) (accepted): trace, snapshot, record/replay
  are staged capabilities built on one instrumentation pipeline, with privacy
  and redaction defaults, written to user-only storage.
- [Performance Budget RFC](performance-budget-rfc.md) (accepted): frame budget
  and frame-on-demand; evidence capture must not add a periodic timer.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 7 (bounded inputs) and the privacy posture for captured artifacts.
- [Terminal State RFC](terminal-state-rfc.md) (accepted): what terminal truth is,
  so evidence never becomes truth.
- [Compatibility Milestone RFC](compatibility-milestone-rfc.md) (accepted):
  compatibility claims require evidence; a UI claim composes with it.

## Terminology

| Term                | Meaning in this document                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Frame evidence      | A deterministic rendering of one frame at a declared scope, produced headlessly from a declared scenario.      |
| Behavioral evidence | An ordered record of observable events (focus, layout, overlay, budget) for a declared scenario.               |
| Scenario            | A named, bounded input script plus its initial state description.                                              |
| Tolerance           | The declared comparison rule: exact bytes, or a stated per-pixel allowance for antialiasing and timing jitter. |
| Promotion gate      | The review step that consumes evidence before a status claim (for example `Experimental` to `Accepted`).       |

## Rules

1. **Evidence is declarative and reproducible.** A frame or behavioral artifact
   is produced from a scenario definition, not recorded by hand, so two runs on
   the same revision produce comparable artifacts.
2. **Scopes are explicit.** Evidence declares one of three scopes: `leaf`
   (one leaf rectangle), `workspace`, or `window`. A claim about a wider scope
   needs evidence at that scope or a composed artifact from its children.
3. **Tolerance is declared before comparison.** Exact-byte comparison is the
   default for text and geometry; a per-pixel allowance is permitted only where
   antialiasing or timing jitter makes exactness unachievable, and the allowance
   value is part of the artifact.
4. **Headless is the baseline; live is supplementary.** Headless frame evidence
   is the baseline because it is deterministic and CI-runnable. Live or soak
   evidence complements it for long-duration behavior; a live capture never
   substitutes for a missing headless baseline.
5. **Behavioral evidence uses the accepted event vocabulary.** Focus, layout,
   overlay, and budget events are recorded through the accepted instrumentation
   pipeline; no separate event channel is introduced.
6. **Evidence never becomes truth.** An artifact is a record, never a state
   source; nothing in the running system reads an artifact to decide behavior.
7. **Redaction and storage follow the accepted defaults.** Artifacts are written
   to user-only storage, redacted by default, and excluded from the public
   snapshot path unless a review explicitly clears them.
8. **Promotion gates consume evidence.** A UI surface status claim names the
   artifact that supports it: `Experimental Implementation` requires at least a
   behavioral artifact; `Verified` requires frame evidence at the claimed scope
   plus a behavioral artifact; `Compatible` additionally requires the
   compatibility milestone's own evidence.
9. **Evidence is bounded.** A scenario is bounded in input size and duration;
   capture creates no periodic timer and stays inside the accepted frame budget.
10. **A missing artifact is a stated gap.** A surface with no scenario records
    `Uncovered` rather than claiming coverage by narrative.

## Evidence matrix (candidate)

| Surface family      | Frame evidence scope       | Behavioral evidence                                        |
| ------------------- | -------------------------- | ---------------------------------------------------------- |
| Tiled leaf content  | `leaf`, exact for text     | Layout, focus, damage-to-present ordering                  |
| Chrome surfaces     | `window`, exact for chrome | Segment cadence, tab-order exclusion, no hot path          |
| Overlays            | `window`                   | Modal exclusivity, tier order, focus confinement           |
| Motion              | `leaf` or `window`         | Final-state equality across disabled/interrupted/completed |
| Scene-backed panels | `leaf`                     | Scene-to-paint path, accessibility projection              |
| Restore paths       | `window`                   | Rehydration-before-first-frame ordering                    |

## Security review

Evidence artifacts capture screen content, so the substantive concern is
privacy and redaction, not new authority. This record adds no capability; it
requires that artifacts follow the accepted user-only storage and redaction
defaults, that captures never enter the public snapshot path without review, and
that capture introduces no periodic timer or hot-path work. No `P0` criterion is
affected; a security reviewer is required if a future revision publishes
artifacts or adds a capture surface not covered by the accepted DevTools
contract.

## Verification plan

1. A test asserting two runs of one scenario on one revision produce comparable
   artifacts within the declared tolerance.
2. A test asserting behavioral evidence is emitted through the accepted
   instrumentation pipeline and creates no separate channel.
3. A test asserting capture adds no periodic timer and stays inside the frame
   budget.
4. A documentation-lint assertion that every `Verified` claim for a UI surface
   names an artifact and that every surface family in the matrix has either a
   scenario or an `Uncovered` marker.

## Alternatives considered

| Alternative                                       | Trade-off                                                                     | Disposition                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| Rely on manual screenshots as evidence            | Cheap to start; not reproducible and not comparable across revisions          | Rejected — reproducibility is the point              |
| Require live soak evidence as the gate            | Catches long-duration defects; not deterministic and not CI-runnable          | Rejected as the baseline; retained as supplementary  |
| Define evidence inside the DevTools RFC           | One place for instrumentation; mixes user-facing tooling with promotion gates | Rejected — the gates have a different owner          |
| Skip tolerance and require exact bytes everywhere | Strictest; fails on antialiasing and makes motion evidence unusable           | Rejected — declared tolerance is the honest contract |

## Affected contracts

| Contract                                                                    | Effect                                                                        |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [DevTools RFC](devtools-rfc.md) (accepted)                                  | Unchanged; evidence consumes its pipeline and redaction defaults              |
| [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) (draft)     | Its `implemented-only (unwired)` verdicts gain an evidence path to `shipped`  |
| [UI/UX Invariant Set (Candidate)](ui-ux-invariant-set-candidate.md) (draft) | Its `Uncovered` follow-ups gain a defined artifact form                       |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md) (candidate)          | U-1 headless-rasterizer direction gains an evidence contract                  |
| [Compatibility Milestone RFC](compatibility-milestone-rfc.md) (accepted)    | Unchanged; UI compatibility claims compose with its own evidence requirements |

## Open points

- The artifact file format and whether frames are stored as images, as
  structured paint lists, or both.
- The default tolerance values for text, chrome, and motion.
- Where scenarios live and how they are versioned with the code they exercise.
- Whether live soak evidence ever becomes promotable or stays supplementary.
- The scenario set required for the vertical slice.
- How evidence handles nondeterministic content (clock, cursor blink, async
  status) — freeze, inject, or mask.

## Acceptance criteria

1. A reviewer confirms the artifact definition is reproducible and that no rule
   conflicts with the accepted DevTools or performance contracts.
2. The evidence matrix matches the surface families named in the corpus.
3. Redaction and storage follow accepted defaults without exception.
4. Acceptance happens through the owner-pending UI Runtime RFC (U-9) or the
   DevTools RFC's successor, not by flipping this record's status.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes; the privacy requirements are restatements of accepted
defaults. The security review above records that disposition.

## References

- [DevTools RFC](devtools-rfc.md) — instrumentation pipeline, traces,
  snapshots, record/replay, redaction.
- [Performance Budget RFC](performance-budget-rfc.md) — frame budget and
  frame-on-demand.
- [Compatibility Milestone RFC](compatibility-milestone-rfc.md) — compatibility
  evidence requirements.
- [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) — verdict
  vocabulary this record feeds.
- [UI/UX Invariant Set (Candidate)](ui-ux-invariant-set-candidate.md) —
  coverage follow-ups that consume this evidence form.
