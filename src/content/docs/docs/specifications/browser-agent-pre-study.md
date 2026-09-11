---
title: Browser and Agent Panel Integration Pre-Study
description: Research draft surveying Browser WebView and Agent panel integration via Panel Runtime MCP memory and capability isolation
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 28
---

# Browser and Agent Panel Integration Pre-Study

> Status: **draft** research pre-study — not **Accepted**, not **Verified**, not
> **normative**, and not **Compatible**. This document surveys candidate Browser
> and Agent panel integration via the Panel Runtime and Event Bus contract as
> a prerequisite for a future Panel Platform, reconciled with the accepted
> [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)
> (CTX-0117, `6f30c2f`, Accepted plus Experimental Implementation `c0aadd2`/`a8735d0`),
> the accepted
> [Workspace Compositor Specification](workspace-compositor.md)
> (CTX-0118, `c3a2928`, Accepted, no experimental implementation), and the
> draft
> [Panel Runtime and Event Bus Pre-Study](panel-runtime-pre-study.md)
> (CTX-0119, `9032d1e`, `Draft` not **Accepted** — requested `05e8803` in task
> description, candidate only, no implementation, bounded PR-1..PR-12), plus the
> first-party
> [Project plugin](https://github.com/bitty-terminal/bitty/blob/main/docs/product/plugin-roadmap.md)
> (`bitty-terminal.project`, `Draft`, bundled-disabled). It proposes no
> implementation, authorizes no shipped, stable, or compatibility-guaranteed
> behavior, and does not weaken any normative control in the
> [Security Overview](../security/overview.md), [Threat Model](../security/threat-model.md),
> [Isolation Resource RFC](isolation-resource-rfc.md), [Plugin Platform RFC](plugin-platform-rfc.md),
> or [IPC and Agent RFC](ipc-agent-rfc.md).
> The lifecycle is `Draft -> experimental review evidence -> Accepted -> Verified -> Compatible`
> (spec) and `Draft -> experimental review evidence -> Accepted -> normative` (document);
> only `Accepted` or `normative` documents authorize shipped behavior. All thresholds
> below are candidate research values that require a reviewed acceptance decision
> before implementation may claim them.

## Purpose and scope

Bitty has an accepted single-owner lifecycle for terminals and views and an
accepted Hyprland-inspired tiling compositor (`H`/`V` `LayoutTree`, Core-owned
decoration, `LayoutProvider` pure `propose`). The draft Panel Runtime pre-study
surveys whether a generic Panel container can be hosted without conflating
`PanelId` with `ViewId`/`TerminalId`, leaking PTY descriptors, breaking focus
routing, or weakening capability isolation. The next question is whether the two
most privileged panel types — **Browser/WebView** and **Agent** — can be hosted
by that same runtime without introducing a privileged web process bypass, an
ambient Agent filesystem or network grant, or an unreviewed MCP transport. This
pre-study surveys that question so a future Browser and Agent RFC can be scoped
without re-opening accepted contracts.

In scope for this research (candidate, not normative):

- WebView embedding via Panel Runtime: surface ownership, embedder isolation,
  navigation lifecycle, focus and input routing, and `browser.embed` isolation;
- MCP integration: adapter placement, server and tool registry, capability-gated
  dispatch, bounded framing, and consent ledger reuse;
- Agent memory: ephemeral `AgentWorkspace`, `ContextProvider` and Stable Id
  budgeting, conversational versus workspace retention, and secret minimization;
- capability isolation for Browser, MCP, and Agent traffic and budget attribution;
- first-party plugin matrix before release: which first-party plugins are
  considered bundled-disabled before any release and where Browser and Agent sit.

Out of scope and owned elsewhere:

- VT parser, grid, cursor, mode, damage, and reply invariants (OQ-007,
  [Terminal State RFC](terminal-state-rfc.md));
- text segmentation, width, bidi, shaping, atlas, and DPI contracts
  ([Text and Rendering RFC](text-rendering-rfc.md), draft);
- image, scene, zone, and structured transport beyond `Browser` surface handle
  ([Rich Presentation RFC](rich-presentation-rfc.md));
- Platform adapter ownership and `winit` key and pointer normalization
  ([Input and Pointer Contract](input-pointer-rfc.md), draft);
- Plugin API v1, capability grammar, manifest, and three-level queue budgets
  (OQ-011/012/013, [Plugin Platform RFC](plugin-platform-rfc.md));
- per-plugin VM, instruction, memory, task, and queue enforcement (OQ-014,
  [Isolation Resource RFC](isolation-resource-rfc.md));
- IPC wire framing, discovery, peer-credential auth, and per-connection rate
  limits RC-9/RC-10, and the `AgentMessage`/`AgentSession` envelope
  ([IPC and Agent RFC](ipc-agent-rfc.md));
- daemon, session persistence across reboots, and remote UI trust boundaries
  ([ADR 0008 - Headless](../decisions/adrs/ADR-0008-headless.md), post-v1.0).

This document is the research deposit for CTX-0120
(`Priority: P2 | Area: product | Labels: docs,area:product,P2 | Milestone: v0.1.0 | RFC: OQ-014 | Task: CTX-0120`)
and does not close an open question on its own.

## Relationship to accepted sources

| Area                 | Accepted fact (cite)                                                                                                                                                                                                                                                                                                             | How this research reconciles (candidate)                                                                                                                                                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topology             | One-way DAG, `Terminal -> Snapshot` only, 16-crate workspace per [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) (OQ-005)                                                                                                                                                                                      | Browser `WebView` and Agent `AgentSession` would live in `bitty-runtime`/`bitty-ui` or `bitty-agent` plus `bitty-mcp` without reversing DAG edges; `bitty-vt`/`bitty-term-state`/`bitty-pty` stay dependency-free; `bitty-render` reads only snapshots and scene, not web process handles                                          |
| Terminal lifecycle   | `TerminalRegistry` as single owner of PTY handles, `TerminalId != ViewId`, `RuntimeId`/`PersistentId`/`Generation`, bounded `64`/`32`/`16` per [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md) (CTX-0117, `6f30c2f`)                                                                     | Browser and Agent panels reuse the same generation rule for `PanelId` plus `BrowserSurfaceId` or `AgentId`; no Browser or Agent panel holds a PTY file descriptor; terminal-backed Agent context consumes snapshots, not PTY fd, and Browser navigation reuses `LogicalRect` per `View` without PTY resize                         |
| Workspace compositor | `Instance -> Window -> Workspace -> LayoutTree -> View` with `H`/`V` `ratio [0.1,0.9]`, Core-owned `gaps_in 4`/`gaps_out 6`/`border 2`/`radius 6`, `LayoutProvider` pure `propose` per [Workspace Compositor Specification](workspace-compositor.md) (CTX-0118, `c3a2928`)                                                       | Browser and Agent are candidate extensions of `View` content (`ViewContent::Browser(BrowserSurfaceId)` already accepted as `Browser` view type, and `ViewContent::Panel(PanelId)` candidate from panel pre-study for Agent); no new tiling primitive; decoration stays Core-owned                                                  |
| Panel Runtime        | `PanelId` versus `ViewId`/`TerminalId` with generation, command `owner.name:command`, overlay `4+1`, focus MRU no Lua hot path, bus `owner.name:topic` `8 KiB`/`32`/`64`/`1024`/`8192` `DropOldest` per [Panel Runtime and Event Bus Pre-Study](panel-runtime-pre-study.md) (CTX-0119, `9032d1e` / requested `05e8803`)          | Browser uses Panel lifecycle `Declared -> Created -> Mounted -> Focused -> Suspended -> Disposed` with `browser.embed` gate; Agent uses same lifecycle plus `AgentSession` plus Event Bus observation; both fit inside PR-1..PR-12 without new global budget; `PanelRuntime` remains per-Window host, no cross-window topic escape |
| Project plugin       | `bitty-terminal.project` candidate first-party: project discovery and session presentation, constrained `fs.read:PROJECT_GLOB`, session metadata, `v1` bundled-disabled per [Plugin Roadmap](../product/plugin-roadmap.md) (`Draft`)                                                                                             | Project remains the only plugin allowed a constrained project discovery read; Browser and Agent do not invent a second project discovery path: Agent `project` ContextProvider and Browser file-URL navigation both validate against the same `PROJECT_GLOB` and session metadata via qualified requests                           |
| Plugin platform      | One VM per `(PluginId, generation)`, deny-by-default capabilities, observation versus interception, four interception points, `DropOldest` default per [Plugin Platform RFC](plugin-platform-rfc.md)                                                                                                                             | Browser lifecycle and Agent tool dispatch follow the same generation rule; Browser UI is a host-owned surface, not a Lua render hook; MCP and Agent traffic reuses observation queues, not a new interception point                                                                                                                |
| Isolation            | Per-subscription `64`, per-plugin `1024`/`256 KiB`, global `8192`/`2 MiB` with `DropOldest`, RC-1 `10^7`/`50 ms`/`8 ms`, RC-2 `32 MiB`, RC-3 `512 MiB` aggregate, RC-9/RC-10 IPC quotas per [Isolation Resource RFC](isolation-resource-rfc.md)                                                                                  | Browser and Agent plus MCP budgets are sized to fit inside the same three-level envelope plus RC-1..RC-3 and RC-9/RC-10 without borrowing; Browser process memory is accounted under RC-3 aggregate, not as a new per-VM free pool                                                                                                 |
| IPC and Agent        | Bounded `256 KiB` frame, `512 KiB` in-flight, `64` pending, scopes per request, peer-credential auth per [IPC and Agent RFC](ipc-agent-rfc.md); bounded `AgentMessage`/`SideQueue`/`AgentSession` plus consent ledger                                                                                                            | MCP transport, if cross-process, reuses the same framing and scope model; Agent Browser uses the same scopes plus `agent.*` and `browser.*` families; no TCP listener and no ambient bearer token                                                                                                                                  |
| AI Architecture      | Draft ModelProvider `ai.model`, ContextProvider (`workspace`/`project`/`git`/`diagnostics`/`terminal`) with Stable Id hierarchy and `32 KiB` Context Budget, four Agent levels `inspect`/`self`/`workspace`/`all`, ephemeral `AgentWorkspace`, Tool Bus via MCP per [AI Architecture](ai-architecture.md) (`Draft`, P2 post-1.0) | This pre-study does not propose a second ModelProvider or ContextProvider; it surveys how those draft providers could be hosted as Panel content via the same hosts and how Browser as a `ContextProvider` source (bounded snapshot) would consume the same `32 KiB` budget                                                        |

Where this research selects a threshold it refines those sources; it does not move
a requirement between owners and does not create a bypass.

## Normative sources this pre-study does not weaken

- [Security Overview](../security/overview.md) (invariants 1-10, especially 2 deny-by-default, 3 presentation never Terminal Truth, 4 no hot-path Lua, 6 MCP read-only with untrusted observation, 7 bounded inputs, 9 secret minimization).
- [Threat Model](../security/threat-model.md) (T-01 parser wedge, T-06 plugin escape, T-07 starvation, T-09 IPC takeover, T-10 MCP confused deputy, T-13 Terminal Truth).
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) and [Architecture Overview](../architecture/overview.md).
- [Terminal State RFC](terminal-state-rfc.md), [Rich Presentation RFC](rich-presentation-rfc.md), [Configuration Model RFC](configuration-model-rfc.md).
- [Plugin Platform RFC](plugin-platform-rfc.md) (OQ-011/012/013) and [Isolation Resource RFC](isolation-resource-rfc.md) (OQ-014).
- [IPC and Agent RFC](ipc-agent-rfc.md) (OQ-018) and [ADR 0008 Headless](../decisions/adrs/ADR-0008-headless.md).
- [Default Distribution RFC](../specifications/default-distribution-rfc.md) (OQ-002), [Package Lifecycle RFC](package-lifecycle-rfc.md) (OQ-021), [Package Follow-up RFC](package-followup-rfc.md) (OQ-022/026-029).

