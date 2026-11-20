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
        engine.process(engine.ResizeRequest(image_id=""))


def test_rejects_nonpositive_bounds():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.process(engine.ResizeRequest(image_id="i1", max_width=0))


def test_returns_bounds_when_source_dimensions_are_unavailable():
    engine = load_engine()
    result = engine.process(engine.ResizeRequest(image_id="i1"))
    assert result.width > 0 and result.height > 0
    assert result.status == "source_unavailable"
    assert "not supplied" in result.detail


def test_computes_aspect_preserving_downscale():
    engine = load_engine()
    result = engine.process(
        engine.ResizeRequest(
            image_id="i1", source_width=4000, source_height=3000,
            max_width=2048, max_height=2048,
        )
    )
    assert (result.width, result.height) == (2048, 1536)
    assert result.scale == pytest.approx(0.512)
    assert result.status == "computed"


def test_never_enlarges_small_sources():
    engine = load_engine()
    result = engine.process(
        engine.ResizeRequest(image_id="i1", source_width=100, source_height=200)
    )
    assert (result.width, result.height) == (100, 200)
    assert result.scale == 1.0


def test_rejects_partial_or_invalid_source_dimensions():
    engine = load_engine()
    with pytest.raises(ValueError, match="both"):
        engine.process(engine.ResizeRequest(image_id="i1", source_width=100))
    with pytest.raises(ValueError, match="positive"):
        engine.process(
            engine.ResizeRequest(image_id="i1", source_width=0, source_height=10)
        )
