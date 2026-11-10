# Caption tool

The caption tool is a facade over `@frithward/media-core`. It provides local caption projects, subtitle editing, and VTT/SRT export.

## Usage

```ts
import {
    CaptionProject,
    EditSubtitleUseCase,
    ExportSubtitlesUseCase,
    SubtitleSegment,
} from "@frithward/captions";

const project = new CaptionProject({ id: "p1", title: "Interview", language: "en" });
project.addSegment(new SubtitleSegment({ id: "p1-seg-0", startMs: 0, endMs: 1500, text: "Hello" }));
const vtt = new ExportSubtitlesUseCase().execute({ project, format: "vtt" });
```

## API

| Export                    | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `CaptionProject`          | Segment collection with overlap and policy enforcement |
| `SubtitleSegment`         | Timed text with speaker id                             |
| `CaptionPolicy`           | Line length, duration, and overlap rules               |
| `EditSubtitleUseCase`     | Edit text or timing through a `CaptionRepository`      |
| `GenerateCaptionsUseCase` | Recognize speech through a `SpeechRecognitionPort`     |
| `ExportSubtitlesUseCase`  | Render WebVTT or SRT                                   |
| `CaptionStudioController` | Selection and edit state for a view                    |

## Limitations

- A `CaptionRepository` must be supplied for edits and generation. The tool ships no persistent adapter.
- Export writes text only. It does not render video or burn subtitles.
- Speech recognition is a port; no recognizer is bundled.
- Caption policy defaults to 42 characters per line and 20,000 ms per segment.
