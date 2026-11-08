"""Benchmark harness shared across audio research."""
from __future__ import annotations


def summarize(scores: list[float]) -> dict[str, float]:
    if not scores:
        raise ValueError("Scores required.")
    mean = sum(scores) / len(scores)
    return {"mean": mean, "count": len(scores)}
