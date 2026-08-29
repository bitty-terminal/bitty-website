---
title: ADR 0008 - Headless Daemon, Detach/Reattach and Remote UI Trust Boundary
description: Defers headless daemon detach reattach and remote UI to post-v1.0 with trust-boundary analysis and staging for OQ-020
category: decisions
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 38
---

# ADR 0008 - Headless Daemon, Detach/Reattach and Remote UI Trust Boundary

## Status

Accepted on 2026-08-28 by the project initiator, closing
[OQ-020](../open-questions.md). This ADR defers the headless daemon,
detach/reattach, and remote UI to post-v1.0 and records the trust-boundary
analysis gate that any future daemon must pass. It does not ship code, does not
authorize implementation, add a crate, or change any normative P0 control.
Frontmatter `status` is `accepted` per the repository metadata schema; document
status is Accepted.

- Deciders: project initiator (DEC-001), security-auditor persona (audit gate
  per [Threat Model](../../security/threat-model.md) T-09 and R-011 and P0-AC-021
  and invariant 5), `bitty-runtime` and `bitty-ipc` maintainers (CTX-0061).
- Related: OQ-020 (primary), [Product Vision](../../product/vision.md) non-goals
  and experience vision, [Architecture Overview](../../architecture/overview.md)
  candidate long-term evolution,
  [Proposed Delivery Sequence](../../product/proposed-delivery-sequence.md)
  candidate daemon staging,
  [Security Overview](../../security/overview.md) invariants 5 and 6 and trust
  boundaries, [Threat Model](../../security/threat-model.md) boundary map and
  T-09 and R-011 and R-012 and R-013,
  [IPC and Agent RFC](../../specifications/ipc-agent-rfc.md) OQ-018 scope
  separation, [Technology Strategy](../../project/technology-strategy.md),
  [Shared-Conversation Coverage](../../sources/chatgpt-share-coverage.md)
  Phase 10, ADR 0003 workspace topology, ADR 0004 upstream set.

## Context

### Why headless is still open

- **Product vision leaves it uncommitted.** The vision explicitly lists as
  non-goal "Do not commit at the current documentation phase to `bittyd`, remote
  multi-client support, or a plugin registry" and asks as an open question
  "Do a headless runtime, `bittyd`, detach and attach, and a remote UI belong on
  the long-term product roadmap?" OQ-020 owns that question. The vision's four
  statements "Small core. Stable API. Everything composable. Extensions own the
  experience" do not require a daemon to satisfy the v1.0 minimal experience
  (fast, reliable terminal with predictable resource use).
- **Proposed delivery sequence parks it after v1.0.** The second historical
  ChatGPT conversation (share `6a8dae4b`) proposes a spine
  `PTY -> VT -> Grid -> Font -> GPU -> Correct Terminal -> Config -> Command/Event
-> Plugin Runtime -> Plugin Manager -> DevTools -> Rich Presentation -> IPC ->
Agent` and a version ladder v0.0.x through v1.0 with **no `bittyd` before
  v1.0**. The candidate daemon staging section states: positioning after v1.0
  (or at earliest near v1.0), candidate scope detach/attach, persistent sessions,
  remote frontend, multiplexer-style ownership of multiple terminals, and
  rationale lifecycle complexity versus single-process. This corpus records that
  prose as a candidate in [Proposed Delivery Sequence](../../product/proposed-delivery-sequence.md)
  without adopting it; OQ-020 stays open including its trust-boundary half.
- **Architecture overview accommodates without committing.** The overview's
  data-flow and invariants (separate Terminal, View, Layout; Terminal owns PTY
  and grid; View references Terminal) create space for future detach/attach and
  remote UI, and the "Candidate long-term evolution" bullets list "A headless
  runtime in which Terminal, PTY, and the plugin host do not depend on a GUI"
  and "`bittyd` owning multiple Terminals and allowing GUI, CLI, or remote
  clients to attach. Whether such a daemon is in scope, and how it would be
  staged, remains open in OQ-020." That is the boundary-level description; this
  ADR is its OQ-020 answer.
