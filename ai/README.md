# Wavelength AI Backend — Audio → Transcription → Local LLM Pipeline (Phase 1)

This module provides an isolated, offline-capable AI processing pipeline for the **Wavelength / Wavelength** desktop application.

It transcribes call recordings locally using Whisper and extracts structured CRM data (summaries, sentiment, deal stage, products, action items, follow-ups) using a local LLM (Ollama / LLaMA 3.2).

---

## 1. Project Structure & Files Created

```text
Wavelength/
├── ai/
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py          # Centralized model settings, thresholds, and CRM enum constants
│   ├── transcription/
│   │   ├── __init__.py
│   │   └── transcriber.py       # Offline speech-to-text module using faster-whisper (cached model)
│   ├── analysis/
│   │   ├── __init__.py
│   │   ├── llm_provider.py      # Abstract LLMProvider with Ollama & Mock implementations
│   │   ├── prompts.py           # Optimized CRM analysis prompts
│   │   └── validator.py         # JSON repair, schema enforcement, and type normalizers
│   ├── pipeline/
│   │   ├── __init__.py
│   │   └── orchestrator.py      # Entry point: process_call(audio_path) returning complete payload
│   └── __init__.py
├── test/
│   ├── sample-audio/            # Local test audio recordings (.wav)
│   │   ├── sample.wav
│   │   └── crm_sales_call.wav
│   ├── generate_sample_audio.py # Audio generation utility for testing
│   └── output/
│       └── result.json          # Formatted JSON output from test execution
└── test_pipeline.py             # CLI test runner matching required prompt format
```

---

## 2. Dependencies & Installation

### Requirements
- **Python 3.10+** (Tested on Python 3.14)
- **Ollama** installed on host machine
- Python Packages:
  ```bash
  pip install faster-whisper ollama pydantic pyttsx3 soundfile requests
  ```

---

## 3. Obtaining & Configuring Local Models

> **Quick Start**: Run `python setup_llama_model.py` once after cloning to set up the local LLM model automatically (reusing your existing Ollama download if present, or downloading from Hugging Face).

### Speech-to-Text (Whisper)
- `faster-whisper` automatically downloads the designated model (`base`, `tiny`, `small`, or `medium`) on first run and caches it locally.
- Default configuration uses `base` on `cpu` with `int8` quantization (configurable in `ai/config/settings.py` or environment variables).

