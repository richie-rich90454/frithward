from pydantic import BaseModel


class TrimRequest(BaseModel):
    video_id: str
    start_ms: int = 0
    end_ms: int = 1000


class TrimResult(BaseModel):
    video_id: str
    duration_ms: int


def process(request: TrimRequest) -> TrimResult:
    if not request.video_id.strip():
        raise ValueError("Video id required.")
    if request.end_ms <= request.start_ms:
        raise ValueError("End must exceed start.")
    return TrimResult(video_id=request.video_id, duration_ms=request.end_ms - request.start_ms)
