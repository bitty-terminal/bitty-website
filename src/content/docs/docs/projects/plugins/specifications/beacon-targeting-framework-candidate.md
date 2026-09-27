---
title: Beacon Targeting Framework (Candidate)
description: Draft candidate direction for a workspace-wide spatial and semantic targeting engine that dispatches typed actions through the command registry
category: specifications
audience: plugin-author
document_type: specification
status: draft
website_publish: false
sidebar_order: 26
---

# Beacon Targeting Framework (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document records the plugin-side
> direction for a workspace-wide spatial and semantic targeting framework: the
> part the Bitty plugin ecosystem would own if the direction were ever reviewed
> and accepted. It authorizes no shipped, stable, or
> compatibility-guaranteed behavior, weakens no accepted source it cites, and
> makes no implementation claim. Names, grammars, label policies, target kinds,
> and Lua shapes repeated here are direction, not contract. The terminal-side
> core mechanism, the terminal-side UI runtime candidate, and the shared
> governance decisions this direction depends on are recorded as owner-pending
> pointers, not as content of this document.

## Purpose and scope

This document freezes the recorded direction for Beacon as Bitty's
workspace-wide **spatial and semantic targeting engine** rather than a terminal
jump plugin, so future design work starts from a stable input instead of
reconstructing the discussion. It refines, by reference only, the accepted
command-registry, identity, capability, and overlay contracts it cites, and it
changes none of them.

In scope (all **Candidate** unless cited otherwise):

- B-1: Beacon's architectural identity as a workspace-wide spatial and
  semantic targeting engine, including the mouse and keyboard targeting
  duality.
- B-2: the `Action × Target` operator-pending interaction model with
  action-first and target-first grammars.
- B-3: generation-based `TargetRef` semantic handles, `StaleTarget`
  fail-closed validation, and ephemeral session snapshots.
- B-4: automatic UI discovery through semantic properties and the three-tier
  Target Provider architecture with cold-path collection.
- B-5: target scopes that bound candidate sets and prevent label explosion.
- B-6: spatial and ergonomic label allocation with Rust mechanisms and
  Lua-configurable strategies.
- B-7: the single batched `BeaconAnnotationLayer` and its presentation-only
  bounds.
- B-8: the split between terminal-side Rust core mechanisms and the thin Lua
  Beacon plugin policy layer.
- B-9: the six architectural primitives and the Beacon session state machine.
- B-10: the security posture for target registration, dispatch, and metadata
  observation.

Out of scope and owned elsewhere (pointers, not content):

- the terminal-side core targeting engine (`TargetEngine`/`AnnotationEngine`,
  `TargetRef` generation validation, the annotation layer inside the workspace
  scene, transient input capture, and the command dispatch bridge)
  (owner-pending, [bitty-terminal-docs specifications tree](https://github.com/bitty-terminal/bitty-terminal-docs/tree/main/specifications));
- the terminal-side UI runtime that owns the retained declarative UI tree,
  hit-testing, focus, layout, and compositor scene submission
  (owner-pending, same tree; the runtime candidate is in flight);
- the terminal-side semantic command-block model whose `CommandBlockProvider`
  becomes one core target provider, and the terminal-side candidate that
  currently records Beacon as a sub-feature of terminal scope
  ([Semantic Terminal RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/semantic-terminal-rfc.md));
- panel lifecycle, focus routing, and the Event Bus contract (accepted,
  [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md));
  presentation-mode transitions beyond the live `tiled` mode stay gated and
  Open (`RFC-OQ-9`);
- the Panel/Workspace interaction, identity, and keyboard gesture direction
  (candidate,
  [Panel and Workspace Interaction](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-workspace-interaction-candidate.md));
- the unified `Mod` direction, the Leader default and modal timeout direction,
  and their conflict diagnostics (open, governance register entries OQ-052 and
  OQ-088);
- plugin capability dimensions and the API version that would carry a
  Beacon-facing surface (open, governance register entry OQ-056);
- the terminal-side spatial action engine contract question, including how the
  direction generalizes terminal hint mode (open, governance register entry
  OQ-089);
- shared governance, decision, and security corpora (linked, never copied,
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs)).

No terminal-side document is changed, moved, or status-promoted by this page;
the extraction of Beacon from terminal-side scope is recorded as an
owner-pending pointer.

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  untrusted-by-default posture, capability families, and the invariants that
  keep plugin behavior off hot paths and presentation-only.
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  abuse cases for plugin authority, hot paths, and data flows.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md): accepted
  manifest, capability grammar, grant lifecycle, command registry rules, and
  event pipeline budgets.
