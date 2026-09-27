---
title: Theme Token Contract (Candidate)
description: Candidate theme token contract naming the token namespace resolution order plugin theming boundary and the contrast obligations that appearance keys resolve against
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 49
---

# Theme Token Contract (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. The accepted
> [RFC-0001 appearance configuration](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)
> already fixes color grammar, the resolution order for specific keys, contrast
> rules, and the rule that a plugin never sets Core-owned chrome. What it does
> not fix is the **token vocabulary**: which token names exist, what each one
> means, how a plugin or theme package supplies them, and how a token resolves
> when several sources claim it. This record states a candidate token contract
> so theme work has one namespace. Every token name below is a candidate
> spelling.

## Purpose and scope

The corpus resolves several appearance keys through "a theme token" without
naming the token set: `decoration.border_color` defaults to a theme token, the
focused/idle outline pair resolves theme token first, and the UI runtime
direction puts theme tokens on the Lua side (L2 `bitty-ui-core`) while Core
keeps mechanism. Three questions are consequently unanswered: what the token
names are, who may define them, and what happens on conflict.

In scope: the candidate token namespace, the token inventory for the surfaces
the corpus already touches, the resolution order across sources, the plugin and
theme-package boundary, the contrast obligations a token must satisfy, and the
`--safe` posture.

