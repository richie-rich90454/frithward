import importlib.util
from pathlib import Path

import pytest


def load_engine():
    path = Path(__file__).parent.parent / "src" / "engine.py"
    spec = importlib.util.spec_from_file_location("engine", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_rejects_empty_prompt():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.generate(engine.GenerationRequest(prompt=""))


def test_returns_token_shape():
    engine = load_engine()
    result = engine.generate(engine.GenerationRequest(prompt="hello"))
    assert result.tokens == 0
