import json
import aio_pika
from app.domain.schemas import GenerationPayloadDTO
from app.application.service import DistributionService

async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        event_dict = json.loads(message.body.decode())
        
        if event_dict.get('event_type') == 'FileGenerationRequested':
            payload = GenerationPayloadDTO(**event_dict['payload'])
            print(f"[RabbitMQ] Task received for User {payload.user_id}")
            
            service = DistributionService()
            download_url = await service.build_vip_file(payload)
            print(f"[RabbitMQ] Task completed. URL: {download_url}")