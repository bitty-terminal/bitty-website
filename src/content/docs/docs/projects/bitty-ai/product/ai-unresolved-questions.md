---
title: AI Unresolved Questions
description: Local unresolved choices with feature prerequisites and proposed review routing
category: specifications
audience: mixed
document_type: register
status: draft
website_publish: false
sidebar_order: 22
---

# AI Unresolved Questions

## Purpose

This local draft preserves 53 identifiers, including aliases, not 53 independent
questions. It assigns no owners, release milestones or accepted global OQs.
Promotion requires the canonical [OQ admission rule](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md#use).
All non-alias choices remain open except AIQ-12 and AIQ-13 (Closed, adopted-draft) and the
AIQ-01 snapshot-stream, window-budget, and compiled-ingest, AIQ-11 L0/L1 enforcement, AIQ-03 store-expiry, AIQ-04 generation-pin, AIQ-55
store-propagation, AIQ-59 runtime-bounded-reconcile, AIQ-37 runtime/slice-side outcome-vocabulary,
and AIQ-24/AIQ-25 single-hop whole-batch admission, AIQ-5A container-level redaction,
AIQ-51 content-addressed store, and AIQ-53 SQLite backend facets (Closed(partial)); no accepted global decision is made here.

## Disposition

**Prerequisite** blocks enabling the named feature until its mechanism and
evidence satisfy the stated control. A reviewed safe profile may explicitly
exclude that feature; no such release profile is selected here. **Design** is a
choice for the named feature, not a general release blocker. **Scope** requires
a release/profile decision before deriving milestone gates. These replace the
unsupported global Yes/No classifications.

Routing names are proposed reviewer domains, not assigned owners: AI runtime,
terminal/IPC/panel, security, code intelligence, CarryCtx/lifecycle, plugin API,
and standalone AI product. The commander must identify accountable owners before
promotion. Required controls are not reopened: authentication, least privilege,
consent, isolation, budgets, truthful disclosure and secret minimization remain
mandatory. P0-AC-026 and AI PP-2/PP-4 require pre-queue/pre-write redaction and
consented recording; open mechanisms cannot defer those controls.

## Context management

Details: [context management](../context/context-management.md),
[prefix-cache context design](../context/prefix-cache-context-design.md).

| ID     | Open choice                                                                                                                                                        | Blocking feature and rationale                                                                                                                   | Proposed routing               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| AIQ-01 | Per-request versus incremental context generation — Closed(partial): snapshot-stream, window-budget, and compiled-ingest facets only; see disposition              | Design: view cadence and invalidation                                                                                                            | AI runtime                     |
| AIQ-02 | Compression backend selection — Closed (adopted-draft); see disposition                                                                                            | Design: routing within provider consent and budget                                                                                               | AI runtime, security           |
| AIQ-03 | Artifact expiry and reference invalidation — Closed(partial): store-expiry facet only; see disposition                                                             | Prerequisite: retained artifacts must honor deletion and bounds                                                                                  | AI runtime, security           |
| AIQ-04 | Selection priority versus durable retention authority — Closed(partial): generation-pin facet only; see disposition                                                | Prerequisite: pinning cannot override consent or expiry                                                                                          | AI runtime, security           |
| AIQ-05 | Background maintenance scheduling/consistency — stays open; cancel-observability evidence recorded with no facet closed, see note                                  | Design: preserve bounded responsive admission                                                                                                    | AI runtime                     |
| AIQ-06 | Re-expansion after projection compaction                                                                                                                           | Design: only surviving authorized originals are recoverable; see AIQ-57                                                                          | AI runtime                     |
| AIQ-07 | Cross-session memory retrieval mechanism                                                                                                                           | Prerequisite: consent, freshness and deletion propagation                                                                                        | AI runtime, security           |
| AIQ-08 | MCP schema cache invalidation — Closed(partial): fail-closed missing/unversioned schema facet only; see disposition                                                | Prerequisite: stale schemas cannot authorize changed effects                                                                                     | AI runtime, security           |
| AIQ-09 | Skill format/versioning and ecosystem compatibility — Closed(partial): cache-stable version hashing and loading declaration isolation facets only; see disposition | Design: loading declarations grants no execution authority                                                                                       | AI runtime, plugin API         |
| AIQ-10 | Task lifecycle authority and CarryCtx backend/handoff                                                                                                              | Design: one lifecycle authority for integration; AIQ-56 is its persistence alias                                                                 | AI runtime, CarryCtx/lifecycle |
| AIQ-11 | Context injection-defense enforcement evidence — Closed(partial): L0/L1 and L2 selective-compression facets closed; see disposition                                | Prerequisite: untrusted observations cannot control maintenance policy; durable retention policy and cross-session GC facets stay open           | AI runtime, security           |
| AIQ-12 | Canonical serialization and stable-prefix ordering — Closed (adopted-draft); see disposition                                                                       | Design: deterministic prompt/1 encoding adopted for the prefix-cache prerequisite                                                                | AI runtime                     |
| AIQ-13 | Provider-scoped prefix-cache key and routing scope — Closed (adopted-draft); see disposition                                                                       | Design: provider-scoped CacheKey/CacheScope keying plus measured hit-rate evidence; implicit-vs-explicit routing stays a follow-up policy choice | AI runtime, security           |

### AIQ-08, AIQ-09, AIQ-11, AIQ-12, and AIQ-13 dispositions (local draft only)

These dispositions close register facets with implementation evidence. They set
no owners or milestones, grant no global promotion, and use Closed and
Adopted-draft wording only.

- **AIQ-08 — Closed(partial): fail-closed missing/unversioned schema facet
  closed; cache invalidation and dynamic reload facets stay open.** Closed
  choice: fail-closed rejection on missing, unversioned, or invalid schema paths
  before any tool execution occurs — if a tool's schema or schema version is
  missing or cannot be validated, the call fails closed immediately without
  contacting the tool executor. Evidence: tests in
  `bitty-ai/crates/bitty-ai-runtime/tests/mcp_fail_closed.rs`
  (`fail_closed_mcp_path_without_version_source`,
  `unversioned_schema_is_rejected`, `missing_schema_is_rejected`); merged in
  `bitty-ai` `e7cbe69` (AI-0096). Stay-open facets: dynamic schema cache
  invalidation upon server capability update and version change notifications.
- **AIQ-09 — Closed(partial): cache-stable version hashing and loading declaration
  isolation facets closed; ecosystem format compatibility stays open.** Closed
  choices: (1) Skill loading declarations grant no execution authority —
  cross-entry tool narrowing validates that declared tools are filtered strictly
  to the authorized subset without granting ambient capabilities. Evidence:
  tests in `bitty-ai/crates/bitty-ai-runtime/tests/skill_tool_narrowing.rs`;
  merged in `bitty-ai` (AI-0103). (2) Content-hashed cache key computation for
  skills: version-only bumps without content changes produce byte-stable cache
  keys, preventing unnecessary prefix-cache invalidation. Evidence: tests in
  `bitty-ai/crates/bitty-ai-runtime/tests/cache_key.rs`
  (`skill_content_hash_pins_cache_stability`); merged in `bitty-ai` `3ec493f`
  (AI-0146). Stay-open facets: ecosystem skill format standardization and
  cross-tool schema compatibility.
- **AIQ-12 — Closed (adopted-draft).** Choice: deterministic `prompt/1`
  canonical encoding with five-layer stable order (Core-contract, User,
  Project, Skills-profile, Runtime-turn), length-prefixed sections, sorted
  policy lists, and a trailing `[effective]` block keeping leading bytes
  prefix-stable. Evidence: [Prompt Layering Design](../context/prompt-layering-design.md)
  assembly order (stable-before-dynamic) and [Prefix-Cache-Friendly Context
  Design](../context/prefix-cache-context-design.md) prerequisite; code
  `bitty-ai/crates/bitty-ai-runtime/src/prompt.rs` (`assemble`,
  `render_canonical`); 22 prompt tests covering stable order, byte-exact
  canonical form, sorted LF-only lists, trailing-change prefix stability, and
  prompt-never-grants narrowing; merged in `bitty-ai` `12312ac` (AI-0029).
  Cache-key scope (AIQ-13) and measured hit-rate claims stay out of scope.
- **AIQ-11 — Closed(partial): L0/L1 and L2 selective-compression facets closed;
  durable retention policy and cross-session GC facets stay open.** Closed
  choices: (1) L0 structured-output plus L1 lossless-pruning enforcement under
  untrusted observations (trusted-only supersede links, full-body `(provider,
owner, summary, body)` dedupe with deny-by-default survivor, untrusted
  priority clamp to at most Normal, byte-length-only externalization and
  truncation accounting, no content interpretation). Evidence: [Context
  Management Architecture](../context/context-management.md) Level 0, Level 1,
  and security-boundary sections; code
  `bitty-ai/crates/bitty-ai-runtime/src/context.rs` (`assemble`,
  `effective_priority`); 9 injection-defense negative tests (16 tests total in
  `context.rs`) pairing injection variants with same-shape benign controls;
  merged in `bitty-ai` `e1cfdd9` (AI-0028). (2) L2 selective-compression
  prototype with untrusted provenance preservation, deterministic breakpoint
  selection, and retention inheritance: a host-provided `Summarizer` trait seam
  (`bitty_ai_runtime::compression::Summarizer`) with deterministic greedy
  packing over whole record boundaries (`select_breakpoints`), untrusted
  observation marking preserved across compressed spans (`untrusted_sources > 0`
  marks synthetic record untrusted with priority clamped to at most Normal and
  no `supersedes` escalation), most-restrictive retention class inheritance
  (`RetentionClass`, `RetentionTags`), source expiry preservation through
  compression spans, source generation eligibility preservation, and typed
  absence on deleted or unavailable summaries
  (`CompressionError::SummaryUnavailable`). When model-backed, network transport
  delegates to `bitty-network` under `ai.provider` consent per the Provider
  Transport Adapter Contract. Evidence: [Context Management
  Architecture](../context/context-management.md) Level 2 section; [Provider
  Transport Adapter Contract](../providers/transport-adapter-contract.md); code
  `bitty-ai/crates/bitty-ai-runtime/src/compression.rs` (`Summarizer`,
  `FakeSummarizer`, `compress_records`, `select_breakpoints`,
  `CompressionConfig`, `RetentionClass`, `RetentionTags`); 30+ unit tests in
  `compression.rs`; merged in `bitty-ai` `62d5fdb` (AI-0048, prototype and
  retention policy), `c8a2b53` (AI-0099, source expiry preservation), `eb7448e`
  (AI-0100, source generation preservation). Stay-open facets with reasons:
  durable retention policy (no durable store, durable journaling, GC, or
  cross-session deletion-propagation mechanism evidenced; belongs to durable
  storage profile AI-0049 / AIQ-54); any later pruning-scope gap needs a separate
  code task.
- **AIQ-13 — Closed (adopted-draft).** Choice: provider-scoped prefix-cache
  key (`CacheKey` pins `provider_id`, `model_id`, `scope`,
  `stable_prefix_hash`, `prefix_len`; equality and hashing cover every
  field so same bytes under a different route compare unequal) with
  three-variant routing scope (`CacheScope`: `Session` reusable across turns
  of one session, `Turn` one turn only, `Round` one provider round only; a
  `Session` key never equals a `Turn` key over the same bytes) and a pinned
  7/10 (70%) repeat-head hit-rate measurement. Evidence: [Prefix-Cache-Friendly
  Context Design](../context/prefix-cache-context-design.md) prerequisite; code
  `bitty-ai/crates/bitty-ai-runtime/src/cache_key.rs` (`CacheKey`,
  `CacheScope`, `CacheKeyError`, `stable_prefix_len` walking length-prefixed
  sections, `fnv1a64`); 8 `cache_key.rs` tests covering the
  provider/model/scope/stable-region inequality matrix, Session/Turn scope
  separation, deterministic rebuild with pinned digest, trailing-only-change
  prefix stability, stable-region-change key break, the 10-round repeat-head
  harness (7 hits / 10 rounds), malformed-input fail-closed construction, and
  the embedded-marker alias proof; merged in `bitty-ai` `fdb37c5` (AI-0082,
  key mechanism plus 7-test harness) and `2b984c4` (AI-0084, length-aware
  boundary plus alias-proof test). Follow-up pointer, not an open facet: the
  implicit-versus-explicit routing half narrows to a pure policy choice
  operating inside non-leaking keys.

### AIQ-01 disposition (local draft only)

This disposition closes a register facet with implementation evidence. It sets
no owners or milestones, grants no global promotion, and uses Closed(partial)
wording only.

- **AIQ-01 — Closed(partial): snapshot-stream, window-budget, and
  compiled-ingest facets closed; full incrementality and
  background-maintenance facets stay open.** Closed choice:
  session-pinned snapshot plus per-turn deltas with explicit host-authorized
  refresh rotating the generation pin — the stable snapshot head warms the
  `Session` prefix-cache key while only the turn tail varies, and a refresh
  misses the retired key by construction. Evidence: code
  `bitty-ai-slice/src/snapshot_ingest.rs` (`ingest_snapshot` digest-verified
  ingestion, `RefreshAuthorization::authorize` per-call token,
  `RefreshLedger::issue` strictly increasing issuance with `retired()` audit
  chain and `RefreshError::NotAdvancing` fail-closed replay denial,
  `project_layer_text` marker-prefixed PROJECT rendering embedding the full
  digest, `prompt_snapshot_with_project` binding the record summary to the
  digest); tests `snapshot_delta.rs`
  (`session_pinned_snapshot_with_per_turn_delta`: gen-1 pin, gen-1 delta
  alongside, gen-2 refresh with `StaleGeneration` denial of the stale pin),
  `session_wiring.rs` (`full_session_lifecycle_composes`: ledger issuance,
  tail-only key warmth, refresh miss, retired-generation re-issue denial,
  invalidation fail-closed), `cache_affinity.rs` (`same_digest_warms_same_key`,
  `changed_digest_misses_key`, `project_text_is_stable_prefixed_and_bounded`),
  `hit_rate.rs` (`stable_head_with_varying_tail_hits_consecutively`,
  `refreshed_snapshot_misses_then_rewarms`); runtime `StaleGeneration` (AG-2)
  fail-closed assembly gate underpinning rotation; merged in `bitty-ai`
  `e3bcfe2` (AI-0123, delta cycle), `8427008` (AI-0126, ledger), `f70d3ac`
  (AI-0127, affinity), `7de59d9` (AI-0128, project-layer builder), `a809896`
  (AI-0129, hit-rate), `3858700` (AI-0130, session wiring). Window-budget
  facet: AI-0139 resolves the per-turn byte budget against the model window
  before provider I/O — `AgentConfig::effective_budget_bytes` computes
  `min(context_budget_bytes, window_tokens * 4)` under the documented
  `BYTES_PER_TOKEN_ESTIMATE` skeleton heuristic with saturating arithmetic,
  and an unknown window (`None` or `0`) keeps the configured ceiling
  unchanged (unknown-passthrough, never a fabricated default); the one
  effective value drives both context assembly (`ContextRequest.max_bytes`)
  and the provider pre-I/O check (`TurnRequest.budget_bytes`), so
  `BudgetExceeded` carries the effective limit. The agent holds no model
  registry: the host copies the selected registration's window into
  `context_window_tokens` at wiring time, and a stale copy only changes the
  byte bound the run enforces locally. Evidence: code
  `bitty-ai/crates/bitty-ai-runtime/src/agent.rs`
  (`AgentConfig::{context_window_tokens, effective_budget_bytes}`,
  `run_turn` resolving the effective budget for assembly and the turn
  request), `provider.rs` (`TurnRequest.budget_bytes` carrying the effective
  bound, not the raw configured ceiling); 5 `window_budget.rs` tests
  (`effective_budget_is_unit_min_with_unknown_passthrough`,
  `smaller_window_wins_at_the_provider_boundary`,
  `unknown_window_keeps_current_behavior_exactly`,
  `boundary_window_equal_to_budget_behaves_like_unknown`,
  `narrower_window_stops_before_tool_dispatch`); merged in `bitty-ai`
  `8fd8f6e` (AI-0139). Compiled-ingest facet: AI-0141 ingests
  compiler-produced PROJECT/DELTA layer texts as runtime records through
  `ingest_compiled_turn` — pure bytes-in/records-out (no process spawning,
  filesystem, network, or caching); the PROJECT text is verified by marker
  (`project-snapshot/1` exactly once, at the front) plus digest-prefix
  binding (the text must end with `full-digest <digest>` carrying the
  supplied digest verbatim while the remainder contains the
  `digest <prefix12>` summary prefix, so appending a stolen digest without
  the matching summary still fails — review probe PX-0554), and every DELTA
  text is verified by marker (`delta/1` prefix) plus generation pin (a stale
  layer fails the whole turn closed with `StaleLayer`; every failure leaves
  the store unchanged, no partial records). Trust follows the established
  pattern: the PROJECT record is the snapshot-backed project observation
  (provider `"project"`, untrusted surface, AIQ-11 clamp applies at assembly)
  and DELTA records are host-collected observations (provider `"diagnostics"`,
  trusted, like the AI-0123 delta pattern); the host owns all byte assembly
  (running the context-compiler out of process, assigning record identity,
  authorizing the refresh) and every layer text is verified, never
  interpreted. Evidence: code
  `bitty-ai/crates/bitty-ai-slice/src/snapshot_ingest.rs`
  (`CompiledTurnIngestRequest`, `CompiledTurnIngestError`,
  `ingest_compiled_turn`, `COMPILED_DELTA_MARKER`,
  `COMPILED_DELTA_PROVIDER`); 7 `compiled_turn.rs` tests over recorded
  compiler-output fixtures (`recorded_fixture_markers_are_exact`,
  `compiled_turn_ingests_project_plus_deltas`,
  `stale_delta_fails_the_whole_turn_closed`, `bad_markers_fail_closed`,
  `forged_digest_appendage_without_summary_prefix_fails`,
  `truncation_marker_tail_compiles_as_inert_delta`,
  `compiled_ingest_is_deterministic`); merged in `bitty-ai` `29005c7`
  (AI-0141). Stay-open facets
  with reasons: full incremental view update (each turn reassembles from the
  pinned snapshot plus a recollected delta; no cached view is mutated in
  place and no diff-application mechanism is evidenced) and background
  maintenance scheduling and consistency (ingest keeps no cache and schedules
  no background refresh; the ledger is pure generation arithmetic with no
  bytes, clock, or I/O; refresh timing stays a host decision — overlapping
  AIQ-05, which stays open).

This describes sibling behavior only as read; this repository was not modified
as part of those inspections beyond this register.

### AIQ-02 disposition (local draft only)

This disposition closes the compression backend selection choice with implementation evidence and the provider transport adapter contract. It sets no owners or milestones, grants no global promotion, and uses Closed (adopted-draft) wording only.

- **AIQ-02 — Closed (adopted-draft).** Choice: L2+ selective compression summarization is selected and routed via the host-provided [`Summarizer`](../providers/transport-adapter-contract.md) trait (`bitty_ai_runtime::compression::Summarizer`) under complete dependency inversion: the runtime agent kernel remains std-only and never calls models or networks directly. When a model-backed summarizer is selected by the host, it must route through `ModelProvider::complete` within the user-authorized consent scope (`ai.provider`), bounded by the caller's context budget (`effective_budget_bytes` in `budget_bytes`), and delegating any network transport to `bitty-network` via the transport adapter contract. Injection defense is preserved by construction: any span containing untrusted observations (`untrusted_sources > 0`) produces a summary record marked untrusted, with zero priority escalation authority.
  Evidence: [Context Management Architecture](../context/context-management.md) Level 2 selective compression and retention sections; [Provider Transport Adapter Contract](../providers/transport-adapter-contract.md); code `bitty-ai/crates/bitty-ai-runtime/src/compression.rs` (`Summarizer`, `FakeSummarizer`, `compress_records`, `select_breakpoints`, `CompressionConfig`, `RetentionClass`, `RetentionTags`); 30+ unit tests in `compression.rs` proving deterministic breakpoint selection, untrusted provenance preservation, priority clamp, retention inheritance, and fail-closed absence handling; merged in `bitty-ai` `62d5fdb` (AI-0048).

### AIQ-05 note (local draft only)

This note records implementation evidence without closing any facet. It sets
no owners or milestones, grants no global promotion, and uses no Closed
wording.

- **AIQ-05 — stays open; cancel-observability evidence recorded, no facet
  closed.** Recorded behavior: an honored-cancellation counter plus a
  buffered-chunk keep contract, both single-agent scope.
  `AgentSession::cancel_count` counts first-honored `Active` -> `Canceled`
  transitions only (0 while never canceled, 1 once canceled; idempotent
  repeats and cancels on terminal `Completed`/`Failed` sessions never inflate
  it), is shared across session clones like the cancel state itself, and is
  exposed through a read-only `Agent::cancel_count` delegate that never
  mutates. Cancellation stops stream emission at chunk boundaries while
  already-accepted sink bytes stay (no rollback, no drop), and the cancel is
  still counted once. Evidence: code
  `bitty-ai/crates/bitty-ai-runtime/src/session.rs` (`cancel_count: Cell<u64>`,
  `AgentSession::cancel_count`, `AgentSession::cancel` incrementing on the
  honored transition only), `agent.rs` (`Agent::cancel_count` read-only
  delegate); 9 `cancel_metric.rs` tests
  (`fresh_session_cancel_count_is_zero`, `cancel_once_counts_one`,
  `repeat_cancel_does_not_inflate`,
  `cancel_on_terminal_session_does_not_count`,
  `cancel_count_is_visible_through_clones`,
  `agent_cancel_delegate_counts_once`,
  `completed_turn_leaves_count_at_zero`,
  `cancel_before_turn_counts_once_without_io`,
  `mid_batch_cancel_keeps_accepted_bytes_and_counts_cancel`) alongside the
  state-level companion `cancel_is_idempotent_and_shared` in `session.rs`;
  merged in `bitty-ai` `dc61ef6` (AI-0140, MP-7). No facet closes with
  reasons: background maintenance scheduling and consistency (no scheduler,
  timer, background worker, maintenance cadence, or consistency protocol is
  evidenced; the counter reads 0 or 1 under the terminal state machine and
  two-waiter shared work is explicitly out of scope; scheduling timing stays
  a host decision — consistent with the AIQ-01 disposition above, which keeps
  its background-maintenance facet open).

This describes sibling behavior only as read; this repository was not modified
as part of those inspections beyond this register.

### AIQ-03, AIQ-04, and AIQ-55 dispositions (local draft only)

These dispositions close register facets with implementation evidence. They set
no owners or milestones, grant no global promotion, and use Closed(partial)
wording only. Host-side enforcement stays open per the AIQ-11 precedent: the
store enforces removal and expiry, the host decides what to delete and when.

- **AIQ-03 — Closed(partial): store-expiry facet closed; host deletion-timing
  and durable facets stay open.** Closed choice: generation-exact artifact
  expiry plus explicit host-authorized invalidation with typed fail-closed
  resolution — out-of-generation references fail with `ArtifactExpired`,
  dangling or invalidated references fail with `ArtifactUnavailable`, never
  silent substitution or stale bytes. Evidence: code
  `bitty-ai/crates/bitty-ai-runtime/src/context.rs`
  (`ArtifactStore::store(bytes, generation)`,
  `resolve(reference, current_generation)` exact-generation gate, `invalidate`
  dropping bytes and freeing budget, `ArtifactExpired` carrying the reference
  only); 3 store tests (`artifact_expiry_is_generation_exact`,
  `invalidate_drops_bytes_and_frees_budget`,
  `assemble_committed_artifacts_pin_request_generation`) covering
  same-generation resolve, older/future/forged generation denial, idempotent
  double-invalidate, and budget accounting; merged in `bitty-ai` `e4ad1d5`
  (AI-0124). Stay-open facets with reasons: host deletion timing and consent
  (the host decides what to invalidate and when; the store only enforces
  removal), durable GC and retention bounds, and cross-session deletion
  propagation (no durable store, GC, or cross-session mechanism evidenced).
- **AIQ-04 — Closed(partial): generation-pin facet closed;
  durable-retention-authority facet stays open.** Closed choice: every artifact
  pins to its host-supplied generation and retires when the record pin rotates
  (AG-2), so selection priority and `pinned` markers cannot override expiry;
  `pinned` and protection markers cannot override consent, redaction, expiry,
  deletion, or resource ceilings. Evidence: [Context Management
  Architecture](../context/context-management.md) retention-policy consequence;
  code `bitty-ai/crates/bitty-ai-runtime/src/agent.rs` (tool-history artifacts
  stored with `session.generation()`), `context.rs` `assemble` (committed
  artifacts stored with `request.current_generation` after the StaleGeneration
  gate), `bitty-ai-slice/src/snapshot_ingest.rs` (snapshot payloads stored
  with `refresh.generation()`); exact-generation `resolve` gate above; merged
  in `bitty-ai` `e4ad1d5` (AI-0124). Stay-open facets with reasons: durable
  retention-policy authority and host limits constraining user/tool preferences
  (no durable store or GC evidenced); Lua proposes selection policy only, host
  enforcement remains owing.
- **AIQ-55 — Closed(partial): store-propagation facet closed; cross-store and
  host-clone facets stay open.** Closed choice: invalidation retires the bytes
  and every later `resolve` of a derived holder fails closed with typed
  absence; summaries stay inline inert text (digest prefix at most, never
  payload), so no payload survives through them. Evidence: code
  `bitty-ai/crates/bitty-ai-runtime/src/context.rs` `invalidate`
  deletion-propagation contract (host MUST drop cached `AssembledContext`
  values pinning the invalidated generation); test
  `derived_records_fail_closed_after_invalidation` (pre-invalidation resolve,
  post-invalidation `ArtifactUnavailable`, no stale bytes); merged in
  `bitty-ai` `543e7d2` (AI-0125) on top of `e4ad1d5` (AI-0124). Stay-open
  facets with reasons: host-held clones, caches, and indexes (the store cannot
  reach into host-held copies; dropping them is an unenforced host obligation),
  and consistent cross-store removal of caches and indexes (no cross-store
  mechanism evidenced).

Evaluation AI-0144: the promoted context-store retention contract (owner
cs-commander-oc) was evaluated analysis-first for ArtifactStore alignment
and closed docs-only in `bitty-ai#279` (review probes PX-0563/PX-0564):
fundamental model gap between a content-addressed object graph with
ref-table and explicit sweep versus the shipped generation-keyed flat
buffer with exact-pin and single `invalidate`; candidate verdicts were
generation-pin already shipped (AI-0124/AI-0125),
invalidate-versus-unlink not alignable without breaking frozen tests,
closure rule a fundamental gap, pin set polarity-opposed (keep-alive
versus retire), counted report cosmetic without a sweep, and derived-key
index a new feature out of scope; AIQ-55 stays Closed(partial) with no
facet change.

These describe sibling behavior only as read; this repository was not modified
as part of those inspections beyond this register.

### AIQ-59 disposition (local draft only)

This disposition closes a register facet with implementation evidence. It sets
no owners or milestones, grants no global promotion, and uses Closed(partial)
wording only.

- **AIQ-59 — Closed(partial): runtime-bounded-reconcile facet closed;
  exactly-once and cross-boundary safe-retry facets stay open.** Closed
  choice: bounded status-query reconcile for `Unknown` tool effects with
  deterministic backoff ceilings and typed fail-closed escalation — queries
  inspect stored outcomes and never re-execute, the reconcile budget counts
  queries separately from tool dispatches, and an unresolvable `Unknown`
  escalates to a typed report that fails the session closed. Evidence: code
  `bitty-ai/crates/bitty-ai-runtime/src/reconcile.rs` (`ReconcileConfig`
  with `max_unknown_retries` default 3 (`DEFAULT_MAX_UNKNOWN_RETRIES`),
  `base_delay_ms` 100 (`DEFAULT_RECONCILE_BASE_DELAY_MS`), `max_delay_ms`
  5000 (`DEFAULT_RECONCILE_MAX_DELAY_MS`), hard caps
  `MAX_RECONCILE_ATTEMPTS` 16 and `MAX_RECONCILE_DELAY_MS` 30000 via
  `effective_retries` and `effective_max_delay_ms`;
  `ReconcileStatus::{Resolved, Pending}` with `Resolved(Unknown)` treated
  as still pending; `UnknownReconciler::reconcile` query-only seam keyed by
  `ExecutionId`; `UnknownEscalation` carrying `tool`, bounded `reason`,
  `attempts`, `dispatched`, and `delays_ms`; `ReconcileOutcome::{Resolved,
NoUnknown, Escalated}`; `reconcile_delay_ms` pure exponential backoff
  with saturating arithmetic), `agent.rs`
  (`AgentConfig::{max_unknown_retries, unknown_reconcile_base_delay_ms,
unknown_reconcile_max_delay_ms}` mirrored through `reconcile_config()`;
  `Agent::reconcile_unknown` leaving `MAX_TOOL_CALLS_PER_TURN` and the
  per-turn counter untouched, and converting budget exhaustion to
  `AgentError::UnknownUnresolved`); 9 `unknown_reconcile.rs` tests
  (`unknown_resolves_without_effect_reexecution`,
  `unknown_escalates_after_bounded_retries_with_typed_report`,
  `retry_budget_is_separate_from_tool_call_budget`,
  `backoff_schedule_is_deterministic`,
  `caller_clock_advance_by_reported_delays_enables_resolution`,
  `resolved_unknown_answer_is_treated_as_pending`,
  `reconcile_without_recorded_unknown_runs_no_query`,
  `zero_retry_budget_escalates_without_query`,
  `dispatch_identity_propagation_and_reconciler_inspection`) plus 5
  `reconcile.rs` unit tests (`backoff_doubles_and_holds_at_ceiling`,
  `backoff_clamps_to_hard_ceiling_and_saturates`,
  `config_bounds_hostile_budgets`,
  `reason_is_bounded_and_scrubbed_to_printable_ascii`,
  `fake_reconciler_replays_fifo_and_records_queries`); slice
  `host_conformance.rs` `Unknown` semantics
  (`execution_unknown_agreement_is_shared` fail-closed on mismatched
  `Unknown`, `execution_unknown_roundtrip_is_shared`: unknown stores,
  same-id re-execution refused, resolve closes the unknown); merged in
  `bitty-ai` `13ce4c6` (AI-0047, reconcile protocol), `f1adc2e` (AI-0063,
  clock contract), `01919b8` (AI-0112, reason normalization). Stay-open
  facets with reasons: exactly-once effects (reconcile only queries stored
  outcomes and reports uncertainty; no execution or delivery guarantee is
  evidenced) and cross-boundary safe retry (same-id re-dispatch is refused
  by design and retry across the terminal/IPC boundary stays a host and
  upstream decision; overlapping terminal/IPC routing, which stays open).

This describes sibling behavior only as read; this repository was not modified
as part of those inspections beyond this register.

## Commands and tools

Details: [command/tool architecture](../architecture/command-tool-architecture.md).

| ID     | Open choice                                                                                                          | Blocking feature and rationale                                                | Proposed routing                   |
| ------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------- |
| AIQ-31 | Trait/lint/review enforcement of Core/Lua split — Closed(partial): lint-gate enforcement facet only; see disposition | Design: AI mechanism ownership preserves terminal boundary                    | AI runtime, plugin API             |
| AIQ-32 | Workflow-to-AI-Core promotion review                                                                                 | Design: performance never permits terminal AI embedding                       | AI runtime, security               |
| AIQ-33 | Unified authorization/isolation backend                                                                              | Prerequisite: every native/MCP effect needs target, scope, consent and budget | AI runtime, terminal/IPC, security |
| AIQ-34 | Command registration API and versioning                                                                              | Design: compose with accepted plugin API                                      | AI runtime, plugin API             |
| AIQ-35 | Git primitives versus high-level wrappers                                                                            | Design: structured API or bounded authorized execution                        | AI runtime                         |
| AIQ-36 | Native versus MCP tool transport and bridge placement                                                                | Prerequisite: resolve conflicting drafts without direct-spool bypass          | AI runtime, terminal/IPC, security |
| AIQ-37 | Structured exec result schema — Closed(partial): runtime/slice-side outcome-vocabulary facet only; see disposition   | Prerequisite: disclose failures, truncation and Unknown outcomes              | AI runtime, terminal/IPC           |
| AIQ-38 | Generic execution and registry ownership across repositories                                                         | Prerequisite: preserve BA-2/BA-3, no model I/O in bitty-agent                 | AI runtime, terminal/IPC, security |

### AIQ-37 disposition (local draft only)

This disposition closes a register facet with implementation evidence. It sets
no owners or milestones, grants no global promotion, and uses Closed(partial)
wording only.

- **AIQ-37 — Closed(partial): runtime/slice-side outcome-vocabulary facet
  closed; wire/IPC schema facet stays open.** Closed choice: structured
  exec-outcome vocabulary with typed fail-closed disclosure — every dispatch
  leaves an attributed terminal `ToolExecution`, failures render typed
  single-line errors, truncation surfaces counted flags, and `Unknown`
  discloses its reason with dispatched counts instead of silent substitution.
  Evidence: code `bitty-ai/crates/bitty-ai-runtime/src/tool.rs`
  (`ToolExecution` L0 structured result shape, `ToolStatus::{Success,
Failed, Denied, Refused, Unknown}`, `Refused { cause: ToolError }`
  admission-only (`is_admission_refusal`, executor never contacted) versus
  `Denied { reason }` executor-after-contact, `ResultDisposition::{Accepted,
Rejected}` keeping an acknowledged `Success` while a rejected payload
  carries the typed bound failure, `ToolError::normalized` and
  `ToolStatus::normalized` bounded diagnostic policy, `MAX_TOOL_RESULT_BYTES`
  and `MAX_SUMMARY_BYTES` acceptance bounds), `agent.rs`
  (`ExecOutcome::{Completed, Failed, Canceled, Unknown}`,
  `execution_message` provider-visible mapping, `ExecutionRecord::{status,
result_disposition}`); 14 `result_schema_disclosure.rs` tests
  (`completed_discloses_final_text_and_records`,
  `failed_typed_error_display_is_single_line`,
  `failed_unknown_tool_renders_typed_error`,
  `failed_unknown_model_renders_typed_error_without_io`,
  `canceled_counts_scale_with_dispatches`,
  `unknown_discloses_reason_and_dispatched`,
  `success_maps_to_ok_word_and_message`,
  `denial_maps_to_denied_word_and_record`,
  `unknown_maps_to_unknown_word_and_record`,
  `rejected_result_keeps_success_and_emits_no_card`,
  `s2_store_full_fails_turn_with_typed_disclosure`,
  `truncation_accounting_surfaces_counted_bytes`,
  `truncation_never_leaks_dropped_records_to_provider`,
  `unknown_record_reason_stays_bounded`); runtime truncation accounting
  (`truncated_bytes`, `truncated_tokens_estimate`, `truncated_providers`) plus
  slice `ExecutionResult` (`ExecutionStatus::{Completed, Failed, Canceled,
Unknown}`, `EffectState::{Completed, Failed, Canceled, Unknown}`,
  `truncated` flag with budget-bounded `stdout_summary`/`stderr_summary`,
  `ExecutionResult::new`/`validate` with `validate_unknown_agreement`,
  `needs_reconciliation`, `is_untrusted_surface`); slice
  `host_conformance.rs` execution semantics (`execution_success_is_shared`,
  `execution_unknown_agreement_is_shared` fail-closed on mismatched `Unknown`,
  `execution_unknown_roundtrip_is_shared`: unknown stores, same-id
  re-execution refused, resolve closes the unknown,
  `execution_truncation_is_shared`: `truncated` flag with budget-bounded
  summaries on both hosts); merged in `bitty-ai` `3f364db` (AI-0077, disclosure
  proof), `201cfe9` (AI-0109, AI-RUN-004 effect/result/admission separation),
  `01919b8` (AI-0112, AI-RUN-008 reason normalization), `c44ee7b` (AI-0035,
  shared host conformance). Secret-free disclosure facet: AI-0138 adds a typed
  `SecretField` container that keeps secret values out of every diagnostic,
  trace, and snapshot surface — `Debug`/`Display` emit the fixed
  `[redacted secret]` marker unconditionally (no value, length, or prefix),
  `SecretError` Displays carry bounds not values, `is_absent_from` gates
  pre-queue/pre-write absence, `scrub_from` replaces every occurrence with the
  fixed marker, and seeded-secret negative tests prove absence across provider,
  consent/bridge, and turn-request snapshot surfaces (including the merged-commit
  review fix that stopped echoing the candidate surface into the test log);
  merged in `bitty-ai`
  `386952c` (AI-0138). Stay-open facets with reasons: wire/IPC schema
  with the terminal side (the terminal/IPC half of the outcome contract stays
  a host and upstream decision; overlapping terminal/IPC routing, which stays
  open).

### AIQ-31 disposition (local draft only)

This disposition closes a register facet with implementation evidence. It sets
no owners or milestones, grants no global promotion, and uses Closed(partial)
wording only.

- **AIQ-31 — Closed(partial): lint-gate enforcement facet closed; Lua/plugin API
  boundary review and workflow-promotion facets stay open.** Closed choice: a
  shell-based host-boundary lint gate (`scripts/host-boundary-lint.sh`) runs as a
  required quality-gate step (`just host-boundary-lint`) and enforces that no
  binding crate reaches the `bitty-ai-core` crate directly, covering the
  following bypass classes: (a) macro-mediated Core paths — the Core crate
  identifier is banned anywhere in binding text, not only adjacent to `::`, so
  `macro_rules!` forms that receive it as an argument are also closed; (b)
  source-graph escapes — every Cargo target source of a binding crate is scanned,
  not only `lib.rs`; (c) allowlist discipline — the gate maintains an explicit
  `ALLOWED_BINDINGS` list so any new binding crate must be added explicitly; (d)
  path-dependency escapes — `[patch]` and `[replace]` overrides that could
  silently reroute a crate around the boundary are detected and rejected. The gate
  runs in CI on every pull request and cannot be bypassed by a rename or indirect
  path. Evidence: `bitty-ai` `13f5861` (AI-0145, initial gate), `0446724`
  (AI-0149, bypass fixes round 1), `01f610f` (AI-0145/AI-0152, macro,
  source-graph, allowlist, and path-dep escape closures). Stay-open facets with
  reasons: Lua/plugin API boundary review (governance decision pending plugin API
  acceptance; the lint gate covers Rust bindings only); workflow-to-AI-Core
  promotion review (AIQ-32 owns the performance-driven embedding risk; no
  promotion has occurred so no evidence is needed yet).

This describes sibling behavior only as read; this repository was not modified
as part of those inspections beyond this register.

## Agent coordination

Details: [agent coordination](../agent/agent-coordination.md).

| ID     | Open choice                                                                                                               | Blocking feature and rationale                                                        | Proposed routing                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| AIQ-21 | Service compatibility-key validation/invalidation                                                                         | Prerequisite: incompatible targets/overlays must not share state                      | AI runtime, code intelligence                   |
| AIQ-22 | Cross-scope service non-disclosure mechanism                                                                              | Prerequisite: prove isolation or exclude sharing; filtering alone is not proof        | code intelligence, security                     |
| AIQ-23 | Lease heartbeat and crash reconciliation                                                                                  | Prerequisite: bounded supervised ownership cannot rely on destructors                 | AI runtime, terminal/IPC                        |
| AIQ-24 | Atomic ancestor/global budget reservation — Closed(partial): single-hop whole-batch admission facet only; see disposition | Prerequisite: concurrent delegation cannot overspend or double-spend                  | AI runtime, security                            |
| AIQ-25 | Measured depth/fan-out limits — Closed(partial): single-hop whole-batch admission facet only; see disposition             | Prerequisite: bounded delegation admission                                            | AI runtime, security                            |
| AIQ-26 | Independent review evidence criteria                                                                                      | Prerequisite: acceptance cannot derive from self-review/shared PASS                   | AI runtime, CarryCtx/lifecycle                  |
| AIQ-27 | Context graph traversal/cycle mechanism                                                                                   | Prerequisite: bounded retrieval under adversarial references                          | AI runtime, security                            |
| AIQ-28 | Critical-message acknowledgement and recovery                                                                             | Prerequisite: assignment/approval/cancel cannot silently drop or imply effect success | AI runtime, CarryCtx/lifecycle                  |
| AIQ-29 | Optional Panel/execution projection bindings                                                                              | Design: presentation movement cannot move execution targets                           | AI runtime, terminal/panel                      |
| AIQ-2A | No-UI execution feature profile                                                                                           | Scope: bounded work versus persistent services needs explicit selection               | AI runtime, terminal/IPC, standalone AI product |
| AIQ-2B | Supervisor crash recovery/adoption — Closed(partial): adoption-rule and no-replay facet only; see disposition             | Prerequisite: never adopt arbitrary survivors or repeat Unknown effects               | AI runtime, terminal/IPC, security              |
| AIQ-2C | Interactive writer fencing — Closed(partial): generation/epoch lease fencing facet only; see disposition                  | Prerequisite: takeover/restart must invalidate stale writers before new input         | AI runtime, terminal/IPC, security              |

### AIQ-24 and AIQ-25 disposition (local draft only)

This disposition closes a register facet with implementation evidence. It sets
no owners or milestones, grants no global promotion, and uses Closed(partial)
wording only.

- **AIQ-24 and AIQ-25 — Closed(partial): single-hop whole-batch admission
  facet closed; atomic multi-party reservation and measured depth/fan-out
  facets stay open.** Closed choice: single-hop whole-batch admission against
  the remaining logical-turn tool-call allowance — every provider round's
  calls are authorized and admitted as one batch against `remaining =
min(configured_limit, MAX_TOOL_CALLS_PER_TURN) - calls_this_turn`, and an
  over-allowance batch is refused whole with `CallLimitExceeded` carrying the
  effective limit, nothing dispatched and the counter unchanged (FS-AI1
  transactional denial; rejection is admission-only, never rollback of earlier
  rounds). Evidence: code
  `bitty-ai/crates/bitty-ai-runtime/src/tool.rs` (`ToolBus::begin_turn`
  per-turn counter reset, `ToolBus::calls_this_turn` cumulative scope across
  the turn's provider rounds, `ToolBus::precheck` whole-batch gate with
  `effective_limit = configured_limit.min(MAX_TOOL_CALLS_PER_TURN)`,
  `MAX_TOOL_CALLS_PER_TURN` 8, `ToolError::CallLimitExceeded`), `agent.rs`
  per-round transactional gate (`precheck(&calls, &precheck_base,
self.config.max_tool_calls_per_turn)` before any dispatch, FS-AI1
  whole-batch comment); unit test
  `precheck_rejects_a_batch_exceeding_remaining_allowance` (7 dispatches, then
  a 2-call batch refused whole with `CallLimitExceeded { limit: 4 }`, counter
  staying 7 with 7 executor calls) plus
  `precheck_rejects_a_later_batch_beyond_remaining_hard_allowance` (6
  dispatches, then a 3-call batch refused whole at the hard ceiling) and the
  `batch_evidence.rs` logical-turn budget coverage
  (`tight_configured_cap_is_cumulative_across_provider_rounds`,
  `later_batch_beyond_remaining_hard_allowance_is_rejected_whole`,
  `bus_whole_batch_admission_is_cumulative_and_rejects_whole_batches`); merged
  in `bitty-ai` `d71fc30` (AI-0108, AI-RUN-003). Cross-check: the [v0.1
  Implementation Profile](implementation-profile-v0.1.md) runs a single-agent
  loop only and keeps AIQ-24/AIQ-25 blocking "before the loop admits more than
  one hop", so this evidence covers the single-hop budget gate and nothing
  beyond it. Facet pointer: the closed single-hop whole-batch admission facet
  now resolves against the model window via
  `AgentConfig::effective_budget_bytes` (AI-0139, `bitty-ai` `8fd8f6e`);
  full evidence is recorded in the AIQ-01 disposition above, so none is
  duplicated here. Stay-open facets with reasons: atomic multi-party (global and
  ancestor) budget reservation across concurrent delegation (no concurrent
  reservation mechanism evidenced; the counter is a single-agent per-turn
  scope) and measured depth/fan-out bounds (no delegation-depth or
  direct-report measurement or enforcement evidenced); both are v0.1 non-goals
  (multi-agent budgets, hierarchical delegation).

### AIQ-2B and AIQ-2C disposition (local draft only)

This disposition closes register facets with implementation evidence. It sets
no owners or milestones, grants no global promotion, and uses Closed(partial)
wording only.

- **AIQ-2B — Closed(partial): adoption-rule and no-replay facet closed;
  cross-process transport and epoch election facets stay open.** Closed choice:
  supervisor adoption of crashed session state requires an explicit, typed
  `AdoptionClaim` where four fail-closed checks must all pass: (a) prior session
  must be in terminal `Failed` state (live sessions are never adopted;
  `Completed`/`Canceled` have no adoptable leftovers); (b) every carried
  `Unknown` effect must be explicitly claimed as `Escalated` (adopting as
  quarantined declarations; claimed `Reconciled` over unresolved evidence or
  omitted `Unknown`s refuse); (c) nothing replays (check takes no executor,
  returns declarative data only, and adopted ids stay foreign to the fresh
  session); (d) claim fence token matches current supervisor epoch. Evidence:
  code `bitty-ai/crates/bitty-ai-runtime/src/adoption.rs` (`AdoptionClaim`,
  `ClaimedUnknownEffect`, `UnknownDisposition`, `check_adoption`),
  `tests/recovery_adoption.rs` (four refusal verbs, exact-set coverage, no
  stowaway or missing evidence, quarantine of escalated unknowns, no-replay
  observable where executor call counts stay flat, stale fence token rejection);
  merged in `bitty-ai` (AI-0091). Stay-open facets with reasons: cross-process
  claim/evidence transport, supervisor epoch election, and persistent storage of
  fence tokens across machine restart.
- **AIQ-2C — Closed(partial): generation/epoch lease fencing facet closed;
  cross-process transport and persistent storage stay open.** Closed choice:
  interactive writer fencing enforces that any interactive writer holds a typed
  `WriterLease` (`writer_id`, `session_generation`, `epoch`), and `check_writer`
  refuses before input admission unless all three hold: (a) session is `Active`
  (terminal sessions refuse as `AlreadyTerminated`); (b) lease generation equals
  the session's current generation (takeover or restart via
  `AgentSession::rotate_generation` invalidates all outstanding leases as
  `StaleGeneration`, while fresh leases succeed); (c) lease epoch equals current
  supervisor epoch (`StaleEpoch`). Check order is terminal-first so dead
  sessions never leak fence timing. Evidence: code
  `bitty-ai/crates/bitty-ai-runtime/src/fencing.rs` (`WriterLease`,
  `check_writer`, `WriterRefusalReason`), `session.rs` (`rotate_generation`),
  `tests/writer_fencing.rs` (three refusal verbs, terminal-first check order,
  post-takeover blanket invalidation of prior leases, fresh lease admission);
  merged in `bitty-ai` (AI-0092). Stay-open facets with reasons: cross-process
  lease transport, supervisor liveness election, and durable persistence of
  fence state.

