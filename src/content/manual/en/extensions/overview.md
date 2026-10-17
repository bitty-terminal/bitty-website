# Extension Catalog

Bitty has two installable extension kinds. This catalog gives each one a page with what it does, how to install it, the Lua API surface it exposes or consumes, and a minimal config example.

## The two tracks

- **Native upstream extensions** (Rust binaries behind the [Native Component Boundary](upstream-components.md)): installed with `bitty extension install <name> --version X.Y.Z` (hash-verified CDN bundle) or staged locally with `bitty extension add <path>`. Names and versions are exact — there is no `latest` pointer.
- **Lua plugins** (sandboxed Lua over the Plugin API): installed with `bitty plugin install <git-url>` (or a local directory) and activated with `bitty plugin enable <id>`. Lua plugins carry no CDN versions; each page cites the version declared in its `bitty-plugin.toml`.

## Install-status legend

- **Published** — a real `SHA256SUMS` exists on the CDN; the page shows the exact install command.
- **Unpublished** — no CDN bundle exists; the page says so and gives the repo path for a local `add` / install.

Publication status below was verified live on 2026-10-16: every `extensions/<name>/<version>/SHA256SUMS` probe returned 404 while `install/` and `manual/` on the same CDN returned 200, and every repository URL below was confirmed via the `bitty-terminal` organization listing.

## Native upstream extensions

| Extension                                 | Status      | Page                                      |
| ----------------------------------------- | ----------- | ----------------------------------------- |
| network (shared network runtime)          | Unpublished | [network](network.md)                     |
| ipc (out-of-process IPC bridge)           | Unpublished | [ipc](ipc.md)                             |
| agent (agent protocol vocabulary)         | Unpublished | [agent](agent.md)                         |
| observability (debug/trace seam)          | Unpublished | [observability](observability.md)         |
| execution (job supervisor)                | Unpublished | [execution](execution.md)                 |
| graphics (bounded image decode)           | Unpublished | [graphics](graphics.md)                   |
| a11y (accessibility adapter)              | Unpublished | [a11y](a11y.md)                           |
| storage (bounded KV mechanics)            | Unpublished | [storage](storage.md)                     |
| url-detector (plaintext link scan)        | Unpublished | [url-detector](url-detector.md)           |
| platform-services (desktop notify bridge) | Unpublished | [platform-services](platform-services.md) |

All ten are Rust library crates today: none ships a packed `bitty-<name>` component binary yet, so there is nothing `extension install` or `extension add` can stage. Each page gives the source checkout to track.

## Lua plugins

| Plugin                                       | Manifest version | Registry           | Page                            |
| -------------------------------------------- | ---------------- | ------------------ | ------------------------------- |
| activity (`bitty-featured.activity`)         | 0.0.1            | official           | [activity](activity.md)         |
| bar (`bitty-terminal.bar`)                   | 0.0.1            | official           | [bar](bar.md)                   |
| composer (`bitty-terminal.composer`)         | 0.0.1            | official           | [composer](composer.md)         |
| copy-mode (`bitty-terminal.copy-mode`)       | 0.0.1            | official           | [copy-mode](copy-mode.md)       |
| file-manager (`bitty-terminal.file-manager`) | 0.1.0            | official           | [file-manager](file-manager.md) |
| git-panel (`bitty-terminal.git-panel`)       | 0.1.0            | official           | [git-panel](git-panel.md)       |
| history (`bitty-terminal.history`)           | 0.0.1            | official           | [history](history.md)           |
| palette (`bitty-terminal.palette`)           | 0.0.1            | official           | [palette](palette.md)           |
| search (`bitty-terminal.search`)             | 0.0.1            | official           | [search](search.md)             |
| statusline (`bitty-terminal.statusline`)     | 0.0.1            | not yet registered | [statusline](statusline.md)     |
| wheel (`bitty-terminal.wheel`)               | 0.0.1            | official           | [wheel](wheel.md)               |
| devtools (`bitty-featured.devtools`)         | 0.1.0            | not yet registered | [devtools](devtools.md)         |

`beacon` (target-navigation candidate) is excluded: it is a metadata-only scaffold with no manifest or Lua implementation yet.
