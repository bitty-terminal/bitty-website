---
title: Security
description: Index of terminal-platform security audit records for parser clipboard loader and image surfaces
category: security
audience: security-reviewer
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Security

Index of the terminal-platform security audit records. Audit detail lives in
the linked pages; this index carries no duplicate normative prose.

| Document                                                                              | Status | Purpose                                                   |
| ------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------- |
| [Clipboard Security Audit - 2026-09 (R-004)](audits/clipboard-2026-09.md)             | Draft  | Suspicious paste inspection and OSC 52 read/write gating. |
| [Resource Loader Security Audit — 2026-09 (R-003)](audits/resource-loader-2026-09.md) | Draft  | Bitty-rich loader review per P0-AC-005/006 and T-03.      |
| [Rich Image Security Audit — 2026-09 (R-002)](audits/rich-image-2026-09.md)           | Draft  | Bitty-rich ImageStore review per P0-AC-003/004 and T-02.  |
| [VT Parser Security Audit — 2026-09 (R-001)](audits/vt-parser-2026-09.md)             | Draft  | Bounded VT parser review per P0-AC-001/002 and T-01.      |

## Authority and status

These audits are revision-locked, independent review evidence for the
terminal platform. The canonical cross-project security corpus stays in
[bitty-docs](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
and takes precedence on conflict.
