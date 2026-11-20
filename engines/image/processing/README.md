# Image processing engine

Deterministic resize geometry from caller-supplied source dimensions. The engine computes an aspect-preserving target box within the supplied bounds, capped at scale 1.0. No pixels are decoded or transformed; if source dimensions are absent it reports that explicitly.

## Intended use

- Downsizing large images for review and sharing.
- Cropping regions before privacy inspection.

## Prohibited use

- Altering evidence without keeping the original and a processing manifest.

## Interface

| Item | Value |
| --- | --- |
| Request | `ResizeRequest { image_id: str, max_width: int = 2048, max_height: int = 2048, source_width: int \| None, source_height: int \| None }` |
| Response | `ResizeResult { image_id, width, height, scale, status, detail, limitations }` |
| Validation | Non-empty id; positive bounds; supply both source dimensions or neither |
| Complexity | O(1) in supplied metadata |
| Streaming | Row streaming with bounded memory |
| Cancellation | Between tiles |
| Model lifecycle | Deterministic processing needs no model |

## Metrics

Output dimensions, processing time, peak memory, and visual quality for downstream tasks.

## Model candidates and datasets

None. This is deterministic image processing.

## Limitations

- No pixels are resized or cropped; only target geometry is computed.
- Scaling never enlarges beyond the source.
- Resampling behavior must be documented by the caller.
