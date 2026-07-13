import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.exceptions import RequestValidationError

from app.shared.database import engine, Base
from app.shared.config import settings
from app.shared.exceptions import DomainException, global_exception_handler, validation_exception_handler

from app.api.client_routes import router as client_router
from app.api.user_routes import router as user_router
from app.api.admin_routes import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("[License Service] 🚀 License service ")
    yield
    print("[License Service] 🛑 Stop service...")

app = FastAPI(
    title="MTG License Service",
    description="Core SaaS System for License & HWID Management",
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

app.include_router(client_router)
app.include_router(user_router)
app.include_router(admin_router)

@app.get("/health", tags=["System"])
async def health_check():
    database = settings.DATABASE_POSTGRES_URL if not settings.DEBUG_MODE else settings.DATABASE_URL
    return {
        "status": "UP",
        "service": "License Service",
        "version": settings.APP_VERSION,
        "api_version": settings.API_VERSION,
        "database": database.split("://")[0]
    }