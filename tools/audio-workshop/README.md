# Audio workshop

Non-destructive edit list for audio work. `AudioWorkshopTool` stores time ranges and returns them for rendering a waveform or edit timeline.

## Usage

```ts
import { AudioWorkshopTool } from "@frithward/audio-workshop";

const tool = new AudioWorkshopTool();
tool.addEdit({ id: "edit-1", startMs: 0, endMs: 1200 });
tool.listEdits(); // [{ id: "edit-1", startMs: 0, endMs: 1200 }]
```

## API

| Method          | Input                    | Output                                       |
| --------------- | ------------------------ | -------------------------------------------- |
| `addEdit(edit)` | `{ id, startMs, endMs }` | Adds an edit; throws when `endMs <= startMs` |
| `listEdits()`   | None                     | Copy of the edit list in insertion order     |

## Limitations

- In-memory only. There is no persistence, undo, or serialization.
- No overlap detection and no duplicate-id rejection.
- No playback, waveform rendering, gain, or noise-floor processing. Those live in the audio engines when they are wired.
