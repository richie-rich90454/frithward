# Datasets

## Objective

Ensure every dataset used in research has a recorded licensing, consent, and redistribution decision before use.

## Model candidates

Not applicable; this workstream governs datasets, not models.

## Dataset candidates

| Dataset | License status | Consent status |
| --- | --- | --- |
| ASVspoof | review required | review required |
| FaceForensics++ | review required | review required |
| DFDC | review required | review required |
| Celeb-DF | review required | review required |
| Consented voice and face data | review required | review required |

"review required" is the status until a reviewer records a decision. No dataset has been approved, downloaded, or redistributed in this repository. See `DATASET_POLICY.md` for the artifact-removal procedure.

## Metrics to report

Not applicable. Dataset records must instead capture source, version, split, license decision, consent decision, and redistribution decision.

## Current status

No measurements in this repository. The only committed prediction file is a synthetic harness fixture under `research/results/`, explicitly labelled and not a dataset.

## Limitations

Non-consensual identity datasets are prohibited. No default training on user uploads. Demographic limitations are recorded only where evaluation data permits.
