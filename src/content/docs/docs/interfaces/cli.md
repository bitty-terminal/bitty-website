---
title: Command-line interface
description: Pre-implementation reference for the extensible CLI, runtime control, output, and introspection contracts
category: reference
audience: user
document_type: reference
status: draft
website_publish: true
sidebar_order: 10
---

# Command-line interface

> Status: pre-implementation architecture. An extensible, first-class CLI is an
> accepted working direction. The shared executable registry, command tree,
> identifiers, environment variables, output schemas, and exit codes are
> candidate contracts until separately specified.

The Bitty CLI is a formal frontend to the same capabilities used by GUI
actions, key bindings, Lua, IPC, developer tools, and agent adapters. It must
not become a second implementation of runtime behavior hidden inside argument
parsing.

IPC authentication, client scope, and untrusted terminal-output requirements
are normative in the [security overview](../security/overview.md) and
[threat model](../security/threat-model.md).

## Candidate direction: one executable registry, many frontends

```text
                         Executable Registry
                                  |
          +-----------+-----------+-----------+-----------+
          |           |           |           |           |
         GUI         CLI         Lua         IPC         MCP
          |           |           |           |           |
          +-----------+-----------+-----------+-----------+
                                  |
                           Runtime services
```

A CLI request such as a view split should resolve to the same owned executable
that a key binding or Lua invocation uses:

```text
bitty ctl view split --right
  -> command core.view.split { direction: "right" }
  -> IPC
  -> runtime ViewManager
```

The CLI adapter owns parsing, target selection, serialization, and display. The
runtime service owns the operation.

## Action and command distinction

Status: **candidate contract.**

- An **action** is a fast contextual user operation such as copy, paste, font
  increase, or view split. It is suitable for key binding and may not produce
  standard output.
- A **command** has structured arguments and a structured result, can fail, and
  is suitable for automation.

Both may use one lower-level executable registry. The naming distinction keeps
runtime interactions and machine-oriented queries clear without creating
independent business logic.

## Command classes

Status: **candidate contract.**

Bitty needs three classes of CLI operation:

- **Local:** requires no running instance; examples include version, doctor,
  config validation, and package management.
- **Runtime:** connects to an instance; examples include listing terminals,
  splitting a view, sending input, and reloading configuration.
- **Extension:** declared by a plugin; examples include Markdown rendering,
  sessions, and SSH workflows.

Starting a terminal and controlling an existing instance must remain visibly
different operations.

## Candidate top-level grammar

```text
bitty
├── run
├── ctl
├── config
├── plugin
├── list
├── inspect
├── dev
├── doctor
├── cmd
├── x
├── completion
└── version
```

This tree is a candidate namespace, not shipped CLI. Its intent is to keep the
top level small and stable:

- `bitty` opens the terminal with the default shell.
- `bitty run [OPTIONS] -- COMMAND...` starts a child program.
- `bitty ctl` controls a running instance.
- `bitty config` locates, validates, and explains configuration.
- `bitty plugin` manages plugin packages.
- `bitty list` enumerates resources.
- `bitty inspect` exposes user-facing state and ownership.
- `bitty dev` contains developer tracing, captures, dumps, and overlays.
- `bitty doctor` diagnoses the installation and compatibility.
- `bitty cmd` invokes a qualified executable directly.
- `bitty x` is the candidate spelling for a collision-free plugin command
  namespace.

`--` unambiguously separates Bitty arguments from the child process. Bitty
should avoid interpreting `bitty htop` as a child program because it conflicts
with a growing command ecosystem; prefer `bitty run -- htop`.

## Runtime control

Status: **candidate contract.**

```sh
bitty ctl instance list
bitty ctl window list
bitty ctl view list
bitty ctl terminal list --format json

bitty ctl terminal spawn
bitty ctl terminal close t:3
bitty ctl terminal send t:1 "cargo test"
bitty ctl terminal text t:1

bitty ctl view split --right
bitty ctl view focus v:3
bitty ctl config reload
```

Runtime control should travel over a versioned IPC protocol and share the
capability model used by agents and plugins. Reading terminal text, sending
input, closing a terminal, modifying configuration, and managing views are not
equivalent permissions.

IPC is current-user-local by default. Agent and MCP clients begin read-only;
terminal output is untrusted observation data and never an instruction source.

Candidate capability groups include:

```text
terminal.inspect  terminal.input  terminal.manage
view.inspect      view.manage
config.inspect    config.modify
```

The exact names and authorization flow are open.

## Instance targeting and environment

Status: **candidate contract.**

Explicit target selection should be possible:

```sh
bitty ctl --instance <id> ...
bitty ctl --socket <path> ...
```

A shell launched inside Bitty may receive contextual variables such as:

```text
TERM=bitty
BITTY=1
BITTY_VERSION=0.3.0
BITTY_INSTANCE_ID=i:1
BITTY_TERMINAL_ID=t:4
BITTY_VIEW_ID=v:8
BITTY_SOCKET=...
```

