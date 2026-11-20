# Image protection engine

Experimental face protection research surface. The engine validates an image id, accepts image bytes or a path, and returns an explicit `unavailable` status with `protected: false`. It does not apply a protection transform.

## Intended use

- Research on reducing the ability to match or synthesize a depicted person.
- Consensual protection of a person's own image.

## Prohibited use

- Impersonating a real individual.
- Protecting an image of a person without documented consent.
- Advertising protection as stable before independent review.

## Interface

| Item            | Value                                            |
| --------------- | ------------------------------------------------ |
| Request         | `ProtectionRequest { image_id, image_base64?, image_path? }` |
| Response        | `ProtectionResult { image_id, protected, status, reason, limitations }` |
| Validation      | `image_id` must be non-empty                     |
| Complexity      | Model-specific                                   |
| Streaming       | Frame                                            |
| Cancellation    | Between frames                                   |
| Model lifecycle | Stage-gated; load once, warm up, infer, release  |

## Metrics

Independent evaluation, attack success rate, demographic limitations, and human review. No single metric establishes protection.

## Model candidates and datasets

No fixed candidate. Training and evaluation data must be consented and licensed. See `research/image-protection` and the dataset policy.

## Limitations

- No protection is applied and no success is claimed (`protected` is always false).
- Consent and experimental opt-in are enforced by `FaceProtectionPolicy` in `@frithward/media-analysis`.
- Protection claims require independent evaluation.
