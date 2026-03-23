from enum import Enum
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel

class SubscriptionStatus(str, Enum):
    NOT_ACTIVATED = "NOT_ACTIVATED"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    BANNED = "BANNED"

class Subscription(BaseModel):
    id: Optional[int] = None
    key: str
    duration_days: Optional[int] = None
    status: SubscriptionStatus = SubscriptionStatus.NOT_ACTIVATED
    activated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    def is_valid(self) -> bool:
        
        if self.status != SubscriptionStatus.ACTIVE:
            return False
        
        if self.expires_at:
            exp = self.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp:
                return False
            
        return True