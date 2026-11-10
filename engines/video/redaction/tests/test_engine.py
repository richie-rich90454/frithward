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
        engine.redact(engine.RedactionRequest(video_id=""))


def test_echoes_regions():
    engine = load_engine()
    result = engine.redact(engine.RedactionRequest(video_id="v1", regions=["r1"]))
    assert result.redacted_regions == ["r1"]


def test_rejects_whitespace_id():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.redact(engine.RedactionRequest(video_id="   "))
