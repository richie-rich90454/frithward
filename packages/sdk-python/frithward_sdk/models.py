from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

ScamChannel = Literal["message", "url", "qr", "image", "audio"]
Severity = Literal["low", "medium", "high"]
ErrorCode = Literal[
    "VALIDATION_FAILED",
    "NOT_FOUND",
    "CONFLICT",
    "CANCELLED",
    "PROCESSING_FAILED",
    "EXTERNAL_UNAVAILABLE",
    "UNAUTHORIZED",
]
MediaKind = Literal["audio", "image", "video", "document", "text"]


class ScamIndicator(BaseModel):
    id: str
    label: str
    detail: str
    severity: Severity


class ScamAnalysisResult(BaseModel):
    id: str
    channel: ScamChannel
    indicators: list[ScamIndicator]
    summary: str
    nextSteps: list[str]
    limitations: list[str]
    createdAt: str


class AnalyzeMessageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)


class EnqueueResponse(BaseModel):
    jobId: str


class MediaAsset(BaseModel):
    id: str
    kind: MediaKind
    fileName: str
    sizeBytes: int = Field(ge=0)
    mimeType: str
    sha256: str
    createdAt: str


class CaptionSegmentDto(BaseModel):
    id: str
    startMs: int = Field(ge=0)
    endMs: int = Field(gt=0)
    text: str
    speakerId: str | None


class CaptionProjectDto(BaseModel):
    id: str
    title: str
    language: str
    segments: list[CaptionSegmentDto]


class CaptionSegmentInput(BaseModel):
    id: str = Field(min_length=1)
    startMs: int = Field(ge=0)
    endMs: int = Field(gt=0)
    text: str = Field(min_length=1)
    speakerId: str | None = None


class CaptionExportRequest(BaseModel):
    projectId: str = Field(min_length=1)
    title: str = Field(min_length=1)
    language: str = Field(min_length=1)
    format: Literal["vtt", "srt"]
    segments: list[CaptionSegmentInput] = Field(max_length=1000)


class HealthResponse(BaseModel):
    status: str
    service: str
    database: Literal["connected", "unavailable", "not-configured"]


class SessionUser(BaseModel):
    id: str
    email: str


class SessionResponse(BaseModel):
    authenticated: bool
    user: SessionUser | None


class JobStatusRecord(BaseModel):
    jobId: str
    status: Literal["queued", "running", "completed", "failed"]
    result: Any = None
    error: str | None


class PrivacyFinding(BaseModel):
    id: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    detail: str
    remediation: str


class PrivacyInspectResponse(BaseModel):
    findings: list[PrivacyFinding]
    safe: bool
    remediation: list[str]


class ProvenanceInspectRequest(BaseModel):
    id: str = Field(min_length=1)
    signatureStatus: Literal["valid", "invalid", "missing"]
    signer: str | None
    assetSha256: str = Field(min_length=1)
    manifest: str | None


class ProvenanceInspectResponse(BaseModel):
    description: str


class ApiError(BaseModel):
    code: ErrorCode
    message: str
    cause: str | None = None
