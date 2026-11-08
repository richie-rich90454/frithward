# Threat model

## Assets

User media, identity information, device processing capacity, stored projects, and evidence exports.

## Boundaries

- Browser local execution is trusted only for the integerity of the page.
- Optional cloud processing is explicit and user-initiated.
- Self-hosted deployments trust the operator's network controls.

## Threats

Media exfiltration through hidden uploads, impersonation via synthetic media, phishing and scams, metadata leakage, insecure credential handling, and supply chain compromise through dependencies and model artifacts.

## Controls

Local-first execution, explicit execution location, dependency pinning, SBOM generation, secret scanning, and minimal network surface.
