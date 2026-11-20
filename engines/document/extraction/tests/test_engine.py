import base64
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
    with pytest.raises(ValueError):
        engine.extract(engine.ExtractionRequest(document_id="   "))


def test_no_input_reports_unavailable_without_inventing_fields():
    engine = load_engine()
    result = engine.extract(engine.ExtractionRequest(document_id="d1"))
    assert result.fields == {}
    assert result.occurrences == []
    assert result.status == "unavailable"
    assert result.reason


def test_extracts_real_fields_with_offsets_and_heuristics():
    engine = load_engine()
    text = (
        "Contact alice@example.com or https://example.org/docs. "
        "Born 1990-05-12. Post SW1A 1AA. Tel +44 20 7946 0958."
    )
    result = engine.extract(engine.ExtractionRequest(document_id="d1", text=text))
    assert result.status == "computed"
    assert result.fields["email"] == "alice@example.com"
    assert result.fields["url"] == "https://example.org/docs"
    assert result.fields["date"] == "1990-05-12"
    assert result.fields["postcode"] == "SW1A 1AA"
    assert "7946" in result.fields["phone"]
    offset = next(o for o in result.occurrences if o.name == "email")
    assert text[offset.start:offset.end] == "alice@example.com"
    assert all(0.0 < o.confidence < 1.0 for o in result.occurrences)
    assert {o.name for o in result.occurrences} <= {"email", "url", "date", "postcode", "phone"}


def test_decodes_base64_text_and_reads_paths(tmp_path):
    engine = load_engine()
    encoded = base64.b64encode(b"Mail bob@example.org now").decode("ascii")
    result = engine.extract(engine.ExtractionRequest(document_id="d1", document_base64=encoded))
    assert result.fields["email"] == "bob@example.org"

    path = tmp_path / "doc.txt"
    path.write_text("Zip 90210 and call 555-123-4567", encoding="utf-8")
    result = engine.extract(engine.ExtractionRequest(document_id="d2", document_path=str(path)))
    assert result.fields["postcode"] == "90210"
    assert "555" in result.fields["phone"]


def test_plain_text_yields_no_fields_without_fabrication():
    engine = load_engine()
    result = engine.extract(engine.ExtractionRequest(document_id="d1", text="nothing to find here"))
    assert result.status == "computed"
    assert result.fields == {}
    assert result.occurrences == []
