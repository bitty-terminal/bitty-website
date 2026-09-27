---
title: BiDi Scope Decision
description: Draft decision record for the M1-21 bidi/RTL question - recommend deferral of full UAX 9 visual reorder with the bounded paragraph-split mechanics recorded and a minimal term-state split helper as evidence
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 58
---

# BiDi Scope Decision

> Status: **draft decision record** — a recorded recommendation, not an
> accepted contract. It addresses the M1-21 question (backlog item `M1-21`,
> [bitty#1147](https://github.com/bitty-terminal/bitty/issues/1147)) and the
> bidi-reorder question `OQ-091`, which stays **Open**. It changes no
> accepted document, closes no open question, and weakens no normative
> security control. The accepted
> [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
> row for `OQ-091`, the candidate
> [Text and Rendering RFC](text-rendering-rfc.md) BiDi section, and the
> [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) row remain
> authoritative. `OQ-091` closes only through an owner-accepted decision
> artifact, never through this record alone.

## Purpose

This record answers the M1-21 question — UAX #9 presentation reorder,
paragraph extent across soft wraps, and the `MAX_BIDI_PARAGRAPH_CELLS` split
policy — at the recommendation level, and states the exact path that would
close `OQ-091`. A minimal term-state split helper ships alongside as review
evidence; it implements the bounded split mechanics only, decides no open
point, and claims no reorder support.

In scope: whether visual reorder ships in M1, the paragraph-split mechanics
bound, and what the evidence helper does and does not prove. Out of scope:
the shaper-crate choice (`OQ-092`), EAW tables and grapheme-to-cell mapping
(`OQ-090`), selection mapping across reordered runs (`OQ-099`), and the
UAX #9 algorithm itself — this record cites those contracts and redefines
none of them.

## Source identity

| Source                                                                                                            | Role                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) | `OQ-091` owner-pending; the closure authority for this question                                                     |
| [Text and Rendering RFC](text-rendering-rfc.md)                                                                   | Candidate BiDi policy: logical LTR storage, per-paragraph renderer reorder, `MAX_BIDI_PARAGRAPH_CELLS = 4096` split |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                 | P-row "BiDi / RTL shaping": `missing`; candidate scope only                                                         |
| [Core and Plugin Boundaries](../architecture/core-boundaries.md)                                                  | Bidi reorder is Core-owned (changes Terminal Truth invariants); plugins add presentation only above the seam        |

Implementation evidence, read-only from `bitty` `972818d`
(2026-09-22):

- No UAX #9 visual reorder exists: no reorder map, no `BidiLevel` in
  `Snapshot`, no visual-order placement in the renderer. The gap-analysis
  `missing` claim still holds at this pin.
- Adjacent, non-reorder handling does exist and is unchanged by this
  record: bidi/directional controls are treated as zero-width at the width
  layer (`crates/bitty-term-state/src/cell.rs`, `src/grapheme.rs`) and
  flagged by paste-safety inspection (`crates/bitty-runtime/src/paste.rs`
  `has_bidi`), which is Trojan-Source defense, not shaping.
- Segmentation foundation exists (UAX #29 segmenter, UAX width tables,
  `CTX-0666`); the reorder layer above it does not.
- Evidence helper (this task, `CTX-0677`): `crates/bitty-term-state/src/bidi.rs`
  implements only the bounded split mechanics — `MAX_BIDI_PARAGRAPH_CELLS`
  and `bidi_paragraph_splits` — with unit tests. No reorder algorithm, no
  `Snapshot` change, no renderer consumption.

## Disposition

### Decision space

1. **Adopt full visual reorder in M1.** Implement per-paragraph UAX #9
   reorder in the renderer with the inverse hit-test map and the `OQ-099`
   selection contract.
2. **Defer reorder; record the split mechanics with a minimal evidence
   helper (recommended).** No renderer reorder in M1; the bound, the
   split-at-cell-boundaries rule, and the split-neutral-`L` rule are
   recorded here and pinned by the helper's tests. Paragraph extent across
   soft wraps and scrollback stays open under `OQ-091`.
3. **Refuse bidi.** Record that Bitty will never reorder RTL paragraphs.

### Recommended disposition

**Recommend option 2.** The candidate RFC policy is a sound design, but two
of the three M1-21 scope points are undecided: paragraph extent across soft
wraps/scrollback (RFC Open point 4) and, downstream, the `OQ-099` selection
mapping that any reorder needs before cursor and copy stay exact. Adopting
the reorder now would present Arabic/Hebrew paragraphs whose selection,
search, and copy semantics are still candidate — a
presentation/terminal-truth divergence risk. Option 3 overreaches: WezTerm
ships a bidi toggle and RTL text is ordinary user content, not an
attack-only feature; refusal has no stance basis.

### Rationale

1. **The open point is real, not procedural.** Splitting a 6000-cell logical
   paragraph at cell boundaries changes visual runs; whether the paragraph
   even extends across soft wraps changes which cells are inputs. Both
   precede any correct implementation, and both are owner-pending.
2. **Reorder without the selection map is a correctness hazard.** A ligature
   spans cells; a reordered paragraph spans the line. The `OQ-099` inverse
   map is the guardrail for both, and it is open — the ligature record
   refused on the same ground.
3. **The bound is the scope-invariant part.** Whatever extent decision the
   owner takes, paragraphs are bounded at 4096 cells and split at cell
   boundaries with neutrals resolved as `L`; that is what the evidence
   helper pins, and it survives either extent outcome.
4. **No M1 gate needs reorder.** The M1 gates are VT-correctness gates;
   logical-order storage already satisfies them.

### What changes if adopted

- **As recommended (deferral + helper):** the helper only. Terminal Truth
  is untouched: storage stays logical, no `Action` and no `State`
  transition reorders, no renderer consumption. The authoritative
  resolution is an owner-accepted decision artifact (Text RFC revision)
  that fixes paragraph extent across soft wraps/scrollback, confirms the
  split policy, and closes `OQ-091` per the path below. The gap-analysis
  row would move from `missing` to `missing; deferred with split mechanics
recorded`.
- **If instead adopted:** the same owner-accepted artifact pins the extent
  rule, the shaper-independent level/run contract, the inverse hit-test
  map with `OQ-099`, per-frame `O(N)`-in-damage budgets, and the
  scrollback interaction — with renderer tests and the PB-4/PB-6 text
  sub-budget evidence before any `Verified` claim.

### Security and bounds

- Reorder is a render-cold-path stage when it lands; it never runs on the
  VT or state hot path, so no untrusted PTY byte reaches ordering logic in
  the parser loop.
- Bidi controls arriving through PTY stay zero-width formatting at the
  width layer and paste-flagged at inspection; the helper consumes cell
  counts only, never scalar values, so control smuggling cannot influence
  splits.
- The helper is total and allocation-bounded: chunk ranges over
  `[0, total)`, each at most the bound, with degenerate inputs saturating
  to a single chunk — no panic, no unbounded growth.
- This record decides no shaping path and grants no plugin capability;
  visual reordering stays inside the renderer presentation layer
  (security invariant 3).

## Verification backlog

- The recommended disposition does not close M1-21 on its own: the issue
  stays open (Related, not Closed) until the owner-accepted Text RFC
  revision lands, reviewed by the architecture category owner per the
  [documentation workflow](../docs/development/documentation-workflow.md).
  That revision must fix paragraph extent across soft wraps and
  scrollback (RFC Open point 4) to close `OQ-091`.
- The evidence helper is `Implemented` (experimental), not `Verified`: its
  unit tests pin the split mechanics; renderer consumption, the inverse
  map, and budget evidence belong to the future adoption task, which
  starts from a new scoped task — not from this record.
