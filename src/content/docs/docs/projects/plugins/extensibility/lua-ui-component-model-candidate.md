---
title: Lua UI Component Model (Candidate)
description: Draft candidate direction for a five-level Lua UI component ecosystem with minimal primitives composition-based widgets theming accessibility and panel services
category: extensibility
audience: plugin-author
document_type: specification
status: draft
website_publish: false
sidebar_order: 27
---

# Lua UI Component Model (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document records the plugin-ecosystem
> slice of a Lua UI component ecosystem: the part this repository would own if
> the direction were ever reviewed and accepted. It authorizes no shipped,
> stable, or compatibility-guaranteed behavior, weakens no accepted source it
> cites, and makes no implementation claim. Component names, composition
> patterns, theme tables, and Lua shapes repeated here are direction, not
> contract. The terminal-side UI runtime that would evaluate any of this is
> recorded as an owner-pending pointer, not as content of this document.

## Purpose and scope

This document freezes the recorded direction for a layered Lua UI component
ecosystem so future design work starts from a stable input instead of
reconstructing the discussion. It refines, by reference only, the accepted
Plugin API v1 declarative UI surface, the accepted scene-node and rich-block
contracts, the accepted per-plugin VM isolation, and the candidate framework
and Panel/Activity directions already recorded in this corpus. It changes none
of them.

The central claim of the direction is that Bitty composes application UI from a
**small set of minimal primitives plus massive Lua composition**, instead of
cloning the HTML element set: markup languages carry document semantics, forms,
SEO, and backward compatibility, and Bitty sheds that baggage while keeping the
component ergonomics. A `Button` is not a required Rust class; it is composed
policy. A `Card` is a composition. A `Sidebar` is a layout pattern. The
five-level hierarchy below makes that ordering explicit.

In scope (all **Candidate** unless cited otherwise):

- U-1: the five-level UI hierarchy (Rust mechanisms, Lua primitives, standard
  components, domain components, applications) and its relationship to the
  accepted v1 declarative slot UI.
- U-2: Level 0 Rust mechanisms.
- U-3: Level 1 Lua primitives.
- U-4: Level 2 standard components (`bitty-ui-core`).
- U-5: Level 3 domain components and Level 4 applications.
- U-6: composition from minimal primitives, with Button, Card, and Sidebar
  examples.
- U-7: complex widgets as Rust mechanism plus Lua appearance.
- U-8: pluggable theming through Lua token tables and swappable third-party
  design frameworks.
- U-9: accessibility roles bound by standard components.
- U-10: the panel service model: `PanelProvider`, `ActivityStack`, decoupled
  plugin lifecycle, the attention-request protocol, panel chrome slots, and
  plugin rule requests.

Out of scope and owned elsewhere (pointers, not content):

- the terminal-side UI runtime that owns the retained declarative UI tree, tree
  diffing, layout, hit-testing, focus, text shaping, IME, scrolling physics, the
  accessibility tree, and GPU submission (owner-pending,
  [bitty-terminal-docs specifications tree](https://github.com/bitty-terminal/bitty-terminal-docs/tree/main/specifications);
  the UI runtime candidate is in flight);
- panel lifecycle, overlay capacity, focus routing, and the Event Bus contract
  (accepted,
  [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md));
  the presentation-mode surface in that RFC stays gated and Open
  (`RFC-OQ-9`);
- the compositor, decoration, sizing, and animation limits (accepted,
  [Workspace Compositor Specification](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/workspace-compositor.md)
  and the accepted appearance and animation RFCs in the shared governance
  repository);
- Workspace/View/Panel/Activity identity, `PanelProvider` trait spelling, and
  panel-to-View placement (candidate and owner-pending,
  [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md)
  open questions, plus the candidate
  [Panel and Workspace Interaction](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-workspace-interaction-candidate.md)
  direction);
- the `ResolvedStyle` precedence cascade and typed panel rules (terminal-side
  candidate; this page records only the plugin-side request discipline);
- plugin capability dimensions and the API version that would carry component,
  panel, and theming surfaces (open, governance register entry OQ-056);
- the panel provider contract question (open, the terminal-side
  `RFC-OQ-1`..`RFC-OQ-9` questions in the
  [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md#open-questions),
  especially `RFC-OQ-2` trait spelling, `RFC-OQ-3` placement, and `RFC-OQ-5`
  capability mapping);
- shared governance, decision, and security corpora (linked, never copied,
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs)).

The accepted v1 UI surface is unchanged and remains the only contracted
surface: `bitty.ui.mount`/`bitty.ui.update` with a closed slot set and `Text`,
`Row`, `Column`, and `List` nodes only. Everything below the accepted line in
this document is a proposal for the later widget stage already anticipated by
the [Plugin Ecosystem Model](../architecture/plugin-ecosystem-model.md) and the
[UI Extensibility Architecture](../architecture/ui-extensibility-architecture.md);
no `ui.*` sketch here opens a panel-provider, canvas, focus, clipboard,
animation-tick, or low-level rendering API.

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  untrusted-by-default posture, capability families, presentation-not-truth,
  no-hot-path execution, bounded inputs, and safe-mode startup.
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  resource exhaustion, image expansion, plugin authority, hot paths, and data
  flows.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md): accepted
  manifest, capability grammar, grants, commands, events, and lifecycle
  generations.
