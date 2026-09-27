---
title: Capability Architecture Doctrine (Candidate)
description: Candidate doctrine for capability-based plugin architecture covering provider identity sandbox formula shared services quotas lifecycle and lazy loading
category: specifications
audience: plugin-author
document_type: specification
status: draft
website_publish: false
sidebar_order: 26
---

# Capability Architecture Doctrine (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document records the plugin-ecosystem
> slice of the owner direction of 2026-09-23: plugins share infrastructure
> instead of duplicating it, and plugins request capabilities instead of owning
> system privileges. It authorizes no shipped, stable, or
> compatibility-guaranteed behavior, weakens no accepted source it cites, and
> makes no implementation claim. Capability identifiers, manifest spellings,
> tier bounds, and budgets repeated here are direction, not contract. The
> host-side network implementation, the install model, and the shared
> governance decision are recorded as owner-pending pointers, not as content of
> this document.

## Purpose and scope

This document freezes the recorded plugin-side capability doctrine so future
design work starts from a stable input instead of reconstructing the
discussion. It refines, by reference only, the accepted
[Lua Runtime RFC](lua-runtime-rfc.md), the accepted
[Isolation and Resource RFC](isolation-resource-rfc.md), the accepted
[Plugin Host Runtime RFC](plugin-host-runtime-rfc.md), the accepted
[Plugin Platform RFC](../specifications/plugin-platform-rfc.md), and the
accepted package lifecycle with its installation-runs-no-code rule
([Package integrity, activation, and rollback](../packaging/package-lifecycle-rfc.md)
Invariant 8). It changes none of them and promotes no status.

In scope (all **Candidate** unless cited otherwise):

- CA-1: capability provider identity — network first, further families as
  future direction, and the Core versus Optional Extension split.
- CA-2: the sandbox boundary formula and what Lua must never reach directly.
- CA-3: shared host services — one async runtime, shared connection pools, a
  single scheduler, and a shared UI renderer.
- CA-4: quotas — the `[limits]` table and the tiny/normal/heavy/system tiers.
- CA-5: manager introspection and lifecycle actions.
- CA-6: lazy loading states and triggers, plus headless suspend and wake.
- CA-7: the entropy control list and the crate-independent API face.

Out of scope and owned elsewhere (pointers, not content):

- the shared network crate split, unified runtime and policy core, feature
  layers, deployment shape, and consumer order (owner-pending, the
  terminal-platform companion
  [bitty-network Shared Network Crates (Candidate)](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/bitty-network-candidate.md);
  this page records only the plugin-facing consequences);
- the L1 install model, the manifest `[requires]` table, install-time
  resolution with consent-gated auto-install, and offline behavior
  (owner-pending, the terminal-platform companion now in flight toward
  `specifications/l1-install-requires-candidate.md`; this page assumes a
  resolver exists and designs what it resolves);
- the Phodopus successor-runtime mechanics, builder quotas, and async bridge
  (candidate,
  [Phodopus Plugin Runtime (Candidate)](phodopus-runtime-candidate.md); this
  page treats the VM-plus-quota layer as one term of the sandbox formula);
- plugin manifest mechanics already accepted (accepted,
  [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) and the
  package lifecycle above);
- governance, the security corpus, and dependency policy (owner-pending,
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs); linked, never
  copied).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  untrusted-by-default posture, capability families, the isolated-VM
  namespace-and-failure-boundary rule, the restricted standard library, and the
  rule that privileged work happens only through capability-checked APIs.
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
  and [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md):
  T-06/T-07 and T-14 with R-006, R-007, R-018, and R-019.
- [Lua Runtime RFC](lua-runtime-rfc.md) (accepted): the sandbox construction,
  restricted standard-library subset, rooted module search rules, source-only
  loading, and diagnostics contract for the plugin VM.
- [Isolation and Resource RFC](isolation-resource-rfc.md) (accepted): the
  per-plugin isolation domain, RC-1 instruction and wall-clock budget, RC-2
  memory ceiling, RC-11 store quota, and the FS-1..FS-9 failure semantics.
