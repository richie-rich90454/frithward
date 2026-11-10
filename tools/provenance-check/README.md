# Provenance check

Facade over `@frithward/provenance-core`. It describes the signature status of a
provenance record in plain language.

## Usage

```ts
import { ProvenanceRecord, VerifyProvenanceUseCase } from "@frithward/provenance-check";

const verifier = new VerifyProvenanceUseCase();
const record: ProvenanceRecord = {
    id: "asset-1",
    signatureStatus: "valid",
    signer: "Example News",
    assetSha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    manifest: "C2PA manifest",
};
verifier.describe(record); // "Signature valid; signer Example News."
```

## API

| Export | Purpose |
| --- | --- |
| `ProvenanceRecord` | `{ id, signatureStatus, signer, assetSha256, manifest }` |
| `VerifyProvenanceUseCase.describe` | Maps status to a human-readable string |

## Limitations

- Does not verify signatures, hashes, timestamps, or manifest history.
- A `missing` status means provenance is unavailable, not that the asset is
  authentic or manipulated.
- The Python provenance engine detects manifest presence only.
