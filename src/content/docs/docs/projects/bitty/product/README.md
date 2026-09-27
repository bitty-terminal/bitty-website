---
title: Product
description: Index of terminal-platform product intent vision delivery plans and engineering evidence
category: product
audience: mixed
document_type: index
status: accepted
website_publish: true
sidebar_order: 10
---

# Product

Index of terminal-platform product intent, delivery planning, and
engineering evidence. Normative detail lives in the linked pages; this index
carries no duplicate normative prose.

## Direction

| Document                                                    | Status   | Purpose                                                                                 |
| ----------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| [Bitty Product Vision](vision.md)                           | Accepted | Product direction, principles, goals, non-goals, and open questions.                    |
| [Panel Extensibility Vision](panel-vision.md)               | Draft    | Panel as first-class container enabling a programmable terminal workspace.              |
| [Proposed Delivery Sequence](proposed-delivery-sequence.md) | Draft    | Candidate build order, deferral list, and version ladder from historical advisor input. |
| [Bitty Visual Identity Direction](visual-identity.md)       | Accepted | Pixel-art-first mascot and shared visual-asset direction with rendering constraints.    |

## Release planning

| Document                                                                     | Status   | Purpose                                                                              |
| ---------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| [Release Ladder](release-ladder.md)                                          | Draft    | Pre-alpha / Engineering Milestones M1-M8 mapping to the v0.1-v1.0 maturity ladder.   |
| [Release Distribution Matrix and Hardening Plan](release-distribution.md)    | Draft    | OS distribution support matrix and ordered packaging hardening plan.                 |
| [Release Pre-Study](release-pre-study.md)                                    | Draft    | Crates, binary preview, version pinning, and ladder v0.1 research evidence.          |
| [Formal Release 0.0.1](formal-release-0.0.1.md)                              | Accepted | Publish record for CTX-0116 at 0.0.1 with cargo publish and binary-preview evidence. |
| [G1 Publish Checklist](g1-publish-checklist.md)                              | Draft    | Draft checklist for G1 leaf-crate dry-run publish verification.                      |
| [G1 Publish Log](g1-publish-log.md)                                          | Draft    | Draft dry-run log for G1 leaf crates at 0.0.1; no crates.io upload.                  |
| [Single-Window Vertical Slice Acceptance Plan](vertical-slice-acceptance.md) | Draft    | Acceptance contract for the first single-window terminal vertical slice.             |
| [Vertical Slice Review Gates (A1-A9)](vertical-slice-review-gates.md)        | Draft    | Revision-locked evidence status for A1-A9 and the five slice review gates.           |

## Compatibility and operations evidence

| Document                                                                            | Status | Purpose                                                                             |
| ----------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| [Compatibility Lab (Phase C)](compat-lab.md)                                        | Draft  | Headless bounded compatibility lab scaffolding for M1 Hardening Phase C.            |
| [Compatibility Matrix for Release (CTX-0114)](compat-matrix.md)                     | Draft  | Release compatibility matrix across Ghostty/Kitty/WezTerm/Alacritty differential.   |
| [Manual Smoke Checklist vs Mainstream Terminals](manual-smoke.md)                   | Draft  | Human-in-loop regression checklist against mainstream terminals.                    |
| [Dogfooding — Minimal Terminal Daily-Driver (Phase G)](dogfooding.md)               | Draft  | Bounded headless daily-driver smoke checklist for Phase G.                          |
| [VT Fuzz Corpus — R-001 (P0-AC-001/002)](vt-fuzz-corpus.md)                         | Draft  | Retained VT/UTF-8/OSC/DCS/APC fuzz corpus and boundary matrix.                      |
| [Performance Baseline Harness (Phase F)](perf-baseline.md)                          | Draft  | Headless bounded baseline harness for PB-1..PB-7.                                   |
| [Real-Window Performance Evidence (CTX-0100)](perf-evidence.md)                     | Draft  | Real measurements from the vertical slice via CTX-0100 instrumentation.             |
| [Plugin Dogfood](plugin-dogfood.md)                                                 | Draft  | Verified dogfood of the public Plugin API via bundled-disabled first-party plugins. |
| [First-Party Plugin Matrix as Panel Runtime Consumers (CTX-0107)](plugin-matrix.md) | Draft  | Research matrix of remaining first-party plugins as Panel Runtime consumers.        |
| [Panel/Tabs Reference Notes — Hyprland/Waybar (CTX-0084)](reference-notes.md)       | Draft  | Read-only Hyprland/Waybar clone notes for workspace compositor panel/tabs.          |

## Authority and status

Accepted pages record reviewed direction or maintained fact; draft pages are
candidate work that authorizes no release and weakens no accepted source.
Implementation claims require evidence from the owning code repository.
Evidence snapshots cited by these pages live in the git-ignored workspace
evidence area and are summarized inline; they are never linked as
repository paths.
