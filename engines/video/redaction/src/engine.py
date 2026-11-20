"""Video redaction surface with a deterministic region manifest.

No pixels are changed: the engine stays explicitly unavailable. It does build
a real manifest of the requested regions, validating rectangle syntax and
hashing the request so a caller has a reproducible record of what was asked.
"""
import hashlib
import json

from pydantic import BaseModel, Field

REASON = "No local video redaction pipeline or region detector is configured in this repository."

LIMITATIONS = [
    "Requested regions are not applied; no redaction is claimed.",
    "Real redaction requires a configured pipeline and frame-accurate validation.",
    "The manifest validates and records requested regions; it changes no pixels.",
    "Rectangles must be 'x1,y1,x2,y2' integers with x2>x1 and y2>y1.",
]


class RedactionRequest(BaseModel):
    video_id: str
    regions: list[str] = []
    video_path: str | None = None


class ManifestItem(BaseModel):
    label: str
    kind: str
    valid: bool


class RedactionManifest(BaseModel):
    items: list[ManifestItem]
    region_count: int
    sha256: str


class RedactionResult(BaseModel):
    video_id: str
    redacted_regions: list[str] = Field(default_factory=list)
    manifest: RedactionManifest | None = None
    status: str = "unavailable"
    reason: str = REASON
    limitations: list[str] = Field(default_factory=lambda: list(LIMITATIONS))


def _manifest_item(region: str) -> ManifestItem:
    label = region.strip()
    try:
        values = [int(part.strip()) for part in label.split(",")]
    except ValueError:
        return ManifestItem(label=label, kind="label", valid=bool(label))
    if len(values) != 4:
        return ManifestItem(label=label, kind="label", valid=bool(label))
    x1, y1, x2, y2 = values
    return ManifestItem(label=label, kind="rectangle", valid=x2 > x1 and y2 > y1)


def redact(request: RedactionRequest) -> RedactionResult:
    if not request.video_id.strip():
        raise ValueError("Video id required.")
    labels = sorted(region.strip() for region in request.regions if region.strip())
    digest = hashlib.sha256(
        json.dumps({"video_id": request.video_id, "regions": labels}, sort_keys=True).encode("utf-8")
    ).hexdigest()
    manifest = RedactionManifest(
        items=[_manifest_item(region) for region in request.regions],
        region_count=len(labels),
        sha256=digest,
    )
    return RedactionResult(video_id=request.video_id, manifest=manifest)
