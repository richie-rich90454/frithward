# Privacy OCR / NER candidate model card

Stage: `experimental`. Status: documentation-only candidate; no specific model selected and no weights in this repository.

## Intended use

Placeholder for a privacy OCR and named-entity-recognition candidate used to locate sensitive entities in documents before local redaction. Any detection is advisory input to human review.

## Prohibited use

Using detected entities to profile, target, or expose people, or treating a missed entity as proof that a document is safe to share.

## Architecture

not established in this repository.

## Training data

not established in this repository.

## Dataset licenses

not established in this repository. Document datasets containing personal data require license, consent, and redistribution review before use.

## Evaluation datasets

not established in this repository.

## Metrics

Planned: entity-level precision and recall, character error rate for OCR, and per-language/per-script performance. No values have been measured in this repository.

## Known biases

not established in this repository. Script, language, and document-quality sensitivity must be measured before any claim is made.

## Hardware requirements

not established in this repository.

## Runtime requirements

not established in this repository.

## Model license

not established in this repository. Model weights are not distributed by Frithward.

## Limitations

No model has been selected. Redaction remains the user's responsibility; automated entity detection is not exhaustive.

## Version history

| Version | Date | Change |
| --- | --- | --- |
| card-0.1 | 2026-11-20 | Initial documentation-only candidate card. |
