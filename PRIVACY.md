# Privacy policy

Frithward is local-first: browser processing is the default execution path. The application must not upload media without explicit user direction.

No sale of user information. No advertising-driven data collection. No training on user uploads without separate explicit consent. No centralized biometric database.

Self-hosters control retention. Managed deployments publish retention policies separately.

## Scope

This policy describes the open-source software in this repository and the default self-hosted deployment. A managed operator may add its own terms, but must not silently weaken the guarantees below. Where a feature is experimental or opt-in, the interface says so.

## Data inventory

| Data | Collected how | Stored where | Purpose | Default execution |
| --- | --- | --- | --- | --- |
| Media files (image, audio, video, documents) | User selects files in the browser | Browser memory only for local runs; optional object storage (Garage) only after explicit user direction | Captions, media checks, privacy inspection, provenance verification | Local (browser/WASM) |
| Derived artifacts (transcripts, captions, detection scores, redacted copies) | Produced by analysis | Browser memory for local runs; PostgreSQL / Garage for opted-in self-hosted runs | Show results, support human review, evidence export | Local unless a worker is explicitly targeted |
| Project metadata (names, timelines, notes) | User input | Self-hosted PostgreSQL | Organize work | Self-hosted only |
| Provenance / C2PA assertions | Read from or written to user media | Browser memory; optionally self-hosted storage | Verify and record origin claims | Local |
| Account identity (email, name, credentials) | User registration via better-auth | Self-hosted PostgreSQL | Authenticate users of a self-hosted instance | Self-hosted only |
| Community and incident reports | User submissions | Self-hosted PostgreSQL | Support and safety workflows | Self-hosted only |
| Diagnostics (metrics, traces, logs) | Emitted by services | Operator-controlled Prometheus / Loki / OTLP backend | Availability and debugging | Self-hosted only |
| Minimal browser telemetry | None by default | Not collected | — | — |

Frithward does not collect biometric templates, device fingerprints, advertising identifiers, or precise location. Detection output is evidence for human review, not a biometric identity system.

## Subprocessors

**None for local execution.** All default processing happens in the user's browser and transfers no data to Frithward or third parties.

Self-hosted deployments choose their own infrastructure; the operator is the processor, not Frithward. The optional cloud or worker paths are only used when a user or operator explicitly configures them (for example a self-hosted inference worker or an external model endpoint). In that case the operator must publish the destination and its retention behavior. No analytics, advertising, or crash-reporting SDK is bundled.

## Retention

| Data | Local execution | Self-hosted deployment |
| --- | --- | --- |
| Media and derived artifacts | In-memory; discarded when the tab closes or the user clears it | Operator-defined; the shipped default retains until the user deletes the project |
| Projects and reports | Not persisted by the browser | Operator-defined retention; back up via pgBackRest and delete on request |
| Account identity | Not collected locally | Retained while the account is active, then deleted on request |
| Diagnostics | Not emitted | Operator-defined; the shipped configs keep Prometheus/Loki data on the operator's own storage |

There is no server-side retention timer in the software: the self-hosted operator owns retention policy and must publish it. Automated jobs must not extend retention beyond what the operator documents.

## Deletion and data-subject requests (DSR)

For a self-hosted instance the operator is the data controller and handles requests directly:

1. **Access / portability.** Export the user's projects and evidence through the application's export flow, or query the PostgreSQL database with `DATABASE_URL`.
2. **Deletion.** Delete the project (and any linked objects in Garage) in the application, then verify the rows and objects are gone. Delete the account record when the user asks to close it.
3. **Backups.** Deletion from live storage does not rewrite existing pgBackRest backups. Document the backup retention window and tell the user that residual copies age out with it, or perform a targeted backup purge where supported.
4. **Verification.** Record what was removed and when; respond to the requester with the outcome.
5. **Escalation.** Report a suspected failure to delete through the security contact in [SECURITY.md](SECURITY.md).

Local-only users hold all their own data: close the tab or clear browser storage, and no Frithward system retains a copy.

## Children

Frithward is not directed at children and does not knowingly collect their data. Self-hosted operators serving minors must apply their own safeguards.

## Changes

Privacy-affecting changes are reviewed under [GOVERNANCE.md](GOVERNANCE.md) and called out in [CHANGELOG.md](CHANGELOG.md). This policy reflects the software as shipped; it does not describe unreleased features.
