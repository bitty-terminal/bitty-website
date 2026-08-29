---
title: ADR 0002 - Platform Support Tiers
description: Establishes initial Linux macOS Windows and BSD support tiers with CI guarantees and tier promotion demotion criteria
category: decisions
audience: maintainer
document_type: specification
status: accepted
website_publish: true
sidebar_order: 32
---

# ADR 0002 - Platform Support Tiers

## Status

Accepted on 2026-08-26 by the project initiator.

This decision closes open question
[OQ-003](../open-questions.md). No platform tier described here is a
shipped-behavior claim and no CI guarantee is implemented until the
implementing platform tasks deliver them with evidence.

## Context

The [product vision](../../product/vision.md) accepts Linux, macOS,
Windows, and BSD as target platforms and states that Windows must not be an
afterthought: the platform boundary must model Unix PTYs versus Windows ConPTY
explicitly. The same document left support tiers, CI coverage, and fallback
strategies as open questions; this ADR resolves them.

The [technology strategy](../../project/technology-strategy.md) records a
non-approved candidate tier table (Tier 1: Linux x86_64, Windows x86_64, macOS
ARM64; Tier 2: Linux ARM64, macOS x86_64, FreeBSD x86_64; Tier 3: NetBSD,
OpenBSD, others) and notes that a generic claim of Unix support is
insufficient. The project must define Wayland/X11 coverage, minimum Windows and
macOS versions, BSD CI availability, and GPU/backend fallback.

Constraints from prior decisions:

- [ADR 0001](ADR-0001-repository-bootstrap-baseline.md) accepts only a minimal
  read-only Core CI (format, Clippy, tests, `actionlint`) with no product code.
  Nothing in this ADR authorizes product implementation; it defines the policy
  that later platform tasks implement.
- The primary development machine is CachyOS/Hyprland (Linux). Coverage for
  X11, Windows, macOS, and BSD must come from CI, dedicated machines, or
  reproducible environments, not from that one machine.

## Decision

### Support tiers

Bitty defines three support tiers per operating-system family and
architecture. A platform's tier binds exactly one promise set below.

| Tier | Name        | Platforms at adoption                                                                               | Promise                                      |
| ---- | ----------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1    | Supported   | Linux x86_64 (Wayland and X11), Windows x86_64 (Windows 10 1809+ / ConPTY), macOS ARM64 (macOS 13+) | Must work; regressions are release blockers  |
| 2    | Best-effort | Linux ARM64, macOS x86_64 (macOS 13+), FreeBSD x86_64                                               | Should work; fixes are welcome but not gated |
| 3    | Community   | Other BSDs (NetBSD, OpenBSD), other architectures                                                   | May work; community-maintained patches only  |

Notes:

- Linux Tier 1 covers both Wayland and X11 windowing paths; a regression in
  either backend is a Tier 1 defect. GPU-backend fallback to software rendering
  is part of the Tier 1 Linux promise so headless/VM CI remains meaningful.
- Windows minimum is bound to ConPTY availability rather than marketing
  version alone; the exact floor is pinned by the implementing platform task.
- macOS x86_64 starts at Tier 2 because Intel Macs are declining and no
  maintainer machine exists; it may be promoted while hardware is available.
- BSD scope is deliberately narrow: FreeBSD x86_64 is Tier 2 because GitHub
  Actions runners exist for it; NetBSD and OpenBSD are Tier 3 until someone
  provides reproducible CI evidence.

### CI guarantee policy

| Tier | Pull-request gate                                      | Merge gate                                              | Release gate                                       |
| ---- | ------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------- |
| 1    | Build, unit tests, integration tests, lint on every PR | Same as PR, required status check                       | Full test suite plus smoke launch on native runner |
| 2    | Not run per PR                                         | Build plus core unit tests on merge or nightly schedule | Build plus core unit tests                         |
| 3    | None                                                   | None                                                    | None; community reports only                       |

Rules:

1. Tier 1 failures block merge. A flaky Tier 1 job is treated as failing until
   quarantined by an explicit reviewed change, never silently retried into
   green.
2. Tier 2 scheduled failures do not block merges but must be triaged within
   one release cycle; two consecutive cycles of unaddressed Tier 2 breakage
   forces a demotion review.
3. Cross-compilation never substitutes for native-runner evidence in Tier 1 or
   release gates. Emulation (QEMU) may substitute only for Tier 2 scheduled
   runs and must be labeled as such in reports.
4. Every release artifact declares its tier. Artifacts for platforms without
   passing release gates must not ship from official channels.
5. CI cost discipline: adding a Tier 1 configuration requires showing it earns
   its per-PR runtime; otherwise it enters at Tier 2.

### Promotion criteria

A platform is promoted when all of the following hold:

1. A native (or equivalent-fidelity) automated environment runs build, unit,
   integration, and lint gates reliably for at least one full release cycle;
2. Known platform defects have no open P0/P1 issues;
3. A named owner (person or rotating team) accepts the Tier 1 maintenance duty;
4. Per-PR CI budget impact has been reviewed and accepted.

macOS x86_64 promotion additionally requires evidence that Intel-specific
regressions would actually be caught, not merely that jobs run.

### Demotion criteria

A platform is demoted when any of the following occurs, after a recorded
review:

1. Its Tier 1 gate fails for reasons not fixed within one release cycle;
2. Its owner role is vacant and no successor accepts it;
3. Upstream dependencies drop or degrade support such that maintaining the
   tier costs more than its user base justifies;
4. Two consecutive cycles of unaddressed Tier 2 scheduled breakage (demote to
   Tier 3).

Demotion is a public, dated change: release notes and this document record the
tier transition; artifacts for the demoted platform stop shipping at the next
release, not retroactively.

## Alternatives considered

- **Equal-tier all platforms from day one** — rejected: it makes promises CI
  cannot keep (no macOS/BSD maintainer machines) and turns every bug into a
  false release blocker.
- **Linux-only first, defer everything else** — rejected: contradicts the
  accepted vision that Windows is not an afterthought; deferring ConPTY design
  would bake Unix assumptions into core PTY abstractions.
- **Two tiers instead of three** — rejected: collapsing best-effort and
  community tiers hides who maintains what; the third tier keeps an honest home
  for patches without implying maintenance.

## Consequences

- Platform claims become auditable: each README/release statement maps to a
  tier and its gate evidence.
- Windows ConPTY work is scheduled as Tier 1 from the start, forcing early
  abstraction of PTY differences (consistent with the technology strategy).
- BSD support stays honest: FreeBSD gets real CI attention; other BSDs get
  neither promises nor blame.
- CI spend grows by roughly one native-runner matrix per Tier 1 platform;
  budget rule 5 guards against unbounded growth.
- Tier transitions create documentation synchronization duties (vision,
  technology strategy, repository map) in the same change.

## Affected contracts

Acceptance on 2026-08-26 applied these same-change updates:

- [Technology strategy](../../project/technology-strategy.md): the candidate
  tier table is replaced by a link to this ADR as the accepted tier policy.
- [Product vision](../../product/vision.md): the platform/open-question
  wording that referenced undecided tiers is resolved.
- Future platform implementation tasks cite this ADR for their gate scope.

## Validation basis

- GitHub Actions provides native `windows-latest`, `macos-latest` (ARM),
  `ubuntu-latest` runners and third-party `macos-13` (x86_64) and FreeBSD VM
  actions; availability was reviewed on 2026-08-25 and must be re-checked when
  the CI workflow task pins runners.
- Windows ConPTY API availability from Windows 10 1809 is documented by
  Microsoft; re-verify against Microsoft Learn when pinning the Windows floor.
