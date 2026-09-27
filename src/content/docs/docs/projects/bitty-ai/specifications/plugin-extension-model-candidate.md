---
title: Plugin and extension model (candidate)
description: Candidate two-level extension model, host plugin registries, manifest relations, permissions, and layer split
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: false
sidebar_order: 52
---

# Plugin and extension model (candidate)

## Purpose and scope

This is a **draft discussion synthesis**, not a runtime specification, accepted
decision, dependency selection, release commitment, or implementation claim.
It records the candidate direction for the plugin and extension model: the
two-level extension model, Bitty AI as a Host Plugin, Bitty AI as a
plugin-platform plugin (registries, Agent UI, extension catalog, slash commands
as extensions), Extension Points, Manifest relations, permission
non-inheritance, and Service API versioning as they apply to `bitty-ai`, plus
the proposed two-layer split (`bitty-ai-runtime` versus the `bitty-ai`
application) and the three-layer model.

The recommendation is to treat every layered model below as a candidate input
to the draft [AI Architecture](../architecture/ai-architecture.md) and its related draft
dispositions, never as an override of the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) or the normative security corpus.
In particular, the two-layer split, the three-layer model, and the four-level
extension ladder are **not** accepted by this candidate design. Nothing here is
promoted to accepted status, and no implementation is described as shipped.

The direction's strongest ideas are the two-level extension model (generic host
primitives below, domain runtimes above, domain extensions on top), the
permission non-inheritance rule (a dependency never confers capabilities),
versioned service APIs per extension domain, and the minimal-base principle
(AI machinery ships only when the user opts into AI). Its weakest claims are
the concrete registry, manifest, and version-string sketches, which are
unreviewed interface proposals, and the assumed clean split between a native
runtime and a framework plugin, which has no ownership, packaging, or
compatibility evidence behind it. Those are corrected below.

This synthesis references, without duplicating or modifying, the draft
[AI Architecture](../architecture/ai-architecture.md) (candidate inputs only),
[Provider plugin boundary](../providers/provider-plugin-boundary.md),
[Panel environment awareness](../interfaces/panel-environment-awareness.md),
[Execution ownership R1](../architecture/execution-ownership-r1.md), and
[Tool transport R2](../architecture/tool-transport-r2.md). The accepted
[IPC and Agent RFC](ipc-agent-rfc.md) is unaffected by this draft. This
document creates no AIQ or OQ identifier and closes none.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the cited design direction only; no review has accepted it.              |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## Boundary context: where AI sits in the discussed models

These placement lines are boundary context only. Their retained consequence
for `bitty-ai` is positional: in every model the direction draws, AI appears as
an application or runtime peer, never as Core. Core is credited with knowing
only generic primitives (panel, widget, command, service, event, task,
storage, capability) while remaining ignorant of AI specifics. That matches
the standing direction that terminal, panel, process, rendering, and
transport mechanisms stay terminal-side while model, context policy, agent
state, tools, and permissions stay `bitty-ai`-side.

**Critical judgment:** none of these lines specifies an interface. The
"Core knows primitives, not applications" principle is retained as a design
objective; the concrete primitive set is undecided and stays with the owning
repositories.

## Motivating question and the two-level extension model

The retained model is:

```text
Bitty Core (generic primitives, services, capabilities, events)
 -> bitty-ai (AI-specific runtime)
 -> AI extensions (providers, context sources, memory, commands)
```

Extensions of `bitty-ai` extend AI-domain capability, never Bitty Core
capability. A provider, memory backend, or review command plugs into the AI
runtime's registries; it does not gain terminal, panel, or process authority
by virtue of participating in the AI ecosystem. This is the same pattern the
candidate direction draws for the editor domain, and the symmetry is deliberate: each
domain runtime mediates its own extensions.

**Critical judgment:** the model is a candidate layering, not an accepted
crate or process topology. Whether the AI runtime is a library, a process, a
plugin, or a combination remains open; the stable claim is only the
mediation direction (extensions attach to the domain runtime, not to Core).

## Bitty AI as a Host Plugin

