---
title: Official plugin onboarding
description: Entry criteria, registration checklist, split order, and maintenance rules for official first-party plugins
category: product
audience: maintainer
document_type: policy
status: normative
website_publish: false
sidebar_order: 24
---

# Official plugin onboarding

> Status: **normative** policy. It records the order and rules a maintainer
> applies when an independent first-party plugin becomes an official plugin,
> including the bundled-to-independent split sequence. Owning task: bitty
> `CTX-0426`. The policy consolidates accepted contracts and grants no
> capability; it creates no repository, registry entry, or submodule. Where it
> disagrees with an accepted RFC or the split decision record, the accepted
> document wins.

## Purpose and scope

This policy defines how a plugin becomes **official** in the
[bitty-plugins](https://github.com/bitty-terminal/bitty-plugins) registry, how a
bundled first-party plugin is split into an independent package, and how
official plugins are maintained.

In scope: official-versus-community entry criteria, the registration checklist,
the bundled-split order of operations and its merge-order hazards, version and
compatibility declarations, review requirements, and maintenance rules.

Out of scope: package-manager and trust mechanics (owned by the accepted
[Package Lifecycle RFC](../packaging/package-lifecycle-rfc.md) and
[Package Follow-up RFC](../packaging/package-followup-rfc.md)), the
capability grammar and manifest schema (owned by the accepted
[Plugin Platform RFC](../specifications/plugin-platform-rfc.md)), and the
per-candidate split verdicts and gates (owned by the accepted
[Bundled-Plugin Split Decision (OQ-053)](bundled-plugin-split-decision.md)).

## Official versus community

Official and community plugins are distribution and maintenance states, not
privilege tiers. Both pass the same manifest validation, deny-by-default
capability consent, permission-diff gate, lazy triggers, and `bitty --safe`
skip; no first-party bypass exists (split decision rule 1).

| Property            | Official                                        | Community                                          |
| ------------------- | ----------------------------------------------- | -------------------------------------------------- |
| Maintainer          | `bitty-terminal`                                | The plugin author                                  |
| Registry entry      | `registry/official/<name>.toml`                 | `registry/community/<author>-<slug>.toml`          |
| Code in this repo   | Pinned `plugins/<name>` submodule (known-good)  | None - metadata only, never cloned or pinned       |
| Generated index     | `official: true`, derived from the entry folder | `official: false` (the default)                    |
| Registration review | This policy                                     | Community contribution review in `CONTRIBUTING.md` |

The distinction is derived from the entry location and is never declared inside
the entry. Community plugins are never submodules and never gain clone or
execution authority by merging an entry.

## Entry criteria for official status

A plugin is eligible for official status only when every criterion holds:

1. **Ownership and maintenance.** The repository lives under the
   `bitty-terminal` organization, is created from
   [bitty-plugin-template](https://github.com/bitty-terminal/bitty-plugin-template),
   and has a maintenance commitment, not a single-maintainer bus factor.
2. **Suitability.** The plugin is Pure Lua or Hybrid per the roadmap
   suitability rules applied in the
   [split decision](bundled-plugin-split-decision.md); Core mechanisms stay
   bundled.
3. **Distribution path.** The independent install, verify, and activation chain
   exists (split decision rule 5), and the SDK and template gates are satisfied
   (rule 6).
4. **Contract cleanliness.** The manifest passes schema validation and
   `bitty-plugin-lint`, the capability set has been reviewed, and compatibility
   ranges are declared.
5. **Documentation.** The canonical per-plugin page set exists in this
   repository, or is delivered by a linked scoped task before the registry
   change (see [plugin documentation](../docs/plugins/README.md)).
6. **Registry readiness.** The minimal registry entry exists and the submodule
   pin points at a mainline commit (registration checklist below).
7. **No implicit enablement.** Fresh-install behavior stays staged-and-disabled;
   official status never turns a plugin on by itself (split decision rule 4).

## Registration checklist

Run the steps in order. Every step names the repository that owns it.

1. **Repository (plugin repo).** Create the repository from
   [bitty-plugin-template](https://github.com/bitty-terminal/bitty-plugin-template);
   keep the template CI, `bitty-plugin.toml`, and license, and follow the
   repository's own quality gates.
2. **Port or implement (plugin repo).** If the plugin was bundled, port the
   Pure Lua work; plugin IDs, capability identifiers, grant records, and
   manifest shape do not change with the move (split decision rule 3). Merge to
   the plugin repository mainline.
3. **Capability review (reviewer).** Enumerate the requested capability set and
   confirm deny-by-default consent, scoped filesystem patterns, and high-risk
   separation against the
   [security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md).
   Record the review outcome on the task.
4. **Documentation (bitty-plugins-docs).** Add or link the per-plugin page set
   (README, design, schemas, evidence) using only pages with real content, and
   update the plugin index.
5. **Registry entry (bitty-plugins).** Add
   `registry/official/<name>.toml` with hand-maintained identity data only:
   `id`, `name`, `repository`, and the optional `kind`, `author`,
   `description`, `tags`, `categories`, `license`, `[compatibility] bitty` /
   `sdk`. The optional `manifest_hash` and `signature` (`algorithm`, `value`,
   optional `signer`) fields carry advisory integrity data: they are
   shape-checked when present, while an absent value only warns, so unsigned
   entries still publish. The `<name>` is the repository basename, and `id` must
   match the manifest's `plugin.id`. Never add version, stars, dates, or
   downloads.
6. **Submodule (bitty-plugins).** Add `plugins/<name>` and pin it to a commit
   reachable from the plugin repository's mainline (default branch). Never pin
   a feature-branch commit or an unmerged commit.
7. **Regenerate and validate (bitty-plugins).** Run `just registry-generate`,
   then `just registry-validate`, then `just registry-check`; finish with
   `just check`. The generated index is never edited by hand.
8. **Pull request and review (bitty-plugins).** Open the PR with labels,
   milestone, the task metadata header, and `Closes #<issue>`; a reviewer
   different from the implementer approves, and CI must be green.
9. **Documentation pointer (bitty-plugins).** When a canonical document changed,
   bump the `docs/` submodule pointer in the next reviewed change
   (`git submodule update --remote docs`, `git add docs`).

## Bundled-to-independent split order

The bundled split sequence is **port -> register -> remove bundled -> docs
sync**. The order keeps user-facing distribution ahead of core removal and
keeps identity stable.

1. **Port (plugin repo).** Extract the plugin into its own repository from the
   template; port the Pure Lua work; keep identity and capabilities unchanged;
   merge to the plugin repository mainline.
2. **Register (bitty-plugins).** Apply the registration checklist; pin the
   submodule to the port merge commit on the plugin mainline.
3. **Remove bundled (bitty).** Only after registration has merged, remove the
   bundled manifest and runtime implementation from the core repository. Fresh
   installs stay staged-and-disabled; the removal must not enable anything.
4. **Docs sync (bitty-plugins-docs).** Record the split status and update the
   affected canonical documents through their owning tasks, then bump the
   `docs/` submodule pointer in `bitty-plugins` when the corpus changed.

### Merge-order hazards (recorded)

- **Stacked-base auto-close.** On 2026-09-14, `bitty-plugins` PR #6
  (`ctx-0397/feat-register-palette`) was the base of stacked PR #7
  (`ctx-0398/feat-register-statusline`). Merging #6 with branch deletion
  produced a `base_ref_deleted` event and GitHub auto-closed #7 seconds later
  (05:44:25Z). The work was recovered as PR #9 retargeted to `main`.
  **Rule: never `--delete-branch` (or otherwise delete a base branch) while a
  child pull request still has that branch as its base.** Retarget the child to
  `main` first, merge without deleting, or rebase the child onto `main` before
  deleting the base.
- **Stacked realignment.** A stacked branch moves with
  `git rebase --onto origin/main <pre-squash-head> <branch>`, then
  `just registry-generate`, `just registry-check`, and
  `git push --force-with-lease`. Regenerate after any rebase instead of
  hand-resolving `generated/registry.json`.
- **Shared generated artifacts.** Two registration PRs both touch
  `generated/registry.json` and `.gitmodules`; merge them serially and
  regenerate after the rebase.
- **Core-removal ordering.** Removing a bundled plugin before its registration
  merges creates a user-facing gap; register first, always.
- **Documentation pointer lag.** `bitty-plugins` pins `docs/` to a commit, so a
  new canonical policy is only visible in-repo after a pointer bump. Until
  then, maintainer-facing text links the canonical GitHub document.

## Version and compatibility policy

- The plugin repository owns `plugin.version` (SemVer 2) in `bitty-plugin.toml`.
  The registry entry never duplicates the version; `just registry-sync`
  populates the optional `metadata` object of the generated index from the
  manifest. Sync binds the fetched manifest to the entry: the fetched
  `plugin.id` must equal the entry `id`, or the entry is reported as an error
  and keeps its previous metadata. Fetches are capped at 256 KiB (a
  `Content-Length` pre-check plus a streaming cap); an oversized body only warns
  and also keeps the previous metadata.
- `compat.bitty`, `compat.plugin-api`, and `plugin.version` are separate fields
  in the accepted manifest schema. Registry entries mirror both compatibility
  ranges with alternate key names: `[compatibility] bitty` carries the manifest
  `compat.bitty` range, and `[compatibility] sdk` carries the manifest
  `compat.plugin-api` (Plugin API) range. The registry `sdk` key is the Plugin
  API range under its registry spelling, not a separate SDK range; both ranges
  live in the manifest. Ranges are per-plugin and are reviewed, not
  policy-fixed values.
- Install and update fail before staging when declared compatibility does not
  include the running host (Package Lifecycle RFC, compatibility check).
- A version update that increases requested capabilities blocks until explicit
  approval; the permission-diff gate applies to official plugins with no
  exception.
- Changing an ID, capability identifier, or compatibility range is a reviewed
  change. Narrowing a range below the current mainline range is breaking and
  must be called out in the pull request.

## Review requirements

- Every official onboarding, pin bump, compatibility change, deprecation, or
  removal is reviewed by an **independent reviewer, a different agent or person
  from the implementer**. Passing CI is an acceptance gate, not a substitute
  for review.
- A **security reviewer** is required when a change touches trust boundaries,
  capabilities, resource limits, packages, IPC/MCP, DevTools, or sensitive
  data. High-risk capability families (terminal raw read or manage, protocol
  registration, broad filesystem, process, network, MCP invocation, and
  credential access) are release blockers while unresolved.
- A **docs curator** reviews taxonomy, metadata, terminology, links, and
  provenance for documentation changes.
- Review defects are recorded in CarryCtx (progress note or risk) and become
  tracked follow-up tasks; they are never silently fixed inside the reviewed
  change.

## Maintenance rules

- **Pin bumps.** Bump the `plugins/<name>` pointer in a reviewed PR, always to
  a commit reachable from the plugin mainline. Run `just registry-generate`,
  `just registry-validate`, `just registry-check`, and `just check`. Never pin a
  feature branch.
- **Release cadence.** The plugin repository owns its release cycle; the
  registry known-good set moves by pointer bump, and optional metadata refreshes
  through `just registry-sync`.
- **Deprecation and removal.** Name the replacement, the transition period, and
  the removal condition. Deprecated plugins keep their entry and pin until the
  removal PR deletes both and records the replacement; follow the roadmap alias
  precedent (`bitty-terminal.tabs`, removal at or after v0.2.0) for naming
  transitions.
- **Security review triggers.** Any capability change, new native helper, new
  filesystem, process, network, or MCP surface, credential handling, or trust
  boundary change re-triggers security review. A compromised source or provider
  account removes the plugin from the known-good set (revert or safe pin) with
  a security follow-up task.
- **Ownership changes.** Record handoffs in CarryCtx; the registry entry keeps
  the `bitty-terminal` author identity.

## Recorded tooling gaps

This policy exposed gaps in current tooling. They are recorded as follow-up
CarryCtx tasks rather than silently implemented as new gates:

1. **No mainline-pin check.** `just registry-validate` does not prove a
   submodule pin is reachable from the plugin mainline: `bitty-plugins`
   `CTX-0005`.
2. **No official-entry to submodule mapping check.** Missing local manifests are
   skipped, and `.gitmodules` URLs are not compared with registry repository
   fields: `bitty-plugins` `CTX-0006`.
3. **Per-plugin page sets (delivered).** The three registered official plugins
   now have `docs/plugins/<plugin>/` page sets, created by `bitty-plugins-docs`
   `CTX-0004`.
4. **Signature verification and keys (deferred).** Registry entries accept
   optional `manifest_hash` and `signature` fields, but no verification keys are
   configured: phase 1 (`bitty-plugins` `CTX-0012`) is warn-not-block and the
   recorded `signature_status` is advisory (`unsigned` or `unverified`, never
   `verified`). A trustworthy `verified` status follows the accepted
   key-directory contract (enrollment, rotation, revocation) in the
   [Package Follow-up RFC](../packaging/package-followup-rfc.md) (OQ-029).

## Current state (2026-09-14)

Registered official plugins: `activity` (`bitty-featured.activity`), `palette`
(`bitty-terminal.palette`), and `statusline` (`bitty-terminal.statusline`).
`beacon` is the next queued registration (bitty `CTX-0427`). The panel
candidates remain split-later per the
[split decision](bundled-plugin-split-decision.md); `browser-panel` stays
bundled. This paragraph records provenance, not shipped behavior.

## References

- [Bundled-Plugin Split Decision (OQ-053)](bundled-plugin-split-decision.md)
- [Plugin Roadmap](plugin-roadmap.md)
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md)
- [Package Lifecycle RFC](../packaging/package-lifecycle-rfc.md)
- [Package Follow-up RFC](../packaging/package-followup-rfc.md)
- [Documentation workflow](../docs/development/documentation-workflow.md)
- [Plugin documentation](../docs/plugins/README.md)
- [Security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
- [bitty-plugins repository](https://github.com/bitty-terminal/bitty-plugins)
