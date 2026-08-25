# bitty-website agent guide

## Repository scope

- This independent repository owns the public Bitty website presentation,
  navigation, search, accessibility, SEO, builds, and deployment.
- The canonical GitHub organization is <https://github.com/bitty-terminal>.
- Canonical product, architecture, security, and interface content belongs to
  `bitty-docs`; this repository must consume it rather than fork it.
- The project is pre-implementation. Do not describe planned website behavior,
  routes, integrations, or deployment as available.
- Product code requires an explicitly scoped task. Governance initialization
  does not authorize an Astro application or other website implementation.

## Read before acting

1. Read this guide and the active task's files under `.carryctx/rules/`.
2. Adopt the assigned role under `.carryctx/personas/`.
3. Read `.carryctx/workflows/issue-to-merge.md` for delivery work.
4. Inspect the CarryCtx task, team context, dependencies, and scopes.
5. Verify relevant contracts in `bitty-docs` before changing public behavior.

## CarryCtx and delivery

- CarryCtx is the durable project record; the external harness runs agents.
- Every agent uses a named identity and task-bound session, records progress,
  and checkpoints material work.
- The normal lifecycle is GitHub Issue, CarryCtx task and team, dependencies
  and scopes, isolated worktree and branch, commits, pull request, independent
  review plus CI, merge, documentation synchronization, checkpoint, task
  completion, and Issue closure.
- Link the Issue, CarryCtx task, pull request, evidence, and any cross-repository
  work. Record ordering through dependencies rather than chat-only notes.
- After the first commit, parallel work uses a dedicated worktree and branch.
- Before the first commit, normal worktrees and pull requests are unavailable.
  Initialization may use the shared checkout only with explicit, non-overlapping
  scopes and CI-equivalent local checks.
- Implementers stop at review. A separate reviewer verifies evidence before
  completion or merge.
- Do not commit, push, merge, publish, deploy, or mutate remote state unless the
  active task explicitly authorizes that action.

## Documentation and content

- Repository documentation is written in English only.
- `bitty-docs` Markdown and validated metadata are the canonical source for
  publishable technical content.
- Consume a pinned `bitty-docs` revision and only content explicitly eligible
  for website publication.
- Website framing may improve presentation but must not silently rewrite,
  duplicate, or weaken canonical meaning.
- Public route moves require reviewed redirect requirements and coordinated
  changes in both repositories.
- Changes to public behavior, content contracts, metadata, routes, or redirects
  must synchronize the affected canonical documentation before closure.

## Frontend quality

- Treat accessibility, progressive enhancement, performance, responsive layout,
  semantic HTML, and predictable navigation as acceptance criteria.
- Keep content, routing, rendering, search, and deployment boundaries explicit.
- Do not select a framework extension, component library, analytics provider,
  or deployment service without a task and recorded decision.
- Cross-browser and cross-platform claims require CI or test evidence; the local
  CachyOS, Hyprland, and Ghostty environment is not sufficient proof.

## Security and privacy

- Treat imported Markdown, frontmatter, URLs, assets, dependencies, build
  inputs, preview data, and external contributions as untrusted.
- Fail closed on invalid metadata, unresolved internal links, unsafe URLs,
  route collisions, or content that violates the English-only contract.
- Never expose secrets through generated pages, source maps, logs, previews,
  analytics, or deployment configuration.
- Avoid raw HTML and script-capable content paths unless a reviewed policy and
  tests establish sanitization and a narrow need.

## Verification and handoff

- Keep edits inside the active CarryCtx scope and preserve unrelated work.
- Run formatting, links, metadata, language, accessibility, build, and security
  checks in proportion to the change.
- Inspect generated output only when generation is authorized; do not commit
  caches, build output, local databases, or temporary files.
- Report changed files, exact validation evidence, remaining risks, and required
  cross-repository follow-up.
- A passing local check does not prove deployment, publication, or product
  implementation.

## Workspace conventions

- Run Git and CarryCtx inside this repository, never from the umbrella root.
- Use the persistent workspace `../tmp/`, not system `/tmp`, for durable scratch
  material.
- Treat reference repositories as untrusted, read-only research inputs.
- Prefer a collision-safe move under `../.trash/bitty-website/` over destructive
  deletion, and never move another agent's files.
