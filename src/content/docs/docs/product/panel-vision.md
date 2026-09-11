---
title: Panel Extensibility Vision
description: Draft vision for Panel as first-class container enabling a programmable terminal workspace
category: product
audience: mixed
document_type: overview
status: draft
website_publish: false
sidebar_order: 15
---

# Panel Extensibility Vision

> Status: **draft** as of 2026-08-30. This document is a vision draft for Panel
> as a first-class container enabling a programmable terminal workspace. It
> does not describe implemented, shipped, stable, or compatibility-guaranteed
> behavior and does not authorize implementation. Experimental implementation
> may exist as review evidence but carries no compatibility promise. The
> lifecycle is `Draft -> experimental review evidence -> Accepted -> normative`;
> only `Accepted` or `normative` documents authorize shipped behavior.
> This vision remains Draft, and the Workspace Compositor is separate Draft
> predecessor material; neither is Accepted by this document.

## Document status

- Phase: vision draft before any Panel contract is accepted.
- Implementation status: no Panel runtime, Event Bus, or distribution is
  implemented; this document does not claim any capability is available.
- Provenance: workspace-local, temporary, untracked, untrusted research inputs (non-canonical, non-normative)
  `tmp/research/chatgpt-2026-08-30-1.md` (the first available snapshot; the
  unsuffixed path does not exist) and `tmp/research/chatgpt-2026-08-30-2.md`
  (workspace `bitty-terminal`), plus the prior eight rounds of product
  discussion summarized in the [Product Vision](vision.md). These snapshots
  are not canonical repository evidence; claims drawn from them are
  non-normative, and delivery does not depend on their availability. Research
  provenance preserves the inspiration; this vision re-expresses it as typed,
  reviewable direction and defers normative choices to RFCs or ADRs.
- Review rule: changing an accepted direction requires an ADR or explicit
  project decision; candidate approaches must not be cited as implementation
  commitments.

This document uses three status labels:

- **Accepted direction**: explicitly selected in the
  [Product Vision](vision.md) or a referenced accepted RFC or ADR; current
  planning must treat it as a constraint.
- **Candidate approach**: recommended in research or draft discussion that
  still requires an RFC, ADR, prototype, or review.
- **Open question**: area without a concrete design or acceptance criteria.

`Accepted` labels in this document refer only to the authoritative source named
for that statement. They do not promote this vision or the draft Workspace
Compositor into an accepted contract.

## Positioning

### Programmable Terminal Workspace, not Desktop Environment inside a terminal

- **Candidate positioning**: Bitty aims to be a programmable terminal
  workspace rather than a desktop environment inside a terminal. The long-term
  evolution is `terminal emulator -> programmable terminal -> terminal
workspace -> extensible application shell`, with the workspace stage as the
  current long-term anchor. Presenting Bitty as a full desktop environment at
  this stage would invite scope drift; the workspace framing keeps the terminal
  identity while allowing composition beyond terminal emulation.
- **Accepted Product Vision language**: only these four exact slogan statements
  are accepted here, as quoted from the [Product Vision](vision.md):

  > Small core. Stable API. Everything composable. Extensions own the
  > experience.

- The surrounding ownership, implementation, and plugin-composition details
  are candidate interpretations unless an authoritative RFC, ADR, or other
  accepted document explicitly accepts the specific claim. This vision does
  not promote those details by association with the slogan.

- **Candidate in this vision**: cross-platform is a product goal with tiered
  support per [ADR 0002 - Platform Support Tiers](../decisions/adrs/ADR-0002-platform-support-tiers.md);
  agent-friendly, not agent-centric, per the [Product Vision](vision.md). Those
  statements remain authoritative only in their named source documents and are
  not additional accepted Product Vision language here.
- **Candidate**: the workspace as an integration point for CLI-native tooling
  (`GUI for CLI without abandoning CLI`) and for agent-controllable surfaces
  via the accepted IPC transport.

## Candidate platform identity (009)

- **Candidate identity**: Bitty is best described as a **composable terminal
  workspace**: a terminal-centered, workspace-composed, Lua-programmable
  environment whose capabilities combine through commands, events, services,
  and UI surfaces. This vision does not replace the accepted Product Vision
  slogan; it re-expresses the same direction (`Small core. Stable API.
Everything composable. Extensions own the experience.`) with the workspace
  and composition emphasis that the 009 research direction proposes.
- **Candidate layering**: a long-term architecture of five layers —
  User Plugins (AI, Git, files, mail, DevTools), Plugin Composition
  (services, events, commands, UI), Workspace and UI Runtime (windows,
  panels, layouts, focus), Terminal Runtime (PTY, VT, state, input, render),
  and Platform (Linux, macOS, Windows, BSD) — with IPC running across layers
  as a capability-controlled bus, not as an add-on. The philosophy is
  microkernel-like (small trusted mechanism plus replaceable policy plus
  message and service composition) without claiming an OS microkernel.
  Accepted anchors: the [Architecture Overview](../architecture/overview.md)
  one-way DAG and data-flow invariants, the accepted local IPC framing and
  scopes in the [IPC and Agent RFC](../specifications/ipc-agent-rfc.md), and
  the accepted Plugin API surface in the
  [Plugin Platform RFC](../specifications/plugin-platform-rfc.md).
- **Candidate corollary**: AI is never a special citizen of Bitty Core. Core
  knows only events, commands, services, permissions, panels, processes,
  terminal sessions, and IPC; any AI experience is one composition of those
  primitives. The same rule keeps Git, file management, and similar
  experiences in plugins.

## Panel is not Terminal

### A first-class container

