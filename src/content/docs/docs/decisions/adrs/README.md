---
title: Architecture decision records
description: Durable records of accepted architectural choices alternatives and consequences
category: decisions
audience: maintainer
document_type: index
status: accepted
website_publish: true
sidebar_order: 30
---

# Architecture decision records

This directory contains accepted, proposed, superseded, and historical
architecture decisions. The [decision register](../index.md) records broader
working directions and the remaining ADR queue.

| ADR                                                                                                                | Status   | Scope                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [ADR 0001 - Repository Bootstrap Baseline](ADR-0001-repository-bootstrap-baseline.md)                              | Accepted | Minimal implementation-neutral Core and website scaffolding                                                                                                                          |
| [ADR 0002 - Platform Support Tiers](ADR-0002-platform-support-tiers.md)                                            | Accepted | Initial Linux/macOS/Windows/BSD support tiers and CI guarantees                                                                                                                      |
| [ADR 0003 - Core Workspace Topology](ADR-0003-core-workspace-topology.md)                                          | Accepted | Single Cargo workspace crate graph, dependency rules, MSRV                                                                                                                           |
| [ADR 0004 - Upstream Dependency Set](ADR-0004-upstream-dependencies.md)                                            | Accepted | Adopt/wrap/reject choices and maintenance policy for first upstream libraries                                                                                                        |
| [ADR 0005 - Lua Pins, Upgrade Cadence, Stdlib Allowlist and Unsafe-Surface Audit](ADR-0005-lua-pins-and-stdlib.md) | Accepted | Exact Lua 5.4.x, mlua, piccolo 0.3.3 pins, upgrade cadence, vendored verification, allowlist, and unsafe-surface audit                                                               |
| [ADR 0006 - os.getenv Exposure and Bitty Module Policy](ADR-0006-os-env-policy.md)                                 | Accepted | os.getenv denial, desensitized bitty.env.get with capability-gated allowlist, audit logging, and migration                                                                           |
| [ADR 0007 - Async/Send Boundary and GC Tuning for Lua VMs](ADR-0007-async-gc.md)                                   | Accepted | Async/Send boundary (mlua vs piccolo, Send/Sync, tasks 64/timers 32), GC tuning (incremental pause/step), Config VM budget charging (PB-1/PB-2), and reload/module-cache interaction |
| [ADR 0008 - Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](ADR-0008-headless.md)                   | Accepted | Headless daemon detach/reattach and remote UI deferred to post-v1.0 with trust-boundary analysis gate                                                                                |

## Admission criteria

An ADR states context, considered alternatives, the accepted decision,
rationale, consequences, affected contracts, and evidence of review. It records
a material choice rather than routine implementation detail.

## Authority and status

An accepted ADR governs the decision it names but does not prove implementation.
Later ADRs supersede earlier records; accepted records are not silently edited
to make history appear linear.

## Naming and maintenance

Use `ADR-NNNN-short-title.md` with monotonic identifiers. Link the Issue,
CarryCtx decision/task, specifications, and superseding ADR. Update navigation
and affected contracts when status changes.
