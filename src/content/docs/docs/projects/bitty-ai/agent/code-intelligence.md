---
title: Code intelligence architecture
description: LSP sharing, stateful mediation, lint/build/test reuse, and verification fingerprinting
category: architecture
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 33
---

# Code intelligence architecture

## Purpose and scope

This specification defines shared code intelligence services for `bitty-ai`: language server protocol (LSP) sharing with stateful mediation, lint/build/test result reuse with verification fingerprinting, and bounded scheduling with authorization checks. The design separates tool service lifecycle from agent lifecycle while preserving per-agent authorization and attribution.

**Draft relationship**: [Agent Coordination Architecture](agent-coordination.md) service supervision model. Neither draft accepts these mechanisms.

## Stateful language-service mediation

Retain a semantic tool surface rather than arbitrary model-generated LSP calls (source lines 206-261). Return source identity, snapshot/document version, method, provider, freshness, confidence, and truncation. Syntax search is a useful fallback but cannot silently claim semantic equivalence to language-service references or rename.

A proposed broker acts as the protocol client and owns initialization, document open/change/close ordering, versioned overlays, request correlation, bounded notifications, cancellation, and shutdown. Many agents are consumers of this client, not independent writers into a shared server stream. Conflicting edits to one URI require a single authoritative overlay or separate service state.

Late diagnostics carry their document version; unknown freshness is visible. Server restart invalidates outstanding request generations and rehydrates only authorized document state.

Formatting, rename, code actions, server-command execution, and server-initiated edits are effectful proposals. Apply through the existing permission and expected-revision ChangeSet path, never implicitly because a server returned an edit. Starting a supposedly read-only analysis server may execute project build logic; tool availability does not authorize process creation, project code, or network access.

## Lint, build, test, and evidence reuse

Retain bounded scheduling and request coalescing (source lines 262-456), but distinguish four operations: sharing a language server, joining an in-flight check, reading an existing result, and skipping a new execution because a cache is eligible. They need different correctness and consent rules.

### Verification fingerprinting

The proposed `WorkspaceRevision = HEAD + dirty hashes + config` is incomplete. A verification fingerprint also needs:

- relevant untracked/generated files
- submodule state
- deletions
- symlink identities and target policy
- unsaved overlay
- tool executable/version
- exact argv
- cwd/target
- dependency resolution/lockfiles
- environment profile
- applicable isolation policy

An input manifest must state what was included and what could not be captured. Changing only ignored build inputs can change an outcome without changing Git HEAD.

Prefer immutable authorized snapshots for reusable work. On a mutable tree, before/after validation can detect many races but does not prove that the tool observed a coherent snapshot during execution. Mark such evidence accordingly; do not certify a PASS for the current tree when its input identity is unknown.

Clock-, network-, randomness-, external-service-, and machine-dependent tests are non-cacheable by default unless a reviewed adapter constrains those inputs.

### Candidate eligibility sequence

1. Validate caller, target, tool, effect class, budgets, and current consent.
2. Resolve a bounded input manifest and reuse policy; unknown inputs disable generic caching and in-flight merging of effectful work.
3. Coalesce only compatible executions with independent waiter cancellation; retain per-request attribution without counting one physical run as several.
4. Store an immutable result with execution ID, fingerprint, tool/adapter version, status, exit code, timestamps, completeness, and evidence references.
5. Reauthorize the reader and validate freshness/reuse policy before delivery. Report `reused from execution` distinctly from `executed now`.

Tests and build scripts can mutate files or contact services. A cache hit is not an authorization grant for the original command; conversely reading an already authorized, redacted result need not rerun it. Shared target directories need tool-aware serialization/isolation; do not coalesce `build`, `check`, `test`, and `clippy` as interchangeable results. Independent review may reuse evidence but must retain the option or requirement to request a fresh run. Cached PASS never supplies independent approval.

### Bounded scheduling and fairness

Use per-target queues with fairness, explicit priority aging, bounded admission, and tool-aware exclusive resources. Deduplication is an optimization subordinate to correctness, not an unconditional requirement. If equivalence cannot be proved, queue a separate authorized execution or return unsupported.

For a manifest scanning B input bytes, full fingerprint construction is O(B) time and O(F) metadata space for F files; incremental invalidation can reduce work but must handle watcher loss through rescan. Hash-map lookup is expected O(1) after key construction. Shared execution saves duplicate work only for eligible requests; no numerical savings are claimed.

## LSP broker responsibilities

The LSP broker proposed by the critical synthesis owns:

1. **Initialization**: negotiate capabilities, workspace folders, initialization options per service compatibility key.
2. **Document lifecycle**: open/change/close ordering, versioned overlays, single authoritative state per URI.
3. **Request correlation**: track request IDs, bounded timeout, cancellation propagation.
4. **Notification bounds**: rate-limit diagnostics, file watching, progress; prevent unbounded queue growth.
5. **Shutdown**: graceful exit with bounded timeout, process termination, resource cleanup.

Multiple agents consume the broker's client; they do not write directly to the server stream. The broker validates caller authorization before forwarding requests and before delivering results. Revocation prevents new requests from a revoked principal even if the server remains alive for others.

## Semantic tool surface

Proposed semantic tools (not arbitrary LSP):