The retained direction is that Bitty AI is both a plugin of the terminal
platform and a platform for AI extensions. The direction's example tree names
provider extensions (OpenAI, Anthropic), memory, a device or protocol
extension, and review tooling as children of the Bitty AI host. Runtime
management stays flat: all plugins remain peer components under one plugin
runtime even when their extension relationships form a tree, so the "plugin
tree" is a dependency and extension graph, not a process hierarchy.

**Critical judgment:** the example child list is illustrative, not a
roadmap. The stable claims are the dual role (plugin and host) and the
flat-runtime reading, which keeps extension relationships from becoming
ambient authority paths. Concretely, a review or memory extension of
`bitty-ai` must pass the same R2 gate order as any tool or provider effect;
hosting confers no bypass.

## Bitty AI as a plugin-platform plugin

The retained candidate decomposition is:

- **Agent Runtime and conversation state** as the domain core: scheduling,
  turn structure, and conversation records owned by the AI runtime.
- **Registries** as the extension seams: separate registration points for
  tools, context sources, models, memory backends, and compaction
  strategies, so each category evolves and reviews independently.
- **Agent UI** as a consumer surface: chat, panels, commands, settings, and
  workflows rendered through host panels, not through `bitty-ai`-owned
  windowing.
- **Slash commands as extensions**: review, plan, task, compact, and loop
  style commands contributed by extensions rather than built into the core,
  keeping the core small and making each command separately reviewable,
  permissioned, and removable.

**Critical judgment:** every registry name, catalog entry, and command name
is a proposal. The stable claim is the decomposition principle (small core,
typed seams, contributed surface behavior) together with its review
consequence: each extension is authorized, budgeted, and revocable on its
own, and removing an extension removes its commands without touching the
core. Transport placement of these extensions (native versus MCP) stays with
R2; provider contract shape stays with the provider boundary draft.

## Extension Points as they apply to bitty-ai

The retained direction is that `bitty-ai` declares a fixed set of typed
extension points, one per capability category, and extensions attach only
through declared points. The direction's declaration sketch names model, tool,
context, memory, compactor, agent, command, and UI points for the AI domain.
The consequence is compositional: installing AI extensions composes an
extension graph (which points are filled, by which reviewed extensions, at
which versions) rather than merely loading files, and the plugin manager can
reason about that graph for dependency resolution, conflict detection, and
removal.

**Critical judgment:** the point names and their exact arity are proposals,
not an accepted schema. The stable claim is typed attachment: no extension
contributes capability outside a declared point, and undeclared integration
(such as a memory backend reaching directly into provider transport) is out
of scope for this model. Point definitions, once drafted, need security
review as capability-bearing interfaces.

## Manifest relations

The retained direction is dependency honesty in metadata: an AI extension
declares its host (`bitty-ai` with a version predicate) and the extension
points it contributes, so the plugin manager knows the extension cannot work
without its host and can resolve, verify, or refuse the dependency tree at
install time. The direction's TOML sketches are illustrative shapes, not a
schema.

**Critical judgment:** no manifest field, version predicate syntax, or
resolution algorithm is adopted here. The stable claim is only that
host-dependence is declared and machine-checkable before execution, and that
declaration never doubles as a permission grant (see the next section).

## Permission non-inheritance, especially for Bitty AI

This is the load-bearing rule of the whole candidate design and is retained
verbatim as a draft principle: **dependency is not authority**. A plugin that
depends on, extends, or is hosted by `bitty-ai` inherits no capability from
that relationship. Each extension is granted exactly the capabilities its own
reviewed function needs (a theme-like extension needs only its presentation
point; a context provider needs only its scoped reads; a tool extension
needs only its declared effect class), attenuated from and never exceeding
the host's own grants. A malicious or compromised extension that merely
declares a dependency on a powerful host gains nothing.

For Bitty AI the rule bites hardest because the host is drawn with broad
powers (filesystem, terminal, process, network, agent execution). The draft
consequence is a default-deny posture for AI extensions: no inherited
filesystem, process, network, or agent-execution rights; every such right is
an explicit, separately consented grant behind the R2 unified authorization
backend, with typed redaction before context entry per the standing privacy
baseline.