- [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md):
  accepted v1 host namespaces and the explicit exclusion of panel providers and
  presentation replacement from v1.
- [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md): accepted
  per-plugin VM isolation, resource ceilings, and failure semantics.
- [Plugin system](../extensibility/plugin-system.md) (draft): the governing
  boundary that plugins alter presentation but never Terminal Truth is recorded
  there as accepted direction, while extension levels, register-versus-claim
  discipline, and declarative UI remain candidate contract; this page preserves
  those boundaries.
- [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md):
  accepted panel identity, focus routing, overlay bounds, and command-registry
  placement.
- [Workspace Compositor Specification](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/workspace-compositor.md):
  accepted identity hierarchy (`PanelId != ViewId != TerminalId`), decoration,
  and interaction rules.

This page does not move a requirement between owners, does not add a capability
identifier, and does not downgrade a P0 gate. If any mechanism here contradicts
a normative source, the normative text wins.

## Terminology

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted document already decides the point; this page only links or restates it. |
| Candidate         | Proposed by the recorded design direction only; no review has accepted it.           |
| Owner-pending     | Belongs to another repository owner or decision; recorded here as a pointer only.    |
| Open              | Explicitly undecided; no owner decision or contract exists.                          |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

| Term             | Meaning in this document                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target           | An addressable workspace object (panel, workspace, command block, UI control, link, or plugin domain entity) exposed through public metadata.       |
| `TargetRef`      | A lightweight, generation-validated semantic handle to a target; never a raw UI tree node, compositor handle, or memory pointer.                    |
| Target Provider  | A source that contributes targets to a Beacon session: core, plugin, or derived.                                                                    |
| Beacon session   | The bounded lifetime in which targets are collected, labels are shown, input is captured, and at most one action is dispatched or the session ends. |
| Annotation layer | The single batched presentation layer that draws every Beacon label for a session.                                                                  |
| Label            | The short keyboard code that selects a target during an active session.                                                                             |
| Dispatch         | Invoking a typed command for the selected target through the command registry, under the target owner's authority.                                  |
| Mediator         | A component that routes a request without gaining the authority of either side.                                                                     |
| Which-key        | A continuation hint surface that shows the keys or labels valid from the current input prefix.                                                      |

## B-1 Beacon identity: spatial and semantic targeting (Candidate)

**Candidate.** Beacon is Bitty's keyboard-driven semantic addressing layer for
the entire workspace. It is not a terminal jump plugin and not a sub-feature of
terminal scope: terminal content is one target domain among panels, workspaces,
interactive controls, links, and plugin domain objects. The terminal-side
candidate that currently records Beacon within terminal scope is unchanged by
this page; its extraction, and the removal of the terminal-scope framing, are
proposed as owner-pending work for the terminal-side owner rather than decided
here.

The framework rests on a fundamental duality:

- **Mouse targeting**: a pointer hit test resolves a screen location to a
  `TargetRef`.
- **Keyboard targeting**: a label selected from the target registry resolves a
  keystroke to a `TargetRef`.

Both paths converge on one operation: `Action(TargetRef)` dispatched to the
command registry. There is no second execution path for pointer gestures, and
no keyboard-only shortcut around command schemas or capability checks. This
extends the accepted rule that gesture-derived input routes through the command
registry as validated commands rather than through a private mechanism
([Workspace Compositor Specification](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/workspace-compositor.md)
interaction table, [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md)
command registry); the workspace-wide equivalence of every gesture and label
under one `Action × Target` entry point is the candidate direction recorded
here.

