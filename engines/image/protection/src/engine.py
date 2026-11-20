"""Image protection surface with deterministic input preprocessing.

No protection transform is applied: the engine stays explicitly unavailable.
It does compute a real content hash and byte length, and reads the PNG IHDR
dimensions when the supplied bytes are a PNG, so callers can validate input.
"""
import base64
import hashlib
import struct
from pathlib import Path

from pydantic import BaseModel, Field

REASON = "No local image watermarking or protection model is configured in this repository."
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

LIMITATIONS = [
    "No watermark or protection is applied; no success is claimed.",
    "Real protection requires a configured model and robustness evaluation.",
    "Preprocessing computes a hash and optional PNG header dimensions; it does not modify the image.",
    "Dimensions are read only for PNG input; other formats report 'unknown'.",
]


class ProtectionRequest(BaseModel):
    image_id: str
    image_base64: str | None = None
    image_path: str | None = None


class ProtectionPreflight(BaseModel):
    sha256: str
    byte_length: int
    detected_format: str
    width: int | None = None
    height: int | None = None


class ProtectionResult(BaseModel):
    image_id: str
    protected: bool = False
    preprocessing: ProtectionPreflight | None = None
    status: str = "unavailable"
    reason: str = REASON
    limitations: list[str] = Field(default_factory=lambda: list(LIMITATIONS))


def protect(request: ProtectionRequest) -> ProtectionResult:
    if not request.image_id.strip():
        raise ValueError("Image id required.")
    if request.image_base64:
        raw = base64.b64decode(request.image_base64, validate=True)
    elif request.image_path:
        raw = Path(request.image_path).read_bytes()
    else:
        raw = b""
    preflight = None
    if raw:
        is_png = raw.startswith(PNG_SIGNATURE)
        width = height = None
        if is_png and len(raw) >= 24 and raw[12:16] == b"IHDR":
            width, height = struct.unpack(">II", raw[16:24])
        preflight = ProtectionPreflight(
            sha256=hashlib.sha256(raw).hexdigest(),
            byte_length=len(raw),
            detected_format="png" if is_png else "unknown",
            width=width,
            height=height,
        )
    return ProtectionResult(image_id=request.image_id, preprocessing=preflight)
