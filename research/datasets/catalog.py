"""Dataset catalog with license and consent review placeholders.

No entry in this catalog is approved for use. Every dataset starts as
"review required" and consent is unconfirmed until a review records otherwise.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class DatasetEntry:
    name: str
    license_status: str = "review required"
    consent_flag: bool = False
    notes: str = ""


CATALOG: tuple[DatasetEntry, ...] = (
    DatasetEntry(name="librispeech", notes="English audiobook speech."),
    DatasetEntry(name="common-voice", notes="Crowd-sourced speech."),
    DatasetEntry(name="voxceleb", notes="Celebrity speech and video."),
    DatasetEntry(name="asvspoof-2019", notes="Anti-spoofing speech corpus."),
    DatasetEntry(name="fakeavceleb", notes="Deepfake audio and video."),
    DatasetEntry(name="celeb-df", notes="Deepfake video."),
    DatasetEntry(name="faceforensics++", notes="Manipulated video."),
    DatasetEntry(name="coco", notes="General object images."),
    DatasetEntry(name="imagenet", notes="General object images."),
    DatasetEntry(name="docvqa", notes="Document images and questions."),
    DatasetEntry(name="funsd", notes="Form document images."),
    DatasetEntry(name="sroie", notes="Receipt images."),
    DatasetEntry(name="enron-spam", notes="Email text."),
    DatasetEntry(name="wikipedia", notes="Encyclopedia text."),
)


def list_entries() -> tuple[DatasetEntry, ...]:
    return CATALOG


def get(name: str) -> DatasetEntry | None:
    for entry in CATALOG:
        if entry.name == name:
            return entry
    return None
