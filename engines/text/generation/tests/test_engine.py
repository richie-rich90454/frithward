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
        engine.generate(engine.GenerationRequest(prompt=""))
    with pytest.raises(ValueError):
        engine.generate(engine.GenerationRequest(prompt="hello", max_tokens=0))
    with pytest.raises(ValueError):
        engine.generate(engine.GenerationRequest(prompt="hello", mode="llm"))


def test_summary_is_extractive_and_labelled_rule_based():
    engine = load_engine()
    prompt = (
        "Solar panels convert sunlight to power. Batteries store that power. "
        "Solar panels reduce bills. Installation needs a roof survey."
    )
    result = engine.generate(engine.GenerationRequest(prompt=prompt))
    assert result.status == "computed"
    assert result.method == "rule-based-extractive"
    assert result.tokens == len(result.text.split())
    assert result.text
    for sentence in result.text.split(". "):
        assert sentence.rstrip(".") in prompt
    assert any("not language-model inference" in line for line in result.limitations)


def test_bullets_are_derived_from_prompt():
    engine = load_engine()
    prompt = "Alpha beta gamma. Delta epsilon zeta."
    result = engine.generate(engine.GenerationRequest(prompt=prompt, mode="bullets"))
    assert result.status == "computed"
    lines = result.text.splitlines()
    assert lines
    assert all(line.startswith("- ") for line in lines)
    for line in lines:
        assert line[2:] in prompt


def test_token_budget_is_honoured():
    engine = load_engine()
    prompt = "One two three four five. Six seven eight nine ten."
    result = engine.generate(engine.GenerationRequest(prompt=prompt, max_tokens=4))
    assert result.tokens <= 4
    assert result.status == "computed"


def test_model_path_is_not_executed():
    engine = load_engine()
    result = engine.generate(
        engine.GenerationRequest(prompt="hello", model_path="/models/local.gguf")
    )
    assert result.status == "computed"
    assert any("not executed" in line for line in result.limitations)
