# Video detection engine

Experimental temporal and frame-level synthetic media detection. With supplied raw grayscale frame buffers the engine computes genuine frame statistics (mean luma, luma variance, black-frame count and duplicate-frame ratio) labelled `frame-signal-statistics`. These are not detection scores: `indicators` stays empty and no model inference is wired.

## Intended use

- Investigative review of video with human judgment.
- Comparing temporal and frame-level detector candidates.

## Prohibited use

- Proving a video is authentic or manipulated as a final verdict.
- Automated accusations or account actions.

## Interface

| Item            | Value                                                                          |
| --------------- | ------------------------------------------------------------------------------ |
| Request         | `DetectionRequest { video_id, sample_frames = 8, video_path?, frame_base64?, frames_base64?, width?, height? }` |
| Response        | `DetectionResult { video_id, indicators, statistics?, method, limitations, status, reason }` |
| Validation      | Non-empty video id; positive sample count; width/height required for frames     |
| Complexity      | O(f·p) in sampled frames and pixels                                            |
| Streaming       | Sampled frames                                                                 |
| Cancellation    | Between frames                                                                 |
| Model lifecycle | Load once, warm up, infer, release; stage-gated                                |

## Metrics

Cross-dataset and cross-generator generalization, sampling sensitivity, precision, and recall.

## Model candidates and datasets

Temporal and frame-level classifiers. Datasets require licensing and consent review. See `research/video-detection`.

## Limitations

- Frame statistics cannot establish whether media is synthetic or manipulated; `indicators` is always empty.
- Frames must be raw 8-bit grayscale bytes of exactly `width x height`; duplicate ratio compares exact bytes.
- Sampling may miss brief manipulations.
- Performance varies with codec, resolution, and compression.