This describes sibling behavior only as read; this repository was not modified
as part of those inspections beyond this register.

## Code intelligence

Details: [code intelligence](../agent/code-intelligence.md).

| ID     | Open choice                                                                                                                        | Blocking feature and rationale                                             | Proposed routing              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------- |
| AIQ-41 | Document overlay coordination                                                                                                      | Prerequisite: conflicting buffers cannot silently share semantic state     | code intelligence             |
| AIQ-42 | Alias of AIQ-22: privileged-server filtering                                                                                       | Same prerequisite as AIQ-22; retained identifier, no independent closure   | code intelligence, security   |
| AIQ-43 | Incomplete fingerprint handling — Closed(partial): complete-input and disable-on-unknown facet only; see disposition               | Prerequisite: disable generic reuse/coalescing when equivalence is unknown | code intelligence, security   |
| AIQ-44 | Cache invalidation granularity — Closed(partial): generation/scope/artifact granularity denial facet only; see disposition         | Prerequisite: stale inputs cannot produce a falsely current PASS           | code intelligence             |
| AIQ-45 | Effectful coalescing equivalence/isolation mechanism                                                                               | Prerequisite: every waiter has its own grant; otherwise disable coalescing | code intelligence, security   |
| AIQ-46 | Syntax fallback disclosure format — Closed(partial): minimal-envelope fallback format facet only; see disposition                  | Prerequisite: fallback must be distinguishable from semantic evidence      | code intelligence             |
| AIQ-47 | Diagnostic rate limits and prioritization — Closed(partial): context-budgeted seed and reconcile query facet only; see disposition | Prerequisite: bounded attributed subscriptions                             | code intelligence, security   |
| AIQ-48 | Warm-service/restart policy                                                                                                        | Design: bounded supervisor policy within required isolation limits         | code intelligence, AI runtime |