- [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md):
  accepted slot set, node subset, handle semantics, `ui.rich`/`ui.overlay`
  gates, and the explicit exclusions from v1.
- [Plugin Host Runtime RFC](../runtime/plugin-host-runtime-rfc.md) and
  [Lua Runtime RFC](../runtime/lua-runtime-rfc.md): accepted per-plugin VM
  lifecycle, sandbox, and module resolution.
- [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md): accepted
  resource ceilings and failure semantics.
- [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md):
  accepted `SceneNode` and `RichBlock` contracts.
- [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md):
  accepted panel identity, focus routing, and overlay bounds.
- [Plugin system](../extensibility/plugin-system.md) (draft): the governing
  boundary that plugins alter presentation but never Terminal Truth is recorded
  there as accepted direction, while extension levels, register-versus-claim
  discipline, and the semantic-primitive ceiling are candidate contract; this
  page preserves those boundaries and adds no primitive.

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

| Term             | Meaning in this document                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Primitive        | A Level 1 Lua node with a direct Rust mechanism behind it; the extension ceiling for composition.                          |
| Standard         | A Level 2 component composed from primitives and shipped as the shared `bitty-ui-core` library.                            |
| Domain component | A Level 3 component that models a domain object (git, containers, agents) and is owned by a domain plugin or application.  |
| Composition      | Building a higher-level component from primitives and policies rather than adding a new runtime element kind.              |
| Token            | A named theme value (spacing, radius, color) consumed by components; never a renderer or GPU handle.                       |
| Framework        | A replaceable pure-Lua Level 2 library that styles and lays out standard components (for example a Material-like library). |
| Retained tree    | The declarative UI tree that Lua emits on state change, which Rust reconciles; Lua never runs a per-frame draw loop.       |

## U-1 The five-level UI hierarchy (Candidate)

**Candidate.** Bitty UI is organized in five levels, and each level has an
explicit owner and an explicit boundary against the accepted corpus:

| Level | Name                | Contents                                                                                                                   | Owner                      |
| ----- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 0     | Rust mechanisms     | Layout, shaping, image decode, scroll physics, input and IME, focus, hit-testing, animation interpolation, a11y tree, GPU. | Terminal core              |
| 1     | Lua primitives      | `Box`, `Text`, `Image`, `ScrollView`, `VirtualList`, `TextInput`, `Canvas`, `Terminal`, `Overlay`.                         | Host-exposed, Lua-composed |
| 2     | Standard components | `Button`, `Card`, `List`, `Sidebar`, `Tabs`, `Toolbar`, `Dialog`, `Tooltip`, `Menu`, `Table`, `Tree`, `CommandPalette`.    | `bitty-ui-core` library    |
| 3     | Domain components   | `WorkspaceSidebar`, `GitBranchList`, `DockerContainerCard`, `AgentStatusCard`, `FileTree`, `ChatMessage`, `ModelSelector`. | Domain plugins/apps        |
| 4     | Applications        | Docker surfaces, AI panels, git views, monitors, file managers, editors.                                                   | Application plugins        |

Rules recorded for the direction:

- A lower level never depends on a higher level; a standard component may use
  primitives, and an application may use standards, but a Rust mechanism never
  calls into Lua policy.
- Levels 1 and 2 are library code inside the plugin VM, not new host
  privileges. Using them grants nothing beyond the capability that admits the
  contribution in the first place.
- The hierarchy is a responsibility model, not a packaging mandate: nothing
  requires `bitty-ui-core` to be a separate package, and several framework
  implementations may coexist (U-8).
- The list of names at Levels 1 and 2 is illustrative vocabulary for the
  direction. It is not an accepted primitive inventory, and the terminal-side
  UI runtime must first define the retained-tree contract before any of it can
  become an interface.
