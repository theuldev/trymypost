"""Geração real de imagens a partir da sugestão visual do post.

Provedores suportados:
- OPENAI: DALL-E 3 / gpt-image (imagens 1024x1024)
- GOOGLE: Imagen (imagen-*) ou Gemini com saída de imagem (ex.: gemini-2.5-flash-image)

A chave de API de imagem pode ser configurada nas Configurações; se vazia,
reutiliza a chave do provedor de LLM quando o provedor for o mesmo.

Midjourney não possui API oficial pública e não é suportado.
"""
import logging
import uuid
from pathlib import Path
from typing import Optional, Tuple

import httpx

from app.core.config import get_settings
from app.models.app_settings import AppSettings
from app.services.usage_service import estimate_image_cost

logger = logging.getLogger(__name__)

MEDIA_URL_PREFIX = "/media"


class ImageGenerationError(Exception):
    pass


def get_media_dir() -> Path:
    return Path(get_settings().media_dir)


def is_configured(settings: AppSettings) -> bool:
    provider = (settings.image_provider or "NONE").upper()
    if provider == "NONE":
        return False
    return bool(resolve_api_key(settings))


def resolve_api_key(settings: AppSettings) -> Optional[str]:
    if settings.image_api_key:
        return settings.image_api_key
    # reutiliza a chave do LLM quando o provedor é o mesmo
    if (settings.image_provider or "").upper() == (settings.provider or "").upper():
        return settings.api_key
    return None


async def generate_image(settings: AppSettings, prompt: str) -> Tuple[str, float]:
    """Gera uma imagem e salva em media_dir. Retorna (url_relativa, custo_usd)."""
    provider = (settings.image_provider or "NONE").upper()
    model = settings.image_model or _default_model(provider)
    api_key = resolve_api_key(settings)

    if provider == "NONE" or not api_key:
        raise ImageGenerationError("Geração de imagem não configurada nas Configurações.")

    if provider == "OPENAI":
        data = await _generate_openai(api_key, model, prompt)
    elif provider == "GOOGLE":
        data = await _generate_google(api_key, model, prompt)
    elif provider == "OPENROUTER":
        data = await _generate_openrouter(api_key, model, prompt)
    elif provider == "HUGGINGFACE":
        data = await _generate_huggingface(api_key, model, prompt)
    else:
        raise ImageGenerationError(f"Provedor de imagem não suportado: {provider}")

    media_dir = get_media_dir()
    media_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}.png"
    (media_dir / filename).write_bytes(data)

    cost = estimate_image_cost(model)
    logger.info(f"Imagem gerada ({model}): {filename} (~${cost:.4f})")
    return f"{MEDIA_URL_PREFIX}/{filename}", cost


def _default_model(provider: str) -> str:
    return {
        "OPENAI": "dall-e-3",
        "GOOGLE": "imagen-3.0-generate-002",
        "OPENROUTER": "google/gemini-2.5-flash-image",
        "HUGGINGFACE": "black-forest-labs/FLUX.1-schnell",
    }[provider]


async def _generate_openai(api_key: str, model: str, prompt: str) -> bytes:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key)
    kwargs = {"model": model, "prompt": prompt, "size": "1024x1024", "n": 1}
    # gpt-image usa b64 por padrão; dall-e aceita b64 via response_format
    if model.startswith("dall-e"):
        kwargs["response_format"] = "b64_json"

    response = await client.images.generate(**kwargs)
    item = response.data[0]

    if getattr(item, "b64_json", None):
        import base64
        return base64.b64decode(item.b64_json)

    if getattr(item, "url", None):
        async with httpx.AsyncClient(timeout=60) as http:
            resp = await http.get(item.url)
            resp.raise_for_status()
            return resp.content

    raise ImageGenerationError("A API não retornou conteúdo de imagem.")


async def _generate_google(api_key: str, model: str, prompt: str) -> bytes:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    if model.startswith("imagen"):
        response = await client.aio.models.generate_images(
            model=model,
            prompt=prompt,
            config=types.GenerateImagesConfig(number_of_images=1),
        )
        images = getattr(response, "generated_images", None) or []
        if not images or not getattr(images[0].image, "image_bytes", None):
            raise ImageGenerationError("A API não retornou conteúdo de imagem.")
        return images[0].image.image_bytes

    # Modelos Gemini com saída de imagem (ex.: gemini-2.5-flash-image)
    response = await client.aio.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
    )
    for part in response.candidates[0].content.parts:
        inline = getattr(part, "inline_data", None)
        if inline and inline.data:
            return inline.data

    raise ImageGenerationError("A API não retornou conteúdo de imagem.")


async def _generate_openrouter(api_key: str, model: str, prompt: str) -> bytes:
    """OpenRouter: modelos com saída de imagem via chat completions (modalities)."""
    import base64
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
    )
    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        extra_body={"modalities": ["image", "text"]},
    )

    message = response.choices[0].message
    images = getattr(message, "images", None) or []
    for image in images:
        url = (image.get("image_url") or {}).get("url", "") if isinstance(image, dict) else getattr(getattr(image, "image_url", None), "url", "")
        if url.startswith("data:"):
            return base64.b64decode(url.split(",", 1)[1])
        if url:
            async with httpx.AsyncClient(timeout=60) as http:
                resp = await http.get(url)
                resp.raise_for_status()
                return resp.content

    raise ImageGenerationError("A API do OpenRouter não retornou conteúdo de imagem.")


async def _generate_huggingface(api_key: str, model: str, prompt: str) -> bytes:
    """HuggingFace Inference Providers: text-to-image clássico (FLUX, SDXL...)."""
    async with httpx.AsyncClient(timeout=180) as http:
        response = await http.post(
            f"https://router.huggingface.co/hf-inference/models/{model}",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"inputs": prompt},
        )

    content_type = response.headers.get("content-type", "")
    if response.status_code == 200 and content_type.startswith("image"):
        return response.content

    detail = response.text[:300]
    raise ImageGenerationError(
        f"HuggingFace retornou {response.status_code}: {detail}"
    )


def build_image_prompt(visual: Optional[dict], topic: str) -> str:
    """Deriva um prompt de imagem a partir da sugestão visual do post."""
    parts = []
    if visual:
        description = (visual.get("visual_description") or "").strip()
        if description:
            parts.append(description)
        tips = visual.get("composition_tips") or []
        if tips:
            parts.append("Composition: " + "; ".join(str(tip) for tip in tips[:4]))
    base = f"Professional, clean social media image for a LinkedIn post about: {topic}."
    if parts:
        base += " " + " ".join(parts)
    return base + " High quality, no text overlays with gibberish, suitable for a tech audience."
