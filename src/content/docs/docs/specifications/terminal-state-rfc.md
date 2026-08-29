---
title: Terminal state and action invariants
description: Defines the accepted parser-to-action-to-state contract preserving Terminal Truth and deterministic replay for OQ-007
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 12
---

# Terminal state and action invariants

> Status: **accepted** on 2026-08-26 by the project initiator. This document is
> the "Terminal state RFC" that closes
> [OQ-007](../decisions/open-questions.md). It defines a contract; it does
> not describe implemented behavior.

## Purpose and scope

OQ-007 asks: _what exact parser-to-action-to-state interfaces preserve Terminal
Truth and deterministic replay?_ This specification answers with a typed
action interface between the VT parser and terminal state, the invariants
that state must hold after every action, a damage-tracking model, replay
determinism guarantees, and a fuzzing/differential-testing strategy.

Normative sources this specification must not weaken:

- [Core and Plugin Boundaries](../architecture/core-boundaries.md): parser,
  semantic actions, grid, cursor, modes, scrollback, damage, and replies are
  Core-owned; protocol correctness and Terminal Truth cannot be delegated to
  Lua or plugins; the parser and Terminal state are untrusted-input fuzzing
  surfaces; recorded corpora and reference implementations support differential
  and replay tests.
- [Rich content and presentation interfaces](../interfaces/rich-content.md):
  Terminal state is the canonical result of PTY input; presentation interprets
  it without mutation.
- [Security overview](../security/overview.md) and
  [Threat Model](../security/threat-model.md): bounded parsing, panic-free
  recovery from malformed sequences (T-01), core-owned grid semantics (T-13),
  hard payload/decode limits.

Out of scope: image protocol placement semantics (OQ-008), plugin API surface
(OQ-011), event interception phases (OQ-013), and concrete protocol priority
ordering.

## Pipeline overview

```text
PTY bytes -> UTF-8 decoder -> VT Parser -> Action stream -> Terminal State -> Snapshot -> Renderer
                                   |                                |
                              (bounded, recoverable)         (damage, replies)
```

The only write path into terminal state is the `Action` stream produced by the
parser. No other component—renderer, plugin, MCP client, debug tooling—may
mutate canonical state. Reads occur through versioned snapshots only.

## Typed Action interface

### Design rules

1. The parser never touches grid memory. It emits typed, side-effect-free
   actions; terminal state is the sole interpreter.
2. Actions are total over the byte stream: every input byte maps to exactly one
   action (or none, when consumed as part of a multi-byte sequence). There is no
   "undefined" path that skips interpretation.
3. Actions carry fully resolved parameters (parsed numerics, defaulted
   intermediates). State does not re-parse strings.
4. Every action variant names the invariants it may affect, enabling exhaustive
   `match` coverage checks at compile time.

### Action enum (illustrative Rust shape)

```rust
// Illustrative type shape only; not an implemented API.
enum Action {
    // Text and glyphs
    Print(GraphemeCell),          // one cell-width-resolved grapheme cluster
    PrintControl(ControlChar),    // BS, HT, LF, CR, BEL, and other C0/C1

    // Cursor positioning (CSI)
    CursorMove { dir: Direction, n: Count },
    CursorPosition { row: Row, col: Col },        // CUP/HVP, origin-mode aware
    CursorSave / CursorRestore,
    CursorStyle { style: CursorStyle },
    CursorVisibility { visible: bool },

    // Erase (CSI J / K / X)
    EraseInDisplay { mode: EraseDisplayMode },    // below/above/all/screen w/o scrollback
    EraseInLine   { mode: EraseLineMode },
    EraseChars    { n: Count },

    // Insert/delete
    InsertLines { n: Count },
    DeleteLines { n: Count },
    InsertChars { n: Count },
    DeleteChars { n: Count },

    // Scroll (CSI S/T, DECSTBM-driven)
    ScrollUp   { n: Count },
    ScrollDown { n: Count },
    SetScrollRegion { top: Row, bottom: Row },    // DECSTBM; resets affected cursors

    // Attributes and colors (SGR)
    SetAttributes { attrs: AttributeDiff },

    // Modes (SM/RM, DECSET/DECRST)
    SetMode { mode: Mode, enabled: bool },        // enum covers every supported mode

    // Tabulation
    TabSet / TabClear { targets: TabTargets } / TabClearAll,
    TabForward { n: Count } / TabBackward { n: Count },

    // Charsets and encoding (SCS, SO/SI)
    SelectCharset { slot: CharsetSlot, table: CharsetTable },
    InvokeCharset { slot: CharsetSlot },

    // Device status and replies
    RequestDeviceStatus { kind: StatusKind },     // produces a Reply action output
    Reply { bytes: Box<[u8]> },                   // bounded response written to PTY

    // OSC handling (terminated payloads, already length-bounded by the parser)
    OscTitle { text: BoundedString },
    OscClipboard { op: ClipboardOp, data: BoundedBytes },  // gated by P0 policy
    OscCwd { url: BoundedString },                // OSC 7
    OscHyperlink { link: Option<Hyperlink> },     // OSC 8
    OscPromptMark { kind: ZoneKind },             // OSC 133 -> SemanticZone events
    OscUnknown { id: u32, data: BoundedBytes },   // ignored semantically, recorded for replay

    // Reset and misc
    SoftReset,     // DECSTR: defined subset of state reset
    FullReset,     // RIS: full state re-initialization
}
```

