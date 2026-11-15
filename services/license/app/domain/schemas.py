from pydantic import BaseModel, Field, field_validator
from app.domain.models import LicenseStatus, PaymentMethod
from typing import Optional, Literal

class CheckRequestDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, pattern=r"^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$", description="VIP Key")
    device: str = Field(..., min_length=2, max_length=100, description="HWID")

class GameAccountDTO(BaseModel):
    server_id: int = Field(..., strict=True)
    nickname: str = Field(..., min_length=3, max_length=50, pattern=r"^[A-Za-z][A-Za-z0-9_]{2,49}$")

    @field_validator("server_id")
    @classmethod
    def validate_server(cls, value: int) -> int:
        valid = set(range(1, 34)) | {101, 102, 103, 200} | set(range(301, 308)) | {401, 402}
        if value not in valid:
            raise ValueError("Unknown game server")
        return value


class ActivateKeyDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")
    force: bool = Field(False, description="Force activate and deactivate old license")

class GeneratePurchaseDTO(BaseModel):
    count: int = Field(default=1, gt=0, le=1000, description="Number of keys to generate")
    duration_days: Optional[int] = Field(None, gt=0, description="Duration of the license in days")
    amount: float = Field(..., ge=0.0, description="Amount purchased")
    method: PaymentMethod = Field(..., description="Payment method")
    status: Literal["PENDING", "COMPLETED"] = Field(default="COMPLETED", description="PENDING or COMPLETED")
    max_devices: int = Field(..., ge=1, description="Maximum number of devices for the generated license")
    reset_limit: int = Field(..., ge=0, description="Number of available device resets for the generated license")

class TelegramBotGenerateDTO(BaseModel):
    duration_days: Optional[int] = Field(None, gt=0, description="Duration of the license in days")
    amount: float = Field(..., ge=0.0, description="Amount purchased")
    max_devices: int = Field(..., ge=1, description="Maximum number of devices for the generated license")
    reset_limit: int = Field(..., ge=0, description="Number of available device resets for the generated license")

class UpdateLicenseDTO(BaseModel):
    status: Optional[LicenseStatus] = None
    reset_limit: Optional[int] = Field(None, ge=0)
    max_devices: Optional[int] = Field(None, ge=1)
    user_id: Optional[int] = Field(None, ge=1)
    duration_days: Optional[int] = Field(None, gt=0)
    amount: Optional[float] = Field(None, ge=0.0)
