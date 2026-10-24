"""Retry com backoff exponencial para erros de rate limit (HTTP 429 /
RESOURCE_EXHAUSTED) das APIs de LLM.

Semelhante ao comportamento do opencode: quando a API responde com
"limite de requisições excedido", a chamada é refeita após uma espera
que dobra a cada tentativa, respeitando o `retryDelay` sugerido pelo
provedor quando presente.
"""
import asyncio
import logging
import re
from typing import Awaitable, Callable, Optional, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

MAX_RETRIES = 4
BASE_DELAY_SECONDS = 20.0
MAX_DELAY_SECONDS = 120.0

# Captura "Please retry in 50.774s" e "retryDelay': '50s'" das respostas 429.
_RETRY_DELAY_RE = re.compile(
    r"retry\s*(?:delay)?['\"]?\s*(?:in|:)\s*['\"]?(\d+(?:\.\d+)?)\s*s",
    re.IGNORECASE,
)


def is_rate_limit_error(exc: BaseException) -> bool:
    """True se a exceção indica rate limit / cota excedida (HTTP 429)."""
    code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    if code == 429:
        return True
    msg = str(exc).lower()
    return (
        "429" in msg
        or "resource_exhausted" in msg
        or "rate limit" in msg
        or "rate_limit" in msg
        or "quota exceeded" in msg
    )


def _server_retry_delay(exc: BaseException) -> Optional[float]:
    """Extrai o tempo de espera sugerido pela API (segundos), se houver."""
    match = _RETRY_DELAY_RE.search(str(exc))
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


async def invoke_with_rate_limit_retry(
    invoke: Callable[[], Awaitable[T]],
    *,
    description: str = "LLM call",
    max_retries: int = MAX_RETRIES,
    base_delay: float = BASE_DELAY_SECONDS,
    on_retry: Optional[Callable[[int, int, float], Awaitable[None]]] = None,
) -> T:
    """Executa `invoke()` e tenta novamente em caso de rate limit.

    A espera dobra a cada tentativa (20s, 40s, 80s... até MAX_DELAY_SECONDS)
    e respeita o `retryDelay` sugerido pela API quando maior. Erros que não
    são de rate limit propagam imediatamente.

    `on_retry(attempt, max_retries, wait_seconds)` é chamado antes de cada
    espera para permitir feedback em tempo real ao usuário.
    """
    delay = base_delay

    for attempt in range(max_retries + 1):
        try:
            return await invoke()
        except Exception as exc:
            if not is_rate_limit_error(exc) or attempt >= max_retries:
                raise

            server_hint = _server_retry_delay(exc)
            wait = max(delay, server_hint or 0)
            wait = min(wait, MAX_DELAY_SECONDS)

            logger.warning(
                "Rate limit em '%s' (tentativa %d/%d). Nova tentativa em %.0fs.",
                description,
                attempt + 1,
                max_retries,
                wait,
            )
            if on_retry is not None:
                try:
                    await on_retry(attempt + 1, max_retries, wait)
                except Exception:
                    logger.exception("Falha no callback on_retry.")
            await asyncio.sleep(wait)
            delay = min(delay * 2, MAX_DELAY_SECONDS)

    raise RuntimeError("unreachable")
