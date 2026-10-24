"""Worker script that consumes generation tasks from RabbitMQ and processes them."""
import asyncio
import json
import logging
import sys
from pathlib import Path

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).parent))

import aio_pika
from app.core.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)


async def connect_rabbitmq_with_retry(
    url: str,
    attempts: int = 30,
    delay: float = 3.0,
):
    """Conecta ao RabbitMQ aguardando ele ficar pronto.

    O healthcheck do RabbitMQ (rabbitmq-diagnostics ping) responde antes do
    broker aceitar conexões AMQP, então a conexão inicial pode falhar no
    startup. O `connect_robust` sozinho não retenta a conexão INICIAL —
    por isso o loop abaixo.
    """
    for attempt in range(1, attempts + 1):
        try:
            return await aio_pika.connect_robust(url)
        except Exception as exc:
            if attempt >= attempts:
                raise
            logger.warning(
                "RabbitMQ ainda não está pronto (%s). Tentativa %d/%d — nova tentativa em %.0fs.",
                exc,
                attempt,
                attempts,
                delay,
            )
            await asyncio.sleep(delay)
    raise RuntimeError("unreachable")


async def main() -> None:
    settings = get_settings()
    connection = await connect_rabbitmq_with_retry(settings.rabbitmq_url)

    try:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=1)
        queue = await channel.declare_queue("generation_tasks", durable=True)

        logger.info("Worker started, waiting for messages...")

        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    try:
                        body = json.loads(message.body.decode())
                        task_id = body.get("task_id")
                        input_data = body.get("input_data", {})

                        logger.info(f"Processing task {task_id}")

                        from worker import run_generation_pipeline

                        await run_generation_pipeline(task_id, input_data)

                        logger.info(f"Task {task_id} completed")
                    except Exception as exc:
                        logger.error(f"Error processing message: {exc}", exc_info=True)
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(main())