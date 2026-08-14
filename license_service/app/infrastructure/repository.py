from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, select, update, distinct, case, desc, and_
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import Base
from app.shared.datetime_utils import format_utc
from app.domain.models import LicenseStatus

class LicenseModel(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    key = Column(String, unique=True, index=True, nullable=False)
    duration_days = Column(Integer, nullable=True)
    reset_limit = Column(Integer, default=1)
    max_devices = Column(Integer, default=2, nullable=False)
    status = Column(SQLEnum(LicenseStatus), default=LicenseStatus.NOT_ACTIVATED)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    activated_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    devices = relationship("DeviceModel", back_populates="license", cascade="all, delete-orphan")
    transaction = relationship("TransactionModel", back_populates="license", uselist=False)

class DeviceModel(Base):
    __tablename__ = "license_activations"

    id = Column(Integer, primary_key=True, index=True)
    license_id = Column(Integer, ForeignKey("licenses.id", ondelete="CASCADE"))
    device = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    first_used_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    license = relationship("LicenseModel", back_populates="devices")

class TransactionModel(Base):
    __tablename__ = "transaction_purchases"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    license_id = Column(Integer, ForeignKey("licenses.id"), unique=True, nullable=True)
    amount = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False)
    status = Column(String, default="COMPLETED")
    purchased_at = Column(DateTime(timezone=True), server_default=func.now())

    license = relationship("LicenseModel", back_populates="transaction")


class LicenseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, license_id: int) -> LicenseModel | None:
        result = await self.db.execute(
            select(LicenseModel).options(selectinload(LicenseModel.devices), selectinload(LicenseModel.transaction)).filter(LicenseModel.id == license_id)
        )
        return result.scalars().first()

    async def get_by_key(self, key: str) -> LicenseModel:
        result = await self.db.execute(
            select(LicenseModel).options(selectinload(LicenseModel.devices), selectinload(LicenseModel.transaction)).filter(LicenseModel.key == key)
        )
        return result.scalars().first()

    async def get_active_by_user(self, user_id: int) -> LicenseModel | None:
        result = await self.db.execute(
            select(LicenseModel).options(selectinload(LicenseModel.devices), selectinload(LicenseModel.transaction)).filter(LicenseModel.user_id == user_id, LicenseModel.status == LicenseStatus.ACTIVE)
        )
        return result.scalars().first()

    async def search_licenses(self, user_id: Optional[int] = None, key: Optional[str] = None) -> list[LicenseModel]:
        query = select(LicenseModel).options(selectinload(LicenseModel.devices), selectinload(LicenseModel.transaction))
        if user_id is not None:
            query = query.where(LicenseModel.user_id == user_id)
        if key is not None:
            query = query.where(LicenseModel.key == key)
        query = query.order_by(LicenseModel.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_license(self, key: str, duration_days: int, status: LicenseStatus, max_devices: int) -> LicenseModel:
        db_sub = LicenseModel(key=key, duration_days=duration_days, status=status, max_devices=max_devices)
        self.db.add(db_sub)
        await self.db.flush()
        return db_sub

    async def create_licenses_bulk(self, licenses: list[LicenseModel]) -> list[LicenseModel]:
        self.db.add_all(licenses)
        await self.db.flush()
        return licenses

    async def deactivate_expired_licenses(self) -> list[dict]:
        query = (
            update(LicenseModel)
            .where(LicenseModel.status == LicenseStatus.ACTIVE)
            .where(LicenseModel.expires_at < func.now())
            .values(status=LicenseStatus.EXPIRED)
            .returning(LicenseModel.id, LicenseModel.user_id, LicenseModel.expires_at)
        )
        result = await self.db.execute(query)
        
        rows = result.all()
        return [{"license_id": r.id, "user_id": r.user_id, "expires_at": format_utc(r.expires_at)} for r in rows]
        
    async def log_device(self, license_id: int, device: str, ip_address: str, user_agent: str):
        result = await self.db.execute(
            select(DeviceModel).filter(DeviceModel.license_id == license_id, DeviceModel.device == device)
        )
        activation = result.scalars().first()
        if activation:
            activation.ip_address = ip_address
            activation.user_agent = user_agent
            activation.last_used_at = func.now()
        else:
            activation = DeviceModel(license_id=license_id, device=device, ip_address=ip_address, user_agent=user_agent)
            self.db.add(activation)
        await self.db.commit()

    async def remove_device(self, device_id: int) -> bool:
        result = await self.db.execute(select(DeviceModel).filter(DeviceModel.id == device_id))
        dev = result.scalars().first()
        if dev:
            await self.db.delete(dev)
            await self.db.commit()
            return True
        return False

    async def get_heavy_public_stats(self):
        timed = LicenseModel.duration_days.isnot(None)
        paid = TransactionModel.amount > 0
        free = TransactionModel.amount == 0
        completed = TransactionModel.status == "COMPLETED"
        owned = LicenseModel.user_id.isnot(None)
        active = LicenseModel.status == LicenseStatus.ACTIVE

        new_totals_stmt = select(
            func.count(distinct(case((and_(paid, owned), LicenseModel.id)))).label("total_vips"),
            func.count(distinct(case((and_(paid, active), LicenseModel.id)))).label("active_total"),
            func.sum(case((and_(paid, owned), TransactionModel.amount), else_=0)).label("total_money"),
            func.count(distinct(case((free, LicenseModel.id)))).label("total_free"),
            func.count(distinct(case((and_(free, active), LicenseModel.id)))).label("active_free")
        ).select_from(LicenseModel).outerjoin(
            TransactionModel, LicenseModel.id == TransactionModel.license_id
        ).where(timed)
        
        n_res = (await self.db.execute(new_totals_stmt)).first()

        dur_stmt = select(
            LicenseModel.duration_days,
            func.count(distinct(LicenseModel.id)).label("count"),
            func.sum(TransactionModel.amount).label("sum"),
            func.count(distinct(case((active, LicenseModel.id)))).label("active_count")
        ).select_from(LicenseModel).outerjoin(
            TransactionModel, LicenseModel.id == TransactionModel.license_id
        ).where(
            and_(timed, paid, completed, owned)
        ).group_by(LicenseModel.duration_days).order_by(desc("sum"))
        
        durations = [{"days": r.duration_days, "count": r.count, "sum": r.sum or 0, "active": r.active_count} 
                     for r in (await self.db.execute(dur_stmt)).all()]

        pay_stmt = select(
            TransactionModel.payment_method,
            func.count(TransactionModel.id).label("count"),
            func.sum(TransactionModel.amount).label("sum")
        ).select_from(TransactionModel).join(
            LicenseModel, TransactionModel.license_id == LicenseModel.id
        ).where(
            and_(timed, paid, completed, owned)
        ).group_by(TransactionModel.payment_method).order_by(desc("sum"), desc("count"))

        payments = [{"method": r.payment_method, "count": r.count, "sum": r.sum or 0} 
                    for r in (await self.db.execute(pay_stmt)).all()]

        old_totals_stmt = select(
            func.count(distinct(LicenseModel.id)).label("total_forever"),
            func.sum(TransactionModel.amount).label("sum_forever")
        ).select_from(LicenseModel).outerjoin(
            TransactionModel, LicenseModel.id == TransactionModel.license_id
        ).where(
            LicenseModel.duration_days.is_(None),
            completed
        )

        o_res = (await self.db.execute(old_totals_stmt)).first()

        return {
            "updated_at": format_utc(datetime.now(timezone.utc)),
            "new_subs": {
                "total_vips": n_res.total_vips or 0,
                "active_total": n_res.active_total or 0,
                "total_money": round(n_res.total_money or 0, 2),
                "free_issued": n_res.total_free or 0,
                "free_active": n_res.active_free or 0,
                "top_durations": durations,
                "top_payments": payments
            },
            "old_forever": {
                "total_sold": o_res.total_forever or 0,
                "total_money": round(o_res.sum_forever or 0, 2)
            }
        }

class TransactionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, amount: float, method: str, user_id: int = None, license_id: int = None, status: str = "COMPLETED") -> TransactionModel:
        purchase = TransactionModel(
            user_id=user_id, license_id=license_id, amount=amount, payment_method=method, status=status
        )
        self.db.add(purchase)
        await self.db.flush()
        return purchase

    async def create_transactions_bulk(self, transactions: list[TransactionModel]) -> list[TransactionModel]:
        self.db.add_all(transactions)
        await self.db.flush()
        return transactions

    async def get_by_license(self, license_id: int) -> TransactionModel | None:
            result = await self.db.execute(
                select(TransactionModel).filter(TransactionModel.license_id == license_id)
            )
            return result.scalars().first()
