# Image workshop

Region list for image editing and redaction. `ImageWorkshopTool` stores rectangular redaction regions.

## Usage

```ts
import { ImageWorkshopTool } from "@frithward/image-workshop";

const tool = new ImageWorkshopTool();
tool.addRegion({ id: "face", x: 0.1, y: 0.2, width: 0.3, height: 0.3 });
tool.listRegions();
```

## API

| Method | Input | Output |
| --- | --- | --- |
| `addRegion(region)` | `{ id, x, y, width, height }` | Adds the region; throws when width or height is not positive |
| `listRegions()` | None | Copy of the region list in insertion order |

## Limitations

- Coordinates are not validated against a frame. The caller must keep regions inside the image.
- No overlap detection, no duplicate-id rejection.
- In-memory only. No rendering, blur, pixelation, or export.
- For stronger validation, use `RedactionRegion` from `@frithward/privacy-core`.
