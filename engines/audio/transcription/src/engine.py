from pydantic import BaseModel


class TranscriptionRequest(BaseModel):
    audio_id: str
    language: str


class Utterance(BaseModel):
    start_ms: int
    end_ms: int
    text: str


def transcribe(request: TranscriptionRequest) -> list[Utterance]:
    if not request.audio_id.strip():
        raise ValueError("Audio id required.")
    if request.language not in ("en", "zh", "es", "fr", "de", "ar", "hi", "ja"):
        raise ValueError("Unsupported language for local transcription.")
    return [Utterance(start_ms=0, end_ms=1000, text="")]
