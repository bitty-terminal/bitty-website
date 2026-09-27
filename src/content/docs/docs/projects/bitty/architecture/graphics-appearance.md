---
title: Graphics and Appearance Model
description: Candidate direction for terminal graphics protocols as image producers, the GPU composition layer order, opacity and blur ownership, shared image infrastructure, Theme system placement, and small-core crate guidance.
category: architecture
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 23
---

# Graphics and Appearance Model

> Status: **draft** (frontmatter `draft`), docs-only, candidate direction not
> implementation. This document records the user rendering/appearance
> direction recorded as
> [DIR-021](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md).
> Every layer order,
> type name, and crate sketch below is a **model to plan against**, not an
> implementation claim. It changes nothing accepted: not the
> [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md)
> image contract (OQ-008, IMG-1 through IMG-9), not the
> [Workspace Compositor Specification](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/workspace-compositor.md),
> not [Core and Plugin Boundaries](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/core-boundaries.md),
> not the shipped [Theme presets](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/configuration/themes.md)
> catalog, and not the accepted
> [Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)
> (OQ-039). Those documents stay authoritative for their subject matter; where
> this candidate disagrees with them, they win.
>
> Verification basis: read-only inspection of the `bitty` checkout at
> `eef983e` (2026-09-15; shared checkout, not modified). No product code was
> changed for this task. Implementation-status notes in the appendix cite exact
> paths; everything else is direction.

## Core principle

> **Terminal graphics protocols are image producers, not rendering backends.**

Kitty Graphics and Sixel handle bytes, decode, and image resource plus
placement semantics. The Bitty renderer owns alpha, z-order, GPU textures,
composition, background, theme, blur, and UI. Future image sources plug the
same seam without architectural change:

```text
Kitty Graphics
Sixel
iTerm2 graphics
background image
animated wallpaper
desktop pet
Markdown image
AI generated UI
plugin texture
video
```

This converges with the
[Architecture Overview](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/overview.md)
direction that terminal characters are one scene-content class among others:
Bitty grows toward a small GPU-composited scene system, and Kitty Graphics is
one more content class alongside glyphs, background, and UI.

## Composition layer order (model)

Candidate scene order, background to foreground, following Kitty specification
semantics for the graphics layers. Recorded as a model, not an implementation
claim (the shipped Kitty present path is currently topmost-only; see the
appendix):

```text
Scene
|
|-- OS desktop / wallpaper
|-- window backdrop (opacity / blur, platform-owned)
|-- Bitty background (color, image, tint / dim)
|-- negative Kitty images (z < 0)
|-- terminal cell backgrounds (ANSI colors / theme)
|-- normal Kitty images
|-- text / glyphs
|-- positive Kitty images
|-- Bitty UI / panels / floating UI (borders, tabs, selection)
|-- plugins / overlays / pet
```

The exact ordering of the graphics layers against cells and glyphs must follow
the Kitty graphics protocol specification precisely when implemented; the point
of this model is that ordering is a **scene composition problem**, not a
protocol problem.

## Opacity: three different things

Do not model one vague `opacity`. The direction distinguishes, at least at the
subsystem level:

```rust
// Illustrative subsystem-type sketch only; not an accepted API.
BackgroundOpacity
SurfaceOpacity
ImageAlpha
UiOpacity
```

### Window and background opacity

Example configuration shape (illustrative only):

```lua
appearance = {
    opacity = 0.85,
}
```

This means the Bitty window reveals the desktop or wallpaper behind it. It has
no direct relationship with the Kitty Graphics Protocol. Kitty itself scopes
`background_opacity` to cells carrying the default terminal background so that
status bars and powerline-style content do not turn transparent with it; Bitty
should adopt the same semantic:

```text
background opacity != whole-window opacity
```

Scaling text, images, cursor, panels, and UI by one global factor is explicitly
not the goal.

### Image alpha

This is the opacity that belongs to Kitty Graphics: RGBA pixel alpha with
alpha blending, including graphics above or below text. A transparent PNG
travels Kitty Graphics into an image object, into a GPU RGBA texture, and is
alpha-blended into the frame. It is a different opacity from window opacity.

### Plugin and UI opacity

Floating panels, pets, notifications, the command palette, and AI panels carry
their own scene-graph alpha (for example `panel.opacity = 0.9`). Cursor opacity
and cursor color belong to this appearance family as well.