- **Candidate direction**: Panel is a first-class UI container managed by the
  draft Workspace Compositor predecessor. Terminal is one implementation of
  Panel, alongside file explorer, Git, markdown preview, browser, AI chat, mail,
  messaging, logs, and custom plugins.

  ```text
  Traditional terminal

  Terminal
    +-- Tab
        +-- PTY
            +-- Shell
  ```

  ```text
  Candidate Bitty workspace

  Bitty Workspace
    +-- Panel: Terminal
    +-- Panel: File Explorer
    +-- Panel: Git
    +-- Panel: Markdown
    +-- Panel: Browser
    +-- Panel: AI Chat
    +-- Panel: Mail
    +-- Panel: Messaging
    +-- Panel: Logs
    +-- Panel: Custom Plugin
  ```

- **Candidate implication**: treating the terminal as one panel type raises
  the ceiling for composition. The same core can present as a minimal terminal,
  an IDE-like layout (file explorer plus editor plus terminal plus AI chat),
  a sysadmin dashboard, or a communications workspace depending on the enabled
  set of panels and layout. The IDE is one configuration of Bitty, not Bitty
  itself, mirroring the Neovim distribution model.

- **Draft predecessor material**: the current draft tiling primitive is
  [Workspace Compositor](../specifications/workspace-compositor.md) with
  `Instance -> Window -> Workspace -> LayoutTree -> View -> content`
  and `ViewId` distinct from `TerminalId`. The Panel vision could generalize the
  `View` host concept toward typed panels while preserving the distinct-identity
  invariant and Core-owned decoration (`gaps_in`, `gaps_out`, `border`,
  `radius`); neither this predecessor material nor that generalization is
  accepted here.

## Hyprland mapping

Hyprland is a read-only philosophy reference, not a vendored dependency.
Every Hyprland-inspired behavior must be re-expressed as a typed, validated
contract. No Hyprland source, configuration syntax, or wire format is copied
into Bitty.

| Hyprland concept  | Candidate Bitty import | Adaptation                                                                                                                                                                                           |
| ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| window            | panel                  | Candidate: a Hyprland window maps to a Bitty Panel, never to a Bitty Window. Window stays as the native OS window owned by `bitty-platform`.                                                         |
| workspace         | workspace              | Candidate: a Hyprland workspace tiling windows maps to a Bitty Workspace tiling Panels inside one Window.                                                                                            |
| split (H and V)   | split (H and V)        | Draft predecessor material only: the [Workspace Compositor](../specifications/workspace-compositor.md) proposes `H` and `V` primitives and plugin geometry proposals; neither is accepted or stable. |
| floating window   | floating panel         | Candidate: panels may be floating or tiled per layout policy; geometry is validated by Core.                                                                                                         |
| fullscreen        | zoom panel             | Candidate: zoom maximizes one panel within its Workspace without recreating content.                                                                                                                 |
| workspace rule    | panel rule             | Candidate: declarative rules match panel type to placement, floating, or size.                                                                                                                       |
| keybind           | keybind                | Accepted direction: commands and key-binding suggestions via [Plugin Platform RFC](../specifications/plugin-platform-rfc.md); user mapping wins.                                                     |
| window class      | panel type             | Candidate: `panel.type` selects the provider (for example `terminal`, `browser`, `git`).                                                                                                             |
| special workspace | scratch panel          | Candidate: hidden per-Window scratchpad Workspace; content retains identity while unrendered.                                                                                                        |

Illustrative candidate rule and binding shapes only; final schema belongs to
configuration and command RFCs:

```toml
# Candidate shape only; not an implemented ConfigPlan key.
[panel.rule.telegram]
type = "telegram"
float = true
width = 800
height = 600
```

```lua
-- Candidate shape only; not an implemented API.
bitty.bind("SUPER", "E", function()
  bitty.panel.toggle("file-explorer")
end)
```

### Candidate tiling interaction properties

- **Declarative relationships over imperative geometry**: users express
  intent (`left of`, `move to workspace 3`, `focus next panel`) and the
  compositor owns placement, rather than users managing coordinates,
  overlap, and stacking by hand. This matches the keyboard-driven terminal
  workflow (shell, Neovim, tmux) where leaving the keyboard to drag windows
  breaks flow.
- **Deterministic layout**: the layout tree plus workspace state determines
  every surface rectangle, so a workspace (`coding` with two terminals plus
  an AI panel, for example) can be saved, restored, serialized, scripted,
  and navigated by keyboard. Workspace save and restore is a candidate
  capability; no persistence contract is accepted here.
- **Candidate scrolling layout**: alongside classic tiling, a scrolling
  layout option (in the spirit of niri) keeps each surface at a preferred
  width and navigates by focus and scroll instead of shrinking every
  surface as count grows. Terminal surfaces are width-sensitive, so this
  layout may suit wide terminal-plus-tool workspaces. It would arrive as a
  `LayoutProvider` option under the accepted Workspace Compositor, not as
  a Core primitive change.
- **Floating kept, not abandoned**: tiling is the default state (stable,
  predictable, keyboard-friendly, persistable); floating serves temporary
  or independent objects (help, quick AI, settings, pets, previews); see
  the candidate presentation modes below.

## Prior art and lineages

Candidate synthesis of the second research snapshot
`tmp/research/chatgpt-2026-08-30-2.md`. Bitty does not claim to invent
`Terminal Emulator + first-class generic Panel + Plugin UI Runtime + IPC +
Workspace + arbitrary application surface` as a novel combination; several
prior projects each realize large subsets of it. The table and notes below
are provenance summary and design intuition, not implementation commitments.

### Zellij: Pane != PTY is feasible

