from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class Purchase(BaseModel):
    id: Optional[int] = None
    user_id: int
    amount: float
    method: str
    purchased_at: Optional[datetime] = None

    def is_valid_method(self) -> bool:
        allowed_methods = ["Stars", "FunPay", "Crypto", "Card", "PayPal"]
        return self.method in allowed_methods