from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, select
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import Base
from app.domain.models import LicenseStatus

class LicenseModel(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    key = Column(String, unique=True, index=True, nullable=False)
    duration_days = Column(Integer, nullable=True)
    status = Column(SQLEnum(LicenseStatus), default=LicenseStatus.NOT_ACTIVATED)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    activated_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    devices = relationship("DeviceModel", back_populates="license", cascade="all, delete-orphan")
    transactions = relationship("TransactionModel", back_populates="license")

class DeviceModel(Base):
    __tablename__ = "license_activations"

    id = Column(Integer, primary_key=True, index=True)
    license_id = Column(Integer, ForeignKey("licenses.id", ondelete="CASCADE"))
    device = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    license = relationship("LicenseModel", back_populates="devices")

class TransactionModel(Base):
    __tablename__ = "billing_purchases"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    license_id = Column(Integer, ForeignKey("licenses.id"), unique=True, nullable=True)
    amount = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False)
    status = Column(String, default="COMPLETED")
    purchased_at = Column(DateTime(timezone=True), server_default=func.now())

    license = relationship("LicenseModel", back_populates="transactions")
    

class LicenseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_key(self, key: str) -> LicenseModel:
        result = await self.db.execute(
            select(LicenseModel)
            .options(selectinload(LicenseModel.devices))
            .filter(LicenseModel.key == key)
        )
        return result.scalars().first()

    async def create_license(self, key: str, duration_days: int, status: LicenseStatus) -> LicenseModel:
        db_sub = LicenseModel(key=key, duration_days=duration_days, status=status)
        self.db.add(db_sub)
        await self.db.commit()
        await self.db.refresh(db_sub)
        return db_sub
        
    async def log_device(self, license_id: int, device: str, ip_address: str, user_agent: str):
        result = await self.db.execute(
            select(DeviceModel).filter(DeviceModel.license_id == license_id, DeviceModel.device == device)
        )
        activation = result.scalars().first()

        if activation:
            activation.ip_address = ip_address
            activation.user_agent = user_agent
        else:
            activation = DeviceModel(license_id=license_id, device=device, ip_address=ip_address, user_agent=user_agent)
            self.db.add(activation)
        await self.db.commit()

class TransactionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, amount: float, method: str, user_id: int = None, license_id: int = None, status: str = "COMPLETED") -> TransactionModel:
        purchase = TransactionModel(
            user_id=user_id, license_id=license_id, amount=amount, payment_method=method, status=status
        )
        self.db.add(purchase)
        await self.db.commit()
        await self.db.refresh(purchase)
        return purchase