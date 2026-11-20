"""Tiny TorchScript-compatible module for smoke tests and ONNX export checks.

This is a synthetic test module. It is not a detection model and its weights
carry no meaning.
"""
from __future__ import annotations

import torch
from torch import nn


class TinyModel(nn.Module):
    def __init__(self, input_size: int = 4) -> None:
        super().__init__()
        self.linear = nn.Linear(input_size, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return torch.sigmoid(self.linear(x))
