---
title: Configuration Model RFC
description: Defines the accepted configuration pipeline, layer and merge contracts, reload classes, and project-trust mechanics for OQ-010.
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 15
---

# Configuration Model RFC

## Status

Accepted on 2026-08-27 by the project initiator. This RFC defines the accepted
configuration model; it does not claim shipped, stable, or compatibility-guaranteed
behavior. Experimental implementation may exist as review evidence but carries no
compatibility promise beyond the accepted contract. It closes open question
[OQ-010](../decisions/open-questions.md) at the design level.

Accepted P1 pipeline for v1 (retained from Wave-C review evidence): Candidate A
(two-stage declarative ConfigPlan pipeline
`Lua -> ConfigPlan -> typed validation -> merge -> diff -> reconcile`) is the
accepted v1 pipeline; Candidate C (bounded imperative overlay) is deferred to a
future Plugin/runtime overlay RFC as future work. Candidate B remains the
rejected baseline. This note was candidate-winner evidence before acceptance and
is now the accepted contract.

It targets OQ-010; it depends on the runtime and module-resolution contract
accepted in the [Lua Runtime RFC](lua-runtime-rfc.md) (OQ-009), and it feeds
OQ-011/OQ-012 (plugin-facing configuration surfaces), OQ-017 (CLI grammar for
`bitty config`/`bitty paths` commands), OQ-021/OQ-022 (package manifest and lock
coexistence), and budgets PB-1/PB-2 in the
[Performance Budget RFC](performance-budget-rfc.md).

## Problem statement

OQ-010 asks: _are declarative `ConfigPlan` generation and Rust reconciliation
adopted, and how do XDG layers, profiles, merge rules, reload, and project
trust work?_ The accepted direction ([DIR-003](../decisions/index.md)) fixes
Lua as the primary configuration language; the lifecycle, layer stack, merge
rules, profiles, and trust behavior were recorded as candidate contracts in
[Lua and XDG configuration](../configuration/lua-and-xdg.md) and are now
adopted by this RFC, which defines failure semantics and reload classification.

Normative sources this specification must not weaken:

- [Security overview](../security/overview.md): user `init.lua` is trusted code
  evaluated in a Config VM toward a validated plan; system/distribution
  configuration is trusted only after source verification; project
  configuration is untrusted; `bitty --safe` must always start with minimal
  built-in configuration.
- [Threat model](../security/threat-model.md): T-08 (entering a cloned
  repository must never execute its Lua without declarative-only content or
  explicit path-and-hash consent), with risks R-009, R-010, and R-020 in the
  [risk register](../security/risk-register.md).
- [Core boundaries](../architecture/core-boundaries.md): security policy and
  canonical terminal state are core-owned; configuration can parametrize
  policy within bounds the schema declares, never bypass it.

Out of scope: which Lua VM executes the configuration (OQ-009), package
manifest/lock file formats (OQ-021/OQ-022), plugin capability grants
(OQ-012), and concrete CLI flag grammar (OQ-017).

## Pipeline candidates

### Candidate A: two-stage declarative plan with Rust reconciliation (accepted v1 pipeline)

Configuration modules evaluate to plain data; Rust owns everything after that:
schema validation, layer merge, diffing, reconciliation into live state, and
reload. The pipeline is the one sketched in the existing topic document:

```text
Lua -> ConfigPlan -> typed validation -> merge -> diff -> reconcile
```

Accepted decision: Candidate A is the accepted v1 pipeline. This selection was
recorded as the Wave-C P1 candidate winner for prototype review evidence and
is now the accepted contract.

Trade-offs:

- Pro: the whole effective configuration is inspectable and diffable before
  any effect exists — enabling offline `config check`, `config show --source`
  attribution, and deterministic conflict reporting instead of load-order
  accidents.
- Pro: evaluation is side-effect-free by construction, so a failed or hostile
  module cannot half-mutate a running terminal; recovery reduces to "keep the
  last good plan", which is exactly what R-009 needs.
- Pro: layers, profiles, and distributions compose as data with declared merge
  semantics, making distribution composition (an accepted direction) testable
  without executing third-party code at compose time.
- Con: expressiveness ceiling — values must resolve to data at evaluation
  time; genuinely dynamic behavior needs a separate runtime path (this is why
  Candidate C was considered and is now deferred).
- Con: dual representation cost: the typed Rust schema and the documented Lua
  shape can drift; one of them must be generated or cross-checked in CI, and
  this RFC leaves that tooling choice open.
