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
        engine.detect(engine.LanguageRequest(text=""))


def test_rejects_whitespace_text():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.detect(engine.LanguageRequest(text="   "))


def test_detects_spanish_by_stopwords():
    engine = load_engine()
    result = engine.detect(engine.LanguageRequest(text="hola mundo"))
    assert result.language == "es"
    assert result.method == "stopwords"
    assert 0 < result.confidence <= 0.85


def test_detects_latin_languages_by_stopwords():
    engine = load_engine()
    cases = {
        "the quick brown fox is in the park": "en",
        "le chat est dans la maison": "fr",
        "der Hund ist und lauft schnell": "de",
    }
    for text, expected in cases.items():
        result = engine.detect(engine.LanguageRequest(text=text))
        assert result.language == expected, (text, result.language)


def test_detects_non_latin_scripts():
    engine = load_engine()
    cases = {
        "你好世界": "zh",
        "こんにちは世界": "ja",
        "مرحبا بالعالم": "ar",
        "नमस्ते दुनिया": "hi",
    }
    for text, expected in cases.items():
        result = engine.detect(engine.LanguageRequest(text=text))
        assert result.language == expected
        assert result.method == "script"
        assert result.confidence == 0.9


def test_unknown_text_is_und_with_zero_confidence():
    engine = load_engine()
    result = engine.detect(engine.LanguageRequest(text="xyzzy qwerty zxcvb"))
    assert result.language == "und"
    assert result.confidence == 0.0
    assert result.method == "none"


def test_result_is_honest_about_being_a_heuristic():
    engine = load_engine()
    result = engine.detect(engine.LanguageRequest(text="the cat is on the mat"))
    assert any("not a model" in line for line in result.limitations)
    assert any("not a calibrated probability" in line for line in result.limitations)
    assert set(engine.LANGUAGES) == {"en", "zh", "es", "fr", "de", "ar", "hi", "ja"}
