# Writing workshop

Paragraph and word-count helper. `WritingWorkshopTool` stores paragraphs and
counts whitespace-separated words.

## Usage

```ts
import { WritingWorkshopTool } from "@frithward/writing-workshop";

const tool = new WritingWorkshopTool();
tool.addParagraph("Keep people safe.");
tool.addParagraph("Keep media honest.");
tool.wordCount(); // 6
```

## API

| Method | Input | Output |
| --- | --- | --- |
| `addParagraph(text)` | Non-empty paragraph | Appends the paragraph |
| `wordCount()` | None | Whitespace-delimited word count across all paragraphs |

## Limitations

- Word count splits on whitespace. Hyphenated words and punctuation stay in the
  count.
- No rich-text model, outline export, or accessibility outline generation.
- In-memory only; no persistence.
