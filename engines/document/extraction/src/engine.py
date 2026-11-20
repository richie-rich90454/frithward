"""Deterministic structured-field extraction from caller-supplied text.

Emails, URLs, dates, postcodes and phone numbers are located with fixed regular
expressions. Offsets are into the supplied text. Confidence values are fixed
ranking heuristics, not calibrated probabilities. No other field types are
invented.
"""
import base64
import re
from pathlib import Path

from pydantic import BaseModel, Field

REASON_NO_INPUT = "No text or document bytes were supplied to extract fields from."
REASON_COMPUTED = (
    "Deterministic regex extraction from supplied text; confidence values are "
    "ranking heuristics, not calibrated probabilities."
)

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
URL = re.compile(r"https?://[^\s<>\"']+")
DATE_ISO = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
DATE_SLASH = re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b")
DATE_TEXT = re.compile(
    r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b",
    re.IGNORECASE,
)
POSTCODE_UK = re.compile(r"\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b")
POSTCODE_US = re.compile(r"\b\d{5}(?:-\d{4})?\b")
PHONE = re.compile(r"(?<!\w)(?:\+?\d[\d\s().\-]{5,}\d)(?!\w)")

LIMITATIONS = [
    "Only email, URL, date, postcode and phone patterns are recognized; other fields are not invented.",
    "Confidence values are fixed heuristics for ranking, not measured precision.",
    "Slash-separated dates are ambiguous (DD/MM vs MM/DD) and get lower confidence.",
    "Overlapping matches are suppressed in favour of the more specific field type.",
    "Extraction quality depends on the supplied text (for example OCR output).",
]


class ExtractedField(BaseModel):
    name: str
    value: str
    start: int
    end: int
    confidence: float


class ExtractionRequest(BaseModel):
    document_id: str
    text: str | None = None
    document_base64: str | None = None
    document_path: str | None = None


class ExtractionResult(BaseModel):
    document_id: str
    fields: dict[str, str] = Field(default_factory=dict)
    occurrences: list[ExtractedField] = Field(default_factory=list)
    status: str = "unavailable"
    reason: str = REASON_NO_INPUT
    method: str = "regex-field-extraction"
    limitations: list[str] = Field(default_factory=lambda: list(LIMITATIONS))


def _source_text(request: ExtractionRequest) -> str | None:
    if request.text is not None:
        return request.text
    if request.document_base64:
        raw = base64.b64decode(request.document_base64, validate=True)
        return raw.decode("utf-8", errors="replace")
    if request.document_path:
        return Path(request.document_path).read_text(encoding="utf-8", errors="replace")
    return None


def _find_fields(text: str) -> list[ExtractedField]:
    claimed: set[int] = set()
    found: list[ExtractedField] = []

    def add(pattern: re.Pattern[str], name: str, confidence: float) -> None:
        for match in pattern.finditer(text):
            value = match.group(0)
            end = match.end()
            if name == "url":
                trimmed = value.rstrip(".,;:!?)")
                end -= len(value) - len(trimmed)
                value = trimmed
            span = set(range(match.start(), end))
            if span & claimed:
                continue
            claimed.update(span)
            found.append(
                ExtractedField(
                    name=name,
                    value=value,
                    start=match.start(),
                    end=end,
                    confidence=confidence,
                )
            )

    add(EMAIL, "email", 0.9)
    add(URL, "url", 0.95)
    add(DATE_ISO, "date", 0.9)
    add(DATE_TEXT, "date", 0.8)
    add(DATE_SLASH, "date", 0.6)
    add(POSTCODE_UK, "postcode", 0.8)
    add(POSTCODE_US, "postcode", 0.7)
    for match in PHONE.finditer(text):
        digits = sum(ch.isdigit() for ch in match.group(0))
        if not 7 <= digits <= 15:
            continue
        span = set(range(match.start(), match.end()))
        if span & claimed:
            continue
        claimed.update(span)
        found.append(
            ExtractedField(
                name="phone",
                value=match.group(0),
                start=match.start(),
                end=match.end(),
                confidence=0.8 if digits >= 10 else 0.7,
            )
        )

    found.sort(key=lambda field: (field.start, field.name))
    return found


def extract(request: ExtractionRequest) -> ExtractionResult:
    if not request.document_id.strip():
        raise ValueError("Document id required.")
    text = _source_text(request)
    if not text:
        return ExtractionResult(document_id=request.document_id)
    occurrences = _find_fields(text)
    fields: dict[str, str] = {}
    for occurrence in occurrences:
        fields.setdefault(occurrence.name, occurrence.value)
    return ExtractionResult(
        document_id=request.document_id,
        fields=fields,
        occurrences=occurrences,
        status="computed",
        reason=REASON_COMPUTED,
    )
