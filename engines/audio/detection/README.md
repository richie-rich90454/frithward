# Audio detection engine

Experimental synthetic speech detection surface. With supplied PCM bytes the engine now computes genuine signal statistics (RMS, peak, clipping count and silence/speech-activity segments) and labels them `pcm-signal-statistics`. These are not detection scores: `indicators` stays empty and no model inference is wired.

## Intended use

- Investigative review of recorded audio with human judgment.
- Comparing detector candidates under the benchmark harness.

## Prohibited use

- Proving a voice belongs to, or does not belong to, a specific person.
- Automated account actions, accusations, or law-enforcement conclusions.
- Any deployment without a model card and a documented license.

## Interface

| Item | Value |
| --- | --- |
| Request | `DetectionRequest { audio_id, audio_base64?, audio_path?, sample_rate = 16000, sample_width = 2 }` |
| Response | `DetectionResult { audio_id, indicators, statistics?, method, limitations, status, reason }` |
| Validation | Non-empty id; positive sample rate; 1- or 2-byte mono PCM |
| Complexity | O(n) in samples for feature extraction; model inference is model-specific |
| Streaming | Chunked with overlap and bounded memory |
| Cancellation | `AbortSignal` checked at chunk boundaries |
| Model lifecycle | Load once, warm up, infer, release; stage-gated |

## Metrics

Precision, recall, false-positive rate, calibration, and cross-dataset generalization. One metric never establishes detection quality.

## Model candidates and datasets

- Candidates: AASIST, RawNet2.
- Datasets: ASVspoof; licensing review required before use.

## Limitations

- Statistics are not synthetic-speech detection scores; `indicators` is always empty.
- Assumes mono PCM (8-bit unsigned or 16-bit signed little-endian); speech activity is a loudness heuristic.
- Sampling or single-model scores are evidence, not proof of identity.
- Performance varies across languages, codecs, and recording conditions.
- No model weights are distributed with the repository.