**Open.** Whether the mouse path lives entirely in terminal-side Core or also
routes through Beacon policy, and how pointer capture composes with the
terminal input path, are owner-pending questions in the terminal-side input
contract (OQ-052 territory).

## B-2 The `Action × Target` interaction model (Candidate)

**Candidate.** Beacon resolves _what to target_, never _how to execute_.
Selecting a target dispatches a typed Command ID to the global command
registry; it does not call `panel:close()` or any private method internally.
The command owns its argument schema, its capability requirements, and its
result type. Beacon contributes the target, not the authority.

Two grammars share the same session, providers, allocator, and annotation
layer:

- **Action-first** (high frequency): the operator precedes the target. A
  keybinding selects an action family, Beacon labels the suitable targets, and
  the typed label completes `Action(TargetRef)`. The recorded examples are a
  focus operator (`Leader f` then a label focuses a panel), a fold operator
  (`Leader z` then a label toggles a command block), and a move operator
  (`Leader m` then a number moves a panel to a workspace).
- **Target-first** (exploratory): the target precedes the operator. A generic
  entry (`Leader Space` in the recorded direction) labels every in-scope
  target; selecting a label opens a context action menu built from the target's
  declared actions, and the menu selection completes the dispatch.

Which commands participate in which operator family, the menu contents, and
the operator key vocabulary are plugin policy (B-8), not Core mechanism.
Operator spellings, the Leader default, and the modal timeout are open
governance directions (OQ-052 and OQ-088) and are illustrative-only here.

Consequences recorded as candidate:

- A target's declared action list is metadata, not authority; the action still
  executes as a command under its own owner's grants.
- Action-first operators narrow the candidate set before allocation, which
  reduces label pressure; target-first sessions rely on scopes (B-5).
- An action with no valid target in scope ends the session with an explicit
  empty result rather than dispatching nothing silently.

**Open.** Whether the context menu of the target-first grammar is a Core
surface or plugin-composed, and whether an operator may chain into a second
operator, are undecided.

## B-3 `TargetRef` as a generation-based semantic handle (Candidate)

**Candidate.** Targets are represented as lightweight semantic references,
never as raw UI nodes, compositor objects, or memory addresses:

| Handle            | Refers to                                     |
| ----------------- | --------------------------------------------- |
| `PanelRef`        | A panel identity and generation.              |
| `WorkspaceRef`    | A workspace identity and generation.          |
| `CommandBlockRef` | A semantic command block in terminal content. |
| `UiNodeRef`       | A UI control with semantic properties.        |
| `LinkRef`         | An addressable link or rich-content target.   |

Rules recorded for the direction:

- **Generation validation.** Each handle carries its identity plus generation.
  If the underlying entity disappeared, was replaced, or re-rendered under a
  new generation between collection and dispatch, validation fails with
  `StaleTarget` and the session cancels or recollects cleanly. A stale handle
  never dispatches against a recycled identity; the failure is fail-closed.
- **Ephemeral snapshots.** Targets are collected as ephemeral snapshots when a
  Beacon session enters `Collecting`. Nothing about a target list is retained
  across sessions, and no handle is transferable between sessions or plugin
  generations.
- **Compositor internals excluded.** The compositor presentation attachment
  (`ViewId`) is not a user-facing target. Users target panels, workspaces,
  controls, command blocks, and domain objects; the `PanelId != ViewId !=
TerminalId` separation stays accepted and unchanged.
- **Opaque to Lua.** A `TargetRef` is an opaque value; it exposes nothing that
  would let a plugin reach another plugin's VM, configuration, or internal
  state.

**Open.** The exact wire shape of the handles, whether derived providers may
compose handles, and how a moved panel keeps its handle valid across a
workspace change are undecided; identity persistence and move semantics stay
with the terminal-side identity contracts.

## B-4 Automatic UI discovery and Target Providers (Candidate)

**Candidate.** UI components participate in Beacon automatically by exposing
semantic properties, and explicit providers extend the target set for domain
objects. The recorded semantic surface is:

