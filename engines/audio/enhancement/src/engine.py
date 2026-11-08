from pydantic import BaseModel


class EnhancementRequest(BaseModel):
    audio_id: str
    gain_db: float = 0.0


class EnhancementResult(BaseModel):
    audio_id: str
    gain_db: float


def enhance(request: EnhancementRequest) -> EnhancementResult:
    if not request.audio_id.strip():
        raise ValueError("Audio id required.")
    return EnhancementResult(audio_id=request.audio_id, gain_db=request.gain_db)
