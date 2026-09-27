---
title: Image Protocol Decision
description: Draft decision record for the M1-33 image-protocol question - keep the explicit Sixel and iTerm2 deferral with a demand-gated admission path
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 40
---

# Image Protocol Decision

> Status: **draft decision record** — a recorded disposition, not an accepted
> contract. It resolves the M1-33 question (backlog item `M1-33`,
> [bitty#1159](https://github.com/bitty-terminal/bitty/issues/1159)) at the
> recommendation level only. It changes no accepted document, closes no open
> question, grants no capability, and weakens no normative security control.
> The accepted [Rich Presentation RFC](rich-presentation-rfc.md) image contract
> and its open point 2, the accepted
> [Compatibility Milestone RFC](compatibility-milestone-rfc.md) M1 scope, and
> the [Rich Content](../interfaces/rich-content.md) candidate contract remain
> authoritative until a reviewed revision says otherwise.

## Purpose

This record answers whether the initial PTY image-protocol set admits iTerm2
inline images or Sixel, or keeps the explicit refusal already visible in the
implementation. It exists so the refusal is a recorded Bitty decision rather
than an inference from absent code.

In scope: the PTY image protocols behind the accepted image contract — Kitty
Graphics, Sixel, and iTerm2 inline images — and their admission or deferral.
Out of scope: Kitty-family non-image extensions (pointer shapes, text sizing,
and file transfer, tracked by `OQ-077`); the image-store and placement ceilings;
and the animation lifecycle, all of which stay with the accepted RFC.

## Source identity

| Source                                                                                                            | Role                                                                           |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Rich Presentation RFC](rich-presentation-rfc.md)                                                                 | Accepted image contract (OQ-008); open point 2 asks whether iTerm2 enters v1   |
| [Compatibility Milestone RFC](compatibility-milestone-rfc.md)                                                     | Accepted M1 matrix: Images are `Out of M1`, deferred to the image-protocol RFC |
| [Rich Content](../interfaces/rich-content.md)                                                                     | Candidate rich-surface contract; records Sixel and iTerm2 as unimplemented     |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                 | P2 row "iTerm2 inline images; sixel" is `missing; refused`                     |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) | Cross-project governance, linked not copied; no dedicated image-scope OQ open  |

Implementation evidence, read-only from `bitty` `origin/main` `fce0c3b`
(2026-09-20):

- Kitty Graphics is the only image path implemented end to end: APC `G` intake,
  bounded PNG/RGB/RGBA decode, cursor-anchored placement, and the present-path
  blit (`crates/bitty-rich`, `crates/bitty-render`, `crates/bitty-runtime`).
- `bitty inspect protocol sixel` reports `unsupported` and states that Sixel
  sequences are ignored while text and fallbacks keep working
  (`crates/bitty-app/src/inspect.rs`).
- No iTerm2 inline-image parser or decoder exists; `ImageSource::Sixel` and
  `ImageSource::Iterm2` are data-model variants only
  (`crates/bitty-rich/src/image.rs`).
- `TERM_PROGRAM=bitty` and the inherited `GHOSTTY_*`/`WEZTERM_*`/`KITTY_*`/
  `ITERM_*` fingerprint stripping keep term-DB probes from advertising graphics
  Bitty does not implement (`crates/bitty-pty/src/builder.rs`).

## Disposition

### Recommended disposition

**Keep the explicit refusal and deferral — Kitty-primary, with a demand-gated
admission path.** Bitty admits Kitty Graphics as its only shipped image protocol
for the current milestone and records Sixel as refused and iTerm2 inline images
as deferred, admitted only through a new scoped task that carries protocol work,
demand evidence, and a security review.

### Rationale

1. **No demand is demonstrated.** The
   [roadmap gap register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/roadmap/now-next-later.md)
   records non-Kitty images as "consider, do not chase without demand" and the
   Sixel row as an explicit unsupported stance matching Alacritty and Ghostty.
2. **Kitty already covers the primary use case.** The implemented path decodes
   PNG, raw RGB, and raw RGBA, which covers the `chafa`/`icat`-style producers
   the gap analysis names. Sixel and iTerm2 would add coverage, not a missing
   capability.
3. **Each adapter multiplies decoder attack surface.** Every new protocol
   adapter introduces another bounded decode path under `R-002`/`T-02`
   (compressed-graphics exhaustion). The accepted ceilings `IMG-1`..`IMG-9`
   bound one adapter today; a second and third decoder add review and fuzz cost
   with no release-gating benefit.
4. **M1 explicitly excludes images.** The
   [Compatibility Milestone RFC](compatibility-milestone-rfc.md) records Images
   as `Out of M1`, so no milestone gate is waiting on Sixel or iTerm2.

### What changes if adopted

- **As recommended (keep the refusal):** no runtime change. The
  [Rich Presentation RFC](rich-presentation-rfc.md) open point 2 resolves toward
  "deferred" through a reviewed RFC revision that moves Sixel and iTerm2 from
  the "initial candidate set" wording to a demand-gated, refused-by-default
  statement. The [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)
  row keeps `missing; refused`, and `bitty inspect protocol` may add an explicit
  `iterm2` entry beside the existing `sixel` one. No accepted ceiling moves.
- **If instead admitted:** a new scoped task adds one bounded adapter per
  protocol (payload cap, dimension and allocation checks before decode,
  fail-closed malformed input), makes the `ImageSource` variant reachable, and
  lands negative tests plus a focused security review before any `Compatible`
  claim. Admission requires demonstrated demand and a protocol-work estimate,
  not convenience.

### Security and bounds

- All PTY image input stays untrusted until a bounded decode plus policy check
  succeeds (accepted image contract).
- The decompression-bomb defense stays before allocation: `IMG-1` compressed
  payload cap, `IMG-2` decoded dimensions, `IMG-3` decode peak memory, `IMG-4`
  aggregate store bytes, `IMG-5` image count, plus the animation ceilings
  `IMG-6`..`IMG-9`.
- File and shared-memory transports stay capability requests denied by default
  (`R-003`); a protocol adapter is not a file-access grant.
- This record opens no parser path and no capability; it is a scope statement
  only.

## Verification backlog

- The recommended disposition closes M1-33 as a recorded decision. The
  authoritative resolution of the RFC open point requires the RFC revision named
  above, reviewed by the architecture category owner and the security auditor
  per the [documentation workflow](../docs/development/documentation-workflow.md).
- Any future admission starts from a new scoped task, not this record, and must
  cite the demand evidence, the protocol work, and the negative-test and
  security-review evidence in its own acceptance record.