## Terminology

| Term               | Candidate meaning                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Browser`          | Accepted `View` content type for an embedded browser surface via embedder; high-risk capability `browser.embed`; host owns surface handle, embedder owns process |
| `WebView`          | Candidate host-owned handle for one embedder surface (for example `wry` `WebView` or `CEF` surface); never a DOM or JS value exposed to Lua directly             |
| `BrowserSurfaceId` | Stable handle for a WebView instance; distinct newtype from `PanelId` and `ViewId` and `TerminalId`, never transmuted                                            |
| `Agent`            | Candidate Panel-hosted assistant surface (chat plus tool invocation) bound to an `AgentId` and one `AgentWorkspace`; distinct from the IPC `AgentSession`        |
| `AgentId`          | Stable handle for one agent session; distinct newtype per [IPC and Agent RFC](ipc-agent-rfc.md)                                                                  |
| `AgentWorkspace`   | Ephemeral, per-session working directory scoped to `(AgentId, generation)`; disposed at session close per [AI Architecture](ai-architecture.md)                  |
| `MCP`              | Model Context Protocol adapter as a candidate Tool Bus transport hosted in `bitty-mcp`; not a separate daemon                                                    |
| `MCPServer`        | Candidate host-registered MCP server supplying tools; manifest-declared, capability-gated                                                                        |
| `AgentMemory`      | Candidate bounded conversational plus workspace memory for one `AgentId`; ephemeral by default, persisted only with explicit consent                             |
| `Project`          | First-party plugin `bitty-terminal.project`; constrained project discovery via `fs.read:PROJECT_GLOB` and session metadata                                       |
| `EventTopic`       | Qualified `owner.name:topic` per panel pre-study (`^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*:[a-z][a-z0-9_.-]*$`, `<= 64` bytes)                                       |

## Principles (candidate)

1. `BrowserSurfaceId`, `PanelId`, `ViewId`, `TerminalId`, `AgentId`, `Generation`
   are pairwise incompatible newtypes; no integer alias and no cross-type comparison.
2. Ownership is single and explicit: the embedder owns the web process and navigation
   state; the panel runtime owns panel lifecycle; the workspace owns layout and
   decoration; the registry owns terminals and PTY descriptors; no `View`,
   `LayoutTree`, `Panel`, `Browser`, or `Agent` holds a PTY file descriptor, GPU
   object, or OS window handle outside its owner.
3. The hot path stays single-owner: `Platform -> Router -> focused View/Panel -> keymap/overlay -> encoder -> PTY`
   never blocks on a WebView, an MCP server, or an Agent turn; Browser and Agent
   are cold-path presentation and tool surfaces only.
4. Geometry flows one way: `LayoutTree` plus Core decoration produce `LogicalRect`
   per `View`; a Browser-backed `View` sizes its `WebView` to that rect without
   mutating `LayoutTree` or PTY geometry; PTY size continues to derive only from
   terminal-backed rect plus cell metrics.
5. Presentation never becomes Terminal Truth: Browser DOM, Agent markdown, MCP
   tool output, and bus payloads are presentation or coordination data and never
   mutate grid, cursor, modes, scrollback, or reply buffers except through the
   existing `Action` or scope-checked host path with `is_untrusted_surface = true`.
6. Every allocation is bounded before it happens: browser panels, MCP servers,
   tools, call payloads, agent sessions, context bytes, and workspace files are
   validated against `ConfigPlan` plus manifest and fail with a typed error, never
   with unbounded growth or panic.
7. Failure is fail-closed and typed: a failed create, navigate, tool call, emit,
   or memory write leaves the previous valid state intact and increments a bounded
   diagnostic counter.

## Survey scope

### Browser and WebView embedding via Panel Runtime (candidate research)

Status: **candidate** — builds on accepted `View` `Browser` type (`browser.embed`)
and the draft Panel Runtime host placement `Instance -> Window -> Workspace -> LayoutTree -> View` with `ViewContent::Browser(BrowserSurfaceId)` or
`ViewContent::Panel(PanelId)` containing a Browser surface.

Candidate lifecycle for one `BrowserSurfaceId` hosted in a Browser panel:

```text
Declared -> Created -> Navigating -> Focused -> Suspended -> Disposed
                         ^                     |
                         +-- resume <----------+
