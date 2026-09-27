---
title: SDK build plan proposal (Phase 0)
description: Draft candidate Phase 0 proposal recording which SDK surface can be frozen now, what stays churning, and the recommended build sequencing
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 27
---

# SDK build plan proposal (Phase 0)

> Status: **draft**, candidate proposal for Phase 0 of the plugin SDK build
> plan. This page separates freezable SDK surface from churning surface,
> sketches candidate SDK and template layouts, and recommends build
> sequencing. It authorizes no implementation, freezes no API, adds no Core
> API, and weakens no security control. SDK-side build work and any
> open-question register update are follow-up tasks in their owning
> repositories and are explicitly out of scope here.

## Purpose and scope

- This page is the self-contained canonical proposal for SDK build plan
  Phase 0: which parts of the plugin SDK, the plugin template, and the Lua
  core-part surface can be built now, and which parts must wait for open
  decisions.
- In scope: the frozen-versus-churning classification against accepted
  contracts, the candidate SDK and template layouts, the Lua core API
  consolidation for codegen scoping, and the recommended build sequencing.
- Out of scope: host-bridge implementation work in the terminal-core
  repository, SDK package implementation, registry design, transport and
  signing policy, and the cross-project open-question register itself, which
  stays in
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs).
- Documentation only: no SDK, template, transport, registry, or product
  feature is implemented by this page.

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  untrusted-by-default posture; capability families; invariants 2
  (third-party plugins start without filesystem, network, process,
  clipboard, runtime-control, debug, or protocol-registration authority), 3
  (presentation, never Terminal Truth), 4 (no hot-path execution), 8
  (installation runs no package code and updates cannot silently add
  capabilities), and 10 (`bitty --safe`).
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  abuse cases T-06, T-07, T-10, T-12, and T-13 and the plugin-to-host
  data-flow controls.
- [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md):
  R-006 through R-009, R-013, R-015 through R-017, and R-022.
- [Core and Plugin Boundaries](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/core-boundaries.md):
  mechanism/policy split, observation-versus-interception event distinction,
  capability-family separation, declarative UI, generation-based lifecycle,
  and the two security domains (`TerminalSecurityPolicy` versus
  `PluginCapabilities`).
- [Plugin Platform RFC](plugin-platform-rfc.md): accepted manifest,
  capability, grant, registry, and event-pipeline contract.
- [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md):
  accepted v1 host surface, the L1/L2 split, and the frozen exclusion list.
- [Plugin Host Runtime RFC](../runtime/plugin-host-runtime-rfc.md),
  [Lua Runtime RFC](../runtime/lua-runtime-rfc.md), and
  [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md):
  accepted bridge mechanics, runtime direction, and resource ceilings.

Where this proposal picks concrete build inputs, it consumes the accepted
wording above; it moves no requirement between owners and relaxes no gate.

## Terminology

| Term            | Meaning in this document                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------- |
| Frozen          | An accepted contract the SDK may generate code and tests from without inventing identifiers.        |
| Churning        | An open decision the SDK must not expose until the owning contract accepts it.                      |
| Pending-host    | Accepted v1 surface the host bridge has not wired yet; the SDK marks it and asserts no behavior.    |
| One-way codegen | Generation flows accepted text to machine surface to typings and docs, never the reverse.           |
| Mock host       | An in-memory host double used by SDK conformance tests; grants are simulated in memory only.        |
| Conformance     | The SDK parity suite that checks generated surface against accepted contracts and shipped evidence. |

## S-1 Freezable now: accepted contracts the SDK may build from

Every row below is an accepted contract in this corpus. The SDK consumes the
accepted text and invents no identifiers.

