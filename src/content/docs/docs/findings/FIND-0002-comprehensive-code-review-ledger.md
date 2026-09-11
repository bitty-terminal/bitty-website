---
title: Finding 0002 - Comprehensive Code Review Defects and Enhancements Ledger
description: Detailed code review findings across all 18 Bitty crates cross-referenced against top open source terminals
category: findings
audience: maintainer
document_type: register
status: accepted
website_publish: false
sidebar_order: 12
---

# Finding 0002 - Comprehensive Code Review Defects and Enhancements Ledger

## Finding status

`FIND-0002` records the comprehensive code review of the Bitty terminal workspace conducted on 2026-09-06 under task `CTX-0121`. Every crate across the workspace was reviewed for memory safety, cryptographic and sandbox boundaries, terminal protocol fidelity, resource consumption limits, and concurrency hazards. Findings are cross-referenced against authoritative open-source reference implementations in `recording/references/` (Alacritty, Ghostty, Kitty, Wezterm, Hyprland, Waybar, Hermes-Agent, Neovim, Xterm, and Vttest).

| Field              | Value                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope              | All 18 crates in `bitty/crates/` (`bitty-core`, `bitty-vt`, `bitty-term-state`, `bitty-pty`, `bitty-render`, `bitty-platform`, `bitty-ui`, `bitty-runtime`, `bitty-rich`, `bitty-lua`, `bitty-plugin-host`, `bitty-package`, `bitty-ipc`, `bitty-agent`, `bitty-config`, `bitty-app`, `bitty-perf`, `bitty-compat-lab`) |
| Evidence date      | 2026-09-06                                                                                                                                                                                                                                                                                                              |
| Source task        | `bitty-docs/CTX-0121`                                                                                                                                                                                                                                                                                                   |
| Affected contracts | [Risk Evidence RFC](../specifications/risk-evidence-rfc.md), [P0 Acceptance Criteria](../security/p0-acceptance-criteria.md), [Threat Model](../security/threat-model.md)                                                                                                                                               |
| Severity           | High (multiple Critical/High security, sandbox, and behavioral defects identified)                                                                                                                                                                                                                                      |
| Impact             | Sandbox evasion, unbounded memory growth, silent terminal input/reply loss, and spec divergence                                                                                                                                                                                                                         |
| Owner              | Bitty Core, Security, Runtime, and Package maintainers                                                                                                                                                                                                                                                                  |
| Disposition        | Record all findings into durable ledger, file remediation tasks in CarryCtx, and update security evidence matrix                                                                                                                                                                                                        |
| Status             | Closed (16 of 16 fixed: 2 per 2026-09-06 triage under `CTX-0125` plus the 14-item remediation wave merged per 2026-09-07 sync under `CTX-0126`; see Remediation triage)                                                                                                                                                 |

---

## Executive summary

The Bitty terminal project exhibits a high baseline of engineering discipline, featuring explicit bounded types, fail-closed error handling, zero ambient authority in core modules, and deterministic headless testability. However, as new capabilities have been layered onto the foundational crates (including package management, IPC introspection, panel layouts, and rich content), several critical edge cases, security bypasses, and spec divergences have emerged:

1. **Package & Activation Sandboxing**: Unbounded generation retention during rollback cycles, a silent TOFU pin check bypass when candidate identities are omitted in signed trust mode, and manifest-versus-host capability closed-set divergence.
2. **Rich Presentation & File Loader**: Public struct fields allowing AST limit evasion, and path validation in resource policies that permits empty or relative roots to bypass the deny-by-default sandbox.
3. **Rendering & Platform I/O**: Unbounded memory allocation risks in the headless presentation path, incomplete Wayland primary selection support causing right-click/middle-click paste failures on Wayland compositors, and discarded clipboard responses in OSC 52 reads.
4. **Terminal Emulation & State**: Complete dropping of zero-width and combining Unicode characters (breaking complex scripts and accents), and CPU amplification loops in cursor movement and tab navigation on untrusted escape inputs.
5. **Architectural Opportunities**: Rich protocol features from Ghostty (OTP clipboard grants, streaming Kitty graphics), Alacritty (multi-slot combining character storage), Hyprland (aspect-ratio driven adaptive Dwindle BSP splitting), and Hermes-Agent (credential scrubbing in tool dispatch).

---

## Remediation triage (2026-09-06, `CTX-0125`)

Triage syncs this ledger with already-merged `bitty` reality. It changes no
normative requirement and claims no implementation beyond the cited merged
commits. `bitty` task references below are read-only cross-repository
pointers; the owning remediation work lives in the `bitty` repository and is
not edited from `bitty-docs`. Original observations above are preserved;
only disposition changes are recorded here. The 2026-09-07 `CTX-0126` sync
verified every cited `bitty` commit as an ancestor of `bitty` `origin/main`
via read-only `git merge-base --is-ancestor` inspection and flipped the
remaining 14 items from Open to FIXED. Risk state does not move here:
residual `Open`/`Mitigated` tracking lives in the
[security risk register](../security/risk-register.md) and
[evidence matrix](../security/evidence-matrix.md), pending auditor review
per RS-1..RS-7.

### Fixed (16)

