from pydantic import BaseModel, Field

REASON = "No local text generation model is configured in this repository."


class GenerationRequest(BaseModel):
    prompt: str
    max_tokens: int = 256
    model_path: str | None = None


class GenerationResult(BaseModel):
    text: str = ""
    tokens: int = 0
    status: str = "unavailable"
    reason: str = REASON
    limitations: list[str] = Field(
        default_factory=lambda: [
            "No tokens are generated; empty output means unavailable, not an empty answer.",
            "A supplied model_path is not executed: no local inference runtime is wired.",
            "Real generation requires a model artifact, license review, and evaluation.",
        ]
    )


def generate(request: GenerationRequest) -> GenerationResult:
    if not request.prompt.strip():
        raise ValueError("Prompt required.")
    if request.max_tokens <= 0:
        raise ValueError("Max tokens must be positive.")
    return GenerationResult(text="", tokens=0)
