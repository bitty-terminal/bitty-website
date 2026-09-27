---
title: Reference
description: Planned factual reference for stable Bitty interfaces and formats
category: reference
audience: mixed
document_type: index
status: draft
website_publish: true
sidebar_order: 10
---

# Reference

Reference documentation will describe verified, versioned product contracts in
a factual and lookup-oriented form. An experimental implementation exists and
pre-alpha releases exist (latest `v0.0.20`), but no stable or supported public
contract is claimed yet: no CLI, configuration key, Lua API, plugin API, or
protocol reference is verified, `Compatible`, or `Release-ready`. The
[terminal compatibility matrix](compatibility-matrix.md) is the first draft
reference page: it records per-scenario evidence status rather than promising
stable behavior.

## Planned reference sets

| Reference     | Future contents                                                                                                                                                                                                                                                                            | Required evidence                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| CLI           | Commands, options, environment variables, output schemas, exit codes, and instance selection.                                                                                                                                                                                              | Implemented command registry plus conformance tests.                    |
| Configuration | Locations, precedence, fields, types, defaults, reload behavior, diagnostics, and migrations. The [configuration options reference](configuration-options.md) (draft) plus the machine-readable [configuration-inventory.json](configuration-inventory.json) cover the pre-0.0.21 surface. | Accepted configuration schema and parser/reconciler tests.              |
| Lua           | Runtime version, allowed libraries, modules, functions, types, errors, budgets, and compatibility.                                                                                                                                                                                         | Versioned host API and isolation/capability tests.                      |
| Plugin API    | Manifest, lifecycle, commands, events, UI, services, capabilities, versioning, and package rules.                                                                                                                                                                                          | Accepted Plugin API specification, SDK tests, and compatibility policy. |
| Compatibility | Terminal compatibility matrix: areas, scenarios, evidence status, and gaps (draft).                                                                                                                                                                                                        | Compat-lab corpora, named tests, and env-gated local PTY probes.        |
| Protocols     | Terminal compatibility, structured content, IPC, debug, MCP, and wire schemas.                                                                                                                                                                                                             | Versioned specifications and interoperability/security tests.           |

## Reference versus design

Design documents explain intent, alternatives, boundaries, and candidate
contracts. Reference documents enumerate what a specific supported version
actually accepts, returns, or guarantees. A design proposal does not become
reference material until its owning implementation and tests provide evidence.

Current proposals remain in the [CLI design](../interfaces/cli.md),
[configuration design](../configuration/lua-and-xdg.md),
[plugin-system design](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/plugin-system.md), and
[rich-content design](../interfaces/rich-content.md). They must not be copied
here as if they were released behavior.