Suspended is becoming invisible (inactive workspace, scratchpad hidden,
zero-area, overlay occluded) without destroying navigation state until disposal.
```

Rules under research:

1. `PanelRuntime::create_browser(url, options)` validates `browser.embed`
   capability, validates `max_browser_panels_per_window`, allocates a fresh
   `(PanelId, Generation)` plus a fresh `(BrowserSurfaceId, Generation)` with
   identical generation rules, and returns both without navigating. Validation is
   synchronous and fails with `TooManyBrowserPanels` or `CapabilityDenied` before
   any process allocation.
2. Navigation is host-mediated: `browser.navigate(surface, url)` validates the URL
   against a declared allowlist (`https` by default, `file` requires distinct
   `browser.file-url` per [Isolation Resource RFC](isolation-resource-rfc.md) R-005
   `FileUrlActivation`), checks `browser.navigation` scope, and forwards to the
   embedder. A `file://` or `http://` outside the allowlist fails with
   `NavigationDenied`. `javascript:` style inline navigation is denied as
   untyped content and fails with `InvalidUrl`.
3. Web content is untrusted observation data. A Browser panel never parses terminal
   bytes, never mutates Terminal Truth, and never receives ambient file or network
   authority; any file or network access from web content requires the same
   `fs.read`/`network.connect:DESTINATION` capabilities as any plugin, evaluated
   per request.
4. Input routing reuses the panel focus rule: a Browser panel receives keyboard,
   IME preedit, and wheel only when it is the focused `View` in the active
   `Workspace` of the active `Window`. A non-focused Browser panel never receives
   those events; its navigation may still observe via the Event Bus only through
   declared `browser.*` topics with bounded payloads.
5. Surface handle hygiene: `BrowserSurfaceId` plus generation travels on every
   cross-component call; a stale generation returns `StaleHandle` before any
   embedder access. The embedder holds no `ViewId` or `PanelId` except as an
   opaque host key for placement; it never holds a PTY descriptor.
6. Suspension: becoming invisible retains the `BrowserSurfaceId` and last
   committed URL but pauses timers and media; becoming visible again re-issues
   the rect to the embedder without re-navigating. Disposal destroys the
   surface and wipes its in-memory cache; no persistent cookie or storage is
   retained unless an explicit `browser.storage` scope with bounded quota is
   granted.

Illustrative shape only; final spelling belongs to `bitty-runtime`/`bitty-ui`/`bitty-platform` plus embedder:

```rust
// Illustrative shapes only; not an implemented API.
struct BrowserSurfaceId(u64);
struct PanelId(u64);
struct ViewId(u64);
struct AgentId(u64);
struct Generation(u64);

enum ViewContent {
    Empty,
    Terminal(TerminalId),
    Rich(RichBlockId),
    Browser(BrowserSurfaceId),
    Panel(PanelId),
}
```

Candidate placement under research (all preserve `Instance -> Window -> Workspace -> LayoutTree -> View`):

- Option A — Browser as native `View` content: `ViewContent::Browser(BrowserSurfaceId)`
  as already accepted `Browser` view type. Agent occupies `ViewContent::Panel(PanelId)`
  whose panel content is an agent surface that may itself embed a Browser snapshot.
  Smallest change; `ViewId` generation history is preserved.
- Option B — Both as `Panel` subtypes: `PanelContent::Browser` and
  `PanelContent::Agent` unified under one `PanelId` kind. Stronger uniformity but
  forces Browser through Panel creation even when used standalone.
- Option C — Browser as `Panel` side-car beside `View`: a `BrowserSurfaceId`
  map outside `ViewContent`. Preserves `View` narrowness but adds a second host
  map and breaks the accepted `View` Browser type.

Current research preference is Option A because it reuses the accepted `Browser`
`View` type, the draft Panel `ViewContent::Panel(PanelId)` hierarchy, and the
accepted decoration model without a second host map; a future Browser and Agent
RFC must decide and must state the migration explicitly.

Reconciliation with Project plugin: a Browser file URL `file:///project/path`
or an Agent workspace path is not trusted by path text; the host validates it
against `PROJECT_GLOB` (for example `**/.git`, `**/bitty.toml`) and against the
constrained project discovery result produced by `bitty-terminal.project`.
Unvalidated project paths fail with `ProjectScopeDenied`. Browser and Agent do
not invent a second discovery rule.

### MCP integration (candidate research)

MCP is the candidate Tool Bus transport for Agent tool calls, hosted in
`bitty-mcp` as an adapter, not as a separate daemon. The host owns the tool
registry, validation, consent, and dispatch; MCP is the wire envelope.

1. Registry: MCP servers are manifest-declared (`mcp.servers = ["xuepoo.fs", "xuepoo.git"]`)
   with per-server `server_id` (`owner.name`, `^[a-z][a-z0-9_-]*$`, `<= 64` bytes),
   version, and tool list. Registration is validated at graph construction;
   duplicates across servers are rejected, not shadowed, mirroring the command
   registry rule.
2. Tool declaration: each tool declares `name` (`owner.name:tool`, qualified),
   `description` bounded `<= 512` chars, JSON Schema `input_schema` bounded
   `<= 4 KiB`, output bound `<= 8 KiB`, and required capability (for example
   `fs.read:PATTERN`, `network.connect:DESTINATION`). Undeclared tools are
   unreachable; invoking them fails with `UnknownTool`.
3. Dispatch is capability-checked before MCP I/O: `mcp.invoke(server, tool, input)`
   validates caller `(PluginId, generation)` or `(AgentId, generation)` plus
   `now_ms`, checks the required capability and per-tool consent, validates
   `input` against `input_schema` and `BoundedText` `8 KiB`, then forwards as a
   bounded IPC frame (`256 KiB` frame, `512 KiB` in-flight, depth `32`, RC-9/RC-10)
   to the registered server. Missing scope fails with `CapabilityDenied`; no
   partial MCP write is left on denial.
4. MCP is read-mostly by default: tools that mutate filesystem, terminal input,
   or process state require a distinct write scope plus an explicit per-target
   consent (per [IPC and Agent RFC](ipc-agent-rfc.md) T-10 R-013 defenses).
   Terminal output delivered as a tool observation is flagged
   `is_untrusted_surface = true` and is never mixed into instruction or policy
   channels.
5. Timeouts reuse the accepted discipline: per-call `DEFAULT_REQUEST_TIMEOUT_MS = 5 s`
   plus `DEFAULT_MCP_TIMEOUT_MS = 10 s` for tool-mediated streaming and hard ceiling
   `MAX_REQUEST_TIMEOUT_MS = 30 s`, checked deterministically with `now_ms`.
   A call that would exceed the budget fails at the boundary before server I/O.
6. Drop and backpressure reuse the three-level envelope: each `(MCPServer, tool)`
   subscription is a Panel Bus-style `64` event queue; per-agent or per-plugin
   MCP pending is `1024`/`256 KiB`; global MCP pending shares `8192`/`2 MiB`
   hard-gated at host admission with `DropOldest` default, `DropNewest` as
   documented alternative, and counted drops surfaced via `bitty plugin doctor`.
7. Consent ledger reuse: MCP dispatch consults the same `(authenticated UID, AgentId)`
   or `(PluginId, generation)` ledger used for IPC and Agent scopes; a scope
   granted to an Agent does not augment a plugin's MCP capability and vice versa.

Illustrative shape only:

```lua
-- Candidate shape only; not an implemented API.
-- Manifest declares servers and tools; dispatch is capability-gated.
local result = bitty.mcp.invoke("xuepoo.fs:read", { path = "/project/main.rs" })
-- Terminal observation as tool output is flagged untrusted.
-- { content = "...", is_untrusted_surface = true }
```

### Agent memory (candidate research)

Agent memory is the candidate bounded retention surface for one `AgentId`,
split into ephemeral conversational memory and opt-in workspace memory. Memory
never escapes its `(AgentId, generation)` owner without an explicit read grant.

1. Conversational memory: the last `N` turns (`<= 32` turns, `<= 8 KiB` per turn,
   total `<= 64 KiB` per `AgentId`) stored in-memory only, dropped at session
   close. Each turn is typed (`user`, `assistant`, `tool`), carries `seq`,
   `collected_at` (`now_ms`), `owner` Stable Id path, and `is_untrusted_surface`
   for terminal observations. Truncation is oldest-first with a countable
   `memory.truncated` metric; no silent loss for request or response acknowledgement.
