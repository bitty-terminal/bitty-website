---
title: Reference Project Register
description: Records reproducible local snapshots and research questions for terminal and extensibility reference projects.
category: project
audience: contributor
document_type: research
status: draft
website_publish: false
sidebar_order: 90
---

# Reference Project Register

## Purpose and boundaries

Reference repositories live under `tmp/references/` in the local workspace.
They support architecture research, protocol comparison, learning performance
methods, and the design of future differential tests.

These clones are **reproducible research snapshots**, not:

- Bitty dependency pins;
- accepted technology choices;
- vendored source;
- commitments to begin a fork;
- Bitty compatibility guarantees for the reference projects.

Technical conclusions must enter a research note, RFC, or ADR with the observed
commit recorded. “Another project does it this way” cannot replace Bitty's own
constraints and validation.

## Current snapshots

| Project | Local directory          | Commit                                     | Primary research topics                                                                            |
| ------- | ------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Ghostty | `tmp/references/ghostty` | `8867c37c55b578b9eb4cfaba41cb9023e557176d` | Core/frontend boundaries, VT, fonts, rendering, protocols, security, and Agent documentation       |
| Neovim  | `tmp/references/neovim`  | `a1de07418b89f1b30f9ca088306b2c1615f928c3` | Command/Event/API, Lua configuration and plugins, UI protocol, and ecosystem boundaries            |
| kitty   | `tmp/references/kitty`   | `087b8c35c455e1fa21a727916efdaf59ebdd0168` | GPU performance, glyph cache, Kitty Graphics/keyboard, and protocol limits                         |
| WezTerm | `tmp/references/wezterm` | `f93d90350075d3e42566e0557ca36e82ffdcbec1` | Rust/Lua, terminal/mux/GUI layers, cross-platform support, image protocols, and software rendering |

The registration date is 2026-08-25. The clones have shallow history, and each
commit provides an exact reference for current observations. Updating a clone
requires updating this table or pinning the old commit in the relevant research
document.

## Research questions

### Ghostty

- What are the actual dependency directions between its library/core and
  desktop frontends?
- How have the public boundaries of the parser, terminal state, font system, and
  renderer evolved?
- How does the project organize resource limits, fuzzing, and security fixes for
  untrusted escape sequences?
- Which practices from `AGENTS.md` and the cross-platform development workflow
  are reusable?

### Neovim

- How do Command, autocmd/Event, Lua, RPC, and external UI share stable
  contracts?
- Which parts of runtimepath and module discovery are successful, and which are
  historical burdens?
- Which aspects of configuration reload, plugin unload, and state ownership
  should not be copied directly?
- How can the multigrid/UI protocol validate the separation of Terminal, View,
  and Layout?

### kitty

- How do the child-I/O, parser, and renderer execution domains avoid blocking
  one another?
- How do the glyph atlas, damage tracking, and GPU uploads maintain low latency?
- What are the actual semantics of image and placement, z-index, scrolling, and
  animation in Kitty Graphics?
- What are the boundary conditions for the keyboard protocol and long or
  malicious control sequences?

### WezTerm

- How does `wezterm-term` remain independent of GUI and PTY code, and which
  boundaries make suitable differential oracles?
- What known constraints arise from repeated Lua configuration evaluation and
  runtime side effects?
- How are the mux, GUI, headless, and remote domains layered?
- How are OpenGL, WebGPU, and software renderers and platform fallback
  strategies tested?

## Usage rules

- Prefer `rg` and `ctxctl outline/symbol/read/deps` for narrow research.
  Never dump an entire file or repository into Agent context.
- Research notes must include the project name, commit, file or symbol, and
  observation, not merely a second-hand conclusion.
- Check the license before copying code. Research does not automatically
  authorize copying.
- A component that appears reusable upstream still requires the wrapper, fork,
  and exit-condition evaluation defined in the
  [Technology and Dependency Strategy](technology-strategy.md).
- Do not modify a reference clone. Put experimental patches in a separate
  worktree or an explicit experiment directory under the project `tmp/`.

## Future candidates

The early discussion also identified Alacritty and foot as important reference
projects. Alacritty is useful for studying a pure VT parser and minimal
boundaries, while foot is useful for studying a Wayland-native, small,
high-performance implementation and server mode. Whether to clone them, which
commit to pin, and who owns the research remain undecided.
