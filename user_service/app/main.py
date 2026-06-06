from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.shared.database import engine, Base
from app.api.routes import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(lifespan=lifespan, title="MTGVIP User Service")

app.include_router(auth_router)

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "user_service"}