- **Definitions**: `code.find_definitions(uri, position, workspace_view) -> Vec<Location>`
- **References**: `code.find_references(uri, position, include_declaration, workspace_view) -> Vec<Location>`
- **Symbols**: `code.document_symbols(uri, workspace_view) -> Vec<DocumentSymbol>`
- **Workspace symbols**: `code.workspace_symbols(query, workspace_view) -> Vec<SymbolInformation>`
- **Hover**: `code.hover(uri, position, workspace_view) -> Option<Hover>`
- **Diagnostics**: subscribe to bounded diagnostic stream with version/freshness metadata

Each result carries:

- source identity (file URI, git revision, overlay generation)
- snapshot/document version
- method and provider (LSP server, syntax fallback, stale cache)
- freshness (milliseconds since computation, server generation)
- confidence (High: semantic, Medium: syntax, Low: stale/fallback)
- truncation indicator

Syntax-based fallback is clearly labeled; it never claims semantic equivalence. Unknown freshness is visible in result metadata.

## Effectful proposals

Formatting, rename, code actions, and server commands return proposals, not immediate edits:

1. Server returns `WorkspaceEdit` or `TextEdit[]`
2. Broker packages as a proposal with source, expected document versions, edit set
3. Agent requests permission through existing ChangeSet path
4. User/policy approves or denies
5. On approval, runtime applies edits with expected-revision check
6. Server receives `didChange` notifications for successful edits

Never apply server-initiated edits implicitly. Starting an analysis server may execute project build logic; tool availability does not authorize process creation or network access.

## Authorization and isolation

- Authorize each acquisition, query, result delivery, and diagnostic subscription against the current caller.
- Never union the capabilities of all attached agents.
- A lease references a service; it is not a transferable permission token.
- A privileged server indexing files beyond a narrow caller's read scope requires proven non-disclosure or separate service domains. Post-query filtering alone is not proof; exclude cross-scope sharing when isolation cannot be established.
- Document overlays are per-agent or per-workspace-view; conflicting edits to one URI require separate service state or coordination.

## Service state and recovery

LSP services follow the supervision model from [Agent Coordination Architecture](agent-coordination.md):

- States: Starting, Ready, Idle, Draining, Stopped, Failed
- Fresh generation on restart invalidates outstanding requests
- Rehydrate only authorized document state after restart
- Track launch identity and descendants; never adopt arbitrary survivors
- Under pressure: stop admitting optional work, evict idle instances, bound restarts with backoff

## Design rationale summary

Code intelligence sharing reduces duplicate language server instances and redundant builds while preserving per-agent authorization and attribution. Stateful LSP mediation prevents conflicting document state and orders lifecycle operations correctly. Verification fingerprinting enables safe result reuse by capturing complete input identity rather than only Git HEAD. Semantic tool surfaces prevent arbitrary LSP command generation while providing progressive disclosure and clear confidence/freshness metadata.

## Verification plan

This specification records the candidate direction through its critical synthesis; comparative source observations retain their separately pinned provenance. It does **not** establish implementation of these code-intelligence proposals. Verification requires:

- Accepted architectural decision records in `bitty-docs` for LSP sharing and result reuse
- `bitty-ai-core` Rust implementation of LSP broker, verification fingerprinting, result cache
- LSP broker with document lifecycle, request correlation, notification bounds
- Verification fingerprint schema and manifest builder
- Result cache with authorization checks and freshness metadata
- Semantic tool API with confidence and truncation indicators
- Performance evidence showing shared LSP reduces duplicate work
- Security evidence showing result filtering prevents cross-scope leakage

## Open points

1. **Document overlay coordination**: When multiple agents edit the same URI in separate overlays, how are conflicts detected and resolved? Does each agent need a separate LSP server instance, or can the broker maintain multiple versioned overlays?

2. **Result filtering for privileged servers**: When a language server indexes files beyond a caller's read scope, what is the filtering mechanism? Is post-query filtering sufficient, or must the server be configured with per-caller file access limits?

3. **Fingerprint incompleteness handling**: When an input manifest cannot capture all relevant inputs (e.g., external service dependencies, ambient environment), should the execution proceed with a "partial fingerprint" marker, or refuse with unsupported?

4. **Cache invalidation granularity**: Are cached results invalidated at file granularity, directory granularity, or full workspace? How are transitive dependencies tracked for incremental invalidation?

5. **Effectful coalescing safety**: Which equivalence and isolation evidence permits joining an effectful execution? Each waiter needs its own authorization; the first caller's grant never authorizes later waiters. Disable coalescing until this prerequisite is satisfied.

6. **Syntax fallback disclosure**: When semantic analysis fails and syntax fallback is used, how is this communicated to the user? Is it a visible warning, a result metadata field, or both?

7. **Diagnostic rate limiting**: What is the rate limit for diagnostic notifications? Per-agent, per-workspace, or global? How are diagnostics prioritized when the limit is exceeded?

8. **Server restart policy**: When should an LSP server be restarted rather than kept warm? After N failures, after idle timeout, on workspace configuration change, or user request?

### Follow-up work

1. Independent review of this specification against agent coordination architecture.
2. Resolve unresolved questions through targeted RFCs or open-question register entries.
3. Define verification fingerprint schema and manifest format.
4. Specify LSP broker protocol and document overlay coordination.
5. Define semantic tool API surface and result metadata schema.
6. Implement result filtering mechanism for privileged servers.
7. Update `docs/README.md` navigation if this specification is accepted.

## References

- [Agent Coordination Architecture](agent-coordination.md) (Draft): service supervision model
- [AI Architecture](../architecture/ai-architecture.md) (Draft): tool bus and execution profiles
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): permission model for effectful proposals