- Con: migration friction for authors expecting imperative mutation idioms
  from other editors; starter configurations and diagnostics must teach the
  data style.

### Candidate B: imperative live configuration

Configuration runs against live settings objects at load time (the model
familiar from other editors): each statement mutates running state, reload
re-executes the entry point.

Trade-offs:

- Pro: maximal authoring flexibility and the simplest mental model during a
  single load; no plan/validation indirection.
- Con: errors mid-file leave partially applied state; validation collapses
  into execution timing; there is no meaningful diff or source attribution
  without extra bookkeeping the model does not naturally produce.
- Con: layering becomes execution order — system defaults, distributions, and
  user overrides race by load sequence rather than declared precedence,
  weakening the non-overridable-policy control the security baseline requires.
- Con: reload means blind re-execution against mutated state, so R-009
  recovery guarantees get much harder to prove.
- Review note: rejected unless review accepts the recovery and attribution
  costs; recorded here because it is the incumbent idiom users know.

### Candidate C: hybrid — declarative plan plus bounded imperative overlay (deferred to Plugin/runtime overlay RFC)

Candidate A for all static configuration, plus a narrow runtime API through
which scripts may adjust presentation-level settings on events after startup.

Deferred decision: Candidate C is deferred to a future Plugin/runtime overlay
RFC as future work and is not part of v1. The overlay direction remains a
candidate for later review; v1 adopts Candidate A only. This deferral was
recorded as the Wave-C P1 decision and is retained upon acceptance.

Trade-offs:

- Pro: preserves every Candidate A guarantee for loading, merging, inspection,
  and recovery while acknowledging that some behaviors (event-driven tweaks)
  are awkward as pure data.
- Pro: matches the existing topic document's note that an imperative API may
  exist for runtime behaviors without being the configuration model.
