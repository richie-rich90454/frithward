# Diagram workshop

Node registry for diagram tools. `DiagramWorkshopTool` tracks node identifiers and returns them in sorted order.

## Usage

```ts
import { DiagramWorkshopTool } from "@frithward/diagram-workshop";

const tool = new DiagramWorkshopTool();
tool.addNode("start");
tool.addNode("decision");
tool.listNodes(); // ["decision", "start"]
```

## API

| Method        | Input             | Output                              |
| ------------- | ----------------- | ----------------------------------- |
| `addNode(id)` | Non-empty node id | Adds the id; duplicates are ignored |
| `listNodes()` | None              | Sorted, deduplicated id list        |

## Limitations

- Stores node ids only. There are no edges, layout, or Mermaid rendering.
- In-memory only; no persistence or export.
- The accessible text alternative is the caller's responsibility.
