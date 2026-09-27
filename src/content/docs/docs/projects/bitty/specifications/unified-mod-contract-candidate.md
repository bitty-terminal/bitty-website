---
title: Unified Mod Contract (Candidate)
description: Candidate contract for the unified Mod key modifier scope remapping conflict diagnostics and the split between Mod panel rules and semantic workspaces under OQ-052
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: true
sidebar_order: 44
---

# Unified Mod Contract (Candidate)

> Status: **draft candidate** resolving the `Mod` half of
> [OQ-052](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
> The open question asks which native window forms enter scope — niri-style
> ribbon, declarative panel rules, semantic workspaces, unified `Mod` contract —
> and which owner or `LayoutProvider` surface implements them. This record
> narrows that question to the `Mod` contract and states a candidate direction
> for modifier spelling, remapping, conflict diagnostics, and the boundary
> between panel rules and semantic workspaces. It accepts nothing, weakens no
> accepted keymap or input contract, and makes no implementation claim. The
> ribbon, panel-rule grammar, and semantic-workspace items remain open and are
> only scoped here.

## Purpose and scope

The accepted keymap surface distinguishes a **Leader** chord, an **Alt**
namespace used by the shipped workspace keys, and per-mode bindings. The
candidate direction wants one modifier concept — `Mod` — so that a documented
key such as `Mod+Shift+Number` has one meaning across layouts, platforms, and
panel rules. Today the spelling is candidate-only, its remapping surface is
undecided, its conflict diagnostics have no contract, and OQ-052's other three
items are still unscoped.

In scope: what `Mod` means, its default resolution per platform, its remapping
surface, conflict detection and diagnostics, the relationship to Leader and the
existing Alt namespace, and the boundary between panel rules and semantic
workspaces as far as the `Mod` contract touches them.

Out of scope and owned elsewhere: chord parsing, consumption, and dispatch
priority (draft, [Input and Pointer Contract](input-pointer-rfc.md)); Leader
default, fail-open timeout, and the Windows fallback set (`OQ-088`); Beacon
label pools and script dispatch authority (`OQ-089`, draft,
[Semantic Terminal RFC](semantic-terminal-rfc.md)); panel-rule grammar and
specificity (owner-pending, [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md));
native window-form scope for the ribbon and semantic workspaces (remains open
under `OQ-052`).

## Normative sources this specification must not weaken

- [Input and Pointer Contract](input-pointer-rfc.md) (draft): chord parsing,
  the Leader namespace, consumption rules, and dispatch priority.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted): the
  workspace operations keys (`Alt+N` new, `Alt+1..9` focus, `Alt+-`/`Alt+=`
  previous/next, `Alt+Tab` last-used, `Alt+W` close, `Mod+Shift+Number` move)
  and interaction atomicity — gestures route through the command registry.
- [Configuration Model RFC](configuration-model-rfc.md) (accepted): config
  plan validation, per-field attribution, `Live` reload, and `bitty --safe`.
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): focus routing and the
  rule that plugins observe focus changes only on the cold path.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 4 (no hot-path execution) and bounded input.

## Terminology

| Term               | Meaning in this document                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `Mod`              | The unified modifier concept: a documented key written `Mod+X` resolves to one concrete chord per platform and configuration. |
| Leader             | The modal chord prefix owned by the draft input contract; orthogonal to `Mod` and never aliased to it.                        |
| Alt namespace      | The shipped concrete bindings (`Alt+N`, `Alt+1..9`, ...) that `Mod` must not silently override.                               |
| Panel rule         | A declarative statement about how a panel or its chrome is presented; candidate, owner-pending.                               |
| Semantic workspace | A workspace whose identity or grouping carries meaning beyond its index; candidate, owner-pending.                            |
| Resolution         | The mapping from `Mod` to a concrete modifier for one platform, configuration, and safety mode.                               |

## Rules

1. **`Mod` is a spelling, not a modifier.** A documented key uses `Mod` so the
   corpus can describe one intent; resolution to a concrete modifier happens at
   dispatch, per platform and configuration. The corpus must not assume `Mod`
   equals `Super`, `Ctrl`, or `Alt` on any platform.
2. **Default resolution is platform-ordered and user-overridable.** The
   candidate default order is: the platform's window-manager modifier when it is
   available and not reserved by the OS, else `Alt` with the documented
   fallbacks of the draft input contract, else the Leader namespace. The
   resolution and the fallback chain are configuration values with a documented
   default, not compiled-in constants.
3. **`Mod` never silently overrides the Alt namespace.** A `Mod` binding that
   resolves to a chord already bound in the Alt namespace is a **conflict**,
   reported with diagnostics; the existing binding keeps its meaning unless the
   user explicitly rebinds it.
4. **`Mod` never aliases Leader.** Leader remains a modal prefix with its own
   default (`Alt+Space` candidate under `OQ-088`) and its own fail-open timeout;
   `Mod` is not a second spelling for it, and no chord may be simultaneously a
   Leader prefix and a `Mod` binding.
5. **Conflicts are diagnosed, typed, and non-destructive.** A conflict produces
   a typed diagnostic naming both claimants, the resolution that caused it, and
   the winning binding under the documented precedence. Rejected bindings change
   nothing and never partially apply.
6. **Resolution is reload-safe.** A resolution or remap change validates through
   the accepted config plan, applies per-field, and reloads `Live`; under
   `bitty --safe` the documented safe defaults apply and no candidate remap is
   consulted.