### Local LLM (Ollama + LLaMA 3.2)
1. Install Ollama from [https://ollama.com](https://ollama.com).
2. Pull the LLaMA 3.2 3B model:
   ```bash
   ollama pull llama3.2:3b
   ```
3. Start Ollama server:
   ```bash
   ollama serve
   ```

---

## 4. How to Run the Sample Pipeline

Run the CLI runner from the project root:

```bash
# Default (uses test/sample-audio/sample.wav)
python test_pipeline.py

# Or specify a custom audio file
python test_pipeline.py sample.wav
python test_pipeline.py path/to/your/audio.mp3
```

---

## 5. Example Execution & Output

```text
====================================
ECHOCRM AI PIPELINE
====================================

Audio:
test\sample-audio\sample.wav

[1/3] Transcribing...
✓ Transcription complete

[2/3] Analyzing transcript...
✓ LLM analysis complete

[3/3] Validating structured output...
✓ JSON validation successful

====================================
TRANSCRIPT
====================================

Hi, this is Sarah Jenkins calling from APEX Global. I wanted to follow up on our discussion regarding the wavelength enterprise CRM platform. We are looking to deploy this for our sales team of 25 representatives. Overall, we are very excited about the real-time call transcription and automated sentiment tracking features. However, I do have a concern regarding our data migration timeline from Salesforce and whether your team can assist with data import before the end of the month. Could you send over a detailed pricing proposal and schedule a technical demonstration with our IT director for next Tuesday at 10am? If the pricing looks good and migration support is included, we are ready to move forward to contract negotiation.

====================================
AI ANALYSIS
====================================

{
    "summary": "APEX Global interested in Wavelength CRM platform for sales team, with concerns about data migration timeline.",
    "sentiment": "positive",
    "deal_stage": "prospecting",
    "customer_intent": "Assistance with data import and pricing proposal before moving forward to contract negotiation.",
    "products_discussed": [
        "wavelength enterprise CRM platform"
    ],
    "action_items": [
        {
            "description": "Send detailed pricing proposal and schedule technical demonstration for next Tuesday at 10am",
            "due_date": null
        }
    ],
    "follow_up": {
        "required": true,
        "date": null,
        "reason": ""
    }
}

====================================
PIPELINE COMPLETE
====================================

Result saved to: test\output\result.json
```

---

## 6. Error Handling

The pipeline handles failures without swallowing exceptions, returning machine-readable status codes:
- `AUDIO_ERROR`: Missing file, invalid extension, empty file.
- `TRANSCRIPTION_ERROR`: Whisper model failure or empty transcription output.
- `LLM_ERROR`: Ollama service unreachable or LLM timeout.
- `INVALID_LLM_OUTPUT`: Non-JSON or schema validation failure from LLM response.
- `PIPELINE_ERROR`: General internal exception.
- `SUCCESS`: Complete successful execution.

---

## 7. Known Limitations

- **CPU Transcription Speed**: CPU inference with `faster-whisper` takes ~1-3s for small files. For larger calls (>10 minutes), GPU acceleration (`device="cuda"`) is recommended.
- **Context Length**: Very long call transcripts (>30 minutes) should be chunked or summarized hierarchically before passing to 3B models.

---

## 8. Recommended Next Steps for CRM & Supabase Integration (Phase 2)

When ready to connect this AI pipeline to the Electron desktop application and Supabase DB:

1. **Node.js / Electron Child Process Bridge**:
   - Expose a simple python subcommand or FastAPI local service (`http://localhost:8000/process-call`) that Electron `main.js` can call when a call finishes recording.
2. **Supabase Ingestion Mapping**:
   - Update `calls` row status: `recording` → `processing` → `done`.
   - Insert `transcript` text into `calls.raw_transcript`.
   - Create a `call_summaries` row with `summary_text`, `sentiment`, `deal_stage`, `product`.
   - Automatically insert extracted `tasks` into the `tasks` table with `customer_id` and `call_id`.
   - Automatically update or create a `deals` record for the customer if a new deal stage/value was identified.

---

## 9. In-Process Llama.cpp Provider (Standalone Desktop Builds)

For a self-contained desktop demo build that runs without an external background service (like Ollama), Wavelength supports an in-process `llama.cpp` LLM provider.

### Installation
Install `llama-cpp-python` using the prebuilt CPU wheel index (no compiler required):
```bash
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu
```

### Model File Location & Reuse
- **Location**: `llama-runtime/models/llama-3.2-3b-instruct-q4_k_m.gguf`
- **Ollama Model Reuse**: The system locates Ollama's downloaded model layer manifest at `%USERPROFILE%\.ollama\models\manifests\registry.ollama.ai\library\llama3.2\3b` (or `~/.ollama/...` on macOS/Linux), finds the model blob `sha256-<digest>`, verifies the GGUF header (`b'GGUF'`), and copies it to `llama-runtime/models/llama-3.2-3b-instruct-q4_k_m.gguf`.
- **Fallback**: If Ollama's blob is not found, download `Llama-3.2-3B-Instruct-Q4_K_M.gguf` directly from Hugging Face (`bartowski/Llama-3.2-3B-Instruct-GGUF`) into `llama-runtime/models/`.

### Switching LLM Providers
Set the `LLM_PROVIDER` environment variable:
- `LLM_PROVIDER=ollama` — Uses external Ollama service (`http://localhost:11434`, model `llama3.2:3b`)
- `LLM_PROVIDER=llama_cpp` — Uses in-process `llama.cpp` provider (`llama-runtime/models/llama-3.2-3b-instruct-q4_k_m.gguf`)
- `LLM_PROVIDER=mock` — Uses mock response provider for testing without local inference

Example:
```bash
# Windows PowerShell
$env:LLM_PROVIDER="llama_cpp"; python ai/server.py

# Bash / Linux / macOS
LLM_PROVIDER=llama_cpp python ai/server.py
```

### License & Attribution
*Built with Llama*: This application utilizes Llama 3.2 models developed by Meta under the Meta Llama 3.2 Community License.

