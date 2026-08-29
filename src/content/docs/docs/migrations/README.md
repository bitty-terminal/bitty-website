---
title: Migrations
description: Tested version transitions compatibility breaks rollback and recovery guidance
category: migrations
audience: user
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Migrations

There are no released versions to migrate between. This directory remains an
empty-state contract until a supported upgrade introduces a user, configuration,
plugin, package, storage, or protocol transition.

## Admission criteria

A migration guide identifies source and target versions, affected users,
prerequisites, backup, ordered transition, verification, failure recovery,
rollback, compatibility window, and removed behavior. Every step requires test
or release evidence.

## Authority and status

Migration guides explain supported transitions but do not override versioned
specifications or security policy. Unsupported or one-way transitions must be
explicit; proposed migrations remain drafts.

## Naming and maintenance

Use `from-vX-to-vY.md` with unambiguous version ranges. Link release notes,
deprecated contracts, replacements, tests, and rollback evidence. Retain guides
while either endpoint remains supported.
