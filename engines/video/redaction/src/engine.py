from pydantic import BaseModel, Field

REASON = "No local video redaction pipeline or region detector is configured in this repository."


class RedactionRequest(BaseModel):
    video_id: str
    regions: list[str] = []
    video_path: str | None = None


class RedactionResult(BaseModel):
    video_id: str
    redacted_regions: list[str] = Field(default_factory=list)
    status: str = "unavailable"
    reason: str = REASON
    limitations: list[str] = Field(
        default_factory=lambda: [
            "Requested regions are not applied; no redaction is claimed.",
            "Real redaction requires a configured pipeline and frame-accurate validation.",
        ]
    )


def redact(request: RedactionRequest) -> RedactionResult:
    if not request.video_id.strip():
        raise ValueError("Video id required.")
    return RedactionResult(video_id=request.video_id, redacted_regions=[])
