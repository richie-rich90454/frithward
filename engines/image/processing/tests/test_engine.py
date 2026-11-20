import base64
import importlib.util
from pathlib import Path

import pytest


def load_engine():
    path = Path(__file__).parent.parent / "src" / "engine.py"
    spec = importlib.util.spec_from_file_location("engine", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_rejects_invalid_requests():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.process(engine.ResizeRequest(image_id=""))
    with pytest.raises(ValueError):
        engine.process(engine.ResizeRequest(image_id="i1", max_width=0))
    with pytest.raises(ValueError, match="both"):
        engine.process(engine.ResizeRequest(image_id="i1", source_width=100))
    with pytest.raises(ValueError, match="positive"):
        engine.process(engine.ResizeRequest(image_id="i1", source_width=0, source_height=10))
    with pytest.raises(ValueError, match="Operation"):
        engine.process(engine.ResizeRequest(image_id="i1", operation="invert"))


def test_returns_bounds_when_source_dimensions_are_unavailable():
    engine = load_engine()
    result = engine.process(engine.ResizeRequest(image_id="i1"))
    assert result.status == "source_unavailable"
    assert "not supplied" in result.detail


def test_computes_aspect_preserving_downscale_and_never_enlarges():
    engine = load_engine()
    result = engine.process(
        engine.ResizeRequest(
            image_id="i1", source_width=4000, source_height=3000,
            max_width=2048, max_height=2048,
        )
    )
    assert (result.width, result.height) == (2048, 1536)
    assert result.scale == pytest.approx(0.512)
    small = engine.process(
        engine.ResizeRequest(image_id="i1", source_width=100, source_height=200)
    )
    assert (small.width, small.height) == (100, 200)
    assert small.scale == 1.0


def test_grayscale_applies_real_luma_to_supplied_pixels():
    engine = load_engine()
    pixels = bytes([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255])
    result = engine.process(
        engine.ResizeRequest(
            image_id="i1", source_width=2, source_height=2,
            pixels_base64=base64.b64encode(pixels).decode("ascii"),
            operation="grayscale",
        )
    )
    assert result.status == "computed"
    assert result.pixel_operation == "grayscale"
    assert (result.output_width, result.output_height) == (2, 2)
    assert base64.b64decode(result.output_base64) == bytes([76, 149, 28, 255])


def test_crops_supplied_pixels_to_computed_box():
    engine = load_engine()
    pixels = bytes(range(4 * 2 * 3))
    result = engine.process(
        engine.ResizeRequest(
            image_id="i1", source_width=4, source_height=2,
            max_width=2, max_height=2,
            pixels_base64=base64.b64encode(pixels).decode("ascii"),
            operation="crop",
        )
    )
    assert (result.width, result.height) == (2, 1)
    assert result.pixel_operation == "crop"
    assert (result.output_width, result.output_height) == (2, 1)
    assert base64.b64decode(result.output_base64) == pixels[:6]


def test_pixel_operations_require_matching_bytes():
    engine = load_engine()
    with pytest.raises(ValueError, match="required"):
        engine.process(engine.ResizeRequest(image_id="i1", source_width=2, source_height=2, operation="crop"))
    with pytest.raises(ValueError, match="byte length"):
        engine.process(
            engine.ResizeRequest(
                image_id="i1", source_width=2, source_height=2,
                pixels_base64=base64.b64encode(b"\x00\x01").decode("ascii"),
                operation="grayscale",
            )
        )
