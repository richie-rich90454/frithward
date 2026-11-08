from pydantic import BaseModel


class DetectionRequest(BaseModel):
    image_id: str


class DetectionResult(BaseModel):
    image_id: str
    indicators: list[str] = []
    limitations: list[str] = []


def detect(request: DetectionRequest) -> DetectionResult:
    if not request.image_id.strip():
        raise ValueError("Image id required.")
    return DetectionResult(
        image_id=request.image_id,
        limitations=["Frame-level scores are evidence, not proof."],
    )
