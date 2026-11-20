# Image detection research

## Objective

Evaluate synthetic-image detection across generators for investigative review. Scores are evidence for a human reviewer, not authenticity verdicts.

## Model candidates

Xception, EfficientNet, and ViT. Each has a documentation-only model card under `models/`; no weights or implementations are distributed by this repository.

## Dataset candidates

| Dataset | License status | Consent status |
| --- | --- | --- |
| FaceForensics++ | review required | review required |
| DFDC | review required | review required |
| Celeb-DF | review required | review required |

No dataset has been approved or downloaded in this repository.

## Metrics to report

Precision, recall, false-positive rate, calibration, and cross-generator/cross-dataset generalization. Report the generator and dataset mix, harness version, hardware, and repeated-run spread.

## Current status

No measurements in this repository. No candidate has been run through the harness against a real dataset.

## Limitations

Performance drops on unseen generators and heavy compression; demographic limitations are unmeasured here. A reduction in one metric does not establish universal protection.