| Surface                                                                                                   | Accepted contract                                                        | SDK implication                                                                     |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Manifest schema and limits (`PluginId`, `Compat`, bounded counts, tool allowlist)                         | [Plugin Platform RFC](plugin-platform-rfc.md)                            | Freeze the manifest JSON schema and lint rules.                                     |
| Capability grammar (closed, deny-by-default, no wildcards)                                                | [Plugin Platform RFC](plugin-platform-rfc.md)                            | Freeze the capability catalog and gating tables.                                    |
| Grant lifecycle (hash binding, explicit-consent type, fail-closed on additions, narrowing)                | [Plugin Platform RFC](plugin-platform-rfc.md)                            | Freeze the grant-diff approval UX contract; do not freeze storage paths.            |
| Registry and generations (lifecycle names, duplicate qualified-name rejection, monotonic generation)      | [Plugin Platform RFC](plugin-platform-rfc.md)                            | Freeze the qualified-name rule `<plugin-id>:<resource>` and lifecycle names.        |
| Event pipeline (three classes, closed v1 kind set, bounded per-subscriber queues, veto-only interception) | [Plugin Platform RFC](plugin-platform-rfc.md)                            | Freeze event-name strings and payload shapes for codegen scoping.                   |
| Lua v1 function spellings across the accepted namespaces                                                  | [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md) | Freeze typings and the machine surface; keep generation one-way from accepted text. |
| VM budgets (instruction and time ceilings, per-plugin memory, three-level queues)                         | [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md)       | Freeze budget numbers in conformance timeout and quota expectations.                |
| Bridge mechanics (read-only root, source-rooted `require`, admission bounds, sync non-blocking services)  | [Plugin Host Runtime RFC](../runtime/plugin-host-runtime-rfc.md)         | Freeze the activation shape, `require` rules, and error classes.                    |
| Plugin authoring shape (activation-only registrations, bounded constants, no ambient authority)           | Accepted by example and template practice                                | Freeze the template file layout; changes are additive only.                         |

## S-2 Churning: do not freeze until the owning decision lands

Every item below is open. No SDK surface may expose it, and no conformance
test may assert it.

| Item                                                                                                                                                                | Why it blocks SDK surface                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Provider contract (open: role panels, event kinds and routing, panel and session lifecycle coupling, envelope semantics)                                            | No panel-registration Lua spelling exists; the v1 exclusion list defers it.                                   |
| Placement (candidate direction recorded, RFC amendment pending)                                                                                                     | The SDK must not expose panel or view identity mapping or focus-target helpers until accepted.                |
| Event bus beyond v1 (open: semantic UI slots, presentation projection, workspace policies, automation action classes, service multiplicity, API version assignment) | `bitty.ui.mount` stays declarative slot content only; Core-side registries are not Lua-callable v1 surface.   |
| Reload and update triggers plus queue drain (open: trigger surface, watcher contract, generation-N drain at disposal)                                               | The template documents manual-reload-only workflow; conformance must not assert watcher or debounce behavior. |
| Panel lease and handoff (refines the provider contract)                                                                                                             | Out of SDK scope entirely until the provider contract lands.                                                  |
| Streaming components (open: damage-budget and lifecycle contract)                                                                                                   | The SDK keeps the "no hot-path events" exclusion frozen; no streaming helpers.                                |
| Grant persistence path (deferred behind in-memory stubs)                                                                                                            | The mock host may simulate grants in memory; it must not promise on-disk paths or cross-version migration.    |

## S-3 Host-parity condition for four accepted v1 namespaces

Four accepted v1 namespaces (`keymaps`, `services`, `tasks`, `env`) were
candidate-marked `pending-host` until the host bridge wired them or recorded
an explicit deferral with per-namespace diagnostics. That condition is now
partially closed, incrementally, by `bitty` CTX-0707 (PR #1303, in
`origin/main` at `c01f538`, read-only inspection; parity suite
`crates/bitty-lua/tests/lua_parity.rs`, 13 tests):

- WIRED as bridge captures: `bitty.keymaps.suggest` (LUA-OQ-5; suggestion
  capture with `when = "global"` default, 128-suggestion cap, runtime applies
  after activation) and `bitty.tasks.spawn`/`cancel` (LUA-OQ-9, RC-4;
  integer handles under the 64-live-task cap with typed `E_BUDGET_TASK`).
- DEFERRED with typed `E_NOT_IMPLEMENTED`: `bitty.services.get`/`provide`
  (LUA-OQ-8; consumer resolution and `E_SERVICE_GONE` lifecycle need host
  backends that do not exist yet) and `bitty.env.get`/`has` (host allowlist
  backend not landed).
- Ruled v1-OUT: `bitty.process.spawn` stays a consent-gated extra for
  first-party needs with no `api_version` stability promise; SDK conformance
  must not assert it as v1 surface.

The SDK typings may declare all four namespaces; SDK conformance may assert
behavior only for the wired two (against the host parity tests, never
invented) and must keep skipping behavior assertions for the deferred two so
the mock-host parity suite never asserts behavior the host cannot perform. The
wiring itself is terminal-core work and is out of scope here.

## S-4 Candidate SDK and template layouts

