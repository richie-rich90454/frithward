# Model policy

Every model used by Frithward ships with a model card: intended use, prohibited use, architecture, training data, dataset licenses, evaluation results, known biases, hardware requirements, license, limitations, and version history. The canonical copies live under `models/<id>/model-card.md`; the manifest at `models/manifest.json` records artifacts and checksums.

Detection scores are evidence, not proof. Consequential decisions require human review. A reduction in one metric does not establish universal protection.

## Stage gates

| Stage | Entry requirements | Permitted use | Gate to advance |
| --- | --- | --- | --- |
| `experimental` | Model card with all 13 fields; artifact listed in the manifest or explicitly absent. | Research and internal evaluation only. | Reproducible results with harness version, dataset license decision, hardware, and failure modes. |
| `candidate` | Reproducible benchmark results, known biases, and documented failure modes. | Opt-in preview with human review. | Cross-dataset evaluation, calibration, and an assigned support owner. |
| `stable` | Cross-dataset evaluation, calibration, support commitment, and limitations displayed in-product. | Product surfaces. | Scheduled review date recorded. |
| `deprecated` | Migration path and removal date recorded in version history. | No new integrations. | Artifact and card removal after the removal date. |

A gate is passed only when every listed requirement is present. "No measurements in this repository" is an honest status, not a pass.

## Reviewer ownership

- **Model owner:** the author who submits the card and artifact. Responsible for accuracy of the card and for reproducing results.
- **Model governance reviewer:** a person other than the author. Owns the stage-gate decision and records their handle and date in the card's version history.
- **Dataset reviewer:** owns license, consent, and redistribution decisions per `DATASET_POLICY.md`.
- **Security reviewer:** required before any remotely fetched artifact is used; owns checksum verification via `scripts/verify_model_checksums.mjs`.

No reviewer may approve their own submission. A stage change without a recorded reviewer entry is invalid.

## Artifact rules

Frithward does not distribute model weights. `models/manifest.json` may reference public URLs and checksums as reference metadata, but the downloader is never automatic. `scripts/verify_model_checksums.mjs` verifies only locally present files and fails on a checksum mismatch. Synthetic test artifacts must be labelled as such and must not be committed as binaries.
