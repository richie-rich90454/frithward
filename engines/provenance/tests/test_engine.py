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
        engine.verify(engine.ProvenanceRequest(asset_id=""))


def test_missing_manifest_reports_unavailable():
    engine = load_engine()
    result = engine.verify(engine.ProvenanceRequest(asset_id="a1"))
    assert result.status == "missing"
