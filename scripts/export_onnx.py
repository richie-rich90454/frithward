"""Export the tiny smoke-test torch module to ONNX.

The emitted file is a synthetic demo artifact, not a real detection model. It is
generated locally on demand and is not distributed by Frithward.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "engines" / "image" / "detection" / "src"))

from tiny_model import TinyModel

DEFAULT_OUTPUT = ROOT / "models" / "image-detection-smoke" / "model.onnx"


def export_onnx(output_path: Path, input_size: int = 4) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    model = TinyModel(input_size=input_size)
    model.eval()
    dummy = torch.zeros(1, input_size, dtype=torch.float32)
    torch.onnx.export(
        model,
        (dummy,),
        str(output_path),
        input_names=["input"],
        output_names=["output"],
        dynamo=False,
    )
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--input-size", type=int, default=4)
    args = parser.parse_args()
    path = export_onnx(args.output, args.input_size)
    print(f"Exported synthetic demo ONNX to {path}")


if __name__ == "__main__":
    main()
