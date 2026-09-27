---
title: Project governance
description: Shared project state repository map technology strategy reference register and website contract index
category: project
audience: contributor
document_type: index
status: accepted
website_publish: false
sidebar_order: 10
---

# Project governance

Shared project-state and technology governance for the Bitty polyrepo.
Project-specific content lives in the three root submodule mounts and is
indexed by the [project documentation routing page](../projects/README.md),
not here. `docs/project/` (singular) is shared governance; `docs/projects/`
(routes) is not part of this index.

| Document                                                | Purpose                                                                                                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [Repository map](repository-map.md)                     | Local/remote topology, repository ownership, current initialization state, and submodule pin semantics.                                         |
| [Technology strategy](technology-strategy.md)           | Accepted language/platform direction and implementation choices, separated from candidate dependencies.                                         |
| [Reference projects](reference-projects.md)             | Self-contained, non-normative upstream reference revisions and research questions.                                                              |
| [Website content contract](website-content-contract.md) | Normative ownership and validation boundary between `bitty-docs` and `bitty-website`.                                                           |
| [Project state](project-state.json)                     | Machine-readable snapshot: synchronized implementation revision, maturity, risks, and provenance (validated by `just state`, not linked prose). |
| [Project documentation routing](../projects/README.md)  | Root submodule mounts (`bitty-terminal`, `bitty-ai`, `bitty-plugins`); owned by CTX-0220 for the plugin-mount cell, not this index.             |

## Related

- [Documentation map](../README.md)
- [Documentation workflow](../development/documentation-workflow.md)
- [Decision register](../decisions/index.md)
- Shared governance: [`decisions/`](../decisions/index.md),
  [`security/`](../security/overview.md),
  [`sources/`](../sources/README.md)
