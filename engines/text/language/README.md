# Text language engine

Honest language heuristic: Unicode script detection for Chinese, Japanese, Arabic, and Devanagari, plus small stopword lists for English, Spanish, French, and German. Returns a language code, a heuristic confidence, the method used, and limitations. No model or network is involved.

## Intended use

- Routing text to an appropriate language model.
- Labeling the detected language for the user.

## Prohibited use

- Assuming equal model performance across languages.
- Inferring the identity or origin of a person from language.

## Interface

| Item | Value |
| --- | --- |
| Request | `LanguageRequest { text: str, source: str = "auto" }` |
| Response | `LanguageResult { language, text, source, confidence, method, matched_tokens, limitations }` |
| Validation | Non-empty text |
| Complexity | O(n) in characters |
| Streaming | Block |
| Cancellation | Not cancellable |
| Model lifecycle | No model; script ranges and stopword scoring only |

## Metrics

Per-language precision and recall on a documented, licensed corpus.

## Model candidates and datasets

No fixed candidate. Evaluation data must be licensed and documented. See the dataset policy.

## Limitations

- Heuristic only; confidence is a match ratio, not a calibrated probability.
- Short or mixed-language text is unreliable; `und` means no usable signal.
- Japanese is detected via kana; Chinese text without kana is reported as `zh`.
- Language detection does not determine a person's nationality or identity.
