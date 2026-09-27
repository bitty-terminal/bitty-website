---
title: Panel/Surface/Process Trichotomy (Candidate)
description: Candidate separation of Panel Surface and Process identities plus the strict Native UI definition with TUI comparison Wheel agent example and built-versus-not-built evidence
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 54
---

# Panel/Surface/Process Trichotomy (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This note fixes the vocabulary for three
> concepts that are routinely conflated — Panel, Surface, and Process — and
> gives the strict definition of Native UI that the candidate
> [Workspace-Native UI Runtime](ui-runtime-candidate.md) assumes. It
> authorizes no shipped behavior, weakens no accepted source it cites, and
> makes no implementation claim beyond the explicitly labeled
> built-versus-not-built record below; every type name below is either
> observed implementation spelling or candidate spelling, never both.

## Purpose and scope

Panel, PTY, and Process are three separate concepts, and Terminal, TUI, and
Native UI are three separate rendering positions. Conflating any two produces
contracts that cannot be enforced: a panel outlives the process it shows, a
surface outlives the frame it renders, and a terminal grid is one embeddable
surface among several, not the definition of UI.

In scope: the Panel/Surface/Process separation rule, the strict Native UI
definition, the TUI-versus-Native comparison, one worked example (the Wheel
agent panel), and the explicit built-versus-not-built record.

