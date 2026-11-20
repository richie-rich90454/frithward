import base64
import importlib.util
import struct
from pathlib import Path

from fastapi.testclient import TestClient

SRC = Path(__file__).parent.parent / "src"


def load_api():
    spec = importlib.util.spec_from_file_location("api", SRC / "api.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_health():
    api = load_api()
    response = TestClient(api.app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_transcribe_is_honest_without_a_model():
    api = load_api()
    response = TestClient(api.app).post(
        "/transcribe", json={"audio_id": "a1", "language": "en"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["utterances"] == []
    assert body["preflight"] is None
    assert body["status"] == "unavailable"
    assert body["reason"]
    assert body["limitations"]


def test_transcribe_reports_real_preflight():
    api = load_api()
    raw = struct.pack("<100h", *([5000] * 100))
    response = TestClient(api.app).post(
        "/transcribe",
        json={
            "audio_id": "a1", "language": "en",
            "audio_base64": base64.b64encode(raw).decode("ascii"),
            "sample_rate": 100,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "unavailable"
    assert body["preflight"]["sample_count"] == 100
    assert body["preflight"]["duration_ms"] == 1000


def test_transcribe_rejects_unsupported_language():
    api = load_api()
    response = TestClient(api.app).post(
        "/transcribe", json={"audio_id": "a1", "language": "xx"}
    )
    assert response.status_code == 400
