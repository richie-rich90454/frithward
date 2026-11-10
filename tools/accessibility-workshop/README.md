# Accessibility workshop

Small helper for the accessibility track. `AccessibilityWorkshopTool` checks one common form requirement: a visible label.

## Usage

```ts
import { AccessibilityWorkshopTool } from "@frithward/accessibility-workshop";

const tool = new AccessibilityWorkshopTool();
tool.checkLabel(true); // "Labels present."
tool.checkLabel(false); // "Add a visible label; placeholders do not replace labels."
```

## API

| Method                          | Input                          | Output          |
| ------------------------------- | ------------------------------ | --------------- |
| `checkLabel(hasLabel: boolean)` | Whether a visible label exists | Guidance string |

## Limitations

- Checks labels only. It does not audit contrast, keyboard paths, focus order, ARIA roles, or reduced motion.
- It does not parse DOM or TSX. Pass the result of your own inspection.
- For a full audit, use a linter and an accessibility review alongside this helper.
