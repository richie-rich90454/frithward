# Audio detection engine

Experimental synthetic speech detection surface. The engine validates an audio id, accepts audio bytes or a path, and returns a `DetectionResult` with an explicit `unavailable` status, no indicators, and limitations. Model-backed inference is not wired yet.

## Intended use

- Investigative review of recorded audio with human judgment.
- Comparing detector candidates under the benchmark harness.

## Prohibited use

- Proving a voice belongs to, or does not belong to, a specific person.
- Automated account actions, accusations, or law-enforcement conclusions.
- Any deployment without a model card and a documented license.

## Interface

| Item            | Value                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| Request         | `DetectionRequest { audio_id, audio_base64?, audio_path? }`               |
| Response        | `DetectionResult { audio_id, indicators, limitations, status, reason }`   |
| Validation      | `audio_id` must be non-empty                                              |
| Complexity      | O(n) in samples for feature extraction; model inference is model-specific |
| Streaming       | Chunked with overlap and bounded memory                                   |
| Cancellation    | `AbortSignal` checked at chunk boundaries                                 |
| Model lifecycle | Load once, warm up, infer, release; stage-gated                           |

## Metrics

Precision, recall, false-positive rate, calibration, and cross-dataset generalization. One metric never establishes detection quality.

## Model candidates and datasets

- Candidates: AASIST, RawNet2.
- Datasets: ASVspoof; licensing review required before use.

## Limitations

- No scores or indicators are produced without a configured model.
- Sampling or single-model scores are evidence, not proof of identity.
- Performance varies across languages, codecs, and recording conditions.
- No model weights are distributed with the repository.
