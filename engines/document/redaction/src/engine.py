"""Deterministic text redaction.

Literal terms are matched in the supplied text and replaced with a fixed
marker. Every replacement is reported with its original offsets so a caller can
audit the result. Nothing is inferred and no model is used.
"""
import base64
import re
from pathlib import Path

from pydantic import BaseModel, Field

LIMITATIONS = [
    "Terms are matched literally, not semantically or as regular expressions.",
    "Matching is case-insensitive by default; set case_sensitive to change it.",
    "Overlapping matches are resolved by earliest start, then longest term.",
    "No OCR is performed: images and scanned documents are out of scope.",
]


class RedactionRequest(BaseModel):
    document_id: str
    terms: list[str] = Field(default_factory=list)
    text: str = ""
    path: str | None = None
    replacement: str = "[REDACTED]"
    case_sensitive: bool = False


class RedactionSpan(BaseModel):
    start: int
    end: int
    term: str
    replacement: str


class RedactionResult(BaseModel):
    document_id: str
    redacted_count: int = 0
    redacted_text: str = ""
    redacted_bytes_b64: str = ""
    spans: list[RedactionSpan] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


def _source_text(request: RedactionRequest) -> str:
    if request.text:
        return request.text
    if request.path:
        return Path(request.path).read_text(encoding="utf-8")
    return ""


def _find_spans(
    text: str, terms: list[str], case_sensitive: bool
) -> list[tuple[int, int, str]]:
    flags = 0 if case_sensitive else re.IGNORECASE
    matches: list[tuple[int, int, str]] = []
    for term in terms:
        if not term:
            continue
        for match in re.finditer(re.escape(term), text, flags):
            matches.append((match.start(), match.end(), term))
    matches.sort(key=lambda item: (item[0], -(item[1] - item[0])))
    chosen: list[tuple[int, int, str]] = []
    occupied_until = 0
    for start, end, term in matches:
        if start < occupied_until:
            continue
        chosen.append((start, end, term))
        occupied_until = end
    return chosen


def redact(request: RedactionRequest) -> RedactionResult:
    if not request.document_id.strip():
        raise ValueError("Document id required.")
    text = _source_text(request)
    spans = _find_spans(text, request.terms, request.case_sensitive)

    chunks: list[str] = []
    cursor = 0
    reported: list[RedactionSpan] = []
    for start, end, term in spans:
        chunks.append(text[cursor:start])
        chunks.append(request.replacement)
        reported.append(
            RedactionSpan(
                start=start, end=end, term=term, replacement=request.replacement
            )
        )
        cursor = end
    chunks.append(text[cursor:])
    redacted_text = "".join(chunks)

    return RedactionResult(
        document_id=request.document_id,
        redacted_count=len(reported),
        redacted_text=redacted_text,
        redacted_bytes_b64=base64.b64encode(redacted_text.encode("utf-8")).decode("ascii"),
        spans=reported,
        limitations=list(LIMITATIONS),
    )
