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
        engine.inspect(engine.PrivacyRequest(image_id=""))


def test_inspects_without_findings_by_default():
    engine = load_engine()
    result = engine.inspect(engine.PrivacyRequest(image_id="i1"))
    assert result.findings == []


def test_rejects_whitespace_id():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.inspect(engine.PrivacyRequest(image_id="   "))
