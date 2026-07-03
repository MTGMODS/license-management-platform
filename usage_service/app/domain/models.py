from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

class LaunchPayload(BaseModel):
    version: str = Field(..., max_length=20, description="Product version")
    mode: str = Field(..., description="Product work mode")
    server: int = Field(..., description="Server ID")
    device: str = Field(..., pattern="^(PC|MOBILE)$", description="Device type: 'PC' / 'MOBILE'")
    hwid: str = Field(..., min_length=5, max_length=255)

    @field_validator('server')
    @classmethod
    def validate_server(cls, v: int) -> int:
        # 0, 1-32, 101-103, 200, 301-307, 401-402
        valid_servers = {0, 200} | set(range(1, 33)) | set(range(101, 104)) | set(range(301, 308)) | set(range(401, 403))
        if v not in valid_servers:
            raise ValueError(f"Invalid server: {v}")
        return v

    @field_validator('mode')
    @classmethod
    def validate_mode(cls, v: Optional[str]) -> Optional[str]:
        if not v: 
            return None
        valid_modes = {
            "none", "police", "fbi", "prison", "army", "smi", "hospital", 
            "gov", "judge", "lc", "fd", "ins", "mafia", "ghetto"
        }
        return v if v in valid_modes else "unknown"

    @property
    def is_vip(self) -> bool:
        return "vip" in self.version.lower()

class Launch(BaseModel):
    id: Optional[int] = None
    version: str
    hwid: str
    device: str
    server: int
    country: str
    launched_at: Optional[datetime] = None