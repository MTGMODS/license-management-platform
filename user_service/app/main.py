from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError

from app.shared.database import engine, Base
from app.shared.exceptions import DomainException, global_exception_handler, validation_exception_handler
from app.shared.config import settings
from app.api.routes import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(
    title="MTG Users Service",
    description="Microservice for managing user accounts and authentication",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

app.add_exception_handler(DomainException, global_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.include_router(auth_router)

@app.get("/health", tags=["System"])
async def health_check():
    database = settings.DATABASE_POSTGRES_URL if not settings.DEBUG_MODE else settings.DATABASE_URL
    return {
        "status": "UP",
        "service": "Users Service",
        "version": settings.APP_VERSION,
        "database": database.split("://")[0]
    }