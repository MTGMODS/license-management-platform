from enum import Enum
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel

class SubscriptionStatus(str, Enum):
    NOT_ACTIVATED = "not_activated"
    ACTIVE = "active"
    EXPIRED = "expired"
    BANNED = "banned"

class Subscription(BaseModel):
    id: Optional[int] = None
    key: str
    duration_days: int
    status: SubscriptionStatus = SubscriptionStatus.NOT_ACTIVATED
    activated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    def is_valid(self) -> bool:
        if self.status != SubscriptionStatus.ACTIVE:
            return False
        if self.expires_at and datetime.now(timezone.utc) > self.expires_at:
            return False
        return True