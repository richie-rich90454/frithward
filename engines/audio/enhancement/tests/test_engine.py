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
        engine.enhance(engine.EnhancementRequest(audio_id=""))


def test_applies_gain():
    engine = load_engine()
    result = engine.enhance(engine.EnhancementRequest(audio_id="a1", gain_db=2.0))
    assert result.gain_db == 2.0


def test_rejects_whitespace_id():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.enhance(engine.EnhancementRequest(audio_id="   "))
