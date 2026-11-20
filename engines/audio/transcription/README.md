# Audio transcription engine

Speech-to-text surface with a FastAPI HTTP layer. No speech model is configured, so the engine returns no utterances and an explicit `unavailable` status with a reason; the API exposes `POST /transcribe` and `GET /health`.

## Intended use

- Local caption generation from the user's own audio.
- Accessible transcripts with speaker and timing metadata.

## Prohibited use

- Surveillance or transcription without consent.
- Presenting machine transcripts as verbatim legal records.

## Interface

| Item                | Value                                                                  |
| ------------------- | ---------------------------------------------------------------------- |
| Request             | `TranscriptionRequest { audio_id, language, audio_base64?, audio_path? }` |
| Response            | `transcribe() -> list[Utterance]` (empty); `transcribe_detailed() -> TranscriptionResult { audio_id, language, utterances, status, reason, limitations }` |
| Supported languages | `en`, `zh`, `es`, `fr`, `de`, `ar`, `hi`, `ja`                         |
| Validation          | Non-empty audio id; language must be supported                         |
| Complexity          | O(n) in samples                                                        |
| Streaming           | Chunked with bounded memory                                            |
| Cancellation        | `AbortSignal` at chunk boundaries                                      |
| Model lifecycle     | Model loading is separate from inference; one model active per worker  |
| HTTP API            | `src/api.py`: `POST /transcribe` returns `status`, `reason`, `utterances`, `limitations`; `GET /health`; `uvicorn src.api:app` |

## Metrics

Character error rate and word error rate per language, plus latency and memory. Report the model version and audio conditions.

## Model candidates and datasets

No fixed candidate. Use licensed, consented speech data and document language coverage. See the dataset policy.

## Limitations

- No speech is transcribed; an empty utterance list means unavailable, not silence.
- Accuracy varies by language, accent, noise, and domain.
- Speaker labels are model output and require review.
