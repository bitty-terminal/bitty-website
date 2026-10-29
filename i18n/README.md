# Website internationalization

The public site supports English (`en`) and Simplified Chinese (`zh-CN`). The
canonical translated documentation is shipped by the `bitty-manual` package;
this directory is reserved for website-only interface strings and future
locale-specific site metadata.

## Routes

- `/` and `/docs/...` — English;
- `/zh-CN/` and `/zh-CN/docs/...` — Simplified Chinese.

The route prefix is explicit. The site does not rewrite pages based on the
browser's language preference.

## Ownership

- `bitty-manual/en/` is the canonical English manual;
- `bitty-manual/zh-CN/` is the reviewed Simplified Chinese mirror;
- website-only labels belong in Astro components or locale data modules;
- `src/content/manual.lock.json` pins the exact manual release consumed by the
  static build.

Locale parity is verified by `bun run sync:manual` before the website build.