- **IPC RFC explicitly excludes it.** The [IPC and Agent RFC](../../specifications/ipc-agent-rfc.md)
  scopes itself to the local-user surface (Unix `$XDG_RUNTIME_DIR/bitty` socket
  `0700`/`0600` with `SO_PEERCRED` or macOS `LOCAL_PEERCRED`, Windows named pipe
  current-user ACL, no TCP by default) and lists out of scope "remote TCP or
  headless-daemon detach/reattach design (OQ-020)" and states "Any future remote
  UI or headless daemon TCP path belongs to OQ-020 and requires its own ADR with
  explicit authentication (mTLS or equivalent), not a silent broadening of this
  transport." Its Alternatives table rejects "Bind IPC to TCP `127.0.0.1` by
  default" for that reason.
- **Threat model treats network daemons as future design area.** The threat model
  scope line says "Registry operations, network-exposed daemons, WASM plugins, and
  enterprise policy distribution remain future design areas, but their trust
  transitions must not be precluded by P0 APIs." The boundary map today is
  `PTY bytes | Lua plugin | IPC / MCP -> Bitty core` with controls protocol
  limits, restricted VM, authentication and scopes. A daemon would insert a new
  trust transition `remote client -> daemon -> PTY/host primitives` that today has
  no authentication, no scope taxonomy, and no verification gate.
- **Current crate presence does not imply the daemon.** The `bitty` workspace is
  spine-complete in crate presence per ADR 0003 (`bitty-vt`, `bitty-term-state`,
  `bitty-pty`, `bitty-platform`, `bitty-config`, `bitty-render`, `bitty-ui`,
  `bitty-plugin-host`, `bitty-runtime`, `bitty-package`, plus draft tail
  `bitty-rich`, `bitty-ipc`, `bitty-agent`). No `bittyd` or headless runtime crate
  exists. Presence tracks the candidate spine; daemon crates are not pre-created
  by this ADR.

### What this ADR closes versus defers

- **Closes OQ-020:** whether a headless daemon with detach/reattach or remote UI
  is in scope for v1.0, and what its trust boundary analysis must contain. Answer:
  deferred to post-v1.0; trust boundary is a mandatory future ADR gate, not an
  optional follow-up.
- **Explicitly not this ADR:** exact daemon IPC wire, session persistence format,
  remote rendering protocol, multiplexing policy, window-lifecycle ownership, or
  any TCP/mTLS/SSH design. Those belong to a future daemon design RFC/ADR that
  can only be proposed after this ADR is accepted and the P0 spine is stable.
  Also not this ADR: image protocol choices (OQ-008), CLI grammar (OQ-017),
  IPC/MCP local transport details beyond the reused invariant (OQ-018), DevTools
  record/replay sequencing (OQ-019), package registry and signatures (OQ-022).

### Normative constraints not reopened

- [Security Overview](../../security/overview.md) invariants 1 through 10,
  especially invariant 5 (IPC is local-user-only by default and every operation
  has an explicit scope) and invariant 6 (MCP/Agent read-only default; terminal
  content is untrusted observation data), trust-boundary table, and the rule that
  deferral to P1/P2 must not create a P0 bypass.
- [Threat Model](../../security/threat-model.md) T-09 (same-user/remote process
  takeover of IPC), R-011 (IPC scope escalation), R-012 (credential leak via
  environment/SSH), R-013 (confused deputy via terminal output), R-014 (secret
  exposure via traces), plus parser bounds T-01 where framing would be analogous.
- [Core and Plugin Boundaries](../../architecture/core-boundaries.md) core-owned
  Terminal Truth, hot-path isolation (Lua never enters PTY/parse/render/input hot
  paths), and two-security-domain model.

## Decision

### Position: defer to post-v1.0, accommodate early

