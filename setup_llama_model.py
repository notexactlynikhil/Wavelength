#!/usr/bin/env python3
"""
setup_llama_model.py — Standalone Model Setup Utility for Wavelength AI

Locates and sets up the Llama 3.2 3B Instruct GGUF model for local in-process inference.
1. Reuses existing local Ollama blob copy if available (zero download required).
2. Falls back to downloading from Hugging Face if Ollama blob is not found.
"""

import os
import sys
import json
import shutil
import urllib.request

DEST_DIR = os.path.join("llama-runtime", "models")
MODEL_FILENAME = "llama-3.2-3b-instruct-q4_k_m.gguf"
DEST_PATH = os.path.join(DEST_DIR, MODEL_FILENAME)

HF_DOWNLOAD_URL = "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"

def get_ollama_paths():
    """Returns potential manifest search directories for Ollama models on Windows / Unix."""
    home = os.path.expanduser("~")
    user_profile = os.environ.get("USERPROFILE", home)
    
    candidates = [
        os.path.join(user_profile, ".ollama", "models"),
        os.path.join(home, ".ollama", "models")
    ]
    
    manifest_paths = []
    for base in candidates:
        manifest_dir = os.path.join(base, "manifests", "registry.ollama.ai", "library", "llama3.2")
        if os.path.exists(manifest_dir):
            for tag in ["3b", "latest"]:
                p = os.path.join(manifest_dir, tag)
                if os.path.exists(p) and p not in manifest_paths:
                    manifest_paths.append((p, os.path.join(base, "blobs")))
                    
    return manifest_paths

def try_reuse_ollama_blob() -> bool:
    """Attempts to locate, verify, and copy Ollama's downloaded llama3.2:3b model blob."""
    print("[Setup] Searching for existing Ollama llama3.2:3b model blob...")
    
    manifest_entries = get_ollama_paths()
    if not manifest_entries:
        print("[Setup] No local Ollama manifest found.")
        return False

    for manifest_path, blobs_dir in manifest_entries:
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            digest = None
            for layer in data.get("layers", []):
                if layer.get("mediaType") == "application/vnd.ollama.image.model":
                    digest = layer.get("digest")
                    break
            
            if not digest:
                continue

            blob_filename = digest.replace(":", "-")
            blob_path = os.path.join(blobs_dir, blob_filename)

            if not os.path.exists(blob_path):
                continue

            blob_size = os.path.getsize(blob_path)
            # Expect ~1.5 GB - 2.5 GB model file
            if blob_size < 1_000_000_000:
                print(f"[Setup] Found blob at {blob_path} but size ({blob_size} bytes) is too small.")
                continue

            with open(blob_path, "rb") as bf:
                header = bf.read(4)

            if header != b"GGUF":
                print(f"[Setup] Blob header {header} does not match expected GGUF magic bytes.")
                continue

            os.makedirs(DEST_DIR, exist_ok=True)
            print(f"[Setup] Found Ollama model blob ({blob_size / (1024**3):.2f} GB) at: {blob_path}")
            print(f"[Setup] Copying blob to {DEST_PATH}...")
            shutil.copyfile(blob_path, DEST_PATH)
            
            final_size = os.path.getsize(DEST_PATH)
            print(f"[Setup] ✓ Successfully reused Ollama model blob! Final file size: {final_size / (1024**3):.2f} GB ({final_size} bytes)")
            return True

        except Exception as e:
            print(f"[Setup] Warning: Failed checking manifest at {manifest_path}: {str(e)}")

    return False

def download_from_huggingface() -> bool:
    """Fallback: Downloads GGUF model directly from Hugging Face with progress updates."""
    print(f"[Setup] Ollama blob not found. Falling back to direct Hugging Face download...")
    print(f"[Setup] Source URL: {HF_DOWNLOAD_URL}")
    os.makedirs(DEST_DIR, exist_ok=True)

    try:
        def report_progress(block_num, block_size, total_size):
            downloaded = block_num * block_size
            if total_size > 0:
                percent = min(100.0, (downloaded / total_size) * 100)
                sys.stdout.write(f"\r[Setup] Downloading: {percent:.1f}% ({downloaded / (1024**2):.1f} MB / {total_size / (1024**2):.1f} MB)")
                sys.stdout.flush()

        urllib.request.urlretrieve(HF_DOWNLOAD_URL, DEST_PATH, reporthook=report_progress)
        print()
        final_size = os.path.getsize(DEST_PATH)
        print(f"[Setup] ✓ Successfully downloaded model from Hugging Face! Final file size: {final_size / (1024**3):.2f} GB")
        return True

    except Exception as e:
        print(f"\n[Setup] ✗ Failed to download model from Hugging Face: {str(e)}")
        if os.path.exists(DEST_PATH):
            os.remove(DEST_PATH)
        return False

def main():
    print("====================================")
    print("ECHOCRM AI — MODEL SETUP UTILITY")
    print("====================================\n")

    if os.path.exists(DEST_PATH) and os.path.getsize(DEST_PATH) > 0:
        size = os.path.getsize(DEST_PATH)
        print(f"Model already present at '{DEST_PATH}' ({size / (1024**3):.2f} GB), skipping setup.")
        sys.exit(0)

    success = try_reuse_ollama_blob()
    if not success:
        success = download_from_huggingface()

    if success:
        print("\n[Setup] Setup complete. Model is ready for in-process Llama inference!")
    else:
        print("\n[Setup] ✗ Model setup failed. Please check your network connection or Ollama installation.")
        sys.exit(1)

if __name__ == "__main__":
    main()
