---
title: Input and Pointer Contract
description: Candidate contract for keyboard, mouse, wheel, gesture, IME, selection, and PTY input encoding with platform adapter ownership and hot-path exclusion
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: true
sidebar_order: 18
---

# Input and Pointer Contract

> Status: **draft** spec plus **Experimental Implementation** at
> `bitty` `c0aadd2` + `a8735d0` — candidate contract for review with
> experimental code evidence (not `Accepted`/`Verified`). This document proposes
> the Input and Pointer contract referenced by
> [OQ-004](../decisions/open-questions.md) (compatibility milestone) and
> [OQ-007](../decisions/open-questions.md) (terminal state) but does not close
> either question; accepted behavior remains the existing
> [Terminal State RFC](terminal-state-rfc.md),
> [Compatibility Milestone RFC](compatibility-milestone-rfc.md),
> [Platform tiers ADR](../decisions/adrs/ADR-0002-platform-support-tiers.md),
> [Plugin Platform RFC](plugin-platform-rfc.md), clipboard audit at
> `bitty` `7a4ee41` (CTX-0097), and
> [Performance Budget RFC](performance-budget-rfc.md). Experimental code
> at `c0aadd2` (CTX-0095 PR #148, Kitty `7727` opt-in, mouse
> `1000`/`1002`/`1003`/`1006` SGR + Shift override, focus `1004`, bracketed
> paste `2004`, IME overlay, wheel accumulation) plus `a8735d0` (CTX-0098 PR #151,
> `Runtime::write_replies` bounded `4`KiB, Kitty progressive `7727:1:2:5 -> 19`)
> is `Implemented` (experimental) not `Verified`/`Compatible` — it provides
> reviewable evidence for the draft spec but does not imply acceptance.
> Lifecycle is `Draft -> Experimental Implementation -> Accepted -> Verified`.
> Candidate sections below are explicitly marked **Candidate** and carry no
> compatibility promise until a reviewed acceptance decision records them.

## Purpose and scope

Bitty must translate physical keyboards, pointers, wheels, gestures, IME
composition, and selection actions into deterministic PTY bytes and
presentation state without leaking platform divergence into the core, without
exposing a hot path to Lua or plugins, and without weakening the P0 security
baseline. This RFC defines the candidate boundary between platform adapters,
the Rust input router, the keymap registry, the terminal encoder, and the
presentation layer for every input family the task requires.

In scope (all candidate unless stated otherwise):

- physical keyboard mapping, modifier semantics, application cursor/keypad
  modes, and Kitty keyboard protocol negotiation;
- mouse press/release/motion/wheel encoding, alternate-screen capture, Shift
  override, pixel-scroll accumulation, horizontal/inertial/edge auto-scroll,
  pinch/swipe mapping;
- IME composition and commit, selection/copy/paste, and the PTY boundary;
- observation/interception limits, bounded payloads, failure semantics,
  platform adapter ownership, and explicit exclusion from Lua/plugin hot paths.

Out of scope: concrete key-binding defaults (owned by configuration), exact
glyph hit-testing math (owned by renderer), per-plugin gesture policy (owned
by future UI plugin RFCs), and registry or LSP transport mechanics (whose
candidate sections already reference this contract as an input source).

Normative sources this RFC must not weaken:

- [Terminal State RFC](terminal-state-rfc.md): parser-to-action-to-state is
  the only write path into terminal state; damage and snapshot rules apply.
- [Compatibility Milestone RFC](compatibility-milestone-rfc.md): M1 mouse
  modes (1000/1002/1003/1006), focus (1004/1007), bracketed paste (2004),
  synchronized updates (2026), and Kitty keyboard as opt-in enhancement.
- [ADR 0002 Platform Support Tiers](../decisions/adrs/ADR-0002-platform-support-tiers.md):
  Tier 1 is Linux x86_64 (Wayland+X11), Windows x86_64 ConPTY, macOS ARM64
  13+; Tier 2 is Linux ARM64, macOS x86_64, FreeBSD x86_64.
- [Plugin Platform RFC](plugin-platform-rfc.md): event classes
  (observation/interception), queue budgets PerSubscription 64 /
  PerPlugin 1024 events/256 KiB / Global 8192 events/2 MiB, DropOldest v1
  default, `BoundedText`, and capability-checked host APIs.