- **Bitty v1.0 ships single-process, no daemon.** The accepted spine and v1.0
  criteria (Tier 1 Linux/Windows/macOS plus Tier 2 BSD, five-shell matrix,
  application targets, Plugin API v1, Config schema v1, Command API v1, Debug
  Protocol v1, normative security gates) are completable without `bittyd`,
  detach/attach, or remote UI. The daemon is not a v1.0 blocker and not a v1.0
  deliverable.
- **Headless runtime is a long-term direction, not a v1.0 commitment.** The
  direction "Terminal, PTY, and the plugin host do not depend on a GUI" stays
  accepted as a candidate architecture influence (it shapes the Terminal/View/Layout
  separation and snapshot-only renderer coupling per ADR 0003 rule 3) but does not
  authorize a headless binary or daemon service before the future ADR described
  below.
- **Earliest reconsideration is near v1.0 stabilization.** Revisit OQ-020 only
  after the local IPC surface (OQ-018) has accepted evidence for bounded framing,
  peer-credential auth, least-privilege scopes, and rate limits RC-9/RC-10, and
  after isolation budgets OQ-014 have P0-auditor evidence. No code in `bitty`
  may assume `bittyd` exists before that gate.
- **Staging if ever adopted follows the proposal.** If revisited, candidate scope
  is exactly the proposal from the second historical conversation: detach/attach
  of running terminals, persistent sessions that survive GUI close, a remote
  frontend, and multiplexer-style ownership of multiple terminals. This staging
  remains candidate; adoption requires the future ADR to select or reject each
  element explicitly.

### Headless daemon scope when it exists

The following are definitions and scope rules for a future daemon. They do not
create it.

#### Headless runtime versus daemon versus remote UI

| Concept          | Definition in this ADR                                                                                                                                                                                 | Ownership now                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Headless runtime | A library-level separation where `bitty-term-state`, `bitty-pty`, and `bitty-plugin-host` have no dependency on `bitty-platform` window or GPU objects, and can be exercised headlessly in tests/CI.   | Candidate influence; enforced as part of ADR 0003 dependency rule (no Terminal->UI)                                         |
| Daemon `bittyd`  | A per-user, optionally autostarted long-lived host process that owns multiple `Terminal`/`PTY` pairs, the plugin host, and a lifecycle for sessions; GUI, `bitty ctl`, or remote clients attach to it. | Deferred; no binary, no service file, no autostart by v1.0                                                                  |
| Remote UI        | A frontend that renders a Terminal's snapshot on a machine different from the daemon host, via a network transport.                                                                                    | Deferred; strictly separate from the daemon decision and requires its own trust-boundary ADR even if the daemon is accepted |

A headless runtime is prerequisite to a daemon, but a daemon is not prerequisite
to a remote UI being "local only via IPC"; remote UI is never implicit in an
acceptance of a local daemon.

#### Ownership and lifecycle

- **Single scope.** The daemon, if introduced, owns the PTY lifecycle, the
  Terminal grid and scrollback, the event pipeline, and the per-plugin VMs for
  sessions it hosts. A GUI that attaches is a viewer and input forwarder, not a
  second owner of the PTY fd. Two owners of one PTY is a conformance violation.
- **Attach/detach is session-grained, not cell-grained.** Detach means the GUI
  disconnects while the Terminal and its PTY continue; reattach means a new GUI
  binds to that Terminal's snapshot stream and input forwarder. The Terminal's
  stable id (`terminal_id`) survives detach, as do the PTY process and scrollback,
  subject to the existing scrollback/damage/memory limits already normative.
- **Persistence is bounded.** Persistent sessions (survive GUI close, survive
  daemon restart if proposed) must carry explicit caps: max terminals per daemon,
  max scrollback cells per terminal, max image-store bytes per terminal, and max
  aggregate memory. Unbounded "keep everything forever" is rejected. Exact numbers
  are set by the future daemon ADR, not here, but they must reuse the Performance
  Budget RFC ceiling-is-upward-only and attribution rules already applied to RC
  values.
