# E2E fixtures

Small, locally generated fixtures for browser tests. No external downloads.

- `photo-with-exif.jpg` — an 8×8 JPEG with a **real EXIF GPS IFD** (GPSVersionID 2.3.0.0, `37/1, 46/1, 30/1 N`, `122/1, 25/1, 12/1 W`). Generated deterministically: Chromium canvas produces the JPEG bytes, and a Node script injects a little-endian TIFF APP1 segment (IFD0 → GPS IFD → six GPS rationals). The coordinates are synthetic test data, but the EXIF/GPS structure is genuine and the file decodes as a valid JPEG.
- `sample.eml` — a small RFC822 email with common headers and a scam-like body (urgency, credential request, suspicious link). All addresses and domains are synthetic.
- `manifest.json` — a representative C2PA manifest structure with `claim`, `signature`, and `assertions` fields. The signature and hashes are placeholders; this is a shape fixture, **not** a cryptographically valid signed manifest.
- `tone.wav` — 0.1 s of silence, 8 kHz, 16-bit mono PCM WAV (44-byte header + 1600 zero bytes), generated with a Node `Buffer`.
