# Security changelog

This file records published security advisories for Frithward. It is intentionally separate from [CHANGELOG.md](CHANGELOG.md): release notes summarize features, this file is the authoritative list of security fixes and disclosures.

## Status

**No security advisories published yet.** There have been no released versions with a disclosed security defect, so no advisory rows exist below. This is a statement about published advisories, not a claim that no vulnerabilities exist. Report suspected issues privately through [SECURITY.md](SECURITY.md).

## Advisory record fields

Every future advisory must include all of the following fields. Missing values are written as "not assigned" or "not measured" — never invented.

| Field              | Description                                           |
| ------------------ | ----------------------------------------------------- |
| Advisory ID        | Local identifier, `FW-SA-YYYY-NNN`                    |
| CVE                | CVE identifier, or "not assigned"                     |
| Date published     | ISO date of public disclosure                         |
| Severity           | Critical / High / Medium / Low, with the rationale    |
| Affected component | Package, service, config, or model path affected      |
| Affected versions  | Version range, or "all releases before X"             |
| Description        | What the issue allowed, without exploit steps         |
| Fix                | The change that resolves it                           |
| Fixed version      | First release containing the fix                      |
| mitigation         | Operator action available before upgrading, or "none" |
| Credit             | Reporter, or "anonymous" if requested                 |
| References         | Issue, PR, commit, and upstream advisory links        |

## Advisories

_(none published)_

## Process

1. Receive a private report under [SECURITY.md](SECURITY.md).
2. Confirm the issue, assign an ID, assess severity, and prepare a fix with a regression test.
3. Decide on a CVE request where appropriate.
4. Release the fix, then publish the advisory here with a credit line unless the reporter asks to remain anonymous.
5. Link the advisory from the release entry in [CHANGELOG.md](CHANGELOG.md).

Security fixes take priority over normal work but still require tests and coordinated disclosure, as described in [GOVERNANCE.md](GOVERNANCE.md).
