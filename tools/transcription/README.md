# Transcription tool

Queue descriptor for local speech-to-text. `TranscriptionTool` validates a
request and returns a human-readable confirmation.

## Usage

```ts
import { TranscriptionTool } from "@frithward/transcription";

const tool = new TranscriptionTool();
tool.describe({ audioId: "clip-1", language: "en" });
// "Transcription queued for clip-1 in en."
```

## API

| Method | Input | Output |
| --- | --- | --- |
| `describe(request)` | `{ audioId, language }` | Confirmation string; throws when either field is empty |

## Limitations

- Does not transcribe audio. It only validates and describes a request.
- No execution-location selection. Use `ExecutionRouter` and the audio
  transcription engine for a real job.
- No language validation beyond non-empty input.
