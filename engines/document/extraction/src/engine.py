from pydantic import BaseModel


class ExtractionRequest(BaseModel):
    document_id: str


class ExtractionResult(BaseModel):
    document_id: str
    fields: dict[str, str] = {}


def extract(request: ExtractionRequest) -> ExtractionResult:
    if not request.document_id.strip():
        raise ValueError("Document id required.")
    return ExtractionResult(document_id=request.document_id, fields={})
