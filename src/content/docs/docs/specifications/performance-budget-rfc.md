---
title: Performance Budget RFC
description: Defines measurable startup, memory, latency, package-size, and idle-resource budgets for lightweight Bitty operation.
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 13
---

# Performance Budget RFC

## Document status

- Status: **accepted** on 2026-08-26 by the project initiator.
- Closes open question [OQ-001](../decisions/open-questions.md); acceptance was
  recorded per the
  [documentation workflow](../development/documentation-workflow.md).
- Implementation status: no Bitty product code exists. Every budget below is a
  **target contract for future implementation**, not a claim about current
  behavior. None of these numbers has been measured against a real build.
- Provenance rule: all comparative figures come from third-party public
  sources of varying methodology rigor, following the provenance rules of the
  [documentation workflow](../development/documentation-workflow.md). They
  justify the order of magnitude of each budget, not an exact value.

## Purpose and scope

The [product vision](../product/vision.md) accepts "lightweight" as a core
product property. This RFC quantifies it with measurable
budgets so that "lightweight" can gate implementation, CI, and release
decisions instead of remaining marketing language.

In scope: cold startup time, idle memory, typical-session memory, input
latency, installed/binary package size, throughput floor, and idle CPU/GPU
resource use for the **default configuration of the `bitty` application with
no plugins enabled beyond the bundled minimum**.

Out of scope: plugin-specific budgets (owned by the future
isolation/resource RFC under OQ-014), rendering throughput ceilings, battery
metrics, and platform-tier-specific relaxations (OQ-003).

## Reference landscape

All figures are external observations, reproduced here with their provenance
class. Third-party terminal benchmarks vary widely in hardware, method, and
version pinning; several are single-author blogs without reproducible
harnesses. They are used directionally.

### Community Wayland benchmark suite

