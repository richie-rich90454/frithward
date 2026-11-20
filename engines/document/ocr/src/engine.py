from pydantic import BaseModel, Field

REASON = "No local OCR engine or model is configured in this repository."


class OcrRequest(BaseModel):
    document_id: str
    language: str = "en"
    document_base64: str | None = None
    document_path: str | None = None


class OcrResult(BaseModel):
    document_id: str
    text: str = ""
    status: str = "unavailable"
    reason: str = REASON
    limitations: list[str] = Field(
        default_factory=lambda: [
            "Input bytes are accepted but not decoded; no text is produced.",
            "An empty text result means unavailable, not a blank document.",
            "Real OCR requires a configured engine and evaluation data.",
        ]
    )


def recognize(request: OcrRequest) -> OcrResult:
    if not request.document_id.strip():
        raise ValueError("Document id required.")
    return OcrResult(document_id=request.document_id, text="")
