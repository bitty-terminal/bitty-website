---
title: Compatibility Milestone RFC
description: Defines the accepted VT keyboard image clipboard and shell-integration protocol set that forms milestone M1 with acceptance evidence requirements
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 11
---

# Compatibility Milestone RFC

## Status

Accepted on 2026-08-26 by the project initiator. Acceptance authorizes planning
against this milestone contract; it makes no shipped-behavior claims until the
required acceptance evidence exists.

It closes open question [OQ-004](../decisions/open-questions.md).
It also feeds, but does not decide, OQ-007 (terminal state model),
OQ-008 (image protocol), and OQ-016 (structured transports).

## Context

The [product vision](../product/vision.md) requires a small core that is a
correct terminal first; compatibility and security precede extension
convenience. The [technology strategy](../project/technology-strategy.md)
lists candidate protocol groups — foundation VT behavior, metadata/security
OSC sequences, modern keyboard input, image protocols, and shell integration —
but explicitly defers prioritization to a requirements document or RFC.

Constraints this RFC must respect:

- Shells (bash, zsh, fish, PowerShell, cmd, nushell) must operate normally
  without shell integration. Integration is an optional enhancement.
- The implementation must never infer shell state by parsing prompt text.
- Protocol inputs are untrusted byte streams; parsing must be bounded and
  fuzz-covered per the security baseline.
- Nothing here is implemented yet; every requirement below is a milestone M1
  acceptance target for the future terminal-state implementation.

## Decision

Milestone M1 is defined as "Bitty can be a daily-driver terminal for ordinary
shell work on Tier 1 platforms." It contains exactly the following protocol
commitments, each with required acceptance evidence. Anything not listed is
explicitly out of M1 scope even if trivially available from a dependency.

### M1 protocol matrix

| Area                 | Protocol / feature                                             | M1 status          | Rationale                                                    |
| -------------------- | -------------------------------------------------------------- | ------------------ | ------------------------------------------------------------ |
| Character encoding   | UTF-8 input/output, invalid-sequence recovery                  | Required           | Foundation for everything else                               |
| Core VT              | ECMA-48/VT100/VT220/xterm-compatible subset (see below)        | Required           | Defines "a correct terminal"                                 |
| Color                | 16 color, 256 color, truecolor SGR                             | Required           | Table stakes for modern CLI tools                            |
| Screen modes         | Alternate screen, origin mode, margins, scroll regions         | Required           | vim/htop/tmux class apps                                     |
| Bracketed paste      | Mode 2004                                                      | Required           | Safe paste is a correctness/security matter                  |
| Mouse                | X10/SGR mouse tracking (1000, 1002, 1003, 1006)                | Required           | Common TUI expectation                                       |
| Focus events         | Modes 1004, 1007                                               | Required           | Trivial cost, common expectation                             |
| Synchronized updates | DECSET 2026                                                    | Required           | Flicker-free rendering contract                              |
| Cursor shape/style   | DECSCUSR                                                       | Required           | Widely used by shells/prompts                                |
| Window title         | OSC 0 and OSC 2 (set); OSC 10/11 query + set                   | Required           | Basic window metadata                                        |
| Shell integration    | OSC 7 (cwd); OSC 133 command zones (A/C/D/E)                   | Opt-in enhancement | Never required; scripts are separate and optional            |
| Hyperlinks           | OSC 8                                                          | Opt-in enhancement | Low risk, additive                                           |
| Clipboard write      | OSC 52 (write only), gated by user permission                  | Gated opt-in       | See security gating below                                    |
| Clipboard read       | OSC 52 query/read                                              | Out of M1          | Read-back of user clipboard by untrusted output is a P0 risk |
| Modern keyboard      | Kitty keyboard protocol (all flags)                            | Opt-in enhancement | Progressive enhancement over legacy encoding                 |
| Legacy key encoding  | xterm modifier encoding incl. modifyOtherKeys=1-level coverage | Required           | Baseline when Kitty protocol absent                          |
| Images               | Kitty Graphics, Sixel, iTerm2 inline images                    | Out of M1          | Deferred to the image protocol RFC (OQ-008)                  |

### Required VT subset definition

"M1-required" means the parser and terminal state correctly handle:

- C0 controls (with configurable C1 handling under UTF-8);
- CSI: CUU/CUD/CUF/CUB, CUP/HVP, ED/EL, IL/DL, ICH/DCH/ECH, SU/SD,
  DECSTBM, SGR (including colon-separated sub-parameters), DECSET/DECRST
  private modes listed above, DA1/DA2 responses, DSR;
- OSC: 0, 2, 7 (opt-in), 8 (opt-in), 52 (gated opt-in write), 133 (opt-in),
  10, 11;
- ESC: charset designation sufficient for line-drawing (DEC special
  graphics), RIS, DECSC/DECRC, ST;
