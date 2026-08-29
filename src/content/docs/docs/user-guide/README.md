---
title: User guide
description: Planned user documentation for Bitty before supported product behavior exists
category: user-guide
audience: user
document_type: index
status: draft
website_publish: true
sidebar_order: 10
---

# User guide

Bitty is in a pre-implementation phase. There is no supported installation,
released executable, stable command set, or verified daily-use workflow yet.
This section is a maintained plan for future user documentation, not a preview
of commands that users can run today.

## Planned sections

| Section         | What it will cover                                                                                   | Publication gate                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Installation    | Supported packages, platforms, integrity checks, upgrades, and removal.                              | A released artifact and verified platform instructions exist.         |
| Getting started | First launch, shell setup, basic navigation, configuration location, and safe defaults.              | The referenced commands and behavior are covered by acceptance tests. |
| Daily use       | Sessions, windows, panes, selection, search, links, clipboard, profiles, plugins, and accessibility. | The user-facing contract is stable for the documented release.        |
| Troubleshooting | Diagnostics, logs, safe startup, recovery, compatibility issues, and support information.            | Diagnostic behavior and recovery paths have reproducible evidence.    |

No placeholder page should invent command names, package identifiers, default
key bindings, filesystem paths, or support guarantees. Add a section only when
the owning product repository provides current evidence.

## Useful design context

Until user behavior exists, readers can consult the [product vision](../product/vision.md)
for intent and the [security overview](../security/overview.md) for normative
pre-implementation constraints. These are design documents, not usage guides.

Reference-style facts will live in the [reference section](../reference/README.md).
The distinction prevents user tasks from becoming mixed with API inventories or
architecture rationale.
