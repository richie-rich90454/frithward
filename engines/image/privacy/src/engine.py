"""Local, metadata-only image privacy inspection.

Reads EXIF from caller-supplied JPEG/PNG bytes using only the standard
library. No pixels are analyzed and no model is used. Fields are reported when
present; an explicit status explains when none were found.
"""
import base64
import struct
from pathlib import Path

from pydantic import BaseModel, Field

LIMITATIONS = [
    "Metadata can be stripped or forged; findings are not proof of origin or consent.",
    "Only JPEG APP1 EXIF and PNG eXIf blocks are parsed; XMP and IPTC are not decoded.",
    "An absent field is not evidence that the data never existed.",
    "This engine does not detect faces, plates, or documents in pixels.",
]

_TYPE_SIZE = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8}


class PrivacyRequest(BaseModel):
    image_id: str
    image_base64: str | None = None
    image_path: str | None = None


class MetadataField(BaseModel):
    tag: str
    value: str
    source: str


class PrivacyResult(BaseModel):
    image_id: str
    findings: list[str] = Field(default_factory=list)
    status: str = "no_metadata"
    detail: str = ""
    metadata: list[MetadataField] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


def _decode(endian: str, typ: int, count: int, raw: bytes):
    if typ == 2:
        return raw.split(b"\x00", 1)[0].decode("utf-8", errors="replace")
    fmt = {3: "H", 4: "I", 6: "b", 8: "h", 9: "i", 11: "f", 12: "d"}.get(typ)
    if fmt:
        if len(raw) < struct.calcsize(endian + fmt):
            return None
        values = [v[0] for v in struct.iter_unpack(endian + fmt, raw)]
        return values[0] if count == 1 else values
    if typ in (5, 10):
        fmt = "II" if typ == 5 else "ii"
        pairs = list(struct.iter_unpack(endian + fmt, raw))
        values = [num / den if den else None for num, den in pairs]
        return values[0] if count == 1 else values
    return raw.hex()


def _read_ifd(blob: bytes, offset: int, endian: str) -> dict[int, object]:
    tags: dict[int, object] = {}
    if offset < 0 or offset + 2 > len(blob):
        return tags
    count = struct.unpack_from(endian + "H", blob, offset)[0]
    for index in range(count):
        pos = offset + 2 + index * 12
        if pos + 12 > len(blob):
            break
        tag, typ, n = struct.unpack_from(endian + "HHI", blob, pos)
        size = _TYPE_SIZE.get(typ, 1) * n
        if size <= 4:
            raw = blob[pos + 8 : pos + 8 + size]
        else:
            value_offset = struct.unpack_from(endian + "I", blob, pos + 8)[0]
            raw = (
                blob[value_offset : value_offset + size]
                if value_offset + size <= len(blob)
                else b""
            )
        tags[tag] = _decode(endian, typ, n, raw)
    return tags


def _read_tiff(blob: bytes) -> dict[int, object]:
    if len(blob) < 8 or blob[:2] not in (b"II", b"MM"):
        return {}
    endian = "<" if blob[:2] == b"II" else ">"
    if struct.unpack_from(endian + "H", blob, 2)[0] != 42:
        return {}
    tags = _read_ifd(blob, struct.unpack_from(endian + "I", blob, 4)[0], endian)
    for pointer_tag in (0x8769, 0x8825):
        pointer = tags.get(pointer_tag)
        if isinstance(pointer, int) and not isinstance(pointer, bool):
            tags.update(_read_ifd(blob, pointer, endian))
    return tags


def _jpeg_exif(data: bytes) -> bytes:
    if data[:2] != b"\xff\xd8":
        return b""
    pos = 2
    while pos + 4 <= len(data):
        if data[pos] != 0xFF:
            pos += 1
            continue
        marker = data[pos + 1]
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            pos += 2
            continue
        if marker in (0xD9, 0xDA):
            break
        length = struct.unpack_from(">H", data, pos + 2)[0]
        if length < 2 or pos + 2 + length > len(data):
            break
        segment = data[pos + 4 : pos + 2 + length]
        if marker == 0xE1 and segment.startswith(b"Exif\x00\x00"):
            return segment[6:]
        pos += 2 + length
    return b""


def _png_exif(data: bytes) -> bytes:
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        return b""
    pos = 8
    while pos + 12 <= len(data):
        length = struct.unpack_from(">I", data, pos)[0]
        if pos + 12 + length > len(data):
            break
        if data[pos + 4 : pos + 8] == b"eXIf":
            return data[pos + 8 : pos + 8 + length]
        pos += 12 + length
    return b""


def _load_bytes(request: PrivacyRequest) -> bytes:
    if request.image_base64:
        try:
            return base64.b64decode(request.image_base64, validate=True)
        except ValueError as error:
            raise ValueError("image_base64 must be valid base64.") from error
    if request.image_path:
        return Path(request.image_path).read_bytes()
    return b""


def inspect(request: PrivacyRequest) -> PrivacyResult:
    if not request.image_id.strip():
        raise ValueError("Image id required.")
    data = _load_bytes(request)
    tiff = _jpeg_exif(data) or _png_exif(data)
    tags = _read_tiff(tiff) if tiff else {}

    metadata: list[MetadataField] = []
    for tag, label in (
        (0x010F, "Make"),
        (0x0110, "Model"),
        (0x0131, "Software"),
        (0x0132, "DateTime"),
        (0x9003, "DateTimeOriginal"),
        (0x9004, "DateTimeDigitized"),
    ):
        if tag in tags and tags[tag] is not None:
            metadata.append(MetadataField(tag=label, value=str(tags[tag]), source="exif"))
    for tag, label in ((2, "GPSLatitude"), (4, "GPSLongitude")):
        if tag in tags and tags[tag] is not None:
            metadata.append(MetadataField(tag=label, value=str(tags[tag]), source="exif-gps"))

    gps_present = any(0x0000 <= tag <= 0x001F for tag in tags)
    camera_present = any(f.tag in ("Make", "Model") for f in metadata)
    date_present = any("Date" in f.tag for f in metadata)

    findings: list[str] = []
    if gps_present:
        findings.append("GPS metadata present")
    if camera_present:
        findings.append("Camera make/model metadata present")
    if date_present:
        findings.append("Capture date/time metadata present")

    status = "inspected" if metadata or gps_present else "no_metadata"
    detail = (
        "Metadata fields were found in the supplied image."
        if status == "inspected"
        else "No EXIF metadata found (or no image bytes supplied)."
    )
    return PrivacyResult(
        image_id=request.image_id,
        findings=findings,
        status=status,
        detail=detail,
        metadata=metadata,
        limitations=list(LIMITATIONS),
    )
