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
        engine.extract(engine.ExtractionRequest(document_id=""))


def test_reports_unavailable_and_no_fields():
    engine = load_engine()
    result = engine.extract(engine.ExtractionRequest(document_id="d1"))
    assert result.fields == {}
    assert result.status == "unavailable"
    assert "No local" in result.reason
    assert result.limitations


def test_accepts_text_without_inventing_fields():
    engine = load_engine()
    result = engine.extract(
        engine.ExtractionRequest(document_id="d1", text="Name: Alice, Email: a@example.com")
    )
    assert result.fields == {}
    assert result.status == "unavailable"


def test_rejects_whitespace_id():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.extract(engine.ExtractionRequest(document_id="   "))
