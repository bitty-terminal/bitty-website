---
title: Ligature Decision
description: Draft decision record for the M1-22 ligature question - recommend recorded refusal pending the owner-accepted OQ-073 decision, with the adoption path and bounds
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 42
---

# Ligature Decision

> Status: **draft decision record** — a recorded recommendation, not an accepted
> contract. It addresses the M1-22 question (backlog item `M1-22`,
> [bitty#1148](https://github.com/bitty-terminal/bitty/issues/1148)) and the
> ligature question `OQ-073`, which stays **Open**. It changes no accepted
> document, closes no open question, and weakens no normative security control.
> The accepted
> [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
> row for `OQ-073`, the candidate
> [Text and Rendering RFC](text-rendering-rfc.md) shaping policy, and the
> [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) row remain
> authoritative. `OQ-073` closes only through an owner-accepted decision
> artifact, never through this record alone.

## Purpose

This record answers the M1-22 question — adopt ligatures or record an explicit
refusal — at the recommendation level, and states the exact path that would
close `OQ-073`. It exists so the absence of ligature code is a recorded Bitty
position rather than an inference from missing matches.

In scope: whether Bitty forms ligatures in the rendered grid, and if so through
which shaping path, fallback interaction, and bounds. Out of scope: the
`Text and Rendering RFC` candidate shaper adoption (`harfbuzz` versus `swash`),
kerning arithmetic, color emoji, variable fonts, and the selection/caret mapping
across shaped glyphs tracked by `OQ-099`; this record cites those contracts and
does not redefine them.

## Source identity

| Source                                                                                                                       | Role                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)            | `OQ-073` owner-pending; the closure authority for this question                                                 |
| [Text and Rendering RFC](text-rendering-rfc.md)                                                                              | Candidate contract; § Shaping defines the opt-in ligature/kerning policy and `MAX_LIGATURE_CONSUMES`            |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                            | P2 row "Ligatures": `missing, no decision`; registers `OQ-073`                                                  |
| [Rich Presentation RFC](rich-presentation-rfc.md)                                                                            | Accepted boundary: cursor and selection keep per-cluster granularity; presentation never changes terminal truth |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) (`OQ-099`) | Selection and hit-testing across a shaped cluster or ligature span stays open                                   |

Implementation evidence, read-only from `bitty` `972818d`
(2026-09-22, re-verified for CTX-0677):

- No `ligature` matches anywhere under `crates/`. No shaping run, feature-tag
  query extension, or font-feature config key exists.
- `DECSCUSR` cursor-shape handling and per-glyph fallback ship; shape rendering,
  full shaping, ligature/kerning policy, and color emoji remain candidate per the
  RFC's shipped-defaults note.
- No config key enables `liga`/`calt`; the RFC's `features` extension is
  candidate only.

## Disposition

### Decision space

1. **Adopt ligatures.** Form ligatures in a render-cold-path shaping run, under
   the candidate RFC policy: opt-in per style, `features` tags on the font
   query, up to `MAX_LIGATURE_CONSUMES = 4` scalars merged into one glyph whose
   advance spans the ligated clusters' combined cell width, placed at the
   leading cell's origin and clipped to the combined extent. Cursor, selection,
   and search keep per-cluster granularity; the ligated extent is presentation
   only and never changes terminal truth.
2. **Refuse ligatures.** Render each cell independently and record the refusal,
   matching the Alacritty precedent, and revisit only with demand evidence.

### Recommended disposition

**Recommend a recorded refusal for the current milestone, with the adoption
contract preserved as a candidate.** The ligature policy in the
[Text and Rendering RFC](text-rendering-rfc.md) is a defensible opt-in design,
but no demand evidence exists and no release gate depends on it; the honest
disposition is to record the refusal rather than leave it inferred from absent
code.

### Rationale

1. **No demand is demonstrated.** The
   [roadmap gap register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/roadmap/now-next-later.md)
   classifies ligatures as a differentiator to consider, not chase, and records
   that a refusal must be a recorded Bitty decision.
2. **Refusal is a legitimate terminal position.** Alacritty refuses ligatures as
   an explicit non-goal, so the refusal is a mainstream stance rather than a
   gap.
3. **Adoption has real correctness cost.** A ligature glyph spans multiple
   logical cells; keeping cursor accounting, selection, search, and copy exact
   requires the per-cluster mapping the RFC describes plus the `OQ-099`
   selection-mapping decision, which is itself open. Adopting before those
   mappings are accepted risks a presentation/terminal-truth divergence.
4. **The adoption design already exists.** If demand appears, the candidate RFC
   policy bounds the work, so refusal today does not discard the design.

### What changes if adopted

- **As recommended (refusal):** no runtime change. The authoritative resolution
  is an owner-accepted decision artifact that records the refusal in the
  [Text and Rendering RFC](text-rendering-rfc.md) and closes `OQ-073` per the
  path below. The [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)
  row would move from `missing, no decision` to `missing; refused`.
- **If instead adopted:** the same owner-accepted artifact pins the shaping path,
  the `features` query extension and its config key, the per-style default, and
  the `MAX_LIGATURE_CONSUMES` bound; a scoped implementation task then lands the
  shaping run, the cluster-mapping contract with `OQ-099`, and the rendering
  tests before any `Verified` claim.

### Security and bounds

- Shaping is a render-cold-path stage; it never runs on the VT or state hot
  path, so no untrusted PTY byte reaches a shaper in the parser loop.
- Adopted or not, cursor, selection, search, and copy stay per-cluster and
  logical; presentation never rewrites terminal state.
- Bounds if adopted: `MAX_LIGATURE_CONSUMES = 4`, bounded shaping runs
  (`MAX_SHAPING_RUN_SCALARS`, `MAX_SHAPED_GLYPHS_PER_RUN`), and per-frame work
  costed against the accepted performance budget.
- The candidate `features` query extension is font configuration data, not a new
  capability; it opens no file, device, or network path.

## Verification backlog

The exact path that closes `OQ-073`:

1. The architecture category owner accepts one decision artifact — a
   [Text and Rendering RFC](text-rendering-rfc.md) revision, or a shared
   governance ADR recorded in
   [bitty-docs](https://github.com/bitty-terminal/bitty-docs) — that states
   adopt-or-refuse with the shaping path and bounds.
2. The same change updates the `OQ-073` register row, the
   [Text and Rendering RFC](text-rendering-rfc.md), and the
   [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) row
   together, per the register close rule, and synchronizes `OQ-099` if selection
   mapping moves with it.
3. If adopted, a new scoped implementation task lands the shaping run and its
   tests; if refused, no code task is opened and the refusal is recorded.

Until step 1 lands, `OQ-073` and M1-22 stay Open; this record is the
recommendation input to that decision and must not be read as the decision.