- [Clipboard audit at 7a4ee41](../security/evidence-matrix.md) and
  [`docs/security/audits/clipboard-2026-09.md`](https://github.com/bitty-terminal/bitty/blob/7a4ee41/docs/security/audits/clipboard-2026-09.md)
  (CTX-0097, R-004 remains **Open**): OSC 52 read/write separate decisions,
  `CLIPBOARD_MAX_BYTES=8192` bounded paste, `23` suspicious-paste + `13`
  paste unit tests, and residual platform-backend/UX gaps.
- [Performance Budget RFC](performance-budget-rfc.md): PB-4 input latency
  ≤ 8 ms p50 / ≤ 15 ms p99 and the invariant that plugins do not enter the
  input hot path.
- [Security Overview](../security/overview.md),
  [Threat Model](../security/threat-model.md) (T-01, T-04, T-06, T-07, T-13),
  [Risk Register](../security/risk-register.md) (R-004, R-006, R-007, R-008),
  and [P0 Acceptance Criteria](../security/p0-acceptance-criteria.md)
  (P0-AC-007/008, P0-AC-011/012).

## Terminology

| Term            | Candidate meaning                                                                |
| --------------- | -------------------------------------------------------------------------------- |
| Physical key    | Hardware scancode/position, independent of layout.                               |
| Logical key     | Layout-resolved symbol after modifier and IME composition.                       |
| Keymap registry | Central `Command -> binding` table owned by Rust; plugins suggest bindings only. |
| Encoder         | Pure function `KeyEvent + Mode -> bounded PTY bytes`.                            |
| Mouse mode      | DEC private modes 1000/1002/1003 + 1006 SGR (M1 required).                       |
| Capture         | Alternate-screen application has requested mouse reporting.                      |
| Shift override  | Holding Shift bypasses capture to force selection.                               |
| IME preedit     | In-progress composition string not yet committed to PTY.                         |
| Selection       | Presentation-layer range over grid cells; not terminal state.                    |

## Principles (candidate)

1. Platform divergence is absorbed at the adapter edge. Core sees one typed
   `InputEvent` family; no `winit` or OS type leaks beyond `bitty-platform`.
2. The hot path is Core-owned and synchronous: `Platform -> Router -> Keymap ->
Encoder -> PTY` with no Lua await, no promise, and no plugin callback.
3. Plugins observe committed effects, never raw per-keystroke veto. Interception
   is limited to the four cold-path points already accepted in the Plugin
   Platform RFC.
4. Every payload is bounded before allocation. An oversized or malformed input
   is truncated or dropped with telemetry, never expanded.
5. Failure is fail-closed and deterministic across platforms for the same
   mode state. Fallback is legacy encoding, never silent loss of input.

## Pipeline overview (candidate)

```text
Platform adapter (winit/Win32) -> bitty-platform InputEvent (bounded)
        |                                 |
        v                                 v
Rust input router (focus, View, mode) -> keymap registry
        |                      |                |
        |                      +-> Command dispatch (cold path)
        v
 Terminal encoder (cursor/keypad/mouse/Kitty) -> bounded bytes -> PTY
        |
        +-> selection/IME/presentation (View layer) -> snapshot -> renderer
        |
        +-> cold-path event queue -> plugin host (bounded, DropOldest)
```

The only write into the PTY is the encoder output. Selection, IME preedit,
and gesture-derived commands are presentation state; they reach the PTY only
through an explicit encoder or command path.

## Physical keyboard mapping (candidate)

- **Source of truth**: `winit` `PhysicalKey`/`KeyCode` (or Win32 scancode) is
  the physical identity. `LogicalKey` after layout is the presentation label;
  the encoder consumes physical + modifier + mode, not the glyph.
- **Layout isolation**: Core never assumes US QWERTY. Adapter reports both
  physical `scancode` and `logical` plus `text` (if any). `text` is bounded
  (`<= 32` chars per event, one grapheme cluster nominal) and treated as
  untrusted display data.
- **Dead keys and compose**: Dead-key state is adapter-owned. A dead key with
  no committed `text` produces no encoder output; the composition is IME-owned
  until commit.
- **Key repeat**: Repeat is adapter-flagged (`repeat: bool`). The router may
  coalesce repeats for command dispatch but the encoder preserves the repeat
  count up to a bound (`<= 64` repeats per batch) to avoid unbounded PTY
  floods.
- **Tier coverage**: Tier 1 adapters must map physical keys for Wayland, X11,
  Win32, and macOS. Tier 2 (Linux ARM64, macOS x86_64, FreeBSD x86_64) inherits
  the same mapping with the stated CI guarantee; Tier 3 is community.

## Modifiers (candidate)

| Modifier           | Semantics                                                                  |
| ------------------ | -------------------------------------------------------------------------- |
| Shift              | Adjusts `text` and selection; encoder maps `Shift+Arrow` per mode.         |
| Control            | Translates to C0 (`Ctrl+A -> 0x01`) unless Kitty disambiguation is active. |
| Alt/Meta           | `Alt` as `ESC` prefix in legacy mode, as distinct modifier in Kitty mode.  |
| Super/Meta (GUI)   | Never encoded to PTY; reserved for command dispatch only.                  |
| CapsLock / NumLock | Observed as state bits; not encoded except via resulting `text`.           |

- Left vs right is normalized to a single `mods` bitmask for encoder
  compatibility; side-specific binding is deferred (future `ConfigPlan` knob).
- Modifier state is sampled per `InputEvent`, not globally. Stale modifier
  bits from a lost `KeyUp` expire on focus loss.
- Bounded: modifier mask is `u8`; no chord exceeds `4` simultaneous modifiers
  after normalization.

## Default Mod and chord consumption (candidate)

- **Default Mod**: `Alt` is the candidate default Mod prefix entering
  Bitty's own command namespace (`Alt+H/J/K/L` focus, `Alt+1..9`
  workspaces), because it reads as a window-manager modifier and collides
  less with the terminal-critical `Ctrl+C/D/Z/L` family than `Ctrl` would.
  The default is a configuration value, not a hardcoded constant.
- **Only registered chords are consumed**: Bitty consumes exactly the `Alt`
  chords bound in the keymap registry; every unregistered `Alt` chord
  continues to the terminal input encoder (legacy `ESC`-prefix Meta
  handling or Kitty distinct-modifier encoding). A global `Alt` capture
  would break shell readline, Emacs bindings, and TUI Meta usage and is
  explicitly rejected.
- **Normal versus terminal layering**: plain keys go to the terminal, `Mod`
  chords go to Bitty dispatch, and application-specific sequences (Neovim
  leader, tmux prefix, shell bindings) stay inside the terminal. This keeps
  three keyboard layers disjoint.

## Key dispatch priority (candidate)

```text
keypress
   |
   v
Bitty Binding Resolver -- matched? -- yes --> command dispatch
   |
   no
   v
Terminal Input Encoder --> PTY
```