- The retained-tree rule is firm: Lua emits a declarative tree only on state
  change, semantic actions, timers, or service events. Lua never runs an
  immediate-mode per-frame draw loop; that prohibition carries two sources: the
  normative no-hot-path rule in the
  [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  and the retained/declarative preference recorded as candidate direction in
  the [UI Extensibility Architecture](../architecture/ui-extensibility-architecture.md)
  and the [Plugin Ecosystem Model](../architecture/plugin-ecosystem-model.md).

**Open.** Whether Level 2 is one library or several independently versioned
libraries, which level owns the component registry, and how a domain component
declares its primitive dependencies are undecided.

## U-2 Level 0: Rust mechanisms (Candidate)

**Candidate.** Level 0 is the set of mechanisms a component model cannot
implement safely or performantly in Lua:

- layout computation over the retained tree;
- text shaping, grapheme segmentation, and font fallback;
- image decode and image-store admission;
- scroll physics and viewport math;
- text input, cursor movement, selection, and IME composition;
- focus management and deterministic focus routing;
- hit-testing and pointer capture;
- animation interpolation and reduced-motion handling;
- the accessibility tree and its platform bridge;
- paint-list generation and GPU submission.

This level is terminal-side ownership by construction. The plugin-side
direction is a boundary statement: **a Lua component may ask Level 0 for
semantics, never receive Level 0 internals**. There is no renderer, pipeline,
texture, grid-object, or native-window handle in any Lua value, and no Lua
callback runs inside the layout, hit-test, input, or render hot paths.

**Owner-pending.** The concrete terminal-side mechanism set, its public
semantic surface, and the retained-tree diffing contract belong to the
terminal-side UI runtime candidate and the accepted compositor contract; this
page asserts no mechanism API.

## U-3 Level 1: Lua primitives (Candidate)

**Candidate.** Level 1 is a small, closed set of Lua nodes with a direct Rust
mechanism behind each:

| Primitive     | Mechanism behind it                                        |
| ------------- | ---------------------------------------------------------- |
| `Box`         | Layout node with style, padding, border, and child layout. |
| `Text`        | Shaped text with styled spans.                             |
| `Image`       | Admitted image asset with fit and decode bounds.           |
| `ScrollView`  | Viewport, scroll physics, and clipping.                    |
| `VirtualList` | Windowed row instantiation over a data source.             |
| `TextInput`   | Editing, cursor, selection, and IME composition.           |
| `Canvas`      | Bounded display-list submission rendered by Rust.          |
| `Terminal`    | Terminal surface embedding with PTY truth owned by Core.   |
| `Overlay`     | Transient presentation layer above the tree.               |

Rules recorded for the direction:

- The set is deliberately minimal. When a component needs behavior no
  primitive provides, the correct response is an upstream mechanism request,
  not a plugin-side workaround that reaches past the ceiling; this restates the
  semantic-primitive ceiling recorded as candidate contract in the draft
  [Plugin system](../extensibility/plugin-system.md).
- `Canvas` accepts bounded display lists at low frequency; Lua does not draw
  per frame. A visualization submits scene commands when its data changes, and
  the Rust compositor interpolates at display rate.
- `Terminal` embeds terminal content; it never exposes grid writes, cursor
  mutation, or raw PTY access to the embedding component.
- `Image` decode and cache are bounded and admitted by the host; a component
  cannot raise its own image budget.
- The exact node names, schemas, and versioning belong to the terminal-side UI
  runtime contract; the accepted v1 subset remains `Text`, `Row`, `Column`, and
  `List` until that contract exists.

**Open.** Whether `Overlay` is a primitive or a presentation-mode property,
whether `Canvas` is bounded by a draw-call or area budget, and how `Terminal`
content participates in focus routing are undecided.

## U-4 Level 2: standard components (`bitty-ui-core`) (Candidate)

**Candidate.** Level 2 is the standard component library
**`bitty-ui-core`**: `Button`, `Card`, `List`, `Sidebar`, `Tabs`, `Toolbar`,
`Dialog`, `Tooltip`, `Menu`, `Table`, `Tree`, and `CommandPalette`. The library
is pure Lua policy over Levels 0 and 1, distributed as an ordinary plugin
library under the accepted manifest, service, and lifecycle rules. Framework
packages are not privileged: they may be replaced (U-8), and no Core mechanism
depends on them.

Rules recorded for the direction:

- Components own interaction policy (keyboard activation, focus order,
  disabled states) and appearance defaults via tokens; they do not own
  mechanism.
- Complex components (`Table`, `Tree`, `CommandPalette`) delegate
  virtualization, filtering, and viewport behavior to `VirtualList` and the
  host, not to Lua loops over full data sets.
- A component's API shape (state in, declarative tree out) is uniform; a
  component does not hold host handles and does not receive live terminal
  objects.
- `CommandPalette` composes an overlay-slot surface plus the accepted command
  registry; it does not create a second invocation path for commands.
- The accepted `tabline` exclusive-claim and status-component composition rules
  are untouched; a component library does not become an extension point by
  existing.

**Open.** The library's governance (official-first-party versus community
package, and which repository owns it), its versioning contract against the
terminal-side UI runtime, and the component API stability policy are undecided.
The API stability priority order recorded as non-normative direction in the
[Plugin system](../extensibility/plugin-system.md) is not a guarantee.

