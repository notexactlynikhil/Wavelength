# AI Pipeline Benchmarks

Local, offline processing times for the Wavelength AI pipeline
(`faster-whisper` transcription + LLaMA 3.2 3B summarization via Ollama).

## Machine

| | |
|---|---|
| CPU | Intel Core Ultra 9 275HX (24 cores / 24 threads) |
| RAM | 31.4 GB |
| OS | Windows 11 Home (10.0.26200) |
| Whisper model | `base`, `cpu`, `int8` compute |
| LLM | `llama3.2:3b` via Ollama (`http://localhost:11434`) |

> This is a consumer laptop CPU run (no GPU). Results will vary with hardware.

## Methodology

`test/benchmark_pipeline.py` loops the bundled 48.3 s `sample.wav` into
1 / 5 / 15 minute clips, warms the Whisper model once (excluded from timings),
then measures:

- **Transcription** — `faster-whisper` only.
- **Full pipeline** — transcription + transcript cleaning + LLM analysis + JSON validation.

`realtime factor` is `audio seconds / transcription seconds` (higher is faster).

## Results

| Audio length | Transcription | Realtime factor | Full pipeline | Status |
|---|---|---|---|---|
| 1 min | 5.58 s | 10.75x | 18.37 s | SUCCESS |
| 5 min | 16.25 s | 18.46x | 38.83 s | SUCCESS |
| 15 min | 75.29 s | 11.95x | 111.74 s | SUCCESS |

Whisper model warm-up (includes one-time model load): **7.1 s**.

Raw data: [`test/output/benchmarks.json`](test/output/benchmarks.json).

## Notes

- The LLM analysis step is roughly 10–35 s depending on transcript length and dominates the non-transcription time.
- Memory/model load is a one-time cost per service start; the model stays resident for subsequent calls.
- Re-running: `python test/benchmark_pipeline.py` (optionally pass durations, e.g. `python test/benchmark_pipeline.py 60 300 900`).
