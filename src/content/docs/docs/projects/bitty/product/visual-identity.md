---
title: Bitty Visual Identity Direction
description: Records the accepted pixel-art-first direction for the Bitty mascot and derived shared visual assets, the completed high-resolution reference art, and the production and rendering constraints that apply to future asset and protocol work.
category: product
audience: mixed
document_type: overview
status: accepted
website_publish: true
sidebar_order: 16
---

# Bitty Visual Identity Direction

## Direction

As of 2026-09-14 the accepted project direction is that the Bitty mascot and the
shared visual assets derived from it are produced primarily as **pixel art**. The
mascot is one visual language meant to be shared by:

- CLI and onboarding surfaces (`bitty`, `bitty init`, `bitty doctor`,
  `bitty update`), where poses can double as a status indicator;
- documentation, website, and README badges;
- panel surfaces (including future AI-facing panels implemented in other
  repositories);
- a possible desktop/floating-pet panel and a future pet-plugin ecosystem.

The direction exists so that later design work stays coherent: the same
character, palette, and asset pipeline are reused instead of redesigned per
surface.

This is direction, not implementation evidence: no pixel asset has shipped, and
every asset pipeline step still needs its own scoped task, review, and
verification.

## Existing reference art

High-resolution raster reference art is complete and retained in the workspace
design directory `recording/bitty-mascot/` (durable scratch space, not a product
repository):

| File                           | Role                                    |
| ------------------------------ | --------------------------------------- |
| `raster/bitty-window.png`      | primary logo and terminal-window emblem |
| `raster/bitty.png`             | full-body character reference           |
| `raster/bitty-transparent.png` | reviewed RGBA character cutout          |
| `raster/bitty-more.png`        | turnaround and pose reference sheet     |

`CHARACTER.md` in the same directory records the identity anchors that pixel-art
derivatives preserve: rounded silhouette, large ears, brown and cream markings,
pink ears and paws, dark forehead stripe, and the `> _` terminal-expression
eyes.

These files are identity references, not release assets. Promotion into a
product repository still requires that repository's normal task, review, and
verification process.

## Pixel-art production guidance

- **Design at the target size; do not downscale the high-resolution renders.**
  Sizes discussed for the direction include 32×32, 48×48, and 64×64 sprites and
  88×31 web badges carrying 16×16 or 24×24 mascot variants.
- **Keep one canonical model sheet** with palette and proportion records as the
  source of truth for every frame; frame-to-frame consistency matters more than
  per-frame detail.
- **Runtime assets are sprite sheets with frame/fps metadata** (for example
  idle, walk, sleep, typing, and reaction sets, typically 4–8 FPS). GIF is a
  presentation format for README, website, badge, and social surfaces, not the
  runtime format.
- **Badges follow the 88×31 retro web-button convention** (pixel font, optional
  1-bit/dithering treatment, optional animated GIF) rather than modern flat
  badge styling.

## Rendering constraints

- Image pixels, terminal cells, and screen pixels are three different units; the
  cell geometry of a terminal depends on font metrics, DPI, and display scaling,
  not on a nominal font size alone.
- Terminal-side images follow terminal image protocols: **Kitty Graphics
  Protocol as the primary path, Sixel for compatibility**, with placement
  separated from the image payload. Implementing these protocol paths is future
  work, gated by its own tasks.
- A floating pet renders at a logical pixel size: terminal font zoom does not
  resize it, and any panel zoom action is interpreted by the panel (for example
  as a deliberate sprite-scale step) rather than by the terminal grid. It
  belongs on a floating panel surface rather than the terminal image protocol.

## Provenance

The direction and constraints above are recorded from the project initiator's
pixel-art mascot systems direction, which covers
88×31 web badges, terminal cell geometry versus image pixels, and
image-protocol and zoom semantics (findings summarized inline above). This document is the canonical record. The direction is registered as
DIR-013 in the
[bitty-docs decision register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md).
