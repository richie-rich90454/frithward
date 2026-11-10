# Video detection engine

Experimental temporal and frame-level synthetic media detection. The engine validates the video id and sample count and returns indicators and limitations. Model-backed inference is not wired yet.

## Intended use

- Investigative review of video with human judgment.
- Comparing temporal and frame-level detector candidates.

## Prohibited use

- Proving a video is authentic or manipulated as a final verdict.
- Automated accusations or account actions.

## Interface

| Item            | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| Request         | `DetectionRequest { video_id: str, sample_frames: int = 8 }` |
| Response        | `DetectionResult { video_id, indicators, limitations }`      |
| Validation      | Non-empty video id; positive sample count                    |
| Complexity      | O(f·p) in sampled frames and pixels                          |
| Streaming       | Sampled frames                                               |
| Cancellation    | Between frames                                               |
| Model lifecycle | Load once, warm up, infer, release; stage-gated              |

## Metrics

Cross-dataset and cross-generator generalization, sampling sensitivity, precision, and recall.

## Model candidates and datasets

Temporal and frame-level classifiers. Datasets require licensing and consent review. See `research/video-detection`.

## Limitations

- The scaffold detects nothing.
- Sampling may miss brief manipulations.
- Performance varies with codec, resolution, and compression.