### AIQ-43, AIQ-44, AIQ-46, and AIQ-47 dispositions (local draft only)

This disposition closes register facets with implementation evidence. It sets
no owners or milestones, grants no global promotion, and uses Closed(partial)
wording only.

- **AIQ-43 — Closed(partial): complete-input and disable-on-unknown facet
  closed; cross-process distribution and semantic equivalence facets stay
  open.** Closed choice: complete input fingerprints (`InputFingerprint`
  pinning `(digest, input_len)` via FNV-1a-64 over the entire input without
  truncation or stable-prefix shortcuts) with fail-closed construction
  (`FingerprintError::MissingInput`, `FingerprintError::UnknownComponent`) that
  disables generic reuse or coalescing whenever any component's equivalence is
  unknown. Evidence: code
  `bitty-ai/crates/bitty-ai-runtime/src/fingerprint.rs` (`InputFingerprint`,
  `FingerprintError`), `tests/input_fingerprint.rs` (deterministic FNV digest,
  fail-closed refusal on missing input, typed refusal with component index on
  unknown components, different inputs yield different digests); merged in
  `bitty-ai` (AI-0095). Stay-open facets with reasons: cross-process fingerprint
  distribution and compiler-specific semantic AST equivalence hashing.
- **AIQ-44 — Closed(partial): generation/scope/artifact granularity denial
  facet closed; fine-grained AST/symbol cache invalidation facets stay open.**
  Closed choice: fail-closed stale-PASS denial across four distinct boundaries:
  (1) generation granularity — records cached at generation N reject requests at
  generation N+1 with `StaleGeneration` before any provider I/O; (2) scope
  granularity — `CacheKey` enforces that Turn, Session, and Round scopes compare
  unequal over identical bytes, preventing scope-crossing cache reuse; (3)
  artifact-set granularity — foreign or evicted artifact references resolve as
  typed `ArtifactUnavailable` without synthetic substitution; (4) grant
  granularity — mid-turn tier downgrades deny remaining mutating dispatches at
  the boundary while preserving executed effects. Evidence: code
  `bitty-ai/crates/bitty-ai-runtime/tests/granularity_denial.rs` (10 tests
  pinning all four granularities); merged in `bitty-ai` (AI-0094). Stay-open
  facets with reasons: fine-grained AST/symbol-level cache invalidation and
  distributed cache eviction.
