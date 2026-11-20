# Video processing engine

Deterministic trim metadata computation. The engine validates the time range and computes duration, frame count, and a sampling plan from caller-supplied frame rate. No frames are decoded or re-encoded; if fps is absent, frame counts are reported as unavailable.

## Intended use

- Trimming clips for review and export.
- Preparing media for captioning and analysis.

## Prohibited use

- Altering evidence without keeping the original and a processing manifest.

## Interface

| Item            | Value                                                                  |
| --------------- | ---------------------------------------------------------------------- |
| Request         | `TrimRequest { video_id: str, start_ms: int = 0, end_ms: int = 1000, fps: float \| None, sample_frames: int \| None }` |
| Response        | `TrimResult { video_id, duration_ms, frame_count, sampled_frame_count, sample_stride, status, detail, limitations }` |
| Validation      | Non-empty id; `end_ms > start_ms`; `fps` and `sample_frames` positive if supplied |
| Complexity      | O(1) in supplied metadata                                              |
| Streaming       | Chunked with bounded memory                                            |
| Cancellation    | At chunk boundaries                                                    |
| Model lifecycle | Deterministic processing needs no model                                |

## Metrics

Output duration accuracy, processing time, peak memory, and stream integrity.

## Model candidates and datasets

None. This is deterministic media processing.

## Limitations

- No frames are trimmed or transcoded; only timing metadata is computed.
- Frame counts require a caller-supplied fps and are rounded.
- Keyframe alignment and container behavior must be documented by the caller.