- Zellij defines plugins as first-class citizens of the workspace alongside
  terminal panes, rendered via a WASM sandbox, receiving input, observing
  state and events, and controlling Zellij as ordinary or floating panes. Its
  own tab bar, status bar, session manager, and file picker are themselves
  plugins.
- Zellij has proven that `Pane != PTY` is a viable architecture
  (`plugin-pane` alongside `terminal-pane`), including CLI-launched plugin
  panes and a pipe and message mechanism.
- Bitty's candidate difference: Zellij runs inside an external terminal and
  its plugins render as TUI surfaces in the character-cell model; Bitty as
  the terminal emulator itself would own the GPU renderer, Terminal Engine,
  Panel Compositor, Plugin Runtime, and UI Runtime and would not be confined
  to the character-cell model. That would let the same Panel abstraction host
  `TerminalPanel`, `MarkdownPanel`, `ImagePanel`, `GraphPanel`, `FilePanel`,
  `WebViewPanel`, `CanvasPanel`, or `VideoPanel` rather than only TUI
  surfaces. Any capability, IPC, or rendering implication of that distinction
  still requires a Panel RFC.

### kitty: remote control and the panel distinction

- kitty's tiling layouts, Kittens (Python overlay programs), remote control
  (`kitten @ launch`, `send-text`, `focus-window`, `ls`, and related verbs
  over a socket), and watchers form the closest lightweight precedent for a
  Bitty `CLI -> IPC -> Panel Manager` path. The candidate Bitty IPC should be
  studied alongside kitty remote control, tmux control mode, and Hyprland IPC
  rather than copying any wire format.
- kitty `panel` (from kitty 0.34 Wayland panel and `kitten panel --edge=...`
  in later releases) and the `desktop-ui` portal helper are a different
  abstraction: a Wayland layer-shell surface that hosts a terminal program as
  a desktop dock, overlay, or background. Bitty Panel is instead an internal
  compositor node and application surface (`Bitty Window -> Panel`), so the
  name collision must not be read as an architectural equivalence.

### WezTerm: mux and Lua, but not a plugin application panel

- WezTerm's mux (`windows`, `tabs`, `panes`, `workspaces`, `domains` via
  `wezterm.mux`), `wezterm cli` verbs (`activate-pane`, `split-pane`, `spawn`,
  `get-text`, `send-text`, and related) over `$WEZTERM_UNIX_SOCKET`, and
  local, Unix-socket, SSH, and TLS domains are the strongest reference for
  Bitty workspace, IPC, and remote-domain architecture.
- WezTerm plugins, by the project's own definition, are sets of Lua files
  that extend configuration via `plugin.apply_to_config(config)`. Panes remain
  multiplexer-owned program containers, so the candidate gap is that WezTerm
  is highly programmable without treating a plugin application panel as the
  core UI model. Bitty's candidate direction is the complementary choice:
  `Panel` registers a panel type and creates an arbitrary UI application.

### tmux: control mode as the RPC + Event precedent

- tmux `server -> session -> window -> pane -> client` with `tmux -C` and
  `-CC` control mode is a mature `RPC + asynchronous Event Stream` precedent.
  Its text protocol of command responses plus async notifications maps
  directly onto the candidate Bitty IPC shape `RPC + Event Stream`, and
  iTerm2's native mapping of remote tmux windows and panes via control mode
  shows how such a protocol composes across products. The candidate
  evolution line worth studying is
  `tmux control mode -> iTerm2 integration | kitty remote control |
WezTerm CLI and mux socket | Hyprland IPC -> Bitty IPC`.

### Emacs: the closest conceptual precedent

- Set aside the terminal identity, and Emacs is the closest conceptual
  precedent for Bitty's long-term direction. Emacs is an `Elisp runtime + buffer
system + window system + application platform`; a window displays any
  buffer (code, `term` or `shell`/`eshell`, `Dired`, `EWW`, `Gnus`, debugger,
  or Git), and built-in applications such as `term`, file management, mail,
  news, and browsing ship as buffer-backed applications.
- The mapping onto Bitty is direct: `Buffer -> Panel content`,
  `Window -> Panel`, `Frame -> OS Window`, `major mode -> Panel type`,
  `minor mode -> Extension`, `Elisp package -> Bitty plugin`,
  `command -> Command`, `keymap -> Keymap`, `hook -> Event`,
  `daemon/server -> IPC daemon`. The Neovim-derived distribution intuition
  (`LazyVim`, `AstroNvim`, `NvChad`, `LunarVim`) applies here as well: Bitty
  core would provide primitives while combinations become distributions.
- Bitty's candidate era difference is the infrastructure baseline:
  `terminal + GPU UI + IPC + plugin sandbox + Agent + remote workspace`
  versus the editor-centric world in which Emacs was formed.

### iTerm2 and Warp: built-in versus platform

- iTerm2's Web Browser, AI Chat, Toolbelt, Python API, tmux integration,
  triggers, and coprocesses show `Terminal + browser + AI + automation` as an
  internal feature bundle rather than a third-party `Panel API` that any
  plugin can use to define an application. The distinction is
  built-in features versus platform primitives.
- Warp as of 2026 describes itself as an `Agentic Development Environment`
  (Terminal mode, Agent mode, file tree, editor, LSP, code review, and
  third-party CLI agent integration). Warp's trajectory validates that
  `terminal -> IDE` has market demand, but its model is a product whose
  built-ins make it IDE-like. The candidate Bitty contrast is
  `terminal -> generic application platform -> plugins decide what it
