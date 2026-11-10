# Audio transcription engine

Streaming speech-to-text. The engine validates the audio id and language and
returns a list of utterances. The scaffold returns one empty utterance.

## Intended use

- Local caption generation from the user's own audio.
- Accessible transcripts with speaker and timing metadata.

## Prohibited use

- Surveillance or transcription without consent.
- Presenting machine transcripts as verbatim legal records.

## Interface

| Item | Value |
| --- | --- |
| Request | `TranscriptionRequest { audio_id: str, language: str }` |
| Response | `list[Utterance]`, where `Utterance { start_ms, end_ms, text }` |
| Supported languages | `en`, `zh`, `es`, `fr`, `de`, `ar`, `hi`, `ja` |
| Validation | Non-empty audio id; language must be supported |
| Complexity | O(n) in samples |
| Streaming | Chunked with bounded memory |
| Cancellation | `AbortSignal` at chunk boundaries |
| Model lifecycle | Model loading is separate from inference; one model active per worker |

## Metrics

Character error rate and word error rate per language, plus latency and
memory. Report the model version and audio conditions.

## Model candidates and datasets

No fixed candidate. Use licensed, consented speech data and document language
coverage. See the dataset policy.

## Limitations

- The scaffold does not transcribe.
- Accuracy varies by language, accent, noise, and domain.
- Speaker labels are model output and require review.