## U-5 Level 3 domain components and Level 4 applications (Candidate)

**Candidate.** Level 3 components model one domain each and live with the
plugin that owns that domain: `WorkspaceSidebar`, `GitBranchList`,
`DockerContainerCard`, `AgentStatusCard`, `FileTree`, `ChatMessage`, and
`ModelSelector` are illustrative vocabulary. Level 4 is the application
surface that composes levels 1-3 into a full plugin UI.

Rules recorded for the direction:

- A domain component may depend on `bitty-ui-core` (Level 2) and primitives,
  but never on another domain plugin's private component tree; sharing happens
  through versioned services or a published component package, consistent with
  the accepted rule that cross-plugin reuse goes through declared host services
  rather than a direct `require` of another plugin's internals
  ([Lua Runtime RFC](../runtime/lua-runtime-rfc.md)), and with the candidate
  private-module/public-contract distinction.
- A domain component receives domain data through its owning plugin's services
  and capabilities; the component itself holds no authority and cannot widen
  the plugin's grants.
- Applications remain ordinary plugins under the accepted isolation,
  capability, and resource model. "Application" is a role, not a privilege
  tier, reusing the candidate five-role taxonomy and the
  platform-versus-extension distinction in the
  [Plugin Ecosystem Model](../architecture/plugin-ecosystem-model.md).

**Open.** Whether domain components ship as part of each plugin package or as
separate component packages, and whether a shared Level 3 package is needed for
cross-plugin reuse, are undecided.

## U-6 Composition from minimal primitives (Candidate)

**Candidate.** Higher-level components are compositions, not new element kinds.
The recorded illustrative compositions are:

```text
Button  = Box + Text + focus + pointer interaction + keyboard activation + style + a11y role
Card    = Box + background + border + padding + header + content
Sidebar = Column layout + VirtualList + action buttons
```

The composition rule means:

- A `Button` does not need a Rust class; its mechanism needs are focus, hit
  testing, keyboard activation, and a11y — all Level 0 semantics a `Box` can
  request.
- A `Card` is presentation-only; it carries no interaction semantics and
  therefore no a11y role beyond grouping.
- A `Sidebar` is a layout pattern over `VirtualList`; it is not a specialized
  runtime element, and its scroll behavior comes from the host.
- Composition is where Bitty diverges from HTML: no element-bloat taxonomy is
  required, and a missing behavior becomes a primitive request rather than a
  new tag.

**Open.** The exact composition spelling (functions returning node tables,
constructor values, or a reactive wrapper) is a framework concern and is
undecided; the accepted v1 contract defines only declarative node tables.

## U-7 Complex widgets: Rust mechanism plus Lua appearance (Candidate)

**Candidate.** Complex widgets cannot be left entirely to Lua because they
involve cursor navigation, grapheme clusters, IME composition, and large
data-set viewports. The recorded split is:

| Concern                                          | Rust mechanism | Lua policy                 |
| ------------------------------------------------ | -------------- | -------------------------- |
| Virtualization (instantiate only visible rows)   | Yes            | Row appearance and actions |
| Scroll physics and viewport                      | Yes            | Scroll behavior hints      |
| Text editing, cursor, selection, IME composition | Yes            | Keymap and edit policy     |
| Table/Tree windowing over large data             | Yes            | Column/tree presentation   |
| Canvas display lists                             | Renderer       | Bounded scene commands     |
| Filtering and sorting data sets                  | Off-UI budgets | Component policy           |

Rules recorded for the direction:

- A component never iterates a large data set inside a Lua loop to render it;
  it supplies a bounded data source and row templates, and the host
  instantiates the visible window.
- IME composition state is host-owned; a component reads committed text and
  never reimplements composition.
