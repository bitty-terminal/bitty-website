---
title: Fragment pre-split and reassembly rule
description: Draft documentation of the implemented AI-0066/AI-0070 slice-layer rule that pre-splits runtime fragments across the 16 KiB rich-fragment ingest ceiling and reassembles them without byte loss
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 50
---

# Fragment pre-split and reassembly rule

> Status: **draft**. This document transcribes the runtime-to-transport
> pre-split and reassembly mapping rule implemented in the experimental
> `bitty-ai` slice at `bitty-ai@3242a5d`,
> `crates/bitty-ai-slice/src/fragment_transport.rs`. The rule is a slice-layer
> **mapping** rule, **not a shipped transport**: no `rich.*` wire method is
> registered and no live path exists. This document accepts no Request For
> Comments, closes no Artificial Intelligence Question entry, proposes no new
> identifier, and changes no product code. The normative security and IPC
> obligations in the accepted [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and the
> governance corpus override any statement here.

## Purpose and scope

Three accepted ceilings disagree across the runtime/transport boundary:

| Layer                                               | Bound   | Behavior               |
| --------------------------------------------------- | ------- | ---------------------- |
| `bitty_ai_runtime::stream::MAX_FRAGMENT_BYTES`      | 64 KiB  | reject                 |
| `bitty_ipc::wire::CHUNK_CEILING`                    | 256 KiB | reject                 |
| `bitty_ipc::rich_fragment::MAX_FRAGMENT_TEXT_BYTES` | 16 KiB  | truncate (`truncated`) |

A full 64 KiB runtime fragment projected verbatim into the 16 KiB ingest
service therefore truncates and silently loses bytes. The slice-layer rule
below removes that loss by cutting one source fragment into ordered parts that
each fit the transport ceiling. It covers only the fragment-size mapping: kind
erasure, render wiring, wire-method registration, consent, and provider echo
remain open `bitty`-side or future work and are not claimed here.

Sources inspected read-only for this document:

- Implementation: `bitty-ai` checkout at
  `main` commit `3242a5d` (`AI-0073` pin bump), module
  `crates/bitty-ai-slice/src/fragment_transport.rs` (module header `:1-64`,
  rule list `:19-52`).
- Transport contract: the pinned `bitty-ipc` revision
  `be6e63c55a18cb0a4bae1a528527b97251375bff`
  (`crates/bitty-ai-slice/Cargo.toml:18`, part of the `bitty` repository):
  `crates/bitty-ipc/src/rich_fragment.rs:80` (`MAX_FRAGMENT_TEXT_BYTES`),
  `:185-194` (`truncate_to_budget`), `:252-283` (ingest and truncation flag),
  `:328` (the `16 * 1024` assertion), and `crates/bitty-ipc/src/wire.rs:331`
  (`CHUNK_CEILING`).
- Runtime contract: `bitty-ai@3242a5d crates/bitty-ai-runtime/src/stream.rs:31`
  (`MAX_FRAGMENT_BYTES = 64 * 1024`).
- Tests: `bitty-ai@3242a5d crates/bitty-ai-slice/tests/fragment_mapping.rs`.
- Crate summary: `bitty-ai@3242a5d crates/bitty-ai-slice/README.md` section
  `Fragment pre-split (fragment_transport)`.

No file in the `bitty-ai` or `bitty` repositories was modified, and no cloned
script or test was executed from the inspected checkout. Test names and line
numbers are anchors at the revisions above.

## The rule

The slice crate documents this list as the contract a future production mapper
must follow. This corpus entry records it as draft implementation evidence, not
as an accepted cross-repository contract.

1. The source is one validated runtime `StreamChunk` (`validate_chunk`) whose
   fragment bytes are valid UTF-8. Non-UTF-8 bytes fail closed as `NonUtf8`:
   they cannot become transport `text` without loss.
2. Parts are cut greedily left to right. Each part is the longest prefix of the
   remaining bytes that is at most `MAX_FRAGMENT_TEXT_BYTES` and ends on a UTF-8
   code-point boundary. A code point is never split (`part_ends`,
   `fragment_transport.rs:623-639`).
3. Parts of one source fragment carry a dense zero-based `part_index`
   (`0..part_count`), `part_count >= 1`, and
   `is_continuation = part_index > 0`. An empty source fragment yields exactly
   one empty part, so every source fragment keeps a `part_count >= 1`
   projection.
4. Transport `seq` values are assigned contiguously from a caller cursor: part
   `i` of a fragment starting at `first_seq` gets `first_seq + i`, and the
   cursor advances by `part_count`. Ordering is deterministic and
   collision-free under the transport dedup key
   `(terminal_id, generation, seq)`.
5. Every part fits `MAX_FRAGMENT_TEXT_BYTES`, so the ingest service never
   truncates a pre-split part and its `truncated` flag stays `false`.
6. Both entry points enforce the 64 KiB runtime bound: `pre_split_chunk`
   through `validate_chunk`, and the fragment-level `pre_split_fragment`
   directly, so a raw `Fragment` larger than one runtime fragment is refused
   instead of split.
7. `reassemble` refuses parts that do not share one source identity: every part
   must carry the first part's `(terminal_id, generation, source_seq)` and a
   transport `seq` of `first_seq + part_index`, so a foreign or reordered part
   fails closed instead of being concatenated.
8. `reassemble_expected` additionally binds the whole part set to a
   caller-supplied `FragmentIdentity`. A foreign but internally consistent part
   set, which rule 7 alone would reassemble silently, fails closed with
   `FragmentTransportError::IdentityMismatch` unless its identity matches the
   caller's expectation. A later part whose recorded `part_count` disagrees
   with the first is reported as
   `FragmentTransportError::InconsistentPartCount`, kept distinct from the
   whole-input `FragmentTransportError::PartCountMismatch` so both failure
   modes stay unambiguous.

### Split entry points

- `pre_split_fragment(fragment, source_seq, terminal_id, generation, zone, first_seq)`
  (`:356-401`) is the fragment-level entry point. It checks
  `fragment.bytes.len() > MAX_FRAGMENT_BYTES` itself and refuses with
  `OversizedFragment { actual, limit }`, then requires valid UTF-8, computes
  `part_ends`, converts the count to `u32` (`TooManyParts`), and pre-checks the
  transport `seq` range (`SequenceExhausted`).
- `pre_split_chunk(chunk, terminal_id, generation, zone, first_seq)` (`:409-425`)
  validates the chunk first (`Runtime` on rejection) and delegates to
  `pre_split_fragment` with `chunk.fragment` and `chunk.seq`.
- `TransportPart` (`:80-91`) carries `data: FragmentData` (bounded text, dense
  `seq`, zone), `part_index: u32`, `part_count: u32`, `source_seq: u32` (the
  runtime `seq` of the source fragment, kept for traceability), and
  `is_continuation: bool`.

### Reassembly entry points

- `reassemble(parts)` (`:451-456`) wraps `reassemble_expected(parts, expected)`
  with the first part's identity (`FragmentIdentity::from(first)`,
  `FragmentIdentity` at `:101-108`), so it accepts a wholly foreign but
  internally consistent part set.
