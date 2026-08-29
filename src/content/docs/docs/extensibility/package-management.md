---
title: Plugin package management
description: Pre-implementation contract for plugin manifests, package sources, updates, rollback, and trust
category: extensibility
audience: plugin-author
document_type: specification
status: draft
website_publish: true
sidebar_order: 20
---

# Plugin package management

> Status: pre-implementation architecture. A package-manager experience for
> first-party and third-party plugins is accepted working direction. State
> boundaries, command names, file names, schemas, and update policy are
> candidate contracts except where the security contract is normative. The
> integrity verification chain, staged activation lifecycle and safe rollback
> semantics are accepted in
> [Package Lifecycle RFC](../specifications/package-lifecycle-rfc.md)
> (OQ-021, 2026-08-27) as normative for staged activation and rollback; real
> signature verification, registry service, and key-directory contracts remain
> draft under OQ-022 and OQ-026 through OQ-029.

Bitty should treat plugin installation as package management, not as an
incidental side effect of loading Lua. Users should be able to declare,
reproduce, inspect, update, disable, and remove official or third-party plugins
through one model shared by CLI, future developer tools, and agent interfaces.

## Candidate state model

The plugin environment has three distinct forms of state:

1. A managed manifest records the desired plugin set and version constraints.
2. A lockfile records an exact, reproducible resolution.
3. The package store contains verified installed artifacts.

Runtime behavior configuration remains in Lua. The package manager must not
rewrite arbitrary `init.lua` or user module code because conditionals,
functions, comments, imports, and formatting make that unsafe and
nondeterministic.

Supply-chain requirements are normative in the
[security overview](../security/overview.md) and tracked as R-015, R-016, and
R-022 in the [security risk register](../security/risk-register.md). Package
design must not weaken those requirements.

The boundary is:

```text
Which packages are present?       How are packages configured?
bitty-plugins.toml                init.lua and Lua modules
          |                                  |
          v                                  v
  Package resolver                         ConfigPlan
          |
          v
bitty-plugins.lock -> package store -> plugin host
```

`bitty-plugins.toml` and `bitty-plugins.lock` are current candidate names, not
final file-format commitments.

## Candidate managed manifest

```toml
# Candidate syntax. This file may be managed by `bitty plugin`.
[plugins."bitty-terminal.tabs"]
version = "^1.0"
enabled = true

[plugins."xuepoo.markdown"]
git = "https://github.com/xuepoo/bitty-markdown"
version = "^0.8"
enabled = true
```

The lockfile should record enough material to restore and audit the resolution,
including:

- plugin ID and package source;
- requested constraint and resolved version;
- immutable revision when applicable;
- content checksum and manifest hash;
- dependency resolution;
- Bitty and Plugin API compatibility.

The lockfile belongs beside the user's configuration so it can be versioned
with dotfiles. Installed plugin code belongs under the platform data directory,
not the configuration directory. See
[Lua and XDG configuration](../configuration/lua-and-xdg.md).

## Source model

Status: **accepted direction.**

Both first-party and third-party plugins are supported. Package identity is a
stable plugin ID, not a GitHub URL. Sources should include:

- bundled packages;
- a future registry;
- Git repositories with version or revision selection;
- local paths for plugin development.

Status: **candidate cli examples.**

```sh
bitty plugin add bitty-terminal.tabs
bitty plugin add xuepoo.markdown
bitty plugin add git:https://github.com/xuepoo/bitty-markdown@v0.8.2
bitty plugin add --path ../bitty-markdown
```

A registry can arrive later. Starting with Git and local paths must not prevent
stable identity, compatibility metadata, integrity verification, or a future
registry mapping from plugin ID to source.

## Command semantics

Status: **accepted direction.**

Plugin lifecycle should be manageable without requiring ordinary users to edit
Lua.

Status: **candidate contract.**

CLI, GUI, and agent adapters should invoke one package-manager service. They
should not implement independent file mutation or resolution logic.

The four central verbs have deliberately different semantics:

- `add`: change desired state to include a plugin, resolve it, and update the
  environment.
- `remove`: change desired state to exclude a plugin; optional purge of its
  persistent state is a separate choice.
- `update`: select newer versions allowed by constraints and create a new lock
  resolution.
- `sync`: restore the exact manifest/lock environment without opportunistically
  selecting newer versions.

Enable/disable is not install/remove. A disabled plugin remains declared,
installed, locked, and configured, but does not load. Removing a plugin should
preserve its state by default and report where it remains; an explicit purge
may remove it.

Status: **candidate command set.**

```text
P0: add, remove, list, info, enable, disable, update, sync
P1: search, outdated, pin, unpin, clean, doctor, rollback
P2: registry, audit, signature, publish, graphical management,
    background update checks
```

