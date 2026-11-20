# Provenance engine

Content provenance inspection. The engine validates an asset id, reports whether a manifest is present, and parses any transformation history supplied in the manifest JSON. It does not verify signatures, hashes, or timestamps.

## Intended use

- Checking whether a C2PA manifest is attached to an asset.
- Surfacing the transformation steps listed in a supplied manifest for human review.
- Surfacing provenance status for human review.

## Prohibited use

- Claiming a manifest proves authenticity.
- Treating a missing manifest as evidence of manipulation.
- Treating parsed transformation steps as verified facts about the asset's history.

## Interface

| Item | Value |
| --- | --- |
| Request | `ProvenanceRequest { asset_id: str, manifest: str \| None = None }` |
| Response | `ProvenanceResult { asset_id, status, detail, transformations }` |
| Transformation | `TransformationStep { action, actor?, timestamp?, detail? }` |
| Status values | `present` when a manifest is supplied; `missing` otherwise |
| Validation | `asset_id` must be non-empty; manifest must be a JSON object; `transformations` must be a list of objects with a non-empty string `action`, and `actor`/`timestamp`/`detail` must be strings or null |
| Complexity | O(m) in manifest size |
| Streaming | Manifest streaming |
| Cancellation | `AbortSignal` |
| Model lifecycle | Deterministic validation needs no model; signature verification uses registered keys |

The engine reads `transformations` from the supplied manifest only. It does not invent steps: when the manifest has no `transformations` list, the result carries an empty list.

## Metrics

Signature verification success rate, manifest coverage, transformation-list coverage, and validation failure categories. Only measured results may be published.

## Model candidates and datasets

None. Provenance validation is cryptographic and rule-based.

## Limitations

- Manifest presence is not authenticity.
- Signature validation is separate and not implemented here.
- Parsed transformation steps are claimed by the manifest; no cryptographic verification is performed.
- A missing manifest means provenance is unavailable, not that the asset is manipulated.
