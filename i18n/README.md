# Internationalization (placeholder)

This directory reserves the future locale layout for the website. It holds no
locale content and introduces no routing; internationalization is deferred
until an accepted cross-repository decision defines ownership, review, and
synchronization.

## Current policy

- Canonical documentation is English-only. The pinned `bitty-docs` corpus, its
  metadata checks, and the website language gate stay English until a decision
  changes that contract.
- The website must not serve translated content derived from unofficial
  sources.

## Planned layout (not implemented)

When internationalization is accepted, this directory is expected to hold
per-locale configuration and message catalogs separated by locale, for example
an `en/` source-language directory plus reviewed locale directories.

The exact layout, catalog format, fallback rules, route prefixes, and any
Astro Starlight i18n configuration belong to the owning scoped task and its
accepted decision. No translation is published before that decision records
translation status, review ownership, and source identity.

## Related

- Repository target direction: `README.md` and `AGENTS.md`.
- Canonical content boundary: the `bitty-docs` website content contract.
