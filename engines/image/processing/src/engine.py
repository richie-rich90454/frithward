"""Deterministic geometry and optional raw-pixel operations.

With only source dimensions, the engine computes an aspect-preserving target
box (capped at scale 1.0). When raw RGB24 pixel bytes are supplied it also
performs a genuine stdlib pixel operation: Rec.601 grayscale conversion or a
top-left crop to the computed box. No image file formats are decoded.
"""
import base64

from pydantic import BaseModel, Field

LIMITATIONS = [
    "Geometry is computed from supplied dimensions; pixel transforms need raw RGB24 bytes.",
    "Scaling never enlarges beyond the source (scale is capped at 1.0).",
    "Source dimensions must be supplied to compute a real target box.",
    "Only raw RGB24 bytes are decoded; no PNG/JPEG file parsing is performed.",
    "Grayscale uses the integer Rec.601 luma formula; no colour management is applied.",
]

OPERATIONS = ("none", "grayscale", "crop")


class ResizeRequest(BaseModel):
    image_id: str
    max_width: int = 2048
    max_height: int = 2048
    source_width: int | None = None
    source_height: int | None = None
    pixels_base64: str | None = None
    operation: str = "none"


class ResizeResult(BaseModel):
    image_id: str
    width: int
    height: int
    scale: float = 1.0
    status: str = "computed"
    detail: str = ""
    limitations: list[str] = Field(default_factory=list)
    pixel_operation: str = "none"
    output_base64: str | None = None
    output_width: int | None = None
    output_height: int | None = None


def _transform_pixels(request: ResizeRequest, width: int, height: int) -> tuple[str, bytes, int, int]:
    if request.source_width is None or request.source_height is None:
        raise ValueError("Source dimensions are required for pixel operations.")
    if not request.pixels_base64:
        raise ValueError("pixels_base64 is required for pixel operations.")
    pixels = base64.b64decode(request.pixels_base64, validate=True)
    expected = request.source_width * request.source_height * 3
    if len(pixels) != expected:
        raise ValueError("Pixel byte length does not match source_width x source_height x 3.")

    if request.operation == "grayscale":
        gray = bytearray(request.source_width * request.source_height)
        for index in range(len(gray)):
            offset = index * 3
            r, g, b = pixels[offset], pixels[offset + 1], pixels[offset + 2]
            gray[index] = (77 * r + 150 * g + 29 * b) >> 8
        return "grayscale", bytes(gray), request.source_width, request.source_height

    cropped = bytearray(width * height * 3)
    for row in range(height):
        src_start = (row * request.source_width) * 3
        dst_start = (row * width) * 3
        cropped[dst_start:dst_start + width * 3] = pixels[src_start:src_start + width * 3]
    return "crop", bytes(cropped), width, height


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
    if request.operation not in OPERATIONS:
        raise ValueError("Operation must be 'none', 'grayscale' or 'crop'.")

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
    width = max(1, int(request.source_width * scale))
    height = max(1, int(request.source_height * scale))
    detail = "Aspect-preserving fit within the supplied bounds."
    limitations = list(LIMITATIONS)

    if request.operation != "none":
        operation, output, output_width, output_height = _transform_pixels(request, width, height)
        detail += f" Applied {operation} to supplied RGB24 pixels."
        return ResizeResult(
            image_id=request.image_id,
            width=width,
            height=height,
            scale=round(scale, 6),
            status="computed",
            detail=detail,
            limitations=limitations,
            pixel_operation=operation,
            output_base64=base64.b64encode(output).decode("ascii"),
            output_width=output_width,
            output_height=output_height,
        )

    return ResizeResult(
        image_id=request.image_id,
        width=width,
        height=height,
        scale=round(scale, 6),
        status="computed",
        detail=detail,
        limitations=limitations,
    )
