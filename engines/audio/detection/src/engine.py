from pydantic import BaseModel


class DetectionRequest(BaseModel):
    audio_id: str


class DetectionResult(BaseModel):
    audio_id: str
    indicators: list[str] = []
    limitations: list[str] = []


def detect(request: DetectionRequest) -> DetectionResult:
    if not request.audio_id.strip():
        raise ValueError("Audio id required.")
    return DetectionResult(
        audio_id=request.audio_id,
        limitations=["Single-model scores are evidence, not proof."],
    )