```text
focusable | clickable | actionable | semantic_id | bounds | command
```

An interactive control such as `ui.button` is indexed automatically because it
declares these properties; a static container such as `ui.card` is ignored by
default and participates only through an explicit opt-in. The default is
deliberate: a target set that includes every layout container would produce
labels for objects no user wants to address.

Targets come from a three-tier provider architecture:

| Tier    | Contributes                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------ |
| Core    | Panels, workspaces, command blocks, focusable UI controls, links, and rich blocks.                                       |
| Plugin  | Domain entities contributed by plugins (for example git branches and commits, container and image objects, agent tasks). |
| Derived | Composite and contextually filtered target sets computed from the tiers above.                                           |

Collection discipline:

- Providers collect on **cold-path snapshots** when a session enters
  `Collecting`. No provider runs a per-frame or per-event poll loop, and no
  plugin provider callback executes inside the parser, layout, render, or input
  hot paths.
- Collection is bounded in target count and label text; the exact ceilings are
  undecided and would belong to the terminal-side core engine contract.
- A provider that fails during collection is isolated: its targets are absent
  and the session continues with the remaining providers.
- A plugin provider declares which target kinds and metadata it exposes; the
  provider registration surface and its capability dimensions are Open
  (OQ-056).

**Open.** The provider registration API surface and its API version, the exact
collection budget, whether derived providers are Core-owned or plugin-owned,
and the minimum semantic-property contract for third-party components are
undecided. Until the terminal-side UI runtime candidate lands, the semantic
property set is a direction, not an implemented interface.

## B-5 Target scoping (Candidate)

**Candidate.** A session constrains its candidate targets by explicit scopes so
labels stay meaningful and do not explode across the workspace:

| Scope                 | Bounds targets to                                                 |
| --------------------- | ----------------------------------------------------------------- |
| `CurrentControlGroup` | The focused control group (for example a form or toolbar region). |
| `CurrentPanel`        | The focused panel.                                                |
| `CurrentWorkspace`    | The active workspace.                                             |
| `Window`              | Everything visible in the active OS window.                       |
| `WorkspaceRail`       | The workspace indicator surface and its entries.                  |
| `SemanticDomain`      | A named domain (for example git objects or container objects).    |

Rules recorded for the direction:

- Every operator has a default scope, and a session result is always bounded by
  at least one scope. The default per operator is Open; a plausible direction
  is the narrowest meaningful scope first, widening only on explicit request.
- Scopes compose: a `SemanticDomain` session can be narrowed by
  `CurrentWorkspace` without defining a new scope kind.
- Scope resolution is a filter over collected targets, not a second collection
  pass, so a session never widens its snapshot implicitly.

## B-6 Spatial and ergonomic label allocation (Candidate)

**Candidate.** Label allocation is a Rust Core mechanism with Lua-configurable
policy:

- **Single-character home-row priority.** Labels start on the home row
  (`asdfghjkl`, `qwertyuiop`) so one hand reaches every label without leaving
  its resting region. Two-character codes (for example `AA`, `AS`) appear only
  on overflow.
- **Spatial mapping.** Targets on the left half of the surface map to left-hand
  keys and targets on the right half map to right-hand keys; the recorded
  alternative is a 3×3 grid quadrant mapping. Spatial mapping keeps the
  keystroke correlated with the object's position instead of allocation order.
- **Deterministic order.** Allocation order is stable for a fixed target set
  and scope, so muscle memory survives session repetition.
- **Strategy split.** Allocation algorithms live in Rust Core; the label
  character set and the strategy selection (`home-row`, `spatial`, `compact`)
  are policy configurable through Lua and user configuration.

**Open.** The overflow threshold, the exact handedness pools, two-character
code grammar, per-domain strategy overrides, RTL and non-Latin label pools, and
the configuration key surface are undecided. The terminal-side candidate
records handedness pools and multi-character overflow as open questions under
the spatial action engine register entry (OQ-089); this page does not fix them.

## B-7 Single batched annotation layer (Candidate)

