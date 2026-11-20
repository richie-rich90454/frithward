# Image detection engine

Experimental synthetic image detection. The engine validates an image id and runs a caller-supplied PyTorch artifact on a decoded tensor. Without a model path it raises `No model artifact configured; see models/manifest.json`; no detections are fabricated.

## Intended use

- Investigative review of images with human judgment.
- Comparing detector candidates across generators.

## Prohibited use

- Proving an image is authentic or manipulated as a final verdict.
- Automated accusations or account actions.

## Interface

| Item            | Value                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| Request         | `DetectionRequest { image_id, model_path?, model_name?, model_version?, image_base64?, image_path? }` |
| Response        | `DetectionResult { image_id, model_name, model_version, scores: list[float], limitations }` |
| Validation      | Non-empty `image_id`; a model path and a tensor input are required            |
| Tensor input    | Base64 or file bytes interpreted as little-endian float32                     |
| Model loading   | `torch.jit.load` on CPU, falling back to `torch.load` on CPU                  |
| Complexity      | O(p) in pixels per frame                                                      |
| Streaming       | Frame-level; no temporal stream                                               |
| Model lifecycle | Load once, warm up, infer, release; stage-gated                               |

## Metrics

Precision, recall, and cross-generator performance. Report the generator or dataset mix used in evaluation.

## Model candidates and datasets

- Candidates: Xception, EfficientNet, ViT.
- Datasets: FaceForensics++, DFDC, Celeb-DF; licensing review required.

## Limitations

- Frame-level scores are evidence, not proof.
- Performance drops on unseen generators and heavy compression.
- No model weights are distributed with the repository.
- The test artifact is a synthetic tiny module; `scripts/export_onnx.py` emits a demo ONNX on demand and does not commit it.
- The `torch.load` fallback deserializes a caller-chosen path; only pass trusted artifacts.