- DCS/APC/PM/SOS: parsed and discarded safely (hooks reserved for future
  protocols such as Kitty Graphics).

Anything outside this subset may be ignored gracefully but must never corrupt
terminal state, hang the parser, or allocate unbounded resources.

### Explicit non-goals for M1

- Image protocols (Kitty Graphics, Sixel, iTerm2): owned by OQ-008 with its
  own security review; adding them early would force renderer/storage decisions
  before the Terminal Truth model exists.
- OSC 52 clipboard read: denied in M1 regardless of configuration. A future
  RFC may gate it behind an explicit, revocable capability.
- Sixel fallback graphics mode, Tektronix, legacy character-set completeness.
- tmux control mode passthrough guarantees beyond "does not corrupt state".

## Acceptance evidence requirements

Each M1 item needs recorded evidence before the milestone can be declared
complete. Evidence lives in `bitty-docs` test reports and links from the
compatibility register.

| Commitment level       | Required acceptance evidence                                                                                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required (core VT)     | Differential test corpus run against at least one reference oracle (vttest subset plus captured Ghostty/kitty/WezTerm sessions); all cases green; parser fuzzing (cargo-fuzz) over VT/OSC/DCS/APC with zero crashes, hangs, or unbounded allocations over an agreed budget |
| Required (modes/input) | Automated integration tests driving a headless terminal state instance per mode (alternate screen, bracketed paste, mouse modes 1000/1002/1003/1006, focus, 2026, DECSCUSR); golden snapshots committed                                                                    |
| Required (color/title) | Snapshot tests for SGR 0–255 and truecolor cell attributes; automated test for OSC 10/11 query-response round trip                                                                                                                                                         |
| Opt-in enhancement     | Feature works end-to-end when enabled AND default-off behavior is proven identical to the without-feature build via differential snapshot suite; enabling/disabling requires no restart unless documented                                                                  |
| Gated (OSC 52 write)   | Permission prompt or pre-granted capability required before first write; denial path tested; clipboard content never logged; adversarial test showing untrusted output cannot trigger a silent write                                                                       |
| Denied (OSC 52 read)   | Negative tests proving read requests are ignored/denied and no clipboard data enters the PTY-observable surface                                                                                                                                                            |
| Shell integration      | Tests prove full functionality with zero integration active on bash, zsh, fish, PowerShell, cmd, nushell smoke suites; injected-script tests cover OSC 7 and OSC 133 zones; no prompt-text heuristic anywhere in the codebase (grep-audited review evidence)               |
| Cross-platform         | Every Required item verified on each [ADR 0002 Tier 1 platform](../decisions/adrs/ADR-0002-platform-support-tiers.md) in CI; Opt-in items verified on at least one Tier 1 platform with documented gaps elsewhere                                                          |
| Performance guardrail  | Parser throughput benchmark recorded (baseline number committed); no pathological regression versus plain-text throughput beyond an agreed factor                                                                                                                          |

Evidence rules:

1. A claimed capability without linked evidence is treated as unverified and
   must not appear in README, release notes, or website content.
2. Fuzzing and differential-corpus evidence re-runs on every parser change,
   not once at milestone declaration.
3. Milestone completion requires independent reviewer sign-off, matching the
   CarryCtx workflow.

## Alternatives considered

- **Ship images in M1** — rejected: image storage/placement interacts with
  renderer contracts and security budgets that OQ-008 has not resolved; pulling
  them in would delay a correct text terminal.
- **Allow OSC 52 read behind a flag in M1** — rejected: clipboard read-back by
  any process whose output reaches the terminal is a known exfiltration vector;
  the security baseline forbids temporary bypass APIs for P0 boundaries.
- **Kitty keyboard as M1-required** — rejected: it would make Bitty unusable
  with programs expecting legacy encoding if defaults regress, and doubles the
  input-test matrix before the state model exists. Legacy-first with progressive
  enhancement keeps risk bounded.
- **No explicit matrix, "be xterm compatible"** — rejected: unverifiable and
  directly responsible for decades of emulator compatibility drift.

## Consequences

- M1 scope is auditable: each row maps to named tests, snapshots, or negative
  evidence.
- The terminal-state implementation (OQ-007) inherits this list as its
  functional checklist; changes here require updating that design together.
- Image work has a clean deferral path instead of ad-hoc pressure.
- Programs relying solely on unlisted protocols degrade gracefully rather than
  fail, because out-of-subset handling is specified.
- The evidence burden (differential corpus, fuzzing, cross-platform CI) becomes
  a standing cost owned by the parser/state tasks, not a one-time gate.

## Affected contracts

Acceptance on 2026-08-26 applied these same-change updates:

- [Technology strategy](../project/technology-strategy.md): the candidate
  compatibility-path bullets now link to this RFC.
- [Product vision](../product/vision.md): the compatibility-milestone
  open-question wording is resolved.
- Future terminal-state and parser tasks cite this document for M1 scope.
