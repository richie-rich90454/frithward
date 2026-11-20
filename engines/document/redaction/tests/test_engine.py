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
        engine.redact(engine.RedactionRequest(document_id=""))


def test_rejects_whitespace_id():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.redact(engine.RedactionRequest(document_id="   "))


def test_no_text_means_no_redactions():
    engine = load_engine()
    result = engine.redact(
        engine.RedactionRequest(document_id="d1", terms=["a", "b"])
    )
    assert result.redacted_count == 0
    assert result.redacted_text == ""
    assert result.spans == []


def test_redacts_terms_case_insensitively_with_offsets():
    engine = load_engine()
    result = engine.redact(
        engine.RedactionRequest(
            document_id="d1", text="Alice met Bob at noon", terms=["alice", "bob"]
        )
    )
    assert result.redacted_count == 2
    assert result.redacted_text == "[REDACTED] met [REDACTED] at noon"
    assert [(s.start, s.end, s.term) for s in result.spans] == [
        (0, 5, "alice"),
        (10, 13, "bob"),
    ]


def test_case_sensitive_and_custom_replacement():
    engine = load_engine()
    result = engine.redact(
        engine.RedactionRequest(
            document_id="d1",
            text="Alice ALICE",
            terms=["Alice"],
            replacement="X",
            case_sensitive=True,
        )
    )
    assert result.redacted_count == 1
    assert result.redacted_text == "X ALICE"
    assert result.spans[0].replacement == "X"


def test_overlapping_terms_are_resolved_deterministically():
    engine = load_engine()
    result = engine.redact(
        engine.RedactionRequest(document_id="d1", text="abcdef", terms=["abc", "bcd"])
    )
    assert result.redacted_count == 1
    assert result.spans[0].term == "abc"
    assert result.redacted_text == "[REDACTED]def"


def test_redacted_bytes_match_text():
    engine = load_engine()
    result = engine.redact(
        engine.RedactionRequest(document_id="d1", text="call me", terms=["me"])
    )
    assert base64.b64decode(result.redacted_bytes_b64).decode("utf-8") == (
        result.redacted_text
    )
    assert result.limitations


def test_reads_text_from_path(tmp_path):
    engine = load_engine()
    source = tmp_path / "doc.txt"
    source.write_text("token=secret-123", encoding="utf-8")
    result = engine.redact(
        engine.RedactionRequest(document_id="d1", path=str(source), terms=["secret-123"])
    )
    assert result.redacted_text == "token=[REDACTED]"
    assert result.redacted_count == 1
