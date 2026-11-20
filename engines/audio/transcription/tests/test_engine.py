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
        engine.transcribe(engine.TranscriptionRequest(audio_id="", language="en"))


def test_returns_no_utterances_without_a_model():
    engine = load_engine()
    result = engine.transcribe(engine.TranscriptionRequest(audio_id="a1", language="en"))
    assert result == []


def test_detailed_result_is_explicitly_unavailable():
    engine = load_engine()
    result = engine.transcribe_detailed(
        engine.TranscriptionRequest(audio_id="a1", language="en", audio_base64="AA==")
    )
    assert result.utterances == []
    assert result.status == "unavailable"
    assert "No local" in result.reason
    assert result.limitations


def test_rejects_unsupported_language():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.transcribe(engine.TranscriptionRequest(audio_id="a1", language="xx"))
    with pytest.raises(ValueError):
        engine.transcribe_detailed(engine.TranscriptionRequest(audio_id="a1", language="xx"))
