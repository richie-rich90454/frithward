# Results

Results are recorded only from executed evaluations. Do not write a metric that was not computed.

## Required fields

- Engine name and version
- Model name, version, and weights hash
- Dataset name, version, split, license status, and consent flag
- Metric name, value, sample size, and confidence interval when available
- Threshold and operating point
- Harness commit and exact command
- Date and operator

## Workflow

1. Run the evaluation with `research/benchmarks/harness.py`.
2. Save the raw predictions and the harness output.
3. Copy the harness output into this directory as JSON, not as prose.
4. Record cross-dataset and cross-generator results in separate rows.
5. State explicitly what was not measured.

## Rules

- No placeholder numbers, no expected values, and no fabricated baselines.
- A single metric never establishes protection.
- Missing data is recorded as missing, not as zero.
- License status stays "review required" until a review records a decision.