**Critical judgment:** this principle aligns with, and does not relax, the
normative least-privilege and fail-closed obligations. It still needs a
capability vocabulary, a grant and attenuation mechanism, and enforcement
evidence before any extension exercises a sensitive effect.

## Service API versioning for bitty-ai surfaces

The retained direction is per-domain versioned contracts: once `bitty-ai`
exposes a tools or context surface to extensions, that surface carries a
version independent of both the host implementation and sibling surfaces, so
internal refactoring (buffers, documents, views, cursors, or their AI-side
equivalents) does not break the extension ecosystem. The version strings in
the direction are illustrative, not an adopted scheme.

**Critical judgment:** versioning policy (compatibility windows, deprecation,
migration, coexistence of major versions) is entirely open. The stable claim
is only the decoupling objective, plus its process consequence: introducing a
versioned surface is a cross-ecosystem promise that needs owner review, not a
unilateral host decision, and experimental surfaces should stay unversioned
until that review happens.

## Two-layer split and the three-layer model

The retained candidate allocation is:

| Layer            | Candidate contents from the direction                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native primitive | Provider transport, streaming, tool execution runtime, scheduling, context engine, token accounting, MCP transport, process integration, storage primitives |
| Framework plugin | Chat UI, agent panel, commands, settings, workflows, prompt configuration                                                                                   |
| Extension plugin | Providers, context sources, memory backends, review and workflow extensions                                                                                 |

The names `bitty-ai-runtime` and `bitty-ai` for the lower two layers are the
candidate direction's suggestion; the task-level caution stands that the two concepts
should not share one name. The minimal-base consequence is preserved: a bare
install carries no HTTP clients, protocol parsers, agent runtimes, or
conversation stores until the user opts into AI capability.

**Critical judgment:** this split is the weakest structural claim in the
retained ranges. It has no ownership, packaging, versioning-compatibility,
or process-boundary evidence behind it, and it must not be read as an
accepted crate, package, or release decision. It is recorded as a candidate
input to [AI Architecture](../architecture/ai-architecture.md) and the related R-series
dispositions, where the std-only runtime direction, provider boundary, and
transport placement are decided on their own evidence. The neighboring
four-level ladder and the native-versus-extension axis were read for exclusion
accuracy and are not retained here.

## Addendum: comparable-programs round

This addendum records ONLY the bitty-ai-relevant parts of the appended
comparable-programs round. It carries the same standing as the body above: a
draft discussion synthesis and candidate input to the draft
[AI Architecture](../architecture/ai-architecture.md) and its related draft
dispositions, never an override of the accepted
[IPC and Agent RFC](ipc-agent-rfc.md) or the normative security corpus.
The layered models below stay candidate-only. This addendum creates no AIQ
or OQ identifier and closes none. Relations are referenced, not modified.

The addendum's strongest ideas are the composition equation (`Bitty Base`
plus AI Runtime plus `Bitty AI` yields an AI Agent Workspace), which states
the candidate layering's intent, and the
JupyterLab token-mediated service pattern as adjacent evidence for typed
extension seams. Its weakest claims are the unverified external references and
the product-positioning material (the intersection diagram and the
programmable-workspace definition), which are unreviewed discussion claims and
stay excluded.

### AI Panel placement in the workbench analogy

The retained consequence is positional only: AI appears as a peer panel
(AI Panel beside Terminal, Bitter, Git, Docker, and Custom App panels),
consistent with the boundary-context section above (AI as hosted content
under R1 projection-only panels) and with the plugin-platform section's
Agent UI as a consumer surface rendered through host panels. The
surrounding workbench mechanics (Workbench regions, the WebView route, the
native widget-tree sketch) are `bitty`-side rendering and workbench design
and stay out.

**Critical judgment:** illustration, not a required panel set. No
interface follows from this placement.

### Base plus AI Runtime plus Bitty AI yields an AI Agent Workspace

The retained candidate equation is:

```text
Bitty Base + AI Runtime + Bitty AI = AI Agent Workspace
```

