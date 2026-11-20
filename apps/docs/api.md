---
title: API reference
description: Implemented HTTP routes and in-process use cases.
---

# API reference

The API service is Hono-based. It mounts health, scam analysis, an auth session probe, module routes for privacy, provenance, captions, storage, and jobs, plus opt-in Case CRUD. OpenAPI 3.1 registers health, scam analysis, and the session probe; the Case endpoints and module routes are mounted but are not in `/api/openapi.json`. Additional capabilities exist as in-process use cases and are listed at the end of this document.

## Conventions

- Request and response bodies are JSON.
- Errors use `{ "code": ErrorCode, "message": string, "cause"?: string }`.
- `ErrorCode` is one of `VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`, `CANCELLED`, `PROCESSING_FAILED`, `EXTERNAL_UNAVAILABLE`, `UNAUTHORIZED`.
- Health, scam analysis, jobs, and `/metrics` are unauthenticated. Privacy, provenance, captions, storage, and Case routes require a session via `requireSession`, which returns 401 (`UNAUTHORIZED`) when none is present. Deployments must place the remaining routes behind their own access control.

## Implemented routes

### GET /health

Returns service status.

```yaml
/openapi:
    path: /health
    get:
        responses:
            "200":
                description: Service is reachable.
                content:
                    application/json:
                        schema:
                            type: object
                            properties:
                                status:
                                    type: string
                                    example: ok
```

Worker services add a `service` field: `orchestrator`, `media-worker`, `inference-worker`, `community`, or `incident`.

### POST /api/scam/message

Analyzes message text for scam indicators.

- Route validation: `text` must be a string, otherwise `400`.
- Policy: empty text and text longer than 20,000 characters throw `VALIDATION_FAILED` in `ScamPolicy`. The route has no error middleware, so policy failures propagate as server errors unless the caller stays within limits.

```yaml
/api/scam/message:
    post:
        requestBody:
            required: true
            content:
                application/json:
                    schema:
                        type: object
                        required: [text]
                        properties:
                            text:
                                type: string
                                minLength: 1
                                maxLength: 20000
        responses:
            "200":
                description: Analysis completed.
                content:
                    application/json:
                        schema:
                            type: object
                            properties:
                                indicators:
                                    type: array
                                    items:
                                        $ref: "#/components/schemas/ScamIndicator"
                                summary:
                                    type: string
                                nextSteps:
                                    type: array
                                    items:
                                        type: string
                                limitations:
                                    type: array
                                    items:
                                        type: string
                                createdAt:
                                    type: string
                                    format: date-time
            "400":
                description: Message text was missing.
                content:
                    application/json:
                        schema:
                            $ref: "#/components/schemas/ApiError"
```

`ScamIndicator` fields: `id`, `label`, `detail`, and `severity` (`low`, `medium`, or `high`). The pattern table detects `urgency`, `payment`, `credential`, and `secrecy`. `payment` and `credential` are high severity; the others are medium.

### GET /api/auth/session

Reports whether an auth database is configured. The handler constructs `better-auth` with the Drizzle Postgres adapter and returns a boolean. The better-auth handlers themselves are not mounted.

```yaml
/api/auth/session:
    get:
        responses:
            "200":
                description: Auth configuration probe.
                content:
                    application/json:
                        schema:
                            type: object
                            properties:
                                configured:
                                    type: boolean
```

`DATABASE_URL` has no default and is read only from the environment. `BETTER_AUTH_SECRET` is also read from the environment and is required when `NODE_ENV=production`; in development an ephemeral per-process secret is generated, so sessions do not survive a restart. There is no hardcoded secret or development DSN.

### /api/cases (opt-in)

Case CRUD is available only with `DATABASE_URL` configured (migration `0002_cases_and_reports.sql` creates the `cases` table). When it is absent, every Case route returns `503` with `code: EXTERNAL_UNAVAILABLE`. All Case routes are guarded by `requireSession`; a missing session returns `401` (`UNAUTHORIZED`). These routes are not registered in `/api/openapi.json`.

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| `POST` | `/api/cases` | `201` with the created case | `400` invalid body, `401`, `503` |
| `GET` | `/api/cases` | `200` with `{ "cases": [...] }`, newest first | `401`, `503` |
| `GET` | `/api/cases/:id` | `200` with the case | `401`, `404` not found, `503` |
| `PATCH` | `/api/cases/:id` | `200` with the updated case | `400`, `401`, `404`, `503` |
| `DELETE` | `/api/cases/:id` | `204` with no body | `401`, `404`, `503` |