Candidate precedence inside the resolver:

1. Emergency and reserved Bitty bindings.
2. Active overlay or modal capture.
3. User-defined Bitty bindings.
4. Plugin-suggested bindings.
5. Terminal encoding (the fallthrough above).

The boundary must stay deterministic: Core, plugins, and the terminal never
ambiguously compete for one keypress. Plugin bindings remain suggestions
under the accepted precedence (explicit user mapping wins) from the
[Plugin Platform RFC](plugin-platform-rfc.md); this section only adds the
emergency, overlay, and terminal-fallthrough ordering around it.

## Mod plus Leader and discoverability (candidate)

- **Leader sequences**: besides immediate `Mod` chords for high-frequency
  actions, a Leader entry (for example `Alt+Space`) opens a Bitty command
  sequence namespace (`w` workspace, `p` panel, `a` AI, `g` git, `?` help),
  in the spirit of tmux prefix and Neovim leader. This avoids shortcut
  namespace explosion as plugin count grows.
- **Which-key help**: after the Leader prefix, a floating overlay lists the
  available next keys and narrows per keystroke, so the Help panel doubles
  as a which-key menu. Dismissal is `Esc` or the same shortcut; the overlay
  is presentation-only under the overlay rules of the
  [Panel Runtime pre-study](panel-runtime-pre-study.md).
- **Flash-style jump**: a binding labels every panel with a jump key for
  one-keystroke focus, optionally extended to a panel-action mode (toggle
  floating, close, fullscreen per label). This composes with the Leader and
  which-key layers into one keyboard language.
- **Registry-driven discovery**: with many plugins no user can memorize
  every shortcut, so every plugin command registers once with id, title,
  and category and Bitty derives help content, command-palette search,
  shortcut-conflict diagnostics, and Leader menus from that single
  registry. The registry itself is owned by the
  [Plugin Platform RFC](plugin-platform-rfc.md); this section only states
  the input-side consumption requirement.

## Shipped keymap dispatch and help overlay (implementation evidence)

Status: **experimental review evidence only.** This subsection records what
merged into `bitty` `origin/main`; it does not accept the candidate sections
above, does not close OQ-004/OQ-007, and does not promote this RFC beyond
`draft`. The candidate Leader-sequence namespace, flash-style jump, and
registry-driven plugin discovery remain unimplemented candidates.

