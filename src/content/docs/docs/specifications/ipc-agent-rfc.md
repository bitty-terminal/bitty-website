---
title: IPC and Agent RFC
description: Defines the accepted bounded IPC framing, wire, auth, scopes, and Agent bounded messages, auth, consent, and streaming for OQ-018
category: specifications
audience: security-reviewer
document_type: specification
status: accepted
website_publish: true
sidebar_order: 18
---

# IPC and Agent RFC

> Status: **accepted** on 2026-08-29 by the project initiator. This document defines the accepted bounded IPC framing, wire, auth, scopes, and Agent bounded messages, auth, consent, and streaming for
> [OQ-018](../decisions/open-questions.md) at the design level; it closes [OQ-018](../decisions/open-questions.md). It does not describe implemented
> behavior, does not authorize shipped, stable, normative, or
> compatibility-guaranteed behavior, and does not weaken any normative security control. Experimental implementation may exist as review evidence but carries no
> compatibility promise beyond the accepted contract. Acceptance was per independent category-owner, docs-curator, and security-auditor review (CTX-0076) with P0 sign-off on 2026-08-29; see [P0 Review Sign-off](#p0-review-sign-off) and the
> [P0 review checklist](../reviews/p0-review-checklist.md). The lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## Purpose and scope

OQ-018 asks: _how are local instances selected, authenticated, authorized,
rate-limited, and exposed to IPC/MCP clients?_ This RFC answers that question
and extends the answer to the Agent surface that rides on the same transport:

- **Instance selection:** discovery of a running Bitty instance, disambiguation
  among instances, and the precedence of explicit socket, environment, and
  current-terminal context.
- **Transport and framing:** bounded length-prefixed framing, incremental
  decoder limits, buffered-queue caps, and backpressure.
- **Wire and auth:** versioned wire envelope, method-name validation,
  authenticated identity, peer-credential checks, and per-request scope
  evaluation.
- **Scopes:** least-privilege action scopes for IPC and the read-only default
  for MCP/Agent, with elevation requiring separate per-client consent.
- **Rate limits:** per-connection request rate, payload, concurrency, and
  response-chunk ceilings (RC-9 / RC-10).
- **Agent bounded messages:** owned `AgentId`, `AgentMessage`, `AgentObservation`,
  tool-call vocabulary, session history, and side-queue limits, including
  untrusted-observation labeling for terminal content.
- **Agent auth/consent/streaming:** per-client Agent consent, consent ledger,
  tool-result authorization, streaming chunking, timeouts, and the instruction/
  observation separation that prevents confused-deputy behavior (T-10 / R-013).

In scope: the local-user IPC surface that powers `bitty ctl`, local MCP
clients, and the local Agent adapter. Out of scope:

- remote TCP or headless-daemon detach/reattach design
  ([OQ-020](../decisions/open-questions.md));
- DevTools record/replay and debug-protocol versioning beyond the
  IPC-mediated `debug.inspect` scope ([OQ-019](../decisions/open-questions.md));
- image protocol decoding, storage, and renderer contracts ([OQ-008](../decisions/open-questions.md));
- package sources, registry, and signature verification ([OQ-022](../decisions/open-questions.md));
- per-plugin VM, queue, instruction, and memory enforcement mechanics beyond
  the IPC/MCP client ceilings (owned by
  [Isolation Resource RFC](isolation-resource-rfc.md) under OQ-014).

The Agent section assumes Weston-style observation queues and the ToolCall loop
already drafted in `bitty-agent`; it does not add model selection, LLM I/O,
or API-key handling to that crate.

## Normative precedence

The following are normative and override every proposal here. If any mechanism,
default value, or failure behavior below weakens them, the normative text wins
and this RFC must be corrected:

- [Security Overview](../security/overview.md): invariants 1 through 10,
  especially invariant 5 (IPC is local-user-only by default and every operation
  has an explicit scope) and invariant 6 (MCP and Agent access is read-only by
  default; terminal content remains untrusted observation data, never
  instruction text), capability families, trust-boundary table, and the rule
  that deferral to P1/P2 must not create a P0 bypass.
- [Threat Model](../security/threat-model.md): boundary map
  `PTY bytes | Lua plugin | IPC / MCP -> Bitty core`, sections
  "IPC, CLI, and child processes" (T-09, R-011, R-012) and "MCP, Agents, and
  DevTools" (T-10, R-013), plus general requirements for bounded parsing (T-01)
  and fail-closed behavior.
- [Security Risk Register](../security/risk-register.md): R-011 (IPC scope
  escalation), R-012 (credential leak via environment/SSH), R-013 (confused
  deputy via terminal output), R-014 (secret exposure via traces), plus R-001
  (parser bounds) where framing is analogous.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md):
  core/plugin ownership, two-security-domain model, and the rule that plugins
  never enter the terminal, render, or input hot paths.
- [CLI](../interfaces/cli.md) (candidate): command/action registry separation
  and the `bitty ctl` runtime-control examples that motivate the IPC surface.

This RFC defines the accepted mechanisms, thresholds, and verification plans for those
normative gates. It introduces no new trust boundary, no bypass API, and no
relaxation; per
[documentation workflow](../development/documentation-workflow.md) change
trigger rules, any future change to a trust boundary itself updates the
security corpus first.

## Trust-boundary alignment

This accepted contract reuses the authoritative trust language unchanged:

- Data and requests from PTYs, plugins, projects, IPC clients, MCP clients,
  Agents, packages, and reference repositories are untrusted until an explicit,
  narrowly scoped policy grants a capability.
- Every transition into a trusted host primitive passes a policy, capability,
  authenticated scope, or resource budget.
- An isolated Lua VM is a namespace and failure boundary, not an OS sandbox;
  native in-process plugins remain rejected through P0 and P1, and future
  high-isolation extensions use WASM or a helper process with scoped IPC.
- MCP and Agent access is read-only by default; terminal content is untrusted
  observation data, never instruction text.
- A child process may receive at most a short-lived, current-terminal scope,
  never a runtime administrator token; durable credentials are never placed
  where shell startup or SSH environment forwarding would leak them (P0-AC-023
  parity).

## Instance selection

### Discovery

- **Unix:** the runtime exposes exactly one current-user endpoint per instance
  under `$XDG_RUNTIME_DIR/bitty/<instance-id>.sock`, directory mode `0700`,
  socket mode `0600`, owner equal to the runtime UID. The instance writes a
  small discovery file alongside the socket containing `instance_id`,
  `socket_path`, `pid`, `version`, and `started_at`. No world-readable
  directory or socket is ever created.
- **Windows:** the runtime exposes exactly one current-user named pipe per
  instance, `\\.\pipe\bitty-<instance-id>`, with a current-user ACL. No TCP
  listener exists by default on either platform.
- **Listing:** `bitty ctl instance list` enumerates only endpoints whose owner
  matches the caller, by scanning the current-user directory (Unix) or the
  current-user pipe namespace (Windows), not by contacting every socket.

### Selection precedence

For any `bitty ctl` invocation that needs a runtime:

1. Explicit `--socket <path>` wins and bypasses all discovery. The path must
   pass peer-credential checks before any request is sent.
2. Otherwise `--instance <id>` wins: resolve the id to its socket via the
   discovery file; if ambiguous or missing, fail closed with a typed error that
   lists candidates.
3. Otherwise, if the caller inherits `BITTY_SOCKET` or `BITTY_INSTANCE_ID` from
   a shell launched inside Bitty, that current-terminal context wins, provided
   the socket still exists and authenticates to the same UID. The variable is
   advisory only and never authorizes a foreign-instance operation without the
   credential check.
4. Otherwise, if exactly one live instance exists for the caller, use it.
5. Otherwise, fail closed with an ambiguity error (never silently pick an
   unrelated instance).

