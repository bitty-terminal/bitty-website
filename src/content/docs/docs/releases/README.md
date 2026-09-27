---
title: Releases
description: Release notes, immutable evidence, and pre-alpha artifact status for published Bitty versions
category: releases
audience: user
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Releases

Pre-alpha releases of Bitty exist (latest `v0.0.21`, tag commit `7da6d6f`,
2026-09-24, with cross-platform artifacts); no stable or supported release
line exists yet, and no compatibility or security-verification claim is made.
The release includes plugin services and manifest forms, CLI contract v1
commands, workspace and panel operations, Kitty/input/render corrections,
Rich Scene and semantic-terminal wiring, compatibility and DevTools evidence,
and execution/security-closure evidence. Do not add release notes claiming
supported behavior, download guarantees, or upgrade instructions beyond the
published pre-alpha artifacts until an immutable released artifact and
verification evidence are available.

## Admission criteria

A release note names the exact version, revision, artifact/source evidence,
supported platforms, user-visible changes, breaking changes, deprecations,
security impact, known issues, and migration links.

## Authority and status

Release notes summarize an actual release; they do not redefine specifications
or reference. The owning repository tag and artifacts are implementation
evidence, while canonical guides/reference describe supported behavior.

## Naming and maintenance

Use `vMAJOR.MINOR.PATCH.md` after that version is published. Release notes are
immutable except for clearly labeled corrections and security updates. Link the
release Issue, pull requests, checksums/provenance, and migration guidance.