- [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) (accepted): the host
  bridge and per-plugin VM lifecycle, component-ownership placement, and the
  synchronous non-blocking `Send` contract for host services.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (accepted):
  the capability model, grants, commands, events, and lifecycle generations
  that every mechanism on this page must pass through.
- [Package integrity, activation, and rollback](../packaging/package-lifecycle-rfc.md)
  (accepted): staged activation and Invariant 8 (installation runs no package
  code), which the lazy-loading direction in CA-6 must preserve.
- [Plugin system](../extensibility/plugin-system.md) (draft): the accepted
  least-privilege capability direction and the candidate `bitty.http` network
  shape with its exact-host allowlist, consent reuse, and secrets direction;
  the accepted isolation and capability owners remain the RFCs listed above.

This page moves no requirement between owners, adds no accepted capability
identifier, and downgrades no P0 gate. If any mechanism here contradicts a
normative source, the normative text wins.

## Terminology

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted document already decides the point; this page only links or restates it. |
| Candidate         | Proposed direction that no review has accepted.                                      |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Open              | A question left unresolved until an owning contract decides it.                      |
| Illustrative-only | A sketch whose spelling or bounds are explicitly undecided.                          |

Capability identifiers (`network.http`, `network.websocket`, `network.tcp`,
`network.udp`, `network.quic`, `network.listen`, `network.discovery`),
manifest spellings (`[permissions.*]`, `[limits]`), the `bitty.timer` shape,
and tier names are **Illustrative-only** direction for the intended contract
vocabulary; they bind no manifest key, module, or symbol until an owning
contract accepts them.

## Boxed principles (Candidate)

Two principles box every section below. A proposal that breaks either one is
outside this doctrine.

**P1 — Plugins share infrastructure, not duplicate infrastructure.**
One async runtime and event loop, one set of connection pools, one scheduler,
one UI renderer — all owned by the host. A plugin never ships its own copy of
shared machinery to reach one endpoint. Duplication is not just dependency
weight: it duplicates runtimes, pools, caches, TLS policy, and proxy handling,
and behavior drifts per plugin.

**P2 — Plugins request capabilities, not own system privileges.**
A plugin declares what it needs in its manifest, the installer shows the
request, the user consents, and the host enforces the grant at every call.
There is no ambient authority: no inherited socket, no inherited process
table, no inherited filesystem root, no inherited environment. A call outside
the grant fails closed with a diagnostic, never with a silent fallback.

## CA-1 Capability provider identity (Candidate)

A capability names a provider family plus an operation class. The host
implements the provider; the plugin holds a grant to call it. Families arrive
in order of need, and the contract distinguishes what is always present from
what must be declared.

Network comes first, because it is the first shared provider plugins need and
the sharpest least-privilege boundary. The illustrative family split is:

| Identifier (Illustrative-only) | Operation class                                     | Risk posture                                              |
| ------------------------------ | --------------------------------------------------- | --------------------------------------------------------- |
| `network.http`                 | Outbound HTTP client calls to declared hosts        | Standard grant; exact-host allowlist, no wildcard default |
| `network.websocket`            | Outbound WebSocket client sessions                  | Standard grant; per-host declaration like `network.http`  |
| `network.tcp` / `network.udp`  | Raw datagram and stream transport to declared peers | Elevated grant; host allowlist plus port bounds           |
| `network.quic`                 | QUIC transport sessions                             | Elevated grant; direction for remote-panel-class use      |
| `network.listen`               | Accepting inbound connections on a local port       | High-risk grant; loopback default, review-gated           |
| `network.discovery`            | Local service discovery (mDNS-class)                | Elevated grant; never implied by outbound client grants   |

Client and listen directions are separate grants: holding `network.http` never
implies `network.listen`, and discovery is never implied by either. Each grant
carries its own declared scope (hosts, ports, methods), enforced with an
exact-match allowlist that fails closed, consistent with the accepted
least-privilege direction and the candidate `bitty.http` shape.

Further families are future direction under the same grammar, not separate
models:

