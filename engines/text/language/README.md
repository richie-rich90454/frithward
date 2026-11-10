# Text language engine

Language detection helper. The engine validates the input and returns a language code. The scaffold recognizes `hola` as Spanish and defaults to English.

## Intended use

- Routing text to an appropriate language model.
- Labeling the detected language for the user.

## Prohibited use

- Assuming equal model performance across languages.
- Inferring the identity or origin of a person from language.

## Interface

| Item            | Value                                                 |
| --------------- | ----------------------------------------------------- |
| Request         | `LanguageRequest { text: str, source: str = "auto" }` |
| Response        | `LanguageResult { language, text }`                   |
| Validation      | Non-empty text                                        |
| Complexity      | O(n) in characters                                    |
| Streaming       | Block                                                 |
| Cancellation    | Not cancellable                                       |
| Model lifecycle | A learned detector follows the standard lifecycle     |

## Metrics

Per-language precision and recall on a documented, licensed corpus.

## Model candidates and datasets

No fixed candidate. Evaluation data must be licensed and documented. See the dataset policy.

## Limitations

- The scaffold is a heuristic, not a production detector.
- Short or mixed-language text is unreliable.
- Language detection does not determine a person's nationality or identity.
