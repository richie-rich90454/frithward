"""Deterministic aspect-preserving resize geometry from supplied dimensions.

No pixels are transformed: the engine validates inputs and computes the target
box a caller should use. When source dimensions are absent it says so instead
of pretending to have measured them.
"""
from pydantic import BaseModel, Field

LIMITATIONS = [
    "Geometry is computed from supplied dimensions; no pixels are transformed.",
    "Scaling never enlarges beyond the source (scale is capped at 1.0).",
    "Source dimensions must be supplied to compute a real target box.",
]


class ResizeRequest(BaseModel):
    image_id: str
    max_width: int = 2048
    max_height: int = 2048
    source_width: int | None = None
    source_height: int | None = None


class ResizeResult(BaseModel):
    image_id: str
    width: int
    height: int
    scale: float = 1.0
    status: str = "computed"
    detail: str = ""
    limitations: list[str] = Field(default_factory=list)


def process(request: ResizeRequest) -> ResizeResult:
    if not request.image_id.strip():
        raise ValueError("Image id required.")
    if request.max_width <= 0 or request.max_height <= 0:
        raise ValueError("Bounds must be positive.")
    if (request.source_width is None) != (request.source_height is None):
        raise ValueError("Supply both source_width and source_height.")
    if request.source_width is not None and request.source_width <= 0:
        raise ValueError("Source dimensions must be positive.")
    if request.source_height is not None and request.source_height <= 0:
        raise ValueError("Source dimensions must be positive.")

    if request.source_width is None:
        return ResizeResult(
            image_id=request.image_id,
            width=request.max_width,
            height=request.max_height,
            status="source_unavailable",
            detail="Source dimensions not supplied; returning bounds only.",
            limitations=list(LIMITATIONS),
        )

    scale = min(
        1.0,
        request.max_width / request.source_width,
        request.max_height / request.source_height,
    )
    return ResizeResult(
        image_id=request.image_id,
        width=max(1, int(request.source_width * scale)),
        height=max(1, int(request.source_height * scale)),
        scale=round(scale, 6),
        status="computed",
        detail="Aspect-preserving fit within the supplied bounds.",
        limitations=list(LIMITATIONS),
    )