- `process` (spawn under semantic host APIs with argument and path mediation);
- `fs` (rooted reads and writes, no ambient root);
- `secrets` (credential lookup with a strict form in which Lua never sees
  secret bytes);
- `media` (playback and capture surfaces);
- `notify` (platform notification delivery);
- `remote` (remote event publish and remote-aware delivery widening).

Each family is granted independently; holding one never implies a sibling.

Core versus Optional Extension split (Candidate): **Core** is the small
always-present host surface a plugin may call without declaring an optional
dependency — events, commands, timers within quota, and presentation
primitives within its own slots. Core never initiates network connections: the
network-free-core invariant holds, and every row of the table above is an
Optional Extension. **Optional Extension** is declared in the manifest,
resolved at install and re-checked at load; when the extension is absent, too
old, or denied, activation fails closed with an actionable diagnostic naming
the missing extension, never with a silent downgrade. The resolution mechanics
for optional dependencies (install-time resolve, consent-gated fetch, offline
behavior) are owner-pending to the terminal-platform install-model companion;
this page designs only what the plugin declares, not how the host fetches it.

## CA-2 Sandbox boundary formula (Candidate)

The sandbox is a sum, never a single component:

```text
Sandbox = Lua VM + restricted stdlib + capability-checked host functions
        + declared grants + enforced resource limits
```

- **Lua VM**: the per-plugin isolated VM (accepted: `piccolo 0.3.3` per the
  Lua Runtime RFC; candidate successor mechanics per the Phodopus page). The
  VM gives namespace and failure isolation; it is one term of the formula.
- **Restricted stdlib**: the accepted standard-library subset. The full
  standard library is never exposed to widen the formula silently.
- **Capability-checked host functions**: the only path from Lua to the system.
  Every `bitty.*` call checks the plugin's grant before the host acts.
- **Declared grants**: the manifest request plus user consent (CA-1, CA-4).
- **Enforced resource limits**: the accepted RC ceilings and failure semantics
  (CA-4).

**A Lua VM alone is not a sandbox.** Neither Piccolo nor the Phodopus
direction constitutes containment by itself: without the restricted stdlib,
the grant check, and the enforced limits, a VM is only an interpreter. Any
review that treats the VM choice as the security boundary misunderstands this
formula.

Denied by construction in Lua (Candidate restatement of accepted and draft
owners; no new denial is invented here):

- no raw socket surface: Lua ships no socket library, so `network.*` arrives
  only as a capability-checked host function;
- no FFI and no dynamic native loading: in-process native plugins stay outside
  the accepted security model;
- no process spawn surface: no `os.execute`, no `io.popen`, no shell
  passthrough — `process` arrives only as a granted host function with
  mediated arguments and paths;
- no unrestricted filesystem surface: file access outside a granted rooted
  scope fails closed;
- no ambient environment reads: authenticated material goes through the
  `secrets` direction, never through inherited variables.

The rationale is least privilege in one line: granting
`process.exec("*")` — or shelling out to a transfer tool — to reach one API
hands the plugin arbitrary command execution, while a narrow `network.http`
grant reaches the same endpoint and nothing else.

## CA-3 Shared services (Candidate)

Under P1, the host owns exactly one of each shared machine, and plugins
consume them through quota-bounded calls.

**One async runtime and event loop.** The host binds the async runtime; a
plugin never spawns a runtime, a thread pool, or an event loop. Long work
suspends through the host bridge and resumes on the scheduler boundary, so
every pending operation is attributable, bounded, and cancellable. The
suspension mechanics are owner-pending to the Phodopus async-bridge direction;
this page requires only the singularity: one loop, host-owned.

**Shared connection pools.** HTTP pools, DNS caches, TLS session caches, and
proxy configuration exist once per host, configured once (system proxy
inheritance included), and shared by every granted plugin call. A plugin holds
no private client, no private pool, and no private TLS policy; its
`network.*` calls are multiplexed onto the shared pools inside its declared
scope. Pool ownership, TLS policy, and proxy handling are owner-pending to the
terminal-platform network companion (BN-2); the plugin side sees only
capability-checked calls with per-plugin accounting.

