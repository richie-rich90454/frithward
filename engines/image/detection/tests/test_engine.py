import base64
import importlib.util
import struct
from pathlib import Path

import pytest

SRC = Path(__file__).parent.parent / "src"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_engine():
    return load_module("engine", SRC / "engine.py")


def test_no_model_raises_explicit_error():
    engine = load_engine()
    with pytest.raises(ValueError, match="No model artifact configured"):
        engine.detect(engine.DetectionRequest(image_id="i1"))


def test_rejects_empty_input():
    engine = load_engine()
    with pytest.raises(ValueError, match="Image id required"):
        engine.detect(engine.DetectionRequest(image_id="", model_path="unused"))


def test_fake_model_returns_real_predictions(tmp_path):
    torch = pytest.importorskip("torch")
    tiny = load_module("tiny_model", SRC / "tiny_model.py")
    engine = load_engine()

    model_path = tmp_path / "tiny.pt"
    module = tiny.TinyModel(input_size=4)
    module.eval()
    torch.jit.save(torch.jit.script(module), str(model_path))

    payload = base64.b64encode(struct.pack("<4f", 1.0, -2.0, 0.5, 3.0)).decode("ascii")
    result = engine.detect(
        engine.DetectionRequest(
            image_id="i2",
            model_path=str(model_path),
            model_name="tiny-test",
            model_version="0.0.1",
            image_base64=payload,
        )
    )

    assert result.model_name == "tiny-test"
    assert result.model_version == "0.0.1"
    assert len(result.scores) == 2
    assert all(0.0 <= score <= 1.0 for score in result.scores)
    assert result.limitations
