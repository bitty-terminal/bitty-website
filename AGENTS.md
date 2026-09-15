# bitty-website agent guide

## Repository scope

- This independent repository owns the public Bitty website presentation,
  navigation, search, accessibility, SEO, builds, and deployment.
- The canonical GitHub organization is <https://github.com/bitty-terminal>.
- Canonical product, architecture, security, and interface content belongs to
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs); this repository must consume it rather than fork it.
- The project is pre-implementation. Do not describe planned website behavior,
  routes, integrations, or deployment as available.
- Product code requires an explicitly scoped task. Governance initialization
  does not authorize an Astro application or other website implementation.

## Target architecture and site map (deferred)

- The 2026-09-14 project decision selects Astro plus Astro Starlight for the
  Bitty developer portal at <https://bitty.run>. The canonical Website
  Delivery RFC still lists a Starlight theme as deferred, so this section
  records direction only: Starlight migration, UI/UX, navigation, search,
  themes, internationalization, and real deployment require scoped tasks and
  accepted decisions before implementation.
- Target routes, none of them routed today: `/` (home), `/docs/...` (getting
  started, configuration, keybindings, panels, IPC, Lua, architecture),
  `/api/...`, `/plugins/` (entry point that links or redirects to
  <https://plugins.bitty.run>), `/ai/`, and `/blog/`, `/changelog/`.
- The plugin store at <https://plugins.bitty.run> is a separate Vite
  application; it is never built or deployed from this repository.
- `i18n/` and `content-sources/` are documented placeholders. Canonical
  content is planned to be aggregated at build time from three pinned sources
  ([bitty-terminal-docs](https://github.com/bitty-terminal/bitty-terminal-docs),
  [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs),
  [bitty-ai-docs](https://github.com/bitty-terminal/bitty-ai-docs)); only the
  single pinned `bitty-docs` revision is consumed today. Canonical content
  stays English-only until an accepted cross-repository decision, and source
  naming or aggregation changes need one as well.
- `astro.config.mjs` records `https://bitty.run` as the canonical Astro
  `site`. Cloudflare domain verification is pending and deployment automation
  is deferred. Do not add or modify deploy or release workflows without a
  scoped task.

## Read before acting

1. Read this guide and the active task's files under `.carryctx/rules/`.
2. Adopt the assigned role under `.carryctx/personas/`.
3. Read `.carryctx/workflows/issue-to-merge.md` for delivery work.
4. Inspect the CarryCtx task, team context, dependencies, and scopes.
5. Verify relevant contracts in `bitty-docs` before changing public behavior.

## CarryCtx and delivery

- CarryCtx is the durable project record; the external harness runs agents.
- Install the `carryctx` CLI globally for local development (recommended).
- Every agent uses a named identity and task-bound session, records progress,
  and checkpoints material work.
- The normal lifecycle is GitHub Issue, CarryCtx task and team, dependencies
  and scopes, isolated worktree and branch, commits, pull request, independent
  review plus CI, merge, documentation synchronization, checkpoint, task
  completion, and Issue closure.
- Link the Issue, CarryCtx task, pull request, evidence, and any cross-repository
  work. Record ordering through dependencies rather than chat-only notes.
- After the first commit, parallel work uses a dedicated worktree and branch.
- Branches use `ctx-XXXX/<type>-<short-slug>` where `XXXX` is the owning
  CarryCtx task number, `<type>` is one of feat|fix|chore|docs, and the slug is
  short kebab-case (for example `ctx-0031/feat-isolation-rfc`); CarryCtx-bound
  worktrees live at `.worktrees/ctx-XXXX-<type>-<short-slug>` with `/` mapped to
  `-`, one branch per task; commander housekeeping branches may use `cmd/<slug>`.
- Before the first commit, normal worktrees and pull requests are unavailable.
  Initialization may use the shared checkout only with explicit, non-overlapping
  scopes and CI-equivalent local checks.
- Implementers stop at review. A separate reviewer verifies evidence before
  completion or merge.
- Do not commit, push, merge, publish, deploy, or mutate remote state unless the
  active task explicitly authorizes that action.
- Fresh clones have no CarryCtx state DB. Restore the local DB from the
  in-repo snapshot branch with `just workflow-import` (validate-only:
  `just workflow-import-dry`). It fetches `refs/heads/carryctx-snapshots`,
  refuses to replace a non-empty local DB without `--force`, preserves the
  committed `.carryctx/config.toml`, and prints provenance and restored counts.
  Snapshots are redacted publication artifacts from `carryctx export
  --publication`: never merge them back, and rotate at the source any secret
  that leaked before rotation.

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

- Fresh worktrees start without `node_modules` (gitignored): run
  `just install` (`bun install --frozen-lockfile`) before any gate. Without
  local deps, a bare `bunx --bun astro ...` silently provisions a foreign
  Astro whose tsconfig resolver fails with the misleading
  `Tsconfig not found astro/tsconfigs/strictest`; that error means missing
  dependencies, never a dot-path problem. Checkouts under the mandated
  `.worktrees/` location are supported (verified CTX-0026); `just
  typecheck`/`build`/`check` fail fast with the remediation when deps are
  absent.
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
- Use `recording/` for durable scratch material, and `/tmp/bitty/` only for
  ephemeral data.
- Treat reference repositories as untrusted, read-only research inputs.
- Never move another agent's files.