P0/P1/P2 are planning candidates, not an implementation roadmap approved by
this document. `add`/`remove` are preferred over duplicated
`install`/`uninstall` aliases unless user research shows a need.

## Updates, transactions, and rollback

Status: **accepted direction.**

An update must not leave a half-updated environment. The target flow is:

```text
resolve
  -> stage downloads
  -> validate manifests and dependency graph
  -> verify compatibility and integrity
  -> require review for any capability increase
  -> commit lock state
  -> atomically switch active package set
```

Installation and update execute no package code. Runtime activation is a
separate transaction; an activation failure must preserve or restore the
previous working environment. The package manager should retain enough prior
lock information to support full or per-plugin rollback.

Status: **candidate version behavior.**

- `bitty plugin update` updates all unpinned plugins within declared version
  constraints.
- major-version movement outside the constraint requires an explicit command or
  manifest edit.
- `pin` and `unpin` control whether ordinary updates may move a package.
- `outdated` distinguishes current, wanted, and latest versions.

Automatic update checks may be enabled, but automatic background upgrades
should be off by default. A terminal is a production tool; activation changes
should be explicit and recoverable.

## Package store

Status: **accepted direction.**

Package contents are installed under the platform data root. Configuration,
cache, and persistent plugin state remain separate.

One candidate layout is:

```text
$XDG_DATA_HOME/bitty/plugins/
├── packages/
│   ├── xuepoo.markdown/
│   │   ├── 0.8.1/
│   │   └── 0.9.0/
│   └── bitty-terminal.tabs/
│       └── 1.4.1/
└── current/
```

A content-addressed store may improve deduplication and atomic switching later,
but Nix-like storage is not a first-stage requirement.

## Package manager versus runtime host

Status: **candidate contract.**

Separating these subsystems is a candidate architecture. The per-plugin
isolated VM and restricted-authority requirement shown for the host is a
normative P0 security baseline, not an optional part of this candidate split.

| Package manager                      | Plugin host                      |
| ------------------------------------ | -------------------------------- |
| sources and downloads                | load/unload                      |
| dependency resolution                | per-plugin isolated Lua VMs      |
| integrity verification               | capabilities                     |
| manifest and lock state              | lazy activation                  |
| package store and update transaction | lifecycle and resource ownership |

The host consumes a resolved, verified package graph. It must not perform
network resolution during ordinary startup. Runtime isolation, services, and
conflict rules are specified in [Plugin system](plugin-system.md).

## Plugin-provided CLI

Status: **accepted direction.**

Installed plugins may expose commands, but the core CLI namespace remains
stable and cannot be overridden. A collision-free route qualified by plugin
identity must remain available.

Status: **candidate CLI example.**

The current candidate spelling for that route is:

```sh
bitty x xuepoo.markdown render README.md
```

Status: **candidate contract.**

A plugin manifest may suggest a short alias:

```toml
[cli]
alias = "markdown"
```

That could make `bitty markdown ...` available. It is only an alias: conflicts
are diagnosed and users can always use the qualified plugin identity. In this
candidate grammar, that route uses `bitty x`. Built-in commands win and may
never be shadowed. Help should display extension commands in a separate section.

A second extension class may follow Cargo-style external executables, for
example discovering `bitty-benchmark` as `bitty benchmark`. Runtime plugins and
external CLI executables have different trust, distribution, and capability
models and must not be conflated.

Static manifest metadata should supply command names, argument schemas, help,
completion, lazy triggers, and ownership without starting plugin Lua VMs. The
shared CLI model is described in [CLI](../interfaces/cli.md).

## Security and trust

Status: **accepted direction.**

Third-party does not mean trusted. Lock and checksum validation are required for
installation and update. Installation must show requested sensitive
capabilities, and a capability increase blocks an update pending explicit
review. A package declaring network, process, terminal read/input, filesystem
write, protocol, or runtime-control access needs a clear decision surface.

Checksums are a baseline integrity primitive, not a complete supply-chain
strategy. Registry provenance, signatures, publisher identity, revocation,
audit, dependency health, and abandoned packages remain staged design work.

Local-path development packages need visibly different trust and reproducibility
semantics from immutable registry or Git revisions.

## Open questions

- What are the final managed manifest and lockfile names and formats?
- Is one version of a plugin ID allowed in an environment, and can service
  interfaces support side-by-side dependency versions?
- What is the exact constraint grammar and prerelease/yanked-version policy?
- What static validation can occur before the atomic switch without executing
  package code, and how does the separate activation transaction roll back?
- How many prior environments are retained for rollback, and where?
- How are local-path changes represented in lock and integrity status?
- Which package sources are allowed before a registry exists?
- How are signatures, publisher identity, revocation, and audit introduced?
- Are top-level plugin aliases worth the ambiguity, or should `bitty x` be the
  only plugin command namespace?
- Should external executable extensions be managed by this package manager or
  discovered exclusively from `PATH`?
