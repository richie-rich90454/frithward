---
title: Privacy
description: Local-first privacy architecture, inspection, redaction, and retention.
---

# Privacy architecture

Frithward is local-first. Browser processing is the default execution path,
and hosted processing is explicit and independently deployable. The application
must not upload media without a clear user direction to do so.

## Principles

1. **Local by default.** Scam analysis, share checks, caption editing, and
   metadata inspection run in the browser. No hidden uploads.
2. **Explicit hosting.** `ExecutionRouter` returns `browser` unless a
   capability is explicitly overridden to `native` or `hosted`. Hosted adapters
   are opt-in and report `EXTERNAL_UNAVAILABLE` until wired.
3. **Data minimization.** Collect only the metadata needed for the operation.
   Do not build profiles or tracking identifiers.
4. **No training on uploads.** User media is never used to train models
   without separate, explicit consent.
5. **No biometric database.** Face and voice processing operates on the user's
   media. There is no centralized identity database.
6. **User control.** Self-hosters control retention and deletion.

## Execution locations

`ExecutionRouter.choose(capability)` returns the configured location.
`AppConfiguration` carries the base URL and default location. A capability
override is explicit code, not a network probe. This keeps the privacy decision
visible at the call site.

## Data inventory

| Data | Where it lives | Default |
| --- | --- | --- |
| Privacy inspection records | IndexedDB (`frithward-privacy`, `inspections` store) | Browser only |
| Caption projects | In-memory repository unless a persistent adapter is supplied | Browser memory |
| Auth users and sessions | Postgres via Drizzle | Only when the API is deployed |
| Scam analysis rows | Postgres `scam_analyses` table | Only when the API is deployed |
| Media objects | S3-compatible Garage bucket | Only when configured |
| Model inventory | `ModelManager` in memory | Browser memory |

The API's `DATABASE_URL` defaults to a local development DSN, and
`BETTER_AUTH_SECRET` falls back to a development secret. Deployments must
override both.

## Metadata inspection

`MetadataInspectionUseCase` inspects file metadata fields and reports findings
with severity, detail, and remediation.

| Kind | Severity | Trigger |
| --- | --- | --- |
| `exif-gps` | high | Any field whose name matches `gps` |
| `exif-device` | low | `make`, `model`, `camera`, `lensmodel` |
| `exif-timestamp` | low | DateTimeOriginal/DateTimeDigitized/CreateDate/ModifyDate |
| `pii-email` | high | Email pattern in a value |
| `pii-phone` | high | Phone pattern with 8–15 digits and separators |
| `pii-address` | high | Street-address pattern |
| `pii-name` | medium | `artist`, `creator`, `byline`, `author` |

`safeToShare` is true only when every finding is low severity. The use case
never transmits the metadata; it returns a result for local rendering.

`InspectPrivacyUseCase` is the small policy guard used by the web share check:
it throws `VALIDATION_FAILED` when any finding has kind `exif-gps`.

## Redaction and sanitized export

`PiiRedactionPolicy` defines which findings require redaction. By default:
`exif-gps`, `pii-email`, `pii-phone`, `pii-address`, and `pii-name` require
action; device and timestamp metadata do not. `RedactionRegion` stores
normalized coordinates (0–1) and validates that the region fits inside the
frame.

`SanitizedExportUseCase` produces a descriptor with:

- one action per finding (a region-specific instruction when a region is
  supplied, otherwise the finding's remediation),
- a `strip-metadata` action when metadata must be removed,
- the redaction regions,
- a `safeToShare` flag, and
- a human-readable summary.

The descriptor is a plan, not a file. Export code must apply the actions and
then verify the output. `ProtectedMediaExporter` in `@frithward/media-analysis`
writes an experimental manifest and requires artifact hashes to be verified
separately before distribution.

## Media privacy and protection

- **Image privacy engine**: detects face, license-plate, and document exposure
  with region hints.
- **Document redaction engine**: term and region redaction with exported
  validation.
- **Video redaction engine**: temporal face and plate redaction with per-frame
  regions.
- **Face and voice protection**: `FaceProtectionPolicy` and
  `VoiceProtectionPolicy` require documented consent and explicit experimental
  opt-in before any protection runs. `ProtectFaceUseCase` also enforces a
  minimum face size.

Protection is experimental. It must not be advertised as stable before
independent review.

## Browser storage

`IndexedDbPrivacyRepository` stores inspection records in an origin-private
database. It opens the database lazily, creates the object store on upgrade,
and rejects with `EXTERNAL_UNAVAILABLE` when IndexedDB is missing. There are no
tracking cookies and no third-party requests in the local path.

## Retention and deletion

Self-hosters control retention. The privacy repository stores records until the
user deletes them. Deployed operators publish their own retention policy. Model
artifacts and datasets follow the removal procedures in the dataset policy.

## What Frithward does not do

- No sale of user information.
- No advertising-driven data collection.
- No training on user uploads without separate explicit consent.
- No centralized biometric database.
- No hidden uploads or background synchronization.
- No access to other users' data by design; multi-user deployments rely on the
  operator's access controls.

## Threat model mapping

| Threat | Control |
| --- | --- |
| Media exfiltration through hidden uploads | Local-first default, explicit hosted opt-in |
| Metadata leakage | Metadata inspection and redaction planning |
| Impersonation via synthetic media | Detection evidence plus human review, never a verdict |
| Insecure credential handling | `better-auth`, environment secret, no client-side secret storage |
| Supply chain compromise | Lockfile pinning, SBOM, license and model-card review |
