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


def test_marks_protected():
    engine = load_engine()
    result = engine.protect(engine.ProtectionRequest(audio_id="a1"))
    assert result.protected is True


def test_rejects_whitespace_id():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.protect(engine.ProtectionRequest(audio_id="   "))
