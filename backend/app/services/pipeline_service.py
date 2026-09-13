import json
import uuid
from typing import Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

import aio_pika

from app.core.config import get_settings
from app.models.post import GenerationTask, PostStatus


async def publish_generation_task(task_id: str, input_data: Dict[str, Any]) -> None:
    settings = get_settings()
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    try:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=1)
        queue = await channel.declare_queue("generation_tasks", durable=True)
        message = aio_pika.Message(
            body=json.dumps({
                "task_id": task_id,
                "input_data": input_data,
            }).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await channel.default_exchange.publish(
            message,
            routing_key=queue.name,
        )
    finally:
        await connection.close()


async def start_generation_task(
    db: AsyncSession,
    input_data: Dict[str, Any],
) -> str:
    task_id = str(uuid.uuid4())

    task = GenerationTask(
        id=task_id,
        status=PostStatus.PENDING,
        current_step='Starting...',
        progress=0,
    )

    db.add(task)
    await db.commit()

    await publish_generation_task(task_id, input_data)

    return task_id