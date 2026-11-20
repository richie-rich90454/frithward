import base64
import importlib.util
from pathlib import Path

import pytest


def load_engine():
    path = Path(__file__).parent.parent / "src" / "engine.py"
    spec = importlib.util.spec_from_file_location("engine", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def enc(data):
    return base64.b64encode(bytes(data)).decode("ascii")


def test_rejects_invalid_requests():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.detect(engine.DetectionRequest(video_id=""))
    with pytest.raises(ValueError):
        engine.detect(engine.DetectionRequest(video_id="v1", sample_frames=0))
    with pytest.raises(ValueError, match="both"):
        engine.detect(engine.DetectionRequest(video_id="v1", width=2))


def test_no_frames_reports_unavailable():
    engine = load_engine()
    result = engine.detect(engine.DetectionRequest(video_id="v1"))
    assert result.statistics is None
    assert result.indicators == []
    assert result.status == "unavailable"
    assert any("Sampling" in line for line in result.limitations)


def test_computes_real_frame_statistics():
    engine = load_engine()
    black = enc([0, 0, 0, 0])
    bright = enc([100, 150, 200, 250])
    result = engine.detect(
        engine.DetectionRequest(
            video_id="v1",
            frames_base64=[black, bright, bright],
            width=2,
            height=2,
            sample_frames=3,
        )
    )
    stats = result.statistics
    assert result.status == "computed"
    assert result.method == "frame-signal-statistics"
    assert stats.frame_count == 3
    assert stats.black_frame_count == 1
    assert stats.duplicate_frame_ratio == pytest.approx(0.5)
    assert stats.frames[0].black is True
    assert stats.frames[1].black is False
    assert stats.frames[1].luma_variance > 0
    assert result.indicators == []
    assert any("not deepfake" in line for line in result.limitations)


def test_rejects_wrong_frame_size_and_missing_dimensions():
    engine = load_engine()
    with pytest.raises(ValueError, match="width x height"):
        engine.detect(
            engine.DetectionRequest(video_id="v1", frames_base64=[enc([1, 2])], width=2, height=2)
        )
    with pytest.raises(ValueError, match="required"):
        engine.detect(
            engine.DetectionRequest(video_id="v1", frames_base64=[enc([1, 2, 3, 4])])
        )
