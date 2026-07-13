import aio_pika
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager

from app.shared.config import settings
from app.shared.exceptions import DomainException, global_exception_handler, validation_exception_handler

from app.api.routes import router as download_router
from app.infrastructure.messaging import process_message

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        channel = await connection.channel()
        queue = await channel.declare_queue("file_generation_queue", durable=True)
        await queue.consume(process_message)
        print("[Distribution] 🐇 Connecnted to RabbitMQ. Waiting task...")
        
        yield
        
        await connection.close()
    except Exception as e:
        print(f"[Distribution] ❌ Error RabbitMQ: {e}")
        yield

app = FastAPI(
    title="MTG Distribution Service", 
    version=settings.APP_VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://127.0.0.1", "https://mtgmods.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.add_exception_handler(DomainException, global_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.include_router(download_router)

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "UP",
        "service": "Distribution Service",
        "version": settings.APP_VERSION,
        "state": "Stateless (No DB)"
    }