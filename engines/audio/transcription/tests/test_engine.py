import base64
import importlib.util
import struct
from pathlib import Path

import pytest


def load_engine():
    path = Path(__file__).parent.parent / "src" / "engine.py"
    spec = importlib.util.spec_from_file_location("engine", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def pcm16(*samples):
    return base64.b64encode(struct.pack(f"<{len(samples)}h", *samples)).decode("ascii")


def test_rejects_invalid_requests():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.transcribe(engine.TranscriptionRequest(audio_id="", language="en"))
    with pytest.raises(ValueError):
        engine.transcribe(engine.TranscriptionRequest(audio_id="a1", language="xx"))
    with pytest.raises(ValueError):
        engine.transcribe_detailed(engine.TranscriptionRequest(audio_id="a1", language="xx"))


def test_returns_no_utterances_without_a_model():
    engine = load_engine()
    assert engine.transcribe(engine.TranscriptionRequest(audio_id="a1", language="en")) == []


def test_preflight_is_real_and_result_stays_unavailable():
    engine = load_engine()
    result = engine.transcribe_detailed(
        engine.TranscriptionRequest(
            audio_id="a1", language="en",
            audio_base64=pcm16(*([10000] * 100)), sample_rate=100,
        )
    )
    assert result.utterances == []
    assert result.status == "unavailable"
    assert "No local" in result.reason
    assert result.preflight is not None
    assert result.preflight.sample_count == 100
    assert result.preflight.duration_ms == 1000
    assert result.preflight.peak == pytest.approx(10000 / 32768, abs=1e-5)
    assert result.preflight.rms > 0
    assert any("does not recognize speech" in line for line in result.limitations)


def test_no_audio_means_no_preflight():
    engine = load_engine()
    result = engine.transcribe_detailed(
        engine.TranscriptionRequest(audio_id="a1", language="en")
    )
    assert result.preflight is None
    assert result.status == "unavailable"
