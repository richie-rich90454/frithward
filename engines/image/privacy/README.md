# Image privacy engine

Exposure detection for faces, license plates, and documents. The engine
validates an image id and returns findings. The scaffold returns no findings.

## Intended use

- Pre-share privacy checks on the user's own images.
- Highlighting regions that may need redaction.

## Prohibited use

- Building face recognition or identification systems.
- Processing images of people without a lawful basis and consent.

## Interface

| Item | Value |
| --- | --- |
| Request | `PrivacyRequest { image_id: str }` |
| Response | `PrivacyResult { image_id, findings: list[str] }` |
| Validation | `image_id` must be non-empty |
| Complexity | O(p) in pixels |
| Streaming | Frame |
| Cancellation | Between regions |
| Model lifecycle | Stage-gated; load once, warm up, infer, release |

## Metrics

Precision and recall at a documented IoU threshold, reported per class and
demographic group where evaluation data permits.

## Model candidates and datasets

No fixed candidate. Training and evaluation data must be licensed and
consented; no non-consensual identity datasets. See the dataset policy.

## Limitations

- The scaffold detects nothing.
- Region hints are not pixel-accurate masks.
- Demographic performance differences must be documented.
