"""
Benchmark the local AI pipeline against audio of varying lengths.

Generates 1 / 5 / 15 minute clips by looping the bundled sample, warms the
Whisper and LLM models, then records transcription-only and full-pipeline
timings. Results are printed and written to test/output/benchmarks.json.

Run:  python test/benchmark_pipeline.py
"""

import json
import os
import sys
import tempfile
import time
import wave

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai.transcription.transcriber import AudioTranscriber
from ai.pipeline.orchestrator import CallPipeline

SAMPLE_PATH = os.path.join("test", "sample-audio", "sample.wav")
OUTPUT_DIR = os.path.join("test", "output")
BENCH_DIR = os.path.join(tempfile.gettempdir(), "wavelength-bench")


def make_audio(seconds, out_path):
    with wave.open(SAMPLE_PATH, "rb") as r:
        params = r.getparams()
        frames = r.readframes(r.getnframes())
    frame_bytes = params.sampwidth * params.nchannels
    target_bytes = int(seconds * params.framerate) * frame_bytes
    data = bytearray()
    while len(data) < target_bytes:
        data += frames
    with wave.open(out_path, "wb") as w:
        w.setparams(params)
        w.writeframes(bytes(data[:target_bytes]))
    return out_path


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(BENCH_DIR, exist_ok=True)

    transcriber = AudioTranscriber()

    print("Warming up Whisper model...")
    warm_start = time.time()
    transcriber.transcribe(SAMPLE_PATH)
    warm_elapsed = round(time.time() - warm_start, 2)
    print(f"Whisper warm-up complete in {warm_elapsed}s (model load included)\n")

    durations = [int(a) for a in sys.argv[1:]] or [60, 300, 900]
    results = []

    for seconds in durations:
        audio_path = os.path.join(BENCH_DIR, f"bench_{seconds}s.wav")
        make_audio(seconds, audio_path)

        print(f"=== {seconds}s audio ({os.path.getsize(audio_path) / 1e6:.1f} MB) ===")

        t0 = time.time()
        transcription = transcriber.transcribe(audio_path)
        transcribe_secs = round(time.time() - t0, 2)
        print(f"  transcription: {transcribe_secs}s "
              f"({round(seconds / transcribe_secs, 2)}x realtime)")

        # Full pipeline (re-uses warm models; includes cleaning + LLM + validation)
        pipeline = CallPipeline(transcriber=transcriber)
        t1 = time.time()
        result = pipeline.process_call(audio_path)
        pipeline_secs = round(time.time() - t1, 2)
        print(f"  full pipeline: {pipeline_secs}s (status={result.get('status')})\n")

        results.append({
            "audio_seconds": seconds,
            "transcription_seconds": transcribe_secs,
            "transcription_realtime_factor": round(seconds / transcribe_secs, 2),
            "pipeline_seconds": pipeline_secs,
            "status": result.get("status"),
        })

    output_path = os.path.join(OUTPUT_DIR, "benchmarks.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"whisper_warmup_seconds": warm_elapsed, "results": results}, f, indent=2)

    print(f"Benchmarks written to {output_path}")


if __name__ == "__main__":
    main()
