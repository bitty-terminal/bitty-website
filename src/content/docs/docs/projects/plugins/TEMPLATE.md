---
title: Plugin documentation template
description: Reusable per-plugin page template for status design schemas contracts and evidence links
category: project
audience: plugin-author
document_type: reference
status: draft
website_publish: false
sidebar_order: 20
---

# Plugin documentation template

Use this template to start a plugin directory at
`docs/projects/plugins/<plugin>/`. It covers the standard page set defined by
the
[documentation workflow](../../development/documentation-workflow.md#per-plugin-documentation-page-set):
status, design, schemas and contracts, and evidence and links. Copy the index
skeleton below into `README.md`, replace every placeholder with reviewed
content, and keep the flat frontmatter schema exact or `just metadata` fails.

## Standard page set

| Page          | Typical `document_type`   | Purpose                                                              |
| ------------- | ------------------------- | -------------------------------------------------------------------- |
| `README.md`   | `index`                   | Identity, current stage, owning repository, and page links.          |
| `design.md`   | `specification`           | Scope, UX, capability boundaries, and mechanism/policy split.        |
| `schemas.md`  | `contract` or `reference` | Manifest fields, configuration keys, wire/API schemas, and versions. |
| `evidence.md` | `register`                | Decision links, experiments, reviews, and test/release evidence.     |

## Status

State the plugin lifecycle stage with the project vocabulary (candidate,
draft, accepted, experimental, implemented, verified). Never describe a
candidate as implemented, shipped, or compatible. Link the authoritative
status source, such as the decision register, an accepted specification, or
the owning repository's release evidence.

## Design

Describe the problem, in-scope and out-of-scope behavior, the mechanism and
policy split, capability and trust boundaries, resource budgets, failure
behavior, and alternatives considered. Cross-project contracts stay in the
shared directories; link to them instead of restating them.

## Schemas and contracts

Record every machine-readable surface: manifest fields, configuration keys,
events, commands, wire formats, and version rules. Reference the canonical
specification for shared schemas; the plugin page owns only plugin-specific
additions. Note the validation evidence for each schema.

## Evidence and links

List decision register entries, open questions, reviews, experiments, tests,
audits, and release artifacts by revision and date. Mark what is implemented,
what is verified, and what remains unverified; absence of evidence is not
evidence of absence.

## Index skeleton

```markdown
---
title: Plugin name
description: One-line plugin summary
category: project
audience: plugin-author
document_type: index
status: draft
website_publish: false
sidebar_order: 10
---

# Plugin name

- Identity: `bitty-terminal.<plugin>`
- Owning repository: not assigned
- Stage: candidate
- Status source: link to the decision, specification, or evidence

## Pages

- [Design](design.md)
- [Schemas and contracts](schemas.md)
- [Evidence and links](evidence.md)

## Scope

What the plugin does, and what it explicitly does not do yet.
```

## Parent index

[Plugin documentation](README.md) defines the partition and the candidate
list.
