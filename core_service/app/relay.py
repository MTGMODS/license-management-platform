import asyncio
import json
import aio_pika
from sqlalchemy.orm import Session
from app.shared.database import SessionLocal
from app.modules.subscription.infrastructure.repository import OutboxEventModel
from app.shared.config import settings

async def outbox_relay_worker():
    print("[Relay] 🚀 Outbox Relay Worker запущено...")
    
    while True:
        try:
            db: Session = SessionLocal()
            pending_events = db.query(OutboxEventModel).filter(OutboxEventModel.status == "PENDING").all()
            
            if pending_events:
                connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
                async with connection:
                    channel = await connection.channel()
                    
                    for event in pending_events:
                        message_body = {
                            "event_id": event.id,
                            "event_type": event.event_type,
                            "payload": json.loads(event.payload)
                        }
                        
                        await channel.default_exchange.publish(
                            aio_pika.Message(body=json.dumps(message_body).encode()),
                            routing_key="file_generation_queue",
                        )
                        
                        event.status = "PROCESSED"
                        db.commit()
                        print(f"[Relay] Подія {event.id} ({event.event_type}) успішно відправлена!")
            
            db.close()
        except Exception as e:
            print(f"[Relay] ⚠️ Помилка Relay: {e}")
            
        await asyncio.sleep(3)