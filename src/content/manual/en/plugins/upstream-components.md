# Native Component Boundary

Bitty Core ships with **zero network code** and **zero extraneous background runtime code**. Yet, plugins often need network connectivity, HTTP APIs, or heavy computation. Bitty resolves this tension through its **Native Component Boundary** architecture: single-purpose native binaries act as upstream capability providers behind a policy-enforcing host.

## The Architectural Axioms

To prevent the ecosystem entropy seen in traditional extensible environments (where each plugin pulls in separate Python/Node runtimes, uncoordinated worker processes, and duplicate connection pools), Bitty establishes two core axioms:

$$\boxed{\text{Plugins share infrastructure, not duplicate infrastructure}}$$
$$\boxed{\text{Plugins request capabilities, not own system privileges}}$$

## The Coprocess Model

Native components are independent, single-purpose native binaries that act as **upstream capability providers**:

```text
Plugin Lua Sandbox
        │ (1) Capability Request: versioned service call
        ▼
Bitty Core Host (Rust)
        │ (2) Policy Authority: Checks manifest grant, timeout, byte budget
        ▼
stdio Wire Protocol v1 (Framed JSON / Binary IPC)
        ▼
Native Coprocess (Rust)
        │ (3) Shares connection pools & caches across all plugins
        ▼
External Resource
```

### Key Design Tenets

1. **On-Demand Stdio Coprocess**: Bitty Core spawns the native component upon first usage, communicates over standard input and output (`stdin` / `stdout`), and gracefully suspends or terminates it when idle.
2. **Zero `dlopen` & Zero Ambient Daemon**: Components are never dynamically loaded into the Core process space (preserving host stability and memory boundaries), nor do they run as lingering system background daemons.
3. **No PATH Scanning**: Bitty Core never scans system `$PATH` for extensions. Extension binaries live at explicit paths (user `$XDG_DATA_HOME/bitty/extensions/` wins over system locations) with cryptographic SHA-256 digest validation.
4. **Mechanism vs. Policy Separation**:
   - **Core is the Policy Authority**: Core validates permission grants, user consent, request deadlines, and body byte ceilings.
   - **The Component is the Execution Mechanism**: The component performs the heavy work and re-verifies handed capability tokens as defense-in-depth.

## Bootstrapping Without a Network Stack

Core links no network client, so distribution itself is bootstrapped from tools the OS already ships: fixed-argument system `curl` fetches hash-pinned release bundles from the CDN (R2 `bitty/extensions/` prefix), system `tar` unpacks them, and SHA-256 verification runs before anything is staged. No toolchain is required on the user machine.

## Extension Administration (`bitty extension`)

Manage registered upstream extension binaries via the CLI (see [CLI Commands & Controls](../getting-started/cli.md)). The canonical verb is `extension`; `component` remains as a hidden deprecated alias (same handlers, stderr deprecation note, kept at least through 0.1.0) and never appears in help or shell completions. Resolution is user-tier first: `$XDG_DATA_HOME/bitty/extensions/` wins over the system tier, which is read-only for this command.

```bash
# List installed extensions and binary digest integrity
bitty extension list

# Stage an extension from a local path only (no download)
bitty extension add /usr/local/bin/bitty-net

# Fetch one hash-verified R2 prebuilt release (TOFU-pinned, see below)
bitty extension install net --version 0.0.23

# Remove a user-tier extension (never touches the system tier)
bitty extension remove net
```

### Install Trust: Consent, TOFU Pins, and Update Diffs

`install` fetches through a minimal seed (fixed-argument system `curl`, system `tar`, SHA-256 verification before anything is staged). Trust works as follows:

- **Explicit consent**: unless the release is dual-digest verified silent, installation prompts for confirmation; `--yes` approves non-interactively, a decline aborts with exit code `1` and nothing changed.
- **TOFU pinning**: first contact records the verified CDN digest; a later differing digest fails closed as pin-mismatch (exit code `4`). The pin never auto-updates; `--force` re-pins after verification.
- **Update-diff preview**: when a fetch would change the TOFU pin, `install` renders a unified old-vs-new diff preview before applying. Preview only — consent and `--force` semantics are unchanged, and the diff is computed locally with no network. First contact renders nothing.

Exit codes: `0` success, `1` declined consent or fetch-environment failure, `2` usage error, `4` extension error (integrity, digest, pin-mismatch).

## Source Transparency (`show-source` and Readability)

Every installed extension is auditable byte-for-byte:

```bash
# Print the exact pinned executable bytes (version defaults to active)
bitty extension show-source net
bitty extension show-source net 0.0.23
```

The executable hash is re-verified against the installed descriptor before anything is printed; a missing install or hash mismatch fails closed (exit code `4`) with nothing on standard output. Provenance (name, version, source tier, path, SHA-256) goes to standard error so standard output stays byte-identical for piping and hashing. Nothing is executed.

**No-obfuscation rule**: human-readable source text (the `bitty-component.toml` descriptor plus Lua sources) must not look minified. The documented heuristic refuses text with any line over 1000 bytes or an average over 200 bytes per line, enforced both in the loader and in release-pack validation — minified input fails closed before any output is written.
