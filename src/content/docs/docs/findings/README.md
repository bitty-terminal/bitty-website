---
title: Findings
description: Reviewed evidence and actionable observations from audits investigations and validation
category: findings
audience: contributor
document_type: index
status: accepted
website_publish: false
sidebar_order: 10
---

# Findings

This directory holds durable, reviewed findings from audits, investigations,
compatibility work, and validation. CarryCtx progress remains the working
record; only findings that need long-term project visibility belong here.

| Finding                                                                                          | Status | Severity | Disposition                                    |
| ------------------------------------------------------------------------------------------------ | ------ | -------- | ---------------------------------------------- |
| [FIND-0001](FIND-0001-astro-typescript-7-check-compatibility.md) Astro and TypeScript 7 checking | Open   | Moderate | Retain TypeScript 7 and defer full diagnostics |

## Admission criteria

A finding identifies its scope, evidence, severity or impact, affected contract,
owner, disposition, and follow-up task. Reproducible observations are required;
unverified suspicions remain progress risks until investigated.

## Authority and status

A finding is evidence, not automatically a requirement or decision. Accepted
changes must update the owning requirement, specification, risk, ADR, or RFC.
Unresolved findings stay open in their owning register or task.

## Naming and maintenance

Use `FIND-NNNN-short-title.md` with a stable identifier. Link the originating
Issue, CarryCtx task, revision, and evidence. Update disposition without erasing
the original observation; archive only after the resolution remains traceable.
