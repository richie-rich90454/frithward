# Incident manager

Evidence timeline helper. `IncidentManagerTool` records evidence items and returns them sorted by collection time.

## Usage

```ts
import { IncidentManagerTool } from "@frithward/incident-manager";

const tool = new IncidentManagerTool();
tool.addEvidence({
    id: "ev-1",
    fileName: "message.png",
    sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    collectedAt: "2026-01-01T12:00:00.000Z",
    source: "SMS",
});
tool.listEvidence();
```

## API

| Method | Input | Output |
| --- | --- | --- |
| `addEvidence(item)` | `{ id, fileName, sha256, collectedAt, source }` | Adds the item; requires a non-empty hash |
| `listEvidence()` | None | Copy sorted by `collectedAt` |

## Limitations

- In-memory only. No persistence, export, or report generation.
- No duplicate detection and no hash format validation beyond non-empty.
- Sorting is lexicographic on `collectedAt`; supply ISO-8601 timestamps.
- Never publish victims' private information.