- _*Failure semantics inherit Isolation FS-* and IPC FS-IP_.** A fault in one
  Terminal or one plugin generation is contained to that Terminal or generation;
  the daemon process survives and remains responsive (FS-IP3 parity). A refused
  auth, scope, rate-limit, payload-cap, or method-validation failure leaves no
  partial session state (FS-IP1). Every enforcement emits an attributed record
  (FS-IP4). Generation disposal reuses FS-6 ordering (resources of generation N
  disposed before N+1 activates).

#### Detach/reattach contract sketch (future RFC must make normative)

This ADR records the candidate shape without freezing fields:

- Attach request carries desired `terminal_id` or `session_id`, client
  authenticated identity, and requested scopes; the daemon evaluates
  server-side scopes on every request (IPC RFC authorization parity).
- Detach is client-initiated or server-shed ( newest shed first per RC-9);
  the Terminal remains in an `Attached <-> Detached` state, never in two
  attached states at once unless the future ADR explicitly chooses a
  simultaneous-multi-viewer model with its own input-ownership rule.
- Reattach after process exit is not magic: if the PTY child has exited, reattach
  creates a new PTY/Terminal pair for that session id per lifecycle policy;
  terminal output history before exit remains observable only via bounded scrollback,
  not via replaying an unbounded log that would violate memory caps.
- The existing Plugin Platform RFC generation model (`Declared -> Resolved ->
Registered -> Activated -> Suspended -> Disposed`) and the async GC ADR per-VM
  cache per `Lua` generation continue to apply; a reattach does not resurrect a
  disposed generation's `package.loaded` or host descriptors.

### Remote UI

Remote UI is a strictly larger trust surface than a local daemon. This ADR
records its containment without designing it.

- **Not in scope with a local daemon.** Accepting a local single-user daemon
  does not accept a remote UI. A remote frontend requires a separate trust-boundary
  ADR that demonstrates authentication equivalent to mTLS or SSH-trust, explicit
  scope separation for remote versus local clients, and evidence that the
  rendering protocol cannot be confused for PTY bytes or IPC framing (T-01 parity).
- **No TCP today.** The IPC surface remains Unix socket `0700`/`0600` with peer
  credentials and Windows named pipe current-user ACL, no TCP listener by default.
  The IPC RFC alternative that would bind TCP `127.0.0.1` as a stepping stone to a
  daemon is intentionally not adopted; a future daemon ADR must argue from mTLS or
  SSH forwarding, not from unauthenticated localhost TCP.
- **Rendering protocol is not PTY passthrough.** A remote UI consumes a
  snapshot or damage stream (scene/snapshot model from the architecture overview),
  not raw PTY bytes and not raw IPC frames. Choosing to forward raw PTY bytes to a
  remote UI would reintroduce unbounded parsing at the viewer and is therefore a
  review blocker unless bounded with explicit pixel/compression limits per the
  graphics contract (T-02, T-03).
- **Multi-client is not implicit multi-ownership.** If a future remote UI allows
  several viewers of one Terminal, input routing must have a single focused writer
  at a time and a declared policy for input ownership transfer, clipboard authority,
  and process-spawn scope. Broadcast-input without an ownership token is rejected.

### Trust boundary and deferral gate

This is the mandatory analysis that any future daemon/remote ADR must satisfy.
No daemon ships without it.

- **Local daemon trust transition.** A local `bittyd` introduces the transition
  untrusted GUI or `bitty ctl` client to authenticated daemon to PTY/host
  primitives. This ADR requires the future proposal to demonstrate:
  - peer-credential authentication at least as strong as the IPC RFC (Unix
    `SO_PEERCRED`/`LOCAL_PEERCRED`/BSD equivalent, Windows pipe ACL with token SID
    check, re-checked before each privileged action, directory/pipe tamper
    detection that fails closed rather than falling back unauthenticated);
  - per-request server-side scope evaluation with the same families as the IPC RFC
    (`terminal.inspect < terminal.input < terminal.manage`, `view.*`, `config.*`,
    `plugin.*`, `process.spawn`, `debug.inspect < trace < control`) and the same
    "possession of a handle grants no authority" posture;
  - rate limits and payload/chunk ceilings at least as tight as RC-9/RC-10
    (100 req/s sustained, 256 KiB frame, 256 KiB chunk, 64 pending requests) with
    shed-newest and attribution, applied per authenticated `(UID, client id)`;
  - secret minimization per R-014 and P0-AC-026: traces, diagnostics, and crash
    reports redact env, clipboard, terminal text, and cwd by default, with
    typed sensitive fields, user-only file modes `0600`/`0700`, and export preview;
  - `bitty --safe` remains functional with the daemon disabled or absent — the
    daemon is never a hard dependency for diagnostics or safe-mode startup.
