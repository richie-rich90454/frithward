# Xception model card

Stage: `experimental`. Status: documentation-only candidate; no weights in this repository.

## Intended use

Research evaluation of synthetic-image detection, including comparison across image generators. Any score is evidence for a human reviewer.

## Prohibited use

Authenticity verdicts, automated accusations, or consequential account actions based on a detector score.

## Architecture

not established in this repository. Published work uses a depthwise-separable-convolution classifier as a forgery-detection backbone; no implementation is vendored here.

## Training data

not established in this repository.

## Dataset licenses

FaceForensics++, DFDC, and Celeb-DF are proposed candidate datasets; license and consent status: review required. No license decision is recorded in this repository.

## Evaluation datasets

None evaluated in this repository. The proposed datasets have not been run through the harness here.

## Metrics

Planned: precision, recall, false-positive rate, calibration, and cross-generator/cross-dataset generalization. No values have been measured in this repository.

## Known biases

not established in this repository. Unseen generators, compression, and demographic skew must be measured before any claim is made.

## Hardware requirements

not established in this repository.

## Runtime requirements

not established in this repository. No framework version is pinned for this candidate.

## Model license

not established in this repository. Model weights are not distributed by Frithward.

## Limitations

No weights, training configuration, or measured results are present. Frame-level scores are evidence, not proof.

## Version history

| Version | Date | Change |
| --- | --- | --- |
| card-0.1 | 2026-11-20 | Initial documentation-only card; no artifact. |
