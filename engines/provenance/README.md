# Provenance engine

Content provenance inspection. The engine validates an asset id and reports
whether a manifest is present. It does not verify signatures, hashes,
timestamps, or transformation history.

## Intended use

- Checking whether a C2PA manifest is attached to an asset.
- Surfacing provenance status for human review.

## Prohibited use

- Claiming a manifest proves authenticity.
- Treating a missing manifest as evidence of manipulation.

## Interface

| Item | Value |
| --- | --- |
| Request | `ProvenanceRequest { asset_id: str, manifest: str \| None = None }` |
| Response | `ProvenanceResult { asset_id, status, detail }` |
| Status values | `present` when a manifest is supplied; `missing` otherwise |
| Validation | `asset_id` must be non-empty |
| Complexity | O(m) in manifest size |
| Streaming | Manifest streaming |
| Cancellation | `AbortSignal` |
| Model lifecycle | Deterministic validation needs no model; signature verification uses registered keys |

## Metrics

Signature verification success rate, manifest coverage, and validation failure
categories. Only measured results may be published.

## Model candidates and datasets

None. Provenance validation is cryptographic and rule-based.

## Limitations

- Manifest presence is not authenticity.
- Signature validation is separate and not implemented here.
- A missing manifest means provenance is unavailable, not that the asset is
  manipulated.
