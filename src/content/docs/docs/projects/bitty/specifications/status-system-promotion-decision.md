---
title: Status System Promotion Decision
description: Draft promotion disposition for the Status System draft - recommended owner promotion path through the Window Chrome RFC and acceptance gates with UX-05 and UX-18
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 52
---

# Status System Promotion Decision

> Status: **draft promotion disposition** — a recorded recommendation for
> backlog item `DOC-08`
> ([bitty#1122](https://github.com/bitty-terminal/bitty/issues/1122)), not an
> accepted contract. It keeps the
> [Status System Specification](status-system.md) at `draft`, names the
> recommended owner lane, and states the promotion path and its acceptance
> gates. It changes no accepted document, closes no open question, grants no
> capability, weakens no normative security control, and makes no
> implementation claim.

## Purpose

The Status System draft holds the StatusBar and module-registry contract, but
a bar contract cannot be accepted in isolation: bar placement and
configurability are owned by `UX-05`
([bitty#1011](https://github.com/bitty-terminal/bitty/issues/1011), PW-4 Bar
configurability), and the chrome surfaces the bar composes into are owned by
`UX-18`
([bitty#1024](https://github.com/bitty-terminal/bitty/issues/1024), U-4
WindowChromeRuntime). This record exists so the promotion decision — owner,
path, and gates — is reviewable direction instead of an inference from the
draft sitting unowned.

In scope: the keep-draft disposition, the recommended owner lane, the
promotion path through the Window Chrome successor RFC, and the acceptance
gates. Out of scope: the bar and registry contract itself (owned by the
draft, linked not restated); bar configurability semantics (owned by `UX-05`
and the candidate
[Panel and Workspace Interaction](panel-workspace-interaction-candidate.md)
PW-4 record); chrome-surface semantics (owned by `UX-18` and the candidate
[Chrome Surface Contract](chrome-surface-contract-candidate.md)).

## Source identity

| Source                                                                                    | Role                                                                                                                                                    |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Status System Specification](status-system.md)                                           | The draft under disposition; `status: draft`, no experimental implementation                                                                            |
| `UX-05` ([bitty#1011](https://github.com/bitty-terminal/bitty/issues/1011))               | Bar configurability (edge, height, colors, indicator, animations, hide); consumes the bar surface                                                       |
| `UX-18` ([bitty#1024](https://github.com/bitty-terminal/bitty/issues/1024))               | WindowChromeRuntime surfaces (`WorkspaceRail`, `StatusBar`, `OverlayRoot`, notification, command); the recommended owner lane                           |
| [UI Convergence Roadmap](ui-convergence-roadmap.md)                                       | Routes the draft Status System into the Window Chrome successor RFC (successor 5, last)                                                                 |
| Backlog item `DOC-08` ([bitty#1122](https://github.com/bitty-terminal/bitty/issues/1122)) | The promotion-decision item this record dispositions; sub-issue of the docs-sync epic ([bitty#978](https://github.com/bitty-terminal/bitty/issues/978)) |

## Disposition

### Recommended disposition

**Keep the draft and promote it through the Window Chrome RFC when `UX-18`
is authored — no standalone acceptance before then.** The StatusBar module
registry is a chrome-slot composition contract: accepting it before the
chrome surfaces (`WorkspaceRail`, `StatusBar`, plugin chrome slots,
notifications, global overlays) and the rail-versus-Bar product question are
decided would freeze a composition target that does not exist yet.

### Recommended owner

The **Window Chrome RFC author (the `UX-18` owner lane)** owns the promotion.
Rationale: the convergence roadmap already routes the Status System draft
into successor 5; the draft's open items (per-module defaults, overflow
priorities, `network` aggregation scope, provider capability mapping,
headless harness placement) are all chrome-composition questions, not
standalone bar questions. `UX-05` stays a consumer: it decides bar
configurability against the accepted chrome contract, it does not own the
registry.

### Promotion path

1. `UX-18` authors the Window Chrome RFC, deciding the rail-versus-Bar
   question, notification ownership, and plugin chrome-slot grant scope
   (`RFC-OQ-5`).
2. The Window Chrome RFC restates the StatusBar and registry rules it keeps
   from the draft — restatement, not citation by implication — and closes the
   draft's open items or records why a deferred item stays open.
3. The draft Status System document is archived with its successor named
   (retirement, never deletion), per the roadmap's retirement rule.
4. `UX-05` then specifies bar configurability against the accepted chrome
   contract.

### Acceptance gates for promotion

- The `StatusComponent` schema fields and their bounded lengths are fixed
  beyond the draft's illustrative set.
- Per-module default intervals and overflow priorities are set after UX
  review, with `network` per-interface-versus-aggregate decided.
- The Provider component capability mapping covers enriched metrics beyond
  the three privileged metrics without breaking the `SystemMetricsService`
  ownership rule (Platform Core owns `cpu`/`memory`/`network` sampling; never
  Lua direct reads).
- A headless test-harness placement exists for registry and
  `SystemMetricsService` adapter injection.
- The unified-`Mod` adjacency (`OQ-052`/`OQ-088`) and `RFC-OQ-5` chrome-slot
  scope questions the Window Chrome RFC inherits are closed or explicitly
  deferred with owners.

## Alternatives considered

| Alternative                                           | Trade-off                                                                                     | Disposition                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Accept the Status System standalone now               | Decisive; freezes a composition target before the chrome surfaces and the rail question exist | Rejected — composition before its target                 |
| Promote through `UX-05` (bar configurability) instead | Bar-first; the registry is wider than one bar edge (slots, providers, metrics service)        | Rejected — consumer, not owner                           |
| Leave the draft unowned with no path                  | No action; repeats the current drift that motivated `DOC-08`                                  | Rejected — this is the gap                               |
| Fold the registry into the plugin-ecosystem corpus    | Provider composition is plugin-adjacent; splits the bar contract across repositories          | Rejected — the bar is terminal chrome, linked not copied |

## Security review

This record opens no sampler, grants no capability, and moves no trust
boundary. On promotion, the properties that must hold: the single privileged
`SystemMetricsService` sampler stays Platform Core-owned; provider-contributed
modules stay capability-gated and isolated per the accepted isolation
contract; per-module budgets and queue ceilings come from the accepted
resource RFC, not from the chrome RFC. No `P0` criterion is affected by this
record.

## Verification backlog

- The keep-draft disposition holds until the Window Chrome RFC exists; any
  earlier acceptance attempt must cite this record and overturn it in review.
- On promotion, the archiving change must name the successor and restate the
  kept rules; a pointer-only retirement is insufficient.
- `UX-05` work started before the chrome acceptance must be marked
  provisional against the draft, not against an accepted contract.

## Open points

- The rail-versus-Bar product question (owned by the Window Chrome RFC).
- Whether `network` reports per-interface or aggregate in v1.
- Provider component capability mapping for enriched metrics.
- Owner assignment for `UX-18` itself is pending; this record recommends the
  lane, not a name.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes. The security review above records that disposition.

## References

- [Status System Specification](status-system.md) — the draft under
  disposition, including its open items.
- [UI Convergence Roadmap](ui-convergence-roadmap.md) — Window Chrome
  successor row that consumes this draft.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  chrome surfaces for the Window Chrome RFC.
- [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md) —
  PW-4 bar-configurability direction consumed by `UX-05`.
