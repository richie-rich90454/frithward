import importlib.util
from pathlib import Path

import pytest


def load_engine():
    path = Path(__file__).parent.parent / "src" / "engine.py"
    spec = importlib.util.spec_from_file_location("engine", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_flags_password_request():
    engine = load_engine()
    result = engine.analyze_scam_text(engine.ScamText(text="send your password now"))
    assert "credential request" in result.indicators
    finding = next(f for f in result.findings if f.name == "credential request")
    assert finding.severity == "high"
    assert finding.matched_text and "password" in finding.matched_text.lower()


def test_benign_text_has_no_indicators():
    engine = load_engine()
    result = engine.analyze_scam_text(engine.ScamText(text="meeting at noon"))
    assert result.indicators == []
    assert result.findings == []


def test_rejects_empty_input():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.analyze_scam_text(engine.ScamText(text=""))


def test_flags_urgency_and_payment_demand():
    engine = load_engine()
    result = engine.analyze_scam_text(
        engine.ScamText(text="Act now: wire transfer the fee within 2 hours.")
    )
    assert "urgency" in result.indicators
    assert "payment demand" in result.indicators
    severities = {f.name: f.severity for f in result.findings}
    assert severities["urgency"] == "medium"
    assert severities["payment demand"] == "high"


def test_flags_gift_card_demand():
    engine = load_engine()
    result = engine.analyze_scam_text(
        engine.ScamText(text="Pay the release fee with a gift card.")
    )
    assert "payment demand" in result.indicators


def test_flags_mismatched_link():
    engine = load_engine()
    result = engine.analyze_scam_text(
        engine.ScamText(text="[Your bank](https://evil.example.com/login)")
    )
    assert "mismatched link" in result.indicators
    finding = next(f for f in result.findings if f.name == "mismatched link")
    assert finding.rationale


def test_flags_lookalike_domain():
    engine = load_engine()
    result = engine.analyze_scam_text(
        engine.ScamText(text="Log in at www.paypa1.com to confirm.")
    )
    assert "lookalike domain" in result.indicators
    assert result.findings[-1].severity == "high"


def test_every_finding_has_rationale_and_limitations_are_honest():
    engine = load_engine()
    result = engine.analyze_scam_text(
        engine.ScamText(text="Urgent: send your password and wire transfer now.")
    )
    assert result.findings
    assert all(f.rationale for f in result.findings)
    assert all(f.severity in ("low", "medium", "high") for f in result.findings)
    assert any("cannot establish intent" in line for line in result.limitations)
