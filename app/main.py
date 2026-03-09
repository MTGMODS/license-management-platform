from fastapi import FastAPI
from app.shared.database import engine, Base
from app.modules.subscription.infrastructure.repository import SubscriptionModel
from app.modules.usage.infrastructure.repository import LaunchModel
from app.modules.billing.infrastructure.repository import PurchaseModel
from app.modules.identity.infrastructure.repository import UserModel
from app.modules.subscription.api.routes import router as subscription_router
from app.modules.usage.api.routes import router as usage_router
from app.modules.billing.api.routes import router as billing_router
from app.modules.identity.api.routes import router as identity_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MTG VIP Platform",
    description="SaaS Modular Monolith",
    version="0.1.0"
)

app.include_router(subscription_router)
app.include_router(usage_router)
app.include_router(billing_router)
app.include_router(identity_router)

@app.get("/", tags=["System"])
def root():
    return {"message": "Welcome to MTG VIP API. Go to /docs for Swagger UI."}