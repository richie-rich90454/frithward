"""Audio transcription surface with a real PCM preflight.

No speech recognition model is configured, so no utterances are produced. The
engine still does honest work before reporting unavailable: it decodes supplied
PCM samples and measures duration, RMS and peak level.
"""
import base64
import math
import struct
from pathlib import Path

from pydantic import BaseModel, Field

REASON = "No local speech recognition model is configured in this repository."
LANGUAGES = ("en", "zh", "es", "fr", "de", "ar", "hi", "ja")

LIMITATIONS = [
    "No speech is transcribed; an empty utterance list means unavailable, not silence.",
    "Real transcription requires a configured model and a documented evaluation set.",
    "Preflight measures signal properties only; it does not recognize speech.",
    "Assumes mono PCM: 8-bit unsigned or 16-bit signed little-endian samples.",
]


class TranscriptionRequest(BaseModel):
    audio_id: str
    language: str
    audio_base64: str | None = None
    audio_path: str | None = None
    sample_rate: int = 16000
    sample_width: int = 2


class AudioPreflight(BaseModel):
    sample_count: int
    sample_rate: int
    duration_ms: int
    rms: float
    peak: float


class Utterance(BaseModel):
    start_ms: int
    end_ms: int
    text: str


class TranscriptionResult(BaseModel):
    audio_id: str
    language: str
    utterances: list[Utterance] = Field(default_factory=list)
    preflight: AudioPreflight | None = None
    status: str = "unavailable"
    reason: str = REASON
    limitations: list[str] = Field(default_factory=lambda: list(LIMITATIONS))


def _validate(request: TranscriptionRequest) -> None:
    if not request.audio_id.strip():
        raise ValueError("Audio id required.")
    if request.language not in LANGUAGES:
        raise ValueError("Unsupported language for local transcription.")
    if request.sample_rate <= 0:
        raise ValueError("Sample rate must be positive.")
    if request.sample_width not in (1, 2):
        raise ValueError("Sample width must be 1 or 2 bytes.")


def _decode_pcm(raw: bytes, sample_width: int) -> list[float]:
    if len(raw) % sample_width:
        raise ValueError("PCM byte length is not aligned to the sample width.")
    if sample_width == 1:
        return [(byte - 128) / 128.0 for byte in raw]
    values = struct.unpack(f"<{len(raw) // 2}h", raw)
    return [value / 32768.0 for value in values]


def _preflight(request: TranscriptionRequest) -> AudioPreflight | None:
    if request.audio_base64:
        raw = base64.b64decode(request.audio_base64, validate=True)
    elif request.audio_path:
        raw = Path(request.audio_path).read_bytes()
    else:
        return None
    if not raw:
        return None
    samples = _decode_pcm(raw, request.sample_width)
    if not samples:
        return None
    rms = math.sqrt(sum(sample * sample for sample in samples) / len(samples))
    return AudioPreflight(
        sample_count=len(samples),
        sample_rate=request.sample_rate,
        duration_ms=round(len(samples) / request.sample_rate * 1000.0),
        rms=round(rms, 6),
        peak=round(max(abs(sample) for sample in samples), 6),
    )


def transcribe(request: TranscriptionRequest) -> list[Utterance]:
    _validate(request)
    return []


def transcribe_detailed(request: TranscriptionRequest) -> TranscriptionResult:
    _validate(request)
    return TranscriptionResult(
        audio_id=request.audio_id,
        language=request.language,
        preflight=_preflight(request),
    )
