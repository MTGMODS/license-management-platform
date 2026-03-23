from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class Launch(BaseModel):
    id: Optional[int] = None
    version: str
    device: str
    server_id: str
    country: str
    launched_at: Optional[datetime] = None