"""FastAPI HTTP surface for the audio transcription engine.

The API is the real integration point. The underlying engine stays honest: it
returns an empty utterance because no speech model is configured in this repo.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parent))

from engine import TranscriptionRequest, transcribe

app = FastAPI(title="Frithward audio transcription")


class TranscribePayload(BaseModel):
    audio_id: str
    language: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/transcribe")
def transcribe_audio(payload: TranscribePayload) -> dict[str, object]:
    try:
        utterances = transcribe(TranscriptionRequest(**payload.model_dump()))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"utterances": [utterance.model_dump() for utterance in utterances]}
