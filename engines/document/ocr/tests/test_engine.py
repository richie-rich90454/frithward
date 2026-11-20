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
        engine.recognize(engine.OcrRequest(document_id=""))


def test_reports_unavailable_and_never_invents_text():
    engine = load_engine()
    result = engine.recognize(engine.OcrRequest(document_id="d1"))
    assert result.document_id == "d1"
    assert result.text == ""
    assert result.status == "unavailable"
    assert result.reason
    assert result.limitations


def test_accepts_input_without_claiming_recognition():
    engine = load_engine()
    result = engine.recognize(
        engine.OcrRequest(document_id="d1", document_base64="AA==", language="en")
    )
    assert result.text == ""
    assert result.status == "unavailable"


def test_rejects_whitespace_id():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.recognize(engine.OcrRequest(document_id="   "))
