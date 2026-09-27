---
title: Shared Lua Dependencies Proposal
description: Proposal for deduplicating pure Lua dependencies across plugins to avoid dependency hell
category: specifications
audience: plugin-author
document_type: specification
status: draft
website_publish: false
sidebar_order: 50
---

# Shared Lua Dependencies Proposal

## Problem Statement

**Current architecture** (from `plugin-reuse-and-providers.md`):

- Each plugin VM resolves `require` only inside its own installed tree
- Vendoring is permitted: plugins ship dependencies (lpeg, fun, inspect) under their namespace
- Vendored code is subject to per-plugin budgets

### Consequence: Dependency Hell

```text
~/.local/share/bitty/plugins/
├── weather-widget@0.1.0/
│   └── lua/vendor/http-client.lua  # 50KB
├── docker-manager@1.0.0/
│   └── lua/vendor/http-client.lua  # 50KB (duplicate!)
├── github-integration@2.0.0/
│   └── lua/vendor/http-client.lua  # 50KB (duplicate!)
├── statusline@1.5.0/
│   └── lua/vendor/json.lua         # 30KB
└── git-panel@2.0.0/
    └── lua/vendor/json.lua         # 30KB (duplicate!)
```

**Impact**:

- Disk waste: 10 plugins × 50KB http-client = 500KB duplication
- Memory waste: Each VM loads its own copy
- Update hell: Security fix in http-client requires updating all plugins
- Version conflicts: Plugin A needs http-client v1, Plugin B needs v2

## Solution: Shared Lua Registry

### Architecture Overview

```text
┌─────────────────────────────────────────────────────┐
│           Bitty Plugin Host (Rust)                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │     Shared Lua Registry (Host-managed)       │  │
│  │  ~/.local/share/bitty/lua-registry/          │  │
│  │  ├── http-client@1.2.0/                      │  │
│  │  ├── json@2.5.0/                             │  │
│  │  ├── lpeg@1.0.0/                             │  │
│  │  └── inspect@3.1.0/                          │  │
│  └──────────────────────────────────────────────┘  │
│                      ↑                              │
│  ┌──────────────────┴───────────────────────────┐  │
│  │   Plugin VMs with augmented require()        │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐         │  │
│  │  │Plugin A│  │Plugin B│  │Plugin C│         │  │
│  │  │(weather│  │(docker)│  │(github)│         │  │
│  │  └────────┘  └────────┘  └────────┘         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Dependency Declaration in Manifest

**bitty-plugin.toml** (extended):

```toml
[plugin]
id = "yourname.weather"
name = "Weather Widget"
version = "0.1.0"

[dependencies.lua]
# Shared pure Lua dependencies (deduplicated)
"http-client" = "^1.0.0"
"json" = "^2.5"

# Optional: private vendored deps (plugin-specific)
[dependencies.vendored]
"my-custom-parser" = { path = "lua/vendor/parser.lua" }
```

### Resolution Rules

**Priority order** for `require("http-client")`:

1. **Shared registry** (if declared in `[dependencies.lua]`)
   - `~/.local/share/bitty/lua-registry/http-client@1.2.0/init.lua`

2. **Plugin-local** (fallback)
   - `~/.local/share/bitty/plugins/yourname.weather@0.1.0/lua/vendor/http-client.lua`

3. **Error** if not found in either location

### Lockfile Format

**bitty-plugins.lock** (extended):

```json
{
  "version": 1,
  "plugins": {
    "yourname.weather": {
      "version": "0.1.0",
      "lua_dependencies": {
        "http-client": {
          "version": "1.2.0",
          "resolved": "registry://http-client@1.2.0",
          "integrity": "sha256:abc123..."
        },
        "json": {
          "version": "2.5.0",
          "resolved": "registry://json@2.5.0",
          "integrity": "sha256:def456..."
        }
      }
    }
  },
  "lua_registry": {
    "http-client@1.2.0": {
      "ref_count": 3,
      "used_by": ["yourname.weather", "yourname.docker", "yourname.github"],
      "integrity": "sha256:abc123..."
    },
    "json@2.5.0": {
      "ref_count": 5,
      "used_by": ["yourname.weather", "bitty-terminal.statusline", ...],
      "integrity": "sha256:def456..."
    }
  }
}
```

### Install Workflow

```bash
# User installs weather plugin
bitty plugin add yourname.weather

# Package manager workflow:
# 1. Fetch plugin manifest
# 2. Parse [dependencies.lua]
# 3. Check if dependencies exist in registry
# 4. If missing: download and verify
# 5. If exists: increment ref_count
# 6. Update lockfile
# 7. Activate plugin
```

### Garbage Collection

**Reference counting**:

```bash
# User removes weather plugin
bitty plugin remove yourname.weather

