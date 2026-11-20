"""PyTorch-backed synthetic image detection engine.

No detections are fabricated: a model artifact path and an input tensor must be
supplied at request time. Without a model path, detect() raises an explicit
error pointing at the model manifest.
"""
from __future__ import annotations

import base64
import struct
from pathlib import Path

import torch
from pydantic import BaseModel

NO_MODEL_MESSAGE = "No model artifact configured; see models/manifest.json"


class DetectionRequest(BaseModel):
    image_id: str
    model_path: str | None = None
    model_name: str = "unspecified"
    model_version: str = "unspecified"
    image_base64: str | None = None
    image_path: str | None = None


class DetectionResult(BaseModel):
    image_id: str
    model_name: str
    model_version: str
    scores: list[float] = []
    status: str = "ok"
    limitations: list[str] = []


def _load_model(path: str):
    artifact = Path(path)
    if not artifact.is_file():
        raise ValueError(f"Model artifact not found: {path}")
    try:
        return torch.jit.load(str(artifact), map_location="cpu")
    except (RuntimeError, TypeError):
        # The artifact is trusted: the caller chose the path.
        return torch.load(str(artifact), map_location="cpu", weights_only=False)


def _decode_tensor(request: DetectionRequest) -> torch.Tensor:
    if request.image_base64:
        raw = base64.b64decode(request.image_base64, validate=True)
    elif request.image_path:
        raw = Path(request.image_path).read_bytes()
    else:
        raise ValueError("No input tensor provided; supply image_base64 or image_path.")
    if len(raw) % 4:
        raise ValueError("Input tensor bytes must be a multiple of four (float32).")
    values = struct.unpack(f"<{len(raw) // 4}f", raw)
    return torch.tensor(values, dtype=torch.float32).reshape(1, -1)


def detect(request: DetectionRequest) -> DetectionResult:
    if not request.image_id.strip():
        raise ValueError("Image id required.")
    if not request.model_path:
        raise ValueError(NO_MODEL_MESSAGE)

    model = _load_model(request.model_path)
    model.eval()
    tensor = _decode_tensor(request)
    with torch.no_grad():
        output = model(tensor)
    if isinstance(output, (tuple, list)):
        output = output[0]
    scores = [float(value) for value in torch.as_tensor(output).flatten().tolist()]

    return DetectionResult(
        image_id=request.image_id,
        model_name=request.model_name,
        model_version=request.model_version,
        scores=scores,
        limitations=[
            "Raw model scores are evidence for review, not proof of manipulation.",
            "Scores come from the caller-supplied model; this engine provides no model.",
        ],
    )
