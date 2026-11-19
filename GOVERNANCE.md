# Governance

Frithward is an open-source project with a single-maintainer foundation and community contribution tracks: technology, public safety, accessibility, and research. It is hosted at https://github.com/richie-rich90454/frithward.

Decisions prioritize privacy, scientific integrity, and community ownership. The platform must remain useful independently of any single hosted operator.

## Roles

| Role | Responsibility |
| --- | --- |
| Maintainer | Accepts contributions, owns releases, coordinates security disclosure, and handles breaking changes. |
| Contributor | Proposes and implements changes inside a track. |
| Researcher | Supplies model cards, dataset notes, benchmarks, and evaluation methodology. |
| Community reviewer | Reviews for accessibility, plain language, and public-safety impact. |

There is no corporate contributor license agreement. Copyright stays with contributors, and code is licensed under Apache-2.0.

## Decision process

1. **Discuss.** Open an issue with the problem, constraints, and proposed scope. Security issues go through private reporting.
2. **Draft.** Write the smallest complete change, including tests and documentation.
3. **Review.** A maintainer reviews code, safety, privacy, and accessibility. Boundary and policy checks must pass.
4. **Merge.** The maintainer merges with a clear conventional commit message; one file per commit is the convention.
5. **Release.** Changes land in versioned releases with release notes.

Security fixes take priority and may bypass normal discussion, but they still require tests and a coordinated disclosure.

## Release policy

- Version numbers follow semantic versioning.
- Breaking changes require a migration note and a deprecation window.
- Model stages are independent of application versions.
- Experimental features are opt-in and labelled in the interface.
- Security advisories are published with a fix and a credit line unless the reporter asks to remain anonymous.

## Enforcement

- Module boundaries are enforced by `scripts/check-boundaries.mjs` and oxlint, with 11 self-tests.
- Formatting, linting, typechecking, and unit tests are enforced by `pnpm run check`.
- End-to-end and accessibility tests are run with `pnpm run test:e2e`.
- Documentation must match implemented behavior; no placeholders in released docs.
- Model and dataset use must follow the model and dataset policies.
- Never publish fabricated metrics, screenshots, or victims' private information.

## Policies

| Policy                                | Scope                                    |
| ------------------------------------- | ---------------------------------------- |
| [Privacy policy](PRIVACY.md)          | User data, execution location, retention |
| [Security policy](SECURITY.md)        | Reporting and coordinated disclosure     |
| [Threat model](THREAT_MODEL.md)       | Assets, boundaries, threats, controls    |
| [Model policy](MODEL_POLICY.md)       | Model cards, stages, and limitations     |
| [Dataset policy](DATASET_POLICY.md)   | Licensing, consent, and removal          |
| [Research policy](RESEARCH_POLICY.md) | Publication ethics and reproduction      |
| [Code of conduct](CODE_OF_CONDUCT.md) | Community behavior and enforcement       |

## Conflict of interest

Maintainers and contributors disclose paid work, model affiliations, and dataset ownership that could affect a decision. A maintainer with a conflict steps back from the merge decision.

## Transparency

- Decisions are documented in issues and pull requests.
- Security advisories are published after a fix is available.
- Benchmark results and model cards are published with their limitations, and unmeasured results are written as "not measured".
- Governance changes are proposed in the open and versioned with the documentation.