The `BITTY_*` environment variables are not durable credentials. They carry only
`instance_id`, `terminal_id`, `view_id`, `version`, and `socket_path` as
opaque identifiers. A client that forges them without owning the socket gains
no authority because authorization is always server-side (see
[Authorization and scopes](#authorization-and-scopes)).

### Multi-session behavior

When several graphical sessions exist and no current-terminal context is
available, the runtime never defaults to the most-recent or focused instance
without an explicit `--instance` or `--socket`. The error message suggests
`bitty ctl instance list` so the user can disambiguate.

## Transport and bounded framing

### Framing

Every IPC/MCP connection carries a length-prefixed binary frame stream:

- header `u32` big-endian payload length, followed by exactly that many payload
  bytes;
- maximum frame payload `256 KiB` (hard bound, candidate value `RC-10` framing);
  a header claiming a larger length causes immediate connection shed with no
  partial parse (P0-AC-001 parity for parser bounds, T-01 defense);
- maximum in-flight buffered bytes per connection `512 KiB` (two frames); excess
  causes shed newest (connection close) rather than unbounded growth;
- incremental `Framer` decodes only complete frames and never holds an
  unbounded internal buffer — the decoder's working buffer is capped at the
  frame maximum.

The crate `bitty-ipc` already implements `frame::encode_frame`,
`frame::decode_frame`, and incremental `frame::Framer` with these bounds as
draft experimental evidence (headless, no OS handle).

### Channels and backpressure

Bounded channels sit above framing:

<!-- markdownlint-disable MD013 -->

| Channel                          | Accepted default                  | Hard ceiling                 | Overflow behavior                                                                                                               |
| -------------------------------- | --------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Request channel per endpoint     | 64                                | 256 (`MAX_CHANNEL_CAPACITY`) | fail-closed `try_send` refuses newest; no silent loss for request/response acknowledgement                                      |
| Response channel per endpoint    | 64                                | 256                          | same as above                                                                                                                   |
| Pending request table per client | 64 (`MAX_PENDING_REQUESTS`)       | 64                           | refuse newest; correlation never reuses an id under pressure                                                                    |
| Transport queue per direction    | 64 (`DEFAULT_TRANSPORT_CAPACITY`) | 256                          | `try_send_frame` refuses; the loss-tolerant `send_drop_oldest` helper exists only for explicitly attributed observation streams |

<!-- markdownlint-enable MD013 -->

A malicious peer therefore cannot grow host memory by flooding: the frame bound
caps each allocation, the channel caps bound queue depth, and overflow is
fail-closed and countable (see [Rate limits and budgets](#rate-limits-and-budgets)).

## Wire protocol

### Envelope

The accepted wire envelope is versioned and self-describing, intentionally
small and auditable:

```jsonc
// Request (client -> runtime)
{
  "v": 1,                         // wire version, u16
  "id": "01H...ULID",             // correlation id, bounded 64 bytes
  "method": "terminal.text",      // bounded 128 bytes, see validation
  "params": { "terminal_id": "t:4" }, // bounded JSON value
  // no "auth" field: identity comes from the transport, not the payload
}

// Response (runtime -> client)
{
  "v": 1,
  "id": "01H...ULID",
  "ok": true,
  "result": { "text": "..." },    // bounded, or streamed via chunks
  // or
  "ok": false,
  "error": { "class": "Denied", "code": "ScopeViolation", "message": "..." }
}

// Streaming chunk (for snapshot/streaming reads, see RC-10)
{
  "v": 1,
  "id": "01H...ULID",
  "chunk": { "seq": 0, "total": 3, "bytes": "<base64, <=256 KiB decoded>" },
  "final": false
}
```

Rules:

- `v` must be `1` in this RFC; unknown versions are rejected whole.
- `method` validation (candidate, headless-testable): non-empty, `<= 128`
  bytes, no control bytes (`0x00-0x1F`, `0x7F`), no interior whitespace, segments
  match `^[a-z][a-z0-9_]*$` separated by `.`; e.g. `terminal.text` is valid,
  `terminal..text` is not. Untrusted method strings never reach dispatch without
  this check, mirroring the plugin host's method-name discipline.
- Parameter and result JSON values are bounded: the decoded frame is already
  `<= 256 KiB`, and the object-graph depth is capped at 32 to prevent stack
  exhaustion during parsing.
- No ambient authority travels inside the envelope. A client that inserts a
  `scope` or `role` field cannot escalate; the server ignores such fields and
  evaluates the caller's real scope (see next section).

### Error taxonomy

Every failure is an owned `IpcError` with a stable `ErrorClass`:

- `InvalidFrame`, `PayloadTooLarge`, `MethodInvalid`, `VersionMismatch`,
- `Unauthenticated`, `Denied` (with `ScopeViolation`, `RateLimited`,
  `PayloadCap`, `ChunkViolation` sub-codes),
- `Timeout`, `NotFound`, `Conflict`, `Unavailable`, `Internal`.

The client never receives a stack trace or OS handle. Errors carry only the
class, a short code, and a user-facing message suitable for `bitty ctl` output.

### Versioning

Wire version `1` is the only version in this RFC. A future wire version bumps
`v` and remains backward-readable for at least one major Bitty version; the
runtime advertises its wire version in the discovery file and in the `hello`
response after connect. The `bitty ctl --format json` output schema is
versioned separately per the CLI candidate contract.

## Authentication

### Unix

- The runtime creates its directory and socket with `0700`/`0600` and verifies
  owner at connect via `SO_PEERCRED` (Linux) / `LOCAL_PEERCRED` (macOS) /
  `SO_PEERCRED` equivalent on BSD. The check confirms that the connecting UID
  equals the runtime UID. A second local user fails at authentication before
  any request is parsed (T-09, P0-AC-021 parity).
- The runtime re-checks peer credentials before each privileged action, not
  only at connect, so a passed file descriptor cannot be confused for a
  different principal.
- The runtime detects or prevents endpoint replacement/tampering: if the
  directory owner or permissions have changed, it refuses to serve and exits
  the endpoint rather than falling back to an unauthenticated path.

### Windows

- The named pipe carries a current-user ACL (`GRANT` to the runtime SID only,
  `DENY` to others at the pipe level). The runtime validates the client token
  at connect via `GetNamedPipeClientProcessId` plus token SID comparison,
  equivalent to the Unix peer-credential check.
- No TCP listener exists by default. Any future remote UI or headless daemon
  TCP path belongs to [OQ-020](../decisions/open-questions.md) and requires its
  own ADR with explicit authentication (mTLS or equivalent), not a silent
  broadening of this transport.

### Child scopes

A child process spawned inside a terminal may receive a short-lived,
current-terminal scope token only for the narrow operation the parent requested
(e.g. one `terminal.text` read scoped to `t:4` with a 60-second TTL). The token
is delivered over the PTY-side fd, not via environment, and is never placed in
`BITTY_*` variables that shell startup or SSH forwarding would leak (R-012,
P0-AC-023 parity). Expiry is enforced server-side; a replayed token after
expiry fails closed.

## Authorization and scopes

### Principle

Scopes are evaluated **server-side on every request from the authenticated
identity**; clients never assert scopes. Possession of a socket or pipe handle
grants no authority beyond the ability to present a request for evaluation.
Each method declares a required scope; if the caller lacks it, the request is
denied with `Denied/ScopeViolation` and no partial state is created (FS-1).

### Scope families

Scopes are narrowly separated so compromise of one feature does not grant
another. Accepted v1 families
(exact names versioned with the wire as accepted per this RFC):

<!-- markdownlint-disable MD013 -->

| Family     | Scopes (least to most authority)                          | Example methods                                                                                            |
| ---------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `terminal` | `terminal.inspect` < `terminal.input` < `terminal.manage` | `terminal.list` / `terminal.text` inspect; `terminal.send` input; `terminal.close`/`terminal.spawn` manage |
| `view`     | `view.inspect` < `view.manage`                            | `view.list` inspect; `view.split`/`view.focus` manage                                                      |
| `config`   | `config.inspect` < `config.modify`                        | `config.show` inspect; `config.reload` modify                                                              |
| `plugin`   | `plugin.inspect` < `plugin.manage`                        | `plugin.list` inspect; `plugin.install`/`plugin.disable` manage                                            |
| `process`  | `process.spawn` (always separate)                         | `process.spawn` with executable allowlist                                                                  |
| `debug`    | `debug.inspect` < `debug.trace` < `debug.control`         | `debug.snapshot` inspect; `debug.start-trace` trace; `debug.break` control                                 |

<!-- markdownlint-enable MD013 -->

Notes:

- `terminal.inspect` never implies `terminal.input` and `terminal.input` never
  implies `terminal.manage`. Reading terminal text does not authorize input
  injection or process termination.
- `debug` scopes are fully distinct from IPC scopes; connecting to the debug
  transport grants none of them until explicit elevation.
- The families align with the capability families in
  [Security Overview](../security/overview.md) and the register in
  [Plugin Platform RFC](plugin-platform-rfc.md); the IPC surface reuses the
  same taxonomy but remains server-enforced independently of plugin grants.

### Defaults and elevation

- **CLI (`bitty ctl`):** the interactive user starts with the union of
  `terminal.inspect`, `terminal.input`, `view.inspect`, `view.manage`,
  `config.inspect`, and `plugin.inspect` for the authenticated UID. `terminal.manage`,
  `config.modify`, `plugin.manage`, `process.spawn`, and all `debug` scopes
  require explicit elevation (confirmation prompt or pre-granted per-instance
  allowlist).
- **MCP/Agent clients:** start **read-only** (`terminal.inspect`,
  `view.inspect`, `config.inspect`, `plugin.inspect` plus `debug.inspect` only
  if the client presents that scope). `terminal.input`, `terminal.manage`,
  `config.modify`, `plugin.manage`, `process.spawn`, and `debug.trace/control`
  each require a separate per-client consent grant; there is no bundled
  "admin" scope that silently grants them together (T-10).
- Elevation is **per-client, per-scope, and ledgered**: the runtime records
  which client identity, which scope, when, and for how long, and surfaces it
  in `bitty ctl inspect consent`. A grant never silently expands at update
  time; the permission diff blocks silently-added capabilities (R-016 parity).

## Rate limits and budgets

Status: **accepted initial values** on 2026-08-29 following the
[Performance Budget RFC](performance-budget-rfc.md) convention that numbers are
target contracts. Tests must parameterize on the declared values; changing a
value requires an RFC revision, never silent drift.

<!-- markdownlint-disable MD013 -->

| ID    | Dimension                    | Applies to          | Accepted default                                                                                                                                                                   | Notes                                                                                                                                                                           |
| ----- | ---------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RC-9  | IPC request rate and payload | each connection     | 100 req/s sustained, 2x burst for 1 s, 1 MiB payload per request (decoded frame already caps at 256 KiB, so a logical request that would exceed 1 MiB must be chunked client-side) | 16 concurrent connections per endpoint default; exceeding sheds **newest** connection first; payload beyond cap is rejected whole with `Denied/PayloadCap` and no partial parse |
| RC-10 | MCP/Agent response size      | each response/chunk | snapshot-bounded, 256 KiB stream chunks; a single terminal scrape never monopolizes the service                                                                                    | read scopes only; elevation changes scopes, not ceilings; long output is delivered as `chunk` frames with `seq`/`total`                                                         |

<!-- markdownlint-enable MD013 -->

Enforcement:

- Quotas are per authenticated client id; a shared host-wide quota is not
  introduced by this RFC.
- Slow readers that fail to drain response chunks are eventually shed (connection
  close) rather than allowing the host to queue unboundedly on their behalf.
- Every shed, throttle, or rejection emits an attributed record (client id,
  dimension, observed rate/size, limit, action) and increments a countable
  metric, so tests can assert shedding order and counters (FS-4).
- The runtime's own memory is not grown by a hostile peer: the frame bound caps
  each allocation, the channel caps bound queue depth, and the chunk ceiling
  bounds each outgoing piece (T-01 defense).

## Agent bounded messages

The Agent surface rides on the IPC transport but owns its own bounded message
vocabulary, so the two crates (`bitty-ipc` and `bitty-agent`) remain
independently testable. No dependency cycle is introduced: `bitty-agent` has
no path dependency on `bitty-ipc` today; a thin adapter
(`AgentMessage -> Frame`) is a deferred seam that will be added without
redefining caps.

### Identity

- `AgentId` is owner-qualified `owner.name`, e.g. `xuepoo.assistant`,
  bounded `MAX_AGENT_ID_LEN = 128` bytes, segment grammar
  `^[a-z][a-z0-9_-]*$`, validated at construction. No ambient `AgentId` is
  ever inferred.

### Messages

`AgentMessage` is an owned, bounded discriminated union:

- `User` — user turn, content `<= 32 KiB` UTF-8, at most one per turn.
- `Assistant` — assistant turn, content `<= 32 KiB`, plus at most 8
  `ToolCall` values.
- `ToolResult` — result for one `ToolCall`, content `<= 16 KiB`, at most 8 per
  assistant turn.
- `System` — runtime notice, content `<= 8 KiB`.

Overall frame bound per message `<= 64 KiB`; a message that would exceed it is
rejected at the boundary with `Denied/PayloadCap` before any host dispatch.
No wall-clock or randomness is embedded; deterministic `now_ms` is supplied by
the caller for timeouts, keeping headless tests replayable.

### Tool vocabulary

- `ToolSpec` declares `name` (`<= 64` bytes, same grammar as method segments),
  `description` (`<= 512` bytes), and a JSON Schema for arguments
  (`<= 16 KiB`).
- `ToolCall` carries `name` and `arguments` (`<= 16 KiB` JSON) and is
  validated against the registry before any host dispatch (unknown tool fails
  closed).
- `ToolResult` carries `ok` plus `payload` (`<= 16 KiB` JSON) or `error`.
- `ToolRegistry` is a bounded map of at most 32 specs; `stub_invoke` returns
  only a deterministic placeholder `{"stub":true,"tool":"<name>"}` so the
  `Assistant -> Tool -> ToolResult` loop is testable without real execution
  (no LLM I/O, no filesystem/net/process execution inside the `bitty-agent`
  crate; see What this crate does NOT do).

### Observations

`AgentObservation` is the bounded read-only snapshot the Agent may consume:

- variants `TerminalSnapshot`, `TerminalOutput`, `ConfigSnapshot`, `PluginList`,
  each `<= 8 KiB` (larger terminal scrapes are chunked at the IPC layer per
  RC-10);
- `TerminalOutput` carries `is_untrusted_surface = true` — the label required
  by T-10/R-013 and P0-AC-024 — and is never mixed into instruction or policy
  channels;
- delivery is through a `SideQueue<AgentObservation>` (producer never blocks;
  oldest dropped, drop counter increments, per ADR-0003 rule 4), reused as
  both the generic primitive and the `AgentSession` observation queue;
- default `SideQueue` capacity for the Agent session `64`, history capacity
  `128` messages / `256 KiB` total, both bounded and countable.

### Session

`AgentSession` owns one `AgentId`, a `ToolRegistry`, bounded history, and the
`SideQueue`. Its state machine is deterministic:

```text
Created -> Running <-> WaitingToolResult -> Completed
                                  \-> Failed
```

- A session is created without authority. Tool dispatch is not implicit in the
  session; each `ToolCall` is separately authorized against the caller's scopes
  (see [Authorization and scopes](#authorization-and-scopes)).
- History overflow evicts oldest entries (count and byte budget) with an
  attributed drop record; there is no unbounded history growth.
- The session holds no GPU texture, window handle, or PTY file descriptor and
  depends on no `winit`/`wgpu`/`portable-pty` type, so it is headlessly
  testable.

## Agent auth, consent, and streaming

### Auth

Agent clients authenticate exactly like other IPC clients: via the current-user
transport and peer-credential check. No API key or bearer token is introduced
by this RFC. A future daemon or remote UI that needs cross-machine auth belongs
to [OQ-020](../decisions/open-questions.md) and requires its own ADR; this RFC
does not pre-create a credential that such a future would leak.

Per-client Agent identity is the pair `(authenticated UID, AgentId)`. Two agents
from the same UID with different `AgentId` values have separate consent ledgers
and separate quota buckets.

### Consent

Because Agent dispatch turns observation into action, consent is explicit and
ledgered:

1. **Default deny.** A fresh `(UID, AgentId)` has no elevated scopes. Reading
   snapshots and listing resources works; sending input, closing terminals,
   spawning processes, modifying configuration, installing plugins, or starting
   traces does not.
2. **Elevation requires separate consent per scope.** Granting `terminal.input`
   does not imply `config.modify`, `plugin.manage`, `process.spawn`, or any
   `debug` scope. The prompt shows the exact method set that the scope would
   enable, not a generic "allow everything" label. Bundled admin grants are
   forbidden.
3. **Terminal content is untrusted observation.** Even after `terminal.inspect`
   is granted, the content of a `TerminalOutput` observation is labeled
   untrusted and must not be combined automatically with `ToolRegistry` dispatch
   that carries filesystem or network authority. The host policy must enforce the
   separation (T-10, R-013, P0-AC-024); string-sniffing inside the session
   crate is not relied upon.
4. **Ledger and revocation.** Every grant records `who, agent_id, scope,
method set, granted_at, expires_at, granted_by` and is visible via an
   inspection surface (`bitty ctl inspect consent` candidate). Revocation is
   immediate and survives restarts; re-grant requires a fresh prompt. Grants
   are scoped to one instance and do not roam via the filesystem.
5. **No silent expansion.** When a plugin or Agent package updates, any newly
   requested scope blocks automatic activation and requires the permission diff
   flow (R-016 parity). System/distribution policy pins maxima and cannot be
   weakened by user configuration.

### Streaming

Long Agent turns and large terminal scrapes are streamed under the same framing
discipline as IPC:

- Each streamed logical response is decomposed into `chunk` frames of at most
  `256 KiB` decoded bytes (RC-10), carrying `seq` and `total` so the client can
  detect loss or reordering.
- Per-request deterministic timeouts bound each chunk: candidate
  `DEFAULT_REQUEST_TIMEOUT_MS = 5 s` for IPC, `DEFAULT_MCP_TIMEOUT_MS = 10 s`
  for Agent streaming, hard ceiling `MAX_REQUEST_TIMEOUT_MS = 30 s`, checked
  from caller-supplied `now_ms`, never wall-clock time, mirroring the
  `bitty-ipc` stub's deterministic `drain_expired`.
- Backpressure: if the consumer stops draining, the producer's side queue drops
  oldest observation entries and increments the drop counter; the writer's
  connection is eventually shed rather than queueing unboundedly. There is no
  silent loss for request/response acknowledgement — only observation streams
  use drop-oldest semantics.
- The client may cancel a stream at any chunk boundary; cancellation is
  fail-closed and leaves no partial tool dispatch.

### Tool dispatch separation (host side)

The `bitty-agent` crate itself never executes a tool. `ToolRegistry::stub_invoke`
exists only so the `Assistant -> ToolCall -> ToolResult` loop is testable
without host dispatch. Real execution happens in the host/runtime that mediates
Capability-checked dispatch, rate limits, per-client scopes, consent prompts, and
audit — all of which belong to the runtime/IPC host under
[OQ-018](../decisions/open-questions.md) and are not implemented inside
`bitty-agent`. This keeps the Agent crate pure-data and headlessly testable on
both Linux CI and the `windows-latest` job, and keeps the future migration path
`AgentMessage -> bitty_ipc::Frame` a thin adapter without cap redefinition.

### Credential scrubbing implementation evidence (bitty #370)

Status: **experimental review evidence only.** The scrubbing milestone merged
in `bitty` `a2d127b` (CTX-0216, PR #370, `crates/bitty-agent/src/tool.rs`). It
records exactly what that change implements; it changes no accepted bound
above, grants no new capability, and does not promote this RFC beyond
`accepted`. Raw arguments and results are still stored for host dispatch;
scrubbing is the required view for every log or IPC crossing, not a mutation of
the stored value.

What merged, exactly:

1. **Sensitive-key redaction.** `is_sensitive_key` matches keys
   case-insensitively, by exact name or explicit suffix (`_key`, `-token`,
   `.secret`, `_pwd`, `_pass`, `_password`, ...), for `auth`, `pwd`, `pass`,
   `pw`, `key`, `token`, `secret`, `password`, `credential`, `bearer`,
   `cookie`, `authorization`, `passphrase`, and known markers (`api_key`,
   `access_token`, `refresh_token`, `client_secret`, `private_key`,
   `x-api-key`, `set-cookie`, ...). Short bare tokens are exact/suffix-only so
   ordinary keys (`author`, `path`, `bypass`, `power`, `description`) are not
   mangled; matching is intentionally fail-closed (over-redact rather than
   leak).
2. **Typed and unstructured values.** Any value under a sensitive key is
   replaced with `REDACTED_MARKER` (`[redacted]`) regardless of JSON type
   (string, number, object, array); a malformed or unbalanced shape under a
   sensitive key redacts the whole payload rather than passing bytes through.
   Unstructured text is additionally scanned for PEM blocks, known token
   prefixes, JWTs (`eyJ`), and bearer values.
3. **Boundary helpers.** `scrub_tool_args` / `scrub_tool_result` redact and
   bound output to `MAX_TOOL_ARGS_BYTES` / `MAX_TOOL_RESULT_BYTES` (`16 KiB`
   each, the accepted caps above). `ToolCall::scrubbed_arguments` /
   `ToolCall::scrubbed` / `ToolCall::log_safe` and
   `ToolResult::scrubbed_content` / `ToolResult::scrubbed` /
   `ToolResult::log_safe` are the log/IPC views; `Debug` for both types is
   redacting by design, so `format!("{:?}", call)` cannot emit a credential.
4. **Adversarial coverage.** Negative tests assert JSON, bare-pair, header,
   PEM, AWS, JWT, and `pass`/`pw` vectors are redacted; positive tests assert
   legitimate values survive; cap tests assert scrubbed output stays within the
   `16 KiB` bounds; debug/log-safe tests assert no seeded secret is emitted.

Explicit non-changes: the scrubbing gate is key- and pattern-based, so a
secret shape outside those patterns is not guaranteed to be redacted; the
runtime Tool Bus, capability checks, per-tool consent, audit, and typed
`SecretField` machinery are not implemented by this milestone; no
`Verified`/`Compatible` claim is made by this evidence.

## Failure semantics

Numbered for reference; none is implemented by this RFC alone:

- **FS-IP1 Transactional denial.** A refused auth check, scope violation, rate
  limit, payload cap, or method-validation failure leaves no partial state: no
  allocation charged beyond the bounded frame, no queue entry, no registration.
  Denial is total and returns a typed `IpcError`/`AgentError`.
- **FS-IP2 Shed newest.** Concurrent-connection and rate-limit excess shed the
  newest connection/request first, preserving the service for existing clients
  (RC-9). Observation streams drop oldest instead (side queue), preserving the
  latest state.
- **FS-IP3 Containment.** A fault affects only the owning client connection or
  Agent session. The host process survives every contained fault and remains
  responsive; sibling clients, terminals, and plugin VMs are unaffected
  (P0-AC-013 parity).
- **FS-IP4 Attribution.** Every enforcement action emits a structured record:
  authenticated client id, `AgentId` when applicable, budget dimension,
  observed value, limit, and action taken. Unattributed enforcement is a
  conformance bug.
- **FS-IP5 No ambient leak.** No runtime-admin token, durable credential, or
  elevated scope is ever written to the child environment, `BITTY_*` variables,
  discovery files, or trace files (R-012 parity).
- **FS-IP6 Safe-mode independence.** Every path above preserves `bitty --safe`
  startup with minimal built-in configuration and zero third-party plugins;
  verified again after any security-sensitive change (P0-AC-019 parity).
- **FS-IP7 Fail-closed framing.** If the framing or quota machinery cannot
  start or is detected disabled, the endpoint refuses to serve rather than
  serving unbounded.

<!-- markdownlint-disable MD013 -->

## Programmable workspace IPC advantages

> Status: **addendum** to the accepted contract of 2026-08-29. This section is a surgical addendum that does not reopen [OQ-018](../decisions/open-questions.md), does not change `frontmatter.status: accepted`, and does not claim daemon, session-persistence, or remote-UI implementation. It re-expresses the advantages that the programmable workspace direction in the [Workspace Compositor](workspace-compositor.md) (Draft) and the [Product Vision](../product/vision.md) draw from the accepted IPC surface below. Future Panel ownership belongs in a dedicated Panel contract; future CLI ownership belongs in the [CLI](../interfaces/cli.md) contract. Where this addendum mentions a long-term daemon, multi-window server, session save/restore, or SSH-tunnel remote use, that use is deferred per [ADR 0008 - Headless Daemon](../decisions/adrs/ADR-0008-headless.md) (post-v1.0, trust-boundary gate) and is described here only as an IPC-shaped candidate.

This section consolidates programmable-workspace advantages from the untracked temporary local research file `chatgpt-2026-08-30-2.md`, including candidate IPC, workspace, and prior-art rationale. That file is an untrusted local research input outside the canonical repository, is not a canonical or reproducible evidence source, and is not supported by any line-level verification claim. For durable evidence and stable provenance, consult the [Reference Project Register](../project/reference-projects.md). The accepted contract and the security corpus override this temporary research where they conflict. Every candidate below reuses — and does not relax — the guarantees the accepted contract requires and defines: IPC is local-user-local by default (no TCP listener), MCP and Agent access is read-only by default, every operation has an explicit server-evaluated scope, peer credentials are checked before privileged work, framing is bounded (`256 KiB` frame, `512 KiB` in-flight, depth 32), and rate limits RC-9/RC-10 with shed-newest and attribution are required by that contract.

The same composition intuition appears in the vision documents:

```text
Bitty Core
  +-- Panel Manager / Workspace / Command / Event Bus
        |
   IPC Protocol (versioned, scoped, bounded)
        |
  +-----+------+--------+----------+----------+
  |     |      |        |          |          |
 CLI  Plugins Agent  Shell    External   Background
bittyctl  Lua    LLM   bash     programs   services
```

This diagram is a candidate composition, not an accepted ownership or API map. The accepted portion is the bounded, scoped, local-user IPC contract; Panel, workspace, command, event, plugin, and external-client ownership remains for future design work. Future Panel contract work and the [CLI](../interfaces/cli.md) contract must establish those owners before any method is accepted.

### Why IPC is the workspace automation boundary

A proposed future architecture would not treat IPC as merely optional around a single process. It could connect compositor and rendering, PTY child processes, plugin VMs, external CLI tools, background services, Agents, and potentially other Bitty instances. Each of those would be a distinct principal with a different trust posture. A dedicated IPC surface would therefore be a proposed way to mediate the transitions `PTY bytes | Lua plugin | IPC / MCP -> Bitty core` rather than an optional addition.

### Candidate CLI dispatch and shell composability

The `bitty ctl` surface (see [Instance selection](#instance-selection)) is a candidate CLI direction built on the accepted IPC relationship and could inform a future `bitty msg` or `bittyctl dispatch` shape. The CLI method surface remains candidate; these names, verbs, and ownership are not accepted by OQ-018. A future CLI contract and Panel/workspace owner must define them without copying the Hyprland wire format:

```bash
bitty msg panel open --type terminal
bitty msg panel focus --id 3
bitty msg workspace switch --name dev
bitty msg notify --text "cargo test finished"
```

If a future CLI is a thin client over the accepted versioned envelope (`v`, `id`, `method`, `params`) and authenticated transport, shell composition could work without a privileged helper:

```bash
cargo test && bitty msg notify --text "Tests passed"
git checkout feature-x
bitty msg workspace create --name feature-x
bitty msg panel open --type terminal
bitty msg panel open --type git
```

Any future implementation would still need peer-credential authentication, per-request server-side scope evaluation, bounded framing, and RC-9/RC-10 enforcement. `BITTY_SOCKET` and `BITTY_INSTANCE_ID` remain advisory identifiers (see [Instance selection](#instance-selection)), never credentials.

### Process and fault isolation over dlopen

A candidate helper-process architecture could let a workspace host a faulty third-party panel without taking down the host:

```text
Bitty host
  +-- helper process (IPC-routed)
  +-- Terminal Panel   -- healthy
  +-- Git Panel        -- healthy
  +-- Telegram Panel   -- candidate helper crashes; a supervisor could restart it

Bitty (in-process dlopen)
  +-- dlopen(plugin.so) -- segfault brings down the host
```

IPC transport alone does not guarantee process crash isolation or restart. A future helper-process and supervisor design would need to establish those properties separately. The accepted contract contributes only the following bounded, scoped request properties:

- **Fault boundary candidate:** a helper-process crash could be contained to that helper if a future supervisor and lifecycle contract implement it; FS-IP3 applies to the accepted client/session semantics, not automatically to arbitrary panels.
- **Resource isolation:** accepted per-client quotas, bounded channels, and chunk ceilings prevent a peer from growing host memory (T-01 defense via [Transport and bounded framing](#transport-and-bounded-framing) and [Rate limits and budgets](#rate-limits-and-budgets)).
- **Permission isolation:** a future plugin process holding a socket handle would gain no authority beyond what the host grants per request (see [Authorization and scopes](#authorization-and-scopes)).

Native in-process plugins (`dlopen`) remain rejected through P0/P1 per the trust-boundary text in this RFC and [ADR 0008](../decisions/adrs/ADR-0008-headless.md). WASM or a helper process with scoped IPC are candidate higher-isolation directions, not an implementation or restart guarantee.

### Candidate multi-language SDK and long-term compatibility rationale

For future consideration, the IPC protocol could be an extension boundary rather than a Rust ABI. A Rust ABI is generally unsuitable as a cross-release plugin boundary; the following versioned envelope is a candidate illustration:

```json
{
  "v": 1,
  "id": "01H...ULID",
  "method": "panel.open",
  "params": { "type": "terminal" }
}
```

The proposed layering for a future compatibility boundary is:

```text
Internal Rust API  (frequent refactors)
       |
IPC Protocol v:1  (candidate compatibility boundary)
       |
Plugins / Scripts / Agents / External programs
```

Consequences:

- A future `Rust`, `Python`, `Go`, `Node`, or `Lua` client could use the same JSON-RPC-shaped, length-prefixed protocol without sharing a Rust toolchain. A multi-language SDK would be a candidate set of envelope-and-framing helpers, not a shared `cdylib`.
- Candidate method names (`panel.open`, `workspace.list`, `command.execute`, `event.subscribe`) and scopes must not be treated as accepted compatibility promises. Future Panel and CLI ownership documents would need to define them.
- A future wire version could follow the versioning rules in [Wire protocol](#wire-protocol), but backward compatibility beyond the accepted RFC disclaimer is not established by this addendum.

### Candidate Agent workflow over IPC

The same scopes and bounds that make the Agent crate headlessly testable could let a future Agent client use workspace operations without GUI automation. The following methods and workflow are candidates only; they are not accepted by OQ-018:

```text
Agent
  +-- workspace.list
  +-- panel.list
  +-- terminal.spawn
  +-- terminal.write
  +-- view.inspect
  +-- command.execute
  +-- notification.send
```

Example workflow, each step a scoped `method` call returning bounded JSON or chunked output per RC-10:

1. `workspace.create` with a feature name;
2. `panel.open` for the repository;
3. `terminal.spawn` and `terminal.write` of `cargo test`;
4. `terminal.text` or streamed `chunk` frames for the failing log;
5. `panel.open` of a diff or preview panel.

Agent clients remain read-only by default ([Authorization and scopes](#authorization-and-scopes) and [Agent auth, consent, and streaming](#agent-auth-consent-and-streaming)): no `terminal.input`, `terminal.manage`, `config.modify`, `plugin.manage`, `process.spawn`, or `debug.*` authority without a separate per-client, per-scope consent grant and ledger entry. Terminal content is handled as `AgentObservation` with `is_untrusted_surface = true`, never as instruction.

### BITTY_SOCKET env discovery

Programs that run inside Bitty could discover the instance the same way they discover a display or bus address. The following inheritance shape is a candidate; the accepted contract only makes the identifiers advisory and non-credential-bearing:

```bash
BITTY_SOCKET=/run/user/1000/bitty/<instance-id>.sock
BITTY_INSTANCE_ID=<instance-id>
BITTY_SESSION=<session-id>   # candidate, only when session persistence is adopted
```

This parallels `$DISPLAY`, `$WAYLAND_DISPLAY`, `$DBUS_SESSION_BUS_ADDRESS`, and — directly — `$WEZTERM_UNIX_SOCKET` for [WezTerm CLI](https://wezterm.org/config/lua/wezterm/mux.html). A CLI tool can therefore promote itself from stdout to a workspace surface when it detects it is running inside Bitty:

```bash
if [ -n "${BITTY_SOCKET:-}" ]; then
  bitty msg panel open --type diff -- path="$PWD"
else
  git diff
fi
```

Discovery remains advisory-only (see [Instance selection](#instance-selection) and [Authentication](#authentication)); a forged `BITTY_SOCKET` without owning the socket gains no authority because every request still passes `SO_PEERCRED`/`LOCAL_PEERCRED`/Windows pipe-ACL checks and per-request scope evaluation.

### Daemon multi-window server and session save/restore (deferred)

The accepted contract defines transport and framing suitable for a future daemon to consider for a tmux-like server model, without claiming that model now:

```text
Bitty daemon (candidate, deferred per ADR-0008)
  +-- Window A  { workspace dev { Terminal, Git, AI Chat } }
  +-- Window B  { workspace server { SSH, Logs } }
  +-- Window C  { workspace scratch { floating panels } }
       |
   shared state: workspaces, panels, layouts, commands, notifications
```

In that deferred shape, `bitty list` enumerates the daemon-owned hierarchy (`Window -> Workspace -> Panel`) rather than a single window, analogous to `tmux ls`. Session persistence would follow the same bounded-state principle:

```text
Bitty state { windows, workspaces, panels, layouts, processes }
      |
  serialize -> session.json / SQLite
      |
  restore  -> rehydrate bounded workspaces and panels
```

Every deferred claim in this subsection is gated by [ADR 0008](../decisions/adrs/ADR-0008-headless.md): v1.0 ships single-process only, there is no `bittyd` binary, service file, autostart, or TCP listener; staged scope is detach/attach and persistent sessions with explicit caps on terminals per daemon, scrollback cells, image bytes, and aggregate memory; and the acceptance gate for any future daemon includes local peer-credential and scope parity at least as tight as RC-9/RC-10, secret minimization, and `bitty --safe` with the daemon disabled. No implementation claim is made by this addendum.

### SSH-tunnel remote (deferred)

A remote UI is a strictly larger trust transition than a local daemon and requires its own ADR with `mTLS` or SSH-tunnel trust, not ambient bearer tokens in the environment (R-012):

```text
Local Bitty UI  --SSH tunnel / mTLS-->  Remote bitty-agent / daemon
  File Panel                              File service
  Git Panel                               Git service
  Remote Terminal  <--------------------  Remote PTY host
```

The accepted baseline remains Unix socket `0700`/`0600` / Windows named pipe current-user ACL with no TCP listener by default ([Trust-boundary alignment](#trust-boundary-alignment) and [Authentication](#authentication)); remote `TCP` belongs to the explicit network-auth ADR described in [ADR 0008](../decisions/adrs/ADR-0008-headless.md) and is not a silent broadening of this transport. The remote rendering path, if ever accepted, would consume a bounded snapshot/damage stream per the [Rich Presentation RFC](rich-presentation-rfc.md) and [Workspace Compositor](workspace-compositor.md), not raw PTY bytes.

### Candidate request plus event dual model (RPC plus Event Stream)

The candidate shape for a future workspace is an `RPC + Event Stream` dual model, informed by prior art. It is an addendum only and does not reopen, amend, or expand the already-closed [OQ-018](../decisions/open-questions.md) contract, or accept these names:

- **RPC (request/response):** `panel.create`, `panel.close`, `panel.focus`, `workspace.create`, `workspace.switch`, `command.execute`, `terminal.spawn`, `terminal.write`.
- **Events (async subscription):** `panel.created`, `panel.closed`, `panel.focused`, `workspace.changed`, `terminal.cwd_changed`, `terminal.command_started`, `terminal.command_finished`, `git.branch_changed`.

```text
              Bitty IPC
             /         \
        Commands       Events
            |             |
            v             v
        request()    subscribe()
            |             |
            v             v
        Response      Event frames (chunked, bounded, attributed)
```

If adopted later, streaming could reuse the accepted `chunk` envelope, `seq`/`total`, deterministic timeouts, and side-queue `drop-oldest` semantics defined in [Agent auth, consent, and streaming](#agent-auth-consent-and-streaming) and bounded by [Transport and bounded framing](#transport-and-bounded-framing) (`256 KiB` frame, `512 KiB` in-flight, `SideQueue` capacity `64`). The event names and `bittyctl events` shape are candidate taxonomy only, not a second accepted wire and not closure of OQ-018.

### Capability-gated IPC

Candidate workspace verbs would need to be gated by the accepted scope families in [Authorization and scopes](#authorization-and-scopes); this table is a proposal for future Panel/CLI ownership, not an accepted method registry:

| Workspace verb                  | Required scope (candidate mapping)  | Notes                                                               |
| ------------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `workspace.list`, `panel.list`  | `view.inspect` / `terminal.inspect` | Read-only inspection; no elevation                                  |
| `panel.open`, `panel.focus`     | `view.manage`                       | Creating or focusing a panel mutates workspace state                |
| `terminal.spawn`, `panel.close` | `terminal.manage`                   | Lifecycle mutation; never implied by `terminal.inspect`             |
| `terminal.write` (send input)   | `terminal.input`                    | Distinct from `terminal.inspect`; per-client consent for Agents     |
| `command.execute`               | per-command scope                   | Dispatched via the command registry; scope follows the command      |
| `event.subscribe`               | scope of the subscribed topic       | Subscribing to `terminal.*` events requires `terminal.inspect` etc. |

The host policy enforces the separation, not string matching inside the Agent or plugin crate. Bundled `admin` scope is forbidden; elevation is per-client, per-scope, and ledgered, with no silent expansion on update (R-016 parity) and system-policy pins that cannot be weakened by user configuration ([Authorization and scopes](#authorization-and-scopes)).

### Prior-art lineage: tmux control mode, kitty remote control, WezTerm CLI, Hyprland IPC to Bitty IPC

Bitty IPC does not copy a wire format from prior art. Hyprland, Waybar, and analogous references are non-normative research leads: every Hyprland-inspired behavior would need to be re-expressed as a typed, validated contract, and no Hyprland or Waybar source, configuration syntax, or wire format is vendored (see [Workspace Compositor](workspace-compositor.md) Hyprland import rules). The lineage below is design intuition and provenance, not an accepted contract.

```text
tmux control mode  ─┐
kitty remote control ─┼─>  Bitty IPC (RPC + Event Stream, scoped, bounded, local-user-local)
WezTerm CLI / mux  ──┤      (versioned envelope, typed scopes, discovery via BITTY_SOCKET)
Hyprland IPC      ─┘
```

| Prior art                                                                                                                                                                                                                      | What it proved viable for Bitty's workspace direction                                                                                                                                                       | How Bitty re-expresses it (without copying the wire)                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **tmux** `server -> session -> window -> pane -> client` and `-C`/`-CC` control mode                                                                                                                                           | A long-lived per-user server owning multiple windows/panes with a `RPC + async Event Stream` text protocol; remote clients can map server windows/panes onto native UI (e.g. iTerm2 via tmux control mode). | Candidate input to future workspace and daemon design; multi-window daemon and session persistence remain deferred per [ADR 0008](../decisions/adrs/ADR-0008-headless.md).                        |
| **kitty** remote control (`kitten @ launch`, `send-text`, `focus-window`, `ls` over a socket) and `panel` (Wayland layer-shell dock)                                                                                           | Lightweight `CLI -> IPC -> Panel Manager` path and terminal-powered desktop surfaces.                                                                                                                       | Candidate input to future CLI and Panel RFCs; `bitty msg`, `bittyctl`, and panel verbs are not accepted here.                                                                                     |
| **WezTerm** `wezterm.mux` (`windows`, `tabs`, `panes`, `workspaces`, `domains`) and `wezterm cli` (`activate-pane`, `split-pane`, `spawn`, `get-text`, `send-text` via `$WEZTERM_UNIX_SOCKET`) with local/Unix/SSH/TLS domains | Programmable workspace, mux, and domain architecture with a discoverable Unix socket; strong precedent for environment-based discovery and multi-domain execution.                                          | Candidate input to future workspace, CLI, and remote-domain design; `BITTY_SOCKET` remains accepted only as the advisory identifier described earlier, not as acceptance of WezTerm-like methods. |
| **Hyprland IPC** (`hyprctl dispatch`, `hyprctl clients`, `keyword`) and **Waybar** (`modules-left/center/right`)                                                                                                               | A compositor IPC for scripts, status bars, and plugins to observe and control tiling and workspaces.                                                                                                        | Candidate input to future Panel/CLI and Status System ownership; candidate `bittyctl` commands are not accepted here.                                                                             |

The candidate thesis of the second research snapshot is preserved: the novelty, if any, is not a single row of that comparison but the composition of `Zellij`-style first-class non-PTY `Panel` and plugin UI, `kitty`-style remote control, `WezTerm`-style mux and workspace, `tmux`-style server and control mode, `Emacs`-style `Buffer + Window + Panel type` application model, and `Warp`-style integrated surface into the terminal emulator's own application model. The reference set for any future Panel RFC is therefore `Zellij Plugin API + tmux Control Mode + kitty Remote Control + Emacs Buffer/Window model` alongside the accepted IPC and plugin specs, studied without vendoring or wire-format copying. These are research leads, not accepted claims about Bitty's capabilities.

The mapping clarifies the present versus deferred boundary: the local, scoped, bounded IPC and the candidate `Panel` and `PanelSurface` typing are being explored in the [Workspace Compositor](workspace-compositor.md) draft; future Panel and CLI ownership remains open. Daemon ownership, detach/reattach, persistent sessions, and network remote are not part of the accepted IPC contract and remain behind the [ADR 0008](../decisions/adrs/ADR-0008-headless.md) gate.

<!-- markdownlint-enable MD013 -->

## Experimental implementation notes (accepted contract, draft evidence before acceptance)

The following draft surfaces already existed in the `bitty` workspace and were
cited as experimental review evidence for this RFC before acceptance
(now accepted contract):

- `crates/bitty-ipc`: bounded request/response channels (`DEFAULT_REQUEST_CAPACITY`,
  `DEFAULT_RESPONSE_CAPACITY`, `MAX_CHANNEL_CAPACITY = 256`,
  `MAX_PENDING_REQUESTS = 64`), transport caps (`DEFAULT_TRANSPORT_CAPACITY = 64`),
  length-prefixed framing bounded at `256 KiB` (`frame::encode_frame`,
  `frame::decode_frame`, incremental `Framer` with bounded internal buffer),
  stdio transport stubs (`StdioTransportStub` with in-memory `VecDeque<Frame>`
  pair, `forward_to` headless pipe simulation, no OS handle), MCP client stub
  (`McpClientStub` with stdio stub plus bounded framing plus request correlation
  plus deterministic timeouts; wire helpers `MCP_REQ`/`MCP_RESP` as headless
  non-normative JSON-RPC), method-name validation
  (non-empty, `<= 128` bytes, no control bytes/interior whitespace), deterministic
  timeouts (`DEFAULT_REQUEST_TIMEOUT_MS` candidate `5 s`,
  `DEFAULT_MCP_TIMEOUT_MS` `10 s`, hard ceiling `MAX_REQUEST_TIMEOUT_MS` `30 s`
  checked from caller-supplied `now_ms`), fail-closed overflow
  (`BoundedChannel::try_send` and `StdioTransportStub::try_send_frame` refuse
  when at capacity; `send_drop_oldest` only for observation streams), owned
  errors (`IpcError`/`ErrorClass`), and the posture that MCP responses are
  untrusted observation data. There is intentionally no real `Unix socket`/
  `named pipe` endpoint, no peer-credential check, and no `unsafe` in this
  crate — the crate is headlessly testable.
- `crates/bitty-agent`: owned `AgentId` (owner-qualified `owner.name`,
  `MAX_AGENT_ID_LEN = 128`, segment grammar `^[a-z][a-z0-9_-]*$`), bounded
  `AgentMessage`s (content `<= 32 KiB`, frame `<= 64 KiB`, tool calls/results
  `<= 8` each, arguments `<= 16 KiB`, results `<= 16 KiB`), tool vocabulary
  (`ToolSpec`, `ToolCall`, `ToolResult`, `ToolRegistry` with validation and
  deterministic `stub_invoke` only, no LLM I/O), bounded `AgentObservation`s
  (`<= 8 KiB` each, `TerminalOutput` flagged `is_untrusted_surface = true`),
  bounded `SideQueue` (producer never blocks; oldest dropped, counter increments),
  bounded `AgentSession` (`<= 128` / `<= 256 KiB` history,
  `SideQueue<AgentObservation>` `DEFAULT_SIDE_QUEUE_CAPACITY = 64`,
  state machine `Created -> Running <-> WaitingToolResult -> Completed/Failed`),
  and owned errors (`AgentError`/`ErrorClass`). No window/GPU coupling, no real
  tool execution — capability-checked dispatch, rate limits, per-client scopes,
  consent prompts, and audit belong to the runtime/IPC host (OQ-018) and are
  deferred.

Both crates were `draft`/`proposed` at proposal time; their caps were the
experimental evidence for the bounds this RFC now defines as accepted,
now normative per the lifecycle
`Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.
The real transport with `XDG_RUNTIME_DIR` socket modes and Windows ACLs,
plus peer-credential checks, belongs to a follow-up slice and must pass a
focused security review before any claim of peer authentication;
no semver-major-freeze was claimed until the RFC was accepted, and now the
contract is accepted.

## Verification

### Property: framing and channel bounds

- Given any split of a valid frame stream into arbitrary byte chunks, the
  incremental `Framer` reassembles exactly the frames with no unbounded
  buffering; a header claiming `> 256 KiB` causes connection shed with no
  allocation of the claimed size (T-01, RC-10).
- Given a flood of requests on a single connection, channel queue depth never
  exceeds `MAX_CHANNEL_CAPACITY`; `try_send` beyond it fails closed and is
  countable.

Verification: `unit` + `adversarial` (split-at-every-offset corpus, oversized-
header corpus, channel-capacity sweep). Pass threshold: zero crashes/hangs,
zero allocations beyond the declared bounds, exact shed counters.

### Property: instance selection

- Given zero, one, or many live instances and the combinations of `--socket`,
  `--instance`, `BITTY_*` environment, and no selector, the precedence table
  above holds and ambiguity never silently picks an unrelated instance.
- Forged `BITTY_SOCKET`/`BITTY_INSTANCE_ID` without ownership of the socket
  gains no authority; the request still requires peer-credential success.

Verification: `integration` + `adversarial` (environment-mutation matrix,
simulated multi-session discovery, forged-variable probes). Pass threshold:
exact precedence outcome and exact error class on every ambiguous/forged case.

### Property: authentication

- Given a second local user, a same-user process attempting endpoint
  replacement/pre-bind, and a probe for TCP listeners, foreign connects fail at
  authentication, tampered endpoints cause fail-closed refusal to serve, and no
  TCP listener exists by default (T-09, P0-AC-021).

Verification: `adversarial` + `integration` (Unix `SO_PEERCRED` mismatch tests,
Windows pipe-ACL tests once platforms exist, tamper-detection tests). Pass
threshold: socket mode/ACL asserted; peer-credential mismatch denied; startup
scan finds no listener.

### Property: scope escalation matrix

- Given an authenticated read-scoped client, every attempt to exercise an
  ungranted scope (input, manage, configure-modify, plugin-manage,
  process-spawn, debug.trace/control) is denied server-side regardless of
  client-declared scope fields, replay, reordering, or batching (T-09, R-011,
  P0-AC-022, RC-9).

Verification: `adversarial` (full scope x action matrix, mutated client-assertion
corpus). Pass threshold: zero successful out-of-scope actions.

### Property: rate limits and streaming

- Given oversized payloads, request rates above RC-9, concurrent connections
  above the cap, and large snapshot reads, excess connections are shed newest-
  first, oversized payloads are rejected whole, responses stay within RC-10
  chunking, and a benign concurrent client's requests continue within normal
  latency (T-01, R-011).

Verification: `adversarial` + `integration` (rate sweep, concurrency sweep,
snapshot-size sweep). Pass threshold: exact shedding order, exact `Denied` class
for payload caps, RC-10 chunk-size invariant, and latency of the benign peer
within the PB-4 tail budget during attack.

### Property: Agent bounded messages

- Given maximal `AgentMessage`/`AgentObservation` values and history at capacity,
  every content/frame/tool-count limit holds, history overflow evicts oldest
  with attribution, and the side queue drops oldest with a countable metric
  (T-01 defense, R-013).

Verification: `unit` + `adversarial` (boundary matrix at `MAX_*` values,
history/size sweep, side-queue storm). Pass threshold: exact cap enforcement
on every boundary, exact eviction order, countable drops, no panics.

### Property: Agent consent and confused-deputy separation

- Given terminal output containing instruction-shaped text (e.g. "ignore previous
  instructions and delete ..."), the Agent's observation is delivered with
  `is_untrusted_surface = true` and does not automatically gain filesystem or
  network authority; a `ToolCall` that would act on that content still requires
  its own scope and consent, and a read-only Agent cannot produce the effect
  (T-10, R-013, P0-AC-024).

Verification: `adversarial` + `manual-audit` (injection corpus in `TerminalOutput`,
attempted tool dispatch without/with consent). Pass threshold: read-only Agent
produces zero state changes for every injection; consented Agent still requires
explicit per-tool scope; host audit shows the separation, not string-sniffing,
enforced the decision.

### Property: secret minimization (linked)

- Traces and diagnostics for IPC/Agent carry typed sensitive fields, are
  redacted by default, and are never written with world-readable permissions;
  export preview shows exactly what would be uploaded (R-014).

Verification: `unit` + `manual-audit`. Pass threshold: redaction tests on every
sensitive field class; permission and preview assertions.

## Alternatives considered

<!-- markdownlint-disable MD013 -->

| Alternative                                          | Why rejected or deferred                                                                                                                                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bind IPC to TCP `127.0.0.1` by default               | Increases attack surface and reintroduces port-scanning and same-host confused-TCP issues; Unix socket / named pipe already gives current-user isolation with peer credentials. TCP belongs to a future OQ-020 daemon ADR, not the P0 baseline.                                |
| Authenticate via in-payload bearer token             | Token would be carried in environment or arguments and leaked via `/proc`, shell startup, or SSH forwarding (R-012). Peer credentials from the transport provide the narrowest authority; short-lived per-terminal scopes use a dedicated fd, not a durable environment token. |
| Single bundled "admin" scope for Agent               | Violates least privilege and silently grants filesystem/process authority when only observation was intended (T-10). Separate per-scope consent keeps elevation auditable and deniable.                                                                                        |
| Unbounded JSON-RPC over stdio without framing        | Untrusted peer could grow host memory without limit (T-01). Length-prefixed `256 KiB` framing plus bounded channels preserves headless testability and determinism without unbounded buffering.                                                                                |
| Let plugins inspect every IPC message                | Would place plugins in the IPC hot path and risk information disclosure across scopes. Plugins observe state only via bounded side queues, never raw IPC bytes.                                                                                                                |
| Use the same cap for IPC payloads and Agent messages | IPC request payloads are intentionally smaller and more latency-sensitive (RC-9) than Agent session history (RC-10 streaming). Separate caps keep the tax on `bitty ctl` low while still bounding Agent streaming.                                                             |

<!-- markdownlint-enable MD013 -->

<!-- markdownlint-disable MD013 -->

## Affected contracts

Acceptance of this RFC on 2026-08-29 applies these same-change updates
(no separate task needed; a follow-up PR must keep them synchronized):

- [CLI](../interfaces/cli.md): the runtime-control, instance-targeting, and
  environment-variable sections become normative per this RFC's precedence and
  scope tables; candidate capability-group bullets are replaced by the accepted
  scope families; the `BITTY_SOCKET`/`BITTY_INSTANCE_ID` variables are documented
  as advisory-only identifiers, not credentials.
- [Threat Model](../security/threat-model.md): the IPC/MCP and Agent sections
  link to this RFC for the accepted transport, framing, scope, and consent
  mechanisms; no new trust boundary is added.
- [Security Overview](../security/overview.md): invariant 5 and 6 gain the
  accepted framing and scope mechanism as their P0 implementation path (still
  requiring implementation evidence before any closure of P0 acceptance criteria).
- [Isolation Resource RFC](isolation-resource-rfc.md): IR-D3 and RC-9/RC-10 are
  adopted as the accepted IPC/Agent budgets; future tuning stays under this RFC
  but respects the ceiling-is-upward-only and attribution rules already stated
  there.
- [Architecture Overview](../architecture/overview.md) and
  [Core and Plugin Boundaries](../architecture/core-boundaries.md): the
  `bitty-ipc` and `bitty-agent` crate presence remains `draft` tail until
  implementation evidence lands; the overview's "draft tail crates" note is
  updated to reflect that their contracts are now accepted (frontmatter `accepted` on 2026-08-29) per this RFC, still requiring implementation evidence.
- No new repository, crate, or workflow is added by this RFC; `Cargo.lock` pins
  for any future transport implementation belong to the implementing task and
  are verified by `cargo tree --locked`.

## Open questions that remain after this RFC

- Exact CLI error message wording and `bitty doctor` diagnostics for the
  multi-session ambiguity case.
- Whether the discovery file also carries a pre-shared discovery nonce to
  further harden against directory traversal races on exotic filesystems.
- Whether `process.spawn` allowlist policy lives in the IPC host or in a
  separate process-supervisor service (depends on the future `bittyd` decision
  in OQ-020).
- Tool-result redaction policy for Agent observations that reached the LLM
  context before revocation.
- Streaming compression and its interaction with the 256 KiB chunk ceiling.

These were out of this RFC's scope at draft and remain tracked as follow-up work; they remain in OQ-018 follow-ups and must not be silently chosen by implementation. Acceptance on 2026-08-29 closes OQ-018 at the design level; residual items are not blockers.

## Acceptance criteria

This RFC is accepted on 2026-08-29 and closes [OQ-018](../decisions/open-questions.md) at the design level. The following criteria were satisfied per the [open-question register](../decisions/open-questions.md) close rule:

1. Independent review by the security-auditor, category-owners, and docs-curator accepted the instance selection, transport and framing, wire and auth, scope families, rate limits RC-9/RC-10, Agent bounded messages, consent and streaming, and the verification plan without weakening any normative P0 gate.
2. Affected registers were synchronized in the same change: [open-questions.md](../decisions/open-questions.md), [decision register](../decisions/index.md), [specifications README](../specifications/README.md), and [P0 review checklist](../reviews/p0-review-checklist.md) moved OQ-018 from `Draft` to `Accepted` per the close rule; [CLI](../interfaces/cli.md) and [threat model](../security/threat-model.md) now reference the accepted contract.
3. No element weakens a normative P0 gate; any discovered conflict returns the conflicting clause to revision rather than downgrading the gate.
4. Draft text in this file was updated to record acceptance date and initiator, frontmatter became `accepted`, and links from [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md) and the [decision register](../decisions/index.md) reflect the accepted composition without claiming implementation.

Closes OQ-018: this RFC closes that open question at the design level; the register rows are updated per the open-question register rules. The lifecycle is `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`.

## P0 Review Sign-off

> P0 review per CTX-0076 tracks acceptance of OQ-018 via this RFC. Frontmatter is `accepted` and [open-questions.md](../decisions/open-questions.md) is updated per its close rule. This section records passing sign-off and closes OQ-018.

<!-- markdownlint-disable MD013 -->

| Role                                  | Reviewer          | Verdict | Evidence / scope                                                                                                                                                                                                                                                                             | Date       |
| ------------------------------------- | ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| security-auditor                      | `bitty-security`  | pass    | R-011, R-012, R-013, R-014, T-09, T-10, T-01, P0-AC-016/017/018/019/020, 256 KiB framing, `SO_PEERCRED`/`LOCAL_PEERCRED`, scopes, RC-9/RC-10, untrusted-observation labeling, secret minimization                                                                                            | 2026-08-28 |
| category-owner (security-and-quality) | `bitty-quality`   | pass    | Instance selection precedence, transport framing `256 KiB`/`512 KiB`, bounded channels `MAX_CHANNEL_CAPACITY` 256 / `MAX_PENDING_REQUESTS` 64 / `DEFAULT_TRANSPORT_CAPACITY` 64, wire envelope `v1`, method validation, auth, scopes, streaming, `bitty-ipc`/`bitty-agent` headless evidence | 2026-08-29 |
| category-owner (architecture)         | `bitty-architect` | pass    | Wire protocol `v1`, scope families, Agent bounded messages and consent/streaming, failure semantics FS-IP1..FS-IP7, threat-model mapping complete                                                                                                                                            | 2026-08-29 |
| docs-curator                          | `bitty-curator`   | pass    | Frontmatter `accepted`, lifecycle `Draft -> experimental review evidence -> Accepted (2026-08-29) -> normative`, links to [CLI](../interfaces/cli.md) and [Threat Model](../security/threat-model.md) and [P0 review checklist](../reviews/p0-review-checklist.md), English-only             | 2026-08-29 |

<!-- markdownlint-enable MD013 -->

<!-- markdownlint-disable MD013 -->

As of 2026-08-29, the IPC and Agent contracts remain design contracts per
[ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) and the
[Proposed Delivery Sequence](../product/proposed-delivery-sequence.md);
crate presence does not imply shipped behavior.

<!-- markdownlint-enable MD013 -->

## References

- Bitty crate evidence: `crates/bitty-ipc/src/{lib,frame,channel,transport,mcp,error}.rs`
  and `crates/bitty-agent/src/{lib,agent_id,message,tool,observation,session,side_queue,error}.rs`
  (both crates `draft`/`proposed`, headlessly testable, `forbid(unsafe_code)` in
  `bitty-agent`, no `unsafe` in `bitty-ipc`).
- Isolation resource ceilings: [Isolation Resource RFC](isolation-resource-rfc.md)
  IR-D3, RC-9, RC-10 (accepted, this RFC adopts them as the IPC/Agent
  contribution to that table).
- P0 acceptance criteria source for the verification style:
  [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md).
- Official prior art used as non-normative research leads:
  [Zellij plugins](https://zellij.dev/documentation/plugins.html),
  [Zellij plugin and pipe](https://zellij.dev/documentation/zellij-plugin-and-pipe.html),
  [kitty remote control](https://sw.kovidgoyal.net/kitty/remote-control/),
  [kitty panel](https://sw.kovidgoyal.net/kitty/kittens/panel/),
  [WezTerm mux](https://wezterm.org/config/lua/wezterm.mux/index.html),
  [WezTerm CLI](https://wezterm.org/cli/cli/index.html),
  [tmux control mode](https://github.com/tmux/tmux/wiki/Control-Mode),
  [Hyprland IPC](https://wiki.hyprland.org/IPC/),
  [GNU Emacs shell and terminal](https://www.gnu.org/software/emacs/manual/html_node/emacs/Shell.html),
  and [Warp documentation](https://docs.warp.dev/).
