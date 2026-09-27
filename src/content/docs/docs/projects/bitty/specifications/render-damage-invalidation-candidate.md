---
title: Render Damage and Invalidation Architecture (Candidate)
description: Candidate three-level damage tracking with browser-style UI invalidation persistent panel textures and ring-buffer scroll under wgpu
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 61
---

# Render Damage and Invalidation Architecture (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This note sketches a candidate render
> damage and invalidation architecture generalized from the way the foot
> terminal emulator achieves its speed, adapted to Bitty's wgpu-based,
> multi-panel workspace. It authorizes no shipped behavior, weakens no
> accepted source it cites, and makes no implementation claim beyond the
> explicitly labeled built-versus-not-built record below; every type and
> field name below is candidate spelling unless the built-versus-not-built
> record says it names observed implementation.

## Purpose and scope

Bitty will render a terminal grid, native UI, and graphics side by side in
one wgpu compositor. Redrawing everything on every state change does not
scale to that future: text shaping, glyph generation, vertex rebuilding,
and UI layout are the expensive steps, and most frames change only a small
fraction of the visible surface. This note states the candidate strategy
for avoiding that work — track what changed at three levels (cell, panel,
scene), rebuild only the damaged regions, and compose cheaply — before any
implementation is designed.

In scope: the five observed mechanisms behind foot's speed, the
three-level damage generalization for Bitty, the `DamageSpan`
row-plus-column-range spelling, browser-style UI invalidation, the
Persistent Panel Texture proposal under wgpu, tile damage, ring-buffer GPU
scroll, the core invalidation principle, and the explicit
built-versus-not-built record.

Out of scope and owned elsewhere: the text shaping and atlas contract
(draft [Text and Rendering RFC](text-rendering-rfc.md)); the panel
lifecycle state machine (accepted [Panel Runtime RFC](panel-runtime-rfc.md));
the non-terminal panel content path (candidate
[Panel Content Scene Path Decision](panel-content-scene-path-decision.md));
the UI runtime program (candidate
[Workspace-Native UI Runtime](ui-runtime-candidate.md)); performance
ceilings (accepted
[Performance Budget RFC](performance-budget-rfc.md)).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  and [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md):
  terminal output is observation data, never instructions; no new
  capability, bypass, or ambient authority is granted here.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  (`Accepted`): Core manages resources, state, invariants, and mechanisms;
  plugins manage behavior, policy, and user experience; the P0 gates stand.
- [Panel Runtime RFC](panel-runtime-rfc.md) (`Accepted`): the panel
  lifecycle contract; this note adds no lifecycle rule.
- [Performance Budget RFC](performance-budget-rfc.md) (`Accepted`): the
  frame and latency ceilings; a future damage implementation must be
  measured against them, not assumed to satisfy them.
- [Rich Presentation RFC](rich-presentation-rfc.md) (`Accepted`): rich
  output stays a content kind, not a UI framework.

## Terminology

- **Damage**: a record that a region of renderable state changed and its
  cached rendering is stale. Damage says what must be rebuilt; it never
  triggers rendering by itself.
- **Invalidation**: the act of marking cached rendering stale, from a
  single cell up to a whole panel. Invalidation propagates upward (cell to
  row, node to subtree); rendering consumes the accumulated damage
  downward.
- **Cell damage**: the finest terminal level. One grid cell's content or
  attributes (including cursor occupancy) changed.
- **Row damage**: one grid row contains at least one damaged cell and
  needs repainting.
- **Panel damage**: one workspace panel contains stale content and needs
  re-rendering into its own render target.
- **Scene damage**: the composed workspace (panels, chrome, overlays)
  needs recomposition.
- **Frame scheduler**: the stage that collects damage over a short
  window, drops intermediate states nobody will ever see, and issues at
  most one render per coalesced update.
- **Persistent Panel Texture**: the candidate design in which each panel
  owns a long-lived GPU texture; unchanged panels reuse theirs while only
  damaged panels repaint, followed by one cheap composition pass.
- **Tile**: a fixed subdivision of a panel texture; the unit of
  sub-panel damage tracking.
- **Viewport**: the logical window onto a ring-buffered grid. Scrolling
  moves the viewport, not the stored rows.

## Why foot is fast: less work, not faster work

