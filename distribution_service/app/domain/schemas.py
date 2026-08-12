from pydantic import BaseModel
from typing import Optional
from app.shared.datetime_utils import UtcDateTime

class GenerationPayloadDTO(BaseModel):
    user_id: int
    expire_date: Optional[UtcDateTime] = None
