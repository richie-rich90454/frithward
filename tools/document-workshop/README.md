# Document workshop

Page registry for document tools. `DocumentWorkshopTool` tracks page numbers and returns them in ascending order.

## Usage

```ts
import { DocumentWorkshopTool } from "@frithward/document-workshop";

const tool = new DocumentWorkshopTool();
tool.addPage(3);
tool.addPage(1);
tool.listPages(); // [1, 3]
```

## API

| Method                | Input            | Output                                |
| --------------------- | ---------------- | ------------------------------------- |
| `addPage(pageNumber)` | Positive integer | Adds the page; duplicates are ignored |
| `listPages()`         | None             | Sorted page numbers                   |

## Limitations

- Tracks page numbers only. No preview, OCR, redaction, or export.
- In-memory only; no persistence.
- For OCR and redaction behavior, use the document engines.
