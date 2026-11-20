# Image processing engine

Deterministic resize geometry from caller-supplied source dimensions. The engine computes an aspect-preserving target box within the supplied bounds, capped at scale 1.0. When raw RGB24 pixel bytes are supplied it also performs a real stdlib operation: `grayscale` (integer Rec.601 luma) or `crop` (top-left to the computed box). No image file formats are decoded; if source dimensions are absent it reports that explicitly.

## Intended use

- Downsizing large images for review and sharing.
- Cropping regions before privacy inspection.

## Prohibited use

- Altering evidence without keeping the original and a processing manifest.

## Interface

| Item | Value |
| --- | --- |
| Request | `ResizeRequest { image_id: str, max_width: int = 2048, max_height: int = 2048, source_width: int \| None, source_height: int \| None, pixels_base64?: str, operation: str = "none" }` |
| Response | `ResizeResult { image_id, width, height, scale, status, detail, pixel_operation, output_base64?, output_width?, output_height?, limitations }` |
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

- Geometry is always computed; pixels are changed only when RGB24 bytes and `operation` are supplied.
- Scaling never enlarges beyond the source. No PNG/JPEG decoding is performed.
- Resampling behavior must be documented by the caller.