[moktavizen/terminal-benchmark](https://github.com/moktavizen/terminal-benchmark)
(community repository, five-run averages, Linux/Wayland, methodology published
in-repo):

| Terminal  | Startup (avg, lower better) | Idle memory (btop, avg) |
| --------- | --------------------------- | ----------------------- |
| Alacritty | 16.7                        | 75 MB                   |
| Ghostty   | 38.3                        | 174 MB                  |
| WezTerm   | 30.8                        | 130 MB                  |

### Independent macOS reviews

[DevToolReviews macOS comparison](https://www.devtoolreviews.com/reviews/iterm2-vs-warp-vs-ghostty-vs-alacritty-mac)
(single-author review site; hyperfine startup, Activity Monitor RSS on M4;
methodology stated inline): Alacritty ~65 ms cold start / ~14 MB idle RAM,
Ghostty ~95 ms cold start / ~28 MB idle RAM, key-to-screen input latency ~3 ms
for both. A [related DevToolReviews page](https://www.devtoolreviews.com/reviews/best-terminal-emulators-2026)
reports similar values (~2–3 ms input latency; 22–28 MB idle; 45–95 MB after
8 tabs over 4 hours).

[NovVista 14-day daily-use comparison](https://novvista.com/ghostty-1-0-vs-warp-oss-vs-wezterm-14-days-of-daily-use-real-latency-memory-and-workflow-numbers/)
(single-author field test, M3 MacBook Pro, macOS `footprint` sampling):
Ghostty 1.0 keystroke-to-screen P50 under 5 ms, cold start under 100 ms, idle
memory 54 MB; WezTerm idle 96 MB, 20 mixed tabs 612 MB.

### Linux comparisons and long-session behavior

[Ettayeb Linux GPU-terminal comparison](https://ettayeb.fr/en/linux/gpu-terminals-2026/)
(personal blog, methodology not fully published): Alacritty ~40 MB idle,
Kitty ~85 MB, WezTerm ~110 MB; kitty built-in benchmark throughput
~134 MB/s vs Alacritty ~54 MB/s and WezTerm ~48.5 MB/s.

[Umaranis foot-vs-Ghostty study](https://umaranis.com/2025/12/12/foot-vs-ghostty-memory-consumption/)
(personal blog, CachyOS Arch packages, Ghostty 1.2.3): Ghostty one window
~229 MB RSS by that measurement (notably higher than other sources),
illustrating both cross-method variance and a reported growth-over-time issue
on that platform. Lesson adopted below: budgets must constrain **growth over
time**, not only first-launch footprint.

### Interpretation

Across sources, the consistent pattern is:

- Minimal Rust terminals (Alacritty-class) idle at roughly 15–75 MB depending
  on measurement method and platform.
- Feature-rich but efficient terminals (Ghostty-class) land roughly 28–170 MB
  idle and under ~100 ms cold start on Apple Silicon.
- Multiplexing/extensibility-heavy terminals (WezTerm-class) sit at
  ~96–130 MB idle and scale steeply with tab count.
- Key-to-screen latency of 2–5 ms P50 is achievable today by multiple
  implementations.

Bitty aims to be Ghostty-class in capability while keeping an Alacritty-class
floor when plugins are disabled, which motivates budgets between those bands.

## Budgets

Status: **accepted targets**, none measured yet. Each budget names its metric,
measurement condition, and rationale. Enforcement mechanisms (benchmark
harness, CI gates) require a follow-up implementation task before any of these
become acceptance criteria.

### PB-1 Cold startup time

- Budget: **≤ 100 ms p50 and ≤ 200 ms p99** from process launch to first
  rendered prompt frame, default config, warm OS file cache, local shell.
- Rationale: matches Ghostty's measured sub-100 ms class on modern hardware
  ([NovVista](https://novvista.com/ghostty-1-0-vs-warp-oss-vs-wezterm-14-days-of-daily-use-real-latency-memory-and-workflow-numbers);
  [toolchew](https://toolchew.com/en/review-ghostty-2026/) reports 95 ms for
  Ghostty 1.3 vs 65 ms Alacritty on M4). The Lua configuration VM and font
  shaping are the known startup risks; the budget forces lazy plugin loading
  rather than assuming it.
- Measurement: median/p99 of ≥ 50 launches via `hyperfine` or equivalent,
  recorded per Tier 1 platform once they exist.

### PB-2 Idle memory

- Budget: **≤ 80 MB RSS p50** with one window, default scrollback, no
  activity for 60 s, plugins disabled beyond the bundled minimum.
- Rationale: sits between the Alacritty band (14–75 MB across methods) and the
  Ghostty band (28–174 MB), acknowledging that Bitty's core carries a plugin
  host that minimal terminals lack. The [moktavizen](https://github.com/moktavizen/terminal-benchmark)
  Wayland numbers (75–174 MB) show RSS inflation from shared GPU stacks on
  Linux; 80 MB is achievable without excluding wgpu-based rendering.

### PB-3 Typical-session memory and growth

- Budgets:
  - **≤ 250 MB RSS** with 8 tabs after a 4-hour mixed session (the scenario
    used by [DevToolReviews](https://www.devtoolreviews.com/reviews/best-terminal-emulators-2026):
    Ghostty 95 MB, Kitty 110 MB, WezTerm-class higher).
  - **No monotonic growth**: RSS after window close plus forced GC/reclaim
    must return within 15% of the pre-open baseline. This encodes the lesson
    from the [foot-vs-Ghostty growth observation](https://umaranis.com/2025/12/12/foot-vs-ghostty-memory-consumption/).
- Rationale: the vision's promise that disabling a plugin removes its resident
  cost needs a reclaim criterion, not just a static ceiling.

### PB-4 Input latency

- Budget: **≤ 8 ms key-to-screen p50 and ≤ 15 ms p99**, measured keystroke to
  photon (Wayland) or frame-presented timestamp, 60 Hz minimum display.
- Rationale: current leaders measure 2–5 ms p50
  ([DevToolReviews](https://www.devtoolreviews.com/reviews/iterm2-vs-warp-vs-ghostty-vs-alacritty-mac);
  [NovVista](https://novvista.com/ghostty-1-0-vs-warp-oss-vs-wezterm-14-days-of-daily-use-real-latency-memory-and-workflow-numbers)),
  but Bitty reserves headroom for the plugin event pipeline. The normative
  rule that plugins never enter the input hot path
  ([core boundaries](../architecture/core-boundaries.md)) is what makes this
  budget defensible; the p50/p99 split detects tail spikes from interception
  events even when the median stays fast.

### PB-5 Package size

- Budgets:
  - Stripped release binary of `bitty-app`: **≤ 25 MB** per Tier 1 platform.
  - Default distribution download (binary plus bundled plugins and assets,
    compressed): **≤ 40 MB**.
- Rationale: no directly comparable, well-sourced figure exists for terminal
  binaries specifically; this is an **inference** anchored on typical Rust GUI
  application sizes and the dependency-governance principle that the core
  stays small ([technology strategy](../project/technology-strategy.md)).
  Marked lower-confidence than PB-1 through PB-4; should be revisited after
  the first real link.

### PB-6 Throughput floor

- Budget: **≥ 40 MB/s sustained VT parse-and-render** on a single core of the
  slowest Tier 1 reference machine, using a fixed synthetic corpus.
- Rationale: third-party measurements place Alacritty near 54 MB/s and WezTerm
  near 48.5 MB/s ([ettayeb](https://ettayeb.fr/en/linux/gpu-terminals-2026/)),
  with kitty leading at ~134 MB/s. A floor well under the weakest observed
  peer prevents pathological regressions without committing to winning a
  throughput race that is not a product goal.

### PB-7 Idle resource usage

- Budgets:
  - **≤ 1% average CPU** with one idle window over 10 minutes (equivalently,
    matching the 0.007–0.011% instantaneous band reported for
    Alacritty/Kitty-class terminals in community measurements, allowing
    compositor-driven wakeup differences).
  - **Zero periodic wakeups attributable to Bitty** when no PTY output,
    animation, or plugin timer is active (frame-on-demand rendering).
- Rationale: the vision requires predictable resource use and no core runtime
  cost from unused capabilities. Frame-on-demand rendering is also what kitty
  and Ghostty do; continuous render loops are the main cause of avoidable
  idle draw.

## Cross-cutting rules

- All budgets apply to the default configuration with the safe startup path
  (no third-party plugins); plugin-enabled configurations get their own
  budgets in the isolation/resource RFC (OQ-014).
- Budget violations found by CI or release checks are treated like failing
  tests: fix, renegotiate the budget via an updated RFC, or document a
  time-boxed exception. Silent drift is not allowed.
- Measurement harnesses, corpora, and reference machines must be defined in
  the implementing repository before any budget becomes a hard gate. Until
  then these numbers are design constraints for architecture choices (lazy
  plugin load, frame-on-demand rendering, bounded scrollback allocation).
- Platform-specific relaxations (e.g., ConPTY startup overhead on Windows)
  belong to the platform policy ADR (OQ-003), not to ad-hoc exceptions here.

## Open items

- Define the exact benchmark harness, corpus, and reference hardware (follow-up
  implementation task; cannot be specified meaningfully before code exists).
- Decide whether startup-time budgets need a separate Windows/ConPTY variant.
- Revisit PB-5 after the first real `bitty-app` link produces actual sizes.
- Coordinate with OQ-014 so plugin VM creation cost is charged against
  plugin budgets, not the core's PB-2/PB-3 numbers.
