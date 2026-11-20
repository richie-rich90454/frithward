# Engines

Frithward's media engines are standalone Python packages. Each directory under `engines/` contains a `pyproject.toml`, a `src/engine.py`, tests, and its own virtual environment. Engines target Python 3.12 or newer and use Pydantic for request and response models.

Engines are invoked from the hosted path and workers, not from the browser. `@frithward/media-analysis` defines the ports and adapters that call them, and the job state machine in `@frithward/runtime` tracks execution.

## Status

Engines now fall into two honest groups. Several perform deterministic local computation with no model and no network: reviewed scam patterns, literal document redaction, standard-library EXIF/GPS inspection, PCM gain, language heuristics, resize and trim geometry, JSON provenance parsing, and caller-supplied PyTorch image inference. The rest are explicitly unavailable: they validate input and return `status="unavailable"` with a `reason` instead of fabricating results. No detector, OCR, transcription, generation, or protection model ships with the repository, so model-backed detection and watermarking remain unavailable.

The **Current behavior** column describes what the code does today. **Complexity**, **Streaming**, and **Cancellation** describe the intended contract, not implemented streaming or cooperative cancellation in these Python functions.

| Engine | Request → response | Complexity | Streaming | Cancellation | Current behavior |
| --- | --- | --- | --- | --- | --- |
| Audio detection | `audio_id` → indicators, limitations, `status`, `reason` | O(n) samples for features; model-specific inference | Chunked with overlap, bounded memory | `AbortSignal` at chunk boundary | `status="unavailable"`, no indicators; no local detector model is configured. |
| Audio enhancement | `audio_id`, `gain_db`, `pcm_base64`, `sample_width` → processed PCM, peaks, clipped count | O(n) samples | Chunked | `AbortSignal` at chunk boundary | Applies linear gain to decoded little-endian PCM, clamps to the sample range, and reports peak before/after and the number of clipped samples. |
| Audio protection | `audio_id` → `protected`, `status`, `reason` | Model-specific | Chunked | `AbortSignal` at chunk boundary | `status="unavailable"`, `protected=false` with a reason; no watermark is applied. |
| Audio transcription | `audio_id`, `language` → utterances; `transcribe_detailed` adds `status`, `reason` | O(n) samples | Chunked | `AbortSignal` at chunk boundary | `transcribe()` returns no utterances; `transcribe_detailed()` returns `status="unavailable"` with a reason. Validates `en`, `zh`, `es`, `fr`, `de`, `ar`, `hi`, `ja`. |
| Document extraction | `document_id` → fields, `status`, `reason` | O(n) text length | Per page | `AbortSignal` between pages | `status="unavailable"` with a reason; input text/bytes are accepted but not parsed. |
| Document OCR | `document_id`, `language` → text, `status`, `reason` | O(p) pixels per page | Per page | `AbortSignal` between pages | `status="unavailable"` with a reason; empty text means unavailable, not a blank document. |
| Document redaction | `document_id`, `terms`, `text` → redacted text, spans, base64 bytes | O(n + t) | Per page | `AbortSignal` between pages | Matches literal terms case-insensitively, replaces them with a fixed marker, reports every original offset/span, and returns base64-encoded redacted bytes. |
| Image detection | `image_id`, `model_path`, tensor → scores, `status` | Model-dependent PyTorch forward pass | Frame-level; no temporal stream | Between frames | Runs real PyTorch inference with a caller-supplied model path and float32 tensor; raises an explicit error when no model is supplied. Scores are evidence for review, not proof of manipulation. |
| Image privacy | `image_id`, image bytes → findings, metadata, `status` | O(m) metadata bytes | Frame | Between regions | Parses JPEG APP1 and PNG eXIf EXIF with the standard library; reports GPS, camera make/model, and capture-date findings with `status="inspected"`, or `status="no_metadata"` when none were found. No pixel or face analysis. |
| Image processing | `image_id`, bounds, source dimensions → width, height, scale, `status` | O(1) geometry | Row streaming | Between tiles | Computes aspect-preserving resize geometry from supplied dimensions, never enlarges (scale capped at 1.0), and returns `status="source_unavailable"` when dimensions are absent. No pixels are transformed. |
| Image protection | `image_id` → `protected`, `status`, `reason` | Model-specific | Frame | Between frames | `status="unavailable"`, `protected=false` with a reason; no watermark is applied. |
| Provenance | `asset_id`, `manifest?` → status, detail, transformations | O(m) manifest size | Manifest streaming | `AbortSignal` | Parses a supplied JSON manifest into transformation steps and reports `status="present"` or `"missing"`; no signature verification. |
| Text generation | `prompt`, `max_tokens` → text, tokens, `status`, `reason` | O(max_tokens) decode steps | Token streaming | `AbortSignal` between tokens | `status="unavailable"`, empty text and zero tokens with a reason; a supplied `model_path` is not executed. |
| Text language | `text`, `source` → language, confidence, method | O(n) characters | Block | Not cancellable | Detects script for `ja`/`zh`/`ar`/`hi`, otherwise scores Latin-script stopwords for `en`/`es`/`fr`/`de`; returns `und` with no usable signal. Confidence is a heuristic ratio, not a calibrated probability. |
| Text scam analysis | `text` → indicators, findings, limitations | O(n) characters | Block | Not cancellable | Applies reviewed keyword patterns plus mismatched-link and lookalike-domain rules; returns indicator names, severities, rationales, and limitations. A match is a signal, not a verdict. |
| Video detection | `video_id`, `sample_frames` → indicators, `status`, `reason` | O(f·p) frames × pixels | Sampled frames | Between frames | `status="unavailable"` with a reason; no indicators are produced. |
| Video processing | `video_id`, `start_ms`, `end_ms`, `fps?` → duration, frame count, sample plan | O(d) duration | Chunked | At chunk boundary | Computes trim duration, frame count, and a sampling plan from supplied timing and fps; returns `status="partial"` when fps is missing. No frames are decoded or rewritten. |
| Video redaction | `video_id`, `regions` → `redacted_regions`, `status`, `reason` | O(f·p) with masks | Chunked | At chunk boundary | `status="unavailable"` with a reason; requested regions are not applied and no redaction is claimed. |