2. Workspace memory: the ephemeral `AgentWorkspace` per [AI Architecture](ai-architecture.md)
   (`AgentWorkspace` is an ephemeral per-session directory, not a Git worktree),
   bounded to `<= 64` files, `<= 2 MiB` aggregate, `<= 256 KiB` per file, strict
   at creation. The workspace is the only writable location for `self`-level
   agents; `workspace`-level agents may write to the current `Workspace` working
   directory only through the same capability-checked host path, never via
   ambient filesystem.
3. ContextProvider as memory source: Agent memory assembly reuses the accepted
   ContextProvider set (`workspace`/`project`/`git`/`diagnostics`/`terminal`) with
   Stable Id addressing (`Instance` -> `Window` -> `Workspace` -> `View` -> `Terminal`)
   and the `32 KiB` Context Budget per turn. Assembly is deterministic for a given
   `now_ms`, provider snapshot, and Stable Id set; excess truncates per provider
   priority with `truncated_bytes` and `truncated_providers[]`.
4. Project-scoped memory: `project` provider data comes from declarative project
   config and the `bitty-terminal.project` discovery result, never from executing
   project Lua. Project trust follows [Configuration Model RFC](configuration-model-rfc.md)
   project trust: narrowing only, no workspace or cloned-repo widening of retained
   memory.
5. Redaction: every memory record that may carry secrets is typed `SecretField`
   and redacted before diagnostics, trace, or snapshot export per P0-AC-026;
   `diagnostics` context is the only provider that may carry trace-visible
   redacted preview, not raw secrets. Storing raw argument vectors, clipboard,
   or environment requires an explicit per-user opt-in distinct from workspace
   memory.
6. Persistence: by default Agent memory is ephemeral and wiped at disposal with
   verification against the pre-creation baseline within the PB-3 reclaim
   tolerance (`<= 15%` retained-by-design declared in manifest). Persistent
   memory (`AgentMemory` file in `~/.local/state/bitty/agent/<agent_id>/`)
   requires an explicit `agent.memory:persist` capability, user-only storage
   (`0600`), bounded retention (`<= 7 days` default, user configurable,
   truncate-oldest), and no network exfiltration. Workspace config may not widen
   an `agent.memory:persist = false` to `true`.
7. Ownership and scope separation: reading another `AgentId` memory, or
   cross-window memory, requires the target scope plus a per-target grant.
   There is no bundled `all` grant that silently implies sibling agents; each
   higher Agent level `inspect` < `self` < `workspace` < `all` needs its own
   consent, per [AI Architecture](ai-architecture.md).
8. GC and budget: conversational memory is charged under RC-4 tasks plus RC-5
   queues and RC-2 `32 MiB` per VM where the Agent plugin host runs; Browser
   surface memory is accounted under RC-3 `512 MiB` aggregate. No new heap
   ceiling is introduced.

### Capability isolation (candidate research)

1. Closed families: new Browser and Agent capabilities would close under
   `browser.*` and `agent.*` plus `mcp.*` as `browser.embed`,
   `browser.navigation`, `browser.storage`, `browser.file-url`,
   `agent.context.terminal`, `agent.context.workspace`,
   `agent.memory:persist`, `mcp.invoke:TOOL`. Plugins cannot invent families;
   an unlisted identifier fails at `ConfigPlan` plus manifest validation.
2. Browser isolation: `browser.embed` is high-risk and requires explicit user
   grant plus per-origin destination policy; `browser.file-url` requires a
   second distinct gate (`FileUrlActivation`) per R-005; `browser.storage`
   requires a third gate for cookie or cache persistence. Any navigation,
   storage, or file-URL action without its gate fails `CapabilityDenied`.
3. Agent isolation: terminal-scoped context `agent.context.terminal` is per
   `Terminal` with `generation`; workspace-scoped `agent.context.workspace`
   is per `Workspace`; cross-window `agent.context.all` needs per-target grants.
   ModelProvider `ai.model:complete`/`ai.model:stream` needs `ai.provider`
   plus `ai.stream` distinct from Tool Bus scopes; API keys are `0600` and
   `SecretField` redacted.
4. MCP isolation: each MCP tool maps to exactly one capability; invoking
   `xuepoo.fs:read` without `fs.read:PATTERN` fails even if `mcp.invoke` is
   granted. High-risk tools (`terminal.input.all`, `fs.write:PATTERN`,
   `process.spawn`) cannot be granted implicitly and never via bus message
   receipt.
5. Bus isolation: subscribing to or emitting on a Browser or Agent topic
   (`bitty.browser:navigated`, `xuepoo.agent:tool-output`) requires the
   emitter to have declared that topic as produced and the subscriber as
   consumed; high-value topics that carry raw PTY or clipboard content inherit
   the same high-risk consent as their capability family (`terminal.raw-read`,
   `clipboard.read`). Scope separation is per principal
   `(UID, AgentId)` or `(PluginId, generation)` or `(PanelId, generation)`.
6. Official and bundled panels pass through the identical isolation: the
   first-party Browser or Agent surface (if ever bundled) is not exempt; no
   private channel and no first-party bypass. Distribution verification must
   treat their capabilities like any community plugin.
7. Per-surface resource dimensions are owned by `(PanelId, generation)`,
   `(BrowserSurfaceId, generation)`, or `(AgentId, generation)` with
   attribution and observable accounting via `bitty plugin doctor`; per-plugin
   dimensions remain `(PluginId, generation)` per OQ-014.

### First-party plugin matrix before release (candidate research)

Before any release, the `v1` enabled set is empty: a fresh install with no user
configuration starts core only, identical to `bitty --safe`, per
[Default Distribution RFC](../specifications/default-distribution-rfc.md) (OQ-002).
Bundled presence adds zero active VM, queue, handler, or resident cost until
explicitly enabled; enabling is a user action with capability consent and the
permission-diff gate (R-016) for capability-increasing updates. The following
matrix is the candidate first-party set before release — not a shipped set and
not Compatible:

| Plugin ID                          | Candidate panel host                              | Policy owned by the plugin                                         | Core mechanism relied on                                                                 | Illustrative capability sketch                                                                                                   | Distribution before release                                                                                                                                                                                                   | Budget attribution                                                 |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `bitty-terminal.shell-integration` | none (terminal-owned OSC 7/133 derivation)        | Semantic zones, cwd, title propagation, prompt marks               | VT parser OSC 7/133, semantic zones, `ImageStore` anchor                                 | `terminal.semantic-read` read-only                                                                                               | bundled-disabled, `v1` empty enabled set                                                                                                                                                                                      | observation queue `PerSub 64`, no hot path                         |
| `bitty-terminal.tabs`              | `Panel` or `LayoutTree` `tabline` exclusive claim | Tab commands, ordering, closing policy                             | `LayoutTree` plus `tabline` claim, status slot composition                               | `ui.rich` or status slot plus `tabline` claim                                                                                    | bundled-disabled                                                                                                                                                                                                              | PerSub `64`                                                        |
| `bitty-terminal.statusline`        | `Panel` status slot                               | cwd, mode, Git and task presentation, composition policy           | Status slot, semantic snapshot, zone metadata                                            | `terminal.semantic-read`                                                                                                         | bundled-disabled                                                                                                                                                                                                              | PerSub `64`                                                        |
| `bitty-terminal.palette`           | overlay                                           | Command palette, fuzzy filtering, preview presentation             | Command registry, overlay `4+1`, declarative list plus text                              | `ui.overlay`                                                                                                                     | bundled-disabled                                                                                                                                                                                                              | overlay `4+1`, queue `PerSub 64`                                   |
| `bitty-terminal.project`           | `Panel` session surface                           | Project discovery, session presentation                            | Constrained project discovery plus session metadata via host                             | `fs.read:PROJECT_GLOB` constrained                                                                                               | bundled-disabled (Project plugin, reconciled here)                                                                                                                                                                            | `fs.read` path scoped, no ambient traversal                        |
| `bitty-terminal.browser`           | `View` `Browser` or `Panel` Browser surface       | Navigation, tab strip, address input, bounded history presentation | `BrowserSurfaceId` host surface, `LogicalRect` placement, bus topics                     | `browser.embed`, `browser.navigation` (+ `browser.file-url` for `file://`, `browser.storage` for persistence)                    | **candidate only, not bundled before release** — requires `browser.embed` high-risk gate, embedder process isolation, and R-005 `FileUrlActivation` review; stays out of `v1` enabled and distribution until its own RFC      | embedder under RC-3 `512 MiB` aggregate, queue `PerSub 64`         |
| `bitty-terminal.agent`             | `Panel` Agent surface plus optional Browser view  | Chat, tool invocation, memory presentation, consent surface        | `AgentId`, `AgentWorkspace` ephemeral, `ContextProvider` `32 KiB`, `AgentMemory` bounded | `agent.context.terminal`, `agent.context.workspace`, `agent.memory:persist` (opt-in), `mcp.invoke:*`, `ai.provider`, `ai.stream` | **candidate only, not bundled before release** — requires Agent four-level consent, `32 KiB` budget, `AgentWorkspace` `64`/`2 MiB` bounds, and T-10 R-013 untrusted observation defenses; stays out of `v1` until its own RFC | `AgentId` plus `PluginId` queues, RC-1/RC-2 per VM, RC-3 aggregate |