- Con: two surfaces to document and test; the boundary rule ("overlay writes
  never feed back into merged plan values and never touch security-relevant
  fields") must be enforced and fuzz-covered, otherwise Candidate B's problems
  leak back in.
- Con: scope creep risk: each new overlay capability reopens the question of
  which fields are presentation-only.

Candidate A is the accepted v1 pipeline and Candidate C is deferred; Candidate B
remains the rejected baseline. Review of the future overlay RFC will decide
whether any bounded overlay enters after v1.

## Layers, merge, and attribution

Status: **accepted contract** defining the layer stack and precedence in
[Lua and XDG configuration](../configuration/lua-and-xdg.md) (core defaults →
system → distribution → profile → user → trusted local override → CLI), with
the following contract obligations; the authoritative enumeration stays in that
document and this RFC binds its semantics:

1. Every schema field declares exactly one merge class (scalar replace,
   schema-guided deep merge, set-by-identifier, or explicit list policy);
   undeclared fields fail validation rather than merging implicitly.
2. Merge conflicts are computed, reported with both sources' file locations,
   and resolved only by declared precedence — never silently by load order.
3. Source attribution survives merging so every effective value answers
   "which file, which layer"; this is a hard requirement for `config show
--source` being truthful (CLI surface owned by OQ-017).
4. System policy entries marked non-overridable reject overriding plans at
   validation with a dedicated diagnostic class; they are distinct from system
   defaults, per the trust table in the [security overview](../security/overview.md).
5. Profile composition (`extends`) resolves single-parent chains with cycle
   detection; multiple inheritance remains an open item.

## Shipped defaults snapshot

Status: **shipped defaults** (read-only from `bitty` `origin/main`,
`crates/bitty-config/src/types.rs`, `merge.rs`, `keymap.rs`, `theme.rs`,
CTX-0153/CTX-0169/CTX-0177/CTX-0180/CTX-0185/CTX-0191/CTX-0236/CTX-0237/CTX-0240/CTX-0241/CTX-0257/CTX-0258/CTX-0259/CTX-0262/CTX-0263/CTX-0264/CTX-0265/CTX-0290/CTX-0292). This section records
shipped values as status; it instantiates the merge-class contract above
without changing it. Normative precedence stays `CLI > file > profile >
defaults` per [Lua and XDG configuration](../configuration/lua-and-xdg.md).

| Field                                                   | Shipped default                                                                                                               | Merge class (settled) |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `font.family` / `size`                                  | `"JetBrainsMono Nerd Font"` / `12.0`                                                                                          | scalar replace        |
| `font.line_height` / `letter_spacing`                   | `1.375` / `2.0` (effective cell `10x22` from the legacy `8x16` base; measured raster truth at `12`pt, CTX-0237)               | scalar replace        |
| `window.opacity` / `padding`                            | `1.0` / `8`; `opacity < 1.0` scales pixel alpha through premultiplied renderer alpha (`0.0..=1.0`, CTX-0290)                  | scalar replace        |
| `window.radius_px`                                      | `0` physical px (`0..=24`); S0 parsed no-op with zero render effect (CTX-0241)                                                | scalar replace        |
| `mod_key`                                               | `"alt"` (`"super"` allowed; `ctrl`/`shift` rejected fail-closed, CTX-0236)                                                    | scalar replace        |
| `terminal.scrollback`                                   | `10000`                                                                                                                       | scalar replace        |
| `terminal.scroll_lines_per_notch`                       | `3` (`1..=32`)                                                                                                                | scalar replace        |
| `terminal.scroll_pixels_per_notch`                      | `16` (`1..=256`)                                                                                                              | scalar replace        |
| `selection.auto_copy`                                   | `true` (copy-on-select; `false` keeps the highlight, copies only on chord)                                                    | scalar replace        |
| `layout.gaps_in` / `gaps_out`                           | `0` / `0` cells (`0..=16`); edge-to-edge tiling; stack leaves take the `gaps_out` inset only (CTX-0240)                       | scalar replace        |
| `decoration.gaps_in` / `gaps_out` / `border` / `radius` | `4` / `6` / `2` / `6` logical px (`0..=32` / `0..=32` / `0..=8` / `0..=16`); Core-owned; live px painting deferred (CTX-0292) | scalar replace        |
| `appearance.theme`                                      | unset means the `bitty-dark` preset (alias `dark`); unknown names fall back to it with a stderr warning                       | scalar replace        |
| `keymaps`                                               | shipped Alt-as-Mod set (79 entries, context `global`); user entries replace by `context + chord`, else append                 | set-by-identifier     |
| `plugins`                                               | empty by default                                                                                                              | set-by-identifier     |

Absent `selection`/`layout`/`decoration` tables (or absent keys within them)
mean "this layer says nothing" and inherit silently; present-but-partial
`font`, `window`, and `terminal` tables fail closed rather than filling
defaults, preserving attribution. Scalar-replace above matches the shipped
`bitty-config` merge implementation exactly.

The shipped keymap set is the canonical Alt spelling rendered through the
`mod_key` setting above (`alt` default, `super` opt-in rebinding): `alt+h/j/k/l`
and `ctrl+alt+arrows` move focus, with CTX-0262 `alt+arrows` aliases;
`alt+1..9` focuses workspace `1..=9`, and `shift+alt+1..9` moves the focused
window to workspace N (CTX-0259, `bitty` #457); `alt+n` / `alt+w` / `alt+-` /
`alt+=` / `alt+tab` drive new, kill-confirmed close, previous, next, and
last-used workspace (CTX-0257, `bitty` #433, DEC-0034); `alt+u`/`alt+i` page
up/down; `shift+alt+h/j/k/l` plus CTX-0262 `shift+alt+arrows` split;
`shift+ctrl+h/j/k/l`, `shift+ctrl+arrows`, the CTX-0258 Mod-aware
`ctrl+shift+alt+h/j/k/l` variant, and CTX-0262 `ctrl+shift+alt+arrows` aliases
resize; `alt+z`/`alt+m`/`alt+f` toggles zoom; `ctrl+tab`/`ctrl+shift+tab`
cycles focus; `ctrl+shift+c` copies (`copy_to_clipboard`, best-effort primary
sync on Linux) and `ctrl+shift+v` pastes through the suspicious-paste
inspection gate; `ctrl+=`/`ctrl+plus` (plus shifted spellings), `ctrl+-`, and
`ctrl+0` grow, shrink, and reset the per-window font size (CTX-0263); the help
popup toggles on the backtick chord (canonical `alt+backtick`) plus the
`alt+?` shifted-symbol spellings (CTX-0265). Plain `Tab`, arrows, letters, and
digits are deliberately unbound so they reach the shell; a bound chord is
consumed by its action and never reaches the PTY. The only supported context
is `global`; single-character keys require a modifier; every named key from
`tab` through `f1..f35`, including the CTX-0264 short aliases
`ins`/`del`/`hm`/`end`/`pu`/`pd`, is bindable. The full vocabulary adds
`workspace_new`, `workspace_close`, `workspace_prev`, `workspace_next`,
`workspace_last`, `workspace_focus:<1..=16>`, `workspace_move:<1..=16>`,
`toggle_help`, `increase_font_size`, `decrease_font_size`, and
`reset_font_size` to `goto_split`, `new_split`, `resize_split` (each
`<left|right|up|down>`), `close_view`, `toggle_zoom`, `focus_next`,
`focus_prev`, `focus:<1..=256>`, `copy_to_clipboard`, `paste_from_clipboard`,
`scroll_page_up`, and `scroll_page_down`. `alt+w` and `alt+1..9` previously
drove pane `close_view` / `focus:<n>`; those actions stay parseable and
user-bindable but are no longer bound by default (workspace numbers won the
Alt slot per the owner spec, panes navigate spatially).

The shipped `window.opacity` now has a render effect (CTX-0290, `bitty`
issues #494/#499, merge commit `9ac34b9`, DEC-0042): single-pass premultiplied renderer
alpha scales fill and glyph output by the sanitized opacity when the surface
advertises premultiplied compositing (`CompositeAlphaMode::PreMultiplied`
selected from the surface capabilities), and the headless compositor scales its
finished buffer so CI proves the effect without an adapter. `opacity == 1.0`
stays byte-identical to the previous output. When the platform lacks
premultiplied support the window stays opaque with a loud warning (fail-closed)
instead of silently pretending the setting applied. Live evidence on
Hyprland/eDP-1 is retained in `bitty`
`recording/live-visual-matrix/ctx-0290-opacity/`.

The shipped leader/mod setting is the top-level `mod_key` scalar (CTX-0236,
`bitty` #411, commit `2a5e451`): `"alt"` by default (aliases `opt` /
`option`) keeps the Alt-as-Mod map byte-identical, while `"super"`
(aliases `meta` / `cmd` / `command` / `win` / `windows`) rebinds every
`alt`-bearing default to Super. Parsing is trimmed and case-insensitive;
anything else — including `ctrl` / `shift`, which would silently steal
shell typing and shadow the mod-independent fixed chords (`ctrl+tab`
cycles, `shift+ctrl` resizes, `ctrl+shift` copy/paste) — fails closed.
`mod_key` is scalar-replace with per-layer source attribution, and an
absent key means "this layer says nothing" so existing configs keep
working. Explicit `keymaps` entries keep their exact spelling and overlay
by `context + chord` identity, so a mod flip never rewrites user intent.

The shipped window corner radius is `window.radius_px` (CTX-0241, bitty
issue 417, commit `84aa580`): physical px `0..=24`, default `0` (square
corners). Stage 0 is a parsed no-op — accepted, stored, and reported
through the Lua, types, plan, merge, file, validation, reload, trust, and
runtime path plus the `config check` row, with zero render effect (no
`DrawList` / present consumer; unset, explicit `0`, and positive values
present byte-identical frames). The default `0` keeps every path on the
zero-cost fast path. Staged rollout: pane-level rounding is a later stage;
window-level rounding stays with the compositor and is not a `bitty`
rendering stage.

The shipped Core-owned decoration is the `decoration.gaps_in` / `gaps_out` /
`border` / `radius` table (CTX-0292, `bitty` #487, merge commit `485fbfd`,
closes `bitty` #486; accepted spec CTX-0118): logical pixels `4` / `6` / `2` /
`6` within `0..=32` / `0..=32` / `0..=8` / `0..=16`, fail-closed validation
with source-attributed diagnostics, scalar-replace with per-field attribution,
`Live` reload, and `bitty --safe` forcing `0/0/1/0` regardless of user
configuration. It is distinct from the cell-unit `layout.gaps_in` /
`gaps_out` panel gaps above. The px surface is validated, stored, and carried
(`layout_with_decoration`, `decorated_allocations`, `set_decoration`), but the
present path does not paint it yet (fractional-cell View frames plus a renderer
radius primitive), so no visual effect is claimed; live painting is deferred
to `bitty` CTX-0294 on the CTX-0238g stage-2 renderer radius lane.

Open: per-field reload classification moves into this RFC once the schema
stabilizes; the shipped inventory is the implementation reference in
[Lua and XDG](../configuration/lua-and-xdg.md#reload-classification-shipped-schema-inventory);
whether the CLI appearance flag set or the shipped keymap set grows; and
middle-click paste acceptance, deferred under CTX-0158.

## Reload classification

Status: **accepted framework**; an implementation inventory now exists in
`bitty` `crates/bitty-config/src/reload.rs`, and the canonical per-field table
moves into this RFC when the schema stabilizes (implementation reference:
[Lua and XDG](../configuration/lua-and-xdg.md#reload-classification-shipped-schema-inventory)).

Every schema change from a reloaded plan lands in exactly one class:

| Class             | Meaning                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| Live-reconcilable | Applied by diff-and-reconcile to running instances without restart         |
| Restart-required  | Accepted and persisted, but effective after the next process start         |
| Rejected          | Validation failure; previous good plan remains active, diagnostics emitted |

Contract obligations: the classification is declared by the schema (never
inferred at runtime); a reload containing any restart-required change reports
that fact up front; reload reuses the same validation/merge path as startup so
no divergent second parser exists. Whether module caches clear between reloads
is shared with the module-resolution rules in the
[Lua Runtime RFC](lua-runtime-rfc.md) (OQ-009, accepted 2026-08-27; GC/budget tuning remains Open under OQ-032).

## Project trust

Status: **accepted mechanics**, implementing the normative T-08 defense, not
reopening it.

1. Project configuration is declarative-data-only; project-scope Lua execution
   is not a configuration-model feature. If a `.bitty.lua`-style file is ever
   honored, its content is data validated against a restricted project schema.
2. Consent is bound to canonical path plus content hash; any content change
   invalidates prior approval (normative already — this RFC inherits it).
3. Consent lifecycle per untrusted project config: ask once, ask
   always-on-entry, or deny, with deny as the default when origin detection is
   not positively local (R-020's restrictive `Unknown` rule).
4. Open mechanics left to follow-up: trust database location and format,
   invalidation on directory rename/move, expiry or review cadence for stored
   grants, and the exact prompt UX. None of these may weaken the hash binding.

## Failure and safe-mode interaction

On first start with missing or broken configuration, Bitty proceeds with the
minimal built-in configuration and reports diagnostics; on later failures it
retains the last good plan. `bitty --safe` remains an unconditional override
that skips all external configuration and plugins regardless of configuration
health (R-009). These behaviors are obligations of the accepted pipeline;
Candidate B would have to reprove them if ever reconsidered.

## Security review notes

The declarative-plan direction strengthens the P0 posture: side-effect-free
evaluation keeps project and distribution content inert until trust decisions
land (T-08/R-010); last-good-plan retention and the built-in fallback give
R-009 a testable recovery path; attribution and conflict reporting make silent
policy override visible instead of deniable. Any future overlay API (deferred
Candidate C) must ship negative tests proving overlay writes cannot reach
security-relevant or policy-owned fields, if that overlay RFC is later accepted.
No control here downgrades the normative baseline; thresholds and enforcement
evidence remain with the security corpus.

## Open items remaining under OQ-010

The following items were open at proposal and are now dispositioned upon
acceptance on 2026-08-27. Acceptance of this RFC closes OQ-010 at the design
level; residual items below are tracked as follow-up work with no remaining
OQ-010 closure blocker unless review decides otherwise:

- Resolved by this RFC upon acceptance: adoption of the declarative plan with
  Rust reconciliation (Candidate A accepted for v1, with Candidate C explicitly
  deferred to a future Plugin/runtime overlay RFC), layer stack and precedence,
  merge-class contract and attribution, reload classification framework, failure
  and safe-mode interaction, and project-trust mechanics for declarative-only
  project configuration with hash-bound consent.
- Migrated or deferred (remain open as follow-up work): Plugin/runtime overlay
  RFC defining whether any bounded imperative overlay exists after v1 (Candidate
  C future work), schema ownership tooling for typed Rust schema and Lua shape
  sync, authoritative home for the enumerated field list and merge-class table
  once the schema stabilizes, per field reload classification and minimum
  restart-required set, trust database location/grant expiry/review/rename
  invalidation/prompt UX for project configuration, multiple-parent profile
  inheritance if adopted, coexistence rules between the configuration tree and
  package manifest/lock names (deferred to OQ-021/OQ-022), and native
  macOS/Windows directory mappings feeding the semantic path set (owned by
  platform follow-ups).

Closes OQ-010: this RFC closes OQ-010 at the design level; the register row is
updated per the open-question register rules. Candidate A is the accepted v1
pipeline and Candidate C is deferred, retained from the Wave-C P1 winner note
without remaining OQ-010 scope.