## Blur is a platform and windowing backend duty

Backdrop blur (for example `blur = 20` alongside `opacity = 0.8`) means the
desktop behind Bitty is blurred by the compositor; it never means blurring a
Kitty image. The direction abstracts it as:

```rust
// Illustrative trait sketch only; not an accepted API.
trait BackdropEffect {
    fn set_opacity(...);
    fn set_blur(...);
}
```

with per-platform mechanisms (Linux Wayland compositor capability,
macOS native visual effect, Windows DWM backdrop APIs). Blur is meaningful
only with opacity below 1, needs platform support, and must never live in the
Kitty or Sixel protocol modules.

## Background image: shared backends, separate namespaces

A configured background image and a Kitty-transmitted image share the backend
path (decode into RGBA pixels into a GPU texture into a layer) but never the
protocol or lifecycle:

```text
                    |-- background image
Image Decoder ------|-- Kitty Graphics
                    |-- Sixel
                    |-- plugin image
                    |-- pet texture
                           |
                     Texture Manager
                           |
                          GPU
```

> **Protocols are never shared, but image backends are shared.**

Candidate shared infrastructure (names illustrative only):

```rust
// Illustrative type sketch only; not an accepted API.
ImageAsset
ImageDecoder
Texture
TextureCache
ImagePlacement
ImageRenderer
```

Each source (Kitty, Sixel, background, plugin) resolves into `ImageAsset`, but
lifecycles and placement namespaces stay separate. Kitty's own background-image
handling (tinting the background image against the window background color for
readability) is the precedent for keeping theme tint inside the composition
pipeline rather than inside any protocol.

## Kitty-primary plus Sixel-compat rationale

Kitty Graphics fits the composited scene model better, which is why it is the
primary protocol with Sixel as compatibility:

```text
Kitty: RGBA, alpha blending, image id, placement id,
       z-index, relative placement, animation
```

The `z-index` maps naturally onto the composition order above, including
negative values that paint below text. Sixel is a legacy raster-in-stream
model (with notions such as background-erase modes that belong to its era);
Bitty should normalize Sixel input into the image object and texture form and
must not let the Sixel rendering model leak into the renderer.

## Theme sits above protocols

Candidate Theme shape (illustrative only; the shipped preset catalog in
`configuration/themes.md` stays authoritative for what exists today):

```rust
// Illustrative struct sketch only; not an accepted API.
Theme {
    foreground,
    background,

    ansi_0..ansi_15,
    ansi_256,

    cursor,
    selection_fg,
    selection_bg,

    border,
    panel_bg,
    panel_fg,

    accent,
    warning,
    error,
    success,
}
```

Theme fans out to terminal cells, Bitty UI, and plugins. Images never read the
Theme. Theme composes with background and translucency in this order (model):

```text
Wallpaper
   |
  Blur
   |
Background image
   |
Theme background tint
   |
Cell background
   |
Terminal graphics
   |
Text
```

## Matugen-style generation sits on the Theme system

A wallpaper-derived palette plugin (matugen-style) must not know Kitty or Sixel
exist. Candidate pipeline (model):

```text
wallpaper.jpg
      |
bitty-colorgen plugin
      |
Palette Generator
      |
Theme
      |
semantic palette
      |
+-----+-----------+
|     |           |
ANSI  Bitty UI    Panel UI
16    colors
|
ANSI 256 mapping
```

Background and Theme form a reactive loop (model): a background change emits
`BackgroundChanged`, the plugin recomputes a palette (for example OKLCH
extraction into ANSI 16, ANSI 256 approximations, and semantic colors), and a
`ThemeChanged` event drives a global transition across terminal, panels, and
plugins with smooth interpolation. Configuration and event shapes here are
illustrative; the accepted appearance contract stays in RFC-0001.

## Subsystem split (direction)

```text
bitty-render
|
|-- compositor (layers, alpha, blending)
|-- image (decode, texture, cache, placement)
|-- text (glyph renderer)
|-- effects (tint, dim, etc.)

bitty-terminal
|
|-- ansi
|-- kitty-graphics
|-- sixel

bitty-theme
|
|-- palette
|-- semantic colors
|-- ansi palette
|-- theme manager

bitty-platform
|
|-- window transparency
|-- backdrop blur
|-- compositor integration

bitty-plugin
      |
Theme API, Background API, Appearance API
```