Rules under research for the matrix:

1. Bundled does not mean enabled: `bitty --safe` and a fresh install without
   user configuration both start core only even if `bitty-terminal.browser` or
   `bitty-terminal.agent` were present in a future distribution; their VMs,
   surfaces, handlers, timers, and queues are zero until the user explicitly
   enables them via `ConfigPlan` with per-capability consent.
2. Promotion criteria for any future enabled-by-default addition remain the six
   gates from [Default Distribution RFC](../specifications/default-distribution-rfc.md):
   lightweight budget proof (PB-1 `<= 100 ms` p50 cold start, PB-2 `<= 80 MiB`
   idle one window, PB-7 `<= 1%` CPU idle must hold), capability minimality,
   failure isolation (no crash of host), hot-path exclusion (`Platform -> Router`
   unchanged), explicit disable preservation, and independent security-auditor
   plus docs-curator sign-off.
3. No private channel: any Browser or Agent work that needs a private host API
   is evidence the boundary is incomplete and that plugin must not ship until
   the API is promoted via a reviewed RFC.

## Architectural placement (candidate)

```text
Instance (InstanceId)
  +-- Window (WindowId)  [native OS window, bitty-platform]
        +-- Workspace (WorkspaceId)  [tiling compositor, active per Window]
              +-- LayoutTree { H | V | View(ViewId) }  [Core-owned, H/V only]
                    +-- View (ViewId) -> content { Terminal(TerminalId) | Rich | Browser(BrowserSurfaceId) | Panel(PanelId) }
                    +-- Overlay (per Window, not a LayoutTree leaf, bounded 4+1)
        +-- PanelRuntime (per Window, host-mediated, draft PR-1..PR-12)
              +-- panels: Map<PanelId, Panel>  [generation]
              +-- browser: Map<BrowserSurfaceId, WebView>  [generation, per-Window]
              +-- agent: Map<AgentId, AgentSession>  [generation, per-Window]
              +-- mcp: Map<ServerId, MCPServer>  [host-owned Tool Bus adapter, bitty-mcp]
              +-- topics: Set<EventTopic>  [owner.name:topic, <= 64 bytes]
              +-- EventBus: Host-admission, three-level queues, DropOldest
              +-- AgentMemory: per AgentId conversational 32 turns + workspace 64 files
              +-- Command contributions: qualified owner.name:command, manifest-declared
```

Rules under research:

1. `PanelRuntime` owns Browser plus Agent panel creation, mount, suspend, resume,
   and disposal and holds no PTY fd, GPU object, next to `bitty-pty`/`bitty-render`/
   `bitty-platform`; those remain with their owners. The embedder owns the web
   process; the host owns the surface handle placement.
2. `Workspace` owns `LayoutTree` composition and `gaps_in`/`gaps_out`/`border`/`radius`;
   `PanelRuntime` never mutates decoration and never holds a mutable `Workspace`
   handle inside `BrowserProvider` or `AgentProvider` `propose`.
3. `LayoutProvider::propose` remains pure deterministic `propose(WorkspaceSnapshot, ViewId[], LogicalRect) -> LayoutTree`
   and any proposal that carries decoration or mutates panel or browser state is
   rejected.
4. The Event Bus and MCP Tool Bus are in-process first; cross-process routing,
   if ever adopted, goes through the accepted IPC transport with peer-credential
   auth and per-request scope evaluation, not through a new ambient channel.

## Identity: BrowserSurfaceId and AgentId distinct (candidate)

```rust
// Illustrative shapes only; not an implemented API.
struct BrowserSurfaceId(u64);
struct AgentId(u64);
struct PanelId(u64);
struct ViewId(u64);
struct TerminalId(u64);
struct Generation(u64);
struct EventTopic(BoundedString<64>);
```

Rules under research:

1. `BrowserSurfaceId`, `AgentId`, `PanelId`, `ViewId`, `TerminalId`,
   `RuntimeId`, `PersistentId`, and `Generation` are distinct types; no function
   accepts one where another is expected and no `From` bridge exists.
2. A `BrowserSurfaceId` or `AgentId` is created with a fresh `(id, Generation)`.
   Numeric reuse after disposal requires a generation bump so stale
   `(id, generation)` handles are detectable.
3. Handles travel as `(id, generation)` pairs on every cross-component call; a
   call with a stale generation is rejected with `StaleHandle` before any
   embedder, PTY, or agent memory access, mirroring the registry and view rule.

## Bounded resources (candidate research defaults)

All ceilings are candidate defaults parameterized for harness coverage. Changing
a value requires a reviewed RFC revision, never silent drift. Floors are
enforced; unknown or out-of-range budget keys fail validation closed per the
isolation `ceiling-is-upward-only` and attribution rules. Values are chosen to
fit inside the accepted three-level envelope (PerSub `64`, PerPlugin `1024`/`256 KiB`,
Global `8192`/`2 MiB`, `BoundedText` `8 KiB`, `drain_batch` `32`/`8 KiB`,
RC-1 `10^7`/`50 ms`/`8 ms`, RC-2 `32 MiB`, RC-3 `512 MiB`, IPC frame `256 KiB`)
without introducing a new global budget family.

| ID    | Dimension                           | Candidate default                                                 | Applies to                                 | Validation point                              | Failure                                                           |
| ----- | ----------------------------------- | ----------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------- | ----------------------------------------------------------------- |
| BA-1  | Browser panels per window           | `[1, 8]`, default `4` aggregate                                   | per window                                 | `PanelRuntime::create_browser` + `ConfigPlan` | `TooManyBrowserPanels`                                            |
| BA-2  | WebView instances per Browser panel | `1`, strict                                                       | per `BrowserSurfaceId`                     | creation                                      | `TooManyWebViews`                                                 |
| BA-3  | Browser navigation pending          | `32` URLs strict FIFO at `EventQueue::push`                       | per `BrowserSurfaceId`                     | navigation enqueue                            | `DropOldest`, counted                                             |
| BA-4  | MCP servers per window              | `[1, 8]`, default `4`                                             | per window                                 | manifest validation                           | `TooManyMCPServers`                                               |
| BA-5  | MCP tools per server                | `[1, 32]`, default `16`                                           | per `ServerId`                             | registration                                  | `TooManyMCPTools`                                                 |
| BA-6  | MCP call payload                    | `<= 8 KiB` per call plus schema `<= 4 KiB` (`BoundedText` strict) | per `mcp.invoke`                           | host admission                                | `PayloadTooLarge`                                                 |
| BA-7  | Agent sessions per window           | `[1, 4]`, default `1`                                             | per window                                 | `PanelRuntime::create_agent`                  | `TooManyAgents`                                                   |
| BA-8  | Agent context budget per turn       | `32 KiB` strict plus attribution, priority truncation             | per `AgentId` turn                         | provider assembly before model I/O            | `BudgetExceeded` with `truncated_bytes`                           |
| BA-9  | Agent workspace files and bytes     | `64` files / `2 MiB` aggregate / `256 KiB` per file               | per `AgentId` `AgentWorkspace`             | `AgentWorkspace` write                        | `WorkspaceQuotaExceeded`                                          |
| BA-10 | Agent conversational turns          | `32` turns / `64 KiB` aggregate / `8 KiB` per turn                | per `AgentId` memory                       | memory append                                 | `DropOldest` oldest-first, counted                                |
| BA-11 | Enabled first-party before release  | `0` (empty enabled set at `v1`)                                   | per install                                | `ConfigPlan` + distribution check             | enabling requires explicit consent; Browser and Agent not enabled |
| BA-12 | Bus topics for Browser and Agent    | `<= 32` topics per panel or plugin, `<= 256` total per process    | per `PanelId`/`BrowserSurfaceId`/`AgentId` | manifest validation                           | `TooManySubscriptions` / `TooManyTopics`                          |

