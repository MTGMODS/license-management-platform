from fastapi import FastAPI
from app.modules.subscription.api.subscription_controller import router as subscription_router
from app.modules.billing.api.billing_controller import router as billing_router
from app.modules.usage.api.usage_controller import router as usage_router

app = FastAPI()

app.include_router(subscription_router)
app.include_router(billing_router)
app.include_router(usage_router)