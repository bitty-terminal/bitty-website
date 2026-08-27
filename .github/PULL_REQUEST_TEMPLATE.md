<!-- Conventional Commits title: feat(scope): description -->
<!-- Link the Issue: Closes #8 -->

## What & why

<!-- What does this change and why? -->

## Changes

-

## Testing

- [ ] `bun run format:check` passes (`just fmt-check`)
- [ ] `bun run lint:md` passes (`just markdownlint`)
- [ ] `bun run typecheck` passes (`just typecheck`)
- [ ] `bun run build` succeeds and `dist/index.html` exists without `dist/_worker.js` (`just build` / `just dist`)
- [ ] `bun run wrangler:dry-run` passes (`just wrangler-dry-run`)
- [ ] `actionlint .github/workflows/*.yml` passes (`just actionlint`)
- [ ] `just check` passes (aggregate gate)

## Checklist

- [ ] No secrets, credentials, or local paths committed
- [ ] No generated output committed (`dist/`, `.astro/`, `.wrangler/`)
- [ ] Documentation synchronized if public behavior or workflow changed

## Risks

<!-- Known risks or follow-up required -->

## Documentation synchronization

<!-- Link canonical docs updates if applicable; otherwise state none required -->
