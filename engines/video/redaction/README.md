# Video redaction engine

Temporal face and license-plate redaction surface. The engine validates the video id and builds a deterministic region manifest: requested regions are classified (`rectangle` `x1,y1,x2,y2` or `label`), validated, and hashed. It stays explicitly `unavailable` with no redacted regions; no pixel changes are applied.

## Intended use

- Protecting bystanders and victims before publishing video.
- Consensual redaction of a user's own recording.

## Prohibited use

- Redacting evidence without preserving the original and a processing record.
- Claiming redaction guarantees the subject cannot be identified.

## Interface

| Item | Value |
| --- | --- |
| Request | `RedactionRequest { video_id, regions: list[str] = [], video_path? }` |
| Response | `RedactionResult { video_id, redacted_regions: list[str], manifest?, status, reason, limitations }` |
| Validation | `video_id` must be non-empty |
| Complexity | O(f·p) with region masks |
| Streaming | Chunked |
| Cancellation | At chunk boundaries |
| Model lifecycle | Region detection follows the standard lifecycle; pixel redaction is deterministic |

## Metrics

Redaction recall (sensitive regions covered), false-positive rate, and per-frame latency.

## Model candidates and datasets

No fixed candidate. Detection models require licensed, consented data. See the dataset policy.

## Limitations

- No regions are applied and no redaction is claimed (`redacted_regions` is always empty); the manifest only validates and records requests.
- Region tracking can fail on fast motion and occlusion.
- Exported validation is the caller's responsibility.
