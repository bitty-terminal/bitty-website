---
title: Plugin Manifest and Capability Grammar Authority
description: Canonical grammar decisions for plugin manifest fields, capability identifiers, dependency tables, and service schemas
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 19
---

# Plugin Manifest and Capability Grammar Authority

> Status: **accepted** on 2026-09-26. This document consolidates the canonical
> grammar decisions for plugin manifest fields, capability identifiers,
> dependency inline tables, compatibility ranges, and service schema
> representation. It closes issues #95 and #96 and provides the authoritative
> reference for SDK validators, host parsers, template generators, and
> documentation examples. This specification is the single source of truth for
> manifest and capability contract questions that arose from the 2026-09-24
> cross-contract review campaign.

## Document status

- Status: **accepted** on 2026-09-26; this specification defines the canonical
  grammar for plugin manifest fields and capability identifiers that SDK, host,
  template, and documentation must synchronize to.
- Parent RFC: [Plugin Platform RFC](plugin-platform-rfc.md) owns the manifest
  schema and capability model; this document resolves specific grammar
  ambiguities discovered during the cross-contract review.
- Target issues: bitty-plugins-docs #95 (parent contract decision), #96
  (grammar publication), and blocks bitty-plugin-sdk #120, #121 and bitty #1410.

## Purpose and scope

The 2026-09-24 cross-contract review campaign
(`research/review/2026-09-24/11-final-cross-contracts.md`) identified five
grammar conflicts where SDK, host implementation, template, and canonical
documentation disagreed:

1. Environment capability spelling: `env:<KEY>` (SDK, template) versus
   `env.read:<KEY>` (host).
2. `layout.provider` capability: present in host parser, absent from accepted
   RFC closed set.
3. Dependency inline table enforcement: specified in RFC but marked "not yet
   enforced."
4. Compatibility range grammar: unclear whether `compat.bitty` and
   `compat.plugin-api` follow resolver grammar or a separate registry grammar.
5. Service schema representation: TOML inline tables (canonical) versus JSON
   strings (host parser shortcut).

This document records the authoritative decision for each conflict and provides
valid/invalid example corpus so SDK, host, template, and docs can synchronize
to one grammar.

In scope: capability identifier spelling, wildcard and denial semantics,
manifest dependency table forms, compatibility range grammar, service schema
representation, and classification of host-only experimental forms.

Out of scope: capability grant lifecycle (owned by Plugin Platform RFC section
4.2), resolver constraint semantics (owned by Package Follow-up RFC section 3),
and exact service interface contracts (owned by individual service RFCs).

## Normative sources this specification must not weaken

