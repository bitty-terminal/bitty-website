---
title: CLI Contract RFC
description: Defines the accepted top-level CLI commands, dynamic namespace, action and output schemas, aliases, and exit codes for OQ-017
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 18
---

# CLI Contract RFC

> Status: **accepted** on 2026-08-28 by the project initiator. This document defines the accepted
> top-level CLI command set, dynamic namespace, action and output schemas, alias policy, and
> stable exit codes for [OQ-017](../decisions/open-questions.md) at the design level; it closes [OQ-017](../decisions/open-questions.md). It does not describe implemented
> behavior, does not authorize shipped, stable, or compatibility-guaranteed
> behavior, and does not weaken any normative security control. Experimental
> implementation may exist as review evidence but carries no compatibility
> promise beyond the accepted contract. Acceptance was per independent category-owner, docs-curator, and security-auditor review (CTX-0070) with P0 sign-off simulated 2026-08-28; see [P0 Review Sign-off](#p0-review-sign-off)
> and the [P0 review checklist](../reviews/p0-review-checklist.md). The lifecycle is `Draft -> experimental review evidence -> Accepted -> normative`.

## Purpose and scope

OQ-017 asks: _which top-level CLI commands, dynamic command namespace, action
schema, output schema, aliases, and stable exit codes form v1?_ This RFC answers
that question for the first usable Bitty build and the v1 compatibility promise:

- **Top-level commands:** the minimal stable command tree for v1, its class
  separation (local, runtime, extension), and the compatibility promise for each
  subtree.
- **Dynamic namespace:** how plugin-provided commands appear under a
  collision-free qualified route, how manifest-derived short aliases are derived,
  and when an optional top-level alias may exist.
- **Action and output schemas:** the single executable registry that powers GUI,
  key bindings, Lua, IPC, and CLI frontends, its typed argument and result
  schemas, and the CLI output contract (format flags, envelope, stream
  separation, and versioning).
- **Aliases:** the stable alias set for v1, its collision and reservation rules,
  and its completion generation model.
- **Exit codes:** the stable numeric exit-code taxonomy for v1 and the mapping
  from error classes to codes.

In scope: the `bitty` binary argument grammar, the executable registry shape
that the CLI shares with other frontends, the `bitty run` versus `bitty ctl`
separation, the `bitty x` qualified plugin route, `bitty config`, `bitty list`,
`bitty inspect`, `bitty doctor`, `bitty completion`, `bitty version`, and the
cross-cutting concerns of parsing limits, help generation, format negotiation,
target selection flags, and exit-code stability.

Out of scope (owned elsewhere):

- instance discovery, IPC framing, wire envelope, peer-credential authentication,
  per-request scope evaluation, and rate limits RC-9 and RC-10 (owned by
  [IPC and Agent RFC](ipc-agent-rfc.md) under OQ-018; this RFC references but
  does not duplicate that wire contract);
- plugin capability identifiers, event phases, and package manifest, lockfile,
  or signature verification (owned by
  [Plugin Platform RFC](plugin-platform-rfc.md) and
  [Package Lifecycle RFC](package-lifecycle-rfc.md) under OQ-011 through OQ-013
  and OQ-021);
- rich-block, scene, semantic-zone, and structured-transport contracts (owned by
  [Rich Presentation RFC](rich-presentation-rfc.md) under OQ-008, OQ-015, OQ-016);
- the headless daemon and remote UI question (OQ-020);
- the exact terminal, render, or image budgets that CLI commands may expose
  (their thresholds remain owned by the relevant isolation and performance
  documents).

This RFC introduces no new trust boundary. Every privileged CLI operation
remains behind the scope and budget gates already normative in the security
corpus.

## Normative precedence

The following are normative and override every proposal here. If any grammar,
default, alias, schema, or exit-code behavior below weakens them, the normative
text wins and this RFC must be corrected:

- [Security Overview](../security/overview.md): invariants 1 through 10,
  especially invariant 5 (IPC is local-user-only and every operation has an
  explicit scope), invariant 6 (MCP and Agent access is read-only by default;
  terminal content is untrusted observation data), the capability-family table,
  and the safe-mode requirement.
- [Threat Model](../security/threat-model.md): boundary map
  `PTY bytes | Lua plugin | IPC/MCP -> Bitty core`, section "IPC, CLI, and
  child processes" (T-09, R-011, R-012) where the CLI is the local-user
  frontend, and the general bounded-parsing requirement (T-01) that applies to
  every parser including the CLI.
- [Security Risk Register](../security/risk-register.md): R-011 (IPC scope
  escalation through a second frontend), R-012 (credential leak via environment
  or SSH forwarding), R-014 (secret exposure via traces), and R-001 (parser
  bounds).
- [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md):
  P0-AC-001 (parser bounds), P0-AC-021 through P0-AC-023 (IPC auth, scope, and
  child-credential rules), and P0-AC-026 (redaction) where CLI output may expose
  sensitive fields.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md): the rule
  that the terminal, render, and input hot paths are core-owned and that
  plugins and presentation never enter them; the CLI adapter never owns runtime
  behavior.
- [CLI](../interfaces/cli.md) (candidate): the candidate command/action
  distinction, the one-executable-registry direction, and the candidate tree
  that this RFC concretizes; this RFC refines that candidate rather than
  replacing an accepted contract.

This RFC proposes only spelling, schemas, defaults, and verification plans for
those normative gates. No new ambient authority, bypass API, or silent
capability increase is introduced; per
[documentation workflow](../development/documentation-workflow.md) change
trigger rules, any future change to a trust boundary updates the security corpus
first.

