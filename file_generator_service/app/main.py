import asyncio
import os
import json
import aiofiles
import aio_pika
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager
from datetime import datetime

from app.shared.config import settings
from app.shared.database import engine, Base, SessionLocal
from app.models import GeneratedFileModel

Base.metadata.create_all(bind=engine)

BUILDS_DIR = "builds"
os.makedirs(BUILDS_DIR, exist_ok=True)

class GenerationPayloadDTO(BaseModel):
    user_id: int
    key: str
    correlation_id: str = "unknown"

async def build_lua_file(payload: GenerationPayloadDTO) -> str:
    """Генерація файлу із записом у базу даних"""
    await asyncio.sleep(2) # imitation of build time
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{payload.user_id}.lua"
    filepath = os.path.join(BUILDS_DIR, filename)
    
    mock_code = f"""-- MTG VIP Helper
-- User ID: {payload.user_id}
-- License Key: {payload.key}
-- Generated at: {timestamp}

print("VIP Helper loaded successfully!")"""
    
    async with aiofiles.open(filepath, mode='w') as f:
        await f.write(mock_code)
        
    db = SessionLocal()
    try:
        db_log = GeneratedFileModel(
            key=payload.key,
            user_id=payload.user_id,
            filename=filename
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        print(f"[Trace: {payload.correlation_id}] Файл згенеровано та збережено в БД (ID логу: {db_log.id}).")
    except Exception as e:
        print(f"[Trace: {payload.correlation_id}] Помилка збереження в БД: {e}")
    finally:
        db.close()
    
    return f"http://localhost:8001/downloads/{filename}"

async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        event_dict = json.loads(message.body.decode())
        
        if event_dict.get('event_type') == 'FileGenerationRequested':
            payload = GenerationPayloadDTO(**event_dict['payload'])
            print(f"[Trace: {payload.correlation_id}] Починаю збірку для юзера {payload.user_id}...")
            
            download_url = await build_lua_file(payload)
            print(f"[Trace: {payload.correlation_id}] ✅ Збірка готова! URL: {download_url}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        channel = await connection.channel()
        queue = await channel.declare_queue("file_generation_queue", durable=True)
        await queue.consume(process_message)
        print("[FileGenerator] 🐇 Підключено до RabbitMQ. Очікую задачі...")
        
        yield
        
        await connection.close()
    except Exception as e:
        print(f"[FileGenerator] ❌ Помилка RabbitMQ: {e}")
        yield


app = FastAPI(title="File Generator Service", port=8005, lifespan=lifespan)

def remove_file(path: str):
    if os.path.exists(path):
        os.remove(path)
        print(f"[Cleanup] 🧹 Файл знищено: {path}")

@app.get("/downloads/{filename}")
async def download_file(filename: str, background_tasks: BackgroundTasks):
    filepath = os.path.join(BUILDS_DIR, filename)
    
    if not os.path.exists(filepath):
        return {"error": "Файл не знайдено або посилання вже недійсне."}
    
    background_tasks.add_task(remove_file, filepath)
    
    return FileResponse(
        path=filepath, 
        filename="Arizona Helper.lua", 
        media_type="application/octet-stream"
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "file_generator"}