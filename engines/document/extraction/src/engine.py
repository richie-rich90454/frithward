from pydantic import BaseModel, Field

REASON = "No local structured field-extraction model or parser is configured in this repository."


class ExtractionRequest(BaseModel):
    document_id: str
    text: str | None = None
    document_base64: str | None = None
    document_path: str | None = None


class ExtractionResult(BaseModel):
    document_id: str
    fields: dict[str, str] = Field(default_factory=dict)
    status: str = "unavailable"
    reason: str = REASON
    limitations: list[str] = Field(
        default_factory=lambda: [
            "No fields are extracted; an empty field map means unavailable, not no fields.",
            "Input text or bytes are accepted but not parsed.",
            "Real extraction requires a configured parser or model with evaluation.",
        ]
    )


def extract(request: ExtractionRequest) -> ExtractionResult:
    if not request.document_id.strip():
        raise ValueError("Document id required.")
    return ExtractionResult(document_id=request.document_id, fields={})
