"""Reviewed-pattern scam text analyzer.

Local and deterministic: indicators come from a reviewed pattern table, not a
model. Results are evidence for a human reviewer, never a verdict.
"""
import re
from urllib.parse import urlsplit

from pydantic import BaseModel, Field

LIMITATIONS = [
    "Rule-based patterns cannot establish intent or proof of fraud.",
    "Patterns are English-keyword oriented; other languages are not covered.",
    "An absent indicator is not evidence that a message is legitimate.",
    "Matches are case-insensitive substrings and may produce false positives.",
]

# Brand spellings seen in lookalike domains (digit/homoglyph substitutions).
_BRAND_TYPOS = (
    "paypa1", "paypai", "paypal-secure", "micros0ft", "g00gle", "g00g1e",
    "app1e", "amaz0n", "netf1ix", "fac3book", "instagr4m", "bank-of-amer1ca",
)
_BRANDS = (
    "bank", "paypal", "google", "apple", "microsoft", "amazon", "netflix",
    "facebook", "instagram", "whatsapp", "gov",
)
_DOMAIN_RE = re.compile(r"\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b", re.I)
_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^\s)]+)\)", re.I)
_HTML_LINK_RE = re.compile(
    r"<a\b[^>]*href=[\"'](https?://[^\"']+)[\"'][^>]*>(.*?)</a>", re.I | re.S
)

_PATTERNS: tuple[tuple[str, str, str, re.Pattern[str]], ...] = (
    (
        "urgency",
        "medium",
        "Time pressure is a common coercion tactic.",
        re.compile(
            r"\b(urgent|urgently|asap|immediately|act now|right now|"
            r"within \d+ (hours?|minutes?)|deadline|expires? (today|soon)|"
            r"last chance|final notice)\b",
            re.I,
        ),
    ),
    (
        "payment demand",
        "high",
        "Requests for payment or transfers are a common loss vector.",
        re.compile(
            r"\b(wire transfer|bank transfer|send money|western union|moneygram|"
            r"gift card|giftcard|prepaid card|bitcoin|cryptocurrency|"
            r"zelle|cash ?app|paypal friends)\b",
            re.I,
        ),
    ),
    (
        "credential request",
        "high",
        "Requests for passwords or codes enable account takeover.",
        re.compile(
            r"\b(password|passphrase|verification code|otp|one[- ]time "
            r"(code|password)|2fa code|security code|pin code|"
            r"login credentials|log in with your)\b",
            re.I,
        ),
    ),
)


class Indicator(BaseModel):
    name: str
    severity: str
    rationale: str
    matched_text: str | None = None


class ScamText(BaseModel):
    text: str
    # Retained for existing callers: names of the matched findings.
    indicators: list[str] = Field(default_factory=list)
    findings: list[Indicator] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


def _host(value: str) -> str:
    host = urlsplit(value if "://" in value else f"//{value}").hostname or ""
    return host.lower()


def _link_findings(text: str) -> list[Indicator]:
    findings: list[Indicator] = []
    links: list[tuple[str, str]] = [
        (anchor, url) for anchor, url in _MD_LINK_RE.findall(text)
    ]
    links.extend((re.sub(r"<[^>]+>", "", anchor).strip(), url)
                 for url, anchor in _HTML_LINK_RE.findall(text))
    for anchor, url in links:
        target = _host(url)
        visible = _DOMAIN_RE.search(anchor)
        named_brands = [b for b in _BRANDS if re.search(rf"\b{b}\b", anchor, re.I)]
        unrelated_brands = [b for b in named_brands if b not in target]
        if (visible and target and _host(visible.group(0)) != target) or unrelated_brands:
            rationale = "Visible link text disagrees with the link target."
            if unrelated_brands:
                rationale = "Link text names a brand absent from the target domain."
            findings.append(
                Indicator(
                    name="mismatched link",
                    severity="medium",
                    rationale=rationale,
                    matched_text=f"{anchor} -> {url}",
                )
            )
    return findings


def _domain_findings(text: str) -> list[Indicator]:
    findings: list[Indicator] = []
    for match in _DOMAIN_RE.finditer(text):
        host = _host(match.group(0))
        if any(typo in host for typo in _BRAND_TYPOS):
            findings.append(
                Indicator(
                    name="lookalike domain",
                    severity="high",
                    rationale="Domain resembles a known brand with a substituted character.",
                    matched_text=match.group(0),
                )
            )
    return findings


def _find_indicators(text: str) -> list[Indicator]:
    findings: list[Indicator] = []
    for name, severity, rationale, pattern in _PATTERNS:
        match = pattern.search(text)
        if match:
            findings.append(
                Indicator(
                    name=name,
                    severity=severity,
                    rationale=rationale,
                    matched_text=match.group(0),
                )
            )
    findings.extend(_link_findings(text))
    findings.extend(_domain_findings(text))
    return findings


def analyze_scam_text(payload: ScamText) -> ScamText:
    if not payload.text.strip():
        raise ValueError("Text required.")
    findings = _find_indicators(payload.text)
    return ScamText(
        text=payload.text,
        indicators=[finding.name for finding in findings],
        findings=findings,
        limitations=list(LIMITATIONS),
    )
