# Document OCR engine

Optical character recognition surface. The engine performs a read-only host check (`shutil.which('tesseract')`). If a tesseract binary is already present it runs real local OCR via subprocess on supplied bytes; otherwise it returns an explicit `unavailable` status with empty text and reports the exact check. Nothing is installed by the engine.

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
| Response | `OcrResult { document_id, text: str, status, reason, tesseract_path?, check, limitations }` |
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

- Empty output means no recognition was performed, not a blank document; `check` records the host lookup used.
- Tesseract must already exist on PATH; language data must be installed separately.
- Accuracy varies with scan quality, layout, and language.
- OCR errors propagate to extraction and redaction.
