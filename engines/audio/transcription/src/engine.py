from pydantic import BaseModel, Field

REASON = "No local speech recognition model is configured in this repository."
LANGUAGES = ("en", "zh", "es", "fr", "de", "ar", "hi", "ja")

LIMITATIONS = [
    "No speech is transcribed; an empty utterance list means unavailable, not silence.",
    "Real transcription requires a configured model and a documented evaluation set.",
]


class TranscriptionRequest(BaseModel):
    audio_id: str
    language: str
    audio_base64: str | None = None
    audio_path: str | None = None


class Utterance(BaseModel):
    start_ms: int
    end_ms: int
    text: str


class TranscriptionResult(BaseModel):
    audio_id: str
    language: str
    utterances: list[Utterance] = Field(default_factory=list)
    status: str = "unavailable"
    reason: str = REASON
    limitations: list[str] = Field(default_factory=lambda: list(LIMITATIONS))


def _validate(request: TranscriptionRequest) -> None:
    if not request.audio_id.strip():
        raise ValueError("Audio id required.")
    if request.language not in LANGUAGES:
        raise ValueError("Unsupported language for local transcription.")


def transcribe(request: TranscriptionRequest) -> list[Utterance]:
    _validate(request)
    return []


def transcribe_detailed(request: TranscriptionRequest) -> TranscriptionResult:
    _validate(request)
    return TranscriptionResult(audio_id=request.audio_id, language=request.language)
