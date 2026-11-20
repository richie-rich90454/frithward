from pydantic import BaseModel, Field

REASON = "No local image watermarking or protection model is configured in this repository."


class ProtectionRequest(BaseModel):
    image_id: str
    image_base64: str | None = None
    image_path: str | None = None


class ProtectionResult(BaseModel):
    image_id: str
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
    if not request.image_id.strip():
        raise ValueError("Image id required.")
    return ProtectionResult(image_id=request.image_id, protected=False)