- **AIQ-46 — Closed(partial): minimal-envelope fallback format facet closed;
  interactive client rendering negotiation stays open.** Closed choice:
  structured disclosure failures fall back to a permanently-readable minimal
  envelope (`FallbackEnvelope`: `id` + `kind` + `text`) encoded via versioned,
  length-prefixed framing (`fallback/1`) that is fail-closed, byte-bounded, and
  distinguishable from semantic evidence without silent truncation. Evidence:
  code `bitty-ai/crates/bitty-ai-runtime/src/fallback.rs` (`FallbackEnvelope`,
  `FallbackError`, `fallback_for`), `tests/fallback_envelope.rs` (bounded field
  enforcement, length-prefixed framing, fail-closed malformed decoding, total
  error recovery); merged in `bitty-ai` `cbbffeb` (AI-0097). Stay-open facets
  with reasons: interactive client rendering negotiation and semantic error
  recovery.
- **AIQ-47 — Closed(partial): context-budgeted seed and reconcile query facet
  closed; streaming diagnostic push rate-limiting stays open.** Closed choice:
  diagnostic rate pressure is bounded through existing runtime controls —
  diagnostic inputs enter only as `provider: "diagnostics"` seed records
  subject to the context byte budget (greedy include with counted truncation),
  `Low` effective-priority drop-first order, and the `Unknown` reconcile query
  budget (`ReconcileConfig::effective_retries`), with zero free/unbounded status,
  subscription, or telemetry methods exposed on the agent surface. Evidence:
  code `bitty-ai/crates/bitty-ai-runtime/tests/subscription_bounds.rs` (proving
  zero unbudgeted telemetry methods and bounded reconcile query paths); merged
  in `bitty-ai` (AI-0093). Stay-open facets with reasons: streaming diagnostic
  push rate-limiting and external subscriber backpressure.

