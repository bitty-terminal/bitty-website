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

This policy defines the English-language authoring, ownership, routing, and
synchronization model for maintained Bitty documentation. It governs the
shared governance corpus in `bitty-docs` and its submodule-mounted project
documentation repositories, which follow the same workflow.

## Language policy

English is the only canonical documentation language. Repository-owned
Markdown must not contain CJK text, including historical source titles or
examples. Internationalization, translation repositories, locale directories,
translated URL routing, and synchronization between languages are deferred.
They require a future cross-repository decision before any localized tree is
created.

## Docs self-containment

Canonical documentation is self-contained: a reader must be able to use every
document with the workspace research archive absent. A canonical document must
not cite the research repository or its contents in any form, including:

- research record numbers or titles;
- `summary/`, `origin/`, or `.md.completed` paths and their URLs;
- record-to-document coverage or provenance ledgers;
- `recording/research/NNN` companion references.

Record-to-document mappings, coverage ledgers, and research-archive provenance
belong in the research repository itself, never in a canonical document. The
generic provenance workflow in this policy remains valid: it defines how an
observation becomes a decision or an open question and does not cite a specific
record. External, non-archive sources may still be named by their own URL when
they are the actual evidence.

This rule applies to every canonical corpus, including `bitty-docs` and its
project documentation submodules. A review that finds a research-repository
reference, record number, coverage ledger, or provenance mapping in a canonical
document returns `NEEDS-FIX`.

## Repository layout and routing

Documentation is partitioned into shared cross-project governance and
project-owned content. Shared governance stays in this repository; each project
documentation repository is mounted at the `bitty-docs` repository root as a Git
submodule.

Shared governance stays in the top-level directories:

| Directory      | Owns                                                                  |
| -------------- | --------------------------------------------------------------------- |
| `decisions/`   | ADRs and the single global open-question register.                    |
| `security/`    | Normative security corpus, threat model, risk register, and evidence. |
| `development/` | Contributor policy, workflow, toolchain, and repository baseline.     |
| `sources/`     | Historical conversation provenance records.                           |
| `findings/`    | Durable reviewed findings and evidence.                               |
| `reviews/`     | Review records and dispositions.                                      |
| `handoff/`     | Cross-session handoff records.                                        |
| `project/`     | Shared project-state, repository map, and technology governance.      |
| `roadmap/`     | Evidence-based sequencing shared across projects.                     |
| `releases/`    | Release notes backed by published artifacts.                          |

`docs/project/` (singular) remains shared project-state and technology
governance. `docs/projects/README.md` routes to the submodule mounts.

Project content lives in three independent documentation repositories:

| Submodule         | Repository            | Scope                                                                                                      |
| ----------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `bitty-terminal/` | `bitty-terminal-docs` | Terminal platform: architecture, specifications, interfaces, product, user guide, and the terminal corpus. |
| `bitty-ai/`       | `bitty-ai-docs`       | Independent AI core: AI architecture, IPC/Agent contract, Browser and Agent panel pre-study.               |
| `bitty-plugins/`  | `bitty-plugins-docs`  | Plugin platform, SDK, lifecycle, package, isolation, and per-plugin pages (standard page set below).       |

Each submodule pins the owning repository's merged `main` revision. Project
content is mounted into the owning code repository at `<code-repo>/docs`, which
consumes the same content at the pinned revision.

Routing rules:

1. New project-specific documents go to the owning project documentation
   repository, not to `bitty-docs`.
2. Cross-project contracts, registers, policies, and the security corpus stay
   in the shared top-level directories; a project repository links to them
   instead of copying them.
3. Open-question and ADR/RFC numbering stay global; the single
   [open-question register](../decisions/open-questions.md) owns every OQ.
4. Each plugin uses the standard page set defined below under
   `docs/plugins/<plugin>/` in `bitty-plugins-docs`.

### Submodule pointer updates

1. Land and merge the content change in the owning project documentation
   repository.
