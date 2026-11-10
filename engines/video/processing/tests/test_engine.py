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


def test_rejects_reversed_range():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.process(engine.TrimRequest(video_id="v1", start_ms=1000, end_ms=0))


def test_computes_duration():
    engine = load_engine()
    result = engine.process(engine.TrimRequest(video_id="v1", start_ms=0, end_ms=1000))
    assert result.duration_ms == 1000


def test_rejects_equal_range():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.process(engine.TrimRequest(video_id="v1", start_ms=500, end_ms=500))