## Terminology

| Term            | Accepted meaning                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Executable      | An owned, named operation in the shared registry that the runtime service implements. Every frontend (GUI, CLI, Lua, IPC, MCP, DevTools) resolves to the same executable. |
| Action          | A fast contextual user operation (copy, paste, font increase, view split) that may not produce standard output. Suitable for key bindings.                                |
| Command         | A structured operation with typed arguments and a typed result that can fail and is suitable for automation.                                                              |
| Command class   | Whether a `bitty` invocation requires a running instance (`local` needs none, `runtime` needs one, `extension` needs an installed plugin).                                |
| Qualified route | The collision-free plugin command route `bitty x <publisher>.<name> <command> [args]`, with optional alias forms derived from static manifest.                            |
| Output envelope | The versioned CLI machine-output shape returned on standard output for `--format json` and `--format jsonl`.                                                              |
| Exit code       | The process exit status that automation may branch on. Stable codes are part of the v1 compatibility promise.                                                             |

## Accepted summary

1. **Small stable top level.** v1 ships the exact tree in the next section; no
   additional top-level command is added without an RFC revision.
2. **Single registry.** CLI parsing never reimplements runtime behavior. The CLI
   adapter owns parsing, target selection, serialization, and display; the
   runtime service owns the operation behind the shared executable registry.
3. **Dynamic namespace is qualified.** Every plugin command has the fully
   qualified `bitty x <publisher>.<name> <subcommand>` route. A short alias
   `bitty x <name>` and an optional top-level alias `bitty <name>` exist only
   when a single installed plugin claims that name and the manifest declares the
   alias; collisions are diagnostics, never last-wins.
4. **Typed schemas.** Every executable declares JSON Schema–typed argument and
   result shapes, limits, defaults, and error classes. Human table output is not
   a machine contract; `--format json` and `--format jsonl` are.
5. **Stable outputs and exits.** `--format` values, envelope version 1, stream
   separation, and exit codes 0 through 8 are stable for v1. Changing them
   requires an RFC revision with a dated transition.

## Top-level command tree for v1

Status: **accepted stable for v1** on 2026-08-28. This RFC defines the stable v1 tree.

```text
bitty
├── run        # start a child program (local class)
├── ctl        # control a running instance (runtime class)
├── config     # locate, validate, and explain configuration (local + runtime)
├── plugin     # manage plugin packages (local class)
├── list       # enumerate resources (local or runtime)
├── inspect    # explain effective state (local or runtime)
├── dev        # diagnostics, traces, captures, overlays (local or runtime)
├── doctor     # diagnose installation and compatibility (local class)
├── cmd        # invoke a qualified executable directly (escape hatch)
├── x          # qualified plugin namespace (extension class)
├── completion # emit shell completion (local class)
└── version    # version and build metadata (local class)
```

`bitty` with no subcommand opens the terminal with the default shell and the
effective configuration, matching the candidate in
[Command-line interface](../interfaces/cli.md). `bitty --help` and
`bitty <command> --help` are stable; `--help` never requires a running instance
and never loads a plugin VM.

### Class assignment and rationale

| Subtree            | Class                       | Requires instance                                 | Why in v1                                                                                                                                                                                  |
| ------------------ | --------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bitty run`        | local                       | no                                                | Starting a child must remain visibly distinct from controlling an existing instance; `--` unambiguously separates Bitty args from the child. `bitty htop` never means `bitty run -- htop`. |
| `bitty ctl`        | runtime                     | yes, single selected instance                     | Instance, window, view, and terminal control must share the authenticated, scoped transport owned by [IPC and Agent RFC](ipc-agent-rfc.md).                                                |
| `bitty config`     | local with one runtime verb | mostly no; `config reload` needs instance         | `config check`, `config path`, `config show`, `config diff`, `config defaults` run in a fresh configuration VM and produce a typed plan; `config reload` is the only runtime verb.         |
| `bitty plugin`     | local                       | no                                                | Installation, disable, enable, and locked-environment listing must not require a running instance.                                                                                         |
| `bitty list`       | mixed                       | no for local resources; yes for runtime resources | Enumerates fonts, themes, keymaps, actions, commands, plugins, and protocols without leaking a runtime assumption.                                                                         |
| `bitty inspect`    | mixed                       | same as above                                     | User-facing explanation of effective state and ownership.                                                                                                                                  |
| `bitty dev`        | mixed                       | no for local captures; yes for runtime traces     | Tracing, captures, dumps, and overlays; deferred rendering overlays remain explicitly deferred per [Command-line interface](../interfaces/cli.md).                                         |
| `bitty doctor`     | local                       | no                                                | Stable recovery and diagnostics entry point; must work in safe mode.                                                                                                                       |
| `bitty cmd`        | mixed                       | depends on target executable                      | Direct qualified executable invocation for automation and diagnostics.                                                                                                                     |
| `bitty x`          | extension                   | depends on plugin command class                   | Collision-free plugin entry point; mandatory for every plugin command.                                                                                                                     |
| `bitty completion` | local                       | no                                                | Emits completion scripts for Bash, Zsh, Fish, PowerShell, and Nushell from static manifests.                                                                                               |
| `bitty version`    | local                       | no                                                | Machine-readable version, channel, and build metadata.                                                                                                                                     |

Starting a terminal and controlling an existing instance remain visibly
different operations: `bitty run` spawns, `bitty ctl` connects. No alias merges
them.

### Stability promise for the top level

- **Stable for v1:** the exact token set above, their class, and their help
  placement (core commands before `Extensions` before deferred).
- **Additions require an RFC.** A new top-level token, a new subtree, or a
  promotion of a plugin alias to the top level requires an accepted RFC
  revision with a dated transition.
- **Deletions or renames require a deprecation period** of at least one minor
  version with both spellings available and a diagnostic on the old spelling.
- **Built-ins are reserved.** No plugin may override a v1 top-level token. A
  manifest that claims a conflicting name is a package validation error before
  install.

## Executable registry and schemas

### One registry, many frontends

```text
                         Executable Registry (typed, versioned)
                                     |
          +-----------+-----------+-----------+-----------+-----------+
          |           |           |           |           |           |
         GUI         CLI         Lua         IPC         MCP       DevTools
          |           |           |           |           |           |
          +-----------+-----------+-----------+-----------+-----------+
                                     |
                              Runtime services