Notes:

- BA-3 plus BA-12 intentionally mirror the accepted `PerSubscription`/`PerPlugin`/`Global`
  ceilings so a future implementation tests browser plus MCP plus agent traffic with the
  same harness as plugin events and panel bus traffic; no new budget family is introduced.
- Aggregate browser plus MCP plus agent plus panel plus plugin bus traffic shares the
  same global `8192`/`2 MiB` envelope; a Browser navigation burst that would exceed it
  is the same global-limit event as a plugin or panel burst, not a second independent
  ceiling.
- Browser surface memory beyond queues (web process heap, image cache) is accounted
  under RC-3 `512 MiB` aggregate, not under a new per-VM free pool; this research
  does not introduce a new heap ceiling. Agent memory beyond the workspace
  (`AgentMemory` persistence file `~/.local/state/bitty/agent/<agent_id>/`) is bounded
  under `2 MiB` plus `7`-day retention and is wiped at disposal unless `agent.memory:persist`
  is granted.

## Failure semantics (candidate)

All operations return a typed browser, MCP, or agent error and leave the previous
valid state intact. No operation panics and no operation partially commits.

| Error                    | When                                                          | Diagnostic                     | Recovery                                                   |
| ------------------------ | ------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| `TooManyBrowserPanels`   | `create_browser` would exceed BA-1                            | bound and current count        | Close a browser panel or raise the bound via `ConfigPlan`  |
| `TooManyWebViews`        | Second `WebView` for same `BrowserSurfaceId`                  | surface id, generation         | Dispose the existing surface first                         |
| `NavigationDenied`       | URL outside allowlist or `file://` without `browser.file-url` | URL, allowlist, capability     | Add `browser.file-url` gate or allow the origin via policy |
| `InvalidUrl`             | Malformed or `javascript:`-style URL                          | URL, parse error               | Supply a valid `https` or `file` URL                       |
| `ProjectScopeDenied`     | Path not covered by `PROJECT_GLOB` or session metadata        | path, `PROJECT_GLOB`           | Constrain the path to the project discovery result         |
| `TooManyMCPServers`      | Manifest would exceed BA-4                                    | count and bound                | Remove or merge servers                                    |
| `TooManyMCPTools`        | Server would exceed BA-5                                      | server id, count               | Remove or merge tools                                      |
| `PayloadTooLarge`        | `mcp.invoke` or `bus.emit` exceeds BA-6 or `8 KiB`            | bytes, depth `32`              | Truncate or chunk the caller                               |
| `UnknownTool`            | Tool not declared in any server manifest                      | tool name, server id           | Register the tool in the manifest                          |
| `CapabilityDenied`       | Missing `browser.*`, `agent.*`, or `mcp.*` capability         | owning id, required capability | Grant the capability or narrow the request                 |
| `TooManyAgents`          | `create_agent` would exceed BA-7                              | bound and current count        | Close an agent session or raise the bound                  |
| `BudgetExceeded`         | Context plus `32 KiB` budget would exceed BA-8                | bytes, `truncated_bytes`       | Narrow Selected Ids or truncate per priority               |
| `WorkspaceQuotaExceeded` | `AgentWorkspace` would exceed BA-9                            | files, bytes, bound            | Remove files or raise the quota via `ConfigPlan`           |
| `MemoryQuotaExceeded`    | Conversational `32`/`64 KiB` would exceed BA-10               | count, bytes                   | Persist or drop oldest per `DropOldest`                    |
| `StaleHandle`            | Generation mismatch for Browser, Agent, or Panel              | expected and found generations | Re-resolve the handle                                      |
| `GenerationExhausted`    | Within `1024` of `u64::MAX`                                   | current generation             | Restart the process; no wrap                               |
| `ResourceExhausted`      | Embedder or helper allocation failed                          | platform error, no fd leaked   | Retry or report; runtime remains valid                     |
| `ConsentRequired`        | High-risk Browser, MCP, or Agent scope without consent        | owning id, required scope      | Obtain explicit per-target consent                         |

Every error increments a bounded diagnostic counter `browser.errors.<variant>`,
`mcp.errors.<variant>`, or `agent.errors.<variant>` and is available via the
debug protocol. Error strings and counters are bounded and never echo unbounded
web, MCP, or agent payloads.

Containment and attribution rules under research:

- FS-BA1 Transactional denial: a refused capability, budget, or scope leaves no
  partial state — no allocation charged, no queue entry, no MCP dispatch.
- FS-BA2 Containment: a fault affects only the owning `BrowserSurfaceId`,
  `AgentId`, or `PanelId` generation; the host process survives and sibling
  panels and terminals stay responsive.
- FS-BA3 Attribution: every enforcement action emits owner, generation,
  dimension, observed value, limit, and action. Unattributed enforcement is a bug.
- FS-BA4 Reclaim: after Browser or Agent disposal, queues, workspace files,
  memory, tasks, timers, and embedder handles are released and verified against
  the pre-creation baseline within the PB-3 reclaim tolerance; retained-by-design
  state is declared in the manifest.
- FS-BA5 Fail-closed machinery: if the budget, bus, MCP, or embedder machinery
  cannot start or is detected disabled, Browser and Agent panels that require it
  refuse to load rather than running unbounded.

## Explicit exclusions (not authorized)

The following remain explicitly out of scope for this research and are not
authorized as shipped, stable, or compatibility-guaranteed behavior by this
draft. Each requires its own RFC or ADR with independent architecture, security,
and performance review before it can be claimed.

| Excluded                                                                          | Why deferred                                                                                                                                      | What this research does instead                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Daemon `bittyd` and session persistence across reboots                            | Post-v1.0 per [ADR 0008](../decisions/adrs/ADR-0008-headless.md); trust boundary not reviewed here                                                | Process-scoped Browser plus Agent only; persistence is at most `AgentWorkspace` rehydration with explicit `agent.memory:persist`        |
| Remote UI and cross-host MCP transport                                            | New trust boundary with cross-machine auth (`mTLS` or SSH tunnel) not evaluated                                                                   | No remote wire format, no TCP listener, no remote capability mapping; MCP reuses current-user IPC framing if needed                     |
| Multi-window as global server for Browser or Agent                                | Window stays native OS object per [Workspace Compositor](workspace-compositor.md); orchestrating many windows adds focus, DPI, and lifetime costs | One `Instance` owns `Window`s; Browser and Agent work is single-window first; cross-window topics deferred                              |
| WASM or helper-process strong isolation for Browser or Agent beyond embedder      | Native in-process plugins remain rejected per [Threat Model](../security/threat-model.md); WASM/helper design needs its own RFC                   | In-process Lua VM isolation per OQ-014 remains the only in-process boundary; Browser embedder already owns a web process                |
| Browser per-window process budget beyond RC-3 aggregate                           | `browser.embed` is already high-risk plus `Browser` view type already requires dedicated isolation; new ceiling needs its own RFC                 | Browser surfaces reuse `browser.embed` gate and existing RC-3 aggregate; BA-1 `8` panels is the only Browser ceiling here               |
| Agent autonomous browsing or navigation without user-initiated `browser.navigate` | Agent-driven `file://` or cross-origin `https` without explicit `browser.navigation` plus destination consent would bypass Browser isolation      | Agent may request navigation only through `browser.navigate` with the same capability and allowlist gate as any panel                   |
| Persistent Agent memory by default                                                | Default persistence would carry secrets across restarts; `agent.memory:persist` plus `0600` plus `7`-day retention needs explicit consent         | Ephemeral `32` turns plus `AgentWorkspace` `64`/`2 MiB`; persistence is opt-in, counted, and wipe-verified                              |
| New global file, network, or process ambient for Lua or Agent                     | Violates [Security Overview](../security/overview.md) invariant 2 and T-10                                                                        | Browser and Agent obtain those only via explicit `fs.read:PROJECT_GLOB`/`network.connect:DESTINATION`/`process.spawn:CONSTRAINT`        |
| New hot-path Agent pre-encode interception                                        | Would put Lua or Agent on the hot path per [Input and Pointer Contract](input-pointer-rfc.md)                                                     | Agent observes via commands, `focus.changed` plus bus observation only, never via hot-path interception                                 |
| Distribution or marketplace ownership (`bitty-dev`, `LazyBitty`, `awesome-bitty`) | Owned by [Default Distribution RFC](../specifications/default-distribution-rfc.md) and future panel distribution RFC                              | Research notes presets as configuration composition, not as a new bundled-enabled set; Browser and Agent are not bundled before release |

