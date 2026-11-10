# Audio protection engine

Experimental voice protection research. The engine validates an audio id and returns `protected: true`. It does not apply a protection transform.

## Intended use

- Research on reducing the usefulness of a voice recording to unauthorized synthesis.
- Consensual protection of a speaker's own voice.

## Prohibited use

- Impersonating a real individual.
- Protecting a voice without documented consent from the speaker.
- Advertising protection as stable before independent evaluation.

## Interface

| Item            | Value                                            |
| --------------- | ------------------------------------------------ |
| Request         | `ProtectionRequest { audio_id: str }`            |
| Response        | `ProtectionResult { audio_id, protected: bool }` |
| Validation      | `audio_id` must be non-empty                     |
| Complexity      | Model-specific                                   |
| Streaming       | Chunked with bounded memory                      |
| Cancellation    | `AbortSignal` at chunk boundaries                |
| Model lifecycle | Stage-gated; load once, warm up, infer, release  |

## Metrics

Word error rate, STOI, PESQ, speaker similarity, attack success rate, and human listening evaluation. A reduction in one similarity metric does not establish protection.

## Model candidates and datasets

No fixed candidate. Training and evaluation data must be consented and licensed. See `research/audio-protection` and the dataset policy.

## Limitations

- The scaffold returns success without transforming audio.
- Consent and experimental opt-in are enforced by `VoiceProtectionPolicy` in `@frithward/media-analysis`, not by this engine.
- Protection claims require independent evaluation and human review.
