"""Signal statistics computed from caller-supplied PCM audio bytes.

This engine measures RMS, peak level, clipping and silence/speech-activity
segments. These are signal statistics, not synthetic-speech detection scores:
no model inference is performed and no manipulation indicator is claimed.
"""
import base64
import math
import struct
from pathlib import Path

from pydantic import BaseModel, Field

REASON = "No local audio manipulation detector model is configured in this repository."
REASON_NO_SAMPLES = "No PCM samples were supplied or decoded."
SILENCE_RMS = 0.01
FRAME_MS = 20.0
CLIP_THRESHOLD = 0.999
METHOD = "pcm-signal-statistics"

LIMITATIONS = [
    "These are signal statistics, not synthetic-speech detection scores.",
    "No manipulation indicator is produced; a model and evaluation are required for that.",
    "Assumes mono PCM: 8-bit unsigned or 16-bit signed little-endian samples.",
    "Speech activity is a loudness heuristic, not voice activity detection by a model.",
    "Clipping counts samples at or near full scale and may include source mastering.",
]


class DetectionRequest(BaseModel):
    audio_id: str
    audio_base64: str | None = None
    audio_path: str | None = None
    sample_rate: int = 16000
    sample_width: int = 2


class AudioSegment(BaseModel):
    start_ms: int
    end_ms: int
    kind: str


class SignalStatistics(BaseModel):
    sample_count: int
    sample_rate: int
    duration_ms: int
    rms: float
    peak: float
    clipping_count: int
    frame_count: int
    speech_segments: list[AudioSegment]
    silence_segments: list[AudioSegment]


class DetectionResult(BaseModel):
    audio_id: str
    indicators: list[str] = Field(default_factory=list)
    statistics: SignalStatistics | None = None
    status: str = "unavailable"
    reason: str = REASON
    method: str = METHOD
    limitations: list[str] = Field(default_factory=lambda: list(LIMITATIONS))


def _decode_pcm(raw: bytes, sample_width: int) -> list[float]:
    if len(raw) % sample_width:
        raise ValueError("PCM byte length is not aligned to the sample width.")
    if sample_width == 1:
        return [(byte - 128) / 128.0 for byte in raw]
    if sample_width == 2:
        values = struct.unpack(f"<{len(raw) // 2}h", raw)
        return [value / 32768.0 for value in values]
    raise ValueError("Unsupported sample width; use 1 or 2 bytes per sample.")


def _input_bytes(request: DetectionRequest) -> bytes | None:
    if request.audio_base64:
        return base64.b64decode(request.audio_base64, validate=True)
    if request.audio_path:
        return Path(request.audio_path).read_bytes()
    return None


def _segments(frame_rms: list[float], frame_len: int, sample_rate: int) -> tuple[list[AudioSegment], list[AudioSegment]]:
    per_frame_ms = frame_len / sample_rate * 1000.0
    merged: list[AudioSegment] = []
    for index, level in enumerate(frame_rms):
        kind = "speech" if level >= SILENCE_RMS else "silence"
        start = int(round(index * per_frame_ms))
        end = int(round((index + 1) * per_frame_ms))
        if merged and merged[-1].kind == kind and merged[-1].end_ms == start:
            merged[-1].end_ms = end
        else:
            merged.append(AudioSegment(start_ms=start, end_ms=end, kind=kind))
    return (
        [segment for segment in merged if segment.kind == "speech"],
        [segment for segment in merged if segment.kind == "silence"],
    )


def _statistics(samples: list[float], sample_rate: int) -> SignalStatistics:
    count = len(samples)
    rms = math.sqrt(sum(sample * sample for sample in samples) / count)
    peak = max(abs(sample) for sample in samples)
    clipping = sum(1 for sample in samples if abs(sample) >= CLIP_THRESHOLD)
    frame_len = max(1, int(sample_rate * FRAME_MS / 1000.0))
    frames = [samples[i:i + frame_len] for i in range(0, count, frame_len)]
    frame_rms = [math.sqrt(sum(value * value for value in frame) / len(frame)) for frame in frames]
    speech, silence = _segments(frame_rms, frame_len, sample_rate)
    return SignalStatistics(
        sample_count=count,
        sample_rate=sample_rate,
        duration_ms=round(count / sample_rate * 1000.0),
        rms=round(rms, 6),
        peak=round(peak, 6),
        clipping_count=clipping,
        frame_count=len(frames),
        speech_segments=speech,
        silence_segments=silence,
    )


def detect(request: DetectionRequest) -> DetectionResult:
    if not request.audio_id.strip():
        raise ValueError("Audio id required.")
    if request.sample_rate <= 0:
        raise ValueError("Sample rate must be positive.")
    if request.sample_width not in (1, 2):
        raise ValueError("Sample width must be 1 or 2 bytes.")
    raw = _input_bytes(request)
    if not raw:
        return DetectionResult(audio_id=request.audio_id)
    samples = _decode_pcm(raw, request.sample_width)
    if not samples:
        return DetectionResult(audio_id=request.audio_id, reason=REASON_NO_SAMPLES)
    return DetectionResult(
        audio_id=request.audio_id,
        statistics=_statistics(samples, request.sample_rate),
        status="computed",
        reason="PCM signal statistics computed from supplied samples; not a detection result.",
    )
