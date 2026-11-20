"""OCR surface that resolves a locally installed tesseract binary read-only.

If a tesseract binary is already present on PATH, supplied document bytes are
written to a temporary file and recognized with a subprocess. No binary is
installed by this engine. If none is present, the engine stays unavailable and
reports the exact check it performed.
"""
import base64
import shutil
import subprocess
import tempfile
from pathlib import Path

from pydantic import BaseModel, Field

REASON_NO_TESSERACT = "No local OCR engine or model is configured in this repository."
TESSERACT_CHECK = "shutil.which('tesseract')"

LIMITATIONS = [
    "Tesseract must already exist on PATH; this engine never installs it.",
    "Empty text means no recognition was performed, not a blank document.",
    "Tesseract output contains errors and requires review before downstream use.",
    "Language data must be installed separately for non-default languages.",
]


class OcrRequest(BaseModel):
    document_id: str
    language: str = "en"
    document_base64: str | None = None
    document_path: str | None = None


class OcrResult(BaseModel):
    document_id: str
    text: str = ""
    status: str = "unavailable"
    reason: str = REASON_NO_TESSERACT
    tesseract_path: str | None = None
    check: str = TESSERACT_CHECK
    limitations: list[str] = Field(default_factory=lambda: list(LIMITATIONS))


def resolve_tesseract() -> str | None:
    """Read-only host check; returns the tesseract path or None."""
    return shutil.which("tesseract")


def _input_bytes(request: OcrRequest) -> bytes | None:
    if request.document_base64:
        return base64.b64decode(request.document_base64, validate=True)
    if request.document_path:
        return Path(request.document_path).read_bytes()
    return None


def _unavailable(request: OcrRequest, path: str | None, reason: str) -> OcrResult:
    return OcrResult(
        document_id=request.document_id,
        reason=reason,
        tesseract_path=path,
    )


def recognize(request: OcrRequest) -> OcrResult:
    if not request.document_id.strip():
        raise ValueError("Document id required.")

    path = resolve_tesseract()
    if path is None:
        return _unavailable(
            request,
            None,
            f"Tesseract binary not found via {TESSERACT_CHECK}; no local OCR engine available.",
        )

    data = _input_bytes(request)
    if not data:
        return _unavailable(request, path, "No document bytes were supplied to recognize.")

    with tempfile.NamedTemporaryFile(suffix=".bin", delete=False) as handle:
        handle.write(data)
        temporary = handle.name
    try:
        completed = subprocess.run(
            [path, temporary, "stdout", "-l", request.language],
            capture_output=True,
            check=True,
        )
        text = completed.stdout.decode("utf-8", errors="replace")
    except (subprocess.CalledProcessError, OSError) as exc:
        return _unavailable(request, path, f"Tesseract invocation failed: {exc}")
    finally:
        Path(temporary).unlink(missing_ok=True)

    return OcrResult(
        document_id=request.document_id,
        text=text,
        status="computed",
        reason="Text recognized by the locally resolved tesseract binary.",
        tesseract_path=path,
    )
