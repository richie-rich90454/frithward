from pydantic import BaseModel


class LanguageRequest(BaseModel):
    text: str
    source: str = "auto"


class LanguageResult(BaseModel):
    language: str
    text: str


def detect(request: LanguageRequest) -> LanguageResult:
    if not request.text.strip():
        raise ValueError("Text required.")
    lowered = request.text.lower()
    if "hola" in lowered:
        return LanguageResult(language="es", text=request.text)
    return LanguageResult(language="en", text=request.text)
