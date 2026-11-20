import base64
import hashlib
import importlib.util
from pathlib import Path

import pytest


def load_engine():
    path = Path(__file__).parent.parent / "src" / "engine.py"
    spec = importlib.util.spec_from_file_location("engine", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_rejects_empty_input():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.protect(engine.ProtectionRequest(audio_id=""))


def test_no_input_reports_unavailable():
    engine = load_engine()
    result = engine.protect(engine.ProtectionRequest(audio_id="a1"))
    assert result.protected is False
    assert result.preprocessing is None
    assert result.status == "unavailable"
    assert "No local" in result.reason


def test_real_preprocessing_without_claiming_protection():
    engine = load_engine()
    raw = bytes([0, 1, 2, 3, 255, 128])
    result = engine.protect(
        engine.ProtectionRequest(audio_id="a1", audio_base64=base64.b64encode(raw).decode("ascii"))
    )
    assert result.protected is False
    assert result.status == "unavailable"
    assert result.preprocessing.sha256 == hashlib.sha256(raw).hexdigest()
    assert result.preprocessing.byte_length == 6
    assert result.preprocessing.sample_count == 3
    assert any("does not modify" in line for line in result.limitations)