The [Plugin Platform RFC](plugin-platform-rfc.md),
[Package Follow-up RFC](../packaging/package-followup-rfc.md), and
[security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
are normative. This specification resolves grammar ambiguities; it does not
relax capability deny-by-default, grant consent requirements, or resolver
determinism.

## Contract decisions

### 1. Environment capability spelling

**Decision**: `env.read:<KEY>` is the canonical form.

**Rationale**: The Plugin Platform RFC capability grammar (section 4.1, lines
277-279) established `family.resource[.scope]` with optional
`family.resource:parameter` for parameterized constraints. The `env` family
must follow this pattern. The host implementation uses `env.read:<KEY>`; the
SDK and template used `env:<KEY>`, omitting the resource level.

**Canonical spelling**: `env.read:<KEY>`

**Semantics**:

- **Absent from grant set**: denied. No ambient environment access.
- **`env.read:VAR_NAME`**: grants read access to the specific environment
  variable `VAR_NAME` (exact string match, case-sensitive).
- **`env.read:PREFIX_*`**: wildcard grant for all variables matching the prefix
  (e.g., `env.read:BITTY_*` grants `BITTY_DEBUG`, `BITTY_LOG`, etc.).
- **No allow-all wildcard**: `env.read:*` is explicitly rejected. Plugins must
  declare specific variables or prefixes.
- **Denial has no representation**: the absence of a grant is the denial. There
  is no `env.deny:<KEY>` form.

**Valid examples**:

```toml
[plugin.capabilities]
required = ["env.read:HOME", "env.read:BITTY_*"]
```

**Invalid examples**:

```toml
# INVALID: omits .read resource level
required = ["env:HOME"]

# INVALID: allow-all wildcard
required = ["env.read:*"]

# INVALID: denial form does not exist
required = ["env.deny:SECRET"]
```

**Migration note**: SDK validators and template scaffolds currently accept
`env:<KEY>`. They must be updated to reject the short form and require
`env.read:<KEY>`. Host implementation is already correct.

### 2. `layout.provider` capability

**Decision**: **Deferred**. `layout.provider` is not part of the accepted v1
capability closed set.

**Rationale**: The Plugin Platform RFC section 4.1 (lines 281-291) defines the
closed v1 capability families: `terminal`, `ui`, `clipboard`, `fs`, `process`,
`network`, `runtime`, `debug`, and `platform`. `layout.provider` does not
appear in this table. The host parser accepted it as an experimental form, but
it was never accepted into the RFC contract.

**Classification**: `layout.provider` is an implementation experiment. It must
not appear in SDK validators, template examples, or canonical documentation as
an accepted capability. If layout provider registration becomes a real v1
requirement, it requires a successor RFC that defines the capability family,
grant lifecycle, and security review.

**SDK/template action**: Remove `layout.provider` from any validator allowlists
or example manifests. Reject it with a clear error: "layout.provider is not an
accepted v1 capability; see Plugin Platform RFC for the closed set."

### 3. Dependency inline table form

**Decision**: The inline table form
`{ version = "...", prerelease = <boolean> }` is **accepted and specified**.

**Rationale**: The Plugin Platform RFC section 2.2 (lines 207-214) specifies
two forms for `[dependencies]` entries:

1. String form: `"xuepoo.gitcore" = ">=2.0"`
2. Inline table form: `"xuepoo.gitcore" = { version = ">=2.0", prerelease = true }`

Open point 10 (lines 729-735) records that this shape was specified to close
the ambiguity but marked "not yet enforced" because SDK and host validators
still accept only the string form. This document removes the "not yet enforced"
qualifier: the inline table is the accepted contract. SDK and host
implementation must be updated to accept it.

**Canonical forms**:

```toml
[dependencies]
# String form (stable dependencies only)
"xuepoo.gitcore" = ">=2.0"

# Inline table form (with prerelease opt-in)
"xuepoo.experimental" = { version = "^1.0", prerelease = true }
```

**Field semantics**:

- `version` (required): version-requirement string per Package Follow-up RFC
  constraint grammar.
- `prerelease` (optional, default `false`): per-edge prerelease opt-in per
  Package Follow-up RFC section 4.1.

**Invalid examples**:

```toml
# INVALID: unknown keys in inline table
"xuepoo.foo" = { version = "1.0", unstable = true }

# INVALID: prerelease without version
"xuepoo.bar" = { prerelease = true }

# INVALID: non-boolean prerelease
"xuepoo.baz" = { version = "1.0", prerelease = "yes" }
```

**Migration note**: Current SDK and host validators reject the inline table
form. They must be updated to parse and validate it per this specification.
The string form remains valid for dependencies that do not opt into prerelease.

### 4. Compatibility range grammar

**Decision**: `compat.bitty` and `compat.plugin-api` use the **resolver
version-requirement grammar** defined in Package Follow-up RFC section 3.

**Rationale**: The Package Follow-up RFC explicitly left registry compatibility
grammar open (section 3 note), creating ambiguity whether compatibility ranges
follow resolver constraints or a separate registry-specific grammar. For
consistency and simplicity, compatibility ranges follow the same grammar as
dependency version requirements.

**Canonical grammar**: SemVer-based version requirements per Package Follow-up
RFC:

- Operators: `=`, `>`, `<`, `>=`, `<=`, `^` (caret), `~` (tilde)
- Conjunction: multiple clauses separated by commas (e.g., `>=1.0, <2.0`)
- Prerelease and build metadata: per SemVer 2.0.0
- **Forbidden**: leading zeros in numeric components, excessive clause counts
  (>8), unsafe numeric values (>2^53-1), `==` (use `=`), whitespace-only
  clauses

**Valid examples**:

```toml
[compat]
bitty = "^0.1.0"
plugin-api = ">=1.0.0, <2.0.0"
```

**Invalid examples**:

```toml
# INVALID: leading zero
bitty = "0.01.0"

# INVALID: == operator
plugin-api = "==1.0.0"

# INVALID: excessive clauses
bitty = ">=1.0, <1.1, >=1.2, <1.3, >=1.4, <1.5, >=1.6, <1.7, >=1.8, <1.9"
```

**Migration note**: SDK validators must apply the same version-requirement
validation to `compat.bitty` and `compat.plugin-api` as they apply to
`[dependencies]` version strings.

### 5. Service schema representation

**Decision**: Service schemas are represented as **TOML inline tables**.

**Rationale**: The Plugin Platform RFC section 2.2 uses TOML inline tables for
`[services.provided]` and `[lazy].commands` entries (lines 239-241). The host
parser accepted JSON strings as a shortcut to avoid nested inline table
parsing, but this weakens type safety and creates a grammar fork. The canonical
manifest format is TOML; service schemas must follow TOML table syntax.

**Canonical form**:

```toml
[services.provided]
"xuepoo.gitcore.status" = { version = "1.0.0" }

[[lazy]]
commands = [
  { id = "git.commit", title = "Commit changes", keybind = { key = "g", mods = ["ctrl"] } }
]
```

**Invalid form**:

```toml
# INVALID: JSON string representation
"xuepoo.gitcore.status" = '{"version":"1.0.0"}'
```

**Migration note**: Host manifest parser must support nested TOML inline
tables. JSON string representation is rejected. SDK validators already enforce
TOML inline table forms; they are correct and must not regress.

### 6. Host-only manifest forms classification

**Decision**: `[limits]`, `[[network.egress]]`, and `[services.required]` are
**rejected** as accepted manifest fields.

**Rationale**: The Plugin Platform RFC section 2.2 (lines 169-224) defines the
accepted manifest schema. These three forms do not appear in that schema:

- `[limits]`: Not in accepted schema. Resource limits are owned by the
  Isolation Resource RFC and enforced by the runtime, not declared in manifests.
- `[[network.egress]]`: Not in accepted schema. Network destinations are
  expressed via `network.connect:DESTINATION` capability grants.
- `[services.required]`: Not in accepted schema. Service dependencies are
  declared in `[dependencies]` with version requirements.

**Classification**: These are implementation experiments in the reference host.
They must not appear in:

- SDK validators (must reject with "unknown field" error)
- Template scaffolds or examples
- Canonical documentation as accepted alternatives

**Action required**: Document these as experimental forms that may be removed
or reworked in a future manifest evolution RFC. They are not part of the stable
v1 contract.

## Authority table

This table maps every disputed grammar element to its single authoritative
owner and canonical form:

| Grammar element                | Authority                     | Canonical form                           | Consumers                                        |
| ------------------------------ | ----------------------------- | ---------------------------------------- | ------------------------------------------------ |
| Environment capability family  | This specification, section 1 | `env.read:<KEY>`                         | SDK, host, template, docs                        |
| Environment wildcard semantics | This specification, section 1 | `PREFIX_*` allowed; `*` rejected         | SDK, host grant evaluator                        |
| `layout.provider` capability   | This specification, section 2 | Deferred (not in v1 closed set)          | SDK (reject), host (remove), docs (do not claim) |
| Dependency inline table        | This specification, section 3 | `{ version = "...", prerelease = bool }` | SDK, host, template, resolver                    |
| Compatibility range grammar    | This specification, section 4 | Resolver version-requirement grammar     | SDK, host, registry validator                    |
| Service schema representation  | This specification, section 5 | TOML inline tables                       | SDK, host parser, template                       |
| `[limits]` manifest field      | This specification, section 6 | Rejected (not accepted)                  | SDK (reject), docs (do not claim)                |
| `[[network.egress]]` field     | This specification, section 6 | Rejected (not accepted)                  | SDK (reject), docs (do not claim)                |
| `[services.required]` field    | This specification, section 6 | Rejected (not accepted)                  | SDK (reject), docs (do not claim)                |

## Valid and invalid example corpus

### Complete valid manifest

```toml
[plugin]
id = "xuepoo.example"
version = "1.0.0"
name = "Example Plugin"

[compat]
bitty = "^0.1.0"
plugin-api = ">=1.0.0, <2.0.0"

[plugin.capabilities]
required = [
  "env.read:HOME",
  "env.read:BITTY_*",
  "fs.read:/home/*/projects/**",
  "network.connect:api.example.com:443"
]

[dependencies]
"xuepoo.gitcore" = ">=2.0.0"
"xuepoo.experimental" = { version = "^1.0", prerelease = true }

[services.provided]
"xuepoo.example.action" = { version = "1.0.0" }

[[lazy]]
events = ["terminal.ready"]
commands = [
  { id = "example.action", title = "Example Action" }
]
```

### Invalid manifest examples

```toml
# INVALID EXAMPLE 1: Wrong env capability spelling
[plugin.capabilities]
required = ["env:HOME"]  # Missing .read resource level

# INVALID EXAMPLE 2: Allow-all env wildcard
[plugin.capabilities]
required = ["env.read:*"]  # Explicit deny-by-default violation

# INVALID EXAMPLE 3: Experimental layout.provider
[plugin.capabilities]
required = ["layout.provider"]  # Not in accepted v1 closed set

# INVALID EXAMPLE 4: Invalid dependency table keys
[dependencies]
"xuepoo.foo" = { version = "1.0", unstable = true }  # Unknown key

# INVALID EXAMPLE 5: Invalid compat range
[compat]
bitty = "==0.1.0"  # Use = not ==

# INVALID EXAMPLE 6: JSON string service schema
[services.provided]
"xuepoo.foo" = '{"version":"1.0"}'  # Must be TOML inline table

# INVALID EXAMPLE 7: Rejected manifest fields
[limits]
memory_mb = 128  # Not an accepted manifest field

[[network.egress]]
host = "example.com"  # Not an accepted manifest field

[services.required]
"xuepoo.bar" = "1.0"  # Not an accepted manifest field
```

## SDK and host implementation requirements

### SDK validator changes

1. Update capability validator to require `env.read:<KEY>` and reject
   `env:<KEY>`.
2. Reject `layout.provider` with error: "not an accepted v1 capability."
3. Accept dependency inline table form
   `{ version = "...", prerelease = <bool> }`.
4. Apply resolver version-requirement validation to `compat.bitty` and
   `compat.plugin-api`.
5. Reject `[limits]`, `[[network.egress]]`, and `[services.required]` as
   unknown fields.
6. Ensure service schemas are TOML inline tables, never JSON strings.

### Host parser changes

1. Environment capability: already correct (`env.read:<KEY>`).
2. Remove `layout.provider` from capability allowlist.
3. Accept dependency inline table with `version` and `prerelease` keys.
4. Apply resolver constraint validation to compatibility ranges.
5. Update manifest parser to handle nested TOML inline tables for service
   schemas; remove JSON string shortcut.
6. Classify `[limits]`, `[[network.egress]]`, and `[services.required]` as
   experimental (warn or reject).

### Template generator changes

1. Update scaffold examples to use `env.read:<KEY>`.
2. Remove any `layout.provider` capability from examples.
3. Show both string and inline table dependency forms in comments.
4. Use TOML inline tables for service schemas in examples.
5. Do not generate `[limits]`, `[[network.egress]]`, or `[services.required]`.

### Documentation changes

1. Update all manifest examples to use `env.read:<KEY>`.
2. Remove `layout.provider` from capability lists and examples.
3. Document dependency inline table as accepted (remove "not yet enforced").
4. Clarify that compatibility ranges use resolver grammar.
5. Show only TOML inline table service schemas.
6. Do not mention `[limits]`, `[[network.egress]]`, or `[services.required]` as
   accepted fields.

## Verification plan

### Documentation gates

- Run `just check` in `bitty-plugins-docs`: markdownlint, link checker, and
  metadata validator must pass.
- Verify no document claims `env:<KEY>`, `layout.provider`, JSON string
  schemas, or rejected manifest fields as accepted forms.

### Cross-repository synchronization

After this specification is accepted:

1. `bitty-plugin-sdk` issue #120, #121: Update validators per SDK requirements
   above.
2. `bitty` issue #1410: Update host parser per host requirements above.
3. `bitty-plugin-template`: Update scaffold per template requirements above.
4. `bitty-plugins-docs`: Sweep all examples to canonical forms.

Verification: SDK validator, host parser, template generator, and docs examples
all accept the same valid manifest and reject the same invalid forms. No silent
grammar fork.

## Affected contracts

This specification clarifies but does not change the contracts in:

- [Plugin Platform RFC](plugin-platform-rfc.md): manifest schema and capability
  model remain normative; this document resolves specific spelling ambiguities.
- [Package Follow-up RFC](../packaging/package-followup-rfc.md): resolver
  constraint grammar remains normative; this document applies it to
  compatibility ranges.

## Security review

This specification was reviewed against the normative security corpus:

- Deny-by-default capability model: preserved. No allow-all wildcard; absence
  is denial.
- Grant consent lifecycle: unchanged. Grammar decisions do not relax consent
  requirements.
- Resolver determinism: unchanged. Compatibility ranges follow the same
  deterministic grammar as dependencies.
- Untrusted manifest parsing: clarified. SDK and host must reject experimental
  fields rather than silently accepting host-only shortcuts.

No security control is weakened by these grammar decisions.

## Acceptance criteria

This specification is accepted on 2026-09-26 and closes issues #95 and #96. The
following criteria are satisfied:

1. One authority table maps every disputed grammar element to exactly one
   canonical owner and form.
2. Valid and invalid example corpus is unambiguous and testable.
3. SDK, host, template, and documentation synchronization requirements are
   explicit.
4. Documentation-only `just check` passes with zero issues.
5. Independent review confirms no second document silently preserves rejected
   spellings.

## References

- [Plugin Platform RFC](plugin-platform-rfc.md): parent manifest schema and
  capability model.
- [Package Follow-up RFC](../packaging/package-followup-rfc.md): resolver
  constraint grammar and prerelease policy.
- Cross-contract review campaign:
  `research/review/2026-09-24/11-final-cross-contracts.md`, cluster CC-01.
- Issues: bitty-plugins-docs #95 (parent contract decision), #96 (grammar
  publication).
