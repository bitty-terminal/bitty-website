---
title: TUI to Native Migration Path (Candidate)
description: Draft candidate direction for the L0-L4 TUI-to-Native migration ladder, per-application-type guidance, and the Backend Service Plugin pattern
category: extensibility
audience: plugin-author
document_type: specification
status: draft
website_publish: false
sidebar_order: 29
---

# TUI to Native Migration Path (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document records a candidate
> direction for how legacy terminal applications become Bitty plugins: the
> L0-L4 compatibility ladder, per-application-type guidance, and the Backend
> Service Plugin pattern. It authorizes no shipped, stable, or
> compatibility-guaranteed behavior, weakens no accepted source it cites, and
> makes no implementation claim. All levels above L1, all UI shapes, and all
> API spellings repeated here are direction, not contract. The terminal-side
> Surface type system and the Native UI framework this direction depends on
> are recorded as not yet built (see M-7); they are owner-pending pointers,
> not content of this document.

## Purpose and scope

This document freezes the recorded migration direction so future plugin work
starts from a stable input instead of re-deriving it per application. It
gives legacy terminal applications a gradual path toward Bitty-native UI
without forcing an all-or-nothing rewrite, and it separates the reusable
backend capability from the presentation layer that renders it.

In scope (all **Candidate** unless cited otherwise):

- M-1: the three plugin kinds (Wrapped Plugin at L1, Native port at L3,
  direct backend connect that skips the TUI layer entirely).
- M-2: the core principle — reuse the capability behind the TUI, never
  convert ANSI output into Native UI.
- M-3: the L0-L4 compatibility ladder and the wrapper-to-native evolution
  sketch.
- M-4: per-application-type guidance for system monitors (`btop` type),
  Kubernetes clients (`k9s` type), NetworkManager clients (`nmtui` type),
  and editors (`Neovim` type).
- M-5: the Backend Service Plugin split (service API, state, events, and
  commands reused by Dashboard, Statusline, Wheel, and agents).
- M-6: the encouragement order (Backend/API first, structured IPC second,
  TerminalSurface last) and the CLI/TUI/Native coexistence positioning.
- M-7: the explicit built-versus-not-built boundary for the Surface type
  system and the Native UI framework.

Out of scope and owned elsewhere (pointers, not content):

