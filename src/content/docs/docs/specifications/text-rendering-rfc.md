---
title: Text and Rendering RFC
description: Draft text segmentation shaping font fallback and rendering contract reconciled with terminal state and platform budgets
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: true
sidebar_order: 14
---

# Text and Rendering RFC

> Status: **draft** spec plus **Experimental Implementation** at
> `bitty` `c0aadd2` via `HeadlessRasterizer` — candidate text and rendering
> contract for CTX-0108 with experimental code evidence (not
> `Accepted`/`Verified`). This document defines a candidate segmentation,
> width, bidi, font-fallback, shaping, atlas, DPI, and IME-overlay contract
> and reconciles it with accepted Terminal State, Rich Presentation,
> Platform, Performance, and security contracts. Experimental code at
> `c0aadd2` (CTX-0095 PR #148, `HeadlessRasterizer` deterministic fake +
> `char_cell_width` approximation, not user-ready typography) is `Implemented`
> (experimental) not `Verified`; it provides reviewable evidence but does not
> describe shipped user-facing typography, does not authorize stable normative
> or compatibility-guaranteed interfaces, and does not weaken any normative
> P0 control. The lifecycle is
> `Draft -> Experimental Implementation -> Accepted -> Verified -> Compatible`
> (spec) and `Draft -> experimental review evidence -> Accepted -> normative`
> (document). Candidate prose is explicitly marked; accepted facts are cited
> separately; experimental code is distinct from `Draft` and `Verified`.
> No OQ is closed by this draft; closing any OQ requires a registered
> decision per the [open-question register](../decisions/open-questions.md).

## Purpose and scope

Terminal correctness, presentation fidelity, and predictable performance all
depend on how raw Unicode becomes placed, shaped glyphs on a grid. This RFC
answers the text half that predecessor contracts intentionally left open:

- **Segmentation and width** — grapheme clusters per UAX #29, combining marks,
  emoji ZWJ sequences, variation selectors, and the cell-width function that
  underpins the grid invariants of the
  [Terminal State RFC](terminal-state-rfc.md).
- **Bidi and line order** — where UAX #9 applies, what Bitty reorders, and
  what stays logical in Terminal Truth.
- **Font discovery, fallback, shaping, and emoji** — family stacks, style
  matching, coverage-driven fallback, HarfBuzz-grade shaping, ligature and
  kerning policy, color-emoji selection, and variable-font axes.
- **Rendering substrate** — DPI scaling, device-pixel geometry, the glyph atlas
  and cache, eviction, missing-glyph behavior, and the damage-driven present
  path that the [Performance Budget RFC](performance-budget-rfc.md) measures.
- **IME composition rendering** — how the preedit overlay paints without
  mutating grid truth, per the Platform IME pipeline drafted in
  `bitty/docs/product/unicode-ime.md` (CTX-0079, draft).

In scope for this draft: normative rules for the above, their bounded-resource
ceilings, their failure semantics, and their verification plan. Out of scope
and owned elsewhere: the VT parser and `Action` stream (OQ-007,
[Terminal State RFC](terminal-state-rfc.md)); image `ImageStore` and
`ImagePlacement` limits and placement (OQ-008, [Rich Presentation RFC](rich-presentation-rfc.md));
semantic zones and `RichBlock`/`Scene` composition (OQ-015/016, Rich RFC);
CLI and IPC framing and scopes (OQ-017/018); per-plugin isolation ceilings
(OQ-014, [Isolation Resource RFC](isolation-resource-rfc.md)) except where
this RFC adds text-specific sub-budgets.

### Candidate vs accepted status

| Area            | Accepted fact (cite)                                                                                                                                                                                                                       | Candidate in this draft                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grid invariants | `cell.width` is `1` or `2`, trailing spacer invariant (Terminal State RFC, invariant 2/3)                                                                                                                                                  | Which scalar sequences occupy `2` columns and how ZWJ/VS resolve                                                                                   |
| Width function  | `crates/bitty-term-state/src/cell.rs::char_cell_width` is the single implementation today (compact approximation, `forbid(unsafe)`, headless)                                                                                              | Authoritative EAW tables, grapheme-to-cell mapping, and ambiguous-width policy that will replace the approximation once accepted                   |
| Renderer seam   | `bitty-render::{GlyphRasterizer, GlyphCache, AtlasLayout, GridRenderer}` and the `Snapshot + Damage -> DrawList -> Surface::present` pipeline are `Implemented` at `be3bdb4` (`HeadlessRasterizer` headless evidence only, not user-ready) | Fallback chain, shaping, ligature/kerning, color-emoji, variable-font, bidi-reordered present, and DPI-aware cell metrics that sit above that seam |
| Platform        | `winit@0.30` + `wgpu@25.0` via `bitty-platform`/`bitty-render`; `crossfont@0.9` wrapped behind `GlyphRasterizer` per [ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md)                                                       | Exact shaper crate, emoji backend, and font-enumeration policy remain candidate                                                                    |
| Performance     | PB-1..PB-7 are accepted targets (Performance Budget RFC)                                                                                                                                                                                   | Text-specific sub-budgets and attribution for shaping, fallback, and atlas work against PB-4/PB-6/PB-7                                             |

Any row whose right column is still candidate must not be cited as normative
until its acceptance decision is registered. The two evidence-only
constructions called out below — the deterministic `HeadlessRasterizer` in
`crates/bitty-runtime/src/runtime.rs` and the compact `char_cell_width`
approximation in `crates/bitty-term-state/src/cell.rs` — remain **non-user-ready
evidence**; they are headless test seams, not user-facing typography.

## Normative sources this specification must not weaken

- [Terminal State RFC](terminal-state-rfc.md): `Action::Print(GraphemeCell)`
  is the sole write path into grid truth; `Cell` totality (every cell defined,
  wide chars occupy two cells with trailing spacer, no orphans); cursor
  integrity; damage model (`generation`, `Snapshot + Damage`); deterministic
  UTF-8 recovery (`U+FFFD` one cell) and replay determinism.
- [Rich Presentation RFC](rich-presentation-rfc.md): `Image != Cell`;
  `ImageStore`/`ImagePlacement` are outside the cell lattice and enter the
  snapshot only as placement metadata; renderers consume
  `Snapshot { grid, zones, images, placements, scene, damage }`.
- [Compatibility Milestone RFC](compatibility-milestone-rfc.md): M1-required
  VT subset and UTF-8 foundation; graceful ignore of out-of-subset sequences.
- [Architecture Overview](../architecture/overview.md) and
  [Core and Plugin Boundaries](../architecture/core-boundaries.md): one-way
  crate DAG; `Terminal -> Snapshot` only, renderer never reads Terminal
  private structures; Text and Presentation are Core-owned mechanisms.
- [ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md): the
  rendering rows wrap `vte@0.15`, `winit@0.30`, `wgpu@25.0`, `crossfont@0.9`;
  shaping/fallback decisions must revise the ADR, not silently add a new
  upstream.
- [Platform Support Tiers](../decisions/adrs/ADR-0002-platform-support-tiers.md):
  Tier 1 Linux/macOS/Windows plus Tier 2 BSD expectations for DPI and font
  stack behavior.
- [Security Overview](../security/overview.md), [Threat Model](../security/threat-model.md),
  and [P0 Acceptance Criteria](../security/p0-acceptance-criteria.md):
  invariant 3 (presentation never Terminal Truth), invariant 4 (no hot-path
  plugin execution), invariant 7 (bounded inputs), P0-AC-001/002 (bounded
  parser), graphics T-02/T-03 limits, and the fuzz/differential gates.
