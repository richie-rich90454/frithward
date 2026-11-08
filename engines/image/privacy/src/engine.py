from pydantic import BaseModel


class PrivacyRequest(BaseModel):
    image_id: str


class PrivacyResult(BaseModel):
    image_id: str
    findings: list[str] = []


def inspect(request: PrivacyRequest) -> PrivacyResult:
    if not request.image_id.strip():
        raise ValueError("Image id required.")
    return PrivacyResult(image_id=request.image_id, findings=[])