The load-bearing boundary, restated: **every image source converges on the
image and texture system, but where the image came from stays independent.**

## Crate guidance (direction, not a dependency decision)

Do not pull the whole `termwiz` tree into production: its dependency surface
is heavy relative to the small-core philosophy, and Bitty already owns a VT
parser, terminal state, a screen model, and a renderer. The direction is a
small owned graphics-protocol layer:

```text
bitty-core
|-- vt (APC detection)
|-- graphics
|   |-- kitty (parser, command, transmit, placement, animation, state)
|   |-- sixel (parser, decoder)
|-- image (store, texture, placement)
```

unified behind something like:

```rust
// Illustrative enum sketch only; not an accepted API.
enum GraphicsCommand {
    Kitty(KittyCommand),
    Sixel(SixelImage),
}
```

flowing into `ImageStore` and `ImagePlacement` and then the renderer.
References: `termwiz` Kitty parser design (receive-side model, not the whole
crate), the Kitty official specification, and the WezTerm implementation
layering (APC parse, baseline protocol parse, placement model, renderer
quads, animation and composition).

The `kitty-graphics-protocol` crate (light dependencies, sender-oriented
public API) is worth studying, but before any dependency: verify first-hand
whether it exposes a receiver-side API (`parse`, `decode_command`, or
`KittyCommand::from_str`). If it does not, its fitting role is a
`dev-dependency` test sender that generates APC sequences for Bitty's parser,
store, and placement tests, so handmade escape strings stop spreading through
the test suite.

## External-terminal gap survey (CTX-0013, candidate additions)

> Status: **draft**, docs-only survey. Read-only inspection (2026-09-15) of
> `wezterm@2afb836` (`docs/`, plus the `term`, `wezterm-cell`, and
> `wezterm-escape-parser` crates in the same monorepo),
> `kitty@74b7ef892` (`docs/graphics-protocol.rst`,
> `docs/wide-gamut-colors.rst`, `kitty/options/definition.py`),
> `kitty-graphics-protocol@1f25646` (v0.1.3),
> `par-term-emu-core@59fce02` (`src/terminal/apc_filter.rs`,
> `src/graphics/`), and targeted looks at `ghostty@5252b193c`
> (`src/terminal/kitty/`, `src/font/sprite.zig`, background-image shader)
> and `alacritty@d692748` (`alacritty/src/display/content.rs`,
> renderer text backends). Revisions are summarized inline above.
> Reference clones are untrusted design evidence, never dependencies.
> Everything below is a **candidate consideration** for the model above; it
> changes nothing accepted and admits no new open question.

### Per-cell alpha: a possible fourth opacity concept

The opacity triple above (background / surface / image) may be missing a
cell-level alpha. Alacritty's renderable cell carries its own alpha channel
(`alacritty@d692748:alacritty/src/display/content.rs`): default-background
cells get `bg_alpha = 0.0` so window opacity shows through, non-default
cells get `1.0` unless a transparent-colors mode applies the window opacity
instead, and inverse video plus the block cursor force `1.0`. WezTerm splits
the same seam from the configuration side with `text_background_opacity`:
the alpha for cells carrying a non-default background, defaulting to fully
opaque (`wezterm@2afb836:docs/config/appearance.md`). Kitty generalizes it
further with `transparent_background_colors`: up to seven `color@opacity`
entries so individual UI colors (cursor-line, highlighted blocks) can each
be semi-transparent, gated on `background_opacity < 1`
(`kitty@74b7ef892:kitty/options/definition.py`). Candidate direction: when
the render subsystem is designed, consider a per-cell background alpha in
the renderable cell, distinct from window, image, and UI opacity, with
explicit override rules for inverse, selection, and cursor — rather than
discovering the need mid-implementation.

### Cursor shape, thickness, blink, and contrast fallback