**Single scheduler with the `bitty.timer` shape.** All deferred and repeated
work goes through one host scheduler behind an illustrative `bitty.timer`
spelling:

```lua
-- Illustrative-only spelling.
local handle = bitty.timer.after(5000, function()
  refresh()
end)
local poll = bitty.timer.every(60000, function()
  sync()
end)
bitty.timer.cancel(poll)
```

Timer handles are per-plugin resources: live-timer counts draw from the
plugin's `[limits]` quota, overdue or over-quota timers fail closed, and
suspending a plugin parks its timers (CA-5, CA-6). No plugin-owned loop may
spin the host; a timer callback that overruns meets the accepted RC-1
deadline.

**Shared UI renderer.** Plugins submit description plus state — panels,
components, and content updates — and the host renders them. Plugins never
issue draw calls, touch GPU internals, or own a render path; presentation
composition stays behind the accepted UI extension boundary. Rendering a
granted panel is delivery of submitted state, not execution of plugin drawing
code.

## CA-4 Quotas and tiers (Candidate)

Every grant executes inside a quota. Quotas are declared, reviewed, and
enforced — not advisory.

The illustrative `[limits]` table lives beside the permission declarations in
the manifest:

```toml
# Illustrative-only spelling.
[permissions.network]
hosts = ["api.open-meteo.com"]
methods = ["GET"]

[limits]
tier = "normal"
memory_mb = 32
timers = 8
connections = 4
payload_kb = 256
```

Explicit ceilings override tier defaults downward only; raising any ceiling
above the tier default is a capability increase and re-enters the review gate
that permission increases already pass through. The accepted RC-1, RC-2, and
RC-11 ceilings stay the hard enforcement owners; tier bounds and `[limits]`
values are direction for how declarations map onto those ceilings, and builder
quota mechanics are owner-pending to the Phodopus direction.

Tiers (Candidate, bounds Illustrative-only):

| Tier     | Shape                                                                                                            | Gate                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `tiny`   | Passive, event-reactive plugins (statusline-class): small memory, few timers, no network beyond declared polling | Default review; the expected tier for most plugins                                         |
| `normal` | Interactive plugins with panels and periodic sync                                                                | Default tier; standard consent flow                                                        |
| `heavy`  | Sync/indexer-class plugins with sustained background work                                                        | Review-gated: justification shown at install, increase blocked pending explicit re-consent |
| `system` | Bundled or first-party plugins with host-adjacent duties                                                         | Owner-approved only; never selectable by a third-party manifest                            |

A plugin that outgrows its tier requests a higher one exactly like it requests
a new permission: declared up front, shown to the user, enforced after
consent. Silent tier self-promotion at runtime is a grant violation.

## CA-5 Manager introspection and lifecycle (Candidate)

What the host enforces, the manager shows. Every installed plugin gets a
per-plugin resource view:

- lifecycle state (CA-6) and tier (CA-4);
- memory used against ceiling, fuel consumed against budget;
- live timers, live connections, subscribed events;
- declared grants and compatibility status;
- generation, last event, and last error with diagnostics.

The view composes with the accepted developer-tooling direction (registered
resources, conflicts, latency and startup cost, state and last error); this
page adds the capability-and-quota columns that direction does not yet name.

Lifecycle actions (Candidate), all host-mediated and always available
regardless of plugin cooperation:

| Action  | Effect                                                                                                                                  |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Suspend | Freeze timers and event delivery; the VM is kept but executes nothing. Reversible.                                                      |
| Restart | Terminate the VM and start a fresh one under the same grants and quotas. State is not carried over.                                     |
| Disable | Unload the plugin while keeping it installed and its grants recorded. Takes it out of the trigger set (CA-6).                           |
| Kill    | Terminate immediately with fail-closed cleanup: timers cancelled, connections drained, handles revoked. For runaway or hostile plugins. |
| Inspect | Dump the resource view plus recent errors and the grant list for diagnosis.                                                             |

