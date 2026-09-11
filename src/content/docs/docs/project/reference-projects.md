---
title: Reference Project Register
description: Records reproducible local snapshots and research questions for terminal and extensibility reference projects.
category: project
audience: contributor
document_type: research
status: draft
website_publish: false
sidebar_order: 90
---

# Reference Project Register

## Purpose and boundaries

Reference repositories live under `recordings/references/` in the local workspace.
They support architecture research, protocol comparison, learning performance
methods, and the design of future differential tests.

These clones are **reproducible research snapshots**, not:

- Bitty dependency pins;
- accepted technology choices;
- vendored source;
- commitments to begin a fork;
- Bitty compatibility guarantees for the reference projects.

Technical conclusions must enter a research note, RFC, or ADR with the observed
commit recorded. “Another project does it this way” cannot replace Bitty's own
constraints and validation.

## Current snapshots

| Project      | Local directory                      | Commit                                     | Registration date | Primary research topics                                                                                                                           |
| ------------ | ------------------------------------ | ------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ghostty      | `recordings/references/ghostty`      | `8867c37c55b578b9eb4cfaba41cb9023e557176d` | 2026-08-25        | Core/frontend boundaries, VT, fonts, rendering, protocols, security, and Agent documentation                                                      |
| Neovim       | `recordings/references/neovim`       | `a1de07418b89f1b30f9ca088306b2c1615f928c3` | 2026-08-25        | Command/Event/API, Lua configuration and plugins, UI protocol, and ecosystem boundaries                                                           |
| kitty        | `recordings/references/kitty`        | `087b8c35c455e1fa21a727916efdaf59ebdd0168` | 2026-08-25        | GPU performance, glyph cache, Kitty Graphics/keyboard, and protocol limits                                                                        |
| WezTerm      | `recordings/references/wezterm`      | `f93d90350075d3e42566e0557ca36e82ffdcbec1` | 2026-08-25        | Rust/Lua, terminal/mux/GUI layers, cross-platform support, image protocols, and software rendering                                                |
| Hermes Agent | `recordings/references/hermes-agent` | `dce2ecb8a9428aedf69e959bd15d7a9fa15eae01` | 2026-08-30        | Agent core, progressive skills, memory/context lifecycle, delegation, capability boundaries, execution environments, toolsets, approvals, and ACP |

The `2026-08-25` registration date applies only to the original four snapshots;
registration metadata is recorded per entry above. The clones have shallow
history, and each commit provides an exact reference for current observations.
Updating a clone requires updating this table or pinning the old commit in the
relevant research document.

## Research questions

### Ghostty

- What are the actual dependency directions between its library/core and
  desktop frontends?
- How have the public boundaries of the parser, terminal state, font system, and
  renderer evolved?
- How does the project organize resource limits, fuzzing, and security fixes for
  untrusted escape sequences?
- Which practices from `AGENTS.md` and the cross-platform development workflow
  are reusable?

### Neovim

- How do Command, autocmd/Event, Lua, RPC, and external UI share stable
  contracts?
- Which parts of runtimepath and module discovery are successful, and which are
  historical burdens?
- Which aspects of configuration reload, plugin unload, and state ownership
  should not be copied directly?
- How can the multigrid/UI protocol validate the separation of Terminal, View,
  and Layout?

### kitty prior-art lead

- How do the child-I/O, parser, and renderer execution domains avoid blocking
  one another?
- How do the glyph atlas, damage tracking, and GPU uploads maintain low latency?
- What are the actual semantics of image and placement, z-index, scrolling, and
  animation in Kitty Graphics?
- What are the boundary conditions for the keyboard protocol and long or
  malicious control sequences?

### WezTerm prior-art lead

- How does `wezterm-term` remain independent of GUI and PTY code, and which
  boundaries make suitable differential oracles?
- What known constraints arise from repeated Lua configuration evaluation and
  runtime side effects?
- How are the mux, GUI, headless, and remote domains layered?
- How are OpenGL, WebGPU, and software renderers and platform fallback
  strategies tested?