- **Remote transition (separate gate, strictly later).** A remote frontend adds
  the transition remote untrusted network to gateway to daemon. The future
  remote ADR must
  demonstrate network authentication (mTLS with pinned CA or SSH-tunnel trust,
  not ambient bearer token in `BITTY_*` environment that R-012 forbids), encryption
  in transit, replay resistance, separate consent ledger for `(remote identity,
AgentId)`, and a network-exposed fuzz and property corpus for the framing wire
  that meets the same "oversized header sheds with no allocation of claimed size"
  bar as the local framing property.
- **No silent scope expansion.** When `bittyd` or a remote frontend is introduced,
  any previously granted scope does not automatically cover daemon-remote methods.
  New capabilities block automatic activation and require a permission diff plus
  approval (R-016 parity). System/policy pins maxima and cannot be weakened by
  user config.
- **County of authority.** The daemon's trust-boundary text is not owned by this
  ADR alone. Per the documentation workflow change-trigger matrix, updating any
  trust boundary requires the security corpus
  ([Security Overview](../../security/overview.md) and [Threat Model](../../security/threat-model.md))
  as co-owner of the change set. This ADR sets the gate; the security corpus and
  the P0 acceptance criteria own the acceptance evidence.

## Consequences

- **Architecture.** Accommodating the daemon early preserves the Terminal/View/Layout
  separation and snapshot-only renderer coupling (ADR 0003) as invariant, but
  forbids new P0 bypass (for example, a hidden TCP listener introduced as
  "temporary" for daemon experiments). The dependency DAG remains one-way; a
  future `bitty-daemon` or `bitty-headless` crate may depend on `bitty-term-state`,
  `bitty-pty`, and `bitty-plugin-host`, but those crates must not depend on the
  daemon.
- **Security.** No new attack surface ships in v1.0. The IPC surface stays
  local-user-only. The daemon's larger surface (multiple terminals per host
  process, persistent sessions, optional remote) is explicitly deferred, so
  security planning stays accurate and does not silently underwrite a future
  multi-tenant risk.
- **Delivery.** Roadmap claims stay honest: [Proposed Delivery Sequence](../../product/proposed-delivery-sequence.md)
  and [Architecture Overview](../../architecture/overview.md) remain draft with
  OQ-020 deferred. Teams do not need a daemon plan to close OQ-018, OQ-019, or
  OQ-014; daemon work has an informational depends on OQ-014 and OQ-018 acceptance,
  never the reverse.
- **User cost.** Users gain no detach or remote feature in v1.0. In exchange they
  gain a simpler lifecycle (one GUI owns one process, `bitty --safe` with no daemon
  state to reason about) and a well-scoped daemon that, when it arrives, has a
  typed attach/detach contract and measured caps rather than an ad-hoc "keep
  everything" daemon.
- **Documentation.** OQ-020 moves from Open to Accepted ADR 0008 in the same PR
  per the register close rule, leaving no dangling "candidate staging without
  choosing an answer" prose. Future proposals must cite this ADR as the daemon
  gate instead of re-stating the second historical conversation.

## Alternatives Considered