Both layouts extend the existing trees. They add no new Lua spelling beyond
the accepted v1 set consolidated in
[S-5](#s-5-lua-core-api-consolidation-for-codegen-scoping).

### S-4.1 SDK package layout

```text
bitty-plugin-sdk/
  lua/
    bitty.d.lua            # GENERATED from accepted text. Header records
                           #   sources. Never hand-edit spellings.
    examples/              # one minimal init.lua per area (commands,
                           #   events, store, ui.mount, snapshot)
  surface/
    bitty-plugin-api-v1.json   # machine source of truth for codegen; adds
                           #   a host-parity flag per namespace (S-3) so
                           #   conformance can skip pending-host surface
  src/
    manifest / schema / json-schema       # lint for the frozen manifest row
    capabilities / path-pattern           # closed-grammar tables
    mock-host                             # in-memory host double; grants in
                                          #   memory only; pending-host
                                          #   namespaces raise typed errors
    conformance                           # parity suite against the surface
                                          #   file; per-namespace skip on
                                          #   pending-host
    host-surface / host-diagnostics / diagnostics / version-range
  conformance/             # plugin-facing vectors (event payloads, budget
                           #   expectations, error classes)
```

Rules: one-way generation (accepted text to surface file to typings and
docs); the SDK never invents identifiers; the `api_version` value stays
until a reviewed revision bumps it.

### S-4.2 Template layout

```text
template/
  bitty-plugin.toml        # id owner.name, compat ranges, deny-by-default
                           #   capabilities, lazy triggers
  lua/<plugin-module>/
    init.lua               # activation-only registrations; owns nothing past
                           #   its generation; manual-reload-only note
    <module>.lua           # pure logic plus bounded constants beside init.lua
  package.json / lockfile  # pin the SDK commit for the manifest gate
  justfile                 # manifest gate, test, lint
  README.md                # capability justifications (why each grant is needed)
```

## S-5 Lua core API consolidation for codegen scoping

The freezable core is exactly the accepted v1 set; this table consolidates
(never extends) the Lua Surface RFC for SDK codegen scoping. Capability
gates are unchanged.

| Namespace        | Functions                                                                        | Capability gate                                    |
| ---------------- | -------------------------------------------------------------------------------- | -------------------------------------------------- |
| `bitty.commands` | `register(def)`                                                                  | None (core-registered)                             |
| `bitty.events`   | `subscribe(name, handler)`, closed name set, bounded payloads                    | None; payloads bounded                             |
| `bitty.keymaps`  | `suggest(def)`, suggestion only                                                  | None                                               |
| `bitty.settings` | `get(key)`, `set(key, value)`, plugin-owned namespace                            | None                                               |
| `bitty.store`    | `get(key)`, `set(key, value)`, bounded quotas, typed quota errors                | None                                               |
| `bitty.notify`   | `show(payload)`                                                                  | `platform.notify`                                  |
| `bitty.env`      | `get(name)`, `has(name)`, desensitized                                           | Per-key grant; ungranted access fails closed       |
| `bitty.ui`       | `mount(slot, component)`, `update(handle, component)`, minimal node set          | `ui.rich`, plus overlay grant for the overlay slot |
| `bitty.terminal` | `snapshot(opts)`, read-only                                                      | `terminal.semantic-read`                           |
| `bitty.services` | `get(iface, opts)`, `provide(iface, impl)`, bounded interface schema in manifest | Provider grants stay with the callee               |
| `bitty.tasks`    | `spawn(fn)`, `cancel(task_id)`, bounded live tasks per plugin                    | Resource caps                                      |
| `bitty.timers`   | `create(delay_ms, cb)`, `cancel(timer_id)`                                       | Resource caps                                      |

The frozen exclusions are re-affirmed unchanged: Terminal Truth writes,
raw and input authority, hot-path events, higher-layer presentation and
protocol registration, panel providers, browser and agent surfaces,
interception rewriting, ambient filesystem, process, network, and clipboard
services, aliases, and Rust internals.

## S-6 Recommended sequencing

Build only after the corresponding core surface converges; each step is a
separately scoped task in the owning repository.

1. **Close the S-3 parity condition first (terminal-core side).** Wire the
   pending-host namespaces into the bridge or record explicit deferrals.
   Partly done incrementally by `bitty` CTX-0707/#1303 (`keymaps` + `tasks`
   wired, `services` + `env` deferred, `process.spawn` ruled v1-OUT); the
   deferred two still gate v1-completeness claims for their surface.
   Nothing else in the SDK can claim v1-completeness before this. Depends
   on: accepted text already present, no RFC wait.
2. **Freeze the SDK generation pipeline.** One-way codegen, host-parity
   flags, mock-host pending-host diagnostics. Depends on: step 1.
3. **Freeze the template and the manifest lint.** Additive template polish,
   the manifest gate pinned to an SDK commit, per-capability README
   justifications. Depends on: steps 1-2. Reload stays manual-only.
4. **Conformance vectors from shipped evidence.** Event-payload, budget, and
   error-class vectors checked against host parity tests, never invented.
   Depends on: steps 1-2 plus host hardening landing.
