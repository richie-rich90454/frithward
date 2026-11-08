from pydantic import BaseModel


class RedactionRequest(BaseModel):
    video_id: str
    regions: list[str] = []


class RedactionResult(BaseModel):
    video_id: str
    redacted_regions: list[str] = []


def redact(request: RedactionRequest) -> RedactionResult:
    if not request.video_id.strip():
        raise ValueError("Video id required.")
    return RedactionResult(video_id=request.video_id, redacted_regions=request.regions)