```

An operation invoked via `bitty ctl view split --right`, via a key binding that
resolves to `core.view.split { direction: "right" }`, via Lua
`bitty.view.split({ direction = "right" })`, or via IPC `view.split` carries
the same executable id, capability check, argument bounds, and error class. The
CLI never duplicates validation or business logic.

### Action and command distinction

| Kind    | Has typed argument and result   | Produces stdout                | Typical capability                      | Example executable    |
| ------- | ------------------------------- | ------------------------------ | --------------------------------------- | --------------------- |
| Action  | no (or empty); bound to context | no; UI effect only             | none or narrow view scope               | `core.clipboard.copy` |
| Command | yes; schema-validated           | yes; result in output envelope | inspect, input, manage, modify families | `core.terminal.text`  |

Both kinds share one registry. The distinction is metadata on the entry (its
schema, output kind, and scope), not a second registry.

### Registry entry shape

Every registry entry is an owned, versioned record that is auditable without
running the implementation:

| Field           | Type and bounds                                                       | Meaning                                                                            |
| --------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `id`            | dot-separated `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`, 3 to 128 bytes | Stable identifier. Core prefix is `core.`; plugin prefix is `<publisher>.<name>.`. |
| `kind`          | enum `action` or `command`                                            | Whether the entry has typed argument and result schemas.                           |
| `class`         | enum `local`, `runtime`, or `extension`                               | Whether it needs an instance or an installed plugin.                               |
| `scopes`        | array of defined scopes from [IPC and Agent RFC](ipc-agent-rfc.md)    | Required scopes, empty for local unauthenticated entries.                          |
| `args_schema`   | bounded JSON Schema, depth at most 16                                 | Typed input shape; string fields bound individually.                               |
| `result_schema` | bounded JSON Schema or null for actions                               | Typed output shape for `--format json`.                                            |
| `error_classes` | subset of the stable error taxonomy                                   | Which error classes the entry may return.                                          |
| `introduced_in` | semver string                                                         | First version that contains the entry.                                             |
| `deprecated`    | null or object with `since` and `successor`                           | Deprecation metadata when applicable.                                              |

The registry is the source for `bitty list commands`, `bitty inspect command`,
`--help` generation, completion, and IPC dispatch. Generators must not hand-edit
any of those surfaces to diverge from the registry.

### Error taxonomy shared with the wire

The CLI reuses the stable error taxonomy owned alongside the wire protocol
([IPC and Agent RFC](ipc-agent-rfc.md)): `InvalidArgument`, `InvalidFrame`,
`PayloadTooLarge`, `MethodInvalid`, `VersionMismatch`, `Unauthenticated`,
`Denied` (with `ScopeViolation`, `RateLimited`, `PayloadCap`, `ChunkViolation`),
`Timeout`, `NotFound`, `Conflict`, `Unavailable`, `Internal`, plus
CLI-local `UsageError` and `ConfigError` where the failure occurs before any
IPC call. Errors never carry stack traces or OS handles.

## Dynamic namespace and aliases

### The collision-free qualified route

Every plugin command is addressable without alias or help regeneration:

```sh
bitty x <publisher>.<name> <command> [args]
bitty x xuepoo.markdown render README.md
bitty cmd xuepoo.markdown:render --file README.md
```

`bitty x` is the candidate spelling from
[Command-line interface](../interfaces/cli.md) that this RFC proposes as stable
for v1; `bitty cmd` with a colon-qualified identifier is the escape hatch for
generators that emit registry ids verbatim. Both are stable v1 spellings and
remain available even when a short alias or top-level alias exists.

A plugin may declare multiple commands; each command is a separate registry
entry under the same plugin prefix. The CLI validates qualified ids against the
same rule as the wire (`<= 128` bytes, segments matching `^[a-z][a-z0-9_]*$`
separated by `.`, no whitespace or control bytes). Invalid ids are rejected
before dispatch, mirroring the host method-name discipline.

### Short alias under `bitty x`

When exactly one installed plugin claims the short name `<name>` and its static
manifest declares `aliases: ["<name>"]`, the unqualified short form is also
wired:

```sh
bitty x markdown render README.md
```

Manifest rules for the short alias:

- At most one alias per plugin entry; the value must equal the plugin short
  name or a declared command alias, not an arbitrary string.
- Two plugins that claim the same alias produce a startup diagnostic and both
  aliases are disabled until the user disambiguates.
- The fully qualified `bitty x <publisher>.<name>` route remains wired and
  documented even when the short alias is active.
- Alias discovery uses only the static package manifest; no plugin VM is loaded
  to compute completion or help.

### Optional top-level alias

A top-level convenience alias `bitty <name>` may exist only when all of the
following hold:

1. The command is `class: extension` and the manifest declares
   `top_level_alias: true` for exactly one command.
2. No core built-in occupies that token (core tokens are reserved; see
   top-level tree above).
3. Exactly one installed plugin currently claims that token. Two claimants
   produce a `bitty doctor` and `bitty list commands` diagnostic; the qualified
   `bitty x` route plus `bitty cmd` remain available and no last-installed
   winner is elected.
4. The alias is visible in `bitty --help` under a distinct `Extensions`
   section, not interleaved with core commands, so users can distinguish core
   and third-party behavior.

The top-level alias is the only part of the dynamic namespace that is optional
for the product; the qualified `bitty x` route and `bitty cmd` are not. If the
product later decides top-level aliases are too collision-prone, withdrawing
the feature is a single RFC revision rather than a compatibility break because
the qualified route preserves every plugin operation.

### Static discovery without VM load

Plugin help and completion are read from static manifest metadata without
loading the plugin VM. `bitty --help`, `bitty list commands`, and
`bitty completion <shell>` reflect the installed manifest set, not the set of
loaded Lua VMs. Starting the CLI never loads every plugin runtime; this matches
the completion contract in [Command-line interface](../interfaces/cli.md) and
the lazy-load principle in [Isolation and Resource RFC](isolation-resource-rfc.md).

### Help generation rules for the dynamic namespace

- `bitty --help` lists core commands first, then an `Extensions` section that
  enumerates active top-level aliases, then the `bitty x` qualified summary.
- `bitty x --help` enumerates every installed plugin, its qualified id, its
  short alias status, and the commands it provides.
- `bitty x <publisher>.<name> --help` and `bitty x <name> --help` forward to
  that plugin's command help derived from its `args_schema`.
- A plugin that declares an alias but is not uniquely claimable shows a
  diagnostic in all three help paths rather than silently hiding.

## Command details by subtree

### `bitty run` (local)

```sh
bitty run [OPTIONS] -- COMMAND...
```

Options: `--cwd <path>`, `--env KEY=VALUE` (repeatable, bounded), `--title <string>`.
`--` is required before `COMMAND` and Bitty never falls back to interpreting
`bitty htop` as a child. Shell integration follows
[Command-line interface](../interfaces/cli.md) instance and environment
candidate: the child environment may receive the advisory identifiers
`BITTY_INSTANCE_ID`, `BITTY_TERMINAL_ID`, `BITTY_VIEW_ID`, `BITTY_SOCKET`, plus
the stable indicators `TERM=bitty`, `BITTY=1`, `BITTY_VERSION=<semver>`. No
credential is placed in that environment; authorization always remains
server-side per [IPC and Agent RFC](ipc-agent-rfc.md).

### `bitty ctl` (runtime)

```sh
bitty ctl [--socket <path>] [--instance <id>] <resource> <verb> [args]
bitty ctl instance list
bitty ctl window list
bitty ctl view list --format json
bitty ctl terminal list --format jsonl
bitty ctl terminal spawn [--cwd <path>]
bitty ctl terminal close t:3
bitty ctl terminal send t:1 "cargo test"
bitty ctl terminal text t:1 --format json
bitty ctl view split --right
bitty ctl view focus v:3
bitty ctl config reload
```

Every `ctl` verb maps one-to-one to a registry executable (for example
`bitty ctl view split` maps to `core.view.split`). Arguments are validated
against the executable's `args_schema` before any IPC frame is sent. Instance
selection precedence is exactly the one owned by
[IPC and Agent RFC](ipc-agent-rfc.md): explicit `--socket`, then `--instance`,
then inherited `BITTY_SOCKET` or `BITTY_INSTANCE_ID`, then exactly-one-live
fallback, otherwise ambiguity error. Ambiguity never silently selects an
unrelated instance.

### `bitty config` (local with one runtime verb)

```sh
bitty config path
bitty config check
bitty config show [--source]
bitty config diff
bitty config defaults
bitty config reload   # runtime: requires authenticated instance and config.modify scope
```

`config check` evaluates configuration in a fresh configuration VM, produces and
validates a typed plan, and avoids creating a GUI. `config show --source`
explains which layer and file provided each value. `config path` is local path
resolution, not a proxy to the runtime.

### `bitty plugin` and `bitty list` and `bitty inspect`

```sh
bitty plugin list --format json
bitty plugin install <source>
bitty plugin disable <publisher>.<name>