## Model lifecycle

Every model follows the same lifecycle regardless of engine:

1. **Register.** A `ModelEntry` in `@frithward/model-registry` records stage, license, intended use, and limitations.
2. **Gate.** Experimental and candidate models are limited to research and opt-in preview. Stable models may reach product surfaces.
3. **Load.** Model weights load once per worker, separate from inference.
4. **Warm up.** A warm-up run allocates buffers before user traffic.
5. **Infer.** One model is active per worker. Inputs stream in chunks and outputs stream out with bounded memory.
6. **Release.** Disposal releases native resources. Adapters expose `dispose()` and reject work after disposal.

Cancellation is cooperative. Engines check the `AbortSignal` at chunk, utterance, page, or frame boundaries and throw `CANCELLED`. A cancelled job never reports a partial result as a final answer.

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
| Privacy metadata inspection | Not a detection task: no precision/recall or IoU applies. Field presence is read deterministically from supplied EXIF and reported with an explicit `no_metadata` status |

The `research/benchmarks` harness is the intended source of these numbers and every released model is expected to ship with a model card. No model ships in this checkout, so none of these figures have been measured here: treat the table as an evaluation plan, not results. Missing measurements are reported as "not measured".

## Model candidates and datasets

| Area | Candidates | Datasets |
| --- | --- | --- |
| Audio detection | AASIST, RawNet2 | ASVspoof; license review required |
| Image detection | Xception, EfficientNet, ViT | FaceForensics++, DFDC, Celeb-DF; license review required |
| Video detection | Temporal and frame-level classifiers | Cross-dataset evaluation; no fixed public split assumed |
| Multimodal detection | Audio-video synchronization models | Evaluated for language and recording-quality sensitivity |
| Audio enhancement | Deterministic gain/noise-floor processing | Listening tests |
| Text generation | Explicit-limit assistant models | No training on user uploads |

Datasets require licensing, consent, and redistribution review. No non-consensual identity datasets are permitted. See [dataset policy](../../DATASET_POLICY.md) and [model policy](../../MODEL_POLICY.md).

## Limitations

- Detection scores do not establish authenticity, identity, or intent.
- The image-detection engine executes a caller-supplied model only; it ships no detector and does not verify the model's claims.
- A reduction in one metric does not establish protection.
- Frame sampling can miss brief manipulations.
- Model performance varies across datasets, languages, and recording conditions.
- Consequential decisions require independent human review.
- Generated text is assistance, never verified fact.
- Engines do not call out to the network. Hosted inference must be explicit.

## Running engine tests

The upgraded engines declare `[dependency-groups] dev = ["pytest"]` and carry a regenerated `uv.lock`. Run tests from inside each engine directory, or target one explicitly with `uv run --project engines/<area>/<engine> pytest -q`. Running every engine from the repository root fails because the engines have mixed dependency sets and the provenance engine has no `pytest` dev group.
