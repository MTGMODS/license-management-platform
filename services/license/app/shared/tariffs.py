import json
from functools import lru_cache
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field

class TariffLimits(BaseModel):
    max_devices: int = Field(ge=1)
    reset_limit: int = Field(ge=0)

class TariffPlan(TariffLimits):
    duration_days: Optional[int] = None
    price: Optional[float] = None
    telegram_stars_price: Optional[int] = None

class TariffsCatalog(BaseModel):
    currency: str = "USD"
    plans: list[TariffPlan]


@lru_cache(maxsize=1)
def load_tariffs() -> TariffsCatalog:
    path = Path(__file__).with_name("tariffs.json")
    with path.open(encoding="utf-8") as f:
        return TariffsCatalog.model_validate(json.load(f))

def public_tariffs() -> dict:
    catalog = load_tariffs()
    return {
        "currency": catalog.currency,
        "plans": [
            {
                "duration_days": plan.duration_days,
                "price": plan.price,
                "telegram_stars_price": plan.telegram_stars_price,
                "max_devices": plan.max_devices,
                "reset_limit": plan.reset_limit,
            }
            for plan in catalog.plans
        ]
    }
