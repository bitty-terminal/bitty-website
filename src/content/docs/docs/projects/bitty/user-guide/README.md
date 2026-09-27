---
title: User guide
description: Planned user documentation for Bitty before a supported release exists
category: user-guide
audience: user
document_type: index
status: draft
website_publish: true
sidebar_order: 10
---

# User guide

There is no supported installation, stable command set, or verified daily-use
workflow yet. Experimental code and pre-alpha releases exist (latest
`v0.0.20`), but no Stable, `Compatible`, or `Release-ready` interface is
claimed. This section is a maintained plan for future user documentation, not
a preview of commands that users can run today.

## Planned sections

| Section         | What it will cover                                                                                   | Publication gate                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Installation    | Supported packages, platforms, integrity checks, upgrades, and removal.                              | A supported release artifact and verified platform instructions exist. |
| Getting started | First launch, shell setup, basic navigation, configuration location, and safe defaults.              | The referenced commands and behavior are covered by acceptance tests.  |
| Daily use       | Sessions, windows, panes, selection, search, links, clipboard, profiles, plugins, and accessibility. | The user-facing contract is stable for the documented release.         |
| Troubleshooting | Diagnostics, logs, safe startup, recovery, compatibility issues, and support information.            | Diagnostic behavior and recovery paths have reproducible evidence.     |

No placeholder page should invent command names, package identifiers, default
key bindings, filesystem paths, or support guarantees. Add a section only when
the owning product repository provides current evidence.

## Useful design context

Until user behavior exists, readers can consult the [product vision](../product/vision.md)
for intent and the [security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) for normative
constraints. These are design documents, not usage guides.

## Implementation status

This guide is `Accepted` plan, not a usage record. No page claims `Verified`
user workflows. Where experimental code exists in the `bitty` workspace, it is
at most `Implemented-only`, never `Verified`, per the [Panel Runtime
RFC](../specifications/panel-runtime-rfc.md#implementation-status) implementation-status
table.

Reference-style facts will live in the [reference section](../reference/README.md).
The distinction prevents user tasks from becoming mixed with API inventories or
architecture rationale.