| Alternative                                                                      | Source                                       | Disposition                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Ship single-process only, never a daemon                                     | Restrictive product boundary                 | Deferred not adopted — would foreclose a valid long-term evolution and contradict the Architecture Overview's accommodated evolution; this ADR keeps daemon as deferred candidate rather than rejected.                                                                                         |
| B — Build daemon first, then the terminal                                        | Second historical conversation rejected path | Rejected — would greatly increase terminal-lifecycle complexity (process ownership, PTY reaping, daemon supervision, attach racing) before the correct-terminal and plugin-isolation contracts are stable, matching the proposal's own rationale for deferral.                                  |
| C — Bundle daemon with v1.0 with local scope only                                | Feature-creep variant of candidate staging   | Rejected for v1.0 — adds persistent-session lifecycle and supervision work to the already large v1.0 acceptance set (Plugin API v1, Config schema v1, Command API v1, Debug Protocol v1, normative security gates); resource-budget evidence for per-terminal persistence is not yet available. |
| D — Daemon with unauthenticated localhost TCP                                    | Easy remote-stepping-stone                   | Rejected — reintroduces port-scanning and confused-TCP issues, and widens attack surface versus Unix socket/named pipe with peer credentials; TCP plus auth belongs to the explicit remote trust-boundary ADR with mTLS/SSH, not to the local daemon baseline.                                  |
| E — Remote UI as raw PTY passthrough over TLS                                    | Simple but unbounded                         | Rejected — forwarding raw PTY bytes to a remote viewer reintroduces parser and image-decode risk at the viewer without snapshot isolation; remote must consume bounded scene/snapshot/damage stream per rich-presentation and image-store limits.                                               |
| F — One daemon ADR that also designs remote mTLS and rendering                   | Compressed scope                             | Rejected — conflates two trust transitions of different size; this ADR defers and gates both, requiring separate evidence (local peer-credential and scope parity first, network mTLS/SSH and fuzz parity second). Accommodate early, implement stepwise.                                       |
| G — Adopt daemon positioning from Proposed Delivery Sequence as accepted staging | Second historical conversation proposal      | Accepted as candidate positioning — this ADR adopts the proposal's "after v1.0, or at earliest near v1.0; accommodate early but do not implement early" as the accepted staging, and promotes the trust-boundary half from unanswered to a mandatory future gate.                               |

## References and Verification Gates

### References

- [OQ-020](../open-questions.md) — Is a headless daemon with detach/reattach or remote UI in scope, and what is its trust boundary? (primary)
- [Product Vision](../../product/vision.md) — non-goals refuse `bittyd` and remote multi-client commitment at documentation phase
- [Proposed Delivery Sequence](../../product/proposed-delivery-sequence.md) — candidate daemon staging (deferred after v1.0, candidate scope detach/attach/persistent/remote/multiplexer, complexity rationale) and v1.0 staircase; OQ-020 candidate staging paragraph
- [Architecture Overview](../../architecture/overview.md) — candidate long-term evolution bullets (headless runtime, `bittyd` owning multiple Terminals), Terminal/View/Layout separation, snapshot-only renderer coupling
- [Shared-Conversation Coverage](../../sources/chatgpt-share-coverage.md) — Phase 10 `bittyd` after v1.0 mapping, open provenance that OQ-020 stays open before this ADR
- [Security Overview](../../security/overview.md) — invariants 5 and 6, trust-boundary table, capability families, deferral-must-not-create-bypass rule
- [Threat Model](../../security/threat-model.md) — future-daemon scope line, boundary map, T-09 and R-011 and R-012 and R-013 and R-014
- [Risk Register](../../security/risk-register.md) — R-011, R-012, R-013 link to consent and credential handling
- [P0 Acceptance Criteria](../../security/p0-acceptance-criteria.md) — P0-AC-021 peer credential, P0-AC-022 scope, P0-AC-023 short-lived per-terminal token not in env, P0-AC-026 trace minimization
- [IPC and Agent RFC](../../specifications/ipc-agent-rfc.md) — accepted local transport, framing, scope, rate-limit baseline that the daemon must meet or exceed; out-of-scope notice for OQ-020 daemon/remote
- [Core and Plugin Boundaries](../../architecture/core-boundaries.md) — Terminal Truth, hot-path isolation, two-domain model
- ADR 0003 — [Core Workspace Topology](ADR-0003-core-workspace-topology.md) — crate DAG and snapshot-only rule the headless separation must respect
- ADR 0004 — [Upstream Dependency Set](ADR-0004-upstream-dependencies.md) — maintenance policy that future daemon crates must follow
- ADR 0005 — [Lua Pins](ADR-0005-lua-pins-and-stdlib.md) — two-VM reality (`mlua` vendored and `piccolo 0.3.3`) that the daemon's plugin-host ownership must reuse without forking the hosting contract
- [Technology Strategy](../../project/technology-strategy.md) — async row validation seam for any daemon executor
- `docs/product/proposed-delivery-sequence.md` candidate daemon staging plus [open-question register](../open-questions.md) state before this ADR

