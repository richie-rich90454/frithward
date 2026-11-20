# Document extraction engine

Typed field extraction surface. The engine validates a document id, accepts text or document bytes/path, and returns an explicit `unavailable` status with an empty field map because no parser or model is configured.

## Intended use

- Pulling structured fields (dates, amounts, names) from OCR output.
- Assisting human review of forms and receipts.

## Prohibited use

- Fully automated decisions about a person based on extracted fields.
- Extracting data from documents the user does not have the right to process.

## Interface

| Item | Value |
| --- | --- |
| Request | `ExtractionRequest { document_id, text?, document_base64?, document_path? }` |
| Response | `ExtractionResult { document_id, fields: dict[str, str], status, reason, limitations }` |
| Validation | `document_id` must be non-empty |
| Complexity | O(n) in text length |
| Streaming | Per page |
| Cancellation | `AbortSignal` between pages |
| Model lifecycle | Rule-based extraction needs no model; a learned extractor follows the standard lifecycle |

## Metrics

Field-level precision, recall, and F1, reported per field type and language.

## Model candidates and datasets

No fixed candidate. Training data must be licensed and consented. See the dataset policy.

## Limitations

- Output quality depends on OCR quality.
- No fields are extracted; an empty map means unavailable, not that no fields exist.
- Extracted fields must be reviewed before use.