- Bounded display lists are the only drawing surface: a canvas submits scene
  commands at low frequency, and smooth animation is the renderer's job.

**Open.** The bounded data-source interface, windowing parameters, and the
display-list budget (counts, area, frequency) are undecided and belong to the
terminal-side UI runtime contract; no threshold is fixed here.

## U-8 Theming and third-party design frameworks (Candidate)

**Candidate.** Spacing, radius, and color are tokens defined in Lua theme
tables. Standard components consume tokens; users and plugins can swap entire
styling libraries without touching Rust Core. Third-party design frameworks
(for example Material-like, minimal, retro, TUI-like, pixel, or
platform-styled libraries) are pure Lua Level 2 libraries running inside the
plugin VM.

Rules recorded for the direction:

- A token is data, not a host handle: no renderer, texture, shader, or GPU
  value crosses the boundary.
- Framework packages are optional ordinary plugins. Independent versions, the
  accepted manifest and grant rules, and generation/resource budgets apply;
  "pure Lua framework" never delegates network, secret, process-spawn, or
  scheduler enforcement.
- Framework substitution is a consumer choice, not a Core feature: swapping
  frameworks changes component appearance and API sugar, never the underlying
  accepted scene or capability contracts.
- A framework cannot style surfaces it does not own. Core-owned chrome
  (window chrome, workspace decoration) remains outside any plugin theme, and
  plugin appearance contributions for a plugin's own content stay a candidate
  under the
  [UI Extensibility Architecture](../architecture/ui-extensibility-architecture.md)
  P3 direction and the shared register entry OQ-044.
- The recorded style cascade (safety policy, user panel rules, workspace rules,
  user theme, plugin preference, plugin content theme, framework default) is a
  terminal-side candidate direction; this page records only that plugin theming
  composes below user authority and cannot override it.

**Open.** Token taxonomy and naming, theme file discovery, framework
compatibility policy, and whether themes are user configuration or plugin
packages are undecided. Capability dimensions and the API version for a theming
surface remain with register entry OQ-056.

## U-9 Accessibility semantics (Candidate)

**Candidate.** Visual styling is free; interactive semantics are disciplined.
Standard components bind appropriate accessibility metadata automatically:

- `role` metadata for the component kind;
- accessible names derived from content with an explicit override;
- keyboard activation and focus management for interactive components;
- disabled and busy states;
- state announcements where the host accessibility bridge supports them.

Rules recorded for the direction:

- A composed interactive component that skips its accessible role is an author
  defect; the standard library's job is to make the correct binding the default
  and the incorrect one awkward.
- Accessibility metadata is part of the component contract, not an optional
  decoration: primitives carry whatever the host requires for the bridge, and
  Level 2 binds it consistently.
- Custom-drawn canvases remain presentation; any interaction they expose must
  surface through standard components or explicit semantic properties, not
  through raw hit-test coordinates.
- The terminal surface's own accessibility behavior is terminal-side ownership
  and is not redefined here.

**Open.** The a11y property schema, the platform bridge scope, and the
conformance bar for third-party frameworks are undecided and belong to the
terminal-side UI runtime contract.

## U-10 Panel service model (Candidate)

**Candidate.** The plugin-side panel model has five parts:

1. **`PanelProvider`.** A plugin-provided factory that declares one or more
   panel types and mounts content into a host-managed panel. It requires a
   dedicated capability and remains excluded from Plugin API v1: panel
   providers wait for the terminal-side panel contract. The accepted
   [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md)
   names the `PanelProvider` mechanism and keeps its trait spelling and the
   panel-to-View placement open; the current Core-internal panel registry path
   is not a plugin-facing registration surface.
2. **`ActivityStack`.** A panel hosts an activity stack with push/pop
   navigation (for example Overview, then Container Detail, then Logs). This
   direction is recorded in the
   [Plugin Ecosystem Model](../architecture/plugin-ecosystem-model.md) Panel
   and activity section: a panel is not an activity, and popping back restores
   the previous activity without killing the session behind it.
3. **Decoupled plugin lifecycle.** Closing a panel does not unload its plugin.
   Panel visibility, focus, and presentation are independent axes from plugin
   activation; a background plugin keeps its VM and its state and requests
   attention instead of stealing focus. This restates the accepted
   generation-owned lifecycle at the panel boundary and the candidate
   Panel/Activity direction; it does not relax any resource budget.
4. **Attention-request protocol.** A plugin whose panel is hidden or unfocused
   raises a bounded attention request (a badge, an urgency hint, or a
   notification through the accepted `platform.notify` capability). The user
   decides whether to focus; a plugin never forces focus, never re-raises
   unboundedly, and never escalates its own display priority.