### Verification gates

Must pass before OQ-020 moves from Open to Accepted.

1. **Staging gate:** this ADR's "defer to post-v1.0, accommodate early" position
   is the accepted direction; no `docs/**/*.md` claims a daemon binary, service
   file, autostart, TCP listener, or remote UI as v1.0 deliverable, and
   [Proposed Delivery Sequence](../../product/proposed-delivery-sequence.md)
   plus [Architecture Overview](../../architecture/overview.md) long-term bullets
   now cite this ADR rather than the second historical conversation alone.
2. **Scope gate:** headless runtime versus daemon versus remote UI definitions
   are the single authoritative taxonomy; no other doc redefines them
   divergently, and the daemon ownership/lifecycle sketch (session-grained
   attach/detach, bounded persistence, contained failure, generation disposal) is
   the only candidate sketch until the future daemon RFC supersedes it.
3. **Local-transport invariance gate:** the IPC local-user baseline stays
   unchanged — `$XDG_RUNTIME_DIR/bitty` `0700`/`0600` socket with
   `SO_PEERCRED`/`LOCAL_PEERCRED`/BSD equivalent and Windows named-pipe
   current-user ACL, no TCP by default — and no doc introduces a silent
   `127.0.0.1` TCP stepping stone for the daemon.
4. **No-bypass gate:** no bypass API is added as a "temporary" daemon seam; the
   deferred trust transitions (local peer-credential and scope parity; remote
   mTLS/SSH and fuzz parity) are listed as mandatory future evidence and the
   security corpus remains co-owner per the change-trigger matrix.
5. **Docs-sync gate:** this ADR appears in [decision register](../index.md) and
   [ADR index](README.md) plus [Proposed Delivery Sequence](../../product/proposed-delivery-sequence.md)
   candidate daemon staging and [Architecture Overview](../../architecture/overview.md)
   bullets plus [open-question register](../open-questions.md) OQ-020 row to
   Accepted ADR 0008 in the same PR per register close rule, with `just check`
   (fmt-check plus markdownlint plus links plus metadata plus language plus
   agents plus hygiene plus actionlint) green.
6. **Cross-doc closure:** OQ-020 close leaves no dangling prose that still says
   "candidate staging offered to OQ-020 without choosing an answer" — every
   inbound link that previously framed staging as undecided now frames it as
   deferred with trust-boundary gate per this ADR.

### Evidence needed to move OQ-020 from Open to Accepted

Checklist the commander can gate future daemon design on. Each maps to a gate
above.

- [ ] **E1 — Staging evidence:** diff that updates every inbound OQ-020 link
      (vision non-goal, architecture evolution, proposed delivery sequence,
      shared-conversation coverage if needed) to cite this ADR's deferral position,
      verified by `just links`.
- [ ] **E2 — Taxonomy consistency evidence:** `rg` report showing the single
      headless/daemon/remote taxonomy and no divergent redefinition across
      `docs/**/*.md`.
- [ ] **E3 — Transport invariance evidence:** manual audit note that no `TCP`,
      `127.0.0.1`, or `SO_REUSEPORT` listener prose remains as daemon stepping stone;
      `rg -i tcp` on `docs/` hits only the deferred remote trust-boundary section of
      this ADR and the IPC RFC alternatives table.
