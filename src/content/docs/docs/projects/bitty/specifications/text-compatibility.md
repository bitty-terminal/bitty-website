---
title: Text Compatibility (draft)
description: Draft Unicode text-domain and IME-adjacent compatibility contract for Phase C deep — CTX-0079 (wide, combining, emoji ZWJ, ambiguous, terminfo, IME overlay vs commit)
category: specifications
audience: maintainer
document_type: research
status: draft
website_publish: false
sidebar_order: 59
---

<!-- markdownlint-disable MD025 -->

# Text Compatibility (draft)

## Status and provenance

- Status: **draft**. Text-domain companion to the retired [`docs/product/unicode-ime.md`](https://github.com/bitty-terminal/bitty/blob/706fa2565c5130a5dfd58dbeb8f84f71fc9f49dd/docs/product/unicode-ime.md) draft for **CTX-0079** — _Implement Unicode/Text compatibility and IME model (Phase C deep)_ — branch `ctx-0079/unicode-ime` at `91705be`, agent `opencode-commander`.
- Ownership: bitty **CTX-0079**. Does not close OQ-004, does not accept the `v0.2` slice, does not weaken normative security controls.
- Authority: when [`compatibility-milestone-rfc.md`](compatibility-milestone-rfc.md) accepts the differential contract, this draft folds into the accepted spec and the retired [`docs/product/unicode-ime.md`](https://github.com/bitty-terminal/bitty/blob/706fa2565c5130a5dfd58dbeb8f84f71fc9f49dd/docs/product/unicode-ime.md) § Unicode is retired or merged accordingly. Nothing here is normative until an ADR/RFC accepts it.

## Scope

Unicode scalar width, grapheme-adjacent handling, and IME preedit/commit boundaries only. Editor shaping, bidi, and fallback are explicitly out of scope (pending text RFC per ADR-0004). The VT parser obligations and Terminal State RFC remain the normative parents; this file clarifies the text-domain choices that sit between them.

## Unicode — width

- **Single implementation:** `crates/bitty-term-state/src/cell.rs::char_cell_width`.
- **Algorithm:** `if cp < 0x0300 { 1 } else if is_zero_width(cp) { 0 } else if is_wide(cp) { 2 } else { 1 }`. Pure `matches!` tables, no allocation, no `unsafe`, deterministic, headless.
- **Zero-width:** combining marks (`0300..036F` + script ranges), variation selectors (`FE00..FE0F`, `E0100..E01EF`), zero-width spaces/marks (`200B..200F`, `2060..2064`, `FEFF`), direction controls (`202A..202E`), ZWJ (`200D` zero-width) — see `is_zero_width`.
- **Wide:** CJK blocks, Hangul, Fullwidth, emoji (`1F300..1F9FF`, `1F680..1F6FF`, `1F900..1F9FF`), Extension B/C (`20000..3FFFD`) — see `is_wide`. Compact approximation; authoritative tables follow the future text RFC.
- **Ambiguous:** treated as `1` (no `EAW=A → 2` rule). Documented divergence from some platform `wcwidth` tables; differential harness may list it as known divergence.
- **State mapping:** `char_cell_width` → `Cell::width`/`Cell::wide_spacer` → `State::check_invariants` (`width ∈ {1,2}`, no orphan spacers). All `forbid(unsafe)`, bounded by grid geometry, and exercised headlessly. Invalid UTF-8 → `U+FFFD` one cell via `vte` collector.

## IME — overlay vs commit

The composition lifecycle, the preedit-to-commit ordering rule, and the
verbatim-commit guarantee are stated once in the
[Input and Pointer Contract](input-pointer-rfc.md#ime-composition-and-commit-candidate).
This section records only the text-domain bite and does not restate them.

- See [`docs/product/unicode-ime.md`](https://github.com/bitty-terminal/bitty/blob/706fa2565c5130a5dfd58dbeb8f84f71fc9f49dd/docs/product/unicode-ime.md) (§ IME model) for the retired pipeline draft.
- **Preedit** is ephemeral overlay, never `Snapshot`/`State`/`scrollback`/`damage`. Rendering is inline decorated overlay (underline + caret) above the cursor; grid invariants are untouched. The preedit is text-domain bounded at `IME_PREEDIT_MAX_CHARS = 128` scalars, char-boundary truncated.
- **Commit** is bounded UTF-8 bytes through the single PTY writer queue (same path as `encode_key_event`), bounded at `IME_COMMIT_MAX_CHARS = 256` scalars and `IME_COMMIT_MAX_BYTES = 1024` bytes per commit; truncation is a deterministic char-boundary cut (same as `BoundedString`).
- **Commit text is verbatim.** The bytes written to the PTY are exactly the UTF-8 encoding of the committed scalars. No separator, no terminator, and no synthetic trailing space is added, and a commit is never padded to a line width. A trailing space after a composition is a contract violation ([bitty#1449](https://github.com/bitty-terminal/bitty/issues/1449)), not a rendering nicety.
- **Preedit-to-commit ordering.** Wayland `text-input-v3` and X11 XIM end a composition with an empty `Preedit` followed by `Commit`. The clearing event ends the _overlay_, not the composition: composition liveness is tracked independently of overlay content, so the commit-triggering key press is consumed instead of being encoded as a literal space or newline.
- **Cancel paths emit nothing.** `Ime::Disabled` and input-focus loss cancel the composition with zero PTY bytes and release the keyboard for the next event. Focus loss never commits uncommitted text.

Current status at `bitty` `679f12f` (2026-09-25), read-only: the overlay,
bounds, single-queue commit, and focus-loss cancel ship with headless evidence
in `crates/bitty-runtime/tests/ime_input.rs`. The commit-key suppression and
the verbatim-commit obligation are **not** met at that revision — the shipped
composition guard is keyed on overlay presence, so the empty preedit ends the
composition before the commit key can be consumed. The defect is open as
`bitty` #1449 with the product fix owned by the `bitty` repository. This draft
therefore records the bounds as `Implemented` (experimental) and the ordering
and verbatim rules as **candidate, not yet implemented**; nothing here is
`Verified`.

The retired draft's `IME_PREEDIT_MAX_SCALARS = 256` and per-commit
`256`-byte values do not match the shipped `128`/`256`/`1024` bounds; the
shipped values above are the ones the
[Input and Pointer Contract](input-pointer-rfc.md#bounded-payloads-candidate)
binds, while the
[Text and Rendering RFC](text-rendering-rfc.md#bounded-resources-and-hard-ceilings)
ceiling table still carries the older `256` scalars (`TXT-10`) and `256` bytes
(`TXT-11`) candidates. That divergence is unresolved here: reconciling the two
candidate tables needs the text-RFC owner, not this draft.

## Terminfo

- See [`docs/product/unicode-ime.md`](https://github.com/bitty-terminal/bitty/blob/706fa2565c5130a5dfd58dbeb8f84f71fc9f49dd/docs/product/unicode-ime.md) (§ Terminfo / `TERM` contract) and the `bitty` repository `terminfo/README.md`. Default `TERM=xterm-256color` until a `bitty` entry is published and the compatibility matrix updates.

## Next

- Pin the authoritative width tables per the text RFC (ADR-0004) and replace the compact `char_cell_width` tables with generated ones when accepted.
- Land `terminfo/bitty.ti` draft and `bitty-platform` IME seam.
- Reconcile the `TXT-10`/`TXT-11` candidate ceilings in the
  [Text and Rendering RFC](text-rendering-rfc.md) with the shipped `128`
  preedit / `256`-char / `1024`-byte IME bounds recorded above.
- Re-verify the ordering and verbatim-commit rows after the owning `bitty`
  task closes [bitty#1449](https://github.com/bitty-terminal/bitty/issues/1449);
  the bounds rows do not need re-verification for that fix.

## References

- [`input-pointer-rfc.md`](input-pointer-rfc.md) — authoritative IME
  composition lifecycle, preedit/commit ordering, and verbatim-commit rules.
- [`terminal-state-rfc.md`](terminal-state-rfc.md),
  [`terminal-feature-gap-analysis.md`](terminal-feature-gap-analysis.md) —
  shipped-versus-missing verdicts, including the open IME defect,
  `crates/bitty-term-state/src/cell.rs`, `crates/bitty-vt/src/parser.rs`,
  `crates/bitty-pty/src/builder.rs`, `crates/bitty-runtime/src/runtime/input.rs`,
  `crates/bitty-runtime/tests/ime_input.rs`, `tests/compat/harness.rs`, and
  the retired
  [`docs/product/unicode-ime.md`](https://github.com/bitty-terminal/bitty/blob/706fa2565c5130a5dfd58dbeb8f84f71fc9f49dd/docs/product/unicode-ime.md)
  draft.
