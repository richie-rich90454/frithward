# Video processing engine

Chunked trim and container handling. The engine validates the time range and returns the resulting duration. The scaffold does not decode or re-encode video.

## Intended use

- Trimming clips for review and export.
- Preparing media for captioning and analysis.

## Prohibited use

- Altering evidence without keeping the original and a processing manifest.

## Interface

| Item            | Value                                                                  |
| --------------- | ---------------------------------------------------------------------- |
| Request         | `TrimRequest { video_id: str, start_ms: int = 0, end_ms: int = 1000 }` |
| Response        | `TrimResult { video_id, duration_ms }`                                 |
| Validation      | Non-empty video id; `end_ms > start_ms`                                |
| Complexity      | O(d) in duration                                                       |
| Streaming       | Chunked with bounded memory                                            |
| Cancellation    | At chunk boundaries                                                    |
| Model lifecycle | Deterministic processing needs no model                                |

## Metrics

Output duration accuracy, processing time, peak memory, and stream integrity.

## Model candidates and datasets

None. This is deterministic media processing.

## Limitations

- The scaffold does not trim or transcode.
- Keyframe alignment and container behavior must be documented by the caller.