**Candidate.** Beacon labels do not spawn individual panels, OS overlays, or
native windows. Every label for a session renders through one ephemeral
**`BeaconAnnotationLayer`** inside the workspace scene, submitted in a single
batched pass alongside selection and IME underline layers.

Rules recorded for the direction:

- The layer is presentation-only: it never mutates grid, cursor, modes,
  scrollback, or layout, and it never changes content geometry.
- The layer is bounded: the session's target count and label text are capped,
  and one label is one annotation, not one overlay. This composes with the
  accepted bounded overlay capacity rather than multiplying it.
- The layer is transient: it exists only while the session is active and is
  removed atomically on dispatch, cancel, or timeout.
- No plugin draws into the layer directly; plugins contribute target metadata,
  and Core renders the annotation.

**Open.** The scene-layer ownership, z-order relative to selection and IME
layers, animation policy for appearing and disappearing labels, and the exact
per-session label budget are owner-pending with the terminal-side UI runtime
and scene contracts.

## B-8 Rust core mechanism versus Lua plugin policy (Candidate)

**Candidate.** The framework splits along the mechanism/policy boundary:

| Side                 | Owns                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Rust core mechanisms | Target registry, semantic target snapshots, `LabelAllocator`, annotation layer, transient input capture, command dispatch bridge.     |
| Lua plugin policy    | Key-language bindings, which-key integration, scopes, filters, theme badges, provider composition, and target-first menu composition. |

The names `TargetEngine` and `AnnotationEngine` are recorded candidate
spellings for the Rust side; the naming is explicitly open, and no Rust type is
claimed to exist. The Lua side is the thin official plugin
**`bitty-terminal/beacon`**: an ordinary plugin that follows the accepted
manifest, capability, lifecycle, and service rules and receives no special
runtime privilege. Being the reference operator surface does not make it part
of Core, and Core mechanisms are usable without it.

The plugin identity is a product-direction candidate, not an existing package:
the plugin-ecosystem product records the Beacon repository creation and
registration as queued follow-up work, and records that no Beacon repository
exists today. If the package is registered, the
[official plugin onboarding](../product/official-plugin-onboarding.md) policy
governs its entry criteria, and the
[bundled-plugin split decision](../product/bundled-plugin-split-decision.md)
records the surrounding ecosystem state.

**Owner-pending.** The Core mechanism belongs to the terminal platform
documentation owner; this page records only the plugin-side framework and the
split, not a Core API.

## B-9 Six architectural primitives and the session state machine (Candidate)

**Candidate.** The framework defines six concepts:

| Primitive        | Responsibility                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `BeaconTarget`   | One addressable object: public metadata (`id`, `label`, `anchor`, `actions`) plus its `TargetRef`. |
| `BeaconProvider` | A source that contributes targets for a scope, at collection time only.                            |
| `BeaconScope`    | The bound that constrains a session's candidate set.                                               |
| `BeaconAction`   | A typed command reference attached to a target or an operator family; never a callback body.       |
| `LabelAllocator` | The deterministic mapping from a scoped target set to labels under the active strategy.            |
| `BeaconSession`  | The bounded lifetime that owns collection, labels, capture, dispatch, and cleanup.                 |

Session lifecycle (Candidate):

```text
Idle -> Collecting -> Active -> (valid label prefix) -> Narrowed -> Dispatch
                          \-> Cancel (Esc, timeout, or target invalidation)
```

Rules recorded for the direction:

- One session at a time; a new session request during an active session is
  rejected or cancels the current one, never both.
- Keys that are not labels, prefixes, or cancel keys fall back to normal input
  behavior; the session fails open rather than holding input hostage.
- A target invalidated after labeling removes its label and may cancel the
  session when the remaining set is empty.
- Dispatch is single-shot: one session completes at most one action, and
  replay or retry semantics do not exist.

**Open.** The exact timeout value, whether invalidation cancels or
recollects, prefix handling for two-character codes, and whether a session may
survive a workspace switch are undecided; the modal timeout direction is
tracked by governance register entry OQ-088.

## B-10 Security posture (Candidate)

**Candidate.** Beacon acts strictly as a **mediator**:

