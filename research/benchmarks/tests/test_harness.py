import importlib.util
import sys
from pathlib import Path

import pytest


def load_harness():
    path = Path(__file__).parent.parent / "harness.py"
    spec = importlib.util.spec_from_file_location("harness", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["harness"] = module
    spec.loader.exec_module(module)
    return module


def sample_predictions():
    harness = load_harness()
    return [
        harness.Prediction(truth=True, score=0.9, dataset="a"),
        harness.Prediction(truth=True, score=0.8, dataset="a"),
        harness.Prediction(truth=False, score=0.3, dataset="a"),
        harness.Prediction(truth=False, score=0.2, dataset="b"),
        harness.Prediction(truth=True, score=0.7, dataset="b"),
        harness.Prediction(truth=False, score=0.6, dataset="b"),
    ]


def test_empty_predictions_raise():
    harness = load_harness()
    with pytest.raises(ValueError):
        harness.rates([])


def test_score_out_of_range_raises():
    harness = load_harness()
    with pytest.raises(ValueError):
        harness.rates([harness.Prediction(truth=True, score=1.5)])


def test_confusion_counts():
    harness = load_harness()
    result = harness.confusion(sample_predictions())
    assert result == {"tp": 3, "fp": 1, "tn": 2, "fn": 0}


def test_rates_exact():
    harness = load_harness()
    result = harness.rates(sample_predictions())
    assert result["precision"] == 0.75
    assert result["recall"] == 1.0
    assert result["fpr"] == pytest.approx(1 / 3)
    assert result["fnr"] == 0.0
    assert result["n"] == 6


def test_calibration_buckets():
    harness = load_harness()
    buckets = harness.calibration_buckets(sample_predictions(), buckets=10)
    assert len(buckets) == 10
    nonempty = [b for b in buckets if b["count"] > 0]
    assert len(nonempty) == 6
    assert all(b["mean_score"] is not None for b in nonempty)
    assert all(b["positive_rate"] is not None for b in nonempty)
    empty = [b for b in buckets if b["count"] == 0]
    assert all(b["mean_score"] is None and b["positive_rate"] is None for b in empty)


def test_cross_dataset_table():
    harness = load_harness()
    table = harness.cross_dataset_table(sample_predictions())
    assert [row["dataset"] for row in table] == ["a", "b"]
    assert table[0]["precision"] == 1.0
    assert table[1]["precision"] == 0.5
    assert table[1]["fpr"] == 0.5


def test_load_predictions(tmp_path):
    harness = load_harness()
    path = tmp_path / "predictions.jsonl"
    path.write_text(
        '{"truth": true, "score": 0.9, "dataset": "a"}\n'
        '{"truth": false, "score": 0.2, "dataset": "a"}\n',
        encoding="utf-8",
    )
    predictions = harness.load_predictions(path)
    assert len(predictions) == 2
    assert predictions[0].dataset == "a"


def test_load_predictions_empty_file_raises(tmp_path):
    harness = load_harness()
    path = tmp_path / "empty.jsonl"
    path.write_text("", encoding="utf-8")
    with pytest.raises(ValueError):
        harness.load_predictions(path)
