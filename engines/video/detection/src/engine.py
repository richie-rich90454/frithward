from pydantic import BaseModel


class DetectionRequest(BaseModel):
    video_id: str
    sample_frames: int = 8


class DetectionResult(BaseModel):
    video_id: str
    indicators: list[str] = []
    limitations: list[str] = []


def detect(request: DetectionRequest) -> DetectionResult:
    if not request.video_id.strip():
        raise ValueError("Video id required.")
    if request.sample_frames <= 0:
        raise ValueError("Sample frames must be positive.")
    return DetectionResult(
        video_id=request.video_id,
        limitations=["Sampling may miss brief manipulations."],
    )
