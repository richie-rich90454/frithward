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
        engine.verify(engine.ProvenanceRequest(asset_id=""))


def test_missing_manifest_reports_unavailable():
    engine = load_engine()
    result = engine.verify(engine.ProvenanceRequest(asset_id="a1"))
    assert result.status == "missing"
    assert result.transformations == []


def test_present_manifest_reports_present():
    engine = load_engine()
    result = engine.verify(engine.ProvenanceRequest(asset_id="a1", manifest="{}"))
    assert result.status == "present"
    assert result.transformations == []


def test_parses_transformations_from_manifest():
    engine = load_engine()
    manifest = {
        "transformations": [
            {
                "action": "c2pa.created",
                "actor": "Camera App",
                "timestamp": "2026-01-01T00:00:00Z",
                "detail": "Original capture",
            },
            {
                "action": "c2pa.edited",
                "actor": "Editor",
                "timestamp": "2026-01-02T00:00:00Z",
                "detail": "Cropped",
            },
        ]
    }
    result = engine.verify(
        engine.ProvenanceRequest(asset_id="a1", manifest=json.dumps(manifest))
    )
    assert [step.action for step in result.transformations] == [
        "c2pa.created",
        "c2pa.edited",
    ]
    assert result.transformations[1].actor == "Editor"
    assert result.transformations[1].detail == "Cropped"


def test_transformation_fields_are_optional():
    engine = load_engine()
    manifest = {"transformations": [{"action": "c2pa.created"}]}
    result = engine.verify(
        engine.ProvenanceRequest(asset_id="a1", manifest=json.dumps(manifest))
    )
    step = result.transformations[0]
    assert step.actor is None
    assert step.timestamp is None
    assert step.detail is None


@pytest.mark.parametrize(
    "manifest",
    [
        "not json",
        json.dumps({"transformations": [{"actor": "Editor"}]}),
        json.dumps({"transformations": [{"action": 42}]}),
    ],
)
def test_invalid_transformation_values_are_rejected(manifest):
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.verify(engine.ProvenanceRequest(asset_id="a1", manifest=manifest))


@pytest.mark.parametrize(
    "manifest",
    [
        "[]",
        json.dumps({"transformations": {}}),
        json.dumps({"transformations": ["created"]}),
        json.dumps({"transformations": [{"action": "c2pa.created", "actor": 7}]}),
    ],
)
def test_invalid_manifest_or_transformation_types_are_rejected(manifest):
    engine = load_engine()
    with pytest.raises(TypeError):
        engine.verify(engine.ProvenanceRequest(asset_id="a1", manifest=manifest))
