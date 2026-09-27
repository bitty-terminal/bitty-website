---
title: Panel and agent workspace boundary (candidate)
description: Candidate panel identity, AI workspace object model, prompt editor consumption, and agent workspace composition
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 51
---

# Panel and agent workspace boundary (candidate)

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification, accepted
decision, dependency selection, release commitment, or implementation claim.
It records the candidate direction for Panel and the agent workspace: the AI
Workspace position in the object model, the Panel identity and lifecycle
boundary that future Agent UI panels inherit, floating-mode AI, the Rust
`TextEditor` primitive consumed by the AI prompt editor, the Agent Workspace
composition, and the proposed sequencing with its unifying principle.

The recommendation is to treat every Panel-side claim below as a candidate
input to the draft [AI Architecture](../architecture/ai-architecture.md) and its related
draft dispositions, never as an override of the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) or the normative security corpus.
Nothing here is promoted to accepted status, and no implementation is
described as shipped.

The direction's strongest ideas are the Panel-as-host boundary (`Panel` is not a
terminal; a terminal is one activity among several), the identity separation
`PanelId != ViewId != TerminalId` with host-owned lifecycle, mode-as-property
sharing (so AI panels reuse workspace operations), and the `Document != View
!= Panel` split with a shared Rust `TextEditor` primitive. Its weakest claims
are the unverified repository and RFC citations (no revision is pinned, so
none is confirmed here), the assumed effortlessness of activity switching with
a live background session, and the sequencing proposal, which is an opinion
about build order rather than an accepted plan. Those are corrected below.

This synthesis references, without duplicating or modifying, the draft
[AI Architecture](../architecture/ai-architecture.md) (candidate inputs only),
[Provider plugin boundary](../providers/provider-plugin-boundary.md),
[Panel environment awareness](../interfaces/panel-environment-awareness.md),
[Execution ownership R1](../architecture/execution-ownership-r1.md), and
[Tool transport R2](../architecture/tool-transport-r2.md). The accepted
[IPC and Agent RFC](ipc-agent-rfc.md) is unaffected by this draft. This
document creates no AIQ or OQ identifier and closes none.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## AI Workspace in the object model

The direction proposes placing an `AI Workspace` beside the terminal emulator,
window and workspace manager, native UI runtime, Lua application platform,
plugin runtime, and automation runtime, with `Panel` as the place where they
meet. For `bitty-ai`, the retained candidate direction is narrow: AI surfaces
are guests of a host-owned workspace, not owners of it. `bitty-ai` supplies
agent state, model and context policy, tools, and permissions; the terminal
side supplies panels, lifecycle, rendering, and transport. The product
analogy (Emacs-like composability over a Rust plus GPU base with a Lua
extension layer) is motivation, not an adopted architecture.

**Critical judgment:** the object-model tree is a proposal. The stable claim
is only the hosting direction: AI content lives inside host-managed
containers under host lifecycle, consistent with the R1
`ExecutionContext`-primary model. The direction's repository and RFC citations
are unverified here and cannot ground scope claims.

## Panel identity and lifecycle boundary

The retained boundary for future Agent UI panels is:

- Identity separation: a panel, its view, and its terminal session are
  distinct identities with distinct lifetimes. An agent panel can outlive,
  hide, or rebind its visible surface without moving or duplicating the
  underlying execution.
- Host-owned lifecycle: creation, mounting, suspension, resumption, and
  disposal belong to the terminal-side runtime. `bitty-ai` refers to panels
  and observations; it never owns PTY descriptors, GPU objects, or window
  handles.
- Content polymorphism: a panel may host a terminal, rich content, a browser
  surface, a helper process, or a canvas. Agent UI is one content kind among
  several, so agent panels inherit generic workspace behavior instead of
  needing a parallel windowing system.

**Critical judgment:** the enum variants and lifecycle verb names are
discussion vocabulary, not an accepted interface. The stable claim is the
ownership direction, which agrees with R1 (projection-only panels) and with
[Panel environment awareness](../interfaces/panel-environment-awareness.md)
(host-mediated environment, no ambient authority).

## Floating-mode AI and shared workspace operations

The retained direction is that AI panels need no bespoke windowing: because
mode is a runtime property rather than a panel type, an AI panel can move
between tiled, floating, fullscreen, and scratchpad states while keeping its
identity, lifecycle, input routing, and surface. The direction's example
operation set (toggle fullscreen, toggle floating, scratchpad recall, focus
and move navigation) applies uniformly to AI, editor, Docker, mail, and
terminal panels alike.

**Critical judgment:** floating presentation is a host decision, not an agent
capability. An agent must never open, focus, or hide panels by itself;
showing a decision surface is a request to the host, and background work
stays inspectable under user authority. The key bindings are illustrations,
not adopted defaults.

## TextEditor primitive and the AI prompt editor

The retained `bitty-ai` direction is consumer-only:

- The AI prompt editor is a consumer of a host-provided text-editing
  primitive, alongside the mail composer, commit editor, configuration
  editor, and the reference editor plugin. `bitty-ai` declares editing needs
  (multiline input, history, completion hooks); it does not implement buffer,
  cursor, shaping, virtualization, or undo machinery.
