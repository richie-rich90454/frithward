# Document OCR engine

Optical character recognition with per-page text. The engine validates the
document id and language and returns text. The scaffold returns empty text;
Tesseract is the intended backend.

## Intended use

- Making scanned documents searchable and accessible.
- Preparing text for redaction and field extraction.

## Prohibited use

- Reading documents without authorization.
- Treating OCR output as an exact copy of the original.

## Interface

| Item | Value |
| --- | --- |
| Request | `OcrRequest { document_id: str, language: str = "en" }` |
| Response | `OcrResult { document_id, text: str }` |
| Validation | `document_id` must be non-empty |
| Complexity | O(p) in pixels per page |
| Streaming | Per page |
| Cancellation | `AbortSignal` between pages |
| Model lifecycle | Language data loads separately from inference |

## Metrics

Character error rate and word error rate per language, plus per-page latency
and memory.

## Model candidates and datasets

Tesseract is the intended backend. Language data must be licensed and
documented. See the dataset policy.

## Limitations

- The scaffold does not recognize text.
- Accuracy varies with scan quality, layout, and language.
- OCR errors propagate to extraction and redaction.
