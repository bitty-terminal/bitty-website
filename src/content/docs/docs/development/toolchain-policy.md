---
title: Toolchain and Tooling Policy
description: Pins the canonical local toolchain, package manager, and quality-gate commands for every Bitty repository so that all agents use identical tools.
category: development
audience: contributor
document_type: specification
status: draft
website_publish: true
sidebar_order: 15
---

# Toolchain and Tooling Policy

## Document status

- Status: **proposed** (frontmatter uses `draft`; not yet accepted).
- Purpose: agents and human contributors must run the same tools at the same
  pinned versions. Free-version drift between agents is a defect, not a
  convenience. Every command below is the single canonical way to perform its
  task in this workspace.

## Normative rules

1. **Never use `npm`, `npx`, or `yarn` in any Bitty repository.** JavaScript
   execution and package management use `bun` / `bunx --bun` exclusively, at
   the version pinned per repository.
2. **Never invoke formatters or linters directly by name** (no bare
   `prettier`, `markdownlint`, `cargo fmt`, …). Always go through the
   repository `justfile`: `just check` (or the specific recipe). The justfile
   owns the pinned versions.
3. **Version pinning lives in exactly one place per repository**: the
   `justfile` for docs/tool versions, `rust-toolchain.toml` for the Rust
   channel, lockfiles for dependencies (`bun.lock`, `Cargo.lock`). Agents must
   not upgrade pins as a side effect of an unrelated task.
4. If a required tool is missing locally, install it at the pinned version;
   do not substitute a different version or a different tool.
5. Any tool addition follows the candidate-adoption process in
   [Technology strategy](../project/technology-strategy.md) and lands in this
   document plus the owning justfiles in the same change.

## Pinned toolchain matrix

