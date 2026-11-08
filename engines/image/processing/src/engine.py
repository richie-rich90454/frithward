from pydantic import BaseModel


class ResizeRequest(BaseModel):
    image_id: str
    max_width: int = 2048
    max_height: int = 2048


class ResizeResult(BaseModel):
    image_id: str
    width: int
    height: int


def process(request: ResizeRequest) -> ResizeResult:
    if not request.image_id.strip():
        raise ValueError("Image id required.")
    if request.max_width <= 0 or request.max_height <= 0:
        raise ValueError("Bounds must be positive.")
    return ResizeResult(image_id=request.image_id, width=request.max_width, height=request.max_height)
