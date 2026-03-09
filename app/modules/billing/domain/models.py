from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class Purchase(BaseModel):
    id: Optional[int] = None
    user_id: int
    amount: float
    method: str
    purchased_at: Optional[datetime] = None