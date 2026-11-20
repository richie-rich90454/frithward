import base64
import hashlib
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


def make_png(width, height):
    return (
        b"\x89PNG\r\n\x1a\n"
        + b"\x00\x00\x00\x0d"
        + b"IHDR"
        + struct.pack(">II", width, height)
        + b"\x00" * 10
    )


def test_rejects_empty_input():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.protect(engine.ProtectionRequest(image_id=""))


def test_no_input_reports_unavailable():
    engine = load_engine()
    result = engine.protect(engine.ProtectionRequest(image_id="i1"))
    assert result.protected is False
    assert result.preprocessing is None
    assert result.status == "unavailable"
    assert "No local" in result.reason


def test_real_png_preprocessing_without_claiming_protection():
    engine = load_engine()
    raw = make_png(640, 480)
    result = engine.protect(
        engine.ProtectionRequest(image_id="i1", image_base64=base64.b64encode(raw).decode("ascii"))
    )
    assert result.protected is False
    assert result.status == "unavailable"
    assert result.preprocessing.sha256 == hashlib.sha256(raw).hexdigest()
    assert result.preprocessing.byte_length == len(raw)
    assert result.preprocessing.detected_format == "png"
    assert (result.preprocessing.width, result.preprocessing.height) == (640, 480)


def test_unknown_format_reports_no_dimensions():
    engine = load_engine()
    raw = b"not an image"
    result = engine.protect(
        engine.ProtectionRequest(image_id="i1", image_base64=base64.b64encode(raw).decode("ascii"))
    )
    assert result.preprocessing.detected_format == "unknown"
    assert result.preprocessing.width is None
    assert result.status == "unavailable"
