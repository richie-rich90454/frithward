# Document extraction engine

Deterministic regex field extraction from caller-supplied text (also accepts base64-encoded text or a UTF-8 text path). Emails, URLs, dates, postcodes and phone numbers are located with real offsets and heuristic confidence values. No learned extractor or model is configured.

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
| Response | `ExtractionResult { document_id, fields: dict[str, str], occurrences: list[ExtractedField { name, value, start, end, confidence }], status, reason, method, limitations }` |
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
- An empty field map means no supported pattern matched the supplied text; it does not mean unavailable.
- Only email, URL, date (ISO, slash, month-name), postcode (UK/US) and phone patterns are recognized; no other fields are invented.
- Confidence values are fixed ranking heuristics, not calibrated probabilities; overlapping matches are suppressed in favour of the more specific type.
- Extracted fields must be reviewed before use.
