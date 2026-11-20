# Audio detection research

## Objective

Evaluate synthetic-speech detection for investigative review. Detector output is evidence for a human reviewer, never proof of identity or manipulation.

## Model candidates

AASIST and RawNet2. Both are documentation-only candidates with model cards under `models/`; no weights or implementations are distributed by this repository.

## Dataset candidates

| Dataset  | License status  | Consent status  |
| -------- | --------------- | --------------- |
| ASVspoof | review required | review required |

No dataset has been approved or downloaded in this repository. Only one synthetic smoke fixture exists under `research/results/`, and it is explicitly labelled and not an evaluation set.

## Metrics to report

Precision, recall, false-positive rate, calibration, and cross-dataset generalization. Record the harness version, split, hardware, warm-up policy, and repeated-run spread alongside every metric.

## Current status

No measurements in this repository. No model has been run against a real dataset. The only committed result is a harness smoke test on synthetic data and is not a performance claim.

## Limitations

Performance may vary by language, codec, and recording condition; these effects are unmeasured here. A reduction in one metric does not establish universal protection.
