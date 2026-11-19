from collections.abc import Callable

import httpx
import pytest
from frithward_sdk import FrithwardClient, FrithwardError
from frithward_sdk.models import EnqueueResponse
from pydantic import ValidationError

SCAM_RESULT = {
    "id": "a-1",
    "channel": "message",
    "indicators": [
        {"id": "i-1", "label": "Urgency", "detail": "Act now.", "severity": "high"},
    ],
    "summary": "Likely scam.",
    "nextSteps": ["Do not reply."],
    "limitations": ["Heuristic only."],
    "createdAt": "2026-01-01T00:00:00.000Z",
}


def json_response(payload: object, status: int = 200) -> httpx.Response:
    return httpx.Response(status, json=payload)


def make_client(
    handler: Callable[[httpx.Request], httpx.Response],
) -> FrithwardClient:
    return FrithwardClient(
        "http://localhost:3000/",
        transport=httpx.MockTransport(handler),
    )


def test_requires_non_empty_base_url() -> None:
    with pytest.raises(ValueError, match="Base URL required"):
        FrithwardClient("  ")


def test_health_parses_response() -> None:
    seen: list[httpx.URL] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.url)
        return json_response(
            {"status": "ok", "service": "frithward", "database": "connected"}
        )

    with make_client(handler) as client:
        result = client.health()

    assert str(seen[0]) == "http://localhost:3000/health"
    assert result.database == "connected"


def test_analyze_text_parses_synchronous_result() -> None:
    with make_client(lambda request: json_response(SCAM_RESULT)) as client:
        result = client.analyze_text("You have won a prize.")

    assert result.id == "a-1"
    assert result.indicators[0].severity == "high"


def test_analyze_text_accepts_queued_response() -> None:
    with make_client(lambda request: json_response({"jobId": "job-1"}, 202)) as client:
        result = client.analyze_text("Suspicious message")

    assert isinstance(result, EnqueueResponse)
    assert result.jobId == "job-1"


def test_analyze_text_rejects_empty_text() -> None:
    with (
        make_client(lambda request: json_response(SCAM_RESULT)) as client,
        pytest.raises(ValidationError),
    ):
        client.analyze_text("")


def test_get_session_parses_response() -> None:
    with make_client(
        lambda request: json_response({"authenticated": False, "user": None})
    ) as client:
        result = client.get_session()

    assert result.authenticated is False
    assert result.user is None


def test_get_job_encodes_id_and_parses_record() -> None:
    seen: list[httpx.URL] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.url)
        return json_response(
            {"jobId": "a/b", "status": "completed", "result": {"ok": True}, "error": None}
        )

    with make_client(handler) as client:
        result = client.get_job("a/b")

    assert str(seen[0]) == "http://localhost:3000/api/jobs/a%2Fb"
    assert result.status == "completed"


def test_error_raises_typed_error_with_status_and_code() -> None:
    with (
        make_client(
            lambda request: json_response(
                {"code": "NOT_FOUND", "message": "Job not found."}, 404
            )
        ) as client,
        pytest.raises(FrithwardError) as exc_info,
    ):
        client.get_job("missing")

    assert exc_info.value.status == 404
    assert exc_info.value.code == "NOT_FOUND"
    assert str(exc_info.value) == "Job not found."


def test_non_json_error_uses_generic_code() -> None:
    with (
        make_client(lambda request: httpx.Response(503, text="gateway down")) as client,
        pytest.raises(FrithwardError) as exc_info,
    ):
        client.health()

    assert exc_info.value.status == 503
    assert exc_info.value.code == "HTTP_ERROR"


def test_malformed_success_raises_invalid_response() -> None:
    with (
        make_client(lambda request: json_response({"status": "ok"})) as client,
        pytest.raises(FrithwardError) as exc_info,
    ):
        client.health()

    assert exc_info.value.code == "INVALID_RESPONSE"
