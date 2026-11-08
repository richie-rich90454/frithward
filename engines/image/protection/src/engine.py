from pydantic import BaseModel


class ProtectionRequest(BaseModel):
    image_id: str


class ProtectionResult(BaseModel):
    image_id: str
    protected: bool = False


def protect(request: ProtectionRequest) -> ProtectionResult:
    if not request.image_id.strip():
        raise ValueError("Image id required.")
    return ProtectionResult(image_id=request.image_id, protected=True)
