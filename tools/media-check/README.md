# Media check

Text summary helper for investigative media analysis. `MediaCheckTool` turns a
list of signal names into a sentence for review.

## Usage

```ts
import { MediaCheckTool } from "@frithward/media-check";

const tool = new MediaCheckTool();
tool.summarize([]); // "No signals detected."
tool.summarize(["inconsistent noise floor", "frame repeat"]);
// "2 signal(s) detected: inconsistent noise floor, frame repeat. This does not establish authenticity."
```

## API

| Method | Input | Output |
| --- | --- | --- |
| `summarize(signals)` | Readonly array of signal names | Summary string |

## Limitations

- Purely textual. It performs no analysis and holds no model metadata.
- For real analysis with limitations, model cards, and next steps, use
  `@frithward/media-analysis` (`MediaCheckController`).
- Signals are not proof of authenticity or manipulation.
