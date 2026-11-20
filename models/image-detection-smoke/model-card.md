# Image detection smoke model card

## Model id

`image-detection-smoke`

## Stage

`experimental`. Synthetic test artifact generated locally on demand by `scripts/export_onnx.py`; not committed or distributed by Frithward.

## Intended use

Exercise the ONNX export and image-detection harness code paths with a synthetic fixture. This is not a detector.

## Prohibited use

Any real image detection, authenticity verdict, or consequential decision. Do not treat its output as a meaningful prediction.

## Architecture

A single `nn.Linear(4, 2)` followed by sigmoid from `engines/image/detection/src/tiny_model.py`, exported to ONNX by `scripts/export_onnx.py`. Weights are arbitrary and carry no meaning; no pretrained backbone.

## Training data

None. The module is initialized with arbitrary weights and exported against an all-zeros dummy tensor. No training was performed.

## Dataset licenses

Not applicable. No third-party dataset is used; the fixture is synthetic and generated locally.

## Evaluation results

Synthetic smoke test only; no real evaluation has been performed in this repository. The relevant artifact is `research/results/audio-detection-synthetic.json`: it is marked `synthetic: true`, its scores and labels are hand-written placeholders used only to exercise harness code paths, and its `not_measured` field records that no real model, dataset, hardware, runtime, warm-up policy, or repeated-run spread was measured. No performance claim is made.

## Known biases

Not established and not meaningful: synthetic inputs and arbitrary weights do not represent any real distribution.

## Hardware requirements

CPU only and minimal memory; only what is needed to run `scripts/export_onnx.py` locally.

## License

generated locally; synthetic test artifact, not distributed.

## Limitations

Not a detection model. Outputs are meaningless placeholders. The ONNX file is generated on demand and is not committed to this repository.

## Version history

| Version  | Date       | Change                                                       |
| -------- | ---------- | ------------------------------------------------------------ |
| card-0.1 | 2026-11-20 | Initial card for the locally generated synthetic smoke test. |
