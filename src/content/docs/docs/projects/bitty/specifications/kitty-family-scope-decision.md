---
title: Kitty Family Scope Decision
description: Draft decision record for the M1-24 Kitty-family extension question - recommend deferral of OSC 22 pointer shapes, text sizing, and file transfer with per-extension bounds and admission gates
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 57
---

# Kitty Family Scope Decision

> Status: **draft decision record** — a recorded recommendation, not an
> accepted contract. It addresses the M1-24 question (backlog item `M1-24`,
> [bitty#1150](https://github.com/bitty-terminal/bitty/issues/1150)) and the
> Kitty-extension question `OQ-077`, which stays **Open**. It changes no
> accepted document, closes no open question, and weakens no normative
> security control. The accepted
> [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
> row for `OQ-077`, the
> [Rich Presentation RFC](rich-presentation-rfc.md) boundary, and the
> [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) rows
> remain authoritative. `OQ-077` closes only through an owner-accepted
> decision artifact, never through this record alone.

## Purpose

This record answers the M1-24 question — which Kitty-family extensions enter
scope (pointer shapes via OSC 22, text sizing, file transfer), and whether
the rest are deferred or refused with bounds — at the recommendation level,
and states the exact path that would close `OQ-077`. It exists so the three
absences are recorded Bitty positions with admission gates rather than
inferences from missing matches.

In scope: the three named extensions only, each with a disposition, bounds,
and admission gate. Out of scope: Kitty graphics (shipped present path),
Kitty keyboard (partial, separate track), Kitty notifications/bell policy
(`OQ-076`); the Rich Presentation RFC image contract, cited not redefined.

## Source identity

| Source                                                                                                            | Role                                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) | `OQ-077` owner-pending; the closure authority for this question                                 |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                 | Three P2 rows: pointer shapes, text sizing, file transfer — all `missing`, all with kitty refs  |
| [Rich Presentation RFC](rich-presentation-rfc.md)                                                                 | Accepted boundary: presentation never changes terminal truth; image/file transports stay fenced |
| Kitty snapshot documentation                                                                                      | `pointer-shapes.rst`, `text-sizing-protocol.rst`, `file-transfer-protocol.rst` (read-only refs) |

Implementation evidence, read-only from `bitty` `972818d`
(2026-09-22):

- No pointer-shape parsing in the OSC dispatch table
  (`crates/bitty-vt/src/parser/dispatch.rs`) and no cursor-icon platform
  call.
- No text-sizing parsing and no text-sizing render path anywhere under
  `crates/`.
- No file-transfer protocol handling anywhere under `crates/`.
- Kitty keyboard stays partial and separate (progressive flags, `7727`
  query, bounded `CSI u` subset); this record changes nothing about it.

## Disposition

### Decision space

Per extension: **adopt** (parse + present in M1), **defer** (record bounds
and gates, no M1 work), or **refuse** (record a permanent no).

### Recommended disposition

**Defer all three, refuse none, adopt none in M1.**

| Extension               | Verdict | Bounds if ever admitted                                                                                                                                                                                                               |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pointer shapes (OSC 22) | Defer   | Presentation-only cursor icon over regions/escapes; never terminal truth; per-platform icon mapping capped and fail-open to the default pointer                                                                                       |
| Text sizing protocol    | Defer   | Bounded scale factors; grid truth (cell lattice, cursor, selection) unchanged; interaction with DPI cell metrics specified before code                                                                                                |
| File transfer protocol  | Defer   | Untrusted intake with payload caps, dimension/allocation checks before decode, fail-closed malformed input; file/shared-memory transports stay capability requests denied by default (`R-003`); an adapter is not a file-access grant |

### Rationale

1. **No demand is demonstrated for any of the three.** All three are P2
   differentiators ("consider, do not chase without demand"). Shipping
   protocol surface without demand spends review and security budget for no
   milestone gain.
2. **No stance basis for refusal.** Unlike Sixel (explicit refusal) or
   broadcast input (deliberate refusal), none of the three conflicts with a
   Bitty invariant: pointer shapes and text sizing are pure presentation,
   and file transfer is fenceable with the same caps as image intake.
   Refusal would overreach; deferral with bounds is the honest posture.
3. **File transfer carries the sharpest security surface.** It moves
   arbitrary bytes with filesystem-adjacent semantics; admitting it without
   the `R-003` capability fence and decompression-bomb defenses reviewed
   first would repeat the exact class of mistake the image contract was
   written to prevent.
4. **Text sizing interacts with unsettled contracts.** Cell metrics,
   DPI handling, and atlas policy are still candidate (`OQ-096`/`OQ-097`);
   adopting a sizing protocol before the metric derivation it scales is
   building on sand.

### What changes if adopted

- **As recommended (deferral):** no runtime change. The authoritative
  resolution is an owner-accepted decision artifact (ADR, RFC revision, or
  specification update) that records the three deferrals with the bounds
  above and closes `OQ-077` per the path below. The three gap-analysis rows
  would move from `missing` to `missing; deferred with bounds`.
- **If any one is admitted later:** a new scoped task lands one bounded
  extension at a time (never all three in one task), with negative tests
  and — for file transfer — a focused security review before any
  `Verified` claim. Admission requires demonstrated demand and protocol
  work, not convenience.

### Security and bounds

- All three extensions consume untrusted PTY bytes; parsing stays inside
  the bounded parser (P0-AC-001/002) with graceful ignore of malformed
  sequences — the M1 rule for out-of-subset input.
- Pointer shapes and text sizing never mutate grid truth, cursor
  accounting, selection, or copy; they are renderer-presentation inputs
  only (security invariant 3).
- File transfer intake inherits the image-contract defenses: payload caps
  before allocation, fail-closed malformed input, and no capability grant
  implied by the adapter (`R-003`).
- This record opens no parser path and no capability; it is a scope
  statement only.

## Verification backlog

- The recommended disposition does not close M1-24 on its own: the issue
  stays open (Related, not Closed) until the owner-accepted artifact lands,
  reviewed by the architecture category owner and — for the file-transfer
  bounds — the security auditor per the
  [documentation workflow](../docs/development/documentation-workflow.md).
- Any future admission starts from a new scoped task citing demand
  evidence, the per-extension bounds above, and (for file transfer) the
  security-review evidence in its own acceptance record.
