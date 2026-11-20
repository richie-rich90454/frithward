import base64
import importlib.util
import struct
from pathlib import Path

import pytest


def load_engine():
    path = Path(__file__).parent.parent / "src" / "engine.py"
    spec = importlib.util.spec_from_file_location("engine", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def pcm16(*samples):
    return base64.b64encode(struct.pack(f"<{len(samples)}h", *samples)).decode("ascii")


def test_rejects_invalid_requests():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.detect(engine.DetectionRequest(audio_id=""))
    with pytest.raises(ValueError):
        engine.detect(engine.DetectionRequest(audio_id="a1", sample_rate=0))
    with pytest.raises(ValueError):
        engine.detect(engine.DetectionRequest(audio_id="a1", sample_width=3))


def test_no_input_reports_unavailable():
    engine = load_engine()
    result = engine.detect(engine.DetectionRequest(audio_id="a1"))
    assert result.statistics is None
    assert result.indicators == []
    assert result.status == "unavailable"
    assert "No local" in result.reason


def test_computes_real_signal_statistics_and_segments():
    engine = load_engine()
    samples = [0] * 10 + [10000] * 10
    result = engine.detect(
        engine.DetectionRequest(
            audio_id="a1", audio_base64=pcm16(*samples), sample_rate=100
        )
    )
    stats = result.statistics
    assert result.status == "computed"
    assert result.method == "pcm-signal-statistics"
    assert stats.sample_count == 20
    assert stats.duration_ms == 200
    assert stats.frame_count == 10
    assert stats.peak == pytest.approx(10000 / 32768, abs=1e-5)
    assert 0 < stats.rms < stats.peak
    assert stats.clipping_count == 0
    assert stats.speech_segments and stats.silence_segments
    assert result.indicators == []
    assert any("not synthetic-speech detection" in line for line in result.limitations)


def test_counts_clipping_samples():
    engine = load_engine()
    result = engine.detect(
        engine.DetectionRequest(
            audio_id="a1", audio_base64=pcm16(32767, -32768, 0, 0), sample_rate=100
        )
    )
    assert result.statistics.clipping_count == 2


def test_supports_8bit_unsigned_pcm():
    engine = load_engine()
    raw = base64.b64encode(bytes([128, 128, 255, 0])).decode("ascii")
    result = engine.detect(
        engine.DetectionRequest(audio_id="a1", audio_base64=raw, sample_width=1, sample_rate=100)
    )
    assert result.status == "computed"
    assert result.statistics.sample_count == 4
    assert result.statistics.peak == pytest.approx(1.0, abs=1e-3)


def test_rejects_misaligned_bytes():
    engine = load_engine()
    raw = base64.b64encode(b"\x01\x02\x03").decode("ascii")
    with pytest.raises(ValueError, match="aligned"):
        engine.detect(engine.DetectionRequest(audio_id="a1", audio_base64=raw, sample_width=2))
