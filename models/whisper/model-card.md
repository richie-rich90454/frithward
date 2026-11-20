# Whisper (tiny) model card

Stage: `experimental`. Status: reference candidate; weights are NOT distributed by Frithward. Metadata below was verified from the public `openai/whisper-tiny` repository on 2026-11-20.

## Model id

`whisper`

## Intended use

Local speech-to-text research using consented audio the user supplies. Any transcript is a draft for human review.

## Prohibited use

Surveillance or transcription without consent, and presenting machine transcripts as verbatim legal records.

## Architecture

Encoder-decoder transformer (`WhisperForConditionalGeneration`), tiny variant with 37,760,640 parameters. Verified from the upstream `config.json` metadata; not vendored in this repository.

## Training data

Public upstream documentation reports 680k hours of weakly supervised multilingual audio; the exact training mixture is not established in this repository and was not independently verified here.

## Dataset licenses

Upstream model license: apache-2.0 (verified). Licenses of the training corpora are not established in this repository.

## Evaluation datasets

None evaluated in this repository. The upstream model card lists LibriSpeech (clean/other) and Common Voice 11.0 (hi) with unverified WER figures; those figures are not reproduced or claimed here.

## Metrics

Planned: word error rate and character error rate per language, plus latency and memory. No values have been measured in this repository.

## Evaluation results

No evaluation has been performed for this model in this repository; no metrics are reported. The only results artifact present is `research/results/audio-detection-synthetic.json`, a synthetic harness smoke test whose scores are placeholders and not an evaluation of this model.

## Known biases

Upstream documentation reports accuracy variation by language, accent, noise, and domain. No bias measurements exist in this repository.

## Hardware requirements

not established in this repository.

## Runtime requirements

A transformers-compatible Whisper checkpoint and PyTorch. The Frithward transcription engine does not load this checkpoint; it returns an empty utterance until a model is configured.

## Model license

apache-2.0 (verified from Hugging Face model metadata, 2026-11-20). Frithward does not redistribute the weights.

## Limitations

No weights are bundled. The listed public URL and checksum are reference metadata only; Frithward never downloads models automatically. No Frithward evaluation has been run.

## Version history

| Version | Date | Change |
| --- | --- | --- |
| card-0.1 | 2026-11-20 | Initial card; public URL, size, sha256, and license verified from upstream metadata. |
