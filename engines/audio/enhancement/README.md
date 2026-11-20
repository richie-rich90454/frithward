# Audio enhancement engine

Deterministic gain processing on caller-supplied little-endian PCM bytes (8-bit unsigned, 16/32-bit signed). The engine applies linear gain, clamps safely to the sample range, and reports counts and peak levels. No noise reduction or learned enhancement is performed.

## Intended use

- Adjusting level and noise floor for accessibility and review.
- Deterministic, explainable audio cleanup before transcription.

## Prohibited use

- Claiming enhancement proves authenticity or removes manipulation.
- Altering evidence without keeping the original artifact and a processing manifest.

## Interface

| Item | Value |
| --- | --- |
| Request | `EnhancementRequest { audio_id: str, gain_db: float = 0.0, pcm_base64: str \| None, sample_width: int = 2 }` |
| Response | `EnhancementResult { audio_id, gain_db, sample_count, processed_pcm_base64, peak_before, peak_after, clipped_count, limitations }` |
| Validation | `audio_id` non-empty; `sample_width` in {1, 2, 4}; `-120 <= gain_db <= 120` |
| Complexity | O(n) in samples |
| Streaming | Chunked with bounded memory |
| Cancellation | `AbortSignal` at chunk boundaries |
| Model lifecycle | Deterministic DSP needs no model; a learned enhancer would follow the standard load/warm-up/infer/release cycle |

## Metrics

SNR, STOI, PESQ, and listening tests. Report input and output conditions.

## Model candidates and datasets

No fixed candidate. Deterministic gain and noise-floor processing is the default; learned enhancement requires a model card and consent for any training data.

## Limitations

- Gain is a linear scale with clamping; the result is deterministic but can distort.
- Enhancement can obscure artifacts; keep originals for evidence.
- Peak levels are reported, but no perceptual quality metric is computed.
