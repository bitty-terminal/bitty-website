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
a factual and lookup-oriented form. Bitty is pre-implementation, so no stable
CLI, configuration keys, Lua API, plugin API, or protocol reference exists yet.

## Planned reference sets

| Reference     | Future contents                                                                                    | Required evidence                                                       |
| ------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI           | Commands, options, environment variables, output schemas, exit codes, and instance selection.      | Implemented command registry plus conformance tests.                    |
| Configuration | Locations, precedence, fields, types, defaults, reload behavior, diagnostics, and migrations.      | Accepted configuration schema and parser/reconciler tests.              |
| Lua           | Runtime version, allowed libraries, modules, functions, types, errors, budgets, and compatibility. | Versioned host API and isolation/capability tests.                      |
| Plugin API    | Manifest, lifecycle, commands, events, UI, services, capabilities, versioning, and package rules.  | Accepted Plugin API specification, SDK tests, and compatibility policy. |
| Protocols     | Terminal compatibility, structured content, IPC, debug, MCP, and wire schemas.                     | Versioned specifications and interoperability/security tests.           |

## Reference versus design

Design documents explain intent, alternatives, boundaries, and candidate
contracts. Reference documents enumerate what a specific supported version
actually accepts, returns, or guarantees. A design proposal does not become
reference material until its owning implementation and tests provide evidence.

Current proposals remain in the [CLI design](../interfaces/cli.md),
[configuration design](../configuration/lua-and-xdg.md),
[plugin-system design](../extensibility/plugin-system.md), and
[rich-content design](../interfaces/rich-content.md). They must not be copied
here as if they were released behavior.
