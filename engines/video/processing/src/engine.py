"""Deterministic trim duration and frame-count geometry from supplied metadata.

No frames are decoded or rewritten: the engine computes duration, frame count,
and a sampling plan from caller-supplied timing and frame rate. It reports when
the frame rate is missing instead of assuming one.
"""
from pydantic import BaseModel, Field

LIMITATIONS = [
    "No frames are decoded or rewritten; only timing metadata is computed.",
    "Frame counts require a caller-supplied frame rate (fps).",
    "Frame counts are rounded and may differ from a real decoder's count.",
]


class TrimRequest(BaseModel):
    video_id: str
    start_ms: int = 0
    end_ms: int = 1000
    fps: float | None = None
    sample_frames: int | None = None


class TrimResult(BaseModel):
    video_id: str
    duration_ms: int
    frame_count: int | None = None
    sampled_frame_count: int | None = None
    sample_stride: int | None = None
    status: str = "computed"
    detail: str = ""
    limitations: list[str] = Field(default_factory=list)


def process(request: TrimRequest) -> TrimResult:
    if not request.video_id.strip():
        raise ValueError("Video id required.")
    if request.start_ms < 0:
        raise ValueError("Start must be non-negative.")
    if request.end_ms <= request.start_ms:
        raise ValueError("End must exceed start.")
    if request.fps is not None and request.fps <= 0:
        raise ValueError("fps must be positive.")
    if request.sample_frames is not None and request.sample_frames <= 0:
        raise ValueError("Sample frames must be positive.")

    duration_ms = request.end_ms - request.start_ms
    if request.fps is None:
        return TrimResult(
            video_id=request.video_id,
            duration_ms=duration_ms,
            status="partial",
            detail="fps not supplied; frame counts are unavailable.",
            limitations=list(LIMITATIONS),
        )

    frame_count = round(duration_ms / 1000.0 * request.fps)
    sampled_frame_count: int | None = None
    sample_stride: int | None = None
    detail = "Duration and frame count computed from supplied fps."
    if request.sample_frames is not None:
        sampled_frame_count = min(request.sample_frames, frame_count)
        sample_stride = max(1, frame_count // sampled_frame_count) if sampled_frame_count else None
        if sampled_frame_count < request.sample_frames:
            detail = "Requested samples exceed the frame count; capped at frame_count."
    return TrimResult(
        video_id=request.video_id,
        duration_ms=duration_ms,
        frame_count=frame_count,
        sampled_frame_count=sampled_frame_count,
        sample_stride=sample_stride,
        status="computed",
        detail=detail,
        limitations=list(LIMITATIONS),
    )
