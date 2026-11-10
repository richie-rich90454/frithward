---
title: Community
description: Contribution tracks, safety rules, accessibility, and research ethics.
---

# Community

Frithward Commons welcomes developers, researchers, educators, parents, older
adults, translators, journalists, and accessibility advocates. The project is
built in the open, and contributions are reviewed against the engineering
standards and the safety policies.

## Contribution tracks

| Track | What it covers |
| --- | --- |
| Technology | Packages, services, tools, engines, crates, and documentation. |
| Public safety | Scam guidance, victim-support wording, incident response, and education. |
| Accessibility | WCAG 2.2 AA, keyboard paths, reduced motion, contrast, and screen-reader support. |
| Research | Model and dataset notes, benchmarks, evaluation methodology, and model cards. |

## How to contribute

1. Read `CONTRIBUTING.md` and the engineering standards.
2. Open an issue describing the problem before large changes.
3. Implement the complete change, including callers, exports, and tests.
4. Run `pnpm run check` and, for engine work, the engine's pytest suite.
5. Open a pull request with a clear description and scope.

## Standards for contributions

- Keep domain logic framework-independent.
- Keep TSX rendering-only.
- Add a runnable test for new non-trivial logic.
- Do not add dependencies for a few lines of code.
- Use the smallest change that fully solves the task.
- Write commit messages in American English using conventional commits.

## Safety and privacy rules

- Never publish victims' private information.
- Never publish non-consensual identity datasets.
- Do not build tools whose primary purpose is impersonating real individuals.
- Detection results must be presented as evidence with limitations, not as
  verdicts.
- Consequential decisions require human review.
- Report vulnerabilities privately; do not open public issues for them.

## Accessibility expectations

- Interactive targets are at least 44px.
- Every control has a visible label; placeholders do not replace labels.
- Keyboard paths exist for all interactive features.
- Respect `prefers-reduced-motion` and `prefers-contrast`.
- Color is never the only signal for status.

## Research contributions

Research contributions must include a model card or dataset note, document
licenses and consent, and report measured results with their harness and
hardware. Missing measurements are reported as "not measured". See
[the research summary](/research).

## Community behavior

Be patient and assume good faith. Older adults and people under scam pressure
are primary users, so tone matters. Do not mock, blame, or accuse. Keep
discussion focused on the work and the safety outcome.

## Licensing

Code is Apache-2.0. Model weights, datasets, and documentation retain their
stated licenses. By contributing, you agree that your contribution is
licensed under the project's license for its track.