The central lesson is one sentence: foot is fast because it does less
work per update, not because it executes the same work on faster
hardware. It renders primarily on the CPU into Wayland shared-memory
buffers and still outperforms many GPU-first terminals, because every
stage of its pipeline asks "can this update skip work?" before asking
"how fast can this run?". Five mechanisms carry that idea end to end.

### Cell and row dirty tracking

Foot tracks dirtiness at two granularities. Each row carries a dirty
flag, and each cell carries a clean flag in its attributes. A cursor
blink marks only the cursor cell not-clean and its row dirty; text
attribute changes (for example blinking text) dirtify only the cells
that carry the attribute. The default configuration damages only updated
rows to the Wayland compositor; forcing whole-window damage is
documented as potentially increasing compositor CPU and GPU load.

The pipeline for a single typed character is therefore: one cell
changed, one row dirty, repaint that region only, report that region
through the Wayland damage protocol, and the compositor processes only
the changed region. The full-window path — re-rasterize every glyph,
repaint the whole framebuffer, damage the whole surface — never runs.

### Viewport moves instead of memory moves on scroll

Interactive scrolling (holding arrow keys in an editor, streaming log
output) is the worst case for a naive renderer: every scroll step
memcpy-shifts the whole grid. Foot instead reserves a large virtual
address space for its scrollback pixmap (the configurable shared-memory
pool size exists for this) so that scrolling remaps the view rather than
copying every row. The logical equivalent is a ring buffer with a moving
viewport: physical storage stays in place while the visible window
advances. This note returns to the GPU form of the same idea under
ring-buffer scroll below.

### PTY coalescing window

One logical screen update rarely arrives as one operating-system write.
A full-screen program may emit a cursor move, a line clear, and several
text fragments as separate writes, and rendering after each write would
paint intermediate states — blank screen, half-drawn screen, final
screen — wasting work and producing visible flicker. Foot inserts a
small delayed-rendering window that parses each write into grid
mutations first and renders once the burst settles. For Bitty this
matters beyond the terminal: PTY bytes, native UI state, plugin IPC,
agent status, animations, and images will all produce update bursts
that must converge on one frame, not one render per source event.

### Row-parallel workers capped by visible rows

Foot can spread rendering across worker threads up to the logical CPU
count, with row rendering as the natural unit of parallel work — and
its configuration documents that effective parallelism never exceeds
the visible row count. Rows are independent paint units, so dirty rows
partition cleanly across workers with no cross-row synchronization.
The cap is the honest part: parallelism scales with visible damage,
never with thread count alone.

### Server-mode shared glyph cache

In server mode, foot windows share fonts, glyph caches, and process
resources instead of each window loading fonts, shaping glyphs, and
building caches independently. Font loading and glyph rasterization are
one-time costs amortized across windows. The Bitty analogue is the
shared resource cache (glyph atlas, images, text runs, panel textures)
sitting beside, not inside, any single panel's render path.

## Bitty generalization: three-level damage

Foot's damage model covers one surface kind: the terminal grid. Bitty
composes three — terminal grids, native UI, graphics — so the candidate
generalizes damage to three levels feeding one tracker:

```text
                    Bitty state
                        |
          +-------------+-------------+
          v             v             v
    Terminal grid    Native UI     Graphics
          |             |             |
     dirty cell    dirty node    dirty rect
          |             |             |
          +------+------+------+-----+
                 v
          Damage tracker
                 |
          Region / tile set
                 |
                 v
          Frame scheduler
                 |
                 v
             Renderer
```

Level 1 (cell damage) is the foot-like terminal layer described next.
Level 2 (panel damage) records that one panel's content is stale while
its neighbors are clean — an agent status flip in the sidebar must not
repaint the terminal panel beside it. Level 3 (scene damage) records
that the composed workspace needs recomposition after its panels
repaint. Each level narrows the work the next level must do; no level
may assume the levels below it repainted everything.

## DamageSpan: row plus column range

Row granularity is already a large saving, but ordinary shell input
changes far less than a row. Typing one character dirties one cell, so
the candidate refines row damage with a column range:

```text
DamageSpan {
    row: 10,
    start: 23,
    end: 28,
}
```

A single typed character then produces damage of exactly one row and a
one-column span — the renderer repaints that span, not the row, not the
panel, not the window. Spans also merge cheaply: adjacent spans on one
row coalesce into one repaint, and a fully covered row degrades
gracefully to whole-row damage without a separate code path.

## Browser-style UI invalidation