becomes`, so `bitty-dev`, `bitty-cloud`, or `bitty-minimal` would be
  configurations of the same core rather than the core becoming an IDE.

### Comparison table

Candidate overview derived from the second research snapshot. Check marks
summarize that snapshot's assessment; any normative statement still belongs
to a future RFC or ADR.

| Project          | Pane non-PTY        | Plugin UI           | IPC and control     | Workspace           | App platform        |
| ---------------- | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- |
| tmux             | No                  | No                  | Yes                 | Yes                 | No                  |
| kitty            | Largely no          | Kittens             | Yes                 | Partial             | Partial             |
| WezTerm          | Largely no          | Lua extension       | Yes                 | Yes                 | Partial             |
| Zellij           | Yes                 | Yes (WASM)          | Yes (pipe)          | Yes                 | Very close          |
| iTerm2           | Partial (built-in)  | Python API          | Yes                 | Yes                 | Partial             |
| Warp             | Yes (built-in)      | Not the core model  | Internal            | Yes                 | IDE-oriented        |
| Emacs            | Yes                 | Yes (Elisp)         | Server              | Yes                 | Yes                 |
| **Bitty vision** | **Yes (candidate)** | **Yes (candidate)** | **Yes (candidate)** | **Yes (candidate)** | **Yes (candidate)** |

The candidate thesis of the second research snapshot is that Bitty's
potential differentiation is not any single row of this table but the
composition: unifying ideas currently dispersed across Zellij (first-class
non-PTY pane and WASM plugin surface), kitty (remote control),
WezTerm (mux, Lua, and workspace), tmux (server, session, and control mode),
Emacs (Buffer plus Window plus language runtime as application platform), and
Warp (integrated IDE surface) into the terminal emulator's own application
model. The reference set for any future Panel RFC is therefore
`Zellij Plugin API + tmux Control Mode + kitty Remote Control + Emacs
Buffer/Window model` alongside the accepted IPC and plugin specs.

### Thought lineage

Two directional sketches from the second research snapshot, consolidated
without adopting them as implementation:

```text
Terminal lineage
       |
  tmux | kitty | WezTerm
       v
     Bitty
       |
 Generic Panel Runtime
       |
 Plugin Application API
       |
 Terminal / IDE / Desktop applications
```

```text
Emacs (Buffer + Window + Lisp)
       |
     Bitty (Panel + Plugin + Lua)