- [Performance Budget RFC](performance-budget-rfc.md): PB-1 cold start,
  PB-4 input latency (`<=8 ms p50`, `<=15 ms p99` key-to-screen),
  PB-6 throughput floor (`>=40 MB/s` parse-and-render), PB-7 idle
  (`<=1% CPU`, zero wakeups when idle). See
  [Reconciliation with performance budgets](#reconciliation-with-performance-budgets).
- [Isolation Resource RFC](../specifications/isolation-resource-rfc.md):
  global and per-plugin budgets are the parent envelope; text features must
  not borrow from them without attribution.

Where this draft selects a threshold or mechanism, it refines those sources; it
does not move a requirement between owners and does not create a bypass.

## Terminology

| Term                 | Meaning                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Grapheme cluster`   | One user-perceived character per UAX #29 (extended grapheme cluster). The unit that `Action::Print` carries as `GraphemeCell` and that occupies one or two grid cells.               |
| `Combining mark`     | A scalar with General Category `Mn`/`Me`/`Mc` that extends its base without advancing the cell cursor (zero-width in the width function).                                            |
| `ZWJ sequence`       | A sequence joined by `U+200D ZERO WIDTH JOINER` that the presentation may render as a single ligated emoji (e.g., family) but that retains one or more cells per the width contract. |
| `Variation selector` | `U+FE00..FE0F` (`VS1..VS16`, BMP) or `U+E0100..E01EF` (`VS17..VS256`, SIP) that selects a text or emoji presentation variant of the preceding base.                                  |
| `Cell width`         | Resolved column count of a cluster: `0` (consumed by base), `1` (narrow), or `2` (wide). Not a pixel extent.                                                                         |
| `Shaping run`        | A maximal substring of one script/direction/font that the shaper turns into positioned glyphs.                                                                                       |
| `Glyph`              | A shaped, positioned outline or bitmap produced for one or more scalars. One cluster maps to one or more glyphs (ligatures fuse many to one, combining sequences may emit multiple). |
| `Atlas`              | The fixed-size GPU texture that holds rasterized glyph bitmaps, packed by `AtlasLayout` (shelf packing in `bitty-render::atlas`)                                                     |
| `Cache`              | The memoizing decorator `GlyphCache` in front of a `GlyphRasterizer` (`bitty-render::cache`)                                                                                         |
| `IME preedit`        | The unfinished composition string held by the platform IME, rendered as an ephemeral overlay above the cursor, not as grid cells.                                                    |

## Text segmentation and width (UAX #29, UAX #11)

### Grapheme clusters (UAX #29)

Candidate normative rule: Bitty segments PTY-decoded scalar streams into
**extended grapheme clusters** per Unicode Standard Annex #29, version 15
(or the version pinned in the accepted decision that supersedes this draft).
The parser emits one `Action::Print(GraphemeCell)` per cluster, not per
scalar. A cluster is the atom that advances the grid cursor.

Consequences:

1. A base scalar followed by one or more combining marks forms a single cluster
   and therefore a single grid advancement (zero-width marks do not create new
   cells). Example: `e + U+0301 COMBINING ACUTE` is one cluster, one cell.
2. An emoji ZWJ sequence (see below) is one cluster presentation-wise but may
   occupy one or two cells per the width contract; cursor motion and selection
   treat it as one user-perceived character.
3. The Tamil `U+0BA8 + U+0BBF` style multi-scalar graphemes and Hangul
   conjoining jamo are handled by the same UAX #29 tables — no script-specific
   special case in segmentation.

Determinism: cluster boundaries are a pure function of the scalar stream and
the pinned UAX #29 tables; no locale, no wall clock, no platform library
differences. Fuzzing assembles random valid and invalid UTF-8 and asserts
totality: every input byte contributes to exactly one cluster or one
`U+FFFD` replacement (per the terminal decoder policy).

### Combining marks

Candidate rule: scalars with canonical combining class non-zero and
General Category `Mn`/`Me` that the width function maps to `0` are
**combining** in the grid: they do not advance the cursor and do not create a
separate cell. They compose onto the preceding base cluster when that base is
within the same cell advancement, subject to normalization:

- Bitty stores clusters in **NFC** (Canonical Composition) when a singleton
  composition exists for the base+mark combination, so `e + U+0301` can
  alternatively be represented as `U+00E9` without observable difference in
  grid or hash. When no composition exists, the decomposed sequence is the
  stored form.
- A combining mark that arrives with no preceding base in the row (start of
  line, start of stream, or after an erase) attaches to a dotted-circle
  placeholder `U+25CC` for rendering purposes but still occupies one cell;
  it never mutates a previous row's cell.
- Exceeding `MAX_CLUSTER_SCALARS = 8` scalars per cluster truncates the
  cluster at a char boundary, drops trailing marks, and sets a per-terminal
  `cluster_truncated` diagnostic counter rather than growing heap without bound
  (security invariant 7).

The current implementation in `crates/bitty-term-state/src/cell.rs`
approximates combining detection with an explicit zero-width table (e.g.,
`0300..036F`, `FE00..FE0F`, `200B..200F`, `202A..202E`, `2060..2064`, `FEFF`,
`E0100..E01EF`) and drops zero-width scalars at the `State::apply` seam.
That approximation is headless evidence, not the normative UAX #29 table set
this draft will require once accepted. Until accepted, `char_cell_width` and
its zero-width table remain the only measured behavior; the fuller tables are
candidate.

### Emoji ZWJ sequences

Candidate rule: a ZWJ sequence is a run of emoji bases joined by `U+200D` ZWJ
that UAX #29 defines as a single extended grapheme cluster. Bitty treats it as
**one cluster, one cursor advancement, one selection unit**, while width
resolution follows the [width section](#unicode-width-uax-11-wcwidth) (not the number of
scalars). Examples:

- `U+1F468 U+200D U+1F469 U+200D U+1F467` (family) is one cluster.
- `U+1F469 U+200D U+1F4BB` (woman technologist) is one cluster.
- A lone `U+200D` that fails to join valid emoji bases resolves to its own
  zero-width cluster and is dropped at the grid seam (same truncated-mark
  accounting).

Bound: `MAX_ZWJ_JOINS = 6` joins per cluster (i.e., at most 7 emoji bases).
Longer ZWJ chains are split into multiple clusters at the last ZWJ boundary.
This matches the observed maximum in the Emoji 15.1 ZWJ repertoire and prevents
a crafted PTY stream from forcing an unbounded join buffer.

Shaping interaction: ZWJ sequences are a **required ligation** in the shaper.
When the font supplies a single ligated glyph for the full sequence, the
cluster paints that one glyph across the cluster's one-or-two-cell extent.
When the font has no ligature, the shaper falls back to per-base glyphs with
ZWJs rendered as zero-width (no gap), but width and cursor accounting do not
change — no ZWJ scalar ever creates a spacer column.

### Variation selectors

Candidate rule: `U+FE0E VARIATION SELECTOR-15` forces **text presentation**,
`U+FE0F VARIATION SELECTOR-16` forces **emoji presentation** (color glyph when
available). SIP selectors `U+E0100..E01EF` are treated as tag-type selectors
with the same zero-width semantics but no distinct emoji force:

1. Every variation selector resolves to **cell width `0`** (consumed by the
   preceding base). A bare selector with no base is dropped and counted as
   `cluster_truncated`.
2. The base+selector pair remains one cluster and one `GraphemeCell`; the
   rendering choice (text vs color glyph) is a **presentation decision** that
   never mutates the grid cell's content or width. Selection copies the base
   scalar plus selector as stored.
3. When the requested presentation is unavailable (e.g., `U+2764 U+FE0F` on a
   font with only a monochrome outline), fallback supplies the best available
   presentation without changing width or invariants.

Determinism: VS resolution is a pure function of the `(base, selector)` pair
and the font coverage set; the same pair on two platforms with different font
coverage may choose different glyphs (expected divergence), but must choose the
same cell width and the same cluster boundaries. The width divergence ledger
records this as intentional.

### Unicode width (UAX #11, wcwidth)

Candidate normative width contract — the authoritative replacement for the
current compact approximation:

1. Width is a pure function of the **resolved grapheme cluster**, not of any
   single scalar, but computed from scalar tables:
   - Decode the cluster into its scalar run.
   - `0` if every scalar is zero-width (combining, ZWJ, VS, `200B..200F`,
     `202A..202E`, `2060..2064`, `FEFF`, `E0100..E01EF`, `0300..036F` superset
     per the candidate zero-width table derived from `DerivedCoreProperties`
     and `emoji-data`).
   - `2` if any scalar has `East_Asian_Width = W` or `F` in `EastAsianWidth.txt`
     or is in the wide-emoji block (`1F300..1F9FF`, `20000..3FFFD`, `2E80..9FFF`,
     `AC00..D7A3`, `FF00..FF60`, `FFE0..FFE6`, per the candidate wide table
     pinned to Unicode 15.1) and no overriding narrow presentation selector is
     present.
   - `1` otherwise.
2. An emoji presentation sequence (`base + U+FE0F`) that has no `W`/`F` base
   still resolves to `2` when the rendering backend will paint a color emoji
   glyph at double-cell extent. This is the sole case where presentation
   influences width beyond the tables, and it is bounded to the explicit VS16
   list — it does not make every emoji wide by default.
3. **Ambiguous-width scalars** (`East_Asian_Width = A`) such as `U+00B7`,
   `U+2014`, `U+2026`, `U+2192`, `U+2500..U+257F` box-drawing, and `U+00A1`
   resolve to `1` in Bitty. This is an explicit deviation from some `wcwidth`
   configurations that map `A → 2` in CJK contexts, and it is recorded as a
   known divergence in the differential ledger. Until the accepted decision
   lands, the existing `char_cell_width` already embodies `A → 1`; this draft
   documents that choice as candidate-accepted.
4. Width determinism is cross-platform identical given the same pinned tables.
   The returned width integrates with the Terminal State invariants exactly as
   today: `1 → one cell`, `2 → lead + trailing Cell::wide_spacer`, `0 → drop`.

Limits: the tables are generated at build time into read-only
`matches!`/`phf` structures; no runtime download of UCD, no per-line allocation
beyond the cluster decode buffer bounded by `MAX_CLUSTER_SCALARS`.

#### Relation to the approximate `char_cell_width`

`crates/bitty-term-state/src/cell.rs::char_cell_width` is the single
width implementation shipped in the `Implemented` headless slice. It uses a
compact `is_zero_width` / `is_wide` table that covers the most frequent ranges
(`0300..036F`, `FE00..FE0F`, `200B..200F`, CJK blocks, `1F300..1F9FF`, etc.) and
treats every `cp < 0x0300` as `1`. That function **is headless evidence, not
user-ready typography**: it is `forbid(unsafe_code)`, deterministic, headless,
bounded (`forbid(unsafe)`, `matches!` tables, no allocation), and sufficient for
the Compat Lab corpora (`tests/compat/unicode/corpus/*.bin ≤ 8 KiB`, `MAX_ACTIONS
= 4096`, headless `Parser -> State -> Snapshot`), but it does not claim
coverage of the full UAX #11 tables, does not implement UAX #29 clustering,
does not resolve ZWJ vs VS presentation-width interactions, and does not shape.
Any future claim that Bitty has "full Unicode width" must point to passing
verification of this RFC's width section, not to `char_cell_width` alone.

### BiDi (UAX #9)

Candidate policy — terminal grid is **logical LTR storage**, visual reordering
is a pure rendering concern that never mutates Terminal Truth.

1. **Storage stays logical.** `State`, `Snapshot`, and scrollback store scalars
   in logical (typing) order. Cursor motion (`CUB`/`CUF`, `ED`/`EL`), selection,
   search, copy, and the alternate-screen model operate on logical order.
   No `Action` and no `State` transition reorders scalars to visual order.
2. **Rendering reorders per paragraph.** The renderer identifies paragraphs by
   newline/`LineFeed` boundaries in each `FramePlan` region and, when a
   paragraph contains any strong RTL scalar (`Bidi_Class = R`/`AL`/`AN`), runs
   the UAX #9 algorithm (explicit embeddings `LRE`/`RLE`/`LRO`/`RLO`/`PDF`,
   `LRI`/`RLI`/`FSI`/`PDI` isolates, `BN`/`WS` handling) to produce a visual
   run order. Weak and neutral resolution follows the standard level
   assignment; the algorithm is the Unicode reference implementation pinned at
   build time, not a platform library call that could diverge.
3. **Cells are reflowed visually.** For a reordered paragraph, glyphs are
   placed by visual level: the leftmost visual cell of the paragraph paints the
   first visual run, and so on. The grid's underlying `Cell` array is not
   permuted; only `GridRenderer::place` consumes the reorder map to emit
   `GlyphInstance`s at visual `RectPx` positions. Hit-testing for selection
   maps the visual click back to the logical cell via the inverse reorder map,
   still snapped to leading halves of wide clusters.
4. **Isolates are respected.** `U+2066..U+2069` isolates and `U+202A..U+202E`
   embeddings that arrive through PTY are treated as zero-width formatting
   controls at the width layer, but they do affect the per-paragraph bidi
   resolution. An unclosed isolate that crosses a line boundary is closed at
   the paragraph (line) boundary — no stateful carry between unrelated lines.
5. **Bounded and deterministic.** Each paragraph processed for bidi is bounded
   to `MAX_BIDI_PARAGRAPH_CELLS = 4096` cells (one very wide logical line).
   Longer paragraphs are split into visual chunks at cell boundaries; each chunk
   is reordered independently with neutrals at the split resolved as `L`. Total
   work per frame is `O(N)` in the damaged region's cell count, not in
   scrollback size. Zero heap growth beyond the per-frame reorder buffers
   (`u32` index arrays, `level: u8` per cell).

Non-goal: this draft does **not** change PTY byte reordering, does not add a
per-cell `BidiLevel` to `Snapshot`, and does not expose bidi controls as a
plugin capability. Plugins observe the existing logical `Snapshot`; visual
reordering stays inside the renderer presentation layer (security invariant 3).

## Font discovery, fallback, shaping, and styling

### Font fallback

Candidate contract — coverage-driven, deterministic, bounded:

1. **Query model.** The existing `FontQuery { family, style, point_size }` is
   the user-requested primary face. The accepted rendering seam stays
   `GlyphRasterizer::load_font(query) -> FontId` and
   `rasterize(RasterKey { character, font, point_size })`. Fallback is a
   **host-owned chain** that the caller resolves before rasterizing, not a new
   crate boundary; the store-level algorithm is:

   ```text
   primary = load_font(primary_query)
   for fallback in fallback_chain(point_size):
       if fallback.covers(scalar): return (fallback.font, true)
   return (primary, glyph == .notdef -> tofu)
   ```

   `fallback.covers` is tested by asking the rasterizer to rasterize the
   scalar on that face and checking for `Ok(None)` (blank) versus `.notdef`
   bitmap discrimination — no platform `cmap` reach-through in this layer.

2. **Fallback chain construction.** The chain is deterministic and bounded:
   primary family, then Noto/bundled fallback families (candidate list:
   Noto Sans Mono, Noto Emoji, Symbols Nerd Font), then platform fallback
   enumeration capped at `MAX_FALLBACK_FAMILIES = 8`, then `.notdef`
   synthesized tofu. Each entry is a `FontQuery` validated by
   `FontQuery::validate`; entries that fail validation are dropped without
   changing chain order. Chain length never exceeds `MAX_FALLBACK_DEPTH = 12`
   families per scalar, and the per-frame distinct fallback faces never exceed
   `MAX_FALLBACK_FACES_PER_FRAME = 16`.
3. **Style matching.** When the primary style (`Bold`/`Italic`/`BoldItalic`/
   `Name("Semibold")`) has no face in the requested family, the resolver falls
   through to the family's `Normal` before entering the next family — style
   fallback never hops families ahead of coverage.
4. **Determinism.** Given the same installed font set and the same pinned
   chain order, the same scalar resolves to the same `FontId` on every
   platform that has that face. Where a fallback family is absent, the resolver
   emits the tofu path rather than reordering the remaining chain.

#### Shipped font and cursor defaults (implementation evidence, status only)

Status: **shipped-default notes only** (read-only from `bitty`
`origin/main`, `crates/bitty-config/src/types.rs`,
`crates/bitty-vt/src/action.rs`, CTX-0157/CTX-0163/CTX-0237). They record what the
implementation ships today; they change no candidate rule above and do not
promote this RFC beyond `draft`.

- Primary face defaults to `"JetBrainsMono Nerd Font"` at `12.0`pt with
  `line_height 1.375` and `letter_spacing 2.0`, giving an effective cell of
  `10x22` from the legacy `8x16` base. The values are measured raster
  truth at `12`pt (CTX-0237, `bitty` #413, commit `308687d`: live
  crossfont probe average advance `10`px, line `22`px, descent `-5`px),
  so in-font tall glyphs (block elements, powerline separators, Nerd
  icons) fit with zero overhang; over-tall outliers keep the permitted
  overdraw path. The renderer resolves the baseline from measured face
  metrics (legacy fixed-ratio fallback retained).
- Family-level fallback order is the configured primary, then
  `"JetBrains Mono"`, `"monospace"`, `"DejaVu Sans Mono"`, and
  `"Noto Sans Symbols 2"` last. `DejaVu Sans Mono` covers box drawing and
  block elements (`U+2580-U+259F`); `Noto Sans Symbols 2` covers braille
  patterns (`U+2800-U+28FF`, TUI graphs such as btop CPU meters).
- `DECSCUSR` (`CSI Ps SP q`) maps `0` to the configured default style,
  `1`/`2` to blinking/steady block, `3`/`4` to blinking/steady underline,
  and `5`/`6` to blinking/steady bar. Shape input handling is shipped in
  `bitty-vt`; shape rendering, full shaping, ligature/kerning policy, and
  color emoji remain candidate above.

### Shaping (HarfBuzz-grade), ligatures, and kerning

Candidate contract — per-run shaping that preserves the grid:

1. **Shaper adoption.** The accepted ADR 0004 wrapping decision points to
   `crossfont@0.9` for rasterization; the shaper is candidate
   `harfbuzz` (via `harfbuzz-sys` or `swash` + `harfbuzz` bridge) as the
   shaping engine. A lighter `swash`-only shaper is the fallback candidate if
   `harfbuzz` lifecycle forces `unsafe` beyond a reviewed budget. No shaper
   runs on the VT or State hot path; shaping is a **render-cold-path** stage
   inside `GridRenderer::place` after `SnapshotDamage` planning.
2. **Runs, not per-cell calls.** Scalars of one `FramePlan` damage region are
   partitioned into shaping runs: maximal contiguous scalars of one script
   (Unicode `Script` property), one bidi level + direction, and one resolved
   fallback face and size. Each run is shaped once, producing positioned
   `GlyphId + x_offset/y_offset + x_advance + cluster` tuples. Ligature
   formation (e.g., `fi`, `!=`, `->`, `===` in programming-ligature fonts),
   contextual alternates, and kerning are per-run properties. No run crosses a
   grapheme-cluster boundary that would violate cursor accounting — the shaper
   may merge scalars within a cluster (ligature) but never across two
   clusters that occupy different cell advancements.
3. **Ligature and kerning policy.** Ligatures and kerning are **opt-in per
   style** and bounded:
   - When `FontQuery.style` opts into `"liga"`/`"calt"` via a candidate
     `features: BTreeMap<Tag, u32>` extension of `FontQuery` (default off for
     `Normal` monospace faces, default on for candidate `Fira Code` style
     families when the user enables `"liga"`), the shaper may replace up to
     `MAX_LIGATURE_CONSUMES = 4` scalars with one glyph whose advance spans
     the ligated clusters' combined cell width. The clusters still occupy
     their `1+1` or `1` cells individually; the glyph is placed at the leading
     cell's origin and clipped to the combined extent. Cursor and selection
     keep per-cluster granularity; the ligated extent is presentation only.
   - Kerning (`kern`, `dist`) adjusts per-glyph advances within a run but
     never changes the integral cell width of any cluster and never causes a
     trailing spacer to become unpaired. Negative advances that would pull a
     glyph's origin outside its cluster's cell extent are clamped to the cell
     boundary.
   - Both features are deterministic per `(run, features)` pair and costed
     against PB-4 (see [Performance](#reconciliation-with-performance-budgets)).
4. **Bounded shaping inputs.** Each shaped run is bounded to
   `MAX_SHAPING_RUN_SCALARS = 256` scalars (`= 1024 UTF-8 bytes` worst case)
   and `MAX_SHAPED_GLYPHS_PER_RUN = 512`. Exceeding those caps splits the run
   at cluster boundaries and shapes each piece independently. The shaper's
   heap never escapes the per-frame arena; no run allocates outside the frame
   budget.

### Color emoji

Candidate contract — emoji presentation as typed, width-aware glyphs:

1. **Selection order.** After fallback resolves the face, emoji color path is
   tried first when the sequence has emoji presentation (`Emoji_Presentation`
   or explicit `VS16`): `COLR/CPAL` color layers (preferred, vector), then
   `CBDT/CBLC` or `sbix` bitmap strikes, then `SVG` (candidate, deferred
   first), then monochrome outline with synthetic color disabled. `COLR`
   layers compose at the atlas upload stage (multi-glyph stacking) without
   touching grid truth. Text presentation (`VS15` or `Emoji Variation` text
   default) skips the color path even when a color face exists.
2. **Single-glyph guarantee for ZWJ ligatures.** A ZWJ emoji ligature uses
   the color-emoji face's single ligated glyph (often a `COLR` cluster glyph)
   at the cluster's double-cell extent, identical to the shaping ligature
   rule. Non-color fallbacks never synthesize a ZWJ join by overlaying two
   monochrome glyphs — missing ligature falls back to per-base glyphs at
   zero-width ZWJs.
3. **Size.** Color emoji glyphs are sized to the cluster's cell extent
   (single-cell `1` emoji vs double-wide `2` emoji per the width contract).
   A double-wide emoji's bitmap may be larger than `cell_height` (covering two
   cell rows visually when the font's design dictates) without claiming extra
   grid rows. Atlas sizing accounts for this: large emoji bitmaps go to the
   large-atlas tier (see [Atlas](#glyph-atlas-and-cache)).

### Variable fonts

Candidate contract — variable axes as part of the query, not as a new handle:

1. The query extends with `variations: BTreeMap<Tag4, f32>` where each tag is a
   four-byte axis tag (`wght`, `wdth`, `opsz`, `ital`, `slnt`, plus font-
   specific tags). Each value is validated to its declared axis range; out-of-
   range values clamp without mutating the stored `FontQuery` (the rendered
   instance uses the clamped value, diagnostics record the clamp).
2. Two queries that differ only in variation values are **different `FontId`s**
   (different instances of the same family) and occupy separate `GlyphCache`
   entries. The number of distinct variable instances per frame is capped at
   `MAX_VARIABLE_INSTANCES_PER_FRAME = 8`; exceeding that loads nothing new
   and reuses the nearest cached instance's advance, recording a diagnostic.
3. Variable-font synthesis is optional (behind a candidate `variable-fonts`
   feature); without it, the `variations` map is validated but ignored, and
   the static instance of the family is used. No error path changes grid
   invariants.

## DPI scaling, cell metrics, and geometry

Candidate contract — logical pixels own layout, physical pixels own raster:

1. **CellMetrics stays integral pixel.** `CellMetrics { width: u32, height: u32 }`
   is the physical pixel extent of one grid cell (see
   `crates/bitty-render/src/grid.rs::CellMetrics`). Logical layout derives it as

   ```text
   cell_w_phys = round(cell_w_logical * scale_factor)
   cell_h_phys = round(cell_h_logical * scale_factor)
   ```

   where `scale_factor` is the `winit::Window::scale_factor()` at the current
   monitor (floating, `> 0`). Rounding is `floor(v + 0.5)` per dimension; a
   `0` result is clamped to `1` and fails validation upstream (`InvalidInput`).
   The same `scale_factor` scales `point_size` supplied to `RasterKey` as
   `pt_phys = pt_logical * scale_factor` after validation.

2. **Per-monitor scale.** When a window spans monitors, the `scale_factor` of
   the monitor containing the window origin is authoritative; a move to another
   monitor produces a `ScaleFactorChanged(new_factor)` event that invalidates
   the `GlyphCache` (generation bump) and re-rasterizes at the new size. No
   mixed-scale tiling within one window — one window, one factor, one
   `CellMetrics` at any instant.
3. **DPI-aware damage.** `SnapshotDamage` pixel regions (see
   `crates/bitty-render/src/grid.rs::SnapshotDamage`) are recomputed from the
   current `CellMetrics`; a scale change forces `with_full_redraw()` (full-frame
   damage) so no stale pixel rect survives the resize.
4. **Integer-grid invariant.** The logical grid stays `cols × rows` cells
   regardless of scale; `cols` or `rows` do not gain fractional columns when
   DPI doubles. The pixel extent `extent_for(cols, rows)` grows instead, so
   scrollback, selection, and cursor math stay integral and deterministic.
5. **Bounds.** `scale_factor` outside `(0.25, 8.0]` is rejected; a
   `CellMetrics` whose `extent_for(max_cols, max_rows)` would overflow `u32`
   per the existing saturating arithmetic is rejected at `RuntimeConfig` or
   `CellMetrics::new` validation, exactly as today.

## Glyph atlas and cache

The implemented substrate — `GlyphRasterizer`, `GlyphCache`,
`AtlasLayout` (shelf packer), `GridRenderer`, and `Surface::headless` — is the
`Implemented` headless proof in `crates/bitty-render` at `be3bdb4`. This draft
adds bounded, observable policy on top of it without changing its trait shape
except for the candidate `FontQuery` extension above.

### Current implemented substrate (non-user-ready evidence)

- **`GlyphRasterizer` trait** (`glyph.rs`): `load_font(query) -> FontId` and
  `rasterize(RasterKey { character, font, point_size }) -> Ok(Some(bitmap)) |
Ok(None) | Err`. Deterministic per session: equal keys give bit-identical
  bitmaps. Errors never poison the cache.
- **`GlyphCache<R>`** (`cache.rs`): memoizing decorator bounded to
  `DEFAULT_GLYPH_CACHE_CAPACITY = 2048` entries (negative caching for blanks,
  `forbid(unsafe)`-equivalent purity per `GlyphRasterizer` contract). On
  overflow, **wholesale eviction** (`entries.clear()`) — deterministic, simple,
  and near-optimal at terminal working-set sizes. Counters `hits`/`misses`
  saturating `u64` observe cost for PB-6. Zero capacity rejected.
- **`AtlasLayout`** (`atlas.rs`): fixed-size shelf packer for
  `DEFAULT_ATLAS_DIMENSION = 2048` (`2048×2048×4 = 16 MiB` as `Rgba`), with
  `allocate(w, h) -> Option<AtlasSlot>` (returns `None` on exhaustion or
  oversized request; blank `0×0` always refused), `occupancy()`, and
  `reset()` (wholesale eviction). Pairwise-disjoint, in-bounds invariant
  after every successful allocation, deterministic.
- **`GridRenderer<HeadlessRasterizer>`** (`grid.rs`): `Snapshot + Damage ->
DamageDescriptor -> FramePlan -> place -> Cache -> Atlas -> DrawList` with
  metrics `counters`/`cache_stats`/`atlas_stats` to make PB-4/PB-6/PB-7
  measurable.
- **`HeadlessRasterizer`** (`crates/bitty-runtime/src/runtime.rs`): a
  deterministic, font-stack-free fake that produces `6..8 px`-plus-`point_size`
  coverage masks. It is the only rasterizer exercised by CI; it proves the
  byte-to-photon path without a window, GPU, or font file. Its output is
  **non-user-ready evidence**: valid `GlyphBitmap`s that composite exactly like
  real font coverage but with no hinting, no shaping, and no fallback.

Until this RFC is accepted, any demo screenshot that credits the headless path
as "rendering" must label it as `HeadlessRasterizer` evidence, not as
user-facing typography.

### Atlas policy (candidate, reconciled)

1. **Tiered atlases.** One `2048×2048` `Rgba` atlas backs the common glyph set
   (CJK, Latin, symbols, color-emoji `COLR` layers at cell extent). A second
   `1024×1024` atlas tiers large color emoji bitmaps whose side exceeds
   `MAX_ATLAS_GLYPH_SIDE = 128` px. Both share the same packer, counters, and
   overflow policy.
2. **Upload path.** The CPU-side coverage texture plus `AtlasLayout` slot plus
   drainable upload queue per `AtlasLayout` remain; the `wgpu` pipeline copies
   the queued bytes post-frame. Nothing in the atlas layer creates a GPU texture
   or mutates `State`.
3. **Eviction.** On `allocate` returning `None` (atlas exhausted), the caller
   evicts wholesale via `reset()` and invalidates the paired GPU texture copy.
   Per-entry LRU is rejected in v1: terminal working sets change slowly, and
   wholesale eviction keeps the bound obvious and the policy deterministic.
   Atlas evictions are attributable counters (`atlas_stats.evictions`) and
   observable via the debug protocol (DevTools RFC seam) and `bitty plugin
doctor` diagnostics, mirroring the image-store attribution.
4. **Idle behavior.** When `FramePlan` is clean (no damage), the renderer emits
   no atlas work and no uploads. An idle window therefore has zero atlas growth
   (PB-7 idle guarantee). Atlas occupancy is a monotone observed value, not a
   resource that grows without a frame plan that demands it.

### Cache policy (candidate, reconciled)

1. The capacity `2048` is both the `GlyphCache` entry bound and the budgeted
   per-terminal working set. Changing it requires an RFC revision that revises
   the PB-3 memory ceiling accordingly (see below); tests must not hardcode the
   capacity except through the declared constant.
2. Cache and atlas evictions are **attributable to the owning
   `TerminalId`/`ViewId`** and counted separately: `GlyphCache::hits/misses`
   versus `AtlasLayout::occupancy/evictions` and the `GridRenderer`'s
   `counters.glyphs_rasterized` vs `glyphs_emitted`. Negative caches (blanks)
   count toward `len()` and obey the same bound.
3. `GlyphCache` errors propagate without insertion (never cached), so a
   transient `UpstreamRasterizer("synthetic")` failure cannot poison the
   window for subsequent frames — the next frame re-attempts rasterization.

## Missing-glyph behavior

Candidate rule — one behavior, never a panic or an unbounded fallback loop:

1. When every fallback face returns `Ok(None)` (blank) or a bitmap that is the
   face's `.notdef` (detected by metric-invariant sentinel or by the
   rasterizer returning a non-blank bitmap for `U+FFFD` that equals the
   `.notdef` bitmap), the cluster is painted with the **tofu box**: a
   `1 px` outline rectangle at the cluster's cell extent plus the
   cluster's scalar run rendered as a `4..6 px` hex fallback is **not** painted
   (to keep the cell legible and monospace-aligned) — the outline is the v1
   missing indicator. A debug tooltip (`debug.inspect` scope) reveals the first
   scalar's `U+XXXX` on hover; copy/selection still carry the original scalar,
   not the tofu placeholder.
2. `U+FFFD REPLACEMENT CHARACTER` is itself subject to fallback and participates
   in the same tofu rule when its face is missing, so the invalid-UTF-8
   replacement never wedges rasterization.
3. A missing-glyph event increments an attributable counter
   `render.counters.missing_glyphs` (per `TerminalId`), observable via the
   debug protocol and `bitty plugin doctor`. It does not allocate beyond the
   atlas slot for the tofu bitmap (one cached entry for the `.notdef` bitmap
   at each `FontId × point_size`).

## IME composition rendering

This section is the **presentation half** of the IME pipeline whose correctness
half lives in `crates/bitty-platform` (adopter of `winit::event::Ime`) and
`crates/bitty-runtime` (single-writer PTY commit queue). The bounded IME text
model is drafted in `bitty/docs/product/unicode-ime.md` (CTX-0079); this RFC
defines how that model paints.

### Contracts reused from the IME draft (non-duplicated)

- Preedit text/scalar count, overlay width, and commit byte length are bounded
  (`IME_PREEDIT_MAX_SCALARS = 256`, commit `<= 256 UTF-8 bytes`, char-boundary
  truncation).
- Preedit state is pure data (`ImeState { preedit: Option<Preedit>,
composing: bool }`), headless-testable without a display server.
- Commit shares the single bounded PTY write queue with raw keyboard; there is
  no second channel.

### Overlay presentation (candidate)

1. **Preedit is ephemeral overlay, not grid truth.** While `composing == true`,
   `State`, `Snapshot`, `scrollback`, `Damage`, and `replies` do not change.
   Only the overlay does. Cancel clears overlay, not grid. Overlay never leaks
   into `search`, `Snapshot::cells`, or replay hashes. This is security invariant
   3 (presentation never Terminal Truth) applied to IME.
2. **Geometry.** The overlay anchors at the **current cursor cell origin** in
   pixel space (`cursor_col * cell_w_phys`, `cursor_row * cell_h_phys`). Its
   width is `sum(cluster_width(cell_units) * cell_w_phys)` for the preedit
   clusters, with the same per-cluster width rules as the main text (so a wide
   preedit emoji consumes two cells of visual extent). When the overlay would
   overflow the window's right edge, it shifts left by the overflow amount
   (clamped to `x = 0`) rather than wrapping or claiming extra grid rows.
   Overflow never resizes the terminal or mutates `Snapshot::width/height`.
3. **Style.** The preedit string paints in the foreground color of the cursor
   cell's style with a **single-pixel underline** (`UnderlineStyle::Single`) at
   `BASELINE_NUMERATOR`-derived baseline plus `1 px`, and a **blinking caret**
   at the IME cursor index (between clusters, snapped to cluster boundaries).
   No background fill, no inverse, no bold/italic synthesis beyond the base
   face. The underline does not create a `FillRect` that a plugin could observe
   as a grid background — it is a pure overlay decoration.
4. **Composition.** The preedit clusters are shaped with the same fallback and
   shaping pipeline as grid text, but **ligatures across preedit-vs-grid
   boundaries never form**: the preedit run and the underlying grid run are
   shaped independently, even when the preedit sits above text. Combined marks
   inside the preedit follow the same combining rule as grid text (zero-width
   marks compose onto their base).
5. **Rendering order.** Each `tick`, `GridRenderer` paints the snapshot
   `DrawList` first, then composites the IME overlay as an extra
   `DrawCommand::Glyph`/`FillRect` batch tagged `overlay: true` that the
   platform compositor draws atop the frame damage. When `composing == false`,
   no overlay batch is emitted (zero cost idle path, PB-7).
6. **`forbid(unsafe_code)`.** The overlay and commit logic are
   `forbid(unsafe_code)`, like `bitty-vt`/`bitty-term-state`/`bitty-platform`
   and `tests/compat/harness.rs`, and they share the same headless test seam
   (`translate_window_event`-style filtering for
   `winit::event::Ime::{Preedit, Commit, Enabled, Disabled}` in
   `bitty-platform`).
7. **Candidate window decoration.** A candidate inline input field (IM candidates,
   e.g., kana/kanji picker) paints as a second overlay — a bounded list popup
   (`max_candidates = 16`, `max_candidate_text = 64 bytes` each) anchored above
   the preedit caret, not as grid cells. No candidate window is grid truth, and
   no PTY output can summon it without an authenticated IME session.

Once this RFC is accepted, `docs/product/unicode-ime.md` will be the
**text-compatibility and corpora** half; this section will be its sole
authoritative overlay presentation half, linked rather than duplicated.

## Bounded resources and hard ceilings

All ceilings are accepted-style candidate defaults parameterized for harness
coverage. Changing a value requires an RFC revision, never silent drift. Floors
are enforced; unknown or out-of-range budget keys fail validation closed per
the isolation ceiling-is-upward-only and attribution rules.

| ID     | Dimension                        | Candidate default                                 | Enforcement point                                |
| ------ | -------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| TXT-1  | Max scalars per grapheme cluster | `8` scalars                                       | segmentation before `GraphemeCell`               |
| TXT-2  | Max ZWJ joins per cluster        | `6` joins (≤ 7 emoji bases)                       | segmentation                                     |
| TXT-3  | Max shaping run scalars          | `256` scalars (`≤ 1024` UTF-8 bytes)              | shaping input before shaper call                 |
| TXT-4  | Max shaped glyphs per run        | `512` glyphs                                      | shaper output before `GridRenderer::place`       |
| TXT-5  | Max ligature consumes            | `4` scalars per ligature                          | shaper decision inside run                       |
| TXT-6  | Max bidi paragraph cells         | `4096` cells                                      | bidi input per paragraph, chunk split            |
| TXT-7  | Glyph cache entry cap            | `2048` entries (negatives count)                  | `GlyphCache::new` / overflow `clear()`           |
| TXT-8  | Atlas logical size               | `2048×2048` primary, `1024×1024` large-emoji tier | `AtlasLayout::new`                               |
| TXT-9  | Max atlas slot count             | bounded by `width×height` pack — no separate cap  | `allocate` + `occupancy()` + `evictions` counter |
| TXT-10 | Max IME preedit scalars          | `256` scalars                                     | `ImeState::set_preedit` char-boundary truncation |
| TXT-11 | Max IME commit bytes             | `256` bytes per commit                            | commit write, split when longer                  |
| TXT-12 | Max fallback families per scalar | `12` families                                     | fallback resolver loop                           |
| TXT-13 | Max variable instances per frame | `8` distinct instances                            | query-extension / diagnostic                     |
| TXT-14 | Max candidate IME window entries | `16` candidates × `64` bytes                      | overlay candidate popup                          |

Notes:

- TXT-6 mirrors the parser payload limit philosophy (P0-AC-001/002): no
  paragraph, however hostile, can force a single bidi allocation over this cap.
- TXT-7/TXT-8 together are the text portion of the isolation and performance
  envelope; they participate in PB-3 reclaim (see below).
- TXT-10/TXT-11 mirror the paste bound `CLIPBOARD_MAX_BYTES = 8192` but at a
  tighter inline preedit/composition granularity; untrusted IME text never
  grows the heap without limit.

## Reconciliation with performance budgets

The [Performance Budget RFC](performance-budget-rfc.md) is normative for what
"lightweight" means. This draft assigns text-specific work to those budgets
without changing their numbers.

| Accepted budget                                                                              | Text work charged to it                                                                                     | Text behavior that defends it                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PB-1 Cold start** (`≤100 ms p50`, `≤200 ms p99` to first prompt)                           | Font discovery (`load_font` for primary family at the config point size), atlas initialization              | Lazy fallback: only the primary face loads at startup; fallback faces and shaper tables load on first use after first frame, not in the launch path. `HeadlessRasterizer` never loads a font file.                                                                                                                                                                                                |
| **PB-2 Idle memory** (`≤80 MB RSS`, one window, 60 s idle)                                   | `GlyphCache` (≤ 2048 entries), `AtlasLayout` (≤ 16 MiB primary + 4 MiB large tier), shaper tables           | Atlas is frame-on-demand: a clean `FramePlan` emits no atlas growth. Shaper tables are mmapped/demand-paged, not eagerly resident.                                                                                                                                                                                                                                                                |
| **PB-3 Typical-session + growth** (`≤250 MB`, 8 tabs 4 h; reclaim within 15% after close+GC) | `GlyphCache`/`AtlasLayout` per terminal, fallback face table, bidi paragraph buffers                        | Terminal close releases its `GlyphCache`/`Atlas` arenas and its fallback-face set eagerly (generation disposal `FS-6` ordering); `cargo test` growth probe `RSS_after_close+GC ∈ [baseline×0.85, baseline×1.15]`.                                                                                                                                                                                 |
| **PB-4 Input latency** (`≤8 ms p50`, `≤15 ms p99` key-to-screen)                             | Per-frame `SnapshotDamage -> FramePlan -> shaping -> cache lookup -> atlas allocate -> DrawList -> present` | Shaping per run `O(n)` at bounded run sizes; `GlyphCache` hit path avoids rasterization; damage granularity coalesces `Print` runs (terminal-state RFC § Damage); bidi only over damaged paragraphs; IME overlay is a single extra batch after grid paint. The plugin pipeline's bounded queue (Isolation RFC RC-9/RC-10) ensures host observations of text input never block the input hot path. |
| **PB-6 Throughput** (`≥40 MB/s` parse-and-render, one core of slowest Tier 1)                | `Parse -> State -> Damage -> render` pipeline sustained                                                     | Fixed synthetic corpus `tests/perf/throughput-corpus.bin` measured as `GridRenderer::counters` plus parse throughput; throughput floor holds for mixed narrow/wide/combining/emoji streams (the corpus contains all four).                                                                                                                                                                        |
| **PB-7 Idle CPU** (`≤1%` over 10 min; zero Bitty-attributable wakeups when idle)             | Frame scheduling, atlas upkeep, IME polling                                                                 | Frame-on-demand only: no render tick, no shaping, no bidi, no atlas activity when no PTY output, no animation, and no plugin timer. Idle wakeups instrumented via `bitty-platform` event-loop counters; any Bitty-sourced periodic timer while idle is a PB-7 violation.                                                                                                                          |

A text implementation that meets PB-4/PB-6/PB-7 without meeting these text
ceilings is not conformant; a change that would move a ceiling upward requires
revisiting the budget's rationale with measurement evidence, exactly per the
Performance Budget RFC's cross-cutting rule that violations are "fix, renegotiate
via an updated RFC, or document a time-boxed exception."

## Reconciliation with security contracts

| Text feature                                                                                  | Normative gate it implements                                                            | Threat / P0-AC               |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------- |
| Incremental segmentation + width: bounded cluster/ZWJ/VS inputs, no locale branch             | Bounded parsing, panic-free recovery                                                    | T-01, P0-AC-001, P0-AC-002   |
| Bidi per-paragraph bound TXT-6 + chunk split                                                  | Bounded resource, no heap growth from a hostile line                                    | T-01, P0-AC-002              |
| Fallback chain TXT-12 and zone-face table bounded                                             | Bounded decode, no ambient font enumeration cost                                        | T-01, P0-AC-001, R-007       |
| Shaping per-run bounds TXT-3/TXT-4 and `MAX_FALLBACK_FACES_PER_FRAME`                         | Bounded-input presentation, R-002 analog for glyph explosion                            | T-02 analog, P0-AC-003       |
| Atlas `2048×2048` + `1024×1024` and `GlyphCache` `2048` wholesale-eviction, before allocation | Graphics budget analog before texture commit                                            | T-02, P0-AC-003, P0-AC-004   |
| IME preedit TXT-10/11 char-boundary truncation and single PTY writer                          | Bounded paste/IME, security invariant 7 (every untrusted input bounded)                 | T-04, P0-AC-008, R-004       |
| Glyph rasterizer isolated behind `GlyphRasterizer` trait, no PTY-directed font-path load      | Deny-by-default local file, regular-file + safe-path check when file-backed fonts exist | T-03, P0-AC-005, R-003       |
| Snapshot-only renderer, no plugin mutation of grid/bidi/shaping                               | Terminal Truth core-owned (presentation never truth)                                    | T-13, invariant 3, P0-AC-015 |
| No plugin callback on byte/cell/glyph hot paths                                               | No hot-path plugin execution                                                            | T-07, invariant 4            |

No clause here moves a requirement between the
`TerminalSecurityPolicy` domain (remote/local process → escape sequence → local
resource) and the `PluginCapabilities` domain (Lua plugin → host API → local
resource) per [Core and Plugin Boundaries](../architecture/core-boundaries.md).
A remote shell that requests `OSC 52` and a Lua plugin that calls
`clipboard.*` remain different origins, trust relations, and audit events.

## HeadlessRasterizer and approximate width: explicitly non-user-ready evidence

This section exists to keep two `Implemented` constructions from being mistaken
for accepted typography. Both are headless, bounded, deterministic test seams
that prove the byte-to-photon data flow without choosing the product.

### `HeadlessRasterizer` in `crates/bitty-runtime/src/runtime.rs`

- **What it is.** A deterministic fake `GlyphRasterizer` whose `rasterize` emits
  a `6..8 px` plus `point_size`-scaled square `Rgb` coverage mask per scalar,
  averaged to luminance by the software compositor exactly as the GPU path
  samples atlas texels. It is the only rasterizer CI verifies; the real GPU
  path (`GpuContext::initialize` + live `SurfaceTarget` + `crossfont`-backed
  rasterizer) is env-gated (`BITTY_RENDER_GPU_TESTS=1` in `bitty-render`) and
  requires a working driver.
- **What it is not.** It has no font file, no hinting, no fallback, no
  shaping, no `COLR`/`CBDT`, no ligature, no kerning, no bidi reordering, and
  no variable-font axis. A screenshot built with it is a **correctness probe**,
  not a typography sample. Any documentation or website copy that shows a
  rendered frame built by `HeadlessRasterizer` must label it with the literal
  string `HeadlessRasterizer` and with `non-user-ready evidence` adjacent to the
  image.
- **Lifecycle.** This draft does not remove `HeadlessRasterizer`. A future
  implementation PR that lands the `crossfont`-backed rasterizer keeps the
  headless path as the deterministic harness (exactly as `bitty-term-state`
  keeps the headless `State` harness alongside any windowed path).

### Approximate `char_cell_width` in `crates/bitty-term-state/src/cell.rs`

- **What it is.** A compact `width ∈ {0,1,2}` function with pure `matches!`
  tables covering the frequent ranges (`0300..036F`, `FE00..FE0F`, `200B..200F`,
  CJK Unified/Hangul/Fullwidth, `1F300..1F9FF`, `20000..3FFFD`, etc.) and the
  rule `cp < 0x0300 → 1`. It drops zero-width scalars at the `State::apply`
  seam, allocates nothing, reads no file, and satisfies the grid invariants
  (no orphan spacers, `width` is `1` or `2` on every cell, cursor on leading
  half). It is sufficient for the Compat Lab corpora and the soak harness at
  `be3bdb4` (~808 headless tests, `Implemented` but not yet `Verified`).
- **What it is not.** It is not the pinned UAX #11 tables listed above
  (full `EastAsianWidth.txt` + `DerivedCoreProperties` + `emoji-data`), does not
  implement UAX #29, does not resolve ZWJ vs VS presentation-width
  interactions (`U+2764 U+FE0F → 2`), and does not drive shaping or bidi.
  Claiming "Bitty has full Unicode width" on the basis of `char_cell_width`
  is a conformance violation.
- **Transition.** Once this RFC's segmentation and width sections are accepted,
  `char_cell_width` is the single implementation behind that decision and its
  tables become the UAX-pinned candidate tables above — same symbol, now
  normative. Until then, any measurement or website claim about width must
  cite the commit and call the current tables an **approximate, non-user-ready
  width** with the exact scalar-list divergence against the pinned Unicode
  version.

## Compatibility and versioning

- The grid wire (`Cell { glyph, style, width, spacer, hyperlink }`,
  `Snapshot::cells: Box<[Cell]>`, `width ∈ {1,2}`, spacer trailing-half rule)
  is unchanged. No snapshot field gains a new variant in this draft; shaping and
  bidi are presentation layers that emit `DrawList` entries, not `Snapshot`
  mutations. A major snapshot version would be required to change that, with
  migration notes and an accepted follow-up RFC.
- Grapheme-cluster encoding versioning: the `GraphemeCell` payload in
  `Action::Print` gains a `cluster: BoundedString` versus `char` in the
  candidate delta (today `Cell::glyph: char` stores only the leading scalar of
  the cluster for headless slices). That change is the **one breaking change**
  in this draft and is gated on the accepted segmentation tables — it does not
  ship until the width/bidi half is accepted and the reflow-on-resize algorithm
  (Terminal State RFC open item) is chosen alongside it.
- DPI is not a negotiation: the impl parameter is
  `scale_factor: f64` plus the derived `CellMetrics`; there is no wire or
  storage schema change beyond diagnostic counters.
- Unknown `SceneNode` or `RichBlock` versions from a newer producer still render
  as a bounded plain-text fallback per the Rich RFC compatibility rule; text
  and rich remain separate presentation contracts.
- Anchors remain `Zone(LineId) | Line(LineId) | Grid(Range<CellPos>)`
  of the Rich RFC — this draft adds no new anchor kind. IME overlay anchors
  at the cursor pixel, not at a line id, so there is no anchor persistence
  question beyond the per-frame cursor position.

## Verification plan

Acceptance of the implemented contract later requires, at minimum, the headless
gates below plus the platform gates named per row. Every text ceiling is
attributable to the owning `TerminalId`/`ViewId` and observable via the debug
protocol and `bitty plugin doctor` diagnostics, mirroring the image-store
attribution pattern.

1. **Segmentation** — `unit`: UAX #29 extended cluster boundaries against the
   `GraphemeBreakTest.txt` conformance corpus; negative cases (truncated byte
   stream at every chunk split) assert determinism and totality.
2. **Combining / ZWJ / VS** — `unit` + `compat/corpora`: `tests/compat/unicode/corpus/*.bin`
   extended with `09-zwj-family.bin`, `10-vs-selectors.bin` at `≤ 8 KiB`, each
   feeding `harness::parse_bounded` + `State` and asserting per-corpus
   `width/spacer` invariants, cursor-on-leading, and selection copy that retains
   raw scalars.
3. **Width** — `unit` + `compat/differential`: authoritative tables vs
   `char_cell_width` differential; ambiguous-width `A→1` cases enumerated as
   intentional divergences in the known-divergence ledger; cross-platform hash
   of the pinned tables via `just check`-triggered generator.
4. **Bidi** — `unit` + `property`: paragraphs against the UAX #9
   `BidiTest.txt` conformance corpus (`BidiTest` level + reorder assertions);
   property tests that a visual-hit-test and its inverse logical map compose to
   identity except for neutral-at-split cases; per-paragraph bound TXT-6
   exercised with a `4096 + 1` cell adversarial line.
5. **Fallback** — `unit` + `integration`: per-scalar fallback chain TXT-12
   exercised with synthetic family sets that force each branch (primary hit,
   Noto hit, platform hit, tofu); new-face not appearing after overflow until
   the diagnostic fires.
6. **Shaping** — `unit` + `integration`: per-run bounds TXT-3/TXT-4/TXT-5
   (split at cluster boundary, never over `512` glyphs); ligature fixture
   `fi`/`!=`/`->` with `lig_then_un_lig` switching the feature gate and
   asserting advance unchanged for the cell lattice; kerning clamped to cell
   extent.
7. **Color emoji** — `unit` + `manual`: `COLR` stacking vs monochrome fallback
   for `U+2764 U+FE0F`; ZWJ ligated vs decomposed fallback (ZWJ zero-width gap
   asserted); double-wide emoji extent at large atlas tier vs single-cell
   emoji.
8. **Variable fonts** — `unit`: axis validation/clamp, distinct `FontId` per
   variation set, `MAX_VARIABLE_INSTANCES_PER_FRAME = 8` overflow that reuses
   nearest cached instance and records the diagnostic without changing invariants.
9. **DPI** — `unit` + `integration`: rounding fixture
   `round(l * scale + 0.5)` at `0.25..8.0` edge cases; per-monitor scale change
   that asserts `GlyphCache` generation bump and full-redraw `with_full_redraw`
   damage; `extent_for` saturating arithmetic with hostile `cols×rows`.
10. **Atlas/cache** — `unit`: `GlyphCache` wholesale eviction at `2048 + 1`
    distinct keys (`hits/misses` counters attest); `AtlasLayout` exhaustion at
    `2048×2048 + 1` pixel beyond pack (`None` deterministically, eviction after
    `reset()` recovers); tier overflow to large-emoji atlas asserted.
11. **Missing glyph** — `unit`: zero-family fallback produces tofu outline,
    copy retains scalar not `.notdef`, `missing_glyphs` counter increments once
    per distinct missing `FontId × scalar`.
12. **IME overlay** — `unit` + `integration` (headless): preedit overlay paints
    at cursor pixel with overflow-clamped `x`, underline+caret geometry, bidi-
    unaware within the overlay (overlay has its own isolate), zero damage when
    `composing == false`; no `Snapshot` mutation across `set_preedit/commit/cancel`
    and no effect on `search`/`replies`/`scrollback`/replay hash.
13. **Bounds/throughput** — `adversarial`: every bound in the table exercised
    with `MAX_* + 1` inputs and zero crash/panic/overflow; sustained-load test
    holds TXT-7/TXT-8 plus PB-3 reclaim over an 8-tab-equivalent window load.
14. **Performance** — PB-4/PB-6/PB-7 instrumentation via the existing
    `GridRenderer::counters/cache_stats/atlas_stats` with recorded baselines;
    `cargo bench` theme bench for shaping + bidi vs the PB-6 `40 MB/s` floor.

Fuzz and adversarial strategy:

- fuzz targets for UAX #29 segmentation, variation-selector resolution, ZWJ
  chain expansion, variation-selector pile (`VS1..VS256` pile on one base),
  and bidi paragraph construction;
- adversarial interleaving of PTY bytes that force worst-case shaping/bidi
  boundaries (every cell starts a new run);
- property tests that `ImageStore` plus text budgets never exceed the
  isolation/global envelope under concurrent placement and glyph pressure.

## Open points

Deliberately unresolved at candidate time. None blocks the accepted contracts
named in [Normative sources](#normative-sources-this-specification-must-not-weaken);
each will require a follow-up decision. Each cites the gate that will accept it.

1. **Shaper crate** — whether HarfBuzz (`harfbuzz-sys`) or `swash`-only shaper
   enters `bitty-render`, including the `unsafe` budget and maintenance-policy
   update to ADR 0004. Gate: ADR 0004 revision + `unsafe` audit sign-off.
2. **Emoji backend priority** — whether `SVG` emoji enters v1 or waits for
   `1.x` given `COLR`/`CBDT` coverage, and whether `Noto Emoji` is bundled.
   Gate: this RFC revision plus [Default Distribution RFC](default-distribution-rfc.md).
3. **Ligature defaults** — whether `liga`/`calt` are off for v1's default
   monospace faces or on for programming-ligature families, and whether the UX
   for per-family opt-in ships in `init.lua` or as a `config` key. Gate: this
   RFC revision + [Configuration Model RFC](configuration-model-rfc.md).
4. **Bidi scope** — whether bidi applies only to the current damaged paragraph
   (v1 default) or to a larger scrollback-backed line that spans soft wraps.
   Gate: this RFC revision alongside the choice of reflow algorithm
   (Terminal State RFC open item).
5. **Variable-font surfacing** — which axes beyond `wght`/`wdth` become user
   facing and whether variation deltas participate in `ConfigPlan` diffs.
   Gate: this RFC revision + [Configuration Model RFC](configuration-model-rfc.md).
6. **Hinting and anti-aliasing policy** — grayscale vs subpixel RGB, hinting
   level per platform/DPI bucket, and its interaction with atlas `Rgb` vs
   `Rgba` format. Gate: this RFC revision + Platform RFC half of text.
7. **Selection mapping under ligatures/bidi** — whether double-click and
   expand-selection snap to cluster, word, or shaped-glyph extent when a
   ligature spans clusters. Gate: this RFC revision + [Core and Plugin Boundaries](../architecture/core-boundaries.md) selection primitive.
8. **Performance baseline pinning** — the harness, corpora, and reference
   machines that turn PB-4/PB-6 into hard gates for the first implementation PR.
   Gate: implementing task with measurement evidence, not this draft alone.

## Acceptance criteria

Per the [open-question register](../decisions/open-questions.md) close rule,
this RFC stays `draft` (candidate) until all of the following are satisfied in
the same PR that promotes its frontmatter to `accepted`:

1. The prose and every identifier and budget in the tables above have
   independent category-owner (architecture/terminal), docs-curator, and
   security-reviewer sign-off, including the bidi, shaping, fallback,
   atlas/cache, DPI, and IME sections and the PB-1..PB-7 reconciliation.
2. Affected documents were synchronized in the same change: this RFC's
   frontmatter, [Core and Plugin Boundaries](../architecture/core-boundaries.md),
   [Architecture Overview](../architecture/overview.md),
   the [Decision Register](../decisions/index.md), and the
   [Specifications index](README.md) reference the accepted contract rather than
   describing a parallel design; `docs/product/unicode-ime.md`'s overlay portion
   cites this RFC as the authoritative presentation half.
3. No element weakens a normative P0 gate; any discovered conflict returns the
   conflicting clause to revision rather than downgrading the gate.
4. Verification gates have at least one headless conformance harness per
   section (segmentation, width, combining/ZWJ/VS, bidi, fallback, shaping,
   color emoji, DPI, atlas/cache, missing glyph, IME overlay) with
   deterministic measurement evidence, mirroring the isolation-budget harness
   style in `bitty-plugin-host` and `bitty-lua`, and `HeadlessRasterizer`/
   `char_cell_width` remain labeled as non-user-ready evidence in the same
   diff.

## References

- [Terminal State RFC](terminal-state-rfc.md) (OQ-007) — `Action::Print(GraphemeCell)`, grid invariants (cell totality, wide spacer, cursor integrity), damage model, replay determinism, fuzz/differential requirements.
- [Rich Presentation RFC](rich-presentation-rfc.md) (OQ-008/015/016) — `ImageStore`/`ImagePlacement` bounded budgets IMG-1..IMG-9 and SCN-1..SCN-5, `Image != Cell`, scene composition, authenticated structured transport.
- [Compatibility Milestone RFC](compatibility-milestone-rfc.md) (OQ-004) — M1-required VT subset, UTF-8 foundation.
- [Performance Budget RFC](performance-budget-rfc.md) (OQ-001) — PB-1..PB-7 budgets and cross-cutting rules.
- [Isolation Resource RFC](isolation-resource-rfc.md) (OQ-014) — RC-1..RC-10 ceilings and failure semantics.
- [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) — crate DAG, MSRV, headless rendering seam.
- [ADR 0004](../decisions/adrs/ADR-0004-upstream-dependencies.md) — adopt/wrap/reject choices and maintenance policy.
- [Security Overview](../security/overview.md) and [Threat Model](../security/threat-model.md) — invariants, trust boundaries, T-01..T-14.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) — mechanism vs policy, Text as Core-owned.
- `bitty/docs/product/unicode-ime.md` (CTX-0079 draft) — bounded `char_cell_width` approximation, `tests/compat/unicode/corpus/*.bin` corpora, `MAX_CORPUS_BYTES`/`MAX_ACTIONS` bounds, IME preedit/commit bounded model.
- `crates/bitty-term-state/src/cell.rs` — `char_cell_width`, `is_zero_width`, `is_wide`, width invariants.
- `crates/bitty-render/src/{glyph.rs,grid.rs,atlas.rs,cache.rs}` — implemented `GlyphRasterizer`, `GlyphCache`, `AtlasLayout`, `GridRenderer` substrate.
- `crates/bitty-runtime/src/runtime.rs::HeadlessRasterizer` — deterministic headless rasterizer evidence.
- Unicode Standard Annexes — [UAX #29 Text Segmentation](https://unicode.org/reports/tr29/), [UAX #11 East Asian Width](https://unicode.org/reports/tr11/), [UAX #9 Bidirectional Algorithm](https://unicode.org/reports/tr9/).
