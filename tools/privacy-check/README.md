# Privacy check

Tiny helper that reports whether any privacy finding requires redaction.

## Usage

```ts
import { PrivacyCheckTool } from "@frithward/privacy-check";

const tool = new PrivacyCheckTool();
tool.needsRedaction([]); // false
tool.needsRedaction(["exif-gps"]); // true
```

## API

| Method | Input | Output |
| --- | --- | --- |
| `needsRedaction(findings)` | Readonly array of finding strings | `true` when the list is non-empty |

## Limitations

- Treats every finding as requiring action. It does not apply
  `PiiRedactionPolicy`, which allows low-severity device and timestamp
  metadata.
- No severity, remediation, or region handling.
- For real inspection and sanitized export, use `@frithward/privacy-core`.