Kill and Suspend must work against uncooperative code: they operate at the
host boundary (revoked grants, cancelled handles, enforced deadlines), never
by asking the plugin to stop. A plugin that can only be removed by restarting
the terminal fails this doctrine.

## CA-6 Lazy loading and headless suspend (Candidate)

A plugin is always in exactly one of three states:

- **installed**: on disk, integrity-verified, grants recorded — but no VM, no
  handlers, no cost. Installation runs no package code (accepted Invariant 8);
  nothing in this section weakens that.
- **loaded**: a live VM with handlers registered and timers parked within
  quota — idle-cheap, holding no connections and rendering nothing.
- **active**: executing a handler, holding connections, or rendering a visible
  surface.

Triggers move plugins up the ladder, and only triggers do:

- command invocation, subscribed-event delivery, and due timers;
- a UI slot being shown that the plugin fills;
- a remote publish target or notification delivery naming the plugin.

Closing the slot, unsubscribing, or idling past the host's threshold moves the
plugin back down: connections drain, timers park, and the VM may be discarded
while the installed record and grants persist. Reload and update triggers
drain queues before re-activation, consistent with the accepted host-runtime
lifecycle.

**Headless suspend and wake.** With no UI surface attached (headless or
background operation), the host suspends rendering-bound work and parks
timers that exist only to refresh invisible surfaces; event- and
command-triggered work still wakes the plugin to at least loaded, and a shown
slot wakes it to active. Suspend preserves declared state where the lifecycle
contract requires it and rehydrates otherwise; the exact preserve-versus-
rehydrate rule per plugin class is an Open point below, not decided here.

## CA-7 Entropy control and crate-independent API (Candidate)

P1 fails gradually: each consumer-local shortcut looks harmless until the
workspace owns five runtimes and three capability grammars. The entropy
control list names what must not proliferate, no matter how convenient:

1. per-plugin async runtimes, thread pools, or event loops;
2. per-plugin HTTP clients, connection pools, DNS caches, or TLS policies;
3. per-plugin schedulers or timer wheels beside the single scheduler;
4. any Lua-visible socket, FFI, spawn, or unrestricted-filesystem surface;
5. parallel capability grammars — there is one grammar, refined here and owned
   by the accepted capability model, not one per provider family;
6. plugin-owned render paths beside the shared renderer;
7. per-consumer vendored network stacks (the failure the network companion
   exists to prevent).

**The API faces capabilities, not crates.** Plugin contracts name capability
identifiers (`network.http`) and `bitty.*` functions. They never name Rust
crate names, module paths, or deployment shapes. Consequences, as direction:

- splitting, renaming, or swapping the host-side network crates changes host
  internals only; manifests and Lua keep working byte-for-byte;
- moving the network backend from embedded to an external sidecar over IPC
  discovery changes transport only; the capability check, the Lua spelling,
  and the grant recorded at install are untouched;
- adding a feature layer (a new transport, a new provider family) adds a
  capability identifier under the CA-1 grammar; it never renames an existing
  one.

The conformance check for any host-side move is a plugin-visible no-op: the
same manifest, the same Lua, the same grants, the same diagnostics — with the
backend swap leaving no trace in plugin space.

## Security review

