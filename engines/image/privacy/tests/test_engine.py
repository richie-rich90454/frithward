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


def _entry(tag, typ, count, value):
    return struct.pack("<HHII", tag, typ, count, value)


def _tiff_with_exif():
    """Little-endian TIFF with Make, Model, DateTime and a GPS IFD."""
    ifd0_offset = 8
    data_start = ifd0_offset + 2 + 4 * 12 + 4
    make_offset = data_start
    model_offset = make_offset + len(b"Canon\x00")
    date_offset = model_offset + len(b"EOS 5D\x00")
    gps_offset = date_offset + len(b"2026:01:02 12:34:56\x00")

    header = b"II" + struct.pack("<HI", 42, ifd0_offset)
    ifd0 = struct.pack("<H", 4)
    ifd0 += _entry(0x010F, 2, 6, make_offset)
    ifd0 += _entry(0x0110, 2, 7, model_offset)
    ifd0 += _entry(0x0132, 2, 20, date_offset)
    ifd0 += _entry(0x8825, 4, 1, gps_offset)
    ifd0 += struct.pack("<I", 0)

    gps = struct.pack("<H", 2)
    gps += _entry(1, 2, 2, int.from_bytes(b"N\x00\x00\x00", "little"))
    gps += _entry(3, 2, 2, int.from_bytes(b"W\x00\x00\x00", "little"))
    gps += struct.pack("<I", 0)

    return (
        header
        + ifd0
        + b"Canon\x00"
        + b"EOS 5D\x00"
        + b"2026:01:02 12:34:56\x00"
        + gps
    )


def _jpeg(exif=None):
    start = b"\xff\xd8"
    if exif is None:
        return start + b"\xff\xd9"
    payload = b"Exif\x00\x00" + exif
    return start + b"\xff\xe1" + struct.pack(">H", len(payload) + 2) + payload + b"\xff\xd9"


def test_rejects_empty_input():
    engine = load_engine()
    with pytest.raises(ValueError):
        engine.inspect(engine.PrivacyRequest(image_id=""))


def test_no_metadata_is_explicit():
    engine = load_engine()
    result = engine.inspect(engine.PrivacyRequest(image_id="i1"))
    assert result.findings == []
    assert result.status == "no_metadata"
    assert "No EXIF metadata found" in result.detail
    assert result.limitations


def test_bare_jpeg_reports_no_metadata():
    engine = load_engine()
    payload = base64.b64encode(_jpeg()).decode("ascii")
    result = engine.inspect(engine.PrivacyRequest(image_id="i1", image_base64=payload))
    assert result.status == "no_metadata"


def test_detects_gps_camera_and_date_from_jpeg():
    engine = load_engine()
    payload = base64.b64encode(_jpeg(_tiff_with_exif())).decode("ascii")
    result = engine.inspect(engine.PrivacyRequest(image_id="i2", image_base64=payload))
    assert result.status == "inspected"
    assert set(result.findings) == {
        "GPS metadata present",
        "Camera make/model metadata present",
        "Capture date/time metadata present",
    }
    values = {f.tag: f.value for f in result.metadata}
    assert values["Make"] == "Canon"
    assert values["Model"] == "EOS 5D"
    assert values["DateTime"] == "2026:01:02 12:34:56"


def test_reads_image_from_path(tmp_path):
    engine = load_engine()
    target = tmp_path / "sample.jpg"
    target.write_bytes(_jpeg(_tiff_with_exif()))
    result = engine.inspect(engine.PrivacyRequest(image_id="i3", image_path=str(target)))
    assert result.status == "inspected"
    assert "GPS metadata present" in result.findings


def test_rejects_invalid_base64():
    engine = load_engine()
    with pytest.raises(ValueError, match="valid base64"):
        engine.inspect(engine.PrivacyRequest(image_id="i4", image_base64="!!!"))
