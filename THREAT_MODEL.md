# Threat model

This model covers the open-source software as shipped and a default self-hosted deployment. It is intentionally honest: mitigations that require operator action are marked as such, and nothing here claims a control that is not implemented.

## Assets

- User media (images, audio, video, documents) and derived artifacts (transcripts, detection scores, redacted copies).
- Identity and account information held by a self-hosted instance.
- Device processing capacity (browser/WASM and worker CPU/GPU).
- Stored projects, community reports, and incident timelines.
- Provenance (C2PA) assertions and evidence exports.
- The integrity of the build and release pipeline (source, dependencies, model artifacts).

## Trust boundaries

1. **Browser local execution** is trusted only for the integrity of the page it runs in. It is not a trusted environment for secrets or for verifying other users' content.
2. **Optional cloud / worker processing** is explicit and user-initiated. Once data is sent to a worker, that worker's operator is in the trust path.
3. **Self-hosted deployment** trusts the operator's network, host, and database controls. Frithward ships configuration but cannot enforce the operator's physical or network security.
4. **Third-party dependencies and model artifacts** are untrusted until pinned, scanned, and (for models) carded.

## Data flow (text diagram)

```
                        LOCAL-FIRST DEFAULT (no network egress)
  +-----------+   file pick   +----------------------+   in-memory   +-------------------+
  |   User    | ------------> | Browser / WASM UI    | ------------> | Results in tab    |
  +-----------+               | (captions, checks,   |               | (scores, captions)|
                              |  redaction, C2PA)    |               +-------------------+
                              +----------+-----------+
                                         | explicit "send to worker" only
                        OPTIONAL / SELF-HOSTED (operator controls this path)
                                         v
                              +----------------------+      TLS      +------------------+
                              | Caddy reverse proxy  | -----------> | API (:3000)      |
                              | COOP/COEP, auto HTTPS|              | + services 3001-5|
                              +----------+-----------+              +--------+---------+
                                         |                                   |
                                         | static                            | SQL / objects
                                         v                                   v
                              +----------------------+            +------------------------+
                              | apps/web/dist        |            | PostgreSQL 18          |
                              | (static files)       |            | Garage (object store)  |
                              +----------------------+            | pgBackRest backups     |
                                                                  +------------------------+
                              Observability: API/workers -> OTLP -> Prometheus/Loki -> Grafana
                                             (stays on operator infrastructure)
```

## Threats and mitigations

| ID | Threat | Severity | Mitigation | Status |
| --- | --- | --- | --- | --- |
| T-01 | Media exfiltration via hidden or implicit upload | High | Local-first processing; no network call without explicit user direction; boundary checks and code review | Implemented in software; verify in deployments |
| T-02 | Metadata leakage from media (EXIF, GPS, device IDs) | Medium | Privacy inspection and redaction features; document what each adapter strips | Partial — coverage depends on adapter |
| T-03 | Impersonation or synthetic-media fraud | High | Provenance/C2PA verification, detection scores labelled as evidence, human-review requirement | Implemented; detectors are not proof |
| T-04 | Phishing and scam content targeting users | High | Deterministic scam patterns plus reviewed examples; guidance framed as advisory | Implemented; accuracy not independently measured |
| T-05 | Insecure credential handling | High | better-auth with `BETTER_AUTH_SECRET` from the environment; no secrets in source; TLS via Caddy | Implemented; operator must protect the secret |
| T-06 | Cross-origin data access from a hostile page | Medium | COOP `same-origin` and COEP `require-corp` headers in the Caddy site block | Implemented in config |
| T-07 | Unauthorized access to a self-hosted instance | High | Caddy TLS, network controls, application auth; no default public exposure | Operator responsibility |
| T-08 | Supply-chain compromise via dependencies | High | Lockfile pinning, CI secret scanning, Syft SBOM generation, Trivy scanning | CI enforced; SBOM is generated, not yet attested |
| T-09 | Malicious or mislabelled model artifacts | High | Model cards with 13 required fields enforced by `scripts/check-model-cards.mjs`; stage gates in GOVERNANCE.md | Enforcement script lands with this change; cards land separately |
| T-10 | Data loss (database or object store failure) | Medium | pgBackRest archive + retention config and documented restore command | Config provided; operator must schedule and test restores |
| T-11 | Over-collection through diagnostics | Low | Metrics/traces/logs stay on operator infrastructure; no analytics SDK; see PRIVACY.md | Implemented |
| T-12 | Denial of service against workers or API | Medium | Rate limiting and resource limits are deployment concerns; keep workers behind the proxy | Not fully implemented — operator must add limits |
| T-13 | Insider or maintainer compromise of releases | Medium | Conventional commits, review, signed tags via Cosign on release tags | Guarded by release secrets; skipped honestly when absent |
| T-14 | Inaccurate capability claims (overclaiming detection) | Medium | Model cards must record limitations; "not measured" for absent metrics; research policy | Enforced by review and model cards |

## Residual risk

- Detection and protection models reduce risk but do not establish universal protection. A model stable on one dataset, language, or recording condition is not automatically stable on another.
- Self-hosted operators own host, network, backup, and secret management. Frithward cannot verify those controls.
- This is a living document. Changes are reviewed under [GOVERNANCE.md](GOVERNANCE.md).
