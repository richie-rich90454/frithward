import importlib.util
from pathlib import Path


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


def test_benign_text_has_no_indicators():
    engine = load_engine()
    result = engine.analyze_scam_text(engine.ScamText(text="meeting at noon"))
    assert result.indicators == []
