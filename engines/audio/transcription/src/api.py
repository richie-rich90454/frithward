"""FastAPI HTTP surface for the audio transcription engine.

The API is the real integration point. The underlying engine stays honest: it
returns no utterances because no speech model is configured in this repo, but
it reports a real PCM preflight when audio bytes are supplied.
"""
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parent))

from engine import TranscriptionRequest, transcribe_detailed

app = FastAPI(title="Frithward audio transcription")


class TranscribePayload(BaseModel):
    audio_id: str
    language: str
    audio_base64: str | None = None
    audio_path: str | None = None
    sample_rate: int = 16000
    sample_width: int = 2


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/transcribe")
def transcribe_audio(payload: TranscribePayload) -> dict[str, object]:
    try:
        result = transcribe_detailed(TranscriptionRequest(**payload.model_dump()))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "status": result.status,
        "reason": result.reason,
        "utterances": [utterance.model_dump() for utterance in result.utterances],
        "preflight": result.preflight.model_dump() if result.preflight else None,
        "limitations": result.limitations,
    }