Out of scope and owned elsewhere: the panel lifecycle state machine
(accepted [Panel Runtime RFC](panel-runtime-rfc.md)); the non-terminal panel
content path (candidate
[Panel Content Scene Path Decision](panel-content-scene-path-decision.md));
chrome surfaces (candidate
[Chrome Surface Contract](chrome-surface-contract-candidate.md)); the UI
runtime program itself (candidate
[Workspace-Native UI Runtime](ui-runtime-candidate.md)); agent roles, leases,
and handoff (open OQ-057, OQ-058, OQ-083 in the
[open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  and [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md):
  terminal output is observation data, never instructions; agent access stays
  read-only by default; no new capability, bypass, or ambient authority is
  granted here.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  (`Accepted`): Core manages resources, state, invariants, and mechanisms;
  plugins manage behavior, policy, and user experience; the P0 gates stand.
- [Panel Runtime RFC](panel-runtime-rfc.md) (`Accepted`): the panel lifecycle
  contract; this note adds vocabulary, not lifecycle rules.
- [Rich Presentation RFC](rich-presentation-rfc.md) (`Accepted`): rich output
  stays a content kind, not a UI framework.

## Terminology

- **Panel**: a compositor identity. A Panel is a placed, addressable unit of
  the workspace — it has a stable id, a placement slot, and a lifecycle
  (create, show, hide, destroy) owned by the compositor. A Panel is not a
  PTY and not a Process.
- **PTY**: a byte-stream device pair between a terminal emulator and a child
  process. A PTY is a transport. It has no placement, no identity in the
  workspace, and no rendering semantics.
- **Process**: an executing program with an OS identity (pid, exit status,
  signals). A Process is observed through a surface; it is never identical
  to the Panel that shows it.
- **Surface**: what a Panel renders. A Surface is a renderable content
  producer with its own update protocol (byte stream, scene graph, frame
  callback). One Panel shows one Surface at a time; the same Surface kind
  can appear in many Panels.
- **Terminal (Surface)**: the grid-of-cells surface fed by PTY bytes —
  one embeddable Surface kind, not the definition of UI.
- **TUI**: an application rendering inside a Terminal surface (cells,
  escape sequences, keyboard-only input). A TUI program draws with the
  terminal's protocol; it owns no widgets outside the grid.
- **Native UI (strict)**: retained, declarative UI executed in the
  compositor runtime — widgets with identity, layout, and input handling
  owned by the compositor, declared by content (core or plugin) and
  rendered outside any terminal grid. The strict reading is conjunctive:
  retained **and** declarative **and** compositor-resident. Anything missing
  one of the three is not Native UI under this definition.

## The trichotomy: Panel, Surface, Process

The separation rule is `Panel != PTY != Process`, with Surface as the fourth
term that binds Panel to pixels:

| Concept | Identity                             | Owned by                      | Outlives                                               |
| ------- | ------------------------------------ | ----------------------------- | ------------------------------------------------------ |
| Panel   | stable workspace id + placement slot | compositor                    | the process it shows (empty panels exist)              |
| Surface | content producer + update protocol   | content side (core or plugin) | any single frame it renders                            |
| PTY     | device pair (transport only)         | OS + terminal emulator        | nothing; it is torn down with either end               |
| Process | pid + exit status                    | OS / spawning runtime         | nothing in the workspace; death is observed, not owned |

Consequences of the rule:

1. A Panel showing a dead process is still a Panel; process death changes
   Surface content, never Panel identity.
2. Replacing a Panel's Surface (terminal grid to browser view, terminal to
   Native UI) is a content swap, not a Panel destroy-and-recreate.
3. Killing a Process must never implicitly destroy a Panel; the compositor
   decides what an empty or exited Panel shows.
4. No contract may address "the PTY" when it means the Panel, or "the
   process" when it means the Surface. Reviewers treat such wording as a
   defect against this note once accepted.

## Native UI strict definition

Native UI is retained, declarative, compositor-resident UI. Each adjective
excludes a concrete impostor:

- **Retained** excludes immediate-mode frame callbacks: widgets persist
  across frames with identity, so the compositor can diff, focus, and
  hit-test without re-executing content code. A per-frame redraw callback
  is not Native UI.
- **Declarative** excludes imperative drawing: content declares what the UI
  is (tree, constraints, bindings), and the compositor decides how and when
  to paint it. Direct canvas scribbling behind the compositor's back is not
  Native UI.
- **Compositor-resident** excludes in-grid rendering: layout, input routing,
  and painting happen outside any terminal cell grid. A prettier escape
  sequence is not Native UI.

Under this definition the Terminal (and any TUI inside it) is exactly one
embeddable Surface kind: the compositor tiles the Panel, and the Panel shows
a terminal surface whose bytes happen to come from a shell, an editor, or a
TUI program. Native UI surfaces tile the same way and obey the same Panel
identity, placement, and P0 isolation rules — they differ only in the update
protocol (declared tree versus byte stream).

## TUI versus Native UI

| Axis            | TUI                               | Native UI (strict)                         |
| --------------- | --------------------------------- | ------------------------------------------ |
| Render target   | terminal cell grid                | compositor scene, outside the grid         |
| Unit of update  | byte stream (escape sequences)    | declared tree diff                         |
| Widget identity | none (cells only)                 | retained per-widget identity               |
| Input           | keyboard bytes (+ mouse encoding) | routed events with hit-testing             |
| Layout owner    | the application (counts cells)    | the compositor (constraints)               |
| Embedding       | runs inside a Terminal surface    | is a Surface kind beside Terminal          |
| Isolation story | PTY boundary only                 | compositor capability boundary per surface |

The comparison is deliberately asymmetric: TUI is an application pattern
inside one Surface kind, while Native UI is a Surface kind with its own
runtime contract. A TUI program can never graduate into Native UI by adding
colors; it graduates by leaving the grid and declaring its tree to the
compositor.

## Worked example: the Wheel agent panel

Consider a hypothetical agent panel, nicknamed Wheel, that supervises a
long-running coding agent. The trichotomy assigns every part of Wheel
exactly one identity:

- The **Panel** is Wheel's workspace presence: a stable id, a placement
  slot beside the editor panel, show/hide state. It survives agent restarts;
  closing the agent never closes the Panel unless the user says so.
- The **Surface** is what Wheel renders today versus under the candidate:
  today a Terminal surface showing the agent's text log; under the candidate
  a Native UI surface declaring retained widgets (run list, approval card,
  stop button) that the compositor lays out and hit-tests.
- The **PTY** exists only in the Terminal-surface variant, carrying log
  bytes. In the Native UI variant there is no PTY at all — nothing about
  Wheel's identity changes when the transport disappears, which is the
  point of the separation.
- The **Process** is the agent execution itself: spawned, supervised, and
  reaped by the runtime, observed through whichever Surface is mounted. No
  lease, description, or handoff mechanism exists for it today (open OQ-083);
  Wheel therefore cannot hand its agent to another panel, and this note
  grants no such capability.

Wheel shows why the strict reading matters: a Terminal surface rendering an
agent log with clickable-looking `[approve]` text is still TUI, not Native
UI — the compositor sees bytes, routes no events, and enforces no widget
boundary. Declaring the approval as a retained widget under a compositor
capability is the crossing point, and only the candidate UI runtime may
define it.

## Built versus not built

Verified 2026-09-23 against `bitty` `main`. `Implemented` below means code
exists; nothing below is `Verified`, and nothing authorizes shipped or
compatibility-guaranteed behavior.

| #   | Claim                                                                                                             | State            | Evidence                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ViewContent` five-way split exists; Terminal is one content kind                                                 | Implemented-only | `crates/bitty-ui/src/panel.rs:184`: `Empty`, `Terminal(u64)`, `Rich(u64)`, `Browser(BrowserSurfaceId)`, `Panel(PanelId)`              |
| 2   | A `Surface` type system exists (`TerminalSurface` / `UISurface` / `ImageSurface` / `CanvasSurface` or equivalent) | NOT built        | zero matches for those names in `bitty` `main`; the only `SurfaceKind` is the wgpu swapchain handle in `bitty-render/src/gpu.rs`      |
| 3   | The render pipeline is surface-generic                                                                            | NOT built        | `bitty-render` self-describes as a terminal-snapshot grid pipeline; it is terminal-centric                                            |
| 4   | A Native UI framework exists                                                                                      | NOT built        | `uitree.rs`, `canvas.rs`, `widget_mech.rs` are unintegrated pieces; no retained/declarative compositor UI runtime wires them together |
| 5   | A Process abstraction exists (execution identity, lease, handoff)                                                 | NOT built        | execution and lease concepts are runtime-internal modules only; OQ-057, OQ-058, OQ-083 remain Open                                    |

Rows 2–5 are the gap this candidate exists to name. Any future RFC that
claims to close a row must cite implementation evidence in the `bitty`
repository; this note alone closes nothing.

## Security review

This note defines vocabulary and records a gap; it grants no capability,
moves no trust boundary, and changes no P0 gate. The worked example is
explicitly hypothetical and confers no agent authority: agent execution
supervision stays under the read-only-default and no-bypass rules of the
normative security sources above. A future Native UI runtime RFC built on
this vocabulary will need its own security review covering per-surface
capabilities, input-routing trust, plugin-declared widget authority, and
the agent Process supervision boundary (OQ-057/OQ-058); that review is an
acceptance gate for the successor, not for this note.

## Verification plan

1. `just check` green (format, markdownlint, links, metadata, language,
   agents, hygiene, svg) — the Docs quality workflow is the merge gate for
   this docs-only repository.
2. Built-versus-not-built rows re-checked against `bitty` `main` at review
   time: `ViewContent` spelling at `crates/bitty-ui/src/panel.rs`, absence
   of a `Surface` type system, terminal-centric `bitty-render` description,
   unintegrated `uitree.rs` / `canvas.rs` / `widget_mech.rs`, and Open state
   of OQ-057/OQ-058/OQ-083. Any drift becomes a revision of the table,
   never a silent claim.
3. Independent reviewer confirms candidate status is unmistakable, no
   normative wording leaked in, and cross-links point at canonical
   documents rather than duplicating them.

## Alternatives considered

- **Panel == Process (bind Panel lifetime to the child process).**
  Rejected: it makes empty panels, reattach, and agent restart
  inexpressible, and contradicts the accepted Panel Runtime lifecycle,
  which this note must not weaken.
- **Surface as a property of the Process (each process brings its own
  rendering).** Rejected: it forbids Surface swaps (terminal to browser,
  terminal to Native UI) and ties compositor placement to OS process
  lifetime.
- **Loose Native UI ("anything richer than plain text").** Rejected: it
  admits TUI escape art, sixel images, and canvas scribbles under one
  label, making per-surface capabilities and input-routing contracts
  unenforceable. The strict conjunctive reading exists so a successor RFC
  can attach one capability model to one well-defined thing.
- **Defining the full UI runtime here.** Rejected: that program belongs to
  the candidate [Workspace-Native UI Runtime](ui-runtime-candidate.md) and
  its owner-pending successor RFCs. This note fixes only the vocabulary
  those documents assume.

## Affected contracts

None changed. This candidate adds vocabulary consumed (not yet) by the
candidate [Workspace-Native UI Runtime](ui-runtime-candidate.md),
[Panel Content Scene Path Decision](panel-content-scene-path-decision.md),
and [Chrome Surface Contract](chrome-surface-contract-candidate.md); it
restates, without altering, the accepted [Panel Runtime RFC](panel-runtime-rfc.md),
[Core and Plugin Boundaries](../architecture/core-boundaries.md), and
[Rich Presentation RFC](rich-presentation-rfc.md). Acceptance of a successor
RFC would reference this note; it would not retroactively normativize it.

## Open points

1. Whether the `ViewContent` five-way split (row 1) is the right seed for
   the future `Surface` type system, or only a content tag to be replaced —
   owned by the future Surface RFC, not decided here.
2. Whether `Panel(PanelId)` nesting composes with the trichotomy (a Panel
   as a Surface's content) without reintroducing identity confusion —
   flagged for the Surface RFC.
3. The capability model for plugin-declared Native UI widgets — owned by
   the plugin-ecosystem corpus and the UI runtime successor RFCs.
4. Agent Process supervision (spawn, lease, handoff, multi-agent routing) —
   open OQ-057, OQ-058, OQ-083; this note assumes no outcome.

## Acceptance criteria

1. The document is `draft` candidate status with no normative, shipped,
   stable, or compatibility-guaranteed wording.
2. Panel/Surface/Process separation (`Panel != PTY != Process`) is stated
   with the consequence rules a reviewer can check future contracts
   against.
3. The strict Native UI definition (retained + declarative +
   compositor-resident) with the Terminal/TUI-as-one-embeddable-Surface
   position is stated and not duplicative of the UI runtime candidate.
4. The TUI-versus-Native comparison table and the Wheel agent panel worked
   example are present.
5. The built-versus-not-built table is present, matches the verified
   2026-09-23 record, and claims nothing beyond `Implemented`-only where
   code exists.
6. `just check` passes; the document is registered in the Specifications
   index draft table.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes. The security review above records that disposition. A
successor UI runtime RFC will require owner and security-reviewer sign-off
before acceptance.

## References

- [Panel Runtime RFC](panel-runtime-rfc.md) (`Accepted`) — panel lifecycle
  contract this note must not weaken.
- [Workspace-Native UI Runtime (Candidate)](ui-runtime-candidate.md)
  (`Draft`) — the UI runtime program whose vocabulary this note fixes.
- [Panel Content Scene Path Decision](panel-content-scene-path-decision.md)
  (`Draft`) — the confirmed "Panel is not Terminal" gap record.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)
  (`Draft`) — chrome-side surfaces and the candidate UI runtime assumption.
- [Rich Presentation RFC](rich-presentation-rfc.md) (`Accepted`) — rich
  output as content kind, not UI framework.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  (`Accepted`) — ownership tables and P0 gates.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md)
  (`bitty-docs`) — normative security sources.
- [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  (`bitty-docs`) — OQ-057 (agent role contract), OQ-058 (multi-agent
  orchestration), OQ-083 (panel lease/handoff), all Open.
