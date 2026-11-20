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
        engine.detect(engine.DetectionRequest(video_id=""))


def test_documents_limitations_and_unavailability():
    engine = load_engine()
    result = engine.detect(engine.DetectionRequest(video_id="v1"))
    assert result.indicators == []
    assert result.status == "unavailable"
    assert "No local" in result.reason
    assert any("Sampling" in line for line in result.limitations)


def test_accepts_frames_without_inventing_indicators():
    engine = load_engine()
    result = engine.detect(
        engine.DetectionRequest(video_id="v1", frame_base64="AA==", sample_frames=4)
    )
    assert result.indicators == []
    assert result.status == "unavailable"


def test_rejects_nonpositive_sample_frames():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.detect(engine.DetectionRequest(video_id="v1", sample_frames=0))
