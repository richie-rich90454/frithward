# Image processing engine

Resize and crop operations. The engine validates bounds and returns dimensions.
The scaffold echoes the requested bounds without decoding the image.

## Intended use

- Downsizing large images for review and sharing.
- Cropping regions before privacy inspection.

## Prohibited use

- Altering evidence without keeping the original and a processing manifest.

## Interface

| Item | Value |
| --- | --- |
| Request | `ResizeRequest { image_id: str, max_width: int = 2048, max_height: int = 2048 }` |
| Response | `ResizeResult { image_id, width, height }` |
| Validation | Non-empty image id; positive bounds |
| Complexity | O(p) in pixels |
| Streaming | Row streaming with bounded memory |
| Cancellation | Between tiles |
| Model lifecycle | Deterministic processing needs no model |

## Metrics

Output dimensions, processing time, peak memory, and visual quality for
downstream tasks.

## Model candidates and datasets

None. This is deterministic image processing.

## Limitations

- The scaffold does not resize or crop.
- Aspect-ratio and resampling behavior must be documented by the caller.