5. **Panel chrome slots and rule requests.** A plugin may request chrome for
   its own panel (title, badges, actions, and a declared set of appearance
   rules) rather than setting it. Core and user configuration resolve the final
   chrome; a plugin request is a preference, and rejected or conflicting
   requests resolve deterministically rather than by load order. The recorded
   precedence cascade and typed panel rules are terminal-side candidate
   direction; the accepted corpus has no plugin-facing chrome or appearance
   mutation API, and the candidate P3 appearance direction is tracked under
   register entry OQ-044.

**Attention aggregation direction (candidate).** The counting half of the
part-4 protocol — where a request is registered, deduplicated, ordered, and
expired — belongs at a host-side point rather than with the requesting
plugin: no plugin sees the full request set, so a per-requester counter
cannot enforce the never-escalate rule against other requesters. This
narrows the direction of the recorded open question in the terminal UI
corpus ("whether attention is a plugin counter or a host service",
[UI runtime candidate](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/ui-runtime-candidate.md))
while the ownership decision stays open. The candidate split: participants
raise one request primitive; a host-side aggregation point registers,
deduplicates, orders, and expires requests under a host-admitted budget; the
terminal-side notification surface renders what the aggregation point
admits. Which owner provides the aggregation point, the budget shape, and
expiry semantics stay open.

