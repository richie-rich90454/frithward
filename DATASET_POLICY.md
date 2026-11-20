# Dataset policy

Every dataset undergoes licensing, consent, and redistribution review before use. No non-consensual identity datasets. No default training on user uploads.

Maintain artifact-removal procedures. Respect source licenses and document demographic limitations where evaluation data permits. Dataset status stays "review required" until a reviewer records a decision.

## Artifact-removal procedure

This procedure removes user-derived data and dataset caches everywhere Frithward stores them. Records are deleted in order so that backups are not immediately rehydrated from an upstream copy. The requester and the executing operator must both be recorded in the incident or ticket.

### Storage locations

| Location | What it holds | Removal target |
| --- | --- | --- |
| Garage buckets (`infrastructure/storage/garage.toml`, region `frithward`) | Uploaded media, derived artifacts, exports | Every object key scoped to the affected user or dataset. |
| IndexedDB (browser/client) | Offline queue, cached media and transcripts | All object stores and their keys for the affected origin. |
| Postgres (`infrastructure/database/0001_init.sql`) | `user`, `session`, `scam_analyses`, `job_status`, plus result JSONB | Rows referencing the affected user or dataset, including `job_status.result`. |
| Dataset caches | Downloaded datasets, extracted frames, features, prediction JSONL | The dataset directory and every derived cache keyed by its name. |

### Deletion steps

1. **Scope.** Record the user id or dataset name, the incident id, and the list of object-key prefixes to remove. Freeze new writes for that scope.
2. **Garage.** Delete all objects matching the recorded prefixes. Confirm the bucket listing returns no matching keys.
3. **Postgres.** Delete dependent rows first (`job_status`, `scam_analyses`, `session`), then `user` if the request is a full account deletion. Commit the transaction and vacuum if required by the deployment.
4. **IndexedDB.** Clear the affected object stores from every signed-in client on next sync; also invalidate any cached export held by the worker.
5. **Dataset caches.** Delete the dataset directory and derived features; rebuild no derived artifact for the removed scope.
6. **Backups.** Mark the scope for expiry in the next backup rotation; do not restore a snapshot that contains it without reapplying steps 2-5.

### Verification

- Re-run the Garage listing and Postgres `SELECT` count for the scope; both must be empty.
- Confirm a fresh client sync leaves no IndexedDB records for the scope.
- Confirm no dataset-cache path resolves for the removed name.
- Record the verification output, operator, and timestamp in the ticket. If any check is non-empty, repeat the deletion before closing.

No deletion may be reported complete until every verification step passes.
