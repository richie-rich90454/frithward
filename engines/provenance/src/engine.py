from pydantic import BaseModel


class ProvenanceRequest(BaseModel):
    asset_id: str
    manifest: str | None = None


class ProvenanceResult(BaseModel):
    asset_id: str
    status: str
    detail: str


def verify(request: ProvenanceRequest) -> ProvenanceResult:
    if not request.asset_id.strip():
        raise ValueError("Asset id required.")
    if request.manifest:
        return ProvenanceResult(asset_id=request.asset_id, status="present", detail="Manifest present; validate signature separately.")
    return ProvenanceResult(asset_id=request.asset_id, status="missing", detail="No manifest found; provenance unavailable.")
