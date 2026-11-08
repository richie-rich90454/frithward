from pydantic import BaseModel


class GenerationRequest(BaseModel):
    prompt: str
    max_tokens: int = 256


class GenerationResult(BaseModel):
    text: str
    tokens: int


def generate(request: GenerationRequest) -> GenerationResult:
    if not request.prompt.strip():
        raise ValueError("Prompt required.")
    if request.max_tokens <= 0:
        raise ValueError("Max tokens must be positive.")
    return GenerationResult(text="", tokens=0)
