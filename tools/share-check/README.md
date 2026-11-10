# Share check

Facade over `@frithward/privacy-core`. It inspects file metadata, plans redaction, and produces a sanitization descriptor.

## Usage

```ts
import {
    MetadataInspectionUseCase,
    SanitizedExportUseCase,
    ShareCheckController,
} from "@frithward/share-check";

const result = new MetadataInspectionUseCase().execute({
    fileName: "photo.jpg",
    fields: { GPSLatitude: "40.7128", Artist: "Jane Doe" },
});
const descriptor = new SanitizedExportUseCase().execute({
    payload: { fileName: "photo.jpg", fields: { GPSLatitude: "40.7128" } },
    findings: result.findings,
});
```

## API

| Export                       | Purpose                                         |
| ---------------------------- | ----------------------------------------------- |
| `MetadataInspectionUseCase`  | Detects GPS, device, timestamp, and PII fields  |
| `PiiRedactionPolicy`         | Decides which findings require redaction        |
| `RedactionRegion`            | Normalized region coordinates                   |
| `SanitizedExportUseCase`     | Produces actions, regions, and a safety summary |
| `ShareCheckController`       | Web-facing inspection and export controller     |
| `IndexedDbPrivacyRepository` | Optional browser persistence                    |

## Limitations

- Inspection is field-based. It cannot see metadata your extractor did not provide.
- The sanitized export is a plan, not a rewritten file.
- GPS and PII findings block sharing; low-severity device and timestamp findings do not.
