"""Audio protection surface with deterministic input preprocessing.

No watermark or protection transform is applied: the engine stays explicitly
unavailable. It does compute a real content hash, byte length and sample count
from supplied PCM bytes so a caller can validate the exact input before any
future protection step.
"""
import base64
import hashlib
from pathlib import Path

from pydantic import BaseModel, Field

REASON = "No local audio watermarking or protection model is configured in this repository."

LIMITATIONS = [
    "No watermark or protection is applied; no success is claimed.",
    "Real protection requires a configured model and robustness evaluation.",
    "Preprocessing computes a content hash only; it does not modify the audio.",
    "Sample count assumes 16-bit PCM (two bytes per sample).",
]


class ProtectionRequest(BaseModel):
    audio_id: str
    audio_base64: str | None = None
    audio_path: str | None = None


class ProtectionPreflight(BaseModel):
    sha256: str
    byte_length: int
    sample_count: int | None


class ProtectionResult(BaseModel):
    audio_id: str
    protected: bool = False
    preprocessing: ProtectionPreflight | None = None
    status: str = "unavailable"
    reason: str = REASON
    limitations: list[str] = Field(default_factory=lambda: list(LIMITATIONS))


def protect(request: ProtectionRequest) -> ProtectionResult:
    if not request.audio_id.strip():
        raise ValueError("Audio id required.")
    if request.audio_base64:
        raw = base64.b64decode(request.audio_base64, validate=True)
    elif request.audio_path:
        raw = Path(request.audio_path).read_bytes()
    else:
        raw = b""
    preflight = None
    if raw:
        preflight = ProtectionPreflight(
            sha256=hashlib.sha256(raw).hexdigest(),
            byte_length=len(raw),
            sample_count=len(raw) // 2,
        )
    return ProtectionResult(audio_id=request.audio_id, preprocessing=preflight)
