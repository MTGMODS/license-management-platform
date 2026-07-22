import json
import aio_pika
from app.domain.schemas import GenerationPayloadDTO
from app.application.service import DistributionService
from app.shared.config import settings

async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        event_dict = json.loads(message.body.decode())
        
        if event_dict.get('event_type') == 'FileGenerationRequested':
            payload = GenerationPayloadDTO(**event_dict['payload'])
            print(f"[RabbitMQ] Task received for User {payload.user_id}")
            
            service = DistributionService()
            download_url = await service.build_vip_file(payload)
            print(f"[RabbitMQ] Task completed. URL: {download_url}")

            if message.reply_to:
                connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
                async with connection:
                    channel = await connection.channel()
                    await channel.default_exchange.publish(
                        aio_pika.Message(
                            body=download_url.encode("utf-8"),
                            correlation_id=message.correlation_id,
                        ),
                        routing_key=message.reply_to,
                    )
                print(f"[RabbitMQ] Sent download link back to {message.reply_to}")