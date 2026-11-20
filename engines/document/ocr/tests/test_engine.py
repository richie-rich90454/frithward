import base64
import importlib.util
import subprocess
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


def test_absent_tesseract_reports_the_exact_check(monkeypatch):
    engine = load_engine()
    monkeypatch.setattr(engine, "resolve_tesseract", lambda: None)
    result = engine.recognize(engine.OcrRequest(document_id="d1", document_base64="AA=="))
    assert result.text == ""
    assert result.status == "unavailable"
    assert result.tesseract_path is None
    assert result.check == "shutil.which('tesseract')"
    assert "shutil.which('tesseract')" in result.reason


def test_present_tesseract_runs_real_subprocess(monkeypatch):
    engine = load_engine()
    monkeypatch.setattr(engine, "resolve_tesseract", lambda: "/fake/tesseract")
    calls = []

    def fake_run(args, **kwargs):
        calls.append(args)
        return subprocess.CompletedProcess(args, 0, stdout=b"hello ocr", stderr=b"")

    monkeypatch.setattr(engine.subprocess, "run", fake_run)
    raw = base64.b64encode(b"fake-image-bytes").decode("ascii")
    result = engine.recognize(
        engine.OcrRequest(document_id="d1", document_base64=raw, language="en")
    )
    assert result.status == "computed"
    assert result.text == "hello ocr"
    assert result.tesseract_path == "/fake/tesseract"
    assert calls[0][0] == "/fake/tesseract"
    assert calls[0][3] == "-l"
    assert calls[0][4] == "en"
    assert not Path(calls[0][1]).exists()


def test_present_tesseract_without_bytes_stays_unavailable(monkeypatch):
    engine = load_engine()
    monkeypatch.setattr(engine, "resolve_tesseract", lambda: "/fake/tesseract")
    result = engine.recognize(engine.OcrRequest(document_id="d1"))
    assert result.status == "unavailable"
    assert result.text == ""
    assert "No document bytes" in result.reason
    assert result.tesseract_path == "/fake/tesseract"