Claiming any excluded behavior by citing this pre-study is a documentation
hygiene violation. Cross-document references must preserve the deferred status.

## Security review (candidate research)

This research creates no ambient authority and does not weaken any P0 gate:

1. Browser `WebView` processes, `BrowserSurfaceId`, and embedder surfaces remain
   with the embedder; no `View`, `Panel`, `LayoutTree`, `PanelProvider`, MCP
   server, or Agent receives a PTY file descriptor, GPU object, or OS window handle.
2. `BrowserSurfaceId`, `AgentId`, `PanelId`, `ViewId`, and `TerminalId` remain
   distinct newtypes; a confused-deputy where a `Browser` operation is misdirected
   at a `Terminal` or an `Agent` memory read is performed via a Browser scope is
   prevented at the type level and by generation checks.
3. Decoration (`gaps_in`, `gaps_out`, `border`, `radius`) is validated in
   `ConfigPlan` and owned by the compositor; no provider, panel, browser, or
   agent sets it at runtime and any bus or MCP payload that carries it is rejected.
4. Bus topics cannot grant capabilities: a topic that signals `browser.navigated`
   or `agent.tool-output` does not imply the scope to perform that action; the
   host validates capability per subscriber action, not per message receipt.
5. The existing IPC framing bounds, current-user transport (`$XDG_RUNTIME_DIR/bitty`
   `0700`/`0600` with `SO_PEERCRED` or macOS `LOCAL_PEERCRED`, Windows named pipe
   current-user ACL), peer-credential checks, per-request scope evaluation, and
   RC-9/RC-10 quotas remain the security baseline for any future cross-process
   Browser or Agent MCP; this research does not introduce a TCP listener or an
   ambient bearer token.
6. Host responsiveness during Browser, MCP, or Agent bursts is bounded by the same
   invariant used for isolation: input-to-render p99 within the PB-4 tail budget
   while under burst, with `DropOldest` converging to latest state.
7. Browser WebView is untrusted web content; its process is the isolation boundary,
   not Lua isolation alone. Agent terminal observations are `is_untrusted_surface`
   per [IPC and Agent RFC](ipc-agent-rfc.md) T-10 R-013; no string-sniffing
   inside the agent crate is relied upon for prompt content. Browser `file://`
   carries the distinct `FileUrlActivation` gate per R-005 with activation-gesture
   pending full integration.
8. Secrets remain typed `SecretField` and redacted before diagnostics, trace, or
   snapshot export; `diagnostics` context is the only provider that may carry a
   redacted preview, not raw secrets. Network-exposed `ai.provider` credentials
   are `0600` and never in `AgentWorkspace`, discovery files, or environment.

All controls above are candidate until the implementing tasks deliver focused
tests, fuzz corpora, and independent security-auditor review per
[P0 Acceptance Criteria](../security/p0-acceptance-criteria.md) and the
[Risk Evidence RFC](../specifications/risk-evidence-rfc.md).

## Reconciliation with Panel Runtime, Project plugin, and Workspace Compositor

Accepted contracts remain authoritative; this research proposes how a future
Browser and Agent RFC would sit on the draft Panel Runtime plus Project plugin
plus Workspace Compositor without revising them:

- **Hierarchy**: `Instance -> Window -> Workspace -> LayoutTree -> View` stays
  authoritative per [Workspace Compositor](workspace-compositor.md). Browser is a
  candidate `ViewContent::Browser(BrowserSurfaceId)` (already accepted type) and
  Agent is a candidate `ViewContent::Panel(PanelId)` whose panel content is an
  agent surface; neither adds a second tiling primitive. Without an accepted
  Panel plus Browser plus Agent RFC, `ViewContent` stays closed to
  `Empty | Terminal | Rich | Browser` and no `AgentId` exists in the hierarchy.
- **Identity**: `ViewId != TerminalId` is authoritative per both accepted
  contracts. The draft panel pre-study adds `PanelId != ViewId != TerminalId`
  with the same generation and `StaleHandle` rules; this research adds
  `BrowserSurfaceId != PanelId` and `AgentId != PanelId` with the same
  generation rule. No migration of `ViewId` naming is performed by this pre-study.
- **Panel Runtime**: `PanelId` plus `Generation`, command `owner.name:command`,
  overlay `4+1`, focus MRU no Lua hot path, bus `owner.name:topic` `8 KiB`/`32`/`64`/`1024`/`8192`
  `DropOldest` per draft panel pre-study (`9032d1e` / requested `05e8803`, PR-1..PR-12)
  are candidate until their own RFC. This research proposes that Browser and Agent
  reuse that exact lifecycle and bus placement (host-mediated per Window, no
  cross-window topic escape) and fit inside PR-1..PR-12 via BA-1..BA-12 without a
  new global budget family.
- **Project plugin**: `bitty-terminal.project` (`Draft`, bundled-disabled,
  `fs.read:PROJECT_GLOB` constrained, `32`/`64`/`1024`/`8192`) stays authoritative
  for project discovery and session presentation per [Plugin Roadmap](../product/plugin-roadmap.md).
  This research proposes that `project` remains the only plugin allowed a
  constrained project discovery read; Browser `file://` navigation and Agent
  `project` ContextProvider both validate against the same `PROJECT_GLOB` and
  session metadata. Unvalidated paths fail with `ProjectScopeDenied`; no second
  discovery rule is introduced.
- **Focus**: focus MRU per workspace, `View focused: bool`, and the rule
  `Platform -> Router -> focused View/Panel -> keymap -> encoder -> PTY` are
  authoritative per [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md).
  The panel pre-study proposes that the router read `focused Panel` as an
  alternative target with identical MRU and `no_focus` counter semantics; this
  research proposes that Browser and Agent share that same router without a new
  `input.pre-encode` interception point and that a hidden Browser or Agent never
  receives keyboard or wheel.
- **Resize and geometry**: `LogicalRect` per attached view validated by Core, then
  `cols = floor(rect.width / cell_width)`, `rows = floor(rect.height / cell_height)`
  clamped to `[1,1024]` are authoritative. This research proposes that a
  Browser-backed `View` maps `LogicalRect` directly to `WebView` bounds without
  PTY resize, and that terminal-backed Agent context uses the existing rect plus
  cell-metric path with `resize_coalesced` counting; non-terminal Browser and
  Agent produce no PTY resize.
- **Visibility**: inactive workspace, scratchpad hidden, zero-area, and overlay
  occluded semantics per the registry and compositor stay authoritative. This
  research proposes that a Browser or Agent whose view is invisible retains its
  `BrowserSurfaceId` or `AgentId` and attachment but incurs no render cost,
  pauses media, and cannot hold window focus, identical to the terminal plus panel rule.
- **Bounded resources**: `max_terminals 64`/`max_views 32`/`max_workspaces 16`
  with `ConfigPlan` validation are authoritative per the registry and workspace
  specs. This research proposes Browser `8` panels per window, MCP `8` servers
  per window, MCP `32` tools per server, Agent `4` sessions per window, workspace
  `64`/`2 MiB`, conversational `32`/`64 KiB`, plus empty `v1` enabled set (BA-11)
  as sibling ceilings that fit inside the same validation and do not silently clamp.
- **Exclusions**: daemon, remote UI, and live PTY migration remain deferred per
  [ADR 0008](../decisions/adrs/ADR-0008-headless.md) and per the explicit
  exclusion tables of both accepted contracts plus the draft panel pre-study;
  this research preserves those deferrals and introduces no cross-process or
  cross-window Browser or Agent transfer.

No accepted requirement is moved between owners and no bypass is introduced.
Project-constrained discovery remains the sole project read path even when
Browser and Agent are present.

## Alternatives considered

