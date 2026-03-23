from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from app.shared.database import engine, Base
from app.shared.exceptions import DomainException, global_exception_handler, validation_exception_handler
from app.shared.config import settings

from app.modules.subscription.infrastructure.repository import SubscriptionModel, ActivationModel
from app.modules.billing.infrastructure.repository import PurchaseModel
from app.modules.identity.infrastructure.repository import UserModel

from app.modules.subscription.api.routes import router as subscription_router
from app.modules.billing.api.routes import router as billing_router
from app.modules.identity.api.routes import router as identity_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MTG VIP Platform API",
    description="SaaS System for License Management",
    version=settings.APP_VERSION
)

app.add_exception_handler(DomainException, global_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.include_router(subscription_router)
app.include_router(billing_router)
app.include_router(identity_router)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "UP",
        "service": "MTG VIP Core",
        "database": "Connected",
        "version": settings.APP_VERSION,
        "api_version": settings.API_VERSION
    }

@app.get("/", tags=["System"])
def root():
    return {"message": "Welcome to MTG VIP API. Go to /docs for Swagger UI."}