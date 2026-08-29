---
title: Documentation workflow
description: Normative authoring ownership review synchronization and lifecycle policy
category: development
audience: contributor
document_type: policy
status: normative
website_publish: true
sidebar_order: 20
---

# Documentation workflow

This policy defines how `bitty-docs` remains the English-language source of
truth for maintained Bitty documentation. It applies before implementation and
continues once product repositories ship code.

## Language policy

English is the only canonical documentation language. Repository-owned
Markdown must not contain CJK text, including historical source titles or
examples. Internationalization, translation repositories, locale directories,
translated URL routing, and synchronization between languages are deferred.
They require a future cross-repository decision before any localized tree is
created.

## Document types and authority

| Type                    | Purpose                                                                         | Authority rule                                                    |
| ----------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Guide                   | Helps a reader complete a supported task.                                       | Must cite verified behavior for the documented release.           |
| Reference               | Enumerates stable commands, fields, APIs, protocols, errors, and compatibility. | Must match the owning implementation and version.                 |
| Specification           | Defines a proposed or accepted technical contract.                              | Status and unresolved details must be explicit.                   |
| Policy or contract      | Defines normative project, security, or cross-repository obligations.           | Changes require the named owners and affected reviewers.          |
| Overview or explanation | Provides orientation and rationale.                                             | Links to authoritative specifications instead of redefining them. |
| Register                | Tracks decisions, questions, risks, or evidence.                                | Entries close only with cited reviewable evidence.                |
| Research                | Preserves provenance and observations.                                          | Never becomes a decision or implementation claim by implication.  |
| Index                   | Routes readers to canonical documents.                                          | Must stay complete and avoid duplicate normative prose.           |

The maintained topic document is the source of truth. Historical conversations
and external references are provenance. Product repositories are the source of
implementation evidence. No website content consumer exists yet. A future
`bitty-website` integration must present pinned canonical content without owning
or duplicating specifications.

## Required metadata

Every `docs/**/*.md` file begins with YAML frontmatter containing exactly these
flat, ordered, plain scalar fields:

| Field             | Allowed value or rule                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `title`           | Non-empty text exactly matching the first H1.                                                                               |
| `description`     | One-line plain text suitable for navigation and search.                                                                     |
| `category`        | One value from the canonical category list below.                                                                           |
| `audience`        | `contributor`, `maintainer`, `mixed`, `plugin-author`, `security-reviewer`, or `user`.                                      |
| `document_type`   | `contract`, `explanation`, `guide`, `index`, `overview`, `policy`, `reference`, `register`, `research`, or `specification`. |
| `status`          | `accepted`, `archived`, `deprecated`, `draft`, `normative`, or `stable`.                                                    |
| `website_publish` | Unquoted Boolean `true` or `false`.                                                                                         |
| `sidebar_order`   | Non-negative unquoted integer. Ordering is interpreted within website navigation context.                                   |

Arrays, maps, multiline values, aliases, tags, and additional frontmatter fields
are not allowed. A schema change must update this policy, the repository check,
the affected corpus, and the website consumer contract together.

Canonical categories are `architecture`, `configuration`, `decisions`,
`development`, `examples`, `extensibility`, `findings`, `how-to`, `migrations`,
`product`, `project`, `provenance`, `reference`, `releases`, `requirements`,
`roadmap`, `security`, `specifications`, `troubleshooting`, `tutorials`, and
`user-guide`.

## Status meanings

- `draft` is actively shaped and may change without compatibility promises.
  Draft text does not authorize shipped, stable, normative, or
  compatibility-guaranteed behavior and does not form public reference;
  experimental implementation may exist as review evidence but carries no
  compatibility promise and does not constitute acceptance. The lifecycle is
  Draft -> experimental review evidence -> Accepted -> normative; only
  Accepted or normative documents authorize shipped behavior.
- `accepted` records a reviewed working direction or maintained project fact.
- `normative` is a required gate or policy, even when implementation evidence is
  not yet available.
