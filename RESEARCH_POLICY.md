# Research policy

Research code is Apache-2.0 unless otherwise noted. Model weights and datasets keep their original licenses.

Do not publish tools whose primary purpose is impersonating real individuals. Use synthetic or properly consented demonstration material. Document limitations and reproduce results where legally and ethically possible.

## Reproduction workflow

1. Pin the harness commit, command, model artifact hash, dataset name/version/split, hardware, runtime, and warm-up policy.
2. Run `research/benchmarks/harness.py` from a fresh environment; never copy a metric that was not computed in that run.
3. Save the raw prediction JSONL and the harness output together under `research/results/`. A synthetic fixture must carry `synthetic: true` in every record and a result file must state that it is a smoke test, not an evaluation.
4. Record median and spread over repeated runs; report empty calibration buckets as missing, never as zero.
5. State explicitly what was not measured. No placeholder numbers, expected values, or fabricated baselines.

## Publication workflow

1. Confirm every published model has a complete card and an approved stage gate per `MODEL_POLICY.md`.
2. Confirm dataset license, consent, and redistribution decisions are recorded per `DATASET_POLICY.md`. If any status is "review required", do not publish.
3. Review limitations and known biases; ensure in-product surfaces display them for any `stable` model.
4. Review publication ethics: no victim data, no impersonation tooling, no automated accusations, and detection output framed as evidence for human review.
5. Obtain the model governance reviewer's recorded approval, then publish the card, result JSON, and reproduction command together.
6. If a result cannot be reproduced because a dataset or artifact cannot be legally redistributed, publish the method and the explicit statement that the numeric result is not reproducible here.

Any metric that lacks a recorded reproduction command must be withdrawn from published material.