5. **After provider and placement acceptance:** panel-provider Lua spelling,
   placement-safe helpers, and identity rules as a versioned addition via a
   reviewed revision, never SDK-invented. After event-bus acceptance:
   semantic slots, status-component composition, and service multiplicity.
   After reload-contract acceptance: watcher workflow and queue-drain
   conformance.

## Security review

- The frozen capability grammar stays closed and deny-by-default; the SDK
  ships gating tables, never broader authority.
- Grant-diff approval stays fail-closed on additions; the mock host keeps
  grants in memory and promises no storage path.
- Plugins alter presentation, never terminal truth; the frozen exclusions
  (S-5) keep input, parser, and render hot paths out of reach and grant no
  ambient Lua or OS authority.
- Activation-only registrations and bounded quotas are part of the frozen
  template shape; installation executes no package code.

## Verification plan

- The S-1 and S-2 classification is checked against the open-question
  register: no open item listed as freezable, no accepted contract listed
  as churning.
- The S-4 layouts are checked to add no new Lua spelling beyond the
  accepted v1 set consolidated in S-5.
- The S-3 pending-host marking is checked to skip behavior assertions for
  the deferred namespaces (`services`, `env`); the wired namespaces
  (`keymaps`, `tasks`) assert against host parity tests only.
- `just check` passes locally on the delivery branch.

## Alternatives considered

- **Freeze the whole v1 surface now, including panel providers.** Rejected:
  the provider and placement decisions are open, and freezing them would
  invent API the owning contracts have not accepted.
- **Hand-edit typings per release.** Rejected: one-way generation from
  accepted text is the only direction that keeps typings, the machine
  surface, and docs consistent.
- **Let the SDK promise grant storage paths.** Rejected: persistence is
  deferred behind in-memory stubs, so any promised path would be fictional.

## Affected contracts

- [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md):
  consumed as generation input; unchanged by this proposal.
- [Plugin Platform RFC](plugin-platform-rfc.md): consumed as generation
  input; unchanged by this proposal.
- Runtime RFCs ([host](../runtime/plugin-host-runtime-rfc.md),
  [Lua](../runtime/lua-runtime-rfc.md),
  [isolation](../runtime/isolation-resource-rfc.md)): consumed as
  generation input; unchanged by this proposal.
- Future SDK and template implementation tasks in their owning
  repositories: sequenced by S-6; none authorized by this page.

## Open points

- Whether the pending-host namespaces (S-3) land together or incrementally
  decides whether v1 conformance ships whole or gated per namespace.
  Answered incrementally by `bitty` CTX-0707/#1303: conformance gates per
  namespace (wired `keymaps`/`tasks` assertable, deferred `services`/`env`
  skipped).
- The SDK needs a revision-refresh policy so accepted-text updates reach
  the machine surface and typings without drift.

## Acceptance criteria

- [ ] S-1 and S-2 classification matches the open-question register (no
      open item listed as freezable, no accepted contract listed as churning).
- [ ] The S-3 condition marks pending-host namespaces so conformance
      asserts no behavior the host cannot perform.
- [ ] Layouts in S-4 add no new Lua spelling beyond the accepted v1 set in
      S-5.
- [ ] `just check` passes locally on the delivery branch.

## P0 Review Sign-off

Not signed. This document is a **draft candidate**: it records direction
for future review and records no accepted contract. P0 review and sign-off
apply only when the direction is proposed for acceptance in an owning
contract.

## References

- [Plugin Platform RFC](plugin-platform-rfc.md) — accepted manifest,
  capability, grant, registry, and event-pipeline contract.
- [Plugin API v1 Lua Surface RFC](../sdk/plugin-api-v1-lua-surface-rfc.md) —
  accepted v1 host surface, L1/L2 split, and exclusions.
- [Plugin Host Runtime RFC](../runtime/plugin-host-runtime-rfc.md) —
  accepted bridge mechanics and activation shape.
- [Lua Runtime RFC](../runtime/lua-runtime-rfc.md) — accepted runtime
  direction.
- [Isolation and Resource RFC](../runtime/isolation-resource-rfc.md) —
  accepted resource ceilings and failure semantics.
- [Plugin system](../extensibility/plugin-system.md) — extension levels,
  register-versus-claim, and presentation boundaries.
- [Open questions register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) —
  owner-pending provider, placement, event-bus, reload, lease, and
  streaming decisions.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  and [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) —
  normative posture and abuse cases.
- [Core and Plugin Boundaries](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/core-boundaries.md) —
  mechanism/policy split and the two security domains.
