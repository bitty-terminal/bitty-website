---
title: Panel Environment State (Candidate)
description: Candidate Panel environment state model with four layers prompt-time sync ShellState unification inheritance no-persist default and exported-only fence
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 34
---

# Panel Environment State (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document records the Panel
> environment-state design direction as a
> reviewable direction. It records an accepted working direction
> ([DIR-022](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md))
> at the design level only: it authorizes no shipped, stable, or
> compatibility-guaranteed behavior, promotes nothing to **Verified**, and
> does not weaken any accepted source it cites. Every mechanism below stays
> **Candidate** until a reviewed RFC or ADR accepts it with security-auditor
> review.

## Claim status map

| #   | Claim in this document                                                                | Status in this document                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-1 | Four-layer model and inheritance chain                                                | Candidate direction; no accepted env-layer contract exists today                                                                                                          |
| C-2 | Prompt-time `bitty __shell-sync` acquisition; no input parsing; no `/proc`            | Candidate direction; grouped with the existing shell-integration family (cwd, command boundary, exit code), which stays owned by its accepted sources                     |
| C-3 | Snapshot-first `PanelEnvSnapshot`, revision per prompt sync, no diff in v1            | Candidate direction; sizes (few KiB to tens of KiB) are observations, not budgets                                                                                         |
| C-4 | No separate `EnvManager`; Panel-owned `ShellState` (`launch_context` + `shell_state`) | Candidate direction; rationale only — future agent / headless / `.wheel` / venv / execution composition is a goal, not a contract                                         |
| C-5 | Execution View versus sanitized Agent View; Use ≠ Read; env-snapshot handles          | Candidate direction with normative conformance (see [Security conformance](#security-conformance)); agent-side adoption is an ai-docs rollout follow-up, not decided here |
| C-6 | `new` / `clean` / `spawn --env` semantics; Lua shapes illustrative-only               | Candidate direction; Lua spellings are sketches, never an API commitment                                                                                                  |
| C-7 | No disk persistence by default; restart re-derives; `persist_env` future opt-in       | Candidate direction that conforms to the normative no-record-by-default rule; the allowlist itself is a deferred follow-up, not specified here                            |
| C-8 | Exported-process-environment-only fence                                               | Candidate scope fence, consistent with secret-minimization; full shell clone explicitly not attempted                                                                     |
| C-9 | Kitty / Ghostty behavior summaries                                                    | Evidence only; their docs are not copied and their projects decide nothing for Bitty                                                                                      |

## Four-layer model (candidate)

```text
ProcessEnv
    ↓
ConfigEnv
    ↓
Source Panel RuntimeEnv
    ↓
Explicit overrides
    ↓
New Panel LaunchEnv
```

| Layer        | Meaning                                                   | Lifetime        |
| ------------ | --------------------------------------------------------- | --------------- |
| `ProcessEnv` | Bitty process environment (`HOME`, `PATH`, `LANG`, …)     | Bitty process   |
| `ConfigEnv`  | Bitty config / `.wheel` configuration (Session / Project) | Session/Project |
| `LaunchEnv`  | Environment a Panel is created with                       | Panel           |
| `RuntimeEnv` | Live shell edits (`export`, `set -x`, venv activation, …) | Shell runtime   |

Example direction: Panel A runs at `~/Projects/bitty` with
`RUST_LOG=debug`, `FOO=bar`, and an activated virtual environment
(`VIRTUAL_ENV=~/.venv`, adjusted `PATH`). Creating Panel B from focused
Panel A carries a snapshot of Panel A's `RuntimeEnv` into Panel B's launch
environment, so Panel B observes the same `FOO`, `RUST_LOG`, and
`VIRTUAL_ENV` values. Layout placement of the new Panel stays owned by the
Hyprland-style layout tree; this document decides only the environment
inheritance, not tiling.

## RuntimeEnv acquisition (candidate)

Do not parse user input to learn the environment. Inputs such as
`export A=1`, `source setup.sh`, `eval "$(…)"`, `direnv allow`,
`conda activate foo`, `source .venv/bin/activate`, or a function body that
calls `export` cannot be understood correctly in general by a command
parser, so input parsing is explicitly out of the design.

Do not rely on `/proc/<pid>/environ` either: it is not a portable or
reliable shell-runtime-state API.

The candidate mechanism is shell integration plus a helper at prompt time:

```text
command finished
      ↓
shell precmd / PROMPT_COMMAND
      ↓
bitty __shell-sync
      ↓
Bitty Core
```

`bitty __shell-sync` runs as a child process of the shell, so it
naturally inherits the shell's current exported environment; Core reads it
in Rust via `std::env::vars_os()`. No shell syntax needs to be understood:
`export FOO=bar` (bash/zsh), `set -x FOO bar` (fish), `source
whatever.sh`, and venv activation are all supported automatically because
the helper observes effects, not syntax.

Sync happens at prompt time only — not on every shell operation — and
belongs to the same integration family as cwd, command-boundary, and
exit-code reporting:

```text
Shell Prompt → sync environment → PanelEnvSnapshot → user executes
command → command running → command ends → Shell Prompt → sync …
```

## PanelEnvSnapshot (candidate)

```rust
struct PanelEnvSnapshot {
    panel_id: PanelId,
    revision: u64,
    cwd: PathBuf,
    env: HashMap<OsString, OsString>,
    shell: ShellKind,
    sync_state: EnvSyncState,
}
```

Each prompt sync bumps the revision (for example revision `42` → `43`
after `export FOO=hello`); v1 stores full snapshots with no diff
optimization. Snapshot-first is deliberate: environments are typically a
few KiB to tens of KiB, so diff storage is deferred until measured need.

## ShellState unification (candidate)

Do not create a separate `EnvManager` while cwd lives elsewhere. The
candidate model unifies cwd, environment, command, prompt, shell, and
remote/local state into one Panel-owned `ShellState`:

```rust
struct ShellState {
    cwd: PathBuf,
    env: EnvSnapshot,
    command: Option<CommandState>,
    prompt: PromptState,
    shell: ShellKind,
    remote: RemoteState,
}

struct Panel {
    id: PanelId,
    pty: Pty,
    shell_state: ShellState,
    // …
}
```

Concretely: the Panel keeps a `launch_context` (what the Panel was
created with) and a `shell_state` (live cwd, environment, command, and
prompt). The rationale is compositional: Panel, agent, headless Panel,
project `.wheel` context, virtualenv handling, and command execution all
go through the same `ShellState` / `ExecutionContext` instead of growing a
parallel environment subsystem that bitty-ai would later have to
retrofit.

## Agent views and env-snapshot handles (candidate)

Environment data routinely contains secrets (`OPENAI_API_KEY`,
`AWS_SECRET_ACCESS_KEY`, `GITHUB_TOKEN`, `DATABASE_URL`, password-shaped
keys, `SSH_AUTH_SOCK`). A Panel snapshot must therefore never be
serialized whole into model context. The candidate exposes two views:

```text
         Panel Environment
                 │
       ┌─────────┴─────────┐
       │                   │
  Execution View       Agent View
       │                   │
  full values          sanitized
```

An agent inspecting a Panel sees presence and non-secret values only;
secret values are redacted:

```json
{
  "panel_id": 3,
  "cwd": "~/Projects/bitty",
  "environment": {
    "VIRTUAL_ENV": "~/.venv",
    "RUST_LOG": "debug",
    "OPENAI_API_KEY": {
      "present": true,
      "secret": true
    }
  }
}
```

The governing principle is **Use Environment ≠ Read Environment**: the
agent may execute with credentials via Core (Core holds the full values
and passes them to the child process), while the language model never
receives secret values. The handle form of this is an env-snapshot
handle: the agent holds an `env_snapshot_id`, Core resolves the data
internally when spawning (including headless Panels cloned from a source
Panel), and the identifier composes with the agent↔Panel lease model.
Agent-side field shapes, redaction patterns, and lease coupling are
adopted by the ai-docs owners as a rollout follow-up; this document
decides only the terminal-side direction and the conformance boundary.

## New-panel semantics (candidate)

| Behavior      | cwd           | environment          |
| ------------- | ------------- | -------------------- |
| `new`         | focused Panel | focused Panel        |
| `clean`       | focused /home | Bitty base env       |
| `spawn --env` | source        | source plus override |

The default creation (`Mod+Enter` style) inherits both cwd and environment
from the focused Panel. A clean creation (`bitty panel new --clean-env`
style) starts from the Bitty base environment instead. Spawn-with-override
merges explicit keys over the source snapshot. Lua shapes below are
**illustrative-only sketches**, never an API commitment:

```lua
-- Illustrative only: spelling not decided, no API commitment.
bitty.panel.spawn({
  cwd = "inherit",
  env = "clean",
})

bitty.panel.spawn({
  env = {
    inherit = true,
    RUST_LOG = "trace",
    DEBUG = "1",
  },
})
```

## No disk persistence by default (candidate)

Inheritance and persistence are different things. The direction is:

```text
current Panel            inheritable
new Panel from it        inheritable
agent headless clone     inheritable (via handle)

Bitty restart recovery   NOT restored by default
session-file writes      NO by default
log writes               NO by default
```

Rationale: snapshots may contain secrets, so Bitty restart re-derives the
environment from the OS environment plus bitty config plus `.wheel`
configuration plus shell rc files — never from a dumped whole-environment
file. A future explicit allowlist is the only permitted exception shape
(also illustrative-only, not specified here):

```lua
-- Illustrative only: future opt-in shape, not specified here.
session = {
  persist_env = {
    "RUST_LOG",
    "NODE_ENV",
    "VIRTUAL_ENV",
  },
}
```

## Scope fence: exported process environment only (candidate)

```text
In scope:  exported process environment (what a child process inherits)
Out of scope: shell-local (non-exported) variables, aliases, functions,
  shell options, history, completion state, prompt internals
```

A bare `FOO=bar` without `export` in bash is a shell variable, not an
environment variable, and is not synchronized. Full shell cloning (as
opposed to environment inheritance) is explicitly not attempted in this
phase.

## Relationship to accepted sources

This document refines nothing and weakens nothing. Where it restates an
accepted rule it cites the accepted document and does not redefine it:

- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): Panel lifecycle,
  `PanelId` identity, capability isolation, and budget attribution stay
  authoritative. This candidate adds environment state alongside that
  contract; any conflict resolves in favor of the accepted RFC.
- [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)
  (accepted) and [Workspace Compositor Specification](workspace-compositor.md)
  (accepted): identity, ownership, and tiling authority are unchanged.
- [Terminal State RFC](terminal-state-rfc.md) (accepted): Terminal Truth
  ownership is unchanged; environment state is not terminal state.
- Shared governance in bitty-docs stays canonical and is linked, never
  copied (see [Security conformance](#security-conformance)).

## Security conformance

The normative security corpus governs this direction and is cited, never
contradicted:

- [Security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  environment variables are secret-capable; clipboard and raw environment
  data are not recorded by default; traces, diagnostics, and crash reports
  are secret-minimizing with typed sensitive fields, redaction, user-only
  file modes, and export preview (invariants 6 and 9).
- [ADR 0006](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0006-os-env-policy.md)
  (accepted): `os.getenv` denial with typed errors and desensitized,
  capability-gated, allowlisted host-mediated reads plus audit logging is
  the established pattern this direction follows for the shell side
  (sanitized Agent View, no enumeration, no ambient fallback).
- [Threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  environment-data confidentiality is an asset; T-11 requires default
  minimization and redaction for traces; the IPC rule forbids placing
  credentials where shell startup or SSH forwarding leaks them, which the
  no-persist default and handle-passing respect.
- [Risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md):
  R-012 (scoped child credential leaks), R-013 (agent confused deputy via
  hostile output), and R-014 (trace / crash-report secret exposure) stay
  open gates; this direction adds no bypass and claims no mitigation.
- [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md):
  P0-AC-023 (short-lived child scope, no admin token in child
  environment), P0-AC-024 (agent read-only default with untrusted
  labeling), and P0-AC-026 (trace minimization and redaction with `0600`
  files and byte-equal export preview) are the test contracts any future
  implementation must satisfy. No criterion is marked satisfied here.

If a future refinement of this direction conflicts with any normative
control above, the conflict must be marked `candidate +
needs-security-review` and resolved in favor of the security corpus.

## Evidence-only references

- Kitty shell integration (`clone-in-kitty` serializes shell state via
  integration; plain environment copy reflects creation time only):
  <https://sw.kovidgoyal.net/kitty/shell-integration/>
- Ghostty shell integration (new terminal starts from the focused
  terminal's working directory):
  <https://ghostty.org/docs/features/shell-integration>
- Ghostty configuration reference (`env = KEY=VALUE` launch environment):
  <https://ghostty.org/docs/config/reference>

These projects are evidence for feasibility only. Their documentation is
not copied, and their designs decide nothing for Bitty.

## Follow-ups (not decided here)

1. ai-docs rollout: agent-view field shapes, secret-pattern list,
   env-snapshot handle lifecycle, and lease-model coupling — owned by the
   ai-docs owners; this repository must not specify the agent contract.
2. Session-persistence allowlist: exact `persist_env` semantics, storage,
   consent, audit, and redaction — deferred until a session-persistence
   design requires it; default stays no-persist.
3. Promotion path: a Panel-environment RFC (or amendment to the Panel
   Runtime family) with bounded values, error taxonomy, budgets, and
   verification mapping to P0-AC-023 / P0-AC-024 / P0-AC-026 — only when an
   owning task schedules it. No open question is opened by this document
   because the direction alone blocks no milestone.
