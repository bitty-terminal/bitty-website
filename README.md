# Bitty Website

```text
 ____  ___ _____ _______   __
| __ )|_ _|_   _|_   _\ \ / /
|  _ \ | |  | |   | |  \ V /
| |_) || |  | |   | |   | |
|____/|___| |_|   |_|   |_|
Arcade Speed · Pure Rust · Piccolo Lua VM
```

Production portal and documentation engine for the **Bitty** GPU-accelerated microkernel terminal emulator: [https://bitty.run](https://bitty.run).

Built with [Astro](https://astro.build), [TypeScript](https://www.typescriptlang.org/), and vanilla CSS deployed to [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).

---

## Highlights & Visual Architecture

### 1. Cyber-Pop × Cel-Shaded Manga Aesthetic

The site pairs Japanese comic pop magazine paper styling with an 80s/90s arcade cabinet visual language:

- **Shibuya-Pop (Light / Default)**: Warm newsprint paper background (`#fffdf6`), deep ink typography (`#14121d`), halftone dot background accents, and bold 2px comic-book borders with solid drop-shadow offsets (`4px 4px 0px`).
- **Akiba-Cyber (Dark)**: Arcade CRT monitor glow (`#0b0914`), electric cyan and hot-magenta neon accents, paired with low-glare syntax highlighting tailored for late-night terminal hacking.
- **Official Mascot Badge**: Dynamic `<BittyLogo />` badge in the header with interactive hover rotation.

### 2. Zero-CLS Arcade Install Deck & Universal Linux Matrix

The Hero section features an arcade cartridge download deck paired with a comprehensive Linux distribution matrix:

- **Rock-Solid Layout Stability (Zero CLS)**: Switching between installation tabs (`Unix .sh`, `Win .ps1`, `Packages`, `Cargo`) preserves exact vertical metrics with no layout shifts.
- **Universal Linux Matrix (12 Distro Families & Formats)**: Complete native coverage across Arch Linux/CachyOS (AUR), Debian/Ubuntu (`.deb`), Fedora/RHEL (`.rpm`), openSUSE (Zypper), Alpine (APK/musl), NixOS (Flakes), Void (XBPS), Gentoo (Portage), Universal AppImage, Flatpak (Flathub), Canonical Snap, and standalone portable tarballs (`.tar.zst`).
- **Complete Cloudflare R2 Release Matrix**: Direct links to all build artifacts hosted on `cdn.bitty.run`:
  - **Linux**: `.tar.zst`, `AppImage`, `.deb`, `.rpm`, `.apk`, `arm64` binary
  - **macOS**: Apple Silicon `.dmg`, Universal `.dmg`
  - **Windows**: `.zip` portable bundle, `.msi` installer
  - **Verification**: Direct link to authoritative `SHA256SUMS.txt`

### 3. Interactive Mascot Navigator (`Bittie ^ω^`)

Meet **Bittie**, the ASCII companion embedded directly on the homepage:

- Cycles through quick tips on Hyprland-style dwindle tiling, Piccolo Lua VM coprocesses, and Composer shortcuts (`Alt+E`).
- Click Bittie's face to trigger instant reaction dialogue and terminal tips.

### 4. Offline Manuals & Git Source Mirror

Documentation readers are never trapped in a closed web silo. Every documentation page features a full-width bottom cartridge providing:

- **Direct R2 Offline Archives**: Complete standalone bundles (`.tar.gz`, `.zip`), plus dedicated Chinese (`zh-CN`) and English packages.
- **Git Source Mirror**: Direct clone instructions for the complete raw markdown tree:

  ```sh
  git clone https://github.com/bitty-terminal/bitty-manual.git
  ```

### 5. Instant Client-Side Search & Full A11y

- **Zero-Latency Search**: Full keyword search index generated at build time (`search-index.json`), supporting keyboard navigation (`/`, `Ctrl+K`, `Escape`).
- **Native Reader Mode (a11y)**: Built with pure semantic HTML landmarks (`<main>`, `<article>`, `<header>`, `<footer>`), verified zero contrast/a11y failures via automated pa11y audits, and fully compatible with Safari/Firefox Reader Views.
- **i18n Ready**: Header toggle provides immediate routing between English and Simplified Chinese (`zh-CN`).

---

## Multi-Source Documentation Architecture

This repository operates as an aggregator and presentation shell. Canonical documentation is authored and maintained in four upstream repositories:

1. [`bitty-docs`](https://github.com/bitty-terminal/bitty-docs): Canonical governance, architecture RFCs, and decision registers.
2. [`bitty-terminal-docs`](https://github.com/bitty-terminal/bitty-terminal-docs): Terminal platform, renderer, and microkernel guides.
3. [`bitty-plugins-docs`](https://github.com/bitty-terminal/bitty-plugins-docs): Non-AI Lua plugin ecosystem and SDK documentation.
4. [`bitty-ai-docs`](https://github.com/bitty-terminal/bitty-ai-docs): AI runtime and intelligent assistant documentation.

At build time, the docs pipeline synchronizes these four sources into deterministic versioned routes (`/docs/latest/...`, `/docs/stable/...`, `/docs/0.1.0/...`), rewriting links and generating cryptographic provenance manifests (`dist/docs-provenance.json`).

---

## Local Development & Toolchain

### Prerequisites

- [Bun](https://bun.sh) 1.4.x
- [just](https://github.com/casey/just) command runner
- [actionlint](https://github.com/rhysd/actionlint) 1.7.12
- [wrangler](https://developers.cloudflare.com/workers/wrangler/) for Cloudflare deploys

### Setup & Dev Server

```sh
# 1. Install dependencies
bun install --frozen-lockfile

# 2. Start local development server
bun run dev
```

### Running Quality Gates

All changes must pass local automated gates prior to commit:

```sh
# Run full suite: format, markdownlint, TypeScript, build, a11y audit, wrangler dry-run
just check
```

Or individual checks:

```sh
just fmt            # Run Prettier code formatting
bun run lint:md     # Markdown linting
bun run build       # Astro production static build
bun run audit:a11y  # Automated accessibility & landmark checks
```

---

## Documentation Synchronization

Never edit `src/content/docs/` manually; it is a generated mirror. To sync or advance source pins:

```sh
# Re-materialize all sources at their committed pins
just docs-sync

# Advance a specific source pin to a reviewed commit
just docs-sync --source bitty-terminal-docs --pin <commit-sha>

# Verify mirror integrity against pins (fail-closed gate)
just docs-check
```

---

## Project Workflow & CarryCtx

Engineering lifecycle and task state are managed by [CarryCtx](https://github.com/bitty-terminal/carryctx). Fresh clones restore state from the in-repo snapshot branch:

```sh
# Inspect snapshot without mutating local database
just workflow-import-dry

# Import snapshot into local SQLite state
just workflow-import
```

Published snapshots are maintained on branch `refs/heads/carryctx-snapshots`.

---

## Deployment

Pushes and merges to `main` trigger `.github/workflows/deploy.yml` which deploys the static build output (`dist/`) directly to Cloudflare Workers Static Assets:

- **Production Origin**: <https://bitty.run>
- **Preview / Worker Domain**: <https://bitty-website.ven3428set.workers.dev>