| ID             | Verdict | Merged evidence (read-only)                                                                                                                                                                                                                                                                                                                             | Why this closes the finding                                                                                                                                                                                               |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CR-PLAT-01`   | FIXED   | `bitty` [`6984343`](https://github.com/bitty-terminal/bitty/commit/698434342ac61981092bf1103940c58ac3fd4876) (`CTX-0160`, Wayland clipboard sync) plus [`1297c14`](https://github.com/bitty-terminal/bitty/commit/1297c145e08040c7201b831accb23ce49b1ee2cc) (`CTX-0158`, mouse selection clipboard routed through the Wayland-first platform backend)   | Native Wayland clipboard and primary selection backend now exists (`wayland-data-control` first, X11 fallback, fail-soft headless) and the mouse path uses it, replacing the `arboard`-only gap described in the finding. |
| `CR-UI-02`     | FIXED   | `bitty` [`5f11af7`](https://github.com/bitty-terminal/bitty/commit/5f11af7e8642f58140a1306dfb08a28a6a7189be) (`CTX-0177`, Hyprland-like panel gaps plus gap-aware focus)                                                                                                                                                                                | Gap-aware focus and layout solver replace exact-edge-touch navigation, resolving stuck focus across 1-cell gaps and outer margins.                                                                                        |
| `CR-PKG-02`    | FIXED   | `bitty` [`ec95c5c`](https://github.com/bitty-terminal/bitty/commit/ec95c5c1dc03d65e32e4ef46a82e4d3adba58bad) (`CTX-0197`, PR #336, Signed TOFU fail-closed for missing candidate)                                                                                                                                                                       | `TrustMode::Signed` with a trust store now fails closed when `candidate_identity` is absent instead of silently skipping the pin check, closing the identity-rotation bypass.                                             |
| `CR-RICH-02`   | FIXED   | `bitty` [`fade082`](https://github.com/bitty-terminal/bitty/commit/fade082e2bd9cf7c7cb9566c942b9a8b4f63ff0d) (`CTX-0198`, PR #339, reject empty resource roots)                                                                                                                                                                                         | `ResourcePolicy::new` rejects empty, relative, and un-canonicalizable roots, so `starts_with("")` can no longer grant universal read.                                                                                     |
| `CR-PKG-01`    | FIXED   | `bitty` [`76005eb`](https://github.com/bitty-terminal/bitty/commit/76005ebfdec6b32465bdbc8ab976d1ab12496f06) (`CTX-0199`, PR #340, prune filters current first and loops to ceiling)                                                                                                                                                                    | `prune()` filters `self.current` out of the candidate list before slicing and loops while the map exceeds the retention ceiling, so rollback to an early generation no longer causes unbounded growth.                    |
| `CR-PKG-03`    | FIXED   | `bitty` [`33a6731`](https://github.com/bitty-terminal/bitty/commit/33a6731ce38d8c83aed41d65b465df0e9dbc4752) (`CTX-0200`, PR #347/#348, enforce closed capability set at manifest time)                                                                                                                                                                 | Manifest capability validation enforces the host closed set at manifest time, restoring lock/install determinism for identifiers such as `terminal.arbitrary_resource_name`.                                              |
| `CR-RICH-01`   | FIXED   | `bitty` [`7e85887`](https://github.com/bitty-terminal/bitty/commit/7e85887776b4cd5f9f58cf8485b1a646a417a1f4) (`CTX-0201`, PR #344, enforce SCN-1..3 at Scene admission)                                                                                                                                                                                 | `Scene::insert` and `Scene::replace_content` enforce SCN-1..3 node-count, depth, and text-byte limits, so direct `RichBlock` construction can no longer bypass AST bounds.                                                |
| `CR-RENDER-01` | FIXED   | `bitty` [`4af50e7`](https://github.com/bitty-terminal/bitty/commit/4af50e7659a8d9b484283f1b6c244705e8748415) (`CTX-0202`, PR #346, bound headless surface allocation)                                                                                                                                                                                   | Headless `present_draw_list` computes `width * height * 4` with checked arithmetic against `MAX_SURFACE_BYTES` before allocation, matching the `software.rs` guard.                                                       |
| `CR-IPC-01`    | FIXED   | `bitty` [`c5ec211`](https://github.com/bitty-terminal/bitty/commit/c5ec2116d82cd200e8f1fc1067288217e0aae229) (`CTX-0200`/`CTX-0203`, PR #342, reject symlink traversal in socket attestation)                                                                                                                                                           | Socket directory and bound-socket attestation use `symlink_metadata` and reject symlinks fail-closed, closing the shared-temporary-directory redirection race.                                                            |
| `CR-RT-01`     | FIXED   | `bitty` [`f725664`](https://github.com/bitty-terminal/bitty/commit/f725664b5e71ef695e16a7938e654a317129ec95) (`CTX-0204`, PR #352, answer allowed OSC 52 reads with base64 reply) plus [`0cb244d`](https://github.com/bitty-terminal/bitty/commit/0cb244d3faf6dfae47db62b109da457b5deabfe6) (`CTX-0212`, PR #364, decode base64 on OSC 52 write path)   | Allowed OSC 52 reads now base64-encode the clipboard text and push an OSC 52 reply instead of discarding it; the write path base64-decodes before bridging to the clipboard.                                              |
| `CR-TERM-02`   | FIXED   | `bitty` [`38973a0`](https://github.com/bitty-terminal/bitty/commit/38973a0b0cc0d5538404b4a513ceff648f7180b3) (`CTX-0205`, PR #355/#356, bound cursor and tab loops at margins)                                                                                                                                                                          | Cursor-right and tab-forward loops break at the right margin instead of iterating up to 65535 times past the bound.                                                                                                       |
| `CR-COMPAT-01` | FIXED   | `bitty` [`fd8a71a`](https://github.com/bitty-terminal/bitty/commit/fd8a71a4ccefc69272503cc3f264176bceff5d06) (`CTX-0206`, PR #354, prefer singular `recording/` candidates) plus [`0e65f85`](https://github.com/bitty-terminal/bitty/commit/0e65f85d9cf153a2ba3824bfe2c81586015941d1) (`CTX-0211`, PR #366, regenerate baselines post v2/v3 hash drift) | Comparator candidate discovery prefers singular `recording/` paths; baselines regenerated after the v2/v3 hash drift.                                                                                                     |
| `CR-APP-01`    | FIXED   | `bitty` [`743859e`](https://github.com/bitty-terminal/bitty/commit/743859e1f3b94b0dac2575d577af64e6c31c6247) (`CTX-0207`, PR #350, reject unknown flags with usage plus exit 2)                                                                                                                                                                         | Unknown `-` flags are rejected with usage and exit code 2 instead of being treated as program names; the CLI contract already required `UsageError` exit 2, so the code caught up to the contract.                        |
| `CR-TERM-01`   | FIXED   | `bitty` [`2d36084`](https://github.com/bitty-terminal/bitty/commit/2d36084444fa95b437bf6224d7f970c06d21396c) (`CTX-0208`, PR #360, attach combining marks to bounded per-cell buffer)                                                                                                                                                                   | Zero-width and combining scalars attach to a bounded per-cell buffer instead of being dropped; the text-rendering contract already specified combining support, so the code caught up to the contract.                    |
| `CR-UI-01`     | FIXED   | `bitty` [`75f8637`](https://github.com/bitty-terminal/bitty/commit/75f86377ee4f426de8828c381c495babe21905a3) (`CTX-0209`, PR #358, adaptive dwindle `smart_split` orientation)                                                                                                                                                                          | Dwindle splitting selects orientation from the container aspect ratio with `smart_split`, implementing the Hyprland heuristic cited in the finding.                                                                       |
| `CR-LUA-01`    | FIXED   | `bitty` [`58e488a`](https://github.com/bitty-terminal/bitty/commit/58e488a3ab36dd22af47bd00f8b5cd3fbdea6ab0) (`CTX-0210`, PR #362, cap fuel per Executor step slice)                                                                                                                                                                                    | Fuel is capped per `Executor` step slice rather than only at slice boundaries, bounding single-slice overrun latency.                                                                                                     |

### Open (0)

All 16 items are FIXED as of the 2026-09-07 `CTX-0126` sync. Every merged
commit below was verified as an ancestor of `bitty` `origin/main` (head
`1fc6294`) via read-only `git` inspection; no `bitty` state is changed from
this document. The per-item owning `bitty` tasks (`CTX-0197` through
`CTX-0212`) are retained in the Fixed table above as read-only references.
No new remediation work is tracked here.

| ID             | Severity | Owning `bitty` task (read-only) | Finding summary                                                                         | Merged evidence (read-only)                  |
| -------------- | -------- | ------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- |
| `CR-PKG-02`    | CRITICAL | `bitty/CTX-0197`                | Silent TOFU pin check bypass in `TrustMode::Signed` when `candidate_identity` is `None` | `ec95c5c` PR #336, FIXED                     |
| `CR-RICH-02`   | HIGH     | `bitty/CTX-0198`                | Empty or relative resource roots grant universal read via `starts_with("")`             | `fade082` PR #339, FIXED                     |
| `CR-PKG-01`    | CRITICAL | `bitty/CTX-0199`                | `prune` skips the current generation without replacing the removal candidate            | `76005eb` PR #340, FIXED                     |
| `CR-PKG-03`    | CRITICAL | `bitty/CTX-0200`                | Manifest capability parser diverges from the host closed-set validator                  | `33a6731` PR #347/#348, FIXED                |
| `CR-RICH-01`   | HIGH     | `bitty/CTX-0201`                | Public `RichBlock` fields bypass AST node count, depth, and text byte limits            | `7e85887` PR #344, FIXED                     |
| `CR-RENDER-01` | HIGH     | `bitty/CTX-0202`                | Headless `present_draw_list` allocates without a `MAX_SURFACE_BYTES` bound              | `4af50e7` PR #346, FIXED                     |
| `CR-IPC-01`    | HIGH     | `bitty/CTX-0200`/`CTX-0203`     | `metadata` follows symlinks in socket directory and bound socket attestation            | `c5ec211` PR #342, FIXED                     |
| `CR-RT-01`     | HIGH     | `bitty/CTX-0204` + `CTX-0212`   | OSC 52 clipboard read discards text instead of replying base64 (plus write-path decode) | `f725664` PR #352 + `0cb244d` PR #364, FIXED |
| `CR-TERM-02`   | MEDIUM   | `bitty/CTX-0205`                | Unbounded cursor and tab loop iterations on large counts                                | `38973a0` PR #355/#356, FIXED                |
| `CR-COMPAT-01` | MEDIUM   | `bitty/CTX-0206` + `CTX-0211`   | Hardcoded `recordings/` paths break dump discovery after the `recording/` rename        | `fd8a71a` PR #354 + `0e65f85` PR #366, FIXED |
| `CR-APP-01`    | MEDIUM   | `bitty/CTX-0207`                | Unknown CLI flags starting with `-` are treated as program names                        | `743859e` PR #350, FIXED                     |
| `CR-TERM-01`   | MEDIUM   | `bitty/CTX-0208`                | Zero-width scalars and combining characters are silently dropped                        | `2d36084` PR #360, FIXED                     |
| `CR-UI-01`     | MEDIUM   | `bitty/CTX-0209`                | Rigid Dwindle BSP splitting without aspect-ratio heuristics                             | `75f8637` PR #358, FIXED                     |
| `CR-LUA-01`    | LOW      | `bitty/CTX-0210`                | Fuel and step limits are checked only at slice boundaries                               | `58e488a` PR #362, FIXED                     |

---

## Categorized findings ledger

| ID             | Severity     | Crate & File:Line                                                                        | Category           | Summary                                                                                   | Impact                                                                                           |
| -------------- | ------------ | ---------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `CR-PKG-01`    | **CRITICAL** | `bitty-package/src/activation.rs:264-281`                                                | Integrity / Memory | `prune` fails to enforce `max_generations` when current generation was rolled back        | Unbounded generation growth and state leakage across rollback cycles                             |
| `CR-PKG-02`    | **CRITICAL** | `bitty-plugin-host/src/install.rs:289-299`                                               | Security / Sandbox | Silent TOFU pin check bypass in `TrustMode::Signed` when `candidate_identity` is `None`   | Attacker with any valid keystore key can rotate package identity without detection               |
| `CR-PKG-03`    | **CRITICAL** | `bitty-package/src/manifest.rs:357-375` vs `bitty-plugin-host/src/capability.rs:223-226` | Spec / Invariant   | Divergence between package manifest capability parser and host closed-set validator       | Packages lock successfully in package manager but fail at install/activation time                |
| `CR-RICH-01`   | **HIGH**     | `bitty-rich/src/scene.rs:233`                                                            | DoS / Safety       | Public fields in `RichBlock` bypass AST node count, depth, and text byte limits           | Direct instantiation of malicious scene trees causes recursive stack overflow / panic            |
| `CR-RICH-02`   | **HIGH**     | `bitty-rich/src/loader.rs:112, 139`                                                      | Security / Sandbox | `ResourcePolicy::new` allows empty `""` or relative roots                                 | `starts_with("")` evaluates to true, granting universal read access to host filesystem           |
| `CR-RENDER-01` | **HIGH**     | `bitty-render/src/gpu.rs:832`                                                            | Memory / DoS       | Headless `present_draw_list` allocates `RGBA` buffer without checking `MAX_SURFACE_BYTES` | Extreme window dimensions cause massive allocations (gigabytes) or OOM abort                     |
| `CR-RT-01`     | **HIGH**     | `bitty-runtime/src/runtime.rs:3152`                                                      | Terminal Protocol  | OSC 52 clipboard read discards text; no base64 response is generated or pushed to replies | Terminal applications (tmux, neovim) querying clipboard hang or receive empty data               |
| `CR-PLAT-01`   | **HIGH**     | `bitty-platform/src/clipboard.rs:59-71`                                                  | Platform / UX      | `arboard` backend lacks Wayland primary selection support                                 | Middle-click and right-click paste fail on native Wayland compositors (Hyprland, Sway)           |
| `CR-IPC-01`    | **HIGH**     | `bitty-ipc/src/devtools.rs:1878, 1917`                                                   | Security / IPC     | `std::fs::metadata` follows symlinks in socket directory and bound socket attestation     | Potential symlink race condition allowing socket redirection in multi-user temporary directories |
| `CR-TERM-01`   | **MEDIUM**   | `bitty-term-state/src/state.rs:1022-1027`                                                | Terminal Protocol  | Zero-width scalars (`glyph_width == 0`) and combining characters silently dropped         | Broken rendering for accented characters (`e` + `U+0301`), Devanagari, and ZWJ emojis            |
| `CR-TERM-02`   | **MEDIUM**   | `bitty-term-state/src/state.rs:945, 1190`                                                | Resource / DoS     | Unbounded iterations in `TabForward` and `cursor_move(Direction::Right)`                  | Escape sequence with $N=65535$ loops tens of thousands of times past screen bounds               |
| `CR-COMPAT-01` | **MEDIUM**   | `bitty-compat-lab/src/compare.rs:56, 60`                                                 | Tooling / Compat   | Hardcoded `recordings/` candidate paths break dump discovery after `recording/` rename    | Differential comparator cannot locate baseline snapshots on disk                                 |
| `CR-APP-01`    | **MEDIUM**   | `bitty-app/src/main.rs:608-617`                                                          | CLI / Ergonomics   | Unknown CLI flags starting with `-` are treated as program names to spawn                 | Typos like `bitty --confg foo` attempt to execute a binary named `--confg`                       |
| `CR-UI-01`     | **MEDIUM**   | `bitty-ui/src/layout.rs:19-44`                                                           | Architecture / UX  | Rigid Dwindle BSP splitting without container aspect ratio heuristics                     | Sub-optimal pane layout compared to Hyprland's adaptive dwindle algorithm                        |
| `CR-UI-02`     | **LOW**      | `bitty-ui/src/focus.rs:164`                                                              | UX / Focus         | Spatial focus navigation requires exact edge touch; 1-cell gaps cause stuck focus         | Pane focus cannot transition across layouts with uneven borders or outer margins                 |
| `CR-LUA-01`    | **LOW**      | `bitty-lua/src/lib.rs:585`                                                               | Runtime / Limits   | Fuel and step limits checked only at slice boundaries, not mid-slice                      | Potential minor latency spikes if a single opcode slice overruns target duration                 |

---

## Detailed deep-dives on critical and high findings

### 1. `CR-PKG-01`: Unbounded generation growth after rollback in `bitty-package`

- **Location**: `bitty/crates/bitty-package/src/activation.rs:264-281`
- **Criterion**: R-022, Package Lifecycle Invariant 7 (strict generation bound enforcement)
- **Root Cause**: The `Environment::prune` function attempts to remove the oldest generations when `self.generations.len() > self.policy.max_generations`. It calculates `to_remove = self.generations.len() - self.policy.max_generations`, sorts all generation IDs, and executes `for id in ids.into_iter().take(to_remove)`. If `Some(id) == self.current`, the loop executes `continue`. Because `take(to_remove)` was evaluated before filtering out `self.current`, skipping `self.current` leaves the generation in the map and fails to prune an alternative candidate. If `self.current` was rolled back to an early generation ID, `prune()` repeatedly removes fewer than `to_remove` items (or zero items), causing the generation table to grow without bound.
- **Current Code**:

```rust
pub fn prune(&mut self) -> Vec<u64> {
    if self.generations.len() <= self.policy.max_generations {
        return Vec::new();
    }
    let mut ids: Vec<u64> = self.generations.keys().copied().collect();
    ids.sort_unstable();
    let to_remove = self.generations.len() - self.policy.max_generations;
    let mut pruned = Vec::new();
    for id in ids.into_iter().take(to_remove) {
        if Some(id) == self.current {
            continue; // Defect: skips without decrementing to_remove!
        }
        self.generations.remove(&id);
        pruned.push(id);
    }
    pruned
}
```

- **Remediation**: Filter `self.current` out of the candidate list prior to taking `to_remove`, and loop while the map size exceeds the retention ceiling:

```rust
pub fn prune(&mut self) -> Vec<u64> {
    let mut pruned = Vec::new();
    let mut ids: Vec<u64> = self
        .generations
        .keys()
        .copied()
        .filter(|&id| Some(id) != self.current)
        .collect();
    ids.sort_unstable();

    let target_remove = self.generations.len().saturating_sub(self.policy.max_generations);
    for id in ids.into_iter().take(target_remove) {
        if self.generations.remove(&id).is_some() {
            pruned.push(id);
        }
    }
    pruned
}
```

---

### 2. `CR-PKG-02`: Silent TOFU pin check bypass in `bitty-plugin-host`

- **Location**: `bitty/crates/bitty-plugin-host/src/install.rs:289-299`
- **Criterion**: R-018 (Trust-On-First-Use Pinning Integrity)
- **Root Cause**: In `verify_install()`, when evaluating `TrustMode::Signed`, the verification checks the signature against the `KeyStore`. If a `trust_store` is also present, the specification requires enforcing the pinned candidate identity (subsuming TOFU). However, lines 290-298 wrap the check in `if let Some(candidate) = inputs.candidate_identity`. When an attacker creates an artifact signed by any valid key in the shared keystore but passes `candidate_identity: None`, the block is silently skipped. In contrast, `TrustMode::TrustOnFirstUse` fails closed if `candidate_identity` is `None`.
- **Current Code**:

```rust
TrustMode::Signed => {
    // ... signature verified ...
    if let Some(store) = inputs.trust_store {
        if let Some(candidate) = inputs.candidate_identity {
            let pid = bitty_package::PackageId::new(inputs.package_id)...;
            store.check(&pid, candidate)?;
        }
    }
}
```

- **Remediation**: In `TrustMode::Signed`, fail closed when `inputs.trust_store` is present but `inputs.candidate_identity` is absent:

```rust
TrustMode::Signed => {
    // ... signature verified ...
    if let Some(store) = inputs.trust_store {
        let candidate = inputs.candidate_identity.ok_or_else(|| {
            PackageError::source("trust V-C with trust store requires candidate identity")
        })?;
        let pid = bitty_package::PackageId::new(inputs.package_id).map_err(|e| {
            PackageError::source(format!("invalid package id '{}': {e}", inputs.package_id))
        })?;
        store.check(&pid, candidate)?;
    }
}
```

---

### 3. `CR-PKG-03`: Closed-set capability divergence between Package and Host

- **Location**: `bitty/crates/bitty-package/src/manifest.rs:357-375` vs `bitty/crates/bitty-plugin-host/src/capability.rs:223-226`
- **Criterion**: R-006, R-016, P0-AC-030 (Capability Deny-by-Default Closed Set)
- **Root Cause**: `bitty-package` manifest validation only verifies that the first dot-separated segment (`parts[0]`) belongs to `KNOWN_FAMILIES`. Any identifier like `terminal.arbitrary_resource_name` passes package validation and can be locked and signed. However, `bitty-plugin-host/src/capability.rs` executes `is_known_capability(head, ...)`, strictly validating against the closed normative list. Consequently, packages that pass package manager validation fail during installation or activation, breaking lockfile determinism.
- **Remediation**: Export the canonical capability validation function from `bitty-plugin-host` (or move it to a shared core crate) and invoke it inside `bitty-package::manifest::validate_capability`.

---

### 4. `CR-RICH-01`: Public fields in `RichBlock` allow AST limit bypass

- **Location**: `bitty/crates/bitty-rich/src/scene.rs:233-250`, `scene.rs:463-485`
- **Criterion**: R-021, P0-AC-010, T-13 (Constrained AST Boundaries)
- **Root Cause**: `RichBlock` defines all its fields as `pub`:

```rust
pub struct RichBlock {
    pub id: BlockId,
    pub version: u32,
    pub anchor: BlockAnchor,
    pub content: SceneNode,
    pub scroll: ScrollBehavior,
    pub owner: u64,
    pub generation: u64,
    pub created_at: u64,
}
```

While `RichBlock::new()` enforces SCN-1..3 (`count_nodes <= 256`, `depth <= 8`, `text_bytes <= 16384`), any code or plugin host constructor can directly instantiate `RichBlock { content: SceneNode::Unknown("x".repeat(10_000_000)), ... }`. In `Scene::insert()`, only block ID uniqueness and total aggregate bytes are checked. An unconstrained AST can be inserted, triggering stack overflows during recursive layout or rendering.

- **Remediation**: Either make the struct fields private with accessors, or add an explicit validation step inside `Scene::insert` and `Scene::replace_content`:

```rust
pub fn insert(&mut self, block: RichBlock) -> Result<(), SceneError> {
    if block.content.count_nodes() > SCENE_MAX_NODES_PER_BLOCK {
        return Err(SceneError::NodesTooMany {
            count: block.content.count_nodes(),
            cap: SCENE_MAX_NODES_PER_BLOCK,
        });
    }
    if block.content.depth() > SCENE_MAX_DEPTH {
        return Err(SceneError::DepthTooDeep {
            depth: block.content.depth(),
            cap: SCENE_MAX_DEPTH,
        });
    }
    // ... continue insertion ...
}
```

---

### 5. `CR-RICH-02`: Universal file access via empty roots in `ResourcePolicy`

- **Location**: `bitty/crates/bitty-rich/src/loader.rs:112, 139`
- **Criterion**: R-003, P0-AC-005, T-03 (Resource Isolation & Deny-by-Default)
- **Root Cause**: `ResourcePolicy::new(roots)` stores roots without checking if any path is empty `""`, relative, or contains parent traversal components (`..`). In `is_allowed(&self, canonical: &Path)`:

```rust
if canonical.starts_with(root) {
    return true;
}
```

In standard Rust `std::path::Path`, `Path::new("/etc/passwd").starts_with(Path::new(""))` returns `true`. If an empty root is configured, every path on the system is permitted.

- **Reference**: Ghostty `src/terminal/graphics_image.zig:17-440` resolves symlinks with `realPath`, enforces absolute paths, and strictly forbids `/proc`, `/sys`, and root traversal.
- **Remediation**: In `ResourcePolicy::new`, reject any root that is empty, non-absolute, or un-canonicalizable:

```rust
pub fn new(roots: Vec<PathBuf>) -> Result<Self, ResourceError> {
    if roots.len() > MAX_ROOTS {
        return Err(ResourceError::TooLong { len: roots.len(), cap: MAX_ROOTS });
    }
    for root in &roots {
        if root.as_os_str().is_empty() || !root.is_absolute() {
            return Err(ResourceError::InvalidPath {
                reason: "resource roots must be non-empty and absolute".into(),
            });
        }
    }
    Ok(Self { roots })
}
```

---

### 6. `CR-RENDER-01`: Unbounded headless memory allocation in `bitty-render`

- **Location**: `bitty/crates/bitty-render/src/gpu.rs:830-832`
- **Criterion**: Threat T-01 (Heap & Memory Boundedness)
- **Root Cause**: In `gpu.rs`, headless presentation allocates a CPU rasterization buffer:

```rust
let width = config.extent.width();
let height = config.extent.height();
let mut rgba = vec![0u8; width as usize * height as usize * 4];
```

Unlike `bitty-render/src/software.rs:33` which explicitly guards allocations against `MAX_SURFACE_BYTES = 64 * 1024 * 1024`, `gpu.rs` performs a direct `vec![0u8; ...]` allocation. Passing large window dimensions (such as `u32::MAX` or `16384x16384`) in headless profiling or tests triggers an out-of-memory crash.

- **Remediation**: Guard the computation using checked arithmetic against `MAX_SURFACE_BYTES`:

```rust
let width = config.extent.width() as usize;
let height = config.extent.height() as usize;
let required_bytes = width
    .checked_mul(height)
    .and_then(|px| px.checked_mul(4))
    .ok_or_else(|| RenderError::InvalidInput { reason: "surface extent overflow" })?;