Coverage rule: adding an escape sequence requires either mapping it to an
existing action family or adding an explicit variant plus its invariant
specification here. A catch-all `Other` variant may exist for forward
compatibility but must be semantically inert (state unchanged) and counted in
telemetry so unmapped sequences cannot silently grow.

### Parser obligations

- Bounded parsing per the security baseline: maximum parameter count, parameter
  magnitude, OSC payload size, and sequence length; exceeding a limit yields a
  well-defined `Action` (truncate/cancel) rather than unbounded growth or a
  wedge (threat T-01).
- Every intermediate parse state must be reachable from any byte; malformed
  sequences resynchronize deterministically (defined recovery byte handling).
- UTF-8 decoding follows a single specified policy for invalid bytes (replace
  with U+FFFD, one cell), identical offline and live.

## Grid and state invariants

After each applied action, terminal state satisfies all of:

1. **Geometry**: grid dimensions equal the current size; scroll region satisfies
   `0 <= top <= bottom < height`; cursor satisfies
   `(origin_mode ? region : screen)` bounds after every action.
2. **Cell totality**: every cell has a defined content (grapheme or erased),
   style, width (1 or 2), and hyperlink id. Wide characters occupy exactly two
   cells with the trailing half marked as spacer; no orphan spacers exist.
3. **Cursor integrity**: the cursor points at a leading cell, never a wide
   spacer's second half; movement onto wide chars follows a single documented
   rule.
4. **Scrollback monotonicity**: lines enter scrollback only via scroll-under-
   region operations; pruning removes oldest first; scrollback contents are
   immutable once written.
5. **Mode consistency**: alternate-screen entry saves and exit restores the full
   primary-screen cursor/style/mode set; auto-wrap mode, origin mode, and
   insertion mode have single authoritative definitions referenced by the mode
   enum.
6. **Tab stops**: tab stops lie within `[0, width)`; `FullReset` restores the
   default tab lattice.
7. **Reply bounds**: total pending reply bytes per terminal are capped;
   exceeding the cap drops new replies and sets a flag rather than blocking.
8. **No hidden channels**: actions cannot mutate any state outside the declared
   grid/cursor/mode/tab/scrollback/reply set. Plugins observe snapshots; they
   never inject actions into this stream (T-13).

Invariant checking: a debug-only validator can recompute all invariants from the
grid after any action batch; CI runs it behind every corpus replay.

## Damage tracking model

- Each applied action records a damaged rectangle set (grid coordinates plus
  scrollback line ids). Scroll and erase produce coarse rectangles; print
  produces per-cell marks coalesced into runs.
- Damage is expressed against a monotonically increasing `generation` counter
  incremented once per processed action batch; snapshots embed the generation.
- Resize recomputes damage as the full visible grid plus affected scrollback
  reflow range, using one specified reflow algorithm (this RFC defers the exact
  algorithm choice as an open detail; whichever is chosen becomes the only
  implementation).
- Renderers consume `Snapshot + damage-since(generation)` and never read grid
  internals, satisfying the presentation boundary.
