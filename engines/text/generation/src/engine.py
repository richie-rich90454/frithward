"""Deterministic, rule-based text generation from a supplied prompt.

This engine is not a language model. It produces either an extractive summary
(ranked source sentences) or a bullet list derived only from the prompt text.
Output is labelled rule-based so callers never mistake it for model inference.
"""
import re
from collections import Counter

from pydantic import BaseModel, Field

REASON_MODEL = "No local text generation model is configured in this repository."
REASON_NO_SENTENCES = "The prompt contained no extractable sentences."
METHOD = "rule-based-extractive"
MODES = ("summary", "bullets")

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "at", "for",
    "with", "is", "are", "was", "were", "be", "been", "it", "its", "this",
    "that", "these", "those", "as", "by", "from",
}

LIMITATIONS = [
    "Output is rule-based extraction, not language-model inference.",
    "No fluency, originality or factuality is guaranteed; text is copied from the prompt.",
    "A supplied model_path is not executed: no local inference runtime is wired.",
    "Sentence scoring uses term frequency and is a ranking heuristic, not a learned model.",
    "The token budget counts whitespace-delimited words, not model subword tokens.",
]


class GenerationRequest(BaseModel):
    prompt: str
    max_tokens: int = 256
    model_path: str | None = None
    mode: str = "summary"


class GenerationResult(BaseModel):
    text: str = ""
    tokens: int = 0
    status: str = "computed"
    reason: str = "Deterministic rule-based generation; no language model was run."
    method: str = METHOD
    limitations: list[str] = Field(default_factory=lambda: list(LIMITATIONS))


def _sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
    return [part.strip() for part in parts if part.strip()]


def _words(sentence: str) -> list[str]:
    return [
        word for word in re.findall(r"[a-z0-9']+", sentence.lower())
        if word not in STOPWORDS and len(word) > 2
    ]


def generate(request: GenerationRequest) -> GenerationResult:
    if not request.prompt.strip():
        raise ValueError("Prompt required.")
    if request.max_tokens <= 0:
        raise ValueError("Max tokens must be positive.")
    if request.mode not in MODES:
        raise ValueError("Mode must be 'summary' or 'bullets'.")

    sentences = _sentences(request.prompt)
    if not sentences:
        return GenerationResult(
            status="unavailable",
            reason=REASON_NO_SENTENCES,
        )

    term_frequency = Counter(word for sentence in sentences for word in _words(sentence))
    scored = []
    for index, sentence in enumerate(sentences):
        score = sum(term_frequency[word] for word in _words(sentence))
        scored.append((index, sentence, score))
    ranked = sorted(scored, key=lambda item: (-item[2], item[0]))

    budget = request.max_tokens
    chosen: list[tuple[int, str]] = []
    used = 0
    for index, sentence, _ in ranked:
        count = len(sentence.split())
        if used + count > budget:
            continue
        chosen.append((index, sentence))
        used += count
    if not chosen:
        first = sentences[0].split()[:budget]
        chosen = [(0, " ".join(first))]
    chosen.sort(key=lambda item: item[0])
    output = [sentence for _, sentence in chosen]
    text = "\n".join(f"- {sentence}" for sentence in output) if request.mode == "bullets" else " ".join(output)

    return GenerationResult(
        text=text,
        tokens=len(text.split()),
        status="computed",
    )
