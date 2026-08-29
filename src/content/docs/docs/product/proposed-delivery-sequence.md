---
title: Proposed Delivery Sequence
description: Candidate build order early deferral list and version ladder recorded from historical advisor input awaiting review
category: product
audience: maintainer
document_type: research
status: draft
website_publish: false
sidebar_order: 20
---

# Proposed Delivery Sequence

## Status and provenance

- Status: draft research record. Every sequence, list, and criterion below is a
  **proposal** retained for evaluation. Nothing here is accepted direction, a
  roadmap commitment, or authorization to implement.
- Source: the second historical ChatGPT conversation with the architecture
  advisor, share
  [6a8dae4b-2aec-83ea-9174-03abc1f81531](https://chatgpt.com/share/6a8dae4b-2aec-83ea-9174-03abc1f81531),
  a Chinese-language phased delivery discussion. The original wording is not
  reproduced because this corpus is English-only; all content below is an
  English working rendering of that source. Provenance mapping lives in the
  [shared-conversation coverage](../sources/chatgpt-share-coverage.md).
- Roadmap relation: the [Roadmap index](../roadmap/README.md) admits roadmap
  items only when they link accepted requirements, dependencies, owners, and
  success evidence. This record does not satisfy that admission bar and must
  not be cited as a release plan or date promise.
- Authority rule: if a future ADR or RFC accepts (or rejects) part of this
  material, update that artifact and this record together.

## Candidate build-order spine

The source proposes building capability in this order:

```text
PTY -> VT -> Grid -> Font -> GPU -> Correct Terminal -> Config
     -> Command/Event -> Plugin Runtime -> Plugin Manager
     -> DevTools -> Rich Presentation -> IPC -> Agent
```

Source guidance adds that this order should generally not be reversed: each
stage is described as the foundation the next stage needs. The stages map onto
existing candidate architecture vocabulary in the
[Architecture Overview](../architecture/overview.md) and
[Core and Plugin Boundaries](../architecture/core-boundaries.md); the ordered
sequence itself is the new proposal recorded here.

### Spine implementation presence (as of 2026-08-27, crates present does not imply acceptance)

The `bitty` workspace is now spine-complete in crate presence (sixteen members
in `bitty/Cargo.toml` after `bitty-lua` `piccolo` 0.3.3 addition — fifteen before
CTX-0040 `d67a65b`). Presence tracks the candidate spine above; most stages remain
**proposed** until their RFC/ADR is accepted with independent review, with
the configuration model (OQ-010), plugin platform model (OQ-011/OQ-012/OQ-013),
package lifecycle model (OQ-021), Lua runtime model (OQ-009), rich presentation model (OQ-008/OQ-015/OQ-016), isolation resource model (OQ-014), and DevTools model (OQ-019) now `Accepted`
(2026-08-28); isolation VM budgets (RC-1/RC-2/Global) now enforced measured and accepted via
CTX-0040 (21 + 15 headless tests, `just check` 92 files 0 issues, `cargo check --target x86_64-pc-windows-gnu` pass) and DevTools instrumentation/event pipeline/debug protocol accepted via CTX-0053 (`just check` 91 files 0 issues). No entry below self-accepts its
contract:

| Candidate spine stage          | Workspace crate(s)                                    | Presence and review state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PTY                            | `bitty-pty`                                           | Present; wraps `portable-pty@0.9`; lifecycle/backpressure owned                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| VT                             | `bitty-vt`                                            | Present; `vte@0.15` behind owned `TerminalAction`; no I/O                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Grid / Correct Terminal        | `bitty-term-state`                                    | Present; grid/cursor/modes/scrollback/damage/image store                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Font                           | `bitty-render` (`crossfont@0.9`) + `bitty-term-state` | Present; `crossfont` wrapped, `wgpu@25.0`, `sw-fallback` opt-in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| GPU                            | `bitty-render`, `bitty-platform` (`winit@0.30`)       | Present; snapshot-only coupling per ADR-0003 rule 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Config                         | `bitty-config`                                        | Present; typed `ConfigPlan`/validation/migration/reload/project-trust accepted in [Configuration Model RFC](../specifications/configuration-model-rfc.md) (OQ-010, 2026-08-27); Lua runtime, sandbox, and diagnostics contracts accepted in [Lua Runtime RFC](../specifications/lua-runtime-rfc.md) (OQ-009, 2026-08-27; OQ-030, OQ-031, OQ-032 remain Open as follow-ups)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Command/Event + Plugin Runtime | `bitty-plugin-host` + `bitty-lua`                     | Present; registry/capability/lifecycle and event pipeline accepted in [Plugin Platform RFC](../specifications/plugin-platform-rfc.md) (OQ-011/OQ-012/OQ-013, 2026-08-27); `bitty-package` edge added; `mlua`/`piccolo` choice resolved to `piccolo` 0.3.3 in `bitty-lua` (CTX-0040 `d67a65b`, worktree `ctx-0040/feat-lua-vm-budgets`, 15->16 members, `forbid(unsafe_code)`) OQ-014 enforcement tuning is `Accepted` 2026-08-28; DropOldest is the accepted v1 default, three-level budgets aligned with `BoundedText` strict — measured 2026-08-27 via `crates/bitty-plugin-host/tests/measurement.rs` (21 headless tests, `global_events_enforced_*`, instrumentation `budget_snapshot`/`invariant_*`/`invariant_global_bounds`) plus `crates/bitty-lua/tests/measurement_lua.rs` (15 headless tests, `piccolo` Fuel/wall, `VmBudgetSnapshot`/`would_exceed_lua_limits`) proving per-subscription 64 strict, per-plugin 1024/256 KiB DropOldest, Global 8192/2 MiB hard-gated enforced at Host admission (`EventPipeline::publish` / `Host::publish` via `would_exceed_global_limits` + `evict_oldest_globally`, strict `invariant_global_bounds`), RC-1 10^7/50ms/8ms warning hard-gated via `piccolo` Fuel + wall deadline, RC-2 32 MiB via `Lua::total_memory()`, `drain_batch` strict; queue budgets and VM budgets now enforced measured and accepted (frontmatter `accepted`, closed OQ-014 2026-08-28, gates `just check` 92 files 0 issues + `cargo check --target x86_64-pc-windows-gnu` pass @ `d67a65b`) |
| Plugin Manager                 | `bitty-plugin-host`, `bitty-package`                  | `bitty-package` lifecycle and integrity model accepted in [Package Lifecycle RFC](../specifications/package-lifecycle-rfc.md) (OQ-021, 2026-08-27); real signature verification and registry/key items remain draft under OQ-022 and OQ-026 through OQ-029                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| DevTools                       | (inside `bitty-runtime` candidate)                    | Instrumentation, observability event pipeline, and versioned debug protocol contracts accepted in [DevTools RFC](../specifications/devtools-rfc.md) (OQ-019, 2026-08-28); no dedicated `bitty-debug` crate yet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Rich Presentation              | `bitty-rich`                                          | Present; image, rich-block, scene, zone, and structured-transport contracts accepted in [Rich Presentation RFC](../specifications/rich-presentation-rfc.md) (OQ-008/OQ-015/OQ-016, 2026-08-28); headless placeholders remain                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| IPC                            | `bitty-ipc`                                           | Draft std-only stub; bounded framing/channels/stdio; wire/auth/scopes (OQ-018) still `Proposed`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Agent                          | `bitty-agent`                                         | Draft std-only stub; bounded messages/side queue; auth/consent/streaming (OQ-018 still `Proposed`, OQ-019 now `Accepted` via [DevTools RFC](../specifications/devtools-rfc.md))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Crate presence satisfies the candidate order above but does not close any open
question. Acceptance requires the artifact named in the
[open-question register](../decisions/open-questions.md) with category,
docs-curator, and security-auditor evidence as applicable.

## Candidate early-deferral list

The source proposes deferring the following until the spine above exists,
because each tempts an early build that would destabilize the foundations:

- AI features.
- A plugin store or marketplace distribution surface.
- Fancy tabs and window chrome.
- Markdown rendering.
- The `bittyd` daemon.
- An SSH manager.
- A theme marketplace.

This list overlaps the accepted [Product vision](vision.md) non-goals, which
already refuse current-phase commitment to `bittyd` and to an AI-first product
experience. The broader list itself remains a proposal; it neither strengthens
nor replaces those non-goals.

## Candidate version-maturity ladder

The source proposes interpreting version numbers as architecture-maturity
labels that need not track calendar time:

| Version | Candidate scope                                                    |
| ------- | ------------------------------------------------------------------ |
| v0.0.x  | Architecture and protocol prototypes.                              |
| v0.1    | A shell runs correctly in a minimal terminal slice.                |
| v0.2    | VT and TUI compatibility work.                                     |
| v0.3    | GPU rendering, fonts, performance, and graphics protocols.         |
| v0.4    | Lua configuration system.                                          |
| v0.5    | Plugin API.                                                        |
| v0.6    | Plugin manager and lazy loading.                                   |
| v0.7    | DevTools and the debug protocol.                                   |
| v0.8    | Rich presentation, Markdown stress testing, and shell integration. |
| v0.9    | IPC, `bitty ctl`, MCP adapter, and stabilization.                  |
| v1.0    | Stabilized plugin, configuration, command, and debug contracts.    |

Notably, the source ladder places `bittyd` nowhere before v1.0, consistent
with its explicit Phase 10 positioning below.

### Candidate v1.0 criteria

The source proposes a strict bar for calling any release v1.0:

- Platforms: Tier 1 Linux, Windows, and macOS plus Tier 2 BSD, consistent with
  the platform tiers accepted in [ADR 0002](../decisions/adrs/ADR-0002-platform-support-tiers.md).
- Shell coverage: compatibility across five shells; which shells belong to the
  first milestone remains governed by
  [OQ-004](../decisions/open-questions.md) and the
  [Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md).
- Application compatibility targets including Neovim, tmux, Starship, htop,
  fzf, and lazygit.
- Stable versioned surfaces: Plugin API v1, Config schema v1, Command API v1,
  Debug Protocol v1, and Plugin Manifest v1.
- Security gates already normative in the
  [security overview](../security/overview.md) and
  [threat model](../security/threat-model.md), such as parser limits,
  least-privilege capabilities, VM isolation, safe mode, scoped IPC permissions,
  checksum-and-lock package validation, paste protection, OSC policies, and
  fuzz coverage. Listing them here as proposed release criteria does not weaken
  or replace those normative controls, which hold regardless of any version
  label.
- Support tooling: doctor, dev, devtools commands, SDK, template, and docs.

## Candidate daemon staging

For the headless `bittyd` daemon question, the source's positioning is now the
accepted direction per [ADR 0008](../decisions/adrs/ADR-0008-headless.md), which
defers the daemon to post-v1.0, accommodates the headless runtime early, and
gates any future daemon or remote work on a mandatory trust-boundary analysis:

- Positioning: after v1.0, or at earliest near v1.0; accommodate early, do not implement early (accepted via ADR 0008).
- Candidate feature scope if ever adopted: detach/attach of running terminals, persistent sessions, a remote frontend, and multiplexer-style ownership of multiple terminals (candidate scope per ADR 0008).
- Recorded rationale: building the daemon first would greatly increase terminal-lifecycle complexity compared with the single-process design.

This staging was offered to [OQ-020](../decisions/open-questions.md) as a candidate and is now deferred to post-v1.0 with trust-boundary gate per [ADR 0008](../decisions/adrs/ADR-0008-headless.md). The trust-boundary half requires analysis against the [threat model](../security/threat-model.md) per that ADR. The existing candidate bullet in the [Architecture Overview](../architecture/overview.md) long-term evolution section now cites ADR 0008 as the accepted daemon positioning.

## Relationship to registers

- No open question is closed or answered by this record, and no entry in the
  [decision register](../decisions/index.md) changes status.
- Acceptance of any item requires the reviewable artifact named in the
  [open-question register](../decisions/open-questions.md) or a new scoped
  ADR/RFC.

## Companion release ladder (CTX-0044 draft)

This section records the concrete companion proposed in bitty CTX-0044
`docs/product/release-ladder.md` (branch `ctx-0044/docs-release-ladder`,
worktree `.worktrees/ctx-0044-docs-release-ladder` in the `bitty`
repository) on top of CTX-0043
`chore(crate): prepare workspace for crates.io v0.1.0`
(branch `ctx-0043/chore-crate-publish`, PR #74,
`workspace.package.version 0.0.0 -> 0.1.0`, nine `publish = true` /
seven `publish = false`). It does **not** accept this record.

- Version mapping: `0.1.0` for the `v0.1` minimal shell slice
  (VT + PTY + Terminal Truth + platform + config + render + UI + runtime + app
  headless slice), `0.2.0` VT/TUI, `0.3.0` GPU, `0.4.0` Lua, `0.5.0` Plugin API,
  `0.6.0` manager, `0.7.0` DevTools, `0.8.0` Rich, `0.9.0` IPC, `1.0` stabilized —
  maturity labels, not dates; patches stay semver-compatible.
- Crate publish order (DAG-forced, CTX-0043 `version = "0.1.0"` pins):
  **Group 1 leaves** `bitty-vt`, `bitty-pty`, `bitty-platform`, `bitty-config`,
  `bitty-package`, `bitty-lua` (`publish = true`, no workspace deps) ->
  **Group 2** `bitty-term-state` (`-> vt`) ->
  **Group 3** `bitty-ui` (`-> term-state`) and `bitty-render`
  (`-> term-state` + `platform`) in parallel ->
  **Group 4 tail deferred** (`publish = false` at `0.1.0`)
  `bitty-plugin-host`, `bitty-rich`, `bitty-ipc`, `bitty-agent`,
  `bitty-runtime`, `bitty-app`, `bitty-core`.
- The ladder overlays this publish order on the candidate spine without
  weakening normative security controls; acceptance of any slice still
  requires its RFC/ADR with independent review. The companion file
  `bitty/docs/product/release-ladder.md` (draft, `status: draft`) is the
  reviewable source for the table and verification gates
  (`cargo publish --dry-run` leaf PASS, dependent crates valid but awaiting
  index, `just check` green).
