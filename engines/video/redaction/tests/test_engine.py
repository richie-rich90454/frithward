import hashlib
import importlib.util
import json
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
        engine.redact(engine.RedactionRequest(video_id=""))


def test_manifest_is_real_but_no_redaction_is_claimed():
    engine = load_engine()
    result = engine.redact(
        engine.RedactionRequest(video_id="v1", regions=["10,20,100,200", "face", "5,5,1,1"])
    )
    assert result.redacted_regions == []
    assert result.status == "unavailable"
    assert "No local" in result.reason
    assert result.manifest.region_count == 3
    items = {item.label: item for item in result.manifest.items}
    assert items["10,20,100,200"].kind == "rectangle"
    assert items["10,20,100,200"].valid is True
    assert items["face"].kind == "label"
    assert items["face"].valid is True
    assert items["5,5,1,1"].valid is False
    expected = hashlib.sha256(
        json.dumps(
            {"video_id": "v1", "regions": ["10,20,100,200", "5,5,1,1", "face"]},
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()
    assert result.manifest.sha256 == expected


def test_manifest_is_deterministic_and_changes_with_regions():
    engine = load_engine()
    a = engine.redact(engine.RedactionRequest(video_id="v1", regions=["face"]))
    b = engine.redact(engine.RedactionRequest(video_id="v1", regions=["face"]))
    c = engine.redact(engine.RedactionRequest(video_id="v1", regions=["plate"]))
    assert a.manifest.sha256 == b.manifest.sha256
    assert a.manifest.sha256 != c.manifest.sha256
