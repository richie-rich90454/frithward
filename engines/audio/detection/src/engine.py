from pydantic import BaseModel, Field

REASON = "No local audio manipulation detector model is configured in this repository."


class DetectionRequest(BaseModel):
    audio_id: str
    audio_base64: str | None = None
    audio_path: str | None = None


class DetectionResult(BaseModel):
    audio_id: str
    indicators: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(
        default_factory=lambda: [
            "No scores or indicators are produced without a configured model.",
            "Sampling or single-model scores cannot prove manipulation.",
        ]
    )
    status: str = "unavailable"
    reason: str = REASON


def detect(request: DetectionRequest) -> DetectionResult:
    if not request.audio_id.strip():
        raise ValueError("Audio id required.")
    return DetectionResult(audio_id=request.audio_id)