| Concern                        | Required control                                                                                                             | Source                                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ambient authority              | No inherited socket, process, filesystem, or environment reach; every host call checks a declared grant and fails closed.    | This document (Candidate); [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md).                                            |
| VM mistaken for sandbox        | The five-term formula is the boundary; VM choice alone authorizes no containment claim.                                      | This document (Candidate); [Lua Runtime RFC](lua-runtime-rfc.md); [Isolation and Resource RFC](isolation-resource-rfc.md).                                                   |
| Socket/FFI/spawn smuggling     | Lua ships no socket library, no FFI, no spawn surface; native in-process plugins stay outside the model.                     | This document (Candidate); [Plugin system](../extensibility/plugin-system.md) (accepted direction).                                                                          |
| Secrets exposure               | Authenticated calls use the `secrets` direction; Lua never sees secret bytes in the strict form; no ambient env reads.       | This document (Candidate); [Plugin system](../extensibility/plugin-system.md) (candidate secrets direction).                                                                 |
| Listen/discovery overreach     | `network.listen` and `network.discovery` are separate elevated grants, never implied by client grants.                       | This document (Candidate).                                                                                                                                                   |
| Quota evasion                  | `[limits]` plus tiers map onto accepted RC-1/RC-2/RC-11 ceilings; ceiling raises re-enter the capability review gate.        | This document (Candidate); [Isolation and Resource RFC](isolation-resource-rfc.md) (Accepted).                                                                               |
| Uncooperative plugin           | Suspend/Kill operate at the host boundary (revoked grants, cancelled handles, deadlines), never by plugin cooperation.       | This document (Candidate); [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) (Accepted lifecycle).                                                                       |
| Infrastructure duplication     | One runtime, one pool set, one scheduler, one renderer; the entropy list forbids per-plugin copies.                          | This document (Candidate); terminal-platform network companion (Owner-pending, BN-2).                                                                                        |
| Crate-coupled plugin contracts | Contracts name capabilities and `bitty.*` functions only; crate swaps and sidecar moves leave no plugin-visible trace.       | This document (Candidate).                                                                                                                                                   |
| Capability bypass              | No section here adds a path around the accepted capability model, its grants, or Invariant 8.                                | [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (Accepted); [Package integrity, activation, and rollback](../packaging/package-lifecycle-rfc.md) (Accepted). |
| Supply chain                   | Provider crates, vendoring, and dependency governance are owner-pending; adoption must satisfy R-019 and the dependency ADR. | This document (Owner-pending); [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md).                                       |

This section records direction; acceptance requires independent security
reviewer evidence and a full traceability table against the shared corpus.

## Verification plan

An accepted revision would need at least:

1. Metadata and link gates: `just check` with zero markdownlint, link,
   metadata, language, agents, and hygiene issues.
2. Grammar tests: one capability grammar parses every CA-1 family; an unknown
   family or a grant implying a sibling fails resolution with a diagnostic.
3. Denial tests: Lua exposes no socket library, no FFI entry, no spawn
   primitive, and no ambient filesystem or environment reach; each probe fails
   at the language boundary, not at a policy check.
4. Grant tests: a call outside the declared scope fails closed with a
   `PermissionDenied`-class diagnostic naming the missing grant; exact-host
   matching admits no wildcard unless explicitly granted and reviewed.
5. Sharing tests: two granted plugins issuing concurrent network, timer, and
   render work share one runtime, one pool set, one scheduler, and one
   renderer; a second copy of any shared machine is a test failure.
6. Quota tests: tier defaults and `[limits]` overrides map onto the accepted
   RC ceilings; over-quota allocation, timers, and connections refuse with
   attribution; ceiling raises without re-consent are rejected.
7. Lifecycle tests: Suspend freezes and resumes; Restart starts clean under
   identical grants; Kill terminates uncooperative code within the host
   deadline with handles revoked and connections drained.
8. Lazy-loading tests: install creates no VM and runs no code; triggers move
   installed to loaded to active and back; headless operation parks
   rendering-bound work and wakes on event or command.
9. Crate-independence tests: a backend swap (including embedded-to-sidecar)
   leaves manifests, Lua, grants, and diagnostics byte-identical from the
   plugin side.
10. Boundary tests: no section of the accepted revision weakens Invariant 8,
    the accepted capability model, or any P0 gate; the normative-sources
    section still lists every owner.

Evidence belongs to the owning implementation repositories; this page records
direction only.

## Alternatives considered

| Alternative                                                        | Trade-off                                                                                                                | Disposition                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Per-plugin runtimes and HTTP clients                               | Simplest per-plugin story, but duplicates runtimes, pools, caches, TLS policy, and proxy handling with per-plugin drift. | Rejected; P1 requires one host-owned copy of each shared machine.                      |
| Ambient authority with a denylist                                  | Less manifest friction, but every new surface is allowed until someone lists it; least privilege becomes reactive.       | Rejected; P2 requires declared grants with fail-closed defaults.                       |
| Plugin-owned network via spawned transfer tools                    | Reuses system binaries, but a spawn grant is arbitrary command execution and breaks P2 entirely.                         | Rejected; narrow `network.*` grants replace shell-outs (accepted rationale, restated). |
| One flat network permission covering client, listen, and discovery | Fewer identifiers, but a weather widget could accept inbound connections or scan the LAN on the same grant.              | Rejected; CA-1 splits client, listen, and discovery into separate grants.              |
| Static tiers with no `[limits]` overrides                          | Simpler review, but forces tier jumps for small needs and pushes authors toward `heavy` by default.                      | Rejected; explicit ceilings may tighten a tier, never loosen it without re-consent.    |
| Eager load-all at startup                                          | Simpler lifecycle, but pays VM, timer, and connection costs for plugins the session never uses.                          | Rejected; CA-6 lazy states with trigger-only activation.                               |
| Crate-named plugin APIs                                            | Direct mapping to host code, but every crate split, rename, or sidecar move breaks manifests and Lua.                    | Rejected; CA-7 faces capabilities, and host moves must be plugin-invisible.            |
| Manager actions by plugin cooperation                              | Less host machinery, but hostile or wedged plugins become unkillable without restarting the terminal.                    | Rejected; Suspend/Kill operate at the host boundary.                                   |

## Affected contracts

Each direction below refines or composes with an owning document; the mark
records whether that owning point is Accepted, Candidate, or Open today.

| Direction                                       | Mark      | Owning document and disposition                                                                                                                                                                                                                                                                      |
| ----------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-1 provider identity and Core/Extension split | Candidate | [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (Accepted capability model); [Plugin system](../extensibility/plugin-system.md) (candidate `bitty.http` shape); install resolution owner-pending to the terminal-platform install-model companion.                                   |
| CA-2 sandbox formula and Lua denials            | Candidate | [Lua Runtime RFC](lua-runtime-rfc.md) (Accepted sandbox construction and stdlib subset); [Plugin system](../extensibility/plugin-system.md) (accepted least-privilege direction); VM mechanics Candidate in [Phodopus Plugin Runtime (Candidate)](phodopus-runtime-candidate.md).                    |
| CA-3 shared runtime, pools, scheduler, renderer | Candidate | [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) (Accepted bridge, lifecycle, `Send` contract); [Isolation and Resource RFC](isolation-resource-rfc.md) (Accepted budgets); pool/TLS/proxy mechanics owner-pending to the terminal-platform network companion.                                  |
| CA-4 `[limits]` table and tiers                 | Candidate | [Isolation and Resource RFC](isolation-resource-rfc.md) (Accepted RC-1, RC-2, RC-11, FS-1..FS-9); review-gate mechanics Accepted in [Package management](../extensibility/package-management.md); builder mapping Candidate in [Phodopus Plugin Runtime (Candidate)](phodopus-runtime-candidate.md). |
| CA-5 introspection view and lifecycle actions   | Candidate | [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) (Accepted VM lifecycle); [Plugin system](../extensibility/plugin-system.md) (candidate `plugin doctor` diagnostics contract); quota columns Open.                                                                                              |
| CA-6 lazy states, triggers, headless suspend    | Candidate | [Package integrity, activation, and rollback](../packaging/package-lifecycle-rfc.md) (Accepted Invariant 8); [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) (Accepted lifecycle, candidate reload triggers); preserve-versus-rehydrate rule Open.                                             |
| CA-7 entropy list and crate-independent API     | Candidate | [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (Accepted capability model); crate split and deployment owner-pending to the terminal-platform network companion; sidecar IPC discovery owner-pending to the terminal-platform install-model companion.                              |

The accepted contracts this page refines are not edited here; where a mark is
Accepted, the owning document wins over any wording on this page.

## Open points

These are **candidate open items, not accepted open questions**. Each must be
decided in the owning contract before any direction here becomes contract:

1. The exact capability identifier spellings and whether `tcp`/`udp`/`quic`
   stay separate identifiers or collapse under one transport grant (CA-1).
2. The port bounds, loopback default, and review bar for `network.listen`, and
   the scope rule for `network.discovery` on untrusted LANs (CA-1).
3. The Core surface manifest: which primitives are always present and the test
   that keeps Core free of network initiation (CA-1).
4. The preserve-versus-rehydrate rule for headless suspend per plugin class,
   and the idle threshold that moves active back to loaded (CA-6).
5. The numeric tier defaults and per-ceiling bounds, which stay measurement
   candidates until workload evidence lands (CA-4).
6. The approval path for `heavy` tier and `system` tier membership, and the
   re-consent UX for tier increases (CA-4, CA-5).
7. The manager surface shape: which view columns and actions live in the
   built-in manager versus the diagnostic command (CA-5).
8. The plugin-visible no-op conformance suite for backend swaps, including the
   embedded-to-sidecar move (CA-7).
9. Registry entries OQ-012 and OQ-014 as the accepted governance context this
   direction refines; any promotion or new open question belongs to the owning
   governance register, not to this page.

## Acceptance criteria

An accepted version of this direction would need:

1. Independent review by the plugin-ecosystem category owner, a docs curator,
   and a security reviewer, with terminal-platform-owner coordination for the
   network, install-model, and ABI boundaries.
2. The owner-pending network and install-model companions in place before any
   clause depending on them is promoted; this page asserts no host-side
   mechanism of its own.
3. A capability grammar that covers every CA-1 family with no sibling
   implication, composed with the accepted capability model.
4. A sandbox statement that keeps the five-term formula and the Lua denial
   boundary testable, with no VM-alone containment claim.
5. Shared-service singularity evidence: one runtime, one pool set, one
   scheduler, one renderer under concurrent granted load.
6. A quota contract reconciled with the accepted RC ceilings and failure
   semantics, with tier definitions and review-gated escalation.
7. Host-boundary lifecycle evidence: Suspend, Restart, Disable, Kill, and
   Inspect all effective against uncooperative code.
8. Lazy-loading evidence preserving Invariant 8, with trigger-only activation
   and headless suspend/wake behavior.
9. Crate-independence evidence: a backend swap with zero plugin-visible diff.
10. No weakening of any normative security control; every high-risk identifier
    receives independent security review.

## P0 Review Sign-off

Not signed. This document is a **draft candidate**: it records direction for
future review and records no accepted contract. P0 review and sign-off apply
only when the direction is proposed for acceptance in an owning contract, with
terminal-platform-owner coordination for the network, install-model, and
host-ABI boundaries.

## References

- [Lua Runtime RFC](lua-runtime-rfc.md) — accepted Lua runtime, sandbox,
  standard-library subset, and module search rules.
- [Isolation and Resource RFC](isolation-resource-rfc.md) — accepted isolation
  boundaries, RC ceilings, and failure semantics.
- [Plugin Host Runtime RFC](plugin-host-runtime-rfc.md) — accepted host
  bridge, VM lifecycle, and host-service `Send` contract.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) — accepted
  manifest, capability, command, event, and lifecycle contract.
- [Package integrity, activation, and rollback](../packaging/package-lifecycle-rfc.md)
  — accepted package integrity, staged activation, and rollback contract
  (Invariant 8: installation runs no package code).
- [Plugin system](../extensibility/plugin-system.md) — accepted
  least-privilege capability direction with the candidate `bitty.http`
  network shape and secrets direction.
- [Phodopus Plugin Runtime (Candidate)](phodopus-runtime-candidate.md) —
  candidate successor-runtime mechanics this doctrine treats as one sandbox
  term.
- [bitty-network Shared Network Crates (Candidate)](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/bitty-network-candidate.md)
  — terminal-platform companion owning the crate split, unified runtime and
  policy, and deployment shape (BN-1..BN-8).
- Terminal-platform L1 install-model and `[requires]` companion (in flight
  toward `specifications/l1-install-requires-candidate.md`) — owns install
  resolution, consent-gated fetch, and offline behavior this doctrine assumes.
