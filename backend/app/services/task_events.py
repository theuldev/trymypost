"""Eventos de progresso das tasks de geração via PostgreSQL LISTEN/NOTIFY.

O worker publica um NOTIFY em `generation_task_events` (na mesma transação da
atualização da task) e a API expõe esses eventos ao frontend via SSE
(Server-Sent Events), eliminando o polling do cliente.
"""
import json
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

CHANNEL = "generation_task_events"

TERMINAL_STATUSES = {"completed", "failed", "cancelled"}


def build_task_payload(
    task_id: str,
    status,
    current_step: Optional[str] = None,
    progress: int = 0,
    error: Optional[str] = None,
) -> dict:
    if hasattr(status, "value"):
        status = status.value
    return {
        "task_id": task_id,
        "status": status,
        "current_step": current_step,
        "progress": progress,
        "error": error,
    }


async def notify_task_event(db: AsyncSession, payload: dict) -> None:
    """Publica o evento da task. Deve ser chamado ANTES do commit — o NOTIFY
    só é entregue quando a transação confirma, garantindo consistência."""
    await db.execute(
        text("SELECT pg_notify(:channel, :payload)"),
        {"channel": CHANNEL, "payload": json.dumps(payload)},
    )
