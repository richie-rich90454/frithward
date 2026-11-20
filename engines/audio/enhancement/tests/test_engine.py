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


def _pcm(values, width=2):
    if width == 1:
        return bytes(value + 128 for value in values)
    fmt = {2: "<h", 4: "<i"}[width]
    return struct.pack(f"<{len(values)}{fmt[1:]}", *values)


def _samples(raw, width=2):
    if width == 1:
        return [value - 128 for value in raw]
    fmt = {2: "h", 4: "i"}[width]
    return list(struct.unpack(f"<{len(raw) // width}{fmt}", raw))


def test_rejects_empty_input():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.enhance(engine.EnhancementRequest(audio_id=""))


def test_applies_gain_field_without_samples():
    engine = load_engine()
    result = engine.enhance(engine.EnhancementRequest(audio_id="a1", gain_db=2.0))
    assert result.gain_db == 2.0
    assert result.sample_count == 0
    assert result.processed_pcm_base64 is None
    assert any("No PCM" in line for line in result.limitations)


def test_rejects_whitespace_id():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.enhance(engine.EnhancementRequest(audio_id="   "))


def test_rejects_invalid_width_and_gain():
    engine = load_engine()
    with pytest.raises(ValueError, match="sample_width"):
        engine.enhance(engine.EnhancementRequest(audio_id="a1", sample_width=3))
    with pytest.raises(ValueError, match="gain_db"):
        engine.enhance(engine.EnhancementRequest(audio_id="a1", gain_db=500))


def test_gain_is_applied_and_clipped():
    engine = load_engine()
    raw = _pcm([0, 1000, -1000, 16000])
    result = engine.enhance(
        engine.EnhancementRequest(
            audio_id="a1", gain_db=12.0, pcm_base64=base64.b64encode(raw).decode("ascii")
        )
    )
    assert result.sample_count == 4
    assert result.clipped_count == 1
    assert result.peak_before == pytest.approx(16000 / 32768, abs=1e-5)
    assert result.peak_after == pytest.approx(32767 / 32768, abs=1e-6)
    out = base64.b64decode(result.processed_pcm_base64)
    assert _samples(out) == [0, 3981, -3981, 32767]


def test_eight_bit_samples_round_trip_at_unity_gain():
    engine = load_engine()
    raw = _pcm([0, 72, -72, 127], width=1)
    result = engine.enhance(
        engine.EnhancementRequest(
            audio_id="a1", pcm_base64=base64.b64encode(raw).decode("ascii"), sample_width=1
        )
    )
    assert _samples(base64.b64decode(result.processed_pcm_base64), width=1) == [0, 72, -72, 127]
    assert result.clipped_count == 0


def test_rejects_invalid_base64():
    engine = load_engine()
    with pytest.raises(ValueError, match="valid base64"):
        engine.enhance(engine.EnhancementRequest(audio_id="a1", pcm_base64="***"))
