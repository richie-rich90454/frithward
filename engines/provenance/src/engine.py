import json
from typing import Any

from pydantic import BaseModel, Field


class ProvenanceRequest(BaseModel):
    asset_id: str
    manifest: str | None = None


class TransformationStep(BaseModel):
    action: str
    actor: str | None = None
    timestamp: str | None = None
    detail: str | None = None


class ProvenanceResult(BaseModel):
    asset_id: str
    status: str
    detail: str
    transformations: list[TransformationStep] = Field(default_factory=list)


def _optional_text(value: Any, field: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise TypeError(f"Transformation {field} must be a string or null.")
    return value


def parse_transformations(manifest: str | None) -> list[TransformationStep]:
    """Read only transformation entries actually supplied in the manifest JSON."""
    if not manifest:
        return []
    try:
        payload = json.loads(manifest)
    except json.JSONDecodeError as error:
        raise ValueError("Manifest must be valid JSON.") from error
    if not isinstance(payload, dict):
        raise TypeError("Manifest must be a JSON object.")
    raw = payload.get("transformations", [])
    if not isinstance(raw, list):
        raise TypeError("transformations must be a list.")
    steps: list[TransformationStep] = []
    for index, item in enumerate(raw):
        if not isinstance(item, dict):
            raise TypeError(f"Transformation at index {index} must be an object.")
        action = item.get("action")
        if not isinstance(action, str) or not action.strip():
            raise ValueError(f"Transformation at index {index} requires a non-empty action.")
        steps.append(
            TransformationStep(
                action=action,
                actor=_optional_text(item.get("actor"), "actor"),
                timestamp=_optional_text(item.get("timestamp"), "timestamp"),
                detail=_optional_text(item.get("detail"), "detail"),
            )
        )
    return steps


def verify(request: ProvenanceRequest) -> ProvenanceResult:
    if not request.asset_id.strip():
        raise ValueError("Asset id required.")
    transformations = parse_transformations(request.manifest)
    if request.manifest:
        return ProvenanceResult(
            asset_id=request.asset_id,
            status="present",
            detail="Manifest present; validate signature separately.",
            transformations=transformations,
        )
    return ProvenanceResult(
        asset_id=request.asset_id,
        status="missing",
        detail="No manifest found; provenance unavailable.",
    )
