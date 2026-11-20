# Research summary

Detection and protection models move through four stages: `experimental`, `candidate`, `stable`, and `deprecated`. Every released model ships with a model card. Scores are evidence, never proof.

This page summarizes the research notes under `research/`. No performance numbers are published here because none have been measured in this repository. When results exist, they belong in a model card with the harness version, dataset, and hardware recorded.

## Release stages

| Stage | Requirements | Permitted use |
| --- | --- | --- |
| `experimental` | Model card with license, intended use, and limitations. | Research and internal evaluation. |
| `candidate` | Reproducible benchmark results, known biases, and failure modes. | Opt-in preview with human review. |
| `stable` | Cross-dataset evaluation, calibration, and a support commitment. | Product surfaces with limitations displayed. |
| `deprecated` | Migration path and removal date. | No new integrations. |

A reduction in one metric never establishes universal protection. A model that is stable for one dataset, language, or recording condition is not automatically stable for another.

## Research areas

| Area | Notes | Candidates | Datasets |
| --- | --- | --- | --- |
| Audio detection | Synthetic speech detection. Scores are evidence, never proof of identity. | AASIST, RawNet2 | ASVspoof; license review required |
| Image detection | Synthetic image detection. Report precision, recall, and cross-generator performance. | Xception, EfficientNet, ViT | FaceForensics++, DFDC, Celeb-DF; license review required |
| Video detection | Temporal and frame-level classifiers. Report sampling sensitivity and cross-dataset generalization. | Temporal and frame-level models | Cross-dataset evaluation |
| Multimodal detection | Audio-video synchronization. Evaluate language and recording-quality sensitivity. | Synchronization models | Task-specific, documented per study |
| Audio protection | Voice protection. Evaluate WER, STOI, PESQ, speaker similarity, attack success rate, and human listening. | No fixed candidate | Consented voice data only |
| Image protection | Face protection. Requires independent evaluation and demographic-limitation notes. | No fixed candidate | Consented face data only |
| Scam detection | Pattern libraries with reviewed examples. Guidance accuracy matters more than automated verdicts. | Deterministic patterns plus reviewed examples | No victim data |

## Metrics

| Task | Metrics |
| --- | --- |
| Detection | Precision, recall, false-positive rate, calibration, cross-generator and cross-dataset generalization |
| OCR / transcription | Character error rate, word error rate, per-language performance |
| Enhancement | SNR, STOI, PESQ, listening tests |
| Voice protection | WER, STOI, PESQ, speaker similarity, attack success rate, human evaluation |
| Face protection | Independent evaluation, attack success rate, demographic limitations |
| Language detection | Per-language precision and recall |
| Region detection | Precision and recall at a documented IoU threshold |

## Benchmarks and model cards

`research/benchmarks` is the shared evaluation harness. A result is not publishable until it records:

- harness version and command,
- dataset name, version, split, and license,
- hardware and runtime,
- warm-up policy,
- median and spread over repeated runs, and
- known failure modes.

Model cards must state intended use, prohibited use, architecture, training data, dataset licenses, evaluation results, known biases, hardware requirements, license, limitations, and version history.

## Model governance and stage gates

`MODEL_POLICY.md` owns stage gates and reviewer ownership. A card passes a gate only when every requirement is recorded; "no measurements in this repository" is an honest status, not a pass.

| Stage | Entry requirements | Permitted use |
| --- | --- | --- |
| `experimental` | Complete 13-field card; artifact listed in `models/manifest.json` or explicitly absent. | Research and internal evaluation. |
| `candidate` | Reproducible harness results, known biases, failure modes. | Opt-in preview with human review. |
| `stable` | Cross-dataset evaluation, calibration, support owner, limitations displayed. | Product surfaces. |
| `deprecated` | Migration path and removal date in version history. | No new integrations. |

Reviewer ownership: the model owner submits the card; an independent model governance reviewer owns the stage decision; a dataset reviewer owns license/consent decisions; a security reviewer owns artifact checksum verification. No reviewer approves their own submission. Weights are never downloaded automatically; `scripts/verify_model_checksums.mjs` checks only locally present files.

## Dataset removal

`DATASET_POLICY.md` defines the artifact-removal procedure across Garage buckets, IndexedDB, Postgres (`user`, `session`, `scam_analyses`, `job_status`), and dataset caches. Deletion runs from upstream objects to client stores and caches, then backups. Completion requires empty re-queries at every location and a recorded verification in the ticket.

## Reproduction and publication

`RESEARCH_POLICY.md` requires a pinned harness command, artifact hash, dataset version/split, hardware, runtime, and warm-up policy for every metric. Synthetic fixtures must be labelled `synthetic: true` and results must say they are smoke tests. The only committed result, `research/results/audio-detection-synthetic.json`, is a harness smoke test on synthetic data and is not a performance claim. No metric may be published without a recorded reproduction command.

## Dataset policy

Every dataset undergoes licensing, consent, and redistribution review before use. No non-consensual identity datasets. No default training on user uploads. Artifact-removal procedures must exist and be documented. Demographic limitations are recorded where evaluation data permits.

## Publication ethics

- Do not publish tools whose primary purpose is impersonating real individuals.
- Use synthetic or properly consented demonstration material.
- Document limitations and reproduce results where legally and ethically possible.
- Never publish victims' private information.
- Detection output is evidence for human review, not an accusation.

## Research artifacts

- `research/audio-detection/README.md`
- `research/audio-protection/README.md`
- `research/image-detection/README.md`
- `research/image-protection/README.md`
- `research/video-detection/README.md`
- `research/multimodal/README.md`
- `research/scam-detection/README.md`
- `research/benchmarks/README.md`
- `research/datasets/README.md`
- `research/audio-protection/benchmarks.py`

Research code is Apache-2.0 unless otherwise noted. Model weights and datasets retain their original licenses.