Out of scope and owned elsewhere: the color value grammar (`#RRGGBB[AA]`,
fail-closed rejection of other syntaxes), per-key resolution order, the AC-1..AC-3
contrast rules, and `bitty --safe` forced values (accepted, RFC-0001 and its
amendments); appearance key spelling for user configuration (accepted, RFC-0001
and [Lua and XDG configuration](../configuration/lua-and-xdg.md#appearance-knobs-supported-reference));
scene node schema (accepted, [Rich Presentation RFC](rich-presentation-rfc.md));
the L2 component library's own token consumption (candidate,
[Lua UI Component Model](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/lua-ui-component-model-candidate.md));
panel rule grammar (owner-pending,
[Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)).

## Normative sources this specification must not weaken

- [RFC-0001 appearance configuration](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)
  (accepted): value grammar, per-key resolution order, AC-1..AC-3 contrast,
  `bitty --safe` forced pair, and the rule that no plugin or `LayoutProvider`
  sets Core-owned chrome colors at runtime.
- [Lua and XDG configuration](../configuration/lua-and-xdg.md) (draft): the
  appearance key surface a theme supplies.
- [Configuration Model RFC](configuration-model-rfc.md) (accepted): `ConfigPlan`
  validation, per-field attribution, `Live` versus `restart-required` reload,
  and fail-closed rejection with a diagnostic.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 3 (presentation never Terminal Truth) and the untrusted-content
  posture for plugin-supplied packages.
- [Rich Presentation RFC](rich-presentation-rfc.md) (accepted): rich content
  styling stays declarative and bounded.

## Terminology

| Term               | Meaning in this document                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Token              | A named color value (`border.focused`) that appearance keys and scene content resolve against.              |
| Theme preset       | A named set of token values selected by `appearance.theme`; reload stays `restart-required`.                |
| Theme package      | A distributable package that supplies token values through the plugin/package mechanism, subject to grants. |
| Resolution         | Selecting a concrete value for a token from the layered sources, later wins.                                |
| Core-owned surface | A surface whose colors no plugin may set at runtime (chrome, borders, decoration geometry).                 |

## Candidate token inventory

| Token                    | Surface it colors                         | Owner  |
| ------------------------ | ----------------------------------------- | ------ |
| `border.focused`         | Focused `View` outline                    | Core   |
| `border.idle`            | Idle `View` outline                       | Core   |
| `chrome.bar.background`  | Bar surface background                    | Core   |
| `chrome.bar.foreground`  | Bar text and icon default                 | Core   |
| `chrome.bar.active`      | Active workspace indicator                | Core   |
| `chrome.rail.background` | Workspace rail background                 | Core   |
| `chrome.rail.active`     | Active rail entry                         | Core   |
| `chrome.tab.active`      | Active tab treatment                      | Core   |
| `chrome.tab.inactive`    | Inactive tab treatment                    | Core   |
| `chrome.notification`    | Notification and banner accent            | Core   |
| `content.background`     | Panel content base background             | Core   |
| `content.foreground`     | Panel content base foreground             | Core   |
| `content.accent`         | Panel content accent (selection, markers) | Core   |
| `content.muted`          | Secondary panel content text              | Core   |
| `state.error`            | Error and diagnostic severity             | Core   |
| `state.warning`          | Warning severity                          | Core   |
| `state.success`          | Success severity                          | Core   |
| `plugin.<name>.*`        | A plugin's own content tokens, namespaced | Plugin |

Rules for the inventory:

1. **Core tokens are closed in the candidate direction.** Adding a Core token is
   a contract change; a plugin may not invent one under the `chrome.*`,
   `content.*`, `state.*`, or `border.*` namespaces.
2. **Plugin tokens are namespaced and bounded.** A plugin's own content tokens
   live under its name; they may be referenced by that plugin's declarative
   content only, never by chrome or another panel's content.
3. **Terminal content is not tokenized.** Terminal cell colors come from the
   terminal palette and escape sequences, never from theme tokens; a token
   never recolors terminal truth.

## Resolution order (candidate, composing with accepted per-key order)

Sources, later wins:

1. framework default;
2. theme preset token values (selected by `appearance.theme`);
3. plugin theme package values, only for the plugin's own namespace, and only
   for surfaces it is granted;
4. explicit user keys under the accepted appearance surface;
5. `bitty --safe` forced values, which ignore user and preset values for the
   keys it governs (accepted behavior for the outline pair).

Rules:

1. **Core chrome ignores plugin layers.** Chrome, borders, and decoration
   geometry resolve from framework default, theme preset, and user keys only;
   a plugin theme package is never consulted for them, matching the accepted
   rule that no plugin sets Core-owned chrome at runtime.
2. **A theme preset is data, not code.** A preset supplies values from the
   accepted value grammar; a syntax the grammar rejects fails closed with a
   diagnostic naming the offending key, exactly as user keys do.
3. **Resolution is per key, with attribution.** A resolved value records which
   layer supplied it, so diagnostics can name the winner instead of reporting an
   opaque conflict.
4. **Conflict is not silent.** If two sources in different layers claim one key,
   the later layer wins and the resolution is reported; if one layer supplies
   the same key twice, validation fails closed.
5. **Token reload class follows the appearance surface.** Token changes inherit
   the reload class of the appearance keys they feed; `appearance.theme` stays
   `restart-required`.

## Contrast obligations

1. Every Core token that participates in the accepted AC-1/AC-2/AC-3 rules is
   validated against the resolved background with the accepted
   relative-luminance computation; a violating resolved pair is rejected
   fail-closed.
2. A theme preset that produces a violating pair is rejected at
   `ConfigPlan` validation, not silently clamped.
3. A plugin-supplied token that produces a violating pair inside the plugin's
   own content surface is reported and degraded to a compliant default rather
   than failing the panel; the plugin's content is not trusted to satisfy a
   contrast obligation it cannot verify.
4. `bitty --safe` ignores token layers it governs and applies the forced
   compliant pair.

## Security review

Theme tokens are presentation data. The properties that matter: token values
come from a fail-closed grammar (no code, no gradients, no images in the
candidate direction), chrome cannot be recolored by a plugin, a plugin token
cannot address another plugin's or Core's namespace, and resolution reports the
winning layer so a plugin cannot silently shadow a safety value.
`bitty --safe` ignores candidate layers. No `P0` criterion is affected; a
security reviewer is required if a future revision admits executable theme
logic or a new value type.

## Verification plan

1. A test asserting a plugin theme package value does not change any
   `chrome.*` or `border.*` resolution.
2. A test asserting a violating preset pair is rejected fail-closed with a
   diagnostic naming the key and the resolved values.
3. A test asserting `--safe` ignores user and preset values for the keys it
   governs and applies the forced pair.
4. A test asserting resolution attribution names the winning layer per key.
5. A test asserting terminal cell colors are never sourced from theme tokens.

## Alternatives considered

| Alternative                                     | Trade-off                                                                  | Disposition                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Let plugins supply chrome tokens                | Maximal theming freedom; breaks the accepted no-plugin-chrome rule         | Rejected — accepted rule wins                                             |
| Open the Core token set to community addition   | Grows with demand; every addition is a contract change with no review path | Rejected as a candidate default; additions go through the contract change |
| Tokenize terminal colors too                    | One system for everything; would recolor Terminal Truth                    | Rejected — presentation never becomes truth                               |
| Resolve tokens in Lua only (no Core resolution) | Single implementation; Core could not validate contrast or safe mode       | Rejected — Core must validate and fail closed                             |

## Affected contracts

| Contract                                                                                                                                                           | Effect                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [RFC-0001 appearance configuration](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md) (accepted)    | Unchanged; supplies the grammar, per-key order, contrast rules, and `--safe` posture |
| [Lua and XDG configuration](../configuration/lua-and-xdg.md) (draft)                                                                                               | Unchanged; the appearance keys gain a named token set to resolve against             |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) (draft)                                                                                | Gains the token namespace its surfaces consume                                       |
| [UI Extensibility Architecture](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/architecture/ui-extensibility-architecture.md) (draft)              | The Lua-side token ownership direction gains a namespace and boundary                |
| [Lua UI Component Model (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/lua-ui-component-model-candidate.md) (candidate) | L2 library tokens compose with this namespace                                        |

## Open points

- The complete Core token list beyond the surfaces the corpus already names, and
  whether it is one list or one per surface family.
- Whether `plugin.<name>.*` tokens may be referenced by other plugins with a
  grant, or stay strictly private.
- Whether a theme preset may declare non-color tokens (spacing, thickness) or
  stay color-only.
- Whether token resolution is user-visible as a trace (composes with the chrome
  open item).
- The exact degradation rule for a plugin token that violates contrast.
- Whether user keys may define new token names or only override existing ones.

## Acceptance criteria

1. A reviewer confirms every rule composes with RFC-0001 and adds no accepted
   behavior.
2. The inventory matches the surfaces the corpus names; no token is invented for
   an undocumented surface.
3. The plugin boundary is stated explicitly, including what a plugin token can
   never address.
4. Acceptance happens through the appearance RFC's successor or the
   owner-pending UI Runtime RFC, not by flipping this record's status.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes; the plugin boundary and fail-closed grammar tighten existing
rules. The security review above records that disposition.

## References

- [RFC-0001 appearance configuration](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)
  — accepted grammar, resolution order, contrast rules, safe mode.
- [Lua and XDG configuration](../configuration/lua-and-xdg.md) — appearance key
  surface.
- [Configuration Model RFC](configuration-model-rfc.md) — validation, reload
  classes, diagnostics.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  chrome surfaces consuming `chrome.*` tokens.
- [Lua UI Component Model (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/lua-ui-component-model-candidate.md)
  — L2 component token consumption.
