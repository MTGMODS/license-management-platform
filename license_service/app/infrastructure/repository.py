from typing import Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, select, update, distinct, case, desc, and_
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
    reset_limit = Column(Integer, default=1)
    max_devices = Column(Integer, default=3, nullable=False)
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
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
        return [{"license_id": r.id, "user_id": r.user_id, "expires_at": r.expires_at.isoformat() if r.expires_at else None} for r in rows]
        
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

    async def remove_device(self, device_id: int) -> bool:
        result = await self.db.execute(select(DeviceModel).filter(DeviceModel.id == device_id))
        dev = result.scalars().first()
        if dev:
            await self.db.delete(dev)
            await self.db.commit()
            return True
        return False

    METRICS_MAP = {
        "revenue": func.coalesce(func.sum(TransactionModel.amount), 0),
        "purchases": func.count(TransactionModel.id),
        "licenses": func.count(distinct(LicenseModel.id)),
        "active_licenses": func.count(distinct(case((LicenseModel.status == "ACTIVE", LicenseModel.id)))),
        "free_licenses": func.count(distinct(case((TransactionModel.amount == 0, LicenseModel.id)))),
        "avg_check": func.coalesce(func.round(func.sum(TransactionModel.amount) / func.nullif(func.count(TransactionModel.id), 0), 2), 0)
    }

    GROUPS_MAP = {
        "method": TransactionModel.payment_method,
        "duration": func.coalesce(LicenseModel.duration_days, 9999),
        "status": LicenseModel.status,
        "date": func.date(TransactionModel.purchased_at),
        "hour": func.extract('hour', TransactionModel.purchased_at),
        "weekday": func.extract('dow', TransactionModel.purchased_at),
        "user_id": TransactionModel.user_id
    }

    FILTERS_MAP = {
        "method": lambda val: TransactionModel.payment_method == val,
        "duration": lambda val: LicenseModel.duration_days == val,
        "status": lambda val: LicenseModel.status == val,
        "user_id": lambda val: TransactionModel.user_id == val
    }

    async def get_heavy_public_stats(self):
        new_totals_stmt = select(
            func.count(distinct(LicenseModel.id)).label("total_vips"),
            func.count(distinct(case((LicenseModel.status == "ACTIVE", LicenseModel.id)))).label("active_total"),
            func.sum(case((TransactionModel.amount > 0, TransactionModel.amount), else_=0)).label("total_money"),
            func.count(distinct(case((TransactionModel.amount == 0, LicenseModel.id)))).label("total_free"),
            func.count(distinct(case((and_(TransactionModel.amount == 0, LicenseModel.status == "ACTIVE"), LicenseModel.id)))).label("active_free")
        ).select_from(LicenseModel).outerjoin(
            TransactionModel, LicenseModel.id == TransactionModel.license_id
        ).where(LicenseModel.duration_days.isnot(None))
        
        n_res = (await self.db.execute(new_totals_stmt)).first()

        dur_stmt = select(
            LicenseModel.duration_days,
            func.count(distinct(LicenseModel.id)).label("count"),
            func.sum(TransactionModel.amount).label("sum"),
            func.count(distinct(case((LicenseModel.status == "ACTIVE", LicenseModel.id)))).label("active_count")
        ).select_from(LicenseModel).outerjoin(
            TransactionModel, LicenseModel.id == TransactionModel.license_id
        ).where(
            and_(LicenseModel.duration_days.isnot(None), TransactionModel.amount > 0, TransactionModel.status == "COMPLETED")
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
            and_(LicenseModel.duration_days.isnot(None), TransactionModel.amount > 0, TransactionModel.status == "COMPLETED")
        ).group_by(TransactionModel.payment_method).order_by(desc("sum"), desc("count"))

        payments = [{"method": r.payment_method, "count": r.count, "sum": r.sum or 0} 
                    for r in (await self.db.execute(pay_stmt)).all()]

        old_totals_stmt = select(
            func.count(distinct(LicenseModel.id)).label("total_forever"),
            func.sum(TransactionModel.amount).label("sum_forever")
        ).select_from(LicenseModel).outerjoin(
            TransactionModel, LicenseModel.id == TransactionModel.license_id
        ).where(LicenseModel.duration_days.is_(None))

        o_res = (await self.db.execute(old_totals_stmt)).first()

        return {
            "updated_at": datetime.now(timezone.utc).isoformat(),
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

    async def build_explorer_query(self, metrics: list[str], group_by: str, period: str, filters: dict, sort: str, limit: int, offset: int):
        now = datetime.now(timezone.utc)
        selected_metrics = metrics.copy()
        
        sort_key = None
        descending = False
        if sort:
            descending = sort.startswith("-")
            sort_key = sort.lstrip("-")
            if sort_key in self.METRICS_MAP and sort_key not in selected_metrics:
                selected_metrics.append(sort_key)

        select_cols = []
        if group_by and group_by in self.GROUPS_MAP:
            select_cols.append(self.GROUPS_MAP[group_by].label(group_by))
            
        valid_metrics = False
        for m in selected_metrics:
            if m in self.METRICS_MAP:
                select_cols.append(self.METRICS_MAP[m].label(m))
                valid_metrics = True
                
        if not valid_metrics:
            select_cols.append(self.METRICS_MAP["revenue"].label("revenue"))
            
        stmt = select(*select_cols).select_from(TransactionModel).join(
            LicenseModel, TransactionModel.license_id == LicenseModel.id
        )

        stmt = stmt.where(TransactionModel.status == "COMPLETED")

        if period == "30d":
            stmt = stmt.where(TransactionModel.purchased_at >= now - timedelta(days=30))
        elif period == "24h":
            stmt = stmt.where(TransactionModel.purchased_at >= now - timedelta(hours=24))
        elif period == "1h":
            stmt = stmt.where(TransactionModel.purchased_at >= now - timedelta(hours=1))

        for f_key, f_val in filters.items():
            if f_key in self.FILTERS_MAP and f_val is not None:
                stmt = stmt.where(self.FILTERS_MAP[f_key](f_val))

        if group_by and group_by in self.GROUPS_MAP:
            stmt = stmt.group_by(self.GROUPS_MAP[group_by])

        if sort_key:
            sort_expr = self.METRICS_MAP.get(sort_key)
            if sort_expr is None:
                sort_expr = self.GROUPS_MAP.get(sort_key)
                
            if sort_expr is not None:
                stmt = stmt.order_by(sort_expr.desc() if descending else sort_expr.asc())

        stmt = stmt.limit(limit).offset(offset)
        res = await self.db.execute(stmt)
        
        result_list = []
        for row in res.all():
            row_dict = dict(row._mapping)
            if group_by == "date" and row_dict.get("date"):
                row_dict["date"] = str(row_dict["date"])
            elif group_by in ["hour", "weekday", "duration"] and row_dict.get(group_by) is not None:
                row_dict[group_by] = int(row_dict[group_by])
            
            for k, v in row_dict.items():
                if isinstance(v, float):
                    row_dict[k] = round(v, 2)
                    
            result_list.append(row_dict)
            
        return result_list

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