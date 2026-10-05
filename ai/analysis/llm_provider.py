import json
import urllib.request
import urllib.error
import os
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from ai.config.settings import settings
from ai.analysis.prompts import SYSTEM_PROMPT, build_analysis_prompt

class LLMProvider(ABC):
    """Abstract base class for local LLM providers."""
    
    @abstractmethod
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Sends prompt to local LLM and returns raw string response."""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        pass


class OllamaLLMProvider(LLMProvider):
    """Local LLM provider using Ollama HTTP API."""

    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip('/')
        self.requested_model = model or settings.OLLAMA_MODEL
        self._active_model = None

    def _resolve_model_name(self) -> str:
        if self._active_model:
            return self._active_model

        # Query Ollama to verify or find available model
        tags_url = f"{self.base_url}/api/tags"
        try:
            req = urllib.request.Request(tags_url)
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                models = [m.get('name', '') for m in data.get('models', [])]
                
                # Check direct match
                if self.requested_model in models:
                    self._active_model = self.requested_model
                    return self._active_model

                # Check partial match (e.g. llama3.2:3b vs llama3.2:latest)
                prefix = self.requested_model.split(':')[0]
                for m in models:
                    if m.startswith(prefix):
                        self._active_model = m
                        return self._active_model

                # Fallback to first available model if any
                if models:
                    self._active_model = models[0]
                    return self._active_model

        except Exception:
            pass

        # Default back to configured requested model
        self._active_model = self.requested_model
        return self._active_model

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        model_name = self._resolve_model_name()
        endpoint = f"{self.base_url}/api/chat"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model_name,
            "messages": messages,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1
            }
        }

        try:
            req_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                endpoint,
                data=req_data,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=60) as response:
                res_body = json.loads(response.read().decode('utf-8'))
                content = res_body.get('message', {}).get('content', '')
                if not content:
                    raise RuntimeError("Empty response received from Ollama model")
                return content
        except urllib.error.URLError as e:
            raise RuntimeError(f"Could not connect to Ollama service at {self.base_url}. Ensure Ollama is running. Error: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"Ollama generation failed: {str(e)}")

    def get_provider_name(self) -> str:
        return "ollama"

    def get_model_name(self) -> str:
        return self._resolve_model_name()


class LocalLlamaProvider(LLMProvider):
    """In-process LLM provider using llama.cpp (llama-cpp-python)."""

    _model_instance = None
    _model_path = None

    @classmethod
    def get_model(cls):
        if cls._model_instance is None or cls._model_path != settings.LLAMA_GGUF_PATH:
            if not os.path.exists(settings.LLAMA_GGUF_PATH):
                raise RuntimeError(
                    f"Llama GGUF model file not found at path '{settings.LLAMA_GGUF_PATH}'"
                )
            try:
                from llama_cpp import Llama
                # n_threads tuned via benchmark — 4 threads (physical cores) outperformed higher logical thread counts (8, 12) by avoiding hyperthreading overhead
                cls._model_instance = Llama(
                    model_path=settings.LLAMA_GGUF_PATH,
                    n_ctx=settings.LLAMA_CTX_SIZE,
                    n_threads=4,
                    verbose=False
                )
                cls._model_path = settings.LLAMA_GGUF_PATH
            except Exception as e:
                raise RuntimeError(f"Failed to initialize llama.cpp model: {str(e)}")
        return cls._model_instance

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        model = self.get_model()

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = model.create_chat_completion(
                messages=messages,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            choices = response.get("choices", [])
            if not choices:
                raise RuntimeError("Empty choices received from llama.cpp model")
            content = choices[0].get("message", {}).get("content", "")
            if not content:
                raise RuntimeError("Empty response content received from llama.cpp model")
            return content
        except Exception as e:
            if isinstance(e, RuntimeError):
                raise e
            raise RuntimeError(f"llama.cpp generation failed: {str(e)}")

    def get_provider_name(self) -> str:
        return "llama.cpp"

    def get_model_name(self) -> str:
        return os.path.basename(settings.LLAMA_GGUF_PATH)


class MockLLMProvider(LLMProvider):
    """Mock LLM Provider for testing offline or fallbacks."""

    def __init__(self, model_name: str = "mock-crm-model"):
        self.model_name = model_name

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        return json.dumps({
            "summary": "Mock call analysis summary for testing purposes.",
            "sentiment": "positive",
            "deal_stage": "negotiation",
            "customer_intent": "Customer expressed interest in purchasing software seats.",
            "products_discussed": ["Wavelength Enterprise CRM"],
            "action_items": [
                {
                    "description": "Send proposal and schedule technical follow up",
                    "due_date": "2026-09-05"
                }
            ],
            "follow_up": {
                "required": True,
                "date": "2026-09-05",
                "reason": "Follow up meeting scheduled with technical team."
            }
        })

    def get_provider_name(self) -> str:
        return "mock"

    def get_model_name(self) -> str:
        return self.model_name


def get_llm_provider(provider_type: Optional[str] = None) -> LLMProvider:
    provider = provider_type or settings.LLM_PROVIDER
    if provider.lower() == "ollama":
        return OllamaLLMProvider()
    elif provider.lower() == "mock":
        return MockLLMProvider()
    elif provider.lower() == "llama_cpp":
        return LocalLlamaProvider()
    else:
        # Default to Ollama provider
        return OllamaLLMProvider()

