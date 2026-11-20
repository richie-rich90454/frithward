# Image privacy engine

Local metadata inspection for caller-supplied JPEG/PNG bytes. The engine parses EXIF directly with the standard library (JPEG APP1 and PNG eXIf) and reports GPS, camera make/model, and capture-date fields when present, with an explicit `no_metadata` status when none are found. It does not analyze pixels or detect faces, plates, or documents.

## Intended use

- Pre-share privacy checks on the user's own images.
- Highlighting regions that may need redaction.

## Prohibited use

- Building face recognition or identification systems.
- Processing images of people without a lawful basis and consent.

## Interface

| Item            | Value                                             |
| --------------- | ------------------------------------------------- |
| Request         | `PrivacyRequest { image_id: str, image_base64: str \| None, image_path: str \| None }` |
| Response        | `PrivacyResult { image_id, findings: list[str], status, detail, metadata: list[MetadataField], limitations }` |
| Validation      | `image_id` must be non-empty; base64 must be valid |
| Complexity      | O(b) in supplied bytes                            |
| Streaming       | Block                                             |
| Cancellation    | Not cancellable                                   |
| Model lifecycle | No model; standard-library EXIF parsing only      |

## Metrics

Not applicable: fields are read directly, not inferred. Evaluation would measure parser coverage against a documented image corpus.

## Model candidates and datasets

No fixed candidate. Training and evaluation data must be licensed and consented; no non-consensual identity datasets. See the dataset policy.

## Limitations

- Metadata can be stripped or forged; findings are not proof of origin or consent.
- XMP and IPTC blocks are not decoded; only EXIF is parsed.
- An absent field is not evidence that the data never existed.
