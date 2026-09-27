---
title: Terminfo TERM Decision
description: Draft decision record for the M1-26 terminfo question - keep TERM=xterm-256color and ship no bitty entry, confirming the real-entry-or-none disposition
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 41
---

# Terminfo TERM Decision

> Status: **draft decision record** — a recorded disposition, not an accepted
> contract. It resolves the M1-26 question (backlog item `M1-26`,
> [bitty#1152](https://github.com/bitty-terminal/bitty/issues/1152)) at the
> recommendation level only. It changes no accepted document, closes no open
> question, and weakens no normative security control. The accepted
> [Text Compatibility](text-compatibility.md) `TERM` statement, the accepted
> [Compatibility Milestone RFC](compatibility-milestone-rfc.md) M1 scope, and
> the `bitty` `terminfo/README.md` contract remain authoritative until a
> reviewed change moves them together.

## Purpose

This record answers whether Bitty ships a real `TERM=bitty` terminfo entry or
keeps advertising `TERM=xterm-256color` with no entry of its own. It confirms
the disposition that a package ships a real `tic`-compiled entry or nothing, and
that a placeholder entry must never reach a formal package.

In scope: the child-process `TERM` value, the existence and packaging of a
`bitty` terminfo entry, and the guard that enforces the choice. Out of scope:
`TERM_PROGRAM`/`TERM_PROGRAM_VERSION` and the graphics-fingerprint stripping
that already ship (`crates/bitty-pty/src/builder.rs`), and the `COLORTERM`
truecolor advertisement.

## Source identity

| Source                                                                                                            | Role                                                                                        |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [Text Compatibility](text-compatibility.md)                                                                       | Accepted draft contract; § Terminfo states the default `TERM` and the publication condition |
| [Compatibility Milestone RFC](compatibility-milestone-rfc.md)                                                     | Accepted M1 matrix; defines the milestone frame the `TERM` value serves                     |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                 | P2 row "Terminal terminfo entry": `partial (by design today)`                               |
| [Release Distribution and Hardening Plan](../product/release-distribution.md)                                     | Item 6: real terminfo or stop shipping the fake; the dummy must not enter a package         |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) | Cross-project governance, linked not copied; no dedicated terminfo OQ is open               |

Implementation evidence, read-only from `bitty` `origin/main` `fce0c3b`
(2026-09-20):

- `DEFAULT_TERM = "xterm-256color"` and `DEFAULT_TERM_PROGRAM = "bitty"` are set
  by the PTY builder (`crates/bitty-pty/src/builder.rs`); a caller may override
  `TERM` through `PtyBuilder::env`.
- No `bitty` terminfo entry ships. The placeholder `terminfo/bitty.terminfo`
  that installed to `/usr/share/terminfo/b/bitty` was removed under `bitty`
  `CTX-0451` (merge `868c8d4`, PR
  [#849](https://github.com/bitty-terminal/bitty/pull/849), 034 item 6).
- `scripts/check-terminfo.sh` guards the decision: it fails if the retired
  placeholder path, the placeholder marker, or a `/usr/share/terminfo` install
  reappears in the packaging inputs. It reports
  `PASS (no terminfo entry ships; decision recorded in terminfo/README.md)`.
- `terminfo/README.md` records the intended shape of a future entry (a minimal
  diff from `xterm-256color`) as design draft, not implementation evidence, and
  names the same-change steps required to land it.

## Disposition

### Recommended disposition

**Keep `TERM=xterm-256color` and ship no `bitty` entry for the current
milestone; confirm the real-entry-or-none rule.** The `CTX-0451` disposition
("ship a real `tic`-compiled entry or nothing, never the dummy") is correct and
stays in force. A real entry remains a future, separately reviewed change.

### Rationale

1. **`xterm-256color` is accurate today.** The implemented capability set is a
   subset of what that entry advertises (VT/ECMA-48, 256-color, truecolor SGR,
   bracket paste, mouse, focus, cursor style), so callers get correct behavior
   without a new database entry. The `bitty` entry would mostly re-advertise the
   same capabilities under a new name.
2. **A wrong entry is worse than no entry.** A `bitty` entry that advertised
   Sixel, Kitty graphics, or other unimplemented protocols would mislead term-DB
   probes; the accepted image contract keeps Sixel refused and iTerm2 deferred.
   Advertising capabilities Bitty lacks is a correctness defect, not a
   convenience.
3. **The placeholder class is already closed.** The retired dummy was a
   packaging-validation artifact, not a capability claim; keeping it out is
   enforced by a gate rather than convention.
4. **The change has a defined landing path.** `terminfo/README.md` records the
   required same-change steps so adoption is not ad hoc.

### What changes if adopted

- **As recommended (keep no entry):** no runtime change. This record confirms the
  disposition. The [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)
  row stays `partial (by design today)`, and the accepted
  [Text Compatibility](text-compatibility.md) § Terminfo statement ("default
  `TERM=xterm-256color` until a `bitty` entry is published and the compatibility
  matrix updates") stays unchanged.
- **If a real entry is adopted later:** it lands as one reviewed change that (1)
  writes `terminfo/bitty.ti` and compiles it with `tic -x`, (2) round-trips
  `infocmp -x bitty` against the advertised set before packaging, (3) installs
  the compiled database entry and updates `scripts/check-terminfo.sh`, the
  packaging recipes, and `terminfo/README.md` together, and (4) moves
  `DEFAULT_TERM` to `bitty` at a minor-version bump while updating
  [Text Compatibility](text-compatibility.md) and the release compatibility
  matrix in the same delivery.

### Security and bounds

- `TERM` is child-process environment data; a terminfo entry is capability
  advertisement, not a grant. A wrong entry can mislead a program into emitting
  sequences the parser does not implement, which is a bounded-correctness
  concern, not a trust-boundary change.
- The entry must advertise only implemented capabilities: no graphics protocol
  claim, no capability that opens a file, device, or network path.
- No parser path, capability, or resource ceiling changes with this record.

## Verification backlog

- The recommended disposition closes M1-26 as a recorded decision; no runtime
  evidence is required because nothing ships.
- A future real-entry change is authoritative in its own task and must carry
  `tic` compilation, `infocmp` round-trip evidence, the updated guard, and the
  synchronized [Text Compatibility](text-compatibility.md) and compatibility
  matrix updates before any `TERM=bitty` claim.