This describes sibling behavior only as read; this repository was not modified
as part of those inspections beyond this register.

## Persistence and evidence

Details: [persistence/evidence](../persistence/persistence-evidence.md).

| ID     | Open choice                                                                                                                  | Blocking feature and rationale                                                              | Proposed routing                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| AIQ-51 | Schema and transaction boundaries — Closed(partial): content-addressed store facet only; see disposition                     | Design: select representation for chosen durable feature profile                            | AI runtime                                  |
| AIQ-52 | State reconstruction versus effect re-execution contract                                                                     | Prerequisite: replay must not silently rerun effects                                        | AI runtime, security                        |
| AIQ-53 | Backend and optional search index — Closed(partial): SQLite content-addressed backend facet only; see disposition            | Design: FTS5 is not inherent to event storage/replay                                        | AI runtime                                  |
| AIQ-54 | Cross-store retention policy authority                                                                                       | Prerequisite: host limits constrain user/tool preferences                                   | AI runtime, security                        |
| AIQ-55 | Deletion/expiry and derived-record invalidation — Closed(partial): store-propagation facet only; see disposition             | Prerequisite: remove payloads, summaries, caches and indexes consistently                   | AI runtime, security                        |
| AIQ-56 | Alias of AIQ-10: CarryCtx persistence integration                                                                            | Same design classification as AIQ-10; backend/handoff facet, not separate lifecycle owner   | AI runtime, CarryCtx/lifecycle              |
| AIQ-57 | Reconstruction after deletion, expiry or destructive journal reduction                                                       | Prerequisite: disclose missing evidence; projection-only compaction need not lose originals | AI runtime, security                        |
| AIQ-58 | Per-reader evidence sharing enforcement                                                                                      | Prerequisite: cache references cannot leak broader authority                                | AI runtime, security                        |
| AIQ-59 | Unknown effect reconciliation and retry eligibility — Closed(partial): runtime-bounded-reconcile facet only; see disposition | Prerequisite: event log alone grants neither exactly-once nor safe retry                    | AI runtime, terminal/IPC, security          |
| AIQ-5A | Typed redaction markers and invalidation mechanism — Closed(partial): container-level redaction facet only; see disposition  | Prerequisite: implement mandatory pre-queue/pre-write redaction, not choose its timing      | AI runtime, security                        |
| AIQ-5B | Bounded authorized observability queries                                                                                     | Design: query needs and performance evidence; optional FTS                                  | AI runtime                                  |
| AIQ-5C | Standalone AI persistence/release profile                                                                                    | Scope: neither ephemeral v0.1 nor post-1.0 deferral is decided                              | standalone AI product, AI runtime, security |