if required_bytes > MAX_SURFACE_BYTES {
    return Err(RenderError::SurfaceExtentTooLarge {
        size: required_bytes,
        cap: MAX_SURFACE_BYTES,
    });
}
let mut rgba = vec![0u8; required_bytes];
```

---

### 7. `CR-RT-01`: OSC 52 read silently discards clipboard text

- **Location**: `bitty/crates/bitty-runtime/src/runtime.rs:3141-3155`
- **Criterion**: R-004, P0-AC-007 (OSC 52 Protocol & Consent Model)
- **Root Cause**: When an application issues an OSC 52 read request (`\x1b]52;c;?\x07`), Bitty checks `self.osc_clipboard_read_allowed`. When allowed, it executes line 3152: `let _ = self.clipboard.get_text();`. The returned string is immediately dropped without formatting, base64 encoding, or replying. Furthermore, both branches execute `continue`, preventing the action from reaching `self.state.apply(&action)`. Applications expecting clipboard responses hang until timing out.
- **Reference**: Ghostty `src/terminal/clipboard.zig:72-248` and `clipboard_response.zig:14-27` format responses as `\x1b]52;<location>;<base64_payload>\x1b\\` and write them back to the PTY reader channel.
- **Remediation**: Base64-encode the clipboard text, construct the OSC 52 reply string, and push it to `self.state.push_reply()`.

---

### 8. `CR-PLAT-01`: Missing native Wayland clipboard and primary selection backend

- **Location**: `bitty/crates/bitty-platform/src/clipboard.rs:59-71`
- **Criterion**: ADR-0002, GitHub Issues #257 / #260 (Wayland Support Tier)
- **Root Cause**: `bitty-platform` delegates clipboard operations solely to `arboard::Clipboard`. On Linux, `arboard` uses standard X11 or Wayland data device protocols but does not support the Wayland primary selection protocol (`zwp_primary_selection_device_manager_v1`). As a result, mouse selection auto-copy, middle-click paste, and cross-application selection syncing fail on pure Wayland compositors (Hyprland, Sway) without Xwayland.
- **Reference**: Ghostty implements native Wayland clipboard protocols (`src/terminal/clipboard.zig`), supporting both standard clipboard and primary selection buffers with chunked reading and writing.
- **Remediation**: Implement a dedicated Wayland clipboard backend in `bitty-platform` using `wayland-client` and `wayland-protocols`, integrating with Winit's Wayland window handle to manage primary selection events.

---

### 9. `CR-IPC-01`: Symlink traversal vulnerability during socket directory attestation

- **Location**: `bitty/crates/bitty-ipc/src/devtools.rs:1878, 1917`
- **Criterion**: Threat T-03 (IPC Socket Hijacking)
- **Root Cause**: `attestation_for()` and `attest_bound_socket()` call `std::fs::metadata(path)`. In POSIX systems, `metadata` follows symbolic links. If an attacker on a shared multi-user machine creates a symbolic link in `/tmp/bitty-<uid>/` pointing to another user-owned `0700` directory, the permission check succeeds.
- **Remediation**: Replace `std::fs::metadata` with `std::fs::symlink_metadata` to inspect the link itself, and reject symlinks fail-closed:

```rust
let meta = std::fs::symlink_metadata(parent).map_err(...)?;
if meta.file_type().is_symlink() {
    return Err(IpcError::Unauthenticated {
        reason: "socket directory must not be a symbolic link".into(),
    });
}
```

---

## Detailed deep-dives on medium behavioral defects

### 1. `CR-TERM-01`: Zero-width scalars and combining accents silently dropped

- **Location**: `bitty/crates/bitty-term-state/src/state.rs:1022-1027`
- **Root Cause**: When printing characters, `char_cell_width(ch)` evaluates to 0 for zero-width scalars (combining diacritics `U+0300..U+036F`, ZWJ `U+200D`, variation selectors). `state.rs` handles this via:

```rust
let glyph_width = char_cell_width(ch);
if glyph_width == 0 || ch == '\0' {
    return; // Dropped!
}
```

- **Impact**: Accented letters entered via decomposed sequences (`e` + `\u{301}` -> `é`) lose their accents completely. Emojis with ZWJ sequences (e.g. family or profession sequences) and complex scripts (Devanagari, Arabic, Thai) render incorrectly with missing vowels or uncombined base glyphs.
- **Reference Comparison**:
  - **Alacritty** (`recording/references/alacritty/alacritty_terminal/src/term/cell.rs:13`): Allocates a fixed array `zerowidth: [char; 9]` in `Cell` or attaches overflow to a bounded grapheme store.
  - **Xterm** (`recording/references/xterm/charproc.c:3095-3158`): Stores up to 5 combining characters per cell via `max_combining`.
- **Remediation**: Extend `Cell` in `bitty-term-state` to carry a bounded combining buffer (e.g. `[char; 3]` inline or an index into a bounded grapheme table) and append zero-width characters to the preceding cell when `glyph_width == 0`.

---

### 2. `CR-TERM-02`: Unbounded CPU amplification in cursor and tab navigation

- **Location**: `bitty/crates/bitty-term-state/src/state.rs:945, 1190`
- **Root Cause**:
  1. In `cursor_move(Direction::Right, n)`:

```rust
let mut c = col as usize;
for _ in 0..n {
    if c < last_col as usize {
        c += 1;
        // ...
    }
}
```

When `n` is large (e.g. `65535`), once `c == last_col`, the remaining tens of thousands of iterations continue checking `c < last_col as usize`, consuming CPU cycles unnecessarily. 2. In `TerminalAction::TabForward { n }`:

```rust
for _ in 0..effective_count(*n) {
    col = self.tabs.next_after(col).unwrap_or(self.width - 1);
}
```

Once `col == self.width - 1`, `self.tabs.next_after(col)` repeatedly scans the tab stop bitset and returns `None` up to 65,535 times.

- **Remediation**: Add an early `break` when boundary limits are reached:

```rust
// In TabForward:
for _ in 0..effective_count(*n) {
    match self.tabs.next_after(col) {
        Some(next) => col = next,
        None => {
            col = self.width - 1;
            break; // Stop scanning once at right margin!
        }
    }
}
```

---

### 3. `CR-COMPAT-01`: Outdated snapshot candidate paths after `recordings/` directory rename

- **Location**: `bitty/crates/bitty-compat-lab/src/compare.rs:56, 60`
- **Root Cause**: The project renamed `recordings/` to `recording/` across all repositories. However, `compare.rs` hardcodes:

```rust
let ws_rec = workspace_root().join("recordings/references/bitty");
let umbrella_rec = PathBuf::from("/mnt/data/Workspace/Projects/bitty-terminal/recordings/references/bitty");
```

Because the plural form `recordings` is hardcoded, the differential comparator fails to locate baseline dumps in `recording/references/`.

- **Remediation**: Update candidate discovery in `compare.rs` to check `recording/references/` (singular).

---

### 4. `CR-APP-01`: Unknown CLI flags converted to runnable binary paths

- **Location**: `bitty/crates/bitty-app/src/main.rs:608-617`
- **Root Cause**: When `parse_args` encounters an unrecognized flag starting with `-`:

```rust
s if s.starts_with('-') => {
    eprintln!("warning: unknown flag {s:?} — treating as program name");
    if !program_set {
        out.program = Some(token.clone());
        program_set = true;
    } else {
        out.program_args.push(token.clone());
    }
    i += 1;
}
```

If a user makes a typo like `bitty --font-siz 14`, the binary treats `--font-siz` as the executable to launch in a PTY.

- **Remediation**: Reject unrecognized flags with a clear error message, usage display, and exit code 2. Only allow arguments after an explicit `--` token to be treated as program names.

---

## Open-source reference architecture & protocol enhancements

By cross-referencing the Bitty codebase against the reference snapshots in `recording/references/`, the following architectural enhancements are identified:

### 1. Clipboard OTP & Granular Paste Safety (Ghostty Pattern)

- **Reference**: `recording/references/ghostty/src/terminal/clipboard.zig`, `clipboard_grants.zig:16-135`
- **Architecture**: Ghostty implements a one-time pad (OTP) grant system for clipboard operations:
  - When an application requests an OSC 52 read or sensitive paste, an OTP token is generated (`randomSecure` rejection sampling, 22 alphanumeric characters, stored in an LRU 32 cache).
  - The paste or reply is gated until the user explicitly confirms the action.
  - Ghostty implements chunked replies (`read_chunk_size = 4096`) for large payloads, preventing memory spikes.
- **Bitty Application**: Bitty's `paste.rs` has a strong static inspection gate (detecting C0, C1, BiDi, and escape codes). Adding Ghostty's OTP grant mechanism to `bitty-rich/src/clipboard.rs` will enable safe, interactive clipboard reads without ambient read permissions.

### 2. Streaming Kitty Graphics Protocol with FIFO Eviction (Kitty & Ghostty Pattern)

- **Reference**: `recording/references/ghostty/src/terminal/graphics_image.zig`, `graphics_storage.zig:127-353`
- **Architecture**:
  - `bitty-rich/src/kitty.rs` is currently an inert placeholder stub.
  - Ghostty and Kitty support chunked graphics transmission (`m=1` for continuation chunks, `m=0` for final chunk), with total image storage bounded (e.g. 320 MiB in Ghostty, configurable in Kitty).
  - Unreferenced images are pruned via LRU/FIFO prior to reserving space for new images, avoiding memory fragmentation.
- **Bitty Application**: Implement a streaming state machine in `bitty-rich/src/kitty.rs` backed by `ImageStore`, enforcing maximum dimensions (10,000 px) and pre-allocation checks.

### 3. Adaptive Dwindle BSP Tiling (Hyprland Pattern)

- **Reference**: `recording/references/hyprland/src/layout/algorithm/tiled/dwindle/DwindleAlgorithm.cpp:27-57`
- **Architecture**: Hyprland's dwindle algorithm automatically selects split orientation based on the parent pane's aspect ratio and multiplier (`splitTop = box.h * split_width_multiplier > box.w`). It supports `smart_split` (splitting based on cursor quadrant) and `preserve_split` (maintaining tree structure when nodes are closed).
- **Bitty Application**: Enhance `bitty-ui/src/layout.rs` with `smart_split` heuristics so opening a new pane automatically chooses horizontal or vertical split based on terminal cell dimensions, matching Hyprland's native feel.

### 4. Modular Panel Runtime with Async Workers (Waybar Pattern)

- **Reference**: `recording/references/waybar/include/IModule.hpp`, `src/bar.cpp:619`
- **Architecture**: Waybar decouples worker threads from UI rendering:
  - Modules (`IModule`) run periodic polls or continuous line streams on worker threads and communicate state changes through thread-safe channels (`dp.emit`).
  - Workers never directly touch the UI or block the event loop.
- **Bitty Application**: Refactor the panel runtime in `bitty-runtime` (`tabs.rs`, `statusline.rs`, `git_panel.rs`, `file_manager.rs`) to use asynchronous event channels with backpressure, preventing slow panel operations (such as Git status evaluation) from causing frame drops.

### 5. Agent Tool Bus with Credential Scrubbing (Hermes-Agent Pattern)

- **Reference**: `recording/references/hermes-agent/tools/registry.py:1-120`, `mcp_tool.py:655-735`
- **Architecture**:
  - Hermes implements a centralized tool registry where every tool input and output passes through credential scrubbing (`_filter_env`, `strip_credentials`), removing API keys, tokens, and authorization headers before logging or returning results.
  - Tools declare JSON schemas and are validated at runtime before execution.
- **Bitty Application**: Upgrade `bitty-agent/src/tool.rs` from static vocabulary stubs to an active tool execution bus with schema validation and credential scrubbing.

### 6. Floating Overlay Panels and Extmarks (Neovim Pattern)

- **Reference**: `recording/references/neovim/src/nvim/api/win_config.c:50`, `api/extmark.c:403`
- **Architecture**: Neovim allows plugins to attach floating windows (`nvim_open_win`) and non-destructive virtual text / signs (`extmarks`) to buffers with explicit z-index tiers (Editor 0, Float 50, Popup 100, Messages 200).
- **Bitty Application**: Adopt explicit z-index stacking in `bitty-ui` for floating search overlays, command palettes, and plugin popups over terminal grids.

---

## Actionable remediation roadmap

To systematically address these findings without disrupting active work streams.
Owning `bitty` tasks for every item are listed under
[Remediation triage](#remediation-triage-2026-09-06-ctx-0125). As of the
2026-09-07 `CTX-0126` sync all 16 items are FIXED there and need no new work;
the phase plan below is retained as the historical execution record.

1. **Phase 1: Security & Sandboxing Hardening (P0 / Urgent)**
   - Fix `CR-PKG-01`: Reorder `prune()` in `bitty-package/src/activation.rs` to filter out `self.current` before slicing.
   - Fix `CR-PKG-02`: Require `candidate_identity` in `bitty-plugin-host/src/install.rs` when `trust_store` is present under `TrustMode::Signed`.
   - Fix `CR-RICH-01` & `CR-RICH-02`: Encapsulate `RichBlock` fields and validate resource roots in `bitty-rich/src/loader.rs`.
   - Fix `CR-RENDER-01`: Add surface byte bounds check in `bitty-render/src/gpu.rs`.
   - Fix `CR-IPC-01`: Use `symlink_metadata` and reject symlinks in `bitty-ipc/src/devtools.rs`.

2. **Phase 2: Terminal Protocol & Platform Fidelity (P1 / High)**
   - Fix `CR-RT-01`: Implement base64 response formatting for OSC 52 read in `bitty-runtime/src/runtime.rs`.
   - Fix `CR-PLAT-01`: already FIXED per triage (`bitty` `6984343`/`1297c14`); no further work.
   - Fix `CR-TERM-01`: Introduce combining character storage in `bitty-term-state/src/cell.rs` and `state.rs`.
   - Fix `CR-TERM-02`: Add boundary break conditions to cursor and tab loops in `state.rs`.
   - Fix `CR-COMPAT-01`: Update candidate snapshot paths in `bitty-compat-lab/src/compare.rs`.
   - Fix `CR-APP-01`: Strict CLI argument parsing in `bitty-app/src/main.rs`.

3. **Phase 3: Extensibility & UI Enhancements (P2 / Normal)**
   - Implement `ENH-03`: Adaptive Dwindle BSP splitting in `bitty-ui`.
   - Implement `ENH-02`: Streaming Kitty graphics protocol in `bitty-rich`.
   - Implement `ENH-01`: Ghostty-style OTP clipboard grants.
   - Implement `ENH-05`: Credential scrubbing in `bitty-agent`.