```yaml
/api/cases:
    post:
        requestBody:
            required: true
            content:
                application/json:
                    schema:
                        $ref: "#/components/schemas/CreateCaseInput"
        responses:
            "201":
                description: Case created.
            "400":
                description: Validation failed.
            "401":
                description: Session required.
            "503":
                description: Case storage not configured.
/api/cases/{id}:
    get:
        responses:
            "200":
                description: Case record.
            "404":
                description: Case not found.
            "503":
                description: Case storage not configured.
```

`Case` fields: `id` (UUID), `kind` (`message`, `url`, `qr`, `file`, `provenance`, `evidence`), `title`, `inputs` (object), `findings` (`{ label, severity, detail }[]`), `artifacts` (`{ kind, name, hash?, url? }[]`), `nextSteps`, `limitations`, `status` (`draft`, `active`, `archived`), `createdAt`, and `updatedAt` (ISO date-time). `CreateCaseInput` requires `kind`, `title`, and `inputs`; findings, artifacts, next steps, limitations, and status are optional and default to empty arrays / `draft`. `UpdateCaseInput` makes every field optional. IDs and timestamps are server-generated.

### Other mounted module routes

These are mounted but not in the OpenAPI document. All except jobs and metrics require a session: `POST /api/privacy/inspect` and `/api/privacy/redact`, `POST /api/provenance/inspect`, `POST /api/captions/export`, `POST|GET /api/storage/:key` (503 when Garage is not configured), `GET /api/jobs/:id` (404 when unknown), and `GET /metrics`.

## Component schemas

```yaml
components:
    schemas:
        CaseKind:
            type: string
            enum: [message, url, qr, file, provenance, evidence]
        CaseStatus:
            type: string
            enum: [draft, active, archived]
        Case:
            type: object
            required: [id, kind, title, inputs, findings, artifacts, nextSteps, limitations, status, createdAt, updatedAt]
            properties:
                id:
                    type: string
                    format: uuid
                kind:
                    $ref: "#/components/schemas/CaseKind"
                title:
                    type: string
                inputs:
                    type: object
                findings:
                    type: array
                    items:
                        type: object
                        properties:
                            label: { type: string }
                            severity: { type: string, enum: [low, medium, high] }
                            detail: { type: string }
                artifacts:
                    type: array
                    items:
                        type: object
                        properties:
                            kind: { type: string }
                            name: { type: string }
                            hash: { type: string }
                            url: { type: string }
                nextSteps:
                    type: array
                    items: { type: string }
                limitations:
                    type: array
                    items: { type: string }
                status:
                    $ref: "#/components/schemas/CaseStatus"
                createdAt:
                    type: string
                    format: date-time
                updatedAt:
                    type: string
                    format: date-time
        CreateCaseInput:
            type: object
            required: [kind, title, inputs]
            properties:
                kind:
                    $ref: "#/components/schemas/CaseKind"
                title: { type: string }
                inputs: { type: object }
                findings: { type: array }
                artifacts: { type: array }
                nextSteps: { type: array }
                limitations: { type: array }
                status:
                    $ref: "#/components/schemas/CaseStatus"
        UpdateCaseInput:
            type: object
            description: All fields optional; omitted fields keep their previous value.
        ScamIndicator:
            type: object
            properties:
                id:
                    type: string
                label:
                    type: string
                detail:
                    type: string
                severity:
                    type: string
                    enum: [low, medium, high]
        ApiError:
            type: object
            properties:
                code:
                    type: string
                    enum:
                        - VALIDATION_FAILED
                        - NOT_FOUND
                        - CONFLICT
                        - CANCELLED
                        - PROCESSING_FAILED
                        - EXTERNAL_UNAVAILABLE
                        - UNAUTHORIZED
                message:
                    type: string
                cause:
                    type: string
```

## In-process use cases (not routed)

These operations are implemented and tested in-process. Some are also exposed by the module routes listed above; the rest are called directly by tools and application controllers. Do not treat this table as a list of HTTP endpoints — the mounted routes are documented above.

