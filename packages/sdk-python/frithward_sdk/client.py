from __future__ import annotations

from typing import Any, Self
from urllib.parse import quote

import httpx
from pydantic import BaseModel, ValidationError

from .models import (
    AnalyzeMessageRequest,
    ApiError,
    EnqueueResponse,
    HealthResponse,
    JobStatusRecord,
    ScamAnalysisResult,
    SessionResponse,
)

AnalyzeMessageResult = ScamAnalysisResult | EnqueueResponse


class FrithwardError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code


class FrithwardClient:
    def __init__(self, base_url: str, *, transport: httpx.BaseTransport | None = None) -> None:
        base_url = base_url.strip()
        if not base_url:
            raise ValueError("Base URL required.")
        normalized = base_url.rstrip("/")
        if transport is None:
            self._client = httpx.Client(base_url=normalized)
        else:
            self._client = httpx.Client(base_url=normalized, transport=transport)

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()

    def close(self) -> None:
        self._client.close()

    def health(self) -> HealthResponse:
        return self._parse(HealthResponse, self._request("GET", "/health"))

    def analyze_text(self, text: str) -> AnalyzeMessageResult:
        body = AnalyzeMessageRequest(text=text)
        response = self._request("POST", "/api/scam/message", json_body=body.model_dump())
        if response.status_code == 202:
            return self._parse(EnqueueResponse, response)
        return self._parse(ScamAnalysisResult, response)

    def get_session(self) -> SessionResponse:
        return self._parse(SessionResponse, self._request("GET", "/api/auth/session"))

    def get_job(self, job_id: str) -> JobStatusRecord:
        path = f"/api/jobs/{quote(job_id, safe='')}"
        return self._parse(JobStatusRecord, self._request("GET", path))

    def _request(self, method: str, path: str, *, json_body: Any = None) -> httpx.Response:
        response = self._client.request(method, path, json=json_body)
        if not response.is_success:
            self._raise_error(response)
        return response

    @staticmethod
    def _raise_error(response: httpx.Response) -> None:
        code = "HTTP_ERROR"
        message = f"Request failed with status {response.status_code}."
        try:
            error = ApiError.model_validate(response.json())
        except (ValueError, ValidationError):
            pass
        else:
            code = error.code
            message = error.message
        raise FrithwardError(response.status_code, code, message)

    @staticmethod
    def _parse[T: BaseModel](model: type[T], response: httpx.Response) -> T:
        try:
            return model.model_validate(response.json())
        except (ValueError, ValidationError) as exc:
            raise FrithwardError(
                response.status_code, "INVALID_RESPONSE", f"Unexpected response: {exc}"
            ) from exc
