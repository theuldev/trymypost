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


async def main() -> None:
    settings = get_settings()
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)

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
                        # Message will be requeued since we don't ack on error
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(main())