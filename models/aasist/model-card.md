# AASIST model card

Stage: `experimental`. Status: documentation-only candidate; no weights in this repository.

## Model id

`aasist`

## Intended use

Research evaluation of synthetic-speech detection. Any score is evidence for a human reviewer, never proof of identity or manipulation.

## Prohibited use

Identity verification, surveillance, automated accusation, or any consequential decision made without human review.

## Architecture

not established in this repository. Published work describes a graph-based anti-spoofing network over raw-waveform spectro-temporal features; no implementation is vendored here.

## Training data

not established in this repository.

## Dataset licenses

ASVspoof is a proposed candidate dataset; license and consent status: review required. No license decision is recorded in this repository.

## Evaluation datasets

None evaluated in this repository. ASVspoof is proposed only; no evaluation run is recorded.

## Metrics

Planned: precision, recall, false-positive rate, calibration, and cross-dataset generalization. No values have been measured in this repository.

## Evaluation results

No evaluation has been performed for this model in this repository; no metrics are reported. The only results artifact present is `research/results/audio-detection-synthetic.json`, a synthetic harness smoke test whose scores are placeholders and not an evaluation of this model.

## Known biases

not established in this repository. Language, codec, and recording-condition sensitivity must be measured before any claim is made.

## Hardware requirements

not established in this repository.

## Runtime requirements

not established in this repository. No PyTorch version is pinned for this candidate.

## Model license

not established in this repository. Model weights are not distributed by Frithward.

## Limitations

No weights, training configuration, or measured results are present. Detection output is evidence for review, not a verdict.

## Version history

| Version  | Date       | Change                                        |
| -------- | ---------- | --------------------------------------------- |
| card-0.1 | 2026-11-20 | Initial documentation-only card; no artifact. |