- `Document != View != Panel` separates the editable object, its display
  state, and its host container. One document may be shown in zero, one, or
  several views; a view carries display state and history; a panel hosts
  views. Agent edits therefore target documents through reviewed operations,
  never panel pixels.

**Critical judgment:** the primitive's exact API, the reference editor
plugin, and the Emacs analogy are proposals, not accepted contracts. The
stable claim is the layering: editing machinery stays host-side (or in a
reviewed native capability), while `bitty-ai` stays a client. Editing effects
still pass the R2 gate order and the expected-revision discipline; the
primitive grants no ambient file authority.

## Agent Workspace composition

The retained Agent Workspace composition is `Agent, Terminal, Diff, Task
Board, Logs, Browser` as co-hosted panels over one runtime. For `bitty-ai`,
the consequences are:

- The agent panel is one member of a composed workspace, not the workspace
  itself. Diff display, task tracking, log observation, terminal execution,
  and browser surfaces are sibling capabilities coordinated by the host, with
  `bitty-ai` contributing agent state and tool effects behind scoped IPC.
- The "runtime that can construct an IDE" framing keeps `bitty-ai` out of
  the composition business: workspace layout, panel kinds, and cross-panel
  data flow are host and plugin-ecosystem decisions. `bitty-ai` must work in
  any composition the host assembles, including headless execution with no
  agent panel at all.

**Critical judgment:** the composition lists are illustrative configurations,
not a required panel set and not a release plan. No composition implies
co-located authority: observing a sibling panel's output is a separately
authorized, redacted, bounded read, consistent with R2 and R3.

## Sequencing and unifying principle

The retained unifying principle is **Panel is a host; Terminal is only one
Activity**. It explains, in one sentence, why agent panels, editor panels,
mail panels, shell panels, and native-app panels belong to the same system:
each is an activity hosted by a generic workspace-managed container with a
presentation state (tiled, floating, fullscreen, scratchpad, pinned) and an
activity kind (terminal, native application, rich content, canvas, helper).

The six-step build order is recorded as the author opinion, not as
an accepted plan: finish the Panel Runtime first, then the
activity and surface layer, then the widget tree, then the `TextEditor`
primitive validated by a small reference plugin, then application services,
and only later advanced panel effects under a bounded core animation
discipline. `bitty-ai` depends on the first two steps (stable panel identity
and lifecycle, activity switching with a surviving background session) and is
otherwise decoupled from terminal-side sequencing.

**Critical judgment:** lossless activity switching with a live background
session is asserted, not demonstrated, in the direction. Session survival,
state reconciliation after switching, and the cost of hidden activities need
host-side evidence before `bitty-ai` relies on them. The final object-model
tree is a proposal; the accepted lifecycle vocabulary is unchanged by this
draft.

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered models discussed
in the direction are candidate inputs only and are **not** accepted by this
candidate design. Provider placement questions stay with the draft
[Provider plugin boundary](../providers/provider-plugin-boundary.md); panel environment
semantics stay with [Panel environment awareness](../interfaces/panel-environment-awareness.md);
single-agent execution ownership stays with
[Execution ownership R1](../architecture/execution-ownership-r1.md); tool authorization and
transport placement stay with [Tool transport R2](../architecture/tool-transport-r2.md).
Each is referenced, never duplicated or modified.

Normative security obligations (authenticated local IPC, per-action scopes,
read-only agent defaults, typed redaction, consented recording, secret
minimization) override every discussion example throughout this document. The direction's `PanelId`,
`ViewId`, `TerminalId`, `PanelContent`, and mode names are conceptual
vocabulary from the discussion, not additions to any accepted registry.
This draft creates or closes no AIQ or OQ identifier; open questions stay
with [AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the design falsifiable before any Panel-side
proposal constrains `bitty-ai`.

| Campaign                  | Required observation                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity separation       | Hiding, moving, or rebinding an agent panel never moves its execution target, duplicates its session, or widens its authority                                      |
| Lifecycle ownership       | Suspend, resume, and disposal of agent panels are host operations; `bitty-ai` holds references, and stale handles fail closed                                      |
| Mode transitions          | Tiled, floating, fullscreen, and scratchpad transitions preserve panel identity and input routing while background sessions survive with reconciled state          |
| Prompt-editor consumption | The AI prompt editor performs multiline editing, history, and completion through the host primitive without `bitty-ai`-owned buffer machinery                      |
| Workspace composition     | Agent, terminal, diff, task, log, and browser panels compose and decompose without co-located authority; cross-panel reads stay separately authorized and redacted |
| Host-requested surfacing  | Agent requests to show a decision surface are host-mediated; the agent cannot open, focus, or close panels directly                                                |

Promotion needs independent AI architecture, terminal and panel-owner,
docs-curator, and security review. Route missing Panel Runtime revisions,
accepted lifecycle conflicts, activity-switching evidence, primitive API
shape, and composition authorization to scoped owner tasks. This draft
changes no normative contract and authorizes no product code.