7. **Gestures still route through the command registry.** A `Mod`-modified
   pointer gesture is a command submission, validated and atomic per the
   accepted compositor interaction rules; `Mod` changes no direct-write path.
8. **Panel rules and semantic workspaces are consumers, not definers.** The
   `Mod` contract fixes the modifier concept those features may reference. It
   does not define panel-rule grammar, specificity, or semantic-workspace
   identity; those remain open under `OQ-052` and the owner-pending RFCs.
9. **The hot path stays Lua-free.** `Mod` resolution happens when a chord is
   dispatched, not per keystroke through plugin code; no plugin is consulted to
   resolve a modifier.

## Boundary with the remaining `OQ-052` items

| Item                    | Scope decision recorded here                                            | Still open                                                         |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Unified `Mod` contract  | This record: spelling, resolution, remap, conflict, safe-mode posture   | Nothing in this record's rules is accepted yet                     |
| Declarative panel rules | Consumes `Mod`; grammar/specificity/precedence stay with the chrome RFC | Grammar, cascade, resolution trace, plugin request authority       |
| Semantic workspaces     | Consumes `Mod`; identity/grouping stay owner-pending                    | Whether identity is user-visible, persisted, or plugin-requestable |
| Niri-style ribbon       | Out of scope; no ribbon behavior is described or promised               | Whether a ribbon enters scope at all, and at which milestone       |

## Security review

The contract adds no capability and no host surface. The properties that matter:
resolution is bounded and validated (no unbounded chord tables), conflicts fail
closed and are reported, `bitty --safe` never consults candidate remaps, and no
plugin participates in resolution, so a plugin cannot capture a chord by
declaring a competing binding. No `P0` criterion is affected; a security
reviewer is required if a future revision lets a plugin register a `Mod`-level
binding or resolve one.

## Verification plan

1. A test asserting the default resolution table per platform produces the
   documented chords and that an override applies per-field without disturbing
   unrelated bindings.
2. A test asserting a `Mod` binding that collides with an Alt-namespace binding
   is rejected with a typed diagnostic naming both claimants, with no state
   change.
3. A test asserting `bitty --safe` ignores candidate remaps and applies the
   documented safe defaults.
4. A test asserting Leader and `Mod` cannot resolve to the same chord and that a
   chord declared as both is rejected at validation.
5. A test asserting a `Mod`-modified drag routes through the command registry
   and that a rejected gesture leaves layout, focus, and sessions unchanged.

## Alternatives considered

| Alternative                                                 | Trade-off                                                                          | Disposition                                                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Keep concrete modifiers in every document                   | No resolution layer; the corpus contradicts itself across platforms                | Rejected — the contradiction is what `OQ-052` records                             |
| Make `Mod` an alias of Leader                               | One concept to learn; collapses a modal prefix with a modifier and breaks timeouts | Rejected                                                                          |
| Hardcode `Super` on Linux, `Cmd` on macOS, `Alt` on Windows | Simple; collides with shipped Alt bindings on Windows and ignores reservations     | Rejected as the only rule; retained as the candidate default order with fallbacks |
| Let panel rules own their own modifier namespace            | Independent evolution; two modifier systems in one keymap                          | Rejected — rules consume `Mod`, they do not define it                             |
| Decide all four `OQ-052` items in one record                | One acceptance gesture; bundles ribbon and semantic workspaces with no design      | Rejected — the other three stay open and are only scoped here                     |

## Affected contracts

| Contract                                                                            | Effect                                                                        |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Input and Pointer Contract](input-pointer-rfc.md) (draft)                          | Gains the `Mod` resolution layer above chord parsing; its own items stay open |
| [Workspace Compositor](workspace-compositor.md) (accepted)                          | Unchanged; documented workspace keys gain a resolution rule, not new bindings |
| [Configuration Model RFC](configuration-model-rfc.md) (accepted)                    | Unchanged; resolution and remap are validated as configuration fields         |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) (draft) | Consumes `Mod`; its panel-rule grammar remains open                           |
| [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) (draft)             | The `OQ-052` row gains this partial scope decision                            |

## Open points

- The exact default resolution per platform, and whether the window-manager
  modifier is preferred over `Alt` where both are free (`OQ-088` adjacency).
- Whether resolution is a single value or a per-chord override table.
- The diagnostic surface for conflicts (log, config validation error, or both)
  and whether an interactive resolution trace exists.
- Whether panel rules may express `Mod`-scoped bindings, and under which
  authority.
- Semantic-workspace identity, persistence, and grouping — untouched here.
- Whether the ribbon enters scope at all — untouched here.

## Acceptance criteria

1. A reviewer confirms the record resolves only the `Mod` portion of `OQ-052`
   and leaves the ribbon, panel-rule grammar, and semantic workspaces open.
2. The rules compose with the draft input contract without redefining chord
   parsing or dispatch priority.
3. The platform default order and fallback chain are stated as configuration
   values with documented defaults.
4. Acceptance happens through the input contract or a successor RFC, not by
   flipping this record's status.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes. The security review above records that disposition.

## References

- [Input and Pointer Contract](input-pointer-rfc.md) — chord parsing, Leader,
  and dispatch priority.
- [Workspace Compositor Specification](workspace-compositor.md) — workspace
  operation keys and interaction atomicity.
- [Configuration Model RFC](configuration-model-rfc.md) — validation and
  `Live` reload.
- [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md)
  — PW-1 modifier spelling open item this record answers.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  chrome and panel-rule consumption.
