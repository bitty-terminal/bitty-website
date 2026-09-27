---
title: Multimodal inference boundary
description: Draft Core multimodal extension for capability vocabulary task envelope job lifecycle and asset outputs
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 45
---

# Multimodal inference boundary

> Status: **draft**. This document records the candidate direction
> into the draft `bitty-ai` Core multimodal extension: capability vocabulary,
> task envelope, generation-job lifecycle, and asset outputs. It proposes no
> accepted architecture, authorizes no shipped behavior, closes no Artificial
> Intelligence Question entry, introduces no new identifier, and contains no
> product code. Multimodal inference is a beyond-v0.1 proposal; v0.1 stays
> text-only behind `FakeProvider` (see
> [v0.1 scope](#v01-scope-text-only-fakeprovider)). Normative security and IPC
> obligations override any experimental adoption stated here. `bitty`-side and
> plugin-ecosystem material below is handoff input, not a decision: the `bitty`
> terminal repository and the plugin ecosystem decide acceptance, sequencing,
> and mechanism through their own review.

## Purpose and scope

This boundary extends the Core surface defined in
[Provider plugin boundary](provider-plugin-boundary.md) with multimodal tasks.
It references that document and does not duplicate it:

- What this document adds: the multimodal capability vocabulary extension,
  the `InferenceTask` enum with the `InferenceRequest` envelope, the
  `GenerationJob` lifecycle with `JobStatus`, the `GenerationOutput` shape
  (`Text` versus `AssetRef`), agent-side generation events, the Lua
  adapter/policy placement, and the generic-provider and Model Hub direction.
- What stays in [Provider plugin boundary](provider-plugin-boundary.md): the
  `ModelProvider` contract, `ModelDescriptor` shape, registry protocol,
  selection and routing semantics, fallback semantics, budget and
  usage-accounting semantics, streaming abstraction, provider-independent
  errors, transport taxonomy, two-level plugin model, model aliases, and the
  secret invariant. This document reopens none of them.
- What is explicitly out of scope here: request-parameter schemas per task,
  wire protocols, vendor endpoint construction, the host secret store, Panel
  and gallery presentation, and plugin-registry mechanics.

Inputs are the candidate direction, MP-1 through MP-11
and the MPC-1/MPC-2 candidate extension in [AI Architecture](../architecture/ai-architecture.md),
the R1 disposition in [Execution ownership R1](../architecture/execution-ownership-r1.md), the
R2 disposition in [Tool transport R2](../architecture/tool-transport-r2.md), the register in
[AI Unresolved Questions](../product/ai-unresolved-questions.md), the narrow scope gate in
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md), and the accepted
[IPC and Agent RFC](../specifications/ipc-agent-rfc.md) as overriding authority. This document is the English-language candidate summary and
stands alone.

No product code is introduced or described as implemented. Rust and Lua
sketches below are illustrative proposal shapes, not configuration contracts
and not implementation claims.

## Design direction: unify lifecycle and capability, not request parameters

Upstream model APIs are partly converged but not truly unified: one vendor
family favors a single content model for text, image, audio, and video input,
while others keep separate endpoints per modality with asynchronous jobs for
long-running generation, and aggregation platforms unify heterogeneous models
behind a single prediction lifecycle (see
[Upstream observations](#upstream-observations-september-2026-not-pins)).
The candidate direction therefore proposes that `bitty-ai` Core unify the
lifecycle and the capability description while leaving each task's request
parameters in its own shape. This document adopts that direction as draft
proposal only.

## Capability vocabulary extension

The candidate direction proposes extending the Core-owned closed capabilities
vocabulary (MP-2, MP-4 in [AI Architecture](../architecture/ai-architecture.md)) with
multimodal capabilities. The proposed extension is:

```rust
ModelDescriptor {
    id,
    provider,
    capabilities: [
        TextGeneration,
        ImageGeneration,
        ImageEditing,
        VideoGeneration,
        SpeechSynthesis,
        Transcription,
        Embedding,
    ],
}
```

The vocabulary stays Core-owned and closed: adapters declare a subset at
registration and never extend it unilaterally, exactly as specified in
[Provider plugin boundary](provider-plugin-boundary.md). The extension adds
names; it does not change the registration protocol, the fail-closed rule for
unrecognized fields, or the rule that aliases and routing inputs are
configuration, never capability grants.

Indicative registration examples from the candidate direction (illustrative, not
a configuration contract):

```text
GPT-class model
    text.generate
    vision.input
    tool.call

Image model
    image.generate
    image.edit

Sora/Veo-class model
    video.generate
    image_to_video

TTS model
    audio.speech

Whisper-class model
    audio.transcribe
```

Vision input (`vision.input`) and tool calling (`tool.call`) remain
capabilities of text-capable models rather than separate tasks: a chat-model
entry may declare text generation together with vision input and tool use,
while image, video, speech, transcription, and embedding entries declare
their own generation capabilities. Whether vision input reuses the existing
MP-2 `vision` capability name or introduces a new closed-vocabulary token is
an open choice tracked in [Open points](#open-points); this document selects
neither spelling as normative.

## InferenceTask enum and InferenceRequest envelope

The candidate direction proposes one envelope with per-task request shapes. The
proposed shape is:

```rust
enum InferenceTask {
    Chat(ChatRequest),
    Image(ImageRequest),
    Video(VideoRequest),
    Speech(SpeechRequest),
    Transcription(TranscriptionRequest),
    Embedding(EmbeddingRequest),
}
```

with a single outer envelope:

```rust
struct InferenceRequest {
    model: ModelRef,
    task: InferenceTask,
    metadata: RequestMetadata,
}
```

Each variant keeps its own semantics (illustrative field sketches, not a
schema contract):

```rust
ImageRequest {
    prompt,
    references,
    width,
    height,
    format,
}

VideoRequest {
    prompt,
    reference_image,
    duration,
    resolution,
}

SpeechRequest {
    text,
    voice,
    format,
    speed,
}
```

The envelope carries only routing-grade facts (`model`, task discriminant,
request metadata); task-specific parameters live inside the selected variant
and are validated against that variant's schema. `RequestMetadata` carries
caller, consent, budget, and redaction context through the existing R2 gate
order; it never carries task parameters.

### Super-struct anti-pattern rejected

A single flat request struct carrying every task's parameters is explicitly
rejected:

```rust
// Rejected: the super-struct anti-pattern.
request.duration
request.voice
request.fps
request.aspect_ratio
request.temperature
request.tool_choice
```

Most fields would be meaningless for any given model, validation could not
be per-task, and capability matching could not distinguish which parameters
a model actually honors. The envelope-plus-variant shape is proposed
precisely to keep per-task semantics reviewable at registration and at
dispatch.

## GenerationJob lifecycle

Text, image, and video generations have different temporal shapes: text
streams tokens to completion, image generation processes to a single asset,
and video generation typically submits an asynchronous job that queues, runs
with progress, and completes to an asset. The candidate direction therefore
proposes unifying the job lifecycle rather than the request timing. The
proposed trait shape is:

```rust
trait GenerationJob {
    fn id(&self) -> JobId;
    fn status(&self) -> JobStatus;
    fn progress(&self) -> Option<f32>;
    fn cancel(&self);
    fn result(&self) -> Option<GenerationResult>;
}
```

The proposed status set is:

```text
Queued
Preparing
Running
Streaming
Completed
Failed
Cancelled
Unknown
```

`Streaming` covers token and fragment delivery for text-class tasks behind
the existing MP-6 streaming abstraction; `Queued`, `Preparing`, and
`Running` cover asynchronous media tasks with optional progress; the
terminal states are `Completed`, `Failed`, and `Cancelled`; `Unknown` is the
reconciliation state defined below.

### Unknown means reconcile before retry

`Unknown` follows the existing execution philosophy without extending it:
post-dispatch cancellation and transport loss report the actual recorded
result or `Unknown`, and uncertain effects are reconciled by status
inspection or user direction before retry, with no rollback and no
exactly-once claim (MP-7 (`cancel`) in [AI Architecture](../architecture/ai-architecture.md),
the cancellation contract in
[Execution ownership R1](../architecture/execution-ownership-r1.md), and the R2 gate order in
[Tool transport R2](../architecture/tool-transport-r2.md)).

Blind re-execution after timeout or connection loss is therefore rejected.
The candidate direction states the cost argument directly: a video generation may
already be running and billable on the provider side, so resubmitting the
same request after a local network failure can charge the user two or three
times for one intent. The client must query job status (or await an
authoritative terminal state) and reconcile before deciding whether a retry
is a new submission at all. This matches the persistence rule that replay
reconstructs state without re-executing effects.

## GenerationOutput: Text versus AssetRef

The candidate direction proposes unifying outputs as text or asset references,
never inline media bytes. The proposed shape is:

```rust
enum GenerationOutput {
    Text(TextOutput),
    Asset(AssetRef),
    Assets(Vec<AssetRef>),
}
```

with an asset reference carrying identity and metadata, not bytes:

```rust
AssetRef {
    id,
    mime_type,
    source,
    size,
    metadata,
}
```

Reference form (illustrative):

```text
asset://generation/abc123
```

with per-asset metadata such as media type, dimensions or duration, and byte
size (for example image dimensions, video resolution and duration, or audio
sample rate). Agent context carries the reference and its metadata only:

```text
Generated image:
asset://generation/abc123
```

Base64 blobs (or any inline media payload) in agent context are rejected:
they would bypass the CP-5 (Budget) token-first ceiling and defeat the CP-6
(Artifacts) drill-down contract in [AI Architecture](../architecture/ai-architecture.md),
under which callers receive bounded summaries with references and expand
them under the same consent, budget, attribution, and untrusted-surface
rules. Asset bytes live behind the reference under host mediation; retrieval
is reader-authorized and budget-checked, never an ambient context expansion.
Retention, expiry, and reference invalidation for held assets stay with
their existing trackers (see [Open points](#open-points)); this document adds
no retention rule.

## Agent events and presentation handoff

The candidate direction proposes that the agent layer emit lifecycle events
while presentation stays outside `bitty-ai`:

```text
AI emits:
GenerationStarted
GenerationProgress
GenerationCompleted(asset://...)
```

`bitty` or a plugin decides how to present them (inline summary, gallery,
floating panel, progress indicator, cancel control). The gallery and video
progress sketches in the candidate direction (multi-image grid, progress bar with
duration and resolution line, cancel affordance) are illustrative interface
ideation from a candidate discussion, not an accepted panel design. Panel
ownership, shortcut allocation, rendering, and the image protocol belong to
the `bitty` terminal repository; the gallery, job-panel, player, and manager
surface API belongs to the plugin ecosystem. Neither is decided here, and
the optional-Projection rule from [Execution ownership R1](../architecture/execution-ownership-r1.md)
applies: presentation movement never moves execution targets, broadens
context access, or manufactures consent.

## Lua as adapter, policy, and configuration layer

The candidate direction draws an explicit placement line for Lua. Proposed
ownership (Core rows restated from
[Provider plugin boundary](provider-plugin-boundary.md); Lua and transport
rows are proposal only):

| Concern                                                        | Owner                         |
| -------------------------------------------------------------- | ----------------------------- |
| `InferenceTask` and capability vocabulary                      | `bitty-ai` Core               |
| Model registry                                                 | `bitty-ai` Core               |
| Job lifecycle                                                  | `bitty-ai` Core               |
| `AssetRef` contract                                            | Shared Core contract          |
| Routing and fallback policy                                    | `bitty-ai` Core               |
| Vendor adapters (OpenAI, Gemini, Replicate-style, local)       | Provider plugins              |
| Image gallery, video job panel, audio player, model manager UI | Lua plugins                   |
| HTTP and TLS implementation                                    | Never `bitty-ai` Core via Lua |

Lua is suited to orchestration, UI, and provider mapping: registering a
provider entry, declaring its capabilities, and mapping task shapes to
provider operations (candidate direction sketch, illustrative only):

```lua
bitty.ai.providers.register({
    id = "replicate",
    capabilities = {
        "image.generate",
        "video.generate",
    },
    generate = function(ctx, request)
        return ctx.inference:submit(...)
    end,
})
```

Lua must not own HTTP and media transport. Text APIs (JSON over streaming
responses) stay small enough to prototype loosely, but image and video work
adds multipart upload, large downloads, polling, resume, cancel, timeout,
progress, binary caching, and temporary files. Shelling out to an ad-hoc
transfer helper per call is rejected as the provider foundation. The
proposed layering is:

```text
Lua provider plugin
        ↓
bitty-ai provider host
        ↓
HTTP / TLS / upload / download
        ↓
Provider
```

In short, Lua is the adapter, policy, and configuration layer, never the
HTTP client implementation language. Whether Lua-declared providers execute
through native or MCP placement stays under the R2 declared-placement rule
in [Tool transport R2](../architecture/tool-transport-r2.md): Lua selects tools and tasks,
never paths, and loading a provider preset grants no execution authority.
Placement, like transport selection, is resolved at registration and
re-validated on change.

## Generic providers and Model Hub direction

Because aggregation platforms already unify many models behind one
prediction lifecycle, the candidate direction proposes generic provider adapters
(candidate direction sketch: one plugin per platform family covering image,
video, speech, music, upscaling, and similar models) so that installing one
adapter surfaces many models without one plugin per model. This direction is
proposal only; each generic adapter is still one registry entry with its own
descriptor, capabilities, and accounting per
[Provider plugin boundary](provider-plugin-boundary.md), not a bypass around
routing policy.

The candidate direction further suggests renaming the management surface from
`Model Manager` toward `AI Models` or `Model Hub`, since the managed set may
eventually span language, vision, embedding, image, video, audio, speech,
music, realtime, and ranking models. That rename is illustrative naming
direction from a candidate discussion, not an accepted product or panel
decision; ownership of any such surface stays with the `bitty` side and the
plugin ecosystem as handoff input.

## Consistency with existing dispositions

- R1 red line preserved. The R1 disposition in
  [Execution ownership R1](../architecture/execution-ownership-r1.md) keeps the rule that
  `bitty-agent` performs no model selection and no model I/O. Nothing here
  moves provider implementation, model selection, generation I/O, or API
  keys into terminal Core; generation execution belongs in the independent
  AI helper behind scoped IPC (AIQ-38).
- R2 unified authorization backend preserved. The R2 disposition in
  [Tool transport R2](../architecture/tool-transport-r2.md) keeps one common authorization
  backend fronting every effect with declared per-tool placement. Generation
  submission, polling, cancellation, and asset retrieval are effects behind
  the same gate order (caller, target, generation, capability, consent,
  budget, redaction, attributed outcome); transport and placement here never
  grant authority.
- 032 boundary extended, not duplicated. Core versus plugin ownership,
  registry protocol, routing, fallback, budget, streaming, errors, and the
  secret invariant stay exactly as specified in
  [Provider plugin boundary](provider-plugin-boundary.md). This document adds
  only the multimodal task surface (vocabulary extension, envelope,
  lifecycle, outputs, events, Lua placement, generic-provider direction).
- MP-10 (API-key handling) not reopened. Storage, redaction, consent
  separation, and the `ai.provider` scope stay exactly as specified in
  [AI Architecture](../architecture/ai-architecture.md); multimodal adapters sit behind the
  same opaque-handle rule.
- P0-AC-026, PP-2, and PP-4 mandatory. Pre-queue and pre-write typed
  redaction (PP-2 (Typed redaction)) and consented recording (PP-4 (No
  on-disk persistence without consent)) remain required controls for
  generation requests, job records, asset references, and progress events;
  no open mechanism in this document defers them. Prompts, references, and
  generated assets are untrusted observation data until a narrow capability
  or policy grants access.
- Execution philosophy matched. `Unknown`-with-reconciliation for generation
  jobs restates the existing cancellation and replay semantics (MP-7
  (`cancel`), AIQ-59, AIQ-52); it introduces no new effect model.

## v0.1 scope: text-only FakeProvider

Multimodal inference is a beyond-v0.1 proposal. The v0.1 slice stays
text-only: a single `bitty-ai-runtime` crate behind `FakeProvider` with no
network model providers and no remote endpoints, per
[v0.1 Implementation Profile](../product/implementation-profile-v0.1.md). Nothing in
this document authorizes landing image, video, speech, transcription, or
embedding paths in v0.1, and a local endpoint comes only after the
interfaces stabilize. Job lifecycle, asset references, and Lua provider
registration above are design inputs for that later increment, not v0.1
acceptance criteria.

## Bitty-side handoff, not a decision

The following items from the candidate direction need owning-repository review
and are recorded here as input only:

1. Generation gallery, video progress panel, audio player, and Model Hub
   presentation (owner: `bitty` side for panel and presentation; plugin
   ecosystem for the UI-plugin API surface).
2. Host-side asset storage, binary caching, temporary-file lifecycle, and
   upload/download transport behind the provider host (owner: `bitty-ai`
   host with `bitty`-side infrastructure review; constraint: bytes stay
   behind `AssetRef` under CP-5 (Budget) and CP-6 (Artifacts)).
3. Generic provider adapters for aggregation platforms (owner: plugin
   ecosystem; constraint: one registry entry with own accounting per
   [Provider plugin boundary](provider-plugin-boundary.md)).
4. Model Hub naming and management-surface scope (owner: `bitty` side with
   plugin-ecosystem review; constraint: naming direction only, undecided
   here).

Suggested handling: each owning repository accepts, reshapes, or rejects
these inputs through its own review; `bitty-ai` Core proceeds with the
vocabulary, envelope, lifecycle, and output semantics regardless of handoff
timing.

## Risks

- A closed capabilities vocabulary needs a versioned extension process, or
  multimodal adapters will smuggle semantics through unrecognized fields
  that fail closed today and break tomorrow.
- Per-task schemas that look like routing facts can drift into capability
  grants; reviewers must keep task validation behind consent and budget
  gates.
- `Unknown` jobs with billable provider-side effects need explicit
  reconciliation UX, or users will either double-pay through impatient
  retries or abandon paid generations that already completed.
- Asset references that outlive their bytes (or bytes that outlive consent)
  need the AIQ-03 expiry path wired before any media cache ships; a gallery
  without invalidation is a retention defect.
- Generic adapters concentrate many models behind one plugin; a fault or
  credential issue in the adapter must stay failure-isolated per MP-11
  (Failure isolation) rather than taking down every surfaced model.

## Upstream observations (September 2026, not pins)

The candidate direction cites three upstream API families as September-2026
direction observations only: a unified content-generation interface, an
asynchronous video-job interface, and a unified prediction lifecycle with
sync/async operation modes.[^1][^2][^3] No endpoint URL, request shape, or
provider behavior is adopted from these observations; they explain why the
lifecycle-and-capability direction was proposed, and they expire as vendors
change their APIs. Normative statements above never depend on them.

[^1]:
    <https://ai.google.dev/api/generate-content>
    Gemini content-generation API observation, September 2026: source-record
    reference for the unified content-model direction; not an adopted endpoint.

[^2]:
    <https://platform.openai.com/docs/api-reference/videos>
    Video-generation job API observation, September 2026: source-record
    reference for the asynchronous job direction; not an adopted endpoint.

[^3]:
    <https://replicate.com/docs/topics/predictions/create-a-prediction>
    Prediction-lifecycle API observations, September 2026: source-record
    references for the unified prediction direction (create-a-prediction and
    HTTP API reference at `https://replicate.com/docs/reference/http`);
    not adopted endpoints.

## Open points

Duplicate-check against
[AI Unresolved Questions](../product/ai-unresolved-questions.md) finds every boundary
question already tracked, so this document proposes no new AIQ identifier
and no new global open-question identifier:

- AIQ-02 (Compression backend selection) covers routing within provider
  consent and budget for multimodal candidate selection.
- AIQ-03 (Artifact expiry and reference invalidation) covers `AssetRef`
  retention, expiry, and invalidation.
- AIQ-08 (MCP schema cache invalidation) covers per-task schema freshness
  for variant shapes.
- AIQ-13 (Provider-scoped prefix-cache key and routing scope) covers
  provider-scoped effects of multimodal routing.
- AIQ-23 (Lease heartbeat and crash reconciliation) covers supervised job
  ownership without relying on destructors.
- AIQ-24 (Atomic ancestor/global budget reservation) covers generation
  budget accounting, including the no-double-spend rule behind
  reconcile-before-retry.
- AIQ-29 (Optional Panel/execution projection bindings) covers gallery and
  progress presentation as projection only.
- AIQ-2A (No-UI execution feature profile) covers headless generation scope
  versus persistent media services.
- AIQ-2B (Supervisor crash recovery/adoption) covers never adopting
  arbitrary surviving jobs or repeating `Unknown` generations.
- AIQ-33 (Unified authorization/isolation backend) covers the gate model
  generation effects sit behind.
- AIQ-36 (Native versus MCP tool transport and bridge placement) covers
  transport-path placement for provider I/O.
- AIQ-37 (Structured exec result schema) covers the disclosure-class
  parallel for generation outcomes.
- AIQ-38 (Generic execution and registry ownership across repositories)
  covers the cross-repository registry split, including the no-model-I/O
  rule.
- AIQ-52 (State reconstruction versus effect re-execution contract) covers
  the replay-must-not-rerun rule generation jobs inherit.
- AIQ-59 (Unknown effect reconciliation and retry eligibility) covers
  `Unknown` job reconciliation and retry eligibility.
- AIQ-5A (Typed redaction markers and invalidation mechanism) covers the
  redaction machinery for generation records and asset references.

Per-task parameter schemas, wire protocols, vendor endpoint construction,
credential-storage tiers, management-UI design, and plugin-registry
mechanics belong to the owning repositories or future scoped tasks and are
not AIQ entries.