- Replay tooling ignores damage (it affects performance, not truth); damage
  correctness is verified by asserting the union of incremental damage equals a
  full-redraw diff of consecutive snapshots.

## Deterministic replay guarantees

Definition: two executions given the same initial state and the same input byte
stream (and the same declared environment) reach identical terminal states.

Guarantees:

1. **Byte-level determinism**: the action stream is a pure function of the byte
   stream and the fixed decoder/parser policy. No wall-clock time, randomness,
   thread scheduling, or platform differences influence state transitions.
2. **State hash**: a canonical serialization of grid, scrollback, cursor,
   modes, tab stops, charset slots, and pending replies hashes identically on
   all platforms (fixed field ordering, little-endian integers, stable string
   encoding). Same input ⇒ same hash, asserted byte-for-byte in CI across
   platforms.
3. **Environment declaration**: resize events, user-initiated resets, and
   policy decisions (e.g., clipboard consent denials) are recorded as explicit
   environment inputs in a replay recording; they are part of "same
   conditions," not hidden divergence sources.
4. **Recording format**: a recording is `header + framed chunks`, where each
   frame is either `Input(bytes)` or `Env(event)`. Recordings contain raw PTY
   bytes only—not actions—so parser changes remain testable against old
   recordings; expected state hashes pin regression baselines.
5. **Nondeterminism quarantine**: any future feature requiring nondeterminism
   must route its effect through an `Env` event; silent nondeterminism in the
   action path is a conformance violation.
6. **OSC side effects**: actions like `OscClipboard` produce state effects only
   through recorded policy outcomes; the request itself is deterministic, the
   granted effect enters via `Env`.

These properties serve debugging (reproduce any session state from its
recording), testing (corpus replays assert hashes), and the record/replay hooks
named under Reliability ownership in the core boundaries document.

## Testing strategy

### Fuzzing (untrusted-input surfaces)

- Targets: UTF-8 decoder, VT parser, and action applier (parser + state as one
  harness), matching the boundary acceptance requirement that parser and
  Terminal state receive fuzzing.
- Invariants checked inside the fuzz loop: no panic, all eight state invariants
  hold, bounded resource use (grid memory, reply buffer, OSC payload sizes),
  termination per input chunk.
- Corpus seeding: recorded real-world sessions, sequences harvested from
  vttest-style suites, and prior crash minimizations; corpora are stored with
  the repository and used for both fuzzing and regression replay.

### Differential testing

Reference comparisons run the same byte streams through reference terminals
(candidates: existing open-source emulators with scriptable state dumps) and
compare observable semantics: final visible grid text, cursor position, and
mode flags after each chunk.

- Known-divergence ledger: intentional differences (documented protocol choices)
  are listed in a machine-readable exceptions file so differential failures are
  triaged as bug-or-choice explicitly, never silently.
- Priority sequences: C0/C1 controls, CSI parameter edge cases (missing, zero,
  huge, non-digit intermediates), DECSTBM interactions with origin mode,
  wraparound at cell boundaries, wide-char splits across wraps and resizes, and
  OSC 8/52/133 handling under the P0 policy gates.

### Property-based and replay tests

- Randomized action-equivalent byte generators (grammar-guided) assert
  invariants and hash stability across shuffles of independent chunks where the
  grammar permits reordering.
- Every recorded corpus replays in CI: same bytes + env ⇒ pinned state hash.
  Hash changes require deliberate baseline updates reviewed alongside spec
  changes.

## Security review notes

This contract strengthens the P0 posture: bounded parsing and panic-free
recovery answer T-01; the single-writer action path and snapshot-only reads
enforce T-13 (Terminal Truth is core-owned); reply caps bound reverse-channel
abuse; OSC clipboard actions pass the normative separate read/write consent
policies. Fuzzing and differential testing provide the evidence path required by
boundary acceptance.

## Open items remaining under OQ-007

- Exact reflow algorithm on resize (must be singular and specified before
  implementation).
- Final Rust type shapes and module placement in the core repository.
- Choice of reference terminals and their scripted state-dump mechanisms.
- Concrete hash serialization version and its evolution policy.

This RFC closes OQ-007 at the design level; the register row links here.
