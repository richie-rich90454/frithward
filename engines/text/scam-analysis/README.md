# Text scam analysis engine

Local reviewed-pattern analysis for suspicious messages. The engine validates the payload and returns indicators, each with a severity, rationale, and matched text. It checks urgency, payment or gift-card demands, credential requests, mismatched links, and lookalike domains. It is rule-based: no model, no network, and no accuracy claims.

## Intended use

- Assisting a human review of a suspicious message.
- Surfacing common pressure and payment patterns for the user to consider.

## Prohibited use

- Automatically accusing or reporting a person.
- Treating an indicator as proof of fraud.
- Analyzing messages without a lawful basis.

## Interface

| Item | Value |
| --- | --- |
| Request | `ScamText { text: str, indicators: list[str] = [] }` |
| Response | `ScamText { text, indicators (pattern names), findings: list[Indicator], limitations }`; `Indicator { name, severity, rationale, matched_text }` |
| Validation | Pydantic model validation; non-empty text |
| Complexity | O(n) in characters |
| Streaming | Block |
| Cancellation | Not cancellable |
| Model lifecycle | Rule-based patterns need no model; a learned classifier follows the standard lifecycle |

## Metrics

Precision and recall on reviewed examples, false-positive rate, and the accuracy of the guidance. Report the language and example source.

## Model candidates and datasets

Pattern libraries with reviewed examples. No victim data. See `research/scam-detection` and the dataset policy.

## Limitations

- Patterns are English-keyword oriented and may produce false positives or miss obfuscated wording.
- Text patterns cannot prove intent.
- Accuracy of guidance matters more than automated verdicts.