- **Registration grants nothing.** Registering or exposing a target adds
  addressability, not authority. A target's declared actions are metadata; a
  plugin cannot gain a capability by contributing targets or by contributing a
  provider.
- **Dispatch runs under the target owner's authority.** The invoked command
  executes with the capability grants of the plugin that owns it, validates
  its own arguments, and enforces its own resource budgets. Beacon never
  forwards its own or the caller's authority.
- **Public metadata only.** Beacon observes only public target metadata
  (`id`, `label`, `anchor`, `actions`) supplied by the provider. It never
  inspects private plugin state such as prompts, secrets, credentials, memory,
  or internal tables.
- **No new capability.** This page defines no capability identifier. A
  provider-registration capability, a target-observation capability, and the
  API version that would carry them are owner-pending (OQ-056).
- **No hot-path execution.** Collection happens on session entry; providers
  never run per-frame, and the annotation layer is presentation, not
  computation over terminal content.
- **Fail closed.** Stale handles, invalid labels, malformed metadata, and
  provider faults terminate or narrow the session instead of dispatching
  against uncertain state.

## Security review

| Concern                     | Required control                                                                                                                                     | Source                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration escalation     | Target registration grants no capability; actions are typed commands validated by their owner.                                                       | This document (Candidate); [Plugin Platform RFC](../specifications/plugin-platform-rfc.md).                                                         |
| Dispatch authority          | Dispatch executes under the target owner's grants and schema; Beacon forwards nothing.                                                               | [Plugin Platform RFC](../specifications/plugin-platform-rfc.md), threat model T-06.                                                                 |
| Private-state observation   | Beacon receives public metadata only; provider interfaces must not expose prompts, secrets, or internal tables.                                      | This document (Candidate); [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md).                   |
| Stale handles               | Generation validation fails closed with `StaleTarget`; a recycled identity never receives an old dispatch.                                           | This document (Candidate); terminal-side identity contracts (Accepted).                                                                             |
| Hot paths                   | Collection is cold-path; no per-frame polling; no provider callback in parser, layout, render, or input paths.                                       | Security invariant 4; [Plugin system](../extensibility/plugin-system.md).                                                                           |
| Input capture               | Capture is transient and session-scoped; non-label keys fail open; cancel on Esc and timeout.                                                        | This document (Candidate); terminal-side input contract (Owner-pending).                                                                            |
| Annotation and overlay load | One batched annotation layer per session; no per-label panels or OS overlays; bounded target and label counts.                                       | [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md) overlay bounds (Accepted). |
| Metadata exposure scope     | Whether one plugin may observe another plugin's target metadata within a session is undecided; the default direction is no cross-plugin observation. | This document (Open).                                                                                                                               |
| Capability dimensions       | No capability identifier is defined here; the provider and observation dimensions and their API version stay with OQ-056.                            | [Open questions register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).                                 |

This section records direction; acceptance requires independent security
reviewer evidence and a full traceability table against the shared corpus.

## Verification plan

An accepted revision would need at least:

1. Metadata and link gates: `just check` with zero markdownlint, link,
   metadata, language, agents, and hygiene issues.
2. Handle tests: `TargetRef` values are opaque outside the engine; a stale
   `(id, generation)` is rejected with `StaleTarget`; a recycled identity never
   receives a dispatch.
3. Session tests: one session at a time; cancel on Esc, timeout, and
   invalidation; fail-open behavior for non-label keys; single dispatch per
   session.
4. Scope tests: every session result is bounded by at least one scope; scope
   composition filters a single snapshot.
5. Allocation tests: deterministic labels for a fixed target set; home-row
   priority; two-character overflow; left/right spatial mapping; Lua strategy
   selection.
6. Provider tests: cold-path collection only; provider fault isolation;
   bounded target counts and label text; no provider callback on a hot path.
7. Annotation tests: one layer per session; atomic removal on dispatch,
   cancel, and timeout; no content geometry change.
8. Security negative tests: a target whose action lacks a grant is denied by
   the command owner; no private plugin state is reachable through provider
   metadata.
