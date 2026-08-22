from pydantic import BaseModel, Field
from app.domain.models import LicenseStatus, PaymentMethod
from typing import Optional, Literal

class CheckRequestDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")
    device: str = Field(..., min_length=2, max_length=100, description="HWID")

class ActivateKeyDTO(BaseModel):
    key: str = Field(..., min_length=19, max_length=19, description="VIP Key")
    force: bool = Field(False, description="Force activate and deactivate old license")

class GeneratePurchaseDTO(BaseModel):
    count: int = Field(default=1, gt=0, le=1000, description="Number of keys to generate")
    duration_days: Optional[int] = Field(None, gt=0, description="Duration of the license in days")
    amount: float = Field(..., ge=0.0, description="Amount purchased")
    method: PaymentMethod = Field(..., description="Payment method")
    status: Literal["PENDING", "COMPLETED"] = Field(default="COMPLETED", description="PENDING or COMPLETED")
    max_devices: Optional[int] = Field(None, ge=1, description="Maximum allowed devices, override tariff default")
    reset_limit: Optional[int] = Field(None, ge=0, description="Maximum allowed reset devices, override tariff default")

class TelegramBotGenerateDTO(BaseModel):
    duration_days: Optional[int] = Field(None, gt=0, description="Duration of the license in days")
    amount: float = Field(..., ge=0.0, description="Amount purchased")
    max_devices: Optional[int] = Field(None, ge=1, description="Maximum allowed devices, override tariff default")
    reset_limit: Optional[int] = Field(None, ge=0, description="Maximum allowed reset devices, override tariff default")

class UpdateLicenseDTO(BaseModel):
    status: Optional[LicenseStatus] = None
    reset_limit: Optional[int] = Field(None, ge=0)
    max_devices: Optional[int] = Field(None, ge=1)
    user_id: Optional[int] = Field(None, ge=1)
    duration_days: Optional[int] = Field(None, gt=0)
    amount: Optional[float] = Field(None, ge=0.0)
