# Document redaction engine

Deterministic text redaction. The engine replaces each literal term found in the supplied text (or a local file) with a marker and reports every replacement with its original offsets. It performs no semantic detection and no OCR.

## Intended use

- Removing names, addresses, and identifiers before sharing a document.
- Preparing evidence copies with sensitive regions removed.

## Prohibited use

- Redacting evidence without preserving the original and a processing record.
- Claiming redaction guarantees the document cannot be reconstructed.

## Interface

| Item | Value |
| --- | --- |
| Request | `RedactionRequest { document_id: str, terms: list[str] = [], text: str = "", path: str \| None = None, replacement: str = "[REDACTED]", case_sensitive: bool = False }` |
| Response | `RedactionResult { document_id, redacted_count, redacted_text, redacted_bytes_b64, spans: list[RedactionSpan], limitations }` |
| Validation | `document_id` must be non-empty; empty terms are ignored |
| Complexity | O(n + t) in text length and term count |
| Streaming | Per page |
| Cancellation | `AbortSignal` between pages |
| Model lifecycle | Rule-based redaction needs no model; region detection would follow the standard lifecycle |

## Metrics

Redaction recall (sensitive spans removed) and false-positive rate, measured on a documented sample.

## Model candidates and datasets

No fixed candidate. Term lists and region models must be licensed and reviewed.

## Limitations

- Matching is literal and case-insensitive by default; it can miss variants and can over-redact.
- Overlapping matches are resolved by earliest start, then longest term.
- Exported validation is the caller's responsibility.