| Operation | Entry point | Input | Output |
| --- | --- | --- | --- |
| Privacy inspect | `MetadataInspectionUseCase.execute` | `MetadataPayload { fileName, fields }` | `MetadataInspectionResult { findings, remediation, safeToShare }` |
| Privacy policy check | `InspectPrivacyUseCase.execute` | `{ findings }` | `void`; throws `VALIDATION_FAILED` when `exif-gps` is present |
| Privacy redact | `SanitizedExportUseCase.execute` | `{ payload, findings, regions? }` | `SanitizedOutputDescriptor { actions, redactionRegions, safeToShare }` |
| Provenance inspect | `VerifyProvenanceUseCase.describe` | `ProvenanceRecord` | Human-readable signature status string |
| Captions export | `ExportSubtitlesUseCase.execute` | `{ project, format: "vtt" \| "srt" }` | Subtitle file text |
| Captions generate | `GenerateCaptionsUseCase.execute` | `{ project, audio, signal }` | `CaptionProject` |
| Captions edit | `EditSubtitleUseCase.execute` | `{ project, segmentId, text?, startMs?, endMs? }` | `CaptionProject` |
| Scam message analyze | `AnalyzeMessageUseCase.execute` | `text` | `ScamAnalysis` |
| URL inspect | `UrlInspectionUseCase.execute` | `rawUrl` | `UrlInspectionResult` |
| QR inspect | `QrInspectionUseCase.execute` | `payload` | `QrInspectionResult` |
| Scam report | `ScamReportUseCase.execute` | `{ channel, description, source, ... }` | `ScamReport` with SHA-256 evidence hash |
| Audio analysis | `AnalyzeAudioUseCase.execute` | `{ assetId, language?, signal }` | `DetectionReport` |
| Image analysis | `AnalyzeImageUseCase.execute` | `{ assetId, signal }` | `DetectionReport` |
| Video analysis | `AnalyzeVideoUseCase.execute` | `{ assetId, sampleFrames?, signal }` | `DetectionReport` |
| Multimodal analysis | `AnalyzeMultimodalUseCase.execute` | `{ assetId, modalities?, signal }` | `DetectionReport` |
| Face protection | `ProtectFaceUseCase.execute` | `{ assetId, image, consentDocumented, faceSizePx?, signal }` | `ProtectionResult` |
| Voice protection | `ProtectVoiceUseCase.execute` | `{ assetId, audio, consentDocumented, signal }` | `ProtectionResult` |
| Analysis report | `GenerateAnalysisReportUseCase.execute` | `DetectionReport` | `MediaAnalysisReport` with Markdown |
| Media check | `MediaCheckController.analyze` | `{ kind, assetId, signal }` | `MediaCheckViewModel` |
| Job validate | `AnalyzeJobHandler.handle` | `{ jobId, payload }` | `void`; throws on missing id or text |
| Job state | `ProcessingJob.transition` | `JobState` | New state; throws on illegal transition |

### Privacy inspection detail

Finding kinds: `exif-gps`, `exif-device`, `exif-timestamp`, `pii-email`, `pii-phone`, `pii-address`, `pii-name`. Severities are `low`, `medium`, or `high`. `safeToShare` is true only when every finding is low severity. `PiiRedactionPolicy` requires redaction for GPS and PII kinds, not for device or timestamp metadata. `SanitizedExportUseCase` emits per-finding actions and a `strip-metadata` action when no redaction region is supplied.

### Provenance detail

`ProvenanceRecord` carries `signatureStatus` (`valid`, `invalid`, `missing`, or `unverified`), `signer`, `assetSha256`, `manifest`, and `transformations`. `C2paInspectionUseCase` parses `c2pa.actions` assertions from a supplied manifest into `TransformationStep` entries (`action`, `actor`, `timestamp`, `assetHashBefore`, `assetHashAfter`, `detail`). Steps are read from the manifest only; when no `c2pa.actions` assertion is present the list is empty and a limitation note is recorded. No step is inferred or independently verified. `describe` appends a one-line summary: `N transformation(s) recorded` or `No transformation history available`. Signature verification itself is performed separately; the current use case does not verify a manifest signature. The provenance engine also parses an explicitly supplied `transformations` list from manifest JSON, without cryptographic verification.

### Captions detail

`CaptionPolicy` enforces a 42-character line budget, a 20,000 ms maximum segment duration, and non-overlapping segments. Export writes WebVTT (with optional `<v speaker>` tags) or SRT. Empty projects are rejected.

### Jobs detail

`AnalyzeJobHandler` validates a non-empty job id and a non-empty `text` payload. `runWorker` starts `graphile-worker` with `DATABASE_URL`. Job state transitions follow the [architecture job state machine](/architecture#job-state-machine).