1. **Keymap registry with a configurable Mod slot** (`bitty` #411 `2a5e451`,
   CTX-0236; extended through `bitty` #433/#435/#437/#439/#455/#457/#461).
   `mod_key` is a scalar (`"alt"` default, `"super"` opt-in, `ctrl`/`shift`
   fail closed) and the 79-entry shipped set is rendered against it, so a
   mod flip rebinds every `alt`-bearing default while `ctrl`-fixed chords
   pass through. Explicit user entries overlay by `context + chord` identity.
   Chords, actions, and contexts fail closed; single-character keys require a
   modifier; named keys (`tab`, `enter`, `escape`, `space`, `backspace`,
   `delete`/`del`, `insert`/`ins`, `home`/`hm`, `end`, `pageup`/`pgup`/`pu`,
   `pagedown`/`pgdn`/`pd`, arrows, `f1..f35`) are bindable. This realizes the
   candidate "only registered chords are consumed" rule: a matched chord is
   consumed by its action and never reaches the PTY, while unbound keys reach
   the terminal input encoder.
2. **Explicit dispatch priority** (`bitty` #451 `49bfe9f`, CTX-0275):
   `Emergency` (reserved `Esc` cancel, overrides user remaps while a modal
   pends) > `Modal` (active modal captures non-confirm chrome chords) >
   `User` (the resolved keymap table) > `Plugin` (slot reserved, inert and
   deny-by-default) > `Terminal` (encoding fall-through, unchanged). This
   instantiates the candidate precedence for the emergency, overlay/modal,
   and terminal-fallthrough layers; the plugin-suggested layer is not live.
3. **Workspace chords and close discipline** (`bitty` #433 `227ca3a`,
   CTX-0257, DEC-0034; move in `bitty` #457 `8b987a0`, CTX-0259):
   `alt+n`/`alt+1..9`/`alt+-`/`alt+=`/`alt+tab`/`alt+w` plus
   `shift+alt+1..9` move the focused window. A live workspace close never
   kills silently: the first chord arms a pending confirm (loud summary plus
   overlay banner), repeating the chord confirms, `Esc` cancels, and idle
   workspaces close immediately. Workspace semantics are owned by the
   [Workspace Compositor Specification](workspace-compositor.md) evidence
   section; this document only records the input-side consumption.
4. **Registry-generated help overlay** (`bitty` #461 `c8faa52`, CTX-0265):
   `toggle_help` (backtick chord plus the `alt+?` shifted-symbol spellings)
   paints a floating overlay listing every bound shortcut, regenerated from
   the live keymap registry on every show; `Esc` dismisses and consumes. The
   overlay is informational, not modal — other bound chords still dispatch
   and unbound keys still reach the shell. This is the shipped which-key-style
   help surface; it is **not** the candidate Leader-prefix namespace.

Evidence: `crates/bitty-config/src/keymap.rs`, `crates/bitty-app/src/chrome_keys.rs`,
and `crates/bitty-runtime/src/runtime/help.rs` on `bitty` `origin/main`
read-only at `1f31435`; the shipped defaults are also recorded in the
[Configuration Model RFC](configuration-model-rfc.md) snapshot and the
[Lua and XDG configuration](../configuration/lua-and-xdg.md) reference. All
status remains `Implemented` (experimental), not `Verified`/`Compatible`.

## Application cursor and keypad modes (candidate)

- `DECCKM` (cursor keys) and `DECKPAM`/`DECKPNM` (keypad) are terminal modes
  owned by terminal state. The router reads their current value per View to
  select the encoder table.
- Cursor keys encode as `SS3`/`CSI` per `DECCKM`; keypad keys encode as
  application sequences when `DECKPAM` is set, as digits/operators otherwise.
- Mode changes take effect on the next `InputEvent`; no queued key is
  reinterpreted retroactively.
- Negotiation: an application enables modes via `DECSET`; Bitty never enables
  them unilaterally. Tests prove legacy fallback when modes are off.

## Kitty keyboard protocol (candidate, opt-in enhancement)

Reconciled with the Compatibility Milestone RFC where Kitty is **opt-in
enhancement**, not M1-required, and with the Terminal State RFC bounded-parser
rules.

- **Negotiation**: `CSI ? 7727 h/l` progressive flags. Flags are a bitmask
  (`u32`) bounded to defined bits; unknown bits are ignored with telemetry.
- **Encoding**: `CSI unicode:mods:event-type ; text` (`CSI u`) per the Kitty
  spec. `event-type` distinguishes press/repeat/release; release is delivered
  only when the flag requests it.
- **Disambiguation**: When Kitty is active, `Ctrl+I` vs `Tab` and
  `Ctrl+M` vs `Enter` are distinct. Legacy `modifyOtherKeys` level-1
  compatibility is preserved when Kitty is off.
- **Fallback**: If the application did not request Kitty, the encoder uses
  legacy xterm encoding. Every Kitty frame has a legacy equivalent or is
  dropped with a bounded counter, never silently misrouted.
- **Bounds**: One key produces at most `64` bytes of `CSI u`; a batch of
  `32` simultaneous keys is the queue cap; excess is dropped DropOldest-style
  with a telemetry increment.
- **Security**: Kitty frames are PTY-bound data, not capability grants. An
  application cannot use Kitty input to bypass the Host API.

## Mouse press, release, motion, and wheel encoding (candidate)

M1-required subset remains X10/SGR (1000/1002/1003/1006). This candidate
extends it with the full pointer contract:

| Mode              | Candidate behavior                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1000 Normal       | Press and release only.                                                                                          |
| 1002 Button-event | Press, release, and drag motion while a button is held.                                                          |
| 1003 Any-event    | All motion, including hover. Highest cost; must be explicitly requested.                                         |
| 1006 SGR          | Extended coordinates `ESC[<b;x;yM/m` (press `M`, release `m`). Accepted as the only coordinate extension for M1. |

- **Coordinate mapping**: Cell coordinates are `(col+1, row+1)` per SGR. Pixel
  coordinates from the platform are converted via current cell size; the
  result is clamped to `[1, 65535]` and then to the View grid. A coordinate
  outside the grid is clamped, not dropped, with a `clamped` flag for
  telemetry.
- **Button mapping**: Left/Middle/Right, plus `Button8+` as bounded
  additional buttons (`<= 8` total). Wheel is not a button; see scroll.
- **Motion coalescing**: Consecutive motion events within one frame are
  coalesced to the latest position. At most `128` mouse events per frame are
  queued; excess is coalesced, not allocated.
- **Bounded bytes**: One mouse event encodes to `<= 32` bytes. A batch encodes
  to `<= 4 KiB`; beyond that the tail is dropped and the application sees
  discontinuous motion, which is acceptable per the spec.

## Alternate-screen mouse capture (candidate)

- When the active terminal is in alternate screen and has enabled a mouse
  mode, mouse events are considered **captured**: they encode to PTY and do
  not create a selection by default.
- Capture is per-View, not global. Switching the active View releases capture
  for the unfocused View; the newly focused View re-evaluates capture on the
  next event.
- On alternate-screen exit (`rMC`), capture ends immediately. Queued
  captured events already encoded remain in the PTY buffer; queued but not
  yet encoded events are re-evaluated as uncaptured.
- Damage from mouse reporting does not affect the alternate-screen snapshot;
  only the presentation layer tracks hover state for the cursor shape.

## Shift override (candidate)

- Holding `Shift` while dragging or clicking **bypasses capture** even when a
  mouse mode is active, allowing selection and copy in TUI applications
  without disabling the application's mouse.
- Implementation: `Shift` is sampled per mouse event. If `Shift` is down, the
  router routes the event to the selection path, not to the encoder, regardless
  of capture state.
- The override is unconditional and cannot be disabled by the application.
  It is also the accessibility path for users who cannot toggle mouse mode.

## Pixel-scroll accumulation (candidate)

High-resolution wheels and touchpad two-finger scroll report pixel deltas, not
line counts.

- Each `ScrollDelta::Pixel { x, y }` from `winit` accumulates per View in a
  `f32` accumulator. One logical line is `cell_height` pixels.
- When `|accum_y| >= cell_height`, `floor(accum_y / cell_height)` lines are
  emitted as wheel events (`SGR` button `64/65` with modifiers) or as
  presentation scroll if no mouse mode is active. The remainder stays in the
  accumulator.
- Accumulator is bounded: `|accum| <= 4 * cell_height`; larger bursts are
  clamped to avoid unbounded drift from a spinning wheel.
- Horizontal accumulation is symmetric (`cell_width` threshold) and maps to
  horizontal scroll or `CSI` device-specific sequences when no application
  mapping exists; see below.

## Horizontal, inertial, and edge auto-scroll (candidate)

### Horizontal scroll

- Horizontal pixel accumulation maps to `Shift+Wheel` compat encoding when the
  application expects it, otherwise to presentation-layer horizontal scroll of
  the viewport or to a bounded `CSI` private sequence declared by the mode
  table. No horizontal scroll mutates terminal state directly.

### Inertial scroll

- When the platform reports `ScrollDelta::Pixel` with `phase == Inertia`,
  the candidate applies a decay: each frame multiplies the residual velocity
  by `0.92` (tunable, documented as candidate) and emits lines until
  `|velocity| < 0.5 * cell_height` or `200 ms` elapses.
- Inertial events are coalesced identically to wheel events and never produce
  more than `32` lines per frame.

### Edge auto-scroll

- During a selection drag, if the pointer is within `16 px` of a View edge
  for `>= 80 ms`, the candidate auto-scrolls the viewport at
  `1` line per `50 ms`, accelerating to `4` lines per `50 ms` after `400 ms`
  of continuous edge hold.
- Auto-scroll is presentation-only (viewport + selection range update), not
  PTY input. It stops immediately on button release or pointer leaving the
  edge band. The rate is bounded and attributable per View.

## Pinch and swipe gestures (candidate)

- Pinch (`winit` `TouchPhase` + `ScaleFactor` delta) and swipe
  (three-finger horizontal) are **not PTY input**. The candidate maps them to
  commands: pinch to font-size step (`+/- 0.5 pt` per `0.15` scale delta,
  capped at `+/- 4 pt` per gesture) and swipe to workspace/window navigation
  when a corresponding command exists.
- If no command is bound, the gesture is ignored with telemetry. Gestures
  never generate unbounded byte streams and never enter the parser.
- Each gesture frame contributes at most one command invocation; a gesture
  burst is coalesced to `<= 4` commands per `100 ms`.

## IME composition and commit (candidate)

- Platform IME state is adapter-owned. The presentation layer shows **preedit**
  as an inline overlay at the cursor (bounded `<= 128` chars, one grapheme
  cluster per preedit span) and does not write preedit into terminal state
  or PTY.
- `IME::Commit(text)` is the only path that reaches the encoder. Commit
  text is bounded (`<= 256` chars / `<= 1024` bytes UTF-8 per commit) and
  then encoded via the active keyboard mode (bracketed paste not applied;
  see paste handling).
- `IME::Enabled/disabled` is per-View. Focus change commits or cancels
  preedit deterministically; a cancelled preedit produces no PTY bytes.
- Interaction with Kitty: a commit while Kitty is active is encoded as
  individual `CSI u` frames for each codepoint when the Kitty text flag is
  set, otherwise as UTF-8 bytes. The choice is mode-driven, not heuristic.

## Selection, copy, and paste (candidate)

### Selection model

- Selection is View-owned, not terminal-state-owned, and has three modes:
  `CellRange` (stream), `Word`, `Line`, and `Block` (rectangular). Mode is
  chosen by click count (1/2/3) and modifier (`Alt` for block).
- Ranges are stored as `(anchor, head)` cell coordinates plus a
  `scrollback line id` for stability across scroll. Resize reclamps the
  range; scrollback pruning truncates it.
- Selection is `CopyOnSelect` only when the user enables it; the candidate
  default is explicit copy.

### Copy

- Copy produces `clipboard.write` via the platform primitive. The write is
  gated by the capability model when invoked from a plugin, but direct user
  copy (key binding or menu) is a trusted user gesture and does not require
  a plugin capability. Content copied is exactly the selected text, bounded
  by `CLIPBOARD_MAX_BYTES=8192` with char-boundary truncation (same bound as
  paste). Oversized selection is truncated with a `truncated` flag.

### Paste and reconciliation with R-004

- Paste is the R-004 boundary. This RFC adopts the 7a4ee41 candidate
  verbatim and reconciles it:
  - Bracketed paste `ESC[200~ ... ESC[201~` (mode 2004) remains **defense in
    depth only**, not a security boundary.
  - Every paste passes `inspect_paste` (C0 excluding Tab/NUL/ESC/CR/LF/C1
    `U+0080..U+009F`/BiDi/zero-width) with the `23` suspicious-paste plus
    `13` paste unit tests as evidence shape.
  - `PendingPaste` with user confirmation is required for suspicious paste;
    `request_paste` truncates at `CLIPBOARD_MAX_BYTES=8192` before inspection
    with UTF-8 char-boundary safety.
  - OSC 52 read remains deny-by-default; write is gated. No change to the
    R-004 **Open** residual (platform backends `arboard` X11/Wayland/
    macOS/Windows, real-window UX, `8192` post-acquisition bound scope)
    documented in the evidence matrix and audit.
- Paste encoding: a confirmed paste emits `ESC[200~ + text + ESC[201~` when
  bracketed paste is active, otherwise raw text plus `inspect_paste` gating.
  Paste bytes are bounded (`<= 8192 + 12` framing).

## PTY boundary (candidate)

- The encoder is pure and infallible: `encode(event, mode) -> BoundedBytes`
  with `<= 64` bytes per key, `<= 32` per mouse, `<= 1024` per IME commit,
  `<= 8204` per paste. A batch of events encodes to `<= 8 KiB` per frame;
  excess is dropped with telemetry.
- Focus reporting (`1004`) emits `ESC[I` / `ESC[O` on focus change when
  enabled; synchronization (`2026`) wraps output batches but does not affect
  input.
- Replies from the terminal (e.g., `DA`, `DSR`, OSC query answers) never
  loop back through the input encoder; they travel the `Terminal -> PTY`
  reply path owned by terminal state.
- Backpressure: if the PTY write buffer is full, encoder output is queued
  bounded (`<= 16 KiB` per terminal). Further input is dropped
  (key/mouse/IME/paste each counted) rather than blocking the UI thread.

## Observation and interception limits (candidate, reconciled)

Reconciled with the Plugin Platform RFC three-level queue and four interception
points, and with the invariant that plugins do not enter the hot path.

- **Observation** (read-only, after state update) candidates:
  `focus.changed`, `selection.changed`, `terminal.bell`,
  `terminal.title-changed`, `terminal.cwd-changed`. Delivered via the
  cold-path queue with budgets PerSubscription `64` / PerPlugin `1024`
  events/`256 KiB` / Global `8192` events/`2 MiB` and `DropOldest`.
- **Interception** (cold-path veto before host acts) is limited to the
  accepted four v1 points: `command.execute`, `terminal.create`,
  `paste`, `url.open`. This RFC adds no new interception point; a future
  `input.pre-encode` hook is explicitly **not** accepted — plugins may not
  veto or rewrite per-keystroke input.
- A plugin that needs input must register a **command** binding, not an
  input sniffer. The command dispatch path is attributable, capability-checked,
  and rate-limited, unlike a raw key tap.
- Every observation event carries a `generation` and is `BoundedText`-
  checked; oversized payloads are truncated or dropped at the Host admission
  gate.

## Bounded payloads (candidate)

| Payload                      | Candidate bound             | Enforcement                             |
| ---------------------------- | --------------------------- | --------------------------------------- |
| Single key encode            | `64` bytes                  | `BoundedBytes` truncation + counter     |
| Mouse encode                 | `32` bytes                  | same                                    |
| IME commit                   | `256` chars / `1024` bytes  | commit truncation before encode         |
| Paste (confirmed)            | `8192` bytes + `12` framing | `CLIPBOARD_MAX_BYTES` before inspection |
| Preedit overlay              | `128` chars                 | presentation truncation                 |
| Accumulated scroll per frame | `32` lines                  | coalesce + drop                         |
| Gesture commands per burst   | `4` per `100 ms`            | coalesce                                |
| PTY write queue per terminal | `16 KiB`                    | drop with telemetry                     |
| Encoder batch per frame      | `8 KiB`                     | drop tail                               |
| `winit` text per event       | `32` chars                  | adapter truncation                      |

All bounds are `const` and documented as candidate tunables; changing a bound
requires a reviewed diff, not a silent constant bump. Bounds are checked at
the producing edge (adapter, router, encoder, Host admission), not lazily at
the consumer.

## Failure semantics (candidate)

| Failure                                      | Candidate behavior                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| Unknown scancode / keysym                    | Drop with `unknown_key` counter; no PTY output.                           |
| Truncated Kitty frame                        | Drop frame, emit telemetry, fall back to legacy for next key.             |
| Mouse outside grid after clamp               | Clamp to edge; encode clamped coordinate with `clamped` telemetry.        |
| Wheel accumulator overflow                   | Clamp `accum` to `4 * cell_size`; emit what fits.                         |
| IME preedit overflow                         | Truncate preedit to `128` chars; commit remains bounded.                  |
| Paste oversize                               | Truncate to `8192` before inspection; mark `truncated`.                   |
| PTY backpressure                             | Drop new input, increment `pty.backpressure_drops`, surface in DevTools.  |
| Platform adapter error (`winit` `BadWindow`) | Isolate View; other Views unaffected; log once.                           |
| Focus lost mid-drag/IME                      | Cancel drag (no selection commit) or commit/cancel IME deterministically. |

All failures are fail-closed: no fallback writes raw bytes that bypass the
encoder, and no failure grants a capability or mode the user did not request.

## Platform adapter ownership (candidate)

| Adapter concern                                                                      | Owned by                                        | Not owned by                |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- | --------------------------- |
| `winit` event loop, `PhysicalKey`/`LogicalKey`, `ScrollDelta`, `Touch`, `Ime` events | `bitty-platform` (narrow `winit` wrapper)       | Core, renderer, plugin host |
| Wayland vs X11 IME and scale-factor quirks                                           | `bitty-platform` with per-backend shims         | `bitty-term-state`          |
| Win32 ConPTY input pipe, DPI, surrogate handling                                     | `bitty-platform` (Windows module)               | PTY helpers                 |
| macOS title-bar, `Cmd` vs `Ctrl`, `Option` dead-key behavior                         | `bitty-platform` (macOS module)                 | keymap registry             |
| Clipboard primitive (`get_text`/`set_text`/`clear`)                                  | `bitty-platform` `clipboard.rs`                 | encoder, paste inspector    |
| DPI and cell-size for pixel conversion                                               | `bitty-platform` + `bitty-render` shared metric | input router                |

- `bitty-platform` exposes only `InputEvent` (bounded, `Copy`-friendly where
  possible) and `PlatformCaps` to the router. No `winit::Window` or
  `WindowId` leaks beyond the adapter.
- Wayland/X11 divergence (e.g., `ScrollDelta` line vs pixel, `Ime` preedit
  placement) is normalized at the adapter edge with a documented
  per-platform table and a bounded test matrix per ADR 0002 Tier 1.
- `unsafe` is confined to the adapter's FFI boundary with `SAFETY` comments
  and `cargo clippy` gates; the adapter never executes plugin code.

## Exclusion from Lua and plugin hot paths (candidate, reconciled)

Reconciled with the Security Overview invariants 3/4 and the Isolation RFC
PerPlugin VM, budgets, and queue budgets:

- **No hot-path callback**: the encoder runs on the UI thread with no
  `await`, no Lua call, and no channel send. Plugins are not consulted
  per keystroke or per mouse move.
- **Command-bound input**: a plugin that wants `Ctrl+K` registers
  `plugin-id:command` and suggests a binding; the Rust keymap registry owns
  precedence (product, extension, user) and dispatch. The plugin receives a
  command invocation, not a raw key event.
- **Queue isolation**: if a plugin's observation queue is full, the plugin
  is back-pressured (`DropOldest` per Plugin Platform RFC, accepted) but the
  hot path continues at PB-4 latency. No plugin can starve input.
- **Capability gate**: clipboard read/write, `terminal.input.*`, and
  `ui.protocol-register` remain capability-checked; input encoding itself is
  not a capability because it is a trusted user gesture, but writing to the
  PTY on behalf of another terminal requires `terminal.input.all`.
- **Generation isolation**: each plugin VM is per-plugin, per-generation;
  reload cancels the old generation's bindings and timers before the new
  generation registers. No stale binding survives a generation cut.

## Performance considerations (candidate, reconciled with PB-4)

- PB-4 (≤ 8 ms p50 / ≤ 15 ms p99 key-to-screen) is achievable only if the
  hot path stays allocation-free in the steady state. Candidate budget:
  `<= 1` small allocation per key (for the bounded byte buffer) and zero
  allocations for mouse motion coalescing.
- The encoder is a table lookup plus `memcpy`; no regex, no UTF-8 validation
  beyond the adapter's already bounded check, no async.
- `bitty-platform` must batch `winit` events per frame (one `InputEvent`
  batch per `WindowEvent` drain) to keep the router at `O(batch)` not
  `O(1)` per OS callback.
- Telemetry counters (`unknown_key`, `pty.backpressure_drops`, `clamped`,
  `truncated`) are `AtomicU64` and do not allocate.

## Security considerations (candidate)

| Concern              | Candidate control                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| T-01 parser wedge    | Bounds on CSI `u`, SGR, and paste framing; encoder output is already bounded PTY bytes that the parser will re-validate. |
| T-04 clipboard/paste | Adopt R-004 7a4ee41 controls verbatim; Shift override does not bypass `inspect_paste`.                                   |
| T-06 plugin escape   | No raw input capability; per-plugin VM, restricted stdlib (`io`/`os`/`debug` deny) per ADR 0005.                         |
| T-07 starvation      | No hot-path Lua; queue DropOldest; per-plugin CPU `50 ms` wall / `8 ms` warn and `32 MiB` memory budgets inherited.      |
| T-13 Terminal Truth  | Selection/preedit/gesture are presentation-only; only encoder bytes mutate terminal via PTY.                             |

All controls are candidate until the implementation tasks deliver focused
tests, fuzz corpora, and independent security-auditor review per
[P0-AC-007/008/011/012](../security/p0-acceptance-criteria.md) and the
[Risk Evidence RFC](../specifications/risk-evidence-rfc.md).

## Reconciliation with accepted contracts

| Accepted contract                    | How this candidate reconciles                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Terminal State RFC (OQ-007)          | Honors Action-only write path; mouse/keyboard never mutate grid directly; damage stays state-owned.                                  |
| Compatibility Milestone RFC (OQ-004) | Preserves M1 mouse 1000/1002/1003/1006 SGR, focus 1004/1007, bracketed paste 2004, Kitty as opt-in; adds only compatible extensions. |
| ADR 0002 Platform tiers              | Assigns every adapter nuance to `bitty-platform`; Tier 1 coverage is the test matrix; Tier 2 is nightly.                             |
| Plugin Platform RFC (OQ-011/012/013) | Inherits observation/interception classes and three-level queue DropOldest; adds no new interception point or hot-path event.        |
| Clipboard R-004 at 7a4ee41           | Adopts `CLIPBOARD_MAX_BYTES`, `inspect_paste`, `PendingPaste`, and Open residuals verbatim; does not claim to close R-004.           |
| Performance Budget RFC PB-4          | Keeps hot path allocation-free and plugin-free; budgets and coalescing are sized to preserve 8 ms p50.                               |

No candidate in this document relaxes a P0 control, widens a trust boundary,
or moves an accepted owner.

## Alternatives considered

| Alternative                                                    | Trade-off                                                                                                      | Verdict                                               |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Raw per-keystroke plugin hook (`input.pre-encode`)             | Gives plugins maximal control but puts Lua on the hot path, violates invariant 4, and makes PB-4 unachievable. | Rejected; command-bound dispatch is sufficient.       |
| Application-only mouse capture with no Shift override          | Simpler router but traps users in TUIs with no selection path.                                                 | Rejected; Shift override is the accessibility escape. |
| Pixel-exact PTY wheel (every `ScrollDelta::Pixel` as one line) | Faithful to device but floods PTY and breaks TUI expectations.                                                 | Rejected; accumulation to cell lines is required.     |
| IME preedit written into terminal grid                         | Visible preedit without overlay but corrupts Terminal Truth and breaks replay.                                 | Rejected; overlay-only preedit.                       |
| Unbounded paste through PTY                                    | Simple but violates R-004 and enables T-04 exfiltration.                                                       | Rejected; 8192 bound + inspection.                    |

## Candidate versus accepted

| Area                      | Accepted                                     | Candidate (this RFC)                                          |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Terminal state write path | Parser -> Action -> State only               | Input never writes state directly; only encoder bytes via PTY |
| Mouse modes               | 1000/1002/1003/1006 SGR required             | Capture, Shift override, coordinate clamping, coalescing      |
| Keyboard                  | Legacy xterm + modifyOtherKeys L1            | Kitty CSI u as opt-in, four-flag negotiation, fallback        |
| Bracketed paste           | Mode 2004, defense-in-depth                  | Adopt 7a4ee41 PendingPaste + inspect + 8192 bound             |
| Plugin events             | 3 classes, 4 interception points, DropOldest | No new interception point; input stays observation-only       |
| Platform ownership        | winit behind bitty-platform                  | Full InputEvent normalization table                           |
| Performance               | PB-4 p50/p99                                 | Allocation-free hot path, per-frame coalescing budgets        |

Every row marked Candidate requires a future reviewed acceptance step before
any implementation may claim it as stable.

## Verification plan (candidate)

| Evidence                      | Method                                                  | Pass threshold                                                                        |
| ----------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Physical key mapping          | Unit + Tier 1 platform matrix (Wayland/X11/Win32/macOS) | Every physical key maps or is counted as `unknown_key`; no panic on unknown scancode. |
| Modifier and DECCKM/DECKPAM   | Integration (mode on/off matrix)                        | Encoder output matches xterm/kitty oracle; mode flip takes effect on next event.      |
| Kitty protocol                | Differential corpus + fuzz (CSI u)                      | All flag combinations bounded; legacy fallback proven; fuzz zero crashes.             |
| Mouse SGR 1000/1002/1003/1006 | Integration (golden PTY bytes per mode)                 | Coordinates clamped and bounded; motion coalesced; SGR only.                          |
| Shift override + alt-screen   | Integration (capture on/off × Shift)                    | Shift always forces selection; exit alt-screen releases capture.                      |
| Pixel accumulation            | Unit (fractional thresholds)                            | Accumulator clamps at `4 * cell_size`; remainder preserved.                           |
| Inertial/edge auto-scroll     | Unit + manual audit                                     | Inertial decays within `200 ms`; edge scroll bounded and cancellable.                 |
| Pinch/swipe                   | Unit                                                    | At most `4` commands per `100 ms`; no PTY bytes.                                      |
| IME preedit/commit            | Platform matrix + unit (bounds)                         | Preedit `<= 128`, commit `<= 256/1024`; focus loss commits/cancels deterministically. |
| Selection/copy/paste          | Adversarial + integration (C0/C1/BiDi)                  | `23+13` suspicious + paste tests green; bracketed defense-only proven.                |
| Bounded payloads              | Adversarial (oversized)                                 | Every bound enforced at the producing edge; no unbounded alloc.                       |
| PTY backpressure              | Integration (full buffer)                               | Drops counted, UI remains responsive, telemetry increments.                           |
| Hot-path exclusion            | Static check + perf harness                             | No Lua call on hot path; PB-4 `8 ms` p50 holds with plugin load.                      |

No milestone is complete without this evidence plus independent
architecture and security-auditor review.

## Open questions

- Whether gesture-to-command mapping needs a `ConfigPlan` surface or stays
  as a fixed candidate table.
- Whether horizontal scroll should ever emit an application-visible sequence
  beyond Shift+Wheel compat, and if so which private CSI.
- Whether left/right modifier distinction ever justifies a new capability or
  remains a configuration knob.
- Whether the `Alt`-default Mod, only-registered-chords-consumed rule,
  dispatch priority, Leader sequences, and which-key/flash discoverability
  enter acceptance together or as separate follow-ups.

These are tracked as candidate follow-ups; they do not block the rest of the
contract.

## Synchronization notes

This RFC does not close OQ-004 or OQ-007; those remain **Accepted** via their
own RFCs. It is registered as a **Draft** in
[Specifications](../specifications/README.md) and linked from the
[Decision Register](../decisions/index.md) candidate queue; experimental
implementation exists at `bitty` `c0aadd2` + `a8735d0` (CTX-0095/0098,
`Implemented` experimental not `Verified`) as review evidence per CTX-0116.
Future acceptance would update those indexes, the open-question register only
via a registered decision, and the machine-readable
[`project-state.json`](../project/project-state.json) (synchronized `a8735d0`,
chain `d4d75e9 -> c0aadd2 -> 7e3104d -> a8735d0`, lifecycle
`Draft -> Experimental Implementation -> Accepted -> Verified`) only after
implementation evidence and auditor sign-off. `Draft` vs `Experimental`
vs `Accepted` vs `Verified` remain distinct per `project-state.json`.

## References

- Architecture: [Core Boundaries](../architecture/core-boundaries.md),
  [Architecture Overview](../architecture/overview.md).
- Specifications: [Terminal State RFC](terminal-state-rfc.md),
  [Compatibility Milestone RFC](compatibility-milestone-rfc.md),
  [Plugin Platform RFC](plugin-platform-rfc.md),
  [Isolation Resource RFC](isolation-resource-rfc.md),
  [Performance Budget RFC](performance-budget-rfc.md).
- Security: [Security Overview](../security/overview.md),
  [Threat Model](../security/threat-model.md),
  [Risk Register](../security/risk-register.md),
  [P0 Acceptance Criteria](../security/p0-acceptance-criteria.md),
  [Evidence Matrix](../security/evidence-matrix.md),
  [Clipboard audit at 7a4ee41](https://github.com/bitty-terminal/bitty/blob/7a4ee41/docs/security/audits/clipboard-2026-09.md).
- Platform: [ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md),
  [Technology Strategy](../project/technology-strategy.md).
- Prior input discussion: `docs/extensibility/plugin-system.md` input-encoding
  note and `docs/architecture/overview.md` input-path sketch.
