from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class GenerationPayloadDTO(BaseModel):
    user_id: int
    media_id: int
    expire_date: Optional[datetime] = None