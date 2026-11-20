# Document OCR engine

Optical character recognition surface. The engine validates the document id and accepts document bytes or a path, but returns an explicit `unavailable` status and empty text because no OCR engine is configured. Tesseract is the intended backend.

## Intended use

- Making scanned documents searchable and accessible.
- Preparing text for redaction and field extraction.

## Prohibited use

- Reading documents without authorization.
- Treating OCR output as an exact copy of the original.

## Interface

| Item | Value |
| --- | --- |
| Request | `OcrRequest { document_id, language = "en", document_base64?, document_path? }` |
| Response | `OcrResult { document_id, text: str, status, reason, limitations }` |
| Validation | `document_id` must be non-empty |
| Complexity | O(p) in pixels per page |
| Streaming | Per page |
| Cancellation | `AbortSignal` between pages |
| Model lifecycle | Language data loads separately from inference |

## Metrics

Character error rate and word error rate per language, plus per-page latency and memory.

## Model candidates and datasets

Tesseract is the intended backend. Language data must be licensed and documented. See the dataset policy.

## Limitations

- No text is recognized; empty output means unavailable, not a blank document.
- Accuracy varies with scan quality, layout, and language.
- OCR errors propagate to extraction and redaction.
