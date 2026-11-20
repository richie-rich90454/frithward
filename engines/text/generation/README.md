# Text generation engine

Rule-based text generation surface. The engine selects and reorders sentences from the supplied prompt to produce an extractive summary or a bullet list; output is labelled `rule-based-extractive`. No language model is configured and a supplied `model_path` is not executed.

## Intended use

- Drafting assistance for the user's own content.
- Local, opt-in text generation with a documented model card.

## Prohibited use

- Generating deceptive content, impersonation, or harassment.
- Presenting generated text as verified fact or as human-authored.

## Interface

| Item            | Value                                                                   |
| --------------- | ----------------------------------------------------------------------- |
| Request         | `GenerationRequest { prompt: str, max_tokens: int = 256, model_path?, mode: str = "summary" }` |
| Response        | `GenerationResult { text, tokens, status, reason, method, limitations }` |
| Validation      | Non-empty prompt; positive token budget; mode is `summary` or `bullets` |
| Complexity      | O(n) in prompt length; no decode steps                                  |
| Streaming       | Token streaming                                                         |
| Cancellation    | `AbortSignal` between tokens                                            |
| Model lifecycle | Load once, warm up, generate, release; stage-gated                      |

## Metrics

Toxicity rates, factuality on a documented benchmark, refusal behavior, and latency. Report the model version and decoding settings.

## Model candidates and datasets

No fixed candidate. Training data must be licensed and documented. No training on user uploads without separate explicit consent.

## Limitations

- Output is copied and ranked from the prompt, not produced by a language model; `tokens` counts whitespace-delimited words.
- No fluency, originality or factuality is guaranteed; generated text is assistance, never verified fact.
- The token budget truncates real words; sentence scoring is a term-frequency heuristic.
