---
title: Audited git wrapper API design
description: Draft candidate API shape for audited version-control access behind a permission-scoped wrapper
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 59
---

# Audited git wrapper API design

> Status: **draft**. This document is a candidate API shape for owner decision
> DEC-0006 (AIQ-35: git primitives versus high-level wrappers): the audited
> wrapper through which agent workflows would reach version-control reads. It
> proposes no accepted architecture, authorizes no shipped behavior, closes no
> Artificial Intelligence Question entry, mints no AIQ or OQ identifier,
> introduces no product code, and changes no accepted document. The accepted
> [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) and the normative security corpus
> override any statement here. Every source anchor below is read-only survey
> evidence at `bitty-ai` `main` `97d3125`; no file in the `bitty-ai`
> repository was modified.

## Purpose and scope

This design answers the AIQ-35 row recorded in
[AI Unresolved Questions](../product/ai-unresolved-questions.md): whether
agent version-control access arrives as raw git primitives or as a structured,
permission-scoped wrapper. This document proposes the wrapper side of that choice and sketches
its API and audit shape. Selecting the wrapper over primitives, or rejecting
both in favor of bounded authorized execution, stays with the owner under
DEC-0006; nothing here pre-decides it.

Inputs are the draft [Command and Tool
Architecture](../architecture/command-tool-architecture.md) (Core implements mechanism, Lua
implements policy and workflow), the draft [Tool transport
R2](../architecture/tool-transport-r2.md) (unified authorization backend with fail-closed
denial), the draft [HostBoundary trait and lint-gate
design](../architecture/host-boundary-trait-design.md) (seam inventory over `ToolBus`,
provider selection, and disclosure primitives), and the draft
[Prototype-to-Core promotion checklist](../architecture/prototype-promotion-checklist.md)
(deterministic doubles and house-style gates derived from AI-0076 through
AI-0097).

## Demand survey (read-only evidence at `bitty-ai` `main` `97d3125`)

### A git provider is named in vocabulary, not implemented

The runtime vocabulary already reserves a `git` slot with no mechanism
behind it. `crates/bitty-ai-runtime/src/context.rs:79` declares
`KNOWN_PROVIDERS` as `["workspace", "project", "git", "diagnostics",
"terminal"]`, and `crates/bitty-ai-runtime/src/session.rs:177` documents
reading "workspace/project/git/diagnostics/zone-scoped snapshots". The only
other `git` mention in the runtime is a prose truncation example
("project manifest, git stat" at `context.rs:255`). A git-scoped context
source is therefore anticipated by name, but no code produces one: there is
no provider, no snapshot path, and no read that consults a repository.

### The only git-shaped execution today is opaque argv in test doubles

The two remaining `git` hits in the surveyed crates are identical scripted
argv in slice host doubles, never an execution:

- `crates/bitty-ai-slice/src/fake_host.rs:830`
- `crates/bitty-ai-slice/src/live_host.rs:584`

Both read `ExecutionRequest::new("git", vec!["diff".to_owned()])` inside
`#[cfg(test)]` modules that prove Unknown-reconciliation, not git access.
`ExecutionRequest` itself is imported from the external `bitty_ipc` crate
(`fake_host.rs:76-77`); the runtime's `bridge.rs:23-25` describes it as
"(executable, args, cwd, closed `EnvPolicy`, target, timeout, output
budget)" dispatched through the `process.spawn` scope plus consent plus
explicit effect opt-in. The executable plus args travel as opaque strings:
nothing validates that `("git", ["diff"])` is well-formed, read-only, or
bounded, and nothing distinguishes it from `("git", ["push", "--force"])`
short of parsing argv after the fact. Any future agent workflow that needs
blame, log, or diff output would inherit exactly this opacity if it reaches
for the generic execution path directly.

Prospective consumers of version-control reads, all currently unserved:

- Context assembly: the `git` entry in `KNOWN_PROVIDERS` plus the
  git-scoped snapshot contract in `session.rs:177` describe a reader that
  does not exist yet.