```

## Unified Panel lifecycle

- **Hypothetical candidate**: every panel, regardless of its content, could
  share one future internal Core/host-mediated lifecycle abstraction so the
  compositor can manage focus, input, rendering, and suspension uniformly.
  This is not a direct plugin render or input API: plugins remain declarative,
  host-mediated, and off performance hot paths. Any future compositor could
  avoid branching on whether a panel hosts a terminal, a browser surface, or
  plugin-rendered declarative UI.

```rust
// Hypothetical future internal Core/host abstraction; not a plugin API.
// Plugins contribute declarative UI and do not implement render/input hot paths.
trait Panel {
    fn mount(&mut self, ctx: &PanelContext);
    fn render(&mut self, frame: &mut Frame);
    fn handle_event(&mut self, event: Event);
    fn resize(&mut self, size: Size);
    fn focus(&mut self);
    fn blur(&mut self);
    fn suspend(&mut self);
    fn resume(&mut self);
    fn unmount(&mut self);
}
```

Future host-side implementations such as `TerminalPanel`, `BrowserPanel`, `GitPanel`,
`MarkdownPanel`, `ChatPanel`, and `FilePanel` would conform to this trait.
The accepted analogue is the generation-based lifecycle in the
[Plugin Platform RFC](../specifications/plugin-platform-rfc.md)
(`Declared -> Resolved -> Registered -> Activated -> Suspended -> Disposed`).
The Core-owned layout validation described by the
[Workspace Compositor](../specifications/workspace-compositor.md) remains draft
predecessor material and is not accepted by this vision.

### Panel != Pty principle

- **Candidate principle**: `Panel != Pty`. Panel is a generic application
  surface and rendering identity; PTY is one backing implementation among
  several. `TerminalPanel` wraps a PTY and VT grid, but `MarkdownPanel`,
  `ImagePanel`, `GraphPanel`, `FilePanel`, `WebViewPanel`, and `CanvasPanel`
  do not require a PTY. The compositor, focus, and IPC layers operate on
  a future host compositor; no branch on `is_terminal` should be required in
  Core-owned paths. The precise backing model and capability mapping still
  require a Panel RFC.

  ```rust
  // Candidate shape only; not an implemented API.
  // Illustrates that a Panel owns a surface, not necessarily a PTY.
  enum PanelSurface {
      Terminal(TerminalPanel),
      Plugin(PluginPanel),
      // Helper-process-backed native service integration; never in-process.
      HelperProcessBacked(HelperProcessPanel),
      // Optional backend; see "Browser is optional".
      WebView(WebViewPanel),
  }
  ```

  Without this invariant, the workspace would be a collection of terminal
  panes rather than a platform for applications. Zellij is the sharpest
  prior art that this split is feasible: `Plugin Pane` participates as a
  first-class workspace citizen beside `Terminal Pane` inside the same
  compositor, with lifecycle, input, and event participation independent of
  PTY ownership.

## Panel Runtime

- **Hypothetical candidate architecture**: a Panel Runtime could sit between the core compositor
  and plugins and owns layout composition, focus, input routing, rendering
  coordination, lifecycle transitions, and IPC dispatch. Plugins contribute
  panel providers and content; the runtime mediates.

  ```text
  Panel Runtime
    +-- layout
    +-- focus
    +-- input
    +-- rendering
    +-- lifecycle
    +-- IPC
        |
        v
      Plugins
  ```

- **Constraints that could shape a future runtime**:
  - Lua stays off performance hot paths (PTY output through terminal state,
    damage, and renderer) per the [Product Vision](vision.md) and the
    [Plugin Platform RFC](../specifications/plugin-platform-rfc.md);
    plugins observe via side-channel events, not per-byte or per-cell
    interception.
  - No hot-path events of any kind; bounded per-subscriber queues with
    coalescing, batch limits, and fail-open interception per the
    [Plugin Platform RFC](../specifications/plugin-platform-rfc.md).
  - Draft predecessor material keeps decoration and layout validation Core-owned
    per the [Workspace Compositor](../specifications/workspace-compositor.md);
    `LayoutProvider` proposals are pure, deterministic, and bounded. This is
    not an accepted Panel constraint until a Panel RFC or ADR adopts it.
  - Window, platform, and environment scoping remains per
    [ADR 0008 - Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](../decisions/adrs/ADR-0008-headless.md)
    until a future daemon ADR revisits it.

## Candidate panel presentation modes

- **Candidate principle**: a Panel is content plus behavior; its presentation
  **Mode** is a runtime property deciding how it appears in the workspace.
  Panels share identity, surface, focus, input, lifecycle, and visibility
  handling while differing in layout strategy, and a panel may move between
  modes (tiled to floating to fullscreen and back, as in a window manager
  `togglefloating`) without being recreated.
- **Candidate mode taxonomy**:

  | Mode         | Candidate use                                                        |
  | ------------ | -------------------------------------------------------------------- |
  | `tiled`      | Long-lived working surfaces: terminal, AI, Git, file panels          |
  | `floating`   | Help, settings, quick AI, pets, small tools; focusable and movable   |
  | `overlay`    | Transient interaction: command palette, flash jump, which-key, hints |
  | `fullscreen` | Temporarily maximized terminal, AI, or document surface              |
  | `scratchpad` | Hidden tool recalled and dismissed by one binding (AI, notes, music) |
  | `pinned`     | Fixed to a workspace edge across layout changes                      |
  | `popover`    | Small panel attached to one UI element                               |

- **Candidate semantics**: floating and overlay must not be conflated.
  Floating panels are real panels with lifecycle, focus, move, and resize;
  overlays are instantaneous interaction layers. Scratchpad, pinned, and
  popover are proposed v1 vocabulary only; `tiled`, `floating`, `overlay`,
  and per-Window scratchpad already have draft or accepted anchors in the
  [Workspace Compositor](../specifications/workspace-compositor.md) and the
  [Panel Runtime pre-study](../specifications/panel-runtime-pre-study.md).
- **Candidate suggestion plus rules**: a plugin suggests a mode
  (`preferred_mode`) but never forces it; user panel rules decide, in the
  spirit of window-manager window rules (match on plugin, role, or panel id
  to set mode, size, anchor, focusability). Rule precedence and schema
  belong to a future Panel RFC.

## Inter-panel Event Bus

- **Hypothetical candidate direction**: panels and plugins could compose workflows through an
  inter-panel Event Bus rather than direct references. A panel emits a typed
  event; other panels subscribe and react. This keeps producers and consumers
  decoupled. The bus would be a future Core/host-mediated mechanism, not a
  direct panel reference or plugin-to-renderer/input channel.

  ```text
  File Explorer
    |
    | open
    v
  Editor

  Terminal
    |
    | cwd changed
    v
  File Explorer

  Git Panel
    |
    | diff
    v
  AI Panel
  ```

  Candidate bus shapes only:

  ```lua
  -- Candidate shape only; not an implemented API. Topics are manifest-declared;
  -- payloads are typed, bounded, and immutable.
  bitty.events.emit("xuepoo.files:file.open", { path = "/home/foo/main.rs" })

  bitty.events.on("xuepoo.files:file.open", function(event)
    bitty.commands.invoke("xuepoo.editor:open", event.path)
  end)
  ```

- **Accepted constraint source**: the [Plugin Platform RFC](../specifications/plugin-platform-rfc.md)
  event pipeline already defines observation versus interception, bounded
  queues, coalescing, and fail-open timeouts; the [IPC and Agent RFC](../specifications/ipc-agent-rfc.md)
  defines the bounded local IPC framing and scopes that a cross-process bus
  would reuse. Any future bus must not weaken those ceilings or introduce an
  ambient bypass. In particular, a future bus would require manifest-declared
  topics, typed bounded immutable payloads, and qualified commands or host
  services; it would not expose direct panel references.

## Three app-composition paths

Candidate: panels need not reimplement every application from scratch.
Three composition paths cover the trade-off between cost and native control,
with the choice made per panel type rather than per platform.

| Path                                       | How it works                                                                                   | When to prefer it                                                                     | Example                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| WebView panel                              | Host a web application inside a panel via an embedder                                          | Fastest path for mail, messaging, dashboards, and SaaS tools; reuses existing web UIs | Telegram Web, Gmail, GitHub, Grafana, Linear                                  |
| Helper-process-backed/native-service panel | Plugin uses a capability-checked host service or helper process and contributes declarative UI | Needs richer integration or offline behavior with explicit capabilities               | Git, mail via HTTP or DBus, SSH manager, Docker, Kubernetes                   |
| CLI adapter panel                          | Plugin drives an existing CLI and maps its output to panel UI                                  | Large surface of Unix tooling already has a stable CLI                                | `git`, `gh`, `kubectl`, `aws`, `gcloud`, `nmcli`, `bluetoothctl`, `systemctl` |

These three paths are a hypothetical candidate for sharing one future internal
Panel abstraction and Event Bus; no shared trait or bus across composition paths
is accepted. The difference is where application logic lives (remote web
content, helper-process-backed or host-mediated service integration, or
child-process CLI). Plugins remain declarative and off hot paths. Native
in-process plugins are explicitly prohibited, as are direct renderer or
native-window access. Each path must pass the same capability, scope, and
resource checks; no path grants ambient filesystem, network, or process
authority.

## Four-layer hierarchy

Candidate layering that positions Panel among core, extension, and application
concerns. The precise crate boundaries remain owned by accepted architecture
documents; this layering is vision only.

```text
Bitty
  +-- Terminal Engine
  |     PTY, VT, grid, state, damage
  +-- UI Runtime
  |     Panel, Layout, Widget, Input
  +-- Plugin Runtime
  |     Lua, native host boundary, WASM (candidate)
  +-- Services
  |     PTY, filesystem, network, notifications, clipboard, process
  +-- Applications
        terminal, git, files, browser, markdown, AI