bitty list fonts
bitty list themes
bitty list keymaps
bitty list actions
bitty list commands
bitty list plugins
bitty list protocols

bitty inspect command core.terminal.text
bitty inspect command xuepoo.markdown:render
bitty inspect key ctrl+shift+m
bitty inspect plugin xuepoo.markdown
bitty inspect config font.size
bitty inspect protocol kitty-graphics
```

`list` enumerates resources; `inspect` explains effective state and ownership.
`list commands` and `inspect command` read from the registry, not from a
hand-maintained table. No variant requires loading a plugin VM.

### `bitty dev` (mixed)

`bitty dev` contains lower-level diagnostics such as VT, PTY, render, and plugin
traces, deterministic recordings and replay markers, grid, scene, and atlas
dumps, performance capture, and renderer overlays. Tracing and overlays depend
on the core-owned instrumentation that [DevTools RFC](devtools-rfc.md) proposes;
that RFC remains the source for instrumentation scopes and not this one.

### `bitty doctor`, `bitty completion`, `bitty version`

`bitty doctor` covers platform, GPU, fonts, PTY and ConPTY, terminfo, shell
integration, configuration, plugins, dependency and key conflicts, renderer
state, and supported image protocols. It offers `--format json` for automation
and must work in safe mode.

`bitty completion <shell>` emits completion for Bash, Zsh, Fish, PowerShell, and
Nushell. Dynamic plugin completion is derived from static manifest metadata and
regenerates when the installed plugin set changes, without starting any plugin
runtime.

`bitty version` emits `bitty <semver> (<channel> <commit>)` on stdout and the
same fields in `--format json`.

### `bitty cmd` escape hatch

`bitty cmd <qualified-id> [--format json] [-- <args-json>]` invokes any
registry executable directly:

```sh
bitty cmd core.terminal.text --format json -- '{"terminal_id": "t:4"}'
```

It validates the qualified id against the registry, checks scopes, and returns
the output envelope and exit code exactly as the sugar form would. It exists
for generators and for diagnostics that want to name the executable explicitly.

## Output contract

### Streams and corruption rule

Standard output carries the requested result; standard error carries
diagnostics and logs. Informational logging never corrupts JSON or JSONL on
standard output. A command that would otherwise write human progress to stdout
must write it to stderr when `--format json` or `--format jsonl` is active.

### Formats

| Format           | Stable for v1        | Intended consumer    | Notes                                                                  |
| ---------------- | -------------------- | -------------------- | ---------------------------------------------------------------------- |
| `--format table` | yes, as human output | interactive user     | Not a machine contract; column layout may change across minors.        |
| `--format json`  | yes, versioned       | automation           | One JSON value on stdout per invocation, envelope below.               |
| `--format jsonl` | yes, versioned       | streaming automation | One JSON value per line, envelope per line, unbounded streams chunked. |

Every query-like command supports all three; commands that produce no result
produce empty `result: null` and are meaningful only for exit-code branching.

### Envelope version 1

```jsonc
// --format json, success
{
  "v": 1,
  "command": "core.terminal.text",
  "ok": true,
  "result": { "text": "..." }
}

