# CDN assets (`cdn.bitty.run`)

Static binary assets for the website — screenshots, demo videos, font files —
live in the Cloudflare R2 bucket `bitty`, publicly served at
`https://cdn.bitty.run`. The Astro `dist/` output stays text-only; pages
reference CDN URLs built with `cdnUrl()` from `src/lib/cdn.ts` instead of
bundling binaries.

## Verified bucket state (2026-09-24)

- Bucket `bitty` exists (APAC region), created 2026-09-14.
- Custom domain `cdn.bitty.run` is attached, enabled, ownership active, SSL
  active. The `r2.dev` public URL is disabled, so the custom domain is the
  only public entry point.
- Public read works: missing keys return `404` from the R2 origin.
  Unauthenticated writes are rejected (`PUT`/`DELETE` without credentials
  return `401`); writes require the `CLOUDFLARE_API_TOKEN` credential, which
  is provided via environment / GitHub secrets only and never committed.
- CORS allows public `GET`/`HEAD` from any origin (required for cross-origin
  `@font-face` loads from `bitty.run`), `Max-Age 86400`.
- Lifecycle holds the default rule aborting incomplete multipart uploads
  after 7 days. No expiry rule: hashed assets are immutable, mutable aliases
  are overwritten in place.
- The bucket is empty: no real assets exist yet. Screenshots and demo media
  land post-0.1.0 in a later lane.

## URL scheme

```text
https://cdn.bitty.run/<prefix>/<name>
```

| Prefix    | Contents                             | Example                      |
| --------- | ------------------------------------ | ---------------------------- |
| `images/` | Screenshots, diagrams, OG/social art | `images/hero-a1b2c3d4.avif`  |
| `videos/` | Demo recordings, walkthroughs        | `videos/demo-00-intro.mp4`   |
| `fonts/`  | Web fonts loaded cross-origin        | `fonts/bittie-display.woff2` |

R2 has no real directories: prefixes are a naming convention enforced by
`cdnUrl()`, which rejects keys outside these three prefixes, absolute keys,
and path traversals.

## Cache convention

Caching follows the origin `Cache-Control` header set at upload time; there
are no zone-level cache rules, so every upload must set the header:

- Immutable hashed assets (`hero-a1b2c3d4.avif`):
  `Cache-Control: public, max-age=31536000, immutable`.
- Mutable aliases (`hero-latest.avif`): `Cache-Control: public, max-age=3600`.
- Fonts: same immutable rule as hashed assets.

## Upload workflow

Prerequisites: `wrangler` installed and authenticated via the
`CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` environment variables
(never print or commit these values).

```bash
# Immutable hashed asset (long edge cache)
wrangler r2 object put bitty/images/hero-<sha>.avif \
  --file ./hero.avif \
  --content-type image/avif \
  --cache-control "public, max-age=31536000, immutable"

# Mutable alias (short edge cache)
wrangler r2 object put bitty/images/hero-latest.avif \
  --file ./hero.avif \
  --content-type image/avif \
  --cache-control "public, max-age=3600"
```

Verify after upload:

```bash
# Public fetch works (200 + long max-age for hashed assets)
curl -sSI https://cdn.bitty.run/images/hero-<sha>.avif | head -n 8
# Private write stays blocked (401 without credentials)
curl -sS -o /dev/null -w "%{http_code}\n" -X PUT \
  --data-binary "probe" https://cdn.bitty.run/images/__write_probe__
```

Then reference the asset from the site with `cdnUrl("images/hero-<sha>.avif")`;
the `PUBLIC_CDN_BASE_URL` build-time constant in `astro.config.mjs` carries
the same origin for client-side code.

## Deliberately out of scope

- Uploading real assets (none exist yet; screenshots are post-0.1.0).
- Zone-level cache or transform rules.
- Deploy workflow changes.