| Repository              | Language runtime                                                                | Package manager | Entry point  | Notes                                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- | --------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bitty-docs`            | Bun 1.4.0                                                                       | bun             | `just check` | prettier 3.9.6 and markdownlint-cli2 0.23.1 via bunx pins; commitlint 21.2.2 cache-dir install; actionlint 1.7.12 runs as a locally installed pinned binary and as docker `rhysd/actionlint:1.7.12` in CI, never via bunx |
| `bitty-website`         | Bun 1.4.0                                                                       | bun             | `just check` | frozen lockfile install; Astro static build; prettier 3.9.6, markdownlint-cli2 0.23.1, commitlint 21.2.2 pinned in package.json/bun.lock                                                                                  |
| `bitty`                 | Rust stable (rust-toolchain.toml); Bun for tooling without an in-repository pin | cargo / bun     | `just check` | rustfmt, Clippy, tests, actionlint (docker `rhysd/actionlint:1.7.12` in CI); commitlint 21.2.2 provisioned into `target/dev-tools`; markdownlint-cli2 0.23.1 via bunx                                                     |
| `bitty-devtools`        | Bun 1.4.0                                                                       | bun             | `just check` | prettier 3.9.6 and markdownlint-cli2 0.23.1 via bunx pins; commitlint 21.2.2 pinned in package.json/bun.lock                                                                                                              |
| `bitty-mcp`             | Bun 1.4.0                                                                       | bun             | `just check` | prettier 3.9.6 and markdownlint-cli2 0.23.1 via bunx pins; @commitlint/config-conventional 21.2.2 pinned in package.json/bun.lock                                                                                         |
| `bitty-plugin-sdk`      | Bun 1.4.0                                                                       | bun             | `just check` | @commitlint/cli 21.2.2 and @commitlint/config-conventional 21.2.2 pinned in package.json/bun.lock; lefthook 2.1.10, prettier 3.9.6, and markdownlint-cli2 0.23.1 via bunx pins in the justfile                            |
| `bitty-plugin-template` | Bun 1.4.0                                                                       | bun             | `just check` | lefthook 2.1.10, commitlint 21.2.2, prettier 3.9.6, markdownlint-cli2 0.23.1 mirrored in justfile variables and package.json/bun.lock                                                                                     |

### Bitty workspace crate pins (2026-08-27)

`bitty/Cargo.toml` sets `edition = "2024"`, `resolver = "3"`,
`rust-version = "1.85"` (MSRV), and `publish = false`; `rust-toolchain.toml`
pins `channel = "1.97.1"` with `rustfmt` and `clippy` (minimum 1.85 for
edition 2024). Third-party pins below are per-crate; workspace inheritance
keeps lints (`unsafe_code = "deny"`) uniform. Crates marked std-only carry
no third-party runtime dependencies and are headless, `forbid(unsafe_code)`:

| Crate               | Third-party pins                                                                                               | Notes                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `bitty-vt`          | `vte@0.15`                                                                                                     | Parser tables behind owned `TerminalAction`; no I/O                                                                                        |
| `bitty-term-state`  | `bitty-vt` only                                                                                                | Pure terminal truth; dev `proptest` only                                                                                                   |
| `bitty-pty`         | `portable-pty@0.9`                                                                                             | Wrapper; lifecycle/backpressure owned                                                                                                      |
| `bitty-platform`    | `winit@0.30`, `raw-window-handle@=0.6.2`                                                                       | `wgpu` surface pin `0.6` side; `gui-tests` feature opt-in                                                                                  |
| `bitty-config`      | std-only                                                                                                       | Typed config, validation, migration; no extra pins                                                                                         |
| `bitty-render`      | `wgpu@25.0`, `crossfont@0.9` plus `bitty-term-state`, `bitty-platform`                                         | ADR-0004 rendering rows; `sw-fallback` feature opt-in                                                                                      |
| `bitty-ui`          | `bitty-term-state` only                                                                                        | View/layout/selection primitives; headless                                                                                                 |
| `bitty-plugin-host` | `bitty-term-state`, `bitty-config`, `bitty-package`                                                            | Host registry/capability/lifecycle; no GPU/PTY handles                                                                                     |
| `bitty-runtime`     | `bitty-vt`, `bitty-term-state`, `bitty-pty`, `bitty-render`, `bitty-platform`, `bitty-ui`, `bitty-plugin-host` | Orchestration; no new third-party pins                                                                                                     |
| `bitty-package`     | std-only                                                                                                       | Lifecycle and integrity model accepted (OQ-021, 2026-08-27); real signature verification remains draft; deterministic SHA-256 stub; no I/O |
| `bitty-rich`        | `bitty-term-state`, `bitty-vt` (and dev)                                                                       | Draft rich presentation; no decoder/renderer dep                                                                                           |
| `bitty-ipc`         | std-only                                                                                                       | Draft bounded framing/channels/stdio stub; no socket/pipe                                                                                  |
| `bitty-agent`       | std-only                                                                                                       | Draft bounded messages/tool stubs/side queue; no LLM I/O                                                                                   |
| `bitty-app`         | `bitty-runtime`, `bitty-platform`                                                                              | Thin composition root; no new pins                                                                                                         |
| `bitty-core`        | std-only                                                                                                       | Bootstrap seed; to be retired                                                                                                              |

`bitty-ipc` and `bitty-agent` currently carry no third-party pins and remain
std-only; `bitty-rich` likewise carries only workspace-crate edges plus the
bounds above, and `bitty-package` carries only workspace-crate edges with the
lifecycle and integrity model accepted (signatures remain draft per crate docs).
Any new upstream for the remaining draft tail requires an ADR 0004 revision.

## Local gate tools and hook wiring

The bootstrap wiring of each repository records these shared local gate tool
versions:

| Tool                              | Pinned version |
| --------------------------------- | -------------- |
| lefthook (Git hook manager)       | 2.1.10         |
| commitlint / `@commitlint/cli`    | 21.2.2         |
| `@commitlint/config-conventional` | 21.2.2         |
| prettier                          | 3.9.6          |
| markdownlint-cli2                 | 0.23.1         |

Every invocation of these tools goes through `bun` / `bunx --bun` as required
by [normative rule 1](#normative-rules); the hook files (`lefthook.yml`) only
wire hook stages to `just` recipes, never invoke a tool version themselves
except where noted below.

Pin locations follow normative rule 3 — one authoritative place per pin — with
four verified patterns:

- **Justfile-owned `bunx --bun tool@version` pins** are the default pattern:
  `bitty-docs`, `bitty-devtools`, `bitty-mcp`, and `bitty-plugin-sdk` pass
  pinned versions directly on each `bunx --bun` call from justfile variables.
- **package.json + bun.lock exact pins** exist where the tooling needs
  resolvable packages at runtime. Exactly five repositories follow this
  pattern: `bitty-website` (which also pins prettier and markdownlint-cli2
  there because its justfile delegates to package.json scripts),
  `bitty-devtools`, `bitty-mcp`, `bitty-plugin-sdk`, and
  `bitty-plugin-template`. Each of them keeps `@commitlint/config-conventional`
  — and, where scripts require it, `@commitlint/cli` or `commitlint` — as an
  exact-pinned devDependency installed via frozen-lockfile `bun install`,
  because its `commitlint.config.ts` extends that config at runtime. The
  template mirrors its package.json devDependencies as identical justfile
  variables and must keep both sides in sync when bumping. The two remaining
  repositories deliberately do not use devDependencies for this:
  `bitty-docs` uses the cache-directory install below and `bitty` provisions
  `target/dev-tools`.
- **A justfile-provisioned tools directory**: `bitty` provisions
  `commitlint@21.2.2` plus `@commitlint/config-conventional@21.2.2` into
  `target/dev-tools` through a stamped `bun add` step (`just tools`); its
  commit-msg gate copies the repository `commitlint.config.ts` into that
  directory before invoking commitlint.
- **A cache-directory install**: `bitty-docs` installs `@commitlint/cli` and
  `@commitlint/config-conventional` at 21.2.2 on first use under
  `${XDG_CACHE_HOME:-~/.cache}/bitty-docs/commitlint@<version>` and runs the
  CLI from that cache.

Hook coverage recorded by this wiring: `bitty`, `bitty-website`,
`bitty-devtools`, `bitty-mcp`, and the plugin repositories run pre-commit
formatting and Markdown gates plus a commit-msg Conventional Commits check
(`bitty` also runs a pre-push typecheck); `bitty-docs` gates commit messages
only. Installing the hooks is opt-in per checkout via the owning justfile
(`just setup` in `bitty`; `hooks-install` recipes in `bitty-docs`,
`bitty-mcp`, `bitty-plugin-template`, and `bitty-plugin-sdk`) or a locally
installed `lefthook` binary where no recipe exists.

Known drift at recording time (report it; do not silently fix it here):

- Repositories without a provisioning recipe or devDependency for lefthook
  (`bitty`, `bitty-website`, `bitty-devtools`) resolve the lefthook binary
  from `PATH` without a version pin, unlike the pinned 2.1.10 installs in
  `bitty-docs`, `bitty-mcp`, `bitty-plugin-template`, and
  `bitty-plugin-sdk`.

## Canonical commands

| Task                        | Command (from repo root) |
| --------------------------- | ------------------------ |
| Full read-only quality gate | `just check`             |
| Format files                | `just fmt`               |
| Markdown lint               | `just markdownlint`      |
| Docs link check (offline)   | `just links`             |
| Frontmatter metadata check  | `just metadata`          |
| English-only check          | `just language`          |

Rust-side gates (in `bitty/`) remain: `cargo check`,
`cargo fmt --check`, `RUSTFLAGS="-D warnings" cargo clippy --workspace`,
`cargo test`, always invoked through the justfile.

## Agent requirements

Every agent working in a Bitty repository must:

1. Read the repository `AGENTS.md` and this document before running any tool.
2. Run gates from the repository root, never from the umbrella workspace.
3. Record gate output as verification evidence in its CarryCtx task; a task is
   not reviewable without reproducible evidence from these exact commands.
4. Report — not silently fix — any pin drift it discovers (a pinned version
   missing, a lockfile out of date relative to a manifest).

## Open items

- Confirm exact action/tool versions recorded in each repository's CI on its
  first implementation pull request, per the
  [repository bootstrap guide](repository-bootstrap.md).
- Reconcile the drift recorded under
  [Local gate tools and hook wiring](#local-gate-tools-and-hook-wiring) through
  owning tasks in the affected repositories.
- Candidate additional tools (`typos`, `taplo`, `cargo-deny`, `cargo-nextest`,
  `cargo-fuzz`, …) stay candidates until validated by an owning task.
