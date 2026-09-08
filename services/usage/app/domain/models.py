import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator, AliasChoices

class LaunchPayload(BaseModel):
    version: str = Field(..., max_length=25, description="Product version")
    mode: str = Field(..., description="Product work mode")
    server: int = Field(..., validation_alias=AliasChoices("server", "server_id"), description="Server ID")
    device: str = Field(..., pattern="^(PC|MOBILE)$", description="Device type: 'PC' / 'MOBILE'")
    hwid: str = Field(..., min_length=5, max_length=255)

    @field_validator('server')
    @classmethod
    def validate_server(cls, v: int) -> int:
        # 0, 1-33, 101-103, 200, 301-307, 401-403
        valid_servers = {0, 200} | set(range(1, 34)) | set(range(101, 104)) | set(range(301, 308)) | set(range(401, 404))
        if v not in valid_servers:
            raise ValueError(f"Invalid server: {v}")
        return v

    @field_validator('mode')
    @classmethod
    def validate_mode(cls, v: Optional[str]) -> Optional[str]:
        valid_modes = {
            "none", "police", "fbi", "prison", "army", "smi", "hospital", 
            "gov", "judge", "lc", "fd", "ins", "mafia", "ghetto"
        }
        if not v or v not in valid_modes:
            raise ValueError(f"Invalid mode: {v}")
        return v

    @field_validator("version")
    @classmethod
    def validate_strict_version(cls, v: str) -> str:
        if not re.match(r"^\d+(?:\.\d+)+\s+(Free|VIP|Launcher Edition)$", v):
            raise ValueError("Invalid version format.")
        return v
