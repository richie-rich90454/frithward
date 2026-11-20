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
        engine.process(engine.TrimRequest(video_id=""))


def test_rejects_reversed_and_equal_ranges():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.process(engine.TrimRequest(video_id="v1", start_ms=1000, end_ms=0))
    with pytest.raises(ValueError):
        engine.process(engine.TrimRequest(video_id="v1", start_ms=500, end_ms=500))


def test_rejects_negative_start_and_invalid_rates():
    engine = load_engine()
    with pytest.raises(ValueError, match="non-negative"):
        engine.process(engine.TrimRequest(video_id="v1", start_ms=-1))
    with pytest.raises(ValueError, match="fps"):
        engine.process(engine.TrimRequest(video_id="v1", fps=0))
    with pytest.raises(ValueError, match="Sample frames"):
        engine.process(engine.TrimRequest(video_id="v1", sample_frames=0))


def test_computes_duration_without_fps():
    engine = load_engine()
    result = engine.process(engine.TrimRequest(video_id="v1", start_ms=0, end_ms=1000))
    assert result.duration_ms == 1000
    assert result.frame_count is None
    assert result.status == "partial"
    assert "fps not supplied" in result.detail


def test_computes_frame_counts_and_sample_plan():
    engine = load_engine()
    result = engine.process(
        engine.TrimRequest(video_id="v1", start_ms=250, end_ms=1250, fps=25, sample_frames=5)
    )
    assert result.duration_ms == 1000
    assert result.frame_count == 25
    assert result.sampled_frame_count == 5
    assert result.sample_stride == 5
    assert result.status == "computed"


def test_caps_samples_at_frame_count():
    engine = load_engine()
    result = engine.process(
        engine.TrimRequest(video_id="v1", start_ms=0, end_ms=1000, fps=25, sample_frames=100)
    )
    assert result.sampled_frame_count == 25
    assert "exceed" in result.detail