```

Historical positioning in the research snapshot:

```text
terminal emulator -> programmable terminal -> terminal workspace -> extensible application shell
```

The third stage, programmable terminal workspace, is the candidate long-term
identity. The [Product Vision](vision.md) and
[Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
remain the accepted statements of build order; this layering must not be read
as a scheduling commitment.

## Core minimal knowledge principle

- **Candidate principle**: Bitty Core should know as little as possible about
  applications. Core owns `Panel`, `Workspace`, `Layout`, `Command`, `Event`,
  `Capability`, `Service`, `Widget`, and `Plugin` as generic primitives. It
  does not own `Telegram`, `GitHub`, `Gmail`, `Docker`, or `Kubernetes` as
  concepts.

  Accepted illustration: the
  [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) capability
  families (`terminal.*`, `ui.*`, `clipboard.*`, `fs.*`, `process.*`,
  `network.*`, `runtime.*`, `debug.*`, `platform.*`) are closed symbols;
  plugins cannot invent families. The specialization lives in plugins and
  distributions, not in core. Neovim core does not know Telescope, Harpoon,
  or LazyGit; its strength is the stable `buffer`, `window`, `tabpage`,
  `autocmd`, `keymap`, and `LSP` primitives. Bitty aims for the same split
  between platform primitives and application policy.

## Browser is optional

- **Candidate direction**: browser and WebView capability belongs to an
  optional backend, not to the core dependency set. Embedding Chromium or
  WebKit would move Bitty from a small terminal to a terminal plus browser
  runtime with a step change in dependency size, attack surface, and
  maintenance cost.

  ```text
  bitty core
    |
    +-- panel API
          |
          +-- bitty-webview (optional plugin and backend)
  ```

- **Accepted platform constraints if a browser panel ships**: the
  `platform.image-file` and `platform.open-url` gates per
  [Security Overview](../security/overview.md), plus the accepted bounded
  IPC, capability, and isolation constraints in the
  [Plugin Platform RFC](../specifications/plugin-platform-rfc.md). The
  `Browser` View type and any `browser.embed` capability remain draft/candidate
  material; `browser.embed` is not in the accepted closed v1 capability grammar.
  Any WebView backend must reuse accepted gates and must not make the core
  depend on a browser runtime for minimal operation.

- **Open**: whether a per-Window process budget beyond existing isolation
  ceilings is needed for `Browser` panels.

## Philosophy: Small by default, limitless by design

- **Candidate philosophy**: `Small by default, limitless by design` (default
  minimal, boundless by design; `pay only for what you use`).
- **Candidate default**: `bitty` starts as a fast, reliable terminal. With
  no plugins enabled, no WebView runtime, no AI dependency, and no extra panel
  implementation is resident. Capabilities, rendering backends, and panel
  providers load only when a panel that needs them is active or requested.
  In particular, `WebView` (`Chromium` or `WebKit`) is pay-only-if-used; no
  workspace that omits browser panels pays the dependency size or attack
  surface of a browser engine.
  A safe-startup path that loads no third-party plugins must always remain
  available, per the [Security Overview](../security/overview.md) and the
  accepted no-third-party-plugin safe-startup constraint. This preserves the
  `Browser is optional` stance above.
- **Candidate ceiling**: the same core can be driven to a personal,
  OS-like `user-space micro environment` through composition rather than
  core growth. The OS resemblance comes not from bundling mail, browser, or
  file management into Core, but from the primitives `Application lifecycle`,
  `Panel and Workspace and Window management`, `IPC`, `Capability and
permissions`, `Process management`, `Notifications`, `Clipboard`,
  `Filesystem`, `Network`, and `Session` potentially exposed through future
  capability-checked host services.
  Bitty would then feel like `Emacs` in composability without copying the
  editor-centric premise: `Neovim` and `Emacs` share `Buffer + Window +
