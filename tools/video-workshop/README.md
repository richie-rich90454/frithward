# Video workshop

Track registry for video editing. `VideoWorkshopTool` stores caption and audio
track names and returns them sorted.

## Usage

```ts
import { VideoWorkshopTool } from "@frithward/video-workshop";

const tool = new VideoWorkshopTool();
tool.addTrack("Captions");
tool.addTrack("Narration");
tool.listTracks(); // ["Captions", "Narration"]
```

## API

| Method | Input | Output |
| --- | --- | --- |
| `addTrack(name)` | Non-empty track name | Adds the track; duplicates are ignored |
| `listTracks()` | None | Sorted, deduplicated track names |

## Limitations

- Stores names only. No timeline, preview, export, or container handling.
- In-memory only; no persistence.
- For trimming and container work, use the video processing engine.
