from pydantic import BaseModel, Field

REASON = "No local video manipulation detector model is configured in this repository."


class DetectionRequest(BaseModel):
    video_id: str
    sample_frames: int = 8
    video_path: str | None = None
    frame_base64: str | None = None


class DetectionResult(BaseModel):
    video_id: str
    indicators: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(
        default_factory=lambda: [
            "No indicators are produced without a configured model.",
            "Sampling may miss brief manipulations.",
        ]
    )
    status: str = "unavailable"
    reason: str = REASON


def detect(request: DetectionRequest) -> DetectionResult:
    if not request.video_id.strip():
        raise ValueError("Video id required.")
    if request.sample_frames <= 0:
        raise ValueError("Sample frames must be positive.")
    return DetectionResult(video_id=request.video_id)
