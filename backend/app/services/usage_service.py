"""Tracking de uso de tokens e custo estimado por post gerado.

O UsageTracker é um callback LangChain que acumula o usage_metadata de todas
as chamadas de LLM feitas durante o pipeline. Ao final, os registros são
persistidos em post_usage vinculados ao post gerado.

Os preços são estimativas por 1M de tokens (USD) baseadas nos preços públicos
dos provedores. Modelos não mapeados ainda têm tokens registrados, mas custo 0.
"""
import logging
from typing import Any, Dict, List, Optional

from langchain_core.callbacks import AsyncCallbackHandler

logger = logging.getLogger(__name__)

MODEL_PRICING: Dict[str, tuple] = {
    "gemini-3.1-pro-preview": (1.50, 12.00),
    "gemini-3.5-flash-lite": (0.08, 0.35),
    "gemini-3.7-flash": (0.20, 1.50),
    "gemini-3.8-flash": (0.25, 2.00),
    "gemini-3.8-live-extended-thinking": (2.50, 12.00),
    "gemini-2.5-pro": (1.25, 10.00),
    "gemini-2.5-flash-lite": (0.10, 0.40),
    "gemini-2.5-flash": (0.30, 2.50),
    "gemini-2.0-flash": (0.10, 0.40),
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o": (2.50, 10.00),
    "gpt-4.1-mini": (0.40, 1.60),
    "gpt-4.1": (2.00, 8.00),
    "o3-mini": (1.10, 4.40),
    "o3": (2.00, 8.00),
    "claude-haiku": (1.00, 5.00),
    "claude-sonnet": (3.00, 15.00),
    "claude-opus": (15.00, 75.00),
}

IMAGE_PRICING: Dict[str, float] = {
    "dall-e-3": 0.040,
    "gpt-image-1": 0.19,
    "gpt-image-1-mini": 0.02,
    "imagen-3.0-generate": 0.030,
    "imagen-4.0-generate": 0.040,
    "imagen-4.0-ultra-generate": 0.060,
    "imagen-4.0-fast-generate": 0.020,
    "gemini-2.5-flash-image": 0.039,
    "flux.1-schnell": 0.003,
    "flux.1-dev": 0.025,
    "stable-diffusion": 0.005,
}


def estimate_llm_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
    """Estima o custo (USD) de uma chamada de LLM pelo nome do modelo."""
    model = (model_name or "").lower()
    for key, (price_in, price_out) in MODEL_PRICING.items():
        if key in model:
            return (input_tokens / 1_000_000) * price_in + (output_tokens / 1_000_000) * price_out
    return 0.0


def estimate_image_cost(model_name: str) -> float:
    """Custo estimado por imagem gerada."""
    model = (model_name or "").lower()
    for key, price in IMAGE_PRICING.items():
        if key in model:
            return price
    return 0.0


class UsageTracker(AsyncCallbackHandler):
    """Callback LangChain que acumula uso de tokens por etapa do pipeline."""

    def __init__(self, provider: str, model_name: str) -> None:
        self.provider = provider
        self.model_name = model_name
        self.current_step = "unknown"
        self.records: List[Dict[str, Any]] = []

    def set_step(self, step: str) -> None:
        self.current_step = step

    async def on_llm_end(self, response, **kwargs: Any) -> None:
        input_tokens = 0
        output_tokens = 0
        total_tokens = 0

        for generations in getattr(response, "generations", []) or []:
            for generation in generations:
                usage = getattr(getattr(generation, "message", None), "usage_metadata", None)
                if usage:
                    input_tokens += usage.get("input_tokens") or 0
                    output_tokens += usage.get("output_tokens") or 0
                    total_tokens += usage.get("total_tokens") or 0

        if not total_tokens and not input_tokens and not output_tokens:
            return

        if not total_tokens:
            total_tokens = input_tokens + output_tokens

        cost = estimate_llm_cost(self.model_name, input_tokens, output_tokens)
        self.records.append({
            "step": self.current_step,
            "provider": self.provider,
            "model_name": self.model_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "cost_usd": cost,
        })

    def add_manual_record(
        self,
        step: str,
        *,
        provider: Optional[str] = None,
        model_name: Optional[str] = None,
        input_tokens: int = 0,
        output_tokens: int = 0,
        total_tokens: int = 0,
        cost_usd: float = 0.0,
    ) -> None:
        self.records.append({
            "step": step,
            "provider": provider or self.provider,
            "model_name": model_name or self.model_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "cost_usd": cost_usd,
        })
