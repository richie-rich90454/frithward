# Text scam analysis engine

Experimental text analysis for suspicious messages. The engine validates the payload and returns indicators. The scaffold flags the word `password` as a credential request.

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
| Response | `ScamText` with indicators |
| Validation | Pydantic model validation |
| Complexity | O(n) in characters |
| Streaming | Block |
| Cancellation | Not cancellable |
| Model lifecycle | Rule-based patterns need no model; a learned classifier follows the standard lifecycle |

## Metrics

Precision and recall on reviewed examples, false-positive rate, and the accuracy of the guidance. Report the language and example source.

## Model candidates and datasets

Pattern libraries with reviewed examples. No victim data. See `research/scam-detection` and the dataset policy.

## Limitations

- The scaffold detects one pattern only.
- Text patterns cannot prove intent.
- Accuracy of guidance matters more than automated verdicts.