## Panel and workspace prior-art leads

This section records **non-normative research leads** from the second research
snapshot, `recordings/research/chatgpt-2026-08-30-2.md`, and the not-yet-merged Panel
Extensibility Vision draft. An observation from a pinned local snapshot must
name its project, commit, exact file or symbol, and observation. An unpinned
entry is an external URL observation and research lead; it must name the
official URL and must not be presented as snapshot-backed evidence. The
research snapshot is untrusted external input and is not normative evidence.
The primary-source URLs below are review leads, not dependency or product
commitments. They are prompts for source-level research and future RFC or ADR
work.

### Zellij

**External URL observation and research lead; no local commit pin.** The
official [Zellij plugins](https://zellij.dev/documentation/plugins.html) and
[plugin and pipe](https://zellij.dev/documentation/zellij-plugin-and-pipe.html)
documentation describe a WASM plugin pane as a first-class workspace
participant beside terminal panes. They describe rendering UI, receiving input,
observing state and events, and participating in ordinary or floating panes.
This is the sharpest external prior art lead for the proposition that
`Pane != PTY`: a plugin pane can be a workspace surface without owning a PTY.
Its character-cell TUI boundary is distinct from Bitty's candidate internal
Panel compositor and GPU UI runtime.

These are external URL observations, not claims from a pinned snapshot.

Research questions:

- Which plugin-pane lifecycle, input, state, event, pipe, and message contracts
  are stable enough to compare with a future Panel RFC?
- What are the WASM sandbox resource and failure boundaries for plugin panes?
- Which parts of the pane compositor assume character-cell rendering rather
  than an arbitrary application surface?

### kitty

The existing snapshot is pinned at `087b8c35c455e1fa21a727916efdaf59ebdd0168`.
Snapshot-backed observation: in `recordings/references/kitty/kitty/remote_control.py`,
`remote_control_allowed`, `PasswordAuthorizer.is_cmd_allowed`, and `SocketIO`
show password/pattern authorization and socket transport for remote commands;
in `recordings/references/kitty/kittens/panel/main.py`, `actual_main` calls
`boss.add_os_panel` and creates a tab containing the requested command. These
observations support research into CLI-to-instance control and a panel surface
that hosts a terminal program. The official [remote control](https://sw.kovidgoyal.net/kitty/remote-control/),
[panel](https://sw.kovidgoyal.net/kitty/kittens/panel/), and [desktop UI](https://sw.kovidgoyal.net/kitty/kittens/desktop-ui/)
documentation are separate review leads for behavior not established by these
source references. kitty's desktop panel is therefore a research comparison,
not the same abstraction as a Bitty internal Panel node.

Research questions:

- Which remote-control authentication, scope, discovery, and failure behaviors
  are relevant to a bounded local Bitty IPC design?
- How do Kittens and watchers differ in lifecycle, rendering ownership, and
  access to terminal state?
- Which kitty panel behavior depends specifically on Wayland layer-shell or
  desktop integration?

### WezTerm

The existing snapshot is pinned at
`f93d90350075d3e42566e0557ca36e82ffdcbec1`. Snapshot-backed observation: in
`recordings/references/wezterm/mux/src/pane.rs`, the `Pane` trait represents a view on
a terminal; in `recordings/references/wezterm/mux/src/domain.rs`, the `Domain` trait
spawns panes and assigns them to tabs; and in `recordings/references/wezterm/mux/src/lib.rs`,
`Mux` owns multiplexer state. In
`recordings/references/wezterm/lua-api-crates/plugin/src/lib.rs`, `RepoSpec::parse`,
`RepoSpec::check_out`, and `RepoSpec::update` show plugins represented by
repositories checked out under a plugin data directory. These observations are
research leads for programmable workspace, IPC, remote-domain, and plugin
design, not claims that a plugin application panel is the core UI model. The
official [mux API](https://wezterm.org/config/lua/wezterm.mux/index.html),
[CLI](https://wezterm.org/cli/cli/index.html), [multiplexing](https://wezterm.org/multiplexing.html),
and [plugins](https://wezterm.org/config/plugins.html) documentation are review
leads for behavior beyond the pinned source observations.

Research questions:

- How do mux, GUI, headless, local, Unix-socket, SSH, and TLS domains divide
  ownership and trust boundaries?
- Which `wezterm cli` operations and asynchronous behaviors would be useful
  comparison points for Bitty IPC?
- What constraints follow from repeated Lua configuration evaluation and
  runtime side effects?

### tmux

**External URL observation and research lead; no local commit pin.** The
official [tmux control mode](https://github.com/tmux/tmux/wiki/Control-Mode)
documentation describes tmux's server, session, window, pane, and client
hierarchy as prior art for a long-lived workspace service. Control
mode (`tmux -C` and `tmux -CC`) demonstrates RPC combined with asynchronous
events: command responses and notifications share a text protocol without
making panes generic application surfaces.

This is an external URL observation, not a claim from a pinned snapshot.

Research questions:

- Which control-mode messages, ordering guarantees, and subscription behaviors
  should inform a bounded Bitty RPC plus event-stream comparison?
- How do server lifetime, client attachment, session ownership, and errors map
  to Bitty's current local IPC and headless constraints?
- Which control-mode behaviors are terminal-management-specific and should not
  be treated as a Panel API?

### Emacs

**External URL observation and research lead; no local commit pin.** The
official [GNU Emacs Shell manual](https://www.gnu.org/software/emacs/manual/html_node/emacs/Shell.html)
supports reviewing Emacs as conceptual prior art for an
application platform built from Buffer, Window, Frame, Command, Event, and
Lisp primitives. A Window can display terminal, shell, file-manager, browser,
mail, or editor content. The analogy is useful for Panel content and extension
composition, but it is not evidence for a particular Bitty runtime or API.

This is an external URL observation, not a claim from a pinned snapshot.

Research questions:

- Which Buffer and Window identity, display, and lifecycle semantics are useful
  when separating Panel identity from terminal identity?
- How do commands, keymaps, hooks, and Elisp package boundaries compose without
  making the core own every application?
- Which server and daemon behaviors are comparable to local Bitty IPC, and
  which depend on Emacs's editor-centric assumptions?

### Warp

**External URL observation and research lead; no local commit pin.** The
official [Warp documentation](https://docs.warp.dev/) presents Warp as prior art
for a built-in IDE
direction: terminal, agent, file tree, editor, LSP, and code-review surfaces
are integrated into one product. It is not evidence of a generic plugin UI
platform. The useful comparison is therefore product positioning and built-in
application scope, not an extensibility contract.

This is an external URL observation, not a claim from a pinned snapshot.

Research questions:

- Which integrated surfaces are built into Warp rather than exposed as a
  third-party panel or application API?
- What user and workflow benefits come from the terminal-to-IDE direction, and
  what scope costs would it impose on a small core?
- How should a Bitty distribution differ from making IDE features part of the
  product core?

### iTerm2

**External URL observation and research lead; no local commit pin.** The
official [iTerm2 documentation](https://iterm2.com/documentation.html) and
[tmux integration](https://iterm2.com/3.3/documentation-tmux-integration.html)
describe iTerm2 as combining terminal features with
Web Browser, AI Chat, Toolbelt, Python automation, triggers, coprocesses, and
tmux integration. This demonstrates a terminal product accumulating built-in
application and automation surfaces, rather than a generic third-party Panel
platform. Its tmux integration is also a useful cross-product example of
control-mode RPC and event behavior.

These are external URL observations, not claims from a pinned snapshot.

Research questions:

- Which iTerm2 features are built-in product surfaces versus programmable API
  entry points?
- How does tmux integration map remote windows and panes into native UI, and
  what identity or event assumptions does that require?
- Which Python automation and coprocess capabilities would require explicit
  capability and resource boundaries in Bitty?

### Comparison

The following comparison defines five research categories: whether a surface
may exist without a PTY, how UI extensions are exposed, how instances are
controlled, whether workspace state is managed, and whether the product tends
toward an application platform. Every row is a **qualitative research
hypothesis to validate**, not an objective acceptance fact or capability
guarantee. Terms such as `partial`, `built-in`, and `close` are directional
shorthand, not API equivalence.

| Project | Non-PTY surface hypothesis          | UI-extension hypothesis  | IPC/control hypothesis                           | Workspace hypothesis  | Application-platform hypothesis |
| ------- | ----------------------------------- | ------------------------ | ------------------------------------------------ | --------------------- | ------------------------------- |
| Zellij  | WASM plugin pane                    | WASM plugin UI           | Pipe/message                                     | Workspace-managed     | Close, TUI-oriented             |
| kitty   | No generic internal pane            | Kittens/watchers         | Remote control                                   | Partial               | Partial, desktop surfaces       |
| WezTerm | No generic internal pane            | Lua extension            | CLI/socket and mux                               | Workspace-managed     | Partial, mux-oriented           |
| tmux    | No                                  | No generic UI            | Control mode, RPC plus async events              | Workspace-managed     | No                              |
| Emacs   | Buffer-backed surface               | Elisp                    | Server                                           | Workspace-managed     | Yes, conceptual                 |
| Warp    | Built-in surfaces, type unspecified | Not the core model       | Internal product behavior, not a public contract | Product-managed state | IDE-oriented, built-in          |
| iTerm2  | Built-in features, type unspecified | Python API and built-ins | tmux integration and automation                  | Product-managed state | Partial, built-in               |

The comparison supports research of the candidate distinction described in the
not-yet-merged Panel Extensibility Vision draft, especially `Panel != PTY`.
That draft is a future-document reference rather than a repository link until
it has been accepted and merged. This register does not establish dependencies,
compatibility, or product commitments; those require Bitty-specific security
review, measurements, and an accepted RFC or ADR.

### Hermes Agent

Hermes Agent is recorded as a source snapshot only. Its upstream README calls
it a self-improving agent with one core shared across CLI, gateway, TUI, desktop,
and ACP surfaces, while its development guide describes a narrow core with
capabilities at the edges. These observations are research evidence, not a
Bitty dependency, product commitment, or acceptance of Hermes behavior.

- **License evidence:** the snapshot's root `LICENSE` is the MIT License,
  copyright 2025 Nous Research. The README also links the same file from its
  license section. The MIT License permits review, citation, copying,
  modification, and redistribution subject to its notice conditions. Bitty
  governance does not authorize copying or vendoring this code into Bitty
  without an independently reviewed decision and the required notices.
- **Progressive skill disclosure:** `agent/skill_commands.py` and
  `tools/skills_tool.py` expose skill discovery and loading as separate
  operations, while `cli.py` documents slash-command expansion as a user
  message rather than a system-prompt mutation. Research question: can Bitty
  use one bounded discovery contract for tools, skills, documentation, context,
  and memory without eager-loading untrusted content?
- **Hot/cold memory:** `agent/memory_provider.py` defines provider lifecycle
  hooks, and `agent/memory_manager.py` separates static prompt blocks,
  per-turn prefetch, end-of-turn sync, and session-boundary extraction. The
  README identifies persistent memory and SQLite/FTS5 session search as
  separate facilities. Research question: which small curated memory belongs
  in a session snapshot, and which history remains cold and searchable?
- **Context engine and frozen snapshots:** `agent/context_engine.py`
  distinguishes `select_context`, `compress`, and `on_turn_complete`; its
  selection result is request-only rather than persisted transcript state.
  `acp_adapter/server.py` freezes the tool snapshot after the first user turn
  to preserve prompt-cache stability. Research question: should Bitty define
  an explicit generation-bound `AgentSessionSnapshot` for model, instructions,
  memory, skills metadata, and execution profile, with changes deferred to the
  next generation?
- **Compaction and recovery:** the `ContextEngine.compress` contract permits
  summarization or other engines, while the repository's session search keeps
  historical material recoverable. Research question: should Bitty require a
  recovery pointer and preserve identifiers, paths, revisions, diagnostics,
  and error strings when active context is compacted?
- **Subagent isolation and attribution:** `tools/delegate_tool.py` builds a
  focused child prompt from an explicit goal and bounded context, and
  `get_subagent_attribution` plus the delegation records preserve parent/child
  lineage. Research question: which stable session, turn, action, tool-call,
  checkpoint, and execution-target identifiers must Bitty expose to attribute
  child work and background processes without importing the parent's full
  conversation?
- **Capability attenuation:** `tools/delegate_tool.py` uses role-specific
  blocked toolsets, maximum spawn depth, concurrency limits, and optional
  worktree isolation. A delegated child must not gain authority unavailable to
  its parent. Research question: should Bitty make
  `child_capabilities = parent_capabilities intersection requested_capabilities
minus forbidden_delegated_capabilities` an explicit invariant, including
  limits on memory writes, messaging, scheduling, and further delegation?
- **Execution environments:** `tools/environments/base.py` defines a common
  spawn-per-call backend contract; the README lists local, Docker, SSH,
  Singularity, Modal, Daytona, and Vercel Sandbox backends. Research question:
  should an `ExecutionTarget` unify terminal, agent, files, processes, and git
  while independently constraining filesystem, network, process, environment,
  credentials, CPU, memory, disk, PTY, devices, and wall time?
- **Toolsets and availability:** `toolsets.py` resolves composed toolsets and
  registry additions; the README and `tools/registry.py` distinguish enabled
  toolsets, prerequisites, and runtime availability. Research question: should
  Bitty expose a tool only when registration, environment availability,
  capability, execution profile, and agent-level policy all agree, rather than
  treating registration as reachability?
- **Approvals and self-improvement boundaries:** `tools/approval.py` keeps
  approval identity in context-local session/turn/tool-call state and freezes
  YOLO mode at import time; `tools/write_approval.py` stages writes when
  approval is required. The README describes agent-curated memory and skill
  creation, but the research note recommends proposal and review gates for
  `memory.write`, `skill.write`, and instruction changes. Research question:
  should Bitty permit observation and proposal by default while requiring
  separate, auditable consent for durable memory, skills, instructions,
  network, and irreversible actions? Regex command detection must remain a risk
  signal, not the security boundary.
- **ACP and multi-entry core:** `acp_adapter/entry.py` is a stdio ACP entry
  point, and `acp_adapter/server.py` implements new/load/resume/fork/cancel
  session operations while reusing the agent and tool machinery. The README
  also documents CLI, gateway, TUI, desktop, and batch surfaces. Research
  question: can Bitty keep one session/harness core with thin Panel, CLI, IPC,
  remote, and ACP adapters, with adapter-specific state translated into a
  bounded event and attribution model?

The linked [AI Architecture](../specifications/ai-architecture.md) is a draft
proposal, not shipped behavior. It is safe to defer these questions there or in
follow-up RFCs; this register introduces no dependency, provider, protocol,
execution backend, or product commitment.

## Mainstream harness research leads

The following are official, unpinned, non-normative leads for comparative
research. They are not local snapshots, compatibility targets, or Bitty
dependencies. Re-check each upstream project before relying on a behavior.

| Harness      | Official research lead                            | Questions to investigate                                                                                            |
| ------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Claude Code  | <https://code.claude.com/docs/en/hooks>           | Hook lifecycle, instruction loading, permissions, subagents, worktrees, and filesystem/network sandbox separation   |
| OpenAI Codex | <https://developers.openai.com/codex/app-server/> | Conversation/event/approval protocol, interrupts, sandboxing, tool execution, SDK and App Server boundaries         |
| Gemini CLI   | <https://github.com/google-gemini/gemini-cli>     | Hooks, extensions, policy, checkpoints, headless operation, model routing, and independent subagent context         |
| OpenCode     | <https://opencode.ai/docs/>                       | Client/server separation, `(action, resource, effect)` permissions, child sessions, compaction, and durable history |
| Goose        | <https://block.github.io/goose/>                  | MCP-first extensions, ACP interoperability, recipes versus skills, subagents, and Code Mode                         |
| Aider        | <https://aider.chat/docs/repomap.html>            | Structural repository maps, architect/editor model roles, verification loops, and Git-backed undo                   |
| OpenHands    | <https://docs.openhands.dev/sdk/arch/overview>    | Agent Server, local/remote Docker sandboxes, workspace abstraction, and resource isolation                          |
| Cline        | <https://docs.cline.bot/features/checkpoints>     | Path-scoped rules, shadow Git checkpoints, and independent workspace/task rollback                                  |

Warp is retained only as an external, unpinned research lead:
<https://docs.warp.dev/>. There is no local `recordings/references/warp` directory in
this workspace, so no Warp revision is recorded or inferred. Its observations
must not be treated as reproducible local evidence until a separately scoped
snapshot is reviewed and pinned.

## Usage rules

- Prefer `rg` and `ctxctl outline/symbol/read/deps` for narrow research.
  Never dump an entire file or repository into Agent context.
- Pinned-snapshot research notes must include the project name, commit, exact
  file or symbol, and observation, not merely a second-hand conclusion.
  Unpinned leads must instead be explicitly marked as external URL observations
  and research leads, include the official URL, and must not imply local file or
  symbol evidence; both forms must remain reproducible by recording their
  source.
- Check the license before copying code. Research does not automatically
  authorize copying.
- A component that appears reusable upstream still requires the wrapper, fork,
  and exit-condition evaluation defined in the
  [Technology and Dependency Strategy](technology-strategy.md).
- Do not modify a reference clone. Put experimental patches in a separate
  worktree or an explicit experiment directory under the project `recordings/`.

## Future candidates

The early discussion also identified Alacritty and foot as important reference
projects. Alacritty is useful for studying a pure VT parser and minimal
boundaries, while foot is useful for studying a Wayland-native, small,
high-performance implementation and server mode. Whether to clone them, which
commit to pin, and who owns the research remain undecided.

## Non-normative ecosystem taxonomy

The following taxonomy is a comparison lens, not a product classification,
performance ranking, or Bitty roadmap. Projects can occupy more than one group:

| Lens                            | Examples                                           | Comparison question                                                                                 |
| ------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Minimal and composable terminal | Alacritty, foot                                    | How thin can VT, PTY, input, font, and rendering boundaries remain while composition is external?   |
| Native desktop terminal         | Ghostty, GNOME Terminal, Konsole, Windows Terminal | Which desktop integration, profiles, tabs, panes, and platform behaviors form the baseline?         |
| Programmable terminal           | kitty, WezTerm, iTerm2                             | Which scripting, remote-control, mux, semantic-shell, and automation objects are stable?            |
| Terminal workspace              | WaveTerm, Horizon, Tabby, Hyper                    | Is a terminal one surface among blocks, panels, previews, connections, or extensions?               |
| Agentic development environment | Warp, and selected WaveTerm or Kaku workflows      | How are agents, sessions, tasks, approvals, and observations coordinated separately from emulation? |

This synthesis is non-normative and does not override accepted decisions,
security requirements, or current implementation status.

## External leads and comparison notes

These official URL-backed leads are not local snapshots and do not establish a
pinned revision. The observations are research leads from the 2026-08-30
discussion and external product surfaces; direct source inspection is required
before they become technical conclusions.

### Workspace-oriented leads

- [WaveTerm](https://github.com/wavetermdev/waveterm) and [documentation](https://docs.waveterm.dev/)
  describe a terminal with graphical capabilities. The [wsh overview](https://docs.waveterm.dev/wsh)
  describes CLI control of graphical blocks, workspace state, web blocks, and
  local or remote activity. `Block` and the CLI-GUI bridge are useful leads for
  comparing object identity and permission boundaries.
- WaveTerm's [wsh reference](https://docs.waveterm.dev/wsh-reference) documents
  `wsh web open` opening a URL in a web block, a real web surface rather than
  terminal-text conversion. The discussion points to Electron/Chromium and an
  embedded web view as the observed implementation surface. That is evidence to
  verify, not a Bitty recommendation: Electron/Chromium is explicitly not an
  implementation recommendation.
- [Horizon](https://github.com/peters/horizon) describes an infinite canvas
  where terminal sessions are positioned, resized, grouped, and navigated as
  panels. Its panel-first UI is a lead for workspace visualization and session
  persistence. Horizon's documented panel is primarily terminal-session
  oriented; it must not be equated with Bitty's generic `Panel`, which may host
  terminal, file, browser, agent, Markdown, or provider surfaces when accepted
  and implemented.
- [Tabby](https://tabby.sh/) and its [source repository](https://github.com/eugeny/tabby)
  are leads for a configurable cross-platform terminal, SSH and serial client,
  and plugin-oriented UI. Its [documentation](https://docs.tabby.sh/) is useful
  for extension discovery and remote workflows, subject to Bitty's untrusted
  plugin and capability rules.
- [Hyper](https://hyper.is/) is a lead for a terminal UI built with web
  technologies and an extension API. Its [extension documentation](https://hyper.is/#installation)
  illustrates both the reach and compatibility/security cost of exposing
  Electron and renderer internals. It is comparison evidence, not endorsement.
- [Kaku](https://github.com/tw93/Kaku) is a lead for opinionated, out-of-the-box
  macOS defaults and AI-oriented terminal workflows while retaining WezTerm/Lua
  customization. Treat its platform scope and product direction as external
  observations requiring verification, not as Bitty requirements.

### Terminal and automation comparisons

- [Alacritty](https://alacritty.org/) is a lead for a focused, composable
  terminal that integrates with other programs rather than reimplementing them.
- [foot](https://codeberg.org/dnkl/foot) is a lead for a Wayland-native,
  lightweight terminal and [server mode](https://codeberg.org/dnkl/foot#server-daemon-mode),
  where one process hosts multiple windows.
- [Ghostty](https://ghostty.org/) is a lead for native platform integration,
  modern protocols, and [libghostty embedding](https://ghostty.org/docs). The
  existing local snapshot remains the only pinned Ghostty evidence here.
- [GNOME Terminal](https://gitlab.gnome.org/GNOME/gnome-terminal) and
  [Konsole](https://konsole.kde.org/) are leads for mature desktop baselines,
  including profiles, tabs, splits, and desktop integration.
- [Windows Terminal](https://github.com/microsoft/terminal) is a lead for a
  shell-host model spanning profiles, panes, actions, configuration, and
  Windows/WSL integration.
- [kitty](https://sw.kovidgoyal.net/kitty/) is a lead for layouts, graphics and
  keyboard protocols, kittens, and [remote control](https://sw.kovidgoyal.net/kitty/remote-control/).
  Its existing local snapshot remains the only pinned kitty evidence here.
- [WezTerm](https://wezterm.org/) is a lead for Lua configuration, mux objects,
  domains, and remote or headless operation. Its existing local snapshot remains
  the only pinned WezTerm evidence here.
- [iTerm2](https://iterm2.com/) is a lead for shell integration, semantic
  command/session context, automation, and optional [web browser sessions](https://iterm2.com/documentation-web.html)
  in the existing window/tab/split hierarchy.
- [Ratty](https://github.com/orhun/ratty) is an experimental lead for a
  Rust/Ratatui presentation that can include inline 3D graphics. It concerns
  rich rendering and non-text surfaces, not default terminal compatibility.
- [Warp](https://github.com/warpdotdev/warp) and [official documentation](https://docs.warp.dev/)
  are leads for an agentic development environment, agent sessions,
  terminal/editor workflows, and automation. No local Warp snapshot exists in
  `recordings/references/`; these are external leads only, not pinned evidence.

### Bitty comparison boundary

The useful comparison is not "add a browser to a terminal." It is whether a
generic Panel can host providers while terminal emulation, workspace composition,
and capability policy remain separate. A future browser provider could be
optional and use a native system web view, an external browser, or another
reviewed backend. The generic Panel contract must not require Electron,
Chromium, or a particular browser engine. This is a research boundary, not an
accepted implementation decision.
