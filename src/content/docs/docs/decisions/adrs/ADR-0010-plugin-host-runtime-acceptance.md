---
title: ADR 0010 - Plugin Host Runtime Acceptance Resolution
description: Accepted decision ratifying OQ-033 OQ-034 and OQ-035 and the plugin host runtime RFC
category: decisions
audience: plugin-author
document_type: specification
status: accepted
website_publish: true
sidebar_order: 40
---

# ADR 0010 - Plugin Host Runtime Acceptance Resolution

## Status

**Accepted** on 2026-09-11 by the project initiator (user), which ratified the
bounded resolutions in the
[Plugin Host Runtime RFC](../../specifications/plugin-host-runtime-rfc.md) for
[OQ-033](../open-questions.md), OQ-034, and OQ-035 exactly as proposed,
including the four named numeric defaults. The RFC now carries frontmatter
`status: accepted`; the synchronized documents listed under
[Acceptance effects](#acceptance-effects) were updated in the same change. This
decision authorizes the `bitty` implementation workstreams for Gap A, Gap B, and
Gap C to derive from the RFC; it authorizes no implementation by itself and does
not weaken any normative security control.

- Deciders: project initiator (user), coordinated by the commander.
- Prepared by: `ctx-0148-acceptor` (scoped docs acceptance subagent), session
  `01M280BP7BPRCAZ86495VQYMV0`; Git worktree
  `.worktrees/ctx-0148-docs-plugin-host-runtime-design`, branch
  `ctx-0148/docs-plugin-host-runtime-design`.
- Ratification basis: the Draft RFC was authored, reviewed, and delivered under
  `bitty-docs` CTX-0148 (Issue #195, PR #196); the recorded independent review
  verdict and evidence are in CarryCtx. This ADR records the subsequent
  project-initiator ratification.
- Related: [ADR 0009](ADR-0009-plugin-api-v1-lua-surface.md) (Lua surface and
  three-way authority split), [ADR 0005](ADR-0005-lua-pins-and-stdlib.md),
  [ADR 0006](ADR-0006-os-env-policy.md),
  [ADR 0007](ADR-0007-async-gc.md),
  accepted [Plugin Platform RFC](../../specifications/plugin-platform-rfc.md),
  [Plugin API v1 Lua Surface RFC](../../specifications/plugin-api-v1-lua-surface-rfc.md),
  [Lua Runtime RFC](../../specifications/lua-runtime-rfc.md),
  [Isolation Resource RFC](../../specifications/isolation-resource-rfc.md), and
  [Package Lifecycle RFC](../../specifications/package-lifecycle-rfc.md).

## Context

The `bitty` live campaign `CTX-0320` reported defect D4 (P0): the plugin host was
not wired at runtime, no plugin code loaded, and a tested plugin such as
`bitty-featured.activity` could not run. The implementer's gap analysis
(`bitty` `CTX-0324`, commit `bbad681`) stopped rather than inventing a required
design decision and recorded three missing accepted designs: the runtime host
bridge and per-plugin VM lifecycle (Gap A), runtime plugin source resolution and
staging including the development local-path flow (Gap B), and the host-service
wiring boundary (Gap C).

The accepted sources fixed the surrounding contracts but not the mechanisms:
the [Lua Runtime RFC](../../specifications/lua-runtime-rfc.md) fixes one
host bridge per VM and rooted source-only resolution; the
[Plugin API v1 Lua Surface RFC](../../specifications/plugin-api-v1-lua-surface-rfc.md)
fixes the surface, `init.lua`, and generation-owned resources; the
[Package Lifecycle RFC](../../specifications/package-lifecycle-rfc.md) fixes
staged activation but delegates the stored tree location. The CTX-0148 Draft RFC
recorded bounded resolutions for all three gaps. The project initiator has now
ratified them.

## Decision

Adopt the [Plugin Host Runtime RFC](../../specifications/plugin-host-runtime-rfc.md)
as an accepted specification and resolve the three registered open questions.

1. **OQ-033 (host bridge and VM lifecycle).** Adopt the three-way authority
   split: policy stays in `bitty-plugin-host` (VM-free), the seam in
   `bitty-lua`, orchestration in a new `bitty-runtime` `plugin_runtime` module
   that gains the `bitty-lua` dependency, and wiring in `bitty-app`. Adopt the
   proposed `bitty-lua` seam (read-only host-module injection, rooted
   source-only `require`, bounded execution, bounded marshalling), the
   synchronous non-blocking non-reentrant marshalling contract, one VM per
   `(PluginId, generation)` confined to one executor thread, the
   `Unloaded -> Loading -> Activating -> Active -> Suspended -> Disposing ->
Disposed` lifecycle with reload disposing generation N before N+1, and the
   `RC-1`-reused activation deadline with the proposed `E_TIMEOUT`.
2. **OQ-034 (source resolution and staging).** Adopt the
   `$XDG_DATA_HOME/bitty/plugins/` store with the atomic `current.json`
   active-version pointer, the stored manifest body and `lua/` module tree, the
   fail-closed discovery and integrity checks (`manifest_hash` and
   `content_digest`), native-artifact rejection, the extended runtime source
   record (`source_class`, `version`, `root`, `content_digest`), and the
   read-only recorded-absolute local-path development flow that is never treated
   as verified.
3. **OQ-035 (host-service wiring).** Adopt the ownership, mode, and persistence
   table: `terminal.snapshot` as a synchronous bounded core read through the
   runtime provider trait; `notify.show` as an asynchronous hand-off;
   `store.*` as a synchronous atomic quota-bounded store owned by
   `bitty-plugin-host`; `settings.*` owned by `bitty-config`; the synchronous
   non-blocking `Send` contract; and the typed fail-closed error contract.
4. **Numeric defaults.** Fix the four proposed defaults as named constants.

| Constant                       | Accepted default | Applies to                        |
| ------------------------------ | ---------------- | --------------------------------- |
| `PLUGIN_MANIFEST_MAX_BYTES`    | 256 KiB          | Stored manifest body per package  |
| `PLUGIN_MODULE_MAX_FILES`      | 4096             | Files in one module tree          |
| `PLUGIN_MODULE_TREE_MAX_BYTES` | 16 MiB           | Aggregate module tree per package |
| `PLUGIN_MODULE_PATH_MAX_BYTES` | 1024             | Canonical module path length      |

The activation deadline reuses the accepted `RC-1` (`10^7` instructions or 50 ms
wall, whichever first; 8 ms soft warning) and introduces no new budget. Changing
any accepted number requires an RFC revision, not silent drift.

## Considered alternatives

- **Leave the RFC Draft and keep the OQs Open.** Rejected: the `bitty` runtime
  wiring remains blocked and the gap analysis cannot proceed without a selected
  mechanism.
- **Place bridge policy in `bitty-plugin-host`.** Rejected: it would give the
  policy crate a `bitty-lua` dependency and let VM-local state sit on the
  capability path.
- **One global VM or implicit cross-plugin module reach.** Rejected: violates
  `IR-D2` one-VM-per-identity-and-generation and plugin isolation.
- **Symlink-based active-version pointer.** Rejected: the atomic pointer must
  not depend on symlink support; `current.json` write-temp-then-rename gives the
  accepted all-or-nothing switch.
- **Resolve `registry` and `git` sources in the first slice.** Deferred: the
  first slice needs `bundled` and `local-path`; `registry`/`git` become loadable
  once the package manager emits a resolved record.

## Consequences

- The `bitty` runtime workstreams for Gap A, Gap B, and Gap C can derive from an
  accepted contract; the RFC is the single authoritative definition and this ADR
  records only the ratification.
- Security posture is preserved or narrowed: the policy crate stays VM-free,
  native artifacts are rejected, `bitty --safe` still creates no third-party VM
  and reads no third-party store tree, and no bridge call runs on a hot path.
- `bitty.store` data is plugin-scoped and survives generation disposal until
  uninstall or explicit user purge; uninstall, rollback, and purge keep
  independent semantics because the plugin state directory is separate from the
  package tree.
- The acceptance authorizes derivation, not implementation. Each gap still
  requires its `bitty` implementation task and its RFC verification gates
  (seam, lifecycle, staging, host-service tests) before any shipped behavior is
  claimed.

## Acceptance effects

The following synchronized documents were updated in the same change:

- [Plugin Host Runtime RFC](../../specifications/plugin-host-runtime-rfc.md) -
  frontmatter `status: accepted`, dated ratification note, ratified numeric
  defaults, and resolved open-questions section.
- [Open-question register](../open-questions.md) - OQ-033, OQ-034, and OQ-035
  marked Accepted with their ratified resolutions; the OQ-034 source-layout
  dependency is recorded as resolved.
- [Decision register](../index.md) - candidate-queue entry marked Accepted.
- [Specifications index](../../specifications/README.md) - the RFC moved from
  the Draft table to the accepted table.
- [Plugin system](../../extensibility/plugin-system.md) - validation note points
  at the accepted RFC.
- [Core boundaries](../../architecture/core-boundaries.md) - pending-decision
  pointer updated to the accepted RFC.
- [ADR index](README.md) - this ADR added.

## Evidence and review

- Draft RFC `docs/specifications/plugin-host-runtime-rfc.md` (504 lines) authored
  and delivered under `bitty-docs` CTX-0148 (Issue #195, PR #196).
- Local gate `just check` green and the Docs quality workflow green on the Draft
  revision; evidence recorded in CarryCtx under CTX-0148.
- Recorded independent Draft review with an APPROVE verdict and no blocking
  findings (CarryCtx CTX-0148 progress PX-0572).
- Project-initiator ratification of OQ-033, OQ-034, OQ-035, and the four numeric
  defaults on 2026-09-11.
- This ADR authorizes no implementation; the `bitty` implementation tasks remain
  separate and dependent on their own acceptance evidence.