- `reassemble_expected(parts, expected)` (`:478-556`) compares the first part
  absolutely against `expected` and every later part against the first. It
  checks, in order: identity, supplied length against `part_count`, dense
  in-order `part_index` with `is_continuation = index > 0`, later-part
  `part_count`, `terminal_id`, `generation`, `source_seq`, contiguous transport
  `seq` via `checked_add`, and the per-part `MAX_FRAGMENT_TEXT_BYTES` ceiling;
  only then does it concatenate part `text` values.

## Invariants

- **Byte preservation.** Concatenating the parts in order reproduces the source
  fragment bytes exactly, including when parts were cut around multi-byte code
  points.
- **Code-point integrity.** Every part boundary is a UTF-8 code-point boundary;
  the greedy cut backs off from `start + MAX_FRAGMENT_TEXT_BYTES` until
  `str::is_char_boundary` holds.
- **Part ceiling.** Every part is at most 16 KiB, so ingest stores each part
  with `truncated == false` and the `truncated`-flag loss path is never
  reached.
- **Bounds do not compose away.** Neither entry point splits an over-64 KiB
  fragment into many small ones; the runtime bound is enforced before splitting.
- **Deterministic, collision-free order.** `part_index` is dense, transport
  `seq` is `first_seq + part_index`, and cursor advancement by `part_count`
  keeps consecutive fragments distinct under `(terminal_id, generation, seq)`.