The terminal grid has cells and rows; native UI has a retained tree of
widgets with layout. Redrawing the whole workspace because one widget
changed repeats the full-window mistake at a higher level. The
candidate applies browser-style invalidation instead: a state change
dirties the owning node, layout recomputation stops at the nearest
ancestor whose geometry is unaffected, and only the resulting subtree
rectangle is marked damaged.

```text
UI tree

Workspace
|-- Sidebar
|   |-- AgentList
|   |   |-- Agent A
|   |   `-- Agent B  <- changed
|   `-- PluginList
|-- TerminalPanel
`-- Statusline
```

Only Agent B's node is invalidated; if AgentList's layout is unchanged,
damage is confined to the sidebar sub-rectangle and the terminal panel
and statusline repaint nothing. This is retained-mode scene-graph
thinking — closer to browser invalidation and UI reconciliation than to
traditional terminal rendering — and it is what lets Level 2 panel
damage stay narrow when the workspace fills with agent dashboards,
graphs, and animated content.

## Persistent Panel Texture under wgpu

Foot reports damage through the Wayland shared-memory protocol
(`wl_surface_damage_buffer`): client and compositor agree on which
buffer regions changed. Bitty cannot copy that mechanism directly. Its
renderer targets wgpu across Vulkan, Metal, D3D12, and GLES through a
swapchain whose standard Rust API (`get_current_texture`, render,
submit, `present`) exposes no cross-platform present-with-damage
primitive as of wgpu 30; damage-aware presentation remains an open
design discussion upstream.

The candidate therefore decouples dirty rendering from damaged
presentation. Each panel owns a persistent texture:

```text
Panel A changed   -> repaint dirty region into texture A
Panel B unchanged -> reuse texture B
Panel C unchanged -> reuse texture C