AIQ-10/56 and AIQ-22/42 are stable aliases, not removed or renumbered IDs.
Any promotion must reconcile all references and retain the alias mapping.
Other overlapping topics (for example context priority and cross-store retention)
retain their distinct facets; this register claims no count of independent OQs.

### AIQ-5A disposition (local draft only)

This disposition closes a register facet with implementation evidence. It sets
no owners or milestones, grants no global promotion, and uses Closed(partial)
wording only.

- **AIQ-5A — Closed(partial): container-level redaction facet closed;
  mandatory pre-queue/pre-write TIMING and marker/invalidation facets stay open.**
  Closed choice: a typed `SecretField` container with unconditional redaction —
  `Debug`/`Display` emit the fixed `[redacted secret]` marker (no value,
  length, or prefix), construction fails closed on empty or over-bound
  (`SecretError::{Empty, TooLong}` with value-free error Displays),
  `expose_for_adapter` is the single intentionally-named raw-value path pinned
  to the host adapter edge, and `is_absent_from`/`scrub_from` gate or scrub
  diagnostics before they reach a queue or file. Consent separation is pinned
  alongside: an `ai.provider` grant satisfies its exact triple only and never
  cross-fills streaming or Tool Bus scopes (and vice versa). Evidence: code
  `bitty-ai/crates/bitty-ai-runtime/src/secret.rs` (`SecretField`,
  `SecretError`, `MAX_SECRET_LEN` 4 KiB, `SECRET_REDACTED`,
  `is_absent_from`/`scrub_from` pre-queue/pre-write helpers, `PROVIDER_SCOPE`
  `ai.provider`); 10 unit tests
  (`secret_field_debug_and_display_redact_unconditionally`,
  `secret_field_construction_fails_closed`,
  `expose_for_adapter_is_the_only_raw_value_path`,
  `is_absent_from_proves_absence_before_queue_or_write`,
  `scrub_from_replaces_every_occurrence_pre_write`,
  `scrub_from_handles_non_utf8_secret_bytes`,
  `provider_grant_does_not_satisfy_other_scopes_and_vice_versa`,
  `seeded_secret_appears_nowhere_in_provider_diagnostics`,
  `seeded_secret_appears_nowhere_in_consent_and_bridge_surfaces`,
  `seeded_secret_appears_nowhere_in_turn_request_snapshot`) with the
  `assert_secret_absent` helper naming the label only (the review fix in the
  merged commit stopped echoing the candidate surface into the test log);
  merged in `bitty-ai` `386952c` (AI-0138). Stay-open facets with reasons:
  mandatory pre-queue/pre-write redaction TIMING (helpers exist but no queue
  or write path is shown calling them; enforcement stays a host and upstream
  decision), and typed marker representation plus invalidation mechanics
  (fixed `[redacted secret]` container marker only; no marker/invalidation
  protocol or derived-record invalidation beyond it is evidenced).