- **Fail-closed reassembly.** Any empty, reordered, identity-disagreeing,
  `seq`-gapped, or over-ceiling input returns a typed error; nothing partial is
  returned.
- **Continuation is derived.** `is_continuation` is exactly `part_index > 0`;
  a new source fragment is never a continuation.

## Failure modes

Every failure is a typed `FragmentTransportError` variant (`:135-236`); the
mapping never silently drops, truncates, or reorders bytes.

| Variant                 | Raised by                 | Condition                                                             |
| ----------------------- | ------------------------- | --------------------------------------------------------------------- |
| `Runtime(String)`       | `pre_split_chunk`         | `validate_chunk` rejected the chunk (oversized or misframed)          |
| `NonUtf8`               | split entry points        | fragment bytes are not valid UTF-8                                    |
| `OversizedFragment`     | `pre_split_fragment`      | raw fragment exceeds the 64 KiB runtime bound                         |
| `TooManyParts`          | split; reassembly         | part index or count exceeds the `u32` index space                     |
| `SequenceExhausted`     | split, cursor, reassembly | transport `seq` arithmetic would overflow `u64`                       |
| `EmptyParts`            | reassembly entry points   | reassembly called with no parts                                       |
| `PartCountMismatch`     | `reassemble_expected`     | supplied part count disagrees with the first part's `part_count`      |
| `InconsistentPartCount` | `reassemble_expected`     | a later part records a different `part_count` than the first          |
| `IdentityMismatch`      | `reassemble_expected`     | first part identity disagrees with the caller-supplied expectation    |
| `PartOrder`             | `reassemble_expected`     | a part index is not dense/in order or `is_continuation` is mislabeled |
| `TerminalMismatch`      | `reassemble_expected`     | a later part carries a different `terminal_id`                        |
| `GenerationMismatch`    | `reassemble_expected`     | a later part carries a different `generation`                         |
| `SourceSeqMismatch`     | `reassemble_expected`     | a later part carries a different `source_seq`                         |
| `SequenceGap`           | `reassemble_expected`     | a part's `data.seq` is not `first_seq + part_index`                   |
| `PartTooLarge`          | `reassemble_expected`     | a part's `text` exceeds the 16 KiB transport ceiling                  |

`PartCountMismatch` and `InconsistentPartCount` are intentionally distinct:
the first compares the supplied length with the recorded count, the second
compares two parts' recorded counts, so both failure paths stay unambiguous and
their messages differ.

## Why pre-split: byte-loss rationale

The 16 KiB ingest ceiling cuts over-budget text at a code-point boundary and
sets `truncated = true` (`rich_fragment.rs:185-194`, `:252-283`); it cannot
preserve a source fragment larger than 16 KiB. The mapping suite quantifies
that loss with a 65 535-byte multi-byte block: 21 845 three-byte euro-sign code
points (`"€".repeat(21845)`) is one byte short of the 64 KiB runtime bound, and
the 16 KiB budget (16 384) is not a code-point boundary (it is not a multiple
of 3). The direct projection truncates at 16 383 bytes — not 16 384 — and
silently loses the trailing 49 152 bytes
(`direct_projection_of_a_full_fragment_loses_bytes`,
`fragment_mapping.rs:563-580`). The same block pre-splits into five parts (four
16 383-byte parts plus a 3-byte tail); every part ingests with
`truncated == false`, ordered concatenation is byte-identical to the source,
and `reassemble` reproduces it (`pre_split_64kib_multibyte_reassembles_byte_identical`,
`fragment_mapping.rs:506-561`).

The counterfactual is recorded in the same test file rather than implied, so
the rule's motivation is evidence-backed: without pre-split the mapping loses
bytes; with pre-split it does not.

## Composition and cursor semantics

`FragmentTransportCursor` (`:565-569`) owns the per-turn mapping state for one
`(terminal_id, generation)` pair:

- `FragmentTransportCursor::new(terminal_id, generation, first_seq)`
  (`:575-581`) starts the transport `seq` at `first_seq`.
- `map_chunk(chunk, zone)` (`:596-615`) validates and pre-splits one chunk with
  `pre_split_chunk`, then advances `next_seq` by the produced part count using
  `checked_add` (`SequenceExhausted` on overflow).
- `next_seq()` (`:585-587`) exposes the next unused transport `seq`.

Because advancement uses the produced part count, a split fragment followed by
another fragment stays dense: the second fragment's first part receives the
next unused `seq`, keeps its own dense `part_index`/`part_count`, and sets
`is_continuation = false`. The transport dedup key `(terminal_id, generation,
seq)` therefore never collides across a turn, and the real ingest service
accepts every part (`cursor_assigns_dense_seq_across_a_turn`,
`fragment_mapping.rs:582-625`).

Reassembly does not require the cursor: it checks `data.seq` contiguity from
the first part's `seq`, not from a caller-supplied `first_seq`. `reassemble`
anchors identity on the first part; `reassemble_expected` requires the caller
to state which source fragment it asked for. A foreign but internally
consistent set is accepted by `reassemble` and rejected by
`reassemble_expected` with `IdentityMismatch`
(`reassemble_expected_rejects_a_foreign_but_consistent_part_set`,
`fragment_mapping.rs:757-793`).

## Verification plan

Implementation and tests at `bitty-ai@3242a5d`; transport constants at the
pinned `bitty-ipc@be6e63c` revision.

| Anchor                                                    | Location                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------- |
| Rule module header (ceilings, rule list, slice rationale) | `crates/bitty-ai-slice/src/fragment_transport.rs:1-64`        |
| Rule list                                                 | `fragment_transport.rs:19-52`                                 |
| `TransportPart`                                           | `fragment_transport.rs:80-91`                                 |
| `FragmentIdentity`                                        | `fragment_transport.rs:101-108`                               |
| `FragmentTransportError` variants                         | `fragment_transport.rs:135-236`                               |
| `pre_split_fragment`                                      | `fragment_transport.rs:356-401`                               |
| `pre_split_chunk`                                         | `fragment_transport.rs:409-425`                               |
| `reassemble`                                              | `fragment_transport.rs:451-456`                               |
| `reassemble_expected`                                     | `fragment_transport.rs:478-556`                               |
| `FragmentTransportCursor`, `map_chunk`                    | `fragment_transport.rs:565-569`, `:596-615`                   |
| `part_ends` (greedy code-point cut)                       | `fragment_transport.rs:623-639`                               |
| Runtime bound `MAX_FRAGMENT_BYTES = 64 * 1024`            | `crates/bitty-ai-runtime/src/stream.rs:31`                    |
| Wire ceiling `CHUNK_CEILING = 256 * 1024`                 | `bitty-ipc@be6e63c crates/bitty-ipc/src/wire.rs:331`          |
| Ingest bound `MAX_FRAGMENT_TEXT_BYTES` (16 KiB)           | `bitty-ipc@be6e63c crates/bitty-ipc/src/rich_fragment.rs:80`  |
| Ingest truncation at a code-point boundary                | `rich_fragment.rs:185-194`, `:252-283`; `16 * 1024` at `:328` |

