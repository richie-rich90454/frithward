from pydantic import BaseModel


class ProtectionRequest(BaseModel):
    audio_id: str


class ProtectionResult(BaseModel):
    audio_id: str
    protected: bool = False


def protect(request: ProtectionRequest) -> ProtectionResult:
    if not request.audio_id.strip():
        raise ValueError("Audio id required.")
    return ProtectionResult(audio_id=request.audio_id, protected=True)
