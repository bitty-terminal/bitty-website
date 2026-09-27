---
title: Development
description: Contributor entry point for the pre-alpha Bitty project
category: development
audience: contributor
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Development

Bitty is currently in its pre-alpha phase: an experimental implementation
exists in the `bitty` repository (current synchronized revision `c6db24d`,
latest release `v0.0.21` at `7da6d6f`, 2026-09-24), but no stable or supported
public contract has been declared, and no part of the product is `Verified`,
`Compatible`, or `Release-ready`. The release and post-release fixes are
implementation evidence only; security-closure records remain subject to the
risk-evidence and independent-auditor gates. Contributor work focuses on
reviewed contracts, project initialization, security gates, and reproducible
delivery practices alongside that implementation. This page does not claim a
supported product build, a stable test workflow, or compatibility guarantees.

## Start here

1. Read the workspace and repository `AGENTS.md` files.
2. Read the [documentation workflow](documentation-workflow.md) and the
   [toolchain and tooling policy](toolchain-policy.md) — run only the pinned,
   canonical commands it defines (bun, never npm/npx/yarn; gates via just).
3. Enter the repository that owns the intended change and load its CarryCtx
   task, team, rules, and persona.
4. Confirm dependencies and a non-overlapping scope before editing.
5. Follow the [docs-first TODO](../../TODO.md) and the owning contract document.

## Project context

- [Repository map](../project/repository-map.md) describes independent
  repository boundaries and current initialization state.
- [Repository bootstrap](repository-bootstrap.md) is the accepted
  zero-functionality Core and website scaffold contract with its implementation
  validation gates.
- [Website sync contract](website-sync.md) is the draft developer guide to the
  pinned docs-to-website mirror, route mapping, and parity gates.
- [Repository metadata and GitHub baseline](repository-metadata-baseline.md)
  classifies which repository metadata and `.github/` files are shared
  verbatim, parameterized, or per-repository.
- [Technology strategy](../project/technology-strategy.md) separates accepted
  language/platform direction from candidate tools.
- [Platform compatibility and dependency governance](platform-compatibility.md)
  is a draft capture of the cross-platform dependency and compatibility
  direction: compatibility layers, the
  release-responsibility split, and the dependency-boundary direction for the
  Rust workspace.
- [Testing infrastructure](testing-infrastructure.md) is a draft capture of
  the three-tier native, VM, and physical test
  architecture, the VM matrix, the E2E test protocol, and the benchmark VM
  direction.
- [Execution host and supervisor boundary](execution-host-boundary.md) is a
  draft capture of the `bitty`/`bitty-ai` execution
  split, the job supervision mechanisms, and the phased long-running process
  direction (bitty-owned mechanisms only; `bitty-ai` semantics stay
  owner-pending).
- [Agent authority and hard-safety boundary](agent-authority-boundary.md) is a
  draft capture of the `bitty`/`bitty-ai`/Lua authority
  split, the four-layer policy stack, and the Core-enforced hard-safety
  mechanisms for capabilities, resources, panel leases, secrets, and
  privilege (bitty-upstream mechanisms only; `bitty-ai` and Lua-harness
  semantics stay owner-pending).
- [Plugin contract and manager boundary](plugin-contract-and-manager-boundary.md)
  is a draft capture of the Core-side plugin
  contract shapes, the Bitty-owned plugin manager, the manifest split, and
  the resolver and loader boundary (core slice only; plugin, terminal, AI,
  and Wheel halves stay owner-pending).
- [Remote infrastructure boundary](remote-infrastructure-boundary.md) is a
  draft capture of the cross-cutting governance content of the remote client
  direction: the trust-boundary gate, the optional-infrastructure rule, and
  the two-layer push-gateway ownership (governance slice only; terminal,
  plugin, and AI halves stay owner-pending).
- [Reference projects](../project/reference-projects.md) records self-contained,
  non-normative upstream reference revisions and research questions.
- [Security overview](../security/overview.md), [threat model](../security/threat-model.md),
  and [risk register](../security/risk-register.md) define the security review
  baseline.
- [Decision register](../decisions/index.md) and
  [open-question register](../decisions/open-questions.md) prevent proposals
  from silently becoming contracts.

## Delivery expectation

The normal lifecycle is Issue, scoped CarryCtx task, branch/worktree, commit,
pull request, independent review plus CI, merge, then task closure and a final
checkpoint. Before the first repository commit, worktrees and PRs are not yet
available; shared-checkout work is allowed only with explicit disjoint scopes
and no commit or push unless authorized.

Documentation synchronization is part of the definition of done for every
change that affects public behavior, architecture, security, interfaces,
operations, compatibility, deprecation, or release notes.
