"""Robust LLM client with automatic multi-model fallback and rate-limit handling"""
import os
import logging
from typing import List, Optional
from langchain_google_genai import ChatGoogleGenerativeAI

logger = logging.getLogger(__name__)

# List of high-quota, reliable Gemini models in priority order
GEMINI_FALLBACK_MODELS = [
    "gemini-2.5-flash",       # Primary flagship, 1M context, high speed
    "gemini-3.5-flash-lite",  # High-throughput, generous rate limits
    "gemini-3.5-flash",       # High capacity flash model
    "gemini-flash-latest"     # Stable alias fallback
]


def extract_content_text(content) -> str:
    """Extract plain text string from model response content whether it's str or list of blocks"""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and "text" in part:
                parts.append(part["text"])
            elif hasattr(part, "text"):
                parts.append(part.text)
            else:
                parts.append(str(part))
        return "".join(parts)
    return str(content)


class RobustLLM:
    """LLM wrapper that automatically falls back across models if quota or rate limits are reached"""

    def __init__(self, temperature: float = 0.7, preferred_model: Optional[str] = None):
        self.temperature = temperature
        self.api_key = os.getenv("GOOGLE_API_KEY")
        
        models_order = list(GEMINI_FALLBACK_MODELS)
        if preferred_model and preferred_model in models_order:
            models_order.remove(preferred_model)
            models_order.insert(0, preferred_model)
        
        self.models_to_try = models_order

    def invoke(self, prompt: str) -> str:
        """Invoke the LLM with automatic fallback across available models"""
        last_error = None
        
        for model_name in self.models_to_try:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    google_api_key=self.api_key,
                    temperature=self.temperature,
                    max_retries=1
                )
                response = llm.invoke(prompt)
                extracted = extract_content_text(response.content)
                if extracted and len(extracted.strip()) > 0:
                    return extracted
            except Exception as e:
                err_str = str(e)
                logger.warning(f"Model {model_name} failed: {err_str}. Trying next fallback model...")
                last_error = e
                continue
        
        # If all Gemini models failed, check if GROQ_API_KEY exists as secondary provider
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                from langchain_groq import ChatGroq
                logger.info("Attempting secondary provider fallback with Groq...")
                groq_llm = ChatGroq(
                    model="groq/compound-mini",
                    groq_api_key=groq_key,
                    temperature=self.temperature,
                    max_tokens=2048
                )
                response = groq_llm.invoke(prompt)
                extracted = extract_content_text(response.content)
                if extracted:
                    return extracted
            except Exception as groq_err:
                logger.warning(f"Groq fallback also failed: {groq_err}")

        raise RuntimeError(f"All LLM models in fallback chain failed. Last error: {last_error}")
