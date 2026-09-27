---
title: Packaging
description: Index of the package integrity lifecycle registry and provider-ecology contracts
category: specifications
audience: contributor
document_type: index
status: accepted
website_publish: true
sidebar_order: 13
---

# Packaging

Index of the plugin package integrity, distribution, and reuse contracts.
Normative detail lives in the linked pages; this index carries no duplicate
normative prose.

## Admission criteria

A packaging contract defines the integrity, resolution, activation, rollback,
registry, and trust boundaries for plugin packages. New pages are added only
when real content exists; empty placeholder pages are avoided.

## Authority and status

Accepted pages record reviewed contracts and do not prove implementation; the
draft page is candidate work that authorizes no release. Shared cross-project
governance stays in
[bitty-docs](https://github.com/bitty-terminal/bitty-docs) and is linked, never
copied.

## Contracts

| Document                                                                                     | Status   | Purpose                                                   |
| -------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| [Package integrity, activation, and rollback](package-lifecycle-rfc.md)                      | Accepted | Integrity chain, staged activation, and rollback.         |
| [Package Resolver, Version Lifecycle, Registry, and Key Management](package-followup-rfc.md) | Accepted | Resolver, yank, prerelease, registry, and key management. |
| [Plugin Reuse and Provider Ecology RFC](plugin-reuse-and-providers.md)                       | Draft    | Post-1.0 reuse principle and provider ecology.            |