# Package manager:
# 1. Decrement ref_count for http-client@1.2.0
# 2. If ref_count == 0: mark for GC
# 3. Run GC periodically or manually:
bitty plugin gc  # Remove unused registry entries
```

### Security & Isolation

**Constraints**:

1. ✅ Registry dependencies are **read-only** in plugin VMs
2. ✅ Each plugin still has **isolated state** (cannot interfere)
3. ✅ Integrity verification via **sha256 hashes** in lockfile
4. ✅ Version pinning prevents **accidental upgrades**
5. ✅ Per-plugin budgets **still apply** (shared code counts toward plugin's quota)

**Capability gate**:

```toml
# No new capability required - registry access is transparent
# Plugins declare dependencies, host manages registry
```

### Migration Strategy

#### Phase 1: Opt-in (v0.5)

- Plugins can declare `[dependencies.lua]`
- Host supports both vendored and registry resolution
- Registry is optional feature

#### Phase 2: Encouraged (v0.8)

- CLI warns about large vendored dependencies
- `bitty plugin analyze` suggests moving to registry

#### Phase 3: Standard (v1.0)

- Registry is default for common libraries
- Vendoring remains available for custom code

## Implementation Plan

### 1. Extend Manifest Schema

**File**: `bitty-plugins-docs/specifications/manifest-capability-authority.md`

Add section:

````markdown
## Lua Dependencies (Draft)

Status: **draft** post-v1.0 extension.

### [dependencies.lua] section

Pure Lua dependencies resolved from the shared registry.

Format:

```toml
[dependencies.lua]
<package-name> = "<semver-range>"
```
````

Constraints:

- Package names follow `[a-z][a-z0-9-]*` pattern
- Semver ranges use standard syntax: `^1.0`, `>=2.0,<3.0`, `~1.2.3`
- Maximum 20 dependencies per plugin (prevent bloat)

### 2. Registry Structure

**File**: `~/.local/share/bitty/lua-registry/`

```text
lua-registry/
├── index.json # Registry metadata
├── http-client/
│ ├── 1.0.0/
│ │ ├── init.lua
│ │ └── manifest.toml # Package metadata
│ └── 1.2.0/
│ ├── init.lua
│ └── manifest.toml
└── json/
└── 2.5.0/
├── init.lua
└── manifest.toml

```

### 3. Rust Implementation

**File**: `crates/bitty-package/src/lua_registry.rs`

```rust
pub struct LuaRegistry {
    root: PathBuf,
    index: RegistryIndex,
}

impl LuaRegistry {
    /// Install a Lua dependency if not present
    pub fn ensure_installed(&mut self, name: &str, version: &Version) -> Result<PathBuf> {
        let pkg_path = self.root.join(format!("{}/{}", name, version));

        if pkg_path.exists() {
            // Already installed
            self.increment_ref_count(name, version)?;
            return Ok(pkg_path);
        }

        // Fetch from registry
        let source = self.fetch_package(name, version)?;
        self.verify_integrity(&source)?;
        self.install_package(name, version, source)?;

        Ok(pkg_path)
    }

    /// Resolve version constraint to concrete version
    pub fn resolve(&self, name: &str, constraint: &VersionReq) -> Result<Version> {
        self.index.resolve(name, constraint)
    }

    /// Garbage collect unused packages
    pub fn gc(&mut self) -> Result<usize> {
        let mut removed = 0;

        for (name, versions) in &self.index.packages {
            for (version, meta) in versions {
                if meta.ref_count == 0 {
                    self.remove_package(name, version)?;
                    removed += 1;
                }
            }
        }

        Ok(removed)
    }
}
```

### 4. Plugin VM Integration

**File**: `crates/bitty-lua/src/require_hook.rs`

```rust
impl PluginVm {
    fn resolve_require(&self, module_name: &str) -> Result<PathBuf> {
        // Check if it's a declared shared dependency
        if let Some(version) = self.manifest.lua_dependencies.get(module_name) {
            // Resolve from shared registry
            return self.lua_registry.resolve_path(module_name, version);
        }

        // Fallback to plugin-local vendored path
        let local_path = self.plugin_root
            .join("lua/vendor")
            .join(format!("{}.lua", module_name));

        if local_path.exists() {
            return Ok(local_path);
        }

        Err(Error::ModuleNotFound(module_name.to_string()))
    }
}
```

## Examples

### Example 1: HTTP Client Sharing

**3 plugins need HTTP client**:

```toml
# weather-widget/bitty-plugin.toml
[dependencies.lua]
"http-client" = "^1.0"

# docker-manager/bitty-plugin.toml
[dependencies.lua]
"http-client" = "^1.0"

# github-integration/bitty-plugin.toml
[dependencies.lua]
"http-client" = "^1.0"
```

**Result**:

- Only 1 copy of `http-client@1.2.0` in registry
- 3 plugins share the same code
- Saves ~100KB disk + memory

### Example 2: Version Conflicts

**Plugin A needs json v2, Plugin B needs json v3**:

```toml
# plugin-a/bitty-plugin.toml
[dependencies.lua]
"json" = "^2.0"

# plugin-b/bitty-plugin.toml
[dependencies.lua]
"json" = "^3.0"
```

**Result**:

- Registry contains both `json@2.5.0` and `json@3.1.0`
- Plugin A resolves to v2, Plugin B resolves to v3
- No conflict, both versions coexist

## Open Questions

1. **Registry source**: npm? GitHub releases? Dedicated registry?
2. **Trust model**: How to verify package integrity on first install?
3. **Update policy**: Automatic updates for security patches?
4. **Namespace**: Should packages be scoped (@bitty/http-client)?
5. **Native extensions**: Can C-based Lua modules be shared?

## Alternatives Considered

### Alternative 1: No deduplication (current)

- ✅ Simple: Each plugin is self-contained
- ❌ Waste: Lots of duplication
- ❌ Updates: Hard to apply security fixes

### Alternative 2: Global require path

- ✅ Simple: One `/usr/share/lua/` path
- ❌ Security: All plugins share mutable state
- ❌ Isolation: Breaks VM sandbox

### Alternative 3: Content-addressed storage

- ✅ Perfect deduplication
- ❌ Complex: Needs hash-based lookups
- ❌ Debugging: Hard to understand what's loaded

## Conclusion

The **Shared Lua Registry** approach balances:

- ✅ Deduplication (saves resources)
- ✅ Security (integrity verification)
- ✅ Isolation (read-only, versioned)
- ✅ Compatibility (semver resolution)

This proposal should be reviewed and accepted before v1.0.
