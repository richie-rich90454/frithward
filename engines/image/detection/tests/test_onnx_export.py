import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[4]
SCRIPT = ROOT / "scripts" / "export_onnx.py"


def test_exported_onnx_is_nonempty_with_magic_header(tmp_path):
    pytest.importorskip("torch")
    onnx = pytest.importorskip("onnx")

    spec = importlib.util.spec_from_file_location("export_onnx", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    output = module.export_onnx(tmp_path / "model.onnx")
    data = output.read_bytes()

    assert len(data) > 0
    assert data[:1] == b"\x08"
    assert onnx.load(str(output)) is not None
