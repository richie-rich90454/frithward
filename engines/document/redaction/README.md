# Document redaction engine

Term and region redaction with exported validation. The engine validates a
document id and returns a redaction count. The scaffold counts terms without
rewriting the document.

## Intended use

- Removing names, addresses, and identifiers before sharing a document.
- Preparing evidence copies with sensitive regions removed.

## Prohibited use

- Redacting evidence without preserving the original and a processing record.
- Claiming redaction guarantees the document cannot be reconstructed.

## Interface

| Item | Value |
| --- | --- |
| Request | `RedactionRequest { document_id: str, terms: list[str] = [] }` |
| Response | `RedactionResult { document_id, redacted_count: int }` |
| Validation | `document_id` must be non-empty |
| Complexity | O(n + t) in text length and term count |
| Streaming | Per page |
| Cancellation | `AbortSignal` between pages |
| Model lifecycle | Rule-based redaction needs no model; region detection would follow the standard lifecycle |

## Metrics

Redaction recall (sensitive spans removed) and false-positive rate, measured on
a documented sample.

## Model candidates and datasets

No fixed candidate. Term lists and region models must be licensed and reviewed.

## Limitations

- The scaffold does not rewrite text.
- Term matching can miss variants and can over-redact.
- Exported validation is the caller's responsibility.