2. In a scoped `bitty-docs` task, check out the merged revision inside the
   submodule and verify the recorded gitlink matches the merged `main`.
3. Re-run `just check` and open a reviewable pull request that bumps only the
   intended pointer(s); never bump a pointer as a side effect of an unrelated
   change. `.gitmodules` is committed at the repository root.
4. CI checks out submodules recursively; the local gates also pass when they
   are absent, so submodule-owned checks (project state summary and SVG
   validation) skip unmaterialized files instead of failing.

What each pin means is defined once in
[submodule pin semantics](../project/repository-map.md#submodule-pin-semantics):
docs-repo `main` is the latest canonical docs, the code-repo `docs/` mount is
the docs matching that implementation, and the aggregator mount is the
governance-reviewed snapshot. Pins are reproducibility anchors and are
expected to differ; never force them equal.

`just docs-status` prints each position with behind-counts
(`git rev-list --count <pin>..<main>`) and `--fetch` refreshes the local
upstream refs first; the helper is diagnostic, the pins remain the normative
anchors.

### Cross-repository link validation

Absolute `github.com/bitty-terminal/*` `blob`/`tree` links in the shared
corpus point into the sibling documentation repositories, so the
repository-local link gate does not see them. `just docs-check-cross-repo`
resolves every such link in repository-owned Markdown against the owning
sibling's current `main` and fails with each dead target and occurrence:

- local workspace checkouts are consulted first, then materialized submodules,
  and the GitHub API last (`gh api repos/.../contents/<path>`);
- `--offline` forbids the network and reports targets it cannot resolve as
  skipped instead of passing them silently; `just check` runs the offline mode;
- `--fetch` refreshes a local sibling's `origin/<ref>` before resolving;
- `--include-submodules` extends the scan to the three project-docs working
  trees for reports (their content is owned and gated by their own
  repositories, so the default gate scans only repository-owned Markdown).

A moved document in a sibling repository must therefore update its incoming
absolute links in the same change or the gate fails; a dead link is a defect,
not a redirect that CI can ignore.

### Migration outcome

Phase 1 added the local partition, index pages, and skeletons. Phase 2
(CTX-0185) migrated the terminal-platform documents into `docs/projects/bitty/`.
Phase 3 split all three project partitions into their own repositories and
CTX-0188 removed the local copies from `bitty-docs`, retargeted shared-corpus
references to absolute URLs in the owning repository, and replaced the local
trees with root submodules pinned to each repository's merged `main`.

## Per-plugin documentation page set

Each documented plugin gets `docs/plugins/<plugin>/` in `bitty-plugins-docs`
following the standard page set. The set separates candidate intent, accepted
contracts, and evidence so no page implies shipped behavior it cannot support.

| Page          | Typical `document_type`   | Purpose                                                              |
| ------------- | ------------------------- | -------------------------------------------------------------------- |
| `README.md`   | `index`                   | Identity, current stage, owning repository, and page links.          |
| `design.md`   | `specification`           | Scope, UX, capability boundaries, and mechanism/policy split.        |
| `schemas.md`  | `contract` or `reference` | Manifest fields, configuration keys, wire/API schemas, and versions. |
| `evidence.md` | `register`                | Decision links, experiments, reviews, and test/release evidence.     |

Rules:

- Start from the template at
  [`docs/plugins/TEMPLATE.md`](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/docs/plugins/TEMPLATE.md).
- Cross-project contracts and registers stay in the shared directories; a
  plugin page links to them instead of restating them.
- Use only the allowed metadata values; "candidate" and "planned" are prose,
  not an implementation claim.
- Create only pages that have real content; empty placeholder pages are
  avoided so the tree does not imply work that has not happened.

## Document types and authority

| Type                    | Purpose                                                                         | Authority rule                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guide                   | Helps a reader complete a supported task.                                       | Shipped-factual guides must cite the documented release with a version qualifier (see user-doc maturity tiers below); compatibility or verified-security claims still require `Verified` evidence. |
| Reference               | Enumerates stable commands, fields, APIs, protocols, errors, and compatibility. | Must match the owning implementation and version.                                                                                                                                                  |
| Specification           | Defines a proposed or accepted technical contract.                              | Status and unresolved details must be explicit.                                                                                                                                                    |
| Policy or contract      | Defines normative project, security, or cross-repository obligations.           | Changes require the named owners and affected reviewers.                                                                                                                                           |
| Overview or explanation | Provides orientation and rationale.                                             | Links to authoritative specifications instead of redefining them.                                                                                                                                  |
| Register                | Tracks decisions, questions, risks, or evidence.                                | Entries close only with cited reviewable evidence.                                                                                                                                                 |
| Research                | Preserves provenance and observations.                                          | Never becomes a decision or implementation claim by implication.                                                                                                                                   |
| Index                   | Routes readers to canonical documents.                                          | Must stay complete and avoid duplicate normative prose.                                                                                                                                            |

The maintained topic document is the source of truth. Historical conversations
and external references are provenance. Product repositories are the source of
implementation evidence. No website content consumer exists yet. A future
`bitty-website` integration must present pinned canonical content without owning
or duplicating specifications.

## User-doc maturity tiers

User documentation distinguishes three claims (DIR-015). The old blanket rule
that installation and getting-started pages wait for `Verified` was over-strict
against shipped reality (`bitty` documents AUR recipes, GitHub Releases,
`bitty init`, and `bitty doctor` as shipped):

- Shipped-factual docs describe behavior that ships in a named release. They
  are allowed before `Verified` when every page carries an explicit version
  qualifier such as "Available in `v0.0.21`, pre-alpha, API and behavior may
  change".
- Compatibility guarantees promise stable behavior across releases. They
  require `Verified` plus the semver and compatibility matrix, and remain
  deferred.
- Verified security claims assert audited trust boundaries or closed risks.
  They require security-auditor and P0-AC evidence per the risk evidence RFC,
  and remain deferred.

A version qualifier never upgrades a shipped-factual page into a
compatibility or security claim.

## Open-question admission

The [open-question register](../decisions/open-questions.md) is the single
global owner of OQ identifiers; numbering is global and monotonic, and an
identifier is never renumbered, reused, or assigned to reserve a topic. A new
canonical OQ is admissible only when at least one condition holds:

- It blocks the current [roadmap](../roadmap/now-next-later.md) milestone: the
  milestone cannot reach its exit criteria until the question is answered.
- Implementation evidence or risk forces it: observed behavior, tests, audits,
  or an open risk entry shows the corpus cannot define required behavior
  without the answer.

Opening an admissible OQ records these fields in the register entry:

- the milestone gate it blocks, or the evidence or risk item that forces it;
- a blocking link (Issue, CarryCtx task, risk ID, or failing evidence);
- the owning team or role responsible for the answer;
- the next review point (date or milestone event) at which it is re-checked.

Not admissible: pure future ideas, speculative feature expansions, and
explorations that no current milestone or evidence forces. Those stay in a
non-canonical provenance record until they satisfy an admission condition.

Promotion path: a provenance observation becomes a proposed OQ that cites the
forcing evidence and carries the fields above, then is admitted onto the
register through a reviewed change. A parked idea does not reserve an OQ
identifier.

Review and deprecation: re-check each OQ at its recorded review point. Close an
OQ when a decision exists, citing the reviewed evidence. Mark it `Deprecated`
when it no longer blocks a milestone or an evidence or risk item and no decision
is pending, with the review rationale and a link to the provenance record that
now carries it; its identifier remains allocated and is never reused.

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
transition period, and removal condition. Each documentation repository owns
the canonical content identity and redirect requirements for the content it
owns; a future `bitty-website` integration must own routing implementation.
Deletion without a reviewed replacement/redirect decision is not allowed for
published material.

Once releases exist, reference and user guidance must state or derive the
supported product version. Any future website build that publishes canonical
documentation must consume immutable pinned revisions of the aggregator and its
project documentation submodules so the published build can be reproduced. The
strategy for simultaneously hosted historical versions remains an open
cross-repository decision.

## Project state snapshot

`docs/project/project-state.json` is the canonical machine-readable project
state snapshot that prevents fact drift between `bitty` and `bitty-docs`.

It defines exactly one synchronized implementation revision (`bitty`
`c6db24d` at `2026-09-27`, baseline `de134ec`, previous `679f12f`), maturity
and release status (`Pre-alpha / Engineering Milestones M1-M8`, 54 OQs
`Accepted` and 46 `Open` in the synchronized docs register, 21 crates, release
`v0.0.21` at `7da6d6f` dated 2026-09-24), per-risk state and evidence revision and audit
references (`R-004` remains `Open` at `7a4ee41` with residual platform, UX, and
`8192`-byte bound-scope limits per `bitty`
`docs/security/audits/clipboard-2026-09.md` CTX-0097; `R-005`/`R-006`/`R-007`
`Mitigated` at `d4d75e9`), and explicit sync provenance (`CTX-0244`, previous
`CTX-0233`). The release and post-release security evidence are
`Implemented`-only until the matrix and independent review gates are recorded.

Mechanical fields (synchronized revision, snapshot date, crate count, latest
release tag/commit/date, and the provenance chain) are regenerated
deterministically from a local `bitty` checkout:

```sh
git -C ../bitty fetch origin   # read a current origin/main
just state-refresh             # write mechanical fields; review curated prose
just state-refresh-check       # no-op verification; exit 1 when stale
```

The generator (`.github/scripts/refresh-state.mjs`) reads only git metadata,
never fetches, and preserves every curated field: engineering milestones,
subsystem assessments, risk state, `latest_release.summary`, and notes.
Refresh curated prose in the same CarryCtx task and record provenance with
`just state-refresh --task CTX-XXXX --by <agent>`. The repository path
defaults to `$BITTY_REPO`, then `$BITTY_WORKSPACE/bitty`, then `../bitty`. A
scheduled [state freshness workflow](../../.github/workflows/state-refresh.yml)
(also `workflow_dispatch`) runs `state-refresh-check` against the public
implementation repository and derives its URL from the snapshot; a red run
signals that a refresh task must land. It has no pull-request trigger and is
not a required check.

The canonical summaries in the pinned project-docs submodule (for example
`bitty-terminal/product/release-ladder.md`) belong to the submodule repository
and move only with a separate submodule pin bump. `check-state.mjs` therefore
accepts a pinned summary that sits exactly one refresh behind the snapshot
(its referenced revision equals `implementation.previous_short`), reports the
lag as a note, and still enforces the maturity and `R-004` invariants; a pin
older than one refresh remains a failure.

Ownership is `docs-curator` plus `security-auditor`. Updates require a
CarryCtx task with independent review, CI green (`just check` includes
`just state` plus `actionlint -color` and `act -n`), and an explicit
provenance record. The snapshot records state; it must not auto-accept risks
or replace CarryCtx and security-auditor review. Risk state transitions still
require the per-risk RS-1..RS-7 checklist and auditor sign-off per the
[risk evidence RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/risk-evidence-rfc.md).

Canonical human-readable summaries in `README.md`, `TODO.md`,
`docs/README.md`, `docs/security/risk-register.md`,
`docs/security/evidence-matrix.md`, and the submodule-mounted
`bitty-terminal/product/release-ladder.md` are derived from the snapshot and
validated deterministically by `bun .github/scripts/check-state.mjs` (also
`just state` and CI). Divergence is a defect; the submodule summary is checked
when the submodule is materialized and skipped otherwise. Test counts remain in
audit and implementation evidence and are not duplicated in the snapshot unless
generated via an authoritative command such as `cargo test`.
