---
title: Rich Presentation RFC
description: Defines the accepted image, rich-block, scene, zone, and structured transport contracts for OQ-008, OQ-015, and OQ-016
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 19
---

# Rich Presentation RFC

> Status: **accepted** on 2026-08-28 by the project initiator. This document defines the accepted
> image, rich-block, scene, zone, and structured-transport contracts for
> [OQ-008](../decisions/open-questions.md),
> [OQ-015](../decisions/open-questions.md), and
> [OQ-016](../decisions/open-questions.md) at the design level; it closes [OQ-008](../decisions/open-questions.md), [OQ-015](../decisions/open-questions.md), and [OQ-016](../decisions/open-questions.md). It does not describe implemented
> behavior, does not authorize shipped, stable, or compatibility-guaranteed
> behavior, and does not weaken any normative security control. Experimental
> implementation may exist as review evidence but carries no compatibility
> promise beyond the accepted contract. Acceptance was per independent category-owner, docs-curator, and security-auditor review (CTX-0062) with P0 sign-off simulated 2026-08-28; see [P0 Review Sign-off](#p0-review-sign-off) and the [P0 review checklist](../reviews/p0-review-checklist.md). The lifecycle is `Draft -> experimental review evidence -> Accepted -> normative`.

## Purpose and scope

This RFC answers three open questions:

- **OQ-008**: What image decoding, storage, placement, animation, limit, and
  renderer contract is used?
- **OQ-015**: What are the versioned `RichBlock`, scene, semantic-zone,
  selection, accessibility, search, export, and anchor contracts?
- **OQ-016**: Which authenticated structured transports may drive rich output,
  and what transformations are permitted in alternate-screen applications?

In scope:

- image decoding and storage bounds, placement and stacking semantics,
  animation lifecycle, and the image-to-scene snapshot contract owned by
  `bitty-rich` and consumed by `bitty-render`;
- the versioned `RichBlock` and `SceneNode` model, `Scene` composition and
  damage tracking, `SemanticZone` kinds and anchoring rules, and the shared
  selection, accessibility-tree, search-index, and export contracts;
- the three structured-output sources and their authenticated transport,
  framing, ordering, backpressure, and lifecycle rules, plus the
  alternate-screen transformation policy;
- resource ceilings, failure semantics, and verification gates for the above.

Out of scope (owned elsewhere):

- VT parser, grid, cursor, mode, and damage invariants (OQ-007,
  [Terminal State RFC](terminal-state-rfc.md));
- Plugin API surface, capability grammar, manifest schema, and event pipeline
  classes (OQ-011/OQ-012/OQ-013,
  [Plugin Platform RFC](plugin-platform-rfc.md));
- per-plugin instruction, CPU, memory, and queue ceilings (OQ-014,
  [Isolation Resource RFC](isolation-resource-rfc.md));
- Lua runtime, standard-library subset, and module search rules (OQ-009,
  [Lua Runtime RFC](lua-runtime-rfc.md));
- CLI grammar and exit-code contract (OQ-017) and IPC wire format, peer
  authentication, and scopes (OQ-018).

## Normative sources this specification must not weaken

- [Security Overview](../security/overview.md): untrusted-by-default posture,
  invariants 3 (presentation, never Terminal Truth), 4 (no hot-path execution),
  7 (bounded inputs), and the P0 graphics and resource rows.
- [Threat Model](../security/threat-model.md): PTY-to-terminal-state controls,
  graphics decompression-bomb defense, deny-by-default resource loader,
  terminal-protocol-to-desktop capability gates, and abuse cases T-02, T-03,
  T-05, T-13.
- [Security Risk Register](../security/risk-register.md): R-002 (compressed
  graphics exhaustion), R-003 (protocol-directed file/device access), R-005
  (dangerous link schemes), R-008 (Terminal Truth integrity), R-013/R-021
  (rich-content script and resource risks).
- [Core and Plugin Boundaries](../architecture/core-boundaries.md): mechanism
  versus policy split, Terminal Truth ownership, declarative UI, and the two
  security domains (`TerminalSecurityPolicy` versus `PluginCapabilities`).
- [Plugin System](../extensibility/plugin-system.md) and
  [Rich Content](../interfaces/rich-content.md): terminal surface versus rich
  surface versus overlay surface, explicit semantic source requirement,
  level-2 versus level-3 presentation distinction, and
  [Architecture Overview](../architecture/overview.md) data-flow invariants.

Where this RFC selects a threshold or mechanism, it refines those sources; it
does not move a requirement between owners and does not create a bypass.

## Terminology

| Term                   | Meaning                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ImageStore`           | Core-owned, bounded collection of decoded images keyed by stable `ImageId`.                                  |
| `ImagePlacement`       | Core-owned placement record binding one `ImageId` to grid geometry, z-order, clipping, and scroll behavior.  |
| `RichBlock`            | Versioned, plugin-owned rich region anchored to terminal state and rendered as a `Scene` subtree.            |
| `SceneNode`            | Declarative layout and paint primitive contributed by a plugin and owned by `bitty-rich`.                    |
| `Scene`                | Composed tree of `SceneNode` values with damage, accessibility, and search indices for one frame.            |
| `SemanticZone`         | Core representation of shell-integration boundaries (prompt, input, command, output) derived from OSC 7/133. |
| `BlockAnchor`          | Stable binding of a `RichBlock` to a `SemanticZone`, a scrollback line id, or a grid coordinate range.       |
| `Structured transport` | Authenticated side channel that carries typed rich events without rewriting PTY bytes.                       |

## Architectural placement

```text
PTY -> VT parser -> TerminalAction -> Terminal State -> Snapshot + damage
                                                    |            |
                                                    |            +-> Renderer <- Scene snapshot
                                                    |                          |
Terminal State -> SemanticZones --+                  |                          |
                                 v                  v                          v
                         Presentation Model -> Scene Composer -> Scene -> Damage -> Render
                                          ^
                                          |
                                   plugin RichBlocks
                                          |
                                   structured transport
```

Rules:

1. Terminal state is the only canonical result of PTY input. Presentation
   interprets that truth but never mutates grid, cursor, modes, or scrollback.
2. `Image != Cell`. Image identity, placement, clipping, and scroll semantics
   stay outside the cell lattice and enter the snapshot as `ImageStore` plus
   `ImagePlacement` values.
3. The parser and image decoder never create GPU textures. The renderer consumes
   only snapshots, placement records, and damage.
4. Plugins contribute only declarative `SceneNode` values through capability-
   checked `ui.rich` and `ui.protocol-register` gates. No plugin holds a GPU
   object, window handle, or PTY file descriptor.
5. Hot-path exclusion: parser, render, and input domains remain free of plugin
   execution. Image decode and markdown parsing run off the hot path.

## Image contract (OQ-008)

### Principles

- All image input is untrusted PTY data until a bounded decode plus policy
  check succeeds.
- Supported wire protocols are candidates owned by this RFC; the initial set is
  Kitty Graphics, Sixel, and iTerm2 inline images, each behind a protocol
  adapter that normalizes to `ImageStore` and `ImagePlacement`. No protocol
  writes pixels directly.
- Compressed and decoded limits are enforced before allocation (R-002).
  File and shared-memory transports are capability requests denied by default
  (R-003).

### ImageStore and ImagePlacement

Illustrative shapes only; final spelling belongs to `bitty-rich`:

```rust
// Illustrative type shape only; not an implemented API.
pub struct ImageId(pub u64);
pub struct ImageStore {
    images: Map<ImageId, DecodedImage>,
    total_bytes: usize,
    count: usize,
}
pub struct DecodedImage {
    id: ImageId,
    source: ImageSource, // kitty | sixel | iterm2 | file
    format: PixelFormat, // rgba8, etc.
    dimensions: (u32, u32),
    decoded_bytes: usize,
    frame_count: u16,
    created_at: Generation,
}
pub struct ImagePlacement {
    id: PlacementId,
    image: ImageId,
    anchor: PlacementAnchor, // cell range or zone
    geometry: PlacementGeometry, // cols/rows or pixels, z-index
    clip: ClipRect,
    scroll: ScrollBehavior,
    visible: bool,
}
```

Rules:

1. `ImageStore` is core-owned. Protocol adapters insert and evict; plugins
   observe placement metadata through `ui.rich` and never hold decoded bytes.
2. `ImagePlacement` never overwrites cell semantics. Hit-testing and selection
   resolve through the snapshot, not through grid mutation.
3. Each image and placement is owned by a lifecycle generation. Reload or
   terminal close disposes unreferenced images; retained images stay bounded by
   the ceilings below.

### Decoding pipeline

```text
PTY bytes -> protocol adapter -> bounded payload -> decode -> ImageStore
                                              |                 |
                                              +-> deny --------->+-> ImagePlacement -> Scene snapshot -> damage -> Renderer
```

Each stage is bounded: payload length, compressed size, decoded allocation,
and frame expansion are checked in order. Exceeding any bound aborts the stage
with a typed error and emits no placement.

### Limits

Status: **accepted initial values** parameterized for harness coverage. Changing
a value requires an RFC revision, never silent drift. Floors are enforced;
unknown or out-of-range budget keys fail validation closed.

| ID    | Dimension                         | Accepted default                              | Enforcement point                         |
| ----- | --------------------------------- | --------------------------------------------- | ----------------------------------------- |
| IMG-1 | Max compressed payload per image  | 4 MiB                                         | parser payload cap before adapter         |
| IMG-2 | Max decoded dimensions per image  | 4096 x 4096                                   | before allocation                         |
| IMG-3 | Max decoded bytes per image       | 64 MiB (width x height x 4, overflow-checked) | before allocation                         |
| IMG-4 | Max total `ImageStore` bytes      | 256 MiB                                       | store admission; evict oldest on overflow |
| IMG-5 | Max image count                   | 256                                           | store admission                           |
| IMG-6 | Max animation frames per image    | 64                                            | adapter; excess frames discarded          |
| IMG-7 | Max total decoded animation bytes | IMG-3 x IMG-6, bounded by IMG-4               | store admission                           |
| IMG-8 | Max placement count per terminal  | 128                                           | placement admission                       |
| IMG-9 | Animated frame rate               | at most 30 fps, host-throttled                | renderer pacing                           |

Notes:

- IMG-2 and IMG-3 together prevent decompression bombs where a tiny payload
  declares huge dimensions.
- IMG-4 is an aggregate budget across all protocols and all terminals of one
  window; it follows the isolation budget floor and maximum policy in the
  [Isolation Resource RFC](isolation-resource-rfc.md).

### Kitty chunked-intake implementation evidence (bitty #376)

Status: **experimental review evidence only.** The intake milestone merged in
`bitty` `1fc6294` (CTX-0214, PR #376, `crates/bitty-rich/src/kitty.rs`).
It records exactly what that change implements; it changes no accepted ceiling
above, grants no new capability, and does not promote this RFC beyond
`accepted`.

What merged, exactly:

1. Chunked exact-byte assembly. The `m=` chunk state machine maps the first
   `m=1` chunk (which carries the `G` params) to `begin_chunk`, middle `m=1`
   chunks to `append_chunk` with `more = true` (reporting `NeedMore` with the
   buffered byte count), the final `m=0` chunk to `append_chunk` with
   `more = false` (reporting `Completed` with the new placeholder id and total
   length), and a lone `m=0` transmission to the single-shot `ingest` path.
   Chunked transmissions assemble their exact bytes (`assembled == true`).
2. FIFO evict-to-fit under a 320,000,000-byte ledger. The ledger cap
   (`KITTY_LEDGER_MAX_BYTES = 320 * 1000 * 1000`, decimal, Ghostty
   `total_limit` parity, configurable down via `with_ledger_cap`) covers
   stored plus in-flight bytes. Admission evicts the oldest entries first
   (Ghostty "prune prior to reserving" pattern); at most one transmission is
   in flight per ledger, and at most 64 placeholders are retained (mirroring
   `IMAGE_STORE_MAX_ENTRIES`). A single transmission larger than the cap is
   rejected.
3. Single-shot truncation unchanged. The `ingest` path keeps its historical
   deterministic truncation at `KITTY_MAX_PAYLOAD_BYTES` (4096 bytes,
   `assembled == false`) and is otherwise unchanged.
4. Fail-closed outcomes. `append_chunk` with no open stream fails as `Orphan`
   with state unchanged; `begin_chunk` while a stream is open fails as
   `AlreadyInProgress` with the open stream kept; growth past the ledger cap
   fails as `Oversize` with the in-flight stream dropped and nothing stored.
   Length checks run before any buffer growth, so a hostile chunk cannot force
   an over-cap allocation.
5. Rendering still deferred. No base64 decode, no pixel allocation, no
   placement calculation, no animation, and no renderer coupling occur in this
   milestone; every placeholder is inert for rendering, and no `APC G`/`DCS`
   parser integration is claimed.

Explicit non-changes: IMG-1 through IMG-9 above are untouched. The
320,000,000-byte intake ledger is a pre-decode intake bound on raw payload
bytes; it is not the IMG-4 256 MiB aggregate decoded-store budget and does not
redefine it. The decoding pipeline, animation lifecycle, and renderer contract
sections of this RFC continue to describe the accepted target, not shipped
behavior.

### Kitty decode, placement, and present-path implementation evidence

Status: **experimental review evidence only.** This subsection records the
Kitty graphics pipeline merged in `bitty` `origin/main` (read-only at
`1f31435`, verified via `merge-base --is-ancestor`). It changes no accepted
ceiling above, grants no new capability, and does not promote this RFC beyond
`accepted`. Sixel and iTerm2 inline images remain unimplemented.

What merged, exactly:

1. **Payload decode** (`bitty` #425 `0cc82de`, CTX-0247): assembled Kitty
   payloads decode to RGBA8 for `f=100` PNG (every PNG color type normalized
   through `normalize_to_color8 | ALPHA`), `f=24` raw RGB, and `f=32` raw
   RGBA; every other `f=` value is rejected, never guessed. Bounds are checked
   with checked arithmetic before allocation: `8192` px per side, `4096 x 4096`
   px area, `64 MiB` RGBA. Fail-closed on every malformed or truncated input;
   prefix-invalid inputs (including every prefix of a valid PNG) error
   deterministically; deterministic pseudo-random fuzz-shape tests cover
   garbage and truncated inputs. Animated PNG contributes only its first
   frame (animation stays deferred).
2. **APC `G` parser wiring and base64 unwrap** (`bitty` #431 `c1d8243`,
   CTX-0255/CTX-0256, closes `bitty` #430): the VT parser routes Kitty `APC G`
   transmissions into the intake ledger and unwraps base64, so real PTY output
   (for example `chafa` kitty format) reaches decode instead of being parsed
   and discarded.
3. **Placement and CPU composite** (`bitty` #427 `bd15d94`, CTX-0248):
   decoded bitmaps are stored in a bounded layer (`64` images, `256 MiB`
   decoded bytes, oldest-first eviction), bound to cursor-anchored cell rects
   (`c`/`r` spans or pixel-derived), clamped to the viewport, scroll-tied to
   the grid, suppressed on the alternate screen, and composited topmost into
   the present path (software CPU blend) without mutating grid truth. Actions
   `absent`/`t`/`T` are mapped; delete/query/frame/put actions are stored but
   never painted (fail closed).
4. **Security-review hardening F1-F5** (CTX-0249 follow-ups): placement-cap
   alignment plus per-frame blit budget (`<= 32` blits, `<= 64 MiB` padded
   staging) and raster cache (`bitty` #465 `3d45924`, CTX-0252); real-GPU
   fail-closed display gate plus saturating origin math (`bitty` #463
   `6d4aa2f`, CTX-0253); per-pane origin binding so a background pane can
   never paint over the focused pane's grid (`bitty` #467 `18c333a`,
   CTX-0254, closes `bitty` #466).
5. **Real-GPU texture upload and blit** (`bitty` #505 `fdd9e28`, CTX-0291,
   closes `bitty` #504): the wgpu present path uploads admitted blits
   (positional texture-slot reuse, padded staging rows, device texture-limit
   check) and draws each one quad topmost, retiring the CTX-0253 skip gate;
   malformed/oversized/over-budget blits stay fail-closed and counted in
   `PresentStats`.
6. **Live evidence:** `chafa` 1.18.2 kitty-format output decodes end-to-end
   through the live PTY (runtime placement created). CTX-0250's original live
   run found zero painted pixels only because the F3 gate skipped GPU blits;
   the CTX-0291 live run on a wgpu window reports `images=1`,
   `images_skipped=0` and red `0 -> 12710`, blue `0 -> 4148`, yellow
   `0 -> 117` pixel counts (`recording/ctx-0291/`). The dedicated CTX-0250
   live-verify task itself remains open; pixel painting is evidenced by
   CTX-0291, not by closing CTX-0250.

Recorded deviations and open items (not silently resolved):

- The Kitty path admits `8192` px per side within the same `4096²`-pixel area
  and `64 MiB` byte budget, while accepted IMG-2 states `4096 x 4096` px.
  The memory ceiling is identical either way, but the side cap differs;
  aligning the IMG-2 wording or tightening the Kitty path is a follow-up for
  the owning RFC revision.
- Images are topmost over same-origin cursor and selection fills
  (cursor-on-top is follow-up), the decoded-image store is global FIFO (a
  noisy origin can evict another origin's stored images; per-origin quotas are
  follow-up), and scroll-region (`DECSTBM`) moves that do not grow scrollback
  are not tracked (full-screen scroll is exact).
- Animation, image delete/query actions, and the Sixel/iTerm2 adapters remain
  unimplemented; no `Verified`/`Compatible` claim is made here.

### Animation lifecycle

1. Animated images decode frames lazily and pace presentation at the render
   domain tick, never at parser rate.
2. Animation state is per placement, not per image: the same `ImageId` may be
   placed twice with independent frame cursors.
3. Hidden or scrolled-off placements pause animation and release frame cache
   beyond the current frame (availability-preserving).

### Renderer contract

- The renderer consumes only `Snapshot { grid, zones, images: &ImageStore, placements: &[ImagePlacement], scene: &Scene, damage }`.
- It never reads VT private structures or plugin state.
- Clipping, stacking, and scroll translation are computed from placement
  geometry and damage. Overdraw is bounded by damage; full-scene repaint
  occurs only on resize or store eviction.
- GPU texture upload is asynchronous and budget-aware; decode failure never
  blocks the frame loop.

## RichBlock, scene, and zone contracts (OQ-015)

### Versioned RichBlock

```rust
// Illustrative type shape only; versioned contract, not an implemented API.
pub struct RichBlock {
    id: BlockId,                    // stable, content-addressed or ULID
    version: u32,                   // monotonic; 1 for v1
    anchor: BlockAnchor,
    content: SceneNode,             // root of this block's subtree
    scroll: ScrollBehavior,         // inline | pinned | overlay
    owner: PluginId,
    generation: Generation,
    created_at: ZoneId,             // provenance for diagnostics
}
pub enum BlockAnchor {
    Zone(ZoneId),                   // preferred: bound to SemanticZone
    Line(LineId),                   // fallback: bound to scrollback line
    Grid(Range<CellPos>),           // deprecated fallback; discouraged
}
pub enum ScrollBehavior {
    Inline,                         // scrolls with terminal content
    PinnedBelow,                    // stays below its zone during scroll
    Overlay,                        // transient; does not affect layout
}
```

Accepted rules:

1. `RichBlock` is versioned (`version = 1`). Minor versions are additive only;
   removing or narrowing a field requires a major version and migration notes.
2. Every `RichBlock` has a stable identifier distinct from its anchor. Replacing
   content uses the same `BlockId` with an incremented version; the composer
   diffs the `SceneNode` subtree.
3. Blocks are plugin-owned but core-composed. Core validates structure, bounds,
   and capability before composition; validation failure rejects the block with a
   typed diagnostic.
4. No `RichBlock` may mutate terminal state. Content rewriting of PTY output
   remains outside v1.

### Scene model

```rust
// Illustrative type shape only.
pub enum SceneNode {
    Text(StyledSpan),
    Row(Vec<SceneNode>),
    Column(Vec<SceneNode>),
    Block { border: Option<Border>, child: Box<SceneNode> },
    Image(PlacementId),
    CodeBlock { lang: Option<BoundedString>, content: BoundedText },
    Table(TableModel),
    List(ListModel),
    Rule,
}
```

Rules:

1. `SceneNode` is declarative and layout-only: text, rows, columns, blocks,
   images, tables, lists, and rules in v1. No shaders, pipelines, native
   windows, or global-coordinate drawing.
2. Composition produces a `Scene { nodes, a11y_tree, search_index, damage }`.
   The scene is bounded: node count, depth, text bytes, and total layout size
   are validated (see limits below).
3. Incremental updates diff the previous `SceneNode` tree; only changed
   subtrees produce damage. Reparsing and relayout of the entire document on
   every token is not an acceptable implementation strategy.
4. The renderer and accessibility layer consume the `Scene` snapshot; plugins
   never hold render objects.

Scene limits (accepted, parameterized):

| ID    | Dimension                              | Accepted default |
| ----- | -------------------------------------- | ---------------- |
| SCN-1 | Max nodes per `RichBlock`              | 2048             |
| SCN-2 | Max tree depth per block               | 32               |
| SCN-3 | Max text bytes per block               | 256 KiB          |
| SCN-4 | Max aggregated rich bytes per terminal | 2 MiB            |
| SCN-5 | Max blocks per terminal                | 64               |

Exceeding any limit rejects the update with a diagnostic and retains the last
good scene.

### Semantic zones

Zones are the stable semantic source that makes heuristic inference from
screen text unnecessary:

```rust
// Illustrative enum, not an implemented API.
pub enum SemanticZoneKind { Prompt, Input, Command, Output, Unknown }
pub struct SemanticZone {
    id: ZoneId,
    kind: SemanticZoneKind,
    range: LineRange,               // grid lines plus scrollback ids
    metadata: ZoneMetadata,         // cwd, host, exit status, command text (bounded)
    generation: Generation,
}
```

Rules:

1. Zones derive only from committed terminal state: OSC 7 (cwd), OSC 133
   (prompt/input/command/output marks), and core-maintained line ids. The zone
   set for a terminal is part of its snapshot.
2. `Prompt`, `Input`, `Command`, and `Output` are the v1 kinds. `Unknown`
   covers terminals without shell integration and never implies a rich
   semantic.
3. Metadata strings are bounded, untrusted, and never expanded or executed.
   Hostname, cwd, and command text are rendered with host-owned components.
4. Zones are immutable once closed; a new zone supersedes the previous one
   without retroactively moving existing `RichBlock` anchors except through
   explicit re-anchor rules below.

Shell integration is an enhancement, not a compatibility dependency. Content
must remain usable as ordinary terminal output when zones are absent.

### Anchors

| Anchor kind            | Survival under scrollback pruning                               | Survival under resize and reflow                             | Preferred |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ | --------- |
| `Zone(ZoneId)`         | retained while zone's line range survives; detached when pruned | zone tracks line ids, not pixel coordinates; survives reflow | **Yes**   |
| `Line(LineId)`         | retained while line id survives; detached when pruned           | line id is stable; reflow preserves id                       | Fallback  |
| `Grid(Range<CellPos>)` | fragile; grid coordinates shift on scroll and resize            | lost on reflow                                               | No        |

Rules:

1. `Zone` is the preferred anchor for command-anchored content such as Markdown
   previews, diagnostics, or AI streaming blocks. `Line` is the fallback when
   no zone exists. `Grid` is discouraged and exists only for overlay debugging.
2. Scrollback pruning detaches blocks whose anchor line range was pruned.
   Detached blocks are disposed and emit a drain diagnostic; they never follow
   stale line ids.
3. Resize and font or DPI changes reflow line ids; anchors track ids, not
   pixels. Block height changes produce damage against the new layout, not
   against stored pixel positions.
4. Anchoring defines scroll behavior: `Inline` blocks flow with their zone;
   `PinnedBelow` blocks stay directly after the zone's line range;
   `Overlay` blocks float without affecting layout and are used for command
   palette and completion.

### Selection, accessibility, search, export, and copy

All five operations view the same composed model but through different
projections:

| Capability    | Contract                                                                                                   | v1 behavior                                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selection     | Two modes: raw-text selection (grid only) and rich selection (scene text with source mapping).             | `ui.rich` blocks expose selectable text spans with `CopyAsRaw` fallback. Raw mode is default for existing copy bindings.                                                    |
| Copy          | `copy` produces exactly what the selection mode shows. `copy --raw` always emits terminal text only.       | Clipboard write uses the `clipboard.write` capability; OSC 52 paste inspection remains in the PTY path.                                                                     |
| Accessibility | Every `SceneNode` contributes to an accessibility tree derived from the composed scene plus zone metadata. | Screen-reader order is `prompt -> input -> output -> RichBlock` within one zone. Decorations never hide grid text from the a11y tree without an explicit replacement claim. |
| Search        | Search indexes both grid text and `Scene` text, with result kind tagging.                                  | Host search returns `{ kind: "terminal" or "rich", block: BlockId?, range: TextRange, preview: BoundedText }`. Rich results navigate to their block anchor.                 |
| Export        | Export renders a faithful plain-text fallback plus optional structured export.                             | `export --plain` emits grid text; `export --rich` emits bounded Markdown or HTML without scripts. No export path executes scripts or fetches external resources.            |

Rules:

1. Raw-text copy is always available. No plugin may suppress the raw-text
   projection or replace it without an exclusive replacement claim and user
   preference.
2. Accessibility and search indices are built from the snapshot, not from live
   plugin state. A stale plugin view never leaks into the indices.
3. Exported content treats all terminal and rich text as untrusted display data;
   URIs and file paths inside export output are not auto-executed.

### OTP-gated clipboard read implementation evidence (bitty #374)

Status: **experimental review evidence only.** The read-grant milestone merged
in `bitty` `63b01db` (CTX-0213, PR #374, closes `bitty` #373,
`crates/bitty-rich/src/clipboard.rs`). It records exactly what that change
implements; it changes no accepted ceiling above, grants no new capability, and
does not promote this RFC beyond `accepted`. The accepted write-side `copy`
contract in the table above is unchanged, and the alternate-screen policy below
is unaffected.

What merged, exactly:

1. **Single-use read grants (Ghostty OTP pattern).** `ClipboardState::grant_read`
   mints a `ClipboardReadToken` from 256 bits of OS entropy
   (`CLIPBOARD_READ_TOKEN_LEN = 32`). `handle_action_with_token` redeems a
   token atomically by removing the matching live grant before building the
   outcome, so replaying it is denied. At most `16`
   (`CLIPBOARD_MAX_OUTSTANDING_GRANTS`) grants are outstanding; minting beyond
   that evicts the oldest grant, which becomes unredeemable. When OS entropy is
   unavailable, minting returns no token instead of falling back to a
   predictable value.
2. **Scope-bound redemption.** A grant is minted for a `ClipboardGrantScope`
   (a `u64` such as a pane or client id) and is redeemable only from the same
   scope; a token presented from another scope is denied and left unconsumed.
   Token comparison is constant-time, so it does not leak the stored grant
   prefix through timing.
3. **Default-deny preserved.** The token-less `handle_action` path never
   consults or consumes grants: every read stays
   `ClipboardOutcome::ReadDenied`. A read with no token, an unknown token, an
   evicted token, or a scope mismatch is denied and leaves all grants
   unconsumed; denied reads increment a counter.
4. **Bounded captured-write history.** A granted read returns the most recently
   captured OSC 52 write payload (bounded by
   `CLIPBOARD_MAX_PAYLOAD_BYTES = 4096`, truncated at the cap), or empty data
   when no write has been captured. History keeps at most `16` writes
   (`CLIPBOARD_MAX_HISTORY`, oldest dropped), and grants never expose the
   platform clipboard.
5. **Debug redaction.** `ClipboardReadToken` and `OutstandingGrant` implement
   `Debug` with token bytes replaced by `[redacted]`, and `ClipboardState`'s
   `Debug` reports only the grant count, so formatting state cannot leak grant
   entropy.

Explicit non-changes: the UI that would ask the user for consent and the
capability that would let an embedder mint grants remain outside this headless
seam; OSC 52 read requests stay denied without a live, in-scope token; and no
`Verified`/`Compatible` claim is made by this evidence.

## Structured transport and alternate-screen policy (OQ-016)

### The three semantic sources

| Source                     | When it applies                                                                                                 | Transport                                                                          | Trust                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1. Plugin-owned content    | An AI or diagnostics plugin owns the source directly and creates a `RichBlock` without PTY assistance.          | In-process capability-checked host API (`ui.rich`) to `bitty-rich`.                | Trusted host API; bounded Scene validation.                      |
| 2. Structured side channel | An application keeps ordinary terminal output on the PTY while sending typed rich events on a separate channel. | Authenticated side transport to a handler registry, then to `RichSurface`.         | Authenticated, capability-gated, policy-controlled.              |
| 3. PTY-embedded protocol   | No side channel is available; the application marks rich regions inside the PTY stream.                         | Bitty-specific OSC or APC sequence with feature detection and plain-text fallback. | Highest risk; capability-gated, strictly bounded, never default. |

Source 1 is the simplest and is the initial integration target. Sources 2 and 3
require the transport and security specification below before adoption.

### Candidate structured-output channel (source 2)

Conceptual flow:

```text
Application -> PTY -----------------> TerminalSurface
             -> Structured transport -> handler registry -> RichSurface
```

Candidate wire examples (transport-agnostic, framing below is normative):

```json
{ "type": "markdown", "stream": "abc123", "data": "## Hello" }
```

```sh
# Candidate grammar only; CLI namespace not reserved here.
my-command | bitty render markdown
bitty emit markdown README.md
```

Illustrative Lua shape only:

````lua
-- Candidate API only; final spelling belongs to the core repository.
local md = require("bitty.markdown")
local view = md.create({ streaming = true, anchor = { zone = zone_id } })
view:append("## Hello\n")
view:append("```rust\nfn main() {}\n```\n")
view:close()
````

This surface stays declarative: the plugin appends bounded chunks, the host
owns parsing, layout, scene composition, and rendering. The stable primitive is
the `RichBlock` and `SceneNode` contribution, not any Lua module name.

### Candidate PTY protocol extension (source 3)

Candidate framing only; this source is later-stage and gated:

```text
OSC bitty;begin;markdown;id=123 ST
# Hello
OSC bitty;end;id=123 ST
```

Requirements before enabling this source:

- capability discovery or negotiation; plain-text fallback is always usable;
- unambiguous framing, length limits, and nesting rules;
- sanitization, permission checks, and audit logging;
- defined behavior through SSH, tmux, and nested terminals;
- no reliance on an unauthenticated environment hint such as `BITTY=1` alone.

### Transport contract (sources 2 and 3)

| Property        | Rule                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication  | Source 2 transports authenticate the sender as the owning terminal's PTY child or as an authenticated IPC peer per the threat model. Anonymous or cross-terminal senders are rejected. Source 3, if ever enabled, requires the `ui.protocol-register` capability and exclusive registration; PTY peers without that capability are ignored. |
| Capability gate | Driving rich output requires `ui.rich`. Registering a new structured type or PTY sub-protocol requires `ui.protocol-register` (high risk) and an explicit user grant. No rich transport widens filesystem, process, or network authority.                                                                                                   |
| Framing         | Length-prefixed or OSC-terminated with hard payload caps. Max event bytes 64 KiB, max stream id bytes 64, max buffered bytes per stream 512 KiB. Exceeding any cap aborts the stream with a diagnostic and no partial placement.                                                                                                            |
| Ordering        | Per-stream FIFO. No ordering across streams or terminals. Interleaving PTY bytes and side-channel events is ordered at the terminal's commit point: the presenter sees terminal state that includes any PTY bytes already parsed.                                                                                                           |
| Backpressure    | Side transport applies bounded per-stream, per-terminal, and global buffers. Full buffers shed newest chunks first with counted, attributed drops; producers never block the parser. Streaming markdown that is not yet fully parsed shows its last good scene.                                                                             |
| Lifecycle       | `begin` creates a `RichBlock` in a pending zone; `append` extends it; `end` commits it; `abort` disposes it. Unclosed streams are aborted on PTY close, terminal close, or timeout (30 seconds of inactivity).                                                                                                                              |
| Sanitization    | Payloads are validated as UTF-8, bounded, and interpreted only as typed rich content. No HTML, no script execution, no automatic local-resource fetch. Resource-bearing payloads pass the same deny-by-default loader as images.                                                                                                            |
| Conflicts       | Two plugins claiming the same stream id or placement target is a deterministic error; last-loaded does not win.                                                                                                                                                                                                                             |

### Alternate-screen transformations

Full-screen TUIs (editors, pagers, multiplexers, TUIs that own the alternate
screen) are a sensitive boundary. Grid geometry, cursor, and mouse-coordinate
assumptions break when rich transforms move content under a TUI.

Accepted policy for v1:

1. While the terminal is in alternate-screen mode, rich transformations that
   reinterpret, replace, or reflow primary-screen line content are disabled.
   `Inline` and `PinnedBelow` blocks for the alternate-screen terminal are
   suppressed and their streams are paused.
2. Overlays remain viable in alternate screen because they do not change grid
   geometry. `Overlay`-anchored rich blocks and the command palette may render
   when explicitly requested.
3. `ImagePlacement` for the alternate-screen terminal is suppressed unless the
   placement explicitly declares `alternate_scope = true` and the user has
   granted the corresponding capability. Sixel and Kitty placements that target
   the primary screen never spill into the alternate screen.
4. Returning to the primary screen recomposes suppressed blocks from their last
   good scene; no retroactive reinterpretation of the alternate-screen session
   occurs.
5. This default is deny-by-default and user-configurable only within a policy
   maximum: no configuration may silently force rich transforms into every
   alternate-screen session.

## Resource summary

| Budget                           | Applies to                 | Accepted ceiling |
| -------------------------------- | -------------------------- | ---------------- |
| `ImageStore` bytes               | all images of one window   | 256 MiB          |
| Decoded bytes per image          | one image                  | 64 MiB           |
| Image count                      | one store                  | 256              |
| Placement count                  | one terminal               | 128              |
| Scene nodes per `RichBlock`      | one block                  | 2048             |
| Text bytes per `RichBlock`       | one block                  | 256 KiB          |
| Rich bytes per terminal          | all blocks of one terminal | 2 MiB            |
| Blocks per terminal              | all blocks                 | 64               |
| Structured stream buffered bytes | one stream                 | 512 KiB          |
| Structured event bytes           | one event                  | 64 KiB           |

All values are accepted and parameterized; tests must not hardcode them except
through the declared constants. Every ceiling is attributable to the owning
`PluginId` or `TerminalId` and observable via the debug protocol and
`bitty plugin doctor`.

## Security alignment and traceability

| Accepted element                                                                                                                      | Normative gate it implements              | Threat and risk IDs      |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------ |
| `Image != Cell`, adapter-normalized `ImageStore` and `ImagePlacement`                                                                 | Bounded graphics, correct placement model | T-02, R-002              |
| Decoded-size, dimension, aggregate-store, and frame-count limits before allocation                                                    | Decompression-bomb defense                | T-02, R-002              |
| Deny-by-default resource loader, regular-file and approved-path checks, no protocol-directed deletion                                 | Protocol file-access defense              | T-03, R-003              |
| Scheme policy, user gesture, direct platform launch without shell interpolation for rich links                                        | Link and rich-resource defense            | T-05, R-005              |
| `RichBlock` versioned, bounded, declarative `SceneNode` only, no HTML or script execution                                             | Constrained AST and scene model, R-021    | T-13, R-021              |
| Plugin-rich path through `ui.rich` capability, `ui.protocol-register` for new types, no hot-path callbacks                            | Least privilege, no hot-path execution    | T-06, T-07, R-006, R-007 |
| Snapshot-only, damage-driven renderer input; no plugin-held GPU objects                                                               | Presentation-only contract, boundary DAG  | T-13, R-008              |
| Authenticated structured transport, per-stream and per-terminal backpressure, explicit `ui.protocol-register` for PTY-embedded source | Authenticated structured transport        | T-01, T-06, R-002, R-008 |
| Alternate-screen default deny for `Inline` and `PinnedBelow` transforms                                                               | TUI integrity                             | T-13, R-008              |
| Raw-text copy projection always available, attribution of blocks, zones, and placements via debug protocol                            | Recoverability and observability          | R-002, R-008, R-021      |

## Compatibility and versioning

- `RichBlock.version` starts at `1`. The wire and storage schema for images,
  placements, blocks, zones, and scene nodes is versioned separately from the
  `bitty-rich` crate version; crate presence alone does not promise wire
  compatibility.
- Minor versions add optional fields and new `SceneNode` variants; major
  versions may remove or narrow fields with explicit migration notes.
- Unknown `SceneNode` variants received from a newer producer are rendered as a
  bounded plain-text fallback, not dropped silently and not executed.
- Anchors are forward-compatible: new anchor kinds are optional and fall back
  to `Line` when the consumer does not recognize them.

## Verification plan

Acceptance of the implemented contract later requires, at minimum:

1. **Image decode negative tests**: oversized payload, oversized dimensions,
   decompression bomb, truncated/invalid stream, excessive frame count,
   aggregate-store overflow — each denied without panic, with attributed
   diagnostics.
2. **Resource-loader tests**: file and shared-memory transports denied by
   default; regular-file and approved-path checks enforced; devices, sockets,
   `/proc`, `/sys`, and `/dev` rejected; deletion never authorized by a
   protocol path.
3. **Placement composition tests**: stacking, clipping, scroll translation,
   damage equivalence (incremental damage union equals full-redraw diff),
   alternate-screen suppression, and overlay-only rendering while the TUI owns
   the grid.
4. **RichBlock versioning tests**: v1 round-trip, additive minor field,
   unknown-variant fallback, major-version rejection, `Zone` versus `Line`
   anchor survival under scrollback pruning and reflow, `max nodes/bytes`
   enforcement.
5. **Semantic-zone tests**: OSC 7/133 parsing under P0 limits, zone kinds
   `Prompt`, `Input`, `Command`, `Output`, `Unknown`, metadata boundedness and
   non-execution, zone immutability after close, integration with block
   anchoring.
6. **Selection, export, and accessibility tests**: raw versus rich selection,
   `copy --raw` fidelity, a11y tree order `prompt -> input -> output -> block`,
   search index tagging, `export --plain` versus `export --rich` without
   script fetch.
7. **Structured-transport tests**: unauthenticated sender rejected,
   cross-terminal sender rejected, unknown type without `ui.protocol-register`
   denied, framing and backpressure (64 KiB event, 512 KiB stream) with
   DropNewest shedding, lifecycle timeout and PTY-close abort.
8. **Markdown streaming property tests**: token stream to incremental AST to
   scene diff to damage; reparse of entire document on every token fails the
   performance budget; bounded tokenizer, no HTML injection, no script
   execution.
9. **Safe-mode and recovery tests**: hostile image and rich streams concurrent
   with `bitty --safe` still reach a usable terminal; detached blocks on
   scrollback pruning and terminal close release their budgets.

Fuzz and adversarial strategy:

- fuzz targets for image adapters (Kitty base64, Sixel payload, iTerm2 inline),
  structured-transport framing, and markdown incremental parsing;
- adversarial interleaving of PTY bytes and side-channel events;
- property tests for `ImageStore` and scene limits never exceeded under
  concurrent placements from multiple plugins.

## Open points

Deliberately unresolved at acceptance time. None blocks this accepted contract; each will
require a follow-up decision:

1. Final wire encoding for structured side transport: JSON, CBOR, or length-
   prefixed binary — or whether the transport is intentionally pluggable with a
   framing-only interface. Choice affects `bitty-ipc` ownership.
2. Exact set of initial PTY image protocols: whether iTerm2 inline images
   enter v1 or stay deferred given Kitty and Sixel coverage.
3. Whether animated image playback needs a plugin-controllable pause or loop
   API, or whether host pacing alone suffices for v1.
4. Final `SceneNode` gallery: whether tables, code blocks, and math enter v1
   or wait for `1.x`, and whether math uses a shared shaping crate.
5. Whether rich output may claim exclusive replacement of a zone's output
   region in v1 or whether replacement waits for level-3 policy (mirrors
   [Plugin Platform RFC](plugin-platform-rfc.md) open point 2).
6. Alternate-screen granularity: whether suppression is binary (all `Inline`
   blocks) or zone-scoped (only the zone the TUI owns).
7. RichBlock persistence: whether blocks survive detached terminal reattach
   (future `bittyd` per OQ-020) as part of the recorded session or are
   re-derived from the reattached stream.
8. Search ranking between terminal and rich results and whether plugins may
   influence ranking.

## Acceptance criteria

This RFC is accepted on 2026-08-28 and closes OQ-008, OQ-015, and OQ-016. The following criteria were satisfied per the [open-question register](../decisions/open-questions.md) rules:

1. The prose and every identifier in the three OQ rows of
   [open-questions.md](../decisions/open-questions.md) (OQ-008, OQ-015, OQ-016)
   have independent category-owner, docs-curator, and security-reviewer
   sign-off, including the limits tables and the alternate-screen default-deny
   policy.
2. Affected documents were synchronized in the same change: this RFC is `accepted` frontmatter and
   [Rich Content](../interfaces/rich-content.md),
   [Core and Plugin Boundaries](../architecture/core-boundaries.md),
   and the [Decision Register](../decisions/index.md) reference the accepted contract rather than describing a parallel
   design.
3. No element weakens a normative P0 gate; any discovered conflict returns the
   conflicting clause to revision rather than downgrading the gate.
4. Verification gates have at least one headless conformance harness per
   section (image bounds, zone anchoring, structured-transport framing) with
   deterministic measurement evidence, mirroring the isolation-budget harness
   style in `bitty-plugin-host` and `bitty-lua`.

## P0 Review Sign-off

> P0 review per CTX-0062 tracks acceptance of OQ-008, OQ-015, and OQ-016 via this
> RFC. Frontmatter is `accepted` and [open-questions.md](../decisions/open-questions.md) is updated per its close
> rule. This section records passing sign-off and closes the three open questions.

| Role                           | Reviewer           | Verdict | Evidence / scope                                                                                                                                                                                         | Date       |
| ------------------------------ | ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| security-auditor               | `bitty-security`   | pass    | T-02/T-03/T-05/T-13, R-002/R-003/R-005/R-008/R-013/R-021, P0-AC-003/004/005/021, image bounds before allocation, deny-by-default resource loader, authenticated transport, alternate-screen default-deny | 2026-08-28 |
| category-owner (architecture)  | `bitty-architect`  | pass    | Presentation model, `ImageStore`/`ImagePlacement`, `RichBlock`/`Scene`/`SemanticZone`, anchor survival, selection/a11y/search/export contracts                                                           | 2026-08-28 |
| category-owner (extensibility) | `bitty-experience` | pass    | `ui.rich` and `ui.protocol-register` capability gates, structured-transport framing/backpressure/lifecycle, declarative scene limits                                                                     | 2026-08-28 |
| docs-curator                   | `bitty-curator`    | pass    | Frontmatter `accepted`, taxonomy, links to [Rich Content](../interfaces/rich-content.md) and [Threat Model](../security/threat-model.md), English-only, decision-register sync                           | 2026-08-28 |

As of 2026-08-28, `bitty-rich`, `bitty-ipc`, and `bitty-agent` remain draft
headless crates implementing the accepted contract per
[ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) and the
[Proposed Delivery Sequence](../product/proposed-delivery-sequence.md); crate
presence does not imply shipped behavior.
