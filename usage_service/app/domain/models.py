from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class LaunchDTO(BaseModel):
    version: str = Field(..., max_length=50, description="Product version: example '1.0'")
    server: int = Field(..., description="Server ID: 1-32 Arizona PC, 101-103 Arizona Mobile, 200 Arizona VC, 301-307 Rodina PC, 401-403 Rodina Mobile, or 0 for unknown")
    device: str = Field(..., description="Device type: 'PC' or 'MOBILE'")
    hwid: str = Field(..., max_length=255)

class Launch(BaseModel):
    id: Optional[int] = None
    version: str
    hwid: str
    device: str
    server: int
    country: str
    launched_at: Optional[datetime] = None