Frame + Command + Hook -> Lisp`, while the candidate Bitty analogue is
  `Panel + Workspace + Window + Command + Event -> Plugin Runtime (Lua)`.
- **Candidate two-sided experience**: minimalists can treat Bitty as
  `Terminal only` (`plugins = []`); hackers can compose 50 plugins with
  custom panels, IPC wiring, Lua workflows, and `Show me your Bitty setup`
  configuration sharing akin to `dotfiles`, `nvim`, `hyprland`, and `tmux`
  culture. The invariant `extensions own the experience` from the
  [Product Vision](vision.md) requires that both extremes use the same
  capability, lifecycle, and IPC contracts rather than a privileged embedded
  mode.

## Distributions and distribution culture

Candidate: curated distributions compose the same panel primitives into
different workspaces, mirroring Neovim distributions such as LazyVim.

| Distribution    | Candidate plugin set                        | Intended audience                                              |
| --------------- | ------------------------------------------- | -------------------------------------------------------------- |
| `bitty-minimal` | terminal, workspace, splits                 | Users who want only a fast, reliable terminal                  |
| `bitty-dev`     | terminal, files, git, AI, task runner, LSP  | Developers who want an IDE-like workspace without forking core |
| `bitty-cloud`   | SSH, Kubernetes, Docker, logs, Grafana, AWS | Operators and cloud-native workflows                           |
| `bitty-social`  | messaging, mail, browser, RSS               | Communication-centric workspaces                               |

> Shipped rename note (Implemented-only, read-only from `bitty`
> `origin/main`, commit `abde197`, CTX-0240, `bitty` #415): the canonical
> first-party plugin id is `bitty-terminal.workspace` (claim
> `workspaceline`, commands `bitty-terminal.workspace:new|close|next`). A
> bitty workspace is a tab group within a window.
> `bitty-terminal.tabs` (claim `tabline`, commands
> `bitty-terminal.tabs:*`) remains as a deprecated shim delegating to the
> canonical names (removal at or after `v0.2.0`); the old path resolves
> identically but emits a deprecation warning, the new path does not. The
> alias exists because stored capability grants bind plugin id plus
> manifest hash (`GrantRecord` binds id+hash): a flag-day rename would
> silently invalidate existing grants, scripts, and third-party `tabline`
> claimants, so both ids resolve during the compat window. This note
> records shipped status only and changes no candidate direction above.

Candidate named distributions such as `LazyBitty` or `AstroBitty`
(mirroring `LazyVim` or `AstroNvim`) and a community `awesome-bitty`
aggregation of plugins, layouts, themes, and configurations are natural
extensions of this culture, as is `~/.config/bitty/` sharing (`init.lua`,
`keymaps.lua`, `layouts.lua`, `plugins.lua`, `themes.lua`) under
`Show me your Bitty setup`.

### Plugin-extends-plugin

- **Candidate implication**: the extension hierarchy need not stay flat
  (`Bitty -> plugin A | plugin B | plugin C`). Once the Panel, Command, Event,
  Capability, and service primitives are stable, platform plugins can expose
  their own extension points so that other plugins extend them:

  ```text
  Bitty
    -> Git plugin
      -> GitHub plugin
        -> AI review plugin

  Bitty
    -> Editor plugin
      -> LSP, Treesitter, Formatter, Debugger
  ```

  Without stable primitives, such layering would couple implementations
  directly; with them it remains capability-checked composition through the
  same Panel and Event contracts.

- **Candidate service composition**: the Service Registry is the mechanism
  behind plugin-extends-plugin. A base plugin provides versioned services
  (`ai.chat`, `vcs.diff`, `project.current`); a composed plugin requires
  them through the host service boundary and combines them without Core
  involvement (an AI review plugin requiring `ai.chat` plus `vcs.diff`, for
  example). Service disappearance (a provider reloads or unloads) must
  degrade consumers gracefully; exact semantics belong to a future service
  lifecycle RFC. The accepted mechanics are the manifest `dependencies`
  plus `services.provided` declarations and the validated service call
  boundary in the
  [Plugin Platform RFC](../specifications/plugin-platform-rfc.md).

Community aggregation would follow the `awesome-bitty` pattern of plugins,
layouts, themes, and configurations built on the same primitives. Distributions
do not change the extension boundary: official and community plugins use the
same API, permission model, and lifecycle so first-party use validates the
boundary per the [Product Vision](vision.md).

The accepted bundling contract for any official distribution in this
workspace is the [Default Distribution RFC](../specifications/default-distribution-rfc.md)
(zero-runtime-cost bundled-disabled by default, explicit enable with
capability consent, and `bitty --safe` recovery). That RFC is distribution
mechanism, not panel architecture; any future panel preset such as
`bitty-dev` would still go through the pinning, budget, and disable
precedence it defines.

## Primitive priority

Candidate API stability order from the research snapshot, with the top tier
determining the ecosystem ceiling. Higher items should stabilize first and
change least.

1. Panel
2. Workspace
3. Layout
4. Command
5. Keybinding
6. Event
7. Capability
8. Service
9. Widget
10. Plugin

Within this list, `Panel`, `Event`, `Command`, and `Capability` are the
candidate load-bearing four. Decisions about their versioning, compatibility,
and deprecation policy deserve priority review. The accepted Plugin API v1
surface, capability grammar, and event classes in the
[Plugin Platform RFC](../specifications/plugin-platform-rfc.md) and the local
IPC framing and scopes in the [IPC and Agent RFC](../specifications/ipc-agent-rfc.md)
are the closest accepted anchors for this priority.

## Status separation and related documents

| Statement in this vision                                                                                   | Status    | Authoritative source                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Small core, stable API, everything composable, extensions own the experience                               | Accepted  | [Product Vision](vision.md)                                                                                                                                                         |
| Rust core with Lua plugins, Tier 1/2/3 platform scope, agent-friendly not agent-centric                    | Candidate | Authoritative elsewhere: [Product Vision](vision.md), [Plugin Platform RFC](../specifications/plugin-platform-rfc.md), and [Technology Strategy](../project/technology-strategy.md) |
| `Instance -> Window -> Workspace -> LayoutTree -> View` with distinct `ViewId`/`TerminalId`                | Draft     | [Workspace Compositor](../specifications/workspace-compositor.md)                                                                                                                   |
| `H` and `V` as the only Core layout primitives, Core-owned decoration, `LayoutProvider` as plugin          | Draft     | [Workspace Compositor](../specifications/workspace-compositor.md)                                                                                                                   |
| Manifest grammar, capability families, generation lifecycle, observation vs interception, bounded queues   | Accepted  | [Plugin Platform RFC](../specifications/plugin-platform-rfc.md)                                                                                                                     |
| Local IPC as Unix socket or named pipe with peer credentials, scoped per request, bounded framing          | Accepted  | [IPC and Agent RFC](../specifications/ipc-agent-rfc.md)                                                                                                                             |
| No daemon, no remote multi-client commitment at documentation phase; headless deferred to post-v1.0        | Accepted  | [ADR 0008 - Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](../decisions/adrs/ADR-0008-headless.md)                                                                  |
| Zero-cost bundled-disabled by default, five disable surfaces, `bitty --safe` precedence                    | Accepted  | [Default Distribution RFC](../specifications/default-distribution-rfc.md)                                                                                                           |
| Panel as first-class container generalizing View                                                           | Candidate | This vision; requires RFC or ADR                                                                                                                                                    |
| Unified Panel trait, Panel Runtime, inter-panel Event Bus                                                  | Candidate | This vision; requires RFC or ADR                                                                                                                                                    |
| Panel != Pty; `PanelSurface { Terminal, Plugin, HelperProcessBacked, WebView }` as candidate surface model | Candidate | This vision; requires RFC or ADR                                                                                                                                                    |
| Prior art: Zellij/kitty/WezTerm/tmux/Emacs/Warp comparison and lineages                                    | Candidate | This vision + `tmp/research/chatgpt-2026-08-30-2.md`                                                                                                                                |
| Three composition paths (WebView, helper-process-backed/native service, CLI adapter)                       | Candidate | This vision; requires RFC or ADR                                                                                                                                                    |
| Four-layer hierarchy and browser-optional `bitty-webview`                                                  | Candidate | This vision; requires RFC or ADR                                                                                                                                                    |
| Small by default, limitless by design; pay only for what you use; two-sided experience                     | Candidate | This vision; requires RFC or ADR                                                                                                                                                    |
| Distribution culture (`LazyBitty`, `AstroBitty`), sharing, and plugin-extends-plugin hierarchy             | Candidate | This vision + [Default Distribution RFC](../specifications/default-distribution-rfc.md)                                                                                             |
| Distributions (`minimal`, `dev`, `cloud`, `social`) and `awesome-bitty`                                    | Candidate | This vision; requires RFC or ADR                                                                                                                                                    |
| Primitive stability order                                                                                  | Candidate | This vision; requires RFC or ADR                                                                                                                                                    |
| Composable-terminal-workspace identity, five-layer plus capability-bus framing, AI-never-special-citizen   | Candidate | This vision; requires RFC or ADR                                                                                                                                                    |
| Declarative tiling properties, deterministic save/restore, scrolling-layout option, floating kept          | Candidate | This vision; requires RFC or ADR                                                                                                                                                    |
| Seven presentation modes with Mode as runtime property, preferred mode plus Panel Rules                    | Candidate | This vision; requires RFC or ADR                                                                                                                                                    |
| Service Registry as plugin-on-plugin mechanism with graceful service disappearance                         | Candidate | This vision; requires RFC or ADR                                                                                                                                                    |

Research provenance `tmp/research/chatgpt-2026-08-30-1.md` (the first available
snapshot; the unsuffixed path does not exist) and
`tmp/research/chatgpt-2026-08-30-2.md` refers to workspace-local, temporary,
untracked, untrusted inputs (non-canonical, non-normative). It is not canonical
repository evidence, its claims are non-normative, and delivery does not depend
on its availability; accepted documents override it where they conflict.

## Open questions and next steps

- Which panel types belong in a first RFC: `Terminal` only, or `Terminal`
  plus `Rich` and one additional type?
- Exact `Panel` trait spelling, error taxonomy, and focus/blur/visibility
  semantics beyond the illustrative sketch above.
- Whether Panel selection generalizes `LayoutTree` leaves or introduces a
  parallel container, and how the `ViewId` versus `PanelId` naming migrates.
- Event Bus topic taxonomy, payload bounds, and whether cross-process panels
  route through IPC or an in-process bus first.
- Capability mapping for each panel type, especially `browser.embed` and any
  new families a Panel RFC would require.
- Distribution ownership: which first-party plugins, if any, ship enabled by
  default, and how distributions relate to the
  [Default Distribution RFC](../specifications/default-distribution-rfc.md).
- Whether the primitive priority above becomes a formal versioning policy
  or a reviewer guideline.
- Whether the scrolling-layout option, workspace save/restore, the
  `pinned`/`popover` modes, and Panel Rules precedence enter a Panel RFC
  together or as separate follow-ups.

These remain open until a Panel RFC, a follow-up cross-cutting decision, or
an ADR closes them. This vision does not close an open question on its own;
it will track to the owning question once recorded in the
[open-question register](../decisions/open-questions.md) or close directly as
a standalone product document per the
[documentation workflow](../development/documentation-workflow.md).

## References

- [Product Vision](vision.md)
- [Workspace Compositor](../specifications/workspace-compositor.md)
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md)
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md)
- [Default Distribution RFC](../specifications/default-distribution-rfc.md)
- [ADR 0008 - Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](../decisions/adrs/ADR-0008-headless.md)
- [Architecture Overview](../architecture/overview.md)
- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
- [Security Overview](../security/overview.md)
- [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md)
- [Input and Pointer Contract](../specifications/input-pointer-rfc.md)
- [Panel Runtime and Event Bus Pre-Study](../specifications/panel-runtime-pre-study.md)
- [AI Architecture](../specifications/ai-architecture.md)
- External research `tmp/research/chatgpt-2026-08-30-1.md`
  and `tmp/research/chatgpt-2026-08-30-2.md`
  (workspace-local, temporary, untracked, untrusted, non-canonical inputs in
  workspace `bitty-terminal`; not canonical repository evidence and not required
  for delivery)
