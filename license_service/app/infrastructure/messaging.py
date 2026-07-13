import json
import aio_pika
from app.shared.config import settings

async def publish_file_generation_event(user_id: int, media_id: int, expire_date: str = None):
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        
        event_dict = {
            "event_type": "FileGenerationRequested",
            "payload": {
                "user_id": user_id,
                "media_id": media_id,
                "expire_date": expire_date
            }
        }
        
        message = aio_pika.Message(body=json.dumps(event_dict).encode("utf-8"))

        await channel.default_exchange.publish(message, routing_key="file_generation_queue")

        print(f"[RabbitMQ] Request for build sent for User ID: {user_id}")