9. Cross-platform label and keyboard tests where the direction is adopted.

Evidence belongs to the owning implementation repositories; this page records
direction only.

## Alternatives considered

| Alternative                                              | Trade-off                                                                                              | Disposition                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Beacon as a terminal-only jump plugin                    | Reuses the existing terminal target machinery, but leaves panels, workspaces, and controls mouse-only. | Rejected as the framework scope; terminal content becomes one provider.                                                              |
| Ad-hoc Lua callbacks bound directly to targets           | Simple to register, but duplicates an execution path outside command schemas and capability checks.    | Rejected; every target dispatch is a typed command through the accepted registry.                                                    |
| Per-label panels or OS overlays                          | Straightforward rendering, but unbounded overlay count and an OS-level surface leak.                   | Rejected; one batched annotation layer inside the workspace scene.                                                                   |
| Per-frame provider polling                               | Always-fresh targets, but puts plugin code in a frame loop and violates the no-hot-path rule.          | Rejected; cold-path snapshots on session entry.                                                                                      |
| Unscoped global labeling                                 | No scope configuration, but label explosion and ambiguous semantics.                                   | Rejected; explicit scope kinds bound every session.                                                                                  |
| Beacon-owned capability grants or direct execution       | Fewer indirections, but elevates the mediator into an authority and weakens least privilege.           | Rejected; mediation is the security boundary.                                                                                        |
| Compositor `ViewId` as a user-facing target              | Directly addressable presentation surfaces, but conflates compositor internals with user objects.      | Rejected; users target panels, workspaces, controls, command blocks, and domain objects.                                             |
| Target registration as an implicit capability escalation | Convenient for plugin authors, but registration must grant nothing for the sandbox to hold.            | Rejected; see the dependency-versus-capability principle in the [Plugin Ecosystem Model](../architecture/plugin-ecosystem-model.md). |

## Affected contracts