Every name and value above is illustrative. Socket disclosure, inheritance,
remote sessions, nested terminals, spoofing, and permission checks need a
security specification before these variables become public protocol.

If no explicit target is supplied, current-terminal context may take
precedence, followed by an unambiguous focused/default instance. Ambiguity must
be reported rather than silently selecting an unrelated instance.

## Extension commands

Status: **accepted direction.**

Plugins must not pollute or override the core namespace. A collision-free route
qualified by plugin identity must remain available even if a short alias
conflicts. The exact command tokens for that route remain undecided.

Status: **candidate grammar example.**

```sh
bitty x xuepoo.markdown render README.md
```

Status: **candidate contract.**

```sh
# Optional manifest-derived short form.
bitty x markdown render README.md

# Optional top-level alias, if the product keeps this feature.
bitty markdown render README.md
```

Built-ins are reserved. Two plugins claiming the same alias create a diagnostic
and require the qualified ID or explicit user selection. In this candidate
grammar, the fully qualified route uses `bitty x`. There is no last-installed or
last-loaded winner.

Plugin help and completion are read from static manifest metadata without
loading the plugin VM. `bitty --help` should place optional aliases under an
`Extensions` section so users can distinguish core and third-party behavior.

Package lifecycle and external executable extensions are covered in
[Package management](../extensibility/package-management.md).

## Introspection

Status: **candidate contract.**

Configuration, actions, commands, plugins, and protocols should be inspectable
instead of requiring source-code lookup. Candidate operations include:

```sh
bitty list fonts
bitty list themes
bitty list keymaps
bitty list actions
bitty list commands
bitty list plugins
bitty list protocols

bitty inspect command xuepoo.markdown:render
bitty inspect key ctrl+shift+m
bitty inspect plugin xuepoo.markdown
bitty inspect config font.size
bitty inspect protocol kitty-graphics
```

`inspect` is user-facing explanation of effective state. `dev` is lower-level
diagnostics such as VT/PTY/render/plugin traces, deterministic recordings and
replay, grid/scene/atlas dumps, performance capture, and renderer overlays.

## Configuration commands

Status: **candidate contract.**

```sh
bitty paths
bitty config path
bitty config check
bitty config show
bitty config show --source
bitty config defaults
bitty config diff
bitty config reload
```

`config check` should evaluate configuration in a fresh configuration VM,
produce and validate a typed plan, and avoid creating a GUI. `config show`
should show effective values, while `--source` explains which layer and file
provided each value.

Path and configuration architecture are documented in
[Lua and XDG configuration](../configuration/lua-and-xdg.md).

## Output contract

Status: **candidate contract.**

All query-like commands should support a consistent machine-readable format.
Standard output contains the requested result; standard error contains
diagnostics and logs. Informational logging must never corrupt JSON or JSONL on
standard output.

Status: **candidate formats.**

```text
--format table
--format json
--format jsonl
```

Schemas need versioning and stability rules. Human table output is not a
machine contract.

Status: **candidate exit codes.**

| Code | Meaning                 |
| ---- | ----------------------- |
| 0    | success                 |
| 1    | generic error           |
| 2    | CLI usage error         |
| 3    | configuration error     |
| 4    | plugin error            |
| 5    | compatibility error     |
| 6    | IPC/runtime unavailable |
| 7    | permission denied       |
| 8    | conflict                |

These codes are placeholders until error taxonomy is designed across local,
runtime, and plugin operations.

## Doctor and completion

Status: **candidate contract.**

`bitty doctor` should be a stable recovery and diagnostics entry point covering
platform, GPU, fonts, PTY/ConPTY, terminfo, shell integration, configuration,
plugins, dependency and key conflicts, renderer state, and supported image
protocols. It should offer structured output for automation.

Shell completion should target Bash, Zsh, Fish, PowerShell, and Nushell. Dynamic
plugin completion comes from static package manifests and should update when
the installed plugin set changes, without starting every plugin runtime.

## Deferred candidates

An interactive `bitty shell` could expose the registry as a remote-control
REPL. This is useful for diagnostics and scripting but is not an initial
contract.

Renderer overlays such as damage, cells, glyphs, images, and layout are useful
development frontends. They depend on renderer architecture and are likewise
deferred.

## Open questions

- What is the minimum stable top-level command set for the first usable build?
- Do actions and commands need different registries or just different metadata?
- What is the versioned command argument/result schema?
- How does IPC authenticate local clients, agents, and nested or remote shells?
- Which environment variables are safe and portable enough to standardize?
- Should optional top-level plugin aliases exist at all?
- How are output schema versions negotiated?
- Which exit codes can be made stable across platform-specific failures?
- How does instance selection behave with several graphical sessions and no
  current-terminal context?
- Which `inspect` and `doctor` operations must work in safe mode?
