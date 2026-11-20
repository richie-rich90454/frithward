"""Deterministic PCM gain enhancement using only the standard library.

Samples are supplied as little-endian PCM bytes. Gain is applied linearly and
the result is clamped to the source sample range. No model or network is used.
"""
import base64

from pydantic import BaseModel, Field

LIMITATIONS = [
    "PCM is little-endian: 8-bit unsigned, 16-bit signed, or 32-bit signed.",
    "Clamping at the sample range can introduce distortion.",
    "No noise reduction, echo cancellation, or source separation is performed.",
]

_FMTS = {1: (-(2**7), 2**7 - 1), 2: (-(2**15), 2**15 - 1), 4: (-(2**31), 2**31 - 1)}


class EnhancementRequest(BaseModel):
    audio_id: str
    gain_db: float = 0.0
    pcm_base64: str | None = None
    sample_width: int = 2


class EnhancementResult(BaseModel):
    audio_id: str
    gain_db: float
    sample_count: int = 0
    processed_pcm_base64: str | None = None
    peak_before: float = 0.0
    peak_after: float = 0.0
    clipped_count: int = 0
    limitations: list[str] = Field(default_factory=list)


def _decode(raw: bytes, width: int) -> list[int]:
    if width == 1:
        return [value - 128 for value in raw]
    return [
        int.from_bytes(raw[pos : pos + width], "little", signed=True)
        for pos in range(0, len(raw) - width + 1, width)
    ]


def _encode(samples: list[int], width: int, low: int, high: int) -> bytes:
    if width == 1:
        return bytes(max(0, min(255, value + 128)) for value in samples)
    return b"".join(
        max(low, min(high, value)).to_bytes(width, "little", signed=True)
        for value in samples
    )


def enhance(request: EnhancementRequest) -> EnhancementResult:
    if not request.audio_id.strip():
        raise ValueError("Audio id required.")
    if request.sample_width not in _FMTS:
        raise ValueError("sample_width must be 1, 2, or 4 bytes.")
    if not -120.0 <= request.gain_db <= 120.0:
        raise ValueError("gain_db must be between -120 and 120.")
    limitations = list(LIMITATIONS)

    if not request.pcm_base64:
        limitations.append("No PCM samples supplied; nothing was processed.")
        return EnhancementResult(
            audio_id=request.audio_id, gain_db=request.gain_db, limitations=limitations
        )

    try:
        raw = base64.b64decode(request.pcm_base64, validate=True)
    except ValueError as error:
        raise ValueError("pcm_base64 must be valid base64.") from error

    low, high = _FMTS[request.sample_width]
    samples = _decode(raw, request.sample_width)
    factor = 10.0 ** (request.gain_db / 20.0)
    scaled = [int(round(value * factor)) for value in samples]
    clipped_count = sum(1 for value in scaled if value < low or value > high)
    full_scale = max(abs(low), abs(high))
    peak_before = max((abs(value) for value in samples), default=0) / full_scale
    clamped = [max(low, min(high, value)) for value in scaled]
    peak_after = max((abs(value) for value in clamped), default=0) / full_scale
    processed = _encode(clamped, request.sample_width, low, high)

    return EnhancementResult(
        audio_id=request.audio_id,
        gain_db=request.gain_db,
        sample_count=len(samples),
        processed_pcm_base64=base64.b64encode(processed).decode("ascii"),
        peak_before=round(peak_before, 6),
        peak_after=round(peak_after, 6),
        clipped_count=clipped_count,
        limitations=limitations,
    )