- `stable` is maintained provenance or a contract whose stability has explicit
  evidence; it does not mean every linked feature is implemented.
- `deprecated` remains available during a documented transition.
- `archived` is retained for history and must not be treated as current advice.

## Change trigger matrix

| Change trigger                                                                                | Documentation that must be reviewed and updated                                                                |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Product scope, user-visible behavior, or compatibility                                        | Product vision, user guide, reference, relevant decision/open question, and release notes when releases exist. |
| CLI, configuration, Lua, plugin API, or protocol contract                                     | Owning specification, reference, examples/user guide, compatibility policy, and SDK/template consumers.        |
| Architecture boundary, dependency, or platform support                                        | Architecture and technology documents, decision register, risk register, and affected developer guidance.      |
| Capability, trust boundary, parser/resource limit, IPC/MCP, package, or supply-chain behavior | Security overview, threat model, risk register, owning specification, and negative-test evidence.              |
| Repository, CI, delivery, ownership, or release process                                       | Project governance, development guidance, AGENTS/rules, and website contract where publishing changes.         |
| File move, public path change, or deprecation                                                 | All inbound links, navigation, redirect requirement, replacement guidance, and version policy.                 |
| Historical source or research update                                                          | Provenance record and any explicitly affected decision; never silently rewrite the maintained contract.        |

Documentation synchronization is part of the definition of done. If the docs
cannot be updated within the same delivery, the implementation task remains
open or carries an explicit blocking dependency on a scoped documentation task.

## Delivery lifecycle and CarryCtx mapping

The primary lifecycle is:

1. Open or link a GitHub Issue describing the outcome and acceptance evidence.
2. Create a CarryCtx task linked to the Issue; assign its team, dependencies,
   required role, and exact file scopes.
3. Start a named session and record progress, risks, decisions, and blockers.
4. After the repository has a first commit, create a branch and dedicated
   worktree for parallel work.
5. Commit a coherent scoped change and open a pull request linked to the Issue
   and CarryCtx task.
6. Obtain independent review and passing CI, including documentation metadata,
   language, links, formatting, and relevant domain gates.
7. Merge only after findings are resolved and required documentation is
   synchronized.
8. Close the Issue, record final evidence/checkpoint, and complete the CarryCtx
   task. Use a handoff when ownership changes before completion.

CarryCtx is the durable execution record: Issue intent maps to a task; project
ownership maps to a team; ordering maps to dependencies; edit boundaries map to
scopes; active work maps to a session and progress; recoverable milestones map
to checkpoints; ownership transfer maps to a handoff; acceptance maps to task
completion after independent review.

Before the first commit, branch/worktree/commit/PR stages are unavailable. A
commander may authorize shared-checkout work with disjoint scopes, followed by
the same independent review and CI-equivalent local gates. The exception ends
after repository initialization and must not become the normal delivery path.

## Review and ownership

- The document category owner reviews correctness and status.
- A docs curator reviews taxonomy, metadata, terminology, links, provenance,
  deprecation, and navigation.
- A security reviewer is required for trust boundaries, capabilities, resource
  limits, packages, IPC/MCP, DevTools, and sensitive data.
- The owning implementation repository supplies code/test/release evidence for
  claims of current behavior.
- Cross-repository changes use linked Issues and pull requests. Each repository
  retains independent approval and CI.

## Deprecation and versioning

A deprecated document or public path names its replacement, affected versions,
transition period, and removal condition. `bitty-docs` owns canonical content
identity and redirect requirements; a future `bitty-website` integration must
own routing implementation. Deletion without a reviewed replacement/redirect
decision is not allowed for published material.

Once releases exist, reference and user guidance must state or derive the
supported product version. Any future website build that publishes canonical
documentation must consume an immutable pinned `bitty-docs` revision so the
published build can be reproduced. The strategy for simultaneously hosted
historical versions remains an open cross-repository decision.
