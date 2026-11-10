from pydantic import BaseModel


class ScamText(BaseModel):
    text: str
    indicators: list[str] = []


def analyze_scam_text(payload: ScamText) -> ScamText:
    if not payload.text.strip():
        raise ValueError("Text required.")
    indicators = []
    lowered = payload.text.lower()
    if "password" in lowered:
        indicators.append("credential request")
    return ScamText(text=payload.text, indicators=indicators)