Panel textures -> one cheap composition pass -> wgpu surface
```

Even though the final swapchain present still submits the whole
window, the expensive work — text shaping, glyph generation, vertex
rebuilding, native UI layout — runs only for damaged panels. The
composition pass blends a handful of texture quads, which is cheap by
construction. Terminal render cost stops equaling window present cost.

## Tile damage

Panels vary in size; a full panel repaint is still too coarse for a
large terminal or dashboard with a single-line change. The candidate
subdivides each panel texture into fixed tiles and tracks damage per
tile: only tiles intersecting a `DamageSpan`, a dirty UI rectangle, or
a changed image region repaint. One tile size serves terminal grids,
native UI, images, graphs, and animation uniformly, because every
content kind resolves to "which tiles are stale" before any pixels
move. Tiles are the meeting point of Level 1 and Level 2 damage: cell
spans and node rectangles both address tiles, and the renderer only
ever sees tile lists.

## Ring-buffer GPU scroll

Scrolling must never rebuild every row's glyph vertices, re-upload
them, and redraw the panel. The candidate keeps the grid in a logical
ring buffer with a viewport offset, on the GPU as well as in memory:
new rows append at the physical tail while the viewport advances, so a
scroll step reuses all surviving rows and renders only the newly
exposed row. High-throughput output — pager streams, build logs,
`journalctl -f` equivalents — then costs one row per step instead of
one panel per step. This is the GPU form of foot's viewport-not-memcpy
scroll optimization, and the same viewport discipline applies to panel
history views, not only the terminal grid.

## The core principle

The whole candidate compresses to one rule with three clauses:

> **State change does not imply frame redraw. Frame redraw does not
> imply panel redraw. Panel redraw does not imply full-region
> redraw.**

A state mutation that coalesces away produces no frame. A frame that
touches one panel repaints one panel texture. A panel repaint touches
only its damaged tiles. Each clause is a place where work is refused,
not accelerated — the foot lesson restated for a compositor Bitty has
not built yet.

## Built versus not built

Verified 2026-09-23 against `bitty` `main`. `Implemented` below means
code exists; nothing below is `Verified`, and nothing authorizes
shipped or compatibility-guaranteed behavior. There is no damage or
invalidation system in `bitty` today.

| #   | Claim                                                             | State            | Evidence                                                                                                                        |
| --- | ----------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The render pipeline is a terminal-snapshot grid pipeline          | Implemented-only | `bitty-render` self-describes as a terminal-snapshot grid pipeline; it is terminal-centric, not damage-driven                   |
| 2   | `ViewContent` five-way split exists; Terminal is one content kind | Implemented-only | `crates/bitty-ui/src/panel.rs:184`: `Empty`, `Terminal(u64)`, `Rich(u64)`, `Browser(BrowserSurfaceId)`, `Panel(PanelId)`        |
| 3   | The only `SurfaceKind` is the wgpu swapchain handle               | Implemented-only | the single `SurfaceKind` in render `gpu.rs` names the wgpu swapchain surface, not a panel content surface                       |
| 4   | Cell/row dirty flags exist in the terminal grid                   | NOT built        | no `dirty` / `clean` cell or row tracking in `bitty` `main`; the foot-style `row->dirty` plus `cell.attrs.clean` pair is absent |
| 5   | A `DamageSpan` (row plus column range) type exists                | NOT built        | no `DamageSpan` or equivalent row-plus-column-range damage type in `bitty` `main`                                               |
| 6   | A frame scheduler with a PTY coalescing window exists             | NOT built        | no delayed-rendering or update-batching stage between state mutation and rendering                                              |
| 7   | Persistent per-panel GPU textures exist                           | NOT built        | no per-panel render targets; there is no texture-reuse versus repaint distinction                                               |
| 8   | Tile-based damage tracking exists                                 | NOT built        | no tile subdivision of render targets and no tile-addressed repaint path                                                        |
| 9   | Ring-buffer GPU scroll (viewport move, not row memcpy) exists     | NOT built        | no viewport-offset scroll path reusing resident rows on the GPU                                                                 |
| 10  | Browser-style native UI invalidation exists                       | NOT built        | no retained-widget invalidation path; the UI pieces that exist are unintegrated and carry no damage protocol                    |

Rows 4–10 are the gap this candidate exists to name. Any future RFC
that claims to close a row must cite implementation evidence in the
`bitty` repository; this note alone closes nothing.

## Security review

This note designs no rendering code and records a gap; it grants no
capability, moves no trust boundary, and changes no P0 gate. Damage
regions derived from terminal output remain observation data: a future
implementation must treat damage coordinates computed from untrusted
PTY bytes as untrusted input into the GPU path (bounds-checked tile
and viewport arithmetic, never trusted offsets into shared textures).
Per-panel textures introduce a cross-panel isolation question — a
damaged panel's repaint must not read or write another panel's texture
— owned by the future render RFC, not decided here. A future damage
implementation RFC will need its own security review covering damage
input validation, texture isolation between panels, worker-thread data
races on shared glyph caches, and resource-exhaustion bounds on the
coalescing window; that review is an acceptance gate for the
successor, not for this note.

## Verification plan

1. `just check` green (format, markdownlint, links, metadata, language,
   agents, hygiene, svg) — the Docs quality workflow is the merge gate
   for this docs-only repository.
2. Built-versus-not-built rows re-checked against `bitty` `main` at
   review time: the terminal-snapshot description of `bitty-render`,
   the `ViewContent` spelling at `crates/bitty-ui/src/panel.rs`, the
   swapchain-only `SurfaceKind` in render `gpu.rs`, and the absence of
   dirty flags, `DamageSpan`, scheduler, panel textures, tiles,
   ring-buffer scroll, and UI invalidation. Any drift becomes a
   revision of the table, never a silent claim.
3. Independent reviewer confirms candidate status is unmistakable, the
   wgpu present-damage limitation is stated as a versioned API
   observation rather than a permanent constraint, no normative wording
   leaked in, and cross-links point at canonical documents rather than
   duplicating them.

## Alternatives considered

- **Copy foot directly: CPU rendering into shared-memory buffers with
  Wayland damage.** Rejected: Bitty targets multiple platforms through
  wgpu, and a Wayland-only software renderer abandons the compositor
  architecture (persistent panel textures, tile damage, GPU scroll)
  this note exists to prepare.
- **GPU-first without damage tracking (repaint everything every
  frame).** Rejected: it pays shaping, glyph, vertex, and layout costs
  for unchanged content on every frame and scales worst exactly when
  the workspace fills with panels — the cost this candidate refuses
  first.
- **Whole-panel damage only (skip tiles and spans).** Rejected: a
  single typed character would repaint its whole panel, keeping most
  of the waste that row and span tracking removes. Tiles cost one
  subdivision and serve every content kind.
- **Present-damage passthrough (wait for wgpu to expose damaged
  presentation).** Rejected as the primary strategy: the API does not
  exist cross-platform today, and the Persistent Panel Texture design
  captures nearly all of the saving without it. A future wgpu
  damage-aware present extension can be adopted underneath the same
  damage tracker later.
- **Defining the full render RFC here.** Rejected: scheduling policy,
  tile sizing, texture lifecycle, and the damage-tracker API belong to
  a successor render RFC with implementation evidence. This note fixes
  only the architecture those documents assume.

## Affected contracts

None changed. This candidate is consumed (not yet) by the draft
[Text and Rendering RFC](text-rendering-rfc.md) for shaping and atlas
interaction, the candidate
[Panel Content Scene Path Decision](panel-content-scene-path-decision.md)
for non-terminal content, and the candidate
[Workspace-Native UI Runtime](ui-runtime-candidate.md) for UI-side
invalidation; it restates, without altering, the accepted
[Panel Runtime RFC](panel-runtime-rfc.md),
[Core and Plugin Boundaries](../architecture/core-boundaries.md),
[Performance Budget RFC](performance-budget-rfc.md), and
[Rich Presentation RFC](rich-presentation-rfc.md). Acceptance of a
successor RFC would reference this note; it would not retroactively
normativize it.

## Open points

1. The `DamageSpan` merge policy under burst coalescing (when spans
   merge, when a row degrades to whole-row damage, span lifetime
   across frames) — owned by the future render RFC, not decided here.
2. Tile sizing and texture lifecycle (tile dimensions, panel resize
   and hidpi reallocations, eviction of hidden panels) — owned by the
   future render RFC.
3. Whether the `ViewContent` five-way split (row 2 of the
   built-versus-not-built record) is the right seed for per-panel
   render targets, or only a content tag to be replaced — flagged for
   the render RFC together with the Surface system question.
4. The worker parallelism model for tile repaints (row-capped workers
   versus tile work-stealing on shared glyph caches) — owned by the
   future render RFC with measurement evidence.
5. The upstream wgpu damage-aware presentation story — tracked as a
   versioned observation; if the API lands, the damage tracker stays
   and only the presentation stage changes.

## Acceptance criteria

1. The document is `draft` candidate status with no normative,
   shipped, stable, or compatibility-guaranteed wording.
2. Foot's five mechanisms (cell/row dirty tracking, viewport scroll,
   PTY coalescing, row-capped workers, shared glyph cache) are stated
   as the "less work" lesson, not as copied implementation.
3. The three-level damage model, `DamageSpan`, browser-style UI
   invalidation, Persistent Panel Texture under wgpu, tile damage,
   and ring-buffer scroll are all present with the wgpu
   present-damage limitation stated.
4. The core principle (state change / frame redraw / panel redraw /
   full-region redraw) is stated verbatim in the principle section.
5. The built-versus-not-built table is present, matches the verified
   2026-09-23 record, and claims nothing beyond `Implemented`-only
   where code exists.
6. `just check` passes; the document is registered in the
   Specifications index draft table.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or
trust decision changes. The security review above records that
disposition, including the future damage-input validation and
texture-isolation questions flagged for the successor render RFC. That
successor will require owner and security-reviewer sign-off before
acceptance.

## References

- [Panel Runtime RFC](panel-runtime-rfc.md) (`Accepted`) — panel
  lifecycle contract this note must not weaken.
- [Performance Budget RFC](performance-budget-rfc.md) (`Accepted`) —
  frame and latency ceilings a future implementation is measured
  against.
- [Text and Rendering RFC](text-rendering-rfc.md) (`Draft`) — shaping,
  atlas, and DPI contract the damage path will interact with.
- [Panel Content Scene Path Decision](panel-content-scene-path-decision.md)
  (`Draft`) — the confirmed "Panel is not Terminal" gap record.
- [Workspace-Native UI Runtime (Candidate)](ui-runtime-candidate.md)
  (`Draft`) — the UI runtime program whose invalidation side this note
  sketches.
- [Panel/Surface/Process Trichotomy (Candidate)](panel-surface-process-trichotomy-candidate.md)
  (`Draft`) — Panel/Surface vocabulary and the verified
  `ViewContent` record this note's panel level assumes.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  (`Accepted`) — ownership tables and P0 gates.
- [Rich Presentation RFC](rich-presentation-rfc.md) (`Accepted`) —
  rich output as content kind, not UI framework.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md)
  (`bitty-docs`) — normative security sources.
