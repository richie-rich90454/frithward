from pydantic import BaseModel


class OcrRequest(BaseModel):
    document_id: str
    language: str = "en"


class OcrResult(BaseModel):
    document_id: str
    text: str = ""


def recognize(request: OcrRequest) -> OcrResult:
    if not request.document_id.strip():
        raise ValueError("Document id required.")
    return OcrResult(document_id=request.document_id)
