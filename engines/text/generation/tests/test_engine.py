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


def test_reports_unavailable_without_fabricating_output():
    engine = load_engine()
    result = engine.generate(engine.GenerationRequest(prompt="hello"))
    assert result.text == ""
    assert result.tokens == 0
    assert result.status == "unavailable"
    assert result.reason
    assert result.limitations


def test_rejects_nonpositive_max_tokens():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.generate(engine.GenerationRequest(prompt="hello", max_tokens=0))


def test_model_path_is_not_executed():
    engine = load_engine()
    result = engine.generate(
        engine.GenerationRequest(prompt="hello", model_path="/models/local.gguf")
    )
    assert result.text == ""
    assert any("not executed" in line for line in result.limitations)
