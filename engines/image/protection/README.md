# Image protection engine

Experimental face protection research. The engine validates an image id and
returns `protected: true`. It does not apply a protection transform.

## Intended use

- Research on reducing the ability to match or synthesize a depicted person.
- Consensual protection of a person's own image.

## Prohibited use

- Impersonating a real individual.
- Protecting an image of a person without documented consent.
- Advertising protection as stable before independent review.

## Interface

| Item | Value |
| --- | --- |
| Request | `ProtectionRequest { image_id: str }` |
| Response | `ProtectionResult { image_id, protected: bool }` |
| Validation | `image_id` must be non-empty |
| Complexity | Model-specific |
| Streaming | Frame |
| Cancellation | Between frames |
| Model lifecycle | Stage-gated; load once, warm up, infer, release |

## Metrics

Independent evaluation, attack success rate, demographic limitations, and
human review. No single metric establishes protection.

## Model candidates and datasets

No fixed candidate. Training and evaluation data must be consented and
licensed. See `research/image-protection` and the dataset policy.

## Limitations

- The scaffold returns success without transforming the image.
- Consent and experimental opt-in are enforced by `FaceProtectionPolicy` in
  `@frithward/media-analysis`.
- Protection claims require independent evaluation.
