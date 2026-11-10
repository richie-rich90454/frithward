# API reference

The API service is Hono-based and currently mounts three route groups: health,
scam analysis, and an auth session probe. OpenAPI 3.1 is used for the public
contract. Additional capabilities exist as in-process use cases and are listed
at the end of this document; they are not HTTP routes yet.

## Conventions

- Request and response bodies are JSON.
- Errors use `{ "code": ErrorCode, "message": string, "cause"?: string }`.
- `ErrorCode` is one of `VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`,
  `CANCELLED`, `PROCESSING_FAILED`, `EXTERNAL_UNAVAILABLE`, `UNAUTHORIZED`.
- No authentication is enforced on the mounted routes. Deployments must place
  the service behind their own access control.

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

Worker services add a `service` field: `orchestrator`, `media-worker`,
`inference-worker`, `community`, or `incident`.

### POST /api/scam/message

Analyzes message text for scam indicators.

- Route validation: `text` must be a string, otherwise `400`.
- Policy: empty text and text longer than 20,000 characters throw
  `VALIDATION_FAILED` in `ScamPolicy`. The route has no error middleware, so
  policy failures propagate as server errors unless the caller stays within
  limits.

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

`ScamIndicator` fields: `id`, `label`, `detail`, and `severity`
(`low`, `medium`, or `high`). The pattern table detects `urgency`, `payment`,
`credential`, and `secrecy`. `payment` and `credential` are high severity; the
others are medium.

### GET /api/auth/session

Reports whether an auth database is configured. The handler constructs
`better-auth` with the Drizzle Postgres adapter and returns a boolean. The
better-auth handlers themselves are not mounted.

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

`DATABASE_URL` defaults to a local development DSN. `BETTER_AUTH_SECRET` falls
back to a development secret and must be overridden in deployment.

## Component schemas

```yaml
components:
  schemas:
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

These operations are implemented and tested, but the API does not expose them
over HTTP. Tools and application controllers call them directly. This is the
accurate surface today; do not document them as deployed endpoints.

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

Finding kinds: `exif-gps`, `exif-device`, `exif-timestamp`, `pii-email`,
`pii-phone`, `pii-address`, `pii-name`. Severities are `low`, `medium`, or
`high`. `safeToShare` is true only when every finding is low severity.
`PiiRedactionPolicy` requires redaction for GPS and PII kinds, not for device
or timestamp metadata. `SanitizedExportUseCase` emits per-finding actions and a
`strip-metadata` action when no redaction region is supplied.

### Provenance detail

`ProvenanceRecord` carries `signatureStatus` (`valid`, `invalid`, or
`missing`), `signer`, `assetSha256`, and `manifest`. `describe` returns a
plain-language status. Signature verification itself is performed separately;
the current use case does not verify a manifest signature.

### Captions detail

`CaptionPolicy` enforces a 42-character line budget, a 20,000 ms maximum
segment duration, and non-overlapping segments. Export writes WebVTT (with
optional `<v speaker>` tags) or SRT. Empty projects are rejected.

### Jobs detail

`AnalyzeJobHandler` validates a non-empty job id and a non-empty `text`
payload. `runWorker` starts `graphile-worker` with `DATABASE_URL`. Job state
transitions follow the table in
[engineering standards](../engineering/standards.md#job-lifecycle).