- Provenance for code intelligence: the draft [Code intelligence sharing
  R4](../architecture/code-intelligence-sharing-r4.md) leans on verification reuse and
  fingerprinting, whose natural evidence (who changed a line, what range
  introduced a fault) is blame- and log-shaped.
- Diff-shaped payloads already in transport: `stream.rs:38` carries
  "Unified diff with bounded per-hunk text" as a fragment-transport format,
  so a bounded-diff producer would meet an existing consumer shape.

No caller exists for any of these today; the demand is prospective, and this
document claims only the vocabulary slot plus the argv-shaped gap, not a
committed feature.

### No process-spawn surface exists in Core

`rg -i 'process|Command|Stdio|spawn|git' crates/bitty-ai-runtime/src/
crates/bitty-ai-slice/src/` over the inspected `bitty-ai` checkout returns
hits, but none of them is a spawn primitive:

- `std::process` appears only in module-doc denials ("no `std::net`,
  `std::process`, `std::fs`, async runtime, or IPC" in `fake_host.rs:68`
  and `live_host.rs:68`) and once as test-only `std::process::id()` for a
  unique journal path (`journal_prototype.rs:440`).
- No `std::process::Command`, no `Stdio`, no `tokio::process`, and no
  third-party runner (`duct`, `escargot`, or similar) anywhere in either
  crate: `rg -n 'std::process|process::Command|Command::new|Stdio|
tokio::process|duct::|escargot'` matches only the three lines above.
- `thread::spawn` appears only in `local_provider.rs` test stubs (`:1362`,
  `:1447`): one-shot loopback servers for header-behavior tests, not
  production concurrency.
- Every other `process` hit is prose about process-global counters,
  process-unique ids, process-local consent stubs, or cross-process
  transports that are explicitly absent ("Stub (deliberately absent)" in
  `fencing.rs` and `adoption.rs`).
- `Scope::ProcessSpawn` is a consent-scope label consumed by the slice
  host doubles (`fake_host.rs:726`, `live_host.rs:576`), not a call that
  spawns anything: the doubles serve scripted `RawExecutionOutput` behind
  `request.validate()`, attribution, and store (mirroring
  `ExecutionService::dispatch`, per `fake_host.rs:513-523`), and refusals
  store nothing.

