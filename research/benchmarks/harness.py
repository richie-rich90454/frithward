"""Reusable evaluation harness for Frithward model releases.

Every metric is computed from supplied predictions. The harness never invents
numbers: empty input raises, invalid scores raise, and empty calibration
buckets are reported as missing.
"""
from __future__ import annotations

import json
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Prediction:
    truth: bool
    score: float
    dataset: str = "default"
    generator: str = "unknown"


def load_predictions(path: str | Path) -> list[Prediction]:
    """Load JSONL predictions.

    Each line must contain truth (bool) and score (float), and may contain
    dataset (str) and generator (str). Raises ValueError when no records load.
    """
    predictions: list[Prediction] = []
    with Path(path).open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            predictions.append(
                Prediction(
                    truth=bool(record["truth"]),
                    score=float(record["score"]),
                    dataset=str(record.get("dataset", "default")),
                    generator=str(record.get("generator", "unknown")),
                )
            )
    if not predictions:
        raise ValueError("Predictions required.")
    return predictions


def _require(predictions: Iterable[Prediction]) -> list[Prediction]:
    items = list(predictions)
    if not items:
        raise ValueError("Predictions required.")
    for item in items:
        if not 0.0 <= item.score <= 1.0:
            raise ValueError(f"Score outside [0, 1]: {item.score}")
    return items


def confusion(
    predictions: Iterable[Prediction], threshold: float = 0.5
) -> dict[str, int]:
    items = _require(predictions)
    tp = sum(1 for p in items if p.truth and p.score >= threshold)
    fp = sum(1 for p in items if not p.truth and p.score >= threshold)
    tn = sum(1 for p in items if not p.truth and p.score < threshold)
    fn = sum(1 for p in items if p.truth and p.score < threshold)
    return {"tp": tp, "fp": fp, "tn": tn, "fn": fn}


def rates(
    predictions: Iterable[Prediction], threshold: float = 0.5
) -> dict[str, float | int]:
    c = confusion(predictions, threshold)
    precision = c["tp"] / (c["tp"] + c["fp"]) if c["tp"] + c["fp"] else 0.0
    recall = c["tp"] / (c["tp"] + c["fn"]) if c["tp"] + c["fn"] else 0.0
    fpr = c["fp"] / (c["fp"] + c["tn"]) if c["fp"] + c["tn"] else 0.0
    fnr = c["fn"] / (c["fn"] + c["tp"]) if c["fn"] + c["tp"] else 0.0
    return {
        "precision": precision,
        "recall": recall,
        "fpr": fpr,
        "fnr": fnr,
        "threshold": threshold,
        "n": c["tp"] + c["fp"] + c["tn"] + c["fn"],
    }


def calibration_buckets(
    predictions: Iterable[Prediction], buckets: int = 10
) -> list[dict[str, float | int | None]]:
    items = _require(predictions)
    if buckets <= 0:
        raise ValueError("Bucket count must be positive.")
    result: list[dict[str, float | int | None]] = []
    for index in range(buckets):
        low = index / buckets
        high = (index + 1) / buckets
        selected = [
            p
            for p in items
            if low <= p.score < high or (index == buckets - 1 and p.score == 1.0)
        ]
        if selected:
            mean_score: float | None = sum(p.score for p in selected) / len(selected)
            positive_rate: float | None = sum(1 for p in selected if p.truth) / len(selected)
        else:
            mean_score = None
            positive_rate = None
        result.append(
            {
                "bucket": index,
                "low": low,
                "high": high,
                "count": len(selected),
                "mean_score": mean_score,
                "positive_rate": positive_rate,
            }
        )
    return result


def cross_dataset_table(
    predictions: Iterable[Prediction], threshold: float = 0.5
) -> list[dict[str, float | int | str]]:
    items = _require(predictions)
    datasets = sorted({p.dataset for p in items})
    return [
        {
            "dataset": dataset,
            **rates((p for p in items if p.dataset == dataset), threshold),
        }
        for dataset in datasets
    ]
