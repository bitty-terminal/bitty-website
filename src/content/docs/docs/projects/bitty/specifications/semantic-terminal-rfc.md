---
title: Semantic Terminal RFC
description: Semantic command blocks, folding, Hint Mode, command composer status (P1-P5 Implemented-only, P6/P7 proposal) plus cross-panel hint API
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 29
---

# Semantic Terminal RFC

> Status: **Draft RFC with Implemented-only slices P1-P5** as of 2026-09-08
> (CTX-0131). P1 (anchoring) plus P2 (fold MVP) are Implemented-only in
> `bitty` CTX-0225 (PR #390, `4ccb771`); P3 (Hint Mode) in CTX-0226
> (PR #392, `064486b`); P4 (composer) plus P5 (external editor) in CTX-0227
> (PR #394, `ab1f7ab`) — each verified read-only as an ancestor of `bitty`
> origin `main` at `7048139` via `merge-base --is-ancestor`. Implemented-only
> evidence authorizes no further implementation, closes no open question
> (OQ-S1..S7 stay open), weakens no normative control, moves no risk, and
> implies nothing `Verified`/`Compatible`/`Release-ready`. P6, the P7 Beacon
> candidate, and the packaging sketch remain proposal-only.

## Problem

A traditional terminal shows an undifferentiated character stream. Bitty
already records OSC 133 shell-integration zones as ordinal-grouped
`CommandRegion` values, but a user still cannot address a past command as an
object: fold its output, jump to it from the keyboard, copy one result, or
compose a long command without fighting single-line shell input. The same gap
repeats for panels and workspaces once several are visible: everything is
reachable by mouse, little is addressable from the keyboard.

This RFC proposes raising the character stream into addressable semantic
objects while keeping Terminal Truth byte-identical underneath.

## Baseline reality (not claims)

P1 through P5 below are Implemented-only in `bitty` origin `main` at
`7048139` (each cited commit verified read-only as an ancestor of HEAD).
They are experimental evidence only: not Accepted, not Verified, moving no
risk and closing no open question.

The slices build on mechanisms that exist in `bitty` origin `main`
at `7048139`; none of them is changed by the remaining proposal (P6):

- `CommandRegion` groups prompt, input, output, and exit code by OSC 133
  ordinal sequence only (`crates/bitty-rich/src/shell.rs`); row anchoring is
  explicitly marked as future work there.
- Overlay capacity is bounded at `MAX_OVERLAYS_PER_WINDOW = 4` plus one modal
  (`crates/bitty-ui/src/panel.rs`).
- Focus routing is deterministic over `ViewId` (`crates/bitty-ui/src/focus.rs`).
- Panels mount as `ViewContent::Panel(PanelId)` through the experimental
  `PanelRegistry` in `crates/bitty-runtime/src/registry/panel.rs` with
  `PanelId`/`ViewId`/`TerminalId` kept pairwise incompatible. The accepted
  [Panel Runtime RFC](panel-runtime-rfc.md) names the host `PanelRuntime`, a
  type that does not exist in `bitty` yet (see its
  [Implementation status](panel-runtime-rfc.md#implementation-status)).
- The workspace compositor contract is accepted
  ([Workspace Compositor](workspace-compositor.md)); the Panel Runtime contract
  is still a draft pre-study ([Panel Runtime Pre-Study](panel-runtime-pre-study.md)).

## Design principle

Folding, hints, and composition are **presentation projections**, never edits
to Terminal Truth:

```text
PTY
  |
  v
VT parser
  |
  v
Terminal State / Scrollback        <- always complete and authoritative
  |
  v
Semantic ranges (CommandBlock, targets)
  |
  v
Presentation projection (fold, hints, composer)
```

Consequences that stay invariant under every proposal below: expanding a fold
loses no data, copy-all still yields complete output, search still covers
folded content, agent history reads are unaffected, and deterministic replay is
untouched.

## Proposal route

The recommended order is P1 through P6. Each step is useful alone; no step
requires the later ones. As of CTX-0131, P1 through P5 are Implemented-only
evidence in `bitty` origin `main` at `7048139` (see each section); P6 stays
proposal-only, and P7 is the candidate extension recorded below (also
proposal-only).

### P1: CommandBlock semantic anchoring (Implemented-only)

> Implemented-only in `bitty` CTX-0225 (PR #390, commit
> `4ccb7717cd9f29a2ac39783c6f3d40020581b2b8`,
> `crates/bitty-rich/src/blocks.rs`, ancestor of origin `main` `7048139`).
> Shipped shape: `CommandId`, `SemanticRange`, `CommandState`
> (`Running`/`Completed`/`Failed`/`Interrupted`), `CommandBlock` carrying id,
> cwd, input range, output range, exit code, and state, plus query helpers
> `blocks()`, `list_blocks()`, `block_by_id()`, and `block_count()`.
> Implemented-only evidence, not Accepted or Verified.

Propose a `CommandBlock` identity that survives resize, reflow, and scroll.
The open design question is the anchor type: a stable scrollback line identity
(`start_line_id` plus `end_line_id`) is preferred over raw row numbers, which
shift under reflow. Proposed shape (candidate, not accepted):

```text
CommandBlock { id, cwd, input range, output range, exit code, state }
```

with states `Running`, `Completed`, `Failed`, and `Interrupted`. Until this is
accepted, folding (P2) has nothing stable to point at, so P1 gates P2.

### P2: Folding MVP (Implemented-only)

> Implemented-only in `bitty` CTX-0225 (PR #390, commit
> `4ccb7717cd9f29a2ac39783c6f3d40020581b2b8`,
> `crates/bitty-rich/src/blocks.rs`, ancestor of origin `main` `7048139`).
> Shipped shape: per-view `FoldState` plus `hidden_blocks()`,
> `visible_blocks()`, and `is_output_kind()` over the P1 anchors; collapsed
> output keeps its rows intact underneath. Implemented-only evidence, not
> Accepted or Verified.

Propose collapsing a completed `CommandBlock` output region into a one-line
summary (line count plus exit status) while the underlying rows stay intact.
Fold state is per-view presentation state, never persisted into scrollback.
Copy, search, and agent reads operate on the unfolded truth. The MVP covers
toggle one block, expand all, and collapse all; per-block pinning and duration
or AI-summary annotations are explicitly deferred.

### P3: Hint Mode (Implemented-only)

> Implemented-only in `bitty` CTX-0226 (PR #392, commit
> `064486b3aae9d217c55fcb5c520cf91abbcfb6bb`,
> `crates/bitty-rich/src/hints.rs`, ancestor of origin `main` `7048139`).
> Shipped shape: `HintKind`, `HintAnchor`, `HintAction`, `HintActions`,
> `TargetId`, `HintScope`, `HintTarget`, `HintRegistry` with
> `collect_command_targets()`, `collect_panel_targets()`, and
> `collect_view_targets()`; `label_for_index()`, `HintLabel`,
> `allocate_labels()`, and bounded `HintBatch`; `dispatch()` with
> `DispatchOutcome`/`DispatchError`; `HintOperator` plus `HintChord`
> (`Action(Target)` composition). Implemented-only evidence, not Accepted
> or Verified.

Propose a keyboard addressing layer in the spirit of flash-style navigation,
named Hint Mode rather than jump mode because jumping is only one action.
Pressing a leader sequence would overlay short labels on the currently
addressable targets; typing a label selects the target, and a preceding action
key chooses what happens to it. Candidate target set: `CommandBlock`, panel,
workspace, view, link, search result, rich block, and tab. Candidate actions:
focus, jump, expand, collapse, open, close, copy, pin, and inspect, composed
as `Action(Target)` in the style of operator plus motion.

Hint labels must not consume the bounded overlay budget: the proposal asks for
one ephemeral annotation layer carrying a bounded batch (candidate bounds: at
most 256 targets and 8 KiB of label text per frame), rendered by the
compositor as a single presentation layer rather than hundreds of overlays.
Final dispatch reuses the existing deterministic focus routing by resolving a
target to a `ViewId`, `PanelId`, or `CommandId`.

### P4: Command Composer (Implemented-only)

> Implemented-only in `bitty` CTX-0227 (PR #394, commit
> `ab1f7abc8ec01416052117743740d824d6ebf0ea`,
> `crates/bitty-rich/src/composer.rs` plus keymap wiring in
> `crates/bitty-config/src/keymap.rs` and `crates/bitty-app/src/main.rs`,
> ancestor of origin `main` `7048139`). Shipped shape: `CommandBuffer` with
> `BufferError`, `ComposerSession`, `ComposerKey`, `ComposerChord`,
> `ComposerKeys`, `OpenChord` with `validate_open_chord()`,
> `ComposerKeyEvent` with `ComposerFeedOutcome`/`ComposerFeedError`;
> `frame_submit()` sends the buffer as one bracketed paste plus a final
> Enter; `normal_mode_passthrough()` keeps bytes flowing to the PTY
> untouched outside the explicit composer mode; `should_auto_offer()`
> keeps automatic offering conservative (fail open to raw terminal
> behavior). Implemented-only evidence, not Accepted or Verified.

Propose an opt-in multiline command buffer opened by an explicit key (never by
hijacking Enter globally). Inside the composer, Enter inserts a newline and a
configurable submit key (for example Ctrl+Enter) sends the buffer; outside the
composer, bytes flow to the PTY exactly as today, so fullscreen programs,
REPLs, and TUIs are unaffected. A prompt-aware variant could offer the
composer only while shell semantic state reports an input phase and fail open
to raw terminal behavior when OSC 133 is absent. On submit, the buffer would
travel to the shell line editor as one bracketed paste followed by a final
Enter, which keeps Unicode, multiline content, and paste safety intact without
simulating individual keystrokes.

Update (current-state note, 2026-09-16, `bitty` `origin/main` `e8dc9e5`): the
app path is inert. The `A::OpenComposer` arm in
`crates/bitty-app/src/chrome_keys.rs` logs a warning to stderr, consumes an
explicitly bound chord, and changes nothing else; no modal opens, no editor is
launched, and input routing stays as it was. `open_composer` parses in
`crates/bitty-config/src/keymap.rs` but is never in the shipped defaults, so
`Alt+E` remains shell input unless a user binds it. The composer engine
(`CommandBuffer`, `ComposerSession`, keys/chords, and submit framing) is
headless in `crates/bitty-rich/src/composer.rs`. This note records current
behavior only; it changes no proposal above and claims no
`Verified`/`Compatible` status.

### P5: External editor (Implemented-only)

> Implemented-only in `bitty` CTX-0227 (PR #394, commit
> `ab1f7abc8ec01416052117743740d824d6ebf0ea`,
> `crates/bitty-rich/src/composer.rs`, ancestor of origin `main` `7048139`).
> Shipped shape: `resolve_editor()` over `$VISUAL`/`$EDITOR`,
> `TempComposerFile` for the secure round trip with cleanup after the
> editor exits, and `EditorError` for typed failure. Implemented-only
> evidence, not Accepted or Verified.

Propose opening the composer buffer in `$VISUAL` or `$EDITOR` through a secure
temporary file that is removed after the editor exits, returning its content
to the composer. A later Panel-native variant could host the editor in a
transient floating panel instead of covering the terminal; that variant is
deferred until the Panel Runtime contract is accepted.

Update (`bitty` #801, CTX-0485): `$VISUAL`/`$EDITOR` are treated as
attacker-influenced environment input rather than a program name to trust.
`resolve_editor()` now returns `Result<String, EditorError>` and admits only
the exact bare names in `EDITOR_ALLOWLIST` (`nvim`, `vim`, `vi`): the first
non-empty variable wins, a hostile value fails `EditorError::NotAllowed`
before any temp file is written or child is spawned, and it never falls
through to the other variable. Paths, flags, interior whitespace, case
variants, and metacharacters fail the exact match. The temp file is extensionless (the old
`.sh` suffix invited editor plugins, file managers, and OS handlers to treat
terminal content as executable) and owner-only: on Unix the create call itself
applies mode `0o600`, the mode is re-asserted after the write, and any
permission failure deletes the file and fails closed with
`EditorError::WriteFailed`. Non-Unix inherits the per-user temp-directory ACL
as a documented residual (no safe-std ACL API in this `forbid(unsafe_code)`
crate). Probe: `crates/bitty-rich/tests/ctx0485_editor_probe.rs`. The proposal
text above is unchanged; this update claims no `Verified`/`Compatible` status.
Like the P4 composer engine, the composer editor path is unwired: no app call
site invokes `bitty-rich`'s `resolve_editor()`, its temp-file round trip, or
its editor spawn (current-state note, 2026-09-16). The app does spawn an
editor on a separate, wired path: `bitty config edit` uses `bitty-app`'s own
`resolve_editor()` (`crates/bitty-app/src/config_cli.rs`; `$VISUAL`, then
`$EDITOR`, then `vi`) to run an editor on the config file.

### P6: Cross-panel Hint API (proposal-only)

> Proposal-only as of `bitty` origin `main` `7048139` (CTX-0131): no merged
> implementation exists. It stays last: it is only meaningful once P1
> anchors and the P3 engine exist, and the Panel Runtime contract it would
> build on is still a draft pre-study.

Propose generalizing P3 so any provider (command blocks, panels, workspaces,
rich content, future first-party plugins) registers hint targets of a declared
kind with an anchor, a scope, and a supported action set, while one hint
engine owns label allocation, overlay rendering, and action dispatch. A sketch
of the Lua surface (candidate, not accepted):

```lua
bitty.hints.register({
  kind = "my-object",
  targets = function() end,
  actions = { open = function() end, close = function() end },
})
```

P6 closes the P1-P6 route: it is only meaningful once P1 anchors and the P3
engine exist. The candidate P7 below builds on P3 and P6 and stays
proposal-only.

### P7: Bitty Beacon spatial action engine (candidate)

> Candidate-only as of 2026-09-13: no merged implementation exists, and this
> subsection claims nothing beyond the P1-P5 Implemented-only slices above.
> Bitty Beacon is a working name recorded from the local design direction;
> the direction is provenance, not evidence. Tracked as
> [OQ-089](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

P3 labels addressable targets inside the visible grid; P6 generalizes target
registration. The candidate P7 direction applies the same engine to the whole
tiled workspace ([Workspace Compositor](workspace-compositor.md)): pressing
the Leader enters a short-lived action mode that labels panels, workspaces,
command blocks, interactive controls, and user-registered script actions, and
typing a label performs the associated action.

- **Action matrix (candidate).** Four action families over one label engine:
  1. _Spatial focus_: label every panel and workspace and switch focus with
     one keystroke, complementing the shipped `alt+h/j/k/l` spatial chords.
  2. _Semantic output folding_: label visible command blocks (P1 anchors, P2
     fold state) and toggle fold/expand in place, reusing the P3 target model.
  3. _Focus routing_: label interactive controls (AI composer, search and
     filter fields, forms) and route focus plus IME there directly, reusing
     the deterministic focus routing in the
     [Panel Runtime Pre-Study](panel-runtime-pre-study.md).
  4. _Script and workflow dispatch_: Lua registers named actions with a
     description and callback, and their labels participate in the same
     allocation. Registration grants no authority: the callback runs under the
     registering plugin's existing capabilities and consent, and a dispatch
     that maps to a process or terminal operation still passes the accepted
     scopes and the candidate command audit
     ([AI Architecture](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/architecture/ai-architecture.md), OQ-087).
- **Label allocation (candidate).** Single-key labels are the default while
  the target count is small; beyond a threshold the allocator extends to
  two-character labels. Labels are drawn from a handedness-scoped pool (left
  pool first by default) so one hand can type every label without leaving the
  home region, and overflow never crosses hands. The P3 bounds (candidate: at
  most 256 targets and 8 KiB of label text per frame) apply unchanged.
- **Mechanism and policy.** Rust owns capture, target scan, label allocation,
  overlay rendering, and dispatch routing; Lua owns which targets register and
  what their callbacks do. The mode is a command namespace, not a new input
  path: `Esc`, the idle timeout, and keys that are not labels fall back to
  normal terminal input, and the mode never runs on the input hot path
  ([Input and Pointer Contract](input-pointer-rfc.md),
  [Performance Budget RFC](performance-budget-rfc.md) PB-4).
- **Presentation.** Badges are one ephemeral annotation layer over the scene,
  not one overlay per target, and obey the bounded overlay rules of the
  [Panel Runtime Pre-Study](panel-runtime-pre-study.md); they mutate no
  Terminal Truth and grant no capability.

Open until OQ-089 resolves: the exact action taxonomy, whether focus routing
covers only Bitty-owned controls or also terminal content, the label pool and
handoff rules, the script-dispatch authority model, and the configuration
surface next to the OQ-088 Leader strategy.

## Proposed packaging

To avoid one oversized plugin, the draft suggests three narrow first-party
units for a future RFC to accept or reject: a shell-blocks unit (OSC 133,
`CommandBlock`, fold, navigation), a hints unit (targets, labels, selection,
dispatch), and a composer unit (buffer, submit keys, history, external
editor). Packaging is advisory; it creates no repositories and assigns no
owners.

## Security considerations

- Folding changes no trust boundary: hidden output is still terminal content
  and stays untrusted observation data for agents.
- The composer must never intercept input outside its explicit mode, must fail
  open to raw PTY behavior, and must not weaken paste inspection or clipboard
  policy ([Terminal State RFC](terminal-state-rfc.md),
  [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)).
- The hint annotation layer is ephemeral presentation with fixed bounds; it
  grants no capability and bypasses no allowlist ([Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)).
- Composer submission via bracketed paste preserves existing paste-safety
  handling rather than inventing a new input path
  ([Input and Pointer Contract](input-pointer-rfc.md)).
- IPC or agent exposure of folding, hints, or composition needs its own scoped
  review under the [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) and the
  [Risk Evidence RFC](risk-evidence-rfc.md); this draft grants nothing.

## Open questions

All seven stay open as of CTX-0131 (`bitty` origin `main` `7048139`): the
P1-P5 implementations above are evidence only and close none of them.

- OQ-S1: What is the stable scrollback line identity for `CommandBlock`
  anchors, and who owns its allocation across resize and reflow?
- OQ-S2: Where does per-view fold state live, and does any of it persist
  across restarts?
- OQ-S3: What are the exact bounds for one hint batch, and how are overflow
  targets (beyond 256) presented or truncated?
- OQ-S4: Which leader sequences and action keys avoid collisions with shell,
  multiplexer, and editor bindings on all Tier 1 platforms?
- OQ-S5: Under what precise shell-semantic condition may the composer offer
  itself automatically, and what is the exact fail-open behavior without
  OSC 133?
- OQ-S6: What temporary-file, permission, and cleanup contract governs the
  external-editor round trip?
- OQ-S7: What capability, if any, does a third-party hint provider need, and
  how is a malicious or noisy provider contained?

## Relation to other documents

- [Terminal State RFC](terminal-state-rfc.md): owns OSC 133 semantics and
  scrollback truth; P1 needs its anchor decision.
- [Workspace Compositor](workspace-compositor.md): accepted tiling and view
  model that hints address.
- [Panel Runtime Pre-Study](panel-runtime-pre-study.md): draft lifecycle P6
  would build on; P6 waits for its acceptance.
- [Input and Pointer Contract](input-pointer-rfc.md): owns key handling that
  P3/P4 must not break.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md): owns any future remote exposure.
- Roadmap placement is proposed in
  [Now / Next / Later](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/roadmap/now-next-later.md) only after acceptance;
  this draft changes no horizon by existing.
