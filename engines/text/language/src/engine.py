"""Honest language heuristic: Unicode script detection plus stopword scoring.

This is a small deterministic heuristic, not a machine-learning classifier.
It returns a confidence score that is a heuristic ratio, not a calibrated
probability, and states its limitations on every result.
"""
import re

from pydantic import BaseModel, Field

LANGUAGES = ("en", "zh", "es", "fr", "de", "ar", "hi", "ja")

STOPWORDS = {
    "en": frozenset(
        "the and is are was were be been being to of in on for with that this it as "
        "at by from or but not you your we our i he she they them do does did have "
        "has had will would can could should what when where who how all any some "
        "more most hello world thanks please".split()
    ),
    "es": frozenset(
        "el la los las de que y en un una es por con para no se su sus lo al del "
        "como mas pero porque si hay ser esta estan fue fueron este esta estos "
        "estas hola mundo buenos dias gracias favor senor senora".split()
    ),
    "fr": frozenset(
        "le la les de des du un une et est sont etait etaient en pour avec sur "
        "dans que qui quoi comment ne pas ce cet cette ces au aux par plus mais "
        "ou ou bonjour monde merci s il vous plait".split()
    ),
    "de": frozenset(
        "der die das den dem des ein eine einen einem einer und oder aber ist sind "
        "war waren wird werden wurde wurden in im am an auf mit von zu fur als auch "
        "nicht kein keine bei nach uber sich es er sie wir ihr hallo welt danke "
        "bitte".split()
    ),
}

_TOKEN_RE = re.compile(r"[a-zà-ÿ]+")

LIMITATIONS = [
    "Heuristic only: Unicode script ranges and a small stopword list, not a model.",
    "Confidence is a match ratio, not a calibrated probability.",
    "Short or unusual text can be misclassified; 'und' means no usable signal.",
    "Chinese text without kana is reported as zh; Japanese is detected via kana.",
]


class LanguageRequest(BaseModel):
    text: str
    source: str = "auto"


class LanguageResult(BaseModel):
    language: str
    text: str
    source: str = "auto"
    confidence: float = 0.0
    method: str = "none"
    matched_tokens: int = 0
    limitations: list[str] = Field(default_factory=list)


def _script_counts(text: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for char in text:
        code = ord(char)
        if 0x3040 <= code <= 0x30FF or 0x31F0 <= code <= 0x31FF:
            name = "ja"
        elif 0x4E00 <= code <= 0x9FFF:
            name = "zh"
        elif 0x0600 <= code <= 0x06FF:
            name = "ar"
        elif 0x0900 <= code <= 0x097F:
            name = "hi"
        elif 0x0041 <= code <= 0x007A or 0x00C0 <= code <= 0x024F:
            name = "latin"
        else:
            continue
        counts[name] = counts.get(name, 0) + 1
    return counts


def detect(request: LanguageRequest) -> LanguageResult:
    if not request.text.strip():
        raise ValueError("Text required.")

    counts = _script_counts(request.text)
    for language in ("ja", "zh", "ar", "hi"):
        if counts.get(language, 0):
            return LanguageResult(
                language=language,
                text=request.text,
                source=request.source,
                confidence=0.9,
                method="script",
                limitations=list(LIMITATIONS),
            )

    tokens = _TOKEN_RE.findall(request.text.lower())
    scores = {
        language: sum(1 for token in tokens if token in STOPWORDS[language])
        for language in ("en", "es", "fr", "de")
    }
    best = max(scores, key=lambda language: scores[language])
    if scores[best] == 0:
        return LanguageResult(
            language="und",
            text=request.text,
            source=request.source,
            confidence=0.0,
            method="none",
            limitations=list(LIMITATIONS),
        )
    confidence = round(min(0.85, scores[best] / max(1, len(tokens))), 2)
    return LanguageResult(
        language=best,
        text=request.text,
        source=request.source,
        confidence=confidence,
        method="stopwords",
        matched_tokens=scores[best],
        limitations=list(LIMITATIONS),
    )
