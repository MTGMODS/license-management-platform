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
    transaction = relationship("TransactionModel", back_populates="license", uselist=False, cascade="all, delete-orphan")

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
    license_id = Column(Integer, ForeignKey("licenses.id", ondelete="CASCADE"), unique=True, nullable=True)
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

    async def get_active_by_user(self, user_id: int, exclude_id: int | None = None) -> LicenseModel | None:
        stmt = (
            select(LicenseModel)
            .options(selectinload(LicenseModel.devices), selectinload(LicenseModel.transaction))
            .filter(LicenseModel.user_id == user_id, LicenseModel.status == LicenseStatus.ACTIVE)
        )
        if exclude_id is not None:
            stmt = stmt.filter(LicenseModel.id != exclude_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_history_by_user(self, user_id: int) -> list[LicenseModel]:
        result = await self.db.execute(
            select(LicenseModel)
            .options(selectinload(LicenseModel.devices), selectinload(LicenseModel.transaction))
            .filter(LicenseModel.user_id == user_id, LicenseModel.status != LicenseStatus.ACTIVE)
            .order_by(LicenseModel.activated_at.desc(), LicenseModel.created_at.desc())
        )
        return list(result.scalars().all())

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

    async def delete_license(self, license_id: int) -> bool:
        license_obj = await self.get_by_id(license_id)
        if not license_obj:
            return False
        await self.db.delete(license_obj)
        await self.db.commit()
        return True

    @staticmethod
    def _money_share(part: float, total: float) -> float:
        return round((part / total) * 100, 1) if total > 0 else 0.0

    async def get_heavy_public_stats(self):
        timed = LicenseModel.duration_days.isnot(None)
        forever = LicenseModel.duration_days.is_(None)
        paid = TransactionModel.amount > 0
        free = TransactionModel.amount == 0
        completed = TransactionModel.status == "COMPLETED"
        owned = LicenseModel.user_id.isnot(None)
        active = LicenseModel.status == LicenseStatus.ACTIVE
        paid_subs = and_(timed, paid, completed, owned)

        overview_stmt = select(
            func.count(distinct(case((and_(paid, owned), LicenseModel.id)))).label("total_sold"),
            func.count(distinct(case((and_(paid, active), LicenseModel.id)))).label("active"),
            func.sum(case((and_(paid, owned), TransactionModel.amount), else_=0)).label("total_money"),
            func.count(distinct(case((free, LicenseModel.id)))).label("free_issued"),
            func.count(distinct(case((and_(free, active), LicenseModel.id)))).label("free_active"),
        ).select_from(LicenseModel).outerjoin(
            TransactionModel, LicenseModel.id == TransactionModel.license_id
        ).where(timed)
        overview = (await self.db.execute(overview_stmt)).first()
        total_sold = overview.total_sold or 0
        total_money = round(overview.total_money or 0, 2)

        dur_stmt = select(
            LicenseModel.duration_days,
            func.count(distinct(LicenseModel.id)).label("count"),
            func.sum(TransactionModel.amount).label("sum"),
            func.count(distinct(case((active, LicenseModel.id)))).label("active_count"),
        ).select_from(LicenseModel).outerjoin(
            TransactionModel, LicenseModel.id == TransactionModel.license_id
        ).where(paid_subs).group_by(LicenseModel.duration_days).order_by(desc("sum"))

        by_duration = [
            {
                "duration_days": r.duration_days,
                "count": r.count,
                "sum": round(r.sum or 0, 2),
                "active": r.active_count,
                "share": self._money_share(r.count, total_sold),
            }
            for r in (await self.db.execute(dur_stmt)).all()
        ]

        pay_stmt = select(
            TransactionModel.payment_method,
            func.count(TransactionModel.id).label("count"),
            func.sum(TransactionModel.amount).label("sum"),
        ).select_from(TransactionModel).join(
            LicenseModel, TransactionModel.license_id == LicenseModel.id
        ).where(paid_subs).group_by(TransactionModel.payment_method).order_by(desc("sum"), desc("count"))

        by_method = [
            {
                "method": r.payment_method,
                "count": r.count,
                "sum": round(r.sum or 0, 2),
                "share": self._money_share(r.sum or 0, total_money),
            }
            for r in (await self.db.execute(pay_stmt)).all()
        ]

        daily_stmt = select(
            func.date(TransactionModel.purchased_at).label("dt"),
            func.count(TransactionModel.id).label("count"),
            func.sum(TransactionModel.amount).label("sum"),
        ).select_from(TransactionModel).join(
            LicenseModel, TransactionModel.license_id == LicenseModel.id
        ).where(paid_subs).group_by(func.date(TransactionModel.purchased_at)).order_by(
            func.date(TransactionModel.purchased_at)
        )

        timeline_daily = [
            {
                "date": str(r.dt) if r.dt else "Unknown",
                "count": r.count,
                "sum": round(r.sum or 0, 2),
            }
            for r in (await self.db.execute(daily_stmt)).all()
        ]

        sales_stmt = select(
            TransactionModel.purchased_at,
            TransactionModel.amount,
            TransactionModel.payment_method,
            LicenseModel.duration_days,
            LicenseModel.status,
            LicenseModel.activated_at,
            LicenseModel.expires_at,
        ).select_from(TransactionModel).join(
            LicenseModel, TransactionModel.license_id == LicenseModel.id
        ).where(paid_subs).order_by(TransactionModel.purchased_at.desc())

        sales = [
            {
                "purchased_at": format_utc(r.purchased_at),
                "amount": round(r.amount or 0, 2),
                "method": r.payment_method,
                "duration_days": r.duration_days,
                "status": r.status.value if hasattr(r.status, "value") else r.status,
                "activated_at": format_utc(r.activated_at),
                "expires_at": format_utc(r.expires_at),
            }
            for r in (await self.db.execute(sales_stmt)).all()
        ]

        forever_overview_stmt = select(
            func.count(distinct(LicenseModel.id)).label("total_sold"),
            func.sum(TransactionModel.amount).label("total_money"),
        ).select_from(LicenseModel).outerjoin(
            TransactionModel, LicenseModel.id == TransactionModel.license_id
        ).where(forever, completed)
        forever_overview = (await self.db.execute(forever_overview_stmt)).first()
        forever_sold = forever_overview.total_sold or 0
        forever_money = round(forever_overview.total_money or 0, 2)

        forever_pay_stmt = select(
            TransactionModel.payment_method,
            func.count(TransactionModel.id).label("count"),
            func.sum(TransactionModel.amount).label("sum"),
        ).select_from(TransactionModel).join(
            LicenseModel, TransactionModel.license_id == LicenseModel.id
        ).where(forever, completed).group_by(TransactionModel.payment_method).order_by(
            desc("sum"), desc("count")
        )

        forever_by_method = [
            {
                "method": r.payment_method,
                "count": r.count,
                "sum": round(r.sum or 0, 2),
                "share": self._money_share(r.sum or 0, forever_money),
            }
            for r in (await self.db.execute(forever_pay_stmt)).all()
        ]

        return {
            "updated_at": format_utc(datetime.now(timezone.utc)),
            "subscriptions": {
                "overview": {
                    "total_sold": total_sold,
                    "total_money": total_money,
                    "active": overview.active or 0,
                    "free_issued": overview.free_issued or 0,
                    "free_active": overview.free_active or 0,
                },
                "by_duration": by_duration,
                "by_method": by_method,
                "timeline": {
                    "daily": timeline_daily,
                },
                "sales": sales,
            },
            "forever": {
                "overview": {
                    "total_sold": forever_sold,
                    "total_money": forever_money,
                },
                "by_method": forever_by_method,
            },
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
