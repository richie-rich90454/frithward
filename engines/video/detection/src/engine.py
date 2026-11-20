"""Frame statistics computed from caller-supplied raw grayscale frame bytes.

Each frame is treated as an 8-bit luma plane of width x height. The engine
computes mean luma, luma variance, black-frame count and a duplicate-frame
ratio. These are statistics, not deepfake or manipulation detection scores.
"""
import base64
from pathlib import Path

from pydantic import BaseModel, Field

REASON = "No local video manipulation detector model is configured in this repository."
REASON_NO_FRAMES = "No frame buffers were supplied to analyse."
BLACK_MEAN_LUMA = 8.0
METHOD = "frame-signal-statistics"

LIMITATIONS = [
    "These are frame statistics, not deepfake or manipulation detection scores.",
    "No indicators are produced; a model and evaluation are required for detection.",
    "Sampling may miss brief manipulations or transient duplicate frames.",
    "Frames must be supplied as raw 8-bit grayscale bytes matching width x height.",
    "Duplicate ratio compares exact bytes; compression noise defeats equality.",
]


class DetectionRequest(BaseModel):
    video_id: str
    sample_frames: int = 8
    video_path: str | None = None
    frame_base64: str | None = None
    frames_base64: list[str] = Field(default_factory=list)
    width: int | None = None
    height: int | None = None


class FrameStats(BaseModel):
    index: int
    mean_luma: float
    luma_variance: float
    black: bool


class VideoStatistics(BaseModel):
    frame_count: int
    width: int
    height: int
    mean_luma: float
    luma_variance: float
    black_frame_count: int
    duplicate_frame_ratio: float
    frames: list[FrameStats]


class DetectionResult(BaseModel):
    video_id: str
    indicators: list[str] = Field(default_factory=list)
    statistics: VideoStatistics | None = None
    status: str = "unavailable"
    reason: str = REASON
    method: str = METHOD
    limitations: list[str] = Field(default_factory=lambda: list(LIMITATIONS))


def _frame_data(request: DetectionRequest) -> list[bytes]:
    encoded = list(request.frames_base64)
    if request.frame_base64:
        encoded.append(request.frame_base64)
    return [base64.b64decode(item, validate=True) for item in encoded[:request.sample_frames]]


def _frame_stats(data: bytes, width: int, height: int, index: int) -> FrameStats:
    expected = width * height
    if len(data) != expected:
        raise ValueError("Frame byte length does not match width x height.")
    mean = sum(data) / expected
    variance = sum((value - mean) ** 2 for value in data) / expected
    return FrameStats(
        index=index,
        mean_luma=round(mean, 4),
        luma_variance=round(variance, 4),
        black=mean < BLACK_MEAN_LUMA,
    )


def detect(request: DetectionRequest) -> DetectionResult:
    if not request.video_id.strip():
        raise ValueError("Video id required.")
    if request.sample_frames <= 0:
        raise ValueError("Sample frames must be positive.")
    if (request.width is None) != (request.height is None):
        raise ValueError("Supply both width and height, or neither.")
    if request.width is not None and request.width <= 0:
        raise ValueError("Frame dimensions must be positive.")
    if request.height is not None and request.height <= 0:
        raise ValueError("Frame dimensions must be positive.")

    frames = _frame_data(request)
    if not frames:
        return DetectionResult(video_id=request.video_id)
    if request.width is None or request.height is None:
        raise ValueError("Frame width and height are required to analyse supplied frames.")

    per_frame = [
        _frame_stats(data, request.width, request.height, index)
        for index, data in enumerate(frames)
    ]
    duplicates = sum(a == b for a, b in zip(frames, frames[1:]))
    ratio = duplicates / (len(frames) - 1) if len(frames) > 1 else 0.0
    mean_luma = sum(frame.mean_luma for frame in per_frame) / len(per_frame)
    variance = sum(frame.luma_variance for frame in per_frame) / len(per_frame)
    statistics = VideoStatistics(
        frame_count=len(frames),
        width=request.width,
        height=request.height,
        mean_luma=round(mean_luma, 4),
        luma_variance=round(variance, 4),
        black_frame_count=sum(frame.black for frame in per_frame),
        duplicate_frame_ratio=round(ratio, 6),
        frames=per_frame,
    )
    return DetectionResult(
        video_id=request.video_id,
        statistics=statistics,
        status="computed",
        reason="Raw frame statistics computed from supplied buffers; not a detection result.",
    )