Conclusion: the Core cannot spawn a child process today, and the generic
execution path it mirrors belongs to the host side (`bitty` #707), not to
the runtime. Any version-control capability must therefore arrive either as
opaque host-executed argv or as a purpose-built wrapper in front of that
path. [Alternatives considered](#alternatives-considered) argues that the
wrapper is the only auditable choice.

## No existing git or version-control abstraction

`rg -in 'gitwrapper|git_client|version.?control|VcClient|trait.*Git|
struct.*Git' crates/bitty-ai-runtime/src/ crates/bitty-ai-slice/src/`
returns no match (clean exit). Symbol-shaped searches confirm the gap:
`blame` has zero code hits, and the `commit`/`diff`/`log` hits are all
prose — "two-phase commit" atomicity in `context.rs`, "differing bytes"
comparisons in `prompt.rs`/`fragment_transport.rs`, and the "Unified diff"
transport format in `stream.rs:38`. There is no trait, struct, module, or
test double for version control anywhere in either crate. The wrapper
proposed below is greenfield: it migrates nothing and deprecates nothing.

## Proposed wrapper API shape (illustrative sketch)

The block below is an illustrative design sketch, not product code. It must
not be copied into a crate as an implementation; it exists so reviewers can
judge the shape before any task is scoped. Names, bounds, and error types
are placeholders. The surface is deliberately read-only: blame, log, and
diff cover the surveyed prospective demand, and no write path is proposed.

```rust
// Illustrative sketch only: candidate audited git wrapper shape, not product code.
// Read-only operations over validated handles; the host owns execution, the
// wrapper owns validation, bounding, and the audit record.
pub trait GitWrapper {
    type Error;

    // Line provenance for one file at one revision. Line numbers are
    // 1-based; out-of-range lines fail closed with a typed error.
    fn blame(&self, repo: &RepoHandle, file: &RepoPath, line: u32) -> Result<BlameView, Self::Error>;

    // Bounded history over a validated revision range. The caller supplies
    // the entry budget; the wrapper refuses unbounded ranges.
    fn log(&self, repo: &RepoHandle, range: &RevRange, budget: u32) -> Result<LogView, Self::Error>;

    // Bounded unified diff between two validated revisions over an explicit
    // path set. Empty path sets and unresolvable revisions fail closed.
    fn diff(
        &self,
        repo: &RepoHandle,
        base: &RevSpec,
        head: &RevSpec,
        paths: &[RepoPath],
    ) -> Result<DiffView, Self::Error>;
}
```

Permission-scoped inputs: `RepoHandle` binds one repository root the caller
is granted to read (no bare paths, no `..` escapes, no second-repository
reads on one handle); `RepoPath` is a validated repository-relative path;
`RevSpec`/`RevRange` accept only fully resolved revisions the wrapper has
validated, never shell-shaped range expressions. Outputs are bounded views
(`BlameView`, `LogView`, `DiffView`) carrying truncated flags and the
`is_untrusted_surface` label, mirroring the `ToolSuccess` bounded-payload
discipline (`tool.rs:461`).

Deterministic test double shape, mirroring `FakeToolExecutor`
(`tool.rs:516-569`): a scripted `FakeGit` replays FIFO outcomes per
operation, records every invocation as `(op, validated-inputs)` pairs, and
takes caller-supplied time where timestamps appear. Tests run without a
`git` binary, without the filesystem, and without the clock.

House style for any future production surface follows gate 5 of the
[promotion checklist](../architecture/prototype-promotion-checklist.md): fail-closed typed
errors with `Display` plus `std::error::Error` impls, `#[must_use]` on
constructors and pure predicates, `# Errors` docs on fallible constructors,
`#![deny(unsafe_code)]`, and std-only dependencies.

## Audit record shape (illustrative sketch)

Every wrapper call appends one record, mirroring the `ToolExecution`
call-record discipline (`tool.rs:444-456`) the executor pattern already
proves. Field names are placeholders:

- `execution_id`: attribution handle for this call, joining the record to
  the dispatch that authorized it.
- `op`: the enumerable operation (`blame`, `log`, `diff`); never argv.
- `repo`: the bound `RepoHandle` identity, not a raw path string.
- `inputs`: the validated operation inputs (file plus line, revision
  range plus budget, revision pair plus path set).
- `status`: structured outcome including an `Unknown` arm with the
  reconcile-before-retry rule (MP-7: never blindly retry); refusals store
  the denial and no output bytes.
- `summary` plus bounded `data`: always-inline L0 shape with truncation
  flags, mirroring `ToolSuccess` bounds.
- `is_untrusted_surface`: set on every record; wrapper output is
  observation data, never instructions.
- `consent_ref`: the scope grant plus consent this call consumed, so a
  reviewer can replay which authorization covered which read.

What gets logged per call is therefore the validated intent plus the
bounded outcome plus the authorization consumed — enough to answer "who
read what, through which grant, and what came back" without re-running
anything.

## What this design does not cover

- Effectful operations. Commit, push, fetch, checkout, and clean have no
  sketch here; a write path would need its own scope, consent, lease, and
  Unknown-reconciliation story and is explicitly deferred.
- Host policy. Budgets, consent evaluation, capability grants, and
  redaction stay with the R2 unified authorization backend and the
  security corpus; the wrapper carries a consent reference, it never mints
  one.
- Transport and presentation. Wire framing, Panel projection, and
  rendering stay with the accepted [IPC and Agent
  RFC](../specifications/ipc-agent-rfc.md); the wrapper returns bounded views, never wire
  bytes.
- Loader and execution mechanics. How the host executes the underlying
  read (subprocess, library, sandbox) is a host implementation choice
  behind the trait; this design constrains what the agent may request, not
  how the host fulfills it.

## Alternatives considered

Direct invocation means handing the agent an authorized `git` executable
plus free-form argv through the generic `process.spawn` path. Four
constraints reject it:

1. No-process-spawn Core. The runtime is std-only and sans-I/O by house
   rule (see gate 5 of the [promotion
   checklist](../architecture/prototype-promotion-checklist.md): `#![deny(unsafe_code)]`,
   std-only dependencies, fail-closed typed errors). Raw argv passthrough
   cedes argument parsing, flag semantics, and output bounding to whatever
   `git` binary the host happens to provide — ambient authority by
   executable name, with flag semantics unchecked.
2. Auditability. The `ToolExecutor` precedent records every call:
   `FakeToolExecutor::calls` (`tool.rs:551`) replays invocations as
   `(tool, arguments)` pairs, and `ToolExecution` (`tool.rs:444`) stores
   `execution_id`, `tool`, structured `status`, bounded `summary` and
   `data`, and the `is_untrusted_surface` label. Opaque argv strings break
   this discipline: an auditor cannot tell `git diff` from `git push
--force` without re-parsing argv. Enumerable wrapper operations
   (`blame`, `log`, `diff`) are auditable by construction.
3. Mockability. The AI-0076 through AI-0097 precedent proves mechanism with
   deterministic doubles: `FakeProvider` and `FakeToolExecutor` replay
   scripted FIFO outcomes against caller-supplied time, with no wall
   clock, threads, network, filesystem, or randomness. A wrapper trait with
   a scripted double gives red/green TDD for version-control reads without
   a `git` binary on the test machine. Shelling out to real `git` in tests
   would fail that gate on its face.
4. Permission scoping. `Scope::ProcessSpawn` is one coarse gate covering
   every executable. Wrapper operations map to narrow, reviewable scopes:
   the read-only blame/log/diff surface proposed here needs at most an
   inspect-shaped grant, while any future effectful operation (commit,
   push, fetch) would demand its own scope and consent story rather than
   inheriting spawn permission silently.

## Acceptance criteria

This document is a draft candidate design. It is unaccepted, it closes no
AIQ or OQ entry (AIQ-35 stays open, as do AIQ-31 through AIQ-34 and AIQ-36
through AIQ-38 where referenced), and it mints no new identifier beyond
naming the owner decision DEC-0006 as the acceptance point. Implementation
is deferred until the shape is accepted: no migration task starts, no trait
lands in a crate, and no test double is built on this sketch before review.

Accepted documents are explicitly unaffected: the
[IPC and Agent RFC](../specifications/ipc-agent-rfc.md) keeps its normative framing, scope,
lifecycle, and consent statements, and no sibling draft disposition
([Execution ownership R1](../architecture/execution-ownership-r1.md), [Tool transport
R2](../architecture/tool-transport-r2.md), [Provider plugin
boundary](../providers/provider-plugin-boundary.md), [HostBoundary trait and lint-gate
design](../architecture/host-boundary-trait-design.md), [Prototype-to-Core promotion
checklist](../architecture/prototype-promotion-checklist.md)) is revised by this document.
The `bitty-ai` implementation at `97d3125` is surveyed read-only; nothing
here describes that slice as the complete proposed runtime.

## References

- [AI Unresolved Questions](../product/ai-unresolved-questions.md) (Draft): AIQ-35
  and the AIQ-31 through AIQ-38 facets; no entry status changes here.
- [Command and Tool Architecture](../architecture/command-tool-architecture.md) (Draft):
  Core-mechanism versus Lua-policy placement the wrapper preserves.
- [Tool transport R2](../architecture/tool-transport-r2.md) (Draft): unified authorization
  backend the wrapper never mints policy for.
- [HostBoundary trait and lint-gate design](../architecture/host-boundary-trait-design.md)
  (Draft): the seam inventory whose dispatch path the wrapper would front.
- [Prototype-to-Core promotion checklist](../architecture/prototype-promotion-checklist.md)
  (Draft): deterministic doubles (gate 3) and house style (gate 5) any
  future wrapper implementation must satisfy.
- [Code intelligence sharing R4](../architecture/code-intelligence-sharing-r4.md)
  (Draft): verification reuse whose provenance evidence is blame- and
  log-shaped.
- [IPC and Agent RFC](../specifications/ipc-agent-rfc.md) (Accepted): normative IPC framing
  that overrides any statement here.