| Test (all in `crates/bitty-ai-slice/tests/fragment_mapping.rs`)        | Proves                                                                                   |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pre_split_64kib_multibyte_reassembles_byte_identical` `:506`          | 64 KiB multi-byte block splits, ingests without truncation, reassembles byte-identically |
| `direct_projection_of_a_full_fragment_loses_bytes` `:563`              | counterfactual: no pre-split truncates and loses trailing bytes                          |
| `cursor_assigns_dense_seq_across_a_turn` `:582`                        | dense transport `seq` across a turn; a new fragment is not a continuation                |
| `reassembly_rejects_misordered_parts` `:627`                           | reordered parts fail closed (`PartOrder`)                                                |
| `pre_split_does_not_bypass_the_runtime_fragment_bound` `:640`          | over-64 KiB chunk rejected through `validate_chunk` (`Runtime`)                          |
| `pre_split_fails_closed_on_non_utf8` `:655`                            | non-UTF-8 fails closed (`NonUtf8`)                                                       |
| `reassemble_refuses_a_foreign_terminal_part` `:676`                    | `TerminalMismatch`                                                                       |
| `reassemble_refuses_a_foreign_generation_part` `:688`                  | `GenerationMismatch`                                                                     |
| `reassemble_refuses_a_foreign_source_seq_part` `:698`                  | `SourceSeqMismatch`                                                                      |
| `reassemble_refuses_a_noncontiguous_part_seq` `:711`                   | `SequenceGap`                                                                            |
| `reassemble_refuses_a_mismatched_part_count_on_a_later_part` `:723`    | `InconsistentPartCount`                                                                  |
| `reassemble_expected_rejects_a_foreign_but_consistent_part_set` `:757` | `IdentityMismatch` closes the relative-only gap                                          |
| `part_count_failure_modes_are_distinguishable` `:795`                  | `PartCountMismatch` versus `InconsistentPartCount` stay distinguishable                  |
| `pre_split_fragment_refuses_an_oversized_raw_fragment` `:830`          | `OversizedFragment` at the fragment-level entry point                                    |
| `pre_split_fragment_accepts_exactly_the_runtime_bound` `:846`          | 64 KiB is a ceiling, not a strict inequality                                             |
| `no_rich_wire_method_is_registered` `:455`                             | candidate `rich.*` method names stay unregistered                                        |
| `ingest_takes_no_consent_or_scope_proof_by_construction` `:475`        | ingest takes only `FragmentData`; no consent object in scope                             |

## Acceptance criteria

- This is not a shipped transport. `FragmentIngestService::ingest` is a local
  service call; no `rich.*` wire method is registered
  (`no_rich_wire_method_is_registered` asserts `rich.publish`, `rich.ingest`,
  `rich_fragment.ingest`, `terminal.rich_fragment`, and `rich.get` resolve to
  no required scope), and the module states no live path exists yet. The source
  module header records review-07 identifier `PX-0270` as provenance; that
  identifier is not part of this corpus's registers and is not resolved here.
- This is a slice-layer mapping rule. `bitty-ai-runtime` stays std-only with
  zero dependencies and is unchanged; `bitty-ipc` is upstream and unchanged;
  adding a continuation concept to the runtime types is out of scope for
  AI-0066.
- No authorization claim. `FragmentIngestService::ingest` takes only
  `FragmentData`; there is no scope set, consent ledger, or provider echo in the
  ingest signature. Authorization, consent, and provider echo are sequel work
  for the `bitty` track, not something this rule performs or bypasses.
- No presentation claim. No test asserts pixels, `RichBlock`s, or live
  display; drained DTOs are asserted as data only.
- No acceptance claim. [Bitty-Side Integration Input](../integration/bitty-side-integration-input.md)
  BII-07 remains a `bitty`-side request; risk 3 (streaming triple-ceiling
  mismatch) of the [Cross-repo integration risk register](../integration/integration-risk-register.md)
  remains open, as does the related existing question AIQ-29 recorded there;
  this document closes nothing and grants no `bitty`-side acceptance.
- Status caveat. The `bitty-ai` implementation inspected here is an
  experimental slice, not the complete proposed runtime; the line anchors above
  are revision-pinned and drift with later commits.

## References

- [Bitty-Side Integration Input](../integration/bitty-side-integration-input.md) (Draft):
  BII-07 bounded rich scene-fragment transport, the handoff request this rule
  serves.
- [Cross-repo integration risk register](../integration/integration-risk-register.md) (Draft):
  risk 3, streaming triple-ceiling mismatch, with the required cross-repo
  contract and acceptance evidence.
- [AI Vertical Slice Pressure Test](../product/ai-vertical-slice-pressure-test.md) (Draft):
  G-4, no bounded scene-fragment ingestion method for out-of-process producers.
- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-29 and the
  admission rule; no entry status changes here.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): normative IPC framing,
  scope, and lifecycle contracts that override any statement here.