// --format json, failure
{
  "v": 1,
  "command": "core.terminal.text",
  "ok": false,
  "error": { "class": "Denied", "code": "ScopeViolation", "message": "..." }
}

// --format jsonl, streaming (subset of IPC chunking, adapted for CLI)
{
  "v": 1,
  "command": "core.terminal.text",
  "chunk": { "seq": 0, "total": 3, "bytes": "<base64, <=256 KiB decoded>" },
  "final": false
}
```

Rules:

- `v` is `1` in this RFC. Unknown versions in output are never produced; a
  consumer that sends an explicit `v` that the binary does not understand
  receives a typed `VersionMismatch` error rather than partial parse.
- `command` is the registry id that was dispatched.
- `error.class` is one value from the stable taxonomy; `error.code` is the
  short code within that class (for example `ScopeViolation` under `Denied`).
  `error.message` is the user-facing string suitable for stderr plus the same
  string under `error.message` in the JSON for automation.
- JSON output is bounded: a truncated frame decoded to more than 256 KiB ends
  the stream with a `PayloadTooLarge` error rather than buffering unbounded.
- Depth of the parsed JSON value is capped at 32 to prevent stack exhaustion,
  matching the wire rule in [IPC and Agent RFC](ipc-agent-rfc.md).

Versioning of the envelope is independent of the wire version, but the two
share the rule that a version bump remains backward-readable for at least one
major Bitty version; the binary advertises its output version in
`bitty version --format json` and in `bitty doctor --format json`.

## Global options and argument grammar

### Global options

| Option                        | Stable for v1 | Meaning                                                                                    |
| ----------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| `--help`, `-h`                | yes           | Usage for the current node; never requires an instance or a VM.                            |
| `--version`, `-V`             | yes           | Alias for `bitty version`.                                                                 |
| `--format {table,json,jsonl}` | yes           | Output shape; ignored for commands with no result.                                         |
| `--socket <path>`             | yes           | Explicit IPC socket; bypasses discovery. Fails closed when the path does not authenticate. |
| `--instance <id>`             | yes           | Explicit instance; resolved via the discovery file.                                        |
| `--verbose`                   | yes           | Increase stderr diagnostics verbosity; never reshapes stdout JSON.                         |
| `--quiet`                     | yes           | Suppress non-essential stderr; never suppress errors that explain exit codes.              |
| `--no-color`                  | yes           | Disable ANSI coloring for table output.                                                    |

Global options may appear before the subcommand (`bitty --format json ctl ...`)
or after it (`bitty ctl --format json ...`); the latter scopes to the
subcommand when both appear, and conflict is a `UsageError` (exit 2).

### Child and pass-through separators

`bitty run` requires `--` before `COMMAND...`. `bitty cmd` uses `--` before a
raw JSON argument blob; all other commands reject `--` as a `UsageError` so that
stray separators are not silently ignored.

### Validation and diagnostics

- Unknown flags, unknown subcommands, and missing required arguments are
  `UsageError` (exit 2) with a diagnostic that names the closest valid token
  via `bitty --help` suggestion.
- Typed argument failures name the failing JSON Schema path
  (for example `args.terminal_id: expected string matching ^t:[0-9]+$`).
- Pass-through arguments are never interpreted as Bitty flags, matching the
  candidate guarantee in [Command-line interface](../interfaces/cli.md).

## Aliases and completion

### Stable alias set for v1

| Alias        | Canonical          | Stable for v1 |
| ------------ | ------------------ | ------------- |
| `bitty ls`   | `bitty list`       | yes           |
| `bitty cfg`  | `bitty config`     | yes           |
| `bitty comp` | `bitty completion` | yes           |

The alias set is intentionally small. Each alias wires to the same executable
and produces identical `--help` and output envelope apart from the `command`
field naming the alias spelling that was invoked. No alias merges disjoint
trees and no alias renames a core token.

### Alias rules

- **No alias shadows a built-in.** `bitty plugin` and `bitty x markdown` can
  coexist; `bitty x` itself is reserved and never aliasable.
- **No alias adds authority.** Invoking `bitty ls` never bypasses scope checks;
  an alias carries the same scope as its canonical spelling.
- **Completion for aliases** emits the canonical spelling as the insertion;
  alias and canonical completions share one generator over the registry and
  manifest set.
- **Future aliases require an RFC.** Adding a convenience alias such as
  `bitty i` requires an RFC revision; removing one requires a deprecation
  period with both spellings and a diagnostic on the old spelling.

### Completion generation

Shell completion targets Bash, Zsh, Fish, PowerShell, and Nushell. The generator
owns:

- core tokens and their typed flags from the registry;
- `bitty x` plugin subtrees from static manifest metadata;
- top-level alias expansion when the manifest uniquely claims a name;
- file and resource completions declared as bounded enumerations in the schema
  (for example `bitty list protocols` completes from the registry enumeration).

The completion script is regenerated when the installed plugin set changes, not
when a plugin VM starts. Packages do not provide executable completion hooks.

## Exit codes for v1

Status: **accepted stable for v1** on 2026-08-28. These codes are the v1
compatibility promise; platforms map platform-specific failures into them but no
new code is introduced without an RFC revision.

| Code | Name                       | When it is produced                                                                                                                                          |
| ---- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0    | success                    | The requested operation succeeded.                                                                                                                           |
| 1    | generic error              | Unclassified runtime failure after parsing and scope checks.                                                                                                 |
| 2    | usage error                | Unknown flag, unknown subcommand, missing required argument, stray `--`, or schema validation before dispatch.                                               |
| 3    | configuration error        | `config check` or `config show` failure, malformed or unresolvable configuration, typed plan validation failure (a fresh configuration VM was used).         |
| 4    | plugin error               | Plugin-level failure: manifest validation, lifecycle activation failure, handler violation, or extension command failure that isolates to one plugin.        |
| 5    | compatibility error        | Terminfo, VT, protocol, or version mismatch where the CLI or wire declares `VersionMismatch`.                                                                |
| 6    | IPC or runtime unavailable | No instance, ambiguous instance, socket unavailable, framing or wire failure, or rate-limit shed (the instance did not authorize or complete the operation). |
| 7    | permission denied          | `Unauthenticated` or `Denied/ScopeViolation` from server-side scope evaluation; covers both CLI and IPC scopes.                                              |
| 8    | conflict                   | Alias collision, resource already exists, or `Conflict` from concurrent mutation.                                                                            |

Notes:

- Platform-specific failures (for example `errno` on Unix or pipe ACL on
  Windows) never invent a new code; they map to the stable set above and the
  `error.message` carries the platform detail.
- IPC error classes map deterministically: `Denied/ScopeViolation` and
  `Unauthenticated` map to 7, `Denied/PayloadCap` and `PayloadTooLarge` map to
  6 when the server shed the operation, `Denied/RateLimited` maps to 6,
  `NotFound` maps to 1 or 2 depending on whether the token was an argument
  (6) or a CLI flag (2), `Conflict` maps to 8, `Timeout` and `Unavailable`
  map to 6, `VersionMismatch` maps to 5, `InvalidArgument` before IPC maps to
  2 and after IPC maps to 1.
- Extension commands that fail return 4 unless the failure isolates to IPC
  availability (6) or permission (7); a plugin that returns an untyped code
  never bypasses this mapping.
- `bitty doctor` returns 0 when every diagnostic passes, 1 when at least one
  diagnostic fails but the host remains recoverable, and the strongest
  category code (3, 4, 5, 6, 7, 8) when a category-specific gate fails closed.

Exit-code stability is part of the machine contract alongside `--format json`.
A script that branches on `bitty ctl terminal text --format json` may rely on
both the envelope `error.class` and the process exit code across minor
versions; either changing requires an RFC revision with a dated transition.

## Instance targeting and environment (CLI surface)

The wire and authentication decisions in this section are owned by
[IPC and Agent RFC](ipc-agent-rfc.md) and are not re-decided here. The CLI
surface guarantees that:

- Explicit `--socket <path>` bypasses all discovery and fails closed when the
  path does not authenticate to the caller's UID or current-user ACL.
- Explicit `--instance <id>` resolves via the discovery file and fails closed
  with a typed error that lists candidates when ambiguous or missing.
- Inherited `BITTY_SOCKET` or `BITTY_INSTANCE_ID` from a shell launched inside
  Bitty is advisory and wins only when the socket still exists and authenticates
  to the same UID; a forged variable without socket ownership never elevates.
- When no explicit target is supplied, current-terminal context takes
  precedence, followed by the exactly-one-live-instance shortcut; otherwise the
  CLI fails closed with an ambiguity error and suggests
  `bitty ctl instance list`.
- The candidate environment variables `TERM=bitty`, `BITTY=1`,
  `BITTY_VERSION=<semver>`, `BITTY_INSTANCE_ID=i:<id>`,
  `BITTY_TERMINAL_ID=t:<id>`, `BITTY_VIEW_ID=v:<id>`, and
  `BITTY_SOCKET=<path>` from
  [Command-line interface](../interfaces/cli.md) remain **illustrative and not
  stable for v1** except for the three that are already stable by necessity:
  `TERM`, `BITTY`, and `BITTY_VERSION`. Stabilizing any additional variable
  requires its own security review and RFC revision per the
  [Threat Model](../security/threat-model.md) remote and environment handling.

No credential or administrator token is ever placed in that environment;
durable grants follow the consent ledger owned by
[IPC and Agent RFC](ipc-agent-rfc.md).

## Help, versioning, and compatibility

- `--help` for any node prints the registry sentence, the typed flag table
  derived from `args_schema`, the required scope where applicable, examples,
  and the `Extensions` section when aliases exist. Help output is not a machine
  contract.
- `bitty version` and `bitty version --format json` are stable. The semver in
  `BITTY_VERSION` must match `bitty version`.
- Wire version, CLI output envelope version, and CLI command stability are
  versioned independently. A wire bump does not implicitly change the CLI tree
  and vice versa.
- Backward compatibility for v1: a CLI invocation that succeeded on v1.0 must
  either succeed with the same semantics on every v1 minor or fail closed with
  a stable `UsageError` or `VersionMismatch` that was documented at introduction
  time. Silent semantic changes are not allowed.
- A deprecated command spelling remains available for at least one minor with
  both spellings wired and a diagnostic on the old spelling; removal is
  documented in the migration notes and in `bitty doctor` when an installed
  plugin still references the old spelling.

Switching the default `--format` would be treated as a breaking change for
presentational purposes: there is no implicit default change without an RFC;
`--format table` remains the interactive default and JSON remains opt-in.

## Security considerations

- **No ambient authority in the envelope.** A CLI invocation never injects a
  scope inside the request payload; scopes are evaluated server-side on every
  request as owned by [IPC and Agent RFC](ipc-agent-rfc.md).
- **Terminal output remains observation data.** `bitty ctl terminal text`
  produces untrusted text; CLI help and the `doctor` stream label it as such
  and never treat it as instruction text (T-10 and R-013 parity).
- **Bounded parsing.** Every CLI parser input is bounded: argument strings,
  option values, manifest-derived command lists, and completion generation all
  have length, count, and depth ceilings (T-01 parity). Oversized inputs fail
  closed with `PayloadTooLarge` (exit 6) or `UsageError` (exit 2) depending on
  whether the excess reached the transport.
- **Redaction.** Machine output that would expose environment bytes, clipboard
  bytes, or full scrollback truncates by default and follows the typed redaction
  rules from P0-AC-026; opt-in raw capture belongs behind an explicit scope and
  a separate artifact file, not a default `bitty list` dump.
- **Safe mode.** `bitty --help`, `bitty version`, `bitty config check`,
  `bitty plugin list`, `bitty doctor`, `bitty list commands`, and
  `bitty list plugins` must work in safe mode (no third-party plugins loaded).
  `bitty doctor` explicitly reports that it ran in safe mode when that path was
  taken.
- **Supply chain.** `bitty plugin install` follows the transactional activation
  and lockfile rules in [Package Lifecycle RFC](package-lifecycle-rfc.md); the
  CLI never executes package code at install time.

## Verification

Every contract row requires automation; no manual-only gate closes it.

| Gate                             | What it checks                                                                                                                                                                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry conformance suite       | Every executable in the registry round-trips through CLI, IPC, and Lua claim tests: valid args succeed, invalid args are rejected with the declared `UsageError` or typed error, and result shapes validate against `result_schema`.                                  |
| CLI grammar suite                | `bitty run -- htop` never means something else; unknown flags and stray `--` are `UsageError` (2); `--help` never requires an instance; `bitty x` qualified, short, and top-level aliases wire correctly or emit a diagnostic and refuse silently-ambiguous dispatch. |
| Output envelope suite            | `--format json` and `--format jsonl` produce exactly the v1 envelope; stdout never contains interleaved logs; oversized payloads are `PayloadTooLarge` with a 0-byte stdout JSON envelope, not truncation.                                                            |
| Alias and collision suite        | Two plugins claiming the same alias produce a `doctor` and `list commands` diagnostic and both aliases are disabled; the qualified route and `bitty cmd` remain available; installing or removing a plugin updates `bitty completion` without loading any VM.         |
| Exit-code suite                  | Platform-specific failures map to the stable 0 through 8 set and match the IPC error-class mapping; `bitty doctor` category codes match the underlying diagnostic class.                                                                                              |
| Instance-targeting suite         | Precedence `--socket` then `--instance` then inherited context then exactly-one shortcut then ambiguity, never silent selection of an unrelated instance (shares fixtures with [IPC and Agent RFC](ipc-agent-rfc.md)).                                                |
| Safe-mode and redaction suite    | `doctor`, `config check`, `list`, and `inspect` variants produce the safe-mode banner and truncated, redacted previews under P0-AC-026.                                                                                                                               |
| Negative and bounded-input suite | Oversized arguments, manifest injections, depth-32 overflow, and malformed qualified ids fail closed before dispatch with a typed error.                                                                                                                              |

## Deferred candidates

- **Interactive `bitty shell` REPL** that exposes the registry as a
  remote-control loop. Useful for diagnostics and scripting but not an initial
  contract per [Command-line interface](../interfaces/cli.md).
- **Renderer overlays** (damage, cells, glyphs, images, layout) as CLI
  frontends. They depend on renderer architecture and are deferred per that gate.
- **Additional `BITTY_*` advisory variables** beyond `BITTY`,
  `BITTY_VERSION`, and `TERM` . The `BITTY_INSTANCE_ID`, `BITTY_TERMINAL_ID`,
  `BITTY_VIEW_ID`, and `BITTY_SOCKET` variables are explicitly not stabilized
  in v1 and require a follow-up RFC with the security review from
  [IPC and Agent RFC](ipc-agent-rfc.md) before they become public protocol.

## Risks and open choices

| Risk                         | Effect if unresolved                                                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top-level namespace pressure | Keeping the v1 top level small prevents collision and keeps help scannable; pressure to add convenience top-level verbs belongs behind an RFC, not a quick patch.                |
| Alias collision UX           | Disabling both aliases under collision avoids last-wins surprise but may surprise users who installed two similar plugins; the diagnostic must name both providers.              |
| Output version drift         | Envelope v1 is stable; any field addition is additive and documented, any rename is a version bump with backward reading.                                                        |
| `BITTY_*` stabilization      | Stabilizing advisory identifiers before their security review would leak a credential-shaped API; v1 keeps them explicit and non-contractual beyond the three stable indicators. |

## Acceptance criteria

This RFC is accepted on 2026-08-28 and closes [OQ-017](../decisions/open-questions.md). The following criteria were satisfied per the [open-question register](../decisions/open-questions.md) rules:

1. The prose and every identifier in the OQ-017 row of [open-questions.md](../decisions/open-questions.md) have independent category-owner, docs-curator, and security-reviewer sign-off, including the top-level command tree, `bitty x` qualified route, single registry with action/output schemas, alias and completion rules, and exit codes 0 through 8 stability.
2. Affected documents were synchronized in the same change: this RFC is `accepted` frontmatter and [CLI](../interfaces/cli.md), [Decision Register](../decisions/index.md), [Specifications](../specifications/README.md), [P0 review checklist](../reviews/p0-review-checklist.md), and [README](../README.md) reference the accepted contract rather than the draft; [open-questions.md](../decisions/open-questions.md) moves OQ-017 from `Draft` to `Accepted` per its close rule.
3. No element weakens a normative P0 gate; any discovered conflict returns the conflicting clause to revision rather than downgrading the gate.
4. Verification gates have at least one headless conformance harness per section (registry, CLI grammar, envelope, alias/collision, exit codes, instance targeting, safe-mode/redaction, bounded-input) with deterministic evidence, mirroring the harness style in `bitty-plugin-host` and `bitty-lua`.

## P0 Review Sign-off

> P0 review per CTX-0070 tracks acceptance of OQ-017 via this RFC. Frontmatter is `accepted` and [open-questions.md](../decisions/open-questions.md) is updated per its close rule. This section records passing sign-off and closes OQ-017.

| Role                          | Reviewer           | Verdict | Evidence / scope                                                                                                                                             | Date       |
| ----------------------------- | ------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| security-auditor              | `bitty-security`   | pass    | R-011, R-012, R-014, T-01, T-09, P0-AC-001/021/022/023/026, bounded parsing 256 KiB depth 32, alias collision, `bitty x` qualified route                     | 2026-08-28 |
| category-owner (interfaces)   | `bitty-architect`  | pass    | top-level tree 13 subtrees, single registry action/output schemas, `bitty x` qualified/short/top-level alias, envelope v1, exit codes 0-8                    | 2026-08-28 |
| category-owner (architecture) | `bitty-experience` | pass    | registry ownership, completion generation, instance-targeting precedence `--socket`/`--instance`/inherited/ambiguity, safe-mode/redaction                    | 2026-08-28 |
| docs-curator                  | `bitty-curator`    | pass    | Frontmatter `accepted`, taxonomy, links to [CLI](../interfaces/cli.md) and [Threat Model](../security/threat-model.md), English-only, decision-register sync | 2026-08-28 |

As of 2026-08-28, the CLI contract remains a design contract per [ADR 0003](../decisions/adrs/ADR-0003-core-workspace-topology.md) and the [Proposed Delivery Sequence](../product/proposed-delivery-sequence.md); crate presence does not imply shipped behavior.

## References

- [Command-line interface](../interfaces/cli.md) — candidate gateway and per-subtree context this RFC concretizes.
- [IPC and Agent RFC](ipc-agent-rfc.md) — bounded framing, wire, auth, scopes (including RC-9 and RC-10), and Agent bounded-message contracts that `bitty ctl` rides.
- [Plugin Platform RFC](plugin-platform-rfc.md) — executable and capability families, manifest and lifecycle generations that the dynamic namespace consumes.
- [Package Lifecycle RFC](package-lifecycle-rfc.md) — package install, lockfile, transactional activation, and rollback that `bitty plugin` drives.
- [DevTools RFC](devtools-rfc.md) — instrumentation and debug scopes that `bitty dev` will surface once accepted.
- [Security Overview](../security/overview.md), [Threat Model](../security/threat-model.md), [Security Risk Register](../security/risk-register.md), and [P0 Security Acceptance Criteria](../security/p0-acceptance-criteria.md) — normative gates for every boundary, parser, and trace in this document.
- [Documentation Workflow](../development/documentation-workflow.md) — lifecycle rule that draft text does not authorize shipped behavior and that acceptance requires independent review.