set beside the direction's sibling equations (Base plus Editor Runtime plus
Bitter yields an editing environment; bare Base is a terminal/workspace).
This reinforces the two-layer/three-layer model recorded in the body as a
CANDIDATE input: it restates the layering intent, and it adds no
ownership, packaging, versioning-compatibility, or process-boundary
evidence. The weakness recorded in the layer-split section therefore
stands unchanged, and nothing here is accepted as a crate, package, or
release decision.

**Critical judgment:** reinforcement of candidacy, not new evidence.

### Study recommendation for bitty-ai extension composition

Retained insofar as it applies to `bitty-ai` extension composition:

- JupyterLab's token-mediated services and core-as-plugins pattern as
  adjacent evidence for the registries and extension-points decomposition
  (typed seams, small core, contributed surface behavior).
- The Eclipse RCP checklist as review dimensions for any future manifest,
  lifecycle, or composition proposal; the minimal-platform analogy itself
  is motivation, not architecture.
- The Emacs host-provides-primitives packages-decide-product principle as
  philosophical support for the two-level model; the Emacs runtime and
  Lisp sections themselves stay excluded as
  `bitty`-side philosophy.

**Critical judgment:** study leads, not findings. The external reference
links are unverified discussion citations, with the
same standing as the repository citations already excluded in the body.

### Zed agent-server extension category as adjacent boundary context

Retained as adjacent boundary context only: an existing native editor
packages agent capability as an extension category, which is consistent
with the small-core and contributed-surface direction but is a product
fact about Zed, not a `bitty-ai` contract. The remainder of the Zed
section (including the Zed-as-Bitty-plus-Bitter
equation) is `bitty`-side editor comparison and stays out.

## Relation to existing systems

The draft [AI Architecture](../architecture/ai-architecture.md) layered models are
candidate inputs only; the two-layer split, three-layer model, and four-level
ladder proposed in the direction are **not** accepted by this candidate design and
must not be read as crate, package, or release decisions. Provider contract
and transport questions stay with the draft
[Provider plugin boundary](../providers/provider-plugin-boundary.md); execution and
environment questions stay with [Execution ownership R1](../architecture/execution-ownership-r1.md)
and [Panel environment awareness](../interfaces/panel-environment-awareness.md); tool
authorization and transport placement stay with
[Tool transport R2](../architecture/tool-transport-r2.md). Each is referenced, never
duplicated or modified.

Normative security obligations (least privilege, per-action scopes,
capability-based and auditable permission that fails closed, typed redaction,
consented recording, secret minimization) override every discussion example
throughout this document. The direction's registry names (`Tool Registry`, `Context Registry`,
`Model Registry`, and similar), extension-point names, manifest fields, and
version strings are conceptual vocabulary, not additions to any accepted
registry or schema. This draft creates or closes no AIQ or OQ identifier;
open questions stay with
[AI Unresolved Questions](../product/ai-unresolved-questions.md) and shared
governance.

## Open items

These are future evidence requirements, not tests executed by this
documentation task. They keep the design falsifiable before any plugin-system
proposal constrains `bitty-ai`.

| Campaign               | Required observation                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mediation direction    | An AI extension exercises capability only through its declared point; removing the host or the point disables it without touching Core                    |
| Small core             | A minimal `bitty-ai` install carries no provider, memory, or workflow machinery; each arrives as a separately reviewable, removable extension             |
| Commands as extensions | Review, plan, task, compact, and loop style commands install, update, and uninstall independently with per-command permission and no core change          |
| Non-inheritance        | An extension declaring a dependency on a powerful host gains no capability; each sensitive effect needs its own explicit grant behind the unified backend |
| Versioned surfaces     | Host-internal refactoring ships without breaking extensions pinned to a prior surface version; experimental surfaces stay unversioned until owner review  |
| Layer-split evidence   | Any future native-versus-framework split names an owner, a packaging and compatibility contract, and a process boundary before code is authorized         |

Promotion needs independent AI architecture, provider-boundary, terminal and
plugin-owner, docs-curator, and security review. Route registry schemas,
extension-point capability review, manifest format, versioning policy, and
the layer-split ownership and compatibility contract to scoped owner tasks.
This draft changes no normative contract and authorizes no product code.
