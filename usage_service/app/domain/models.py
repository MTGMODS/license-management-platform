from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, AliasChoices, field_validator

class LaunchDTO(BaseModel):
    version: str = Field(..., description="Product version: example '1.0'")
    server: int = Field(..., validation_alias=AliasChoices("server", "server_id"), description="Server ID")
    device: str = Field(..., pattern="^(PC|MOBILE)$", description="Device type: 'PC' or 'MOBILE'")
    hwid: str = Field(..., )

    @field_validator('server_id')
    @classmethod
    def validate_server(cls, v: int) -> int:
        valid_servers = {0, 200} | set(range(1, 33)) | set(range(101, 104)) | set(range(301, 308)) | set(range(401, 403))
        if v not in valid_servers:
            raise ValueError(f"Invalid server ID: {v}.")
        return v

    @field_validator('mode')
    @classmethod
    def validate_mode(cls, v: str) -> str:
        if not v: return None
        valid_modes = {
            "none", "police", "fbi", "prison", "army", 
            "smi", "hospital", "gov", "judge", "lc", 
            "fd", "ins", "mafia", "ghetto"
        }
        if v not in valid_modes:
            raise ValueError(f"Invalid helper mode: {v}. Request rejected.")
        return v

class Launch(BaseModel):
    id: Optional[int] = None
    version: str
    hwid: str
    device: str
    server: int
    country: str
    launched_at: Optional[datetime] = None