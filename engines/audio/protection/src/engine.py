from pydantic import BaseModel, Field

REASON = "No local audio watermarking or protection model is configured in this repository."


class ProtectionRequest(BaseModel):
    audio_id: str
    audio_base64: str | None = None
    audio_path: str | None = None


class ProtectionResult(BaseModel):
    audio_id: str
    protected: bool = False
    status: str = "unavailable"
    reason: str = REASON
    limitations: list[str] = Field(
        default_factory=lambda: [
            "No watermark or protection is applied; no success is claimed.",
            "Real protection requires a configured model and robustness evaluation.",
        ]
    )


def protect(request: ProtectionRequest) -> ProtectionResult:
    if not request.audio_id.strip():
        raise ValueError("Audio id required.")
    return ProtectionResult(audio_id=request.audio_id, protected=False)
