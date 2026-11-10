# Image detection engine

Experimental synthetic image detection. The engine validates an image id and returns indicators and limitations. Model-backed inference is not wired yet.

## Intended use

- Investigative review of images with human judgment.
- Comparing detector candidates across generators.

## Prohibited use

- Proving an image is authentic or manipulated as a final verdict.
- Automated accusations or account actions.

## Interface

| Item            | Value                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| Request         | `DetectionRequest { image_id: str }`                                          |
| Response        | `DetectionResult { image_id, indicators: list[str], limitations: list[str] }` |
| Validation      | `image_id` must be non-empty                                                  |
| Complexity      | O(p) in pixels per frame                                                      |
| Streaming       | Frame-level; no temporal stream                                               |
| Cancellation    | Between frames                                                                |
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
