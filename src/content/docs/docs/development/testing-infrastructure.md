---
title: Testing Infrastructure
description: Draft capture of the three-tier native, VM, and physical test architecture and benchmark direction
category: development
audience: contributor
document_type: policy
status: draft
website_publish: true
sidebar_order: 17
---

# Testing Infrastructure

> Status: **draft**. This page is a critical capture of the platform testing
> infrastructure and benchmark direction. It accepts nothing, creates no test
> infrastructure, and claims no working pipeline. It refines the CI
> expectations of
> [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md)
> (platform tiers and gate policy) and must not weaken the security corpus or
> any accepted contract. The ISO-based local VM plan discussed below is
> recorded as a deferred, far-future item; no ISO infrastructure task is
> opened.

## Why VMs are needed

Bitty depends on OS-specific behavior that `cargo test` cannot exercise:
Unix PTY versus ConPTY, Wayland and X11, fontconfig/FreeType, Mesa/Vulkan and
D3D12/Metal, IME stacks, and multiple shells. A VM layer answers "does Bitty
work in a real Windows or Linux kernel and user space", while native unit tests
keep the feed-forward fast.

## Three-tier test architecture

| Tier     | Runs                                           | Covers                                                    |
| -------- | ---------------------------------------------- | --------------------------------------------------------- |
| Native   | `cargo test`, integration suites on the host   | Parser, grid, ECS, config, PTY, layout                    |
| VM       | QEMU guests over libvirt                       | ConPTY/PTY, Wayland/X11, distributions, install behavior  |
| Physical | Dedicated machines, nightly or release cadence | GPU drivers, IME/compositor reality, macOS, power/latency |

The direction frames the long-term flow as: pull request -> `bitty-test-runner` ->
`cargo test` plus QEMU/KVM (libvirt) plus a native runner; nightly adds ARM64
under TCG and physical AMD/Intel/NVIDIA plus macOS Metal runners.

## Linux VM stack

The direction records a Linux host stack of QEMU plus KVM plus libvirt:

- QEMU provides virtual hardware; KVM accelerates same-architecture guests.
- libvirt owns VM lifecycle, domain XML, storage pools, networks, snapshots,
  TPM/UEFI wiring, logging, and parallel VMs, instead of a hand-rolled QEMU
  script layer.
- qcow2 base images plus per-run overlays provide the disk model.
- SSH (and not necessarily WinRM, since Windows OpenSSH Server exists) runs
  tests inside the guest.

### VM matrix and cadence

| Cadence      | Guests                                               |
| ------------ | ---------------------------------------------------- |
| Pull request | Arch Linux x86_64 (KVM), Windows 11 x86_64 (KVM)     |
| Merge/main   | Adds Ubuntu LTS, Fedora, Alpine x86_64               |
| Nightly      | Adds Linux ARM64 and Windows 11 ARM64 under QEMU TCG |
| Later        | Native ARM64 host replacing TCG for ARM guests       |

ARM64 under TCG on an x86_64 host is usable but explicitly not per-commit.

### Base images and overlays

Guests must never be installed from an ISO per run. The recommended model keeps a
prepared base image (VirtIO drivers, SSH, Git, PowerShell, VC runtime, test
agent, Bitty test dependencies) and creates a disposable qcow2 overlay per
test, which is deleted afterwards. This is described as more convenient for CI
than snapshot-based restore.

### Test controller and guest access

The direction proposes a Bitty-owned controller rather than scattered shell:
`cargo xtask vm list/start/test` (optionally a `bitty-test-runner` crate)
driving libvirt over its API, automating overlay creation, domain definition,
boot, guest readiness, artifact upload, test execution, stdout/stderr and
screenshot and log collection, shutdown, and overlay removal.

Guest responsibilities are split:

- libvirt plus the QEMU guest agent for VM management: guest state,
  filesystem freeze, shutdown, IP information.
- SSH for test execution behind one `Guest` trait (`exec`, `upload`,
  `download`) shared by Linux and Windows guests; WinRM is optional, not
  required.

## VM coverage limits

virtio-gpu with virgl/Venus can validate window creation, wgpu initialization,
fonts, shaders, resize, and render-loop stability, but a VM cannot reproduce
vendor driver defects: NVIDIA proprietary, Intel Mesa, AMD RADV, Windows
D3D12, and macOS Metal bugs need physical runners. Physical runs are therefore
scheduled on a nightly cadence rather than every pull request.

IME and compositor variation is modeled as separate VM images (Arch with
Hyprland and fcitx5; Ubuntu with GNOME and IBus; KDE Plasma with fcitx5; X11
with i3), because IME defects depend on compositor, display server, and IME
implementation together.

## E2E test protocol

Instead of fragile mouse/keyboard simulation and screenshot diffing, the
direction proposes a first-class test surface: `bitty --test-mode` exposing a test
IPC socket with commands such as spawn terminal, send keys, create panel, split
panel, resize, query screen, query cursor, query render state, screenshot, and
exit. This reuses the existing IPC and Panel architecture and is recorded as
more stable than UI click automation.

## Test pyramid

Unit tests (parser, grid, ECS, config) are the largest tier; integration tests
(renderer, parser, IPC) sit above them; QEMU VMs cover OS integration at medium
volume; physical hardware covers GPU/IME/macOS with the fewest runs. The
direction explicitly rejects routing all tests through QEMU.

## Benchmarks

A fixed benchmark VM is proposed for repeatable CPU, RAM, startup, parser, and
throughput measurements, with a fixed VM XML, pinned vCPUs, fixed guest image
and QEMU version, an idle host, performance governor, multiple iterations, and
median/p95/stddev reporting instead of single runs. Metric rules:

- Cold start and warm start are measured separately; a single `time bitty` is
  not sufficient.
- RAM uses PSS-style measurement; disk usage is measured only with a defined
  scope.
- Parser/terminal throughput (ASCII, Unicode, CSI) and real-world replay
  workloads fit the VM tier.
- GPU benchmarks, input latency, and power belong to physical benchmark
  runners for fair vendor comparison.
- Reports capture the environment plus machine-readable JSON so a website can
  plot results; a `bitty-bench` project (images, workloads, runner, vm,
  results) is the candidate shape.

## Open items and deferred work

- VM matrix rollout timing and the budget for KVM-capable CI runners are
  undecided.
- Physical GPU runner ownership and location are undecided.
- Whether benchmarks live in-repo or as a separate project is undecided.
- The ISO-based local VM plan (building and installing a guest from ISO per
  run) is recorded as a **far-future, deferred** item. The base-image plus
  overlay approach above is the recommended direction; no ISO infrastructure
  tasks are created by this capture.
- Nothing here is accepted or implemented; promotion requires its own review.