- [ ] **E4 — Security co-ownership evidence:** security-auditor review sign-off
      that the trust-boundary deferral gate matches invariants 5 and 6 and T-09 and
      R-011 through R-014, recorded as a checkpoint or PR review.
- [ ] **E5 — No artifact evidence:** `cargo tree --workspace` and `rg --files`
      proof that no `bittyd` crate, service definition, or autostart wiring exists on
      `main` after this ADR — parity with the vendored-Lua invariant that `Cargo.lock`
      gains come only from implementing tasks.
- [ ] **E6 — Future-gate enumeration evidence:** the future daemon RFC/ADR
      skeleton (not required to be drafted now) is referenced as a follow-up task
      that must cover local peer-credential and scope parity, RC-9/RC-10 ceilings
      with shed-newest/attribution, secret minimization P0-AC-026, and remote
      mTLS/SSH plus fuzz corpus — or this ADR's Trust Boundary section is cited as
      that skeleton until the skeleton is split.
- [ ] **E7 — Just-check green:** `just check` green with fmt-check, markdownlint
      0 issues, links, metadata, language, agents, hygiene, actionlint green, matching
      the 80-file baseline of CTX-0051 and 81-file baseline of CTX-0053 and CTX-0054.
- [ ] **E8 — Cross-doc closure:** `open-questions.md` OQ-020 to Accepted ADR
      0008, `proposed-delivery-sequence.md` staging paragraph to cite this ADR's
      deferral, `architecture/overview.md` evolution bullets to cite this ADR,
      `decisions/index.md` candidate queue headless line to Proposed ADR 0008, and
      `adrs/README.md` table row added — all in one PR per register close rule.

## Appendix: Candidate daemon staging quick reference

For readers tracing the second historical conversation without reopening it,
the candidate staging this ADR defers is:

| Question                 | Candidate considerations from `6a8dae4b` (now deferred)                           |
| ------------------------ | --------------------------------------------------------------------------------- |
| Positioning              | After v1.0, or at earliest near v1.0; accommodate early, do not implement early.  |
| Candidate feature scope  | Detach/attach, persistent sessions, remote frontend, multiplexer-style ownership. |
| Recorded rationale       | Building daemon first would greatly increase terminal-lifecycle complexity.       |
| Trust boundary half      | Analysis against [Threat Model](../../security/threat-model.md) required.         |
| Existing corpus boundary | [Architecture Overview](../../architecture/overview.md) evolution bullets.        |

## Appendix: IPC RFC versus daemon scope split

| Surface               | Owner after this ADR                                       | Transport baseline                                         | Auth and scope requirement                                        |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Local IPC `bitty ctl` | [IPC and Agent RFC](../../specifications/ipc-agent-rfc.md) | Unix socket / Windows named pipe, no TCP, peer credentials | Same-user peer credential, per-request scopes, RC-9/RC-10         |
| Daemon local attach   | Future daemon ADR (post-v1.0)                              | Same as IPC, then daemon multiplexing                      | At least IPC parity, plus multi-terminal session caps             |
| Remote UI             | Separate future remote ADR (strictly after daemon)         | mTLS or SSH tunnel, not bearer env token                   | Network identity plus ledgered per-remote consent, fuzzed framing |

## Appendix: Deferred remediation map

| Deferred item                                      | Gate before it can be proposed                                                             | Security owner                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ |
| `bittyd` binary and per-user service/autostart     | Local peer-credential and scope parity demonstration (this ADR Decision -> Trust Boundary) | Security auditor per T-09 and R-011  |
| Detach/reattach and persistent sessions            | Session-grained contract, bounded persistence caps, contained failure FS-* parity          | Security auditor per R-012 and R-013 |
| Remote frontend and multiplexer multi-viewer input | mTLS or SSH network auth ADR with scope separation and rendering-protocol bound            | Security auditor per R-013 and R-014 |
| TCP listener of any kind                           | Explicit network auth and fuzz corpus, not ambient localhost TCP                           | Security auditor per T-09            |
