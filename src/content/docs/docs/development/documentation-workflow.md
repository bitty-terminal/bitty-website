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

## Repository layout and routing

Documentation is partitioned into shared cross-project governance and
per-project content. The partition was approved on 2026-09-13 ("full partition
plus shared top level") and routes documents as follows.

Shared governance stays in the existing top-level directories:

| Directory      | Owns                                                                  |
| -------------- | --------------------------------------------------------------------- |
| `decisions/`   | ADRs and the single global open-question register.                    |
| `security/`    | Normative security corpus, threat model, risk register, and evidence. |
| `development/` | Contributor policy, workflow, toolchain, and repository baseline.     |
| `sources/`     | Historical conversation and research provenance records.              |
| `findings/`    | Durable reviewed findings and evidence.                               |
| `reviews/`     | Review records and dispositions.                                      |
| `handoff/`     | Cross-session handoff records.                                        |
| `project/`     | Shared project-state, repository map, and technology governance.      |
| `roadmap/`     | Evidence-based sequencing shared across projects.                     |
| `releases/`    | Release notes backed by published artifacts.                          |

Per-project content lives under `docs/projects/<project>/`:

| Project     | Scope                                                                             |
| ----------- | --------------------------------------------------------------------------------- |
| `bitty/`    | Terminal platform: core, VT, PTY, UI, configuration, plugin host, IPC, packaging. |
| `bitty-ai/` | Independent AI-core project: runtime, providers, and context.                     |
| `plugins/`  | Per-plugin documentation for first-party and featured plugin candidates.          |

`docs/project/` (singular) remains shared project-state and technology
governance; `docs/projects/` (plural) is the per-project documentation
partition.

Routing rules:

1. New project-specific documents go under `docs/projects/<project>/`.
2. Cross-project contracts, registers, policies, and the security corpus stay
   in the shared top-level directories; a project tree links to them instead
   of copying them.
3. Open-question and ADR/RFC numbering stay global; the single
   [open-question register](../decisions/open-questions.md) owns every OQ.
4. Each plugin gets `docs/projects/plugins/<plugin>/` with the standard page
   set defined below.

### Migration plan

Phase 1 added the partition, index pages, and skeletons only; no existing file
moved. Phase 2 (CTX-0185) migrated the existing terminal-platform documents
(`architecture/`, `specifications/`, `configuration/`, `product/`,
`interfaces/`, `user-guide/`, `tutorials/`, `how-to/`, `reference/`,
`examples/`, `extensibility/`, `requirements/`, `troubleshooting/`,
`migrations/`) into `docs/projects/bitty/` with `git mv`, rewriting relative
and absolute links and preserving each document's `website_publish` flag plus
the deprecation and redirect policy in this document. It also updated
path-sensitive consumers (navigation indexes, the project-state snapshot and
its canonical summary checks) and kept `just check` green. Phase 3 lands
`bitty-ai/` and per-plugin content as their owning repositories produce it.

## Per-plugin documentation page set

Each documented plugin gets `docs/projects/plugins/<plugin>/` following the
standard page set. The set separates candidate intent, accepted contracts, and
evidence so no page implies shipped behavior it cannot support.

| Page          | Typical `document_type`   | Purpose                                                              |
| ------------- | ------------------------- | -------------------------------------------------------------------- |
| `README.md`   | `index`                   | Identity, current stage, owning repository, and page links.          |
| `design.md`   | `specification`           | Scope, UX, capability boundaries, and mechanism/policy split.        |
| `schemas.md`  | `contract` or `reference` | Manifest fields, configuration keys, wire/API schemas, and versions. |
| `evidence.md` | `register`                | Decision links, experiments, reviews, and test/release evidence.     |

Rules:

- Start from the template at
  [`../projects/plugins/TEMPLATE.md`](../projects/plugins/TEMPLATE.md).
- Cross-project contracts and registers stay in the shared directories; a
  plugin page links to them instead of restating them.
- Use only the allowed metadata values; "candidate" and "planned" are prose,
  not an implementation claim.
- Create only pages that have real content; empty placeholder pages are
  avoided so the tree does not imply work that has not happened.

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

## Project state snapshot

`docs/project/project-state.json` is the canonical machine-readable project
state snapshot that prevents fact drift between `bitty` and `bitty-docs`.

It defines exactly one synchronized implementation revision (`bitty`
`7a4ee41` at `2026-08-31`, baseline `de134ec`, previous `be3bdb4`),
maturity and release status (`Pre-alpha / M1 Hardening` at `2026-08-29`, 32
OQs Accepted, 16 crates), per-risk state and evidence revision and audit
references (all `Open` at M1 Hardening; `R-004` remains `Open` at `7a4ee41`
with residual platform, UX, and `8192`-byte bound-scope limits per `bitty`
`docs/security/audits/clipboard-2026-09.md` CTX-0097), and explicit sync
provenance (`CTX-0113` / Issue 120, previous `CTX-0112` / Issue 122).

Ownership is `docs-curator` plus `security-auditor`. Updates require a
CarryCtx task with independent review, CI green (`just check` includes
`just state` plus `actionlint -color` and `act -n`), and an explicit
provenance record. The snapshot records state; it must not auto-accept risks
or replace CarryCtx and security-auditor review. Risk state transitions still
require the per-risk RS-1..RS-7 checklist and auditor sign-off per the
[risk evidence RFC](../projects/bitty/specifications/risk-evidence-rfc.md).

Canonical human-readable summaries in `README.md`, `TODO.md`,
`docs/README.md`, `docs/security/risk-register.md`,
`docs/security/evidence-matrix.md`, and `docs/projects/bitty/product/release-ladder.md` are
derived from the snapshot and validated deterministically by
`bun .github/scripts/check-state.mjs` (also `just state` and CI). Divergence
is a defect. Test counts remain in audit and implementation evidence and are
not duplicated in the snapshot unless generated via an authoritative command
such as `cargo test`.