| Alternative                                                           | Trade-off                                                                                          | Research disposition                                                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Browser as `Panel` leaf replacing `View` `Browser`                    | Strongly typed panel Browser but breaks accepted `View` `Browser` type and forces churn            | Rejected for this research; Option A (native `View` `Browser` plus `Panel` `Agent`) preserves history                                      |
| Browser implements render hook with direct DOM or JS value to Lua     | Maximal Browser control but exposes WebView process memory to Lua and breaks invariant 2/3         | Rejected; Browser is a host-owned surface handle, not a Lua DOM bridge                                                                     |
| MCP as direct tool function share (`agent -> server` object share)    | Lowest latency but creates ambient authority and confused deputies per T-10                        | Rejected; MCP is host-mediated with qualified `owner.name:tool`, schemas, and scopes                                                       |
| Agent memory as unbounded global store                                | Simplest persistence but allows one agent to starve the host or retain secrets indefinitely        | Rejected; three-level queue plus `64`/`2 MiB` workspace plus `32`/`64 KiB` conversational plus `7`-day retention are required              |
| Global unbounded Browser plus MCP plus Agent bus (one queue, no drop) | Simplest but allows one burst to starve the host per T-07                                          | Rejected; three-level envelopes with `DropOldest` default and `8192`/`2 MiB` global hard gate are required                                 |
| WASM or helper-process per Browser or Agent in `v1` with new runtime  | Stronger isolation but large toolchain and transport cost; Browser embedder already owns a process | Deferred; OQ-014 per-VM isolation plus Browser embedder process remain the `v1` boundaries, helper reuse is candidate via IPC framing only |

## Verification plan (candidate research gates)

Acceptance of a future implemented Browser and Agent integration contract would
require, at minimum (none is satisfied by this pre-study alone):

1. Metadata and link gates: `just check` with zero markdownlint, link, metadata,
   language, agents, and hygiene issues plus `act -n -W .github/workflows/ci.yml`
   dry-run success and `bun .github/scripts/check-state.mjs` where applicable.
2. Identity invariant tests: `BrowserSurfaceId`, `AgentId`, `PanelId`, `ViewId`,
   `TerminalId`, `RuntimeId`, `PersistentId`, and `Generation` are distinct
   types; stale `(id, generation)` is rejected with `StaleHandle`; moving a
   Browser or Agent panel between views preserves its id and changes only
   `ViewId`; project-constrained paths are rejected outside `PROJECT_GLOB`.
3. Browser lifecycle tests: `create_browser` beyond `max_browser_panels_per_window`
   returns `TooManyBrowserPanels`; `browser.navigate` with `file://` without
   `browser.file-url` returns `NavigationDenied`; `javascript:` fails with
   `InvalidUrl`; becoming invisible pauses media and retains attachment; disposal
   wipes cache and makes every further call return `StaleHandle`.
4. MCP tests: undeclared server or tool returns `UnknownTool`; `mcp.invoke` without
   `fs.read` or `mcp.invoke:TOOL` scope returns `CapabilityDenied`; oversize
   `8 KiB` or schema `4 KiB` violation returns `PayloadTooLarge`; `DropOldest`
   versus `DropNewest` under `1024`/`256 KiB` plus `8192`/`2 MiB` hard gate is
   covered with counted drops and `invariant_global_bounds` strict.
5. Agent memory tests: context assembly beyond `32 KiB` returns `BudgetExceeded`
   with `truncated_bytes`; workspace write beyond `64`/`2 MiB` returns
   `WorkspaceQuotaExceeded`; conversational append beyond `32`/`64 KiB` drops
   oldest with a metric; persistent memory without `agent.memory:persist` is
   refused; disposal verifies wipe within PB-3 tolerance.
6. Focus tests: MRU ordering, overlay `4+1` capture, `no_focus` counter, and the
   rule that a hidden Browser or Agent never receives keyboard, IME, or wheel.
7. Layout tests: `H`/`V` only, `ratio` bounds, decoration rejection at
   `ConfigPlan` and at `BrowserProvider`/`AgentProvider` proposal admission,
   `--safe` decoration `0`/`0`/`1`/`0` regardless of Browser or Agent config.
8. Project reconciliation tests: `bitty-terminal.project` discovery plus
   `PROJECT_GLOB` validation is the sole project read path; Browser `file://`
   and Agent `project` read of an unvalidated path return `ProjectScopeDenied`;
   workspace config may not widen discovery.
9. First-party matrix tests: `v1` empty enabled set holds even when
   `bitty-terminal.browser` or `bitty-terminal.agent` are present in the
   distribution directory; `bitty --safe` starts with zero `BrowserSurfaceId` plus
   `AgentId`; promotion to enabled-by-default is blocked until the six
   promotion criteria plus auditor sign-off are met.
10. Headless composition tests: `Workspace` view rectangles, Browser rect plus
    embedder placement, Agent memory assembly, and PanelRuntime lifecycle each
    have headless tests without a window or GPU, asserting rectangle equivalence
    and atomicity of cross-workspace moves.

## Open items remaining under this research pre-study

- Exact `BrowserSurfaceId` plus `AgentId` trait spelling, error taxonomy, and
  crate placement beyond the illustrative sketches above (`bitty-ui` versus
  `bitty-runtime` versus `bitty-platform` versus `bitty-agent` versus `bitty-mcp`).
- Whether Browser `file://` uses a distinct `FileUrlActivation` gesture gate
  identical to the pending R-005 link activation or a new `browser.file-url`
  activation shape, and whether history is bounded separately.
- Whether MCP `bitty-mcp` is a standalone crate or a module inside `bitty-agent`,
  and whether its server registry is shared with plugin services.
- Whether `AgentMemory` persistence file path, format, and encryption-at-rest
  use `0600` plus `SecretField` only or an additional OS keychain gate, and
  whether retention is exactly `7` days or user-configurable with a different
  default.
- Whether the draft AI Architecture ModelProvider registry (`ai.model`) lives in
  `bitty-agent` or `bitty-runtime` and which host API owns `list_models` plus
  `complete` plus `stream` plus `cancel`.
- Whether Browser and Agent panels require an additional per-Window embedder
  or process budget beyond RC-3 `512 MiB` aggregate, and whether the default
  `4` Browser panels plus `4` MCP servers plus `1` Agent session fit the
  v1.0 budget ladder.
- Whether `bitty-terminal.browser` and `bitty-terminal.agent` ever become
  bundled-disabled first-party plugins before `v1` or remain install-time
  featured plugins after `v1` (install-time is the current research preference).
- Concrete headless test harness placement for `BrowserSurfaceId` plus `AgentId`
  placement and for `PROJECT_GLOB` plus session metadata validation.
- Whether `PanelRuntime` browser plus agent extension participates in
  `ConfigPlan` live reload or requires a `Window` recreation.

This research pre-study is **draft** (`Draft` not `Accepted`/`Verified`, no
experimental implementation, not `Compatible`) and must not be cited as
shipped, stable, or compatibility-guaranteed behavior. Remaining open items
above require follow-up RFCs or tasks per the
[documentation workflow](../development/documentation-workflow.md) and
[open-question register](../decisions/open-questions.md).

## References

- [Panel Runtime and Event Bus Pre-Study](panel-runtime-pre-study.md) (`Draft`, CTX-0119, `9032d1e` / requested `05e8803`)
- [Workspace Compositor Specification](workspace-compositor.md) (`Accepted`, CTX-0118, `c3a2928`)
- [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md) (`Accepted`, CTX-0117, `6f30c2f`)
- [Plugin Roadmap](../product/plugin-roadmap.md) (`Draft`, Project plugin `bitty-terminal.project`)
- [AI Architecture](ai-architecture.md) (`Draft`, P2 deferred)
- [Isolation Resource RFC](isolation-resource-rfc.md) (`Accepted`, OQ-014)
- [Plugin Platform RFC](plugin-platform-rfc.md) (`Accepted`, OQ-011/012/013)
- [IPC and Agent RFC](ipc-agent-rfc.md) (`Accepted`, OQ-018)
- [Rich Presentation RFC](rich-presentation-rfc.md) (`Accepted`, OQ-008/015/016)
- WebView embedders: `wry` (WebView) plus `webkitgtk`/`webview2`/`wkwebview` as non-normative embedder candidates
- MCP: Model Context Protocol as non-normative Tool Bus wire candidate