- the terminal-side Surface type system and compositor scene contract
  (not built; owner-pending,
  [bitty-terminal-docs specifications tree](https://github.com/bitty-terminal/bitty-terminal-docs/tree/main/specifications));
- the terminal-side Native UI framework (retained declarative UI tree,
  layout, hit-testing, focus, GPU scene submission; not built, same tree,
  owner-pending);
- panel lifecycle, focus routing, and the Event Bus contract (accepted,
  [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md));
- the Panel/Workspace interaction direction (candidate,
  [Panel and Workspace Interaction](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-workspace-interaction-candidate.md));
- plugin capability dimensions and the API version that would carry a
  service-facing surface (open, governance register entry OQ-056);
- shared governance, decision, and security corpora (linked, never copied,
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs)).

No terminal-side document is changed, moved, or status-promoted by this
page.

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
  accepted v1 host namespaces and the explicit exclusion of panel providers
  and presentation replacement from v1.
- [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md):
  accepted per-plugin VM isolation, resource ceilings, and failure
  semantics.
- [Plugin system](plugin-system.md) (draft): the governing boundary that
  plugins alter presentation but never Terminal Truth; extension levels,
  register-versus-claim discipline, and declarative UI remain candidate
  contract there, and this page preserves those boundaries.
- [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md):
  accepted panel identity, focus routing, overlay bounds, and command-registry
  placement.

This page does not move a requirement between owners, does not add a
capability identifier, and does not downgrade a P0 gate. If any mechanism
here contradicts a normative source, the normative text wins.

## Terminology

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted document already decides the point; this page only links or restates it. |
| Candidate         | Proposed by the recorded design direction only; no review has accepted it.           |
| Owner-pending     | Belongs to another repository owner or decision; recorded here as a pointer only.    |
| Open              | Explicitly undecided; no owner decision or contract exists.                          |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

| Term                   | Meaning in this document                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrapped Plugin         | A plugin that hosts an unmodified TUI program inside a `TerminalSurface` over a PTY. Bitty observes characters only, not application semantics.                              |
| Native port            | A plugin that keeps the application's backend or data capability and reimplements the frontend on the Bitty Native UI API. No ANSI layer remains in the render path.         |
| Direct backend connect | A plugin that bypasses the TUI program entirely and connects to the underlying daemon, API, or SDK (for example D-Bus or a cloud API) with a Native UI on top.               |
| Backend Service Plugin | A headless plugin that exposes a typed service surface (API, state, events, commands) without owning its own primary UI, so multiple UI plugins can consume it.              |
| UI Plugin              | A plugin that renders a service, in a panel slot, the statusline, the Wheel, or a dashboard, under its own capability grants.                                                |
| ANSI-scrape            | The rejected approach of parsing TUI character output (borders, cards, tables) back into Native UI widgets. Fragile by construction; forbidden as a migration strategy here. |

## M-1 Three plugin kinds (Candidate)

**Candidate.** The direction distinguishes three completely different ways
an existing terminal application "becomes a plugin". They share nothing
except the starting program.

### M-1.1 Wrapped Plugin at L1 (Candidate)

The cheapest form hosts the unmodified TUI program in a `TerminalSurface`:

```text
Bitty Plugin
└── TerminalSurface
    └── PTY
        └── btop
```

The plugin owns process startup, panel placement, configuration,
lifecycle, keybindings, and workspace integration. The render path stays
fully terminal:

```text
btop
 → ANSI
 → PTY
 → VT Parser
 → Cell Grid
 → Bitty Renderer
```

The cost is near zero and compatibility is total. The limitation is
structural: Bitty sees characters, not semantics. A CPU chart, a process
list, and a memory widget are indistinguishable cell grids; there is no
smooth graph, no DPI-aware rendering, no hover, no context menu, no
sorting, no GPU-accelerated chart, and no accessibility tree. Wrapping is
the compatibility floor, never the migration goal.

### M-1.2 Native port at L3 (Candidate)

The recommended form keeps the backend and replaces the frontend. Many
TUI programs already decompose, actually or conceptually, into:

```text
Data / Backend
        ↓
Application State
        ↓
TUI Frontend
```

The direction replaces only the last layer:

```text
Data / Backend
        ↓
Application State
        ↓
Bitty Native UI
```

The render path becomes:

```text
Backend
   ↓
Bitty UI API
   ↓
Scene
   ↓
wgpu
```

A hypothetical native system monitor illustrates the shape (all names
illustrative-only):

```text
System Metrics Backend
├── CPU
├── Memory
├── Disk
├── Network
└── Processes
        │
        ▼
Bitty Plugin
├── Chart
├── Table
├── Card
└── Process Inspector
```

The original `Backend → TUI renderer → ANSI` chain is gone. In return the
plugin gains native graphs, variable font sizes, DPI-aware rendering,
mouse hover, context menus, drag and resize, sorting, animation, GPU
charts, and accessibility — plus interactions a character grid can only
simulate, such as clicking a process to open an inspector or right-clicking
it for signal, working-directory, executable, and debugger actions.

### M-1.3 Direct backend connect (Candidate)

Some programs have no backend worth reusing because the real backend sits
one layer below them. The `nmtui` family is the archetype:

```text
NetworkManager daemon
         ↓
   nmtui (TUI frontend)
```

The direction does not "port nmtui". It connects the plugin straight to
the daemon and skips the TUI layer:

```text
NetworkManager
      ↓
Bitty Plugin
      ↓
Native UI
```

Concretely, a network plugin would speak D-Bus or `libnm` and render
connections, Wi-Fi scans, Ethernet, VPN, IP configuration, and DNS as
native controls. The TUI program disappears from the architecture rather
than being wrapped or ported.

## M-2 Core principle: reuse the capability, never the characters (Candidate)

**Candidate.** The governing rule for every migration is:

> Reuse the capability behind the TUI; never convert its character output
> into Native UI.

The rejected shape parses the visual layer back into semantics:

```text
ANSI
 ↓
recognize ┌─────┐ as Card
 ↓
convert to Native UI
```

That converter is fragile by construction: every theme, resize, version
bump, and locale breaks the recognizer, and the result carries no real
application state. The recorded shape instead branches at the backend:

```text
            Existing Application
                    │
           ┌────────┴────────┐
           │                 │
       Backend/Core       TUI UI
           │
           │
           └──── Bitty Native UI
```

Where the backend separates cleanly, migration is straightforward. Where
it does not, the per-type guidance in M-4 decides whether to reimplement
against the platform source, bind the public API, or host the program's
own protocol — but the ANSI layer is never the integration point for a
Native UI.

## M-3 The L0-L4 compatibility ladder (Candidate)

**Candidate.** Bitty defines five migration levels so a program can enter
at zero cost and advance without re-planning:

| Level | Form                                                              | Native degree |
| ----- | ----------------------------------------------------------------- | ------------: |
| L0    | Plain CLI/TUI, no plugin involvement                              |            0% |
| L1    | Plugin wrapper plus `TerminalSurface`                             |           Low |
| L2    | Plugin driving an external backend or process with structured IPC |        Medium |
| L3    | Reused backend or library plus Native UI                          |          High |
| L4    | Fully Bitty-native plugin, no legacy dependency                   |          100% |

The canonical evolution sketch is the system monitor (illustrative-only).
It enters at L1 as a thin `btop` wrapper — startup, panel, and keybinding
policy around an unchanged binary — and the community later develops an
L3 system-monitor plugin against platform data sources. At L4 nothing of
the original program remains: the monitoring capability has become a
first-class Bitty surface, and the wrapper is retirement candidate rather
than foundation.

Levels are cumulative in ambition, not in code: an L3 plugin does not
embed its L1 predecessor, and reaching L4 never requires preserving the
L1 render path.

## M-4 Per-application-type guidance (Candidate)

**Candidate.** Migration cost depends on where the reusable capability
lives. The direction records four archetypes.

### M-4.1 System-monitor type (`btop` archetype) (Candidate)

Backend data is cheap to re-acquire from platform sources (`/proc`,
`sysfs`, platform APIs), so reusing the whole monitor is rarely worth it.
The recorded direction is reimplementation: a Bitty-native system monitor
built directly on operating-system data with native cards, graphs, and a
process table. The original program is a visual reference and an L1
stopgap, not a dependency.

### M-4.2 Kubernetes-client type (`k9s` archetype) (Candidate)

The reusable backend is the Kubernetes API itself, not the TUI program.
The direction binds the API or SDK and renders sidebar, resource table,
YAML inspector, and logs as Native UI. Native and terminal surfaces
coexist inside one plugin: the structured views are native while shell
access stays a real PTY:

```text
Kubernetes Plugin
├── Sidebar (Pods, Deployments, Services)
├── ResourceTable
├── YAML Inspector
├── Logs
└── TerminalSurface
    └── kubectl exec
```

A single panel can therefore show native resource state above and a live
`kubectl exec` session below — more than either a pure TUI or a
terminal-free dashboard can express. Reusing the TUI program's code is
optional; binding its backend API is the point.

### M-4.3 Network-manager type (`nmtui` archetype) (Candidate)

Section M-1.3 already records the shape: connect to the daemon over D-Bus
or `libnm` and render connections, Wi-Fi, Ethernet, VPN, IP, and DNS
natively. There is no TUI program in the final architecture, only the
daemon, the plugin, and the Native UI. Migration cost is the D-Bus binding
plus the native controls, not a port of any TUI widget.

### M-4.4 Editor type (`Neovim` archetype) (Candidate)

Editors with deep internal state (buffers, editor state, LSP sessions,
plugin runtimes, command languages, script ecosystems) resist both
wrapping-only and backend-reuse strategies. The recorded direction uses
the program's own structured protocol instead: `Neovim` exposes an RPC
and UI protocol, and Bitty acts as a native frontend host:

```text
Neovim Core
      │  RPC
      ▼
Bitty Native Neovim Frontend
```

This follows the established GUI-frontend design space rather than
inventing a conversion layer. Buffer contents, modes, and diagnostics
travel over the protocol; Bitty renders and routes input natively. The
editor core stays authoritative, and the ANSI presentation path is
bypassed without being parsed.

## M-5 Backend Service Plugin pattern (Candidate)

**Candidate.** A plugin is not necessarily a UI. The direction splits the
service surface from every surface that renders it:

```text
Plugin Service
      │
      ├── API
      ├── State
      ├── Events
      └── Commands
             │
             ▼
          UI Plugin
```

A Kubernetes service plugin, for example, would expose typed operations
such as watching pods, fetching logs, deleting a pod, and opening an exec
session (spellings illustrative-only). Multiple consumers share one
service instance:

```text
          kubernetes-service
          /       |       \
         /        |        \
 Dashboard     Statusline   Wheel
```

The same split pays off for automation. An agent calls the service
operation (`delete_pod`) instead of shelling out to a CLI and parsing
human-readable text. Structured calls replace text scraping in both
directions: the UI stops scraping the service's presentation, and the
agent stops scraping the CLI's prose.

Consequences recorded as candidate:

- Service plugins own typed state and event streams; UI plugins own
  presentation and interaction, and neither reaches into the other's
  internals.
- Sharing is by reference to one service, not by duplicating backends per
  UI surface; Dashboard, Statusline, and Wheel observe the same state.
- Agent-facing commands ride the same typed surface the UI uses, under the
  same capability grants — there is no separate agent back door.
- A service without any UI is complete; a UI without a service is a
  direction sketch, not a plugin.

## M-6 Encouragement order and coexistence (Candidate)

**Candidate.** Plugin documentation should encourage, in descending
preference:

```text
Preferred:
Backend / API
   ↓
Bitty Native Plugin

Second:
CLI process
   ↓
structured IPC
   ↓
Bitty Native Plugin

Compatibility floor:
TUI
   ↓
TerminalSurface
```

Bitty does not set out to eliminate the TUI. It gives legacy terminal
applications a gradual Native-ization path: enter at L1 with a wrapper,
advance through structured IPC at L2, arrive at a backend-plus-Native-UI
L3, and optionally reach a fully native L4. The ecosystem positioning is
deliberately plural:

```text
                     Backend
                        │
              ┌─────────┼─────────┐
              │         │         │
             CLI       TUI    Bitty Plugin
              │         │         │
              └──── Terminal ─────┤
                                  │
                              Native UI
```

One capability can therefore live three lives at once — a CLI, a TUI, and
a Bitty Native plugin — with the terminal as the shared substrate and the
Native UI as the additive surface. For `btop`, `k9s`, and `nmtui` class
programs the ideal end state is not "the program inside Bitty" but the
underlying capability (system monitoring, Kubernetes, NetworkManager) as
a first-class Bitty surface reused by Native UI, Wheel, Statusline, and
sibling plugins.

## M-7 Built versus not built (Candidate)

**Candidate.** This section states the verification boundary explicitly so
no reader mistakes direction for implementation.

Not built (verified 2026-09-23 against the terminal implementation
repository):

- The **Surface type system** beyond the current `ViewContent` split does
  not exist. What exists is the five-variant content enum in
  `bitty-ui` `panel.rs:184` (`Empty`, `Terminal`, `Rich`, `Browser`,
  `Panel`); there is no general Surface type hierarchy for Native UI
  content.
- The **Native UI framework** does not exist. The renderer owns a wgpu
  swapchain surface (`SurfaceKind` in `bitty-render` `gpu.rs`, with
  `Headless` and `Gpu` variants); there is no retained declarative UI
  tree, no layout or hit-testing engine, no Bitty UI API, and no scene
  submission path for plugin-drawn native widgets.

Built and reusable by this direction:

- `TerminalSurface` plus PTY hosting for L1 wrappers (the accepted panel
  and terminal contracts in the terminal-side corpus).
- The accepted plugin manifest, capability, command-registry, event, and
  isolation contracts cited in the normative-sources section.

Until the Surface type system and the Native UI framework land with
terminal-side owner review and implementation evidence, every L2-and-above
construct in this document — including the Bitty UI API, the Scene layer,
service surfaces, and all native widget sketches — remains direction. L1
wrapping is the only level implementable against accepted contracts
today.

## Security review

| Concern                     | Required control                                                                                                                                                                                                                                             | Source                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrapped-process escape      | L1 wrappers keep the TUI program in a PTY child under the accepted plugin sandbox; the wrapper gains no ambient OS authority and the program never enters parser, layout, render, or input hot paths.                                                        | This document (Candidate); [Plugin Platform RFC](../specifications/plugin-platform-rfc.md), [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md). |
| ANSI-scrape injection       | No Native UI may be constructed by parsing TUI character output; untrusted program output stays inside `TerminalSurface` until a typed backend or protocol replaces it.                                                                                      | This document (Candidate); [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md).                               |
| Backend credential exposure | Direct-connect plugins (D-Bus, cloud APIs, editor RPC) hold credentials under explicit capability grants; connection handles and secrets never cross into UI plugins, Wheel context, or agent transcripts except through the owning service's typed surface. | This document (Candidate); [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md).                                |
| Service authority confusion | A Backend Service Plugin mediates, never elevates: each command executes under its own owner's grants with validated arguments and resource budgets; consuming UI plugins gain no service authority by subscribing.                                          | This document (Candidate); [Plugin Platform RFC](../specifications/plugin-platform-rfc.md).                                                                     |
| Cross-surface observation   | Dashboard, Statusline, and Wheel receive only the service's public state and events; private state (prompts, secrets, credentials, internal tables) is never part of the shared surface.                                                                     | This document (Candidate); [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md).                               |
| Hot paths                   | Service collection and event delivery stay on cold paths with bounded counts; no service callback executes inside parser, layout, render, or input paths.                                                                                                    | Security invariant 4; [Plugin system](plugin-system.md).                                                                                                        |
| Capability invention        | This page defines no capability identifier; service registration, backend-access, and cross-surface observation dimensions stay with OQ-056.                                                                                                                 | [Open questions register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).                                             |

This section records direction; acceptance requires independent security
reviewer evidence and a full traceability table against the shared corpus.

## Verification plan

An accepted revision would need at least:

1. Metadata and link gates: `just check` with zero markdownlint, link,
   metadata, language, agents, and hygiene issues.
2. Ladder tests: an L1 wrapper hosts an unmodified TUI binary with no
   semantic assertions about its output; an L3 plugin renders the same
   capability with zero ANSI bytes in its render path.
3. Principle tests: a fixture TUI whose theme, resize, and version change
   breaks any character-parsing integration while the backend-bound
   integration keeps passing.
4. Archetype tests: system-monitor data sourced from platform interfaces;
   Kubernetes state sourced from the API with a coexisting exec PTY;
   network state sourced from the daemon bus with no TUI process present;
   editor state round-tripped over RPC with the ANSI path bypassed.
5. Service tests: two UI consumers observe one service instance; a service
   fault isolates without taking down consumers; an agent command and a UI
   gesture invoke the same typed operation with identical authorization.
6. Negative tests: a character-scraping submission is rejected at review;
   a service command without a grant is denied by its owner; no private
   service state is reachable through public events.
7. Cross-platform hosting tests where the direction is adopted.

Evidence belongs to the owning implementation repositories; this page
records direction only.

## Alternatives considered

| Alternative                        | Trade-off                                                                                                                                   | Disposition                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ANSI-to-Native converter           | Automatic migration for every TUI, but recognizers break on every theme, resize, version, and locale change and carry no application state. | Rejected; M-2 forbids character scraping as an integration point.                                                                           |
| Wrapper-only ecosystem             | Zero migration cost everywhere, but Bitty never sees semantics: no native widgets, no shared services, no agent-usable APIs.                | Rejected as the end state; retained as the L1 compatibility floor.                                                                          |
| Full rewrite without backend reuse | Cleanest code, but discards tested backends, daemons, and APIs and duplicates maintenance for every program.                                | Rejected where a backend, daemon, API, or protocol already exists; reserved for the system-monitor case where platform sources are cheaper. |
| Service conflated with UI          | Fewer plugin kinds, but every UI surface duplicates the backend and agents fall back to CLI text parsing.                                   | Rejected; M-5 splits service from UI so Dashboard, Statusline, Wheel, and agents share one typed surface.                                   |
| TUI replacement mandate            | Faster native coverage on paper, but forces an all-or-nothing rewrite and abandons working CLI/TUI user bases.                              | Rejected; M-6 keeps CLI, TUI, and Native coexisting with a gradual ladder.                                                                  |

## Affected contracts

| Direction                               | Status                                                                                         | Owning document                                                                                                                                                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-1 three plugin kinds                  | Candidate                                                                                      | This page                                                                                                                                                                                                                  |
| M-2 capability-reuse principle          | Candidate                                                                                      | This page                                                                                                                                                                                                                  |
| M-3 L0-L4 ladder                        | Candidate                                                                                      | This page                                                                                                                                                                                                                  |
| M-4 per-type guidance                   | Candidate                                                                                      | This page                                                                                                                                                                                                                  |
| M-5 Backend Service Plugin split        | Candidate; consumes the accepted manifest, capability, command, event, and isolation contracts | [Plugin Platform RFC](../specifications/plugin-platform-rfc.md), [Plugin Host Runtime RFC](../runtime/plugin-host-runtime-rfc.md) (Accepted)                                                                               |
| M-6 encouragement order and coexistence | Candidate                                                                                      | This page                                                                                                                                                                                                                  |
| M-7 built-versus-not-built boundary     | Candidate; the Surface system and Native UI framework are owner-pending terminal side          | [bitty-terminal-docs specifications tree](https://github.com/bitty-terminal/bitty-terminal-docs/tree/main/specifications) (owner-pending)                                                                                  |
| M-5 security posture                    | Candidate; must not weaken any accepted normative control                                      | [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) and [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) (Normative) |

## Open points

These are **candidate open items, not accepted open questions**. Each must
be decided in the owning contract before any direction here becomes
contract:

1. Owner review of the L0-L4 ladder itself, including whether L2 deserves
   a narrower definition (structured-IPC-only) or a broader one (any
   externally driven plugin).
2. The Bitty UI API shape: widget inventory, layout model, and the scene
   submission contract the L3 render path assumes.
3. The Surface type hierarchy that generalizes today's five-variant
   `ViewContent` without breaking the accepted `PanelId != ViewId !=
TerminalId` identity separation.
4. The service registration surface, its capability dimensions, and the
   API version that would carry it (register entry OQ-056).
5. Event and state-subscription budgets for shared services (fan-out
   limits, backpressure, stale-snapshot semantics).
6. The editor-protocol hosting boundary: which RPC methods Bitty fronts
   natively, how script ecosystems execute, and where the PTY fallback
   remains mandatory.
7. Retirement policy for L1 wrappers once an L3 or L4 successor ships
   (coexistence duration, naming, registry precedence).
8. Agent-command authorization: whether agent calls share the UI command
   schema verbatim or need a distinct audited subset.

## Acceptance criteria

An accepted version of this direction would need:

1. Independent review by the plugin-ecosystem category owner, a docs
   curator, and a security reviewer, with explicit terminal-side owner
   coordination for the Surface type system and the Native UI framework.
2. Every direction above either promoted with an owning contract or
   retained as an explicit open point; no direction silently inherited by
   a sibling document.
3. A capability and API-version disposition for service registration,
   backend access, and cross-surface observation (OQ-056), reconciled with
   the accepted v1 surface.
4. A Surface and scene contract that composes with the accepted identity
   hierarchy instead of restating it.
5. Verification evidence at the owning implementation repositories for at
   least one archetype per M-4 and one shared service per M-5.
6. No weakening of any normative security control; every high-risk
   identifier receives independent security review.

## P0 Review Sign-off

Not signed. This document is a **draft candidate**: it records direction
for future review and records no accepted contract. P0 review and sign-off
apply only when the direction is proposed for acceptance in an owning
contract, with the terminal-side owner's coordination for the Surface type
system and the Native UI framework.

## References

- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) —
  accepted capability, command, and lifecycle contract.
- [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md) —
  accepted v1 host surface and exclusions.
- [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md) —
  accepted resource ceilings and failure semantics.
- [Plugin system](plugin-system.md) — extension levels,
  register-versus-claim, and presentation boundaries.
- [Plugin Ecosystem Model](../architecture/plugin-ecosystem-model.md) —
  candidate plugin graph and dependency-versus-capability discipline.
- [UI Extensibility Architecture](../architecture/ui-extensibility-architecture.md) —
  candidate extension-point inventory and ownership boundaries.
- [Lua UI Component Model (Candidate)](lua-ui-component-model-candidate.md) —
  candidate component ecosystem the L3 render path would compose with.
- [Plugin UI Slot Inventory (Candidate)](plugin-ui-slot-inventory-candidate.md) —
  candidate slot bounds the M-5 UI consumers would occupy.
- [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md) —
  accepted panel identity, focus routing, command registry, and overlay bounds.
- [bitty-terminal-docs specifications tree](https://github.com/bitty-terminal/bitty-terminal-docs/tree/main/specifications) —
  owner-pending terminal-side Surface and Native UI contracts.
- [Open questions register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) —
  OQ-056 owner-pending capability and API-version decisions.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  and [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) —
  normative posture and abuse cases.
