# Audio protection research

## Objective

Study voice protection that preserves usability for consenting speakers while resisting misuse. Protection is never established by a single metric.

## Model candidates

No fixed candidate is established in this repository. Any future candidate requires a model card before evaluation.

## Dataset candidates

| Dataset                   | License status  | Consent status  |
| ------------------------- | --------------- | --------------- |
| Consented voice data only | review required | review required |

No non-consensual voice data may be used. No such dataset has been approved or downloaded in this repository.

## Metrics to report

Word error rate, STOI, PESQ, speaker similarity, attack success rate, and human listening evaluation. Record the harness version, hardware, and operating point with each result.

## Current status

No measurements in this repository. `research/audio-protection/benchmarks.py` exists but no evaluated result is committed.

## Limitations

Objective metrics do not capture perceived quality or harm. Human evaluation and consent review are required before any deployment claim.