**Open.** The `PanelProvider` registration and mount contract, the capability
mapping for panel creation, the activity push/pop semantics and session
survival rules, the attention-request budget and user-surface shape,
aggregation ownership, and the panel chrome slot inventory and rule-request
schema are undecided. They are
owner-pending with the terminal-side panel contract (the
[Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md#open-questions)
`RFC-OQ-1`..`RFC-OQ-9` questions) and with register entry OQ-056 for capability
dimensions.

## Security review

| Concern                     | Required control                                                                                                                                       | Source                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI on hot paths             | The retained-tree rule keeps Lua out of layout, input, and render paths; Lua emits state, Rust computes frames.                                        | Security invariant 4; [Plugin system](../extensibility/plugin-system.md).                                                                                                           |
| Presentation not truth      | Components alter presentation only; no grid, cursor, mode, scrollback, or layout mutation.                                                             | [Plugin system](../extensibility/plugin-system.md); [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md).                                                       |
| Component library privilege | Levels 1-2 are in-VM Lua libraries; they confer no capability and cannot bypass host admission.                                                        | [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md).                                                                                                                 |
| Image and canvas budgets    | Image decode and cache stay inside the accepted host image budgets; any canvas display-list surface would need a host-admitted budget before adoption. | Threat model T-01/T-02; [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md) image contract (Accepted). |
| Theming authority           | Themes and rule requests compose below user and Core authority; plugin-supplied appearance stays candidate and capability-gated.                       | [UI Extensibility Architecture](../architecture/ui-extensibility-architecture.md) P3 (Candidate); register entry OQ-044.                                                            |
| Panel focus and attention   | Attention requests are bounded and user-resolved; a plugin never forces focus or escalates display priority.                                           | This document (Candidate); [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md) focus routing (Accepted).       |
| Lifecycle decoupling        | Closing a panel is not plugin unload; generation-owned resources and budgets still govern disposal.                                                    | [Plugin Host Runtime RFC](../runtime/plugin-host-runtime-rfc.md).                                                                                                                   |
| Accessibility data          | Accessible names and roles are user-visible metadata; the host bridge, not Lua, owns platform exposure.                                                | This document (Candidate).                                                                                                                                                          |
| Capability dimensions       | No capability identifier is defined here; component, panel, theming, and attention dimensions stay with OQ-056.                                        | [Open questions register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).                                                                 |

This section records direction; acceptance requires independent security
reviewer evidence and a full traceability table against the shared corpus.

## Verification plan

An accepted revision would need at least:

1. Metadata and link gates: `just check` with zero markdownlint, link,
   metadata, language, agents, and hygiene issues.
2. Component composition tests: Button, Card, and Sidebar compose from
   primitives with no new runtime element kind; focus and activation semantics
   come from Level 0.
3. Virtualization tests: large data sets instantiate only visible rows; no Lua
   loop iterates the full set; scroll behavior is host-driven.
4. TextInput/IME tests: composition state is host-owned; committed text and
   selection round-trip correctly.
5. Canvas tests: bounded display lists only; no per-frame Lua draw loop; the
   renderer interpolates.
6. Theming tests: frameworks swap without Core changes; token-only inputs; no
   host handle crosses the boundary; plugin appearance stays below user
   authority.
7. Accessibility tests: default role, name, activation, disabled, and busy
   bindings for every standard component.
8. Panel tests: panel close does not unload the plugin; activity push/pop
   preserves the hosted session; attention requests are bounded, never force
   focus, and aggregate through the host-side point rather than
   per-requester counters; chrome rule requests resolve deterministically.
9. Negative capability tests: a component attempting an unadmitted host
   operation fails closed; presentation-only violations are rejected.

Evidence belongs to the owning implementation repositories; this page records
direction only.

## Alternatives considered

| Alternative                                | Trade-off                                                                                        | Disposition                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Clone a full HTML-like element set         | Familiar authoring surface, but carries document semantics, forms, SEO, and legacy baggage.      | Rejected; Bitty uses minimal primitives plus composition.                                     |
| Immediate-mode Lua draw loops              | Maximum authoring freedom, but puts Lua on the frame path and violates the no-hot-path rule.     | Rejected; retained declarative tree with Lua state emission only.                             |
| One mandatory official component framework | Consistent look and API, but freezes framework evolution and forces Core coupling.               | Rejected; competing replaceable Lua frameworks over a small stable surface.                   |
| Fully Lua-implemented complex widgets      | Smallest host surface, but reimplements IME, virtualization, and scroll physics unsafely in Lua. | Rejected; complex widgets are Rust mechanism plus Lua appearance.                             |
| Per-component native/OS widgets            | Native fidelity, but breaks Bitty-native retained rendering and cross-platform consistency.      | Rejected; the retained tree over the shared renderer stays the model.                         |
| Plugin-set panel appearance and focus      | Simplest for plugin authors, but transfers user-facing authority to plugins.                     | Rejected; requests compose below Core and user authority, and attention never forces focus.   |
| Panel close as implicit plugin unload      | Frees resources promptly, but destroys sessions and state on a presentation action.              | Rejected; lifecycle decouples panel visibility from plugin activation under accepted budgets. |
| Components as a Core privilege tier        | Easier distribution, but makes an ordinary library part of Core and blocks substitution.         | Rejected; `bitty-ui-core` is ordinary Lua policy and frameworks may replace it.               |

## Affected contracts

| Direction                               | Status                                                                                              | Owning document                                                                                                                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U-1 five-level hierarchy                | Candidate; extends the accepted v1 slot UI toward the widget stage                                  | [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md) (Accepted), [UI Extensibility Architecture](../architecture/ui-extensibility-architecture.md) (Candidate)                            |
| U-2 Rust mechanisms                     | Owner-pending; terminal-side UI runtime                                                             | [bitty-terminal-docs specifications tree](https://github.com/bitty-terminal/bitty-terminal-docs/tree/main/specifications)                                                                                     |
| U-3 Lua primitives                      | Candidate; the node inventory is unaccepted and depends on the UI runtime contract                  | [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md) (Accepted subset), terminal-side UI runtime (Owner-pending)                                                                          |
| U-4 `bitty-ui-core` standard components | Candidate; library governance and versioning Open                                                   | This page; [Plugin system](../extensibility/plugin-system.md) extension levels                                                                                                                                |
| U-5 domain components and applications  | Candidate; reuses the candidate role taxonomy and accepted isolation                                | [Plugin Ecosystem Model](../architecture/plugin-ecosystem-model.md) (Candidate taxonomy), [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md) (Accepted)                                       |
| U-6 composition from primitives         | Candidate; conflicts with none, requires the retained-tree contract                                 | [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md) (Accepted scene nodes)                                                       |
| U-7 complex widgets                     | Candidate; mechanism is Owner-pending, appearance policy is plugin-side                             | [bitty-terminal-docs specifications tree](https://github.com/bitty-terminal/bitty-terminal-docs/tree/main/specifications)                                                                                     |
| U-8 theming and frameworks              | Candidate; plugin appearance remains under the P3 candidate and register entry OQ-044               | [UI Extensibility Architecture](../architecture/ui-extensibility-architecture.md) P3, [Plugin contract direction](../specifications/plugin-contract-direction.md#owner-pending-pointers) (framework layering) |
| U-9 accessibility semantics             | Candidate; property schema and bridge are Owner-pending                                             | [bitty-terminal-docs specifications tree](https://github.com/bitty-terminal/bitty-terminal-docs/tree/main/specifications)                                                                                     |
| U-10 panel service model                | Candidate; `PanelProvider` remains excluded from v1 and blocked on the terminal-side panel contract | [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md) (Accepted identity and focus; provider surface and presentation modes open)          |

## Open points

These are **candidate open items, not accepted open questions**. Each must be
decided in the owning contract before any direction here becomes contract:

1. Owner review of the five-level hierarchy and its composition principle,
   including the relationship to the accepted v1 slot UI and the normative
   no-hot-path rule that the retained-tree direction applies at the UI layer.
2. Adoption and governance of `bitty-ui-core`: ownership repository, release
   cadence, compatibility policy, and whether it is official-first-party.
3. The Level 1 primitive inventory, node schemas, and the retained-tree
   contract that evaluates them (terminal-side UI runtime, owner-pending).
4. Complex-widget mechanisms and their bounded interfaces: virtualization,
   scroll physics, text editing, canvas display lists, and IME composition.
5. Token taxonomy, theme discovery, and the framework compatibility and
   substitution policy.
6. Accessibility property schema, bridge scope, and the framework conformance
   bar.
7. The `PanelProvider` registration and mount contract, panel capability
   mapping, and panel-to-View placement (terminal-side `RFC-OQ-1`..`RFC-OQ-9`
   in the [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md#open-questions),
   especially `RFC-OQ-2`, `RFC-OQ-3`, and `RFC-OQ-5`).
8. Activity push/pop semantics and session survival across panel presentation
   changes.
9. The attention-request budget, user-surface shape, aggregation ownership,
   and notification composition with the accepted `platform.notify`
   capability.
10. Panel chrome slot inventory, rule-request schema, and the deterministic
    conflict-resolution rule.
11. Capability dimensions and the API version that would carry any of the
    above (register entry OQ-056).

## Acceptance criteria

An accepted version of this direction would need:

1. Independent review by the plugin-ecosystem category owner, a docs curator,
   and a security reviewer, with terminal-side owner coordination for every
   mechanism and panel boundary.
2. The terminal-side UI runtime contract in place before any Level 1-2
   interface is promoted; no component API is accepted against an undefined
   retained-tree contract.
3. A component governance and versioning decision for `bitty-ui-core` and for
   third-party frameworks, including the substitution rules.
4. A theming and appearance disposition that keeps Core chrome out of plugin
   authority and composes plugin requests below user configuration.
5. An accessibility contract with a conformance bar for standard components.
6. A panel service contract covering provider registration, activity
   semantics, lifecycle decoupling, attention bounds, and chrome requests, or
   explicit retention of each as an open point.
7. No weakening of any normative security control; every high-risk identifier
   receives independent security review.

## P0 Review Sign-off

Not signed. This document is a **draft candidate**: it records direction for
future review and records no accepted contract. P0 review and sign-off apply
only when the direction is proposed for acceptance in an owning contract, with
the terminal-side owner's coordination for mechanisms and panel boundaries.

## References

- [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md) —
  accepted v1 declarative UI surface and exclusions.
- [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md) —
  accepted `SceneNode` and `RichBlock` contracts.
- [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md) —
  accepted panel identity, focus routing, and open provider questions.
- [Panel and Workspace Interaction (Candidate)](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-workspace-interaction-candidate.md) —
  candidate identity and interaction direction.
- [Workspace Compositor Specification](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/workspace-compositor.md) —
  accepted compositor, sizing, and decoration boundary.
- [bitty-terminal-docs specifications tree](https://github.com/bitty-terminal/bitty-terminal-docs/tree/main/specifications) —
  owner-pending terminal-side UI runtime and core engine candidates.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) — accepted
  manifest, capability, and lifecycle contract.
- [Plugin Host Runtime RFC](../runtime/plugin-host-runtime-rfc.md) and
  [Lua Runtime RFC](../runtime/lua-runtime-rfc.md) — accepted VM lifecycle and
  sandbox.
- [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md) — accepted
  resource ceilings.
- [Plugin system](../extensibility/plugin-system.md) — extension levels,
  composition boundary, and author rules.
- [UI Extensibility Architecture](../architecture/ui-extensibility-architecture.md) —
  candidate extension points, P3 appearance, and framework-level Lua UI.
- [Plugin Ecosystem Model](../architecture/plugin-ecosystem-model.md) —
  candidate Panel/Activity, widget-progression, and four-layer framework
  directions.
- [Plugin contract direction (candidate)](../specifications/plugin-contract-direction.md) —
  candidate framework layering and owner-pending pointer register.
- [Open questions register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) —
  OQ-044 and OQ-056 owner-pending decisions.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  and [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) —
  normative posture and abuse cases.