### AIQ-51 / AIQ-53 disposition (local draft only)

This disposition closes register facets with implementation evidence. It sets
no owners or milestones, grants no global promotion, and uses Closed(partial)
wording only.

- **AIQ-51 — Closed(partial): content-addressed store schema facet closed;
  transaction isolation, migration, and full feature-profile schema facets
  stay open.**
  Closed choice: a content-addressed store with three SQLite tables (`blobs`,
  `checkpoints`, `refs`) and supporting indexes. `blobs` stores deduplicated
  immutable byte payloads keyed by SHA-256 `ContentHash` (32-byte typed
  wrapper, strict lowercase 64-hex validation), bounded by `MAX_BLOB_BYTES`
  (16 MiB), with cryptographic integrity verification on read.
  `checkpoints` stores DAG commit nodes with `task_id`, `agent_id`,
  `summary`, `timestamp_ms`, serialized `Rationale` (structured cognitive
  record: `why`, `what`, `where_focus`, `how`, `expected`, `observed`, each
  bounded by `MAX_RATIONALE_FIELD_BYTES` 4096, total bounded by
  `MAX_RATIONALE_TOTAL_BYTES` 16384), serialized parent list (bounded by
  `MAX_CHECKPOINT_PARENTS` 16), and `tree` blob reference (existence-verified).
  Checkpoint identity uses versioned length-prefixed canonical hashing
  (`checkpoint:v2\0` with `u64` big-endian length prefix per field) to
  prevent delimiter-collision attacks. `refs` stores mutable HEAD and
  branch pointers with existence-verified targets. `INSERT OR IGNORE`
  provides conflict tolerance for concurrent writers. DAG operations
  include backward `log` traversal and `merge_base` (lowest common
  ancestor) calculation. Evidence: code
  `bitty-ai/crates/bitty-ai-slice/src/content_store.rs` (`ContentHash`,
  `BlobStore`, `Rationale`, `CheckpointDraft`, `Checkpoint`, `ContentStore`,
  `ContentStoreError` including `CorruptCheckpoint`); 8 integration tests
  (`blob_dedup_and_integrity`, `rationale_field_limit`,
  `checkpoint_chaining_and_refs`, `log_and_merge_base`, `facade_content_store`,
  `content_hash_format_validation`,
  `unambiguous_canonical_hashing_prevents_field_injection`,
  `corrupt_checkpoint_detection_on_sqlite_tamper`); merged in `bitty-ai`
  `9b83315` (AI-0162). Stay-open facets with reasons: transaction isolation
  (single-connection serialized access only; no WAL or multi-writer policy),
  schema migration (no versioned migration path), and full feature-profile
  schema (event log, effect ledger, and retention metadata tables are not
  yet represented).

- **AIQ-53 — Closed(partial): SQLite content-addressed backend facet closed;
  optional FTS5 search index and alternative backend facets stay open.**
  Closed choice: SQLite (via `rusqlite` 0.40.2 with `bundled` feature) as
  the content-addressed store backend, supporting both persistent (file-backed)
  and in-memory modes via `AiEngine::open_content_store` and
  `AiEngine::open_in_memory_content_store`. The backend provides: content
  addressing with SHA-256, deduplication via `INSERT OR IGNORE`, bounded
  blob storage (16 MiB per blob), checkpoint integrity verification on read
  (recomputing canonical hash and returning `CorruptCheckpoint` on mismatch),
  DAG traversal (log, merge_base), and reference management. Evidence: same
  implementation and tests as AIQ-51 above; merged in `bitty-ai` `9b83315`
  (AI-0162). Stay-open facets with reasons: optional FTS5 full-text search
  index (not implemented; AIQ-5B bounded observability queries must inform
  whether FTS is warranted), and alternative backend evaluation (embedded
  key-value stores, remote-capable backends, or hybrid configurations are
  not explored).

This describes sibling behavior only as read; this repository was not modified
as part of those inspections beyond this register.
