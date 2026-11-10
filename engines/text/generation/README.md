# Text generation engine

Experimental assistant generation with explicit limits. The engine validates the
prompt and token budget and returns generated text. The scaffold returns empty
text.

## Intended use

- Drafting assistance for the user's own content.
- Local, opt-in text generation with a documented model card.

## Prohibited use

- Generating deceptive content, impersonation, or harassment.
- Presenting generated text as verified fact or as human-authored.

## Interface

| Item | Value |
| --- | --- |
| Request | `GenerationRequest { prompt: str, max_tokens: int = 256 }` |
| Response | `GenerationResult { text: str, tokens: int }` |
| Validation | Non-empty prompt; positive token budget |
| Complexity | O(max_tokens) decode steps |
| Streaming | Token streaming |
| Cancellation | `AbortSignal` between tokens |
| Model lifecycle | Load once, warm up, generate, release; stage-gated |

## Metrics

Toxicity rates, factuality on a documented benchmark, refusal behavior, and
latency. Report the model version and decoding settings.

## Model candidates and datasets

No fixed candidate. Training data must be licensed and documented. No training
on user uploads without separate explicit consent.

## Limitations

- The scaffold does not generate text.
- Generated text is assistance, never verified fact.
- Output quality and safety vary by prompt and language.
