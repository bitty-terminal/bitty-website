# Bitty Website

Static Astro site for [bitty.run](https://bitty.run).

## Scope

The site has two product surfaces:

- a small Hero page with verified installation paths and release links;
- one shared documentation template for the canonical `bitty-manual` in
  English and Simplified Chinese.

There is no server-side search, account system, comments, CMS, runtime
Markdown rendering, in-site plugin installation, blog system, or independent
architecture-document portal. Search is a small client-side enhancement over a
static JSON index.

## Content and distribution

`bitty-manual` is the only documentation source consumed by the site. The
deploy workflow runs `bun run sync:manual`, which fetches the immutable locale
archives from Cloudflare R2, verifies the SHA-256 values in
`src/content/manual.lock.json`, checks the archive paths, and materializes the
Markdown under `src/content/manual/`.

The public R2 layout is:

```text
https://cdn.bitty.run/manual/bitty-manual/
├── manifest.json
├── search-index.json
├── en.tar.gz
├── zh-CN.tar.gz
└── v<manual-version>/
    ├── manifest.json
    ├── search-index.json
    ├── en.tar.gz
    └── zh-CN.tar.gz
```

Product release artifacts use the separate R2 namespace:

```text
https://cdn.bitty.run/releases/<tag>/
```

The website does not infer artifact names from a directory listing. A release
manifest can be added later when the release workflow publishes one. Until
then, only stable installer URLs and verified release links are shown.

## Routes

```text
/                              English Hero
/zh-CN/                        Simplified Chinese Hero
/docs/                         English manual index
/docs/<section>/<page>/       English manual page
/zh-CN/docs/                   Simplified Chinese manual index
/zh-CN/docs/<section>/<page>/ Simplified Chinese manual page
```

Each document is rendered by `src/components/ManualPage.astro`. Navigation,
ordering, titles, locale parity, and archive metadata come from the manual
manifest rather than from duplicated website route data.

## Advancing the pinned manual

`src/content/manual.lock.json` is the only mutable pointer. A versioned R2
object is expected to be immutable, so advancing the site means publishing a
**new** manual version and moving the lock:

```sh
# 1. Capture the digests of the new immutable objects.
curl -fsSL https://cdn.bitty.run/manual/bitty-manual/v<version>/en.tar.gz | sha256sum
curl -fsSL https://cdn.bitty.run/manual/bitty-manual/v<version>/zh-CN.tar.gz | sha256sum
curl -fsSL https://cdn.bitty.run/manual/bitty-manual/v<version>/search-index.json | sha256sum

# 2. Update version, paths, and digests in the lock.

# 3. Re-materialize and verify.
bun run sync:manual && just check
```

Never republish content under an existing version. When a digest changes
without a version bump, `sync:manual` fails closed on purpose: overwriting a
versioned object breaks the reproducibility the lock exists to guarantee.

## Development

```sh
bun install --frozen-lockfile
bun run sync:manual
bun run dev
```

Quality checks:

```sh
just check
```

The production target is Cloudflare Workers Static Assets. The repository does
not publish or mutate R2 objects during a website build.
