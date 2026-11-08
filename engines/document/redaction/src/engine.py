from pydantic import BaseModel


class RedactionRequest(BaseModel):
    document_id: str
    terms: list[str] = []


class RedactionResult(BaseModel):
    document_id: str
    redacted_count: int = 0


def redact(request: RedactionRequest) -> RedactionResult:
    if not request.document_id.strip():
        raise ValueError("Document id required.")
    return RedactionResult(document_id=request.document_id, redacted_count=len(request.terms))