This document currently places cursor opacity and color in the UI appearance
family and says nothing else about the cursor. WezTerm's cursor surface is
wider: a six-value style enum including blinking variants, a thickness in
`px`/`pt`/`%`/`cell` units that defaults to the underline thickness,
blink easing plus rate controls, reverse-video forcing with a minimum
contrast fallback, and a note that blinking costs graphics-subsystem frames
(`wezterm@2afb836:docs/config/lua/config/` — `default_cursor_style.md`,
`cursor_thickness.md`, `cursor_blink_rate.md`, `cursor_blink_ease_in.md`,
`force_reverse_video_cursor.md`, `reverse_video_cursor_min_contrast.md`).
SGR text blink is a separate family with its own normal and rapid rates
(`text_blink_rate.md`, `text_blink_rate_rapid.md`). Candidate direction:
cursor style, thickness units, blink animation budget, and a contrast
fallback belong in the appearance model alongside cursor color; text blink
stays a cell-attribute concern, not a cursor concern.

### Underline and strikethrough composition

Decorations are unrecorded in this document. WezTerm exposes underline and
strikethrough position plus thickness overrides in the same `px`/`pt`/`%`/
`cell` unit family, defaulting to the primary font's metrics
(`wezterm@2afb836:docs/config/lua/config/` — `underline_position.md`,
`underline_thickness.md`, `strikethrough_position.md`). Ghostty goes further
architecturally: underline variants (single, double, dotted, dashed, curly)
and strikethrough render as resolution-independent procedural sprite faces,
not font glyphs (`ghostty@5252b193c:src/font/sprite.zig`). Candidate
direction: decide whether Bitty decorations are font-metric-driven,
sprite-driven, or hybrid — and record the unit family (`px` for absolute,
`pt` for DPI-scaled, `%` for font-relative, `cell` for grid-relative) —
before the text subsystem meets HiDPI.

### Image placement, scroll, and resize semantics

Follow-up 1 already names delete/query/animation/put, z-index, Unicode
placeholders, and scroll behavior as VT/parser-track work; the survey adds
first-hand semantic details that coverage must eventually include:

- Scroll and erase interaction (Kitty specification,
  `kitty@74b7ef892:docs/graphics-protocol.rst`, "Interaction with other
  terminal actions"): images scroll with text, margin-restricted scroll
  clips images that would leave the page area, reset / alternate-screen /
  `ED 2 J` clear images, and all other erase commands leave graphics
  untouched.
- z-index tie-breaks: equal z-index resolves to the lower image id; equal
  z-index and id is undefined; negatives below `INT32_MIN/2` paint under
  cells with non-default backgrounds — a second, deeper negative tier.
  Cursor-after-placement moves by the placement rectangle, `C=1` opts out,
  and leaving the screen or scroll area is implementation-defined.
- Cursor-after-image differs per protocol family: Kitty and iTerm2 land
  bottom-right, Sixel lands under the left corner unless a
  scrolls-right mode is set
  (`wezterm@2afb836:term/src/terminalstate/image.rs`,
  `term/src/terminalstate/mod.rs`).
- Placement without pixel geometry must fail closed: WezTerm refuses
  placement when per-cell pixel dimensions are unknown (headless or
  multiplexer domains) and when the draw region is zero-sized, instead of
  dividing by zero (`wezterm@2afb836:term/src/terminalstate/image.rs`,
  issue `wezterm#6344`). The alternative fork is a fallback cell size, as
  in `par-term-emu-core`'s `cell_span` fallback parameters
  (`par-term-emu-core@59fce02:src/graphics/mod.rs`). Either way, pixel-size
  discovery (the Kitty specification's "Getting the window size" section:
  `TIOCGWINSZ`, `XTWINOPS`, `CSI t`) is a graphics prerequisite Bitty has
  not yet recorded.
- Scrollback retention is its own quota dimension: `par-term-emu-core`
  caps scrollback graphics (default 500), tracks per-graphic scroll offsets
  for partial rendering, and keys retained graphics by scrollback row
  (`par-term-emu-core@59fce02:src/graphics/mod.rs`).
- DPR and scaling land at render time: Ghostty's render placement is a grid
  pin plus pixel offsets with a source rectangle scaled by the renderer
  into a device-pixel destination
  (`ghostty@5252b193c:src/terminal/kitty/graphics_render.zig`).
- Unicode placeholders (`U+10EEEE` plus diacritic row/column/id bytes, id
  bytes in foreground color, placement id in underline color) create
  _virtual_ placements that cannot parent relative placements and do not
  survive horizontal scrolling or overlaps; relative placements live and
  die with their parent chain, and cycles plus dangling references must be
  rejected (Kitty specification). `par-term-emu-core` ships placeholder
  and animation helper modules plus virtual-placement prototypes, a useful
  shape reference for Bitty's own coverage
  (`par-term-emu-core@59fce02:src/graphics/`).
- The transient usage hint (`N=1`) lets terminals optimize caching for
  fire-and-forget images (Kitty specification, "Usage hints").
- Content-hash image deduplication ("avoid assigning a new id for repeated
  data", `wezterm@2afb836:term/src/terminalstate/image.rs`) is an
  unconsidered cache dimension for the shared image backend.
- WezTerm's third protocol family is iTerm2 inline images (`imgcat.md`,
  including a `doNotMoveCursor=1` extension), and its multiplexer
  explicitly does not fully forward inline images yet — multiplexed-image
  forwarding is an unrecorded edge for Bitty's multiplexer future.

### Transmission mediums and loader policy

The Kitty specification's transmission mediums (`t=d/f/t/s` with `S`/`O`
size/offset slicing) require following symlinks while permitting refusal
of sensitive files, plus a medium-query handshake for clients that cannot
know what they share with the terminal (Kitty specification, "The
transmission medium"). Implementations diverge on policy: Ghostty defaults
to direct-only loading and requires an explicit temporary-directory grant
before file or shared-memory mediums load
(`ghostty@5252b193c:src/terminal/kitty/graphics_storage.zig`,
`src/terminal/kitty/graphics_image.zig`), while WezTerm loads every
medium at the parser layer with no visible gate
(`wezterm@2afb836:wezterm-escape-parser/src/apc.rs`, `load_data`). Bitty's
deny-by-default `ResourcePolicy` (see the appendix) already converges with
the Ghostty end of this fork; the medium dimension itself (`t` triage,
`S`/`O` bounds, symlink and sensitivity policy) is unrecorded and belongs
in the loader contract. Two adjacent Ghostty mechanisms deserve a look
when Bitty designs storage: generation-guarded pending transmissions
against stale chunk bytes, and a zero-limit protocol kill-switch
(`graphics_storage.zig`).

### Quota and eviction dimensions

Beyond the accepted IMG ceilings, three reference points sharpen the
quota model: the Kitty specification asks for at least a few fullscreen
images with older-image eviction past a 320 MB per-buffer quota, and parks
animation frame data on disk under a separate five-times quota; Ghostty
implements the same 320 MB total with oldest-first eviction (unused
images first) plus a runtime-adjustable limit; WezTerm adds a 100 MB
per-image dimension cap with zero-size rejection; `par-term-emu-core`
defaults to 10k-pixel dimensions, 25 megapixels, 256 MB total, 1000 live
graphics, and 500 scrollback graphics
(`kitty@74b7ef892:docs/graphics-protocol.rst`;
`ghostty@5252b193c:src/terminal/kitty/graphics_storage.zig`;
`wezterm@2afb836:term/src/terminalstate/image.rs`;
`par-term-emu-core@59fce02:src/graphics/mod.rs`). Candidate direction:
per-image, per-buffer, scrollback, and animation-frame quotas with an
explicit eviction order, rather than a single ledger number.

### Color management and background-image layout

Three color-pipeline details are unrecorded: Ghostty's background-image
shader carries a linear-blending toggle, i.e. the sRGB-versus-linear
blend decision is an explicit pipeline switch
(`ghostty@5252b193c:src/renderer/shaders/glsl/bg_image.f.glsl`); Alacritty
selects an sRGB color space on macOS at window creation
(`alacritty@d692748:alacritty/src/display/window.rs`); Kitty accepts
`oklch()`/`lab()` anywhere a color is accepted
(`kitty@74b7ef892:docs/wide-gamut-colors.rst`) — input-syntax gamut, which
is adjacent to but distinct from this document's OKLCH palette-generation
pipeline. Kitty also notes that low window opacity wants a desktop-colored
background for best text rendering (subpixel-antialiasing interaction),
and WezTerm applies HSB multiplier transforms as a general appearance
operator (inactive panes, background image, foreground glyphs:
`inactive_pane_hsb`, `window_background_image_hsb`, `foreground_text_hsb`
in `wezterm@2afb836:docs/`), which generalizes Bitty's tint/dim effects.
Background-image layout itself is richer than "image plus tint": Kitty's
layout enum (`tiled`, `mirror-tiled`, `scaled`, `clamped`, `centered`,
aspect-preserving `cscaled`) plus a linear-interpolation toggle, a
gap-specific multiplicative tint for a separated window-gap look, and a
VRAM-resident multi-image playlist switched by remote control
(`kitty@74b7ef892:kitty/options/definition.py`); Ghostty repeats the
background texture in-shader in screen space (`bg_image.f.glsl`).

### Attribute-to-color interactions

Three small matrices Bitty has not recorded: WezTerm's
`bold_brightens_ansi_colors` tri-state (`No` / `BrightAndBold` /
`BrightOnly`) decouples palette brightening from bold-font selection
(`wezterm@2afb836:docs/config/lua/config/bold_brightens_ansi_colors.md`);
Kitty's `dim_opacity` (default 0.4) scales the DIM/FAINT attribute;
Kitty's selection colors admit `none` per channel, with both-`none`
meaning reverse video and foreground-`none` meaning keep the cell
foreground, all overridable by applications
(`kitty@74b7ef892:kitty/options/definition.py`).

### Contrast floor and degradation fallback

Accessibility and fallback are unrecorded. WezTerm offers a WCAG 2.0 AA
4.5:1 minimum contrast ratio that luminance-adjusts cell foregrounds
(with identical-foreground-background cells exempt as deliberate), plus a
contrast fallback for the reverse-video cursor and a readability note to
raise non-default background opacity under backdrop effects
(`wezterm@2afb836:docs/config/lua/config/` — `text_min_contrast_ratio.md`,
`reverse_video_cursor_min_contrast.md`, `window_background_opacity.md`).
Degradation has four faces across the survey: sub-1.0 opacity costs
render performance on every implementation (WezTerm documents it, Kitty
calls it possibly significant, and Kitty gates _dynamic_ opacity changes
behind a pre-enabled, default-off option); compositing and blur are
platform-gated (X11 needs a compositor, macOS drops the window shadow
below 1.0, blur lives only on macOS and blur-capable Wayland compositors,
with a radius-around-64 practical ceiling); DPI handling spans overrides,
fractional-scale rendering notes, and DPI-scaled `pt` decoration units
(`dpi.md`, decoration docs); and missing glyphs surface as user-visible
warnings while wide symbol glyphs get an overflow policy defaulting to
overflow-before-space
(`warn_about_missing_glyphs.md`,
`allow_square_glyphs_to_overflow_width.md`). Candidate direction: a
contrast floor, a performance-and-platform fallback matrix, and a
missing-glyph UX note belong in the appearance model before Bitty promises
transparency numbers it cannot keep on all platforms.

### Parser-pattern enrichment and the encoder-crate answer

The own-parser guidance above stands and gains detail. The interception
pattern is now triple-sourced: `par-term-emu-core` documents a streaming
byte-level pre-filter that intercepts only `ESC _ G`, passes all other
APC through to vte, survives arbitrary chunk splits, and accepts both ST
forms (`ESC \` and `0x9C`)
(`par-term-emu-core@59fce02:src/terminal/apc_filter.rs`); its control-key
parsers are typed per key (`from_char`/`from_code` in `src/graphics/
kitty.rs`), matching the `KittyImageTransmit` / `Placement` / `Delete` /
`Frame` / `FrameCompose` type inventory in WezTerm's escape parser, which
doubles as a field-coverage checklist for Bitty's command model
(`wezterm@2afb836:wezterm-escape-parser/src/apc.rs`). The
`kitty-graphics-protocol` receiver-side question (follow-up 3) is now
**answered first-hand**: v0.1.3 (`kitty-graphics-protocol@1f25646`) is a
sender-side builder plus serializer (`CommandBuilder`, `serialize`,
`serialize_chunked`) with terminal-size detection; its `Response::parse`
parses terminal _acknowledgements_, not incoming APC commands — there is
no `parse`, `decode_command`, or `KittyCommand::from_str`. Its fitting
role is therefore a `dev-dependency` test sender only, never a parser
dependency.

### Deliberately out of scope (surveyed, not folded)

- Font shaping engines, HarfBuzz feature flags, and font fallback cascades
  (WezTerm `font_shaper`/`harfbuzz_features`, `cosmic-text`): text-shaping
  ownership lives elsewhere; only the missing-glyph UX and decoration
  units above touch appearance.
- Kitty configuration layering (`auto_color_scheme` overrides, include
  directives) and WezTerm multiplexer image forwarding: config-system and
  multiplexer concerns, not the graphics/appearance model.
- Ghostty Kitty clipboard and drag-and-drop extensions: unrelated protocol
  surface.
- Sixel encoder specifics beyond the cursor/scroll semantics above: Sixel
  stays compatibility-only per the Kitty-primary rationale, unchanged.

## Appendix: current truth, verified read-only (2026-09-15)

Checked against the `bitty` checkout at `eef983e` without modifying it. This
is status evidence for this candidate only; owning contracts and test suites
remain authoritative.

- VT parser is vte-based: `crates/bitty-vt/Cargo.toml` pins `vte = "0.15"`.
  `crates/bitty-vt/src/parser.rs` pre-scans `APC` (`ESC _ ... ST`) before
  `vte` because vte 0.15 leaves `SOS`/`PM`/`APC` strings inert with no
  callback. The note's APC-interception question is therefore **answered for
  the current tree**: Bitty already intercepts APC outside `Perform`, matching
  the `par-term-emu-core-rust` pattern. Remaining follow-up (owner: bitty
  VT/parser track): full command-model coverage, not the interception
  mechanism itself.
- Kitty `APC G` intake exists: `crates/bitty-vt/src/kitty_apc.rs` (CTX-0256)
  parses the `G` control list (`f`, `s`, `v`, `a`, `c`, `r`, `m`),
  base64-unwraps with a fail-closed alphabet check, reassembles chunked `m=`
  streams under a 320 MB ledger cap mirroring `bitty-rich`, and rejects
  oversize raw claims before allocation. Unknown keys are ignored for
  forward compatibility. This is a transmit/display routing intake, not yet a
  full command model.
- Kitty image pipeline shape exists in `crates/bitty-rich/src/`: `kitty.rs`
  (`KittyGraphicsStub`: `ingest`, `begin_chunk`, `append_chunk`), plus
  `kitty_decode.rs`, `kitty_place.rs`, `image.rs` (`ImageStore` /
  `ImagePlacement` under the accepted IMG-1 through IMG-9 ceilings),
  `background.rs` (CTX-0347: `BackgroundStore` / `BackgroundRasterCache`;
  BG ceilings alias the image-store ceilings, which is partial in-tree
  evidence for the shared-backend direction), `loader.rs` (deny-by-default
  `ResourcePolicy`), and `scene.rs` (bounded scene limits). There is **no
  sixel module** in `bitty-rich/src`: Sixel is unimplemented, as the Rich
  Presentation RFC already records.
- Present path (per the Rich Presentation RFC evidence section, not
  re-verified here): decoded bitmaps composite topmost over the grid via CPU
  blend plus wgpu blit. Negative/positive z-ordering against glyphs is
  therefore direction, not current behavior.
- Dependency direction already in effect: `Cargo.lock` contains neither
  `termwiz` nor `kitty-graphics-protocol`, and no crate manifest references
  them. The own-parser guidance above ratifies the current tree; it does not
  ask for a removal.
- Cursor opacity/color, per-platform backdrop blur, `BackdropEffect`-style
  platform abstraction, `BackgroundChanged`/`ThemeChanged` events, and the
  matugen-style plugin are **not verified** in the checkout and stay pure
  direction.

## Follow-ups (not opened as tasks here)

1. APC full-command-model coverage (delete/query/animation/put actions,
   z-index, Unicode placeholders, scroll behavior): owner is the bitty
   VT/parser track; the interception mechanism itself is verified present.
2. `bitty-graphics-protocol` extraction as an owned small layer: needs its own
   scoped task; this document only records the direction.
3. `kitty-graphics-protocol` receiver-side API check before any
   dev-dependency use; sender-side test use only until then. **Answered by
   the CTX-0013 survey above**: v0.1.3 has no receiver-side parser, so the
   sender-side-only role stands.
4. Owning-RFC follow-ups already recorded in the Rich Presentation RFC (IMG-2
   side-cap wording, cursor-on-top, per-origin quotas, Sixel/iTerm2 adapters):
   untouched here, not duplicated as new items.
5. No new open question is admitted by this task: none of the above blocks the
   current milestone beyond already-tracked work.