| Direction                                | Status                                                                                                    | Owning document                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-1 identity and mouse/keyboard duality  | Candidate; the terminal-side extraction and core engine are owner-pending                                 | This page; [Semantic Terminal RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/semantic-terminal-rfc.md) (candidate terminal-side scope; extraction owner-pending)                                                                             |
| B-2 `Action × Target` grammar            | Candidate; dispatch rides the accepted command registry                                                   | [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md) command registry (Accepted), [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (Accepted)                                                  |
| B-3 `TargetRef` handles                  | Candidate; the identity hierarchy it relies on is Accepted                                                | [Workspace Compositor Specification](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/workspace-compositor.md), [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md) (Accepted) |
| B-4 discovery and provider tiers         | Candidate; the semantic UI property surface is owner-pending terminal side                                | [bitty-terminal-docs specifications tree](https://github.com/bitty-terminal/bitty-terminal-docs/tree/main/specifications) (owner-pending)                                                                                                                                         |
| B-5 scopes                               | Candidate                                                                                                 | This page                                                                                                                                                                                                                                                                         |
| B-6 label allocation                     | Candidate; the allocator is a Core mechanism, the strategy surface is Lua policy                          | This page; [Configuration Model RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/configuration-model-rfc.md) for the configuration boundary (Accepted)                                                                                         |
| B-7 annotation layer                     | Candidate; composes with accepted bounded overlay rules                                                   | [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md) (Accepted)                                                                                                                                               |
| B-8 Core/plugin split                    | Candidate; the plugin is an ordinary package under accepted manifest, capability, and lifecycle contracts | [Plugin Platform RFC](../specifications/plugin-platform-rfc.md), [Plugin Host Runtime RFC](../runtime/plugin-host-runtime-rfc.md) (Accepted)                                                                                                                                      |
| B-9 primitives and session state machine | Candidate                                                                                                 | This page                                                                                                                                                                                                                                                                         |
| B-10 security posture                    | Candidate; must not weaken any accepted normative control                                                 | [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) and [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) (Normative)                                                        |

## Open points

These are **candidate open items, not accepted open questions**. Each must be
decided in the owning contract before any direction here becomes contract:

1. Owner review of the elevation of Beacon from a terminal-scope sub-feature to
   a workspace-wide targeting framework, including the terminal-side extraction
   of the scope that this page records (register entry OQ-089).
2. Owner approval of the six primitives and the `Action × Target` interaction
   model, including the two grammars and their context menu.
3. Formal naming of the terminal-side Rust core mechanisms
   (`TargetEngine`/`AnnotationEngine` versus a Beacon Core name) and the
   boundary between Core and the Lua plugin.
4. The `TargetRef` wire shape, derived-provider composition, and handle
   validity across panel moves and workspace changes.
5. The provider registration surface, its capability dimensions, and the API
   version that would carry it (register entry OQ-056).
6. The semantic UI property contract for third-party components and the
   collection budget for providers.
7. Scope defaults per operator, scope composition rules, and whether any
   derived scope kind is needed.
8. Label overflow threshold, handedness pools, two-character grammar, and the
   Lua configuration surface for strategies.
9. Session timeout, invalidation behavior, prefix handling, and cross-workspace
   session behavior (register entry OQ-088).
10. The scene-layer ownership, z-order, and animation policy of the annotation
    layer, and the per-session label budget.
11. Cross-plugin metadata observation scope: whether one plugin may see
    another plugin's target metadata within a session.

## Acceptance criteria

An accepted version of this direction would need:

1. Independent review by the plugin-ecosystem category owner, a docs curator,
   and a security reviewer, with explicit terminal-side owner coordination for
   the Core mechanism and the scope extraction.
2. Every direction above either promoted with an owning contract or retained
   as an explicit open point; no direction silently inherited by a sibling
   document.
3. A capability and API-version disposition for provider registration and
   target observation (OQ-056), reconciled with the accepted v1 surface.
4. A `TargetRef` generation and stale-handle contract that composes with the
   accepted identity hierarchy instead of restating it.
5. A `StaleTarget` failure taxonomy with verification evidence at the owning
   implementation repository.
6. No weakening of any normative security control; every high-risk identifier
   receives independent security review.

## P0 Review Sign-off

Not signed. This document is a **draft candidate**: it records direction for
future review and records no accepted contract. P0 review and sign-off apply
only when the direction is proposed for acceptance in an owning contract, with
the terminal-side owner's coordination for the Core mechanism and the scope
extraction.

## References

- [Semantic Terminal RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/semantic-terminal-rfc.md) —
  terminal-side candidate that currently records Beacon within terminal scope;
  the extraction is owner-pending.
- [Panel and Workspace Interaction (Candidate)](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-workspace-interaction-candidate.md) —
  candidate interaction, identity, and Bar direction the workspace targeting
  composes with.
- [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md) —
  accepted panel identity, focus routing, command registry, and overlay bounds.
- [Workspace Compositor Specification](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/workspace-compositor.md) —
  accepted identity hierarchy and interaction contract.
- [bitty-terminal-docs specifications tree](https://github.com/bitty-terminal/bitty-terminal-docs/tree/main/specifications) —
  owner-pending terminal-side core engine and UI runtime candidates.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) — accepted
  capability, command, and lifecycle contract.
- [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md) —
  accepted v1 host surface and exclusions.
- [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md) — accepted
  resource ceilings and failure semantics.
- [Plugin system](../extensibility/plugin-system.md) — extension levels,
  register-versus-claim, and presentation boundaries.
- [Plugin Ecosystem Model](../architecture/plugin-ecosystem-model.md) —
  candidate plugin graph and dependency-versus-capability discipline.
- [UI Extensibility Architecture](../architecture/ui-extensibility-architecture.md) —
  candidate extension-point inventory and ownership boundaries.
- [Official plugin onboarding](../product/official-plugin-onboarding.md) and
  [Bundled-Plugin Split Decision](../product/bundled-plugin-split-decision.md) —
  product-side plugin identity and registration state.
- [Open questions register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) —
  OQ-052, OQ-056, OQ-088, and OQ-089 owner-pending decisions.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  and [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) —
  normative posture and abuse cases.
