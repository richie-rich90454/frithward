# Engines

Frithward's media engines are standalone Python packages. Each directory under
`engines/` contains a `pyproject.toml`, a `src/engine.py`, tests, and its own
virtual environment. Engines target Python 3.12 or newer and use Pydantic for
request and response models.

Engines are invoked from the hosted path and workers, not from the browser.
`@frithward/media-analysis` defines the ports and adapters that call them, and
the job state machine in `@frithward/runtime` tracks execution.

## Status

Most engines are interface scaffolds today: they validate input and return a
structurally correct result, but model-backed inference is not wired. The
table says what each function actually returns now. Complexity describes the
intended implementation and the contract the scaffold already exposes.

| Engine | Request → response | Complexity | Streaming | Cancellation | Current behavior |
| --- | --- | --- | --- | --- | --- |
| Audio detection | `audio_id` → indicators, limitations | O(n) samples for features; model-specific inference | Chunked with overlap, bounded memory | `AbortSignal` at chunk boundary | No indicators; one limitation string. |
| Audio enhancement | `audio_id`, `gain_db` → `gain_db` | O(n) samples | Chunked | `AbortSignal` at chunk boundary | Echoes the requested gain. |
| Audio protection | `audio_id` → `protected` | Model-specific | Chunked | `AbortSignal` at chunk boundary | Returns `protected: true`; consent and experimental gates live in `media-analysis`. |
| Audio transcription | `audio_id`, `language` → utterances | O(n) samples | Chunked | `AbortSignal` at chunk boundary | One empty utterance; supports `en`, `zh`, `es`, `fr`, `de`, `ar`, `hi`, `ja`. |
| Document extraction | `document_id` → fields | O(n) text length | Per page | `AbortSignal` between pages | Empty field map. |
| Document OCR | `document_id`, `language` → text | O(p) pixels per page | Per page | `AbortSignal` between pages | Empty text; Tesseract is the intended backend. |
| Document redaction | `document_id`, `terms` → `redacted_count` | O(n + t) | Per page | `AbortSignal` between pages | Returns the number of terms. |
| Image detection | `image_id` → indicators, limitations | O(p) pixels per frame | Frame-level; no temporal stream | Between frames | No indicators; one limitation string. |
| Image privacy | `image_id` → findings | O(p) pixels | Frame | Between regions | No findings. |
| Image processing | `image_id`, bounds → width, height | O(p) pixels | Row streaming | Between tiles | Validates bounds and echoes them. |
| Image protection | `image_id` → `protected` | Model-specific | Frame | Between frames | Returns `protected: true`; consent gate in `media-analysis`. |
| Provenance | `asset_id`, `manifest?` → status, detail | O(m) manifest size | Manifest streaming | `AbortSignal` | Detects manifest presence only; does not verify signatures. |
| Text generation | `prompt`, `max_tokens` → text, tokens | O(max_tokens) decode steps | Token streaming | `AbortSignal` between tokens | Empty text, zero tokens. |
| Text language | `text`, `source` → language, text | O(n) characters | Block | Not cancellable | `hola` maps to `es`; otherwise `en`. |
| Text scam analysis | text → indicators | O(n) characters | Block | Not cancellable | Flags `password` as a credential request. |
| Video detection | `video_id`, `sample_frames` → indicators, limitations | O(f·p) frames × pixels | Sampled frames | Between frames | No indicators; sampling limitation. |
| Video processing | `video_id`, `start_ms`, `end_ms` → `duration_ms` | O(d) duration | Chunked | At chunk boundary | Validates the range and returns the duration. |
| Video redaction | `video_id`, `regions` → `redacted_regions` | O(f·p) with masks | Chunked | At chunk boundary | Echoes the requested regions. |

## Model lifecycle

Every model follows the same lifecycle regardless of engine:

1. **Register.** A `ModelEntry` in `@frithward/model-registry` records stage,
   license, intended use, and limitations.
2. **Gate.** Experimental and candidate models are limited to research and
   opt-in preview. Stable models may reach product surfaces.
3. **Load.** Model weights load once per worker, separate from inference.
4. **Warm up.** A warm-up run allocates buffers before user traffic.
5. **Infer.** One model is active per worker. Inputs stream in chunks and
   outputs stream out with bounded memory.
6. **Release.** Disposal releases native resources. Adapters expose `dispose()`
   and reject work after disposal.

Cancellation is cooperative. Engines check the `AbortSignal` at chunk,
utterance, page, or frame boundaries and throw `CANCELLED`. A cancelled job
never reports a partial result as a final answer.

## Metrics and evaluation

Metrics are evidence for review, never proof of authenticity or identity.

| Task | Metrics |
| --- | --- |
| Synthetic speech detection | Precision, recall, false-positive rate, calibration, cross-dataset generalization |
| Synthetic image detection | Precision, recall, cross-generator performance |
| Synthetic video detection | Cross-dataset and cross-generator generalization, sampling sensitivity |
| Audio enhancement | SNR, STOI, PESQ, listening tests |
| Voice protection | WER, STOI, PESQ, speaker similarity, attack success rate, human listening evaluation |
| Face protection | Independent evaluation, attack success rate, demographic limitations |
| OCR / transcription | CER, WER, per-language performance |
| Language detection | Per-language precision and recall |
| Object detection / privacy | Precision and recall at a documented IoU threshold |

The `research/benchmarks` harness produces these numbers. Every released model
ships with a model card. Missing measurements are reported as "not measured".

## Model candidates and datasets

| Area | Candidates | Datasets |
| --- | --- | --- |
| Audio detection | AASIST, RawNet2 | ASVspoof; license review required |
| Image detection | Xception, EfficientNet, ViT | FaceForensics++, DFDC, Celeb-DF; license review required |
| Video detection | Temporal and frame-level classifiers | Cross-dataset evaluation; no fixed public split assumed |
| Multimodal detection | Audio-video synchronization models | Evaluated for language and recording-quality sensitivity |
| Audio enhancement | Deterministic gain/noise-floor processing | Listening tests |
| Text generation | Explicit-limit assistant models | No training on user uploads |

Datasets require licensing, consent, and redistribution review. No
non-consensual identity datasets are permitted. See
[dataset policy](../../DATASET_POLICY.md) and [model policy](../../MODEL_POLICY.md).

## Limitations

- Detection scores do not establish authenticity, identity, or intent.
- A reduction in one metric does not establish protection.
- Frame sampling can miss brief manipulations.
- Model performance varies across datasets, languages, and recording
  conditions.
- Consequential decisions require independent human review.
- Generated text is assistance, never verified fact.
- Engines do not call out to the network. Hosted inference must be explicit.
