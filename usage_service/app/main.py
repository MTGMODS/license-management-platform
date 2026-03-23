from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from app.shared.database import engine, Base
from app.shared.exceptions import DomainException, global_exception_handler, validation_exception_handler
from app.shared.config import settings

from app.modules.usage.infrastructure.repository import LaunchModel
from app.modules.usage.api.routes import router as usage_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MTG Usage Analytics Service",
    description="Microservice for tracking game/mod launches",
    version="1.0.0"
)

app.add_exception_handler(DomainException, global_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.include_router(usage_router)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "UP",
        "service": "Usage Analytics",
        "database": "Connected"
    }