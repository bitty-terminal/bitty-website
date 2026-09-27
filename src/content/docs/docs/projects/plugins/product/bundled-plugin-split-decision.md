---
title: Bundled-Plugin Split Decision (OQ-053)
description: Per-candidate decision on which bundled first-party plugins become independent first-party packages
category: product
audience: contributor
document_type: register
status: accepted
website_publish: false
sidebar_order: 23
---

# Bundled-Plugin Split Decision (OQ-053)

> Status: **accepted** on 2026-09-14 by the project initiator via the recorded
> owner directive (2026-09-13/14) and owning task bitty `CTX-0396`. This
> decision record owns the OQ-053 migration set at the plugin-ecosystem level
> and records the dependencies that unblock the candidate queue. It does not
> implement any split and does not claim shipped behavior. Follow-through is
> complete (bitty `CTX-0424`, 2026-09-14): the
> [OQ-053 register row](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
> is closed and the accepted
> [Default Distribution RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/default-distribution-rfc.md)
> bundled catalog is amended from ten to eight. Accepting the Panel Runtime
> provider contract remains owned by `bitty-docs` `CTX-0181`.

## Purpose and scope

This record answers the OQ-053 question — which bundled first-party plugins
migrate to independently versioned first-party packages — for the seven
candidates the [Plugin Roadmap](plugin-roadmap.md) lists: `palette`,
`statusline` (workspaceline), `file-manager`, `git-panel`, `browser-panel`,
`ai-panel`, and `mail-panel`. Shell integration and the workspace core stay
bundled, as the roadmap already states. `project` is one of the ten accepted
bundled plugins but is not among the seven migration candidates, so it receives
no verdict in this record.

In scope: the per-candidate verdict (split / stay bundled), the timing gate that
governs each split, and the CarryCtx dependencies that let the candidate queue
start. Out of scope: the split implementation itself, the package-manager
mechanics (owned by the accepted [Package Lifecycle RFC](../packaging/package-lifecycle-rfc.md)
and [Package Follow-up RFC](../packaging/package-followup-rfc.md)), and the
panel-provider contract (owned by the accepted [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md) in
`bitty-terminal-docs`, which supersedes the archived Panel Runtime and Event Bus Pre-Study, and OQ-058;
the generic container and Event Bus contract is accepted while the plugin-facing registration/mount
contract remains the open gate).

This record refines the roadmap's _candidate_ material; it does not move a
requirement between owners and does not relax any capability, security, or
distribution gate.

## Decision rules applied

The verdicts apply the roadmap's bundled-plugin suitability rules as the
decision test, unchanged in substance:

1. **Bundling and independence are distribution states, not privilege tiers.**
   An independent first-party plugin passes the same manifest validation,
   deny-by-default capability consent, permission-diff gate, lazy triggers, and
   `bitty --safe` skip as any third-party plugin. No first-party bypass exists.
2. **Split eligibility follows the mechanism/policy split.** Work that is Pure
   Lua (bounded presentation plus CLI or service glue) or Hybrid (a Core or
   `bitty-ai` mechanism feeding Lua policy) may live in an independent package.
   Work that is itself a Core mechanism — layout lifecycle or persistence, raw
   VT parsing, or native GPU, process, or platform integration — stays in the
   bundled core.
3. **A split changes no identity.** Plugin IDs, capability identifiers, grant
   records, and manifest shape are unchanged by the move.
4. **A split enables nothing implicitly.** Fresh-install behavior stays
   staged-and-disabled; migration must not turn "previously bundled" into
   "enabled by default", and safe mode is unaffected.
5. **A split requires the independent distribution path.** The local-path and
   registry install/verify/activation chain (accepted package contracts plus the
   implemented install path) must exist before any manifest leaves the binary
   catalog.
6. **A split requires the SDK and template gates.** R-SDK-1..3 and R-TPL-1 must
   be satisfied so an independent repository can be scaffolded, typed,
   linted, and conformance-tested.

## Gate status at decision time

Evidence date 2026-09-14. Cross-repository facts are cited from the owning
repository; CarryCtx is per-repository, so external tasks are named by parent
repository.

| Gate                                          | State                  | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-SDK-1 LuaLS definitions                     | Satisfied              | Base gate `bitty-plugin-sdk` `CTX-0014` (completed); refinement `CTX-0025` (in review). `lua/bitty.d.lua`, `scripts/generate-lua-defs.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| R-SDK-2 manifest schema + `bitty-plugin-lint` | Satisfied              | Base gate `bitty-plugin-sdk` `CTX-0015` (completed); refinements `CTX-0019` (completed) and `CTX-0026` (in review). `docs/manifest.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| R-SDK-3 mock-host + conformance fixtures      | Satisfied              | `bitty-plugin-sdk` `CTX-0016` (completed); `conformance/cases/01..12`, `docs/mock-host.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| R-TPL-1 minimal runnable template             | Satisfied              | `bitty-plugin-template` `CTX-0016` (completed); `template/bitty-plugin.toml`, `template/lua/@@PLUGIN_MODULE@@/init.lua`, template CI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Independent install / activation path         | Implemented, in review | `bitty` `CTX-0406` (PR #670 merged, task in review); docs recording in `bitty-plugins-docs` `CTX-0001`. Package contracts accepted under OQ-021/OQ-022/OQ-028.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Panel Runtime public provider contract        | Not accepted           | Generic container and Event Bus contract accepted ([Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md), 2026-09-14; archived pre-study superseded). The remaining gate is the plugin-facing registration/mount contract only: `PanelProvider` registration (`RFC-OQ-2`), Panel-to-View placement (`RFC-OQ-3`), and `panel.*` capability mapping (`RFC-OQ-5`); acceptance tracked by `bitty-docs` `CTX-0181` (ready), OQ-058. The Core-internal `PanelRegistry::mount_panel` path (`bitty` `crates/bitty-runtime/src/registry/panel.rs`) is not an independent-plugin presentation surface, and Plugin API v1 defines no `register_panel` entry point. |
| `bitty-ai` surfaces and distribution          | Open                   | OQ-066/OQ-080/OQ-081; `bitty` `CTX-0407` (in progress) is the pressure-test vertical slice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Credential-source contract                    | Open                   | OQ-054 and OQ-055 (secret-storage tiers, API-key references). Candidate kernels landed in `bitty` CTX-0711/#1304 (`crates/bitty-plugin-host/src/{credential_ref,secret_tiers}.rs`, in `origin/main` at `c01f538`, Implemented-only: OQs still open, nothing wired into a live path) — evidence only, gate unchanged.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Layer 2 `[tools.*]` CLI reuse                 | Draft                  | [Plugin Reuse and Provider Ecology RFC](../packaging/plugin-reuse-and-providers.md) is `draft` (post-1.0).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

Any candidate whose verdict is "split later" is blocked only on the named gate
above, not on the SDK/template gates, which are satisfied.

## Per-candidate assessment and verdict

Bundled implementations are review evidence in the `bitty` repository: manifests
in `crates/bitty-plugin-host/src/bundled.rs`, runtime implementations in
`crates/bitty-runtime/src/`, and dogfood tests in `crates/bitty-runtime/tests/`.
Manifest presence is not shipped behavior.

| Candidate       | Bundled realization                                                                                    | Capabilities requested                                                                                                                                                                     | Isolation need                                             | Verdict                                                        | Gate                                                                         | Owner task         |
| --------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------ |
| `palette`       | `palette_manifest`, `bitty-runtime/src/palette.rs`                                                     | `ui.overlay`, command registry                                                                                                                                                             | Overlay slot, declarative primitives                       | **Split**                                                      | Distribution + SDK                                                           | `bitty` `CTX-0397` |
| `statusline`    | `statusline_manifest`, `bitty-runtime/src/statusline.rs`                                               | `terminal.semantic-read`, `ui.rich`                                                                                                                                                        | Status-component composition                               | **Split** (statusline only)                                    | Distribution + SDK                                                           | `bitty` `CTX-0398` |
| `file-manager`  | `file_manager_manifest` (removed 2026-09-15), `bitty-runtime/src/file_manager.rs` (removed 2026-09-15) | `terminal.semantic-read` only (observation-only); the former `panel.provider`, `panel.create`, and root-scoped `fs.read`/`fs.write` requests are removed as phantom authority and deferred | Panel Runtime, path-scoped grants                          | **Split** (catalog entry removed; panel presentation deferred) | Panel provider contract (presentation only)                                  | `bitty` `CTX-0399` |
| `git-panel`     | `git_panel_manifest` (removed 2026-09-15), `bitty-runtime/src/git_panel.rs` (removed 2026-09-15)       | `panel.provider`, `panel.create`, `process.spawn:git`, `terminal.semantic-read`, `fs.read`                                                                                                 | Panel Runtime, allowlisted CLI                             | **Split** (catalog entry removed; panel presentation deferred) | Panel provider contract (presentation only) + Layer 2 `[tools.*]` (accepted) | `bitty` `CTX-0400` |
| `browser-panel` | `browser_panel_manifest`, `bitty-runtime/src/browser_panel.rs`                                         | `panel.provider`, `panel.create`, `browser.embed/navigation/file-url/storage`, `terminal.semantic-read`                                                                                    | Native embedder, host-owned surface, untrusted web content | **Stay bundled (Core)**                                        | Core browser mechanism + security review                                     | `bitty` `CTX-0401` |
| `ai-panel`      | `ai_panel_manifest`, `bitty-runtime/src/ai_panel.rs`                                                   | `panel.provider`, `panel.create`, `agent.context.*`, `agent.memory:persist`, `mcp.invoke:*`, `ai.provider/stream/model`                                                                    | Panel Runtime + `bitty-ai` mechanism                       | **Split later** (hybrid)                                       | Panel provider contract + `bitty-ai` surfaces                                | `bitty` `CTX-0402` |
| `mail-panel`    | `mail_panel_manifest`, `bitty-runtime/src/mail_panel.rs`                                               | `panel.provider`, `panel.create`, `mcp.invoke:mail.*`, `network.connect` (imap/smtp), `fs.read`/`fs.write:~/mail/**`                                                                       | Panel Runtime, MCP, endpoint grants                        | **Split later**                                                | Panel provider contract + credential contract                                | `bitty` `CTX-0403` |

### `palette` — split (distribution gate merged)

Command palette and picker UI via the overlay slot, using declarative list and
text primitives only. Pure Lua per the suitability rules: it owns presentation
and filtering policy, consumes the accepted command registry, and owns no
layout, geometry, or VT parsing. It requires no Panel Runtime and no privileged
capability. Verdict: **independent first-party package**; the only gates are the
distribution path and the already-satisfied SDK/template gates. The
install/activation path (`bitty` `CTX-0406`, PR #670) has merged, while this
decision record's acceptance was still in review at the decision date, so
extraction is queued rather than started.

### `statusline` — split (distribution gate merged), `tabline` claim stays bundled

Cwd, mode, Git, and task presentation composed through the status-component
slot. Pure Lua: it observes the semantic snapshot and composes read-only
fragments via host-owned layout. Two boundaries are explicit:

- The **`tabline` claim** (ordering, exclusive claim, close policy) is
  workspace-core behavior and stays bundled, consistent with rule 2 and the
  roadmap's statement that shell integration and the workspace core remain
  bundled. The split moves the statusline presentation only.
- **Shell integration stays bundled** and remains the upstream provider of
  OSC 7/133 semantic zones the statusline observes.

Verdict: **statusline becomes an independent first-party package**; the
`tabline` claim and workspace lifecycle do not. `bitty/CTX-0398` is scoped
accordingly.

### `file-manager` — split (catalog entry removed; panel presentation deferred)

Observation-only file-manager policy (bounded listing, navigation, and preview)
over the observed terminal cwd, with a root-parameterized, fail-closed scope and
`terminal.semantic-read` as its single capability. The bundled catalog entry was
removed (`bitty` PR #725, `CTX-0399`, commit `65aac5c`, 2026-09-15) and the
independent package is implemented and tested headlessly in
`bitty-terminal/file-manager` with a published registry entry
(`registry/official/file-manager.toml`, `bitty-plugins` PR #23,
`bitty-plugins` `CTX-0010`, commit `84f0b7d`, 2026-09-15). Panel presentation
and `fs.*` access stay deferred because Plugin API v1 has no panel-mount or
filesystem surface (`bitty.ui.register_panel` is post-v1.0 and there is no
`bitty.fs`). An independent repository therefore cannot present a panel until
the panel-provider contract is accepted; the accepted [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md)
covers the generic container and Event Bus only, and its `RFC-OQ-2`/`RFC-OQ-3`/`RFC-OQ-5` plugin-facing
registration/mount surface is still open. Verdict: **split** (catalog entry removed); panel
presentation remains blocked on the plugin-facing panel-provider contract (`bitty-docs`
`CTX-0181`, OQ-058) in addition to distribution.

### `git-panel` — split (catalog entry removed; panel presentation deferred)

Tiled Panel git branch/status/diff/log presentation over allowlisted
`process.spawn:git` with manifest-declared `[tools.git]`. Pure Lua plus Layer 2
system-CLI reuse, with the bundled catalog entry removed (`bitty` PR #713,
`CTX-0400`, commit `e84da34`, 2026-09-15) and the independent package
implemented and tested headlessly in `bitty-terminal/git-panel` with a
published registry entry (`registry/official/git-panel.toml`, `bitty-plugins`
PR #19, `bitty-plugins` `CTX-0008`, commit `9899c1e`, 2026-09-15). The Layer 2
`[tools.git]` declaration is accepted (v1) under `bitty` `CTX-0425`, recorded
canonically in the
[Plugin Reuse and Provider Ecology RFC](../packaging/plugin-reuse-and-providers.md#accepted-toolsgit-contract-v1);
the rest of that RFC stays draft. Verdict: **split** (catalog entry removed);
panel presentation remains blocked on the panel-provider contract, which the
Layer 2 acceptance does not replace; that acceptance is owned by bitty
`CTX-0425`.

### `browser-panel` — stay bundled

The browser surface is a native embedder with its own platform, GPU, process,
and network risk, and `browser.embed` is a high-risk capability. Under rule 2
the browser mechanism is Core work, not a Lua package. Verdict: **stays
bundled**; it is not an independent Lua plugin in v1. Revisit only if a Core
browser mechanism plus a thin hybrid Lua policy is designed and passes the
required security review. `bitty/CTX-0401` records the stay-bundled verdict and
the revisit condition rather than an extraction.

### `ai-panel` — split later (hybrid)

Agent chat, tool invocation, memory, and consent presentation over the Panel
Runtime, MCP tool bus, and `AgentId` context budget. Hybrid per the suitability
rules: Core owns bounded snapshots, semantic-zone context, and MCP transport;
Lua owns chat UI, history, and commands. Verdict: **split target**, blocked on
the panel-provider contract and the `bitty-ai` surfaces and distribution
question (OQ-066/OQ-080/OQ-081, `bitty` `CTX-0407`).

### `mail-panel` — split later

Mail triage over `mcp.invoke:mail.*`, explicit IMAP/SMTP endpoint grants, and
scoped `~/mail/**` cache access. The helper-process and MCP use is Layer 2/4
glue, but the split depends on the panel-provider contract and on the
credential-source contract (OQ-054/OQ-055) that governs secrets without
plaintext storage. Verdict: **split target**, blocked on those contracts.

## Verdict summary

- **Split, gated on distribution and SDK only (distribution path merged; this
  record's acceptance was still in review at the decision date):** `palette`,
  `statusline` (`tabline` claim stays bundled).
- **Split (bundled catalog entry removed 2026-09-15; panel presentation still
  deferred pending the panel-provider contract):** `file-manager`,
  `git-panel`. `git-panel` additionally relies on the accepted Layer 2
  `[tools.git]` slice (v1, `bitty` `CTX-0425`); `ai-panel` and `mail-panel`
  below additionally need the `bitty-ai` surfaces and the credential-source
  contract respectively.
- **Split later, gated additionally on the panel-provider contract:** `ai-panel`,
  `mail-panel`. `ai-panel` also needs the `bitty-ai` surfaces; `mail-panel` also
  needs the credential-source contract.
- **Stay bundled (Core mechanism):** `browser-panel`.
- **Unchanged:** `shell-integration` and the workspace core (including the
  `tabline` claim) stay bundled.

## Cross-references to accepted positions

- The accepted [Default Distribution RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/default-distribution-rfc.md)
  defined the ten-plugin bundled catalog. Its 2026-09-14 amendment (bitty
  `CTX-0424`) revises the catalog to eight after the `palette` and `statusline`
  splits and records the merge evidence and capability deltas.
- OQ-053 is closed by this record's follow-through (bitty `CTX-0424`); the
  panel, credential, and AI questions it cites remain in the canonical
  [open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
  This record is their plugin-ecosystem consequence, not a unilateral register
  closure.
- The accepted [Package Follow-up RFC](../packaging/package-followup-rfc.md)
  keeps `bundled` and `registry` package classes distinct; a migrated plugin
  becomes a `registry`-class first-party package without mutating any remaining
  bundled generation.

## Follow-up tasks

| Task                    | Owner                                | Purpose                                                                                                                           |
| ----------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `CTX-0397`              | `bitty`                              | Extract `palette` to an independent first-party package.                                                                          |
| `CTX-0398`              | `bitty`                              | Extract `statusline` (`tabline` claim stays bundled).                                                                             |
| `CTX-0399`              | `bitty`                              | Extract `file-manager` (catalog entry removed; independent package and registry entry merged; panel presentation still deferred). |
| `CTX-0400`              | `bitty`                              | Extract `git-panel` (catalog entry removed; independent package and registry entry merged; panel presentation still deferred).    |
| `CTX-0401`              | `bitty`                              | Record the stay-bundled verdict for `browser-panel` and the revisit condition.                                                    |
| `CTX-0402`              | `bitty`                              | Extract `ai-panel` as a hybrid plugin over `bitty-ai` surfaces.                                                                   |
| `CTX-0403`              | `bitty`                              | Extract `mail-panel`; needs the credential-source contract.                                                                       |
| `bitty-docs` `CTX-0181` | `bitty-docs`                         | Accept the Panel Runtime contract (OQ-058).                                                                                       |
| `bitty` `CTX-0424`      | `bitty-docs` / `bitty-terminal-docs` | Close the OQ-053 register row and revise the Default Distribution RFC bundled catalog.                                            |
| `bitty` `CTX-0425`      | `bitty-plugins-docs`                 | Accept the Layer 2 `[tools.*]` system-CLI reuse declaration (`git-panel` gate).                                                   |

`bitty` `CTX-0424` completed 2026-09-14 (OQ-053 register closure and Default
Distribution RFC catalog revision).

## Related ecosystem follow-ups

Separate from the OQ-053 split set, the `bitty-plugins` registry repository
carries one registered official plugin (`bitty-featured.activity`) with an empty
community set, and no `beacon` repository exists. The Bitty Beacon spatial
action engine is an open question (OQ-089) recorded in the Semantic Terminal
RFC. Concrete next steps — create and register the `beacon` repository
(bitty `CTX-0427`) and record the official plugin onboarding order and registry
registration (bitty `CTX-0426`) — are tracked as follow-up tasks; this record
does not create repositories or registry entries.

## Implementation status

Snapshot as of 2026-09-16 after the split merges. Implementation is tracked by
CarryCtx (`bitty` `CTX-0397` through `CTX-0400`); this section records state and
does not claim behavior beyond the cited merged repositories.

### Palette

| Item                          | State    | Evidence                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `palette` independent package | Merged   | Repository `bitty-terminal/palette`; package PR #2 squash `3497c70ac5b22e52826304b801af302da454d262`.                                                                                                                                                                                                                           |
| Bundled catalog entry removed | Merged   | `bitty` PR #678 squash `dd46c7a287fa7a8ab83783816b37877d634e5f3a` removes `bitty-terminal.palette` from the bundled catalog (ten to nine).                                                                                                                                                                                      |
| Registry registration         | Merged   | `bitty-plugins` PR #6 squash `d38e8ff3ad2a1538512fd212fba55422b6dbaf65`: `registry/official/palette.toml`, regenerated `generated/registry.json`, `plugins/palette` submodule pin.                                                                                                                                              |
| Capability difference         | Recorded | The independent Lua package requests `ui.rich` + `ui.overlay`; the bundled Rust realization declared only `ui.overlay` (the accepted [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md#extension-level-split) L2 UI gate requires `ui.rich`). |
| Host overlay bridge           | Gap      | The `bitty` Lua bridge does not implement `bitty.ui.mount`/`ui.update` yet; the package activates command-only until it lands.                                                                                                                                                                                                  |
| Command / picker source       | Gap      | v1 has no command-registry enumeration and no `PickerProvider`; the package reads a bounded entry list from its own settings namespace.                                                                                                                                                                                         |

### Statusline

| Item                             | State    | Evidence                                                                                                                                                                                                                                                                                                                     |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `statusline` independent package | Merged   | Repository `bitty-terminal/statusline`; package PR #2 squash `3eab0f44b9bf76fc8c01a029176a9bd885f91d07`.                                                                                                                                                                                                                     |
| Bundled catalog entry removed    | Merged   | `bitty` PR #680 squash `d4d754e3555200790fdd0843449000a9dfa4b930` removes `bitty-terminal.statusline` from the bundled catalog (nine to eight).                                                                                                                                                                              |
| Registry registration            | Merged   | `bitty-plugins` PR #9 squash `1d203e67146b02edc8c483a61a7c82b9b6e84753`: `registry/official/statusline.toml`, regenerated `generated/registry.json`, `plugins/statusline` submodule pin.                                                                                                                                     |
| Workspaceline boundary           | Recorded | The `tabline` claim (ordering, exclusive claim, close policy), workspace lifecycle, and shell integration stay bundled; only the statusline presentation moves.                                                                                                                                                              |
| Host statusline bridge           | Gap      | The `bitty` Lua bridge does not implement `bitty.ui.mount`/`ui.update`; the package observes snapshots but presents no block until it lands.                                                                                                                                                                                 |
| Status-component provider        | Gap      | v1 has no `StatusProvider`/`status.component` contract (draft post-1.0 provider ecology); the package composes one host-owned `Row` as the v1 adapter.                                                                                                                                                                       |
| Exit-code selection difference   | Recorded | The Lua package selects the latest semantic zone carrying any `metadata.exit_code` (scanning newest-first); the bundled Rust realization selected the last `ZoneKind::OutputEnd` zone's code. The observable `exit:` component can differ when a later non-`OutputEnd` zone carries a code. Recorded from the split reviews. |

### File-manager

| Item                               | State    | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file-manager` independent package | Merged   | Repository `bitty-terminal/file-manager`; initial independent plugin commit `e5cc68a` (2026-09-15, `CTX-0399`) with headless follow-ups through docs/toolchain pin `cd3da87` (2026-09-16).                                                                                                                                                                                                                                                                                                                                                                      |
| Bundled catalog entry removed      | Merged   | `bitty` PR #725 squash `65aac5caf51b4329158cd25122ac60825b8d58d2` (2026-09-15, `CTX-0399`) removes `bitty-terminal.file-manager` from the bundled catalog and deletes the bundled `bitty-runtime` review implementation.                                                                                                                                                                                                                                                                                                                                        |
| Registry registration              | Merged   | `bitty-plugins` PR #23 squash `84f0b7d3396b672bb0c011665301b0a7f1f165b2` (2026-09-15, `CTX-0010`): `registry/official/file-manager.toml`, regenerated `generated/registry.json`, `plugins/file-manager` submodule pin.                                                                                                                                                                                                                                                                                                                                          |
| Capability scope                   | Recorded | The independent Lua package requests `terminal.semantic-read` only (observation-only); the former `panel.provider`, `panel.create`, and root-scoped `fs.read`/`fs.write` requests are recorded as removed phantom authority, matching the decision-time assessment.                                                                                                                                                                                                                                                                                             |
| Panel presentation                 | Gap      | The plugin-facing panel-provider contract is not accepted (accepted generic [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md); `RFC-OQ-2`/`RFC-OQ-3`/`RFC-OQ-5` open; `bitty-docs` `CTX-0181`, OQ-058); the package implements listing, navigation, and preview headlessly with no panel surface until it lands. Accepted-versus-implemented: the RFC acceptance covers the contract, not shipped presentation; the Core-internal `PanelRegistry` mount path is not plugin presentation. |
| Filesystem surface                 | Gap      | Plugin API v1 has no `bitty.fs` surface; `fs.*` access stays deferred with no host bridge.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### Git-panel

| Item                            | State    | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `git-panel` independent package | Merged   | Repository `bitty-terminal/git-panel`; initial independent plugin commit `b6b4136` (2026-09-15, `CTX-0400`) with headless follow-ups through docs/toolchain pin `528a62b` (2026-09-16).                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Bundled catalog entry removed   | Merged   | `bitty` PR #713 squash `e84da34cb512e243d2f6bbb49bacd6ce25580ba5` (2026-09-15, `CTX-0400`) removes `bitty-terminal.git-panel` from the bundled catalog and deletes the bundled `bitty-runtime` review implementation.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Registry registration           | Merged   | `bitty-plugins` PR #19 squash `9899c1e15436445b21bc2fbc0b3f9f633b888cf7` (2026-09-15, `CTX-0008`): `registry/official/git-panel.toml`, regenerated `generated/registry.json`, `plugins/git-panel` submodule pin.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Layer 2 `[tools.git]` slice     | Accepted | Accepted `[tools.git]` contract (v1) under `bitty` `CTX-0425`, recorded canonically in the [Plugin Reuse and Provider Ecology RFC](../packaging/plugin-reuse-and-providers.md#accepted-toolsgit-contract-v1); the rest of that RFC stays draft.                                                                                                                                                                                                                                                                                                                                                                                                              |
| Panel presentation              | Gap      | The plugin-facing panel-provider contract is not accepted (accepted generic [Panel Runtime RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/panel-runtime-rfc.md); `RFC-OQ-2`/`RFC-OQ-3`/`RFC-OQ-5` open; `bitty-docs` `CTX-0181`, OQ-058); the package implements the listing/allowlist policy headlessly with no panel surface until it lands. The Layer 2 acceptance covers the `[tools.git]` declaration only and does not replace this gate. Accepted-versus-implemented: the RFC acceptance covers the contract, not shipped presentation; the Core-internal `PanelRegistry` mount path is not plugin presentation. |
| Host `[tools.*]` table check    | Gap      | Manifest-side `[tools.git]` shape is enforced by the pinned SDK linter; host-side table enforcement in the `bitty` install path is follow-up work under `CTX-0400`, not part of this acceptance.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

`file-manager` and `git-panel` migrated to independent first-party packages
(`bitty` `CTX-0399` and `CTX-0400`, catalog entries removed and registry
entries published 2026-09-15); `file-manager` is observation-only
(`terminal.semantic-read`), while `git-panel` still carries its Tiled Panel and
accepted `[tools.git]` surfaces pending the panel-provider contract. The
`ai-panel` and `mail-panel` candidates stay bundled and unmodified, pending
the panel-provider contract. The Default Distribution
RFC bundled-catalog amendment and the OQ-053 register closure are complete under
`bitty` `CTX-0424`. The palette capability delta and the statusline exit-code
delta are tracked as `bitty-plugins` `CTX-0005`.

## References

- [Plugin Roadmap](plugin-roadmap.md) for the candidate list and suitability
  rules.
- [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) for the
  accepted API v1 surface, capability grammar, and manifest model.
- [Plugin Host Runtime RFC](../runtime/plugin-host-runtime-rfc.md) for
  the accepted host bridge and per-plugin VM lifecycle.
- [Plugin Reuse and Provider Ecology RFC](../packaging/plugin-reuse-and-providers.md)
  for the Pure Lua / System CLI / Plugin Service / Native Helper layers and the
  provider ecology.
- [Package Lifecycle RFC](../packaging/package-lifecycle-rfc.md) and
  [Package Follow-up RFC](../packaging/package-followup-rfc.md) for the
  integrity, activation, and bundled-versus-registry generation contracts.
