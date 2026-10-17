# Core System APIs: Terminal, Settings, Env, FS & Tasks

This page documents Bitty Core's runtime system APIs, encompassing terminal snapshots, read-only configuration reflection, sandboxed environment variables, capability-gated filesystem access, and background asynchronous task scheduling.

## Terminal Inspection (`bitty.terminal`)

The `bitty.terminal` module provides safe, bounded inspection of active terminal grid state.

### `bitty.terminal.snapshot(options)`

Captures a semantic snapshot of the active terminal pane:

```lua
-- bitty-plugin.toml requires:
-- [capabilities]
-- terminal = ["terminal.semantic-read"]

local snapshot = bitty.terminal.snapshot({ scope = "semantic" })
if snapshot then
  bitty.notify.show({
    title = "Terminal Snapshot",
    body = string.format("Captured terminal grid with %d lines", #snapshot.lines or 0),
  })
end
```

- **Parameters**: `options` table with `scope = "semantic"`.
- **Returns**: A table containing structured line text, cell attributes, and semantic zone descriptors.
- **Required Capability**: `terminal.semantic-read`.
- **Budgets & Error Handling**:
  - Missing capability fails closed with `E_CAPABILITY_DENIED`.
  - Unsupported scope returns `E_SNAPSHOT_SCOPE_UNSUPPORTED`.
  - Snapshots exceeding 256 KiB fail closed with `E_SNAPSHOT_TOO_LARGE` to guarantee predictable memory bounds.

---

## Configuration Reflection (`bitty.settings`)

The `bitty.settings` module provides a read-only view of the host's active effective configuration.

### `bitty.settings.get(key)`

Queries the current value of a configuration setting:

```lua
local current_theme = bitty.settings.get("appearance.theme")
local font_family = bitty.settings.get("font.family")
local scrollback = bitty.settings.get("terminal.scrollback")
```

- **Parameters**: `key` (`string`, 1..=128 bytes). Must name a declared configuration field path (e.g. `"appearance.theme"`, `"font.size"`).
- **Returns**: The effective setting value, or `nil` if unset or undeclared.
- **Security Boundary**: Read-only. Plugins cannot alter user settings through this interface; user configuration files retain exclusive sovereignty.

---

## Environment Variables (`bitty.env`)

The `bitty.env` module provides controlled access to select host process environment variables.

### Capabilities & Desensitized Denial

Untrusted plugins have zero ambient access to host environment variables. Access requires explicit itemized grants in `bitty-plugin.toml`:

```toml
[capabilities]
env = ["env.read:PWD", "env.read:TERM", "env.read:BITTY_*"]
```

> [!SECURITY]
> When a plugin queries an ungranted environment variable, `bitty.env` returns `nil` (or error `E_NOT_IMPLEMENTED`). This desensitized denial prevents malicious plugins from probing whether sensitive environment variables (such as tokens or credentials) exist on the user's host.

### Environment Access Methods

#### `bitty.env.get(key)`

Retrieves the string value of a granted environment variable:

```lua
local current_dir = bitty.env.get("PWD")
if current_dir then
  -- Use directory path
end
```

- **Parameters**: `key` (`string`, 1..=64 bytes, uppercase ASCII, digits, and underscores).
- **Returns**: The string value, or `nil` if unset or ungranted.

#### `bitty.env.has(key)`

Tests whether an environment variable is granted and set on the host:

```lua
if bitty.env.has("TERM") then
  -- Host has TERM defined
end
```

- **Returns**: `boolean` (`true` only when the variable is granted and currently defined).

---

## Sandboxed Filesystem (`bitty.fs`)

> [!IMPORTANT]
> The `bitty.fs` call spellings (`read` / `write` / `list`) exist, but Bitty Core ships **no filesystem backend**: every call fails closed with `E_NOT_IMPLEMENTED`, even with grants declared. The capability grammar below documents the contract a future backend must honor.

Per RFC-0005, the `bitty.fs` module provides a bounded, capability-gated filesystem bridge designed to prevent directory traversal and handle leaks.

### Capabilities & Pattern Grants

Plugins must declare path pattern grants under `[capabilities]`:

```toml
[capabilities]
fs = [
  "fs.read:/tmp/my-plugin/*",
  "fs.write:/tmp/my-plugin/cache.json"
]
```

### Core Invariants

1. **No `open` Verb**: Bitty does not expose file handles or file descriptors to Lua. File access is discrete and bounded.
2. **Untrusted Provenance**: All content read via `bitty.fs.read` carries `{ untrusted = true }`. Combining file contents with shell execution or system clipboards requires separate explicit permissions.
3. **No File Watchers or Streaming**: Bitty rejects persistent handles or streaming cursors across Lua VM ticks.

### Filesystem Operations

#### `bitty.fs.read(path)`

Reads an entire file into memory:

```lua
local result = bitty.fs.read("/tmp/my-plugin/config.json")
if result then
  local content = result.content
  -- result.untrusted is true
end
```

- **Parameters**: `path` (`string`, 1..=4096 bytes).
- **Returns**: Table `{ content = string, untrusted = true }`.
- **Required Capability**: `fs.read:<PATTERN>`.

#### `bitty.fs.write(path, content, options)`

Writes string content to a file:

```lua
bitty.fs.write("/tmp/my-plugin/cache.json", '{"ready": true}', {
  append = false, -- false creates or overwrites; true appends
})
```

- **Parameters**:
  - `path` (`string`, 1..=4096 bytes).
  - `content` (`string`, bounded by host budget).
  - `options` (`table`, optional): `{ append = boolean }` (default `false`).
- **Required Capability**: `fs.write:<PATTERN>`.
- **Pre-Commit Expiry**: Mutations are guarded by deadline timers; expired operations fail closed without disk mutation.

#### `bitty.fs.list(prefix, max_entries)`

Lists directory entries matching a path prefix:

```lua
local entries = bitty.fs.list("/tmp/my-plugin/", 64)
for _, entry in ipairs(entries) do
  -- entry.name: file name string
  -- entry.kind: "file" | "directory" | "symlink"
end
```

- **Parameters**:
  - `prefix` (`string`, 1..=4096 bytes).
  - `max_entries` (`integer`, optional, default `256`, max `4096`).
- **Returns**: Array of entry descriptor tables (`{ name = string, kind = string }`).
- **Required Capability**: `fs.read:<PATTERN>`.

---

## Background Tasks (`bitty.tasks`)

The `bitty.tasks` module allows plugins to schedule background asynchronous microtasks managed by Bitty's stackless event loop without blocking the user's terminal session.

### `bitty.tasks.spawn(fn)`

Spawns a deferred microtask:

```lua
local task_handle = bitty.tasks.spawn(function()
  -- Runs asynchronously on the host event loop tick
  bitty.notify.show({
    title = "Background Task",
    body = "Asynchronous task completed",
  })
end)
```

- **Parameters**: `fn` (`function`).
- **Returns**: `integer` task handle.
- **Quota**: Capped at 64 concurrent tasks per plugin generation (`REGISTRATION_MAX_TASKS`). The 65th spawn fails closed with error `E_BUDGET_TASK`.

### `bitty.tasks.cancel(handle)`

Cancels a pending microtask before it executes:

```lua
local cancelled = bitty.tasks.cancel(task_handle)
```

- **Parameters**: `handle` (`integer`).
- **Returns**: `boolean` (`true` if the task was found and removed before execution).
